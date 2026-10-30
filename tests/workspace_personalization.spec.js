const { test, expect } = require('@playwright/test');

test.describe('cá nhân hóa spreadsheet workspace', () => {
  test('G mở cá nhân hóa nhưng không kích hoạt khi đang nhập liệu', async ({ page }) => {
    await page.goto('/googlesheets.html');
    const modal = page.locator('#workspace-personalization-modal');
    const button = page.locator('#workspace-personalization-button');

    await expect(button).toHaveAttribute('title', /phím G/);
    await page.keyboard.press('g');
    await expect(modal).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveClass(/show/);

    await page.locator('#gsheet-doc-title').focus();
    await page.keyboard.press('g');
    await expect(modal).not.toHaveClass(/show/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('stealth_workspace_shortcut_tip_v2'))).toBe('1');

    await page.goto('/excel.html');
    await page.keyboard.press('g');
    await expect(page.locator('#workspace-personalization-modal')).toHaveClass(/show/);
  });

  test('Google Sheets xem trước, lưu và khôi phục cấu hình sau reload', async ({ page }) => {
    await page.goto('/googlesheets.html');
    await expect(page.locator('#workspace-personalization-button')).toBeVisible();
    await page.click('#workspace-personalization-button');
    await expect(page.locator('#workspace-personalization-modal')).toHaveClass(/show/);

    await page.selectOption('#workspace-profile-select', 'accounting');
    await expect(page.locator('#gsheet-doc-title')).toHaveText('Đối soát doanh thu & chi phí tháng 10');
    await expect(page.locator('.story-header-title-text')).toHaveText('Diễn giải nghiệp vụ');

    await page.fill('[name="title"]', 'Theo dõi chi phí vận hành Q4');
    await page.fill('[name="sheet0"]', 'Chi_Phi_Q4');
    await page.fill('[name="column3"]', 'Nội dung đối soát chi tiết');
    await page.fill('[name="avatar"]', 'KT');
    await page.selectOption('[name="fontFamily"]', 'Roboto');
    await page.selectOption('[name="fontSize"]', '12');
    await page.selectOption('[name="zoom"]', '90');
    await page.selectOption('[name="density"]', 'compact');
    await page.locator('[name="wrapText"]').setChecked(false, { force: true });
    await page.locator('[name="gridlines"]').setChecked(false, { force: true });
    await page.click('.workspace-primary-btn');

    await expect(page.locator('#workspace-personalization-modal')).not.toHaveClass(/show/);
    await expect(page.locator('#gsheet-doc-title')).toHaveText('Theo dõi chi phí vận hành Q4');
    await expect(page.locator('#tab-story-label')).toHaveText('Chi_Phi_Q4');
    await expect(page.locator('.story-header-title-text')).toHaveText('Nội dung đối soát chi tiết');
    await expect(page.locator('.gsheet-user-profile-circle span')).toHaveText('KT');
    await expect(page.locator('body')).toHaveClass(/workspace-gridlines-hidden/);
    await expect(page.locator('body')).toHaveAttribute('data-workspace-density', 'compact');

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('stealth_workspace_personalization_v1'))['theme-googlesheets']);
    expect(saved).toMatchObject({ title: 'Theo dõi chi phí vận hành Q4', fontFamily: 'Roboto', fontSize: 12, zoom: 90, wrapText: false, gridlines: false });

    await page.reload();
    await expect(page.locator('#gsheet-doc-title')).toHaveText('Theo dõi chi phí vận hành Q4');
    await expect(page.locator('#tab-story-label')).toHaveText('Chi_Phi_Q4');
    await expect(page.locator('.story-header-title-text')).toHaveText('Nội dung đối soát chi tiết');
    await expect(page.locator('#story-header-title .col-resize-handle')).toHaveCount(1);
  });

  test('Hủy preview trả lại Excel và preset tùy chỉnh tách riêng theo theme', async ({ page }) => {
    await page.goto('/excel.html');
    const originalTitle = await page.locator('#excel-doc-title').innerText();
    await page.click('#workspace-personalization-button');
    await page.selectOption('#workspace-profile-select', 'project');
    await expect(page.locator('#excel-doc-title')).toHaveText('Project_Tracking_Sprint_Plan.xlsx');
    await page.click('[data-workspace-cancel].workspace-secondary-btn');
    await expect(page.locator('#excel-doc-title')).toHaveText(originalTitle);

    await page.click('#workspace-personalization-button');
    await page.selectOption('#workspace-profile-select', 'hr');
    await page.fill('[name="presetName"]', 'Theo dõi HR nội bộ');
    await page.click('#workspace-save-preset');
    await expect(page.locator('#workspace-profile-select')).toHaveValue('custom:Theo dõi HR nội bộ');
    await page.click('.workspace-primary-btn');

    const stored = await page.evaluate(() => ({
      settings: JSON.parse(localStorage.getItem('stealth_workspace_personalization_v1')),
      presets: JSON.parse(localStorage.getItem('stealth_workspace_custom_presets_v1')),
    }));
    expect(stored.settings['theme-excel'].title).toBe('HR_Headcount_Training_Plan.xlsx');
    expect(stored.settings['theme-googlesheets']).toBeUndefined();
    expect(stored.presets['theme-excel']['Theo dõi HR nội bộ']).toBeTruthy();
  });

  test('giữ lại tùy chỉnh cũ khi người dùng chưa tạo workspace mới', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stealth_title_gsheet', 'Báo cáo cũ của người dùng');
      localStorage.setItem('stealth_sheet_gsheet_0', 'Du_Lieu_Cu');
      localStorage.setItem('stealth_header_title_gsheet', 'Nội dung nghiệp vụ cũ');
      localStorage.setItem('excel_reader_state', JSON.stringify({ fontFamily: 'Roboto', fontSize: 13, wrapText: false, layoutMode: 'exact' }));
    });
    await page.goto('/googlesheets.html');
    await expect(page.locator('#gsheet-doc-title')).toHaveText('Báo cáo cũ của người dùng');
    await expect(page.locator('#tab-story-label')).toHaveText('Du_Lieu_Cu');
    await expect(page.locator('.story-header-title-text')).toHaveText('Nội dung nghiệp vụ cũ');
    await expect(page.locator('#gs-select-font-family')).toHaveValue('Roboto');
    await expect(page.locator('#story-header-title .col-resize-handle')).toHaveCount(1);
  });
});
