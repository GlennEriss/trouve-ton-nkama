import { auth } from '@/next-auth/auth';
import { redirect } from 'next/navigation';
import { isAnnouncer } from '@/lib/auth/role-routing';
import { routes } from '@/constantes/routes';
import QuickListingForm from '@/components/quick-listings/QuickListingForm';

export const metadata = { title: 'Créer une annonce rapide — Trouve Ton Nkama', robots: { index: false, follow: false } };
export default async function Page() {
  const session = await auth();
  if (!session?.user?.uid) redirect(`${routes.public.signin}?callbackUrl=${encodeURIComponent(routes.protected.quick_listing_publish)}`);
  if (!isAnnouncer(session.user)) redirect(routes.protected.become_announcer);
  return <QuickListingForm key={session.user.uid} />;
}
