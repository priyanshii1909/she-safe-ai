// SHE SAFE AI — Detail Row Component
// Label-value pair used in Journey active view.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

export default function DetailRow({ label, value, valueColor }: DetailRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
