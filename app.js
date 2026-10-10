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
  documentId: '',
  documentFileSize: 0,
  documentFileType: '',
  currentPage: 1,
  totalPages: 1,
  firstStoryPage: 1,
  loadedPages: 0,
  isPdfProcessing: false,
  pdfLoadToken: 0,
  
  // Continuous stream across entire document
  allChunks: [], // Array of { text, page, indexInPage, globalIndex }
  pageStartIndices: {}, // pageNum -> globalIndex
  documentToc: [], // Array of { title, page, globalIndex }
  searchResults: [],
  searchResultCursor: -1,
  
  // Progressive infinite rendering
  renderedCount: 0,
  BATCH_SIZE: 100, // Render 100 chunks at a time for silky 60fps performance
  currentGlobalIndex: 0,
  
  readingMode: 'grid', // 'grid' | 'formula'
  chunkMode: 'paragraph', // 'line' | 'paragraph' | 'sentence'
  layoutMode: 'exact', // 'exact' (giữ nguyên dòng gốc) | 'wrap' (tự co giãn) | 'custom' (cố định số chữ)
  maxCharsPerLine: 80,
  preserveIndents: true,
  compactBlankLines: false,
  rawText: '',
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
  wrapText: false,
  
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
  tvplTitle: localStorage.getItem('stealth_title_tvpl') || 'QUY ĐỊNH CHI TIẾT VỀ PHÁT TRIỂN CHUYỂN ĐỔI SỐ QUỐC GIA VÀ BẢO ĐẢM AN TOÀN DỮ LIỆU ĐIỆN TỬ',
  capcutTitle: localStorage.getItem('stealth_title_capcut') || 'CapCut Pro - Draft_Project_0928_Vlog',
  sapTitle: localStorage.getItem('stealth_title_sap') || 'Display Purchase Order 4500192834',
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
  "BÁO CÁO PHÂN TÍCH TỔNG QUAN CHIẾN DỊCH Q3 — TÀI LIỆU LƯU HÀNH NỘI BỘ",
  "Hệ thống ghi nhận toàn bộ tiến độ triển khai các hạng mục cơ sở dữ liệu và vận hành hệ thống chuyển đổi số toàn diện.",
  "Đội ngũ kỹ thuật đã hoàn tất quá trình đồng bộ hóa dữ liệu từ các chi nhánh trọng điểm về trung tâm điều hành.",
  "Các chỉ số hiệu suất trọng yếu (KPI) trong tháng vừa qua đều ghi nhận mức tăng trưởng vượt kỳ vọng so với kế hoạch ban đầu.",
  "Để đảm bảo tính liên tục của luồng công việc, các tài liệu hướng dẫn quy trình đã được cập nhật chi tiết trên cổng nội bộ.",
  "Mỗi chuyên viên cần chủ động theo dõi các mốc thời gian chuyển giao để phối hợp nhịp nhàng giữa các phòng ban chức năng.",
  "Hệ thống tự động kích hoạt chế độ sao lưu dự phòng định kỳ nhằm bảo vệ an toàn tuyệt đối cho kho dữ liệu doanh nghiệp.",
  "Trong giai đoạn tiếp theo, các buổi đánh giá chéo sẽ được tổ chức định kỳ vào mỗi sáng thứ Hai đầu tuần.",
  "Các kiến nghị cải tiến quy trình làm việc được khuyến khích gửi trực tiếp qua hệ thống khảo sát ý kiến trực tuyến.",
  "Trang 1 kết thúc tại đây, hệ thống sẵn sàng chuyển giao các luồng dữ liệu tiếp nối sang các phân đoạn kế tiếp.",
  "CHƯƠNG II: TIẾN TRÌNH TỐI ƯU HÓA QUY TRÌNH VẬN HÀNH & KIỂM SOÁT RỦI RO",
  "Việc tinh gọn các bước phê duyệt chứng từ đã giúp rút ngắn thời gian xử lý hồ sơ từ 48 giờ xuống còn dưới 12 giờ làm việc.",
  "Các phòng ban ghi nhận mức độ hài lòng của đối tác và khách hàng tăng lên rõ rệt sau khi áp dụng biểu mẫu số hóa mới.",
  "Hệ thống cảnh báo sớm rủi ro vận hành đã phát hiện và ngăn chặn kịp thời các xung đột tiềm ẩn trong luồng điều phối.",
  "Báo cáo kiểm toán độc lập đánh giá cao tính minh bạch và độ chính xác của các bảng cân đối dòng tiền phát sinh.",
  "Mọi sai lệch số liệu đều được truy vết tự động đến từng dấu mốc thời gian và định danh tài khoản thực hiện.",
  "Các trưởng bộ phận được phân quyền chủ động điều chỉnh kế hoạch phân bổ nguồn lực dựa trên dữ liệu thời gian thực.",
  "Các chương trình đào tạo kỹ năng nâng cao cho nhân sự nòng cốt đã được lên lịch chi tiết trong quý tới.",
  "Nguồn lực công nghệ thông tin tiếp tục được ưu tiên đầu tư để nâng cấp băng thông và năng lực xử lý máy chủ.",
  "Trang 2 hoàn tất đánh giá, các nhóm công tác bắt đầu triển khai các gói giải pháp trọng điểm theo lộ trình.",
  "CHƯƠNG III: ĐÁNH GIÁ CHỈ SỐ TĂNG TRƯỞNG & ĐỘT PHÁ CÔNG NGHỆ",
  "Ứng dụng trí tuệ nhân tạo và tự động hóa quy trình (RPA) đã mang lại hiệu quả vượt bậc trong việc xử lý dữ liệu lớn.",
  "Năng suất lao động trung bình của toàn khối văn phòng tăng 24.5% so với cùng kỳ năm trước.",
  "Các kênh tương tác trực tuyến ghi nhận lượng truy cập ổn định với tỷ lệ phản hồi thành công đạt trên 99.8%.",
  "Chiến lược đa nền tảng giúp mở rộng phạm vi tiếp cận đến đông đảo các nhóm khách hàng tiềm năng trên toàn quốc.",
  "Các giải pháp bảo mật nhiều lớp được thắt chặt để bảo vệ toàn vẹn tài sản số của tổ chức.",
  "Bản cập nhật giao diện người dùng mới nhận được nhiều phản hồi tích cực nhờ tính trực quan và dễ sử dụng.",
  "Đội ngũ hỗ trợ kỹ thuật duy trì trạng thái trực ban 24/7 nhằm đảm bảo hệ thống vận hành liên tục không gián đoạn.",
  "Kế hoạch mở rộng hạ tầng đám mây giai đoạn hai đã được phê duyệt và chuẩn bị bước vào giai đoạn đấu thầu.",
  "Trang 3 tổng kết các kết quả đột phá, mở ra tiền đề vững chắc cho các bước phát triển bứt phá trong tương lai.",
  "CHƯƠNG IV: QUẢN TRỊ NGUỒN NHÂN LỰC & XÂY DỰNG VĂN HÓA DOANH NGHIỆP",
  "Môi trường làm việc linh hoạt và sáng tạo là chìa khóa then chốt giúp thu hút và giữ chân các nhân tài hàng đầu.",
  "Chính sách đãi ngộ dựa trên hiệu suất thực tế đã tạo động lực mạnh mẽ cho các cá nhân và tập thể xuất sắc.",
  "Các hoạt động gắn kết nội bộ và chia sẻ tri thức được tổ chức thường xuyên nhằm nâng cao tinh thần đồng đội.",
  "Văn hóa học tập suốt đời được lan tỏa sâu rộng thông qua các khóa học trực tuyến miễn phí cho toàn thể cán bộ nhân viên.",
  "Công tác chăm sóc sức khỏe thể chất và tinh thần cho người lao động luôn được ban lãnh đạo đặt lên hàng đầu.",
  "Các sáng kiến cải tiến kỹ thuật từ cấp cơ sở đã giúp tiết kiệm hàng trăm triệu đồng chi phí vận hành mỗi năm.",
  "Sự phối hợp chặt chẽ giữa các khối nghiệp vụ và khối hỗ trợ tạo nên sức mạnh tổng hợp to lớn cho cả tổ chức.",
  "Mọi nỗ lực và đóng góp của từng thành viên đều được ghi nhận xứng đáng và tôn vinh kịp thời.",
  "Trang 4 khép lại phần đánh giá nhân sự, khẳng định yếu tố con người là tài sản quý giá nhất của tổ chức.",
  "CHƯƠNG V: KẾ HOẠCH HÀNH ĐỘNG CHIẾN LƯỢC & TẦM NHÌN DÀI HẠN",
  "Tập trung nguồn lực cao nhất để hoàn thành thắng lợi các mục tiêu sản xuất kinh doanh đã đề ra cho năm tài chính.",
  "Chủ động nắm bắt các xu hướng công nghệ mới nổi để đón đầu cơ hội và tạo lợi thế cạnh tranh bền vững.",
  "Mở rộng mạng lưới hợp tác chiến lược với các đối tác uy tín trong và ngoài nước nhằm gia tăng giá trị chuỗi cung ứng.",
  "Tăng cường công tác truyền thông thương hiệu và trách nhiệm xã hội của doanh nghiệp đối với cộng đồng.",
  "Đảm bảo tuân thủ nghiêm ngặt các quy định pháp luật hiện hành và các chuẩn mực đạo đức kinh doanh quốc tế.",
  "Hệ thống quản lý chất lượng toàn diện tiếp tục được hoàn thiện theo các tiêu chuẩn quốc tế mới nhất.",
  "Ban điều hành cam kết tạo mọi điều kiện thuận lợi nhất để các dự án trọng điểm về đích đúng tiến độ.",
  "Sự đoàn kết, đồng lòng và quyết tâm cao độ của toàn thể đội ngũ sẽ là bảo chứng vững chắc cho mọi thành công.",
  "Trang 5 hoàn thành bức tranh chiến lược tổng thể, sẵn sàng cho những bước tiến mạnh mẽ và vững chắc tiếp theo.",
  "CHƯƠNG VI: TỔNG KẾT & CHỈ ĐẠO TRIỂN KHAI CÁC NHIỆM VỤ TRỌNG TÂM",
  "Yêu cầu các đơn vị trực thuộc khẩn trương cụ thể hóa các mục tiêu chung thành chương trình hành động chi tiết.",
  "Thường xuyên kiểm tra, đôn đốc và đánh giá tiến độ thực hiện để kịp thời tháo gỡ các khó khăn, vướng mắc phát sinh.",
  "Phát huy tối đa tính chủ động, sáng tạo và tinh thần trách nhiệm của người đứng đầu từng bộ phận.",
  "Báo cáo kết quả thực hiện định kỳ gửi về văn phòng tổng hợp trước ngày 25 hàng tháng để theo dõi chung.",
  "Toàn thể cán bộ, nhân viên nêu cao tinh thần kỷ luật, kỷ cương và trách nhiệm trong thực thi nhiệm vụ được giao.",
  "Tin tưởng rằng với quyết tâm cao và sự nỗ lực không ngừng, chúng ta sẽ hoàn thành xuất sắc mọi chỉ tiêu đã đề ra.",
  "Văn bản này có hiệu lực kể từ ngày ký và được phổ biến rộng rãi đến toàn thể các đơn vị có liên quan.",
  "Lưu trữ: Văn thư tổng hợp, các phòng ban nghiệp vụ, cổng thông tin điện tử nội bộ.",
  "TÀI LIỆU ĐÃ ĐƯỢC KIỂM TRA VÀ PHÊ DUYỆT BỞI HỘI ĐỒNG THẨM ĐỊNH NỘI BỘ — HOÀN TẤT."
];

// Favicons for themes

// Multi-File Workspace Mapping & Navigation
const THEME_PAGES = {
  'theme-googlesheets': 'googlesheets.html',
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
  'theme-powerpoint': 'powerpoint.html',
  'theme-thuvienphapluat': 'thuvienphapluat.html',
  'theme-premiere': 'premiere.html',
  'theme-claude': 'claude.html',
  'theme-chatgpt': 'chatgpt.html',
  'theme-teams': 'teams.html',
  'theme-revit': 'revit.html',
  'theme-misa': 'misa.html',
  'theme-capcut': 'capcut.html',
  'theme-sap': 'sap.html',
  'theme-gmail': 'gmail.html',
  'theme-outlook': 'outlook.html'
};

// Single source of truth for per-page control id prefixes.
// Control ids follow the pattern `${prefix}-${suffix}` (e.g. 'vsc-btn-next').
// To add a theme, add its prefix here instead of editing every id list.
const THEME_CONTROL_PREFIXES = [
  'gs', 'gdocs', 'excel', 'vsc', 'ps', 'blender', 'linkedin',
  'autocad', 'zalo', 'figma', 'canva', 'ppt', 'tvpl', 'capcut', 'sap', 'gmail', 'outlook'
];

function themeControlIds(suffix) {
  return THEME_CONTROL_PREFIXES.map(prefix => `${prefix}-${suffix}`);
}

// Boss-key button ids use full theme names rather than the short prefixes above.
const BOSS_KEY_BUTTON_IDS = [
  'gsheet', 'gdocs', 'excel', 'vscode', 'photoshop', 'blender', 'linkedin',
  'autocad', 'zalo', 'figma', 'canva', 'powerpoint', 'thuvienphapluat',
  'premiere', 'claude', 'chatgpt', 'teams', 'revit', 'misa', 'capcut', 'sap'
].map(name => `btn-boss-key-${name}`);

const DOCUMENT_CACHE_DB_NAME = 'stealth_reader_cache';
const DOCUMENT_CACHE_STORE_NAME = 'documents';
const ACTIVE_DOCUMENT_CACHE_KEY = 'active-document';
const ACTIVE_DOCUMENT_SESSION_KEY = 'stealth_active_document_v2';
const READING_BOOKMARKS_STORAGE_KEY = 'stealth_reader_bookmarks_v1';
const HYBRID_SETTINGS_UPDATED_KEY = 'stealth_sync_settings_updated_v1';
const HYBRID_SETTINGS_SIGNATURE_KEY = 'stealth_sync_settings_signature_v1';
const MAX_SAVED_BOOKMARKS = 30;
let documentCacheWritePromise = Promise.resolve();
let activeDocumentWorker = null;
let activeDocumentAbortController = null;
let activePdfLoadingTask = null;
let lastFailedDocumentFile = null;
let previousDocumentSnapshot = null;
let textWorkerAvailabilityPromise = null;

function normalizeBookmarkEntry(raw, documentId = '') {
  if (!raw || typeof raw !== 'object') {
    return { documentId, documentName: '', lastPosition: null, marks: [], updatedAt: 0 };
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'lastPosition') || Array.isArray(raw.marks)) {
    return {
      documentId: raw.documentId || documentId,
      documentName: raw.documentName || '',
      lastPosition: raw.lastPosition && typeof raw.lastPosition === 'object' ? raw.lastPosition : null,
      marks: Array.isArray(raw.marks) ? raw.marks : [],
      updatedAt: Number(raw.updatedAt) || 0
    };
  }
  const legacyPosition = Number.isFinite(Number(raw.globalIndex)) ? {
    page: Number(raw.page) || 1,
    globalIndex: Number(raw.globalIndex) || 0,
    totalPages: Number(raw.totalPages) || 1,
    updatedAt: Number(raw.updatedAt) || 0
  } : null;
  return {
    documentId: raw.documentId || documentId,
    documentName: raw.documentName || '',
    lastPosition: legacyPosition,
    marks: [],
    updatedAt: Number(raw.updatedAt) || 0
  };
}

function hashDocumentIdentity(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function createLegacyDocumentId(file) {
  if (!file || !file.name) return '';
  return `file-${hashDocumentIdentity([
    file.name.trim().toLowerCase(),
    Number(file.size) || 0,
    Number(file.lastModified) || 0
  ].join('|'))}`;
}

async function createDocumentFingerprint(file) {
  if (!file || !file.name) return '';
  if (!window.crypto?.subtle || typeof file.slice !== 'function') return createLegacyDocumentId(file);
  try {
    const sampleSize = 1024 * 1024;
    const first = new Uint8Array(await file.slice(0, Math.min(sampleSize, file.size)).arrayBuffer());
    const lastStart = Math.max(first.byteLength, file.size - sampleSize);
    const last = new Uint8Array(await file.slice(lastStart, file.size).arrayBuffer());
    const metadata = new TextEncoder().encode(`${file.size}|${getDocumentExtension(file)}|`);
    const sample = new Uint8Array(metadata.byteLength + first.byteLength + last.byteLength);
    sample.set(metadata, 0);
    sample.set(first, metadata.byteLength);
    sample.set(last, metadata.byteLength + first.byteLength);
    const digest = await window.crypto.subtle.digest('SHA-256', sample);
    return `sha256-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
  } catch (error) {
    console.warn('Không thể tạo fingerprint SHA-256, dùng định danh local:', error);
    return createLegacyDocumentId(file);
  }
}

function getCurrentDocumentId() {
  if (state.documentId) return state.documentId;
  if (!state.pdfFileName || !state.allChunks.length) return '';

  const firstText = state.allChunks[0]?.text || '';
  const lastText = state.allChunks[state.allChunks.length - 1]?.text || '';
  return `cached-${hashDocumentIdentity([
    state.pdfFileName.trim().toLowerCase(),
    state.totalPages,
    state.allChunks.length,
    firstText.slice(0, 120),
    lastText.slice(-120)
  ].join('|'))}`;
}

function readSavedBookmarks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(READING_BOOKMARKS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn('Không thể đọc danh sách trang đã đánh dấu:', error);
    return {};
  }
}

function getCurrentBookmark() {
  const documentId = getCurrentDocumentId();
  if (!documentId) return null;
  const entry = normalizeBookmarkEntry(readSavedBookmarks()[documentId], documentId);
  return entry.lastPosition;
}

function saveCurrentBookmark(options = {}) {
  const { notify = false } = options;
  if (!hasLoadedDocument()) return false;
  if (state.isPdfProcessing && state.loadedPages === 0) return false;

  const documentId = getCurrentDocumentId();
  if (!documentId) return false;

  const globalIndex = Math.min(
    Math.max(0, Number(state.currentGlobalIndex) || 0),
    state.allChunks.length - 1
  );
  const page = state.allChunks[globalIndex]?.page || state.currentPage || 1;

  try {
    const bookmarks = readSavedBookmarks();
    const entry = normalizeBookmarkEntry(bookmarks[documentId], documentId);
    entry.documentId = documentId;
    entry.documentName = state.pdfFileName;
    entry.lastPosition = {
      page,
      globalIndex,
      totalPages: state.totalPages,
      updatedAt: Date.now()
    };
    entry.updatedAt = Date.now();
    bookmarks[documentId] = entry;

    const trimmedBookmarks = Object.fromEntries(
      Object.entries(bookmarks)
        .sort(([, left], [, right]) => (right.updatedAt || 0) - (left.updatedAt || 0))
        .slice(0, MAX_SAVED_BOOKMARKS)
    );
    localStorage.setItem(READING_BOOKMARKS_STORAGE_KEY, JSON.stringify(trimmedBookmarks));
    syncBookmarkButton();

    if (notify) {
      showPageFlipToast(`Đã đánh dấu <b>trang ${page}</b>, dòng ${globalIndex + 1}.`);
    }
    return true;
  } catch (error) {
    console.warn('Không thể lưu trang đánh dấu:', error);
    if (notify) showPageFlipToast('Không thể lưu trang đánh dấu trên trình duyệt này.');
    return false;
  }
}

function addManualBookmark(note = '') {
  if (!saveCurrentBookmark()) return false;
  const documentId = getCurrentDocumentId();
  const globalIndex = Math.min(Math.max(0, Number(state.currentGlobalIndex) || 0), state.allChunks.length - 1);
  const page = state.allChunks[globalIndex]?.page || state.currentPage || 1;
  try {
    const bookmarks = readSavedBookmarks();
    const entry = normalizeBookmarkEntry(bookmarks[documentId], documentId);
    const duplicate = entry.marks.find(mark => Number(mark.globalIndex) === globalIndex);
    if (duplicate) {
      duplicate.note = note.trim() || duplicate.note || `Trang ${page}, dòng ${globalIndex + 1}`;
      duplicate.updatedAt = Date.now();
    } else {
      entry.marks.unshift({
        id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        page,
        globalIndex,
        note: note.trim() || `Trang ${page}, dòng ${globalIndex + 1}`,
        excerpt: (state.allChunks[globalIndex]?.text || '').slice(0, 180),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      entry.marks = entry.marks.slice(0, 100);
    }
    entry.updatedAt = Date.now();
    bookmarks[documentId] = entry;
    localStorage.setItem(READING_BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    syncBookmarkButton();
    renderReaderToolsPanel('bookmarks');
    scheduleHybridSync();
    showPageFlipToast(`Đã thêm dấu trang tại <b>trang ${page}</b>.`);
    return true;
  } catch (error) {
    console.warn('Không thể thêm dấu trang:', error);
    showReaderError('Không thể lưu dấu trang', 'Trình duyệt đã từ chối ghi dữ liệu cục bộ.', error, 'Dấu trang');
    return false;
  }
}

function getSavedReadingPosition() {
  if (!state.allChunks.length) return null;
  const bookmark = getCurrentBookmark();
  if (!bookmark) return null;

  const requestedIndex = Math.max(0, Number(bookmark.globalIndex) || 0);
  if (state.isPdfProcessing && requestedIndex >= state.allChunks.length) return null;
  const globalIndex = Math.min(
    requestedIndex,
    state.allChunks.length - 1
  );
  return {
    globalIndex,
    page: state.allChunks[globalIndex]?.page || Number(bookmark.page) || 1
  };
}

function restoreSavedReadingPosition(notify = false) {
  const position = getSavedReadingPosition();
  if (!position) return false;

  state.currentGlobalIndex = position.globalIndex;
  state.currentPage = position.page;
  if (notify) {
    showPageFlipToast(`Đã mở lại tại <b>trang ${position.page}</b>, dòng ${position.globalIndex + 1}.`);
  }
  return true;
}

const hybridSyncState = {
  enabled: false,
  authenticated: false,
  csrfToken: '',
  user: null,
  pushTimer: null,
  pushing: false,
  pending: false
};

function getHybridSettingsValues() {
  return {
    theme: state.theme,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    fontFamily: state.fontFamily,
    readingMode: state.readingMode,
    autoScrollDelay: state.autoScrollDelay,
    textDimLevel: state.textDimLevel,
    layoutMode: state.layoutMode,
    chunkMode: state.chunkMode,
    maxCharsPerLine: state.maxCharsPerLine,
    preserveIndents: state.preserveIndents,
    compactBlankLines: state.compactBlankLines
  };
}

function updateHybridSettingsVersion() {
  const signature = JSON.stringify(getHybridSettingsValues());
  if (localStorage.getItem(HYBRID_SETTINGS_SIGNATURE_KEY) !== signature) {
    localStorage.setItem(HYBRID_SETTINGS_SIGNATURE_KEY, signature);
    localStorage.setItem(HYBRID_SETTINGS_UPDATED_KEY, String(Date.now()));
  }
}

function buildHybridSyncPayload() {
  const documentId = getCurrentDocumentId();
  if (!documentId || !state.pdfFileName || !state.allChunks.length) return null;
  const saved = readSavedBookmarks();
  const entry = normalizeBookmarkEntry(saved[documentId], documentId);
  const position = entry.lastPosition || {
    page: state.currentPage,
    globalIndex: state.currentGlobalIndex,
    totalPages: state.totalPages,
    updatedAt: Date.now()
  };
  const progressPercent = state.allChunks.length > 1
    ? (Math.max(0, Number(position.globalIndex) || 0) / (state.allChunks.length - 1)) * 100
    : 100;
  return {
    document: {
      documentId,
      title: state.pdfFileName,
      fileType: state.documentFileType || getDocumentExtension({ name: state.pdfFileName }),
      fileSize: Number(state.documentFileSize) || 0,
      pageCount: Number(state.totalPages) || 0,
      chapterCount: state.documentToc.length
    },
    progress: {
      location: {
        page: Number(position.page) || 1,
        globalIndex: Number(position.globalIndex) || 0,
        totalPages: Number(position.totalPages) || state.totalPages
      },
      progressPercent,
      updatedAt: Number(position.updatedAt) || Date.now()
    },
    bookmarks: entry.marks.map(mark => ({
      id: mark.id,
      location: { page: Number(mark.page) || 1, globalIndex: Number(mark.globalIndex) || 0 },
      label: mark.note || '',
      note: mark.note || '',
      excerpt: mark.excerpt || '',
      updatedAt: Number(mark.updatedAt || mark.createdAt) || Date.now()
    })),
    settings: {
      values: getHybridSettingsValues(),
      updatedAt: Number(localStorage.getItem(HYBRID_SETTINGS_UPDATED_KEY)) || Date.now()
    }
  };
}

function renderHybridAuthButton() {
  const button = document.getElementById('hybrid-auth-button');
  if (!button) return;
  button.style.display = 'inline-flex';
  button.classList.toggle('signed-in', hybridSyncState.authenticated);
  if (!hybridSyncState.authenticated) {
    button.innerHTML = '<span class="hybrid-google-mark">G</span><span>Đăng nhập Google</span>';
    button.title = hybridSyncState.enabled
      ? 'Đăng nhập Google để đồng bộ tiến độ và dấu trang'
      : 'Google Sync chưa được cấu hình trên server';
    button.classList.toggle('needs-setup', !hybridSyncState.enabled);
    return;
  }
  button.classList.remove('needs-setup');
  const name = hybridSyncState.user?.displayName || hybridSyncState.user?.email || 'Tài khoản';
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  button.innerHTML = `<span class="hybrid-user-avatar">${escapeHtml(initial)}</span><span class="hybrid-user-name">${escapeHtml(name)}</span>`;
  button.title = 'Đã đồng bộ với Google. Nhấn để đăng xuất.';
}

async function initializeHybridSync() {
  renderHybridAuthButton();
  try {
    const authButton = document.getElementById('hybrid-auth-button');
    if (authButton) authButton.addEventListener('click', handleHybridAuthClick, { once: false });
    const response = await fetch('/api/auth/status', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    hybridSyncState.enabled = Boolean(data.enabled);
    hybridSyncState.authenticated = Boolean(data.authenticated);
    hybridSyncState.csrfToken = data.csrfToken || '';
    hybridSyncState.user = data.user || null;
    renderHybridAuthButton();
    if (hybridSyncState.authenticated && getCurrentDocumentId()) await pullHybridDocument();
  } catch (error) {
    console.info('Đồng bộ cloud không khả dụng, tiếp tục dùng dữ liệu local.', error);
  }
}

async function handleHybridAuthClick() {
  if (!hybridSyncState.enabled) {
    window.alert('Google Login chưa được cấu hình trên server. Cần khai báo GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_SESSION_SECRET và thông tin MySQL trong cPanel.');
    return;
  }
  if (!hybridSyncState.authenticated) {
    const returnPath = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/api/auth/google/start?return=${encodeURIComponent(returnPath)}`;
    return;
  }
  if (!window.confirm('Đăng xuất tài khoản đồng bộ? File truyện và dữ liệu local vẫn được giữ trên máy này.')) return;
  const response = await fetch('/api/auth/logout', {
    method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': hybridSyncState.csrfToken }
  });
  if (response.ok) {
    hybridSyncState.authenticated = false;
    hybridSyncState.csrfToken = '';
    hybridSyncState.user = null;
    renderHybridAuthButton();
  }
}

function scheduleHybridSync(delay = 3000) {
  if (!hybridSyncState.authenticated) return;
  if (hybridSyncState.pushTimer) clearTimeout(hybridSyncState.pushTimer);
  hybridSyncState.pushTimer = setTimeout(() => pushHybridDocument(), delay);
}

async function pushHybridDocument(options = {}) {
  if (!hybridSyncState.authenticated) return false;
  const payload = buildHybridSyncPayload();
  if (!payload) return false;
  if (hybridSyncState.pushing) {
    hybridSyncState.pending = true;
    return false;
  }
  hybridSyncState.pushing = true;
  hybridSyncState.pending = false;
  try {
    const response = await fetch('/api/sync/document', {
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store',
      keepalive: Boolean(options.keepalive),
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': hybridSyncState.csrfToken },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) {
      hybridSyncState.authenticated = false;
      renderHybridAuthButton();
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  } catch (error) {
    console.warn('Chưa đồng bộ được, dữ liệu vẫn an toàn trên máy:', error);
    return false;
  } finally {
    hybridSyncState.pushing = false;
    if (hybridSyncState.pending) scheduleHybridSync(500);
  }
}

async function pullHybridDocument() {
  const documentId = getCurrentDocumentId();
  if (!hybridSyncState.authenticated || !documentId) return false;
  try {
    const response = await fetch(`/api/sync/document?documentId=${encodeURIComponent(documentId)}`, {
      credentials: 'same-origin', cache: 'no-store'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remote = await response.json();
    const all = readSavedBookmarks();
    const entry = normalizeBookmarkEntry(all[documentId], documentId);
    const remoteProgress = remote.progress;
    if (remoteProgress?.location && Number(remoteProgress.updatedAt) > Number(entry.lastPosition?.updatedAt || 0)) {
      entry.lastPosition = { ...remoteProgress.location, updatedAt: Number(remoteProgress.updatedAt) };
      entry.updatedAt = Number(remoteProgress.updatedAt);
    }
    const marks = new Map(entry.marks.map(mark => [mark.id, mark]));
    (remote.bookmarks || []).forEach(mark => {
      const existing = marks.get(mark.id);
      if (!existing || Number(mark.updatedAt) > Number(existing.updatedAt || existing.createdAt || 0)) {
        marks.set(mark.id, {
          id: mark.id,
          page: Number(mark.location?.page) || 1,
          globalIndex: Number(mark.location?.globalIndex) || 0,
          note: mark.note || mark.label || '',
          excerpt: mark.excerpt || '',
          createdAt: Number(mark.updatedAt) || Date.now(),
          updatedAt: Number(mark.updatedAt) || Date.now()
        });
      }
    });
    entry.marks = [...marks.values()].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)).slice(0, 100);
    all[documentId] = entry;
    localStorage.setItem(READING_BOOKMARKS_STORAGE_KEY, JSON.stringify(all));

    const remoteSettings = remote.settings;
    if (remoteSettings?.values && Number(remoteSettings.updatedAt) > Number(localStorage.getItem(HYBRID_SETTINGS_UPDATED_KEY) || 0)) {
      const allowed = ['fontSize', 'lineHeight', 'fontFamily', 'readingMode', 'autoScrollDelay', 'textDimLevel', 'layoutMode', 'chunkMode', 'maxCharsPerLine', 'preserveIndents', 'compactBlankLines'];
      allowed.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(remoteSettings.values, key)) state[key] = remoteSettings.values[key];
      });
      localStorage.setItem(HYBRID_SETTINGS_UPDATED_KEY, String(remoteSettings.updatedAt));
      localStorage.setItem(HYBRID_SETTINGS_SIGNATURE_KEY, JSON.stringify(getHybridSettingsValues()));
    }
    if (restoreSavedReadingPosition(false)) renderContinuousView(true, state.currentGlobalIndex);
    syncBookmarkButton();
    return true;
  } catch (error) {
    console.warn('Không tải được dữ liệu đồng bộ, tiếp tục dùng bản local:', error);
    return false;
  }
}

function getThemeForCurrentPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('googlesheets.html') || path.endsWith('sheets.html')) return 'theme-googlesheets';
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
  if (path.endsWith('premiere.html')) return 'theme-premiere';
  if (path.endsWith('claude.html')) return 'theme-claude';
  if (path.endsWith('chatgpt.html')) return 'theme-chatgpt';
  if (path.endsWith('teams.html')) return 'theme-teams';
  if (path.endsWith('revit.html')) return 'theme-revit';
  if (path.endsWith('misa.html')) return 'theme-misa';
  if (path.endsWith('capcut.html')) return 'theme-capcut';
  if (path.endsWith('sap.html')) return 'theme-sap';
  if (path.endsWith('gmail.html')) return 'theme-gmail';
  if (path.endsWith('outlook.html')) return 'theme-outlook';
  if (path.endsWith('thuvienphapluat.html') || path.endsWith('tvpl.html')) return 'theme-thuvienphapluat';
  if (path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html')) {
    return localStorage.getItem('selected_theme') || 'theme-googlesheets';
  }
  return 'theme-googlesheets';
}

function getFileForTheme(themeName) {
  return THEME_PAGES[themeName] || 'googlesheets.html';
}

async function navigateToThemePage(targetTheme) {
  state.theme = targetTheme;
  saveState();
  const currentTheme = getThemeForCurrentPage();
  const targetPage = getFileForTheme(targetTheme);
  await persistDocumentCache().catch(() => {});
  const isIndexPage = window.location.pathname.toLowerCase().endsWith('index.html') || window.location.pathname.endsWith('/') || !window.location.pathname.includes('.html');
  if (currentTheme !== targetTheme || isIndexPage) {
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
      const store = transaction.objectStore(DOCUMENT_CACHE_STORE_NAME);
      const documentRecordId = `document:${payload.documentId}`;
      store.put({ ...payload, id: documentRecordId });
      store.put({
        id: ACTIVE_DOCUMENT_CACHE_KEY,
        documentRecordId,
        documentId: payload.documentId,
        savedAt: payload.savedAt
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Không lưu được tài liệu.'));
      transaction.onabort = () => reject(transaction.error || new Error('Lưu tài liệu đã bị hủy.'));
    });
  } finally {
    database.close();
  }
}

