/**
 * rhwp 편집기 페이지 JavaScript
 *
 * WASM 모듈을 로드하고 HWP 파일을 Canvas로 렌더링한다.
 * 텍스트 선택, 하이라이트, 클립보드 복사, 줌, 검색 기능을 제공한다.
 */

import init, { HwpDocument, version } from '../pkg/rhwp.js';
import { TextLayoutManager, SelectionRenderer, SelectionController, ControlLayoutManager } from './text_selection.js';
import { FormatToolbar } from './format_toolbar.js';
import { CharShapeDialog } from './char_shape_dialog.js';

// === 전역 상태 ===
let doc = null;
let currentPage = 0;
let isLoading = false;

// 텍스트 선택
let textLayout = new TextLayoutManager();
let controlLayout = new ControlLayoutManager();
let selectionRenderer = null;
let selectionController = null;

// 서식 툴바
let formatToolbar = null;

// 편집 모드 상태
let editMode = 'none';  // 'none' | 'text' | 'objectSelected' | 'cellSelected'
let selectedControl = null;
let selectedCells = [];
let cellAnchor = null;  // 셀 범위 선택 앵커

// 줌
let zoomLevel = 1.0;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.0;
let _basePageWidth = 0;   // 줌 1.0 기준 페이지 폭
let _basePageHeight = 0;  // 줌 1.0 기준 페이지 높이
let _zoomRenderTimer = null; // 벡터 재렌더 디바운스 타이머

// 검색
let searchResults = [];
let searchIndex = -1;
let searchTextCache = {};

// 문단부호
let showParagraphMarks = false;

// 투명선
let showTransparentBorders = false;

// === 초기화 ===

async function initialize() {
    try {
        showLoading(true);
        await init();

        const versionInfo = document.getElementById('version-info');
        if (versionInfo) {
            versionInfo.textContent = `v${version()}`;
        }

        setupEventListeners();
        console.log('rhwp WASM 모듈 로드 완료 (편집 모드)');
    } catch (error) {
        console.error('WASM 초기화 실패:', error);
        alert('WASM 모듈 로드에 실패했습니다.');
    } finally {
        showLoading(false);
    }
}

// === 이벤트 리스너 ===

function setupEventListeners() {
    // 파일 업로드
    document.getElementById('file-input').addEventListener('change', handleFileUpload);

    // 페이지 네비게이션
    document.getElementById('prev-btn').addEventListener('click', prevPage);
    document.getElementById('next-btn').addEventListener('click', nextPage);

    // 줌
    document.getElementById('zoom-in-btn').addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn').addEventListener('click', zoomOut);
    document.getElementById('zoom-fit-btn').addEventListener('click', zoomFit);

    // Ctrl+마우스 휠 줌
    document.getElementById('editor-area').addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) zoomIn();
            else zoomOut();
        }
    }, { passive: false });

    // 검색
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(() => {
        performSearch(searchInput.value.trim());
    }, 300));

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.shiftKey ? searchPrev() : searchNext();
        }
        if (e.key === 'Escape') {
            searchInput.value = '';
            performSearch('');
            searchInput.blur();
        }
    });

    document.getElementById('search-prev-btn').addEventListener('click', searchPrev);
    document.getElementById('search-next-btn').addEventListener('click', searchNext);
    document.getElementById('search-clear-btn').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        performSearch('');
    });

    // 저장
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.addEventListener('click', handleSave);

    // 문단부호 토글
    const paramarkBtn = document.getElementById('paramark-btn');
    if (paramarkBtn) paramarkBtn.addEventListener('click', toggleParagraphMarks);

    // 투명선 토글
    const tbBtn = document.getElementById('transparent-border-btn');
    if (tbBtn) tbBtn.addEventListener('click', toggleTransparentBorders);

    // 글자 모양 (메인 도구 메뉴)
    const charshapeBtn = document.getElementById('charshape-btn');
    if (charshapeBtn) charshapeBtn.addEventListener('click', openCharShapeDialog);

    // 파일정보 팝업
    setupFileInfoPopup();

    // IME 입력 처리 (한글 등)
    const imeInput = document.getElementById('ime-input');
    let isComposing = false;
    let compositionJustEnded = false;

    imeInput.addEventListener('compositionstart', () => {
        isComposing = true;
    });

    imeInput.addEventListener('compositionend', (e) => {
        isComposing = false;
        compositionJustEnded = true;
        if (e.data) {
            handleTextInsert(e.data);
        }
        // 연쇄 조합(한→ㄱ) 대응: 다음 프레임에서 안전하게 정리
        requestAnimationFrame(() => {
            if (!isComposing) {
                imeInput.value = '';
            }
            compositionJustEnded = false;
        });
    });

    // textarea 입력 처리 (IME 조합 중이 아닌 직접 입력)
    imeInput.addEventListener('input', () => {
        if (compositionJustEnded) return; // compositionend에서 이미 처리됨
        if (!isComposing && imeInput.value) {
            handleTextInsert(imeInput.value);
            imeInput.value = '';
        }
    });

    // 캔버스 클릭 시 IME textarea에 포커스
    document.getElementById('hwp-canvas').addEventListener('mouseup', () => {
        if (selectionController && selectionController.hasActiveCaret()) {
            imeInput.focus();
        }
    });

    // 표 컨텍스트 메뉴
    setupTableContextMenu();

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        // 검색 입력 중이면 페이지 네비게이션 비활성화
        if (document.activeElement === searchInput) return;

        if (!doc) return;

        // === 편집 모드별 키보드 처리 ===

        // objectSelected 모드
        if (editMode === 'objectSelected') {
            if (e.key === 'Escape') {
                e.preventDefault();
                editMode = 'none';
                selectedControl = null;
                selectedCells = [];
                cellAnchor = null;
                selectionRenderer.clear();
                return;
            }
            if ((e.key === 'Enter' || e.key === 'F5') && selectedControl && selectedControl.type === 'table') {
                e.preventDefault();
                editMode = 'cellSelected';
                if (selectedControl.cells && selectedControl.cells.length > 0) {
                    cellAnchor = selectedControl.cells[0];
                    selectedCells = [cellAnchor];
                }
                selectionRenderer.drawCellSelection(selectedCells);
                return;
            }
            if (!e.ctrlKey && !e.metaKey) return;
        }

        // cellSelected 모드
        if (editMode === 'cellSelected') {
            if (e.key === 'Escape') {
                e.preventDefault();
                editMode = 'objectSelected';
                selectedCells = [];
                cellAnchor = null;
                if (selectedControl) {
                    selectionRenderer.drawObjectSelection(selectedControl);
                }
                return;
            }
            if (e.key === 'Enter' && selectedCells.length > 0) {
                e.preventDefault();
                enterCellTextEdit(selectedCells[selectedCells.length - 1]);
                return;
            }
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                handleCellNavigation(e.key, e.shiftKey);
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                handleTabNavigation(e.shiftKey);
                return;
            }
            if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
        }

        // text 모드에서 Esc
        if (editMode === 'text' && e.key === 'Escape' && !e.isComposing) {
            e.preventDefault();
            const docPos = selectionController.getDocumentPos();
            if (docPos && _hasCellCtx(docPos)) {
                const matchingCtrl = findControlForCell(docPos);
                if (matchingCtrl) {
                    editMode = 'cellSelected';
                    selectedControl = matchingCtrl;
                    selectionController.clearSelection();
                    const cell = matchingCtrl.cells?.find(c => c.cellIdx === docPos.cellIdx);
                    cellAnchor = cell || null;
                    selectedCells = cell ? [cell] : [];
                    selectionRenderer.drawCellSelection(selectedCells);
                    return;
                }
            }
            editMode = 'none';
            selectedControl = null;
            selectedCells = [];
            cellAnchor = null;
            selectionController.clearSelection();
            return;
        }

        // 캐럿 활성 상태면 Arrow/Home/End를 text_selection.js에서 처리 (IME 조합 중에는 무시)
        const caretActive = selectionController && selectionController.hasActiveCaret();
        if (caretActive && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) && !e.isComposing) {
            return; // text_selection.js의 _onKeyDown에서 처리
        }

        // 캐럿 활성 상태면 printable 키 입력 처리
        // IME textarea에 포커스 중이면 textarea/IME에서 처리하도록 위임
        if (caretActive && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.isComposing) {
            if (document.activeElement === imeInput) return;
            e.preventDefault();
            handleTextInsert(e.key);
            return;
        }

        // 캐럿 활성 상태면 Enter 키 처리 (문단 분리)
        if (caretActive && e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            handleParagraphSplit();
            return;
        }

        // 캐럿/선택 활성 상태면 Backspace/Delete 처리 (IME 조합 중에는 무시)
        const hasSelection = selectionController && selectionController.getSelectionDocRange();
        if ((caretActive || hasSelection) && e.key === 'Backspace' && !e.isComposing) {
            e.preventDefault();
            handleTextDelete(true);
            return;
        }
        if ((caretActive || hasSelection) && e.key === 'Delete' && !e.isComposing) {
            e.preventDefault();
            handleTextDelete(false);
            return;
        }

        // Ctrl+C: 복사 (내부 클립보드 + 브라우저 클립보드)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' &&
            (caretActive || hasSelection || editMode === 'objectSelected')) {
            handleCopyToInternal();
            // 컨트롤 객체 선택 시 브라우저 클립보드에 HTML 직접 등록
            // (text_selection.js에는 anchor/focus가 없어 onCopy 콜백이 안 됨)
            if (editMode === 'objectSelected' && selectedControl) {
                e.preventDefault();
                writeControlHtmlToClipboard();
            }
            // 텍스트 선택 시에는 text_selection.js의 onCopy 콜백이 처리
            return;
        }

        // Ctrl+V: 붙여넣기
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && (caretActive || hasSelection)) {
            e.preventDefault();
            handlePaste();
            return;
        }

        // Ctrl+X: 잘라내기
        if ((e.ctrlKey || e.metaKey) && e.key === 'x' && (caretActive || hasSelection)) {
            e.preventDefault();
            handleCut();
            return;
        }

        // 페이지 이동
        if (e.key === 'ArrowLeft') prevPage();
        if (e.key === 'ArrowRight') nextPage();

        // Ctrl+B/I/U: 서식 단축키
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && formatToolbar) {
            e.preventDefault();
            formatToolbar.toggleBold();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'i' && formatToolbar) {
            e.preventDefault();
            formatToolbar.toggleItalic();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'u' && formatToolbar) {
            e.preventDefault();
            formatToolbar.toggleUnderline();
            return;
        }

        // Alt+L: 글자 모양 대화상자
        if (e.altKey && (e.key === 'l' || e.key === 'L' || e.key === 'ㄹ')) {
            e.preventDefault();
            openCharShapeDialog();
            return;
        }

        // Ctrl+S: 저장
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
            return;
        }

        // Ctrl+F: 검색 포커스
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }

        // Ctrl+줌
        if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
            e.preventDefault();
            zoomIn();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoomOut();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            applyZoom(1.0);
        }
    });
}

