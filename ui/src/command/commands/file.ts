import type { CommandDef } from '../types';
import { PageSetupDialog } from '@/ui/page-setup-dialog';
import { AboutDialog } from '@/ui/about-dialog';
import { showConfirm } from '@/ui/confirm-dialog';
import { showSaveAs } from '@/ui/save-as-dialog';

// File System Access API (Chrome/Edge)
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  }
}

export const fileCommands: CommandDef[] = [
  {
    id: 'file:new-doc',
    label: '새로 만들기',
    icon: 'icon-new-doc',
    shortcutLabel: 'Alt+N',
    canExecute: () => true,
    async execute(services) {
      const ctx = services.getContext();
      if (ctx.hasDocument) {
        const ok = await showConfirm(
          '새로 만들기',
          '현재 문서를 닫고 새 문서를 만드시겠습니까?\n저장하지 않은 내용은 사라집니다.',
        );
        if (!ok) return;
      }
      services.eventBus.emit('create-new-document');
    },
  },
  {
    id: 'file:open',
    label: '열기',
    execute(services) {
      if (window.hwpDesktop?.openFile) {
        services.eventBus.emit('request-open-document');
        return;
      }
      document.getElementById('file-input')?.click();
    },
  },
  {
    id: 'file:save',
    label: '저장',
    icon: 'icon-save',
    shortcutLabel: 'Ctrl+S',
    canExecute: (ctx) => ctx.hasDocument,
    async execute(services) {
      try {
        const saveName = services.wasm.fileName;
        const bytes = services.wasm.exportHwp();
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/x-hwp' });

        // 0) Electron desktop bridge 사용 시 OS 저장 대화상자 사용
        if (window.hwpDesktop?.saveFile) {
          const res = await window.hwpDesktop.saveFile(saveName, bytes);
          if (!res.ok) return;
          services.wasm.fileName = res.path.split(/[\\/]/).pop() || saveName;
          services.eventBus.emit('document-title-changed', services.wasm.fileName);
          console.log(`[file:save] ${res.path} (${(bytes.length / 1024).toFixed(1)}KB)`);
          return;
        }

        // 1) File System Access API 지원 시 네이티브 저장 대화상자 사용
        if ('showSaveFilePicker' in window) {
          try {
            const handle = await window.showSaveFilePicker!({
              suggestedName: saveName,
              types: [{
                description: 'HWP 문서',
                accept: { 'application/x-hwp': ['.hwp'] },
              }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            services.wasm.fileName = handle.name;
            services.eventBus.emit('document-title-changed', services.wasm.fileName);
            console.log(`[file:save] ${handle.name} (${(bytes.length / 1024).toFixed(1)}KB)`);
            return;
          } catch (e) {
            // 사용자가 취소하면 AbortError 발생 — 무시
            if (e instanceof DOMException && e.name === 'AbortError') return;
            // 그 외 오류는 폴백으로 진행
            console.warn('[file:save] File System Access API 실패, 폴백:', e);
          }
        }

        // 2) 폴백: 새 문서인 경우 자체 파일이름 대화상자 표시
        let downloadName = saveName;
        if (services.wasm.isNewDocument) {
          const baseName = saveName.replace(/\.hwp$/i, '');
          const result = await showSaveAs(baseName);
          if (!result) return;
          downloadName = result;
          services.wasm.fileName = downloadName;
          services.eventBus.emit('document-title-changed', services.wasm.fileName);
        }

        // 3) Blob 다운로드
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        console.log(`[file:save] ${downloadName} (${(bytes.length / 1024).toFixed(1)}KB)`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[file:save] 저장 실패:', msg);
        alert(`파일 저장에 실패했습니다:\n${msg}`);
      }
    },
  },
  {
    id: 'file:page-setup',
    label: '편집 용지',
    icon: 'icon-page-setup',
    shortcutLabel: 'F7',
    canExecute: (ctx) => ctx.hasDocument,
    execute(services) {
      const dialog = new PageSetupDialog(services.wasm, services.eventBus, 0);
      dialog.show();
    },
  },
  {
    id: 'file:print',
    label: '인쇄',
    icon: 'icon-print',
    shortcutLabel: 'Ctrl+P',
    canExecute: (ctx) => ctx.hasDocument,
    async execute(services) {
      const wasm = services.wasm;
      const pageCount = wasm.pageCount;
      if (pageCount === 0) return;

      // 진행률 표시
      const statusEl = document.getElementById('sb-message');
      const origStatus = statusEl?.textContent || '';

      try {
        // SVG 페이지 생성
        const svgPages: string[] = [];
        for (let i = 0; i < pageCount; i++) {
          if (statusEl) statusEl.textContent = `인쇄 준비 중... (${i + 1}/${pageCount})`;
          const svg = wasm.renderPageSvg(i);
          svgPages.push(svg);
          // UI 갱신을 위한 양보
          if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }

        // 첫 페이지 정보로 용지 크기 결정
        const pageInfo = wasm.getPageInfo(0);
        const widthMm = Math.round(pageInfo.width * 25.4 / 96);
        const heightMm = Math.round(pageInfo.height * 25.4 / 96);

        // 팝업(window.open) 없이 인쇄: 숨은 iframe에 문서를 넣고 print() 호출
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);

        const cleanup = () => {
          try {
            iframe.remove();
          } catch {
            // ignore
          }
        };

        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) {
          cleanup();
          alert('인쇄 초기화에 실패했습니다. (iframe 접근 실패)');
          return;
        }

        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${wasm.fileName} — 인쇄</title>
<style>
  @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
  * { margin: 0; padding: 0; }
  body { background: #fff; }
  .page { page-break-after: always; width: ${widthMm}mm; height: ${heightMm}mm; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  .page svg { width: 100%; height: 100%; }
</style>
</head>
<body>
${svgPages.map(svg => `<div class="page">${svg}</div>`).join('\n')}

</body>
</html>`);
        doc.close();

        // 인쇄 후 iframe 정리
        const onAfterPrint = () => {
          win.removeEventListener('afterprint', onAfterPrint);
          cleanup();
        };
        win.addEventListener('afterprint', onAfterPrint);

        // 렌더링 한 틱 양보 후 인쇄 (일부 브라우저에서 빈 페이지 방지)
        await new Promise(r => setTimeout(r, 0));
        win.focus();
        win.print();

        if (statusEl) statusEl.textContent = origStatus;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[file:print]', msg);
        if (statusEl) statusEl.textContent = `인쇄 실패: ${msg}`;
      }
    },
  },
  {
    id: 'file:about',
    label: '제품 정보',
    icon: 'icon-help',
    execute() {
      new AboutDialog().show();
    },
  },
];
