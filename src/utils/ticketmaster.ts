import { EventPrefill } from '../types/navigation';

const API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';
const VENUES_URL = 'https://app.ticketmaster.com/discovery/v2/venues.json';

// React Native New Architecture's fetch has issues with certain external domains.
// XHR uses the native networking stack and is reliable across all RN versions.
function xhrGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Request failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));
    xhr.timeout = 10000;
    xhr.send();
  });
}

export interface TicketmasterEventResult {
  id: string;
  prefill: EventPrefill;
}

function mapEvent(event: any): TicketmasterEventResult {
  const venue = event._embedded?.venues?.[0]?.name || '';
  const attractions = event._embedded?.attractions || [];
  const artists = attractions.length > 0
    ? attractions.map((a: any) => a.name)
    : [event.name];
  const image = event.images?.find((img: any) => img.width >= 300)?.url || event.images?.[0]?.url;

  return {
    id: event.id,
    prefill: {
      title: event.name,
      artists,
      venue,
      date: event.dates?.start?.localDate || new Date().toISOString().split('T')[0],
      imageUri: image,
    },
  };
}

export interface TicketmasterVenueResult {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

export async function searchTicketmasterVenues(query: string): Promise<TicketmasterVenueResult[]> {
  if (!API_KEY) {
    throw new Error('Ticketmaster API key is not configured. Set EXPO_PUBLIC_TICKETMASTER_API_KEY.');
  }

  const url = `${VENUES_URL}?apikey=${API_KEY}&keyword=${encodeURIComponent(query)}&size=2`;
  const data = await xhrGet(url);
  const venues = data._embedded?.venues || [];
  return venues.map((v: any) => ({
    id: v.id,
    name: v.name,
    city: v.city?.name,
    state: v.state?.stateCode || v.state?.name,
  }));
}

export async function searchTicketmasterEvents(query: string): Promise<TicketmasterEventResult[]> {
  if (!API_KEY) {
    throw new Error('Ticketmaster API key is not configured. Set EXPO_PUBLIC_TICKETMASTER_API_KEY.');
  }

  const url = `${BASE_URL}?apikey=${API_KEY}&keyword=${encodeURIComponent(query)}&size=20`;
  const data = await xhrGet(url);
  const events = data._embedded?.events || [];
  return events.map(mapEvent);
}
