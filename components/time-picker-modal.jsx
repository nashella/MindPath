import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Fonts } from '@/constants/theme';

const COLORS = {
  cardBackground: '#FFFFFF',
  textPrimary: '#1F2A44',
  textSecondary: '#7D8798',
  border: '#E4EAF4',
  blue: '#5899C8',
  overlay: 'rgba(16, 23, 38, 0.38)',
};

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

function getWrappedValue(options, currentValue, offset) {
  const currentIndex = options.indexOf(currentValue);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + offset + options.length) % options.length;

  return options[nextIndex];
}

function parseInitialTime(initialValue) {
  if (!initialValue || typeof initialValue !== 'string') {
    return { hour: '8', minute: '00', period: 'AM' };
  }

  const match = initialValue.trim().match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);

  if (!match) {
    return { hour: '8', minute: '00', period: 'AM' };
  }

  return {
    hour: String(Number(match[1])),
    minute: match[2],
    period: match[3].toUpperCase(),
  };
}

function TimeSelectorColumn({ options, value, onChange, compact = false }) {
  return (
    <View style={[styles.timeColumn, compact && styles.timeColumnCompact]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(getWrappedValue(options, value, -1))}
        style={styles.timeArrowButton}>
        <MaterialCommunityIcons name="chevron-up" size={22} color={COLORS.textSecondary} />
      </Pressable>

      <Text style={styles.timePreviewText}>{getWrappedValue(options, value, -1)}</Text>

      <View style={styles.timeSelectedRow}>
        <Text style={styles.timeSelectedText}>{value}</Text>
      </View>

      <Text style={styles.timePreviewText}>{getWrappedValue(options, value, 1)}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(getWrappedValue(options, value, 1))}
        style={styles.timeArrowButton}>
        <MaterialCommunityIcons name="chevron-down" size={22} color={COLORS.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function TimePickerModal({
  visible,
  title = 'Select Time',
  initialValue = '8:00 AM',
  onCancel,
  onSet,
}) {
  const [selectedHour, setSelectedHour] = useState('8');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  useEffect(() => {
    if (!visible) {
      return;
    }

    const parsedTime = parseInitialTime(initialValue);
    setSelectedHour(parsedTime.hour);
    setSelectedMinute(parsedTime.minute);
    setSelectedPeriod(parsedTime.period);
  }, [initialValue, visible]);

  const handleSet = () => {
    onSet(`${selectedHour}:${selectedMinute} ${selectedPeriod}`);
  };

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.timeModalCard}>
          <Text style={styles.timeModalTitle}>{title}</Text>

          <View style={styles.timePickerRow}>
            <TimeSelectorColumn onChange={setSelectedHour} options={HOURS} value={selectedHour} />
            <Text style={styles.timeSeparator}>:</Text>
            <TimeSelectorColumn onChange={setSelectedMinute} options={MINUTES} value={selectedMinute} />
            <TimeSelectorColumn
              compact
              onChange={setSelectedPeriod}
              options={PERIODS}
              value={selectedPeriod}
            />
          </View>

          <View style={styles.timeModalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleSet}
              style={styles.setButton}>
              <Text style={styles.setButtonText}>Set</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  timeModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 22,
  },
  timeModalTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 6,
  },
  timeColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  timeColumnCompact: {
    flexGrow: 0.82,
    flexBasis: 72,
  },
  timeArrowButton: {
    width: 40,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePreviewText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#B7BFCC',
    fontWeight: '500',
  },
  timeSelectedRow: {
    width: '100%',
    minHeight: 56,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  timeSelectedText: {
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  timeSeparator: {
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.textPrimary,
    fontWeight: '700',
    paddingTop: 18,
    width: 10,
    textAlign: 'center',
    flexShrink: 0,
  },
  timeModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  cancelButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.blue,
    fontWeight: '800',
  },
  setButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue,
  },
  setButtonText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
