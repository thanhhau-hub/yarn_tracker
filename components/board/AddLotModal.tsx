import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './boardStyles';

interface AddLotModalProps {
  visible: boolean;
  isOnline: boolean;
  addLotAreaCode: string;
  addLotCode: string;
  addColor: string;
  addDesc: string;
  isAddingLot: boolean;
  addLotError: string | null;
  addLotSuccess: boolean;
  setAddLotCode: (text: string) => void;
  setAddColor: (text: string) => void;
  setAddDesc: (text: string) => void;
  setAddLotError: (error: string | null) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const AddLotModal: React.FC<AddLotModalProps> = ({
  visible,
  isOnline,
  addLotAreaCode,
  addLotCode,
  addColor,
  addDesc,
  isAddingLot,
  addLotError,
  addLotSuccess,
  setAddLotCode,
  setAddColor,
  setAddDesc,
  setAddLotError,
  onClose,
  onConfirm,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
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
                <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={isAddingLot}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                {/* Nút cuối cùng xác nhận Add Lot: Bị mờ đi và disable khi offline */}
                <TouchableOpacity 
                  style={[
                    styles.btnSaveEdit, 
                    { backgroundColor: '#137333' },
                    !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
                  ]} 
                  onPress={onConfirm} 
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
  );
};
