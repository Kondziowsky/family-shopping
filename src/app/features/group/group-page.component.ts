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
    <section class="stack">

      @if (!supabase.user()) {
        <div class="card stack">
          <h1>{{ i18n.t('group') }}</h1>
          <p class="muted">{{ i18n.t('guest') }}. <a routerLink="/login">{{ i18n.t('goToLogin') }}</a></p>
        </div>
      } @else {
        <div class="card stack">
          <div class="section-header">
            <div>
              <h1>{{ i18n.t('createNewGroup') }}</h1>
              <p class="muted">{{ i18n.t('groupName') }}</p>
            </div>
          </div>
          <form class="row" (ngSubmit)="createGroup()">
            <label class="grow">
              <input name="groupName" required [(ngModel)]="groupName" placeholder="Rodzinka">
            </label>
            <button type="submit">{{ i18n.t('createGroup') }}</button>
          </form>
        </div>

        @if (groups().length > 0) {
          <div class="section-label row">
            <span>{{ i18n.t('yourGroups') }}</span>
            <span class="spacer"></span>
            <button class="secondary sm" type="button" (click)="loadGroups()">{{ i18n.t('refresh') }}</button>
          </div>
        }

        @for (group of groups(); track group.id) {
          <article class="card stack">
            <div class="group-title row">
              <span class="group-icon">🛒</span>
              <h2>{{ group.name }}</h2>
              <span class="spacer"></span>
              <button class="sm" type="button" (click)="useGroup(group)">{{ i18n.t('save') }}</button>
            </div>

            <div class="divider"></div>

            <div class="stack sm-stack">
              <p class="muted hint">{{ i18n.t('shareInvite') }}</p>
              <label>{{ i18n.t('inviteLink') }}
                <div class="row">
                  <input class="grow" readonly [value]="inviteLink(group)">
                  <button class="secondary sm" type="button" (click)="copy(group)">{{ i18n.t('copy') }}</button>
                </div>
              </label>
              <form class="row" (ngSubmit)="sendInvite(group)">
                <label class="grow">{{ i18n.t('inviteEmail') }}
                  <input type="email" [name]="'inviteEmail-' + group.id" [(ngModel)]="inviteEmails[group.id]" placeholder="email@example.com">
                </label>
                <button class="sm" type="submit">{{ i18n.t('sendInvite') }}</button>
              </form>
              @if (inviteSent() === group.id) { <p class="success">✓ {{ i18n.t('inviteSent') }}</p> }
            </div>
          </article>
        }
      }

      @if (copied()) { <p class="success">✓ {{ i18n.t('copied') }}</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </section>
  `,
  styles: [`
    h1 { margin: 0; font-size: 1.25rem; }
    h2 { margin: 0; font-size: 1.1rem; }
    .grow { flex: 1 1 200px; }
    .hint { margin: 0; font-size: .9rem; }
    .section-label { font-weight: 700; color: #64748b; font-size: .85rem; text-transform: uppercase; letter-spacing: .06em; padding: 0 .25rem; }
    .section-header { display: flex; align-items: flex-start; gap: 1rem; }
    .group-title { gap: .6rem; }
    .group-icon { font-size: 1.4rem; line-height: 1; }
    .divider { border-top: 1px solid #e2e8f0; margin: 0 -.25rem; }
    .sm-stack { gap: .75rem; }
    .sm { padding: .5rem .85rem; font-size: .9rem; }
    input.grow { flex: 1 1 200px; width: auto; }
  `]
})
export class GroupPageComponent {
  readonly supabase = inject(SupabaseService);
  readonly i18n = inject(I18nService);
  readonly groups = signal<GroupSummary[]>([]);
  readonly error = signal('');
  readonly copied = signal(false);
  readonly inviteSent = signal('');
  readonly baseUrl = computed(() => window.location.origin);
  groupName = 'Rodzinka';
  inviteEmails: Record<string, string> = {};

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

  async sendInvite(group: GroupSummary): Promise<void> {
    const email = (this.inviteEmails[group.id] ?? '').trim();
    if (!email) return;
    try {
      await this.supabase.sendGroupInvite(group.id, email);
      this.inviteEmails[group.id] = '';
      this.inviteSent.set(group.id);
      setTimeout(() => this.inviteSent.set(''), 3000);
    } catch (err) { this.error.set(err instanceof Error ? err.message : this.i18n.t('error')); }
  }
}
