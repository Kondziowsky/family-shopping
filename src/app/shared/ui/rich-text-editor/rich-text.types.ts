/**
 * Public contract of the rich text editor. Kept free of app-specific imports so the
 * whole folder can be lifted into a shared design system package as-is.
 */

/** A token the user can drop at the caret, e.g. an email merge field. */
export interface RichTextKeyword {
  readonly id: string;
  /** Text inserted at the caret. Also what the dropdown shows. */
  readonly text: string;
}

/**
 * A row in the template picker. Bodies are deliberately not part of this shape - a
 * template list endpoint should stay cheap, and bodies get fetched one at a time.
 */
export interface RichTextTemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

/** A template with its body, as returned when one is opened. */
export interface RichTextTemplate extends RichTextTemplateSummary {
  readonly html: string;
}

/** Tooltips / accessible names. Pass translated strings from the host app. */
export interface RichTextEditorLabels {
  /** Accessible name of the editable region itself. */
  readonly editor: string;
  /** Accessible name of the toolbar group. */
  readonly toolbar: string;
  readonly bold: string;
  readonly italic: string;
  readonly underline: string;
  readonly strikethrough: string;
  readonly alignLeft: string;
  readonly alignCenter: string;
  readonly alignRight: string;
  readonly alignJustify: string;
  readonly bulletList: string;
  readonly numberedList: string;
  readonly clearFormatting: string;
  readonly keywords: string;
  readonly templates: string;
  readonly templatesLoading: string;
  readonly templatesEmpty: string;
  readonly templatesError: string;
}

export const RICH_TEXT_EDITOR_DEFAULT_LABELS: RichTextEditorLabels = {
  editor: 'Rich text editor',
  toolbar: 'Formatting',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strikethrough',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  alignJustify: 'Justify',
  bulletList: 'Bullet list',
  numberedList: 'Numbered list',
  clearFormatting: 'Clear formatting',
  keywords: 'Add keyword',
  templates: 'Add template',
  templatesLoading: 'Loading templates…',
  templatesEmpty: 'No templates available',
  templatesError: 'Could not load templates',
};
