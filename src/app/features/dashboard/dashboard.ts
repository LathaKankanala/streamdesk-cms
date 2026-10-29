import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/interceptors/auth.interceptor';
import { CONTENT_TYPES, DashboardStats } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { Poster } from '../../shared/poster';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, Poster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly contents = inject(ContentService);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly error = signal('');

  protected readonly typeRows = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const max = Math.max(1, ...CONTENT_TYPES.map((t) => s.byType[t]));
    return CONTENT_TYPES.map((type) => ({ type, count: s.byType[type], pct: (s.byType[type] / max) * 100 }));
  });

  protected readonly publishRate = computed(() => {
    const s = this.stats();
    return s && s.total ? Math.round((s.byStatus.Published / s.total) * 100) : 0;
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.error.set('');
    this.contents.stats().subscribe({
      next: (s) => this.stats.set(s),
      error: (err) => this.error.set(apiErrorMessage(err)),
    });
  }
}
