const path = require('path');
const fs = require('fs').promises;

const applicantsPath = path.join(__dirname, '..', 'data', 'applicants.json');
const newApplicantsPath = path.join(__dirname, '..', 'data', 'newapplicant.json');
const tempApplicantsPath = path.join(__dirname, '..', 'data', 'tempApplicants.json');
const employeesPath = path.join(__dirname, '..', 'data', 'employees.json');

// Helper functions
const readJsonSafe = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

const writeJsonSafe = async (filePath, data) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
};

// Get all applicants
exports.getAllApplicants = async (req, res) => {
  try {
    const applicants = await readJsonSafe(applicantsPath);
    res.json(applicants);
  } catch (error) {
    console.error('getAllApplicants error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Get single applicant
exports.getApplicant = async (req, res) => {
  try {
    const applicantId = req.params.id;
    const applicants = await readJsonSafe(applicantsPath);
    const applicant = applicants.find(a => String(a['Applicant ID'] || '').toLowerCase() === applicantId.toLowerCase());
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
    res.json(applicant);
  } catch (error) {
    console.error('getApplicant error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Get submission for applicant
exports.getSubmission = async (req, res) => {
  try {
    const applicantId = req.params.id;
    const applicants = await readJsonSafe(applicantsPath);
    const applicant = applicants.find(a => String(a['Applicant ID'] || '').toLowerCase() === applicantId.toLowerCase());
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
    res.json(applicant.submissions || []);
  } catch (error) {
    console.error('getSubmission error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Submit documents
exports.submitDocuments = async (req, res) => {
  try {
    const applicantId = req.params.id;
    let applicants = await readJsonSafe(applicantsPath);
    let applicantIndex = applicants.findIndex(a => String(a['Applicant ID'] || '').toLowerCase() === applicantId.toLowerCase());

    if (applicantIndex === -1) {
      // Check in tempApplicants
      applicants = await readJsonSafe(tempApplicantsPath);
      applicantIndex = applicants.findIndex(a => String(a.applicantId || '').toLowerCase() === applicantId.toLowerCase());
      if (applicantIndex === -1) return res.status(404).json({ error: 'Applicant not found' });
      // Update status in tempApplicants
      applicants[applicantIndex]['Income Document Submitted'] = 'Yes';
      applicants[applicantIndex]['KYC Submitted'] = 'Yes';
      applicants[applicantIndex]['Business Proof Submitted'] = 'Yes';
      await writeJsonSafe(tempApplicantsPath, applicants);
    } else {
      // Update in applicantsPath
      applicants[applicantIndex]['Income Document Submitted'] = 'Yes';
      applicants[applicantIndex]['KYC Submitted'] = 'Yes';
      applicants[applicantIndex]['Business Proof Submitted'] = 'Yes';
      await writeJsonSafe(applicantsPath, applicants);
    }

    res.json({ message: 'Documents submitted successfully' });
  } catch (error) {
    console.error('submitDocuments error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Save submission
exports.saveSubmission = async (req, res) => {
  try {
    const submission = req.body;
    const applicants = await readJsonSafe(applicantsPath);
    applicants.push(submission);
    await writeJsonSafe(applicantsPath, applicants);
    res.json({ message: 'Submission saved successfully' });
  } catch (error) {
    console.error('saveSubmission error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Create new applicant
exports.createNewApplicant = async (req, res) => {
  try {
    const newApplicant = req.body;
    const tempApplicants = await readJsonSafe(tempApplicantsPath);

    // Check for duplicate company name or phone number in tempApplicants
    const existingApplicant = tempApplicants.find(a =>
      a.companyName.toLowerCase() === newApplicant.companyName.toLowerCase() ||
      a.phoneNumber === newApplicant.phoneNumber
    );
    if (existingApplicant) {
      const duplicateField = existingApplicant.companyName.toLowerCase() === newApplicant.companyName.toLowerCase() ? 'Company name' : 'Phone number';
      return res.status(400).json({ error: `${duplicateField} already in use. Application has already been applied.` });
    }

    // Generate a unique Applicant ID and slNo
    const maxSlNo = tempApplicants.length > 0 ? Math.max(...tempApplicants.map(a => a.slNo || 0)) : 0;
    const businessTypePrefix = (newApplicant.businessType || '').substring(0, 4).toUpperCase();
    newApplicant.applicantId = `SME${businessTypePrefix}${maxSlNo + 1}`;
    newApplicant.slNo = maxSlNo + 1;
    newApplicant.submissionDate = new Date().toISOString();
    newApplicant.documents = {
      incomeProof: {
        profitLossStatement: null,
        balanceSheet: null,
        incomeTaxReturn: null,
        bankStatement: null
      },
      kycDocuments: {
        panCardBusiness: null,
        panCardOwners: null,
        aadharCard: null,
        addressProof: null
      },
      businessProof: {
        registrationDocument: null,
        corporateId: null,
        boardOfDirectors: null
      }
    };
    tempApplicants.push(newApplicant);
    await writeJsonSafe(tempApplicantsPath, tempApplicants);
    res.json({ message: 'Applicant created successfully', applicantId: newApplicant.applicantId });
  } catch (error) {
    console.error('createNewApplicant error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Update applicant documents
exports.updateApplicantDocuments = async (req, res) => {
  try {
    console.log('updateApplicantDocuments called with body:', req.body);
    console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');
    const applicantId = req.body.applicantId;
    const tempApplicants = await readJsonSafe(tempApplicantsPath);
    console.log('Temp applicants loaded:', tempApplicants.length);
    const applicantIndex = tempApplicants.findIndex(a => String(a.applicantId || '').toLowerCase() === applicantId.toLowerCase());
    console.log('Applicant index:', applicantIndex, 'for ID:', applicantId);
    if (applicantIndex === -1) return res.status(404).json({ error: 'Applicant not found' });

    // Update documents with uploaded file paths
    const applicant = tempApplicants[applicantIndex];
    if (req.files) {
      // Income Proof
      if (req.files.pl_yr1) applicant.documents.incomeProof.profitLossStatement = req.files.pl_yr1[0].filename;
      if (req.files.bs_yr1) applicant.documents.incomeProof.balanceSheet = req.files.bs_yr1[0].filename;
      if (req.files.itr_yr1) applicant.documents.incomeProof.incomeTaxReturn = req.files.itr_yr1[0].filename;
      if (req.files.bank_statements) applicant.documents.incomeProof.bankStatement = req.files.bank_statements[0].filename;

      // KYC Documents
      if (req.files.pan_business) applicant.documents.kycDocuments.panCardBusiness = req.files.pan_business[0].filename;
      if (req.files.pan_owner) applicant.documents.kycDocuments.panCardOwners = req.files.pan_owner.map(f => f.filename);
      if (req.files.aadhar_owner) applicant.documents.kycDocuments.aadharCard = req.files.aadhar_owner.map(f => f.filename);
      if (req.files.address_proof) applicant.documents.kycDocuments.addressProof = req.files.address_proof[0].filename;

      // Business Proof
      if (req.files.reg_doc) applicant.documents.businessProof.registrationDocument = req.files.reg_doc[0].filename;
      if (req.files.cin_doc) applicant.documents.businessProof.corporateId = req.files.cin_doc[0].filename;
      if (req.files.board_list) applicant.documents.businessProof.boardOfDirectors = req.files.board_list[0].filename;
    }

    // Now save to newApplicantsPath (permanent storage)
    const newApplicants = await readJsonSafe(newApplicantsPath);
    newApplicants.push(applicant);
    await writeJsonSafe(newApplicantsPath, newApplicants);

    // Optionally, remove from tempApplicants after successful save
    tempApplicants.splice(applicantIndex, 1);
    await writeJsonSafe(tempApplicantsPath, tempApplicants);

    console.log('Documents updated and applicant moved to permanent storage for applicant:', applicantId);
    res.json({ message: 'Documents updated successfully' });
  } catch (error) {
    console.error('updateApplicantDocuments error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Submit new applicant
exports.submitNewApplicant = async (req, res) => {
  try {
    const newApplicant = req.body;
    const applicants = await readJsonSafe(applicantsPath);
    applicants.push(newApplicant);
    await writeJsonSafe(applicantsPath, applicants);
    res.json({ message: 'New applicant submitted successfully' });
  } catch (error) {
    console.error('submitNewApplicant error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

exports.employeeLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ status: 'ERROR', message: 'Username and password are required' });
    }

    // Read employees data
    const employees = await readJsonSafe(employeesPath);

    // Find employee with matching username and password
    const employee = employees.find(emp => emp.username === username && emp.password === password);

    if (!employee) {
      return res.status(401).json({ status: 'ERROR', message: 'Invalid username or password' });
    }

    res.json({
      status: 'SUCCESS',
      message: 'Login successful',
      employee: {
        username: employee.username
      }
    });

  } catch (error) {
    console.error('Error during employee login:', error);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};

// Approve applicant
exports.approveApplicant = async (req, res) => {
  try {
    const applicantId = req.params.id;
    const applicants = await readJsonSafe(applicantsPath);
    const applicantIndex = applicants.findIndex(a => String(a['Applicant ID'] || '').toLowerCase() === applicantId.toLowerCase());
    if (applicantIndex === -1) return res.status(404).json({ error: 'Applicant not found' });

    applicants[applicantIndex].status = 'approved';
    await writeJsonSafe(applicantsPath, applicants);
    res.json({ message: 'Applicant approved successfully' });
  } catch (err) {
    console.error('approveApplicant error', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

// Deny applicant
exports.denyApplicant = async (req, res) => {
  try {
    const applicantId = req.params.id;
    const applicants = await readJsonSafe(applicantsPath);
    const applicantIndex = applicants.findIndex(a => String(a['Applicant ID'] || '').toLowerCase() === applicantId.toLowerCase());
    if (applicantIndex === -1) return res.status(404).json({ error: 'Applicant not found' });

    applicants[applicantIndex].status = 'denied';
    await writeJsonSafe(applicantsPath, applicants);
    res.json({ message: 'Applicant denied successfully' });
  } catch (err) {
    console.error('denyApplicant error', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

exports.getApplicantDocuments = (req, res) => {
    const applicantId = req.params.id;
    const filePath = path.join(__dirname, '..', 'data', 'mergedDatabase.json');
    fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to read merged database' });
        }
        try {
            const data = JSON.parse(content);
            const record = Array.isArray(data) ? data.find(r => r.applicantId === applicantId || r['Applicant ID'] === applicantId) : null;
            if (!record) {
                return res.status(404).json({ error: 'Applicant not found in merged database' });
            }
            // Extract documents (tolerant of nested structures)
            const documents = {};
            if (record.documents) documents.incomeProof = record.documents.incomeProof || {};
            if (record.documents) documents.kycDocuments = record.documents.kycDocuments || {};
            if (record.documents) documents.businessProof = record.documents.businessProof || {};
            // Add other sections if present
            return res.json(documents);
        } catch (e) {
            return res.status(500).json({ error: 'Invalid merged database JSON' });
        }
    });
};

// Validate new applicant for duplicates
exports.validateNewApplicant = async (req, res) => {
  try {
    const { companyName, phoneNumber } = req.body;
    const tempApplicants = await readJsonSafe(tempApplicantsPath);
    const newApplicants = await readJsonSafe(newApplicantsPath);

    // Check in both temp and permanent storage
    const existingInTemp = tempApplicants.find(a =>
      a.companyName.toLowerCase() === companyName.toLowerCase() ||
      a.phoneNumber === phoneNumber
    );
    const existingInNew = newApplicants.find(a =>
      a.companyName.toLowerCase() === companyName.toLowerCase() ||
      a.phoneNumber === phoneNumber
    );

    if (existingInTemp || existingInNew) {
      const existingApplicant = existingInTemp || existingInNew;
      const duplicateField = existingApplicant.companyName.toLowerCase() === companyName.toLowerCase() ? 'Company name' : 'Phone number';
      return res.status(400).json({ error: `${duplicateField} already in use. Application has already been applied.` });
    }

    res.json({ message: 'Validation successful' });
  } catch (error) {
    console.error('validateNewApplicant error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};
