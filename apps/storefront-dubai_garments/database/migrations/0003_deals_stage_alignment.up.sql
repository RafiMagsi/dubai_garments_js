ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_check;

ALTER TABLE deals
  ADD CONSTRAINT deals_stage_check
  CHECK (stage IN ('new', 'qualified', 'quoted', 'negotiation', 'won', 'lost'));

UPDATE deals
SET stage = 'quoted'
WHERE stage = 'proposal_sent';
