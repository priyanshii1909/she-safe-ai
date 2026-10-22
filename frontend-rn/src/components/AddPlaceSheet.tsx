// SHE SAFE AI — Add Place sheet
// Search real places (OpenStreetMap) and save one as Home / School / Trusted.
// Saves through the backend so the place is available on every device.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { searchPlaces } from '../../services/places';
import type { DiscoveredPlace } from '../../services/places';
import { addSavedPlace } from '../../services/api';
import type { SavedPlace, SavedPlaceCategory } from '../../types';

interface AddPlaceSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (place: SavedPlace) => void;
}

const CATEGORY_OPTIONS: { key: SavedPlaceCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'school', label: 'School', icon: 'school-outline' },
  { key: 'work', label: 'Work', icon: 'briefcase-outline' },
  { key: 'trusted', label: 'Trusted', icon: 'people-outline' },
];

export default function AddPlaceSheet({
  visible,
  onClose,
  onSaved,
}: AddPlaceSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoveredPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<DiscoveredPlace | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Reset whenever the sheet is opened.
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setMessage(null);
      setIsSearching(false);
      setIsSaving(false);
    }
  }, [visible]);

  // Debounced search.
  useEffect(() => {
    if (!visible || query.trim().length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setMessage(null);
      try {
        const found = await searchPlaces(query);
        if (!cancelled) {
          setResults(found);
          if (found.length === 0) {
            setMessage('No places found. Try a landmark name like “India Gate”.');
          }
        }
      } catch (_error) {
        if (!cancelled) {
          setMessage('Could not reach the place search service.');
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, visible]);

  const handleSave = async (category: SavedPlaceCategory) => {
    if (!selected || isSaving) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const label =
        CATEGORY_OPTIONS.find((option) => option.key === category)?.label ??
        'Place';
      const saved = await addSavedPlace({
        label,
        category,
        name: selected.name,
        address: selected.address,
        lat: selected.lat,
        lng: selected.lng,
      });
      onSaved(saved);
      onClose();
    } catch (_error) {
      setMessage('Could not save this place. Is the backend running?');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add a place</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Search a real place in India, then save it as Home, School or a
            trusted place.
          </Text>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. India Gate, Lajpat Nagar"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {selected ? (
            <View style={styles.savePanel}>
              <Text style={styles.selectedName}>{selected.name}</Text>
              <Text style={styles.selectedAddress}>{selected.address}</Text>
              <Text style={styles.saveAs}>Save as</Text>
              <View style={styles.categoryRow}>
                {CATEGORY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => handleSave(option.key)}
                    disabled={isSaving}
                    style={styles.categoryButton}
                  >
                    <Ionicons name={option.icon} size={16} color={colors.primary} />
                    <Text style={styles.categoryText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setSelected(null)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Choose a different place</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
              {results.map((place) => (
                <Pressable
                  key={place.id}
                  onPress={() => setSelected(place)}
                  style={styles.resultRow}
                >
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <View style={styles.resultTextWrap}>
                    <Text style={styles.resultName}>{place.name}</Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h3,
  },
  closeButton: {
    padding: spacing.xs,
  },
  hint: {
    ...typography.small,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 14,
    color: colors.textPrimary,
  },
  message: {
    ...typography.small,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  results: {
    marginTop: spacing.sm,
    maxHeight: 300,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultTextWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  resultName: {
    ...typography.body,
    fontWeight: '600',
  },
  resultAddress: {
    ...typography.small,
  },
  savePanel: {
    marginTop: spacing.md,
  },
  selectedName: {
    ...typography.h4,
  },
  selectedAddress: {
    ...typography.small,
    marginTop: 2,
  },
  saveAs: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  cancelButton: {
    paddingVertical: spacing.xs,
  },
  cancelText: {
    ...typography.small,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
