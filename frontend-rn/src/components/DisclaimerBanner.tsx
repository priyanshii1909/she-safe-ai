// SHE SAFE AI — Disclaimer Banner Component
// Yellow warning banner used in Safe Route screen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface DisclaimerBannerProps {
  message: string;
}

export default function DisclaimerBanner({ message }: DisclaimerBannerProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="information-circle-outline"
        size={18}
        color={colors.warning}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    ...typography.caption,
    color: colors.warning,
    flex: 1,
    marginLeft: spacing.sm,
  },
});
