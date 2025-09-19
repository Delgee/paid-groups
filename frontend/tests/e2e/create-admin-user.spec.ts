import { test, expect } from '@playwright/test';

test.describe('Owner Creates Admin User - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testowner@tenant1.com');
    await page.fill('[data-testid="password-input"]', 'OwnerPass123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create admin user through complete workflow', async ({ page }) => {
    // Navigate to user management
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await expect(page).toHaveURL('/dashboard/users');

    // Verify page content
    await expect(page.locator('h1').filter({ hasText: 'User Management' })).toBeVisible();

    // Click create new user button
    await page.click('[data-testid="create-user-button"]');
    await expect(page).toHaveURL('/dashboard/users/create');

    // Fill out create user form
    // Use unique email to avoid duplicate key conflicts
    const timestamp = Date.now();
    await page.fill('[data-testid="user-email-input"]', `admin${timestamp}@tenant1.com`);
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'John Administrator');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select-trigger"]');
    await page.getByRole('option', { name: 'Admin' }).click();

    // Submit form
    await page.click('[data-testid="create-user-submit"]');

    // Wait for form response
    await page.waitForTimeout(3000);

    // Check for any error messages first
    const emailError = page.locator('[data-testid="email-error"]');
    const passwordError = page.locator('[data-testid="password-error"]');
    const nameError = page.locator('[data-testid="name-error"]');
    const roleError = page.locator('[data-testid="role-error"]');

    // Log any errors that are visible
    if (await emailError.isVisible()) {
      console.log('Email error:', await emailError.textContent());
    }
    if (await passwordError.isVisible()) {
      console.log('Password error:', await passwordError.textContent());
    }
    if (await nameError.isVisible()) {
      console.log('Name error:', await nameError.textContent());
    }
    if (await roleError.isVisible()) {
      console.log('Role error:', await roleError.textContent());
    }

    // Check if we're back on the user list page (successful creation)
    await expect(page).toHaveURL('/dashboard/users', { timeout: 10000 });

    // Verify new user appears in list
    const userRow = page.locator('[data-testid="user-list-item"]').filter({ hasText: `admin${timestamp}@tenant1.com` });
    await expect(userRow).toBeVisible();
    await expect(userRow.locator('[data-testid="user-role"]')).toContainText('Admin');
    await expect(userRow.locator('[data-testid="user-name"]')).toContainText('John Administrator');
  });

  test('should show form validation errors', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Fill invalid data to trigger validation
    await page.fill('[data-testid="user-email-input"]', 'invalid-email');
    await page.fill('[data-testid="user-password-input"]', 'weak');
    await page.fill('[data-testid="user-name-input"]', 'A');
    // Leave role unselected

    // Try to submit form
    await page.click('[data-testid="create-user-submit"]');

    // Verify validation errors appear
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('at least 8 characters');
    await expect(page.locator('[data-testid="name-error"]')).toContainText('at least 2 characters');
    await expect(page.locator('[data-testid="role-error"]')).toContainText('required');
  });

  test('should validate email format', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Enter invalid email and try to submit to trigger validation
    await page.fill('[data-testid="user-email-input"]', 'invalid-email');
    await page.fill('[data-testid="user-password-input"]', 'ValidPass123');
    await page.fill('[data-testid="user-name-input"]', 'Valid Name');
    await page.click('[data-testid="user-role-select-trigger"]');
    await page.getByRole('option', { name: 'Admin' }).click();
    await page.click('[data-testid="create-user-submit"]');

    // Verify email validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
  });

  test('should validate password complexity', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Enter weak password and try to submit to trigger validation
    await page.fill('[data-testid="user-email-input"]', 'valid@example.com');
    await page.fill('[data-testid="user-password-input"]', 'weak');
    await page.fill('[data-testid="user-name-input"]', 'Valid Name');
    await page.click('[data-testid="user-role-select-trigger"]');
    await page.getByRole('option', { name: 'Admin' }).click();
    await page.click('[data-testid="create-user-submit"]');

    // Verify password validation error
    await expect(page.locator('[data-testid="password-error"]')).toContainText('at least 8 characters');
  });

  test('should handle duplicate email error', async ({ page }) => {
    // Create first user
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    const timestamp = Date.now();
    const duplicateEmail = `duplicate${timestamp}@tenant1.com`;

    await page.fill('[data-testid="user-email-input"]', duplicateEmail);
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'First Admin');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select-trigger"]');
    await page.getByRole('option', { name: 'Admin' }).click();
    await page.click('[data-testid="create-user-submit"]');

    // Wait for successful creation and navigation back to users page
    await expect(page).toHaveURL('/dashboard/users', { timeout: 10000 });

    // Try to create second user with same email
    await page.click('[data-testid="create-user-button"]');
    await page.fill('[data-testid="user-email-input"]', duplicateEmail);
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'Second Admin');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select-trigger"]');
    await page.getByRole('option', { name: 'Admin' }).click();
    await page.click('[data-testid="create-user-submit"]');

    // Verify duplicate email error appears in form
    await expect(page.locator('[data-testid="email-error"]')).toContainText('user with this email already exists');
  });

  test('should show loading state during form submission', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Fill form
    const timestamp = Date.now();
    await page.fill('[data-testid="user-email-input"]', `loading${timestamp}@tenant1.com`);
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'Loading Test');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select-trigger"]');
    await page.getByRole('option', { name: 'Admin' }).click();

    // Submit and verify loading state
    await page.click('[data-testid="create-user-submit"]');
    await expect(page.locator('[data-testid="create-user-submit"]')).toBeDisabled();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });
});