// === 파일 업로드 ===

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.hwp')) {
        alert('HWP 파일만 지원합니다.');
        return;
    }

    try {
        showLoading(true);

        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        if (doc) {
            doc.free();
        }

        // 모든 폰트 로딩 완료 대기 (compose_section에서 js_measure_text_width 콜백 시
        // 로딩된 폰트 메트릭을 사용하도록 보장)
        if (globalThis._fontLoadPromise) {
            await globalThis._fontLoadPromise;
        }

        const startTime = performance.now();
        doc = new HwpDocument(data);
        doc.convertToEditable(); // 배포용(읽기전용) 문서 자동 변환
        const parseTime = performance.now() - startTime;

        currentPage = 0;

        // 툴바 표시
        document.getElementById('toolbar').classList.remove('hidden');

        // 서식 툴바 초기화 및 표시
        if (!formatToolbar) {
            formatToolbar = new FormatToolbar(document.getElementById('format-toolbar'));
            formatToolbar.onApplyCharFormat = handleApplyCharFormat;
            formatToolbar.onApplyParaFormat = handleApplyParaFormat;
            formatToolbar.onOpenCharShapeDialog = openCharShapeDialog;
        }
        formatToolbar.show();

        // 문서 정보 갱신
        displayDocInfo(file.name, parseTime);

        // 검색 인덱스 구축
        buildSearchIndex();

        // 검색 초기화
        document.getElementById('search-input').value = '';
        searchResults = [];
        searchIndex = -1;
        updateSearchUI();

        // 줌 리셋
        zoomLevel = 1.0;

        // 편집 모드 리셋
        editMode = 'none';
        selectedControl = null;
        selectedCells = [];
        cellAnchor = null;

        // 렌더링
        renderCurrentPage();
        updateNavButtons();

        console.log(`파일 로드 완료: ${file.name} (${doc.pageCount()}페이지, ${parseTime.toFixed(2)}ms)`);
    } catch (error) {
        console.error('파일 로드 실패:', error);
        alert(`파일 로드에 실패했습니다:\n${error}`);
    } finally {
        showLoading(false);
    }
}

// === 문서 정보 팝업 ===

function displayDocInfo(fileName, parseTime) {
    const info = JSON.parse(doc.getDocumentInfo());
    const content = document.getElementById('fileinfo-content');

    content.innerHTML = `
        <div class="info-grid">
            <div class="info-item">
                <span class="label">파일:</span>
                <span class="value">${escapeHtml(fileName)}</span>
            </div>
            <div class="info-item">
                <span class="label">버전:</span>
                <span class="value">${escapeHtml(info.version)}</span>
            </div>
            <div class="info-item">
                <span class="label">페이지:</span>
                <span class="value">${doc.pageCount()}</span>
            </div>
            <div class="info-item">
                <span class="label">파싱:</span>
                <span class="value">${parseTime.toFixed(2)}ms</span>
            </div>
        </div>
    `;
}

function setupFileInfoPopup() {
    const btn = document.getElementById('fileinfo-btn');
    const popup = document.getElementById('fileinfo-popup');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && e.target !== btn) {
            popup.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !popup.classList.contains('hidden')) {
            popup.classList.add('hidden');
        }
    });
}

// === 렌더링 ===

function renderCurrentPage() {
    if (!doc) return;

    const startTime = performance.now();

    try {
        const editorArea = document.getElementById('editor-area');
        const canvas = document.getElementById('hwp-canvas');
        const selCanvas = document.getElementById('selection-canvas');

        editorArea.classList.add('loaded');
        canvas.classList.remove('hidden');

        // 렌더 스케일 = zoom × dpr → 물리 픽셀과 1:1 매칭, 보간 없음
        const dpr = window.devicePixelRatio || 1;
        const renderScale = zoomLevel * dpr;
        doc.renderPageToCanvas(currentPage, canvas, renderScale);

        // 기본 페이지 크기 저장 (줌 1.0 기준)
        _basePageWidth = canvas.width / renderScale;
        _basePageHeight = canvas.height / renderScale;

        // CSS 표시 크기 = 페이지 크기 × 줌 (슈퍼샘플링은 CSS에 영향 없음)
        canvas.style.width = `${_basePageWidth * zoomLevel}px`;
        canvas.style.height = `${_basePageHeight * zoomLevel}px`;

        // 오버레이 캔버스 크기 동기화
        selCanvas.width = canvas.width;
        selCanvas.height = canvas.height;
        selCanvas.style.width = canvas.style.width;
        selCanvas.style.height = canvas.style.height;
        selCanvas.classList.remove('hidden');

        // 텍스트 레이아웃 로드
        textLayout.loadPage(currentPage, doc);
        controlLayout.loadPage(currentPage, doc);

        // 선택 컨트롤러 초기화
        if (selectionController) {
            selectionController.destroy();
        }
        selectionRenderer = new SelectionRenderer(selCanvas);
        selectionRenderer.setZoomScale(renderScale);
        selectionController = new SelectionController(canvas, textLayout, selectionRenderer, controlLayout);
        selectionController.setZoomScale(renderScale);

        // 컨트롤/텍스트 선택 콜백
        selectionController.onControlSelect = (ctrl, x, y) => {
            editMode = 'objectSelected';
            selectedControl = ctrl;
            selectedCells = [];
            cellAnchor = null;
            selectionRenderer.drawObjectSelection(ctrl);
        };
        selectionController.onControlDeselect = () => {
            editMode = 'none';
            selectedControl = null;
            selectedCells = [];
            cellAnchor = null;
            selectionRenderer.clear();
        };
        selectionController.onTextClick = (x, y, shiftKey) => {
            // cellSelected + Shift+클릭 → 셀 범위 확장
            if (editMode === 'cellSelected' && shiftKey &&
                selectedControl && selectedControl.type === 'table' && cellAnchor) {
                const cell = controlLayout.hitTestCell(x, y, selectedControl);
                if (cell) {
                    selectedCells = getCellRange(cellAnchor, cell, selectedControl.cells);
                    selectionRenderer.drawCellSelection(selectedCells);
                    return true; // 텍스트 편집 진입 취소
                }
            }
            editMode = 'text';
            selectedCells = [];
            return false;
        };

        // Ctrl+C 복사 시 HTML+텍스트 클립보드 처리
        selectionController.onCopy = (e) => {
            handleCopyToClipboard(e);
        };

        // 캐럿 변경 시 서식 툴바 갱신
        selectionController.onCaretChange = () => {
            if (formatToolbar && doc && selectionController) {
                const docPos = selectionController.getDocumentPos();
                if (docPos) {
                    formatToolbar.update(doc, docPos);
                }
            }
        };

        // 비동기 이미지 로드 대응
        const pageAtRender = currentPage;
        const renderScaleAtRender = renderScale;
        if (window._canvasReRenderTimer) clearTimeout(window._canvasReRenderTimer);
        window._canvasReRenderTimer = setTimeout(() => {
            if (doc && currentPage === pageAtRender) {
                doc.renderPageToCanvas(currentPage, canvas, renderScaleAtRender);
                selCanvas.width = canvas.width;
                selCanvas.height = canvas.height;
                selCanvas.style.width = canvas.style.width;
                selCanvas.style.height = canvas.style.height;
            }
        }, 200);

        // 줌 적용 (scaler 크기 갱신)
        applyZoom(zoomLevel);

        // 검색 하이라이트 재적용
        if (searchResults.length > 0) {
            highlightSearchResults();
        }
    } catch (error) {
        console.error('렌더링 실패:', error);
        const editorArea = document.getElementById('editor-area');
        editorArea.innerHTML = `<p class="error">렌더링 오류: ${error}</p>`;
    }

    const renderTime = performance.now() - startTime;

    document.getElementById('page-info').textContent =
        `${currentPage + 1} / ${doc.pageCount()}`;

    console.log(`페이지 ${currentPage + 1} 렌더링 완료 (${renderTime.toFixed(2)}ms)`);
}

