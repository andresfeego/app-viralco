import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppButton } from './AppButton';
import { tokens } from '../tokens';

type ButtonRowProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

function flattenActions(children: React.ReactNode, prefix = ''): React.ReactNode[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<PropsWithChildren>(child)) return [child];
    const key = `${prefix}${child.key}`;
    return child.type === React.Fragment
      ? flattenActions(child.props.children, `${key}:`)
      : [React.cloneElement(child, { key })];
  });
}

// A content-sized Cluster: labels get their natural width before sharing spare space.
// When they cannot fit, whole buttons wrap rather than squeezing their text.
export function ButtonRow({ children, style, testID }: ButtonRowProps) {
  return (
    <View testID={testID} style={[styles.row, style]}>
      {React.Children.map(flattenActions(children), child => {
        // Composite menu buttons opt in and forward these layout props to their anchor/container.
        if (!React.isValidElement<React.ComponentProps<typeof AppButton> & { buttonRowItem?: boolean }>(child) || (child.type !== AppButton && !child.props.buttonRowItem)) return child;
        return React.cloneElement(child, {
          singleLine: true,
          style: [child.props.style, styles.action],
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: tokens.spacing.xs,
    minWidth: tokens.spacing.none,
  },
  action: {
    flexBasis: 'auto',
    flexGrow: 1,
    flexShrink: 0,
    minWidth: tokens.spacing.none,
    maxWidth: '100%',
    paddingHorizontal: tokens.spacing.sm,
  },
});
