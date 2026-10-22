// SHE SAFE AI — Reusable Card Component

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, layout } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'outlined' | 'filled';
}

export default function Card({
  children,
  onPress,
  style,
  variant = 'default',
}: CardProps) {
  const cardStyle = [
    styles.base,
    variant === 'outlined' && styles.outlined,
    variant === 'filled' && styles.filled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: layout.cardMargin,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  filled: {
    backgroundColor: colors.primaryLight,
  },
});
