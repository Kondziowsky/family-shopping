import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../i18n/i18n.service';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card stack">
      <h1>{{ i18n.t('login') }}</h1>
      @if (supabase.user(); as user) {
        <p><strong>{{ i18n.t('currentUser') }}:</strong> {{ user.email }}</p>
        <button type="button" class="secondary" (click)="supabase.signOut()">{{ i18n.t('signOut') }}</button>
      } @else {
        <form class="stack" (ngSubmit)="send()">
          <label>{{ i18n.t('email') }}
            <input name="email" type="email" required [(ngModel)]="email" placeholder="kp.softdev@gmail.com">
          </label>
          <button type="submit" [disabled]="loading()">{{ i18n.t('sendMagicLink') }}</button>
        </form>
      }
      @if (message()) { <p class="success">{{ message() }}</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </section>
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
