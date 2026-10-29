type Data = Record<string, unknown>;
export function isPendingListing(data: Data | undefined): boolean {
  if (!data || data.moderationStatus !== 'PENDING' || data.state === 'ARCHIVED') return false;
  // Les annonces classiques n'ont pas de paymentStatus. Les futures annonces payantes
  // ne doivent jamais entrer ici avant confirmation (sauf exemption admin explicite).
  return data.paymentStatus == null || ['confirmed', 'not_required'].includes(String(data.paymentStatus));
}
export function enteredModeration(before: Data | undefined, after: Data | undefined): boolean {
  return isPendingListing(after) && !isPendingListing(before);
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
export function moderationMessage(id: string, data: Data, submittedAt: string, adminUrl: string, path = '/dashboard/moderation') {
  const url = new URL(path, adminUrl);
  if (url.protocol !== 'https:') throw new Error('URL administrateur HTTPS requise');
  const title = String(data.title || 'Annonce sans titre').slice(0, 250);
  const text = `Une annonce attend votre modération.\n\n${title}\nRéférence : ${id}\nCatégorie : ${String(data.categoryId || data.typeProperty || 'Non renseignée')}\nSoumission : ${submittedAt}\n\nOuvrir la file administrateur : ${url.href}\nUne connexion administrateur est nécessaire.`;
  return { subject: 'Trouve Ton Nkama — annonce à modérer', text, html: `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p><a href="${escapeHtml(url.href)}">Ouvrir la modération</a>` };
}
