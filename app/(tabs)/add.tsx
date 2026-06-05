import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Area } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useRole } from '../../hooks/useRole';

/**
 * Add Lot Screen — Supervisor Only
 * 
 * Features:
 * - Shows Access Denied card to Workers
 * - Correctly calculates empty locations (excludes occupied by active yarn rolls)
 * - Enter on Location field auto-selects first matching suggestion
 * - Enter on Lot field triggers the save confirmation flow
 * - Persists yarn_code in audit log
 */
export default function AddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ areaId?: string }>();
  const { role, loading: roleLoading } = useRole();

  const [lotNumber, setLotNumber] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedAreaCode, setSelectedAreaCode] = useState<string>('');

  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [occupiedAreaIds, setOccupiedAreaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const lotInputRef = useRef<TextInput>(null);

  // Load areas whenever screen is focused
  async function loadAreas() {
    setLoading(true);

    // 1. Fetch all active areas
    const { data: areasData } = await supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('code');

    const areas = areasData || [];
    setAllAreas(areas);

    // 2. Correctly compute occupied areas: find all area_ids that have at least one in_stock yarn roll
    const { data: occupiedData } = await supabase
      .from('yarn_rolls')
      .select('area_id')
      .eq('status', 'in_stock')
      .not('area_id', 'is', null);

    const occupied = new Set<string>((occupiedData || []).map((r: any) => r.area_id));
    setOccupiedAreaIds(occupied);

    // Pre-select location if passed via route params and it is empty
    if (params.areaId) {
      const match = areas.find((a) => a.id === params.areaId);
      if (match && !occupied.has(match.id)) {
        setSelectedAreaId(match.id);
        setSelectedAreaCode(match.code);
        setLocationQuery(match.code);
      }
    }

    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      // Only load if supervisor
      if (role === 'supervisor') {
        loadAreas();
      }
      // Reset form fields (but keep pre-selected location from params)
      setLotNumber('');
      setIsConfirming(false);
      if (!params.areaId) {
        clearLocation();
      }
    }, [params.areaId, role])
  );

  // Filtered suggestions based on locationQuery. Occupied active locations are excluded.
  const filteredAreas = locationQuery.trim().length > 0
    ? allAreas.filter((a) =>
        !occupiedAreaIds.has(a.id) &&
        a.code.toUpperCase().startsWith(locationQuery.trim().toUpperCase())
      )
    : [];

  function handleSelectArea(area: Area) {
    if (occupiedAreaIds.has(area.id)) {
      Alert.alert('Location Occupied', `${area.code} already has an active lot. Please choose an empty location.`);
      return;
    }
    setSelectedAreaId(area.id);
    setSelectedAreaCode(area.code);
    setLocationQuery(area.code);
    // Move focus to lot number input after selection
    setTimeout(() => lotInputRef.current?.focus(), 100);
  }

  function clearLocation() {
    setSelectedAreaId(null);
    setSelectedAreaCode('');
    setLocationQuery('');
  }

  // Enter key on location: auto-select first matching suggestion
  function handleLocationSubmit() {
    if (filteredAreas.length > 0 && !selectedAreaId) {
      handleSelectArea(filteredAreas[0]);
    } else if (selectedAreaId) {
      lotInputRef.current?.focus();
    }
  }

  function handleInitSave() {
    const lot = lotNumber.trim().toUpperCase();
    if (!lot) {
      Alert.alert('Required', 'Please enter a LOT number.');
      return;
    }
    if (!selectedAreaId) {
      Alert.alert('Required', 'Please select a rack location.');
      return;
    }
    if (occupiedAreaIds.has(selectedAreaId)) {
      Alert.alert('Location Occupied', `${selectedAreaCode} already has an active lot. Please choose an empty location.`);
      return;
    }
    setIsConfirming(true);
  }

  async function handleConfirmSave() {
    const baseCode = lotNumber.trim().toUpperCase();
    setSaving(true);
    setIsConfirming(false);

    try {
      // Handle duplicate lot codes by appending suffix
      let finalCode = baseCode;
      const { data: matches } = await supabase
        .from('yarn_rolls')
        .select('yarn_code')
        .ilike('yarn_code', `${baseCode}%`);

      if (matches && matches.length > 0) {
        const regex = new RegExp(`^${baseCode}(-\\d+)?$`);
        const matched = matches.map((m) => m.yarn_code).filter((c) => regex.test(c));
        if (matched.length > 0) {
          let maxIdx = 1;
          matched.forEach((c) => {
            if (c !== baseCode) {
              const idx = parseInt(c.split('-').pop() || '0', 10);
              if (!isNaN(idx)) maxIdx = Math.max(maxIdx, idx);
            }
          });
          finalCode = `${baseCode}-${maxIdx + 1}`;
        }
      }

      // Insert the new LOT
      const { data: newYarn, error: insertError } = await supabase
        .from('yarn_rolls')
        .insert({
          yarn_code: finalCode,
          area_id: selectedAreaId,
          status: 'in_stock',
        })
        .select()
        .single();

      if (insertError) {
        Alert.alert('Error', insertError.message);
        setSaving(false);
        return;
      }

      // Log the CREATE action with full audit data
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('move_logs').insert({
        yarn_roll_id: newYarn.id,
        action: 'CREATE',
        yarn_code: finalCode,
        from_area_code: null,
        to_area_code: selectedAreaCode,
        from_area_id: null,
        to_area_id: selectedAreaId,
        moved_by: user?.id,
        note: JSON.stringify({
          action: 'CREATE',
          operator: user?.email || 'Operator',
          details: `Created lot ${finalCode} at ${selectedAreaCode}`,
        }),
      });

      setSaving(false);
      Alert.alert(
        '✅ Registered',
        `LOT ${baseCode} placed at ${selectedAreaCode}`,
        [
          {
            text: 'Add Another',
            onPress: () => {
              setLotNumber('');
              clearLocation();
              loadAreas();
            },
          },
          { text: 'View Board', onPress: () => router.push('/') },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
      setSaving(false);
    }
  }

  const isLocationOccupied = selectedAreaId ? occupiedAreaIds.has(selectedAreaId) : false;
  const emptyCount = allAreas.filter((a) => !occupiedAreaIds.has(a.id)).length;

  // ─── Supervisor gate ───────────────────────────────────────────
  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1b4d3e" />
      </View>
    );
  }

  if (role !== 'supervisor') {
    return (
      <View style={styles.accessDeniedContainer}>
        <View style={styles.accessDeniedCard}>
          <Ionicons name="lock-closed" size={40} color="#dc2626" style={{ marginBottom: 12 }} />
          <Text style={styles.accessDeniedTitle}>Supervisor Access Required</Text>
          <Text style={styles.accessDeniedText}>
            Adding new lots is restricted to supervisors.{'\n'}
            Please contact your supervisor to register new inventory.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <Ionicons name="cube-outline" size={28} color="#1b4d3e" />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Register New LOT</Text>
            <Text style={styles.headerSub}>
              {emptyCount} empty location{emptyCount !== 1 ? 's' : ''} available
            </Text>
          </View>
        </View>

        {/* Location Field */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>
            <Ionicons name="location-outline" size={13} color="#1b4d3e" />
            {'  '}Location *
          </Text>
          <View style={[styles.inputWrapper, isLocationOccupied && styles.inputWrapperWarning]}>
            <TextInput
              style={styles.input}
              placeholder="Type to filter (e.g. A, A1, A1.5)"
              value={locationQuery}
              onChangeText={(text) => {
                setLocationQuery(text);
                // Clear selection if user edits text manually
                if (selectedAreaCode && text !== selectedAreaCode) {
                  setSelectedAreaId(null);
                  setSelectedAreaCode('');
                }
              }}
              autoCapitalize="characters"
              placeholderTextColor="#a0aec0"
              returnKeyType="next"
              onSubmitEditing={handleLocationSubmit}
            />
            {locationQuery.length > 0 && (
              <TouchableOpacity onPress={clearLocation} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {selectedAreaId && (
            <View style={[styles.statusRow, styles.statusOk]}>
              <Ionicons
                name={isLocationOccupied ? 'warning-outline' : 'checkmark-circle-outline'}
                size={13}
                color={isLocationOccupied ? '#b45309' : '#2e7d32'}
              />
              <Text style={[styles.statusText, isLocationOccupied ? styles.statusTextWarn : styles.statusTextOk]}>
                {selectedAreaCode} selected{isLocationOccupied ? ' — already occupied' : ''}
              </Text>
            </View>
          )}

          {/* Suggestions dropdown */}
          {locationQuery.trim().length > 0 && !selectedAreaId && filteredAreas.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={filteredAreas.slice(0, 20)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const isEmpty = !occupiedAreaIds.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.suggestionItem,
                        !isEmpty && styles.suggestionItemOccupied,
                      ]}
                      onPress={() => handleSelectArea(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.suggestionCode, !isEmpty && styles.suggestionCodeOccupied]}>
                        {item.code}
                      </Text>
                      <View style={[styles.suggestionBadge, isEmpty ? styles.badgeEmpty : styles.badgeOccupied]}>
                        <Text style={[styles.suggestionBadgeText, isEmpty ? styles.badgeTextEmpty : styles.badgeTextOccupied]}>
                          {isEmpty ? 'Empty' : 'Occupied'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
              {filteredAreas.length > 20 && (
                <Text style={styles.suggestionsMore}>
                  +{filteredAreas.length - 20} more — type more to narrow down
                </Text>
              )}
            </View>
          )}

          {locationQuery.trim().length > 0 && filteredAreas.length === 0 && (
            <Text style={styles.noSuggestionsText}>No locations matching "{locationQuery.trim().toUpperCase()}"</Text>
          )}
        </View>

        {/* LOT Number Field */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>
            <Ionicons name="barcode-outline" size={13} color="#1b4d3e" />
            {'  '}Lot Number *
          </Text>
          <TextInput
            ref={lotInputRef}
            style={styles.input}
            placeholder="e.g. K446, 3310, 3312"
            value={lotNumber}
            onChangeText={setLotNumber}
            autoCapitalize="characters"
            placeholderTextColor="#a0aec0"
            returnKeyType="done"
            onSubmitEditing={handleInitSave}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (saving || loading) && styles.saveButtonDisabled,
          ]}
          onPress={handleInitSave}
          disabled={saving || loading}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={isConfirming}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsConfirming(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconRow}>
              <View style={styles.confirmIconBg}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#1b4d3e" />
              </View>
            </View>

            <Text style={styles.confirmTitle}>Confirm Registration</Text>
            <Text style={styles.confirmSubtitle}>Please verify before saving:</Text>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <View style={styles.confirmLabelRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.confirmLabel}>Location</Text>
                </View>
                <Text style={styles.confirmLocation}>{selectedAreaCode}</Text>
              </View>

              <View style={styles.confirmDivider} />

              <View style={styles.confirmRow}>
                <View style={styles.confirmLabelRow}>
                  <Ionicons name="barcode-outline" size={14} color="#64748b" />
                  <Text style={styles.confirmLabel}>LOT Number</Text>
                </View>
                <Text style={styles.confirmValue}>{lotNumber.trim().toUpperCase()}</Text>
              </View>

            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setIsConfirming(false)}
              >
                <Text style={styles.btnCancelText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnConfirm}
                onPress={handleConfirmSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnConfirmText}>Confirm & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 14, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Access Denied
  accessDeniedContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: 320,
    width: '100%',
  },
  accessDeniedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Header Card
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#1b5e20' },
  headerSub: { fontSize: 11, color: '#2e7d32', marginTop: 2, fontWeight: '500' },

  // Field Card
  fieldCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#1b4d3e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
  },
  inputWrapperWarning: {
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 10,
  },

  // Status row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  statusOk: {},
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextOk: { color: '#2e7d32' },
  statusTextWarn: { color: '#b45309' },

  // Suggestions
  suggestionsContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionItemOccupied: { backgroundColor: '#fafafa' },
  suggestionCode: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  suggestionCodeOccupied: { color: '#94a3b8' },
  suggestionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeEmpty: { backgroundColor: '#e8f5e9' },
  badgeOccupied: { backgroundColor: '#f1f5f9' },
  suggestionBadgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextEmpty: { color: '#2e7d32' },
  badgeTextOccupied: { color: '#94a3b8' },
  suggestionsMore: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 6,
  },
  noSuggestionsText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
    paddingLeft: 2,
  },

  // Save button
  saveButton: {
    backgroundColor: '#1b4d3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
    shadowColor: '#1b4d3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonDisabled: { backgroundColor: '#a3bda8', shadowOpacity: 0 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Confirmation Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
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
  confirmIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#1b5e20', textAlign: 'center', marginBottom: 4 },
  confirmSubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 18 },
  confirmDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  confirmLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  confirmLocation: {
    fontSize: 14,
    color: '#1b5e20',
    fontWeight: '900',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#a5d6a7',
    overflow: 'hidden',
  },
  confirmValue: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
  confirmDivider: { height: 1, backgroundColor: '#e2e8f0' },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  btnCancelText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  btnConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#1b4d3e',
    minWidth: 110,
    alignItems: 'center',
  },
  btnConfirmText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
