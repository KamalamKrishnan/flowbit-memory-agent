import { db } from "./db";
import fs from "fs";
import path from "path";
import { AuditEntry } from "./types";

const humanCorrectionsPath = path.join(__dirname, "../../data/human_corrections.json");

interface HumanCorrection {
    // Removed invoiceId from interface usage for applying corrections
    vendor: string;
    corrections: {
        field: string;
        from: any;
        to: any;
        reason: string;
    }[];
    finalDecision?: string;
}

let humanCorrections: HumanCorrection[] = [];

export function loadHumanCorrections() {
    if (fs.existsSync(humanCorrectionsPath)) {
        const raw = fs.readFileSync(humanCorrectionsPath, "utf-8");
        humanCorrections = JSON.parse(raw);
    } else {
        console.warn("[loadHumanCorrections] No human corrections file found");
        humanCorrections = [];
    }
}

interface CorrectionRow {
    to_value: string;
    reason: string;
}

export async function recallCorrectionMemory(vendor: string, field: string, fromValue: any): Promise<{ toValue: any, reason: string } | null> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT to_value, reason FROM correction_memory WHERE vendor = ? AND field = ? AND from_value = ? ORDER BY confidence DESC LIMIT 1`,
            [vendor, field, fromValue?.toString() || null],
            (err, row: CorrectionRow | undefined) => {
                if (err) return reject(err);
                if (row) {
                    resolve({ toValue: row.to_value, reason: row.reason });
                } else {
                    resolve(null);
                }
            }
        );
    });
}

export async function applyCorrectionMemory(
    invoice: any,
    vendor: string,
    auditTrail: AuditEntry[]
): Promise<{ updatedInvoice: any; proposedCorrections: string[]; confidenceScore: number; memoryUpdates: string[]; reasoning: string }> {
    let proposedCorrections: string[] = [];
    let confidenceScore = 0.5;
    let memoryUpdates: string[] = [];
    let reasoning = "";

    // DEEP CLONE invoice once here
    let updatedInvoice = JSON.parse(JSON.stringify(invoice));

    // Try to apply corrections from human corrections loaded at start
    for (const humanCorrection of humanCorrections) {
        if (humanCorrection.vendor !== vendor) continue;
        for (const correction of humanCorrection.corrections) {
            const fieldParts = correction.field.split(".");
            let currentValue = updatedInvoice;

            // Support nested fields e.g. lineItems[0].sku
            try {
                for (const part of fieldParts) {
                    if (part.endsWith("]")) {
                        // array index
                        const [arrField, idxStr] = part.split("[");
                        const idx = parseInt(idxStr.replace("]", ""), 10);
                        currentValue = currentValue[arrField][idx];
                    } else {
                        currentValue = currentValue[part];
                    }
                }
            } catch {
                currentValue = undefined;
            }

            if (currentValue === correction.from) {
                // Set corrected value
                let obj = updatedInvoice;
                for (let i = 0; i < fieldParts.length - 1; i++) {
                    const part = fieldParts[i];
                    if (part.endsWith("]")) {
                        const [arrField, idxStr] = part.split("[");
                        const idx = parseInt(idxStr.replace("]", ""), 10);
                        obj = obj[arrField][idx];
                    } else {
                        obj = obj[part];
                    }
                }
                const lastPart = fieldParts[fieldParts.length - 1];
                if (lastPart.endsWith("]")) {
                    const [arrField, idxStr] = lastPart.split("[");
                    const idx = parseInt(idxStr.replace("]", ""), 10);
                    obj[arrField][idx] = correction.to;
                } else {
                    obj[lastPart] = correction.to;
                }

                proposedCorrections.push(`${correction.field} corrected to ${correction.to}`);
                confidenceScore = Math.max(confidenceScore, 0.85);
                reasoning += `Applied correction on ${correction.field}: ${correction.reason}. `;
                memoryUpdates.push(`Applied correction: ${correction.field} from ${correction.from} to ${correction.to}`);
            }
        }
    }

    auditTrail.push({
        step: "apply",
        timestamp: new Date().toISOString(),
        details: reasoning || "No corrections applied",
    });

    return { updatedInvoice, proposedCorrections, confidenceScore, memoryUpdates, reasoning };
}

export async function learnCorrectionMemory(
    vendor: string,
    field: string,
    fromValue: any,
    toValue: any,
    reason: string
) {
    return new Promise<void>((resolve, reject) => {
        db.run(
            `INSERT INTO correction_memory (vendor, field, from_value, to_value, reason, confidence, last_updated) VALUES (?, ?, ?, ?, ?, 1.0, CURRENT_TIMESTAMP)`,
            [vendor, field, fromValue?.toString() || null, toValue?.toString() || null, reason],
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}
