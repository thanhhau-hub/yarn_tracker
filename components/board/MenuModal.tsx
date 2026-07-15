import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './boardStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MenuModalProps {
  visible: boolean;
  role: string | null;
  isOnline: boolean;
  appMaxWidth: number;
  onClose: () => void;
  onManageAreas: () => void;
  onLogout: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  visible,
  role,
  isOnline,
  appMaxWidth,
  onClose,
  onManageAreas,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.menuOverlay}>
          <View style={[styles.menuBoundingBox, { maxWidth: appMaxWidth }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuContent, { top: insets.top + 45 }]}>
                
                {/* Manage Areas (Supervisor/Admin) */}
                {(role === 'supervisor' || role === 'admin') && isOnline && (
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => { onClose(); onManageAreas(); }}
                  >
                    <Ionicons name="location-outline" size={18} color="#1e293b" />
                    <Text style={styles.menuItemText}>Manage Areas</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.menuDivider} />
                
                {/* Logout */}
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => { onClose(); onLogout(); }}
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
  );
};
