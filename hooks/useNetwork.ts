import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // Native platforms use NetInfo
      const unsubscribe = NetInfo.addEventListener((state) => {
        setIsOnline(state.isConnected ?? true);
      });
      
      // Initial fetch for native
      NetInfo.fetch().then((state) => {
        setIsOnline(state.isConnected ?? true);
      });

      return () => unsubscribe();
    }
  }, []);

  return { isOnline };
}
