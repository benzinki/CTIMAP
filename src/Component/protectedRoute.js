import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Context/authContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // User not logged in, redirect to login page
    return <Navigate to="/login" />;
  } else if (!currentUser.emailVerified) {
    // User's email not verified, redirect to a specific page (e.g., verify-email page)
    return <Navigate to="/verify-email" />;
  } else {
    // User logged in and email verified
    return children;
  }
};

export default ProtectedRoute;