/* Mock data for screen area: admin (Administration). Every name and figure is a fictional sample. See CONVENTIONS.md. */
(function () {
  "use strict";
  var D = window.APP_DATA;

  /* Deterministic series for small charts */
  function series(seed, n, base, spread, trend) {
    var out = [], x = seed;
    for (var i = 0; i < n; i++) {
      x = (x * 9301 + 49297) % 233280;
      var r = x / 233280;
      out.push(Math.max(0, Math.round((base + (r - 0.5) * spread + (trend || 0) * i) * 100) / 100));
    }
    return out;
  }

  /* ---------- users ---------- */
  var users = [
    { id: "legal", name: "N. Perera", fullName: "Nadeesha Perera", email: "n.perera@company.example", role: "legal", dept: "Legal", status: "Active", lastSignIn: "2026-11-10T07:48" },
    { id: "owner", name: "S. Silva", fullName: "Sanjeewa Silva", email: "s.silva@company.example", role: "owner", dept: "Commercial", status: "Active", lastSignIn: "2026-11-10T08:31" },
    { id: "reviewer", name: "Li Wei", fullName: "Li Wei", email: "li.wei@company.example", role: "reviewer", dept: "Legal (headquarters liaison)", status: "Active", lastSignIn: "2026-11-10T08:55" },
    { id: "compliance", name: "R. Fernando", fullName: "Rashmi Fernando", email: "r.fernando@company.example", role: "compliance", dept: "Compliance and Risk", status: "Active", lastSignIn: "2026-11-10T08:20" },
    { id: "cosec", name: "A. Jayawardena", fullName: "Anura Jayawardena", email: "a.jayawardena@company.example", role: "cosec", dept: "Company Secretariat", status: "Active", lastSignIn: "2026-11-09T17:02" },
    { id: "admin", name: "K. Dias", fullName: "Kasun Dias", email: "k.dias@company.example", role: "admin", dept: "IT", status: "Active", lastSignIn: "2026-11-10T07:30" },
    { id: "auditor", name: "M. Rahman", fullName: "Mariam Rahman", email: "m.rahman@company.example", role: "auditor", dept: "Internal Audit", status: "Active", lastSignIn: "2026-11-10T08:02" },
    { id: "u-admin2", name: "L. Abeysekara", fullName: "Lahiru Abeysekara", email: "l.abeysekara@company.example", role: "admin", dept: "IT", status: "Active", lastSignIn: "2026-11-07T16:40" },
    { id: "u-legal2", name: "M. Wickramasinghe", fullName: "Malini Wickramasinghe", email: "m.wickramasinghe@company.example", role: "legal", dept: "Legal", status: "Active", lastSignIn: "2026-11-10T09:05" },
    { id: "u-legal3", name: "J. Tan", fullName: "Jun Tan", email: "j.tan@company.example", role: "legal", dept: "Legal", status: "Active", lastSignIn: "2026-11-08T11:15" },
    { id: "p-procurement", name: "D. Fonseka", fullName: "Dilshan Fonseka", email: "d.fonseka@company.example", role: "business", dept: "Procurement", status: "Active", lastSignIn: "2026-11-10T09:20" },
    { id: "p-finance", name: "H. Kumara", fullName: "Harsha Kumara", email: "h.kumara@company.example", role: "business", dept: "Finance", status: "Active", lastSignIn: "2026-11-09T15:44" },
    { id: "p-engineering", name: "T. Bandara", fullName: "Tharindu Bandara", email: "t.bandara@company.example", role: "business", dept: "Engineering", status: "Active", lastSignIn: "2026-11-06T10:12" },
    { id: "p-records", name: "P. Senanayake", fullName: "Priyanka Senanayake", email: "p.senanayake@company.example", role: "business", dept: "Records", status: "Active", lastSignIn: "2026-11-10T08:16" },
    { id: "p-hr", name: "C. de Mel", fullName: "Chandani de Mel", email: "c.demel@company.example", role: "readonly", dept: "HR", status: "Active", lastSignIn: "2026-10-29T14:03" },
    { id: "u-ro2", name: "S. Peiris", fullName: "Shehan Peiris", email: "s.peiris@company.example", role: "readonly", dept: "Engineering", status: "Active", lastSignIn: "2026-11-04T09:30" },
    { id: "u-bus3", name: "F. Hameed", fullName: "Fathima Hameed", email: "f.hameed@company.example", role: "business", dept: "Commercial", status: "Active", lastSignIn: "2026-11-10T09:41" },
    { id: "u-left", name: "V. Ranasinghe", fullName: "Vihanga Ranasinghe", email: "v.ranasinghe@company.example", role: "legal", dept: "Legal", status: "Deactivated", lastSignIn: "2026-10-31T17:55", note: "Left the company on 31 Oct 2026. Deactivated by K. Dias the same day." }
  ];

  /* ---------- permission matrix ---------- */
  var roleCols = ["legal", "owner", "reviewer", "compliance", "cosec", "admin", "auditor", "business", "readonly"];
  var perms = [
    { key: "ask", label: "Ask the assistant", v: { legal: true, owner: true, reviewer: true, compliance: true, cosec: true, admin: false, auditor: false, business: true, readonly: false },
      locked: { admin: "Administrators don't read business content", auditor: "Auditors are read only on the audit log" } },
    { key: "upload", label: "Upload and classify documents", v: { legal: true, owner: true, reviewer: false, compliance: true, cosec: true, admin: false, auditor: false, business: "Own department", readonly: false } },
    { key: "class", label: "Confirm data classes", v: { legal: false, owner: true, reviewer: false, compliance: false, cosec: "Board material", admin: false, auditor: false, business: false, readonly: false },
      locked: { admin: "Data classes are a business decision" } },
    { key: "release", label: "Approve release to a managed model", v: { legal: false, owner: true, reviewer: false, compliance: false, cosec: false, admin: false, auditor: false, business: false, readonly: false },
      locked: { legal: "Requesters can't approve their own release", admin: "Release is decided by the data owner" } },
    { key: "review", label: "Confirm or return AI drafts", v: { legal: false, owner: false, reviewer: true, compliance: false, cosec: false, admin: false, auditor: false, business: false, readonly: false } },
    { key: "records", label: "Archive and manage records", v: { legal: true, owner: true, reviewer: "Archive only", compliance: true, cosec: true, admin: false, auditor: false, business: false, readonly: false } },
    { key: "retention", label: "Set retention, holds and disposal", v: { legal: "With approval", owner: false, reviewer: false, compliance: "With approval", cosec: "With approval", admin: false, auditor: false, business: false, readonly: false } },
    { key: "screen", label: "Adjudicate screening hits", phase: 2, v: { legal: false, owner: false, reviewer: false, compliance: true, cosec: false, admin: false, auditor: false, business: false, readonly: false } },
    { key: "board", label: "Build board packs", phase: 2, v: { legal: false, owner: false, reviewer: false, compliance: false, cosec: true, admin: false, auditor: false, business: false, readonly: false } },
    { key: "models", label: "Manage models and routing", v: { legal: false, owner: false, reviewer: false, compliance: false, cosec: false, admin: true, auditor: false, business: false, readonly: false } },
    { key: "masking", label: "Manage masking rules", v: { legal: false, owner: "Approves changes", reviewer: false, compliance: false, cosec: false, admin: true, auditor: false, business: false, readonly: false } },
    { key: "users", label: "Manage users and roles", v: { legal: false, owner: false, reviewer: false, compliance: false, cosec: false, admin: "Not own account", auditor: false, business: false, readonly: false },
      locked: { admin: "Nobody can change their own rights" } },
    { key: "content", label: "Read business content", v: { legal: "Up to Sensitive", owner: "Up to Confidential", reviewer: "Up to Sensitive", compliance: "Up to Sensitive", cosec: "Up to Confidential", admin: false, auditor: false, business: "Internal, own department", readonly: "Internal" },
      locked: { admin: "Configuration only. Fixed by policy", auditor: "Audit log only. Fixed by policy" } },
    { key: "audit", label: "Search and export the audit log", v: { legal: false, owner: "Own releases", reviewer: false, compliance: false, cosec: false, admin: "Search only", auditor: true, business: false, readonly: false } },
    { key: "export", label: "Export reports", v: { legal: true, owner: true, reviewer: true, compliance: true, cosec: true, admin: false, auditor: "Audit reports", business: "Own department", readonly: false } }
  ];

  /* ---------- masking rules ---------- */
  var ruleSets = [
    { v: "1.5", status: "Draft", from: null, until: null, by: "K. Dias", approvedBy: null, note: "Adds vessel and voyage numbers. Better Sinhala name detection. In testing against 1,200 sample passages." },
    { v: "1.4", status: "Active", from: "2026-10-15", until: null, by: "K. Dias", approvedBy: "S. Silva", note: "Adds customer IDs from the commercial system. Contract number patterns for 4 new counterparties." },
    { v: "1.3", status: "Superseded", from: "2026-07-01", until: "2026-10-14", by: "L. Abeysekara", approvedBy: "S. Silva", note: "Chinese company names through HanLP." }
  ];
  var maskRules = [
    { id: "MR-01", type: "Company name", detector: "Presidio and company list, HanLP for Chinese", method: "placeholder", sample: "Northwind Crane Services (Pvt) Ltd", out: "[PARTY-B]", langs: ["EN", "ZH"], since: "1.0", precision: 98.9, recall: 97.6, status: "Active" },
    { id: "MR-02", type: "Personal name", detector: "Presidio, HanLP, Sinhala name list", method: "placeholder", sample: "Ruwan Jayasinghe", out: "[PERSON-1]", langs: ["EN", "ZH", "SI"], since: "1.0", precision: 96.4, recall: 95.1, status: "Active", draftNote: "v1.5 adds 3,400 Sinhala names. Recall in testing 97.8%." },
    { id: "MR-03", type: "Contact details", detector: "Patterns for phone numbers and email", method: "delete", sample: "+94 11 000 1234", out: "[removed]", langs: ["All"], since: "1.0", precision: 99.6, recall: 99.2, status: "Active" },
    { id: "MR-04", type: "Identity number", detector: "Patterns for NIC (old and new) and passport numbers", method: "mask", sample: "198512345678", out: "████", langs: ["All"], since: "1.1", precision: 99.1, recall: 98.7, status: "Active" },
    { id: "MR-05", type: "Bank account", detector: "Patterns for account numbers, IBAN and SWIFT", method: "placeholder", sample: "0081-2245-7710", out: "[BANK-ACCOUNT-1]", langs: ["All"], since: "1.0", precision: 99.4, recall: 99.0, status: "Active" },
    { id: "MR-06", type: "Contract number", detector: "Patterns per counterparty, from the contract register", method: "placeholder", sample: "NCS/CICT/2024/051", out: "[CONTRACT-1]", langs: ["All"], since: "1.2", precision: 99.8, recall: 96.3, status: "Active" },
    { id: "MR-07", type: "Transaction price", detector: "Amounts with a currency, near price words", method: "range", sample: "USD 1,480,000", out: "USD 1-2 million", langs: ["EN", "ZH"], since: "1.0", precision: 97.2, recall: 98.4, status: "Active" },
    { id: "MR-08", type: "Payment details", detector: "Card numbers, cheque and transfer references", method: "mask", sample: "TT ref 77120034", out: "████", langs: ["All"], since: "1.2", precision: 98.0, recall: 97.1, status: "Active" },
    { id: "MR-09", type: "Address", detector: "Presidio address model", method: "placeholder", sample: "No. 12, Harbour Road, Colombo 15", out: "[ADDRESS-1]", langs: ["EN"], since: "1.1", precision: 93.5, recall: 90.2, status: "Active" },
    { id: "MR-10", type: "Customer ID", detector: "Customer codes from the commercial system", method: "placeholder", sample: "CUST-00417", out: "[CUSTOMER-1]", langs: ["All"], since: "1.4", precision: 100, recall: 99.5, status: "Active" },
    { id: "MR-11", type: "Vessel and voyage number", detector: "Vessel names list and voyage patterns", method: "placeholder", sample: "MV Coral Star voyage 214E", out: "[VESSEL-1]", langs: ["EN"], since: "1.5", precision: 95.0, recall: 92.8, status: "Draft" }
  ];
  var testSample = "Agreement NCS/CICT/2024/051 with Northwind Crane Services (Pvt) Ltd. Price USD 1,480,000, paid to account 0081-2245-7710.\n" +
    "Contact Ruwan Jayasinghe on +94 11 000 1234 or r.jayasinghe@northwind.example. NIC 198512345678. Customer CUST-00417.\n" +
    "对方联系人：王伟，电话 +94 11 000 5678。";
  var knownNames = ["Ruwan Jayasinghe", "王伟", "Nadeesha Perera", "Li Wei", "Sanjeewa Silva"];
  var knownCompanies = ["Northwind Crane Services (Pvt) Ltd", "Northwind Crane Services", "Coral Bay Marine Supplies", "Meridian Freight Lines", "Sapphire Tug Services", "Eastgate IT Solutions", "Eastgate Shipping Agency",
    "Harbourline Logistics", "Bluewater Security Services", "Greenfield Facility Management", "北风起重服务有限公司"];
  var maskingOps = [
    { at: "2026-11-10T09:55", by: "legal", item: "DOC-8807", rules: "1.4", found: "2 types, 5 places", review: "Checked by N. Perera", dest: "Qwen on Bedrock (REL-0417)" },
    { at: "2026-11-09T16:38", by: "legal", item: "DOC-8790", rules: "1.4", found: "No masking needed", review: "Not needed", dest: "Qwen (self-hosted)" },
    { at: "2026-11-06T13:58", by: "legal", item: "DOC-8741", rules: "1.4", found: "1 type, 6 places", review: "Checked by N. Perera", dest: "Claude on Bedrock (REL-0409)" },
    { at: "2026-11-03T10:11", by: "compliance", item: "DOC-8702", rules: "1.4", found: "4 types, 412 rows", review: "Checked by R. Fernando", dest: "Blocked: release rejected (REL-0402)" }
  ];

  /* ---------- models: extra details ---------- */
  var modelInfo = {
    "m-claude-br": { version: "Claude Sonnet, pinned 2026-09 release", region: "ap-south-1 (Mumbai), single-region profile", fallback: "m-qwen-br", calls: 2840, errors: 0.4,
      terms: { retention: "Bedrock does not store prompts or outputs", training: "Not used to train any model", deletion: "Nothing to delete. Call logs stay in the CICT VPC", provider: "Amazon Web Services, under the CICT account" } },
    "m-qwen-br": { version: "Qwen, pinned 2026-08 release", region: "ap-south-1 (Mumbai)", fallback: "m-qwen-sh", calls: 1960, errors: 0.6,
      terms: { retention: "Bedrock does not store prompts or outputs", training: "Not used to train any model", deletion: "Nothing to delete. Call logs stay in the CICT VPC", provider: "Amazon Web Services, under the CICT account" } },
    "m-deepseek-br": { version: "DeepSeek, pinned 2026-07 release", region: "ap-south-1 (Mumbai)", fallback: "m-qwen-br", calls: 640, errors: 3.8,
      terms: { retention: "Bedrock does not store prompts or outputs", training: "Not used to train any model", deletion: "Nothing to delete. Call logs stay in the CICT VPC", provider: "Amazon Web Services, under the CICT account" } },
    "m-kimi-br": { version: "Kimi, not configured", region: "ap-south-1 (Mumbai)", fallback: null, calls: 0, errors: 0,
      terms: { retention: "To be confirmed before approval", training: "To be confirmed before approval", deletion: "To be confirmed before approval", provider: "Amazon Web Services, under the CICT account" } },
    "m-qwen-sh": { version: "Qwen open weights, 72B, version pinned", region: "CICT VPC, 2 GPU nodes", fallback: "m-deepseek-sh", calls: 6120, errors: 0.2,
      terms: { retention: "Runs inside the CICT VPC. Nothing leaves it", training: "Never trained on CICT data", deletion: "Follows CICT log retention", provider: "Self-hosted with vLLM" } },
    "m-deepseek-sh": { version: "DeepSeek open weights, version pinned", region: "CICT VPC, standby node", fallback: null, calls: 0, errors: 0,
      terms: { retention: "Runs inside the CICT VPC. Nothing leaves it", training: "Never trained on CICT data", deletion: "Follows CICT log retention", provider: "Self-hosted with vLLM" } },
    "m-bge": { version: "BGE-M3 and BGE reranker", region: "CICT VPC", fallback: null, calls: 48200, errors: 0.0,
      terms: { retention: "Runs inside the CICT VPC", training: "Never trained on CICT data", deletion: "Follows CICT log retention", provider: "Self-hosted" } },
    "m-detect": { version: "Presidio, HanLP and custom rules, rule set 1.4", region: "CICT VPC", fallback: null, calls: 11240, errors: 0.0,
      terms: { retention: "Runs inside the CICT VPC", training: "Never trained on CICT data", deletion: "Follows CICT log retention", provider: "Self-hosted" } }
  };
  var dailyCost = { "m-claude-br": [38, 41, 22, 18, 52, 61, 58, 49, 63, 60], "m-qwen-br": [24, 30, 12, 10, 33, 41, 38, 35, 44, 43], "m-deepseek-br": [15, 18, 9, 7, 22, 25, 24, 21, 26, 21], "m-qwen-sh": [124, 124, 124, 124, 124, 124, 124, 124, 124, 124] };

  /* ---------- health ---------- */
  var services = [
    { id: "web", name: "Web application", status: "green", metric: "99.96%", metricLabel: "Available this month", unit: "ms", series: series(3, 24, 190, 60), target: "Under 400 ms", detail: "3 web nodes behind the load balancer. Response time p95 230 ms." },
    { id: "sso", name: "Sign-in (single sign-on)", status: "green", metric: "100%", metricLabel: "Sign-ins working", unit: "ms", series: series(5, 24, 420, 90), target: "Under 1 s", detail: "Keycloak linked to the CICT directory. 212 sign-ins today." },
    { id: "gateway", name: "Model gateway", status: "amber", metric: "8.2 s", metricLabel: "DeepSeek on Bedrock, p95", unit: "s", series: series(7, 24, 4, 1.5, 0.18), target: "Under 4 s", incident: "INC-031",
      detail: "DeepSeek on Bedrock responds slowly since 08:40. Other models are normal. Policy comparison tasks queue and retry." },
    { id: "gpu", name: "Self-hosted models (GPU)", status: "green", metric: "71%", metricLabel: "GPU use, 2 of 2 nodes up", unit: "%", series: series(11, 24, 68, 20), target: "Under 85%", detail: "vLLM on 2 GPU nodes. Qwen live, DeepSeek on standby." },
    { id: "masking", name: "Masking service", status: "green", metric: "0.6 s", metricLabel: "Average per document", unit: "s", series: series(13, 24, 0.6, 0.2), target: "Under 2 s", detail: "Rule set 1.4. 186 documents checked today, 3 flagged for a manual check." },
    { id: "ocr", name: "OCR and document parsing", status: "green", metric: "3", metricLabel: "Jobs in the queue", unit: "jobs", series: series(17, 24, 6, 8), target: "Under 50 jobs", detail: "Docling, Tika and PaddleOCR. Tesseract for Sinhala scans." },
    { id: "search", name: "Search index", status: "green", metric: "412,880", metricLabel: "Passages indexed", unit: "ms", series: series(19, 24, 120, 40), target: "Under 300 ms", detail: "OpenSearch. Rebuilt at 02:00. Import IMP-0007 added 21,480 passages." },
    { id: "email", name: "Email notifications", status: "red", metric: "38", metricLabel: "Emails waiting", unit: "queued", series: series(23, 24, 2, 2, 1.6), target: "Under 10 queued", incident: "INC-032",
      detail: "The mail relay has rejected messages since 09:52. In-app notifications are not affected." },
    { id: "jobs", name: "Job queue", status: "green", metric: "14", metricLabel: "Jobs running", unit: "jobs", series: series(29, 24, 12, 10), target: "Under 200 jobs", detail: "Reminders, imports and analysis tasks. No failed jobs in 24 hours." },
    { id: "backup", name: "Backups", status: "green", metric: "02:15", metricLabel: "Last backup today", unit: "min", series: series(31, 24, 22, 6), target: "Daily", detail: "Encrypted with AWS KMS. Last restore test on 1 Nov 2026 passed in 42 minutes." },
    { id: "sanctions", name: "Sanctions list sync", status: "green", phase: 2, metric: "06:00", metricLabel: "Last refresh", unit: "min", series: series(37, 24, 4, 2), target: "Daily", detail: "OFAC and EU lists through OpenSanctions (self-hosted)." },
    { id: "regsrc", name: "Regulatory source checks", status: "amber", phase: 2, metric: "13 of 14", metricLabel: "Sources reached today", unit: "sources", series: series(41, 24, 14, 1), target: "All sources", detail: "One official gazette site did not respond at 06:00. Retried at 07:00 and 08:00. Shown as failed, not hidden." }
  ];
  var incidents = [
    { id: "INC-032", service: "email", title: "Email relay rejecting messages", opened: "2026-11-10T09:52", status: "Open", severity: "High", notified: ["K. Dias", "L. Abeysekara"] },
    { id: "INC-031", service: "gateway", title: "DeepSeek on Bedrock slow", opened: "2026-11-10T08:40", status: "Open", severity: "Medium", notified: ["K. Dias"] },
    { id: "INC-030", service: "ocr", title: "OCR queue backlog during import IMP-0007", opened: "2026-11-09T23:05", closed: "2026-11-10T03:20", status: "Resolved", severity: "Low", notified: ["K. Dias"] }
  ];
  var maintenance = { version: "1.8.0", window: "Sat 15 Nov 2026, 22:00 to 23:30", impact: "Assistant and imports paused. Records search stays available.", rollback: "Tested on 12 Nov in the test environment. Rollback takes about 15 minutes." };

  /* ---------- audit history before this week (adds to the shared seed) ---------- */
  var auditExtra = [
    { id: "AU-0989", at: "2026-11-08T17:40", actorId: "auditor", action: "Export", item: "Audit log", detail: "Excel, release approvals, October", dataClass: null },
    { id: "AU-0988", at: "2026-11-08T11:20", actorId: "cosec", action: "Material access", item: "REC-2025-0233", detail: "Viewed pages 1 to 6", dataClass: "Confidential" },
    { id: "AU-0987", at: "2026-11-07T16:02", actorId: "admin", action: "Model setting changed", item: "m-deepseek-br", detail: "Timeout raised from 20 s to 30 s", dataClass: null },
    { id: "AU-0986", at: "2026-11-07T10:44", actorId: "legal", action: "Model call", item: "TSK-2240", detail: "Qwen (self-hosted), unmasked, 4 passages", dataClass: "Sensitive" },
    { id: "AU-0985", at: "2026-11-06T09:12", actorId: "owner", action: "Data class confirmed", item: "UP-3288", detail: "Berth services rate notes confirmed as Sensitive", dataClass: "Sensitive" },
    { id: "AU-0984", at: "2026-11-05T15:30", actorId: "system", action: "Sign-in failed", item: "Web", detail: "3 failed attempts, account locked for 15 minutes (j.tan)", dataClass: null },
    { id: "AU-0983", at: "2026-11-05T11:05", actorId: "reviewer", action: "Review returned", item: "REV-0199", detail: "Returned with comments: cite the 2025 tariff, not 2023", dataClass: "Internal" },
    { id: "AU-0982", at: "2026-11-04T09:15", actorId: "admin", action: "Knowledge base update", item: "KB-TERM", detail: "Termbase 1.6: 42 terms added", dataClass: "Internal" },
    { id: "AU-0981", at: "2026-11-03T23:42", actorId: "system", action: "Import finished", item: "IMP-0006", detail: "496 imported, 0 failed, 2 duplicates", dataClass: "Confidential" },
    { id: "AU-0980", at: "2026-11-03T14:10", actorId: "legal", action: "Upload", item: "DOC-8698", detail: "Services agreement draft, classified Internal", dataClass: "Internal" },
    { id: "AU-0979", at: "2026-11-02T10:00", actorId: "admin", action: "Deletion", item: "Test account test.admin", detail: "Default test account removed before go-live", dataClass: null },
    { id: "AU-0978", at: "2026-10-31T17:58", actorId: "admin", action: "Permission change", item: "User v.ranasinghe", detail: "Account deactivated: left the company", dataClass: null },
    { id: "AU-0977", at: "2026-10-30T09:30", actorId: "auditor", action: "Material access", item: "Audit log", detail: "Search: release approvals, 1 to 30 Oct", dataClass: null },
    { id: "AU-0976", at: "2026-10-28T19:55", actorId: "system", action: "Import finished", item: "IMP-0005", detail: "310 imported, 0 failed, 2 duplicates", dataClass: "Internal" },
    { id: "AU-0975", at: "2026-10-22T15:00", actorId: "p-records", action: "Deletion", item: "REC-2014-0031", detail: "Disposal approved by Head of Legal. Certificate DC-2026-019", dataClass: "Internal" },
    { id: "AU-0974", at: "2026-10-15T08:00", actorId: "admin", action: "Masking rules published", item: "Rule set 1.4", detail: "Approved by S. Silva. Adds customer IDs", dataClass: null },
    { id: "AU-0973", at: "2026-10-14T16:20", actorId: "owner", action: "Masking rules approved", item: "Rule set 1.4", detail: "Tested on 1,050 passages, recall 98.1%", dataClass: null }
  ];

  D.adminArea = {
    users: users, roleCols: roleCols, perms: perms,
    ruleSets: ruleSets, maskRules: maskRules, testSample: testSample, knownNames: knownNames, knownCompanies: knownCompanies, maskingOps: maskingOps,
    modelInfo: modelInfo, dailyCost: dailyCost,
    services: services, incidents: incidents, maintenance: maintenance,
    auditExtra: auditExtra,
    series: series
  };
})();
