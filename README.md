# Flowbit AI Agent - Learned Memory Layer

## Overview
This project implements a memory-driven AI agent system for document automation, focused on learning from past human corrections and vendor-specific patterns to improve invoice processing accuracy over time.

The system:
- Applies vendor-specific memory for pattern recognition.
- Learns correction memory from repeated human corrections.
- Decides when to auto-correct or escalate for human review.
- Maintains an audit trail for transparency and explainability.

## Features
- Memory persistence with SQLite database.
- Correction memory and vendor memory layers.
- Duplicate invoice detection.
- Confidence scoring and reasoning for decisions.
- Demo script for showcasing learning over multiple invoices.

## Tech Stack
- TypeScript (strict mode)
- Node.js runtime
- SQLite for persistence

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd <repo-name>
