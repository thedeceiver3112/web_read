'use strict';

const state = {
  range: 30,
  data: null,
  user: null,
  selectedThemeDate: 'all',
  activeSlotKey: null
};

const themeLabels = {
  googlesheets: 'Google Sheets', googledocs: 'Google Docs', excel: 'Microsoft Excel',
  vscode: 'VS Code', photoshop: 'Photoshop', blender: 'Blender 3D', linkedin: 'LinkedIn',
  autocad: 'AutoCAD', zalo: 'Zalo PC', figma: 'Figma', canva: 'Canva',
  powerpoint: 'PowerPoint', thuvienphapluat: 'Thư Viện Pháp Luật', premiere: 'Premiere Pro',
  claude: 'Claude AI', chatgpt: 'ChatGPT', teams: 'Teams', revit: 'Revit BIM',
  misa: 'MISA SME', capcut: 'CapCut Pro', sap: 'SAP GUI', gmail: 'Gmail',
  outlook: 'Outlook', jira: 'Jira', slack: 'Slack'
};

const defaultSlots = [
  { key: 'morning', label: 'Buổi sáng', hours: '06:00–12:00', icon: '🌅', startHour: 6, endHour: 11 },
  { key: 'afternoon', label: 'Buổi chiều', hours: '12:00–18:00', icon: '☀️', startHour: 12, endHour: 17 },
  { key: 'evening', label: 'Buổi tối', hours: '18:00–24:00', icon: '🌆', startHour: 18, endHour: 23 },
  { key: 'night', label: 'Đêm / Khuya', hours: '00:00–06:00', icon: '🌙', startHour: 0, endHour: 5 },
  { key: 'office', label: 'Giờ làm việc', hours: '08:00–17:00', icon: '💼', startHour: 8, endHour: 16 }
];

const numberFormat = new Intl.NumberFormat('vi-VN');
const byId = id => document.getElementById(id);

function showAccess(title, message, options = {}) {
  const panel = byId('access-state');
  panel.classList.toggle('error', Boolean(options.error));
  panel.classList.remove('hidden');
  byId('dashboard').classList.add('hidden');
  byId('access-title').textContent = title;
  byId('access-message').textContent = message;
  byId('login-link').classList.toggle('hidden', !options.login);
}

async function fetchJson(url) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Máy chủ trả về lỗi ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function renderSummary(summary) {
  byId('stat-visits').textContent = numberFormat.format(summary.visits || 0);
  byId('stat-visitors').textContent = numberFormat.format(summary.uniqueVisitors || 0);
  byId('stat-sessions').textContent = numberFormat.format(summary.sessions || 0);
  byId('stat-users').textContent = numberFormat.format(summary.authenticatedUsers || 0);
  byId('stat-theme-views').textContent = numberFormat.format(summary.themeViews || 0);
}

