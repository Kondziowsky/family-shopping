import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faListUl, faUsers, faRightToBracket, faRightFromBracket, faRotate } from '@fortawesome/free-solid-svg-icons';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { I18nService } from './i18n/i18n.service';
import { SupabaseService } from './core/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, FaIconComponent, NgOptimizedImage],
  template: `
    @if (updateReady()) {
      <div class="flex items-center justify-between gap-3 bg-blue-600 px-4 py-2 text-sm text-white">
        <span>{{ i18n.t('updateAvailable') }}</span>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1 font-medium hover:bg-white/25"
          (click)="reload()"
        >
          <fa-icon [icon]="faRotate" />
          {{ i18n.t('refresh') }}
        </button>
      </div>
    }
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
  private readonly swUpdate = inject(SwUpdate);
  readonly faListUl = faListUl;
  readonly faUsers = faUsers;
  readonly faRightToBracket = faRightToBracket;
  readonly faRightFromBracket = faRightFromBracket;
  readonly faRotate = faRotate;
  readonly updateReady = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateReady.set(true));

      // Cached build no longer exists on the server - reload to recover.
      this.swUpdate.unrecoverable.subscribe(() => this.reload());
    }
  }

  reload(): void {
    document.location.reload();
  }
}
