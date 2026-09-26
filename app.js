/**
 * Excel Stealth Reader - Core Application Logic
 * Supports dual PDF parsing (High-speed Python API + client-side PDF.js fallback),
 * Excel camouflage table rendering, Boss Key, and Auto-advance.
 */

// Initialize PDF.js worker safely
if (window.pdfjsLib) {
  try {
    if (window.location.protocol !== 'file:') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'static/pdf.worker.min.js';
    } else {
      // On file:// protocol, disable worker or rely on fallback to avoid CORS SecurityError
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
  } catch (e) {
    console.warn('PDF.js worker init fallback:', e);
  }
}

// Application State
const state = {
  pdfDoc: null,
  pdfFileName: '',
  currentPage: 1,
  totalPages: 1,
  firstStoryPage: 1,
  pageTexts: {}, // pageNum -> array of text chunks
  currentChunks: [],
  currentRowIndex: 0,
  readingMode: 'grid', // 'grid' | 'formula'
  chunkMode: 'paragraph', // 'sentence' | 'paragraph'
  isAutoScrolling: false,
  autoScrollInterval: null,
  autoScrollDelay: 5000,
  bossModeActive: false,
  previousSheetId: 'view-sheet-story',
  fontSize: 11,
  fontFamily: 'Calibri',
  isBold: false,
  isItalic: false,
  textDimLevel: 100,
  wrapText: true
};

// Realistic mock categories & modules for corporate audit camouflage
const MODULES = [
  'SYS_CORE_SEC', 'AUTH_GATEWAY', 'DB_TRANSACTION', 'DATA_PIPELINE',
  'API_RATE_LIMIT', 'AUDIT_INTERNAL', 'RISK_MANAGEMENT', 'LEDGER_SYNC',
  'COMPLIANCE_BOT', 'NETWORK_TRAFFIC', 'IDENTITY_FED', 'BILLING_EVENT'
];

const STATUSES = [
  { text: 'VERIFIED', cls: 'verified' },
  { text: 'IN_REVIEW', cls: 'review' },
  { text: 'AUDITED', cls: 'audit' },
  { text: 'CONFIRMED', cls: 'verified' }
];

const AUDITORS = ['System_Bot', 'Auditor_04', 'Sec_Engine', 'Compliance_Lead', 'Audit_AI'];

// Sample story to show on first open
const SAMPLE_STORY_CHUNKS = [
  "Chào mừng bạn đến với Bộ đọc truyện ngụy trang giao diện Excel 365!",
  "Hệ thống đã sẵn sàng giúp bạn đọc tiểu thuyết, truyện chữ một cách kín đáo nhất trong giờ làm việc.",
  "Để bắt đầu: Hãy bấm nút [Nạp File PDF] trên thanh công cụ phía trên để chọn file truyện từ máy tính của bạn.",
  "LƯU Ý QUAN TRỌNG: Các file truyện PDF thường có Trang 1 là Bìa Sách, Trang 2 là Mục Lục, từ Trang 3 mới bắt đầu nội dung truyện!",
  "Sau khi nạp, hãy bấm nút [▶] hoặc nhập số trang '3' vào ô 'Trang PDF' để vào thẳng chương 1.",
  "PHÍM TẮT KHẨN CẤP (BOSS KEY): Khi sếp hoặc đồng nghiệp bước tới, hãy ấn phím [ESC] trên bàn phím. Màn hình sẽ lập tức chuyển sang bảng số liệu tài chính doanh thu 100%!",
  "Bấm phím [ESC] thêm lần nữa để quay lại đúng dòng truyện bạn đang đọc dở.",
  "Bạn có thể dùng phím Mũi tên Xuống [↓] hoặc phím [J] để nhảy câu tiếp theo, [↑] hoặc [K] để quay lại.",
  "Chế độ Ninja: Chọn đọc trên thanh công thức (fx) - bảng bên dưới hiển thị số liệu bình thường, câu truyện chỉ hiện trên thanh fx nhỏ ở đỉnh!",
  "Chúc bạn có những phút giây đọc truyện thư thái và an toàn!"
];

