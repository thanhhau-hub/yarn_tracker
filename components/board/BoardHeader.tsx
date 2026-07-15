import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './boardStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BoardHeaderProps {
  occupiedRacks: number;
  totalRacks: number;
  role: string | null;
  handleLogout: () => void;
  setIsMenuOpen: (val: boolean) => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  occupiedRacks,
  totalRacks,
  role,
  handleLogout,
  setIsMenuOpen,
}) => {
  const insets = useSafeAreaInsets();

  return (
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
  );
};
