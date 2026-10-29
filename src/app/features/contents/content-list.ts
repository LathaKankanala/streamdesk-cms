import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { apiErrorMessage } from '../../core/interceptors/auth.interceptor';
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  Content,
  ContentQuery,
  DEFAULT_QUERY,
  LANGUAGES,
  Page,
  SortField,
} from '../../core/models/content.model';
import { ConfirmService } from '../../core/services/confirm.service';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { Poster } from '../../shared/poster';
import { toCsv } from './csv';

@Component({
  selector: 'app-content-list',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, Poster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-list.html',
})
export class ContentList {
  private readonly contents = inject(ContentService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly types = CONTENT_TYPES;
  protected readonly statuses = CONTENT_STATUSES;
  protected readonly languages = LANGUAGES;
  protected readonly pageSizes = [10, 20, 50];

  /** Filters live in the URL so a filtered view can be bookmarked or shared. */
  protected readonly query = toSignal(this.route.queryParamMap.pipe(map((p) => parseQuery(p))), {
    initialValue: DEFAULT_QUERY,
  });

  protected readonly search = new FormControl(this.query().q, { nonNullable: true });
  private readonly reload = signal(0);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly page = signal<Page<Content>>({ items: [], total: 0 });
  protected readonly selected = signal<ReadonlySet<number>>(new Set());

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.page().total / this.query().pageSize)));
  protected readonly rangeLabel = computed(() => {
    const { page, pageSize } = this.query();
    const total = this.page().total;
    if (!total) return '0 results';
    return `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`;
  });
  protected readonly allOnPageSelected = computed(
    () => this.page().items.length > 0 && this.page().items.every((c) => this.selected().has(c.id)),
  );
  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(q.q || q.type || q.status || q.language);
  });

  constructor() {
    this.search.valueChanges
      .pipe(
        map((v) => v.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.patch({ q, page: 1 }));

    combineLatest([toObservable(this.query), toObservable(this.reload)])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        // switchMap cancels the in-flight request when filters change quickly.
        switchMap(([query]) =>
          this.contents.list(query).pipe(
            catchError((err) => {
              this.error.set(apiErrorMessage(err));
              return of<Page<Content>>({ items: [], total: 0 });
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.page.set(page);
        this.loading.set(false);
      });
  }

  protected patch(change: Partial<ContentQuery>): void {
    const next = { ...this.query(), ...change };
    const queryParams: Params = {};
    for (const [key, value] of Object.entries(next)) {
      queryParams[key] = value === DEFAULT_QUERY[key as keyof ContentQuery] ? null : value;
    }
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }

  protected filter(key: 'type' | 'status' | 'language', value: string): void {
    this.patch({ [key]: value, page: 1 });
  }

  protected sortBy(field: SortField): void {
    const q = this.query();
    const order = q.sort === field && q.order === 'asc' ? 'desc' : 'asc';
    this.patch({ sort: field, order });
  }

  protected sortIcon(field: SortField): string {
    const q = this.query();
    return q.sort !== field ? '↕' : q.order === 'asc' ? '↑' : '↓';
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.patch({ q: '', type: '', status: '', language: '', page: 1 });
  }

  protected toggle(id: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    const ids = this.page().items.map((c) => c.id);
    this.selected.update((set) => {
      const next = new Set(set);
      if (this.allOnPageSelected()) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  protected otherLanguages(c: Content): string {
    return c.translations.map((t) => t.language).join(', ');
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected async remove(content: Content): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete content?',
      message: `"${content.title}" will be permanently removed from the catalogue.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.contents.delete(content.id).subscribe({
      next: () => {
        this.toast.success(`Deleted "${content.title}".`);
        this.selected.update((s) => new Set([...s].filter((id) => id !== content.id)));
        this.afterDelete(1);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  protected async removeSelected(): Promise<void> {
    const ids = [...this.selected()];
    const ok = await this.confirm.ask({
      title: `Delete ${ids.length} item${ids.length > 1 ? 's' : ''}?`,
      message: 'The selected titles will be permanently removed from the catalogue.',
      confirmText: 'Delete all',
      danger: true,
    });
    if (!ok) return;
    this.contents.bulkDelete(ids).subscribe({
      next: (n) => {
        this.toast.success(`Deleted ${n} item${n > 1 ? 's' : ''}.`);
        this.selected.set(new Set());
        this.afterDelete(n);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  protected exportCsv(): void {
    this.contents.list({ ...this.query(), page: 1, pageSize: 10_000 }).subscribe({
      next: ({ items }) => {
        const blob = new Blob([toCsv(items)], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `streamdesk-contents-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.toast.info(`Exported ${items.length} rows.`);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  /** Step back a page if the delete emptied the current one, otherwise just refetch. */
  private afterDelete(removed: number): void {
    const q = this.query();
    const remaining = this.page().total - removed;
    const lastPage = Math.max(1, Math.ceil(remaining / q.pageSize));
    if (q.page > lastPage) this.patch({ page: lastPage });
    else this.reload.update((n) => n + 1);
  }
}

function parseQuery(p: { get(name: string): string | null }): ContentQuery {
  const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | '' =>
    allowed.includes(value as T) ? (value as T) : '';
  const sortFields: SortField[] = ['title', 'type', 'status', 'releaseDate', 'updatedAt'];
  return {
    q: p.get('q') ?? '',
    type: pick(p.get('type'), CONTENT_TYPES),
    status: pick(p.get('status'), CONTENT_STATUSES),
    language: pick(p.get('language'), LANGUAGES),
    sort: pick(p.get('sort'), sortFields) || DEFAULT_QUERY.sort,
    order: p.get('order') === 'asc' ? 'asc' : p.get('order') === 'desc' ? 'desc' : DEFAULT_QUERY.order,
    page: Math.max(1, Number(p.get('page')) || 1),
    pageSize: [10, 20, 50].includes(Number(p.get('pageSize'))) ? Number(p.get('pageSize')) : DEFAULT_QUERY.pageSize,
  };
}
