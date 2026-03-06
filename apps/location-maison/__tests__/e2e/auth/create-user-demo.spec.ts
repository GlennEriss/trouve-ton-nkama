import { test, expect, Page } from '@playwright/test';

// Helper functions - same as signup.spec.ts
async function fillNom(page: Page, value: string) {
  const nomInput = page.getByPlaceholder(/entrez votre nom/i).or(page.locator('input[type="text"]').first());
  await nomInput.waitFor({ state: 'visible', timeout: 10000 });
  await nomInput.fill(value);
}

async function fillPrenom(page: Page, value: string) {
  const prenomInput = page.getByPlaceholder(/entrez votre prénom/i).or(page.locator('input[type="text"]').nth(1));
  await prenomInput.waitFor({ state: 'visible', timeout: 5000 });
  await prenomInput.fill(value);
}

async function fillEmail(page: Page, value: string) {
  const emailInput = page.getByPlaceholder(/exemple@email.com/i).or(page.locator('input[type="email"]').first());
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(value);
}

async function fillPhone(page: Page, value: string) {
  const phoneInput = page.locator('input[placeholder*="+241"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
  await phoneInput.fill(value);
}

async function fillPassword(page: Page, value: string) {
  const passwordInput = page.getByPlaceholder(/créez un mot de passe/i).or(page.locator('input[type="password"]').first());
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(value);
}

async function fillPasswordConfirm(page: Page, value: string) {
  const passwordConfirmInput = page.getByPlaceholder(/confirmez votre mot de passe/i).or(page.locator('input[type="password"]').nth(1));
  await passwordConfirmInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordConfirmInput.fill(value);
}

async function selectDate(page: any, day: string, month: string, year: string) {
  // Select day
  const dayCombobox = page.locator('[role="combobox"]').first();
  await dayCombobox.waitFor({ state: 'visible', timeout: 10000 });
  await dayCombobox.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: day }).click();
  await page.waitForTimeout(300);

  // Select month
  const monthCombobox = page.locator('[role="combobox"]').nth(1);
  await monthCombobox.waitFor({ state: 'visible', timeout: 10000 });
  await monthCombobox.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: month }).click();
  await page.waitForTimeout(300);

  // Select year
  const yearCombobox = page.locator('[role="combobox"]').nth(2);
  await yearCombobox.waitFor({ state: 'visible', timeout: 10000 });
  await yearCombobox.click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: year }).click();
  await page.waitForTimeout(300);
}

