// SHE SAFE AI — Safety Map Screen (Delhi)
//
// Two layers, clearly separated:
// - "Curated": demo help points stored in the backend (/api/map/points).
// - "Live nearby": real hospitals, police stations and schools pulled from
//   OpenStreetMap around your location (or central Delhi by default).
//
// Your own position comes from the device and only after you grant permission.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, layout, typography } from '../../theme';
import {
  Header,
  LegendItem,
  LoadingSpinner,
  ErrorView,
  InteractiveMap,
} from '../components';
import type { LatLng, MapMarker } from '../components';
import { getMapPoints } from '../../services/api';
import {
  DELHI_CENTER,
  distanceBetween,
  findNearbySafePlaces,
} from '../../services/places';
import type { DiscoveredPlace, PlaceCategory } from '../../services/places';
import { getCurrentLocation } from '../../services/location';
import type { RootStackParamList } from '../navigation/types';
import type { MapPoint, MapPointType } from '../../types';

const typeConfig: Record<
  MapPointType,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  hospital: { icon: 'medical', color: colors.sos },
  police: { icon: 'shield', color: '#3B82F6' },
  school: { icon: 'school', color: colors.primary },
  safe_house: { icon: 'home', color: colors.success },
  help_point: { icon: 'location', color: colors.success },
  public_building: { icon: 'business', color: colors.textSecondary },
};

const categoryConfig: Record<
  PlaceCategory,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  hospital: { icon: 'medical', color: colors.sos, label: 'Hospital' },
  police: { icon: 'shield', color: '#3B82F6', label: 'Police' },
  school: { icon: 'school', color: colors.primary, label: 'School' },
  public_building: {
    icon: 'business',
    color: colors.textSecondary,
    label: 'Public place',
  },
  other: { icon: 'location', color: colors.success, label: 'Place' },
};

type Layer = 'curated' | 'live';

