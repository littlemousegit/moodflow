import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';

export const YearlyHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    
    const loadYearlyData = async () => {
      setLoading(true);
      const moodsRef = ref(db, `moods/${currentUser.uid}`);
      const snapshot = await get(moodsRef);
      const data = snapshot.val() || {};
      
      const moodByDate = {};
      Object.entries(data).forEach(([date, moodData]) => {
        if (date >= `${selectedYear}-01-01` && date <= `${selectedYear}-12-31`) {
          moodByDate[date] = moodData.mood;
        }
      });
      
      setHeatmapData(moodByDate);
      setLoading(false);
    };
    
    loadYearlyData();
  }, [currentUser, selectedYear]);

  const getColorForMood = (mood) => {
    if (mood === undefined) return '#ebedf0';
    switch(mood) {
      case 1: return '#ef4444';
      case 2: return '#f97316';
      case 3: return '#eab308';
      case 4: return '#84cc16';
      case 5: return '#22c55e';
      default: return '#ebedf0';
    }
  };

  // Получить все дни года, сгруппированные по неделям
  const getWeeksData = () => {
    const weeks = [];
    let currentWeek = [];
    
    // Первый день года
    const firstDay = new Date(selectedYear, 0, 1);
    const lastDay = new Date(selectedYear, 11, 31);
    
    // Определяем день недели первого дня (0 = воскресенье, превращаем в понедельник как первый)
    let firstDayOfWeek = firstDay.getDay();
    let startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Добавляем пустые дни в начало
    for (let i = 0; i < startOffset; i++) {
      currentWeek.push({ date: null, mood: null, empty: true });
    }
    
    // Проходим по всем дням года
    const currentDate = new Date(firstDay);
    while (currentDate <= lastDay) {
      const dateStr = currentDate.toISOString().split('T')[0];
      currentWeek.push({
        date: dateStr,
        mood: heatmapData[dateStr],
        empty: false
      });
      
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Добавляем пустые дни в конец последней недели
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: null, mood: null, empty: true });
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  // Получить позиции месяцев для отображения
  const getMonthPositions = () => {
    const positions = [];
    const weeks = getWeeksData();
    
    for (let month = 0; month < 12; month++) {
      const firstDayOfMonth = new Date(selectedYear, month, 1);
      const dateStr = firstDayOfMonth.toISOString().split('T')[0];
      
      // Находим в какой неделе находится первый день месяца
      let weekIndex = 0;
      let dayIndex = 0;
      let found = false;
      
      for (let w = 0; w < weeks.length && !found; w++) {
        for (let d = 0; d < weeks[w].length; d++) {
          if (weeks[w][d].date === dateStr) {
            weekIndex = w;
            dayIndex = d;
            found = true;
            break;
          }
        }
      }
      
      if (found) {
        positions.push({
          month: month,
          weekIndex: weekIndex,
          offset: dayIndex * 18 // примерно 18px на день
        });
      }
    }
    
    return positions;
  };

  const weeks = getWeeksData();
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthPositions = getMonthPositions();

  if (loading) {
    return (
      <div className="yearly-heatmap">
        <div className="heatmap-header">
          <h3>📅 Тепловая карта активности за {selectedYear} год</h3>
          <div className="year-selector">
            <button onClick={() => setSelectedYear(prev => prev - 1)}>◀</button>
            <span>{selectedYear}</span>
            <button onClick={() => setSelectedYear(prev => prev + 1)}>▶</button>
          </div>
        </div>
        <div className="loading">Загрузка данных...</div>
      </div>
    );
  }

  const totalEntries = Object.keys(heatmapData).length;
  const avgMood = totalEntries > 0 
    ? (Object.values(heatmapData).reduce((a, b) => a + b, 0) / totalEntries).toFixed(1)
    : 0;

  return (
    <div className="yearly-heatmap">
      <div className="heatmap-header">
        <h3>📅 Тепловая карта активности за {selectedYear} год</h3>
        <div className="year-selector">
          <button onClick={() => setSelectedYear(prev => prev - 1)}>◀</button>
          <span>{selectedYear}</span>
          <button onClick={() => setSelectedYear(prev => prev + 1)}>▶</button>
        </div>
      </div>
      
      <div className="heatmap-wrapper">
        <div className="heatmap-layout">
          {/* Строка с месяцами */}
          <div className="heatmap-months-row">
            {monthPositions.map((pos, idx) => (
              <div 
                key={idx}
                className="heatmap-month-label"
                style={{ left: `${pos.weekIndex * 18 + pos.offset + 35}px` }}
              >
                {pos.name}
              </div>
            ))}
          </div>
          
          {/* Основная часть */}
          <div className="heatmap-body">
            {/* Колонка с днями недели */}
            <div className="heatmap-weekdays-col">
              {weekdays.map(day => (
                <div key={day} className="heatmap-weekday">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Сетка недель */}
            <div className="heatmap-weeks">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="heatmap-week">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="heatmap-day-cell"
                      style={{ 
                        backgroundColor: day.empty ? 'transparent' : getColorForMood(day.mood)
                      }}
                      title={day.date ? `${day.date}: ${day.mood ? `Настроение ${day.mood}/5` : 'Нет записи'}` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Легенда */}
      <div className="heatmap-legend">
        <span>😢 Плохо</span>
        <div className="legend-scale">
          <div className="legend-colors">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }} title="Очень плохо (1)" />
            <div className="legend-color" style={{ backgroundColor: '#f97316' }} title="Плохо (2)" />
            <div className="legend-color" style={{ backgroundColor: '#eab308' }} title="Нормально (3)" />
            <div className="legend-color" style={{ backgroundColor: '#84cc16' }} title="Хорошо (4)" />
            <div className="legend-color" style={{ backgroundColor: '#22c55e' }} title="Отлично (5)" />
            <div className="legend-color" style={{ backgroundColor: '#ebedf0' }} title="Нет записи" />
          </div>
        </div>
        <span>🤩 Отлично</span>
      </div>
      
      {/* Статистика */}
      <div className="heatmap-stats">
        <p>✅ Всего записей: {totalEntries}</p>
        <p>📈 Среднее настроение: {avgMood} / 5</p>
        <p>📅 Дней с начала года: {Math.floor((new Date() - new Date(selectedYear, 0, 1)) / (1000 * 60 * 60 * 24))}</p>
      </div>
      
      <p className="heatmap-note">
        💡 Каждый день — это цветная ячейка. Чем лучше настроение, тем ярче зелёный цвет!
      </p>
    </div>
  );
};