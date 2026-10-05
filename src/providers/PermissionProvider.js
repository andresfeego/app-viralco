import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from './AuthProvider';
import { myPermissionsApi } from '../services/api/permissions';
import { recordClientTechnicalError } from '../services/errorHandling';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { isAuthenticated, user } = useAuthContext();
  const [permissions, setPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    let current = true;
    (async () => {
      if (!isAuthenticated || !user || user.status?.slug !== 'active') {
        setPermissions([]);
        return;
      }

      setLoadingPermissions(true);
      try {
        const payload = await myPermissionsApi();
        if (current) setPermissions(Array.isArray(payload.permissions) ? payload.permissions : []);
      } catch (error) {
        await recordClientTechnicalError({ code: 'PERMISSIONS_LOAD_FAILED', path: 'PermissionProvider.load', detail: error?.message || String(error) });
        if (current) setPermissions([]);
      } finally {
        if (current) setLoadingPermissions(false);
      }
    })();
    return () => { current = false; };
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