export default function SafetyMapScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [livePlaces, setLivePlaces] = useState<DiscoveredPlace[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [layer, setLayer] = useState<Layer>('curated');
  const [centerOnMe, setCenterOnMe] = useState(false);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const loadPoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMapPoints();
      setPoints(data);
    } catch (_error) {
      setError('Unable to load safety map. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const discover = useCallback(async (center: LatLng) => {
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const places = await findNearbySafePlaces(center, 4);
      setLivePlaces(places);
    } catch (_error) {
      setDiscoveryError(
        'Could not reach OpenStreetMap to list nearby safe places.'
      );
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  useEffect(() => {
    loadPoints();
    discover(DELHI_CENTER);
  }, [discover, loadPoints]);

  const handleUseLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationMessage(null);
    const result = await getCurrentLocation();
    setIsLocating(false);

    if (result.status === 'granted') {
      const next = { lat: result.lat, lng: result.lng };
      setUserLocation(next);
      setCenterOnMe(true);
      setLayer('live');
      setLocationMessage('Showing your position.');
      await discover(next);
    } else {
      setLocationMessage(result.message);
    }
  }, [discover]);

  const center = centerOnMe && userLocation ? userLocation : null;

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];

    if (layer === 'curated') {
      points.forEach((point) => {
        const config = typeConfig[point.point_type] ?? {
          icon: 'location' as keyof typeof Ionicons.glyphMap,
          color: colors.textSecondary,
        };
        list.push({
          id: point.id,
          lat: point.lat,
          lng: point.lng,
          color: config.color,
          icon: config.icon,
          label: point.name,
        });
      });
    } else {
      livePlaces.forEach((place) => {
        const config = categoryConfig[place.category];
        list.push({
          id: place.id,
          lat: place.lat,
          lng: place.lng,
          color: config.color,
          icon: config.icon,
          label: place.name,
        });
      });
    }

    // When centred on the user, show only the user + nearest places so the
    // map does not zoom out to the whole city.
    if (centerOnMe && userLocation) {
      return [
        {
          id: 'user',
          lat: userLocation.lat,
          lng: userLocation.lng,
          color: '#3B82F6',
          icon: 'navigate',
          isUser: true,
          label: 'You',
        },
        ...list
          .filter((marker) => distanceBetween(userLocation, marker) <= 2.5)
          .slice(0, 10),
      ];
    }

    return list;
  }, [centerOnMe, layer, livePlaces, points, userLocation]);

  const routeTo = (place: { id: string; name: string; lat: number; lng: number }) => {
    navigation.navigate('SafeRoute', {
      destination: { id: place.id, name: place.name, lat: place.lat, lng: place.lng },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Safety Map" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <InteractiveMap
          height={250}
          markers={markers}
          center={center}
          zoom={15}
          showLabels={false}
        />

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={handleUseLocation}
            style={[styles.chip, isLocating && styles.chipDisabled]}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate-outline" size={14} color={colors.primary} />
            )}
            <Text style={styles.chipText}>
              {isLocating
                ? 'Locating…'
                : userLocation
                  ? 'Update my location'
                  : 'Use my location'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCenterOnMe((value) => !value)}
            style={[styles.chip, centerOnMe && styles.chipActive]}
            disabled={!userLocation}
          >
            <Ionicons
              name="locate-outline"
              size={14}
              color={centerOnMe ? colors.textOnPrimary : colors.primary}
            />
            <Text style={[styles.chipText, centerOnMe && styles.chipTextActive]}>
              {centerOnMe ? 'Centred on me' : 'Show whole area'}
            </Text>
          </Pressable>
        </View>

        {locationMessage ? (
          <Text style={styles.locationMessage}>{locationMessage}</Text>
        ) : null}

        {/* ── Layer switch ────────────────────────────────────────────────── */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setLayer('curated')}
            style={[styles.tab, layer === 'curated' && styles.tabActive]}
          >
            <Text style={[styles.tabText, layer === 'curated' && styles.tabTextActive]}>
              Curated ({points.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLayer('live')}
            style={[styles.tab, layer === 'live' && styles.tabActive]}
          >
            <Text style={[styles.tabText, layer === 'live' && styles.tabTextActive]}>
              Live nearby ({livePlaces.length})
            </Text>
          </Pressable>
        </View>

        {/* ── Provenance ──────────────────────────────────────────────────── */}
        <View style={styles.provenance}>
          <View style={styles.provenanceRow}>
            <Ionicons name="layers-outline" size={12} color={colors.primary} />
            <Text style={styles.provenanceText}>
              Map tiles: OpenStreetMap (live)
            </Text>
          </View>
          <View style={styles.provenanceRow}>
            <Ionicons
              name="information-circle-outline"
              size={12}
              color={colors.warning}
            />
            <Text style={styles.provenanceText}>
              Curated layer: demo records stored in the backend
            </Text>
          </View>
          <View style={styles.provenanceRow}>
            <Ionicons name="compass-outline" size={12} color={colors.success} />
            <Text style={styles.provenanceText}>
              Live layer: real places from OpenStreetMap (Nominatim)
            </Text>
          </View>
          <View style={styles.provenanceRow}>
            <Ionicons
              name={userLocation ? 'navigate' : 'lock-closed-outline'}
              size={12}
              color={userLocation ? '#3B82F6' : colors.textMuted}
            />
            <Text style={styles.provenanceText}>
              Your position:{' '}
              {userLocation
                ? 'from your device, after permission'
                : 'not shared — tap “Use my location”'}
            </Text>
          </View>
        </View>

        {/* ── List ────────────────────────────────────────────────────────── */}
        {layer === 'curated' ? (
          isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorView message={error} onRetry={loadPoints} />
          ) : (
            points.map((point) => (
              <CuratedCard
                key={point.id}
                point={point}
                userLocation={userLocation}
                onRoute={() => routeTo(point)}
              />
            ))
          )
        ) : (
          <>
            {isDiscovering ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.inlineLoadingText}>
                  Finding hospitals, police stations and schools nearby…
                </Text>
              </View>
            ) : null}

            {discoveryError ? (
              <ErrorView
                message={discoveryError}
                onRetry={() => discover(center ?? DELHI_CENTER)}
              />
            ) : null}

            {!isDiscovering && !discoveryError && livePlaces.length === 0 ? (
              <Text style={styles.hint}>
                No hospitals, police stations or schools found within 4 km.
              </Text>
            ) : null}

            {livePlaces.map((place) => (
              <LiveCard
                key={place.id}
                place={place}
                userLocation={userLocation}
                onRoute={() => routeTo(place)}
              />
            ))}
          </>
        )}

        {/* ── Legend ──────────────────────────────────────────────────────── */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          <LegendItem color={colors.success} label="Verified Help Point" />
          <LegendItem
            color={colors.warning}
            label="Available Safety Information"
          />
          <LegendItem color={colors.textMuted} label="No Reliable Information" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

function CuratedCard({
  point,
  userLocation,
  onRoute,
}: {
  point: MapPoint;
  userLocation: LatLng | null;
  onRoute: () => void;
}) {
  const config = typeConfig[point.point_type] || {
    icon: 'location' as keyof typeof Ionicons.glyphMap,
    color: colors.textSecondary,
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '1A' }]}>
          <Ionicons name={config.icon} size={24} color={config.color} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{point.name}</Text>
            {point.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            )}
          </View>
          {point.address && <Text style={styles.address}>{point.address}</Text>}
          {point.hours && <Text style={styles.hours}>{point.hours}</Text>}
          <DistanceLine
            userLocation={userLocation}
            target={{ lat: point.lat, lng: point.lng }}
          />
        </View>
      </View>
      <RouteButton onPress={onRoute} />
    </View>
  );
}

