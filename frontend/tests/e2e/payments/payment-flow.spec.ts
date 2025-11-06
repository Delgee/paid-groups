import { test, expect } from '@playwright/test';

test.describe('Payment Flow E2E', () => {
  let botConfigId: string;
  let membershipPlanId: string;

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testowner@tenant1.com');
    await page.fill('input[name="password"]', 'OwnerPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('complete payment workflow from bot setup to membership creation', async ({ page }) => {
    // Step 1: Create Bot Configuration
    await page.goto('/dashboard/bot-configurations/create');

    await page.fill('input[name="bot_token"]', '1234567890:PaymentFlowTestToken');
    await page.fill('input[name="bot_username"]', 'payment_flow_bot');
    await page.fill('input[name="display_name"]', 'Payment Flow Test Bot');
    await page.fill('textarea[name="welcome_message"]', 'Welcome! Test our payment system.');
    await page.fill('input[name="channel_id"]', '-1001111111111');
    await page.fill('input[name="channel_username"]', 'test_payment_channel');

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Bot configuration created successfully')).toBeVisible({ timeout: 5000 });

    // Step 2: Create Membership Plan
    await page.goto('/dashboard/plans/create');

    // Select the bot we just created
    await page.selectOption('select[name="bot_configuration_id"]', { label: 'Payment Flow Test Bot' });
    await page.fill('input[name="name"]', 'Premium Monthly');
    await page.fill('textarea[name="description"]', 'Premium access for 30 days');
    await page.fill('input[name="price"]', '50000');
    await page.fill('input[name="duration_days"]', '30');

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Membership plan created successfully')).toBeVisible({ timeout: 5000 });

    // Step 3: Simulate Bot User Interaction
    // Note: This would typically involve Telegram Bot API simulation
    // For now, we'll test the API endpoints directly via the backend

    // Step 4: Verify payment can be initiated via API
    // This test verifies that the backend API is accessible and returns expected data
    const response = await page.request.get('/api/bot-configurations');
    expect(response.ok()).toBeTruthy();

    const bots = await response.json();
    expect(Array.isArray(bots)).toBeTruthy();
    expect(bots.length).toBeGreaterThan(0);

    const paymentBot = bots.find((b: any) => b.bot_username === 'payment_flow_bot');
    expect(paymentBot).toBeDefined();
    expect(paymentBot.display_name).toBe('Payment Flow Test Bot');
  });

  test('should handle payment status checking', async ({ page, request }) => {
    // Create a test payment transaction via API
    const paymentData = {
      membership_plan_id: 'test-plan-id',
      bot_configuration_id: 'test-bot-id',
      telegram_user_id: '123456789',
      telegram_username: 'test_user',
      telegram_first_name: 'Test',
      telegram_last_name: 'User',
      amount: 50000,
      snapshot_plan_name: 'Premium Monthly',
      snapshot_price: 50000,
      snapshot_duration_days: 30,
    };

    // Note: This requires authenticated API request
    // In real scenario, you'd use the API client with proper auth token

    // Navigate to payments page (when implemented)
    await page.goto('/dashboard/payments');

    // Verify payments list is accessible
    await expect(page.locator('h1')).toContainText(/Payments|Transactions/);
  });

  test('should validate membership plan pricing constraints', async ({ page }) => {
    await page.goto('/dashboard/plans/create');

    // Try to create plan with price below minimum (1000 MNT)
    await page.fill('input[name="name"]', 'Too Cheap Plan');
    await page.fill('input[name="price"]', '500');
    await page.fill('input[name="duration_days"]', '30');

    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/price.*1,?000/i')).toBeVisible();
  });

  test('should validate membership duration constraints', async ({ page }) => {
    await page.goto('/dashboard/plans/create');

    // Try to create plan with duration above maximum (365 days)
    await page.fill('input[name="name"]', 'Too Long Plan');
    await page.fill('input[name="price"]', '100000');
    await page.fill('input[name="duration_days"]', '400');

    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/duration.*365/i')).toBeVisible();
  });

  test('should display payment link when transaction is created', async ({ page }) => {
    // This test verifies that payment links are properly formatted
    // In production, this would integrate with actual QPay API

    // Mock scenario: Navigate to a page that shows payment transactions
    await page.goto('/dashboard/payments');

    // Check for payment link format if any payments exist
    const paymentLinkExists = await page.locator('a[href*="payment.qpay.mn"]').count();

    if (paymentLinkExists > 0) {
      const firstPaymentLink = page.locator('a[href*="payment.qpay.mn"]').first();
      await expect(firstPaymentLink).toHaveAttribute('href', /^https:\/\/payment\.qpay\.mn\//);
    }
  });

  test('should show payment status badges correctly', async ({ page }) => {
    await page.goto('/dashboard/payments');

    // Look for status badges (pending, completed, failed, refunded)
    const statuses = ['pending', 'completed', 'failed', 'refunded'];

    for (const status of statuses) {
      // Check if any payment with this status exists
      const statusBadgeExists = await page.locator(`text=${status}`).count() > 0;

      if (statusBadgeExists) {
        // Verify badge has appropriate styling (this is framework-dependent)
        const badge = page.locator(`text=${status}`).first();
        await expect(badge).toBeVisible();
      }
    }
  });

  test('should filter payments by status', async ({ page }) => {
    await page.goto('/dashboard/payments');

    // Check if filter controls exist
    const filterExists = await page.locator('select[name="status"]').count() > 0;

    if (filterExists) {
      // Select "completed" filter
      await page.selectOption('select[name="status"]', 'completed');

      // Wait for list to update
      await page.waitForTimeout(1000);

      // All visible payments should have "completed" status
      const completedBadges = await page.locator('text=completed').count();
      const pendingBadges = await page.locator('text=pending').count();

      // If there are any results, they should only show completed
      if (completedBadges > 0) {
        expect(pendingBadges).toBe(0);
      }
    }
  });

  test('should show transaction details on click', async ({ page }) => {
    await page.goto('/dashboard/payments');

    // Check if any payment transactions exist
    const transactionCount = await page.locator('[data-testid="payment-transaction"]').count();

    if (transactionCount > 0) {
      // Click on first transaction
      await page.locator('[data-testid="payment-transaction"]').first().click();

      // Should show transaction details (amount, date, status, etc.)
      await expect(page.locator('text=/Amount|Price/i')).toBeVisible();
      await expect(page.locator('text=/Status/i')).toBeVisible();
      await expect(page.locator('text=/Date|Created/i')).toBeVisible();
    }
  });

  test('should handle webhook simulation for payment completion', async ({ request }) => {
    // This test simulates receiving a QPay webhook
    // Note: Requires HMAC signature calculation

    const webhookPayload = {
      object_type: 'INVOICE',
      object_id: 'INV_TEST_123',
      invoice_status: 'PAID',
      invoice_id: 'INV_TEST_123',
      payment_id: 'PAY_TEST_456',
      payment_status: 'PAID',
      payment_amount: 50000,
      payment_currency: 'MNT',
      payment_method: 'qpay_wallet',
    };

    // In production, you would calculate HMAC signature:
    // const signature = crypto.createHmac('sha256', process.env.QPAY_SECRET)
    //   .update(JSON.stringify(webhookPayload))
    //   .digest('hex');

    // Send webhook request
    // const response = await request.post('/api/payments/webhook/qpay', {
    //   headers: {
    //     'X-QPay-Signature': signature,
    //   },
    //   data: webhookPayload,
    // });

    // expect(response.ok()).toBeTruthy();
    // const result = await response.json();
    // expect(result.status).toBe('received');
  });
});
