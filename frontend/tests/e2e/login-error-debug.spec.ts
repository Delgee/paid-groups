import { test, expect } from '@playwright/test';

test.describe('Login Error Handling Debug - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/auth/login')) {
        console.log(`[NETWORK] Request: ${request.method()} ${request.url()}`);
        console.log(`[NETWORK] Headers:`, request.headers());
        console.log(`[NETWORK] Post data:`, request.postData());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/auth/login')) {
        console.log(`[NETWORK] Response: ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to login page
    await page.goto('http://localhost:3002/login');
    console.log('Navigated to login page');
  });

  test('should reproduce login error handling issue', async ({ page }) => {
    console.log('=== Starting login error test ===');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check initial state
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    console.log('All form elements are visible');

    // Fill form with invalid credentials
    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');

    console.log('Filled form with invalid credentials');

    // Check if error div is initially hidden
    const errorDiv = page.locator('[role="alert"]').filter({ hasText: /invalid|error|fail/i });
    await expect(errorDiv).toHaveCount(0);
    console.log('Error div is initially not present (correct)');

    // Take a screenshot before submission
    await page.screenshot({ path: 'before-login-submit.png', fullPage: true });

    // Submit the form
    console.log('About to submit form');
    await submitButton.click();

    // Wait a bit to see what happens
    await page.waitForTimeout(1000);

    // Take a screenshot after submission
    await page.screenshot({ path: 'after-login-submit.png', fullPage: true });

    // Check current URL - should still be login page
    const currentUrl = page.url();
    console.log(`Current URL after submission: ${currentUrl}`);

    // URL should still contain /login if error handling works correctly
    expect(currentUrl).toContain('/login');

    // Check if error message appears
    const errorMessage = page.locator('[role="alert"]').filter({ hasText: /invalid|error|fail|credential/i });

    try {
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      console.log('✅ ERROR MESSAGE IS VISIBLE - Issue is fixed!');

      const errorText = await errorMessage.textContent();
      console.log(`Error message text: "${errorText}"`);

    } catch (error) {
      console.log('❌ ERROR MESSAGE NOT VISIBLE - Issue still exists');

      // Check if we got redirected unexpectedly
      if (!currentUrl.includes('/login')) {
        console.log('❌ Page was redirected away from login');
      }

      // Check if page reloaded (form should still have values)
      const emailValue = await emailInput.inputValue();
      const passwordValue = await passwordInput.inputValue();

      if (!emailValue && !passwordValue) {
        console.log('❌ Form inputs are empty - possible page reload occurred');
      } else {
        console.log('✅ Form inputs retained values - no page reload');
        console.log(`Email: "${emailValue}", Password: "${passwordValue}"`);
      }

      throw error;
    }
  });

  test('should monitor React state changes during error', async ({ page }) => {
    console.log('=== Starting React state monitoring test ===');

    // Inject script to monitor React state changes
    await page.addInitScript(() => {
      // Hook into React DevTools if available
      window.addEventListener('beforeunload', () => {
        console.log('[REACT] Page is about to unload - possible navigation');
      });

      // Monitor DOM mutations
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.textContent?.includes('Invalid')) {
                console.log('[DOM] Error message added to DOM:', node.textContent);
              }
            });
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.textContent?.includes('Invalid')) {
                console.log('[DOM] Error message removed from DOM:', node.textContent);
              }
            });
          }
        });
      });

      // Start observing
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        console.log('[DOM] Started monitoring DOM mutations');
      });
    });

    await page.goto('http://localhost:3002/login');
    await page.waitForLoadState('networkidle');

    // Fill and submit form
    await page.fill('#email', 'test@invalid.com');
    await page.fill('#password', 'badpassword');

    console.log('Submitting form to monitor state changes...');
    await page.click('button[type="submit"]');

    // Wait and monitor for changes
    await page.waitForTimeout(3000);

    // Check final state
    const currentUrl = page.url();
    console.log(`Final URL: ${currentUrl}`);

    const errorVisible = await page.locator('[role="alert"]').filter({ hasText: /invalid|error|fail|credential/i }).isVisible();
    console.log(`Error message visible: ${errorVisible}`);
  });

  test('should track network requests in detail', async ({ page }) => {
    console.log('=== Starting detailed network monitoring test ===');

    const networkLogs = [];

    // Track all network activity
    page.on('request', request => {
      networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: Date.now()
      });
    });

    page.on('response', response => {
      networkLogs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      });
    });

    await page.goto('http://localhost:3002/login');
    await page.waitForLoadState('networkidle');

    // Submit form with invalid credentials
    await page.fill('#email', 'debug@test.com');
    await page.fill('#password', 'invalidpass');

    const submitPromise = page.click('button[type="submit"]');

    // Wait for login attempt to complete
    await submitPromise;
    await page.waitForTimeout(2000);

    // Print all network activity
    console.log('=== NETWORK ACTIVITY LOG ===');
    networkLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.type.toUpperCase()}] ${log.method || ''} ${log.url}`);
      if (log.status) console.log(`   Status: ${log.status}`);
      if (log.postData) console.log(`   Data: ${log.postData}`);
    });

    // Check if any unexpected navigation requests occurred
    const navigationRequests = networkLogs.filter(log =>
      log.type === 'request' &&
      (log.url.includes('/dashboard') || log.url.includes('/login')) &&
      log.method === 'GET'
    );

    console.log('=== NAVIGATION REQUESTS ===');
    navigationRequests.forEach(req => {
      console.log(`Navigation: ${req.url} at ${new Date(req.timestamp).toISOString()}`);
    });

    if (navigationRequests.length > 1) {
      console.log('❌ Multiple navigation requests detected - possible redirect/reload');
    } else {
      console.log('✅ No unexpected navigation requests');
    }
  });
});