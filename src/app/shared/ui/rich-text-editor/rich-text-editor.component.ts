import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faAlignCenter, faAlignJustify, faAlignLeft, faAlignRight,
  faBold, faChevronDown, faEraser, faFileLines, faItalic, faListOl, faListUl,
  faSpinner, faStrikethrough, faTag, faUnderline,
} from '@fortawesome/free-solid-svg-icons';
import {
  RICH_TEXT_EDITOR_DEFAULT_LABELS,
  RichTextEditorLabels,
  RichTextKeyword,
  RichTextTemplateSummary,
} from './rich-text.types';
import { RichTextTemplateSource } from './rich-text-template.source';
import { richTextToPlainText, sanitizeRichText } from './rich-text-sanitizer';

interface ToolbarButton {
  readonly command: string;
  readonly icon: IconDefinition;
  readonly label: keyof RichTextEditorLabels;
  /** Whether the button reflects a toggle state at the caret. */
  readonly stateful: boolean;
}

const TOOLBAR_GROUPS: readonly (readonly ToolbarButton[])[] = [
  [
    { command: 'bold', icon: faBold, label: 'bold', stateful: true },
    { command: 'italic', icon: faItalic, label: 'italic', stateful: true },
    { command: 'underline', icon: faUnderline, label: 'underline', stateful: true },
    { command: 'strikeThrough', icon: faStrikethrough, label: 'strikethrough', stateful: true },
  ],
  [
    { command: 'justifyLeft', icon: faAlignLeft, label: 'alignLeft', stateful: true },
    { command: 'justifyCenter', icon: faAlignCenter, label: 'alignCenter', stateful: true },
    { command: 'justifyRight', icon: faAlignRight, label: 'alignRight', stateful: true },
    { command: 'justifyFull', icon: faAlignJustify, label: 'alignJustify', stateful: true },
  ],
  [
    { command: 'insertUnorderedList', icon: faListUl, label: 'bulletList', stateful: true },
    { command: 'insertOrderedList', icon: faListOl, label: 'numberedList', stateful: true },
    { command: 'removeFormat', icon: faEraser, label: 'clearFormatting', stateful: false },
  ],
];

