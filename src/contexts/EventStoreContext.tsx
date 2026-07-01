import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { MusicEvent, YearStatistics } from '../types';
import { scheduleEventReminder, cancelEventReminder } from '../utils/notifications';

const EVENTS_STORAGE_KEY = 'music_events';
const EVENTS_COLLECTION = 'events';

interface EventStoreContextType {
  events: MusicEvent[];
  isLoading: boolean;
  addEvent: (event: Omit<MusicEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateEvent: (event: MusicEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventById: (id: string) => MusicEvent | undefined;
  backfillDisplayName: (displayName: string) => Promise<void>;
  totalEvents: number;
  totalMoneySpent: number;
  uniqueArtists: number;
  uniqueVenues: number;
  favoriteArtist?: string;
  averageCost: number;
  mostRecentEvent?: MusicEvent;
  oldestEvent?: MusicEvent;
  availableYears: number[];
  eventsForYear: (year: number) => MusicEvent[];
  statisticsForYear: (year: number) => YearStatistics;
}

const EventStoreContext = createContext<EventStoreContextType | undefined>(undefined);

export function useEventStore() {
  const context = useContext(EventStoreContext);
  if (!context) {
    throw new Error('useEventStore must be used within an EventStoreProvider');
  }
  return context;
}

interface EventStoreProviderProps {
  children: ReactNode;
}

export function EventStoreProvider({ children }: EventStoreProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<MusicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load events based on auth state
  useEffect(() => {
    if (isAuthenticated && user) {
      // Load from Firestore - top-level collection so friends' events can be queried by userId
      const q = query(
        collection(db, EVENTS_COLLECTION),
        where('userId', '==', user.id),
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedEvents: MusicEvent[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            artists: data.artists || [],
            venue: data.venue,
            date: data.date?.toDate() || new Date(),
            cost: data.cost || 0,
            notes: data.notes || '',
            imageUri: data.imageUri || undefined,
            overallRating: data.overallRating,
            soundRating: data.soundRating,
            crowdRating: data.crowdRating,
            setlistRating: data.setlistRating,
            isHidden: data.isHidden || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        });
        setEvents(loadedEvents);
        setIsLoading(false);
      }, (error) => {
        console.error('[EventStore] Firestore listener error:', error.code, error.message);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Load from local storage
      loadLocalEvents();
    }
  }, [isAuthenticated, user]);

  // Save to local storage when events change (for non-authenticated users)
  useEffect(() => {
    if (!isAuthenticated) {
      saveLocalEvents();
    }
  }, [events, isAuthenticated]);

  const loadLocalEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const eventsWithDates = parsed.map((event: any) => ({
          ...event,
          date: new Date(event.date),
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt)
        }));
        setEvents(eventsWithDates);
      }
    } catch (error) {
      console.error('Error loading local events:', error);
    }
    setIsLoading(false);
  };

  const saveLocalEvents = async () => {
    try {
      await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Error saving local events:', error);
    }
  };

  const addEvent = async (eventData: Omit<MusicEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const newEvent: MusicEvent = {
      ...eventData,
      id: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isAuthenticated && user) {
      const eventRef = doc(collection(db, EVENTS_COLLECTION));
      await setDoc(eventRef, {
        ...newEvent,
        userId: user.id,
        userDisplayName: user.displayName,
        isHidden: newEvent.isHidden || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      // Schedule a local reminder for the day after the event if it's in the future
      if (eventData.date > new Date()) {
        scheduleEventReminder(eventRef.id, eventData.title, eventData.date).catch(console.error);
      }
      return eventRef.id;
    } else {
      const id = Date.now().toString();
      setEvents(prev => [{ ...newEvent, id }, ...prev]);
      return id;
    }
  };

  const updateEvent = async (event: MusicEvent) => {
    const updatedEvent = {
      ...event,
      updatedAt: new Date()
    };

    // Cancel the post-event reminder — the user has updated the event themselves
    cancelEventReminder(event.id).catch(console.error);

    if (isAuthenticated && user) {
      // Update in Firestore
      await setDoc(doc(db, EVENTS_COLLECTION, event.id), {
        ...updatedEvent,
        userId: user.id,
        userDisplayName: user.displayName,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // Update local state
    setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e));
  };

  const deleteEvent = async (id: string) => {
    if (isAuthenticated && user) {
      // Delete from Firestore
      await deleteDoc(doc(db, EVENTS_COLLECTION, id));
    }

    // Update local state
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const getEventById = (id: string) => {
    return events.find(e => e.id === id);
  };

  const backfillDisplayName = async (displayName: string) => {
    if (!isAuthenticated || !user || events.length === 0) return;

    const BATCH_LIMIT = 500; // Firestore max operations per batch
    const eventIds = events.map(e => e.id);

    for (let i = 0; i < eventIds.length; i += BATCH_LIMIT) {
      const chunk = eventIds.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach(id => {
        batch.update(doc(db, EVENTS_COLLECTION, id), { userDisplayName: displayName });
      });
      await batch.commit();
    }
  };

  // Statistics calculations
  const totalEvents = events.length;
  const totalMoneySpent = events.reduce((sum, event) => sum + event.cost, 0);
  
  const uniqueArtists = React.useMemo(() => {
    const allArtists = events.flatMap(e => e.artists);
    return new Set(allArtists).size;
  }, [events]);
  
  const uniqueVenues = React.useMemo(() => {
    const allVenues = events.map(e => e.venue);
    return new Set(allVenues).size;
  }, [events]);
  
  const favoriteArtist = React.useMemo(() => {
    if (events.length === 0) return undefined;
    const allArtists = events.flatMap(e => e.artists);
    const artistCounts: Record<string, number> = {};
    allArtists.forEach(artist => {
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    return Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [events]);
  
  const averageCost = events.length > 0 ? totalMoneySpent / totalEvents : 0;
  
  const mostRecentEvent = React.useMemo(() => {
    return events.length > 0 
      ? events.reduce((latest, event) => event.date > latest.date ? event : latest)
      : undefined;
  }, [events]);
  
  const oldestEvent = React.useMemo(() => {
    return events.length > 0 
      ? events.reduce((oldest, event) => event.date < oldest.date ? event : oldest)
      : undefined;
  }, [events]);
  
  const availableYears = React.useMemo(() => {
    const years = events.map(e => new Date(e.date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [events]);

  const eventsForYear = (year: number): MusicEvent[] => {
    return events.filter(e => new Date(e.date).getFullYear() === year);
  };

  const statisticsForYear = (year: number): YearStatistics => {
    const yearEvents = eventsForYear(year);
    
    return {
      year,
      totalEvents: yearEvents.length,
      totalMoneySpent: yearEvents.reduce((sum, e) => sum + e.cost, 0),
      uniqueArtists: new Set(yearEvents.flatMap(e => e.artists)).size,
      uniqueVenues: new Set(yearEvents.map(e => e.venue)).size,
      favoriteArtist: (() => {
        const counts: Record<string, number> = {};
        yearEvents.flatMap(e => e.artists).forEach(a => { counts[a] = (counts[a] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      })(),
      averageCost: yearEvents.length > 0 
        ? yearEvents.reduce((sum, e) => sum + e.cost, 0) / yearEvents.length 
        : 0,
      mostRecentEvent: yearEvents.length > 0 
        ? yearEvents.reduce((latest, e) => e.date > latest.date ? e : latest)
        : undefined,
      oldestEvent: yearEvents.length > 0 
        ? yearEvents.reduce((oldest, e) => e.date < oldest.date ? e : oldest)
        : undefined
    };
  };

  const value: EventStoreContextType = {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    backfillDisplayName,
    totalEvents,
    totalMoneySpent,
    uniqueArtists,
    uniqueVenues,
    favoriteArtist,
    averageCost,
    mostRecentEvent,
    oldestEvent,
    availableYears,
    eventsForYear,
    statisticsForYear
  };

  return (
    <EventStoreContext.Provider value={value}>
      {children}
    </EventStoreContext.Provider>
  );
}

