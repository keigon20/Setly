import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';
import DateField from '../components/DateField';
import Logo from '../components/Logo';

function getAge(birthday: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age--;
  }
  return age;
}

interface Slide {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  isAddButton?: boolean;
}

export default function OnboardingScreen() {
  const { user, completeOnboardingProfile, finishOnboarding } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [phase, setPhase] = useState<'form' | 'slides'>(
    user?.country && user?.birthday ? 'slides' : 'form'
  );
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [country, setCountry] = useState<'US' | 'OTHER' | null>(user?.country || null);
  const [birthday, setBirthday] = useState<Date | null>(user?.birthday || null);
  const [isSaving, setIsSaving] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const isUSAdult = country === 'US' && !!birthday && getAge(birthday) >= 18;

  const slides: Slide[] = useMemo(() => {
    const base: Slide[] = [
      {
        key: 'journal',
        title: 'Your Concert Journal',
        description: 'Every show you log is saved here — your saved concerts will show up on the Journal tab.',
        icon: 'journal',
      },
      {
        key: 'add',
        title: 'Log a Show',
        description: 'Tap the add button to add an event you went to.',
        icon: 'add',
        isAddButton: true,
      },
      {
        key: 'friends',
        title: 'Friends',
        description: "View your friends' concerts here. Like and comment on their shows.",
        icon: 'people',
      },
    ];
    if (isUSAdult) {
      base.push({
        key: 'giveaways',
        title: 'Giveaways',
        description: 'Giveaways will periodically appear. Enter here for a chance to win tickets.',
        icon: 'gift',
      });
    }
    base.push({
      key: 'profile',
      title: 'Profile',
      description: 'Your stats, add friends, and view your achievements.',
      icon: 'person-circle',
    });
    return base;
  }, [isUSAdult]);

  const isLastSlide = slideIndex === slides.length - 1;

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Missing name', 'Please enter a display name.');
      return;
    }
    if (!country) {
      Alert.alert('Missing country', 'Please select your country.');
      return;
    }
    if (!birthday) {
      Alert.alert('Missing birthday', 'Please select your birthday.');
      return;
    }
    setIsSaving(true);
    const success = await completeOnboardingProfile(displayName, country, birthday);
    setIsSaving(false);
    if (success) {
      setPhase('slides');
    } else {
      Alert.alert('Error', 'Failed to save your info. Please try again.');
    }
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setSlideIndex(index);
  };

  const handleNext = async () => {
    if (!isLastSlide) {
      goToSlide(slideIndex + 1);
      return;
    }
    setIsSaving(true);
    await finishOnboarding();
    setIsSaving(false);
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setSlideIndex(index);
  };

  if (phase === 'form') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.formScroll, { paddingTop: insets.top + 24 }]}>
          <Logo height={36} style={styles.formLogo} />
          <Text style={styles.formHeading}>Welcome!</Text>
          <Text style={styles.formSubheading}>Let's get your profile set up.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TouchableOpacity
              style={[styles.countryOption, country === 'US' && styles.countryOptionSelected]}
              onPress={() => setCountry('US')}
            >
              <Text style={styles.countryOptionText}>United States</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.countryOption, country === 'OTHER' && styles.countryOptionSelected]}
              onPress={() => setCountry('OTHER')}
            >
              <Text style={styles.countryOptionText}>Outside the United States</Text>
            </TouchableOpacity>
          </View>

          <DateField
            label="Birthday"
            value={birthday}
            onChange={setBirthday}
            maximumDate={new Date()}
          />

          <View style={styles.reassuranceBox}>
            <Ionicons name="lock-closed" size={16} color={colors.textSecondary} style={styles.reassuranceIcon} />
            <Text style={styles.reassuranceText}>
              Your country and birthday are never shown to other users — they're only used to determine giveaway eligibility.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Continue'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEnabled={!isSaving}
      >
        {slides.map(slide => (
          <View key={slide.key} style={[styles.slide, { width, paddingTop: insets.top + 40 }]}>
            <View style={styles.illustrationCircle}>
              {slide.isAddButton ? (
                <View style={styles.fabReplica}>
                  <Text style={styles.fabReplicaText}>+</Text>
                </View>
              ) : (
                <Ionicons name={slide.icon} size={72} color={colors.accent} />
              )}
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.slideFooter, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View key={slide.key} style={[styles.dot, i === slideIndex && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>{isLastSlide ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formScroll: {
    flexGrow: 1,
    padding: 20,
  },
  formLogo: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  formHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  formSubheading: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
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
  reassuranceBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reassuranceIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  reassuranceText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  fabReplica: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabReplicaText: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '300',
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  slideFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
});
