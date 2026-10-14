const { test, expect } = require('@playwright/test');

const analyticsPayload = {
  ok: true,
  rangeDays: 30,
  timezone: 'UTC',
  generatedAt: '2026-10-14T06:30:00Z',
  summary: { visits: 42, uniqueVisitors: 18, sessions: 31, authenticatedUsers: 7, themeViews: 56 },
  daily: [
    { date: '2026-10-13', visits: 17, uniqueVisitors: 9, sessions: 12, authenticatedUsers: 4 },
    { date: '2026-10-14', visits: 25, uniqueVisitors: 12, sessions: 19, authenticatedUsers: 5 }
  ],
  themes: [
    { theme: 'googlesheets', views: 30, uniqueVisitors: 12 },
    { theme: 'vscode', views: 16, uniqueVisitors: 8 }
  ]
};

test('requires Google login before showing analytics', async ({ page }) => {
  await page.route('**/api/auth/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true, authenticated: false })
  }));

  await page.goto('/admin-analytics.html');
  await expect(page.getByRole('heading', { name: 'Cần đăng nhập' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Đăng nhập Google' })).toHaveAttribute('href', /return=%2Fadmin-analytics\.html/);
  await expect(page.locator('#dashboard')).toBeHidden();
});

test('renders aggregate analytics for an authorized admin', async ({ page }) => {
  await page.route('**/api/auth/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true, authenticated: true, user: { email: 'nguyentranhaiphong2@gmail.com', displayName: 'Hai Phong' } })
  }));
  await page.route('**/api/admin/analytics?range=30', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(analyticsPayload)
  }));

  await page.goto('/admin-analytics.html');
  await expect(page.locator('#stat-visits')).toHaveText('42');
  await expect(page.locator('#stat-visitors')).toHaveText('18');
  await expect(page.getByRole('cell', { name: 'Google Sheets', exact: false })).toBeVisible();
  await expect(page.getByText('Hai Phong')).toBeVisible();
});

test('shows a clear error when the signed-in account is not an admin', async ({ page }) => {
  await page.route('**/api/auth/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true, authenticated: true, user: { email: 'viewer@example.com', displayName: 'Viewer' } })
  }));
  await page.route('**/api/admin/analytics?range=30', route => route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Tài khoản này không có quyền xem thống kê' })
  }));

  await page.goto('/admin-analytics.html');
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  await expect(page.getByText('Tài khoản này không có quyền xem thống kê')).toBeVisible();
  await expect(page.locator('#dashboard')).toBeHidden();
});
