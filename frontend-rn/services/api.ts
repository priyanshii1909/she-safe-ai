// SHE SAFE AI — API Service
// Connects to the existing FastAPI backend.
//
// Base URL resolution order:
// 1. EXPO_PUBLIC_API_URL  (set for production / EAS builds — e.g. the Render URL)
// 2. Local development fallback:
//    - Android emulator: http://10.0.2.2:8000  (host machine)
//    - iOS simulator / web browser: http://localhost:8000
//
// To point a build at the deployed backend, set EXPO_PUBLIC_API_URL in
// eas.json ("build.<profile>.env") or in a local .env file.

import { Platform } from 'react-native';

declare const process: { env: Record<string, string | undefined> };

const PRODUCTION_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim();

const BASE_URL =
  PRODUCTION_URL.length > 0
    ? PRODUCTION_URL.replace(/\/+$/, '')
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:8000'
      : 'http://localhost:8000';


const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

// ── Error Handling ──────────────────────────────────────────────────────────

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  queryParams?: Record<string, string>
): Promise<T> {
  let url = `${BASE_URL}${path}`;

  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const options: RequestInit = {
    method,
    headers: HEADERS,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.detail || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other errors
    throw new ApiError(
      'Unable to connect. Please check your internet connection and try again.',
      0
    );
  }
}

// ── AI Endpoints ────────────────────────────────────────────────────────────

import type {
  AIAnalyzeResponse,
  HelpMeSayItResponse,
  SafetyPlan,
} from '../types';

export function analyzeMessage(
  message: string,
  conversationId?: string,
  history?: { role: string; content: string }[]
): Promise<AIAnalyzeResponse> {
  return request<AIAnalyzeResponse>('POST', '/api/ai/analyze', {
    message,
    ...(conversationId && { conversation_id: conversationId }),
    ...(history && { history }),
  });
}

export function helpMeSayIt(
  situation: string,
  audience?: string
): Promise<HelpMeSayItResponse> {
  return request<HelpMeSayItResponse>('POST', '/api/ai/help-me-say-it', {
    situation,
    ...(audience && { audience }),
  });
}

export function createSafetyPlan(
  situation: string,
  concernLevel?: string
): Promise<SafetyPlan> {
  return request<SafetyPlan>('POST', '/api/ai/safety-plan', {
    situation,
    ...(concernLevel && { concern_level: concernLevel }),
  });
}

// ── SOS Endpoints ───────────────────────────────────────────────────────────

import type { SOSResponse } from '../types';

export function startSOS(params?: {
  lat?: number;
  lng?: number;
  message?: string;
}): Promise<SOSResponse> {
  return request<SOSResponse>('POST', '/api/sos/start', {
    user_id: 'demo-user',
    ...(params?.lat !== undefined && { location_lat: params.lat }),
    ...(params?.lng !== undefined && { location_lng: params.lng }),
    ...(params?.message && { message: params.message }),
  });
}

export function stopSOS(sosId: string): Promise<{ status: string }> {
  return request<{ status: string }>('POST', '/api/sos/stop', {
    sos_id: sosId,
  });
}

// ── Journey Endpoints ───────────────────────────────────────────────────────

import type { JourneyResponse, JourneyCheckInResponse } from '../types';

export function startJourney(
  destination: string,
  expectedMinutes: number
): Promise<JourneyResponse> {
  return request<JourneyResponse>('POST', '/api/journey/start', {
    user_id: 'demo-user',
    destination,
    expected_arrival_minutes: expectedMinutes,
  });
}

export function checkInJourney(journeyId: string): Promise<JourneyCheckInResponse> {
  return request<JourneyCheckInResponse>(
    'POST',
    '/api/journey/check-in',
    undefined,
    { journey_id: journeyId }
  );
}

// ── Contacts Endpoints ──────────────────────────────────────────────────────

import type { TrustedContact } from '../types';

export function getContacts(): Promise<TrustedContact[]> {
  return request<TrustedContact[]>('GET', '/api/contacts');
}

export function addContact(contact: {
  name: string;
  phone: string;
  contact_type: string;
  can_receive_sos?: boolean;
  can_receive_location?: boolean;
}): Promise<TrustedContact> {
  return request<TrustedContact>('POST', '/api/contacts', contact);
}

export function deleteContact(id: string): Promise<{ status: string }> {
  return request<{ status: string }>('DELETE', `/api/contacts/${id}`);
}

// ── Map Endpoints ───────────────────────────────────────────────────────────

import type { MapPoint } from '../types';

export function getMapPoints(): Promise<MapPoint[]> {
  return request<MapPoint[]>('GET', '/api/map/points');
}

// ── Saved Places Endpoints ──────────────────────────────────────────────────

import type { SavedPlace, SavedPlaceCategory } from '../types';

export function getSavedPlaces(): Promise<SavedPlace[]> {
  return request<SavedPlace[]>('GET', '/api/places');
}

export function addSavedPlace(place: {
  label: string;
  category: SavedPlaceCategory;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}): Promise<SavedPlace> {
  return request<SavedPlace>('POST', '/api/places', place);
}

export function deleteSavedPlace(id: string): Promise<{ status: string }> {
  return request<{ status: string }>('DELETE', `/api/places/${id}`);
}

// ── Routes Endpoints ────────────────────────────────────────────────────────

import type { SafeRouteResponse } from '../types';

export function getSafeRoutes(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  destinationName?: string;
}): Promise<SafeRouteResponse> {
  return request<SafeRouteResponse>('POST', '/api/routes/safe', {
    origin_lat: params.originLat,
    origin_lng: params.originLng,
    dest_lat: params.destLat,
    dest_lng: params.destLng,
    ...(params.destinationName && { destination_name: params.destinationName }),
  });
}
