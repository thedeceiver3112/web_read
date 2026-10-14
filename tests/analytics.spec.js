const { test, expect } = require('@playwright/test');

test('tracks one visit and one view per theme in a tab session', async ({ page }) => {
  const events = [];
  await page.route('**/api/auth/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: false, authenticated: false })
  }));
  await page.route('**/api/analytics/event', route => {
    events.push(route.request().postDataJSON());
    return route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, recorded: true })
    });
  });

  await page.goto('/googlesheets.html');
  await expect.poll(() => events.length).toBe(2);
  const firstVisitorId = events[0].visitorId;
  const firstSessionId = events[0].sessionId;

  await page.reload();
  await page.waitForTimeout(250);
  expect(events).toHaveLength(2);

  await page.goto('/vscode.html');
  await expect.poll(() => events.length).toBe(3);

  expect(events.map(event => event.eventType)).toEqual(['visit', 'theme_view', 'theme_view']);
  expect(events.filter(event => event.eventType === 'theme_view').map(event => event.theme)).toEqual(['googlesheets', 'vscode']);
  expect(events.every(event => event.visitorId === firstVisitorId)).toBe(true);
  expect(events.every(event => event.sessionId === firstSessionId)).toBe(true);
  expect(events.every(event => !('documentId' in event) && !('fileName' in event) && !('content' in event))).toBe(true);
});

