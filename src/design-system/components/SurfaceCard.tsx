import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '../tokens';

interface SurfaceCardProps {
  surfaceColor: string;
  borderColor: string;
}

export function SurfaceCard({ children, surfaceColor, borderColor }: PropsWithChildren<SurfaceCardProps>) {
  return <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
});
