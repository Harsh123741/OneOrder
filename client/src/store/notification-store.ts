import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PriceNotification } from '@/components/notifications/notification-center';

// Helper to ensure dates are properly handled in persistence
const serializeNotification = (notification: PriceNotification): PriceNotification => ({
  ...notification,
  timestamp: notification.timestamp instanceof Date ? notification.timestamp.toISOString() : notification.timestamp
});

const deserializeNotification = (notification: PriceNotification): PriceNotification => ({
  ...notification,
  timestamp: typeof notification.timestamp === 'string' ? new Date(notification.timestamp) : notification.timestamp
});

interface NotificationState {
  notifications: PriceNotification[];
  addNotification: (notification: Omit<PriceNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      
      addNotification: (notificationData) => {
        const notification: PriceNotification = {
          ...notificationData,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          isRead: false,
        };
        
        set((state) => ({
          notifications: [notification, ...state.notifications.slice(0, 49)] // Keep only latest 50
        }));
      },
      
      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        }));
      },
      
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true }))
        }));
      },
      
      clearAll: () => {
        set({ notifications: [] });
      },
      
      getUnreadCount: () => {
        return get().notifications.filter(n => !n.isRead).length;
      },
    }),
    {
      name: 'skylink-notifications',
      version: 1,
    }
  )
);