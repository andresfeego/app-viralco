import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useCan } from '../hooks/useCan';

export function ProtectedButton({ permission, title, onPress, fallback = null, style }) {
  const allowed = useCan(permission);

  if (!allowed) {
    return fallback;
  }

  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
