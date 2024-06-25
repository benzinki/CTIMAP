import React, { useState } from 'react';
import { auth } from '../firebase/firebase';
import { reauthenticateUser, changePassword } from '../firebase/auth.js'
import { Spin } from "antd";
import { Link } from 'react-router-dom';

const ChangePassword = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(false);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError('New passwords do not match');
            return;
        }

        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                setError('No user is currently signed in.');
                return;
            }

            await reauthenticateUser(user.email, currentPassword);
            await changePassword(newPassword);
            setSuccess('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

        } catch (error) {
            setError(error.message);
            if (error.code === 'auth/too-many-requests') {
                setError('Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.');
            }
            if (error.code === 'auth/invalid-email') {
                alert('Please use the correct email format.');
            } else if (error.code === 'auth/user-not-found') {
                alert('User is not registered.');
            } else if (error.code === 'auth/invalid-credential') {
                alert('User is credentials is not valid');
            } else {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Spin spinning={loading}>
            <div className="flex justify-center items-center h-screen w-screen bg-gray-400">
                <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" onSubmit={handleSubmit}>
                    <h2 className="text-center text-2xl font-bold mb-4">Change Password</h2>

                    {success && <p className="text-green-500 text-s mb-4">{success}</p>}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-s font-bold mb-2" htmlFor="currentPassword">
                            Current Password
                        </label>
                        <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="currentPassword" type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                            New Password
                        </label>
                        <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="newPassword" type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmNewPassword">
                            Confirm New Password
                        </label>
                        <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="confirmNewPassword" type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                    </div>
                    {error && <p className="text-red-500 text-s mb-4">{error}</p>}
                    <div className="flex items-center justify-between">
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">
                            Change Password
                        </button>
                    </div>
                    <div className=''>
                        <Link to="/"><button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4">Back</button></Link>
                    </div>
                </form>
            </div>
        </Spin>
    );
};

export default ChangePassword;