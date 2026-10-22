// SHE SAFE AI — Legend Item Component
// Color dot + label used in Safety Map legend.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography } from '../../theme';

interface LegendItemProps {
  color: string;
  label: string;
}

export default function LegendItem({ color, label }: LegendItemProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    ...typography.caption,
    marginLeft: spacing.sm,
  },
});
