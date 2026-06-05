import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useYarn } from '../../hooks/useYarn';
import { MoveLog } from '../../types';
import { Ionicons } from '@expo/vector-icons';

/**
 * LOT History Screen
 * Shows the full movement history of a single LOT.
 * Route: /yarn/[id]
 */
export default function YarnHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { yarn, history, loading } = useYarn(id);

  function formatDate(isoString: string) {
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  }

  /** Parse the JSON-encoded note field safely */
  function parseNote(note: string | null) {
    let action = 'MOVE';
    let operator = 'Operator';
    let details = '';

    if (note) {
      const trimmed = note.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.action) action = parsed.action;
          if (parsed.operator) operator = parsed.operator;
          if (parsed.details) details = parsed.details;
        } catch {
          details = note;
        }
      } else {
        details = note;
      }
    }
    if (action === 'Added') action = 'CREATE';
    if (action === 'Moved') action = 'MOVE';
    if (action === 'Deleted') action = 'DELETE';
    if (action === 'Edited') action = 'EDIT';
    return { action, operator, details };
  }

  function getActionStyle(action: string) {
    switch (action) {
      case 'CREATE':
        return { bg: '#e8f5e9', color: '#2e7d32', icon: 'add-circle-outline' as const };
      case 'MOVE':
        return { bg: '#e3f2fd', color: '#1565c0', icon: 'swap-horizontal-outline' as const };
      case 'DELETE':
        return { bg: '#ffebee', color: '#c62828', icon: 'trash-outline' as const };
      case 'EDIT':
        return { bg: '#fff8e1', color: '#f57f17', icon: 'create-outline' as const };
      default:
        return { bg: '#f5f5f5', color: '#616161', icon: 'help-circle-outline' as const };
    }
  }

  function renderLog({ item }: { item: MoveLog }) {
    const fromCode = item.from_area_code ?? null;
    const toCode = item.to_area_code ?? null;
    const { action, operator, details } = parseNote(item.note);

    // Fallback: infer action from areas if no note
    let resolvedAction = item.action || action;
    if (!item.note && !fromCode && toCode) resolvedAction = 'CREATE';
    else if (!item.note && fromCode && !toCode) resolvedAction = 'DELETE';
    const resolvedStyle = getActionStyle(resolvedAction);

    return (
      <View style={styles.logCard}>
        {/* Card Header */}
        <View style={styles.logHeader}>
          <View style={[styles.actionBadge, { backgroundColor: resolvedStyle.bg }]}>
            <Ionicons name={resolvedStyle.icon} size={13} color={resolvedStyle.color} style={{ marginRight: 4 }} />
            <Text style={[styles.actionBadgeText, { color: resolvedStyle.color }]}>{resolvedAction}</Text>
          </View>
          <Text style={styles.logTime}>{formatDate(item.moved_at)}</Text>
        </View>

        {/* Movement Arrow */}
        {(fromCode || toCode) && (
          <View style={styles.movementRow}>
            <View style={styles.locationPill}>
              <Text style={styles.locationText}>{fromCode ?? '—'}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color="#94a3b8" style={{ marginHorizontal: 6 }} />
            <View style={styles.locationPill}>
              <Text style={styles.locationText}>{toCode ?? '—'}</Text>
            </View>
          </View>
        )}

        {/* Details */}
        {details.trim().length > 0 && (
          <Text style={styles.logDetails}>{details}</Text>
        )}

        {/* Operator */}
        <View style={styles.operatorRow}>
          <Ionicons name="person-circle-outline" size={13} color="#94a3b8" style={{ marginRight: 3 }} />
          <Text style={styles.operatorText}>{operator}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1b4d3e" />
      </View>
    );
  }

  if (!yarn) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
        <Text style={styles.notFound}>LOT not found.</Text>
      </View>
    );
  }

  const cleanedLot = yarn.yarn_code.replace(/-\d+$/, '');
  const currentArea = (yarn as any).areas?.code ?? null;

  return (
    <View style={styles.container}>
      {/* LOT Info Banner */}
      <View style={styles.infoCard}>
        <Text style={styles.lotCode}>LOT: {cleanedLot}</Text>
        <View style={styles.metaRow}>
          {currentArea ? (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={13} color="#1b4d3e" style={{ marginRight: 4 }} />
              <Text style={styles.locationBadgeText}>Currently in {currentArea}</Text>
            </View>
          ) : (
            <View style={[styles.locationBadge, styles.locationBadgeGrey]}>
              <Ionicons name="archive-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={[styles.locationBadgeText, { color: '#64748b' }]}>Not on floor</Text>
            </View>
          )}
          <Text style={styles.historyCount}>{history.length} event{history.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Back to Board Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
        <Ionicons name="grid-outline" size={15} color="#1b4d3e" style={{ marginRight: 6 }} />
        <Text style={styles.backButtonText}>Back to Board</Text>
      </TouchableOpacity>

      {/* Timeline Section Label */}
      <Text style={styles.sectionLabel}>Movement History</Text>

      {/* History List */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.timeline}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No movement history yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFound: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },

  // LOT info banner
  infoCard: {
    backgroundColor: '#1b4d3e',
    padding: 16,
  },
  lotCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locationBadgeGrey: {
    backgroundColor: '#f1f5f9',
  },
  locationBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b4d3e',
  },
  historyCount: {
    fontSize: 12,
    color: '#a7f3d0',
    fontWeight: '600',
  },

  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backButtonText: {
    fontSize: 13,
    color: '#1b4d3e',
    fontWeight: '700',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },

  // Timeline cards
  timeline: { paddingHorizontal: 12, paddingBottom: 32 },
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#1b4d3e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationPill: {
    backgroundColor: '#f1f5f9',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  logDetails: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 6,
    lineHeight: 16,
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#f1f5f9',
    marginTop: 2,
  },
  operatorText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 10,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
