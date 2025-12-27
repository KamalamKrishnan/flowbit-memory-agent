import { ProcessedInvoice, AuditEntry } from "./types";
import {
    applyCorrectionMemory,
    loadHumanCorrections,
    learnCorrectionMemory
} from "./correctionMemory";
import { applyVendorMemory, learnVendorMemory } from "./vendorMemory";
import { getResolutionStats } from "./resolutionMemory";
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
        () => { }
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
    humanCorrections: any[] = [],
    auditTrail: AuditEntry[] = []
): Promise<ProcessedInvoice> {

    loadHumanCorrections();

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

    // ─────────────────────────────────────────
    // BASE CONFIDENCE + DECAY (PHASE 2)
    // ─────────────────────────────────────────
    let confidenceScore = 0.5;
    confidenceScore = Math.max(0.4, confidenceScore - 0.05);

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

    // STEP 3 — RESOLUTION MEMORY (PHASE 1)
    const resolutionStats = await getResolutionStats(invoice.vendor);

    if (resolutionStats.rejectionRatio > 0.4) {
        confidenceScore -= 0.3;

        auditTrail.push({
            step: "decide",
            timestamp: new Date().toISOString(),
            details: `High rejection ratio detected (${resolutionStats.rejectionRatio.toFixed(
                2
            )}) from past resolutions`
        });

        reasoning +=
            " Past human resolutions indicate frequent rejection. ";
    }

    // STEP 4 — LEARN FROM HUMAN CORRECTIONS
    for (const hc of humanCorrections) {
        await learnCorrectionMemory(
            invoice.vendor,
            hc.field,
            hc.fromValue,
            hc.toValue,
            hc.reason
        );

        await learnVendorMemory(
            invoice.vendor,
            hc.field,
            `Leistungsdatum:\\s*(\\d{2}\\.\\d{2}\\.\\d{4})`
        );

        auditTrail.push({
            step: "learn",
            timestamp: new Date().toISOString(),
            details: `Learned correction + vendor memory for ${hc.field}`
        });

        confidenceScore = Math.min(1.0, confidenceScore + 0.1);
    }

    // STEP 5 — STORE INVOICE
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
        reasoning: reasoning || "Processed using learned memory",
        confidenceScore,
        memoryUpdates,
        auditTrail
    };
}