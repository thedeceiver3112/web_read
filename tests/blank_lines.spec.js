const { test, expect } = require('@playwright/test');

const THEME_PAGES = [
  'googlesheets.html', 'docs.html', 'excel.html', 'vscode.html', 'photoshop.html',
  'blender.html', 'linkedin.html', 'autocad.html', 'zalo.html', 'figma.html',
  'canva.html', 'powerpoint.html', 'thuvienphapluat.html', 'premiere.html',
  'claude.html', 'chatgpt.html', 'teams.html', 'revit.html', 'misa.html',
  'capcut.html', 'sap.html', 'gmail.html', 'outlook.html', 'jira.html', 'slack.html'
];

const CACHE_WITH_BLANK_LINES = {
  cacheVersion: 3,
  processingComplete: true,
  documentName: 'truyen-co-dong-trang.txt',
  documentId: 'blank-line-regression',
  fileSize: 1024,
  fileType: 'txt',
  chunks: [
    { text: 'Đoạn thứ nhất.', page: 1, indexInPage: 0, globalIndex: 0 },
    { text: '', page: 1, indexInPage: 1, globalIndex: 1 },
    { text: '   ', page: 1, indexInPage: 2, globalIndex: 2 },
    { text: '\n\t', page: 1, indexInPage: 3, globalIndex: 3 },
    { text: 'Đoạn thứ hai.', page: 1, indexInPage: 4, globalIndex: 4 },
    { text: 'Đoạn thứ ba.', page: 1, indexInPage: 5, globalIndex: 5 }
  ],
  rawText: 'Đoạn thứ nhất.\n\n\nĐoạn thứ hai.\n\nĐoạn thứ ba.',
  pageStartIndices: { 1: 0 },
  documentToc: [],
  documentImages: {},
  totalPages: 1,
  currentPage: 1,
  currentGlobalIndex: 4,
  savedAt: Date.now()
};

test('lọc dòng trắng trong cache và trên toàn bộ theme', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(cache => {
    sessionStorage.setItem('stealth_active_document_v2', JSON.stringify(cache));
  }, CACHE_WITH_BLANK_LINES);

  for (const themePage of THEME_PAGES) {
    await page.goto(`/${themePage}`);
    await expect.poll(() => page.evaluate(() => state.allChunks.length)).toBe(3);

    const metrics = await page.evaluate(() => ({
      texts: state.allChunks.map(chunk => chunk.text),
      indices: state.allChunks.map(chunk => chunk.globalIndex),
      currentIndex: state.currentGlobalIndex,
      blankRenderedItems: [...document.querySelectorAll('[data-index]')]
        .filter(element => !element.textContent.trim()).length
    }));

    expect(metrics.texts, themePage).toEqual(['Đoạn thứ nhất.', 'Đoạn thứ hai.', 'Đoạn thứ ba.']);
    expect(metrics.indices, themePage).toEqual([0, 1, 2]);
    expect(metrics.currentIndex, themePage).toBe(1);
    expect(metrics.blankRenderedItems, themePage).toBe(0);
  }
});

test('chế độ từng dòng không tạo chunk rỗng dù dữ liệu có nhiều dòng trắng', async ({ page }) => {
  await page.goto('/googlesheets.html');
  const result = await page.evaluate(async () => {
    const source = 'Dòng một\n\n   \n\t\nDòng hai\n\nDòng ba';
    const options = { preserveIndents: true, compactBlankLines: false };
    return {
      direct: splitTextIntoChunks(source, 'line', options),
      worker: await runTextChunkWorker(source, 'line', options)
    };
  });
  expect(result.direct).toEqual(['Dòng một', 'Dòng hai', 'Dòng ba']);
  expect(result.worker).toEqual(['Dòng một', 'Dòng hai', 'Dòng ba']);
});
