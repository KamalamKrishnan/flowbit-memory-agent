import { ProcessedInvoice, AuditEntry } from "./types";
import {
    applyCorrectionMemory,
    loadHumanCorrections,
    learnCorrectionMemory
} from "./correctionMemory";
import { applyVendorMemory, learnVendorMemory } from "./vendorMemory";
import { db } from "./db";
import crypto from "crypto";

// ─────────────────────────────────────────────
// DUPLICATE DETECTION
// ─────────────────────────────────────────────
function checkDuplicateInvoice(
    vendor: string,
    invoiceNumber: string
): Promise<boolean> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT id FROM processed_invoices
             WHERE vendor = ? AND invoice_number = ?`,
            [vendor, invoiceNumber],
            (err, row) => {
                if (err) return reject(err);
                resolve(!!row);
            }
        );
    });
}

function storeProcessedInvoice(
    invoiceId: string,
    vendor: string,
    invoiceNumber: string,
    invoiceDate: string,
    contentHash: string
) {
    db.run(
        `INSERT INTO processed_invoices
         (invoice_id, vendor, invoice_number, invoice_date, content_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [invoiceId, vendor, invoiceNumber, invoiceDate, contentHash],
        (err) => {
            if (err) {
                console.error("Error storing processed invoice:", err);
            }
        }
    );
}

function generateContentHash(fields: any): string {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(fields))
        .digest("hex");
}

// ─────────────────────────────────────────────
// MAIN PROCESSOR
// ─────────────────────────────────────────────
export async function processInvoice(
    invoice: any,
    humanCorrections: any[] = []
): Promise<ProcessedInvoice> {

    loadHumanCorrections();
    const auditTrail: AuditEntry[] = [];

    // STEP 0 — DUPLICATE CHECK
    const isDuplicate = await checkDuplicateInvoice(
        invoice.vendor,
        invoice.fields.invoiceNumber
    );

    if (isDuplicate) {
        auditTrail.push({
            step: "decide",
            timestamp: new Date().toISOString(),
            details: "Duplicate invoice detected"
        });

        return {
            normalizedInvoice: invoice.fields,
            proposedCorrections: [],
            requiresHumanReview: true,
            reasoning: "Duplicate invoice detected",
            confidenceScore: 0.0,
            memoryUpdates: [],
            auditTrail
        };
    }

    let updatedInvoice = { ...invoice.fields };
    let memoryUpdates: string[] = [];
    let reasoning = "";
    let confidenceScore = 0.5;

    // STEP 1 — APPLY VENDOR MEMORY
    const vendorResult = await applyVendorMemory(
        updatedInvoice,
        invoice.rawText,
        updatedInvoice,
        auditTrail
    );

    updatedInvoice = vendorResult.updatedInvoice;
    memoryUpdates.push(...vendorResult.memoryUpdates);
    reasoning += vendorResult.reasoning;
    confidenceScore = Math.max(confidenceScore, vendorResult.confidenceScore);

    // STEP 2 — APPLY CORRECTION MEMORY
    const correctionResult = await applyCorrectionMemory(
        updatedInvoice,
        invoice.vendor,
        auditTrail
    );

    updatedInvoice = correctionResult.updatedInvoice;
    memoryUpdates.push(...correctionResult.memoryUpdates);
    reasoning += correctionResult.reasoning;
    confidenceScore = Math.max(confidenceScore, correctionResult.confidenceScore);

    // STEP 3 — LEARN FROM HUMAN CORRECTIONS
    for (const hc of humanCorrections) {
        await learnCorrectionMemory(
            invoice.vendor,
            hc.field,
            hc.fromValue,
            hc.toValue,
            hc.reason
        );

        // 🔥 Learn vendor regex
        await learnVendorMemory(
            invoice.vendor,
            hc.field,
            `Leistungsdatum:\\s*(\\d{2}\\.\\d{2}\\.\\d{4})`
        );

        auditTrail.push({
            step: "learn",
            timestamp: new Date().toISOString(),
            details: `Learned vendor memory for ${hc.field}`
        });

        confidenceScore = Math.min(1.0, confidenceScore + 0.1);
    }

    // STEP 4 — STORE INVOICE
    // If you want invoiceId unique, consider generating a UUID or use invoiceNumber
    const invoiceId = invoice.fields.invoiceNumber;

    storeProcessedInvoice(
        invoiceId,
        invoice.vendor,
        invoice.fields.invoiceNumber,
        invoice.fields.invoiceDate,
        generateContentHash(updatedInvoice)
    );

    return {
        normalizedInvoice: updatedInvoice,
        proposedCorrections: correctionResult.proposedCorrections,
        requiresHumanReview: confidenceScore < 0.8,
        reasoning: reasoning || "Processed using dynamic vendor memory",
        confidenceScore,
        memoryUpdates,
        auditTrail
    };
}
