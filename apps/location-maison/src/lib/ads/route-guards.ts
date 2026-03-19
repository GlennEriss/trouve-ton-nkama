import { routes } from '@/constantes/routes';

const PROPERTY_MODIFY_ROUTE_PREFIX = '/property/modify/';

export function isPropertyFormFlowPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  return (
    pathname === routes.protected.add_property ||
    pathname.startsWith(`${routes.protected.add_property}/`) ||
    pathname.startsWith(PROPERTY_MODIFY_ROUTE_PREFIX)
  );
}
