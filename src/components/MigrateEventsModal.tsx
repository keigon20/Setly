import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useEventStore } from '../contexts/EventStoreContext';
import { colors } from '../theme';

export default function MigrateEventsModal() {
  const { pendingLocalEvents, migrateLocalEvents, discardLocalEvents } = useEventStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const visible = !!pendingLocalEvents && pendingLocalEvents.length > 0;
  if (!visible) return null;

  const count = pendingLocalEvents!.length;
  const noun = count === 1 ? 'event' : 'events';

  const handleAdd = async () => {
    setIsProcessing(true);
    try {
      await migrateLocalEvents();
    } catch (err) {
      console.error('[MigrateEventsModal] Failed to migrate local events:', err);
      Alert.alert('Error', 'Failed to add your events. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDontAdd = () => {
    Alert.alert(
      'Discard These Events?',
      `The ${count} ${noun} saved on this device will be permanently lost. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await discardLocalEvents();
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Add Your Events?</Text>
          <Text style={styles.body}>
            You have {count} {noun} saved on this device from before you signed in. Add {count === 1 ? 'it' : 'them'} to your account?
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
            onPress={handleAdd}
            disabled={isProcessing}
          >
            <Text style={styles.primaryButtonText}>{isProcessing ? 'Adding...' : 'Add to Account'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, isProcessing && styles.buttonDisabled]}
            onPress={handleDontAdd}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryButtonText}>Don't Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.destructive,
    fontSize: 15,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
