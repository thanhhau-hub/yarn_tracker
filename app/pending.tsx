import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function PendingScreen() {
  const { refetchRole } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    await refetchRole();
    setChecking(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityLabel="Delta Galil Logo"
        />

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="hourglass-outline" size={56} color="#f59e0b" />
          </View>
          <Text style={styles.title}>Pending Approval</Text>
          <Text style={styles.message}>
            Your account is awaiting Supervisor approval.
          </Text>
          <Text style={styles.submessage}>
            Please contact your supervisor to get your account activated.
          </Text>

          <TouchableOpacity
            style={styles.checkButton}
            onPress={handleCheckStatus}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.checkButtonText}>Check Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Authorized Personnel Only · Delta Galil Industries Ltd.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoImage: {
    width: '100%',
    maxWidth: 280,
    height: 70,
    alignSelf: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 36,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fffbeb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: '600',
  },
  submessage: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  checkButton: {
    flexDirection: 'row',
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  checkButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  signOutButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 32,
    letterSpacing: 0.5,
  },
});
