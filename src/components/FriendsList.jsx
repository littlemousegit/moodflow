import React, { useState } from 'react';
import { useFriends } from '../contexts/FriendsContext';

export const FriendsList = () => {
  const { 
    friends, 
    incomingRequests, 
    outgoingRequests,
    allUsers, 
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
  } = useFriends();
  
  const [activeTab, setActiveTab] = useState('friends');
  const [searchTerm, setSearchTerm] = useState('');

  // Отладка - смотрим что пришло из контекста
  console.log('🔍 allUsers в FriendsList:', allUsers);
  console.log('🔍 friends в FriendsList:', friends);
  console.log('🔍 incomingRequests в FriendsList:', incomingRequests);

  // ФИЛЬТРАЦИЯ - только по email (объявляем ДО использования)
  const filteredUsers = allUsers.filter(user => 
    user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('🔍 searchTerm:', searchTerm);
  console.log('🔍 filteredUsers:', filteredUsers);

  const isFriend = (userId) => friends.some(f => f?.id === userId);
  const hasOutgoingRequest = (userId) => outgoingRequests?.some(r => r?.toUserId === userId);
  const hasIncomingRequest = (userId) => incomingRequests?.some(r => r?.fromUserId === userId);

  return (
    <div className="friends-list-container">
      <h2>👥 Друзья</h2>
      
      <div className="friends-tabs">
        <button className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
          👥 Друзья ({friends.length})
        </button>
        <button className={`friends-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          📨 Заявки ({incomingRequests.length})
        </button>
        <button className={`friends-tab ${activeTab === 'find' ? 'active' : ''}`} onClick={() => setActiveTab('find')}>
          🔍 Найти друзей
        </button>
      </div>

      {activeTab === 'friends' && (
        <div className="friends-list">
          {friends.length === 0 ? (
            <div className="empty-state">
              <p>😔 У вас пока нет друзей</p>
              <p>Найдите друзей во вкладке "Найти друзей"</p>
            </div>
          ) : (
            friends.map(friend => (
              <div key={friend.id} className="friend-card">
                <div className="friend-info">
                  <span className="friend-avatar">👤</span>
                  <div>
                    <div className="friend-name">{friend.name || friend.email}</div>
                    <div className="friend-email">{friend.email}</div>
                  </div>
                </div>
                <button onClick={() => removeFriend(friend.id)} className="remove-friend-btn">
                  🗑️ Удалить
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="requests-list">
          {incomingRequests.length === 0 ? (
            <div className="empty-state">
              <p>📭 Нет входящих заявок</p>
            </div>
          ) : (
            incomingRequests.map(request => (
              <div key={request.id} className="request-card">
                <div className="request-info">
                  <span className="request-avatar">👤</span>
                  <div>
                    <div className="request-name">{request.user?.name || request.user?.email || request.id}</div>
                    <div className="request-email">{request.user?.email}</div>
                  </div>
                </div>
                <div className="request-actions">
                  <button onClick={() => acceptFriendRequest(request.fromUserId)} className="accept-btn">
                    ✅ Принять
                  </button>
                  <button onClick={() => rejectFriendRequest(request.fromUserId)} className="reject-btn">
                    ❌ Отклонить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'find' && (
        <div className="find-friends">
          <input 
            type="text" 
            placeholder="🔍 Поиск по email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <div className="users-list">
            {filteredUsers.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? (
                  <p>🔍 Пользователь с email "{searchTerm}" не найден</p>
                ) : (
                  <p>🔍 Введите email для поиска пользователей</p>
                )}
              </div>
            ) : (
              filteredUsers.map(user => {
                const isAlreadyFriend = isFriend(user.id);
                const requestSent = hasOutgoingRequest(user.id);
                const requestReceived = hasIncomingRequest(user.id);
                
                return (
                  <div key={user.id} className="user-card">
                    <div className="user-info">
                      <span className="user-avatar">👤</span>
                      <div>
                        <div className="user-name">{user.name || user.email?.split('@')[0]}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                    
                    {isAlreadyFriend ? (
                      <span className="friend-badge">✓ Друг</span>
                    ) : requestSent ? (
                      <span className="pending-badge">⏳ Заявка отправлена</span>
                    ) : requestReceived ? (
                      <div className="request-buttons">
                        <button onClick={() => acceptFriendRequest(user.id)} className="accept-btn">Принять</button>
                        <button onClick={() => rejectFriendRequest(user.id)} className="reject-btn">Отклонить</button>
                      </div>
                    ) : (
                      <button onClick={() => sendFriendRequest(user.id)} className="add-friend-btn">
                        ➕ Добавить в друзья
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};