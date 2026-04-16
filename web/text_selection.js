/**
 * 텍스트 선택 모듈
 *
 * TextLayoutManager: WASM에서 글자별 위치를 로드하고 hit-test를 수행
 * SelectionRenderer: 오버레이 캔버스에 선택 하이라이트를 그림
 * SelectionController: 마우스 이벤트를 처리하여 텍스트 선택/복사, 캐럿 표시
 */

/**
 * 텍스트 레이아웃 관리자
 *
 * WASM의 getPageTextLayout() 결과를 파싱하고
 * 페이지 좌표 → run/char 인덱스 변환(hit-test)을 수행한다.
 */
export class TextLayoutManager {
    constructor() {
        /** @type {Array<{text: string, x: number, y: number, w: number, h: number, charX: number[], secIdx?: number, paraIdx?: number, charStart?: number}>} */
        this.runs = [];
        this.loaded = false;
    }

    /**
     * 페이지의 텍스트 레이아웃을 WASM에서 로드한다.
     * @param {number} pageNum - 페이지 번호 (0-based)
     * @param {object} doc - HwpDocument WASM 인스턴스
     */
    loadPage(pageNum, doc) {
        this.runs = [];
        this.loaded = false;

        try {
            const json = doc.getPageTextLayout(pageNum);
            const data = JSON.parse(json);
            this.runs = data.runs || [];
            this.loaded = true;
        } catch (e) {
            console.error('텍스트 레이아웃 로드 실패:', e);
        }
    }

    /**
     * 페이지 좌표로 hit-test를 수행한다.
     * @param {number} x - 페이지 X 좌표 (px)
     * @param {number} y - 페이지 Y 좌표 (px)
     * @returns {{runIndex: number, charIndex: number} | null}
     */
    hitTest(x, y) {
        if (!this.loaded || this.runs.length === 0) return null;

        for (let ri = 0; ri < this.runs.length; ri++) {
            const run = this.runs[ri];

            // Y 범위 확인
            if (y < run.y || y > run.y + run.h) continue;

            // X 범위 확인
            if (x < run.x || x > run.x + run.w) continue;

            // charX 배열에서 글자 위치 결정
            const localX = x - run.x;
            const charX = run.charX;

            for (let ci = 0; ci < charX.length - 1; ci++) {
                const left = charX[ci];
                const right = charX[ci + 1];
                const mid = (left + right) / 2;

                if (localX < right) {
                    // 글자의 중앙보다 왼쪽이면 해당 글자, 오른쪽이면 다음 글자
                    return { runIndex: ri, charIndex: localX < mid ? ci : ci + 1 };
                }
            }

            // X가 run의 오른쪽 끝 부근이면 마지막 글자 뒤
            return { runIndex: ri, charIndex: charX.length - 1 };
        }

        // 같은 Y에 있는 가장 가까운 run 찾기
        let closestRun = -1;
        let closestDist = Infinity;

        for (let ri = 0; ri < this.runs.length; ri++) {
            const run = this.runs[ri];
            if (y < run.y || y > run.y + run.h) continue;

            const dist = x < run.x ? run.x - x : x - (run.x + run.w);
            if (dist < closestDist) {
                closestDist = dist;
                closestRun = ri;
            }
        }

        if (closestRun >= 0) {
            const run = this.runs[closestRun];
            if (x < run.x) {
                return { runIndex: closestRun, charIndex: 0 };
            } else {
                return { runIndex: closestRun, charIndex: run.charX.length - 1 };
            }
        }

        return null;
    }

    /**
     * 선택 범위의 사각형 목록을 반환한다.
     * @param {{runIndex: number, charIndex: number}} start
     * @param {{runIndex: number, charIndex: number}} end
     * @returns {Array<{x: number, y: number, w: number, h: number}>}
     */
    getSelectionRects(start, end) {
        if (!this.loaded) return [];

        // start가 end보다 뒤에 있으면 교환
        let s = start, e = end;
        if (s.runIndex > e.runIndex ||
            (s.runIndex === e.runIndex && s.charIndex > e.charIndex)) {
            [s, e] = [e, s];
        }

        const rects = [];

        for (let ri = s.runIndex; ri <= e.runIndex; ri++) {
            const run = this.runs[ri];
            if (!run) continue;

            const charX = run.charX;
            const startCI = (ri === s.runIndex) ? s.charIndex : 0;
            const endCI = (ri === e.runIndex) ? e.charIndex : charX.length - 1;

            if (startCI >= endCI) continue;

            const left = charX[startCI] || 0;
            const right = charX[endCI] || charX[charX.length - 1];

            rects.push({
                x: run.x + left,
                y: run.y,
                w: right - left,
                h: run.h,
            });
        }

        return rects;
    }

