import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowsRotate, faCartShopping, faCheck } from '@fortawesome/free-solid-svg-icons';
import { GroupSummary } from '../../core/types';
import { SupabaseService } from '../../core/supabase.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-group-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, FaIconComponent],
  template: `
    <section class="grid gap-4">

      @if (!supabase.user()) {
        <div class="card grid gap-3">
          <h1 class="text-xl font-bold text-slate-900">{{ i18n.t('group') }}</h1>
          <p class="text-slate-500 text-sm">{{ i18n.t('guest') }}.
            <a routerLink="/login" class="text-blue-600 font-semibold hover:underline">{{ i18n.t('goToLogin') }}</a>
          </p>
        </div>
      } @else {
        <div class="card grid gap-4">
          <div>
            <h1 class="text-xl font-bold text-slate-900">{{ i18n.t('createNewGroup') }}</h1>
            <p class="text-slate-500 text-sm mt-0.5">{{ i18n.t('groupName') }}</p>
          </div>
          <form class="flex flex-wrap gap-3" (ngSubmit)="createGroup()">
            <label class="flex-1 min-w-0 gap-0">
              <input name="groupName" required [(ngModel)]="groupName" placeholder="Rodzinka" class="field">
            </label>
            <button type="submit" class="btn btn-primary self-end">{{ i18n.t('createGroup') }}</button>
          </form>
        </div>

        @if (groups().length > 0) {
          <div class="flex items-center gap-3 px-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest flex-1">{{ i18n.t('yourGroups') }}</span>
            <button class="btn btn-secondary btn-sm" type="button" (click)="loadGroups()">
              <fa-icon [icon]="faArrowsRotate" />
            </button>
          </div>
        }

        @for (group of groups(); track group.id) {
          <article class="card grid gap-0 overflow-hidden p-0">

            <!-- Group header -->
            <div class="flex items-center gap-3 px-4 py-3">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                <fa-icon [icon]="faCartShopping" class="text-lg" />
              </div>
              <h2 class="text-base font-bold text-slate-900 flex-1 m-0 truncate">{{ group.name }}</h2>
              <button class="btn btn-primary btn-sm" type="button" (click)="useGroup(group)">{{ i18n.t('save') }}</button>
            </div>

            <hr class="border-slate-100 m-0">

            <!-- Invite section -->
            <div class="grid gap-4 px-4 py-4 bg-slate-50/60">
              <p class="text-slate-400 text-xs m-0 font-medium uppercase tracking-wide">{{ i18n.t('shareInvite') }}</p>

              <label class="gap-1">{{ i18n.t('inviteLink') }}
                <div class="flex gap-2 mt-1">
                  <input class="field flex-1 min-w-0 text-sm font-mono" readonly [value]="inviteLink(group)">
                  <button class="btn btn-secondary btn-sm shrink-0" type="button" (click)="copy(group)">{{ i18n.t('copy') }}</button>
                </div>
              </label>

              <form class="grid gap-2" (ngSubmit)="sendInvite(group)">
                <label class="gap-1">{{ i18n.t('inviteEmail') }}
                  <div class="flex gap-2 mt-1">
                    <input type="email" [name]="'inviteEmail-' + group.id" [(ngModel)]="inviteEmails[group.id]"
                      placeholder="email@example.com" class="field flex-1 min-w-0 text-sm">
                    <button class="btn btn-primary btn-sm shrink-0" type="submit">{{ i18n.t('sendInvite') }}</button>
                  </div>
                </label>
              </form>

              @if (inviteSent() === group.id) {
                <p class="text-green-700 text-sm font-semibold m-0 flex items-center gap-1.5">
                  <fa-icon [icon]="faCheck" />
                  {{ i18n.t('inviteSent') }}
                </p>
              }
            </div>
          </article>
        }
      }

      @if (copied()) { <p class="text-green-700 text-sm font-semibold">✓ {{ i18n.t('copied') }}</p> }
      @if (error()) { <p class="text-red-700 text-sm">{{ error() }}</p> }
    </section>
  `
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

  readonly faArrowsRotate = faArrowsRotate;
  readonly faCartShopping = faCartShopping;
  readonly faCheck = faCheck;

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
