USE master_db;

-- 1. Create the primary SaaS Company (Idempotent)
INSERT INTO companies (
    company_uuid, 
    company_name, 
    database_name, 
    status, 
    created_at, 
    updated_at
) 
SELECT 
    UUID(), 
    'Legacy Ledger', 
    'ledger_db', 
    'active', 
    NOW(), 
    NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM companies WHERE database_name = 'ledger_db'
);

-- Capture the generated or existing company ID
SELECT id INTO @company_id FROM companies WHERE database_name = 'ledger_db' LIMIT 1;

-- 2. Copy the existing admin user (Idempotent)
INSERT INTO users (
    company_id, 
    name, 
    email, 
    email_verified_at, 
    password, 
    remember_token, 
    created_at, 
    updated_at
)
SELECT 
    @company_id, 
    name, 
    email, 
    email_verified_at, 
    password, 
    remember_token, 
    created_at, 
    updated_at 
FROM ledger_db.users 
WHERE email = 'admin@ledger.com'
AND NOT EXISTS (
    SELECT 1 FROM master_db.users WHERE email = 'admin@ledger.com'
);
