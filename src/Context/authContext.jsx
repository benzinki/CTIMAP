// import { createContext } from "react";
// import React, {useState, useEffect, useContext} from 'react';
// import { onAuthStateChanged } from 'firebase/auth';
// import { auth } from "../firebase/firebase";

// const AuthContext = createContext()

// export function useAuth(){
//     return useContext (AuthContext)
// }

// export function AuthProvider({children}){
//     const [currUser, setCurrUser] = useState (null)

//     useEffect(() =>{
//         const unsubscribe = onAuthStateChanged(auth, initializeUser)
//         return unsubscribe
//     }, [])

//     const initializeUser = async (user) => {
//         if (user){
//             setCurrUser({...user})
//         }else{
//             setCurrUser(null)
//         }
//     }

//     const value = {
//         currUser
//     }

//     return (
//         <AuthContext.Provider value={value}>
//             {children}
//         </AuthContext.Provider>
//     )
// }