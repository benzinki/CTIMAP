import { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { observedAuthState } from "../firebase/auth.js";
import { Spin } from 'antd';

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isVerificationMessageVisible, setIsVerificationMessageVisible] = useState(false);

  const auth = getAuth(); 
  const firestore = getFirestore();

  useEffect(() => {
    const unsubscribe = observedAuthState((user) => {
      if (user && user.emailVerified) {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleManualRedirect = async () => {
    if (auth.currentUser) {
      setLoading(true);
      await auth.currentUser.reload(); 
      setLoading(false);

      if (auth.currentUser.emailVerified) {
        navigate("/Login");
      } else {
        alert("Please verify the link in your registered email before logging in.");
      }
    } else {
      alert("No active user session found. Please register or log in.");
    }
  };

  const isEmailBanned = async (email) => {
    const docRef = doc(firestore, 'bannedEmails', email);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() && docSnap.data().isBanned;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log("Register attempt for:", email);
    setError("");

    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
      setError("Password must be alphanumeric and at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);

      // Check if email is banned
      if (await isEmailBanned(email)) {
        setError("This email is banned.");
        setLoading(false);
        return;
      }

      // Register the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      setError("");
      setIsVerificationMessageVisible(true);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("This email is already in use.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <div className="flex justify-center items-center bg-gray-400 w-screen h-screen">
        <form className="bg-white shadow-md rounded-md px-8 pt-6 pb-8 mb-4 w-full max-w-sm" onSubmit={handleRegister}>
          <h2 className="text-2xl text-center mb-4">Register</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-6">
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
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">
            Submit
          </button>
          {error && <p className="text-red-500 font-bold text-xs mt-2">{error}</p>}
          {isVerificationMessageVisible && (
            <div className="bg-green-100 p-2 rounded mt-2">
              Email Verification link sent. Please Verify your email to Continue.{" "}
              <button onClick={handleManualRedirect} className="hover:text-blue-700 text-blue-500 font-bold rounded" type="button">
                Login
              </button>
            </div>
          )}
        </form>
      </div>
    </Spin>
  );
};

export default Register;
