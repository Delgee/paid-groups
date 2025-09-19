import { test, expect } from '@playwright/test';

test.describe('Owner Creates Moderator User - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testowner@tenant1.com');
    await page.fill('[data-testid="password-input"]', 'OwnerPass123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create moderator user with correct role', async ({ page }) => {
    // Click on the desktop navigation element
    await page.locator('.hidden.md\\:flex [data-testid="user-management-nav"]').click();
    await page.click('[data-testid="create-user-button"]');

    const timestamp = Date.now();
    await page.fill('[data-testid="user-email-input"]', `moderator${timestamp}@tenant1.com`);
    await page.fill('[data-testid="user-password-input"]', 'ModeratorPass123');
    await page.fill('[data-testid="user-name-input"]', 'Jane Moderator');
    // Handle Radix Select component
    await page.click('[data-testid="user-role-select-trigger"]');
    await page.getByRole('option', { name: 'Moderator' }).click();

    await page.click('[data-testid="create-user-submit"]');

    // Wait for successful creation and navigation back to users page
    await expect(page).toHaveURL('/dashboard/users', { timeout: 10000 });

    // Verify new user appears in list
    const userRow = page.locator('[data-testid="user-list-item"]').filter({ hasText: `moderator${timestamp}@tenant1.com` });
    await expect(userRow).toBeVisible();
    await expect(userRow.locator('[data-testid="user-role"]')).toContainText('Moderator');
  });
});