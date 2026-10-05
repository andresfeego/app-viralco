import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ProfileScreen } from './ProfileScreen';

export function ConfigurationScreen() {
  const { logout } = useAuth();
  return <ProfileScreen onLogout={logout} />;
}