async function setActiveDocumentCache(docId) {
  const database = await openDocumentCacheDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_CACHE_STORE_NAME);
      const documentRecordId = `document:${docId}`;
      store.put({
        id: ACTIVE_DOCUMENT_CACHE_KEY,
        documentRecordId,
        documentId: docId,
        savedAt: Date.now()
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Không thể cập nhật tài liệu hoạt động.'));
    });
  } finally {
    database.close();
  }
}

async function readDocumentCache() {
  const database = await openDocumentCacheDatabase();
  try {
    const active = await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(DOCUMENT_CACHE_STORE_NAME).get(ACTIVE_DOCUMENT_CACHE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Không đọc được tài liệu đã lưu.'));
    });
    if (!active || Array.isArray(active.chunks)) return active;
    if (!active.documentRecordId) return null;
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(DOCUMENT_CACHE_STORE_NAME).get(active.documentRecordId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Không đọc được tài liệu đang hoạt động.'));
    });
  } finally {
    database.close();
  }
}

async function listDocumentCaches() {
  const database = await openDocumentCacheDatabase();
  try {
    const records = await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(DOCUMENT_CACHE_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Không đọc được thư viện tài liệu.'));
    });
    const unique = new Map();
    records.forEach(record => {
      if (!record || !record.documentId || !isValidCachedDocument(record)) return;
      const existing = unique.get(record.documentId);
      if (!existing || (record.savedAt || 0) > (existing.savedAt || 0)) unique.set(record.documentId, record);
    });
    const getOrderTime = (r) => (r.createdAt || r.savedAt || 0);
    return [...unique.values()].sort((left, right) => getOrderTime(right) - getOrderTime(left));
  } finally {
    database.close();
  }
}

async function readDocumentCacheById(documentId) {
  const database = await openDocumentCacheDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(DOCUMENT_CACHE_STORE_NAME).get(`document:${documentId}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Không mở được tài liệu đã chọn.'));
    });
  } finally {
    database.close();
  }
}

async function deleteDocumentCache(documentId) {
  const database = await openDocumentCacheDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_CACHE_STORE_NAME, 'readwrite');
      transaction.objectStore(DOCUMENT_CACHE_STORE_NAME).delete(`document:${documentId}`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Không xóa được tài liệu.'));
    });
  } finally {
    database.close();
  }
}

function applyCachedDocument(cache) {
  if (!isValidCachedDocument(cache)) return false;

  const previousDocumentName = state.pdfFileName;
  state.allChunks = cache.chunks.map(chunk => ({
    ...chunk,
    text: cleanAndRepairVietnameseText(chunk.text || '')
  }));
  state.pageStartIndices = cache.pageStartIndices || {};
  state.documentToc = Array.isArray(cache.documentToc) ? cache.documentToc : [];
  state.totalPages = Math.max(1, Number(cache.totalPages) || 1);
  state.loadedPages = state.totalPages;
  state.isPdfProcessing = false;
  state.pdfFileName = cache.documentName || state.pdfFileName || '';
  state.documentId = cache.documentId || '';
  state.documentFileSize = Number(cache.fileSize) || 0;
  state.documentFileType = cache.fileType || getDocumentExtension({ name: state.pdfFileName });
  const canUseLegacyPosition = previousDocumentName === state.pdfFileName;
  const cachedPosition = Number.isFinite(Number(cache.currentGlobalIndex))
    ? Number(cache.currentGlobalIndex)
    : (canUseLegacyPosition ? state.currentGlobalIndex : 0);
  state.currentGlobalIndex = Math.min(
    Math.max(0, cachedPosition),
    state.allChunks.length - 1
  );
  state.currentPage = state.allChunks[state.currentGlobalIndex]?.page || 1;
  state.documentCreatedAt = cache.createdAt || cache.savedAt || Date.now();
  state.rawText = cache.rawText || state.allChunks.map(c => c.text).join('\n');
  restoreSavedReadingPosition(false);

  const univFileName = document.getElementById('univ-file-name');
  if (univFileName && state.pdfFileName) univFileName.textContent = state.pdfFileName;
  const portalNameLabel = document.getElementById('portal-pdf-filename');
  if (portalNameLabel && state.pdfFileName) portalNameLabel.textContent = state.pdfFileName;
  if (typeof updatePortalUploadUI === 'function') updatePortalUploadUI();
  return true;
}

function persistDocumentCache() {
  if (!state.allChunks || state.allChunks.length === 0 || !state.pdfFileName) {
    return Promise.resolve();
  }
  if (state.isPdfProcessing && state.loadedPages === 0) {
    return Promise.resolve();
  }

  const payload = {
    id: `document:${getCurrentDocumentId()}`,
    cacheVersion: 2,
    processingComplete: !state.isPdfProcessing,
    documentName: state.pdfFileName,
    documentId: getCurrentDocumentId(),
    fileSize: state.documentFileSize,
    fileType: state.documentFileType,
    chunks: state.allChunks,
    rawText: state.rawText || state.allChunks.map(c => c.text).join('\n'),
    pageStartIndices: state.pageStartIndices,
    documentToc: state.documentToc,
    totalPages: state.totalPages,
    currentPage: state.currentPage,
    currentGlobalIndex: state.currentGlobalIndex,
    createdAt: state.documentCreatedAt || Date.now(),
    savedAt: Date.now()
  };

  try {
    sessionStorage.setItem(ACTIVE_DOCUMENT_SESSION_KEY, JSON.stringify(payload));
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

function isSampleContent(chunks) {
  if (!Array.isArray(chunks) || chunks.length !== SAMPLE_STORY_CHUNKS.length) return false;
  const expectedFirst = cleanAndRepairVietnameseText(SAMPLE_STORY_CHUNKS[0]);
  const expectedLast = cleanAndRepairVietnameseText(SAMPLE_STORY_CHUNKS[SAMPLE_STORY_CHUNKS.length - 1]);
  return chunks[0]?.text === expectedFirst && chunks[chunks.length - 1]?.text === expectedLast;
}

function isValidCachedDocument(cache) {
  if (!cache || !Array.isArray(cache.chunks) || cache.chunks.length === 0) return false;
  if (!cache.documentName || !cache.documentId) return false;
  if (isSampleContent(cache.chunks)) {
    console.warn(`Bỏ qua cache lỗi của ${cache.documentName}: dữ liệu tài liệu trùng nội dung mẫu.`);
    return false;
  }
  return true;
}

function restoreChunksFromLegacySession() {
  try {
    const raw = sessionStorage.getItem('stealth_cached_chunks');
    if (raw) {
      const documentName = sessionStorage.getItem('stealth_cached_doc_name') || 'Tài liệu đã lưu';
      return applyCachedDocument({
        chunks: JSON.parse(raw),
        pageStartIndices: JSON.parse(sessionStorage.getItem('stealth_cached_page_indices') || '{}'),
        totalPages: parseInt(sessionStorage.getItem('stealth_cached_total_pages') || '1', 10),
        documentName,
        documentId: `legacy-${hashDocumentIdentity(documentName.toLowerCase())}`
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
  'theme-premiere': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2210%22%20fill%3D%22%2300005B%22/%3E%3Crect%20x%3D%222%22%20y%3D%222%22%20width%3D%2244%22%20height%3D%2244%22%20rx%3D%228%22%20fill%3D%22none%22%20stroke%3D%22%239999FF%22%20stroke-width%3D%222.5%22/%3E%3Cpath%20fill%3D%22%239999FF%22%20d%3D%22M11%2014h8c4.2%200%207%202.6%207%206.6s-2.8%206.6-7%206.6h-4.2V34H11V14zm3.8%209.8H19c2.2%200%203.4-1.3%203.4-3.2s-1.2-3.2-3.4-3.2h-4.2v6.4z%22/%3E%3Cpath%20fill%3D%22%239999FF%22%20d%3D%22M28.5%2019h3.5v2.6c.9-1.8%202.5-2.9%204.9-2.9v3.8c-3-.2-4.7%201.3-4.7%204.6V34h-3.7V19z%22/%3E%3C/svg%3E",
  'theme-claude': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2211%22%20fill%3D%22%23D97757%22/%3E%3Cg%20fill%3D%22%23FFFFFF%22%20transform%3D%22translate%2824%2024%29%22%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-15.75%22%20width%3D%223.57%22%20height%3D%2213.65%22%20rx%3D%221.78%22%20transform%3D%22rotate%287%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-12.60%22%20width%3D%223.57%22%20height%3D%2210.50%22%20rx%3D%221.78%22%20transform%3D%22rotate%2837%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-15.23%22%20width%3D%223.57%22%20height%3D%2213.13%22%20rx%3D%221.78%22%20transform%3D%22rotate%2867%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-11.55%22%20width%3D%223.57%22%20height%3D%229.45%22%20rx%3D%221.78%22%20transform%3D%22rotate%2897%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-16.28%22%20width%3D%223.57%22%20height%3D%2214.18%22%20rx%3D%221.78%22%20transform%3D%22rotate%28127%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-13.12%22%20width%3D%223.57%22%20height%3D%2211.03%22%20rx%3D%221.78%22%20transform%3D%22rotate%28157%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-14.70%22%20width%3D%223.57%22%20height%3D%2212.60%22%20rx%3D%221.78%22%20transform%3D%22rotate%28187%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-12.08%22%20width%3D%223.57%22%20height%3D%229.98%22%20rx%3D%221.78%22%20transform%3D%22rotate%28217%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-15.75%22%20width%3D%223.57%22%20height%3D%2213.65%22%20rx%3D%221.78%22%20transform%3D%22rotate%28247%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-12.60%22%20width%3D%223.57%22%20height%3D%2210.50%22%20rx%3D%221.78%22%20transform%3D%22rotate%28277%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-15.23%22%20width%3D%223.57%22%20height%3D%2213.13%22%20rx%3D%221.78%22%20transform%3D%22rotate%28307%29%22/%3E%3Crect%20x%3D%22-1.78%22%20y%3D%22-12.08%22%20width%3D%223.57%22%20height%3D%229.98%22%20rx%3D%221.78%22%20transform%3D%22rotate%28337%29%22/%3E%3C/g%3E%3C/svg%3E",
  'theme-chatgpt': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2211%22%20fill%3D%22%23000000%22/%3E%3Cg%20transform%3D%22translate%2810%2010%29%20scale%281.1667%29%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M22.2819%209.8211a5.9847%205.9847%200%200%200-.5157-4.9108%206.0462%206.0462%200%200%200-6.5098-2.9A6.0651%206.0651%200%200%200%204.9807%204.1818a5.9847%205.9847%200%200%200-3.9977%202.9%206.0462%206.0462%200%200%200%20.7427%207.0966%205.98%205.98%200%200%200%20.511%204.9107%206.051%206.051%200%200%200%206.5146%202.9001A5.9847%205.9847%200%200%200%2013.2599%2024a6.0557%206.0557%200%200%200%205.7718-4.2058%205.9894%205.9894%200%200%200%203.9977-2.9001%206.0557%206.0557%200%200%200-.7475-7.0729zm-9.022%2012.6081a4.4755%204.4755%200%200%201-2.8764-1.0408l.1419-.0804%204.7783-2.7582a.7948.7948%200%200%200%20.3927-.6813v-6.7369l2.02%201.1686a.071.071%200%200%201%20.038.052v5.5826a4.504%204.504%200%200%201-4.4945%204.4944zm-9.6607-4.1254a4.4708%204.4708%200%200%201-.5346-3.0137l.142.0852%204.783%202.7582a.7712.7712%200%200%200%20.7806%200l5.8428-3.3685v2.3324a.0804.0804%200%200%201-.0332.0615L9.74%2019.9502a4.4992%204.4992%200%200%201-6.1408-1.6464zM2.3408%207.8956a4.485%204.485%200%200%201%202.3655-1.9728V11.6a.7664.7664%200%200%200%20.3879.6765l5.8144%203.3543-2.0201%201.1685a.0757.0757%200%200%201-.071%200l-4.8303-2.7865A4.504%204.504%200%200%201%202.3408%207.872zm16.5963%203.8558L13.1038%208.364%2015.1192%207.2a.0757.0757%200%200%201%20.071%200l4.8303%202.7913a4.4944%204.4944%200%200%201-.6765%208.1042v-5.6772a.79.79%200%200%200-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759%200%200%200-.7854%200L9.409%209.2297V6.8974a.0662.0662%200%200%201%20.0284-.0615l4.8303-2.7866a4.4992%204.4992%200%200%201%206.6802%204.66zM8.3065%2012.863l-2.02-1.1638a.0804.0804%200%200%201-.038-.0567V6.0742a4.4992%204.4992%200%200%201%207.3757-3.4537l-.142.0805L8.704%205.459a.7948.7948%200%200%200-.3927.6813zm1.0976-2.3654l2.602-1.4998%202.6069%201.4998v2.9994l-2.5974%201.4997-2.6067-1.4997Z%22/%3E%3C/g%3E%3C/svg%3E",
  'theme-googlesheets': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cpath%20fill%3D%22%230F9D58%22%20d%3D%22M37%2045H11c-2.2%200-4-1.8-4-4V7c0-2.2%201.8-4%204-4h18l12%2012v26c0%202.2-1.8%204-4%204z%22/%3E%20%3Cpath%20fill%3D%22%2387CEAC%22%20d%3D%22M29%203l12%2012H29V3z%22/%3E%20%3Cpath%20fill%3D%22%230B8043%22%20d%3D%22M29%2015h12l-12-12v12z%22%20opacity%3D%220.2%22/%3E%20%3Crect%20fill%3D%22%23FFFFFF%22%20x%3D%2214%22%20y%3D%2221%22%20width%3D%2220%22%20height%3D%2218%22%20rx%3D%221.5%22/%3E%20%3Cpath%20fill%3D%22%230F9D58%22%20d%3D%22M14%2026.5h20v2H14zm0%205.5h20v2H14zm8-11h2.5v18H22z%22/%3E%20%3C/svg%3E",
  'theme-googledocs': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cpath%20fill%3D%22%234285F4%22%20d%3D%22M37%2045H11c-2.2%200-4-1.8-4-4V7c0-2.2%201.8-4%204-4h18l12%2012v26c0%202.2-1.8%204-4%204z%22/%3E%20%3Cpath%20fill%3D%22%23A1C2FA%22%20d%3D%22M29%203l12%2012H29V3z%22/%3E%20%3Cpath%20fill%3D%22%231A73E8%22%20d%3D%22M29%2015h12l-12-12v12z%22%20opacity%3D%220.2%22/%3E%20%3Crect%20fill%3D%22%23FFFFFF%22%20x%3D%2214%22%20y%3D%2222%22%20width%3D%2220%22%20height%3D%222.5%22%20rx%3D%221.25%22/%3E%20%3Crect%20fill%3D%22%23FFFFFF%22%20x%3D%2214%22%20y%3D%2227.5%22%20width%3D%2220%22%20height%3D%222.5%22%20rx%3D%221.25%22/%3E%20%3Crect%20fill%3D%22%23FFFFFF%22%20x%3D%2214%22%20y%3D%2233%22%20width%3D%2213%22%20height%3D%222.5%22%20rx%3D%221.25%22/%3E%20%3C/svg%3E",
  'theme-excel': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D%22ex-g1%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23107C41%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230B552C%22/%3E%3C/linearGradient%3E%20%3ClinearGradient%20id%3D%22ex-g2%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2321A366%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23107C41%22/%3E%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20x%3D%2215%22%20y%3D%227%22%20width%3D%2227%22%20height%3D%2234%22%20rx%3D%224%22%20fill%3D%22url%28%23ex-g1%29%22/%3E%20%3Crect%20x%3D%2221%22%20y%3D%2213%22%20width%3D%2215%22%20height%3D%2222%22%20rx%3D%221%22%20fill%3D%22%23FFFFFF%22%20opacity%3D%220.15%22/%3E%20%3Cpath%20d%3D%22M21%2019h15M21%2025h15M21%2030h15M28%2013v22%22%20stroke%3D%22%23FFFFFF%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.9%22/%3E%20%3Crect%20x%3D%226%22%20y%3D%2211%22%20width%3D%2221%22%20height%3D%2226%22%20rx%3D%224%22%20fill%3D%22url%28%23ex-g2%29%22%20filter%3D%22drop-shadow%280%203px%206px%20rgba%280%2C0%2C0%2C0.35%29%29%22/%3E%20%3Cpath%20d%3D%22M11.5%2018l4.8%206-4.8%206h3.2l3.2-4.4%203.2%204.4h3.2l-4.8-6%204.8-6h-3.2l-3.2%204.4-3.2-4.4h-3.2z%22%20fill%3D%22%23FFFFFF%22/%3E%20%3C/svg%3E",
  'theme-vscode': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cpath%20fill%3D%22%230065A9%22%20d%3D%22M35.2%2045.3L44.8%2040.5c1.4-.7%202.2-2.1%202.2-3.6V11.1c0-1.5-.8-2.9-2.2-3.6L35.2%202.7c-1.2-.6-2.6-.4-3.5.5L16.2%2016.5l-7.4-5.6c-.9-.7-2.1-.7-3%20.1L1.6%2014.3c-.9.8-1.1%202.1-.5%203.1l6.7%209.8-6.7%209.8c-.6%201-.4%202.3.5%203.1l4.2%203.3c.9.8%202.1.8%203%20.1l7.4-5.6%2015.5%2013.3c.9.9%202.3%201.1%203.5.5z%22/%3E%20%3Cpath%20fill%3D%22%23007ACC%22%20d%3D%22M35.2%202.7c-1.2-.6-2.6-.4-3.5.5L16.2%2016.5l8.5%207.5L37%2012V4.5l-1.8-1.8z%22/%3E%20%3Cpath%20fill%3D%22%231F9CF0%22%20d%3D%22M35.2%2045.3c-1.2.6-2.6.4-3.5-.5L16.2%2031.5l8.5-7.5L37%2036v7.5l-1.8%201.8z%22/%3E%20%3Cpath%20fill%3D%22%23005B9E%22%20opacity%3D%220.3%22%20d%3D%22M24.7%2024L37%2012v24L24.7%2024z%22/%3E%20%3C/svg%3E",
  'theme-photoshop': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2210%22%20fill%3D%22%23001E36%22/%3E%20%3Crect%20x%3D%222%22%20y%3D%222%22%20width%3D%2244%22%20height%3D%2244%22%20rx%3D%228%22%20stroke%3D%22%2331A8FF%22%20stroke-width%3D%222.5%22%20fill%3D%22none%22/%3E%20%3Cpath%20d%3D%22M13%2014h8c4.2%200%207%202.6%207%206.6s-2.8%206.6-7%206.6h-4.2V34H13V14zm3.8%209.8H21c2.2%200%203.4-1.3%203.4-3.2s-1.2-3.2-3.4-3.2h-4.2v6.4z%22%20fill%3D%22%2331A8FF%22/%3E%20%3Cpath%20d%3D%22M28.8%2029.6c1.2%201.4%203%202.2%205.2%202.2%202.2%200%203.6-1.1%203.6-2.7%200-3.6-8.2-2.6-8.2-8.8%200-3.3%202.8-5.5%206.8-5.5%202.8%200%205%201.1%206.2%202.7l-2.4%202.2c-.9-1.2-2.2-1.9-3.8-1.9-1.9%200-3%201-3%202.1%200%203.3%208.2%202.4%208.2%208.7%200%203.6-2.9%205.8-7.2%205.8-3.4%200-6.1-1.3-7.5-3.3l2.3-2.3z%22%20fill%3D%22%2331A8FF%22/%3E%20%3C/svg%3E",
  'theme-blender': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2224%22%20r%3D%2222%22%20fill%3D%22%23222222%22/%3E%20%3Cpath%20d%3D%22M24%206c1.2%200%202.2%201%202.2%202.2v9.6c0%201.2-1%202.2-2.2%202.2s-2.2-1-2.2-2.2V8.2c0-1.2%201-2.2%202.2-2.2zm-12.7%205.2c.9-.9%202.3-.9%203.1%200l6.8%206.8c.9.9.9%202.3%200%203.1s-2.3.9-3.1%200l-6.8-6.8c-.9-.8-.9-2.2%200-3.1zm25.4%200c.9.9.9%202.3%200%203.1l-6.8%206.8c-.9.9-2.3.9-3.1%200s-.9-2.3%200-3.1l6.8-6.8c.8-.9%202.2-.9%203.1%200z%22%20fill%3D%22%23EA7600%22/%3E%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2228%22%20r%3D%2212%22%20fill%3D%22%23EA7600%22/%3E%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2228%22%20r%3D%226%22%20fill%3D%22%2322578A%22/%3E%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2228%22%20r%3D%222.8%22%20fill%3D%22%23FFFFFF%22/%3E%20%3C/svg%3E",
  'theme-linkedin': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2210%22%20fill%3D%22%230A66C2%22/%3E%20%3Ccircle%20cx%3D%2215.5%22%20cy%3D%2214.5%22%20r%3D%223.2%22%20fill%3D%22%23FFFFFF%22/%3E%20%3Crect%20x%3D%2212.5%22%20y%3D%2220%22%20width%3D%226%22%20height%3D%2215%22%20rx%3D%221%22%20fill%3D%22%23FFFFFF%22/%3E%20%3Cpath%20d%3D%22M23%2020h5.5v2.3h.1c.8-1.5%202.8-2.8%205.6-2.8%205.8%200%207%203.8%207%208.8V35h-6v-7.8c0-2.2-.1-4.2-2.8-4.2s-3.2%202.1-3.2%204.2V35H23V20z%22%20fill%3D%22%23FFFFFF%22/%3E%20%3C/svg%3E",
  'theme-autocad': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2210%22%20fill%3D%22%231C1E24%22/%3E%20%3Cpath%20d%3D%22M24%206L8%2038h9l4-9h10l-5-11-2-12z%22%20fill%3D%22%23E51937%22/%3E%20%3Cpath%20d%3D%22M24%206l9%2018H23l1-18z%22%20fill%3D%22%23FF334B%22/%3E%20%3Cpath%20d%3D%22M33%2024l7%2014h-9l-4-9%206-5z%22%20fill%3D%22%23B81126%22/%3E%20%3Cpath%20d%3D%22M21%2029h10l3%206H18l3-6z%22%20fill%3D%22%23800A18%22/%3E%20%3C/svg%3E",
  'theme-zalo': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D%22zg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230091FF%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230058E6%22/%3E%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2212%22%20fill%3D%22url%28%23zg%29%22/%3E%20%3Cpath%20d%3D%22M12%2018h9L13%2028h8.5v2.8H10.5l8-10H12V18zm13%203.5c0-2%201.5-3.5%203.8-3.5s3.8%201.5%203.8%203.5v8.3h-2.5V28c-.6%201-1.8%201.8-3.2%201.8-2.2%200-3.8-1.5-3.8-3.6%200-2.2%201.6-3.6%203.8-3.6h1.9v-.7c0-.9-.7-1.5-1.7-1.5s-1.7.6-1.7%201.5H25zm5%204.5h-1.6c-1%200-1.8.6-1.8%201.6s.8%201.6%201.8%201.6%201.6-.6%201.6-1.6V26zm3.5-7.5H36v12.3h-2.5V18.5zm5%204.5c0-2.8%202-4.8%204.8-4.8s4.8%202%204.8%204.8-2%204.8-4.8%204.8-4.8-2-4.8-4.8zm7%200c0-1.5-.9-2.6-2.2-2.6s-2.2%201.1-2.2%202.6.9%202.6%202.2%202.6%202.2-1.1%202.2-2.6z%22%20fill%3D%22%23FFFFFF%22/%3E%20%3C/svg%3E",
  'theme-figma': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2210%22%20fill%3D%22%2318181B%22/%3E%20%3Cg%20transform%3D%22translate%2810%2C%205%29%20scale%280.74%29%22%3E%20%3Cpath%20d%3D%22M19%2028.5C19%2023.3%2023.3%2019%2028.5%2019C33.7%2019%2038%2023.3%2038%2028.5C38%2033.7%2033.7%2038%2028.5%2038C23.3%2038%2019%2033.7%2019%2028.5Z%22%20fill%3D%22%231ABCFE%22/%3E%20%3Cpath%20d%3D%22M0%2047.5C0%2042.3%204.3%2038%209.5%2038H19V47.5C19%2052.7%2014.7%2057%209.5%2057C4.3%2057%200%2052.7%200%2047.5Z%22%20fill%3D%22%230ACF83%22/%3E%20%3Cpath%20d%3D%22M19%200V19H28.5C33.7%2019%2038%2014.7%2038%209.5C38%204.3%2033.7%200%2028.5%200H19Z%22%20fill%3D%22%23FF7262%22/%3E%20%3Cpath%20d%3D%22M0%209.5C0%2014.7%204.3%2019%209.5%2019H19V0H9.5C4.3%200%200%204.3%200%209.5Z%22%20fill%3D%22%23F24E1E%22/%3E%20%3Cpath%20d%3D%22M0%2028.5C0%2033.7%204.3%2038%209.5%2038H19V19H9.5C4.3%2019%200%2023.3%200%2028.5Z%22%20fill%3D%22%23A259FF%22/%3E%20%3C/g%3E%20%3C/svg%3E",
  'theme-canva': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D%22canva-g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2300C4CC%22/%3E%20%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%233A88E9%22/%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%237D2AE8%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2224%22%20r%3D%2222%22%20fill%3D%22url%28%23canva-g%29%22/%3E%20%3Cpath%20d%3D%22M30%2016.5c-3.2%200-6.8%201.8-9.2%204.8-2.6%203.2-3.8%207.5-3.8%2011.2%200%204.2%202.6%206.5%206.5%206.5%203.8%200%206.6-2.2%208.2-4.5l-2.6-2.2c-1.2%201.5-3.2%203.1-5.2%203.1-2.2%200-3.5-1.5-3.5-4.2%200-3.2%201.2-7%203.2-9.6%201.8-2.2%204.2-3.5%206.4-3.5%202.1%200%203.2%201%203.2%202.6%200%201.2-.6%202.2-1.8%202.8-1.5.8-3.2%201-5.2%201.2l-1.2.1c-.2%201.2-.3%202.5-.3%203.6%200%201.5.3%202.8.8%203.8l2.8-.4c-.4-.8-.6-1.8-.6-2.8%200-.8.1-1.6.2-2.4%201.8-.2%203.6-.5%205.1-1.5%202-1.2%203-2.8%203-4.8%200-2.8-2.2-4.4-5.6-4.4z%22%20fill%3D%22%23FFFFFF%22/%3E%20%3C/svg%3E",
  'theme-powerpoint': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D%22ppt-g1%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23D24726%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%239C2C12%22/%3E%3C/linearGradient%3E%20%3ClinearGradient%20id%3D%22ppt-g2%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23FA8060%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23D24726%22/%3E%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20x%3D%2215%22%20y%3D%227%22%20width%3D%2227%22%20height%3D%2234%22%20rx%3D%224%22%20fill%3D%22url%28%23ppt-g1%29%22/%3E%20%3Ccircle%20cx%3D%2228.5%22%20cy%3D%2224%22%20r%3D%228.5%22%20fill%3D%22%23FFFFFF%22%20opacity%3D%220.2%22/%3E%20%3Cpath%20d%3D%22M28.5%2015.5V24H37A8.5%208.5%200%200%200%2028.5%2015.5z%22%20fill%3D%22%23FFFFFF%22%20opacity%3D%220.9%22/%3E%20%3Crect%20x%3D%226%22%20y%3D%2211%22%20width%3D%2221%22%20height%3D%2226%22%20rx%3D%224%22%20fill%3D%22url%28%23ppt-g2%29%22%20filter%3D%22drop-shadow%280%203px%206px%20rgba%280%2C0%2C0%2C0.35%29%29%22/%3E%20%3Cpath%20d%3D%22M12%2017h6c2.8%200%204.8%201.8%204.8%204.5s-2%204.5-4.8%204.5h-2.8V31H12V17zm3.2%206.2h2.6c1.2%200%202-.7%202-1.7s-.8-1.7-2-1.7h-2.6v3.4z%22%20fill%3D%22%23FFFFFF%22/%3E%20%3C/svg%3E",
  'theme-thuvienphapluat': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D%22tvpl-g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23990000%22/%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23660000%22/%3E%20%3C/linearGradient%3E%20%3ClinearGradient%20id%3D%22tvpl-gold%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23FFDF73%22/%3E%20%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%23D4AF37%22/%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23AA820A%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2210%22%20fill%3D%22url%28%23tvpl-g%29%22/%3E%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2224%22%20r%3D%2220%22%20stroke%3D%22url%28%23tvpl-gold%29%22%20stroke-width%3D%221.8%22%20fill%3D%22none%22/%3E%20%3Ccircle%20cx%3D%2224%22%20cy%3D%2211.5%22%20r%3D%222.2%22%20fill%3D%22url%28%23tvpl-gold%29%22/%3E%20%3Cpath%20d%3D%22M24%2011v26M18%2037h12M12%2017h24%22%20stroke%3D%22url%28%23tvpl-gold%29%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22/%3E%20%3Cpath%20d%3D%22M12%2017l-5%209h10l-5-9z%22%20fill%3D%22url%28%23tvpl-gold%29%22%20opacity%3D%220.35%22/%3E%20%3Cpath%20d%3D%22M12%2017l-5%209M12%2017l5%209M7%2026c0%202.5%2010%202.5%2010%200%22%20stroke%3D%22url%28%23tvpl-gold%29%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22/%3E%20%3Cpath%20d%3D%22M36%2017l-5%209h10l-5-9z%22%20fill%3D%22url%28%23tvpl-gold%29%22%20opacity%3D%220.35%22/%3E%20%3Cpath%20d%3D%22M36%2017l-5%209M36%2017l5%209M31%2026c0%202.5%2010%202.5%2010%200%22%20stroke%3D%22url%28%23tvpl-gold%29%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22/%3E%20%3C/svg%3E",
  'theme-teams': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2210%22%20fill%3D%22%23464EB8%22/%3E%3Ccircle%20cx%3D%2233%22%20cy%3D%2217%22%20r%3D%225%22%20fill%3D%22%237B83EB%22/%3E%3Cpath%20d%3D%22M25%2031c0-4.4%203.6-8%208-8s8%203.6%208%208v2H25v-2z%22%20fill%3D%22%237B83EB%22/%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2215%22%20r%3D%227%22%20fill%3D%22%23FFFFFF%22/%3E%3Cpath%20d%3D%22M9%2034c0-6%205-11%2011-11s11%205%2011%2011v2H9v-2z%22%20fill%3D%22%23FFFFFF%22/%3E%3C/svg%3E",
  'theme-revit': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%227%22%20fill%3D%22%23005A9C%22/%3E%3Cpath%20d%3D%22M12%209H26C31.5%209%2035.5%2012.8%2035.5%2018C35.5%2021.8%2032.8%2024.8%2028.5%2026.2L36%2039H28L21.5%2027.5H18V39H12V9ZM18%2022H25C27.5%2022%2029.5%2020.5%2029.5%2018C29.5%2015.5%2027.5%2014%2025%2014H18V22Z%22%20fill%3D%22white%22/%3E%3Cpath%20d%3D%22M22%2027.5L28.5%2039H35L27%2027.5H22Z%22%20fill%3D%22%2378C2F5%22/%3E%3C/svg%3E",
  'theme-misa': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Cpath%20d%3D%22M24%203L38%2017L28%2024L24%2016L20%2024L10%2017L24%203Z%22%20fill%3D%22%23E51937%22/%3E%3Cpath%20d%3D%22M45%2024L31%2038L24%2028L32%2024L24%2020L31%2010L45%2024Z%22%20fill%3D%22%23FF9800%22/%3E%3Cpath%20d%3D%22M24%2045L10%2031L20%2024L24%2032L28%2024L38%2031L24%2045Z%22%20fill%3D%22%231976D2%22/%3E%3Cpath%20d%3D%22M3%2024L17%2010L24%2020L16%2024L24%2028L17%2038L3%2024Z%22%20fill%3D%22%234CAF50%22/%3E%3Ccircle%20cx%3D%2224%22%20cy%3D%2224%22%20r%3D%225%22%20fill%3D%22%23FFFFFF%22/%3E%3C/svg%3E",
  'theme-capcut': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%2212%22%20fill%3D%22%23000000%22/%3E%3Cpath%20d%3D%22M10%2014L22%2022V26L10%2034V14Z%22%20fill%3D%22%2300F2FE%22/%3E%3Cpath%20d%3D%22M38%2014L26%2022V26L38%2034V14Z%22%20fill%3D%22%23FFFFFF%22/%3E%3C/svg%3E",
  'theme-sap': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20width%3D%2248%22%20height%3D%2248%22%20rx%3D%228%22%20fill%3D%22%2300386B%22/%3E%3Cpath%20d%3D%22M10%2012h28l-8%2024H2l8-24z%22%20fill%3D%22%23007DB8%22/%3E%3Ctext%20x%3D%2224%22%20y%3D%2231%22%20fill%3D%22%23FFFFFF%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20letter-spacing%3D%221%22%3ESAP%3C/text%3E%3C/svg%3E",
  'theme-gmail': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Cpath%20fill%3D%22%234285F4%22%20d%3D%22M4.5%2038.5V13.8L24%2027.5l19.5-13.7v24.7c0%202.2-1.8%204-4%204H8.5c-2.2%200-4-1.8-4-4z%22/%3E%3Cpath%20fill%3D%22%2334A853%22%20d%3D%22M43.5%2013.8v24.7c0%202.2-1.8%204-4%204h-5V20.5l9-6.7z%22/%3E%3Cpath%20fill%3D%22%234285F4%22%20d%3D%22M4.5%2013.8v24.7c0%202.2%201.8%204%204%204h5V20.5l-9-6.7z%22/%3E%3Cpath%20fill%3D%22%23EA4335%22%20d%3D%22M13.5%205.5L24%2014.5l10.5-9h-21z%22/%3E%3Cpath%20fill%3D%22%23FBBC05%22%20d%3D%22M4.5%209.5C4.5%207.3%206.3%205.5%208.5%205.5h5l-9%208.3v-4.3z%22/%3E%3Cpath%20fill%3D%22%23C5221F%22%20d%3D%22M43.5%209.5c0-2.2-1.8-4-4-4h-5l9%208.3v-4.3z%22/%3E%3Cpath%20fill%3D%22%23EA4335%22%20d%3D%22M4.5%2013.8L24%2027.5%2043.5%2013.8%2024%2029%204.5%2013.8z%22/%3E%3C/svg%3E",
  'theme-outlook': "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Crect%20x%3D%2214%22%20y%3D%228%22%20width%3D%2228%22%20height%3D%2232%22%20rx%3D%224%22%20fill%3D%22%230078D4%22/%3E%3Cpath%20d%3D%22M14%2014l14%2010%2014-10v22a4%204%200%200%201-4%204H18a4%204%200%200%201-4-4V14z%22%20fill%3D%22%2328A8EA%22%20opacity%3D%220.6%22/%3E%3Cpath%20d%3D%22M14%2014l14%2010%2014-10%22%20fill%3D%22none%22%20stroke%3D%22%23FFFFFF%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3Crect%20x%3D%226%22%20y%3D%2212%22%20width%3D%2222%22%20height%3D%2224%22%20rx%3D%224%22%20fill%3D%22%23005A9E%22/%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2224%22%20r%3D%226.5%22%20fill%3D%22none%22%20stroke%3D%22%23FFFFFF%22%20stroke-width%3D%223.2%22/%3E%3C/svg%3E",
};

// ==========================================================
// INITIALIZATION
// ==========================================================

// ==========================================================
// GOOGLE FORM FEEDBACK & SHEET PROGRESS CONFIGURATION
// ==========================================================
// Dán link Google Form (forms.gle/... hoặc docs.google.com/forms/...) vào đây:
const CONFIG_FEEDBACK_FORM_URL = 'https://forms.gle/YxPd6zRZEeyQ3z3e8';

// Dán link Google Sheets theo dõi tiến độ cập nhật vào đây:
const CONFIG_PROGRESS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/126sjvPWcDbwGrtrObHFdcCZ1KzQ7cfeaTozgfyESHOA/edit?gid=1898748271#gid=1898748271';

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

function getProgressSheetUrl() {
  const saved = localStorage.getItem('stealth_progress_sheet_url');
  if (saved && saved.startsWith('http')) {
    return saved;
  }
  return CONFIG_PROGRESS_SHEET_URL;
}

function openProgressSheet() {
  const url = getProgressSheetUrl();
  window.open(url, '_blank', 'noopener,noreferrer');
}

function configProgressSheetUrl() {
  const current = getProgressSheetUrl();
  const input = prompt('Nhập đường link Google Sheets theo dõi tiến độ cập nhật:\n(Ví dụ: https://docs.google.com/spreadsheets/d/...)', current);
  if (input !== null && input.trim()) {
    const cleanUrl = input.trim();
    localStorage.setItem('stealth_progress_sheet_url', cleanUrl);
    showPageFlipToast(`Đã lưu link Google Sheets tiến độ: <b>${escapeHtml(cleanUrl)}</b>`);
  }
}

function initFeedbackListeners() {
  document.querySelectorAll(
    '#btn-open-feedback-nav, #btn-open-feedback-portal, #btn-open-feedback-updates, #btn-open-feedback-settings, .duo-btn-feedback-nav, .portal-link-feedback, .duo-btn-feedback'
  ).forEach(btn => {
    btn.addEventListener('click', openFeedbackForm);
  });

  document.querySelectorAll(
    '#btn-open-progress-nav, #btn-open-progress-portal, #btn-open-progress-updates, #btn-open-progress-settings, .duo-btn-sheet-nav, .portal-link-sheet, .duo-btn-progress, .duo-btn-progress-settings'
  ).forEach(btn => {
    btn.addEventListener('click', openProgressSheet);
  });

  const configBtn = document.getElementById('btn-config-feedback-url');
  if (configBtn) configBtn.addEventListener('click', configFeedbackFormUrl);

  const configSheetBtn = document.getElementById('btn-config-progress-url');
  if (configSheetBtn) configSheetBtn.addEventListener('click', configProgressSheetUrl);
}

function initReaderToolsUI() {
  if (document.getElementById('reader-tools-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'reader-tools-modal';
  modal.className = 'reader-tools-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="reader-tools-backdrop" data-reader-tools-close></div>
    <section class="reader-tools-dialog" role="dialog" aria-modal="true" aria-labelledby="reader-tools-title">
      <header class="reader-tools-header">
        <div><strong id="reader-tools-title">Công cụ đọc</strong><small id="reader-tools-document-name">Chưa nạp tài liệu</small></div>
        <button class="reader-tools-icon-button" data-reader-tools-close title="Đóng" aria-label="Đóng">×</button>
      </header>
      <nav class="reader-tools-tabs" aria-label="Công cụ tài liệu">
        <button data-reader-tab="library">Thư viện</button>
        <button data-reader-tab="bookmarks">Dấu trang</button>
        <button data-reader-tab="toc">Mục lục</button>
        <button data-reader-tab="search">Tìm kiếm</button>
        <button data-reader-tab="layout">Bố cục dòng</button>
      </nav>
      <div class="reader-tools-content" id="reader-tools-content"></div>
    </section>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-reader-tools-close]').forEach(button => button.addEventListener('click', closeReaderTools));
  modal.querySelectorAll('[data-reader-tab]').forEach(button => {
    button.addEventListener('click', () => renderReaderToolsPanel(button.dataset.readerTab));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeReaderTools();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && hasLoadedDocument()) {
      event.preventDefault();
      openReaderTools('search');
    }
  });
}

function openReaderTools(tab = 'search') {
  initReaderToolsUI();
  const modal = document.getElementById('reader-tools-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  renderReaderToolsPanel(tab);
}

function closeReaderTools() {
  const modal = document.getElementById('reader-tools-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

async function renderReaderToolsPanel(tab = 'search') {
  const modal = document.getElementById('reader-tools-modal');
  const content = document.getElementById('reader-tools-content');
  if (!modal || !content) return;
  modal.querySelectorAll('[data-reader-tab]').forEach(button => button.classList.toggle('active', button.dataset.readerTab === tab));
  const name = document.getElementById('reader-tools-document-name');
  if (name) name.textContent = state.pdfFileName || 'Chưa nạp tài liệu';
  content.innerHTML = '<div class="reader-tools-empty">Đang đọc dữ liệu...</div>';

  if (tab === 'library') return renderDocumentLibrary(content);
  if (tab === 'bookmarks') return renderBookmarksPanel(content);
  if (tab === 'toc') return renderTocPanel(content);
  if (tab === 'layout') return renderLayoutToolsPanel(content);
  renderSearchPanel(content);
}

function renderLayoutToolsPanel(content) {
  const isExact = state.layoutMode === 'exact';
  const isWrap = state.layoutMode === 'wrap';
  const isCustom = state.layoutMode === 'custom';

  const fonts = ['Arial', 'Calibri', 'Consolas, monospace', 'Roboto', 'Times New Roman'];
  const lineHeights = [
    { val: '1.2', label: '1.2x (Chặt)' },
    { val: '1.5', label: '1.5x (Vừa)' },
    { val: '1.75', label: '1.75x (Chuẩn)' },
    { val: '2.0', label: '2.0x (Thưa)' }
  ];

  const sampleLines = [
    'Chương 1: Bình minh trên con phố nhỏ tĩnh lặng',
    'Một cơn gió thu nhè nhẹ thoảng qua từng hàng cây xào xạc trong sớm mai.',
    'Báo cáo số liệu quý 3 năm 2026 — Kiểm toán hệ thống dữ liệu doanh nghiệp.'
  ];

  const previewWhiteSpace = (isExact || !state.wrapText) ? (state.preserveIndents ? 'pre' : 'nowrap') : 'normal';

  content.innerHTML = `
    <div class="reader-tools-toolbar" style="flex-direction:column; align-items:stretch; gap:6px; margin-bottom:12px;">
      <strong style="font-size:13px; color:#0f172a;">Tùy chỉnh bố cục dòng & ngắt chữ</strong>
      <small style="color:#64748b;">Chọn chế độ hiển thị phù hợp để chữ không bị xê dịch, nhảy dòng hoặc ngụy trang hoàn hảo.</small>
    </div>

    <div class="unav-layout-dropdown-content" style="padding:0; max-height:none; background:transparent;">
      <!-- 1. Chế độ ngắt dòng -->
      <div class="unav-layout-section">
        <div class="unav-layout-section-label" style="color:#475569;">1. Chế độ hiển thị & ngắt dòng</div>
        
        <div class="unav-layout-card-option ${isExact ? 'active' : ''}" data-tool-layout-mode="exact">
          <div class="unav-layout-card-title">
            <span class="unav-dropdown-check">${isExact ? '✓' : '○'}</span>
            <strong>Giữ nguyên 100% dòng gốc (Khuyên dùng)</strong>
          </div>
          <div class="unav-layout-card-desc">1 dòng trong file = đúng 1 dòng đọc. Chữ giữ nguyên hàng, không bao giờ bị xê dịch hay rớt xuống dòng.</div>
        </div>

        <div class="unav-layout-card-option ${isWrap ? 'active' : ''}" data-tool-layout-mode="wrap">
          <div class="unav-layout-card-title">
            <span class="unav-dropdown-check">${isWrap ? '✓' : '○'}</span>
            <strong>Tự động xuống dòng (Wrap Text)</strong>
          </div>
          <div class="unav-layout-card-desc">Tự ngắt dòng khi chạm mép khung/cột để chữ vừa khít chiều rộng màn hình.</div>
        </div>

        <div class="unav-layout-card-option ${isCustom ? 'active' : ''}" data-tool-layout-mode="custom">
          <div class="unav-layout-card-title">
            <span class="unav-dropdown-check">${isCustom ? '✓' : '○'}</span>
            <strong>Cố định số chữ trên 1 dòng</strong>
          </div>
          <div class="unav-layout-card-desc">Ngắt dòng cứng theo giới hạn số ký tự tối đa:</div>
          <div class="unav-layout-pills-row">
            ${[50, 70, 80, 100, 120].map(cnt => `
              <button class="unav-layout-pill-btn ${state.maxCharsPerLine === cnt ? 'active' : ''}" data-tool-max-chars="${cnt}">${cnt} chữ</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 2. Cơ chế phân dòng -->
      <div class="unav-layout-section" style="margin-top:10px;">
        <div class="unav-layout-section-label" style="color:#475569;">2. Phân tách dòng đọc</div>
        <div class="unav-layout-pills-row" style="margin-left:0;">
          <button class="unav-layout-pill-btn ${state.chunkMode === 'line' ? 'active' : ''}" data-tool-chunk-mode="line">Từng dòng gốc (Line-by-line)</button>
          <button class="unav-layout-pill-btn ${state.chunkMode === 'paragraph' ? 'active' : ''}" data-tool-chunk-mode="paragraph">Từng đoạn văn</button>
          <button class="unav-layout-pill-btn ${state.chunkMode === 'sentence' ? 'active' : ''}" data-tool-chunk-mode="sentence">Từng câu</button>
        </div>
      </div>

      <!-- 3. Khoảng cách & Thụt lề -->
      <div class="unav-layout-section" style="margin-top:10px;">
        <div class="unav-layout-section-label" style="color:#475569;">3. Khoảng cách & Thụt lề</div>
        <label class="unav-layout-checkbox-item" style="color:#334155;">
          <input type="checkbox" id="tool-chk-indents" ${state.preserveIndents ? 'checked' : ''} />
          <span>Giữ nguyên thụt lề đầu dòng (Indents / Tabs / Khoảng trắng gốc)</span>
        </label>
        <label class="unav-layout-checkbox-item" style="color:#334155;">
          <input type="checkbox" id="tool-chk-compact-blanks" ${state.compactBlankLines ? 'checked' : ''} />
          <span>Lược bỏ dòng trống liên tiếp</span>
        </label>
      </div>

      <!-- 4. Typography -->
      <div class="unav-layout-section" style="margin-top:10px;">
        <div class="unav-layout-section-label" style="color:#475569;">4. Font chữ & Giãn dòng</div>
        <div class="unav-layout-grid-select">
          <div class="unav-layout-select-group">
            <span class="unav-layout-select-label" style="color:#64748b;">Phông chữ:</span>
            <select class="unav-layout-select" id="tool-sel-font">
              ${fonts.map(f => `<option value="${f}" ${state.fontFamily === f ? 'selected' : ''}>${f.includes('monospace') ? 'Monospace (Thẳng cột)' : f}</option>`).join('')}
            </select>
          </div>
          <div class="unav-layout-select-group">
            <span class="unav-layout-select-label" style="color:#64748b;">Giãn dòng:</span>
            <select class="unav-layout-select" id="tool-sel-lineheight">
              ${lineHeights.map(lh => `<option value="${lh.val}" ${state.lineHeight === lh.val ? 'selected' : ''}>${lh.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- 5. Live preview -->
      <div class="unav-layout-section" style="margin-top:12px;">
        <div class="unav-layout-section-label" style="color:#475569;">Vùng xem trước (Live Preview)</div>
        <div class="reader-tools-preview-box" style="white-space: ${previewWhiteSpace}; font-family: ${state.fontFamily}; font-size: ${state.fontSize}pt; line-height: ${state.lineHeight};">
          ${sampleLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach handlers
  content.querySelectorAll('[data-tool-layout-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.toolLayoutMode;
      state.layoutMode = mode;
      state.wrapText = (mode === 'wrap');
      if (mode === 'custom' || state.chunkMode === 'line') rechunkActiveDocument();
      applyStyles();
      saveState();
      syncUniversalNavbar();
      renderLayoutToolsPanel(content);
      showPageFlipToast(mode === 'exact' ? 'Đã bật: Giữ nguyên 100% dòng gốc' : (mode === 'wrap' ? 'Đã bật: Tự động xuống dòng' : `Đã đặt: ${state.maxCharsPerLine} chữ/dòng`));
    });
  });

  content.querySelectorAll('[data-tool-max-chars]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.layoutMode = 'custom';
      state.maxCharsPerLine = Number(btn.dataset.toolMaxChars);
      state.wrapText = false;
      rechunkActiveDocument();
      applyStyles();
      saveState();
      syncUniversalNavbar();
      renderLayoutToolsPanel(content);
    });
  });

  content.querySelectorAll('[data-tool-chunk-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.toolChunkMode;
      state.chunkMode = mode;
      rechunkActiveDocument();
      applyStyles();
      saveState();
      syncUniversalNavbar();
      renderLayoutToolsPanel(content);
      showPageFlipToast(`Đã chuyển sang phân đoạn: ${mode === 'line' ? 'Từng dòng' : (mode === 'sentence' ? 'Từng câu' : 'Từng đoạn')}`);
    });
  });

  const chkIndents = content.querySelector('#tool-chk-indents');
  if (chkIndents) {
    chkIndents.addEventListener('change', () => {
      state.preserveIndents = chkIndents.checked;
      applyStyles();
      saveState();
      renderLayoutToolsPanel(content);
    });
  }

  const chkCompact = content.querySelector('#tool-chk-compact-blanks');
  if (chkCompact) {
    chkCompact.addEventListener('change', () => {
      state.compactBlankLines = chkCompact.checked;
      rechunkActiveDocument();
      saveState();
      renderLayoutToolsPanel(content);
    });
  }

  const selFont = content.querySelector('#tool-sel-font');
  if (selFont) {
    selFont.addEventListener('change', () => {
      state.fontFamily = selFont.value;
      applyStyles();
      saveState();
      renderLayoutToolsPanel(content);
    });
  }

  const selLineHeight = content.querySelector('#tool-sel-lineheight');
  if (selLineHeight) {
    selLineHeight.addEventListener('change', () => {
      state.lineHeight = selLineHeight.value;
      applyStyles();
      saveState();
      renderLayoutToolsPanel(content);
    });
  }
}

