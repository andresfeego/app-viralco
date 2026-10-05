import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import Icon from '@react-native-vector-icons/fontawesome6';
import { recordClientTechnicalError } from '../services/errorHandling';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalSafeArea, modalSurfaceTopOffset } from '../design-system/components/ModalSafeArea';
import { AppButton } from '../design-system/components/AppButton';
import { IconTextButton } from './IconTextButton';
import { SectionHeader } from './SectionHeader';
import { ToastViewport } from '../providers/ToastProvider';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { compositionKey } from '../services/mirrorLocalGallery';
import { canPrintComposition } from '../domain/mirrorPrint';

const OperatorContext = createContext(null);
function OperatorAccess({ theme, iconColor }) {
  const onOperator = useContext(OperatorContext);
  return onOperator ? <IconTextButton theme={theme} icon="circle" iconColor={iconColor} variant="ghost" accessibilityLabel={t('guest_hold')} onLongPress={onOperator} delayLongPress={3000} style={styles.operatorTarget} /> : null;
}

export function GuestAction({ label, onPress, disabled, theme, testID }) {
  return <AppButton testID={testID} label={label} onPress={onPress} disabled={disabled} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />;
}

export function GuestModal({ title, subtitle, theme, onClose, children, scroll = false, embedded = false, headerCoversSafeArea = false }) {
  const insets = useSafeAreaInsets();
  // Keep the same safe clearance, but let the header paint behind it in galleries.
  const Container = headerCoversSafeArea ? SafeAreaView : ModalSafeArea;
  const safeAreaProps = headerCoversSafeArea ? { edges: ['left', 'right', 'bottom'], accessibilityViewIsModal: true } : {};
  const content = <Container {...safeAreaProps} style={[styles.modalContainer, { backgroundColor: theme.background }]}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        theme={theme}
        topInset={headerCoversSafeArea ? modalSurfaceTopOffset(insets.top) : tokens.spacing.none}
        statusBarStyle={headerCoversSafeArea ? 'light-content' : theme.statusBarStyle}
        startAccessory={<OperatorAccess theme={theme} iconColor={theme.buttonText} />}
        endAccessory={<IconTextButton theme={theme} icon="xmark" variant="ghost" iconColor={theme.buttonText} accessibilityLabel={t('resource_048')} onPress={onClose} />}
      />
      {scroll ? <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalStack}>{children}</ScrollView> : <View style={styles.modalBody}>{children}</View>}
      <ToastViewport theme={theme} />
    </Container>;
  return embedded ? content : <Modal transparent animationType="fade" onRequestClose={onClose}>{content}</Modal>;
}

export function GuestAnimation({ resource, loop = false, onDone, paused = false, label, theme, effect = 'video-vertical', stage, versionId }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const done = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failureRef = useRef(null);
  failureRef.current = (error) => {
    setVideoFailed(true);
    recordClientTechnicalError({ code: 'MIRROR_ANIMATION_PLAYBACK_FAILED', detail: JSON.stringify({ stage, versionId, resourceId: resource?.eventResourceId, nativeCode: String(error?.error?.code || error?.code || 'VIDEO_LOAD_TIMEOUT') }) });
  };
  const complete = () => { if (!done.current) { done.current = true; onDone?.(); } };
  useEffect(() => { setLoaded(false); setVideoFailed(false); setSkipped(false); }, [resource]);
  useEffect(() => {
    if (!resource || loaded || paused || videoFailed) return undefined;
    const timer = setTimeout(() => failureRef.current(), 30000);
    return () => clearTimeout(timer);
  }, [attempt, loaded, paused, resource, videoFailed]);
  useEffect(() => {
    done.current = false;
    if (resource || loop || paused) return undefined;
    const timer = setTimeout(() => { if (!done.current) { done.current = true; onDone?.(); } }, 800);
    return () => clearTimeout(timer);
  }, [loop, onDone, paused, resource]);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    if (!paused && effect !== 'minimal') animation.start();
    return () => animation.stop();
  }, [effect, paused, pulse]);
  return <View pointerEvents={videoFailed && !skipped ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, styles.animation, { backgroundColor: theme.background }]}>
    {resource && !videoFailed ? <Video key={attempt} source={{ uri: resource.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" repeat={loop} paused={paused} controls={false} muted onLoad={() => setLoaded(true)} onEnd={loop ? undefined : complete} onError={(error) => failureRef.current(error)} /> : videoFailed && !skipped ? <View style={styles.modalStack}>
      <Text style={[styles.callout, { color: theme.textPrimary }]}>{t('guest_video_failed')}</Text>
      <GuestAction theme={theme} label={t('resource_045')} onPress={() => { setLoaded(false); setVideoFailed(false); setAttempt((value) => value + 1); }} />
      <GuestAction theme={theme} label={t('guest_skip_video')} onPress={() => { setSkipped(true); complete(); }} />
    </View> :
      <Animated.View style={[styles.fallback, { borderColor: effect === 'party' ? theme.secondary : theme.tertiary }, effect === 'minimal' ? null : { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [tokens.opacity.disabled, 1] }) }]}>
        <Text style={[styles.callout, { color: theme.textPrimary }]}>{label}</Text>
      </Animated.View>}
  </View>;
}

