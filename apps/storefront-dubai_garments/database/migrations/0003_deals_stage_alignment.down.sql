UPDATE deals
SET stage = 'proposal_sent'
WHERE stage = 'quoted';

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_check;

ALTER TABLE deals
  ADD CONSTRAINT deals_stage_check
  CHECK (stage IN ('new', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'));
