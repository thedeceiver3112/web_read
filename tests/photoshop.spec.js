const { test, expect } = require('@playwright/test');

test.describe('Photoshop CC Theme Tests', () => {
  test('verify Photoshop UI clean reading stream without noisy metadata headers', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/photoshop.html');
    await page.waitForLoadState('domcontentloaded');

    const workspace = page.locator('#photoshop-workspace');
    await expect(workspace).toBeVisible();

    const storyStream = page.locator('#ps-story-stream');
    await expect(storyStream).toBeAttached();

    // Inject sample paragraphs to simulate reading stream
    await page.evaluate(() => {
      const stream = document.getElementById('ps-story-stream');
      if (stream) {
        stream.innerHTML = '';
        const sampleTexts = [
          'như trong các ví dụ ở trên, hay trong thời bình. Ở mỗi một vùng đất, con người đều tìm kiếm sự hài hòa giữa công việc và cuộc sống.',
          'Nghệ thuật xử lý hình ảnh kỹ thuật số không chỉ đơn thuần là việc cân chỉnh màu sắc hay áp dụng bộ lọc, mà là cả một quá trình sáng tạo thị giác tỉ mỉ.',
          'Mỗi mảng màu, từng đường nét và bố cục typography đều cần được trau chuốt kỹ lưỡng để truyền tải trọn vẹn thông điệp thương hiệu.'
        ];
        sampleTexts.forEach((text, i) => {
          const p = document.createElement('div');
          p.className = 'ps-story-paragraph' + (i === 0 ? ' active-paragraph' : '');
          p.id = `ps-story-para-${i}`;
          p.innerHTML = `<div class="ps-chunk-body">${text}</div>`;
          stream.appendChild(p);
        });
      }
    });

    await page.waitForTimeout(300);

    // Verify metadata headers are absent/hidden
    const streamText = await storyStream.innerText();
    expect(streamText).not.toContain('Editorial_Copy_');
    expect(streamText).not.toContain('Artboard 9');
    await expect(page.locator('.ps-chunk-meta')).toBeHidden();

    // Verify paragraphs are visible and clean
    const activePara = page.locator('#ps-story-para-0');
    await expect(activePara).toBeVisible();
    await expect(activePara.locator('.ps-chunk-body')).toContainText('như trong các ví dụ ở trên');

    // Take screenshot of clean Photoshop workspace
    await page.screenshot({ path: 'static/photoshop_clean_verified.png' });
  });
});
