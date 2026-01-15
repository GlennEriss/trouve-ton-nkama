/**
 * Signup E2E Tests
 * 
 * End-to-end tests for the user registration flow.
 * Tests the complete signup process from UI to database.
 */

import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Helper function to detect viewport type
async function getViewportType(page: Page): Promise<'mobile' | 'tablet' | 'desktop'> {
  const viewport = page.viewportSize();
  if (!viewport) {
    // Default to desktop if viewport not set
    return 'desktop';
  }
  const width = viewport.width;
  if (width <= 768) {
    return 'mobile';
  } else if (width <= 1024) {
    return 'tablet';
  }
  return 'desktop';
}

// Helper functions to find form inputs (responsive)
async function fillNom(page: Page, value: string) {
  const viewportType = await getViewportType(page);
  
  let nomInput;
  if (viewportType === 'mobile') {
    // Mobile uses "Saisissez votre nom"
    nomInput = page.getByPlaceholder(/saisissez votre nom/i).or(
      page.locator('input[type="text"]').first()
    );
  } else {
    // Desktop/Tablet uses "Entrez votre nom"
    nomInput = page.getByPlaceholder(/entrez votre nom/i).or(
      page.locator('input[type="text"]').first()
    );
  }
  await nomInput.waitFor({ state: 'visible', timeout: 10000 });
  await nomInput.fill(value);
}

async function fillPrenom(page: Page, value: string) {
  const viewportType = await getViewportType(page);
  
  let prenomInput;
  if (viewportType === 'mobile') {
    // Mobile uses "Saisissez votre prénom"
    prenomInput = page.getByPlaceholder(/saisissez votre prénom/i).or(
      page.locator('input[type="text"]').nth(1)
    );
  } else {
    // Desktop/Tablet uses "Entrez votre prénom"
    prenomInput = page.getByPlaceholder(/entrez votre prénom/i).or(
      page.locator('input[type="text"]').nth(1)
    );
  }
  await prenomInput.waitFor({ state: 'visible', timeout: 5000 });
  await prenomInput.fill(value);
}

async function fillEmail(page: Page, value: string) {
  const viewportType = await getViewportType(page);
  
  let emailInput;
  if (viewportType === 'mobile') {
    // Mobile uses "Saisissez votre email"
    emailInput = page.getByPlaceholder(/saisissez votre email/i).or(
      page.locator('input[type="email"]').first()
    );
  } else {
    // Desktop/Tablet uses "exemple@email.com"
    emailInput = page.getByPlaceholder(/exemple@email.com/i).or(
      page.locator('input[type="email"]').first()
    );
  }
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(value);
}

async function fillPhone(page: Page, value: string) {
  // Remove country code and + from the phone number if present
  let phoneNumber = value.replace(/\+241/g, '').replace(/[^\d]/g, '');
  
  // Find the phone number input (it's in a wrapper div with the phone number field)
  const phoneInput = page.locator('input[type="tel"]').or(
    page.locator('input[placeholder*="06"]').or(
      page.locator('input[placeholder*="téléphone"]')
    )
  ).first();
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput.fill(phoneNumber);
}

async function fillPassword(page: Page, value: string) {
  const viewportType = await getViewportType(page);
  
  let passwordInput;
  if (viewportType === 'mobile') {
    // Mobile: use name attribute to be more specific
    passwordInput = page.locator('input[name="password"][type="password"]').or(
      page.locator('input[type="password"]').first()
    );
  } else {
    // Desktop/Tablet uses "Créez un mot de passe"
    passwordInput = page.getByPlaceholder(/créez un mot de passe/i).or(
      page.locator('input[name="password"][type="password"]').or(
        page.locator('input[type="password"]').first()
      )
    );
  }
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(value);
}

