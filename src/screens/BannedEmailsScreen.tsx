import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';

export default function BannedEmailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [bannedEmails, setBannedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'bannedEmails'),
      snap => setBannedEmails(snap.exists() ? (snap.data().emails ?? []) : []),
      err => console.warn('[BannedEmails] listener error:', err.code),
    );
    return () => unsub();
  }, []);

  const handleBan = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (email === (user?.email ?? '').toLowerCase()) {
      Alert.alert('Not allowed', 'You cannot ban your own email address.');
      return;
    }
    setNewEmail('');
    try {
      await setDoc(doc(db, 'config', 'bannedEmails'), { emails: arrayUnion(email) }, { merge: true });
    } catch {
      Alert.alert('Error', 'Failed to ban email. Please try again.');
    }
  };

  const handleUnban = (email: string) => {
    Alert.alert(
      'Unban Email',
      `Remove "${email}" from the ban list? This email will be able to sign in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'config', 'bannedEmails'), { emails: arrayRemove(email) });
            } catch {
              Alert.alert('Error', 'Failed to remove ban. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Banned Emails</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="email@example.com"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleBan}
          />
          <TouchableOpacity
            style={[styles.banBtn, !newEmail.trim() && styles.banBtnDisabled]}
            onPress={handleBan}
            disabled={!newEmail.trim()}
          >
            <Text style={styles.banBtnText}>Ban</Text>
          </TouchableOpacity>
        </View>

        {bannedEmails.length === 0 ? (
          <Text style={styles.emptyText}>No banned emails</Text>
        ) : (
          bannedEmails.map(email => (
            <View key={email} style={styles.emailRow}>
              <Text style={styles.emailText} numberOfLines={1}>{email}</Text>
              <TouchableOpacity onPress={() => handleUnban(email)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { fontSize: 16, color: colors.textSecondary, width: 50 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 50 },
  scrollContent: { padding: 16 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  banBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${colors.destructive}22`,
    borderWidth: 1,
    borderColor: colors.destructive,
    justifyContent: 'center',
  },
  banBtnDisabled: { opacity: 0.4 },
  banBtnText: { fontSize: 14, fontWeight: '600', color: colors.destructive },
  emptyText: { fontSize: 14, color: colors.textTertiary },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  emailText: { fontSize: 14, color: colors.textSecondary, flex: 1, marginRight: 10 },
});
