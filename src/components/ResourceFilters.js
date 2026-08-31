import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { HorizontalSubMenu } from './HorizontalSubMenu';
import { PaperFormInput } from './PaperFormInput';
import { SelectableChipGroup } from './SelectableChipGroup';

export function ResourceFilters({ theme, tab, onTabChange, search, onSearchChange, type, onTypeChange }) {
  const typeOptions = [
    { label: t('resource_006'), value: '' },
    { label: t('resource_007'), value: 'template' },
    { label: t('resource_008'), value: 'frame' },
    { label: t('resource_009'), value: 'animation' },
    { label: t('resource_010'), value: 'gif_overlay' },
    { label: t('resource_011'), value: 'font' },
  ];
  return (
    <View style={styles.wrap}>
      <HorizontalSubMenu
        theme={theme}
        selectedKey={tab}
        onSelect={onTabChange}
        items={[{ key: 'pool', label: t('resource_001') }, { key: 'favorites', label: t('resource_002') }]}
      />
      <PaperFormInput theme={theme} label={t('resource_003')} value={search} onChangeText={onSearchChange} />
      <SelectableChipGroup theme={theme} label={t('resource_005')} options={typeOptions} value={type} onChange={onTypeChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
});
