import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../core/services/confirm.service';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.kind">
          <span>{{ t.message }}</span>
          <button type="button" class="icon-btn" (click)="toast.dismiss(t.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toast = inject(ToastService);
}

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="dialog" (close)="confirm.close(false)" (click)="onBackdrop($event)">
      @if (confirm.pending(); as p) {
        <h2>{{ p.title }}</h2>
        <p>{{ p.message }}</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" (click)="confirm.close(false)">Cancel</button>
          <button type="button" class="btn" [class.btn-danger]="p.danger" [class.btn-primary]="!p.danger"
                  (click)="confirm.close(true)">{{ p.confirmText ?? 'Confirm' }}</button>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.confirm.pending() && !el.open) el.showModal();
      if (!this.confirm.pending() && el.open) el.close();
    });
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.confirm.close(false);
  }
}
