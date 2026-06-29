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
  SectionList,
  ScrollView,
  Switch,
  TouchableWithoutFeedback,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useBoard } from '../../hooks/useBoard';
import { useRole } from '../../hooks/useRole';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../hooks/useNetwork';
import { AreaWithCount, Area } from '../../types';
import { Ionicons } from '@expo/vector-icons';

function cleanLotNumber(lot: string) {
  if (!lot) return '';
  return lot.replace(/-\d+$/, '');
}

// ─── Animated Rack Cell ────────────────────────────────────────
const RackCell = React.memo(({ area, columnWidth, isMatched, isTargetArea, shouldDim, hasYarn, lots, colors, descs, onPress }: {
  area: AreaWithCount | null;
  columnWidth: number;
  isMatched: boolean;
  isTargetArea: boolean;
  shouldDim: boolean;
  hasYarn: boolean;
  lots: string[];
  colors: string[];
  descs: string[];
  onPress: () => void;
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  if (!area) {
    return <View style={{ width: columnWidth, height: columnWidth, backgroundColor: 'transparent' }} />;
  }

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

  return (
    <Animated.View
      style={[
        styles.rackCell,
        {
          width: columnWidth,
          height: columnWidth,
          backgroundColor: cardBg,
          borderColor: isHighlighted ? animBorderColor : borderColor,
          borderWidth: isHighlighted ? animBorderWidth : 1,
          opacity: shouldDim ? 0.2 : 1.0, // Các ô lưới hiển thị bình thường khi offline
        },
        isHighlighted && styles.highlightedCell,
      ]}
    >
      <TouchableOpacity
        style={styles.rackCellTouchable}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <View style={styles.cellLine1Container}>
          <Text style={[styles.cellLocation, { color: locColor }]} numberOfLines={1}>
            {area.code}
          </Text>
          {hasYarn && lots.length > 1 && (
            <View style={styles.badgeContainer}>
              <Text style={[styles.badgeText, { color: isHighlighted ? '#1b4d3e' : '#64748b' }]}>
                +{lots.length - 1}
              </Text>
            </View>
          )}
        </View>

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
  const { session, setGuestMode } = useAuth();
  const { areas, loading, error, refetch } = useBoard(session);
  const { isOnline } = useNetwork();
  const { role } = useRole();
  const sectionListRef = useRef<SectionList>(null);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const searchLot = params.searchLot;
  const openAreaId = params.openAreaId;

  const [searchLotInput, setSearchLotInput] = useState('');
  const [searchColorInput, setSearchColorInput] = useState('');
  const [searchDescInput, setSearchDescInput] = useState('');

  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── LOGIC RESPONSIVE: 4 cột màn nhỏ, 6 cột màn lớn ──
  const isLargeScreen = screenWidth >= 768;
  const numColumns = isLargeScreen ? 6 : 4;

  const horizontalPadding = isLargeScreen ? 32 : 16;     // mobile ít padding hơn để cell rộng hơn
  const gap = 4;

  // appMaxWidth: giới hạn tối đa trên laptop (tránh cell quá rộng)
  const MAX_CELL_SIZE = isLargeScreen ? 76 : 96;
  const appMaxWidth = numColumns * MAX_CELL_SIZE + (numColumns - 1) * gap + horizontalPadding;

  // containerWidth: lấy toàn bộ màn hình, nhưng không vượt quá appMaxWidth
  const containerWidth = Math.min(screenWidth, appMaxWidth);
  const availableWidth = containerWidth - horizontalPadding;

  // columnWidth: luôn tính từ availableWidth thực tế → cells tự fill màn hình
  const columnWidth = Math.floor((availableWidth - (numColumns - 1) * gap) / numColumns);

  const columnWidthRef = useRef(columnWidth);
  useEffect(() => {
    columnWidthRef.current = columnWidth;
  }, [columnWidth]);

  // Supervisor Panels State
  const [editingYarn, setEditingYarn] = useState<any>(null);
  const [isEditingLot, setIsEditingLot] = useState(false);
  const [editLotCode, setEditLotCode] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLotError, setEditLotError] = useState<string | null>(null);
  const [editLotSuccess, setEditLotSuccess] = useState(false);

  // Add Lot State
  const [showAddLot, setShowAddLot] = useState(false);
  const [addLotAreaId, setAddLotAreaId] = useState<string | null>(null);
  const [addLotAreaCode, setAddLotAreaCode] = useState<string>('');
  const [addLotCode, setAddLotCode] = useState('');
  const [addColor, setAddColor] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [isAddingLot, setIsAddingLot] = useState(false);
  const [addLotError, setAddLotError] = useState<string | null>(null);
  const [addLotSuccess, setAddLotSuccess] = useState(false);

  // Areas Management
  const [showAreaMgmt, setShowAreaMgmt] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [areaMgmtMode, setAreaMgmtMode] = useState<'single' | 'multiple' | 'single'>('single');
  const [singleCode, setSingleCode] = useState('');
  const [multiPrefix, setMultiPrefix] = useState('');
  const [multiFrom, setMultiFrom] = useState('');
  const [multiTo, setMultiTo] = useState('');
  const [pendingMode, setPendingMode] = useState<'single' | 'multiple' | null>(null);

  // Area mgmt confirm modal (replaces Alert.alert for web compatibility)
  const [areaMgmtConfirm, setAreaMgmtConfirm] = useState<{
    title: string;
    message: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

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
    ? 'To must be greater than or equal to From' : '';

  // Helper to close panel and return safely to board
  const handleCloseAreaMgmt = useCallback(() => {
    setShowAreaMgmt(false);
    setSingleCode('');
    setMultiPrefix('');
    setMultiFrom('');
    setMultiTo('');
    setPendingMode(null);
    setAreaMgmtConfirm(null);
  }, []);

  const [selectedArea, setSelectedArea] = useState<AreaWithCount | null>(null);
  const [cachedArea, setCachedArea] = useState<AreaWithCount | null>(null);
  const [areaToRestore, setAreaToRestore] = useState<AreaWithCount | null>(null);

  useEffect(() => { if (selectedArea) setCachedArea(selectedArea); }, [selectedArea]);
  const displayArea = selectedArea || cachedArea;
  const handleCloseModal = useCallback(() => setSelectedArea(null), []);

  // BackHandler to support Android physical back button navigation
  useEffect(() => {
    const onBackPress = () => {
      if (showAreaMgmt) {
        handleCloseAreaMgmt();
        return true;
      }
      if (selectedArea) {
        handleCloseModal();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showAreaMgmt, selectedArea, handleCloseAreaMgmt, handleCloseModal]);

  const fetchAreasForMgmt = useCallback(async () => {
    setLoadingAreas(true);
    const { data, error } = await supabase.from('areas').select('*').order('code', { ascending: true });
    if (!error && data) setAllAreas(data);
    setLoadingAreas(false);
  }, []);

  useEffect(() => { if (showAreaMgmt) fetchAreasForMgmt(); }, [showAreaMgmt]);

  const trySetMode = (mode: 'single' | 'multiple') => {
    if (mode === areaMgmtMode) return;
    const hasInput = areaMgmtMode === 'single' ? singleHasData : multiHasData;
    if (hasInput) setPendingMode(mode); else setAreaMgmtMode(mode);
  };
  const confirmSwitchMode = () => {
    if (!pendingMode) return; setAreaMgmtMode(pendingMode); setSingleCode(''); setMultiPrefix(''); setMultiFrom(''); setMultiTo(''); setPendingMode(null);
  };
  const cancelSwitchMode = () => setPendingMode(null);

  const handleSingleCreate = async () => { 
    const code = singleCode.trim().toUpperCase(); if (!code) return;
    const perform = async () => {
      setAreaMgmtConfirm(null);
      setSavingArea(true);
      const { error } = await supabase.from('areas').insert({ code, label: null });
      setSavingArea(false);
      if (error) { Alert.alert('Error', error.message); }
      else { setSingleCode(''); fetchAreasForMgmt(); refetch(); setShowAreaMgmt(false); Alert.alert('Success', `Rack ${code} created.`); }
    };
    setAreaMgmtConfirm({ title: 'Confirm Create', message: `Create Rack ${code}?`, destructive: false, onConfirm: perform });
  };

  const handleSingleDelete = async () => { 
    const code = singleCode.trim().toUpperCase(); if (!code) return;
    const area = allAreas.find(a => a.code.toUpperCase() === code);
    if (!area) { Alert.alert('Not Found', `Rack ${code} not found.`); return; }
    const { count } = await supabase.from('yarn_rolls').select('*', { count: 'exact', head: true }).eq('area_id', area.id).eq('is_deleted', false);
    if (count && count > 0) { Alert.alert('Cannot Delete', `Rack ${code} contains active rolls.`); return; }
    const perform = async () => {
      setAreaMgmtConfirm(null);
      setSavingArea(true);
      const { error } = await supabase.from('areas').delete().eq('id', area.id);
      setSavingArea(false);
      if (error) { Alert.alert('Error', error.message); }
      else { setSingleCode(''); fetchAreasForMgmt(); refetch(); setShowAreaMgmt(false); Alert.alert('Success', `Rack ${code} deleted.`); }
    };
    setAreaMgmtConfirm({ title: 'Confirm Delete', message: `Delete Rack ${code}?`, destructive: true, onConfirm: perform });
  };

  const buildMultiCodes = () => {
    const prefix = multiPrefix.trim().toUpperCase(); const codes: string[] = [];
    for (let i = multiFromNum; i <= multiToNum; i++) codes.push(`${prefix}.${i}`);
    return codes;
  };

  const handleMultiCreate = async () => { 
    const codes = buildMultiCodes(); if (codes.length === 0) return;
    const perform = async () => {
      setAreaMgmtConfirm(null);
      setSavingArea(true);
      const rows = codes.map(code => ({ code, label: null }));
      const { error } = await supabase.from('areas').insert(rows);
      setSavingArea(false);
      if (error) { Alert.alert('Error', error.message); }
      else { setMultiPrefix(''); setMultiFrom(''); setMultiTo(''); fetchAreasForMgmt(); refetch(); setShowAreaMgmt(false); Alert.alert('Success', `Created ${codes.length} racks.`); }
    };
    setAreaMgmtConfirm({ title: 'Confirm Create', message: `Create ${codes.length} racks (${multiPrefix.trim().toUpperCase()}.${multiFromNum} → ${multiPrefix.trim().toUpperCase()}.${multiToNum})?`, destructive: false, onConfirm: perform });
  };

  const handleMultiDelete = async () => { 
    const codes = buildMultiCodes(); if (codes.length === 0) return;
    const perform = async () => {
      setAreaMgmtConfirm(null);
      setSavingArea(true);
      let deletedCount = 0; let failedCodes: string[] = [];
      for (const code of codes) {
        const area = allAreas.find(a => a.code.toUpperCase() === code);
        if (!area) { failedCodes.push(`${code}(not found)`); continue; }
        const { count } = await supabase.from('yarn_rolls').select('*', { count: 'exact', head: true }).eq('area_id', area.id).eq('is_deleted', false);
        if (count && count > 0) { failedCodes.push(`${code}(occupied)`); continue; }
        const { error } = await supabase.from('areas').delete().eq('id', area.id);
        if (error) failedCodes.push(`${code}(err)`); else deletedCount++;
      }
      setSavingArea(false);
      fetchAreasForMgmt(); refetch();
      const resMsg = failedCodes.length > 0 ? `Deleted: ${deletedCount}. Failed: ${failedCodes.join(', ')}` : `Deleted ${deletedCount} racks.`;
      if (deletedCount > 0) setShowAreaMgmt(false);
      setMultiPrefix(''); setMultiFrom(''); setMultiTo('');
      Alert.alert(failedCodes.length > 0 ? 'Partial Success' : 'Success', resMsg);
    };
    setAreaMgmtConfirm({ title: 'Confirm Delete', message: `Delete ${codes.length} racks?`, destructive: true, onConfirm: perform });
  };

  const [deleteConfirmYarn, setDeleteConfirmYarn] = useState<any>(null);
  const [deleteConfirmArea, setDeleteConfirmArea] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  async function handleLogout() {
    try { await setGuestMode(false); if (session) await supabase.auth.signOut(); router.replace('/login'); } 
    catch { Alert.alert('Error', 'Failed to sign out.'); }
  }

  const sortedAreas = useMemo(() => {
    return [...areas].sort((a, b) => {
      const secA = a.code[0]; const secB = b.code[0];
      if (secA !== secB) return secA.localeCompare(secB);
      const restA = a.code.substring(1).split(/[.\/-]/); const restB = b.code.substring(1).split(/[.\/-]/);
      const rowA = parseInt(restA[0], 10) || 0; const rowB = parseInt(restB[0], 10) || 0;
      if (rowA !== rowB) return rowA - rowB;
      return (parseInt(restA[1], 10) || 0) - (parseInt(restB[1], 10) || 0);
    });
  }, [areas]);

  // ── LOGIC LAYOUT: MẶC ĐỊNH LUÔN LUÔN LÀ PAIRED ──
  const groupedSectionsForList = useMemo(() => {
    const groups: { [key: string]: AreaWithCount[] } = {};
    sortedAreas.forEach((area) => {
      const section = area.code[0].toUpperCase();
      if (!groups[section]) groups[section] = [];
      groups[section].push(area);
    });

    const pairedGroups = [];
    const keys = Object.keys(groups).sort();
    const colsPerSection = 2; // Luôn tạo nhóm 2 cột để ghép Paired
    const sectionsPerGroup = Math.max(1, Math.floor(numColumns / colsPerSection)); 

    for (let i = 0; i < keys.length; i += sectionsPerGroup) {
      const groupKeys = keys.slice(i, i + sectionsPerGroup);
      const firstKey = groupKeys[0]; 
      
      const lists = groupKeys.map(k => groups[k] || []);
      const maxLen = Math.max(...lists.map(l => l.length));

      const rows: (AreaWithCount | null)[][] = [];

      for (let j = 0; j < maxLen; j += colsPerSection) {
        const row = [];
        for (let s = 0; s < sectionsPerGroup; s++) {
          const currentList = lists[s] || [];
          for (let k = 0; k < colsPerSection; k++) {
            row.push(currentList[j + k] || null);
          }
        }
        rows.push(row);
      }

      pairedGroups.push({
        key: firstKey,
        title: `Rack ${firstKey}`, 
        data: rows,
        isPaired: true,
        groupKeys: groupKeys,
        colsPerSection,
        groupLists: lists
      });
    }
    return pairedGroups;
  }, [sortedAreas, numColumns]);

  // ── SEARCH MATCHING ──
  const activeLot = searchLotInput.trim().toLowerCase();
  const activeColor = searchColorInput.trim().toLowerCase();
  const activeDesc = searchDescInput.trim().toLowerCase();
  const isSearchActive = activeLot.length > 0 || activeColor.length > 0 || activeDesc.length > 0;

  const isCardMatched = useCallback(
    (area: AreaWithCount | null) => {
      if (!isSearchActive || !area) return false;
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

  const targetScrollLocation = useRef<{ sectionIndex: number; itemIndex: number } | null>(null);
  const searchScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchScroll = useCallback((qLot: string, qColor: string, qDesc: string) => {
    const lot = qLot.trim().toLowerCase(); const col = qColor.trim().toLowerCase(); const des = qDesc.trim().toLowerCase();
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
      const rowIndex = sec.data.findIndex(row => row.some(cell => cell?.id === matchedArea.id));
      if (rowIndex !== -1) {
        targetScrollLocation.current = { sectionIndex: s, itemIndex: rowIndex };
        if (searchScrollTimeoutRef.current) clearTimeout(searchScrollTimeoutRef.current);
        searchScrollTimeoutRef.current = setTimeout(() => {
          try { sectionListRef.current?.scrollToLocation({ sectionIndex: s, itemIndex: rowIndex, viewPosition: 0, viewOffset: 30, animated: true }); } 
          catch (e) { }
        }, 300);
        break;
      }
    }
  }, [groupedSectionsForList, sortedAreas]);

  useEffect(() => {
    if (searchLot && groupedSectionsForList.length > 0) {
      setSearchLotInput(searchLot); handleSearchScroll(searchLot, searchColorInput, searchDescInput);
    }
  }, [searchLot, groupedSectionsForList]);
  useEffect(() => {
    if (openAreaId && groupedSectionsForList.length > 0) {
      const targetArea = sortedAreas.find((a) => a.id === openAreaId);
      if (targetArea) {
        setSelectedArea(targetArea);
        for (let s = 0; s < groupedSectionsForList.length; s++) {
          const sec = groupedSectionsForList[s];
          const rowIndex = sec.data.findIndex(row => row.some(cell => cell?.id === openAreaId));
          if (rowIndex !== -1) {
            targetScrollLocation.current = { sectionIndex: s, itemIndex: rowIndex };
            const timer = setTimeout(() => {
              try { sectionListRef.current?.scrollToLocation({ sectionIndex: s, itemIndex: rowIndex, viewPosition: 0, viewOffset: 30, animated: true }); } 
              catch (e) { }
            }, 400);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [openAreaId, groupedSectionsForList, sortedAreas]);

  const handleClearSearch = () => {
    setSearchLotInput(''); setSearchColorInput(''); setSearchDescInput('');
    router.setParams({ searchLot: undefined, openAreaId: undefined });
  };

  const confirmDeleteLot = (yarn: any, areaCode: string) => {
    if (role !== 'supervisor' && role !== 'admin') { Alert.alert('Permission Required', 'Not allowed.'); return; }
    setAreaToRestore(selectedArea); setSelectedArea(null);
    setTimeout(() => { setDeleteConfirmYarn(yarn); setDeleteConfirmArea(areaCode); }, 50);
  };
  const cancelDeleteLot = () => {
    setDeleteConfirmYarn(null);
    if (areaToRestore) { setTimeout(() => { setSelectedArea(areaToRestore); setAreaToRestore(null); }, 50); }
  };
  const executeDelete = async () => { 
    if (!deleteConfirmYarn || !isOnline) return; setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const operatorEmail = user?.email || 'Operator';
      const { error: logError } = await supabase.from('move_logs').insert({
        yarn_roll_id: deleteConfirmYarn.id, 
        action: 'DELETE', 
        yarn_code: deleteConfirmYarn.yarn_code, 
        from_area_code: deleteConfirmArea,
        from_area_id: deleteConfirmYarn.area_id,
        moved_by: user?.id, 
        note: JSON.stringify({ action: 'DELETE', operator: operatorEmail, details: `Lot deleted from floor`, color: deleteConfirmYarn.color || null, description: deleteConfirmYarn.description || null }),
      });
      if (logError) throw new Error('History Log Error: ' + logError.message);

      const { error: updateError } = await supabase.from('yarn_rolls').update({ is_deleted: true }).eq('id', deleteConfirmYarn.id);
      if (updateError) throw updateError;

      setDeleteConfirmYarn(null); setDeleteConfirmArea(''); setAreaToRestore(null); handleCloseModal(); refetch(); Alert.alert('Success', 'Lot deleted.');
    } catch (err: any) { Alert.alert('Error', err.message); } finally { setIsDeleting(false); }
  };

  const handleOpenAddModal = (areaId: string, areaCode: string) => {
    handleCloseModal(); 
    setAddLotAreaId(areaId); 
    setAddLotAreaCode(areaCode); 
    setAddLotCode(''); 
    setAddColor(''); 
    setAddDesc(''); 
    setAddLotError(null);
    setAddLotSuccess(false);
    setShowAddLot(true);
  };
  
  const executeAddLot = async () => {
    const baseCode = addLotCode.trim().toUpperCase();
    if (!baseCode) { setAddLotError('Please enter a LOT code.'); return; }
    if (!isOnline) return;
    setAddLotError(null);
    setIsAddingLot(true);

    try {
      // 1. Kiểm tra Lot đã tồn tại chưa — join areas để lấy code hiển thị lỗi
      const { data: existingRoll, error: checkError } = await supabase
        .from('yarn_rolls')
        .select('id, is_deleted, area_id, areas(code)')
        .eq('yarn_code', baseCode);

      if (checkError) throw checkError;

      // Dùng === để tránh null bị nhầm
      const activeRoll = existingRoll?.find((r: any) => r.is_deleted === false);
      const deletedRoll = existingRoll?.find((r: any) => r.is_deleted === true);

      if (activeRoll) {
        const existingAreaCode = (activeRoll.areas as any)?.code || 'another location';
        setAddLotError(`LOT "${baseCode}" already exists at ${existingAreaCode}.`);
        setIsAddingLot(false);
        return;
      }

      let userId = null;
      let operatorEmail = 'Operator';
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          userId = authData.user.id;
          operatorEmail = authData.user.email || 'Operator';
        }
      } catch (e) {
        // Fallback an toàn
      }

      let rollId = null;

      if (deletedRoll) {
        // RE-ACTIVATE lot đã bị xóa — tránh lỗi UNIQUE constraint
        const { data: updateData, error: updateError } = await supabase
          .from('yarn_rolls')
          .update({
            area_id: addLotAreaId,
            color: addColor.trim() || null,
            description: addDesc.trim() || null,
            is_deleted: false,
          })
          .eq('id', deletedRoll.id)
          .select();

        if (updateError) throw updateError;
        rollId = updateData?.[0]?.id;
      } else {
        // INSERT mới
        const { data: insertData, error: insertError } = await supabase
          .from('yarn_rolls')
          .insert({
            yarn_code: baseCode,
            area_id: addLotAreaId,
            color: addColor.trim() || null,
            description: addDesc.trim() || null,
            is_deleted: false,
          })
          .select();

        if (insertError) throw insertError;
        rollId = insertData?.[0]?.id;
      }

      if (!rollId) throw new Error('Could not process the lot in the database.');

      // Log lịch sử
      const { error: logError } = await supabase.from('move_logs').insert({
        yarn_roll_id: rollId,
        action: 'CREATE',
        yarn_code: baseCode,
        to_area_code: addLotAreaCode,
        to_area_id: addLotAreaId,
        moved_by: userId,
        note: JSON.stringify({ action: 'CREATE', operator: operatorEmail, details: `Created lot ${baseCode} at ${addLotAreaCode}`, color: addColor.trim() || null, description: addDesc.trim() || null }),
      });
      if (logError) throw new Error('History Log Error: ' + logError.message);

      // Hiện success, đóng sau 8s
      setAddLotSuccess(true);
      refetch();
      setTimeout(() => {
        setShowAddLot(false);
        setAddLotSuccess(false);
      }, 800);
    } catch (err: any) { 
      setAddLotError(err.message || 'An error occurred. Please try again.');
    } finally { 
      setIsAddingLot(false); 
    }
  };

  const executeEditLot = async () => {  
    if (!editLotCode.trim()) {
      setEditLotError('LOT CODE is required.');
      return;
    }
    if (!isOnline) return;
    setEditLotError(null);
    setIsEditingLot(true);
    try {
      let userId = null;
      let operatorEmail = 'Guest Operator';
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          userId = authData.user.id;
          operatorEmail = authData.user.email || 'Operator';
        }
      } catch (e) {
        // Fallback an toàn
      }

      // Lưu giá trị cũ trước khi cập nhật
      const oldLotCode = (editingYarn.yarn_code || '').replace(/-\d+$/, '');
      const oldColor = editingYarn.color || null;
      const oldDescription = editingYarn.description || null;

      const { error: updateError } = await supabase
        .from('yarn_rolls')
        .update({ 
          yarn_code: editLotCode.trim(), 
          color: editColor.trim() || null, 
          description: editDesc.trim() || null 
        })
        .eq('id', editingYarn.id);

      if (updateError) throw updateError;
      
      const { error: logError } = await supabase.from('move_logs').insert({
        yarn_roll_id: editingYarn.id,
        action: 'EDIT',
        yarn_code: editLotCode.trim(),
        from_area_code: editingYarn.currentAreaCode || null,
        from_area_id: editingYarn.area_id,
        moved_by: userId,
        note: JSON.stringify({
          action: 'EDIT',
          operator: operatorEmail,
          old: { lot: oldLotCode, color: oldColor, description: oldDescription },
          new: { lot: editLotCode.trim(), color: editColor.trim() || null, description: editDesc.trim() || null },
        }),
      });
      if (logError) throw new Error('History Log Error: ' + logError.message);

      // Hiện success, đóng sau 1.2s
      setEditLotSuccess(true);
      refetch();
      setTimeout(() => {
        setEditingYarn(null);
        setEditLotSuccess(false);
      }, 1200);
    } catch (err: any) { 
      setEditLotError(err.message || 'An error occurred.');
    } finally { 
      setIsEditingLot(false); 
    }
  };

  const totalRacks = sortedAreas.length;
  const occupiedRacks = sortedAreas.filter((a) => (a.yarn_count ?? 0) > 0).length;

  return (
    <View style={styles.safeArea}>
      <View style={[styles.mainAppContainer, { maxWidth: appMaxWidth, width: '100%' }]}>
        
        {/* Offline Banner */}
        {!isOnline && (
          <View style={{ backgroundColor: '#fef3c7', padding: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <Ionicons name="cloud-offline" size={16} color="#b45309" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#b45309' }}>Offline: Viewing cached data. Editing disabled.</Text>
          </View>
        )}

        {/* Header - Nút Logout bên ngoài đối với Worker và Menu ☰ đối với Admin/Supervisor */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Rack Board</Text>
            <View style={styles.roleRow}>
              <Text style={styles.headerSub}>{occupiedRacks}/{totalRacks} occupied</Text>
              {role === 'supervisor' ? (
                <View style={[styles.roleBadge, styles.roleSupervisor]}><Text style={styles.roleBadgeText}>Supervisor</Text></View>
              ) : role === 'admin' ? (
                <View style={[styles.roleBadge, styles.roleAdmin]}><Text style={styles.roleBadgeText}>Admin</Text></View>
              ) : (
                <View style={[styles.roleBadge, styles.roleWorker]}><Text style={styles.roleBadgeText}>Worker</Text></View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            {role === 'worker' ? (
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonOutside}>
                <Ionicons name="log-out-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutButtonOutsideText}>Logout</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuButton}>
                <Ionicons name="menu" size={26} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Menu Dropdown Modal (Chỉ dành cho Admin & Supervisor) */}
        {isMenuOpen && (
          <Modal visible={true} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
            <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
              <View style={styles.menuOverlay}>
                <View style={[styles.menuBoundingBox, { maxWidth: appMaxWidth }]}>
                  <TouchableWithoutFeedback>
                    <View style={[styles.menuContent, { top: insets.top + 45 }]}>
                      
                      {/* Manage Areas (Supervisor/Admin) */}
                      {(role === 'supervisor' || role === 'admin') && isOnline && (
                        <TouchableOpacity 
                          style={styles.menuItem} 
                          onPress={() => { setIsMenuOpen(false); setShowAreaMgmt(true); }}
                        >
                          <Ionicons name="location-outline" size={18} color="#1e293b" />
                          <Text style={styles.menuItemText}>Manage Areas</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.menuDivider} />
                      
                      {/* Logout */}
                      <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => { setIsMenuOpen(false); handleLogout(); }}
                      >
                        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
                        <Text style={[styles.menuItemText, { color: '#dc2626' }]}>Logout</Text>
                      </TouchableOpacity>
                      
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {/* Real-time Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="barcode-outline" size={14} color="#718096" style={styles.searchIcon} />
              <TextInput style={styles.searchInput} placeholder="Lot" value={searchLotInput} onChangeText={(t) => { setSearchLotInput(t); handleSearchScroll(t, searchColorInput, searchDescInput); }} autoCapitalize="characters" placeholderTextColor="#a0aec0" />
            </View>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="color-palette-outline" size={14} color="#718096" style={styles.searchIcon} />
              <TextInput style={styles.searchInput} placeholder="Color" value={searchColorInput} onChangeText={(t) => { setSearchColorInput(t); handleSearchScroll(searchLotInput, t, searchDescInput); }} autoCapitalize="none" placeholderTextColor="#a0aec0" />
            </View>
            <View style={[styles.searchInputWrapper, { marginRight: 0 }]}>
              <Ionicons name="text-outline" size={14} color="#718096" style={styles.searchIcon} />
              <TextInput style={styles.searchInput} placeholder="Desc" value={searchDescInput} onChangeText={(t) => { setSearchDescInput(t); handleSearchScroll(searchLotInput, searchColorInput, t); }} autoCapitalize="none" placeholderTextColor="#a0aec0" />
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

        {/* Bảng chứa lưới Rack */}
        <SectionList
          ref={sectionListRef}
          sections={groupedSectionsForList}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#1b4d3e" />}
          stickySectionHeadersEnabled={true}
          showsVerticalScrollIndicator={true}
          initialNumToRender={40}
          windowSize={21}
          maxToRenderPerBatch={30}
          getItemLayout={(data, index) => {
            const SECTION_HEADER_HEIGHT = 38; // height 30 + marginTop 8
            const ROW_HEIGHT = columnWidthRef.current + 2; 

            let offset = 0;
            let flatIndex = 0;
            for (const section of groupedSectionsForList) {
              if (flatIndex === index) return { length: SECTION_HEADER_HEIGHT, offset, index };
              offset += SECTION_HEADER_HEIGHT;
              flatIndex++;

              for (let r = 0; r < section.data.length; r++) {
                if (flatIndex === index) return { length: ROW_HEIGHT, offset, index };
                offset += ROW_HEIGHT;
                flatIndex++;
              }

              if (flatIndex === index) return { length: 0, offset, index };
              flatIndex++;
            }
            return { length: ROW_HEIGHT, offset: 0, index };
          }}
          renderSectionHeader={({ section }) => {
            if (section.isPaired && section.groupKeys) {
              return (
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  {section.groupKeys.map((k: string, idx: number) => {
                    const list = section.groupLists[idx];
                    let occupied = 0;
                    list.forEach((a: AreaWithCount) => { if ((a.yarn_count ?? 0) > 0) occupied++; });
                    
                    const blockWidth = section.colsPerSection * columnWidthRef.current + (section.colsPerSection - 1) * gap;
                    
                    return (
                      <View 
                        key={k} 
                        style={[
                          styles.sectionHeader, 
                          { 
                            marginTop: 0,
                            width: blockWidth, 
                            marginRight: idx < section.groupKeys.length - 1 ? gap : 0 
                          }
                        ]}
                      >
                        <View style={styles.sectionHeaderLeft}>
                          <View style={styles.sectionDot} />
                          <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>Rack {k}</Text>
                        </View>
                        <Text style={styles.sectionCount}>{occupied}/{list.length}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            }

            let occupied = 0;
            let total = 0;
            section.data.forEach((row: any) => {
              row.forEach((cell: any) => {
                if (cell) {
                  total++;
                  if ((cell.yarn_count ?? 0) > 0) occupied++;
                }
              });
            });

            return (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Rack {section.key}</Text>
                </View>
                <Text style={styles.sectionCount}>{occupied}/{total}</Text>
              </View>
            );
          }}
          renderItem={({ item }) => (
            <View style={styles.rowGrid}>
              {item.map((area: AreaWithCount | null, index: number) => {
                if (!area) {
                  return <RackCell key={`empty-${index}`} area={null} columnWidth={columnWidthRef.current} isMatched={false} isTargetArea={false} shouldDim={false} hasYarn={false} lots={[]} colors={[]} descs={[]} onPress={() => {}} />;
                }

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
                const shouldDim = isSearchActive && !isMatched;

                return (
                  <RackCell
                    key={area.id}
                    area={area}
                    columnWidth={columnWidthRef.current}
                    isMatched={isMatched}
                    isTargetArea={isTargetArea}
                    shouldDim={shouldDim}
                    hasYarn={hasYarn}
                    lots={lots}
                    colors={colors}
                    descs={descs}
                    onPress={() => {
                      if (hasYarn) { 
                        setSelectedArea(area); 
                      } 
                      else if (role === 'supervisor' || role === 'admin') { 
                        // Cho phép bấm mở bình thường, nút xác nhận lưu bên trong mới bị mờ và disable khi offline
                        handleOpenAddModal(area.id, area.code); 
                      } 
                      else { 
                        Alert.alert('Supervisor Required', 'Restricted to supervisors only.'); 
                      }
                    }}
                  />
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{loading ? 'Loading board...' : 'No rack locations found.'}</Text>
            </View>
          }
        />

        {/* Lot Action Modal */}
        {selectedArea !== null && (
          <Modal visible={true} transparent={true} animationType="fade" onRequestClose={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{displayArea?.code}</Text>
                  <Text style={styles.modalSubtitle}>{displayArea?.yarn_count ? `${displayArea.yarn_count} LOT(s) stored` : 'Empty rack'}</Text>
                </View>
                <TouchableOpacity onPress={handleCloseModal} style={styles.closeModalButton}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
              </View>
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
                              {yarn.color && <View style={styles.lotDetailMeta}><Ionicons name="color-palette-outline" size={11} color="#64748b" /><Text style={styles.lotDetailMetaText}>{yarn.color}</Text></View>}
                              {yarn.description && <View style={styles.lotDetailMeta}><Ionicons name="text-outline" size={11} color="#64748b" /><Text style={styles.lotDetailMetaText}>{yarn.description}</Text></View>}
                            </View>
                          </View>
                          <View style={styles.lotActions}>
                            {(role === 'supervisor' || role === 'admin') && (
                              <>
                                {/* Nút Edit: Tự động mờ đi (opacity 0.5) và bị vô hiệu hóa khi offline */}
                                <TouchableOpacity 
                                  style={[
                                    styles.actionBtnPrimary, 
                                    { backgroundColor: '#e8f0fe' },
                                    !isOnline && { backgroundColor: '#f1f5f9', opacity: 0.5 }
                                  ]} 
                                  disabled={!isOnline}
                                  onPress={() => { 
                                    handleCloseModal(); 
                                    setEditingYarn({ ...yarn, currentAreaCode: displayArea?.code }); 
                                    setEditLotCode(cleanedLot); 
                                    setEditColor(yarn.color || ''); 
                                    setEditDesc(yarn.description || '');
                                    setEditLotError(null);
                                    setEditLotSuccess(false); 
                                  }}
                                >
                                  <Ionicons name="create-outline" size={14} color={isOnline ? "#1a73e8" : "#94a3b8"} />
                                  <Text style={[styles.actionBtnPrimaryText, { color: isOnline ? '#1a73e8' : '#94a3b8' }]}>Edit</Text>
                                </TouchableOpacity>

                                {/* Nút Delete: Tự động mờ đi (opacity 0.5) và bị vô hiệu hóa khi offline */}
                                <TouchableOpacity 
                                  style={[
                                    styles.actionBtnDelete,
                                    !isOnline && { backgroundColor: '#f1f5f9', opacity: 0.5 }
                                  ]} 
                                  disabled={!isOnline}
                                  onPress={() => confirmDeleteLot(yarn, displayArea?.code || '')}
                                >
                                  <Ionicons name="trash-outline" size={14} color={isOnline ? "#c5221f" : "#94a3b8"} />
                                  <Text style={[styles.actionBtnDeleteText, { color: isOnline ? '#c5221f' : '#94a3b8' }]}>Delete</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyRackContainer}>
                      <Ionicons name="cube-outline" size={36} color="#cbd5e1" />
                      <Text style={styles.emptyRackText}>This rack is empty</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Nút Add Lot màu xanh lá ở footer: Tự động mờ đi và bị vô hiệu hóa khi offline */}
              {(role === 'supervisor' || role === 'admin') ? (
                <TouchableOpacity 
                  style={[
                    styles.modalAddFooterBtn,
                    !isOnline && { backgroundColor: '#f1f5f9', borderTopColor: '#e2e8f0', opacity: 0.5 }
                  ]} 
                  disabled={!isOnline}
                  onPress={() => handleOpenAddModal(displayArea?.id || '', displayArea?.code || '')}
                >
                  <Ionicons name="add-circle-outline" size={16} color={isOnline ? "#137333" : "#94a3b8"} />
                  <Text style={[styles.modalAddFooterText, { color: isOnline ? '#137333' : '#94a3b8' }]}>Add Lot</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.modalCloseFooterBtn} onPress={handleCloseModal}>
                  <Text style={styles.modalCloseFooterText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
        )}

        {/* Add Lot Modal */}
        {showAddLot && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => { if (!isAddingLot) { setShowAddLot(false); setAddLotError(null); setAddLotSuccess(false); } }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editCard}>
                {/* Success state */}
                {addLotSuccess ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16, gap: 10 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="checkmark-circle" size={36} color="#059669" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#059669' }}>Added!</Text>
                    <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                      LOT <Text style={{ fontWeight: '800', color: '#16a34a' }}>{addLotCode.trim().toUpperCase()}</Text> added to <Text style={{ fontWeight: '800', color: '#16a34a' }}>{addLotAreaCode}</Text>
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.editModalTitle, { color: '#137333', textAlign: 'center', marginBottom: 16 }]}>
                      Add Lot to {addLotAreaCode}
                    </Text>

                    {/* Inline error banner */}
                    {addLotError && (
                      <View style={styles.addLotErrorBanner}>
                        <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                        <Text style={styles.addLotErrorText}>{addLotError}</Text>
                      </View>
                    )}

                    <View style={styles.fieldWrapper}>
                      <Text style={styles.fieldLabel}>LOT CODE (*)</Text>
                      <TextInput
                        style={[styles.textInput, addLotError && addLotCode.trim() === '' && { borderColor: '#fca5a5' }]}
                        value={addLotCode}
                        onChangeText={(t) => { setAddLotCode(t); setAddLotError(null); }}
                        placeholder="Enter LOT Code"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="characters"
                        editable={isOnline}
                      />
                    </View>
                    <View style={styles.fieldWrapper}>
                      <Text style={styles.fieldLabel}>COLOR</Text>
                      <TextInput style={styles.textInput} value={addColor} onChangeText={setAddColor} placeholder="Enter Color" placeholderTextColor="#94a3b8" editable={isOnline} />
                    </View>
                    <View style={styles.fieldWrapper}>
                      <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                      <TextInput style={styles.textInput} value={addDesc} onChangeText={setAddDesc} placeholder="Enter Description" placeholderTextColor="#94a3b8" editable={isOnline} />
                    </View>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowAddLot(false); setAddLotError(null); }} disabled={isAddingLot}>
                        <Text style={styles.btnCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      {/* Nút cuối cùng xác nhận Add Lot: Bị mờ đi và disable khi offline */}
                      <TouchableOpacity 
                        style={[
                          styles.btnSaveEdit, 
                          { backgroundColor: '#137333' },
                          !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
                        ]} 
                        onPress={executeAddLot} 
                        disabled={isAddingLot || !isOnline}
                      >
                        {isAddingLot ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmText}>Add Lot</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* Delete Confirm Modal */}
        {deleteConfirmYarn !== null && (
          <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => { if (!isDeleting) cancelDeleteLot(); }}>
            <View style={styles.modalOverlay}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmIconRow}><View style={styles.confirmIconBgDelete}><Ionicons name="trash" size={28} color="#b91c1c" /></View></View>
                <Text style={styles.confirmTitle}>Delete</Text>
                <View style={styles.confirmDetails}>
                  <View style={styles.confirmRow}><Text style={styles.confirmLabel}>LOT Number</Text><Text style={styles.confirmValue}>{cleanLotNumber(deleteConfirmYarn?.yarn_code || '')}</Text></View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}><Text style={styles.confirmLabel}>Location</Text><Text style={styles.confirmLocation}>{deleteConfirmArea}</Text></View>
                </View>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.btnCancel} onPress={cancelDeleteLot} disabled={isDeleting}><Text style={styles.btnCancelText}>Cancel</Text></TouchableOpacity>
                  {/* Nút cuối cùng xác nhận Delete: Bị mờ đi và disable khi offline */}
                  <TouchableOpacity 
                    style={[
                      styles.btnDeleteConfirm,
                      !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
                    ]} 
                    onPress={executeDelete} 
                    disabled={isDeleting || !isOnline}
                  >
                    {isDeleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmText}>Delete</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Edit Lot Modal */}
        {editingYarn !== null && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => { if (!isEditingLot) { setEditingYarn(null); setEditLotError(null); setEditLotSuccess(false); } }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editCard}>
                {/* Success state */}
                {editLotSuccess ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16, gap: 10 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#e8f0fe', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="checkmark-circle" size={36} color="#1a73e8" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a73e8' }}>Updated!</Text>
                    <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                      LOT <Text style={{ fontWeight: '800', color: '#1a73e8' }}>{editLotCode.trim()}</Text> has been saved.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.editModalTitle, { color: '#1a73e8' }]}>Edit Lot Details</Text>

                    {/* Inline error banner */}
                    {editLotError && (
                      <View style={styles.addLotErrorBanner}>
                        <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                        <Text style={styles.addLotErrorText}>{editLotError}</Text>
                      </View>
                    )}

                    <View style={styles.fieldWrapper}>
                      <Text style={styles.fieldLabel}>LOT CODE (*)</Text>
                      <TextInput
                        style={[styles.textInput, editLotError && editLotCode.trim() === '' && { borderColor: '#fca5a5' }]}
                        value={editLotCode}
                        onChangeText={(t) => { setEditLotCode(t); setEditLotError(null); }}
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="characters"
                        editable={isOnline}
                      />
                    </View>
                    <View style={styles.fieldWrapper}>
                      <Text style={styles.fieldLabel}>COLOR</Text>
                      <TextInput style={styles.textInput} value={editColor} onChangeText={setEditColor} placeholderTextColor="#94a3b8" editable={isOnline} />
                    </View>
                    <View style={styles.fieldWrapper}>
                      <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                      <TextInput style={styles.textInput} value={editDesc} onChangeText={setEditDesc} placeholder="Enter Description" placeholderTextColor="#94a3b8" editable={isOnline} />
                    </View>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.btnCancel} onPress={() => { setEditingYarn(null); setEditLotError(null); }} disabled={isEditingLot}>
                        <Text style={styles.btnCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      {/* Nút xác nhận Save mờ đi và disable khi offline */}
                      <TouchableOpacity 
                        style={[
                          styles.btnSaveEdit, 
                          { backgroundColor: '#1a73e8' },
                          !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
                        ]} 
                        onPress={executeEditLot} 
                        disabled={isEditingLot || !isOnline}
                      >
                        {isEditingLot ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmText}>Save Details</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* Area Management Modal Inline */}
        {showAreaMgmt && (
          <View style={styles.areaMgmtScreen}>
            <View style={[styles.areaMgmtHeader, { paddingTop: insets.top + 16 }]}>
              <TouchableOpacity onPress={handleCloseAreaMgmt} style={styles.areaMgmtBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.areaMgmtTitle}>Manage Areas</Text>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.areaMgmtBody, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
              {pendingMode !== null && (
                <View style={styles.switchBanner}>
                  <Text style={styles.switchBannerTitle}>Switch mode?</Text>
                  <Text style={styles.switchBannerSub}>Current input will be cleared.</Text>
                  <View style={styles.switchBannerActions}>
                    <TouchableOpacity style={styles.switchCancelBtn} onPress={cancelSwitchMode}><Text style={styles.switchCancelText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.switchConfirmBtn} onPress={confirmSwitchMode}><Text style={styles.switchConfirmText}>Switch</Text></TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={styles.modeCard}>
                <TouchableOpacity style={[styles.modeRow, areaMgmtMode === 'single' && styles.modeRowActive]} onPress={() => trySetMode('single')}>
                  <View style={[styles.radioOuter, areaMgmtMode === 'single' && styles.radioOuterActive]}>{areaMgmtMode === 'single' && <View style={styles.radioInner} />}</View>
                  <Text style={[styles.modeLabel, areaMgmtMode === 'single' ? styles.modeLabelActive : styles.modeLabelDim]}>Single</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeRow, areaMgmtMode === 'multiple' && styles.modeRowActive]} onPress={() => trySetMode('multiple')}>
                  <View style={[styles.radioOuter, areaMgmtMode === 'multiple' && styles.radioOuterActive]}>{areaMgmtMode === 'multiple' && <View style={styles.radioInner} />}</View>
                  <Text style={[styles.modeLabel, areaMgmtMode === 'multiple' ? styles.modeLabelActive : styles.modeLabelDim]}>Multiple</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.areaMgmtFormCard}>
                {areaMgmtMode === 'single' ? (
                  <><Text style={styles.areaMgmtFieldLabel}>Rack Code</Text><TextInput style={styles.areaMgmtInput} placeholder="e.g. A1.1" value={singleCode} onChangeText={setSingleCode} autoCapitalize="characters" placeholderTextColor="#94a3b8" editable={isOnline} /></>
                ) : (
                  <>
                    <Text style={styles.areaMgmtFieldLabel}>Prefix</Text><TextInput style={styles.areaMgmtInput} placeholder="e.g. A1" value={multiPrefix} onChangeText={setMultiPrefix} autoCapitalize="characters" placeholderTextColor="#94a3b8" editable={isOnline} />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <View style={{ flex: 1 }}><Text style={styles.areaMgmtFieldLabel}>From</Text><TextInput style={styles.areaMgmtInput} placeholder="1" value={multiFrom} onChangeText={setMultiFrom} keyboardType="number-pad" placeholderTextColor="#94a3b8" editable={isOnline} /></View>
                      <View style={{ flex: 1 }}><Text style={styles.areaMgmtFieldLabel}>To</Text><TextInput style={styles.areaMgmtInput} placeholder="12" value={multiTo} onChangeText={setMultiTo} keyboardType="number-pad" placeholderTextColor="#94a3b8" editable={isOnline} /></View>
                    </View>
                    {multiRangeError ? (<View style={styles.validationError}><Ionicons name="alert-circle-outline" size={13} color="#dc2626" /><Text style={styles.validationErrorText}>{multiRangeError}</Text></View>) : null}
                    {multiCreateValid && <Text style={styles.previewText}>{multiPrefix.trim().toUpperCase()}.{multiFromNum} → {multiPrefix.trim().toUpperCase()}.{multiToNum} ({multiToNum - multiFromNum + 1} racks)</Text>}
                  </>
                )}
                <View style={styles.areaMgmtActions}>
                  {savingArea ? <ActivityIndicator color="#dc2626" style={{ flex: 1 }} /> : (
                    <TouchableOpacity 
                      style={[
                        styles.areaMgmtDeleteBtn, 
                        (areaMgmtMode === 'single' ? !singleHasData : !multiDeleteValid) && styles.areaMgmtBtnDisabled,
                        !isOnline && { borderColor: '#cbd5e1', opacity: 0.5 }
                      ]} 
                      onPress={areaMgmtMode === 'single' ? handleSingleDelete : handleMultiDelete} 
                      disabled={savingArea || (areaMgmtMode === 'single' ? !singleHasData : !multiDeleteValid) || !isOnline}
                    >
                      <Ionicons name="trash-outline" size={14} color={!isOnline ? '#cbd5e1' : (areaMgmtMode === 'single' ? (singleHasData ? '#dc2626' : '#cbd5e1') : (multiDeleteValid ? '#dc2626' : '#cbd5e1'))} />
                      <Text style={[styles.areaMgmtDeleteBtnText, (!isOnline || (areaMgmtMode === 'single' ? !singleHasData : !multiDeleteValid)) && { color: '#cbd5e1' }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  {savingArea ? <ActivityIndicator color="#059669" style={{ flex: 1 }} /> : (
                    <TouchableOpacity 
                      style={[
                        styles.areaMgmtCreateBtn, 
                        (areaMgmtMode === 'single' ? !singleCodeValid : !multiCreateValid) && styles.areaMgmtBtnDisabled,
                        !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
                      ]} 
                      onPress={areaMgmtMode === 'single' ? handleSingleCreate : handleMultiCreate} 
                      disabled={savingArea || (areaMgmtMode === 'single' ? !singleCodeValid : !multiCreateValid) || !isOnline}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={!isOnline ? '#cbd5e1' : (areaMgmtMode === 'single' ? (singleCodeValid ? '#fff' : '#a3b3b3') : (multiCreateValid ? '#fff' : '#a3b3b3'))} />
                      <Text style={[styles.areaMgmtCreateBtnText, (!isOnline || (areaMgmtMode === 'single' ? !singleCodeValid : !multiCreateValid)) && { color: '#cbd5e1' }]}>Create</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Area Mgmt Confirm Modal — works on both web and native */}
            {areaMgmtConfirm !== null && (
              <Modal
                visible={true}
                transparent
                animationType="fade"
                onRequestClose={() => setAreaMgmtConfirm(null)}
              >
                <View style={styles.modalOverlay}>
                  <View style={[styles.confirmCard, { maxWidth: 340 }]}>
                    <View style={styles.confirmIconRow}>
                      <View style={[styles.confirmIconBgDelete, { backgroundColor: areaMgmtConfirm?.destructive ? '#fce8e6' : '#e8f5e9' }]}>
                        <Ionicons
                          name={areaMgmtConfirm?.destructive ? 'trash-outline' : 'checkmark-circle-outline'}
                          size={28}
                          color={areaMgmtConfirm?.destructive ? '#b91c1c' : '#059669'}
                        />
                      </View>
                    </View>
                    <Text style={[styles.confirmTitle, { color: areaMgmtConfirm?.destructive ? '#c5221f' : '#059669' }]}>
                      {areaMgmtConfirm?.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                      {areaMgmtConfirm?.message}
                    </Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.btnCancel} onPress={() => setAreaMgmtConfirm(null)}>
                        <Text style={styles.btnCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.btnDeleteConfirm, 
                          { backgroundColor: areaMgmtConfirm?.destructive ? '#c5221f' : '#059669' },
                          !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
                        ]}
                        onPress={() => areaMgmtConfirm?.onConfirm()}
                        disabled={!isOnline}
                      >
                        <Text style={styles.btnConfirmText}>{areaMgmtConfirm?.destructive ? 'Delete' : 'Confirm'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1b4d3e', alignItems: 'center' },
  
  mainAppContainer: { 
    flex: 1, 
    width: '100%', 
    alignSelf: 'center', 
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    backgroundColor: '#1b4d3e',
  },
  headerLeft: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
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
  menuButton: {
    padding: 4,
  },

  logoutButtonOutside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#bfbdbd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonOutsideText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuBoundingBox: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
  },
  menuContent: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },

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

  listContent: { paddingBottom: 16, paddingLeft: 8, paddingRight: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },

  sectionHeader: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    marginTop: 8,
    borderRadius: 4,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, paddingRight: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2e7d32' },
  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1, color: '#1b5e20', flexShrink: 1 },
  sectionCount: { fontSize: 10, fontWeight: '700', color: '#2e7d32', flexShrink: 0 },

  rowGrid: { flexDirection: 'row', gap: 4, paddingVertical: 1 },

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
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnPrimaryText: { fontSize: 11, fontWeight: '700' },
  actionBtnDelete: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fce8e6', // Màu đỏ nhạt Google Material
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnDeleteText: { color: '#c5221f', fontSize: 11, fontWeight: '700' }, // Chữ màu đỏ đậm

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
    backgroundColor: '#fce8e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#c5221f', textAlign: 'center', marginBottom: 4 },
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
    backgroundColor: '#c5221f',
    minWidth: 90,
    alignItems: 'center',
  },
  btnConfirmText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  addLotErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  addLotErrorText: { flex: 1, fontSize: 12, color: '#dc2626', fontWeight: '600', lineHeight: 18 },

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
  editModalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  fieldWrapper: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' },
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
  btnSaveEdit: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },

  emptyRackContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyRackText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

  modalCloseFooterBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCloseFooterText: { fontSize: 12, color: '#475569', fontWeight: '700' },

  modalAddFooterBtn: {
    backgroundColor: '#e6f4ea', // Màu nền xanh lá nhạt Google Material
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#c8e6c9', // Viền mỏng xanh nhạt
  },
  modalAddFooterText: { fontSize: 13, color: '#137333', fontWeight: '800' }, // Chữ xanh lá đậm

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
    paddingBottom: 16,
    gap: 14,
  },
  areaMgmtTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  areaMgmtBackBtn: {
    padding: 4,
    borderRadius: 6,
  },
  areaMgmtBody: {
    padding: 16,
  },

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
});

export default BoardScreen;