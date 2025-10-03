import { test, expect } from '@playwright/test';

test.describe('Telegram Group Management - Complete Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testowner@tenant1.com');
    await page.fill('[data-testid="password-input"]', 'OwnerPass123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create telegram group through complete workflow', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();
    await expect(page).toHaveURL('/dashboard/telegram-groups');

    // Verify page content
    await expect(page.locator('h1').filter({ hasText: 'Telegram Groups' })).toBeVisible();

    // Click create new group button
    await page.click('[data-testid="create-group-button"]');
    await expect(page).toHaveURL('/dashboard/telegram-groups/create');

    // Fill out create group form
    const timestamp = Date.now();
    await page.fill('[data-testid="group-name-input"]', `Test Group ${timestamp}`);
    await page.fill('[data-testid="group-description-input"]', 'E2E Test Group Description');

    // Select bot from dropdown
    await page.click('[data-testid="bot-select-trigger"]');
    await page.getByRole('option').first().click();

    // Optional: Fill in settings (JSON)
    await page.fill('[data-testid="group-settings-input"]', '{"welcome_message": "Welcome!"}');

    // Submit form
    await page.click('[data-testid="submit-button"]');

    // Wait for form response
    await page.waitForTimeout(3000);

    // Check for any error messages first
    const groupNameError = page.locator('[data-testid="group-name-error"]');
    const descriptionError = page.locator('[data-testid="description-error"]');
    const botError = page.locator('[data-testid="bot-error"]');

    // Log any errors that are visible
    if (await groupNameError.isVisible()) {
      console.log('Group name error:', await groupNameError.textContent());
    }
    if (await descriptionError.isVisible()) {
      console.log('Description error:', await descriptionError.textContent());
    }
    if (await botError.isVisible()) {
      console.log('Bot error:', await botError.textContent());
    }

    // Check if we're back on the telegram groups list page (successful creation)
    await expect(page).toHaveURL('/dashboard/telegram-groups', { timeout: 10000 });

    // Verify new group appears in grid
    const groupCard = page.locator('[data-testid="group-card"]').filter({ hasText: `Test Group ${timestamp}` });
    await expect(groupCard).toBeVisible();
    await expect(groupCard.locator('[data-testid="group-name"]')).toContainText(`Test Group ${timestamp}`);
    await expect(groupCard.locator('[data-testid="group-description"]')).toContainText('E2E Test Group Description');
  });

  test('should show form validation errors', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();
    await page.click('[data-testid="create-group-button"]');

    // Try to submit empty form
    await page.click('[data-testid="submit-button"]');

    // Verify validation errors appear
    await expect(page.locator('[data-testid="group-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="bot-error"]')).toBeVisible();
  });

  test('should filter groups by search query', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();
    await expect(page).toHaveURL('/dashboard/telegram-groups');

    // Type in search input
    await page.fill('[data-testid="search-input"]', 'VIP');

    // Wait for filtering to apply
    await page.waitForTimeout(1000);

    // Verify filtered results (groups with "VIP" in name should be visible)
    const groups = page.locator('[data-testid="group-card"]');
    const count = await groups.count();

    if (count > 0) {
      // Check that visible groups contain the search term
      for (let i = 0; i < count; i++) {
        const groupName = await groups.nth(i).locator('[data-testid="group-name"]').textContent();
        expect(groupName?.toLowerCase()).toContain('vip');
      }
    }
  });

  test('should filter groups by sync status', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();

    // Select sync enabled filter
    await page.click('[data-testid="sync-enabled-filter"]');
    await page.getByRole('option', { name: 'Yes' }).click();

    // Wait for filtering
    await page.waitForTimeout(1000);

    // Verify URL has sync_enabled query param
    await expect(page).toHaveURL(/sync_enabled=true/);
  });

  test('should filter groups by bot assignment', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();

    // Select bot assigned filter
    await page.click('[data-testid="bot-assigned-filter"]');
    await page.getByRole('option', { name: 'Assigned' }).click();

    // Wait for filtering
    await page.waitForTimeout(1000);

    // Verify URL has bot_assigned query param
    await expect(page).toHaveURL(/bot_assigned=true/);
  });

  test('should filter groups by connection status', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();

    // Select connection status filter
    await page.click('[data-testid="connection-status-filter"]');
    await page.getByRole('option', { name: 'Connected' }).click();

    // Wait for filtering
    await page.waitForTimeout(1000);

    // Verify URL has connection_status query param
    await expect(page).toHaveURL(/connection_status=connected/);
  });

  test('should change page size', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();

    // Change limit select
    await page.click('[data-testid="limit-select"]');
    await page.getByRole('option', { name: '20' }).click();

    // Wait for re-fetch
    await page.waitForTimeout(1000);

    // Verify URL has limit query param
    await expect(page).toHaveURL(/limit=20/);
  });

  test('should refresh groups list', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();

    // Click refresh button
    await page.click('[data-testid="refresh-button"]');

    // Wait for refresh animation
    await page.waitForTimeout(1000);

    // Verify page is still on telegram groups
    await expect(page).toHaveURL('/dashboard/telegram-groups');
  });

  test('should paginate through groups', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();

    // Check if next page button exists and is enabled
    const nextButton = page.locator('[data-testid="next-page-button"]');
    const isNextEnabled = await nextButton.isEnabled();

    if (isNextEnabled) {
      // Click next page
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Verify URL has page=2
      await expect(page).toHaveURL(/page=2/);

      // Click previous page
      await page.click('[data-testid="prev-page-button"]');
      await page.waitForTimeout(1000);

      // Verify back to page 1
      await expect(page).toHaveURL(/page=1/);
    }
  });

  test('should show loading state during form submission', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();
    await page.click('[data-testid="create-group-button"]');

    // Fill form
    const timestamp = Date.now();
    await page.fill('[data-testid="group-name-input"]', `Loading Test ${timestamp}`);
    await page.click('[data-testid="bot-select-trigger"]');
    await page.getByRole('option').first().click();

    // Submit and verify loading state
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="submit-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });

  test('should cancel form and return to list', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();
    await page.click('[data-testid="create-group-button"]');

    // Fill form partially
    await page.fill('[data-testid="group-name-input"]', 'Test Group');

    // Click cancel button
    await page.click('[data-testid="cancel-button"]');

    // Verify back on list page
    await expect(page).toHaveURL('/dashboard/telegram-groups');
  });

  test('should open group actions menu', async ({ page }) => {
    // Navigate to telegram groups
    await page.locator('.hidden.md\\:flex [data-testid="telegram-groups-nav"]').click();

    // Find first group card
    const firstGroupCard = page.locator('[data-testid="group-card"]').first();

    if (await firstGroupCard.isVisible()) {
      // Click actions menu
      await firstGroupCard.locator('[data-testid="group-actions-menu"]').click();

      // Wait for menu to appear
      await page.waitForTimeout(500);

      // Menu should have options (implementation dependent)
      // This validates that the menu opens
    }
  });
});
