import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, dematerialize, materialize, of, throwError } from 'rxjs';
import { ContentPayload, ContentQuery, DEFAULT_QUERY } from '../models/content.model';
import { MockDb } from './mock-db';

export const DEMO_USER = { email: 'admin@streamdesk.dev', password: 'Admin@123', name: 'Demo Admin' };

const db = new MockDb();
const LATENCY_MS = 350;

/**
 * Fake REST backend so the deployed demo works on static hosting.
 * Remove it from app.config.ts and set environment.apiUrl to talk to a real server.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  const path = req.url.replace(/^\/api/, '').split('?')[0];
  const idMatch = path.match(/^\/contents\/(\d+)$/);
  const id = idMatch ? Number(idMatch[1]) : NaN;

  if (path === '/auth/login' && req.method === 'POST') return login(req);
  if (!req.headers.get('Authorization')?.startsWith('Bearer ')) return fail(401, 'Session expired. Please sign in again.');

  switch (true) {
    case path === '/stats' && req.method === 'GET':
      return ok(db.stats());
    case path === '/contents' && req.method === 'GET':
      return ok(db.query(readQuery(req)));
    case path === '/contents/title-available' && req.method === 'GET':
      return ok({
        available: !db.titleExists(req.params.get('title') ?? '', Number(req.params.get('excludeId')) || undefined),
      });
    case path === '/contents' && req.method === 'POST':
      return save(req as HttpRequest<ContentPayload>);
    case path === '/contents/bulk-delete' && req.method === 'POST':
      return ok({ deleted: db.delete((req.body as { ids: number[] }).ids) });
    case !!idMatch && req.method === 'GET': {
      const row = db.get(id);
      return row ? ok(row) : fail(404, 'Content not found.');
    }
    case !!idMatch && req.method === 'PUT':
      return save(req as HttpRequest<ContentPayload>, id);
    case !!idMatch && req.method === 'DELETE':
      return db.delete([id]) ? ok(null, 204) : fail(404, 'Content not found.');
    case path === '/reset' && req.method === 'POST':
      db.reset();
      return ok(null, 204);
    default:
      return fail(404, `No mock route for ${req.method} ${path}`);
  }
};

function login(req: HttpRequest<unknown>) {
  const { email, password } = req.body as { email: string; password: string };
  if (email?.toLowerCase() !== DEMO_USER.email || password !== DEMO_USER.password) {
    return fail(401, 'Invalid email or password.');
  }
  return ok({ token: `demo.${btoa(email)}.${Date.now()}`, user: { email: DEMO_USER.email, name: DEMO_USER.name } });
}

function save(req: HttpRequest<ContentPayload>, id?: number) {
  const body = req.body;
  if (!body?.title?.trim()) return fail(400, 'Title is required.');
  if (db.titleExists(body.title, id)) return fail(409, `"${body.title}" already exists.`);
  if (id === undefined) return ok(db.create(body), 201);
  const row = db.update(id, body);
  return row ? ok(row) : fail(404, 'Content not found.');
}

function readQuery(req: HttpRequest<unknown>): ContentQuery {
  const p = req.params;
  return {
    q: p.get('q') ?? DEFAULT_QUERY.q,
    type: (p.get('type') ?? '') as ContentQuery['type'],
    status: (p.get('status') ?? '') as ContentQuery['status'],
    language: (p.get('language') ?? '') as ContentQuery['language'],
    sort: (p.get('sort') ?? DEFAULT_QUERY.sort) as ContentQuery['sort'],
    order: p.get('order') === 'asc' ? 'asc' : 'desc',
    page: Number(p.get('page')) || DEFAULT_QUERY.page,
    pageSize: Number(p.get('pageSize')) || DEFAULT_QUERY.pageSize,
  };
}

function ok<T>(body: T, status = 200): Observable<HttpEvent<T>> {
  return of(new HttpResponse({ status, body })).pipe(delay(LATENCY_MS));
}

function fail(status: number, message: string): Observable<never> {
  // materialize/dematerialize so the delay applies to the error as well.
  return throwError(() => new HttpErrorResponse({ status, error: { message } })).pipe(
    materialize(),
    delay(LATENCY_MS),
    dematerialize(),
  );
}