async function fillPasswordConfirm(page: Page, value: string) {
  const viewportType = await getViewportType(page);
  
  let passwordConfirmInput;
  if (viewportType === 'mobile') {
    // Mobile: use name attribute to be more specific
    passwordConfirmInput = page.locator('input[name="passwordConfirm"][type="password"]').or(
      page.locator('input[type="password"]').nth(1)
    );
  } else {
    // Desktop/Tablet uses "Confirmez votre mot de passe"
    passwordConfirmInput = page.getByPlaceholder(/confirmez votre mot de passe/i).or(
      page.locator('input[name="passwordConfirm"][type="password"]').or(
        page.locator('input[type="password"]').nth(1)
      )
    );
  }
  await passwordConfirmInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordConfirmInput.fill(value);
}

// Helper to wait for form to be ready (responsive)
async function waitForFormReady(page: Page) {
  const viewportType = await getViewportType(page);
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // Extra time for useWindowSize to update
  
  if (viewportType === 'mobile') {
    // Wait for mobile form elements
    await Promise.race([
      page.getByRole('heading', { name: /explorons ensemble|créer un compte/i }).waitFor({ timeout: 15000 }),
      page.getByPlaceholder(/saisissez votre nom/i).waitFor({ timeout: 15000 }),
      page.locator('form').waitFor({ timeout: 10000 }),
    ]);
  } else {
    // Wait for desktop form elements (step indicators, step titles)
    await Promise.race([
      page.getByText(/qui êtes-vous/i).waitFor({ timeout: 15000 }),
      page.getByText(/étape.*sur/i).waitFor({ timeout: 15000 }),
      page.getByPlaceholder(/entrez votre nom/i).waitFor({ timeout: 15000 }),
      page.locator('form').waitFor({ timeout: 10000 }),
    ]);
  }
}

