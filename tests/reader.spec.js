const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');

function makeTextFile() {
  const lines = Array.from({ length: 190 }, (_, index) => `Dòng kiểm thử ${index + 1}. Nội dung chương thử nghiệm để xác nhận tìm kiếm và vị trí đọc.`);
  return { name: 'kiem-thu.txt', mimeType: 'text/plain', buffer: Buffer.from(lines.join('\n\n'), 'utf8') };
}

async function makeEpubFile() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest><item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="chapter2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>');
  zip.file('OEBPS/chapter1.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Mở đầu</title></head><body><h1>Chương Một</h1><p>Nội dung EPUB chương đầu tiên.</p></body></html>');
  zip.file('OEBPS/chapter2.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><h2>Chương Hai</h2><p>Nội dung EPUB chương thứ hai có từ khóa đặc biệt.</p></body></html>');
  return { name: 'kiem-thu.epub', mimeType: 'application/epub+zip', buffer: await zip.generateAsync({ type: 'nodebuffer' }) };
}

function makePdfFile() {
  const stream = 'BT /F1 18 Tf 72 720 Td (PDF regression story text) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return { name: 'kiem-thu.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf, 'binary') };
}

async function openReader(page) {
  await page.goto('/googlesheets.html');
  await expect(page.locator('#universal-reader-navbar')).toBeVisible();
}

test('nạp TXT, tìm kiếm và lưu nhiều dấu trang', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(makeTextFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await expect(page.locator('#univ-file-name')).toContainText('kiem-thu.txt');

  await page.locator('#univ-btn-bookmark').click();
  await page.locator('#univ-btn-tools').click();
  await page.locator('[data-reader-tab="bookmarks"]').click();
  await expect(page.locator('[data-mark-open]')).toHaveCount(1);

  await page.locator('[data-reader-tab="search"]').click();
  await page.locator('#reader-search-input').fill('Dòng kiểm thử 150');
  await page.locator('#reader-search-form button').click();
  await expect(page.locator('[data-search-index]')).toHaveCount(1);
});

test('EPUB tạo mục lục và điều hướng chương', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(await makeEpubFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await page.locator('#univ-btn-tools').click();
  await page.locator('[data-reader-tab="toc"]').click();
  await expect(page.locator('[data-toc-index]')).toHaveCount(2);
  await expect(page.locator('[data-toc-index]').nth(1)).toContainText('Chương Hai');
});

test('EPUB vẫn mở khi server thiếu text-worker.js', async ({ page }) => {
  await page.route('**/text-worker.js*', route => route.abort());
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(await makeEpubFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await expect(page.locator('#univ-file-name')).toContainText('kiem-thu.epub');
  await expect(page.locator('#story-tbody')).toContainText('Nội dung EPUB chương đầu tiên');
  await expect(page.locator('#reader-error-modal.open')).toHaveCount(0);
});

test('PDF thay thế dữ liệu mẫu bằng nội dung vừa nạp', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(makePdfFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await expect(page.locator('#univ-file-name')).toContainText('kiem-thu.pdf');
  await expect(page.locator('#story-tbody')).toContainText('PDF regression story text');
  await expect(page.locator('#story-tbody')).not.toContainText('BÁO CÁO PHÂN TÍCH TỔNG QUAN CHIẾN DỊCH Q3');
});

test('đổi giao diện vẫn giữ tài liệu và vị trí đọc', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(makeTextFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await page.evaluate(() => jumpToChunk(130));
  await page.evaluate(() => navigateToThemePage('theme-vscode'));
  await page.waitForURL(/vscode\.html$/);
  await expect(page.locator('#univ-file-name')).toContainText('kiem-thu.txt');
  await expect.poll(() => page.evaluate(() => state.currentGlobalIndex)).toBeGreaterThanOrEqual(130);
});

test('thư viện mở lại sách sau khi tải lại trang', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(makeTextFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await page.evaluate(() => jumpToChunk(120));
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('#univ-file-name')).toContainText('kiem-thu.txt');
  await expect.poll(() => page.evaluate(() => state.currentGlobalIndex)).toBeGreaterThanOrEqual(120);
});

test('lỗi định dạng hiển thị hộp thoại có nguyên nhân', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles({
    name: 'khong-ho-tro.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('not-a-document')
  });
  await expect(page.locator('#reader-error-modal')).toHaveClass(/open/);
  await expect(page.locator('#reader-error-modal')).toContainText('Chỉ hỗ trợ file PDF, TXT hoặc EPUB');
  await expect(page.locator('#reader-error-modal')).toContainText('Kiểm tra tệp');
});

test('không ghi cache PDF khi parser chưa có trang dữ liệu', async ({ page }) => {
  await openReader(page);
  const count = await page.evaluate(async () => {
    state.pdfFileName = 'cache-loi.pdf';
    state.documentId = 'cache-loi';
    state.isPdfProcessing = true;
    state.loadedPages = 0;
    await persistDocumentCache();
    return (await listDocumentCaches()).filter(item => item.documentId === 'cache-loi').length;
  });
  expect(count).toBe(0);
});

