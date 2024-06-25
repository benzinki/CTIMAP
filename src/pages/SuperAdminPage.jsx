import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, deleteUser as firebaseDeleteUser, onAuthStateChanged } from 'firebase/auth';
import { firestore } from '../firebase/firebase'; // Ensure this imports your firebase configuration correctly

const SuperAdminPage = () => {
  const [users, setUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const auth = getAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // Function to fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = await getDocs(collection(firestore, 'users'));
        const userList = usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const activeUsers = userList.filter(user => !user.banned && user.email);
        const bannedUsersList = userList.filter(user => user.banned);

        // Sorting users by role and registration timestamp
        const sortedUsers = activeUsers.sort((a, b) => {
          const roleOrder = { 'superadmin': 1, 'admin': 2, 'member': 3 };
          if (roleOrder[a.role] !== roleOrder[b.role]) {
            return roleOrder[a.role] - roleOrder[b.role];
          }
          const aTimestamp = a.registeredAt ? a.registeredAt.seconds : 0;
          const bTimestamp = b.registeredAt ? b.registeredAt.seconds : 0;
          return aTimestamp - bTimestamp;
        });

        setUsers(sortedUsers);
        setBannedUsers(bannedUsersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Check if the current user is a superadmin
  useEffect(() => {
    const checkAuthState = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const userRole = userData.role;
              
              // console.log("Current user's role:", userRole);

              if (userRole !== 'superadmin') {
                navigate('/');
              } else {
                setIsLoading(false); // Stop loading if the user is a superadmin
              }
            } else {
              console.error("User document does not exist.");
              navigate('/');
            }
          } catch (error) {
            console.error("Error checking user role:", error);
            navigate('/');
          }
        } else {
          navigate('/login');
        }
      });
    };

    checkAuthState();
  }, [auth, navigate]);

  // Handle user deletion
  const handleDeleteUser = async (userId, email) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // Remove user from Firestore
        await deleteDoc(doc(firestore, 'users', userId));

        // Remove user from Firebase Authentication
        const userToDelete = auth.currentUser;
        if (userToDelete.email === email) {
          await firebaseDeleteUser(userToDelete);
        }

        // Remove user from local state
        setUsers(users.filter(user => user.id !== userId));
        alert('User deleted successfully.');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user.');
      }
    }
  };

  // Handle user role change
  const handleRoleChange = async (userId, newRole) => {
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      try {
        await updateDoc(doc(firestore, 'users', userId), { role: newRole });
        setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
        alert(`Role changed to ${newRole} successfully.`);
      } catch (error) {
        console.error("Error changing role:", error);
        alert("Failed to change role.");
      }
    }
  };

  // Handle user ban
  const banUser = async (userId) => {
    const reason = window.prompt('Please provide a reason for banning this user:');
    if (reason) {
      if (window.confirm('Are you sure you want to ban this user? This action cannot be undone.')) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', userId));
          if (userDoc.exists()) {
            const userEmail = userDoc.data().email;
            const bannedBy = {
              username: auth.currentUser.displayName || 'Unknown',
              email: auth.currentUser.email || 'Unknown'
            };
  
            // Update Firestore to mark the user as banned
            await updateDoc(doc(firestore, 'users', userId), { banned: true, banReason: reason, bannedBy });
  
            // Add email to bannedEmails collection
            await setDoc(doc(firestore, 'bannedEmails', userEmail), { email: userEmail, isBanned: true });
  
            // Sign out the banned user
            if (auth.currentUser.email === userEmail) {
              await auth.signOut();
            }
  
            // Update local state
            setUsers(users.filter(user => user.id !== userId));
            setBannedUsers([...bannedUsers, { id: userId, email: userEmail, username: userDoc.data().username, banReason: reason, bannedBy }]);
            alert('User banned successfully.');
          } else {
            alert('User not found.');
          }
        } catch (error) {
          console.error('Error banning user:', error);
        }
      }
    }
  };  
  
  // Handle user unban
  const unbanUser = async (userId) => {
    if (window.confirm('Are you sure you want to unban this user?')) {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (userDoc.exists()) {
          const userEmail = userDoc.data().email;
          await updateDoc(doc(firestore, 'users', userId), { banned: false, banReason: '', bannedBy: {} });
          await deleteDoc(doc(firestore, 'bannedEmails', userEmail));

          setBannedUsers(bannedUsers.filter(user => user.id !== userId));
          setUsers([...users, { ...userDoc.data(), id: userId }]);
          alert('User unbanned successfully.');
        } else {
          alert('User not found.');
        }
      } catch (error) {
        console.error('Error unbanning user:', error);
      }
    }
  };

  // Show a loading state while checking auth
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-5 font-sans">
      <h1 className="text-3xl font-bold mb-5">User Management</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 bg-gray-700 text-white text-left">Username</th>
            <th className="p-2 bg-gray-700 text-white text-left">Email</th>
            <th className="p-2 bg-gray-700 text-white text-left">Points</th>
            <th className="p-2 bg-gray-700 text-white text-left">Role</th>
            <th className="p-2 bg-gray-700 text-white text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-200 even:bg-gray-100">
              <td className="p-2">{user.username}</td>
              <td className="p-2">{user.email}</td>
              <td className="p-2">{user.points || 0}</td>
              <td className="p-2">{user.role || 'N/A'}</td>
              <td className="p-2 flex space-x-2">
                <select
                  value={user.role || 'member'}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
                <button
                  onClick={() => banUser(user.id)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Ban
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id, user.email)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-5">Banned Users</h2>
        {bannedUsers.length === 0 ? (
          <p>No banned users.</p>
        ) : (
          bannedUsers.map(user => (
            <div key={user.id} className="border p-4 rounded-md">
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Ban Reason:</strong> {user.banReason}</p>
              <p><strong>Banned By:</strong> {user.bannedBy?.username || 'Unknown'} ({user.bannedBy?.email || 'Unknown'})</p>
              <button onClick={() => unbanUser(user.id)} className="bg-green-500 text-white px-2 py-1 rounded mt-2">Unban User</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SuperAdminPage;
