/**
 * Multi-Theme Stealth Reader - Core Logic
 * Supports: Google Sheets (Online), Microsoft Excel 365, and Real VS Code IDE
 * Fast PDF parsing (Python API + client-side PDF.js fallback),
 * Boss Key (ESC), Auto-advance, and local persistence.
 */

// Initialize PDF.js worker safely
if (window.pdfjsLib) {
  try {
    if (window.location.protocol !== 'file:') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'static/pdf.worker.min.js';
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
  } catch (e) {
    console.warn('PDF.js worker fallback:', e);
  }
}

// Application State - Continuous Infinite Reading Architecture
const state = {
  theme: 'theme-googlesheets', // 'theme-googlesheets' | 'theme-excel' | 'theme-vscode'
  pdfDoc: null,
  pdfFileName: '',
  currentPage: 1,
  totalPages: 1,
  firstStoryPage: 1,
  
  // Continuous stream across entire document
  allChunks: [], // Array of { text, page, indexInPage, globalIndex }
  pageStartIndices: {}, // pageNum -> globalIndex
  
  // Progressive infinite rendering
  renderedCount: 0,
  BATCH_SIZE: 100, // Render 100 chunks at a time for silky 60fps performance
  currentGlobalIndex: 0,
  
  readingMode: 'grid', // 'grid' | 'formula'
  chunkMode: 'paragraph',
  isAutoScrolling: false,
  autoScrollInterval: null,
  autoScrollDelay: 5000,
  bossModeActive: false,
  previousSheetId: 'view-sheet-story',
  fontSize: 10,
  fontFamily: 'Arial',
  isBold: false,
  isItalic: false,
  textDimLevel: 100,
  wrapText: true,
  
  // Stealth disguise titles (persisted in localStorage)
  gsheetTitle: localStorage.getItem('stealth_title_gsheet') || 'Báo cáo số liệu & Phân tích KPI Q3',
  excelTitle: localStorage.getItem('stealth_title_excel') || 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx',
  vscodeTitle: localStorage.getItem('stealth_title_vscode') || 'stream_pipeline_processor.py'
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

// Complex Python code for Boss Key in VS Code (Shows 100% real backend code)
const VSCODE_BOSS_CODE = [
  'import asyncio',
  'import hashlib',
  'import hmac',
  'from typing import Optional, List, Dict, Any',
  'from datetime import datetime, timezone',
  'from pydantic import BaseModel, Field',
  'from fastapi import FastAPI, Depends, HTTPException, status',
  'from fastapi.security import OAuth2PasswordBearer',
  '',
  '# ============================================================================== ',
  '# CORE AUTHENTICATION AND DISTRIBUTED TOKEN SIGNING ENGINE',
  '# ============================================================================== ',
  '',
  'class TokenPayload(BaseModel):',
  '    sub: str = Field(..., description="Subject unique identifier")',
  '    exp: int = Field(..., description="Expiration epoch timestamp")',
  '    roles: List[str] = Field(default_factory=list)',
  '    tenant_id: str = "cluster-01-prod"',
  '',
  'class SecurityClusterManager:',
  '    def __init__(self, secret_key: str, algorithm: str = "HS256"):',
  '        self._secret = secret_key.encode("utf-8")',
  '        self.algorithm = algorithm',
  '        self._nonce_cache = set()',
  '',
  '    async def verify_signature(self, token_header: str, signature: str) -> bool:',
  '        digest = hmac.new(self._secret, token_header.encode(), hashlib.sha256).hexdigest()',
  '        if not hmac.compare_digest(digest, signature):',
  '            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")',
  '        return True',
  '',
  '    async def evaluate_access_policy(self, user_id: str, resource_urn: str) -> Dict[str, Any]:',
  '        await asyncio.sleep(0.005) # Async IO non-blocking query',
  '        return {"allowed": True, "evaluated_at": datetime.now(timezone.utc).isoformat()}',
  '',
  '# Pipeline worker daemon process',
  'async def bootstrap_cluster_nodes():',
  '    manager = SecurityClusterManager("k9a8s7d6f5g4h3j2k1l0")',
  '    status = await manager.evaluate_access_policy("usr_sysadmin", "urn:cloud:db:replica_02")',
  '    print(f"[CLUSTER HEALTH] Telemetry verified: {status}")',
  '',
  'if __name__ == "__main__":',
  '    asyncio.run(bootstrap_cluster_nodes())'
];

// Sample story to show on first open
const SAMPLE_STORY_CHUNKS = [
  "Chào mừng bạn đến với Bộ đọc truyện ngụy trang Google Sheets & Excel & VS Code!",
  "Hệ thống giúp bạn đọc tiểu thuyết, truyện chữ cực kỳ kín đáo và an toàn trong giờ làm việc.",
  "Để bắt đầu: Hãy bấm nút [+ Nạp File PDF] trên thanh công cụ phía trên để nạp file truyện từ máy tính của bạn.",
  "LƯU Ý: Các file truyện PDF thường có Trang 1 là Bìa Sách, Trang 2 là Mục Lục, từ Trang 3 mới bắt đầu nội dung!",
  "Hệ thống sẽ tự động bỏ qua bìa ảnh và mở ngay chương 1 cho bạn đọc.",
  "🚨 PHÍM TẮT KHẨN CẤP (BOSS KEY): Bấm phím [ESC] trên bàn phím. Màn hình sẽ lập tức chuyển sang chế độ làm việc khẩn cấp (Bảng tài chính hoặc Code thuật toán)!",
  "Bấm [ESC] thêm lần nữa để quay lại đúng dòng truyện bạn đang đọc dở.",
  "Bạn có thể dùng phím Mũi tên Xuống [↓] hoặc phím [J] để nhảy câu tiếp theo, [↑] hoặc [K] để lùi lại.",
  "🎨 ĐỔI GIAO DIỆN: Bấm nút 'Đổi Giao Diện' ở góc trên để đổi giữa Google Sheets, Excel 365, hoặc VS Code bất cứ lúc nào!",
  "Chúc bạn có những giờ phút thư giãn vui vẻ và hiệu quả trong công việc!"
];

// Favicons for themes
const FAVICONS = {
  'theme-googlesheets': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 32'><path fill='%230F9D58' d='M15 0H2C.9 0 0 .9 0 2v28c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V9l-9-9z'/><path fill='%2387CEAB' d='M15 0v9h9L15 0z'/><path fill='%23ffffff' d='M4 14h16v2H4zm0 4h16v2H4zm0 4h16v2H4zm6-10v14h2V12h-2z'/></svg>",
  'theme-excel': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='%23107c41'/><text x='16' y='23' font-size='20' font-family='Segoe UI,sans-serif' font-weight='bold' fill='white' text-anchor='middle'>X</text></svg>",
  'theme-vscode': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='%23007ACC' d='M72 98L97 86V14L72 2 28 42 11 29 2 34l22 20L2 74l9 5 17-13 44 32z'/><path fill='%231F9CF0' d='M72 2v96l25-12V14L72 2zm0 28L46 54l26 24V30z'/></svg>"
};

// ==========================================================
// INITIALIZATION
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  initThemeSystem();
  initTitleEditing();
  initEventListeners();
  initSheetTabs();
  initContinuousScrollListeners();
  initLandingPortal();
  
  state.bossModeActive = false;
  switchSheet('view-sheet-story');

  if (state.allChunks.length === 0) {
    initStoryFromChunks(SAMPLE_STORY_CHUNKS);
  } else {
    renderContinuousView(true);
  }
});

