import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, onValue, update, remove } from 'firebase/database';

export const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({ totalUsers: 0, totalEntries: 0 });

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersList = Object.entries(data).map(([uid, userData]) => ({
        id: uid,
        email: userData.email || 'нет email',
        name: userData.name || userData.email?.split('@')[0] || uid.slice(0, 6),
        role: userData.role || 'user',
        isBanned: userData.isBanned || false,
        createdAt: userData.createdAt
      }));
      console.log('📋 Загружены пользователи:', usersList);
      setUsers(usersList);
      setStats(prev => ({ ...prev, totalUsers: usersList.length }));
    });

    const moodsRef = ref(db, 'moods');
    const unsubscribeMoods = onValue(moodsRef, (snapshot) => {
      const data = snapshot.val() || {};
      let total = 0;
      Object.values(data).forEach(userMoods => {
        total += Object.keys(userMoods || {}).length;
      });
      setStats(prev => ({ ...prev, totalEntries: total }));
    });

    const complaintsRef = ref(db, 'complaints');
    const unsubscribeComplaints = onValue(complaintsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const complaintsList = Object.entries(data).map(([id, complaint]) => ({
        id,
        ...complaint
      }));
      setComplaints(complaintsList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeMoods();
      unsubscribeComplaints();
    };
  }, []);

  // Блокировка/разблокировка пользователя
  const toggleUserBan = async (userId, currentStatus) => {
    console.log('🔒 toggleUserBan вызван:', { userId, currentStatus });
    
    try {
      const userRef = ref(db, `users/${userId}`);
      const newStatus = !currentStatus;
      
      await update(userRef, { 
        isBanned: newStatus,
        bannedAt: newStatus ? Date.now() : null,
        bannedReason: newStatus ? 'Заблокирован администратором' : null
      });
      
      console.log(`✅ Пользователь ${newStatus ? 'заблокирован' : 'разблокирован'}`);
      
      // Обновляем локальное состояние
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, isBanned: newStatus }
            : user
        )
      );
      
      alert(newStatus ? '🔒 Пользователь заблокирован' : '🔓 Пользователь разблокирован');
    } catch (error) {
      console.error('❌ Ошибка при блокировке:', error);
      alert('Ошибка при изменении статуса пользователя');
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await update(ref(db, `users/${userId}`), { role: newRole });
      console.log(`✅ Роль пользователя изменена на ${newRole}`);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        )
      );
    } catch (error) {
      console.error('Ошибка изменения роли:', error);
      alert('Ошибка при изменении роли');
    }
  };

  const deleteComplaint = async (complaintId) => {
    await remove(ref(db, `complaints/${complaintId}`));
  };

  const deleteMoodEntry = async (userId, date) => {
    if (window.confirm('Удалить эту запись?')) {
      await remove(ref(db, `moods/${userId}/${date}`));
      alert('Запись удалена');
    }
  };

  const currentUserRole = auth.currentUser ? users.find(u => u.id === auth.currentUser.uid)?.role : null;
  
  if (currentUserRole !== 'admin') {
    return <div className="admin-panel-access-denied">⛔ Доступ запрещен. Только для администраторов.</div>;
  }

  return (
    <div className="admin-panel">
      <h1>👑 Административная панель</h1>
      
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="stat-value">{stats.totalUsers}</span>
          <span className="stat-label">Пользователей</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{stats.totalEntries}</span>
          <span className="stat-label">Записей настроения</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{complaints.length}</span>
          <span className="stat-label">Жалоб</span>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          👥 Пользователи
        </button>
        <button className={`admin-tab ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => setActiveTab('complaints')}>
          ⚠️ Жалобы ({complaints.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-users-table">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className={user.isBanned ? 'banned-user' : ''}>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>
                      <select 
                        value={user.role} 
                        onChange={(e) => changeUserRole(user.id, e.target.value)}
                        disabled={user.id === auth.currentUser?.uid}
                      >
                        <option value="user">Пользователь</option>
                        <option value="admin">Администратор</option>
                      </select>
                      {user.id === auth.currentUser?.uid && <span className="current-user-badge"> (вы)</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${user.isBanned ? 'banned' : 'active'}`}>
                        {user.isBanned ? '🔒 Заблокирован' : '✅ Активен'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => toggleUserBan(user.id, user.isBanned)} 
                        className={user.isBanned ? 'unban-btn' : 'ban-btn'}
                        disabled={user.id === auth.currentUser?.uid}
                      >
                        {user.isBanned ? '🔓 Разблокировать' : '🔒 Заблокировать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="admin-complaints">
          {complaints.length === 0 ? (
            <div className="empty-state">
              <p>✅ Нет активных жалоб</p>
            </div>
          ) : (
            complaints.map(complaint => (
              <div key={complaint.id} className="complaint-card">
                <div className="complaint-header">
                  <span>👤 От: {complaint.fromUserEmail || complaint.fromUserId}</span>
                  <span>📅 {new Date(complaint.timestamp).toLocaleString()}</span>
                </div>
                <div className="complaint-body">
                  <p><strong>Причина:</strong> {complaint.reason}</p>
                  <p><strong>На пользователя:</strong> {complaint.targetUserId}</p>
                  <p><strong>Дата записи:</strong> {complaint.targetDate}</p>
                </div>
                <div className="complaint-actions">
                  <button onClick={() => deleteMoodEntry(complaint.targetUserId, complaint.targetDate)} className="delete-mood-btn">
                    🗑️ Удалить запись
                  </button>
                  <button onClick={() => {
                    toggleUserBan(complaint.targetUserId, false);
                    deleteComplaint(complaint.id);
                  }} className="ban-user-btn">
                    🔒 Заблокировать пользователя
                  </button>
                  <button onClick={() => deleteComplaint(complaint.id)} className="resolve-btn">
                    ✅ Закрыть жалобу
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};