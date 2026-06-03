import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useYarn } from '../../hooks/useYarn';
import { MoveLog } from '../../types';

/**
 * LOT History Screen
 * Shows the full movement history of a single LOT.
 * Route: /yarn/[id]
 */
export default function YarnHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { yarn, history, loading } = useYarn(id);

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function renderLog({ item, index }: { item: MoveLog; index: number }) {
    const isFirst = index === 0;
    const fromCode = (item as any).from_area?.code ?? 'Outside';
    const toCode = (item as any).to_area?.code ?? 'Removed';

    return (
      <View style={[styles.logItem, isFirst && styles.logItemFirst]}>
        <View style={styles.logDot} />
        <View style={styles.logContent}>
          <Text style={styles.logMove}>
            {fromCode} → {toCode}
          </Text>
          {item.note && <Text style={styles.logNote}>{item.note}</Text>}
          <Text style={styles.logTime}>{formatDate(item.moved_at)}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!yarn) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>LOT not found.</Text>
      </View>
    );
  }

  // Clean the LOT number for display
  const cleanedLot = yarn.yarn_code.replace(/-\d+$/, '');

  return (
    <View style={styles.container}>
      {/* LOT Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.lotCode}>LOT: {cleanedLot}</Text>
        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              📍 {(yarn as any).areas?.code ?? 'Not on floor'}
            </Text>
          </View>
        </View>
      </View>

      {/* Movement Timeline */}
      <Text style={styles.historyTitle}>Movement History</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.timeline}
        ListEmptyComponent={
          <Text style={styles.empty}>No movement history yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { color: '#94a3b8', fontSize: 16 },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  lotCode: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    padding: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeline: { paddingHorizontal: 16, paddingBottom: 32 },
  logItem: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
    marginLeft: 8,
    paddingLeft: 16,
  },
  logItemFirst: { borderLeftColor: '#0f172a' },
  logDot: {
    position: 'absolute',
    left: -5,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f172a',
  },
  logContent: {},
  logMove: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  logNote: { fontSize: 12, color: '#64748b', marginTop: 2 },
  logTime: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 24 },
});
