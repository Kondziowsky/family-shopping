import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShoppingItem, GroupSummary } from '../../core/types';
import { SupabaseService } from '../../core/supabase.service';
import { NotificationService } from '../../core/notification.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-shopping-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="stack">
      <div class="card stack">
        <div class="row">
          <div>
            <h1>{{ i18n.t('list') }}</h1>
            @if (group()) { <p class="muted">{{ group()?.name }}</p> }
          </div>
          <span class="spacer"></span>
          <button class="secondary" type="button" (click)="load()">{{ i18n.t('refresh') }}</button>
          @if (notifications.supported && notifications.permission() !== 'granted') {
            <button class="secondary" type="button" (click)="notifications.requestPermission()">{{ i18n.t('enableNotifications') }}</button>
          }
        </div>

        @if (!inviteCode()) {
          <p class="muted">{{ i18n.t('noGroup') }}</p>
          <a routerLink="/group">{{ i18n.t('goToGroup') }}</a>
        } @else {
          <form class="stack" (ngSubmit)="add()">
            <div class="row">
              <label class="grow">{{ i18n.t('name') }}
                <input name="name" required [(ngModel)]="newName" autocomplete="off">
              </label>
              <label class="qty">{{ i18n.t('quantity') }}
                <input name="quantity" [(ngModel)]="newQuantity" placeholder="2 szt.">
              </label>
            </div>
            <label>{{ i18n.t('note') }}
              <textarea name="note" rows="2" [(ngModel)]="newNote"></textarea>
            </label>
            <button type="submit">{{ i18n.t('addItem') }}</button>
          </form>
        }
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (items().length === 0 && inviteCode()) {
        <p class="card muted">{{ i18n.t('emptyList') }}</p>
      }

      @for (item of items(); track item.id) {
        <article class="card item">
          <input type="checkbox" [checked]="item.is_done" (change)="toggle(item)">
          <div class="content" [class.item-done]="item.is_done">
            <strong>{{ item.name }}</strong>
            @if (item.quantity) { <span class="pill">{{ item.quantity }}</span> }
            @if (item.note) { <p class="muted">{{ item.note }}</p> }
          </div>
          <button class="danger" type="button" (click)="remove(item)">{{ i18n.t('delete') }}</button>
        </article>
      }
    </section>
  `,
  styles: [`
    h1 { margin: 0; }
    .grow { flex: 1 1 260px; }
    .qty { width: 150px; }
    .item { display:grid; grid-template-columns:auto 1fr auto; gap: .75rem; align-items:center; }
    .item input[type=checkbox] { width: 24px; height: 24px; }
    .content { display:grid; gap:.25rem; }
    .pill { display:inline-block; width:max-content; background:#e0f2fe; color:#075985; border-radius:999px; padding:.15rem .5rem; font-size:.85rem; font-weight:700; }
  `]
})
export class ShoppingPageComponent {
  readonly inviteCodeFromRoute = input<string | undefined>(undefined, { alias: 'inviteCode' });
  readonly supabase = inject(SupabaseService);
  readonly i18n = inject(I18nService);
  readonly notifications = inject(NotificationService);
  readonly destroyRef = inject(DestroyRef);

  readonly inviteCode = signal<string | null>(this.supabase.savedInviteCode);
  readonly group = signal<GroupSummary | null>(null);
  readonly items = signal<ShoppingItem[]>([]);
  readonly error = signal('');

  newName = '';
  newQuantity = '';
  newNote = '';

  constructor() {
    effect(() => {
      const routeInvite = this.inviteCodeFromRoute();
      if (routeInvite) {
        this.supabase.saveInviteCode(routeInvite);
        this.inviteCode.set(routeInvite);
      }
      void this.load();
    });
    this.destroyRef.onDestroy(() => this.supabase.unsubscribeItems());
  }

  async load(): Promise<void> {
    const invite = this.inviteCode();
    if (!invite) return;
    try {
      this.error.set('');
      const group = await this.supabase.getGroupByInvite(invite);
      this.group.set(group);
      if (group) {
        this.items.set(await this.supabase.listItems(invite));
        this.supabase.subscribeToItems(group.id, () => {
          this.notifications.notify(this.i18n.t('appTitle'), this.i18n.t('listChanged'));
          void this.load();
        });
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('error'));
    }
  }

  async add(): Promise<void> {
    const invite = this.inviteCode();
    if (!invite || !this.newName.trim()) return;
    try {
      await this.supabase.addItem(invite, { name: this.newName.trim(), quantity: this.newQuantity.trim(), note: this.newNote.trim() });
      this.newName = ''; this.newQuantity = ''; this.newNote = '';
      await this.load();
    } catch (err) { this.error.set(err instanceof Error ? err.message : this.i18n.t('error')); }
  }

  async toggle(item: ShoppingItem): Promise<void> {
    const invite = this.inviteCode();
    if (!invite) return;
    await this.supabase.updateItem(invite, item.id, { is_done: !item.is_done });
    await this.load();
  }

  async remove(item: ShoppingItem): Promise<void> {
    const invite = this.inviteCode();
    if (!invite) return;
    await this.supabase.deleteItem(invite, item.id);
    await this.load();
  }
}
