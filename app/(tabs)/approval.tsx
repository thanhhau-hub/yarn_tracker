import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRole } from '../../hooks/useRole';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../../types';

/**
 * Supervisor Approval screen.
 * Lists pending user registrations and allows supervisors to approve or reject them.
 */
export default function ApprovalScreen() {
  const { role, loading: roleLoading } = useRole();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchPendingUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && data) setPendingUsers(data as Profile[]);
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // Redirect non-supervisors
  useEffect(() => {
    if (!roleLoading && role !== 'supervisor') {
      router.replace('/');
    }
  }, [roleLoading, role]);

  const handleUpdateStatus = useCallback(async (userId: string, newStatus: 'active' | 'rejected') => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) {
        Alert.alert('Error', 'Failed to update status: ' + error.message);
      } else {
        Alert.alert('Success', `User has been ${newStatus === 'active' ? 'approved' : 'rejected'}.`);
        fetchPendingUsers();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }, [fetchPendingUsers]);

  const renderUser = ({ item }: { item: Profile }) => {
    const isUpdating = updatingUserId === item.id;

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={40} color="#047857" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.full_name || 'No Name'}</Text>
            <Text style={styles.userEmail}>{item.email || 'No Email'}</Text>
            <Text style={styles.userDate}>
              Registered: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.approveBtn, isUpdating && styles.btnDisabled]}
            onPress={() => handleUpdateStatus(item.id, 'active')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rejectBtn, isUpdating && styles.btnDisabled]}
            onPress={() => handleUpdateStatus(item.id, 'rejected')}
            disabled={isUpdating}
          >
            <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        {/* Header info */}
        <View style={styles.headerInfo}>
          <Text style={styles.headerInfoText}>
            {pendingUsers.length} pending registration{pendingUsers.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={fetchPendingUsers} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={20} color="#047857" />
          </TouchableOpacity>
        </View>

        {loadingUsers ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#047857" />
          </View>
        ) : pendingUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>No pending registrations at this time.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingUsers}
            keyExtractor={item => item.id}
            renderItem={renderUser}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarContainer: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 6,
  },
  rejectBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
