// SHE SAFE AI — Home Screen
// Main dashboard with navigation cards to all features.
// Mirrors: frontend/lib/screens/home_screen.dart

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, layout, typography } from '../../theme';
import { FeatureCard, Button } from '../components';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.appTitle}>SHE SAFE AI</Text>
            <Text style={styles.tagline}>
              Helping students take the first safe step toward human help.
            </Text>
          </View>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Hi! How can I help?</Text>
        <Text style={styles.greetingSub}>
          I'm here to help you think through difficult situations and connect
          you with the right support.
        </Text>

        {/* Feature Cards */}
        <FeatureCard
          icon="chatbubble-ellipses"
          iconColor={colors.primary}
          title="Talk to Safety AI" 
          description="Describe a situation and get guidance on safe next steps"
          onPress={() => navigation.navigate('AIChat')}
        />

        <FeatureCard
          icon="navigate"
          iconColor={colors.success}
          title="Safe Route"
          description="Compare routes using available safety information"
          onPress={() => navigation.navigate('SafeRoute')}
        />

        <FeatureCard
          icon="timer"
          iconColor={colors.warning}
          title="Safe-Arrival Timer"
          description="Set a timer so someone knows when to expect you"
          onPress={() => navigation.navigate('Journey')}
        />

        <FeatureCard
          icon="map"
          iconColor="#3B82F6"
          title="Safety Map"
          description="Find verified help points and safety information near you"
          onPress={() => navigation.navigate('SafetyMap')}
        />

        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SOS')}
            activeOpacity={0.8}
            style={styles.sosButton}
          >
            <Ionicons name="warning" size={28} color={colors.textOnPrimary} />
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts Button */}
        <Button
          title="Emergency Contacts"
          onPress={() => navigation.navigate('Contacts')}
          variant="outline"
          icon="call"
        />

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.privacyText}>
            Do not share passwords, addresses, phone numbers, or other
            unnecessary private information.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
    color: colors.textPrimary,
  },
  appTitle: {
    ...typography.h2,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.caption,
    marginTop: 2,
    
  },
  greeting: {
    ...typography.h1,
    marginBottom: spacing.xs,
    color: colors.textPrimary,
  },
  greetingSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  sosContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sosButton: {
    height: layout.sosButtonHeight,
    borderRadius: 20,
    backgroundColor: colors.sos,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.sos,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosText: {
    ...typography.buttonLarge,
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
    letterSpacing: 2,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  privacyText: {
    ...typography.small,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 16,
  },
});
