import React, {useState} from "react";
import { resetPassword } from "../firebase/auth";

const ResetPassword = () => {

    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Reset error before attempting
        setMessage(''); // Reset message before attempting

        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        try {
            await resetPassword(email);
            setMessage('Check your email for a link to reset your password. It might take a few minutes to arrive.');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen">
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-sm">
                <form onSubmit={handleSubmit}>
                    <h2 className="text-2xl text-center mb-4">Reset Password</h2>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    {error && <p className="text-red-500 text-xs italic">{error}</p>}
                    {message && <p className="text-green-500 text-xs italic">{message}</p>}
                    <div className="flex items-center justify-between">
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">
                            Send Reset Email
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword