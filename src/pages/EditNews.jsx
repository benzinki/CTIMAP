import React, { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

const EditNews = () => {
  const { id } = useParams();
  const [newsItem, setNewsItem] = useState({
    title: '',
    country: '',
    threatActor: '',
    ioc: '',
    mitreAttack: '',
    caseDate: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNewsItem = async () => {
      try {
        const docRef = doc(firestore, "news", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNewsItem(docSnap.data());
        } else {
          setError("No such document!");
        }
      } catch (error) {
        setError("Error fetching document");
      } finally {
        setLoading(false);
      }
    };

    fetchNewsItem();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewsItem((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(firestore, "news", id);
      await updateDoc(docRef, newsItem);
      navigate(`/news/${id}`);
    } catch (error) {
      console.error("Error updating document:", error);
      setError("Error updating document");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <Spin spinning={loading}>
      <div className="max-w-3xl mx-auto p-5 font-sans">
        <h1 className="text-4xl font-bold mb-5 text-center">Edit News</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700">Title</label>
            <input 
              type="text" 
              name="title" 
              value={newsItem.title} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded" 
            />
          </div>
          <div>
            <label className="block text-gray-700">Country</label>
            <input 
              type="text" 
              name="country" 
              value={newsItem.country} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded" 
            />
          </div>
          <div>
            <label className="block text-gray-700">Threat Actor</label>
            <input 
              type="text" 
              name="threatActor" 
              value={newsItem.threatActor} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded" 
            />
          </div>
          <div>
            <label className="block text-gray-700">Case Date</label>
            <input 
              type="date" 
              name="caseDate" 
              value={newsItem.caseDate} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded" 
            />
          </div>
          <div>
            <label className="block text-gray-700">Description</label>
            <textarea 
              name="description" 
              value={newsItem.description} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded h-48"
            />
          </div>
          <div>
            <label className="block text-gray-700">IOC</label>
            <textarea 
              name="ioc" 
              value={newsItem.ioc} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded h-32" 
            />
          </div>
          <div>
            <label className="block text-gray-700">MITRE Attack</label>
            <textarea 
              name="mitreAttack" 
              value={newsItem.mitreAttack} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded h-32" 
            />
          </div>
          <div className="text-center">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded">Save</button>
          </div>
        </form>
      </div>
    </Spin>
  );
};

export default EditNews;
