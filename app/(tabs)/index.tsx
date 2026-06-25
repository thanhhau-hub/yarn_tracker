import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  Animated,
  TextInput,
  ActivityIndicator,
  FlatList,
  SectionList,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useBoard } from '../../hooks/useBoard';
import { useRole } from '../../hooks/useRole';
import { useAuth } from '../../context/AuthContext';
import { AreaWithCount, Area, Profile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

// Strip duplicate suffix to get base LOT code (K446-1 → K446).
// Only removes trailing "-<number>" to handle duplicate roll suffixes.
// Does NOT normalise "/" or "." — those are part of the real LOT code.
function cleanLotNumber(lot: string) {
  if (!lot) return '';
  return lot.replace(/-\d+$/, '');
}

// ─── Animated Rack Cell ────────────────────────────────────────
    const RackCell = React.memo(({ area, columnWidth, isMatched, isTargetArea, shouldDim, isSelected, hasYarn, lots, colors, descs, onPress }: {
      area: AreaWithCount;
      columnWidth: number;
      isMatched: boolean;
      isTargetArea: boolean;
      shouldDim: boolean;
      isSelected: boolean;
      hasYarn: boolean;
      lots: string[];
      colors: string[];
      descs: string[];
      onPress: () => void;
    }) => {
      const pulseAnim = useRef(new Animated.Value(0)).current;

      useEffect(() => {
        if (isMatched || isTargetArea) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, { toValue: 1, duration: 350, useNativeDriver: false }),
              Animated.timing(pulseAnim, { toValue: 0, duration: 350, useNativeDriver: false }),
            ]),
            { iterations: 6 }
          ).start();
        } else {
          pulseAnim.setValue(0);
        }
      }, [isMatched, isTargetArea]);

      const animBorderColor = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#2e7d32', '#76c442'],
      });
      const animBorderWidth = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 3],
      });

      const isHighlighted = isMatched || isTargetArea;

      let cardBg = '#ffffff';
      let lotColor = hasYarn ? '#2e7d32' : '#cbd5e1';
      let locColor = '#64748b';
      let borderColor = hasYarn ? '#c8e6c9' : '#e2e8f0';

      if (isHighlighted) {
        cardBg = '#e8f5e9';
        lotColor = '#1b5e20';
        locColor = '#2e7d32';
        borderColor = '#2e7d32'; 
      }

      if (isSelected) {
        cardBg = '#ecfdf5';
        lotColor = hasYarn ? '#064e3b' : '#047857';
        locColor = '#065f46';
        borderColor = '#10b981';
      }

      return (
        <Animated.View
          style={[
            styles.rackCell,
            {
              width: columnWidth,
              height: columnWidth,
              backgroundColor: cardBg,
              borderColor: isSelected ? borderColor : isHighlighted ? animBorderColor : borderColor,
              borderWidth: isSelected ? 3 : isHighlighted ? animBorderWidth : 1,
              opacity: shouldDim ? 0.2 : 1.0,
            },
            isHighlighted && styles.highlightedCell,
            isSelected && styles.selectedRackCell,
          ]}
        >
          <TouchableOpacity
            style={styles.rackCellTouchable}
            onPress={onPress}
            activeOpacity={0.6}
          >
            {/* Line 1: Rack Code (Centered) + Optional Badge */}
            <View style={styles.cellLine1Container}>
              <Text style={[styles.cellLocation, { color: locColor }]} numberOfLines={1}>
                {area.code}
              </Text>
              {hasYarn && lots.length > 1 && (
                <View style={styles.badgeContainer}>
                  <Text style={[styles.badgeText, { color: isHighlighted ? '#1b5e20' : '#64748b' }]}>
                    +{lots.length - 1}
                  </Text>
                </View>
              )}
            </View>

            {/* Line 2 & 3: Primary Lot + Meta */}
            {hasYarn && lots.length > 0 ? (
              <View style={styles.lotsWrapper}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  style={[styles.cellLotGrid, { color: lotColor, fontWeight: '800' }]}
                >
                  {lots[0]}
                </Text>
                
                {/* Line 3: Color · Description subtitle */}
                {(colors[0] || descs[0]) ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.cellMeta, { color: isHighlighted ? '#2e7d32' : '#94a3b8' }]}
                  >
                    {[colors[0], descs[0]].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={[styles.cellLot, { color: lotColor, fontWeight: '400' }]}
              >
                —
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      );
    });
