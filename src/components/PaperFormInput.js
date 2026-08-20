import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HelperText, TextInput as PaperTextInput } from 'react-native-paper';
import { tokens } from '../design-system/tokens';

const MULTILINE_INPUT_MIN_HEIGHT = tokens.spacing.xl + tokens.spacing.lg + tokens.spacing.lg + tokens.spacing.xxs;

export function PaperFormInput({
  theme,
  testID,
  label,
  value,
  onChangeText,
  errorText = '',
  helperAction = null,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  editable = true,
  inputStyle = null,
  right = null,
  onPressIn = null,
  showSoftInputOnFocus = true,
  caretHidden = false,
}) {
  return (
    <View style={styles.inputGroup}>
      <PaperTextInput
        testID={testID}
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={Boolean(errorText)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        editable={editable}
        right={right}
        onPressIn={onPressIn}
        showSoftInputOnFocus={showSoftInputOnFocus}
        caretHidden={caretHidden}
        textColor={theme.textPrimary}
        outlineColor={theme.border}
        activeOutlineColor={theme.primary}
        placeholderTextColor={theme.textSecondary}
        style={[styles.paperInput, multiline ? styles.paperMultiline : null, { backgroundColor: theme.background }, inputStyle]}
        theme={{ colors: { onSurfaceVariant: theme.textSecondary, primary: theme.primary } }}
      />
      {errorText ? (
        <HelperText type="error" visible style={styles.fieldError}>
          {errorText}
        </HelperText>
      ) : null}
      {helperAction ? (
        <Pressable style={styles.inlineAction} onPress={helperAction.onPress}>
          <Text style={[styles.inlineActionText, { color: theme.primary }]}>{helperAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: { gap: tokens.spacing.xxs },
  paperInput: { fontSize: tokens.typography.body },
  paperMultiline: { minHeight: MULTILINE_INPUT_MIN_HEIGHT, textAlignVertical: 'top' },
  fieldError: { marginVertical: tokens.spacing.none, paddingVertical: tokens.spacing.none },
  inlineAction: { alignSelf: 'flex-end', paddingVertical: tokens.spacing.xxs, paddingHorizontal: tokens.spacing.xs },
  inlineActionText: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
