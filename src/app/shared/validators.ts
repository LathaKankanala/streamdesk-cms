import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

/** Like Validators.required, but rejects values that are only whitespace. */
export const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim().length === 0 ? { required: true } : null;

/** Optional field; when filled it must be an absolute http(s) URL. */
export const httpUrl: ValidatorFn = (control) => {
  const value = (control.value ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
};

/** Date (yyyy-mm-dd) must not be later than `maxYearsAhead` years from today. */
export function notTooFarInFuture(maxYearsAhead: number): ValidatorFn {
  return (control) => {
    if (!control.value) return null;
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() + maxYearsAhead);
    return new Date(control.value) > limit ? { tooFarInFuture: { maxYearsAhead } } : null;
  };
}

/** Group validator: runtime is required for on-demand content, but not for live channels. */
export const durationMatchesType: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const type = group.get('type')?.value;
  const duration = group.get('durationMinutes');
  if (!duration) return null;
  const missing = type !== 'Live Channel' && (duration.value === null || duration.value === '');
  setControlError(duration, 'durationRequired', missing);
  return null;
};

/**
 * Group validator: translations must not repeat a language or duplicate the primary language.
 * Marks the offending translation rows so the error shows next to the right field.
 */
export const uniqueTranslationLanguages: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const primary = group.get('primaryLanguage')?.value;
  const rows = (group.get('translations') as unknown as { controls: AbstractControl[] } | null)?.controls ?? [];
  const seen = new Set<string>([primary]);
  let invalid = false;
  for (const row of rows) {
    const lang = row.get('language');
    if (!lang) continue;
    const duplicate = !!lang.value && seen.has(lang.value);
    setControlError(lang, 'duplicateLanguage', duplicate);
    invalid ||= duplicate;
    seen.add(lang.value);
  }
  return invalid ? { duplicateLanguage: true } : null;
};

/** Debounced server-side uniqueness check, e.g. for content titles. */
export function uniqueValue(
  isAvailable: (value: string) => Observable<boolean>,
  debounceMs = 400,
): AsyncValidatorFn {
  return (control) => {
    const value = (control.value ?? '').trim();
    if (!value) return of(null);
    return timer(debounceMs).pipe(
      switchMap(() => isAvailable(value)),
      map((available) => (available ? null : { taken: true })),
      catchError(() => of(null)), // never block the form on a network hiccup
    );
  };
}

function setControlError(control: AbstractControl, key: string, on: boolean): void {
  const errors = { ...(control.errors ?? {}) };
  if (on) errors[key] = true;
  else delete errors[key];
  const next = Object.keys(errors).length ? errors : null;
  if (JSON.stringify(next) !== JSON.stringify(control.errors)) control.setErrors(next);
}
