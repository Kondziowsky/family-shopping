import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GroupSummary } from '../../core/types';
import { SupabaseService } from '../../core/supabase.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-group-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="card stack">
      <h1>{{ i18n.t('group') }}</h1>
      @if (!supabase.user()) {
        <p class="muted">{{ i18n.t('guest') }}. <a routerLink="/login">{{ i18n.t('goToLogin') }}</a></p>
      } @else {
        <form class="row" (ngSubmit)="createGroup()">
          <label class="grow">{{ i18n.t('groupName') }}
            <input name="groupName" required [(ngModel)]="groupName" placeholder="Rodzinka">
          </label>
          <button type="submit">{{ i18n.t('createGroup') }}</button>
        </form>
        <button class="secondary" type="button" (click)="loadGroups()">{{ i18n.t('refresh') }}</button>
      }

      @for (group of groups(); track group.id) {
        <article class="card stack">
          <h2>{{ group.name }}</h2>
          <label>{{ i18n.t('inviteLink') }}
            <input readonly [value]="inviteLink(group)">
          </label>
          <div class="row">
            <button type="button" (click)="useGroup(group)">{{ i18n.t('save') }}</button>
            <button class="secondary" type="button" (click)="copy(group)">{{ i18n.t('copy') }}</button>
          </div>
        </article>
      }
      @if (copied()) { <p class="success">{{ i18n.t('copied') }}</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </section>
  `,
  styles: [`.grow { flex: 1 1 260px; } h2 { margin:0; }`]
})
export class GroupPageComponent {
  readonly supabase = inject(SupabaseService);
  readonly i18n = inject(I18nService);
  readonly groups = signal<GroupSummary[]>([]);
  readonly error = signal('');
  readonly copied = signal(false);
  readonly baseUrl = computed(() => window.location.origin);
  groupName = 'Rodzinka';

  constructor() { void this.loadGroups(); }

  async loadGroups(): Promise<void> {
    if (!this.supabase.user()) return;
    try { this.groups.set(await this.supabase.getMyGroups()); }
    catch (err) { this.error.set(err instanceof Error ? err.message : this.i18n.t('error')); }
  }

  async createGroup(): Promise<void> {
    try {
      const group = await this.supabase.createGroup(this.groupName.trim() || 'Rodzinka');
      this.groups.set([group, ...this.groups()]);
      this.useGroup(group);
    } catch (err) { this.error.set(err instanceof Error ? err.message : this.i18n.t('error')); }
  }

  inviteLink(group: GroupSummary): string { return `${this.baseUrl()}/join/${group.invite_code}`; }
  useGroup(group: GroupSummary): void { this.supabase.saveInviteCode(group.invite_code); }
  async copy(group: GroupSummary): Promise<void> { await navigator.clipboard.writeText(this.inviteLink(group)); this.copied.set(true); }
}
