const mongoose = require("mongoose");

const ApplicantSchema = new mongoose.Schema({
  "Applicant ID": String,
  "Applicant's Industry": String,
  "Loan Amount Requested": Number,
  "Loan Category": String,
  "Applicant's Category": String,
});

module.exports = mongoose.model("Applicant", ApplicantSchema);