function renderChart(daily) {
  const chart = byId('daily-chart');
  chart.replaceChildren();
  const maxVisits = Math.max(1, ...daily.map(row => row.visits));
  const labelStep = daily.length > 45 ? 10 : daily.length > 14 ? 5 : 1;
  daily.forEach((row, index) => {
    const day = document.createElement('div');
    day.className = 'chart-day';
    day.title = `${row.date}: ${numberFormat.format(row.visits)} lượt truy cập`;
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${Math.max(2, (row.visits / maxVisits) * 178)}px`;
    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = index % labelStep === 0 || index === daily.length - 1 ? row.date.slice(5) : '';
    day.append(bar, label);
    chart.append(day);
  });
}

function getSlotForHour(hour) {
  if (hour >= 0 && hour <= 5) return 'slot-night';
  if (hour >= 6 && hour <= 11) return 'slot-morning';
  if (hour >= 12 && hour <= 17) return 'slot-afternoon';
  return 'slot-evening';
}

function renderTimeSlots(hourly, timeSlotsFromApi) {
  const container = byId('time-slots-grid');
  if (!container) return;
  container.replaceChildren();

  const totalVisits = (hourly || []).reduce((sum, item) => sum + (Number(item.visits) || 0), 0) || 1;

  // Build slot list using API or calculate from hourly
  const slots = defaultSlots.map(def => {
    const fromApi = (timeSlotsFromApi || []).find(s => s.key === def.key);
    if (fromApi && fromApi.visits !== undefined) {
      return { ...def, ...fromApi };
    }
    const matchingHours = (hourly || []).filter(h => {
      const hr = Number(h.hour);
      return hr >= def.startHour && hr <= def.endHour;
    });
    const visits = matchingHours.reduce((sum, h) => sum + (Number(h.visits) || 0), 0);
    const uniqueVisitors = matchingHours.reduce((max, h) => Math.max(max, Number(h.uniqueVisitors) || 0), 0);
    return { ...def, visits, uniqueVisitors };
  });

  slots.forEach(slot => {
    const card = document.createElement('div');
    card.className = 'time-slot-card';
    if (state.activeSlotKey === slot.key) {
      card.classList.add('active');
    }
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.title = `Nhấp để lọc khung giờ ${slot.hours} trên biểu đồ`;

    const percentage = totalVisits > 0 ? ((slot.visits / totalVisits) * 100).toFixed(1) : '0.0';

    const header = document.createElement('div');
    header.className = 'time-slot-header';

    const title = document.createElement('div');
    title.className = 'time-slot-title';
    title.innerHTML = `<span>${slot.icon || '⏰'}</span> <span>${slot.label}</span>`;

    const hours = document.createElement('span');
    hours.className = 'time-slot-hours';
    hours.textContent = slot.hours;
    header.append(title, hours);

    const stats = document.createElement('div');
    stats.className = 'time-slot-stats';

    const visits = document.createElement('span');
    visits.className = 'time-slot-visits';
    visits.textContent = `${numberFormat.format(slot.visits)} lượt`;

    const percent = document.createElement('span');
    percent.className = 'time-slot-percent';
    percent.textContent = `${percentage}%`;
    stats.append(visits, percent);

    const users = document.createElement('div');
    users.className = 'time-slot-users';
    users.textContent = `${numberFormat.format(slot.uniqueVisitors)} người dùng duy nhất`;

    card.append(header, stats, users);

    const toggleSlot = () => {
      state.activeSlotKey = state.activeSlotKey === slot.key ? null : slot.key;
      renderTimeSlots(hourly, timeSlotsFromApi);
      renderHourly(hourly);
    };

    card.addEventListener('click', toggleSlot);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSlot();
      }
    });

    container.append(card);
  });
}

function renderHourly(hourly) {
  const chart = byId('hourly-chart');
  const peakLabel = byId('peak-hour');
  chart.replaceChildren();

  const values = Array.from({ length: 24 }, (_, hour) => {
    const source = hourly.find(item => Number(item.hour) === hour) || {};
    return {
      hour,
      visits: Number(source.visits) || 0,
      uniqueVisitors: Number(source.uniqueVisitors) || 0
    };
  });

  const maxVisits = Math.max(1, ...values.map(item => item.visits));
  const peak = values.reduce((best, item) => item.visits > best.visits ? item : best, values[0]);
  peakLabel.textContent = peak.visits
    ? `Đông nhất: ${String(peak.hour).padStart(2, '0')}:00–${String((peak.hour + 1) % 24).padStart(2, '0')}:00 · ${numberFormat.format(peak.visits)} lượt`
    : 'Chưa có dữ liệu';

  const activeDef = state.activeSlotKey ? defaultSlots.find(s => s.key === state.activeSlotKey) : null;

  values.forEach(item => {
    const column = document.createElement('div');
    column.className = 'hour-column';
    column.classList.add(getSlotForHour(item.hour));

    if (item.hour === peak.hour && peak.visits) {
      column.classList.add('peak');
    }

    if (activeDef) {
      const isMatch = item.hour >= activeDef.startHour && item.hour <= activeDef.endHour;
      if (!isMatch) {
        column.classList.add('dimmed');
      }
    }

    column.title = `${String(item.hour).padStart(2, '0')}:00–${String((item.hour + 1) % 24).padStart(2, '0')}:00: ${numberFormat.format(item.visits)} lượt, ${numberFormat.format(item.uniqueVisitors)} người dùng`;

    const value = document.createElement('span');
    value.className = 'hour-value';
    value.textContent = item.visits ? numberFormat.format(item.visits) : '';

    const bar = document.createElement('div');
    bar.className = 'hour-bar';
    bar.style.height = `${Math.max(2, (item.visits / maxVisits) * 128)}px`;

    const label = document.createElement('span');
    label.className = 'hour-label';
    label.textContent = item.hour % 2 === 0 ? String(item.hour).padStart(2, '0') : '';

    column.append(value, bar, label);
    chart.append(column);
  });
}

function renderThemes(themes, filterDate = null) {
  const body = byId('theme-table');
  body.replaceChildren();

  if (!themes.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.className = 'empty-row';
    cell.textContent = filterDate
      ? `Chưa có lượt mở giao diện trong ngày ${filterDate}.`
      : 'Chưa có lượt mở giao diện trong khoảng thời gian này.';
    return;
  }

  const total = themes.reduce((sum, row) => sum + row.views, 0) || 1;
  themes.forEach(item => {
    const percentage = (item.views / total) * 100;
    const row = body.insertRow();
    const themeCell = row.insertCell();
    themeCell.className = 'theme-cell';

    const nameLine = document.createElement('div');
    nameLine.className = 'theme-name';

    const name = document.createElement('strong');
    name.textContent = themeLabels[item.theme] || item.theme;

    const code = document.createElement('span');
    code.textContent = item.theme;
    nameLine.append(name, code);

    const track = document.createElement('div');
    track.className = 'theme-track';

    const fill = document.createElement('div');
    fill.className = 'theme-fill';
    fill.style.width = `${percentage.toFixed(2)}%`;
    track.append(fill);

    themeCell.append(nameLine, track);
    row.insertCell().textContent = numberFormat.format(item.views);
    row.insertCell().textContent = numberFormat.format(item.uniqueVisitors);
    row.insertCell().textContent = `${percentage.toFixed(1)}%`;
  });
}

function renderThemesFiltered() {
  if (!state.data) return;
  if (state.selectedThemeDate === 'all') {
    renderThemes(state.data.themes || []);
  } else {
    const dailyThemes = (state.data.dailyThemes || []).filter(item => item.date === state.selectedThemeDate);
    dailyThemes.sort((a, b) => b.views - a.views);
    renderThemes(dailyThemes, state.selectedThemeDate);
  }
}

function populateThemeDateFilter(daily, dailyThemes) {
  const select = byId('theme-date-filter');
  if (!select) return;

  const currentVal = state.selectedThemeDate;
  select.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = `Toàn bộ kỳ (${daily.length} ngày)`;
  select.append(allOption);

  // Group theme counts per date
  const dateCounts = new Map();
  (dailyThemes || []).forEach(dt => {
    dateCounts.set(dt.date, (dateCounts.get(dt.date) || 0) + Number(dt.views));
  });

  // Unique sorted dates descending
  const dates = Array.from(new Set([
    ...daily.map(d => d.date),
    ...(dailyThemes || []).map(dt => dt.date)
  ])).sort().reverse();

  dates.forEach(date => {
    const views = dateCounts.get(date) || 0;
    const opt = document.createElement('option');
    opt.value = date;
    opt.textContent = `${date} (${numberFormat.format(views)} lượt mở)`;
    select.append(opt);
  });

  if (dates.includes(currentVal) || currentVal === 'all') {
    select.value = currentVal;
  } else {
    state.selectedThemeDate = 'all';
    select.value = 'all';
  }
}

function renderDailyTable(daily, dailyThemes) {
  const body = byId('daily-table');
  body.replaceChildren();

  // Group dailyThemes by date
  const themeMap = new Map();
  (dailyThemes || []).forEach(item => {
    if (!themeMap.has(item.date)) themeMap.set(item.date, []);
    themeMap.get(item.date).push(item);
  });

  [...daily].reverse().forEach(item => {
    const row = body.insertRow();
    row.insertCell().textContent = item.date;
    row.insertCell().textContent = numberFormat.format(item.visits);
    row.insertCell().textContent = numberFormat.format(item.uniqueVisitors);
    row.insertCell().textContent = numberFormat.format(item.sessions);
    row.insertCell().textContent = numberFormat.format(item.authenticatedUsers);

    // Theme cell
    const themeCell = row.insertCell();
    const dayThemes = themeMap.get(item.date) || [];
    if (!dayThemes.length) {
      themeCell.innerHTML = '<span class="text-muted">—</span>';
    } else {
      const pillsContainer = document.createElement('div');
      pillsContainer.className = 'daily-theme-pills';

      dayThemes.sort((a, b) => b.views - a.views).forEach(dt => {
        const pill = document.createElement('span');
        pill.className = 'daily-theme-pill';
        const label = themeLabels[dt.theme] || dt.theme;
        pill.innerHTML = `${label} <strong>${numberFormat.format(dt.views)}</strong>`;
        pill.title = `${label}: ${numberFormat.format(dt.views)} lượt mở, ${numberFormat.format(dt.uniqueVisitors)} người dùng. Nhấp để xem chi tiết ngày này.`;

        pill.addEventListener('click', () => {
          state.selectedThemeDate = item.date;
          const select = byId('theme-date-filter');
          if (select) select.value = item.date;
          renderThemesFiltered();
          const themeSection = byId('theme-table');
          if (themeSection) {
            themeSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        pillsContainer.append(pill);
      });
      themeCell.append(pillsContainer);
    }
  });
}

function renderDashboard(data) {
  state.data = data;
  byId('access-state').classList.add('hidden');
  byId('dashboard').classList.remove('hidden');

  const generated = new Date(data.generatedAt);
  byId('generated-at').textContent = `Cập nhật ${generated.toLocaleString('vi-VN')}`;

  renderSummary(data.summary || {});
  renderChart(data.daily || []);
  renderTimeSlots(data.hourly || [], data.timeSlots || []);
  renderHourly(data.hourly || []);

  populateThemeDateFilter(data.daily || [], data.dailyThemes || []);
  renderThemesFiltered();
  renderDailyTable(data.daily || [], data.dailyThemes || []);
}

async function loadAnalytics() {
  const refresh = byId('refresh-button');
  refresh.disabled = true;
  try {
    const data = await fetchJson(`/api/admin/analytics?range=${state.range}`);
    renderDashboard(data);
  } catch (error) {
    if (error.status === 401) {
      showAccess('Cần đăng nhập', 'Đăng nhập bằng tài khoản Google quản trị để xem thống kê.', { login: true });
    } else if (error.status === 403) {
      showAccess('Không có quyền truy cập', error.message, { error: true });
    } else {
      showAccess('Không tải được thống kê', error.message, { error: true });
    }
  } finally {
    refresh.disabled = false;
  }
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function exportCsv() {
  if (!state.data) return;
  const rows = [['Báo cáo Stealth Reader'], ['Khoảng ngày', state.data.rangeDays], ['Tạo lúc', state.data.generatedAt], []];
  rows.push(['Chỉ số', 'Giá trị']);
  rows.push(['Lượt truy cập', state.data.summary.visits]);
  rows.push(['Người dùng duy nhất', state.data.summary.uniqueVisitors]);
  rows.push(['Phiên truy cập', state.data.summary.sessions]);
  rows.push(['User đã đăng nhập', state.data.summary.authenticatedUsers]);
  rows.push(['Lượt mở giao diện', state.data.summary.themeViews], []);

  // Time slots of day
  rows.push(['Khoảng giờ trong ngày (UTC+7)', 'Khung giờ', 'Lượt vào', 'Người dùng']);
  (state.data.timeSlots || defaultSlots).forEach(slot => {
    rows.push([slot.label, slot.hours, slot.visits || 0, slot.uniqueVisitors || 0]);
  });
  rows.push([]);

  // 24 Hourly
  rows.push(['Khung giờ chi tiết (UTC+7)', 'Lượt vào', 'Người dùng duy nhất']);
  (state.data.hourly || []).forEach(item => rows.push([`${String(item.hour).padStart(2, '0')}:00`, item.visits, item.uniqueVisitors]));
  rows.push([]);

  // Theme usage overall
  rows.push(['Theme (Toàn bộ kỳ)', 'Lượt mở', 'Người dùng']);
  (state.data.themes || []).forEach(item => rows.push([themeLabels[item.theme] || item.theme, item.views, item.uniqueVisitors]));
  rows.push([]);

  // Theme usage by day
  rows.push(['Thống kê Theme theo ngày']);
  rows.push(['Ngày', 'Theme', 'Lượt mở', 'Người dùng']);
  (state.data.dailyThemes || []).forEach(item => {
    rows.push([item.date, themeLabels[item.theme] || item.theme, item.views, item.uniqueVisitors]);
  });
  rows.push([]);

  // Daily table
  rows.push(['Ngày', 'Lượt truy cập', 'Người dùng', 'Phiên', 'Đã đăng nhập']);
  (state.data.daily || []).forEach(item => rows.push([item.date, item.visits, item.uniqueVisitors, item.sessions, item.authenticatedUsers]));

  const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `stealth-reader-analytics-${state.data.rangeDays}d.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function initialize() {
  try {
    const status = await fetchJson('/api/auth/status');
    if (!status.enabled) {
      showAccess('Đăng nhập chưa được cấu hình', 'Google Login chưa sẵn sàng trên máy chủ.', { error: true });
      return;
    }
    if (!status.authenticated) {
      showAccess('Cần đăng nhập', 'Đăng nhập bằng tài khoản Google quản trị để xem thống kê.', { login: true });
      return;
    }
    state.user = status.user;
    byId('admin-user').textContent = status.user.displayName || status.user.email;
    await loadAnalytics();
  } catch (error) {
    showAccess('Không kết nối được máy chủ', error.message, { error: true });
  }
}

document.querySelectorAll('[data-range]').forEach(button => {
  button.addEventListener('click', () => {
    state.range = Number(button.dataset.range);
    document.querySelectorAll('[data-range]').forEach(item => item.classList.toggle('active', item === button));
    loadAnalytics();
  });
});

const themeDateFilter = byId('theme-date-filter');
if (themeDateFilter) {
  themeDateFilter.addEventListener('change', function () {
    state.selectedThemeDate = this.value;
    renderThemesFiltered();
  });
}

byId('refresh-button').addEventListener('click', loadAnalytics);
byId('export-button').addEventListener('click', exportCsv);
initialize();
