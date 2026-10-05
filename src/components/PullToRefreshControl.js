import React from 'react';
import { RefreshControl } from 'react-native';
import { t } from '../i18n';

export function PullToRefreshControl({ theme, refreshing, onRefresh, disabled = false, ...props }) {
  return <RefreshControl {...props} refreshing={refreshing} onRefresh={onRefresh} enabled={!disabled}
    tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface}
    accessibilityLabel={t('common_refresh_content')} />;
}
