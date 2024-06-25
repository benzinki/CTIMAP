import React, { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase.js';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const UploadedNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      if (currentUser) {
        try {
          const q = query(collection(firestore, 'news'), where('userId', '==', currentUser.uid));
          const querySnapshot = await getDocs(q);
          const newsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const sortedNews = newsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
          setNews(sortedNews);
        } catch (error) {
          setError('Error fetching news');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchNews();
  }, [currentUser]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this news item?');
    if (confirmed) {
      try {
        await deleteDoc(doc(firestore, 'news', id));
        setNews(news.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const formatLongDate = (timestamp) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!currentUser) {
    return <div>You need to log in to see your uploaded news.</div>;
  }

  return (
    <div className="p-5 font-sans">
      <h1 className="text-3xl font-bold mb-5">Uploaded News</h1>
      <table className="w-full border-collapse relative">
        <thead>
          <tr>
            <th className="p-2 bg-gray-700 text-white text-left">Date</th>
            <th className="p-2 bg-gray-700 text-white text-left">Threat Actor</th>
            <th className="p-2 bg-gray-700 text-white text-left">Title</th>
            <th className="p-2 bg-gray-700 text-white text-left">Country</th>
            <th className="p-2 bg-gray-700 text-white text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {news.map((item) => (
            <tr
              key={item.id}
              className="cursor-pointer hover:bg-gray-200 even:bg-gray-100 relative"
              onClick={() => navigate(`/news/${item.id}`)}
            >
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                {item.createdAt ? formatLongDate(item.createdAt) : 'N/A'}
              </td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.threatActor}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.title}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.country}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis relative text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex space-x-2 justify-center relative z-10">
                  <Link
                    to={`/edit-news/${item.id}`}
                    className="inline-flex justify-center w-16 h-8 rounded-md border border-gray-300 shadow-sm px-2 py-1 bg-blue-500 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex justify-center w-16 h-8 rounded-md border border-gray-300 shadow-sm px-2 py-1 bg-red-500 text-white text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UploadedNews;
