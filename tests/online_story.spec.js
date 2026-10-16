const { test, expect } = require('@playwright/test');

const SEARCH_RESULT = {
  success: true,
  total: 1,
  data: [{
    source: 's1',
    story_id: 'mao-son-test',
    title: 'Mao Sơn Tróc Quỷ Nhân',
    author: 'Thanh Tử',
    latest_chapter: 'Chương 3'
  }]
};

const STORY_RESULT = {
  success: true,
  data: {
    source: 's1',
    story_id: 'mao-son-test',
    title: 'Mao Sơn Tróc Quỷ Nhân',
    author: 'Thanh Tử',
    chapters: [
      { title: 'Chương 1: Khởi đầu', chapter_id: 'chuong-1' },
      { title: 'Chương 2: Lên đường', chapter_id: 'chuong-2' },
      { title: 'Chương 3: Biến cố', chapter_id: 'chuong-3' }
    ]
  }
};

function chapterPayload(number) {
  return {
    success: true,
    data: {
      source: 's1',
      story_id: 'mao-son-test',
      chapter_id: `chuong-${number}`,
      truyen_title: 'Mao Sơn Tróc Quỷ Nhân',
      chapter_title: `Chương ${number}`,
      total_lines: 40,
      paragraphs: Array.from(
        { length: 40 },
        (_, index) => `Nội dung chương ${number}, đoạn thứ ${index + 1}. Đây là nội dung kiểm thử cuộn đọc.`
      )
    }
  };
}

async function mockOnlineApi(page, options = {}) {
  let chapterCalls = 0;
  await page.route('**/api/online-story/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/').pop();
    if (endpoint === 'search') return route.fulfill({ json: SEARCH_RESULT });
    if (endpoint === 'story') return route.fulfill({ json: STORY_RESULT });
    if (endpoint === 'chapter') {
      chapterCalls += 1;
      if (options.failFirstChapter && chapterCalls === 1) {
        return route.fulfill({ status: 503, body: 'Service unavailable' });
      }
      const chapterNumber = Number((url.searchParams.get('chapter') || '').split('-').pop()) || 1;
      return route.fulfill({ json: chapterPayload(chapterNumber) });
    }
    return route.abort();
  });
  return () => chapterCalls;
}

async function searchAndSelectStory(page) {
  await page.goto('/index.html?portal=1');
  await page.click('#online-story-toggle');
  await page.fill('#online-story-query', 'mao sơn');
  await page.click('#online-story-search-button');
  await expect(page.locator('.online-story-result')).toHaveCount(1);
  await page.click('.online-story-result');
  await expect(page.locator('.online-story-chapter')).toHaveCount(3);
}

test('tìm truyện online, chọn chương và lưu vào thư viện local', async ({ page }) => {
  await mockOnlineApi(page);
  await searchAndSelectStory(page);
  await page.locator('.online-story-chapter').first().click();

  await expect(page.locator('#portal-pdf-filename')).toContainText('Mao Sơn Tróc Quỷ Nhân');
  await expect(page.locator('#btn-portal-enter')).toHaveClass(/ready/);

  const readerState = await page.evaluate(() => ({
    name: state.pdfFileName,
    type: state.documentFileType,
    page: state.currentPage,
    totalPages: state.totalPages,
    chapterIndex: state.onlineStory?.currentChapterIndex,
    text: state.allChunks.map(chunk => chunk.text).join(' ')
  }));
  expect(readerState).toMatchObject({
    name: 'Mao Sơn Tróc Quỷ Nhân',
    type: 'online',
    page: 1,
    totalPages: 3,
    chapterIndex: 0
  });
  expect(readerState.text).toContain('Nội dung chương 1');
});

test('nút trang sau tải chương kế tiếp theo yêu cầu', async ({ page }) => {
  const getChapterCalls = await mockOnlineApi(page);
  await searchAndSelectStory(page);
  await page.locator('.online-story-chapter').first().click();
  await expect.poll(() => page.evaluate(() => state.onlineStory?.currentChapterIndex)).toBe(0);
  await page.evaluate(() => changePage(1));

  await expect.poll(() => page.evaluate(() => state.currentPage)).toBe(2);
  await expect.poll(() => page.evaluate(() => state.allChunks[0]?.text)).toContain('chương 2');
  expect(getChapterCalls()).toBe(2);
});

test('tự thử lại khi nguồn chương trả lỗi 503 tạm thời', async ({ page }) => {
  const getChapterCalls = await mockOnlineApi(page, { failFirstChapter: true });
  await searchAndSelectStory(page);
  await page.locator('.online-story-chapter').first().click();

  await expect.poll(() => page.evaluate(() => state.documentFileType)).toBe('online');
  expect(getChapterCalls()).toBe(2);
  await expect(page.locator('#reader-error-modal.open')).toHaveCount(0);
});