function makePdfWithOutlineFile() {
  const stream1 = 'BT /F1 18 Tf 72 720 Td (Noi dung trang mot) Tj ET';
  const stream2 = 'BT /F1 18 Tf 72 720 Td (Noi dung trang hai) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R /Outlines 6 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 8 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Outlines /First 9 0 R /Last 10 0 R /Count 2 >>',
    `<< /Length ${Buffer.byteLength(stream1)} >>\nstream\n${stream1}\nendstream`,
    `<< /Length ${Buffer.byteLength(stream2)} >>\nstream\n${stream2}\nendstream`,
    '<< /Title (Chuong Mot) /Parent 6 0 R /Next 10 0 R /Dest [3 0 R /XYZ null null null] >>',
    '<< /Title (Chuong Hai) /Parent 6 0 R /Prev 9 0 R /Dest [4 0 R /XYZ null null null] >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return { name: 'kiem-thu-outline.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf, 'binary') };
}

test('PDF có outline tạo mục lục và điều hướng', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(makePdfWithOutlineFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });
  await page.locator('#univ-btn-tools').click();
  await page.locator('[data-reader-tab="toc"]').click();
  await expect(page.locator('[data-toc-index]')).toHaveCount(2);
  await expect(page.locator('[data-toc-index]').nth(0)).toContainText('Chuong Mot');
  await expect(page.locator('[data-toc-index]').nth(1)).toContainText('Chuong Hai');
});

test('modal mục lục dài cuộn được hoàn toàn đến mục cuối cùng', async ({ page }) => {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  const manifestItems = [];
  const spineItems = [];
  for (let i = 1; i <= 35; i++) {
    manifestItems.push(`<item id="c${i}" href="ch${i}.xhtml" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="c${i}"/>`);
    zip.file(`OEBPS/ch${i}.xhtml`, `<html><body><h1>Chương Số ${i}</h1><p>Nội dung chương ${i}</p></body></html>`);
  }
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest>${manifestItems.join('')}</manifest><spine>${spineItems.join('')}</spine></package>`);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });

  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles({ name: 'nhieu-chuong.epub', mimeType: 'application/epub+zip', buffer });
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 25000 });
  await page.locator('#univ-btn-tools').click();
  await page.locator('[data-reader-tab="toc"]').click();

  const lastItem = page.locator('[data-toc-index]').last();
  await lastItem.scrollIntoViewIfNeeded();
  await expect(lastItem).toContainText('Chương Số 35');

  // Verify the last item is visually inside the dialog bounds
  const dialogBox = await page.locator('.reader-tools-dialog').boundingBox();
  const lastItemBox = await lastItem.boundingBox();
  expect(lastItemBox.y + lastItemBox.height).toBeLessThanOrEqual(dialogBox.y + dialogBox.height);
});

test('EPUB có hình ảnh hiển thị thành 1 dòng link và bấm vào mở modal xem ảnh', async ({ page }) => {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest><item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/><item id="img1" href="images/illust1.png" media-type="image/png"/></manifest><spine><itemref idref="c1"/></spine></package>');
  // 1x1 transparent PNG
  const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  zip.file('OEBPS/images/illust1.png', Buffer.from(tinyPngBase64, 'base64'));
  zip.file('OEBPS/chapter1.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chương Có Ảnh</h1><p>Đoạn văn trước hình ảnh minh họa.</p><p><img src="images/illust1.png" alt="Bản đồ cổ đại"/></p><p>Đoạn văn sau hình ảnh minh họa.</p></body></html>');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });

  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles({ name: 'truyen-co-anh.epub', mimeType: 'application/epub+zip', buffer });
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  const imgLink = page.locator('.stealth-inline-img-link').first();
  await expect(imgLink).toBeVisible();
  await expect(imgLink).toContainText('Bản đồ cổ đại');

  // Click the 1-line image link to open the viewer modal
  await imgLink.click();
  const modal = page.locator('#stealth-image-viewer-modal');
  await expect(modal).toHaveClass(/show/);
  const previewImg = page.locator('#stealth-img-modal-preview');
  await expect(previewImg).toBeVisible();
  await expect(previewImg).toHaveAttribute('src', /^data:image\/png;base64,/);

  // Press Escape to close the image modal without triggering Boss Mode
  await page.keyboard.press('Escape');
  await expect(modal).not.toHaveClass(/show/);
  const bossActive = await page.evaluate(() => state.bossModeActive);
  expect(bossActive).toBe(false);
});

function makePdfWithImagesFile() {
  const jpegHex = 'ffd8ffe000104a46494600010101004800480000ffdb004300030202020202030202020303030304060404040404080606050609080a0a090809090a0c0f0c0a0b0e0b09090d110d0e0f101011100a0c12131210130f101010ffc9000b080001000101011100ffcc000600101005ffda0008010100003f00d2cf20ffd9';
  const jpegBuf = Buffer.from(jpegHex, 'hex');
  const stream1 = Buffer.from('q 100 0 0 100 50 500 cm /Im0 Do Q', 'ascii');
  const stream2 = Buffer.from('q 100 0 0 100 50 500 cm /Im1 Do Q BT /F1 18 Tf 72 720 Td (Ban do dia ly chuong 1) Tj ET', 'ascii');

  const objBuffers = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'ascii'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>', 'ascii'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 6 0 R >> >> /Contents 7 0 R >>', 'ascii'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 8 0 R >>', 'ascii'),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', 'ascii'),
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuf.length} >>\nstream\n`, 'ascii'),
      jpegBuf,
      Buffer.from('\nendstream', 'ascii')
    ]),
    Buffer.concat([
      Buffer.from(`<< /Length ${stream1.length} >>\nstream\n`, 'ascii'),
      stream1,
      Buffer.from('\nendstream', 'ascii')
    ]),
    Buffer.concat([
      Buffer.from(`<< /Length ${stream2.length} >>\nstream\n`, 'ascii'),
      stream2,
      Buffer.from('\nendstream', 'ascii')
    ])
  ];

  const chunks = [Buffer.from('%PDF-1.4\n', 'ascii')];
  let currentOffset = chunks[0].length;
  const offsets = [0];

  objBuffers.forEach((objBuf, idx) => {
    offsets.push(currentOffset);
    const header = Buffer.from(`${idx + 1} 0 obj\n`, 'ascii');
    const footer = Buffer.from('\nendobj\n', 'ascii');
    chunks.push(header, objBuf, footer);
    currentOffset += header.length + objBuf.length + footer.length;
  });

  const xrefOffset = currentOffset;
  let xrefStr = `xref\n0 ${objBuffers.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(off => {
    xrefStr += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  xrefStr += `trailer\n<< /Size ${objBuffers.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(xrefStr, 'ascii'));

  return {
    name: 'nhung-tu-nhan-dia-ly.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.concat(chunks)
  };
}