// === 텍스트 입력 ===

/** 셀 컨텍스트가 있는지 확인 */
function _hasCellCtx(pos) {
    return pos.parentParaIdx !== undefined && pos.controlIdx !== undefined &&
           pos.cellIdx !== undefined && pos.cellParaIdx !== undefined;
}

/** 셀 컨텍스트 객체 추출 */
function _cellCtx(pos) {
    return {
        parentParaIdx: pos.parentParaIdx,
        controlIdx: pos.controlIdx,
        cellIdx: pos.cellIdx,
        cellParaIdx: pos.cellParaIdx,
    };
}

/** 텍스트 삽입 (본문 또는 셀) */
function _doInsertText(pos, charOffset, text) {
    if (_hasCellCtx(pos)) {
        return doc.insertTextInCell(
            pos.secIdx, pos.parentParaIdx, pos.controlIdx,
            pos.cellIdx, pos.cellParaIdx, charOffset, text
        );
    }
    return doc.insertText(pos.secIdx, pos.paraIdx, charOffset, text);
}

/** 텍스트 삭제 (본문 또는 셀) */
function _doDeleteText(pos, charOffset, count) {
    if (_hasCellCtx(pos)) {
        return doc.deleteTextInCell(
            pos.secIdx, pos.parentParaIdx, pos.controlIdx,
            pos.cellIdx, pos.cellParaIdx, charOffset, count
        );
    }
    return doc.deleteText(pos.secIdx, pos.paraIdx, charOffset, count);
}

/** 캐럿 복원 (본문 또는 셀) */
function _restoreCaret(pos, charOffset) {
    if (_hasCellCtx(pos)) {
        selectionController.setCaretByDocPos(pos.secIdx, pos.paraIdx, charOffset, _cellCtx(pos));
    } else {
        selectionController.setCaretByDocPos(pos.secIdx, pos.paraIdx, charOffset);
    }
}

function handleTextInsert(text) {
    if (!doc || !selectionController) return;

    // 선택 범위가 있으면 먼저 삭제
    const selRange = selectionController.getSelectionDocRange();
    if (selRange) {
        const count = selRange.endCharOffset - selRange.startCharOffset;
        if (count > 0) {
            try {
                _doDeleteText(selRange, selRange.startCharOffset, count);
            } catch (err) {
                console.error('선택 삭제 오류:', err);
                return;
            }
        }
        // 삭제 후 위치에서 삽입 진행
        try {
            const resultJson = _doInsertText(selRange, selRange.startCharOffset, text);
            const result = JSON.parse(resultJson);
            if (!result.ok) {
                console.error('텍스트 삽입 실패:', resultJson);
                return;
            }
            const newCharOffset = selRange.startCharOffset + [...text].length;
            renderCurrentPage();
            _restoreCaret(selRange, newCharOffset);
            buildSearchIndex();
            document.getElementById('ime-input').focus();
        } catch (err) {
            console.error('텍스트 삽입 오류:', err);
        }
        return;
    }

    const docPos = selectionController.getDocumentPos();
    if (!docPos) return;

    try {
        const resultJson = _doInsertText(docPos, docPos.charOffset, text);
        const result = JSON.parse(resultJson);

        if (!result.ok) {
            console.error('텍스트 삽입 실패:', resultJson);
            return;
        }

        // 새 캐럿 위치 계산
        const newCharOffset = docPos.charOffset + [...text].length;

        // 재렌더링
        renderCurrentPage();

        // 캐럿 복원
        _restoreCaret(docPos, newCharOffset);

        // 검색 인덱스 재구축
        buildSearchIndex();

        // IME textarea에 포커스 유지
        document.getElementById('ime-input').focus();
    } catch (err) {
        console.error('텍스트 삽입 오류:', err);
    }
}

function handleTextDelete(isBackspace) {
    if (!doc || !selectionController) return;

    // 선택 범위가 있으면 선택 삭제
    const selRange = selectionController.getSelectionDocRange();
    if (selRange) {
        const count = selRange.endCharOffset - selRange.startCharOffset;
        if (count <= 0) return;

        try {
            const resultJson = _doDeleteText(selRange, selRange.startCharOffset, count);
            const result = JSON.parse(resultJson);
            if (!result.ok) {
                console.error('선택 삭제 실패:', resultJson);
                return;
            }
            renderCurrentPage();
            _restoreCaret(selRange, selRange.startCharOffset);
            buildSearchIndex();
            document.getElementById('ime-input').focus();
        } catch (err) {
            console.error('선택 삭제 오류:', err);
        }
        return;
    }

    // 단일 문자 삭제
    const docPos = selectionController.getDocumentPos();
    if (!docPos) return;

    let deleteOffset, newCaretOffset;

    if (isBackspace) {
        if (docPos.charOffset === 0) {
            // 셀 내부에서는 문단 병합하지 않음
            if (_hasCellCtx(docPos)) return;
            // 문단 시작에서 Backspace → 이전 문단에 병합
            handleParagraphMerge(docPos);
            return;
        }
        deleteOffset = docPos.charOffset - 1;
        newCaretOffset = deleteOffset;
    } else {
        deleteOffset = docPos.charOffset;
        newCaretOffset = deleteOffset;
    }

    try {
        const resultJson = _doDeleteText(docPos, deleteOffset, 1);
        const result = JSON.parse(resultJson);

        if (!result.ok) {
            console.error('텍스트 삭제 실패:', resultJson);
            return;
        }

        renderCurrentPage();
        _restoreCaret(docPos, newCaretOffset);
        buildSearchIndex();
        document.getElementById('ime-input').focus();
    } catch (err) {
        console.error('텍스트 삭제 오류:', err);
    }
}

// === 클립보드 (복사/붙여넣기/잘라내기) ===

/** 내부 클립보드에 복사 (WASM) */
function handleCopyToInternal() {
    if (!doc || !selectionController) return;

    // 1. 컨트롤 객체 선택 상태 (표/이미지/도형)
    if (editMode === 'objectSelected' && selectedControl) {
        try {
            doc.copyControl(
                selectedControl.secIdx,
                selectedControl.paraIdx,
                selectedControl.controlIdx
            );
            console.log('컨트롤 객체 내부 클립보드 복사 완료');
        } catch (err) {
            console.error('컨트롤 복사 오류:', err);
        }
        return;
    }

    // 2. 텍스트 선택 범위
    const selRange = selectionController.getSelectionDocRange();
    if (!selRange) return;

    try {
        if (_hasCellCtx(selRange)) {
            // 셀 내부 선택
            doc.copySelectionInCell(
                selRange.secIdx,
                selRange.parentParaIdx,
                selRange.controlIdx,
                selRange.cellIdx,
                selRange.startCellParaIdx,
                selRange.startCharOffset,
                selRange.endCellParaIdx,
                selRange.endCharOffset
            );
        } else {
            // 본문 선택
            doc.copySelection(
                selRange.secIdx,
                selRange.startParaIdx,
                selRange.startCharOffset,
                selRange.endParaIdx,
                selRange.endCharOffset
            );
        }
        console.log('텍스트 내부 클립보드 복사 완료');
    } catch (err) {
        console.error('선택 복사 오류:', err);
    }
}

