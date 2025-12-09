require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const applicantRoutes = require('./routes/applicantRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.use('/api/applicants', applicantRoutes);

// Serve the newapplicant.json file
app.get('/backend/data/newapplicant.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'newapplicant.json'));
});

// Serve the applicants.json file
app.get('/backend/data/applicants.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'applicants.json'));
});

// Serve the submissions.json file
app.get('/backend/data/submissions.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'submissions.json'));
});

app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'Ui.html')));

const PORT = process.env.PORT || 5000;

// start server and keep reference for error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} in use. Kill process or set PORT env var.`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});
