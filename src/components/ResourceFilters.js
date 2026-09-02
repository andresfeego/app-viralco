import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { HorizontalSubMenu } from './HorizontalSubMenu';
import { PaperFormInput } from './PaperFormInput';
import { SelectableChipGroup } from './SelectableChipGroup';

export function ResourceFilters({ theme, tab, onTabChange, search, onSearchChange, type, onTypeChange, eventTypes = [], eventType = '', onEventTypeChange = () => {}, motion = '', onMotionChange = () => {}, poolLabel = t('resource_001'), horizontalTypes = false, showTabs = true }) {
  const typeOptions = [
    { label: t('resource_006'), value: '' },
    { label: t('resource_012'), value: 'background' },
    { label: t('resource_008'), value: 'frame' },
    { label: t('resource_053'), value: 'sticker' },
    { label: t('resource_007'), value: 'template' },
    { label: t('resource_009'), value: 'animation' },
    { label: t('resource_011'), value: 'font' },
  ];
  const eventTypeOptions = [{ label: t('resource_006'), value: '' }, ...eventTypes.map((item) => ({ label: item.name, value: item.slug }))];
  const motionOptions = [
    { label: t('resource_006'), value: '' },
    { label: t('resource_055'), value: 'animated' },
    { label: t('resource_056'), value: 'static' },
  ];
  return (
    <View style={styles.wrap}>
      {showTabs ? (
        <HorizontalSubMenu
          theme={theme}
          selectedKey={tab}
          onSelect={onTabChange}
          items={[{ key: 'pool', label: poolLabel }, { key: 'favorites', label: t('resource_002') }]}
        />
      ) : null}
      <PaperFormInput theme={theme} label={t('resource_003')} value={search} onChangeText={onSearchChange} />
      <SelectableChipGroup theme={theme} label={t('resource_005')} options={typeOptions} value={type} onChange={onTypeChange} horizontal={horizontalTypes} />
      <SelectableChipGroup theme={theme} label={t('resource_054')} options={eventTypeOptions} value={eventType} onChange={onEventTypeChange} horizontal />
      {type === 'sticker' ? <SelectableChipGroup theme={theme} label={t('resource_057')} options={motionOptions} value={motion} onChange={onMotionChange} horizontal /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
});
