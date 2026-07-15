import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, cleanLotNumber } from './boardStyles';

interface DeleteLotModalProps {
  visible: boolean;
  isOnline: boolean;
  yarn: any;
  areaCode: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteLotModal: React.FC<DeleteLotModalProps> = ({
  visible,
  isOnline,
  yarn,
  areaCode,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!visible || !yarn) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconRow}><View style={styles.confirmIconBgDelete}><Ionicons name="trash" size={28} color="#b91c1c" /></View></View>
          <Text style={styles.confirmTitle}>Delete</Text>
          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}><Text style={styles.confirmLabel}>LOT Number</Text><Text style={styles.confirmValue}>{cleanLotNumber(yarn?.yarn_code || '')}</Text></View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}><Text style={styles.confirmLabel}>Location</Text><Text style={styles.confirmLocation}>{areaCode}</Text></View>
          </View>
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={isDeleting}><Text style={styles.btnCancelText}>Cancel</Text></TouchableOpacity>
            {/* Nút cuối cùng xác nhận Delete: Bị mờ đi và disable khi offline */}
            <TouchableOpacity 
              style={[
                styles.btnDeleteConfirm,
                !isOnline && { backgroundColor: '#cbd5e1', opacity: 0.5 }
              ]} 
              onPress={onConfirm} 
              disabled={isDeleting || !isOnline}
            >
              {isDeleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnConfirmText}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
