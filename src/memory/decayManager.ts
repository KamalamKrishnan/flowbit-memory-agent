import { db } from "./db";

const DECAY_RATE = 0.02; // 2% per day
const MIN_CONFIDENCE = 0.1;

export function applyMemoryDecay() {
    db.run(`
        UPDATE correction_memory
        SET confidence = MAX(
            ${MIN_CONFIDENCE},
            confidence - (${DECAY_RATE} * (
                julianday('now') - julianday(last_updated)
            ))
        )
    `);

    db.run(`
        UPDATE vendor_memory
        SET confidence = MAX(
            ${MIN_CONFIDENCE},
            confidence - (${DECAY_RATE} * (
                julianday('now') - julianday(last_updated)
            ))
        )
    `);
}
