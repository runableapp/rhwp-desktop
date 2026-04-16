/* @ts-self-types="./rhwp.d.ts" */

/**
 * WASM에서 사용할 HWP 문서 래퍼
 */
export class HwpDocument {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(HwpDocument.prototype);
        obj.__wbg_ptr = ptr;
        HwpDocumentFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HwpDocumentFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hwpdocument_free(ptr, 0);
    }
    /**
     * 글자 서식을 적용한다 (본문 문단).
     * @param {number} sec_idx
     * @param {number} para_idx
     * @param {number} start_offset
     * @param {number} end_offset
     * @param {string} props_json
     * @returns {string}
     */
    applyCharFormat(sec_idx, para_idx, start_offset, end_offset, props_json) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(props_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_applyCharFormat(this.__wbg_ptr, sec_idx, para_idx, start_offset, end_offset, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * 글자 서식을 적용한다 (셀 내 문단).
     * @param {number} sec_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @param {number} start_offset
     * @param {number} end_offset
     * @param {string} props_json
     * @returns {string}
     */
    applyCharFormatInCell(sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, start_offset, end_offset, props_json) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(props_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_applyCharFormatInCell(this.__wbg_ptr, sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, start_offset, end_offset, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * 문단 서식을 적용한다 (본문 문단).
     * @param {number} sec_idx
     * @param {number} para_idx
     * @param {string} props_json
     * @returns {string}
     */
    applyParaFormat(sec_idx, para_idx, props_json) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(props_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_applyParaFormat(this.__wbg_ptr, sec_idx, para_idx, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * 문단 서식을 적용한다 (셀 내 문단).
     * @param {number} sec_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @param {string} props_json
     * @returns {string}
     */
    applyParaFormatInCell(sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, props_json) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(props_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_applyParaFormatInCell(this.__wbg_ptr, sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * 내부 클립보드를 초기화한다.
     */
    clearClipboard() {
        wasm.hwpdocument_clearClipboard(this.__wbg_ptr);
    }
    /**
     * 배포용(읽기전용) 문서를 편집 가능한 일반 문서로 변환한다.
     *
     * 반환값: JSON `{"ok":true,"converted":true}` 또는 `{"ok":true,"converted":false}`
     * @returns {string}
     */
    convertToEditable() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_convertToEditable(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 컨트롤 객체(표, 이미지, 도형)를 내부 클립보드에 복사한다.
     * @param {number} section_idx
     * @param {number} para_idx
     * @param {number} control_idx
     * @returns {string}
     */
    copyControl(section_idx, para_idx, control_idx) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_copyControl(this.__wbg_ptr, section_idx, para_idx, control_idx);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 선택 영역을 내부 클립보드에 복사한다.
     *
     * 반환값: JSON `{"ok":true,"text":"<plain_text>"}`
     * @param {number} section_idx
     * @param {number} start_para_idx
     * @param {number} start_char_offset
     * @param {number} end_para_idx
     * @param {number} end_char_offset
     * @returns {string}
     */
    copySelection(section_idx, start_para_idx, start_char_offset, end_para_idx, end_char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_copySelection(this.__wbg_ptr, section_idx, start_para_idx, start_char_offset, end_para_idx, end_char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 표 셀 내부 선택 영역을 내부 클립보드에 복사한다.
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} start_cell_para_idx
     * @param {number} start_char_offset
     * @param {number} end_cell_para_idx
     * @param {number} end_char_offset
     * @returns {string}
     */
    copySelectionInCell(section_idx, parent_para_idx, control_idx, cell_idx, start_cell_para_idx, start_char_offset, end_cell_para_idx, end_char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_copySelectionInCell(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, cell_idx, start_cell_para_idx, start_char_offset, end_cell_para_idx, end_char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 빈 문서 생성 (테스트/미리보기용)
     * @returns {HwpDocument}
     */
    static createEmpty() {
        const ret = wasm.hwpdocument_createEmpty();
        return HwpDocument.__wrap(ret);
    }
    /**
     * 문단에서 텍스트를 삭제한다.
     *
     * 삭제 후 구역을 재구성하고 재페이지네이션한다.
     * 반환값: JSON `{"ok":true,"charOffset":<offset_after_delete>}`
     * @param {number} section_idx
     * @param {number} para_idx
     * @param {number} char_offset
     * @param {number} count
     * @returns {string}
     */
    deleteText(section_idx, para_idx, char_offset, count) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_deleteText(this.__wbg_ptr, section_idx, para_idx, char_offset, count);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 표 셀 내부 문단에서 텍스트를 삭제한다.
     *
     * 반환값: JSON `{"ok":true,"charOffset":<offset_after_delete>}`
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @param {number} char_offset
     * @param {number} count
     * @returns {string}
     */
    deleteTextInCell(section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset, count) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_deleteTextInCell(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset, count);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 컨트롤 객체를 HTML 문자열로 변환한다.
     * @param {number} section_idx
     * @param {number} para_idx
     * @param {number} control_idx
     * @returns {string}
     */
    exportControlHtml(section_idx, para_idx, control_idx) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_exportControlHtml(this.__wbg_ptr, section_idx, para_idx, control_idx);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 문서를 HWP 바이너리로 내보낸다.
     *
     * Document IR을 HWP 5.0 CFB 바이너리로 직렬화하여 반환한다.
     * @returns {Uint8Array}
     */
    exportHwp() {
        const ret = wasm.hwpdocument_exportHwp(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * 선택 영역을 HTML 문자열로 변환한다 (본문).
     * @param {number} section_idx
     * @param {number} start_para_idx
     * @param {number} start_char_offset
     * @param {number} end_para_idx
     * @param {number} end_char_offset
     * @returns {string}
     */
    exportSelectionHtml(section_idx, start_para_idx, start_char_offset, end_para_idx, end_char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_exportSelectionHtml(this.__wbg_ptr, section_idx, start_para_idx, start_char_offset, end_para_idx, end_char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 선택 영역을 HTML 문자열로 변환한다 (셀 내부).
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} start_cell_para_idx
     * @param {number} start_char_offset
     * @param {number} end_cell_para_idx
     * @param {number} end_char_offset
     * @returns {string}
     */
    exportSelectionInCellHtml(section_idx, parent_para_idx, control_idx, cell_idx, start_cell_para_idx, start_char_offset, end_cell_para_idx, end_char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_exportSelectionInCellHtml(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, cell_idx, start_cell_para_idx, start_char_offset, end_cell_para_idx, end_char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 글꼴 이름으로 font_id를 조회하거나 새로 생성한다.
     *
     * 한글(0번) 카테고리에서 이름 검색 → 없으면 7개 전체 카테고리에 신규 등록.
     * 반환값: font_id (u16), 실패 시 -1
     * @param {string} name
     * @returns {number}
     */
    findOrCreateFontId(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hwpdocument_findOrCreateFontId(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * 셀 내부 문단의 글자 속성을 조회한다.
     * @param {number} sec_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @param {number} char_offset
     * @returns {string}
     */
    getCellCharPropertiesAt(sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_getCellCharPropertiesAt(this.__wbg_ptr, sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 셀 내부 문단의 문단 속성을 조회한다.
     * @param {number} sec_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @returns {string}
     */
    getCellParaPropertiesAt(sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_getCellParaPropertiesAt(this.__wbg_ptr, sec_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 캐럿 위치의 글자 속성을 조회한다.
     *
     * 반환값: JSON 객체 (fontFamily, fontSize, bold, italic, underline, strikethrough, textColor 등)
     * @param {number} sec_idx
     * @param {number} para_idx
     * @param {number} char_offset
     * @returns {string}
     */
    getCharPropertiesAt(sec_idx, para_idx, char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_getCharPropertiesAt(this.__wbg_ptr, sec_idx, para_idx, char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 내부 클립보드의 플레인 텍스트를 반환한다.
     * @returns {string}
     */
    getClipboardText() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hwpdocument_getClipboardText(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * 문서 정보를 JSON 문자열로 반환한다.
     * @returns {string}
     */
    getDocumentInfo() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hwpdocument_getDocumentInfo(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * 현재 DPI를 반환한다.
     * @returns {number}
     */
    getDpi() {
        const ret = wasm.hwpdocument_getDpi(this.__wbg_ptr);
        return ret;
    }
    /**
     * 현재 대체 폰트 경로를 반환한다.
     * @returns {string}
     */
    getFallbackFont() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hwpdocument_getFallbackFont(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * 컨트롤(표, 이미지 등) 레이아웃 정보를 반환한다.
     * @param {number} page_num
     * @returns {string}
     */
    getPageControlLayout(page_num) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_getPageControlLayout(this.__wbg_ptr, page_num);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 페이지 정보를 JSON 문자열로 반환한다.
     * @param {number} page_num
     * @returns {string}
     */
    getPageInfo(page_num) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_getPageInfo(this.__wbg_ptr, page_num);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 특정 페이지의 텍스트 레이아웃 정보를 JSON 문자열로 반환한다.
     *
     * 각 TextRun의 위치, 텍스트, 글자별 X 좌표 경계값을 포함한다.
     * @param {number} page_num
     * @returns {string}
     */
    getPageTextLayout(page_num) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_getPageTextLayout(this.__wbg_ptr, page_num);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 캐럿 위치의 문단 속성을 조회한다.
     *
     * 반환값: JSON 객체 (alignment, lineSpacing, marginLeft, marginRight, indent 등)
     * @param {number} sec_idx
     * @param {number} para_idx
     * @returns {string}
     */
    getParaPropertiesAt(sec_idx, para_idx) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_getParaPropertiesAt(this.__wbg_ptr, sec_idx, para_idx);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 내부 클립보드에 데이터가 있는지 확인한다.
     * @returns {boolean}
     */
    hasInternalClipboard() {
        const ret = wasm.hwpdocument_hasInternalClipboard(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * 표에 열을 삽입한다.
     *
     * 반환값: JSON `{"ok":true,"rowCount":<N>,"colCount":<M>}`
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} col_idx
     * @param {boolean} right
     * @returns {string}
     */
    insertTableColumn(section_idx, parent_para_idx, control_idx, col_idx, right) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_insertTableColumn(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, col_idx, right);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 표에 행을 삽입한다.
     *
     * 반환값: JSON `{"ok":true,"rowCount":<N>,"colCount":<M>}`
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} row_idx
     * @param {boolean} below
     * @returns {string}
     */
    insertTableRow(section_idx, parent_para_idx, control_idx, row_idx, below) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_insertTableRow(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, row_idx, below);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 문단에 텍스트를 삽입한다.
     *
     * 삽입 후 구역을 재구성하고 재페이지네이션한다.
     * 반환값: JSON `{"ok":true,"charOffset":<new_offset>}`
     * @param {number} section_idx
     * @param {number} para_idx
     * @param {number} char_offset
     * @param {string} text
     * @returns {string}
     */
    insertText(section_idx, para_idx, char_offset, text) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_insertText(this.__wbg_ptr, section_idx, para_idx, char_offset, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * 표 셀 내부 문단에 텍스트를 삽입한다.
     *
     * 반환값: JSON `{"ok":true,"charOffset":<new_offset>}`
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @param {number} char_offset
     * @param {string} text
     * @returns {string}
     */
    insertTextInCell(section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset, text) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_insertTextInCell(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * 현재 문단을 이전 문단에 병합한다 (Backspace at start).
     *
     * para_idx의 텍스트가 para_idx-1에 결합되고 para_idx는 삭제된다.
     * 반환값: JSON `{"ok":true,"paraIdx":<merged_para_idx>,"charOffset":<merge_point>}`
     * @param {number} section_idx
     * @param {number} para_idx
     * @returns {string}
     */
    mergeParagraph(section_idx, para_idx) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_mergeParagraph(this.__wbg_ptr, section_idx, para_idx);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 표의 셀을 병합한다.
     *
     * 반환값: JSON `{"ok":true,"cellCount":<N>}`
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} start_row
     * @param {number} start_col
     * @param {number} end_row
     * @param {number} end_col
     * @returns {string}
     */
    mergeTableCells(section_idx, parent_para_idx, control_idx, start_row, start_col, end_row, end_col) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_mergeTableCells(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, start_row, start_col, end_row, end_col);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * HWP 파일 바이트를 로드하여 문서 객체를 생성한다.
     * @param {Uint8Array} data
     */
    constructor(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hwpdocument_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        HwpDocumentFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * 총 페이지 수를 반환한다.
     * @returns {number}
     */
    pageCount() {
        const ret = wasm.hwpdocument_pageCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * HTML 문자열을 파싱하여 캐럿 위치에 삽입한다 (본문).
     * @param {number} section_idx
     * @param {number} para_idx
     * @param {number} char_offset
     * @param {string} html
     * @returns {string}
     */
    pasteHtml(section_idx, para_idx, char_offset, html) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(html, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_pasteHtml(this.__wbg_ptr, section_idx, para_idx, char_offset, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * HTML 문자열을 파싱하여 셀 내부 캐럿 위치에 삽입한다.
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @param {number} char_offset
     * @param {string} html
     * @returns {string}
     */
    pasteHtmlInCell(section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset, html) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(html, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.hwpdocument_pasteHtmlInCell(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * 내부 클립보드의 내용을 캐럿 위치에 붙여넣는다 (본문 문단).
     *
     * 반환값: JSON `{"ok":true,"paraIdx":<idx>,"charOffset":<offset>}`
     * @param {number} section_idx
     * @param {number} para_idx
     * @param {number} char_offset
     * @returns {string}
     */
    pasteInternal(section_idx, para_idx, char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_pasteInternal(this.__wbg_ptr, section_idx, para_idx, char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 내부 클립보드의 내용을 표 셀 내부에 붙여넣는다.
     *
     * 반환값: JSON `{"ok":true,"cellParaIdx":<idx>,"charOffset":<offset>}`
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} cell_idx
     * @param {number} cell_para_idx
     * @param {number} char_offset
     * @returns {string}
     */
    pasteInternalInCell(section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_pasteInternalInCell(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, cell_idx, cell_para_idx, char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 특정 페이지를 Canvas 명령 수로 반환한다.
     * @param {number} page_num
     * @returns {number}
     */
    renderPageCanvas(page_num) {
        const ret = wasm.hwpdocument_renderPageCanvas(this.__wbg_ptr, page_num);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * 특정 페이지를 HTML 문자열로 렌더링한다.
     * @param {number} page_num
     * @returns {string}
     */
    renderPageHtml(page_num) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_renderPageHtml(this.__wbg_ptr, page_num);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 특정 페이지를 SVG 문자열로 렌더링한다.
     * @param {number} page_num
     * @returns {string}
     */
    renderPageSvg(page_num) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_renderPageSvg(this.__wbg_ptr, page_num);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 특정 페이지를 Canvas 2D에 직접 렌더링한다.
     *
     * WASM 환경에서만 사용 가능하다. Canvas 크기는 페이지 크기로 자동 설정된다.
     * @param {number} page_num
     * @param {HTMLCanvasElement} canvas
     */
    renderPageToCanvas(page_num, canvas) {
        const ret = wasm.hwpdocument_renderPageToCanvas(this.__wbg_ptr, page_num, canvas);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * DPI를 설정한다.
     * @param {number} dpi
     */
    setDpi(dpi) {
        wasm.hwpdocument_setDpi(this.__wbg_ptr, dpi);
    }
    /**
     * 대체 폰트 경로를 설정한다.
     * @param {string} path
     */
    setFallbackFont(path) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.hwpdocument_setFallbackFont(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * 문단부호(¶) 표시 여부를 설정한다.
     * @param {boolean} enabled
     */
    setShowParagraphMarks(enabled) {
        wasm.hwpdocument_setShowParagraphMarks(this.__wbg_ptr, enabled);
    }
    /**
     * 캐럿 위치에서 문단을 분할한다 (Enter 키).
     *
     * char_offset 이후의 텍스트가 새 문단으로 이동한다.
     * 반환값: JSON `{"ok":true,"paraIdx":<new_para_idx>,"charOffset":0}`
     * @param {number} section_idx
     * @param {number} para_idx
     * @param {number} char_offset
     * @returns {string}
     */
    splitParagraph(section_idx, para_idx, char_offset) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_splitParagraph(this.__wbg_ptr, section_idx, para_idx, char_offset);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 병합된 셀을 나눈다 (split).
     *
     * 반환값: JSON `{"ok":true,"cellCount":<N>}`
     * @param {number} section_idx
     * @param {number} parent_para_idx
     * @param {number} control_idx
     * @param {number} row
     * @param {number} col
     * @returns {string}
     */
    splitTableCell(section_idx, parent_para_idx, control_idx, row, col) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpdocument_splitTableCell(this.__wbg_ptr, section_idx, parent_para_idx, control_idx, row, col);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
}
if (Symbol.dispose) HwpDocument.prototype[Symbol.dispose] = HwpDocument.prototype.free;

/**
 * WASM 뷰어 컨트롤러 (뷰포트 관리 + 스케줄링)
 */
export class HwpViewer {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HwpViewerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hwpviewer_free(ptr, 0);
    }
    /**
     * 뷰어 생성
     * @param {HwpDocument} document
     */
    constructor(document) {
        _assertClass(document, HwpDocument);
        var ptr0 = document.__destroy_into_raw();
        const ret = wasm.hwpviewer_new(ptr0);
        this.__wbg_ptr = ret >>> 0;
        HwpViewerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * 총 페이지 수
     * @returns {number}
     */
    pageCount() {
        const ret = wasm.hwpdocument_pageCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * 대기 중인 렌더링 작업 수
     * @returns {number}
     */
    pendingTaskCount() {
        const ret = wasm.hwpviewer_pendingTaskCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * 특정 페이지 HTML 렌더링
     * @param {number} page_num
     * @returns {string}
     */
    renderPageHtml(page_num) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpviewer_renderPageHtml(this.__wbg_ptr, page_num);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 특정 페이지 SVG 렌더링
     * @param {number} page_num
     * @returns {string}
     */
    renderPageSvg(page_num) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.hwpviewer_renderPageSvg(this.__wbg_ptr, page_num);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * 줌 변경
     * @param {number} zoom
     */
    setZoom(zoom) {
        wasm.hwpviewer_setZoom(this.__wbg_ptr, zoom);
    }
    /**
     * 뷰포트 업데이트 (스크롤/리사이즈 시 호출)
     * @param {number} scroll_x
     * @param {number} scroll_y
     * @param {number} width
     * @param {number} height
     */
    updateViewport(scroll_x, scroll_y, width, height) {
        wasm.hwpviewer_updateViewport(this.__wbg_ptr, scroll_x, scroll_y, width, height);
    }
    /**
     * 현재 보이는 페이지 목록 반환
     * @returns {Uint32Array}
     */
    visiblePages() {
        const ret = wasm.hwpviewer_visiblePages(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) HwpViewer.prototype[Symbol.dispose] = HwpViewer.prototype.free;

/**
 * WASM panic hook 초기화 (한 번만 실행)
 */
export function init_panic_hook() {
    wasm.init_panic_hook();
}

/**
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_addColorStop_2f80f11dfad35dec: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            arg0.addColorStop(arg1, getStringFromWasm0(arg2, arg3));
        }, arguments); },
        __wbg_arcTo_ddf6b8adf3bf5084: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.arcTo(arg1, arg2, arg3, arg4, arg5);
        }, arguments); },
        __wbg_beginPath_9873f939d695759c: function(arg0) {
            arg0.beginPath();
        },
        __wbg_bezierCurveTo_38509204f815cfd5: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            arg0.bezierCurveTo(arg1, arg2, arg3, arg4, arg5, arg6);
        },
        __wbg_closePath_de4e48859360b1b1: function(arg0) {
            arg0.closePath();
        },
        __wbg_complete_40b841a95e35ff5a: function(arg0) {
            const ret = arg0.complete;
            return ret;
        },
        __wbg_createLinearGradient_b3d3d1a53abe5362: function(arg0, arg1, arg2, arg3, arg4) {
            const ret = arg0.createLinearGradient(arg1, arg2, arg3, arg4);
            return ret;
        },
        __wbg_createRadialGradient_b43c38d4bed3b571: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            const ret = arg0.createRadialGradient(arg1, arg2, arg3, arg4, arg5, arg6);
            return ret;
        }, arguments); },
        __wbg_drawImage_ca2a49df50c3765b: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.drawImage(arg1, arg2, arg3, arg4, arg5);
        }, arguments); },
        __wbg_ellipse_3343f79b255f83a4: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
            arg0.ellipse(arg1, arg2, arg3, arg4, arg5, arg6, arg7);
        }, arguments); },
        __wbg_error_7534b8e9a36f1ab4: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_fillRect_d44afec47e3a3fab: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.fillRect(arg1, arg2, arg3, arg4);
        },
        __wbg_fillText_4a931850b976cc62: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
        }, arguments); },
        __wbg_fill_1eb35c386c8676aa: function(arg0) {
            arg0.fill();
        },
        __wbg_getContext_2a5764d48600bc43: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_height_38750dc6de41ee75: function(arg0) {
            const ret = arg0.height;
            return ret;
        },
        __wbg_instanceof_CanvasRenderingContext2d_4bb052fd1c3d134d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof CanvasRenderingContext2D;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_lineTo_c584cff6c760c4a5: function(arg0, arg1, arg2) {
            arg0.lineTo(arg1, arg2);
        },
        __wbg_measureTextWidth_d533d274db15bbae: function(arg0, arg1, arg2, arg3) {
            const ret = globalThis.measureTextWidth(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
            return ret;
        },
        __wbg_moveTo_e9190fc700d55b40: function(arg0, arg1, arg2) {
            arg0.moveTo(arg1, arg2);
        },
        __wbg_naturalWidth_d899aa855a564eb0: function(arg0) {
            const ret = arg0.naturalWidth;
            return ret;
        },
        __wbg_new_3eb36ae241fe6f44: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_ed07138f2680efbf: function() { return handleError(function () {
            const ret = new Image();
            return ret;
        }, arguments); },
        __wbg_push_8ffdcb2063340ba5: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_restore_0d233789d098ba64: function(arg0) {
            arg0.restore();
        },
        __wbg_save_e0cc2e58b36d33c9: function(arg0) {
            arg0.save();
        },
        __wbg_scale_543277ecf8cf836b: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.scale(arg1, arg2);
        }, arguments); },
        __wbg_setLineDash_ecf27050368658c9: function() { return handleError(function (arg0, arg1) {
            arg0.setLineDash(arg1);
        }, arguments); },
        __wbg_set_fillStyle_783d3f7489475421: function(arg0, arg1, arg2) {
            arg0.fillStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_fillStyle_9bd3ccbe7ecf6c2a: function(arg0, arg1) {
            arg0.fillStyle = arg1;
        },
        __wbg_set_font_575685c8f7e56957: function(arg0, arg1, arg2) {
            arg0.font = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_height_f21f985387070100: function(arg0, arg1) {
            arg0.height = arg1 >>> 0;
        },
        __wbg_set_lineWidth_89fa506592f5b994: function(arg0, arg1) {
            arg0.lineWidth = arg1;
        },
        __wbg_set_src_55abd261cc86df86: function(arg0, arg1, arg2) {
            arg0.src = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_strokeStyle_087121ed5350b038: function(arg0, arg1, arg2) {
            arg0.strokeStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_width_d60bc4f2f20c56a4: function(arg0, arg1) {
            arg0.width = arg1 >>> 0;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_strokeRect_4da24de25ed7fbaf: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.strokeRect(arg1, arg2, arg3, arg4);
        },
        __wbg_stroke_240ea7f2407d73c0: function(arg0) {
            arg0.stroke();
        },
        __wbg_translate_3aa10730376a8c06: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.translate(arg1, arg2);
        }, arguments); },
        __wbg_width_5f66bde2e810fbde: function(arg0) {
            const ret = arg0.width;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./rhwp_bg.js": import0,
    };
}

const HwpDocumentFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hwpdocument_free(ptr >>> 0, 1));
const HwpViewerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hwpviewer_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('rhwp_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