/** 컨트롤 객체(표/이미지)의 HTML을 브라우저 클립보드에 등록 */
async function writeControlHtmlToClipboard() {
    if (!doc || !selectedControl) return;
    try {
        const htmlStr = doc.exportControlHtml(
            selectedControl.secIdx,
            selectedControl.paraIdx,
            selectedControl.controlIdx
        );
        if (htmlStr && typeof ClipboardItem !== 'undefined') {
            const item = new ClipboardItem({
                'text/html': new Blob([htmlStr], { type: 'text/html' }),
                'text/plain': new Blob([doc.getClipboardText() || ''], { type: 'text/plain' }),
            });
            await navigator.clipboard.write([item]);
            console.log('컨트롤 HTML 클립보드 복사 완료');
        }
    } catch (err) {
        console.error('컨트롤 HTML 클립보드 쓰기 실패:', err);
    }
}

/** 브라우저 클립보드에 HTML+텍스트 동시 등록 (text_selection.js에서 콜백) */
async function handleCopyToClipboard(e) {
    if (!doc || !selectionController) return;

    // 내부 클립보드에도 복사 (editor.js keydown에서 이미 호출됐을 수 있지만 안전을 위해)
    handleCopyToInternal();

    const selRange = selectionController.getSelectionDocRange();
    if (!selRange) return;

    e.preventDefault();

    // 플레인 텍스트
    const plainText = textLayout.getSelectedText(
        selectionController.anchor, selectionController.focus
    );

    // HTML 생성
    let htmlStr = '';
    try {
        if (_hasCellCtx(selRange)) {
            htmlStr = doc.exportSelectionInCellHtml(
                selRange.secIdx,
                selRange.parentParaIdx,
                selRange.controlIdx,
                selRange.cellIdx,
                selRange.startCellParaIdx,
                selRange.startCharOffset,
                selRange.endCellParaIdx,
                selRange.endCharOffset
            );
        } else {
            htmlStr = doc.exportSelectionHtml(
                selRange.secIdx,
                selRange.startParaIdx,
                selRange.startCharOffset,
                selRange.endParaIdx,
                selRange.endCharOffset
            );
        }
    } catch (err) {
        console.error('HTML 생성 오류:', err);
    }

    // ClipboardItem으로 HTML+텍스트 동시 등록
    try {
        if (htmlStr && typeof ClipboardItem !== 'undefined') {
            const item = new ClipboardItem({
                'text/html': new Blob([htmlStr], { type: 'text/html' }),
                'text/plain': new Blob([plainText || ''], { type: 'text/plain' }),
            });
            await navigator.clipboard.write([item]);
            console.log('HTML+텍스트 클립보드 복사 완료');
        } else if (plainText) {
            await navigator.clipboard.writeText(plainText);
            console.log('텍스트 클립보드 복사 완료 (fallback)');
        }
    } catch (err) {
        console.error('클립보드 쓰기 실패:', err);
        // fallback: 텍스트만 복사
        if (plainText) {
            navigator.clipboard.writeText(plainText).catch(() => {});
        }
    }
}

/** 붙여넣기 (내부 클립보드 우선 → 브라우저 클립보드 대체) */
async function handlePaste() {
    if (!doc || !selectionController) return;

    // 선택 범위가 있으면 먼저 삭제
    const selRange = selectionController.getSelectionDocRange();
    if (selRange) {
        const count = selRange.endCharOffset - selRange.startCharOffset;
        if (count > 0) {
            try {
                _doDeleteText(selRange, selRange.startCharOffset, count);
            } catch (err) {
                console.error('선택 삭제 오류:', err);
                return;
            }
        }
    }

    // 붙여넣기 위치 결정
    const pos = selRange || selectionController.getDocumentPos();
    if (!pos) return;

    const charOffset = selRange ? selRange.startCharOffset : pos.charOffset;

    // 내부 클립보드 우선
    const hasInternal = doc.hasInternalClipboard();
    console.dir({ '[Paste] 내부 클립보드 확인': hasInternal, pos, charOffset });
    if (hasInternal) {
        try {
            let resultJson;
            if (_hasCellCtx(pos)) {
                const cellParaIdx = selRange ? selRange.startCellParaIdx : pos.cellParaIdx;
                resultJson = doc.pasteInternalInCell(
                    pos.secIdx,
                    pos.parentParaIdx,
                    pos.controlIdx,
                    pos.cellIdx,
                    cellParaIdx,
                    charOffset
                );
            } else {
                const paraIdx = selRange ? selRange.startParaIdx : pos.paraIdx;
                resultJson = doc.pasteInternal(
                    pos.secIdx,
                    paraIdx,
                    charOffset
                );
            }

            const result = JSON.parse(resultJson);
            if (result.ok) {
                renderCurrentPage();

                // 캐럿을 붙여넣은 텍스트 끝으로 이동
                if (_hasCellCtx(pos)) {
                    const cellCtx = {
                        parentParaIdx: pos.parentParaIdx,
                        controlIdx: pos.controlIdx,
                        cellIdx: pos.cellIdx,
                        cellParaIdx: result.cellParaIdx,
                    };
                    selectionController.setCaretByDocPos(
                        pos.secIdx, pos.paraIdx, result.charOffset, cellCtx
                    );
                } else {
                    selectionController.setCaretByDocPos(
                        pos.secIdx, result.paraIdx, result.charOffset
                    );
                }

                buildSearchIndex();
                document.getElementById('ime-input').focus();
                return;
            }
        } catch (err) {
            console.error('내부 붙여넣기 오류:', err);
        }
    }

    // 브라우저 클립보드에서 읽기 (HTML 우선 → 플레인 텍스트 대체)
    try {
        const items = await navigator.clipboard.read();
        console.dir({ '[Paste] clipboard.read() items': items, types: items.map(i => i.types) });
        for (const item of items) {
            // HTML 포맷 우선
            if (item.types.includes('text/html')) {
                const blob = await item.getType('text/html');
                const html = await blob.text();
                console.dir({ '[Paste] text/html': html, length: html.length });
                if (html && html.trim()) {
                    pasteFromHtml(html);
                    return;
                }
            }
        }
        // HTML 없으면 플레인 텍스트
        const text = await navigator.clipboard.readText();
        console.dir({ '[Paste] plainText fallback': text });
        if (text) {
            handleTextInsert(text);
        }
    } catch (err) {
        console.warn('[Paste] clipboard.read() 실패, readText() fallback:', err.message);
        // clipboard.read() 미지원 시 readText() fallback
        try {
            const text = await navigator.clipboard.readText();
            console.dir({ '[Paste] readText() fallback': text });
            if (text) {
                handleTextInsert(text);
            }
        } catch (err2) {
            console.error('브라우저 클립보드 읽기 실패:', err2);
        }
    }
}

