import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, updateProfile, updatePassword } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, getDoc, setDoc, Timestamp, doc } from "firebase/firestore";

const SetUsername = () => {
  const [newUsername, setNewUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate("/Login");
    }
  }, [user, navigate]);

  const handleSetUsername = async (e) => {
    e.preventDefault();
    setError("");

    if (!newUsername || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
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

      // Update the profile with the new username
      await updateProfile(user, { displayName: newUsername });

      // Update the password
      await updatePassword(user, password);

      // Check if the user document already exists
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnapshot = await getDoc(userDocRef);
      if (!userDocSnapshot.exists()) {
        // Create the user document with username and timestamp
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          username: newUsername,
          lastUsernameChange: Timestamp.now(),
          role: 'member'
        });
      } else {
        // Update the user document with the new username and timestamp
        await updateDoc(userDocRef, {
          username: newUsername,
          lastUsernameChange: Timestamp.now()
        });
      }

      navigate("/");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center bg-gray-400 w-screen h-screen">
      <form className="bg-white shadow-md rounded-md px-8 pt-6 pb-8 mb-4 w-full max-w-sm" onSubmit={handleSetUsername}>
        <h2 className="text-2xl text-center mb-4">Set Username</h2>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newUsername">
            New Username
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="newUsername" type="text" placeholder="New Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="confirmPassword" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit" disabled={loading}>
          {loading ? "Loading..." : "Submit"}
        </button>
        {error && <p className="text-red-500 font-bold text-xs mt-2">{error}</p>}
      </form>
    </div>
  );
};

export default SetUsername;
