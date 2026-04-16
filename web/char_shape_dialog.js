/**
 * 글자 모양 대화상자 (CharShapeDialog)
 * HWP Alt+L 대화상자에 해당하는 글자 속성 설정 UI
 */

const LANG_NAMES = ['대표', '한글', '영문', '한자', '일어', '외국어', '기호', '사용자'];

const FONTS = [
    '함초롬돋움', '함초롬바탕', '맑은 고딕', '돋움', '굴림', '바탕',
    'HY헤드라인M', 'HY견고딕', 'HY그래픽', 'HY견명조', 'Arial', 'Times New Roman',
];

export class CharShapeDialog {
    constructor() {
        this._overlay = null;
        this._dialog = null;
        this._currentTab = 'basic';
        this._currentLang = 0; // 0=대표
        this._props = null;
        this._initialProps = null;
        /** @type {function(string):void|null} */
        this.onApply = null;
        this._build();
    }

    /** 대화상자 열기 */
    open(charProps) {
        this._props = JSON.parse(JSON.stringify(charProps));
        this._initialProps = JSON.parse(JSON.stringify(charProps));
        this._currentLang = 0;
        this._populateFromProps();
        this._switchTab('basic');
        this._overlay.classList.remove('hidden');
        // 기준 크기 입력에 포커스
        const sizeInput = this._dialog.querySelector('#cs-base-size');
        if (sizeInput) setTimeout(() => sizeInput.select(), 50);
    }

    /** 대화상자 닫기 */
    close() {
        this._overlay.classList.add('hidden');
    }

