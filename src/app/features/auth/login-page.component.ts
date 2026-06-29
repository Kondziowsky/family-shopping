import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../i18n/i18n.service';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="max-w-sm mx-auto">
      <section class="card grid gap-4">
        <h1 class="text-xl font-bold text-slate-900">{{ i18n.t('login') }}</h1>
        @if (supabase.user(); as user) {
          <p class="text-slate-700 text-sm"><strong>{{ i18n.t('currentUser') }}:</strong> {{ user.email }}</p>
          <button type="button" class="btn btn-secondary" (click)="supabase.signOut()">{{ i18n.t('signOut') }}</button>
        } @else {
          <form class="grid gap-4" (ngSubmit)="send()">
            <label>{{ i18n.t('email') }}
              <input name="email" type="email" required [(ngModel)]="email" placeholder="email@example.com" class="field">
            </label>
            <button type="submit" class="btn btn-primary" [disabled]="loading()">{{ i18n.t('sendMagicLink') }}</button>
          </form>
        }
        @if (message()) { <p class="text-green-700 text-sm font-medium">{{ message() }}</p> }
        @if (error()) { <p class="text-red-700 text-sm">{{ error() }}</p> }
      </section>
    </div>
  `
})
export class LoginPageComponent {
  readonly i18n = inject(I18nService);
  readonly supabase = inject(SupabaseService);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  email = '';

  async send(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.supabase.signInWithMagicLink(this.email.trim());
      this.message.set(this.i18n.t('magicLinkSent'));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('error'));
    } finally {
      this.loading.set(false);
    }
  }
}