/**
 * Framework-agnostic rich text editor over a contenteditable region.
 *
 * Formatting runs through `document.execCommand`. It is formally deprecated but has no
 * replacement and is still the only cross-browser way to drive a contenteditable without
 * shipping a full document model; every mainstream editor either does the same or brings
 * ~100kB of its own engine. All input paths (typing, paste, `writeValue`) go through the
 * allowlist sanitizer, so the deprecation is the only debt taken on here.
 */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:selectionchange)': 'syncActiveCommands()',
    '(keydown.escape)': 'closeMenus()',
  },
  // Not a Tailwind utility: the host must lay out correctly even where this component ends
  // up without the consuming app's CSS.
  styles: `:host { display: block; height: 100%; }`,
  template: `
    <div
      class="flex h-full flex-col rounded-2xl border bg-white transition-colors"
      [class.border-slate-300]="!focused()"
      [class.border-blue-500]="focused()"
      [class.ring-2]="focused()"
      [class.ring-blue-500]="focused()"
      [class.opacity-60]="disabled()"
    >
      <!-- Toolbar -->
      <div
        #toolbar
        role="toolbar"
        [attr.aria-label]="resolvedLabels().toolbar"
        class="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-1.5"
        (keydown)="onToolbarKeydown($event)"
        (focusin)="onToolbarFocusIn($event)"
      >
        @for (group of toolbarGroups; track $index) {
          @if ($index > 0) { <span class="mx-1 h-5 w-px bg-slate-200" aria-hidden="true"></span> }

          @for (button of group; track button.command) {
            <button
              #rteItem
              type="button"
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent
                     text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed
                     aria-pressed:bg-blue-50 aria-pressed:text-blue-600
                     aria-pressed:ring-1 aria-pressed:ring-blue-300"
              [disabled]="disabled()"
              [title]="resolvedLabels()[button.label]"
              [attr.aria-label]="resolvedLabels()[button.label]"
              [attr.aria-pressed]="button.stateful ? isActive(button.command) : null"
              (mousedown)="$event.preventDefault()"
              (click)="exec(button.command)"
            >
              <fa-icon [icon]="button.icon" />
            </button>
          }
        }

        <!-- Keyword insert -->
        @if (keywords().length > 0) {
          <span class="mx-1 h-5 w-px bg-slate-200" aria-hidden="true"></span>

          <div class="relative">
            <button
              #keywordTrigger
              #rteItem
              type="button"
              class="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2
                     text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100
                     disabled:cursor-not-allowed aria-expanded:bg-slate-100"
              [disabled]="disabled()"
              [attr.aria-expanded]="keywordMenuOpen()"
              aria-haspopup="menu"
              [title]="resolvedLabels().keywords"
              (mousedown)="$event.preventDefault()"
              (click)="toggleKeywordMenu($event.detail === 0)"
            >
              <fa-icon [icon]="faTag" />
              <span class="hidden sm:inline">{{ resolvedLabels().keywords }}</span>
              <fa-icon [icon]="faChevronDown" class="text-xs" />
            </button>

            @if (keywordMenuOpen()) {
              <div
                role="menu"
                class="absolute left-0 top-full z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border
                       border-slate-200 bg-white py-1 shadow-lg"
                (keydown)="onMenuKeydown($event)"
              >
                @for (keyword of keywords(); track keyword.id) {
                  <button
                    #menuItem
                    type="button"
                    role="menuitem"
                    tabindex="-1"
                    class="block w-full cursor-pointer border-0 bg-transparent px-3 py-2 text-left text-sm
                           text-slate-700 transition-colors hover:bg-slate-50 focus:bg-slate-100"
                    (mousedown)="$event.preventDefault()"
                    (click)="insertKeyword(keyword)"
                  >
                    {{ keyword.text }}
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- Template insert -->
        @if (templatesEnabled) {
          <div class="relative">
            <button
              #templateTrigger
              #rteItem
              type="button"
              class="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent px-2
                     text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100
                     disabled:cursor-not-allowed aria-expanded:bg-slate-100"
              [disabled]="disabled()"
              [attr.aria-expanded]="templateMenuOpen()"
              aria-haspopup="menu"
              [title]="resolvedLabels().templates"
              (mousedown)="$event.preventDefault()"
              (click)="toggleTemplateMenu($event.detail === 0)"
            >
              <fa-icon [icon]="faFileLines" />
              <span class="hidden sm:inline">{{ resolvedLabels().templates }}</span>
              <fa-icon [icon]="faChevronDown" class="text-xs" />
            </button>

            @if (templateMenuOpen()) {
              <div
                role="menu"
                class="absolute left-0 top-full z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-xl border
                       border-slate-200 bg-white py-1 shadow-lg"
                (keydown)="onMenuKeydown($event)"
              >
                <div role="status" aria-live="polite">
                  @if (templatesLoading()) {
                    <p class="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
                      <fa-icon [icon]="faSpinner" [animation]="'spin'" aria-hidden="true" />
                      {{ resolvedLabels().templatesLoading }}
                    </p>
                  } @else if (templatesError()) {
                    <p class="px-3 py-2 text-sm text-red-700">{{ resolvedLabels().templatesError }}</p>
                  } @else if (templates().length === 0) {
                    <p class="px-3 py-2 text-sm text-slate-500">{{ resolvedLabels().templatesEmpty }}</p>
                  }
                </div>

                @if (!templatesLoading() && !templatesError() && templates().length > 0) {
                  @for (template of templates(); track template.id) {
                    <button
                      #menuItem
                      type="button"
                      role="menuitem"
                      tabindex="-1"
                      class="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2
                             text-left transition-colors hover:bg-slate-50 focus:bg-slate-100
                             disabled:cursor-wait"
                      [disabled]="insertingTemplateId() !== null"
                      (mousedown)="$event.preventDefault()"
                      (click)="insertTemplate(template)"
                    >
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-semibold text-slate-700">
                          {{ template.name }}
                        </span>
                        @if (template.description) {
                          <span class="block truncate text-xs text-slate-500">{{ template.description }}</span>
                        }
                      </span>
                      @if (insertingTemplateId() === template.id) {
                        <fa-icon [icon]="faSpinner" [animation]="'spin'" aria-hidden="true" class="text-slate-500" />
                      }
                    </button>
                  }
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Editable area: grows with content, scrolls once the container runs out of room -->
      <div class="relative min-h-0 flex-1 overflow-y-auto">
        @if (isEmpty() && placeholder()) {
          <!-- aria-placeholder on the textbox carries this for assistive tech. -->
          <div aria-hidden="true" class="pointer-events-none absolute left-4 top-3 select-none text-slate-500">
            {{ placeholder() }}
          </div>
        }

        <div
          #editor
          role="textbox"
          aria-multiline="true"
          [attr.aria-label]="resolvedLabels().editor"
          [attr.aria-placeholder]="placeholder() || null"
          [attr.aria-disabled]="disabled() ? 'true' : null"
          [attr.contenteditable]="disabled() ? 'false' : 'true'"
          [style.min-height]="minHeight()"
          class="w-full px-4 py-3 text-slate-900 focus:outline-none
                 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6
                 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3
                 [&_blockquote]:text-slate-600
                 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg
                 [&_h3]:font-bold [&_a]:text-blue-600 [&_a]:underline"
          (input)="onInput()"
          (paste)="onPaste($event)"
          (drop)="onDrop($event)"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
        ></div>
      </div>
    </div>
  `,
})
export class RichTextEditorComponent implements ControlValueAccessor {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly editorEl = viewChild<ElementRef<HTMLElement>>('editor');
  /** Reactive, so anything that adds or removes a button re-runs the roving effect. */
  private readonly toolbarItemRefs = viewChildren<ElementRef<HTMLButtonElement>>('rteItem');
  private readonly menuItemRefs = viewChildren<ElementRef<HTMLButtonElement>>('menuItem');
  private readonly keywordTrigger = viewChild<ElementRef<HTMLButtonElement>>('keywordTrigger');
  private readonly templateTrigger = viewChild<ElementRef<HTMLButtonElement>>('templateTrigger');
  /** Optional: no provider means the toolbar simply has no template button. */
  private readonly templateSource = inject(RichTextTemplateSource, { optional: true });

