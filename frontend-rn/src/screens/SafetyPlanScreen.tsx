// SHE SAFE AI — Safety Plan Screen
// Displays personalized safety plan sections.
// Mirrors: frontend/lib/screens/safety_plan_screen.dart

import React, { useState, useEffect, useCallback } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout, typography } from '../../theme';
import { Header, SectionCard, LoadingSpinner, ErrorView } from '../components';
import { createSafetyPlan } from '../../services/api';
import type { SafetyPlanSection } from '../../types';

interface SafetyPlanScreenProps {
  route: {
    params: {
      situation: string;
    };
  };
}

export default function SafetyPlanScreen({ route }: SafetyPlanScreenProps) {
  const { situation } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<SafetyPlanSection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createSafetyPlan(situation);
      setSections(response.sections);
    } catch (_error) {
      setError('Unable to generate safety plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [situation]);

  useEffect(() => {
    generatePlan();
  }, [generatePlan]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Safety Plan" />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorView message={error} onRetry={generatePlan} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your Safety Plan</Text>
          <Text style={styles.subtitle}>
            This plan was generated based on your situation. It's a starting
            point — adapt it to what feels right for you.
          </Text>

          {sections.map((section, index) => (
            <SectionCard
              key={index}
              title={section.title}
              content={section.content}
            />
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
});