async function renderDocumentLibrary(content) {
  try {
    const records = await listDocumentCaches();
    let storageText = '';
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ? `${(estimate.usage / 1048576).toFixed(1)} MB` : 'không rõ';
      const quota = estimate.quota ? `${(estimate.quota / 1048576).toFixed(0)} MB` : 'không rõ';
      storageText = `<div class="reader-tools-storage">Bộ nhớ trình duyệt: ${usage} / ${quota}</div>`;
    }
    if (!records.length) {
      content.innerHTML = `${storageText}<div class="reader-tools-empty">Chưa có tài liệu nào trong thư viện. Tài liệu sẽ được lưu sau khi nạp thành công.</div>`;
      return;
    }
    content.innerHTML = `${storageText}<div class="reader-tools-list">${records.map(record => {
      const active = record.documentId === getCurrentDocumentId();
      const date = record.savedAt ? new Date(record.savedAt).toLocaleString('vi-VN') : '';
      return `<article class="reader-tools-item${active ? ' current' : ''}">
        <div class="reader-tools-item-main"><strong>${escapeHtml(record.documentName || 'Tài liệu')}</strong><small>${record.totalPages || 1} trang · ${(record.chunks || []).length} đoạn · ${escapeHtml(date)}</small></div>
        <div class="reader-tools-actions"><button data-library-open="${escapeHtml(record.documentId)}">Mở</button>${active ? '<button disabled>Đang mở</button>' : `<button class="danger" data-library-delete="${escapeHtml(record.documentId)}">Xóa</button>`}</div>
      </article>`;
    }).join('')}</div>`;
    content.querySelectorAll('[data-library-open]').forEach(button => button.addEventListener('click', async () => {
      const cache = await readDocumentCacheById(button.dataset.libraryOpen);
      if (!applyCachedDocument(cache)) return;
      renderContinuousView(true, state.currentGlobalIndex);
      await persistDocumentCache();
      closeReaderTools();
      showPageFlipToast(`Đã mở <b>${escapeHtml(state.pdfFileName)}</b>.`);
    }));
    content.querySelectorAll('[data-library-delete]').forEach(button => button.addEventListener('click', async () => {
      const record = records.find(item => item.documentId === button.dataset.libraryDelete);
      if (!window.confirm(`Xóa "${record?.documentName || 'tài liệu'}" khỏi thư viện trên thiết bị này?`)) return;
      await deleteDocumentCache(button.dataset.libraryDelete);
      renderDocumentLibrary(content);
    }));
  } catch (error) {
    content.innerHTML = '<div class="reader-tools-empty">Không thể đọc thư viện trên trình duyệt này.</div>';
    console.warn(error);
  }
}

function renderBookmarksPanel(content) {
  const documentId = getCurrentDocumentId();
  if (!documentId) {
    content.innerHTML = '<div class="reader-tools-empty">Hãy nạp một tài liệu trước khi dùng dấu trang.</div>';
    return;
  }
  const all = readSavedBookmarks();
  const entry = normalizeBookmarkEntry(all[documentId], documentId);
  content.innerHTML = `<div class="reader-tools-toolbar"><button id="reader-add-bookmark">+ Đánh dấu vị trí hiện tại</button></div>
    <div class="reader-tools-list">${entry.marks.length ? entry.marks.map(mark => `<article class="reader-tools-item">
      <div class="reader-tools-item-main"><strong>Trang ${mark.page}, dòng ${Number(mark.globalIndex) + 1}</strong><input data-mark-note="${escapeHtml(mark.id)}" value="${escapeHtml(mark.note || '')}" aria-label="Ghi chú dấu trang"><small>${escapeHtml(mark.excerpt || '')}</small></div>
      <div class="reader-tools-actions"><button data-mark-open="${escapeHtml(mark.id)}">Mở</button><button class="danger" data-mark-delete="${escapeHtml(mark.id)}">Xóa</button></div>
    </article>`).join('') : '<div class="reader-tools-empty">Chưa có dấu trang thủ công.</div>'}</div>`;
  content.querySelector('#reader-add-bookmark')?.addEventListener('click', () => addManualBookmark());
  content.querySelectorAll('[data-mark-open]').forEach(button => button.addEventListener('click', () => {
    const mark = entry.marks.find(item => item.id === button.dataset.markOpen);
    if (mark) jumpToChunk(mark.globalIndex);
    closeReaderTools();
  }));
  content.querySelectorAll('[data-mark-note]').forEach(input => input.addEventListener('change', () => {
    const mark = entry.marks.find(item => item.id === input.dataset.markNote);
    if (!mark) return;
    mark.note = input.value.trim();
    mark.updatedAt = Date.now();
    entry.updatedAt = Date.now();
    all[documentId] = entry;
    localStorage.setItem(READING_BOOKMARKS_STORAGE_KEY, JSON.stringify(all));
    scheduleHybridSync();
  }));
  content.querySelectorAll('[data-mark-delete]').forEach(button => button.addEventListener('click', () => {
    entry.marks = entry.marks.filter(item => item.id !== button.dataset.markDelete);
    entry.updatedAt = Date.now();
    all[documentId] = entry;
    localStorage.setItem(READING_BOOKMARKS_STORAGE_KEY, JSON.stringify(all));
    scheduleHybridSync();
    renderBookmarksPanel(content);
  }));
}

function renderTocPanel(content) {
  if (!state.documentToc.length) {
    content.innerHTML = '<div class="reader-tools-empty">Tài liệu này không có mục lục chương. File EPUB hoặc PDF có bookmark sẽ tự động hiển thị mục lục tại đây.</div>';
    return;
  }
  content.innerHTML = `<div class="reader-tools-list">${state.documentToc.map((item, index) => `<button class="reader-toc-item" data-toc-index="${index}"><span>${escapeHtml(item.title)}</span><small>Trang ${item.page}</small></button>`).join('')}</div>`;
  content.querySelectorAll('[data-toc-index]').forEach(button => button.addEventListener('click', () => {
    const item = state.documentToc[Number(button.dataset.tocIndex)];
    jumpToChunk(item.globalIndex ?? state.pageStartIndices[item.page] ?? 0);
    closeReaderTools();
  }));
}

function renderSearchPanel(content) {
  content.innerHTML = `<form class="reader-search-form" id="reader-search-form"><input id="reader-search-input" type="search" placeholder="Tìm trong toàn bộ tài liệu" autocomplete="off"><button type="submit">Tìm</button></form><div id="reader-search-summary" class="reader-search-summary"></div><div id="reader-search-results" class="reader-tools-list"></div>`;
  const form = content.querySelector('#reader-search-form');
  const input = content.querySelector('#reader-search-input');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value.trim().toLocaleLowerCase('vi');
    state.searchResults = query ? state.allChunks.filter(chunk => (chunk.text || '').toLocaleLowerCase('vi').includes(query)).slice(0, 300) : [];
    state.searchResultCursor = state.searchResults.length ? 0 : -1;
    const summary = content.querySelector('#reader-search-summary');
    const results = content.querySelector('#reader-search-results');
    summary.textContent = query ? `${state.searchResults.length}${state.searchResults.length === 300 ? '+' : ''} kết quả` : '';
    results.innerHTML = state.searchResults.length ? state.searchResults.map((chunk, index) => `<button class="reader-search-result" data-search-index="${index}"><strong>Trang ${chunk.page}</strong><span>${escapeHtml(chunk.text.slice(0, 220))}</span></button>`).join('') : '<div class="reader-tools-empty">Không tìm thấy nội dung phù hợp.</div>';
    results.querySelectorAll('[data-search-index]').forEach(button => button.addEventListener('click', () => {
      const chunk = state.searchResults[Number(button.dataset.searchIndex)];
      if (chunk) jumpToChunk(chunk.globalIndex, true);
      closeReaderTools();
    }));
  });
  setTimeout(() => input.focus(), 0);
}

function jumpToChunk(index, highlight = false) {
  const target = Math.min(Math.max(0, Number(index) || 0), Math.max(0, state.allChunks.length - 1));
  if (target + 60 > state.renderedCount) renderNextBatch(Math.max(state.BATCH_SIZE, target + 60 - state.renderedCount));
  setActiveRow(target, true);
  if (highlight) {
    setTimeout(() => {
      const element = document.querySelector(`[data-index="${target}"]`);
      if (!element) return;
      element.classList.add('reader-search-hit');
      setTimeout(() => element.classList.remove('reader-search-hit'), 2400);
    }, 100);
  }
}

