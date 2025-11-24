import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GamificationState {
  streak: number;
  totalVideos: number;
  xp: number;
  level: number;
  todayCompleted: number;
  lastCompletionDate: string | null;
}

interface GamificationContextType extends GamificationState {
  incrementVideoCount: () => Promise<void>;
  getTodayProgress: () => number;
  getNextLevelXP: () => number;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GamificationState>({
    streak: 0,
    totalVideos: 0,
    xp: 0,
    level: 1,
    todayCompleted: 0,
    lastCompletionDate: null,
  });

  useEffect(() => {
    loadState();
  }, []);

  async function loadState() {
    try {
      const saved = await AsyncStorage.getItem('gamification');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Check if streak should reset
        const today = new Date().toDateString();
        const lastDate = parsed.lastCompletionDate;
        
        if (lastDate) {
          const lastCompletion = new Date(lastDate);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          // Reset streak if more than 1 day gap
          if (lastCompletion.toDateString() !== today && 
              lastCompletion.toDateString() !== yesterday.toDateString()) {
            parsed.streak = 0;
          }
          
          // Reset today's count if new day
          if (lastDate !== today) {
            parsed.todayCompleted = 0;
          }
        }
        
        setState(parsed);
      }
    } catch (error) {
      console.error('Failed to load gamification state:', error);
    }
  }

  async function saveState(newState: GamificationState) {
    try {
      await AsyncStorage.setItem('gamification', JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      console.error('Failed to save gamification state:', error);
    }
  }

  async function incrementVideoCount() {
    const today = new Date().toDateString();
    const isNewDay = state.lastCompletionDate !== today;
    
    const newState = {
      ...state,
      totalVideos: state.totalVideos + 1,
      xp: state.xp + 50, // 50 XP per video
      todayCompleted: isNewDay ? 1 : state.todayCompleted + 1,
      streak: isNewDay ? state.streak + 1 : state.streak,
      lastCompletionDate: today,
    };
    
    // Level up every 500 XP
    newState.level = Math.floor(newState.xp / 500) + 1;
    
    await saveState(newState);
  }

  function getTodayProgress() {
    // Goal: 5 videos per day
    return Math.min((state.todayCompleted / 5) * 100, 100);
  }

  function getNextLevelXP() {
    return state.level * 500;
  }

  return (
    <GamificationContext.Provider
      value={{
        ...state,
        incrementVideoCount,
        getTodayProgress,
        getNextLevelXP,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider');
  }
  return context;
}

