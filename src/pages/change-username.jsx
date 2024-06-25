import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { Spin } from 'antd';

const ChangeUsername = () => {
  const [newUsername, setNewUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastChanged, setLastChanged] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setLastChanged(userDoc.data().lastUsernameChange);
          if (!userDoc.data().username) {
            navigate("/SetUsername");
          }
        } else {
          navigate("/Login");
        }
      }
    };
    fetchUserData();
  }, [user, firestore, navigate]);

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    setError("");

    if (!newUsername || !password) {
      setError("Please fill in all fields.");
      return;
    }

    const now = Timestamp.now();
    if (lastChanged && now.seconds - lastChanged.seconds < 14 * 24 * 60 * 60) {
      setError("You can only change your username once every 14 days.");
      return;
    }

    try {
      setLoading(true);

      // Check if the new username is already taken
      const usernameQuery = query(collection(firestore, 'users'), where('username', '==', newUsername));
      const usernameQuerySnapshot = await getDocs(usernameQuery);
      if (!usernameQuerySnapshot.empty) {
        setError("Username is already taken.");
        setLoading(false);
        return;
      }

      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Get the old username
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const oldUsername = userDoc.data().username;

      // Update the profile with the new username
      await updateProfile(user, { displayName: newUsername });

      // Update the username and timestamp in Firestore
      await updateDoc(userDocRef, {
        username: newUsername,
        lastUsernameChange: now
      });

      // Remove old username if it exists
      if (oldUsername) {
        await updateDoc(doc(firestore, 'usernames', oldUsername), { available: true });
      }

      // Mark the new username as taken
      await setDoc(doc(firestore, 'usernames', newUsername), { available: false });

      // Update the username in comments and replies
      const commentsQuery = query(collection(firestore, 'comments'), where('userId', '==', user.uid));
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.forEach(async (commentDoc) => {
        await updateDoc(doc(firestore, 'comments', commentDoc.id), { userName: newUsername });
      });

      navigate("/");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <div className="flex justify-center items-center bg-gray-400 w-screen h-screen">
        <form className="bg-white shadow-md rounded-md px-8 pt-6 pb-8 mb-4 w-full max-w-sm" onSubmit={handleChangeUsername}>
          <h2 className="text-2xl text-center mb-4">Change Username</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newUsername">
              New Username
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="newUsername" type="text" placeholder="New Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit" disabled={loading}>
            {loading ? "Loading..." : "Submit"}
          </button>
          {error && <p className="text-red-500 font-bold text-xs mt-2">{error}</p>}
        </form>
      </div>
    </Spin>
  );
};

export default ChangeUsername;