/** HTML 문자열을 파싱하여 캐럿 위치에 삽입한다 */
function pasteFromHtml(html) {
    if (!doc || !selectionController) return;

    const pos = selectionController.getDocumentPos();
    if (!pos) return;

    // 디버그: HTML 내용 및 태그 분석
    const hasTable = /<table[\s>]/i.test(html);
    const hasImg = /<img[\s>]/i.test(html);
    const hasSpan = /<span[\s>]/i.test(html);
    const hasPara = /<p[\s>]/i.test(html);
    console.dir({
        '[pasteFromHtml] HTML 분석': { hasTable, hasImg, hasSpan, hasPara, htmlLength: html.length },
        pos,
        htmlPreview: html.substring(0, 500),
    });

    try {
        let resultJson;
        if (_hasCellCtx(pos)) {
            resultJson = doc.pasteHtmlInCell(
                pos.secIdx,
                pos.parentParaIdx,
                pos.controlIdx,
                pos.cellIdx,
                pos.cellParaIdx,
                pos.charOffset,
                html
            );
        } else {
            resultJson = doc.pasteHtml(
                pos.secIdx,
                pos.paraIdx,
                pos.charOffset,
                html
            );
        }

        const result = JSON.parse(resultJson);
        console.dir({ '[pasteFromHtml] WASM 결과': result });
        if (result.ok) {
            renderCurrentPage();

            if (_hasCellCtx(pos)) {
                const cellCtx = {
                    parentParaIdx: pos.parentParaIdx,
                    controlIdx: pos.controlIdx,
                    cellIdx: pos.cellIdx,
                    cellParaIdx: result.cellParaIdx,
                };
                selectionController.setCaretByDocPos(
                    pos.secIdx, pos.paraIdx, result.charOffset, cellCtx
                );
            } else {
                selectionController.setCaretByDocPos(
                    pos.secIdx, result.paraIdx, result.charOffset
                );
            }

            buildSearchIndex();
            document.getElementById('ime-input').focus();
        }
    } catch (err) {
        console.error('HTML 붙여넣기 오류:', err);
        // HTML 파싱 실패 시 플레인 텍스트로 fallback
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const plainText = (parsed.body.textContent || '').trim();
        if (plainText) {
            handleTextInsert(plainText);
        }
    }
}

/** 잘라내기 (복사 + 삭제) */
function handleCut() {
    if (!doc || !selectionController) return;

    // 컨트롤 객체 선택 상태에서는 잘라내기 미지원 (복잡도)
    if (editMode === 'objectSelected') {
        console.warn('컨트롤 객체 잘라내기는 미지원');
        return;
    }

    const selRange = selectionController.getSelectionDocRange();
    if (!selRange) return;

    // 1. 내부 클립보드에 복사
    handleCopyToInternal();

    // 2. 브라우저 클립보드에 HTML+텍스트 복사
    const plainText = textLayout.getSelectedText(
        selectionController.anchor, selectionController.focus
    );
    let htmlStr = '';
    try {
        if (_hasCellCtx(selRange)) {
            htmlStr = doc.exportSelectionInCellHtml(
                selRange.secIdx, selRange.parentParaIdx,
                selRange.controlIdx, selRange.cellIdx,
                selRange.startCellParaIdx, selRange.startCharOffset,
                selRange.endCellParaIdx, selRange.endCharOffset
            );
        } else {
            htmlStr = doc.exportSelectionHtml(
                selRange.secIdx, selRange.startParaIdx,
                selRange.startCharOffset, selRange.endParaIdx,
                selRange.endCharOffset
            );
        }
    } catch (err) {
        console.error('잘라내기 HTML 생성 오류:', err);
    }

    if (htmlStr && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({
            'text/html': new Blob([htmlStr], { type: 'text/html' }),
            'text/plain': new Blob([plainText || ''], { type: 'text/plain' }),
        });
        navigator.clipboard.write([item]).catch(err => {
            console.error('브라우저 클립보드 쓰기 실패:', err);
        });
    } else if (plainText) {
        navigator.clipboard.writeText(plainText).catch(err => {
            console.error('브라우저 클립보드 쓰기 실패:', err);
        });
    }

    // 3. 선택 범위 삭제
    const count = selRange.endCharOffset - selRange.startCharOffset;
    if (count <= 0) return;

    try {
        const resultJson = _doDeleteText(selRange, selRange.startCharOffset, count);
        const result = JSON.parse(resultJson);
        if (!result.ok) {
            console.error('잘라내기 삭제 실패:', resultJson);
            return;
        }
        renderCurrentPage();
        _restoreCaret(selRange, selRange.startCharOffset);
        buildSearchIndex();
        document.getElementById('ime-input').focus();
    } catch (err) {
        console.error('잘라내기 삭제 오류:', err);
    }
}

// === 문단 분리/병합 ===

function handleParagraphSplit() {
    if (!doc || !selectionController) return;

    // 셀 내부에서는 문단 분리 비활성화 (제외 범위)
    const curPos = selectionController.getDocumentPos();
    if (curPos && _hasCellCtx(curPos)) return;

    // 선택 범위가 있으면 먼저 삭제
    const selRange = selectionController.getSelectionDocRange();
    if (selRange) {
        const count = selRange.endCharOffset - selRange.startCharOffset;
        if (count > 0) {
            try {
                doc.deleteText(selRange.secIdx, selRange.paraIdx, selRange.startCharOffset, count);
            } catch (err) {
                console.error('선택 삭제 오류:', err);
                return;
            }
        }
        // 삭제 후 위치에서 분리
        try {
            const resultJson = doc.splitParagraph(selRange.secIdx, selRange.paraIdx, selRange.startCharOffset);
            const result = JSON.parse(resultJson);
            if (!result.ok) {
                console.error('문단 분리 실패:', resultJson);
                return;
            }
            renderCurrentPage();
            selectionController.setCaretByDocPos(selRange.secIdx, result.paraIdx, 0);
            buildSearchIndex();
            document.getElementById('ime-input').focus();
        } catch (err) {
            console.error('문단 분리 오류:', err);
        }
        return;
    }

    const docPos = selectionController.getDocumentPos();
    if (!docPos) return;

    try {
        const resultJson = doc.splitParagraph(docPos.secIdx, docPos.paraIdx, docPos.charOffset);
        const result = JSON.parse(resultJson);

        if (!result.ok) {
            console.error('문단 분리 실패:', resultJson);
            return;
        }

        renderCurrentPage();
        selectionController.setCaretByDocPos(docPos.secIdx, result.paraIdx, 0);
        buildSearchIndex();
        document.getElementById('ime-input').focus();
    } catch (err) {
        console.error('문단 분리 오류:', err);
    }
}

function handleParagraphMerge(docPos) {
    if (!doc || !selectionController) return;
    if (docPos.paraIdx === 0) return; // 첫 번째 문단은 병합 불가

    try {
        const resultJson = doc.mergeParagraph(docPos.secIdx, docPos.paraIdx);
        const result = JSON.parse(resultJson);

        if (!result.ok) {
            console.error('문단 병합 실패:', resultJson);
            return;
        }

        renderCurrentPage();
        selectionController.setCaretByDocPos(docPos.secIdx, result.paraIdx, result.charOffset);
        buildSearchIndex();
        document.getElementById('ime-input').focus();
    } catch (err) {
        console.error('문단 병합 오류:', err);
    }
}

// === 글자 모양 대화상자 ===

let charShapeDialog = null;

/**
 * 글자 모양 대화상자를 연다.
 * 캐럿 또는 선택 시작 위치의 글자 속성을 읽어 대화상자에 표시한다.
 */
function openCharShapeDialog() {
    if (!doc) return;

    const selRange = selectionController ? selectionController.getSelectionDocRange() : null;
    const docPos = selRange
        || (selectionController ? selectionController.getDocumentPos() : null);

    // 글자 속성 조회 (캐럿/선택 없으면 첫 문단 기본 속성)
    let charPropsJson;
    try {
        if (docPos && _hasCellCtx(docPos)) {
            const offset = docPos.charOffset ?? docPos.startCharOffset ?? 0;
            charPropsJson = doc.getCellCharPropertiesAt(
                docPos.secIdx, docPos.parentParaIdx, docPos.controlIdx,
                docPos.cellIdx, docPos.cellParaIdx, offset
            );
        } else if (docPos) {
            const offset = docPos.charOffset ?? docPos.startCharOffset ?? 0;
            charPropsJson = doc.getCharPropertiesAt(
                docPos.secIdx, docPos.paraIdx, offset
            );
        } else {
            // 캐럿/선택 없음: 섹션 0, 문단 0, 오프셋 0의 기본 속성
            charPropsJson = doc.getCharPropertiesAt(0, 0, 0);
        }
    } catch (err) {
        console.error('글자 속성 조회 오류:', err);
        return;
    }

    const charProps = JSON.parse(charPropsJson);

    if (!charShapeDialog) {
        charShapeDialog = new CharShapeDialog();
        charShapeDialog.onApply = (mods) => {
            // fontName → fontId 변환
            if (mods.fontName && doc.findOrCreateFontId) {
                const fontId = doc.findOrCreateFontId(mods.fontName);
                if (fontId >= 0) mods.fontId = fontId;
                delete mods.fontName;
            }
            const propsJson = JSON.stringify(mods);
            handleApplyCharFormat(propsJson);
        };
    }

    charShapeDialog.open(charProps);
}

// === 서식 적용 ===

/**
 * 글자 서식을 적용한다 (선택 범위 필요).
 * @param {string} propsJson - {"bold":true} 등
 */
