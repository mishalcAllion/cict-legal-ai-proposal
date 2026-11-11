/* Mock data for screen area: compliance-board (routes compliance, screening, board).
   Every name, company, list entry, document and figure here is a fictional sample. */
(function () {
  "use strict";
  var D = window.APP_DATA;

  /* ---------- sample documents cited by these screens (DocViewer shape) ---------- */
  var documents = [
    { id: "CB-CON-087", title: "Marine spares supply agreement (sample extract)", kind: "Contract", totalPages: 11, dataClass: "Sensitive", version: "Signed 15 Dec 2024",
      pages: [
        { n: 4, clauses: [{ id: "6.1", heading: "6.1 Prices", text: "Unit prices are as set out in Schedule 1 and are fixed for the term. Any change needs a written amendment signed by both parties." }] },
        { n: 5, clauses: [
          { id: "8.1", heading: "8.1 Volume rebate", text: "The Supplier shall grant the Company a volume rebate of two and a half per cent (2.5%) of the net invoiced value each quarter." },
          { id: "8.2", heading: "8.2 Changes to the rebate", text: "Any change to the rebate rate requires a written amendment signed by both parties and approved under the Company's delegation of authority." }] },
        { n: 9, clauses: [{ id: "S1", heading: "Schedule 1, price schedule", text: "Item 14, hydraulic hose assembly HX-220: USD 412 per unit. Item 15, slew bearing seal kit SB-90: USD 1,960 per kit." }] }
      ] },
    { id: "CB-CON-033", title: "Berth services tariff agreement (sample extract)", kind: "Contract", totalPages: 9, dataClass: "Sensitive", version: "Signed 20 Jan 2024",
      pages: [
        { n: 3, clauses: [
          { id: "4.1", heading: "4.1 Tariff", text: "Berth charges follow the Company's published berth tariff in force on the date of each vessel call." },
          { id: "4.2", heading: "4.2 Waivers", text: "The Company may grant a tariff waiver of up to ten per cent (10%) of the published berth tariff for any vessel call. Any waiver above 10% requires prior written approval of the Chief Commercial Officer and a record of the reason." }] }
      ] },
    { id: "CB-CON-102", title: "Shipping services agreement (sample extract)", kind: "Contract", totalPages: 16, dataClass: "Sensitive", version: "Signed 20 May 2025",
      pages: [
        { n: 7, clauses: [{ id: "11.3", heading: "11.3 Payments", text: "All payments shall be made to the Service Provider's account no. 4410-0098-2231 at Harbour Commercial Bank, Colombo. A change of account is valid only if confirmed in writing by two authorised signatories and verified by a call-back to a known number." }] }
      ] },
    { id: "CB-CON-014", title: "Cleaning and facility services agreement (sample extract)", kind: "Contract", totalPages: 10, dataClass: "Internal", version: "Signed 25 May 2023",
      pages: [
        { n: 8, clauses: [{ id: "S2", heading: "Schedule 2, rates", text: "Monthly service fee: USD 4,200. Additional services only under a written work order approved by Facilities, at the rates in this Schedule." }] }
      ] },
    { id: "CB-CON-021", title: "Terminal software licence (sample extract)", kind: "Contract", totalPages: 26, dataClass: "Internal", version: "Signed 10 Mar 2026",
      pages: [
        { n: 11, clauses: [{ id: "7.4", heading: "7.4 Invoicing", text: "Support hours are invoiced monthly in arrears, in one invoice per month, with a timesheet for each engineer." }] }
      ] },
    { id: "CB-CON-009", title: "Harbour towage services agreement (sample extract)", kind: "Contract", totalPages: 8, dataClass: "Internal", version: "Signed 25 Jan 2026",
      pages: [
        { n: 4, clauses: [{ id: "5.3", heading: "5.3 Discounts", text: "Any discount on the agreed towage rates must be approved in advance by the Marine operations manager and recorded in the procurement system." }] }
      ] },
    { id: "CB-DOA", title: "Delegation of authority v2 (sample extract)", kind: "Policy", totalPages: 9, dataClass: "Internal", version: "v2, in force from 1 Jan 2025",
      pages: [
        { n: 3, clauses: [
          { id: "A.4", heading: "Schedule A, item 4: purchase orders", text: "Purchase orders for goods and services: Procurement officer up to USD 10,000; Engineering manager up to USD 100,000; Chief Executive Officer up to USD 500,000; above USD 500,000, the Board." },
          { id: "A.6", heading: "Schedule A, item 6: major contracts", text: "Contracts with a total value above USD 1,000,000, or a term above three years including renewals, require Board approval." }] },
        { n: 4, clauses: [
          { id: "B.3", heading: "B.3 No splitting", text: "Purchases must not be split into smaller orders to bring them under an approval limit." },
          { id: "B.5", heading: "B.5 Tariff waivers", text: "Tariff waivers above the contract limit need prior written approval of the Chief Commercial Officer." }] },
        { n: 5, clauses: [{ id: "C.2", heading: "C.2 Leavers", text: "Approval rights end on the person's last working day. Delegations held by a leaver lapse automatically and may not be used by others." }] }
      ] },
    { id: "CB-AOA", title: "Articles of Association (sample extract)", kind: "Constitutional document", totalPages: 48, dataClass: "Internal", version: "Amended 15 Nov 2021",
      pages: [
        { n: 19, clauses: [{ id: "art87", heading: "Article 87, powers of the Directors", text: "The business of the Company shall be managed by the Directors, who may exercise all powers of the Company not required by the Act or these Articles to be exercised by the Company in general meeting." }] },
        { n: 21, clauses: [{ id: "art98", heading: "Article 98, interested directors", text: "A director who is in any way interested in a contract or proposed contract with the Company shall declare the nature of the interest at the meeting of the Directors and shall not vote on it or be counted in the quorum for it." }] }
      ] },
    { id: "CB-CMP", title: "Company Management Policies 2025.1 (sample extract)", kind: "Policy", totalPages: 62, dataClass: "Internal", version: "2025.1, in force from 1 Jan 2025",
      pages: [
        { n: 14, clauses: [{ id: "5.2", heading: "5.2 Matters reserved to the Board", text: "The following are reserved to the Board: (a) contracts with a value above the Chief Executive Officer's limit; (b) related-party transactions of any value; (c) company policies on compliance, procurement and anti-bribery." }] },
        { n: 15, clauses: [{ id: "5.4", heading: "5.4 Board papers", text: "Each paper for decision shall include the decision sought, background, financial evaluation, risk assessment, legal review and recommendation. Papers are due to the Company Secretary ten (10) working days before the meeting." }] }
      ] },
    { id: "CB-RPT", title: "Related-party register 2026 (sample)", kind: "Register", totalPages: 3, dataClass: "Confidential", version: "Updated 1 Oct 2026",
      pages: [
        { n: 1, clauses: [
          { id: "RP-03", heading: "RP-03", text: "Director M. Chen (sample) is a non-executive director of Northwind Group Holdings, the parent company of Northwind Crane Services (Pvt) Ltd." },
          { id: "RP-07", heading: "RP-07", text: "Director D. Wickramasinghe (sample) holds 12% of Harbourline Holdings Ltd, the parent company of Harbourline Logistics." }] }
      ] },
    { id: "CB-MIN-2024-01", title: "Board minutes, Q1 2024 meeting (sample)", kind: "Minutes", totalPages: 15, dataClass: "Confidential", version: "Approved 23 May 2024",
      pages: [
        { n: 2, clauses: [
          { id: "item3", heading: "Item 3. Crane maintenance agreement", text: "The Board considered the award of the crane maintenance agreement for the twelve quay cranes. Director M. Chen declared an interest in Northwind Group Holdings and did not vote." },
          { id: "res2024-04", heading: "Resolution 2024/04", text: "RESOLVED that the Company enter into the crane maintenance agreement with Northwind Crane Services (Pvt) Ltd for three years at a total price not exceeding USD 1.5 million, subject to legal review of the liability cap." }] },
        { n: 7, clauses: [{ id: "item8", heading: "Item 8. Tariff waivers", text: "The Board asked Commercial to report every berth tariff waiver above 10% to the Audit and Risk Committee each quarter." }] }
      ] },
    { id: "CB-MIN-2025-03", title: "Board minutes, Q3 2025 meeting (sample)", kind: "Minutes", totalPages: 18, dataClass: "Confidential", version: "Approved 27 Nov 2025",
      pages: [
        { n: 4, clauses: [{ id: "item6", heading: "Item 6. Crane maintenance", text: "The Board noted quay crane availability of 96.1% against a target of 97%. The Board asked management to report on contractor performance before any renewal of the crane maintenance agreement." }] },
        { n: 9, clauses: [{ id: "res2025-19", heading: "Resolution 2025/19", text: "RESOLVED that Procurement policy v3.2 remains in force until a revised policy is approved by the Board." }] },
        { n: 11, clauses: [{ id: "item9", heading: "Item 9. Related parties", text: "Director D. Wickramasinghe declared an interest in Harbourline Holdings Ltd and left the meeting for the discussion of berth tariffs." }] }
      ] },
    { id: "CB-MIN-2026-02", title: "Board minutes, Q2 2026 meeting (sample)", kind: "Minutes", totalPages: 14, dataClass: "Confidential", version: "Approved 27 Aug 2026",
      pages: [
        { n: 5, clauses: [{ id: "item4", heading: "Item 4. Sanctions screening", text: "The Board noted that counterparty screening against the OFAC and EU lists will cover all shipping lines from Q4 2026, with each possible match decided by the Compliance officer." }] },
        { n: 8, clauses: [{ id: "res2026-11", heading: "Resolution 2026/11", text: "RESOLVED that the Procurement policy v3.3 is approved with effect from 1 April 2026." }] }
      ] }
  ];

  /* ---------- compliance: anomaly rules, runs and alerts (SOW 3.4.1) ---------- */
  var rules = [
    { id: "RUL-01", name: "Rebate above contract rate", logic: "Rebate paid on a payment is more than 0.25 points above the rate in the contract", severity: "High", sources: ["Contracts", "Payments", "Rebates"], hits30: 3, active: true, owner: "R. Fernando", version: "1.2" },
    { id: "RUL-02", name: "Waiver above contract limit", logic: "Tariff waiver on a vessel call is above the contract limit and no approval record is linked", severity: "High", sources: ["Contracts", "Tariff waivers", "Approvals"], hits30: 3, active: true, owner: "R. Fernando", version: "1.0" },
    { id: "RUL-03", name: "Payee account differs from contract", logic: "Bank account on the payment differs from the account in the contract and no verified change is on file", severity: "High", sources: ["Contracts", "Payments", "Vendor master"], hits30: 1, active: true, owner: "R. Fernando", version: "1.1" },
    { id: "RUL-04", name: "Price above contract schedule", logic: "Invoiced unit price is more than 3% above the contract price schedule", severity: "Medium", sources: ["Contracts", "Invoices"], hits30: 2, active: true, owner: "R. Fernando", version: "1.0" },
    { id: "RUL-05", name: "Discount without approval record", logic: "Discount given on an invoice with no approval record in the procurement system", severity: "Low", sources: ["Invoices", "Approvals"], hits30: 1, active: true, owner: "R. Fernando", version: "1.0" },
    { id: "RUL-06", name: "Split invoices below approval limit", logic: "Two or more invoices from one supplier on the same day, each just under an approval limit, adding up to more than it", severity: "Medium", sources: ["Invoices", "Approvals", "Delegation of authority"], hits30: 1, active: true, owner: "R. Fernando", version: "1.0" },
    { id: "RUL-07", name: "Payment before contract signature", logic: "First payment date is earlier than the contract signature date", severity: "Medium", sources: ["Contracts", "Payments"], hits30: 0, active: true, owner: "R. Fernando", version: "1.0" },
    { id: "RUL-08", name: "Commission to an unlisted agent", logic: "Commission paid to a party that is not named in the contract", severity: "High", sources: ["Contracts", "Payments"], hits30: 0, active: false, owner: "R. Fernando", version: "0.9 draft" }
  ];

  var runs = [
    { id: "RUN-0012", at: "2026-11-09T22:00", by: "system", scope: "All active contracts, 1 Oct to 31 Oct 2026", sources: "Finance system import (payments, rebates, discounts), Commercial import (waivers)", rows: 4318, contracts: 41, alerts: 5, status: "Completed" },
    { id: "RUN-0011", at: "2026-10-12T22:00", by: "system", scope: "All active contracts, 1 Sep to 30 Sep 2026", sources: "Finance system import, Commercial import", rows: 3977, contracts: 40, alerts: 3, status: "Completed" },
    { id: "RUN-0010", at: "2026-10-03T11:20", by: "compliance", scope: "Facility services contracts, 2026 to date", sources: "Manual upload: facility invoices 2026.xlsx (212 rows)", rows: 212, contracts: 3, alerts: 1, status: "Completed" },
    { id: "RUN-0009", at: "2026-09-14T22:00", by: "system", scope: "All active contracts, 1 Aug to 31 Aug 2026", sources: "Finance system import, Commercial import", rows: 4102, contracts: 40, alerts: 0, status: "Completed with warnings", warning: "Commercial import arrived 6 hours late; waivers checked on the next run." }
  ];

  var alerts = [
    { id: "ANM-0034", severity: "High", ruleId: "RUL-01", rule: "Rebate above contract rate", contractId: "CON-2025-087", counterparty: "Coral Bay Marine Supplies",
      contractSays: "Rebate 2.5% of net invoiced value", dataShows: "4.0% paid on 3 quarterly payments", difference: 6200, diffLabel: "USD 6,200 paid above the contract rate",
      detected: "2026-10-13T06:10", runId: "RUN-0011", status: "In review", caseId: "CC-2026-031", assigneeId: "compliance", dataClass: "Sensitive",
      cite: { doc: "CB-CON-087", clause: "8.1", page: 5 }, cite2: { doc: "CB-CON-087", clause: "8.2", page: 5 },
      checks: ["Find who approved the higher rebate and on what basis", "Check for a signed amendment to clause 8.1", "Compare with rebates paid to other marine suppliers"],
      rows: [
        { id: "PAY-88120", date: "2026-04-15", ref: "Rebate credit note CN-CB-114", base: 136000, rate: "4.0%", paid: 5440, expected: 3400, diff: 2040 },
        { id: "PAY-88457", date: "2026-07-15", ref: "Rebate credit note CN-CB-127", base: 141500, rate: "4.0%", paid: 5660, expected: 3538, diff: 2122 },
        { id: "PAY-88903", date: "2026-10-15", ref: "Rebate credit note CN-CB-139", base: 135900, rate: "4.0%", paid: 5436, expected: 3398, diff: 2038 }],
      files: [{ name: "Rebate calculation Q3 2026.xlsx", meta: "Uploaded by H. Kumara, 4 Nov 2026" }, { name: "Email, rebate rate query.pdf", meta: "Uploaded by R. Fernando, 5 Nov 2026" }],
      notes: [
        { at: "2026-10-13T06:10", actorId: "system", kind: "system", text: "Alert raised by rule RUL-01 on run RUN-0011." },
        { at: "2026-10-14T09:20", actorId: "compliance", kind: "status", text: "Case CC-2026-031 opened and assigned to R. Fernando." },
        { at: "2026-11-04T11:05", actorId: "compliance", kind: "note", text: "Asked Finance for the approval behind the 4.0% rate. H. Kumara uploaded the rebate calculation. No signed amendment found in Records." },
        { at: "2026-11-05T15:40", actorId: "compliance", kind: "note", text: "Procurement says the rate was agreed by email in March 2026. Waiting for the email and the approver's name." }] },
    { id: "ANM-0035", severity: "High", ruleId: "RUL-02", rule: "Waiver above contract limit", contractId: "CON-2024-033", counterparty: "Harbourline Logistics",
      contractSays: "Waiver up to 10% of the berth tariff", dataShows: "15% waived on 3 vessel calls, no approval linked", difference: 18450, diffLabel: "USD 18,450 waived above the limit",
      detected: "2026-11-09T22:04", runId: "RUN-0012", status: "New", caseId: null, assigneeId: null, dataClass: "Confidential",
      cite: { doc: "CB-CON-033", clause: "4.2", page: 3 }, cite2: { doc: "CB-DOA", clause: "B.5", page: 4 },
      checks: ["Check for the Chief Commercial Officer's written approval", "Confirm the reason recorded for each waiver", "Note the related-party link: see agenda item AG-2026-04-6"],
      rows: [
        { id: "WVR-2231", date: "2026-10-04", ref: "Vessel call VC-77812", base: 123000, rate: "15%", paid: 18450, expected: 12300, diff: 6150 },
        { id: "WVR-2240", date: "2026-10-17", ref: "Vessel call VC-77955", base: 123000, rate: "15%", paid: 18450, expected: 12300, diff: 6150 },
        { id: "WVR-2262", date: "2026-10-29", ref: "Vessel call VC-78120", base: 123000, rate: "15%", paid: 18450, expected: 12300, diff: 6150 }],
      files: [], notes: [{ at: "2026-11-09T22:04", actorId: "system", kind: "system", text: "Alert raised by rule RUL-02 on run RUN-0012. Payment data is Confidential, so the comparison ran on the self-hosted model only." }] },
    { id: "ANM-0036", severity: "High", ruleId: "RUL-03", rule: "Payee account differs from contract", contractId: "CON-2025-102", counterparty: "Meridian Freight Lines",
      contractSays: "Pay to account 4410-0098-2231 only", dataShows: "USD 84,000 paid to account 7702-1150-0046", difference: 84000, diffLabel: "USD 84,000 to an account not in the contract",
      detected: "2026-11-09T22:05", runId: "RUN-0012", status: "Escalated", caseId: "CC-2026-034", assigneeId: "compliance", dataClass: "Sensitive",
      cite: { doc: "CB-CON-102", clause: "11.3", page: 7 }, cite2: null,
      checks: ["Confirm the bank details with Meridian Freight Lines using a known phone number", "Check the vendor master change log for a verified change", "Hold further payments to the new account until confirmed"],
      rows: [{ id: "PAY-89011", date: "2026-10-30", ref: "Invoice MFL-2026-0418", base: 84000, rate: "n/a", paid: 84000, expected: 0, diff: 84000 }],
      files: [{ name: "Vendor master change log, Oct 2026.pdf", meta: "Finance system export" }],
      notes: [
        { at: "2026-11-09T22:05", actorId: "system", kind: "system", text: "Alert raised by rule RUL-03 on run RUN-0012." },
        { at: "2026-11-10T08:40", actorId: "compliance", kind: "status", text: "Case CC-2026-034 opened. Escalated to Legal: possible payment diversion. Further payments to the new account put on hold by Finance." }] },
    { id: "ANM-0037", severity: "Medium", ruleId: "RUL-06", rule: "Split invoices below approval limit", contractId: "CON-2026-021", counterparty: "Eastgate IT Solutions",
      contractSays: "One support invoice per month", dataShows: "2 invoices of USD 9,800 on the same day", difference: 19600, diffLabel: "USD 19,600 approved as two orders under a USD 10,000 limit",
      detected: "2026-11-09T22:06", runId: "RUN-0012", status: "New", caseId: null, assigneeId: null, dataClass: "Internal",
      cite: { doc: "CB-CON-021", clause: "7.4", page: 11 }, cite2: { doc: "CB-DOA", clause: "B.3", page: 4 },
      checks: ["Ask Procurement why the work was ordered in two parts", "Check whether the officer who approved both has a USD 10,000 limit", "See approval check KPA-0014"],
      rows: [
        { id: "INV-EG-5521", date: "2026-10-21", ref: "PO-2026-1022", base: 9800, rate: "n/a", paid: 9800, expected: null, diff: null },
        { id: "INV-EG-5522", date: "2026-10-21", ref: "PO-2026-1023", base: 9800, rate: "n/a", paid: 9800, expected: null, diff: null }],
      files: [], notes: [{ at: "2026-11-09T22:06", actorId: "system", kind: "system", text: "Alert raised by rule RUL-06 on run RUN-0012." }] },
    { id: "ANM-0038", severity: "Low", ruleId: "RUL-04", rule: "Price above contract schedule", contractId: "CON-2025-087", counterparty: "Coral Bay Marine Supplies",
      contractSays: "Item 14 at USD 412 per unit", dataShows: "Invoiced at USD 441 per unit (40 units)", difference: 1160, diffLabel: "USD 1,160 above the price schedule",
      detected: "2026-11-09T22:06", runId: "RUN-0012", status: "New", caseId: null, assigneeId: null, dataClass: "Sensitive",
      cite: { doc: "CB-CON-087", clause: "S1", page: 9 }, cite2: { doc: "CB-CON-087", clause: "6.1", page: 4 },
      checks: ["Check for a price amendment", "Ask Procurement whether a different part number was supplied"],
      rows: [{ id: "INV-CB-7731", date: "2026-10-08", ref: "PO-2026-0961", base: 17640, rate: "USD 441 x 40", paid: 17640, expected: 16480, diff: 1160 }],
      files: [], notes: [{ at: "2026-11-09T22:06", actorId: "system", kind: "system", text: "Alert raised by rule RUL-04 on run RUN-0012." }] },
    { id: "ANM-0031", severity: "Medium", ruleId: "RUL-04", rule: "Price above contract schedule", contractId: "CON-2023-014", counterparty: "Greenfield Facility Management",
      contractSays: "Monthly fee USD 4,200; extras by work order", dataShows: "Final invoice USD 7,350 with no work order", difference: 3150, diffLabel: "USD 3,150 above the contract fee",
      detected: "2026-10-03T11:24", runId: "RUN-0010", status: "In review", caseId: "CC-2026-029", assigneeId: "compliance", dataClass: "Internal",
      cite: { doc: "CB-CON-014", clause: "S2", page: 8 }, cite2: null,
      checks: ["Ask Facilities for the work orders behind the extra USD 3,150", "Do not pay the balance until matched"],
      rows: [{ id: "INV-GF-0612", date: "2026-06-05", ref: "Final invoice, May 2026", base: 7350, rate: "n/a", paid: 0, expected: 4200, diff: 3150 }],
      files: [{ name: "Facility invoices 2026.xlsx", meta: "Manual upload, 212 rows" }],
      notes: [
        { at: "2026-10-03T11:24", actorId: "system", kind: "system", text: "Alert raised by rule RUL-04 on run RUN-0010 (manual upload)." },
        { at: "2026-10-06T10:00", actorId: "compliance", kind: "note", text: "Facilities says the extra was a deep clean after a berth spill. Work order not yet found." }] },
    { id: "ANM-0029", severity: "Low", ruleId: "RUL-05", rule: "Discount without approval record", contractId: "CON-2026-009", counterparty: "Sapphire Tug Services",
      contractSays: "Discounts need prior approval", dataShows: "5% discount on 2 invoices", difference: 1240, diffLabel: "USD 1,240 in discounts",
      detected: "2026-10-13T06:12", runId: "RUN-0011", status: "Closed: no issue", caseId: "CC-2026-030", assigneeId: "compliance", dataClass: "Internal",
      cite: { doc: "CB-CON-009", clause: "5.3", page: 4 }, cite2: null, checks: ["Find the approval record"],
      rows: [{ id: "INV-ST-0398", date: "2026-09-02", ref: "Towage, September", base: 12400, rate: "5%", paid: 620, expected: 0, diff: 620 }, { id: "INV-ST-0411", date: "2026-09-30", ref: "Towage, October", base: 12400, rate: "5%", paid: 620, expected: 0, diff: 620 }],
      files: [{ name: "Approval AP-2026-1180.pdf", meta: "Procurement system" }],
      conclusion: { decision: "No issue found", by: "compliance", at: "2026-10-20T14:30", text: "Approval AP-2026-1180 by the Marine operations manager was found in the procurement system. The import had not linked it. Import mapping fixed." },
      notes: [{ at: "2026-10-13T06:12", actorId: "system", kind: "system", text: "Alert raised by rule RUL-05." }, { at: "2026-10-20T14:30", actorId: "compliance", kind: "decision", text: "Closed: no issue found. Approval AP-2026-1180 found." }] },
    { id: "ANM-0027", severity: "Medium", ruleId: "RUL-07", rule: "Payment before contract signature", contractId: "CON-2024-051", counterparty: "Northwind Crane Services (Pvt) Ltd",
      contractSays: "Signed 12 Apr 2024", dataShows: "First instalment paid 28 Mar 2024", difference: 123000, diffLabel: "USD 123,000 paid 15 days before signature",
      detected: "2026-09-14T22:10", runId: "RUN-0009", status: "Closed: issue confirmed", caseId: "CC-2026-024", assigneeId: "compliance", dataClass: "Sensitive",
      cite: { doc: "CON-2024-051", clause: "1", page: 1 }, cite2: null, checks: ["Confirm the work order date", "Check the control over contract start"],
      rows: [{ id: "PAY-71002", date: "2024-03-28", ref: "Instalment 1", base: 123000, rate: "n/a", paid: 123000, expected: 0, diff: 123000 }],
      files: [{ name: "Work order WO-118.pdf", meta: "REC-2024-0141" }],
      conclusion: { decision: "Issue confirmed", by: "compliance", at: "2026-09-22T16:00", text: "Work and payment started before signature. Not a bribery finding. Process gap moved to remediation RM-2026-04.", remediationId: "RM-2026-04" },
      notes: [{ at: "2026-09-14T22:10", actorId: "system", kind: "system", text: "Alert raised by rule RUL-07." }, { at: "2026-09-22T16:00", actorId: "compliance", kind: "decision", text: "Closed: issue confirmed. Remediation RM-2026-04 raised." }] }
  ];

  /* ---------- compliance checks (SOW 3.4.3) ---------- */
  var checks = [
    { id: "CHK-2026-014", title: "Marine spares purchases, Q3 2026", area: "Procurement", period: "1 Jul to 30 Sep 2026", subject: "Coral Bay Marine Supplies, CON-2025-087",
      basis: ["Procurement policy 3.3", "Delegation of authority v2", "Anti-bribery policy (headquarters) 2024", "Contract CON-2025-087"],
      materials: ["Contract CON-2025-087 (REC-2025-0310)", "14 payment records from the finance system", "3 approval records", "Gifts and hospitality register 2025 (REC-2026-0201)"],
      status: "Results to confirm", ownerId: "compliance", createdAt: "2026-11-06T10:00", model: "Qwen (self-hosted)", dataClass: "Sensitive",
      results: [
        { id: "R1", check: "Signed contract in place before purchases", finding: "Signed contract on file, dated 15 Dec 2024.", rating: "Low", outcome: "Passed", source: "REC-2025-0310, page 11", basis: "Procurement policy 3.3, section 4.1", action: "None" },
        { id: "R2", check: "Invoiced prices match the price schedule", finding: "Item 14 invoiced at USD 441 per unit; Schedule 1 says USD 412.", rating: "Medium", outcome: "Gap", source: "Invoice INV-CB-7731; contract Schedule 1, page 9", basis: "Contract clause 6.1", action: "Ask Procurement for the price change approval or recover USD 1,160", cite: { doc: "CB-CON-087", clause: "S1", page: 9 } },
        { id: "R3", check: "Rebates paid at the contract rate", finding: "4.0% paid on three quarterly payments; contract rate is 2.5%. Linked to alert ANM-0034.", rating: "High", outcome: "Gap", source: "Credit notes CN-CB-114, 127, 139", basis: "Contract clause 8.1 and 8.2", action: "Confirm who approved the higher rate; recover or amend", cite: { doc: "CB-CON-087", clause: "8.1", page: 5 } },
        { id: "R4", check: "Purchase orders approved within authority", finding: "Approval record for PO-2026-0917 was not provided, so this can't be assessed.", rating: "Not rated", outcome: "Can't be assessed", source: "PO-2026-0917", basis: "Delegation of authority v2, Schedule A item 4", action: "Upload the approval record for PO-2026-0917", cite: { doc: "CB-DOA", clause: "A.4", page: 3 } },
        { id: "R5", check: "Gifts from the supplier declared", finding: "Two entries in the register, both below LKR 5,000 and declared.", rating: "Low", outcome: "Passed", source: "REC-2026-0201, rows 41 and 58", basis: "Anti-bribery policy (headquarters) 2024, section 6", action: "None" }] },
    { id: "CHK-2026-013", title: "Berth tariff waivers, Q3 2026", area: "Commercial", period: "1 Jul to 30 Sep 2026", subject: "All berth tariff agreements",
      basis: ["Delegation of authority v2", "Board instruction, Resolution 2024 item 8"], materials: ["9 tariff agreements", "212 waiver records", "Approval records from the commercial system"],
      status: "Confirmed", ownerId: "compliance", createdAt: "2026-10-15T09:00", confirmedBy: "compliance", confirmedAt: "2026-10-22T16:10", model: "Qwen (self-hosted)", dataClass: "Confidential",
      results: [
        { id: "R1", check: "Waivers within contract limits", finding: "7 waivers above the 10% limit, all on Harbourline Logistics vessel calls.", rating: "High", outcome: "Gap", source: "Waiver records WVR-1980 to WVR-2104", basis: "Contract clause 4.2", action: "Moved to remediation RM-2026-08", cite: { doc: "CB-CON-033", clause: "4.2", page: 3 } },
        { id: "R2", check: "Waivers above limit reported to the Audit and Risk Committee", finding: "Not reported in the Q3 committee pack.", rating: "Medium", outcome: "Gap", source: "ARC-2026-03 pack", basis: "Board minutes Q1 2024, item 8", action: "Moved to remediation RM-2026-08", cite: { doc: "CB-MIN-2024-01", clause: "item8", page: 7 } },
        { id: "R3", check: "Reason recorded for each waiver", finding: "Reasons recorded for 205 of 212 waivers.", rating: "Low", outcome: "Passed", source: "Waiver records", basis: "Contract clause 4.2", action: "None" }] },
    { id: "CHK-2026-011", title: "Hospitality to public officials, H1 2026", area: "Compliance", period: "1 Jan to 30 Jun 2026", subject: "All departments",
      basis: ["Anti-bribery policy (headquarters) 2024", "Gifts and hospitality policy v3"], materials: ["Gifts and hospitality register", "Expense claims tagged hospitality (148)"],
      status: "Confirmed", ownerId: "compliance", createdAt: "2026-07-08T09:00", confirmedBy: "compliance", confirmedAt: "2026-07-20T11:00", model: "DeepSeek on Bedrock", dataClass: "Internal",
      results: [
        { id: "R1", check: "Hospitality to officials pre-approved", finding: "All 6 events had prior approval.", rating: "Low", outcome: "Passed", source: "Register rows 3 to 8", basis: "Anti-bribery policy, section 6.2", action: "None" },
        { id: "R2", check: "Expense claims match register entries", finding: "All 148 claims matched to a register entry.", rating: "Low", outcome: "Passed", source: "Expense system export", basis: "Gifts and hospitality policy v3, section 4", action: "None" }] }
  ];

  /* ---------- control tests (SOW 3.4.4) ---------- */
  var controls = [
    { id: "CT-2026-09", control: "Vendor bank detail changes need a call-back", area: "Procurement and Finance", period: "Q3 2026", stage: 2, status: "In progress", result: null,
      sampling: "25 of 118 changes: every change above USD 50,000 plus a random sample", testerId: "compliance", reviewer: "S. Ratnam, Head of Risk (sample)",
      materials: [
        { id: "M1", item: "Call-back log, Jul to Sep 2026", from: "Procurement (D. Fonseka)", requested: "2026-10-20", status: "Received", file: "Call-back log Q3 2026.xlsx" },
        { id: "M2", item: "Bank letter for change VBC-0457", from: "Finance (H. Kumara)", requested: "2026-11-03", due: "2026-11-14", status: "Outstanding" },
        { id: "M3", item: "Vendor master change report", from: "Finance (H. Kumara)", requested: "2026-10-20", status: "Received", file: "Vendor master changes Q3.pdf" }],
      samples: [
        { id: "VBC-0412", vendor: "Coral Bay Marine Supplies", date: "2026-07-03", amount: 140000, evidence: "Call-back 4 Jul, logged by D. Fonseka", result: "Pass" },
        { id: "VBC-0431", vendor: "Meridian Freight Lines", date: "2026-08-12", amount: 84000, evidence: "No call-back recorded", result: "Exception" },
        { id: "VBC-0444", vendor: "Sapphire Tug Services", date: "2026-08-28", amount: 12400, evidence: "Call-back 29 Aug", result: "Pass" },
        { id: "VBC-0450", vendor: "Greenfield Facility Management", date: "2026-09-04", amount: 4200, evidence: "Call-back 4 Sep", result: "Pass" },
        { id: "VBC-0457", vendor: "Harbourline Logistics", date: "2026-09-16", amount: 61000, evidence: "Bank letter requested", result: "Waiting" },
        { id: "VBC-0463", vendor: "Eastgate IT Solutions", date: "2026-09-22", amount: 9800, evidence: "Call-back to a number taken from the change request email", result: "Exception" }],
      sampleSummary: { tested: 22, passed: 20, exceptions: 2, waiting: 3 },
      records: [
        { at: "2026-11-04T10:30", actorId: "compliance", kind: "Interview", text: "Interview with the Procurement officer: call-backs are made from the number on the change request if the vendor master has none. This defeats the control." },
        { at: "2026-10-28T15:00", actorId: "compliance", kind: "Process walk-through", text: "Walked through a change in the finance system with H. Kumara. The system does not block payment until the call-back field is filled." }] },
    { id: "CT-2026-08", control: "Purchase orders approved within authority", area: "Engineering and Procurement", period: "Q3 2026", stage: 4, status: "Completed", result: "Partially effective",
      sampling: "40 of 286 purchase orders above USD 25,000", testerId: "compliance", reviewer: "S. Ratnam, Head of Risk (sample)", closedAt: "2026-10-30",
      materials: [{ id: "M1", item: "Purchase order approvals, Q3 2026", from: "Procurement (D. Fonseka)", requested: "2026-10-01", status: "Received", file: "PO approvals Q3.xlsx" }],
      samples: [
        { id: "PO-2026-0917", vendor: "Coral Bay Marine Supplies", date: "2026-08-19", amount: 145000, evidence: "Approved by Engineering manager (limit USD 100,000)", result: "Exception" },
        { id: "PO-2026-0884", vendor: "Northwind Crane Services", date: "2026-08-02", amount: 98000, evidence: "Approved by Engineering manager", result: "Pass" },
        { id: "PO-2026-0901", vendor: "Eastgate IT Solutions", date: "2026-08-11", amount: 41000, evidence: "Approved by CEO", result: "Pass" }],
      sampleSummary: { tested: 40, passed: 39, exceptions: 1, waiting: 0 },
      records: [{ at: "2026-10-30T12:00", actorId: "compliance", kind: "Conclusion", text: "Partially effective: 1 exception of 40. Raised RM-2026-06. Reviewed and closed by S. Ratnam." }] },
    { id: "CT-2026-07", control: "Work starts only after the contract is signed", area: "Legal", period: "Q2 and Q3 2026", stage: 4, status: "Completed", result: "Not effective",
      sampling: "20 of 61 new or renewed contracts", testerId: "compliance", reviewer: "S. Ratnam, Head of Risk (sample)", closedAt: "2026-09-22",
      materials: [{ id: "M1", item: "Work orders and signature dates", from: "Legal (N. Perera)", requested: "2026-09-01", status: "Received", file: "Contract start dates.xlsx" }],
      samples: [
        { id: "CON-2024-051", vendor: "Northwind Crane Services", date: "2024-04-12", amount: 1480000, evidence: "Work order WO-118 dated 1 Mar 2024", result: "Exception" },
        { id: "CON-2026-009", vendor: "Sapphire Tug Services", date: "2026-01-25", amount: 148000, evidence: "Start 1 Feb 2026", result: "Pass" },
        { id: "CON-2026-021", vendor: "Eastgate IT Solutions", date: "2026-03-10", amount: 72000, evidence: "Start 15 Mar 2026", result: "Pass" }],
      sampleSummary: { tested: 20, passed: 17, exceptions: 3, waiting: 0 },
      records: [{ at: "2026-09-22T16:00", actorId: "compliance", kind: "Conclusion", text: "Not effective: 3 of 20 contracts started before signature. Raised RM-2026-04." }] },
    { id: "CT-2026-10", control: "Gifts and hospitality register is complete", area: "HR and Compliance", period: "Q4 2026", stage: 0, status: "Planned", result: null,
      sampling: "Every entry above LKR 5,000, plus 20 random expense claims tagged hospitality", testerId: "compliance", reviewer: "S. Ratnam, Head of Risk (sample)",
      materials: [{ id: "M1", item: "Gifts and hospitality register, Q4 2026", from: "HR (C. de Mel)", requested: null, status: "Not requested" }],
      samples: [], sampleSummary: { tested: 0, passed: 0, exceptions: 0, waiting: 0 }, records: [] }
  ];

  /* ---------- remediation register (SOW 3.4.3, 3.4.4) ---------- */
  var remediation = [
    { id: "RM-2026-07", title: "Rebates above contract paid without approval", source: "Alert ANM-0034 and check CHK-2026-014", sourceRoute: "compliance", sourceId: "ANM-0034",
      dept: "Finance", ownerName: "H. Kumara", ownerId: null, action: "Recover the USD 6,200 overpaid or sign an amendment; add a rebate-rate check to payment approval.", due: "2026-11-30", status: "In progress", risk: "High",
      evidence: [], history: [{ at: "2026-10-22T16:20", actorId: "compliance", text: "Raised from CHK-2026-014 and ANM-0034." }, { at: "2026-11-03T09:00", actorId: "system", text: "Reminder sent to H. Kumara." }] },
    { id: "RM-2026-06", title: "Purchase order approved above the Engineering manager's limit", source: "Control test CT-2026-08", sourceRoute: "compliance", sourceId: "CT-2026-08",
      dept: "Engineering", ownerName: "T. Bandara", ownerId: null, action: "Obtain retrospective CEO approval for PO-2026-0917; add a system block on approvals above limit.", due: "2026-11-05", status: "In progress", risk: "Medium",
      evidence: [{ name: "Retrospective approval request.pdf", meta: "Uploaded by T. Bandara, 1 Nov 2026" }], history: [{ at: "2026-10-30T12:05", actorId: "compliance", text: "Raised from CT-2026-08." }, { at: "2026-11-06T09:00", actorId: "system", text: "Overdue. Reminder sent to T. Bandara and his manager." }] },
    { id: "RM-2026-04", title: "Work started before the contract was signed", source: "Control test CT-2026-07 and alert ANM-0027", sourceRoute: "compliance", sourceId: "CT-2026-07",
      dept: "Legal", ownerName: "N. Perera", ownerId: "legal", action: "Update the contract start procedure so no work order is issued before signature; brief Engineering and Procurement.", due: "2026-11-15", status: "Evidence submitted", risk: "Medium",
      evidence: [{ name: "Contract start procedure v1.1.docx", meta: "Uploaded by N. Perera, 7 Nov 2026" }, { name: "Briefing attendance list.xlsx", meta: "Uploaded by N. Perera, 7 Nov 2026" }],
      history: [{ at: "2026-09-22T16:05", actorId: "compliance", text: "Raised from CT-2026-07." }, { at: "2026-11-07T14:10", actorId: "legal", text: "Evidence submitted for review." }] },
    { id: "RM-2026-08", title: "Tariff waivers above 10% without the Chief Commercial Officer's approval", source: "Check CHK-2026-013", sourceRoute: "compliance", sourceId: "CHK-2026-013",
      dept: "Commercial", ownerName: "S. Silva", ownerId: "owner", action: "Stop waivers above 10% without written approval; report past waivers to the Audit and Risk Committee.", due: "2026-12-20", status: "Open", risk: "High",
      evidence: [], history: [{ at: "2026-10-22T16:15", actorId: "compliance", text: "Raised from CHK-2026-013." }] },
    { id: "RM-2026-05", title: "Vendor bank change without a call-back", source: "Control test CT-2026-09", sourceRoute: "compliance", sourceId: "CT-2026-09",
      dept: "Procurement", ownerName: "D. Fonseka", ownerId: null, action: "Call back on the number held in the vendor master only; block payment until the call-back is logged.", due: "2026-12-15", status: "Open", risk: "High",
      evidence: [], history: [{ at: "2026-11-05T10:00", actorId: "compliance", text: "Raised early from CT-2026-09 interview findings." }] },
    { id: "RM-2026-02", title: "Gifts register not kept up to date", source: "Compliance check, Q2 2026", sourceRoute: "compliance", sourceId: "CHK-2026-011",
      dept: "HR", ownerName: "C. de Mel", ownerId: null, action: "Monthly reminder to department heads; register reviewed quarterly.", due: "2026-09-30", status: "Closed", risk: "Low", closedBy: "compliance", closedAt: "2026-09-28T11:00",
      evidence: [{ name: "Reminder schedule.pdf", meta: "Uploaded by C. de Mel" }], history: [{ at: "2026-07-20T11:05", actorId: "compliance", text: "Raised." }, { at: "2026-09-28T11:00", actorId: "compliance", text: "Reviewed and closed by R. Fernando." }] }
  ];

  /* ---------- key-position approval checks (SOW 3.4.5) ---------- */
  var authority = [
    { id: "KPA-0014", type: "Possible split purchase", severity: "Medium", record: "PO-2026-1022 and PO-2026-1023", recordDetail: "2 purchase orders of USD 9,800 each, Eastgate IT Solutions, 21 Oct 2026",
      approver: "Procurement officer (sample user P-221)", position: "Procurement officer", approvedAt: "2026-10-21", amount: 19600, limit: "USD 10,000",
      rule: "No splitting to bring a purchase under a limit", ruleVersion: "Delegation of authority v2, in force from 1 Jan 2025 (in force on 21 Oct 2026)", cite: { doc: "CB-DOA", clause: "B.3", page: 4 },
      why: "Same supplier, same day, consecutive order numbers, each USD 200 under the officer's limit. Together they need Engineering manager approval.", status: "New", linked: "ANM-0037" },
    { id: "KPA-0013", type: "Approval after departure", severity: "High", record: "Payment voucher PV-2026-3381", recordDetail: "USD 22,400 to Greenfield Facility Management, 4 Sep 2026",
      approver: "Former Facilities supervisor (sample user F-118, left 31 Aug 2026)", position: "Facilities supervisor", approvedAt: "2026-09-04", amount: 22400, limit: "None after 31 Aug 2026",
      rule: "Approval rights end on the last working day", ruleVersion: "Delegation of authority v2, in force from 1 Jan 2025 (in force on 4 Sep 2026)", cite: { doc: "CB-DOA", clause: "C.2", page: 5 },
      why: "HR records show the approver's last working day as 31 Aug 2026. The account was still active in the finance system on 4 Sep 2026.", status: "New", linked: null },
    { id: "KPA-0012", type: "Approval beyond authority", severity: "High", record: "Purchase order PO-2026-0917", recordDetail: "USD 145,000 to Coral Bay Marine Supplies, 19 Aug 2026",
      approver: "T. Bandara", position: "Engineering manager", approvedAt: "2026-08-19", amount: 145000, limit: "USD 100,000",
      rule: "Purchase orders: Engineering manager up to USD 100,000", ruleVersion: "Delegation of authority v2, in force from 1 Jan 2025 (in force on 19 Aug 2026)", cite: { doc: "CB-DOA", clause: "A.4", page: 3 },
      why: "Order value USD 145,000 is above the USD 100,000 limit for the position on the approval date. No written delegation from the CEO was found.", status: "Confirmed", linked: "RM-2026-06",
      conclusion: { decision: "Breach confirmed", by: "compliance", at: "2026-10-30T12:00", text: "No delegation found. Raised RM-2026-06." } },
    { id: "KPA-0010", type: "Approval beyond authority", severity: "Medium", record: "Tariff waiver WVR-2104", recordDetail: "15% waiver, Harbourline Logistics, 22 Sep 2026",
      approver: "Commercial executive (sample user C-305)", position: "Commercial executive", approvedAt: "2026-09-22", amount: 6150, limit: "Waivers above 10% need the Chief Commercial Officer",
      rule: "Tariff waivers above the contract limit", ruleVersion: "Delegation of authority v2, in force from 1 Jan 2025 (in force on 22 Sep 2026)", cite: { doc: "CB-DOA", clause: "B.5", page: 4 },
      why: "Waiver above 10% approved by a Commercial executive. The Chief Commercial Officer's approval is required.", status: "Confirmed", linked: "RM-2026-08",
      conclusion: { decision: "Breach confirmed", by: "compliance", at: "2026-10-22T16:12", text: "Part of the waiver pattern in CHK-2026-013." } }
  ];

  /* ---------- sanctions screening (SOW 3.4.2) ---------- */
  var lists = [
    { id: "LST-OFAC-SDN", name: "OFAC Specially Designated Nationals list", short: "OFAC SDN", source: "US Treasury, public download", published: "2026-11-07", fetched: "2026-11-10T06:00", entries: 17942, added: 14, removed: 3, status: "Live" },
    { id: "LST-OFAC-CONS", name: "OFAC consolidated non-SDN lists", short: "OFAC non-SDN", source: "US Treasury, public download", published: "2026-11-07", fetched: "2026-11-10T06:00", entries: 1186, added: 0, removed: 0, status: "Live" },
    { id: "LST-EU", name: "EU consolidated financial sanctions list", short: "EU", source: "European Commission, public download", published: "2026-11-06", fetched: "2026-11-10T06:00", entries: 5733, added: 22, removed: 1, status: "Live" },
    { id: "LST-UN", name: "UN Security Council consolidated list", short: "UN", source: "United Nations, public download", published: "2026-10-30", fetched: "2026-11-10T06:00", entries: 1003, added: 0, removed: 0, status: "Waiting for Company approval", note: "Ready to switch on when the Company approves the list (§3.4.2: lists approved by the Company)." }
  ];
  var exportChecks = [
    { id: "EXP-0021", item: "Crane PLC controller, model NX-7 (sample)", party: "Northwind Crane Services", origin: "Imported spare part", result: "Check needed", ruleSet: "Sample rule set EC-1, category 3A (sample)",
      basis: "Item description mentions programmable controllers with encryption. Category 3A (sample) covers some of these. Technical specification needed to decide.", scope: "Spare parts imported for terminal equipment, as confirmed by the Company in Discovery." },
    { id: "EXP-0020", item: "Hydraulic hose assembly HX-220", party: "Coral Bay Marine Supplies", origin: "Imported spare part", result: "Not controlled", ruleSet: "Sample rule set EC-1",
      basis: "No matching category in the sample rule set. Mechanical part with no listed technology.", scope: "Spare parts imported for terminal equipment, as confirmed by the Company in Discovery." }
  ];

  var screening = [
    { id: "SCR-0091", entity: "Meridian Freight Lines", type: "Company", role: "Shipping line", country: "Sri Lanka", regNo: "PV 00123456", incorporated: "2009-03-17",
      address: "18 Marine Drive, Colombo 03, Sri Lanka", owners: "Meridian Holdings (Pvt) Ltd 70%, two individuals 30%", aliases: "MFL", contractId: "CON-2025-102",
      source: "Contract register", screenedAt: "2026-11-10T06:05", lists: ["OFAC SDN", "EU"], status: "Open", assigneeId: "compliance", risk: "High",
      hits: [
        { id: "HIT-0091-1", listEntry: "MERIDIAN FREIGHT LINE CO (sample entry)", list: "OFAC SDN", program: "Sample programme MAR-1", listedOn: "2024-06-14", listDate: "2026-11-07", score: 86, matchedOn: "Name",
          entry: { name: "MERIDIAN FREIGHT LINE CO", aliases: "MFL SHIPPING CO; MERIDIAN LINE CO", country: "Marshall Islands", regNo: "Not listed", incorporated: "Not listed", address: "Ajeltake Road, Majuro, Marshall Islands", owners: "Not listed", vessels: "MV SAMPLE HORIZON, IMO 9000001 (sample)" },
          compare: [
            { field: "Name", ours: "Meridian Freight Lines", theirs: "MERIDIAN FREIGHT LINE CO", match: "Similar" },
            { field: "Aliases", ours: "MFL", theirs: "MFL SHIPPING CO; MERIDIAN LINE CO", match: "Similar" },
            { field: "Country", ours: "Sri Lanka", theirs: "Marshall Islands", match: "Different" },
            { field: "Registration number", ours: "PV 00123456", theirs: "Not listed", match: "Can't compare" },
            { field: "Date of incorporation", ours: "17 Mar 2009", theirs: "Not listed", match: "Can't compare" },
            { field: "Address", ours: "18 Marine Drive, Colombo 03", theirs: "Ajeltake Road, Majuro", match: "Different" },
            { field: "Vessels", ours: "Fleet list not on file", theirs: "MV SAMPLE HORIZON, IMO 9000001", match: "Missing in our record" }],
          why: ["Name similarity 86%: MERIDIAN, FREIGHT and LINE match; the legal suffix CO is ignored", "Alias MFL matches the start of MFL SHIPPING CO", "Country and address are different", "The list entry has no registration number or date of incorporation, so the strongest identifiers can't be compared"],
          decision: null },
        { id: "HIT-0091-2", listEntry: "MERIDIAN LOGISTICS FZE (sample entry)", list: "EU", program: "Sample regime EU-7", listedOn: "2025-02-20", listDate: "2026-11-06", score: 71, matchedOn: "Name",
          entry: { name: "MERIDIAN LOGISTICS FZE", aliases: "None", country: "United Arab Emirates", regNo: "FZE-55102 (sample)", incorporated: "2016-08-01", address: "Free zone, Ras Al Khaimah", owners: "Not listed", vessels: "None" },
          compare: [
            { field: "Name", ours: "Meridian Freight Lines", theirs: "MERIDIAN LOGISTICS FZE", match: "Similar" },
            { field: "Country", ours: "Sri Lanka", theirs: "United Arab Emirates", match: "Different" },
            { field: "Registration number", ours: "PV 00123456", theirs: "FZE-55102", match: "Different" },
            { field: "Date of incorporation", ours: "17 Mar 2009", theirs: "1 Aug 2016", match: "Different" }],
          why: ["Name similarity 71%: only MERIDIAN matches", "Registration number, country and date of incorporation are all different"],
          decision: null }],
      evidence: [{ name: "Certificate of incorporation, Meridian Freight Lines.pdf", meta: "From due diligence REV-0206" }],
      history: [{ at: "2026-11-10T06:05", actorId: "system", text: "Screened after the list refresh. 2 possible matches." }, { at: "2026-11-10T06:06", actorId: "system", text: "Assigned to R. Fernando. Task T-06 created." }] },
    { id: "SCR-0092", entity: "Eastgate Shipping Agency", type: "Company", role: "Customer", country: "Sri Lanka", regNo: "PV 00981277", incorporated: null,
      address: "22 Port Access Road, Colombo 15, Sri Lanka", owners: "Not provided", aliases: "None", contractId: null,
      source: "Manual entry by R. Fernando", screenedAt: "2026-11-10T08:28", lists: ["OFAC SDN", "EU"], status: "Open", assigneeId: "compliance", risk: "Medium",
      hits: [
        { id: "HIT-0092-1", listEntry: "EASTGATE SHIPPING (sample entry)", list: "EU", program: "Sample regime EU-3", listedOn: "2023-11-02", listDate: "2026-11-06", score: 78, matchedOn: "Alias",
          entry: { name: "EAST GATE MARINE SERVICES", aliases: "EASTGATE SHIPPING; EGM SERVICES", country: "Not listed", regNo: "Not listed", incorporated: "1998", address: "Not listed", owners: "Not listed", vessels: "None" },
          compare: [
            { field: "Name", ours: "Eastgate Shipping Agency", theirs: "EAST GATE MARINE SERVICES", match: "Similar" },
            { field: "Aliases", ours: "None", theirs: "EASTGATE SHIPPING; EGM SERVICES", match: "Similar" },
            { field: "Country", ours: "Sri Lanka", theirs: "Not listed", match: "Can't compare" },
            { field: "Date of incorporation", ours: "Not on file", theirs: "1998", match: "Missing in our record" },
            { field: "Owners", ours: "Not provided", theirs: "Not listed", match: "Can't compare" }],
          why: ["Alias EASTGATE SHIPPING matches 78% of our name; the word AGENCY is ignored as a generic word", "Our record has no date of incorporation or owners, so the hit can't be ruled out yet"],
          decision: null }],
      evidence: [],
      history: [{ at: "2026-11-10T08:28", actorId: "compliance", text: "Screened by R. Fernando (asked in the assistant, CONV-105). 1 possible match." }] },
    { id: "SCR-0090", entity: "Kestrel Bunker Trading LLC", type: "Company", role: "Prospective supplier", country: "United Arab Emirates", regNo: "DMCC-88214 (sample)", incorporated: "2018-04-09",
      address: "Cluster K, Dubai", owners: "Not provided", aliases: "Kestrel Bunkering", contractId: null,
      source: "Supplier onboarding", screenedAt: "2026-10-27T10:15", lists: ["OFAC SDN", "EU"], status: "True match", assigneeId: "compliance", risk: "High",
      hits: [
        { id: "HIT-0090-1", listEntry: "KESTREL BUNKER TRADING LLC (sample entry)", list: "OFAC SDN", program: "Sample programme MAR-1", listedOn: "2025-09-30", listDate: "2026-10-24", score: 98, matchedOn: "Name and registration number",
          entry: { name: "KESTREL BUNKER TRADING LLC", aliases: "KESTREL BUNKERING", country: "United Arab Emirates", regNo: "DMCC-88214", incorporated: "2018-04-09", address: "Cluster K, Dubai", owners: "Not listed", vessels: "None" },
          compare: [
            { field: "Name", ours: "Kestrel Bunker Trading LLC", theirs: "KESTREL BUNKER TRADING LLC", match: "Exact" },
            { field: "Aliases", ours: "Kestrel Bunkering", theirs: "KESTREL BUNKERING", match: "Exact" },
            { field: "Registration number", ours: "DMCC-88214", theirs: "DMCC-88214", match: "Exact" },
            { field: "Date of incorporation", ours: "9 Apr 2018", theirs: "9 Apr 2018", match: "Exact" },
            { field: "Address", ours: "Cluster K, Dubai", theirs: "Cluster K, Dubai", match: "Exact" }],
          why: ["Name, alias, registration number, date and address all match"],
          decision: { value: "True match", by: "compliance", at: "2026-10-28T09:40", rationale: "Registration number, date of incorporation and address match the list entry exactly. Onboarding stopped; Legal and the data owner informed." } }],
      evidence: [{ name: "Supplier onboarding form, Kestrel.pdf", meta: "Procurement" }, { name: "Trade licence copy.pdf", meta: "Procurement" }],
      history: [{ at: "2026-10-27T10:15", actorId: "system", text: "Screened at supplier onboarding. 1 possible match." }, { at: "2026-10-28T09:40", actorId: "compliance", text: "True match recorded by R. Fernando. Onboarding stopped." }] },
    { id: "SCR-0087", entity: "Northwind Crane Services (Pvt) Ltd", type: "Company", role: "Contractor", country: "Sri Lanka", regNo: "PV 00077120", incorporated: "2004-09-01",
      address: "Industrial Zone, Biyagama, Sri Lanka", owners: "Northwind Group Holdings 100%", aliases: "Northwind Cranes", contractId: "CON-2024-051",
      source: "Contract register", screenedAt: "2026-11-02T06:05", lists: ["OFAC SDN", "EU"], status: "Cleared", assigneeId: "compliance", risk: "Low",
      hits: [
        { id: "HIT-0087-1", listEntry: "NORTHWIND CRANE & HOIST LTD (sample entry)", list: "EU", program: "Sample regime EU-7", listedOn: "2022-05-11", listDate: "2026-11-01", score: 82, matchedOn: "Name",
          entry: { name: "NORTHWIND CRANE & HOIST LTD", aliases: "None", country: "Cyprus", regNo: "HE 401227 (sample)", incorporated: "2012-01-19", address: "Limassol", owners: "Not listed", vessels: "None" },
          compare: [
            { field: "Name", ours: "Northwind Crane Services (Pvt) Ltd", theirs: "NORTHWIND CRANE & HOIST LTD", match: "Similar" },
            { field: "Country", ours: "Sri Lanka", theirs: "Cyprus", match: "Different" },
            { field: "Registration number", ours: "PV 00077120", theirs: "HE 401227", match: "Different" },
            { field: "Date of incorporation", ours: "1 Sep 2004", theirs: "19 Jan 2012", match: "Different" }],
          why: ["Name similarity 82%: NORTHWIND and CRANE match", "Registration number, country and date of incorporation are different"],
          decision: { value: "False positive", by: "compliance", at: "2026-11-03T11:20", rationale: "Different registration number, country and date of incorporation. Second check by Li Wei agreed." } }],
      evidence: [{ name: "Registrar extract, Northwind Crane Services.pdf", meta: "Registrar of Companies, 3 Nov 2026" }],
      history: [{ at: "2026-11-02T06:05", actorId: "system", text: "Screened after the list refresh. 1 possible match." }, { at: "2026-11-03T11:20", actorId: "compliance", text: "False positive recorded by R. Fernando. Screening record kept." }] },
    { id: "SCR-0089", entity: "Coral Bay Marine Supplies", type: "Company", role: "Supplier", country: "Sri Lanka", regNo: "PV 00345511", incorporated: "2011-06-30", address: "Wattala, Sri Lanka", owners: "Family owned (3 shareholders)", aliases: "None", contractId: "CON-2025-087",
      source: "Contract register", screenedAt: "2026-11-10T06:05", lists: ["OFAC SDN", "EU"], status: "No match", assigneeId: null, risk: "Low", hits: [], evidence: [], history: [{ at: "2026-11-10T06:05", actorId: "system", text: "Screened after the list refresh. No match. Record kept." }] },
    { id: "SCR-0088", entity: "Harbourline Logistics", type: "Company", role: "Customer", country: "Sri Lanka", regNo: "PV 00211876", incorporated: "2007-02-12", address: "Colombo 14, Sri Lanka", owners: "Harbourline Holdings Ltd 100%", aliases: "None", contractId: "CON-2024-033",
      source: "Contract register", screenedAt: "2026-11-10T06:05", lists: ["OFAC SDN", "EU"], status: "No match", assigneeId: null, risk: "Low", hits: [], evidence: [], history: [{ at: "2026-11-10T06:05", actorId: "system", text: "Screened after the list refresh. No match." }] },
    { id: "SCR-0086", entity: "Sapphire Tug Services", type: "Company", role: "Contractor", country: "Sri Lanka", regNo: "PV 00402219", incorporated: "2013-10-04", address: "Colombo 01, Sri Lanka", owners: "Sapphire Marine Group", aliases: "None", contractId: "CON-2026-009",
      source: "Contract register", screenedAt: "2026-11-10T06:05", lists: ["OFAC SDN", "EU"], status: "No match", assigneeId: null, risk: "Low", hits: [], evidence: [], history: [{ at: "2026-11-10T06:05", actorId: "system", text: "Screened after the list refresh. No match." }] },
    { id: "SCR-0085", entity: "Bluewater Security Services", type: "Company", role: "Prospective contractor", country: "Sri Lanka", regNo: "PV 00519034", incorporated: "2015-01-22", address: "Nugegoda, Sri Lanka", owners: "Two individuals", aliases: "None", contractId: "CON-2026-030",
      source: "Due diligence for CON-2026-030", screenedAt: "2026-11-08T14:12", lists: ["OFAC SDN", "EU"], status: "No match", assigneeId: null, risk: "Low", hits: [], evidence: [], history: [{ at: "2026-11-08T14:12", actorId: "legal", text: "Screened by N. Perera during due diligence. No match." }] }
  ];

  /* Sample rows for the bulk upload demo. */
  var bulkSample = {
    file: "Counterparties November 2026.xlsx", rows: 48,
    results: [
      { row: 4, entity: "Ocean Pearl Bunkering", type: "Company", country: "Sri Lanka", result: "Possible match", score: 74, list: "EU", entry: "OCEAN PEARL MARINE FUEL (sample entry)" },
      { row: 17, entity: "Lanka Reefer Lines", type: "Company", country: "Sri Lanka", result: "Possible match", score: 81, list: "OFAC SDN", entry: "LANKA REEFER LINE CO (sample entry)" },
      { row: 23, entity: "Port City Chandlers", type: "Company", country: "", result: "Row not screened", score: null, list: "", entry: "Country is missing. Fix the row and upload again." },
      { row: 2, entity: "Blue Lagoon Ship Supplies", type: "Company", country: "Sri Lanka", result: "No match", score: null, list: "", entry: "" },
      { row: 3, entity: "Trinco Marine Services", type: "Company", country: "Sri Lanka", result: "No match", score: null, list: "", entry: "" },
      { row: 5, entity: "Galle Face Freight", type: "Company", country: "Sri Lanka", result: "No match", score: null, list: "", entry: "" }
    ],
    summary: { screened: 47, noMatch: 45, possible: 2, failed: 1 }
  };

  /* ---------- board affairs (SOW 3.5) ---------- */
  var directors = [
    { id: "dir-1", name: "P. Abeysekera", role: "Chair" }, { id: "dir-2", name: "M. Chen", role: "Non-executive director" },
    { id: "dir-3", name: "D. Wickramasinghe", role: "Non-executive director" }, { id: "dir-4", name: "L. Zhou", role: "Non-executive director" },
    { id: "dir-5", name: "S. Ratnayake", role: "Independent director" }, { id: "dir-6", name: "H. Liang", role: "Non-executive director" },
    { id: "dir-7", name: "K. Gunasekara", role: "Chief Executive Officer" }
  ];
  var meetings = [
    { id: "BRD-2026-04", body: "Board of Directors", title: "Q4 Board meeting", date: "2026-11-26T09:30", venue: "Board room, Level 5, with video link", status: "Preparing", papersDue: "2026-11-19",
      quorum: "4 of 7 directors", access: "Directors, Company Secretary and invitees for their items", dataClass: "Confidential", items: 7, record: null },
    { id: "ARC-2026-04", body: "Audit and Risk Committee", title: "Q4 committee meeting", date: "2026-11-18T14:00", venue: "Meeting room 3", status: "Scheduled", papersDue: "2026-11-11",
      quorum: "2 of 3 members", access: "Committee members, Company Secretary, Internal Audit", dataClass: "Confidential", items: 5, record: null },
    { id: "BRD-2026-03", body: "Board of Directors", title: "Q3 Board meeting", date: "2026-08-27T09:30", venue: "Board room, Level 5", status: "Minutes in draft", papersDue: "2026-08-13",
      quorum: "6 of 7 present", access: "Directors and Company Secretary", dataClass: "Confidential", items: 8, record: null },
    { id: "BRD-2026-02", body: "Board of Directors", title: "Q2 Board meeting", date: "2026-05-28T09:30", venue: "Board room, Level 5", status: "Minutes approved", papersDue: "2026-05-14",
      quorum: "7 of 7 present", access: "Directors and Company Secretary", dataClass: "Confidential", items: 9, record: null, doc: "CB-MIN-2026-02" },
    { id: "BRD-2025-03", body: "Board of Directors", title: "Q3 2025 Board meeting", date: "2025-08-28T09:30", venue: "Board room, Level 5", status: "Minutes approved", papersDue: "2025-08-14",
      quorum: "6 of 7 present", access: "Directors and Company Secretary", dataClass: "Confidential", items: 10, record: "REC-2025-0233", doc: "CB-MIN-2025-03" },
    { id: "BRD-2024-01", body: "Board of Directors", title: "Q1 2024 Board meeting", date: "2024-02-22T09:30", venue: "Board room, Level 5", status: "Minutes approved", papersDue: "2024-02-08",
      quorum: "7 of 7 present", access: "Directors and Company Secretary", dataClass: "Confidential", items: 9, record: "REC-2024-0019", doc: "CB-MIN-2024-01" }
  ];

  /* Agenda items. checks: null until checked. Each check: { id, group, check, authority, cite, finding, outcome: Passed|Missing|Add|Alert, addition } */
  var agenda = [
    { id: "AG-2026-04-1", meetingId: "BRD-2026-04", no: 1, title: "Confirm the minutes of the Q3 meeting (BRD-2026-03)", decision: "For approval", submitterId: "cosec", submitterName: "A. Jayawardena", dept: "Company Secretariat",
      submittedAt: "2026-11-03T09:00", status: "Accepted", value: null, counterparty: null, docs: [{ name: "Draft minutes BRD-2026-03.docx", type: "Minutes", pages: 12 }], required: ["Minutes"], checks: "pass", restricted: null },
    { id: "AG-2026-04-2", meetingId: "BRD-2026-04", no: 2, title: "Chief Executive's report", decision: "For noting", submitterId: null, submitterName: "K. Gunasekara", dept: "CEO office",
      submittedAt: "2026-11-07T16:00", status: "Accepted", value: null, counterparty: null, docs: [{ name: "CEO report November 2026.pdf", type: "Report", pages: 8 }], required: ["Report"], checks: "pass", restricted: null },
    { id: "AG-2026-04-3", meetingId: "BRD-2026-04", no: 3, title: "Financial statements for Q3 2026", decision: "For approval", submitterId: null, submitterName: "H. Kumara", dept: "Finance",
      submittedAt: "2026-11-06T12:00", status: "Accepted", value: null, counterparty: null, docs: [{ name: "Q3 2026 financial statements.pdf", type: "Financial statements", pages: 22 }, { name: "Board paper, Q3 accounts.docx", type: "Board paper", pages: 3 }], required: ["Board paper", "Financial statements"], checks: "pass", restricted: null },
    { id: "AG-2026-04-4", meetingId: "BRD-2026-04", no: 4, title: "Renew the crane maintenance agreement with Northwind Crane Services for 3 years", decision: "For approval", submitterId: "legal", submitterName: "N. Perera", dept: "Legal",
      submittedAt: "2026-11-09T10:15", status: "Returned", value: "USD 1.52 million over 3 years", counterparty: "Northwind Crane Services (Pvt) Ltd", contractId: "CON-2024-051",
      docs: [{ name: "Board paper, crane maintenance renewal.docx", type: "Board paper", pages: 4 }, { name: "Contractor performance report 2026.pdf", type: "Performance report", pages: 6 }],
      required: ["Board paper", "Financial evaluation", "Legal review", "Declaration of interest"], checks: "run", returnedAt: "2026-11-09T17:20", returnedBy: "cosec",
      requirements: ["Add the financial evaluation (CMP 5.4)", "Complete the risk section of the board paper (CMP 5.4)", "Add the declaration of interest for Director M. Chen and record the recusal (Article 98)"],
      returnComment: "Please resubmit by 19 Nov 2026 so the item stays on the 26 Nov agenda.", restricted: "Director M. Chen does not receive this paper (declared interest)" },
    { id: "AG-2026-04-5", meetingId: "BRD-2026-04", no: 5, title: "Approve Procurement policy v3.4", decision: "For approval", submitterId: "compliance", submitterName: "R. Fernando", dept: "Compliance and Risk",
      submittedAt: "2026-11-05T14:00", status: "Checked", value: null, counterparty: null, policyId: "POL-PRC",
      docs: [{ name: "Procurement policy v3.4 (redline against v3.3).pdf", type: "Policy draft", pages: 30 }, { name: "Board paper, Procurement policy v3.4.docx", type: "Board paper", pages: 3 }, { name: "Legal review of policy v3.4.pdf", type: "Legal review", pages: 2 }],
      required: ["Board paper", "Policy draft", "Legal review"], checks: "pass", restricted: null },
    { id: "AG-2026-04-6", meetingId: "BRD-2026-04", no: 6, title: "Extend the berth services tariff agreement with Harbourline Logistics (related-party transaction)", decision: "For approval", submitterId: "owner", submitterName: "S. Silva", dept: "Commercial",
      submittedAt: "2026-11-10T09:05", status: "Submitted", value: "USD 1.1 million a year", counterparty: "Harbourline Logistics", contractId: "CON-2024-033",
      docs: [{ name: "Board paper, Harbourline tariff extension.docx", type: "Board paper", pages: 5 }, { name: "Financial evaluation, berth tariff.xlsx", type: "Financial evaluation", pages: 2 }],
      required: ["Board paper", "Financial evaluation", "Legal review", "Related-party disclosure"], checks: null, restricted: "Director D. Wickramasinghe does not receive this paper (related party)" },
    { id: "AG-2026-04-7", meetingId: "BRD-2026-04", no: 7, title: "Any other business", decision: "For noting", submitterId: "cosec", submitterName: "A. Jayawardena", dept: "Company Secretariat",
      submittedAt: "2026-11-03T09:00", status: "Accepted", value: null, counterparty: null, docs: [], required: [], checks: "pass", restricted: null },
    { id: "AG-ARC-04-2", meetingId: "ARC-2026-04", no: 2, title: "Compliance report: anomaly alerts and remediation, Q4", decision: "For noting", submitterId: "compliance", submitterName: "R. Fernando", dept: "Compliance and Risk",
      submittedAt: "2026-11-09T12:00", status: "Accepted", value: null, counterparty: null, docs: [{ name: "Compliance report Q4 2026.pdf", type: "Report", pages: 14 }], required: ["Report"], checks: "pass", restricted: null }
  ];

  var templates = [
    { id: "TPL-NOTICE", name: "Notice of meeting", version: "v3", approved: "2025-01-15", owner: "A. Jayawardena", prompts: ["Meeting date and time", "Venue or video link", "Quorum"], sample: "Notice is given that a meeting of the Board of Directors will be held on {date} at {venue}. The quorum is {quorum}. The agenda and papers follow." },
    { id: "TPL-AGENDA", name: "Agenda", version: "v2", approved: "2025-01-15", owner: "A. Jayawardena", prompts: ["Meeting", "Items accepted for the agenda"], sample: "Agenda for {meeting}. Items are listed in the order accepted by the Company Secretary." },
    { id: "TPL-PAPER", name: "Board paper", version: "v4", approved: "2025-06-01", owner: "A. Jayawardena", prompts: ["Decision sought", "Background", "Financial evaluation", "Risk assessment", "Legal review", "Recommendation"], sample: "Sections required by CMP 5.4: decision sought, background, financial evaluation, risk assessment, legal review and recommendation." },
    { id: "TPL-RES", name: "Board resolution", version: "v2", approved: "2025-01-15", owner: "A. Jayawardena", prompts: ["Resolution number", "Decision", "Conditions"], sample: "RESOLVED that {decision}, subject to {conditions}." },
    { id: "TPL-WRITTEN", name: "Written resolution", version: "v2", approved: "2025-01-15", owner: "A. Jayawardena", prompts: ["Decision", "Directors entitled to sign"], sample: "The directors entitled to vote resolve in writing that {decision}." },
    { id: "TPL-MINUTES", name: "Minutes", version: "v2", approved: "2025-01-15", owner: "A. Jayawardena", prompts: ["Attendance", "Declarations of interest", "Decisions per item"], sample: "Minutes of the meeting held on {date}. Present: {attendance}. Declarations of interest: {declarations}." }
  ];

  /* Board pack sections for BRD-2026-04. agendaId links to agenda status. */
  var pack = [
    { id: "PK-01", title: "Notice of meeting", kind: "Generated", templateId: "TPL-NOTICE", pages: 1, status: "Draft", include: true },
    { id: "PK-02", title: "Agenda", kind: "Generated", templateId: "TPL-AGENDA", pages: 1, status: "Draft", include: true },
    { id: "PK-03", title: "Declarations of interest", kind: "Generated", templateId: null, pages: 1, status: "Draft", include: true },
    { id: "PK-04", title: "Item 1. Draft minutes of BRD-2026-03", kind: "Paper", agendaId: "AG-2026-04-1", pages: 12, status: "Ready", include: true },
    { id: "PK-05", title: "Item 2. Chief Executive's report", kind: "Paper", agendaId: "AG-2026-04-2", pages: 8, status: "Ready", include: true },
    { id: "PK-06", title: "Item 3. Q3 2026 financial statements", kind: "Paper", agendaId: "AG-2026-04-3", pages: 25, status: "Ready", include: true },
    { id: "PK-07", title: "Item 4. Crane maintenance renewal", kind: "Paper", agendaId: "AG-2026-04-4", pages: 10, status: "Waiting", include: true, restricted: "Not sent to Director M. Chen" },
    { id: "PK-08", title: "Item 5. Procurement policy v3.4", kind: "Paper", agendaId: "AG-2026-04-5", pages: 35, status: "Ready", include: true },
    { id: "PK-09", title: "Item 6. Harbourline tariff extension", kind: "Paper", agendaId: "AG-2026-04-6", pages: 7, status: "Waiting", include: true, restricted: "Not sent to Director D. Wickramasinghe" }
  ];

  /* Past-meeting search corpus: each hit cites a minutes document. */
  var searchCorpus = [
    { id: "BS-01", meetingId: "BRD-2024-01", date: "2024-02-22", item: "Item 3", type: "Minutes", title: "Crane maintenance agreement awarded", text: "The Board considered the award of the crane maintenance agreement for the twelve quay cranes. Director M. Chen declared an interest and did not vote.", cite: { doc: "CB-MIN-2024-01", clause: "item3", page: 2 }, record: "REC-2024-0019", tags: ["crane", "maintenance", "northwind", "interest", "contract"] },
    { id: "BS-02", meetingId: "BRD-2024-01", date: "2024-02-22", item: "Resolution 2024/04", type: "Resolution", title: "Resolution 2024/04, crane maintenance", text: "RESOLVED that the Company enter into the crane maintenance agreement with Northwind Crane Services (Pvt) Ltd for three years at a total price not exceeding USD 1.5 million, subject to legal review of the liability cap.", cite: { doc: "CB-MIN-2024-01", clause: "res2024-04", page: 2 }, record: "REC-2024-0019", tags: ["crane", "maintenance", "northwind", "resolution", "contract", "renewal"] },
    { id: "BS-03", meetingId: "BRD-2024-01", date: "2024-02-22", item: "Item 8", type: "Minutes", title: "Tariff waivers above 10% to be reported", text: "The Board asked Commercial to report every berth tariff waiver above 10% to the Audit and Risk Committee each quarter.", cite: { doc: "CB-MIN-2024-01", clause: "item8", page: 7 }, record: "REC-2024-0019", tags: ["tariff", "waiver", "harbourline", "berth", "commercial"] },
    { id: "BS-04", meetingId: "BRD-2025-03", date: "2025-08-28", item: "Item 6", type: "Minutes", title: "Crane availability and contractor performance", text: "The Board noted quay crane availability of 96.1% against a target of 97%. The Board asked management to report on contractor performance before any renewal of the crane maintenance agreement.", cite: { doc: "CB-MIN-2025-03", clause: "item6", page: 4 }, record: "REC-2025-0233", tags: ["crane", "maintenance", "renewal", "performance", "northwind"] },
    { id: "BS-05", meetingId: "BRD-2025-03", date: "2025-08-28", item: "Resolution 2025/19", type: "Resolution", title: "Procurement policy v3.2 stays in force", text: "RESOLVED that Procurement policy v3.2 remains in force until a revised policy is approved by the Board.", cite: { doc: "CB-MIN-2025-03", clause: "res2025-19", page: 9 }, record: "REC-2025-0233", tags: ["procurement", "policy", "resolution"] },
    { id: "BS-06", meetingId: "BRD-2025-03", date: "2025-08-28", item: "Item 9", type: "Minutes", title: "Declaration of interest, Harbourline", text: "Director D. Wickramasinghe declared an interest in Harbourline Holdings Ltd and left the meeting for the discussion of berth tariffs.", cite: { doc: "CB-MIN-2025-03", clause: "item9", page: 11 }, record: "REC-2025-0233", tags: ["related", "party", "interest", "harbourline", "tariff", "berth"] },
    { id: "BS-07", meetingId: "BRD-2026-02", date: "2026-05-28", item: "Item 4", type: "Minutes", title: "Sanctions screening extended to all shipping lines", text: "The Board noted that counterparty screening against the OFAC and EU lists will cover all shipping lines from Q4 2026, with each possible match decided by the Compliance officer.", cite: { doc: "CB-MIN-2026-02", clause: "item4", page: 5 }, record: null, tags: ["sanctions", "screening", "ofac", "eu", "shipping"] },
    { id: "BS-08", meetingId: "BRD-2026-02", date: "2026-05-28", item: "Resolution 2026/11", type: "Resolution", title: "Procurement policy v3.3 approved", text: "RESOLVED that the Procurement policy v3.3 is approved with effect from 1 April 2026.", cite: { doc: "CB-MIN-2026-02", clause: "res2026-11", page: 8 }, record: null, tags: ["procurement", "policy", "resolution", "approved"] }
  ];

  /* Scripted answers for questions in past-meeting search (keyword matched). */
  var boardAnswers = [
    { keys: ["crane", "renew", "northwind", "maintenance"], text: "Yes. The Board approved the crane maintenance agreement with Northwind Crane Services in February 2024 for three years, up to USD 1.5 million, subject to legal review of the liability cap [1]. Director M. Chen declared an interest and did not vote [2]. In August 2025 the Board asked for a contractor performance report before any renewal [3].\n\nFor the renewal now on the agenda (item 4), the Board's earlier request means the performance report should be in the paper, and Director M. Chen's interest should be declared again.",
      cites: [{ doc: "CB-MIN-2024-01", clause: "res2024-04", page: 2 }, { doc: "CB-MIN-2024-01", clause: "item3", page: 2 }, { doc: "CB-MIN-2025-03", clause: "item6", page: 4 }] },
    { keys: ["waiver", "tariff", "harbourline", "berth"], text: "The Board asked Commercial in February 2024 to report every berth tariff waiver above 10% to the Audit and Risk Committee each quarter [1]. Director D. Wickramasinghe declared an interest in Harbourline Holdings in August 2025 and left the discussion [2].\n\nNo later resolution changing the 10% reporting rule was found in the meetings you can access.",
      cites: [{ doc: "CB-MIN-2024-01", clause: "item8", page: 7 }, { doc: "CB-MIN-2025-03", clause: "item9", page: 11 }] },
    { keys: ["procurement", "policy"], text: "Procurement policy v3.2 was kept in force by Resolution 2025/19 until a revised policy was approved [1]. Version 3.3 was approved by Resolution 2026/11 with effect from 1 April 2026 [2]. Version 3.4 is item 5 on the 26 Nov 2026 agenda.",
      cites: [{ doc: "CB-MIN-2025-03", clause: "res2025-19", page: 9 }, { doc: "CB-MIN-2026-02", clause: "res2026-11", page: 8 }] },
    { keys: ["sanction", "screening", "ofac"], text: "In May 2026 the Board noted that OFAC and EU screening will cover all shipping lines from Q4 2026, with each possible match decided by the Compliance officer [1].",
      cites: [{ doc: "CB-MIN-2026-02", clause: "item4", page: 5 }] }
  ];

  D.complianceBoard = {
    documents: documents, rules: rules, runs: runs, alerts: alerts, checks: checks, controls: controls, remediation: remediation, authority: authority,
    lists: lists, exportChecks: exportChecks, screening: screening, bulkSample: bulkSample,
    directors: directors, meetings: meetings, agenda: agenda, templates: templates, pack: pack, searchCorpus: searchCorpus, boardAnswers: boardAnswers
  };
})();
