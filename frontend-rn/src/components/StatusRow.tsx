// SHE SAFE AI — Status Row Component
// Icon + text with color indicator, used in SOS active view.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../theme';

interface StatusRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}

export default function StatusRow({ icon, text, color }: StatusRowProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  text: {
    ...typography.body,
    fontWeight: '500',
    marginLeft: 8,
  },
});
