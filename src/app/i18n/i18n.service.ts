import { Injectable, signal } from '@angular/core';

type Lang = 'pl' | 'en';
type Dict = Record<string, string>;

const STORAGE_KEY = 'family-shopping.lang';

const dictionaries: Record<Lang, Dict> = {
  pl: {
    appTitle: 'Family Shopping',
    list: 'Lista zakupów',
    login: 'Logowanie',
    group: 'Grupa',
    email: 'E-mail',
    sendMagicLink: 'Wyślij magic link',
    magicLinkSent: 'Sprawdź skrzynkę i kliknij link logowania.',
    signOut: 'Wyloguj',
    createGroup: 'Utwórz grupę',
    groupName: 'Nazwa grupy',
    inviteLink: 'Link zaproszeniowy',
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    addItem: 'Dodaj produkt',
    name: 'Nazwa',
    quantity: 'Ilość',
    note: 'Notatka',
    save: 'Zapisz',
    delete: 'Usuń',
    done: 'Kupione',
    emptyList: 'Lista jest pusta.',
    joinInfo: 'Dołączono do grupy przez link zaproszeniowy.',
    noGroup: 'Utwórz grupę albo otwórz link zaproszeniowy.',
    goToLogin: 'Zaloguj',
    goToGroup: 'Ustaw grupę',
    refresh: 'Odśwież',
    error: 'Wystąpił błąd',
    currentUser: 'Zalogowany użytkownik',
    guest: 'Tryb gościa',
    enableNotifications: 'Włącz powiadomienia',
    listChanged: 'Lista zakupów została zmieniona',
    inviteEmail: 'Zaproś przez e-mail',
    sendInvite: 'Wyślij zaproszenie',
    inviteSent: 'Zaproszenie wysłane!'
  },
  en: {
    appTitle: 'Family Shopping',
    list: 'Shopping list',
    login: 'Login',
    group: 'Group',
    email: 'E-mail',
    sendMagicLink: 'Send magic link',
    magicLinkSent: 'Check your inbox and open the login link.',
    signOut: 'Sign out',
    createGroup: 'Create group',
    groupName: 'Group name',
    inviteLink: 'Invite link',
    copy: 'Copy',
    copied: 'Copied',
    addItem: 'Add item',
    name: 'Name',
    quantity: 'Quantity',
    note: 'Note',
    save: 'Save',
    delete: 'Delete',
    done: 'Done',
    emptyList: 'The list is empty.',
    joinInfo: 'Joined the group via invite link.',
    noGroup: 'Create a group or open an invite link.',
    goToLogin: 'Log in',
    goToGroup: 'Set group',
    refresh: 'Refresh',
    error: 'Something went wrong',
    currentUser: 'Current user',
    guest: 'Guest mode',
    enableNotifications: 'Enable notifications',
    listChanged: 'Shopping list changed',
    inviteEmail: 'Invite by email',
    sendInvite: 'Send invite',
    inviteSent: 'Invite sent!'
  }
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>((localStorage.getItem(STORAGE_KEY) as Lang) || 'pl');

  setLang(lang: Lang): void {
    localStorage.setItem(STORAGE_KEY, lang);
    this.lang.set(lang);
  }

  t(key: string): string {
    return dictionaries[this.lang()][key] ?? key;
  }
}
