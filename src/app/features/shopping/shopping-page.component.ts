import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkAccordionModule } from '@angular/cdk/accordion';
import { CdkDropList, CdkDrag, CdkDragHandle, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowsRotate, faCheck, faChevronDown, faChevronUp, faTrash, faArrowsUpDown } from '@fortawesome/free-solid-svg-icons';
import { ShoppingItem, GroupSummary } from '../../core/types';
import { SupabaseService } from '../../core/supabase.service';
import { NotificationService } from '../../core/notification.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-shopping-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    CdkAccordionModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    FaIconComponent,
  ],
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

      <div cdkAccordion>
        <div
          cdkAccordionItem
          #addItemAccordion="cdkAccordionItem"
          class="card grid gap-3"
          [expanded]="true"
        >
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <h1 class="text-base font-bold text-slate-900 m-0">{{ i18n.t('list') }}</h1>
            </div>

            @if (notifications.supported && notifications.permission() !== 'granted') {
              <button class="btn btn-secondary btn-sm text-xs" type="button" (click)="notifications.requestPermission()">
                {{ i18n.t('enableNotifications') }}
              </button>
            }

            <button
              class="btn btn-secondary btn-icon btn-sm"
              type="button"
              (click)="addItemAccordion.toggle()"
              [title]="addItemAccordion.expanded ? 'Collapse' : 'Expand'"
            >
              <fa-icon [icon]="addItemAccordion.expanded ? faChevronUp : faChevronDown" />
            </button>

            <button class="btn btn-secondary btn-icon btn-sm" type="button" (click)="load()" [title]="i18n.t('refresh')">
              <fa-icon [icon]="faArrowsRotate" />
            </button>
          </div>

          @if (addItemAccordion.expanded) {
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
          }
        </div>
      </div>

      @if (error()) { <p class="text-red-700 text-sm">{{ error() }}</p> }

      @if (items().length === 0 && inviteCode()) {
        <p class="card text-slate-400 text-sm m-0">{{ i18n.t('emptyList') }}</p>
      }

      <div
        cdkDropList
        cdkDropListOrientation="vertical"
        class="grid gap-1.5"
        (cdkDropListDropped)="drop($event)"
      >
        @for (item of items(); track item.id) {
          <article
            cdkDrag
            cdkDragLockAxis="y"
            class="card-compact grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center transition-colors"
            [class.done-card]="item.is_done"
          >

            <button type="button" class="trash-btn" (click)="remove(item)"
                    (mousedown)="$event.stopPropagation()" (touchstart)="$event.stopPropagation()"
                    [attr.aria-label]="i18n.t('delete')">
              <fa-icon [icon]="faTrash" />
            </button>

            <div class="grid gap-0.5 min-w-0 py-0.5" [class.opacity-40]="item.is_done" [class.line-through]="item.is_done">
              <strong class="text-slate-900 truncate text-sm leading-snug">{{ item.name }}</strong>
              <div class="flex flex-wrap items-center gap-1.5">
                @if (item.quantity) { <span class="pill">{{ item.quantity }}</span> }
                @if (item.note) { <span class="text-slate-400 text-xs truncate">{{ item.note }}</span> }
              </div>
            </div>

            <button type="button" class="check-btn" [class.checked]="item.is_done" (click)="toggle(item)"
                    (mousedown)="$event.stopPropagation()" (touchstart)="$event.stopPropagation()"
                    [attr.aria-label]="item.is_done ? i18n.t('uncheck') : i18n.t('check')">
              <fa-icon [icon]="faCheck" />
            </button>

            <button
              cdkDragHandle
              type="button"
              class="btn btn-secondary btn-icon btn-sm cursor-grab touch-none active:cursor-grabbing"
              aria-label="Move item"
            >
              <fa-icon [icon]="faArrowsUpDown" />
            </button>
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

  readonly faArrowsRotate = faArrowsRotate;
  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;
  readonly faCheck = faCheck;
  readonly faArrowsUpDown = faArrowsUpDown;
  readonly faTrash = faTrash;

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
    } catch {
      /* non-critical */
    }
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
      await this.supabase.addItem(invite, {
        name: this.newName.trim(),
        quantity: this.newQuantity.trim(),
        note: this.newNote.trim(),
      });

      this.newName = '';
      this.newQuantity = '';
      this.newNote = '';

      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('error'));
    }
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