<<<<<<< Updated upstream
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
=======
import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeQuery, setActiveQuery] = useState(null);

  // Coverage Analysis State
  const [analysisType, setAnalysisType] = useState('');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureList, setProcedureList] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const procedureInputRef = useRef(null);

  // Procedure Detail Modal State
  const [procedureDetail, setProcedureDetail] = useState(null);
  const [procedureDetailLoading, setProcedureDetailLoading] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);

  // Fetch procedure list for autocomplete
  useEffect(() => {
    if (procedureSearch.length >= 2) {
      const fetchProcedures = async () => {
        try {
          const response = await fetch(
            `http://localhost:3001/api/coverage/procedures/list?search=${encodeURIComponent(procedureSearch)}`
          );
          if (response.ok) {
            const data = await response.json();
            setProcedureList(data);
            setShowProcedureDropdown(true);
          }
        } catch (err) {
          console.error('Error fetching procedures:', err);
        }
      };
      fetchProcedures();
    } else {
      setProcedureList([]);
      setShowProcedureDropdown(false);
    }
  }, [procedureSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (procedureInputRef.current && !procedureInputRef.current.contains(event.target)) {
        setShowProcedureDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const runCoverageAnalysis = async () => {
    if (!analysisType) return;
    if (analysisType === 'procedure-lookup' && !selectedProcedure) {
      setError('Please select a procedure');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setActiveQuery(`coverage-${analysisType}`);

      let url = '';
      switch (analysisType) {
        case 'payers':
          url = 'http://localhost:3001/api/coverage/payers';
          break;
        case 'procedure-lookup':
          url = `http://localhost:3001/api/coverage/procedures/${selectedProcedure.procedure_code}`;
          break;
        case 'rejections':
          url = 'http://localhost:3001/api/coverage/procedures/rejections?limit=20';
          break;
        default:
          throw new Error('Invalid analysis type');
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch coverage data');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectProcedure = (procedure) => {
    setSelectedProcedure(procedure);
    setProcedureSearch(`${procedure.procedure_code} - ${procedure.procedure_name}`);
    setShowProcedureDropdown(false);
  };

  // Fetch procedure detail when clicking on a row in High Rejection table
  const fetchProcedureDetail = async (procedureCode) => {
    try {
      setProcedureDetailLoading(true);
      setShowProcedureModal(true);
      
      const response = await fetch(`http://localhost:3001/api/coverage/procedures/${procedureCode}`);
      if (!response.ok) throw new Error('Failed to fetch procedure details');
      const data = await response.json();
      setProcedureDetail(data);
    } catch (err) {
      console.error('Error fetching procedure detail:', err);
      setProcedureDetail(null);
    } finally {
      setProcedureDetailLoading(false);
    }
  };

  const closeProcedureModal = () => {
    setShowProcedureModal(false);
    setProcedureDetail(null);
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
>>>>>>> Stashed changes

  const getCoverageColor = (status) => {
    switch (status) {
      case 'FULLY_COVERED': return '#16a34a';
      case 'PARTIALLY_COVERED': return '#ca8a04';
      case 'REJECTED': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatCurrencyCompact = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0';
    
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    if (absNum >= 1_000_000_000) {
      return `${sign}$${(absNum / 1_000_000_000).toFixed(1)}B`;
    } else if (absNum >= 1_000_000) {
      return `${sign}$${(absNum / 1_000_000).toFixed(1)}M`;
    } else if (absNum >= 1_000) {
      return `${sign}$${(absNum / 1_000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatPercent = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0%';
    return `${num.toFixed(1)}%`;
  };

  return (
<<<<<<< Updated upstream
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
=======
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

            {/* Query 3: Insurance Coverage Analysis */}
            <div className="query-card">
              <h3>Insurance Coverage Analysis</h3>
              <p className="query-description">
                Analyze claims coverage, payer performance, and procedure rejection rates
              </p>
              
              <div className="analysis-form">
                <label className="form-label">What would you like to analyze?</label>
                <select 
                  className="analysis-select"
                  value={analysisType}
                  onChange={(e) => {
                    setAnalysisType(e.target.value);
                    setSelectedProcedure(null);
                    setProcedureSearch('');
                  }}
                >
                  <option value="">Select Analysis Type...</option>
                  <option value="payers">Payer Performance Ranking</option>
                  <option value="procedure-lookup">Procedure Coverage Lookup</option>
                  <option value="rejections">High Rejection Procedures</option>
                </select>

                {/* Conditional Procedure Search */}
                {analysisType === 'procedure-lookup' && (
                  <div className="procedure-search-container" ref={procedureInputRef}>
                    <label className="form-label">Search for a procedure:</label>
                    <input
                      type="text"
                      placeholder="Type procedure name or code..."
                      value={procedureSearch}
                      onChange={(e) => {
                        setProcedureSearch(e.target.value);
                        setSelectedProcedure(null);
                      }}
                      className="search-input procedure-input"
                    />
                    {showProcedureDropdown && procedureList.length > 0 && (
                      <div className="procedure-dropdown">
                        {procedureList.map((proc) => (
                          <div
                            key={proc.procedure_code}
                            className="procedure-option"
                            onClick={() => selectProcedure(proc)}
                          >
                            <span className="procedure-code">{proc.procedure_code}</span>
                            <span className="procedure-name">{proc.procedure_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={runCoverageAnalysis} 
                  className="query-button"
                  disabled={!analysisType || (analysisType === 'procedure-lookup' && !selectedProcedure)}
                >
                  Run Analysis
                </button>
              </div>
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

          {/* High Risk Patients Results */}
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

          {/* Patient Search Results */}
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

          {/* Coverage: Payer Performance Ranking */}
          {results && !loading && activeQuery === 'coverage-payers' && (
            <div className="results-container">
              <div className="results-header">
                <h2>Payer Performance Ranking</h2>
                <span className="result-count">{results.data?.length || 0} payers analyzed</span>
              </div>

              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-value">{results.summary?.total_payers || 0}</div>
                  <div className="summary-label">Payers Analyzed</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{formatPercent((results.summary?.avg_coverage_ratio || 0) * 100)}</div>
                  <div className="summary-label">Avg Coverage</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{formatCurrencyCompact(results.summary?.total_paid)}</div>
                  <div className="summary-label">Total Paid Out</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{results.summary?.total_claims?.toLocaleString() || 0}</div>
                  <div className="summary-label">Total Claims</div>
                </div>
              </div>

              {/* Column Descriptions */}
              <div className="metric-descriptions">
                <h4>Understanding the Metrics</h4>
                <div className="metric-grid">
                  <div className="metric-item">
                    <span className="metric-term">Fully Covered %</span>
                    <span className="metric-def">Percentage of claims where the payer paid the entire billed amount</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-term">Rejected %</span>
                    <span className="metric-def">Percentage of claims where the payer paid $0 (claim denied)</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-term">Coverage Ratio</span>
                    <span className="metric-def">Total dollars paid ÷ Total dollars billed (overall reimbursement rate)</span>
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Payer Name</th>
                      <th>Type</th>
                      <th>Claims</th>
                      <th>Fully Covered %</th>
                      <th>Rejected %</th>
                      <th>Coverage Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.data?.map((payer, index) => (
                      <tr key={payer.payer_id}>
                        <td className="rank-cell">#{index + 1}</td>
                        <td className="payer-name">{payer.payer_name}</td>
                        <td>{payer.payer_type}</td>
                        <td className="center-cell">{payer.total_claims}</td>
                        <td className="center-cell good-value">{formatPercent(payer.fully_covered_pct)}</td>
                        <td className="center-cell bad-value">{formatPercent(payer.rejected_pct)}</td>
                        <td>
                          <div className="coverage-bar-container">
                            <div 
                              className="coverage-bar" 
                              style={{ width: `${payer.avg_coverage_ratio * 100}%` }}
                            ></div>
                            <span className="coverage-text">{formatPercent(payer.avg_coverage_ratio * 100)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Coverage: Procedure Lookup */}
          {results && !loading && activeQuery === 'coverage-procedure-lookup' && (
            <div className="results-container">
              <div className="results-header">
                <h2>Procedure Coverage Details</h2>
                <span className="result-count">{results.summary?.procedure_name || results.summary?.procedure_code}</span>
              </div>

              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-value">{results.summary?.total_claims || 0}</div>
                  <div className="summary-label">Total Claims</div>
                </div>
                <div className="summary-card good-card">
                  <div className="summary-value">{formatPercent(results.summary?.fully_covered_pct)}</div>
                  <div className="summary-label">Fully Covered</div>
                </div>
                <div className="summary-card warn-card">
                  <div className="summary-value">{formatPercent(results.summary?.partially_covered_pct)}</div>
                  <div className="summary-label">Partial Coverage</div>
                </div>
                <div className="summary-card bad-card">
                  <div className="summary-value">{formatPercent(results.summary?.rejected_pct)}</div>
                  <div className="summary-label">Rejected</div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="financial-summary">
                <div className="financial-row">
                  <span className="financial-label">Total Billed:</span>
                  <span className="financial-value">{formatCurrency(results.summary?.total_billed)}</span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Total Paid:</span>
                  <span className="financial-value good-value">{formatCurrency(results.summary?.total_paid)}</span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Outstanding:</span>
                  <span className="financial-value bad-value">{formatCurrency(results.summary?.total_outstanding)}</span>
                </div>
              </div>

              {/* Recent Claims for this procedure */}
              {results.recent_claims?.length > 0 && (
                <>
                  <h3 className="subsection-title">Recent Claims</h3>
                  <div className="table-container">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Billed</th>
                          <th>Paid</th>
                          <th>Outstanding</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.recent_claims.map((claim) => (
                          <tr key={claim.claim_id}>
                            <td>{claim.claim_date ? new Date(claim.claim_date).toLocaleDateString() : 'N/A'}</td>
                            <td>{formatCurrency(claim.billed_amount)}</td>
                            <td>{formatCurrency(claim.paid_amount)}</td>
                            <td>{formatCurrency(claim.outstanding_amount)}</td>
                            <td>
                              <span 
                                className="coverage-badge"
                                style={{ backgroundColor: getCoverageColor(claim.coverage_status) }}
                              >
                                {claim.coverage_status?.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Coverage: High Rejection Procedures */}
          {results && !loading && activeQuery === 'coverage-rejections' && (
            <div className="results-container">
              <div className="results-header">
                <h2>High Rejection Procedures</h2>
                <span className="result-count">Sorted by rejection rate</span>
              </div>

              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-value">{results.summary?.procedures_analyzed || 0}</div>
                  <div className="summary-label">Procedures Analyzed</div>
                </div>
                <div className="summary-card bad-card">
                  <div className="summary-value">{formatPercent(results.summary?.avg_rejection_rate)}</div>
                  <div className="summary-label">Avg Rejection Rate</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{formatCurrencyCompact(results.summary?.total_billed)}</div>
                  <div className="summary-label">Total Billed</div>
                </div>
              </div>

              {/* Column Descriptions */}
              <div className="metric-descriptions">
                <h4>Understanding the Metrics</h4>
                <div className="metric-grid">
                  <div className="metric-item">
                    <span className="metric-term">Rejected %</span>
                    <span className="metric-def">Percentage of claims for this procedure where insurance paid $0</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-term">Coverage Ratio</span>
                    <span className="metric-def">Total dollars paid ÷ Total dollars billed for this procedure</span>
                  </div>
                </div>
                <p className="click-hint">💡 Click on any row to view detailed procedure information</p>
              </div>

              <div className="table-container">
                <table className="results-table clickable-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Procedure</th>
                      <th>Claims</th>
                      <th>Rejected</th>
                      <th>Rejection %</th>
                      <th>Coverage Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.data?.map((proc, index) => (
                      <tr 
                        key={proc.procedure_code}
                        onClick={() => fetchProcedureDetail(proc.procedure_code)}
                        className="clickable-row"
                      >
                        <td className="rank-cell">#{index + 1}</td>
                        <td className="procedure-cell">
                          <div className="procedure-info">
                            <span className="procedure-code-display">{proc.procedure_code}</span>
                            {proc.procedure_name && (
                              <span className="procedure-name-display">{proc.procedure_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="center-cell">{proc.total_claims}</td>
                        <td className="center-cell bad-value">{proc.rejected_count}</td>
                        <td>
                          <div className="rejection-bar-container">
                            <div 
                              className="rejection-bar" 
                              style={{ width: `${proc.rejected_pct}%` }}
                            ></div>
                            <span className="rejection-text">{formatPercent(proc.rejected_pct)}</span>
                          </div>
                        </td>
                        <td className="center-cell">{formatPercent(proc.avg_coverage_ratio * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Procedure Detail Modal */}
          {showProcedureModal && (
            <div className="modal-overlay" onClick={closeProcedureModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={closeProcedureModal}>×</button>
                
                {procedureDetailLoading ? (
                  <div className="modal-loading">
                    <div className="spinner"></div>
                    <p>Loading procedure details...</p>
                  </div>
                ) : procedureDetail ? (
                  <>
                    <div className="modal-header">
                      <h2>Procedure Details</h2>
                      <div className="modal-procedure-info">
                        <span className="modal-procedure-code">{procedureDetail.summary?.procedure_code}</span>
                        <span className="modal-procedure-name">{procedureDetail.summary?.procedure_name}</span>
                      </div>
                    </div>

                    {/* Coverage Stats */}
                    <div className="modal-stats-grid">
                      <div className="modal-stat">
                        <div className="modal-stat-value">{procedureDetail.summary?.total_claims || 0}</div>
                        <div className="modal-stat-label">Total Claims</div>
                      </div>
                      <div className="modal-stat good">
                        <div className="modal-stat-value">{formatPercent(procedureDetail.summary?.fully_covered_pct)}</div>
                        <div className="modal-stat-label">Fully Covered</div>
                      </div>
                      <div className="modal-stat warn">
                        <div className="modal-stat-value">{formatPercent(procedureDetail.summary?.partially_covered_pct)}</div>
                        <div className="modal-stat-label">Partially Covered</div>
                      </div>
                      <div className="modal-stat bad">
                        <div className="modal-stat-value">{formatPercent(procedureDetail.summary?.rejected_pct)}</div>
                        <div className="modal-stat-label">Rejected</div>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="modal-financials">
                      <h4>Financial Summary</h4>
                      <div className="modal-financial-row">
                        <span>Total Billed:</span>
                        <span>{formatCurrency(procedureDetail.summary?.total_billed)}</span>
                      </div>
                      <div className="modal-financial-row">
                        <span>Total Paid:</span>
                        <span className="good-value">{formatCurrency(procedureDetail.summary?.total_paid)}</span>
                      </div>
                      <div className="modal-financial-row">
                        <span>Outstanding:</span>
                        <span className="bad-value">{formatCurrency(procedureDetail.summary?.total_outstanding)}</span>
                      </div>
                      <div className="modal-financial-row highlight">
                        <span>Coverage Ratio:</span>
                        <span>{formatPercent((procedureDetail.summary?.avg_coverage_ratio || 0) * 100)}</span>
                      </div>
                    </div>

                    {/* Recent Claims */}
                    {procedureDetail.recent_claims?.length > 0 && (
                      <div className="modal-claims">
                        <h4>Recent Claims ({procedureDetail.recent_claims.length})</h4>
                        <div className="modal-claims-list">
                          {procedureDetail.recent_claims.map((claim) => (
                            <div key={claim.claim_id} className="modal-claim-item">
                              <div className="modal-claim-date">
                                {claim.claim_date ? new Date(claim.claim_date).toLocaleDateString() : 'N/A'}
                              </div>
                              <div className="modal-claim-amounts">
                                <span>Billed: {formatCurrency(claim.billed_amount)}</span>
                                <span>Paid: {formatCurrency(claim.paid_amount)}</span>
                              </div>
                              <span 
                                className="coverage-badge"
                                style={{ backgroundColor: getCoverageColor(claim.coverage_status) }}
                              >
                                {claim.coverage_status?.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="modal-error">
                    <p>Unable to load procedure details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
>>>>>>> Stashed changes
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
