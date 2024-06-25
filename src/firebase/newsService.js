import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { app } from './firebase.js';

const firestore = getFirestore(app);

export const fetchNews = async () => {
  try {
    const newsCollection = collection(firestore, 'news');
    const q = query(newsCollection, orderBy('createdAt', 'desc'));
    const newsSnapshot = await getDocs(newsCollection);
    const newsList = newsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return newsList;
  } catch (error) {
    console.error("Error fetching news: ", error);
    throw error;
  }
};
