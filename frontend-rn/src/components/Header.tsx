// SHE SAFE AI — Screen Header Component

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export default function Header({
  title,
  showBack = true,
  rightElement,
}: HeaderProps) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {rightElement ? rightElement : <View style={styles.backButton} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    flex: 1,
    textAlign: 'center',
  },
});
