import { initializeDB } from "./memory/db";
import { processInvoice } from "./memory/memoryManager";

async function main() {
    // Initialize DB & schema (safe to call every run)
    initializeDB();

    const sampleInvoice = {
        vendor: "Supplier GmbH",
        fields: {
            invoiceNumber: "INV-2024-021", // ⚠️ change this for every new invoice
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

    /**
     * 🔴 IMPORTANT WORKFLOW
     *
     * FIRST RUN (TEACH THE SYSTEM):
     * --------------------------------
     * const humanCorrections = [
     *   {
     *     field: "serviceDate",
     *     fromValue: null,
     *     toValue: "01.01.2024",
     *     reason: "Verified from invoice"
     *   }
     * ];
     *
     * SECOND RUN ONWARDS (AUTOMATIC):
     * --------------------------------
     * const humanCorrections = [];
     */

    const humanCorrections = []; // ✅ keep empty after learning once

    const result = await processInvoice(sampleInvoice, humanCorrections);

    console.log(
        "Processed Invoice Result:",
        JSON.stringify(result, null, 2)
    );
}

main().catch((err) => {
    console.error("Fatal error:", err);
});
