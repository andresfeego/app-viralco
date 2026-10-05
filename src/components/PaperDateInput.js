import React, { useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppButton } from '../design-system/components/AppButton';
import { FormModal } from './FormModal';
import { t } from '../i18n';
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
      <FormModal visible={visible} theme={theme} title={label} onClose={() => setVisible(false)} testID={`${testID}-modal`} actions={Platform.OS === 'ios' ? <>
        <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} label={t('common_cancel')} onPress={() => setVisible(false)} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
        <AppButton testID={`${testID}-confirm`} label={t('common_save')} onPress={onConfirm} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
      </> : null}>
            <DateTimePicker
              testID={`${testID}-picker`}
              value={draftDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
 />
      </FormModal>
    </View>
  );
}
