import React, { useEffect, useState, useRef } from 'react';
import { fetchNews } from '../firebase/newsService';
import { getDoc, doc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged } from "firebase/auth";

const HomePage = () => {
  const [news, setNews] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const hiddenDateInputRef = useRef(null);

  useEffect(() => {
    const getNews = async () => {
      try {
        const newsData = await fetchNews();
        const newsWithAuthor = await Promise.all(newsData.map(async (item) => {
          if (item.userId) {
            const authorDoc = await getDoc(doc(firestore, "users", item.userId));
            if (authorDoc.exists()) {
              const authorData = authorDoc.data();
              if (authorData.role === "admin" || authorData.role === "superadmin") {
                item.authorName = `${authorData.role} - ${authorData.username || 'Unknown'}`;
              } else {
                item.authorName = authorData.username || 'Unknown';
              }
            } else {
              item.authorName = 'N/A';
            }
          } else {
            item.authorName = 'N/A';
          }
          return item;
        }));

        const sortedNews = newsWithAuthor.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          return 0;
        });

        setNews(sortedNews);
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    };

    getNews();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDateFilter(value);
  };

  const handleTextInputClick = () => {
    hiddenDateInputRef.current.showPicker();
  };

  const handleActorChange = (e) => {
    setActorFilter(e.target.value);
  };

  const handleCountryChange = (e) => {
    setCountryFilter(e.target.value);
  };

  const handleClearFilters = () => {
    setDateFilter('');
    setActorFilter('');
    setCountryFilter('');
  };

  const formatLongDate = (timestamp) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDeleteNews = async (newsId) => {
    if (window.confirm('Are you sure you want to delete this news? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(firestore, 'news', newsId));
        setNews(news.filter(news => news.id !== newsId));
        alert('News deleted successfully.');
      } catch (error) {
        console.error('Error deleting news:', error);
        alert('Failed to delete news.');
      }
    }
  };

  const handleNewsClick = (newsId) => {
    if (!isLoggedIn) {
      alert('You must be logged in to view the news details.');
    } else {
      navigate(`/news/${newsId}`);
    }
  };

  const filteredNews = news.filter((item) => {
    const createdAtDate = item.createdAt ? new Date(item.createdAt.seconds * 1000).toISOString().split('T')[0] : '';
    const dateMatch = !dateFilter || createdAtDate === dateFilter;
    const actorMatch = !actorFilter || item.threatActor.toLowerCase().includes(actorFilter.toLowerCase());
    const countryMatch = !countryFilter || item.country.toLowerCase().includes(countryFilter.toLowerCase());
    return dateMatch && actorMatch && countryMatch;
  });

  return (
    <div className="p-5 font-sans">
      <div className="flex items-center justify-center mb-5">
        <span className="mr-2 text-xl font-bold text-gray-700">Filter by</span>
        <div className="flex">
          <div className="relative">
            <input
              type="text"
              value={dateFilter}
              onFocus={handleTextInputClick}
              placeholder="Filter by Date"
              className="p-2 m-0 mx-2 border border-gray-300 rounded"
              readOnly
            />
            <input
              type="date"
              ref={hiddenDateInputRef}
              value={dateFilter}
              onChange={handleDateChange}
              className="absolute top-0 left-0 opacity-0 pointer-events-none"
              style={{ width: '100%' }}
            />
          </div>
          <input 
            type="text" 
            value={actorFilter} 
            onChange={handleActorChange} 
            placeholder="Filter by Threat Actor" 
            className="p-2 m-0 mx-2 border border-gray-300 rounded"
          />
          <input 
            type="text" 
            value={countryFilter} 
            onChange={handleCountryChange} 
            placeholder="Filter by Country" 
            className="p-2 m-0 mx-2 border border-gray-300 rounded"
          />
          <button 
            onClick={handleClearFilters} 
            className="p-2 ml-2 border border-gray-300 rounded bg-gray-200 hover:bg-gray-300"
          >
            Clean Filter
          </button>
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 bg-gray-700 text-white text-left">Post Date</th>
            <th className="p-2 bg-gray-700 text-white text-left">Author</th>
            <th className="p-2 bg-gray-700 text-white text-left">Title</th>
            <th className="p-2 bg-gray-700 text-white text-left">Threat Actor</th>
            <th className="p-2 bg-gray-700 text-white text-left">Country</th>
            {userRole === "superadmin" && <th className="p-2 bg-gray-700 text-white text-left">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredNews.map((item, index) => (
            <tr 
              key={index} 
              className="cursor-pointer hover:bg-gray-200 even:bg-gray-100"
              onClick={() => handleNewsClick(item.id)}
            >
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.createdAt ? formatLongDate(item.createdAt) : 'N/A'}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.authorName}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.title}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.threatActor}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{item.country}</td>
              {userRole === "superadmin" && (
                <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/edit-news/${item.id}`);
                    }} 
                    className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNews(item.id);
                    }} 
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HomePage;
