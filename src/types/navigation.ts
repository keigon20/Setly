import { MusicEvent } from './index';

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
  EventDetail: { event: MusicEvent };
  Friends: undefined;
  Comments: { eventId: string; eventTitle?: string; eventOwnerId: string };
  Notifications: undefined;
  NotificationSettings: undefined;
  Achievements: undefined;
  YearlyRecap: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};
