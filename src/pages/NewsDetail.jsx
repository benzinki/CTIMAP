import React, { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase.js';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { generatePDF } from '../Utils/pdfGenerator.js';
import { Spin } from 'antd';

const NewsDetail = () => {
  const { id } = useParams();
  const [newsItem, setNewsItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportingComment, setReportingComment] = useState(null);
  const [reportingNews, setReportingNews] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchNewsItem = async () => {
      try {
        const docRef = doc(firestore, "news", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNewsItem(docSnap.data());
        } else {
          setError("The document that you are searching for either does not exist or document has been deleted.");
        }
      } catch (error) {
        setError("Error fetching document");
      } finally {
        setLoading(false);
      }
    };

    const fetchComments = async () => {
      try {
        const q = query(collection(firestore, "comments"), where("newsId", "==", id));
        const querySnapshot = await getDocs(q);
        const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedComments = commentsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        setComments(sortedComments);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchNewsItem();
    fetchComments();
  }, [id]);

  const refreshComments = async () => {
    try {
      const q = query(collection(firestore, "comments"), where("newsId", "==", id));
      const querySnapshot = await getDocs(q);
      const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedComments = commentsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setComments(sortedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("You need to log in to comment.");
      return;
    }
    if (commentText.trim() === '') {
      alert("Comment cannot be empty.");
      return;
    }

    try {
      const now = Timestamp.now();
      const oneHourAgo = new Date(now.seconds * 1000 - 3600 * 1000);
      const commentsQuery = query(
        collection(firestore, "comments"),
        where("userId", "==", user.uid),
        where("createdAt", ">", Timestamp.fromDate(oneHourAgo))
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      if (commentsSnapshot.size >= 3) {
        alert("You can only comment 3 times in an hour.");
        return;
      }

      await addDoc(collection(firestore, "comments"), {
        newsId: id,
        userId: user.uid,
        userName: user.displayName || user.email,
        text: commentText,
        createdAt: now,
        parentId: null,
        likes: 0,
        likedBy: []
      });
      setCommentText('');
      refreshComments();
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("You need to log in to reply.");
      return;
    }
    if (replyText.trim() === '') {
      alert("Reply cannot be empty.");
      return;
    }

    try {
      const now = Timestamp.now();
      const oneHourAgo = new Date(now.seconds * 1000 - 3600 * 1000);
      const commentsQuery = query(
        collection(firestore, "comments"),
        where("userId", "==", user.uid),
        where("createdAt", ">", Timestamp.fromDate(oneHourAgo))
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      if (commentsSnapshot.size >= 3) {
        alert("You can only comment 3 times in an hour.");
        return;
      }

      await addDoc(collection(firestore, "comments"), {
        newsId: id,
        userId: user.uid,
        userName: user.displayName || user.email,
        text: replyText,
        createdAt: now,
        parentId: replyTo,
        likes: 0,
        likedBy: []
      });
      setReplyText('');
      setReplyTo(null);
      refreshComments();
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment.userId !== user.uid) {
      alert("You can only delete your own comment.");
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this comment?');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(firestore, "comments", commentId));
      refreshComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleReportComment = (commentId, userId) => {
    if (userId === user.uid) {
      alert("You cannot report your own comment.");
      return;
    }
    setReportingComment(commentId);
  };

  const handleReportNews = () => {
    setReportingNews(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("You need to log in to report.");
      return;
    }
    if (reportReason.trim() === '') {
      alert("Report reason cannot be empty.");
      return;
    }

    try {
      const reportData = {
        reason: reportReason,
        reportedBy: user.uid,
        reportedAt: Timestamp.now(),
      };

      if (reportingComment) {
        await addDoc(collection(firestore, "reportedComments"), {
          ...reportData,
          commentId: reportingComment,
        });
      } else {
        await addDoc(collection(firestore, "reportedNews"), {
          ...reportData,
          newsId: id,
        });
      }

      setReportReason('');
      setReportingComment(null);
      setReportingNews(false);
      alert("Reported successfully.");
    } catch (error) {
      console.error("Error reporting:", error);
    }
  };

  const handleLike = async (id, collectionName, userId) => {
    if (!user) {
      alert("You need to log in to like.");
      return;
    }

    if (user.uid === userId) {
      alert("You cannot like your own post.");
      return;
    }

    try {
      const itemRef = doc(firestore, collectionName, id);
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        let newLikes, newLikedBy, pointsChange;
        if (data.likedBy && data.likedBy.includes(user.uid)) {
          // Unlike the item
          newLikes = (data.likes || 0) - 1;
          newLikedBy = data.likedBy.filter(uid => uid !== user.uid);
          pointsChange = -10;
        } else {
          // Like the item
          newLikes = (data.likes || 0) + 1;
          newLikedBy = [...(data.likedBy || []), user.uid];
          pointsChange = 10;
        }

        await updateDoc(itemRef, { likes: newLikes, likedBy: newLikedBy });

        // Update the user's points
        const authorRef = doc(firestore, 'users', userId);
        const authorDoc = await getDoc(authorRef);
        if (authorDoc.exists()) {
          const newPoints = (authorDoc.data().points || 0) + pointsChange;
          await updateDoc(authorRef, { points: newPoints });
        }

        // Refresh news item or comment
        if (collectionName === 'news') {
          setNewsItem({ ...data, likes: newLikes, likedBy: newLikedBy });
        } else {
          setComments(comments.map(comment => comment.id === id ? { ...comment, likes: newLikes, likedBy: newLikedBy } : comment));
        }
      }
    } catch (error) {
      console.error("Error liking the item:", error);
    }
  };

  const handleDeleteNews = async () => {
    const confirmed = window.confirm('Are you sure you want to delete this news? This action cannot be undone.');
    if (!confirmed) return;

    try {
      // Delete all comments associated with this news
      const commentsQuery = query(collection(firestore, "comments"), where("newsId", "==", id));
      const commentsSnapshot = await getDocs(commentsQuery);
      const deleteCommentPromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteCommentPromises);

      // Delete the news item
      await deleteDoc(doc(firestore, "news", id));

      // Remove report entries for this news from reportedNews collection
      const reportedNewsQuery = query(collection(firestore, "reportedNews"), where("newsId", "==", id));
      const reportedNewsSnapshot = await getDocs(reportedNewsQuery);
      const deleteReportPromises = reportedNewsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteReportPromises);

      navigate("/");
    } catch (error) {
      console.error("Error deleting news:", error);
    }
  };

  const handleDownloadPDF = () => {
    if (newsItem) {
      const content = `
        <h1>${newsItem.title}</h1>
        <p><strong>Country:</strong> ${newsItem.country}</p>
        <p><strong>Threat Actor:</strong> ${newsItem.threatActor}</p>
        <p><strong>IOC:</strong> ${newsItem.ioc}</p>
        <p><strong>MITRE Attack:</strong> ${newsItem.mitreAttack}</p>
        <p><strong>Case Date:</strong> ${formatCaseDate(newsItem.caseDate)}</p>
        <p>${newsItem.description.replace(/\n/g, '<br>')}</p>
      `;
      generatePDF(content, `${newsItem.title}.pdf`);
    } else {
      alert('No news item to download.');
    }
  };
  

  const formatLongDateTime = (timestamp) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLongDate = (timestamp) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCaseDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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

  if (!newsItem) {
    return <div>No news item found</div>;
  }

  return (
    <Spin spinning={loading}>
      <div className="max-w-3xl mx-auto p-5 font-sans">
        <h1 className="text-4xl font-bold mb-5 text-center">{newsItem.title}</h1>
        <div className="flex justify-center gap-4 mb-5 text-gray-500 text-sm">
          <span>
            {newsItem.createdAt ? formatLongDate(newsItem.createdAt) : 'N/A'}
          </span>
          <button
            onClick={() => handleLike(id, 'news', newsItem.userId)}
            className="text-red-600 font-bold hover:underline flex justify-center"
          >
            {newsItem.likedBy && newsItem.likedBy.includes(user.uid) ? (
              <span className="text-red-500 mr-1">♥️</span>
            ) : (
              <span className="mr-1">♡</span>
            )}
            Like ({newsItem.likes || 0})
          </button>
          <button
                onClick={handleReportNews}
                className="text-yellow-500 hover:text-yellow-600 hover:underline flex justify-center"
              >
                Report News
          </button>
          <button 
            onClick={() => generatePDF(newsItem)} 
            // className="px-2 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-700 mr-2 flex justify-center"
            className="text-blue-500 hover:text-blue-600 hover:underline flex justify-center"
            >
            Download as PDF
          </button>
        </div>
        <div className="text-center mt-5">
          {user && user.uid !== newsItem.userId && (
            <>
              {reportingNews && (
                <form onSubmit={handleReportSubmit} className="mt-2">
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Reason for reporting..."
                    className="w-full p-2 border rounded-md resize-none"
                    rows="2"
                  />
                  <button type="submit" className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-700">Submit Report</button>
                </form>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 mb-5 text-base">
          <div><strong>Country:</strong> {newsItem.country}</div>
          <div><strong>Threat Actor:</strong> {newsItem.threatActor}</div>
          <div><strong>Case Date:</strong> {formatCaseDate(newsItem.caseDate)}</div>
        </div>
        <div className="mb-5">
          {newsItem.description.split('\n\n').map((str, index) => (
            <p key={index} className="mb-5">{str.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}</p>
          ))}
        </div>
        <div className="mb-5">
          <strong>IOC:</strong>{newsItem.ioc.split('\n\n').map((str, index) => (
            <p key={index} className="mb-5">{str.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}</p>
          ))}
        </div>
        <div className="mb-5">
          <strong>MITRE Attack:</strong>{newsItem.mitreAttack.split('\n\n').map((str, index) => (
            <p key={index} className="mb-5">{str.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}</p>
          ))}
        </div>
        {/* <div className="flex flex-col gap-2 mb-5 text-base">
        <div><strong>IOC:</strong> {newsItem.ioc}</div>
        <div><strong>MITRE Attack:</strong> {newsItem.mitreAttack}</div>
        </div> */}
        <div className="text-center mt-5">
          <Link to="/" className="text-blue-600 font-bold hover:underline mr-4">Back to Home</Link>
        </div>
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-5">Comments</h2>
          <div className="border p-4 rounded-md max-h-[700px] overflow-y-auto">
            {comments.filter(comment => !comment.parentId).length === 0 ? (
              <p>No comments yet. Be the first to comment!</p>
            ) : (
              <div className="space-y-4">
                {comments.filter(comment => !comment.parentId).map(comment => (
                  <div key={comment.id} className="border p-4 rounded-md">
                    <p className="font-bold">{comment.userName}</p>
                    <p>{comment.text}</p>
                    <p className="text-gray-500 text-sm">{formatLongDateTime(comment.createdAt)}</p>
                    <div className="flex space-x-4 mt-2">
                      <button
                        onClick={() => setReplyTo(comment.id)}
                        className="text-blue-600 font-bold hover:underline text-sm"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => handleLike(comment.id, 'comments', comment.userId)}
                        className="text-blue-600 font-bold hover:underline text-sm flex items-center"
                      >
                        {comment.likedBy && comment.likedBy.includes(user.uid) ? (
                          <span className="text-red-500 mr-1">♥️</span>
                        ) : (
                          <span className="mr-1">♡</span>
                        )}
                        Like ({comment.likes || 0})
                      </button>
                      {user && comment.userId === user.uid && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-600 font-bold hover:underline text-sm"
                        >
                          Delete
                        </button>
                      )}
                      {user && comment.userId !== user.uid && (
                        <button
                          onClick={() => handleReportComment(comment.id, comment.userId)}
                          className="text-yellow-600 font-bold hover:underline text-sm"
                        >
                          Report
                        </button>
                      )}
                    </div>
                    {replyTo === comment.id && (
                      <form onSubmit={handleReplySubmit} className="mt-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="w-full p-2 border rounded-md resize-none"
                          rows="2"
                        />
                        <button type="submit" className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-700">Submit</button>
                      </form>
                    )}
                    {reportingComment === comment.id && (
                      <form onSubmit={handleReportSubmit} className="mt-2">
                        <textarea
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder="Reason for reporting..."
                          className="w-full p-2 border rounded-md resize-none"
                          rows="2"
                        />
                        <button type="submit" className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-700">Submit Report</button>
                      </form>
                    )}
                    {comments.filter(reply => reply.parentId === comment.id).sort((a, b) => a.createdAt.seconds - b.createdAt.seconds).map(reply => (
                      <div key={reply.id} className="ml-4 mt-2 border-l pl-4">
                        <p className="font-bold">{reply.userName}</p>
                        <p>{reply.text}</p>
                        <p className="text-gray-500 text-sm">{formatLongDateTime(reply.createdAt)}</p>
                        <div className="flex space-x-4 mt-2">
                          <button
                            onClick={() => handleLike(reply.id, 'comments', reply.userId)}
                            className="text-blue-600 font-bold hover:underline text-sm flex items-center"
                          >
                            {reply.likedBy && reply.likedBy.includes(user.uid) ? (
                              <span className="text-red-500 mr-1">♥️</span>
                            ) : (
                              <span className="mr-1">♡</span>
                            )}
                            Like ({reply.likes || 0})
                          </button>
                          {user && reply.userId === user.uid && (
                            <button
                              onClick={() => handleDeleteComment(reply.id)}
                              className="text-red-600 font-bold hover:underline text-sm"
                            >
                              Delete
                            </button>
                          )}
                          {user && reply.userId !== user.uid && (
                            <button
                              onClick={() => handleReportComment(reply.id, reply.userId)}
                              className="text-yellow-600 font-bold hover:underline text-sm"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={handleCommentSubmit} className="mt-5">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="w-full p-2 border rounded-md resize-none h-24"
              rows="4"
            />
            <button type="submit" className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-700">Submit</button>
          </form>
        </div>
      </div>
    </Spin>
  );
};

export default NewsDetail;