function showReaderError(title, summary, error = null, stage = '', file = lastFailedDocumentFile) {
  initReaderToolsUI();
  let modal = document.getElementById('reader-error-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reader-error-modal';
    modal.className = 'reader-tools-modal';
    document.body.appendChild(modal);
  }
  const detail = error?.message || String(error || 'Không có chi tiết kỹ thuật.');
  const metadata = file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB · ${file.type || 'không rõ định dạng'}` : '';
  modal.innerHTML = `<div class="reader-tools-backdrop" data-error-close></div><section class="reader-error-dialog" role="alertdialog" aria-modal="true"><header><strong>${escapeHtml(title)}</strong><button data-error-close aria-label="Đóng">×</button></header><p>${escapeHtml(summary)}</p>${stage ? `<div class="reader-error-stage">Bước lỗi: ${escapeHtml(stage)}</div>` : ''}${metadata ? `<div class="reader-error-file">${escapeHtml(metadata)}</div>` : ''}<details><summary>Chi tiết kỹ thuật</summary><pre>${escapeHtml(detail)}</pre></details><footer>${file ? '<button id="reader-error-retry">Thử lại</button>' : ''}<button data-error-close>Đóng</button></footer></section>`;
  modal.classList.add('open');
  modal.querySelectorAll('[data-error-close]').forEach(button => button.addEventListener('click', () => modal.classList.remove('open')));
  modal.querySelector('#reader-error-retry')?.addEventListener('click', () => {
    modal.classList.remove('open');
    processDocumentFile(file);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  ensureSharedReaderComponents();
  loadSavedState();
  initUniversalNavbar();
  initReaderToolsUI();
  initThemeSystem();
  StealthImageManager.init();
  initTitleEditing();
  initStealthEditableElements();
  initEventListeners();
  initSheetTabs();
  initContinuousScrollListeners();
  initLandingPortal();
  initPortalTriggers();
  initControlsVisibilityToggle();
  initVersionReloadButton();
  initFeedbackListeners();
  
  state.bossModeActive = false;
  switchSheet('view-sheet-story');

  if (state.allChunks.length === 0) {
    const restored = await restoreDocumentCache();
    if (!restored) {
      state.pdfFileName = '';
      state.documentId = '';
      initStoryFromChunks(SAMPLE_STORY_CHUNKS);
    } else {
      renderContinuousView(true);
      if (getCurrentBookmark()) {
        setTimeout(() => restoreSavedReadingPosition(true), 0);
      }
    }
  } else {
    renderContinuousView(true);
  }

  initializeHybridSync();

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
    state.tvplTitle = localStorage.getItem('stealth_title_tvpl') || 'QUY ĐỊNH CHI TIẾT VỀ PHÁT TRIỂN CHUYỂN ĐỔI SỐ QUỐC GIA VÀ BẢO ĐẢM AN TOÀN DỮ LIỆU ĐIỆN TỬ';
    state.teamsTitle = localStorage.getItem('stealth_title_teams') || 'Dong Mia';
    state.capcutTitle = localStorage.getItem('stealth_title_capcut') || 'CapCut Pro - Draft_Project_0928_Vlog';
    state.sapTitle = localStorage.getItem('stealth_title_sap') || 'Display Purchase Order 4500192834';


    const saved = localStorage.getItem('excel_reader_state');
    if (saved) {
      const data = JSON.parse(saved);
      state.fontSize = data.fontSize || (state.theme === 'theme-googlesheets' ? 10 : 11);
      state.lineHeight = data.lineHeight || '1.75';
      state.fontFamily = data.fontFamily || (state.theme === 'theme-googlesheets' ? 'Arial' : 'Calibri');
      state.readingMode = (state.theme === 'theme-googlesheets') ? 'grid' : (data.readingMode || 'grid');
      state.autoScrollDelay = data.autoScrollDelay || 5000;
      state.textDimLevel = data.textDimLevel || 100;
      state.wrapText = data.wrapText !== undefined ? data.wrapText : false;
      state.layoutMode = data.layoutMode || (state.wrapText ? 'wrap' : 'exact');
      state.chunkMode = data.chunkMode || 'paragraph';
      state.maxCharsPerLine = data.maxCharsPerLine || 80;
      state.preserveIndents = data.preserveIndents !== undefined ? data.preserveIndents : true;
      state.compactBlankLines = data.compactBlankLines !== undefined ? data.compactBlankLines : false;
      state.pdfFileName = data.pdfFileName || '';
      state.documentId = data.documentId || '';
      if (data.currentGlobalIndex !== undefined) state.currentGlobalIndex = data.currentGlobalIndex;
      if (data.currentPage !== undefined) state.currentPage = data.currentPage;
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
}

// Navigation fires saveState on every row; coalesce those writes and flush on page hide.
let saveStateTimer = null;

function scheduleSaveState() {
  if (saveStateTimer) return;
  saveStateTimer = setTimeout(() => {
    saveState();
    saveCurrentBookmark();
  }, 400);
}

window.addEventListener('pagehide', () => {
  saveState();
  saveCurrentBookmark();
  pushHybridDocument({ keepalive: true });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  saveState();
  saveCurrentBookmark();
});

function saveState() {
  if (saveStateTimer) {
    clearTimeout(saveStateTimer);
    saveStateTimer = null;
  }
  try {
    const data = {
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
      fontFamily: state.fontFamily,
      readingMode: state.readingMode,
      autoScrollDelay: state.autoScrollDelay,
      textDimLevel: state.textDimLevel,
      wrapText: state.layoutMode === 'wrap',
      layoutMode: state.layoutMode,
      chunkMode: state.chunkMode,
      maxCharsPerLine: state.maxCharsPerLine,
      preserveIndents: state.preserveIndents,
      compactBlankLines: state.compactBlankLines,
      currentPage: state.currentPage,
      currentGlobalIndex: state.currentGlobalIndex,
      pdfFileName: state.pdfFileName,
      documentId: getCurrentDocumentId()
    };
    localStorage.setItem('excel_reader_state', JSON.stringify(data));
    localStorage.setItem('selected_theme', state.theme);
    updateHybridSettingsVersion();
    scheduleHybridSync();
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

// ==========================================================
// CUSTOM THEME CAMOUFLAGE IMAGE MANAGER (INDEXEDDB + LOCALSTORAGE)
// ==========================================================
const StealthImageManager = {
  dbPromise: null,

  getDB() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          if (!window.indexedDB) {
            resolve(null);
            return;
          }
          const req = window.indexedDB.open('StealthReaderDB', 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('theme_images')) {
              db.createObjectStore('theme_images');
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  },

  async saveImage(theme, dataUrl) {
    try {
      const db = await this.getDB();
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('theme_images', 'readwrite');
          tx.objectStore('theme_images').put(dataUrl, theme);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } else {
        localStorage.setItem(`stealth_custom_img_${theme}`, dataUrl);
      }
    } catch (_) {
      try {
        localStorage.setItem(`stealth_custom_img_${theme}`, dataUrl);
      } catch (err) {
        console.warn('Storage quota reached:', err);
      }
    }
    this.applyImage(theme, dataUrl);
  },

  async getImage(theme) {
    try {
      const db = await this.getDB();
      if (db) {
        const val = await new Promise((resolve) => {
          const tx = db.transaction('theme_images', 'readonly');
          const req = tx.objectStore('theme_images').get(theme);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        if (val) return val;
      }
    } catch (_) {}
    return localStorage.getItem(`stealth_custom_img_${theme}`);
  },

  async removeImage(theme) {
    try {
      const db = await this.getDB();
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('theme_images', 'readwrite');
          tx.objectStore('theme_images').delete(theme);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (_) {}
    localStorage.removeItem(`stealth_custom_img_${theme}`);
    this.resetImage(theme);
  },

  applyImage(theme, dataUrl) {
    if (!dataUrl) return;

    if (theme === 'theme-photoshop') {
      const canvas = document.querySelector('.ps-visual-canvas');
      if (canvas) {
        canvas.style.backgroundImage = `url("${dataUrl}")`;
        canvas.style.backgroundSize = 'cover';
        canvas.style.backgroundPosition = 'center';
        canvas.style.backgroundRepeat = 'no-repeat';
      }
      const bossHero = document.querySelector('.ps-boss-hero-svg');
      if (bossHero) {
        let bossImg = document.getElementById('ps-custom-boss-img');
        if (!bossImg) {
          bossImg = document.createElement('img');
          bossImg.id = 'ps-custom-boss-img';
          bossImg.style.cssText = 'max-width:100%; max-height:280px; object-fit:contain; border-radius:4px; margin:0 auto; display:block;';
          bossHero.parentNode.insertBefore(bossImg, bossHero);
        }
        bossImg.src = dataUrl;
        bossHero.style.display = 'none';
      }
    } else if (theme === 'theme-autocad') {
      const houseContainer = document.querySelector('.cad-house-img-container');
      if (houseContainer) {
        let customImgEl = document.getElementById('cad-custom-viewport-img');
        if (!customImgEl) {
          customImgEl = document.createElement('img');
          customImgEl.id = 'cad-custom-viewport-img';
          customImgEl.style.cssText = 'width:100%; height:100%; object-fit:contain; display:block;';
          houseContainer.appendChild(customImgEl);
        }
        customImgEl.src = dataUrl;
        const svg = document.getElementById('cad-fallback-3d-svg');
        if (svg) svg.style.display = 'none';
      }
      const bossImg = document.querySelector('.cad-boss-full-img');
      if (bossImg) bossImg.src = dataUrl;
    } else if (theme === 'theme-capcut') {
      const monitor = document.querySelector('.cc-monitor-scene');
      if (monitor) {
        monitor.style.backgroundImage = `url("${dataUrl}")`;
        monitor.style.backgroundSize = 'contain';
        monitor.style.backgroundPosition = 'center';
        monitor.style.backgroundRepeat = 'no-repeat';
        const svg = monitor.querySelector('.cc-monitor-svg');
        if (svg) svg.style.opacity = '0';
      }
    } else if (theme === 'theme-premiere') {
      const frame = document.querySelector('.pr-frame');
      if (frame) {
        frame.style.backgroundImage = `url("${dataUrl}")`;
        frame.style.backgroundSize = 'contain';
        frame.style.backgroundPosition = 'center';
        frame.style.backgroundRepeat = 'no-repeat';
        frame.style.backgroundColor = '#000000';
      }
      const svg = document.querySelector('.pr-scene-svg');
      if (svg) svg.style.display = 'none';
      const monitor = document.querySelector('.pr-monitor');
      if (monitor) monitor.style.backgroundImage = '';
    } else if (theme === 'theme-blender') {
      const scene = document.querySelector('.b-viewport-scene');
      if (scene) {
        scene.style.backgroundImage = `url("${dataUrl}")`;
        scene.style.backgroundSize = 'cover';
        scene.style.backgroundPosition = 'center';
        scene.style.backgroundRepeat = 'no-repeat';
        const svg = scene.querySelector('svg');
        if (svg) svg.style.opacity = '0';
      }
    } else if (theme === 'theme-canva') {
      const orbitContainer = document.querySelector('#canva-story-view .canva-infographic-orbit-container');
      if (orbitContainer) {
        let customBox = document.getElementById('canva-custom-orbit-box');
        if (!customBox) {
          customBox = document.createElement('div');
          customBox.id = 'canva-custom-orbit-box';
          customBox.className = 'canva-custom-orbit-box';
          const img = document.createElement('img');
          img.id = 'canva-custom-orbit-img';
          customBox.appendChild(img);
          orbitContainer.insertBefore(customBox, orbitContainer.firstChild);
        }
        const customImg = document.getElementById('canva-custom-orbit-img');
        if (customImg) customImg.src = dataUrl;

        const svg = orbitContainer.querySelector('.canva-orbit-svg');
        if (svg) svg.style.display = 'none';
        const milestones = orbitContainer.querySelector('.canva-orbit-milestones-row');
        if (milestones) milestones.style.display = 'none';
      }

      const bossOrbit = document.querySelector('#canva-boss-view .canva-infographic-orbit-container');
      if (bossOrbit) {
        let bossBox = document.getElementById('canva-custom-boss-box');
        if (!bossBox) {
          bossBox = document.createElement('div');
          bossBox.id = 'canva-custom-boss-box';
          bossBox.className = 'canva-custom-boss-box';
          const img = document.createElement('img');
          img.id = 'canva-custom-boss-img';
          bossBox.appendChild(img);
          bossOrbit.insertBefore(bossBox, bossOrbit.firstChild);
        }
        const bossImg = document.getElementById('canva-custom-boss-img');
        if (bossImg) bossImg.src = dataUrl;

        const svg = bossOrbit.querySelector('.canva-orbit-svg');
        if (svg) svg.style.display = 'none';
        const milestones = bossOrbit.querySelector('.canva-orbit-milestones-row');
        if (milestones) milestones.style.display = 'none';
      }

      const activeThumb = document.querySelector('.canva-grid-card.active');
      if (activeThumb) {
        let thumbImg = document.getElementById('canva-custom-thumb-img');
        if (!thumbImg) {
          thumbImg = document.createElement('img');
          thumbImg.id = 'canva-custom-thumb-img';
          thumbImg.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block; border-radius:3px; position:absolute; top:0; left:0; z-index:2;';
          activeThumb.style.position = 'relative';
          activeThumb.appendChild(thumbImg);
        }
        thumbImg.src = dataUrl;
      }
      const canva = document.querySelector('.canva-canvas-viewport');
      if (canva) canva.style.backgroundImage = '';
    } else if (theme === 'theme-figma') {
      const mockup = document.querySelector('.figma-mockup-canvas');
      if (mockup) {
        mockup.style.backgroundImage = `url("${dataUrl}")`;
        mockup.style.backgroundSize = 'contain';
        mockup.style.backgroundPosition = 'center';
        mockup.style.backgroundRepeat = 'no-repeat';
      }
      const tourImgs = document.querySelectorAll('.btn-card-img-box');
      tourImgs.forEach(el => {
        el.style.backgroundImage = `url("${dataUrl}")`;
        el.style.backgroundSize = 'cover';
      });
    } else if (theme === 'theme-powerpoint') {
      const panel = document.querySelector('.ppt-visuals-panel');
      if (panel) {
        let customCard = document.getElementById('ppt-custom-img-card');
        if (!customCard) {
          customCard = document.createElement('div');
          customCard.id = 'ppt-custom-img-card';
          customCard.className = 'ppt-chart-card ppt-custom-img-card';
          customCard.innerHTML = `
            <div class="ppt-chart-card-title">
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px; margin-right:4px;"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>Hình Ảnh Trình Chiếu</span>
              <span style="color: #d24726; font-size: 10px;">Media Box</span>
            </div>
            <div class="ppt-custom-img-body">
              <img id="ppt-custom-img" alt="PowerPoint Media" />
            </div>
          `;
          panel.insertBefore(customCard, panel.firstChild);
        }
        const img = document.getElementById('ppt-custom-img');
        if (img) img.src = dataUrl;
      }

      const bossSlide = document.querySelector('.ppt-boss-slide');
      if (bossSlide) {
        let bossBox = document.getElementById('ppt-custom-boss-box');
        if (!bossBox) {
          bossBox = document.createElement('div');
          bossBox.id = 'ppt-custom-boss-box';
          bossBox.className = 'ppt-custom-boss-box';
          const img = document.createElement('img');
          img.id = 'ppt-custom-boss-img';
          bossBox.appendChild(img);
          const kpiGrid = bossSlide.querySelector('.ppt-kpi-grid');
          if (kpiGrid) bossSlide.insertBefore(bossBox, kpiGrid);
          else bossSlide.appendChild(bossBox);
        }
        const bossImg = document.getElementById('ppt-custom-boss-img');
        if (bossImg) bossImg.src = dataUrl;
      }

      const activeThumb = document.querySelector('.ppt-thumb-card.active .ppt-thumb-preview');
      if (activeThumb) {
        let thumbImg = document.getElementById('ppt-custom-thumb-img');
        if (!thumbImg) {
          thumbImg = document.createElement('img');
          thumbImg.id = 'ppt-custom-thumb-img';
          thumbImg.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block; border-radius:2px; position:absolute; top:0; left:0; z-index:2;';
          activeThumb.style.position = 'relative';
          activeThumb.appendChild(thumbImg);
        }
        thumbImg.src = dataUrl;
      }
      const ppt = document.querySelector('.ppt-canvas-viewport');
      if (ppt) ppt.style.backgroundImage = '';
    }

    this.updatePillState(true);
  },

  resetImage(theme) {
    if (theme === 'theme-photoshop') {
      const canvas = document.querySelector('.ps-visual-canvas');
      if (canvas) canvas.style.backgroundImage = '';
      const bossHero = document.querySelector('.ps-boss-hero-svg');
      if (bossHero) bossHero.style.display = '';
      const bossImg = document.getElementById('ps-custom-boss-img');
      if (bossImg) bossImg.remove();
    } else if (theme === 'theme-autocad') {
      const customImgEl = document.getElementById('cad-custom-viewport-img');
      if (customImgEl) customImgEl.remove();
      const svg = document.getElementById('cad-fallback-3d-svg');
      if (svg) svg.style.display = '';
      const bossImg = document.querySelector('.cad-boss-full-img');
      if (bossImg) bossImg.src = '/static/autocad_3d_house.png';
    } else if (theme === 'theme-capcut') {
      const monitor = document.querySelector('.cc-monitor-scene');
      if (monitor) {
        monitor.style.backgroundImage = '';
        const svg = monitor.querySelector('.cc-monitor-svg');
        if (svg) svg.style.opacity = '';
      }
    } else if (theme === 'theme-premiere') {
      const frame = document.querySelector('.pr-frame');
      if (frame) {
        frame.style.backgroundImage = '';
        frame.style.backgroundSize = '';
        frame.style.backgroundPosition = '';
        frame.style.backgroundRepeat = '';
        frame.style.backgroundColor = '';
      }
      const svg = document.querySelector('.pr-scene-svg');
      if (svg) svg.style.display = '';
      const monitor = document.querySelector('.pr-monitor');
      if (monitor) monitor.style.backgroundImage = '';
    } else if (theme === 'theme-blender') {
      const scene = document.querySelector('.b-viewport-scene');
      if (scene) {
        scene.style.backgroundImage = '';
        const svg = scene.querySelector('svg');
        if (svg) svg.style.opacity = '';
      }
    } else if (theme === 'theme-canva') {
      const customBox = document.getElementById('canva-custom-orbit-box');
      if (customBox) customBox.remove();
      const bossBox = document.getElementById('canva-custom-boss-box');
      if (bossBox) bossBox.remove();
      const thumbImg = document.getElementById('canva-custom-thumb-img');
      if (thumbImg) thumbImg.remove();

      const orbitContainer = document.querySelector('#canva-story-view .canva-infographic-orbit-container');
      if (orbitContainer) {
        const svg = orbitContainer.querySelector('.canva-orbit-svg');
        if (svg) svg.style.display = '';
        const milestones = orbitContainer.querySelector('.canva-orbit-milestones-row');
        if (milestones) milestones.style.display = '';
      }

      const bossOrbit = document.querySelector('#canva-boss-view .canva-infographic-orbit-container');
      if (bossOrbit) {
        const svg = bossOrbit.querySelector('.canva-orbit-svg');
        if (svg) svg.style.display = '';
        const milestones = bossOrbit.querySelector('.canva-orbit-milestones-row');
        if (milestones) milestones.style.display = '';
      }

      const canva = document.querySelector('.canva-canvas-viewport');
      if (canva) canva.style.backgroundImage = '';
    } else if (theme === 'theme-figma') {
      const mockup = document.querySelector('.figma-mockup-canvas');
      if (mockup) mockup.style.backgroundImage = '';
      const tourImgs = document.querySelectorAll('.btn-card-img-box');
      tourImgs.forEach(el => {
        el.style.backgroundImage = '';
        el.style.backgroundSize = '';
      });
    } else if (theme === 'theme-powerpoint') {
      const customCard = document.getElementById('ppt-custom-img-card');
      if (customCard) customCard.remove();
      const bossBox = document.getElementById('ppt-custom-boss-box');
      if (bossBox) bossBox.remove();
      const thumbImg = document.getElementById('ppt-custom-thumb-img');
      if (thumbImg) thumbImg.remove();
      const ppt = document.querySelector('.ppt-canvas-viewport');
      if (ppt) ppt.style.backgroundImage = '';
    }

    this.updatePillState(false);
  },

  updatePillState(hasCustom) {
    const resetBtn = document.getElementById('btn-reset-stealth-img');
    if (resetBtn) resetBtn.style.display = hasCustom ? 'inline-flex' : 'none';
  },

  async init() {
    const currentTheme = state.theme || 'theme-googlesheets';
    const isVisualTheme = [
      'theme-photoshop',
      'theme-autocad',
      'theme-capcut',
      'theme-premiere',
      'theme-blender',
      'theme-canva',
      'theme-figma',
      'theme-powerpoint'
    ].includes(currentTheme);

    const navBtn = document.getElementById('univ-btn-custom-img');
    if (navBtn) {
      navBtn.style.display = isVisualTheme ? 'inline-flex' : 'none';
    }

    if (!isVisualTheme) return;

    const savedImg = await this.getImage(currentTheme);
    if (savedImg) {
      this.applyImage(currentTheme, savedImg);
    }

    this.setupUI(currentTheme, Boolean(savedImg));
  },

  setupUI(theme, hasCustom) {
    let container = null;
    if (theme === 'theme-photoshop') container = document.querySelector('.ps-visual-artboard');
    else if (theme === 'theme-autocad') container = document.querySelector('.cad-canvas-vector-box');
    else if (theme === 'theme-capcut') container = document.querySelector('.cc-monitor-panel');
    else if (theme === 'theme-premiere') container = document.querySelector('.pr-frame') || document.querySelector('.pr-monitor');
    else if (theme === 'theme-blender') container = document.querySelector('.b-viewport-pane');
    else if (theme === 'theme-canva') container = document.querySelector('.canva-pinned-visual-header') || document.querySelector('.canva-slide-deck-card');
    else if (theme === 'theme-figma') container = document.querySelector('.figma-artboard-frame') || document.querySelector('.figma-mockup-canvas');
    else if (theme === 'theme-powerpoint') container = document.querySelector('.ppt-slide-sheet') || document.querySelector('.ppt-canvas-viewport');

    if (container && !document.getElementById('stealth-img-ctrl-pill')) {
      const pill = document.createElement('div');
      pill.id = 'stealth-img-ctrl-pill';
      pill.className = 'stealth-img-ctrl-pill';
      pill.innerHTML = `
        <button class="stealth-img-btn" id="btn-upload-stealth-img" title="Tải ảnh ngụy trang của bạn (hoặc kéo thả ảnh trực tiếp)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <span>Đổi ảnh</span>
        </button>
        <button class="stealth-img-btn reset" id="btn-reset-stealth-img" style="display:${hasCustom ? 'inline-flex' : 'none'};" title="Khôi phục ảnh ngụy trang mặc định">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span>Mặc định</span>
        </button>
      `;
      container.style.position = 'relative';
      container.appendChild(pill);

      const uploadBtn = pill.querySelector('#btn-upload-stealth-img');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerFileInput(theme);
        });
      }

      const resetBtn = pill.querySelector('#btn-reset-stealth-img');
      if (resetBtn) {
        resetBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.removeImage(theme);
          showPageFlipToast('Đã khôi phục ảnh ngụy trang mặc định!');
        });
      }
    }

    const dropTarget = container || document.body;
    if (dropTarget && !dropTarget._hasImgDropListener) {
      dropTarget._hasImgDropListener = true;

      ['dragenter', 'dragover'].forEach(name => {
        dropTarget.addEventListener(name, (e) => {
          if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            dropTarget.classList.add('stealth-img-dragover');
          }
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        dropTarget.addEventListener(name, (e) => {
          dropTarget.classList.remove('stealth-img-dragover');
        });
      });

      dropTarget.addEventListener('drop', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          this.processImageFile(file, theme);
        }
      });
    }

    const navBtn = document.getElementById('univ-btn-custom-img');
    if (navBtn) {
      navBtn.style.display = 'inline-flex';
      navBtn.onclick = () => this.triggerFileInput(theme);
    }
  },

  triggerFileInput(theme) {
    let input = document.getElementById('stealth-theme-img-input');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'stealth-theme-img-input';
      input.accept = 'image/png, image/jpeg, image/webp, image/gif, image/svg+xml';
      input.style.display = 'none';
      document.body.appendChild(input);
    }
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        this.processImageFile(file, theme);
        input.value = '';
      }
    };
    input.click();
  },

  processImageFile(file, theme) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      await this.saveImage(theme, dataUrl);
      showPageFlipToast('✓ Đã cập nhật ảnh ngụy trang mới thành công!');
    };
    reader.readAsDataURL(file);
  }
};

// ==========================================================
// THEME SYSTEM
// ==========================================================
function getThemePickerModalHTML() {
  return `
<div class="stealth-modal-overlay" id="theme-modal">
      <div class="stealth-modal-content theme-picker-content">
        <div class="modal-header">
          <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-3px; margin-right:6px;"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.64 10.56 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>Chọn Giao Diện Ngụy Trang Làm Việc</h3>
          <button class="modal-close-btn" id="btn-close-theme-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="theme-selection-grid">
            <!-- Theme 1: Google Sheets -->
            <div class="theme-card active" data-theme="theme-googlesheets">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <path d="M37 45H11C8.8 45 7 43.2 7 41V7C7 4.8 8.8 3 11 3H29L41 15V41C41 43.2 39.2 45 37 45Z" fill="#0F9D58"/>
                  <path d="M29 3L41 15H29V3Z" fill="#87CEAC"/>
                  <path d="M14 21H34V39H14V21Z" fill="white"/>
                  <path d="M14 27H34V29H14V27ZM14 33H34V35H14V33ZM22 21V39H24V21H22Z" fill="#0F9D58"/>
                </svg>
              </div>
              <span class="theme-card-title">Google Sheets</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 2: Google Docs -->
            <div class="theme-card" data-theme="theme-googledocs">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <path d="M37 45H11C8.8 45 7 43.2 7 41V7C7 4.8 8.8 3 11 3H29L41 15V41C41 43.2 39.2 45 37 45Z" fill="#4285F4"/>
                  <path d="M29 3L41 15H29V3Z" fill="#A1C2FA"/>
                  <rect x="14" y="22" width="20" height="2.5" rx="1.25" fill="white"/>
                  <rect x="14" y="27.5" width="20" height="2.5" rx="1.25" fill="white"/>
                  <rect x="14" y="33" width="13" height="2.5" rx="1.25" fill="white"/>
                </svg>
              </div>
              <span class="theme-card-title">Google Docs</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 3: Microsoft Excel -->
            <div class="theme-card" data-theme="theme-excel">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect x="16" y="8" width="26" height="32" rx="3" fill="#107C41"/>
                  <path d="M22 15H36V33H22V15Z" fill="#21A366"/>
                  <path d="M22 21H36M22 27H36M28 15V33" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                  <rect x="6" y="12" width="20" height="24" rx="3" fill="#185C37" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
                  <path d="M11 18L21 30M21 18L11 30" stroke="white" stroke-width="3" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="theme-card-title">Microsoft Excel</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 4: VS Code -->
            <div class="theme-card" data-theme="theme-vscode">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <path d="M35.5 45.5L45 40.5V7.5L35.5 2.5L16 19.5L8.5 13.5L3 16.5L12 24L3 31.5L8.5 34.5L16 28.5L35.5 45.5Z" fill="#007ACC"/>
                  <path d="M35.5 45.5L45 40.5V7.5L35.5 2.5L25 17L35.5 24L25 31L35.5 45.5Z" fill="#1F9CF0"/>
                  <path d="M35.5 2.5L16 19.5L8.5 13.5L3 16.5L12 24L25 17L35.5 2.5Z" fill="#0065A9"/>
                  <path d="M35.5 45.5L25 31L12 24L3 31.5L8.5 34.5L16 28.5L35.5 45.5Z" fill="#0065A9"/>
                </svg>
              </div>
              <span class="theme-card-title">VS Code</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 5: Photoshop -->
            <div class="theme-card" data-theme="theme-photoshop">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="10" fill="#001E36"/>
                  <rect x="2" y="2" width="44" height="44" rx="8" stroke="#31A8FF" stroke-width="2.5" fill="none"/>
                  <path d="M14 15H21.5C24.5 15 26.5 16.8 26.5 19.8C26.5 22.8 24.5 24.6 21.5 24.6H17.8V33H14V15ZM17.8 21.5H21.2C22.6 21.5 23.5 20.8 23.5 19.8C23.5 18.8 22.6 18.1 21.2 18.1H17.8V21.5Z" fill="#31A8FF"/>
                  <path d="M28.5 29.2C29.2 30.5 30.8 31.3 32.5 31.3C34.3 31.3 35.3 30.4 35.3 29.2C35.3 26.5 28.8 27.2 28.8 22.5C28.8 20.1 30.8 18.5 33.7 18.5C35.7 18.5 37.3 19.3 38.2 20.7L36 22.3C35.4 21.4 34.5 20.9 33.5 20.9C32.1 20.9 31.3 21.6 31.3 22.4C31.3 24.8 37.8 24.2 37.8 28.8C37.8 31.4 35.6 33.3 32.4 33.3C29.7 33.3 27.6 32 26.5 30.2L28.5 29.2Z" fill="#31A8FF"/>
                </svg>
              </div>
              <span class="theme-card-title">Photoshop</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 6: Blender 3D -->
            <div class="theme-card" data-theme="theme-blender">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" fill="#222222"/>
                  <circle cx="24" cy="27" r="11" fill="#EA7600"/>
                  <circle cx="24" cy="27" r="5.5" fill="#22578A"/>
                  <circle cx="24" cy="27" r="2.5" fill="#FFFFFF"/>
                  <path d="M24 7V16M15 11L21 18M33 11L27 18" stroke="#EA7600" stroke-width="3.8" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="theme-card-title">Blender 3D</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 7: LinkedIn -->
            <div class="theme-card" data-theme="theme-linkedin">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="10" fill="#0A66C2"/>
                  <circle cx="15.5" cy="14.5" r="3" fill="white"/>
                  <rect x="12.5" y="20" width="6" height="15" rx="1" fill="white"/>
                  <path d="M23 20H28.5V22.5C29.4 20.9 31.4 20 34 20C38.4 20 40 22.8 40 27.5V35H34V28.5C34 26.5 33.2 25 31.2 25C29.2 25 28.5 26.5 28.5 28.5V35H23V20Z" fill="white"/>
                </svg>
              </div>
              <span class="theme-card-title">LinkedIn</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 8: AutoCAD -->
            <div class="theme-card" data-theme="theme-autocad">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="10" fill="#1C1E24"/>
                  <path d="M24 6L8 38H17L21 29H31L26 18L24 6Z" fill="#E51937"/>
                  <path d="M24 6L33 24H23L24 6Z" fill="#FA465E"/>
                  <path d="M33 24L40 38H30L26 29L33 24Z" fill="#B81126"/>
                  <path d="M21 29H31L34 35H18L21 29Z" fill="#850B19"/>
                </svg>
              </div>
              <span class="theme-card-title">AutoCAD</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 9: Zalo PC -->
            <div class="theme-card" data-theme="theme-zalo">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="#0068FF"/>
                  <path d="M12 18H24L14 30H26M28 20V30M32 18V30M34 24C34 21.8 35.8 20 38 20C40.2 20 42 21.8 42 24V26C42 28.2 40.2 30 38 30C35.8 30 34 28.2 34 26V24Z" stroke="white" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <span class="theme-card-title">Zalo PC</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 10: Figma -->
            <div class="theme-card" data-theme="theme-figma">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="10" fill="#18181B"/>
                  <g transform="translate(10, 4) scale(0.72)">
                    <path d="M19 28.5C19 23.3 23.3 19 28.5 19C33.7 19 38 23.3 38 28.5C38 33.7 33.7 38 28.5 38C23.3 38 19 33.7 19 28.5Z" fill="#1ABCFE"/>
                    <path d="M0 47.5C0 42.3 4.3 38 9.5 38H19V47.5C19 52.7 14.7 57 9.5 57C4.3 57 0 52.7 0 47.5Z" fill="#0ACF83"/>
                    <path d="M19 0V19H28.5C33.7 19 38 14.7 38 9.5C38 4.3 33.7 0 28.5 0H19Z" fill="#FF7262"/>
                    <path d="M0 9.5C0 14.7 4.3 19 9.5 19H19V0H9.5C4.3 0 0 4.3 0 9.5Z" fill="#F24E1E"/>
                    <path d="M0 28.5C0 33.7 4.3 38 9.5 38H19V19H9.5C4.3 19 0 23.3 0 28.5Z" fill="#A259FF"/>
                  </g>
                </svg>
              </div>
              <span class="theme-card-title">Figma</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 11: Canva -->
            <div class="theme-card" data-theme="theme-canva">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <defs>
                    <linearGradient id="cg_canva" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#00C4CC"/>
                      <stop offset="1" stop-color="#7D2AE8"/>
                    </linearGradient>
                  </defs>
                  <circle cx="24" cy="24" r="22" fill="url(#cg_canva)"/>
                  <path d="M28.5 16C23 16 16 20.5 16 27C16 31.5 19.5 34 23.5 34C28 34 32.5 30.5 33 27C33.2 25.5 32 25.2 31.2 26C29.5 27.8 26.5 29.5 24 29.5C21 29.5 19.8 27.5 20.2 24.5C20.8 20.5 25.2 18.5 28.2 18.5C30.2 18.5 31.2 19.2 30.8 21C30.5 22.2 29.2 22.8 28.2 22.8C27.5 22.8 27 22.5 27.2 21.8C27.5 21 28.8 20.8 28.5 20C28.2 19.2 26.5 19.5 25.5 20.5C23.5 22.5 22.8 25.8 23.8 27.2C24.2 27.8 25.5 27.8 26.5 27C28.5 25.2 31.5 21 32 18C32.2 16.5 30.5 16 28.5 16Z" fill="white"/>
                </svg>
              </div>
              <span class="theme-card-title">Canva</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 12: PowerPoint -->
            <div class="theme-card" data-theme="theme-powerpoint">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect x="16" y="8" width="26" height="32" rx="3" fill="#D24726"/>
                  <circle cx="29" cy="24" r="8" fill="#FF8F6B"/>
                  <path d="M29 16V24H37C37 19.6 33.4 16 29 16Z" fill="#C43E1C"/>
                  <rect x="6" y="12" width="20" height="24" rx="3" fill="#B73A1B" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
                  <path d="M12 18H18C20.5 18 22 19.5 22 22C22 24.5 20.5 26 18 26H15V30H12V18ZM15 23.5H18C19 23.5 19.5 23 19.5 22C19.5 21 19 20.5 18 20.5H15V23.5Z" fill="white"/>
                </svg>
              </div>
              <span class="theme-card-title">PowerPoint</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 13: Thư Viện Pháp Luật -->
            <div class="theme-card" data-theme="theme-thuvienphapluat">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="10" fill="#0C345C"/>
                  <rect x="3" y="3" width="42" height="42" rx="8" stroke="#D4AF37" stroke-width="1.8" fill="none"/>
                  <path d="M24 10V36M18 36H30" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round"/>
                  <path d="M12 16H36" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round"/>
                  <path d="M12 16L7 26H17L12 16Z" fill="#D4AF37" opacity="0.3"/>
                  <path d="M12 16L7 26M12 16L17 26M6 26C6 29 18 29 18 26" stroke="#D4AF37" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M36 16L31 26H41L36 16Z" fill="#D4AF37" opacity="0.3"/>
                  <path d="M36 16L31 26M36 16L41 26M30 26C30 29 42 29 42 26" stroke="#D4AF37" stroke-width="1.8" stroke-linecap="round"/>
                  <circle cx="24" cy="11" r="2.5" fill="#D4AF37"/>
                </svg>
              </div>
              <span class="theme-card-title">Thư Viện Pháp Luật</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 14: Premiere Pro -->
            <div class="theme-card" data-theme="theme-premiere">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#00005B"/><rect x="2" y="2" width="44" height="44" rx="8" fill="none" stroke="#9999FF" stroke-width="2.5"/><path fill="#9999FF" d="M11 14h8c4.2 0 7 2.6 7 6.6s-2.8 6.6-7 6.6h-4.2V34H11V14zm3.8 9.8H19c2.2 0 3.4-1.3 3.4-3.2s-1.2-3.2-3.4-3.2h-4.2v6.4z"/><path fill="#9999FF" d="M28.5 19h3.5v2.6c.9-1.8 2.5-2.9 4.9-2.9v3.8c-3-.2-4.7 1.3-4.7 4.6V34h-3.7V19z"/></svg>
              </div>
              <span class="theme-card-title">Premiere Pro</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 15: Claude AI -->
            <div class="theme-card" data-theme="theme-claude">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#D97757"/><g fill="#FFFFFF" transform="translate(24 24)"><rect x="-1.78" y="-15.75" width="3.57" height="13.65" rx="1.78" transform="rotate(7)"/><rect x="-1.78" y="-12.60" width="3.57" height="10.50" rx="1.78" transform="rotate(37)"/><rect x="-1.78" y="-15.23" width="3.57" height="13.13" rx="1.78" transform="rotate(67)"/><rect x="-1.78" y="-11.55" width="3.57" height="9.45" rx="1.78" transform="rotate(97)"/><rect x="-1.78" y="-16.28" width="3.57" height="14.18" rx="1.78" transform="rotate(127)"/><rect x="-1.78" y="-13.12" width="3.57" height="11.03" rx="1.78" transform="rotate(157)"/><rect x="-1.78" y="-14.70" width="3.57" height="12.60" rx="1.78" transform="rotate(187)"/><rect x="-1.78" y="-12.08" width="3.57" height="9.98" rx="1.78" transform="rotate(217)"/><rect x="-1.78" y="-15.75" width="3.57" height="13.65" rx="1.78" transform="rotate(247)"/><rect x="-1.78" y="-12.60" width="3.57" height="10.50" rx="1.78" transform="rotate(277)"/><rect x="-1.78" y="-15.23" width="3.57" height="13.13" rx="1.78" transform="rotate(307)"/><rect x="-1.78" y="-12.08" width="3.57" height="9.98" rx="1.78" transform="rotate(337)"/></g></svg>
              </div>
              <span class="theme-card-title">Claude AI</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 16: ChatGPT -->
            <div class="theme-card" data-theme="theme-chatgpt">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#000000"/><g transform="translate(10 10) scale(1.1667)"><path fill="#FFFFFF" d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></g></svg>
              </div>
              <span class="theme-card-title">ChatGPT</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 17: Teams -->
            <div class="theme-card" data-theme="theme-teams">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#464EB8"/><path d="M28 14C29.65 14 31 15.35 31 17C31 18.65 29.65 20 28 20C26.35 20 25 18.65 25 17C25 15.35 26.35 14 28 14Z" fill="#7B83EB"/><path d="M33 21H23C21.9 21 21 21.9 21 23V27C21 27.5 21.5 28 22 28H23V31L26 28H33C34.1 28 35 27.1 35 26V23C35 21.9 34.1 21 33 21Z" fill="#7B83EB"/><circle cx="19" cy="18" r="4.5" fill="#FFFFFF"/><path d="M12 24C10.9 24 10 24.9 10 26V32C10 32.5 10.5 33 11 33H13V37L17 33H25C26.1 33 27 32.1 27 31V26C27 24.9 26.1 24 25 24H12Z" fill="#FFFFFF"/></svg>
              </div>
              <span class="theme-card-title">Teams</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 18: Revit BIM -->
            <div class="theme-card" data-theme="theme-revit">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="10" fill="#005A9C"/>
                  <path d="M12 10H25C30 10 34 13.5 34 18C34 21.5 31.5 24.2 27.8 25.4L35 38H27.5L21.2 26.5H18V38H12V10ZM18 21.5H24.5C26.8 21.5 28.5 20.2 28.5 18.2C28.5 16.2 26.8 15 24.5 15H18V21.5Z" fill="white"/>
                  <path d="M26 26L34 38H28L21 26.5L26 26Z" fill="#70C0E7" opacity="0.7"/>
                </svg>
              </div>
              <span class="theme-card-title">Revit BIM</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 19: MISA SME -->
            <div class="theme-card" data-theme="theme-misa">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <path d="M24 3L38 17L28 24L24 16L20 24L10 17L24 3Z" fill="#E51937"/>
                  <path d="M45 24L31 38L24 28L32 24L24 20L31 10L45 24Z" fill="#FF9800"/>
                  <path d="M24 45L10 31L20 24L24 32L28 24L38 31L24 45Z" fill="#1976D2"/>
                  <path d="M3 24L17 10L24 20L16 24L24 28L17 38L3 24Z" fill="#4CAF50"/>
                  <circle cx="24" cy="24" r="5" fill="#FFFFFF"/>
                </svg>
              </div>
              <span class="theme-card-title">MISA SME</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 20: CapCut Pro -->
            <div class="theme-card" data-theme="theme-capcut">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="10" fill="#000000"/>
                  <path d="M10 14L22 22V26L10 34V14Z" fill="#00F2FE"/>
                  <path d="M38 14L26 22V26L38 34V14Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <span class="theme-card-title">CapCut Pro</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 21: SAP GUI -->
            <div class="theme-card" data-theme="theme-sap">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="8" fill="#00386B"/>
                  <path d="M10 12h28l-8 24H2l8-24z" fill="#007DB8"/>
                  <text x="24" y="31" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="1">SAP</text>
                </svg>
              </div>
              <span class="theme-card-title">SAP GUI</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 22: Gmail -->
            <div class="theme-card" data-theme="theme-gmail">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M4.5 38.5V13.8L24 27.5l19.5-13.7v24.7c0 2.2-1.8 4-4 4H8.5c-2.2 0-4-1.8-4-4z"/>
                  <path fill="#34A853" d="M43.5 13.8v24.7c0 2.2-1.8 4-4 4h-5V20.5l9-6.7z"/>
                  <path fill="#4285F4" d="M4.5 13.8v24.7c0 2.2 1.8 4 4 4h5V20.5l-9-6.7z"/>
                  <path fill="#EA4335" d="M13.5 5.5L24 14.5l10.5-9h-21z"/>
                  <path fill="#FBBC05" d="M4.5 9.5C4.5 7.3 6.3 5.5 8.5 5.5h5l-9 8.3v-4.3z"/>
                  <path fill="#C5221F" d="M43.5 9.5c0-2.2-1.8-4-4-4h-5l9 8.3v-4.3z"/>
                  <path fill="#EA4335" d="M4.5 13.8L24 27.5 43.5 13.8 24 29 4.5 13.8z"/>
                </svg>
              </div>
              <span class="theme-card-title">Gmail</span>
              <div class="theme-card-check">✓</div>
            </div>
            <!-- Theme 23: Outlook -->
            <div class="theme-card" data-theme="theme-outlook">
              <div class="theme-card-icon">
                <svg width="34" height="34" viewBox="0 0 48 48">
                  <rect x="14" y="8" width="28" height="32" rx="4" fill="#0078D4"/>
                  <path d="M14 14l14 10 14-10v22a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V14z" fill="#28A8EA" opacity="0.6"/>
                  <path d="M14 14l14 10 14-10" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="6" y="12" width="22" height="24" rx="4" fill="#005A9E"/>
                  <circle cx="17" cy="24" r="6.5" fill="none" stroke="#FFFFFF" stroke-width="3.2"/>
                </svg>
              </div>
              <span class="theme-card-title">Outlook</span>
              <div class="theme-card-check">✓</div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <a href="index.html?portal=1" class="portal-nav-btn" id="btn-modal-to-portal" style="border-radius: 6px; padding: 7px 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">🏠 Về Trang Chủ</a>
          <button class="primary-btn" id="btn-confirm-theme">Áp Dụng Giao Diện Này</button>
        </div>
      </div>
    </div>
  `;
}

function ensureThemeModalComponent() {
  let modal = document.getElementById('theme-modal');
  if (modal) return modal;

  const temp = document.createElement('div');
  temp.innerHTML = getThemePickerModalHTML().trim();
  modal = temp.firstElementChild;
  document.body.appendChild(modal);

  attachThemeModalEvents(modal);
  return modal;
}

function attachThemeModalEvents(modal) {
  if (!modal) return;

  const closeBtn = modal.querySelector('#btn-close-theme-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeThemeModal);
  }

  const confirmBtn = modal.querySelector('#btn-confirm-theme');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      closeThemeModal();
      navigateToThemePage(state.theme);
    });
  }

  const portalBtn = modal.querySelector('#btn-modal-to-portal');
  if (portalBtn) {
    portalBtn.addEventListener('click', (e) => {
      const portal = document.getElementById('landing-portal');
      if (portal) {
        e.preventDefault();
        closeThemeModal();
        openPortal(true);
        updatePortalThemeUI(state.theme);
        updatePortalUploadUI();
      } else {
        e.preventDefault();
        closeThemeModal();
        goToHomePage();
      }
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeThemeModal();
    }
  });

  modal.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      modal.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const chosenTheme = card.getAttribute('data-theme');
      state.theme = chosenTheme;
    });

    card.addEventListener('dblclick', () => {
      const chosenTheme = card.getAttribute('data-theme');
      state.theme = chosenTheme;
      closeThemeModal();
      navigateToThemePage(chosenTheme);
    });
  });
}

function getStealthSettingsModalHTML() {
  return `
  <div class="stealth-modal-overlay" id="stealth-modal">
    <div class="stealth-modal-content">
      <div class="modal-header">
        <h3>⚙️ Cài Đặt Bộ Đọc Truyện</h3>
        <button class="modal-close-btn" id="btn-close-modal">✕</button>
      </div>
      <div class="modal-body">
        <div class="settings-group">
          <h4>1. Nạp tài liệu đọc</h4>
          <p class="guide-text">Chọn file PDF, TXT hoặc EPUB. Nội dung được xử lý trực tiếp trên thiết bị của bạn.</p>
          <div class="file-drop-area" id="modal-drop-area">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#0F9D58"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
            <p>Kéo & thả file PDF, TXT, EPUB vào đây hoặc <span class="browse-link">Chọn tệp</span></p>
            <input type="file" id="modal-file-pdf" accept=".pdf,.txt,.epub,application/pdf,text/plain,application/epub+zip">
          </div>
        </div>

        <div class="settings-group">
          <h4>2. Tùy Chỉnh Cỡ Chữ &amp; Hiển Thị Đọc Truyện</h4>
          <p class="guide-text">Tăng giảm cỡ chữ và khoảng cách dòng để tối ưu trải nghiệm đọc êm mắt nhất:</p>

          <div class="font-settings-group">
            <div class="font-settings-row">
              <span style="font-weight: 600; width: 90px; color: #3c4043;">Cỡ chữ:</span>
              <button class="font-step-ctrl-btn" id="modal-btn-font-dec" title="Giảm cỡ chữ (hoặc nhấn phím [)">A−</button>
              <span class="font-size-badge" id="modal-badge-font-size">11pt</span>
              <button class="font-step-ctrl-btn" id="modal-btn-font-inc" title="Tăng cỡ chữ (hoặc nhấn phím ])">A+</button>
              <input type="range" id="modal-slider-font-size" class="font-slider" min="8" max="28" step="1" value="11" title="Kéo để đổi cỡ chữ nhanh">
            </div>

            <div class="font-settings-row">
              <span style="font-weight: 600; width: 90px; color: #3c4043;">Giãn dòng:</span>
              <select id="modal-select-line-height" class="gd-select" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #dadce0;">
                <option value="1.4">1.4 (Gọn gàng)</option>
                <option value="1.6">1.6 (Tiêu chuẩn)</option>
                <option value="1.75" selected>1.75 (Tối ưu êm mắt - Tỷ lệ vàng)</option>
                <option value="2.0">2.0 (Thông thoáng)</option>
              </select>
            </div>

            <div class="font-settings-row">
              <span style="font-weight: 600; width: 90px; color: #3c4043;">Phông chữ:</span>
              <select id="modal-select-font-family" class="gd-select" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #dadce0;">
                <option value="Arial">Arial (Mặc định chuẩn)</option>
                <option value="Roboto">Roboto (Google)</option>
                <option value="Calibri" selected>Calibri (Văn phòng Excel)</option>
                <option value="Segoe UI">Segoe UI (Hiện đại)</option>
                <option value="Times New Roman">Times New Roman (Cổ điển)</option>
                <option value="Georgia">Georgia (Truyện chữ)</option>
              </select>
            </div>
          </div>
          <p class="guide-text" style="margin-top: 8px; font-size: 11px; color: #5f6368;">
            <b>Mẹo đọc nhanh:</b> Nhấn phím <kbd style="padding: 1px 5px; font-size: 11px;">[</kbd> để giảm cỡ chữ, phím <kbd style="padding: 1px 5px; font-size: 11px;">]</kbd> để tăng cỡ chữ trực tiếp khi đang đọc!
          </p>
        </div>

        <div class="settings-group">
          <h4>3. Phím Tắt Khẩn Cấp (Boss Key) &amp; Điều Khiển</h4>
          <ul class="hotkey-list">
            <li><kbd>ESC</kbd> hoặc <kbd>F2</kbd> : Chuyển ngay sang bảng số liệu tài chính doanh thu hoặc code backend thuật toán (bấm lại để đọc tiếp).</li>
            <li><kbd>[</kbd> / <kbd>]</kbd> : Giảm / tăng cỡ chữ nhanh khi đang đọc.</li>
            <li><kbd>↓</kbd> hoặc <kbd>J</kbd> : Chuyển sang câu/dòng tiếp theo.</li>
            <li><kbd>↑</kbd> hoặc <kbd>K</kbd> : Lùi lại dòng trước.</li>
            <li><kbd>PageDown</kbd> / <kbd>PageUp</kbd> : Sang phần đọc tiếp theo / phần trước.</li>
            <li><kbd>Space</kbd> : Bật / tắt chế độ tự động cuộn (Auto-advance).</li>
            <li><kbd>H</kbd> : Ẩn / hiện toàn bộ thanh điều khiển đọc.</li>
          </ul>
        </div>

        <div class="settings-group">
          <h4>4. Đóng góp ý kiến &amp; Báo lỗi (Google Form)</h4>
          <p class="guide-text">Bạn muốn đề xuất tính năng mới hoặc gặp lỗi trong quá trình sử dụng? Hãy gửi ý kiến cho tác giả qua biểu mẫu Google Form:</p>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 10px;">
            <button class="primary-btn" id="btn-open-feedback-settings" style="padding: 7px 16px; font-size: 12px;">
              💬 Mở Google Form Góp Ý
            </button>
            <button class="primary-btn duo-btn-progress-settings" id="btn-open-progress-settings" style="padding: 7px 16px; font-size: 12px;" title="Xem bảng theo dõi tiến độ cập nhật trên Google Sheets">
              📊 Tiến Độ Cập Nhật
            </button>
            <button class="portal-nav-btn" id="btn-config-feedback-url" style="padding: 7px 12px; font-size: 11px;" title="Cài đặt đường link Google Form (dành cho Admin)">
              ⚙️ Cài đặt link
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="primary-btn" id="btn-save-settings">Đóng</button>
      </div>
    </div>
  </div>`;
}

function ensureSharedReaderComponents() {
  if (!document.body) return;

  // 1. Hidden File Input for PDF / TXT / EPUB
  if (!document.getElementById('file-pdf-input')) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'file-pdf-input';
    fileInput.accept = '.pdf,.txt,.epub,application/pdf,text/plain,application/epub+zip';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
  }

  // 2. Page Flip Toast
  if (!document.getElementById('page-flip-toast')) {
    const toast = document.createElement('div');
    toast.id = 'page-flip-toast';
    toast.className = 'page-flip-toast';
    document.body.appendChild(toast);
  }

  // 3. Floating Controls Visibility Toggle
  if (!document.getElementById('btn-toggle-ctrls-floating')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'btn-toggle-ctrls-floating';
    toggleBtn.className = 'floating-stealth-toggle';
    toggleBtn.title = 'Ẩn/Hiện nút điều khiển đọc (Phím tắt: H)';
    toggleBtn.innerHTML = '<span class="stealth-toggle-icon">👁</span><span class="stealth-toggle-text">Điều khiển (H)</span>';
    document.body.appendChild(toggleBtn);
  }

  // 4. Loading Spinner Overlay
  if (!document.getElementById('loading-spinner')) {
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.className = 'loading-overlay';
    spinner.style.display = 'none';
    spinner.innerHTML = `
      <div class="loading-box">
        <div class="spinner"></div>
        <p id="loading-status-text">Đang trích xuất nội dung tài liệu...</p>
      </div>`;
    document.body.appendChild(spinner);
  }

  // 5. Stealth Settings & Help Modal
  if (!document.getElementById('stealth-modal')) {
    const temp = document.createElement('div');
    temp.innerHTML = getStealthSettingsModalHTML().trim();
    if (temp.firstElementChild) {
      document.body.appendChild(temp.firstElementChild);
    }
  }
}

function initThemeSystem() {
  applyTheme(state.theme);
  ensureThemeModalComponent();

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
    'btn-open-theme-modal-thuvienphapluat',
    'btn-open-theme-modal-capcut',
    'btn-open-theme-modal-sap'
  ];
  openButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', openThemeModal);
  });
}

function openThemeModal() {
  const modal = ensureThemeModalComponent();
  if (!modal) return;

  modal.querySelectorAll('.theme-card').forEach(card => {
    const isMatch = card.getAttribute('data-theme') === state.theme;
    card.classList.toggle('active', isMatch);
  });

  modal.classList.add('show');
}

function closeThemeModal() {
  const modal = document.getElementById('theme-modal');
  if (modal) modal.classList.remove('show');
}

function setDocumentTitle(title) {
  const path = window.location.pathname.toLowerCase();
  const isIndexPage = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
  const portal = document.getElementById('landing-portal');
  const isPortalVisible = portal ? !portal.classList.contains('hidden') : isIndexPage;

  if (isIndexPage && isPortalVisible) {
    document.title = 'web ngụy trang đọc truyện trong giờ làm việc';
  } else {
    document.title = title;
  }
}

function applyTheme(themeName) {
  state.theme = themeName;
  const isHidden = document.body.classList.contains('controls-hidden') || localStorage.getItem('stealth_controls_hidden') === '1';
  document.body.className = `${themeName} has-pinned-navbar ${isHidden ? 'controls-hidden' : ''}`.trim();
  StealthImageManager.init();

  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-theme') === themeName);
  });

  const favicon = document.getElementById('app-favicon');
  if (favicon && FAVICONS[themeName]) {
    favicon.href = FAVICONS[themeName];
  }

  const storyLabel = document.getElementById('tab-story-label');
  const headerTitle = document.getElementById('story-header-title');

  const path = window.location.pathname.toLowerCase();
  const isIndexPage = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
  const portal = document.getElementById('landing-portal');
  const isPortalVisible = portal ? !portal.classList.contains('hidden') : isIndexPage;

  if (isIndexPage && isPortalVisible) {
    document.title = 'web ngụy trang đọc truyện trong giờ làm việc';
  }

const THEME_DOC_CONFIGS = {
  'theme-googlesheets': {
    prop: 'gsheetTitle',
    defaultTitle: 'Báo cáo số liệu & Phân tích KPI Q3',
    formatTabTitle: t => `${t} - Google Trang tính`,
    titleId: 'gsheet-doc-title',
    init: () => {
      state.readingMode = 'grid';
      const storyLabel = document.getElementById('tab-story-label');
      const headerTitle = document.getElementById('story-header-title');
      if (storyLabel) storyLabel.textContent = localStorage.getItem('stealth_sheet_gsheet_0') || 'Trang tính1';
      if (headerTitle) headerTitle.textContent = localStorage.getItem('stealth_header_title_gsheet') || 'Log Description & Execution Details';
    }
  },
  'theme-googledocs': {
    prop: 'gdocsTitle',
    defaultTitle: 'Báo cáo Tổng kết Hoạt động & Kế hoạch Phát triển Q3',
    formatTabTitle: t => `${t} - Google Tài liệu`,
    titleId: 'gdocs-doc-title'
  },
  'theme-excel': {
    prop: 'excelTitle',
    defaultTitle: 'Bao_Cao_Kiem_Toan_Q3_2026.xlsx',
    formatTabTitle: t => `${t} - Excel`,
    titleId: 'excel-doc-title',
    init: () => {
      const storyLabel = document.getElementById('tab-story-label');
      const headerTitle = document.getElementById('story-header-title');
      if (storyLabel) storyLabel.textContent = localStorage.getItem('stealth_sheet_excel_0') || 'Audit_Finding_Q3';
      if (headerTitle) headerTitle.textContent = localStorage.getItem('stealth_header_title_excel') || 'Audit Log Finding & Notes (Story Text)';
    }
  },
  'theme-vscode': {
    prop: 'vscodeTitle',
    defaultTitle: 'stream_pipeline_processor.py',
    formatTabTitle: t => `${t} - dev_workspace - Visual Studio Code`,
    titleId: 'vsc-title-doc',
    init: t => {
      const tabName = document.getElementById('vsc-tab-filename');
      if (tabName) tabName.textContent = t;
    }
  },
  'theme-photoshop': {
    prop: 'photoshopTitle',
    defaultTitle: 'Brand_Campaign_KeyVisual_v2.psd',
    formatTabTitle: t => `${t} @ 66.7% (RGB/8#*) - Adobe Photoshop 2026`,
    titleId: 'ps-doc-title'
  },
  'theme-blender': {
    prop: 'blenderTitle',
    defaultTitle: 'cyberpunk_city_scene_v4.blend',
    formatTabTitle: t => `${t} - Blender 4.2.0`,
    titleId: 'blender-doc-title'
  },
  'theme-linkedin': {
    formatTabTitle: () => 'Feed | LinkedIn'
  },
  'theme-autocad': {
    prop: 'autocadTitle',
    defaultTitle: 'LAYOUT_MASTER_PLAN_Q3.dwg',
    formatTabTitle: t => `${t} - Autodesk AutoCAD 2026`,
    titleId: 'autocad-doc-title'
  },
  'theme-zalo': {
    prop: 'zaloTitle',
    defaultTitle: 'Dự án Sprint Q3 - Tech Lead & Team Sync',
    formatTabTitle: t => `${t} - Zalo`,
    titleId: 'zalo-doc-title'
  },
  'theme-figma': {
    prop: 'figmaTitle',
    defaultTitle: 'Mobile_Banking_Design_System_v4.2',
    formatTabTitle: t => `${t} – Figma`,
    titleId: 'figma-doc-title'
  },
  'theme-canva': {
    prop: 'canvaTitle',
    defaultTitle: 'Báo Cáo Chiến Lược Thương Hiệu 2026',
    formatTabTitle: t => `${t} - Canva`,
    titleId: 'canva-doc-title'
  },
  'theme-powerpoint': {
    prop: 'powerpointTitle',
    defaultTitle: 'Q3_Business_Review_Strategic_Plan.pptx',
    formatTabTitle: t => `${t} - PowerPoint`,
    titleId: 'ppt-doc-title'
  },
  'theme-thuvienphapluat': {
    prop: 'tvplTitle',
    defaultTitle: 'SỬA ĐỔI, BỔ SUNG MỘT SỐ ĐIỀU CỦA CÁC NGHỊ ĐỊNH QUY ĐỊNH CHI TIẾT MỘT SỐ ĐIỀU VÀ BIỆN PHÁP THI HÀNH LUẬT ĐẤU THẦU VỀ LỰA CHỌN NHÀ THẦU',
    formatTabTitle: () => 'Nghị định 349/2026/NĐ-CP sửa đổi các Nghị định hướng dẫn Luật Đấu thầu - THƯ VIỆN PHÁP LUẬT',
    titleId: 'tvpl-doc-title'
  },
  'theme-premiere': {
    prop: 'premiereTitle',
    defaultTitle: 'Adobe Premiere Pro 2026 - D:\\Projects\\Brand_Film_Q3\\Brand_Film_Q3.prproj *',
    formatTabTitle: t => t,
    titleId: 'premiere-doc-title',
    init: () => {
      const prProj = document.getElementById('premiere-proj-name');
      if (prProj) prProj.textContent = localStorage.getItem('stealth_premiere_proj_name') || 'Brand_Film_Q3';
    }
  },
  'theme-claude': {
    prop: 'claudeTitle',
    defaultTitle: 'Phân tích báo cáo tài chính Q3',
    formatTabTitle: t => `${t} - Claude`,
    titleId: 'claude-doc-title'
  },
  'theme-chatgpt': {
    prop: 'chatgptTitle',
    defaultTitle: 'ChatGPT 5',
    formatTabTitle: t => `${t} - ChatGPT`,
    titleId: 'chatgpt-doc-title'
  },
  'theme-teams': {
    prop: 'teamsTitle',
    defaultTitle: 'Dong Mia',
    formatTabTitle: t => `${t} | Chat | Microsoft Teams`,
    titleId: 'teams-doc-title'
  },
  'theme-revit': {
    prop: 'revitTitle',
    defaultTitle: 'arch_buildinga1_144104999.rvt',
    formatTabTitle: t => `${t} - 3D View: 3D - West Facade Room Detail - Autodesk Revit 2025`,
    titleId: 'revit-doc-title'
  },
  'theme-misa': {
    formatTabTitle: () => 'MISA SME.NET 2021 - [Bán hàng - Đơn đặt hàng]'
  },
  'theme-capcut': {
    prop: 'capcutTitle',
    defaultTitle: 'CapCut Pro - Draft_Project_0928_Vlog',
    formatTabTitle: t => t,
    titleId: 'capcut-doc-title'
  },
  'theme-sap': {
    prop: 'sapTitle',
    defaultTitle: 'Display Purchase Order 4500192834',
    formatTabTitle: t => `SAP GUI for Windows 8.0 - [ME23N - ${t}]`,
    titleId: 'sap-doc-title'
  },
  'theme-gmail': {
    prop: 'gmailTitle',
    defaultTitle: '[Kế hoạch Sprint Q3] Báo cáo tiến độ phân tích & đặc tả yêu cầu hệ thống',
    formatTabTitle: () => 'Hộp thư đến (14) - minhquan.techlead@gmail.com - Gmail',
    titleId: 'gmail-doc-title'
  },
  'theme-outlook': {
    prop: 'outlookTitle',
    defaultTitle: '[Dự án 2026] Báo cáo tiến độ phân tích hệ thống & tài liệu đặc tả',
    formatTabTitle: () => 'Hộp thư đến - minhquan@outlook.com - Outlook',
    titleId: 'outlook-doc-title'
  }
};

  const docCfg = THEME_DOC_CONFIGS[themeName];
  if (docCfg) {
    const docTitle = docCfg.prop ? (state[docCfg.prop] || docCfg.defaultTitle) : '';
    if (docCfg.formatTabTitle) setDocumentTitle(docCfg.formatTabTitle(docTitle));
    if (docCfg.titleId) {
      const el = document.getElementById(docCfg.titleId);
      if (el) el.textContent = docTitle;
    }
    if (docCfg.init) docCfg.init(docTitle);
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

  const tvTitle = document.getElementById('tvpl-doc-title');
  if (tvTitle) {
    tvTitle.addEventListener('blur', () => {
      let val = tvTitle.textContent.trim();
      if (!val) val = 'SỬA ĐỔI, BỔ SUNG MỘT SỐ ĐIỀU CỦA CÁC NGHỊ ĐỊNH QUY ĐỊNH CHI TIẾT MỘT SỐ ĐIỀU VÀ BIỆN PHÁP THI HÀNH LUẬT ĐẤU THẦU VỀ LỰA CHỌN NHÀ THẦU';
      tvTitle.textContent = val;
      state.tvplTitle = val;
      localStorage.setItem('stealth_title_tvpl', val);
      if (state.theme === 'theme-thuvienphapluat') {
        document.title = `Nghị định 349/2026/NĐ-CP sửa đổi các Nghị định hướng dẫn Luật Đấu thầu - THƯ VIỆN PHÁP LUẬT`;
      }
      showPageFlipToast(`✅ Đã đổi tiêu đề văn bản TVPL: <b>${escapeHtml(val)}</b>`);
    });
    tvTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        tvTitle.blur();
      }
    });
  }

  const prTitle = document.getElementById('premiere-doc-title');
  if (prTitle) {
    prTitle.addEventListener('blur', () => {
      let val = prTitle.textContent.trim();
      if (!val) val = 'Adobe Premiere Pro 2026 - D:\\Projects\\Brand_Film_Q3\\Brand_Film_Q3.prproj *';
      prTitle.textContent = val;
      state.premiereTitle = val;
      localStorage.setItem('stealth_title_premiere', val);
      if (state.theme === 'theme-premiere') {
        document.title = val;
      }
      showPageFlipToast(`✅ Đã đổi đường dẫn Premiere: <b>${escapeHtml(val)}</b>`);
    });
    prTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        prTitle.blur();
      }
    });
  }

  const clTitle = document.getElementById('claude-doc-title');
  if (clTitle) {
    clTitle.addEventListener('blur', () => {
      let val = clTitle.textContent.trim();
      if (!val) val = 'Phân tích báo cáo tài chính Q3';
      clTitle.textContent = val;
      state.claudeTitle = val;
      localStorage.setItem('stealth_title_claude', val);
      if (state.theme === 'theme-claude') {
        document.title = `${val} - Claude`;
      }
      // Sync first recent chat
      const firstRecent = document.querySelector('.cl-recent .stealth-editable');
      if (firstRecent) {
        firstRecent.textContent = val;
        localStorage.setItem('stealth_claude_recent_0', val);
      }
      showPageFlipToast(`✅ Đã đổi tiêu đề Claude: <b>${escapeHtml(val)}</b>`);
    });
    clTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clTitle.blur();
      }
    });
  }

  const gptTitle = document.getElementById('chatgpt-doc-title');
  if (gptTitle) {
    gptTitle.addEventListener('blur', () => {
      let val = gptTitle.textContent.trim();
      if (!val) val = 'ChatGPT 5';
      gptTitle.textContent = val;
      state.chatgptTitle = val;
      localStorage.setItem('stealth_title_chatgpt', val);
      if (state.theme === 'theme-chatgpt') {
        document.title = `${val} - ChatGPT`;
      }
      showPageFlipToast(`✅ Đã đổi tiêu đề ChatGPT: <b>${escapeHtml(val)}</b>`);
    });
    gptTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        gptTitle.blur();
      }
    });
  }

  const teamsTitle = document.getElementById('teams-doc-title');
  if (teamsTitle) {
    teamsTitle.addEventListener('blur', () => {
      let val = teamsTitle.textContent.trim();
      if (!val) val = 'Dong Mia';
      teamsTitle.textContent = val;
      state.teamsTitle = val;
      localStorage.setItem('stealth_title_teams', val);
      if (state.theme === 'theme-teams') {
        document.title = `${val} | Chat | Microsoft Teams`;
      }
      showPageFlipToast(`✅ Đã đổi người trò chuyện Teams: <b>${escapeHtml(val)}</b>`);
    });
    teamsTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        teamsTitle.blur();
      }
    });
  }

  const revitTitle = document.getElementById('revit-doc-title');
  if (revitTitle) {
    revitTitle.addEventListener('blur', () => {
      let val = revitTitle.textContent.trim();
      if (!val) val = 'arch_buildinga1_144104999.rvt';
      if (!val.toLowerCase().endsWith('.rvt')) val += '.rvt';
      revitTitle.textContent = val;
      state.revitTitle = val;
      localStorage.setItem('stealth_title_revit', val);
      if (state.theme === 'theme-revit') {
        document.title = `${val} - 3D View: 3D - West Facade Room Detail - Autodesk Revit 2025`;
      }
      showPageFlipToast(`✅ Đã đổi tên dự án Revit: <b>${escapeHtml(val)}</b>`);
    });
    revitTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        revitTitle.blur();
      }
    });
  }

  const capcutTitle = document.getElementById('capcut-doc-title');
  if (capcutTitle) {
    capcutTitle.addEventListener('blur', () => {
      let val = capcutTitle.textContent.trim();
      if (!val) val = 'CapCut Pro - Draft_Project_0928_Vlog';
      capcutTitle.textContent = val;
      state.capcutTitle = val;
      localStorage.setItem('stealth_title_capcut', val);
      if (state.theme === 'theme-capcut') {
        document.title = val;
      }
      showPageFlipToast(`✅ Đã đổi tên dự án CapCut: <b>${escapeHtml(val)}</b>`);
    });
    capcutTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        capcutTitle.blur();
      }
    });
  }

  const sapTitle = document.getElementById('sap-doc-title');
  if (sapTitle) {
    sapTitle.addEventListener('blur', () => {
      let val = sapTitle.textContent.trim();
      if (!val) val = 'Display Purchase Order 4500192834';
      sapTitle.textContent = val;
      state.sapTitle = val;
      localStorage.setItem('stealth_title_sap', val);
      if (state.theme === 'theme-sap') {
        document.title = `SAP GUI for Windows 8.0 - [ME23N - ${val}]`;
      }
      showPageFlipToast(`✅ Đã đổi tiêu đề chứng từ SAP: <b>${escapeHtml(val)}</b>`);
    });
    sapTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sapTitle.blur();
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

function showPortalUploadProgress(title, detail = 'Đang đọc dữ liệu...', percent = 0) {
  const progressBox = document.getElementById('portal-upload-progress');
  const titleEl = document.getElementById('portal-progress-title');
  const detailEl = document.getElementById('portal-progress-detail');
  const percentEl = document.getElementById('portal-progress-percent');
  const fillEl = document.getElementById('portal-progress-fill');
  const enterBtn = document.getElementById('btn-portal-enter');

  if (progressBox) progressBox.style.display = 'flex';
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  if (percentEl) percentEl.textContent = `${Math.round(safePercent)}%`;
  if (fillEl) fillEl.style.width = `${safePercent}%`;

  if (enterBtn) {
    enterBtn.classList.remove('ready');
    enterBtn.classList.add('disabled-need-file');
    enterBtn.innerHTML = `<div class="portal-btn-spinner"></div> <span>Đang nạp truyện (${Math.round(safePercent)}%)...</span>`;
  }
}

function updatePortalUploadProgress(percent, detail = '') {
  const percentEl = document.getElementById('portal-progress-percent');
  const fillEl = document.getElementById('portal-progress-fill');
  const detailEl = document.getElementById('portal-progress-detail');
  const enterBtn = document.getElementById('btn-portal-enter');

  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  if (percentEl) percentEl.textContent = `${Math.round(safePercent)}%`;
  if (fillEl) fillEl.style.width = `${safePercent}%`;
  if (detail && detailEl) detailEl.textContent = detail;

  if (enterBtn && enterBtn.querySelector('.portal-btn-spinner')) {
    const span = enterBtn.querySelector('span');
    if (span) span.textContent = `Đang nạp truyện (${Math.round(safePercent)}%)...`;
  }
}

function hidePortalUploadProgress() {
  const progressBox = document.getElementById('portal-upload-progress');
  if (progressBox) progressBox.style.display = 'none';
}

async function selectPortalBook(docId) {
  if (docId === getCurrentDocumentId()) return;
  try {
    const cache = await readDocumentCacheById(docId);
    if (!cache || !isValidCachedDocument(cache)) {
      showReaderError('Không thể mở truyện', 'Dữ liệu truyện trong bộ nhớ bị lỗi hoặc không đầy đủ.');
      return;
    }
    applyCachedDocument(cache);
    await setActiveDocumentCache(docId);
    saveState();

    // Cập nhật giao diện tại chỗ (in-place) để giữ nguyên vị trí, không đảo lộn danh sách
    const container = document.getElementById('portal-upload-content');
    if (container) {
      container.querySelectorAll('.portal-book-item').forEach(item => {
        const itemId = item.getAttribute('data-doc-id');
        const isCurrent = itemId === docId;
        item.classList.toggle('selected', isCurrent);

        const radio = item.querySelector('.portal-book-radio');
        if (radio) {
          radio.innerHTML = isCurrent
            ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : '';
        }

        const pill = item.querySelector('.portal-book-pill');
        if (pill) {
          pill.classList.toggle('active', isCurrent);
          pill.textContent = isCurrent ? 'Đang chọn' : 'Chọn đọc';
        }
      });
    }

    const enterBtn = document.getElementById('btn-portal-enter');
    if (enterBtn) {
      enterBtn.classList.remove('disabled-need-file');
      enterBtn.classList.add('ready');
      enterBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 1 3-3h7z"/></svg> <span>Bắt Đầu Đọc Ngay</span>`;
      enterBtn.title = `Bắt đầu đọc: ${state.pdfFileName || 'Truyện đã chọn'}`;
    }

    const portalNameLabel = document.getElementById('portal-pdf-filename');
    if (portalNameLabel) {
      portalNameLabel.textContent = state.pdfFileName || '';
    }

    showPageFlipToast(`Đã chọn: ${state.pdfFileName}`);
  } catch (err) {
    console.error('Lỗi khi chuyển truyện:', err);
    showReaderError('Lỗi', 'Không thể chuyển sang truyện đã chọn.');
  }
}

async function deletePortalBook(docId, docTitle) {
  if (!window.confirm(`Bạn có chắc muốn xóa truyện "${docTitle || 'này'}" khỏi danh sách?`)) {
    return;
  }
  try {
    await deleteDocumentCache(docId);
    showPageFlipToast('Đã xóa truyện khỏi danh sách.');

    if (docId === getCurrentDocumentId()) {
      const remaining = await listDocumentCaches();
      if (remaining.length > 0) {
        const nextCache = await readDocumentCacheById(remaining[0].documentId);
        if (nextCache && isValidCachedDocument(nextCache)) {
          applyCachedDocument(nextCache);
          await persistDocumentCache();
          saveState();
        }
      } else {
        state.documentId = '';
        state.pdfFileName = '';
        state.allChunks = [];
        state.totalPages = 0;
        state.documentToc = [];
        state.pageStartIndices = { 1: 0 };
        sessionStorage.removeItem(ACTIVE_DOCUMENT_SESSION_KEY);
        saveState();
      }
    }
  } catch (err) {
    console.error('Lỗi khi xóa truyện:', err);
    showPageFlipToast('⚠️ Không thể xóa truyện.');
  } finally {
    await updatePortalUploadUI();
  }
}

async function updatePortalUploadUI() {
  const uploadCard = document.getElementById('portal-upload-card') || document.querySelector('.duo-upload-quest');
  const enterBtn = document.getElementById('btn-portal-enter');
  if (!uploadCard && !enterBtn) return;

  let records = [];
  try {
    records = await listDocumentCaches();
  } catch (e) {
    console.warn('Không thể đọc danh sách truyện:', e);
  }

  // If there are cached records, but no active document loaded in state, load latest
  if (records.length > 0 && !hasLoadedDocument()) {
    try {
      const activeCache = await readDocumentCacheById(records[0].documentId);
      if (activeCache && isValidCachedDocument(activeCache)) {
        applyCachedDocument(activeCache);
      }
    } catch (e) {
      console.warn('Lỗi khi tải truyện gần nhất:', e);
    }
  }

  const hasDoc = hasLoadedDocument() || records.length > 0;
  const currentDocId = getCurrentDocumentId();

  if (uploadCard) {
    uploadCard.classList.toggle('has-doc', hasDoc);
    uploadCard.classList.toggle('no-doc', !hasDoc);
  }

  if (enterBtn) {
    if (hasDoc) {
      enterBtn.classList.remove('disabled-need-file');
      enterBtn.classList.add('ready');
      enterBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> <span>Bắt Đầu Đọc Ngay</span>`;
      enterBtn.title = `Bắt đầu đọc: ${state.pdfFileName || 'Truyện đã chọn'}`;
    } else {
      enterBtn.classList.add('disabled-need-file');
      enterBtn.classList.remove('ready');
      enterBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <span>Cần nạp file truyện để bắt đầu đọc</span>`;
      enterBtn.title = 'Vui lòng nạp file truyện (PDF, TXT, EPUB) trước khi bắt đầu đọc';
    }
  }

  const container = document.getElementById('portal-upload-content');
  if (!container) return;

  if (records.length === 0 && !hasLoadedDocument()) {
    container.innerHTML = `
      <div class="duo-upload-badge-tag" id="portal-upload-badge">
        <span class="badge-icon" id="portal-upload-badge-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </span>
        <span class="badge-text" id="portal-upload-badge-text">BƯỚC 1: NẠP FILE TRUYỆN ĐỂ BẮT ĐẦU</span>
      </div>
      <div class="duo-upload-main">
        <div class="duo-upload-left">
          <div class="duo-upload-icon-box" id="portal-upload-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <div class="duo-upload-text-group">
            <div class="duo-upload-title-row">
              <span class="duo-upload-name" id="portal-pdf-filename">Chưa chọn file truyện</span>
              <span class="duo-upload-status-pill" id="portal-upload-status-pill">Chưa có truyện</span>
            </div>
            <span class="duo-upload-hint" id="portal-upload-hint">Bấm nút bên cạnh để tải file .PDF, .TXT hoặc .EPUB từ máy (hỗ trợ chọn nhiều file)</span>
          </div>
        </div>
        <label for="portal-file-input" class="portal-file-change-btn" id="portal-upload-btn-label">
          <span class="btn-icon" id="portal-upload-btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </span>
          <span id="portal-upload-btn-text">Tải truyện lên</span>
        </label>
      </div>
    `;
  } else {
    let displayList = records;
    if (displayList.length === 0 && hasLoadedDocument()) {
      displayList = [{
        documentId: currentDocId || 'temp-doc',
        documentName: state.pdfFileName || 'Tài liệu đã nạp',
        totalPages: state.totalPages || 1,
        chunks: state.allChunks || [],
        savedAt: Date.now()
      }];
    }

    container.innerHTML = `
      <div class="duo-upload-header-row">
        <div class="duo-upload-badge-tag" id="portal-upload-badge">
          <span class="badge-icon" id="portal-upload-badge-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span class="badge-text" id="portal-upload-badge-text">TRUYỆN ĐÃ NẠP (${displayList.length})</span>
        </div>
        <label for="portal-file-input" class="portal-file-add-btn" title="Nạp thêm truyện mới vào thư viện">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Thêm truyện mới</span>
        </label>
      </div>
      <div class="portal-books-list">
        ${displayList.map(rec => {
          const isSelected = rec.documentId === currentDocId || (displayList.length === 1 && !currentDocId);
          const pagesInfo = rec.totalPages && rec.totalPages > 1 ? `${rec.totalPages} trang` : '';
          const chunksCount = (rec.chunks || []).length;
          const chunksInfo = chunksCount ? `${chunksCount} đoạn` : '';
          const metaParts = [pagesInfo, chunksInfo].filter(Boolean);
          const timeText = rec.savedAt ? new Date(rec.savedAt).toLocaleDateString('vi-VN') : '';
          if (timeText) metaParts.push(timeText);
          const fullMeta = metaParts.join(' • ');
          return `
            <div class="portal-book-item ${isSelected ? 'selected' : ''}" data-doc-id="${escapeHtml(rec.documentId)}">
              <div class="portal-book-select-indicator">
                <div class="portal-book-radio">
                  ${isSelected ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                </div>
              </div>
              <div class="portal-book-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div class="portal-book-details">
                <div class="portal-book-title-row">
                  <span class="portal-book-title" title="${escapeHtml(rec.documentName || '')}">${escapeHtml(rec.documentName || 'Không tên')}</span>
                  <span class="portal-book-pill ${isSelected ? 'active' : ''}">${isSelected ? 'Đang chọn' : 'Chọn đọc'}</span>
                </div>
                <span class="portal-book-meta">${escapeHtml(fullMeta || 'Đã lưu trên máy')}</span>
              </div>
              <button class="portal-book-delete-btn" data-delete-id="${escapeHtml(rec.documentId)}" title="Xóa truyện khỏi danh sách">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          `;
        }).join('')}
      </div>
      <span id="portal-pdf-filename" style="display: none">${escapeHtml(state.pdfFileName || '')}</span>
    `;

    container.querySelectorAll('.portal-book-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.portal-book-delete-btn')) return;
        const docId = item.getAttribute('data-doc-id');
        if (!docId || docId === currentDocId) return;
        await selectPortalBook(docId);
      });
    });

    container.querySelectorAll('.portal-book-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const docId = btn.getAttribute('data-delete-id');
        const item = btn.closest('.portal-book-item');
        const title = item ? item.querySelector('.portal-book-title')?.textContent : '';
        if (!docId) return;
        await deletePortalBook(docId, title);
      });
    });
  }
}

