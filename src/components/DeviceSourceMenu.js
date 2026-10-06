import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Menu } from 'react-native-paper';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

const ICONS = Object.fromEntries(Object.entries({ camera: 'camera', gallery: 'images', files: 'folder-open', video: 'film' })
  .map(([key, name]) => [key, props => <Icon {...props} name={name} iconStyle="solid" />]));

// The caller supplies the anchor and file policy; this menu never uploads media.
export function DeviceSourceMenu({ theme, sources, onSelect, renderAnchor, disabled = false, active = true, resetKey, video = false, testID = 'device-source' }) {
  const [open, setOpen] = useState(false);
  const menuTheme = { colors: { onSurface: theme.textPrimary, onSurfaceVariant: theme.textSecondary } };
  useEffect(() => { setOpen(false); }, [resetKey, active, disabled]);
  const choose = source => {
    if (disabled || !active) return;
    setOpen(false);
    return onSelect(source);
  };
  const show = () => {
    if (disabled || !active) return;
    return sources.length > 1 ? setOpen(true) : choose(sources[0]);
  };
  return <Menu visible={open && active && !disabled} onDismiss={() => setOpen(false)} anchor={renderAnchor(show)} overlayAccessibilityLabel={t('common_cancel')}
    contentStyle={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }]}
    theme={menuTheme}>
    {sources.map(source => <Menu.Item key={source} testID={`${testID}-${source}`}
      title={t(source === 'gallery' ? (video ? 'resource_source_video' : 'resource_source_photos') : `resource_source_${source}`)}
      theme={menuTheme} titleStyle={{ color: theme.textPrimary }}
      leadingIcon={ICONS[source === 'gallery' && video ? 'video' : source]}
      onPress={() => choose(source)} />)}
  </Menu>;
}

const styles = StyleSheet.create({
  menu: { borderWidth: tokens.border.thin, borderRadius: tokens.radius.md },
});
