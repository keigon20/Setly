import { MusicEvent, SerializedMusicEvent } from './index';

export interface EventPrefill {
  title: string;
  artists: string[];
  venue: string;
  date: string;
  imageUri?: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  SearchEvent: undefined;
  AddEvent: { eventToEdit?: MusicEvent; prefill?: EventPrefill };
  EventDetail: { event: SerializedMusicEvent };
  ManageFriends: undefined;
  Comments: { eventId: string; eventTitle?: string; eventOwnerId: string };
  Notifications: undefined;
  NotificationSettings: undefined;
  Achievements: undefined;
  YearlyRecap: undefined;
  PastReports: undefined;
  BannedEmails: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
  GroupEdit: { groupKey: string };
  GiveawayEntries: { giveawayId: string; giveawayTitle: string };
};
