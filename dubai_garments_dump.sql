--
-- PostgreSQL database dump
--

\restrict cSW8YWc3mrGRFSMKI45ZnQonEQzfpnmvJYbyhaFFnDsrJSzTgZ7DfhgApCGsSW1

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
    CONSTRAINT leads_ai_complexity_check CHECK (((ai_complexity IS NULL) OR (ai_complexity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))),
    CONSTRAINT leads_ai_provider_check CHECK (((ai_provider IS NULL) OR (ai_provider = ANY (ARRAY['system'::text, 'openai'::text])))),
    CONSTRAINT leads_ai_quantity_check CHECK (((ai_quantity IS NULL) OR (ai_quantity > 0))),
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
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.activities (id, user_id, customer_id, lead_id, deal_id, quote_id, activity_type, title, details, metadata, occurred_at, created_at, updated_at) FROM stdin;
41e36ed5-3571-4c9a-8df9-d2f17b5ea363	\N	\N	ef7ebd0e-c899-49bf-a4d0-45adcb85c2a7	\N	\N	lead_status_changed	Lead moved to Qualified	\N	{"to": "qualified", "from": "new"}	2026-03-10 11:59:52.092763+05	2026-03-10 11:59:52.092763+05	2026-03-10 11:59:52.092763+05
732724ac-9ace-426d-ab6c-9d61618f3008	\N	\N	c1a7d394-93a0-4cc5-b7be-b33f6268f550	\N	\N	lead_status_changed	Lead moved to Qualified	\N	{"to": "qualified", "from": "new"}	2026-03-10 12:00:05.030303+05	2026-03-10 12:00:05.030303+05	2026-03-10 12:00:05.030303+05
94d254b8-732c-48b5-8d75-786f5157ec44	\N	\N	ef7ebd0e-c899-49bf-a4d0-45adcb85c2a7	\N	\N	lead_status_changed	Lead moved to Quoted	\N	{"to": "quoted", "from": "qualified"}	2026-03-10 12:01:55.433823+05	2026-03-10 12:01:55.433823+05	2026-03-10 12:01:55.433823+05
324e5a46-cc1d-4bd5-b839-3196cc394a48	\N	\N	64a7b382-b36b-4359-97bc-fe288114454a	\N	\N	lead_created	Lead created from quote request	Lead was created from public quote request form.	{"source": "website", "status": "new"}	2026-03-10 12:22:39.935027+05	2026-03-10 12:22:39.935027+05	2026-03-10 12:22:39.935027+05
13059d98-f335-4a69-8750-0fa197d831f2	\N	\N	99bc656e-ebe5-4b20-8558-70f25489fe50	\N	\N	lead_created	Lead created from quote request	Lead was created from public quote request form.	{"source": "website", "status": "new"}	2026-03-10 12:26:22.082883+05	2026-03-10 12:26:22.082883+05	2026-03-10 12:26:22.082883+05
61224051-60e6-4dc8-b898-5bf9a7f7af73	\N	\N	a8b8c91c-ad1c-4f52-a217-c2983a734157	\N	\N	lead_created	Lead created from quote request	Lead was created from public quote request form.	{"source": "website", "status": "new"}	2026-03-10 12:35:40.377642+05	2026-03-10 12:35:40.377642+05	2026-03-10 12:35:40.377642+05
0e3a78e2-b7d5-4407-83fc-186f942cbdf5	\N	\N	a8b8c91c-ad1c-4f52-a217-c2983a734157	\N	\N	ai_processed_lead	AI processed lead	LeadAIService processed lead using system.	{"product": "garment", "urgency": "high", "provider": "system", "quantity": 600, "complexity": "high", "fallback_used": true}	2026-03-10 12:35:40.407673+05	2026-03-10 12:35:40.407673+05	2026-03-10 12:35:40.407673+05
f2b6a40a-0b0b-4bc4-b160-74890a6d3fa2	\N	\N	62d05770-3406-4f11-a43d-ea024260f98e	\N	\N	lead_created	Lead created from quote request	Lead was created from public quote request form.	{"source": "website", "status": "new"}	2026-03-10 12:39:17.739162+05	2026-03-10 12:39:17.739162+05	2026-03-10 12:39:17.739162+05
aa387791-21ac-4b40-ab4b-bc97999baada	\N	\N	62d05770-3406-4f11-a43d-ea024260f98e	\N	\N	ai_processed_lead	AI processed lead	LeadAIService processed lead using openai.	{"product": "159e71bc-c2f6-44eb-a9f0-c301c0ba0991", "urgency": "high", "provider": "openai", "quantity": 300, "complexity": "medium", "fallback_used": false}	2026-03-10 12:39:21.342468+05	2026-03-10 12:39:21.342468+05	2026-03-10 12:39:21.342468+05
\.


