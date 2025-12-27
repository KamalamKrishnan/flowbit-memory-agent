// src/memory/types.ts

export interface AuditEntry {
    step: "recall" | "apply" | "decide" | "learn";
    timestamp: string; // ISO string
    details: string;
}

export interface ProcessedInvoice {
    normalizedInvoice: any;  // You can define a more detailed type if you want
    proposedCorrections: string[];
    requiresHumanReview: boolean;
    reasoning: string;
    confidenceScore: number;
    memoryUpdates: string[];
    auditTrail: AuditEntry[];
}
