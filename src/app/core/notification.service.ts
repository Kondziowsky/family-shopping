import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly supported = 'Notification' in window;
  readonly permission = signal<NotificationPermission>(this.supported ? Notification.permission : 'denied');

  async requestPermission(): Promise<void> {
    if (!this.supported) return;
    const result = await Notification.requestPermission();
    this.permission.set(result);
  }

  notify(title: string, body: string): void {
    if (!this.supported || this.permission() !== 'granted') return;
    if (document.hasFocus()) return;
    new Notification(title, { body });
  }
}
