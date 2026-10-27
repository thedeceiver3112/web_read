const { test, expect } = require('@playwright/test');

const analyticsPayload = {
  ok: true,
  rangeDays: 30,
  timezone: 'UTC',
  hourlyTimezone: 'UTC+7',
  generatedAt: '2026-10-14T06:30:00Z',
  summary: { visits: 42, uniqueVisitors: 18, sessions: 31, authenticatedUsers: 7, themeViews: 56 },
  daily: [
    { date: '2026-10-13', visits: 17, uniqueVisitors: 9, sessions: 12, authenticatedUsers: 4 },
    { date: '2026-10-14', visits: 25, uniqueVisitors: 12, sessions: 19, authenticatedUsers: 5 }
  ],
  hourly: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    visits: hour === 9 ? 15 : hour % 4,
    uniqueVisitors: hour === 9 ? 11 : hour % 3
  })),
  themes: [
    { theme: 'googlesheets', views: 30, uniqueVisitors: 12 },
    { theme: 'vscode', views: 16, uniqueVisitors: 8 },
    { theme: 'outlook', views: 10, uniqueVisitors: 6 }
  ],
  dailyThemes: [
    { date: '2026-10-14', theme: 'googlesheets', views: 18, uniqueVisitors: 8 },
    { date: '2026-10-14', theme: 'vscode', views: 7, uniqueVisitors: 4 },
    { date: '2026-10-13', theme: 'googlesheets', views: 12, uniqueVisitors: 4 },
    { date: '2026-10-13', theme: 'vscode', views: 9, uniqueVisitors: 4 },
    { date: '2026-10-13', theme: 'outlook', views: 10, uniqueVisitors: 6 }
  ],
  timeSlots: [
    { key: 'morning', label: 'Buổi sáng', hours: '06:00–12:00', icon: '🌅', startHour: 6, endHour: 11, visits: 16, uniqueVisitors: 9 },
    { key: 'afternoon', label: 'Buổi chiều', hours: '12:00–18:00', icon: '☀️', startHour: 12, endHour: 17, visits: 14, uniqueVisitors: 8 },
    { key: 'evening', label: 'Buổi tối', hours: '18:00–24:00', icon: '🌆', startHour: 18, endHour: 23, visits: 6, uniqueVisitors: 4 },
    { key: 'night', label: 'Đêm / Khuya', hours: '00:00–06:00', icon: '🌙', startHour: 0, endHour: 5, visits: 6, uniqueVisitors: 3 },
    { key: 'office', label: 'Giờ làm việc', hours: '08:00–17:00', icon: '💼', startHour: 8, endHour: 16, visits: 24, uniqueVisitors: 11 }
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
  await expect(page.locator('#hourly-chart .hour-column')).toHaveCount(24);
  await expect(page.locator('#peak-hour')).toContainText('09:00–10:00');
  await expect(page.locator('#hourly-chart .hour-column.peak')).toHaveAttribute('title', /15 lượt, 11 người dùng/);
  await expect(page.locator('#theme-table').getByRole('cell', { name: 'Google Sheets', exact: false })).toBeVisible();
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

test('displays time-of-day slots and highlights hours when clicked', async ({ page }) => {
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

  // Verify time slot cards are rendered
  const slots = page.locator('#time-slots-grid .time-slot-card');
  await expect(slots).toHaveCount(5);
  await expect(page.getByText('Buổi sáng')).toBeVisible();
  await expect(page.getByText('Buổi chiều')).toBeVisible();
  await expect(page.getByText('Buổi tối')).toBeVisible();
  await expect(page.getByText('Đêm / Khuya')).toBeVisible();
  await expect(page.getByText('Giờ làm việc')).toBeVisible();

  // Click morning slot
  const morningCard = slots.filter({ hasText: 'Buổi sáng' });
  await morningCard.click();
  await expect(morningCard).toHaveClass(/active/);

  // Non-morning hours (e.g. hour 0) should be dimmed
  await expect(page.locator('#hourly-chart .hour-column').nth(0)).toHaveClass(/dimmed/);
  await expect(page.locator('#hourly-chart .hour-column').nth(9)).not.toHaveClass(/dimmed/);

  // Click again to toggle off
  await morningCard.click();
  await expect(morningCard).not.toHaveClass(/active/);
  await expect(page.locator('#hourly-chart .hour-column').nth(0)).not.toHaveClass(/dimmed/);
});

test('displays daily theme breakdown and supports filtering themes by date', async ({ page }) => {
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

  // Check daily table has theme pills
  const dailyTable = page.locator('#daily-table');
  await expect(dailyTable.getByText('Google Sheets 18')).toBeVisible();
  await expect(dailyTable.getByText('VS Code 7')).toBeVisible();

  // Date filter dropdown should have "Toàn bộ" and dates
  const filter = page.locator('#theme-date-filter');
  await expect(filter).toBeVisible();
  await expect(filter.locator('option')).toHaveCount(3); // 'all', '2026-10-14', '2026-10-13'

  // Filter to 2026-10-14
  await filter.selectOption('2026-10-14');

  // Table should now only show themes on 2026-10-14 (Google Sheets with 18 views, VS Code with 7 views, Outlook NOT present)
  const themeTable = page.locator('#theme-table');
  await expect(themeTable.getByText('Outlook', { exact: true })).toBeHidden();
  await expect(themeTable.getByRole('cell', { name: '18', exact: true })).toBeVisible();
  await expect(themeTable.getByRole('cell', { name: '7', exact: true })).toBeVisible();

  // Click on a daily theme pill for 2026-10-13
  await dailyTable.getByText('Outlook 10').click();

  // Filter dropdown should update to 2026-10-13 and Outlook should now be visible
  await expect(filter).toHaveValue('2026-10-13');
  await expect(themeTable.getByText('Outlook', { exact: true })).toBeVisible();
  await expect(themeTable.getByRole('cell', { name: '10', exact: true })).toBeVisible();

  // Reset filter to all to take full page screenshot
  await filter.selectOption('all');
  await page.screenshot({
    path: 'C:/Users/j05468/.gemini/antigravity/brain/88e0db82-1f24-44a6-b0e4-51188e29e49a/admin_analytics_dashboard.png',
    fullPage: true
  });
});
