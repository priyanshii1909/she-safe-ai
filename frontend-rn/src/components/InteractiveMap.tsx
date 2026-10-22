// SHE SAFE AI — Interactive Map (dependency-free)
//
// Renders OpenStreetMap raster tiles + markers + an optional route line.
// Implemented with plain React Native views so it works on web and Android
// without react-native-maps, an API key, or a native map SDK.
//
// Base map data © OpenStreetMap contributors (https://www.openstreetmap.org/copyright)

import React, { useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMarker extends LatLng {
  id: string;
  color?: string;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isUser?: boolean;
}

export interface MapRoute {
  points: LatLng[];
  color?: string;
}

interface InteractiveMapProps {
  markers?: MapMarker[];
  route?: MapRoute | null;
  /** When set, the map centers here instead of fitting all points. */
  center?: LatLng | null;
  /** Zoom level used together with `center`. */
  zoom?: number;
  height?: number;
  showLabels?: boolean;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 17;
const FIT_MAX_ZOOM = 15;
const PADDING = 40;

function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return (
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) *
    TILE_SIZE *
    Math.pow(2, zoom)
  );
}

interface Tile {
  key: string;
  uri: string;
  left: number;
  top: number;
}

interface Segment {
  key: string;
  left: number;
  top: number;
  width: number;
  angle: number;
}

interface ProjectedMarker extends MapMarker {
  x: number;
  y: number;
}