// ==========================================================
// LANDING PORTAL, THEME SELECTOR & AUTHOR DONATE
// ==========================================================
function openPortal(showCloseButton = true) {
  const portal = document.getElementById('landing-portal');
  if (!portal) return;
  portal.classList.remove('hidden');
  portal.setAttribute('aria-hidden', 'false');
  const closeBtn = document.getElementById('btn-portal-close');
  if (closeBtn) closeBtn.style.display = showCloseButton ? 'flex' : 'none';
  const path = window.location.pathname.toLowerCase();
  const isIndexPage = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
  if (isIndexPage) {
    document.title = 'web ngụy trang đọc truyện trong giờ làm việc';
  }
  updatePortalThemeUI(state.theme);
  updatePortalUploadUI();
}

function closePortal() {
  const portal = document.getElementById('landing-portal');
  if (!portal) return;
  portal.classList.add('hidden');
  portal.setAttribute('aria-hidden', 'true');
  applyTheme(state.theme);
}

function initLandingPortal() {
  const portal = document.getElementById('landing-portal');
  if (!portal) return;

  const urlParams = new URLSearchParams(window.location.search);
  const forcePortal = urlParams.has('portal') || urlParams.has('home');
  if (forcePortal) {
    try { localStorage.removeItem('skip_portal'); } catch(e) {}
  }

  const path = window.location.pathname.toLowerCase();
  const isIndexPage = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
  const isDedicatedPage = !isIndexPage;
  const skipPortal = !forcePortal && (localStorage.getItem('skip_portal') === 'true' || isDedicatedPage);
  const closeBtn = document.getElementById('btn-portal-close');
  const rememberChk = document.getElementById('chk-remember-direct-mode');

  if (rememberChk) rememberChk.checked = localStorage.getItem('skip_portal') === 'true';

  // Initial visibility check
  if (skipPortal) {
    closePortal();
    if (closeBtn) closeBtn.style.display = 'flex';
  } else {
    openPortal(false);
    if (isIndexPage) {
      document.title = 'web ngụy trang đọc truyện trong giờ làm việc';
    }
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

  // Copy STK Button
  const copyBtn = document.getElementById('btn-copy-stk');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyAccountNumber);
  }

  // Portal document file input (supports multiple files)
  if (portalFileInput) {
    portalFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileIndexText = files.length > 1 ? ` (${i + 1}/${files.length})` : '';
          showPortalUploadProgress(`Đang nạp: ${file.name}${fileIndexText}`, 'Đang chuẩn bị đọc tài liệu...', 0);
          showPageFlipToast(`Đang nạp: ${file.name}${fileIndexText}`);
          const nameLabel = document.getElementById('portal-pdf-filename');
          if (nameLabel) nameLabel.textContent = file.name;
          await processDocumentFile(file);
        }
        updatePortalUploadProgress(100, 'Đã hoàn tất nạp truyện!');
        setTimeout(() => {
          hidePortalUploadProgress();
          hideLoading();
        }, 400);
        await updatePortalUploadUI();
        e.target.value = '';
      }
    });
  }

  // Drag & drop support on the portal upload card (supports multiple files)
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
    uploadCard.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const files = Array.from(dt?.files || []);
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileIndexText = files.length > 1 ? ` (${i + 1}/${files.length})` : '';
          showPortalUploadProgress(`Đang nạp: ${file.name}${fileIndexText}`, 'Đang chuẩn bị đọc tài liệu...', 0);
          showPageFlipToast(`Đang nạp: ${file.name}${fileIndexText}`);
          await processDocumentFile(file);
        }
        updatePortalUploadProgress(100, 'Đã hoàn tất nạp truyện!');
        setTimeout(() => {
          hidePortalUploadProgress();
          hideLoading();
        }, 400);
        await updatePortalUploadUI();
      }
    });
  }
}

