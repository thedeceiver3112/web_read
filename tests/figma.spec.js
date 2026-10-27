const { test, expect } = require('@playwright/test');

test.describe('Figma UI3 Theme Tests', () => {
  test('verify Figma UI3 full layout, sticky left artboard, and dark mode', async ({ page }) => {
    // Ensure clean state with WEMAKEFOOD title and light mode
    await page.addInitScript(() => {
      localStorage.setItem('stealth_title_figma', 'WEMAKEFOOD');
      localStorage.setItem('figma_theme_mode', 'light');
    });

    // 1. Navigate to Figma theme page
    await page.goto('http://127.0.0.1:8080/figma.html');
    await page.waitForLoadState('domcontentloaded');

    // 2. Check title
    await expect(page).toHaveTitle(/Figma/);

    // 3. Verify 57px Left Rail Navigation
    const rail = page.locator('.figma-nav-rail');
    await expect(rail).toBeVisible();
    const railBox = await rail.boundingBox();
    expect(railBox.width).toBeCloseTo(57, 1);

    // Check rail buttons
    const fileBtn = rail.locator('button[aria-label="File"]');
    const agentsBtn = rail.locator('button[aria-label="Agents"]');
    await expect(fileBtn).toHaveClass(/active/);
    await agentsBtn.click();
    await expect(agentsBtn).toHaveClass(/active/);
    await expect(fileBtn).not.toHaveClass(/active/);
    await fileBtn.click();
    await expect(fileBtn).toHaveClass(/active/);

    // 4. Verify 240px Left Panel (Pages & Layers tree)
    const leftPanel = page.locator('#figma-left-panel');
    await expect(leftPanel).toBeVisible();
    const leftPanelBox = await leftPanel.boundingBox();
    expect(leftPanelBox.width).toBeCloseTo(240, 2);

    // Check document title
    const docTitle = page.locator('#figma-doc-title');
    await expect(docTitle).toHaveText('WEMAKEFOOD');

    // Check layer rows
    const aboutLayer = page.locator('.figma-tree-row[data-layer="About"]');
    await expect(aboutLayer).toBeVisible();
    await expect(aboutLayer).toHaveClass(/active/);

    const bannerLayer = page.locator('.figma-tree-row[data-layer="BANNER"]');
    await expect(bannerLayer).toBeVisible();
    await bannerLayer.click();
    await expect(bannerLayer).toHaveClass(/active/);
    await expect(aboutLayer).not.toHaveClass(/active/);

    // Test minimize panel button
    const minBtn = page.locator('#figma-btn-toggle-left');
    await minBtn.click();
    await expect(leftPanel).toHaveClass(/minimized/);
    // Click File button on rail to restore left panel
    await fileBtn.click();
    await expect(leftPanel).not.toHaveClass(/minimized/);

    // 5. Verify Canvas Viewport & Artboards
    const canvasViewport = page.locator('#figma-canvas-scroll-container');
    await expect(canvasViewport).toBeVisible();

    // WEMAKEFOOD food artboard
    const foodFrame = page.locator('#figma-wemakefood-frame');
    await expect(foodFrame).toBeVisible();
    await expect(page.locator('.food-logo-badge')).toHaveText('WEMAKEFOOD');
    await expect(page.locator('#figma-placed-image')).toBeVisible();
    await expect(page.locator('#btn-replace-image-figma')).toBeVisible();

    // Story reading artboard
    const readingArtboard = page.locator('#figma-reading-artboard');
    await expect(readingArtboard).toBeVisible();
    const storyStream = page.locator('#figma-story-stream');
    await expect(storyStream).toBeAttached();

    // Inject clean text stream without noisy 'T Body_Copy_Block' or 'AutoLayout' meta tags
    await page.evaluate(() => {
      const stream = document.getElementById('figma-story-stream');
      if (stream) {
        stream.innerHTML = `
          <div class="figma-layer-item active-layer" id="figma-layer-0">
            <div class="figma-text-layer">Nhà hàng WEMAKEFOOD ra đời từ niềm đam mê ẩm thực nguyên bản và tình yêu sâu sắc dành cho các nguyên liệu hữu cơ thuần khiết. Từng món ăn là một tác phẩm được kết hợp hài hòa giữa hương vị truyền thống và phong cách chế biến hiện đại.</div>
          </div>
        `;
        for (let i = 1; i <= 30; i++) {
          const item = document.createElement('div');
          item.className = 'figma-layer-item';
          item.id = `figma-layer-${i}`;
          item.innerHTML = `
            <div class="figma-text-layer">Đoạn văn số ${i}: Dưới bàn tay khéo léo của bếp trưởng, những miếng thịt bò Wagyu vân mỡ thượng hạng được nướng chậm trên than củi sồi, giữ trọn vẹn vị ngọt thanh mát tự nhiên cùng hương thơm nồng nàn quyến rũ. Các nguyên liệu rau củ hữu cơ được thu hoạch trong ngày để đảm bảo độ tươi giòn tinh tế nhất.</div>
          `;
          stream.appendChild(item);
        }
      }
    });

    // Verify stream text is clean and distraction-free
    const streamText = await storyStream.innerText();
    expect(streamText).not.toContain('Body_Copy_Block');
    expect(streamText).not.toContain('AutoLayout');
    await expect(page.locator('.figma-layer-meta')).toBeHidden();

    // 6. Test Pinned / Sticky behavior of left artboard when scrolling down
    const beforeScrollY = (await foodFrame.boundingBox()).y;
    // Scroll down canvas by 600px
    await page.evaluate(() => {
      const scroller = document.getElementById('figma-canvas-scroll-container');
      scroller.scrollTop = 600;
    });
    await page.waitForTimeout(200);

    const afterScrollY = (await foodFrame.boundingBox()).y;
    // Pinned artboard should remain fixed at top, difference within a few pixels of sticky offset
    expect(Math.abs(afterScrollY - beforeScrollY)).toBeLessThan(50);
    expect(afterScrollY).toBeGreaterThan(0); // Still fully visible on screen!

    // Reset scroll position
    await page.evaluate(() => {
      document.getElementById('figma-canvas-scroll-container').scrollTop = 0;
    });
    await page.waitForTimeout(100);

    // 7. Verify 241px Right Properties Panel
    const rightPanel = page.locator('#figma-right-panel');
    await expect(rightPanel).toBeVisible();
    const rightPanelBox = await rightPanel.boundingBox();
    expect(rightPanelBox.width).toBeCloseTo(241, 2);

    // User avatar
    const userAvatar = page.locator('.figma-avatar-circle');
    await expect(userAvatar).toBeVisible();
    await expect(userAvatar).toHaveText('N');

    // Design / Prototype tabs
    const tabProto = page.locator('#figma-tab-proto');
    const tabDesign = page.locator('#figma-tab-design');
    await tabProto.click();
    await expect(tabProto).toHaveClass(/active/);
    await expect(tabDesign).not.toHaveClass(/active/);
    await tabDesign.click();
    await expect(tabDesign).toHaveClass(/active/);

    // Callout card for AI agents
    await expect(page.locator('.figma-agents-callout-card')).toBeVisible();

    // Font size stepper controls
    const fontVal = page.locator('#figma-font-val');
    await expect(fontVal).toBeVisible();
    const btnInc = page.locator('#figma-btn-font-inc');
    const btnDec = page.locator('#figma-btn-font-dec');
    await btnInc.click();
    await btnDec.click();

    // 8. Verify Floating Bottom Toolbelt
    const toolbelt = page.locator('#positioned_design_toolbelt');
    await expect(toolbelt).toBeVisible();

    const toolMove = toolbelt.locator('button[data-tool="move"]');
    const toolText = toolbelt.locator('button[data-tool="text"]');
    await expect(toolMove).toHaveClass(/active/);
    await toolText.click();
    await expect(toolText).toHaveClass(/active/);
    await expect(toolMove).not.toHaveClass(/active/);

    // 9. Test Prototype / Boss Key presentation view
    const bossBtn = page.locator('#btn-boss-key-figma');
    await bossBtn.click();
    const bossView = page.locator('#figma-boss-view');
    await expect(bossView).toBeVisible();
    
    // Press Escape to exit boss mode
    await page.keyboard.press('Escape');
    await expect(bossView).not.toBeVisible();

    // 10. Take verified Light Mode screenshot (controls hidden via 'H')
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'static/figma_ui3_stealth_clean.png', fullPage: false });

    // Press 'H' again to restore controls
    await page.keyboard.press('h');
    await page.waitForTimeout(200);

    // 11. Test Dark Mode toggle
    const themeToggleBtn = page.locator('#figma-theme-toggle-btn');
    await expect(themeToggleBtn).toBeVisible();
    await themeToggleBtn.click();

    // Verify dark mode class on body
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark/);
    await expect(body).toHaveClass(/dark-mode/);

    // Verify Page color hex input updated to 1E1E1E
    const hexInput = page.locator('#figma-page-color-hex');
    await expect(hexInput).toHaveValue('1E1E1E');

    // Take screenshot of Dark Mode with controls
    await page.screenshot({ path: 'static/figma_ui3_dark_mode.png', fullPage: false });

    // Press 'H' to take Clean Dark Mode screenshot (full immersive desktop Figma UI3 dark)
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'static/figma_ui3_dark_clean.png', fullPage: false });

    // Test Alt+D shortcut toggles back to light mode
    await page.keyboard.press('Alt+d');
    await page.waitForTimeout(200);
    await expect(body).not.toHaveClass(/dark/);
    await expect(hexInput).toHaveValue('F5F5F5');
  });
});
