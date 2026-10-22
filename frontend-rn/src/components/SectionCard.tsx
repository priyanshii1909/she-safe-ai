// SHE SAFE AI — Section Card Component
// Title + content block used in Safety Plan screen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, layout, typography } from '../../theme';

interface SectionCardProps {
  title: string;
  content: string;
}

export default function SectionCard({ title, content }: SectionCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: layout.cardMargin,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  content: {
    ...typography.body,
    lineHeight: 22,
  },
});