    _build() {
        // 오버레이
        this._overlay = document.createElement('div');
        this._overlay.className = 'dialog-overlay hidden';

        // 대화상자 래퍼
        this._dialog = document.createElement('div');
        this._dialog.className = 'dialog-wrap';

        // 타이틀
        const title = document.createElement('div');
        title.className = 'dialog-title';
        title.innerHTML = '<span>글자 모양</span>';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'dialog-close';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', () => this.close());
        title.appendChild(closeBtn);
        this._dialog.appendChild(title);

        // 탭 그룹
        const tabGroup = document.createElement('div');
        tabGroup.className = 'dialog-tab-group';
        this._tabBasic = this._createTab(tabGroup, 'basic', '기본');
        this._tabExtended = this._createTab(tabGroup, 'extended', '확장');
        this._dialog.appendChild(tabGroup);

        // 탭 패널
        const body = document.createElement('div');
        body.className = 'dialog-body';
        this._panelBasic = this._buildBasicTab();
        this._panelExtended = this._buildExtendedTab();
        body.appendChild(this._panelBasic);
        body.appendChild(this._panelExtended);
        this._dialog.appendChild(body);

        // 버튼 박스
        const btnBox = document.createElement('div');
        btnBox.className = 'dialog-button-box';
        const okBtn = document.createElement('button');
        okBtn.className = 'dialog-btn dialog-btn-primary';
        okBtn.textContent = '설정';
        okBtn.addEventListener('click', () => this._handleOk());
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'dialog-btn';
        cancelBtn.textContent = '취소';
        cancelBtn.addEventListener('click', () => this.close());
        btnBox.appendChild(okBtn);
        btnBox.appendChild(cancelBtn);
        this._dialog.appendChild(btnBox);

        this._overlay.appendChild(this._dialog);
        document.body.appendChild(this._overlay);

        // Escape 키로 닫기
        this._overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); this.close(); }
        });
        // 오버레이 클릭으로 닫기
        this._overlay.addEventListener('mousedown', (e) => {
            if (e.target === this._overlay) this.close();
        });

        // 드래그
        this._enableDrag(title);
    }

    _createTab(container, id, label) {
        const btn = document.createElement('button');
        btn.className = 'dialog-tab';
        btn.textContent = label;
        btn.dataset.tab = id;
        btn.addEventListener('click', () => this._switchTab(id));
        container.appendChild(btn);
        return btn;
    }

    _switchTab(tabId) {
        this._currentTab = tabId;
        this._tabBasic.classList.toggle('on', tabId === 'basic');
        this._tabExtended.classList.toggle('on', tabId === 'extended');
        this._panelBasic.classList.toggle('active', tabId === 'basic');
        this._panelExtended.classList.toggle('active', tabId === 'extended');
    }

    // ======================== 기본 탭 ========================
    _buildBasicTab() {
        const panel = document.createElement('div');
        panel.className = 'dialog-tab-panel';

        // 기준 크기
        const sizeSection = document.createElement('div');
        sizeSection.className = 'dialog-section';
        sizeSection.innerHTML = `
            <div class="dialog-row">
                <span class="dialog-label">기준 크기</span>
                <input type="number" id="cs-base-size" class="dialog-input" min="1" max="4096" step="0.5">
                <span class="dialog-unit">pt</span>
            </div>`;
        panel.appendChild(sizeSection);

        // 언어별 설정
        const langSection = document.createElement('div');
        langSection.className = 'dialog-section';
        const langTitle = document.createElement('div');
        langTitle.className = 'dialog-section-title';
        langTitle.textContent = '언어별 설정';
        langSection.appendChild(langTitle);

        // 언어 탭
        const langTabs = document.createElement('div');
        langTabs.className = 'dialog-lang-tabs';
        this._langTabBtns = [];
        LANG_NAMES.forEach((name, idx) => {
            const btn = document.createElement('button');
            btn.className = 'dialog-lang-tab';
            btn.textContent = name;
            btn.addEventListener('click', () => this._switchLang(idx));
            langTabs.appendChild(btn);
            this._langTabBtns.push(btn);
        });
        langSection.appendChild(langTabs);

        // 글꼴
        const fontRow = document.createElement('div');
        fontRow.className = 'dialog-row';
        fontRow.innerHTML = '<span class="dialog-label">글꼴</span>';
        this._fontSelect = document.createElement('select');
        this._fontSelect.className = 'dialog-select dialog-font-select';
        FONTS.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            this._fontSelect.appendChild(opt);
        });
        fontRow.appendChild(this._fontSelect);
        langSection.appendChild(fontRow);

        // 상대크기, 자간, 장평, 글자 위치
        const fields = [
            { id: 'cs-relative-size', label: '상대크기', unit: '%', min: 10, max: 250 },
            { id: 'cs-spacing', label: '자간', unit: '%', min: -50, max: 50 },
            { id: 'cs-ratio', label: '장평', unit: '%', min: 50, max: 200 },
            { id: 'cs-char-offset', label: '글자 위치', unit: '%', min: -100, max: 100 },
        ];
        this._langInputs = {};
        fields.forEach(f => {
            const row = document.createElement('div');
            row.className = 'dialog-row';
            row.innerHTML = `<span class="dialog-label">${f.label}</span>`;
            const input = document.createElement('input');
            input.type = 'number';
            input.id = f.id;
            input.className = 'dialog-input';
            input.min = f.min;
            input.max = f.max;
            const unitSpan = document.createElement('span');
            unitSpan.className = 'dialog-unit';
            unitSpan.textContent = f.unit;
            row.appendChild(input);
            row.appendChild(unitSpan);
            langSection.appendChild(row);
            this._langInputs[f.id] = input;
        });
        panel.appendChild(langSection);

        // 속성 (B, I, U, S, 외곽선, 위첨자, 아래첨자)
        const attrSection = document.createElement('div');
        attrSection.className = 'dialog-section';
        const attrTitle = document.createElement('div');
        attrTitle.className = 'dialog-section-title';
        attrTitle.textContent = '속성';
        attrSection.appendChild(attrTitle);

        const attrRow = document.createElement('div');
        attrRow.className = 'dialog-row';
        this._attrBtns = {};
        const attrs = [
            { id: 'bold', label: 'B', title: '굵게', style: 'font-weight:bold' },
            { id: 'italic', label: 'I', title: '기울임', style: 'font-style:italic' },
            { id: 'underline', label: 'U', title: '밑줄', style: 'text-decoration:underline' },
            { id: 'strikethrough', label: 'S', title: '취소선', style: 'text-decoration:line-through' },
            { id: 'superscript', label: 'a\u00B2', title: '위 첨자', style: 'font-size:11px' },
            { id: 'subscript', label: 'a\u2082', title: '아래 첨자', style: 'font-size:11px' },
        ];
        attrs.forEach(a => {
            const btn = document.createElement('button');
            btn.className = 'dialog-icon-btn';
            btn.title = a.title;
            btn.innerHTML = `<span style="${a.style}">${a.label}</span>`;
            btn.addEventListener('click', () => {
                // 위첨자/아래첨자 상호 배타
                if (a.id === 'superscript' && !btn.classList.contains('active')) {
                    this._attrBtns['subscript']?.classList.remove('active');
                } else if (a.id === 'subscript' && !btn.classList.contains('active')) {
                    this._attrBtns['superscript']?.classList.remove('active');
                }
                btn.classList.toggle('active');
            });
            attrRow.appendChild(btn);
            this._attrBtns[a.id] = btn;
        });
        attrSection.appendChild(attrRow);

        // 색상
        const colorRow = document.createElement('div');
        colorRow.className = 'dialog-row';
        colorRow.innerHTML = '<span class="dialog-label">글자 색</span>';
        this._textColorInput = document.createElement('input');
        this._textColorInput.type = 'color';
        this._textColorInput.className = 'dialog-color-btn';
        colorRow.appendChild(this._textColorInput);

        const shadeLabel = document.createElement('span');
        shadeLabel.className = 'dialog-label';
        shadeLabel.textContent = '음영 색';
        shadeLabel.style.marginLeft = '16px';
        colorRow.appendChild(shadeLabel);
        this._shadeColorInput = document.createElement('input');
        this._shadeColorInput.type = 'color';
        this._shadeColorInput.className = 'dialog-color-btn';
        colorRow.appendChild(this._shadeColorInput);
        attrSection.appendChild(colorRow);
        panel.appendChild(attrSection);

        return panel;
    }

    _switchLang(idx) {
        this._currentLang = idx;
        this._langTabBtns.forEach((btn, i) => btn.classList.toggle('on', i === idx));
        this._updateLangFields();
    }

    _updateLangFields() {
        if (!this._props) return;
        const idx = this._currentLang;
        const arrIdx = idx === 0 ? 0 : idx - 1; // 대표 = 한글(0)

        // 글꼴
        const families = this._props.fontFamilies || [];
        const fontName = families[arrIdx] || '';
        this._fontSelect.value = fontName;
        // 글꼴 목록에 없으면 추가
        if (this._fontSelect.value !== fontName && fontName) {
            const opt = document.createElement('option');
            opt.value = fontName;
            opt.textContent = fontName;
            this._fontSelect.appendChild(opt);
            this._fontSelect.value = fontName;
        }

        // 수치 필드
        const ratios = this._props.ratios || [100,100,100,100,100,100,100];
        const spacings = this._props.spacings || [0,0,0,0,0,0,0];
        const relativeSizes = this._props.relativeSizes || [100,100,100,100,100,100,100];
        const charOffsets = this._props.charOffsets || [0,0,0,0,0,0,0];

        this._langInputs['cs-ratio'].value = ratios[arrIdx];
        this._langInputs['cs-spacing'].value = spacings[arrIdx];
        this._langInputs['cs-relative-size'].value = relativeSizes[arrIdx];
        this._langInputs['cs-char-offset'].value = charOffsets[arrIdx];
    }

    // ======================== 확장 탭 ========================
    _buildExtendedTab() {
        const panel = document.createElement('div');
        panel.className = 'dialog-tab-panel';

        // 그림자
        const shadowSection = document.createElement('div');
        shadowSection.className = 'dialog-section';
        shadowSection.innerHTML = `<div class="dialog-section-title">그림자</div>`;
        const shadowRow1 = document.createElement('div');
        shadowRow1.className = 'dialog-row';
        shadowRow1.innerHTML = '<span class="dialog-label">종류</span>';
        this._shadowTypeSelect = document.createElement('select');
        this._shadowTypeSelect.className = 'dialog-select';
        ['없음', '비연속', '연속'].forEach((label, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = label;
            this._shadowTypeSelect.appendChild(opt);
        });
        shadowRow1.appendChild(this._shadowTypeSelect);

        const shadowColorLabel = document.createElement('span');
        shadowColorLabel.className = 'dialog-label';
        shadowColorLabel.textContent = '색';
        shadowRow1.appendChild(shadowColorLabel);
        this._shadowColorInput = document.createElement('input');
        this._shadowColorInput.type = 'color';
        this._shadowColorInput.className = 'dialog-color-btn';
        shadowRow1.appendChild(this._shadowColorInput);
        shadowSection.appendChild(shadowRow1);

        const shadowRow2 = document.createElement('div');
        shadowRow2.className = 'dialog-row';
        shadowRow2.innerHTML = `
            <span class="dialog-label">X</span>
            <input type="number" id="cs-shadow-x" class="dialog-input" min="-100" max="100" style="width:50px">
            <span class="dialog-unit">%</span>
            <span class="dialog-label" style="margin-left:12px">Y</span>
            <input type="number" id="cs-shadow-y" class="dialog-input" min="-100" max="100" style="width:50px">
            <span class="dialog-unit">%</span>`;
        shadowSection.appendChild(shadowRow2);
        panel.appendChild(shadowSection);

        // 밑줄
        const underlineSection = document.createElement('div');
        underlineSection.className = 'dialog-section';
        underlineSection.innerHTML = `<div class="dialog-section-title">밑줄</div>`;
        const ulRow = document.createElement('div');
        ulRow.className = 'dialog-row';
        ulRow.innerHTML = '<span class="dialog-label">위치</span>';
        this._underlineTypeSelect = document.createElement('select');
        this._underlineTypeSelect.className = 'dialog-select';
        [['None', '없음'], ['Bottom', '글자 아래'], ['Top', '글자 위']].forEach(([val, label]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            this._underlineTypeSelect.appendChild(opt);
        });
        ulRow.appendChild(this._underlineTypeSelect);
        const ulColorLabel = document.createElement('span');
        ulColorLabel.className = 'dialog-label';
        ulColorLabel.textContent = '색';
        ulRow.appendChild(ulColorLabel);
        this._underlineColorInput = document.createElement('input');
        this._underlineColorInput.type = 'color';
        this._underlineColorInput.className = 'dialog-color-btn';
        ulRow.appendChild(this._underlineColorInput);
        underlineSection.appendChild(ulRow);
        panel.appendChild(underlineSection);

        // 취소선
        const strikeSection = document.createElement('div');
        strikeSection.className = 'dialog-section';
        strikeSection.innerHTML = `<div class="dialog-section-title">취소선</div>`;
        const stRow = document.createElement('div');
        stRow.className = 'dialog-row';
        stRow.innerHTML = '<span class="dialog-label">사용</span>';
        this._strikeCheckbox = document.createElement('input');
        this._strikeCheckbox.type = 'checkbox';
        this._strikeCheckbox.id = 'cs-strike-check';
        stRow.appendChild(this._strikeCheckbox);
        const stColorLabel = document.createElement('span');
        stColorLabel.className = 'dialog-label';
        stColorLabel.textContent = '색';
        stColorLabel.style.marginLeft = '16px';
        stRow.appendChild(stColorLabel);
        this._strikeColorInput = document.createElement('input');
        this._strikeColorInput.type = 'color';
        this._strikeColorInput.className = 'dialog-color-btn';
        stRow.appendChild(this._strikeColorInput);
        strikeSection.appendChild(stRow);
        panel.appendChild(strikeSection);

        // 외곽선
        const outlineSection = document.createElement('div');
        outlineSection.className = 'dialog-section';
        outlineSection.innerHTML = `<div class="dialog-section-title">외곽선</div>`;
        const olRow = document.createElement('div');
        olRow.className = 'dialog-row';
        olRow.innerHTML = '<span class="dialog-label">종류</span>';
        this._outlineTypeSelect = document.createElement('select');
        this._outlineTypeSelect.className = 'dialog-select';
        ['없음', '실선', '점선', '굵은 선', '파선', '일점쇄선', '이점쇄선'].forEach((label, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = label;
            this._outlineTypeSelect.appendChild(opt);
        });
        olRow.appendChild(this._outlineTypeSelect);
        outlineSection.appendChild(olRow);
        panel.appendChild(outlineSection);

        return panel;
    }

    // ======================== 속성 채우기 ========================
    _populateFromProps() {
        const p = this._props;
        if (!p) return;

        // 기준 크기 (HWPUNIT → pt)
        const sizeInput = this._dialog.querySelector('#cs-base-size');
        if (sizeInput) sizeInput.value = (p.fontSize / 100).toFixed(1);

        // 언어 탭 초기화
        this._switchLang(0);

        // 속성 버튼
        this._setAttrBtn('bold', p.bold);
        this._setAttrBtn('italic', p.italic);
        this._setAttrBtn('underline', p.underline);
        this._setAttrBtn('strikethrough', p.strikethrough);
        this._setAttrBtn('superscript', p.superscript);
        this._setAttrBtn('subscript', p.subscript);

        // 색상
        this._textColorInput.value = p.textColor || '#000000';
        this._shadeColorInput.value = p.shadeColor || '#ffffff';

        // 확장 탭
        this._shadowTypeSelect.value = p.shadowType || 0;
        this._shadowColorInput.value = p.shadowColor || '#b2b2b2';
        const shadowX = this._dialog.querySelector('#cs-shadow-x');
        const shadowY = this._dialog.querySelector('#cs-shadow-y');
        if (shadowX) shadowX.value = p.shadowOffsetX || 0;
        if (shadowY) shadowY.value = p.shadowOffsetY || 0;

        this._underlineTypeSelect.value = p.underlineType || 'None';
        this._underlineColorInput.value = p.underlineColor || '#000000';

        this._strikeCheckbox.checked = p.strikethrough || false;
        this._strikeColorInput.value = p.strikeColor || '#000000';

        this._outlineTypeSelect.value = p.outlineType || 0;
    }

    _setAttrBtn(id, active) {
        const btn = this._attrBtns[id];
        if (btn) btn.classList.toggle('active', !!active);
    }

    // ======================== 변경사항 수집 ========================
    _collectMods() {
        const mods = {};
        const p = this._initialProps;
        if (!p) return mods;

        // 기준 크기
        const sizeInput = this._dialog.querySelector('#cs-base-size');
        if (sizeInput) {
            const newSize = Math.round(parseFloat(sizeInput.value) * 100);
            if (newSize !== p.fontSize && newSize >= 100 && newSize <= 409600) {
                mods.fontSize = newSize;
            }
        }

        // 속성 토글
        const boolFields = ['bold', 'italic', 'superscript', 'subscript'];
        boolFields.forEach(f => {
            const active = this._attrBtns[f]?.classList.contains('active') || false;
            if (active !== (p[f] || false)) mods[f] = active;
        });

        // underline — 기본 탭의 U 버튼은 간단 토글
        const ulActive = this._attrBtns['underline']?.classList.contains('active') || false;
        if (ulActive !== (p.underline || false)) mods.underline = ulActive;

        // strikethrough — 기본 탭의 S 버튼
        const stActive = this._attrBtns['strikethrough']?.classList.contains('active') || false;
        if (stActive !== (p.strikethrough || false)) mods.strikethrough = stActive;

        // 색상
        if (this._textColorInput.value !== (p.textColor || '#000000')) {
            mods.textColor = this._textColorInput.value;
        }
        if (this._shadeColorInput.value !== (p.shadeColor || '#ffffff')) {
            mods.shadeColor = this._shadeColorInput.value;
        }

        // 확장 탭
        const shadowType = parseInt(this._shadowTypeSelect.value);
        if (shadowType !== (p.shadowType || 0)) mods.shadowType = shadowType;
        if (this._shadowColorInput.value !== (p.shadowColor || '#b2b2b2')) {
            mods.shadowColor = this._shadowColorInput.value;
        }
        const sx = this._dialog.querySelector('#cs-shadow-x');
        const sy = this._dialog.querySelector('#cs-shadow-y');
        if (sx && parseInt(sx.value) !== (p.shadowOffsetX || 0)) mods.shadowOffsetX = parseInt(sx.value);
        if (sy && parseInt(sy.value) !== (p.shadowOffsetY || 0)) mods.shadowOffsetY = parseInt(sy.value);

        const ulType = this._underlineTypeSelect.value;
        if (ulType !== (p.underlineType || 'None')) mods.underlineType = ulType;
        if (this._underlineColorInput.value !== (p.underlineColor || '#000000')) {
            mods.underlineColor = this._underlineColorInput.value;
        }

        if (this._strikeCheckbox.checked !== (p.strikethrough || false)) {
            mods.strikethrough = this._strikeCheckbox.checked;
        }
        if (this._strikeColorInput.value !== (p.strikeColor || '#000000')) {
            mods.strikeColor = this._strikeColorInput.value;
        }

        const outlineType = parseInt(this._outlineTypeSelect.value);
        if (outlineType !== (p.outlineType || 0)) mods.outlineType = outlineType;

        // 언어별 배열 — 현재 언어 탭에서 수정된 값을 반영
        this._saveLangFields();
        const arrFields = [
            { prop: 'ratios', modKey: 'ratios' },
            { prop: 'spacings', modKey: 'spacings' },
            { prop: 'relativeSizes', modKey: 'relativeSizes' },
            { prop: 'charOffsets', modKey: 'charOffsets' },
        ];
        arrFields.forEach(({ prop, modKey }) => {
            const orig = p[prop] || [];
            const curr = this._props[prop] || [];
            if (JSON.stringify(orig) !== JSON.stringify(curr)) {
                mods[modKey] = curr;
            }
        });

        // 글꼴 변경 — 대표 모드에서만 fontId 전달
        // (fontId는 서버에서 findOrCreateFontId로 해결해야 하므로 fontName으로 전달)
        const origFont = (p.fontFamilies || [])[this._currentLang === 0 ? 0 : this._currentLang - 1] || '';
        if (this._fontSelect.value && this._fontSelect.value !== origFont) {
            mods.fontName = this._fontSelect.value;
        }

        return mods;
    }

    /** 현재 언어 탭의 값을 _props에 저장 */
    _saveLangFields() {
        if (!this._props) return;
        const idx = this._currentLang;
        const arrIdx = idx === 0 ? -1 : idx - 1; // -1이면 전체 적용

        const ratio = parseInt(this._langInputs['cs-ratio'].value) || 100;
        const spacing = parseInt(this._langInputs['cs-spacing'].value) || 0;
        const relSize = parseInt(this._langInputs['cs-relative-size'].value) || 100;
        const charOff = parseInt(this._langInputs['cs-char-offset'].value) || 0;

        if (arrIdx === -1) {
            // 대표: 7개 모두 동일하게 설정
            this._props.ratios = Array(7).fill(ratio);
            this._props.spacings = Array(7).fill(spacing);
            this._props.relativeSizes = Array(7).fill(relSize);
            this._props.charOffsets = Array(7).fill(charOff);
        } else {
            if (!this._props.ratios) this._props.ratios = [100,100,100,100,100,100,100];
            if (!this._props.spacings) this._props.spacings = [0,0,0,0,0,0,0];
            if (!this._props.relativeSizes) this._props.relativeSizes = [100,100,100,100,100,100,100];
            if (!this._props.charOffsets) this._props.charOffsets = [0,0,0,0,0,0,0];
            this._props.ratios[arrIdx] = ratio;
            this._props.spacings[arrIdx] = spacing;
            this._props.relativeSizes[arrIdx] = relSize;
            this._props.charOffsets[arrIdx] = charOff;
        }
    }

    // ======================== 설정/취소 ========================
    _handleOk() {
        this._saveLangFields();
        const mods = this._collectMods();
        if (Object.keys(mods).length === 0) {
            this.close();
            return;
        }
        if (this.onApply) {
            this.onApply(mods);
        }
        this.close();
    }

    // ======================== 드래그 ========================
    _enableDrag(titleEl) {
        let offsetX = 0, offsetY = 0, isDragging = false;
        titleEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.dialog-close')) return;
            isDragging = true;
            const rect = this._dialog.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            this._dialog.style.left = (e.clientX - offsetX) + 'px';
            this._dialog.style.top = (e.clientY - offsetY) + 'px';
            this._dialog.style.margin = '0';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }
}
