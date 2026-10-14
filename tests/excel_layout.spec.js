const { test, expect } = require('@playwright/test');

function makeLongExcelStory() {
  const paragraphs = Array.from({ length: 520 }, (_, index) => {
    if (index === 450) {
      return `Dòng ${index + 1}: ${'NOIDUNGRATDAIKHONGCODAUCACH'.repeat(35)} kết thúc đoạn kiểm thử.`;
    }
    return `Dòng ${index + 1}: Nội dung truyện dùng để kiểm tra bố cục Excel.`;
  });
  return {
    name: 'kiem-thu-excel-520-dong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(paragraphs.join('\n\n'), 'utf8')
  };
}

test('Excel không để nội dung dài ở dòng 450 tràn sang các cột khác', async ({ page }) => {
  await page.goto('/excel.html');
  await page.locator('#file-pdf-input').setInputFiles(makeLongExcelStory());
  await expect(page.locator('#loading-spinner')).toBeHidden({ timeout: 20000 });

  await page.evaluate(() => jumpToChunk(450));
  const metrics = await page.locator('#story-cell-450').evaluate(cell => {
    const style = getComputedStyle(cell);
    const row = cell.closest('tr');
    const nextCell = cell.nextElementSibling;
    const cellRect = cell.getBoundingClientRect();
    const nextRect = nextCell.getBoundingClientRect();
    return {
      whiteSpace: style.whiteSpace,
      overflowX: style.overflowX,
      overflowWrap: style.overflowWrap,
      cellRight: cellRect.right,
      nextCellLeft: nextRect.left,
      cellScrollWidth: cell.scrollWidth,
      cellClientWidth: cell.clientWidth,
      rowHeight: row.getBoundingClientRect().height,
      cellScrollHeight: cell.scrollHeight
    };
  });

  expect(metrics.whiteSpace).toBe('pre-wrap');
  expect(metrics.overflowX).toBe('hidden');
  expect(metrics.overflowWrap).toBe('anywhere');
  expect(metrics.cellRight).toBeLessThanOrEqual(metrics.nextCellLeft + 1);
  expect(metrics.cellScrollWidth).toBeLessThanOrEqual(metrics.cellClientWidth + 1);
  expect(metrics.rowHeight).toBeGreaterThanOrEqual(metrics.cellScrollHeight - 1);
});
