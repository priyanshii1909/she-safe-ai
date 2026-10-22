// SHE SAFE AI — Stat Chip Component
// Small icon + text chip used in route cards.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface StatChipProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

export default function StatChip({ icon, text }: StatChipProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  text: {
    ...typography.caption,
    marginLeft: 4,
  },
});
