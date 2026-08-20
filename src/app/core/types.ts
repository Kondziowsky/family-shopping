export interface GroupSummary {
  id: string;
  name: string;
  invite_code: string;
  role?: 'owner' | 'member';
}

export interface ShoppingItem {
  id: string;
  group_id: string;
  name: string;
  quantity: string | null;
  note: string | null;
  is_done: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}
