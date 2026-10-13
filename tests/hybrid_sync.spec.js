const { test, expect } = require('@playwright/test');

test('Google login stays visible and explains missing server configuration', async ({ page }) => {
  await page.route('**/api/auth/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: false, authenticated: false })
  }));
  await page.goto('/googlesheets.html');
  await expect(page.locator('#hybrid-auth-button')).toBeVisible();
  await expect(page.locator('#hybrid-auth-button')).toContainText('Đăng nhập Google');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#hybrid-auth-button').click();
  await expect(page.locator('#universal-reader-navbar')).toBeVisible();
});

test('authenticated user sees account dropdown with clear logout button', async ({ page }) => {
  await page.route('**/api/auth/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      enabled: true,
      authenticated: true,
      csrfToken: 'test-csrf-token',
      user: { displayName: 'Phong Nguyen', email: 'phong@example.com' }
    })
  }));
  let logoutCalled = false;
  await page.route('**/api/auth/logout', route => {
    logoutCalled = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    });
  });

  await page.goto('/index.html?portal=1');
  const authButton = page.locator('#hybrid-auth-button');
  await expect(authButton).toBeVisible();
  await expect(authButton).toContainText('Phong Nguyen');

  // Click account button to toggle dropdown
  await authButton.click();
  const dropdown = page.locator('#hybrid-account-dropdown');
  await expect(dropdown).toBeVisible();
  await expect(dropdown.locator('.hybrid-dropdown-name')).toHaveText('Phong Nguyen');
  await expect(dropdown.locator('.hybrid-dropdown-email')).toHaveText('phong@example.com');
  await expect(dropdown.locator('#btn-hybrid-logout')).toBeVisible();

  await dropdown.locator('#btn-hybrid-logout').click();
  expect(logoutCalled).toBe(true);
  await expect(dropdown).toBeHidden();
  await expect(authButton).toContainText('Đăng nhập Google');
});

test('local document gets a stable SHA-256 fingerprint without uploading content', async ({ page }) => {
  let syncUploadRequests = 0;
  await page.route('**/api/sync/document**', route => {
    syncUploadRequests += 1;
    return route.abort();
  });
  await page.goto('/googlesheets.html');
  await page.locator('#file-pdf-input').setInputFiles({
    name: 'fingerprint.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Noi dung fingerprint local only.\nDong thu hai.', 'utf8')
  });
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => state.documentId)).toMatch(/^sha256-[a-f0-9]{64}$/);
  expect(syncUploadRequests).toBe(0);
});


