// SHE SAFE AI — Safe Route Screen (Delhi)
//
// Data flow:
// 1. "My places"  -> backend /api/places (home, school, trusted places the user saved)
// 2. "Nearby"     -> OpenStreetMap / Nominatim (real hospitals, police stations, schools)
// 3. Route line   -> OSRM road network (real walking geometry between the two points)
// 4. Safety score -> backend /api/routes/safe (demo safety engine)
//
// Nothing here invents live safety data: the road geometry is real, the
// safety scores are the backend's demo values, and the UI says which is which.

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
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { colors, spacing, layout, typography } from '../../theme';
import {
  Header,
  DisclaimerBanner,
  StatChip,
  LoadingSpinner,
  ErrorView,
  InteractiveMap,
  AddPlaceSheet,
} from '../components';
import type { LatLng, MapMarker } from '../components';
import { getSafeRoutes, getSavedPlaces } from '../../services/api';
import {
  DELHI_CENTER,
  distanceBetween,
  findNearbySafePlaces,
  getRoadRoutes,
} from '../../services/places';
import type { DiscoveredPlace, RoadRoute } from '../../services/places';
import { getCurrentLocation } from '../../services/location';
import { buildRoutePath } from '../utils/routeGeometry';
import type { SavedPlace, RouteOption } from '../../types';
import type { RootStackParamList } from '../navigation/types';

interface Destination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: 'saved' | 'nearby';
}

type DestinationTab = 'saved' | 'nearby';

const FALLBACK_CURVES = [0.06, -0.18, 0.26];

