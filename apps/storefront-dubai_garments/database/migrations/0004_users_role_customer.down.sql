DELETE FROM users WHERE role = 'customer';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'sales_manager', 'sales_rep', 'ops'));
