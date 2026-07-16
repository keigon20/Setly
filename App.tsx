import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import MobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import * as Notifications from 'expo-notifications';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { EventStoreProvider } from './src/contexts/EventStoreContext';
import { FriendsProvider } from './src/contexts/FriendsContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MigrateEventsModal from './src/components/MigrateEventsModal';
import HomeScreen from './src/screens/HomeScreen';
import JournalScreen from './src/screens/JournalScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchEventScreen from './src/screens/SearchEventScreen';
import AddEventScreen from './src/screens/AddEventScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import GiveawaysScreen from './src/screens/GiveawaysScreen';
import GiveawayEntriesScreen from './src/screens/GiveawayEntriesScreen';
import CommentsScreen from './src/screens/CommentsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import YearlyRecapScreen from './src/screens/YearlyRecapScreen';
import AdminScreen from './src/screens/AdminScreen';
import PastReportsScreen from './src/screens/PastReportsScreen';
import BannedEmailsScreen from './src/screens/BannedEmailsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsOfUseScreen from './src/screens/TermsOfUseScreen';
import GroupEditScreen from './src/screens/GroupEditScreen';
import { MusicEvent, serializeEvent } from './src/types';
import { colors } from './src/theme';

// Show notifications as alerts when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ navigation, onSignIn }: { navigation: any; onSignIn: () => void }) {
  const { isAdmin, user } = useAuth();
  const isGiveawaysEligible = user?.country === 'US';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Journal"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="journal" color={color} size={size} />,
        }}
      >
        {() => (
          <JournalScreen
            onEventPress={(event: MusicEvent) => navigation.navigate('EventDetail', { event: serializeEvent(event) })}
            onAddEvent={() => navigation.navigate('SearchEvent')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Friends"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      {isGiveawaysEligible && (
        <Tab.Screen
          name="Giveaways"
          component={GiveawaysScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="gift" color={color} size={size} />,
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      >
        {() => <ProfileScreen onSignIn={onSignIn} />}
      </Tab.Screen>
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" color={color} size={size} />,
          }}
        />
      )}
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    Notifications.requestPermissionsAsync().catch(console.error);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated && !showAuth) {
    return (
      <AuthScreen
        onAuthSuccess={() => setShowAuth(true)}
        onContinueAsGuest={() => setShowAuth(true)}
      />
    );
  }

  if (isAuthenticated && !user?.onboardingCompleted) {
    return <OnboardingScreen />;
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs">
          {({ navigation }) => <MainTabs navigation={navigation} onSignIn={() => setShowAuth(false)} />}
        </Stack.Screen>
        <Stack.Screen name="SearchEvent" component={SearchEventScreen} />
        <Stack.Screen name="AddEvent" component={AddEventScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="ManageFriends" component={FriendsScreen} />
        <Stack.Screen name="Comments" component={CommentsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="YearlyRecap" component={YearlyRecapScreen} />
        <Stack.Screen name="PastReports" component={PastReportsScreen} />
        <Stack.Screen name="BannedEmails" component={BannedEmailsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
        <Stack.Screen name="GroupEdit" component={GroupEditScreen} />
        <Stack.Screen name="GiveawayEntries" component={GiveawayEntriesScreen} />
      </Stack.Navigator>
      <MigrateEventsModal />
    </>
  );
}

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await AdsConsent.gatherConsent();
      } catch (err) {
        console.error('[Ads] Failed to gather consent:', err);
      }
      try {
        await MobileAds().initialize();
      } catch (err) {
        console.error('[Ads] Failed to initialize Mobile Ads SDK:', err);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: colors.background,
            card: colors.surface,
            border: colors.border,
            text: colors.textPrimary,
            primary: colors.accent,
          },
        }}
      >
        <AuthProvider>
          <FriendsProvider>
            <EventStoreProvider>
              <NotificationsProvider>
                <StatusBar style="light" />
                <AppContent />
              </NotificationsProvider>
            </EventStoreProvider>
          </FriendsProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
});
