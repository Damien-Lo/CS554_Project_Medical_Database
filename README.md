# HEART - Hospital Exit Assessment and Risk Tracker

A full-stack web application for hospital readmission risk assessment and insurance coverage analysis.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [PostgreSQL](https://www.postgresql.org/download/) (v12 or higher)
- [Git](https://git-scm.com/)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Damien-Lo/CS554_Project_Medical_Database/tree/main
cd CS554_Project_Medical_Database
```

### 2. Database Setup

#### Create the Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE medical_db;

# Exit psql
\q
```

#### Load the Schema and Data
```bash
# Import the database dump
psql -U postgres -d medical_db -f database/backup.sql
```

Or use pgAdmin:
1. Open pgAdmin
2. Right-click on "Databases" -> Create -> Database
3. Name it `medical_db`
4. Right-click on the database -> Query Tool
5. Open the `backup.sql` file (folder icon)
6. Execute the script (lightning bolt icon or F5)

#### Configure Database Connection

Create a `.env` file in the `server` directory:
```bash
cd server
touch .env
```

Add the following to `server/.env`:
```env
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=medical_db
DB_PASSWORD=your_postgres_password
DB_PORT=5432
PORT=3001
```

Replace `your_postgres_password` with your actual PostgreSQL password.

### 3. Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm run dev
```

The server will start on `http://localhost:3001`

### 4. Frontend Setup

Open a **new terminal window** and:
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will open in your browser at `http://localhost:5173`

## Project Structure
```
CS554_Project_Medical_Database/
|-- client/                 # React frontend
|   |-- src/
|   |   |-- App.jsx        # Main application component
|   |   |-- App.css        # Styles
|   |   `-- main.jsx       # Entry point
|   |-- package.json
|   `-- vite.config.js
|
|-- server/                 # Express backend
|   |-- routes/            # API routes
|   |   |-- patients.js    # Patient-related endpoints
|   |   |-- coverage.js    # Insurance coverage endpoints
|   |   `-- readmissions.js # Readmission detection
|   |-- index.js           # Server entry point
|   |-- db.js              # Database connection
|   |-- package.json
|   `-- .env               # Environment variables (create this)
|
`-- database/
    `-- backup.sql         # Database schema and data
```


