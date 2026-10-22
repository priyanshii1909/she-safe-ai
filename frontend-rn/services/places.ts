// SHE SAFE AI — Real-world place & route services
//
// Data sources (no API key, no billing required):
// - Nominatim / OpenStreetMap  -> place search and nearby hospitals, police, schools
// - OSRM (routing.openstreetmap.de) -> real road-network routes with geometry
//
// These are live public services. They are NOT Google Maps. To use Google
// Places/Directions instead you need a Google Maps API key with billing
// enabled; see README before switching providers.

import type { LatLng } from '../src/components/InteractiveMap';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const OSRM_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

/** Connaught Place, New Delhi — default map centre. */
export const DELHI_CENTER: LatLng = { lat: 28.6328, lng: 77.2197 };

/** Delhi NCR bounding box (left, top, right, bottom). */
export const DELHI_VIEWBOX = '76.84,28.88,77.55,28.30';

export type PlaceCategory =
  | 'hospital'
  | 'police'
  | 'school'
  | 'public_building'
  | 'other';

export interface DiscoveredPlace extends LatLng {
  id: string;
  name: string;
  address?: string;
  category: PlaceCategory;
  distanceKm: number;
}

export interface RoadRoute {
  points: LatLng[];
  distanceKm: number;
  durationMin: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function categorize(type?: string): PlaceCategory {
  switch (type) {
    case 'hospital':
      return 'hospital';
    case 'police':
      return 'police';
    case 'school':
    case 'college':
    case 'university':
      return 'school';
    default:
      return 'other';
  }
}

function shortAddress(result: NominatimResult): string {
  const parts = (result.display_name || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(0, 3).join(', ');
}

/** Straight-line distance in km. */
export function distanceBetween(from: LatLng, to: LatLng): number {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function nominatim(path: string): Promise<NominatimResult[]> {
  const response = await fetch(`${NOMINATIM_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Place search failed (${response.status})`);
  }
  const data = (await response.json()) as NominatimResult[];
  return Array.isArray(data) ? data : [];
}

/**
 * Search India for a place by name, biased towards Delhi.
 * Requires no permission and returns real OpenStreetMap data.
 */
export async function searchPlaces(query: string): Promise<DiscoveredPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'in',
    viewbox: DELHI_VIEWBOX,
    bounded: '0',
  });

  const results = await nominatim(`/search?${params.toString()}`);
  return results
    .filter((item) => item.name)
    .map((item) => ({
      id: `osm-${item.place_id}`,
      name: item.name as string,
      address: shortAddress(item),
      lat: Number(item.lat),
      lng: Number(item.lon),
      category: categorize(item.type),
      distanceKm: 0,
    }));
}

const DISCOVERY_TARGETS: { amenity: string; category: PlaceCategory }[] = [
  { amenity: 'hospital', category: 'hospital' },
  { amenity: 'police', category: 'police' },
  { amenity: 'school', category: 'school' },
];

/**
 * Find real nearby safe public places (hospitals, police stations, schools)
 * around a point using OpenStreetMap / Nominatim.
 *
 * Nominatim asks for at most one request per second, so the three category
 * lookups run sequentially with a gap.
 */
export async function findNearbySafePlaces(
  center: LatLng,
  radiusKm = 4
): Promise<DiscoveredPlace[]> {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180));
  const viewbox = [
    (center.lng - lngDelta).toFixed(5),
    (center.lat + latDelta).toFixed(5),
    (center.lng + lngDelta).toFixed(5),
    (center.lat - latDelta).toFixed(5),
  ].join(',');

  const collected: DiscoveredPlace[] = [];
  let failures = 0;

  for (let index = 0; index < DISCOVERY_TARGETS.length; index++) {
    const target = DISCOVERY_TARGETS[index];
    if (index > 0) await sleep(1100); // respect the 1 request/second policy

    const params = new URLSearchParams({
      amenity: target.amenity,
      viewbox,
      bounded: '1',
      format: 'jsonv2',
      addressdetails: '0',
      limit: '12',
    });

    try {
      const results = await nominatim(`/search?${params.toString()}`);
      results.forEach((item) => {
        if (!item.name) return;
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        collected.push({
          id: `osm-${item.place_id}`,
          name: item.name,
          address: shortAddress(item),
          lat,
          lng,
          category: target.category,
          distanceKm: distanceBetween(center, { lat, lng }),
        });
      });
    } catch {
      failures += 1;
    }
  }

  if (failures === DISCOVERY_TARGETS.length) {
    throw new Error('Could not reach OpenStreetMap. Check your connection.');
  }

  const seen = new Set<string>();
  return collected
    .filter((place) => {
      const key = `${place.name}|${place.lat.toFixed(4)}|${place.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 12);
}

/**
 * Fetch up to three real walking routes along the OpenStreetMap road network.
 * Returns actual geometry (list of coordinates) that can be drawn on the map.
 */
export async function getRoadRoutes(
  origin: LatLng,
  destination: LatLng
): Promise<RoadRoute[]> {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    alternatives: '3',
    steps: 'false',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(
      `${OSRM_URL}/${coordinates}?${params.toString()}`,
      { signal: controller.signal }
    );
    if (!response.ok) {
      throw new Error(`Routing service returned ${response.status}`);
    }

    const data = (await response.json()) as {
      code?: string;
      routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }[];
    };

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No walking route found between these points');
    }

    return data.routes.slice(0, 3).map((route) => ({
      points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
    }));
  } finally {
    clearTimeout(timer);
  }
}
