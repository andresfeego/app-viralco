import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { AppButton } from '../design-system/components/AppButton';
import { MediaPreview } from '../design-system/components/MediaPreview';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens, type ThemeMode } from '../design-system/tokens';

interface Post {
  id: number;
  title: string;
  imageUrl: string;
  mediaType: string;
}

interface PostsScreenProps {
  mode: ThemeMode;
  onBack: () => void;
}

export function PostsScreen({ mode, onBack }: PostsScreenProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useMemo(() => getTheme(mode), [mode]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as Post[];
      setPosts(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error('[PostsScreen] loadPosts failed:', fetchError);
      setError(`No fue posible cargar posts (${message}).`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}> 
      <View style={styles.header}>
        <Text style={[styles.heading, { color: theme.textPrimary }]}>Posts</Text>
        <AppButton
          label="Volver"
          onPress={onBack}
          backgroundColor={theme.buttonBg}
          pressedColor={theme.buttonBgPressed}
          textColor={theme.buttonText}
        />
      </View>

      {loading ? <Text style={[styles.message, { color: theme.textSecondary }]}>Cargando posts...</Text> : null}
      {error ? <Text style={[styles.message, { color: theme.textSecondary }]}>{error}</Text> : null}

      {!loading && !error ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.message, { color: theme.textSecondary }]}>No hay posts todavía.</Text>
          }
          renderItem={({ item }) => (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <MediaPreview
                uri={item.imageUrl}
                mediaType={item.mediaType}
                borderColor={theme.border}
                textColor={theme.textSecondary}
              />
              <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>#{item.id}</Text>
              <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>Tipo: {item.mediaType}</Text>
              <Text style={[styles.itemMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.imageUrl}
              </Text>
            </SurfaceCard>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  header: {
    gap: tokens.spacing.md,
  },
  heading: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  message: {
    fontSize: tokens.typography.body,
  },
  listContent: {
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
  },
  itemTitle: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: tokens.typography.caption,
  },
});