test('hiện nút nhỏ ở cuối chương và chỉ chuyển chương khi người đọc bấm', async ({ page }) => {
  const getChapterCalls = await mockOnlineApi(page);
  await searchAndSelectStory(page);
  await page.locator('.online-story-chapter').first().click();
  await page.evaluate(() => closePortal());

  const canScroll = await page.evaluate(() => {
    const container = getActiveScrollContainer();
    return Boolean(container && container.scrollHeight > container.clientHeight);
  });
  expect(canScroll).toBe(true);

  await page.evaluate(() => {
    const container = getActiveScrollContainer();
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll'));
  });

  const nextRow = page.locator('#online-chapter-next-row');
  await expect(nextRow).toBeVisible();
  const nextButton = nextRow.locator('#online-chapter-next-button');
  await expect(nextButton).toBeVisible();
  const tagName = await nextRow.evaluate(el => el.tagName);
  expect(tagName).toBe('TR');
  const nextBox = await nextButton.boundingBox();
  expect(nextBox.width).toBeLessThanOrEqual(130);
  expect(nextBox.height).toBeLessThanOrEqual(40);
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => state.currentPage)).toBe(1);
  expect(getChapterCalls()).toBe(1);

  await nextButton.click();
  await expect.poll(() => page.evaluate(() => state.currentPage), { timeout: 5000 }).toBe(2);
  await expect.poll(() => page.evaluate(() => state.allChunks[0]?.text)).toContain('chương 2');
  expect(getChapterCalls()).toBe(2);

  await page.evaluate(() => {
    const container = getActiveScrollContainer();
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll'));
  });
  await expect(nextButton).toBeVisible();
  await nextButton.click();
  await expect.poll(() => page.evaluate(() => state.currentPage), { timeout: 5000 }).toBe(3);
  await page.evaluate(() => {
    const container = getActiveScrollContainer();
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll'));
  });
  await expect(nextButton).toBeHidden();
  expect(getChapterCalls()).toBe(3);
});

test('nút next chương vẫn hiện ở cuối khi ẩn thanh công cụ (controls-hidden)', async ({ page }) => {
  const getChapterCalls = await mockOnlineApi(page);
  await searchAndSelectStory(page);
  await page.locator('.online-story-chapter').first().click();
  await page.evaluate(() => closePortal());

  // Hide controls (navbar, toolbars) with 'h'
  await page.keyboard.press('h');
  expect(await page.evaluate(() => document.body.classList.contains('controls-hidden'))).toBe(true);

  // Scroll to bottom
  await page.evaluate(() => {
    const container = getActiveScrollContainer();
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll'));
  });

  const nextButton = page.locator('#online-chapter-next-button');
  await expect(nextButton).toBeVisible();

  // Clicking it works even when controls are hidden
  await nextButton.click();
  await expect.poll(() => page.evaluate(() => state.currentPage), { timeout: 5000 }).toBe(2);
  expect(getChapterCalls()).toBe(2);
});

test('nút Chương sau nằm gọn trong hàng (row) của bảng tính', async ({ page }) => {
  await mockOnlineApi(page);
  await searchAndSelectStory(page);
  await page.locator('.online-story-chapter').first().click();
  await page.evaluate(() => closePortal());

  await page.evaluate(() => {
    const container = getActiveScrollContainer();
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll'));
  });

  const nextRow = page.locator('#online-chapter-next-row');
  await expect(nextRow).toBeVisible();
  const nextButton = nextRow.locator('#online-chapter-next-button');
  await expect(nextButton).toBeVisible();
  await expect(nextButton).toHaveText(/Chương sau/);

  // Verify it is inside table row and story tbody
  const rowTag = await nextRow.evaluate(el => el.tagName);
  expect(rowTag).toBe('TR');
  const parentId = await nextRow.evaluate(el => el.parentElement.id);
  expect(parentId).toBe('story-tbody');

  // Verify button is aligned to the right inside the row
  const flexJustify = await nextRow.locator('.online-chapter-inline-wrap').evaluate(el => getComputedStyle(el).justifyContent);
  expect(flexJustify).toBe('flex-end');

  // Dismiss toast and scroll row into center of view to screenshot clearly
  await page.evaluate(() => {
    document.querySelectorAll('.toast, .page-flip-toast').forEach(t => t.remove());
    document.getElementById('online-chapter-next-row')?.scrollIntoView({ block: 'center' });
  });
  await page.screenshot({ path: 'test-results/googlesheets-inline-row.png' });
});

