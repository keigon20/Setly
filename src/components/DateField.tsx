import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme';

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DateField({ label, value, onChange, placeholder = 'Select a date', maximumDate, minimumDate }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) onChange(selectedDate);
      return;
    }
    if (selectedDate) onChange(selectedDate);
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={value || maximumDate || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={value || maximumDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                textColor={colors.textPrimary}
              />
              <TouchableOpacity style={styles.doneButton} onPress={() => setShowPicker(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
  },
  valueText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
