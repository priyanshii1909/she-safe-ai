// SHE SAFE AI — Info Banner Component
// Red emergency banner used in Contacts screen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface InfoBannerProps {
  message: string;
}

export default function InfoBanner({ message }: InfoBannerProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={20} color={colors.sos} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sosLight,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sos + '4D',
    marginBottom: spacing.md,
  },
  text: {
    ...typography.caption,
    color: '#FFB3BE',
    flex: 1,
    marginLeft: spacing.sm,
  },
});
