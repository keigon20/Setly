import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  userId: string;
  onCancel: () => void;
  onConfirm: (days: number) => void;
}

export default function SuspendUserModal({ visible, userId, onCancel, onConfirm }: Props) {
  const [days, setDays] = useState('');

  useEffect(() => {
    if (!visible) setDays('');
  }, [visible]);

  const parsed = parseInt(days, 10);
  const valid = !isNaN(parsed) && parsed > 0 && parsed <= 365;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Suspend User</Text>
          <Text style={styles.userId} numberOfLines={2}>{userId}</Text>

          <Text style={styles.label}>Duration (days)</Text>
          <View style={styles.quickRow}>
            {[3, 7, 14, 30].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, days === String(d) && styles.chipActive]}
                onPress={() => setDays(String(d))}
              >
                <Text style={[styles.chipText, days === String(d) && styles.chipTextActive]}>{d}d</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            value={days}
            onChangeText={setDays}
            placeholder="Custom days"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.suspendBtn, !valid && styles.suspendBtnDisabled]}
              onPress={() => valid && onConfirm(parsed)}
              disabled={!valid}
            >
              <Text style={styles.suspendText}>Suspend</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  userId: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: `${colors.accent}22`,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.accent,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  suspendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F5A62322',
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  suspendBtnDisabled: {
    opacity: 0.4,
  },
  suspendText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5A623',
  },
});
