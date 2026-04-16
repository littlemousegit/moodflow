import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';

const FriendsContext = createContext();

export const useFriends = () => useContext(FriendsContext);

export const FriendsProvider = ({ children }) => {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [friendsMoodEntries, setFriendsMoodEntries] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Следим за авторизацией отдельно
  useEffect(() => {
    console.log('🔥 FriendsProvider: подписка на auth state');
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('🔥 FriendsProvider: auth state изменился, user:', user?.uid);
      setCurrentUser(user);
      setIsReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Загрузка всех пользователей (только когда есть currentUser)
  useEffect(() => {
    console.log('🔥 useEffect загрузки пользователей, currentUser:', currentUser?.uid, 'isReady:', isReady);
    
    if (!isReady) {
      console.log('⚠️ Ещё не готово, ждём...');
      return;
    }
    
    if (!currentUser) {
      console.log('⚠️ Пользователь не авторизован, очищаем списки');
      setAllUsers([]);
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    
    console.log('🔍 Начинаем загрузку пользователей из Firebase...');
    
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      console.log('📦 Получены данные из Firebase users:', data);
      console.log('📦 Ключи пользователей:', Object.keys(data));
      
      const usersList = Object.entries(data)
        .filter(([uid]) => uid !== currentUser.uid)
        .map(([uid, userData]) => {
          console.log(`📱 Обработка пользователя ${uid}:`, userData);
          return {
            id: uid,
            email: userData.email || 'нет email',
            name: userData.name || userData.email?.split('@')[0] || uid.slice(0, 6),
            role: userData.role || 'user'
          };
        });
      
      console.log('👥 Итоговый список allUsers:', usersList);
      setAllUsers(usersList);
    }, (error) => {
      console.error('❌ Ошибка загрузки пользователей:', error);
    });
    
    return () => unsubscribeUsers();
  }, [currentUser, isReady]);

  // Загрузка друзей
  useEffect(() => {
    if (!currentUser) return;
    
const friendsRef = ref(db, `friendships/${currentUser.uid}/friends`);
const unsubscribe = onValue(friendsRef, (snapshot) => {
  const data = snapshot.val() || {};
  const friendsList = Object.keys(data).map(friendId => {
    const friendData = allUsers.find(u => u.id === friendId);
    return {
      id: friendId,
      email: friendData?.email || 'загрузка...',
      name: friendData?.name || friendData?.email?.split('@')[0] || 'Друг'
    };
  });
  console.log('👥 Список друзей:', friendsList);
  setFriends(friendsList);
});
    
    return () => unsubscribe();
  }, [currentUser, allUsers]);

  // Загрузка входящих заявок
  useEffect(() => {
    if (!currentUser) return;
    
    const incomingRef = ref(db, `friendships/${currentUser.uid}/incoming`);
    const unsubscribe = onValue(incomingRef, (snapshot) => {
      const data = snapshot.val() || {};
      const requests = Object.entries(data)
        .filter(([_, status]) => status === 'pending')
        .map(([fromUserId]) => ({
          id: fromUserId,
          fromUserId,
          user: allUsers.find(u => u.id === fromUserId)
        }));
      setIncomingRequests(requests);
    });
    
    return () => unsubscribe();
  }, [currentUser, allUsers]);

  // Загрузка исходящих заявок
  useEffect(() => {
    if (!currentUser) return;
    
    const outgoingRef = ref(db, `friendships/${currentUser.uid}/outgoing`);
    const unsubscribe = onValue(outgoingRef, (snapshot) => {
      const data = snapshot.val() || {};
      const requests = Object.entries(data)
        .filter(([_, status]) => status === 'pending')
        .map(([toUserId]) => ({
          id: toUserId,
          toUserId,
          user: allUsers.find(u => u.id === toUserId)
        }));
      setOutgoingRequests(requests);
    });
    
    return () => unsubscribe();
  }, [currentUser, allUsers]);

  const sendFriendRequest = async (toUserId) => {
    if (!currentUser) return false;
    
    try {
      await set(ref(db, `friendships/${currentUser.uid}/outgoing/${toUserId}`), 'pending');
      await set(ref(db, `friendships/${toUserId}/incoming/${currentUser.uid}`), 'pending');
      return true;
    } catch (error) {
      console.error('Ошибка отправки заявки:', error);
      return false;
    }
  };

  const acceptFriendRequest = async (fromUserId) => {
    if (!currentUser) return false;
    
    try {
      await set(ref(db, `friendships/${currentUser.uid}/incoming/${fromUserId}`), 'accepted');
      await set(ref(db, `friendships/${fromUserId}/outgoing/${currentUser.uid}`), 'accepted');
      await set(ref(db, `friendships/${currentUser.uid}/friends/${fromUserId}`), true);
      await set(ref(db, `friendships/${fromUserId}/friends/${currentUser.uid}`), true);
      return true;
    } catch (error) {
      console.error('Ошибка принятия заявки:', error);
      return false;
    }
  };

  const rejectFriendRequest = async (fromUserId) => {
    if (!currentUser) return false;
    
    try {
      await remove(ref(db, `friendships/${currentUser.uid}/incoming/${fromUserId}`));
      await remove(ref(db, `friendships/${fromUserId}/outgoing/${currentUser.uid}`));
      return true;
    } catch (error) {
      console.error('Ошибка отклонения заявки:', error);
      return false;
    }
  };

  const removeFriend = async (friendId) => {
    if (!currentUser) return false;
    
    try {
      await remove(ref(db, `friendships/${currentUser.uid}/friends/${friendId}`));
      await remove(ref(db, `friendships/${friendId}/friends/${currentUser.uid}`));
      return true;
    } catch (error) {
      console.error('Ошибка удаления друга:', error);
      return false;
    }
  };

  return (
    <FriendsContext.Provider value={{
      friends,
      incomingRequests,
      outgoingRequests,
      allUsers,
      friendsMoodEntries,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend
    }}>
      {children}
    </FriendsContext.Provider>
  );
};