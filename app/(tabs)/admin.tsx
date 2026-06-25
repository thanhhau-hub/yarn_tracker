import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, adminAuthClient } from '../../lib/supabase';
import { useRole } from '../../hooks/useRole';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../../types';

export default function AdminScreen() {
  const { role, loading: roleLoading } = useRole();
  const insets = useSafeAreaInsets();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'supervisor' | 'admin'>('supervisor');
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  function showAlert(type: 'success' | 'error', title: string, message: string) {
    setModalConfig({ visible: true, type, title, message });
  }

  function showConfirm(title: string, message: string, onConfirm: () => void) {
    setModalConfig({ visible: true, type: 'confirm', title, message, onConfirm });
  }

  useEffect(() => {
    if (role === 'admin') {
      fetchProfiles();
    }
  }, [role]);

  async function fetchProfiles() {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data);
    setLoading(false);
  }

  function handleCreateUser() {
    if (!newEmail.trim() || !newPassword) {
      showAlert('error', 'Missing Fields', 'Email and password required.');
      return;
    }
    
    const msg = `Create account for ${newEmail.trim()} as ${newRole}?`;
    showConfirm('Confirm', msg, () => {
      setModalConfig(null);
      setTimeout(executeCreateUser, 300);
    });
  }

  async function executeCreateUser() {
    setCreating(true);
    try {
      // Create user using the separate client
      const { data, error } = await adminAuthClient.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: {
            role: newRole,
          }
        }
      });

      if (error) {
        const isDuplicate = error.message?.toLowerCase().includes('already registered');
        showAlert('error', 'Create Failed', isDuplicate ? 'Email already in use.' : 'Could not create account.');
        setCreating(false);
        return;
      }

      const newUserId = data.user?.id;

      if (!newUserId) {
        showAlert('error', 'Create Failed', 'No user returned. Check signup settings.');
        return;
      }
      
      // The database trigger normally creates this profile. Upsert keeps the
      // admin screen reliable even if the trigger is delayed or missing.
      await new Promise(res => setTimeout(res, 500));
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: newUserId,
          email: newEmail.trim(),
          full_name: newEmail.trim().split('@')[0],
          role: newRole,
        }, { onConflict: 'id' });

      if (profileError) {
        showAlert('error', 'Profile Error', 'Failed to save user profile.');
        fetchProfiles();
        return;
      }

      showAlert('success', 'Created', 'New user added.');
      setNewEmail('');
      setNewPassword('');
      setNewRole('supervisor');
      fetchProfiles();
    } catch (err: any) {
      showAlert('error', 'Error', err.message);
    } finally {
      setCreating(false);
    }
  }


  if (roleLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#1b4d3e" /></View>;
  if (role !== 'admin') {
    return <View style={styles.center}><Text>Access Denied. Admins only.</Text></View>;
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Management</Text>
        <Text style={styles.headerSubtitle}>Create and manage system users</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Create User Form */}
        <View style={styles.createCard}>
          <Text style={styles.cardTitle}>Create New Account</Text>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Email"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.roleLabel}>Select Role:</Text>
          <View style={styles.roleSelector}>
            {(['supervisor', 'admin'] as const).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleSelectBtn, newRole === r && styles.roleSelectBtnActive]}
                onPress={() => setNewRole(r)}
              >
                <Text style={[styles.roleSelectText, newRole === r && styles.roleSelectTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreateUser} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Existing Users</Text>
        
        {loading && profiles.length === 0 ? (
           <ActivityIndicator size="small" color="#1b4d3e" style={{ marginVertical: 20 }} />
        ) : (
          profiles.map(p => (
            <View key={p.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{p.full_name || 'No Name'} ({p.role})</Text>
                <Text style={styles.itemSub}>{p.email}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Custom Modal for Alerts/Confirms */}
      <Modal
        visible={modalConfig?.visible || false}
        transparent
        animationType="fade"
        onRequestClose={() => setModalConfig(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Icon */}
            <View style={[
              styles.modalIconBg,
              modalConfig?.type === 'success' ? { backgroundColor: '#e8f5e9' }
              : modalConfig?.type === 'error' ? { backgroundColor: '#fef2f2' }
              : { backgroundColor: '#e8f5e9' },
            ]}>
              <Ionicons
                name={
                  modalConfig?.type === 'success' ? 'checkmark-circle'
                  : modalConfig?.type === 'error' ? 'close-circle'
                  : 'help-circle'
                }
                size={40}
                color={
                  modalConfig?.type === 'success' ? '#1b4d3e'
                  : modalConfig?.type === 'error' ? '#dc2626'
                  : '#1b4d3e'
                }
              />
            </View>

            {/* Title */}
            <Text style={[
              styles.modalTitle,
              modalConfig?.type === 'error' ? { color: '#dc2626' } : { color: '#1b4d3e' },
            ]}>
              {modalConfig?.title}
            </Text>

            {/* Message */}
            <Text style={styles.modalSubtitle}>{modalConfig?.message}</Text>

            {/* Actions */}
            <View style={styles.modalActions}>
              {modalConfig?.type === 'confirm' ? (
                <>
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalConfig(null)}>
                    <Text style={styles.btnSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={modalConfig.onConfirm}>
                    <Text style={styles.btnPrimaryText}>Confirm</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={() => setModalConfig(null)}>
                  <Text style={styles.btnPrimaryText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#1b4d3e' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: '#a7f3d0', fontSize: 13, fontWeight: '600', marginTop: 4 },
  content: { padding: 16 },
  
  createCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  inputGroup: { gap: 10, marginBottom: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#f8fafc' },
  inputIcon: { paddingLeft: 12 },
  inputWithIcon: { flex: 1, padding: 12, fontSize: 14, color: '#0f172a' },
  eyeIcon: { padding: 12 },
  roleLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleSelectBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  roleSelectBtnActive: { borderColor: '#1b4d3e', backgroundColor: '#e8f5e9' },
  roleSelectText: { fontSize: 13, color: '#64748b', textTransform: 'capitalize', fontWeight: '500' },
  roleSelectTextActive: { color: '#1b4d3e', fontWeight: 'bold' },
  createBtn: { backgroundColor: '#1b4d3e', padding: 14, borderRadius: 8, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  itemSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 6, marginLeft: 12 },
  
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 340, backgroundColor: '#ffffff',
    borderRadius: 20, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
  },
  modalIconBg: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14, color: '#475569', textAlign: 'center',
    marginBottom: 22, lineHeight: 21, fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row', gap: 10, width: '100%',
  },
  btnSecondary: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center',
  },
  btnSecondaryText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  btnPrimary: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#1b4d3e', alignItems: 'center',
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
