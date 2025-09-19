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
    await page.fill('[data-testid="user-email-input"]', 'admin@tenant1.com');
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'John Administrator');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select"]');
    await page.click('text=Admin');

    // Submit form
    await page.click('[data-testid="create-user-submit"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Admin user created successfully');

    // Should redirect back to user list
    await expect(page).toHaveURL('/dashboard/users');

    // Verify new user appears in list
    const userRow = page.locator('[data-testid="user-list-item"]').filter({ hasText: 'admin@tenant1.com' });
    await expect(userRow).toBeVisible();
    await expect(userRow.locator('[data-testid="user-role"]')).toContainText('Admin');
    await expect(userRow.locator('[data-testid="user-name"]')).toContainText('John Administrator');
  });

  test('should show form validation errors', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Try to submit empty form
    await page.click('[data-testid="create-user-submit"]');

    // Verify validation errors appear
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="role-error"]')).toContainText('Role is required');
  });

  test('should validate email format', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Enter invalid email
    await page.fill('[data-testid="user-email-input"]', 'invalid-email');
    await page.click('body');

    // Verify email validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email address');
  });

  test('should validate password complexity', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Enter weak password
    await page.fill('[data-testid="user-password-input"]', 'weak');
    await page.click('body');

    // Verify password validation error
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
  });

  test('should handle duplicate email error', async ({ page }) => {
    // Create first user
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    await page.fill('[data-testid="user-email-input"]', 'duplicate@tenant1.com');
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'First Admin');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select"]');
    await page.click('text=Admin');
    await page.click('[data-testid="create-user-submit"]');

    // Wait for success
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Try to create second user with same email
    await page.click('[data-testid="create-user-button"]');
    await page.fill('[data-testid="user-email-input"]', 'duplicate@tenant1.com');
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'Second Admin');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select"]');
    await page.click('text=Admin');
    await page.click('[data-testid="create-user-submit"]');

    // Verify duplicate email error
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('A user with this email already exists');
  });

  test('should show loading state during form submission', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    // Fill form
    await page.fill('[data-testid="user-email-input"]', 'loading@tenant1.com');
    await page.fill('[data-testid="user-password-input"]', 'AdminPass123');
    await page.fill('[data-testid="user-name-input"]', 'Loading Test');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select"]');
    await page.click('text=Admin');

    // Submit and verify loading state
    await page.click('[data-testid="create-user-submit"]');
    await expect(page.locator('[data-testid="create-user-submit"]')).toBeDisabled();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });
});