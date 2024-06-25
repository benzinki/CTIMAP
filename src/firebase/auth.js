import { auth } from "./firebase";

import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
} from "firebase/auth";

export const registerUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential;
};

export const signIn = async (email, password, rememberMe = false) => {
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);
  return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = async () => {
  return auth.signOut();
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result;
};

export const resetPassword = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const observedAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const reauthenticateUser = async (email, currentPassword) => {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(email, currentPassword);
  return reauthenticateWithCredential(user, credential);
};

export const changePassword = async (newPassword) => {
  const user = auth.currentUser;
  return updatePassword(user, newPassword);
};