  readonly keywords = input<readonly RichTextKeyword[]>([]);
  readonly placeholder = input('');
  /**
   * Optional floor for the editable area. The default imposes none: the editor grows with
   * its content, and fills the container instead when the container constrains the height.
   */
  readonly minHeight = input('auto');
  /** Partial override of the English defaults, so the host app can pass translations. */
  readonly labels = input<Partial<RichTextEditorLabels>>({});

  protected readonly toolbarGroups = TOOLBAR_GROUPS;
  protected readonly templatesEnabled = this.templateSource !== null;
  protected readonly faTag = faTag;
  protected readonly faFileLines = faFileLines;
  protected readonly faSpinner = faSpinner;
  protected readonly faChevronDown = faChevronDown;

  protected readonly disabled = signal(false);
  protected readonly focused = signal(false);
  protected readonly keywordMenuOpen = signal(false);

  protected readonly templateMenuOpen = signal(false);
  protected readonly templates = signal<readonly RichTextTemplateSummary[]>([]);
  protected readonly templatesLoading = signal(false);
  protected readonly templatesError = signal(false);
  protected readonly insertingTemplateId = signal<string | null>(null);

  /** Index of the toolbar button that currently owns the tab stop. */
  private readonly rovingIndex = signal(0);
  private readonly html = signal('');
  private readonly activeCommands = signal<readonly string[]>([]);

  protected readonly resolvedLabels = computed<RichTextEditorLabels>(() => ({
    ...RICH_TEXT_EDITOR_DEFAULT_LABELS,
    ...this.labels(),
  }));