function loadSavedState() {
  try {
    const savedTheme = localStorage.getItem('selected_theme');
    if (savedTheme) state.theme = savedTheme;

    state.gsheetTitle = localStorage.getItem('stealth_title_gsheet') || 'Báo cáo số liệu & Phân tích KPI Q3';
    state.excelTitle = localStorage.getItem('stealth_title_excel') || 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx';
    state.vscodeTitle = localStorage.getItem('stealth_title_vscode') || 'stream_pipeline_processor.py';

    const saved = localStorage.getItem('excel_reader_state');
    if (saved) {
      const data = JSON.parse(saved);
      state.fontSize = data.fontSize || (state.theme === 'theme-googlesheets' ? 10 : 11);
      state.fontFamily = data.fontFamily || (state.theme === 'theme-googlesheets' ? 'Arial' : 'Calibri');
      state.readingMode = data.readingMode || 'grid';
      state.autoScrollDelay = data.autoScrollDelay || 5000;
      state.textDimLevel = data.textDimLevel || 100;
      state.wrapText = data.wrapText !== undefined ? data.wrapText : true;
      state.pdfFileName = data.pdfFileName || '';
      if (data.currentGlobalIndex !== undefined) state.currentGlobalIndex = data.currentGlobalIndex;
      if (data.currentPage !== undefined) state.currentPage = data.currentPage;
    }
  } catch (e) {
    console.error('Error loading state:', e);
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
      currentGlobalIndex: state.currentGlobalIndex,
      pdfFileName: state.pdfFileName
    };
    localStorage.setItem('excel_reader_state', JSON.stringify(data));
    localStorage.setItem('selected_theme', state.theme);
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

// ==========================================================
// THEME SYSTEM
// ==========================================================
function initThemeSystem() {
  applyTheme(state.theme);

  const openButtons = ['btn-open-theme-modal', 'btn-open-theme-modal-excel', 'btn-open-theme-modal-vscode'];
  openButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', openThemeModal);
  });

  const closeBtn = document.getElementById('btn-close-theme-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeThemeModal);

  const confirmBtn = document.getElementById('btn-confirm-theme');
  if (confirmBtn) confirmBtn.addEventListener('click', closeThemeModal);

  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const chosenTheme = card.getAttribute('data-theme');
      applyTheme(chosenTheme);
      saveState();
    });
  });
}

function openThemeModal() {
  document.getElementById('theme-modal').classList.add('show');
}
function closeThemeModal() {
  document.getElementById('theme-modal').classList.remove('show');
}

function applyTheme(themeName) {
  state.theme = themeName;
  document.body.className = themeName;

  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-theme') === themeName);
  });

  const favicon = document.getElementById('app-favicon');
  if (favicon && FAVICONS[themeName]) {
    favicon.href = FAVICONS[themeName];
  }

  const storyLabel = document.getElementById('tab-story-label');
  const headerTitle = document.getElementById('story-header-title');

  if (themeName === 'theme-googlesheets') {
    const docTitle = state.gsheetTitle || 'Báo cáo số liệu & Phân tích KPI Q3';
    document.title = `${docTitle} - Google Trang tính`;
    const gTitle = document.getElementById('gsheet-doc-title');
    if (gTitle) gTitle.textContent = docTitle;
    if (storyLabel) storyLabel.textContent = 'Trang tính1';
    if (headerTitle) headerTitle.textContent = 'Log Description & Execution Details';
  } else if (themeName === 'theme-excel') {
    const docTitle = state.excelTitle || 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx';
    document.title = `${docTitle} - Excel`;
    const eTitle = document.getElementById('excel-doc-title');
    if (eTitle) eTitle.textContent = docTitle;
    if (storyLabel) storyLabel.textContent = 'Audit_Finding_Q3';
    if (headerTitle) headerTitle.textContent = 'Audit Log Finding & Notes (Story Text)';
  } else if (themeName === 'theme-vscode') {
    const docTitle = state.vscodeTitle || 'stream_pipeline_processor.py';
    document.title = `${docTitle} - dev_workspace - Visual Studio Code`;
    const vTitle = document.getElementById('vsc-title-doc');
    if (vTitle) vTitle.textContent = `${docTitle} - dev_workspace - Visual Studio Code`;
    const tabName = document.getElementById('vsc-tab-filename');
    if (tabName) tabName.textContent = docTitle;
  }

  applyStyles();
  renderContinuousView(true);
  updatePortalThemeUI(themeName);
}

