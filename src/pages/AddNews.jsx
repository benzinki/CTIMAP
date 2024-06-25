import React, { useState, useRef } from "react";
import { firestore } from '../firebase/firebase.js';
import { collection, addDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { Spin } from 'antd';

const AddNews = () => {

    const initialFormData = {
        title: '',
        threatActor: '',
        description: '',
        country: '',
        mitreAttack: '',
        ioc: '',
        caseDate: '',
        recommendation: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const hiddenDateInputRef = useRef(null);
    const auth = getAuth(); // Change: Initialize auth
    const user = auth.currentUser; // Change: Get current user

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value, }))
    };

    const handleDateChange = (e) => {
        const value = e.target.value;
        setFormData(prevState => ({ ...prevState, caseDate: value }));
    };

    const handleTextInputClick = () => {
        hiddenDateInputRef.current.showPicker();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const addNewsToFirestore = async () => {
            try {
                setLoading(true);
                if (user) { // Change: Check if user is logged in
                    const docRef = await addDoc(collection(firestore, "news"), {
                        title: formData.title,
                        threatActor: formData.threatActor,
                        description: formData.description,
                        country: formData.country,
                        mitreAttack: formData.mitreAttack,
                        ioc: formData.ioc,
                        caseDate: formData.caseDate,
                        createdAt: new Date(),
                        userId: user.uid
                    });
                    // console.log("Document written with ID: ", docRef.id);
                    alert("News successfully added!");
                    setFormData(initialFormData);
                } else {
                    alert("User is not logged in.");
                }
            } catch (e) {
                console.error("Error adding document: ", e);
            } finally {
                setLoading(false);
            }
        };
        addNewsToFirestore();
    };

    return (
        <Spin spinning={loading}>
            <div className="flex justify-center items-center bg-gray-400 w-screen h-screen">
                <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white px-8 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold my-6 flex justify-center">Add News</h2>
                    <div className="mb-4">
                        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Title" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="mb-4">
                        <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Country" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="mb-4">
                        <input type="text" name="threatActor" value={formData.threatActor} onChange={handleChange} placeholder="Threat Actor" required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="mb-4 relative">
                        <input type="text" value={formData.caseDate} onFocus={handleTextInputClick} placeholder="Case Date" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly />
                        <input type="date" ref={hiddenDateInputRef} value={formData.caseDate} onChange={handleDateChange} className="absolute top-0 left-0 opacity-0 pointer-events-none" style={{ width: '100%' }} />
                    </div>
                    <div className="mb-4">
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required className="shadow appearance-none border-cyan-400 rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline resize-none h-32" />
                    </div>
                    <div className="mb-4">
                        <textarea name="ioc" value={formData.ioc} onChange={handleChange} placeholder="IOC" required className="shadow appearance-none border-cyan-400 rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline resize-none" />
                    </div>
                    <div className="mb-4">
                        <textarea name="mitreAttack" value={formData.mitreAttack} onChange={handleChange} placeholder="Mitre Attack" required className="shadow appearance-none border-cyan-400 rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline resize-none" />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200">Add News</button>
                    <Link to="/" className="p-2 text-blue-500 hover:underline flex justify-center">Back to Home</Link>
                </form>
            </div>
        </Spin>
    );
};

export default AddNews;
