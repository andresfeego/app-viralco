import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Portal } from 'react-native-paper';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { FormLayout } from '../design-system/components/FormLayout';
import { ButtonRow } from '../design-system/components/ButtonRow';
import { tokens } from '../design-system/tokens';

// Form sheets share the approved account-edit height and a fixed action footer.
// The transparent safe-area spacer is outside the sheet, never painted as a header.
export function FormModal({ visible = true, theme, title, onClose, children, actions, overlay, testID = 'form-modal', sheetTestID, safeAreaTestID, fillAvailableHeight = true, topSpacing = tokens.spacing.xs, portalHost = false }) {
  const MenuHost = portalHost ? Portal.Host : React.Fragment;
  const measurements = useRef({ viewport: 0, content: 0, offset: 0 });
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const updateScrollEdge = useCallback((patch) => {
    const current = { ...measurements.current, ...patch };
    measurements.current = current;
    const maximum = Math.max(0, current.content - current.viewport);
    const offset = Math.max(0, Math.min(current.offset, maximum));
    // Match the filters' tolerance for native subpixel rounding and bounce.
    setHasMoreBelow(current.viewport > 0 && maximum - offset > 1);
  }, []);
  useEffect(() => {
    if (!visible) {
      measurements.current = { viewport: 0, content: 0, offset: 0 };
      setHasMoreBelow(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <MenuHost>
      <ModalSafeArea testID={safeAreaTestID || `${testID}-safe-area`} topSpacing={topSpacing}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View testID={sheetTestID || `${testID}-sheet`} style={[styles.sheet, fillAvailableHeight && styles.fullHeight, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View testID={`${testID}-scroll-viewport`} style={styles.scrollViewport}>
              <ScrollView testID={`${testID}-scroll`} style={styles.scroll} contentContainerStyle={[styles.content, actions && styles.contentWithFooter]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={false}
                onLayout={event => updateScrollEdge({ viewport: event.nativeEvent.layout.height })}
                onContentSizeChange={(_width, height) => updateScrollEdge({ content: height })}
                onScroll={({ nativeEvent }) => updateScrollEdge({ offset: nativeEvent.contentOffset.y, viewport: nativeEvent.layoutMeasurement.height, content: nativeEvent.contentSize.height })}
                scrollEventThrottle={16}
              >
                <FormLayout testID={`${testID}-form`}>
                  <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
                  {children}
                </FormLayout>
              </ScrollView>
              {actions && hasMoreBelow ? (
                <LinearGradient testID={`${testID}-fade-bottom`} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                  colors={[`${theme.background}00`, theme.background]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bottomFade} />
              ) : null}
            </View>
            {actions ? (
              <View testID={`${testID}-footer`} style={styles.footer}>
                <ButtonRow testID={`${testID}-form-actions`}>{actions}</ButtonRow>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
        {overlay}
      </ModalSafeArea>
      </MenuHost>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { flexShrink: 1, maxHeight: '100%', minWidth: tokens.spacing.none, borderTopWidth: tokens.border.thin, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg, overflow: 'hidden' },
  fullHeight: { flex: 1 },
  scrollViewport: { flex: 1, minHeight: tokens.spacing.none, position: 'relative', overflow: 'hidden' },
  scroll: { flex: 1, minHeight: tokens.spacing.none },
  bottomFade: { position: 'absolute', bottom: tokens.spacing.none, left: tokens.spacing.none, right: tokens.spacing.none, height: tokens.spacing.lg },
  content: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.lg },
  contentWithFooter: { paddingBottom: tokens.spacing.none },
  footer: { flexShrink: 0, paddingHorizontal: tokens.spacing.md, paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing.lg },
  title: { fontSize: tokens.typography.heading, fontWeight: '700', flexShrink: 1, minWidth: tokens.spacing.none },
});