// ==========================================================
// EDITABLE STEALTH TITLES (CLICK-TO-RENAME & TAB SYNC)
// ==========================================================
function initTitleEditing() {
  const gTitle = document.getElementById('gsheet-doc-title');
  if (gTitle) {
    gTitle.addEventListener('blur', () => {
      let val = gTitle.textContent.trim();
      if (!val) val = 'Báo cáo số liệu & Phân tích KPI Q3';
      gTitle.textContent = val;
      state.gsheetTitle = val;
      localStorage.setItem('stealth_title_gsheet', val);
      if (state.theme === 'theme-googlesheets') {
        document.title = `${val} - Google Trang tính`;
      }
      showPageFlipToast(`✅ Đã đổi tên tài liệu: <b>${escapeHtml(val)}</b>`);
    });
    gTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        gTitle.blur();
      }
    });
  }

  const eTitle = document.getElementById('excel-doc-title');
  if (eTitle) {
    eTitle.addEventListener('blur', () => {
      let val = eTitle.textContent.trim();
      if (!val) val = 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx';
      if (!val.toLowerCase().endsWith('.xlsx') && !val.toLowerCase().endsWith('.xls')) {
        val += '.xlsx';
      }
      eTitle.textContent = val;
      state.excelTitle = val;
      localStorage.setItem('stealth_title_excel', val);
      if (state.theme === 'theme-excel') {
        document.title = `${val} - Excel`;
      }
      showPageFlipToast(`✅ Đã đổi tên bảng tính: <b>${escapeHtml(val)}</b>`);
    });
    eTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        eTitle.blur();
      }
    });
  }

  const vTab = document.getElementById('vsc-tab-filename');
  const vTitle = document.getElementById('vsc-title-doc');
  if (vTab) {
    vTab.addEventListener('blur', () => {
      let val = vTab.textContent.trim();
      if (!val) val = 'stream_pipeline_processor.py';
      vTab.textContent = val;
      state.vscodeTitle = val;
      localStorage.setItem('stealth_title_vscode', val);
      if (vTitle) vTitle.textContent = `${val} - dev_workspace - Visual Studio Code`;
      if (state.theme === 'theme-vscode') {
        document.title = `${val} - dev_workspace - Visual Studio Code`;
      }
      showPageFlipToast(`✅ Đã đổi tên file code: <b>${escapeHtml(val)}</b>`);
    });
    vTab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        vTab.blur();
      }
    });
  }
}

// ==========================================================
// LANDING PORTAL, THEME SELECTOR & AUTHOR DONATE
// ==========================================================
function initLandingPortal() {
  const portal = document.getElementById('landing-portal');
  if (!portal) return;

  const skipPortal = localStorage.getItem('skip_portal') === 'true';
  const closeBtn = document.getElementById('btn-portal-close');
  const rememberChk = document.getElementById('chk-remember-direct-mode');

  if (rememberChk) rememberChk.checked = skipPortal;

  // Initial visibility check
  if (skipPortal) {
    portal.classList.add('hidden');
    if (closeBtn) closeBtn.style.display = 'flex';
  } else {
    portal.classList.remove('hidden');
    if (closeBtn) closeBtn.style.display = 'none';
  }

  // Sync theme UI
  updatePortalThemeUI(state.theme);

  // Clicking mission items on the portal
  document.querySelectorAll('.duo-mission-item, .portal-theme-item').forEach(item => {
    item.addEventListener('click', () => {
      const chosenTheme = item.getAttribute('data-theme');
      state.theme = chosenTheme;
      updatePortalThemeUI(chosenTheme);
      applyTheme(chosenTheme);
      saveState();
      
      // Playful micro confetti burst on selection
      const rect = item.getBoundingClientRect();
      launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 20);
    });
  });

  // Enter button (Start reading)
  const enterBtn = document.getElementById('btn-portal-enter');
  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      if (rememberChk && rememberChk.checked) {
        localStorage.setItem('skip_portal', 'true');
      } else {
        localStorage.removeItem('skip_portal');
      }

      // Celebratory Confetti explosion!
      const rect = enterBtn.getBoundingClientRect();
      launchConfetti(rect.left + rect.width / 2, rect.top, 80);

      setTimeout(() => {
        portal.classList.add('hidden');
        if (closeBtn) closeBtn.style.display = 'flex';
        renderContinuousView(true);
      }, 350);
    });
  }

  // Close button (Resume reading session)
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      portal.classList.add('hidden');
    });
  }

  // Open Portal Buttons from theme headers and theme modal
  ['btn-open-portal-gsheet', 'btn-open-portal-excel', 'btn-open-portal-vscode', 'btn-modal-to-portal'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        closeThemeModal();
        portal.classList.remove('hidden');
        if (closeBtn) closeBtn.style.display = 'flex';
        updatePortalThemeUI(state.theme);
      });
    }
  });

  // Copy STK Button
  const copyBtn = document.getElementById('btn-copy-stk');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyAccountNumber);
  }

  // Portal PDF File Input
  const portalFileInput = document.getElementById('portal-file-input');
  if (portalFileInput) {
    portalFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const nameLabel = document.getElementById('portal-pdf-filename');
        if (nameLabel) nameLabel.textContent = file.name;
        processPdfFile(file);
        launchConfetti(window.innerWidth / 2, window.innerHeight / 2, 40);
      }
    });
  }
}

function updatePortalThemeUI(themeName) {
  document.querySelectorAll('.duo-mission-item, .portal-theme-item').forEach(item => {
    const match = item.getAttribute('data-theme') === themeName;
    item.classList.toggle('selected', match);
  });
}

function copyAccountNumber() {
  const stk = '1015471873';
  const copyBtn = document.getElementById('btn-copy-stk');
  
  if (copyBtn) {
    const rect = copyBtn.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top, 50);
  }

  const showFeedback = () => {
    if (copyBtn) {
      copyBtn.innerHTML = '<span>🎉 ĐÃ SAO CHÉP STK!</span>';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.innerHTML = '<span>📋 SAO CHÉP SỐ TÀI KHOẢN</span>';
        copyBtn.classList.remove('copied');
      }, 2500);
    }
    showPageFlipToast('🎉 Đã sao chép STK: <b>1015471873</b> (Vietcombank - NGUYEN TRAN HAI PHONG)');
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(stk).then(showFeedback).catch(() => fallbackCopySTK(stk, showFeedback));
  } else {
    fallbackCopySTK(stk, showFeedback);
  }
}

