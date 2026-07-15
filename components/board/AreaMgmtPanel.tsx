import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './boardStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AreaMgmtPanelProps {
  visible: boolean;
  isOnline: boolean;
  areaMgmtMode: 'single' | 'multiple';
  pendingMode: 'single' | 'multiple' | null;
  singleCode: string;
  multiPrefix: string;
  multiFrom: string;
  multiTo: string;
  multiRangeError: string;
  savingArea: boolean;
  singleHasData: boolean;
  singleCodeValid: boolean;
  multiCreateValid: boolean;
  multiDeleteValid: boolean;
  multiFromNum: number;
  multiToNum: number;
  areaMgmtConfirm: any;
  setSingleCode: (t: string) => void;
  setMultiPrefix: (t: string) => void;
  setMultiFrom: (t: string) => void;
  setMultiTo: (t: string) => void;
  trySetMode: (mode: 'single' | 'multiple') => void;
  cancelSwitchMode: () => void;
  confirmSwitchMode: () => void;
  handleSingleDelete: () => void;
  handleMultiDelete: () => void;
  handleSingleCreate: () => void;
  handleMultiCreate: () => void;
  handleCloseAreaMgmt: () => void;
  setAreaMgmtConfirm: (val: any) => void;
}

export const AreaMgmtPanel: React.FC<AreaMgmtPanelProps> = ({
  visible,
  isOnline,
  areaMgmtMode,
  pendingMode,
  singleCode,
  multiPrefix,
  multiFrom,
  multiTo,
  multiRangeError,
  savingArea,
  singleHasData,
  singleCodeValid,
  multiCreateValid,
  multiDeleteValid,
  multiFromNum,
  multiToNum,
  areaMgmtConfirm,
  setSingleCode,
  setMultiPrefix,
  setMultiFrom,
  setMultiTo,
  trySetMode,
  cancelSwitchMode,
  confirmSwitchMode,
  handleSingleDelete,
  handleMultiDelete,
  handleSingleCreate,
  handleMultiCreate,
  handleCloseAreaMgmt,
  setAreaMgmtConfirm,
}) => {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
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
  );
};
