// SHE SAFE AI — Concern Level Badge Component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import type { ConcernLevel } from '../../types';

interface ConcernBadgeProps {
  level: ConcernLevel;
}

const config: Record<
  ConcernLevel,
  { label: string; color: string; lightColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  support: {
    label: 'SUPPORT',
    color: colors.concernSupport,
    lightColor: colors.concernSupportingLight,
    icon: 'checkmark-circle-outline',
  },
  concerning: {
    label: 'CONCERNING',
    color: colors.concernConcerning,
    lightColor: colors.concernConcerningLight,
    icon: 'information-circle-outline',
  },
  immediate: {
    label: 'IMMEDIATE SAFETY CONCERN',
    color: colors.concernImmediate,
    lightColor: colors.concernImmediateLight,
    icon: 'warning',
  },
};

export default function ConcernBadge({ level }: ConcernBadgeProps) {
  const { label, color, lightColor, icon } = config[level];

  return (
    <View style={[styles.container, { backgroundColor: lightColor }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
});
