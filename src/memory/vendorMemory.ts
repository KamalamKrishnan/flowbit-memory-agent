import { getVendorMemories, addOrUpdateVendorMemory } from "./db";
import { AuditEntry } from "./types";

export async function applyVendorMemory(
    invoiceFields: any,
    rawText: string,
    vendor: string,
    auditTrail: AuditEntry[]
) {
    const memories = await getVendorMemories(vendor);

    let updates: string[] = [];
    let reasoning = "";
    let confidenceScore = 0.5;

    for (const mem of memories) {
        const field = mem.pattern_value;   // ← FIELD NAME
        const regex = new RegExp(`${mem.pattern_key}:\\s*(.+)`);

        if (!invoiceFields[field]) {
            const match = rawText.match(regex);
            if (match) {
                invoiceFields[field] = match[1].trim();

                updates.push(`Filled ${field} from vendor memory`);

                auditTrail.push({
                    step: "apply",
                    timestamp: new Date().toISOString(),
                    details: `Vendor memory applied for ${field}`
                });

                reasoning += `Applied vendor memory for ${field}. `;
                confidenceScore = Math.max(confidenceScore, mem.confidence);
            }
        }
    }

    return {
        updatedInvoice: invoiceFields,
        memoryUpdates: updates,
        reasoning,
        confidenceScore
    };
}

// Learn only via db helper (NO ON CONFLICT HERE)
export async function learnVendorMemory(
    vendor: string,
    field: string,
    patternKey: string
) {
    await addOrUpdateVendorMemory(
        vendor,
        patternKey,
        field,
        1.0
    );
}