test('phím tắt N hoặc ArrowRight chuyển sang chương tiếp theo, P chuyển về trước', async ({ page }) => {
  const getChapterCalls = await mockOnlineApi(page);
  await searchAndSelectStory(page);
  await page.locator('.online-story-chapter').first().click();
  await page.evaluate(() => closePortal());

  expect(await page.evaluate(() => state.currentPage)).toBe(1);

  // Press 'n' to go to chapter 2
  await page.keyboard.press('n');
  await expect.poll(() => page.evaluate(() => state.currentPage), { timeout: 5000 }).toBe(2);
  await expect.poll(() => page.evaluate(() => state.allChunks[0]?.text)).toContain('chương 2');
  expect(getChapterCalls()).toBe(2);

  // Press 'ArrowRight' to go to chapter 3
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => state.currentPage), { timeout: 5000 }).toBe(3);
  expect(getChapterCalls()).toBe(3);

  // Press 'p' to go back to chapter 2
  await page.keyboard.press('p');
  await expect.poll(() => page.evaluate(() => state.currentPage), { timeout: 5000 }).toBe(2);
});

test('loại bỏ dropdown nguồn và kiểm tra UI/UX danh sách chương (tìm kiếm, sắp xếp, layout gọn gàng)', async ({ page }) => {
  await mockOnlineApi(page);
  await page.goto('/index.html?portal=1');
  await page.click('#online-story-toggle');

  // Verify source dropdown and sources tag are removed
  await expect(page.locator('#online-story-source')).toHaveCount(0);
  await expect(page.locator('.online-story-sources-tag')).toHaveCount(0);

  // Search and select story
  await page.fill('#online-story-query', 'mao sơn');
  await page.click('#online-story-search-button');
  await expect(page.locator('.online-story-result')).toHaveCount(1);
  await page.click('.online-story-result');

  // Detail container visible
  const detail = page.locator('#online-story-detail');
  await expect(detail).toBeVisible();

  // Check story header and actions
  await expect(detail.locator('.online-story-primary')).toBeVisible();
  await expect(detail.locator('.online-story-secondary')).toBeVisible();
  await expect(page.locator('.online-story-chapter')).toHaveCount(3);

  // Verify first chapter text and badge
  const firstChapter = page.locator('.online-story-chapter').first();
  await expect(firstChapter.locator('.online-story-ch-num')).toHaveText('#1');
  await expect(firstChapter.locator('.online-story-ch-title')).toHaveText('Chương 1: Khởi đầu');

  // Test sort button toggle: click sort -> reversed order (#3 becomes first)
  const sortBtn = page.locator('#online-story-sort-btn');
  await expect(sortBtn).toBeVisible();
  await expect(sortBtn).toHaveText(/Cũ nhất/);
  await sortBtn.click();
  await expect(sortBtn).toHaveText(/Mới nhất/);
  const firstAfterSort = page.locator('.online-story-chapter').first();
  await expect(firstAfterSort.locator('.online-story-ch-num')).toHaveText('#3');
  await expect(firstAfterSort.locator('.online-story-ch-title')).toHaveText('Chương 3: Biến cố');

  // Toggle sort back
  await sortBtn.click();
  await expect(sortBtn).toHaveText(/Cũ nhất/);

  // Test chapter search filter
  const filterInput = page.locator('#online-story-chapter-search');
  await filterInput.fill('Biến cố');
  await expect(page.locator('.online-story-chapter')).toHaveCount(1);
  await expect(page.locator('.online-story-chapter').first().locator('.online-story-ch-title')).toHaveText('Chương 3: Biến cố');

  // Clear search with clear button
  const clearBtn = page.locator('#online-story-search-clear');
  await expect(clearBtn).toBeVisible();
  await clearBtn.click();
  await expect(page.locator('.online-story-chapter')).toHaveCount(3);

  // Take screenshot of redesigned chapter browser
  await page.screenshot({ path: 'test-results/redesigned-online-story-detail.png' });
});

