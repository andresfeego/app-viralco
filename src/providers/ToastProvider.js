import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../hooks/useAuth';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';

const ToastContext = createContext(null);

const TYPE_COLOR = {
  success: 'success',
  error: 'error',
  info: 'info',
  loading: 'info',
};

function ToastCard({ text1, text2, type = 'info', props = {}, theme, hide }) {
  const tone = TYPE_COLOR[type] || 'info';
  const accent = type === 'error' ? theme.alert : tokens.colors[tone]?.[500] || theme.primary;
  const isLoading = type === 'loading';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {isLoading ? <ActivityIndicator size="small" color={accent} /> : null}
          <Text style={[styles.title, { color: theme.textPrimary }]}>{text1}</Text>
        </View>
        {text2 ? <Text style={[styles.detail, { color: theme.textSecondary }]}>{text2}</Text> : null}
      </View>
      {props?.actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (typeof props.onAction === 'function') props.onAction();
            hide();
          }}
          style={styles.action}
        >
          <Text style={[styles.actionText, { color: accent }]}>{props.actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildToastConfig(theme) {
  const render = (type) => (toastProps) => (
    <ToastCard {...toastProps} type={type} theme={theme} />
  );

  return {
    success: render('success'),
    error: render('error'),
    info: render('info'),
    loading: render('loading'),
  };
}

export function ToastViewport({ theme, topOffset = tokens.spacing.xl }) {
  const config = useMemo(() => buildToastConfig(theme), [theme]);
  return (
    <Toast
      config={config}
      position="top"
      visibilityTime={3200}
      topOffset={topOffset}
      keyboardOffset={tokens.spacing.md}
    />
  );
}

export function ToastProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const mode = isAuthenticated ? user?.themeMode || 'dark' : 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);

  const showToast = useCallback((input) => {
    const message = typeof input === 'string' ? input : input?.message;
    if (!message) return;
    const type = typeof input === 'string' ? 'info' : input?.type || 'info';
    Toast.show({
      type,
      text1: message,
      text2: typeof input === 'string' ? undefined : input?.detail,
      autoHide: type !== 'loading',
      visibilityTime: typeof input === 'string' ? 3200 : input?.duration || 3200,
      props: typeof input === 'string' ? undefined : {
        actionLabel: input?.actionLabel,
        onAction: input?.onAction,
      },
    });
  }, []);

  const hideToast = useCallback(() => {
    Toast.hide();
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [hideToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport theme={theme} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return value;
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    marginHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  accent: {
    width: tokens.spacing.xxs,
    alignSelf: 'stretch',
    borderRadius: tokens.radius.pill,
  },
  content: {
    flex: 1,
    gap: tokens.spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
  detail: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  action: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
  },
  actionText: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
});
