'use client';

import {
  createContext, useContext, useState,
  useCallback, useEffect,
} from 'react';

export type NotificationType = 'OUTBID' | 'WATCHED_BID' | 'MARKET' | 'SYSTEM';

export interface Notification {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  timestamp: number;
  read:      boolean;
}

interface NotificationContextValue {
  notifications:  Notification[];
  unreadCount:    number;
  addNotification: (type: NotificationType, title: string, body: string) => void;
  markAllRead:    () => void;
  clearAll:       () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = 'auction_terminal_notifications';
const MAX_STORED  = 50; // cap so localStorage never bloats

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setNotifications(JSON.parse(stored));
    } catch { /* silent */ }
  }, []);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_STORED)));
    } catch { /* silent */ }
  }, [notifications]);

  const addNotification = useCallback((
    type:  NotificationType,
    title: string,
    body:  string,
  ) => {
    const next: Notification = {
      id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      body,
      timestamp: Date.now(),
      read:      false,
    };
    // Prepend — newest first, cap at MAX_STORED
    setNotifications(prev => [next, ...prev].slice(0, MAX_STORED));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}