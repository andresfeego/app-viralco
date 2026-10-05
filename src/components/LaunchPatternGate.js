import React, { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';
import { appendPatternNode, samePattern, validPattern } from '../domain/mirrorPattern';
import { t } from '../i18n';

export function LaunchPatternGate({ theme, pattern, onReady, onClose, verifyPattern, title, disabled = false, feedback = '', embedded = false }) {
  const [first, setFirst] = useState(null);
  const [path, setPath] = useState([]);
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const failures = useRef(0);
  const blockedUntil = useRef(0);
  const state = useRef({});
  const board = useRef({ width: 0, height: 0 });
  const currentPath = useRef([]);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const insets = useSafeAreaInsets();
  const update = (point) => {
    if (disabled || busy.current || Date.now() < blockedUntil.current) return;
    if (blocked) setBlocked(false);
    const { width, height } = board.current;
    if (!width || !height) return;
    const x = point.locationX / width * 3;
    const y = point.locationY / height * 3;
    const col = Math.floor(x); const row = Math.floor(y);
    if (col < 0 || col > 2 || row < 0 || row > 2 || Math.hypot(x - col - 0.5, y - row - 0.5) > 0.36) return;
    currentPath.current = appendPatternNode(currentPath.current, row * 3 + col);
    setPath(currentPath.current);
  };
  const submit = async () => {
    const value = currentPath.current;
    if (disabled || busy.current || Date.now() < blockedUntil.current) return;
    if (!validPattern(value)) { setError(true); return; }
    if (!pattern && !first) { setFirst(value); setPath([]); setError(false); return; }
    busy.current = true;
    try {
      const matches = verifyPattern ? await verifyPattern(value) : samePattern(value, pattern || first);
      if (!mounted.current) return;
      if (matches) { await onReady(value); return; }
    } catch { setError(true); }
    finally { busy.current = false; }
    setError(true); setPath([]);
    if (pattern && ++failures.current >= 5) { blockedUntil.current = Date.now() + 30000; failures.current = 0; setBlocked(true); }
    if (!pattern) setFirst(null);
  };
  state.current = { update, submit };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { currentPath.current = []; setPath([]); state.current.update(e.nativeEvent); },
    onPanResponderMove: (e) => state.current.update(e.nativeEvent),
    onPanResponderRelease: () => state.current.submit(),
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => { currentPath.current = []; setPath([]); },
  })).current;
  const content = <View style={[styles.overlay, { paddingTop: insets.top * 2 + tokens.spacing.md, paddingBottom: insets.bottom + tokens.spacing.md }]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: tokens.opacity.disabled }]} />
      <View style={styles.close}><IconTextButton theme={theme} icon="xmark" accessibilityLabel={t('resource_048')} onPress={onClose} /></View>
      <View style={[styles.panel, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{first && !pattern ? t('pattern_confirm') : title || t(pattern ? 'pattern_unlock' : 'pattern_create')}</Text>
        <Text accessibilityLiveRegion="polite" style={{ color: error || feedback ? theme.alert : theme.textSecondary }}>{feedback || t(blocked ? 'pattern_blocked' : error ? 'pattern_error' : 'pattern_help')}</Text>
        <View accessibilityLabel={t('pattern_help')} style={styles.board} onLayout={(e) => { board.current = e.nativeEvent.layout; }} {...responder.panHandlers}>
          <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 300 300">
            <Polyline points={path.map((node) => `${(node % 3) * 100 + 50},${Math.floor(node / 3) * 100 + 50}`).join(' ')} fill="none" stroke={theme.primary} strokeWidth={tokens.border.medium * 2} />
            {Array.from({ length: 9 }, (_, node) => <Circle key={node} cx={(node % 3) * 100 + 50} cy={Math.floor(node / 3) * 100 + 50} r={tokens.spacing.sm} fill={path.includes(node) ? theme.primary : theme.textSecondary} />)}
          </Svg>
        </View>
      </View>
    </View>;
  return embedded ? content : <Modal transparent animationType="fade" onRequestClose={onClose}>{content}</Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: tokens.spacing.lg, gap: tokens.spacing.md },
  close: { alignItems: 'flex-end' },
  panel: { width: '100%', maxWidth: tokens.spacing.xl * 12, alignSelf: 'center', padding: tokens.spacing.lg, borderRadius: tokens.radius.lg, gap: tokens.spacing.md },
  title: { fontSize: tokens.typography.heading, fontWeight: '700' },
  board: { width: '100%', aspectRatio: 1 },
});
