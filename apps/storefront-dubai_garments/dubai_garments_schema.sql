--
-- PostgreSQL database dump
--

\restrict b4NBlmLI1QaIPLfyfBhVQsRi6OdLarOFQ3MhgtjHvfp9qNRTA5HxctluVe6GrNX

-- Dumped from database version 18.3 (Homebrew)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: rafi
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO rafi;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    customer_id uuid,
    lead_id uuid,
    deal_id uuid,
    quote_id uuid,
    activity_type text NOT NULL,
    title text NOT NULL,
    details text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activities OWNER TO rafi;

--
-- Name: automation_runs; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.automation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_name text NOT NULL,
    trigger_source text NOT NULL,
    trigger_entity_type text,
    trigger_entity_id uuid,
    status text DEFAULT 'queued'::text NOT NULL,
    request_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT automation_runs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'success'::text, 'failed'::text, 'cancelled'::text])))
);


ALTER TABLE public.automation_runs OWNER TO rafi;

--
-- Name: communications; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    lead_id uuid,
    deal_id uuid,
    quote_id uuid,
    user_id uuid,
    channel text NOT NULL,
    direction text NOT NULL,
    subject text,
    message_text text,
    external_message_id text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT communications_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'phone'::text, 'meeting'::text, 'other'::text]))),
    CONSTRAINT communications_direction_check CHECK ((direction = ANY (ARRAY['outbound'::text, 'inbound'::text])))
);


ALTER TABLE public.communications OWNER TO rafi;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    contact_name text,
    email text,
    phone text,
    whatsapp text,
    billing_address text,
    shipping_address text,
    industry text,
    notes text,
    owner_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customers OWNER TO rafi;

--
-- Name: deals; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    customer_id uuid NOT NULL,
    owner_user_id uuid,
    title text NOT NULL,
    stage text DEFAULT 'new'::text NOT NULL,
    expected_value numeric(12,2) DEFAULT 0 NOT NULL,
    probability_pct integer DEFAULT 0 NOT NULL,
    expected_close_date date,
    won_at timestamp with time zone,
    lost_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deals_expected_value_check CHECK ((expected_value >= (0)::numeric)),
    CONSTRAINT deals_probability_pct_check CHECK (((probability_pct >= 0) AND (probability_pct <= 100))),
    CONSTRAINT deals_stage_check CHECK ((stage = ANY (ARRAY['new'::text, 'qualified'::text, 'quoted'::text, 'negotiation'::text, 'won'::text, 'lost'::text])))
);


ALTER TABLE public.deals OWNER TO rafi;

--
-- Name: followups; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    lead_id uuid,
    deal_id uuid,
    quote_id uuid,
    assigned_to_user_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    channel text,
    subject text NOT NULL,
    notes text,
    due_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT followups_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT followups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.followups OWNER TO rafi;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    assigned_to_user_id uuid,
    source text DEFAULT 'website'::text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    lead_score integer,
    company_name text,
    contact_name text NOT NULL,
    email text,
    phone text,
    requested_qty integer,
    budget numeric(12,2),
    timeline_date date,
    notes text,
    last_contacted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_product text,
    ai_quantity integer,
    ai_urgency text,
    ai_complexity text,
    ai_processed_at timestamp with time zone,
    ai_provider text,
    ai_fallback_used boolean DEFAULT false NOT NULL,
    ai_score integer,
    ai_classification text,
    ai_reasoning jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT leads_ai_classification_check CHECK (((ai_classification IS NULL) OR (ai_classification = ANY (ARRAY['HOT'::text, 'WARM'::text, 'COLD'::text])))),
    CONSTRAINT leads_ai_complexity_check CHECK (((ai_complexity IS NULL) OR (ai_complexity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))),
    CONSTRAINT leads_ai_provider_check CHECK (((ai_provider IS NULL) OR (ai_provider = ANY (ARRAY['system'::text, 'openai'::text])))),
    CONSTRAINT leads_ai_quantity_check CHECK (((ai_quantity IS NULL) OR (ai_quantity > 0))),
    CONSTRAINT leads_ai_score_check CHECK (((ai_score IS NULL) OR ((ai_score >= 0) AND (ai_score <= 100)))),
    CONSTRAINT leads_ai_urgency_check CHECK (((ai_urgency IS NULL) OR (ai_urgency = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))),
    CONSTRAINT leads_budget_check CHECK (((budget IS NULL) OR (budget >= (0)::numeric))),
    CONSTRAINT leads_lead_score_check CHECK (((lead_score IS NULL) OR ((lead_score >= 0) AND (lead_score <= 100)))),
    CONSTRAINT leads_requested_qty_check CHECK (((requested_qty IS NULL) OR (requested_qty > 0))),
    CONSTRAINT leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'qualified'::text, 'quoted'::text, 'won'::text, 'lost'::text])))
);


