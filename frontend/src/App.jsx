import { useEffect, useState } from "react";
import "./App.css";


function App() {
  const [incidents, setIncidents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [newApplicationName, setNewApplicationName] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [evidenceLogs, setEvidenceLogs] = useState([]);

  const [rcaResults, setRcaResults] = useState({});
  const [rcaLoadingId, setRcaLoadingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/incidents"),
      fetch("http://127.0.0.1:8000/applications"),
    ])
      .then(async ([incidentsResponse, applicationsResponse]) => {
        if (!incidentsResponse.ok) {
          throw new Error("Failed to fetch incidents");
        }

        if (!applicationsResponse.ok) {
          throw new Error("Failed to fetch applications");
        }

        const incidentsData = await incidentsResponse.json();
        const applicationsData = await applicationsResponse.json();

        setIncidents(incidentsData);
        setApplications(applicationsData);
      })
      .catch((error) => {
        setError(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);


  function getApplicationName(applicationId) {
    const application = applications.find(
      (application) => application.id === applicationId
    );

    return application
      ? application.name
      : `Application #${applicationId}`;
  }


  function createApplication(event) {
    event.preventDefault();

    setError(null);

    fetch("http://127.0.0.1:8000/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newApplicationName,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();

          let message = "Failed to create application";

          if (typeof errorData.detail === "string") {
            message = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            message =
              errorData.detail[0]?.msg || message;
          }

          throw new Error(message);
        }

        return response.json();
      })
      .then((application) => {
        setApplications((currentApplications) => [
          application,
          ...currentApplications,
        ]);

        setNewApplicationName("");
      })
      .catch((error) => {
        setError(error.message);
      });
  }


  function updateIncidentStatus(incidentId, status) {
    setError(null);

    fetch(
      `http://127.0.0.1:8000/incidents/${incidentId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to update incident"
          );
        }

        return response.json();
      })
      .then((updatedIncident) => {
        setIncidents((currentIncidents) =>
          currentIncidents.map((incident) =>
            incident.id === updatedIncident.id
              ? updatedIncident
              : incident
          )
        );
      })
      .catch((error) => {
        setError(error.message);
      });
  }


  async function viewIncidentDetails(incidentId) {
    setError(null);

    try {
      const [logsResponse, rcaResponse] =
        await Promise.all([
          fetch(
            `http://127.0.0.1:8000/incidents/${incidentId}/logs`
          ),
          fetch(
            `http://127.0.0.1:8000/incidents/${incidentId}/rca`
          ),
        ]);

      if (!logsResponse.ok) {
        throw new Error(
          "Failed to load incident evidence"
        );
      }

      const logs = await logsResponse.json();

      setSelectedIncidentId(incidentId);
      setEvidenceLogs(logs);

      if (rcaResponse.ok) {
        const rca = await rcaResponse.json();

        setRcaResults((currentResults) => ({
          ...currentResults,
          [incidentId]: rca,
        }));
      } else if (rcaResponse.status === 404) {
        setRcaResults((currentResults) => ({
          ...currentResults,
          [incidentId]: null,
        }));
      } else {
        throw new Error(
          "Failed to load AI analysis"
        );
      }
    } catch (error) {
      setError(error.message);
    }
  }


  async function analyzeIncident(incidentId) {
    setError(null);
    setRcaLoadingId(incidentId);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/incidents/${incidentId}/analyze`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to analyze incident"
        );
      }

      setRcaResults((currentResults) => ({
        ...currentResults,
        [incidentId]: data,
      }));

      setSelectedIncidentId(incidentId);
    } catch (error) {
      setError(error.message);
    } finally {
      setRcaLoadingId(null);
    }
  }


  const filteredIncidents =
    statusFilter === "all"
      ? incidents
      : incidents.filter(
          (incident) =>
            incident.status === statusFilter
        );


  if (loading) {
    return (
      <main>
        <h1>DevIntel</h1>
        <p>Loading DevIntel...</p>
      </main>
    );
  }


  return (
    <main>
      <h1>DevIntel</h1>
      <p>
        Production Incident Intelligence Platform
      </p>

      {error && (
        <p className="error-message">
          Error: {error}
        </p>
      )}

      <section className="applications-section">
        <h2>Applications</h2>

        <form onSubmit={createApplication}>
          <input
            type="text"
            placeholder="Application name"
            value={newApplicationName}
            onChange={(event) =>
              setNewApplicationName(
                event.target.value
              )
            }
          />

          <button type="submit">
            Register Application
          </button>
        </form>

        <div className="applications-list">
          {applications.length === 0 ? (
            <p>
              No applications registered yet.
            </p>
          ) : (
            applications.map((application) => (
              <div key={application.id}>
                {application.name}
              </div>
            ))
          )}
        </div>
      </section>


      <section>
        <h2>Incidents</h2>

        <div className="filters">
          <button
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>

          <button
            onClick={() => setStatusFilter("open")}
          >
            Open
          </button>

          <button
            onClick={() =>
              setStatusFilter("investigating")
            }
          >
            Investigating
          </button>

          <button
            onClick={() =>
              setStatusFilter("resolved")
            }
          >
            Resolved
          </button>
        </div>


        {filteredIncidents.length === 0 ? (
          <p>No incidents found.</p>
        ) : (
          filteredIncidents.map((incident) => {
            const rca = rcaResults[incident.id];

            return (
              <div
                key={incident.id}
                className="incident-card"
              >
                <div className="incident-header">
                  <h2>
                    {getApplicationName(
                      incident.application_id
                    )}
                  </h2>

                  <p>
                    Application ID:{" "}
                    {incident.application_id}
                  </p>

                  <span className="status">
                    {incident.status}
                  </span>
                </div>

                <p>
                  Error count:{" "}
                  {incident.error_count}
                </p>

                <p>
                  Detected:{" "}
                  {new Date(
                    incident.created_at
                  ).toLocaleString()}
                </p>


                <div className="status-actions">
                  <button
                    onClick={() =>
                      updateIncidentStatus(
                        incident.id,
                        "open"
                      )
                    }
                  >
                    Open
                  </button>

                  <button
                    onClick={() =>
                      updateIncidentStatus(
                        incident.id,
                        "investigating"
                      )
                    }
                  >
                    Investigating
                  </button>

                  <button
                    onClick={() =>
                      updateIncidentStatus(
                        incident.id,
                        "resolved"
                      )
                    }
                  >
                    Resolved
                  </button>

                  <button
                    onClick={() =>
                      viewIncidentDetails(
                        incident.id
                      )
                    }
                  >
                    View Details
                  </button>

                  <button
                    onClick={() =>
                      analyzeIncident(
                        incident.id
                      )
                    }
                    disabled={
                      rcaLoadingId === incident.id
                    }
                  >
                    {rcaLoadingId === incident.id
                      ? "Analyzing..."
                      : "Analyze with AI"}
                  </button>
                </div>


                {selectedIncidentId === incident.id && (
                  <div className="incident-details">
                    <h3>Evidence Logs</h3>

                    {evidenceLogs.length === 0 ? (
                      <p>
                        No evidence logs found.
                      </p>
                    ) : (
                      evidenceLogs.map((log) => (
                        <div
                          key={log.id}
                          className="evidence-log"
                        >
                          <strong>
                            {log.level}
                          </strong>

                          {" — "}

                          {log.message}

                          <br />

                          <small>
                            {new Date(
                              log.created_at
                            ).toLocaleString()}
                          </small>
                        </div>
                      ))
                    )}

                    {rca && (
                      <div className="ai-rca">
                        <h3>
                          AI Root Cause Analysis
                        </h3>

                        <p>
                          <strong>
                            Root Cause:
                          </strong>{" "}
                          {rca.root_cause}
                        </p>

                        <p>
                          <strong>
                            Confidence:
                          </strong>{" "}
                          {Math.round(
                            rca.confidence * 100
                          )}
                          %
                        </p>

                        <p>
                          <strong>
                            Recommendation:
                          </strong>{" "}
                          {rca.recommendation}
                        </p>

                        <p>
                          <strong>
                            Supporting Evidence:
                          </strong>
                        </p>

                        <ul>
                          {rca.evidence.map(
                            (item, index) => (
                              <li key={index}>
                                {item}
                              </li>
                            )
                          )}
                        </ul>

                        <p>
                          <strong>
                            Historical Matches:
                          </strong>{" "}
                          {
                            rca.historical_matches
                              .length
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}


export default App;