function goToHomePage() {
  try {
    localStorage.removeItem('skip_portal');
  } catch(e) {}
  window.location.href = 'index.html?portal=1';
}

function initPortalTriggers() {
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
    'btn-open-portal-thuvienphapluat',
    'btn-modal-to-portal'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        const portal = document.getElementById('landing-portal');
        if (portal) {
          closeThemeModal();
          openPortal(true);
          updatePortalThemeUI(state.theme);
          updatePortalUploadUI();
        } else {
          e.preventDefault();
          goToHomePage();
        }
      });
    }
  });
}

function updatePortalThemeUI(themeName) {
  document.querySelectorAll('.duo-mission-item, .portal-theme-item').forEach(item => {
    const match = item.getAttribute('data-theme') === themeName;
    item.classList.toggle('selected', match);
  });
}

function copyAccountNumber() {
  const stk = '1015471873';
  const copyBtn = document.getElementById('btn-copy-stk') || document.getElementById('btn-copy-stk-modal');
  
  if (copyBtn) {
    const rect = copyBtn.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top, 50);
  }

  const showFeedback = () => {
    if (copyBtn) {
      const orig = copyBtn.getAttribute('data-orig') || copyBtn.textContent;
      copyBtn.setAttribute('data-orig', orig);
      copyBtn.textContent = 'Đã sao chép số tài khoản!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = orig;
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
// UNIVERSAL PINNED READING NAVBAR COMPONENT
// ==========================================================
function initUniversalNavbar() {
  const path = window.location.pathname.toLowerCase();
  const isIndexPage = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
  if (isIndexPage) return;

  document.body.classList.add('has-pinned-navbar');

  let nav = document.getElementById('universal-reader-navbar');
  if (!nav) {
    nav = document.createElement('header');
    nav.id = 'universal-reader-navbar';
    nav.className = 'universal-reader-navbar stealth-reading-ctrls';
    nav.innerHTML = `
      <div class="unav-section unav-left">
        <div class="unav-brand" title="Stealth Reader - Web đọc truyện ngụy trang">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h7"/></svg>
          <span class="unav-brand-text">Stealth Reader</span>
        </div>
        <label for="file-pdf-input" class="unav-btn unav-btn-upload" title="Nạp file PDF, TXT hoặc EPUB (hoặc kéo thả vào trang)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Nạp file</span>
        </label>
        <div class="unav-dropdown-wrapper" id="univ-books-dropdown-wrap">
          <button class="unav-btn unav-btn-switch-book" id="univ-btn-switch-book" title="Đổi truyện khác từ thư viện">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>Đổi truyện</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="unav-file-badge clickable" id="univ-file-name" title="Tên tài liệu đang đọc • Nhấn để đổi truyện">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; opacity:0.7;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="unav-file-name-text">KPI_Report_Q3_2026.pdf</span>
          </div>
          <div class="unav-books-dropdown-menu" id="univ-books-dropdown-menu" style="display: none;"></div>
        </div>
      </div>

      <div class="unav-section unav-center">
        <div class="unav-control-group unav-page-nav">
          <button class="unav-icon-btn" id="univ-btn-prev" title="Trang trước (PageUp)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="unav-indicator" id="univ-page-indicator" title="Trang hiện tại / Tổng số trang">1 / 1</span>
          <button class="unav-icon-btn" id="univ-btn-next" title="Trang kế (PageDown)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div class="unav-jump-box" title="Nhập số trang và nhấn Enter để nhảy nhanh">
            <input type="number" id="univ-input-jump" min="1" max="1" placeholder="Trang" />
          </div>
        </div>

        <div class="unav-control-group unav-font-ctrl" title="Tăng giảm cỡ chữ (hoặc phím [ và ])">
          <button class="unav-btn-sm" id="univ-btn-font-dec" title="Giảm cỡ chữ ( [ )">A−</button>
          <span class="unav-font-indicator" id="univ-font-val">11pt</span>
          <button class="unav-btn-sm" id="univ-btn-font-inc" title="Tăng cỡ chữ ( ] )">A+</button>
        </div>

        <div class="unav-dropdown-wrapper" id="univ-layout-dropdown-wrap">
          <button class="unav-btn unav-btn-layout" id="univ-btn-layout-options" title="Tùy chỉnh bố cục dòng & ngắt chữ (Giữ nguyên dòng gốc, cố định số chữ, giãn dòng...)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
            <span id="univ-layout-mode-label">Dòng gốc</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="unav-layout-dropdown-menu" id="univ-layout-dropdown-menu" style="display: none;"></div>
        </div>

        <button class="unav-btn unav-btn-autoscroll" id="univ-btn-autoscroll" title="Tự cuộn đọc rảnh tay (Phím Space)">
          <span class="unav-autoscroll-icon-box">
            <svg class="unav-autoscroll-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          </span>
          <span class="unav-autoscroll-text">Tự cuộn</span>
        </button>
        <button class="unav-btn unav-btn-bookmark" id="univ-btn-bookmark" title="Lưu vị trí đang đọc trên thiết bị này">
          <svg class="unav-bookmark-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          <span class="unav-bookmark-text">Đánh dấu</span>
        </button>
        <button class="unav-btn unav-btn-tools" id="univ-btn-tools" title="Mở thư viện, dấu trang, mục lục, bố cục dòng và tìm kiếm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/><path d="M8 11h6M11 8v6"/></svg>
          <span>Công cụ</span>
        </button>
      </div>

      <div class="unav-section unav-right">
        <button class="unav-btn hybrid-auth-button" id="hybrid-auth-button" title="Đăng nhập Google để đồng bộ">
          <span class="hybrid-google-mark">G</span><span>Đăng nhập Google</span>
        </button>
        <button class="unav-btn unav-btn-custom-img" id="univ-btn-custom-img" style="display:none;" title="Đổi ảnh ngụy trang cho giao diện này (hoặc kéo thả ảnh trực tiếp)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <span>Đổi ảnh</span>
        </button>
        <button class="unav-btn unav-btn-theme" id="univ-btn-theme" title="Đổi sang giao diện công sở khác">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
          <span>Giao diện</span>
        </button>
        <button class="unav-btn unav-btn-portal" id="univ-btn-portal" title="Về trang chủ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Trang chủ</span>
        </button>
        <button class="unav-btn unav-btn-boss boss-key-btn" id="univ-btn-boss" title="Khẩn cấp: Báo cáo nhanh / Quay lại (Phím ESC hoặc F2)">
          <span class="boss-badge">ESC</span>
          <span class="unav-boss-text">Báo cáo nhanh</span>
        </button>
        <button class="unav-btn unav-btn-hide stealth-toggle-btn" id="univ-btn-hide" title="Ẩn thanh điều khiển (Phím tắt: H)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          <span>Ẩn (H)</span>
        </button>
      </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);
  }

  // Ensure file input exists
  let fileInput = document.getElementById('file-pdf-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'file-pdf-input';
    fileInput.accept = '.pdf,.txt,.epub,application/pdf,text/plain,application/epub+zip';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', handleFileSelect);
  }

  // Event Listeners for Universal Navbar
  const btnPrev = document.getElementById('univ-btn-prev');
  if (btnPrev) btnPrev.addEventListener('click', () => changePage(-1));

  const btnNext = document.getElementById('univ-btn-next');
  if (btnNext) btnNext.addEventListener('click', () => changePage(1));

  const inputJump = document.getElementById('univ-input-jump');
  if (inputJump) {
    inputJump.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const page = parseInt(inputJump.value);
        if (page >= 1 && page <= state.totalPages) {
          goToPage(page);
        }
      }
    });
  }

  const btnFontDec = document.getElementById('univ-btn-font-dec');
  if (btnFontDec) btnFontDec.addEventListener('click', (e) => { e.preventDefault(); changeFontSize(-1); });

  const btnFontInc = document.getElementById('univ-btn-font-inc');
  if (btnFontInc) btnFontInc.addEventListener('click', (e) => { e.preventDefault(); changeFontSize(1); });

  const btnAutoscroll = document.getElementById('univ-btn-autoscroll');
  if (btnAutoscroll) btnAutoscroll.addEventListener('click', toggleAutoScroll);

  const btnBookmark = document.getElementById('univ-btn-bookmark');
  if (btnBookmark) btnBookmark.addEventListener('click', () => addManualBookmark());

  const btnTools = document.getElementById('univ-btn-tools');
  if (btnTools) btnTools.addEventListener('click', () => openReaderTools('search'));

  const btnCustomImg = document.getElementById('univ-btn-custom-img');
  if (btnCustomImg) {
    btnCustomImg.addEventListener('click', () => {
      StealthImageManager.triggerFileInput(state.theme);
    });
  }

  const btnTheme = document.getElementById('univ-btn-theme');
  if (btnTheme) btnTheme.addEventListener('click', openThemeModal);

  const btnPortal = document.getElementById('univ-btn-portal');
  if (btnPortal) {
    btnPortal.addEventListener('click', () => {
      const portal = document.getElementById('landing-portal');
      if (portal) {
        closeThemeModal();
        openPortal(true);
        updatePortalThemeUI(state.theme);
        updatePortalUploadUI();
      } else {
        goToHomePage();
      }
    });
  }

  const btnBoss = document.getElementById('univ-btn-boss');
  if (btnBoss) btnBoss.addEventListener('click', toggleBossKey);

  const btnHide = document.getElementById('univ-btn-hide');
  if (btnHide) btnHide.addEventListener('click', toggleControlsVisibility);

  // Book Switcher dropdown on universal navbar
  const btnSwitchBook = document.getElementById('univ-btn-switch-book');
  const fileBadgeEl = document.getElementById('univ-file-name');

  if (btnSwitchBook) {
    btnSwitchBook.addEventListener('click', (e) => {
      e.stopPropagation();
      const layoutMenu = document.getElementById('univ-layout-dropdown-menu');
      if (layoutMenu) layoutMenu.style.display = 'none';
      toggleUniversalBooksDropdown();
    });
  }
  if (fileBadgeEl) {
    fileBadgeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const layoutMenu = document.getElementById('univ-layout-dropdown-menu');
      if (layoutMenu) layoutMenu.style.display = 'none';
      toggleUniversalBooksDropdown();
    });
  }

  // Layout & Line Customizer dropdown
  const btnLayoutOptions = document.getElementById('univ-btn-layout-options');
  if (btnLayoutOptions) {
    btnLayoutOptions.addEventListener('click', (e) => {
      e.stopPropagation();
      const booksMenu = document.getElementById('univ-books-dropdown-menu');
      if (booksMenu) booksMenu.style.display = 'none';
      toggleUniversalLayoutDropdown();
    });
  }

  document.addEventListener('click', (e) => {
    const booksWrap = document.getElementById('univ-books-dropdown-wrap');
    const booksMenu = document.getElementById('univ-books-dropdown-menu');
    if (booksMenu && booksMenu.style.display !== 'none') {
      if (!booksWrap || !booksWrap.contains(e.target)) {
        booksMenu.style.display = 'none';
      }
    }
    const layoutWrap = document.getElementById('univ-layout-dropdown-wrap');
    const layoutMenu = document.getElementById('univ-layout-dropdown-menu');
    if (layoutMenu && layoutMenu.style.display !== 'none') {
      if (!layoutWrap || !layoutWrap.contains(e.target)) {
        layoutMenu.style.display = 'none';
      }
    }
  });

  syncUniversalNavbar();
}

async function renderUniversalBooksDropdown() {
  const menu = document.getElementById('univ-books-dropdown-menu');
  if (!menu) return;

  let records = [];
  try {
    records = await listDocumentCaches();
  } catch (err) {
    console.warn('Lỗi đọc thư viện truyện:', err);
  }

  const currentDocId = getCurrentDocumentId();

  if (records.length === 0) {
    menu.innerHTML = `
      <div class="unav-dropdown-header">
        <span class="unav-dropdown-title">Thư viện truyện (0)</span>
      </div>
      <div class="unav-dropdown-empty">
        <span>Chưa có truyện nào trong thư viện.</span>
      </div>
      <label for="file-pdf-input" class="unav-dropdown-add-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Nạp file truyện mới</span>
      </label>
    `;
    return;
  }

  menu.innerHTML = `
    <div class="unav-dropdown-header">
      <span class="unav-dropdown-title">Thư viện truyện (${records.length})</span>
      <label for="file-pdf-input" class="unav-dropdown-add-mini" title="Nạp thêm truyện">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Nạp thêm</span>
      </label>
    </div>
    <div class="unav-dropdown-list">
      ${records.map(rec => {
        const isCurrent = rec.documentId === currentDocId;
        const pageText = rec.totalPages && rec.totalPages > 1 ? `${rec.totalPages} trang` : '';
        const chunkText = (rec.chunks || []).length ? `${(rec.chunks || []).length} đoạn` : '';
        const meta = [pageText, chunkText].filter(Boolean).join(' • ');
        return `
          <div class="unav-dropdown-item ${isCurrent ? 'selected' : ''}" data-doc-id="${escapeHtml(rec.documentId)}">
            <div class="unav-dropdown-item-left">
              <span class="unav-dropdown-check">${isCurrent ? '✓' : ''}</span>
              <div class="unav-dropdown-item-text">
                <span class="unav-dropdown-item-title" title="${escapeHtml(rec.documentName || '')}">${escapeHtml(rec.documentName || 'Không tên')}</span>
                <span class="unav-dropdown-item-meta">${escapeHtml(meta || 'Đã lưu trên máy')}</span>
              </div>
            </div>
            <div class="unav-dropdown-item-actions">
              ${isCurrent ? '<span class="unav-dropdown-pill">Đang đọc</span>' : ''}
              <button class="unav-dropdown-del-btn" data-delete-id="${escapeHtml(rec.documentId)}" title="Xóa truyện khỏi thư viện">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Click on item to switch book
  menu.querySelectorAll('.unav-dropdown-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.unav-dropdown-del-btn')) return;
      const docId = item.getAttribute('data-doc-id');
      if (!docId || docId === currentDocId) {
        menu.style.display = 'none';
        return;
      }
      menu.style.display = 'none';
      await switchReaderBook(docId);
    });
  });

  // Click delete button
  menu.querySelectorAll('.unav-dropdown-del-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const docId = btn.getAttribute('data-delete-id');
      const item = btn.closest('.unav-dropdown-item');
      const title = item ? item.querySelector('.unav-dropdown-item-title')?.textContent : '';
      if (!docId) return;
      if (!window.confirm(`Bạn có chắc muốn xóa truyện "${title || 'này'}"?`)) return;

      await deleteDocumentCache(docId);
      showPageFlipToast('Đã xóa truyện khỏi thư viện.');
      if (docId === currentDocId) {
        const remaining = await listDocumentCaches();
        if (remaining.length > 0) {
          await switchReaderBook(remaining[0].documentId);
        } else {
          location.reload();
        }
      } else {
        await renderUniversalBooksDropdown();
      }
    });
  });
}

async function toggleUniversalBooksDropdown() {
  const menu = document.getElementById('univ-books-dropdown-menu');
  if (!menu) return;
  if (menu.style.display === 'none' || !menu.style.display) {
    await renderUniversalBooksDropdown();
    menu.style.display = 'flex';
  } else {
    menu.style.display = 'none';
  }
}

async function switchReaderBook(docId) {
  try {
    showLoading('Đang mở truyện...');
    const cache = await readDocumentCacheById(docId);
    if (!cache || !isValidCachedDocument(cache)) {
      showReaderError('Không thể mở truyện', 'Dữ liệu truyện trong bộ nhớ bị lỗi hoặc không đầy đủ.');
      return;
    }
    applyCachedDocument(cache);
    await setActiveDocumentCache(docId);
    saveState();
    renderContinuousView(true, state.currentGlobalIndex);
    syncUniversalNavbar();
    await pullHybridDocument();
    showPageFlipToast(`Đã chuyển sang: ${state.pdfFileName}`);
  } catch (err) {
    console.error('Lỗi khi đổi truyện:', err);
    showReaderError('Lỗi', 'Không thể chuyển sang truyện đã chọn.');
  } finally {
    hideLoading();
  }
}

function rechunkActiveDocument() {
  if (!state.allChunks || state.allChunks.length === 0) return;
  const raw = state.rawText || state.allChunks.map(c => c.text).join('\n');
  const chunks = splitTextIntoChunks(raw, state.chunkMode, {
    preserveIndents: state.preserveIndents,
    compactBlankLines: state.compactBlankLines,
    maxCharsPerLine: state.layoutMode === 'custom' ? state.maxCharsPerLine : 0
  });

  if (!chunks.length) return;

  const currentIdx = state.currentGlobalIndex;
  const pagesData = chunksToPagesData(chunks);
  const totalPages = Object.keys(pagesData).length;
  state.loadedPages = totalPages;
  initStoryFromPages(pagesData, totalPages, Math.min(state.currentPage, totalPages));
  renderContinuousView(true, Math.min(currentIdx, state.allChunks.length - 1));
  persistDocumentCache();
  saveState();
  syncUniversalNavbar();
}

async function toggleUniversalLayoutDropdown() {
  const menu = document.getElementById('univ-layout-dropdown-menu');
  if (!menu) return;
  if (menu.style.display === 'none' || !menu.style.display) {
    renderUniversalLayoutDropdown();
    menu.style.display = 'flex';
  } else {
    menu.style.display = 'none';
  }
}

function renderUniversalLayoutDropdown() {
  const menu = document.getElementById('univ-layout-dropdown-menu');
  if (!menu) return;

  const isExact = state.layoutMode === 'exact';
  const isWrap = state.layoutMode === 'wrap';
  const isCustom = state.layoutMode === 'custom';

  const fonts = ['Arial', 'Calibri', 'Consolas, monospace', 'Roboto', 'Times New Roman'];
  const lineHeights = [
    { val: '1.2', label: '1.2x (Chặt)' },
    { val: '1.5', label: '1.5x (Vừa)' },
    { val: '1.75', label: '1.75x (Chuẩn)' },
    { val: '2.0', label: '2.0x (Thưa)' }
  ];

  menu.innerHTML = `
    <div class="unav-dropdown-header">
      <span class="unav-dropdown-title">Bố cục & Định dạng dòng</span>
    </div>
    <div class="unav-layout-dropdown-content">
      <!-- 1. Chế độ ngắt dòng -->
      <div class="unav-layout-section">
        <div class="unav-layout-section-label">1. Chế độ hiển thị & ngắt dòng</div>
        
        <div class="unav-layout-card-option ${isExact ? 'active' : ''}" data-layout-mode="exact">
          <div class="unav-layout-card-title">
            <span class="unav-dropdown-check">${isExact ? '✓' : '○'}</span>
            <strong>Giữ nguyên 100% dòng gốc (Khuyên dùng)</strong>
          </div>
          <div class="unav-layout-card-desc">1 dòng file = 1 dòng đọc. Chữ giữ nguyên hàng, không bao giờ bị xê dịch hay rớt xuống dòng.</div>
        </div>

        <div class="unav-layout-card-option ${isWrap ? 'active' : ''}" data-layout-mode="wrap">
          <div class="unav-layout-card-title">
            <span class="unav-dropdown-check">${isWrap ? '✓' : '○'}</span>
            <strong>Tự động xuống dòng (Wrap Text)</strong>
          </div>
          <div class="unav-layout-card-desc">Tự ngắt dòng khi chạm mép khung/cột để chữ vừa khít chiều rộng màn hình.</div>
        </div>

        <div class="unav-layout-card-option ${isCustom ? 'active' : ''}" data-layout-mode="custom">
          <div class="unav-layout-card-title">
            <span class="unav-dropdown-check">${isCustom ? '✓' : '○'}</span>
            <strong>Cố định số chữ trên 1 dòng</strong>
          </div>
          <div class="unav-layout-card-desc">Ngắt dòng cứng theo giới hạn số ký tự tối đa:</div>
          <div class="unav-layout-pills-row">
            ${[50, 70, 80, 100, 120].map(cnt => `
              <button class="unav-layout-pill-btn ${state.maxCharsPerLine === cnt ? 'active' : ''}" data-max-chars="${cnt}">${cnt} chữ</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 2. Cơ chế tách nội dung khi nạp -->
      <div class="unav-layout-section">
        <div class="unav-layout-section-label">2. Phân tách dòng đọc</div>
        <div class="unav-layout-pills-row" style="margin-left:0;">
          <button class="unav-layout-pill-btn ${state.chunkMode === 'line' ? 'active' : ''}" data-chunk-mode="line">Từng dòng gốc (Line-by-line)</button>
          <button class="unav-layout-pill-btn ${state.chunkMode === 'paragraph' ? 'active' : ''}" data-chunk-mode="paragraph">Từng đoạn văn</button>
          <button class="unav-layout-pill-btn ${state.chunkMode === 'sentence' ? 'active' : ''}" data-chunk-mode="sentence">Từng câu</button>
        </div>
      </div>

      <!-- 3. Khoảng cách & Thụt lề -->
      <div class="unav-layout-section">
        <div class="unav-layout-section-label">3. Khoảng cách & Thụt lề</div>
        <label class="unav-layout-checkbox-item">
          <input type="checkbox" id="unav-chk-indents" ${state.preserveIndents ? 'checked' : ''} />
          <span>Giữ nguyên thụt lề đầu dòng (Indents / Tabs / Khoảng trắng gốc)</span>
        </label>
        <label class="unav-layout-checkbox-item">
          <input type="checkbox" id="unav-chk-compact-blanks" ${state.compactBlankLines ? 'checked' : ''} />
          <span>Lược bỏ dòng trống liên tiếp</span>
        </label>
      </div>

      <!-- 4. Typography -->
      <div class="unav-layout-section">
        <div class="unav-layout-section-label">4. Font chữ & Giãn dòng</div>
        <div class="unav-layout-grid-select">
          <div class="unav-layout-select-group">
            <span class="unav-layout-select-label">Phông chữ:</span>
            <select class="unav-layout-select" id="unav-sel-font">
              ${fonts.map(f => `<option value="${f}" ${state.fontFamily === f ? 'selected' : ''}>${f.includes('monospace') ? 'Monospace (Thẳng cột)' : f}</option>`).join('')}
            </select>
          </div>
          <div class="unav-layout-select-group">
            <span class="unav-layout-select-label">Giãn dòng:</span>
            <select class="unav-layout-select" id="unav-sel-lineheight">
              ${lineHeights.map(lh => `<option value="${lh.val}" ${state.lineHeight === lh.val ? 'selected' : ''}>${lh.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="unav-layout-footer">
      <span class="unav-layout-status-tip">✓ Tự động áp dụng & lưu</span>
      <button class="unav-layout-apply-btn" id="unav-btn-apply-layout">Đóng</button>
    </div>
  `;

  // Handlers
  menu.querySelectorAll('[data-layout-mode]').forEach(el => {
    el.addEventListener('click', () => {
      const mode = el.dataset.layoutMode;
      state.layoutMode = mode;
      state.wrapText = (mode === 'wrap');
      if (mode === 'custom' || state.chunkMode === 'line') rechunkActiveDocument();
      applyStyles();
      saveState();
      syncUniversalNavbar();
      renderUniversalLayoutDropdown();
      showPageFlipToast(mode === 'exact' ? 'Đã bật: Giữ nguyên 100% dòng gốc (không bẻ chữ)' : (mode === 'wrap' ? 'Đã bật: Tự động xuống dòng (Wrap text)' : `Đã đặt: Cố định ${state.maxCharsPerLine} chữ/dòng`));
    });
  });

  menu.querySelectorAll('[data-max-chars]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.layoutMode = 'custom';
      state.maxCharsPerLine = Number(btn.dataset.maxChars);
      state.wrapText = false;
      rechunkActiveDocument();
      applyStyles();
      saveState();
      syncUniversalNavbar();
      renderUniversalLayoutDropdown();
      showPageFlipToast(`Đã cố định tối đa ${state.maxCharsPerLine} chữ trên 1 dòng.`);
    });
  });

  menu.querySelectorAll('[data-chunk-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.chunkMode;
      state.chunkMode = mode;
      rechunkActiveDocument();
      applyStyles();
      saveState();
      syncUniversalNavbar();
      renderUniversalLayoutDropdown();
      showPageFlipToast(`Đã chuyển sang phân đoạn: ${mode === 'line' ? 'Từng dòng' : (mode === 'sentence' ? 'Từng câu' : 'Từng đoạn')}`);
    });
  });

  const chkIndents = menu.querySelector('#unav-chk-indents');
  if (chkIndents) {
    chkIndents.addEventListener('change', () => {
      state.preserveIndents = chkIndents.checked;
      applyStyles();
      saveState();
      renderUniversalLayoutDropdown();
    });
  }

  const chkCompact = menu.querySelector('#unav-chk-compact-blanks');
  if (chkCompact) {
    chkCompact.addEventListener('change', () => {
      state.compactBlankLines = chkCompact.checked;
      rechunkActiveDocument();
      saveState();
      renderUniversalLayoutDropdown();
    });
  }

  const selFont = menu.querySelector('#unav-sel-font');
  if (selFont) {
    selFont.addEventListener('change', () => {
      state.fontFamily = selFont.value;
      applyStyles();
      saveState();
    });
  }

  const selLineHeight = menu.querySelector('#unav-sel-lineheight');
  if (selLineHeight) {
    selLineHeight.addEventListener('change', () => {
      state.lineHeight = selLineHeight.value;
      applyStyles();
      saveState();
    });
  }

  const applyBtn = menu.querySelector('#unav-btn-apply-layout');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      menu.style.display = 'none';
    });
  }
}

function syncUniversalNavbar() {
  const fileBadge = document.getElementById('univ-file-name');
  if (fileBadge) {
    const fileName = state.pdfFileName || 'KPI_Report_Q3_2026.pdf';
    fileBadge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; opacity:0.7;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="unav-file-name-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(fileName)}</span>`;
    fileBadge.title = `Tài liệu: ${fileName}`;
  }

  const layoutLabel = document.getElementById('univ-layout-mode-label');
  if (layoutLabel) {
    if (state.layoutMode === 'exact') layoutLabel.textContent = 'Dòng gốc';
    else if (state.layoutMode === 'custom') layoutLabel.textContent = `${state.maxCharsPerLine} ký tự`;
    else layoutLabel.textContent = 'Tự ngắt';
  }

  const pageInd = document.getElementById('univ-page-indicator');
  if (pageInd) pageInd.textContent = `${state.currentPage} / ${state.totalPages}`;

  const jumpInput = document.getElementById('univ-input-jump');
  if (jumpInput) {
    jumpInput.value = state.currentPage;
    jumpInput.max = state.totalPages;
  }

  const prevBtn = document.getElementById('univ-btn-prev');
  if (prevBtn) prevBtn.disabled = state.currentPage <= 1;

  const nextBtn = document.getElementById('univ-btn-next');
  const maxNavigablePage = state.isPdfProcessing ? state.loadedPages : state.totalPages;
  if (nextBtn) nextBtn.disabled = state.currentPage >= maxNavigablePage;

  const fontVal = document.getElementById('univ-font-val');
  if (fontVal) fontVal.textContent = `${state.fontSize}pt`;

  const autoscrollBtn = document.getElementById('univ-btn-autoscroll');
  if (autoscrollBtn) {
    const icon = autoscrollBtn.querySelector('.unav-autoscroll-icon');
    const text = autoscrollBtn.querySelector('.unav-autoscroll-text');
    if (state.isAutoScrolling) {
      if (icon) icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      if (text) text.textContent = 'Tạm dừng';
      autoscrollBtn.classList.add('playing');
    } else {
      if (icon) icon.innerHTML = '<polygon points="6 3 20 12 6 21 6 3"/>';
      if (text) text.textContent = 'Tự cuộn';
      autoscrollBtn.classList.remove('playing');
    }
  }

  syncBookmarkButton();

  const bossBtn = document.getElementById('univ-btn-boss');
  if (bossBtn) {
    const bossText = bossBtn.querySelector('.unav-boss-text');
    if (state.bossModeActive) {
      if (bossText) bossText.textContent = 'Quay lại';
      bossBtn.classList.add('boss-active');
    } else {
      if (bossText) bossText.textContent = 'Báo cáo nhanh';
      bossBtn.classList.remove('boss-active');
    }
  }
}

function syncBookmarkButton() {
  const button = document.getElementById('univ-btn-bookmark');
  if (!button) return;

  const label = button.querySelector('.unav-bookmark-text');
  const icon = button.querySelector('.unav-bookmark-icon');
  const bookmark = getCurrentBookmark();
  const isCurrentPositionSaved = Boolean(
    bookmark && Number(bookmark.globalIndex) === Number(state.currentGlobalIndex)
  );

  button.classList.toggle('saved', isCurrentPositionSaved);
  if (icon) {
    icon.setAttribute('fill', isCurrentPositionSaved ? 'currentColor' : 'none');
  }
  if (label) label.textContent = isCurrentPositionSaved ? `Đã lưu T.${bookmark.page}` : 'Đánh dấu';
  button.title = bookmark
    ? `Vị trí gần nhất: trang ${bookmark.page}, dòng ${Number(bookmark.globalIndex) + 1}. Bấm để cập nhật.`
    : 'Lưu vị trí đang đọc trên thiết bị này';
}

// ==========================================================
// EVENT LISTENERS & HOTKEYS
// ==========================================================
function initEventListeners() {
  BOSS_KEY_BUTTON_IDS.forEach(id => {
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

    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      navigateRow(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
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
  themeControlIds('btn-prev').forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => changePage(-1));
  });
  themeControlIds('btn-next').forEach(id => {
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
  themeControlIds('btn-autoscroll').forEach(id => {
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
  [...themeControlIds('btn-font-dec'), 'modal-btn-font-dec', 'stealth-btn-font-dec'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        changeFontSize(-1);
      });
    }
  });

  [...themeControlIds('btn-font-inc'), 'modal-btn-font-inc', 'stealth-btn-font-inc'].forEach(id => {
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

  const univFontVal = document.getElementById('univ-font-val');
  if (univFontVal) univFontVal.textContent = `${state.fontSize}pt`;

  // Per-element pass: skip elements already styled with the current settings,
  // so appending a batch doesn't re-style (and re-layout) every rendered row.
  const styleKey = `${state.fontFamily}|${state.fontSize}|${state.lineHeight}|${state.isBold}|${state.isItalic}|${state.layoutMode}|${state.preserveIndents}|${state.wrapText}`;
  const restyle = (selector, apply) => {
    document.querySelectorAll(selector).forEach(el => {
      if (el._styleKey === styleKey) return;
      apply(el);
      el._styleKey = styleKey;
    });
  };

  const isNowrap = (state.layoutMode === 'exact' || !state.wrapText);
  const whiteSpaceVal = isNowrap ? (state.preserveIndents ? 'pre' : 'nowrap') : 'normal';
  const wordBreakVal = isNowrap ? 'normal' : 'break-word';

  restyle('.story-cell', cell => {
    cell.style.fontWeight = state.isBold ? 'bold' : 'normal';
    cell.style.fontStyle = state.isItalic ? 'italic' : 'normal';
    cell.style.whiteSpace = whiteSpaceVal;
    cell.style.wordBreak = wordBreakVal;
    if (state.fontFamily) cell.style.fontFamily = state.fontFamily;
    if (state.fontSize) cell.style.fontSize = `${state.fontSize}pt`;
    if (state.lineHeight) cell.style.lineHeight = state.lineHeight;
  });

  // 2. Code editors & table columns with possible horizontal code scrolling (VS Code, Blender console, SAP grid)
  restyle('.vsc-code-line, .b-code-content, .sap-item-desc', el => {
    el.style.whiteSpace = whiteSpaceVal;
    el.style.wordBreak = wordBreakVal;
    if (isNowrap && !el.classList.contains('vsc-gutter-num')) {
      el.style.overflowX = 'auto';
    } else {
      el.style.overflowX = 'visible';
    }
    if (state.fontSize) el.style.fontSize = `${state.fontSize}pt`;
    if (state.lineHeight) el.style.lineHeight = state.lineHeight;
  });

  // 3. Document, Email, Chat & Prose reading themes (Gmail, Outlook, Google Docs, Zalo, LinkedIn, Figma, Canva, PPT, Captions, Notes)
  // Text in these themes MUST ALWAYS wrap naturally within their containers and NEVER produce horizontal scrollbars.
  const proseWhiteSpace = isNowrap ? (state.preserveIndents ? 'pre-wrap' : 'normal') : 'normal';
  restyle('.gdocs-story-paragraph, .gmail-story-para, .outlook-story-para, .zalo-msg-text, .ln-post-paragraph, .ps-chunk-body, .b-story-text, .cad-note-text, .figma-text-layer, .canva-text-box, .ppt-bullet-text, .cc-caption-text', el => {
    el.style.whiteSpace = proseWhiteSpace;
    el.style.wordBreak = 'break-word';
    el.style.overflowX = 'hidden';
    if (state.fontFamily && (el.classList.contains('gdocs-story-paragraph') || el.classList.contains('gmail-story-para') || el.classList.contains('outlook-story-para'))) {
      el.style.fontFamily = state.fontFamily;
    }
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
  if (btn.id === 'univ-btn-boss') {
    const text = btn.querySelector('.unav-boss-text');
    if (text) text.textContent = bossModeActive ? 'Quay lại' : 'Báo cáo nhanh';
    btn.classList.toggle('boss-active', bossModeActive);
    return;
  }
  btn.innerHTML = bossModeActive
    ? '<span class="boss-badge">ESC</span> Quay lại'
    : '<span class="boss-badge">ESC</span> Báo cáo nhanh';
  btn.style.backgroundColor = bossModeActive ? '#0F9D58' : '#d93025';
}

const BOSS_VIEW_CONFIGS = [
  { story: 'gdocs-story-view', boss: 'gdocs-boss-view', storyDisplay: 'block', bossDisplay: 'block' },
  { story: 'ps-artboard-view', boss: 'ps-boss-view', storyDisplay: 'flex', bossDisplay: 'block' },
  { story: 'blender-story-view', boss: 'blender-boss-view', storyDisplay: 'block', bossDisplay: 'flex' },
  { story: 'linkedin-story-stream', boss: 'linkedin-boss-view', storyDisplay: 'flex', bossDisplay: 'block' },
  { story: 'autocad-story-view', boss: 'autocad-boss-view', storyDisplay: 'flex', bossDisplay: 'block' },
  { story: 'zalo-chat-view', boss: 'zalo-boss-view', storyDisplay: 'flex', bossDisplay: 'block' },
  { story: 'figma-story-view', boss: 'figma-boss-view', storyDisplay: '', bossDisplay: 'block' },
  { story: 'canva-story-view', boss: 'canva-boss-view', storyDisplay: 'flex', bossDisplay: 'block' },
  { story: 'ppt-story-view', boss: 'ppt-boss-view', storyDisplay: 'flex', bossDisplay: 'flex' },
  { story: 'tvpl-story-view', boss: 'tvpl-boss-view', storyDisplay: '', bossDisplay: 'block' },
  ...['premiere', 'claude', 'chatgpt', 'teams', 'revit', 'misa', 'capcut', 'sap', 'gmail', 'outlook'].map(p => ({
    story: `${p}-story-view`,
    boss: `${p}-boss-view`,
    storyDisplay: '',
    bossDisplay: 'block'
  }))
];

function toggleBossKey() {
  const isBossActive = !state.bossModeActive;
  state.bossModeActive = isBossActive;

  const bossButtons = BOSS_KEY_BUTTON_IDS.map(id => document.getElementById(id));
  const univBoss = document.getElementById('univ-btn-boss');
  if (univBoss) bossButtons.push(univBoss);
  bossButtons.forEach(btn => {
    if (btn) updateBossButton(btn, isBossActive);
  });

  if (isBossActive) {
    state.previousSheetId = document.querySelector('.sheet-content.active')?.id || 'view-sheet-story';
    stopAutoScroll();
    switchSheet('view-sheet-financial');
  } else {
    switchSheet(state.previousSheetId || 'view-sheet-story');
  }

  BOSS_VIEW_CONFIGS.forEach(cfg => {
    const s = document.getElementById(cfg.story);
    const b = document.getElementById(cfg.boss);
    if (s) s.style.display = isBossActive ? 'none' : (cfg.storyDisplay || '');
    if (b) b.style.display = isBossActive ? (cfg.bossDisplay || 'block') : 'none';
  });

  if (state.theme === 'theme-vscode') {
    if (isBossActive) {
      renderVSCodeBossCode();
    } else {
      renderContinuousView(true);
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
const MAX_DOCUMENT_SIZE = 200 * 1024 * 1024;
const MAX_EPUB_ENTRIES = 5000;
const MAX_EPUB_TEXT_LENGTH = 60 * 1024 * 1024;
const MAX_EPUB_UNCOMPRESSED_SIZE = 300 * 1024 * 1024;
const LARGE_FILE_WARNING_SIZE = 100 * 1024 * 1024;
let pdfBackendAvailable = null;

function getDocumentExtension(file) {
  const name = file && file.name ? file.name.toLowerCase() : '';
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex + 1) : '';
}

function isSupportedDocument(file) {
  return ['pdf', 'txt', 'epub'].includes(getDocumentExtension(file));
}

function prepareDocumentLoad(file, documentId = '') {
  cancelDocumentLoad(false);
  previousDocumentSnapshot = {
    pdfDoc: state.pdfDoc,
    pdfFileName: state.pdfFileName,
    documentId: state.documentId,
    documentFileSize: state.documentFileSize,
    documentFileType: state.documentFileType,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    firstStoryPage: state.firstStoryPage,
    loadedPages: state.loadedPages,
    allChunks: state.allChunks,
    pageStartIndices: state.pageStartIndices,
    documentToc: state.documentToc,
    currentGlobalIndex: state.currentGlobalIndex
  };
  const loadToken = ++state.pdfLoadToken;
  state.isPdfProcessing = true;
  state.pdfDoc = null;
  state.loadedPages = 0;
  state.pdfFileName = file.name;
  state.documentId = documentId || createLegacyDocumentId(file);
  state.documentFileSize = Number(file.size) || 0;
  state.documentFileType = getDocumentExtension(file);
  state.documentCreatedAt = Date.now();
  state.documentToc = [];
  state.searchResults = [];
  state.searchResultCursor = -1;
  showLoading('Đang đồng bộ dữ liệu vào hệ thống...');
  updateLoadingProgress(0, 'Đang chuẩn bị tài liệu...');

  const univFileName = document.getElementById('univ-file-name');
  if (univFileName) univFileName.textContent = file.name;
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
    throw new Error('File lớn hơn 200 MB. Hãy chọn file nhỏ hơn để tránh trình duyệt bị treo.');
  }
}

async function processDocumentFile(file) {
  lastFailedDocumentFile = file;
  try {
    validateDocumentFile(file);
  } catch (error) {
    showReaderError('Không thể nạp tài liệu', error.message, error, 'Kiểm tra tệp', file);
    return;
  }

  if (file.size > LARGE_FILE_WARNING_SIZE && !window.confirm(`File ${(file.size / 1048576).toFixed(1)} MB có thể cần nhiều RAM và thời gian xử lý. Tiếp tục mở?`)) return;

  const documentId = await createDocumentFingerprint(file);
  const extension = getDocumentExtension(file);
  if (extension === 'pdf') return processPdfFile(file, documentId);
  if (extension === 'txt') return processTextFile(file, documentId);
  return processEpubFile(file, documentId);
}

async function isTextWorkerAvailable() {
  if (!window.Worker) return false;
  if (!textWorkerAvailabilityPromise) {
    textWorkerAvailabilityPromise = fetch('text-worker.js?v=20261008-10', { cache: 'no-store' })
      .then(response => {
        const contentType = response.headers.get('content-type') || '';
        return response.ok && /javascript|ecmascript|text\/plain/i.test(contentType);
      })
      .catch(() => false);
  }
  return textWorkerAvailabilityPromise;
}

function splitTextWithoutWorker(source, mode = state.chunkMode, options = {}) {
  const text = typeof source === 'string' ? source : new TextDecoder('utf-8').decode(source);
  return splitTextIntoChunks(text, mode, options);
}

async function runTextChunkWorker(source, mode = state.chunkMode, options = {}) {
  const workerOptions = {
    preserveIndents: options.preserveIndents !== undefined ? options.preserveIndents : state.preserveIndents,
    compactBlankLines: options.compactBlankLines !== undefined ? options.compactBlankLines : state.compactBlankLines,
    maxCharsPerLine: options.maxCharsPerLine !== undefined ? options.maxCharsPerLine : (state.layoutMode === 'custom' ? state.maxCharsPerLine : 0)
  };

  if (!await isTextWorkerAvailable()) {
    console.warn('text-worker.js không khả dụng, chuyển sang xử lý trực tiếp.');
    return splitTextWithoutWorker(source, mode, workerOptions);
  }

  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker('text-worker.js?v=20261009-12');
    } catch (error) {
      resolve(splitTextWithoutWorker(source, mode, workerOptions));
      return;
    }
    activeDocumentWorker = worker;
    worker.onmessage = event => {
      if (activeDocumentWorker === worker) activeDocumentWorker = null;
      worker.terminate();
      if (event.data?.error) reject(new Error(event.data.error));
      else resolve((event.data?.chunks || []).map(chunk => cleanAndRepairVietnameseText(chunk)));
    };
    worker.onerror = event => {
      if (activeDocumentWorker === worker) activeDocumentWorker = null;
      worker.terminate();
      if (typeof source === 'string') {
        console.warn('Web Worker lỗi, chuyển sang xử lý trực tiếp:', event.message || event);
        resolve(splitTextWithoutWorker(source, mode, workerOptions));
      } else {
        reject(new Error(event.message || 'Web Worker không xử lý được văn bản.'));
      }
    };
    if (source instanceof ArrayBuffer) worker.postMessage({ buffer: source, mode, options: workerOptions }, [source]);
    else worker.postMessage({ text: String(source || ''), mode, options: workerOptions });
  });
}

function cancelDocumentLoad(notify = true) {
  const wasProcessing = state.isPdfProcessing;
  state.pdfLoadToken += 1;
  state.isPdfProcessing = false;
  if (activeDocumentAbortController) activeDocumentAbortController.abort();
  activeDocumentAbortController = null;
  if (activeDocumentWorker) activeDocumentWorker.terminate();
  activeDocumentWorker = null;
  if (activePdfLoadingTask && typeof activePdfLoadingTask.destroy === 'function') activePdfLoadingTask.destroy().catch(() => {});
  activePdfLoadingTask = null;
  if (wasProcessing && state.pdfDoc && typeof state.pdfDoc.destroy === 'function') state.pdfDoc.destroy().catch(() => {});
  if (wasProcessing && previousDocumentSnapshot) {
    Object.assign(state, previousDocumentSnapshot);
    previousDocumentSnapshot = null;
    if (state.allChunks.length) renderContinuousView(true, state.currentGlobalIndex);
    syncUniversalNavbar();
    if (typeof updatePortalUploadUI === 'function') updatePortalUploadUI();
  } else if (wasProcessing) {
    state.pdfDoc = null;
  }
  hideLoading();
  updatePaginationUI();
  if (notify && wasProcessing) showPageFlipToast('Đã hủy xử lý tài liệu.');
}

function commitDocumentLoad() {
  const previousPdf = previousDocumentSnapshot?.pdfDoc;
  if (previousPdf && previousPdf !== state.pdfDoc && typeof previousPdf.destroy === 'function') previousPdf.destroy().catch(() => {});
  previousDocumentSnapshot = null;
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
  commitDocumentLoad();
  showBanner(`Đã nạp thành công file ${formatLabel}: <b>${totalPages}</b> phần đọc.`);
}

async function processTextFile(file, documentId = '') {
  const loadToken = prepareDocumentLoad(file, documentId);

  try {
    showLoading('Đang đọc nội dung file TXT...');
    const buffer = await file.arrayBuffer();
    if (loadToken !== state.pdfLoadToken) return;
    state.rawText = new TextDecoder('utf-8').decode(buffer);
    updateLoadingProgress(45, 'Đã đọc file, đang chia nội dung thành các đoạn...');
    const chunks = await runTextChunkWorker(buffer, state.chunkMode, {
      preserveIndents: state.preserveIndents,
      compactBlankLines: state.compactBlankLines,
      maxCharsPerLine: state.layoutMode === 'custom' ? state.maxCharsPerLine : 0
    });
    if (loadToken !== state.pdfLoadToken) return;
    updateLoadingProgress(90, 'Đang dựng nội dung lên giao diện...');
    finishTextDocument(chunks, 'TXT');
  } catch (error) {
    if (loadToken !== state.pdfLoadToken) return;
    state.isPdfProcessing = false;
    console.error('TXT parsing error:', error);
    showReaderError('Không thể đọc file TXT', 'Tệp không thể giải mã hoặc xử lý thành nội dung đọc.', error, 'Đọc và chia văn bản', file);
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

  const heading = documentNode.querySelector('h1, h2, h3, title');
  const headings = Array.from(documentNode.querySelectorAll('h1, h2, h3, h4'))
    .map(node => node.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return {
    title: heading?.textContent?.replace(/\s+/g, ' ').trim() || '',
    headings,
    text: blocks.length > 0 ? blocks.join('\n\n') : root.textContent.replace(/\s+/g, ' ').trim()
  };
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

async function processEpubFile(file, documentId = '') {
  const loadToken = prepareDocumentLoad(file, documentId);
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
      throw new Error('Dung lượng EPUB sau giải nén vượt quá giới hạn 300 MB.');
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
    const toc = [];
    let pageNum = 1;
    let totalTextLength = 0;

    for (let index = 0; index < spinePaths.length; index++) {
      if (loadToken !== state.pdfLoadToken) return;

      const chapterEntry = zip.file(spinePaths[index]);
      if (!chapterEntry) continue;

      updateEpubStatus(`Đang đọc chương ${index + 1} / ${spinePaths.length}`);
      updateLoadingProgress(Math.round(((index + 0.2) / spinePaths.length) * 85), `Chương ${index + 1}/${spinePaths.length}`);
      const chapterHtml = await chapterEntry.async('string');
      totalTextLength += chapterHtml.length;
      if (totalTextLength > MAX_EPUB_TEXT_LENGTH) {
        throw new Error('Nội dung EPUB sau giải nén vượt quá giới hạn 60 MB.');
      }

      updateEpubStatus(`Đang tách văn bản chương ${index + 1} / ${spinePaths.length}`);
      await yieldToBrowser();
      const chapter = extractTextFromEpubHtml(chapterHtml);
      const chapterStartPage = pageNum;
      const chunks = await runTextChunkWorker(chapter.text, state.chunkMode);
      if (chunks.length) {
        const chapterHeadings = chapter.headings.length ? chapter.headings : [chapter.title || `Chương ${index + 1}`];
        let searchFrom = 0;
        chapterHeadings.forEach(title => {
          const normalizedTitle = cleanAndRepairVietnameseText(title).toLocaleLowerCase('vi');
          let offset = chunks.findIndex((chunk, chunkIndex) => chunkIndex >= searchFrom && chunk.toLocaleLowerCase('vi').includes(normalizedTitle));
          if (offset < 0) offset = searchFrom;
          searchFrom = Math.min(chunks.length - 1, offset + 1);
          toc.push({ title, page: chapterStartPage + Math.floor(offset / TEXT_CHUNKS_PER_PAGE) });
        });
      }
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
    state.documentToc = toc;
    initStoryFromPages(pagesData, totalPages, 1);
    state.documentToc = toc.map(item => ({ ...item, globalIndex: state.pageStartIndices[item.page] || 0 }));
    persistDocumentCache().catch(() => {});
    commitDocumentLoad();
    const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    showBanner(`Đã nạp thành công EPUB: <b>${totalPages}</b> phần đọc từ ${spinePaths.length} chương trong <b>${elapsedSeconds} giây</b>.`);
  } catch (error) {
    if (loadToken !== state.pdfLoadToken) return;
    state.isPdfProcessing = false;
    console.error('EPUB parsing error:', error);
    showReaderError('Không thể đọc file EPUB', 'EPUB bị lỗi cấu trúc, quá giới hạn hoặc chứa chương không thể giải mã.', error, currentStage, file);
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
  restoreSavedReadingPosition(false);

  applyTheme(state.theme);
  renderContinuousView(false, state.currentGlobalIndex);
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
    if (state.documentToc && state.documentToc.length > 0) {
      state.documentToc.forEach(item => {
        if ((item.globalIndex === undefined || item.globalIndex === 0) && state.pageStartIndices[item.page] !== undefined) {
          item.globalIndex = state.pageStartIndices[item.page];
        }
      });
    }
    updateLoadingProgress(Math.round((state.loadedPages / totalPages) * 100), `${state.loadedPages}/${totalPages} trang đã xử lý`);
    showBanner(`Đã sẵn sàng <b>${state.loadedPages}/${totalPages}</b> trang. Bạn có thể đọc trong khi các trang còn lại đang được xử lý.`);

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  if (loadToken !== state.pdfLoadToken) return;
  state.isPdfProcessing = false;
  updatePaginationUI();
  if (restoreSavedReadingPosition(false)) {
    renderContinuousView(false, state.currentGlobalIndex);
    setTimeout(() => restoreSavedReadingPosition(true), 0);
  }
  showBanner(`Đã nạp thành công toàn bộ <b>${totalPages}</b> trang sách!`);
  saveState();
  persistDocumentCache().catch(() => {});
}

async function extractPdfOutline(pdfDoc) {
  if (!pdfDoc || typeof pdfDoc.getOutline !== 'function') return [];
  try {
    const rawOutline = await pdfDoc.getOutline();
    if (!rawOutline || !rawOutline.length) return [];

    const toc = [];

    async function traverse(items, depth = 0) {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item || !item.title) continue;
        let pageNum = null;
        try {
          let dest = item.dest;
          if (typeof dest === 'string') {
            dest = await pdfDoc.getDestination(dest);
          }
          if (Array.isArray(dest) && dest.length > 0) {
            const ref = dest[0];
            if (typeof ref === 'object' && ref !== null) {
              const pageIndex = await pdfDoc.getPageIndex(ref);
              pageNum = pageIndex + 1;
            } else if (typeof ref === 'number') {
              pageNum = ref + 1;
            }
          }
        } catch (_) {}

        const cleanTitle = cleanAndRepairVietnameseText(item.title).replace(/\s+/g, ' ').trim();
        if (cleanTitle) {
          const indent = depth > 0 ? '— '.repeat(depth) : '';
          toc.push({
            title: indent + cleanTitle,
            page: pageNum || 1
          });
        }
        if (Array.isArray(item.items) && item.items.length > 0) {
          await traverse(item.items, depth + 1);
        }
      }
    }

    await traverse(rawOutline);
    return toc;
  } catch (err) {
    console.warn('Không thể đọc outline của PDF:', err);
    return [];
  }
}

async function processPdfFile(file, documentId = '') {
  const loadToken = prepareDocumentLoad(file, documentId);

  // Only upload the PDF when a real parser endpoint is available.
  if (await hasPdfBackend()) {
    try {
      const formData = new FormData();
      formData.append('pdf', file, file.name);
      activeDocumentAbortController = new AbortController();

      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
        signal: activeDocumentAbortController.signal
      });

      if (res.ok) {
        const data = await res.json();
        if (loadToken !== state.pdfLoadToken) return;
        if (data.success && data.totalPages > 0) {
          state.totalPages = data.totalPages;
          state.firstStoryPage = data.firstStoryPage || 1;
          state.loadedPages = data.totalPages;
          state.isPdfProcessing = false;
          const backendToc = Array.isArray(data.toc) ? data.toc : [];

          showBanner(`Đã nạp thành công toàn bộ <b>${data.totalPages}</b> trang sách!`);
          initStoryFromPages(data.pages, data.totalPages, state.firstStoryPage);
          if (backendToc.length > 0) {
            state.documentToc = backendToc.map(item => ({
              ...item,
              globalIndex: state.pageStartIndices[item.page] ?? 0
            }));
            persistDocumentCache().catch(() => {});
          }
          commitDocumentLoad();
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
    activePdfLoadingTask = loadingTask;

    state.pdfDoc = await loadingTask.promise;
    if (loadToken !== state.pdfLoadToken) return;

    state.totalPages = state.pdfDoc.numPages;
    if (state.totalPages < 1) throw new Error('File PDF không có trang nào');
    const outlinePromise = extractPdfOutline(state.pdfDoc).catch(() => []);
    const initialPageCount = Math.min(PDF_INITIAL_PAGE_COUNT, state.totalPages);
    const initialPageNumbers = Array.from({ length: initialPageCount }, (_, index) => index + 1);

    showLoading(`Đang trích xuất ${initialPageCount} trang đầu tiên...`);
    updateLoadingProgress(30, `Đang chuẩn bị ${initialPageCount} trang đầu tiên...`);
    const initialPages = await Promise.all(initialPageNumbers.map(pageNum => extractPdfPage(state.pdfDoc, pageNum)));
    if (loadToken !== state.pdfLoadToken) return;

    initProgressiveStory(initialPages, state.totalPages);
    const clientToc = await outlinePromise;
    if (clientToc && clientToc.length > 0) {
      state.documentToc = clientToc.map(item => ({
        ...item,
        globalIndex: state.pageStartIndices[item.page] ?? 0
      }));
      persistDocumentCache().catch(() => {});
    }
    commitDocumentLoad();
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
    showReaderError('Không thể đọc file PDF', 'PDF có thể bị khóa, hỏng cấu trúc hoặc không chứa lớp văn bản.', err, 'Trích xuất văn bản PDF', file);
  } finally {
    if (loadToken === state.pdfLoadToken) {
      activeDocumentAbortController = null;
      activePdfLoadingTask = null;
      hideLoading();
    }
  }
}

function splitTextIntoChunks(text, mode = state.chunkMode, options = {}) {
  const preserveIndents = options.preserveIndents !== undefined ? options.preserveIndents : state.preserveIndents;
  const compactBlankLines = options.compactBlankLines !== undefined ? options.compactBlankLines : state.compactBlankLines;
  const maxCharsPerLine = Number(options.maxCharsPerLine) || (state.layoutMode === 'custom' ? state.maxCharsPerLine : 0);

  let cleanText = cleanAndRepairVietnameseText(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (!preserveIndents) {
    cleanText = cleanText.replace(/\t/g, ' ').replace(/ +/g, ' ');
  }

  function applyMaxChars(str, limit) {
    if (!limit || limit <= 0 || str.length <= limit) return [str];
    const words = str.split(' ');
    const res = [];
    let cur = '';
    for (const w of words) {
      if (!cur) {
        cur = w;
      } else if ((cur + ' ' + w).length <= limit) {
        cur += ' ' + w;
      } else {
        res.push(cur);
        cur = w;
      }
    }
    if (cur) res.push(cur);
    return res.length ? res : [str];
  }

  // 1. Line-by-Line: 1 dòng gốc = đúng 1 dòng hiển thị
  if (mode === 'line') {
    const rawLines = cleanText.split('\n');
    const result = [];
    rawLines.forEach(line => {
      const lineText = preserveIndents ? line : line.trim();
      if (compactBlankLines && !lineText.trim()) return;
      if (maxCharsPerLine > 0) {
        applyMaxChars(lineText, maxCharsPerLine).forEach(w => result.push(w));
      } else {
        result.push(lineText);
      }
    });
    return result.length > 0 ? result : [cleanText];
  }

  // 2. Sentence-by-sentence
  if (mode === 'sentence') {
    const rawSentences = cleanText.split(/([.!?…\n]+)/);
    const sentences = [];
    let cur = '';
    for (let i = 0; i < rawSentences.length; i++) {
      cur += rawSentences[i];
      if (cur.trim().length > 20 || rawSentences[i].includes('\n')) {
        const s = preserveIndents ? cur : cur.trim();
        if (s.trim().length > 0) {
          if (maxCharsPerLine > 0) {
            applyMaxChars(s, maxCharsPerLine).forEach(w => sentences.push(w));
          } else {
            sentences.push(s);
          }
        }
        cur = '';
      }
    }
    if (cur.trim().length > 0) {
      const s = preserveIndents ? cur : cur.trim();
      if (maxCharsPerLine > 0) {
        applyMaxChars(s, maxCharsPerLine).forEach(w => sentences.push(w));
      } else {
        sentences.push(s);
      }
    }
    return sentences;
  }

  // 3. Paragraph mode
  const paragraphs = cleanText.split(/\n\s*\n|\n/);
  const result = [];
  paragraphs.forEach(p => {
    const trimmed = preserveIndents ? p : p.trim();
    if (trimmed.length > 0) {
      if (maxCharsPerLine > 0) {
        applyMaxChars(trimmed, maxCharsPerLine).forEach(w => result.push(w));
      } else if (trimmed.length > 250) {
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
  const restoredBookmark = restoreSavedReadingPosition(false);

  applyTheme(state.theme);
  renderContinuousView(false, state.currentGlobalIndex);
  saveState();
  persistDocumentCache().catch(() => {});
  if (typeof updatePortalUploadUI === 'function') updatePortalUploadUI();
  if (restoredBookmark) {
    setTimeout(() => restoreSavedReadingPosition(true), 0);
  }
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
// Per-theme renderer: batch appender + the containers cleared on a full re-render.
const THEME_RENDERERS = {
  'theme-vscode': { append: appendVSCodeBatch, streams: ['vsc-line-numbers', 'vsc-code-lines'] },
  'theme-googledocs': { append: appendGoogleDocsBatch, streams: ['gdocs-story-stream'] },
  'theme-photoshop': { append: appendPhotoshopBatch, streams: ['ps-story-stream'] },
  'theme-blender': { append: appendBlenderBatch, streams: ['blender-story-stream'] },
  'theme-linkedin': { append: appendLinkedInBatch, streams: ['linkedin-story-stream'] },
  'theme-autocad': { append: appendAutoCADBatch, streams: ['autocad-story-stream'] },
  'theme-zalo': { append: appendZaloBatch, streams: ['zalo-story-stream'] },
  'theme-figma': { append: appendFigmaBatch, streams: ['figma-story-stream'] },
  'theme-canva': { append: appendCanvaBatch, streams: ['canva-story-stream'] },
  'theme-powerpoint': { append: appendPowerPointBatch, streams: ['ppt-story-stream'] },
  'theme-thuvienphapluat': { append: appendTVPLBatch, streams: ['tvpl-story-stream'] },
  'theme-premiere': { append: appendPremiereBatch, streams: ['premiere-story-stream'] },
  'theme-claude': { append: appendClaudeBatch, streams: ['claude-story-stream'] },
  'theme-chatgpt': { append: appendChatGPTBatch, streams: ['chatgpt-story-stream'] },
  'theme-teams': { append: appendTeamsBatch, streams: ['teams-story-stream'] },
  'theme-revit': { append: appendRevitBatch, streams: ['revit-story-stream'] },
  'theme-misa': { append: appendMisaBatch, streams: ['misa-story-stream'] },
  'theme-capcut': { append: appendCapCutBatch, streams: ['capcut-story-stream'] },
  'theme-sap': { append: appendSAPBatch, streams: ['sap-story-stream'] },
  'theme-gmail': { append: appendGmailBatch, streams: ['gmail-story-stream'] },
  'theme-outlook': { append: appendOutlookBatch, streams: ['outlook-story-stream'] },
  // Google Sheets / Excel (spreadsheet table) is the default
  default: { append: appendSpreadsheetBatch, streams: ['story-tbody'] }
};

function getThemeRenderer() {
  return THEME_RENDERERS[state.theme] || THEME_RENDERERS.default;
}

function renderContinuousView(preserveActiveRow = false, targetScrollIdx = null) {
  const targetIdx = (targetScrollIdx !== null) ? targetScrollIdx : (preserveActiveRow ? state.currentGlobalIndex : 0);

  state.renderedCount = 0;
  getThemeRenderer().streams.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.replaceChildren();
  });

  // Render initial batch: up to targetIdx + 60, minimum 120 items
  const initialBatchCount = Math.max(120, targetIdx + 60);
  renderNextBatch(initialBatchCount);

  // Focus and scroll to active row
  suppressScrollSyncUntil = Date.now() + 1500;
  setActiveRow(targetIdx, true);
  updatePaginationUI();
}

function renderNextBatch(count = 100) {
  getThemeRenderer().append(count);
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

// Shared Simple Theme Batch Generator
function appendSimpleThemeBatch(count, streamId, makeItem) {
  const stream = document.getElementById(streamId);
  if (!stream || state.allChunks.length === 0) return;
  const start = state.renderedCount;
  const end = Math.min(start + count, state.allChunks.length);
  if (start >= end) return;
  const fragment = document.createDocumentFragment();
  for (let i = start; i < end; i++) {
    const chunk = state.allChunks[i];
    const el = makeItem(chunk);
    el.dataset.index = chunk.globalIndex;
    el.dataset.page = chunk.page;
    const gIdx = chunk.globalIndex;
    el.addEventListener('click', () => setActiveRow(gIdx, true));
    fragment.appendChild(el);
  }
  stream.appendChild(fragment);
  state.renderedCount = end;
}

// 4. Adobe Photoshop Artboard Typography Batch Renderer
function appendPhotoshopBatch(count) {
  appendSimpleThemeBatch(count, 'ps-story-stream', chunk => {
    const p = document.createElement('div');
    p.className = 'ps-story-paragraph';
    p.id = `ps-story-para-${chunk.globalIndex}`;
    p.innerHTML = `
      <span class="ps-chunk-meta">T&nbsp;&nbsp;Editorial_Copy_${String(chunk.globalIndex + 1).padStart(4, '0')} &nbsp;•&nbsp; Artboard ${chunk.page}</span>
      <div class="ps-chunk-body">${escapeHtml(chunk.text)}</div>
    `;
    return p;
  });
}

// 5. Blender Text Editor Batch Renderer
function appendBlenderBatch(count) {
  appendSimpleThemeBatch(count, 'blender-story-stream', chunk => {
    const line = document.createElement('div');
    line.className = 'blender-code-line';
    line.id = `blender-story-line-${chunk.globalIndex}`;
    const variableName = `copy_block_${String(chunk.globalIndex + 1).padStart(4, '0')}`;
    line.innerHTML = `
      <span class="b-line-number">${chunk.globalIndex + 12}</span>
      <span class="b-code-content"><span class="b-code-var">${variableName}</span> <span class="b-code-op">=</span> <span class="b-story-text">"""${escapeHtml(chunk.text)}"""</span></span>
    `;
    return line;
  });
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

    let paragraphsHtml = '';
    postChunkBatch.forEach((chunk) => {
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
  appendSimpleThemeBatch(count, 'autocad-story-stream', chunk => {
    const note = document.createElement('div');
    note.className = 'cad-note-item';
    note.id = `autocad-note-${chunk.globalIndex}`;
    const noteTag = `GN-${String(chunk.page).padStart(2, '0')}.${String(chunk.indexInPage + 1).padStart(2, '0')}`;
    note.innerHTML = `
      <span class="cad-note-tag">${noteTag}:</span>
      <span class="cad-note-text">${escapeHtml(chunk.text)}</span>
    `;
    return note;
  });
}

// 8. Google Docs Manuscript Paragraph Batch Renderer
function appendGoogleDocsBatch(count) {
  appendSimpleThemeBatch(count, 'gdocs-story-stream', chunk => {
    const p = document.createElement('p');
    p.className = 'gdocs-story-paragraph';
    p.id = `gdocs-story-para-${chunk.globalIndex}`;
    p.textContent = chunk.text;
    if (state.fontFamily) p.style.fontFamily = state.fontFamily;
    if (state.fontSize) p.style.fontSize = `${state.fontSize}pt`;
    if (state.lineHeight) p.style.lineHeight = state.lineHeight;
    if (state.isBold) p.style.fontWeight = 'bold';
    if (state.isItalic) p.style.fontStyle = 'italic';
    return p;
  });
}

// 9. Zalo PC Chat Stream Batch Renderer
const ZALO_SENDERS = [
  { name: 'Minh Quân (Tech Lead)', avatar: 'MQ', bg: '#0068ff', isOwner: true },
  { name: 'Thu Hà (BA Lead)', avatar: 'TH', bg: '#059669', isOwner: false },
  { name: 'Hoàng Long (Dev Lead)', avatar: 'HL', bg: '#7c3aed', isOwner: false },
  { name: 'Tuấn Anh (DevOps Lead)', avatar: 'TA', bg: '#d97706', isOwner: false },
  { name: 'Văn Nam (Security)', avatar: 'VN', bg: '#e11d48', isOwner: false },
  { name: 'Đức Huy (QA Lead)', avatar: 'DH', bg: '#0284c7', isOwner: false }
];

function appendZaloBatch(count) {
  appendSimpleThemeBatch(count, 'zalo-story-stream', chunk => {
    const sender = ZALO_SENDERS[chunk.globalIndex % ZALO_SENDERS.length];
    const hour = 8 + Math.floor((chunk.globalIndex * 7) / 60) % 10;
    const min = (chunk.globalIndex * 13) % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    const msgItem = document.createElement('div');
    msgItem.className = 'zalo-msg-item';
    msgItem.id = `zalo-msg-${chunk.globalIndex}`;

    const avatarHtml = `<div class="zalo-msg-avatar" style="position:relative; width:36px; height:36px; border-radius:50%; background:${sender.bg}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${sender.avatar}${sender.isOwner ? '<span class="zavatar-key-badge" title="Trưởng nhóm">🔑</span>' : ''}</div>`;

    msgItem.innerHTML = `
      ${avatarHtml}
      <div class="zalo-msg-content-box">
        <div class="zalo-msg-sender-name">
          <span>${sender.name}</span>
          ${sender.isOwner ? '<span style="color:#0068ff; font-size:10px;">(Trưởng nhóm)</span>' : ''}
          <span class="zalo-msg-time">${timeStr} • Trang ${chunk.page}</span>
        </div>
        <div class="zalo-msg-bubble">
          <div class="zalo-msg-text">${escapeHtml(chunk.text)}</div>
          <span class="zalo-msg-meta-tag">Đoạn #${chunk.globalIndex + 1} • Đã nhận ✓✓</span>
        </div>
      </div>
    `;
    return msgItem;
  });
}

// 10. Figma UI/UX Design System Typography Batch Renderer
function appendFigmaBatch(count) {
  appendSimpleThemeBatch(count, 'figma-story-stream', chunk => {
    const layer = document.createElement('div');
    layer.className = 'figma-layer-item';
    layer.id = `figma-layer-${chunk.globalIndex}`;
    const layerName = `T Body_Copy_Block_${String(chunk.globalIndex + 1).padStart(4, '0')}`;
    layer.innerHTML = `
      <div class="figma-layer-meta">
        <span class="figma-meta-name">${layerName}</span>
        <span class="figma-meta-spec">AutoLayout • Trang ${chunk.page}</span>
      </div>
      <div class="figma-text-layer">${escapeHtml(chunk.text)}</div>
    `;
    return layer;
  });
}

// 11. Canva Presentation Slide Text Box Batch Renderer
function appendCanvaBatch(count) {
  appendSimpleThemeBatch(count, 'canva-story-stream', chunk => {
    const box = document.createElement('div');
    box.className = 'canva-block-item';
    box.id = `canva-block-${chunk.globalIndex}`;
    box.innerHTML = `
      <div class="canva-block-header">
        <span class="canva-block-label">Mục ${chunk.globalIndex + 1} • Trang ${chunk.page}</span>
      </div>
      <div class="canva-text-box">${escapeHtml(chunk.text)}</div>
    `;
    return box;
  });
}

// 12. Microsoft PowerPoint Bullet Paragraph Batch Renderer
function appendPowerPointBatch(count) {
  appendSimpleThemeBatch(count, 'ppt-story-stream', chunk => {
    const para = document.createElement('div');
    para.className = 'ppt-para-item';
    para.id = `ppt-para-${chunk.globalIndex}`;
    para.innerHTML = `
      <span class="ppt-bullet-icon">■</span>
      <div class="ppt-bullet-text">${escapeHtml(chunk.text)}</div>
    `;
    return para;
  });
}

// 13. Thư Viện Pháp Luật (TVPL) Administrative Article & Clause Batch Renderer
function appendTVPLBatch(count) {
  appendSimpleThemeBatch(count, 'tvpl-story-stream', chunk => {
    const item = document.createElement('div');
    item.className = 'tvpl-clause-item';
    item.id = `tvpl-clause-${chunk.globalIndex}`;
    item.innerHTML = `
      <div class="tvpl-clause-num">Điều ${chunk.globalIndex + 1}.</div>
      <div class="tvpl-clause-text">${escapeHtml(chunk.text)}</div>
    `;
    return item;
  });
}


// ==========================================================
// SELECTION, FOCUS & NAVIGATION
// ==========================================================
// Per-theme spec: element id prefix + the CSS class marking the active item.
const ACTIVE_ROW_SPECS = {
  'theme-vscode': { id: 'vsc-story-line-', cls: 'active-line' },
  'theme-photoshop': { id: 'ps-story-para-', cls: 'active-paragraph' },
  'theme-blender': { id: 'blender-story-line-', cls: 'active-line' },
  'theme-googledocs': { id: 'gdocs-story-para-', cls: 'active-paragraph' },
  'theme-autocad': { id: 'autocad-note-', cls: 'active-note' },
  'theme-zalo': { id: 'zalo-msg-', cls: 'active-msg' },
  'theme-figma': { id: 'figma-layer-', cls: 'active-layer' },
  'theme-canva': { id: 'canva-block-', cls: 'active-block' },
  'theme-powerpoint': { id: 'ppt-para-', cls: 'active-bullet' },
  'theme-thuvienphapluat': { id: 'tvpl-clause-', cls: 'active-clause' },
  'theme-premiere': { id: 'pr-caption-', cls: 'active-caption' },
  'theme-claude': { id: 'claude-para-', cls: 'active-para' },
  'theme-chatgpt': { id: 'gpt-para-', cls: 'active-para' },
  'theme-teams': { id: 'teams-msg-', cls: 'active-msg' },
  'theme-revit': { id: 'revit-clause-', cls: 'active-clause' },
  'theme-misa': { id: 'misa-order-', cls: 'selected-order-row' },
  'theme-capcut': { id: 'capcut-cap-', cls: 'active-caption' },
  'theme-sap': { id: 'sap-item-', cls: 'selected-sap-row' },
  'theme-gmail': { id: 'gmail-para-', cls: 'active-email-para' },
  'theme-outlook': { id: 'outlook-para-', cls: 'active-outlook-para' }
};

// Track the elements we marked so clearing is O(1) instead of scanning the whole rendered document.
const activeMarks = [];

function clearActiveMarks() {
  for (const [el, cls] of activeMarks) el.classList.remove(cls);
  activeMarks.length = 0;
}

function markActive(el, cls) {
  if (!el) return false;
  el.classList.add(cls);
  activeMarks.push([el, cls]);
  return true;
}

function setActiveRow(index, scrollIntoView = true) {
  if (index < 0 || index >= state.allChunks.length) return;
  state.currentGlobalIndex = index;

  const chunk = state.allChunks[index];
  if (chunk && chunk.page && chunk.page !== state.currentPage) {
    state.currentPage = chunk.page;
    updatePaginationUI();
  }

  clearActiveMarks();
  let target = null;
  const spec = ACTIVE_ROW_SPECS[state.theme];

  if (spec) {
    target = document.getElementById(spec.id + index);
    markActive(target, spec.cls);
  } else if (state.theme === 'theme-linkedin') {
    target = document.getElementById(`ln-para-${index}`);
    if (target) {
      markActive(target, 'active-paragraph');
      markActive(target.closest('.linkedin-post-card'), 'active-post');
    } else {
      // Fallback for legacy post if any
      target = document.getElementById(`linkedin-post-${index}`);
      markActive(target, 'active-post');
    }
  } else {
    const activeRow = document.getElementById(`story-row-${index}`);
    const activeCell = document.getElementById(`story-cell-${index}`);
    if (activeRow && activeCell) {
      markActive(activeRow, 'selected-story-row');
      markActive(activeCell, 'cell-focused');
      target = activeRow;
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

  if (target && scrollIntoView) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (state.theme === 'theme-vscode') {
    const vscStatusLn = document.getElementById('vsc-status-ln');
    if (vscStatusLn) {
      vscStatusLn.textContent = `Ln ${18 + index * 4}, Col 28`;
    }
    const vscProgress = document.getElementById('vsc-status-progress');
    if (vscProgress) {
      const percent = Math.round(((index + 1) / Math.max(1, state.allChunks.length)) * 100);
      vscProgress.textContent = `Page ${state.currentPage}/${state.totalPages} (${percent}%)`;
    }
  }

  updateReadingProgressStatus(index);
  scheduleSaveState();
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
  
  themeControlIds('page-indicator').forEach(id => {
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

  themeControlIds('btn-prev').forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = state.currentPage <= 1;
  });

  themeControlIds('btn-next').forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = state.currentPage >= maxNavigablePage;
  });
  syncUniversalNavbar();
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
  suppressScrollSyncUntil = Date.now() + 1000;
  updatePaginationUI();
  setActiveRow(targetIdx, true);

  showPageFlipToast(`📖 Đang xem <b>Trang ${pageNum} / ${state.totalPages}</b>`);
}

function changePage(delta) {
  let currPage = state.currentPage;
  const currentChunk = state.allChunks[state.currentGlobalIndex];
  if (currentChunk && currentChunk.page) {
    currPage = currentChunk.page;
  }

  let target = currPage + delta;
  if (delta > 0 && state.pageStartIndices[target] !== undefined && state.pageStartIndices[target] <= state.currentGlobalIndex) {
    target = target + 1;
  }
  target = Math.max(1, Math.min(state.totalPages, target));
  goToPage(target);
}

function navigateRow(delta) {
  const next = state.currentGlobalIndex + delta;
  if (next >= 0 && next < state.allChunks.length) {
    if (next >= state.renderedCount - 15) {
      renderNextBatch(state.BATCH_SIZE);
    }
    suppressScrollSyncUntil = Date.now() + 650;
    setActiveRow(next, true);
  }
}

// ==========================================================
// INFINITE CONTINUOUS SCROLL LISTENERS
// ==========================================================
let scrollThrottleTimer = false;
let suppressScrollSyncUntil = 0;

function getActiveScrollContainer() {
  const containerMap = {
    'theme-googlesheets': 'grid-scroll-container',
    'theme-excel': 'grid-scroll-container',
    'theme-googledocs': 'gdocs-canvas-scroll-container',
    'theme-vscode': 'vsc-code-scroll-container',
    'theme-photoshop': 'ps-canvas-scroll-container',
    'theme-blender': 'blender-viewport-scroll-container',
    'theme-linkedin': 'linkedin-feed-scroll-container',
    'theme-autocad': 'autocad-canvas-scroll-container',
    'theme-zalo': 'zalo-chat-scroll-container',
    'theme-figma': 'figma-canvas-scroll-container',
    'theme-canva': 'canva-canvas-scroll-container',
    'theme-powerpoint': 'ppt-canvas-scroll-container',
    'theme-thuvienphapluat': 'tvpl-document-scroll-container',
    'theme-premiere': 'premiere-transcript-scroll-container',
    'theme-claude': 'claude-chat-scroll-container',
    'theme-chatgpt': 'chatgpt-chat-scroll-container',
    'theme-teams': 'teams-chat-scroll-container',
    'theme-revit': 'revit-schedule-scroll-container',
    'theme-misa': 'misa-orders-scroll-container',
    'theme-capcut': 'capcut-scroll-container',
    'theme-sap': 'sap-scroll-container',
    'theme-gmail': 'gmail-scroll-container',
    'theme-outlook': 'outlook-scroll-container',
  };
  const id = containerMap[state.theme];
  if (id) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return document.getElementById('grid-scroll-container') ||
         document.getElementById('capcut-scroll-container') ||
         document.getElementById('sap-scroll-container') ||
         document.getElementById('tvpl-document-scroll-container') ||
         document.getElementById('gdocs-canvas-scroll-container') ||
         document.getElementById('vsc-code-scroll-container') ||
         document.getElementById('ps-canvas-scroll-container') ||
         document.getElementById('blender-viewport-scroll-container') ||
         document.getElementById('linkedin-feed-scroll-container') ||
         document.getElementById('autocad-canvas-scroll-container') ||
         document.getElementById('zalo-chat-scroll-container') ||
         document.getElementById('figma-canvas-scroll-container') ||
         document.getElementById('canva-canvas-scroll-container') ||
         document.getElementById('ppt-canvas-scroll-container') ||
         document.getElementById('premiere-transcript-scroll-container') ||
         document.getElementById('claude-chat-scroll-container') ||
         document.getElementById('chatgpt-chat-scroll-container') ||
         document.querySelector('.table-container');
}

function initContinuousScrollListeners() {
  function handleContainerScroll(container) {
    if (state.bossModeActive) return;

    // 1. Infinite scroll: check if near bottom to load next batch (expanded threshold for seamless continuous reading)
    const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    if (distanceToBottom <= 1200 || container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
      if (state.renderedCount < state.allChunks.length) {
        renderNextBatch(state.BATCH_SIZE);
      }
    }

    // 2. Viewport detection: detect current page from top third of viewport
    if (Date.now() < suppressScrollSyncUntil) return;

    if (scrollThrottleTimer) return;
    scrollThrottleTimer = true;
    requestAnimationFrame(() => {
      scrollThrottleTimer = false;
      const rect = container.getBoundingClientRect();
      const sampleX = rect.left + Math.min(220, rect.width / 2);
      const sampleY = rect.top + Math.max(80, Math.min(rect.height * 0.45, rect.height - 40));

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
          scheduleSaveState();
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
    document.getElementById('tvpl-document-scroll-container'),
    document.getElementById('premiere-transcript-scroll-container'),
    document.getElementById('claude-chat-scroll-container'),
    document.getElementById('chatgpt-chat-scroll-container'),
    document.getElementById('teams-chat-scroll-container'),
    document.getElementById('revit-schedule-scroll-container'),
    document.getElementById('misa-orders-scroll-container'),
  ];
  scrollContainers.forEach(container => {
    if (container) {
      container.addEventListener('scroll', () => handleContainerScroll(container), { passive: true });
    }
  });

  // Global mouse wheel listener: route the wheel to the active reading pane.
  // The app shell keeps body overflow hidden, so relying on native bubbling can
  // leave the mouse wheel inert when the cursor is over headers or nested panes.
  window.addEventListener('wheel', (e) => {
    if (state.bossModeActive) return;
    if (e.ctrlKey) return;

    // Allow modal overlays to scroll normally
    if (document.querySelector('.stealth-modal-overlay.show, .landing-portal-overlay.show')) {
      return;
    }

    const activeContainer = getActiveScrollContainer();
    if (!activeContainer) return;

    // Check if the event originated inside an independent scrollable pane (e.g. layers list, chat history, left sidebar)
    let el = e.target;
    let isIndependentScroll = false;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (el !== activeContainer && (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        if ((e.deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight) ||
            (e.deltaY < 0 && el.scrollTop > 0)) {
          isIndependentScroll = true;
          break;
        }
      }
      el = el.parentElement;
    }

    if (!isIndependentScroll) {
      e.preventDefault();
      const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : (e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? activeContainer.clientHeight : 1);
      activeContainer.scrollBy({ top: e.deltaY * unit, left: e.deltaX * unit, behavior: 'auto' });
    }
  }, { passive: false });
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

  themeControlIds('btn-autoscroll').forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.textContent = '⏸ Tạm dừng';
      btn.classList.add('playing');
    }
  });

  state.autoScrollInterval = setInterval(() => {
    navigateRow(1);
  }, state.autoScrollDelay);
  syncUniversalNavbar();
}

function stopAutoScroll() {
  state.isAutoScrolling = false;

  themeControlIds('btn-autoscroll').forEach(id => {
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
  syncUniversalNavbar();
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
    const box = spinner.querySelector('.loading-box');
    if (box && !box.querySelector('.reader-loading-progress')) {
      const progress = document.createElement('div');
      progress.className = 'reader-loading-progress';
      progress.innerHTML = '<div class="reader-loading-progress-bar"></div>';
      box.appendChild(progress);
      const label = document.createElement('div');
      label.className = 'reader-loading-progress-label';
      box.appendChild(label);
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'reader-loading-cancel';
      cancel.textContent = 'Hủy xử lý';
      cancel.addEventListener('click', () => cancelDocumentLoad(true));
      box.appendChild(cancel);
    }
    spinner.style.display = 'flex';
  }
}
function updateLoadingProgress(percent, label = '') {
  const spinner = document.getElementById('loading-spinner');
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  const bar = spinner?.querySelector('.reader-loading-progress-bar');
  const text = spinner?.querySelector('.reader-loading-progress-label');
  if (bar) bar.style.width = `${safePercent}%`;
  if (text) text.textContent = label || `${Math.round(safePercent)}%`;

  if (typeof updatePortalUploadProgress === 'function') {
    updatePortalUploadProgress(safePercent, label);
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



// ==========================================================
// 14-16. PREMIERE PRO / CLAUDE / CHATGPT RENDERERS
// ==========================================================
function premiereTimecode(i) {
  const total = i * 7 + 3;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}:${pad((i * 11) % 25)}`;
}

function appendPremiereBatch(count) {
  appendSimpleThemeBatch(count, 'premiere-story-stream', chunk => {
    const el = document.createElement('div');
    el.className = 'pr-cap';
    el.id = `pr-caption-${chunk.globalIndex}`;
    const speaker = chunk.page % 2 ? 'Speaker 1' : 'Speaker 2';
    el.innerHTML = `<div class="pr-cap-meta"><span class="pr-cap-speaker s${chunk.page % 2}">${speaker}</span><span class="pr-cap-tc">${premiereTimecode(chunk.globalIndex)}</span></div><div class="pr-cap-text">${escapeHtml(chunk.text)}</div>`;
    return el;
  });
}

function appendClaudeBatch(count) {
  appendSimpleThemeBatch(count, 'claude-story-stream', chunk => {
    const el = document.createElement('div');
    el.className = 'cl-para';
    el.id = `claude-para-${chunk.globalIndex}`;
    const heading = (chunk.indexInPage === 0) ? `<h3 class="cl-h">Phần ${chunk.page}</h3>` : '';
    el.innerHTML = `${heading}<p>${escapeHtml(chunk.text)}</p>`;
    return el;
  });
}

function appendChatGPTBatch(count) {
  appendSimpleThemeBatch(count, 'chatgpt-story-stream', chunk => {
    const el = document.createElement('div');
    el.className = 'gpt-para';
    el.id = `gpt-para-${chunk.globalIndex}`;
    const heading = (chunk.indexInPage === 0) ? `<h3 class="gpt-h">${chunk.page}. Phần ${chunk.page}</h3>` : '';
    el.innerHTML = `${heading}<p>${escapeHtml(chunk.text)}</p>`;
    return el;
  });
}

function appendTeamsBatch(count) {
  appendSimpleThemeBatch(count, 'teams-story-stream', chunk => {
    const cardEl = document.createElement('div');
    cardEl.className = 'teams-doc-paragraph-card';
    cardEl.id = `teams-msg-${chunk.globalIndex}`;
    const headingHtml = (chunk.indexInPage === 0) ? `<div class="teams-doc-heading">Phần ${chunk.page}: Báo cáo tiến độ &amp; Hợp đồng dự án</div>` : '';
    cardEl.innerHTML = `
      ${headingHtml}
      <div class="teams-doc-body">${escapeHtml(chunk.text)}</div>
      <div class="teams-doc-meta">&bull; Trang ${chunk.page} - Đoạn #${chunk.globalIndex + 1}</div>
    `;
    return cardEl;
  });
}

function appendRevitBatch(count) {
  appendSimpleThemeBatch(count, 'revit-story-stream', chunk => {
    const note = document.createElement('div');
    note.className = 'rvt-note-item';
    note.id = `revit-clause-${chunk.globalIndex}`;
    const specTag = `SPEC-A${chunk.page}.${String(chunk.indexInPage + 1).padStart(2, '0')}`;
    note.innerHTML = `
      <span class="rvt-note-tag">${specTag}</span>
      <span class="rvt-note-text">${escapeHtml(chunk.text)}</span>
    `;
    return note;
  });
}

// 19. MISA SME.NET 2021 Batch Renderer (Orders Master Grid)
const MISA_CUSTOMERS = [
  'Công ty TNHH Ánh Dương',
  'Tập đoàn VinaTech',
  'Cty CP Đầu tư Phát Đạt',
  'DNTN Thương Mại Minh Long',
  'Cty Cổ phần Dịch vụ Đại Dương',
  'TNHH Sản xuất & TMDV Hồng Phúc',
  'Chi nhánh Miền Nam - Cty Á Châu',
  'Cty TNHH Giải pháp Phần mềm An Phát'
];

function appendMisaBatch(count) {
  appendSimpleThemeBatch(count, 'misa-story-stream', chunk => {
    const tr = document.createElement('tr');
    tr.className = 'misa-order-row';
    tr.id = `misa-order-${chunk.globalIndex}`;
    const orderNum = `DH2026-${String(chunk.globalIndex + 1).padStart(5, '0')}`;
    const orderDate = `0${(chunk.globalIndex % 28) + 1}/10/2026`.replace('00', '0');
    const custName = MISA_CUSTOMERS[chunk.globalIndex % MISA_CUSTOMERS.length];
    const amountVal = ((chunk.globalIndex + 1) * 1250000).toLocaleString('vi-VN') + ',00';

    tr.innerHTML = `
      <td style="text-align:center;"><input type="checkbox"></td>
      <td style="color:#059669; font-weight:500;">Chưa thực hiện</td>
      <td>${orderDate}</td>
      <td style="font-weight:600; color:#005a9c;">${orderNum}</td>
      <td>${orderDate}</td>
      <td title="${custName}">${custName}</td>
      <td class="misa-col-desc">${escapeHtml(chunk.text)}</td>
      <td style="text-align:right; font-family:Consolas, monospace;">${amountVal}</td>
      <td style="text-align:right; font-family:Consolas, monospace;">0,00</td>
    `;
    return tr;
  });

  const rowCountEl = document.getElementById('misa-row-count');
  if (rowCountEl) {
    rowCountEl.textContent = `Số dòng = ${state.renderedCount}`;
  }
}

// 20. CapCut Pro Subtitle & Captions Batch Renderer
function capcutTimecode(i) {
  const total = i * 4 + 2;
  const pad = n => String(n).padStart(2, '0');
  const h = pad(Math.floor(total / 3600));
  const m = pad(Math.floor(total / 60) % 60);
  const s = pad(total % 60);
  const f = pad((i * 13) % 60);
  const endTotal = total + 3;
  const em = pad(Math.floor(endTotal / 60) % 60);
  const es = pad(endTotal % 60);
  const ef = pad(((i * 13) + 24) % 60);
  return `${h}:${m}:${s}:${f} - ${h}:${em}:${es}:${ef}`;
}

function appendCapCutBatch(count) {
  appendSimpleThemeBatch(count, 'capcut-story-stream', chunk => {
    const el = document.createElement('div');
    el.className = 'cc-caption-card';
    el.id = `capcut-cap-${chunk.globalIndex}`;
    const tc = capcutTimecode(chunk.globalIndex);
    el.innerHTML = `
      <div class="cc-caption-meta">
        <span class="cc-caption-tc">${tc}</span>
        <span class="cc-caption-num">#${String(chunk.globalIndex + 1).padStart(3, '0')}</span>
        <span class="cc-caption-dur">3.4s</span>
      </div>
      <div class="cc-caption-text">${escapeHtml(chunk.text)}</div>
    `;
    return el;
  });
}

// 21. SAP GUI 8.0 / S/4HANA Purchase Order ALV Grid Batch Renderer
function appendGmailBatch(count) {
  appendSimpleThemeBatch(count, 'gmail-story-stream', chunk => {
    const el = document.createElement('div');
    el.className = 'gmail-story-para';
    el.id = `gmail-para-${chunk.globalIndex}`;
    const heading = (chunk.indexInPage === 0) ? `<div class="gmail-section-heading">§ Phần ${chunk.page} — Phân đoạn tài liệu kỹ thuật</div>` : '';
    el.innerHTML = `${heading}<div class="gmail-para-text">${escapeHtml(chunk.text)}</div><span class="gmail-para-meta">Đoạn #${chunk.globalIndex + 1} • Trang ${chunk.page}</span>`;
    return el;
  });
}

function appendOutlookBatch(count) {
  appendSimpleThemeBatch(count, 'outlook-story-stream', chunk => {
    const el = document.createElement('div');
    el.className = 'outlook-story-para';
    el.id = `outlook-para-${chunk.globalIndex}`;
    const heading = (chunk.indexInPage === 0) ? `<div class="outlook-section-heading">Mục ${chunk.page}: Đặc tả yêu cầu kỹ thuật &amp; phân tích</div>` : '';
    el.innerHTML = `${heading}<div class="outlook-para-text">${escapeHtml(chunk.text)}</div><span class="outlook-para-meta">Đoạn #${chunk.globalIndex + 1} • Trang ${chunk.page}</span>`;
    return el;
  });
}

function appendSAPBatch(count) {
  appendSimpleThemeBatch(count, 'sap-story-stream', chunk => {
    const tr = document.createElement('tr');
    tr.className = 'sap-item-row';
    tr.id = `sap-item-${chunk.globalIndex}`;
    const itemNum = String((chunk.globalIndex + 1) * 10).padStart(5, '0');
    const matNum = `MAT-${String(100000 + (chunk.globalIndex % 450))}`;
    const poQty = ((chunk.globalIndex % 15) + 1) * 10;
    const unitPrice = ((chunk.globalIndex % 50) + 5) * 125000;
    const netVal = (poQty * unitPrice).toLocaleString('vi-VN');
    const day = String((chunk.globalIndex % 28) + 1).padStart(2, '0');
    const delivDate = `${day}.10.2026`;

    tr.innerHTML = `
      <td style="text-align:center;"><input type="checkbox"></td>
      <td style="text-align:center;"><span style="color:#107c41;">●</span></td>
      <td class="sap-item-num">${itemNum}</td>
      <td style="font-family:Consolas, monospace; font-weight:600; color:#0b3760;">${matNum}</td>
      <td class="sap-item-desc">${escapeHtml(chunk.text)}</td>
      <td class="sap-item-qty">${poQty}</td>
      <td style="text-align:center;">EA</td>
      <td class="sap-item-price">${netVal}</td>
      <td style="text-align:center;">VND</td>
      <td style="white-space:nowrap; font-family:Consolas, monospace;">${delivDate}</td>
      <td style="text-align:center;">1000</td>
      <td style="text-align:center;">0001</td>
    `;
    return tr;
  });

  const countEl = document.getElementById('sap-row-count-badge');
  if (countEl) {
    countEl.textContent = `Hiển thị ${state.renderedCount} hạng mục · SAP ALV Grid ME23N`;
  }
}

