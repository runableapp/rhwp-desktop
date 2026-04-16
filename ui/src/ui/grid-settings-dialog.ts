import { ModalDialog } from './dialog';

/**
 * 격자 설정 대화상자 — 표/개체 이동 간격(mm)을 설정한다.
 */
export class GridSettingsDialog extends ModalDialog {
  private gridInput!: HTMLInputElement;
  private callback: (mm: number) => void;
  private currentMm: number;

  constructor(currentMm: number, onConfirm: (mm: number) => void) {
    super('격자 설정', 300);
    this.currentMm = currentMm;
    this.callback = onConfirm;
  }

  protected createBody(): HTMLElement {
    const body = document.createElement('div');
    body.style.padding = '16px';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px';

    const label = document.createElement('label');
    label.textContent = '이동 간격:';

    this.gridInput = document.createElement('input');
    this.gridInput.type = 'number';
    this.gridInput.min = '0.5';
    this.gridInput.max = '50';
    this.gridInput.step = '0.5';
    this.gridInput.value = String(this.currentMm);
    this.gridInput.style.width = '80px';

    const unit = document.createElement('span');
    unit.textContent = 'mm';

    row.append(label, this.gridInput, unit);
    body.appendChild(row);
    return body;
  }

  protected onConfirm(): void {
    const v = parseFloat(this.gridInput.value);
    if (!isNaN(v) && v >= 0.5 && v <= 50) {
      this.callback(v);
    }
  }
}
