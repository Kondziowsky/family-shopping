import { Injectable } from '@angular/core';
import { EmailContact } from './types';

/**
 * Senders and recipients for the email composer.
 *
 * Bodies are mocked until the .NET endpoints exist, but the surface is the real one:
 * two independent calls, network latency, cancellation, and failures that surface rather
 * than resolving to an empty list. Swapping in the backend is a body change per method:
 *
 *   private readonly http = inject(HttpClient);   // needs provideHttpClient() in main.ts
 *
 *   listSenders(): Promise<readonly EmailContact[]> {
 *     return firstValueFrom(this.http.get<EmailContact[]>('/api/email/senders'));
 *   }
 *
 *   listRecipients(): Promise<readonly EmailContact[]> {
 *     return firstValueFrom(this.http.get<EmailContact[]>('/api/email/recipients'));
 *   }
 */
@Injectable({ providedIn: 'root' })
export class EmailContactsService {
  /** Flip to exercise the composer's error state without a backend. */
  private readonly simulateFailure = false;

  private readonly senders: readonly EmailContact[] = [
    { id: 'b1e7c0a2-3f4d-4a91-8c26-9d0e5f7a1b30', name: 'Family Shopping', email: 'no-reply@family-shopping.app' },
    { id: 'd4a8f31c-5b62-4e07-9a13-6c8b2e4f7d51', name: 'Konrad Parypa', email: 'konrad@family-shopping.app' },
  ];

  private readonly recipients: readonly EmailContact[] = [
    { id: '2c9d7e14-8a35-4b60-91f2-3e7d5c8a0b62', name: 'Anna Kowalska', email: 'anna@example.com' },
    { id: '7f3b1a58-6c94-4d2e-83a7-1b5e9d4c6f73', name: 'Piotr Nowak', email: 'piotr@example.com' },
    { id: 'e5d2c893-4a17-4f8b-b60c-2d9a3f1e7c84', name: 'Cała rodzina', email: 'rodzina@example.com' },
  ];

  async listSenders(abortSignal?: AbortSignal): Promise<readonly EmailContact[]> {
    await this.latency(350, abortSignal);
    if (this.simulateFailure) throw new Error('500 Internal Server Error');
    return this.senders;
  }

  async listRecipients(abortSignal?: AbortSignal): Promise<readonly EmailContact[]> {
    await this.latency(500, abortSignal);
    if (this.simulateFailure) throw new Error('500 Internal Server Error');
    return this.recipients;
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
