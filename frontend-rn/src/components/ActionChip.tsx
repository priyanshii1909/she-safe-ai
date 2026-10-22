// SHE SAFE AI — Action Chip Component
// Small tappable pill with icon + label, used in AI chat recommended actions.

import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import type { RecommendedAction } from '../../types';

interface ActionChipProps {
  action: RecommendedAction;
  onPress: (actionType: string) => void;
}

const actionConfig: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  sos: { icon: 'warning', color: colors.sos },
  help_me_say_it: { icon: 'chatbubble-outline', color: colors.primary },
  safety_plan: { icon: 'document-text-outline', color: '#3B82F6' },
  share_location: { icon: 'location-outline', color: colors.success },
  emergency_contacts: { icon: 'call-outline', color: colors.warning },
  talk_to_adult: { icon: 'person-outline', color: colors.textSecondary },
};

export default function ActionChip({ action, onPress }: ActionChipProps) {
  const config = actionConfig[action.action_type] || {
    icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
    color: colors.textSecondary,
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(action.action_type)}
      activeOpacity={0.7}
      style={[styles.container, { borderColor: config.color + '40' }]}
    >
      <Ionicons name={config.icon} size={16} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>
        {action.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
});