--
-- Data for Name: automation_runs; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.automation_runs (id, workflow_name, trigger_source, trigger_entity_type, trigger_entity_id, status, request_payload, response_payload, error_message, started_at, finished_at, created_at, updated_at) FROM stdin;
ae1d9bf9-0aa8-440e-9fbf-0060a2b604a1	lead_ai_processing	lead_created	lead	64a7b382-b36b-4359-97bc-fe288114454a	cancelled	{"model": "gpt-4o-mini", "leadId": "64a7b382-b36b-4359-97bc-fe288114454a"}	{"reason": "missing_openai_api_key", "processed": false}	OPENAI_API_KEY is not configured.	2026-03-10 12:22:39.942447+05	2026-03-10 12:22:39.942447+05	2026-03-10 12:22:39.947594+05	2026-03-10 12:22:39.947594+05
3cd78595-6cb5-4801-ba9a-04a93fab6fe2	lead_ai_processing	lead_created	lead	99bc656e-ebe5-4b20-8558-70f25489fe50	cancelled	{"model": "gpt-4o-mini", "leadId": "99bc656e-ebe5-4b20-8558-70f25489fe50"}	{"reason": "missing_openai_api_key", "processed": false}	OPENAI_API_KEY is not configured.	2026-03-10 12:26:22.088762+05	2026-03-10 12:26:22.088762+05	2026-03-10 12:26:22.095249+05	2026-03-10 12:26:22.095249+05
05528dec-600b-4297-aa59-17a101deb2ec	lead_ai_processing	lead_created	lead	a8b8c91c-ad1c-4f52-a217-c2983a734157	cancelled	{"model": "gpt-4o-mini", "leadId": "a8b8c91c-ad1c-4f52-a217-c2983a734157"}	{"reason": "missing_openai_api_key", "provider": "system", "processed": true}	OPENAI_API_KEY is not configured. Heuristic system fallback used.	2026-03-10 12:35:40.39528+05	2026-03-10 12:35:40.39528+05	2026-03-10 12:35:40.400874+05	2026-03-10 12:35:40.400874+05
f2571f52-738c-4cdd-b42f-ea8d2088fc77	lead_ai_processing	lead_created	lead	62d05770-3406-4f11-a43d-ea024260f98e	success	{"model": "gpt-4o-mini", "leadId": "62d05770-3406-4f11-a43d-ea024260f98e", "message": "Contact: Ali\\nCompany: New\\nEmail: mrafi.stonixtech@gmail.com\\nPhone: Unknown\\nRequested Quantity: 300\\nTimeline Date: 2026-03-12\\nNotes: Product: 159e71bc-c2f6-44eb-a9f0-c301c0ba0991\\nMessage: Give me new uniform 300 pieces at the end of this week"}	{"product": "159e71bc-c2f6-44eb-a9f0-c301c0ba0991", "urgency": "high", "provider": "openai", "quantity": 300, "complexity": "medium", "fallback_used": false}	\N	2026-03-10 12:39:21.352221+05	2026-03-10 12:39:21.352221+05	2026-03-10 12:39:21.35845+05	2026-03-10 12:39:21.35845+05
\.