// DOM Elements
const elements = {
  tbody: document.getElementById('story-tbody'),
  formulaInput: document.getElementById('formula-input'),
  activeCellAddress: document.getElementById('active-cell-address'),
  pageIndicator: document.getElementById('page-indicator'),
  inputJumpPage: document.getElementById('input-jump-page'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  fileInput: document.getElementById('file-pdf-input'),
  modalFileInput: document.getElementById('modal-file-pdf'),
  pdfFileNameLabel: document.getElementById('pdf-file-name'),
  btnBossKey: document.getElementById('btn-boss-key'),
  btnToggleAutoScroll: document.getElementById('btn-toggle-autoscroll'),
  selectAutoScrollSpeed: document.getElementById('select-autoscroll-speed'),
  selectReadingMode: document.getElementById('select-reading-mode'),
  rangeTextDim: document.getElementById('range-text-dim'),
  selectFontFamily: document.getElementById('select-font-family'),
  selectFontSize: document.getElementById('select-font-size'),
  btnFontBold: document.getElementById('btn-font-bold'),
  btnFontItalic: document.getElementById('btn-font-italic'),
  btnWrapText: document.getElementById('btn-wrap-text'),
  stealthModal: document.getElementById('stealth-modal'),
  tabStealthSettings: document.getElementById('tab-stealth-settings'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  loadingSpinner: document.getElementById('loading-spinner'),
  loadingStatusText: document.getElementById('loading-status-text'),
  statusReadingInfo: document.getElementById('status-reading-info'),
  gridContainer: document.getElementById('grid-scroll-container'),
  statusBanner: document.getElementById('status-banner'),
  bannerText: document.getElementById('banner-text')
};

// ==========================================================
// INITIALIZATION
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  initEventListeners();
  initSheetTabs();
  
  // Ensure story sheet is active on start
  state.bossModeActive = false;
  switchSheet('view-sheet-story');

  if (state.currentChunks.length === 0) {
    loadChunks(SAMPLE_STORY_CHUNKS);
  } else {
    renderCurrentPage();
  }
});

function loadSavedState() {
  try {
    const saved = localStorage.getItem('excel_reader_state');
    if (saved) {
      const data = JSON.parse(saved);
      state.fontSize = data.fontSize || 11;
      state.fontFamily = data.fontFamily || 'Calibri';
      state.readingMode = data.readingMode || 'grid';
      state.autoScrollDelay = data.autoScrollDelay || 5000;
      state.textDimLevel = data.textDimLevel || 100;
      state.wrapText = data.wrapText !== undefined ? data.wrapText : true;
      state.pdfFileName = data.pdfFileName || '';
      
      if (elements.selectFontSize) elements.selectFontSize.value = state.fontSize;
      if (elements.selectFontFamily) elements.selectFontFamily.value = state.fontFamily;
      if (elements.selectReadingMode) elements.selectReadingMode.value = state.readingMode;
      if (elements.selectAutoScrollSpeed) elements.selectAutoScrollSpeed.value = state.autoScrollDelay;
      if (elements.rangeTextDim) elements.rangeTextDim.value = state.textDimLevel;
      if (elements.pdfFileNameLabel && state.pdfFileName) {
        elements.pdfFileNameLabel.textContent = state.pdfFileName;
      }
      applyStyles();
    }
  } catch (e) {
    console.error('Error loading saved state:', e);
  }
}