function fallbackCopySTK(text, onSuccess) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    onSuccess();
  } catch (e) {
    prompt('Vui lòng sao chép số tài khoản Vietcombank:', text);
  }
  document.body.removeChild(ta);
}

// ==========================================================
// DUOLINGO CELEBRATION CONFETTI ENGINE (PURE JS / 60 FPS)
// ==========================================================
function launchConfetti(originX, originY, count = 60) {
  let canvas = document.getElementById('duo-confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'duo-confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999999';
    document.body.appendChild(canvas);
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  
  // Duolingo vibrant color confetti
  const colors = ['#58CC02', '#1CB0F6', '#FF9600', '#FFC800', '#FF4B4B', '#CE82FF', '#2B70C9'];
  const particles = [];
  const x = (originX !== undefined) ? originX : window.innerWidth / 2;
  const y = (originY !== undefined) ? originY : window.innerHeight / 2;

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI) + Math.PI; // Explode upwards and outwards
    const speed = 5 + Math.random() * 9;
    particles.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y,
      vx: Math.cos(angle) * speed * 1.3,
      vy: Math.sin(angle) * speed * 1.5,
      size: 7 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 14,
      opacity: 1,
      gravity: 0.28
    });
  }

  function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.opacity -= 0.016;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      }
    }

    if (alive) {
      requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(updateConfetti);
}


// ==========================================================
// EVENT LISTENERS & HOTKEYS
// ==========================================================
function initEventListeners() {
  ['btn-boss-key-gsheet', 'btn-boss-key-excel', 'btn-boss-key-vscode'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', toggleBossKey);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const themeModal = document.getElementById('theme-modal');
      const stealthModal = document.getElementById('stealth-modal');
      if (themeModal && themeModal.classList.contains('show')) {
        e.preventDefault();
        closeThemeModal();
        return;
      }
      if (stealthModal && stealthModal.classList.contains('show')) {
        e.preventDefault();
        closeModal();
        return;
      }

      e.preventDefault();
      toggleBossKey();
      return;
    }

    if (e.key === 'F2') {
      e.preventDefault();
      toggleBossKey();
      return;
    }

    if (e.target.tagName === 'INPUT' && !e.target.id.includes('jump')) {
      return;
    }

    if (state.bossModeActive) return;

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

  const fileInput = document.getElementById('file-pdf-input');
  const modalFileInput = document.getElementById('modal-file-pdf');
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);
  if (modalFileInput) modalFileInput.addEventListener('change', handleFileSelect);

  const dropArea = document.getElementById('modal-drop-area');
  if (dropArea) {
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
  }

  // Page Controls
  ['gs-btn-prev', 'excel-btn-prev', 'vsc-btn-prev'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => changePage(-1));
  });
  ['gs-btn-next', 'excel-btn-next', 'vsc-btn-next'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => changePage(1));
  });

  ['gs-input-jump', 'excel-input-jump'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const page = parseInt(input.value);
          if (page >= 1 && page <= state.totalPages) {
            goToPage(page);
          }
        }
      });
    }
  });

  // Auto Scroll
  ['gs-btn-autoscroll', 'excel-btn-autoscroll', 'vsc-btn-autoscroll'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', toggleAutoScroll);
  });
  ['gs-select-speed', 'excel-select-speed'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.addEventListener('change', (e) => {
        state.autoScrollDelay = parseInt(e.target.value);
        if (state.isAutoScrolling) {
          stopAutoScroll();
          startAutoScroll();
        }
        syncControls();
        saveState();
      });
    }
  });

  // Reading Mode
  ['gs-select-mode', 'excel-select-mode'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.addEventListener('change', (e) => {
        state.readingMode = e.target.value;
        syncControls();
        saveState();
        renderContinuousView(true);
      });
    }
  });

  // Font and Formatting
  ['gs-select-font-family', 'excel-select-font-family'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.addEventListener('change', (e) => {
        state.fontFamily = e.target.value;
        syncControls();
        applyStyles();
        saveState();
      });
    }
  });

  ['gs-select-font-size', 'excel-select-font-size'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.addEventListener('change', (e) => {
        state.fontSize = parseInt(e.target.value);
        syncControls();
        applyStyles();
        saveState();
      });
    }
  });

  ['gs-btn-bold', 'excel-btn-bold'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        state.isBold = !state.isBold;
        syncControls();
        applyStyles();
      });
    }
  });

  ['gs-btn-italic', 'excel-btn-italic'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        state.isItalic = !state.isItalic;
        syncControls();
        applyStyles();
      });
    }
  });

  ['gs-btn-wrap', 'excel-btn-wrap'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        state.wrapText = !state.wrapText;
        syncControls();
        applyStyles();
        saveState();
      });
    }
  });

  ['gs-range-dim', 'excel-range-dim'].forEach(id => {
    const rng = document.getElementById(id);
    if (rng) {
      rng.addEventListener('input', (e) => {
        state.textDimLevel = parseInt(e.target.value);
        syncControls();
        applyStyles();
        saveState();
      });
    }
  });

  const stealthTab = document.getElementById('tab-stealth-settings-excel');
  if (stealthTab) stealthTab.addEventListener('click', openModal);

  const closeModalBtn = document.getElementById('btn-close-modal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  const saveSettingsBtn = document.getElementById('btn-save-settings');
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', closeModal);

  const stealthModal = document.getElementById('stealth-modal');
  if (stealthModal) {
    stealthModal.addEventListener('click', (e) => {
      if (e.target === stealthModal) closeModal();
    });
  }
}

function openModal() {
  document.getElementById('stealth-modal').classList.add('show');
}
function closeModal() {
  document.getElementById('stealth-modal').classList.remove('show');
}

