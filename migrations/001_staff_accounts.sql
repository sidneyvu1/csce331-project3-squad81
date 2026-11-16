-- Run once against the existing project database before enabling staff login.
CREATE TABLE IF NOT EXISTS staff_accounts (
    auth_subject TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('manager', 'cashier', 'kitchen')),
    employee_id INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE
);
-- Provision accounts explicitly by their Auth0 user_id (sub), never by a browser-supplied role.
-- employee_id must match an existing employee referenced by orders.employee_id.
-- INSERT INTO staff_accounts (auth_subject, display_name, role, employee_id)
-- VALUES ('auth0|REPLACE_WITH_USER_ID', 'Peter Castillo', 'manager', NULL);
