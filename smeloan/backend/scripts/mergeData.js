const fs = require('fs');
const path = require('path');

// Paths to the data files
const applicantsPath = path.join(__dirname, '..', 'data', 'applicants.json');
const submissionsPath = path.join(__dirname, '..', 'data', 'submissions.json');
const mergedDataPath = path.join(__dirname, '..', 'data', 'mergedDatabase.json');

// Helper function to read JSON files
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Helper function to write JSON files
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
}

// Main merge function
function mergeData() {
  // Read the data
  const applicants = readJsonFile(applicantsPath);
  const submissions = readJsonFile(submissionsPath);

  // Group submissions by applicantId
  const submissionsByApplicant = {};
  submissions.forEach(submission => {
    const applicantId = submission.applicantId;
    if (!submissionsByApplicant[applicantId]) {
      submissionsByApplicant[applicantId] = [];
    }
    submissionsByApplicant[applicantId].push(submission);
  });

  // Merge data
  const mergedData = applicants.map(applicant => {
    const applicantId = applicant['Applicant ID'];
    const applicantSubmissions = submissionsByApplicant[applicantId] || [];

    return {
      applicantId: applicantId,
      basicInfo: {
        sNo: applicant['S.No.'],
        industry: applicant['Applicant\'s Industry'],
        loanAmountRequested: applicant['Loan Amount Requested'],
        loanCategory: applicant['Loan Category'],
        applicantCategory: applicant['Applicant\'s Category'],
        incomeDocumentSubmitted: applicant['Income Document Submitted'],
        kycSubmitted: applicant['KYC Submitted'],
        businessProofSubmitted: applicant['Business Proof Submitted']
      },
      submissions: applicantSubmissions
    };
  });

  // Sort by applicantId for serial order
  mergedData.sort((a, b) => {
    // Extract numbers from applicantId for proper sorting
    const aNum = parseInt(a.applicantId.replace(/[^\d]/g, ''));
    const bNum = parseInt(b.applicantId.replace(/[^\d]/g, ''));
    return aNum - bNum;
  });

  // Write the merged data
  writeJsonFile(mergedDataPath, mergedData);

  console.log(`Merged ${applicants.length} applicants with their submissions.`);
  console.log(`Total merged records: ${mergedData.length}`);
}

// Run the merge
mergeData();
