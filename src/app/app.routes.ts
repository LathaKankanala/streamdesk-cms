import { Routes } from '@angular/router';
import { authGuard, guestGuard, unsavedChangesGuard } from './core/guards/auth.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · StreamDesk',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · StreamDesk',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'contents',
        title: 'Content Library · StreamDesk',
        loadComponent: () => import('./features/contents/content-list').then((m) => m.ContentList),
      },
      {
        path: 'contents/new',
        title: 'Add content · StreamDesk',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./features/contents/content-form').then((m) => m.ContentForm),
      },
      {
        path: 'contents/:id/edit',
        title: 'Edit content · StreamDesk',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./features/contents/content-form').then((m) => m.ContentForm),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
