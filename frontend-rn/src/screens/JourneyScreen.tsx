// SHE SAFE AI — Journey Screen (Safe-Arrival Timer)
// Timer with countdown and check-in functionality.
// Mirrors: frontend/lib/screens/journey_screen.dart

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, layout, typography } from '../../theme';
import { Header, Button, DetailRow } from '../components';
import { startJourney, checkInJourney } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Journey'>;

export default function JourneyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [destination, setDestination] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [isLoading, setIsLoading] = useState(false);
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [journeyDestination, setJourneyDestination] = useState('');
  const [expectedArrival, setExpectedArrival] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateTimer = useCallback(() => {
    if (!expectedArrival) return;
    const now = new Date();
    const diff = expectedArrival.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining('Overdue');
      return;
    }

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    setTimeRemaining(`${mins}m ${secs}s`);
  }, [expectedArrival]);

  useEffect(() => {
    if (journeyActive && expectedArrival) {
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [journeyActive, expectedArrival, updateTimer]);

  const handleStart = useCallback(async () => {
    if (!destination.trim()) return;
    const mins = parseInt(minutes, 10) || 30;

    setIsLoading(true);
    try {
      const response = await startJourney(destination.trim(), mins);
      setJourneyId(response.journey_id);
      setJourneyDestination(response.destination);
      setExpectedArrival(new Date(response.expected_arrival));
      setJourneyActive(true);
    } catch (_error) {
      // Error handled by API service
    } finally {
      setIsLoading(false);
    }
  }, [destination, minutes]);

  const handleCheckIn = useCallback(async () => {
    if (!journeyId) return;
    try {
      await checkInJourney(journeyId);
      if (timerRef.current) clearInterval(timerRef.current);
      setJourneyActive(false);
      setJourneyId(null);
    } catch (_error) {
      // Error handled by API service
    }
  }, [journeyId]);

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Safe-Arrival Timer" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {journeyActive ? (
          <ActiveView
            destination={journeyDestination}
            expectedArrival={formatTime(expectedArrival!)}
            timeRemaining={timeRemaining}
            onCheckIn={handleCheckIn}
            onSOS={() => navigation.navigate('SOS')}
          />
        ) : (
          <SetupView
            destination={destination}
            minutes={minutes}
            isLoading={isLoading}
            onDestinationChange={setDestination}
            onMinutesChange={setMinutes}
            onStart={handleStart}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Setup View ──────────────────────────────────────────────────────────────

function SetupView({
  destination,
  minutes,
  isLoading,
  onDestinationChange,
  onMinutesChange,
  onStart,
}: {
  destination: string;
  minutes: string;
  isLoading: boolean;
  onDestinationChange: (text: string) => void;
  onMinutesChange: (text: string) => void;
  onStart: () => void;
}) {
  return (
    <View>
      <Text style={styles.title}>Set up your journey</Text>
      <Text style={styles.subtitle}>
        We'll check in with you when you're expected to arrive.
      </Text>

      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., School, Home, Library"
        placeholderTextColor={colors.textMuted}
        value={destination}
        onChangeText={onDestinationChange}
      />

      <Text style={styles.label}>Expected arrival (minutes)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 30"
        placeholderTextColor={colors.textMuted}
        value={minutes}
        onChangeText={onMinutesChange}
        keyboardType="numeric"
      />

      <Button
        title="START JOURNEY"
        onPress={onStart}
        loading={isLoading}
        disabled={!destination.trim()}
        style={styles.startButton}
      />
    </View>
  );
}

// ── Active View ──────────────────────────────────────────────────────────────

function ActiveView({
  destination,
  expectedArrival,
  timeRemaining,
  onCheckIn,
  onSOS,
}: {
  destination: string;
  expectedArrival: string;
  timeRemaining: string;
  onCheckIn: () => void;
  onSOS: () => void;
}) {
  const isOverdue = timeRemaining === 'Overdue';

  return (
    <View>
      <View style={styles.statusCard}>
        <Ionicons
          name={isOverdue ? 'warning' : 'checkmark-circle'}
          size={64}
          color={isOverdue ? colors.sos : colors.success}
        />
        <Text
          style={[
            styles.statusTitle,
            { color: isOverdue ? colors.sos : colors.success },
          ]}
        >
          {isOverdue ? 'ARE YOU SAFE?' : 'JOURNEY ACTIVE'}
        </Text>
        {isOverdue && (
          <Text style={styles.overdueText}>We expected you to arrive.</Text>
        )}

        <View style={styles.details}>
          <DetailRow label="Destination" value={destination} />
          <DetailRow label="Expected arrival" value={expectedArrival} />
          <DetailRow
            label="Time remaining"
            value={timeRemaining}
            valueColor={isOverdue ? colors.sos : colors.textPrimary}
          />
        </View>
      </View>

      <Button title="I'M SAFE" onPress={onCheckIn} icon="checkmark-circle" />
      <Button
        title="SOS"
        onPress={onSOS}
        variant="sos"
        icon="warning"
        style={styles.sosButton}
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
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.h4,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  startButton: {
    marginTop: spacing.xl,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success + '4D',
    marginBottom: spacing.xl,
  },
  statusTitle: {
    ...typography.h2,
    marginTop: spacing.md,
  },
  overdueText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  details: {
    width: '100%',
    marginTop: spacing.lg,
  },
  sosButton: {
    marginTop: spacing.md,
  },
});