    /**
     * 선택된 텍스트를 반환한다.
     * @param {{runIndex: number, charIndex: number}} start
     * @param {{runIndex: number, charIndex: number}} end
     * @returns {string}
     */
    getSelectedText(start, end) {
        if (!this.loaded) return '';

        let s = start, e = end;
        if (s.runIndex > e.runIndex ||
            (s.runIndex === e.runIndex && s.charIndex > e.charIndex)) {
            [s, e] = [e, s];
        }

        const parts = [];
        let prevRunY = -1;

        for (let ri = s.runIndex; ri <= e.runIndex; ri++) {
            const run = this.runs[ri];
            if (!run) continue;

            // 줄이 바뀌면 개행 삽입
            if (prevRunY >= 0 && Math.abs(run.y - prevRunY) > 1) {
                parts.push('\n');
            }
            prevRunY = run.y;

            const chars = [...run.text];
            const startCI = (ri === s.runIndex) ? s.charIndex : 0;
            const endCI = (ri === e.runIndex) ? e.charIndex : chars.length;

            parts.push(chars.slice(startCI, endCI).join(''));
        }

        return parts.join('');
    }
}

/**
 * 컨트롤 레이아웃 관리자
 *
 * WASM의 getPageControlLayout() 결과를 파싱하고
 * 표/이미지/도형 영역의 hit-test를 수행한다.
 */
export class ControlLayoutManager {
    constructor() {
        /** @type {Array<{type: string, x: number, y: number, w: number, h: number, secIdx?: number, paraIdx?: number, controlIdx?: number, rowCount?: number, colCount?: number, cells?: Array}>} */
        this.controls = [];
        this.loaded = false;
    }

    /**
     * 페이지의 컨트롤 레이아웃을 WASM에서 로드한다.
     * @param {number} pageNum - 페이지 번호 (0-based)
     * @param {object} doc - HwpDocument WASM 인스턴스
     */
    loadPage(pageNum, doc) {
        this.controls = [];
        this.loaded = false;

        try {
            const json = doc.getPageControlLayout(pageNum);
            const data = JSON.parse(json);
            this.controls = data.controls || [];
            this.loaded = true;
        } catch (e) {
            console.error('컨트롤 레이아웃 로드 실패:', e);
        }
    }

    /**
     * 페이지 좌표로 컨트롤 hit-test를 수행한다.
     * @param {number} x - 페이지 X 좌표 (px)
     * @param {number} y - 페이지 Y 좌표 (px)
     * @returns {{type: string, x: number, y: number, w: number, h: number, index: number} | null}
     */
    hitTestControl(x, y) {
        if (!this.loaded) return null;

        for (let i = 0; i < this.controls.length; i++) {
            const ctrl = this.controls[i];
            if (x >= ctrl.x && x <= ctrl.x + ctrl.w &&
                y >= ctrl.y && y <= ctrl.y + ctrl.h) {
                return { ...ctrl, index: i };
            }
        }
        return null;
    }

    /**
     * 특정 표 컨트롤 내에서 셀 hit-test를 수행한다.
     * @param {number} x - 페이지 X 좌표 (px)
     * @param {number} y - 페이지 Y 좌표 (px)
     * @param {object} control - hitTestControl 결과 (표 타입)
     * @returns {{x: number, y: number, w: number, h: number, row: number, col: number, rowSpan: number, colSpan: number, cellIdx: number} | null}
     */
    hitTestCell(x, y, control) {
        if (!control || !control.cells) return null;

        for (let i = 0; i < control.cells.length; i++) {
            const cell = control.cells[i];
            if (x >= cell.x && x <= cell.x + cell.w &&
                y >= cell.y && y <= cell.y + cell.h) {
                return { ...cell };
            }
        }
        return null;
    }
}

/**
 * 선택 하이라이트 렌더러
 *
 * 오버레이 캔버스에 반투명 파란색 선택 영역을 그린다.
 */
export class SelectionRenderer {
    /**
     * @param {HTMLCanvasElement} overlayCanvas - 오버레이 캔버스
     */
    constructor(overlayCanvas) {
        this.canvas = overlayCanvas;
        this.ctx = overlayCanvas.getContext('2d');
        this._zoom = 1.0;
    }

    /** 줌 스케일 설정 */
    setZoomScale(zoom) {
        this._zoom = zoom;
    }