function handleApplyCharFormat(propsJson) {
    if (!doc || !selectionController) return;

    // 선택 범위 확인
    const selRange = selectionController.getSelectionDocRange();
    if (!selRange) {
        console.log('글자 서식 적용: 선택 범위 없음');
        return;
    }

    try {
        let resultJson;
        if (_hasCellCtx(selRange)) {
            resultJson = doc.applyCharFormatInCell(
                selRange.secIdx, selRange.parentParaIdx, selRange.controlIdx,
                selRange.cellIdx, selRange.cellParaIdx,
                selRange.startCharOffset, selRange.endCharOffset, propsJson
            );
        } else {
            resultJson = doc.applyCharFormat(
                selRange.secIdx, selRange.paraIdx,
                selRange.startCharOffset, selRange.endCharOffset, propsJson
            );
        }

        const result = JSON.parse(resultJson);
        if (!result.ok) {
            console.error('글자 서식 적용 실패:', resultJson);
            return;
        }

        renderCurrentPage();

        // 선택 복원
        if (_hasCellCtx(selRange)) {
            selectionController.setCaretByDocPos(
                selRange.secIdx, selRange.paraIdx, selRange.endCharOffset, _cellCtx(selRange)
            );
        } else {
            selectionController.setCaretByDocPos(
                selRange.secIdx, selRange.paraIdx, selRange.endCharOffset
            );
        }
        document.getElementById('ime-input').focus();
    } catch (err) {
        console.error('글자 서식 적용 오류:', err);
    }
}

/**
 * 문단 서식을 적용한다 (캐럿 위치 기준).
 * @param {string} propsJson - {"alignment":"center"} 등
 */
function handleApplyParaFormat(propsJson) {
    if (!doc || !selectionController) return;

    // 캐럿 위치 또는 선택 범위에서 문단 식별
    const docPos = selectionController.getDocumentPos()
        || selectionController.getSelectionDocRange();
    if (!docPos) return;

    try {
        let resultJson;
        if (_hasCellCtx(docPos)) {
            resultJson = doc.applyParaFormatInCell(
                docPos.secIdx, docPos.parentParaIdx, docPos.controlIdx,
                docPos.cellIdx, docPos.cellParaIdx, propsJson
            );
        } else {
            resultJson = doc.applyParaFormat(docPos.secIdx, docPos.paraIdx, propsJson);
        }

        const result = JSON.parse(resultJson);
        if (!result.ok) {
            console.error('문단 서식 적용 실패:', resultJson);
            return;
        }

        renderCurrentPage();

        // 캐럿 복원
        const charOffset = docPos.charOffset !== undefined ? docPos.charOffset : 0;
        if (_hasCellCtx(docPos)) {
            selectionController.setCaretByDocPos(
                docPos.secIdx, docPos.paraIdx, charOffset, _cellCtx(docPos)
            );
        } else {
            selectionController.setCaretByDocPos(docPos.secIdx, docPos.paraIdx, charOffset);
        }
        document.getElementById('ime-input').focus();
    } catch (err) {
        console.error('문단 서식 적용 오류:', err);
    }
}

// === 셀 텍스트 편집 진입 ===

function enterCellTextEdit(cell) {
    if (!selectedControl || !selectionController || !cell) return;

    editMode = 'text';
    selectionRenderer.clear();

    const cellCtx = {
        parentParaIdx: selectedControl.paraIdx,
        controlIdx: selectedControl.controlIdx,
        cellIdx: cell.cellIdx,
        cellParaIdx: 0,
    };

    const success = selectionController.setCaretByDocPos(
        selectedControl.secIdx, 0, 0, cellCtx
    );

    if (success) {
        document.getElementById('ime-input').focus();
    }
}

// === 셀 탐색 ===

function findControlForCell(docPos) {
    if (!controlLayout.loaded) return null;
    for (const ctrl of controlLayout.controls) {
        if (ctrl.type === 'table' &&
            ctrl.secIdx === docPos.secIdx &&
            ctrl.paraIdx === docPos.parentParaIdx &&
            ctrl.controlIdx === docPos.controlIdx) {
            return ctrl;
        }
    }
    return null;
}

function getCellRange(anchor, target, cells) {
    const minRow = Math.min(anchor.row, target.row);
    const maxRow = Math.max(anchor.row, target.row);
    const minCol = Math.min(anchor.col, target.col);
    const maxCol = Math.max(anchor.col, target.col);
    return cells.filter(c =>
        c.row >= minRow && c.row <= maxRow &&
        c.col >= minCol && c.col <= maxCol
    );
}

function handleCellNavigation(key, isShift) {
    if (!selectedControl || !selectedControl.cells || selectedCells.length === 0) return;

    const current = selectedCells[selectedCells.length - 1];
    let targetRow = current.row;
    let targetCol = current.col;

    if (key === 'ArrowLeft') targetCol--;
    else if (key === 'ArrowRight') targetCol++;
    else if (key === 'ArrowUp') targetRow--;
    else if (key === 'ArrowDown') targetRow++;

    const cell = selectedControl.cells.find(c => c.row === targetRow && c.col === targetCol);
    if (!cell) return;

    if (isShift && cellAnchor) {
        selectedCells = getCellRange(cellAnchor, cell, selectedControl.cells);
    } else {
        cellAnchor = cell;
        selectedCells = [cell];
    }
    selectionRenderer.drawCellSelection(selectedCells);
}

function handleTabNavigation(isShiftTab) {
    if (!selectedControl || !selectedControl.cells || selectedCells.length === 0) return;

    const current = selectedCells[selectedCells.length - 1];
    const sorted = [...selectedControl.cells].sort((a, b) =>
        a.row !== b.row ? a.row - b.row : a.col - b.col
    );
    const currentIdx = sorted.findIndex(c => c.cellIdx === current.cellIdx);

    let targetIdx;
    if (isShiftTab) {
        targetIdx = currentIdx > 0 ? currentIdx - 1 : sorted.length - 1;
    } else {
        targetIdx = currentIdx < sorted.length - 1 ? currentIdx + 1 : 0;
    }

    const target = sorted[targetIdx];
    cellAnchor = target;
    selectedCells = [target];
    selectionRenderer.drawCellSelection(selectedCells);
}

// === 파일 저장 ===

function handleSave() {
    if (!doc) return;

    try {
        showLoading(true);
        const startTime = performance.now();

        const bytes = doc.exportHwp();
        const exportTime = performance.now() - startTime;

        const blob = new Blob([bytes], { type: 'application/x-hwp' });
        const url = URL.createObjectURL(blob);

        // 파일명 결정: 원본 파일명 기반
        const fileInput = document.getElementById('file-input');
        const originalName = fileInput.files[0]?.name || 'document.hwp';
        const saveName = originalName.replace(/\.hwp$/i, '_saved.hwp');

        const a = document.createElement('a');
        a.href = url;
        a.download = saveName;
        a.click();

        URL.revokeObjectURL(url);

        console.log(`파일 저장 완료: ${saveName} (${(bytes.length / 1024).toFixed(1)}KB, ${exportTime.toFixed(2)}ms)`);
    } catch (err) {
        const msg = err?.message || err?.toString?.() || String(err);
        console.error('파일 저장 실패:', msg, err);
        alert(`파일 저장에 실패했습니다:\n${msg}`);
    } finally {
        showLoading(false);
    }
}

// === 페이지 네비게이션 ===

function prevPage() {
    if (!doc || currentPage <= 0) return;
    editMode = 'none';
    selectedControl = null;
    selectedCells = [];
    cellAnchor = null;
    currentPage--;
    renderCurrentPage();
    updateNavButtons();
}

function nextPage() {
    if (!doc || currentPage >= doc.pageCount() - 1) return;
    editMode = 'none';
    selectedControl = null;
    selectedCells = [];
    cellAnchor = null;
    currentPage++;
    renderCurrentPage();
    updateNavButtons();
}

function updateNavButtons() {
    document.getElementById('prev-btn').disabled = !doc || currentPage <= 0;
    document.getElementById('next-btn').disabled = !doc || currentPage >= doc.pageCount() - 1;
}

// === 줌 ===

