import { test, expect } from '@playwright/test';

test.describe('Owner Creates Moderator User - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'owner@tenant1.com');
    await page.fill('[data-testid="password-input"]', 'OwnerPass123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create moderator user with correct role', async ({ page }) => {
    await page.click('[data-testid="user-management-nav"]');
    await page.click('[data-testid="create-user-button"]');

    await page.fill('[data-testid="user-email-input"]', 'moderator@tenant1.com');
    await page.fill('[data-testid="user-password-input"]', 'ModeratorPass123');
    await page.fill('[data-testid="user-name-input"]', 'Jane Moderator');
    await page.selectOption('[data-testid="user-role-select"]', 'moderator');

    await page.click('[data-testid="create-user-submit"]');

    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Moderator user created successfully');

    const userRow = page.locator('[data-testid="user-list-item"]').filter({ hasText: 'moderator@tenant1.com' });
    await expect(userRow.locator('[data-testid="user-role"]')).toContainText('Moderator');
  });
});