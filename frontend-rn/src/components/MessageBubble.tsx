// SHE SAFE AI — Message Bubble Component
// Chat message with optional concern badge and action buttons.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import ConcernBadge from './ConcernBadge';
import ActionChip from './ActionChip';
import type { AIAnalyzeResponse } from '../../types';

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  analysis?: AIAnalyzeResponse;
  onActionTap: (actionType: string) => void;
}

export default function MessageBubble({
  message,
  isUser,
  analysis,
  onActionTap,
}: MessageBubbleProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {message}
        </Text>
      </View>

      {!isUser && analysis && (
        <>
          <View style={styles.badgeContainer}>
            <ConcernBadge level={analysis.concern_level} />
          </View>
          {analysis.recommended_actions.length > 0 && (
            <View style={styles.actionsContainer}>
              {analysis.recommended_actions.map((action) => (
                <ActionChip
                  key={action.action_type}
                  action={action}
                  onPress={onActionTap}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  bubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },
  userText: {
    color: colors.textOnPrimary,
  },
  assistantText: {
    color: colors.textPrimary,
  },
  badgeContainer: {
    marginTop: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
});
