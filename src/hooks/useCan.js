import { usePermissionContext } from '../providers/PermissionProvider';

export function useCan(permissionSlug) {
  const { can } = usePermissionContext();
  return can(permissionSlug);
}
