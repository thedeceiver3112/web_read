const { test, expect } = require('@playwright/test');

test.describe('Email Themes - Gmail and Outlook', () => {
  test('Gmail theme loads authentic UI, streams novel text, and toggles boss key', async ({ page }, testInfo) => {
    await page.goto('/gmail.html');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify authentic Gmail elements
    const brand = page.locator('.gmail-brand-text');
    await expect(brand).toHaveText('Gmail');

    const brandImg = page.locator('.gmail-brand-img');
    await expect(brandImg).toBeVisible();

    const geminiBtn = page.locator('.gmail-gemini-btn');
    await expect(geminiBtn).toBeVisible();

    const upgradePill = page.locator('.gmail-upgrade-pill');
    await expect(upgradePill).toBeVisible();

    const waffleBtn = page.locator('#gbwa');
    await expect(waffleBtn).toBeVisible();

    const composeBtn = page.locator('.gmail-compose-btn');
    await expect(composeBtn).toBeVisible();

    const subjectTitle = page.locator('#gmail-doc-title');
    await expect(subjectTitle).toBeVisible();

    // Verify Favicon
    const faviconHref = await page.getAttribute('#app-favicon', 'href');
    expect(faviconHref).toContain('data:image/svg+xml');
    expect(faviconHref).toContain('%234285F4'); // Google Blue

    // 2. Load sample novel TXT document
    const sampleTxt = 'Chương 1: Bình minh trên thung lũng sương mù.\nÁnh sáng đầu tiên len qua kẽ lá rực rỡ.\nMọi âm thanh của khu rừng bắt đầu thức giấc.';
    await page.evaluate((txt) => {
      const file = new File([txt], 'sample_novel.txt', { type: 'text/plain' });
      const input = document.getElementById('file-pdf-input') || document.getElementById('modal-file-pdf');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sampleTxt);

    // 3. Wait for paragraphs to stream into #gmail-story-stream
    const paras = page.locator('#gmail-story-stream .gmail-story-para');
    await expect(paras.first()).toBeVisible({ timeout: 5000 });
    const count = await paras.count();
    expect(count).toBeGreaterThan(0);

    // Click chunk to activate
    await paras.first().click();
    await expect(paras.first()).toHaveClass(/active-email-para/);

    // Verify paragraphs wrap naturally without horizontal scrolling
    const firstPara = paras.first();
    const paraStyles = await firstPara.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        overflowX: cs.overflowX,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    });
    expect(paraStyles.overflowX).not.toBe('auto');
    expect(paraStyles.scrollWidth).toBeLessThanOrEqual(paraStyles.clientWidth + 2);

    await page.screenshot({ path: testInfo.outputPath('gmail_fixed_scroll.png') });

    // 4. Test Boss Key (Escape)
    const storyView = page.locator('#gmail-story-view');
    const bossView = page.locator('#gmail-boss-view');

    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(storyView).toBeHidden();
    await expect(bossView).toBeVisible();

    // Toggle back
    await page.keyboard.press('Escape');
    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();
  });

  test('Outlook theme loads authentic UI, streams novel text, and toggles boss key', async ({ page }) => {
    await page.goto('/outlook.html');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify authentic Outlook elements
    const title = page.locator('.outlook-title');
    await expect(title).toHaveText('Outlook');

    const appRail = page.locator('.outlook-app-rail');
    await expect(appRail).toBeVisible();

    const msgList = page.locator('.outlook-message-list-pane');
    await expect(msgList).toBeVisible();

    const subjectText = page.locator('#outlook-doc-title');
    await expect(subjectText).toBeVisible();

    // Verify Favicon
    const faviconHref = await page.getAttribute('#app-favicon', 'href');
    expect(faviconHref).toContain('data:image/svg+xml');
    expect(faviconHref).toContain('%230078D4'); // Outlook Blue

    // 2. Load sample novel TXT document
    const sampleTxt = 'Chương 2: Thành phố về đêm lung linh ánh đèn.\nTiếng gió rít nhè nhẹ qua từng góc phố vắng.\nMột câu chuyện kỳ lạ sắp sửa mở ra.';
    await page.evaluate((txt) => {
      const file = new File([txt], 'sample_novel.txt', { type: 'text/plain' });
      const input = document.getElementById('file-pdf-input') || document.getElementById('modal-file-pdf');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sampleTxt);

    // 3. Wait for paragraphs to stream into #outlook-story-stream
    const paras = page.locator('#outlook-story-stream .outlook-story-para');
    await expect(paras.first()).toBeVisible({ timeout: 5000 });
    const count = await paras.count();
    expect(count).toBeGreaterThan(0);

    // Click chunk to activate
    await paras.first().click();
    await expect(paras.first()).toHaveClass(/active-outlook-para/);

    // Verify paragraphs wrap naturally without horizontal scrolling
    const firstPara = paras.first();
    const paraStyles = await firstPara.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        overflowX: cs.overflowX,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    });
    expect(paraStyles.overflowX).not.toBe('auto');
    expect(paraStyles.scrollWidth).toBeLessThanOrEqual(paraStyles.clientWidth + 2);

    // 4. Test Boss Key (Escape)
    const storyView = page.locator('#outlook-story-view');
    const bossView = page.locator('#outlook-boss-view');

    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(storyView).toBeHidden();
    await expect(bossView).toBeVisible();

    // Toggle back
    await page.keyboard.press('Escape');
    await expect(storyView).toBeVisible();
    await expect(bossView).toBeHidden();
  });

  test('Index home page displays Gmail and Outlook in portal theme selector', async ({ page }, testInfo) => {
    await page.goto('/index.html?portal=1');
    await page.waitForLoadState('domcontentloaded');

    const gmailCard = page.locator('.duo-mission-item[data-theme="theme-gmail"]');
    await expect(gmailCard).toBeVisible();
    await expect(gmailCard.locator('.duo-mission-title')).toHaveText('Gmail');

    const outlookCard = page.locator('.duo-mission-item[data-theme="theme-outlook"]');
    await expect(outlookCard).toBeVisible();
    await expect(outlookCard.locator('.duo-mission-title')).toHaveText('Outlook');

    // Select Gmail
    await gmailCard.click();
    await expect(gmailCard).toHaveClass(/selected/);

    // Select Outlook
    await outlookCard.click();
    await expect(outlookCard).toHaveClass(/selected/);
    await expect(gmailCard).not.toHaveClass(/selected/);

    // Test upload card with loaded file
    const sampleTxt = 'Chương 1: Bình minh trên thung lũng sương mù.';
    await page.evaluate((txt) => {
      const file = new File([txt], 'Le_Giang_Sinh_Cua_Ac_Ma.txt', { type: 'text/plain' });
      const input = document.getElementById('portal-file-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sampleTxt);

    const uploadCard = page.locator('#portal-upload-card');
    await expect(uploadCard).toHaveClass(/has-doc/);
    const enterBtn = page.locator('#btn-portal-enter');
    await expect(enterBtn).toHaveClass(/ready/);
    await expect(enterBtn).toContainText('Bắt Đầu Đọc Ngay');

    await page.locator('.portal-col-main').screenshot({ path: testInfo.outputPath('portal_redesigned.png') });
  });
});
