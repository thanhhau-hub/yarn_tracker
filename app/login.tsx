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
  SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * Enterprise Login & Sign Up Screen for Delta Galil Yarn Tracking System.
 * Optimized for factory workers with clear typography, high contrast,
 * large touch targets, and robust input validation.
 */
export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple Email Validation Helper
  const isValidEmail = (emailStr: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return reg.test(emailStr.trim());
  };

  async function handleAuth() {
    // 1. Basic Field Validation
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter both your email address and password to continue.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid work email address (e.g., name@deltagalil.com).');
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        Alert.alert('Missing Name', 'Please enter your full name for registration.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak Password', 'For security, your password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'The passwords you entered do not match. Please check and try again.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Logic
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          Alert.alert('Registration Failed', error.message);
        } else {
          Alert.alert(
            'Registration Successful',
            'Your account has been created! You can now sign in using your credentials.'
          );
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        // Sign In Logic
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          Alert.alert(
            'Sign In Failed',
            error.message === 'Invalid login credentials' 
              ? 'The email or password you entered is incorrect. Please verify your credentials.' 
              : error.message
          );
        }
      }
    } catch (err: any) {
      Alert.alert('System Error', 'An unexpected network error occurred. Please check your connection and try again.');
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
            <Text style={styles.companyName}>DELTA GALIL VIETNAM</Text>
            <Text style={styles.systemName}>Yarn Tracking System</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>
              {isSignUp ? 'Create Operator Account' : 'Operator Sign In'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isSignUp 
                ? 'Fill in details below to register a new system operator.' 
                : 'Enter your credentials to access the yarn whiteboard board.'}
            </Text>

            {isSignUp && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#80a090"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Work Email</Text>
              <TextInput
                style={styles.input}
                placeholder="operator@deltagalil.com"
                placeholderTextColor="#80a090"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#80a090"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
            </View>

            {isSignUp && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor="#80a090"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                />
              </View>
            )}

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
                  <Text style={styles.buttonTextLoading}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'REGISTER ACCOUNT' : 'SECURE SIGN IN'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Mode Switcher */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already registered?' : 'Need a new operator account?'}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsSignUp(!isSignUp);
                // Clear state on toggle to avoid confusion
                setPassword('');
                setConfirmPassword('');
              }}>
                <Text style={styles.toggleLink}>
                  {isSignUp ? ' Sign In Here' : ' Register Here'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            Authorized Personnel Only. All activities are logged.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#022c22', // Industrial dark forest green
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  systemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34d399', // Mint green highlight
    letterSpacing: 3,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#064e3b', // Deep emerald container card
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#065f46',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#a7f3d0',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d1fae5',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#065f46',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
    backgroundColor: '#022c22', // Dark contrast background for fields
  },
  button: {
    backgroundColor: '#10b981', // Clean emerald green action button
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#065f46',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonTextLoading: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 13,
    color: '#a7f3d0',
  },
  toggleLink: {
    fontSize: 13,
    color: '#34d399',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footerNote: {
    textAlign: 'center',
    color: '#065f46',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 32,
    letterSpacing: 1,
  },
});
