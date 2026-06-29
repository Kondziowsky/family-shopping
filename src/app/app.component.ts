import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { I18nService } from './i18n/i18n.service';
import { SupabaseService } from './core/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10 flex-wrap sm:flex-nowrap">
      <a routerLink="/" class="text-lg font-black text-slate-900 no-underline shrink-0">{{ i18n.t('appTitle') }}</a>

      <nav class="flex flex-1 justify-center items-center gap-5 order-3 w-full sm:order-2 sm:w-auto">
        <a routerLink="/" [title]="i18n.t('list')" class="nav-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </a>
        @if (supabase.user()) {
          <a routerLink="/group" [title]="i18n.t('group')" class="nav-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </a>
        }
        @if (!supabase.user()) {
          <a routerLink="/login" [title]="i18n.t('login')" class="nav-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </a>
        }
      </nav>

      <div class="flex items-center gap-2 shrink-0 ml-auto order-2 sm:order-3">
        <button type="button" class="btn btn-secondary btn-sm text-xs px-2 py-1 min-w-[2rem]"
          (click)="i18n.setLang(i18n.lang() === 'pl' ? 'en' : 'pl')">{{ i18n.lang().toUpperCase() }}</button>
        @if (supabase.user()) {
          <button type="button" class="btn btn-secondary btn-icon" (click)="supabase.signOut()" [title]="i18n.t('signOut')">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        }
      </div>
    </header>
    <main class="max-w-2xl mx-auto px-4 py-6"><router-outlet /></main>
  `
})
export class AppComponent {
  readonly i18n = inject(I18nService);
  readonly supabase = inject(SupabaseService);
}
