// SHE SAFE AI — Navigation System
// Stack navigator matching the Flutter app's navigation flow.

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { colors } from '../../theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.sos,
  },
};

import HomeScreen from '../screens/HomeScreen';
import AIChatScreen from '../screens/AIChatScreen';
import SOSScreen from '../screens/SOSScreen';
import SafeRouteScreen from '../screens/SafeRouteScreen';
import JourneyScreen from '../screens/JourneyScreen';
import SafetyMapScreen from '../screens/SafetyMapScreen';
import ContactsScreen from '../screens/ContactsScreen';
import HelpMeSayItScreen from '../screens/HelpMeSayItScreen';
import SafetyPlanScreen from '../screens/SafetyPlanScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
        <Stack.Screen name="SafeRoute" component={SafeRouteScreen} />
        <Stack.Screen name="Journey" component={JourneyScreen} />
        <Stack.Screen name="SafetyMap" component={SafetyMapScreen} />
        <Stack.Screen name="Contacts" component={ContactsScreen} />
        <Stack.Screen name="HelpMeSayIt" component={HelpMeSayItScreen} />
        <Stack.Screen name="SafetyPlan" component={SafetyPlanScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
