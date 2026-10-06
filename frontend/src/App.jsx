import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function Icon({ type, size = 18 }) {
  const paths = {
    cube: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.6 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 3-4 3 2 4-6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5L12 3Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[type]}
    </svg>
  );
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function App() {
  const [applications, setApplications] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [applicationName, setApplicationName] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [rcaResults, setRcaResults] = useState({});

  const [rcaLoadingId, setRcaLoadingId] = useState(null);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [applicationsResponse, incidentsResponse] =
        await Promise.all([
          fetch(`${API}/applications`),
          fetch(`${API}/incidents`),
        ]);

      if (!applicationsResponse.ok || !incidentsResponse.ok) {
        throw new Error("Failed to load dashboard");
      }

      const applicationsData = await applicationsResponse.json();
      const incidentsData = await incidentsResponse.json();

      setApplications(applicationsData);
      setIncidents(incidentsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function registerApplication(event) {
    event.preventDefault();

    const name = applicationName.trim();

    if (!name) return;

    try {
      setActionLoading(true);

      const response = await fetch(`${API}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || "Failed to register application");
      }

      setApplicationName("");
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function updateIncidentStatus(incidentId, status) {
    try {
      const response = await fetch(
        `${API}/incidents/${incidentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update incident");
      }

      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  async function viewIncidentDetails(incident) {
    try {
      const [logsResponse, rcaResponse] = await Promise.all([
        fetch(`${API}/incidents/${incident.id}/logs`),
        fetch(`${API}/incidents/${incident.id}/rca`),
      ]);

      const logs = logsResponse.ok ? await logsResponse.json() : [];

      let rca = null;

      if (rcaResponse.ok) {
        rca = await rcaResponse.json();
      }

      setIncidentLogs(logs);
      setSelectedIncident({
        ...incident,
        rca,
      });
    } catch (error) {
      alert("Unable to load incident details");
    }
  }

  async function analyzeIncident(incidentId) {
    try {
      setRcaLoadingId(incidentId);

      const response = await fetch(
        `${API}/incidents/${incidentId}/analyze`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("AI analysis failed");
      }

      const result = await response.json();

      setRcaResults((previous) => ({
        ...previous,
        [incidentId]: result,
      }));

      await loadDashboard();
    } catch (error) {
      alert(error.message);
    } finally {
      setRcaLoadingId(null);
    }
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const application = applications.find(
        (app) => app.id === incident.application_id
      );

      const applicationName =
        application?.name || `Application ${incident.application_id}`;

      const matchesFilter =
        filter === "all" ||
        incident.status?.toLowerCase() === filter;

      const searchValue = search.toLowerCase();

      const matchesSearch =
        !searchValue ||
        applicationName.toLowerCase().includes(searchValue) ||
        String(incident.application_id).includes(searchValue);

      return matchesFilter && matchesSearch;
    });
  }, [incidents, applications, filter, search]);

  const getApplicationName = (applicationId) => {
    const application = applications.find(
      (app) => app.id === applicationId
    );

    return application?.name || `Application ${applicationId}`;
  };

  const totalIncidents = incidents.length;

  const openIncidents = incidents.filter(
    (incident) => incident.status === "open"
  ).length;

  const investigatingIncidents = incidents.filter(
    (incident) => incident.status === "investigating"
  ).length;

  const resolvedIncidents = incidents.filter(
    (incident) => incident.status === "resolved"
  ).length;

  return (
    <div className="app-shell">
      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <span />
          </div>

          <div>
            <div className="brand-name">
              Dev<span>Intel</span>
            </div>

            <div className="brand-subtitle">
              Production Incident Intelligence Platform
            </div>
          </div>
        </div>

        <nav className="nav-links">
          <button className="nav-link active">
            <Icon type="alert" size={16} />
            Incidents
          </button>

          <button className="nav-link">
            <Icon type="cube" size={16} />
            Applications
          </button>

          <button className="nav-link">
            <Icon type="chart" size={16} />
            Analytics
          </button>
        </nav>
      </header>

      <main className="dashboard">
        {/* HERO */}
        <section className="hero">
          <div className="hero-content">
            <h1>
              Monitor. Investigate.
              <br />
              Find Root Causes. <span>Faster.</span>
            </h1>

            <p>
              DevIntel automatically detects incidents from application logs,
              collects evidence, and uses AI to provide root cause analysis
              and recommendations.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() =>
                  document
                    .getElementById("applications")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Icon type="plus" size={17} />
                Register Application
              </button>

              <button
                className="secondary-button"
                onClick={() =>
                  document
                    .getElementById("incidents")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Icon type="chart" size={17} />
                View Analytics
              </button>
            </div>
          </div>

          <div className="hero-flow">
            <div className="flow-card">
              <div className="flow-step">
                <div className="flow-icon blue">
                  <Icon type="calendar" />
                </div>
                <span>Logs</span>
              </div>

              <div className="flow-arrow">→</div>

              <div className="flow-step">
                <div className="flow-icon red">
                  <Icon type="alert" />
                </div>
                <span>Incident</span>
              </div>

              <div className="flow-arrow">→</div>

              <div className="flow-step">
                <div className="flow-icon purple">
                  <Icon type="search" />
                </div>
                <span>AI Analysis</span>
              </div>

              <div className="flow-arrow">→</div>

              <div className="flow-step">
                <div className="flow-icon green">
                  <Icon type="check" />
                </div>
                <span>Resolution</span>
              </div>
            </div>

            <div className="hero-waves" />
          </div>
        </section>

        {/* APPLICATIONS */}
        <section className="panel" id="applications">
          <div className="panel-header">
            <div className="section-title">
              <div className="section-icon blue">
                <Icon type="cube" />
              </div>

              <div>
                <h2>Applications</h2>
                <p>Manage and monitor your registered applications</p>
              </div>
            </div>

            <form
              className="register-form"
              onSubmit={registerApplication}
            >
              <input
                value={applicationName}
                onChange={(event) =>
                  setApplicationName(event.target.value)
                }
                placeholder="Application name"
              />

              <button
                className="primary-button small"
                disabled={actionLoading}
              >
                <Icon type="plus" size={15} />
                Register Application
              </button>
            </form>
          </div>

          <div className="application-grid">
            {applications.map((application, index) => (
              <div
                className="application-card"
                key={application.id}
              >
                <div
                  className={`application-icon color-${index % 5}`}
                >
                  <Icon type="cube" size={17} />
                </div>

                <div className="application-info">
                  <strong>{application.name}</strong>
                  <span>
                    Application #{application.id}
                  </span>
                </div>

                <Icon type="arrow" size={17} />
              </div>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="stats-grid">
          <StatCard
            icon="alert"
            label="Total Incidents"
            value={totalIncidents}
            type="red"
          />

          <StatCard
            icon="calendar"
            label="Open"
            value={openIncidents}
            type="yellow"
          />

          <StatCard
            icon="search"
            label="Investigating"
            value={investigatingIncidents}
            type="blue"
          />

          <StatCard
            icon="check"
            label="Resolved"
            value={resolvedIncidents}
            type="green"
          />
        </section>

        {/* INCIDENTS */}
        <section className="panel incidents-panel" id="incidents">
          <div className="incident-header">
            <div className="section-title">
              <div className="section-icon purple">
                <Icon type="alert" />
              </div>

              <div>
                <h2>Incidents</h2>
                <p>View and manage detected incidents</p>
              </div>
            </div>

            <div className="search-box">
              <Icon type="search" size={17} />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by application name or ID..."
              />
            </div>
          </div>

          <div className="incident-toolbar">
            <div className="filters">
              <FilterButton
                label="All"
                count={totalIncidents}
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />

              <FilterButton
                label="Open"
                count={openIncidents}
                active={filter === "open"}
                onClick={() => setFilter("open")}
              />

              <FilterButton
                label="Investigating"
                count={investigatingIncidents}
                active={filter === "investigating"}
                onClick={() => setFilter("investigating")}
              />

              <FilterButton
                label="Resolved"
                count={resolvedIncidents}
                active={filter === "resolved"}
                onClick={() => setFilter("resolved")}
              />
            </div>

            <div className="sort-control">
              Sort by:
              <select defaultValue="newest">
                <option value="newest">Detected (Newest)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading incidents...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="empty-state">
              No incidents found.
            </div>
          ) : (
            <div className="incident-list">
              {filteredIncidents.map((incident) => {
                const status =
                  incident.status?.toLowerCase();

                const rca = rcaResults[incident.id];

                return (
                  <div
                    className={`incident-row ${status}`}
                    key={incident.id}
                  >
                    <div className="incident-application">
                      <div
                        className={`application-icon color-${
                          incident.id % 5
                        }`}
                      >
                        <Icon type="cube" size={17} />
                      </div>

                      <div>
                        <strong>
                          {getApplicationName(
                            incident.application_id
                          )}
                        </strong>

                        <span>
                          Application ID:{" "}
                          {incident.application_id}
                        </span>
                      </div>
                    </div>

                    <div className="incident-info">
                      <strong>
                        Error count: {incident.error_count}
                      </strong>

                      <span>
                        <Icon type="calendar" size={13} />
                        Detected:{" "}
                        {formatDate(incident.created_at)}
                      </span>
                    </div>

                    <div className="incident-status">
                      <span className={`status-badge ${status}`}>
                        {status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="incident-actions">
                      <button
                        className="outline-button"
                        onClick={() =>
                          viewIncidentDetails(incident)
                        }
                      >
                        <Icon type="eye" size={15} />
                        View Details
                      </button>

                      <button
                        className="primary-button analyze-button"
                        onClick={() =>
                          analyzeIncident(incident.id)
                        }
                        disabled={
                          rcaLoadingId === incident.id
                        }
                      >
                        <Icon type="spark" size={15} />

                        {rcaLoadingId === incident.id
                          ? "Analyzing..."
                          : "Analyze with AI"}
                      </button>
                    </div>

                    {rca && (
                      <div className="inline-rca">
                        <strong>Root Cause:</strong>{" "}
                        {rca.root_cause}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* INCIDENT MODAL */}
      {selectedIncident && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Incident Details</h2>
                <p>
                  Incident #{selectedIncident.id} ·{" "}
                  {getApplicationName(
                    selectedIncident.application_id
                  )}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedIncident(null)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-section">
              <h3>Evidence Logs</h3>

              {incidentLogs.length === 0 ? (
                <p className="muted">
                  No evidence logs found.
                </p>
              ) : (
                <div className="logs">
                  {incidentLogs.map((log) => (
                    <div className="log-entry" key={log.id}>
                      <span className="log-level">
                        {log.level}
                      </span>

                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedIncident.rca && (
              <div className="modal-section rca-section">
                <h3>AI Root Cause Analysis</h3>

                <div className="rca-grid">
                  <div>
                    <label>Root Cause</label>
                    <p>
                      {selectedIncident.rca.root_cause}
                    </p>
                  </div>

                  <div>
                    <label>Confidence</label>
                    <p>
                      {Math.round(
                        selectedIncident.rca.confidence * 100
                      )}
                      %
                    </p>
                  </div>

                  <div>
                    <label>Recommendation</label>
                    <p>
                      {
                        selectedIncident.rca
                          .recommendation
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                className="status-button"
                onClick={() =>
                  updateIncidentStatus(
                    selectedIncident.id,
                    "open"
                  )
                }
              >
                Open
              </button>

              <button
                className="status-button"
                onClick={() =>
                  updateIncidentStatus(
                    selectedIncident.id,
                    "investigating"
                  )
                }
              >
                Investigating
              </button>

              <button
                className="status-button"
                onClick={() =>
                  updateIncidentStatus(
                    selectedIncident.id,
                    "resolved"
                  )
                }
              >
                Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  type,
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>
        <Icon type={icon} size={19} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className={`mini-chart ${type}`}>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}) {
  return (
    <button
      className={`filter-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {label}

      <span className="filter-count">
        {count}
      </span>
    </button>
  );
}

export default App;