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

