// SHE SAFE AI — Contacts Screen
// Emergency contacts management with call/message actions.
// Mirrors: frontend/lib/screens/contacts_screen.dart

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, layout, typography } from '../../theme';
import {
  Header,
  InfoBanner,
  LoadingSpinner,
  ErrorView,
  EmptyState,
} from '../components';
import { getContacts, addContact, deleteContact } from '../../services/api';
import type { TrustedContact, ContactType } from '../../types';

const contactTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  parent: 'people',
  guardian: 'shield',
  teacher: 'school',
  relative: 'people-circle',
  counselor: 'happy',
  other: 'person',
};

export default function ContactsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Add contact form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<ContactType>('parent');

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (_error) {
      setError('Unable to load contacts. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleCall = useCallback(async (phone: string) => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (_error) {
      Alert.alert('Error', 'Unable to make a call on this device.');
    }
  }, []);

  const handleMessage = useCallback(async (phone: string) => {
    try {
      await Linking.openURL(`sms:${phone}`);
    } catch (_error) {
      Alert.alert('Error', 'Unable to send a message on this device.');
    }
  }, []);

  const handleAddContact = useCallback(async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    try {
      await addContact({
        name: newName.trim(),
        phone: newPhone.trim(),
        contact_type: newType,
      });
      setNewName('');
      setNewPhone('');
      setNewType('parent');
      setShowAddDialog(false);
      loadContacts();
    } catch (_error) {
      Alert.alert('Error', 'Failed to add contact. Please try again.');
    }
  }, [newName, newPhone, newType, loadContacts]);

  const handleDeleteContact = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Delete Contact',
        `Are you sure you want to delete ${name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteContact(id);
                loadContacts();
              } catch (_error) {
                Alert.alert('Error', 'Failed to delete contact.');
              }
            },
          },
        ]
      );
    },
    [loadContacts]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Emergency Contacts"
        rightElement={
          <TouchableOpacity
            onPress={() => setShowAddDialog(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorView message={error} onRetry={loadContacts} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <InfoBanner message="In a life-threatening emergency, call your local emergency number immediately." />

          {contacts.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No contacts yet"
              message="Add trusted contacts who can help you in an emergency."
            />
          ) : (
            contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onCall={() => handleCall(contact.phone)}
                onMessage={() => handleMessage(contact.phone)}
                onDelete={() => handleDeleteContact(contact.id, contact.name)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Add Contact Dialog */}
      {showAddDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Add Trusted Contact</Text>

            <TextInput
              style={styles.dialogInput}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <TextInput
              style={styles.dialogInput}
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newType}
                onValueChange={(value) => setNewType(value as ContactType)}
                style={styles.picker}
              >
                <Picker.Item label="Parent" value="parent" />
                <Picker.Item label="Guardian" value="guardian" />
                <Picker.Item label="Teacher" value="teacher" />
                <Picker.Item label="Relative" value="relative" />
                <Picker.Item label="Counselor" value="counselor" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                onPress={() => setShowAddDialog(false)}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddContact}
                style={styles.dialogAddButton}
              >
                <Text style={styles.dialogAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Contact Card ────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onCall,
  onMessage,
  onDelete,
}: {
  contact: TrustedContact;
  onCall: () => void;
  onMessage: () => void;
  onDelete: () => void;
}) {
  const icon = contactTypeIcons[contact.contact_type] || 'person';

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.phone}>{contact.phone}</Text>
          <Text style={styles.type}>
            {contact.contact_type.charAt(0).toUpperCase() +
              contact.contact_type.slice(1)}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCall} style={styles.actionButton}>
            <Ionicons name="call" size={20} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onMessage} style={styles.actionButton}>
            <Ionicons name="chatbubble" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color={colors.sos} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: layout.cardMargin,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    ...typography.h4,
  },
  phone: {
    ...typography.caption,
    marginTop: 2,
  },
  type: {
    ...typography.small,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  // Dialog styles
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  dialogTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  dialogInput: {
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  pickerContainer: {
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  picker: {
    height: 50,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dialogCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  dialogCancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  dialogAddButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  dialogAddText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
});
