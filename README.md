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
- manage incidents through their lifecycle
- expose incident data through REST APIs
- display and filter incidents through a dashboard

## Current Features

- Application health-check API
- Log ingestion through REST API
- PostgreSQL log persistence
- Rule-based incident detection
- 5-minute error detection window
- Service-specific error counting
- Incident deduplication
- Incident retrieval APIs
- Incident lifecycle management
- Incident statuses: `open`, `investigating`, and `resolved`
- Incident status updates through REST API
- React incident dashboard
- Dashboard status controls
- Incident filtering by status
- Timezone-aware UTC timestamps
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
- python-dotenv

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

DevIntel currently follows a modular monolith architecture. The API, persistence layer, and incident detection logic are kept logically separated while remaining part of a single backend application.

```text
                         POST /logs
Application / Service --------------------+
                                          |
                                          v
                                 +------------------+
                                 |     FastAPI      |
                                 |    REST API      |
                                 +------------------+
                                          |
                                          | Request validation
                                          v
                                 +------------------+
                                 |     Pydantic     |
                                 +------------------+
                                          |
                                          v
                                 +------------------+
                                 |    SQLAlchemy    |
                                 +------------------+
                                          |
                           +--------------+--------------+
                           |                             |
                           v                             v
                    +-------------+             +------------------+
                    | PostgreSQL  |             | Incident         |
                    | logs        |<------------| Detection        |
                    | incidents   |             | Service          |
                    +-------------+             +------------------+
                           ^
                           |
                           | GET /incidents
                           | PATCH /incidents/{id}
                           |
                    +-------------+
                    |   FastAPI   |
                    +-------------+
                           ^
                           |
                           | HTTP
                           |
                    +-------------+
                    |   React     |
                    | Dashboard   |
                    +-------------+
```

The backend is intentionally implemented as a modular monolith rather than a collection of microservices. The current scope does not require the operational complexity of independently deployed services, while the separation of business logic allows individual components to evolve later.

## How Incident Detection Works

DevIntel currently uses rule-based incident detection.

When an `ERROR` log is received:

1. The log is validated by Pydantic.
2. The log is persisted in PostgreSQL.
3. DevIntel looks at ERROR logs from the same service during the previous five minutes.
4. The matching errors are counted.
5. DevIntel checks whether an open incident already exists for that service.
6. If the error count exceeds five and no open incident exists, a new incident is created.

Conceptually:

```text
Incoming ERROR log
        |
        v
Store log in PostgreSQL
        |
        v
Count ERROR logs for same service
during previous 5 minutes
        |
        v
     Count > 5?
       /     \
     No       Yes
     |         |
    Stop       v
         Open incident exists?
              /       \
            Yes        No
             |          |
            Stop        v
                  Create incident
```

Checking for an existing open incident prevents every subsequent error from generating another incident for the same ongoing problem.

## Incident Lifecycle

An incident can have one of three statuses:

```text
open → investigating → resolved
```

The status can be changed directly from the React dashboard.

When an incident is resolved, it no longer blocks DevIntel from creating a future incident for the same service when the detection threshold is reached again.

The dashboard can filter incidents by:

- All
- Open
- Investigating
- Resolved

## Time Handling

DevIntel stores timestamps as timezone-aware UTC values.

The backend uses UTC rather than a specific local timezone so incident timestamps remain consistent regardless of where the system or user is located.

The React frontend converts the UTC timestamp into the user's local timezone when displaying the incident detection time.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Check backend health |
| `POST` | `/logs` | Ingest an application log |
| `GET` | `/incidents` | Retrieve all incidents |
| `GET` | `/incidents/{incident_id}` | Retrieve a specific incident |
| `PATCH` | `/incidents/{incident_id}` | Update an incident's status |

FastAPI also provides interactive API documentation through `/docs`.

### Example: Ingest a Log

Request:

```json
{
  "level": "ERROR",
  "message": "Payment database connection timeout",
  "service": "payments"
}
```

### Example: Update Incident Status

Request:

```json
{
  "status": "investigating"
}
```

Valid incident statuses are:

```text
open
investigating
resolved
```

Invalid status values are rejected by the API.

## Running Locally

### Prerequisites

Make sure the following are installed:

- Python
- PostgreSQL
- Node.js
- npm
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd devintel
```

### 2. Create a Python Virtual Environment

```bash
python -m venv venv
```

Activate it.

On Git Bash:

```bash
source venv/Scripts/activate
```

### 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create the PostgreSQL Database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE devintel;
```

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/devintel
```

The `.env` file is excluded from Git and should not be committed.

### 6. Start the Backend

From the project root:

```bash
uvicorn backend.main:app --reload
```

The backend runs locally on port `8000`.

You can access the interactive FastAPI documentation at:

```text
http://127.0.0.1:8000/docs
```

### 7. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will start the React development server.

### 8. Run Automated Tests

From the project root with the virtual environment activated:

```bash
python -m pytest
```

## Project Structure

```text
devintel/
├── backend/
│   ├── services/
│   │   └── incident_detection.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── schemas.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
│
├── tests/
│   └── test_api.py
│
├── .gitignore
├── README.md
└── requirements.txt
```

## Testing

The project currently includes automated API tests using pytest and FastAPI's TestClient.

The tests verify core API behavior including:

- backend health endpoint
- incident retrieval
- missing incident handling
- incident update error handling

In addition to automated tests, the complete incident lifecycle has been tested end-to-end through the API and React dashboard.

## Current Limitations

DevIntel v0.2 intentionally keeps several parts of the system simple while the core architecture is being developed.

Current limitations include:

- rule-based detection rather than intelligent anomaly detection
- detection runs synchronously during log ingestion
- no authentication or multi-user support
- no application/service management
- no background job processing
- no external monitoring integrations
- no GitHub or deployment correlation
- no AI-powered root cause analysis
- no production deployment yet

The current error-window implementation can also count errors that occurred before a recently resolved incident if those logs are still within the five-minute detection window. More advanced incident-window handling can address this in a future version.

## Future Direction

DevIntel is being developed incrementally, with each stage remaining independently functional.

Future development may include:

- more robust incident detection
- application and service management
- authentication
- incident timelines
- GitHub commit and deployment correlation
- cloud monitoring integrations
- AI-assisted root cause analysis
- evidence and confidence scoring
- remediation recommendations
- historical incident retrieval
- Retrieval-Augmented Generation (RAG)
- Redis and background workers
- Docker containerization
- CI/CD
- cloud deployment
- infrastructure as code

## Status

**DevIntel v0.2 — Working Prototype**

The current version supports an end-to-end workflow:

```text
Application Logs
      ↓
Log Ingestion
      ↓
PostgreSQL Persistence
      ↓
Error-Window Detection
      ↓
Incident Creation
      ↓
Incident Lifecycle Management
      ↓
React Dashboard
```

DevIntel will continue evolving toward an AI-assisted production incident intelligence platform.