import { TriangleAlert } from 'lucide-react';

export default function QuickListingSafetyNotice() {
  return (
    <aside aria-label="Précautions avant tout engagement" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <h2 className="flex items-center gap-2 font-semibold"><TriangleAlert aria-hidden="true" className="h-5 w-5 shrink-0" />Avant tout engagement</h2>
      <p className="mt-3">Ces annonces sont publiées sans photos. Prenez le temps de vérifier le bien et votre interlocuteur.</p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Visitez le logement ou le terrain avant tout paiement.</li>
        <li>Ne versez aucun acompte ni dépôt pour réserver une visite avant d’avoir visité le bien.</li>
        <li>Vérifiez l’identité de votre interlocuteur et son droit de proposer le bien.</li>
        <li>Avant de verser un loyer ou une caution, exigez un contrat de bail et un justificatif de paiement.</li>
      </ul>
      <p className="mt-3 text-sm">La publication sur la plateforme ne garantit pas la fiabilité d’une offre. Ces précautions s’appliquent aussi aux annonces avec photos.</p>
    </aside>
  );
}
