import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCan } from '../hooks/useCan';

export function ProtectedScreen({ permission, children }) {
  const allowed = useCan(permission);

  if (!allowed) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No tienes permisos para ver esta vista.</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
  },
});
