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

export interface AdminQuoteItem {
  id: string;
  quote_id: string;
  product_id?: string | null;
  product_variant_id?: string | null;
  item_name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  pricing_breakdown: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminQuoteDetailResponse {
  item: AdminQuote;
  items: AdminQuoteItem[];
}

export interface AdminQuoteStatusUpdateInput {
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  notes?: string;
}

export interface AdminQuoteCreateItemInput {
  product_id: string;
  product_variant_id?: string;
  quantity: number;
  customization_cost_per_unit?: number;
  customization_flat_cost?: number;
  is_rush?: boolean;
  requested_delivery_days?: number;
  rush_fee_pct?: number;
  margin_pct?: number;
  note?: string;
}

export interface AdminQuoteCreateInput {
  customer_id: string;
  lead_id?: string;
  deal_id?: string;
  created_by_user_id?: string;
  currency?: string;
  valid_until?: string;
  terms?: string;
  notes?: string;
  discount_amount?: number;
  tax_pct?: number;
  items: AdminQuoteCreateItemInput[];
}