test('truyện nhiều chương hiển thị dải chương dạng tab (range tabs) và phân trang chuẩn xác', async ({ page }) => {
  const multiChapterStory = {
    success: true,
    data: {
      source: 's1',
      story_id: 'dau-pha-120',
      title: 'Đấu Phá Thương Khung',
      author: 'Thiên Tằm Thổ Đậu',
      chapters: Array.from({ length: 120 }, (_, i) => ({
        title: `Chương ${i + 1}: Diễn biến phần ${i + 1}`,
        chapter_id: `chuong-${i + 1}`
      }))
    }
  };

  await page.route('**/api/online-story/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/').pop();
    if (endpoint === 'search') {
      return route.fulfill({
        json: {
          success: true,
          total: 1,
          data: [{ source: 's1', story_id: 'dau-pha-120', title: 'Đấu Phá Thương Khung', author: 'Thiên Tằm Thổ Đậu' }]
        }
      });
    }
    if (endpoint === 'story') return route.fulfill({ json: multiChapterStory });
    if (endpoint === 'chapter') return route.fulfill({ json: chapterPayload(1) });
    return route.abort();
  });

  await page.goto('/index.html?portal=1');
  await page.click('#online-story-toggle');
  await page.fill('#online-story-query', 'đấu phá');
  await page.click('#online-story-search-button');
  await page.click('.online-story-result');

  // Should have range tabs because 120 chapters / 50 per page = 3 pages (<= 6 pages renders as tabs)
  const rangeTabs = page.locator('.online-story-range-tab');
  await expect(rangeTabs).toHaveCount(3);
  await expect(rangeTabs.nth(0)).toHaveText('1–50');
  await expect(rangeTabs.nth(1)).toHaveText('51–100');
  await expect(rangeTabs.nth(2)).toHaveText('101–120');

  // Currently on page 1 (50 chapters)
  await expect(page.locator('.online-story-chapter')).toHaveCount(50);
  await expect(page.locator('.online-story-chapter').first().locator('.online-story-ch-num')).toHaveText('#1');

  // Switch to tab 2 (chapters 51-100)
  await rangeTabs.nth(1).click();
  await expect(page.locator('.online-story-chapter')).toHaveCount(50);
  await expect(page.locator('.online-story-chapter').first().locator('.online-story-ch-num')).toHaveText('#51');

  // Switch to tab 3 (chapters 101-120: 20 chapters)
  await rangeTabs.nth(2).click();
  await expect(page.locator('.online-story-chapter')).toHaveCount(20);
  await expect(page.locator('.online-story-chapter').first().locator('.online-story-ch-num')).toHaveText('#101');
  await expect(page.locator('.online-story-chapter').last().locator('.online-story-ch-num')).toHaveText('#120');

  await page.screenshot({ path: 'test-results/multi-chapter-range-tabs.png' });
});

test('modal tìm truyện online: mở modal, chọn truyện, chọn chương, tự đóng modal và nạp vào danh sách truyện', async ({ page }) => {
  await mockOnlineApi(page);
  await page.goto('/index.html?portal=1');

  const modal = page.locator('#online-story-modal');
  await expect(modal).toBeHidden();

  // Open modal via portal banner
  await page.click('#online-story-picker');
  await expect(modal).toBeVisible();
  await expect(modal).toHaveClass(/show/);

  // Search view is initially visible
  const searchView = page.locator('#online-story-search-view');
  const detailView = page.locator('#online-story-detail');
  await expect(searchView).toBeVisible();
  await expect(detailView).toBeHidden();

  // Search story
  await page.fill('#online-story-query', 'mao sơn');
  await page.click('#online-story-search-button');
  await expect(page.locator('.online-story-result')).toHaveCount(1);

  // Click story -> switches to detail (chapter view)
  await page.click('.online-story-result');
  await expect(detailView).toBeVisible();
  await expect(searchView).toBeHidden();

  // Test back button inside modal
  const backBtn = page.locator('#online-story-back-btn');
  await expect(backBtn).toBeVisible();
  await backBtn.click();
  await expect(searchView).toBeVisible();
  await expect(detailView).toBeHidden();

  // Click story again to go back to chapters
  await page.click('.online-story-result');
  await expect(detailView).toBeVisible();

  // Take screenshot of chapter view inside modal
  await page.screenshot({ path: 'test-results/online-story-modal-chapters.png' });

  // Click first chapter to load into library
  await page.locator('.online-story-chapter').first().click();

  // Modal automatically closes
  await expect(modal).toBeHidden();

  // Check that the story is now in the portal books list (danh sách truyện)
  const booksList = page.locator('.portal-books-list');
  await expect(booksList).toBeVisible();
  const bookItem = booksList.locator('.portal-book-item').first();
  await expect(bookItem).toBeVisible();
  await expect(bookItem.locator('.portal-book-title')).toHaveText('Mao Sơn Tróc Quỷ Nhân');
  await expect(bookItem.locator('.portal-book-meta')).toContainText('Truyện online');

  // "Bắt Đầu Đọc Ngay" button is ready
  const enterBtn = page.locator('#btn-portal-enter');
  await expect(enterBtn).toHaveClass(/ready/);
  await expect(enterBtn).toContainText('Bắt Đầu Đọc Ngay');

  // Take screenshot of portal with loaded story
  await page.screenshot({ path: 'test-results/portal-library-story-loaded.png' });
});

