import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, startWith } from 'rxjs';
import { HasUnsavedChanges } from '../../core/guards/auth.guard';
import { apiErrorMessage } from '../../core/interceptors/auth.interceptor';
import {
  AGE_RATINGS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  Content,
  ContentPayload,
  GENRES,
  LANGUAGES,
  Language,
} from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { Poster } from '../../shared/poster';
import {
  durationMatchesType,
  httpUrl,
  notBlank,
  notTooFarInFuture,
  uniqueTranslationLanguages,
  uniqueValue,
} from '../../shared/validators';

type TranslationGroup = FormGroup<{ language: FormControl<Language>; title: FormControl<string> }>;

@Component({
  selector: 'app-content-form',
  imports: [ReactiveFormsModule, RouterLink, Poster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-form.html',
})
export class ContentForm implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly contents = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Bound from the `:id` route param; absent when creating. */
  readonly id = input<string>();
  protected readonly contentId = computed(() => (this.id() ? Number(this.id()) : undefined));
  protected readonly isEdit = computed(() => this.contentId() !== undefined);

  protected readonly types = CONTENT_TYPES;
  protected readonly statuses = CONTENT_STATUSES;
  protected readonly languages = LANGUAGES;
  protected readonly genres = GENRES;
  protected readonly ratings = AGE_RATINGS;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');
  private saved = false;

  protected readonly form = this.fb.group(
    {
      title: this.fb.control('', {
        validators: [Validators.required, notBlank, Validators.maxLength(120)],
        asyncValidators: [uniqueValue((t) => this.contents.isTitleAvailable(t, this.contentId()))],
      }),
      type: this.fb.control<Content['type']>('Movie'),
      genre: this.fb.control('Drama', Validators.required),
      primaryLanguage: this.fb.control<Language>('English'),
      translations: this.fb.array<TranslationGroup>([]),
      status: this.fb.control<Content['status']>('Draft'),
      ageRating: this.fb.control<Content['ageRating']>('U/A 13+'),
      releaseDate: this.fb.control(new Date().toISOString().slice(0, 10), [Validators.required, notTooFarInFuture(2)]),
      durationMinutes: new FormControl<number | null>(null, [Validators.min(1), Validators.max(600)]),
      thumbnailUrl: this.fb.control('', httpUrl),
      description: this.fb.control('', Validators.maxLength(500)),
      tags: this.fb.control(''),
    },
    { validators: [durationMatchesType, uniqueTranslationLanguages] },
  );

  protected readonly c = this.form.controls;
  protected readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), {
    initialValue: this.form.value,
  });
  protected readonly isLive = computed(() => this.value().type === 'Live Channel');
  protected readonly descriptionLength = computed(() => this.value().description?.length ?? 0);

  ngOnInit(): void {
    const id = this.contentId();
    if (id === undefined) return;
    this.loading.set(true);
    this.contents
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (content) => this.fill(content),
        error: (err) => this.loadError.set(apiErrorMessage(err)),
      });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved;
  }

  protected get translations(): FormArray<TranslationGroup> {
    return this.c.translations;
  }

  protected addTranslation(language?: Language, title = ''): void {
    const used = new Set([this.c.primaryLanguage.value, ...this.translations.controls.map((g) => g.value.language)]);
    const next = language ?? LANGUAGES.find((l) => !used.has(l)) ?? 'English';
    this.translations.push(
      this.fb.group({
        language: this.fb.control<Language>(next),
        title: this.fb.control(title, [Validators.required, notBlank, Validators.maxLength(120)]),
      }),
    );
    this.translations.markAsDirty();
  }

  protected removeTranslation(index: number): void {
    this.translations.removeAt(index);
    this.translations.markAsDirty();
  }

  protected showError(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      if (!this.form.pending) this.toast.error('Please fix the highlighted fields.');
      return;
    }

    const id = this.contentId();
    const request = id === undefined ? this.contents.create(this.toPayload()) : this.contents.update(id, this.toPayload());
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.saved = true;
        this.toast.success(id === undefined ? `Created "${saved.title}".` : `Saved changes to "${saved.title}".`);
        this.router.navigate(['/contents']);
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.c.title.setErrors({ taken: true });
          this.c.title.markAsTouched();
        }
        this.toast.error(apiErrorMessage(err));
      },
    });
  }

  private fill(content: Content): void {
    this.translations.clear();
    content.translations.forEach((t) => this.addTranslation(t.language, t.title));
    this.form.reset({
      ...content,
      translations: content.translations,
      tags: content.tags.join(', '),
    });
    this.form.markAsPristine();
  }

  private toPayload(): ContentPayload {
    const v = this.form.getRawValue();
    return {
      ...v,
      title: v.title.trim(),
      description: v.description.trim(),
      thumbnailUrl: v.thumbnailUrl.trim(),
      durationMinutes: v.type === 'Live Channel' ? null : v.durationMinutes,
      translations: v.translations.map((t) => ({ language: t.language, title: t.title.trim() })),
      tags: [...new Set(v.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))],
    };
  }
}
