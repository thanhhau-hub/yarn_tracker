import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useBoard } from '../../hooks/useBoard';
import { AreaWithCount } from '../../types';

/**
 * Board View — Home Screen
 * Shows a grid of all areas with the count of yarn rolls in each.
 * This is the digital replacement for the physical whiteboard.
 * Tapping an area navigates to Area Detail.
 */
export default function BoardScreen() {
  const router = useRouter();
  const { areas, loading, refetch } = useBoard();

  function handleAreaPress(area: AreaWithCount) {
    router.push(`/area/${area.id}`);
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  function getAreaColor(count: number) {
    if (count === 0) return '#f0fdf4'; // empty → light green
    if (count <= 3) return '#fefce8'; // few yarns → light yellow
    return '#fef2f2';                 // many yarns → light red
  }

  function renderArea({ item }: { item: AreaWithCount }) {
    return (
      <TouchableOpacity
        style={[styles.areaCard, { backgroundColor: getAreaColor(item.yarn_count) }]}
        onPress={() => handleAreaPress(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.areaCode}>{item.code}</Text>
        <Text style={styles.yarnCount}>{item.yarn_count}</Text>
        <Text style={styles.yarnLabel}>
          {item.yarn_count === 1 ? 'yarn' : 'yarns'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧵 Yarn Board</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Tap an area to see its yarn rolls</Text>

      {/* Area Grid */}
      <FlatList
        data={areas}
        keyExtractor={(item) => item.id}
        renderItem={renderArea}
        numColumns={4}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading board...' : 'No areas found. Ask your admin to set up areas.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2e5c3e',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  logoutText: { color: '#d1e0d7', fontSize: 14 },
  hint: { textAlign: 'center', color: '#888', fontSize: 12, paddingVertical: 8 },
  grid: { padding: 8 },
  areaCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 70,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  areaCode: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  yarnCount: { fontSize: 18, fontWeight: '800', color: '#2e5c3e' },
  yarnLabel: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, padding: 24 },
});
