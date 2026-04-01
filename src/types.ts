export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  business_name?: string;
  business_slug?: string;
  mp_checkout_enabled?: boolean;
  plan: 'trial' | '3m' | '6m' | 'annual';
  subscription_end?: string;
  bank_name?: string;
  bank_clabe?: string;
  bank_account_holder?: string;
  bank_alias?: string;
}

export interface Raffle {
  id: number;
  user_id: number;
  short_id: string;
  title: string;
  description?: string;
  type: 'simple' | 'opportunities';
  ticket_count: number;
  opportunities_per_ticket: number;
  distribution_type: 'linear' | 'random';
  ticket_price: number;
  currency: string;
  draw_date: string;
  status: 'active' | 'closed' | 'archived';
  created_at: string;
  tickets?: Ticket[];
}

export interface Ticket {
  id: number;
  raffle_id: number;
  number: string;
  participant_name?: string;
  participant_whatsapp?: string;
  status: 'available' | 'reserved' | 'paid';
  reserved_at?: string;
  paid_at?: string;
  opportunities?: string; // comma separated
}

export interface DashboardStats {
  total_raffles: number;
  active_raffles: number;
  total_tickets: number;
  paid_tickets: number;
  reserved_tickets: number;
  available_tickets: number;
  total_revenue: number;
  pending_revenue: number;
}
