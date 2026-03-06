import { routes } from '@/constantes/routes';
import type { Role } from '@/models/authentication';

type UserWithRoles = {
  roles?: ReadonlyArray<Role | string> | null;
} | null | undefined;

export const DEFAULT_AUTHENTICATED_ROUTE = routes.public.search_property;

export function hasRole(user: UserWithRoles, role: Role): boolean {
  if (!Array.isArray(user?.roles)) {
    return false;
  }

  return user.roles.includes(role);
}

export function isAnnouncer(user: UserWithRoles): boolean {
  return hasRole(user, 'Announcer');
}

export function getPostAuthRedirectPath(user: UserWithRoles): string {
  if (isAnnouncer(user)) {
    return routes.protected.properties;
  }

  return DEFAULT_AUTHENTICATED_ROUTE;
}
