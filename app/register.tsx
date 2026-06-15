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

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline error state for each field
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const isValidEmail = (emailStr: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return reg.test(emailStr.trim());
  };

  async function handleRegister() {
    // Clear previous errors
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);

    // If any field has an error, stop
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          setErrors({ email: 'This email is already registered.' });
        } else {
          setErrors({ general: error.message });
        }
      } else {
        Alert.alert('Success', 'Registration successful! Please sign in.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (err: any) {
      setErrors({ general: 'System connection error. Please try again.' });
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
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Operator Sign Up</Text>
            <Text style={styles.formSubtitle}>
              Create an account to access the yarn whiteboard.
            </Text>

            {/* General error */}
            {errors.general && (
              <View style={styles.generalErrorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={[styles.inputContainer, errors.fullName && styles.inputContainerError]}>
                <Ionicons name="person-outline" size={20} color={errors.fullName ? '#dc2626' : '#64748b'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#94a3b8"
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined })); }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {errors.fullName && <Text style={styles.fieldError}>{errors.fullName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputContainerError]}>
                <Ionicons name="mail-outline" size={20} color={errors.email ? '#dc2626' : '#64748b'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
              {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputContainerError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={errors.password ? '#dc2626' : '#64748b'}
                  />
                </TouchableOpacity> 
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[styles.inputContainer, errors.confirmPassword && styles.inputContainerError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined })); }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={errors.confirmPassword ? '#dc2626' : '#64748b'}
                  />
                </TouchableOpacity> 
              </View>
              {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.buttonTextLoading}>Registering...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>SIGN UP</Text>
              )}
            </TouchableOpacity>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.back()} disabled={loading}>
                <Text style={styles.toggleTextLink}>Sign In</Text>
              </TouchableOpacity>
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
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  generalErrorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
  inputContainerError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
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
  fieldError: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    paddingLeft: 4,
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  toggleText: {
    color: '#64748b',
    fontSize: 13,
  },
  toggleTextLink: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
});