// ─── Board Screen ──────────────────────────────────────────────
function BoardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openAreaId?: string; searchLot?: string }>();
  const { session, isGuest, setGuestMode } = useAuth();
  const { areas, loading, error, refetch } = useBoard(session);
  const { role, loading: roleLoading } = useRole();
  const sectionListRef = useRef<SectionList>(null);
  const insets = useSafeAreaInsets();

  const searchLot = params.searchLot;
  const openAreaId = params.openAreaId;

  const [searchLotInput, setSearchLotInput] = useState('');
  const [searchColorInput, setSearchColorInput] = useState('');
  const [searchDescInput, setSearchDescInput] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // Responsive grid based on screen width
  const [numColumns, setNumColumns] = useState(4);
  const [columnWidth, setColumnWidth] = useState(65);
  // Ref mirrors columnWidth so getItemLayout (called outside render) always has current value
  const columnWidthRef = useRef(65);
  const numColumnsRef = useRef(4);

  // Supervisor Panels State
  // Removed showAreaMgmt state (Worker role should not access Manage Areas)
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [editingYarn, setEditingYarn] = useState<any>(null);
  const [isEditingLot, setIsEditingLot] = useState(false);

  // Areas Management panel input
  const [showAreaMgmt, setShowAreaMgmt] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Area Mgmt - Mode: 'single' | 'multiple'
  const [areaMgmtMode, setAreaMgmtMode] = useState<'single' | 'multiple'>('single');
  // Single mode
  const [singleCode, setSingleCode] = useState('');
  // Multiple mode
  const [multiPrefix, setMultiPrefix] = useState('');
  const [multiFrom, setMultiFrom] = useState('');
  const [multiTo, setMultiTo] = useState('');
  // Switch mode confirmation
  const [pendingMode, setPendingMode] = useState<'single' | 'multiple' | null>(null);

  // Validation helpers
  const singleHasData = singleCode.trim().length > 0;
  const singleCodeValid = /^[A-Za-z0-9]+[.\-/][0-9]+$/.test(singleCode.trim());

  const multiHasData = multiPrefix.trim().length > 0 || multiFrom.trim().length > 0 || multiTo.trim().length > 0;
  const multiFromNum = parseInt(multiFrom.trim(), 10);
  const multiToNum = parseInt(multiTo.trim(), 10);
  const multiRangeValid = !isNaN(multiFromNum) && !isNaN(multiToNum) && multiToNum >= multiFromNum;
  const multiPrefixValid = multiPrefix.trim().length > 0;
  const multiCreateValid = multiPrefixValid && multiRangeValid;
  const multiDeleteValid = multiPrefixValid && multiRangeValid;
  const multiRangeError = multiPrefix.trim().length > 0 && multiFrom.trim().length > 0 && multiTo.trim().length > 0 && !multiRangeValid
    ? 'To must be greater than or equal to From'
    : '';

  const fetchAreasForMgmt = useCallback(async () => {
    setLoadingAreas(true);
    const { data, error } = await supabase.from('areas').select('*').order('code', { ascending: true });
    if (!error && data) setAllAreas(data);
    setLoadingAreas(false);
  }, []);

  useEffect(() => {
    if (showAreaMgmt) fetchAreasForMgmt();
  }, [showAreaMgmt]);

  const trySetMode = (mode: 'single' | 'multiple') => {
    if (mode === areaMgmtMode) return;
    const hasInput = areaMgmtMode === 'single' ? singleHasData : multiHasData;
    if (hasInput) {
      setPendingMode(mode);
    } else {
      setAreaMgmtMode(mode);
    }
  };

  const confirmSwitchMode = () => {
    if (!pendingMode) return;
    setAreaMgmtMode(pendingMode);
    setSingleCode('');
    setMultiPrefix('');
    setMultiFrom('');
    setMultiTo('');
    setPendingMode(null);
  };

  const cancelSwitchMode = () => setPendingMode(null);

  // Single create/delete
  const handleSingleCreate = async () => {
    const code = singleCode.trim().toUpperCase();
    if (!code) return;
    const msg = `Are you sure you want to create Rack ${code}?`;
    
    const perform = async () => {
      setSavingArea(true);
      const { error } = await supabase.from('areas').insert({ code, label: null });
      setSavingArea(false);
      if (error) {
        if (Platform.OS === 'web') window.alert(error.message);
        else Alert.alert('Error', error.message);
      } else {
        setSingleCode('');
        fetchAreasForMgmt();
        refetch();
        if (Platform.OS === 'web') window.alert(`Rack ${code} created.`);
        else Alert.alert('Success', `Rack ${code} created.`);
        setShowAreaMgmt(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) perform();
    } else {
      Alert.alert('Confirm Create', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Create', onPress: perform }]);
    }
  };

  const handleSingleDelete = async () => {
    const code = singleCode.trim().toUpperCase();
    if (!code) return;
    const area = allAreas.find(a => a.code.toUpperCase() === code);
    if (!area) {
      if (Platform.OS === 'web') window.alert(`Rack ${code} not found.`);
      else Alert.alert('Not Found', `Rack ${code} not found.`);
      return;
    }
    const { count } = await supabase.from('yarn_rolls').select('*', { count: 'exact', head: true }).eq('area_id', area.id).is('is_deleted', false);
    if (count && count > 0) {
      if (Platform.OS === 'web') window.alert(`Rack ${code} still contains active rolls.`);
      else Alert.alert('Cannot Delete', `Rack ${code} still contains active rolls.`);
      return;
    }
    const msg = `Are you sure you want to delete Rack ${code}?`;

    const perform = async () => {
      setSavingArea(true);
      const { error } = await supabase.from('areas').delete().eq('id', area.id);
      setSavingArea(false);
      if (error) {
        if (Platform.OS === 'web') window.alert(error.message);
        else Alert.alert('Error', error.message);
      } else {
        setSingleCode('');
        fetchAreasForMgmt();
        refetch();
        if (Platform.OS === 'web') window.alert(`Rack ${code} deleted.`);
        else Alert.alert('Success', `Rack ${code} deleted.`);
        setShowAreaMgmt(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) perform();
    } else {
      Alert.alert('Confirm Delete', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: perform }]);
    }
  };

  // Multiple create/delete
  const buildMultiCodes = () => {
    const prefix = multiPrefix.trim().toUpperCase();
    const from = multiFromNum;
    const to = multiToNum;
    const codes: string[] = [];
    for (let i = from; i <= to; i++) codes.push(`${prefix}.${i}`);
    return codes;
  };

  const handleMultiCreate = async () => {
    const codes = buildMultiCodes();
    if (codes.length === 0) return;
    const msg = `Are you sure you want to create ${codes.length} racks (${codes[0]} → ${codes[codes.length - 1]})?`;

    const perform = async () => {
      setSavingArea(true);
      const rows = codes.map(code => ({ code, label: null }));
      const { error } = await supabase.from('areas').insert(rows);
      setSavingArea(false);
      if (error) {
        if (Platform.OS === 'web') window.alert(error.message);
        else Alert.alert('Error', error.message);
      } else {
        setMultiPrefix('');
        setMultiFrom('');
        setMultiTo('');
        fetchAreasForMgmt();
        refetch();
        if (Platform.OS === 'web') window.alert(`Created ${codes.length} racks.`);
        else Alert.alert('Success', `Created ${codes.length} racks.`);
        setShowAreaMgmt(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) perform();
    } else {
      Alert.alert('Confirm Create', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Create', onPress: perform }]);
    }
  };

  const handleMultiDelete = async () => {
    const codes = buildMultiCodes();
    if (codes.length === 0) return;
    const msg = `Are you sure you want to delete ${codes.length} racks (${codes[0]} → ${codes[codes.length - 1]})?`;

    const perform = async () => {
      setSavingArea(true);
      let deletedCount = 0;
      let failedCodes: string[] = [];
      for (const code of codes) {
        const area = allAreas.find(a => a.code.toUpperCase() === code);
        if (!area) { failedCodes.push(`${code}(not found)`); continue; }
        const { count } = await supabase.from('yarn_rolls').select('*', { count: 'exact', head: true }).eq('area_id', area.id).is('is_deleted', false);
        if (count && count > 0) { failedCodes.push(`${code}(occupied)`); continue; }
        const { error } = await supabase.from('areas').delete().eq('id', area.id);
        if (error) failedCodes.push(`${code}(err)`); else deletedCount++;
      }
      setSavingArea(false);
      fetchAreasForMgmt();
      refetch();
      
      const resMsg = failedCodes.length > 0 
        ? `Deleted: ${deletedCount}. Failed: ${failedCodes.join(', ')}` 
        : `Deleted ${deletedCount} racks.`;
        
      if (Platform.OS === 'web') window.alert(resMsg);
      else Alert.alert(failedCodes.length > 0 ? 'Partial Success' : 'Success', resMsg);
      
      if (deletedCount > 0) setShowAreaMgmt(false);
      setMultiPrefix('');
      setMultiFrom('');
      setMultiTo('');
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) perform();
    } else {
      Alert.alert('Confirm Delete', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: perform }]);
    }
  };

  // Users Management panel list
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerWidth) return;
    const horizontalPadding = 24;
    const gap = 4;
    const availableWidth = containerWidth - horizontalPadding;

    // Fix cell size: min 75px, max 95px
    // Calculate how many columns fit at minimum 75px per cell
    const MIN_CELL = 75;
    const MAX_CELL = 95;

    const maxCols = Math.floor((availableWidth + gap) / (MIN_CELL + gap));
    const cols = Math.max(2, maxCols); // at least 2 columns

    const calculatedWidth = (availableWidth - (cols - 1) * gap) / cols;
    // Clamp cell width between MIN and MAX
    const cellWidth = Math.min(MAX_CELL, Math.max(MIN_CELL, Math.floor(calculatedWidth)));

    setNumColumns(cols);
    setColumnWidth(cellWidth);
    columnWidthRef.current = cellWidth;
    numColumnsRef.current = cols;
  }, [containerWidth]);

  const onContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) setContainerWidth(width);
  };

  // Modal state
  const [selectedArea, setSelectedArea] = useState<AreaWithCount | null>(null);
  const [cachedArea, setCachedArea] = useState<AreaWithCount | null>(null);
  const [areaToRestore, setAreaToRestore] = useState<AreaWithCount | null>(null);

  useEffect(() => {
    if (selectedArea) setCachedArea(selectedArea);
  }, [selectedArea]);

  const displayArea = selectedArea || cachedArea;

  const handleCloseModal = () => setSelectedArea(null);

  // Delete Confirmation State
  const [deleteConfirmYarn, setDeleteConfirmYarn] = useState<any>(null);
  const [deleteConfirmArea, setDeleteConfirmArea] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRackIds, setSelectedRackIds] = useState<string[]>([]);
  const [bulkDeleteConfirmVisible, setBulkDeleteConfirmVisible] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const selectedRackCount = selectedRackIds.length;
  const selectedRackSet = useMemo(() => new Set(selectedRackIds), [selectedRackIds]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedRackIds([]);
    setBulkDeleteConfirmVisible(false);
  };

  const toggleRackSelection = (areaId: string) => {
    setSelectedRackIds((current) =>
      current.includes(areaId)
        ? current.filter((id) => id !== areaId)
        : [...current, areaId]
    );
  };

  // Note: fetchProfilesForMgmt is defined later with useCallback.

  useEffect(() => {
    if (showUserMgmt) {
      fetchProfilesForMgmt();
    }
  }, [showUserMgmt]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const performLogout = async () => {
    try {
      if (selectMode) exitSelectMode();
      setLogoutConfirmVisible(false);
      // Clear guest mode first (no-op if not guest)
      await setGuestMode(false);
      if (session) {
        await supabase.auth.signOut();
      }
      router.replace('/login');
    } catch {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Logout
  async function handleLogout() {
    if (selectMode) {
      setLogoutConfirmVisible(true);
      return;
    }
    await performLogout();
  }

  // Sort areas numerically
  const sortedAreas = useMemo(() => {
    return [...areas].sort((a, b) => {
      const secA = a.code[0];
      const secB = b.code[0];
      if (secA !== secB) return secA.localeCompare(secB);
      // Split by dot, slash, or hyphen to support multiple formats (e.g., D14.1, D14/1, D14-1)
      const restA = a.code.substring(1).split(/[.\/-]/);
      const restB = b.code.substring(1).split(/[.\/-]/);
      const rowA = parseInt(restA[0], 10) || 0;
      const rowB = parseInt(restB[0], 10) || 0;
      if (rowA !== rowB) return rowA - rowB;
      return (parseInt(restA[1], 10) || 0) - (parseInt(restB[1], 10) || 0);
    });
  }, [areas]);

  const selectedRacks = useMemo(
    () => sortedAreas.filter((area) => selectedRackSet.has(area.id)),
    [sortedAreas, selectedRackSet]
  );
  const selectedActiveLotCount = useMemo(
    () => selectedRacks.reduce((total, area) => total + (area.yarns?.length ?? 0), 0),
    [selectedRacks]
  );

  // Group into sections + grid rows
  const groupedSectionsForList = useMemo(() => {
    const groups: { [key: string]: AreaWithCount[] } = { A: [], B: [], C: [], D: [] };
    sortedAreas.forEach((area) => {
      const section = area.code[0].toUpperCase();
      if (groups[section]) groups[section].push(area);
      else groups[section] = [area];
    });
    return Object.keys(groups)
      .filter((k) => groups[k].length > 0)
      .map((key) => {
        const flatList = groups[key];
        const rows: AreaWithCount[][] = [];
        for (let i = 0; i < flatList.length; i += numColumns) {
          rows.push(flatList.slice(i, i + numColumns));
        }
        return { key, title: `Rack ${key}`, data: rows, flatList };
      });
  }, [sortedAreas, numColumns]);

  // ── SEARCH MATCHING (AND logic, all fields optional, contains match) ──
  const activeLot = searchLotInput.trim().toLowerCase();
  const activeColor = searchColorInput.trim().toLowerCase();
  const activeDesc = searchDescInput.trim().toLowerCase();
  const isSearchActive = activeLot.length > 0 || activeColor.length > 0 || activeDesc.length > 0;

  const isCardMatched = useCallback(
    (area: AreaWithCount) => {
      if (!isSearchActive) return false;
      // At least one yarn in this rack must satisfy ALL non-empty conditions (AND)
      return (
        area.yarns?.some((yarn: any) => {
          const lotMatches = !activeLot || cleanLotNumber(yarn.yarn_code).toLowerCase().startsWith(activeLot);
          const colorMatches = !activeColor || (yarn.color || '').toLowerCase().startsWith(activeColor);
          const descMatches = !activeDesc || (yarn.description || '').toLowerCase().startsWith(activeDesc);
          return lotMatches && colorMatches && descMatches;
        }) ?? false
      );
    },
    [isSearchActive, activeLot, activeColor, activeDesc]
  );

  // Keep track of the last target location for retry on failure
  const targetScrollLocation = useRef<{ sectionIndex: number; itemIndex: number } | null>(null);
  const searchScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to first match based on all conditions
  const handleSearchScroll = useCallback(
    (qLot: string, qColor: string, qDesc: string) => {
      if (containerWidth === null) return;
      const lot = qLot.trim().toLowerCase();
      const col = qColor.trim().toLowerCase();
      const des = qDesc.trim().toLowerCase();
      if (!lot && !col && !des) return;
      if (groupedSectionsForList.length === 0) return;

      const matchedArea = sortedAreas.find((area) =>
        area.yarns?.some((y: any) => {
          const lotMatches = !lot || cleanLotNumber(y.yarn_code).toLowerCase().startsWith(lot);
          const colorMatches = !col || (y.color || '').toLowerCase().startsWith(col);
          const descMatches = !des || (y.description || '').toLowerCase().startsWith(des);
          return lotMatches && colorMatches && descMatches;
        })
      );

      if (!matchedArea) return;

      for (let s = 0; s < groupedSectionsForList.length; s++) {
        const sec = groupedSectionsForList[s];
        const flatIdx = sec.flatList.findIndex((a) => a.id === matchedArea.id);
        if (flatIdx !== -1) {
          const rowIndex = Math.floor(flatIdx / numColumns);
          targetScrollLocation.current = { sectionIndex: s, itemIndex: rowIndex };
          if (searchScrollTimeoutRef.current) {
            clearTimeout(searchScrollTimeoutRef.current);
          }
          searchScrollTimeoutRef.current = setTimeout(() => {
            try {
              sectionListRef.current?.scrollToLocation({
                sectionIndex: s,
                itemIndex: rowIndex,
                viewPosition: 0,
                viewOffset: 30,
                animated: true,
              });
            } catch (e) {
              console.warn('Scroll failed:', e);
            }
          }, 300);
          break;
        }
      }
    },
    [groupedSectionsForList, numColumns, sortedAreas, containerWidth]
  );

  useEffect(() => {
    if (containerWidth !== null && searchLot && groupedSectionsForList.length > 0) {
      setSearchLotInput(searchLot);
      handleSearchScroll(searchLot, searchColorInput, searchDescInput);
    }
  }, [searchLot, groupedSectionsForList, containerWidth]);

  useEffect(() => {
    if (containerWidth !== null && openAreaId && groupedSectionsForList.length > 0) {
      const targetArea = sortedAreas.find((a) => a.id === openAreaId);
      if (targetArea) {
        setSelectedArea(targetArea);
        for (let s = 0; s < groupedSectionsForList.length; s++) {
          const sec = groupedSectionsForList[s];
          const flatIdx = sec.flatList.findIndex((a) => a.id === openAreaId);
          if (flatIdx !== -1) {
            const rowIndex = Math.floor(flatIdx / numColumns);
            targetScrollLocation.current = { sectionIndex: s, itemIndex: rowIndex };
            const timer = setTimeout(() => {
              try {
                sectionListRef.current?.scrollToLocation({
                  sectionIndex: s,
                  itemIndex: rowIndex,
                  viewPosition: 0,
                  viewOffset: 30,
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
  }, [openAreaId, groupedSectionsForList, numColumns, sortedAreas, containerWidth]);

  const handleClearSearch = () => {
    setSearchLotInput('');
    setSearchColorInput('');
    setSearchDescInput('');
    router.setParams({ searchLot: undefined, openAreaId: undefined });
  };

  // ── Delete Lot ─────────────────────────────────────────────────
  const confirmDeleteLot = (yarn: any, areaCode: string) => {
    if (role !== 'supervisor' && role !== 'admin') {
      Alert.alert('Permission Required', 'Only supervisors and admins can delete lots.');
      return;
    }
    setAreaToRestore(selectedArea);
    setSelectedArea(null);
    setTimeout(() => {
      setDeleteConfirmYarn(yarn);
      setDeleteConfirmArea(areaCode);
    }, 50);
  };

  const cancelDeleteLot = () => {
    setDeleteConfirmYarn(null);
    if (areaToRestore) {
      setTimeout(() => {
        setSelectedArea(areaToRestore);
        setAreaToRestore(null);
      }, 50);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmYarn) return;
    if (role !== 'supervisor' && role !== 'admin') {
      Alert.alert('Permission Required', 'Only supervisors and admins can delete lots.');
      return;
    }
    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const operatorEmail = user?.email || 'Operator';

      // Insert audit record BEFORE deleting
      const { error: logErr } = await supabase.from('move_logs').insert({
        yarn_roll_id: deleteConfirmYarn.id,
        action: 'DELETE',
        yarn_code: deleteConfirmYarn.yarn_code,
        from_area_code: deleteConfirmArea,
        to_area_code: null,
        from_area_id: deleteConfirmYarn.area_id,
        to_area_id: null,
        moved_by: user?.id,
        note: JSON.stringify({
          action: 'DELETE',
          operator: operatorEmail,
          details: `Lot permanently deleted from floor`,
        }),
      });

      if (logErr) {
        Alert.alert('Error', 'Audit logging failed. Lot was not deleted. ' + logErr.message);
        setIsDeleting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('yarn_rolls')
        .update({ is_deleted: true })
        .eq('id', deleteConfirmYarn.id);

      if (updateError) {
        Alert.alert('Error', 'Delete operation failed: ' + updateError.message);
        setIsDeleting(false);
        return;
      }

      setDeleteConfirmYarn(null);
      setDeleteConfirmArea('');
      setAreaToRestore(null);
      handleCloseModal();
      refetch();
      Alert.alert('Success', 'Lot successfully deleted.');
    } catch (err: any) {
      Alert.alert('Error', 'An unexpected error occurred: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedRacks.length === 0) return;
    setIsBulkDeleting(true);

    try {
      const activeYarns = selectedRacks.flatMap((area) =>
        (area.yarns || []).map((yarn: any) => ({
          ...yarn,
          area_code: area.code,
        }))
      );

      if (activeYarns.length === 0) {
        setBulkDeleteConfirmVisible(false);
        exitSelectMode();
        Alert.alert('No Lots', 'Selected racks do not contain active lots.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const operatorEmail = user?.email || 'Operator';
      const logs = activeYarns.map((yarn: any) => ({
        yarn_roll_id: yarn.id,
        action: 'DELETE',
        yarn_code: yarn.yarn_code,
        from_area_code: yarn.area_code,
        to_area_code: null,
        from_area_id: yarn.area_id,
        to_area_id: null,
        moved_by: user?.id,
        note: JSON.stringify({
          action: 'DELETE',
          operator: operatorEmail,
          details: `Bulk deleted from rack ${yarn.area_code}`,
        }),
      }));

      const { error: logErr } = await supabase.from('move_logs').insert(logs);
      if (logErr) {
        Alert.alert('Error', 'Audit logging failed. Lots were not deleted. ' + logErr.message);
        return;
      }

      const { error: updateError } = await supabase
        .from('yarn_rolls')
        .update({ is_deleted: true })
        .in('id', activeYarns.map((yarn: any) => yarn.id));

      if (updateError) {
        Alert.alert('Error', 'Delete operation failed: ' + updateError.message);
        return;
      }

      const deletedRackCount = selectedRacks.length;
      const deletedLotCount = activeYarns.length;
      setBulkDeleteConfirmVisible(false);
      exitSelectMode();
      refetch();
      Alert.alert('Success', `Deleted ${deletedLotCount} lot(s) from ${deletedRackCount} rack(s).`);
    } catch (err: any) {
      Alert.alert('Error', 'An unexpected error occurred: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const fetchProfilesForMgmt = useCallback(async () => {
    setLoadingProfiles(true);
    const { data, error } = await supabase.from('profiles').select('*').order('email');
    if (!error && data) setProfiles(data);
    setLoadingProfiles(false);
  }, []);

  const handleToggleUserRole = useCallback(async (profileItem: Profile) => {
    if (role !== 'supervisor' && role !== 'admin') { Alert.alert('Permission Required', 'Not allowed.'); return; }
    const nextRole = profileItem.role === 'supervisor' ? 'worker' : 'supervisor';
    setUpdatingRoleUserId(profileItem.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const operatorEmail = user?.email || 'Operator';
      const { error: updateError } = await supabase.from('profiles').update({ role: nextRole }).eq('id', profileItem.id);
      if (updateError) { Alert.alert('Error', 'Failed to change role: ' + updateError.message); setUpdatingRoleUserId(null); return; }
      await supabase.from('move_logs').insert({
        action: 'ROLE_CHANGE',
        moved_by: user?.id,
        note: JSON.stringify({ action: 'ROLE_CHANGE', operator: operatorEmail, details: `Changed role of user "${profileItem.email}" to "${nextRole}"` }),
      });
      fetchProfilesForMgmt();
      Alert.alert('Success', `User role updated to ${nextRole}.`);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setUpdatingRoleUserId(null); }
  }, [role, fetchProfilesForMgmt]);

  // ── Edit Lot ───────────────────────────────────────────────────
  const executeEditLot = () => {
    setEditingYarn(null);
    setIsEditingLot(false);
  };

  // Stats
  const totalRacks = sortedAreas.length;
  const occupiedRacks = sortedAreas.filter((a) => (a.yarn_count ?? 0) > 0).length;
  const canSelectRacks = role === 'supervisor' || role === 'admin';
  const isCompactHeader = containerWidth !== null && containerWidth < 420;

  return (
    <View style={styles.safeArea}>
      <View style={styles.container} onLayout={onContainerLayout}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, isCompactHeader && styles.headerTitleCompact]}>Rack Board</Text>
            <View style={styles.roleRow}>
              <Text style={styles.headerSub}>{occupiedRacks}/{totalRacks} occupied</Text>
              {role === 'supervisor' ? (
                <View style={[styles.roleBadge, styles.roleSupervisor]}>
                  <Text style={styles.roleBadgeText}>Supervisor Mode</Text>
                </View>
              ) : role === 'admin' ? (
                <View style={[styles.roleBadge, styles.roleAdmin]}>
                  <Text style={styles.roleBadgeText}>ADMIN MODE</Text>
                </View>
              ) : (
                <View style={[styles.roleBadge, styles.roleWorker]}>
                  <Text style={styles.roleBadgeText}>Worker Mode</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.headerActions, isCompactHeader && styles.headerActionsCompact]}>
            {(role === 'supervisor' || role === 'admin') && (
              <TouchableOpacity
                style={[styles.manageAreasBtn, isCompactHeader && styles.manageAreasBtnCompact]}
                onPress={() => {
                  exitSelectMode();
                  setShowAreaMgmt(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="location" size={15} color="#065f46" />
                <Text style={styles.manageAreasBtnText}>Manage</Text>
              </TouchableOpacity>
            )}
            {canSelectRacks && (
              <TouchableOpacity
                style={[
                  styles.selectModeButton,
                  isCompactHeader && styles.selectModeButtonCompact,
                  selectMode && styles.selectModeButtonActive,
                ]}
                onPress={() => {
                  if (selectMode) {
                    exitSelectMode();
                  } else {
                    setSelectedArea(null);
                    setSelectMode(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={selectMode ? 'close' : 'checkbox-outline'}
                  size={15}
                  color={selectMode ? '#ffffff' : '#065f46'}
                />
                <Text style={[styles.selectModeButtonText, selectMode && styles.selectModeButtonTextActive]}>
                  {selectMode ? 'Cancel Select' : 'Select'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.logoutButton, isCompactHeader && styles.logoutButtonCompact]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={15} color="#ffffff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>



        {/* Real-time Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="barcode-outline" size={14} color="#718096" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Lot"
                value={searchLotInput}
                onChangeText={(t) => { setSearchLotInput(t); handleSearchScroll(t, searchColorInput, searchDescInput); }}
                autoCapitalize="characters"
                placeholderTextColor="#a0aec0"
              />
            </View>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="color-palette-outline" size={14} color="#718096" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Color"
                value={searchColorInput}
                onChangeText={(t) => { setSearchColorInput(t); handleSearchScroll(searchLotInput, t, searchDescInput); }}
                autoCapitalize="none"
                placeholderTextColor="#a0aec0"
              />
            </View>
            <View style={[styles.searchInputWrapper, { marginRight: 0 }]}>
              <Ionicons name="text-outline" size={14} color="#718096" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Description"
                value={searchDescInput}
                onChangeText={(t) => { setSearchDescInput(t); handleSearchScroll(searchLotInput, searchColorInput, t); }}
                autoCapitalize="none"
                placeholderTextColor="#a0aec0"
              />
            </View>
          </View>
          {isSearchActive && (
            <View style={styles.searchHintRow}>
              <Text style={styles.searchHint} numberOfLines={1}>
                {[activeLot ? `Lot: ${activeLot}` : '', activeColor ? `Color: ${activeColor}` : '', activeDesc ? `Desc: ${activeDesc}` : ''].filter(Boolean).join('  ·  ')}
              </Text>
              <TouchableOpacity onPress={handleClearSearch} style={styles.searchClearPill}>
                <Ionicons name="close" size={10} color="#065f46" />
                <Text style={styles.searchClearPillText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dense Rack Grid */}
        <SectionList
          ref={sectionListRef}
          sections={groupedSectionsForList}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={[styles.listContent, selectMode && styles.listContentWithSelectBar]}
          extraData={{ selectMode, selectedRackIds }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#1b4d3e" />}
          stickySectionHeadersEnabled={true}
          showsVerticalScrollIndicator={true}
          initialNumToRender={60}
          windowSize={21}
          maxToRenderPerBatch={50}
          // getItemLayout enables reliable scrollToLocation for ANY row, even un-rendered ones.
          // Heights: section header = 30px, each grid row = columnWidth + 2px (paddingVertical:1 x2)
          getItemLayout={(data, index) => {
            const SECTION_HEADER_HEIGHT = 30;
            const ROW_HEIGHT = columnWidthRef.current + 2; // paddingVertical:1 top+bottom

            // Build a flat map of all items across sections to find offset
            let offset = 0;
            let flatIndex = 0;
            for (const section of groupedSectionsForList) {
              // Section header
              if (flatIndex === index) {
                return { length: SECTION_HEADER_HEIGHT, offset, index };
              }
              offset += SECTION_HEADER_HEIGHT;
              flatIndex++;

              // Rows in this section
              for (let r = 0; r < section.data.length; r++) {
                if (flatIndex === index) {
                  return { length: ROW_HEIGHT, offset, index };
                }
                offset += ROW_HEIGHT;
                flatIndex++;
              }

              // Section footer (height is 0, but occupies 1 index slot)
              if (flatIndex === index) {
                return { length: 0, offset, index };
              }
              flatIndex++;
            }
            // Fallback (should not happen)
            return { length: ROW_HEIGHT, offset: 0, index };
          }}
          onScrollToIndexFailed={(info) => {
            // With getItemLayout this should rarely fire, but handle it gracefully
            const retry = () => {
              try {
                if (targetScrollLocation.current) {
                  sectionListRef.current?.scrollToLocation({
                    sectionIndex: targetScrollLocation.current.sectionIndex,
                    itemIndex: targetScrollLocation.current.itemIndex,
                    viewPosition: 0,
                    viewOffset: 30,
                    animated: false,
                  });
                }
              } catch (e) {}
            };
            // Retry twice: immediately then after render settles
            setTimeout(retry, 100);
            setTimeout(retry, 600);
          }}
          renderSectionHeader={({ section }) => {
            const sectionOccupied = section.flatList.filter(
              (a: AreaWithCount) => (a.yarn_count ?? 0) > 0
            ).length;
            return (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Rack {section.key}</Text>
                </View>
                <Text style={styles.sectionCount}>
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
                
                let sortedYarns = [...activeYarns];
                if (isSearchActive && hasYarn) {
                  const matchedIdx = sortedYarns.findIndex((yarn: any) => {
                    const lotMatches = !activeLot || cleanLotNumber(yarn.yarn_code).toLowerCase().startsWith(activeLot);
                    const colorMatches = !activeColor || (yarn.color || '').toLowerCase().startsWith(activeColor);
                    const descMatches = !activeDesc || (yarn.description || '').toLowerCase().startsWith(activeDesc);
                    return lotMatches && colorMatches && descMatches;
                  });
                  if (matchedIdx > 0) {
                    const matchedYarn = sortedYarns.splice(matchedIdx, 1)[0];
                    sortedYarns.unshift(matchedYarn);
                  }
                }

                const lots = hasYarn ? sortedYarns.map((y: any) => cleanLotNumber(y.yarn_code)) : [];
                const colors = hasYarn ? sortedYarns.map((y: any) => y.color || '') : [];
                const descs = hasYarn ? sortedYarns.map((y: any) => y.description || '') : [];
                const isMatched = isCardMatched(area);
                const isTargetArea = openAreaId === area.id;
                const shouldDim = !selectMode && isSearchActive && !isMatched;
                const isSelected = selectedRackSet.has(area.id);

                return (
                  <RackCell
                    key={area.id}
                    area={area}
                    columnWidth={columnWidth}
                    isMatched={isMatched}
                    isTargetArea={isTargetArea}
                    shouldDim={shouldDim}
                    isSelected={isSelected}
                    hasYarn={hasYarn}
                    lots={lots}
                    colors={colors}
                    descs={descs}
                    onPress={() => {
                      if (selectMode) {
                        toggleRackSelection(area.id);
                      } else if (hasYarn) {
                        setSelectedArea(area);
                      } else if (role === 'supervisor' || role === 'admin') {
                        router.push({ pathname: '/(tabs)/add', params: { areaId: area.id } });
                      } else {
                        Alert.alert('Supervisor Required', 'Adding new lots is restricted to supervisors only.');
                      }
                    }}
                  />
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loading ? 'Loading board...' : error ? `Error loading data: ${error}` : 'No rack locations found.'}
              </Text>
            </View>
          }
        />

        {selectMode && (
          <View style={[styles.selectActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TouchableOpacity
              style={styles.selectCancelButton}
              onPress={exitSelectMode}
              disabled={isBulkDeleting}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={18} color="#475569" />
              <Text style={styles.selectCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectDeleteButton, selectedRackCount === 0 && styles.selectDeleteButtonDisabled]}
              onPress={() => setBulkDeleteConfirmVisible(true)}
              disabled={isBulkDeleting || selectedRackCount === 0}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#ffffff" />
              <Text style={styles.selectDeleteText}>Delete ({selectedActiveLotCount})</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lot Action Modal */}
        <Modal
          visible={selectedArea !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{displayArea?.code}</Text>
                  <Text style={styles.modalSubtitle}>
                    {displayArea?.yarn_count
                      ? `${displayArea.yarn_count} LOT(s) stored`
                      : 'Empty rack'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCloseModal} style={styles.closeModalButton}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Lot Cards with Actions */}
              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalContent}>
                  {displayArea?.yarns && displayArea.yarns.length > 0 ? (
                    displayArea.yarns.map((yarn) => {
                      const cleanedLot = cleanLotNumber(yarn.yarn_code);
                      return (
                        <View key={yarn.id} style={styles.lotDetailCard}>
                          <View style={styles.lotDetailHeader}>
                            <Ionicons name="cube-outline" size={16} color="#1b4d3e" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.lotDetailText}>LOT: {cleanedLot}</Text>
                              {yarn.color ? (
                                <View style={styles.lotDetailMeta}>
                                  <Ionicons name="color-palette-outline" size={11} color="#64748b" />
                                  <Text style={styles.lotDetailMetaText}>{yarn.color}</Text>
                                </View>
                              ) : null}
                              {yarn.description ? (
                                <View style={styles.lotDetailMeta}>
                                  <Ionicons name="text-outline" size={11} color="#64748b" />
                                  <Text style={styles.lotDetailMetaText}>{yarn.description}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          <View style={styles.lotActions}>
                            {/* Move (Available to Supervisors) */}
                            {(role === 'supervisor' || role === 'admin') && (
                              <TouchableOpacity
                                style={styles.actionBtnPrimary}
                                onPress={() => {
                                  handleCloseModal();
                                  router.push(`/move/${yarn.id}`);
                                }}
                              >
                                <Ionicons name="swap-horizontal" size={14} color="#ffffff" />
                                <Text style={styles.actionBtnPrimaryText}>Move</Text>
                              </TouchableOpacity>
                            )}

                            {/* Delete (Supervisor only) */}
                            {(role === 'supervisor' || role === 'admin') && (
                              <TouchableOpacity
                                style={styles.actionBtnDelete}
                                onPress={() => confirmDeleteLot(yarn, displayArea?.code || '')}
                              >
                                <Ionicons name="trash-outline" size={14} color="#ffffff" />
                                <Text style={styles.actionBtnDeleteText}>Delete</Text>
                              </TouchableOpacity>
                            )}

                            {/* History */}
                            <TouchableOpacity
                              style={styles.actionBtnSecondary}
                              onPress={() => {
                                handleCloseModal();
                                router.push(`/yarn/${yarn.id}`);
                              }}
                            >
                              <Ionicons name="time-outline" size={14} color="#475569" />
                              <Text style={styles.actionBtnSecondaryText}>History</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyRackContainer}>
                      <Ionicons name="cube-outline" size={36} color="#cbd5e1" />
                      <Text style={styles.emptyRackText}>This rack is empty</Text>
                      {(role === 'supervisor' || role === 'admin') && (
                        <TouchableOpacity
                          style={styles.addHereButton}
                          onPress={() => {
                            handleCloseModal();
                            router.push({
                              pathname: '/(tabs)/add',
                              params: { areaId: displayArea?.id },
                            });
                          }}
                        >
                          <Ionicons name="add-circle-outline" size={16} color="#fff" />
                          <Text style={styles.addHereButtonText}>Add Lot Here</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Close footer */}
              <TouchableOpacity style={styles.modalCloseFooterBtn} onPress={handleCloseModal}>
                <Text style={styles.modalCloseFooterText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteConfirmYarn !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => { if (!isDeleting) cancelDeleteLot(); }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconRow}>
                <View style={styles.confirmIconBgDelete}>
                  <Ionicons name="trash" size={28} color="#b91c1c" />
                </View>
              </View>

              <Text style={styles.confirmTitle}>Confirm Delete</Text>
              <Text style={styles.confirmSubtitle}>Are you sure you want to permanently delete this lot?</Text>

              <View style={styles.confirmDetails}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>LOT Number</Text>
                  <Text style={styles.confirmValue}>{cleanLotNumber(deleteConfirmYarn?.yarn_code || '')}</Text>
                </View>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Location</Text>
                  <Text style={styles.confirmLocation}>{deleteConfirmArea}</Text>
                </View>
              </View>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={cancelDeleteLot}
                  disabled={isDeleting}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnDeleteConfirm}
                  onPress={executeDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnConfirmText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Logout Select Mode Warning Modal */}
        <Modal
          visible={logoutConfirmVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setLogoutConfirmVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconRow}>
                <View style={styles.confirmIconBgWarning}>
                  <Ionicons name="log-out-outline" size={28} color="#d97706" />
                </View>
              </View>

              <Text style={styles.warningTitle}>Logout?</Text>
              <Text style={styles.confirmSubtitle}>
                You are in select mode. Logging out will clear your current selection.
              </Text>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setLogoutConfirmVisible(false)}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnWarningConfirm}
                  onPress={performLogout}
                >
                  <Text style={styles.btnConfirmText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bulk Delete Confirmation Modal */}
        <Modal
          visible={bulkDeleteConfirmVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => { if (!isBulkDeleting) setBulkDeleteConfirmVisible(false); }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconRow}>
                <View style={styles.confirmIconBgDelete}>
                  <Ionicons name="trash" size={28} color="#b91c1c" />
                </View>
              </View>

              <Text style={styles.confirmTitle}>Confirm Delete</Text>
              <Text style={styles.confirmSubtitle}>
                Delete {selectedActiveLotCount} active lot(s) from {selectedRackCount} selected rack(s)?
              </Text>

              <View style={styles.confirmDetails}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Selected racks</Text>
                  <Text style={styles.confirmValue}>{selectedRackCount}</Text>
                </View>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Active lots</Text>
                  <Text style={styles.confirmValue}>{selectedActiveLotCount}</Text>
                </View>
                <View style={styles.confirmDivider} />
                <Text style={styles.bulkRackList} numberOfLines={3}>
                  {selectedRacks.map((area) => area.code).join(', ')}
                </Text>
              </View>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setBulkDeleteConfirmVisible(false)}
                  disabled={isBulkDeleting}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnDeleteConfirm}
                  onPress={executeBulkDelete}
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnConfirmText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Lot Modal (Supervisor Only) */}
        <Modal
          visible={editingYarn !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => { if (!isEditingLot) setEditingYarn(null); }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editCard}>
              <Text style={styles.editModalTitle}>Edit Lot Details</Text>
              
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>LOT CODE (Locked)</Text>
                <View style={styles.lockedInput}>
                  <Ionicons name="lock-closed" size={14} color="#94a3b8" style={{ marginRight: 6 }} />
                  <Text style={styles.lockedInputText}>{cleanLotNumber(editingYarn?.yarn_code || '')}</Text>
                </View>
              </View>

              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>STATUS</Text>
                <View style={styles.lockedInput}>
                  <Text style={styles.lockedInputText}>{editingYarn?.status || 'in_stock'}</Text>
                </View>
              </View>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setEditingYarn(null)}
                  disabled={isEditingLot}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSaveEdit}
                  onPress={executeEditLot}
                  disabled={isEditingLot}
                >
                  {isEditingLot ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnConfirmText}>Save Details</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Manage Areas Inline Screen */}
        {showAreaMgmt && (
          <View style={styles.areaMgmtScreen}>
            {/* Screen Header */}
            <View style={styles.areaMgmtHeader}>
              <TouchableOpacity onPress={() => { setShowAreaMgmt(false); setSingleCode(''); setMultiPrefix(''); setMultiFrom(''); setMultiTo(''); }} style={styles.areaMgmtBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.areaMgmtTitle}>Manage Areas</Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.areaMgmtBody} keyboardShouldPersistTaps="handled">

              {/* Mode Switch Confirmation Inline Banner */}
              {pendingMode !== null && (
                <View style={styles.switchBanner}>
                  <Text style={styles.switchBannerTitle}>Switch mode?</Text>
                  <Text style={styles.switchBannerSub}>Current input will be cleared.</Text>
                  <View style={styles.switchBannerActions}>
                    <TouchableOpacity style={styles.switchCancelBtn} onPress={cancelSwitchMode}>
                      <Text style={styles.switchCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.switchConfirmBtn} onPress={confirmSwitchMode}>
                      <Text style={styles.switchConfirmText}>Switch</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Radio Mode Selector */}
              <View style={styles.modeCard}>
                <TouchableOpacity
                  style={[styles.modeRow, areaMgmtMode === 'single' && styles.modeRowActive]}
                  onPress={() => trySetMode('single')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, areaMgmtMode === 'single' && styles.radioOuterActive]}>
                    {areaMgmtMode === 'single' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.modeLabel, areaMgmtMode === 'single' ? styles.modeLabelActive : styles.modeLabelDim]}>Single</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeRow, areaMgmtMode === 'multiple' && styles.modeRowActive]}
                  onPress={() => trySetMode('multiple')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, areaMgmtMode === 'multiple' && styles.radioOuterActive]}>
                    {areaMgmtMode === 'multiple' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.modeLabel, areaMgmtMode === 'multiple' ? styles.modeLabelActive : styles.modeLabelDim]}>Multiple</Text>
                </TouchableOpacity>
              </View>

              {/* Form Card */}
              <View style={styles.areaMgmtFormCard}>

                {areaMgmtMode === 'single' ? (
                  <>
                    <Text style={styles.areaMgmtFieldLabel}>Rack Code</Text>
                    <TextInput
                      style={styles.areaMgmtInput}
                      placeholder="e.g. A1.1"
                      value={singleCode}
                      onChangeText={setSingleCode}
                      autoCapitalize="characters"
                      placeholderTextColor="#94a3b8"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.areaMgmtFieldLabel}>Prefix</Text>
                    <TextInput
                      style={styles.areaMgmtInput}
                      placeholder="e.g. A1"
                      value={multiPrefix}
                      onChangeText={setMultiPrefix}
                      autoCapitalize="characters"
                      placeholderTextColor="#94a3b8"
                    />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.areaMgmtFieldLabel}>From</Text>
                        <TextInput
                          style={styles.areaMgmtInput}
                          placeholder="1"
                          value={multiFrom}
                          onChangeText={setMultiFrom}
                          keyboardType="number-pad"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.areaMgmtFieldLabel}>To</Text>
                        <TextInput
                          style={styles.areaMgmtInput}
                          placeholder="12"
                          value={multiTo}
                          onChangeText={setMultiTo}
                          keyboardType="number-pad"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                    </View>
                    {multiRangeError ? (
                      <View style={styles.validationError}>
                        <Ionicons name="alert-circle-outline" size={13} color="#dc2626" />
                        <Text style={styles.validationErrorText}>{multiRangeError}</Text>
                      </View>
                    ) : null}
                    {multiCreateValid && (
                      <Text style={styles.previewText}>
                        {multiPrefix.trim().toUpperCase()}.{multiFromNum} → {multiPrefix.trim().toUpperCase()}.{multiToNum} ({multiToNum - multiFromNum + 1} racks)
                      </Text>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <View style={styles.areaMgmtActions}>
                  {/* Delete */}
                  {savingArea ? (
                    <ActivityIndicator color="#dc2626" style={{ flex: 1 }} />
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.areaMgmtDeleteBtn,
                        (areaMgmtMode === 'single' ? !singleHasData : !multiDeleteValid) && styles.areaMgmtBtnDisabled,
                      ]}
                      onPress={areaMgmtMode === 'single' ? handleSingleDelete : handleMultiDelete}
                      disabled={savingArea || (areaMgmtMode === 'single' ? !singleHasData : !multiDeleteValid)}
                    >
                      <Ionicons name="trash-outline" size={14} color={areaMgmtMode === 'single' ? (singleHasData ? '#dc2626' : '#cbd5e1') : (multiDeleteValid ? '#dc2626' : '#cbd5e1')} />
                      <Text style={[styles.areaMgmtDeleteBtnText, (areaMgmtMode === 'single' ? !singleHasData : !multiDeleteValid) && { color: '#cbd5e1' }]}>Delete</Text>
                    </TouchableOpacity>
                  )}

                  {/* Create */}
                  {savingArea ? (
                    <ActivityIndicator color="#059669" style={{ flex: 1 }} />
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.areaMgmtCreateBtn,
                        (areaMgmtMode === 'single' ? !singleCodeValid : !multiCreateValid) && styles.areaMgmtBtnDisabled,
                      ]}
                      onPress={areaMgmtMode === 'single' ? handleSingleCreate : handleMultiCreate}
                      disabled={savingArea || (areaMgmtMode === 'single' ? !singleCodeValid : !multiCreateValid)}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={areaMgmtMode === 'single' ? (singleCodeValid ? '#fff' : '#a3b3b3') : (multiCreateValid ? '#fff' : '#a3b3b3')} />
                      <Text style={[styles.areaMgmtCreateBtnText, (areaMgmtMode === 'single' ? !singleCodeValid : !multiCreateValid) && { color: '#a3b3b3' }]}>Create</Text>
                    </TouchableOpacity>
                  )}
                </View>

              </View>

            </ScrollView>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1b4d3e' },
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#1b4d3e',
  },
  headerLeft: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerTitleCompact: { fontSize: 14 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerSub: { fontSize: 9, color: '#a7f3d0', fontWeight: '600' },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleWorker: { backgroundColor: '#475569' },
  roleSupervisor: { backgroundColor: '#d97706' },
  roleAdmin: { backgroundColor: '#dc2626' },
  roleBadgeText: { color: '#ffffff', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  headerActionsCompact: { gap: 4 },
  selectModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    width: 74,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  selectModeButtonCompact: { width: 70, gap: 3 },
  selectModeButtonText: { color: '#065f46', fontSize: 12, fontWeight: '800' },
  selectModeButtonActive: {
    backgroundColor: '#0f766e',
  },
  selectModeButtonTextActive: {
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  logoutButtonCompact: {
    paddingHorizontal: 7,
    gap: 3,
  },
  logoutButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  superActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  superActionBtnText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },

  // Search
  searchContainer: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#143c30',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
    marginRight: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: { marginRight: 4, flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1e293b',
    paddingVertical: 0,
    height: '100%',
    minWidth: 0,
  },
  searchHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingHorizontal: 2,
  },
  searchHint: {
    flex: 1,
    fontSize: 10,
    color: '#a7f3d0',
    fontWeight: '600',
  },
  searchClearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  searchClearPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  // legacy (unused but kept to avoid missing-key warnings)
  searchClearBtn: { padding: 4 },
  searchClear: { padding: 4 },

  // List
  listContent: { paddingBottom: 16, paddingLeft: 8, paddingRight: 16 },
  listContentWithSelectBar: { paddingBottom: 96 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },

  // Section Header
  sectionHeader: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2e7d32' },
  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1, color: '#1b5e20' },
  sectionCount: { fontSize: 10, fontWeight: '700', color: '#2e7d32' },

  // Grid
  rowGrid: { flexDirection: 'row', gap: 4, paddingVertical: 1 },

  // Rack Cell
  rackCell: {
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#1b4d3e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedRackCell: {
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  cellLocation: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  cellLine1Container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  cellLot: { fontSize: 13, textAlign: 'center', marginTop: 1 },
  lotsWrapper: {
    alignItems: 'center',
    width: '100%',
    marginTop: 0,
  },
  cellLotGrid: {
    fontSize: 12,
    textAlign: 'center',
  },
  cellMeta: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
    paddingHorizontal: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
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
    padding: 14,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1b5e20' },
  modalSubtitle: { fontSize: 10, color: '#64748b', marginTop: 2 },
  closeModalButton: { padding: 4 },
  modalScroll: { maxHeight: 520 },
  modalContent: { padding: 12 },

  // Lot detail card
  lotDetailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 10,
  },
  lotDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  lotDetailText: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  lotDetailSubText: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 2 },
  lotDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  lotDetailMetaText: { fontSize: 12, color: '#64748b', fontWeight: '500', flexShrink: 1 },

  lotActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  actionBtnPrimary: {
    flex: 1,
    minWidth: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b4d3e',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnPrimaryText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  actionBtnEdit: {
    flex: 1,
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnEditText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  actionBtnDelete: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b91c1c',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnDeleteText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  actionBtnSecondary: {
    flex: 1,
    minWidth: 75,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnSecondaryText: { color: '#475569', fontSize: 11, fontWeight: '700' },

  // Delete Confirm Modal
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmIconRow: { alignItems: 'center', marginBottom: 12 },
  confirmIconBgDelete: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmIconBgWarning: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#b91c1c', textAlign: 'center', marginBottom: 4 },
  warningTitle: { fontSize: 18, fontWeight: '800', color: '#b45309', textAlign: 'center', marginBottom: 4 },
  confirmSubtitle: { fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 18, lineHeight: 18 },
  confirmDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  confirmValue: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
  confirmLocation: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: 'hidden',
  },
  bulkRackList: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 18,
  },
  confirmDivider: { height: 1, backgroundColor: '#e2e8f0' },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  btnCancelText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  btnDeleteConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    minWidth: 90,
    alignItems: 'center',
  },
  btnWarningConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#d97706',
    minWidth: 90,
    alignItems: 'center',
  },
  btnConfirmText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  // Edit Card
  editCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  editModalTitle: { fontSize: 18, fontWeight: '800', color: '#1b4d3e', marginBottom: 16 },
  fieldWrapper: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' },
  lockedInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lockedInputText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  btnSaveEdit: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#d97706',
    minWidth: 100,
    alignItems: 'center',
  },

  selectActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  selectCancelButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  selectCancelText: { color: '#475569', fontSize: 14, fontWeight: '800' },
  selectDeleteButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
  },
  selectDeleteButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  selectDeleteText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  // Empty rack
  emptyRackContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyRackText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  addHereButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  addHereButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Modal footer
  modalCloseFooterBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCloseFooterText: { fontSize: 12, color: '#475569', fontWeight: '700' },

  // Supervisor Mgmt Modals
  mgmtModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mgmtModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  mgmtModalTitle: { fontSize: 18, fontWeight: '800', color: '#1b4d3e' },
  
  // Area Form
  addAreaForm: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  formSectionTitle: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 10, textTransform: 'uppercase' },
  formRow: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  addAreaBtn: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAreaBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  btnDisabled: { backgroundColor: '#94a3b8' },
  
  listSectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  
  // Area Row
  areaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  areaRowCode: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  areaRowLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  areaRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeStatusText: { fontSize: 12, fontWeight: '700', marginRight: 4 },

  // Profile Row
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  profileEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  profileRowRight: { alignItems: 'flex-end', gap: 6 },
  profileRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  profileRoleText: { color: '#ffffff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  roleToggleBtn: {
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleToggleBtnText: { color: '#059669', fontSize: 10, fontWeight: '700' },
  
  manageAreasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    width: 86,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  manageAreasBtnCompact: { width: 82, gap: 3 },
  manageAreasBtnText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '800',
  },
  // ── Manage Areas Inline Screen Styles ────────────────────────
  areaMgmtScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f1f5f9',
    zIndex: 100,
    elevation: 100,
  },
  areaMgmtHeader: {
    backgroundColor: '#1b4d3e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  areaMgmtTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  areaMgmtCloseBtn: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  areaMgmtBackBtn: {
    padding: 4,
    borderRadius: 6,
  },
  areaMgmtBody: {
    padding: 16,
    paddingBottom: 40,
  },

  // Switch Mode Banner
  switchBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  switchBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 2,
  },
  switchBannerSub: {
    fontSize: 12,
    color: '#b45309',
    marginBottom: 12,
  },
  switchBannerActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  switchCancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchCancelText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  switchConfirmBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 7,
    backgroundColor: '#d97706',
  },
  switchConfirmText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Mode selector card
  modeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  modeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modeRowActive: {
    backgroundColor: '#1b4d3e',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#ffffff',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: '#ffffff',
  },
  modeLabelDim: {
    color: '#94a3b8',
  },

  // Form card
  areaMgmtFormCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  areaMgmtFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 5,
    marginTop: 2,
  },
  areaMgmtInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    fontWeight: '600',
  },

  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  validationErrorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  previewText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },

  areaMgmtActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  areaMgmtDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  areaMgmtDeleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  areaMgmtCreateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  areaMgmtCreateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  areaMgmtBtnDisabled: {
    opacity: 0.4,
  },

  // Legacy area list styles (kept for reference)
  areaItemDeleteBtn: {
    padding: 8,
  },
});
export default BoardScreen;
