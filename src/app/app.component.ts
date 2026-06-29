import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faListUl, faUsers, faRightToBracket, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { I18nService } from './i18n/i18n.service';
import { SupabaseService } from './core/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, FaIconComponent, NgOptimizedImage],
  template: `
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-3">
      <nav class="relative flex items-center justify-between">

        <!-- Left -->
        <a routerLink="/" class="flex shrink-0 items-center">
          <img
            ngSrc="assets/images/fs_logo.png"
            [attr.alt]="i18n.t('appTitle')"
            width="48"
            height="48"
            priority
          />
        </a>

        <!-- Center -->
        <div class="absolute left-1/2 flex -translate-x-1/2 gap-2">
          <a
            routerLink="/"
            [title]="i18n.t('list')"
            class="nav-link btn btn-secondary btn-icon"
          >
            <fa-icon [icon]="faListUl" class="text-base" />
          </a>

          @if (supabase.user()) {
            <a
              routerLink="/group"
              [title]="i18n.t('group')"
              class="nav-link btn btn-secondary btn-icon"
            >
              <fa-icon [icon]="faUsers" class="text-base" />
            </a>
          } @else {
            <a
              routerLink="/login"
              [title]="i18n.t('login')"
              class="nav-link btn btn-secondary btn-icon"
            >
              <fa-icon [icon]="faRightToBracket" class="text-base" />
            </a>
          }
        </div>

        <!-- Right -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-secondary btn-icon"
            (click)="i18n.setLang(i18n.lang() === 'pl' ? 'en' : 'pl')"
          >
            {{ i18n.lang().toUpperCase() }}
          </button>

          @if (supabase.user()) {
            <button
              type="button"
              class="btn btn-secondary btn-icon"
              (click)="supabase.signOut()"
              [title]="i18n.t('signOut')"
            >
              <fa-icon [icon]="faRightFromBracket" class="text-base" />
            </button>
          }
        </div>

      </nav>
    </header>
    <main class="max-w-2xl mx-auto px-4 py-1"><router-outlet /></main>
  `
})
export class AppComponent {
  readonly i18n = inject(I18nService);
  readonly supabase = inject(SupabaseService);
  readonly faListUl = faListUl;
  readonly faUsers = faUsers;
  readonly faRightToBracket = faRightToBracket;
  readonly faRightFromBracket = faRightFromBracket;
}
