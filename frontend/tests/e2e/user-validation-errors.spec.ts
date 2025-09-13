import { test, expect } from '@playwright/test';

test.describe('User Validation Error Handling - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'owner@tenant1.com');
    await page.fill('[data-testid="password-input"]', 'OwnerPass123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
    await page.click('[data-testid="user-management-nav"]');
    await page.click('[data-testid="create-user-button"]');
  });

  test('should display all validation errors at once', async ({ page }) => {
    await page.fill('[data-testid="user-email-input"]', 'invalid-email');
    await page.fill('[data-testid="user-password-input"]', '123');
    await page.fill('[data-testid="user-name-input"]', 'A');
    // Leave role unselected

    await page.click('[data-testid="create-user-submit"]');

    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('at least 8 characters');
    await expect(page.locator('[data-testid="name-error"]')).toContainText('at least 2 characters');
    await expect(page.locator('[data-testid="role-error"]')).toContainText('required');
  });

  test('should clear validation errors when fixed', async ({ page }) => {
    await page.fill('[data-testid="user-email-input"]', 'invalid');
    await page.blur('[data-testid="user-email-input"]');
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    await page.fill('[data-testid="user-email-input"]', 'valid@example.com');
    await page.blur('[data-testid="user-email-input"]');
    await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();
  });
});