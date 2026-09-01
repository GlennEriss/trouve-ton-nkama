import { routes } from '@/constantes/routes';

export function isPropertyFormFlowPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  return (
    pathname === routes.protected.add_property ||
    pathname.startsWith(`${routes.protected.add_property}/`) ||
    // Formulaire assisté par IA : c'est aussi un parcours de création d'annonce, il doit
    // bénéficier du même hard-stop publicitaire que l'ancien formulaire (il en était absent).
    // Couvre aussi /property/create/preview/[id] (édition immobilier + Mode) : même préfixe
    // add_property_ai ('/property/create') — /property/modify/[id] (ancien formulaire à 14
    // builders, prefix dédié ici avant) a été retiré, voir BUGS-PROPERTY-E2E-2026-08.md.
    pathname === routes.protected.add_property_ai ||
    pathname.startsWith(`${routes.protected.add_property_ai}/`)
  );
}