export default function SafeRouteScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SafeRoute'>>();

  // ── Places ────────────────────────────────────────────────────────────────
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [calloutError, setCalloutError] = useState<string | null>(null);

  const [originPlace, setOriginPlace] = useState<SavedPlace | null>(null);
  const [useDevice, setUseDevice] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [destinationTab, setDestinationTab] = useState<DestinationTab>('saved');

  const [discovered, setDiscovered] = useState<DiscoveredPlace[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [showAddPlace, setShowAddPlace] = useState(false);

  // ── Routes ────────────────────────────────────────────────────────────────
  const [routes, setRoutes] = useState<RoadRoute[]>([]);
  const [safety, setSafety] = useState<RouteOption[]>([]);
  const [routeSource, setRouteSource] = useState<'road' | 'estimate'>('road');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeReloadKey, setRouteReloadKey] = useState(0);

  // ── Load saved places and pick defaults ───────────────────────────────────
  const loadSavedPlaces = useCallback(async () => {
    try {
      const places = await getSavedPlaces();
      setSavedPlaces(places);
      setOriginPlace(
        (previous) =>
          previous ?? places.find((p) => p.category === 'home') ?? places[0] ?? null
      );
      setDestination((previous) => {
        if (previous) return previous;
        const pick =
          places.find((p) => p.category === 'school') ??
          places.find((p) => p.category !== 'home') ??
          null;
        return pick
          ? {
              id: pick.id,
              name: pick.name,
              lat: pick.lat,
              lng: pick.lng,
              source: 'saved',
            }
          : null;
      });
    } catch (_error) {
      setCalloutError(
        'Unable to load your saved places. Please check your connection.'
      );
    }
  }, []);

  useEffect(() => {
    loadSavedPlaces();
  }, [loadSavedPlaces]);

  // A destination may arrive from the Safety Map's "Route here" button.
  const incomingName = route.params?.destination?.name;
  const incomingId = route.params?.destination?.id;
  const incomingLat = route.params?.destination?.lat;
  const incomingLng = route.params?.destination?.lng;

  useEffect(() => {
    if (
      !incomingName ||
      incomingLat === undefined ||
      incomingLng === undefined
    ) {
      return;
    }
    setDestination({
      id: incomingId ?? `external-${incomingLat}-${incomingLng}`,
      name: incomingName,
      lat: incomingLat,
      lng: incomingLng,
      source: 'nearby',
    });
  }, [incomingId, incomingLat, incomingLng, incomingName]);

  // ── Origin ────────────────────────────────────────────────────────────────
  const origin: LatLng =
    useDevice && userLocation
      ? userLocation
      : originPlace
        ? { lat: originPlace.lat, lng: originPlace.lng }
        : DELHI_CENTER;

  const originLat = origin.lat;
  const originLng = origin.lng;

  const originLabel =
    useDevice && userLocation
      ? 'My location'
      : originPlace
        ? originPlace.label
        : 'Connaught Place (default)';

  // ── Discover real nearby safe places around the origin ────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsDiscovering(true);
    setDiscoveryError(null);
    findNearbySafePlaces({ lat: originLat, lng: originLng }, 4)
      .then((places) => {
        if (!cancelled) setDiscovered(places);
      })
      .catch(() => {
        if (!cancelled) {
          setDiscovered([]);
          setDiscoveryError(
            'Could not reach OpenStreetMap to list nearby safe places.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsDiscovering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [originLat, originLng]);

  // ── Load real routes + backend safety information ─────────────────────────
  const destLat = destination?.lat;
  const destLng = destination?.lng;
  const destName = destination?.name;
  const destId = destination?.id;

  useEffect(() => {
    if (destLat === undefined || destLng === undefined) return;

    let cancelled = false;
    setIsLoadingRoutes(true);
    setRouteError(null);

    const start: LatLng = { lat: originLat, lng: originLng };
    const end: LatLng = { lat: destLat, lng: destLng };

    const safetyPromise = getSafeRoutes({
      originLat,
      originLng,
      destLat,
      destLng,
      destinationName: destName,
    }).catch(() => null);

    getRoadRoutes(start, end)
      .then(async (road) => {
        if (cancelled) return;
        const safetyResponse = await safetyPromise;
        if (cancelled) return;

        setRoutes(road);
        setRouteSource('road');
        setSafety(safetyResponse?.routes ?? []);
        setSelectedIndex(0);
      })
      .catch(async () => {
        if (cancelled) return;
        const safetyResponse = await safetyPromise;
        if (cancelled) return;

        if (!safetyResponse) {
          setRouteError('Unable to load a route. Please check your connection.');
          setRoutes([]);
          setSafety([]);
          return;
        }

        // Honest fallback: draw a clearly-labelled straight-line estimate.
        setRoutes(
          safetyResponse.routes.map((option, index) => ({
            points: buildRoutePath(
              start,
              end,
              FALLBACK_CURVES[index] ?? 0.12
            ),
            distanceKm: option.distance_km,
            durationMin: option.duration_min,
          }))
        );
        setRouteSource('estimate');
        setSafety(safetyResponse.routes);
        setSelectedIndex(0);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRoutes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [originLat, originLng, destLat, destLng, destName, destId, routeReloadKey]);

  // ── Location ──────────────────────────────────────────────────────────────
  const handleUseLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationMessage(null);
    const result = await getCurrentLocation();
    setIsLocating(false);

    if (result.status === 'granted') {
      setUserLocation({ lat: result.lat, lng: result.lng });
      setUseDevice(true);
      setLocationMessage('Starting from your device location.');
    } else {
      setLocationMessage(result.message);
    }
  }, []);

  const selectOriginPlace = (place: SavedPlace) => {
    setOriginPlace(place);
    setUseDevice(false);
    setLocationMessage(null);
  };

  // ── Map data ──────────────────────────────────────────────────────────────
  const activeRoute = routes[selectedIndex] ?? null;

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    if (useDevice && userLocation) {
      list.push({
        id: 'user',
        lat: userLocation.lat,
        lng: userLocation.lng,
        color: '#3B82F6',
        icon: 'navigate',
        isUser: true,
        label: 'You',
      });
    } else {
      list.push({
        id: 'origin',
        lat: origin.lat,
        lng: origin.lng,
        color: colors.primary,
        icon: 'radio-button-on',
        label: 'Start',
      });
    }
    if (destination) {
      list.push({
        id: 'destination',
        lat: destination.lat,
        lng: destination.lng,
        color: colors.sos,
        icon: 'flag',
        label: destination.name,
      });
    }
    return list;
  }, [destination, origin.lat, origin.lng, useDevice, userLocation]);

  const straightDistance = destination
    ? distanceBetween(origin, { lat: destination.lat, lng: destination.lng })
    : 0;

  const destinationList: Destination[] =
    destinationTab === 'saved'
      ? savedPlaces.map((place) => ({
          id: place.id,
          name: place.name.toLowerCase().startsWith(place.label.toLowerCase())
            ? place.name
            : `${place.label} — ${place.name}`,
          lat: place.lat,
          lng: place.lng,
          source: 'saved' as const,
        }))
      : discovered.map((place) => ({
          id: place.id,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          source: 'nearby' as const,
        }));

  const handlePlaceSaved = (place: SavedPlace) => {
    setSavedPlaces((previous) => [...previous, place]);
    setOriginPlace((previous) => previous ?? place);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Safety-Aware Route" />
      <DisclaimerBanner message="Safety information cannot guarantee that a route is safe. Always stay aware of your surroundings." />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <InteractiveMap
          height={260}
          markers={markers}
          route={
            activeRoute
              ? { points: activeRoute.points, color: selectedIndex === 0 ? colors.success : colors.primary }
              : null
          }
          showLabels
        />

        <View style={styles.provenance}>
          <ProvenanceRow
            icon="layers-outline"
            color={colors.primary}
            text="Map: OpenStreetMap (live)"
          />
          <ProvenanceRow
            icon="git-branch-outline"
            color={routeSource === 'road' ? colors.success : colors.warning}
            text={
              routeSource === 'road'
                ? 'Route: real walking path from the OpenStreetMap road network'
                : 'Route: estimated illustration (routing service unavailable)'
            }
          />
          <ProvenanceRow
            icon="shield-half-outline"
            color={colors.warning}
            text="Safety scores: demo values from the backend safety engine"
          />
          <ProvenanceRow
            icon="bookmark-outline"
            color={colors.textMuted}
            text="My places: saved in your backend account"
          />
        </View>

        {/* ── Starting point ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Starting from</Text>
        <Text style={styles.currentOrigin}>{originLabel}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={handleUseLocation}
            style={[styles.chip, useDevice && userLocation && styles.chipActive]}
          >
            {isLocating ? (
              <ActivityIndicator
                size="small"
                color={useDevice && userLocation ? colors.textOnPrimary : colors.primary}
              />
            ) : (
              <Ionicons
                name="navigate-outline"
                size={14}
                color={useDevice && userLocation ? colors.textOnPrimary : colors.primary}
              />
            )}
            <Text
              style={[
                styles.chipText,
                useDevice && userLocation && styles.chipTextActive,
              ]}
            >
              {isLocating ? 'Locating…' : 'My location'}
            </Text>
          </Pressable>

          {savedPlaces.map((place) => {
            const active = !useDevice && originPlace?.id === place.id;
            return (
              <Pressable
                key={place.id}
                onPress={() => selectOriginPlace(place)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={
                    place.category === 'home'
                      ? 'home-outline'
                      : place.category === 'school'
                        ? 'school-outline'
                        : 'location-outline'
                  }
                  size={14}
                  color={active ? colors.textOnPrimary : colors.primary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {place.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {locationMessage ? (
          <Text style={styles.locationMessage}>{locationMessage}</Text>
        ) : null}

        {/* ── Destination ─────────────────────────────────────────────────── */}
        <View style={styles.destHeader}>
          <Text style={styles.sectionTitle}>Where to?</Text>
          <Pressable onPress={() => setShowAddPlace(true)} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.addButtonText}>Add place</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setDestinationTab('saved')}
            style={[styles.tab, destinationTab === 'saved' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                destinationTab === 'saved' && styles.tabTextActive,
              ]}
            >
              My places ({savedPlaces.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDestinationTab('nearby')}
            style={[styles.tab, destinationTab === 'nearby' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                destinationTab === 'nearby' && styles.tabTextActive,
              ]}
            >
              Safe places nearby ({discovered.length})
            </Text>
          </Pressable>
        </View>

        {isDiscovering && destinationTab === 'nearby' ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.inlineLoadingText}>
              Finding hospitals, police stations and schools near your start…
            </Text>
          </View>
        ) : null}

        {discoveryError && destinationTab === 'nearby' ? (
          <Text style={styles.locationMessage}>{discoveryError}</Text>
        ) : null}

        {destinationTab === 'saved' && savedPlaces.length === 0 ? (
          <Text style={styles.hint}>
            No saved places yet. Tap “Add place” to save your home, school or a
            trusted place.
          </Text>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {destinationList.map((place) => {
            const active = destination?.id === place.id;
            const km =
              place.source === 'nearby' ? distanceBetween(origin, place) : null;
            return (
              <Pressable
                key={`${place.source}-${place.id}`}
                onPress={() => setDestination(place)}
                style={[
                  styles.destinationChip,
                  active && styles.destinationChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.destinationText,
                    active && styles.destinationTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {place.name}
                </Text>
                {km !== null && (
                  <Text style={styles.destinationMeta}>
                    {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {straightDistance > 60 && (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={styles.warningText}>
              That destination is about {Math.round(straightDistance)} km away.
              Walking directions across that distance are not realistic.
            </Text>
          </View>
        )}

        {calloutError ? <Text style={styles.locationMessage}>{calloutError}</Text> : null}

        {/* ── Routes ──────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Route options</Text>
        {!destination ? (
          <Text style={styles.hint}>Choose a destination above to see routes.</Text>
        ) : isLoadingRoutes ? (
          <LoadingSpinner />
        ) : routeError ? (
          <ErrorView
            message={routeError}
            onRetry={() => setRouteReloadKey((value) => value + 1)}
          />
        ) : (
          <>
            {routes.length === 1 && (
              <Text style={styles.hint}>
                Only one walking route exists for this pair on the OpenStreetMap
                road network.
              </Text>
            )}
            {routes.map((route, index) => (
              <RouteCard
                key={`route-${index}`}
                index={index}
                route={route}
                safety={safety[index]}
                selected={index === selectedIndex}
                onSelect={() => setSelectedIndex(index)}
                estimated={routeSource === 'estimate'}
              />
            ))}
          </>
        )}
      </ScrollView>

      <AddPlaceSheet
        visible={showAddPlace}
        onClose={() => setShowAddPlace(false)}
        onSaved={handlePlaceSaved}
      />
    </SafeAreaView>
  );
}

// ── Provenance row ──────────────────────────────────────────────────────────

function ProvenanceRow({
  icon,
  color,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
}) {
  return (
    <View style={styles.provenanceRow}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={styles.provenanceText}>{text}</Text>
    </View>
  );
}

// ── Route Card ──────────────────────────────────────────────────────────────

function RouteCard({
  index,
  route,
  safety,
  selected,
  onSelect,
  estimated,
}: {
  index: number;
  route: RoadRoute;
  safety?: RouteOption;
  selected: boolean;
  onSelect: () => void;
  estimated: boolean;
}) {
  const score = safety?.safety_score;
  const safetyColor =
    score === undefined
      ? colors.textMuted
      : score >= 60
        ? colors.success
        : score >= 40
          ? colors.warning
          : colors.sos;

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.card,
        index === 0 && styles.recommendedCard,
        selected && styles.selectedCard,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.routeLabel}>
          {index === 0 ? 'Recommended route' : `Alternative ${index}`}
        </Text>
        {index === 0 && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatChip icon="resize-outline" text={`${route.distanceKm} km`} />
        <StatChip icon="time-outline" text={`${route.durationMin} min walk`} />
        {safety ? (
          <StatChip icon="medical-outline" text={`${safety.help_points_nearby} help pts`} />
        ) : null}
      </View>

      {score !== undefined ? (
        <View style={styles.safetyRow}>
          <Text style={styles.safetyLabel}>Safety Score: </Text>
          <View style={styles.safetyBarContainer}>
            <View
              style={[
                styles.safetyBar,
                { width: `${score}%`, backgroundColor: safetyColor },
              ]}
            />
          </View>
          <Text style={styles.safetyScore}>{score}/100</Text>
        </View>
      ) : (
        <Text style={styles.hint}>Safety score unavailable right now.</Text>
      )}

      {safety?.safety_factors?.length ? (
        <>
          <Text style={styles.factorsLabel}>
            Based on available safety information:
          </Text>
          {safety.safety_factors.map((factor, factorIndex) => (
            <View key={factorIndex} style={styles.factorRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={14}
                color={colors.success}
              />
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
        </>
      ) : null}

      {estimated ? (
        <Text style={styles.estimatedNote}>
          Path shown is an estimate, not a road-network route.
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={16}
          color={selected ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.cardFooterText,
            selected && styles.cardFooterTextActive,
          ]}
        >
          {selected ? 'Shown on map' : 'Tap to show on map'}
        </Text>
      </View>
    </Pressable>
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
  provenance: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.sm,
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
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  currentOrigin: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  chipRow: {
    paddingBottom: spacing.sm,
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
    marginBottom: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
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
  destHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    padding: 3,
    marginVertical: spacing.sm,
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
  destinationChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxWidth: 220,
  },
  destinationChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  destinationText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  destinationTextActive: {
    color: colors.primary,
  },
  destinationMeta: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  warningText: {
    ...typography.small,
    color: colors.warning,
    flex: 1,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: layout.cardMargin,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendedCard: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  routeLabel: {
    ...typography.h4,
    flex: 1,
  },
  recommendedBadge: {
    backgroundColor: colors.success + '1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  safetyLabel: {
    ...typography.caption,
  },
  safetyBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  safetyBar: {
    height: '100%',
    borderRadius: 4,
  },
  safetyScore: {
    ...typography.caption,
    fontWeight: '600',
  },
  factorsLabel: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  factorText: {
    ...typography.caption,
    marginLeft: spacing.sm,
    flex: 1,
  },
  estimatedNote: {
    ...typography.small,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cardFooterText: {
    ...typography.small,
    marginLeft: spacing.xs,
  },
  cardFooterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
