// SHE SAFE AI — Device location helper
//
// Web    : browser Geolocation API (permission prompt comes from the browser)
// Android/iOS : expo-location (runtime permission prompt from the OS)
//
// We never read a location without that prompt, and we never fabricate one.
// If permission is denied or the device has no fix, the caller gets an
// accurate message instead of a fake coordinate.

import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type LocationResult =
  | { status: 'granted'; lat: number; lng: number; accuracy?: number }
  | { status: 'denied'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

interface GeolocationLike {
  getCurrentPosition: (
    success: (position: {
      coords: { latitude: number; longitude: number; accuracy?: number };
    }) => void,
    error: (error: { code: number; message?: string }) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    }
  ) => void;
}

function getGeolocation(): GeolocationLike | null {
  if (typeof navigator === 'undefined') return null;
  const geolocation = (navigator as unknown as { geolocation?: GeolocationLike })
    .geolocation;
  return geolocation ?? null;
}

async function getNativeLocation(): Promise<LocationResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      return {
        status: 'denied',
        message:
          'Location permission was denied. Enable it in Settings → Apps → SHE SAFE AI → Permissions to use your position.',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      status: 'granted',
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy ?? undefined,
    };
  } catch (_error) {
    return {
      status: 'error',
      message:
        'Unable to read your location. Make sure GPS/location services are turned on and try again.',
    };
  }
}

/**
 * Request the device location. Resolves (never throws) with a discriminated
 * result so screens can show an accurate message instead of a fake position.
 */
export function getCurrentLocation(): Promise<LocationResult> {
  if (Platform.OS !== 'web') {
    return getNativeLocation();
  }

  const geolocation = getGeolocation();

  if (!geolocation) {
    return Promise.resolve({
      status: 'unavailable',
      message:
        'Location is not available in this browser. Try Chrome, Edge or Safari on a device with location services.',
    });
  }

  return new Promise<LocationResult>((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'granted',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === 1) {
          resolve({
            status: 'denied',
            message:
              'Location permission was denied. Enable it in your browser settings to see your position.',
          });
          return;
        }
        if (error.code === 3) {
          resolve({
            status: 'error',
            message: 'Finding your location timed out. Please try again.',
          });
          return;
        }
        resolve({
          status: 'error',
          message: error.message || 'Unable to read your location.',
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}