--
-- Data for Name: communications; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.communications (id, customer_id, lead_id, deal_id, quote_id, user_id, channel, direction, subject, message_text, external_message_id, sent_at, delivered_at, read_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.customers (id, company_name, contact_name, email, phone, whatsapp, billing_address, shipping_address, industry, notes, owner_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: deals; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.deals (id, lead_id, customer_id, owner_user_id, title, stage, expected_value, probability_pct, expected_close_date, won_at, lost_reason, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: followups; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.followups (id, customer_id, lead_id, deal_id, quote_id, assigned_to_user_id, status, priority, channel, subject, notes, due_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.leads (id, customer_id, assigned_to_user_id, source, status, lead_score, company_name, contact_name, email, phone, requested_qty, budget, timeline_date, notes, last_contacted_at, created_at, updated_at, ai_product, ai_quantity, ai_urgency, ai_complexity, ai_processed_at, ai_provider, ai_fallback_used) FROM stdin;
14391e2f-bfac-4604-93bc-c8784d1dba82	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: urgent	\N	2026-03-10 09:19:41.284422+05	2026-03-10 09:19:41.284422+05	\N	\N	\N	\N	\N	\N	f
53d9d1b9-36ac-4100-a087-2feff5e5ad05	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: urgent	\N	2026-03-10 09:19:48.13447+05	2026-03-10 09:19:48.13447+05	\N	\N	\N	\N	\N	\N	f
4dd0241c-1070-4f12-8f23-3fbbdb50e76d	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: TEST	\N	2026-03-10 09:20:14.497141+05	2026-03-10 09:20:14.497141+05	\N	\N	\N	\N	\N	\N	f
510191e2-fcb7-4f45-a9d6-a6300a79c788	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: TEST	\N	2026-03-10 09:22:15.581638+05	2026-03-10 09:22:15.581638+05	\N	\N	\N	\N	\N	\N	f
df8e3c9e-1e90-4a13-bc2e-7483d1300aff	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: TEST	\N	2026-03-10 09:22:20.665236+05	2026-03-10 09:22:20.665236+05	\N	\N	\N	\N	\N	\N	f
75305c0e-bdfe-49c2-978e-ca1f0c8cd86e	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: TEST	\N	2026-03-10 09:22:21.678002+05	2026-03-10 09:22:21.678002+05	\N	\N	\N	\N	\N	\N	f
0486d42b-7c97-4d34-98dd-5d67ca79abfc	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: TEST	\N	2026-03-10 09:22:22.479016+05	2026-03-10 09:22:22.479016+05	\N	\N	\N	\N	\N	\N	f
b7306d08-a5e6-4531-8668-26850130c69d	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: TEST	\N	2026-03-10 09:22:38.360364+05	2026-03-10 09:22:38.360364+05	\N	\N	\N	\N	\N	\N	f
cfe9c898-270e-46b9-9b80-2b51827f58ee	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: TEST	\N	2026-03-10 09:22:39.100213+05	2026-03-10 09:22:39.100213+05	\N	\N	\N	\N	\N	\N	f
93186d8e-7bd6-4f23-9ceb-3c0ff7436264	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-12-29	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: test	\N	2026-03-10 09:23:37.430048+05	2026-03-10 09:23:37.430048+05	\N	\N	\N	\N	\N	\N	f
589fb948-bbba-4453-8815-0f2b60a7d3b9	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-12-29	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: test	\N	2026-03-10 09:25:23.922131+05	2026-03-10 09:25:23.922131+05	\N	\N	\N	\N	\N	\N	f
312eddaa-4f9a-45e8-9483-07463c9b4db5	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-12-29	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: test	\N	2026-03-10 09:25:56.8582+05	2026-03-10 09:25:56.8582+05	\N	\N	\N	\N	\N	\N	f
606420b8-a409-40f9-9d95-b537e5a606c3	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-18	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: test	\N	2026-03-10 09:27:11.274738+05	2026-03-10 09:27:11.274738+05	\N	\N	\N	\N	\N	\N	f
121f9ba0-1b59-4a04-9188-7f3bcf64aa62	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-18	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: test	\N	2026-03-10 09:32:24.390564+05	2026-03-10 09:32:24.390564+05	\N	\N	\N	\N	\N	\N	f
b7c63c83-83ee-4d82-8ff0-bde8f970cc4b	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	333	\N	2026-03-12	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b	\N	2026-03-10 09:35:25.043515+05	2026-03-10 09:35:25.043515+05	\N	\N	\N	\N	\N	\N	f
9ea841c1-20b1-41ca-a437-c75c2d711723	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	333	\N	2026-03-11	Product: 159e71bc-c2f6-44eb-a9f0-c301c0ba0991\nMessage: test	\N	2026-03-10 09:36:01.546698+05	2026-03-10 09:36:01.546698+05	\N	\N	\N	\N	\N	\N	f
3f9100e1-d26d-4c4d-aaab-cae6b2d04ef8	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	333	\N	2026-03-11	Product: 159e71bc-c2f6-44eb-a9f0-c301c0ba0991\nMessage: test	\N	2026-03-10 09:36:26.467395+05	2026-03-10 09:36:26.467395+05	\N	\N	\N	\N	\N	\N	f
7e9a1cef-276e-45e9-b05e-58b027d50d2d	\N	\N	website	new	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	333	\N	2026-03-13	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: test	\N	2026-03-10 09:39:20.309838+05	2026-03-10 09:39:20.309838+05	\N	\N	\N	\N	\N	\N	f
c1a7d394-93a0-4cc5-b7be-b33f6268f550	\N	\N	website	qualified	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	200	\N	2026-03-13	Product: 159e71bc-c2f6-44eb-a9f0-c301c0ba0991	\N	2026-03-10 09:41:38.069905+05	2026-03-10 12:00:05.030303+05	\N	\N	\N	\N	\N	\N	f
ef7ebd0e-c899-49bf-a4d0-45adcb85c2a7	\N	\N	website	quoted	\N	DuneSkyline	Rio Dev	mrafi.stonixtech@gmail.com	\N	444	\N	2026-03-11	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: test	\N	2026-03-10 10:06:11.550916+05	2026-03-10 12:01:55.433823+05	\N	\N	\N	\N	\N	\N	f
64a7b382-b36b-4359-97bc-fe288114454a	\N	\N	website	new	\N	DuneSkyline	Rafi Magsi	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-12	Product: 159e71bc-c2f6-44eb-a9f0-c301c0ba0991\nMessage: TEST this with 300 and deliver this week	\N	2026-03-10 12:22:39.935027+05	2026-03-10 12:22:39.935027+05	\N	\N	\N	\N	\N	\N	f
99bc656e-ebe5-4b20-8558-70f25489fe50	\N	\N	website	new	\N	New Way	Rafi Khan	mrafi.stonixtech@gmail.com	\N	399	\N	2026-03-13	Product: 8f537ac2-9f0e-4ac9-96f3-ae740e39e67b\nMessage: Send me quote today for 399 jersey	\N	2026-03-10 12:26:22.082883+05	2026-03-10 12:26:22.082883+05	\N	\N	\N	\N	\N	\N	f
a8b8c91c-ad1c-4f52-a217-c2983a734157	\N	\N	website	new	\N	Newton	Rafi Magsi	mrafi.stonixtech@gmail.com	\N	600	\N	2026-03-15	Product: 546fa8d3-cd03-42e1-b78f-6dd5cc91f8e3\nMessage: I want 600 t shirts this week	\N	2026-03-10 12:35:40.377642+05	2026-03-10 12:35:40.407673+05	garment	600	high	high	2026-03-10 12:35:40.407673+05	system	t
62d05770-3406-4f11-a43d-ea024260f98e	\N	\N	website	new	\N	New	Ali	mrafi.stonixtech@gmail.com	\N	300	\N	2026-03-12	Product: 159e71bc-c2f6-44eb-a9f0-c301c0ba0991\nMessage: Give me new uniform 300 pieces at the end of this week	\N	2026-03-10 12:39:17.739162+05	2026-03-10 12:39:21.342468+05	159e71bc-c2f6-44eb-a9f0-c301c0ba0991	300	high	medium	2026-03-10 12:39:21.342468+05	openai	f
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.product_variants (id, product_id, sku, variant_name, size, color, unit_price, moq, is_active, created_at, updated_at) FROM stdin;
09bc0545-4994-4112-b041-96d87f4c7e1f	546fa8d3-cd03-42e1-b78f-6dd5cc91f8e3	TS-CORP-BLK-M	Black / M	M	Black	36.00	50	t	2026-03-09 20:17:08.486+05	2026-03-09 20:17:08.486+05
e4466891-910f-4dc1-a65d-62651d2c2d36	546fa8d3-cd03-42e1-b78f-6dd5cc91f8e3	TS-CORP-WHT-L	White / L	L	White	36.00	50	t	2026-03-09 20:17:08.486+05	2026-03-09 20:17:08.486+05
23a273e6-728a-4bed-8ea5-9fc8ce97ccd5	91e9acb9-e03b-489c-a2ea-2067593d359a	HD-EVT-BLK-M	Black / M	M	Black	78.00	30	t	2026-03-09 20:17:08.49+05	2026-03-09 20:17:08.49+05
90f0eb4c-6acc-4701-8629-ac3d7af0108a	91e9acb9-e03b-489c-a2ea-2067593d359a	HD-EVT-MRN-L	Maroon / L	L	Maroon	78.00	30	t	2026-03-09 20:17:08.49+05	2026-03-09 20:17:08.49+05
dda16e39-c63c-4624-9c8c-699b011e5e1b	159e71bc-c2f6-44eb-a9f0-c301c0ba0991	UF-HSP-CHR-M	Charcoal / M	M	Charcoal	89.00	40	t	2026-03-09 20:17:08.492+05	2026-03-09 20:17:08.492+05
3557fdcd-514f-48c3-9b11-aa617ea308cf	159e71bc-c2f6-44eb-a9f0-c301c0ba0991	UF-HSP-NVY-L	Navy / L	L	Navy	89.00	40	t	2026-03-09 20:17:08.492+05	2026-03-09 20:17:08.492+05
c4e056bb-e4ab-4313-bce1-86bfb9377f25	8f537ac2-9f0e-4ac9-96f3-ae740e39e67b	JR-PRF-CUS-M	Custom / M	M	Custom	54.00	25	t	2026-03-09 20:17:08.493+05	2026-03-09 20:17:08.493+05
46c43b04-869a-47ad-bcd4-23170e8e87ed	8f537ac2-9f0e-4ac9-96f3-ae740e39e67b	JR-PRF-CUS-L	Custom / L	L	Custom	54.00	25	t	2026-03-09 20:17:08.493+05	2026-03-09 20:17:08.493+05
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.products (id, slug, name, category, short_description, description, material, min_order_qty, lead_time_days, is_active, created_by_user_id, created_at, updated_at, sizes, colors, branding_options, tags, price_tiers, image, gallery, featured) FROM stdin;
91e9acb9-e03b-489c-a2ea-2067593d359a	custom-event-hoodie	Custom Event Hoodie	hoodies	Heavyweight hoodie for team wear and corporate campaigns.	A comfortable hoodie suitable for event teams, internal branding, and premium merchandise.	Cotton Fleece	30	12	t	\N	2026-03-09 20:13:26.254+05	2026-03-09 20:17:08.488816+05	{S,M,L,XL}	{Black,Beige,Maroon}	{Embroidery,"Screen Printing"}	{winter,events,merch}	[{"maxQty": 99, "minQty": 30, "unitPriceAED": 78}, {"maxQty": 299, "minQty": 100, "unitPriceAED": 72}, {"minQty": 300, "unitPriceAED": 68}]	/images/products/hoodie.jpg	{}	t
546fa8d3-cd03-42e1-b78f-6dd5cc91f8e3	premium-corporate-tshirt	Premium Corporate T-Shirt	tshirts	Soft premium cotton t-shirt for branding and events.	A premium corporate t-shirt designed for bulk orders, events, staff uniforms, and branded campaigns.	100% Cotton	50	10	t	\N	2026-03-09 20:13:26.243+05	2026-03-09 20:17:08.479565+05	{S,M,L,XL,XXL}	{Black,White,Navy,Gray}	{"Screen Printing",Embroidery,"DTF Printing"}	{corporate,events,best-seller}	[{"maxQty": 149, "minQty": 50, "unitPriceAED": 36}, {"maxQty": 499, "minQty": 150, "unitPriceAED": 33}, {"minQty": 500, "unitPriceAED": 30}]	/images/products/tshirt.jpg	{}	t
159e71bc-c2f6-44eb-a9f0-c301c0ba0991	hospitality-staff-uniform	Hospitality Staff Uniform Set	uniforms	Durable smart-fit uniform set for hotels and restaurants.	Professional uniform set with breathable fabric and stain-resistant treatment for daily operations.	Poly-Cotton Blend	40	14	t	\N	2026-03-09 20:13:26.256+05	2026-03-09 20:17:08.490589+05	{S,M,L,XL,XXL,3XL}	{Charcoal,Navy,White}	{Embroidery,"Woven Patches"}	{hospitality,uniform,staff}	[{"maxQty": 149, "minQty": 40, "unitPriceAED": 89}, {"maxQty": 399, "minQty": 150, "unitPriceAED": 83}, {"minQty": 400, "unitPriceAED": 79}]	/images/products/uniform.jpg	{}	f
8f537ac2-9f0e-4ac9-96f3-ae740e39e67b	team-performance-jersey	Team Performance Jersey	jerseys	Moisture-wicking team jersey with full sublimation support.	High-performance jersey for sports clubs, school leagues, and corporate tournaments.	Polyester Mesh	25	9	t	\N	2026-03-09 20:13:26.258+05	2026-03-09 20:17:08.492512+05	{XS,S,M,L,XL,XXL}	{"Custom Palette"}	{Sublimation,"Heat Transfer"}	{sports,team,custom-colors}	[{"maxQty": 99, "minQty": 25, "unitPriceAED": 54}, {"maxQty": 249, "minQty": 100, "unitPriceAED": 49}, {"minQty": 250, "unitPriceAED": 45}]	/images/products/jersey.jpg	{}	t
\.


--
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.quote_items (id, quote_id, product_id, product_variant_id, item_name, description, quantity, unit_price, discount_amount, line_total, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.quotes (id, quote_number, customer_id, lead_id, deal_id, created_by_user_id, status, currency, subtotal, tax_amount, discount_amount, total_amount, valid_until, terms, notes, sent_at, approved_at, rejected_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.schema_migrations (name, applied_at) FROM stdin;
0001_initial_schema.up.sql	2026-03-09 20:13:18.251408+05
0002_products_catalog_fields.up.sql	2026-03-09 20:13:18.333742+05
0003_deals_stage_alignment.up.sql	2026-03-10 10:51:36.903624+05
0004_users_role_customer.up.sql	2026-03-10 11:07:51.30386+05
0005_lead_ai_fields.up.sql	2026-03-10 12:13:39.293464+05
0006_lead_ai_provider_fields.up.sql	2026-03-10 12:34:20.892461+05
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: rafi
--

COPY public.users (id, full_name, email, password_hash, role, is_active, last_login_at, created_at, updated_at) FROM stdin;
8407c070-8183-49ce-ad9a-5a72e472aa08	Rafi Admin	admin@dubaigarments.me	$2a$06$OdLETtuACRujuBkm/mWSyOtCL5bgyIhKkyPACYV6LiuBMdmWVx8AG	admin	t	\N	2026-03-10 11:10:45.841073+05	2026-03-10 11:10:45.841073+05
c59aa183-9b3d-459a-99b9-72a6fe668dbd	Rafi User	test@dubaigarments.me	$2a$06$hOwx2OoLa7lXd.i0pJU2reckh5v460IQ4kZUnlvpmuMt4VtmDxjBq	customer	t	\N	2026-03-10 11:10:45.857939+05	2026-03-10 11:10:45.857939+05
\.


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

\unrestrict cSW8YWc3mrGRFSMKI45ZnQonEQzfpnmvJYbyhaFFnDsrJSzTgZ7DfhgApCGsSW1