function LiveCard({
  place,
  userLocation,
  onRoute,
}: {
  place: DiscoveredPlace;
  userLocation: LatLng | null;
  onRoute: () => void;
}) {
  const config = categoryConfig[place.category];

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '1A' }]}>
          <Ionicons name={config.icon} size={24} color={config.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{place.name}</Text>
          <Text style={styles.address}>
            {config.label}
            {place.address ? ` · ${place.address}` : ''}
          </Text>
          <Text style={styles.distanceText}>
            ≈{' '}
            {place.distanceKm < 1
              ? `${Math.round(place.distanceKm * 1000)} m`
              : `${place.distanceKm.toFixed(1)} km`}{' '}
            from {userLocation ? 'you' : 'central Delhi'}
          </Text>
        </View>
      </View>
      <RouteButton onPress={onRoute} />
    </View>
  );
}

function RouteButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.routeButton}>
      <Ionicons name="navigate" size={14} color={colors.primary} />
      <Text style={styles.routeButtonText}>Route here</Text>
    </Pressable>
  );
}

function DistanceLine({
  userLocation,
  target,
}: {
  userLocation: LatLng | null;
  target: LatLng;
}) {
  if (!userLocation) return null;
  const km = distanceBetween(userLocation, target);
  return (
    <Text style={styles.distanceText}>
      ≈ {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} from your
      location
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  chipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  locationMessage: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    ...typography.small,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  provenance: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  provenanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  provenanceText: {
    ...typography.small,
    flex: 1,
    marginLeft: spacing.xs,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inlineLoadingText: {
    ...typography.small,
    flex: 1,
    marginLeft: spacing.xs,
  },
  hint: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: layout.cardMargin,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    ...typography.h4,
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: colors.success + '1A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.success,
  },
  address: {
    ...typography.caption,
    marginTop: 2,
  },
  hours: {
    ...typography.small,
    marginTop: 2,
  },
  distanceText: {
    ...typography.small,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  routeButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  legend: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  legendTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
});
