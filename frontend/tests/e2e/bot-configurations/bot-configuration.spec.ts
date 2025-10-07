import { test, expect } from '@playwright/test';

test.describe('Bot Configuration Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/login');

    // TODO: Replace with actual login credentials from test environment
    await page.fill('input[name="email"]', 'testowner@tenant1.com');
    await page.fill('input[name="password"]', 'OwnerPass123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should display empty state when no bot configurations exist', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations');

    // Check for empty state
    await expect(page.locator('text=No bot configurations yet')).toBeVisible();
    await expect(page.locator('text=Get started by creating your first Telegram bot configuration')).toBeVisible();

    // Verify create button exists
    await expect(page.locator('button:has-text("Create Bot Configuration")')).toBeVisible();
  });

  test('should create a new bot configuration successfully', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations');

    // Click create button
    await page.click('button:has-text("Add Bot")');

    // Verify navigation to create page
    await expect(page).toHaveURL('/dashboard/bot-configurations/create');

    // Fill in the form
    await page.fill('input[name="bot_token"]', '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz');
    await page.fill('input[name="bot_username"]', 'test_payment_bot');
    await page.fill('input[name="display_name"]', 'Test Payment Bot');
    await page.fill('textarea[name="description"]', 'A test bot for E2E testing');
    await page.fill('textarea[name="welcome_message"]', 'Welcome! Choose a membership plan to access our premium channel.');
    await page.fill('input[name="channel_id"]', '-1001234567890');
    await page.fill('input[name="channel_username"]', 'test_premium_channel');

    // Submit the form
    await page.click('button[type="submit"]:has-text("Create Bot")');

    // Wait for success toast
    await expect(page.locator('text=Bot configuration created successfully')).toBeVisible({ timeout: 5000 });

    // Verify redirect to list page
    await expect(page).toHaveURL('/dashboard/bot-configurations');

    // Verify the new bot appears in the list
    await expect(page.locator('text=Test Payment Bot')).toBeVisible();
    await expect(page.locator('text=@test_payment_bot')).toBeVisible();
  });

  test('should validate bot token format', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations/create');

    // Try invalid token format
    await page.fill('input[name="bot_token"]', 'invalid-token-format');
    await page.fill('input[name="bot_username"]', 'test_bot');
    await page.fill('input[name="display_name"]', 'Test Bot');
    await page.fill('textarea[name="welcome_message"]', 'Welcome message here');

    // Try to submit
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=Invalid bot token format')).toBeVisible();
  });

  test('should validate bot username format', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations/create');

    // Valid token but invalid username (too short)
    await page.fill('input[name="bot_token"]', '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz');
    await page.fill('input[name="bot_username"]', 'ab'); // Only 2 characters
    await page.fill('input[name="display_name"]', 'Test Bot');
    await page.fill('textarea[name="welcome_message"]', 'Welcome message here');

    // Try to submit
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=Username must be at least 5 characters')).toBeVisible();
  });

  test('should validate welcome message length', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations/create');

    await page.fill('input[name="bot_token"]', '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz');
    await page.fill('input[name="bot_username"]', 'test_bot');
    await page.fill('input[name="display_name"]', 'Test Bot');
    await page.fill('textarea[name="welcome_message"]', 'Short'); // Too short (< 10 chars)

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Welcome message must be at least 10 characters')).toBeVisible();
  });

  test('should validate channel ID format', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations/create');

    await page.fill('input[name="bot_token"]', '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz');
    await page.fill('input[name="bot_username"]', 'test_bot');
    await page.fill('input[name="display_name"]', 'Test Bot');
    await page.fill('textarea[name="welcome_message"]', 'Welcome to our bot!');
    await page.fill('input[name="channel_id"]', '1234567890'); // Positive number (invalid)

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Channel ID must be a negative number')).toBeVisible();
  });

  test('should sync bot information', async ({ page }) => {
    // First, ensure we have a bot configuration
    await page.goto('/dashboard/bot-configurations');

    // Check if bot exists, if not skip this test
    const botExists = await page.locator('text=Test Payment Bot').isVisible();

    if (botExists) {
      // Find and click the sync button for the bot
      const botCard = page.locator('text=Test Payment Bot').locator('..');
      await botCard.locator('button').filter({ hasText: /Sync|Refresh/ }).first().click();

      // Wait for sync to complete
      await expect(page.locator('text=Bot synced successfully')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete bot configuration with confirmation', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations');

    const botExists = await page.locator('text=Test Payment Bot').isVisible();

    if (botExists) {
      // Listen for confirmation dialog
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('Are you sure');
        dialog.accept();
      });

      // Click delete button
      const botCard = page.locator('text=Test Payment Bot').locator('..');
      await botCard.locator('button').filter({ hasText: /Delete|Trash/ }).first().click();

      // Wait for success message
      await expect(page.locator('text=Bot configuration deleted')).toBeVisible({ timeout: 5000 });

      // Verify bot is removed from list
      await expect(page.locator('text=Test Payment Bot')).not.toBeVisible();
    }
  });

  test('should navigate back from create page', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations');

    // Navigate to create page
    await page.click('button:has-text("Add Bot")');
    await expect(page).toHaveURL('/dashboard/bot-configurations/create');

    // Click back button
    await page.click('button:has-text("Back")');

    // Verify navigation back to list
    await expect(page).toHaveURL('/dashboard/bot-configurations');
  });

  test('should display active/inactive badge correctly', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations/create');

    // Create a bot with is_active = true (default)
    await page.fill('input[name="bot_token"]', '9876543210:ZYXwvuTSRqponMLKJIhgfeDCba');
    await page.fill('input[name="bot_username"]', 'active_test_bot');
    await page.fill('input[name="display_name"]', 'Active Test Bot');
    await page.fill('textarea[name="welcome_message"]', 'Welcome to our active bot!');

    // Ensure the switch is ON
    const activeSwitch = page.locator('button[role="switch"]');
    const isChecked = await activeSwitch.getAttribute('data-state');
    if (isChecked !== 'checked') {
      await activeSwitch.click();
    }

    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/dashboard/bot-configurations');

    // Verify "Active" badge is displayed
    const botCard = page.locator('text=Active Test Bot').locator('..');
    await expect(botCard.locator('text=Active')).toBeVisible();
  });

  test('should show loading state during creation', async ({ page }) => {
    await page.goto('/dashboard/bot-configurations/create');

    await page.fill('input[name="bot_token"]', '1111111111:TestTokenForLoadingState');
    await page.fill('input[name="bot_username"]', 'loading_test_bot');
    await page.fill('input[name="display_name"]', 'Loading Test Bot');
    await page.fill('textarea[name="welcome_message"]', 'Testing loading state...');

    // Click submit and immediately check for loading state
    await page.click('button[type="submit"]');

    // Button should show "Creating..." text
    await expect(page.locator('button:has-text("Creating...")')).toBeVisible();
  });
});
