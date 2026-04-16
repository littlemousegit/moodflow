import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, update, get, set } from 'firebase/database';

const ReactionsContext = createContext();

export const useReactions = () => useContext(ReactionsContext);

export const ReactionsProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Следим за авторизацией (как в FriendsContext)
  useEffect(() => {
    console.log('🔥 ReactionsProvider: подписка на auth state');
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('🔥 ReactionsProvider: auth state изменился, user:', user?.uid);
      setCurrentUser(user);
      setIsReady(true);
    });
    return () => unsubscribe();
  }, []);

  const addReaction = async (entryUserId, entryDate, reactionType) => {
    console.log('🔥 addReaction вызван, currentUser:', currentUser?.uid, 'isReady:', isReady);
    
    if (!isReady) {
      console.log('⚠️ ReactionsProvider ещё не готов');
      return false;
    }
    
    if (!currentUser) {
      console.log('❌ Реакция: пользователь не авторизован');
      return false;
    }
    
    try {
      const reactionRef = ref(db, `moods/${entryUserId}/${entryDate}/reactions/${currentUser.uid}`);
      const snapshot = await get(reactionRef);
      
      console.log('👍 Добавление реакции:', { 
        entryUserId, 
        entryDate, 
        reactionType, 
        currentReaction: snapshot.val() 
      });
      
      if (snapshot.val() === reactionType) {
        // Если уже есть такая реакция - удаляем
        await update(ref(db, `moods/${entryUserId}/${entryDate}/reactions`), {
          [currentUser.uid]: null
        });
        console.log('🗑️ Реакция удалена');
      } else {
        // Иначе ставим новую реакцию
        await set(reactionRef, reactionType);
        console.log('✅ Реакция добавлена');
      }
      return true;
    } catch (error) {
      console.error('❌ Ошибка добавления реакции:', error);
      return false;
    }
  };

  const getReactionsCount = (reactions) => {
    if (!reactions) return { like: 0, heart: 0, sad: 0 };
    
    const counts = { like: 0, heart: 0, sad: 0 };
    Object.values(reactions).forEach(reaction => {
      if (reaction === 'like') counts.like++;
      else if (reaction === 'heart') counts.heart++;
      else if (reaction === 'sad') counts.sad++;
    });
    return counts;
  };

  const getUserReaction = (reactions) => {
    if (!reactions || !currentUser) return null;
    return reactions[currentUser.uid] || null;
  };

  return (
    <ReactionsContext.Provider value={{
      addReaction,
      getReactionsCount,
      getUserReaction
    }}>
      {children}
    </ReactionsContext.Provider>
  );
};