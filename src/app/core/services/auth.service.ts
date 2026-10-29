import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api-url';

export interface SessionUser {
  email: string;
  name: string;
}

interface Session {
  token: string;
  user: SessionUser;
}

const SESSION_KEY = 'streamdesk.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = inject(API_URL);

  private readonly session = signal<Session | null>(readSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly token = computed(() => this.session()?.token ?? null);

  login(email: string, password: string): Observable<Session> {
    return this.http.post<Session>(`${this.api}/auth/login`, { email, password }).pipe(
      tap((session) => {
        this.session.set(session);
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch {
          // Not persisted; the session still works until refresh.
        }
      }),
    );
  }

  logout(redirect = true): void {
    this.session.set(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    if (redirect) this.router.navigate(['/login']);
  }
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