function syncControls() {
  ['gs-select-mode', 'excel-select-mode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.readingMode;
  });
  ['gs-select-font-family', 'excel-select-font-family'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.fontFamily;
  });
  ['gs-select-font-size', 'excel-select-font-size'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.fontSize;
  });
  ['gs-select-speed', 'excel-select-speed'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.autoScrollDelay;
  });
  ['gs-range-dim', 'excel-range-dim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.textDimLevel;
  });

  const b1 = document.getElementById('gs-btn-bold');
  const b2 = document.getElementById('excel-btn-bold');
  if (b1) b1.classList.toggle('active-toggle', state.isBold);
  if (b2) b2.classList.toggle('active-toggle', state.isBold);

  const i1 = document.getElementById('gs-btn-italic');
  const i2 = document.getElementById('excel-btn-italic');
  if (i1) i1.classList.toggle('active-toggle', state.isItalic);
  if (i2) i2.classList.toggle('active-toggle', state.isItalic);

  const w1 = document.getElementById('gs-btn-wrap');
  const w2 = document.getElementById('excel-btn-wrap');
  if (w1) w1.classList.toggle('active-toggle', state.wrapText);
  if (w2) w2.classList.toggle('active-toggle', state.wrapText);
}

function showBanner(html) {
  const banner = document.getElementById('status-banner');
  const text = document.getElementById('banner-text');
  if (banner && text) {
    text.innerHTML = html;
    banner.style.display = 'flex';
  }
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
// EXCEL & GOOGLE SHEETS TABS & BOSS KEY (EMERGENCY)
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
  const bossButtons = [
    document.getElementById('btn-boss-key-gsheet'),
    document.getElementById('btn-boss-key-excel'),
    document.getElementById('btn-boss-key-vscode')
  ];

  if (state.bossModeActive) {
    state.bossModeActive = false;
    switchSheet(state.previousSheetId || 'view-sheet-story');
    bossButtons.forEach(btn => {
      if (btn) {
        btn.innerHTML = '<span class="boss-badge">ESC</span> 🚨 Sếp tới!';
        btn.style.backgroundColor = '#d93025';
      }
    });

    // In VS Code, re-render the novel code
    if (state.theme === 'theme-vscode') {
      renderContinuousView(true);
    }
  } else {
    state.bossModeActive = true;
    state.previousSheetId = document.querySelector('.sheet-content.active')?.id || 'view-sheet-story';
    stopAutoScroll();
    switchSheet('view-sheet-financial');
    bossButtons.forEach(btn => {
      if (btn) {
        btn.innerHTML = '<span class="boss-badge">ESC</span> 🟢 An toàn (Đọc tiếp)';
        btn.style.backgroundColor = '#0F9D58';
      }
    });

    // In VS Code, render pure algorithm code for Boss Key
    if (state.theme === 'theme-vscode') {
      renderVSCodeBossCode();
    }
  }
}
// ==========================================================
// DUAL PDF PARSING & CONTINUOUS STREAM INITIALIZATION
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

  showLoading('Đang đồng bộ dữ liệu vào hệ thống...');
  state.pdfFileName = file.name;

  // Real novel filename is ONLY displayed inside the Duolingo landing portal
  const portalNameLabel = document.getElementById('portal-pdf-filename');
  if (portalNameLabel) portalNameLabel.textContent = file.name;

  // Workspace headers always display corporate camouflage filenames
  const gsLabel = document.getElementById('gs-file-name-label');
  if (gsLabel) gsLabel.textContent = 'KPI_Report_Q3_2026.pdf';

  const excelLabel = document.getElementById('excel-file-name-label');
  if (excelLabel) excelLabel.textContent = 'Financial_Ledger_Q3.pdf';

  const vscodeLabel = document.getElementById('vscode-file-name-label');
  if (vscodeLabel) vscodeLabel.textContent = 'dataset_telemetry.pdf';

  state.bossModeActive = false;
  switchSheet('view-sheet-story');

  // Strategy 1: High-Speed Python Server API
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
        state.firstStoryPage = data.firstStoryPage || 1;

        showBanner(`✅ Đã nạp thành công toàn bộ <b>${data.totalPages}</b> trang sách! Đang đọc liền mạch không ngắt quãng.`);
        initStoryFromPages(data.pages, data.totalPages, state.firstStoryPage);
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
    const pagesData = {};

    showBanner(`Đang trích xuất toàn bộ ${state.totalPages} trang để đọc liền mạch...`);

    for (let p = 1; p <= state.totalPages; p++) {
      if (p % 10 === 0 || p === state.totalPages) {
        showLoading(`Đang trích xuất nội dung: Trang ${p} / ${state.totalPages}...`);
      }
      const page = await state.pdfDoc.getPage(p);
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
      pagesData[String(p)] = chunks;
    }

    showBanner(`✅ Đã nạp thành công toàn bộ <b>${state.totalPages}</b> trang sách! Đang đọc liền mạch không ngắt quãng.`);
    initStoryFromPages(pagesData, state.totalPages, 1);
  } catch (err) {
    console.error('PDF parsing error:', err);
    alert('Không thể trích xuất file PDF: ' + err.message);
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

// Build unified continuous stream across all pages
function initStoryFromPages(pagesData, totalPages, firstStoryPage = 1) {
  state.allChunks = [];
  state.pageStartIndices = {};
  let globalIdx = 0;

  for (let p = 1; p <= totalPages; p++) {
    const rawChunks = pagesData[String(p)] || [];
    state.pageStartIndices[p] = globalIdx;

    if (rawChunks.length === 0) {
      state.allChunks.push({
        text: `[Trang ${p}: Hình ảnh hoặc trang scan không chứa ký tự văn bản]`,
        page: p,
        indexInPage: 0,
        globalIndex: globalIdx++
      });
    } else {
      for (let i = 0; i < rawChunks.length; i++) {
        state.allChunks.push({
          text: rawChunks[i],
          page: p,
          indexInPage: i,
          globalIndex: globalIdx++
        });
      }
    }
  }

  const startPage = (firstStoryPage > 1 && state.pageStartIndices[firstStoryPage] !== undefined) ? firstStoryPage : 1;
  const startIdx = state.pageStartIndices[startPage] || 0;
  state.currentPage = startPage;
  state.currentGlobalIndex = startIdx;

  applyTheme(state.theme);
  renderContinuousView(false, startIdx);
  saveState();
}

function initStoryFromChunks(chunks) {
  state.allChunks = [];
  state.pageStartIndices = { 1: 0 };
  state.totalPages = 1;
  state.currentPage = 1;
  state.currentGlobalIndex = 0;

  chunks.forEach((txt, idx) => {
    state.allChunks.push({
      text: txt,
      page: 1,
      indexInPage: idx,
      globalIndex: idx
    });
  });

  renderContinuousView(false, 0);
  saveState();
}

// ==========================================================
// CONTINUOUS VIEW RENDERING & PROGRESSIVE BATCHING
// ==========================================================
function renderContinuousView(preserveActiveRow = false, targetScrollIdx = null) {
  const targetIdx = (targetScrollIdx !== null) ? targetScrollIdx : (preserveActiveRow ? state.currentGlobalIndex : 0);

  state.renderedCount = 0;

  if (state.theme === 'theme-vscode') {
    const lineGutter = document.getElementById('vsc-line-numbers');
    const codeContainer = document.getElementById('vsc-code-lines');
    if (lineGutter) lineGutter.innerHTML = '';
    if (codeContainer) codeContainer.innerHTML = '';
  } else {
    const tbody = document.getElementById('story-tbody');
    if (tbody) tbody.innerHTML = '';
  }

  // Render initial batch: up to targetIdx + 60, minimum 120 items
  const initialBatchCount = Math.max(120, targetIdx + 60);
  renderNextBatch(initialBatchCount);

  // Focus and scroll to active row
  setActiveRow(targetIdx, true);
  updatePaginationUI();
}

function renderNextBatch(count = 100) {
  if (state.theme === 'theme-vscode') {
    appendVSCodeBatch(count);
  } else {
    appendSpreadsheetBatch(count);
  }
}

// 1. Spreadsheet Renderer (Continuous Infinite Table)
function appendSpreadsheetBatch(count) {
  const tbody = document.getElementById('story-tbody');
  if (!tbody || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();
  const baseTimestamp = new Date();
  baseTimestamp.setHours(9, 15, 0, 0);

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];

    // Page divider row when entering a new page
    if (chunk.indexInPage === 0 && chunk.page > 1) {
      const sepRow = document.createElement('tr');
      sepRow.className = 'section-break-row';
      sepRow.id = `page-anchor-${chunk.page}`;
      sepRow.dataset.page = chunk.page;
      sepRow.innerHTML = `
        <td class="row-header">P.${chunk.page}</td>
        <td colspan="7">
          <div class="section-break-content">
            <span class="section-break-badge">TRANG ${chunk.page} / ${state.totalPages}</span>
            <span>HỆ THỐNG KIỂM TOÁN TẬP TIN DỮ LIỆU — TIẾP TỤC TRANG ${chunk.page}</span>
            <span style="font-size: 10px; opacity: 0.65; margin-left: auto;">OFFSET #${chunk.globalIndex + 1}</span>
          </div>
        </td>
      `;
      fragment.appendChild(sepRow);
    }

    const row = document.createElement('tr');
    row.id = `story-row-${chunk.globalIndex}`;
    row.dataset.index = chunk.globalIndex;
    row.dataset.page = chunk.page;

    const auditId = (state.theme === 'theme-googlesheets' ? `TSK-${10000 + chunk.globalIndex * 2}` : `AUD-${10000 + chunk.globalIndex * 3}`);
    const mod = MODULES[chunk.globalIndex % MODULES.length];
    const rowTime = new Date(baseTimestamp.getTime() + chunk.globalIndex * 85000);
    const timeStr = rowTime.toISOString().replace('T', ' ').substring(0, 19);
    const st = STATUSES[chunk.globalIndex % STATUSES.length];
    const variance = (Math.sin(chunk.globalIndex) * 2.5).toFixed(1);
    const varianceText = (variance >= 0 ? '+' : '') + variance + '%';
    const auditor = AUDITORS[chunk.globalIndex % AUDITORS.length];

    let colDContent = chunk.text;
    if (state.readingMode === 'formula') {
      colDContent = `Routine transaction ledger integrity verification #${100 + chunk.globalIndex}. Status: NOMINAL.`;
    }

    row.innerHTML = `
      <td class="row-header">${chunk.globalIndex + 2}</td>
      <td style="font-family: monospace; font-size: 10px; color: #444;">${auditId}</td>
      <td style="font-weight: 500; font-size: 11px;">${mod}</td>
      <td style="color: #666; font-size: 10px;">${timeStr}</td>
      <td class="story-cell" id="story-cell-${chunk.globalIndex}" tabindex="0">${escapeHtml(colDContent)}</td>
      <td><span class="badge-status ${st.cls}">${st.text}</span></td>
      <td style="text-align: right; color: ${variance >= 0 ? '#0F9D58' : '#d93025'}">${varianceText}</td>
      <td style="color: #555;">${auditor}</td>
    `;

    const gIdx = chunk.globalIndex;
    row.addEventListener('click', () => {
      setActiveRow(gIdx, true);
    });

    fragment.appendChild(row);
  }

  tbody.appendChild(fragment);
  state.renderedCount = end;
  applyStyles();
}