export default function InteractiveMap({
  markers = [],
  route = null,
  center = null,
  zoom,
  height = 240,
  showLabels = false,
}: InteractiveMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoomOffset, setZoomOffset] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height: layoutHeight } = event.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === layoutHeight
        ? prev
        : { width, height: layoutHeight }
    );
  };

  const allPoints = useMemo<LatLng[]>(() => {
    const points: LatLng[] = markers.map((m) => ({ lat: m.lat, lng: m.lng }));
    if (route) points.push(...route.points);
    if (center) points.push(center);
    return points;
  }, [markers, route, center]);

  const view = useMemo(() => {
    if (size.width === 0 || size.height === 0 || allPoints.length === 0) {
      return null;
    }

    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    let mapZoom: number;
    if (center && typeof zoom === 'number') {
      mapZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    } else {
      mapZoom = MIN_ZOOM;
      const availableWidth = Math.max(16, size.width - PADDING * 2);
      const availableHeight = Math.max(16, size.height - PADDING * 2);
      for (let candidate = FIT_MAX_ZOOM; candidate >= MIN_ZOOM; candidate--) {
        const dx = Math.abs(
          lngToWorldX(maxLng, candidate) - lngToWorldX(minLng, candidate)
        );
        const dy = Math.abs(
          latToWorldY(minLat, candidate) - latToWorldY(maxLat, candidate)
        );
        if (dx <= availableWidth && dy <= availableHeight) {
          mapZoom = candidate;
          break;
        }
      }
      mapZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, mapZoom + zoomOffset)
      );
    }

    const centerLng = center ? center.lng : (minLng + maxLng) / 2;
    const centerLat = center ? center.lat : (minLat + maxLat) / 2;

    const centerX = lngToWorldX(centerLng, mapZoom);
    const centerY = latToWorldY(centerLat, mapZoom);
    const left = centerX - size.width / 2;
    const top = centerY - size.height / 2;

    const project = (point: LatLng) => ({
      x: lngToWorldX(point.lng, mapZoom) - left,
      y: latToWorldY(point.lat, mapZoom) - top,
    });

    const worldTiles = Math.pow(2, mapZoom);
    const tiles: Tile[] = [];
    const minTileX = Math.floor(left / TILE_SIZE);
    const maxTileX = Math.floor((left + size.width) / TILE_SIZE);
    const minTileY = Math.max(0, Math.floor(top / TILE_SIZE));
    const maxTileY = Math.min(
      worldTiles - 1,
      Math.floor((top + size.height) / TILE_SIZE)
    );

    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
        const wrappedX = ((tileX % worldTiles) + worldTiles) % worldTiles;
        tiles.push({
          key: `${mapZoom}-${tileX}-${tileY}`,
          uri: `https://tile.openstreetmap.org/${mapZoom}/${wrappedX}/${tileY}.png`,
          left: tileX * TILE_SIZE - left,
          top: tileY * TILE_SIZE - top,
        });
      }
    }

    const projectedMarkers: ProjectedMarker[] = markers.map((marker) => {
      const { x, y } = project(marker);
      return { ...marker, x, y };
    });

    const segments: Segment[] = [];
    if (route && route.points.length > 1) {
      const projectedRoute = route.points.map(project);
      for (let index = 1; index < projectedRoute.length; index++) {
        const from = projectedRoute[index - 1];
        const to = projectedRoute[index];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        if (length < 0.5) continue;
        segments.push({
          key: `seg-${index}`,
          left: (from.x + to.x) / 2 - length / 2,
          top: (from.y + to.y) / 2 - 2,
          width: length,
          angle: (Math.atan2(dy, dx) * 180) / Math.PI,
        });
      }
    }

    return { tiles, projectedMarkers, segments };
  }, [allPoints, center, markers, route, size, zoom, zoomOffset]);

  const canZoomOut = zoomOffset > -3;
  const canZoomIn = zoomOffset < 3;

  return (
    <View style={[styles.container, { height }]} onLayout={handleLayout}>
      {view ? (
        <>
          {view.tiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.uri }}
              style={[styles.tile, { left: tile.left, top: tile.top }]}
              resizeMode="cover"
              fadeDuration={0}
            />
          ))}

          {route && view.segments.length > 0 && (
            <View style={[StyleSheet.absoluteFill, styles.noPointerEvents]}>
              {view.segments.map((segment) => (
                <View
                  key={segment.key}
                  style={[
                    styles.routeSegment,
                    {
                      left: segment.left,
                      top: segment.top,
                      width: segment.width,
                      backgroundColor: route.color || colors.primary,
                      transform: [{ rotate: `${segment.angle}deg` }],
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {view.projectedMarkers.map((marker) => (
            <View
              key={marker.id}
              style={[
                styles.marker,
                styles.noPointerEvents,
                { left: marker.x - 14, top: marker.y - 14 },
              ]}
            >
              <View
                style={[
                  styles.markerDot,
                  marker.isUser && styles.markerUser,
                  { backgroundColor: marker.color || colors.primary },
                ]}
              >
                <Ionicons
                  name={marker.icon || (marker.isUser ? 'navigate' : 'location')}
                  size={14}
                  color="#FFFFFF"
                />
              </View>
              {showLabels && marker.label ? (
                <View style={styles.markerLabelWrap}>
                  <Text style={styles.markerLabel} numberOfLines={1}>
                    {marker.label}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={24} color={colors.textMuted} />
          <Text style={styles.placeholderText}>Loading map…</Text>
        </View>
      )}

      {/* Zoom controls */}
      {!center && (
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Zoom in"
            disabled={!canZoomIn}
            onPress={() => setZoomOffset((value) => Math.min(3, value + 1))}
            style={[styles.controlButton, !canZoomIn && styles.controlDisabled]}
          >
            <Ionicons name="add" size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityLabel="Zoom out"
            disabled={!canZoomOut}
            onPress={() => setZoomOffset((value) => Math.max(-3, value - 1))}
            style={[styles.controlButton, !canZoomOut && styles.controlDisabled]}
          >
            <Ionicons name="remove" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      )}

      <View style={[styles.attribution, styles.noPointerEvents]}>
        <Text style={styles.attributionText}>© OpenStreetMap</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  noPointerEvents: {
    pointerEvents: 'none',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  routeSegment: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  markerUser: {
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  markerLabelWrap: {
    marginTop: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markerLabel: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDisabled: {
    opacity: 0.35,
  },
  attribution: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(23,19,36,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 8,
  },
  attributionText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },  placeholderText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
