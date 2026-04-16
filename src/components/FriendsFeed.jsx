import React, { useState, useEffect } from 'react';
import { useFriends } from '../contexts/FriendsContext';
import { useReactions } from '../contexts/ReactionsContext';
import { auth, db } from '../firebase';
import { ref, onValue, push } from 'firebase/database';

export const FriendsFeed = () => {
  const { friends } = useFriends();
  const { addReaction, getReactionsCount, getUserReaction } = useReactions();
  const [friendsMoodEntries, setFriendsMoodEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const moods = [
    { value: 1, emoji: '😢', description: 'Очень плохо' },
    { value: 2, emoji: '😔', description: 'Плохо' },
    { value: 3, emoji: '😐', description: 'Нормально' },
    { value: 4, emoji: '😊', description: 'Хорошо' },
    { value: 5, emoji: '🤩', description: 'Отлично!' }
  ];

  // Функция отправки жалобы
  const handleComplaint = async (userId, date, userName) => {
    const reason = prompt(`Пожаловаться на запись пользователя ${userName} от ${new Date(date).toLocaleDateString('ru-RU')}\n\nУкажите причину жалобы:`);
    
    if (!reason || reason.trim() === '') {
      alert('Жалоба отменена или не указана причина');
      return;
    }
    
    try {
      const complaintsRef = ref(db, 'complaints');
      await push(complaintsRef, {
        fromUserId: auth.currentUser.uid,
        fromUserEmail: auth.currentUser.email,
        targetUserId: userId,
        targetDate: date,
        reason: reason,
        timestamp: Date.now(),
        status: 'pending'
      });
      alert('✅ Жалоба отправлена администратору');
    } catch (error) {
      console.error('Ошибка отправки жалобы:', error);
      alert('❌ Ошибка при отправке жалобы');
    }
  };

  const handleReaction = async (userId, date, type) => {
    console.log('🖱️ Нажата реакция:', { userId, date, type });
    const result = await addReaction(userId, date, type);
    console.log('📊 Результат:', result);
  };

  // Загрузка записей друзей
  useEffect(() => {
    if (!friends || friends.length === 0) {
      setFriendsMoodEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const allUnsubscribes = [];

    friends.forEach(friend => {
      if (!friend.id) return;
      
      const moodsRef = ref(db, `moods/${friend.id}`);
      const unsubscribe = onValue(moodsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const friendEntries = Object.entries(data)
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .map(([date, moodData]) => ({
            id: `${friend.id}_${date}`,
            userId: friend.id,
            userName: friend.name || friend.email?.split('@')[0] || 'Друг',
            userEmail: friend.email,
            date,
            mood: moodData.mood,
            note: moodData.note,
            timestamp: moodData.timestamp,
            reactions: moodData.reactions || {}
          }));
        
        setFriendsMoodEntries(prev => {
          const otherEntries = prev.filter(e => e.userId !== friend.id);
          const newList = [...otherEntries, ...friendEntries];
          newList.sort((a, b) => b.timestamp - a.timestamp);
          return newList;
        });
        
        setLoading(false);
      });
      
      allUnsubscribes.push(unsubscribe);
    });
    
    return () => {
      allUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [friends]);

  const filteredEntries = filter === 'all' 
    ? friendsMoodEntries 
    : friendsMoodEntries.filter(e => e.mood === parseInt(filter));

  if (loading) {
    return (
      <div className="friends-feed">
        <div className="feed-header">
          <h2>📱 Лента друзей</h2>
        </div>
        <div className="feed-loading">Загрузка записей друзей...</div>
      </div>
    );
  }

  return (
    <div className="friends-feed">
      <div className="feed-header">
        <h2>📱 Лента друзей</h2>
        <div className="feed-filter">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Все</button>
          <button className={filter === '5' ? 'active' : ''} onClick={() => setFilter('5')}>🤩 Отлично</button>
          <button className={filter === '4' ? 'active' : ''} onClick={() => setFilter('4')}>😊 Хорошо</button>
          <button className={filter === '1' ? 'active' : ''} onClick={() => setFilter('1')}>😢 Плохо</button>
        </div>
      </div>

      <div className="feed-list">
        {filteredEntries.length === 0 ? (
          <div className="feed-empty">
            <p>😔 Пока нет записей от друзей</p>
            <p>Добавь друзей, чтобы видеть их настроение в ленте!</p>
          </div>
        ) : (
          filteredEntries.map(entry => {
            const mood = moods.find(m => m.value === entry.mood);
            const reactionsCount = getReactionsCount(entry.reactions);
            const userReaction = getUserReaction(entry.reactions);
            
            return (
              <div key={entry.id} className="feed-card">
                <div className="feed-card-header">
                  <div className="user-info">
                    <span className="user-avatar">👤</span>
                    <span className="user-name">{entry.userName}</span>
                  </div>
                  <div className="entry-date">
                    {new Date(entry.date).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                
                <div className="feed-card-mood">
                  <span className="mood-emoji-large">{mood.emoji}</span>
                  <span className="mood-description">{mood.description}</span>
                </div>
                
                {entry.note && (
                  <div className="feed-card-note">
                    <p>"{entry.note}"</p>
                  </div>
                )}
                
                <div className="feed-card-reactions">
                  <button 
                    className={`reaction-btn ${userReaction === 'like' ? 'active' : ''}`}
                    onClick={() => handleReaction(entry.userId, entry.date, 'like')}
                  >
                    👍 {reactionsCount.like > 0 && reactionsCount.like}
                  </button>
                  <button 
                    className={`reaction-btn ${userReaction === 'heart' ? 'active' : ''}`}
                    onClick={() => handleReaction(entry.userId, entry.date, 'heart')}
                  >
                    ❤️ {reactionsCount.heart > 0 && reactionsCount.heart}
                  </button>
                  <button 
                    className={`reaction-btn ${userReaction === 'sad' ? 'active' : ''}`}
                    onClick={() => handleReaction(entry.userId, entry.date, 'sad')}
                  >
                    😢 {reactionsCount.sad > 0 && reactionsCount.sad}
                  </button>
                  
                  {/* КНОПКА ЖАЛОБЫ */}
                  <button 
                    className="complaint-btn"
                    onClick={() => handleComplaint(entry.userId, entry.date, entry.userName)}
                    title="Пожаловаться на запись"
                  >
                    ⚠️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};