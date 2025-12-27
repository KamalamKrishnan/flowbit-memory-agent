import { initializeDB } from "./memory/db";
import { processInvoice } from "./memory/memoryManager";
import { recordResolution } from "./memory/resolutionMemory";
import { applyMemoryDecay } from "./memory/decayManager";
import { AuditEntry } from "./memory/types";

async function main() {
    initializeDB();

    // Apply memory decay BEFORE processing (important)
    applyMemoryDecay();

    const sampleInvoice = {
        vendor: "Supplier GmbH",
        fields: {
            invoiceNumber: "INV-2024-028", // change the invoiveNumber for each run 
            invoiceDate: "12.01.2024",
            serviceDate: null,
            currency: "EUR",
            netTotal: 2500,
            taxRate: 0.19,
            taxTotal: 475,
            grossTotal: 2975,
            lineItems: [
                { sku: "WIDGET-001", qty: 100, unitPrice: 25 }
            ]
        },
        rawText: `
Rechnung Nr. INV-2024-007
Leistungsdatum: 01.01.2024
...
`
    };

    const humanCorrections = [
        // Uncomment ONLY on first learning run
        //{
        //    field: "serviceDate",
        //    fromValue: null,
        //    toValue: "01.01.2024",
        //    reason: "Verified from invoice"
        //}
    ];

    const auditTrail: AuditEntry[] = [];

    const result = await processInvoice(
        sampleInvoice,
        humanCorrections,
        auditTrail
    );

    // Invoice-level resolution
    if (humanCorrections.length > 0) {
        await recordResolution(
            sampleInvoice.fields.invoiceNumber,
            sampleInvoice.vendor,
            "approved"
        );

        auditTrail.push({
            step: "learn",
            timestamp: new Date().toISOString(),
            details: "Invoice-level resolution approved by human"
        });
    }

    console.log(
        "Processed Invoice Result:",
        JSON.stringify(
            {
                ...result,
                auditTrail
            },
            null,
            2
        )
    );
}

main().catch((err) => {
    console.error("Fatal error:", err);
});