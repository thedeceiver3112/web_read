/**
 * Multi-Theme Stealth Reader - Core Logic
 * Supports: Google Sheets (Online), Microsoft Excel 365, and Real VS Code IDE
 * Fast PDF, TXT, and EPUB parsing with local-first processing,
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
  loadedPages: 0,
  isPdfProcessing: false,
  pdfLoadToken: 0,
  
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
  fontSize: 11,
  lineHeight: '1.75',
  fontFamily: 'Arial',
  isBold: false,
  isItalic: false,
  textDimLevel: 100,
  wrapText: true,
  
  // Stealth disguise titles (persisted in localStorage)
  gsheetTitle: localStorage.getItem('stealth_title_gsheet') || 'Báo cáo số liệu & Phân tích KPI Q3',
  excelTitle: localStorage.getItem('stealth_title_excel') || 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx',
  vscodeTitle: localStorage.getItem('stealth_title_vscode') || 'stream_pipeline_processor.py',
  photoshopTitle: localStorage.getItem('stealth_title_photoshop') || 'Brand_Campaign_KeyVisual_v2.psd',
  blenderTitle: localStorage.getItem('stealth_title_blender') || 'cyberpunk_city_scene_v4.blend',
  linkedinTitle: localStorage.getItem('stealth_title_linkedin') || 'Feed | LinkedIn',
  autocadTitle: localStorage.getItem('stealth_title_autocad') || 'LAYOUT_MASTER_PLAN_Q3.dwg',
  zaloTitle: localStorage.getItem('stealth_title_zalo') || 'Dự án Sprint Q3 - Tech Lead & Team Sync',
  figmaTitle: localStorage.getItem('stealth_title_figma') || 'Mobile_Banking_Design_System_v4.2',
  canvaTitle: localStorage.getItem('stealth_title_canva') || 'Báo Cáo Chiến Lược Thương Hiệu 2026',
  powerpointTitle: localStorage.getItem('stealth_title_powerpoint') || 'Q3_Business_Review_Strategic_Plan.pptx',
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

// Neutral project copy shown before a document is loaded.
const SAMPLE_STORY_CHUNKS = [
  "Q3 CAMPAIGN WORKSPACE - INTERNAL REVIEW COPY",
  "Project scope includes editorial layout, visual direction, data validation and final delivery coordination.",
  "Current status: working files have been consolidated and the primary review round is in progress.",
  "Design team: verify spacing, hierarchy, color consistency and output dimensions across all approved formats.",
  "Content team: complete the final language pass and flag any copy that still requires stakeholder approval.",
  "Development team: confirm asset paths, browser compatibility and production build checks before handoff.",
  "Open items are tracked by section so reviewers can continue from the most recently approved checkpoint.",
  "Use the project navigation controls to move between sections and compare the latest revisions.",
  "All external exports must use the approved naming convention and remain inside the delivery package.",
  "Next review: finalize outstanding notes, prepare the release candidate and archive superseded versions."
];

// Favicons for themes

// Multi-File Workspace Mapping & Navigation
const THEME_PAGES = {
  'theme-googlesheets': 'index.html',
  'theme-googledocs': 'docs.html',
  'theme-excel': 'excel.html',
  'theme-vscode': 'vscode.html',
  'theme-photoshop': 'photoshop.html',
  'theme-blender': 'blender.html',
  'theme-linkedin': 'linkedin.html',
  'theme-autocad': 'autocad.html',
  'theme-zalo': 'zalo.html',
  'theme-figma': 'figma.html',
  'theme-canva': 'canva.html',
  'theme-powerpoint': 'powerpoint.html'
};

const DOCUMENT_CACHE_DB_NAME = 'stealth_reader_cache';
const DOCUMENT_CACHE_STORE_NAME = 'documents';
const ACTIVE_DOCUMENT_CACHE_KEY = 'active-document';
const ACTIVE_DOCUMENT_SESSION_KEY = 'stealth_active_document_v2';
let documentCacheWritePromise = Promise.resolve();

function getThemeForCurrentPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('docs.html') || path.endsWith('googledocs.html')) return 'theme-googledocs';
  if (path.endsWith('excel.html')) return 'theme-excel';
  if (path.endsWith('vscode.html')) return 'theme-vscode';
  if (path.endsWith('photoshop.html')) return 'theme-photoshop';
  if (path.endsWith('blender.html')) return 'theme-blender';
  if (path.endsWith('linkedin.html')) return 'theme-linkedin';
  if (path.endsWith('autocad.html')) return 'theme-autocad';
  if (path.endsWith('zalo.html')) return 'theme-zalo';
  if (path.endsWith('figma.html')) return 'theme-figma';
  if (path.endsWith('canva.html')) return 'theme-canva';
  if (path.endsWith('powerpoint.html') || path.endsWith('ppt.html')) return 'theme-powerpoint';
  return 'theme-googlesheets';
}

function getFileForTheme(themeName) {
  return THEME_PAGES[themeName] || 'index.html';
}

async function navigateToThemePage(targetTheme) {
  state.theme = targetTheme;
  saveState();
  const currentTheme = getThemeForCurrentPage();
  const targetPage = getFileForTheme(targetTheme);
  if (currentTheme !== targetTheme) {
    await documentCacheWritePromise.catch(error => {
      console.warn('Document cache was not ready before theme navigation:', error);
    });
    window.location.href = targetPage;
  } else {
    applyTheme(targetTheme);
  }
}

function openDocumentCacheDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Trình duyệt không hỗ trợ IndexedDB.'));
      return;
    }

    const request = window.indexedDB.open(DOCUMENT_CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DOCUMENT_CACHE_STORE_NAME)) {
        database.createObjectStore(DOCUMENT_CACHE_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được bộ nhớ tài liệu.'));
  });
}

async function writeDocumentCache(payload) {
  const database = await openDocumentCacheDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readwrite');
      transaction.objectStore(DOCUMENT_CACHE_STORE_NAME).put(payload);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Không lưu được tài liệu.'));
      transaction.onabort = () => reject(transaction.error || new Error('Lưu tài liệu đã bị hủy.'));
    });
  } finally {
    database.close();
  }
}

async function readDocumentCache() {
  const database = await openDocumentCacheDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(DOCUMENT_CACHE_STORE_NAME).get(ACTIVE_DOCUMENT_CACHE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Không đọc được tài liệu đã lưu.'));
    });
  } finally {
    database.close();
  }
}

function applyCachedDocument(cache) {
  if (!cache || !Array.isArray(cache.chunks) || cache.chunks.length === 0) return false;

  state.allChunks = cache.chunks.map(chunk => ({
    ...chunk,
    text: cleanAndRepairVietnameseText(chunk.text || '')
  }));
  state.pageStartIndices = cache.pageStartIndices || {};
  state.totalPages = Math.max(1, Number(cache.totalPages) || 1);
  state.loadedPages = state.totalPages;
  state.isPdfProcessing = false;
  state.pdfFileName = cache.documentName || state.pdfFileName || '';
  state.currentGlobalIndex = Math.min(
    Math.max(0, state.currentGlobalIndex),
    state.allChunks.length - 1
  );
  state.currentPage = state.allChunks[state.currentGlobalIndex]?.page || 1;

  const portalNameLabel = document.getElementById('portal-pdf-filename');
  if (portalNameLabel && state.pdfFileName) portalNameLabel.textContent = state.pdfFileName;
  if (typeof updatePortalUploadUI === 'function') updatePortalUploadUI();
  return true;
}

function persistDocumentCache() {
  if (!state.allChunks || state.allChunks.length === 0 || !state.pdfFileName) {
    return Promise.resolve();
  }

  const payload = {
    id: ACTIVE_DOCUMENT_CACHE_KEY,
    documentName: state.pdfFileName,
    chunks: state.allChunks,
    pageStartIndices: state.pageStartIndices,
    totalPages: state.totalPages,
    savedAt: Date.now()
  };

  try {
    sessionStorage.setItem(ACTIVE_DOCUMENT_SESSION_KEY, JSON.stringify(payload));
    documentCacheWritePromise = Promise.resolve();
    return documentCacheWritePromise;
  } catch (error) {
    sessionStorage.removeItem(ACTIVE_DOCUMENT_SESSION_KEY);
    console.info('Tài liệu vượt giới hạn sessionStorage, chuyển sang IndexedDB.', error);
  }

  documentCacheWritePromise = documentCacheWritePromise
    .catch(() => {})
    .then(() => writeDocumentCache(payload))
    .catch(error => {
      console.warn('Không thể lưu tài liệu để đổi giao diện nhanh:', error);
      throw error;
    });
  return documentCacheWritePromise;
}

function restoreChunksFromLegacySession() {
  try {
    const raw = sessionStorage.getItem('stealth_cached_chunks');
    if (raw) {
      return applyCachedDocument({
        chunks: JSON.parse(raw),
        pageStartIndices: JSON.parse(sessionStorage.getItem('stealth_cached_page_indices') || '{}'),
        totalPages: parseInt(sessionStorage.getItem('stealth_cached_total_pages') || '1', 10),
        documentName: sessionStorage.getItem('stealth_cached_doc_name') || ''
      });
    }
  } catch (e) {
    console.warn('Không thể đọc cache sessionStorage cũ:', e);
  }
  return false;
}

async function restoreDocumentCache() {
  try {
    const sessionCache = JSON.parse(sessionStorage.getItem(ACTIVE_DOCUMENT_SESSION_KEY) || 'null');
    if (applyCachedDocument(sessionCache)) return true;
  } catch (error) {
    sessionStorage.removeItem(ACTIVE_DOCUMENT_SESSION_KEY);
    console.warn('Không thể khôi phục tài liệu từ sessionStorage:', error);
  }

  try {
    const cache = await readDocumentCache();
    if (applyCachedDocument(cache)) return true;
  } catch (error) {
    console.warn('Không thể khôi phục tài liệu từ IndexedDB:', error);
  }

  const restoredLegacyCache = restoreChunksFromLegacySession();
  if (restoredLegacyCache) persistDocumentCache().catch(() => {});
  return restoredLegacyCache;
}

const FAVICONS = {
  'theme-googlesheets': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 32'><path fill='%230F9D58' d='M15 0H2C.9 0 0 .9 0 2v28c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V9l-9-9z'/><path fill='%2387CEAB' d='M15 0v9h9L15 0z'/><path fill='%23ffffff' d='M4 14h16v2H4zm0 4h16v2H4zm0 4h16v2H4zm6-10v14h2V12h-2z'/></svg>",
  'theme-googledocs': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 32'><path fill='%234285F4' d='M15 0H2C.9 0 0 .9 0 2v28c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V9l-9-9z'/><path fill='%23A1C2FA' d='M15 0v9h9L15 0z'/><path fill='%23ffffff' d='M5 13h14v2H5zm0 4h14v2H5zm0 4h10v2H5z'/></svg>",
  'theme-excel': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='%23107c41'/><text x='16' y='23' font-size='20' font-family='Segoe UI,sans-serif' font-weight='bold' fill='white' text-anchor='middle'>X</text></svg>",
  'theme-vscode': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='%23007ACC' d='M72 98L97 86V14L72 2 28 42 11 29 2 34l22 20L2 74l9 5 17-13 44 32z'/><path fill='%231F9CF0' d='M72 2v96l25-12V14L72 2zm0 28L46 54l26 24V30z'/></svg>",
  'theme-photoshop': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23001e36'/><text x='16' y='23' font-size='18' font-family='Segoe UI,sans-serif' font-weight='bold' fill='%2331a8ff' text-anchor='middle'>Ps</text></svg>",
  'theme-blender': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23222222'/><circle cx='16' cy='18' r='7' fill='%23ea7600'/><circle cx='16' cy='18' r='3.5' fill='%23265787'/><path d='M16 5 L16 11 M10 8 L14 13 M22 8 L18 13' stroke='%23ea7600' stroke-width='2.5' stroke-linecap='round'/></svg>",
  'theme-linkedin': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230a66c2'/><text x='16' y='24' font-size='20' font-family='Segoe UI,sans-serif' font-weight='bold' fill='white' text-anchor='middle'>in</text></svg>",
  'theme-autocad': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23c41527'/><text x='16' y='24' font-size='22' font-family='Arial,sans-serif' font-weight='bold' fill='white' text-anchor='middle'>A</text></svg>",
  'theme-zalo': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230068ff'/><text x='16' y='22' font-size='14' font-family='Segoe UI,sans-serif' font-weight='bold' fill='white' text-anchor='middle'>Zalo</text></svg>",
  'theme-figma': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 38 57'><path d='M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z' fill='%231ABCFE'/><path d='M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z' fill='%230ACF83'/><path d='M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z' fill='%23FF7262'/><path d='M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z' fill='%23F24E1E'/><path d='M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z' fill='%23A259FF'/></svg>",
  'theme-canva': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='cg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%2300c4cc'/><stop offset='100%25' stop-color='%237d2ae8'/></linearGradient></defs><rect width='32' height='32' rx='6' fill='url(%23cg)'/><text x='16' y='23' font-size='20' font-family='Brush Script MT, cursive, Segoe UI' font-style='italic' font-weight='bold' fill='white' text-anchor='middle'>C</text></svg>",
  'theme-powerpoint': "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='%23d24726'/><text x='16' y='23' font-size='20' font-family='Segoe UI,sans-serif' font-weight='bold' fill='white' text-anchor='middle'>P</text></svg>",
};

// ==========================================================
// INITIALIZATION
// ==========================================================

// ==========================================================
// GOOGLE FORM FEEDBACK CONFIGURATION & HANDLER
// ==========================================================
// Dán link Google Form (forms.gle/... hoặc docs.google.com/forms/...) vào đây:
const CONFIG_FEEDBACK_FORM_URL = 'https://forms.gle/YxPd6zRZEeyQ3z3e8';

function getFeedbackFormUrl() {
  const saved = localStorage.getItem('stealth_feedback_form_url');
  if (saved && saved !== 'https://forms.google.com' && saved !== 'https://forms.gle/Kx3s3xHFVBwLsZE79') {
    return saved;
  }
  return CONFIG_FEEDBACK_FORM_URL;
}

function openFeedbackForm() {
  const url = getFeedbackFormUrl();
  window.open(url, '_blank', 'noopener,noreferrer');
}

function configFeedbackFormUrl() {
  const current = getFeedbackFormUrl();
  const input = prompt('Nhập đường link Google Form để nhận ý kiến người dùng:\n(Ví dụ: https://forms.gle/XYZ... hoặc link biểu mẫu)', current);
  if (input !== null && input.trim()) {
    const cleanUrl = input.trim();
    localStorage.setItem('stealth_feedback_form_url', cleanUrl);
    showPageFlipToast(`Đã lưu link Google Form: <b>${escapeHtml(cleanUrl)}</b>`);
  }
}

function initFeedbackListeners() {
  document.querySelectorAll(
    '#btn-open-feedback-nav, #btn-open-feedback-portal, #btn-open-feedback-updates, #btn-open-feedback-settings, .duo-btn-feedback-nav, .portal-link-feedback, .duo-btn-feedback'
  ).forEach(btn => {
    btn.addEventListener('click', openFeedbackForm);
  });

  const configBtn = document.getElementById('btn-config-feedback-url');
  if (configBtn) configBtn.addEventListener('click', configFeedbackFormUrl);
}

document.addEventListener('DOMContentLoaded', async () => {
  loadSavedState();
  initThemeSystem();
  initTitleEditing();
  initStealthEditableElements();
  initEventListeners();
  initSheetTabs();
  initContinuousScrollListeners();
  initLandingPortal();
  initControlsVisibilityToggle();
  initVersionReloadButton();
  initFeedbackListeners();
  
  state.bossModeActive = false;
  switchSheet('view-sheet-story');

  if (state.allChunks.length === 0) {
    const restored = await restoreDocumentCache();
    if (!restored) {
      initStoryFromChunks(SAMPLE_STORY_CHUNKS);
    } else {
      renderContinuousView(true);
    }
  } else {
    renderContinuousView(true);
  }

});

function loadSavedState() {
  try {
    // Every workspace now has its own HTML entry point. The page filename is
    // authoritative; a previously saved theme must not hide the current page.
    state.theme = getThemeForCurrentPage();

    state.gsheetTitle = localStorage.getItem('stealth_title_gsheet') || 'Báo cáo số liệu & Phân tích KPI Q3';
    state.gdocsTitle = localStorage.getItem('stealth_title_gdocs') || 'Báo cáo Tổng kết Hoạt động & Kế hoạch Phát triển Q3';
    state.excelTitle = localStorage.getItem('stealth_title_excel') || 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx';
    state.vscodeTitle = localStorage.getItem('stealth_title_vscode') || 'stream_pipeline_processor.py';
    state.photoshopTitle = localStorage.getItem('stealth_title_photoshop') || 'Brand_Campaign_KeyVisual_v2.psd';
    state.blenderTitle = localStorage.getItem('stealth_title_blender') || 'cyberpunk_city_scene_v4.blend';
    state.linkedinTitle = localStorage.getItem('stealth_title_linkedin') || 'Feed | LinkedIn';
    state.autocadTitle = localStorage.getItem('stealth_title_autocad') || 'LAYOUT_MASTER_PLAN_Q3.dwg';


    const saved = localStorage.getItem('excel_reader_state');
    if (saved) {
      const data = JSON.parse(saved);
      state.fontSize = data.fontSize || (state.theme === 'theme-googlesheets' ? 10 : 11);
      state.lineHeight = data.lineHeight || '1.75';
      state.fontFamily = data.fontFamily || (state.theme === 'theme-googlesheets' ? 'Arial' : 'Calibri');
      state.readingMode = (state.theme === 'theme-googlesheets') ? 'grid' : (data.readingMode || 'grid');
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
      lineHeight: state.lineHeight,
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

  const openButtons = [
    'btn-open-theme-modal',
    'btn-open-theme-modal-excel',
    'btn-open-theme-modal-vscode',
    'btn-open-theme-modal-photoshop',
    'btn-open-theme-modal-blender',
    'btn-open-theme-modal-linkedin',
    'btn-open-theme-modal-autocad',
    'btn-open-theme-modal-zalo',
    'btn-open-theme-modal-figma',
    'btn-open-theme-modal-canva',
    'btn-open-theme-modal-powerpoint',
  ];
  openButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', openThemeModal);
  });

  const closeBtn = document.getElementById('btn-close-theme-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeThemeModal);

  const confirmBtn = document.getElementById('btn-confirm-theme');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      closeThemeModal();
      navigateToThemePage(state.theme);
    });
  }

  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const chosenTheme = card.getAttribute('data-theme');
      state.theme = chosenTheme;
    });

    card.addEventListener('dblclick', () => {
      const chosenTheme = card.getAttribute('data-theme');
      navigateToThemePage(chosenTheme);
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
    state.readingMode = 'grid';
    const docTitle = state.gsheetTitle || 'Báo cáo số liệu & Phân tích KPI Q3';
    document.title = `${docTitle} - Google Trang tính`;
    const gTitle = document.getElementById('gsheet-doc-title');
    if (gTitle) gTitle.textContent = docTitle;
    if (storyLabel) storyLabel.textContent = localStorage.getItem('stealth_sheet_gsheet_0') || 'Trang tính1';
    if (headerTitle) headerTitle.textContent = localStorage.getItem('stealth_header_title_gsheet') || 'Log Description & Execution Details';
  } else if (themeName === 'theme-googledocs') {
    const docTitle = state.gdocsTitle || 'Báo cáo Tổng kết Hoạt động & Kế hoạch Phát triển Q3';
    document.title = `${docTitle} - Google Tài liệu`;
    const gdTitle = document.getElementById('gdocs-doc-title');
    if (gdTitle) gdTitle.textContent = docTitle;
  } else if (themeName === 'theme-excel') {
    const docTitle = state.excelTitle || 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx';
    document.title = `${docTitle} - Excel`;
    const eTitle = document.getElementById('excel-doc-title');
    if (eTitle) eTitle.textContent = docTitle;
    if (storyLabel) storyLabel.textContent = localStorage.getItem('stealth_sheet_excel_0') || 'Audit_Finding_Q3';
    if (headerTitle) headerTitle.textContent = localStorage.getItem('stealth_header_title_excel') || 'Audit Log Finding & Notes (Story Text)';
  } else if (themeName === 'theme-vscode') {
    const docTitle = state.vscodeTitle || 'stream_pipeline_processor.py';
    document.title = `${docTitle} - dev_workspace - Visual Studio Code`;
    const vTitle = document.getElementById('vsc-title-doc');
    if (vTitle) vTitle.textContent = `${docTitle} - dev_workspace - Visual Studio Code`;
    const tabName = document.getElementById('vsc-tab-filename');
    if (tabName) tabName.textContent = docTitle;
  } else if (themeName === 'theme-photoshop') {
    const docTitle = state.photoshopTitle || 'Brand_Campaign_KeyVisual_v2.psd';
    document.title = `${docTitle} @ 66.7% (RGB/8#*) - Adobe Photoshop 2026`;
    const psTitle = document.getElementById('ps-doc-title');
    if (psTitle) psTitle.textContent = docTitle;
  } else if (themeName === 'theme-blender') {
    const docTitle = state.blenderTitle || 'cyberpunk_city_scene_v4.blend';
    document.title = `${docTitle} - Blender 4.2.0`;
    const bTitle = document.getElementById('blender-doc-title');
    if (bTitle) bTitle.textContent = docTitle;
  } else if (themeName === 'theme-linkedin') {
    document.title = 'Feed | LinkedIn';
  } else if (themeName === 'theme-autocad') {
    const docTitle = state.autocadTitle || 'LAYOUT_MASTER_PLAN_Q3.dwg';
    document.title = `${docTitle} - Autodesk AutoCAD 2026`;
    const cadTitle = document.getElementById('autocad-doc-title');
    if (cadTitle) cadTitle.textContent = docTitle;
  } else if (themeName === 'theme-zalo') {
    const docTitle = state.zaloTitle || 'Dự án Sprint Q3 - Tech Lead & Team Sync';
    document.title = `${docTitle} - Zalo`;
    const zTitle = document.getElementById('zalo-doc-title');
    if (zTitle) zTitle.textContent = docTitle;
  } else if (themeName === 'theme-figma') {
    const docTitle = state.figmaTitle || 'Mobile_Banking_Design_System_v4.2';
    document.title = `${docTitle} – Figma`;
    const fTitle = document.getElementById('figma-doc-title');
    if (fTitle) fTitle.textContent = docTitle;
  } else if (themeName === 'theme-canva') {
    const docTitle = state.canvaTitle || 'Báo Cáo Chiến Lược Thương Hiệu 2026';
    document.title = `${docTitle} - Canva`;
    const cTitle = document.getElementById('canva-doc-title');
    if (cTitle) cTitle.textContent = docTitle;
  } else if (themeName === 'theme-powerpoint') {
    const docTitle = state.powerpointTitle || 'Q3_Business_Review_Strategic_Plan.pptx';
    document.title = `${docTitle} - PowerPoint`;
    const pTitle = document.getElementById('ppt-doc-title');
    if (pTitle) pTitle.textContent = docTitle;
  }

  applyStyles();
  renderContinuousView(true);
  updatePortalThemeUI(themeName);
  initStealthEditableElements();
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

  const gdTitle = document.getElementById('gdocs-doc-title');
  if (gdTitle) {
    gdTitle.addEventListener('blur', () => {
      let val = gdTitle.textContent.trim();
      if (!val) val = 'Báo cáo Tổng kết Hoạt động & Kế hoạch Phát triển Q3';
      gdTitle.textContent = val;
      state.gdocsTitle = val;
      localStorage.setItem('stealth_title_gdocs', val);
      if (state.theme === 'theme-googledocs') {
        document.title = `${val} - Google Tài liệu`;
      }
      showPageFlipToast(`✅ Đã đổi tên tài liệu: <b>${escapeHtml(val)}</b>`);
    });
    gdTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        gdTitle.blur();
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

  const psTitle = document.getElementById('ps-doc-title');
  if (psTitle) {
    psTitle.addEventListener('blur', () => {
      let val = psTitle.textContent.trim();
      if (!val) val = 'Brand_Campaign_KeyVisual_v2.psd';
      if (!val.toLowerCase().endsWith('.psd')) val += '.psd';
      psTitle.textContent = val;
      state.photoshopTitle = val;
      localStorage.setItem('stealth_title_photoshop', val);
      if (state.theme === 'theme-photoshop') {
        document.title = `${val} @ 66.7% (RGB/8#*) - Adobe Photoshop 2026`;
      }
      showPageFlipToast(`✅ Đã đổi tên project Photoshop: <b>${escapeHtml(val)}</b>`);
    });
    psTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        psTitle.blur();
      }
    });
  }

  const bTitle = document.getElementById('blender-doc-title');
  if (bTitle) {
    bTitle.addEventListener('blur', () => {
      let val = bTitle.textContent.trim();
      if (!val) val = 'cyberpunk_city_scene_v4.blend';
      if (!val.toLowerCase().endsWith('.blend')) val += '.blend';
      bTitle.textContent = val;
      state.blenderTitle = val;
      localStorage.setItem('stealth_title_blender', val);
      if (state.theme === 'theme-blender') {
        document.title = `${val} - Blender 4.2.0`;
      }
      showPageFlipToast(`✅ Đã đổi tên file Blender: <b>${escapeHtml(val)}</b>`);
    });
    bTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        bTitle.blur();
      }
    });
  }

  const cadTitle = document.getElementById('autocad-doc-title');
  if (cadTitle) {
    cadTitle.addEventListener('blur', () => {
      let val = cadTitle.textContent.trim();
      if (!val) val = 'LAYOUT_MASTER_PLAN_Q3.dwg';
      if (!val.toLowerCase().endsWith('.dwg')) val += '.dwg';
      cadTitle.textContent = val;
      state.autocadTitle = val;
      localStorage.setItem('stealth_title_autocad', val);
      if (state.theme === 'theme-autocad') {
        document.title = `${val} - Autodesk AutoCAD 2026`;
      }
      showPageFlipToast(`✅ Đã đổi tên bản vẽ AutoCAD: <b>${escapeHtml(val)}</b>`);
    });
    cadTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cadTitle.blur();
      }
    });
  }

  const zTitle = document.getElementById('zalo-doc-title');
  if (zTitle) {
    zTitle.addEventListener('blur', () => {
      let val = zTitle.textContent.trim();
      if (!val) val = 'Dự án Sprint Q3 - Tech Lead & Team Sync';
      zTitle.textContent = val;
      state.zaloTitle = val;
      localStorage.setItem('stealth_title_zalo', val);
      if (state.theme === 'theme-zalo') {
        document.title = `${val} - Zalo`;
      }
      showPageFlipToast(`✅ Đã đổi tên nhóm Zalo: <b>${escapeHtml(val)}</b>`);
    });
    zTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        zTitle.blur();
      }
    });
  }

  const fTitle = document.getElementById('figma-doc-title');
  if (fTitle) {
    fTitle.addEventListener('blur', () => {
      let val = fTitle.textContent.trim();
      if (!val) val = 'Mobile_Banking_Design_System_v4.2';
      fTitle.textContent = val;
      state.figmaTitle = val;
      localStorage.setItem('stealth_title_figma', val);
      if (state.theme === 'theme-figma') {
        document.title = `${val} – Figma`;
      }
      showPageFlipToast(`✅ Đã đổi tên file Figma: <b>${escapeHtml(val)}</b>`);
    });
    fTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fTitle.blur();
      }
    });
  }

  const cTitle = document.getElementById('canva-doc-title');
  if (cTitle) {
    cTitle.addEventListener('blur', () => {
      let val = cTitle.textContent.trim();
      if (!val) val = 'Báo Cáo Chiến Lược Thương Hiệu 2026';
      cTitle.textContent = val;
      state.canvaTitle = val;
      localStorage.setItem('stealth_title_canva', val);
      if (state.theme === 'theme-canva') {
        document.title = `${val} - Canva`;
      }
      showPageFlipToast(`✅ Đã đổi tên thiết kế Canva: <b>${escapeHtml(val)}</b>`);
    });
    cTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cTitle.blur();
      }
    });
  }

  const pTitle = document.getElementById('ppt-doc-title');
  if (pTitle) {
    pTitle.addEventListener('blur', () => {
      let val = pTitle.textContent.trim();
      if (!val) val = 'Q3_Business_Review_Strategic_Plan.pptx';
      if (!val.toLowerCase().endsWith('.pptx') && !val.toLowerCase().endsWith('.ppt')) val += '.pptx';
      pTitle.textContent = val;
      state.powerpointTitle = val;
      localStorage.setItem('stealth_title_powerpoint', val);
      if (state.theme === 'theme-powerpoint') {
        document.title = `${val} - PowerPoint`;
      }
      showPageFlipToast(`✅ Đã đổi tên slide PowerPoint: <b>${escapeHtml(val)}</b>`);
    });
    pTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        pTitle.blur();
      }
    });
  }
}

// ==========================================================
// UNIVERSAL STEALTH TEXT CUSTOMIZATION (ALL 12 THEMES)
// ==========================================================
function initStealthEditableElements() {
  document.querySelectorAll('[data-stealth-key]').forEach(el => {
    const key = el.getAttribute('data-stealth-key');
    if (!key) return;

    // Restore saved value from localStorage if available
    const saved = localStorage.getItem(key);
    if (saved && saved.trim()) {
      el.textContent = saved;
    }

    if (el._stealthInitDone) return;
    el._stealthInitDone = true;

    // Double-click selects all text for quick inline editing
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // Save on blur
    el.addEventListener('blur', () => {
      const val = el.textContent.trim();
      if (val) {
        localStorage.setItem(key, val);
        showPageFlipToast(`✅ Đã lưu: <b>${escapeHtml(val.length > 32 ? val.substring(0, 30) + '...' : val)}</b>`);
      }
    });

    // Complete editing on Enter key
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });
  });
}

function hasLoadedDocument() {
  return Boolean(
    state.pdfFileName &&
    typeof state.pdfFileName === 'string' &&
    state.pdfFileName.trim() !== '' &&
    state.allChunks &&
    Array.isArray(state.allChunks) &&
    state.allChunks.length > 0
  );
}

function shakePortalUpload() {
  const uploadCard = document.getElementById('portal-upload-card') || document.querySelector('.duo-upload-quest');
  if (!uploadCard) return;
  uploadCard.classList.remove('shake');
  void uploadCard.offsetWidth; // trigger reflow
  uploadCard.classList.add('shake');
  setTimeout(() => {
    uploadCard.classList.remove('shake');
  }, 500);
}

function updatePortalUploadUI() {
  const uploadCard = document.getElementById('portal-upload-card') || document.querySelector('.duo-upload-quest');
  const badgeText = document.getElementById('portal-upload-badge-text');
  const nameLabel = document.getElementById('portal-pdf-filename');
  const statusPill = document.getElementById('portal-upload-status-pill');
  const hintLabel = document.getElementById('portal-upload-hint');
  const btnText = document.getElementById('portal-upload-btn-text');
  const enterBtn = document.getElementById('btn-portal-enter');

  const hasDoc = hasLoadedDocument();

  if (uploadCard) {
    uploadCard.classList.toggle('has-doc', hasDoc);
    uploadCard.classList.toggle('no-doc', !hasDoc);
  }

  if (hasDoc) {
    if (badgeText) badgeText.textContent = 'ĐÃ NẠP TRUYỆN THÀNH CÔNG';
    if (nameLabel) {
      nameLabel.textContent = state.pdfFileName || 'Tài liệu đã nạp';
      nameLabel.title = state.pdfFileName || '';
    }
    if (statusPill) {
      statusPill.textContent = 'Sẵn sàng đọc';
    }
    if (hintLabel) {
      const pageInfo = state.totalPages > 1 ? ` (${state.totalPages} trang)` : '';
      hintLabel.textContent = `Đã lưu trên máy${pageInfo} • Nhấn "Bắt đầu đọc" để vào giao diện`;
    }
    if (btnText) {
      btnText.textContent = 'Đổi truyện khác';
    }
    if (enterBtn) {
      enterBtn.classList.remove('disabled-need-file');
      enterBtn.classList.add('ready');
      enterBtn.innerHTML = `Bắt Đầu Đọc Ngay`;
      enterBtn.title = `Bắt đầu đọc: ${state.pdfFileName}`;
    }
  } else {
    if (badgeText) badgeText.textContent = '⚠️ BƯỚC 1: NẠP FILE TRUYỆN ĐỂ BẮT ĐẦU';
    if (nameLabel) {
      nameLabel.textContent = 'Chưa chọn file truyện';
      nameLabel.title = '';
    }
    if (statusPill) {
      statusPill.textContent = '⚠️ Cần nạp file';
    }
    if (hintLabel) {
      hintLabel.textContent = 'Hỗ trợ .PDF, .TXT, .EPUB • Đọc hoàn toàn offline trên máy tính';
    }
    if (btnText) {
      btnText.textContent = 'Tải truyện lên';
    }
    if (enterBtn) {
      enterBtn.classList.add('disabled-need-file');
      enterBtn.classList.remove('ready');
      enterBtn.innerHTML = `⚠️ Cần nạp file truyện để bắt đầu đọc`;
      enterBtn.title = 'Vui lòng nạp file truyện (PDF, TXT, EPUB) trước khi bắt đầu đọc';
    }
  }
}

// ==========================================================
// LANDING PORTAL, THEME SELECTOR & AUTHOR DONATE
// ==========================================================
function initLandingPortal() {
  const portal = document.getElementById('landing-portal');
  if (!portal) return;

  const currentTheme = getThemeForCurrentPage();
  const isDedicatedPage = currentTheme !== 'theme-googlesheets';
  const skipPortal = localStorage.getItem('skip_portal') === 'true' || isDedicatedPage;
  const closeBtn = document.getElementById('btn-portal-close');
  const rememberChk = document.getElementById('chk-remember-direct-mode');

  const closePortal = () => {
    portal.classList.add('hidden');
    portal.setAttribute('aria-hidden', 'true');
  };

  const openPortal = (showCloseButton) => {
    portal.classList.remove('hidden');
    portal.setAttribute('aria-hidden', 'false');
    if (closeBtn) closeBtn.style.display = showCloseButton ? 'flex' : 'none';
    updatePortalUploadUI();
  };

  if (rememberChk) rememberChk.checked = localStorage.getItem('skip_portal') === 'true';

  // Initial visibility check
  if (skipPortal) {
    closePortal();
    if (closeBtn) closeBtn.style.display = 'flex';
  } else {
    openPortal(false);
  }

  // Sync theme UI
  updatePortalThemeUI(state.theme);
  updatePortalUploadUI();

  // Clicking mission items on the portal
  document.querySelectorAll('.duo-mission-item, .portal-theme-item').forEach(item => {
    item.addEventListener('click', () => {
      const chosenTheme = item.getAttribute('data-theme');
      state.theme = chosenTheme;
      updatePortalThemeUI(chosenTheme);
      saveState();
    });
    item.addEventListener('dblclick', () => {
      const chosenTheme = item.getAttribute('data-theme');
      navigateToThemePage(chosenTheme);
    });
  });

  // Enter button (Start reading - only allows when a story document is loaded)
  const enterBtn = document.getElementById('btn-portal-enter');
  const portalFileInput = document.getElementById('portal-file-input');

  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      if (!hasLoadedDocument()) {
        shakePortalUpload();
        showPageFlipToast('⚠️ Vui lòng nạp file truyện (PDF, TXT, EPUB) trước khi bắt đầu đọc!');
        const uploadAlert = document.getElementById('portal-upload-alert');
        if (uploadAlert) {
          uploadAlert.style.display = 'flex';
          setTimeout(() => {
            if (uploadAlert) uploadAlert.style.display = 'none';
          }, 4000);
        }
        if (portalFileInput) {
          portalFileInput.click();
        }
        return;
      }

      if (rememberChk && rememberChk.checked) {
        localStorage.setItem('skip_portal', 'true');
      } else {
        localStorage.removeItem('skip_portal');
      }
      // The selected workspace may already be the current page. In that case
      // navigation only reapplies the theme, so the portal must close here.
      closePortal();
      navigateToThemePage(state.theme);
    });
  }

  // Close button (Resume reading session)
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closePortal();
    });
  }

  // Open Portal Buttons from theme headers and theme modal
  [
    'btn-open-portal-gsheet',
    'btn-open-portal-gdocs',
    'btn-open-portal-excel',
    'btn-open-portal-vscode',
    'btn-open-portal-photoshop',
    'btn-open-portal-blender',
    'btn-open-portal-linkedin',
    'btn-open-portal-autocad',
    'btn-open-portal-zalo',
    'btn-open-portal-figma',
    'btn-open-portal-canva',
    'btn-open-portal-powerpoint',
    'btn-modal-to-portal'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        closeThemeModal();
        openPortal(true);
        updatePortalThemeUI(state.theme);
        updatePortalUploadUI();
      });
    }
  });

  // Copy STK Button
  const copyBtn = document.getElementById('btn-copy-stk');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyAccountNumber);
  }

  // Portal document file input
  if (portalFileInput) {
    portalFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const nameLabel = document.getElementById('portal-pdf-filename');
        if (nameLabel) nameLabel.textContent = file.name;
        processDocumentFile(file);
        updatePortalUploadUI();
        e.target.value = '';
      }
    });
  }

  // Drag & drop support on the portal upload card
  const uploadCard = document.getElementById('portal-upload-card') || document.querySelector('.duo-upload-quest');
  if (uploadCard) {
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadCard.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadCard.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      uploadCard.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadCard.classList.remove('is-dragover');
      });
    });
    uploadCard.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt?.files;
      if (files && files.length > 0) {
        processDocumentFile(files[0]);
        updatePortalUploadUI();
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
      copyBtn.textContent = 'Đã sao chép số tài khoản!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Sao chép số tài khoản';
        copyBtn.classList.remove('copied');
      }, 2500);
    }
    showPageFlipToast('Đã sao chép STK: <b>1015471873</b> (Vietcombank - NGUYEN TRAN HAI PHONG)');
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
// CONTROLS VISIBILITY TOGGLE (HOTKEY: H)
// ==========================================================
function initControlsVisibilityToggle() {
  const isHidden = localStorage.getItem('stealth_controls_hidden') === '1';
  if (isHidden) {
    document.body.classList.add('controls-hidden');
  }
  updateControlsToggleButtons(isHidden);

  const floatingBtn = document.getElementById('btn-toggle-ctrls-floating');
  if (floatingBtn) {
    floatingBtn.addEventListener('click', toggleControlsVisibility);
  }

  document.querySelectorAll('.stealth-toggle-btn').forEach(btn => {
    btn.addEventListener('click', toggleControlsVisibility);
  });
}

function toggleControlsVisibility() {
  const isCurrentlyHidden = document.body.classList.toggle('controls-hidden');
  localStorage.setItem('stealth_controls_hidden', isCurrentlyHidden ? '1' : '0');
  updateControlsToggleButtons(isCurrentlyHidden);
  showPageFlipToast(isCurrentlyHidden ? 'Đã ẩn các nút điều khiển (Nhấn phím H để hiện lại)' : 'Đã hiện các nút điều khiển đọc');
}

function updateControlsToggleButtons(isHidden) {
  const floatingBtn = document.getElementById('btn-toggle-ctrls-floating');
  if (floatingBtn) {
    floatingBtn.innerHTML = isHidden
      ? '<span class="stealth-toggle-icon">👁</span><span class="stealth-toggle-text">Hiện điều khiển (H)</span>'
      : '<span class="stealth-toggle-icon">👁</span><span class="stealth-toggle-text">Ẩn điều khiển (H)</span>';
    floatingBtn.title = isHidden ? 'Nhấp để hiện các nút điều khiển đọc (Phím tắt: H)' : 'Nhấp để ẩn các nút điều khiển đọc (Phím tắt: H)';
  }

  document.querySelectorAll('.stealth-toggle-btn').forEach(btn => {
    btn.innerHTML = isHidden ? '👁 Hiện nút (H)' : '👁 Ẩn nút (H)';
    btn.title = isHidden ? 'Hiện các nút điều khiển đọc (Phím tắt: H)' : 'Ẩn các nút điều khiển đọc (Phím tắt: H)';
  });
}

function initVersionReloadButton() {
  if (document.getElementById('btn-force-version-reload')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'btn-force-version-reload';
  button.className = 'version-reload-button';
  button.textContent = '↻';
  button.title = 'Tải lại phiên bản mới (tương đương Ctrl+F5)';
  button.setAttribute('aria-label', 'Tải lại phiên bản mới');
  button.addEventListener('click', () => forceRefreshApplication(button));
  document.body.appendChild(button);
}

async function forceRefreshApplication(button) {
  if (button.disabled) return;

  button.disabled = true;
  button.classList.add('is-loading');
  button.title = 'Đang tải phiên bản mới...';
  saveState();
  await persistDocumentCache().catch(() => {});

  let latestVersion = '';
  try {
    const versionUrl = new URL('version.json', document.baseURI);
    versionUrl.searchParams.set('_', Date.now().toString());
    const response = await fetch(versionUrl, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (response.ok) {
      const data = await response.json();
      latestVersion = String(data.version || '').trim();
    }
  } catch (error) {
    console.info('Không lấy được mã phiên bản trước khi tải lại:', error);
  }

  const refreshedUrl = new URL(window.location.href);
  refreshedUrl.searchParams.set('__appv', latestVersion || Date.now().toString());
  refreshedUrl.searchParams.set('__refresh', Date.now().toString());
  window.location.replace(refreshedUrl.toString());
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
  [
    'btn-boss-key-gsheet',
    'btn-boss-key-excel',
    'btn-boss-key-vscode',
    'btn-boss-key-photoshop',
    'btn-boss-key-blender',
    'btn-boss-key-linkedin',
    'btn-boss-key-autocad'
  ].forEach(id => {
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

    const activeEl = document.activeElement;
    const tag = (activeEl?.tagName || e.target?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || activeEl?.isContentEditable || e.target?.isContentEditable) {
      if (!e.target?.id?.includes('jump')) return;
    }

    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      toggleControlsVisibility();
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
    } else if (e.key === '[' || e.key === '{') {
      e.preventDefault();
      changeFontSize(-1);
    } else if (e.key === ']' || e.key === '}') {
      e.preventDefault();
      changeFontSize(1);
    }
  });

  const fileInput = document.getElementById('file-pdf-input');
  const modalFileInput = document.getElementById('modal-file-pdf');
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);
  if (modalFileInput) modalFileInput.addEventListener('change', handleFileSelect);

  document.querySelectorAll('label[for]').forEach(label => {
    const input = document.getElementById(label.htmlFor);
    if (!input || input.type !== 'file') return;

    label.addEventListener('click', event => {
      event.preventDefault();
      input.click();
    });
  });

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
      if (files.length && isSupportedDocument(files[0])) {
        processDocumentFile(files[0]);
        closeModal();
      } else if (files.length) {
        alert('Chỉ hỗ trợ file PDF, TXT hoặc EPUB.');
      }
    });
  }

  // Page Controls
  [
    'gs-btn-prev', 'gdocs-btn-prev', 'excel-btn-prev', 'vsc-btn-prev',
    'ps-btn-prev', 'blender-btn-prev', 'linkedin-btn-prev',
    'autocad-btn-prev', 'zalo-btn-prev', 'figma-btn-prev',
    'canva-btn-prev', 'ppt-btn-prev'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => changePage(-1));
  });
  [
    'gs-btn-next', 'gdocs-btn-next', 'excel-btn-next', 'vsc-btn-next',
    'ps-btn-next', 'blender-btn-next', 'linkedin-btn-next',
    'autocad-btn-next', 'zalo-btn-next', 'figma-btn-next',
    'canva-btn-next', 'ppt-btn-next'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => changePage(1));
  });

  ['gs-input-jump', 'gdocs-input-jump', 'excel-input-jump'].forEach(id => {
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
  [
    'gs-btn-autoscroll', 'gdocs-btn-autoscroll', 'excel-btn-autoscroll', 'vsc-btn-autoscroll',
    'ps-btn-autoscroll', 'blender-btn-autoscroll', 'linkedin-btn-autoscroll',
    'autocad-btn-autoscroll', 'zalo-btn-autoscroll', 'figma-btn-autoscroll',
    'canva-btn-autoscroll', 'ppt-btn-autoscroll'
  ].forEach(id => {
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
  ['gs-select-font-family', 'gdocs-select-font-family', 'excel-select-font-family', 'modal-select-font-family'].forEach(id => {
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

  ['gs-select-font-size', 'gdocs-select-font-size', 'excel-select-font-size', 'ps-select-font-size'].forEach(id => {
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

  // Step decrement & increment buttons for Font Size across all themes
  [
    'gs-btn-font-dec', 'gdocs-btn-font-dec', 'excel-btn-font-dec',
    'vsc-btn-font-dec', 'ps-btn-font-dec', 'blender-btn-font-dec',
    'linkedin-btn-font-dec', 'autocad-btn-font-dec',
    'zalo-btn-font-dec', 'figma-btn-font-dec',
    'canva-btn-font-dec', 'ppt-btn-font-dec',
    'modal-btn-font-dec', 'stealth-btn-font-dec'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        changeFontSize(-1);
      });
    }
  });

  [
    'gs-btn-font-inc', 'gdocs-btn-font-inc', 'excel-btn-font-inc',
    'vsc-btn-font-inc', 'ps-btn-font-inc', 'blender-btn-font-inc',
    'linkedin-btn-font-inc', 'autocad-btn-font-inc',
    'zalo-btn-font-inc', 'figma-btn-font-inc',
    'canva-btn-font-inc', 'ppt-btn-font-inc',
    'modal-btn-font-inc', 'stealth-btn-font-inc'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        changeFontSize(1);
      });
    }
  });

  // Font Size Slider in Settings Modal
  const modalFontSlider = document.getElementById('modal-slider-font-size');
  if (modalFontSlider) {
    modalFontSlider.addEventListener('input', (e) => {
      setFontSize(e.target.value);
    });
  }

  // Line Height Selects
  ['gdocs-select-line-height', 'modal-select-line-height'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.addEventListener('change', (e) => {
        setLineHeight(e.target.value);
      });
    }
  });

  ['gs-btn-bold', 'gdocs-btn-bold', 'excel-btn-bold'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        state.isBold = !state.isBold;
        syncControls();
        applyStyles();
      });
    }
  });

  ['gs-btn-italic', 'gdocs-btn-italic', 'excel-btn-italic'].forEach(id => {
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

function changeFontSize(delta) {
  let newSize = (state.fontSize || 11) + delta;
  if (newSize < 8) newSize = 8;
  if (newSize > 28) newSize = 28;
  setFontSize(newSize);
  showPageFlipToast(`Cỡ chữ: <b>${newSize}pt</b>`);
}

function setFontSize(size) {
  const num = parseInt(size, 10);
  if (isNaN(num) || num < 6 || num > 36) return;
  state.fontSize = num;
  applyStyles();
  syncControls();
  saveState();
}

function setLineHeight(lh) {
  state.lineHeight = String(lh || '1.75');
  applyStyles();
  syncControls();
  saveState();
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
  ['gs-select-font-family', 'gdocs-select-font-family', 'excel-select-font-family', 'modal-select-font-family'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.fontFamily;
  });
  ['gs-select-font-size', 'gdocs-select-font-size', 'excel-select-font-size', 'ps-select-font-size'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.fontSize;
  });
  ['gdocs-select-line-height', 'modal-select-line-height'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.lineHeight || '1.75';
  });

  const modalBadge = document.getElementById('modal-badge-font-size');
  if (modalBadge) modalBadge.textContent = `${state.fontSize}pt`;

  const modalSlider = document.getElementById('modal-slider-font-size');
  if (modalSlider) modalSlider.value = state.fontSize;

  const stealthFontText = document.getElementById('stealth-quick-font-val');
  if (stealthFontText) stealthFontText.textContent = `${state.fontSize}pt`;

  // Font size badges across themes
  const vscFontVal = document.getElementById('vsc-font-val');
  if (vscFontVal) vscFontVal.textContent = `${state.fontSize}pt`;

  const vscStatFontVal = document.getElementById('vsc-stat-font-val');
  if (vscStatFontVal) vscStatFontVal.textContent = `Aa: ${state.fontSize}pt`;

  const blenderFontVal = document.getElementById('blender-font-val');
  if (blenderFontVal) blenderFontVal.textContent = `${state.fontSize}pt`;

  const lnFontVal = document.getElementById('linkedin-font-val');
  if (lnFontVal) lnFontVal.textContent = `${state.fontSize}pt`;

  const cadFontVal = document.getElementById('autocad-font-val');
  if (cadFontVal) cadFontVal.textContent = `${state.fontSize}pt`;

  const zaloFontVal = document.getElementById('zalo-font-val');
  if (zaloFontVal) zaloFontVal.textContent = `${state.fontSize}pt`;

  const figmaFontVal = document.getElementById('figma-font-val');
  if (figmaFontVal) figmaFontVal.textContent = `${state.fontSize}pt`;

  const canvaFontVal = document.getElementById('canva-font-val');
  if (canvaFontVal) canvaFontVal.textContent = `${state.fontSize}pt`;

  const pptFontVal = document.getElementById('ppt-font-val');
  if (pptFontVal) pptFontVal.textContent = `${state.fontSize}pt`;

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
  const b3 = document.getElementById('gdocs-btn-bold');
  if (b1) b1.classList.toggle('active-toggle', state.isBold);
  if (b2) b2.classList.toggle('active-toggle', state.isBold);
  if (b3) b3.classList.toggle('active-toggle', state.isBold);

  const i1 = document.getElementById('gs-btn-italic');
  const i2 = document.getElementById('excel-btn-italic');
  const i3 = document.getElementById('gdocs-btn-italic');
  if (i1) i1.classList.toggle('active-toggle', state.isItalic);
  if (i2) i2.classList.toggle('active-toggle', state.isItalic);
  if (i3) i3.classList.toggle('active-toggle', state.isItalic);

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
  root.style.setProperty('--story-line-height', state.lineHeight || '1.75');
  root.style.setProperty('--story-letter-spacing', '0.15px');
  
  const grayVal = Math.round((100 - state.textDimLevel) * 2.2);
  const color = `rgb(${grayVal}, ${grayVal}, ${grayVal})`;
  root.style.setProperty('--story-color', color);

  document.querySelectorAll('.story-cell').forEach(cell => {
    cell.style.fontWeight = state.isBold ? 'bold' : 'normal';
    cell.style.fontStyle = state.isItalic ? 'italic' : 'normal';
    cell.style.whiteSpace = state.wrapText ? 'normal' : 'nowrap';
    if (state.fontFamily) cell.style.fontFamily = state.fontFamily;
    if (state.fontSize) cell.style.fontSize = `${state.fontSize}pt`;
    if (state.lineHeight) cell.style.lineHeight = state.lineHeight;
  });

  document.querySelectorAll('.gdocs-story-paragraph').forEach(p => {
    p.style.fontWeight = state.isBold ? 'bold' : 'normal';
    p.style.fontStyle = state.isItalic ? 'italic' : 'normal';
    if (state.fontFamily) p.style.fontFamily = state.fontFamily;
    if (state.fontSize) p.style.fontSize = `${state.fontSize}pt`;
    if (state.lineHeight) p.style.lineHeight = state.lineHeight;
  });

  document.querySelectorAll('.ln-post-paragraph, .ps-chunk-body, .b-story-text, .b-code-content, .cad-note-text, .vsc-code-line, .vsc-gutter-num, .zalo-msg-text, .figma-text-layer, .canva-text-box, .ppt-bullet-text').forEach(el => {
    if (state.fontSize) el.style.fontSize = `${state.fontSize}pt`;
    if (state.lineHeight) el.style.lineHeight = state.lineHeight;
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

function updateBossButton(btn, bossModeActive) {
  if (!btn) return;
  btn.innerHTML = bossModeActive
    ? '<span class="boss-badge">ESC</span> Quay lại'
    : '<span class="boss-badge">ESC</span> Báo cáo nhanh';
  btn.style.backgroundColor = bossModeActive ? '#0F9D58' : '#d93025';
}

function toggleBossKey() {
  const bossButtons = [
    document.getElementById('btn-boss-key-gsheet'),
    document.getElementById('btn-boss-key-gdocs'),
    document.getElementById('btn-boss-key-excel'),
    document.getElementById('btn-boss-key-vscode'),
    document.getElementById('btn-boss-key-photoshop'),
    document.getElementById('btn-boss-key-blender'),
    document.getElementById('btn-boss-key-linkedin'),
    document.getElementById('btn-boss-key-autocad'),
    document.getElementById('btn-boss-key-zalo'),
    document.getElementById('btn-boss-key-figma'),
    document.getElementById('btn-boss-key-canva'),
    document.getElementById('btn-boss-key-powerpoint'),
  ];

  if (state.bossModeActive) {
    state.bossModeActive = false;
    switchSheet(state.previousSheetId || 'view-sheet-story');
    bossButtons.forEach(btn => {
      if (btn) updateBossButton(btn, false);
    });

    // Google Docs toggle
    const gdStory = document.getElementById('gdocs-story-view');
    const gdBoss = document.getElementById('gdocs-boss-view');
    if (gdStory) gdStory.style.display = 'block';
    if (gdBoss) gdBoss.style.display = 'none';

    // Photoshop toggle
    const psArtboard = document.getElementById('ps-artboard-view');
    const psBoss = document.getElementById('ps-boss-view');
    if (psArtboard) psArtboard.style.display = 'flex';
    if (psBoss) psBoss.style.display = 'none';

    // Blender toggle
    const bStory = document.getElementById('blender-story-view');
    const bBoss = document.getElementById('blender-boss-view');
    if (bStory) bStory.style.display = 'block';
    if (bBoss) bBoss.style.display = 'none';

    // LinkedIn toggle
    const lnStory = document.getElementById('linkedin-story-stream');
    const lnBoss = document.getElementById('linkedin-boss-view');
    if (lnStory) lnStory.style.display = 'flex';
    if (lnBoss) lnBoss.style.display = 'none';

    // AutoCAD toggle
    const cadStory = document.getElementById('autocad-story-view');
    const cadBoss = document.getElementById('autocad-boss-view');
    if (cadStory) cadStory.style.display = 'flex';
    if (cadBoss) cadBoss.style.display = 'none';

    // Zalo toggle
    const zStory = document.getElementById('zalo-chat-view');
    const zBoss = document.getElementById('zalo-boss-view');
    if (zStory) zStory.style.display = 'flex';
    if (zBoss) zBoss.style.display = 'none';

    // Figma toggle
    const fStory = document.getElementById('figma-story-view');
    const fBoss = document.getElementById('figma-boss-view');
    if (fStory) fStory.style.display = 'flex';
    if (fBoss) fBoss.style.display = 'none';

    // Canva toggle
    const cStory = document.getElementById('canva-story-view');
    const cBoss = document.getElementById('canva-boss-view');
    if (cStory) cStory.style.display = 'flex';
    if (cBoss) cBoss.style.display = 'none';

    // PowerPoint toggle
    const pStory = document.getElementById('ppt-story-view');
    const pBoss = document.getElementById('ppt-boss-view');
    if (pStory) pStory.style.display = 'flex';
    if (pBoss) pBoss.style.display = 'none';

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
      if (btn) updateBossButton(btn, true);
    });

    // Google Docs toggle
    const gdStory = document.getElementById('gdocs-story-view');
    const gdBoss = document.getElementById('gdocs-boss-view');
    if (gdStory) gdStory.style.display = 'none';
    if (gdBoss) gdBoss.style.display = 'block';

    // Photoshop toggle
    const psArtboard = document.getElementById('ps-artboard-view');
    const psBoss = document.getElementById('ps-boss-view');
    if (psArtboard) psArtboard.style.display = 'none';
    if (psBoss) psBoss.style.display = 'block';

    // Blender toggle
    const bStory = document.getElementById('blender-story-view');
    const bBoss = document.getElementById('blender-boss-view');
    if (bStory) bStory.style.display = 'none';
    if (bBoss) bBoss.style.display = 'flex';

    // LinkedIn toggle
    const lnStory = document.getElementById('linkedin-story-stream');
    const lnBoss = document.getElementById('linkedin-boss-view');
    if (lnStory) lnStory.style.display = 'none';
    if (lnBoss) lnBoss.style.display = 'block';

    // AutoCAD toggle
    const cadStory = document.getElementById('autocad-story-view');
    const cadBoss = document.getElementById('autocad-boss-view');
    if (cadStory) cadStory.style.display = 'none';
    if (cadBoss) cadBoss.style.display = 'block';

    // Zalo toggle
    const zStory = document.getElementById('zalo-chat-view');
    const zBoss = document.getElementById('zalo-boss-view');
    if (zStory) zStory.style.display = 'none';
    if (zBoss) zBoss.style.display = 'block';

    // Figma toggle
    const fStory = document.getElementById('figma-story-view');
    const fBoss = document.getElementById('figma-boss-view');
    if (fStory) fStory.style.display = 'none';
    if (fBoss) fBoss.style.display = 'block';

    // Canva toggle
    const cStory = document.getElementById('canva-story-view');
    const cBoss = document.getElementById('canva-boss-view');
    if (cStory) cStory.style.display = 'none';
    if (cBoss) cBoss.style.display = 'block';

    // PowerPoint toggle
    const pStory = document.getElementById('ppt-story-view');
    const pBoss = document.getElementById('ppt-boss-view');
    if (pStory) pStory.style.display = 'none';
    if (pBoss) pBoss.style.display = 'flex';

    // In VS Code, render pure algorithm code for Boss Key
    if (state.theme === 'theme-vscode') {
      renderVSCodeBossCode();
    }
  }
}
// ==========================================================
// DOCUMENT PARSING & CONTINUOUS STREAM INITIALIZATION
// ==========================================================
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  processDocumentFile(file);
  e.target.value = '';
}

const PDF_INITIAL_PAGE_COUNT = 5;
const PDF_EXTRACTION_CONCURRENCY = 4;
const TEXT_CHUNKS_PER_PAGE = 80;
const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024;
const MAX_EPUB_ENTRIES = 5000;
const MAX_EPUB_TEXT_LENGTH = 30 * 1024 * 1024;
const MAX_EPUB_UNCOMPRESSED_SIZE = 150 * 1024 * 1024;
let pdfBackendAvailable = null;

function getDocumentExtension(file) {
  const name = file && file.name ? file.name.toLowerCase() : '';
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex + 1) : '';
}

function isSupportedDocument(file) {
  return ['pdf', 'txt', 'epub'].includes(getDocumentExtension(file));
}

function prepareDocumentLoad(file) {
  const loadToken = ++state.pdfLoadToken;
  state.isPdfProcessing = true;
  state.loadedPages = 0;
  state.pdfFileName = file.name;
  showLoading('Đang đồng bộ dữ liệu vào hệ thống...');

  const portalNameLabel = document.getElementById('portal-pdf-filename');
  if (portalNameLabel) portalNameLabel.textContent = file.name;
  if (typeof updatePortalUploadUI === 'function') updatePortalUploadUI();

  const gsLabel = document.getElementById('gs-file-name-label');
  if (gsLabel) gsLabel.textContent = 'KPI_Report_Q3_2026.pdf';

  const excelLabel = document.getElementById('excel-file-name-label');
  if (excelLabel) excelLabel.textContent = 'Financial_Ledger_Q3.pdf';

  const vscodeLabel = document.getElementById('vscode-file-name-label');
  if (vscodeLabel) vscodeLabel.textContent = 'dataset_telemetry.pdf';

  const gdocsLabel = document.getElementById('gdocs-file-name-label');
  if (gdocsLabel) gdocsLabel.textContent = file.name;

  state.bossModeActive = false;
  switchSheet('view-sheet-story');
  return loadToken;
}

function validateDocumentFile(file) {
  if (!isSupportedDocument(file)) {
    throw new Error('Chỉ hỗ trợ file PDF, TXT hoặc EPUB.');
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error('File lớn hơn 100 MB. Hãy chọn file nhỏ hơn để tránh trình duyệt bị treo.');
  }
}

async function processDocumentFile(file) {
  try {
    validateDocumentFile(file);
  } catch (error) {
    alert(error.message);
    return;
  }

  const extension = getDocumentExtension(file);
  if (extension === 'pdf') return processPdfFile(file);
  if (extension === 'txt') return processTextFile(file);
  return processEpubFile(file);
}

function chunksToPagesData(chunks, chunksPerPage = TEXT_CHUNKS_PER_PAGE) {
  const pagesData = {};
  let pageNum = 1;

  for (let start = 0; start < chunks.length; start += chunksPerPage) {
    pagesData[String(pageNum++)] = chunks.slice(start, start + chunksPerPage);
  }

  return pagesData;
}

function finishTextDocument(chunks, formatLabel) {
  if (chunks.length === 0) throw new Error(`File ${formatLabel} không có nội dung văn bản.`);

  const pagesData = chunksToPagesData(chunks);
  const totalPages = Object.keys(pagesData).length;
  state.loadedPages = totalPages;
  state.isPdfProcessing = false;
  initStoryFromPages(pagesData, totalPages, 1);
  showBanner(`Đã nạp thành công file ${formatLabel}: <b>${totalPages}</b> phần đọc.`);
}

async function processTextFile(file) {
  const loadToken = prepareDocumentLoad(file);

  try {
    showLoading('Đang đọc nội dung file TXT...');
    const text = await file.text();
    if (loadToken !== state.pdfLoadToken) return;

    finishTextDocument(splitTextIntoChunks(text, state.chunkMode), 'TXT');
  } catch (error) {
    if (loadToken !== state.pdfLoadToken) return;
    state.isPdfProcessing = false;
    console.error('TXT parsing error:', error);
    alert('Không thể đọc file TXT: ' + error.message);
  } finally {
    if (loadToken === state.pdfLoadToken) hideLoading();
  }
}

function parseXmlDocument(xmlText, description) {
  if (/<!DOCTYPE/i.test(xmlText)) {
    throw new Error(`${description} chứa khai báo DOCTYPE không được hỗ trợ.`);
  }

  const documentNode = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (documentNode.getElementsByTagName('parsererror').length > 0) {
    throw new Error(`${description} không hợp lệ.`);
  }
  return documentNode;
}

function epubElements(documentNode, localName) {
  return Array.from(documentNode.getElementsByTagNameNS('*', localName));
}

function normalizeEpubPath(baseDirectory, href) {
  let decodedHref;
  try {
    decodedHref = decodeURIComponent((href || '').split('#')[0].split('?')[0]);
  } catch (error) {
    decodedHref = (href || '').split('#')[0].split('?')[0];
  }

  const segments = `${baseDirectory}/${decodedHref}`.replace(/\\/g, '/').split('/');
  const normalized = [];

  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (normalized.length === 0) throw new Error('EPUB chứa đường dẫn không an toàn.');
      normalized.pop();
    } else {
      normalized.push(segment);
    }
  }

  return normalized.join('/');
}

function extractTextFromEpubHtml(htmlText) {
  const documentNode = new DOMParser().parseFromString(htmlText, 'text/html');
  documentNode.querySelectorAll('script, style, noscript, template, svg').forEach(node => node.remove());

  const root = documentNode.body || documentNode.documentElement;
  const blockSelector = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre';
  const blocks = Array.from(root.querySelectorAll(blockSelector))
    .filter(node => !Array.from(node.children).some(child => child.matches(blockSelector)))
    .map(node => node.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return blocks.length > 0 ? blocks.join('\n\n') : root.textContent.replace(/\s+/g, ' ').trim();
}

let jsZipLoadPromise = null;

function ensureJsZipLoaded() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (jsZipLoadPromise) return jsZipLoadPromise;

  jsZipLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      script.remove();
      reject(new Error('Tải thư viện JSZip quá 10 giây. Hãy kiểm tra kết nối tới static/jszip.min.js.'));
    }, 10000);

    script.src = `static/jszip.min.js?v=20261002-1`;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeoutId);
      if (window.JSZip) {
        resolve(window.JSZip);
      } else {
        reject(new Error('JSZip đã tải nhưng không khởi tạo được.'));
      }
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Không tải được static/jszip.min.js.'));
    };
    document.head.appendChild(script);
  }).catch(error => {
    jsZipLoadPromise = null;
    throw error;
  });

  return jsZipLoadPromise;
}

async function processEpubFile(file) {
  const loadToken = prepareDocumentLoad(file);
  const startedAt = performance.now();
  let currentStage = 'Đang chuẩn bị đọc EPUB';

  const updateEpubStatus = (stage) => {
    currentStage = stage;
    const elapsedSeconds = Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
    const waitingMessage = elapsedSeconds >= 8
      ? 'File vẫn đang được xử lý, chưa phát hiện lỗi. EPUB có chương lớn sẽ cần thêm thời gian.'
      : 'Ứng dụng đang mở file EPUB, đây chưa phải là lỗi.';
    showLoading(`${stage} (${elapsedSeconds}s)`, `${file.name} · ${waitingMessage}`);
  };

  const yieldToBrowser = () => new Promise(resolve => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });

  const statusTimer = setInterval(() => {
    if (loadToken === state.pdfLoadToken) updateEpubStatus(currentStage);
  }, 1000);

  try {
    updateEpubStatus('Đang nạp thư viện đọc EPUB');
    const JSZipLibrary = await ensureJsZipLoaded();

    updateEpubStatus('Đang giải nén cấu trúc EPUB');
    await yieldToBrowser();
    const zip = await JSZipLibrary.loadAsync(await file.arrayBuffer(), {
      createFolders: false
    });
    if (loadToken !== state.pdfLoadToken) return;

    const entries = Object.values(zip.files);
    if (entries.length > MAX_EPUB_ENTRIES) {
      throw new Error(`EPUB có quá nhiều tệp con (${entries.length}/${MAX_EPUB_ENTRIES}).`);
    }

    const knownUncompressedSize = entries.reduce((total, entry) => {
      const size = entry._data && Number.isFinite(entry._data.uncompressedSize)
        ? entry._data.uncompressedSize
        : 0;
      return total + size;
    }, 0);
    if (knownUncompressedSize > MAX_EPUB_UNCOMPRESSED_SIZE) {
      throw new Error('Dung lượng EPUB sau giải nén vượt quá giới hạn 150 MB.');
    }

    const containerEntry = zip.file('META-INF/container.xml');
    if (!containerEntry) throw new Error('Thiếu META-INF/container.xml.');

    updateEpubStatus('Đang đọc thông tin sách và mục lục');
    const containerXml = parseXmlDocument(await containerEntry.async('string'), 'container.xml');
    const rootfile = epubElements(containerXml, 'rootfile')[0];
    const packagePath = rootfile ? rootfile.getAttribute('full-path') : '';
    if (!packagePath) throw new Error('Không tìm thấy package document trong EPUB.');

    const normalizedPackagePath = normalizeEpubPath('', packagePath);
    const packageEntry = zip.file(normalizedPackagePath);
    if (!packageEntry) throw new Error('Không tìm thấy file nội dung chính của EPUB.');

    const packageXml = parseXmlDocument(await packageEntry.async('string'), 'package document');
    const packageDirectory = normalizedPackagePath.includes('/')
      ? normalizedPackagePath.slice(0, normalizedPackagePath.lastIndexOf('/'))
      : '';

    const manifest = new Map();
    epubElements(packageXml, 'item').forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (id && href) manifest.set(id, normalizeEpubPath(packageDirectory, href));
    });

    const spinePaths = epubElements(packageXml, 'itemref')
      .map(itemref => manifest.get(itemref.getAttribute('idref')))
      .filter(Boolean);
    if (spinePaths.length === 0) throw new Error('EPUB không có thứ tự chương đọc (spine).');

    const pagesData = {};
    let pageNum = 1;
    let totalTextLength = 0;

    for (let index = 0; index < spinePaths.length; index++) {
      if (loadToken !== state.pdfLoadToken) return;

      const chapterEntry = zip.file(spinePaths[index]);
      if (!chapterEntry) continue;

      updateEpubStatus(`Đang đọc chương ${index + 1} / ${spinePaths.length}`);
      const chapterHtml = await chapterEntry.async('string');
      totalTextLength += chapterHtml.length;
      if (totalTextLength > MAX_EPUB_TEXT_LENGTH) {
        throw new Error('Nội dung EPUB sau giải nén vượt quá giới hạn 30 MB.');
      }

      updateEpubStatus(`Đang tách văn bản chương ${index + 1} / ${spinePaths.length}`);
      await yieldToBrowser();
      const chapterText = extractTextFromEpubHtml(chapterHtml);
      const chunks = splitTextIntoChunks(chapterText, state.chunkMode);
      for (let start = 0; start < chunks.length; start += TEXT_CHUNKS_PER_PAGE) {
        pagesData[String(pageNum++)] = chunks.slice(start, start + TEXT_CHUNKS_PER_PAGE);
      }

      await yieldToBrowser();
    }

    if (loadToken !== state.pdfLoadToken) return;
    const totalPages = pageNum - 1;
    if (totalPages < 1) throw new Error('EPUB không có nội dung văn bản có thể đọc.');

    updateEpubStatus(`Đang dựng ${totalPages} phần đọc lên giao diện`);
    await yieldToBrowser();
    state.loadedPages = totalPages;
    state.isPdfProcessing = false;
    initStoryFromPages(pagesData, totalPages, 1);
    const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    showBanner(`Đã nạp thành công EPUB: <b>${totalPages}</b> phần đọc từ ${spinePaths.length} chương trong <b>${elapsedSeconds} giây</b>.`);
  } catch (error) {
    if (loadToken !== state.pdfLoadToken) return;
    state.isPdfProcessing = false;
    console.error('EPUB parsing error:', error);
    alert(`Không thể đọc file EPUB tại bước "${currentStage}": ${error.message}`);
  } finally {
    clearInterval(statusTimer);
    if (loadToken === state.pdfLoadToken) hideLoading();
  }
}

async function hasPdfBackend() {
  if (pdfBackendAvailable !== null) return pdfBackendAvailable;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal
    });
    if (!response.ok) {
      pdfBackendAvailable = false;
    } else {
      const data = await response.json();
      pdfBackendAvailable = data.ok === true && data.pdfExtraction === true;
    }
  } catch (error) {
    pdfBackendAvailable = false;
  } finally {
    clearTimeout(timeoutId);
  }

  return pdfBackendAvailable;
}

function cleanAndRepairVietnameseText(text) {
  if (!text || typeof text !== 'string') return text;

  // 1. Normalize Unicode to standard precomposed NFC
  let s = text.normalize('NFC');

  // 2. Fix decomposed combining diacritical marks with a space in front
  // e.g., 'e ̣' -> 'ẹ', 'o ̀' -> 'ò'
  s = s.replace(/([a-zA-ZáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ])\s+([\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f])/g, '$1$2').normalize('NFC');

  // 3. Set of syllables/characters that CANNOT be independent standalone words in Vietnamese
  const invalidStandalones = new Set([
    'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x',
    'ch', 'gh', 'gi', 'kh', 'nh', 'ng', 'ngh', 'ph', 'qu', 'th', 'tr',
    'ử', 'ộ', 'ậ', 'ủ', 'ể', 'ứ', 'ọ', 'ừa', 'ỏ', 'ố', 'ấ', 'ệu', 'ầ', 'ệ', 'ạ', 'ữa',
    'ẳng', 'ản', 'ớ', 'ắ', 'ồi', 'ảng', 'ức', 'ực', 'ẹp', 'ợ', 'ở', 'ỡ',
    'ẽ', 'ẻ', 'ị', 'ỉ', 'ĩ', 'ụ', 'ũ', 'ừ', 'ử', 'ữ', 'ỳ', 'ỷ', 'ỹ', 'ỵ',
    'chuy', 'nguy', 'tho', 'truo', 'thuo', 'khuy', 'tuye', 'nhie', 'bie', 'chi'
  ]);

  const VN_VOWEL_CHAR = '[aăâeêioôơuưyáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]';

  // Multi-pass merge for spaced syllables (run up to 6 passes until stable)
  let prev = '';
  let pass = 0;
  while (s !== prev && pass < 6) {
    prev = s;
    pass++;

    // A. Single consonant or initial digraph + space + accented vowel(s)
    // Examples: 'c ử' -> 'cử', 'm ộ' -> 'mộ', 'k ể' -> 'kể', 'c ả' -> 'cả', 's ố' -> 'số', 'r ồi' -> 'rồi', 'th ứ' -> 'thứ', 'd ấ' -> 'dấ'
    s = s.replace(/(^|[\s(„"':;–—\-])(b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x|ch|gh|gi|kh|nh|ng|ngh|ph|qu|th|tr|B|C|D|Đ|G|H|K|L|M|N|P|R|S|T|V|X|Ch|Gh|Gi|Kh|Nh|Ng|Ngh|Ph|Qu|Th|Tr)\s+([áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ][a-zA-Zà-ỹ]*)/gi, '$1$2$3');

    // B. Word ending with vowel + space + single final letter/consonant
    // Examples: 'cử a' -> 'cửa', 'mộ t' -> 'một', 'cậu u' -> 'cậu', 'đầ u' -> 'đầu', 'trướ c' -> 'trước', 'khỏ i' -> 'khỏi', 'Thằ ng' -> 'Thằng', 'lạ i' -> 'lại', 'lầ n' -> 'lần', 'nữ a' -> 'nữa', 'tấ m' -> 'tấm', 'bả n' -> 'bản', 'mắ t' -> 'mắt', 'lắ c' -> 'lắc', 'hậ u' -> 'hậu', 'bả ng' -> 'bảng'
    s = s.replace(new RegExp('(' + VN_VOWEL_CHAR + '+)\\s+(c|m|n|p|t|ch|ng|nh|a|i|u|o|y)(?=[\\s,.;:!?)]|$)', 'gi'), '$1$2');

    // C. Words split by prefix or invalid standalone token
    // Examples: 'chuy ện' -> 'chuyện', 'hi ệu' -> 'hiệu', 'nguy ên' -> 'nguyên'
    s = s.replace(/([a-zA-Zà-ỹ]+)\s+([a-zA-Zà-ỹ]+)/g, (match, w1, w2) => {
      const l1 = w1.toLowerCase();
      const l2 = w2.toLowerCase();
      if (invalidStandalones.has(l1) || invalidStandalones.has(l2)) {
        return w1 + w2;
      }
      return match;
    });
  }

  // 4. Clean up spaces before punctuation marks: e.g. "bản đồ ." -> "bản đồ."
  s = s.replace(/\s+([,.;:!?])/g, '$1');

  // 5. Clean duplicate spaces
  s = s.replace(/ {2,}/g, ' ');

  return s;
}

async function extractPdfPage(pdfDoc, pageNum) {
  let page = null;

  try {
    page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent({
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });

    let fullText = '';
    let lastX = null;
    let lastY = null;
    let lastWidth = 0;
    let lastHeight = 12;

    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i];
      const str = item.str || '';
      if (!str && !item.hasEOL) continue;

      const currentX = item.transform ? item.transform[4] : null;
      const currentY = item.transform ? item.transform[5] : null;
      const currentWidth = item.width || 0;
      const currentHeight = item.height || (item.transform ? Math.abs(item.transform[0]) : 12);

      if (lastY !== null && currentY !== null) {
        const deltaY = Math.abs(currentY - lastY);
        if (deltaY > 5) {
          // New line / paragraph break
          if (!fullText.endsWith('\n')) {
            fullText += deltaY > 18 ? '\n\n' : '\n';
          }
        } else if (lastX !== null && currentX !== null) {
          // On the same horizontal line: calculate distance between previous item end and current item start
          const endOfLast = lastX + lastWidth;
          const gap = currentX - endOfLast;
          // Space threshold: around 18% of character height, minimum 1.8px
          const spaceThreshold = Math.max(1.8, (lastHeight || 12) * 0.18);

          if (gap >= spaceThreshold) {
            if (!fullText.endsWith(' ') && !str.startsWith(' ')) {
              fullText += ' ';
            }
          }
        }
      }

      fullText += str;

      if (item.hasEOL && !fullText.endsWith('\n')) {
        fullText += '\n';
      }

      lastX = currentX;
      lastY = currentY;
      lastWidth = currentWidth;
      lastHeight = currentHeight;
    }

    const normalizedText = cleanAndRepairVietnameseText(fullText);

    return {
      pageNum,
      chunks: splitTextIntoChunks(normalizedText, state.chunkMode),
      textLength: normalizedText.trim().length
    };
  } catch (error) {
    console.warn(`Không thể trích xuất trang ${pageNum}:`, error);
    return { pageNum, chunks: [], textLength: 0 };
  } finally {
    if (page && typeof page.cleanup === 'function') page.cleanup();
  }
}

function appendExtractedPages(pageResults) {
  pageResults
    .sort((a, b) => a.pageNum - b.pageNum)
    .forEach(({ pageNum, chunks }) => {
      if (Object.prototype.hasOwnProperty.call(state.pageStartIndices, pageNum)) return;

      state.pageStartIndices[pageNum] = state.allChunks.length;
      const pageChunks = chunks.length > 0
        ? chunks
        : [`[Trang ${pageNum}: Hình ảnh hoặc trang scan không chứa ký tự văn bản]`];

      pageChunks.forEach((text, indexInPage) => {
        state.allChunks.push({
          text,
          page: pageNum,
          indexInPage,
          globalIndex: state.allChunks.length
        });
      });

      state.loadedPages = Math.max(state.loadedPages, pageNum);
    });

  updatePaginationUI();
}

function initProgressiveStory(initialPages, totalPages) {
  state.allChunks = [];
  state.pageStartIndices = {};
  state.renderedCount = 0;
  state.loadedPages = 0;
  state.totalPages = totalPages;

  appendExtractedPages(initialPages);

  const firstTextPage = initialPages.find(page => page.textLength > 80);
  const startPage = firstTextPage ? firstTextPage.pageNum : 1;
  const startIdx = state.pageStartIndices[startPage] || 0;
  state.firstStoryPage = startPage;
  state.currentPage = startPage;
  state.currentGlobalIndex = startIdx;

  applyTheme(state.theme);
  renderContinuousView(false, startIdx);
  saveState();
  persistDocumentCache().catch(() => {});
  if (typeof updatePortalUploadUI === 'function') updatePortalUploadUI();
}

async function extractRemainingPdfPages(pdfDoc, startPage, totalPages, loadToken) {
  for (let batchStart = startPage; batchStart <= totalPages; batchStart += PDF_EXTRACTION_CONCURRENCY) {
    if (loadToken !== state.pdfLoadToken) return;

    const batchEnd = Math.min(batchStart + PDF_EXTRACTION_CONCURRENCY - 1, totalPages);
    const pageNumbers = [];
    for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) pageNumbers.push(pageNum);

    const pageResults = await Promise.all(pageNumbers.map(pageNum => extractPdfPage(pdfDoc, pageNum)));
    if (loadToken !== state.pdfLoadToken) return;

    appendExtractedPages(pageResults);
    showBanner(`Đã sẵn sàng <b>${state.loadedPages}/${totalPages}</b> trang. Bạn có thể đọc trong khi các trang còn lại đang được xử lý.`);

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  if (loadToken !== state.pdfLoadToken) return;
  state.isPdfProcessing = false;
  updatePaginationUI();
  showBanner(`Đã nạp thành công toàn bộ <b>${totalPages}</b> trang sách!`);
  saveState();
}

async function processPdfFile(file) {
  const loadToken = prepareDocumentLoad(file);

  // Only upload the PDF when a real parser endpoint is available.
  if (await hasPdfBackend()) {
    try {
      const formData = new FormData();
      formData.append('pdf', file, file.name);

      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (loadToken !== state.pdfLoadToken) return;
        if (data.success && data.totalPages > 0) {
          state.totalPages = data.totalPages;
          state.firstStoryPage = data.firstStoryPage || 1;
          state.loadedPages = data.totalPages;
          state.isPdfProcessing = false;

          showBanner(`Đã nạp thành công toàn bộ <b>${data.totalPages}</b> trang sách!`);
          initStoryFromPages(data.pages, data.totalPages, state.firstStoryPage);
          hideLoading();
          return;
        }
      }
    } catch (err) {
      console.log('Backend parser unavailable, falling back to client-side PDF.js...', err);
    }
  }

  // Client-side fallback: render the first pages, then continue in background.
  try {
    if (!window.pdfjsLib) throw new Error('Thư viện PDF.js chưa sẵn sàng');

    const arrayBuffer = await file.arrayBuffer();
    if (loadToken !== state.pdfLoadToken) return;

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true,
      isEvalSupported: false,
      enableScripting: false
    });

    state.pdfDoc = await loadingTask.promise;
    if (loadToken !== state.pdfLoadToken) return;

    state.totalPages = state.pdfDoc.numPages;
    if (state.totalPages < 1) throw new Error('File PDF không có trang nào');
    const initialPageCount = Math.min(PDF_INITIAL_PAGE_COUNT, state.totalPages);
    const initialPageNumbers = Array.from({ length: initialPageCount }, (_, index) => index + 1);

    showLoading(`Đang trích xuất ${initialPageCount} trang đầu tiên...`);
    const initialPages = await Promise.all(initialPageNumbers.map(pageNum => extractPdfPage(state.pdfDoc, pageNum)));
    if (loadToken !== state.pdfLoadToken) return;

    initProgressiveStory(initialPages, state.totalPages);
    hideLoading();

    if (initialPageCount < state.totalPages) {
      showBanner(`Đã sẵn sàng <b>${initialPageCount}/${state.totalPages}</b> trang. Các trang còn lại đang được xử lý nền.`);
      extractRemainingPdfPages(state.pdfDoc, initialPageCount + 1, state.totalPages, loadToken)
        .catch(error => {
          if (loadToken !== state.pdfLoadToken) return;
          state.isPdfProcessing = false;
          updatePaginationUI();
          console.error('Background PDF parsing error:', error);
          showBanner(`Đã đọc được <b>${state.loadedPages}/${state.totalPages}</b> trang. Một số trang còn lại không thể xử lý.`);
        });
    } else {
      state.isPdfProcessing = false;
      updatePaginationUI();
      showBanner(`Đã nạp thành công toàn bộ <b>${state.totalPages}</b> trang sách!`);
    }
  } catch (err) {
    if (loadToken !== state.pdfLoadToken) return;
    state.isPdfProcessing = false;
    console.error('PDF parsing error:', err);
    alert('Không thể trích xuất file PDF: ' + err.message);
  } finally {
    if (loadToken === state.pdfLoadToken) hideLoading();
  }
}

function splitTextIntoChunks(text, mode) {
  const cleanText = cleanAndRepairVietnameseText(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ');
  
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
  state.totalPages = totalPages;
  state.loadedPages = totalPages;
  state.isPdfProcessing = false;
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
  persistDocumentCache().catch(() => {});
  if (typeof updatePortalUploadUI === 'function') updatePortalUploadUI();
}

function initStoryFromChunks(chunks) {
  state.allChunks = [];
  state.pageStartIndices = { 1: 0 };
  state.totalPages = 1;
  state.loadedPages = 1;
  state.isPdfProcessing = false;
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
  } else if (state.theme === 'theme-googledocs') {
    const stream = document.getElementById('gdocs-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-photoshop') {
    const stream = document.getElementById('ps-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-blender') {
    const stream = document.getElementById('blender-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-linkedin') {
    const stream = document.getElementById('linkedin-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-autocad') {
    const stream = document.getElementById('autocad-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-zalo') {
    const stream = document.getElementById('zalo-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-figma') {
    const stream = document.getElementById('figma-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-canva') {
    const stream = document.getElementById('canva-story-stream');
    if (stream) stream.innerHTML = '';
  } else if (state.theme === 'theme-powerpoint') {
    const stream = document.getElementById('ppt-story-stream');
    if (stream) stream.innerHTML = '';
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
  } else if (state.theme === 'theme-googledocs') {
    appendGoogleDocsBatch(count);
  } else if (state.theme === 'theme-photoshop') {
    appendPhotoshopBatch(count);
  } else if (state.theme === 'theme-blender') {
    appendBlenderBatch(count);
  } else if (state.theme === 'theme-linkedin') {
    appendLinkedInBatch(count);
  } else if (state.theme === 'theme-autocad') {
    appendAutoCADBatch(count);
  } else if (state.theme === 'theme-zalo') {
    appendZaloBatch(count);
  } else if (state.theme === 'theme-figma') {
    appendFigmaBatch(count);
  } else if (state.theme === 'theme-canva') {
    appendCanvaBatch(count);
  } else if (state.theme === 'theme-powerpoint') {
    appendPowerPointBatch(count);
  } else {
    appendSpreadsheetBatch(count);
  }
  applyStyles();
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
    if (state.theme !== 'theme-googlesheets' && state.readingMode === 'formula') {
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

  if (end === state.allChunks.length && !state.isPdfProcessing) {
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

// 4. Adobe Photoshop Artboard Typography Batch Renderer
function appendPhotoshopBatch(count) {
  const stream = document.getElementById('ps-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const p = document.createElement('div');
    p.className = 'ps-story-paragraph';
    p.id = `ps-story-para-${chunk.globalIndex}`;
    p.dataset.index = chunk.globalIndex;
    p.dataset.page = chunk.page;

    p.innerHTML = `
      <span class="ps-chunk-meta">T&nbsp;&nbsp;Editorial_Copy_${String(chunk.globalIndex + 1).padStart(4, '0')} &nbsp;•&nbsp; Artboard ${chunk.page}</span>
      <div class="ps-chunk-body">${escapeHtml(chunk.text)}</div>
    `;

    const gIdx = chunk.globalIndex;
    p.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(p);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 5. Blender Text Editor Batch Renderer
function appendBlenderBatch(count) {
  const stream = document.getElementById('blender-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const line = document.createElement('div');
    line.className = 'blender-code-line';
    line.id = `blender-story-line-${chunk.globalIndex}`;
    line.dataset.index = chunk.globalIndex;
    line.dataset.page = chunk.page;

    const variableName = `copy_block_${String(chunk.globalIndex + 1).padStart(4, '0')}`;
    line.innerHTML = `
      <span class="b-line-number">${chunk.globalIndex + 12}</span>
      <span class="b-code-content"><span class="b-code-var">${variableName}</span> <span class="b-code-op">=</span> <span class="b-story-text">"""${escapeHtml(chunk.text)}"""</span></span>
    `;

    const gIdx = chunk.globalIndex;
    line.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(line);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 6. LinkedIn Feed Post Batch Renderer (Grouped multi-chunk posts)
function appendLinkedInBatch(count) {
  const stream = document.getElementById('linkedin-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const targetEnd = Math.min(start + count, state.allChunks.length);
  if (start >= targetEnd) return;

  const fragment = document.createDocumentFragment();
  const authors = [
    { name: 'Nguyen Tran Hai Phong', role: 'Senior Solution Architect & Tech Lead', avatar: 'NP' },
    { name: 'Dr. Michael Chen', role: 'Principal AI Researcher & Author', avatar: 'MC' },
    { name: 'Sophia Duong', role: 'Director of Product Strategy | Global Tech', avatar: 'SD' },
    { name: 'Marcus Vance', role: 'Engineering Fellow & Executive Advisor', avatar: 'MV' }
  ];

  let currentIdx = start;
  while (currentIdx < targetEnd) {
    // Group 4 to 5 chunks together into 1 cohesive post
    const postChunkBatch = [];
    const batchSize = 4;
    const postEnd = Math.min(currentIdx + batchSize, state.allChunks.length);

    for (let j = currentIdx; j < postEnd; j++) {
      postChunkBatch.push(state.allChunks[j]);
    }

    const firstChunk = postChunkBatch[0];
    const lastChunk = postChunkBatch[postChunkBatch.length - 1];
    const postGlobalIndex = firstChunk.globalIndex;
    const author = authors[postGlobalIndex % authors.length];
    const hoursAgo = (postGlobalIndex % 8) + 1;
    const likes = 120 + ((postGlobalIndex * 37) % 890);
    const comments = 12 + ((postGlobalIndex * 13) % 94);

    const post = document.createElement('div');
    post.className = 'linkedin-post-card';
    post.id = `linkedin-post-${postGlobalIndex}`;
    post.dataset.index = postGlobalIndex;
    post.dataset.page = firstChunk.page;

    const pageSpan = firstChunk.page === lastChunk.page ? `Trang ${firstChunk.page}` : `Trang ${firstChunk.page} - ${lastChunk.page}`;

    // Generate paragraphs
    let paragraphsHtml = '';
    postChunkBatch.forEach((chunk, pIdx) => {
      paragraphsHtml += `
        <div class="ln-post-paragraph" id="ln-para-${chunk.globalIndex}" data-index="${chunk.globalIndex}" data-page="${chunk.page}">
          <span class="ln-paragraph-seq">§${chunk.globalIndex + 1}</span>
          ${escapeHtml(chunk.text)}
        </div>
      `;
    });

    post.innerHTML = `
      <div class="ln-post-author">
        <div class="ln-avatar-mini">${author.avatar}</div>
        <div>
          <h5>${author.name} • 1st</h5>
          <span>${author.role}</span>
          <span style="font-size: 10px; color: #888;">${hoursAgo} giờ trước • 🌐 • ${pageSpan}</span>
        </div>
      </div>
      <div class="ln-post-paragraphs-wrapper">
        ${paragraphsHtml}
      </div>
      <div class="ln-hashtags">#Leadership #Innovation #GrowthMindset #Literature #DeepWork</div>
      <div class="ln-reaction-bar">
        <span>👍 ❤️  ${likes}</span>
        <span>${comments} bình luận • 8 lượt chia sẻ</span>
      </div>
    `;

    // Click on individual paragraphs selects that chunk
    post.querySelectorAll('.ln-post-paragraph').forEach(para => {
      para.addEventListener('click', (e) => {
        e.stopPropagation();
        const gIdx = parseInt(para.dataset.index, 10);
        setActiveRow(gIdx, true);
      });
    });

    post.addEventListener('click', () => {
      setActiveRow(firstChunk.globalIndex, true);
    });

    fragment.appendChild(post);
    currentIdx = postEnd;
  }

  stream.appendChild(fragment);
  state.renderedCount = currentIdx;
}

// 7. AutoCAD General Notes Batch Renderer
function appendAutoCADBatch(count) {
  const stream = document.getElementById('autocad-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const note = document.createElement('div');
    note.className = 'cad-note-item';
    note.id = `autocad-note-${chunk.globalIndex}`;
    note.dataset.index = chunk.globalIndex;
    note.dataset.page = chunk.page;

    const noteTag = `GN-${String(chunk.page).padStart(2, '0')}.${String(chunk.indexInPage + 1).padStart(2, '0')}`;
    note.innerHTML = `
      <span class="cad-note-tag">${noteTag}:</span>
      <span class="cad-note-text">${escapeHtml(chunk.text)}</span>
    `;

    const gIdx = chunk.globalIndex;
    note.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(note);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 8. Google Docs Manuscript Paragraph Batch Renderer
function appendGoogleDocsBatch(count) {
  const stream = document.getElementById('gdocs-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const p = document.createElement('p');
    p.className = 'gdocs-story-paragraph';
    p.id = `gdocs-story-para-${chunk.globalIndex}`;
    p.dataset.index = chunk.globalIndex;
    p.dataset.page = chunk.page;
    p.textContent = chunk.text;
    if (state.fontFamily) p.style.fontFamily = state.fontFamily;
    if (state.fontSize) p.style.fontSize = `${state.fontSize}pt`;
    if (state.lineHeight) p.style.lineHeight = state.lineHeight;
    if (state.isBold) p.style.fontWeight = 'bold';
    if (state.isItalic) p.style.fontStyle = 'italic';

    const gIdx = chunk.globalIndex;
    p.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(p);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 9. Zalo PC Chat Stream Batch Renderer
function appendZaloBatch(count) {
  const stream = document.getElementById('zalo-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();
  const senders = [
    { name: 'Phong (Tech Lead)', avatar: 'HP', bg: '#0068ff' },
    { name: 'Nguyễn Văn Hùng (Dev Lead)', avatar: 'VH', bg: '#059669' },
    { name: 'Lê Thuỳ Trang (PM)', avatar: 'TT', bg: '#7c3aed' },
    { name: 'Đỗ Hoàng Nam (QA Lead)', avatar: 'HN', bg: '#d97706' }
  ];

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const sender = senders[chunk.globalIndex % senders.length];
    const hour = 9 + Math.floor((chunk.globalIndex * 7) / 60) % 8;
    const min = (chunk.globalIndex * 13) % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    const msgItem = document.createElement('div');
    msgItem.className = 'zalo-msg-item';
    msgItem.id = `zalo-msg-${chunk.globalIndex}`;
    msgItem.dataset.index = chunk.globalIndex;
    msgItem.dataset.page = chunk.page;

    msgItem.innerHTML = `
      <div class="zalo-msg-avatar" style="background: ${sender.bg};">${sender.avatar}</div>
      <div class="zalo-msg-content-box">
        <div class="zalo-msg-sender-name">
          <span>${sender.name}</span>
          <span class="zalo-msg-time">${timeStr} • Trang ${chunk.page}</span>
        </div>
        <div class="zalo-msg-bubble">
          <div class="zalo-msg-text">${escapeHtml(chunk.text)}</div>
          <span class="zalo-msg-meta-tag">Đoạn #${chunk.globalIndex + 1} • Đã nhận ✓✓</span>
        </div>
      </div>
    `;

    const gIdx = chunk.globalIndex;
    msgItem.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(msgItem);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 10. Figma UI/UX Design System Typography Batch Renderer
function appendFigmaBatch(count) {
  const stream = document.getElementById('figma-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const layer = document.createElement('div');
    layer.className = 'figma-layer-item';
    layer.id = `figma-layer-${chunk.globalIndex}`;
    layer.dataset.index = chunk.globalIndex;
    layer.dataset.page = chunk.page;

    const layerName = `T Body_Copy_Block_${String(chunk.globalIndex + 1).padStart(4, '0')}`;
    layer.innerHTML = `
      <div class="figma-layer-meta">
        <span class="figma-meta-name">${layerName}</span>
        <span class="figma-meta-spec">AutoLayout • Trang ${chunk.page}</span>
      </div>
      <div class="figma-text-layer">${escapeHtml(chunk.text)}</div>
    `;

    const gIdx = chunk.globalIndex;
    layer.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(layer);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 11. Canva Presentation Slide Text Box Batch Renderer
function appendCanvaBatch(count) {
  const stream = document.getElementById('canva-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const box = document.createElement('div');
    box.className = 'canva-block-item';
    box.id = `canva-block-${chunk.globalIndex}`;
    box.dataset.index = chunk.globalIndex;
    box.dataset.page = chunk.page;

    box.innerHTML = `
      <div class="canva-block-header">
        <span class="canva-block-label">Mục ${chunk.globalIndex + 1} • Trang ${chunk.page}</span>
      </div>
      <div class="canva-text-box">${escapeHtml(chunk.text)}</div>
    `;

    const gIdx = chunk.globalIndex;
    box.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(box);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 12. Microsoft PowerPoint Bullet Paragraph Batch Renderer
function appendPowerPointBatch(count) {
  const stream = document.getElementById('ppt-story-stream');
  if (!stream || state.allChunks.length === 0) return;

  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;

  const fragment = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const para = document.createElement('div');
    para.className = 'ppt-para-item';
    para.id = `ppt-para-${chunk.globalIndex}`;
    para.dataset.index = chunk.globalIndex;
    para.dataset.page = chunk.page;

    para.innerHTML = `
      <span class="ppt-bullet-icon">■</span>
      <div class="ppt-bullet-text">${escapeHtml(chunk.text)}</div>
    `;

    const gIdx = chunk.globalIndex;
    para.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(para);
  }

  stream.appendChild(fragment);
  state.renderedCount = end;
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
  } else if (state.theme === 'theme-photoshop') {
    document.querySelectorAll('.ps-story-paragraph').forEach(p => p.classList.remove('active-paragraph'));
    const activeP = document.getElementById(`ps-story-para-${index}`);
    if (activeP) {
      activeP.classList.add('active-paragraph');
      if (scrollIntoView) {
        activeP.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (state.theme === 'theme-blender') {
    document.querySelectorAll('.blender-code-line').forEach(l => l.classList.remove('active-line'));
    const activeL = document.getElementById(`blender-story-line-${index}`);
    if (activeL) {
      activeL.classList.add('active-line');
      if (scrollIntoView) {
        activeL.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (state.theme === 'theme-linkedin') {
    document.querySelectorAll('.linkedin-post-card').forEach(c => c.classList.remove('active-post'));
    document.querySelectorAll('.ln-post-paragraph').forEach(p => p.classList.remove('active-paragraph'));

    const activePara = document.getElementById(`ln-para-${index}`);
    if (activePara) {
      activePara.classList.add('active-paragraph');
      const parentPost = activePara.closest('.linkedin-post-card');
      if (parentPost) {
        parentPost.classList.add('active-post');
      }
      if (scrollIntoView) {
        activePara.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // Fallback for legacy post if any
      const activePost = document.getElementById(`linkedin-post-${index}`);
      if (activePost) {
        activePost.classList.add('active-post');
        if (scrollIntoView) {
          activePost.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  } else if (state.theme === 'theme-googledocs') {
    document.querySelectorAll('.gdocs-story-paragraph').forEach(n => n.classList.remove('active-paragraph'));
    const activePara = document.getElementById(`gdocs-story-para-${index}`);
    if (activePara) {
      activePara.classList.add('active-paragraph');
      if (scrollIntoView) {
        activePara.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (state.theme === 'theme-autocad') {
    document.querySelectorAll('.cad-note-item').forEach(n => n.classList.remove('active-note'));
    const activeNote = document.getElementById(`autocad-note-${index}`);
    if (activeNote) {
      activeNote.classList.add('active-note');
      if (scrollIntoView) {
        activeNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (state.theme === 'theme-zalo') {
    document.querySelectorAll('.zalo-msg-item').forEach(m => m.classList.remove('active-msg'));
    const activeMsg = document.getElementById(`zalo-msg-${index}`);
    if (activeMsg) {
      activeMsg.classList.add('active-msg');
      if (scrollIntoView) {
        activeMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (state.theme === 'theme-figma') {
    document.querySelectorAll('.figma-layer-item').forEach(l => l.classList.remove('active-layer'));
    const activeLayer = document.getElementById(`figma-layer-${index}`);
    if (activeLayer) {
      activeLayer.classList.add('active-layer');
      if (scrollIntoView) {
        activeLayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (state.theme === 'theme-canva') {
    document.querySelectorAll('.canva-block-item').forEach(b => b.classList.remove('active-block'));
    const activeBlock = document.getElementById(`canva-block-${index}`);
    if (activeBlock) {
      activeBlock.classList.add('active-block');
      if (scrollIntoView) {
        activeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else if (state.theme === 'theme-powerpoint') {
    document.querySelectorAll('.ppt-para-item').forEach(p => p.classList.remove('active-bullet'));
    const activePara = document.getElementById(`ppt-para-${index}`);
    if (activePara) {
      activePara.classList.add('active-bullet');
      if (scrollIntoView) {
        activePara.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
      if (state.theme !== 'theme-googlesheets' && state.readingMode === 'formula') {
        formulaInput.value = `=PROSE("${storyText}")`;
      } else {
        formulaInput.value = storyText;
      }
    }

    const cellAddr = document.getElementById('active-cell-address');
    if (cellAddr) cellAddr.textContent = `D${index + 2}`;
  }

  updateReadingProgressStatus(index);
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
  const maxNavigablePage = state.isPdfProcessing ? state.loadedPages : state.totalPages;
  
  [
    'gs-page-indicator', 'gdocs-page-indicator', 'excel-page-indicator', 'vsc-page-indicator',
    'ps-page-indicator', 'blender-page-indicator', 'linkedin-page-indicator',
    'autocad-page-indicator', 'zalo-page-indicator', 'figma-page-indicator',
    'canva-page-indicator', 'ppt-page-indicator'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });

  ['gs-input-jump', 'gdocs-input-jump', 'excel-input-jump'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = state.currentPage;
      el.max = state.totalPages;
    }
  });

  [
    'gs-btn-prev', 'gdocs-btn-prev', 'excel-btn-prev', 'vsc-btn-prev',
    'ps-btn-prev', 'blender-btn-prev', 'linkedin-btn-prev',
    'autocad-btn-prev', 'zalo-btn-prev', 'figma-btn-prev',
    'canva-btn-prev', 'ppt-btn-prev'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = state.currentPage <= 1;
  });

  [
    'gs-btn-next', 'gdocs-btn-next', 'excel-btn-next', 'vsc-btn-next',
    'ps-btn-next', 'blender-btn-next', 'linkedin-btn-next',
    'autocad-btn-next', 'zalo-btn-next', 'figma-btn-next',
    'canva-btn-next', 'ppt-btn-next'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = state.currentPage >= maxNavigablePage;
  });
}

function goToPage(pageNum) {
  pageNum = parseInt(pageNum);
  if (isNaN(pageNum) || pageNum < 1 || pageNum > state.totalPages) return;

  const targetIdx = state.pageStartIndices[pageNum];
  if (targetIdx === undefined) {
    showPageFlipToast(`Trang ${pageNum} đang được xử lý. Thử lại sau ít giây.`);
    return;
  }

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

  const scrollContainers = [
    document.getElementById('grid-scroll-container'),
    document.getElementById('gdocs-canvas-scroll-container'),
    document.getElementById('vsc-code-scroll-container'),
    document.getElementById('ps-canvas-scroll-container'),
    document.getElementById('blender-viewport-scroll-container'),
    document.getElementById('linkedin-feed-scroll-container'),
    document.getElementById('autocad-canvas-scroll-container'),
    document.getElementById('zalo-chat-scroll-container'),
    document.getElementById('figma-canvas-scroll-container'),
    document.getElementById('canva-canvas-scroll-container'),
    document.getElementById('ppt-canvas-scroll-container'),
  ];
  scrollContainers.forEach(container => {
    if (container) {
      container.addEventListener('scroll', () => handleContainerScroll(container));
    }
  });
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

  [
    'gs-btn-autoscroll', 'gdocs-btn-autoscroll', 'excel-btn-autoscroll', 'vsc-btn-autoscroll',
    'ps-btn-autoscroll', 'blender-btn-autoscroll', 'linkedin-btn-autoscroll',
    'autocad-btn-autoscroll', 'zalo-btn-autoscroll', 'figma-btn-autoscroll',
    'canva-btn-autoscroll', 'ppt-btn-autoscroll'
  ].forEach(id => {
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

  [
    'gs-btn-autoscroll', 'gdocs-btn-autoscroll', 'excel-btn-autoscroll', 'vsc-btn-autoscroll',
    'ps-btn-autoscroll', 'blender-btn-autoscroll', 'linkedin-btn-autoscroll',
    'autocad-btn-autoscroll', 'zalo-btn-autoscroll', 'figma-btn-autoscroll',
    'canva-btn-autoscroll', 'ppt-btn-autoscroll'
  ].forEach(id => {
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
function showLoading(msg, detailMessage = 'Ứng dụng đang xử lý tài liệu. Vui lòng giữ trang này mở.') {
  const text = document.getElementById('loading-status-text');
  const spinner = document.getElementById('loading-spinner');
  if (text) text.textContent = msg;
  if (spinner) {
    let detail = spinner.querySelector('.loading-status-detail');
    if (!detail) {
      detail = document.createElement('p');
      detail.className = 'loading-status-detail';
      detail.setAttribute('role', 'status');
      spinner.querySelector('.loading-box')?.appendChild(detail);
    }
    if (detail) detail.textContent = detailMessage;
    spinner.style.display = 'flex';
  }
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