function saveState() {
  try {
    const data = {
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      readingMode: state.readingMode,
      autoScrollDelay: state.autoScrollDelay,
      textDimLevel: state.textDimLevel,
      wrapText: state.wrapText,
      currentPage: state.currentPage,
      currentRowIndex: state.currentRowIndex,
      pdfFileName: state.pdfFileName
    };
    localStorage.setItem('excel_reader_state', JSON.stringify(data));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

// ==========================================================
// EVENT LISTENERS & HOTKEYS
// ==========================================================
function initEventListeners() {
  elements.btnBossKey.addEventListener('click', toggleBossKey);

  document.addEventListener('keydown', (e) => {
    // If settings modal is open, ESC closes the modal, NOT boss key
    if (e.key === 'Escape' && elements.stealthModal.classList.contains('show')) {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.target.tagName === 'INPUT' && e.target.id !== 'input-jump-page' && e.key !== 'Escape') {
      return;
    }

    // ESC or F2: Instant Boss Key
    if (e.key === 'Escape' || e.key === 'F2') {
      e.preventDefault();
      toggleBossKey();
      return;
    }

    if (state.bossModeActive) return;

    // Navigation hotkeys
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      navigateRow(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      navigateRow(-1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      changePage(1);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      changePage(-1);
    } else if (e.key === ' ') {
      e.preventDefault();
      toggleAutoScroll();
    }
  });

  // PDF File Inputs
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.modalFileInput.addEventListener('change', handleFileSelect);

  // Drag & drop PDF
  const dropArea = document.getElementById('modal-drop-area');
  ['dragenter', 'dragover'].forEach(name => {
    dropArea.addEventListener(name, (e) => {
      e.preventDefault();
      dropArea.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(name => {
    dropArea.addEventListener(name, (e) => {
      e.preventDefault();
      dropArea.classList.remove('dragover');
    });
  });
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length && files[0].type === 'application/pdf') {
      processPdfFile(files[0]);
      closeModal();
    }
  });

  // Page Controls
  elements.btnPrevPage.addEventListener('click', () => changePage(-1));
  elements.btnNextPage.addEventListener('click', () => changePage(1));
  elements.inputJumpPage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(elements.inputJumpPage.value);
      if (page >= 1 && page <= state.totalPages) {
        goToPage(page);
      }
    }
  });

  // Reading Mode
  elements.selectReadingMode.addEventListener('change', (e) => {
    state.readingMode = e.target.value;
    saveState();
    renderCurrentPage();
  });

  // Auto Scroll
  elements.btnToggleAutoScroll.addEventListener('click', toggleAutoScroll);
  elements.selectAutoScrollSpeed.addEventListener('change', (e) => {
    state.autoScrollDelay = parseInt(e.target.value);
    if (state.isAutoScrolling) {
      stopAutoScroll();
      startAutoScroll();
    }
    saveState();
  });

  // Formatting controls
  elements.selectFontFamily.addEventListener('change', (e) => {
    state.fontFamily = e.target.value;
    applyStyles();
    saveState();
  });
  elements.selectFontSize.addEventListener('change', (e) => {
    state.fontSize = parseInt(e.target.value);
    applyStyles();
    saveState();
  });
  elements.btnFontBold.addEventListener('click', () => {
    state.isBold = !state.isBold;
    elements.btnFontBold.classList.toggle('active-toggle', state.isBold);
    applyStyles();
  });
  elements.btnFontItalic.addEventListener('click', () => {
    state.isItalic = !state.isItalic;
    elements.btnFontItalic.classList.toggle('active-toggle', state.isItalic);
    applyStyles();
  });
  elements.btnWrapText.addEventListener('click', () => {
    state.wrapText = !state.wrapText;
    elements.btnWrapText.classList.toggle('active-toggle', state.wrapText);
    applyStyles();
    saveState();
  });
  elements.rangeTextDim.addEventListener('input', (e) => {
    state.textDimLevel = parseInt(e.target.value);
    applyStyles();
    saveState();
  });

  // Modal controls
  elements.tabStealthSettings.addEventListener('click', openModal);
  elements.btnCloseModal.addEventListener('click', closeModal);
  elements.btnSaveSettings.addEventListener('click', closeModal);
  elements.stealthModal.addEventListener('click', (e) => {
    if (e.target === elements.stealthModal) closeModal();
  });

  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.readingMode = card.getAttribute('data-mode');
      elements.selectReadingMode.value = state.readingMode;
      saveState();
      renderCurrentPage();
    });
  });

  const selectChunk = document.getElementById('select-chunk-size');
  if (selectChunk) {
    selectChunk.addEventListener('change', (e) => {
      state.chunkMode = e.target.value;
      if (state.pdfDoc) {
        extractAndRenderPage(state.currentPage);
      }
    });
  }
}

function openModal() {
  elements.stealthModal.classList.add('show');
}
function closeModal() {
  elements.stealthModal.classList.remove('show');
}

function showBanner(html) {
  if (!elements.statusBanner) return;
  elements.bannerText.innerHTML = html;
  elements.statusBanner.style.display = 'flex';
}

function applyStyles() {
  const root = document.documentElement;
  root.style.setProperty('--story-font-family', state.fontFamily);
  root.style.setProperty('--story-font-size', `${state.fontSize}pt`);
  
  const grayVal = Math.round((100 - state.textDimLevel) * 2.2);
  const color = `rgb(${grayVal}, ${grayVal}, ${grayVal})`;
  root.style.setProperty('--story-color', color);

  document.querySelectorAll('.story-cell').forEach(cell => {
    cell.style.fontWeight = state.isBold ? 'bold' : 'normal';
    cell.style.fontStyle = state.isItalic ? 'italic' : 'normal';
    cell.style.whiteSpace = state.wrapText ? 'normal' : 'nowrap';
  });
}

