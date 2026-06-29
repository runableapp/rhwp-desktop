/**
 * 제품 정보 / 라이센스 다이얼로그
 *
 * RHWP Desktop 애플리케이션 정보와 사용된 외부 크레이트의 오픈소스 라이선스 목록을 표시한다.
 */
import '../styles/about-desktop.css';
import { ModalDialog } from './dialog';

function openUrlInExternalBrowser(url: string): void {
  if (window.hwpDesktop?.openExternal) {
    void window.hwpDesktop.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function wireExternalLink(anchor: HTMLAnchorElement): void {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    openUrlInExternalBrowser(anchor.href);
  });
}

const THIRD_PARTY_LICENSES = [
  { name: 'rhwp', license: 'MIT' },
  { name: 'wasm-bindgen', license: 'MIT / Apache-2.0' },
  { name: 'web-sys', license: 'MIT / Apache-2.0' },
  { name: 'js-sys', license: 'MIT / Apache-2.0' },
  { name: 'cfb', license: 'MIT' },
  { name: 'flate2', license: 'MIT / Apache-2.0' },
  { name: 'byteorder', license: 'MIT / Unlicense' },
  { name: 'base64', license: 'MIT / Apache-2.0' },
  { name: 'console_error_panic_hook', license: 'MIT / Apache-2.0' },
];

export class AboutDialog extends ModalDialog {
  constructor() {
    super('제품 정보', 460);
  }

  protected createBody(): HTMLElement {
    const body = document.createElement('div');
    body.className = 'about-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'about-title-row';
    const titleMain = document.createElement('span');
    titleMain.className = 'about-product-name';
    titleMain.textContent = 'RHWP Desktop';
    titleRow.appendChild(titleMain);
    const versionInline = document.createElement('span');
    versionInline.className = 'about-version-inline';
    versionInline.textContent = 'Version';
    titleRow.appendChild(versionInline);
    body.appendChild(titleRow);

    const titleKoRow = document.createElement('div');
    titleKoRow.className = 'about-product-name-ko-row';
    const titleKoLabel = document.createElement('span');
    titleKoLabel.textContent = 'rhwp 데스크톱 래퍼';
    titleKoRow.appendChild(titleKoLabel);
    const desktopRepo = document.createElement('a');
    desktopRepo.href = 'https://github.com/runableapp/rhwp-desktop';
    desktopRepo.textContent = 'https://github.com/runableapp/rhwp-desktop';
    desktopRepo.className = 'about-external-link';
    wireExternalLink(desktopRepo);
    titleKoRow.appendChild(desktopRepo);
    body.appendChild(titleKoRow);

    const wrapDesc = document.createElement('div');
    wrapDesc.className = 'about-wrap-desc';
    wrapDesc.textContent =
      '이 프로그램은 rhwp를 데스크톱 애플리케이션으로 실행할 수 있게 하는 래퍼입니다.';
    body.appendChild(wrapDesc);

    const rhwpRepo = document.createElement('div');
    rhwpRepo.className = 'about-rhwp-repo';
    rhwpRepo.appendChild(document.createTextNode('rhwp '));
    const rhwpGh = document.createElement('a');
    rhwpGh.href = 'https://github.com/edwardkim/rhwp';
    rhwpGh.textContent = 'https://github.com/edwardkim/rhwp';
    rhwpGh.className = 'about-external-link';
    wireExternalLink(rhwpGh);
    rhwpRepo.appendChild(rhwpGh);
    body.appendChild(rhwpRepo);

    const licenseTitle = document.createElement('div');
    licenseTitle.className = 'about-license-title';
    licenseTitle.textContent = '오픈소스 라이선스';
    body.appendChild(licenseTitle);

    const licenseTable = document.createElement('table');
    licenseTable.className = 'about-license-table';
    for (const lib of THIRD_PARTY_LICENSES) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.textContent = lib.name;
      const tdLicense = document.createElement('td');
      tdLicense.textContent = lib.license;
      tr.appendChild(tdName);
      tr.appendChild(tdLicense);
      licenseTable.appendChild(tr);
    }
    body.appendChild(licenseTable);

    const copyright = document.createElement('div');
    copyright.className = 'about-copyright';
    copyright.textContent = '\u00A9 2026 Runable.app';
    body.appendChild(copyright);

    return body;
  }

  private async hydrateVersion(): Promise<void> {
    const el = this.dialog.querySelector<HTMLElement>('.about-version-inline');
    if (!el) return;

    if (window.hwpDesktop?.getVersion) {
      try {
        const v = await window.hwpDesktop.getVersion();
        el.textContent = `Version ${v}`;
        return;
      } catch {
        // fall through
      }
    }

    const uiVersion = (globalThis as any).__APP_VERSION__ as string | undefined;
    if (uiVersion) {
      el.textContent = `Version ${uiVersion}`;
    }
  }

  protected onConfirm(): void {
    // 정보 표시 전용 — 확인 동작 없음
  }

  override show(): void {
    super.show();
    void this.hydrateVersion();
    const footer = this.dialog.querySelector('.dialog-footer');
    if (footer) {
      footer.innerHTML = '';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'dialog-btn dialog-btn-primary';
      closeBtn.textContent = '닫기';
      closeBtn.addEventListener('click', () => this.hide());
      footer.appendChild(closeBtn);
    }
  }
}
