// SHE SAFE AI — AI Chat Screen
// Chat interface with concern level badges and action buttons.
// Mirrors: frontend/lib/screens/ai_chat_screen.dart

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { Header, MessageBubble, TypingIndicator } from '../components';
import { analyzeMessage } from '../../services/api';
import type { AIAnalyzeResponse } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AIChat'>;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  analysis?: AIAnalyzeResponse;
}

export default function AIChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [lastSituation, setLastSituation] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setLastSituation(text);
    scrollToBottom();

    try {
      const history = messages
        .filter((m) => m.role === 'user')
        .map((m) => ({ role: 'user', content: m.content }));

      const response = await analyzeMessage(text, conversationId, history);
      setConversationId(response.conversation_id);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response_text,
        analysis: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (_error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "Sorry, I'm having trouble connecting right now. Please try again in a moment. If this is an emergency, please contact a trusted adult or use the SOS button.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [inputText, isLoading, messages, conversationId, scrollToBottom]);

  const handleActionTap = useCallback(
    (actionType: string) => {
      switch (actionType) {
        case 'help_me_say_it':
        case 'talk_to_adult':
          if (lastSituation) {
            navigation.navigate('HelpMeSayIt', { situation: lastSituation });
          }
          break;
        case 'safety_plan':
          if (lastSituation) {
            navigation.navigate('SafetyPlan', { situation: lastSituation });
          }
          break;
        case 'sos':
          navigation.navigate('SOS');
          break;
        case 'emergency_contacts':
          navigation.navigate('Contacts');
          break;
      }
    },
    [navigation, lastSituation]
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item.content}
        isUser={item.role === 'user'}
        analysis={item.analysis}
        onActionTap={handleActionTap}
      />
    ),
    [handleActionTap]
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="SafeStep AI" />

      {/* Disclaimer Banner */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          I'm an AI safety assistant, not a replacement for a trusted adult or
          emergency service.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading ? <TypingIndicator /> : null
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Describe what's happening..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isLoading || !inputText.trim()}
            style={[
              styles.sendButton,
              (isLoading || !inputText.trim()) && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                isLoading || !inputText.trim()
                  ? colors.textMuted
                  : colors.primary
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  disclaimer: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  disclaimerText: {
    ...typography.small,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.borderLight,
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
