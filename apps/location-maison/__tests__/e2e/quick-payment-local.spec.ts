import { test, expect } from '@playwright/test';

// Parcours navigateur uniquement : MyPayGa/API de paiement simulés, aucune écriture distante.
test('visiteur : saisie, paiement, confirmation puis reprise sans second débit', async ({ page }, info) => {
  const location = (name: string, type: string) => ({ name, type, lat: 0, lon: 9, osmId: 1, osmType: 'node', source: 'places' });
  await page.route('**/api/location/osm/gabon', route => route.fulfill({ json: { success: true, data: {
    provinces: [location('Estuaire', 'province')], cities: [location('Libreville', 'city')], quarters: [location('Nzeng-Ayong', 'quarter')],
    cityToProvince: { Libreville: 'Estuaire' }, quarterToCity: { 'Nzeng-Ayong': 'Libreville' }, quarterToProvince: { 'Nzeng-Ayong': 'Estuaire' },
  } } }));
  let initiations = 0;
  await page.route('**/api/quick-listings/initiate', async route => {
    ++initiations;
    expect(route.request().postDataJSON().draft.description).toContain('TEST NAVIGATEUR');
    await route.fulfill({ status: 202, json: { transactionId: 'test-browser-only' } });
  });
  await page.route('**/api/quick-listings/payments/status', route => route.fulfill({ json: { status: 'confirmed', transactionId: 'test-browser-only' } }));
  await page.goto('/annonces-rapides/publier', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Texte de l’annonce').fill('TEST NAVIGATEUR — Studio à louer 100 000 FCFA. Aucune publication réelle.');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  for (const [group, value] of [['Province', 'Estuaire'], ['Ville', 'Libreville'], ['Quartier', 'Nzeng-Ayong']]) {
    await page.getByRole('group', { name: group, exact: true }).getByRole('combobox').click();
    await page.getByRole('option', { name: value, exact: true }).click();
  }
  await page.locator('input[type="tel"]').fill('066123456');
  await page.getByRole('button', { name: 'Vérifier mon annonce' }).click();
  await page.getByRole('button', { name: 'Payer 200 FCFA et soumettre' }).click();
  await page.getByLabel('Numéro Mobile Money du payeur').fill('074000000');
  await page.screenshot({ path: info.outputPath('payment-dialog.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Confirmer le paiement de 200 FCFA' }).click();
  await expect(page.getByRole('heading', { name: 'Paiement confirmé !' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Paiement de l’annonce' }).getByRole('status')).toContainText('soumise à la modération');
  expect(initiations).toBe(1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Paiement de l’annonce' }).getByRole('status')).toContainText('soumise à la modération');
  expect(initiations).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
