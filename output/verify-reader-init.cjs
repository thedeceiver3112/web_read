async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('selected_theme', 'theme-reader');
    sessionStorage.setItem('stealth_donate_popup_last_shown', String(Date.now()));
  });
  await page.goto('http://127.0.0.1:8080/index.html?portal=1');
  await page.waitForFunction(() => document.body.classList.contains('theme-reader'));
  await page.locator('#online-story-toggle').click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('online-story-modal')).display !== 'none');
  const portalSearch = await page.locator('#online-story-query').isVisible();
  await page.locator('#online-story-modal-close').click();
  const file = { name: 'reader-init-fix.txt', mimeType: 'text/plain', buffer: Buffer.from('Chương một\n\nNội dung kiểm tra nút nạp file sau khi đã chọn giao diện đọc sách.') };
  await page.locator('#portal-file-input').setInputFiles(file);
  await page.waitForFunction(() => state.pdfFileName === 'reader-init-fix.txt' && state.allChunks.length > 0);
  await page.waitForFunction(() => document.querySelector('#btn-portal-enter.ready'));
  await page.screenshot({ path:'output/reader-init-portal-fixed.jpg', fullPage:false });
  await page.goto('http://127.0.0.1:8080/reader.html');
  await page.locator('#reading-settings').click();
  if (!await page.locator('#reading-settings-panel').isVisible()) throw new Error('Reader settings failed');
  await page.locator('#reading-library').click();
  if (!await page.locator('#reader-tools-modal.open').isVisible()) throw new Error('Reader library failed');
  await page.screenshot({ path:'output/reader-init-theme-fixed.jpg', fullPage:false });
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log('PASS: saved reader theme on portal, online dialog open/close, file upload, reader settings/library; no page errors.');
}
