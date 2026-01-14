/**
 * Signup E2E Tests
 * 
 * End-to-end tests for the user registration flow.
 * Tests the complete signup process from UI to database.
 */

import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signup page and wait for it to load
    await page.goto('/signup');
    // Wait for the form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('should display signup form on desktop', async ({ page }) => {
    // Check for form elements - look for step 1 title
    await expect(page.getByText(/qui êtes-vous/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^nom$/i)).toBeVisible();
    await expect(page.getByLabel(/^prénom$/i)).toBeVisible();
  });

  test('should complete step 1: Identity', async ({ page }) => {
    // Fill identity fields
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');

    // Click continue
    await page.getByRole('button', { name: /continuer/i }).click();

    // Should navigate to step 2
    await expect(page.getByText(/comment vous joindre/i)).toBeVisible({ timeout: 5000 });
  });

  test('should complete step 2: Contact', async ({ page }) => {
    // Step 1
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 2
    await expect(page.getByText(/comment vous joindre/i)).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/adresse email/i).fill('test-e2e@example.com');
    
    // Phone number (simplified - actual implementation may vary)
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="+241"]').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill('+24101234567');
    }

    await page.getByRole('button', { name: /continuer/i }).click();

    // Should navigate to step 3
    await expect(page.getByText(/date de naissance/i)).toBeVisible({ timeout: 5000 });
  });

  test('should complete step 3: Birth Date', async ({ page }) => {
    // Step 1
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 2
    await page.getByLabel(/adresse email/i).fill('test-e2e@example.com');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 3 - Wait for date select to be visible
    await expect(page.getByText(/date de naissance/i)).toBeVisible({ timeout: 5000 });
    
    // Select birth date - try to find and interact with date selectors
    // This depends on the actual DateSelect implementation
    const daySelect = page.locator('select, [role="combobox"]').first();
    if (await daySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await daySelect.selectOption({ label: '01' });
    }

    // Continue even if date not selected (optional field)
    await page.getByRole('button', { name: /continuer/i }).click();

    // Should navigate to step 4
    await expect(page.getByText(/sécurisez votre compte/i)).toBeVisible({ timeout: 5000 });
  });

  test('should complete step 4: Security and submit', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-e2e-${timestamp}@example.com`;
    const testPhone = `+2410${timestamp.toString().slice(-7)}`;

    // Step 1
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 2
    await page.getByLabel(/adresse email/i).fill(testEmail);
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="+241"]').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill(testPhone);
    }
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 3 - Skip date selection for now (would need proper implementation)
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 4
    await expect(page.getByText(/sécurisez votre compte/i)).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/^mot de passe$/i).first().fill('Password123!');
    await page.getByLabel(/confirmez le mot de passe/i).fill('Password123!');
    
    // Accept terms - find checkbox by label text
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await termsCheckbox.check();

    // Submit - ButtonApp might have title attribute
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show success or redirect
    await expect(
      page.getByText(/succès|bienvenue|votre compte a été créé/i)
    ).toBeVisible({ timeout: 15000 });
  });

  test('should show validation errors for invalid fields', async ({ page }) => {
    // Try to continue without filling fields
    const continueButton = page.getByRole('button', { name: /continuer/i });
    await expect(continueButton).toBeDisabled({ timeout: 2000 });

    // Fill only one field
    await page.getByLabel(/^nom$/i).fill('Doe');
    // Still should be disabled (prénom missing)
    await expect(continueButton).toBeDisabled({ timeout: 2000 });
  });

  test('should show error for duplicate email', async ({ page }) => {
    // Use an email that might already exist
    const existingEmail = 'existing@example.com';

    // Navigate through steps
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();

    await page.getByLabel(/adresse email/i).fill(existingEmail);
    await page.getByRole('button', { name: /continuer/i }).click();

    // Continue through remaining steps and submit
    await page.getByRole('button', { name: /continuer/i }).click(); // Step 3
    await page.getByLabel(/^mot de passe$/i).first().fill('Password123!');
    await page.getByLabel(/confirmez le mot de passe/i).fill('Password123!');
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await termsCheckbox.check();
    await page.locator('button[type="submit"]').first().click();

    // Should show error message
    await expect(
      page.getByText(/email.*déjà.*utilisé|email.*already.*use|déjà.*enregistré/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate back to previous step', async ({ page }) => {
    // Step 1
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 2
    await expect(page.getByText(/comment vous joindre/i)).toBeVisible({ timeout: 5000 });

    // Go back
    await page.getByRole('button', { name: /retour/i }).click();

    // Should be back on step 1
    await expect(page.getByText(/qui êtes-vous/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle Google sign in', async ({ page, context }) => {
    // Wait for Google button - might be in different format
    const googleButton = page.locator('button').filter({ hasText: /google/i }).first();
    await expect(googleButton).toBeVisible({ timeout: 5000 });

    // Click Google button (will redirect to OAuth)
    await googleButton.click();

    // Should redirect to Google OAuth or show loading
    // This test may need adjustment based on actual OAuth flow
    await page.waitForURL(/google|oauth|accounts\.google/i, { timeout: 5000 }).catch(() => {
      // OAuth might open in popup, which is fine
    });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for page to adjust
    await page.waitForTimeout(500);

    // Should show mobile layout - look for step 1 title
    await expect(page.getByText(/qui êtes-vous/i)).toBeVisible({ timeout: 5000 });
    
    // Form should still be functional
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
  });
});

test.describe('Signup Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Invalid email
    await page.getByLabel(/adresse email/i).fill('invalid-email');
    await page.getByLabel(/adresse email/i).blur();

    // Should show validation error
    await expect(
      page.getByText(/email.*valide|email.*valid|format.*email/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate password strength', async ({ page }) => {
    // Navigate to step 4
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();
    await page.getByLabel(/adresse email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continuer/i }).click();
    await page.getByRole('button', { name: /continuer/i }).click();

    // Weak password
    await page.getByLabel(/^mot de passe$/i).first().fill('weak');
    await page.getByLabel(/^mot de passe$/i).first().blur();

    // Should show validation error
    await expect(
      page.getByText(/mot de passe.*faible|password.*weak|au moins.*caractères/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate password confirmation match', async ({ page }) => {
    // Navigate to step 4
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();
    await page.getByLabel(/adresse email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continuer/i }).click();
    await page.getByRole('button', { name: /continuer/i }).click();

    // Mismatched passwords
    await page.getByLabel(/^mot de passe$/i).first().fill('Password123!');
    await page.getByLabel(/confirmez le mot de passe/i).fill('DifferentPassword123!');
    await page.getByLabel(/confirmez le mot de passe/i).blur();

    // Should show validation error
    await expect(
      page.getByText(/mots de passe.*correspondent|passwords.*match|ne correspondent pas/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should require terms acceptance', async ({ page }) => {
    // Navigate to step 4 and fill all fields
    await page.getByLabel(/^nom$/i).fill('Doe');
    await page.getByLabel(/^prénom$/i).fill('John');
    await page.getByRole('button', { name: /continuer/i }).click();
    await page.getByLabel(/adresse email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continuer/i }).click();
    await page.getByRole('button', { name: /continuer/i }).click();

    await page.getByLabel(/^mot de passe$/i).first().fill('Password123!');
    await page.getByLabel(/confirmez le mot de passe/i).fill('Password123!');

    // Don't check terms checkbox
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Submit button should be disabled or show error
    await expect(submitButton).toBeDisabled({ timeout: 2000 });
  });
});
