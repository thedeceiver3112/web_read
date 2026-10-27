# BÁO CÁO TÌM HIỂU DỰ ÁN `web_read`

> **Stealth Reader** — web đọc truyện/tài liệu ngụy trang thành ứng dụng văn phòng.
>
> Ngày lập báo cáo: 22/10/2026
>
> Phạm vi: toàn bộ mã nguồn trong thư mục `D:\phong\python\web_read` (không gồm `node_modules`, ảnh, test fixtures).

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc & luồng hoạt động](#2-kiến-trúc--luồng-hoạt-động)
3. [Số liệu tổng quan](#3-số-liệu-tổng-quan)
4. [Function inventory — `app.js`](#4-function-inventory---appjs-270-named-functions)
5. [Function inventory — Python](#5-python-function-inventory-61)
6. [Function inventory — PHP](#6-php-function-inventory--apiindexphp-33)
7. [Các module JS nhỏ](#7-các-module-js-nhỏ)
8. [Test & kiểm thử](#8-test--kiểm-thử)
9. [Nhận xét, rủi ro & đề xuất](#9-nhận-xét-rủi-ro--đề-xuất)

---

## 1. Tổng quan dự án

**Stealth Reader** là một web app cho phép đọc PDF / EPUB / TXT trong giờ làm việc bằng cách ngụy trang nội dung thành giao diện của các phần mềm văn phòng quen thuộc.

### Tính năng chính

- **Đọc tài liệu**: PDF, EPUB, TXT; kéo thả nhiều file; giới hạn 200 MB/file.
- **26 giao diện ngụy trang** (theme): Google Sheets, Google Docs, Excel, VS Code, Photoshop, InDesign, Blender, LinkedIn, AutoCAD, Zalo, Figma, Canva, PowerPoint, Thư Viện Pháp Luật, Premiere Pro, Claude, ChatGPT, Teams, Revit, MISA, CapCut, SAP, Gmail, Outlook, Jira, Slack.
- **Đọc liên tục**: infinite scroll, progressive rendering theo batch, auto-scroll, chuyển trang, TOC, bookmark, tìm kiếm trong tài liệu.
- **Stealth**: đổi tiêu đề tài liệu, sửa text hiển thị, ảnh nền ngụy trang, **boss key (ESC)** chuyển ngay sang màn hình công việc giả, hotkey `H` ẩn/hiện controls.
- **Lưu trữ local-first**: nội dung file nằm trong **IndexedDB** (`stealth_reader_cache` / store `documents`), không upload lên server; fallback session tối đa 600.000 ký tự.
- **Đồng bộ metadata**: đăng nhập Google, lưu vị trí đọc, bookmark, settings vào MySQL. Không sync nội dung truyện.
- **Đọc truyện online**: proxy server-side tới nhà cung cấp cấu hình qua `ONLINE_STORY_UPSTREAM_BASE`, có cache TTL, rate limit, giới hạn kích thước response.
- **Analytics**: ghi nhận lượt truy cập và lượt xem theme (đã hash visitor/session), dashboard quản trị tại `/admin-analytics.html`.
- **Cập nhật phiên bản**: `version-check.js` poll `version.json` mỗi giờ và reload khi có bản mới.

### Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | HTML/CSS/JavaScript thuần, không build step |
| PDF client | PDF.js (`static/pdf.min.js`, `pdf.worker.min.js`) |
| EPUB client | JSZip (`static/jszip.min.js`) |
| Text worker | Web Worker (`text-worker.js`) |
| Backend dev/prod (Python) | `http.server` / WSGI (Passenger) |
| PDF backend | `pypdf` |
| Auth | Google OAuth 2.0 + OpenID, session cookie, CSRF |
| Database | MySQL/MariaDB (PyMySQL hoặc PDO) |
| Backend PHP | `api/index.php` cho cPanel |
| Test | Playwright + pytest |

---

## 2. Kiến trúc & luồng hoạt động

### 2.1 Sơ đồ tầng

```text
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (static)                     │
│  index.html  ──►  landing portal, chọn/tải tài liệu         │
│  26 theme pages (excel.html, vscode.html, zalo.html, ...)   │
│  app.js (11.162 dòng) ── parser + render + sync + hotkeys   │
│  style.css (21.314 dòng)                                    │
│  text-worker.js ── chia text off-main-thread                │
│  IndexedDB ── lưu nội dung tài liệu local-first              │
└───────────────────────────┬─────────────────────────────────┘
                            │ fetch /api/*
        ┌───────────────────┴────────────────────┐
        │                                        │
┌───────▼─────────────────┐          ┌───────────▼─────────────┐
│ Python backend          │          │ PHP backend (cPanel)     │
│ run.py (dev, :8080)     │          │ api/index.php            │
│ passenger_wsgi.py (prod)│          │ api/.htaccess            │
│ document_processing.py  │          │                          │
│ hybrid_sync.py          │          │ Auth + sync + analytics  │
│ online_story_proxy.py   │          │ + online story proxy     │
└───────────┬─────────────┘          └───────────┬──────────────┘
            │                                    │
            └────────────────┬───────────────────┘
                             ▼
                    MySQL / MariaDB
        users, auth_sessions, documents,
        reading_progress, bookmarks, user_settings,
        analytics_events
```

### 2.2 Luồng tải & đọc tài liệu

1. Người dùng chọn file ở landing portal hoặc nút upload trên navbar.
2. `validateDocumentFile` kiểm tra phần mở rộng và giới hạn 200 MB.
3. `prepareDocumentLoad` reset state, hủy tác vụ cũ, hiện loading.
4. `processDocumentFile` phân loại:
   - **TXT**: `processTextFile` → `runTextChunkWorker` (`text-worker.js`) hoặc `splitTextWithoutWorker`.
   - **EPUB**: `processEpubFile` → JSZip → `extractTextFromEpubHtml` → chuẩn hóa ảnh/path.
   - **PDF**: `processPdfFile` → PDF.js render/extract từng trang; nếu có backend Python thì gọi `/api/extract-pdf` (`pypdf`) để lấy text + ảnh + TOC.
5. Kết quả được chuẩn hóa thành `chunks`, gom thành `pages`, lưu IndexedDB (`persistDocumentCache`) và bắt đầu `initStoryFromPages`.
6. `renderContinuousView` + `renderNextBatch` render dần theo lô; mỗi theme có hàm `append*Batch` riêng.
7. Vị trí đọc/bookmark được lưu localStorage; nếu đã đăng nhập, `scheduleHybridSync` debounce rồi `pushHybridDocument` lên server.

### 2.3 Các endpoint API

| Method | Endpoint | Python | PHP | Chức năng |
|---|---|---|:---:|---|
| GET | `/api/health` | ✅ | ✅ | Health check |
| GET | `/api/auth/status` | ✅ | ✅ | Trạng thái đăng nhập + CSRF token |
| GET | `/api/auth/google/start` | ✅ | ✅ | Bắt đầu OAuth |
| GET | `/api/auth/google/callback` | ✅ | ✅ | Nhận code, tạo session |
| POST | `/api/auth/logout` | ✅ | ✅ | Đăng xuất (CSRF) |
| GET | `/api/sync/document?documentId=` | ✅ | ✅ | Kéo metadata tài liệu |
| PUT | `/api/sync/document` | ✅ | ✅ | Đẩy metadata (CSRF) |
| POST | `/api/analytics/event` | ❌ | ✅ | Ghi analytics |
| GET | `/api/admin/analytics?range=7\|30\|90` | ❌ | ✅ | Dashboard analytics |
| GET | `/api/online-story/{search\|story\|chapter}` | ✅ | ✅ | Proxy truyện online |
| POST | `/api/extract-pdf` | ✅ | ❌ | Trích PDF bằng `pypdf` |

> `api/index.php` trả `pdfExtraction: false` trong `/api/health` vì bản PHP không có xử lý PDF server-side.

### 2.4 Database

Migration `db/migrations/001_hybrid_sync.sql`:

| Bảng | Nội dung |
|---|---|
| `users` | Tài khoản Google (`google_sub`, email, tên, avatar) |
| `auth_sessions` | Session token hash (SHA-256), CSRF token, hạn 30 ngày |
| `documents` | Metadata tài liệu: key, tiêu đề, loại, kích thước, số trang/chương |
| `reading_progress` | Vị trí đọc + % tiến độ + timestamp client |
| `bookmarks` | Bookmark key, locator JSON, label, note, excerpt |
| `user_settings` | Settings JSON của reader |

Migration `002_usage_analytics.sql` thêm `analytics_events` (event_key, visitor_hash, session_hash, user_id, event_type, theme, path, occurred_at).

### 2.5 Cách chạy

```bash
# Cài dependencies Python
pip install -r requirements.txt

# Chạy dev server (tự mở browser, tự tìm port trống từ 8080)
python run.py

# Chạy với mock Google login, không cần DB
python run.py --mock-auth

# Không tự mở browser
python run.py --no-browser

# Test
npm install
npm test                                  # 77 Playwright tests
python -m pytest tests/test_online_story_proxy.py   # 9 test proxy
```

Cấu hình qua `.env.local` (Python) hoặc biến môi trường cPanel; mẫu tại `.env.example`.

---

## 3. Số liệu tổng quan

| File | Dòng | Kích thước | Function/handler |
|---|---:|---:|---:|
| `app.js` | 11.162 | 505,4 KB | **340** (270 `function` + 59 function expression + 11 object method) |
| `style.css` | 21.314 | 433,9 KB | — |
| `index.html` | 1.733 | 103,4 KB | — |
| `api/index.php` | 731 | 33,8 KB | 33 |
| `hybrid_sync.py` | 477 | 20,2 KB | 26 |
| `run.py` | 280 | 11,4 KB | 13 |
| `document_processing.py` | 259 | 9,8 KB | 6 |
| `admin-analytics.js` | 246 | 10,6 KB | 12 |
| `online_story_proxy.py` | 196 | 7,3 KB | 10 |
| `passenger_wsgi.py` | 174 | 6,5 KB | 6 |
| `text-worker.js` | 147 | 4,6 KB | 2 (+ `onmessage`) |
| `version-check.js` | 38 | 1,3 KB | 1 |

**Tổng cộng: khoảng 449 function/handler được đặt tên** (chưa tính callback inline), trong đó:

- JavaScript: 340 (app.js) + 12 (admin) + 2 (worker) + 1 (version) = **355**
- Python: **61**
- PHP: **33**
- Test: 77 Playwright + 9 pytest

### Cơ cấu 26 theme

`THEME_PAGES` khai báo 26 theme, mỗi theme ánh xạ tới một file HTML:

`googlesheets`, `googledocs`, `excel`, `vscode`, `photoshop`, `indesign`, `blender`, `linkedin`, `autocad`, `zalo`, `figma`, `canva`, `powerpoint`, `thuvienphapluat`, `premiere`, `claude`, `chatgpt`, `teams`, `revit`, `misa`, `capcut`, `sap`, `gmail`, `outlook`, `jira`, `slack`.

Tổng số file HTML: **28** (1 portal `index.html` + 26 theme + 1 `admin-analytics.html`).

### Phân bố function trong `app.js`

| Nhóm | Số hàm |
|---|---:|
| A. Bootstrap, state, analytics, hybrid sync, IndexedDB cache | 54 |
| B. Init UI, feedback, reader tools, save-state | 22 |
| C. Theme system + settings modal | 10 |
| D. Stealth title editing | 1 |
| E. Online story picker + stealth text customization | 15 |
| F. Landing portal + donate | 16 |
| G. Controls visibility + version reload | 5 |
| H. Confetti | 2 |
| I. Universal navbar | 9 |
| J. Event listeners / hotkeys / font | 7 |
| K. Column D resize | 6 |
| L. Sheet tabs + boss key | 5 |
| M. Document parsing (TXT/EPUB/PDF) | 36 |
| N. Continuous render + theme batch append | 23 |
| O. Selection / focus / pagination | 8 |
| P. Infinite scroll | 13 |
| Q. Auto-scroll | 3 |
| R. Utilities + image viewer | 14 |
| S. Theme renderers 14–22 + theme modes | 20 |
| T. InDesign workspace controls | 1 |
| **Tổng** | **270** |

Thêm 11 method trong object `StealthImageManager` và 59 function expression (xem mục 4.21–4.22).

---

## 4. Function inventory - `app.js` (270 named functions)

### 4.1 A. Bootstrap, state, analytics, hybrid sync, IndexedDB cache (54)

| Line | Function |
|---:|---|
| 10 | `configurePdfLibrary` |
| 24 | `ensurePdfLibrary` |
| 54 | `enableLowPerformanceMode` |
| 313 | `themeControlIds` |
| 358 | `createAnalyticsId` |
| 363 | `getOrCreateAnalyticsId` |
| 376 | `getAnalyticsTheme` |
| 382 | `postAnalyticsEvent` |
| 405 | `initializeUsageAnalytics` |
| 424 | `normalizeBookmarkEntry` |
| 452 | `hashDocumentIdentity` |
| 461 | `createLegacyDocumentId` |
| 470 | `createDocumentFingerprint` |
| 491 | `getCurrentDocumentId` |
| 506 | `readSavedBookmarks` |
| 516 | `getCurrentBookmark` |
| 523 | `saveCurrentBookmark` |
| 570 | `addManualBookmark` |
| 609 | `getSavedReadingPosition` |
| 626 | `restoreSavedReadingPosition` |
| 648 | `getHybridSettingsValues` |
| 665 | `updateHybridSettingsVersion` |
| 673 | `buildHybridSyncPayload` |
| 725 | `renderHybridAuthButton` |
| 756 | `toggleHybridAccountDropdown` |
| 765 | `openHybridAccountDropdown` |
| 832 | `closeHybridAccountDropdown` |
| 842 | `performHybridLogout` |
| 881 | `initializeHybridSync` |
| 902 | `handleHybridAuthClick` |
| 922 | `scheduleHybridSync` |
| 928 | `pushHybridDocument` |
| 962 | `pullHybridDocument` |
| 1015 | `getThemeForCurrentPage` |
| 1049 | `getFileForTheme` |
| 1053 | `navigateToThemePage` |
| 1070 | `openDocumentCacheDatabase` |
| 1089 | `writeDocumentCache` |
| 1112 | `setActiveDocumentCache` |
| 1133 | `readDocumentCache` |
| 1155 | `listDocumentCaches` |
| 1177 | `readDocumentCacheById` |
| 1191 | `deleteDocumentCache` |
| 1205 | `hasReadableChunkText` |
| 1209 | `normalizeDocumentChunks` |
| 1238 | `remapSanitizedChunkIndex` |
| 1247 | `rebuildPageStartIndices` |
| 1260 | `remapSavedBookmarkIndices` |
| 1282 | `applyCachedDocument` |
| 1347 | `persistDocumentCache` |
| 1402 | `isSampleContent` |
| 1409 | `isValidCachedDocument` |
| 1419 | `restoreChunksFromLegacySession` |
| 1438 | `restoreDocumentCache` |

### 4.2 B. Init UI, feedback, reader tools, save-state (22)

| Line | Function |
|---:|---|
| 1523 | `getFeedbackFormUrl` |
| 1531 | `openFeedbackForm` |
| 1536 | `configFeedbackFormUrl` |
| 1546 | `getProgressSheetUrl` |
| 1554 | `openProgressSheet` |
| 1559 | `configProgressSheetUrl` |
| 1569 | `initFeedbackListeners` |
| 1589 | `initReaderToolsUI` |
| 1625 | `openReaderTools` |
| 1633 | `closeReaderTools` |
| 1640 | `renderReaderToolsPanel` |
| 1656 | `renderLayoutToolsPanel` |
| 1839 | `renderDocumentLibrary` |
| 1880 | `renderBookmarksPanel` |
| 1923 | `renderTocPanel` |
| 1944 | `renderOnlineTocPanel` |
| 1979 | `renderSearchPanel` |
| 2001 | `jumpToChunk` |
| 2015 | `showReaderError` |
| 2094 | `loadSavedState` |
| 2143 | `scheduleSaveState` |
| 2163 | `saveState` |

### 4.3 C. Theme system + settings modal (10)

| Line | Function |
|---:|---|
| 2774 | `getThemePickerModalHTML` |
| 3130 | `ensureThemeModalComponent` |
| 3143 | `attachThemeModalEvents` |
| 3200 | `getStealthSettingsModalHTML` |
| 3304 | `ensureSharedReaderComponents` |
| 3359 | `initThemeSystem` |
| 3385 | `openThemeModal` |
| 3397 | `closeThemeModal` |
| 3402 | `setDocumentTitle` |
| 3415 | `applyTheme` |

### 4.4 D. Stealth title editing (1)

| Line | Function |
|---:|---|
| 3654 | `initTitleEditing` |

### 4.5 E. Online story picker + stealth text customization (15)

| Line | Function |
|---:|---|
| 4097 | `initStealthEditableElements` |
| 4140 | `setOnlineStoryStatus` |
| 4147 | `getOnlineSourceLabel` |
| 4151 | `normalizeOnlineApiError` |
| 4160 | `fetchOnlineStoryJson` |
| 4205 | `renderOnlineStoryResults` |
| 4246 | `getFilteredOnlineChapters` |
| 4263 | `renderOnlineStoryDetail` |
| 4448 | `selectOnlineStoryResult` |
| 4492 | `buildOnlineStoryToc` |
| 4501 | `loadOnlineStoryChapter` |
| 4588 | `loadOnlineStoryChapterByIndex` |
| 4593 | `openOnlineStoryModal` |
| 4617 | `closeOnlineStoryModal` |
| 4628 | `initOnlineStoryPicker` |

### 4.6 F. Landing portal + donate (16)

| Line | Function |
|---:|---|
| 4726 | `hasLoadedDocument` |
| 4737 | `shakePortalUpload` |
| 4748 | `showPortalUploadProgress` |
| 4770 | `updatePortalUploadProgress` |
| 4787 | `hidePortalUploadProgress` |
| 4792 | `selectPortalBook` |
| 4847 | `deletePortalBook` |
| 4884 | `updatePortalUploadUI` |
| 5079 | `openPortal` |
| 5099 | `closePortal` |
| 5107 | `initLandingPortal` |
| 5266 | `goToHomePage` |
| 5273 | `initPortalTriggers` |
| 5318 | `updatePortalThemeUI` |
| 5325 | `copyAccountNumber` |
| 5355 | `fallbackCopySTK` |

### 4.7 G. Controls visibility + version reload (5)

| Line | Function |
|---:|---|
| 5374 | `initControlsVisibilityToggle` |
| 5391 | `toggleControlsVisibility` |
| 5398 | `updateControlsToggleButtons` |
| 5413 | `initVersionReloadButton` |
| 5427 | `forceRefreshApplication` |

### 4.8 H. Confetti (2)

| Line | Function |
|---:|---|
| 5462 | `launchConfetti` |
| 5504 | `updateConfetti` |

### 4.9 I. Universal navbar (9)

| Line | Function |
|---:|---|
| 5542 | `initUniversalNavbar` |
| 5781 | `renderUniversalBooksDropdown` |
| 5881 | `toggleUniversalBooksDropdown` |
| 5892 | `switchReaderBook` |
| 5915 | `rechunkActiveDocument` |
| 5963 | `toggleUniversalLayoutDropdown` |
| 5974 | `renderUniversalLayoutDropdown` |
| 6153 | `syncUniversalNavbar` |
| 6217 | `syncBookmarkButton` |

### 4.10 J. Event listeners / hotkeys / font (7)

| Line | Function |
|---:|---|
| 6241 | `initEventListeners` |
| 6620 | `changeFontSize` |
| 6628 | `setFontSize` |
| 6637 | `setLineHeight` |
| 6644 | `openModal` |
| 6647 | `closeModal` |
| 6651 | `syncControls` |

### 4.11 K. Column D resize (6)

| Line | Function |
|---:|---|
| 6748 | `getSpreadsheetColDWidth` |
| 6756 | `applySpreadsheetColDWidth` |
| 6820 | `openColDWidthDialog` |
| 6902 | `initSpreadsheetColDResize` |
| 7020 | `showBanner` |
| 7029 | `applyStyles` |

### 4.12 L. Sheet tabs + boss key (5)

| Line | Function |
|---:|---|
| 7117 | `syncFormulaBarForSheet` |
| 7157 | `initSheetTabs` |
| 7207 | `switchSheet` |
| 7217 | `updateBossButton` |
| 7260 | `toggleBossKey` |

### 4.13 M. Document parsing (TXT/EPUB/PDF) (36)

| Line | Function |
|---:|---|
| 7300 | `handleFileSelect` |
| 7318 | `getDocumentExtension` |
| 7324 | `isSupportedDocument` |
| 7328 | `prepareDocumentLoad` |
| 7401 | `validateDocumentFile` |
| 7410 | `processDocumentFile` |
| 7428 | `isTextWorkerAvailable` |
| 7441 | `splitTextWithoutWorker` |
| 7446 | `runTextChunkWorker` |
| 7490 | `cancelDocumentLoad` |
| 7515 | `commitDocumentLoad` |
| 7521 | `chunksToPagesData` |
| 7532 | `finishTextDocument` |
| 7544 | `processTextFile` |
| 7571 | `parseXmlDocument` |
| 7583 | `epubElements` |
| 7587 | `normalizeEpubPath` |
| 7611 | `getEpubImageMimeType` |
| 7622 | `extractTextFromEpubHtml` |
| 7701 | `ensureJsZipLoaded` |
| 7735 | `processEpubFile` |
| 7983 | `hasPdfBackend` |
| 8012 | `upgradeLegacyImagePlaceholder` |
| 8022 | `cleanAndRepairVietnameseText` |
| 8095 | `renderPdfPageToDataUrl` |
| 8114 | `extractPdfPage` |
| 8228 | `appendExtractedPages` |
| 8255 | `initProgressiveStory` |
| 8278 | `extractRemainingPdfPages` |
| 8321 | `extractPdfOutline` |
| 8329 | `traverse` |
| 8372 | `processPdfFile` |
| 8503 | `splitTextIntoChunks` |
| 8524 | `applyMaxChars` |
| 8639 | `initStoryFromPages` |
| 8688 | `initStoryFromChunks` |

### 4.14 N. Continuous render + theme batch append (23)

| Line | Function |
|---:|---|
| 8751 | `getThemeRenderer` |
| 8755 | `renderContinuousView` |
| 8786 | `renderNextBatch` |
| 8794 | `isChunkRendered` |
| 8798 | `ensureChunkRendered` |
| 8810 | `appendSpreadsheetBatch` |
| 8873 | `appendVSCodeBatch` |
| 8885 | `addVSCLine` |
| 8956 | `renderVSCodeBossCode` |
| 8985 | `appendSimpleThemeBatch` |
| 9008 | `appendIndesignBatch` |
| 9018 | `appendPhotoshopBatch` |
| 9032 | `appendBlenderBatch` |
| 9047 | `appendLinkedInBatch` |
| 9139 | `appendAutoCADBatch` |
| 9154 | `appendGoogleDocsBatch` |
| 9170 | `initZaloResponsivePanes` |
| 9180 | `closeAllPanes` |
| 9320 | `appendZaloBatch` |
| 9359 | `appendFigmaBatch` |
| 9377 | `appendCanvaBatch` |
| 9393 | `appendPowerPointBatch` |
| 9407 | `appendTVPLBatch` |

### 4.15 O. Selection / focus / pagination (8)

| Line | Function |
|---:|---|
| 9460 | `clearActiveMarks` |
| 9465 | `markActive` |
| 9472 | `setActiveRow` |
| 9529 | `updateReadingProgressStatus` |
| 9537 | `updatePaginationUI` |
| 9566 | `goToPage` |
| 9596 | `changePage` |
| 9611 | `navigateRow` |

### 4.16 P. Infinite scroll (13)

| Line | Function |
|---:|---|
| 9638 | `getOnlineNextChapterInfo` |
| 9650 | `triggerOnlineNextChapter` |
| 9674 | `ensureOnlineChapterNextRow` |
| 9772 | `ensureOnlineChapterNextButton` |
| 9777 | `updateOnlineChapterNextButton` |
| 9805 | `stopReadingScrollAnimation` |
| 9813 | `clampReadingScrollTop` |
| 9817 | `animateReadingScrollTo` |
| 9848 | `scrollReadingTargetIntoView` |
| 9862 | `rerenderWindowPreservingAnchor` |
| 9886 | `getActiveScrollContainer` |
| 9947 | `handleContainerScroll` |
| 10018 | `initContinuousScrollListeners` |

### 4.17 Q. Auto-scroll (3)

| Line | Function |
|---:|---|
| 10102 | `toggleAutoScroll` |
| 10110 | `startAutoScroll` |
| 10127 | `stopAutoScroll` |

### 4.18 R. Utilities + image viewer (14)

| Line | Function |
|---:|---|
| 10148 | `showLoading` |
| 10180 | `updateLoadingProgress` |
| 10192 | `hideLoading` |
| 10197 | `escapeHtml` |
| 10206 | `formatPlainTextChunk` |
| 10212 | `formatChunkText` |
| 10232 | `getDocumentImageKeys` |
| 10256 | `ensureStoryImageViewerModal` |
| 10336 | `setStoryImageViewerZoom` |
| 10348 | `navigateStoryImageViewer` |
| 10360 | `resolveStoryImageSrc` |
| 10420 | `openStoryImageViewer` |
| 10485 | `closeStoryImageViewer` |
| 10512 | `showPageFlipToast` |

### 4.19 S. Theme renderers 14-22 + theme modes (20)

| Line | Function |
|---:|---|
| 10528 | `premiereTimecode` |
| 10534 | `appendPremiereBatch` |
| 10545 | `appendClaudeBatch` |
| 10556 | `appendChatGPTBatch` |
| 10567 | `setChatGPTThemeMode` |
| 10597 | `toggleChatGPTThemeMode` |
| 10604 | `initChatGPTThemeMode` |
| 10665 | `setFigmaThemeMode` |
| 10698 | `toggleFigmaThemeMode` |
| 10705 | `initFigmaThemeMode` |
| 10720 | `appendTeamsBatch` |
| 10734 | `appendRevitBatch` |
| 10760 | `appendMisaBatch` |
| 10791 | `capcutTimecode` |
| 10805 | `appendCapCutBatch` |
| 10824 | `appendGmailBatch` |
| 10835 | `appendOutlookBatch` |
| 10846 | `appendJiraBatch` |
| 10861 | `appendSAPBatch` |
| 10907 | `appendSlackBatch` |

### 4.20 T. InDesign workspace controls (1)

| Line | Function |
|---:|---|
| 10944 | `setupInDesignControls` |

### 4.21 `StealthImageManager` object methods (11)

| Line | Method |
|---:|---|
| 2202 | `getDB` |
| 2227 | `saveImage` |
| 2250 | `getImage` |
| 2266 | `removeImage` |
| 2282 | `applyImage` |
| 2508 | `resetImage` |
| 2622 | `updatePillState` |
| 2627 | `init` |
| 2656 | `setupUI` |
| 2740 | `triggerFileInput` |
| 2760 | `processImageFile` |

### 4.22 Function expressions (`const/let name = function/arrow`, 59)

| Line | Name |
|---:|---|
| 31 | `handleLoad` |
| 36 | `handleError` |
| 776 | `initial` |
| 916 | `button` |
| 1170 | `getOrderTime` |
| 1380 | `inlineCacheSize` |
| 1675 | `previewWhiteSpace` |
| 4253 | `title` |
| 4273 | `start` |
| 4287 | `rStart` |
| 4301 | `rStart` |
| 4380 | `displayTitle` |
| 5334 | `showFeedback` |
| 5484 | `x` |
| 5485 | `y` |
| 5488 | `angle` |
| 6280 | `tag` |
| 6621 | `newSize` |
| 6880 | `closeDialog` |
| 6944 | `updateVisuals` |
| 6960 | `onMouseMove` |
| 6972 | `onMouseUp` |
| 7001 | `nextWidth` |
| 7007 | `bindContextMenu` |
| 7046 | `restyle` |
| 7054 | `isNowrap` |
| 7674 | `normalizeBlockWithTokens` |
| 7740 | `updateEpubStatus` |
| 7749 | `yieldToBrowser` |
| 7821 | `findZipEntry` |
| 7858 | `resolveEpubImageToken` |
| 7968 | `elapsedSeconds` |
| 8235 | `readableChunks` |
| 8650 | `rawChunks` |
| 8672 | `startPage` |
| 8757 | `requestedTarget` |
| 8830 | `auditId` |
| 8835 | `variance` |
| 8836 | `varianceText` |
| 9077 | `hoursAgo` |
| 9325 | `raw` |
| 9330 | `min` |
| 9699 | `auditId` |
| 9738 | `streamId` |
| 9826 | `step` |
| 10353 | `nextIdx` |
| 10550 | `heading` |
| 10561 | `heading` |
| 10725 | `headingHtml` |
| 10768 | `amountVal` |
| 10829 | `heading` |
| 10840 | `heading` |
| 10851 | `heading` |
| 10868 | `poQty` |
| 10869 | `unitPrice` |
| 10870 | `netVal` |
| 10911 | `min` |
| 10918 | `dateDivider` |
| 11100 | `updateFontSize` |

## 5. Python function inventory (61)

### `run.py` (13)

| Line | Function |
|---:|---|
| 22 | `load_local_environment` |
| 38 | `__init__` |
| 41 | `log_message` |
| 45 | `end_headers` |
| 56 | `handle_one_request` |
| 64 | `do_GET` |
| 83 | `do_POST` |
| 140 | `do_PUT` |
| 145 | `_handle_hybrid_api` |
| 179 | `_handle_local_auth_mock` |
| 237 | `_send_mock_json` |
| 247 | `find_free_port` |
| 255 | `main` |

### `passenger_wsgi.py` (6)

| Line | Function |
|---:|---|
| 17 | `normalized_request_path` |
| 30 | `parse_pdf_upload` |
| 67 | `json_response` |
| 80 | `extract_pdf` |
| 87 | `static_response` |
| 119 | `application` |

### `document_processing.py` (6)

| Line | Function |
|---:|---|
| 11 | `get_image_mime_type` |
| 38 | `page_has_xobject_image` |
| 62 | `clean_and_repair_vietnamese_text` |
| 105 | `split_text_into_chunks` |
| 144 | `extract_pdf_payload` |
| 224 | `extract_outline` |

### `hybrid_sync.py` (26)

| Line | Function |
|---:|---|
| 36 | `body` |
| 42 | `_env` |
| 46 | `sync_config` |
| 64 | `_json_response` |
| 70 | `_cookie_map` |
| 80 | `_b64encode` |
| 84 | `_b64decode` |
| 88 | `_signed_oauth_state` |
| 98 | `_verify_oauth_state` |
| 112 | `_safe_return_path` |
| 120 | `_cookie` |
| 127 | `_db_connection` |
| 147 | `_session_user` |
| 169 | `_require_csrf` |
| 173 | `_parse_json` |
| 182 | `_exchange_google_code` |
| 211 | `_create_login_session` |
| 241 | `_logout` |
| 254 | `_pull_document` |
| 287 | `_loads` |
| 296 | `_decode_progress` |
| 306 | `_decode_bookmark` |
| 317 | `_decode_settings` |
| 323 | `_push_document` |
| 390 | `handle_api_request` |
| 472 | `status_line` |

### `online_story_proxy.py` (10)

| Line | Function |
|---:|---|
| 36 | `body` |
| 45 | `_json_response` |
| 52 | `proxy_configured` |
| 56 | `_valid_identifier` |
| 62 | `_validated_params` |
| 82 | `_rate_limited` |
| 100 | `_cache_get` |
| 114 | `_cache_put` |
| 122 | `_fetch_upstream` |
| 159 | `handle_online_story_proxy` |

## 6. PHP function inventory - `api/index.php` (33)

| Line | Function |
|---:|---|
| 16 | `config` |
| 26 | `configured` |
| 36 | `online_story_base` |
| 42 | `online_story_proxy_configured` |
| 47 | `online_story_cache_path` |
| 56 | `online_story_cache_get` |
| 70 | `online_story_cache_put` |
| 81 | `online_story_rate_allowed` |
| 115 | `online_story_identifier_valid` |
| 120 | `handle_online_story_proxy` |
| 211 | `json_response` |
| 219 | `redirect_response` |
| 225 | `request_path` |
| 231 | `is_https` |
| 237 | `set_secure_cookie` |
| 253 | `base64url_encode` |
| 258 | `base64url_decode` |
| 264 | `safe_return_path` |
| 276 | `signed_state` |
| 286 | `verify_state` |
| 300 | `db` |
| 310 | `current_session` |
| 323 | `require_csrf` |
| 331 | `google_claims` |
| 366 | `create_session` |
| 387 | `json_body` |
| 400 | `decode_json_value` |
| 409 | `record_analytics_event` |
| 466 | `analytics_admin_emails` |
| 485 | `require_analytics_admin` |
| 493 | `analytics_summary` |
| 591 | `pull_document` |
| 621 | `push_document` |

## 7. Các module JS nhỏ

### `admin-analytics.js` (12)

| Line | Function |
|---:|---|
| 18 | `showAccess` |
| 28 | `fetchJson` |
| 39 | `renderSummary` |
| 47 | `renderChart` |
| 67 | `renderHourly` |
| 105 | `renderThemes` |
| 142 | `renderDailyTable` |
| 155 | `renderDashboard` |
| 168 | `loadAnalytics` |
| 187 | `csvCell` |
| 191 | `exportCsv` |
| 218 | `initialize` |

### `text-worker.js` (2)

| Line | Function |
|---:|---|
| 13 | `splitText` |
| 36 | `applyMaxChars` |

### `version-check.js` (1)

| Line | Function |
|---:|---|
| 8 | `checkForUpdate` (arrow function) |

---

## 8. Test & kiểm thử

### 8.1 Playwright (18 file, 77 test)

| File | Số test | Phạm vi |
|---|---:|---|
| `tests/reader.spec.js` | 13 | Luồng đọc chính, upload, điều hướng |
| `tests/online_story.spec.js` | 10 | Online story picker, proxy, chương |
| `tests/col_d_resize.spec.js` | 7 | Kéo giãn cột D |
| `tests/excel_layout.spec.js` | 6 | Layout Excel |
| `tests/zalo.spec.js` | 6 | Theme Zalo |
| `tests/portal_books.spec.js` | 5 | Portal nhiều sách |
| `tests/chatgpt.spec.js` | 4 | Theme ChatGPT |
| `tests/admin_analytics.spec.js` | 3 | Dashboard analytics |
| `tests/email_themes.spec.js` | 3 | Gmail/Outlook |
| `tests/hybrid_sync.spec.js` | 3 | Đồng bộ metadata |
| `tests/performance.spec.js` | 3 | Hiệu năng |
| `tests/blank_lines.spec.js` | 2 | Xử lý dòng trống |
| `tests/indesign.spec.js` | 2 | Theme InDesign |
| `tests/jira.spec.js` | 2 | Theme Jira |
| `tests/layout_options.spec.js` | 2 | Tùy chọn layout |
| `tests/low_spec_user_journey.spec.js` | 2 | User journey cấu hình thấp |
| `tests/slack.spec.js` | 2 | Theme Slack |
| `tests/figma.spec.js` | 1 | Theme Figma |
| `tests/analytics.spec.js` | 1 | Ghi nhận analytics |

### 8.2 Python (9 test)

`tests/test_online_story_proxy.py` — kiểm tra validation tham số, cache, rate limit, lỗi upstream và định dạng response của proxy.

---

## 9. Nhận xét, rủi ro & đề xuất

### 9.1 Điểm mạnh

- **Local-first đúng nghĩa**: nội dung file không rời khỏi browser; server chỉ giữ metadata.
- **Bảo mật cơ bản tốt**: session token lưu dạng SHA-256, CSRF token cho thao tác ghi, OAuth state ký HMAC, cookie `HttpOnly`/`SameSite=Lax`/`Secure`, chống path traversal trong `static_response`, rate limit + giới hạn response ở proxy.
- **Trải nghiệm đọc phong phú**: progressive rendering, cache IndexedDB, khôi phục vị trí, bookmark, TOC, tìm kiếm, auto-scroll.
- **Không phụ thuộc framework/build tool** → deploy đơn giản lên hosting tĩnh/cPanel.

### 9.2 Rủi ro & điểm cần cải thiện

1. **`app.js` là monolith 11.162 dòng, 270 function**
   - Khó điều hướng, dễ xung đột biến toàn cục, khó test độc lập.
   - Đề xuất tách module: `core/state.js`, `parsers/{pdf,epub,text}.js`, `renderers/{spreadsheet,vscode,indesign,...}.js`, `sync/`, `ui/`, `utils/`.
   - Có thể giữ IIFE/ES module và chỉ expose API cần thiết.

2. **Logic backend lặp ở 3 nơi**
   - `run.py`, `passenger_wsgi.py`, `api/index.php` cùng implement auth/sync/proxy.
   - Sửa một endpoint phải sửa đồng bộ 3 file, dễ lệch hành vi (ví dụ PHP không có `/api/extract-pdf`).
   - Đề xuất chọn một backend chính (Python WSGI hoặc PHP), hoặc tách logic dùng chung và viết test contract cho cả hai.

3. **Nhiều hàm quá dài**
   - `initEventListeners`, `processEpubFile`, `processPdfFile`, `appendIndesignBatch`, `handleContainerScroll` chứa nhiều nhánh và DOM manipulation.
   - Nên tách helper nhỏ, đặt tên theo hành vi, bổ sung test đơn vị cho phần thuần logic (parse/chunk/format).

4. **Biến toàn cục & trạng thái phân tán**
   - `state`, `onlineStoryPickerState`, `hybridSyncState`, nhiều biến `let` cấp module.
   - Nên gom vào một store có kiểm soát, hoặc ít nhất document rõ shape của `state`.

5. **`style.css` 21.314 dòng**
   - Nên tách theo theme (`css/themes/*.css`) và dùng biến CSS chung; hiện đã có thư mục `css/` nhưng file chính vẫn rất lớn.

6. **Phụ thuộc CDN/third-party**
   - `static/pdf.min.js`, `pdf.worker.min.js`, `jszip.min.js` được commit sẵn — tốt cho offline nhưng cần quy trình cập nhật bảo mật.
   - `web_read_config.example.php` và `.env.example` là mẫu cấu hình; không commit secret thật.

7. **Dữ liệu nhạy cảm**
   - `analytics_events` lưu hash visitor/session; cần đảm bảo `APP_SESSION_SECRET` đủ mạnh và không đổi thường xuyên (sẽ làm hash thay đổi).
   - Dashboard admin cần giới hạn email qua `analytics_admin_emails` / `ANALYTICS_ADMIN_EMAILS`.

### 9.3 Trạng thái repository tại thời điểm khảo sát

Có thay đổi chưa commit (không thuộc phạm vi báo cáo này):

- Modified: `app.js`, `figma.html`, `style.css`
- Untracked: `static/figma_ui3_stealth_clean.png`, `static/figma_ui3_verified.png`, `tests/figma.spec.js`

`.env.local` đã nằm trong `.gitignore`; chỉ `.env.example` được track. Không có secret nào bị đưa vào báo cáo.

### 9.4 Gợi ý thứ tự đọc code

1. `index.html` — hiểu portal và cấu trúc DOM chung.
2. `app.js` mục A (dòng 1–1.500) — state, analytics, sync, cache.
3. `app.js` mục M (dòng 7.297–8.711) — parser PDF/EPUB/TXT.
4. `app.js` mục N (dòng 8.712–9.420) — renderer và batch appender.
5. `app.js` mục P (dòng 9.628–10.098) — infinite scroll.
6. `hybrid_sync.py` — auth + sync chuẩn để đối chiếu với `api/index.php`.
7. `online_story_proxy.py` — proxy, cache, rate limit.
8. `api/index.php` + `db/migrations/*.sql` — bản production PHP và schema.

---

*Báo cáo được tạo tự động từ quá trình đọc mã nguồn; số dòng và số function phản ánh trạng thái file tại thời điểm lập báo cáo.*