test('PDF có ảnh bìa ở trang 1 và ảnh minh họa nội dung đều hiển thị thành dòng link xem ảnh', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles(makePdfWithImagesFile());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  const imgLinks = page.locator('.stealth-inline-img-link');
  await expect(imgLinks).toHaveCount(2);
  await expect(imgLinks.nth(0)).toContainText('Xem hình ảnh trang 1 — Ảnh bìa');
  await expect(imgLinks.nth(1)).toContainText('Xem hình ảnh minh họa — Trang 2');

  // Ensure Page 1 is not skipped (currentGlobalIndex === 0)
  const firstIndex = await page.evaluate(() => state.currentGlobalIndex);
  expect(firstIndex).toBe(0);

  // Clicking the Page 1 cover image link opens the modal with the extracted JPEG
  await imgLinks.nth(0).click();
  const modal = page.locator('#stealth-image-viewer-modal');
  await expect(modal).toHaveClass(/show/);
  await expect(page.locator('#stealth-img-modal-preview')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
});

test('nhấn ESC bật Boss Mode ẩn nội dung truyện trên thanh Formula ở cả Google Sheets và Excel', async ({ page }) => {
  await openReader(page);
  await page.locator('#file-pdf-input').setInputFiles({
    name: 'truyen-bi-mat.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Đoạn văn mật không được lộ trên thanh công thức khi sếp đi ngang qua.\n\nĐoạn văn thứ hai của chương.', 'utf-8')
  });
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  const formulaInput = page.locator('#formula-input');
  const cellAddress = page.locator('#active-cell-address');
  await expect(formulaInput).toHaveValue(/Đoạn văn mật không được lộ/);
  await expect(cellAddress).toHaveText('D2');

  // Press ESC in Google Sheets -> formula bar must show dummy formula, not story text
  await page.keyboard.press('Escape');
  await expect(formulaInput).toHaveValue('=SUM(C2:E2)');
  await expect(cellAddress).toHaveText('F2');

  // Press ESC again -> restores story text
  await page.keyboard.press('Escape');
  await expect(formulaInput).toHaveValue(/Đoạn văn mật không được lộ/);
  await expect(cellAddress).toHaveText('D2');

  // Switch to Excel theme and verify ESC in Excel as well
  await page.evaluate(() => applyTheme('theme-excel'));
  await expect(page.locator('#formula-input')).toHaveValue(/Đoạn văn mật không được lộ/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#formula-input')).toHaveValue('=SUM(C2:E2)');
  await expect(page.locator('#active-cell-address')).toHaveText('F2');

  await page.keyboard.press('Escape');
  await expect(page.locator('#formula-input')).toHaveValue(/Đoạn văn mật không được lộ/);
  await expect(page.locator('#active-cell-address')).toHaveText('D2');
});




