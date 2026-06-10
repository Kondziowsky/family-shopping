export interface GroupSummary {
  id: string;
  name: string;
  invite_code: string;
}

export interface ShoppingItem {
  id: string;
  group_id: string;
  name: string;
  quantity: string | null;
  note: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}
