import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useEventStore } from '../contexts/EventStoreContext';
import { useFriends } from '../contexts/FriendsContext';
import { colors } from '../theme';
import Logo from '../components/Logo';
import type { RootStackParamList } from '../types/navigation';

interface ProfileScreenProps {
  onSignIn: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen({ onSignIn }: ProfileScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isEmailVerified, logout, sendVerificationEmail, refreshEmailVerified } = useAuth();
  const eventStore = useEventStore();
  const { friends, incomingRequests } = useFriends();
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isRefreshingVerification, setIsRefreshingVerification] = useState(false);

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const handleResendVerification = async () => {
    setIsSendingVerification(true);
    const success = await sendVerificationEmail();
    setIsSendingVerification(false);
    Alert.alert(
      success ? 'Email Sent' : 'Error',
      success ? 'Check your inbox for a verification link.' : 'Failed to send verification email. Please try again.'
    );
  };

  const handleRefreshVerification = async () => {
    setIsRefreshingVerification(true);
    const verified = await refreshEmailVerified();
    setIsRefreshingVerification(false);
    if (!verified) {
      Alert.alert('Not Verified Yet', "We don't see a verification yet. Check your inbox, or resend the email.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const renderStatCard = (title: string, value: string) => (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.logoRow, { paddingTop: insets.top + 16 }]}>
        <Logo />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.displayName}>
          {user?.displayName || 'Concert Journal'}
        </Text>
        {isAuthenticated && <Text style={styles.email}>{user?.email}</Text>}
        <Text style={styles.subtitle}>Your Concert Journey</Text>
      </View>

      {isAuthenticated && !isEmailVerified && (
        <View style={styles.verifyBanner}>
          <Text style={styles.verifyBannerText}>Verify your email to secure your account.</Text>
          <View style={styles.verifyBannerActions}>
            <TouchableOpacity onPress={handleResendVerification} disabled={isSendingVerification}>
              <Text style={styles.verifyBannerAction}>
                {isSendingVerification ? 'Sending...' : 'Resend email'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRefreshVerification} disabled={isRefreshingVerification}>
              <Text style={styles.verifyBannerAction}>
                {isRefreshingVerification ? 'Checking...' : "I've verified"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        {renderStatCard('Total Events', `${eventStore.totalEvents}`)}
        {renderStatCard('Unique Artists', `${eventStore.uniqueArtists}`)}
        {renderStatCard('Unique Venues', `${eventStore.uniqueVenues}`)}
        {renderStatCard('Total Spent', formatCurrency(eventStore.totalMoneySpent))}
        {renderStatCard('Average Cost', formatCurrency(eventStore.averageCost))}
        {renderStatCard('Favorite Artist', eventStore.favoriteArtist || 'N/A')}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        {eventStore.mostRecentEvent && (
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoTitle}>Most Recent</Text>
              <Text style={styles.infoValue}>{eventStore.mostRecentEvent.title}</Text>
              <Text style={styles.infoDate}>
                {new Date(eventStore.mostRecentEvent.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        {eventStore.oldestEvent && (
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoTitle}>First Event</Text>
              <Text style={styles.infoValue}>{eventStore.oldestEvent.title}</Text>
              <Text style={styles.infoDate}>
                {new Date(eventStore.oldestEvent.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('Achievements')}>
          <Ionicons name="trophy-outline" size={20} color={colors.textSecondary} style={styles.navRowIcon} />
          <Text style={styles.navRowText}>Achievements</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('YearlyRecap')}>
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.navRowIcon} />
          <Text style={styles.navRowText}>Yearly Recap</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {isAuthenticated && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.friendsRow} onPress={() => navigation.navigate('Friends')}>
            <Text style={styles.friendsRowText}>Friends</Text>
            <Text style={styles.friendsRowValue}>
              {friends.length}{incomingRequests.length > 0 ? ` · ${incomingRequests.length} pending` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.authSection}>
        {isAuthenticated ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginTitle}>Sign in to sync your data</Text>
            <Text style={styles.loginSubtitle}>
              Your events will be saved to the cloud and accessible across devices
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={onSignIn}>
              <Text style={styles.loginButtonText}>Sign In / Create Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  verifyBanner: {
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 16,
  },
  verifyBannerText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  verifyBannerActions: {
    flexDirection: 'row',
    gap: 20,
  },
  verifyBannerAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  infoDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navRowIcon: {
    marginRight: 12,
  },
  navRowText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  friendsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendsRowText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  friendsRowValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  authSection: {
    padding: 16,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.destructive,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.destructive,
    fontSize: 16,
    fontWeight: '600',
  },
  loginPrompt: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

