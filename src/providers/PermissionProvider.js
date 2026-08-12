import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from './AuthProvider';
import { myPermissionsApi } from '../services/api/permissions';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { isAuthenticated, user } = useAuthContext();
  const [permissions, setPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated || !user || user.status?.slug !== 'active') {
        setPermissions([]);
        return;
      }

      setLoadingPermissions(true);
      try {
        const payload = await myPermissionsApi();
        setPermissions(Array.isArray(payload.permissions) ? payload.permissions : []);
      } catch (error) {
        console.warn('[PermissionProvider] permissions load failed', error);
        setPermissions([]);
      } finally {
        setLoadingPermissions(false);
      }
    })();
  }, [isAuthenticated, user]);

  const permissionSet = useMemo(() => new Set(permissions.map((item) => item.slug)), [permissions]);

  const value = useMemo(
    () => ({
      permissions,
      loadingPermissions,
      can: (slug) => permissionSet.has(slug),
    }),
    [loadingPermissions, permissionSet, permissions]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissionContext debe usarse dentro de PermissionProvider');
  }
  return context;
}
