import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';
import { durationMatchesType, httpUrl, notBlank, notTooFarInFuture, uniqueTranslationLanguages, uniqueValue } from './validators';

describe('validators', () => {
  it('notBlank rejects whitespace-only strings', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ required: true });
    expect(notBlank(new FormControl('Hello'))).toBeNull();
  });

  it('httpUrl accepts empty and http(s) URLs only', () => {
    expect(httpUrl(new FormControl(''))).toBeNull();
    expect(httpUrl(new FormControl('https://cdn.example.com/a.jpg'))).toBeNull();
    expect(httpUrl(new FormControl('ftp://example.com'))).toEqual({ url: true });
    expect(httpUrl(new FormControl('not a url'))).toEqual({ url: true });
  });

  it('notTooFarInFuture rejects dates beyond the limit', () => {
    const farAhead = new Date();
    farAhead.setFullYear(farAhead.getFullYear() + 3);
    const validator = notTooFarInFuture(2);
    expect(validator(new FormControl(farAhead.toISOString().slice(0, 10)))).toEqual({ tooFarInFuture: { maxYearsAhead: 2 } });
    expect(validator(new FormControl('2024-01-01'))).toBeNull();
  });

  it('durationMatchesType requires duration except for live channels', () => {
    const group = new FormGroup(
      { type: new FormControl('Movie'), durationMinutes: new FormControl<number | null>(null) },
      { validators: durationMatchesType },
    );
    expect(group.controls.durationMinutes.hasError('durationRequired')).toBe(true);

    group.controls.type.setValue('Live Channel');
    expect(group.controls.durationMinutes.hasError('durationRequired')).toBe(false);
    expect(group.valid).toBe(true);
  });

  it('uniqueTranslationLanguages flags repeats of the primary or another translation', () => {
    const row = (language: string) => new FormGroup({ language: new FormControl(language), title: new FormControl('x') });
    const group = new FormGroup(
      { primaryLanguage: new FormControl('Hindi'), translations: new FormArray([row('Hindi'), row('Tamil'), row('Tamil')]) },
      { validators: uniqueTranslationLanguages },
    );
    const langs = group.controls.translations.controls.map((g) => g.controls.language.hasError('duplicateLanguage'));
    expect(langs).toEqual([true, false, true]);
    expect(group.hasError('duplicateLanguage')).toBe(true);
  });

  it('uniqueValue maps availability to a taken error', async () => {
    const taken = uniqueValue(() => of(false), 0);
    const free = uniqueValue(() => of(true), 0);
    expect(await firstValueFrom(taken(new FormControl('Dup')) as never)).toEqual({ taken: true });
    expect(await firstValueFrom(free(new FormControl('New')) as never)).toBeNull();
  });
});