// 2. Real VS Code IDE Code Renderer (Continuous Infinite Python Script)
let vscLineCounter = 1;

function appendVSCodeBatch(count) {
  const lineGutter = document.getElementById('vsc-line-numbers');
  const codeContainer = document.getElementById('vsc-code-lines');
  if (!lineGutter || !codeContainer || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const gutterFrag = document.createDocumentFragment();
  const codeFrag = document.createDocumentFragment();

  function addVSCLine(html, isStory = false, chunk = null) {
    const g = document.createElement('div');
    g.className = 'vsc-gutter-num';
    g.textContent = vscLineCounter++;
    gutterFrag.appendChild(g);

    const c = document.createElement('div');
    c.className = 'vsc-code-line';
    c.innerHTML = html;
    if (isStory && chunk) {
      c.id = `vsc-story-line-${chunk.globalIndex}`;
      c.dataset.index = chunk.globalIndex;
      c.dataset.page = chunk.page;
      const gIdx = chunk.globalIndex;
      c.addEventListener('click', () => {
        setActiveRow(gIdx, true);
      });
    }
    codeFrag.appendChild(c);
  }

  if (start === 0) {
    vscLineCounter = 1;
    addVSCLine('<span class="kw">import</span> <span class="var">os</span>');
    addVSCLine('<span class="kw">import</span> <span class="var">sys</span>');
    addVSCLine('<span class="kw">import</span> <span class="var">json</span>');
    addVSCLine('<span class="kw">from</span> <span class="var">datetime</span> <span class="kw">import</span> <span class="var">datetime</span>, <span class="var">timezone</span>');
    addVSCLine('');
    addVSCLine('<span class="cm"># ==============================================================================</span>');
    addVSCLine('<span class="cm"># NOVEL DATA STREAM PROCESSOR - CONTINUOUS PIPELINE</span>');
    addVSCLine('<span class="cm"># ==============================================================================</span>');
    addVSCLine('');
    addVSCLine('<span class="kw">class</span> <span class="cls">NovelDataPipeline</span>:');
    addVSCLine('&nbsp;&nbsp;&nbsp;&nbsp;<span class="str">"""Continuous stream pipeline for novel records reading and verification."""</span>');
    addVSCLine('&nbsp;&nbsp;&nbsp;&nbsp;<span class="kw">def</span> <span class="fn">__init__</span>(<span class="var">self</span>, <span class="var">total_pages</span>: <span class="cls">int</span> = ' + state.totalPages + '):');
    addVSCLine('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="var">self</span>.<span class="var">total_pages</span> = <span class="var">total_pages</span>');
    addVSCLine('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="var">self</span>.<span class="var">is_stream_open</span> = <span class="kw">True</span>');
    addVSCLine('');
    addVSCLine('&nbsp;&nbsp;&nbsp;&nbsp;<span class="kw">def</span> <span class="fn">stream_records</span>(<span class="var">self</span>):');
  }

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];

    if (chunk.indexInPage === 0 && chunk.page > 1) {
      addVSCLine('');
      addVSCLine(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm"># ----------------------------------------------------------------------</span>`);
      addVSCLine(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm"># PIPELINE STREAM SEGMENT: TRANG ${chunk.page} / ${state.totalPages} (OFFSET #${chunk.globalIndex + 1})</span>`);
      addVSCLine(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm"># ----------------------------------------------------------------------</span>`);
    }

    const varName = `record_${String(chunk.globalIndex + 1).padStart(4, '0')}`;
    addVSCLine(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cm"># [Trang ${chunk.page} - Dòng ${chunk.indexInPage + 1}]</span>`);
    addVSCLine(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="var">${varName}</span> = (`);
    
    const storyHtml = `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="str">"${escapeHtml(chunk.text)}"</span>`;
    addVSCLine(storyHtml, true, chunk);
    addVSCLine(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)`);
    addVSCLine('');
  }

  if (end === state.allChunks.length) {
    addVSCLine('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="kw-flow">return</span> {<span class="str">"status"</span>: <span class="str">"COMPLETED"</span>, <span class="str">"total_records"</span>: ' + state.allChunks.length + '}');
  }

  lineGutter.appendChild(gutterFrag);
  codeContainer.appendChild(codeFrag);
  state.renderedCount = end;
}

// 3. Render pure backend algorithm in VS Code for Boss Key
function renderVSCodeBossCode() {
  const lineGutter = document.getElementById('vsc-line-numbers');
  const codeContainer = document.getElementById('vsc-code-lines');
  if (!lineGutter || !codeContainer) return;

  lineGutter.innerHTML = '';
  codeContainer.innerHTML = '';

  VSCODE_BOSS_CODE.forEach((line, idx) => {
    const gutterEl = document.createElement('div');
    gutterEl.className = 'vsc-gutter-num';
    gutterEl.textContent = idx + 1;
    lineGutter.appendChild(gutterEl);

    const codeEl = document.createElement('div');
    codeEl.className = 'vsc-code-line';
    
    let html = escapeHtml(line)
      .replace(/\b(import|from|class|def|return|async|await|if|not|raise)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(self|status_code|detail)\b/g, '<span class="var">$1</span>')
      .replace(/(".*?")/g, '<span class="str">$1</span>')
      .replace(/(#.*)/g, '<span class="cm">$1</span>');

    codeEl.innerHTML = html || '&nbsp;';
    codeContainer.appendChild(codeEl);
  });
}

// ==========================================================
// SELECTION, FOCUS & NAVIGATION
// ==========================================================
function setActiveRow(index, scrollIntoView = true) {
  if (index < 0 || index >= state.allChunks.length) return;
  state.currentGlobalIndex = index;

  const chunk = state.allChunks[index];
  if (chunk && chunk.page && chunk.page !== state.currentPage) {
    state.currentPage = chunk.page;
    updatePaginationUI();
  }

  if (state.theme === 'theme-vscode') {
    document.querySelectorAll('.vsc-code-line').forEach(l => l.classList.remove('active-line'));
    const activeLine = document.getElementById(`vsc-story-line-${index}`);
    if (activeLine) {
      activeLine.classList.add('active-line');
      if (scrollIntoView) {
        activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const vscStatusLn = document.getElementById('vsc-status-ln');
    if (vscStatusLn) {
      vscStatusLn.textContent = `Ln ${18 + index * 4}, Col 28`;
    }
    const vscProgress = document.getElementById('vsc-status-progress');
    if (vscProgress) {
      const percent = Math.round(((index + 1) / Math.max(1, state.allChunks.length)) * 100);
      vscProgress.textContent = `Page ${state.currentPage}/${state.totalPages} (${percent}%)`;
    }
  } else {
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

    const storyText = chunk ? chunk.text : '';
    const formulaInput = document.getElementById('formula-input');
    if (formulaInput) {
      if (state.readingMode === 'formula') {
        formulaInput.value = `=PROSE("${storyText}")`;
      } else {
        formulaInput.value = storyText;
      }
    }

    const cellAddr = document.getElementById('active-cell-address');
    if (cellAddr) cellAddr.textContent = `D${index + 2}`;

    updateReadingProgressStatus(index);
  }

  saveState();
}

function updateReadingProgressStatus(index) {
  const percent = Math.round(((index + 1) / Math.max(1, state.allChunks.length)) * 100);
  const statusInfo = document.getElementById('status-reading-info');
  if (statusInfo) {
    statusInfo.textContent = `Trang: ${state.currentPage}/${state.totalPages} | Dòng: ${index + 1}/${state.allChunks.length} (${percent}%)`;
  }
}

function updatePaginationUI() {
  const text = `${state.currentPage} / ${state.totalPages}`;
  
  ['gs-page-indicator', 'excel-page-indicator', 'vsc-page-indicator'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });

  ['gs-input-jump', 'excel-input-jump'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = state.currentPage;
      el.max = state.totalPages;
    }
  });

  ['gs-btn-prev', 'excel-btn-prev', 'vsc-btn-prev'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = state.currentPage <= 1;
  });

  ['gs-btn-next', 'excel-btn-next', 'vsc-btn-next'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = state.currentPage >= state.totalPages;
  });
}

function goToPage(pageNum) {
  pageNum = parseInt(pageNum);
  if (isNaN(pageNum) || pageNum < 1 || pageNum > state.totalPages) return;

  const targetIdx = state.pageStartIndices[pageNum] ?? 0;

  // Make sure rows up to targetIdx are rendered
  if (targetIdx + 60 > state.renderedCount) {
    const needed = (targetIdx + 60) - state.renderedCount;
    renderNextBatch(Math.max(needed, state.BATCH_SIZE));
  }

  state.currentPage = pageNum;
  state.currentGlobalIndex = targetIdx;
  updatePaginationUI();
  setActiveRow(targetIdx, true);

  showPageFlipToast(`📖 Đang xem <b>Trang ${pageNum} / ${state.totalPages}</b>`);
}

function changePage(delta) {
  const target = state.currentPage + delta;
  if (target >= 1 && target <= state.totalPages) {
    goToPage(target);
  }
}

function navigateRow(delta) {
  const next = state.currentGlobalIndex + delta;
  if (next >= 0 && next < state.allChunks.length) {
    if (next >= state.renderedCount - 15) {
      renderNextBatch(state.BATCH_SIZE);
    }
    setActiveRow(next, true);
  }
}

// ==========================================================
// INFINITE CONTINUOUS SCROLL LISTENERS
// ==========================================================
let scrollThrottleTimer = false;

function initContinuousScrollListeners() {
  function handleContainerScroll(container) {
    if (state.bossModeActive) return;

    // 1. Infinite scroll: check if near bottom to load next batch
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 700) {
      if (state.renderedCount < state.allChunks.length) {
        renderNextBatch(state.BATCH_SIZE);
      }
    }

    // 2. Viewport detection: detect current page from top third of viewport
    if (scrollThrottleTimer) return;
    scrollThrottleTimer = true;
    requestAnimationFrame(() => {
      scrollThrottleTimer = false;
      const rect = container.getBoundingClientRect();
      const sampleX = rect.left + Math.min(220, rect.width / 2);
      const sampleY = rect.top + 70;

      const el = document.elementFromPoint(sampleX, sampleY);
      if (!el) return;

      const pageEl = el.closest('[data-page]');
      if (pageEl && pageEl.dataset.page) {
        const p = parseInt(pageEl.dataset.page);
        if (p && p !== state.currentPage && p >= 1 && p <= state.totalPages) {
          state.currentPage = p;
          updatePaginationUI();
        }
      }

      const itemEl = el.closest('[data-index]');
      if (itemEl && itemEl.dataset.index) {
        const idx = parseInt(itemEl.dataset.index);
        if (!isNaN(idx) && idx !== state.currentGlobalIndex) {
          state.currentGlobalIndex = idx;
          updateReadingProgressStatus(idx);
        }
      }
    });
  }

  const gridScroll = document.getElementById('grid-scroll-container');
  if (gridScroll) {
    gridScroll.addEventListener('scroll', () => handleContainerScroll(gridScroll));
  }

  const vscScroll = document.getElementById('vsc-code-scroll-container');
  if (vscScroll) {
    vscScroll.addEventListener('scroll', () => handleContainerScroll(vscScroll));
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

  ['gs-btn-autoscroll', 'excel-btn-autoscroll', 'vsc-btn-autoscroll'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.textContent = '⏸ Tạm dừng';
      btn.classList.add('playing');
    }
  });

  state.autoScrollInterval = setInterval(() => {
    navigateRow(1);
  }, state.autoScrollDelay);
}

function stopAutoScroll() {
  state.isAutoScrolling = false;

  ['gs-btn-autoscroll', 'excel-btn-autoscroll', 'vsc-btn-autoscroll'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.textContent = '▶ Tự cuộn';
      btn.classList.remove('playing');
    }
  });

  if (state.autoScrollInterval) {
    clearInterval(state.autoScrollInterval);
    state.autoScrollInterval = null;
  }
}

// ==========================================================
// UTILITIES
// ==========================================================
function showLoading(msg) {
  const text = document.getElementById('loading-status-text');
  const spinner = document.getElementById('loading-spinner');
  if (text) text.textContent = msg;
  if (spinner) spinner.style.display = 'flex';
}
function hideLoading() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'none';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimer = null;
function showPageFlipToast(msg) {
  const toast = document.getElementById('page-flip-toast');
  if (!toast) return;
  toast.innerHTML = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 1000);
}

