export interface AdminQuote {
  id: string;
  quote_number: string;
  customer_id: string;
  lead_id?: string | null;
  deal_id?: string | null;
  created_by_user_id?: string | null;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  valid_until?: string | null;
  terms?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  customer_company_name?: string | null;
}

export interface AdminQuotesResponse {
  items: AdminQuote[];
}
