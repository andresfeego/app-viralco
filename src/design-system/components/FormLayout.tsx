import React, { type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ButtonRow } from './ButtonRow';
import { tokens } from '../tokens';

type FormLayoutProps = PropsWithChildren<{
  actions?: ReactNode;
  contentGap?: number;
  testID?: string;
}>;

// Stack owns the content-to-actions separation; Cluster owns the buttons.
export function FormLayout({ children, actions, contentGap = tokens.spacing.sm, testID = 'form-layout' }: FormLayoutProps) {
  return (
    <View testID={testID} style={styles.stack}>
      <View testID={`${testID}-content`} style={[styles.content, { gap: contentGap }]}>{children}</View>
      {actions ? <ButtonRow testID={`${testID}-actions`}>{actions}</ButtonRow> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.xl, minWidth: tokens.spacing.none },
  content: { minWidth: tokens.spacing.none },
});