ALTER TABLE public.leads OWNER TO rafi;

--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text NOT NULL,
    variant_name text NOT NULL,
    size text,
    color text,
    unit_price numeric(12,2) NOT NULL,
    moq integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_variants_moq_check CHECK ((moq > 0)),
    CONSTRAINT product_variants_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.product_variants OWNER TO rafi;

--
-- Name: products; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    short_description text,
    description text,
    material text,
    min_order_qty integer DEFAULT 1 NOT NULL,
    lead_time_days integer DEFAULT 7 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sizes text[] DEFAULT '{}'::text[] NOT NULL,
    colors text[] DEFAULT '{}'::text[] NOT NULL,
    branding_options text[] DEFAULT '{}'::text[] NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    price_tiers jsonb DEFAULT '[]'::jsonb NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    gallery text[] DEFAULT '{}'::text[] NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    CONSTRAINT products_lead_time_days_check CHECK ((lead_time_days > 0)),
    CONSTRAINT products_min_order_qty_check CHECK ((min_order_qty > 0))
);


ALTER TABLE public.products OWNER TO rafi;

--
-- Name: quote_documents; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.quote_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    storage_provider text DEFAULT 'local'::text NOT NULL,
    storage_bucket text,
    storage_key text,
    file_name text,
    mime_type text DEFAULT 'application/pdf'::text NOT NULL,
    file_size integer,
    status text DEFAULT 'queued'::text NOT NULL,
    error_message text,
    generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_documents_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'generated'::text, 'failed'::text])))
);


ALTER TABLE public.quote_documents OWNER TO rafi;

--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    product_id uuid,
    product_variant_id uuid,
    item_name text NOT NULL,
    description text,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pricing_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT quote_items_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT quote_items_line_total_check CHECK ((line_total >= (0)::numeric)),
    CONSTRAINT quote_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT quote_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.quote_items OWNER TO rafi;

--
-- Name: quotes; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_number text NOT NULL,
    customer_id uuid NOT NULL,
    lead_id uuid,
    deal_id uuid,
    created_by_user_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    currency text DEFAULT 'AED'::text NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    valid_until date,
    terms text,
    notes text,
    sent_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quotes_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))),
    CONSTRAINT quotes_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT quotes_tax_amount_check CHECK ((tax_amount >= (0)::numeric)),
    CONSTRAINT quotes_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.quotes OWNER TO rafi;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.schema_migrations (
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO rafi;

--
-- Name: users; Type: TABLE; Schema: public; Owner: rafi
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'sales_rep'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'sales_manager'::text, 'sales_rep'::text, 'ops'::text, 'customer'::text])))
);


ALTER TABLE public.users OWNER TO rafi;

--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: automation_runs automation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: followups followups_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.followups
    ADD CONSTRAINT followups_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: quote_documents quote_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quote_documents
    ADD CONSTRAINT quote_documents_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activities_activity_type; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_activities_activity_type ON public.activities USING btree (activity_type);


--
-- Name: idx_activities_customer_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_activities_customer_id ON public.activities USING btree (customer_id);


--
-- Name: idx_activities_deal_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_activities_deal_id ON public.activities USING btree (deal_id);


--
-- Name: idx_activities_lead_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_activities_lead_id ON public.activities USING btree (lead_id);


--
-- Name: idx_activities_occurred_at; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_activities_occurred_at ON public.activities USING btree (occurred_at DESC);


--
-- Name: idx_activities_quote_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_activities_quote_id ON public.activities USING btree (quote_id);


--
-- Name: idx_activities_user_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_activities_user_id ON public.activities USING btree (user_id);


--
-- Name: idx_automation_runs_created_at; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_automation_runs_created_at ON public.automation_runs USING btree (created_at DESC);


--
-- Name: idx_automation_runs_status; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_automation_runs_status ON public.automation_runs USING btree (status);


--
-- Name: idx_automation_runs_trigger; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_automation_runs_trigger ON public.automation_runs USING btree (trigger_entity_type, trigger_entity_id);


--
-- Name: idx_automation_runs_workflow_name; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_automation_runs_workflow_name ON public.automation_runs USING btree (workflow_name);


--
-- Name: idx_communications_channel; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_communications_channel ON public.communications USING btree (channel);


--
-- Name: idx_communications_created_at; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_communications_created_at ON public.communications USING btree (created_at DESC);


--
-- Name: idx_communications_customer_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_communications_customer_id ON public.communications USING btree (customer_id);


--
-- Name: idx_communications_deal_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_communications_deal_id ON public.communications USING btree (deal_id);


--
-- Name: idx_communications_direction; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_communications_direction ON public.communications USING btree (direction);


--
-- Name: idx_communications_lead_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_communications_lead_id ON public.communications USING btree (lead_id);


