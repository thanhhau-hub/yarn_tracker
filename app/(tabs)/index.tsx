import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  SectionList,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useBoard } from '../../hooks/useBoard';
import { useRole } from '../../hooks/useRole';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../hooks/useNetwork';
import { AreaWithCount, Area } from '../../types';
import { Ionicons } from '@expo/vector-icons';

import { RackCell } from '../../components/board/RackCell';
import { LotActionModal } from '../../components/board/LotActionModal';
import { AddLotModal } from '../../components/board/AddLotModal';
import { EditLotModal } from '../../components/board/EditLotModal';
import { DeleteLotModal } from '../../components/board/DeleteLotModal';
import { AreaMgmtPanel } from '../../components/board/AreaMgmtPanel';
import { BoardHeader } from '../../components/board/BoardHeader';
import { MenuModal } from '../../components/board/MenuModal';
import { SearchBar } from '../../components/board/SearchBar';
import { styles, cleanLotNumber } from '../../components/board/boardStyles';

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

      // INSERT mới — cho phép trùng lot trong cùng rack hoặc khác rack
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
      const rollId = insertData?.[0]?.id;

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

        <BoardHeader 
          occupiedRacks={occupiedRacks}
          totalRacks={totalRacks}
          role={role}
          handleLogout={handleLogout}
          setIsMenuOpen={setIsMenuOpen}
        />

        <MenuModal 
          visible={isMenuOpen}
          role={role}
          isOnline={isOnline}
          appMaxWidth={appMaxWidth}
          onClose={() => setIsMenuOpen(false)}
          onManageAreas={() => { setIsMenuOpen(false); setShowAreaMgmt(true); }}
          onLogout={() => { setIsMenuOpen(false); handleLogout(); }}
        />

        <SearchBar 
          searchLotInput={searchLotInput}
          searchColorInput={searchColorInput}
          searchDescInput={searchDescInput}
          activeLot={activeLot}
          activeColor={activeColor}
          activeDesc={activeDesc}
          isSearchActive={isSearchActive}
          setSearchLotInput={setSearchLotInput}
          setSearchColorInput={setSearchColorInput}
          setSearchDescInput={setSearchDescInput}
          handleSearchScroll={handleSearchScroll}
          handleClearSearch={handleClearSearch}
        />

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
              row.forEach((cell: AreaWithCount | null) => {
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
                  const matchedIdx = sortedYarns.findIndex((yarn) => {
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

                const lots = hasYarn ? sortedYarns.map((y) => cleanLotNumber(y.yarn_code)) : [];
                const colors = hasYarn ? sortedYarns.map((y) => y.color || '') : [];
                const descs = hasYarn ? sortedYarns.map((y) => y.description || '') : [];
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

        <LotActionModal 
          visible={selectedArea !== null}
          displayArea={displayArea}
          role={role}
          isOnline={isOnline}
          onClose={handleCloseModal}
          onEdit={(yarn) => {
            handleCloseModal(); 
            setEditingYarn({ ...yarn, currentAreaCode: displayArea?.code }); 
            setEditLotCode(cleanLotNumber(yarn.yarn_code)); 
            setEditColor(yarn.color || ''); 
            setEditDesc(yarn.description || '');
            setEditLotError(null);
            setEditLotSuccess(false); 
          }}
          onDelete={(yarn, areaCode) => confirmDeleteLot(yarn, areaCode)}
          onAddLot={handleOpenAddModal}
        />

        <AddLotModal 
          visible={showAddLot}
          isOnline={isOnline}
          addLotAreaCode={addLotAreaCode}
          addLotCode={addLotCode}
          addColor={addColor}
          addDesc={addDesc}
          isAddingLot={isAddingLot}
          addLotError={addLotError}
          addLotSuccess={addLotSuccess}
          setAddLotCode={setAddLotCode}
          setAddColor={setAddColor}
          setAddDesc={setAddDesc}
          setAddLotError={setAddLotError}
          onClose={() => { if (!isAddingLot) { setShowAddLot(false); setAddLotError(null); setAddLotSuccess(false); } }}
          onConfirm={executeAddLot}
        />

        <EditLotModal 
          visible={editingYarn !== null}
          isOnline={isOnline}
          editLotCode={editLotCode}
          editColor={editColor}
          editDesc={editDesc}
          isEditingLot={isEditingLot}
          editLotError={editLotError}
          editLotSuccess={editLotSuccess}
          setEditLotCode={setEditLotCode}
          setEditColor={setEditColor}
          setEditDesc={setEditDesc}
          setEditLotError={setEditLotError}
          onClose={() => { if (!isEditingLot) { setEditingYarn(null); setEditLotError(null); setEditLotSuccess(false); } }}
          onConfirm={executeEditLot}
        />

        <DeleteLotModal 
          visible={deleteConfirmYarn !== null}
          isOnline={isOnline}
          yarn={deleteConfirmYarn}
          areaCode={deleteConfirmArea}
          isDeleting={isDeleting}
          onClose={() => { if (!isDeleting) cancelDeleteLot(); }}
          onConfirm={executeDelete}
        />

        <AreaMgmtPanel 
          visible={showAreaMgmt}
          isOnline={isOnline}
          areaMgmtMode={areaMgmtMode}
          pendingMode={pendingMode}
          singleCode={singleCode}
          multiPrefix={multiPrefix}
          multiFrom={multiFrom}
          multiTo={multiTo}
          multiRangeError={multiRangeError}
          savingArea={savingArea}
          singleHasData={singleHasData}
          singleCodeValid={singleCodeValid}
          multiCreateValid={multiCreateValid}
          multiDeleteValid={multiDeleteValid}
          multiFromNum={multiFromNum}
          multiToNum={multiToNum}
          areaMgmtConfirm={areaMgmtConfirm}
          setSingleCode={setSingleCode}
          setMultiPrefix={setMultiPrefix}
          setMultiFrom={setMultiFrom}
          setMultiTo={setMultiTo}
          trySetMode={trySetMode}
          cancelSwitchMode={cancelSwitchMode}
          confirmSwitchMode={confirmSwitchMode}
          handleSingleDelete={handleSingleDelete}
          handleMultiDelete={handleMultiDelete}
          handleSingleCreate={handleSingleCreate}
          handleMultiCreate={handleMultiCreate}
          handleCloseAreaMgmt={handleCloseAreaMgmt}
          setAreaMgmtConfirm={setAreaMgmtConfirm}
        />

      </View>
    </View>
  );
}

export default BoardScreen;
