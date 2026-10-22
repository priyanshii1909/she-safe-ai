// SHE SAFE AI — Help Me Say It Screen
// Generates conversation starters for talking to trusted adults.
// Mirrors: frontend/lib/screens/help_me_say_it_screen.dart

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, layout, typography } from '../../theme';
import { Header, LoadingSpinner, ErrorView } from '../components';
import { helpMeSayIt } from '../../services/api';

interface HelpMeSayItScreenProps {
  route: {
    params: {
      situation: string;
    };
  };
}

export default function HelpMeSayItScreen({
  route,
}: HelpMeSayItScreenProps) {
  const { situation } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [starter, setStarter] = useState('');
  const [tips, setTips] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateStarter = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await helpMeSayIt(situation);
      setStarter(response.conversation_starter);
      setTips(response.tips);
    } catch (_error) {
      setError('Unable to generate conversation starter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [situation]);

  useEffect(() => {
    generateStarter();
  }, [generateStarter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Help Me Say It" />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorView message={error} onRetry={generateStarter} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Conversation Starter</Text>
          <Text style={styles.subtitle}>
            Here's a way to start the conversation. You can use it as-is or
            adapt it to your own words.
          </Text>

          {/* Starter Card */}
          <View style={styles.starterCard}>
            <View style={styles.quoteHeader}>
              <Ionicons
                name="chatbubble-ellipses"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.quoteLabel}>Try saying:</Text>
            </View>
            <Text style={styles.starterText}>{starter}</Text>
          </View>

          {/* Tips */}
          <Text style={styles.tipsTitle}>Tips for the conversation:</Text>
          {tips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={colors.success}
              />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
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
    lineHeight: 22,
  },
  starterCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: layout.cardPadding,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + '4D',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quoteLabel: {
    ...typography.h4,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  starterText: {
    ...typography.bodyLarge,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  tipsTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tipText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 22,
  },
});
