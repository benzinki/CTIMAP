import React from 'react';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/homepage.jsx';
import Login from './pages/Login-form.jsx';
import Register from './pages/register-form.jsx';
import ChangePassword from './pages/change-password.jsx';
import AddNews from './pages/AddNews.jsx';
import ResetPassword from './pages/forget-password.jsx';
import NewsDetail from './pages/NewsDetail';
import Navbar from './Component/navbar.jsx';
import EditNews from './pages/EditNews.jsx';
import UploadedNews from './pages/UploadedNews.jsx';
import ChangeUsername from './pages/change-username.jsx';
import ReportedPage from './pages/ReportedPage.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';
import SetUsername from './pages/SetUsername';

function App() {
  return (
    <>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/Login' element={<Login />} />
          <Route path='/Register' element={<Register />} />
          <Route path='/ChangePassword' element={<ChangePassword />} />
          <Route path='/AddNews' element={<AddNews />} />
          <Route path='/ResetPassword' element={<ResetPassword />} />
          <Route path='/news/:id' element={<NewsDetail />} />
          <Route path="/UploadedNews" element={<UploadedNews />} />
          <Route path="/edit-news/:id" element={<EditNews />} />
          <Route path="/ChangeUsername" element={<ChangeUsername />} />
          <Route path="/ReportedPage" element={<ReportedPage />} />
          <Route path="/superadmin" element={<SuperAdminPage />} />
          <Route path="/SetUsername" element={<SetUsername />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
