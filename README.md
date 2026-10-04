# DevIntel — AI-Powered Production Incident Intelligence

DevIntel is a production incident monitoring platform that ingests application logs, detects error spikes, creates incidents, and helps engineers investigate incidents using relevant evidence.

The project is being developed in stages, with the long-term goal of adding AI-powered Root Cause Analysis (RCA).

## Problem

Production applications generate large volumes of logs, making it difficult for engineers to quickly identify abnormal behavior and determine the cause of an incident.

DevIntel automates the initial incident detection and investigation workflow.

## Features

### MVP

- Application registration
- Automatic log ingestion
- Error-spike detection
- Automatic incident creation
- Incident lifecycle management
- Incident status filtering
- Incident evidence inspection
- React dashboard
- PostgreSQL persistence
- Automated API testing
- Dedicated test database
- Demo application for automatic log generation
- Input validation and database constraints

### AI — Next Phase

- AI-powered Root Cause Analysis
- Structured RCA output
- Historical incident retrieval
- Retrieval-Augmented Generation (RAG)
- Root cause, evidence, confidence, and recommendations

> AI-powered RCA is planned for the next phase and is not part of the completed MVP.

## Architecture

```text
React Frontend
      |
      v
FastAPI Backend
      |
      +------------------+
      |                  |
      v                  v
Applications           Logs
      |                  |
      +--------+---------+
               |
               v
      Incident Detection
               |
               v
          PostgreSQL
               |
               v
        AI RCA (Next Phase)
```

DevIntel currently uses a **modular monolith** architecture. This keeps the system simple while allowing future AI and production components to be added without prematurely introducing microservice complexity.

## Incident Detection

DevIntel currently uses a rule-based detection mechanism.

An incident is created when:

- More than **5 ERROR logs**
- Occur within **5 minutes**
- For the same application
- No existing active incident exists for that application

Incidents follow this lifecycle:

```text
Open → Investigating → Resolved
```

## Demo Application

A small demo application automatically sends logs to DevIntel.

Normal mode:

```bash
python demo_app/main.py normal
```

Failure mode:

```bash
python demo_app/main.py failure
```

Failure mode generates repeated errors, allowing DevIntel to automatically detect an error spike and create an incident.

## AI Version

The next phase adds evidence-based AI Root Cause Analysis:

```text
Incident
   ↓
Evidence Logs
   ↓
Historical Incidents
   ↓
RAG / Retrieval
   ↓
LLM
   ↓
Root Cause + Evidence + Confidence
```

The AI system will use actual incident evidence and relevant historical incidents to reduce unsupported or hallucinated explanations.

## Tech Stack

| Area | Technology |
|---|---|
| Backend | Python, FastAPI |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| Frontend | React, JavaScript |
| Testing | Pytest |
| AI | LLM + RAG (next phase) |
| Future Infrastructure | Docker, Redis, Azure, Terraform, CI/CD |

## API

```text
GET    /health

POST   /applications
GET    /applications

POST   /logs

GET    /incidents
PATCH  /incidents/{incident_id}

GET    /incidents/{incident_id}/logs
```

## Testing

The backend includes automated API tests covering:

- Application management
- Log ingestion
- Input validation
- Incident creation
- Error-spike thresholds
- Incident deduplication
- Incident lifecycle
- Incident evidence
- Missing resources

Tests run against a dedicated PostgreSQL test database.

```bash
pytest
```

## Project Evolution

```text
v0.1
Log ingestion + error detection + incident creation
        ↓
v0.2
Incident lifecycle + filtering + timestamps
        ↓
MVP
Applications + evidence + demo app + testing
        ↓
AI Version
AI Root Cause Analysis + RAG
        ↓
Production Version
Docker + Redis + Azure + Terraform + CI/CD
```

## Current Status

**MVP completed.**

The current system can register applications, receive logs, detect error spikes, create incidents, provide incident evidence, and manage the incident lifecycle.

The next development stage is the **AI Version**, focused on AI-powered Root Cause Analysis.