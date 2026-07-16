import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useEventStore } from '../contexts/EventStoreContext';
import { useFriends } from '../contexts/FriendsContext';
import { submitBugReport } from '../utils/bugReports';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import DateField from '../components/DateField';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, updateDisplayName, updateCountry, updateBirthday, deleteAccount } = useAuth();
  const eventStore = useEventStore();
  const { backfillDisplayName: backfillFriendDisplayName } = useFriends();

  const [showEditName, setShowEditName] = useState(false);
  const [tempName, setTempName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const [showEditCountry, setShowEditCountry] = useState(false);
  const [isSavingCountry, setIsSavingCountry] = useState(false);

  const [showEditBirthday, setShowEditBirthday] = useState(false);
  const [tempBirthday, setTempBirthday] = useState<Date | null>(user?.birthday || null);
  const [isSavingBirthday, setIsSavingBirthday] = useState(false);

  const [showBugReport, setShowBugReport] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleOpenEditName = () => {
    setTempName(user?.displayName || '');
    setShowEditName(true);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setIsSavingName(true);
    const success = await updateDisplayName(tempName);
    setIsSavingName(false);
    if (success) {
      setShowEditName(false);
      // Update past events' and friends' denormalized copies of the name too -
      // don't block the modal on either of these.
      const trimmed = tempName.trim();
      eventStore.backfillDisplayName(trimmed).catch(err => {
        console.error('[SettingsScreen] Failed to backfill display name on past events:', err);
      });
      backfillFriendDisplayName(trimmed).catch(err => {
        console.error('[SettingsScreen] Failed to backfill display name for friends:', err);
      });
    } else {
      Alert.alert('Error', 'Failed to update name. Please try again.');
    }
  };

  const handleSelectCountry = async (country: 'US' | 'OTHER') => {
    setIsSavingCountry(true);
    const success = await updateCountry(country);
    setIsSavingCountry(false);
    if (success) {
      setShowEditCountry(false);
    } else {
      Alert.alert('Error', 'Failed to update country. Please try again.');
    }
  };

  const handleOpenEditBirthday = () => {
    setTempBirthday(user?.birthday || null);
    setShowEditBirthday(true);
  };

  const handleSaveBirthday = async () => {
    if (!tempBirthday) {
      Alert.alert('Error', 'Please select your birthday');
      return;
    }
    setIsSavingBirthday(true);
    const success = await updateBirthday(tempBirthday);
    setIsSavingBirthday(false);
    if (success) {
      setShowEditBirthday(false);
    } else {
      Alert.alert('Error', 'Failed to update birthday. Please try again.');
    }
  };

  const formatBirthday = (date: Date) =>
    date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleSubmitBugReport = async () => {
    if (!bugDescription.trim() || !user) return;
    setIsSubmittingBug(true);
    try {
      await submitBugReport(user.id, bugDescription.trim());
      setShowBugReport(false);
      setBugDescription('');
      Alert.alert('Thanks!', "We've received your report and will take a look.");
    } catch (err) {
      console.error('[SettingsScreen] Failed to submit bug report:', err);
      Alert.alert('Error', 'Failed to submit your report. Please try again.');
    } finally {
      setIsSubmittingBug(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'Delete account') return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    const { success, message } = await deleteAccount();
    setIsDeleting(false);
    if (!success) {
      Alert.alert('Error', message || 'Failed to delete account. Please try again.');
    }
  };

  const renderRow = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, destructive = false) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={destructive ? colors.destructive : colors.textSecondary} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            {renderRow('person-outline', 'Edit Name', handleOpenEditName)}
            {renderRow(
              'flag-outline',
              `Country: ${user?.country === 'US' ? 'United States' : user?.country === 'OTHER' ? 'Outside the US' : 'Not set'}`,
              () => setShowEditCountry(true)
            )}
            {renderRow(
              'calendar-outline',
              `Birthday: ${user?.birthday ? formatBirthday(user.birthday) : 'Not set'}`,
              handleOpenEditBirthday
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {renderRow('notifications-outline', 'Notification Settings', () => navigation.navigate('NotificationSettings'))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {renderRow('bug-outline', 'Report a Bug', () => setShowBugReport(true))}
          {renderRow('document-text-outline', 'Privacy Policy', () => navigation.navigate('PrivacyPolicy'))}
          {renderRow('document-text-outline', 'Terms of Use', () => navigation.navigate('TermsOfUse'))}
        </View>

        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            {renderRow('trash-outline', isDeleting ? 'Deleting...' : 'Delete Account', handleDeleteAccount, true)}
          </View>
        )}
      </ScrollView>

      <Modal visible={showEditName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholderTextColor={colors.textTertiary}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setShowEditName(false)}
                disabled={isSavingName}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveBtn]}
                onPress={handleSaveName}
                disabled={isSavingName}
              >
                <Text style={styles.saveBtnText}>{isSavingName ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditCountry} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Country</Text>
            <Text style={styles.deleteWarning}>
              Giveaways are currently only available to residents of the United States. Tell us where you live so we can show you the right content.
            </Text>
            <TouchableOpacity
              style={[styles.countryOption, user?.country === 'US' && styles.countryOptionSelected]}
              onPress={() => handleSelectCountry('US')}
              disabled={isSavingCountry}
            >
              <Text style={styles.countryOptionText}>United States</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.countryOption, user?.country === 'OTHER' && styles.countryOptionSelected]}
              onPress={() => handleSelectCountry('OTHER')}
              disabled={isSavingCountry}
            >
              <Text style={styles.countryOptionText}>Outside the United States</Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setShowEditCountry(false)}
                disabled={isSavingCountry}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditBirthday} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Birthday</Text>
            <Text style={styles.deleteWarning}>
              Giveaways require entrants to be 18 or older. Your birthday is never shown to other users.
            </Text>
            <DateField
              label="Birthday"
              value={tempBirthday}
              onChange={setTempBirthday}
              maximumDate={new Date()}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setShowEditBirthday(false)}
                disabled={isSavingBirthday}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveBtn]}
                onPress={handleSaveBirthday}
                disabled={isSavingBirthday}
              >
                <Text style={styles.saveBtnText}>{isSavingBirthday ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBugReport} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report a Bug</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholderTextColor={colors.textTertiary}
              value={bugDescription}
              onChangeText={setBugDescription}
              placeholder="What went wrong? Explain in detail, and include steps to reproduce the bug if possible."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setShowBugReport(false)}
                disabled={isSubmittingBug}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveBtn]}
                onPress={handleSubmitBugReport}
                disabled={isSubmittingBug || !bugDescription.trim()}
              >
                <Text style={styles.saveBtnText}>{isSubmittingBug ? 'Sending...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.deleteWarning}>
              This permanently deletes your account, your event journal, and your friend connections. This cannot be undone.
            </Text>
            <Text style={styles.deletePrompt}>Type "Delete account" to confirm</Text>
            <TextInput
              style={styles.modalInput}
              placeholderTextColor={colors.textTertiary}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Delete account"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  deleteConfirmText === 'Delete account' ? styles.deleteConfirmBtn : styles.deleteConfirmBtnDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteConfirmText !== 'Delete account' || isDeleting}
              >
                <Text style={styles.deleteConfirmBtnText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 50,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  rowLabelDestructive: {
    color: colors.destructive,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countryOption: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}22`,
  },
  countryOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceAlt,
  },
  cancelBtnText: {
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.accent,
  },
  saveBtnText: {
    color: colors.textPrimary,
  },
  deleteWarning: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  deletePrompt: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 6,
  },
  deleteConfirmBtn: {
    backgroundColor: `${colors.destructive}22`,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  deleteConfirmBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.5,
  },
  deleteConfirmBtnText: {
    color: colors.destructive,
    fontWeight: '600',
  },
});
