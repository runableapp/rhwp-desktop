/**
 * 서식 툴바 컨트롤러
 *
 * 캐럿/선택 위치의 글자·문단 속성을 서식 툴바 UI에 실시간 반영한다.
 * 버튼 클릭 시 서식 명령을 발행하고, editor.js의 콜백을 통해 WASM API를 호출한다.
 */

/** px → pt 변환 (96 DPI 기준) */
const PX_TO_PT = 72 / 96;
/** pt → HWPUNIT 변환 (1pt = 100 HWPUNIT) */
const PT_TO_HWPUNIT = 100;

export class FormatToolbar {
    /**
     * @param {HTMLElement} toolbarEl - #format-toolbar 요소
     */
    constructor(toolbarEl) {
        this.el = toolbarEl;

        // DOM 캐시
        this.fontSelect = document.getElementById('fmt-font');
        this.sizeInput = document.getElementById('fmt-size');
        this.sizeDown = document.getElementById('fmt-size-down');
        this.sizeUp = document.getElementById('fmt-size-up');

        this.boldBtn = document.getElementById('fmt-bold');
        this.italicBtn = document.getElementById('fmt-italic');
        this.underlineBtn = document.getElementById('fmt-underline');
        this.strikeBtn = document.getElementById('fmt-strike');

        this.textColorBtn = document.getElementById('fmt-text-color');
        this.textColorBar = document.getElementById('fmt-text-color-bar');
        this.textColorPicker = document.getElementById('fmt-text-color-picker');
        this.shadeColorBtn = document.getElementById('fmt-shade-color');
        this.shadeColorBar = document.getElementById('fmt-shade-color-bar');
        this.shadeColorPicker = document.getElementById('fmt-shade-color-picker');

        this.alignJustify = document.getElementById('fmt-align-justify');
        this.alignLeft = document.getElementById('fmt-align-left');
        this.alignCenter = document.getElementById('fmt-align-center');
        this.alignRight = document.getElementById('fmt-align-right');

        this.lineSpacing = document.getElementById('fmt-line-spacing');

        this.indentDec = document.getElementById('fmt-indent-dec');
        this.indentInc = document.getElementById('fmt-indent-inc');

        // 현재 속성 캐시 (서식 명령 발행 시 참조)
        this.currentCharProps = null;
        this.currentParaProps = null;

        /** @type {object|null} HwpDocument WASM 인스턴스 참조 */
        this.doc = null;

        /**
         * 글자 서식 적용 콜백 (editor.js에서 설정)
         * @type {((propsJson: string) => void) | null}
         */
        this.onApplyCharFormat = null;

        /**
         * 문단 서식 적용 콜백 (editor.js에서 설정)
         * @type {((propsJson: string) => void) | null}
         */
        this.onApplyParaFormat = null;

        /**
         * 글자 모양 대화상자 열기 콜백 (editor.js에서 설정)
         * @type {(() => void) | null}
         */
        this.onOpenCharShapeDialog = null;

        this._setupEventListeners();
    }

    /** 서식 툴바를 표시한다 */
    show() {
        this.el.classList.remove('hidden');
    }

    /** 서식 툴바를 숨긴다 */
    hide() {
        this.el.classList.add('hidden');
    }

    /**
     * 캐럿 위치의 속성으로 툴바를 갱신한다.
     * @param {object} doc - HwpDocument WASM 인스턴스
     * @param {object} docPos - getDocumentPos() 결과
     */
    update(doc, docPos) {
        if (!doc || !docPos) return;
        this.doc = doc;

        try {
            const charProps = this._queryCharProps(doc, docPos);
            const paraProps = this._queryParaProps(doc, docPos);

            this.currentCharProps = charProps;
            this.currentParaProps = paraProps;

            this._updateCharUI(charProps);
            this._updateParaUI(paraProps);
        } catch (e) {
            console.warn('서식 툴바 갱신 실패:', e);
        }
    }

    // === 외부에서 호출 가능한 서식 토글 메서드 (단축키용) ===

    /** 굵게 토글 */
    toggleBold() {
        if (!this.currentCharProps) return;
        this._applyChar(JSON.stringify({ bold: !this.currentCharProps.bold }));
    }

