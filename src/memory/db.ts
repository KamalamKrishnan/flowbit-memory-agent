import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const dbPath = path.join(__dirname, "../../data/memory.db");
const schemaPath = path.join(__dirname, "./schema.sql");

export const db = new sqlite3.Database(dbPath);

export function initializeDB() {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schema, (err) => {
        if (err) {
            console.error("Error initializing database:", err);
        } else {
            console.log("Database schema initialized.");
        }
    });
}

// Promisify db methods for async/await usage
const runAsync = promisify(db.run.bind(db));
const allAsync = promisify(db.all.bind(db));
const getAsync = promisify(db.get.bind(db));

// Vendor Memory
export async function addOrUpdateVendorMemory(
    vendor: string,
    patternKey: string,
    patternValue: string,
    confidence: number = 1.0
) {
    const existing = await getAsync(
        `SELECT * FROM vendor_memory WHERE vendor = ? AND pattern_key = ? AND pattern_value = ?`,
        [vendor, patternKey, patternValue]
    );

    if (existing) {
        await runAsync(
            `UPDATE vendor_memory SET confidence = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
            [confidence, existing.id]
        );
    } else {
        await runAsync(
            `INSERT INTO vendor_memory (vendor, pattern_key, pattern_value, confidence) VALUES (?, ?, ?, ?)`,
            [vendor, patternKey, patternValue, confidence]
        );
    }
}

// Get Vendor Memories
export async function getVendorMemories(vendor: string) {
    return await allAsync(`SELECT * FROM vendor_memory WHERE vendor = ?`, [vendor]);
}

// Correction Memory
export async function addOrUpdateCorrectionMemory(
    vendor: string,
    field: string,
    fromValue: string | null,
    toValue: string,
    reason: string,
    confidence: number = 1.0
) {
    const existing = await getAsync(
        `SELECT * FROM correction_memory WHERE vendor = ? AND field = ? AND from_value = ? AND to_value = ?`,
        [vendor, field, fromValue, toValue]
    );

    if (existing) {
        await runAsync(
            `UPDATE correction_memory SET confidence = ?, reason = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
            [confidence, reason, existing.id]
        );
    } else {
        await runAsync(
            `INSERT INTO correction_memory (vendor, field, from_value, to_value, reason, confidence) VALUES (?, ?, ?, ?, ?, ?)`,
            [vendor, field, fromValue, toValue, reason, confidence]
        );
    }
}

// Get Correction Memories
export async function getCorrectionMemories(vendor: string) {
    return await allAsync(`SELECT * FROM correction_memory WHERE vendor = ?`, [vendor]);
}

// Resolution Memory
export async function addResolutionMemory(invoiceId: string, vendor: string, decision: string) {
    await runAsync(
        `INSERT INTO resolution_memory (invoice_id, vendor, decision, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [invoiceId, vendor, decision]
    );
}

// Audit Trail
export async function logAudit(invoiceId: string | null, step: string, details: string) {
    await runAsync(
        `INSERT INTO audit_trail (invoice_id, step, details, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [invoiceId, step, details]
    );
}
