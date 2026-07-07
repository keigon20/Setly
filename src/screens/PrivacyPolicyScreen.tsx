import React from 'react';
import { Text } from 'react-native';
import LegalDocScreen, { legalStyles as s } from '../components/LegalDocScreen';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocScreen title="Privacy Policy">
      <Text style={s.meta}>Last updated: June 28, 2026</Text>

      <Text style={s.paragraph}>
        This Privacy Policy explains what information Setly ("we", "us") collects when you use
        the app, how we use it, and the choices you have. By using Setly, you agree to the
        practices described here.
      </Text>

      <Text style={s.heading}>Information We Collect</Text>
      <Text style={s.paragraph}>Account information: your email address, display name, and a unique account identifier (user ID) generated when your account is created.</Text>
      <Text style={s.paragraph}>
        Content you create: concert journal entries (artists, venue, date, cost, notes, ratings),
        photos you upload, comments, replies, and likes.
      </Text>
      <Text style={s.paragraph}>
        Social graph: your friends list, friend requests, and any users you block.
      </Text>
      <Text style={s.paragraph}>
        Search queries: when you search for an artist or venue while adding an event, that query is sent to the Ticketmaster API to return matching results.
      </Text>
      <Text style={s.paragraph}>
        Reports you submit: content reports and bug reports, including the description you
        provide and basic device/app information (platform and app version) to help us
        investigate.
      </Text>

      <Text style={s.heading}>How We Use Your Information</Text>
      <Text style={s.bullet}>• To operate the app: store your journal entries, sync them across devices, and show your content to friends you've connected with.</Text>
      <Text style={s.bullet}>• To support the friends/social features: friend requests, comments, likes, and blocking.</Text>
      <Text style={s.bullet}>• To respond to bug reports and content reports you submit.</Text>
      <Text style={s.bullet}>• To search for event details (artist, venue, date) when you add a new event.</Text>
      <Text style={s.bullet}>• To show ads in the friends feed, as described below.</Text>

      <Text style={s.paragraph}>
        We do not sell your information.
      </Text>

      <Text style={s.heading}>Advertising</Text>
      <Text style={s.paragraph}>
        We show ads in the friends feed through Google AdMob. AdMob and its partners may use
        device identifiers (such as your advertising ID) and other data to serve and measure
        ads, including personalized ads where permitted. Where required by law (such as under
        GDPR or CCPA), you'll be shown a consent prompt to control ad personalization the first
        time you use the app. You can change this choice later, or opt out of personalized
        advertising entirely, through your device's ad settings.
      </Text>

      <Text style={s.heading}>How We Share Your Information</Text>
      <Text style={s.paragraph}>
        We use Firebase (a Google service) to authenticate accounts and store app data and
        photos. Google Sign-In is available as an optional way to log in. These providers
        process data on our behalf and under their own privacy terms.
      </Text>
      <Text style={s.paragraph}>
        We use the Ticketmaster API to search for event details when you're adding an event. We
        only send your search query (e.g. an artist or venue name) — no personal account
        information is sent to Ticketmaster.
      </Text>
      <Text style={s.paragraph}>
        Content you choose to share (events, comments, likes) is visible to the friends you've
        connected with, subject to any "hide from friends" setting you apply to an event.
      </Text>

      <Text style={s.heading}>Your Choices</Text>
      <Text style={s.bullet}>• Edit your display name at any time in Settings.</Text>
      <Text style={s.bullet}>• Hide individual events from your friends' feed.</Text>
      <Text style={s.bullet}>• Block other users, which also ends any existing friendship.</Text>
      <Text style={s.bullet}>• Report comments, replies, or events that violate our Terms of Use.</Text>
      <Text style={s.bullet}>• Control ad personalization via the consent prompt or your device's ad settings, as described under Advertising above.</Text>
      <Text style={s.bullet}>• Delete your account from Settings → Delete Account. This permanently removes your profile, journal entries, photos, and friend connections. Comments or likes you left on other people's events may not be immediately removed. This cannot be undone.</Text>

      <Text style={s.heading}>Children's Privacy</Text>
      <Text style={s.paragraph}>
        Setly is not directed at children under 13, and we do not knowingly collect information
        from children under 13.
      </Text>

      <Text style={s.heading}>Changes to This Policy</Text>
      <Text style={s.paragraph}>
        We may update this policy from time to time. Continued use of the app after changes take
        effect means you accept the updated policy.
      </Text>

      <Text style={s.heading}>Contact Us</Text>
      <Text style={s.paragraph}>
        Questions about this policy or requests regarding your data can be sent to
        setlyhelp@outlook.com.
      </Text>
    </LegalDocScreen>
  );
}
