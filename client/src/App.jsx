import { useState } from 'react';
import './App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeQuery, setActiveQuery] = useState(null);

  const fetchHighRiskPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      setActiveQuery('high-risk');
      
      const response = await fetch('http://localhost:3001/api/patients/high-risk?limit=10');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchPatient = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setActiveQuery('search');
      
      const response = await fetch(`http://localhost:3001/api/patients/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search patients');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (category) => {
    switch (category) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#ca8a04';
      case 'LOW': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return (
    <div className="app-container">
      {/* LEFT SIDE - Black on White */}
      <div className="left-panel">
        <div className="panel-content">
          <h1>HEART</h1>
          <p className="subtitle">Hospital Exit Assessment and Risk Tracker</p>

          <div className="query-section">
            
            {/* Query 1: Search Patient by Name */}
            <div className="query-card">
              <h3>Find Patient by Name</h3>
              <p className="query-description">
                Search for a patient by their first or last name
              </p>
              <form onSubmit={searchPatient} className="search-form">
                <input
                  type="text"
                  placeholder="Enter patient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="query-button">
                  Search Patient
                </button>
              </form>
            </div>

            {/* Query 2: Top 10 High Risk */}
            <div className="query-card">
              <h3>Top 10 Highest Risk Patients</h3>
              <p className="query-description">
                Display patients with the highest readmission risk scores
              </p>
              <button onClick={fetchHighRiskPatients} className="query-button">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - White on Black */}
      <div className="right-panel">
        <div className="panel-content">
          <h1>Query Results</h1>
          
          {!results && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>Select a query from the left to view results</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p>Error: {error}</p>
            </div>
          )}

          {results && !loading && activeQuery === 'high-risk' && (
            <div className="results-container">
              <div className="results-header">
                <h2>High Risk Patients</h2>
                <span className="result-count">{results.length} patients found</span>
              </div>
              
              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Patient Name</th>
                      <th>Age</th>
                      <th>Hospital</th>
                      <th>Last Discharge</th>
                      <th>Primary Diagnosis</th>
                      <th>Comorbidities</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((patient, index) => (
                      <tr key={patient.patient_id}>
                        <td className="rank-cell">#{index + 1}</td>
                        <td className="patient-name">{patient.patient_name}</td>
                        <td>{patient.age}</td>
                        <td className="hospital-cell">{patient.hospital}</td>
                        <td>{new Date(patient.discharge_date).toLocaleDateString()}</td>
                        <td className="diagnosis-cell">
                          {patient.primary_diagnosis || 'N/A'}
                        </td>
                        <td className="center-cell">{patient.comorbidities}</td>
                        <td className="score-cell">{patient.risk_score}</td>
                        <td>
                          <span 
                            className="risk-badge"
                            style={{ 
                              backgroundColor: getRiskColor(patient.risk_category)
                            }}
                          >
                            {patient.risk_category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results && !loading && activeQuery === 'search' && (
            <div className="results-container">
              <div className="results-header">
                <h2>Search Results</h2>
                <span className="result-count">{results.length} patients found</span>
              </div>
              
              {results.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>No patients found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="patient-cards">
                  {results.map((patient) => (
                    <div key={patient.patient_id} className="patient-card">
                      <div className="patient-card-header">
                        <h3>{patient.patient_name}</h3>
                        <span className="patient-id">ID: {patient.patient_id.substring(0, 8)}...</span>
                      </div>
                      <div className="patient-card-body">
                        <div className="patient-info-row">
                          <span className="info-label">Age:</span>
                          <span className="info-value">{patient.age}</span>
                        </div>
                        <div className="patient-info-row">
                          <span className="info-label">Gender:</span>
                          <span className="info-value">{patient.gender}</span>
                        </div>
                        <div className="patient-info-row">
                          <span className="info-label">Location:</span>
                          <span className="info-value">{patient.city}, {patient.state}</span>
                        </div>
                        <div className="patient-info-row">
                          <span className="info-label">Date of Birth:</span>
                          <span className="info-value">
                            {new Date(patient.birthdate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button className="view-details-btn">
                        View Full Details →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
