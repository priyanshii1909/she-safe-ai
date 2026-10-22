// SHE SAFE AI — SOS Screen
// Emergency alert with confirmation flow and active state.
// Mirrors: frontend/lib/screens/sos_screen.dart

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, layout, typography } from '../../theme';
import { Header, Button, StatusRow } from '../components';
import { startSOS, stopSOS } from '../../services/api';

export default function SOSScreen() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sosId, setSosId] = useState<string | null>(null);
  const [contactsNotified, setContactsNotified] = useState<string[]>([]);
  const [locationShared, setLocationShared] = useState(false);

  const handleStartSOS = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await startSOS({
        message:
          'I may need help. Please check on me. My current location is available.',
      });
      setIsActive(true);
      setSosId(response.sos_id);
      setContactsNotified(response.contacts_notified);
      setLocationShared(response.location_shared);
    } catch (_error) {
      // Error handled by API service
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStopSOS = useCallback(async () => {
    if (!sosId) return;
    try {
      await stopSOS(sosId);
      setIsActive(false);
      setSosId(null);
      setContactsNotified([]);
      setLocationShared(false);
    } catch (_error) {
      // Error handled by API service
    }
  }, [sosId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="SOS Emergency" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isActive ? (
          <ActiveView
            contactsNotified={contactsNotified}
            locationShared={locationShared}
            onStop={handleStopSOS}
          />
        ) : (
          <ConfirmView onStart={handleStartSOS} isLoading={isLoading} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Confirmation View ────────────────────────────────────────────────────────

function ConfirmView({
  onStart,
  isLoading,
}: {
  onStart: () => void;
  isLoading: boolean;
}) {
  return (
    <View style={styles.centerContent}>
      <Ionicons name="warning" size={80} color={colors.sos} />
      <Text style={styles.confirmTitle}>EMERGENCY ALERT</Text>
      <Text style={styles.confirmSubtitle}>
        Your trusted contacts can be notified.
        {'\n'}Location sharing: ON
      </Text>

      <View style={styles.confirmButtons}>
        <Button
          title="SEND SOS"
          onPress={onStart}
          variant="sos"
          loading={isLoading}
          style={styles.sosButton}
        />
        <Button title="CANCEL" onPress={() => {}} variant="outline" />
      </View>
    </View>
  );
}

// ── Active View ──────────────────────────────────────────────────────────────

function ActiveView({
  contactsNotified,
  locationShared,
  onStop,
}: {
  contactsNotified: string[];
  locationShared: boolean;
  onStop: () => void;
}) {
  return (
    <View>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <Ionicons name="warning" size={64} color={colors.sos} />
        <Text style={styles.activeTitle}>SOS ACTIVE</Text>

        <View style={styles.statusRows}>
          <StatusRow
            icon="checkmark-circle"
            text="Alert sent"
            color={colors.success}
          />
          <StatusRow
            icon={locationShared ? 'location' : 'location-outline'}
            text={
              locationShared
                ? 'Location sharing active'
                : 'Location unavailable'
            }
            color={locationShared ? colors.success : colors.textSecondary}
          />
        </View>
      </View>

      {/* Trusted Contacts */}
      {contactsNotified.length > 0 && (
        <View style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>Trusted contacts notified:</Text>
          {contactsNotified.map((contact, index) => (
            <View key={index} style={styles.contactRow}>
              <Ionicons
                name="person"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.contactName}>{contact}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Call Contact"
          onPress={() => {}}
          icon="call"
          variant="primary"
        />
        <Button
          title="View Location"
          onPress={() => {}}
          icon="location"
          variant="outline"
        />
      </View>

      {/* Stop SOS */}
      <Button
        title="Stop SOS"
        onPress={onStop}
        variant="outline"
        style={styles.stopButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.screenPadding,
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTitle: {
    ...typography.h1,
    color: colors.sos,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  confirmSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  confirmButtons: {
    width: '100%',
  },
  sosButton: {
    marginBottom: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.sos + '4D',
    marginBottom: spacing.lg,
  },
  activeTitle: {
    ...typography.h2,
    color: colors.sos,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statusRows: {
    width: '100%',
  },
  contactsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactsTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  contactName: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  actionButtons: {
    marginBottom: spacing.lg,
  },
  stopButton: {
    borderColor: colors.sos,
  },
});
