import { Injectable } from '@angular/core';
import {
  RichTextTemplate,
  RichTextTemplateSource,
  RichTextTemplateSummary,
} from '../shared/ui/rich-text-editor';

/**
 * Stand-in for the .NET template API.
 *
 * Shapes and behaviour match what the backend will return: string ids (Guids), camelCase
 * payloads (System.Text.Json default), a cheap list endpoint plus a per-template body
 * endpoint, network latency, cancellation, and a 404 for an unknown id. Swapping in the
 * real thing is a body change per method, no touching the editor:
 *
 *   private readonly http = inject(HttpClient);   // needs provideHttpClient() in main.ts
 *
 *   listTemplates(abortSignal?: AbortSignal): Promise<readonly RichTextTemplateSummary[]> {
 *     return firstValueFrom(
 *       this.http.get<RichTextTemplateSummary[]>('/api/email-templates'),
 *     );
 *   }
 *
 *   getTemplate(id: string): Promise<RichTextTemplate> {
 *     return firstValueFrom(this.http.get<RichTextTemplate>(`/api/email-templates/${id}`));
 *   }
 */
@Injectable()
export class MockEmailTemplateSource extends RichTextTemplateSource {
  /** Flip to exercise the editor's error state without a backend. */
  private readonly simulateFailure = false;

  private readonly templates: readonly RichTextTemplate[] = [
    {
      id: '8f14e45f-ceea-467a-9f1b-2c4d1a5f9b01',
      name: 'Zaproszenie do grupy',
      description: 'Wysyłane, gdy ktoś dołącza do listy zakupów',
      html:
        '<p>Cześć <b>{{first_name}}</b>!</p>' +
        '<p>Dołącz do naszej listy zakupów <b>{{group_name}}</b>.</p>' +
        '<p style="text-align: center"><a href="https://family-shopping.app/join">Otwórz listę</a></p>',
    },
    {
      id: 'c9f0f895-fb98-4b41-b5c1-7a2e3d6c8e42',
      name: 'Przypomnienie o zakupach',
      description: 'Lista ma nieodhaczone produkty',
      html:
        '<p>Hej <b>{{first_name}}</b>,</p>' +
        '<p>Na liście <b>{{group_name}}</b> czeka jeszcze <b>{{items_count}}</b> produktów.</p>' +
        '<ul><li>Sprawdź listę przed wyjściem</li><li>Odhacz to, co już masz</li></ul>',
    },
    {
      id: '45c48cce-2e2d-4fc1-a9d1-8b3f5e7c1d93',
      name: 'Podsumowanie tygodnia',
      description: 'Raport wysyłany w niedzielę',
      html:
        '<h3>Podsumowanie tygodnia</h3>' +
        '<p>Grupa <b>{{group_name}}</b> kupiła w tym tygodniu <b>{{items_count}}</b> produktów.</p>' +
        '<p><i>Miłego tygodnia!</i></p>',
    },
  ];

  async listTemplates(abortSignal?: AbortSignal): Promise<readonly RichTextTemplateSummary[]> {
    await this.latency(450, abortSignal);
    if (this.simulateFailure) throw new Error('500 Internal Server Error');

    // The list endpoint returns metadata only - no bodies over the wire.
    return this.templates.map(({ id, name, description }) => ({ id, name, description }));
  }

  async getTemplate(id: string, abortSignal?: AbortSignal): Promise<RichTextTemplate> {
    await this.latency(300, abortSignal);

    const template = this.templates.find((candidate) => candidate.id === id);
    if (!template) throw new Error(`404 Template ${id} not found`);

    return template;
  }

  private latency(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const timer = setTimeout(() => {
        abortSignal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      const onAbort = (): void => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      abortSignal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
