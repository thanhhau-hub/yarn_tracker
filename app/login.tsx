import { useState } from 'react';
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
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all email and password fields.');
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Confirm password does not match.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      });

      setLoading(false);

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else {
        Alert.alert(
          'Sign Up Successful',
          'Your account has been created successfully! You can sign in now.'
        );
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);

      if (error) {
        Alert.alert('Login Failed', error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Delta Galil Chevron Logo & Branding */}
          <View style={styles.logoContainer}>
            <View style={styles.chevronContainer}>
              <View style={styles.chevronTop} />
              <View style={styles.chevronBottom} />
            </View>
            <Text style={styles.logoText}>DELTA GALIL</Text>
            <Text style={styles.logoSubtext}>VIETNAM</Text>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>TRACKER</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          <Text style={styles.title}>
            {isSignUp ? 'Create an Account' : 'Sign In to System'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Sign up to manage yarn rolls' : 'Please sign in to continue'}
          </Text>

          {isSignUp && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Work Email</Text>
            <TextInput
              style={styles.input}
              placeholder="name@deltagalil.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {isSignUp && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up Now' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.toggleLink}>
                {isSignUp ? ' Sign in here' : ' Create an account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#042f1a', // Deep forest green background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0a3d24', // Deep emerald card
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#115e3b',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  chevronContainer: {
    width: 60,
    height: 40,
    position: 'relative',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronTop: {
    position: 'absolute',
    width: 30,
    height: 6,
    backgroundColor: '#64748b', // Dark grey segment of Chevron
    transform: [{ rotate: '30deg' }],
    top: 12,
    right: 15,
    borderRadius: 3,
  },
  chevronBottom: {
    position: 'absolute',
    width: 30,
    height: 6,
    backgroundColor: '#84cc16', // Vibrant lime green segment of Chevron
    transform: [{ rotate: '-30deg' }],
    bottom: 12,
    right: 15,
    borderRadius: 3,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  },
  logoSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a7f3d0',
    letterSpacing: 6,
    marginTop: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '80%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#115e3b',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#84cc16', // Elegant lime green accent to match logo chevron
    paddingHorizontal: 8,
    letterSpacing: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#a7f3d0',
    textAlign: 'center',
    marginBottom: 28,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1fae5',
    marginBottom: 8,
    paddingLeft: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#115e3b',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#f8fafc',
    backgroundColor: '#042f1a',
  },
  button: {
    backgroundColor: '#10b981', // Elegant primary emerald green
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#047857',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: '#a7f3d0',
  },
  toggleLink: {
    fontSize: 14,
    color: '#34d399', // Light mint green link
    fontWeight: '600',
  },
});
