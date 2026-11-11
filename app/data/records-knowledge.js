/* Mock data for screen area: records-knowledge (Records and Knowledge base).
   Every name, company, document and figure here is a fictional sample. See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, D = window.APP_DATA;

  /* ---------- extra archive records (appended to the shared list so the archive looks real) ---------- */
  var extraRecords = [
    { id: "REC-2025-0198", title: "Due diligence report: Sapphire Tug Services", category: "Due diligence", dept: "Legal", year: 2025, linked: ["CON-2026-009"], retention: "7 years", retainUntil: "2032-12-31", status: "Active", dataClass: "Sensitive", version: "Final", pages: 7, format: "Word", ownerName: "N. Perera" },
    { id: "REC-2026-0143", title: "Contract review: terminal software licence", category: "Contract review", dept: "Legal", year: 2026, linked: ["CON-2026-021"], retention: "10 years after expiry", retainUntil: "2039-03-14", status: "Active", dataClass: "Internal", version: "Confirmed by Li Wei", pages: 3, format: "PDF", ownerName: "N. Perera" },
    { id: "REC-2026-0088", title: "Board pack, Q1 2026 meeting", category: "Board", dept: "Company Secretariat", year: 2026, linked: ["BRD-2026-01"], retention: "Permanent", retainUntil: null, status: "Active", dataClass: "Confidential", version: "Issued", pages: 64, format: "PDF", ownerName: "A. Jayawardena" },
    { id: "REC-2022-0215", title: "Legal opinion: berth tariff waiver powers", category: "Legal opinion", dept: "Legal", year: 2022, linked: ["CON-2024-033"], retention: "10 years", retainUntil: "2032-08-31", status: "Active", dataClass: "Sensitive", version: "Final", pages: 5, format: "Word", ownerName: "N. Perera" },
    { id: "REC-2024-0233", title: "Legal opinion: data protection readiness", category: "Legal opinion", dept: "Legal", year: 2024, linked: ["KB-LAW-PDPA"], retention: "10 years", retainUntil: "2034-06-30", status: "Active", dataClass: "Internal", version: "Final", pages: 8, format: "Word", ownerName: "N. Perera" },
    { id: "REC-2023-0144", title: "Compliance check: gifts register 2022", category: "Compliance check", dept: "Compliance", year: 2023, linked: ["POL-GH"], retention: "7 years", retainUntil: "2030-03-31", status: "Active", dataClass: "Internal", version: "Closed", pages: 4, format: "Excel", ownerName: "R. Fernando" },
    { id: "REC-2024-0077", title: "Audit remediation: procurement approvals", category: "Audit remediation", dept: "Compliance", year: 2024, linked: ["RM-2024-03"], retention: "7 years", retainUntil: "2031-12-31", status: "Active", dataClass: "Internal", version: "Closed", pages: 6, format: "PDF", ownerName: "R. Fernando" },
    { id: "REC-2021-0032", title: "Towage services agreement 2021, signed copy", category: "Contract", dept: "Marine operations", year: 2021, linked: ["CON-2021-011"], retention: "10 years after expiry", retainUntil: "2033-01-31", status: "Active", dataClass: "Internal", version: "Signed original", pages: 9, format: "PDF (scanned, OCR)", ownerName: "D. Fonseka" },
    { id: "REC-2018-0049", title: "Stevedoring equipment lease, signed copy", category: "Contract", dept: "Engineering", year: 2018, linked: ["CON-2015-004"], retention: "7 years after expiry", retainUntil: "2026-12-15", status: "Retention review due", dataClass: "Internal", version: "Signed original", pages: 16, format: "PDF (scanned, OCR)", ownerName: "P. Senanayake" },
    { id: "REC-2017-0090", title: "Insurance claim file: quay crane 7 storm damage", category: "Legal case", dept: "Legal", year: 2017, linked: ["CASE-2017-003"], retention: "7 years after case closes", retainUntil: "2026-08-31", status: "Disposal hold", hold: "Insurer recovery action still open", dataClass: "Sensitive", version: "Final", pages: 88, format: "PDF (scanned, OCR)", ownerName: "P. Senanayake" },
    { id: "REC-2015-0120", title: "Port services tariff agreement 2015, signed copy", category: "Contract", dept: "Commercial", year: 2015, linked: ["CON-2015-009"], retention: "10 years after expiry", retainUntil: "2025-12-31", status: "Retention review due", dataClass: "Sensitive", version: "Signed original", pages: 21, format: "PDF (scanned, OCR)", ownerName: "P. Senanayake" },
    { id: "REC-2020-0061", title: "Anti-harassment policy v1", category: "Policy", dept: "HR", year: 2020, linked: ["POL-HR-04"], retention: "10 years", retainUntil: "2030-06-30", status: "Superseded", dataClass: "Internal", version: "1.0", pages: 12, format: "Word", ownerName: "C. de Mel" }
  ];
  var have = {};
  D.records.forEach(function (r) { have[r.id] = true; });
  var added = extraRecords.filter(function (r) { return !have[r.id]; });
  Array.prototype.push.apply(D.records, added);
  if (APP && APP.store && added.length) {
    var st = APP.store.getState();
    var inState = {};
    st.records.forEach(function (r) { inState[r.id] = true; });
    var missing = added.filter(function (r) { return !inState[r.id]; }).map(function (r) { return JSON.parse(JSON.stringify(r)); });
    if (missing.length) APP.store.setState({ records: st.records.concat(missing) });
  }

  /* ---------- per-record detail (summary, versions, access) ---------- */
  var details = {
    "REC-2024-0140": { doc: "CON-2024-051", summary: "Signed agreement with Northwind Crane Services for preventive and corrective maintenance of 12 quay cranes, 1 Mar 2024 to 31 Mar 2027. Renews for 3 years unless 90 days' notice is given.",
      versions: [
        { v: "Draft 3 (unsigned)", at: "2024-03-22T11:00", by: "N. Perera", note: "Liability cap tracked change, 100% to 10%" },
        { v: "Signed original", at: "2024-04-15T09:20", by: "P. Senanayake", note: "Scanned and OCR checked. Current version", current: true }
      ] },
    "REC-2024-0141": { doc: "WO-118", summary: "Interim work order from Engineering instructing Northwind Crane Services to start crane maintenance on 1 Mar 2024, before the agreement was signed." },
    "REC-2025-0233": { summary: "Approved minutes of the Q3 2025 board meeting, including the decision to renew the crane maintenance arrangement and the berth tariff review.", restrictedNote: "Board material. Access list: Company Secretariat and board members." },
    "REC-2024-0019": { summary: "Approved minutes of the Q1 2024 board meeting, including approval of the crane maintenance tender award.", restrictedNote: "Board material. Access list: Company Secretariat and board members." },
    "REC-2024-0102": { summary: "Counterparty due diligence on Meridian Freight Lines covering ownership, licences, litigation and sanctions. Updated in 2025 after the shipping services tender.",
      versions: [
        { v: "1", at: "2024-11-02T10:00", by: "N. Perera", note: "Initial report" },
        { v: "2", at: "2025-04-28T15:40", by: "N. Perera", note: "Ownership chart and licence copy added. Current version", current: true }
      ] },
    "REC-2025-0277": { doc: "SR-221", summary: "Independent survey of container damage on vessel arrival at berth 3. Lashing on bay 14 had failed before arrival. Supports the defence in the cargo damage claim." },
    "REC-2019-0057": { doc: "CLAIM-2019-006", summary: "Complete cargo claim file from 2019: claim letter, survey, correspondence and settlement. Retention ended 30 Sep 2026 but the file is held because a related dispute is still open." },
    "REC-2016-0011": { summary: "Procurement policy version 2.0, issued 2016 and replaced in 2019. Kept for audit trail. Retention ends 31 Dec 2026 and needs a review decision." },
    "REC-2025-0310": { summary: "Signed supply agreement with Coral Bay Marine Supplies for marine spare parts, 1 Jan 2025 to 31 Dec 2026." },
    "REC-2026-0122": { summary: "Signed towage services agreement with Sapphire Tug Services, 1 Feb 2026 to 31 Jan 2027, with an option to extend by one year." },
    "REC-2026-0350": { summary: "Signed software licence with Eastgate IT Solutions for the terminal operating software, 15 Mar 2026 to 14 Mar 2029. Renews every 3 years unless 60 days' notice is given." },
    "REC-2023-0088": { summary: "Signed cleaning and facility services agreement with Greenfield Facility Management. Expired 31 May 2026. Final invoice still to be matched." },
    "REC-2026-0201": { summary: "Gifts and hospitality register for 2025, closed on 31 Jan 2026. 46 declarations, 3 above the approval threshold, all approved." },
    "REC-2025-0198": { summary: "Due diligence on Sapphire Tug Services before the 2026 towage award. No sanctions matches, licences current, one minor labour dispute settled in 2023." },
    "REC-2026-0143": { summary: "Confirmed contract review of the Eastgate terminal software licence: automatic renewal flagged, data processing terms checked, no high findings." },
    "REC-2026-0088": { summary: "Board pack for the Q1 2026 meeting: 7 agenda items, financial statements and the crane maintenance performance report.", restrictedNote: "Board material. Access list: Company Secretariat and board members." },
    "REC-2022-0215": { summary: "Opinion on who may approve berth tariff waivers and up to what amount, under the delegation of authority then in force." },
    "REC-2024-0233": { summary: "Opinion on readiness for the Personal Data Protection Act, with a gap list for HR and customer data." },
    "REC-2023-0144": { summary: "Annual compliance check of the 2022 gifts register: two late declarations, both followed up." },
    "REC-2024-0077": { summary: "Remediation of an internal audit finding on procurement approvals: approval matrix updated, training given, closed March 2025." },
    "REC-2021-0032": { summary: "Earlier towage agreement with Sapphire Tug Services, 2021 to 2023. Replaced by the 2026 agreement." },
    "REC-2018-0049": { summary: "Lease of stevedoring equipment from Eastgate Equipment Leasing, 2015 to 2019. Retention ends 15 Dec 2026." },
    "REC-2017-0090": { doc: "CLAIM-2017-003", summary: "Insurance claim file for storm damage to quay crane 7 in 2017. Retention ended 31 Aug 2026; held while the insurer's recovery action is open." },
    "REC-2015-0120": { summary: "Port services tariff agreement from 2015 with Harbourline Logistics. Retention ended 31 Dec 2025. Disposal needs approval." },
    "REC-2020-0061": { summary: "First version of the anti-harassment policy, replaced by version 2 in 2024." }
  };

  /* Retention schedule (by category) */
  var retentionRules = [
    { id: "RR-01", category: "Contract", period: "10 years", trigger: "After the contract ends", end: "Review, then dispose", approver: "Head of Legal", records: 4120 },
    { id: "RR-02", category: "Work order", period: "7 years", trigger: "After issue", end: "Dispose", approver: "Records officer", records: 2210 },
    { id: "RR-03", category: "Due diligence", period: "7 years", trigger: "After the relationship ends", end: "Review, then dispose", approver: "Head of Legal", records: 640 },
    { id: "RR-04", category: "Legal case", period: "7 years", trigger: "After the case closes", end: "Review, then dispose", approver: "Head of Legal", records: 385 },
    { id: "RR-05", category: "Legal opinion", period: "10 years", trigger: "After issue", end: "Review", approver: "Head of Legal", records: 212 },
    { id: "RR-06", category: "Board", period: "Permanent", trigger: "None", end: "Keep", approver: "Company Secretary", records: 498 },
    { id: "RR-07", category: "Policy", period: "10 years", trigger: "After it is replaced", end: "Review, then dispose", approver: "Compliance officer", records: 304 },
    { id: "RR-08", category: "Compliance register", period: "7 years", trigger: "After the register closes", end: "Dispose", approver: "Compliance officer", records: 156 },
    { id: "RR-09", category: "Contract review", period: "10 years", trigger: "After the contract ends", end: "Review, then dispose", approver: "Head of Legal", records: 93 }
  ];

  /* ---------- documents for previews and citations ---------- */
  var docs = [
    { id: "SR-221", title: "Survey report SR-221, container damage", kind: "Survey report", totalPages: 6, dataClass: "Sensitive", version: "1, issued 18 Aug 2025",
      pages: [
        { n: 1, clauses: [{ id: "scope", heading: "1. Scope", text: "Survey of 6 containers found damaged on discharge from the vessel at berth 3 on 14 Aug 2025, on instruction from the terminal operator." }] },
        { n: 3, clauses: [
          { id: "f1", heading: "3.1 Lashing", text: "Lashing on bay 14 had failed before arrival at the berth. Two lashing rods were missing and one twist lock was found unlocked." },
          { id: "f2", heading: "3.2 Handling", text: "Crane and spreader logs show normal discharge speeds. No contact damage from terminal equipment was found." }
        ] },
        { n: 5, clauses: [{ id: "concl", heading: "5. Conclusion", text: "On the evidence seen, the damage was caused at sea by failed lashing and not by cargo handling at the terminal." }] }
      ] },
    { id: "CLAIM-2019-006", title: "Cargo claim file CASE-2019-006", kind: "Claim file", totalPages: 120, dataClass: "Sensitive", version: "Final",
      pages: [
        { n: 1, clauses: [{ id: "claim", heading: "Claim letter", text: "Claim for damage to 14 reefer containers during discharge in June 2019, value stated as USD 210,000." }] },
        { n: 96, clauses: [{ id: "settle", heading: "Settlement", text: "Settled on 12 Feb 2020 for USD 48,000 without admission of liability." }] },
        { n: 118, clauses: [{ id: "hold", heading: "Disposal hold notice", text: "Do not dispose. A related dispute, CASE-2025-022, raises the same reefer power failure. Hold placed by Legal on 2 Sep 2026 until that case closes." }] }
      ] },
    { id: "CLAIM-2017-003", title: "Insurance claim file, quay crane 7", kind: "Claim file", totalPages: 88, dataClass: "Sensitive", version: "Final",
      pages: [
        { n: 1, clauses: [{ id: "event", heading: "Incident", text: "Quay crane 7 was damaged by high winds on 3 Jun 2017. Repair cost recorded as USD 1.1 million." }] },
        { n: 85, clauses: [{ id: "hold", heading: "Disposal hold notice", text: "Do not dispose. The insurer's recovery action against the crane manufacturer is still open. Hold placed by Legal on 20 Aug 2026." }] }
      ] },
    { id: "KB-POL-PRC-3.3", title: "Procurement policy v3.3", kind: "Company policy", totalPages: 18, dataClass: "Internal", version: "3.3, in force since 1 Apr 2026",
      pages: [
        { n: 4, clauses: [
          { id: "4.2", heading: "4.2 Approval limits", text: "Contracts above USD 500,000 need approval by the Chief Executive Officer and a second director. Contracts above USD 1 million also need board approval." },
          { id: "4.3", heading: "4.3 Single source", text: "Single-source awards need a written reason approved by the Head of Procurement and the Head of Legal." }
        ] },
        { n: 7, clauses: [{ id: "6.1", heading: "6.1 Signing before work", text: "No work may start before the contract is signed. Exceptions need written approval from the Head of Legal and must be recorded on the contract file." }] }
      ] },
    { id: "KB-POL-PRC-3.2", title: "Procurement policy v3.2", kind: "Company policy", totalPages: 16, dataClass: "Internal", version: "3.2, in force 1 Jan 2023 to 31 Mar 2026",
      pages: [
        { n: 4, clauses: [
          { id: "4.2", heading: "4.2 Approval limits", text: "Contracts above USD 750,000 need approval by the Chief Executive Officer. Contracts above USD 2 million also need board approval." },
          { id: "4.3", heading: "4.3 Single source", text: "Single-source awards need a written reason approved by the Head of Procurement." }
        ] },
        { n: 6, clauses: [{ id: "6.1", heading: "6.1 Signing before work", text: "Work should not start before the contract is signed." }] }
      ] },
    { id: "KB-LAW-PDPA-DOC", title: "Personal Data Protection Act, No. 9 of 2022 (extract)", kind: "Law", totalPages: 42, dataClass: "Public", version: "As enacted",
      pages: [
        { n: 3, clauses: [{ id: "s2", heading: "Section 2. Application", text: "This Act applies to the processing of personal data wholly or partly within Sri Lanka, or by a controller or processor domiciled or ordinarily resident in Sri Lanka." }] },
        { n: 4, clauses: [{ id: "s5", heading: "Section 5. Obligations of controllers", text: "Every controller shall process personal data in accordance with the obligations in Part I, including lawful processing, purpose limitation and data minimisation." }] },
        { n: 41, clauses: [{ id: "s56", heading: "Commencement", text: "The provisions of this Act come into operation on dates appointed by the Minister by Order published in the Gazette.", note: { kind: "info", text: "Sections commence in stages. Answers cite the section and its start date." } }] }
      ] },
    { id: "KB-CMP-DOC", title: "Company Management Policies (CMP) 2025.1 (extract)", kind: "Company policy", totalPages: 140, dataClass: "Internal", version: "2025.1",
      pages: [
        { n: 12, clauses: [{ id: "3.4", heading: "3.4 Records and archiving", text: "Confirmed outcomes of legal, compliance and board work are archived in the records repository with a link to the originating matter." }] },
        { n: 31, clauses: [{ id: "7.2", heading: "7.2 Gifts and hospitality", text: "Gifts above LKR 5,000 must be declared in the register within 5 working days. Gifts to public officials need prior approval." }] }
      ] }
  ];
  if (APP && APP.registerDocument) docs.forEach(function (d) { APP.registerDocument(d); });

  /* ---------- Ask the archive: scripted answers ---------- */
  var askScripts = [
    { id: "crane-notice", keys: ["crane", "notice", "renew", "expire", "expiry"],
      q: "When does the crane maintenance agreement expire, and what notice do we need to give?",
      a: "The crane maintenance agreement with Northwind Crane Services expires on **31 Mar 2027** [1]. It renews automatically for a further 3 years unless either party gives 90 days' written notice [2], so notice must reach the Contractor by **31 Dec 2026**.\n\nThe signed copy is record REC-2024-0140, version \"Signed original\", signed on 12 Apr 2024 [3]. A reminder for 31 Dec 2026 is already set in the contract register.",
      cites: [{ doc: "CON-2024-051", clause: "3.1", page: 2 }, { doc: "CON-2024-051", clause: "3.3", page: 2 }, { doc: "CON-2024-051", clause: "sig", page: 14 }],
      dataClass: "Sensitive", searched: 14, excluded: 1, passages: 3,
      note: { type: "info", text: "Version note: a 2025 amendment exists as a draft only and was not used. Answers use confirmed versions unless you ask otherwise." },
      records: ["REC-2024-0140"] },
    { id: "survey", keys: ["survey", "lashing", "sr-221", "damage", "container"],
      q: "What did survey report SR-221 find about the container damage?",
      a: "The surveyor found that lashing on bay 14 had failed **before** the vessel arrived at the berth: two lashing rods were missing and one twist lock was unlocked [1]. Crane and spreader logs show normal discharge speeds and no contact damage from terminal equipment [2].\n\nThe report concludes that the damage was caused at sea and not by cargo handling at the terminal [3]. This supports the defence in the related cargo claim.",
      cites: [{ doc: "SR-221", clause: "f1", page: 3 }, { doc: "SR-221", clause: "f2", page: 3 }, { doc: "SR-221", clause: "concl", page: 5 }],
      dataClass: "Sensitive", searched: 9, excluded: 0, passages: 3, records: ["REC-2025-0277"] },
    { id: "holds", keys: ["hold", "disposal", "dispose", "destroy"],
      q: "Which records are on disposal hold, and why?",
      a: "Two records you can see are on disposal hold:\n\n- **REC-2019-0057**, cargo claim file 2019: held because a related dispute, CASE-2025-022, raises the same reefer power failure [1].\n- **REC-2017-0090**, insurance claim file for quay crane 7: held while the insurer's recovery action is still open [2].\n\nBoth have passed their retention date. Neither can be disposed of until the hold is released and the disposal is approved.",
      cites: [{ doc: "CLAIM-2019-006", clause: "hold", page: 118 }, { doc: "CLAIM-2017-003", clause: "hold", page: 85 }],
      dataClass: "Sensitive", searched: 26, excluded: 1, passages: 2, records: ["REC-2019-0057", "REC-2017-0090"] },
    { id: "work-start", keys: ["work start", "started", "signed after", "wo-118", "work order", "before signing", "before the agreement"],
      q: "Did crane maintenance start before the agreement was signed?",
      a: "Yes. Work order WO-118 shows that Northwind Crane Services started on **1 Mar 2024** under an interim instruction from Engineering [1]. The agreement was signed on **12 Apr 2024** [2], so work ran for about six weeks without a signed contract.\n\nProcurement policy 3.3 does not allow this without written approval from the Head of Legal [3]. Note that policy 3.2 applied at the time, and it only said work \"should not\" start before signing.",
      cites: [{ doc: "WO-118", clause: "start", page: 1 }, { doc: "CON-2024-051", clause: "sig", page: 14 }, { doc: "KB-POL-PRC-3.3", clause: "6.1", page: 7 }],
      dataClass: "Sensitive", searched: 14, excluded: 0, passages: 3,
      note: { type: "warning", text: "Two policy versions apply. Policy 3.2 was in force when the work started; policy 3.3 applies from 1 Apr 2026. Check which one the question needs." },
      records: ["REC-2024-0141", "REC-2024-0140"] },
    { id: "uptime", keys: ["uptime", "schedule c", "service level", "sla"],
      q: "What uptime does the crane maintenance agreement require?",
      a: "This can't be answered from the archive. Clause 9.1 says the Contractor must meet the service levels in Schedule C [1], but Schedule C is not in any record you can see.\n\nUpload Schedule C to record REC-2024-0140, or ask Engineering for the signed copy, and ask again.",
      cites: [{ doc: "CON-2024-051", clause: "9.1", page: 6 }],
      dataClass: "Sensitive", searched: 14, excluded: 0, passages: 1, thin: true, records: ["REC-2024-0140"] }
  ];

  /* ---------- bulk import ---------- */
  var importFields = [
    { source: "File name", target: "Title", sample: "NCS_crane_agreement_2019.pdf", status: "Mapped" },
    { source: "Ref No", target: "Record number", sample: "LGL/2019/057", status: "Mapped" },
    { source: "Doc Type", target: "Category", sample: "Agreement", status: "Mapped", note: "12 values mapped to 8 categories" },
    { source: "Dept", target: "Department", sample: "LEGAL", status: "Mapped" },
    { source: "Date", target: "Date", sample: "14/06/2019", status: "Mapped", note: "Read as day/month/year" },
    { source: "Party", target: "Counterparty", sample: "Northwind Crane Services", status: "Mapped" },
    { source: "Matter", target: "Linked matter", sample: "CASE-2019-006", status: "Mapped" },
    { source: "Keeper", target: "Owner", sample: "P. Senanayake", status: "Mapped" },
    { source: "Box No", target: null, sample: "B-114", status: "Not imported", note: "Physical box number, kept in the import log only" }
  ];
  var targetFields = ["Title", "Record number", "Category", "Department", "Date", "Counterparty", "Linked matter", "Owner", "Retention rule", "Notes"];
  var importClasses = [
    { category: "Contract", count: 486, suggested: "Sensitive", reason: "Prices and bank details found in 412 files", confirmBy: "owner" },
    { category: "Legal case", count: 214, suggested: "Sensitive", reason: "Personal names and claim values", confirmBy: "owner" },
    { category: "Legal opinion", count: 168, suggested: "Internal", reason: "No sensitive fields found in 161 files", confirmBy: null },
    { category: "Due diligence", count: 121, suggested: "Sensitive", reason: "Ownership and identity details", confirmBy: "owner" },
    { category: "Board", count: 74, suggested: "Confidential", reason: "Board material is always Confidential", confirmBy: "cosec" },
    { category: "Policy", count: 98, suggested: "Internal", reason: "Internal policies", confirmBy: null },
    { category: "Work order", count: 86, suggested: "Internal", reason: "Operational documents", confirmBy: null }
  ];
  var imp7Failed = [
    { id: "F-01", file: "LGL_2016_tariff_side_letter.pdf", reason: "Password protected", fix: "Upload an unlocked copy" },
    { id: "F-02", file: "LGL_2017_storm_claim_annex4.pdf", reason: "Password protected", fix: "Upload an unlocked copy" },
    { id: "F-03", file: "LGL_2018_lease_schedule.pdf", reason: "Password protected", fix: "Upload an unlocked copy" },
    { id: "F-04", file: "LGL_2020_settlement_deed.pdf", reason: "Password protected", fix: "Upload an unlocked copy" },
    { id: "F-05", file: "LGL_2021_towage_rates.xlsx", reason: "Password protected", fix: "Upload an unlocked copy" },
    { id: "F-06", file: "SCAN_2015_0417.tif", reason: "Scan unreadable (OCR confidence 31%)", fix: "Rescan at 300 dpi or enter key fields by hand" },
    { id: "F-07", file: "SCAN_2015_0422.tif", reason: "Scan unreadable (OCR confidence 28%)", fix: "Rescan at 300 dpi or enter key fields by hand" },
    { id: "F-08", file: "SCAN_2016_0108.tif", reason: "Scan unreadable (OCR confidence 40%)", fix: "Rescan at 300 dpi or enter key fields by hand" },
    { id: "F-09", file: "SCAN_2016_0331.tif", reason: "Scan unreadable (pages out of order)", fix: "Rescan at 300 dpi or enter key fields by hand" },
    { id: "F-10", file: "SCAN_2017_0712.tif", reason: "Scan unreadable (OCR confidence 35%)", fix: "Rescan at 300 dpi or enter key fields by hand" },
    { id: "F-11", file: "SCAN_2018_0219.tif", reason: "Scan unreadable (handwritten, Sinhala)", fix: "Rescan at 300 dpi or enter key fields by hand" },
    { id: "F-12", file: "SCAN_2019_0904.tif", reason: "Scan unreadable (OCR confidence 22%)", fix: "Rescan at 300 dpi or enter key fields by hand" }
  ];
  var imp7Duplicates = [
    { id: "DU-01", file: "NCS_crane_agreement_signed.pdf", match: "REC-2024-0140", how: "Same file (identical fingerprint)" },
    { id: "DU-02", file: "WO-118_scan.pdf", match: "REC-2024-0141", how: "Same file (identical fingerprint)" },
    { id: "DU-03", file: "Meridian_DD_v2.docx", match: "REC-2024-0102", how: "Same text, different file name" },
    { id: "DU-04", file: "Board_minutes_Q1_2024.pdf", match: "REC-2024-0019", how: "Same file (identical fingerprint)" },
    { id: "DU-05", file: "Procurement_policy_v2.docx", match: "REC-2016-0011", how: "Same text, different file name" },
    { id: "DU-06", file: "Greenfield_cleaning_contract.pdf", match: "REC-2023-0088", how: "Same file (identical fingerprint)" },
    { id: "DU-07", file: "Claim_2019_reefers_full.pdf", match: "REC-2019-0057", how: "Same text, different scan" },
    { id: "DU-08", file: "Coral_Bay_supply_signed.pdf", match: "REC-2025-0310", how: "Same file (identical fingerprint)" }
  ];
  var importBatches = [
    { id: "IMP-0007", name: "Legal archive 2015 to 2024", source: "LAMS export and scanned boxes 101 to 140", files: 1247, size: "3.8 GB", startedAt: "2026-11-09T22:10", finishedAt: "2026-11-10T08:15", by: "legal",
      imported: 1204, failed: 12, duplicates: 31, status: "Needs fixing" },
    { id: "IMP-0006", name: "Board minutes 2015 to 2025", source: "Company Secretariat shared drive", files: 498, size: "1.1 GB", startedAt: "2026-11-03T19:00", finishedAt: "2026-11-03T23:42", by: "cosec",
      imported: 496, failed: 0, duplicates: 2, status: "Completed" },
    { id: "IMP-0005", name: "Policies and registers", source: "Compliance team folder", files: 312, size: "420 MB", startedAt: "2026-10-28T18:30", finishedAt: "2026-10-28T19:55", by: "compliance",
      imported: 310, failed: 0, duplicates: 2, status: "Completed" }
  ];
  var sampleUploads = [
    { key: "batch-a", name: "Legal archive box 141 to 150.zip", meta: "218 files, 640 MB", files: 218, size: "640 MB" },
    { key: "batch-b", name: "Engineering work orders 2020 to 2023.zip", meta: "356 files, 410 MB", files: 356, size: "410 MB" },
    { key: "batch-c", name: "LAMS export, contracts 2024.csv", meta: "1 file, 4,812 rows", files: 4812, size: "6 MB" }
  ];

  /* ---------- knowledge base ---------- */
  var kbFolders = [
    { key: "law", title: "Laws and regulations", children: [
      { key: "law-lk", title: "Sri Lanka" }, { key: "law-cn", title: "China" }, { key: "law-int", title: "International" }] },
    { key: "hq", title: "Headquarters policies" },
    { key: "company", title: "Company policies" },
    { key: "templates", title: "Contract templates" },
    { key: "checklists", title: "Review checklists" },
    { key: "terms", title: "Terminology" },
    { key: "lists", title: "External lists" },
    { key: "history", title: "Historical records" }
  ];
  /* Extra info for core knowledge items, keyed by id */
  var kbInfo = {
    "KB-LAW-PDPA": { folder: "law-lk", ref: "Act No. 9 of 2022", published: "2022-03-19", doc: "KB-LAW-PDPA-DOC", access: ["All staff"], cited: 41,
      summary: "Sri Lanka's data protection law. Sets duties for controllers and processors, data subject rights and cross-border transfer rules.",
      warn: { kind: "staged", text: "Provisions come into force in stages. Answers cite the section and the date it started to apply." }, keywords: "personal data privacy controller processor 个人数据 පෞද්ගලික දත්ත" },
    "KB-CMP": { folder: "company", ref: "CMP-2025.1", published: "2024-12-10", doc: "KB-CMP-DOC", access: ["All staff"], cited: 128,
      summary: "The Company's management policies covering governance, delegation, records, gifts and hospitality, and conduct.", keywords: "management policies gifts hospitality records 公司管理制度" },
    "KB-HQ-ABP": { folder: "hq", ref: "HQ-COMP-2024-07", published: "2024-06-15", access: ["Legal", "Compliance", "Management"], cited: 22,
      summary: "Headquarters anti-bribery policy that subsidiaries must align with. Chinese original, English translation reviewed by Li Wei.", keywords: "bribery corruption gifts 反贿赂 反腐败" },
    "KB-POL-PRC": { folder: "company", ref: "PRC-3.3", published: "2026-03-15", doc: "KB-POL-PRC-3.3", prevDoc: "KB-POL-PRC-3.2", access: ["All staff"], cited: 64,
      summary: "Procurement rules: approval limits, single-source awards, signing before work starts and supplier onboarding.",
      warn: { kind: "two", text: "Two versions apply. Version 3.3 applies to contracts signed from 1 Apr 2026. Version 3.2 still applies to contracts signed before then. Answers name the version they used." }, keywords: "procurement approval limit threshold single source tender 采购 审批" },
    "KB-POL-DOA": { folder: "company", ref: "DOA-2", published: "2024-12-01", access: ["Management", "Legal", "Finance"], cited: 37,
      summary: "Who may approve what, and up to which amount, across contracts, payments, waivers and hires.", keywords: "delegation authority approval limit 授权" },
    "KB-CHK-SVC": { folder: "checklists", ref: "CHK-SVC-2.1", published: "2025-12-15", access: ["Legal"], cited: 19,
      summary: "Checklist used to review services contracts: term and renewal, liability, service levels, disputes and signing date.", keywords: "checklist liability renewal service levels arbitration" },
    "KB-TPL-SVC": { folder: "templates", ref: "TPL-SVC-3", published: "2026-01-20", access: ["Legal"], cited: 11,
      summary: "Approved services agreement template in English and Chinese, with fallback clauses for liability and disputes.", keywords: "template services agreement 服务合同 模板" },
    "KB-AOA": { folder: "company", ref: "AOA-2021", published: "2021-11-15", access: ["Company Secretariat", "Legal", "Management"], cited: 8,
      summary: "Articles of Association, amended 2021. Governs board composition, quorum and reserved matters.", keywords: "articles association board quorum 公司章程" },
    "KB-TERM": { folder: "terms", ref: "TERM-1.6", published: "2026-09-25", access: ["Legal", "Translators"], cited: 302,
      summary: "Approved legal terms in Chinese, English and Sinhala, used by translation and consistency checks.", keywords: "termbase glossary 违约金 仲裁 liquidated damages arbitration" },
    "KB-SANC": { folder: "lists", ref: "OFAC SDN, EU consolidated", published: "2026-11-10", access: ["Compliance"], cited: 0, phase: 2,
      summary: "Sanctions lists refreshed daily from public sources. Used by sanctions screening in Phase 2.", keywords: "sanctions ofac eu screening" }
  };
  var kbExtra = [
    { id: "KB-LAW-COA", title: "Companies Act, No. 7 of 2007", category: "Law", issuer: "Parliament of Sri Lanka", dataClass: "Public", langs: ["EN", "SI"], chunks: 655, ownerName: "N. Perera", folder: "law-lk", ref: "Act No. 7 of 2007", published: "2007-03-29", access: ["All staff"], cited: 17,
      summary: "Company law of Sri Lanka: directors' duties, meetings, records and disclosures.", keywords: "companies act directors meetings 公司法",
      versions: [{ v: "Amended 2017", effective: "2017-09-01", until: null, status: "In force" }, { v: "As enacted", effective: "2007-05-03", until: "2017-08-31", status: "Superseded" }] },
    { id: "KB-LAW-ARB", title: "Arbitration Act, No. 11 of 1995", category: "Law", issuer: "Parliament of Sri Lanka", dataClass: "Public", langs: ["EN"], chunks: 140, ownerName: "N. Perera", folder: "law-lk", ref: "Act No. 11 of 1995", published: "1995-03-15", access: ["All staff"], cited: 9,
      summary: "Domestic and international arbitration in Sri Lanka, including the seat and enforcement of awards.", keywords: "arbitration seat award 仲裁",
      versions: [{ v: "As enacted", effective: "1995-03-15", until: null, status: "In force" }] },
    { id: "KB-LAW-CN-CC", title: "Civil Code of the PRC, Book III Contracts (extract)", category: "Law", issuer: "National People's Congress", dataClass: "Public", langs: ["ZH", "EN"], chunks: 520, ownerName: "Li Wei", folder: "law-cn", ref: "Civil Code 2020, Book III", published: "2020-05-28", access: ["All staff"], cited: 14,
      summary: "Contract rules from the PRC Civil Code, used when headquarters contracts are governed by PRC law.", keywords: "contract civil code 民法典 合同编 违约责任",
      versions: [{ v: "2020", effective: "2021-01-01", until: null, status: "In force" }] },
    { id: "KB-INT-INCO", title: "Shipping terms guide (internal summary)", category: "Guidance", issuer: "Commercial", dataClass: "Internal", langs: ["EN"], chunks: 44, ownerName: "S. Silva", folder: "law-int", ref: "COM-GUIDE-04", published: "2025-02-01", access: ["Commercial", "Legal"], cited: 6,
      summary: "Internal summary of common shipping terms and who bears risk at each point of handover.", keywords: "shipping terms risk handover",
      versions: [{ v: "4", effective: "2025-02-01", until: null, status: "In force" }] },
    { id: "KB-POL-GH", title: "Gifts and hospitality policy", category: "Company policy", issuer: "Compliance", dataClass: "Internal", langs: ["EN", "ZH", "SI"], chunks: 58, ownerName: "R. Fernando", folder: "company", ref: "POL-GH-3", published: "2024-12-20", access: ["All staff"], cited: 33,
      summary: "Declaration thresholds, approvals for hospitality and the gifts register. Version 4 is in drafting.", keywords: "gifts hospitality declaration threshold 礼品 招待 තෑගි",
      versions: [{ v: "3", effective: "2025-01-01", until: null, status: "In force" }, { v: "4 (draft)", effective: null, until: null, status: "Draft", note: "In review. Not used in answers until issued." }] },
    { id: "KB-DCS", title: "Data classification standard", category: "Company policy", issuer: "IT and Legal", dataClass: "Internal", langs: ["EN", "ZH"], chunks: 26, ownerName: "S. Silva", folder: "company", ref: "DCS-1.2", published: "2026-06-01", access: ["All staff"], cited: 12,
      summary: "Defines Public, Internal, Sensitive and Confidential, who confirms a class and how each class may be processed.", keywords: "classification public internal sensitive confidential 数据分级",
      versions: [{ v: "1.2", effective: "2026-07-01", until: null, status: "In force" }, { v: "1.1", effective: "2025-01-01", until: "2026-06-30", status: "Superseded" }] },
    { id: "KB-TPL-NDA", title: "Mutual non-disclosure agreement template", category: "Contract template", issuer: "Legal", dataClass: "Internal", langs: ["EN", "ZH"], chunks: 18, ownerName: "N. Perera", folder: "templates", ref: "TPL-NDA-2", published: "2025-08-01", access: ["Legal", "Commercial"], cited: 5,
      summary: "Standard mutual NDA with a 3-year term and Sri Lankan law.", keywords: "nda confidentiality template 保密协议",
      versions: [{ v: "2", effective: "2025-08-01", until: null, status: "In force" }] },
    { id: "KB-CHK-SUP", title: "Supply contract checklist", category: "Review checklist", issuer: "Legal", dataClass: "Internal", langs: ["EN"], chunks: 30, ownerName: "N. Perera", folder: "checklists", ref: "CHK-SUP-1.3", published: "2025-05-10", access: ["Legal", "Procurement"], cited: 7,
      summary: "Checklist for supply contracts: delivery, acceptance, warranty, price adjustment and termination.", keywords: "supply checklist warranty delivery",
      versions: [{ v: "1.3", effective: "2025-06-01", until: null, status: "In force" }] },
    { id: "KB-HIST-BRD", title: "Board minutes 2015 to 2025", category: "Historical records", issuer: "Company Secretariat", dataClass: "Confidential", langs: ["EN"], chunks: 3920, ownerName: "A. Jayawardena", folder: "history", ref: "IMP-0006", published: "2026-11-03", access: ["Company Secretariat", "Board"], cited: 3,
      summary: "Approved board minutes imported from the Company Secretariat drive. Searchable on the self-hosted model only.", keywords: "board minutes decisions 董事会 会议纪要",
      versions: [{ v: "Imported", effective: "2026-11-03", until: null, status: "In force" }] },
    { id: "KB-HIST-LGL", title: "Legal archive 2015 to 2024", category: "Historical records", issuer: "Legal", dataClass: "Sensitive", langs: ["EN", "SI"], chunks: 21480, ownerName: "P. Senanayake", folder: "history", ref: "IMP-0007", published: "2026-11-10", access: ["Legal"], cited: 0,
      summary: "Historical legal files imported in batch IMP-0007. 12 files still need fixing and are not yet searchable.", keywords: "legal archive historical cases claims",
      versions: [{ v: "Imported", effective: "2026-11-10", until: null, status: "In force" }] }
  ];
  /* Uploads waiting for the data owner to confirm a data class (task T-04) */
  var kbPending = [
    { id: "UP-3301", title: "Berth tariff schedule 2027 (draft).xlsx", uploadedBy: "legal", uploadedAt: "2026-11-10T08:40", dept: "Commercial", folder: "company", suggested: "Sensitive", chosen: "Internal",
      found: "12 customer names and 40 tariff rates", reasonNeeded: true, note: "Uploader chose Internal. The detector suggests Sensitive." },
    { id: "UP-3302", title: "Customer rebate terms memo.docx", uploadedBy: "legal", uploadedAt: "2026-11-10T08:44", dept: "Commercial", folder: "company", suggested: "Sensitive", chosen: "Sensitive",
      found: "3 customer names, 2 rebate rates", reasonNeeded: false, note: "Uploader and detector agree." },
    { id: "UP-3303", title: "Commercial team contacts.xlsx", uploadedBy: "legal", uploadedAt: "2026-11-10T08:51", dept: "Commercial", folder: "company", suggested: "Sensitive", chosen: "Sensitive",
      found: "28 personal names, 28 phone numbers", reasonNeeded: false, note: "Personal data. Consider whether it belongs in the knowledge base at all." }
  ];
  var kbSearchScripts = [
    { keys: ["approval", "approve", "limit", "threshold", "审批"], results: [
      { id: "KB-POL-PRC", cite: { doc: "KB-POL-PRC-3.3", clause: "4.2", page: 4 }, snippet: "Contracts above USD 500,000 need approval by the Chief Executive Officer and a second director.", version: "3.3", score: 0.92 },
      { id: "KB-POL-PRC", cite: { doc: "KB-POL-PRC-3.2", clause: "4.2", page: 4 }, snippet: "Contracts above USD 750,000 need approval by the Chief Executive Officer.", version: "3.2 (contracts signed before 1 Apr 2026)", score: 0.9 },
      { id: "KB-POL-DOA", snippet: "Delegation of authority, section 3: approval limits for contracts, payments and waivers.", version: "2", score: 0.81 }
    ], warn: "Two versions of the procurement policy apply. Results show both, with the contracts each one covers." },
    { keys: ["gift", "hospitality", "礼品", "තෑගි"], results: [
      { id: "KB-CMP", cite: { doc: "KB-CMP-DOC", clause: "7.2", page: 31 }, snippet: "Gifts above LKR 5,000 must be declared in the register within 5 working days.", version: "2025.1", score: 0.9 },
      { id: "KB-POL-GH", snippet: "Gifts and hospitality policy v3, section 2: declaration thresholds and approvals.", version: "3", score: 0.88 },
      { id: "KB-HQ-ABP", snippet: "Headquarters anti-bribery policy, article 9: gifts to public officials are prohibited without prior approval.", version: "2024", score: 0.74 }
    ], warn: "Version 4 of the gifts policy is a draft and is not used in answers until it is issued." },
    { keys: ["personal data", "privacy", "pdpa", "个人数据"], results: [
      { id: "KB-LAW-PDPA", cite: { doc: "KB-LAW-PDPA-DOC", clause: "s2", page: 3 }, snippet: "This Act applies to the processing of personal data wholly or partly within Sri Lanka.", version: "As enacted", score: 0.93 },
      { id: "KB-LAW-PDPA", cite: { doc: "KB-LAW-PDPA-DOC", clause: "s5", page: 4 }, snippet: "Every controller shall process personal data in accordance with the obligations in Part I.", version: "As enacted", score: 0.89 },
      { id: "KB-DCS", snippet: "Personal data is Sensitive by default and may leave the VPC only masked and released.", version: "1.2", score: 0.77 }
    ], warn: "Sections of this Act commence in stages. Check the commencement date of the section you rely on." },
    { keys: ["liability", "cap", "arbitration", "违约", "仲裁"], results: [
      { id: "KB-CHK-SVC", cite: { doc: "CHK-SVC-2.1", clause: "item-4", page: 2 }, snippet: "For maintenance of critical equipment, the Contractor's liability cap must be at least 100% of the contract price.", version: "2.1", score: 0.91 },
      { id: "KB-CHK-SVC", cite: { doc: "CHK-SVC-2.1", clause: "item-9", page: 3 }, snippet: "Arbitration clauses must name the seat and the arbitration rules.", version: "2.1", score: 0.86 },
      { id: "KB-TERM", snippet: "违约金: liquidated damages (EN), ද්‍රවීකෘත අලාභ (SI). Approved 1 Oct 2026.", version: "1.6", score: 0.72 }
    ] }
  ];

  D.recordsArea = {
    extraRecords: extraRecords, details: details, retentionRules: retentionRules, askScripts: askScripts,
    importFields: importFields, targetFields: targetFields, importClasses: importClasses,
    imp7Failed: imp7Failed, imp7Duplicates: imp7Duplicates, importBatches: importBatches, sampleUploads: sampleUploads,
    /* People who see Confidential content */
    maxClass: { legal: "Sensitive", owner: "Confidential", reviewer: "Sensitive", compliance: "Sensitive", cosec: "Confidential", admin: null, auditor: null }
  };
  D.knowledgeArea = { folders: kbFolders, info: kbInfo, extra: kbExtra, pending: kbPending, searchScripts: kbSearchScripts };
})();
