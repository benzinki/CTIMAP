import { useState, useEffect } from "react";
import { auth } from "../firebase/firebase.js";
import { Link } from "react-router-dom";
import { signIn, signInWithGoogle, observedAuthState } from "../firebase/auth";
import { useNavigate } from "react-router-dom";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { firestore } from "../firebase/firebase";
import { Spin } from 'antd';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showManualVerificationButton, setShowManualVerificationButton] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = observedAuthState(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (!userDoc.exists() || !userDoc.data().username || !userDoc.data().role) {
          navigate("/SetUsername");
        } else {
          navigate("/");
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const isEmailBanned = async (email) => {
    const docRef = doc(firestore, 'bannedEmails', email);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() && docSnap.data().isBanned;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      // Check if email is banned
      if (await isEmailBanned(email)) {
        setError("This email is banned.");
        return;
      }

      const response = await signIn(email, password);
      if (response.user.emailVerified) {
        const userDoc = await getDoc(doc(firestore, "users", response.user.uid));
        if (!userDoc.exists() || !userDoc.data().username || !userDoc.data().role) {
          navigate("/SetUsername");
        } else {
          navigate("/");
        }
      } else {
        setShowManualVerificationButton(true);
      }
    } catch (error) {
      if (error.code === "auth/too-many-requests") {
        setError("Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.");
      } else if (error.code === "auth/invalid-email") {
        alert("Please use the correct email format.");
      } else if (error.code === "auth/user-not-found") {
        alert("User is not registered.");
      } else if (error.code === "auth/invalid-credential") {
        alert("User credentials are not valid");
      } else {
        setError(error.message);
      }
    }
  };

  const recheckEmailVerification = async () => {
    await auth.currentUser.reload();
    const user = auth.currentUser;
    if (user.emailVerified) {
      navigate("/");
    } else {
      alert("Please verify your email.");
    }
  };

  const handleManualVerification = () => {
    recheckEmailVerification();
  };

  const handleLoginWithGoogle = async () => {
    try {
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;

      // Check if email is banned
      if (await isEmailBanned(user.email)) {
        await auth.signOut();
        setError("This email is banned.");
        return;
      }

      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (!userDoc.exists() || !userDoc.data().username || !userDoc.data().role) {
        await setDoc(doc(firestore, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username: user.displayName || user.email,
          role: "member",
          lastUsernameChange: null
        });
        navigate("/SetUsername");
      } else {
        navigate("/");
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Spin spinning={loading}>
      <div className="flex justify-center items-center bg-gray-400 w-screen h-screen">
        <div className="bg-white shadow-md rounded-md px-8 pt-6 pb-8 mb-4 w-full max-w-sm">
          <h2 className="text-2xl text-center mb-4">Login</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="shadow appearance-none border-cyan-400 rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm">
              <Link to="/ResetPassword" className="text-blue-500 hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>
          <div>
            <button
              onClick={handleLogin}
              className="bg-blue-500 mt-2 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline item-center"
              type="submit"
            >
              Login
            </button>
          </div>
          {error && <p className="text-red-500 text-s mt-2">{error}</p>}
          {showManualVerificationButton && (
            <div className="bg-green-100 p-2 rounded mt-2">
              Email Verification link sent. Please Verify your email to Continue.{" "}
              <button
                onClick={handleManualVerification}
                className="hover:text-blue-700 text-blue-500 font-bold rounded"
                type="button"
              >
                Done
              </button>
            </div>
          )}
          <div className="text-center mt-4">
            <span>Don't have an account? </span>
            <Link to="/Register" className="text-blue-500 hover:underline underline-offset-4">
              Register here
            </Link>
          </div>
          <p className="text-center py-3 text-bold">or</p>
          <div className="flex justify-center">
            <button
              className="flex flex-box w-9/12 bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 p-2"
              onClick={handleLoginWithGoogle}
            >
              <svg
                className="h-6 w-6 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                width="800px"
                height="800px"
                viewBox="-0.5 0 48 48"
                version="1.1"
              >
                {" "}
                <title>Google-color</title> <desc>Created with Sketch.</desc> <defs> </defs>{" "}
                <g id="Icons" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                  {" "}
                  <g id="Color-" transform="translate(-401.000000, -860.000000)">
                    {" "}
                    <g id="Google" transform="translate(401.000000, 860.000000)">
                      {" "}
                      <path
                        d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24"
                        id="Fill-1"
                        fill="#FBBC05"
                      >
                        {" "}
                      </path>{" "}
                      <path
                        d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333"
                        id="Fill-2"
                        fill="#EB4335"
                      >
                        {" "}
                      </path>{" "}
                      <path
                        d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667"
                        id="Fill-3"
                        fill="#34A853"
                      >
                        {" "}
                      </path>{" "}
                      <path
                        d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24"
                        id="Fill-4"
                        fill="#4285F4"
                      >
                        {" "}
                      </path>{" "}
                    </g>{" "}
                  </g>{" "}
                </g>{" "}
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </Spin>
  );
};

export default Login;
