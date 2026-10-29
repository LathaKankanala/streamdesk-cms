import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Content, ContentPayload, ContentQuery, DashboardStats, Page } from '../models/content.model';
import { API_URL } from './api-url';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private readonly base = `${this.api}/contents`;

  list(query: ContentQuery): Observable<Page<Content>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== '' && value !== null && value !== undefined) params = params.set(key, String(value));
    }
    return this.http.get<Page<Content>>(this.base, { params });
  }

  get(id: number): Observable<Content> {
    return this.http.get<Content>(`${this.base}/${id}`);
  }

  create(payload: ContentPayload): Observable<Content> {
    return this.http.post<Content>(this.base, payload);
  }

  update(id: number, payload: ContentPayload): Observable<Content> {
    return this.http.put<Content>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  bulkDelete(ids: number[]): Observable<number> {
    return this.http.post<{ deleted: number }>(`${this.base}/bulk-delete`, { ids }).pipe(map((r) => r.deleted));
  }

  isTitleAvailable(title: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('title', title);
    if (excludeId) params = params.set('excludeId', excludeId);
    return this.http
      .get<{ available: boolean }>(`${this.base}/title-available`, { params })
      .pipe(map((r) => r.available));
  }

  stats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.api}/stats`);
  }

  resetDemoData(): Observable<void> {
    return this.http.post<void>(`${this.api}/reset`, {});
  }
}