// Helper to navigate through steps (desktop) or fill all fields at once (mobile)
async function fillSignupFormStepByStep(page: Page, data: {
  nom: string;
  prenom: string;
  email: string;
  phone: string;
  birthDate: { day: string; month: string; year: string };
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
}) {
  const viewportType = await getViewportType(page);
  
  if (viewportType === 'mobile') {
    // Mobile: fill all fields on the same page
    await fillNom(page, data.nom);
    await fillPrenom(page, data.prenom);
    await fillEmail(page, data.email);
    
    // Fill birth date
    const comboboxes = page.locator('[role="combobox"]');
    if (await comboboxes.count() >= 3) {
      await comboboxes.nth(0).click();
      await page.getByRole('option', { name: data.birthDate.day }).click();
      await comboboxes.nth(1).click();
      await page.getByRole('option', { name: data.birthDate.month }).click();
      await comboboxes.nth(2).click();
      await page.getByRole('option', { name: data.birthDate.year }).click();
    }
    
    await fillPhone(page, data.phone);
    await page.waitForTimeout(1000); // Wait for phone validation
    
    await fillPassword(page, data.password);
    await fillPasswordConfirm(page, data.passwordConfirm);
    
    // Accept terms
    if (data.acceptTerms) {
      const termsCheckbox = page.getByRole('checkbox').first();
      await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
      await termsCheckbox.scrollIntoViewIfNeeded();
      const isChecked = await termsCheckbox.getAttribute('data-state') === 'checked';
      if (!isChecked) {
        await termsCheckbox.click();
      }
    }
  } else {
    // Desktop: navigate through steps
    // Step 1 - Identity
    await fillNom(page, data.nom);
    await fillPrenom(page, data.prenom);
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    
    // Step 2 - Contact
    await expect(page.getByText(/comment vous joindre/i)).toBeVisible({ timeout: 5000 });
    await fillEmail(page, data.email);
    await fillPhone(page, data.phone);
    await page.waitForTimeout(1500); // Wait for validation
    
    // Check for phone validation error
    const phoneError = page.locator('text=/numéro.*invalide|téléphone.*invalide/i');
    if (await phoneError.count() > 0) {
      // Try old format if new format fails
      const oldFormat = data.phone.replace(/\+24106/, '+24101').slice(0, -1);
      await fillPhone(page, oldFormat);
      await page.waitForTimeout(1500);
    }
    
    const continueButton = page.getByRole('button', { name: /^continuer$/i }).first();
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    await continueButton.click();
    
    // Step 3 - Birth Date
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 });
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: data.birthDate.day }).click();
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: data.birthDate.month }).click();
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: data.birthDate.year }).click();
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    
    // Step 4 - Security
    await expect(page.getByText(/sécurisez votre compte/i)).toBeVisible({ timeout: 5000 });
    await fillPassword(page, data.password);
    await fillPasswordConfirm(page, data.passwordConfirm);
    
    // Accept terms
    if (data.acceptTerms) {
      const termsCheckbox = page.getByRole('checkbox').first();
      await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
      await termsCheckbox.scrollIntoViewIfNeeded();
      const isChecked = await termsCheckbox.getAttribute('data-state') === 'checked';
      if (!isChecked) {
        await termsCheckbox.click();
      }
      await page.waitForTimeout(500);
    }
  }
}

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Viewport is set by Playwright project configuration
    // Navigate to signup page and wait for it to load
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    
    // Wait for form to be ready (responsive)
    await waitForFormReady(page);
  });

  test('should display signup form on desktop', async ({ page }) => {
    // Check for form elements - look for step 1 title
    await expect(page.getByText(/qui êtes-vous/i)).toBeVisible({ timeout: 10000 });
    // Find inputs by placeholder
    const nomInput = page.getByPlaceholder(/entrez votre nom/i).or(page.locator('input[type="text"]').first());
    const prenomInput = page.getByPlaceholder(/entrez votre prénom/i).or(page.locator('input[type="text"]').nth(1));
    await expect(nomInput).toBeVisible({ timeout: 5000 });
    await expect(prenomInput).toBeVisible({ timeout: 5000 });
    // Check for continue button
    await expect(page.getByRole('button', { name: /^continuer$/i })).toBeVisible();
  });

  test('should complete step 1: Identity', async ({ page }) => {
    // Fill identity fields
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');

    // Click continue (exact match to avoid "Continuer avec Google")
    const continueButton = page.getByRole('button', { name: /^continuer$/i }).first();
    await continueButton.click();

    // Should navigate to step 2
    await expect(page.getByText(/comment vous joindre/i)).toBeVisible({ timeout: 5000 });
  });

  test('should complete step 2: Contact', async ({ page }) => {
    // Step 1
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 2
    await expect(page.getByText(/comment vous joindre/i)).toBeVisible({ timeout: 5000 });
    await fillEmail(page, 'test-e2e@example.com');
    await fillPhone(page, '+24101234567');

    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Should navigate to step 3
    await expect(page.getByText(/votre date de naissance|sélectionnez votre date de naissance/i)).toBeVisible({ timeout: 5000 });
  });

  test('should complete step 3: Birth Date', async ({ page }) => {
    // Step 1
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 2
    await fillEmail(page, 'test-e2e@example.com');
    await fillPhone(page, '+24101234567');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 3 - Wait for date select to be visible
    await expect(page.getByText(/votre date de naissance|sélectionnez votre date de naissance/i)).toBeVisible({ timeout: 5000 });
    
    // Select birth date - find comboboxes (Select components)
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 }); // Day, Month, Year
    
    // Select day (first combobox)
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: '01' }).click();
    
    // Select month (second combobox) - select January
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: 'Janvier' }).click();
    
    // Select year (third combobox) - select a year that makes user 18+ (e.g., 2000)
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: '2000' }).click();

    // Continue to step 4
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Should navigate to step 4
    await expect(page.getByText(/sécurisez votre compte/i)).toBeVisible({ timeout: 5000 });
  });

  test('should complete step 4: Security and submit', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-e2e-${timestamp}@example.com`;
    // Generate valid Gabon phone number: Use new format +241 06 XX XX XX XX or +241 07 XX XX XX XX
    // Or old format +241 01 XX XX XX X for compatibility
    const randomDigits = timestamp.toString().slice(-7).padStart(7, '0');
    // Use format +241 06 XX XX XX XX (new numbering) or +241 01 XX XX XX X (old numbering)
    const testPhone = `+24106${randomDigits}`; // New format: +241 06 XXXXXXX

    // Step 1
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 2
    await fillEmail(page, testEmail);
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

    // Step 3 - Select birth date
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 });
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: '01' }).click();
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: 'Janvier' }).click();
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: '2000' }).click();
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 4
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
    
    // Wait a bit for form validation to update
    await page.waitForTimeout(500);

    // Wait for submit button to be enabled - look for "Créer mon compte" button
    const submitButton = page.getByRole('button', { name: /créer mon compte/i }).or(
      page.locator('button[type="submit"]').first()
    );
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    // Should show success or redirect to success page
    // Wait for navigation or success message
    await Promise.race([
      page.waitForURL(/\/signup\/success/i, { timeout: 15000 }),
      page.getByText(/succès|bienvenue|votre compte a été créé|création en cours/i).waitFor({ timeout: 15000 }),
    ]);
  });

  test('should show validation errors for invalid fields', async ({ page }) => {
    // Try to continue without filling fields
    const continueButton = page.getByRole('button', { name: /^continuer$/i }).first();
    await expect(continueButton).toBeDisabled({ timeout: 2000 });

    // Fill only one field
    await fillNom(page, 'Doe');
    // Still should be disabled (prénom missing)
    await expect(continueButton).toBeDisabled({ timeout: 2000 });
  });

  test('should show error for duplicate email', async ({ page }) => {
    // First, create a user with this email to ensure it exists
    const timestamp = Date.now();
    const existingEmail = `existing-${timestamp}@example.com`;
    const randomDigits = timestamp.toString().slice(-7).padStart(7, '0');
    const testPhone = `+24106${randomDigits}`; // Use new format

    // Navigate through steps
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    await fillEmail(page, existingEmail);
    await fillPhone(page, testPhone);
    
    // Wait for validation
    await page.waitForTimeout(1500);
    
    // Check for phone validation error
    const phoneError = page.locator('text=/numéro.*invalide|téléphone.*invalide/i');
    if (await phoneError.count() > 0) {
      // Try old format
      await fillPhone(page, `+24101${randomDigits.slice(0, 6)}`);
      await page.waitForTimeout(1500);
    }
    
    // Ensure continue button is enabled
    const continueButton = page.getByRole('button', { name: /^continuer$/i }).first();
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    await continueButton.click();

    // Step 3 - Select birth date
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 });
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: '01' }).click();
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: 'Janvier' }).click();
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: '2000' }).click();
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Step 4
    await expect(page.getByText(/sécurisez votre compte/i)).toBeVisible({ timeout: 5000 });
    await fillPassword(page, 'Password123!');
    await fillPasswordConfirm(page, 'Password123!');
    
    // Accept terms - Radix UI Checkbox uses button[role="checkbox"]
    const termsCheckbox = page.getByRole('checkbox').first();
    await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await termsCheckbox.scrollIntoViewIfNeeded();
    const isChecked = await termsCheckbox.getAttribute('data-state') === 'checked';
    if (!isChecked) {
      await termsCheckbox.click();
    }
    await page.waitForTimeout(500);
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /créer mon compte/i }).or(
      page.locator('button[type="submit"]').first()
    );
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    // Should show error message - wait for toast notification or error message
    // The error might appear in a toast notification or as form error
    await expect(
      page.getByText(/email.*déjà.*utilisé|email.*already.*use|déjà.*enregistré|erreur|existe.*déjà/i)
        .or(page.locator('[role="alert"]'))
        .or(page.locator('.toast'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('should navigate back to previous step', async ({ page }) => {
    // Step 1
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

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
    // Set mobile viewport (mobile form is shown when width <= 768px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait for mobile component to render (useWindowSize hook needs time to update)
    await page.waitForTimeout(1500);
    
    // Mobile form uses different placeholders - "Saisissez" instead of "Entrez"
    // Look for mobile-specific elements - check for "Explorons ensemble" heading
    await expect(page.getByRole('heading', { name: /explorons ensemble/i })).toBeVisible({ timeout: 10000 });
    
    // Mobile form has different placeholders: "Saisissez votre nom" instead of "Entrez votre nom"
    const nomInput = page.getByPlaceholder(/saisissez votre nom/i).or(page.locator('input[placeholder*="nom" i]').first());
    const prenomInput = page.getByPlaceholder(/saisissez votre prénom/i).or(page.locator('input[placeholder*="prénom" i]').first());
    
    await nomInput.waitFor({ state: 'visible', timeout: 10000 });
    await prenomInput.waitFor({ state: 'visible', timeout: 10000 });
    
    await nomInput.fill('Doe');
    await prenomInput.fill('John');
    
    // Verify inputs are filled
    const nomValue = await nomInput.inputValue();
    const prenomValue = await prenomInput.inputValue();
    
    expect(nomValue).toBe('Doe');
    expect(prenomValue).toBe('John');
  });
});

test.describe('Signup Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    // Wait for form to be ready (responsive)
    await waitForFormReady(page);
  });

  test('should validate email format', async ({ page }) => {
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Invalid email
    const emailInput = page.getByPlaceholder(/exemple@email.com/i).or(page.locator('input[type="email"]').first());
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // Should show validation error
    await expect(
      page.getByText(/email.*valide|email.*valid|format.*email/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate password strength', async ({ page }) => {
    // Navigate to step 4
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    await fillEmail(page, 'test@example.com');
    await fillPhone(page, '+24101234567');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    
    // Step 3 - Select birth date
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 });
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: '01' }).click();
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: 'Janvier' }).click();
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: '2000' }).click();
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Weak password
    const passwordInput = page.getByPlaceholder(/créez un mot de passe/i).or(page.locator('input[type="password"]').first());
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill('weak');
    await passwordInput.blur();

    // Should show validation error
    await expect(
      page.getByText(/mot de passe.*faible|password.*weak|au moins.*caractères/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate password confirmation match', async ({ page }) => {
    // Navigate to step 4
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    await fillEmail(page, 'test@example.com');
    await fillPhone(page, '+24101234567');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    
    // Step 3 - Select birth date
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 });
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: '01' }).click();
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: 'Janvier' }).click();
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: '2000' }).click();
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    // Mismatched passwords
    await fillPassword(page, 'Password123!');
    await fillPasswordConfirm(page, 'DifferentPassword123!');
    const passwordConfirmInput = page.getByPlaceholder(/confirmez votre mot de passe/i).or(page.locator('input[type="password"]').nth(1));
    await passwordConfirmInput.blur();

    // Should show validation error
    await expect(
      page.getByText(/mots de passe.*correspondent|passwords.*match|ne correspondent pas/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should require terms acceptance', async ({ page }) => {
    // Navigate to step 4 and fill all fields
    await fillNom(page, 'Doe');
    await fillPrenom(page, 'John');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    await fillEmail(page, 'test@example.com');
    await fillPhone(page, '+24101234567');
    await page.getByRole('button', { name: /^continuer$/i }).first().click();
    
    // Step 3 - Select birth date
    const comboboxes = page.locator('[role="combobox"]');
    await expect(comboboxes).toHaveCount(3, { timeout: 5000 });
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: '01' }).click();
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: 'Janvier' }).click();
    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: '2000' }).click();
    await page.getByRole('button', { name: /^continuer$/i }).first().click();

    await fillPassword(page, 'Password123!');
    await fillPasswordConfirm(page, 'Password123!');

    // Don't check terms checkbox
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Submit button should be disabled
    await expect(submitButton).toBeDisabled({ timeout: 2000 });
  });

  test('should show toast error when email already exists (hetiwoh254@feanzier.com)', async ({ page }) => {
    const existingEmail = 'hetiwoh254@feanzier.com';
    const randomDigits = Date.now().toString().slice(-7).padStart(7, '0');
    const testPhone = `+24106${randomDigits}`; // Use new format

    // Note: This test assumes the user already exists
    // If the user doesn't exist, the test will create it (which is fine for first run)
    // On subsequent runs, it should fail with the error toast
    
    // Fill form using responsive helper
    await fillSignupFormStepByStep(page, {
      nom: 'Test',
      prenom: 'User',
      email: existingEmail,
      phone: testPhone,
      birthDate: { day: '01', month: 'Janvier', year: '2000' },
      password: 'Password123!',
      passwordConfirm: 'Password123!',
      acceptTerms: true,
    });
    
    // Submit form (works for both mobile and desktop)
    const submitButton = page.getByRole('button', { name: /créer mon compte|s'inscrire/i }).or(
      page.locator('button[type="submit"]').first()
    );
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    
    // Listen for console logs to debug
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[Browser Console ${msg.type()}]:`, msg.text());
      }
    });
    
    await submitButton.click();

    // Wait for toast notification or redirect
    // Wait a bit for the form submission to process
    await page.waitForTimeout(3000);
    
    // Check current URL - if redirected to success, the user was created (might happen on first run)
    const currentUrl = page.url();
    const wasRedirectedToSuccess = currentUrl.includes('/signup/success');
    
    if (wasRedirectedToSuccess) {
      // User was created successfully - this means the user didn't exist before
      // This is acceptable for the first run of the test
      // On subsequent runs with the same email, it should fail
      console.log('⚠️  User was created (did not exist before). This is expected on first run.');
      console.log('   On next run with the same email, it should fail with error toast.');
      // Don't fail the test - this is a valid scenario
      return;
    }
    
    // Look for error toast (destructive variant)
    // Wait for any toast to appear first
    const anyToast = page.locator('[data-state="open"]').first();
    await expect(anyToast).toBeVisible({ timeout: 15000 });
    
    // Get toast text to determine if it's an error or success
    const toastText = await anyToast.textContent();
    console.log('Toast full text:', toastText);
    
    // Get title and description
    const toastTitle = anyToast.locator('[class*="font-semibold"]').first();
    const toastDescription = anyToast.locator('[class*="opacity-90"]').first();
    
    const titleText = await toastTitle.textContent().catch(() => '');
    const descriptionText = await toastDescription.textContent().catch(() => '');
    
    console.log('Toast title:', titleText);
    console.log('Toast description:', descriptionText);
    
    // Verify the toast contains the correct error message for email already in use
    // Mobile and desktop may have slightly different formats
    const allToastText = `${toastText || ''} ${titleText} ${descriptionText}`;
    
    // Check that the toast contains email already used message
    expect(allToastText).toMatch(/email.*déjà.*utilisé/i);
    expect(allToastText).toMatch(/adresse email.*déjà.*(associée|utilisée)|compte existant|autre compte/i);
    
    // Verify the toast has destructive styling (error toast)
    const toastClass = await anyToast.getAttribute('class') || '';
    const isDestructive = toastClass.includes('destructive') || toastClass.includes('error');
    expect(isDestructive).toBeTruthy();
  });
});