--
-- Name: idx_communications_quote_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_communications_quote_id ON public.communications USING btree (quote_id);


--
-- Name: idx_customers_owner_user_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_customers_owner_user_id ON public.customers USING btree (owner_user_id);


--
-- Name: idx_deals_customer_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_deals_customer_id ON public.deals USING btree (customer_id);


--
-- Name: idx_deals_lead_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_deals_lead_id ON public.deals USING btree (lead_id);


--
-- Name: idx_deals_owner_user_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_deals_owner_user_id ON public.deals USING btree (owner_user_id);


--
-- Name: idx_deals_stage; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_deals_stage ON public.deals USING btree (stage);


--
-- Name: idx_followups_assigned_to_user_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_followups_assigned_to_user_id ON public.followups USING btree (assigned_to_user_id);


--
-- Name: idx_followups_customer_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_followups_customer_id ON public.followups USING btree (customer_id);


--
-- Name: idx_followups_deal_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_followups_deal_id ON public.followups USING btree (deal_id);


--
-- Name: idx_followups_due_at; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_followups_due_at ON public.followups USING btree (due_at);


--
-- Name: idx_followups_lead_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_followups_lead_id ON public.followups USING btree (lead_id);


--
-- Name: idx_followups_quote_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_followups_quote_id ON public.followups USING btree (quote_id);


--
-- Name: idx_followups_status; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_followups_status ON public.followups USING btree (status);


--
-- Name: idx_leads_ai_processed_at; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_leads_ai_processed_at ON public.leads USING btree (ai_processed_at);


--
-- Name: idx_leads_assigned_to_user_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_leads_assigned_to_user_id ON public.leads USING btree (assigned_to_user_id);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at DESC);


--
-- Name: idx_leads_customer_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_leads_customer_id ON public.leads USING btree (customer_id);


--
-- Name: idx_leads_source; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_leads_source ON public.leads USING btree (source);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_product_variants_is_active; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_product_variants_is_active ON public.product_variants USING btree (is_active);


--
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_is_active; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);


--
-- Name: idx_quote_documents_created_at; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quote_documents_created_at ON public.quote_documents USING btree (created_at DESC);


--
-- Name: idx_quote_documents_quote_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quote_documents_quote_id ON public.quote_documents USING btree (quote_id);


--
-- Name: idx_quote_documents_status; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quote_documents_status ON public.quote_documents USING btree (status);


--
-- Name: idx_quote_items_product_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quote_items_product_id ON public.quote_items USING btree (product_id);


--
-- Name: idx_quote_items_product_variant_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quote_items_product_variant_id ON public.quote_items USING btree (product_variant_id);


--
-- Name: idx_quote_items_quote_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quote_items_quote_id ON public.quote_items USING btree (quote_id);


--
-- Name: idx_quotes_customer_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quotes_customer_id ON public.quotes USING btree (customer_id);


--
-- Name: idx_quotes_deal_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quotes_deal_id ON public.quotes USING btree (deal_id);


--
-- Name: idx_quotes_lead_id; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quotes_lead_id ON public.quotes USING btree (lead_id);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);


--
-- Name: idx_quotes_valid_until; Type: INDEX; Schema: public; Owner: rafi
--

CREATE INDEX idx_quotes_valid_until ON public.quotes USING btree (valid_until);


--
-- Name: activities trg_activities_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: automation_runs trg_automation_runs_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_automation_runs_updated_at BEFORE UPDATE ON public.automation_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: communications trg_communications_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_communications_updated_at BEFORE UPDATE ON public.communications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: customers trg_customers_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: deals trg_deals_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: followups trg_followups_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_followups_updated_at BEFORE UPDATE ON public.followups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: leads trg_leads_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: product_variants trg_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products trg_products_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quote_documents trg_quote_documents_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_quote_documents_updated_at BEFORE UPDATE ON public.quote_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quote_items trg_quote_items_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_quote_items_updated_at BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quotes trg_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: rafi
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activities activities_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: activities activities_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: activities activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: activities activities_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: communications communications_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: communications communications_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: communications communications_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: communications communications_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: communications communications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customers customers_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: deals deals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: deals deals_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: deals deals_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: followups followups_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.followups
    ADD CONSTRAINT followups_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: followups followups_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.followups
    ADD CONSTRAINT followups_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: followups followups_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.followups
    ADD CONSTRAINT followups_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: followups followups_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.followups
    ADD CONSTRAINT followups_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: followups followups_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.followups
    ADD CONSTRAINT followups_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: leads leads_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: quote_documents quote_documents_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quote_documents
    ADD CONSTRAINT quote_documents_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_product_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: quotes quotes_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rafi
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict b4NBlmLI1QaIPLfyfBhVQsRi6OdLarOFQ3MhgtjHvfp9qNRTA5HxctluVe6GrNX