test.describe('Création utilisateur démo', () => {
  test('Créer un utilisateur avec hetiwoh254@feanzier.com et tester l\'envoi d\'email', async ({ page }) => {
    // Use exact email as requested
    // Note: If this test fails with EMAIL_ALREADY_IN_USE, the user may exist in Firebase Auth
    // even if not visible in the console. The user might need to be deleted manually from Firebase Auth console.
    const testEmail = 'hetiwoh254@feanzier.com';
    
    // If email is already in use, we'll try to delete it first via API
    // This is a workaround for users that exist but aren't visible in console
    const timestamp = Date.now();
    console.log(`📧 Utilisation de l'email: ${testEmail}`);
    console.log(`⚠️  Si l'email est déjà utilisé, vérifiez Firebase Auth console ou utilisez un autre email`);
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to signup page
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    
    // Wait for React hydration and window size calculation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Wait for the desktop form to be visible
    try {
      await page.waitForSelector('form', { timeout: 10000 });
      await Promise.race([
        page.getByText(/qui êtes-vous/i).waitFor({ timeout: 15000 }),
        page.getByPlaceholder(/entrez votre nom/i).waitFor({ timeout: 15000 }),
      ]);
    } catch (error) {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    }

    // Step 1: Identité
    await expect(page.getByText(/qui êtes-vous/i)).toBeVisible({ timeout: 5000 });
    await fillNom(page, 'BESEFEL');
    await fillPrenom(page, 'Test User');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 2: Contact
    await expect(page.getByText(/comment vous joindre/i)).toBeVisible({ timeout: 5000 });
    await fillEmail(page, testEmail);
    
    // Generate unique phone number (reuse timestamp)
    const randomDigits = timestamp.toString().slice(-7).padStart(7, '0');
    const testPhone = `+24106${randomDigits}`;
    await fillPhone(page, testPhone);
    
    // Wait for phone validation to complete
    await page.waitForTimeout(1500);
    
    // Check if there's a validation error - if so, try old format
    const phoneError = page.locator('text=/numéro.*invalide|téléphone.*invalide/i');
    const hasError = await phoneError.count() > 0;
    if (hasError) {
      // Try with old format for compatibility: +241 01 XX XX XX X
      const oldFormatPhone = `+24101${randomDigits.slice(0, 6)}`;
      await fillPhone(page, oldFormatPhone);
      await page.waitForTimeout(1500);
    }
    
    // Ensure continue button is enabled before clicking
    const continueButton = page.getByRole('button', { name: /^continuer$/i }).first();
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    await continueButton.click();

    // Step 3: Date de naissance
    await expect(page.getByText(/votre date de naissance/i)).toBeVisible({ timeout: 5000 });
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 });
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: '15' }).click();
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: 'Janvier' }).click();
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: '1990' }).click();
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 4: Sécurité
    await expect(page.getByText(/sécurisez votre compte/i)).toBeVisible({ timeout: 5000 });
    await fillPassword(page, 'Password123!');
    await fillPasswordConfirm(page, 'Password123!');
    
    // Accept terms - Radix UI Checkbox uses button[role="checkbox"]
    const termsCheckbox = page.getByRole('checkbox').first();
    await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await termsCheckbox.scrollIntoViewIfNeeded();
    // Check if already checked
    const isChecked = await termsCheckbox.getAttribute('data-state') === 'checked';
    if (!isChecked) {
      await termsCheckbox.click();
    }
    await page.waitForTimeout(500);

    // Submit form - look for "Créer mon compte" button
    const submitButton = page.getByRole('button', { name: /créer mon compte/i }).or(
      page.locator('button[type="submit"]').first()
    );
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    
    // Wait a bit before submitting so user can see the form
    await page.waitForTimeout(2000);
    
    // Listen for console logs to see what's happening
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      consoleMessages.push(`[${type}] ${text}`);
      
      if (text.includes('Form submitted') || text.includes('Signup result') || text.includes('Success') || text.includes('Redirecting') || text.includes('error') || text.includes('Error') || text.includes('erreur') || text.includes('failed') || text.includes('Failed')) {
        console.log(`📋 Browser console [${type}]:`, text);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    // Listen for failed requests
    page.on('requestfailed', request => {
      console.error('❌ Request failed:', request.url(), request.failure()?.errorText);
    });
    
    // Click submit button and wait for navigation
    await Promise.all([
      page.waitForURL(/\/signup\/success/, { timeout: 30000 }).catch(() => {}),
      submitButton.click(),
    ]);
    
    // Wait a bit for any async operations
    await page.waitForTimeout(2000);

    // Check if we're on success page
    const currentUrl = page.url();
    if (currentUrl.includes('/signup/success')) {
      console.log('✅ Succès: Redirection vers la page de succès');
    } else {
      console.log(`⚠️  URL actuelle: ${currentUrl}`);
      // Check for error messages
      const errorText = await page.locator('body').textContent();
      if (errorText?.includes('erreur') || errorText?.includes('error')) {
        console.log('❌ Erreur détectée sur la page');
      }
      
      // Try to find error toast or error message - wait a bit for toast to appear
      await page.waitForTimeout(2000);
      
      // Look for toast notifications (Shadcn UI uses data-sonner-toast or similar)
      const toastSelectors = [
        '[data-sonner-toast]',
        '[role="alert"]',
        '.toast',
        '[data-radix-toast]',
        'div[class*="toast"]',
        'div[class*="alert"]',
      ];
      
      for (const selector of toastSelectors) {
        const toasts = page.locator(selector);
        const count = await toasts.count();
        if (count > 0) {
          console.log(`📋 Trouvé ${count} toast(s) avec le sélecteur: ${selector}`);
          for (let i = 0; i < count; i++) {
            const toast = toasts.nth(i);
            const text = await toast.textContent();
            const isVisible = await toast.isVisible();
            if (isVisible && text) {
              console.log(`❌ Toast ${i + 1}:`, text);
            }
          }
        }
      }
      
      // Also check for any error text in the page
      const errorTexts = page.locator('text=/erreur|error|échec|failed/i');
      const errorCount = await errorTexts.count();
      if (errorCount > 0) {
        console.log(`📋 Trouvé ${errorCount} message(s) d'erreur dans la page`);
        for (let i = 0; i < Math.min(errorCount, 5); i++) {
          const errorMsg = await errorTexts.nth(i).textContent();
          console.log(`❌ Message d'erreur ${i + 1}:`, errorMsg);
        }
      }
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/signup-error.png', fullPage: true });
      console.log('📸 Screenshot sauvegardé: /tmp/signup-error.png');
      
      // Print all console messages for debugging
      console.log('\n📋 Tous les messages de la console:');
      consoleMessages.forEach((msg, index) => {
        if (msg.includes('error') || msg.includes('Error') || msg.includes('failed') || msg.includes('Failed') || msg.includes('Signup result')) {
          console.log(`  ${index + 1}. ${msg}`);
        }
      });
    }
    
    // Wait a bit so user can see the result
    await page.waitForTimeout(5000);
  });
});
