import { useEffect, useState } from "react";
import "./App.css";

function App() {
    function updateIncidentStatus(incidentId, status) {
    fetch(`http://127.0.0.1:8000/incidents/${incidentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update incident");
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


  function viewIncidentDetails(incidentId) {
  fetch(`http://127.0.0.1:8000/incidents/${incidentId}/logs`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load incident evidence");
      }

      return response.json();
    })
    .then((logs) => {
      setSelectedIncidentId(incidentId);
      setEvidenceLogs(logs);
    })
    .catch((error) => {
      setError(error.message);
    });
  }

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [evidenceLogs, setEvidenceLogs] = useState([]);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/incidents")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch incidents");
        }

        return response.json();
      })
      .then((data) => {
        setIncidents(data);
      })
      .catch((error) => {
        setError(error.message);
      })
      .finally(() => {
        setLoading(false);
      });

      fetch("http://127.0.0.1:8000/applications")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch applications");
        }

        return response.json();
      })
      .then((data) => {
        setApplications(data);
      })
      .catch((error) => {
        setError(error.message);
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

  if (loading) {
    return <p>Loading incidents...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }
  
  const filteredIncidents =
  statusFilter === "all"
    ? incidents
    : incidents.filter(
        (incident) => incident.status === statusFilter
      );

  return (
    <main>
      <h1>DevIntel</h1>
      <p>Production Incident Intelligence Platform</p>

      <h2>Incidents</h2>

      <div className="filters">
        <button onClick={() => setStatusFilter("all")}>All</button>
        <button onClick={() => setStatusFilter("open")}>Open</button>
        <button onClick={() => setStatusFilter("investigating")}>
          Investigating
        </button>
        <button onClick={() => setStatusFilter("resolved")}>
          Resolved
        </button>
      </div>

      {filteredIncidents.length === 0 ? (
        <p>No incidents detected.</p>
      ) : (
        filteredIncidents.map((incident) => (
          <div key={incident.id} className="incident-card">
            <div className="incident-header">
              <h2>{getApplicationName(incident.application_id)}</h2>
              <p>Application ID: {incident.application_id}</p>
              <span className="status">{incident.status}</span>
            </div>

            <p>Error count: {incident.error_count}</p>
            <p>
              Detected:{" "}
              {new Date(incident.created_at).toLocaleString()}
            </p>
            <div className="status-actions">
              <button onClick={() => updateIncidentStatus(incident.id, "open")}>
                Open
              </button>

              <button
                onClick={() =>
                  updateIncidentStatus(incident.id, "investigating")
                }
              >
                Investigating
              </button>

              <button
                onClick={() => updateIncidentStatus(incident.id, "resolved")}
              >
                Resolved
              </button>
              <button onClick={() => viewIncidentDetails(incident.id)}>
                View Details
              </button>
            </div>

            {selectedIncidentId === incident.id && (
              <div className="incident-details">
                <h3>Evidence Logs</h3>

                {evidenceLogs.length === 0 ? (
                  <p>No evidence logs found.</p>
                ) : (
                  evidenceLogs.map((log) => (
                    <div key={log.id} className="evidence-log">
                      <strong>{log.level}</strong>
                      {" — "}
                      {log.message}
                      <br />
                      <small>
                        {new Date(log.created_at).toLocaleString()}
                      </small>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        ))
      )}
    </main>
  );
}

export default App;