// ==========================================================
// EXCEL SHEET TABS & BOSS KEY (EMERGENCY)
// ==========================================================
function initSheetTabs() {
  document.querySelectorAll('.sheet-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      switchSheet(targetId);
    });
  });
}

function switchSheet(targetId) {
  document.querySelectorAll('.sheet-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-target') === targetId);
  });
  document.querySelectorAll('.sheet-content').forEach(s => {
    s.classList.toggle('active', s.id === targetId);
  });
}

function toggleBossKey() {
  if (state.bossModeActive) {
    // Restore story sheet
    state.bossModeActive = false;
    switchSheet(state.previousSheetId || 'view-sheet-story');
    elements.btnBossKey.innerHTML = '<span class="boss-badge">ESC</span> 🚨 Sếp tới!';
    elements.btnBossKey.style.backgroundColor = '#d83b01';
  } else {
    // Emergency switch to Real Financial Report sheet
    state.bossModeActive = true;
    state.previousSheetId = document.querySelector('.sheet-content.active')?.id || 'view-sheet-story';
    stopAutoScroll();
    switchSheet('view-sheet-financial');
    elements.btnBossKey.innerHTML = '<span class="boss-badge">ESC</span> 🟢 An toàn (Đọc tiếp)';
    elements.btnBossKey.style.backgroundColor = '#107c41';
  }
}

// ==========================================================
// DUAL PDF PARSING: High-speed Python API + client-side PDF.js
// ==========================================================
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  processPdfFile(file);
}

async function processPdfFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    alert('Vui lòng chọn file định dạng PDF');
    return;
  }

  showLoading(`Đang nạp file: ${file.name}...`);
  state.pdfFileName = file.name;
  if (elements.pdfFileNameLabel) elements.pdfFileNameLabel.textContent = file.name;

  // Make sure Boss key is OFF and story sheet is active
  state.bossModeActive = false;
  switchSheet('view-sheet-story');
  elements.btnBossKey.innerHTML = '<span class="boss-badge">ESC</span> 🚨 Sếp tới!';
  elements.btnBossKey.style.backgroundColor = '#d83b01';

  // Strategy 1: Try High-Speed Python Server API
  let backendSuccess = false;
  try {
    const formData = new FormData();
    formData.append('pdf', file, file.name);

    const res = await fetch('/api/extract-pdf', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.totalPages > 0) {
        state.totalPages = data.totalPages;
        state.pageTexts = data.pages;
        state.firstStoryPage = data.firstStoryPage || 1;
        backendSuccess = true;

        document.getElementById('doc-title').textContent = `${file.name.replace(/\.pdf$/i, '')}.xlsx - Excel`;
        document.title = `${file.name.replace(/\.pdf$/i, '')}.xlsx - Excel`;

        // If page 1 has very little text (cover image), offer/auto jump to first content page
        const startPage = (state.firstStoryPage > 1) ? state.firstStoryPage : 1;
        state.currentPage = startPage;
        state.currentRowIndex = 0;

        showBanner(`✅ Đã nạp thành công <b>${data.totalPages}</b> trang sách! Đang mở Trang ${startPage} (nơi bắt đầu truyện). ` + 
          (state.firstStoryPage > 1 ? `<button onclick="goToPage(1)" style="margin-left:8px;padding:1px 6px;cursor:pointer;">Xem Trang bìa/Mục lục</button>` : ''));

        loadChunks(state.pageTexts[String(startPage)] || []);
        saveState();
        hideLoading();
        return;
      }
    }
  } catch (err) {
    console.log('Backend parser unavailable, falling back to client-side PDF.js...');
  }

  // Strategy 2: Client-side PDF.js Fallback
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    });
    
    state.pdfDoc = await loadingTask.promise;
    state.totalPages = state.pdfDoc.numPages;
    state.currentPage = 1;
    state.pageTexts = {};

    document.getElementById('doc-title').textContent = `${file.name.replace(/\.pdf$/i, '')}.xlsx - Excel`;
    document.title = `${file.name.replace(/\.pdf$/i, '')}.xlsx - Excel`;

    showBanner(`✅ Đã nạp thành công <b>${state.totalPages}</b> trang sách! Dùng phím <b>PageDown/PageUp</b> hoặc [◀] [▶] để chuyển trang.`);
    await extractAndRenderPage(1);
    saveState();
  } catch (err) {
    console.error('PDF parsing error:', err);
    alert('Không thể trích xuất file PDF: ' + err.message + '\nHãy chắc chắn bạn đang mở bằng file Chay_Web_Doc_Truyen.bat');
  } finally {
    hideLoading();
  }
}

