import { routes } from '@/constantes/routes';

const PROPERTY_MODIFY_ROUTE_PREFIX = '/property/modify/';

export function isPropertyFormFlowPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  return (
    pathname === routes.protected.add_property ||
    pathname.startsWith(`${routes.protected.add_property}/`) ||
    // Formulaire assisté par IA : c'est aussi un parcours de création
    // d'annonce, il doit bénéficier du même hard-stop publicitaire que
    // l'ancien formulaire (il en était absent).
    pathname === routes.protected.add_property_ai ||
    pathname.startsWith(`${routes.protected.add_property_ai}/`) ||
    pathname.startsWith(PROPERTY_MODIFY_ROUTE_PREFIX)
  );
}
