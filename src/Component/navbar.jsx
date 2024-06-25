import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, firestore } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Navbar = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPoints, setUserPoints] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsUserLoggedIn(true);
        setIsEmailVerified(user.emailVerified);
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          const displayName = user.displayName || "";
          setUserRole(role);
          if (role === "admin" || role === "superadmin") {
            setUsername(`${role} - ${displayName}`);
          } else {
            setUsername(displayName);
          }
          setUserPoints(userDoc.data().points || 0);
        } else {
          setIsUserLoggedIn(false);
          setIsEmailVerified(false);
          setUsername("");
          setUserPoints(0);
        }
      } else {
        setIsUserLoggedIn(false);
        setIsEmailVerified(false);
        setUsername("");
        setUserPoints(0);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleAddNewsClick = () => {
    if (!isUserLoggedIn || !isEmailVerified || !username) {
      navigate("/Login");
    } else {
      navigate("/AddNews");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleNavigation = async (path) => {
    if (username) {
      navigate(path);
    } else {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().username) {
          navigate(path);
        } else {
          navigate("/SetUsername");
        }
      } else {
        navigate("/SetUsername");
      }
    }
  };

  return (
    <div className="p-4 bg-slate-500 flex justify-between items-center w-screen">
      <Link to="/" className="text-xl font-sans font-bold text-white ml-3">
        CTIMap
      </Link>
      <div>
        {isUserLoggedIn && isEmailVerified ? (
          <>
            <div className="flex gap-6 p-2">
              <button className="border rounded-xl text-white p-3 font-bold hover:bg-gray-700" onClick={handleAddNewsClick}>
                Add News
              </button>
              <button className="border rounded-xl text-white p-3 font-bold hover:bg-gray-700" onClick={handleLogout}>
                Logout
              </button>
              <div className="relative" onMouseEnter={() => setShowDropdown(true)} onMouseLeave={() => setShowDropdown(false)}>
                <div className="cursor-pointer w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  👤
                </div>
                {showDropdown && (
                  <div className="absolute bg-gray-700 text-white right-0 mt-2 py-2 w-48 rounded-lg shadow-xl z-50">
                    <p className="block px-4 py-2 text-sm">{username} ({userPoints} points)</p>
                    <div>
                      <Link to="/ChangePassword" className="block px-4 py-2 text-sm hover:bg-gray-600">
                        <button>Change Password</button>
                      </Link>
                    </div>
                    <div>
                      <Link to="/ChangeUsername" className="block px-4 py-2 text-sm hover:bg-gray-600">
                        <button>Change Username</button>
                      </Link>
                    </div>
                    <div>
                      <Link to="/UploadedNews" className="block px-4 py-2 text-sm hover:bg-gray-600">
                        <button>Uploaded News</button>
                      </Link>
                    </div>
                    {["admin", "superadmin"].includes(userRole) && (
                      <div>
                        <Link to="/ReportedPage" className="block px-4 py-2 text-sm hover:bg-gray-600">
                          <button>Reported Page</button>
                        </Link>
                      </div>
                    )}
                    {userRole === "superadmin" && (
                      <div>
                        <Link to="/superadmin" className="block px-4 py-2 text-sm hover:bg-gray-600">
                          <button>User Management</button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-8 text-white font-bold">
              <button className="border rounded-xl p-3 hover:bg-gray-700" onClick={handleAddNewsClick}>
                Add News
              </button>
              <Link to="/Login">
                <button className="border rounded-xl p-3 hover:bg-gray-700">Login</button>
              </Link>
              <Link to="/Register">
                <button className="border rounded-xl p-3 mr-3 hover:bg-gray-700">Register</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;
