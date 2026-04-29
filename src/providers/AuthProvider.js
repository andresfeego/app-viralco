import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  forgotPasswordApi,
  loginApi,
  logoutApi,
  meApi,
  registerApi,
  resetPasswordApi,
  updateMyThemeApi,
} from '../services/api/auth';
import { confirmSuperAdminPasswordApi } from '../services/api/admin';
import { configureHttpAuth } from '../services/api/http';

const STORAGE_KEY = 'viralco_session_v1';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [superAdminConfirmationToken, setSuperAdminConfirmationToken] = useState(null);

  const accessTokenRef = useRef(null);
  const refreshTokenRef = useRef(null);

  const persistSession = useCallback(async (nextAccessToken, nextRefreshToken) => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: nextAccessToken, refreshToken: nextRefreshToken })
    );
  }, []);

  const clearSessionStorage = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const applyTokens = useCallback(
    async (nextAccessToken, nextRefreshToken) => {
      accessTokenRef.current = nextAccessToken;
      refreshTokenRef.current = nextRefreshToken;
      setAccessToken(nextAccessToken);
      setRefreshToken(nextRefreshToken);

      if (nextAccessToken && nextRefreshToken) {
        await persistSession(nextAccessToken, nextRefreshToken);
      } else {
        await clearSessionStorage();
      }
    },
    [clearSessionStorage, persistSession]
  );

  const clearSession = useCallback(async () => {
    setUser(null);
    setSuperAdminConfirmationToken(null);
    await applyTokens(null, null);
  }, [applyTokens]);

  useEffect(() => {
    configureHttpAuth({
      getAccessToken: () => accessTokenRef.current,
      getRefreshToken: () => refreshTokenRef.current,
      onTokensUpdated: async (nextAccessToken, nextRefreshToken) => {
        await applyTokens(nextAccessToken, nextRefreshToken);
      },
      onSessionInvalid: async () => {
        await clearSession();
      },
    });
  }, [applyTokens, clearSession]);

  const bootstrap = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed.accessToken || !parsed.refreshToken) {
        return;
      }

      await applyTokens(parsed.accessToken, parsed.refreshToken);
      const profile = await meApi();
      setUser(profile);
    } catch (error) {
      console.warn('[AuthProvider] bootstrap failed', error);
      await clearSession();
    }
  }, [applyTokens, clearSession]);

  useEffect(() => {
    (async () => {
      await bootstrap();
      setInitializing(false);
    })();
  }, [bootstrap]);

  const login = useCallback(
    async (email, password) => {
      const payload = await loginApi({ email, password });
      await applyTokens(payload.accessToken, payload.refreshToken);
      setUser(payload.user);
      setSuperAdminConfirmationToken(null);
      return payload;
    },
    [applyTokens]
  );

  const register = useCallback(async (email, password) => registerApi({ email, password }), []);

  const logout = useCallback(async () => {
    try {
      if (refreshTokenRef.current) {
        await logoutApi(refreshTokenRef.current);
      }
    } catch (error) {
      console.warn('[AuthProvider] logout API failed', error);
    }

    await clearSession();
  }, [clearSession]);

  const reloadMe = useCallback(async () => {
    const profile = await meApi();
    setUser(profile);
    return profile;
  }, []);

  const forgotPassword = useCallback(async (email) => forgotPasswordApi({ email }), []);

  const resetPassword = useCallback(
    async (token, newPassword) => resetPasswordApi({ token, newPassword }),
    []
  );

  const confirmSuperAdminPassword = useCallback(async (password) => {
    const payload = await confirmSuperAdminPasswordApi(password);
    setSuperAdminConfirmationToken(payload.confirmationToken || null);
    return payload;
  }, []);

  const updateThemeMode = useCallback(async (themeMode) => {
    const profile = await updateMyThemeApi(themeMode);
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(
    () => ({
      initializing,
      user,
      isAuthenticated: Boolean(accessToken && refreshToken),
      accessToken,
      refreshToken,
      superAdminConfirmationToken,
      login,
      register,
      logout,
      reloadMe,
      forgotPassword,
      resetPassword,
      confirmSuperAdminPassword,
      updateThemeMode,
    }),
    [
      accessToken,
      confirmSuperAdminPassword,
      forgotPassword,
      initializing,
      login,
      logout,
      refreshToken,
      register,
      reloadMe,
      resetPassword,
      superAdminConfirmationToken,
      updateThemeMode,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  }
  return context;
}
