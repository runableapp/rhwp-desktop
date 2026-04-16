/**
 * rhwp 테스트 페이지 JavaScript
 *
 * WASM 모듈을 로드하고 HWP 파일을 렌더링한다.
 */

import init, { HwpDocument, version } from '../pkg/rhwp.js';

// 전역 상태
let doc = null;
let currentPage = 0;
let isLoading = false;

/**
 * 초기화
 */
async function initialize() {
    try {
        showLoading(true);
        await init();

        // 버전 정보 표시
        const versionInfo = document.getElementById('version-info');
        if (versionInfo) {
            versionInfo.textContent = `v${version()}`;
        }

        setupEventListeners();
        console.log('rhwp WASM 모듈 로드 완료');
    } catch (error) {
        console.error('WASM 초기화 실패:', error);
        alert('WASM 모듈 로드에 실패했습니다.');
    } finally {
        showLoading(false);
    }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    const fileInput = document.getElementById('file-input');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    fileInput.addEventListener('change', handleFileUpload);
    prevBtn.addEventListener('click', prevPage);
    nextBtn.addEventListener('click', nextPage);

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        if (!doc) return;
        if (e.key === 'ArrowLeft') prevPage();
        if (e.key === 'ArrowRight') nextPage();
    });
}

/**
 * 파일 업로드 처리
 */
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

        // 기존 문서 해제
        if (doc) {
            doc.free();
        }

        const startTime = performance.now();
        doc = new HwpDocument(data);
        doc.convertToEditable(); // 배포용(읽기전용) 문서 자동 변환
        const parseTime = performance.now() - startTime;

        currentPage = 0;

        displayDocInfo(file.name, parseTime);
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

/** HTML 이스케이프 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * 문서 정보 표시
 */
function displayDocInfo(fileName, parseTime) {
    const info = JSON.parse(doc.getDocumentInfo());
    const panel = document.getElementById('info-panel');

    panel.innerHTML = `
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
                <span class="label">파싱 시간:</span>
                <span class="value">${parseTime.toFixed(2)}ms</span>
            </div>
            <div class="info-item">
                <span class="label">암호화:</span>
                <span class="value">${info.encrypted ? '예' : '아니오'}</span>
            </div>
        </div>
    `;
}

/**
 * 현재 페이지 렌더링
 */
function renderCurrentPage() {
    if (!doc) return;

    const startTime = performance.now();

    // SVG 렌더링
    try {
        const svg = doc.renderPageSvg(currentPage);
        const svgContainer = document.getElementById('svg-container');
        svgContainer.innerHTML = svg;
    } catch (error) {
        console.error('SVG 렌더링 실패:', error);
        document.getElementById('svg-container').innerHTML =
            `<p class="error">SVG 렌더링 오류: ${error}</p>`;
    }

    // Canvas 렌더링
    try {
        const canvasContainer = document.getElementById('canvas-container');
        const canvas = document.getElementById('hwp-canvas');

        // Canvas 표시
        canvasContainer.classList.add('loaded');
        canvas.classList.remove('hidden');

        doc.renderPageToCanvas(currentPage, canvas);

        // 비동기 이미지 로드 대응: data URL 이미지가 첫 렌더링 시
        // 아직 디코딩되지 않았을 수 있으므로, 짧은 지연 후 재렌더링하여
        // 캐시된 이미지를 정상 z-order로 그린다.
        const pageAtRender = currentPage;
        if (window._canvasReRenderTimer) clearTimeout(window._canvasReRenderTimer);
        window._canvasReRenderTimer = setTimeout(() => {
            if (doc && currentPage === pageAtRender) {
                doc.renderPageToCanvas(currentPage, canvas);
            }
        }, 200);
    } catch (error) {
        console.error('Canvas 렌더링 실패:', error);
        const container = document.getElementById('canvas-container');
        container.innerHTML = `<p class="error">Canvas 렌더링 오류: ${error}</p>`;
    }

    const renderTime = performance.now() - startTime;

    // 페이지 정보 업데이트
    document.getElementById('page-info').textContent =
        `${currentPage + 1} / ${doc.pageCount()}`;

    console.log(`페이지 ${currentPage + 1} 렌더링 완료 (${renderTime.toFixed(2)}ms)`);
}

/**
 * 이전 페이지
 */
function prevPage() {
    if (!doc || currentPage <= 0) return;
    currentPage--;
    renderCurrentPage();
    updateNavButtons();
}

/**
 * 다음 페이지
 */
function nextPage() {
    if (!doc || currentPage >= doc.pageCount() - 1) return;
    currentPage++;
    renderCurrentPage();
    updateNavButtons();
}

/**
 * 네비게이션 버튼 상태 업데이트
 */
function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    prevBtn.disabled = !doc || currentPage <= 0;
    nextBtn.disabled = !doc || currentPage >= doc.pageCount() - 1;
}

/**
 * 로딩 표시
 */
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
    isLoading = show;
}

// 초기화 실행
initialize();