    /** 오버레이를 초기화한다. */
    clear() {
        // transform 리셋 후 전체 클리어
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 줌 스케일 재적용 (문서 좌표 → 캔버스 픽셀 변환)
        this.ctx.setTransform(this._zoom, 0, 0, this._zoom, 0, 0);
    }

    /**
     * 선택 사각형들을 그린다.
     * @param {Array<{x: number, y: number, w: number, h: number}>} rects
     */
    drawSelection(rects) {
        this.clear();
        this.ctx.fillStyle = 'rgba(51, 102, 204, 0.3)';

        for (const r of rects) {
            this.ctx.fillRect(r.x, r.y, r.w, r.h);
        }
    }

    /**
     * 객체 선택 시각화: 파란색 점선 테두리 + 8개 리사이즈 핸들
     * @param {{x: number, y: number, w: number, h: number}} ctrl
     */
    drawObjectSelection(ctrl) {
        this.clear();
        const ctx = this.ctx;
        const { x, y, w, h } = ctrl;

        // 파란색 점선 테두리
        ctx.strokeStyle = '#1565C0';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        // 8개 리사이즈 핸들 (표시만)
        const hs = 3;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#1565C0';
        ctx.lineWidth = 1;

        const handles = [
            [x, y], [x + w / 2, y], [x + w, y],
            [x + w, y + h / 2],
            [x + w, y + h], [x + w / 2, y + h], [x, y + h],
            [x, y + h / 2],
        ];

        for (const [hx, hy] of handles) {
            ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
            ctx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
        }
    }

    /**
     * 셀 선택 시각화: 반투명 파란색 배경 + 파란색 실선 테두리
     * @param {Array<{x: number, y: number, w: number, h: number}>} cells
     */
    drawCellSelection(cells) {
        this.clear();
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 100, 255, 0.2)';
        for (const cell of cells) {
            ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
        }

        ctx.strokeStyle = '#1565C0';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        for (const cell of cells) {
            ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        }
    }
}

/**
 * 텍스트 선택 컨트롤러
 *
 * 마우스 이벤트를 처리하여 텍스트 선택, 하이라이트 표시, 클립보드 복사를 수행한다.
 * 캐럿(깜빡이는 커서)을 표시하고 키보드로 이동할 수 있다.
 */
export class SelectionController {
    /**
     * @param {HTMLCanvasElement} mainCanvas - 메인 렌더링 캔버스
     * @param {TextLayoutManager} layoutManager - 텍스트 레이아웃 관리자
     * @param {SelectionRenderer} selectionRenderer - 선택 렌더러
     * @param {ControlLayoutManager} [controlLayoutManager] - 컨트롤 레이아웃 관리자 (옵션)
     */
    constructor(mainCanvas, layoutManager, selectionRenderer, controlLayoutManager) {
        this.mainCanvas = mainCanvas;
        this.layout = layoutManager;
        this.renderer = selectionRenderer;
        this.controlLayout = controlLayoutManager || null;
        this._zoom = 1.0;

        /** @type {{runIndex: number, charIndex: number} | null} */
        this.anchor = null;
        /** @type {{runIndex: number, charIndex: number} | null} */
        this.focus = null;
        this.isDragging = false;

        // 캐럿 상태
        /** @type {{runIndex: number, charIndex: number} | null} */
        this.caretPos = null;
        this.caretVisible = false;
        this.caretTimer = null;
        this._savedCaretX = null;  // 연속 상하 이동 시 원래 X 좌표 유지

        // 컨트롤 선택 콜백
        /** @type {((ctrl: object, x: number, y: number) => void) | null} */
        this.onControlSelect = null;
        /** @type {(() => void) | null} */
        this.onControlDeselect = null;
        /** @type {(() => void) | null} */
        this.onTextClick = null;
        /** @type {(() => void) | null} 캐럿 위치 변경 시 호출 */
        this.onCaretChange = null;

        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onDblClick = this._onDblClick.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);

