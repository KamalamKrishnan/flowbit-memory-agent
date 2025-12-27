# 🧠 Memory-Driven Invoice Intelligence Agent  
**AI Agent Development Internship Assignment – Flowbit Private Limited**

---

## 📌 Overview

This project implements a **memory-driven learning layer** for invoice processing systems.  
The goal is **not extraction accuracy**, but **learning from past human corrections and vendor patterns** so that the system becomes smarter over time instead of treating every invoice as new.

The system demonstrates how an AI agent can:

- Recall past corrections  
- Apply learned vendor-specific patterns  
- Decide whether to auto-correct or escalate  
- Learn from human approvals  
- Maintain explainability through audit trails  
- Reinforce or decay confidence over time  

All memory **persists across runs using SQLite**, fulfilling the core requirement of **learned memory**.

---

## 🏗️ Architecture Overview

```text
src/
 ├── index.ts                 # Demo runner
 ├── memory/
 │   ├── db.ts                # SQLite initialization
 │   ├── vendorMemory.ts      # Vendor-specific patterns
 │   ├── correctionMemory.ts  # Repeated correction learning
 │   ├── resolutionMemory.ts  # Human approval/rejection tracking
 │   ├── decayManager.ts      # Confidence decay logic
 │   ├── memoryManager.ts     # Recall → Apply → Decide → Learn
 │   └── types.ts             # Shared types & interfaces
 └── memory.db                # Persistent SQLite database

🧠 Memory Types Implemented (Required)

1️⃣ Vendor Memory

Stores vendor-specific patterns such as:

Label mappings (e.g., “Leistungsdatum” → serviceDate)

Regex-based extraction hints

Confidence increases when repeatedly validated

📸 Screenshot – vendor_memory

Shows learned regex patterns tied to Supplier GmbH with confidence and timestamps.

2️⃣ Correction Memory

Learns from repeated human corrections:

Field-level changes (e.g., missing serviceDate)

Reinforced when approved

Decays over time if unused

📸 Screenshot – correction_memory

Displays multiple human-verified corrections with evolving confidence.

3️⃣ Resolution Memory

Tracks how discrepancies were resolved:

Approved vs rejected corrections

Prevents bad memory reinforcement

Enables auditability

📸 Screenshot – resolution_memory

Logs invoice-level decisions made by humans over time.

🔁 Agent Workflow (Core Logic)

Every invoice follows this pipeline:

🔹 1. Recall
Fetch vendor memory

Fetch correction memory

Fetch resolution history

🔹 2. Apply
Normalize invoice fields

Propose corrections using high-confidence memory

Avoid low-confidence auto-application

🔹 3. Decide
Auto-accept if confidence is high

Escalate if uncertainty exists

Provide clear reasoning

🔹 4. Learn
Store new corrections

Reinforce or weaken confidence

Update audit trail

📊 Confidence Management

Confidence increases with repeated approvals

Confidence decays automatically over time

Minimum confidence threshold prevents bad learning domination

confidence = max(
  MIN_CONFIDENCE,
  confidence - (DECAY_RATE × days_since_last_used)
)

📦 Output Contract (Required)

Each invoice produces the following JSON structure:

{
  "normalizedInvoice": {},
  "proposedCorrections": [],
  "requiresHumanReview": false,
  "reasoning": "Why memory was applied",
  "confidenceScore": 0.85,
  "memoryUpdates": [],
  "auditTrail": [
    {
      "step": "recall | apply | decide | learn",
      "timestamp": "...",
      "details": "..."
    }
  ]
}
✅ Fully compliant with the assignment specification.

▶️ Demo Instructions

Step 1 – Install Dependencies
bash
Copy code
npm install

Step 2 – Run Demo
bash
Copy code
npx ts-node src/index.ts

Step 3 – Observe Learning
First run: System applies corrections and learns

Second run: Same vendor invoices auto-correct with higher confidence

Audit trail shows reduced human involvement

🧪 Demonstrated Learning (Required)

Invoice #1  -	Requires learning + human correction
Invoice #2  -	Auto-applies learned corrections
Confidence  -  Slight decay between runs
Audit Trail -	Fully explainable

🗄️ Database Proof

The following tables visually prove learning persistence:

vendor_memory

correction_memory

resolution_memory

📸 Screenshots included showing live data after multiple runs

🎥 Demo Video

The demo video shows:

First invoice run (learning phase)

SQLite memory tables populated

Second invoice run (memory applied)

Audit trail & confidence evolution

📎 Video link attached in submission email

🚀 Conclusion

This project demonstrates a true AI agent mindset:

Memory-first reasoning

Human-in-the-loop learning

Confidence-aware automation

Explainable decisions

Persistent intelligence

It directly addresses real-world document automation challenges faced at scale.

👤 Author
Kamalam Krishnan
AI Agent Development Internship Candidate
Flowbit Private Limited
