import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './boardStyles';

interface EditLotModalProps {
  visible: boolean;
  isOnline: boolean;
  editLotCode: string;
  editColor: string;
  editDesc: string;
  isEditingLot: boolean;
  editLotError: string | null;
  editLotSuccess: boolean;
  setEditLotCode: (text: string) => void;
  setEditColor: (text: string) => void;
  setEditDesc: (text: string) => void;
  setEditLotError: (error: string | null) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const EditLotModal: React.FC<EditLotModalProps> = ({
  visible,
  isOnline,
  editLotCode,
  editColor,
  editDesc,
  isEditingLot,
  editLotError,
  editLotSuccess,
  setEditLotCode,
  setEditColor,
  setEditDesc,
  setEditLotError,
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
                <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={isEditingLot}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                {/* Nút xác nhận Save mờ đi và disable khi offline */}
                <TouchableOpacity 
                  style={[
                    styles.btnSaveEdit, 
                    { backgroundColor: '#1a73e8' },
                    !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
                  ]} 
                  onPress={onConfirm} 
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
  );
};
