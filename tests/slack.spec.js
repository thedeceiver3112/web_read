const { test, expect } = require('@playwright/test');

test.describe('Theme Slack Workspace', () => {
  test('Slack theme loads authentic UI, streams novel messages, auto-loads on scroll, and toggles boss key', async ({ page }) => {
    await page.goto('/slack.html');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify authentic Top Titlebar elements
    const searchInput = page.locator('.slack-search-input');
    await expect(searchInput).toHaveAttribute('placeholder', 'Search A1 Marketing');

    const hamburgerBtn = page.locator('.slack-hamburger-btn');
    await expect(hamburgerBtn).toBeVisible();

    const historyBtn = page.locator('.slack-history-btn');
    await expect(historyBtn).toBeVisible();

    // 2. Verify Leftmost Workspace Dock Rail
    const wsAm1 = page.locator('.slack-workspace-avatar.ws-am1');
    await expect(wsAm1).toHaveText('AM');
    await expect(wsAm1).toHaveClass(/active/);

    const wsAl = page.locator('.slack-workspace-avatar.ws-al');
    await expect(wsAl).toHaveText('AL');

    const wsAm2 = page.locator('.slack-workspace-avatar.ws-am2');
    await expect(wsAm2).toContainText('AM');
    const badge = page.locator('.slack-ws-badge');
    await expect(badge).toHaveText('1');

    // 3. Verify Channel Sidebar Header & Navigation
    const wsTitle = page.locator('#slack-doc-title');
    await expect(wsTitle).toHaveText('A1 Marketing');

    const activeChannel = page.locator('#btn-slack-channel-active');
    await expect(activeChannel).toContainText('social-media');
    await expect(activeChannel).toHaveClass(/active/);

    // 4. Verify Main Header
    const channelTitle = page.locator('.slack-channel-title');
    await expect(channelTitle).toHaveText('# social-media');

    // 5. Verify Right Details Drawer & Toggle
    const detailsDrawer = page.locator('#slack-details-drawer');
    await expect(detailsDrawer).toBeVisible();
    await expect(page.locator('.slack-details-title')).toHaveText('Details');

    const toggleDetailsBtn = page.locator('#btn-toggle-slack-details');
    await toggleDetailsBtn.click();
    await expect(detailsDrawer).toBeHidden();
    await toggleDetailsBtn.click();
    await expect(detailsDrawer).toBeVisible();

    // 6. Verify Favicon (Official Slack SVG)
    const faviconHref = await page.getAttribute('#app-favicon', 'href');
    expect(faviconHref).toContain('data:image/svg+xml');
    expect(faviconHref).toContain('%23e01e5a'); // Slack pink
    expect(faviconHref).toContain('%2336c5f0'); // Slack blue

    // 7. Load multi-paragraph document to test streaming & infinite continuous auto-scroll
    const paragraphs = [];
    for (let i = 1; i <= 200; i++) {
      paragraphs.push(`Tin nhắn đoạn ${i}: Đây là nội dung truyện kiểm thử giao diện Slack tự động cuộn.`);
    }
    const sampleTxt = paragraphs.join('\n');

    await page.evaluate((txt) => {
      const file = new File([txt], 'sample_slack_continuous.txt', { type: 'text/plain' });
      const input = document.getElementById('file-pdf-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sampleTxt);

    // 8. Verify messages stream into #slack-story-stream
    const msgItems = page.locator('#slack-story-stream .slack-msg-item');
    await expect(msgItems.first()).toBeVisible({ timeout: 5000 });
    const initialCount = await msgItems.count();
    expect(initialCount).toBeGreaterThanOrEqual(100);

    // 9. Test Infinite Auto-Scroll: Scroll to bottom of #slack-chat-scroll-container
    await page.evaluate(() => {
      const container = document.getElementById('slack-chat-scroll-container');
      container.scrollTop = container.scrollHeight;
    });

    await page.waitForTimeout(500);

    const loadedCount = await msgItems.count();
    expect(loadedCount).toBeGreaterThan(initialCount);
    expect(loadedCount).toBe(200);

    // 10. Test Boss Mode (ESC Key)
    const storyView = page.locator('#slack-story-view');
    const bossView = page.locator('#slack-boss-view');

    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();

    // Trigger Boss Mode
    await page.keyboard.press('Escape');
    await expect(storyView).toBeHidden();
    await expect(bossView).toBeVisible();
    await expect(bossView).toContainText('Geeta Joshi');
    await expect(bossView).toContainText('Fathina Parveen');
    await expect(bossView).toContainText('Team status meeting');
    await expect(bossView).toContainText('Sandeep Mishra');
    await expect(bossView).toContainText('Meeting notes from our sync with @Madhu');

    // Press Escape again to resume reading
    await page.keyboard.press('Escape');
    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();
  });

  test('Portal displays Slack theme card, allows selection, and navigates to slack.html on double click', async ({ page }) => {
    await page.goto('/index.html?portal=1');
    await page.waitForLoadState('domcontentloaded');

    const slackCard = page.locator('.duo-mission-item[data-theme="theme-slack"]');
    await expect(slackCard).toBeVisible();
    await expect(slackCard.locator('.duo-mission-title')).toHaveText('Slack');

    // Click card to select
    await slackCard.click();
    await expect(slackCard).toHaveClass(/selected/);

    // Double-click to navigate
    await slackCard.dblclick();
    await page.waitForURL(/slack\.html/);
    expect(page.url()).toContain('slack.html');
  });
});
