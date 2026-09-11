# DevIntel

**Production Incident Intelligence Platform**

DevIntel is a full-stack developer tool that ingests application logs, detects abnormal error patterns, automatically creates incidents, and presents them through a web dashboard.

The project is designed as a foundation for an AIOps platform that can later incorporate AI-powered root cause analysis, deployment correlation, historical incident retrieval, and remediation recommendations.

## Problem

During production incidents, engineers often need to manually inspect logs and correlate signals across multiple systems before understanding what went wrong.

DevIntel aims to reduce this investigation time by providing an intelligence layer that can:

- ingest application logs
- detect abnormal error patterns
- automatically create incidents
- prevent duplicate incidents for an ongoing issue
- expose incident data through APIs
- display incidents through a dashboard

## Current Features

- Application health-check API
- Log ingestion through REST API
- PostgreSQL log persistence
- Rule-based incident detection
- 5-minute error detection window
- Incident deduplication
- Incident retrieval APIs
- React incident dashboard
- CORS-enabled frontend/backend communication
- Basic automated API tests

## Tech Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- PostgreSQL
- psycopg2

### Frontend
- React
- Vite
- JavaScript
- CSS

### Testing
- pytest
- FastAPI TestClient

### Development
- Git
- GitHub
- Python virtual environments
- Environment variables

## Architecture

```text
Application / Service
        |
        | POST /logs
        v
+-------------------+
|      FastAPI      |
+-------------------+
        |
        | Validate request
        v
+-------------------+
|     Pydantic      |
+-------------------+
        |
        v
+-------------------+
|    SQLAlchemy     |
+-------------------+
        |
        v
+-------------------+
|    PostgreSQL     |
|                   |
| logs              |
| incidents         |
+-------------------+
        ^
        |
        | Error threshold detection
        |
+------------------------+
| Incident Detection     |
| >5 ERROR logs          |
| within 5 minutes       |
+------------------------+

React Dashboard
        |
        | GET /incidents
        v
     FastAPI
        |
        v
   PostgreSQL