import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRole } from '../../hooks/useRole';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Tab navigation layout.
 * 
 * Dynamically shows/hides tabs based on user role:
 * - Admin/Supervisor: Board, History, Manage
 * - Worker/Guest:     Board, History
 *
 * Add Lot is handled via popup modal when tapping an empty rack cell.
 */
export default function TabLayout() {
  const { role, loading } = useRole();
  const insets = useSafeAreaInsets();

  // Do not conditionally return a View here! It breaks Expo Router.
  // The layout must always return the <Tabs> component.

  const isAdmin = role === 'admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1b4d3e',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        headerStyle: { backgroundColor: '#1b4d3e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerLeft: ({ canGoBack }) => {
          return (
            <Ionicons
              name="arrow-back"
              size={24}
              color="#fff"
              style={{ marginLeft: 16 }}
              onPress={() => {
                const router = require('expo-router').router;
                if (canGoBack) {
                  router.back();
                } else {
                  router.push('/');
                }
              }}
            />
          );
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Board',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          headerTitle: 'Warehouse History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Admin tab: only visible to Supervisors/Admins */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Manage',
          headerTitle: 'Management Dashboard',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens – still routable but not in tab bar */}
      <Tabs.Screen
        name="search"
        options={{ href: null }}
      />
    </Tabs>
  );
}
