import { enteredModeration, moderationMessage } from '../../src/email/moderation-policy';
const pending = { moderationStatus: 'PENDING', state: 'IN_PROGRESS' };
describe('alerte administrateur', () => {
  it('détecte une création en attente', () => expect(enteredModeration(undefined, pending)).toBe(true));
  it('détecte une nouvelle soumission', () => expect(enteredModeration({ moderationStatus: 'REJECTED' }, pending)).toBe(true));
  it('ignore les modifications ordinaires', () => expect(enteredModeration(pending, { ...pending, title: 'modifié' })).toBe(false));
  it.each(['APPROVED', 'REJECTED', null])('ignore le statut %s', moderationStatus => expect(enteredModeration(undefined, { moderationStatus })).toBe(false));
  it('ignore la suppression', () => expect(enteredModeration(pending, undefined)).toBe(false));
  it('ignore les archives', () => expect(enteredModeration(undefined, { ...pending, state: 'ARCHIVED' })).toBe(false));
  it.each(['pending_confirmation', 'failed'])('ignore le paiement %s', paymentStatus => expect(enteredModeration(undefined, { ...pending, paymentStatus })).toBe(false));
  it('accepte la confirmation du paiement', () => expect(enteredModeration({ ...pending, paymentStatus: 'pending_confirmation' }, { ...pending, paymentStatus: 'confirmed' })).toBe(true));
  it('échappe le contenu utilisateur', () => {
    const message = moderationMessage('id', { title: '<script>"x"</script>' }, 'date', 'https://admin.example.com');
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.text).toContain('https://admin.example.com/dashboard/moderation');
  });
  it('refuse un lien non HTTPS', () => expect(() => moderationMessage('id', {}, 'date', 'http://example.com')).toThrow());
});