async function extractAndRenderPage(pageNum) {
  if (state.pageTexts[String(pageNum)]) {
    state.currentPage = pageNum;
    state.currentRowIndex = 0;
    loadChunks(state.pageTexts[String(pageNum)]);
    return;
  }

  if (!state.pdfDoc) return;
  showLoading(`Đang đọc trang ${pageNum} / ${state.totalPages}...`);

  try {
    const page = await state.pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    let fullText = '';
    let lastY = null;
    
    textContent.items.forEach(item => {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 6) {
        fullText += '\n';
      }
      fullText += item.str + ' ';
      lastY = item.transform[5];
    });

    const chunks = splitTextIntoChunks(fullText, state.chunkMode);
    state.pageTexts[String(pageNum)] = chunks.length > 0 ? chunks : [
      `[Trang ${pageNum}: Trang bìa hoặc hình ảnh scan, không có văn bản. Hãy bấm nút ▶ để sang trang tiếp theo]`
    ];
    state.currentPage = pageNum;
    state.currentRowIndex = 0;
    
    loadChunks(state.pageTexts[String(pageNum)]);
  } catch (e) {
    console.error('Page extract error:', e);
  } finally {
    hideLoading();
  }
}

function splitTextIntoChunks(text, mode) {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/ +/g, ' ');
  
  if (mode === 'sentence') {
    const rawSentences = cleanText.split(/([.!?…\n]+)/);
    const sentences = [];
    let cur = '';
    for (let i = 0; i < rawSentences.length; i++) {
      cur += rawSentences[i];
      if (cur.trim().length > 20 || rawSentences[i].includes('\n')) {
        const s = cur.trim();
        if (s.length > 0) sentences.push(s);
        cur = '';
      }
    }
    if (cur.trim().length > 0) sentences.push(cur.trim());
    return sentences;
  } else {
    const paragraphs = cleanText.split(/\n\s*\n|\n/);
    const result = [];
    paragraphs.forEach(p => {
      const trimmed = p.trim();
      if (trimmed.length > 0) {
        if (trimmed.length > 250) {
          const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [trimmed];
          let buffer = '';
          parts.forEach(pt => {
            if ((buffer + pt).length > 220 && buffer.length > 0) {
              result.push(buffer.trim());
              buffer = pt;
            } else {
              buffer += ' ' + pt;
            }
          });
          if (buffer.trim().length > 0) result.push(buffer.trim());
        } else {
          result.push(trimmed);
        }
      }
    });
    return result;
  }
}

function loadChunks(chunks) {
  state.currentChunks = chunks;
  updatePaginationUI();
  renderCurrentPage();
}

function updatePaginationUI() {
  elements.pageIndicator.textContent = `${state.currentPage} / ${state.totalPages}`;
  elements.inputJumpPage.value = state.currentPage;
  elements.inputJumpPage.max = state.totalPages;
  elements.btnPrevPage.disabled = state.currentPage <= 1;
  elements.btnNextPage.disabled = state.currentPage >= state.totalPages;
}

function changePage(delta) {
  const target = state.currentPage + delta;
  if (target >= 1 && target <= state.totalPages) {
    goToPage(target);
  }
}

function goToPage(pageNum) {
  pageNum = parseInt(pageNum);
  if (pageNum < 1 || pageNum > state.totalPages) return;

  state.currentPage = pageNum;
  state.currentRowIndex = 0;

  if (state.pageTexts[String(pageNum)]) {
    loadChunks(state.pageTexts[String(pageNum)]);
  } else if (state.pdfDoc) {
    extractAndRenderPage(pageNum);
  }
}

