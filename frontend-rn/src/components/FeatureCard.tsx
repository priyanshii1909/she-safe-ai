// SHE SAFE AI — Feature Card Component
// Used on the Home screen for navigation cards.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, layout, typography } from '../../theme';

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
}

export default function FeatureCard({
  icon,
  iconColor,
  title,
  description,
  onPress,
}: FeatureCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '1A' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: layout.cardMargin,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    ...typography.h4,
    marginBottom: 2,
  },
  description: {
    ...typography.caption,
  },
});
