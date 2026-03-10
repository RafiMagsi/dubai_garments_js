-- Dubai Garments AI Sales Automation Platform
-- Rollback for 0001_initial_schema.up.sql

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_followups_updated_at ON followups;
DROP TRIGGER IF EXISTS trg_automation_runs_updated_at ON automation_runs;
DROP TRIGGER IF EXISTS trg_activities_updated_at ON activities;
DROP TRIGGER IF EXISTS trg_communications_updated_at ON communications;
DROP TRIGGER IF EXISTS trg_quote_items_updated_at ON quote_items;
DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
DROP TRIGGER IF EXISTS trg_deals_updated_at ON deals;
DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON product_variants;
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS followups;
DROP TABLE IF EXISTS automation_runs;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS communications;
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;

-- Drop helper function
DROP FUNCTION IF EXISTS set_updated_at();
