const { test, expect } = require('@playwright/test');

test.describe('Portal Multi-Book Library & Selector', () => {
  test('warns and shakes the upload card when reading starts without a document', async ({ page }) => {
    await page.goto('/index.html?portal=1');

    const uploadCard = page.locator('#portal-upload-card');
    await expect(uploadCard).toBeVisible();

    await page.evaluate(() => document.getElementById('btn-portal-enter').click());

    await expect(uploadCard).toHaveClass(/shake/);
    await expect(uploadCard).toHaveCSS('animation-name', 'uploadShakeAnim');
    await expect(page.locator('#portal-upload-alert')).toBeVisible();
  });

  test('lists uploaded stories, allows selecting among them, and supports deletion', async ({ page }, testInfo) => {
    await page.goto('/index.html?portal=1');
    await page.waitForLoadState('domcontentloaded');

    // 1. Initial empty state
    const uploadCard = page.locator('#portal-upload-card');
    await expect(uploadCard).toBeVisible();

    // 2. Upload first book
    await page.evaluate(() => {
      const txt = 'Chương 1: Độc cô cửu kiếm xuất thế.\nVạn kiếm quy tông lừng lẫy giang hồ.';
      const file = new File([txt], 'Kiem_Hiep_Ky_Duyen.txt', { type: 'text/plain' });
      const input = document.getElementById('portal-file-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify first book appears in list and is selected
    await expect(uploadCard).toHaveClass(/has-doc/);
    const bookItems = page.locator('.portal-book-item');
    await expect(bookItems).toHaveCount(1);
    await expect(bookItems.first()).toHaveClass(/selected/);
    await expect(bookItems.first()).toContainText('Kiem_Hiep_Ky_Duyen.txt');

    const enterBtn = page.locator('#btn-portal-enter');
    await expect(enterBtn).toHaveClass(/ready/);
    await expect(enterBtn).toContainText('Bắt Đầu Đọc Ngay');

    // 3. Upload second book
    await page.evaluate(() => {
      const txt = 'Chương 1: Luyện khí kỳ tầng một.\nThiên địa linh khí hội tụ đan điền.';
      const file = new File([txt], 'Pham_Nhan_Tu_Tien.txt', { type: 'text/plain' });
      const input = document.getElementById('portal-file-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify both books are now listed
    await expect(bookItems).toHaveCount(2);

    // Book 2 (Pham_Nhan_Tu_Tien.txt) was just loaded so it becomes selected
    const bookPhamNhan = page.locator('.portal-book-item', { hasText: 'Pham_Nhan_Tu_Tien.txt' });
    const bookKiemHiep = page.locator('.portal-book-item', { hasText: 'Kiem_Hiep_Ky_Duyen.txt' });
    await expect(bookPhamNhan).toBeVisible();
    await expect(bookKiemHiep).toBeVisible();

    // 4. Click Book 1 (Kiem_Hiep_Ky_Duyen.txt) to switch active book - verify position does NOT change
    const title0Before = await bookItems.nth(0).locator('.portal-book-title').textContent();
    const title1Before = await bookItems.nth(1).locator('.portal-book-title').textContent();

    await bookKiemHiep.click();
    await expect(bookKiemHiep).toHaveClass(/selected/);
    await expect(bookPhamNhan).not.toHaveClass(/selected/);

    // Verify order of items is strictly identical (did not jump to top)
    const title0After = await bookItems.nth(0).locator('.portal-book-title').textContent();
    const title1After = await bookItems.nth(1).locator('.portal-book-title').textContent();
    expect(title0After).toBe(title0Before);
    expect(title1After).toBe(title1Before);

    // 5. Delete Book 2 (Pham_Nhan_Tu_Tien.txt)
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    const deleteBtnBook2 = bookPhamNhan.locator('.portal-book-delete-btn');
    await deleteBtnBook2.click();

    // Verify only 1 book remains
    await expect(bookItems).toHaveCount(1);
    await expect(bookPhamNhan).toHaveCount(0);
    await expect(bookKiemHiep).toBeVisible();
    await expect(bookKiemHiep).toHaveClass(/selected/);

    // 6. Screenshot the beautiful UI
    await page.locator('.portal-col-main').screenshot({ path: testInfo.outputPath('portal_multi_books.png') });

    // 7. Click "Bắt Đầu Đọc Ngay" to enter reading view
    await enterBtn.click();
    await expect(page).toHaveURL(/googlesheets\.html/);
  });

  test('displays loading progress bar with percentage and detail status during upload', async ({ page }, testInfo) => {
    await page.goto('/index.html?portal=1');
    await page.waitForLoadState('domcontentloaded');

    // Trigger progress
    await page.evaluate(() => {
      showPortalUploadProgress('Đang nạp: 11739-phia-sau-nghi-can-x.pdf', 'Đang xử lý: 150/336 trang...', 45);
    });

    const progressBox = page.locator('#portal-upload-progress');
    await expect(progressBox).toBeVisible();
    await expect(page.locator('#portal-progress-title')).toHaveText('Đang nạp: 11739-phia-sau-nghi-can-x.pdf');
    await expect(page.locator('#portal-progress-detail')).toHaveText('Đang xử lý: 150/336 trang...');
    await expect(page.locator('#portal-progress-percent')).toHaveText('45%');

    // Take screenshot of loading state for visual inspection
    await page.locator('.portal-col-main').screenshot({ path: testInfo.outputPath('portal_upload_loading.png') });

    // Update progress dynamically via updateLoadingProgress
    await page.evaluate(() => {
      updateLoadingProgress(82, 'Đang trích xuất 275/336 trang');
    });
    await expect(page.locator('#portal-progress-percent')).toHaveText('82%');
    await expect(page.locator('#portal-progress-detail')).toHaveText('Đang trích xuất 275/336 trang');

    // Hide progress
    await page.evaluate(() => {
      hidePortalUploadProgress();
    });
    await expect(progressBox).toBeHidden();
  });

  test('allows switching books directly from universal navbar', async ({ page }, testInfo) => {
    await page.goto('/googlesheets.html');
    await page.waitForLoadState('domcontentloaded');

    // 1. Upload 2 books via page.evaluate
    await page.evaluate(async () => {
      const file1 = new File(['Chương 1: Truyện thứ nhất.'], 'Truyen_Thu_Nhat.txt', { type: 'text/plain' });
      const file2 = new File(['Chương 1: Truyện thứ hai.'], 'Truyen_Thu_Hai.txt', { type: 'text/plain' });
      await processDocumentFile(file1);
      await processDocumentFile(file2);
      syncUniversalNavbar();
    });

    // 2. Verify book switch button is visible on navbar
    const btnSwitch = page.locator('#univ-btn-switch-book');
    await expect(btnSwitch).toBeVisible();

    // 3. Click to open dropdown
    await btnSwitch.click();
    const dropdown = page.locator('#univ-books-dropdown-menu');
    await expect(dropdown).toBeVisible();

    // Verify both books are in dropdown
    const items = dropdown.locator('.unav-dropdown-item');
    await expect(items).toHaveCount(2);

    // 4. Click 'Truyen_Thu_Nhat.txt' in dropdown to switch
    const item1 = dropdown.locator('.unav-dropdown-item', { hasText: 'Truyen_Thu_Nhat.txt' });
    await item1.click();
    await expect(dropdown).toBeHidden();

    // 5. Verify navbar badge updated to 'Truyen_Thu_Nhat.txt'
    const badge = page.locator('#univ-file-name');
    await expect(badge).toContainText('Truyen_Thu_Nhat.txt');

    // 6. Screenshot navbar dropdown
    await btnSwitch.click();
    await expect(dropdown).toBeVisible();
    await dropdown.screenshot({ path: testInfo.outputPath('navbar_book_switcher.png') });
  });
});
