import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  helperLabel = 'Seleccionar fecha',
}) {
  const [visible, setVisible] = useState(false);
  const openPicker = () => {
    if (!disabled) setVisible(true);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') setVisible(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) {
      onChangeDate(formatDateYmd(selectedDate));
      if (Platform.OS === 'ios') setVisible(false);
    }
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
          helperAction={{ label: helperLabel, onPress: openPicker }}
        />
      </Pressable>
      {visible ? (
        <DateTimePicker
          testID={`${testID}-picker`}
          value={parseDateYmd(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={onDateChange}
        />
      ) : null}
    </View>
  );
}
