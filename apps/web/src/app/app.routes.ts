import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'overlay', pathMatch: 'full' },
  {
    path: 'overlay',
    loadComponent: () => import('./overlay/overlay.component').then(m => m.OverlayComponent)
  },
  {
    path: 'streamer',
    loadComponent: () => import('./streamer/streamer.component').then(m => m.StreamerComponent)
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
  }
];
