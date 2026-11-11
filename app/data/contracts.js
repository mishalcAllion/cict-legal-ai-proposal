/* Mock data for screen area: contracts (contract register, contract review, due diligence, template drafting).
   Every name, company, document and figure here is a fictional sample. Extends APP_DATA.contractsArea. */
(function () {
  "use strict";
  var D = window.APP_DATA;

  /* ---------- extra documents for the DocViewer ---------- */
  var docs = [
    { id: "CON-2025-102", title: "Shipping services agreement (sample)", kind: "Contract", totalPages: 12, dataClass: "Sensitive",
      file: "Shipping services agreement (sample).pdf", version: "Signed 20 May 2025",
      pages: [
        { n: 1, clauses: [
          { id: "1", heading: "1. Parties", text: "This Agreement is made on 20 May 2025 between Colombo International Container Terminals Ltd (\"the Company\") and Meridian Freight Lines Ltd (\"the Carrier\"), contract no. MFL/CICT/2025/102." },
          { id: "2", heading: "2. Services", text: "The Company shall provide berthing, stevedoring and container handling for the Carrier's weekly feeder service, as set out in the Tariff Schedule." }
        ] },
        { n: 3, clauses: [
          { id: "4.2", heading: "4.2 Payment account", text: "All refunds and rebates shall be paid to the Carrier's account ending 9902 at Harbour Commercial Bank. Any change of account must be confirmed in writing by two directors of the Carrier." }
        ] },
        { n: 5, clauses: [
          { id: "8.1", heading: "8.1 Cargo claims", text: "The Carrier shall notify the Company of any cargo damage claim within seven (7) days of discharge, with a joint survey report." },
          { id: "8.3", heading: "8.3 Liability", text: "The Company's liability for loss of or damage to containers is limited to USD 2,500 per container, except for gross negligence." }
        ] },
        { n: 9, clauses: [
          { id: "14", heading: "14. Compliance", text: "The Carrier warrants that neither it nor its owners are subject to sanctions administered by the United Nations, the European Union or the United States, and shall notify the Company at once of any change." }
        ] },
        { n: 12, clauses: [
          { id: "18", heading: "18. Governing law and disputes", text: "This Agreement is governed by the laws of Sri Lanka. Disputes shall be referred to arbitration seated in Colombo." }
        ] }
      ] },
    { id: "CON-2025-087", title: "Marine spares supply agreement (sample)", kind: "Contract", totalPages: 11, dataClass: "Sensitive",
      file: "Marine spares supply agreement (sample).pdf", version: "Signed 15 Dec 2024",
      pages: [
        { n: 1, clauses: [
          { id: "1", heading: "1. Parties", text: "This Agreement is made on 15 December 2024 between Colombo International Container Terminals Ltd (\"the Company\") and Coral Bay Marine Supplies (\"the Supplier\"), contract no. CBM/2024/087." }
        ] },
        { n: 4, clauses: [
          { id: "6.1", heading: "6.1 Prices", text: "Prices are fixed for the term as set out in the Price Schedule, total value USD 412,600." },
          { id: "6.2", heading: "6.2 Volume rebate", text: "The Supplier shall grant a volume rebate of 2% on orders above USD 100,000 in any quarter. No other rebate or discount applies." }
        ] },
        { n: 6, clauses: [
          { id: "9", heading: "9. Payment milestones", text: "Payment is made in three milestones: 30% on signing, 40% on delivery of batch 3 and 30% on delivery of batch 4, each within 30 days of invoice." }
        ] },
        { n: 11, clauses: [
          { id: "16", heading: "16. Term", text: "This Agreement ends on 31 December 2026. There is no automatic renewal." }
        ] }
      ] },
    { id: "INS-051", title: "Insurance certificate 2025-26, Northwind Crane Services (sample)", kind: "Certificate", totalPages: 1, dataClass: "Internal",
      file: "Insurance certificate 2025-26.pdf", version: "Issued 1 Nov 2025",
      pages: [
        { n: 1, clauses: [
          { id: "cover", heading: "Cover", text: "Public liability insurance for Northwind Crane Services (Pvt) Ltd, limit USD 5,000,000 any one occurrence." },
          { id: "period", heading: "Period of insurance", text: "1 November 2025 to 31 October 2026, both dates inclusive.",
            note: { kind: "warning", text: "Expired on 31 Oct 2026. No renewed certificate on file." } }
        ] }
      ] }
  ];
  docs.forEach(function (d) { D.documents[d.id] = d; });

  /* ---------- per-contract extras ---------- */
  var extras = {
    "CON-2024-051": {
      number: "NCS/CICT/2024/051", responsible: "N. Perera", businessOwner: "T. Bandara, Engineering", exactValue: "USD 1,480,000",
      payment: "Quarterly instalments, 30 days from a valid invoice", law: "Sri Lanka, arbitration (seat not stated)", source: "Migrated from LAMS on 3 Oct 2026",
      ddId: "DD-2024-031",
      extracted: [
        { field: "Contract number", value: "NCS/CICT/2024/051", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" },
        { field: "Parties", value: "The Company and Northwind Crane Services (Pvt) Ltd", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" },
        { field: "Signing date", value: "12 Apr 2024", where: "Signature page, page 14", confidence: "High", state: "Confirmed" },
        { field: "Term", value: "1 Mar 2024 to 31 Mar 2027", where: "Clause 3.1, page 2", confidence: "High", state: "Confirmed" },
        { field: "Renewal", value: "3 years unless 90 days' notice", where: "Clause 3.3, page 2", confidence: "High", state: "Confirmed" },
        { field: "Contract price", value: "USD 1,480,000", where: "Clause 5, page 3", confidence: "High", state: "Confirmed" },
        { field: "Liability cap", value: "10% of the contract price", where: "Clause 7.2, page 4", confidence: "Medium", state: "To verify" }
      ],
      history: [
        { at: "2024-02-28", event: "Interim instruction", by: "T. Bandara", detail: "Work order WO-118 let services start on 1 Mar 2024, before the agreement was signed." },
        { at: "2024-04-12", event: "Signed", by: "N. Perera", detail: "Signed by both parties. The liability cap was lowered from 100% to 10% in the last negotiation round.",
          before: "The Contractor's total liability under this Agreement is capped at 100% of the contract price.", after: "The Contractor's total liability under this Agreement is capped at 10% of the contract price." },
        { at: "2025-03-15", event: "Amendment drafted", by: "N. Perera", detail: "Amendment No. 1 (spare parts pricing) drafted and never signed. Answers ignore it unless you ask for drafts." },
        { at: "2026-10-03", event: "Migrated from LAMS", by: "System", detail: "Register fields extracted from the signed copy and confirmed by N. Perera." },
        { at: "2026-11-10", event: "Contract review run", by: "N. Perera", detail: "Checked against the services contract checklist v2.1 on Qwen (self-hosted). Draft, not confirmed." }
      ],
      documents: [
        { id: "D-051-1", name: "Crane maintenance agreement, signed.pdf", kind: "Contract", version: "Signed original", pages: 14, dataClass: "Sensitive", added: "2024-04-12", by: "N. Perera", status: "Current", docId: "CON-2024-051", recordId: "REC-2024-0140", ocr: "Scanned, OCR 98% confidence. Page 7 image and page 8 flagged." },
        { id: "D-051-2", name: "Schedule A, scope of services.pdf", kind: "Schedule", version: "1", pages: 3, dataClass: "Internal", added: "2024-04-12", by: "N. Perera", status: "Current", summary: "Lists the 12 quay cranes by asset number (QC-01 to QC-12) and the maintenance cycle: monthly checks, quarterly service and an annual load test." },
        { id: "D-051-3", name: "Schedule C, service levels", kind: "Schedule", version: "", pages: 0, dataClass: "Sensitive", added: null, by: "", status: "Missing", summary: "Referenced in clause 9.1 but not in the uploaded file. Requested from Engineering on 5 Nov 2026. Service levels can't be assessed until it is uploaded." },
        { id: "D-051-4", name: "Work order WO-118.pdf", kind: "Work order", version: "1", pages: 2, dataClass: "Internal", added: "2024-02-28", by: "T. Bandara", status: "Current", docId: "WO-118", recordId: "REC-2024-0141" },
        { id: "D-051-5", name: "Insurance certificate 2025-26.pdf", kind: "Certificate", version: "2025-26", pages: 1, dataClass: "Internal", added: "2025-11-04", by: "N. Perera", status: "Expired", docId: "INS-051" },
        { id: "D-051-6", name: "Amendment No. 1, spare parts pricing (draft).docx", kind: "Amendment", version: "Draft 2", pages: 3, dataClass: "Sensitive", added: "2025-03-15", by: "N. Perera", status: "Draft",
          summary: "Draft only, never signed. Excluded from answers unless you ask for drafts.",
          before: "Spare parts are charged at cost plus 12%, invoiced monthly.", after: "Spare parts are charged at cost plus 8%, invoiced monthly and capped at USD 60,000 a year." }
      ],
      pastReviews: [
        { id: "LR-2024-031", title: "Pre-signing review (manual, in LAMS)", kind: "Contract review", at: "2024-04-08", by: "Legal team", status: "Confirmed",
          summary: "Reviewed by hand before the assistant existed. The lower liability cap was accepted by Commercial without a recorded exception." }
      ]
    },
    "CON-2025-087": {
      number: "CBM/2024/087", responsible: "N. Perera", businessOwner: "D. Fonseka, Procurement", exactValue: "USD 412,600",
      payment: "Three milestones, 30 days from invoice", law: "Sri Lanka", source: "Migrated from LAMS on 3 Oct 2026", ddId: "DD-2024-044",
      linked: [{ kind: "Anomaly alert", id: "ANM-0034", title: "Rebate paid above the 2% contract rate", route: "compliance", phase: 2 }],
      extracted: [
        { field: "Contract number", value: "CBM/2024/087", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" },
        { field: "Contract value", value: "USD 412,600", where: "Clause 6.1, page 4", confidence: "High", state: "Confirmed" },
        { field: "Volume rebate", value: "2% above USD 100,000 a quarter", where: "Clause 6.2, page 4", confidence: "High", state: "Confirmed" },
        { field: "End date", value: "31 Dec 2026, no renewal", where: "Clause 16, page 11", confidence: "High", state: "Confirmed" }
      ],
      history: [
        { at: "2024-12-15", event: "Signed", by: "D. Fonseka", detail: "Signed after a tender with three bidders." },
        { at: "2025-01-20", event: "First milestone paid", by: "H. Kumara", detail: "30% paid on signing." },
        { at: "2026-06-30", event: "Second milestone due", by: "System", detail: "Delayed by batch 3 delivery. Rescheduled to 20 Nov 2026 by agreement." },
        { at: "2026-10-28", event: "Anomaly flagged", by: "System", detail: "Q3 rebate paid at 3.5% against a contract rate of 2%.", phase: 2 }
      ],
      documents: [
        { id: "D-087-1", name: "Marine spares supply agreement, signed.pdf", kind: "Contract", version: "Signed original", pages: 11, dataClass: "Sensitive", added: "2024-12-15", by: "D. Fonseka", status: "Current", docId: "CON-2025-087", recordId: "REC-2025-0310" },
        { id: "D-087-2", name: "Price schedule.xlsx", kind: "Schedule", version: "2", pages: 4, dataClass: "Sensitive", added: "2024-12-15", by: "D. Fonseka", status: "Current", summary: "212 part numbers with fixed unit prices for the term." },
        { id: "D-087-3", name: "Delivery notes, batches 1 to 3.pdf", kind: "Evidence", version: "1", pages: 9, dataClass: "Internal", added: "2026-09-12", by: "D. Fonseka", status: "Current", summary: "Signed delivery notes. Batch 3 arrived 41 days late." }
      ],
      pastReviews: [
        { id: "LR-2024-077", title: "Pre-signing review (manual, in LAMS)", kind: "Contract review", at: "2024-12-10", by: "Legal team", status: "Confirmed", summary: "No exceptions. Rebate clause tightened to a single 2% rate." }
      ]
    },
    "CON-2025-102": {
      number: "MFL/CICT/2025/102", responsible: "N. Perera", businessOwner: "S. Silva, Commercial", exactValue: "USD 760,000",
      payment: "Monthly invoices, refunds to the account in clause 4.2", law: "Sri Lanka, arbitration seated in Colombo", source: "Migrated from LAMS on 3 Oct 2026", ddId: "DD-2026-014",
      linked: [
        { kind: "Legal case", id: "CASE-2026-014", title: "Cargo damage claim, hearing 2 Dec 2026", route: "legal", phase: 2 },
        { kind: "Screening hit", id: "SCR-0091", title: "Possible EU list match on a similar name", route: "screening", phase: 2 }
      ],
      extracted: [
        { field: "Contract number", value: "MFL/CICT/2025/102", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" },
        { field: "Payment account", value: "Account ending 9902", where: "Clause 4.2, page 3", confidence: "High", state: "Confirmed" },
        { field: "Container liability", value: "USD 2,500 per container", where: "Clause 8.3, page 5", confidence: "High", state: "Confirmed" },
        { field: "Sanctions warranty", value: "UN, EU and US sanctions", where: "Clause 14, page 9", confidence: "High", state: "Confirmed" }
      ],
      history: [
        { at: "2025-05-20", event: "Signed", by: "S. Silva", detail: "Three-year feeder service agreement." },
        { at: "2025-09-18", event: "Cargo damage reported", by: "N. Perera", detail: "Survey report SR-221 found failed lashing on bay 14." },
        { at: "2026-03-02", event: "Dispute linked", by: "N. Perera", detail: "Cargo damage claim opened as CASE-2026-014.", phase: 2 },
        { at: "2026-10-30", event: "Payment discrepancy", by: "System", detail: "Refund of USD 84,500 paid to an account ending 4471. Clause 4.2 names the account ending 9902." },
        { at: "2026-11-03", event: "Due diligence refresh started", by: "N. Perera", detail: "DD-2026-014 opened with the shipping line checklist v1.3." }
      ],
      documents: [
        { id: "D-102-1", name: "Shipping services agreement, signed.pdf", kind: "Contract", version: "Signed original", pages: 12, dataClass: "Sensitive", added: "2025-05-20", by: "S. Silva", status: "Current", docId: "CON-2025-102" },
        { id: "D-102-2", name: "Tariff schedule 2025.pdf", kind: "Schedule", version: "2025", pages: 6, dataClass: "Internal", added: "2025-05-20", by: "S. Silva", status: "Current", summary: "Berthing and handling rates per move, with a 4% volume discount above 1,000 moves a month." },
        { id: "D-102-3", name: "Survey report SR-221.pdf", kind: "Evidence", version: "1", pages: 6, dataClass: "Sensitive", added: "2025-09-20", by: "N. Perera", status: "Current", recordId: "REC-2025-0277", summary: "Joint survey of container damage on the vessel's bay 14. Lashing failed before arrival at the berth." },
        { id: "D-102-4", name: "Due diligence report 2024, v2.docx", kind: "Due diligence", version: "2", pages: 9, dataClass: "Sensitive", added: "2024-11-28", by: "N. Perera", status: "Superseded", recordId: "REC-2024-0102", summary: "Earlier report, rated Medium. Being replaced by DD-2026-014." }
      ],
      pastReviews: [
        { id: "LR-2025-019", title: "Pre-signing review (manual, in LAMS)", kind: "Contract review", at: "2025-05-12", by: "Legal team", status: "Confirmed", summary: "Approved. Sanctions warranty added at clause 14." }
      ]
    },
    "CON-2026-009": {
      number: "STS/2026/009", responsible: "N. Perera", businessOwner: "D. Fonseka, Marine operations", exactValue: "USD 186,000",
      payment: "Monthly in arrears", law: "Sri Lanka", source: "Created in LAMS, migrated 3 Oct 2026", ddId: "DD-2025-008",
      extracted: [
        { field: "Contract number", value: "STS/2026/009", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" },
        { field: "Extension option", value: "1 year, notice by 2 Dec 2026", where: "Clause 3.2, page 2", confidence: "High", state: "Confirmed" }
      ],
      history: [
        { at: "2026-01-25", event: "Signed", by: "D. Fonseka", detail: "One-year towage agreement with an option to extend." },
        { at: "2026-10-03", event: "Migrated from LAMS", by: "System", detail: "Register fields confirmed by N. Perera." }
      ],
      documents: [
        { id: "D-009-1", name: "Harbour towage services agreement, signed.pdf", kind: "Contract", version: "Signed original", pages: 8, dataClass: "Internal", added: "2026-01-25", by: "D. Fonseka", status: "Current", recordId: "REC-2026-0122", summary: "Two harbour tugs on call 24 hours, monthly towage log, extension option of 1 year by notice 60 days before expiry." }
      ],
      pastReviews: []
    },
    "CON-2026-021": {
      number: "EIT/CICT/2026/021", responsible: "N. Perera", businessOwner: "K. Dias, IT", exactValue: "USD 74,500",
      payment: "Annual licence fee in advance", law: "Sri Lanka", source: "Created in LAMS, migrated 3 Oct 2026", ddId: "DD-2026-002",
      extracted: [
        { field: "Contract number", value: "EIT/CICT/2026/021", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" },
        { field: "Renewal", value: "Every 3 years unless 60 days' notice", where: "Clause 11, page 14", confidence: "High", state: "Confirmed" }
      ],
      history: [
        { at: "2026-03-10", event: "Signed", by: "K. Dias", detail: "Three-year licence for the gate appointment system." }
      ],
      documents: [
        { id: "D-021-1", name: "Terminal software licence, signed.pdf", kind: "Contract", version: "Signed original", pages: 26, dataClass: "Internal", added: "2026-03-10", by: "K. Dias", status: "Current", recordId: "REC-2026-0350", summary: "Licence for 400 named users, support on business days, data stays in the CICT VPC." }
      ],
      pastReviews: [
        { id: "LR-2026-008", title: "Pre-signing review (manual, in LAMS)", kind: "Contract review", at: "2026-03-02", by: "Legal team", status: "Confirmed", summary: "Data location clause added. Automatic renewal accepted with a 60-day notice reminder." }
      ]
    },
    "CON-2024-033": {
      number: "HBL/2024/033", responsible: "S. Silva", businessOwner: "S. Silva, Commercial", exactValue: "USD 1,250,000",
      payment: "Quarterly tariff invoices with a volume rebate", law: "Sri Lanka", source: "Migrated from LAMS on 3 Oct 2026", ddId: null,
      linked: [{ kind: "Anomaly alert", id: "ANM-0029", title: "Tariff waiver above the contract limit", route: "compliance", phase: 2 }],
      extracted: [
        { field: "Contract number", value: "HBL/2024/033", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" },
        { field: "Waiver limit", value: "Up to 5% of quarterly tariff", where: "Clause 7.4, page 6", confidence: "Medium", state: "To verify" }
      ],
      history: [
        { at: "2024-01-20", event: "Signed", by: "S. Silva", detail: "Three-year berth services tariff." },
        { at: "2026-10-30", event: "Renegotiation notice sent", by: "S. Silva", detail: "Notice sent ahead of the 2 Nov 2026 date." }
      ],
      documents: [
        { id: "D-033-1", name: "Berth services tariff agreement, signed.pdf", kind: "Contract", version: "Signed original", pages: 16, dataClass: "Sensitive", added: "2024-01-20", by: "S. Silva", status: "Current", summary: "Tariff per move, volume rebate bands and a waiver limit of 5% of quarterly tariff." }
      ],
      pastReviews: []
    },
    "CON-2026-030": {
      number: "To be assigned on signing", responsible: "N. Perera", businessOwner: "D. Fonseka, Security", exactValue: "USD 318,000 (proposed)",
      payment: "Monthly, 30 days from invoice (proposed)", law: "Sri Lanka, arbitration seated in Colombo", source: "Drafted from the services agreement template v3 on 4 Nov 2026", ddId: "DD-2026-019",
      extracted: [],
      history: [
        { at: "2026-11-04", event: "Draft created", by: "N. Perera", detail: "Generated from the services agreement template v3. Not approved, not signed." },
        { at: "2026-11-06", event: "Due diligence started", by: "N. Perera", detail: "DD-2026-019 opened with the service contractor checklist v2.0." }
      ],
      documents: [
        { id: "D-030-1", name: "Security services agreement, draft 1.docx", kind: "Draft contract", version: "Draft 1", pages: 9, dataClass: "Internal", added: "2026-11-04", by: "N. Perera", status: "Draft", summary: "Generated from template v3. Liability cap left at 50% by the business; flagged against checklist item 4." }
      ],
      pastReviews: []
    },
    "CON-2023-014": {
      number: "GFM/2023/014", responsible: "N. Perera", businessOwner: "P. Senanayake, Facilities", exactValue: "USD 82,000",
      payment: "Monthly in arrears", law: "Sri Lanka", source: "Migrated from LAMS on 3 Oct 2026", ddId: null,
      extracted: [
        { field: "Contract number", value: "GFM/2023/014", where: "Clause 1, page 1", confidence: "High", state: "Confirmed" }
      ],
      history: [
        { at: "2023-05-25", event: "Signed", by: "P. Senanayake", detail: "Three-year cleaning and facility services." },
        { at: "2026-05-31", event: "Expired", by: "System", detail: "Ended on expiry. Replaced by an in-house team." }
      ],
      documents: [
        { id: "D-014-1", name: "Cleaning and facility services agreement, signed.pdf", kind: "Contract", version: "Signed original", pages: 10, dataClass: "Internal", added: "2023-05-25", by: "P. Senanayake", status: "Current", recordId: "REC-2023-0088", summary: "Daily cleaning of offices and amenities, monthly invoices." }
      ],
      pastReviews: []
    }
  };

  /* ---------- obligation details (planned against actual) ---------- */
  var obligationDetails = {
    "OB-051-1": { planned: "Report for Q4 by 15 Dec 2026", actual: "Q3 report received 12 Sep 2026, on time", evidence: ["PM report Q3 2026.pdf"], note: "Three quarters on time in a row." },
    "OB-051-2": { planned: "USD 123,333 by 20 Dec 2026", actual: "Not yet due", evidence: [], note: "Paid against invoice once the Q4 report is accepted." },
    "OB-051-3": { planned: "October uptime report by 5 Nov 2026", actual: "Not received", evidence: [], note: "Schedule C is missing, so the report can't be checked against agreed levels.", flag: "Delay" },
    "OB-051-4": { planned: "Renewed certificate by 31 Oct 2026", actual: "Certificate on file expired 31 Oct 2026", evidence: ["Insurance certificate 2025-26.pdf"], note: "Clause 7.1 needs a current certificate each year.", flag: "Missing material" },
    "OB-087-1": { planned: "USD 165,040 (40%) by 20 Nov 2026", actual: "Invoice received 6 Nov 2026", evidence: ["Invoice CBM-2211.pdf"], note: "Batch 3 delivery confirmed. Payment can go ahead." },
    "OB-087-2": { planned: "Batch 4 delivered by 30 Nov 2026", actual: "Shipped 2 Nov 2026, in transit", evidence: ["Bill of lading BL-7781.pdf"], note: "" },
    "OB-102-1": { planned: "Meeting by 15 May 2027", actual: "Not yet due", evidence: [], note: "" },
    "OB-102-2": { planned: "Refund of USD 84,500 to the account ending 9902 (clause 4.2)", actual: "Paid 30 Oct 2026 to the account ending 4471", evidence: ["Payment advice PA-30881.pdf"], note: "No written confirmation from two directors on file.", flag: "Payment discrepancy" },
    "OB-009-1": { planned: "October log by 5 Dec 2026", actual: "September log received 4 Oct 2026", evidence: ["Towage log Sep 2026.xlsx"], note: "" },
    "OB-021-1": { planned: "USD 24,800 by 15 Mar 2027", actual: "Not yet due", evidence: [], note: "" },
    "OB-033-1": { planned: "Q3 reconciliation by 25 Nov 2026", actual: "Draft from Finance on 4 Nov 2026", evidence: ["Rebate reconciliation Q3 draft.xlsx"], note: "Waivers above the 5% limit found in the draft.", flag: "Payment discrepancy" },
    "OB-014-1": { planned: "Final invoice matched by 31 Jul 2026", actual: "Invoice USD 8,940 against an order of USD 8,200", evidence: ["Final invoice GFM-0612.pdf"], note: "USD 740 difference not explained.", flag: "Payment discrepancy" }
  };

  /* ---------- extra milestones (added to APP_DATA.deadlines for contracts) ---------- */
  var milestones = [
    { id: "MS-01", contractId: "CON-2024-051", title: "Insurance certificate renewal", date: "2026-10-31", ownerName: "N. Perera", kind: "Delivery", phase: 1 },
    { id: "MS-02", contractId: "CON-2025-102", title: "Confirm payment account in writing", date: "2026-11-14", ownerName: "H. Kumara", kind: "Payment", phase: 1 },
    { id: "MS-03", contractId: "CON-2026-030", title: "Target signing date", date: "2026-11-25", ownerName: "N. Perera", kind: "Signing", phase: 1 },
    { id: "MS-04", contractId: "CON-2024-033", title: "Tariff renegotiation notice", date: "2026-11-02", ownerName: "S. Silva", kind: "Notice", phase: 1, outcome: "Notice sent on 30 Oct 2026 by S. Silva." },
    { id: "MS-05", contractId: "CON-2024-033", title: "Contract expiry", date: "2027-01-31", ownerName: "S. Silva", kind: "Expiry", phase: 1 },
    { id: "MS-06", contractId: "CON-2026-021", title: "Annual licence fee", date: "2027-03-15", ownerName: "H. Kumara", kind: "Payment", phase: 1 },
    { id: "MS-07", contractId: "CON-2026-021", title: "Notice to end before renewal (60 days)", date: "2029-01-13", ownerName: "K. Dias", kind: "Notice", phase: 1 },
    { id: "MS-08", contractId: "CON-2025-102", title: "Contract expiry", date: "2028-05-31", ownerName: "S. Silva", kind: "Expiry", phase: 1 },
    { id: "MS-09", contractId: "CON-2023-014", title: "Final invoice reconciliation", date: "2026-07-31", ownerName: "H. Kumara", kind: "Payment", phase: 1 }
  ];
  var reminders = {
    "DL-01": { days: [14, 3], channels: ["In-app", "Email"], to: ["H. Kumara", "N. Perera"] },
    "DL-02": { days: [14, 3], channels: ["In-app", "Email"], to: ["H. Kumara", "S. Silva"] },
    "DL-03": { days: [60, 30, 7], channels: ["In-app", "Email"], to: ["N. Perera"] },
    "DL-04": { days: [14, 3], channels: ["In-app"], to: ["T. Bandara"] },
    "DL-05": { days: [60, 30, 7], channels: ["In-app", "Email", "Teams"], to: ["N. Perera", "T. Bandara"] },
    "DL-06": { days: [90, 30], channels: ["In-app", "Email"], to: ["D. Fonseka"] },
    "DL-07": { days: [90], channels: ["In-app"], to: ["D. Fonseka"] },
    "DL-08": { days: [30], channels: ["In-app"], to: ["T. Bandara"] },
    "MS-01": { days: [30, 7], channels: ["In-app", "Email"], to: ["N. Perera"] },
    "MS-02": { days: [3, 1], channels: ["In-app", "Email"], to: ["H. Kumara", "N. Perera"] },
    "MS-03": { days: [7, 1], channels: ["In-app"], to: ["N. Perera"] },
    "MS-04": { days: [30, 7], channels: ["In-app", "Email"], to: ["S. Silva"] },
    "MS-05": { days: [90, 30], channels: ["In-app"], to: ["S. Silva"] },
    "MS-06": { days: [30], channels: ["In-app", "Email"], to: ["H. Kumara"] },
    "MS-07": { days: [90, 60, 30], channels: ["In-app", "Email"], to: ["K. Dias", "N. Perera"] },
    "MS-08": { days: [180, 90], channels: ["In-app"], to: ["S. Silva"] },
    "MS-09": { days: [14, 3], channels: ["In-app"], to: ["H. Kumara"] }
  };

  /* ---------- review checklists and results ---------- */
  var checklists = [
    { id: "CHK-SVC-2.1", name: "Services contract checklist v2.1", items: 12, effective: "2026-01-01", status: "In force", kb: "KB-CHK-SVC", hasResults: true },
    { id: "CHK-SUP-1.2", name: "Supply contract checklist v1.2", items: 10, effective: "2025-07-01", status: "In force", kb: null, hasResults: false },
    { id: "CHK-LSE-1.0", name: "Lease checklist v1.0", items: 9, effective: "2025-05-01", status: "In force", kb: null, hasResults: false }
  ];
  var C = "CON-2024-051";
  var reviewItems = [
    { no: 1, id: "C1", title: "Parties and contract number", status: "Met", severity: "Low", clause: "1",
      requirement: "Both parties and the contract number are stated in full.",
      fact: "Clause 1 names both parties and gives the contract number NCS/CICT/2024/051.",
      assessment: "Meets item 1.", action: "No change needed.",
      cites: [{ doc: C, clause: "1", page: 1 }] },
    { no: 2, id: "F4", findingId: "F4", status: "Met", severity: "Medium", clause: "3.3", checkClause: "item-2",
      requirement: "Automatic renewal must carry a notice period of at least 60 days, and a reminder must be set in the contract register.",
      assessmentOverride: "The 90-day notice meets the 60-day minimum and a reminder is set for 31 Dec 2026. The risk stays: missing that date commits the Company to 3 more years.",
      extraAction: { label: "Open the reminder", kind: "reminder" } },
    { no: 3, id: "C3", title: "Scope of services", status: "Met", severity: "Low", clause: "2",
      requirement: "The scope is described and the assets or sites are listed in a schedule.",
      fact: "Clause 2 covers preventive and corrective maintenance of 12 quay cranes, with details in Schedule A.",
      assessment: "Meets item 3. Schedule A is on file.", action: "No change needed.",
      cites: [{ doc: C, clause: "2", page: 1 }] },
    { no: 4, id: "F1", findingId: "F1", status: "Not met", severity: "High", clause: "7.2", checkClause: "item-4",
      requirement: "For maintenance of critical equipment, the Contractor's liability cap must be at least 100% of the contract price. Lower caps need an approved exception." },
    { no: 5, id: "C5", title: "Insurance", status: "Met", severity: "Low", clause: "7.1",
      requirement: "Public liability insurance of at least USD 5 million, with a current certificate each year.",
      fact: "Clause 7.1 requires USD 5,000,000 of cover and a certificate each year.",
      assessment: "The clause meets item 5. The 2025-26 certificate expired on 31 Oct 2026 and no renewal is on file.",
      action: "Chase the renewed certificate. Tracked as obligation OB-051-4.",
      cites: [{ doc: C, clause: "7.1", page: 4 }, { doc: "INS-051", clause: "period", page: 1 }],
      extraAction: { label: "Open obligation OB-051-4", kind: "obligation", id: "OB-051-4" } },
    { no: 6, id: "C6", title: "Price and payment", status: "Met", severity: "Low", clause: "5",
      requirement: "Price, payment schedule and payment account are stated. Payment within 30 to 60 days.",
      fact: "Clause 5 states the price, quarterly instalments, the payment account and 30 days from a valid invoice.",
      assessment: "Meets item 6.", action: "No change needed.",
      cites: [{ doc: C, clause: "5", page: 3 }] },
    { no: 7, id: "F2", findingId: "F2", status: "Unsure", severity: "Not enough evidence", clause: "9.1", checkClause: "item-7",
      requirement: "Service levels, response times and service credits must be attached as a schedule and referenced in the body.",
      extraAction: { label: "Upload Schedule C", kind: "upload" } },
    { no: 8, id: "C8", title: "Termination", status: "Unsure", severity: "Not enough evidence", clause: "3.1",
      requirement: "Each party can end the contract for material breach, with a cure period of at least 30 days.",
      fact: "Clause 3.1 refers to early termination under clause 12. Clause 12 is on page 8, which the OCR read with low confidence.",
      assessment: "The cure period can't be confirmed from the text. This is flagged, not assumed to be fine.",
      action: "Check clause 12 on page 8 of the signed copy by hand, then mark this item.",
      cites: [{ doc: C, clause: "3.1", page: 2 }] },
    { no: 9, id: "F5", findingId: "F5", status: "Not met", severity: "Medium", clause: "15", checkClause: "item-9",
      requirement: "Arbitration clauses must name the seat and the arbitration rules." },
    { no: 10, id: "C10", title: "Notices", status: "Met", severity: "Low", clause: "14",
      requirement: "Notice addresses and contact persons are stated for both parties.",
      fact: "Clause 14 gives the Contractor's contact person, phone and email.",
      assessment: "Meets item 10. The Company's address is in clause 1 by reference.", action: "No change needed.",
      cites: [{ doc: C, clause: "14", page: 10 }] },
    { no: 11, id: "C11", title: "Governing law", status: "Met", severity: "Low", clause: "15",
      requirement: "Governing law is Sri Lankan law unless an exception is approved.",
      fact: "Clause 15 chooses the laws of Sri Lanka.", assessment: "Meets item 11.", action: "No change needed.",
      cites: [{ doc: C, clause: "15", page: 11 }] },
    { no: 12, id: "F3", findingId: "F3", status: "Not met", severity: "Medium", clause: "sig", checkClause: "item-12",
      requirement: "Contracts must be signed before work starts. Late signing needs a reason recorded on the contract file.",
      extraAction: { label: "Record the reason on the contract file", kind: "note" } }
  ];
  var keyClauses = [
    { topic: "Liability", result: "Found", where: "Clause 7.2, page 4", note: "Cap of 10% is below the checklist minimum.", clause: "7.2" },
    { topic: "Indemnification", result: "Not found", where: "Searched all readable pages", note: "No indemnity clause found. Flagged for a person to check, not read as no risk.", clause: null },
    { topic: "Termination", result: "Partly", where: "Clause 3.1, page 2; clause 12, page 8", note: "Clause 12 read with low OCR confidence.", clause: "3.1" },
    { topic: "Breach", result: "Partly", where: "Clause 12, page 8", note: "Same page as termination, low OCR confidence.", clause: "3.1" },
    { topic: "Price adjustments", result: "Found", where: "Clause 5, page 3", note: "Fixed price for the full term, no indexation.", clause: "5" },
    { topic: "Changes in law", result: "Not found", where: "Searched all readable pages", note: "No change-in-law clause. Worth adding for a 3-year renewal.", clause: null }
  ];
  var interdependent = [
    { id: "X1", title: "Insurance cover is far above the liability cap", clauses: ["7.1", "7.2"],
      text: "Clause 7.1 requires USD 5,000,000 of cover, but clause 7.2 caps liability at 10% of the price (about USD 148,000). Insured losses above the cap can't be recovered from the Contractor." },
    { id: "X2", title: "Renewal locks in service levels nobody can see", clauses: ["3.3", "9.1"],
      text: "Clause 3.3 renews for 3 years, and clause 9.1 points to Schedule C, which is missing. A renewal would carry forward service levels that have not been checked." }
  ];
  var reviewSummary = {
    contract: C,
    overview: "Three-year maintenance agreement for 12 quay cranes, signed six weeks after work started. Fixed price, quarterly payments, automatic 3-year renewal unless notice is given by 31 Dec 2026.",
    rating: "High", ratingReason: "The liability cap is 10% against a checklist minimum of 100%, with no recorded exception.",
    ranAt: "2026-11-10T10:12", model: "m-qwen-sh", runBy: "legal", rules: "Rules v1.4"
  };

  /* ---------- due diligence ---------- */
  var ddChecklists = [
    { id: "DDC-SHIP-1.3", name: "Shipping line due diligence v1.3", type: "Shipping line", materials: ["Registry extract", "Ownership chart", "Operating licence", "Audited financial statements", "Bank account confirmation", "Insurance (P&I) certificate"] },
    { id: "DDC-SVC-2.0", name: "Service contractor due diligence v2.0", type: "Service contractor", materials: ["Registry extract", "Ownership chart", "Trade licence", "Audited financial statements", "Insurance certificate", "References from two clients", "Staff vetting policy"] },
    { id: "DDC-SUP-1.1", name: "Supplier due diligence v1.1", type: "Supplier", materials: ["Registry extract", "Ownership chart", "Audited financial statements", "Quality certificate"] },
    { id: "DDC-CUS-1.0", name: "Customer due diligence v1.0", type: "Customer", materials: ["Registry extract", "Ownership chart", "Credit reference"] }
  ];
  var dueDiligence = [
    { id: "DD-2026-014", counterparty: "Meridian Freight Lines", contractId: "CON-2025-102", businessType: "Shipping line", checklist: "Shipping line due diligence v1.3",
      status: "Draft report", rating: "High", started: "2026-11-03", startedBy: "legal", version: "v2 (draft)", nextReview: "Every 6 months once approved (High rating)",
      dataClass: "Sensitive", model: "m-qwen-sh", reviewRef: "CON-2025-102",
      scope: ["Entity status and registration", "Ownership and control", "Related parties", "Operating licences", "Litigation", "Sanctions", "Adverse information"],
      sources: [
        { id: "S1", source: "Company registry extract", type: "Uploaded material", queried: "2026-11-03T10:20", result: "Registered and active. 2 beneficial owners named.", status: "Done",
          how: "Uploaded by N. Perera. Read inside the CICT VPC with OCR. Nothing sent out." },
        { id: "S2", source: "Approved commercial risk list (licensed by the Company)", type: "External query", queried: "2026-11-10T09:12", result: "1 open commercial claim at another port (2025).", status: "Done",
          how: "Query sent: entity name and registration number only. Covered by standing release REL-0398 from S. Silva for counterparty checks." },
        { id: "S3", source: "OFAC and EU sanctions lists", type: "Local list copy", queried: "2026-11-10T06:00", result: "Possible match on a similar name (EU list).", status: "To verify",
          how: "Matched inside the CICT VPC against the copy refreshed at 06:00. Nothing sent out." },
        { id: "S4", source: "Adverse media service (licensed by the Company)", type: "External query", queried: "2026-11-10T09:13", result: "No results in the last 5 years.", status: "Done",
          how: "Name only sent. A search with no results is recorded as such, not read as no risk." },
        { id: "S5", source: "Commercial High Court case index", type: "Public source", queried: "2026-11-10T09:15", result: "1 case: cargo damage claim brought by the Company.", status: "Done",
          how: "Public index search by registered name and number." },
        { id: "S6", source: "Port operator licence register", type: "Public source", queried: "2026-11-10T09:16", result: "Source unreachable after 3 tries.", status: "Failed",
          how: "Not checked. Licence status can't be assessed from this source. The check runs again at 18:00." }
      ],
      crossCheck: [
        { id: "X1", field: "Registered name", uploaded: "Meridian Freight Lines Ltd", registry: "Meridian Freight Lines Ltd", result: "Match" },
        { id: "X2", field: "Registration number", uploaded: "PV 00123456", registry: "PV 00123456", result: "Match" },
        { id: "X3", field: "Registered address", uploaded: "12 Harbour Road, Colombo 01", registry: "40 Marine Drive, Colombo 03", result: "Mismatch" },
        { id: "X4", field: "Directors", uploaded: "3 named", registry: "3 named, same people", result: "Match" },
        { id: "X5", field: "Beneficial owners", uploaded: "A. Mendis (60%), Oceanic Holdings Ltd (40%)", registry: "A. Mendis (60%). Owners of Oceanic Holdings Ltd not listed", result: "To verify" },
        { id: "X6", field: "Bank account for refunds", uploaded: "Ending 9902 (contract clause 4.2)", registry: "Payment made to ending 4471 on 30 Oct 2026", result: "Mismatch" }
      ],
      findings: [
        { id: "DF1", area: "Ownership and control", rating: "High", flag: "Manual verification", status: "Open", source: "S1",
          finding: "One of two beneficial owners can't be verified. Oceanic Holdings Ltd (40%) is registered abroad and its owners are not listed.",
          action: "Ask Meridian for the ownership chart of Oceanic Holdings Ltd, certified by a director." },
        { id: "DF2", area: "Sanctions", rating: "To verify", flag: "Same or similar name", status: "Open", source: "S3", phase2: { route: "screening", id: "SCR-0091", label: "Screening hit SCR-0091" },
          finding: "The name is similar to an EU list entry (Meridian Freight Line FZE). The list entry has a different country and registration number. This is not a determination.",
          action: "Compliance officer to adjudicate the name match before any renewal." },
        { id: "DF3", area: "Operating licences", rating: "Medium", flag: "Material unavailable", status: "Open", source: "S6",
          finding: "The operating licence copy on file expired on 30 Sep 2026, and the licence register could not be reached.",
          action: "Request the current licence and check the register again." },
        { id: "DF4", area: "Payments", rating: "High", flag: "Manual verification", status: "Open", source: "X6",
          finding: "A refund of USD 84,500 on 30 Oct 2026 went to an account that is not the one named in clause 4.2. No written confirmation from two directors is on file.",
          action: "Finance to confirm the account change in writing before any further payment." },
        { id: "DF5", area: "Litigation", rating: "Medium", flag: "", status: "Open", source: "S2, S5",
          finding: "An open cargo damage claim brought by the Company, and a commercial claim at another port in 2025.",
          action: "Legal affairs to confirm the exposure on the open claim." },
        { id: "DF6", area: "Related parties", rating: "Low", flag: "", status: "Done", source: "Related-party list v2026.3",
          finding: "No link found between the owners or directors and the Company's staff or directors.", action: "None." },
        { id: "DF7", area: "Adverse information", rating: "Low", flag: "No results recorded", status: "Done", source: "S4",
          finding: "No adverse media found in the last 5 years. Recorded as no results, not as no risk.", action: "None." }
      ],
      outstanding: [
        { id: "M1", item: "Current operating licence", from: "Meridian Freight Lines", requested: "2026-11-03", due: "2026-11-14", status: "Requested" },
        { id: "M2", item: "Certified ownership chart of Oceanic Holdings Ltd", from: "Meridian Freight Lines", requested: "2026-11-03", due: "2026-11-14", status: "Requested" },
        { id: "M3", item: "Letter confirming the bank account change, signed by two directors", from: "Meridian Freight Lines, through Finance", requested: "2026-11-05", due: "2026-11-12", status: "Requested" },
        { id: "M4", item: "Audited financial statements 2025", from: "Meridian Freight Lines", requested: "2026-11-03", due: "2026-11-10", status: "Received", received: "2026-11-07" }
      ],
      materials: [
        { name: "Registry extract.pdf", added: "2026-11-03", dataClass: "Internal" },
        { name: "Certificate of incorporation.pdf", added: "2026-11-03", dataClass: "Internal" },
        { name: "Directors' ID copies (masked).pdf", added: "2026-11-03", dataClass: "Sensitive" },
        { name: "Audited financial statements 2024.pdf", added: "2026-11-03", dataClass: "Sensitive" },
        { name: "Audited financial statements 2025.pdf", added: "2026-11-07", dataClass: "Sensitive" },
        { name: "Operating licence (expired 30 Sep 2026).pdf", added: "2026-11-03", dataClass: "Internal" }
      ],
      actions: [
        "Do not extend or vary the agreement until the ownership and payment account questions are closed.",
        "Compliance officer to adjudicate the sanctions name match.",
        "Finance to hold any change of payee details until confirmed in writing by two directors.",
        "Review again in 6 months, or at once on any change of ownership."
      ],
      ratingNote: "The highest finding sets the overall rating. Two High findings need manual verification, and one source failed.",
      versions: [
        { v: "v1", at: "2026-11-03T15:20", by: "Assistant draft, started by N. Perera", note: "First draft from uploaded materials.",
          summary: "Meridian Freight Lines is registered and active. Ownership is split between A. Mendis (60%) and Oceanic Holdings Ltd (40%). Sanctions lists show a possible match on a similar name. Overall rating Medium (draft)." },
        { v: "v2", at: "2026-11-09T16:40", by: "N. Perera", note: "Added the court index, the payment account check and the failed licence source. Sent for review as REV-0206.",
          summary: "Meridian Freight Lines is registered and active. One of two beneficial owners can't be verified. Sanctions lists show a possible match on a similar name, which is not a determination. A refund went to an account not named in the contract. Overall rating High (draft)." }
      ],
      process: [
        { at: "2026-11-03T10:05", text: "Started by N. Perera with the shipping line checklist v1.3." },
        { at: "2026-11-03T10:20", text: "6 materials uploaded and classified. Completeness check: 2 materials missing." },
        { at: "2026-11-03T15:20", text: "Draft v1 generated on Qwen (self-hosted). Nothing left the CICT VPC." },
        { at: "2026-11-05T11:00", text: "Bank account confirmation requested through Finance." },
        { at: "2026-11-07T09:30", text: "Audited financial statements 2025 received." },
        { at: "2026-11-09T16:40", text: "Draft v2 saved by N. Perera and sent for review (REV-0206)." },
        { at: "2026-11-10T09:16", text: "Port operator licence register unreachable. Retry scheduled at 18:00." }
      ] },
    { id: "DD-2026-019", counterparty: "Bluewater Security Services", contractId: "CON-2026-030", businessType: "Service contractor", checklist: "Service contractor due diligence v2.0",
      status: "Collecting materials", rating: "Not rated", started: "2026-11-06", startedBy: "legal", version: "No report yet", nextReview: "Set on approval",
      dataClass: "Internal", model: "m-qwen-sh",
      scope: ["Entity status and registration", "Ownership and control", "Licences", "Financial standing", "Staff vetting"],
      sources: [
        { id: "S1", source: "Company registry extract", type: "Uploaded material", queried: "2026-11-06T14:10", result: "Registered and active since 2011.", status: "Done", how: "Uploaded by N. Perera. Read inside the CICT VPC." },
        { id: "S2", source: "OFAC and EU sanctions lists", type: "Local list copy", queried: "2026-11-10T06:00", result: "No match.", status: "Done", how: "Matched inside the CICT VPC against the local copy." }
      ],
      crossCheck: [
        { id: "X1", field: "Registered name", uploaded: "Bluewater Security Services (Pvt) Ltd", registry: "Bluewater Security Services (Pvt) Ltd", result: "Match" }
      ],
      findings: [
        { id: "DF1", area: "Staff vetting", rating: "To verify", flag: "Material unavailable", status: "Open", source: "Checklist", finding: "The staff vetting policy has not been provided. Guards will have gate access.", action: "Request the vetting policy and sample vetting records." }
      ],
      outstanding: [
        { id: "M1", item: "Ownership chart", from: "Bluewater Security Services", requested: "2026-11-06", due: "2026-11-13", status: "Requested" },
        { id: "M2", item: "Audited financial statements 2025", from: "Bluewater Security Services", requested: "2026-11-06", due: "2026-11-13", status: "Requested" },
        { id: "M3", item: "Staff vetting policy", from: "Bluewater Security Services", requested: "2026-11-06", due: "2026-11-13", status: "Requested" },
        { id: "M4", item: "References from two clients", from: "Bluewater Security Services", requested: "2026-11-06", due: "2026-11-20", status: "Requested" }
      ],
      materials: [
        { name: "Registry extract.pdf", added: "2026-11-06", dataClass: "Internal" },
        { name: "Trade licence 2026.pdf", added: "2026-11-06", dataClass: "Internal" },
        { name: "Insurance certificate 2026.pdf", added: "2026-11-06", dataClass: "Internal" }
      ],
      actions: ["Collect the four outstanding materials before a report is drafted."],
      ratingNote: "Not rated yet: 4 of 7 required materials are missing. Missing information is not treated as no risk.",
      versions: [], process: [
        { at: "2026-11-06T14:00", text: "Started by N. Perera with the service contractor checklist v2.0." },
        { at: "2026-11-06T14:10", text: "3 materials uploaded. Completeness check: 4 materials missing." }
      ] },
    { id: "DD-2024-031", counterparty: "Northwind Crane Services", contractId: "CON-2024-051", businessType: "Service contractor", checklist: "Service contractor due diligence v1.4",
      status: "Review due", rating: "Medium", started: "2024-03-05", startedBy: "legal", version: "v3 (approved)", nextReview: "2026-03-20",
      dataClass: "Sensitive", model: null,
      conclusion: { decision: "Approved with conditions", by: "S. Silva", at: "2024-03-20", conditions: "Yearly insurance certificate. Review every 2 years." },
      scope: ["Entity status and registration", "Ownership and control", "Licences", "Financial standing"],
      sources: [{ id: "S1", source: "Company registry extract", type: "Uploaded material", queried: "2024-03-05T09:00", result: "Registered and active.", status: "Done", how: "Manual check in LAMS, before the assistant." }],
      crossCheck: [], findings: [
        { id: "DF1", area: "Financial standing", rating: "Medium", flag: "", status: "Done", source: "Financial statements 2023", finding: "Thin cash reserves for a contract of this size.", action: "Quarterly payments in arrears, no advance." }
      ],
      outstanding: [], materials: [{ name: "Due diligence report v3.pdf", added: "2024-03-20", dataClass: "Sensitive" }],
      actions: ["Periodic review overdue since 20 Mar 2026. Start a refresh."], ratingNote: "Approved in 2024 with conditions.", versions: [], process: [
        { at: "2024-03-20T12:00", text: "Approved with conditions by S. Silva." },
        { at: "2026-03-20T07:00", text: "Periodic review fell due. Reminder sent to N. Perera." }
      ] },
    { id: "DD-2024-044", counterparty: "Coral Bay Marine Supplies", contractId: "CON-2025-087", businessType: "Supplier", checklist: "Supplier due diligence v1.1",
      status: "Approved", rating: "Low", started: "2024-11-12", startedBy: "legal", version: "v2 (approved)", nextReview: "2026-12-15",
      dataClass: "Internal", model: null,
      conclusion: { decision: "Approved", by: "S. Silva", at: "2024-12-02", conditions: "None." },
      scope: ["Entity status and registration", "Ownership and control", "Financial standing"],
      sources: [{ id: "S1", source: "Company registry extract", type: "Uploaded material", queried: "2024-11-12T10:00", result: "Registered and active.", status: "Done", how: "Manual check in LAMS." }],
      crossCheck: [], findings: [], outstanding: [], materials: [{ name: "Due diligence report v2.pdf", added: "2024-12-02", dataClass: "Internal" }],
      actions: ["Periodic review due 15 Dec 2026."], ratingNote: "Approved in 2024.", versions: [], process: [{ at: "2024-12-02T15:00", text: "Approved by S. Silva." }] },
    { id: "DD-2025-008", counterparty: "Sapphire Tug Services", contractId: "CON-2026-009", businessType: "Service contractor", checklist: "Service contractor due diligence v2.0",
      status: "Approved", rating: "Low", started: "2025-12-10", startedBy: "legal", version: "v1 (approved)", nextReview: "2027-01-10",
      dataClass: "Internal", model: "m-qwen-sh",
      conclusion: { decision: "Approved", by: "S. Silva", at: "2026-01-10", conditions: "None." },
      scope: ["Entity status and registration", "Ownership and control", "Licences"],
      sources: [{ id: "S1", source: "Company registry extract", type: "Uploaded material", queried: "2025-12-10T10:00", result: "Registered and active.", status: "Done", how: "Uploaded and read inside the CICT VPC." }],
      crossCheck: [], findings: [], outstanding: [], materials: [{ name: "Due diligence report v1.pdf", added: "2026-01-10", dataClass: "Internal" }],
      actions: ["Periodic review due 10 Jan 2027."], ratingNote: "Approved.", versions: [], process: [{ at: "2026-01-10T11:00", text: "Approved by S. Silva." }] },
    { id: "DD-2026-002", counterparty: "Eastgate IT Solutions", contractId: "CON-2026-021", businessType: "Supplier", checklist: "Supplier due diligence v1.1",
      status: "Approved", rating: "Low", started: "2026-02-10", startedBy: "legal", version: "v1 (approved)", nextReview: "2027-02-28",
      dataClass: "Internal", model: "m-qwen-sh",
      conclusion: { decision: "Approved", by: "S. Silva", at: "2026-02-28", conditions: "Data must stay in the CICT VPC." },
      scope: ["Entity status and registration", "Ownership and control", "Information security"],
      sources: [{ id: "S1", source: "Company registry extract", type: "Uploaded material", queried: "2026-02-10T10:00", result: "Registered and active.", status: "Done", how: "Uploaded and read inside the CICT VPC." }],
      crossCheck: [], findings: [], outstanding: [], materials: [{ name: "Due diligence report v1.pdf", added: "2026-02-28", dataClass: "Internal" }],
      actions: ["Periodic review due 28 Feb 2027."], ratingNote: "Approved.", versions: [], process: [{ at: "2026-02-28T11:00", text: "Approved by S. Silva." }] }
  ];

  /* ---------- templates and drafting ---------- */
  var templates = [
    { id: "TPL-SVC", name: "Services agreement", version: "3", status: "Approved", effective: "2026-02-01", covers: "General and outsourced services", clauses: "services", kb: "KB-TPL-SVC", uses: 14,
      owner: "N. Perera", approvedBy: "Li Wei", versions: [{ v: "3", at: "2026-02-01", status: "Approved", note: "Arbitration seat and rules added. Liability cap default 100%." }, { v: "2", at: "2023-09-01", status: "Superseded", note: "Used for contracts signed before Feb 2026." }] },
    { id: "TPL-OUT", name: "Outsourced services agreement", version: "2.2", status: "Approved", effective: "2025-08-01", covers: "Outsourced operations with staff on site", clauses: "services", uses: 9,
      owner: "N. Perera", approvedBy: "Li Wei", versions: [{ v: "2.2", at: "2025-08-01", status: "Approved", note: "Staff vetting and data protection clauses added." }, { v: "2.1", at: "2024-02-01", status: "Superseded", note: "" }] },
    { id: "TPL-LSE", name: "Lease agreement (land and yard space)", version: "1.4", status: "Approved", effective: "2025-05-01", covers: "Leases of land, yard and office space", clauses: "lease", uses: 4,
      owner: "N. Perera", approvedBy: "Li Wei", versions: [{ v: "1.4", at: "2025-05-01", status: "Approved", note: "Rent review clause updated." }] },
    { id: "TPL-MNT", name: "Equipment maintenance agreement", version: "1.1", status: "Approved", effective: "2024-10-01", covers: "Maintenance of cranes and terminal equipment", clauses: "services", uses: 6,
      owner: "N. Perera", approvedBy: "Li Wei", pending: "1.2",
      versions: [{ v: "1.2", at: "2026-11-05", status: "In review", note: "Liability cap for critical equipment fixed at 100%. Waiting for Li Wei." }, { v: "1.1", at: "2024-10-01", status: "Approved", note: "" }] },
    { id: "TPL-SUP", name: "Supply agreement", version: "2", status: "Approved", effective: "2025-01-01", covers: "Supply of goods and spare parts", clauses: "services", uses: 11,
      owner: "D. Fonseka", approvedBy: "Li Wei", versions: [{ v: "2", at: "2025-01-01", status: "Approved", note: "Single rebate rate wording." }] },
    { id: "TPL-NDA", name: "Confidentiality agreement", version: "1", status: "Withdrawn", effective: "2022-03-01", covers: "Replaced by the headquarters template", clauses: "services", uses: 0,
      owner: "N. Perera", approvedBy: "Li Wei", versions: [{ v: "1", at: "2022-03-01", status: "Withdrawn", note: "Withdrawn on 1 Jan 2026." }] }
  ];
  var templateClauses = {
    services: [
      { id: "1", heading: "1. Parties", text: "This Agreement is made between the Company and {{counterparty}}, registration no. {{counterpartyReg}} (\"the Contractor\")." },
      { id: "2", heading: "2. Services", text: "The Contractor shall provide the following services: {{scope}}. Details are in Schedule A." },
      { id: "3", heading: "3. Term and renewal", text: "This Agreement starts on {{start}} and ends on {{end}}. {{renewalText}}" },
      { id: "4", heading: "4. Price and payment", text: "The contract price is {{currency}} {{amount}}, payable in {{instalments}} instalments of {{currency}} {{instalmentAmount}}, each within {{paymentDays}} days of a valid invoice." },
      { id: "5", heading: "5. Liability", text: "The Contractor's total liability under this Agreement is capped at {{liabilityCap}}% of the contract price." },
      { id: "6", heading: "6. Service levels", text: "Service levels, response times and service credits are set out in Schedule C, which forms part of this Agreement." },
      { id: "7", heading: "7. Disputes", text: "Disputes shall be referred to arbitration seated in Colombo under the rules of the agreed arbitration centre, governed by the laws of Sri Lanka." },
      { id: "8", heading: "8. Contract management", text: "The Company's contract manager is {{responsible}}, {{dept}}." }
    ],
    lease: [
      { id: "1", heading: "1. Parties", text: "This Lease is made between the Company (\"the Lessor\") and {{counterparty}}, registration no. {{counterpartyReg}} (\"the Lessee\")." },
      { id: "2", heading: "2. Premises and use", text: "The Lessor leases to the Lessee the following premises for the stated use: {{scope}}." },
      { id: "3", heading: "3. Term", text: "The Lease starts on {{start}} and ends on {{end}}. {{renewalText}}" },
      { id: "4", heading: "4. Rent", text: "The total rent is {{currency}} {{amount}}, payable in {{instalments}} instalments of {{currency}} {{instalmentAmount}}, each within {{paymentDays}} days of invoice." },
      { id: "5", heading: "5. Liability", text: "The Lessee's liability for damage to the premises is capped at {{liabilityCap}}% of the total rent." },
      { id: "6", heading: "6. Disputes", text: "Disputes shall be referred to arbitration seated in Colombo, governed by the laws of Sri Lanka." },
      { id: "7", heading: "7. Lease management", text: "The Company's lease manager is {{responsible}}, {{dept}}." }
    ]
  };
  var draftFields = [
    { key: "counterparty", label: "Counterparty", required: true, kind: "company" },
    { key: "counterpartyReg", label: "Registration number", required: false, kind: "text", placeholder: "PV 00000000" },
    { key: "scope", label: "Service scope", leaseLabel: "Premises and permitted use", required: true, kind: "textarea" },
    { key: "start", label: "Start date", required: true, kind: "date" },
    { key: "end", label: "End date", required: true, kind: "date" },
    { key: "currency", label: "Currency", required: true, kind: "select", options: ["USD", "LKR"] },
    { key: "amount", label: "Contract price", leaseLabel: "Total rent", required: true, kind: "number" },
    { key: "instalments", label: "Number of instalments", required: true, kind: "number" },
    { key: "instalmentAmount", label: "Instalment amount", required: true, kind: "number" },
    { key: "paymentDays", label: "Payment within (days)", required: true, kind: "number" },
    { key: "autoRenew", label: "Renews automatically", required: false, kind: "switch" },
    { key: "noticeDays", label: "Notice period (days)", required: false, kind: "number" },
    { key: "liabilityCap", label: "Liability cap (% of price)", required: true, kind: "number" },
    { key: "dept", label: "Responsible department", required: true, kind: "select", options: ["Engineering", "Procurement", "Commercial", "Security", "Facilities", "IT", "Marine operations"] },
    { key: "responsible", label: "Contract manager", required: true, kind: "select", options: ["N. Perera", "D. Fonseka", "T. Bandara", "H. Kumara", "S. Silva", "P. Senanayake"] }
  ];
  var draftDefaults = { currency: "USD", paymentDays: 30, autoRenew: false, noticeDays: 60, liabilityCap: 100 };
  var sampleDraft = {
    counterparty: "Bluewater Security Services (Pvt) Ltd", counterpartyReg: "PV 00456789",
    scope: "Manned guarding of the terminal gates, yard patrols and CCTV monitoring, 24 hours a day",
    start: "2026-12-01", end: "2028-11-30", currency: "USD", amount: 318000, instalments: 24, instalmentAmount: 13500,
    paymentDays: 30, autoRenew: true, noticeDays: 30, liabilityCap: 50, dept: "Security", responsible: ""
  };
  var dialogue = [
    { f: "counterparty", q: "Who is the other party?", chips: ["Bluewater Security Services (Pvt) Ltd"] },
    { f: "scope", q: "What will they do for the Company?", chips: ["Manned guarding of the terminal gates, yard patrols and CCTV monitoring, 24 hours a day"] },
    { f: "start", q: "When should the services start?", chips: ["1 Dec 2026"] },
    { f: "end", q: "And when should they end?", chips: ["30 Nov 2028"] },
    { f: "amount", q: "What is the total contract price in USD?", chips: ["318,000"] },
    { f: "instalments", q: "How many instalments?", chips: ["24"] },
    { f: "instalmentAmount", q: "How much is each instalment?", chips: ["13,250", "13,500"] },
    { f: "liabilityCap", q: "What liability cap, as a percentage of the price?", chips: ["100", "50"] },
    { f: "dept", q: "Which department is responsible?", chips: ["Security", "Procurement"] },
    { f: "responsible", q: "Who will manage the contract for the Company?", chips: ["D. Fonseka", "N. Perera"] }
  ];
  var companies = ["Northwind Crane Services (Pvt) Ltd", "Coral Bay Marine Supplies", "Meridian Freight Lines Ltd", "Sapphire Tug Services",
    "Eastgate IT Solutions", "Harbourline Logistics", "Bluewater Security Services (Pvt) Ltd", "Greenfield Facility Management"];

  D.contractsArea = {
    extras: extras, obligationDetails: obligationDetails, milestones: milestones, reminders: reminders,
    checklists: checklists, reviewItems: { "CON-2024-051": reviewItems }, keyClauses: { "CON-2024-051": keyClauses },
    interdependent: { "CON-2024-051": interdependent }, reviewSummary: { "CON-2024-051": reviewSummary },
    ddChecklists: ddChecklists, dueDiligence: dueDiligence,
    templates: templates, templateClauses: templateClauses, draftFields: draftFields, draftDefaults: draftDefaults,
    sampleDraft: sampleDraft, dialogue: dialogue, companies: companies
  };
})();
