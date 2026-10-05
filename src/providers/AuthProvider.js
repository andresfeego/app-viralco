import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
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
import { recordClientTechnicalError } from '../services/errorHandling';
import { loadSecureSession, saveSecureSession, clearSecureSession } from '../services/secureSession';
import { networkAvailable, setOfflineUser } from '../services/offlineCatalog';
import { primeOfflineCatalog } from '../services/primeOfflineCatalog';
import { syncOfflineOutbox } from '../services/syncOfflineOutbox';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [offlineMode, setOfflineMode] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [superAdminConfirmationToken, setSuperAdminConfirmationToken] = useState(null);

  const accessTokenRef = useRef(null);
  const refreshTokenRef = useRef(null);
  const userRef = useRef(null);
  const epoch = useRef(0);

  const persistSession = useCallback(async (nextAccessToken, nextRefreshToken) => {
    await saveSecureSession({ accessToken: nextAccessToken, refreshToken: nextRefreshToken, user: userRef.current });
  }, []);

  const clearSessionStorage = useCallback(async () => {
    await clearSecureSession();
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
    epoch.current += 1;
    userRef.current = null;
    setOfflineUser(null);
    setOfflineMode(true);
    setUser(null);
    setSuperAdminConfirmationToken(null);
    await applyTokens(null, null);
  }, [applyTokens]);

  const acceptProfile = useCallback(async profile => {
    userRef.current = profile;
    setOfflineUser(profile?.id);
    setUser(profile);
    await persistSession(accessTokenRef.current, refreshTokenRef.current);
  }, [persistSession]);

  const revalidate = useCallback(async () => {
    const currentEpoch = epoch.current;
    if (!accessTokenRef.current) return;
    if (!(await networkAvailable())) { setOfflineMode(true); return; }
    try {
      const profile = await meApi();
      if (currentEpoch !== epoch.current) return;
      await acceptProfile(profile);
      setOfflineMode(false);
      syncOfflineOutbox().catch(error => recordClientTechnicalError({ code: 'OFFLINE_OUTBOX_PENDING', detail: error.message }));
      primeOfflineCatalog().catch(error => recordClientTechnicalError({ code: 'OFFLINE_CATALOG_PENDING', detail: error.message }));
    } catch (error) {
      if (currentEpoch !== epoch.current) return;
      setOfflineMode(true);
      if ([401, 403].includes(error.status)) await clearSession();
      recordClientTechnicalError({ code: 'AUTH_REVALIDATE_PENDING', detail: error.message }).catch(() => {});
    }
  }, [acceptProfile, clearSession]);

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
      const parsed = await loadSecureSession();
      if (!parsed) {
        return;
      }

      if (!parsed.accessToken || !parsed.refreshToken) {
        return;
      }

      userRef.current = parsed.user || null;
      setUser(userRef.current);
      setOfflineUser(parsed.user?.id);
      await applyTokens(parsed.accessToken, parsed.refreshToken);
      if (parsed.user) revalidate();
      else await revalidate();
    } catch (error) {
      await recordClientTechnicalError({ code: 'AUTH_BOOTSTRAP_FAILED', path: 'AuthProvider.bootstrap', detail: error?.message || String(error) });
      // A transient network/storage failure must not destroy the saved identity.
    }
  }, [applyTokens, revalidate]);

  useEffect(() => {
    (async () => {
      try { await bootstrap(); } finally { setInitializing(false); }
    })();
  }, [bootstrap]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOfflineMode(true);
      if (state.isConnected && state.isInternetReachable !== false) revalidate();
    });
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') revalidate(); });
    return () => { unsubscribe(); foreground.remove(); };
  }, [revalidate]);

  const login = useCallback(
    async (email, password) => {
      const payload = await loginApi({ email, password });
      epoch.current += 1;
      userRef.current = payload.user;
      setOfflineUser(payload.user?.id);
      await applyTokens(payload.accessToken, payload.refreshToken);
      setUser(payload.user);
      setOfflineMode(false);
      syncOfflineOutbox().catch(error => recordClientTechnicalError({ code: 'OFFLINE_OUTBOX_PENDING', detail: error.message }));
      setSuperAdminConfirmationToken(null);
      primeOfflineCatalog().catch(error => recordClientTechnicalError({ code: 'OFFLINE_CATALOG_PENDING', detail: error.message }));
      return payload;
    },
    [applyTokens]
  );

  const register = useCallback(async (input) => registerApi(input), []);

  const logout = useCallback(async () => {
    const token = refreshTokenRef.current;
    const request = token ? logoutApi(token).catch(error => recordClientTechnicalError({ code: 'AUTH_LOGOUT_FAILED', detail: error.message })) : Promise.resolve();
    await clearSession();
    await request;

  }, [clearSession]);

  const reloadMe = useCallback(async () => {
    const profile = await meApi();
    await acceptProfile(profile);
    return profile;
  }, [acceptProfile]);

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
    await acceptProfile(profile);
    return profile;
  }, [acceptProfile]);

  const value = useMemo(
    () => ({
      initializing,
      offlineMode,
      user,
      isAuthenticated: Boolean(user && accessToken && refreshToken),
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
      offlineMode,
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
