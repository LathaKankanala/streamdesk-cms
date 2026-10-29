import { InjectionToken } from '@angular/core';

/** Base URL of the REST API. Point this at a real backend to replace the mock. */
export const API_URL = new InjectionToken<string>('API_URL', { factory: () => '/api' });
