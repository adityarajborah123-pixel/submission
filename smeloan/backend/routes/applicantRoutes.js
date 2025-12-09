// backend/routes/applicantRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const applicantController = require('../controllers/applicantController');

const uploadDir = path.join(__dirname, '..', 'uploads');
// ensure uploads dir exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// configure multer storage with applicant-specific folders
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const applicantId = req.params.id || req.body.applicantId;
    const applicantDir = path.join(uploadDir, applicantId);
    if (!fs.existsSync(applicantDir)) fs.mkdirSync(applicantDir, { recursive: true });
    cb(null, applicantDir);
  },
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// strict field list that matches frontend checklists
const fields = [
  // Income -> 3 years of P&L, 3 years Balance Sheet, 3 years ITR, Bank statements
  { name: 'pl_yr1', maxCount: 1 },
  { name: 'pl_yr2', maxCount: 1 },
  { name: 'pl_yr3', maxCount: 1 },
  { name: 'bs_yr1', maxCount: 1 },
  { name: 'bs_yr2', maxCount: 1 },
  { name: 'bs_yr3', maxCount: 1 },
  { name: 'itr_yr1', maxCount: 1 },
  { name: 'itr_yr2', maxCount: 1 },
  { name: 'itr_yr3', maxCount: 1 },
  { name: 'bank_statements', maxCount: 12 },

  // KYC
  { name: 'pan_business', maxCount: 1 },
  { name: 'pan_owner', maxCount: 5 },
  { name: 'aadhar_owner', maxCount: 5 },
  { name: 'address_proof', maxCount: 2 },

  // Business Proof
  { name: 'reg_doc', maxCount: 2 },
  { name: 'cin_doc', maxCount: 1 },
  { name: 'board_list', maxCount: 2 }
];

// Routes
router.get('/', applicantController.getAllApplicants);
router.get('/:id', applicantController.getApplicant);
router.get('/:id/submission', applicantController.getSubmission);

// Use strict fields to avoid Unexpected field errors
router.post('/:id/submit-doc', upload.fields(fields), applicantController.submitDocuments);

// download route (uses uploadDir)
router.get('/:id/download/:filename', (req, res) => {
  const applicantId = req.params.id;
  const filename = req.params.filename;
  const filepath = path.join(uploadDir, applicantId, filename);

  if (!fs.existsSync(filepath) || !filepath.startsWith(uploadDir)) {
    return res.status(404).json({ status: 'NOT_FOUND', message: 'File not found' });
  }

  res.download(filepath);
});

// keep legacy submissions endpoint if used by frontend
router.post('/api/submissions', applicantController.saveSubmission);

// Validate new applicant for duplicates
router.post('/validate-new', applicantController.validateNewApplicant);

// Create new applicant (basic info only)
router.post('/create-new', applicantController.createNewApplicant);

// Update applicant documents
router.post('/update-documents/:id', upload.fields(fields), applicantController.updateApplicantDocuments);

// New applicant submission route (legacy)
router.post('/new-applicant', upload.fields(fields), applicantController.submitNewApplicant);

// Employee login
router.post('/employee/login', applicantController.employeeLogin);

// Approve applicant
router.post('/:id/approve', applicantController.approveApplicant);

// Deny applicant
router.post('/:id/deny', applicantController.denyApplicant);

// Get applicant documents
router.get('/api/applicants/:id/documents', applicantController.getApplicantDocuments);

module.exports = router;
