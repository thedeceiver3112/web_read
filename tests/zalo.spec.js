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

test('Zalo PC collapses sidebars and protects text from squishing on small screens', async ({ page }) => {
  // Resize to small mobile screen (550px width)
  await page.setViewportSize({ width: 550, height: 750 });
  await page.goto('/zalo.html');
  await page.waitForLoadState('domcontentloaded');

  const infoSidebar = page.locator('.zalo-info-sidebar');
  const chatListPane = page.locator('.zalo-chat-list-pane');
  const chatMainPane = page.locator('.zalo-chat-main-pane');
  const headerSub = page.locator('#zalo-header-sub');
  const toggleConvsBtn = page.locator('#zalo-toggle-convs-btn');

  // Verify sidebars are automatically hidden to prioritize reading pane
  await expect(infoSidebar).toBeHidden();
  await expect(chatListPane).toBeHidden();
  await expect(chatMainPane).toBeVisible();

  // Chat main pane should take up most of the screen width (> 450px)
  const chatBox = await chatMainPane.boundingBox();
  expect(chatBox.width).toBeGreaterThan(450);

  // Toggle convs button should be visible on small screen
  await expect(toggleConvsBtn).toBeVisible();

  // Verify header-sub text does NOT stack vertically (height should be single-line ~ 15-25px, not vertically stacked)
  const subBox = await headerSub.boundingBox();
  expect(subBox.height).toBeLessThan(30);

  const whiteSpace = await headerSub.evaluate(el => window.getComputedStyle(el).whiteSpace);
  expect(whiteSpace).toBe('nowrap');

  // Non-essential header action buttons should be hidden
  const hiddenBtn = page.locator('.zalo-hide-sm').first();
  await expect(hiddenBtn).toBeHidden();
});

test('Zalo PC overlay drawers toggle and dismiss cleanly on narrow viewports', async ({ page }) => {
  await page.setViewportSize({ width: 650, height: 750 });
  await page.goto('/zalo.html');
  await page.waitForLoadState('domcontentloaded');

  const container = page.locator('#container');
  const chatListPane = page.locator('.zalo-chat-list-pane');
  const infoSidebar = page.locator('.zalo-info-sidebar');
  const backdrop = page.locator('#zalo-pane-backdrop');

  const toggleConvsBtn = page.locator('#zalo-toggle-convs-btn');
  const toggleInfoBtn = page.locator('#zalo-toggle-info-btn');

  // 1. Open conversation list overlay
  await toggleConvsBtn.click();
  await expect(container).toHaveClass(/zalo-convs-open/);
  await expect(chatListPane).toBeVisible();
  await expect(backdrop).toBeVisible();

  // Dismiss by clicking backdrop
  await backdrop.click({ position: { x: 450, y: 300 } });
  await expect(container).not.toHaveClass(/zalo-convs-open/);
  await expect(chatListPane).toBeHidden();
  await expect(backdrop).toBeHidden();

  // 2. Open info sidebar overlay
  await toggleInfoBtn.click();
  await expect(container).toHaveClass(/zalo-info-open/);
  await expect(infoSidebar).toBeVisible();
  await expect(backdrop).toBeVisible();

  // Dismiss via close button
  const closeInfoBtn = page.locator('#zalo-close-info-btn');
  await closeInfoBtn.click();
  await expect(container).not.toHaveClass(/zalo-info-open/);
  await expect(infoSidebar).toBeHidden();

  // 3. Auto-close conversation list when clicking a conversation item
  await toggleConvsBtn.click();
  await expect(chatListPane).toBeVisible();
  const convItem = page.locator('.zalo-conv-item').nth(1);
  await convItem.click();
  await expect(container).not.toHaveClass(/zalo-convs-open/);
  await expect(chatListPane).toBeHidden();
});

