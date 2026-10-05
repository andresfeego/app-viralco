import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Menu } from 'react-native-paper';
import Icon from '@react-native-vector-icons/fontawesome6';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { resourceSources } from '../services/media/resourcePicker';

const ICONS = Object.fromEntries(Object.entries({ camera: 'camera', gallery: 'images', files: 'folder-open', video: 'film' })
  .map(([key, name]) => [key, props => <Icon {...props} name={name} iconStyle="solid" />]));
export function ResourceSourceButton({ theme, purpose, onSelect, disabled = false, active = true, label, style, singleLine = true }) {
  const [open, setOpen] = useState(false);
  const sources = resourceSources(purpose);
  useEffect(() => { setOpen(false); }, [purpose, active, disabled]);
  const choose = source => {
    if (disabled || !active) return;
    setOpen(false);
    onSelect(purpose, source);
  };
  const { paddingHorizontal = tokens.spacing.sm, ...layout } = StyleSheet.flatten(style) || {};
  const anchor = <AppButton testID="resource-source-button" label={label || t(purpose === 'print_profile' ? 'print_007' : 'resource_059')} singleLine={singleLine}
    onPress={() => sources.length > 1 ? setOpen(true) : choose(sources[0])} disabled={disabled || !active || !purpose}
    backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={{ paddingHorizontal }} />;
  return <View style={[styles.wrap, layout]}>
    <Menu visible={open && active && !disabled} onDismiss={() => setOpen(false)} anchor={anchor} overlayAccessibilityLabel={t('common_cancel')}
      contentStyle={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }]}
      theme={{ colors: { onSurface: theme.textPrimary, onSurfaceVariant: theme.textSecondary } }}>
      {sources.map(source => <Menu.Item key={source} testID={`resource-source-${source}`}
        title={t(source === 'gallery' ? (purpose === 'animation' ? 'resource_source_video' : 'resource_source_photos') : `resource_source_${source}`)}
        leadingIcon={ICONS[source === 'gallery' && purpose === 'animation' ? 'video' : source]}
        onPress={() => choose(source)} />)}
    </Menu>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { minWidth: tokens.spacing.none },
  menu: { borderWidth: tokens.border.thin, borderRadius: tokens.radius.md },
});
