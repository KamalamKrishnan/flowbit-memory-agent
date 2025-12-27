import { db } from "./db";

/**
 * Store how a human resolved an invoice
 */
export async function recordResolution(
    invoiceId: string,
    vendor: string,
    decision: "approved" | "rejected"
): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO resolution_memory (invoice_id, vendor, decision, timestamp)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [invoiceId, vendor, decision],
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

/**
 * Aggregate resolution behavior for a vendor
 * Used to influence future decisions
 */
export async function getResolutionStats(
    vendor: string
): Promise<{
    approved: number;
    rejected: number;
    rejectionRatio: number;
}> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT decision, COUNT(*) as count
             FROM resolution_memory
             WHERE vendor = ?
             GROUP BY decision`,
            [vendor],
            (err, rows: any[]) => {
                if (err) return reject(err);

                const approved =
                    rows.find(r => r.decision === "approved")?.count || 0;
                const rejected =
                    rows.find(r => r.decision === "rejected")?.count || 0;

                const total = approved + rejected || 1;

                resolve({
                    approved,
                    rejected,
                    rejectionRatio: rejected / total
                });
            }
        );
    });
}
