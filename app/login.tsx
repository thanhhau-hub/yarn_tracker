import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

/**
 * Premium Enterprise-Grade Login Screen.
 * Fully optimized for Delta Galil. Uses a light theme with clean forest green accents,
 * inline icons for fields, soft shadow depth, and clear contrast.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { setGuestMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // State lưu trữ thông báo lỗi để hiển thị trực tiếp trên giao diện
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidEmail = (emailStr: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return reg.test(emailStr.trim());
  };

  // Hàm cập nhật Email và xóa thông báo lỗi cũ
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errorMessage) setErrorMessage(null);
  };

  // Hàm cập nhật Mật khẩu và xóa thông báo lỗi cũ
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errorMessage) setErrorMessage(null);
  };

  async function handleAuth() {
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter email & password.');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Phân loại và Việt hóa một số lỗi phổ biến từ Supabase
        if (error.message === 'Invalid login credentials') {
          setErrorMessage('The email or password you entered is incorrect.');
        } else if (error.message.toLowerCase().includes('network') || error.status === 0) {
          setErrorMessage('Network connection error. Please check your internet connection.');
        } else {
          setErrorMessage(error.message);
        }
      }
    } catch (err: any) {
      // Báo lỗi hệ thống bất ngờ
      setErrorMessage(err?.message || 'An unexpected system error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestAuth() {
    setErrorMessage(null);
    setLoading(true);
    try {
      await setGuestMode(true);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage('Failed to enter worker mode. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Logo and Header Panel */}
          <View style={styles.headerContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Delta Galil Logo"
            />
            <View style={styles.badgeContainer}>
              <Text style={styles.systemName}>Yarn Tracking System</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Welcome to Yarn Tracker</Text>
            <Text style={styles.formSubtitle}>
              Please select your access method below.
            </Text>

            {/* Hiển thị lỗi trực quan ngay trong thẻ nếu có */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Guest Login */}
            <TouchableOpacity
              style={[styles.button, styles.guestButton, loading && styles.buttonDisabled]}
              onPress={handleGuestAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.guestButtonText}>CONTINUE AS WORKER</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN IN</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Work Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity> 
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.buttonTextLoading}>Verifying...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>SECURE SIGN IN</Text>
              )}
            </TouchableOpacity>

          </View>

          {/* Footer Note */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerNote}>
              Authorized Personnel Only · Delta Galil Industries Ltd.
            </Text>
            <View style={styles.poweredByContainer}>
              <Text style={styles.poweredByText}>Powered by IE TEAM</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  logoImage: {
    width: '100%',
    maxWidth: 280,
    height: 70,
    alignSelf: 'center',
  },
  badgeContainer: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  systemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#ffffff', 
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  // Style cho thông báo lỗi
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  guestButton: {
    backgroundColor: '#e8f5e9',
    marginTop: 0,
    marginBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  guestButtonText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonTextLoading: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginLeft: 8,
  },
  footerNote: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 32,
    letterSpacing: 0.5,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    marginBottom: 20,
  },
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  poweredByText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
});