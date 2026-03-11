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

export interface AdminQuotePdfDocument {
  id: string;
  quote_id: string;
  storage_provider: string;
  storage_bucket?: string | null;
  storage_key?: string | null;
  file_name?: string | null;
  mime_type: string;
  file_size?: number | null;
  status: 'queued' | 'processing' | 'generated' | 'failed' | string;
  error_message?: string | null;
  generated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminQuotePdfStatusResponse {
  quoteId: string;
  status: 'not_generated' | 'queued' | 'processing' | 'generated' | 'failed' | string;
  document?: AdminQuotePdfDocument | null;
  downloadUrl?: string | null;
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