    /** 기울임 토글 */
    toggleItalic() {
        if (!this.currentCharProps) return;
        this._applyChar(JSON.stringify({ italic: !this.currentCharProps.italic }));
    }

    /** 밑줄 토글 */
    toggleUnderline() {
        if (!this.currentCharProps) return;
        this._applyChar(JSON.stringify({ underline: !this.currentCharProps.underline }));
    }

    // === 이벤트 리스너 ===

    _setupEventListeners() {
        // 글꼴 변경
        this.fontSelect?.addEventListener('change', () => {
            const name = this.fontSelect.value;
            if (!name || !this.doc) return;
            const fontId = this.doc.findOrCreateFontId(name);
            if (fontId >= 0) {
                this._applyChar(JSON.stringify({ fontId }));
            }
        });

        // 굵게 / 기울임 / 밑줄 / 취소선 토글
        this.boldBtn?.addEventListener('click', () => this.toggleBold());
        this.italicBtn?.addEventListener('click', () => this.toggleItalic());
        this.underlineBtn?.addEventListener('click', () => this.toggleUnderline());
        this.strikeBtn?.addEventListener('click', () => {
            if (!this.currentCharProps) return;
            this._applyChar(JSON.stringify({ strikethrough: !this.currentCharProps.strikethrough }));
        });

        // 글자 크기 증감
        this.sizeDown?.addEventListener('click', () => this._changeSize(-1));
        this.sizeUp?.addEventListener('click', () => this._changeSize(1));

        // 글자 크기 직접 입력
        this.sizeInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const pt = parseInt(this.sizeInput.value);
                if (pt > 0 && pt <= 4096) {
                    this._applyChar(JSON.stringify({ fontSize: pt * PT_TO_HWPUNIT }));
                }
            }
        });

        // 글자색 버튼 → color picker 열기
        this.textColorBtn?.addEventListener('click', () => {
            this.textColorPicker?.click();
        });
        this.textColorPicker?.addEventListener('input', (e) => {
            this.textColorBar.style.background = e.target.value;
        });
        this.textColorPicker?.addEventListener('change', (e) => {
            this._applyChar(JSON.stringify({ textColor: e.target.value }));
        });

        // 강조색 버튼 → color picker 열기
        this.shadeColorBtn?.addEventListener('click', () => {
            this.shadeColorPicker?.click();
        });
        this.shadeColorPicker?.addEventListener('input', (e) => {
            this.shadeColorBar.style.background = e.target.value;
        });
        this.shadeColorPicker?.addEventListener('change', (e) => {
            this._applyChar(JSON.stringify({ shadeColor: e.target.value }));
        });

        // 정렬
        const alignMap = [
            { el: this.alignJustify, val: 'justify' },
            { el: this.alignLeft, val: 'left' },
            { el: this.alignCenter, val: 'center' },
            { el: this.alignRight, val: 'right' },
        ];
        for (const { el, val } of alignMap) {
            el?.addEventListener('click', () => {
                this._applyPara(JSON.stringify({ alignment: val }));
            });
        }

        // 줄간격
        this.lineSpacing?.addEventListener('change', () => {
            const val = parseInt(this.lineSpacing.value);
            if (val > 0) {
                this._applyPara(JSON.stringify({ lineSpacing: val, lineSpacingType: 'Percent' }));
            }
        });

        // 들여쓰기 / 내어쓰기 (HWPUNIT, 1cm ≈ 283 HWPUNIT)
        const INDENT_STEP = 283;
        this.indentInc?.addEventListener('click', () => {
            const current = this.currentParaProps?.indent || 0;
            this._applyPara(JSON.stringify({ indent: Math.round(current) + INDENT_STEP }));
        });
        this.indentDec?.addEventListener('click', () => {
            const current = this.currentParaProps?.indent || 0;
            const newVal = Math.round(current) - INDENT_STEP;
            this._applyPara(JSON.stringify({ indent: Math.max(0, newVal) }));
        });

        // 글자 모양 대화상자
        const charShapeBtn = document.getElementById('fmt-charshape');
        charShapeBtn?.addEventListener('click', () => {
            if (this.onOpenCharShapeDialog) this.onOpenCharShapeDialog();
        });
    }

    /** 글자 크기 증감 (pt 단위, ±1pt) */
    _changeSize(delta) {
        if (!this.currentCharProps) return;
        const currentPt = Math.round(this.currentCharProps.fontSize * PX_TO_PT);
        const newPt = Math.max(1, currentPt + delta);
        this._applyChar(JSON.stringify({ fontSize: newPt * PT_TO_HWPUNIT }));
    }

    /** 글자 서식 적용 (콜백 호출) */
    _applyChar(propsJson) {
        if (this.onApplyCharFormat) {
            this.onApplyCharFormat(propsJson);
        }
    }

    /** 문단 서식 적용 (콜백 호출) */
    _applyPara(propsJson) {
        if (this.onApplyParaFormat) {
            this.onApplyParaFormat(propsJson);
        }
    }

    // === WASM 속성 조회 ===

    _queryCharProps(doc, docPos) {
        let json;
        if (docPos.parentParaIdx !== undefined && docPos.controlIdx !== undefined &&
            docPos.cellIdx !== undefined && docPos.cellParaIdx !== undefined) {
            json = doc.getCellCharPropertiesAt(
                docPos.secIdx, docPos.parentParaIdx, docPos.controlIdx,
                docPos.cellIdx, docPos.cellParaIdx, docPos.charOffset
            );
        } else {
            json = doc.getCharPropertiesAt(docPos.secIdx, docPos.paraIdx, docPos.charOffset);
        }
        return JSON.parse(json);
    }

    _queryParaProps(doc, docPos) {
        let json;
        if (docPos.parentParaIdx !== undefined && docPos.controlIdx !== undefined &&
            docPos.cellIdx !== undefined && docPos.cellParaIdx !== undefined) {
            json = doc.getCellParaPropertiesAt(
                docPos.secIdx, docPos.parentParaIdx, docPos.controlIdx,
                docPos.cellIdx, docPos.cellParaIdx
            );
        } else {
            json = doc.getParaPropertiesAt(docPos.secIdx, docPos.paraIdx);
        }
        return JSON.parse(json);
    }

    // === UI 갱신 ===

    _updateCharUI(props) {
        if (!props) return;

        // 글꼴
        if (this.fontSelect) {
            const val = props.fontFamily || '';
            const hasOption = Array.from(this.fontSelect.options).some(o => o.value === val);
            this.fontSelect.value = hasOption ? val : '';
        }

        // 글자 크기 (px → pt 변환)
        if (this.sizeInput) {
            this.sizeInput.value = props.fontSize ? Math.round(props.fontSize * PX_TO_PT) : '';
        }

        // 글자 서식 토글
        this._setToggle(this.boldBtn, props.bold);
        this._setToggle(this.italicBtn, props.italic);
        this._setToggle(this.underlineBtn, props.underline);
        this._setToggle(this.strikeBtn, props.strikethrough);

        // 글자색
        if (this.textColorBar && props.textColor) {
            this.textColorBar.style.background = props.textColor;
        }
        if (this.textColorPicker && props.textColor) {
            this.textColorPicker.value = props.textColor;
        }
    }

    _updateParaUI(props) {
        if (!props) return;

        // 정렬
        const alignBtns = [
            { el: this.alignJustify, val: 'justify' },
            { el: this.alignLeft, val: 'left' },
            { el: this.alignCenter, val: 'center' },
            { el: this.alignRight, val: 'right' },
        ];
        for (const { el, val } of alignBtns) {
            if (el) {
                if (props.alignment === val) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            }
        }

        // 줄간격
        if (this.lineSpacing && props.lineSpacing !== undefined) {
            const spacing = Math.round(props.lineSpacing);
            const hasOption = Array.from(this.lineSpacing.options).some(o => parseInt(o.value) === spacing);
            this.lineSpacing.value = hasOption ? String(spacing) : '';
        }
    }

    _setToggle(btn, active) {
        if (!btn) return;
        if (active) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}
