import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppButton } from '../design-system/components/AppButton';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { tokens } from '../design-system/tokens';
import { PaperFormInput } from './PaperFormInput';

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function formatDateYmd(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseDateYmd(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function PaperDateInput({
  theme,
  testID,
  label,
  value,
  onChangeDate,
  errorText = '',
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(parseDateYmd(value));
  const draftDateRef = useRef(parseDateYmd(value));
  const openPicker = () => {
    if (!disabled) {
      const parsedDate = parseDateYmd(value);
      draftDateRef.current = parsedDate;
      setDraftDate(parsedDate);
      setVisible(true);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (event?.type === 'dismissed') {
      setVisible(false);
      return;
    }
    if (selectedDate) {
      if (Platform.OS === 'android') {
        onChangeDate(formatDateYmd(selectedDate));
        setVisible(false);
      } else {
        draftDateRef.current = selectedDate;
        setDraftDate(selectedDate);
      }
    }
  };

  const onConfirm = () => {
    onChangeDate(formatDateYmd(draftDateRef.current));
    setVisible(false);
  };

  return (
    <View>
      <Pressable testID={`${testID}-pressable`} disabled={disabled} onPress={openPicker}>
        <PaperFormInput
          testID={testID}
          theme={theme}
          label={label}
          value={value}
          onChangeText={onChangeDate}
          errorText={errorText}
          autoCapitalize="none"
          editable={!disabled}
          onPressIn={openPicker}
          showSoftInputOnFocus={false}
          caretHidden
        />
      </Pressable>
      <Modal transparent visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <ModalSafeArea style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <DateTimePicker
              testID={`${testID}-picker`}
              value={draftDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
            {Platform.OS === 'ios' ? (
              <View style={styles.actionsRow}>
                <AppButton label="Cancelar" onPress={() => setVisible(false)} backgroundColor={theme.surface} pressedColor={theme.surface} textColor={theme.textPrimary} style={styles.actionButton} />
                <AppButton testID={`${testID}-confirm`} label="Guardar" onPress={onConfirm} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.actionButton} />
              </View>
            ) : null}
          </View>
        </ModalSafeArea>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopWidth: 1,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  actionButton: {
    flex: 1,
    minWidth: tokens.spacing.none,
  },
});