// ==========================================================
// RENDERING STORY IN EXCEL TABLE
// ==========================================================
function renderCurrentPage() {
  const chunks = state.currentChunks;
  elements.tbody.innerHTML = '';

  const baseTimestamp = new Date();
  baseTimestamp.setHours(9, 15, 0, 0);

  chunks.forEach((chunk, index) => {
    const row = document.createElement('tr');
    row.id = `story-row-${index}`;
    row.dataset.index = index;

    const auditId = `AUD-${10000 + index * 3 + (state.currentPage * 100)}`;
    const mod = MODULES[index % MODULES.length];
    
    const rowTime = new Date(baseTimestamp.getTime() + index * 85000);
    const timeStr = rowTime.toISOString().replace('T', ' ').substring(0, 19);

    const st = STATUSES[index % STATUSES.length];
    const variance = (Math.sin(index) * 2.5).toFixed(1);
    const varianceText = (variance >= 0 ? '+' : '') + variance + '%';
    const auditor = AUDITORS[index % AUDITORS.length];

    let colDContent = chunk;
    if (state.readingMode === 'formula') {
      colDContent = `Routine transaction ledger integrity verification #${100 + index}. Status: NOMINAL.`;
    }

    row.innerHTML = `
      <td class="row-header">${index + 2}</td>
      <td style="font-family: monospace; font-size: 10px; color: #444;">${auditId}</td>
      <td style="font-weight: 500; font-size: 11px;">${mod}</td>
      <td style="color: #666; font-size: 10px;">${timeStr}</td>
      <td class="story-cell" id="story-cell-${index}" tabindex="0">${escapeHtml(colDContent)}</td>
      <td><span class="badge-status ${st.cls}">${st.text}</span></td>
      <td style="text-align: right; color: ${variance >= 0 ? '#107c41' : '#a80000'}">${varianceText}</td>
      <td style="color: #555;">${auditor}</td>
    `;

    row.addEventListener('click', () => {
      setActiveRow(index, true);
    });

    elements.tbody.appendChild(row);
  });

  applyStyles();
  setActiveRow(Math.min(state.currentRowIndex, Math.max(0, chunks.length - 1)), false);
}

function setActiveRow(index, scrollIntoView = true) {
  if (index < 0 || index >= state.currentChunks.length) return;
  state.currentRowIndex = index;

  document.querySelectorAll('#story-tbody tr').forEach(r => r.classList.remove('selected-story-row'));
  document.querySelectorAll('.story-cell').forEach(c => c.classList.remove('cell-focused'));

  const activeRow = document.getElementById(`story-row-${index}`);
  const activeCell = document.getElementById(`story-cell-${index}`);
  if (activeRow && activeCell) {
    activeRow.classList.add('selected-story-row');
    activeCell.classList.add('cell-focused');

    if (scrollIntoView) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const storyText = state.currentChunks[index] || '';
  if (state.readingMode === 'formula') {
    elements.formulaInput.value = `=PROSE("${storyText}")`;
  } else {
    elements.formulaInput.value = storyText;
  }

  elements.activeCellAddress.textContent = `D${index + 2}`;

  const percent = Math.round(((index + 1) / state.currentChunks.length) * 100);
  elements.statusReadingInfo.textContent = `Dòng: ${index + 1}/${state.currentChunks.length} | Trang: ${state.currentPage}/${state.totalPages} (${percent}%)`;

  saveState();
}

function navigateRow(delta) {
  const next = state.currentRowIndex + delta;
  if (next >= 0 && next < state.currentChunks.length) {
    setActiveRow(next, true);
  } else if (next >= state.currentChunks.length && state.currentPage < state.totalPages) {
    changePage(1);
  } else if (next < 0 && state.currentPage > 1) {
    changePage(-1);
  }
}

// ==========================================================
// AUTO-SCROLL (HANDS-FREE READING)
// ==========================================================
function toggleAutoScroll() {
  if (state.isAutoScrolling) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
}

function startAutoScroll() {
  state.isAutoScrolling = true;
  elements.btnToggleAutoScroll.textContent = '⏸ Tạm dừng';
  elements.btnToggleAutoScroll.classList.add('playing');

  state.autoScrollInterval = setInterval(() => {
    navigateRow(1);
  }, state.autoScrollDelay);
}

function stopAutoScroll() {
  state.isAutoScrolling = false;
  elements.btnToggleAutoScroll.textContent = '▶ Bật';
  elements.btnToggleAutoScroll.classList.remove('playing');

  if (state.autoScrollInterval) {
    clearInterval(state.autoScrollInterval);
    state.autoScrollInterval = null;
  }
}

// ==========================================================
// UTILITIES
// ==========================================================
function showLoading(msg) {
  elements.loadingStatusText.textContent = msg;
  elements.loadingSpinner.style.display = 'flex';
}
function hideLoading() {
  elements.loadingSpinner.style.display = 'none';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
