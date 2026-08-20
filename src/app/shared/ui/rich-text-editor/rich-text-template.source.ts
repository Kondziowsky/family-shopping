import { RichTextTemplate, RichTextTemplateSummary } from './rich-text.types';

/**
 * Where the editor gets its templates from.
 *
 * Abstract class rather than an `InjectionToken` so implementations get a compile-time
 * contract and consumers get a typed `inject()` with no generic argument. The editor
 * injects this optionally: no provider means no template button in the toolbar.
 *
 * Provide an implementation wherever the editor is used:
 *
 *   providers: [{ provide: RichTextTemplateSource, useClass: EmailTemplateSource }]
 *
 * The two-call shape (list, then body) mirrors how a template API is normally built -
 * listing every body up front gets expensive fast. `abortSignal` is passed through so a
 * closed dropdown can cancel a request still in flight.
 */
export abstract class RichTextTemplateSource {
  abstract listTemplates(abortSignal?: AbortSignal): Promise<readonly RichTextTemplateSummary[]>;
  abstract getTemplate(id: string, abortSignal?: AbortSignal): Promise<RichTextTemplate>;
}
