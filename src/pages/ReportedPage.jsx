import React, { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase.js';
import { collection, getDocs, doc, getDoc, deleteDoc, updateDoc, setDoc, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { getAuth, deleteUser as firebaseDeleteUser } from 'firebase/auth';

const ReportedPage = () => {
  const [reportedNews, setReportedNews] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  const fetchUserDetails = async (userId) => {
    if (!userId) return { username: 'Unknown', email: 'Unknown' };
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return { username: data.username, email: data.email };
    } else {
      return { username: 'Unknown', email: 'Unknown' };
    }
  };

  useEffect(() => {
    const fetchReportedData = async () => {
      try {
        const newsQuerySnapshot = await getDocs(collection(firestore, 'reportedNews'));
        const reportedNewsData = await Promise.all(newsQuerySnapshot.docs.map(async (docSnapshot) => {
          const newsDoc = await getDoc(doc(firestore, 'news', docSnapshot.data().newsId));
          if (!newsDoc.exists()) return null;
          const newsData = newsDoc.data();
          const authorDetails = await fetchUserDetails(newsData.userId);
          const reportedByDetails = await fetchUserDetails(docSnapshot.data().reportedBy);
          return {
            id: docSnapshot.id,
            ...docSnapshot.data(),
            newsData,
            authorDetails,
            reportedByDetails
          };
        }));

        const commentsQuerySnapshot = await getDocs(collection(firestore, 'reportedComments'));
        const reportedCommentsData = await Promise.all(commentsQuerySnapshot.docs.map(async (docSnapshot) => {
          const commentDoc = await getDoc(doc(firestore, 'comments', docSnapshot.data().commentId));
          if (!commentDoc.exists()) return null;
          const commentData = commentDoc.data();
          const commenterDetails = await fetchUserDetails(commentData.userId);
          const reportedByDetails = await fetchUserDetails(docSnapshot.data().reportedBy);
          return {
            id: docSnapshot.id,
            ...docSnapshot.data(),
            commentData,
            commenterDetails,
            reportedByDetails
          };
        }));

        const usersQuerySnapshot = await getDocs(collection(firestore, 'users'));
        const bannedUsersData = usersQuerySnapshot.docs
          .filter(userDoc => userDoc.data().banned)
          .map(userDoc => ({ id: userDoc.id, ...userDoc.data() }));

        const filteredReportedNewsData = reportedNewsData.filter(news => news !== null);
        const filteredReportedCommentsData = reportedCommentsData.filter(comment => comment !== null);

        filteredReportedNewsData.sort((a, b) => b.reportedAt.seconds - a.reportedAt.seconds);
        filteredReportedCommentsData.sort((a, b) => b.reportedAt.seconds - a.reportedAt.seconds);

        setReportedNews(filteredReportedNewsData);
        setReportedComments(filteredReportedCommentsData);
        setBannedUsers(bannedUsersData);
      } catch (error) {
        console.error('Error fetching reported data:', error);
        setError('Error fetching reported data');
      } finally {
        setLoading(false);
      }
    };

    fetchReportedData();
  }, []);

  const formatLongDate = (timestamp) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const deleteNews = async (newsId) => {
    if (window.confirm('Are you sure you want to delete this news? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(firestore, 'news', newsId));

        // Remove report entries for this news from reportedNews collection
        const reportedNewsQuery = query(collection(firestore, "reportedNews"), where("newsId", "==", newsId));
        const reportedNewsSnapshot = await getDocs(reportedNewsQuery);
        const deleteReportPromises = reportedNewsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteReportPromises);

        // Remove comment reports associated with this news
        const commentsQuery = query(collection(firestore, "comments"), where("newsId", "==", newsId));
        const commentsSnapshot = await getDocs(commentsQuery);
        const deleteCommentReportPromises = commentsSnapshot.docs.map(async (commentDoc) => {
          await deleteDoc(commentDoc.ref); // Delete the comment itself
          const reportedCommentQuery = query(collection(firestore, "reportedComments"), where("commentId", "==", commentDoc.id));
          const reportedCommentSnapshot = await getDocs(reportedCommentQuery);
          return Promise.all(reportedCommentSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        });
        await Promise.all(deleteCommentReportPromises);

        setReportedNews(reportedNews.filter(news => news.newsId !== newsId));
        setReportedComments(reportedComments.filter(comment => comment.commentData.newsId !== newsId));
        alert('News and associated comments deleted successfully.');
      } catch (error) {
        console.error('Error deleting news:', error);
      }
    }
  };

  const deleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(firestore, 'comments', commentId));

        // Remove report entries for this comment from reportedComments collection
        const reportedCommentQuery = query(collection(firestore, "reportedComments"), where("commentId", "==", commentId));
        const reportedCommentSnapshot = await getDocs(reportedCommentQuery);
        const deleteReportPromises = reportedCommentSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteReportPromises);

        setReportedComments(reportedComments.filter(comment => comment.commentId !== commentId));
        alert('Comment deleted successfully.');
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const deleteReport = async (reportId, type) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        if (type === 'news') {
          await deleteDoc(doc(firestore, 'reportedNews', reportId));
          setReportedNews(reportedNews.filter(report => report.id !== reportId));
        } else {
          await deleteDoc(doc(firestore, 'reportedComments', reportId));
          setReportedComments(reportedComments.filter(report => report.id !== reportId));
        }
        alert('Report deleted successfully.');
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const banUser = async (userId) => {
    const reason = window.prompt('Please provide a reason for banning this user:');
    if (reason) {
      if (window.confirm('Are you sure you want to ban this user? This action cannot be undone.')) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', userId));
          if (userDoc.exists()) {
            const userEmail = userDoc.data().email;
            const bannedBy = {
              username: auth.currentUser.displayName || 'Unknown',
              email: auth.currentUser.email || 'Unknown'
            };
  
            // Update Firestore to mark the user as banned
            await updateDoc(doc(firestore, 'users', userId), { banned: true, banReason: reason, bannedBy });
  
            // Add email to bannedEmails collection
            await setDoc(doc(firestore, 'bannedEmails', userEmail), { email: userEmail, isBanned: true });
  
            // Sign out the banned user
            if (auth.currentUser.email === userEmail) {
              await auth.signOut();
            }
  
            // Update local state
            setUsers(users.filter(user => user.id !== userId));
            setBannedUsers([...bannedUsers, { id: userId, email: userEmail, username: userDoc.data().username, banReason: reason, bannedBy }]);
            alert('User banned successfully.');
          } else {
            alert('User not found.');
          }
        } catch (error) {
          console.error('Error banning user:', error);
        }
      }
    }
  };  
  
  // Handle user unban
  const unbanUser = async (userId) => {
    if (window.confirm('Are you sure you want to unban this user?')) {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (userDoc.exists()) {
          const userEmail = userDoc.data().email;
          await updateDoc(doc(firestore, 'users', userId), { banned: false, banReason: '', bannedBy: {} });
          await deleteDoc(doc(firestore, 'bannedEmails', userEmail));

          setBannedUsers(bannedUsers.filter(user => user.id !== userId));
          setUsers([...users, { ...userDoc.data(), id: userId }]);
          alert('User unbanned successfully.');
        } else {
          alert('User not found.');
        }
      } catch (error) {
        console.error('Error unbanning user:', error);
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="p-5 font-sans">
      <h1 className="text-3xl font-bold mb-5">Reported News</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 bg-gray-700 text-white text-left">Date</th>
            <th className="p-2 bg-gray-700 text-white text-left">Author</th>
            <th className="p-2 bg-gray-700 text-white text-left">Title</th>
            <th className="p-2 bg-gray-700 text-white text-left">Reported By</th>
            <th className="p-2 bg-gray-700 text-white text-left">Reported At</th>
            <th className="p-2 bg-gray-700 text-white text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reportedNews.map((news, index) => (
            <tr key={index} className="cursor-pointer hover:bg-gray-200 even:bg-gray-100" onClick={() => navigate(`/news/${news.newsId}`)}>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                {news.newsData?.createdAt ? formatLongDate(news.newsData.createdAt) : 'N/A'}
              </td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                {news.authorDetails.username} ({news.authorDetails.email})
              </td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">{news.newsData?.title}</td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                {news.reportedByDetails.username} ({news.reportedByDetails.email})
              </td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                {new Date(news.reportedAt.seconds * 1000).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td className="p-2 max-w-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                <button onClick={(e) => { e.stopPropagation(); deleteNews(news.newsId); }} className="bg-red-500 text-white px-2 py-1 rounded">Delete News</button>
                <button onClick={(e) => { e.stopPropagation(); deleteReport(news.id, 'news'); }} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Delete Report</button>
                <button onClick={(e) => { e.stopPropagation(); banUser(news.newsData.userId); }} className="bg-yellow-500 text-white px-2 py-1 rounded ml-2">Ban User</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-2xl font-bold mt-10 mb-5">Reported Comments</h2>
      <div className="space-y-4">
        {reportedComments.length === 0 ? (
          <p>No reported comments.</p>
        ) : (
          reportedComments.map(comment => (
            <div key={comment.id} className="border p-4 rounded-md cursor-pointer hover:bg-gray-200" onClick={() => navigate(`/news/${comment.commentData.newsId}`)}>
              <p><strong>Comment:</strong> {comment.commentData?.text}</p>
              <p><strong>Commented by:</strong> {comment.commenterDetails.username} ({comment.commenterDetails.email})</p>
              <p><strong>Reported Reason:</strong> {comment.reason}</p>
              <p><strong>Reported by:</strong> {comment.reportedByDetails.username} ({comment.reportedByDetails.email})</p>
              <p><strong>Reported At:</strong> {new Date(comment.reportedAt.seconds * 1000).toLocaleString()}</p>
              <div className="mt-2">
                <button onClick={(e) => { e.stopPropagation(); deleteComment(comment.commentId); }} className="bg-red-500 text-white px-2 py-1 rounded">Delete Comment</button>
                <button onClick={(e) => { e.stopPropagation(); deleteReport(comment.id, 'comment'); }} className="bg-blue-500 text-white px-2 py-1 rounded ml-2">Delete Report</button>
                <button onClick={(e) => { e.stopPropagation(); banUser(comment.commentData.userId); }} className="bg-yellow-500 text-white px-2 py-1 rounded ml-2">Ban User</button>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-10 mb-5">Banned Users</h2>
      <div className="space-y-4">
        {bannedUsers.length === 0 ? (
          <p>No banned users.</p>
        ) : (
          bannedUsers.map(user => (
            <div key={user.id} className="border p-4 rounded-md">
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Ban Reason:</strong> {user.banReason}</p>
              <p><strong>Banned By:</strong> {user.bannedBy?.username || 'Unknown'} ({user.bannedBy?.email || 'Unknown'})</p>
              <button onClick={() => unbanUser(user.id)} className="bg-green-500 text-white px-2 py-1 rounded mt-2">Unban User</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportedPage;
