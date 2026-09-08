import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { MediaPreview } from '../design-system/components/MediaPreview';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { resourceOriginalUri, resourceThumbnailUri } from './ResourceGalleryTile';

const ITEM_WIDTH = tokens.spacing.xl * 4;
const ITEM_GAP = tokens.spacing.sm;

export function AnimationFavoriteCarousel({ items = [], theme, disabled = false, onSelect }) {
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(ITEM_WIDTH + tokens.spacing.xl * 2);
  const activeItem = items[activeIndex] || null;

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(Math.max(0, items.length - 1));
  }, [activeIndex, items.length]);

  if (!items.length) return null;
  const sidePadding = Math.max(tokens.spacing.md, (viewportWidth - ITEM_WIDTH) / 2);

  return (
    <View style={styles.wrap} onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}>
      <FlatList
        ref={listRef}
        horizontal
        data={items}
        keyExtractor={(item) => String(item.libraryAssetId)}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + ITEM_GAP}
        snapToAlignment="start"
        contentContainerStyle={[styles.content, { paddingHorizontal: sidePadding }]}
        getItemLayout={(_data, index) => ({ length: ITEM_WIDTH + ITEM_GAP, offset: (ITEM_WIDTH + ITEM_GAP) * index, index })}
        onMomentumScrollEnd={(event) => {
          const index = Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_GAP))));
          setActiveIndex(index);
        }}
        renderItem={({ item, index }) => {
          const active = index === activeIndex;
          const poster = resourceThumbnailUri(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={item.displayName || item.asset?.name}
              disabled={disabled}
              onPress={() => {
                if (active) return;
                setActiveIndex(index);
                listRef.current?.scrollToIndex({ index, animated: true });
              }}
              style={[styles.item, !active ? styles.sideItem : null, { borderColor: active ? theme.primary : theme.border, backgroundColor: theme.surface }]}
            >
              {active ? (
                <MediaPreview uri={resourceOriginalUri(item)} posterUri={poster} mediaType={item.asset?.mimeType || 'video/mp4'} borderColor={theme.border} textColor={theme.textSecondary} resizeMode="cover" aspectRatio={tokens.layout.verticalVideoAspectRatio} autoPlay repeat controls={false} />
              ) : poster ? <Image source={{ uri: poster }} resizeMode="cover" style={styles.poster} /> : <View style={[styles.fallback, { backgroundColor: theme.background }]} />}
              <Text numberOfLines={2} style={[styles.name, { color: theme.textPrimary }]}>{item.displayName || item.asset?.name}</Text>
            </Pressable>
          );
        }}
      />
      <Text style={[styles.position, { color: theme.textSecondary }]}>{activeIndex + 1} / {items.length}</Text>
      <AppButton label={t('mirror_181')} onPress={() => onSelect(activeItem)} disabled={disabled || !activeItem} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.selectButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs, overflow: 'hidden' },
  content: { gap: ITEM_GAP },
  item: { width: ITEM_WIDTH, borderWidth: tokens.border.medium, borderRadius: tokens.radius.md, padding: tokens.spacing.xs, gap: tokens.spacing.xs },
  sideItem: { opacity: tokens.opacity.disabled, transform: [{ scale: tokens.layout.carouselSideScale }] },
  poster: { width: '100%', aspectRatio: tokens.layout.verticalVideoAspectRatio, borderRadius: tokens.radius.sm },
  fallback: { width: '100%', aspectRatio: tokens.layout.verticalVideoAspectRatio, borderRadius: tokens.radius.sm },
  name: { fontSize: tokens.typography.caption, fontWeight: '700', textAlign: 'center' },
  position: { fontSize: tokens.typography.caption, fontWeight: '700', textAlign: 'center' },
  selectButton: { alignSelf: 'center' },
});