function applyZoom(newZoom) {
    const editorArea = document.getElementById('editor-area');
    const scaler = document.getElementById('canvas-scaler');
    const wrapper = document.getElementById('canvas-wrapper');
    const canvas = document.getElementById('hwp-canvas');

    // 스크롤 중심 비율 저장
    const sx = editorArea.scrollWidth > editorArea.clientWidth
        ? (editorArea.scrollLeft + editorArea.clientWidth / 2) / editorArea.scrollWidth : 0.5;
    const sy = editorArea.scrollHeight > editorArea.clientHeight
        ? (editorArea.scrollTop + editorArea.clientHeight / 2) / editorArea.scrollHeight : 0.5;

    zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));

    // 즉시 CSS transform 적용 (현재 CSS 크기 대비 목표 비율 — 빠른 시각 피드백)
    if (_basePageWidth > 0) {
        const currentCssW = parseFloat(canvas.style.width) || (_basePageWidth * zoomLevel);
        const targetCssW = _basePageWidth * zoomLevel;
        const cssScale = targetCssW / currentCssW;
        wrapper.style.transform = `scale(${cssScale})`;
        wrapper.style.transformOrigin = '0 0';
    }

    // 스케일러 크기 설정 (스크롤 영역 대응)
    if (_basePageWidth > 0 && _basePageHeight > 0) {
        scaler.style.width = `${_basePageWidth * zoomLevel}px`;
        scaler.style.height = `${_basePageHeight * zoomLevel}px`;
    }

    // 줌 레벨 표시
    document.getElementById('zoom-level').textContent = `${Math.round(zoomLevel * 100)}%`;

    // 스크롤 중심 복원
    requestAnimationFrame(() => {
        editorArea.scrollLeft = sx * editorArea.scrollWidth - editorArea.clientWidth / 2;
        editorArea.scrollTop = sy * editorArea.scrollHeight - editorArea.clientHeight / 2;
    });

    // 디바운스 벡터 재렌더 (150ms 후 선명한 해상도로 재렌더링)
    if (_zoomRenderTimer) clearTimeout(_zoomRenderTimer);
    _zoomRenderTimer = setTimeout(() => {
        _zoomRenderTimer = null;
        _renderAtZoom(zoomLevel);
    }, 150);
}

/** 지정 줌 배율로 캔버스를 벡터 재렌더링한다. */
function _renderAtZoom(zoom) {
    if (!doc) return;
    const canvas = document.getElementById('hwp-canvas');
    const selCanvas = document.getElementById('selection-canvas');
    const wrapper = document.getElementById('canvas-wrapper');
    const scaler = document.getElementById('canvas-scaler');

    // 렌더 스케일 = zoom × dpr → 물리 픽셀 1:1, 보간 없음
    const dpr = window.devicePixelRatio || 1;
    const renderScale = zoom * dpr;
    doc.renderPageToCanvas(currentPage, canvas, renderScale);

    // 기본 페이지 크기 갱신
    _basePageWidth = canvas.width / renderScale;
    _basePageHeight = canvas.height / renderScale;

    // CSS 표시 크기 = 페이지 크기 × 줌
    const cssW = `${_basePageWidth * zoom}px`;
    const cssH = `${_basePageHeight * zoom}px`;
    canvas.style.width = cssW;
    canvas.style.height = cssH;

    // 오버레이 캔버스 동기화
    selCanvas.width = canvas.width;
    selCanvas.height = canvas.height;
    selCanvas.style.width = cssW;
    selCanvas.style.height = cssH;

    // CSS transform 제거 (캔버스가 이미 목표 해상도)
    wrapper.style.transform = '';

    // 스케일러 크기 = CSS 표시 크기
    scaler.style.width = cssW;
    scaler.style.height = cssH;

    // 오버레이 줌 스케일 = renderScale (캔버스 백킹 해상도 기준)
    const overlayScale = renderScale;
    if (selectionRenderer) {
        selectionRenderer.setZoomScale(overlayScale);
    }
    if (selectionController) {
        selectionController.setZoomScale(overlayScale);
        if (selectionController.hasActiveCaret()) {
            selectionController._drawCaret();
        }
    }
    if (searchResults.length > 0) {
        highlightSearchResults();
    }
}

function zoomIn() {
    const nextStep = ZOOM_STEPS.find(s => s > zoomLevel + 0.01);
    applyZoom(nextStep || ZOOM_MAX);
}

function zoomOut() {
    const prevStep = [...ZOOM_STEPS].reverse().find(s => s < zoomLevel - 0.01);
    applyZoom(prevStep || ZOOM_MIN);
}

function zoomFit() {
    if (!doc) return;
    const editorArea = document.getElementById('editor-area');

    const availWidth = editorArea.clientWidth - 32;
    const availHeight = editorArea.clientHeight - 32;

    // 기본 페이지 크기 (줌 1.0 기준) 사용
    const baseW = _basePageWidth > 0 ? _basePageWidth : 793;
    const baseH = _basePageHeight > 0 ? _basePageHeight : 1122;

    const fitScale = Math.min(
        availWidth / baseW,
        availHeight / baseH,
        3.0
    );
    applyZoom(Math.round(fitScale * 100) / 100);
}

// === 문단부호 토글 ===

function toggleParagraphMarks() {
    if (!doc) return;
    showParagraphMarks = !showParagraphMarks;
    doc.setShowParagraphMarks(showParagraphMarks);

    const btn = document.getElementById('paramark-btn');
    if (btn) {
        btn.style.background = showParagraphMarks ? '#4A90D9' : '';
        btn.style.color = showParagraphMarks ? '#fff' : '';
    }

    renderCurrentPage();
}

function toggleTransparentBorders() {
    if (!doc) return;
    showTransparentBorders = !showTransparentBorders;
    doc.setShowTransparentBorders(showTransparentBorders);

    const btn = document.getElementById('transparent-border-btn');
    if (btn) {
        btn.style.background = showTransparentBorders ? '#4A90D9' : '';
        btn.style.color = showTransparentBorders ? '#fff' : '';
    }

    renderCurrentPage();
}

// === 검색 ===

function buildSearchIndex() {
    searchTextCache = {};
    if (!doc) return;

    for (let p = 0; p < doc.pageCount(); p++) {
        try {
            const json = doc.getPageTextLayout(p);
            const data = JSON.parse(json);
            searchTextCache[p] = data.runs || [];
        } catch (e) {
            searchTextCache[p] = [];
        }
    }
}

function performSearch(query) {
    searchResults = [];
    searchIndex = -1;

    if (!query || !doc) {
        updateSearchUI();
        clearSearchHighlights();
        return;
    }

    const lowerQuery = query.toLowerCase();

    for (let page = 0; page < doc.pageCount(); page++) {
        const runs = searchTextCache[page] || [];
        for (let ri = 0; ri < runs.length; ri++) {
            const run = runs[ri];
            const lowerText = run.text.toLowerCase();
            let pos = 0;
            while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
                searchResults.push({
                    page,
                    runIndex: ri,
                    charStart: pos,
                    charEnd: pos + lowerQuery.length,
                });
                pos += 1;
            }
        }
    }

    if (searchResults.length > 0) {
        searchIndex = searchResults.findIndex(r => r.page >= currentPage);
        if (searchIndex < 0) searchIndex = 0;
        goToSearchResult(searchIndex);
    }

    updateSearchUI();
}

function goToSearchResult(index) {
    if (index < 0 || index >= searchResults.length) return;
    searchIndex = index;

    const result = searchResults[index];
    if (result.page !== currentPage) {
        currentPage = result.page;
        renderCurrentPage();
        updateNavButtons();
    } else {
        highlightSearchResults();
    }

    updateSearchUI();
}

function searchNext() {
    if (searchResults.length === 0) return;
    goToSearchResult((searchIndex + 1) % searchResults.length);
}

function searchPrev() {
    if (searchResults.length === 0) return;
    goToSearchResult((searchIndex - 1 + searchResults.length) % searchResults.length);
}

function highlightSearchResults() {
    if (!selectionRenderer) return;
    selectionRenderer.clear();

    const pageMatches = searchResults.filter(r => r.page === currentPage);
    const runs = searchTextCache[currentPage] || [];
    const ctx = selectionRenderer.ctx;

    for (let i = 0; i < pageMatches.length; i++) {
        const match = pageMatches[i];
        const run = runs[match.runIndex];
        if (!run || !run.charX) continue;

        const left = match.charStart < run.charX.length ? run.charX[match.charStart] : 0;
        const right = match.charEnd < run.charX.length ? run.charX[match.charEnd] : run.charX[run.charX.length - 1];

        const globalIdx = searchResults.indexOf(pageMatches[i]);
        ctx.fillStyle = globalIdx === searchIndex
            ? 'rgba(255, 152, 0, 0.5)'
            : 'rgba(255, 235, 59, 0.4)';

        ctx.fillRect(run.x + left, run.y, right - left, run.h);
    }

    // 검색 하이라이트 위에 캐럿 다시 그리기
    if (selectionController && selectionController.hasActiveCaret()) {
        selectionController._drawCaret();
    }
}

