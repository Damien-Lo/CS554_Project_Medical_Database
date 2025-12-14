import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeQuery, setActiveQuery] = useState(null);
    // Add to existing state
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [encounterHistory, setEncounterHistory] = useState(null);
    const [readmissionDays, setReadmissionDays] = useState(30);
    const [readmissionYears, setReadmissionYears] = useState(10);
    const [readmissionWindow, setReadmissionWindow] = useState(30);

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

    const fetchEncounterHistory = async () => {
        if (!selectedPatientId) {
            setError('Please search for a patient first');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setActiveQuery('encounter-history');

            const response = await fetch(`http://localhost:3001/api/patients/encounters/${selectedPatientId}`);
            if (!response.ok) throw new Error('Failed to fetch encounter history');
            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
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

    const checkReadmission = async () => {
        if (!selectedPatientId) {
            setError('Please search for a patient first');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setActiveQuery('readmission-check');

            const response = await fetch(
                `http://localhost:3001/api/patients/readmission-check/${selectedPatientId}?days=${readmissionDays}`
            );
            if (!response.ok) throw new Error('Failed to check readmission status');
            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    const detectReadmissions = async () => {
        if (!selectedPatientId) {
            setError('Please search for a patient first');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setActiveQuery('readmission-detection');

            const response = await fetch(
                `http://localhost:3001/api/patients/readmission-detection/${selectedPatientId}?years=${readmissionYears}&windowDays=${readmissionWindow}`
            );
            if (!response.ok) throw new Error('Failed to detect readmissions');
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

            // Save the first patient's ID if found
            if (data.length > 0) {
                setSelectedPatientId(data[0].patient_id);
            }
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

                        {/* Query 5: Readmission/Follow-up Check */}
                        <div className="query-card">
                            <h3>Follow-up Check</h3>
                            <p className="query-description">
                                Check if patient had wellness follow-up after last hospital discharge
                            </p>

                            {selectedPatientId ? (
                                <div style={{
                                    background: '#f0f9ff',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '1rem'
                                }}>
                                    <p style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600, margin: 0 }}>
                                        Selected Patient
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0 0', fontFamily: 'monospace' }}>
                                        ID: {selectedPatientId.substring(0, 16)}...
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '1rem'
                                }}>
                                    <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: 0 }}>
                                        ⚠️ No patient selected
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                                        Search for and select a patient first
                                    </p>
                                </div>
                            )}

                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Check within how many days?</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={readmissionDays}
                                    onChange={(e) => setReadmissionDays(e.target.value)}
                                    className="search-input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <button
                                onClick={checkReadmission}
                                className="query-button"
                                disabled={!selectedPatientId}
                            >
                                Check Follow-up Status
                            </button>
                        </div>

                        {/* Query 6: Readmission Detection */}
                        <div className="query-card">
                            <h3>Readmission Detection</h3>
                            <p className="query-description">
                                Detect patterns of multiple hospital visits within a time window
                            </p>

                            {selectedPatientId ? (
                                <div style={{
                                    background: '#f0f9ff',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '1rem'
                                }}>
                                    <p style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600, margin: 0 }}>
                                        Selected Patient
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0 0', fontFamily: 'monospace' }}>
                                        ID: {selectedPatientId.substring(0, 16)}...
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '1rem'
                                }}>
                                    <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: 0 }}>
                                        ⚠️ No patient selected
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                                        Search for and select a patient first
                                    </p>
                                </div>
                            )}

                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Analyze past how many years?</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={readmissionYears}
                                    onChange={(e) => setReadmissionYears(e.target.value)}
                                    className="search-input"
                                    style={{ width: '100%', marginBottom: '0.75rem' }}
                                />

                                <label className="form-label">Readmission window (days)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={readmissionWindow}
                                    onChange={(e) => setReadmissionWindow(e.target.value)}
                                    className="search-input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <button
                                onClick={detectReadmissions}
                                className="query-button"
                                disabled={!selectedPatientId}
                            >
                                Detect Readmissions
                            </button>
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

                        <div className="query-card">
                            <h3>Patient Encounter History</h3>
                            <p className="query-description">
                                View all hospital visits and encounters for a patient
                            </p>
                            {selectedPatientId && (
                                <p className="query-description" style={{ fontWeight: 600, color: '#3b82f6' }}>
                                    Patient selected: {selectedPatientId.substring(0, 8)}...
                                </p>
                            )}
                            <button
                                onClick={fetchEncounterHistory}
                                className="query-button"
                                disabled={!selectedPatientId}
                            >
                                View Encounter History
                            </button>
                            {!selectedPatientId && (
                                <p style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '0.5rem' }}>
                                    Search for a patient first
                                </p>
                            )}
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
                                            <th>LACE Score</th>
                                            <th>Risk Score</th>
                                            <th>Risk Level</th>
                                            <th>Est. Risk</th>
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
                                                <td className="center-cell">
                                                    <span style={{
                                                        background: patient.lace_score >= 10 ? '#dc2626' :
                                                            patient.lace_score >= 5 ? '#ca8a04' : '#16a34a',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        color: '#ffffff'
                                                    }}>
                                                        {patient.lace_score}
                                                    </span>
                                                </td>
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
                                                <td className="center-cell" style={{ fontSize: '0.85rem' }}>
                                                    {patient.estimated_readmission_risk}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* Patient Search Results - ENHANCED */}
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
                                        <div
                                            key={patient.patient_id}
                                            className={`patient-card ${selectedPatientId === patient.patient_id ? 'patient-card-selected' : ''}`}
                                            onClick={() => setSelectedPatientId(patient.patient_id)}
                                            style={{ cursor: 'pointer' }}
                                        >
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
                                            {selectedPatientId === patient.patient_id && (
                                                <div style={{
                                                    background: '#16a34a',
                                                    color: '#ffffff',
                                                    padding: '0.5rem',
                                                    borderRadius: '4px',
                                                    textAlign: 'center',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    marginTop: '0.5rem'
                                                }}>
                                                    ✓ Selected - Click "View Encounter History" to see visits
                                                </div>
                                            )}
                                            {selectedPatientId !== patient.patient_id && (
                                                <button
                                                    className="view-details-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPatientId(patient.patient_id);
                                                    }}
                                                >
                                                    Select Patient →
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Encounter History Results */}
                    {results && !loading && activeQuery === 'encounter-history' && (
                        <div className="results-container">
                            <div className="results-header">
                                <h2>Encounter History</h2>
                                <span className="result-count">{results.length} encounters found</span>
                            </div>

                            {results.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📋</div>
                                    <p>No encounter history found for this patient</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="results-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Description</th>
                                                <th>Organization</th>
                                                <th>Location</th>
                                                <th>Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((encounter) => (
                                                <tr key={encounter.encounter_id}>
                                                    <td>{new Date(encounter.encounter_start).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className="encounter-type-badge" style={{
                                                            background: encounter.encounterclass === 'inpatient' ? '#dc2626' :
                                                                encounter.encounterclass === 'emergency' ? '#ea580c' :
                                                                    encounter.encounterclass === 'urgent' ? '#ca8a04' :
                                                                        '#16a34a',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#ffffff',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {encounter.encounterclass}
                                                        </span>
                                                    </td>
                                                    <td className="diagnosis-cell">{encounter.description || 'N/A'}</td>
                                                    <td className="hospital-cell">{encounter.organization_name}</td>
                                                    <td>{encounter.city}, {encounter.state}</td>
                                                    <td className="center-cell">
                                                        {encounter.encounter_end ? (
                                                            (() => {
                                                                const start = new Date(encounter.encounter_start);
                                                                const end = new Date(encounter.encounter_end);
                                                                const diffMs = end - start;
                                                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

                                                                if (diffDays > 0) {
                                                                    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                                                                } else if (diffHours > 0) {
                                                                    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
                                                                } else {
                                                                    return '< 1 hour';
                                                                }
                                                            })()
                                                        ) : (
                                                            'Ongoing'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Readmission/Follow-up Check Results */}
                    {results && !loading && activeQuery === 'readmission-check' && (
                        <div className="results-container">
                            <div className="results-header">
                                <h2>Follow-up Status</h2>
                                <span className="result-count">
                                    Checking {results.days_window} days after discharge
                                </span>
                            </div>

                            {/* Last Discharge Info */}
                            {results.last_discharge ? (
                                <div style={{
                                    background: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ffffff' }}>
                                        Last Hospital Discharge
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                                Discharge Date
                                            </p>
                                            <p style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600 }}>
                                                {new Date(results.last_discharge.last_discharge_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                                Encounter Type
                                            </p>
                                            <p style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600 }}>
                                                {results.last_discharge.encounterclass}
                                            </p>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                                Description
                                            </p>
                                            <p style={{ fontSize: '0.95rem', color: '#e5e7eb' }}>
                                                {results.last_discharge.description || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">ℹ️</div>
                                    <p>No hospital discharge found for this patient</p>
                                </div>
                            )}

                            {/* Follow-up Visits */}
                            {results.follow_ups && results.follow_ups.length > 0 ? (
                                <>
                                    <div style={{
                                        background: '#14532d',
                                        border: '1px solid #16a34a',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        marginBottom: '1.5rem',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                                            ✓ {results.follow_ups.length} Follow-up Visit{results.follow_ups.length !== 1 ? 's' : ''} Found
                                        </p>
                                    </div>

                                    <div className="table-container">
                                        <table className="results-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Days After Discharge</th>
                                                    <th>Procedure</th>
                                                    <th>Description</th>
                                                    <th>Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.follow_ups.map((followUp, index) => (
                                                    <tr key={index}>
                                                        <td>{new Date(followUp.stop).toLocaleDateString()}</td>
                                                        <td className="center-cell">
                                                            <span style={{
                                                                background: followUp.days_since_discharge <= 7 ? '#16a34a' :
                                                                    followUp.days_since_discharge <= 14 ? '#ca8a04' :
                                                                        '#dc2626',
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                color: '#ffffff'
                                                            }}>
                                                                {Math.floor(followUp.days_since_discharge)} days
                                                            </span>
                                                        </td>
                                                        <td className="procedure-cell">{followUp.procedure_code}</td>
                                                        <td>{followUp.procedure_description || 'N/A'}</td>
                                                        <td className="diagnosis-cell">{followUp.reasondescription || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : results.last_discharge ? (
                                <div style={{
                                    background: '#7f1d1d',
                                    border: '1px solid #dc2626',
                                    borderRadius: '8px',
                                    padding: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                                        ⚠️ No Follow-up Visits Found
                                    </p>
                                    <p style={{ fontSize: '0.95rem', color: '#fca5a5', margin: 0 }}>
                                        Patient has not had a wellness follow-up within {results.days_window} days of discharge
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    )}
                    {/* Readmission Detection Results */}
                    {results && !loading && activeQuery === 'readmission-detection' && (
                        <div className="results-container">
                            <div className="results-header">
                                <h2>Readmission Detection</h2>
                                <span className="result-count">
                                    Analyzing {results.years_analyzed} years, {results.window_days}-day windows
                                </span>
                            </div>

                            {/* Summary Cards */}
                            <div className="summary-cards" style={{ marginBottom: '2rem' }}>
                                <div className="summary-card">
                                    <div className="summary-value">{Number(results.total_readmissions) || 0}</div>
                                    <div className="summary-label">Readmission Events</div>
                                </div>
                                <div className="summary-card bad-card">
                                    <div className="summary-value">{Number(results.total_readmissions) || 0}</div>
                                    <div className="summary-label">Total Readmissions</div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-value">{results.window_days}</div>
                                    <div className="summary-label">Window (Days)</div>
                                </div>
                            </div>

                            {/* Explanation */}
                            <div className="metric-descriptions" style={{ marginBottom: '1.5rem' }}>
                                <h4>Understanding Readmissions</h4>
                                <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: '1.6', margin: 0 }}>
                                    A <strong>readmission event</strong> occurs when a patient has multiple hospital encounters
                                    within a {results.window_days}-day window. Each event shows the index encounter and all
                                    subsequent readmissions within that timeframe.
                                </p>
                            </div>

                            {/* Results */}
                            {results.readmission_events && results.readmission_events.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {results.readmission_events.map((event, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                background: '#1f2937',
                                                border: '1px solid #dc2626',
                                                borderRadius: '12px',
                                                padding: '1.5rem'
                                            }}
                                        >
                                            {/* Event Header */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '1rem',
                                                paddingBottom: '1rem',
                                                borderBottom: '1px solid #374151'
                                            }}>
                                                <div>
                                                    <h3 style={{
                                                        fontSize: '1.1rem',
                                                        color: '#ffffff',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        Readmission Event #{idx + 1}
                                                    </h3>
                                                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
                                                        {new Date(event.window_start).toLocaleDateString()} - {new Date(event.window_end).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{
                                                        background: '#dc2626',
                                                        color: '#ffffff',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '8px',
                                                        fontSize: '1.25rem',
                                                        fontWeight: '700'
                                                    }}>
                                                        {event.readmission_count} Readmission{event.readmission_count !== 1 ? 's' : ''}
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                                        {Math.floor(event.window_duration_days)} days total
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Index Encounter */}
                                            <div style={{ marginBottom: '1rem' }}>
                                                <p style={{
                                                    fontSize: '0.8rem',
                                                    color: '#9ca3af',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    Initial Encounter
                                                </p>
                                                <div style={{
                                                    background: '#111827',
                                                    border: '1px solid #374151',
                                                    borderRadius: '8px',
                                                    padding: '1rem'
                                                }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                        <div>
                                                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Type</p>
                                                            <p style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600 }}>
                                                                {event.index_encounter_class}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Date</p>
                                                            <p style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600 }}>
                                                                {new Date(event.window_start).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div style={{ gridColumn: '1 / -1' }}>
                                                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Description</p>
                                                            <p style={{ fontSize: '0.9rem', color: '#e5e7eb' }}>
                                                                {event.index_description || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subsequent Encounters */}
                                            {event.readmission_count > 0 && (
                                                <div>
                                                    <p style={{
                                                        fontSize: '0.8rem',
                                                        color: '#9ca3af',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        marginBottom: '0.5rem'
                                                    }}>
                                                        Readmissions ({event.readmission_count})
                                                    </p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {event.encounter_dates.slice(1).map((date, i) => (
                                                            <div
                                                                key={i}
                                                                style={{
                                                                    background: '#7f1d1d20',
                                                                    border: '1px solid #7f1d1d',
                                                                    borderRadius: '6px',
                                                                    padding: '0.75rem 1rem',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <div>
                                                                    <span style={{
                                                                        fontSize: '0.95rem',
                                                                        color: '#ffffff',
                                                                        fontWeight: 600
                                                                    }}>
                                                                        {event.encounter_classes[i + 1]}
                                                                    </span>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <p style={{ fontSize: '0.9rem', color: '#fca5a5', margin: 0 }}>
                                                                        {new Date(date).toLocaleDateString()}
                                                                    </p>
                                                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                                                                        +{Math.floor((new Date(date) - new Date(event.window_start)) / (1000 * 60 * 60 * 24))} days
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    background: '#14532d',
                                    border: '1px solid #16a34a',
                                    borderRadius: '8px',
                                    padding: '2rem',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                                        ✓ No Readmissions Detected
                                    </p>
                                    <p style={{ fontSize: '0.95rem', color: '#86efac', margin: 0 }}>
                                        Patient had no readmission events within {results.window_days} days in the past {results.years_analyzed} years
                                    </p>
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
            </div>
        </div>
    )
}

export default App