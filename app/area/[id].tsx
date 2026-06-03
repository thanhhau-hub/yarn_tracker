import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useArea } from '../../hooks/useArea';
import { YarnRoll } from '../../types';

/**
 * Area Detail Screen
 * Shows all LOTs currently stored in a specific area.
 * Workers can tap a LOT to view its history or move it.
 * Route: /area/[id]
 */
export default function AreaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { yarns, loading, refetch } = useArea(id);

  // Clean LOT number for display
  function cleanLot(code: string) {
    return code.replace(/-\d+$/, '');
  }

  function renderYarn({ item }: { item: YarnRoll }) {
    return (
      <TouchableOpacity
        style={styles.lotCard}
        onPress={() => router.push(`/yarn/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.lotLeft}>
          <Text style={styles.lotCode}>LOT: {cleanLot(item.yarn_code)}</Text>
        </View>
        <View style={styles.lotActions}>
          <TouchableOpacity
            style={styles.moveButton}
            onPress={() => router.push(`/move/${item.id}`)}
          >
            <Text style={styles.moveButtonText}>Move →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Count badge */}
      <View style={styles.countBanner}>
        <Text style={styles.countText}>
          {yarns.length} LOT{yarns.length !== 1 ? 's' : ''} in this area
        </Text>
      </View>

      <FlatList
        data={yarns}
        keyExtractor={(item) => item.id}
        renderItem={renderYarn}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'This area is empty.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  countBanner: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  countText: { color: '#0f172a', fontWeight: '600', fontSize: 14 },
  list: { padding: 16 },
  lotCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lotLeft: { flex: 1 },
  lotCode: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  lotActions: {},
  moveButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  moveButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
});
