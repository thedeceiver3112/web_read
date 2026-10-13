const { test, expect } = require('@playwright/test');

test.describe('Theme Jira Software', () => {
  test('Jira theme loads authentic Beyond Gravity Board UI, streams story text, auto-loads on scroll, and toggles boss kanban board', async ({ page }) => {
    await page.goto('/jira.html');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify authentic Jira Header elements
    const logoText = page.locator('.jira-logo-text');
    await expect(logoText).toHaveText('Jira');

    const appSwitcher = page.locator('.jira-app-switcher');
    await expect(appSwitcher).toBeVisible();

    const createBtn = page.locator('.jira-btn-create');
    await expect(createBtn).toHaveText('Create');

    // 2. Verify Project Sidebar (Beyond Gravity)
    const projectName = page.locator('.jira-project-name');
    await expect(projectName).toHaveText('Beyond Gravity');

    const sidebarLinks = page.locator('.jira-sidebar-link');
    expect(await sidebarLinks.count()).toBeGreaterThan(3);

    // 3. Verify Breadcrumbs and Title
    const issueBadge = page.locator('#jira-issue-key-badge');
    await expect(issueBadge).toHaveText('NUC-342');

    const issueTitle = page.locator('#jira-doc-title');
    await expect(issueTitle).toBeVisible();

    // 4. Verify Side Metadata
    const statusBadge = page.locator('.jira-status-badge.in-progress');
    await expect(statusBadge).toContainText('IN PROGRESS');

    // 5. Verify Favicon
    const faviconHref = await page.getAttribute('#app-favicon', 'href');
    expect(faviconHref).toContain('data:image/svg+xml');
    expect(faviconHref).toContain('%230052cc');

    // 6. Load a multi-page novel TXT document to verify infinite continuous scrolling
    const paragraphs = [];
    for (let i = 1; i <= 200; i++) {
      paragraphs.push(`Đoạn văn thứ ${i}: Đây là nội dung truyện kiểm thử tính năng tự động tải tiếp khi cuộn.`);
    }
    const sampleTxt = paragraphs.join('\n');

    await page.evaluate((txt) => {
      const file = new File([txt], 'sample_jira_continuous.txt', { type: 'text/plain' });
      const input = document.getElementById('file-pdf-input') || document.getElementById('modal-file-pdf');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sampleTxt);

    // 7. Verify items stream into #jira-story-stream
    const logItems = page.locator('#jira-story-stream .jira-log-item');
    await expect(logItems.first()).toBeVisible({ timeout: 5000 });
    const initialCount = await logItems.count();
    expect(initialCount).toBeGreaterThan(0);
    expect(initialCount).toBeLessThan(200);

    // 8. Click item to activate
    await logItems.first().click();
    await expect(logItems.first()).toHaveClass(/active-jira-item/);

    // 9. Test Auto-Loading on Scroll (No need to click next page button)
    await page.evaluate(() => {
      const scrollContainer = document.getElementById('jira-issue-scroll-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight - 200;
        scrollContainer.dispatchEvent(new Event('scroll'));
      }
    });

    // Wait for auto-loaded batch
    await page.waitForTimeout(300);
    const newCount = await logItems.count();
    expect(newCount).toBeGreaterThan(initialCount);

    // 10. Test Boss Key (Escape)
    const storyView = page.locator('#jira-story-view');
    const bossView = page.locator('#jira-boss-view');

    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();

    // Press Escape to activate Boss Mode
    await page.keyboard.press('Escape');
    await expect(storyView).toBeHidden();
    await expect(bossView).toBeVisible();

    // Verify Beyond Gravity Board columns
    const kanbanCols = page.locator('.jira-board-col');
    expect(await kanbanCols.count()).toBe(4);
    await expect(page.locator('.jira-col-header').first()).toContainText('TO DO');

    // Press Escape again to exit Boss Mode
    await page.keyboard.press('Escape');
    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();
  });

  test('Portal displays Jira theme card, allows selection, and navigates to jira.html on double click', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');

    const jiraCard = page.locator('.duo-mission-item[data-theme="theme-jira"]');
    await expect(jiraCard).toBeVisible();
    await expect(jiraCard.locator('.duo-mission-title')).toHaveText('Jira');

    // Click selects the card
    await jiraCard.click();
    await expect(jiraCard).toHaveClass(/selected/);

    // Double-click navigates to jira.html
    await jiraCard.dblclick();
    await page.waitForURL(/jira\.html/);
    expect(page.url()).toContain('jira.html');
  });
});
