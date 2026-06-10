import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { I18nService } from './i18n/i18n.service';
import { SupabaseService } from './core/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="topbar">
      <a routerLink="/" class="brand">{{ i18n.t('appTitle') }}</a>
      <nav>
        <a routerLink="/">{{ i18n.t('list') }}</a>
        <a routerLink="/group">{{ i18n.t('group') }}</a>
        <a routerLink="/login">{{ i18n.t('login') }}</a>
      </nav>
      <div class="row">
        <button class="secondary" type="button" (click)="i18n.setLang(i18n.lang() === 'pl' ? 'en' : 'pl')">{{ i18n.lang().toUpperCase() }}</button>
        @if (supabase.user()) {
          <button class="secondary" type="button" (click)="supabase.signOut()">{{ i18n.t('signOut') }}</button>
        }
      </div>
    </header>
    <main class="container"><router-outlet /></main>
  `,
  styles: [`
    .topbar { display:flex; align-items:center; gap:1rem; padding: .85rem 1rem; background:white; border-bottom:1px solid #e2e8f0; position:sticky; top:0; z-index:1; }
    .brand { font-size:1.1rem; font-weight:900; color:#0f172a; text-decoration:none; }
    nav { display:flex; gap:.75rem; flex:1; flex-wrap:wrap; }
    nav a { color:#334155; text-decoration:none; font-weight:700; }
    @media (max-width: 640px) { .topbar { align-items:flex-start; flex-direction:column; } }
  `]
})
export class AppComponent {
  readonly i18n = inject(I18nService);
  readonly supabase = inject(SupabaseService);
}
