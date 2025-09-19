import { test, expect } from '@playwright/test';

test('Debug page reloading issue', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // Monitor page navigation
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`[NAVIGATION] Navigated to: ${frame.url()}`);
    }
  });

  // Go to login page
  await page.goto('/login');

  // Wait for page to load
  await expect(page.locator('h1')).toContainText('Telegram Groups SaaS');

  // Fill in invalid credentials
  await page.fill('input[type="email"]', 'invalid@example.com');
  await page.fill('input[type="password"]', 'wrongpassword');

  console.log('About to click submit button...');

  // Click submit and monitor what happens
  await page.click('button:has-text("Sign in")');

  // Wait a moment to see any network requests or navigation
  await page.waitForTimeout(2000);

  // Check if error appears
  const errorElement = page.locator('[role="alert"]').first();
  const hasError = await errorElement.count() > 0;

  if (hasError) {
    const errorText = await errorElement.textContent();
    console.log(`Error displayed: ${errorText}`);
  } else {
    console.log('No error displayed - this is the problem!');
  }

  // Check current URL
  console.log(`Current URL: ${page.url()}`);
});