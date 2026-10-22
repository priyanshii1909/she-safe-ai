// SHE SAFE AI — Reusable Button Component

import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'sos' | 'outline' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
}: ButtonProps) {
  const buttonStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'sos' && styles.sos,
    variant === 'outline' && styles.outline,
    variant === 'ghost' && styles.ghost,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    variant === 'outline' && styles.textOutline,
    variant === 'ghost' && styles.textGhost,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textOnPrimary}
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textOnPrimary}
              style={styles.icon}
            />
          )}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: layout.buttonHeight,
    borderRadius: layout.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  sos: {
    backgroundColor: colors.sos,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
  textOutline: {
    color: colors.textPrimary,
  },
  textGhost: {
    color: colors.primary,
  },
});
