import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDropList, CdkDrag, CdkDragPlaceholder, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ShoppingItem, GroupSummary } from '../../core/types';
import { SupabaseService } from '../../core/supabase.service';
import { NotificationService } from '../../core/notification.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-shopping-page',
  standalone: true,
  imports: [FormsModule, RouterLink, CdkDropList, CdkDrag, CdkDragPlaceholder],
  template: `
    <section class="grid gap-3">

      @if (supabase.user() && groups().length > 1) {
        <div class="card">
          <div class="flex flex-wrap gap-2">
            @for (g of groups(); track g.id) {
              <button type="button" class="tab" [class.active]="g.invite_code === inviteCode()" (click)="switchGroup(g)">
                {{ g.name }}
              </button>
            }
          </div>
        </div>
      }

      <div class="card grid gap-4">
        <div class="flex items-start gap-2">
          <div class="flex-1">
            <h1 class="text-base font-bold text-slate-900 m-0">{{ i18n.t('list') }}</h1>
          </div>
          @if (notifications.supported && notifications.permission() !== 'granted') {
            <button class="btn btn-secondary btn-sm text-xs" type="button" (click)="notifications.requestPermission()">
              {{ i18n.t('enableNotifications') }}
            </button>
          }
          <button class="btn btn-secondary btn-icon btn-sm" type="button" (click)="load()" [title]="i18n.t('refresh')">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>

        @if (!inviteCode()) {
          <p class="text-slate-500 text-sm">{{ i18n.t('noGroup') }}</p>
          <a routerLink="/group" class="text-blue-600 font-semibold text-sm hover:underline">{{ i18n.t('goToGroup') }}</a>
        } @else {
          <form class="grid gap-3" (ngSubmit)="add()">
            <div class="flex flex-wrap gap-3">
              <label class="flex-1 min-w-[160px]">{{ i18n.t('name') }}
                <input name="name" required [(ngModel)]="newName" autocomplete="off" class="field mt-1">
              </label>
              <label class="w-28">{{ i18n.t('quantity') }}
                <input name="quantity" [(ngModel)]="newQuantity" placeholder="2 szt." class="field mt-1">
              </label>
            </div>
            <label>{{ i18n.t('note') }}
              <textarea name="note" rows="2" [(ngModel)]="newNote" class="field mt-1"></textarea>
            </label>
            <button type="submit" class="btn btn-primary w-full sm:w-auto sm:justify-self-start">{{ i18n.t('addItem') }}</button>
          </form>
        }
      </div>

      @if (error()) { <p class="text-red-700 text-sm">{{ error() }}</p> }

      @if (items().length === 0 && inviteCode()) {
        <p class="card text-slate-400 text-sm m-0">{{ i18n.t('emptyList') }}</p>
      }

      <div cdkDropList class="grid gap-1.5" (cdkDropListDropped)="drop($event)">
        @for (item of items(); track item.id) {
          <article cdkDrag
                   class="card-compact grid grid-cols-[auto_1fr_auto] gap-2 items-center transition-colors cursor-grab active:cursor-grabbing"
                   [class.done-card]="item.is_done">

            <!-- check — stops drag from starting here -->
            <button type="button" class="check-btn" [class.checked]="item.is_done" (click)="toggle(item)"
                    (mousedown)="$event.stopPropagation()" (touchstart)="$event.stopPropagation()"
                    [attr.aria-label]="item.is_done ? i18n.t('uncheck') : i18n.t('check')">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>

            <!-- content (draggable area) -->
            <div class="grid gap-0.5 min-w-0 py-0.5" [class.opacity-40]="item.is_done" [class.line-through]="item.is_done">
              <strong class="text-slate-900 truncate text-sm leading-snug">{{ item.name }}</strong>
              <div class="flex flex-wrap items-center gap-1.5">
                @if (item.quantity) { <span class="pill">{{ item.quantity }}</span> }
                @if (item.note) { <span class="text-slate-400 text-xs truncate">{{ item.note }}</span> }
              </div>
            </div>

            <!-- delete — stops drag from starting here -->
            <button type="button" class="trash-btn" (click)="remove(item)"
                    (mousedown)="$event.stopPropagation()" (touchstart)="$event.stopPropagation()"
                    [attr.aria-label]="i18n.t('delete')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>

            <!-- placeholder shown while dragging -->
            <div *cdkDragPlaceholder class="h-10 rounded-xl bg-blue-50 border-2 border-dashed border-blue-200 col-span-3"></div>
          </article>
        }
      </div>
    </section>
  `
})
export class ShoppingPageComponent {
  readonly inviteCodeFromRoute = input<string | undefined>(undefined, { alias: 'inviteCode' });
  readonly supabase = inject(SupabaseService);
  readonly i18n = inject(I18nService);
  readonly notifications = inject(NotificationService);
  readonly destroyRef = inject(DestroyRef);

  readonly inviteCode = signal<string | null>(this.supabase.savedInviteCode);
  readonly group = signal<GroupSummary | null>(null);
  readonly groups = signal<GroupSummary[]>([]);
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
    effect(() => {
      if (this.supabase.user()) void this.loadGroups();
    });
    this.destroyRef.onDestroy(() => this.supabase.unsubscribeItems());
  }

  async loadGroups(): Promise<void> {
    try {
      const list = await this.supabase.getMyGroups();
      this.groups.set(list);
      if (!this.inviteCode() && list.length > 0) this.switchGroup(list[0]);
    } catch { /* non-critical */ }
  }

  switchGroup(group: GroupSummary): void {
    this.supabase.saveInviteCode(group.invite_code);
    this.inviteCode.set(group.invite_code);
    void this.load();
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

  drop(event: CdkDragDrop<ShoppingItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const current = [...this.items()];
    moveItemInArray(current, event.previousIndex, event.currentIndex);
    this.items.set(current);
  }
}