  protected readonly isEmpty = computed(() => richTextToPlainText(this.html()).length === 0);

  /** Caret position at the moment focus left the editor, restored before an insert. */
  private savedRange: Range | null = null;
  private templateRequest: AbortController | null = null;
  /** A keyboard-opened menu wants focus; its rows may not have rendered yet. */
  private readonly pendingMenuFocus = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    // Single writer to the DOM. Skipping the write when the markup already matches is
    // what keeps the caret in place while typing - the input handler feeds the same
    // string straight back into this signal.
    effect(() => {
      const element = this.editorEl()?.nativeElement;
      const html = this.html();
      if (element && element.innerHTML !== html) element.innerHTML = html;
    });

    // Exactly one toolbar button is tabbable at a time. The query signal covers buttons
    // appearing and disappearing; `disabled` is read because it changes which are usable
    // without changing the set.
    effect(() => {
      this.disabled();
      const items = this.toolbarItems();
      if (items.length === 0) return;

      const active = Math.min(this.rovingIndex(), items.length - 1);
      items.forEach((item, index) => (item.tabIndex = index === active ? 0 : -1));
    });

    // A menu opened from the keyboard takes focus as soon as it has rows to take it -
    // which, for templates, is only after the fetch resolves.
    effect(() => {
      if (!this.pendingMenuFocus()) return;

      const [first] = this.menuItems();
      if (!first) return;

      this.pendingMenuFocus.set(false);
      first.focus();
    });

