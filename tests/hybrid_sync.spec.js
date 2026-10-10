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