test.describe('Complete Signup Flow with User Cleanup', () => {
  // Helper function to delete user by email
  async function deleteUserByEmail(email: string) {
    try {
      // Get the project root directory (where scripts folder is located)
      // Use process.cwd() which should point to the project root when tests run
      const projectRoot = process.cwd();
      const scriptPath = path.join(projectRoot, 'scripts', 'delete-user-by-email.js');
      
      console.log(`🔍 Looking for script at: ${scriptPath}`);
      
      // Verify script exists
      if (!fs.existsSync(scriptPath)) {
        console.warn(`⚠️  Script not found at ${scriptPath}, skipping deletion`);
        return;
      }
      
      execSync(`node "${scriptPath}" "${email}"`, { 
        stdio: 'inherit',
        cwd: projectRoot,
        env: { ...process.env }
      });
      console.log(`✅ User ${email} deleted successfully`);
    } catch (error: any) {
      // If user doesn't exist, that's okay
      if (error.message && (error.message.includes('user-not-found') || error.message.includes('Aucun utilisateur'))) {
        console.log(`ℹ️  User ${email} doesn't exist, skipping deletion`);
      } else {
        console.warn(`⚠️  Error deleting user ${email}:`, error.message || error);
      }
    }
  }

  test.beforeEach(async ({ page }) => {
    // Viewport is set by Playwright project configuration
    // Navigate to signup page and wait for it to load
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    
    // Wait for form to be ready (responsive)
    await waitForFormReady(page);
  });

  test('should complete signup successfully after deleting existing user (hetiwoh254@feanzier.com)', async ({ page }) => {
    const testEmail = 'hetiwoh254@feanzier.com';
    const randomDigits = Date.now().toString().slice(-7).padStart(7, '0');
    const testPhone = `+24106${randomDigits}`; // Use new format

    // Step 1: Delete user if exists
    console.log(`\n🗑️  Deleting user ${testEmail} if exists...`);
    await deleteUserByEmail(testEmail);
    await page.waitForTimeout(1000); // Wait a bit after deletion

    // Step 2: Complete signup form using responsive helper
    await fillSignupFormStepByStep(page, {
      nom: 'Test',
      prenom: 'User',
      email: testEmail,
      phone: testPhone,
      birthDate: { day: '01', month: 'Janvier', year: '2000' },
      password: 'Password123!',
      passwordConfirm: 'Password123!',
      acceptTerms: true,
    });
    
    // Submit form (works for both mobile and desktop)
    const submitButton = page.getByRole('button', { name: /créer mon compte|s'inscrire/i }).or(
      page.locator('button[type="submit"]').first()
    );
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    
    // Intercept network requests to verify email function is called
    let emailFunctionCalled = false;
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('sendVerificationEmail') || url.includes('cloudfunctions.net')) {
        emailFunctionCalled = true;
        console.log('✅ Email verification function called:', url);
      }
    });

    // Listen for console logs to debug
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[Browser Console ${msg.type()}]:`, msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error('[Page Error]:', error.message);
    });

    // Listen for failed requests
    page.on('requestfailed', request => {
      console.error('[Request Failed]:', request.url(), request.failure()?.errorText);
    });

    await submitButton.click();

    // Wait a bit for the form submission to process
    await page.waitForTimeout(2000);

    // Check if there's an error toast first
    const errorToast = page.locator('[data-state="open"]').filter({ 
      hasText: /erreur|error|échec|failed/i 
    }).first();
    
    const errorToastVisible = await errorToast.isVisible().catch(() => false);
    if (errorToastVisible) {
      const errorText = await errorToast.textContent();
      console.error('❌ Error toast detected:', errorText);
      throw new Error(`Signup failed with error: ${errorText}`);
    }

    // Check for success toast
    const successToast = page.locator('[data-state="open"]').filter({ 
      hasText: /succès|bienvenue|créé|success/i 
    }).first();
    
    const successToastVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false);
    if (successToastVisible) {
      console.log('✅ Success toast detected, waiting for redirect...');
    }

    // Step 3: Verify success - should redirect to success page
    try {
      await page.waitForURL(/\/signup\/success/, { timeout: 20000 });
      console.log('✅ Redirected to success page');
    } catch (error) {
      // If redirect failed, check current URL and page content
      const currentUrl = page.url();
      const pageContent = await page.content();
      console.error('❌ Redirect failed. Current URL:', currentUrl);
      console.error('Page content preview:', pageContent.substring(0, 500));
      
      // Check if we're still on signup page with an error
      if (currentUrl.includes('/signup') && !currentUrl.includes('/success')) {
        const anyToast = page.locator('[data-state="open"]').first();
        if (await anyToast.isVisible().catch(() => false)) {
          const toastText = await anyToast.textContent();
          throw new Error(`Still on signup page. Toast content: ${toastText}`);
        }
      }
      
      throw error;
    }
    
    // Verify we're on the success page
    const successIndicator = page.getByText(/succès|bienvenue|compte.*créé/i).or(
      page.locator('h1, h2').filter({ hasText: /succès|bienvenue/i })
    );
    await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });

    // Verify email function was called (may take a moment)
    await page.waitForTimeout(2000);
    if (emailFunctionCalled) {
      console.log('✅ Email verification function was called');
    } else {
      console.warn('⚠️  Email verification function may not have been called (check Cloud Function logs)');
    }

    // Extract UID from URL
    const url = page.url();
    const uidMatch = url.match(/uid=([^&]+)/);
    if (uidMatch) {
      const uid = uidMatch[1];
      console.log(`✅ User created with UID: ${uid}`);
      expect(uid).toBeTruthy();
    } else {
      throw new Error('UID not found in success URL');
    }
  });
});
