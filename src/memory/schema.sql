-- Vendor Memory
CREATE TABLE IF NOT EXISTS vendor_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    pattern_value TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor, pattern_key, pattern_value)
);

-- Correction Memory
CREATE TABLE IF NOT EXISTS correction_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor TEXT NOT NULL,
    field TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT NOT NULL,
    reason TEXT,
    confidence REAL DEFAULT 1.0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor, field, from_value, to_value)
);

-- Processed Invoices (for duplicate detection)
CREATE TABLE IF NOT EXISTS processed_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id TEXT NOT NULL,
    vendor TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT,
    content_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor, invoice_number)
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_trail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id TEXT,
    step TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resolution Memory
CREATE TABLE IF NOT EXISTS resolution_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id TEXT,
    vendor TEXT,
    field TEXT,
    from_value TEXT,
    to_value TEXT,
    decision TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
