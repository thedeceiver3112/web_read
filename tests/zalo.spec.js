const { test, expect } = require('@playwright/test');

test('Zalo PC theme loads authentic DOM, renders stream, and toggles boss key', async ({ page }) => {
  await page.goto('/zalo.html');
  await page.waitForLoadState('domcontentloaded');

  // Verify authentic Zalo Web elements
  const systemBanner = page.locator('.system-banner__container');
  await expect(systemBanner).toBeVisible();

  const activeChat = page.locator('.zalo-conv-item.active .zalo-conv-name');
  await expect(activeChat).toHaveText('Hệ Thống Quản Lý Kho WMS');

  const pinnedMsg = page.locator('#zalo-pinned-msg-text');
  await expect(pinnedMsg).toContainText('Kế hoạch bảo trì định kỳ');

  // Load sample TXT document
  const sampleTxt = 'Chương 1: Khởi đầu bí mật.\\nCuộc hành trình bắt đầu trong một buổi sáng.\\nMọi thứ diễn ra bình thường.';
  await page.evaluate((txt) => {
    const file = new File([txt], 'test_zalo.txt', { type: 'text/plain' });
    const input = document.getElementById('file-pdf-input') || document.getElementById('modal-file-pdf');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, sampleTxt);

  // Wait for chunks to render in #zalo-story-stream
  const stream = page.locator('#zalo-story-stream .zalo-msg-item');
  await expect(stream.first()).toBeVisible({ timeout: 5000 });

  // Test boss key (ESC)
  const chatView = page.locator('#zalo-chat-view');
  const bossView = page.locator('#zalo-boss-view');

  await expect(chatView).toBeVisible();
  await expect(bossView).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(chatView).toBeHidden();
  await expect(bossView).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(chatView).toBeVisible();
  await expect(bossView).toBeHidden();
});