export function GuestCapturePrompt({ theme, label, onPress, disabled = false }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.05, duration: 900, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    if (!disabled) pulse.start();
    return () => pulse.stop();
  }, [disabled, scale]);
  return <Animated.View style={[styles.prompt, { transform: [{ scale }] }]}>
    <IconTextButton theme={theme} icon="camera" iconSize={tokens.typography.heading} label={label} direction="column" style={styles.promptButton} onPress={onPress} disabled={disabled} accessibilityLabel={label} />
  </Animated.View>;
}

export function GuestWelcome({ theme, video, versionId, paused, onStart }) {
  return <Pressable style={StyleSheet.absoluteFill} onPress={onStart} accessibilityRole="button" accessibilityLabel={t('guest_touch')}>
    {video ? <GuestAnimation resource={video} stage="start" versionId={versionId} loop paused={paused} theme={theme} label={t('guest_touch')} onDone={onStart} /> : null}
    {/* The touch surface stays below video error controls, but above its media. */}
    {!video ? <Pressable accessibilityRole="button" accessibilityLabel={t('guest_touch')} onPress={onStart} style={styles.welcome}>
      <Icon name="camera" iconStyle="solid" size={tokens.spacing.xl * 3} color={theme.tertiary} />
      <GuestCapturePrompt theme={theme} label={t('guest_touch')} onPress={onStart} />
    </Pressable> : null}
  </Pressable>;
}

export function GuestStage({ children, footer, overlay, eventName, progress, onOperator, theme }) {
  const insets = useSafeAreaInsets();
  return <OperatorContext.Provider value={onOperator}><View style={[styles.stage, { backgroundColor: theme.background }]}>
    {children}
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{overlay}</View>
    <View pointerEvents="box-none" style={[styles.stageControls, { paddingTop: insets.top + tokens.spacing.sm, paddingBottom: insets.bottom + tokens.spacing.md }]}>
      <View style={styles.topRow}>
        <OperatorAccess theme={theme} />
        {eventName || progress ? <View style={[styles.captionBox, { backgroundColor: theme.surface }]}>
          {eventName ? <Text numberOfLines={1} style={[styles.eventName, { color: theme.textPrimary }]}>{eventName}</Text> : null}
          {progress ? <Text style={[styles.progress, { color: theme.textSecondary }]}>{progress}</Text> : null}
        </View> : <View />}
      </View>
      <View pointerEvents="none" style={styles.middle} />
      <View style={styles.footer}>{footer}</View>
    </View>
  </View></OperatorContext.Provider>;
}

// Geometry belongs to the photo contract; it is not a UI spacing value.
export function GuestResult({ output, config, onRetake, theme }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ratio = config.layout.output.width / config.layout.output.height;
  const width = Math.min(size.width, size.height * ratio);
  const copies = config.layout.duplicateStrip ? 2 : 1;
  return <View style={styles.resultRegion} onLayout={(event) => setSize(event.nativeEvent.layout)}>
    <Image accessibilityLabel={t('runtime_031')} source={{ uri: output.uri }} resizeMode="contain" style={StyleSheet.absoluteFill} />
    {width > 0 ? <View style={{ width, height: width / ratio }}>
      {onRetake ? Array.from({ length: copies }, (_, copy) => (config.layout.slots || []).map((slot) => <View pointerEvents="box-none"
        key={copy + '-' + slot.slotId}
        style={[styles.retakeTarget, { left: ((copy * 100 + slot.x) / copies) + '%', top: slot.y + '%', width: (slot.width / copies) + '%', height: slot.height + '%', transform: [{ rotate: Number(slot.rotation || 0) + 'deg' }] }]}>
        <IconTextButton theme={theme} icon="rotate-left" label={String(slot.photoNumber)} accessibilityLabel={t('runtime_029') + ' ' + slot.photoNumber} onPress={() => onRetake(slot.photoNumber)} />
      </View>)) : null}
    </View> : null}
  </View>;
}