function clearSearchHighlights() {
    if (selectionRenderer) selectionRenderer.clear();
}

function updateSearchUI() {
    const infoSpan = document.getElementById('search-info');
    const prevBtn = document.getElementById('search-prev-btn');
    const nextBtn = document.getElementById('search-next-btn');
    const clearBtn = document.getElementById('search-clear-btn');

    if (searchResults.length > 0) {
        infoSpan.textContent = `${searchIndex + 1} / ${searchResults.length}`;
        infoSpan.classList.remove('hidden');
        clearBtn.classList.remove('hidden');
        prevBtn.disabled = false;
        nextBtn.disabled = false;
    } else {
        infoSpan.classList.add('hidden');
        clearBtn.classList.add('hidden');
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    }
}

// === 유틸리티 ===

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
    isLoading = show;
}

// === 표 컨텍스트 메뉴 ===

function setupTableContextMenu() {
    const menu = document.getElementById('table-context-menu');
    if (!menu) return;

    const canvas = document.getElementById('hwp-canvas');

    // 우클릭 시 컨텍스트 메뉴 표시
    canvas.addEventListener('contextmenu', (e) => {
        if (!doc || !selectedControl || selectedControl.type !== 'table') {
            hideTableContextMenu();
            return;
        }
        if (editMode !== 'cellSelected' && editMode !== 'objectSelected') {
            hideTableContextMenu();
            return;
        }

        e.preventDefault();

        // 우클릭 위치의 셀 히트테스트 (문서 좌표로 변환)
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / zoomLevel;
        const cy = (e.clientY - rect.top) / zoomLevel;
        const rightClickedCell = controlLayout.hitTestCell(cx, cy, selectedControl);

        // 셀 범위 선택 중이 아니면, 우클릭한 셀을 자동 선택
        if (rightClickedCell && selectedCells.length <= 1) {
            editMode = 'cellSelected';
            cellAnchor = rightClickedCell;
            selectedCells = [rightClickedCell];
            selectionRenderer.drawCellSelection(selectedCells);
        }

        // 셀 병합 활성화 조건: 2개 이상 셀 선택
        const mergeItem = menu.querySelector('[data-action="mergeCells"]');
        if (mergeItem) {
            if (selectedCells.length >= 2) {
                mergeItem.style.opacity = '1';
                mergeItem.style.pointerEvents = 'auto';
            } else {
                mergeItem.style.opacity = '0.4';
                mergeItem.style.pointerEvents = 'none';
            }
        }

        // 셀 나누기 활성화 조건: 우클릭한 셀이 병합 셀인 경우
        const splitItem = menu.querySelector('[data-action="splitCells"]');
        if (splitItem) {
            const targetCell = rightClickedCell || (selectedCells.length === 1 ? selectedCells[0] : null);
            const canSplit = targetCell
                && (targetCell.colSpan > 1 || targetCell.rowSpan > 1);
            if (canSplit) {
                splitItem.style.opacity = '1';
                splitItem.style.pointerEvents = 'auto';
            } else {
                splitItem.style.opacity = '0.4';
                splitItem.style.pointerEvents = 'none';
            }
        }

        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.classList.remove('hidden');
    });

    // 메뉴 항목 클릭 처리
    menu.addEventListener('click', (e) => {
        const li = e.target.closest('[data-action]');
        if (!li) return;

        const action = li.dataset.action;
        hideTableContextMenu();

        switch (action) {
            case 'insertRowAbove': handleInsertRow(false); break;
            case 'insertRowBelow': handleInsertRow(true); break;
            case 'insertColLeft': handleInsertColumn(false); break;
            case 'insertColRight': handleInsertColumn(true); break;
            case 'mergeCells': handleMergeCells(); break;
            case 'splitCells': handleSplitCells(); break;
        }
    });

    // 메뉴 항목 호버 효과
    menu.querySelectorAll('[data-action]').forEach(li => {
        li.addEventListener('mouseenter', () => {
            if (li.style.pointerEvents !== 'none') {
                li.style.backgroundColor = '#f0f0f0';
            }
        });
        li.addEventListener('mouseleave', () => {
            li.style.backgroundColor = '';
        });
    });

    // 다른 곳 클릭 시 메뉴 숨기기
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) {
            hideTableContextMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideTableContextMenu();
        }
    });
}

function hideTableContextMenu() {
    const menu = document.getElementById('table-context-menu');
    if (menu) menu.classList.add('hidden');
}

function handleInsertRow(below) {
    if (!doc || !selectedControl || selectedControl.type !== 'table') return;

    const cell = selectedCells.length > 0
        ? (below ? selectedCells[selectedCells.length - 1] : selectedCells[0])
        : null;
    const rowIdx = cell ? cell.row : 0;

    try {
        const resultJson = doc.insertTableRow(
            selectedControl.secIdx,
            selectedControl.paraIdx,
            selectedControl.controlIdx,
            rowIdx,
            below
        );
        const result = JSON.parse(resultJson);
        if (!result.ok) {
            console.error('행 삽입 실패:', resultJson);
            return;
        }
        renderCurrentPage();
        reselectTable();
    } catch (err) {
        console.error('행 삽입 오류:', err);
    }
}

function handleInsertColumn(right) {
    if (!doc || !selectedControl || selectedControl.type !== 'table') return;

    const cell = selectedCells.length > 0
        ? (right ? selectedCells[selectedCells.length - 1] : selectedCells[0])
        : null;
    const colIdx = cell ? cell.col : 0;

    try {
        const resultJson = doc.insertTableColumn(
            selectedControl.secIdx,
            selectedControl.paraIdx,
            selectedControl.controlIdx,
            colIdx,
            right
        );
        const result = JSON.parse(resultJson);
        if (!result.ok) {
            console.error('열 삽입 실패:', resultJson);
            return;
        }
        renderCurrentPage();
        reselectTable();
    } catch (err) {
        console.error('열 삽입 오류:', err);
    }
}

function handleMergeCells() {
    if (!doc || !selectedControl || selectedCells.length < 2) return;

    const minRow = Math.min(...selectedCells.map(c => c.row));
    const maxRow = Math.max(...selectedCells.map(c => c.row));
    const minCol = Math.min(...selectedCells.map(c => c.col));
    const maxCol = Math.max(...selectedCells.map(c => c.col));

    try {
        const resultJson = doc.mergeTableCells(
            selectedControl.secIdx,
            selectedControl.paraIdx,
            selectedControl.controlIdx,
            minRow, minCol, maxRow, maxCol
        );
        const result = JSON.parse(resultJson);
        if (!result.ok) {
            console.error('셀 병합 실패:', resultJson);
            return;
        }
        renderCurrentPage();
        reselectTable();
    } catch (err) {
        console.error('셀 병합 오류:', err);
    }
}

function handleSplitCells() {
    if (!doc || !selectedControl || selectedCells.length !== 1) return;
    const cell = selectedCells[0];
    if (cell.colSpan <= 1 && cell.rowSpan <= 1) return;

    try {
        const resultJson = doc.splitTableCell(
            selectedControl.secIdx,
            selectedControl.paraIdx,
            selectedControl.controlIdx,
            cell.row, cell.col
        );
        const result = JSON.parse(resultJson);
        if (!result.ok) {
            console.error('셀 나누기 실패:', resultJson);
            return;
        }
        renderCurrentPage();
        reselectTable();
    } catch (err) {
        console.error('셀 나누기 오류:', err);
    }
}

function reselectTable() {
    if (!selectedControl) return;

    const { secIdx, paraIdx, controlIdx } = selectedControl;

    // 레이아웃 재로드
    textLayout.loadPage(currentPage, doc);
    controlLayout.loadPage(currentPage, doc);

    // 같은 표 찾기
    const newCtrl = controlLayout.controls.find(c =>
        c.type === 'table' &&
        c.secIdx === secIdx &&
        c.paraIdx === paraIdx &&
        c.controlIdx === controlIdx
    );

    if (newCtrl) {
        selectedControl = newCtrl;
        editMode = 'objectSelected';
        selectedCells = [];
        cellAnchor = null;
        selectionRenderer.drawObjectSelection(newCtrl);
    } else {
        editMode = 'none';
        selectedControl = null;
        selectedCells = [];
        cellAnchor = null;
        if (selectionRenderer) selectionRenderer.clear();
    }
}

// 초기화 실행
initialize();