        this._attach();
    }

    /** 이벤트 리스너 연결 */
    _attach() {
        this.mainCanvas.addEventListener('mousedown', this._onMouseDown);
        this.mainCanvas.addEventListener('mousemove', this._onMouseMove);
        this.mainCanvas.addEventListener('mouseup', this._onMouseUp);
        this.mainCanvas.addEventListener('dblclick', this._onDblClick);
        document.addEventListener('keydown', this._onKeyDown);
        this.mainCanvas.style.cursor = 'text';
    }

    /** 이벤트 리스너 해제 */
    destroy() {
        this._stopCaretBlink();
        this.mainCanvas.removeEventListener('mousedown', this._onMouseDown);
        this.mainCanvas.removeEventListener('mousemove', this._onMouseMove);
        this.mainCanvas.removeEventListener('mouseup', this._onMouseUp);
        this.mainCanvas.removeEventListener('dblclick', this._onDblClick);
        document.removeEventListener('keydown', this._onKeyDown);
        this.mainCanvas.style.cursor = '';
    }

    /** 캐럿이 활성화되어 있는지 확인 */
    hasActiveCaret() {
        return this.caretPos !== null;
    }

    /** 줌 스케일 설정 */
    setZoomScale(zoom) {
        this._zoom = zoom;
    }

    /** 선택 초기화 */
    clearSelection() {
        this.anchor = null;
        this.focus = null;
        this.isDragging = false;
        this._stopCaretBlink();
        this.caretPos = null;
        this.renderer.clear();
    }

    // === 캐럿 렌더링 ===

    /** 캐럿을 그린다 */
    _drawCaret() {
        if (!this.caretPos || !this.caretVisible) return;

        const run = this.layout.runs[this.caretPos.runIndex];
        if (!run || !run.charX) return;

        const charIdx = Math.min(this.caretPos.charIndex, run.charX.length - 1);
        const xPos = run.x + (run.charX[charIdx] || 0);

        const ctx = this.renderer.ctx;
        ctx.fillStyle = '#000';
        // 캐럿 폭: 줌에 관계없이 화면에서 최소 1px 이상
        const caretW = Math.max(1, 2 / this._zoom);
        ctx.fillRect(xPos, run.y, caretW, run.h);
    }

    /** 캐럿 깜빡임 시작 */
    _startCaretBlink() {
        this._stopCaretBlink();
        this.caretVisible = true;
        this.renderer.clear();
        this._drawCaret();

        this.caretTimer = setInterval(() => {
            this.caretVisible = !this.caretVisible;
            this.renderer.clear();
            if (this.caretVisible) {
                this._drawCaret();
            }
        }, 500);
    }

    /** 캐럿 깜빡임 중지 */
    _stopCaretBlink() {
        if (this.caretTimer !== null) {
            clearInterval(this.caretTimer);
            this.caretTimer = null;
        }
        this.caretVisible = false;
    }

    /** 캐럿 위치 설정 후 깜빡임 재시작 */
    _setCaretPos(pos) {
        this.caretPos = pos;
        this.anchor = pos;
        this.focus = pos;
        this._startCaretBlink();
        if (this.onCaretChange) this.onCaretChange();
    }

    // === 캐럿 이동 ===

    /** 캐럿을 왼쪽으로 한 글자 이동 */
    _moveCaretLeft() {
        if (!this.caretPos) return null;
        const { runIndex, charIndex } = this.caretPos;

        if (charIndex > 0) {
            return { runIndex, charIndex: charIndex - 1 };
        }
        // 이전 run의 끝으로
        if (runIndex > 0) {
            const prevRun = this.layout.runs[runIndex - 1];
            return { runIndex: runIndex - 1, charIndex: prevRun.charX.length - 1 };
        }
        return this.caretPos;
    }

    /** 캐럿을 오른쪽으로 한 글자 이동 */
    _moveCaretRight() {
        if (!this.caretPos) return null;
        const { runIndex, charIndex } = this.caretPos;
        const run = this.layout.runs[runIndex];

        if (charIndex < run.charX.length - 1) {
            return { runIndex, charIndex: charIndex + 1 };
        }
        // 다음 run의 시작으로
        if (runIndex < this.layout.runs.length - 1) {
            return { runIndex: runIndex + 1, charIndex: 0 };
        }
        return this.caretPos;
    }

    /** 캐럿을 줄 시작으로 이동 */
    _moveCaretHome() {
        if (!this.caretPos) return null;
        const curRun = this.layout.runs[this.caretPos.runIndex];
        const curY = curRun.y;

        // 같은 Y에 있는 첫 run 찾기
        for (let ri = 0; ri < this.layout.runs.length; ri++) {
            if (Math.abs(this.layout.runs[ri].y - curY) <= 1) {
                return { runIndex: ri, charIndex: 0 };
            }
        }
        return this.caretPos;
    }

    /** 캐럿을 줄 끝으로 이동 */
    _moveCaretEnd() {
        if (!this.caretPos) return null;
        const curRun = this.layout.runs[this.caretPos.runIndex];
        const curY = curRun.y;

        // 같은 Y에 있는 마지막 run 찾기
        let lastRi = this.caretPos.runIndex;
        for (let ri = 0; ri < this.layout.runs.length; ri++) {
            if (Math.abs(this.layout.runs[ri].y - curY) <= 1) {
                lastRi = ri;
            }
        }
        const lastRun = this.layout.runs[lastRi];
        return { runIndex: lastRi, charIndex: lastRun.charX.length - 1 };
    }

    /**
     * runs 배열을 Y 좌표로 줄 그룹화한다.
     * @returns {Array<{y: number, runs: Array<{ri: number, run: object}>}>}
     */
    _getLineGroups() {
        const lines = [];
        for (let ri = 0; ri < this.layout.runs.length; ri++) {
            const run = this.layout.runs[ri];
            const existing = lines.find(l => Math.abs(l.y - run.y) <= 1);
            if (existing) {
                existing.runs.push({ ri, run });
            } else {
                lines.push({ y: run.y, runs: [{ ri, run }] });
            }
        }
        lines.sort((a, b) => a.y - b.y);
        return lines;
    }

    /**
     * 대상 줄에서 targetX에 가장 가까운 문자 위치를 찾는다.
     * @param {{y: number, runs: Array<{ri: number, run: object}>}} lineGroup
     * @param {number} targetX - 절대 X 좌표 (px)
     * @returns {{runIndex: number, charIndex: number} | null}
     */
    _findClosestCharInLine(lineGroup, targetX) {
        let bestDist = Infinity;
        let bestPos = null;
        for (const { ri, run } of lineGroup.runs) {
            for (let ci = 0; ci < run.charX.length; ci++) {
                const dist = Math.abs(run.x + run.charX[ci] - targetX);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestPos = { runIndex: ri, charIndex: ci };
                }
            }
        }
        return bestPos;
    }

    /** 캐럿을 위쪽 줄로 이동 */
    _moveCaretUp() {
        if (!this.caretPos) return null;
        const curRun = this.layout.runs[this.caretPos.runIndex];
        const targetX = this._savedCaretX !== null ? this._savedCaretX
            : curRun.x + curRun.charX[this.caretPos.charIndex];

        const lines = this._getLineGroups();
        const curLineIdx = lines.findIndex(l => Math.abs(l.y - curRun.y) <= 1);
        if (curLineIdx <= 0) return this.caretPos;  // 이미 첫 줄

        return this._findClosestCharInLine(lines[curLineIdx - 1], targetX);
    }

    /** 캐럿을 아래쪽 줄로 이동 */
    _moveCaretDown() {
        if (!this.caretPos) return null;
        const curRun = this.layout.runs[this.caretPos.runIndex];
        const targetX = this._savedCaretX !== null ? this._savedCaretX
            : curRun.x + curRun.charX[this.caretPos.charIndex];

        const lines = this._getLineGroups();
        const curLineIdx = lines.findIndex(l => Math.abs(l.y - curRun.y) <= 1);
        if (curLineIdx < 0 || curLineIdx >= lines.length - 1) return this.caretPos;  // 이미 마지막 줄

        return this._findClosestCharInLine(lines[curLineIdx + 1], targetX);
    }

    // === 마우스 이벤트 ===

    /**
     * 문서 좌표계로 변환 (줌 스케일 보정)
     * @param {MouseEvent} e
     * @returns {{x: number, y: number}}
     */
    _toPageCoords(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        // screen → document: 캔버스 backing/CSS 비율로 정확한 줌 레벨 계산
        // backingRatio = canvas.width / rect.width = renderDpr (슈퍼샘플링 포함)
        // zoomOnly = _zoom / backingRatio = zoomLevel (사용자 줌)
        const backingRatio = this.mainCanvas.width / rect.width;
        const zoomOnly = (this._zoom || 1.0) / backingRatio;
        return {
            x: (e.clientX - rect.left) / zoomOnly,
            y: (e.clientY - rect.top) / zoomOnly,
        };
    }

    /** @param {MouseEvent} e */
    _onMouseDown(e) {
        if (e.button !== 0) return; // 좌클릭만

        const { x, y } = this._toPageCoords(e);
        const hit = this.layout.hitTest(x, y);

        if (hit) {
            // 콜백이 true 반환 시 텍스트 편집 진입 취소 (셀 범위 확장 등)
            if (this.onTextClick && this.onTextClick(x, y, e.shiftKey)) {
                return;
            }
            // TextRun 히트 → 텍스트 편집 (기존 동작)
            this.anchor = hit;
            this.focus = hit;
            this.isDragging = true;
            this.caretPos = { ...hit };
            this.caretVisible = true;
            this._startCaretBlink();
            if (this.onCaretChange) this.onCaretChange();
        } else if (this.controlLayout) {
            // TextRun 미히트 → 컨트롤 영역 확인
            const ctrl = this.controlLayout.hitTestControl(x, y);
            if (ctrl) {
                // 컨트롤 히트 → 객체 선택 콜백
                this.anchor = null;
                this.focus = null;
                this.isDragging = false;
                this._stopCaretBlink();
                this.caretPos = null;
                this.renderer.clear();
                if (this.onControlSelect) {
                    this.onControlSelect(ctrl, x, y);
                }
            } else {
                // 아무것도 히트 안 됨 → 선택 해제
                this.anchor = null;
                this.focus = null;
                this.isDragging = false;
                this._stopCaretBlink();
                this.caretPos = null;
                this.renderer.clear();
                if (this.onControlDeselect) {
                    this.onControlDeselect();
                }
            }
        } else {
            // controlLayout 미설정 시 기존 동작
            this.anchor = hit;
            this.focus = hit;
            this.isDragging = true;
            this._stopCaretBlink();
            this.caretPos = null;
            this.renderer.clear();
        }
    }

    /** @param {MouseEvent} e */
    _onMouseMove(e) {
        if (!this.isDragging || !this.anchor) return;

        const { x, y } = this._toPageCoords(e);
        const hit = this.layout.hitTest(x, y);
        if (!hit) return;

        this.focus = hit;

        // 선택 범위가 생기면 캐럿 숨기고 하이라이트 표시
        if (this.anchor.runIndex !== hit.runIndex || this.anchor.charIndex !== hit.charIndex) {
            this._stopCaretBlink();
            this.caretPos = null;
            this._updateHighlight();
        }
    }

    /** @param {MouseEvent} e */
    _onMouseUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // 선택이 없으면 (anchor === focus) 캐럿 표시
        if (this.anchor && this.focus &&
            this.anchor.runIndex === this.focus.runIndex &&
            this.anchor.charIndex === this.focus.charIndex) {
            this.caretPos = { ...this.anchor };
            this._startCaretBlink();
        }
    }

    /** @param {MouseEvent} e */
    _onDblClick(e) {
        const { x, y } = this._toPageCoords(e);
        const hit = this.layout.hitTest(x, y);
        if (!hit) return;

        // 더블클릭 → 단어 선택 (캐럿 숨김)
        const run = this.layout.runs[hit.runIndex];
        if (!run) return;

        const chars = [...run.text];
        let start = hit.charIndex;
        let end = hit.charIndex;

        // 공백이 아닌 연속 문자를 단어로 간주
        while (start > 0 && chars[start - 1] !== ' ') start--;
        while (end < chars.length && chars[end] !== ' ') end++;

        this.anchor = { runIndex: hit.runIndex, charIndex: start };
        this.focus = { runIndex: hit.runIndex, charIndex: end };
        this._stopCaretBlink();
        this.caretPos = null;
        this._updateHighlight();
    }

    /** @param {KeyboardEvent} e */
    _onKeyDown(e) {
        // IME 조합 중에는 키 입력을 방해하지 않음
        if (e.isComposing) return;

        // Ctrl+C / Cmd+C
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            if (!this.anchor || !this.focus) return;

            // 외부 복사 핸들러가 설정되어 있으면 위임 (editor.js가 HTML+텍스트 클립보드 처리)
            if (this.onCopy) {
                this.onCopy(e);
                return;
            }

            const text = this.layout.getSelectedText(this.anchor, this.focus);
            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    console.log('텍스트 복사됨:', text.length, '글자');
                }).catch(err => {
                    console.error('클립보드 복사 실패:', err);
                });
                e.preventDefault();
            }
        }

        // Ctrl+A / Cmd+A — 전체 선택
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            if (this.layout.runs.length === 0) return;

            this.anchor = { runIndex: 0, charIndex: 0 };
            const lastRun = this.layout.runs[this.layout.runs.length - 1];
            this.focus = {
                runIndex: this.layout.runs.length - 1,
                charIndex: [...lastRun.text].length,
            };
            this._stopCaretBlink();
            this.caretPos = null;
            this._updateHighlight();
            e.preventDefault();
        }

        // 캐럿 이동 (Arrow, Home, End)
        if (!this.caretPos && !this.anchor) return;

        let newPos = null;
        const isShift = e.shiftKey;

        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
            if (!isShift && this.anchor && this.focus && !this._isCollapsed()) {
                newPos = this._getSelectionStart();
            } else if (this.caretPos) {
                newPos = this._moveCaretLeft();
            } else if (this.focus) {
                newPos = { ...this.focus };
            }
            this._savedCaretX = null;
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
            if (!isShift && this.anchor && this.focus && !this._isCollapsed()) {
                newPos = this._getSelectionEnd();
            } else if (this.caretPos) {
                newPos = this._moveCaretRight();
            } else if (this.focus) {
                newPos = { ...this.focus };
            }
            this._savedCaretX = null;
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            if (this.caretPos) {
                if (this._savedCaretX === null) {
                    const run = this.layout.runs[this.caretPos.runIndex];
                    this._savedCaretX = run.x + run.charX[this.caretPos.charIndex];
                }
                newPos = this._moveCaretUp();
            }
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            if (this.caretPos) {
                if (this._savedCaretX === null) {
                    const run = this.layout.runs[this.caretPos.runIndex];
                    this._savedCaretX = run.x + run.charX[this.caretPos.charIndex];
                }
                newPos = this._moveCaretDown();
            }
            e.preventDefault();
        } else if (e.key === 'Home') {
            if (this.caretPos) {
                newPos = this._moveCaretHome();
            }
            this._savedCaretX = null;
            e.preventDefault();
        } else if (e.key === 'End') {
            if (this.caretPos) {
                newPos = this._moveCaretEnd();
            }
            this._savedCaretX = null;
            e.preventDefault();
        }

        if (!newPos) return;

        if (isShift) {
            // Shift+Arrow: 선택 확장
            if (!this.anchor) this.anchor = this.caretPos ? { ...this.caretPos } : null;
            this.focus = newPos;
            this._stopCaretBlink();
            this.caretPos = null;
            this._updateHighlight();
        } else {
            // 캐럿 이동
            this._setCaretPos(newPos);
        }
    }

    /** 선택이 축소된 상태(anchor === focus)인지 확인 */
    _isCollapsed() {
        if (!this.anchor || !this.focus) return true;
        return this.anchor.runIndex === this.focus.runIndex &&
               this.anchor.charIndex === this.focus.charIndex;
    }

    /** 선택 범위의 시작 위치 (더 앞쪽) */
    _getSelectionStart() {
        if (!this.anchor || !this.focus) return null;
        if (this.anchor.runIndex < this.focus.runIndex ||
            (this.anchor.runIndex === this.focus.runIndex && this.anchor.charIndex <= this.focus.charIndex)) {
            return { ...this.anchor };
        }
        return { ...this.focus };
    }

    /** 선택 범위의 끝 위치 (더 뒤쪽) */
    _getSelectionEnd() {
        if (!this.anchor || !this.focus) return null;
        if (this.anchor.runIndex > this.focus.runIndex ||
            (this.anchor.runIndex === this.focus.runIndex && this.anchor.charIndex >= this.focus.charIndex)) {
            return { ...this.anchor };
        }
        return { ...this.focus };
    }

    // === 문서 좌표 변환 (편집용) ===

    /**
     * 현재 캐럿 위치를 문서 좌표로 변환한다.
     * 표 셀 내부인 경우 셀 식별 정보도 포함된다.
     * @returns {{secIdx: number, paraIdx: number, charOffset: number, parentParaIdx?: number, controlIdx?: number, cellIdx?: number, cellParaIdx?: number} | null}
     */
    getDocumentPos() {
        if (!this.caretPos) return null;
        const run = this.layout.runs[this.caretPos.runIndex];
        if (!run || run.secIdx === undefined || run.paraIdx === undefined || run.charStart === undefined) {
            return null;
        }
        const pos = {
            secIdx: run.secIdx,
            paraIdx: run.paraIdx,
            charOffset: run.charStart + this.caretPos.charIndex,
        };
        // 표 셀 내부 run인 경우 셀 식별 정보 추가
        if (run.parentParaIdx !== undefined && run.controlIdx !== undefined &&
            run.cellIdx !== undefined && run.cellParaIdx !== undefined) {
            pos.parentParaIdx = run.parentParaIdx;
            pos.controlIdx = run.controlIdx;
            pos.cellIdx = run.cellIdx;
            pos.cellParaIdx = run.cellParaIdx;
        }
        return pos;
    }

    /**
     * 문서 좌표로부터 캐럿을 복원한다 (재렌더링 후 사용).
     * 셀 내부 문단인 경우 셀 식별 정보로 매칭한다.
     * @param {number} secIdx - 구역 인덱스
     * @param {number} paraIdx - 문단 인덱스
     * @param {number} charOffset - 문단 내 문자 오프셋
     * @param {object} [cellCtx] - 셀 컨텍스트 {parentParaIdx, controlIdx, cellIdx, cellParaIdx}
     * @returns {boolean} 성공 여부
     */
    setCaretByDocPos(secIdx, paraIdx, charOffset, cellCtx) {
        for (let ri = 0; ri < this.layout.runs.length; ri++) {
            const run = this.layout.runs[ri];
            if (run.secIdx !== secIdx || run.charStart === undefined) continue;

            // 셀 컨텍스트 매칭
            if (cellCtx) {
                if (run.parentParaIdx !== cellCtx.parentParaIdx ||
                    run.controlIdx !== cellCtx.controlIdx ||
                    run.cellIdx !== cellCtx.cellIdx ||
                    run.cellParaIdx !== cellCtx.cellParaIdx) continue;
            } else {
                // 본문 문단: 셀 정보가 없는 run만 매칭
                if (run.parentParaIdx !== undefined) continue;
                if (run.paraIdx !== paraIdx) continue;
            }

            const runCharCount = [...run.text].length;
            const runEnd = run.charStart + runCharCount;
            if (charOffset >= run.charStart && charOffset <= runEnd) {
                this._setCaretPos({
                    runIndex: ri,
                    charIndex: charOffset - run.charStart,
                });
                return true;
            }
        }
        return false;
    }

    /**
     * 선택 범위를 문서 좌표로 변환한다.
     * 선택이 없거나 축소 상태면 null을 반환한다.
     * 같은 문단 내 선택 및 다중 문단 선택을 지원한다.
     * @returns {{secIdx: number, paraIdx: number, startParaIdx: number, startCharOffset: number, endParaIdx: number, endCharOffset: number, parentParaIdx?: number, controlIdx?: number, cellIdx?: number, cellParaIdx?: number, startCellParaIdx?: number, endCellParaIdx?: number} | null}
     */
    getSelectionDocRange() {
        if (!this.anchor || !this.focus || this._isCollapsed()) return null;

        const start = this._getSelectionStart();
        const end = this._getSelectionEnd();
        if (!start || !end) return null;

        const startRun = this.layout.runs[start.runIndex];
        const endRun = this.layout.runs[end.runIndex];
        if (!startRun || !endRun) return null;
        if (startRun.secIdx === undefined || startRun.charStart === undefined) return null;
        if (endRun.secIdx === undefined || endRun.charStart === undefined) return null;

        // 다른 구역 간 선택은 미지원
        if (startRun.secIdx !== endRun.secIdx) return null;

        // 셀 컨텍스트가 다르면 지원하지 않음 (다른 셀 간 선택 미지원)
        if (startRun.cellIdx !== endRun.cellIdx) return null;

        const startParaIdx = startRun.cellParaIdx !== undefined ? startRun.cellParaIdx : startRun.paraIdx;
        const endParaIdx = endRun.cellParaIdx !== undefined ? endRun.cellParaIdx : endRun.paraIdx;

        const range = {
            secIdx: startRun.secIdx,
            paraIdx: startRun.paraIdx, // 하위 호환: 시작 문단
            startParaIdx: startParaIdx,
            endParaIdx: endParaIdx,
            startCharOffset: startRun.charStart + start.charIndex,
            endCharOffset: endRun.charStart + end.charIndex,
        };

        // 표 셀 내부 선택인 경우 셀 식별 정보 추가
        if (startRun.parentParaIdx !== undefined && startRun.controlIdx !== undefined &&
            startRun.cellIdx !== undefined && startRun.cellParaIdx !== undefined) {
            range.parentParaIdx = startRun.parentParaIdx;
            range.controlIdx = startRun.controlIdx;
            range.cellIdx = startRun.cellIdx;
            range.cellParaIdx = startRun.cellParaIdx;
            range.startCellParaIdx = startRun.cellParaIdx;
            range.endCellParaIdx = endRun.cellParaIdx;
        }

        return range;
    }

    /** 선택 하이라이트 업데이트 */
    _updateHighlight() {
        if (!this.anchor || !this.focus) return;
        const rects = this.layout.getSelectionRects(this.anchor, this.focus);
        this.renderer.drawSelection(rects);
    }
}
