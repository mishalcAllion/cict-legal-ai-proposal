/* Shared mock data for the CICT Legal & Compliance Assistant concept prototype.
   Every name, company, document and figure here is a fictional sample.
   Screen areas add their own data in app/data/<area>.js (see CONVENTIONS.md). */
window.APP_DATA = (function () {
  "use strict";

  var today = "2026-11-10";

  /* ---------- people and personas ---------- */
  var personas = [
    { id: "legal", name: "N. Perera", fullName: "Nadeesha Perera", role: "Legal officer", dept: "Legal", initials: "NP", color: "#1668dc",
      access: "Up to Sensitive", blurb: "Asks the assistant, reviews contracts, drafts and requests release of masked material." },
    { id: "owner", name: "S. Silva", fullName: "Sanjeewa Silva", role: "Data owner", dept: "Commercial", initials: "SS", color: "#d46b08",
      access: "Up to Confidential", blurb: "Confirms data classes and approves or rejects release of masked material to a managed model." },
    { id: "reviewer", name: "Li Wei", fullName: "Li Wei", role: "Specialist reviewer", dept: "Legal (headquarters liaison)", initials: "LW", color: "#389e0d",
      access: "Up to Sensitive", blurb: "Confirms or returns AI drafts. Nothing counts as final until a reviewer confirms it." },
    { id: "compliance", name: "R. Fernando", fullName: "Rashmi Fernando", role: "Compliance officer", dept: "Compliance and Risk", initials: "RF", color: "#c41d7f",
      access: "Up to Sensitive", blurb: "Adjudicates screening hits, follows up anomaly alerts and tracks remediation." },
    { id: "cosec", name: "A. Jayawardena", fullName: "Anura Jayawardena", role: "Company Secretary", dept: "Company Secretariat", initials: "AJ", color: "#531dab",
      access: "Up to Confidential", blurb: "Checks agenda submissions, prepares board packs and searches past meetings." },
    { id: "admin", name: "K. Dias", fullName: "Kasun Dias", role: "Administrator", dept: "IT", initials: "KD", color: "#08979c",
      access: "Configuration only", blurb: "Manages models, routing, knowledge sources, users, roles and service health." },
    { id: "auditor", name: "M. Rahman", fullName: "Mariam Rahman", role: "Auditor", dept: "Internal Audit", initials: "MR", color: "#595959",
      access: "Audit log, read only", blurb: "Searches and exports the audit log. Cannot change content or settings." }
  ];

  /* Other people who appear in records and tasks (not switchable personas). */
  var people = [
    { id: "p-procurement", name: "D. Fonseka", role: "Procurement manager", dept: "Procurement" },
    { id: "p-finance", name: "H. Kumara", role: "Finance controller", dept: "Finance" },
    { id: "p-engineering", name: "T. Bandara", role: "Engineering manager", dept: "Engineering" },
    { id: "p-records", name: "P. Senanayake", role: "Records officer", dept: "Records" },
    { id: "p-hr", name: "C. de Mel", role: "HR manager", dept: "HR" }
  ];

  /* Roles and permissions summary (Administration and role switcher). */
  var roles = [
    { key: "legal", role: "Legal officer", users: 18, dataAccess: "Up to Sensitive",
      can: ["Ask the assistant", "Upload and classify documents", "Request release of masked material", "Send drafts for review"],
      cannot: ["Approve own release requests", "Confirm own drafts"] },
    { key: "owner", role: "Data owner", users: 11, dataAccess: "Up to Confidential",
      can: ["Confirm data classes", "Approve or reject release requests", "See the exact outbound payload"],
      cannot: ["Lower a class without a recorded reason"] },
    { key: "reviewer", role: "Specialist reviewer", users: 9, dataAccess: "Up to Sensitive",
      can: ["Confirm or return AI drafts", "Edit drafts with tracked changes", "Archive confirmed results"],
      cannot: ["Review own requests"] },
    { key: "compliance", role: "Compliance officer", users: 6, dataAccess: "Up to Sensitive",
      can: ["Adjudicate screening hits", "Close anomaly alerts with a conclusion", "Manage remediation"],
      cannot: ["Mark an entity as sanctioned on a name match alone"] },
    { key: "cosec", role: "Company Secretary", users: 2, dataAccess: "Up to Confidential",
      can: ["Check agenda submissions", "Build board packs", "Search past meetings"],
      cannot: ["See meetings outside the access list"] },
    { key: "admin", role: "Administrator", users: 3, dataAccess: "Configuration only",
      can: ["Manage models and routing", "Manage knowledge sources", "Manage users and roles", "See service health"],
      cannot: ["Read business content", "Grant themselves extra rights"] },
    { key: "auditor", role: "Auditor", users: 2, dataAccess: "Audit log, read only",
      can: ["Search the audit log", "Export audit reports"],
      cannot: ["Change content or settings"] },
    { key: "business", role: "Business user", users: 64, dataAccess: "Internal, own department",
      can: ["Ask questions", "See results for own department"], cannot: ["Release material"] },
    { key: "readonly", role: "Read-only", users: 23, dataAccess: "Internal",
      can: ["Search and view within permissions"], cannot: ["Upload, edit or export"] }
  ];

  var dataClasses = [
    { key: "Public", desc: "Published laws, public standards, public company information", handling: "Bedrock or self-hosted. No release needed." },
    { key: "Internal", desc: "Internal policies, routine registers, working documents", handling: "Bedrock or self-hosted. Access by department and position." },
    { key: "Sensitive", desc: "Contract prices, customer and payment data, personal data", handling: "Bedrock only after masking and release by the data owner, or self-hosted unmasked." },
    { key: "Confidential", desc: "Strictly confidential material, major cases, board matters", handling: "Self-hosted only, never leaves the CICT VPC." }
  ];

  /* ---------- contracts ---------- */
  var contracts = [
    { id: "CON-2024-051", title: "Crane maintenance agreement", counterparty: "Northwind Crane Services (Pvt) Ltd", type: "Maintenance services",
      dept: "Engineering", ownerId: "legal", value: "USD 1-2 million", signed: "2024-04-12", start: "2024-03-01", end: "2027-03-31",
      status: "Active", risk: "Medium", dataClass: "Sensitive", renewal: "Renews for 3 years unless 90 days' notice", noticeBy: "2026-12-31",
      docId: "CON-2024-051", records: ["REC-2024-0140", "REC-2024-0141"],
      flags: ["Signed after work started", "Liability cap below checklist", "Renewal notice due 31 Dec 2026"],
      obligations: [
        { id: "OB-051-1", type: "Service", desc: "Quarterly preventive maintenance report for all 12 quay cranes", due: "2026-12-15", owner: "T. Bandara", status: "On track" },
        { id: "OB-051-2", type: "Payment", desc: "Quarterly instalment Q4 2026", due: "2026-12-20", owner: "H. Kumara", status: "Scheduled" },
        { id: "OB-051-3", type: "Service", desc: "Monthly uptime report against Schedule C service levels", due: "2026-11-05", owner: "T. Bandara", status: "Overdue" },
        { id: "OB-051-4", type: "Delivery", desc: "Renewed insurance certificate from the Contractor", due: "2026-10-31", owner: "N. Perera", status: "Missing evidence" }
      ] },
    { id: "CON-2025-087", title: "Marine spares supply agreement", counterparty: "Coral Bay Marine Supplies", type: "Supply",
      dept: "Procurement", ownerId: "legal", value: "USD 250-500k", signed: "2024-12-15", start: "2025-01-01", end: "2026-12-31",
      status: "Expiring soon", risk: "Low", dataClass: "Sensitive", renewal: "Ends on expiry. No automatic renewal", noticeBy: null,
      docId: null, records: ["REC-2025-0310"],
      flags: ["Payment milestone 20 Nov 2026", "Rebate paid above contract rate"],
      obligations: [
        { id: "OB-087-1", type: "Payment", desc: "Second payment milestone", due: "2026-11-20", owner: "H. Kumara", status: "Due soon" },
        { id: "OB-087-2", type: "Delivery", desc: "Spare parts batch 4 delivered to the workshop", due: "2026-11-30", owner: "D. Fonseka", status: "On track" }
      ] },
    { id: "CON-2025-102", title: "Shipping services agreement", counterparty: "Meridian Freight Lines", type: "Shipping services",
      dept: "Commercial", ownerId: "legal", value: "USD 500k-1m", signed: "2025-05-20", start: "2025-06-01", end: "2028-05-31",
      status: "Under review", risk: "High", dataClass: "Sensitive", renewal: "Renewal by written agreement", noticeBy: null,
      docId: null, records: ["REC-2024-0102", "REC-2025-0277"],
      flags: ["Due diligence draft", "Screening hit to verify", "Open cargo claim CASE-2026-014"],
      obligations: [
        { id: "OB-102-1", type: "Acceptance", desc: "Annual service review meeting", due: "2027-05-15", owner: "S. Silva", status: "Scheduled" },
        { id: "OB-102-2", type: "Payment", desc: "Payment to the account named in the contract", due: "2026-10-30", owner: "H. Kumara", status: "Discrepancy" }
      ] },
    { id: "CON-2026-009", title: "Harbour towage services", counterparty: "Sapphire Tug Services", type: "Marine services",
      dept: "Marine operations", ownerId: "legal", value: "USD 100-250k", signed: "2026-01-25", start: "2026-02-01", end: "2027-01-31",
      status: "Active", risk: "Low", dataClass: "Internal", renewal: "Option to extend 1 year", noticeBy: "2026-12-02",
      docId: null, records: ["REC-2026-0122"], flags: [],
      obligations: [
        { id: "OB-009-1", type: "Service", desc: "Monthly towage log", due: "2026-12-05", owner: "D. Fonseka", status: "On track" }
      ] },
    { id: "CON-2026-021", title: "Terminal software licence", counterparty: "Eastgate IT Solutions", type: "Software licence",
      dept: "IT", ownerId: "legal", value: "USD 50-100k", signed: "2026-03-10", start: "2026-03-15", end: "2029-03-14",
      status: "Active", risk: "Medium", dataClass: "Internal", renewal: "Renews every 3 years unless 60 days' notice", noticeBy: "2029-01-13",
      docId: null, records: ["REC-2026-0350"], flags: ["Renews automatically"],
      obligations: [
        { id: "OB-021-1", type: "Payment", desc: "Annual licence fee", due: "2027-03-15", owner: "H. Kumara", status: "Scheduled" }
      ] },
    { id: "CON-2024-033", title: "Berth services tariff agreement", counterparty: "Harbourline Logistics", type: "Commercial tariff",
      dept: "Commercial", ownerId: "owner", value: "USD 1-2 million", signed: "2024-01-20", start: "2024-02-01", end: "2027-01-31",
      status: "Active", risk: "Medium", dataClass: "Sensitive", renewal: "Renegotiated each term", noticeBy: "2026-11-02",
      docId: null, records: [], flags: ["Tariff waiver above contract limit"],
      obligations: [
        { id: "OB-033-1", type: "Payment", desc: "Quarterly volume rebate reconciliation", due: "2026-11-25", owner: "H. Kumara", status: "Due soon" }
      ] },
    { id: "CON-2026-030", title: "Security services agreement", counterparty: "Bluewater Security Services", type: "Services",
      dept: "Security", ownerId: "legal", value: "USD 250-500k", signed: null, start: "2026-12-01", end: "2028-11-30",
      status: "Draft", risk: "Medium", dataClass: "Internal", renewal: "To be agreed", noticeBy: null,
      docId: null, records: [], flags: ["Drafted from template v3", "Due diligence pending"],
      obligations: [] },
    { id: "CON-2023-014", title: "Cleaning and facility services", counterparty: "Greenfield Facility Management", type: "Services",
      dept: "Facilities", ownerId: "legal", value: "USD 50-100k", signed: "2023-05-25", start: "2023-06-01", end: "2026-05-31",
      status: "Expired", risk: "Low", dataClass: "Internal", renewal: "Ended on expiry", noticeBy: null,
      docId: null, records: ["REC-2023-0088"], flags: ["Final invoice not matched"],
      obligations: [
        { id: "OB-014-1", type: "Payment", desc: "Final invoice reconciliation", due: "2026-07-31", owner: "H. Kumara", status: "Overdue" }
      ] }
  ];

  var deadlines = [
    { id: "DL-01", contractId: "CON-2025-087", title: "Second payment milestone", date: "2026-11-20", ownerName: "H. Kumara", ownerId: "legal", kind: "Payment", phase: 1 },
    { id: "DL-02", contractId: "CON-2024-033", title: "Volume rebate reconciliation", date: "2026-11-25", ownerName: "H. Kumara", ownerId: "owner", kind: "Payment", phase: 1 },
    { id: "DL-03", contractId: "CON-2026-009", title: "Notice to extend towage services", date: "2026-12-02", ownerName: "N. Perera", ownerId: "legal", kind: "Notice", phase: 1 },
    { id: "DL-04", contractId: "CON-2024-051", title: "Quarterly maintenance report", date: "2026-12-15", ownerName: "T. Bandara", ownerId: "legal", kind: "Service", phase: 1 },
    { id: "DL-05", contractId: "CON-2024-051", title: "Notice to renew or end (90 days)", date: "2026-12-31", ownerName: "N. Perera", ownerId: "legal", kind: "Notice", phase: 1 },
    { id: "DL-06", contractId: "CON-2025-087", title: "Contract expiry", date: "2026-12-31", ownerName: "D. Fonseka", ownerId: "legal", kind: "Expiry", phase: 1 },
    { id: "DL-07", contractId: "CON-2026-009", title: "Contract expiry", date: "2027-01-31", ownerName: "D. Fonseka", ownerId: "legal", kind: "Expiry", phase: 1 },
    { id: "DL-08", contractId: "CON-2024-051", title: "Maintenance period ends", date: "2027-03-31", ownerName: "T. Bandara", ownerId: "legal", kind: "Expiry", phase: 1 },
    { id: "DL-09", contractId: null, title: "Hearing: CASE-2026-014, cargo damage claim", date: "2026-12-02", ownerName: "N. Perera", ownerId: "legal", kind: "Hearing", phase: 2 },
    { id: "DL-10", contractId: null, title: "Board meeting BRD-2026-04 papers due", date: "2026-11-19", ownerName: "A. Jayawardena", ownerId: "cosec", kind: "Board", phase: 2 },
    { id: "DL-11", contractId: null, title: "Remediation RM-2026-07 due", date: "2026-11-30", ownerName: "R. Fernando", ownerId: "compliance", kind: "Remediation", phase: 2 }
  ];

  /* ---------- records ---------- */
  var records = [
    { id: "REC-2024-0140", title: "Crane maintenance agreement, signed copy", category: "Contract", dept: "Legal", year: 2024, linked: ["CON-2024-051"], retention: "10 years after expiry", retainUntil: "2037-03-31", status: "Active", dataClass: "Sensitive", version: "Signed original", pages: 14, format: "PDF (scanned, OCR)", ownerName: "N. Perera" },
    { id: "REC-2024-0141", title: "Work order WO-118, crane maintenance start", category: "Work order", dept: "Engineering", year: 2024, linked: ["CON-2024-051"], retention: "7 years", retainUntil: "2031-03-01", status: "Active", dataClass: "Internal", version: "1", pages: 2, format: "PDF", ownerName: "T. Bandara" },
    { id: "REC-2025-0233", title: "Board minutes, Q3 2025 meeting", category: "Board", dept: "Company Secretariat", year: 2025, linked: ["BRD-2025-03"], retention: "Permanent", retainUntil: null, status: "Active", dataClass: "Confidential", version: "Approved", pages: 18, format: "PDF", ownerName: "A. Jayawardena" },
    { id: "REC-2024-0019", title: "Board minutes, Q1 2024 meeting", category: "Board", dept: "Company Secretariat", year: 2024, linked: ["BRD-2024-01"], retention: "Permanent", retainUntil: null, status: "Active", dataClass: "Confidential", version: "Approved", pages: 15, format: "PDF", ownerName: "A. Jayawardena" },
    { id: "REC-2024-0102", title: "Due diligence report: Meridian Freight Lines", category: "Due diligence", dept: "Legal", year: 2024, linked: ["CON-2025-102"], retention: "7 years", retainUntil: "2031-12-31", status: "Active", dataClass: "Sensitive", version: "2", pages: 9, format: "Word", ownerName: "N. Perera" },
    { id: "REC-2025-0277", title: "Survey report SR-221, container damage", category: "Legal case", dept: "Legal", year: 2025, linked: ["CON-2025-102", "CASE-2026-014"], retention: "7 years after case closes", retainUntil: null, status: "Active", dataClass: "Sensitive", version: "1", pages: 6, format: "PDF", ownerName: "N. Perera" },
    { id: "REC-2019-0057", title: "Cargo claim file, 2019", category: "Legal case", dept: "Legal", year: 2019, linked: ["CASE-2019-006"], retention: "7 years", retainUntil: "2026-09-30", status: "Disposal hold", hold: "Open related dispute CASE-2025-022", dataClass: "Sensitive", version: "Final", pages: 120, format: "PDF (scanned, OCR)", ownerName: "P. Senanayake" },
    { id: "REC-2016-0011", title: "Procurement policy v2.0", category: "Policy", dept: "Compliance", year: 2016, linked: ["POL-PRC"], retention: "10 years", retainUntil: "2026-12-31", status: "Retention review due", dataClass: "Internal", version: "2.0", pages: 22, format: "Word", ownerName: "P. Senanayake" },
    { id: "REC-2025-0310", title: "Marine spares supply agreement, signed copy", category: "Contract", dept: "Procurement", year: 2025, linked: ["CON-2025-087"], retention: "10 years after expiry", retainUntil: "2036-12-31", status: "Active", dataClass: "Sensitive", version: "Signed original", pages: 11, format: "PDF", ownerName: "D. Fonseka" },
    { id: "REC-2026-0122", title: "Harbour towage services agreement, signed copy", category: "Contract", dept: "Marine operations", year: 2026, linked: ["CON-2026-009"], retention: "10 years after expiry", retainUntil: "2037-01-31", status: "Active", dataClass: "Internal", version: "Signed original", pages: 8, format: "PDF", ownerName: "D. Fonseka" },
    { id: "REC-2026-0350", title: "Terminal software licence, signed copy", category: "Contract", dept: "IT", year: 2026, linked: ["CON-2026-021"], retention: "10 years after expiry", retainUntil: "2039-03-14", status: "Active", dataClass: "Internal", version: "Signed original", pages: 26, format: "PDF", ownerName: "K. Dias" },
    { id: "REC-2023-0088", title: "Cleaning and facility services agreement", category: "Contract", dept: "Facilities", year: 2023, linked: ["CON-2023-014"], retention: "7 years after expiry", retainUntil: "2033-05-31", status: "Active", dataClass: "Internal", version: "Signed original", pages: 10, format: "PDF", ownerName: "P. Senanayake" },
    { id: "REC-2026-0201", title: "Gifts and hospitality register 2025", category: "Compliance register", dept: "Compliance", year: 2026, linked: ["POL-GH"], retention: "7 years", retainUntil: "2033-01-31", status: "Active", dataClass: "Internal", version: "Closed for 2025", pages: 4, format: "Excel", ownerName: "R. Fernando" }
  ];

  /* ---------- knowledge base ---------- */
  var knowledge = [
    { id: "KB-LAW-PDPA", title: "Personal Data Protection Act, No. 9 of 2022", category: "Law", issuer: "Parliament of Sri Lanka", dataClass: "Public", langs: ["EN", "SI"], chunks: 412, ownerName: "N. Perera",
      versions: [{ v: "As enacted", effective: "2022-03-19", until: null, status: "In force", note: "Provisions come into force in stages. Answers cite the section and its start date." }] },
    { id: "KB-CMP", title: "Company Management Policies (CMP)", category: "Company policy", issuer: "Company", dataClass: "Internal", langs: ["EN", "ZH"], chunks: 688, ownerName: "A. Jayawardena",
      versions: [{ v: "2025.1", effective: "2025-01-01", until: null, status: "In force" }, { v: "2023.2", effective: "2023-07-01", until: "2024-12-31", status: "Superseded" }] },
    { id: "KB-HQ-ABP", title: "Anti-bribery policy (headquarters)", category: "Headquarters policy", issuer: "Headquarters", dataClass: "Internal", langs: ["ZH", "EN"], chunks: 96, ownerName: "R. Fernando",
      versions: [{ v: "2024", effective: "2024-07-01", until: null, status: "In force" }] },
    { id: "KB-POL-PRC", title: "Procurement policy", category: "Company policy", issuer: "Company", dataClass: "Internal", langs: ["EN"], chunks: 154, ownerName: "D. Fonseka",
      versions: [{ v: "3.3", effective: "2026-04-01", until: null, status: "In force" }, { v: "3.2", effective: "2023-01-01", until: "2026-03-31", status: "Superseded", note: "Still applies to contracts signed before 1 Apr 2026." }] },
    { id: "KB-POL-DOA", title: "Delegation of authority", category: "Company policy", issuer: "Company Secretariat", dataClass: "Internal", langs: ["EN", "ZH"], chunks: 61, ownerName: "A. Jayawardena",
      versions: [{ v: "2", effective: "2025-01-01", until: null, status: "In force" }] },
    { id: "KB-CHK-SVC", title: "Services contract checklist", category: "Review checklist", issuer: "Legal", dataClass: "Internal", langs: ["EN"], chunks: 38, ownerName: "N. Perera", docId: "CHK-SVC-2.1",
      versions: [{ v: "2.1", effective: "2026-01-01", until: null, status: "In force" }, { v: "2.0", effective: "2024-06-01", until: "2025-12-31", status: "Superseded" }] },
    { id: "KB-TPL-SVC", title: "Services agreement template", category: "Contract template", issuer: "Legal", dataClass: "Internal", langs: ["EN", "ZH"], chunks: 52, ownerName: "N. Perera",
      versions: [{ v: "3", effective: "2026-02-01", until: null, status: "In force" }, { v: "2", effective: "2023-09-01", until: "2026-01-31", status: "Superseded" }] },
    { id: "KB-AOA", title: "Articles of Association", category: "Constitutional document", issuer: "Company Secretariat", dataClass: "Internal", langs: ["EN"], chunks: 120, ownerName: "A. Jayawardena",
      versions: [{ v: "Amended 2021", effective: "2021-11-15", until: null, status: "In force" }] },
    { id: "KB-TERM", title: "Legal termbase (Chinese, English, Sinhala)", category: "Terminology", issuer: "Legal", dataClass: "Internal", langs: ["ZH", "EN", "SI"], chunks: 1840, ownerName: "Li Wei",
      versions: [{ v: "1.6", effective: "2026-10-01", until: null, status: "In force" }] },
    { id: "KB-SANC", title: "OFAC and EU sanctions lists", category: "External list", issuer: "Public sources, refreshed daily", dataClass: "Public", langs: ["EN"], chunks: 0, ownerName: "R. Fernando",
      versions: [{ v: "Refreshed 10 Nov 2026, 06:00", effective: "2026-11-10", until: null, status: "In force" }] }
  ];

  /* ---------- models and routing (Shashila's routing table) ---------- */
  var models = [
    { id: "m-claude-br", name: "Claude on Bedrock", host: "Bedrock", where: "Amazon Bedrock over PrivateLink, ap-south-1", classes: ["Public", "Internal", "Sensitive (masked and released)"],
      uses: ["Contract review", "Legal analysis", "Memos"], status: "Live", latency: "3.1 s", costMonth: 462, budget: 500 },
    { id: "m-qwen-br", name: "Qwen on Bedrock", host: "Bedrock", where: "Amazon Bedrock over PrivateLink, ap-south-1", classes: ["Public", "Internal", "Sensitive (masked and released)"],
      uses: ["Chinese drafting", "Translation drafts"], status: "Live", latency: "2.4 s", costMonth: 310, budget: 500 },
    { id: "m-deepseek-br", name: "DeepSeek on Bedrock", host: "Bedrock", where: "Amazon Bedrock over PrivateLink, ap-south-1", classes: ["Public", "Internal", "Sensitive (masked and released)"],
      uses: ["Policy comparison"], status: "Degraded", latency: "8.2 s", costMonth: 188, budget: 400 },
    { id: "m-kimi-br", name: "Kimi on Bedrock", host: "Bedrock", where: "Amazon Bedrock over PrivateLink, ap-south-1", classes: [],
      uses: [], status: "Not approved", latency: "", costMonth: 0, budget: 0 },
    { id: "m-qwen-sh", name: "Qwen (self-hosted)", host: "Self-hosted", where: "vLLM on GPU nodes inside the CICT VPC", classes: ["Public", "Internal", "Sensitive", "Confidential"],
      uses: ["Records Q&A", "Confidential reviews", "Board search"], status: "Live", latency: "4.6 s", costMonth: 1240, budget: 2000 },
    { id: "m-deepseek-sh", name: "DeepSeek (self-hosted)", host: "Self-hosted", where: "vLLM on GPU nodes inside the CICT VPC", classes: ["Public", "Internal", "Sensitive", "Confidential"],
      uses: ["Standby for Qwen (self-hosted)"], status: "Standby", latency: "5.0 s", costMonth: 0, budget: 0 },
    { id: "m-bge", name: "BGE-M3 embeddings and reranker", host: "Self-hosted", where: "Inside the CICT VPC", classes: ["All classes"],
      uses: ["Search in Chinese, English and Sinhala"], status: "Live", latency: "0.2 s", costMonth: 0, budget: 0 },
    { id: "m-detect", name: "Masking detector", host: "Self-hosted", where: "Inside the CICT VPC", classes: ["All classes"],
      uses: ["Sensitive data detection before any model call"], status: "Live", latency: "0.6 s", costMonth: 0, budget: 0 }
  ];
  var routing = [
    { cls: "Public", where: "Bedrock or self-hosted", models: ["m-claude-br", "m-qwen-br", "m-deepseek-br", "m-qwen-sh"], release: "Not needed", masking: "Not needed" },
    { cls: "Internal", where: "Bedrock or self-hosted", models: ["m-claude-br", "m-qwen-br", "m-deepseek-br", "m-qwen-sh"], release: "Not needed", masking: "Default rules" },
    { cls: "Sensitive", where: "Bedrock after masking and release by the data owner, or self-hosted unmasked", models: ["m-claude-br", "m-qwen-br", "m-qwen-sh"], release: "Data owner, for Bedrock only", masking: "Required for Bedrock" },
    { cls: "Confidential", where: "Self-hosted only", models: ["m-qwen-sh", "m-deepseek-sh"], release: "Not allowed outside the VPC", masking: "Optional" },
    { cls: "Embeddings and masking detection", where: "Self-hosted only", models: ["m-bge", "m-detect"], release: "Not applicable", masking: "Not applicable" }
  ];

  /* ---------- documents (DocViewer) ----------
     A document: { id, title, kind, totalPages, dataClass, pages: [{ n, clauses: [{ id, heading, text, note? }] }] }
     note: { kind: "tracked" | "warning" | "info", text } shows under the clause. */
  var documents = {
    "CON-2024-051": {
      id: "CON-2024-051", title: "Crane maintenance agreement (sample)", kind: "Contract", totalPages: 14, dataClass: "Sensitive",
      file: "Crane maintenance agreement (sample).docx", version: "Signed 12 Apr 2024",
      pages: [
        { n: 1, clauses: [
          { id: "1", heading: "1. Parties", text: "This Agreement is made on 12 April 2024 between Colombo International Container Terminals Ltd (\"the Company\") and Northwind Crane Services (Pvt) Ltd (\"the Contractor\"), contract no. NCS/CICT/2024/051." },
          { id: "2", heading: "2. Scope of services", text: "The Contractor shall provide preventive and corrective maintenance for the Company's twelve (12) ship-to-shore quay cranes, as described in Schedule A." }
        ] },
        { n: 2, clauses: [
          { id: "3.1", heading: "3.1 Term", text: "This Agreement starts on 1 March 2024 and ends on 31 March 2027, unless ended earlier under clause 12." },
          { id: "3.3", heading: "3.3 Renewal", text: "This Agreement shall renew automatically for a further period of three (3) years unless either party gives ninety (90) days' written notice before the end of the term." }
        ] },
        { n: 3, clauses: [
          { id: "5", heading: "5. Contract price", text: "The total contract price is USD 1,480,000, payable in quarterly instalments to the Contractor's account 0081-2245-7710 within thirty (30) days of a valid invoice." }
        ] },
        { n: 4, clauses: [
          { id: "7.1", heading: "7.1 Insurance", text: "The Contractor shall keep public liability insurance of at least USD 5,000,000 and give the Company a current certificate each year." },
          { id: "7.2", heading: "7.2 Liability", text: "The Contractor's total liability under this Agreement is capped at 10% of the contract price.",
            note: { kind: "tracked", text: "Tracked change by Ruwan Jayasinghe: \"Agreed to lower the cap from 100% to 10%.\"" } }
        ] },
        { n: 6, clauses: [
          { id: "9.1", heading: "9.1 Service levels", text: "The Contractor shall meet the service levels set out in Schedule C.",
            note: { kind: "warning", text: "Schedule C is not in the uploaded file." } }
        ] },
        { n: 7, clauses: [
          { id: "img7", heading: "Embedded image", text: "[Image: crane model plate]",
            note: { kind: "warning", text: "This image could not be read. It is flagged for a manual check, not skipped." } }
        ] },
        { n: 10, clauses: [
          { id: "14", heading: "14. Notices", text: "Notices to the Contractor go to Ruwan Jayasinghe, Contracts Manager, on +94 11 000 1234 or r.jayasinghe@northwind.example." }
        ] },
        { n: 11, clauses: [
          { id: "15", heading: "15. Disputes", text: "Disputes shall be referred to arbitration under the laws of Sri Lanka." }
        ] },
        { n: 14, clauses: [
          { id: "sig", heading: "Signature page", text: "Signed for and on behalf of the Company on 12 April 2024. Signed for and on behalf of the Contractor by Ruwan Jayasinghe, Contracts Manager, on 12 April 2024." }
        ] }
      ]
    },
    "CHK-SVC-2.1": {
      id: "CHK-SVC-2.1", title: "Services contract checklist v2.1", kind: "Review checklist", totalPages: 6, dataClass: "Internal", version: "2.1, in force since 1 Jan 2026",
      pages: [
        { n: 2, clauses: [
          { id: "item-2", heading: "Item 2. Term and renewal", text: "Automatic renewal must carry a notice period of at least 60 days, and a reminder must be set in the contract register." },
          { id: "item-4", heading: "Item 4. Liability", text: "For maintenance of critical equipment, the Contractor's liability cap must be at least 100% of the contract price. Lower caps need an approved exception." }
        ] },
        { n: 3, clauses: [
          { id: "item-7", heading: "Item 7. Service levels", text: "Service levels, response times and service credits must be attached as a schedule and referenced in the body." },
          { id: "item-9", heading: "Item 9. Dispute resolution", text: "Arbitration clauses must name the seat and the arbitration rules." }
        ] },
        { n: 5, clauses: [
          { id: "item-12", heading: "Item 12. Signing date", text: "Contracts must be signed before work starts. Late signing needs a reason recorded on the contract file." }
        ] }
      ]
    },
    "WO-118": {
      id: "WO-118", title: "Work order WO-118", kind: "Work order", totalPages: 2, dataClass: "Internal", version: "1",
      pages: [
        { n: 1, clauses: [
          { id: "start", heading: "Service start", text: "Crane maintenance services by Northwind Crane Services (Pvt) Ltd started on 1 March 2024 under interim instruction from Engineering." },
          { id: "approver", heading: "Approved by", text: "T. Bandara, Engineering manager, 28 February 2024." }
        ] }
      ]
    }
  };

  /* Sensitive entities found in CON-2024-051 (MaskingCompare, ApprovalCard payload). */
  var maskingEntities = {
    "CON-2024-051": [
      { id: "e-company", type: "Company name", text: "Colombo International Container Terminals Ltd", placeholder: "[PARTY-A]", method: "placeholder", count: 22 },
      { id: "e-contractor", type: "Company name", text: "Northwind Crane Services (Pvt) Ltd", placeholder: "[PARTY-B]", method: "placeholder", count: 14 },
      { id: "e-contractno", type: "Contract number", text: "NCS/CICT/2024/051", placeholder: "[CONTRACT-1]", method: "placeholder", count: 3 },
      { id: "e-price", type: "Transaction price", text: "USD 1,480,000", placeholder: "[AMOUNT-1]", range: "USD 1-2 million", method: "range", count: 2 },
      { id: "e-bank", type: "Bank account", text: "0081-2245-7710", placeholder: "[BANK-ACCOUNT-1]", method: "placeholder", count: 1 },
      { id: "e-person", type: "Personal name", text: "Ruwan Jayasinghe", placeholder: "[PERSON-1]", method: "placeholder", count: 3 },
      { id: "e-phone", type: "Contact details", text: "+94 11 000 1234", placeholder: "[PHONE-1]", method: "delete", count: 1 },
      { id: "e-email", type: "Contact details", text: "r.jayasinghe@northwind.example", placeholder: "[EMAIL-1]", method: "delete", count: 1 }
    ]
  };

  /* Contract review findings for CON-2024-051, shared by chat and contract review.
     Each finding cites { doc, clause, page }. */
  var reviewFindings = {
    "CON-2024-051": [
      { id: "F1", title: "Liability cap is well below the checklist minimum", severity: "High",
        fact: "Clause 7.2 caps the Contractor's total liability at 10% of the contract price. A tracked change shows it was lowered from 100%.",
        assessment: "The services contract checklist (v2.1, item 4) asks for at least 100% for maintenance of critical equipment.",
        action: "Restore the cap to 100%, or record an approved exception.",
        proposed: { before: "The Contractor's total liability under this Agreement is capped at 10% of the contract price.", after: "The Contractor's total liability under this Agreement is capped at 100% of the contract price." },
        cites: [{ doc: "CON-2024-051", clause: "7.2", page: 4 }, { doc: "CHK-SVC-2.1", clause: "item-4", page: 2 }] },
      { id: "F2", title: "Service levels can't be assessed", severity: "Not enough evidence",
        fact: "Clause 9.1 refers to service levels in Schedule C. Schedule C is not in the uploaded file.",
        assessment: "Uptime, response times and penalties can't be judged without it.",
        action: "Upload Schedule C and run the review again.",
        cites: [{ doc: "CON-2024-051", clause: "9.1", page: 6 }, { doc: "CHK-SVC-2.1", clause: "item-7", page: 3 }] },
      { id: "F3", title: "Signed after work started", severity: "Medium",
        fact: "The agreement was signed on 12 Apr 2024. Work order WO-118 shows services started on 1 Mar 2024.",
        assessment: "Work ran for about six weeks without a signed contract.",
        action: "Confirm the reason with Procurement and record it on the contract file.",
        cites: [{ doc: "CON-2024-051", clause: "sig", page: 14 }, { doc: "WO-118", clause: "start", page: 1 }, { doc: "CHK-SVC-2.1", clause: "item-12", page: 5 }] },
      { id: "F4", title: "Renews automatically unless notice is given", severity: "Medium",
        fact: "Clause 3.3 renews the agreement for 3 years unless either party gives 90 days' written notice.",
        assessment: "Missing the notice date commits the Company to 3 more years.",
        action: "Set a reminder for 31 Dec 2026, 90 days before expiry on 31 Mar 2027.",
        cites: [{ doc: "CON-2024-051", clause: "3.3", page: 2 }, { doc: "CON-2024-051", clause: "3.1", page: 2 }] },
      { id: "F5", title: "Arbitration seat not stated", severity: "Medium",
        fact: "Clause 15 chooses Sri Lankan law and arbitration but names no seat or rules.",
        assessment: "An unclear seat can slow down any dispute.",
        action: "Add the seat and the arbitration rules.",
        proposed: { before: "Disputes shall be referred to arbitration under the laws of Sri Lanka.", after: "Disputes shall be referred to arbitration seated in Colombo under the rules of the agreed arbitration centre, governed by the laws of Sri Lanka." },
        cites: [{ doc: "CON-2024-051", clause: "15", page: 11 }, { doc: "CHK-SVC-2.1", clause: "item-9", page: 3 }] }
    ]
  };

  /* ---------- workspace seeds ---------- */
  var tasks = [
    { id: "T-01", personaId: "legal", title: "Fix 12 failed entries in records import IMP-0007", kind: "Task", due: "2026-11-14", route: "records", params: { tab: "import" }, phase: 1 },
    { id: "T-02", personaId: "legal", title: "Upload Schedule C for CON-2024-051", kind: "Task", due: "2026-11-17", route: "contracts", params: { id: "CON-2024-051" }, phase: 1 },
    { id: "T-03", personaId: "legal", title: "Draft legal memo for CASE-2026-014", kind: "Task", due: "2026-11-21", route: "legal", params: { id: "CASE-2026-014" }, phase: 2 },
    { id: "T-04", personaId: "owner", title: "Confirm data class for 3 new uploads from Commercial", kind: "Task", due: "2026-11-11", route: "knowledge", params: {}, phase: 1 },
    { id: "T-05", personaId: "reviewer", title: "Update termbase entries for 违约金 and 仲裁", kind: "Task", due: "2026-11-18", route: "translation", params: { tab: "termbase" }, phase: 2 },
    { id: "T-06", personaId: "compliance", title: "Verify screening hit: Meridian Freight Lines", kind: "Task", due: "2026-11-12", route: "screening", params: { id: "SCR-0091" }, phase: 2 },
    { id: "T-07", personaId: "compliance", title: "Follow up rebate anomaly on CON-2025-087", kind: "Task", due: "2026-11-19", route: "compliance", params: { id: "ANM-0034" }, phase: 2 },
    { id: "T-08", personaId: "cosec", title: "Agenda item 4 returned: crane contract renewal", kind: "Task", due: "2026-11-19", route: "board", params: { id: "AG-2026-04-4" }, phase: 2 },
    { id: "T-09", personaId: "admin", title: "DeepSeek on Bedrock responding slowly", kind: "Alert", due: "2026-11-10", route: "admin", params: { tab: "health" }, phase: 1 },
    { id: "T-10", personaId: "admin", title: "Claude on Bedrock at 92% of monthly budget", kind: "Alert", due: "2026-11-10", route: "admin", params: { tab: "models" }, phase: 1 },
    { id: "T-11", personaId: "auditor", title: "Quarterly review of release approvals", kind: "Task", due: "2026-11-28", route: "admin", params: { tab: "audit" }, phase: 1 }
  ];

  /* Recent conversations shown on the workspace. The assistant screen owns the full threads
     and should use these ids. */
  var conversations = [
    { id: "CONV-101", personaId: "legal", title: "Notice period for the crane maintenance renewal", mode: "Ask", module: "Records", updated: "2026-11-10T09:12", phase: 1 },
    { id: "CONV-102", personaId: "legal", title: "Due diligence: Meridian Freight Lines", mode: "Ask", module: "Contracts", updated: "2026-11-08T15:40", phase: 1 },
    { id: "CONV-103", personaId: "legal", title: "Translate clause 12, Coral Bay supply agreement", mode: "Translate", module: "Legal affairs", updated: "2026-11-07T11:05", phase: 2 },
    { id: "CONV-104", personaId: "legal", title: "Gifts above LKR 5,000: what applies?", mode: "Check a policy", module: "Policies", updated: "2026-11-05T16:20", phase: 2 },
    { id: "CONV-105", personaId: "compliance", title: "Is Eastgate Shipping Agency on a sanctions list?", mode: "Ask", module: "Compliance", updated: "2026-11-10T08:30", phase: 2 },
    { id: "CONV-106", personaId: "cosec", title: "Past board decisions on crane maintenance", mode: "Ask", module: "Board affairs", updated: "2026-11-09T14:10", phase: 2 },
    { id: "CONV-107", personaId: "reviewer", title: "Termbase check: liquidated damages", mode: "Translate", module: "Legal affairs", updated: "2026-11-06T10:00", phase: 2 },
    { id: "CONV-108", personaId: "reviewer", title: "Checklist item 4: when is a lower cap allowed?", mode: "Check a policy", module: "Contracts", updated: "2026-11-09T11:30", phase: 1 },
    { id: "CONV-109", personaId: "owner", title: "Which Commercial uploads still need a data class?", mode: "Ask", module: "Knowledge base", updated: "2026-11-10T08:50", phase: 1 },
    { id: "CONV-110", personaId: "owner", title: "What was released to Bedrock last week?", mode: "Ask", module: "Administration", updated: "2026-11-07T17:05", phase: 1 },
    { id: "CONV-111", personaId: "admin", title: "Which models are approved for Sensitive data?", mode: "Ask", module: "Administration", updated: "2026-11-10T09:45", phase: 1 },
    { id: "CONV-112", personaId: "auditor", title: "Release approvals in October, by data owner", mode: "Ask", module: "Administration", updated: "2026-11-08T13:20", phase: 1 }
  ];

  /* ---------- store seeds (cross-role process) ---------- */
  var releaseRequests = [
    { id: "REL-0417", title: "Translate clause 12, Coral Bay supply agreement", requesterId: "legal", ownerId: "owner", status: "Pending",
      createdAt: "2026-11-10T09:58", dataClass: "Sensitive", modelId: "m-qwen-br", destination: "Qwen on Bedrock (PrivateLink, ap-south-1)",
      purpose: "Draft an English translation of a Chinese liability clause", ref: "CON-2025-087", source: { route: "assistant", params: { conversationId: "CONV-103" } }, phase: 2,
      payload: { question: "Translate clause 12 into English and flag unclear terms.",
        passages: [{ source: "[CONTRACT-2], clause 12", text: "第十二条 违约责任：如任何一方未履行本合同项下的义务，应向守约方支付合同总价百分之五（5%）的违约金。" }],
        attachments: [{ name: "Clause 12 extract (masked).docx", note: "1 page" }] },
      entities: [{ type: "Company name", original: "Coral Bay Marine Supplies", replacement: "[PARTY-B]", count: 4 }, { type: "Contract number", original: "CBM/2024/087", replacement: "[CONTRACT-2]", count: 1 }],
      unscanned: [] },
    { id: "REL-0409", title: "Summarise survey report SR-221", requesterId: "legal", ownerId: "owner", status: "Approved", decidedBy: "owner",
      createdAt: "2026-11-06T14:02", decidedAt: "2026-11-06T14:20", comment: "Approved. Masked text only.", dataClass: "Sensitive", modelId: "m-claude-br",
      destination: "Claude on Bedrock (PrivateLink, ap-south-1)", purpose: "Summary for the case file", ref: "REC-2025-0277", phase: 1,
      payload: { question: "Summarise the survey findings on the lashing failure.", passages: [{ source: "[REPORT-1], page 3", text: "Lashing on bay 14 had failed before arrival at the berth." }], attachments: [] },
      entities: [{ type: "Company name", original: "Meridian Freight Lines", replacement: "[PARTY-C]", count: 6 }], unscanned: [] },
    { id: "REL-0402", title: "Compare berth tariff waivers with payments", requesterId: "compliance", ownerId: "owner", status: "Rejected", decidedBy: "owner",
      createdAt: "2026-11-03T10:15", decidedAt: "2026-11-03T11:02", comment: "Payment data stays Confidential. Run it on the self-hosted model instead.", dataClass: "Confidential", modelId: "m-claude-br",
      destination: "Claude on Bedrock (PrivateLink, ap-south-1)", purpose: "Anomaly check", ref: "CON-2024-033", phase: 2,
      payload: { question: "List waivers above the contract limit.", passages: [], attachments: [{ name: "Payments Q3 2026 (masked).xlsx", note: "412 rows" }] },
      entities: [], unscanned: [] }
  ];

  var reviews = [
    { id: "REV-0206", title: "Due diligence report: Meridian Freight Lines", kind: "Due diligence", requesterId: "legal", reviewerId: "reviewer", status: "Pending",
      createdAt: "2026-11-09T16:45", ref: "CON-2025-102", dataClass: "Sensitive", modelName: "Qwen (self-hosted)", phase: 1, source: { route: "contracts", params: { id: "CON-2025-102", tab: "diligence" } },
      content: { summary: "Overall rating High (draft). One of two beneficial owners not verified, a possible sanctions name match and an expired operating licence.",
        sections: [{ heading: "Sanctions", text: "Name is similar to a list entry. Not a determination; verify by hand." }, { heading: "Licences", text: "Operating licence copy expired 30 Sep 2026." }] } },
    { id: "REV-0203", title: "Records answer: crane renewal notice date", kind: "Records answer", requesterId: "legal", reviewerId: "reviewer", status: "Confirmed",
      createdAt: "2026-11-04T10:10", decidedAt: "2026-11-04T15:32", decidedBy: "reviewer", comment: "Correct. Reminder already set.", ref: "CON-2024-051", dataClass: "Sensitive", modelName: "Qwen (self-hosted)", phase: 1,
      source: { route: "records", params: {} }, recordId: "REC-2024-0140",
      content: { summary: "Notice to renew or end is due by 31 Dec 2026 (clause 3.3, page 2).", sections: [] } },
    { id: "REV-0201", title: "Policy draft: Gifts and hospitality v4", kind: "Policy draft", requesterId: "compliance", reviewerId: "reviewer", status: "Pending",
      createdAt: "2026-11-02T09:00", ref: "POL-GH", dataClass: "Internal", modelName: "DeepSeek on Bedrock", phase: 2, source: { route: "policies", params: { id: "POL-GH" } },
      content: { summary: "Draft 4 lowers the declaration threshold to LKR 5,000 and adds prior approval for hospitality to public officials.", sections: [] } }
  ];

  var notifications = [
    { id: "N-001", to: ["owner"], at: "2026-11-10T09:58", kind: "approval", title: "Release request REL-0417 waiting", body: "N. Perera asks to send a masked clause to Qwen on Bedrock.", route: "approvals", params: { id: "REL-0417" }, phase: 2 },
    { id: "N-002", to: ["reviewer"], at: "2026-11-09T16:45", kind: "review", title: "Review waiting: due diligence, Meridian Freight Lines", body: "Sent by N. Perera.", route: "reviews", params: { id: "REV-0206" }, phase: 1 },
    { id: "N-003", to: ["legal"], at: "2026-11-10T08:15", kind: "info", title: "Records import IMP-0007 finished", body: "1,204 imported, 12 need fixing, 31 duplicates linked.", route: "records", params: { tab: "import" }, phase: 1 },
    { id: "N-004", to: ["legal"], at: "2026-11-10T07:00", kind: "deadline", title: "Payment milestone in 10 days", body: "CON-2025-087, Coral Bay Marine Supplies, due 20 Nov 2026.", route: "contracts", params: { id: "CON-2025-087" }, phase: 1 },
    { id: "N-005", to: ["legal", "compliance"], at: "2026-11-10T06:30", kind: "info", title: "Daily regulatory check done", body: "2 new updates, 1 source unreachable.", route: "regulatory", params: {}, phase: 2 },
    { id: "N-006", to: ["compliance"], at: "2026-11-10T06:00", kind: "info", title: "Sanctions lists refreshed", body: "OFAC and EU lists updated. 1 new possible match.", route: "screening", params: {}, phase: 2 },
    { id: "N-007", to: ["admin"], at: "2026-11-10T09:40", kind: "alert", title: "Model budget alert", body: "Claude on Bedrock has used 92% of its monthly budget.", route: "admin", params: { tab: "models" }, phase: 1 },
    { id: "N-008", to: ["cosec"], at: "2026-11-09T17:20", kind: "info", title: "Agenda item 4 returned to submitter", body: "Financial evaluation missing.", route: "board", params: {}, phase: 2 },
    { id: "N-009", to: ["auditor"], at: "2026-11-10T08:05", kind: "info", title: "Permission change recorded", body: "K. Dias changed the Specialist reviewer role.", route: "admin", params: { tab: "audit" }, phase: 1 }
  ];

  var audit = [
    { id: "AU-1001", at: "2026-11-10T09:58", actorId: "legal", action: "Release requested", item: "REL-0417", detail: "Masked clause to Qwen on Bedrock", dataClass: "Sensitive" },
    { id: "AU-1000", at: "2026-11-10T09:55", actorId: "legal", action: "Masking", item: "DOC-8807", detail: "Rules v1.4, 2 types, 0 manual checks", dataClass: "Sensitive" },
    { id: "AU-0999", at: "2026-11-10T09:15", actorId: "reviewer", action: "Export", item: "REC-2025-0233", detail: "PDF, within permissions", dataClass: "Confidential" },
    { id: "AU-0998", at: "2026-11-10T08:15", actorId: "system", action: "Import finished", item: "IMP-0007", detail: "1,204 imported, 12 failed, 31 duplicates", dataClass: "Internal" },
    { id: "AU-0997", at: "2026-11-10T08:02", actorId: "admin", action: "Permission change", item: "Role: Specialist reviewer", detail: "Added: confirm contract reviews", dataClass: null },
    { id: "AU-0996", at: "2026-11-10T07:48", actorId: "legal", action: "Sign-in", item: "Web", detail: "Single sign-on", dataClass: null },
    { id: "AU-0995", at: "2026-11-10T06:00", actorId: "system", action: "List refresh", item: "Sanctions lists", detail: "OFAC and EU", dataClass: "Public" },
    { id: "AU-0994", at: "2026-11-09T16:45", actorId: "legal", action: "Sent for review", item: "REV-0206", detail: "Due diligence report", dataClass: "Sensitive" },
    { id: "AU-0993", at: "2026-11-09T16:40", actorId: "legal", action: "Model call", item: "TSK-2287", detail: "Qwen (self-hosted), unmasked, 9 passages", dataClass: "Sensitive" },
    { id: "AU-0992", at: "2026-11-06T14:20", actorId: "owner", action: "Release approved", item: "REL-0409", detail: "Masked text to Claude on Bedrock", dataClass: "Sensitive" },
    { id: "AU-0991", at: "2026-11-04T15:32", actorId: "reviewer", action: "Review confirmed", item: "REV-0203", detail: "Records answer archived", dataClass: "Sensitive" },
    { id: "AU-0990", at: "2026-11-03T11:02", actorId: "owner", action: "Release rejected", item: "REL-0402", detail: "Confidential data, self-hosted only", dataClass: "Confidential" }
  ];

  return {
    today: today,
    personas: personas, people: people, roles: roles, dataClasses: dataClasses,
    contracts: contracts, deadlines: deadlines, records: records, knowledge: knowledge,
    models: models, routing: routing,
    documents: documents, maskingEntities: maskingEntities, reviewFindings: reviewFindings,
    tasks: tasks, conversations: conversations,
    seed: { releaseRequests: releaseRequests, reviews: reviews, notifications: notifications, audit: audit }
  };
})();