test('Zalo PC allows closing conversation list with the small close button on desktop and reopening via header or rail tab', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/zalo.html');
  await page.waitForLoadState('domcontentloaded');

  const container = page.locator('#container');
  const chatListPane = page.locator('.zalo-chat-list-pane');
  const closeConvsBtn = page.locator('#zalo-close-convs-btn');
  const toggleConvsBtn = page.locator('#zalo-toggle-convs-btn');
  const msgRailTab = page.locator('[data-id="div_Main_TabMsg"]');

  // Button should be visible on desktop
  await expect(closeConvsBtn).toBeVisible();
  await expect(chatListPane).toBeVisible();

  // Click small close button to collapse conversation list
  await closeConvsBtn.click();
  await expect(container).toHaveClass(/zalo-convs-collapsed/);
  await expect(chatListPane).toBeHidden();

  // Toggle button in header should now be visible to allow reopening
  await expect(toggleConvsBtn).toBeVisible();
  await toggleConvsBtn.click();
  await expect(container).not.toHaveClass(/zalo-convs-collapsed/);
  await expect(chatListPane).toBeVisible();

  // Also test reopening via the blue rail tab 'Tin nhắn'
  await closeConvsBtn.click();
  await expect(chatListPane).toBeHidden();
  await msgRailTab.click();
  await expect(container).not.toHaveClass(/zalo-convs-collapsed/);
  await expect(chatListPane).toBeVisible();
});

test('Zalo PC displays authentic group/animal/human avatars and gray pin/mute icons', async ({ page }) => {
  await page.goto('/zalo.html');
  await page.waitForLoadState('domcontentloaded');

  // Verify Pin icon is SVG and gray
  const pinIcon = page.locator('.zalo-pin-icon svg').first();
  await expect(pinIcon).toBeVisible();
  const pinFill = await pinIcon.getAttribute('fill');
  expect(pinFill.toLowerCase()).toBe('#72808e');

  // Verify Mute icon is SVG and gray
  const muteIcon = page.locator('.zalo-mute-icon svg').first();
  await expect(muteIcon).toBeVisible();
  const muteFill = await muteIcon.getAttribute('fill');
  expect(muteFill.toLowerCase()).toBe('#72808e');

  // Verify group avatar images exist and load
  const deskAvatar = page.locator('.zalo-conv-item.active img.zalo-conv-img');
  await expect(deskAvatar).toHaveAttribute('src', 'assets/zalo_avatars/work_desk.png');

  // Verify header avatar is work desk
  const headerAvatar = page.locator('.zalo-header-avatar img');
  await expect(headerAvatar).toHaveAttribute('src', 'assets/zalo_avatars/work_desk.png');

  // Verify right sidebar big avatar is work desk
  const bigAvatar = page.locator('.zalo-group-big-avatar img');
  await expect(bigAvatar).toHaveAttribute('src', 'assets/zalo_avatars/work_desk.png');

  // Verify animal/people avatar images exist
  const convImages = page.locator('.zalo-conv-img');
  const count = await convImages.count();
  expect(count).toBeGreaterThanOrEqual(10);
});

test('Zalo PC story stream has no disruptive "Đoạn #" tags and uses authentic uniform gray outline icons', async ({ page }) => {
  await page.goto('/zalo.html');
  await page.waitForLoadState('domcontentloaded');

  // Load sample TXT document
  const sampleTxt = 'Chương 1: Đoạn văn thử nghiệm dòng chảy truyện.\\nĐoạn văn tiếp theo không bị cắt đứt.';
  await page.evaluate((txt) => {
    const file = new File([txt], 'test_flow.txt', { type: 'text/plain' });
    const input = document.getElementById('file-pdf-input') || document.getElementById('modal-file-pdf');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, sampleTxt);

  const streamMsg = page.locator('#zalo-story-stream .zalo-msg-item').first();
  await expect(streamMsg).toBeVisible({ timeout: 5000 });

  // Verify that "Đoạn #" is completely gone from the bubble
  const streamText = await streamMsg.innerText();
  expect(streamText).not.toContain('Đoạn #');

  // Verify input toolbar icons are SVGs
  const toolIcons = page.locator('.zalo-tool-icon svg');
  const toolCount = await toolIcons.count();
  expect(toolCount).toBeGreaterThanOrEqual(9);

  // Verify that empty chunks (blank lines) do NOT create empty bubbles
  const allBubbles = page.locator('#zalo-story-stream .zalo-msg-text');
  const bubbleCount = await allBubbles.count();
  for (let i = 0; i < bubbleCount; i++) {
    const text = (await allBubbles.nth(i).innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
  }
});


