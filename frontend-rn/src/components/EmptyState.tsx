// SHE SAFE AI — Empty State Component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

export default function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.h4,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
