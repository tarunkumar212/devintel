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

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

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
  }, []);

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
              <h3>{incident.service}</h3>
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
            </div>
          </div>
        ))
      )}
    </main>
  );
}

export default App;