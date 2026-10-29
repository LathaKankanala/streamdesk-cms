import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_QUERY } from '../models/content.model';
import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only non-empty query params', () => {
    service.list({ ...DEFAULT_QUERY, q: 'drama', status: 'Draft' }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/contents');
    expect(req.request.params.get('q')).toBe('drama');
    expect(req.request.params.get('status')).toBe('Draft');
    expect(req.request.params.has('type')).toBe(false);
    req.flush({ items: [], total: 0 });
  });

  it('maps title availability response to a boolean', () => {
    let available: boolean | undefined;
    service.isTitleAvailable('X', 4).subscribe((v) => (available = v));
    const req = http.expectOne((r) => r.url === '/api/contents/title-available');
    expect(req.request.params.get('excludeId')).toBe('4');
    req.flush({ available: false });
    expect(available).toBe(false);
  });

  it('uses PUT for updates and DELETE for removal', () => {
    service.update(7, {} as never).subscribe();
    expect(http.expectOne('/api/contents/7').request.method).toBe('PUT');
    service.delete(7).subscribe();
    expect(http.expectOne('/api/contents/7').request.method).toBe('DELETE');
    http.match(() => true).forEach((r) => r.flush(null));
  });
});
