import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistory, HistoryItem } from '../../hooks/useHistory';
import { useNetwork } from '../../hooks/useNetwork';
import DatePicker from '../../components/DatePicker';

/**
 * Warehouse History Screen
 * 
 * Displays log activities: CREATE, EDIT, and DELETE.
 * Dynamically adjusts UI based on the presence of COLOR and DESCRIPTION.
 */

export default function HistoryScreen() {
  const { isOnline } = useNetwork();
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 10) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const { logs, loading, loadingMore, hasMore, error, fetchHistory, fetchMoreHistory } = useHistory(fromDate, toDate);

  // Fetch mỗi khi tab được focus (bao gồm cả lần đầu mount)
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  // Refetch khi đổi date filter
  useEffect(() => {
    fetchHistory();
  }, [fromDate, toDate]);


  async function handleRefresh() {
    setRefreshing(true);
    await fetchHistory(true);
    setRefreshing(false);
  }

  function formatOperatorName(operator: string) {
    const trimmed = operator.trim();
    if (!trimmed || trimmed === 'Operator') return 'Operator';
    return trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  }

  function parseLogDetails(item: HistoryItem) {
    let action = 'EDIT';
    let operator = 'Operator';
    let details = '';
    let color = '';
    let des = '';
    let lotCode = '';

    let oldLot = '';
    let newLot = '';
    let oldColor = '';
    let newColor = '';
    let oldDes = '';
    let newDes = '';

    if (item.action) {
      action = item.action;
    } else if (!item.from_area_code && item.to_area_code) {
      action = 'CREATE';
    } else if (item.from_area_code && !item.to_area_code) {
      action = 'DELETE';
    }

    if (item.note) {
      const trimmedNote = item.note.trim();
      if (trimmedNote.startsWith('{') && trimmedNote.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedNote);
          if (parsed.action) action = parsed.action;
          if (parsed.operator) operator = parsed.operator;
          if (parsed.details) details = parsed.details;

          // Extract Old Values
          if (parsed.old && typeof parsed.old === 'object') {
            oldLot = cleanLot(parsed.old.lot || parsed.old.yarn_code || parsed.old.lotCode || '');
            oldColor = parsed.old.color || parsed.old.yarn_color || '';
            oldDes = parsed.old.des || parsed.old.description || parsed.old.yarn_description || '';
          } else {
            oldLot = cleanLot(parsed.old_lot || parsed.old_yarn_code || parsed.old_lot_code || parsed.oldLot || '');
            oldColor = parsed.old_color || parsed.old_yarn_color || parsed.oldColor || '';
            oldDes = parsed.old_des || parsed.old_description || parsed.old_yarn_description || parsed.oldDes || '';
          }

          // Extract New Values
          if (parsed.new && typeof parsed.new === 'object') {
            newLot = cleanLot(parsed.new.lot || parsed.new.yarn_code || parsed.new.lotCode || '');
            newColor = parsed.new.color || parsed.new.yarn_color || '';
            newDes = parsed.new.des || parsed.new.description || parsed.new.yarn_description || '';
          } else {
            newLot = cleanLot(parsed.lot || parsed.yarn_code || parsed.lotCode || parsed.new_lot || parsed.new_yarn_code || parsed.newLot || '');
            newColor = parsed.new_color || parsed.color || parsed.yarn_color || parsed.newColor || '';
            newDes = parsed.new_des || parsed.des || parsed.description || parsed.yarn_description || parsed.newDes || '';
          }
        } catch (e) {
          // Fallback
        }
      } else {
        details = item.note;
      }
    }

    const rawItem = item as any;
    
    // Fallbacks if not set in JSON note
    if (!newLot) newLot = cleanLot(rawItem.yarn_code || rawItem.lot || '');
    if (!newColor) newColor = rawItem.color || '';
    if (!newDes) newDes = rawItem.des || rawItem.description || '';

    color = newColor;
    des = newDes;
    lotCode = newLot;

    return { 
      action, 
      operator: formatOperatorName(operator), 
      details, 
      color, 
      des, 
      lotCode,
      oldLot,
      newLot,
      oldColor,
      newColor,
      oldDes,
      newDes
    };
  }

  function getActionBadge(action: string) {
    switch (action) {
      case 'CREATE':
        return { bg: '#e8f5e9', text: '#2e7d32', label: 'CREATE', icon: 'add-circle-outline' as const };
      case 'DELETE':
        return { bg: '#ffebee', text: '#c62828', label: 'DELETE', icon: 'trash-outline' as const };
      case 'EDIT':
      default:
        return { bg: '#e3f2fd', text: '#1565c0', label: 'EDIT', icon: 'create-outline' as const };
    }
  }

  function formatTime(isoString: string) {
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return isoString;
    }
  }

  function cleanLot(code: string | null | undefined) {
    if (!code) return '';
    return code.replace(/-\d+$/, '');
  }

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={14} color="#b45309" />
          <Text style={styles.offlineText}>Offline: Connection unstable, showing cached data.</Text>
        </View>
      )}

      {/* Date Filter */}
      <View style={styles.filterCard}>
        <View style={styles.dateInputWrapper}>
          <Text style={styles.dateLabel}>From:</Text>
          <TouchableOpacity style={styles.dateInputTouchable} onPress={() => setShowFromPicker(true)}>
            <Text style={[styles.dateInputText, !fromDate && styles.datePlaceholder]}>
              {fromDate ? formatDisplayDate(fromDate) : 'Start date'}
            </Text>
          </TouchableOpacity>
          {fromDate ? (
            <TouchableOpacity onPress={() => setFromDate('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.dateInputWrapper}>
          <Text style={styles.dateLabel}>To:</Text>
          <TouchableOpacity style={styles.dateInputTouchable} onPress={() => setShowToPicker(true)}>
            <Text style={[styles.dateInputText, !toDate && styles.datePlaceholder]}>
              {toDate ? formatDisplayDate(toDate) : 'End date'}
            </Text>
          </TouchableOpacity>
          {toDate ? (
            <TouchableOpacity onPress={() => setToDate('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => fetchHistory()}>
          <Ionicons name="search" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <DatePicker
        visible={showFromPicker}
        currentDate={fromDate}
        onClose={() => setShowFromPicker(false)}
        onSelect={(d) => { setFromDate(d); setShowFromPicker(false); }}
        title="Select Start Date"
        maxDate={toDate || undefined}
      />
      <DatePicker
        visible={showToPicker}
        currentDate={toDate}
        onClose={() => setShowToPicker(false)}
        onSelect={(d) => { setToDate(d); setShowToPicker(false); }}
        title="Select End Date"
        minDate={fromDate || undefined}
      />

      {loading && logs.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1b4d3e" />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1b4d3e']} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No activities logged yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { 
              action, operator, color, des, lotCode, 
              oldLot, newLot, oldColor, newColor, oldDes, newDes 
            } = parseLogDetails(item);
            const badge = getActionBadge(action);
            const fromLoc = item.from_area_code;
            const toLoc = item.to_area_code;

            return (
              <View style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Ionicons name={badge.icon} size={14} color={badge.text} style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.timeText}>{formatTime(item.moved_at)}</Text>
                </View>

                {/* Yarn Details Block */}
                {action === 'EDIT' ? (
                  /* EDIT: ô bo trước → sau */
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    {/* Ô TRƯỚC */}
                    <View style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8 }}>
                      <Text style={styles.miniLabel}>LOT CODE</Text>  
                      <Text style={[styles.lotValueText, { color: '#94a3b8', fontWeight: '600', fontSize: 16 }]}>{oldLot || lotCode || '—'}</Text>
                      {oldColor ? (
                        <View style={[styles.colorTag, { marginTop: 4 }]}>
                          <Ionicons name="color-palette-outline" size={10} color="#94a3b8" />
                          <Text style={[styles.colorTagText, { color: '#94a3b8' }]}>{oldColor}</Text>
                        </View>
                      ) : null}
                      {oldDes ? (
                        <View style={[styles.desTag, { marginTop: 2 }]}>
                          <Ionicons name="document-text-outline" size={10} color="#94a3b8" />
                          <Text style={[styles.desTagText, { color: '#94a3b8' }]} numberOfLines={1}>{oldDes}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Mũi tên */}
                    <Ionicons name="arrow-forward-outline" size={16} color="#94a3b8" />

                    {/* Ô SAU */}
                    <View style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8 }}>
                      <Text style={styles.miniLabel}>LOT CODE</Text>
                      <Text style={styles.lotValueText}>{newLot || lotCode || '—'}</Text>
                      {newColor ? (
                        <View style={[styles.colorTag, { marginTop: 4 }]}>
                          <Ionicons name="color-palette-outline" size={10} color="#475569" />
                          <Text style={styles.colorTagText}>{newColor}</Text>
                        </View>
                      ) : null}
                      {newDes ? (
                        <View style={[styles.desTag, { marginTop: 2 }]}>
                          <Ionicons name="document-text-outline" size={10} color="#475569" />
                          <Text style={styles.desTagText} numberOfLines={1}>{newDes}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  /* CREATE & DELETE: compact ngang */
                  <View style={styles.compactDetailsBlock}>
                    <View style={styles.compactLotSection}>
                      <Text style={styles.miniLabel}>LOT CODE</Text>
                      <Text style={styles.lotValueText}>{lotCode || 'N/A'}</Text>
                    </View>

                    {(color || des) ? <View style={styles.verticalSeparator} /> : null}

                    {(color || des) ? (
                      <View style={styles.compactMetaSection}>
                        {color ? (
                          <View style={styles.colorTag}>
                            <Ionicons name="color-palette-outline" size={11} color="#475569" />
                            <Text style={styles.colorTagText}>{color}</Text>
                          </View>
                        ) : null}
                        {des ? (
                          <View style={styles.desTag}>
                            <Ionicons name="document-text-outline" size={11} color="#475569" />
                            <Text style={styles.desTagText} numberOfLines={1}>{des}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Card Body */}
                <View style={styles.cardBody}>
                  {/* CREATE / ADD (Green Theme) */}
                  {action === 'CREATE' && (
                    <View style={styles.locationWrapper}>
                      <Text style={styles.locationLabel}>Placed in:</Text>
                      <Text style={styles.locationTag}>{toLoc || '—'}</Text>
                    </View>
                  )}

                  {/* DELETE (Red Theme) */}
                  {action === 'DELETE' && (
                    <View style={styles.locationWrapper}>
                      <Text style={styles.locationLabel}>Removed from:</Text>
                      <Text style={styles.locationTagDelete}>{fromLoc || '—'}</Text>
                    </View>
                  )}

                  {/* EDIT (Blue Theme) */}
                  {action === 'EDIT' && (
                    <View style={styles.locationWrapper}>
                      <Text style={styles.locationLabel}>Location:</Text>
                      <Text style={styles.locationTagEdit}>{toLoc || fromLoc || '—'}</Text>
                    </View>
                  )}

                  {/* Operator Info */}
                  <View style={styles.operatorRow}>
                    <Ionicons name="person-circle-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.operatorText}>{operator}</Text>
                  </View>
                </View>
              </View>
            );
          }}
          onEndReached={() => { if (hasMore && !loadingMore) fetchMoreHistory(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#1b4d3e" />
              </View>
            ) : !hasMore && logs.length > 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>— End of history —</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },

  // Filters
  filterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  dateInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginRight: 4 },
  dateInputTouchable: { flex: 1, paddingVertical: 10 },
  dateInputText: { fontSize: 13, color: '#0f172a' },
  datePlaceholder: { color: '#94a3b8' },
  filterButton: {
    backgroundColor: '#1b4d3e',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  list: { padding: 12, paddingBottom: 32 },
  
  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#1b4d3e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  timeText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  
  // 1. CREATE & DELETE Layout (Compact Horizontal)
  compactDetailsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  compactLotSection: {
    flex: 1.1,
    justifyContent: 'center',
  },
  verticalSeparator: {
    width: 1,
    height: '70%',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  compactMetaSection: {
    flex: 1.5,
    gap: 6,
    justifyContent: 'center',
  },

  // 2. EDIT Layout (Split Side-by-Side Old ➔ New)
  editDetailsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe', // Blue border for EDIT
  },
  editColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  arrowColumn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editColumnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  editLotBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  editLotValueOld: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  editLotValueNew: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  editMetaColumn: {
    gap: 4,
    width: '100%',
    alignItems: 'center',
  },

  // Shared inner Tags (Color & Description)
  miniLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  lotValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    maxWidth: '100%',
  },
  colorTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  desTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    maxWidth: '100%',
    flexShrink: 1,
  },
  desTagText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '500',
    color: '#475569',
  },

  // Card Body
  cardBody: { gap: 10 },

  // Location Placements
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  // ADD / CREATE (Green)
  locationTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
    overflow: 'hidden',
  },
  // DELETE (Red)
  locationTagDelete: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
    borderWidth: 0.5,
    borderColor: '#fecaca',
    overflow: 'hidden',
  },
  // EDIT (Blue)
  locationTagEdit: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    borderWidth: 0.5,
    borderColor: '#bfdbfe',
    overflow: 'hidden',
  },

  // Operator footer
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#f1f5f9',
  },
  operatorText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});