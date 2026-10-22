// SHE SAFE AI — Route geometry helpers (client-side, simulated)
//
// The backend `/api/routes/safe` returns safety scores and distance/duration
// only — it does NOT return a road geometry or polyline. To visualise the
// options we draw a smooth curve between origin and destination.
//
// IMPORTANT: this curve is a SIMULATED illustration, not real turn-by-turn
// routing. It is labelled as such in the UI. No live safety data is invented.

import type { LatLng } from '../components/InteractiveMap';

/** Great-circle distance between two coordinates, in kilometres. */
export function distanceKm(from: LatLng, to: LatLng): number {
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

/**
 * Build a quadratic Bézier curve between two points.
 * `curve` bends the path sideways; different values keep the three demo
 * route options visually distinct.
 */
export function buildRoutePath(
  origin: LatLng,
  destination: LatLng,
  curve: number,
  steps = 32
): LatLng[] {
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;

  // Perpendicular offset for the Bézier control point.
  const controlLat = midLat + dLng * curve;
  const controlLng = midLng - dLat * curve;

  const points: LatLng[] = [];
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    const inv = 1 - t;
    points.push({
      lat:
        inv * inv * origin.lat +
        2 * inv * t * controlLat +
        t * t * destination.lat,
      lng:
        inv * inv * origin.lng +
        2 * inv * t * controlLng +
        t * t * destination.lng,
    });
  }
  return points;
}

/** Per-route curvature used for the demo illustration. */
export const ROUTE_CURVES: Record<string, number> = {
  'route-a': 0.06,
  'route-b': -0.18,
  'route-c': 0.26,
};