export function GuestGallery({ runs, onSelect, theme, selected = [], onToggle, onArchive, archived = false, onPrint, printing = false }) {
  return <FlatList data={runs.filter((run) => run.output && run.output.localAvailable !== false)} numColumns={2} keyExtractor={compositionKey} contentContainerStyle={styles.gallery} columnWrapperStyle={styles.galleryRow} extraData={selected}
    ListEmptyComponent={<Text style={{ color: theme.textSecondary }}>{t('guest_empty')}</Text>}
    renderItem={({ item: run }) => <View style={[styles.tile, { backgroundColor: theme.surface }]}>
      <Image source={{ uri: run.output.uri }} resizeMode="contain" style={StyleSheet.absoluteFill} />
      {onToggle ? <View pointerEvents="box-none" style={styles.tileTop}><IconTextButton theme={theme} icon={selected.includes(compositionKey(run)) ? 'square-check' : 'square'} selected={selected.includes(compositionKey(run))} accessibilityLabel={t('gallery_select')} onPress={() => onToggle(run)} /></View> : null}
      <View pointerEvents="box-none" style={styles.tileBottom}>
        {onPrint && canPrintComposition(run) ? <IconTextButton theme={theme} icon="print" accessibilityLabel={t('print_action')} disabled={printing} onPress={() => onPrint(run)} /> : null}
        <IconTextButton theme={theme} icon="eye" accessibilityLabel={t('gallery_view')} onPress={() => onSelect(run)} />
        {onArchive ? <IconTextButton theme={theme} icon={archived ? 'rotate-left' : 'box-archive'} accessibilityLabel={t(archived ? 'gallery_restore' : 'gallery_archive')} onPress={() => onArchive(run)} /> : null}
      </View>
    </View>} />;
}

const styles = StyleSheet.create({
  welcome: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', gap: tokens.spacing.xl, padding: tokens.spacing.xl },
  welcomeAction: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', padding: tokens.spacing.xl },
  prompt: { alignSelf: 'center' },
  promptButton: { padding: tokens.spacing.lg, borderRadius: tokens.radius.lg },
  stage: { flex: 1, position: 'relative' },
  stageControls: { ...StyleSheet.absoluteFill, paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  captionBox: { flexShrink: 1, minWidth: 0, padding: tokens.spacing.xs, borderRadius: tokens.radius.sm },
  eventName: { fontSize: tokens.typography.body, fontWeight: '700' },
  progress: { fontSize: tokens.typography.caption },
  middle: { flex: 1, minHeight: 0, justifyContent: 'center' },
  footer: { gap: tokens.spacing.sm },
  animation: { justifyContent: 'center', alignItems: 'center' },
  fallback: { padding: tokens.spacing.xl, borderWidth: tokens.border.thin, borderRadius: tokens.radius.lg },
  callout: { fontSize: tokens.typography.heading, fontWeight: '800', textAlign: 'center' },
  modalContainer: { flex: 1 },
  modalBody: { flex: 1, padding: tokens.spacing.md, gap: tokens.spacing.md },
  modalScroll: { flex: 1 },
  modalStack: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  operatorTarget: { width: tokens.spacing.xl + tokens.spacing.md, height: tokens.spacing.xl + tokens.spacing.md, zIndex: tokens.layers.floating },
  resultRegion: { flex: 1, width: '100%', minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  retakeTarget: { position: 'absolute', justifyContent: 'flex-end', alignItems: 'flex-end', padding: tokens.spacing.xxs },
  gallery: { gap: tokens.spacing.xs },
  galleryRow: { gap: tokens.spacing.xs },
  tile: { flexBasis: '46%', flexGrow: 1, minWidth: 0, aspectRatio: 0.8 },
  tileTop: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', padding: tokens.spacing.xxs },
  tileBottom: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xxs, padding: tokens.spacing.xxs },
});
