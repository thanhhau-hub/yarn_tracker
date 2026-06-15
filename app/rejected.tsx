import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function RejectedScreen() {
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
            <Ionicons name="close-circle-outline" size={56} color="#dc2626" />
          </View>
          <Text style={styles.title}>Registration Rejected</Text>
          <Text style={styles.message}>
            Your registration request has been rejected.
          </Text>
          <Text style={styles.submessage}>
            Please contact your supervisor for more information.
          </Text>

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
    backgroundColor: '#fef2f2',
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
