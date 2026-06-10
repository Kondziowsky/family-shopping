import { Injectable, signal } from '@angular/core';
import { createClient, RealtimeChannel, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from './environment';
import { GroupSummary, ShoppingItem } from './types';

const INVITE_CODE_KEY = 'family-shopping.inviteCode';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  readonly user = signal<User | null>(null);
  readonly loadingAuth = signal(true);
  private channel?: RealtimeChannel;

  constructor() {
    void this.initAuth();
  }

  get savedInviteCode(): string | null {
    return localStorage.getItem(INVITE_CODE_KEY);
  }

  saveInviteCode(inviteCode: string): void {
    localStorage.setItem(INVITE_CODE_KEY, inviteCode);
  }

  clearInviteCode(): void {
    localStorage.removeItem(INVITE_CODE_KEY);
  }

  async initAuth(): Promise<void> {
    const { data } = await this.client.auth.getSession();
    this.user.set(data.session?.user ?? null);
    this.loadingAuth.set(false);
    this.client.auth.onAuthStateChange((_event: string, session: Session | null) => {
      this.user.set(session?.user ?? null);
    });
  }

  async signInWithMagicLink(email: string): Promise<void> {
    const origin = window.location.origin;
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: origin }
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async createGroup(name: string): Promise<GroupSummary> {
    const { data, error } = await this.client.rpc('create_group_for_current_user', { group_name: name });
    if (error) throw error;
    return data as GroupSummary;
  }

  async getMyGroups(): Promise<GroupSummary[]> {
    const { data, error } = await this.client.rpc('get_my_groups');
    if (error) throw error;
    return (data ?? []) as GroupSummary[];
  }

  async getGroupByInvite(inviteCode: string): Promise<GroupSummary | null> {
    const { data, error } = await this.client.rpc('get_group_by_invite', { invite: inviteCode });
    if (error) throw error;
    return (data?.[0] ?? null) as GroupSummary | null;
  }

  async listItems(inviteCode: string): Promise<ShoppingItem[]> {
    const { data, error } = await this.client.rpc('list_items_for_invite', { invite: inviteCode });
    if (error) throw error;
    return (data ?? []) as ShoppingItem[];
  }

  async addItem(inviteCode: string, item: { name: string; quantity?: string | null; note?: string | null }): Promise<void> {
    const { error } = await this.client.rpc('add_item_for_invite', { invite: inviteCode, item_name: item.name, item_quantity: item.quantity ?? null, item_note: item.note ?? null });
    if (error) throw error;
  }

  async updateItem(inviteCode: string, itemId: string, patch: { name?: string; quantity?: string | null; note?: string | null; is_done?: boolean }): Promise<void> {
    const { error } = await this.client.rpc('update_item_for_invite', { invite: inviteCode, item_id: itemId, item_name: patch.name ?? null, item_quantity: patch.quantity ?? null, item_note: patch.note ?? null, item_is_done: patch.is_done ?? null });
    if (error) throw error;
  }

  async deleteItem(inviteCode: string, itemId: string): Promise<void> {
    const { error } = await this.client.rpc('delete_item_for_invite', { invite: inviteCode, item_id: itemId });
    if (error) throw error;
  }

  subscribeToItems(groupId: string, onChange: () => void): void {
    this.unsubscribeItems();
    this.channel = this.client
      .channel(`shopping-items-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `group_id=eq.${groupId}` }, onChange)
      .subscribe();
  }

  unsubscribeItems(): void {
    if (this.channel) {
      void this.client.removeChannel(this.channel);
      this.channel = undefined;
    }
  }
}
