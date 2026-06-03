import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  SafeAreaView,
  Modal,
  Dimensions,
  SectionList,
  Animated,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useBoard } from '../../hooks/useBoard';
import { AreaWithCount } from '../../types';
import { Ionicons } from '@expo/vector-icons';

// Helper function to clean LOT numbers from suffixes (e.g. K446-1 -> K446)
function cleanLotNumber(lot: string) {
  if (!lot) return '';
  return lot.replace(/-\d+$/, '');
}

// Animated Rack Cell Component with pulse highlight
function RackCell({
  area,
  columnWidth,
  isMatched,
  isTargetArea,
  shouldDim,
  hasYarn,
  lotDisplay,
  onPress,
}: {
  area: AreaWithCount;
  columnWidth: number;
  isMatched: boolean;
  isTargetArea: boolean;
  shouldDim: boolean;
  hasYarn: boolean;
  lotDisplay: string;
  onPress: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMatched || isTargetArea) {
      // Pulse animation: 3 cycles then stay highlighted
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
        { iterations: 4 }
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isMatched, isTargetArea]);

  const animatedBorderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2e7d32', '#1b5e20'],
  });

  const animatedBorderWidth = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 3],
  });

  // Determine colors
  let cardBg = '#ffffff';
  let lotColor = hasYarn ? '#2e7d32' : '#cbd5e1';
  let locColor = '#64748b';
  let borderColor = hasYarn ? '#c8e6c9' : '#e2e8f0';

  if (isMatched || isTargetArea) {
    cardBg = '#e8f5e9';
    lotColor = '#1b5e20';
    locColor = '#2e7d32';
    borderColor = '#2e7d32';
  }

  const isHighlighted = isMatched || isTargetArea;

  return (
    <Animated.View
      style={[
        styles.rackCell,
        {
          width: columnWidth,
          height: columnWidth,
          backgroundColor: cardBg,
          borderColor: isHighlighted ? animatedBorderColor : borderColor,
          borderWidth: isHighlighted ? animatedBorderWidth : 1,
          opacity: shouldDim ? 0.2 : 1.0,
        },
        isHighlighted && styles.highlightedCell,
      ]}
    >
      <TouchableOpacity
        style={styles.rackCellTouchable}
        onPress={onPress}
        activeOpacity={0.6}
      >
        {/* Location code on top (small) */}
        <Text style={[styles.cellLocation, { color: locColor }]} numberOfLines={1}>
          {area.code}
        </Text>
        {/* LOT number below (large, bold) */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[
            styles.cellLot,
            {
              color: lotColor,
              fontWeight: hasYarn ? '800' : '400',
            },
          ]}
        >
          {lotDisplay}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function BoardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openAreaId?: string; searchLot?: string }>();
  const { areas, loading, refetch } = useBoard();
  const sectionListRef = useRef<SectionList>(null);

  // Read search parameters for highlighting
  const searchLot = params.searchLot;
  const openAreaId = params.openAreaId;

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // Responsive columns calculations
  const [numColumns, setNumColumns] = useState(5);
  const [columnWidth, setColumnWidth] = useState(65);

  // Re-calculate column width whenever container size changes
  useEffect(() => {
    if (!containerWidth) return;
    const targetCellSize = 68; // target cell width in px
    const horizontalPadding = 16; // 8px each side in rowGrid
    const gap = 4;
    const availableWidth = containerWidth - horizontalPadding;
    const cols = Math.max(4, Math.floor((availableWidth + gap) / (targetCellSize + gap)));
    setNumColumns(cols);
    const calculatedWidth = (availableWidth - (cols - 1) * gap) / cols;
    setColumnWidth(Math.floor(calculatedWidth));
  }, [containerWidth]);

  const onContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  // Detail Modal State
  const [selectedArea, setSelectedArea] = useState<AreaWithCount | null>(null);

  // Sign out function
  async function handleLogout() {
    const performSignOut = async () => {
      try {
        await supabase.auth.signOut();
        router.replace('/login');
      } catch (error: any) {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to sign out?');
      if (confirmLogout) {
        await performSignOut();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performSignOut,
        },
      ]);
    }
  }

  // Sort areas numerically
  const sortedAreas = useMemo(() => {
    return [...areas].sort((a, b) => {
      const secA = a.code[0];
      const secB = b.code[0];
      if (secA !== secB) return secA.localeCompare(secB);

      const restA = a.code.substring(1).split('.');
      const restB = b.code.substring(1).split('.');
      const rowA = parseInt(restA[0], 10) || 0;
      const rowB = parseInt(restB[0], 10) || 0;
      if (rowA !== rowB) return rowA - rowB;

      const slotA = parseInt(restA[1], 10) || 0;
      const slotB = parseInt(restB[1], 10) || 0;
      return slotA - slotB;
    });
  }, [areas]);

  // Group sorted areas by Section (A, B, C, D) and chunk into grid rows
  const groupedSectionsForList = useMemo(() => {
    const groups: { [key: string]: AreaWithCount[] } = {
      A: [],
      B: [],
      C: [],
      D: [],
    };

    sortedAreas.forEach((area) => {
      const section = area.code[0].toUpperCase();
      if (groups[section]) {
        groups[section].push(area);
      } else {
        groups[section] = [area];
      }
    });

    return Object.keys(groups).map((key) => {
      const flatList = groups[key];
      const rows: AreaWithCount[][] = [];
      for (let i = 0; i < flatList.length; i += numColumns) {
        rows.push(flatList.slice(i, i + numColumns));
      }
      return {
        key: key,
        title: `Section ${key}`,
        data: rows,
        flatList: flatList,
      };
    });
  }, [sortedAreas, numColumns]);

  // Sync route param searchLot to local search state
  useEffect(() => {
    if (searchLot) {
      setSearchQuery(searchLot);
      handleSearchScroll(searchLot);
    }
  }, [searchLot]);

  // Handle openAreaId when parameter changes
  useEffect(() => {
    if (openAreaId && groupedSectionsForList.length > 0) {
      const targetArea = sortedAreas.find((a) => a.id === openAreaId);
      if (targetArea) {
        setSelectedArea(targetArea);
        // Scroll to targetArea
        for (let s = 0; s < groupedSectionsForList.length; s++) {
          const sec = groupedSectionsForList[s];
          const flatIdx = sec.flatList.findIndex((a) => a.id === openAreaId);
          if (flatIdx !== -1) {
            const rowIndex = Math.floor(flatIdx / numColumns);
            const timer = setTimeout(() => {
              try {
                sectionListRef.current?.scrollToLocation({
                  sectionIndex: s,
                  itemIndex: rowIndex,
                  viewPosition: 0.1,
                  animated: true,
                });
              } catch (e) {
                console.warn('Scroll failed:', e);
              }
            }, 400);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [openAreaId, groupedSectionsForList, numColumns, sortedAreas]);

  // Helper function to scroll to first match
  const handleSearchScroll = (text: string) => {
    const query = text.trim().toLowerCase();
    if (!query || groupedSectionsForList.length === 0) return;

    // Find the first area matching the query
    const matchedArea = sortedAreas.find((area) => {
      const codeMatch = area.code.toLowerCase().includes(query);
      const lotMatch = area.yarns?.some(
        (y) => cleanLotNumber(y.yarn_code).toLowerCase().includes(query)
      );
      return codeMatch || lotMatch;
    });

    if (matchedArea) {
      for (let s = 0; s < groupedSectionsForList.length; s++) {
        const sec = groupedSectionsForList[s];
        const flatIdx = sec.flatList.findIndex((a) => a.id === matchedArea.id);
        if (flatIdx !== -1) {
          const rowIndex = Math.floor(flatIdx / numColumns);
          try {
            sectionListRef.current?.scrollToLocation({
              sectionIndex: s,
              itemIndex: rowIndex,
              viewPosition: 0.1,
              animated: true,
            });
          } catch (e) {
            console.warn('Scroll failed:', e);
          }
          break;
        }
      }
    }
  };

  // Handle typing search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    handleSearchScroll(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    router.setParams({ searchLot: undefined, openAreaId: undefined });
  };

  // Check if search query matches a rack LOT number or location code
  const activeSearch = searchQuery.trim().toLowerCase();
  const isSearchActive = activeSearch.length > 0;

  const isCardMatched = useCallback((area: AreaWithCount) => {
    if (!activeSearch) return false;
    
    // Check if location code matches
    if (area.code.toLowerCase().includes(activeSearch)) return true;

    // Check if any lot number matches
    return area.yarns?.some(
      (yarn: any) => cleanLotNumber(yarn.yarn_code).toLowerCase().includes(activeSearch)
    ) ?? false;
  }, [activeSearch]);

  // Section header colors - clean green and white theme for all sections
  function getSectionStyle(key: string) {
    return { 
      bg: '#e8f5e9',      // Soft light green background
      text: '#1b5e20',    // Dark green text
      accent: '#2e7d32'   // Medium green accent for dots/counts
    };
  }

  // Stats
  const totalRacks = sortedAreas.length;
  const occupiedRacks = sortedAreas.filter(a => (a.yarn_count ?? 0) > 0).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container} onLayout={onContainerLayout}>
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>📋 Rack Board</Text>
            <Text style={styles.headerSub}>
              {occupiedRacks}/{totalRacks} occupied
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={15} color="#ffffff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Board Search Bar Banner */}
        <View style={styles.boardSearchContainer}>
          <View style={styles.boardSearchInputWrapper}>
            <Ionicons name="search-outline" size={16} color="#718096" style={styles.boardSearchIcon} />
            <TextInput
              style={styles.boardSearchInput}
              placeholder="Search LOT or location code..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="characters"
              placeholderTextColor="#a0aec0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.boardSearchClear}>
                <Ionicons name="close-circle" size={18} color="#718096" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dense Rack Map Grid */}
        <SectionList
          ref={sectionListRef}
          sections={groupedSectionsForList}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
          stickySectionHeadersEnabled={true}
          renderSectionHeader={({ section }) => {
            const sStyle = getSectionStyle(section.key || '');
            const sectionOccupied = section.flatList.filter((a: AreaWithCount) => (a.yarn_count ?? 0) > 0).length;
            return (
              <View style={[styles.sectionHeader, { backgroundColor: sStyle.bg }]}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionDot, { backgroundColor: sStyle.accent }]} />
                  <Text style={[styles.sectionTitle, { color: sStyle.text }]}>
                    {section.key}
                  </Text>
                </View>
                <Text style={[styles.sectionCount, { color: sStyle.accent }]}>
                  {sectionOccupied}/{section.flatList.length}
                </Text>
              </View>
            );
          }}
          renderItem={({ item }) => (
            <View style={styles.rowGrid}>
              {item.map((area: AreaWithCount) => {
                const activeYarns = area.yarns || [];
                const hasYarn = activeYarns.length > 0;

                const lotDisplay = hasYarn
                  ? activeYarns.map((y: any) => cleanLotNumber(y.yarn_code)).join(', ')
                  : '—';

                const isMatched = isCardMatched(area);
                const isTargetArea = openAreaId === area.id;
                const shouldDim = isSearchActive && !isMatched;

                return (
                  <RackCell
                    key={area.id}
                    area={area}
                    columnWidth={columnWidth}
                    isMatched={isMatched}
                    isTargetArea={isTargetArea}
                    shouldDim={shouldDim}
                    hasYarn={hasYarn}
                    lotDisplay={lotDisplay}
                    onPress={() => setSelectedArea(area)}
                  />
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loading ? 'Loading board...' : 'No rack locations found.'}
              </Text>
            </View>
          }
        />

        {/* Detail Modal */}
        <Modal
          visible={selectedArea !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedArea(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>📍 {selectedArea?.code}</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedArea?.yarn_count ? `${selectedArea.yarn_count} LOT(s) stored` : 'Empty rack'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedArea(null)}
                  style={styles.closeModalButton}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Modal Content */}
              <View style={styles.modalContent}>
                {selectedArea?.yarns && selectedArea.yarns.length > 0 ? (
                  selectedArea.yarns.map((yarn) => {
                    const cleanedLot = cleanLotNumber(yarn.yarn_code);
                    return (
                      <View key={yarn.id} style={styles.lotDetailCard}>
                        <Text style={styles.lotDetailText}>LOT: {cleanedLot}</Text>
                        <View style={styles.lotActions}>
                          <TouchableOpacity
                            style={styles.actionBtnSecondary}
                            onPress={() => {
                              setSelectedArea(null);
                              router.push(`/yarn/${yarn.id}`);
                            }}
                          >
                            <Ionicons name="time-outline" size={14} color="#475569" />
                            <Text style={styles.actionBtnSecondaryText}>History</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionBtnPrimary}
                            onPress={() => {
                              setSelectedArea(null);
                              router.push(`/move/${yarn.id}`);
                            }}
                          >
                            <Ionicons name="swap-horizontal" size={14} color="#ffffff" />
                            <Text style={styles.actionBtnPrimaryText}>Move</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="cube-outline" size={36} color="#cbd5e1" />
                    <Text style={styles.modalEmptyText}>Empty rack location</Text>
                  </View>
                )}
              </View>

              {/* Modal Footer */}
              <TouchableOpacity
                style={styles.modalCloseFooterBtn}
                onPress={() => setSelectedArea(null)}
              >
                <Text style={styles.modalCloseFooterText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1b4d3e',
  },
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1b4d3e',
  },
  headerLeft: {},
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 9, color: '#a7f3d0', marginTop: 1, fontWeight: '600' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Board Search Bar Banner
  boardSearchContainer: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#143c30',
  },
  boardSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  boardSearchIcon: {
    marginRight: 6,
  },
  boardSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
    height: '100%',
  },
  boardSearchClear: {
    padding: 4,
  },

  // List
  listContent: { paddingBottom: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Grid Row
  rowGrid: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  // Rack Cell
  rackCell: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  rackCellTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  highlightedCell: {
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 6,
  },
  cellLocation: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cellLot: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  closeModalButton: {
    padding: 2,
  },
  modalContent: {
    padding: 12,
  },
  lotDetailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  lotDetailText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  lotActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    gap: 3,
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    gap: 3,
  },
  actionBtnSecondaryText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  modalEmptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalCloseFooterBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCloseFooterText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
});
