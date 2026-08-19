/**
 * Liens institutionnels repris dans le pied de chaque publication Facebook.
 *
 * Valeurs alignées sur celles du site (src/components/footer/Footer.tsx). Elles sont dupliquées
 * ici parce que les Cloud Functions sont un paquet séparé qui n'importe pas le code Next.js —
 * à mettre à jour des deux côtés si elles changent.
 */
// La Page Facebook n'y figure volontairement pas : le post est publié dessus, y renvoyer le
// lecteur qui le lit n'aurait aucun sens.
export const SOCIAL_LINKS = {
  catalog: 'https://www.tonnkama.com/search',
  tiktok: 'https://www.tiktok.com/@tonnkama',
  whatsappChannel: 'https://whatsapp.com/channel/0029Vb8Pdzv3wtb4UbkmPX0z',
} as const;

/**
 * Pied de post, identique pour toutes les annonces.
 *
 * Facebook rend cliquables les URL présentes dans le texte, mais ne fabrique une carte
 * d'aperçu que pour le `link` de la publication — celui de l'annonce. Ces liens-ci restent
 * donc de simples lignes de texte, ce qui est le comportement voulu.
 */
export function buildSocialFooter(): string {
  return [
    `Pour plus d'annonces, visitez notre catalogue : ${SOCIAL_LINKS.catalog}`,
    '',
    'Abonnez-vous à nos réseaux :',
    `TikTok : ${SOCIAL_LINKS.tiktok}`,
    `Chaîne WhatsApp : ${SOCIAL_LINKS.whatsappChannel}`,
  ].join('\n');
}