    inject(DestroyRef).onDestroy(() => this.templateRequest?.abort());
  }

  // ── ControlValueAccessor ──

  writeValue(value: string | null): void {
    this.html.set(sanitizeRichText(value ?? ''));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) this.closeMenus();
  }

  // ── Editing ──

  protected exec(command: string, value?: string): void {
    if (this.disabled()) return;
    this.focusEditor();
    document.execCommand(command, false, value);
    this.syncActiveCommands();
    this.onInput();
  }

  protected onInput(): void {
    const element = this.editorEl()?.nativeElement;
    if (!element) return;

    this.html.set(element.innerHTML);
    // Browsers leave a stray <br> behind in an "empty" editor; don't persist that.
    this.onChange(this.isEmpty() ? '' : element.innerHTML);
  }

  /** Paste is the one path where arbitrary third-party markup can enter the document. */
  protected onPaste(event: ClipboardEvent): void {
    const clipboard = event.clipboardData;
    if (!clipboard || this.disabled()) return;

    event.preventDefault();
    const html = clipboard.getData('text/html');

    if (html) document.execCommand('insertHTML', false, sanitizeRichText(html));
    else document.execCommand('insertText', false, clipboard.getData('text/plain'));

    this.onInput();
  }

  /** Drag-and-drop carries HTML too, and never goes through the paste handler. */
  protected onDrop(event: DragEvent): void {
    const transfer = event.dataTransfer;
    if (!transfer || this.disabled()) return;

    const html = transfer.getData('text/html');
    const text = transfer.getData('text/plain');
    if (!html && !text) return;

    event.preventDefault();
    this.moveCaretTo(event.clientX, event.clientY);

    if (html) document.execCommand('insertHTML', false, sanitizeRichText(html));
    else document.execCommand('insertText', false, text);

    this.onInput();
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.saveSelection();
    this.onTouched();
  }

  // ── Keywords ──

  protected toggleKeywordMenu(moveFocus = false): void {
    this.saveSelection();
    this.templateMenuOpen.set(false);

    const open = !this.keywordMenuOpen();
    this.keywordMenuOpen.set(open);
    if (open && moveFocus) this.pendingMenuFocus.set(true);
  }

  protected insertKeyword(keyword: RichTextKeyword): void {
    this.keywordMenuOpen.set(false);
    if (this.disabled()) return;

    this.focusEditor();
    document.execCommand('insertText', false, keyword.text);
    this.onInput();
  }

  // ── Templates ──

  protected toggleTemplateMenu(moveFocus = false): void {
    this.saveSelection();
    this.keywordMenuOpen.set(false);

    const open = !this.templateMenuOpen();
    this.templateMenuOpen.set(open);

    if (!open) {
      this.abortTemplateRequest();
      return;
    }

    // Rows may not exist yet on a cold open; loadTemplates() retries the focus once they do.
    if (moveFocus) this.pendingMenuFocus.set(true);
    void this.loadTemplates();
  }

  /**
   * Inserts at the caret rather than replacing the document, so templates compose and a
   * mis-click cannot wipe a half-written message. In an empty editor that is the same
   * thing as loading the template.
   */
  protected async insertTemplate(summary: RichTextTemplateSummary): Promise<void> {
    if (!this.templateSource || this.disabled() || this.insertingTemplateId() !== null) return;

    this.insertingTemplateId.set(summary.id);
    try {
      const template = await this.templateSource.getTemplate(summary.id);

      this.templateMenuOpen.set(false);
      this.focusEditor();
      // Backend HTML is third-party input as far as this component is concerned.
      document.execCommand('insertHTML', false, sanitizeRichText(template.html));
      this.onInput();
    } catch (error) {
      console.error('[rich-text-editor] failed to load template', error);
      this.templatesError.set(true);
    } finally {
      this.insertingTemplateId.set(null);
    }
  } 

  /** Loaded once per open-until-it-succeeds, not on every dropdown toggle. */
  private async loadTemplates(): Promise<void> {
    if (!this.templateSource || this.templatesLoading()) return;
    if (this.templates().length > 0 && !this.templatesError()) return;

    const request = new AbortController();
    this.templateRequest = request;
    this.templatesLoading.set(true);
    this.templatesError.set(false);

    try {
      const list = await this.templateSource.listTemplates(request.signal);
      if (!request.signal.aborted) this.templates.set(list);
    } catch (error) {
      if (!request.signal.aborted) {
        console.error('[rich-text-editor] failed to list templates', error);
        this.templatesError.set(true);
      }
    } finally {
      if (this.templateRequest === request) {
        this.templateRequest = null;
        this.templatesLoading.set(false);
      }
    }
  }

  private abortTemplateRequest(): void {
    this.templateRequest?.abort();
    this.templateRequest = null;
    this.templatesLoading.set(false);
  }

  protected closeMenus(): void {
    const keywordWasOpen = this.keywordMenuOpen();
    const templateWasOpen = this.templateMenuOpen();
    if (!keywordWasOpen && !templateWasOpen) return;

    this.pendingMenuFocus.set(false);

    // A menu item that is about to be removed must not take focus down with it.
    const active = document.activeElement;
    const focusWasInMenu =
      active instanceof HTMLElement &&
      this.hostEl.nativeElement.contains(active) &&
      active.closest('[role="menu"]') !== null;

    this.keywordMenuOpen.set(false);
    if (templateWasOpen) {
      this.templateMenuOpen.set(false);
      this.abortTemplateRequest();
    }

    if (!focusWasInMenu) return;
    const trigger = keywordWasOpen ? this.keywordTrigger() : this.templateTrigger();
    trigger?.nativeElement.focus();
  }

  // ── Keyboard navigation ──

  /**
   * Roving tabindex: the toolbar is a single tab stop and arrows move within it, which is
   * what `role="toolbar"` promises. Without it every button is its own stop and a keyboard
   * user has to tab past eleven of them to reach the text.
   */
  protected onToolbarKeydown(event: KeyboardEvent): void {
    const items = this.toolbarItems();
    // -1 means focus sits inside an open dropdown, which handles its own keys.
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (items.length === 0 || current < 0) return;

    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (current + 1) % items.length; break;
      case 'ArrowLeft': next = (current - 1 + items.length) % items.length; break;
      case 'Home': next = 0; break;
      case 'End': next = items.length - 1; break;
      default: return;
    }

    event.preventDefault();
    this.rovingIndex.set(next);
    items[next]?.focus();
  }

  /** Keeps the tab stop on whichever button was last reached, however it was reached. */
  protected onToolbarFocusIn(event: FocusEvent): void {
    const index = this.toolbarItems().indexOf(event.target as HTMLButtonElement);
    if (index >= 0) this.rovingIndex.set(index);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    // A menu is a single tab stop too: tabbing out of it closes it.
    if (event.key === 'Tab') {
      this.closeMenus();
      return;
    }

    const items = this.menuItems();
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = current < 0 ? 0 : (current + 1) % items.length; break;
      case 'ArrowUp': next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length; break;
      case 'Home': next = 0; break;
      case 'End': next = items.length - 1; break;
      default: return;
    }

    event.preventDefault();
    items[next]?.focus();
  }

  private toolbarItems(): HTMLButtonElement[] {
    return this.toolbarItemRefs()
      .map((ref) => ref.nativeElement)
      .filter((item) => !item.disabled);
  }

  /** Only one menu is open at a time, so this is never ambiguous. */
  private menuItems(): HTMLButtonElement[] {
    return this.menuItemRefs()
      .map((ref) => ref.nativeElement)
      .filter((item) => !item.disabled);
  }

  // ── Selection ──

  protected isActive(command: string): boolean {
    return this.activeCommands().includes(command);
  }

  protected syncActiveCommands(): void {
    const element = this.editorEl()?.nativeElement;
    if (!element || !this.selectionIsInsideEditor()) return;

    const active = TOOLBAR_GROUPS.flat()
      .filter((button) => button.stateful && this.queryState(button.command))
      .map((button) => button.command);

    // Only notify when something really changed - selectionchange fires on every caret move.
    const current = this.activeCommands();
    const changed =
      active.length !== current.length || active.some((command, i) => command !== current[i]);
    if (changed) this.activeCommands.set(active);
  }

  protected onDocumentPointerDown(event: Event): void {
    if (!this.hostEl.nativeElement.contains(event.target as Node)) this.closeMenus();
  }

  private queryState(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch {
      return false; // not every command reports a state in every browser
    }
  }

  private selectionIsInsideEditor(): boolean {
    const element = this.editorEl()?.nativeElement;
    const selection = document.getSelection();
    if (!element || !selection || selection.rangeCount === 0) return false;
    return element.contains(selection.getRangeAt(0).commonAncestorContainer);
  }

  private saveSelection(): void {
    if (!this.selectionIsInsideEditor()) return;
    this.savedRange = document.getSelection()!.getRangeAt(0).cloneRange();
  }

  /**
   * Toolbar buttons suppress mousedown so focus never leaves, but a click that lands on
   * the menu scrollbar (or a programmatic call) still can. Restoring the saved range keeps
   * an insert from landing at the top of the document.
   */
  private focusEditor(): void {
    const element = this.editorEl()?.nativeElement;
    if (!element) return;

    element.focus({ preventScroll: true });
    if (this.selectionIsInsideEditor()) return;

    const selection = document.getSelection();
    if (!selection) return;

    const range = this.savedRange && element.contains(this.savedRange.commonAncestorContainer)
      ? this.savedRange
      : this.caretAtEnd(element);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  /** Puts the caret under the pointer so dropped content lands where it was aimed. */
  private moveCaretTo(x: number, y: number): void {
    const selection = document.getSelection();
    const element = this.editorEl()?.nativeElement;
    if (!selection || !element) return;

    // Neither API is in the DOM lib types consistently; both are widely supported.
    const doc = document as Document & {
      caretRangeFromPoint?(x: number, y: number): Range | null;
      caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
    };

    let range: Range | null = null;

    if (typeof doc.caretRangeFromPoint === 'function') {
      range = doc.caretRangeFromPoint(x, y);
    } else if (typeof doc.caretPositionFromPoint === 'function') {
      const position = doc.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }

    if (!range || !element.contains(range.commonAncestorContainer)) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }

  private caretAtEnd(element: HTMLElement): Range {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    return range;
  }
}
