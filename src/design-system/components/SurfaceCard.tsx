import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { tokens } from '../tokens';

interface SurfaceCardGradient {
  colors: readonly (string | number)[];
  angle?: number;
  angleCenter?: { readonly x: number; readonly y: number };
  locations?: readonly number[];
  start: { readonly x: number; readonly y: number };
  end: { readonly x: number; readonly y: number };
}

interface SurfaceCardProps {
  surfaceColor: string;
  borderColor: string;
  gradientBorder?: SurfaceCardGradient;
}

export function SurfaceCard({
  children,
  surfaceColor,
  borderColor,
  gradientBorder,
}: PropsWithChildren<SurfaceCardProps>) {
  if (gradientBorder) {
    return (
      <LinearGradient
        colors={[...gradientBorder.colors]}
        useAngle={typeof gradientBorder.angle === 'number'}
        angle={gradientBorder.angle}
        angleCenter={gradientBorder.angleCenter}
        locations={
          gradientBorder.locations ? [...gradientBorder.locations] : undefined
        }
        start={gradientBorder.start}
        end={gradientBorder.end}
        style={styles.gradientBorder}
      >
        <View style={[styles.gradientCard, { backgroundColor: surfaceColor }]}>
          {children}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  gradientBorder: {
    borderRadius: tokens.radius.md,
    padding: tokens.border.thin,
  },
  gradientCard: {
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
});
