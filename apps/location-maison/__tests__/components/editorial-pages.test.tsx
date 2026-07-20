import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';

import BlogPage, { metadata as blogMetadata } from '@/app/(public)/blog/page';
import ActualitesImmobilieresPage, {
  metadata as actualitesMetadata,
} from '@/app/(public)/blog/actualites-immobilieres-gabon-2024-2025/page';
import CommissionsDemarcheursPage, {
  metadata as commissionsMetadata,
} from '@/app/(public)/blog/commissions-demarcheurs-logements-gabon/page';
import ConseilsNegociationPage, {
  metadata as negociationMetadata,
} from '@/app/(public)/blog/conseils-negociation-immobiliere-gabon/page';
import DemarchesAdministrativesPage, {
  metadata as demarchesMetadata,
} from '@/app/(public)/blog/demarches-administratives-immobilier-gabon-2024/page';
import FinancementImmobilierPage, {
  metadata as financementMetadata,
} from '@/app/(public)/blog/financement-immobilier-gabon/page';
import GuideQuartiersLibrevillePage, {
  metadata as librevilleMetadata,
} from '@/app/(public)/blog/guide-quartiers-libreville-2024-2025/page';
import GuideQuartiersPortGentilPage, {
  metadata as portGentilMetadata,
} from '@/app/(public)/blog/guide-quartiers-port-gentil-2024-2025/page';
import PropTechInnovationPage, {
  metadata as proptechMetadata,
} from '@/app/(public)/blog/proptech-innovation-immobilier-gabon/page';
import RentabiliteImmobilierePage, {
  metadata as rentabiliteMetadata,
} from '@/app/(public)/blog/rentabilite-immobiliere-gabon-2024-2025/page';
import StructurerAnnoncesPage, {
  metadata as structurerMetadata,
} from '@/app/(public)/blog/structurer-annonces-engagement/page';
import TendancesMarchePage, {
  metadata as tendancesMetadata,
} from '@/app/(public)/blog/tendances-marche-immobilier-gabon-2024/page';
import GuideImmobilierPage, {
  metadata as guideMetadata,
} from '@/app/(public)/guide-immobilier-gabon/page';

type EditorialCase = {
  Component: ComponentType;
  metadata: { title?: unknown; description?: unknown };
  heading: RegExp;
  article: boolean;
};

const editorialCases: EditorialCase[] = [
  {
    Component: ActualitesImmobilieresPage,
    metadata: actualitesMetadata,
    heading: /actualit.s immobili.res.*gabon/i,
    article: true,
  },
  {
    Component: CommissionsDemarcheursPage,
    metadata: commissionsMetadata,
    heading: /commissions.*d.marcheurs.*gabon/i,
    article: true,
  },
  {
    Component: ConseilsNegociationPage,
    metadata: negociationMetadata,
    heading: /conseils.*n.gociation immobili.re.*gabon/i,
    article: true,
  },
  {
    Component: DemarchesAdministrativesPage,
    metadata: demarchesMetadata,
    heading: /d.marches administratives.*immobilier gabon/i,
    article: true,
  },
  {
    Component: FinancementImmobilierPage,
    metadata: financementMetadata,
    heading: /financement immobilier.*gabon/i,
    article: true,
  },
  {
    Component: GuideQuartiersLibrevillePage,
    metadata: librevilleMetadata,
    heading: /guide.*quartiers.*libreville/i,
    article: true,
  },
  {
    Component: GuideQuartiersPortGentilPage,
    metadata: portGentilMetadata,
    heading: /guide.*quartiers.*port-gentil/i,
    article: true,
  },
  {
    Component: PropTechInnovationPage,
    metadata: proptechMetadata,
    heading: /proptech.*innovation.*immobilier.*gabon/i,
    article: true,
  },
  {
    Component: RentabiliteImmobilierePage,
    metadata: rentabiliteMetadata,
    heading: /rentabilit. immobili.re.*gabon/i,
    article: true,
  },
  {
    Component: StructurerAnnoncesPage,
    metadata: structurerMetadata,
    heading: /structurer.*annonces.*engagement/i,
    article: true,
  },
  {
    Component: TendancesMarchePage,
    metadata: tendancesMetadata,
    heading: /tendances.*march. immobilier.*gabon/i,
    article: true,
  },
];

describe.each(editorialCases)('page editoriale $heading', ({ Component, metadata, heading, article }) => {
  it('publie des metadonnees SEO et un article navigable', () => {
    const { container } = render(<Component />);

    expect(String(metadata.title)).toMatch(/Trouve Ton Nkama/i);
    expect(String(metadata.title).length).toBeGreaterThan(40);
    expect(String(metadata.description).length).toBeGreaterThan(80);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    expect(container.querySelector('article') !== null).toBe(article);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(4);
    expect(links.every((link) => Boolean(link.getAttribute('href')))).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/search')).toBe(true);
  });
});

describe('index du blog', () => {
  it('presente le catalogue, les raccourcis SEO et les appels a action', () => {
    const { container } = render(<BlogPage />);

    expect(String(blogMetadata.title)).toMatch(/Blog Immobilier Gabon/i);
    expect(blogMetadata.alternates?.canonical).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: /blog immobilier gabon/i })).toBeVisible();
    expect(container.querySelectorAll('article').length).toBeGreaterThanOrEqual(10);
    expect(screen.getAllByRole('link', { name: /lire l'article complet/i }).length).toBeGreaterThanOrEqual(10);
    expect(screen.getByRole('link', { name: /maisons . louer au gabon/i })).toHaveAttribute(
      'href',
      '/immobilier/location/maison',
    );
    expect(screen.getByRole('link', { name: /voir les annonces/i })).toHaveAttribute('href', '/search');
    expect(screen.getByPlaceholderText(/votre adresse email/i)).toHaveAttribute('type', 'email');
  });
});

describe('guide immobilier', () => {
  it('rend les conseils, les raccourcis de recherche et une canonicale', () => {
    render(<GuideImmobilierPage />);

    expect(String(guideMetadata.title)).toMatch(/Guide Immobilier Gabon/i);
    expect(guideMetadata.alternates?.canonical).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: /guide immobilier gabon/i })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(7);
    expect(screen.getByRole('link', { name: /appartements . louer . libreville/i })).toHaveAttribute(
      'href',
      '/immobilier/location/appartement/libreville',
    );
    expect(screen.getByRole('link', { name: /voir les annonces/i })).toHaveAttribute('href', '/search');
  });
});
