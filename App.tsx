import React, { useMemo, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { AppButton } from './src/design-system/components/AppButton';
import { getTheme } from './src/design-system/theme';
import { tokens, type ThemeMode } from './src/design-system/tokens';
import { PostsScreen } from './src/screens/PostsScreen';

type AppScreen = 'home' | 'posts';

function App() {
  const mode: ThemeMode = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = useMemo(() => getTheme(mode), [mode]);
  const [screen, setScreen] = useState<AppScreen>('home');

  if (screen === 'posts') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
        <PostsScreen mode={mode} onBack={() => setScreen('home')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Hello World</Text>
        <AppButton
          label="Post"
          onPress={() => setScreen('posts')}
          backgroundColor={theme.buttonBg}
          pressedColor={theme.buttonBgPressed}
          textColor={theme.buttonText}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.hero,
    fontWeight: '700',
  },
});

export default App;
