import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';
import Logo from '../components/Logo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onContinueAsGuest: () => void;
}

export default function AuthScreen({ onAuthSuccess, onContinueAsGuest }: AuthScreenProps) {
  const { login, signUp, signInWithGoogle, signInWithApple, isAppleSignInAvailable, resetPassword, isLoading, error, clearError } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPasswordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const doPasswordsMatch = password === confirmPassword;

  const showEmailError = email.length > 0 && !isEmailValid;
  const showPasswordError = !isLoginMode && password.length > 0 && !isPasswordLongEnough;
  const showConfirmPasswordError = !isLoginMode && confirmPassword.length > 0 && !doPasswordsMatch;

  const handleSubmit = async () => {
    clearError();

    if (!email || !password) {
      return;
    }

    let success: boolean;
    if (isLoginMode) {
      success = await login(email, password);
    } else {
      success = await signUp(email, password, '');
    }

    if (success) {
      onAuthSuccess();
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    const success = await resetPassword(resetEmail);
    if (success) {
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
      setShowPasswordReset(false);
      setResetEmail('');
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    const success = await signInWithGoogle();
    if (success) {
      onAuthSuccess();
    }
  };

  const handleAppleSignIn = async () => {
    clearError();
    const success = await signInWithApple();
    if (success) {
      onAuthSuccess();
    }
  };

  const isFormValid = () => {
    if (!email || !password) return false;
    if (!isEmailValid) return false;
    if (!isLoginMode) {
      if (!isPasswordLongEnough) return false;
      if (!doPasswordsMatch) return false;
    }
    return true;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Logo height={40} style={styles.logo} />
          <Text style={styles.subtitle}>
            {isLoginMode ? 'Welcome Back!' : 'Create Account'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {showEmailError && (
              <Text style={styles.fieldHint}>Enter a valid email address</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />
            {showPasswordError && (
              <Text style={styles.fieldHint}>
                Password must be at least {MIN_PASSWORD_LENGTH} characters ({password.length}/{MIN_PASSWORD_LENGTH})
              </Text>
            )}
          </View>

          {!isLoginMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
              />
              {showConfirmPasswordError && (
                <Text style={styles.fieldHint}>Passwords do not match</Text>
              )}
            </View>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {isLoginMode && (
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => setShowPasswordReset(true)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, !isFormValid() && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLoginMode ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          {isAppleSignInAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={onContinueAsGuest}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => {
              setIsLoginMode(!isLoginMode);
              clearError();
            }}
          >
            <Text style={styles.switchModeText}>
              {isLoginMode 
                ? "Don't have an account? Sign Up" 
                : "Already have an account? Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Password Reset Modal */}
        {showPasswordReset && (
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor={colors.textTertiary}
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowPasswordReset(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.resetButton]}
                  onPress={handlePasswordReset}
                >
                  <Text style={styles.resetButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  fieldHint: {
    color: colors.destructive,
    fontSize: 12,
    marginTop: 6,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  appleButton: {
    height: 48,
    marginTop: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: colors.textTertiary,
  },
  guestButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  guestButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  switchMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: colors.surfaceAlt,
  },
  cancelButtonText: {
    color: colors.textSecondary,
  },
  resetButton: {
    backgroundColor: colors.accent,
  },
  resetButtonText: {
    color: colors.textPrimary,
  },
});

