import React from 'react';
import { useCan } from '../hooks/useCan';

export function ProtectedView({ permission, children, fallback = null }) {
  const allowed = useCan(permission);
  if (!allowed) {
    return fallback;
  }
  return <>{children}</>;
}
