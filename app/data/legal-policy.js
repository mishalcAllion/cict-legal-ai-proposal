/* Mock data for screen area: legal-policy (Legal affairs, Translation, Regulatory monitoring, Policies).
   Every name, company, case, document, update and figure here is a fictional sample.
   Owned by the legal-policy screen builder. See CONVENTIONS.md. */
(function () {
  "use strict";
  var D = window.APP_DATA;
  var APP = window.APP;

  /* Documents used by this area. Ids are prefixed LP- so they never collide with other areas. */
  function reg(doc) {
    if (APP && APP.registerDocument) APP.registerDocument(doc); else D.documents[doc.id] = doc;
  }
  function mk(id, title, kind, dataClass, version, totalPages, pages) {
    reg({ id: id, title: title, kind: kind, dataClass: dataClass, version: version, totalPages: totalPages, file: title + ".pdf",
      pages: pages.map(function (p) { return { n: p[0], clauses: p[1].map(function (c) { return { id: c[0], heading: c[1], text: c[2], note: c[3] }; }) }; }) });
  }

  /* ---------- case documents ---------- */
  mk("LP-SR-221", "Survey report SR-221, container damage (sample)", "Survey report", "Sensitive", "Issued 9 Sep 2026", 6, [
    [1, [["1", "1. Summary", "Survey attended on 5 September 2026 at berth 3 after discharge of three 40-foot containers (MFLU 482113, MFLU 482270, MFLU 483019) from MV Sample Star on 4 September 2026."]]],
    [3, [["3.1", "3.1 Condition on arrival", "Photographs taken by the vessel's crew before discharge show two containers in bay 14 leaning against each other."],
         ["3.2", "3.2 Lashing", "Lashing rods on bay 14 showed corrosion and two turnbuckles had failed. In the surveyor's opinion the lashing failed before the vessel arrived at the berth."]]],
    [4, [["4.1", "4.1 Damage estimate", "Repair of the three containers and loss of cargo are estimated at USD 78,000 to USD 92,000. The cargo owner's invoices were not seen."]]],
    [6, [["6", "6. Limitations", "The surveyor did not review berth camera footage or the crane operator's log.", { kind: "warning", text: "Missing evidence: berth 3 camera log." }]]]
  ]);
  mk("LP-CON-2025-102", "Shipping services agreement, Meridian Freight Lines (extract, sample)", "Contract", "Sensitive", "Signed 20 May 2025", 18, [
    [9, [["11.3", "11.3 Cargo handling liability", "The Company is liable for physical loss of or damage to containers caused by its negligence while the containers are in its custody at the terminal, subject to clauses 11.5 and 11.7."],
         ["11.5", "11.5 Exclusions", "The Company is not liable for loss or damage arising from defects in packing, stowage or lashing carried out before the containers arrive at the terminal."]]],
    [10, [["11.7", "11.7 Limits", "The Company's liability shall not exceed USD 25,000 per container and USD 250,000 in total for any one incident."]]],
    [12, [["14.2", "14.2 Notice of claims", "Claims must be notified in writing within 7 days of discharge, with supporting survey evidence. Late claims may be rejected unless the Company agrees otherwise in writing."]]]
  ]);
  mk("LP-CL-MFL", "Claim letter from Meridian Freight Lines, 15 Sep 2026 (sample)", "Correspondence", "Sensitive", "Received 15 Sep 2026", 2, [
    [1, [["a", "Claim", "We hold the Company responsible for damage to containers MFLU 482113, MFLU 482270 and MFLU 483019 during discharge at berth 3 on 4 September 2026."],
         ["b", "Amount", "We claim USD 86,000 for repair and cargo loss, as set out in the attached schedule. We reserve the right to claim further losses."]]]
  ]);
  mk("LP-IR-0904", "Berth 3 incident report IR-2026-0904 (sample)", "Incident report", "Internal", "Filed 4 Sep 2026", 1, [
    [1, [["1", "1. Event", "At 14:20 the operator of crane STS-07 reported a container swinging during discharge from bay 14. Discharge was stopped for 25 minutes."],
         ["2", "2. Observations", "The stevedores found the lashing gear on bay 14 loose when they boarded. No crane fault was recorded."],
         ["3", "3. Follow up", "Camera log for berth 3 between 14:00 and 15:00 requested from Security on 6 Sep 2026. Not yet received.", { kind: "warning", text: "Still outstanding on 10 Nov 2026." }]]]
  ]);
  mk("LP-IR-2025-022", "Berth 5 contact incident report (sample)", "Incident report", "Confidential", "Filed 14 Mar 2025", 4, [
    [1, [["1", "1. Event", "On 14 March 2025 MV Sample Horizon made contact with the berth 5 fender line while berthing with tug assistance from Sapphire Tug Services."],
         ["2", "2. Damage", "Four fender units and 18 metres of quay edge were damaged. The Engineering department estimates repair at USD 410,000."]]],
    [3, [["5", "5. Pilot and tug log", "The pilot log records a tug line parting at 06:42, about two minutes before contact."]]]
  ]);
  mk("LP-MED-022", "Mediation notice and position paper (sample)", "Correspondence", "Confidential", "Served 20 Oct 2026", 3, [
    [1, [["1", "1. Notice", "The vessel owner's insurers agree to mediation and propose 9 January 2027 for the first session."],
         ["2", "2. Their position", "The insurers say the tug line failure, not the vessel's master, caused the contact, and that the Company should claim against the tug operator."]]]
  ]);
  mk("LP-CUS-019", "Customs inquiry letter on transshipment declarations (sample)", "Correspondence", "Confidential", "Received 22 Oct 2026", 2, [
    [1, [["1", "1. Inquiry", "The customs authority asks for records of 46 transshipment containers handled between January and June 2026, and the declarations filed for them."],
         ["2", "2. Deadline", "Records must be provided by 25 November 2026."]]]
  ]);
  mk("LP-NOTE-019", "Internal note on transshipment declarations (sample)", "Internal note", "Confidential", "Draft, 28 Oct 2026", 1, [
    [1, [["1", "1. What we know", "Operations found 3 of the 46 containers where the declared and handled weights differ by more than 10%. The cause is not yet known."],
         ["2", "2. What we don't know", "Whether the shipping agent or the terminal entered the declared weights. The gate system logs for March are not yet retrieved.", { kind: "warning", text: "Evidence gap." }]]]
  ]);
  mk("LP-LT-031", "Labour tribunal application (sample)", "Pleading", "Sensitive", "Filed 2 Jun 2025", 3, [
    [1, [["1", "1. Claim", "The applicant, a former crane technician, says the termination of employment on 15 March 2025 was unjustified and claims reinstatement or compensation."]]],
    [2, [["3", "3. Relief", "Compensation equal to 24 months' salary is claimed in the alternative."]]]
  ]);
  mk("LP-HR-031", "Disciplinary inquiry report (sample)", "Internal report", "Sensitive", "Issued 10 Mar 2025", 5, [
    [2, [["4", "4. Findings", "The inquiry found two safety breaches on 3 and 17 February 2025, both recorded by the shift supervisor and acknowledged in writing."]]]
  ]);
  mk("LP-SOA-007", "Statement of account, Harbourline Logistics (sample)", "Statement", "Internal", "At 31 Oct 2026", 2, [
    [1, [["1", "Balance", "Storage charges for June to September 2026 remain unpaid. Balance due: USD 118,400."],
         ["2", "Reminders", "Reminders were sent on 15 Aug, 15 Sep and 15 Oct 2026. No reply received."]]]
  ]);
  mk("LP-LOD-007", "Letter of demand, Harbourline Logistics (draft, sample)", "Correspondence", "Internal", "Draft 2", 1, [
    [1, [["1", "Demand", "We demand payment of USD 118,400 within 14 days of this letter, failing which the Company will start recovery proceedings without further notice."]]]
  ]);
  mk("LP-SET-009", "Settlement agreement, Eastgate IT Solutions (sample)", "Agreement", "Sensitive", "Signed 30 Aug 2025", 4, [
    [1, [["2", "2. Settlement", "Eastgate IT Solutions pays USD 60,000 as full settlement of delay damages under the terminal software licence, and delivers release 4.2 by 31 October 2025."]]],
    [2, [["5", "5. No admission", "The settlement is made without admission of liability by either party."]]]
  ]);

  /* ---------- policy documents (clauses drive the compare view and citations) ---------- */
  var policyDocs = {
    "LP-POL-GH-3": { title: "Gifts and hospitality policy v3", ver: "Version 3, in force 1 Jul 2023", pages: 6, clauses: [
      ["1", "1. Purpose", "This policy sets the rules for giving and receiving gifts and hospitality by staff of the Company.", 1],
      ["4.2", "4.2 Declaring gifts", "Gifts with a value above LKR 10,000 must be declared to the line manager.", 3],
      ["4.4", "4.4 Cash", "Staff must not accept cash or cash equivalents of any value.", 3],
      ["6.1", "6.1 Records", "Declarations are kept for 3 years.", 5],
      ["7.2", "7.2 Register", "The line manager keeps a paper register of declarations for the department.", 6]
    ] },
    "LP-POL-GH-4": { title: "Gifts and hospitality policy, draft 4", ver: "Draft 4, in consultation", pages: 6, clauses: [
      ["1", "1. Purpose", "This policy sets the rules for giving and receiving gifts and hospitality by staff of the Company.", 1],
      ["4.2", "4.2 Declaring gifts", "Gifts with a value above LKR 5,000 must be declared to Compliance within 5 working days.", 3],
      ["4.4", "4.4 Cash", "Staff must not accept cash or cash equivalents of any value.", 3],
      ["4.5", "4.5 Public officials", "Hospitality for public officials needs prior written approval from Compliance.", 3],
      ["6.1", "6.1 Records", "Declarations are kept for 7 years by Compliance.", 5]
    ] },
    "LP-HQ-ABP": { title: "Anti-bribery policy (headquarters), English reference text", ver: "2024, in force 1 Jul 2024", pages: 14, clauses: [
      ["3.1", "3.1 Declarations", "Gifts or hospitality worth more than the threshold set by each subsidiary, and in any case more than the equivalent of USD 20, must be declared to the compliance function within five working days.", 4],
      ["3.4", "3.4 Public officials", "No gift or hospitality may be offered to a public official without prior written approval from the compliance function.", 5],
      ["5.2", "5.2 Records", "Declarations and approvals must be kept for at least seven years.", 9],
      ["6.3", "6.3 Supplier onboarding", "New suppliers must pass due diligence before they are approved by a single designated function.", 11]
    ] },
    "LP-POL-PRC-32": { title: "Procurement policy 3.2", ver: "Version 3.2, 1 Jan 2023 to 31 Mar 2026", pages: 20, clauses: [
      ["1.3", "1.3 Related party", "A related party is any director or senior manager of the Company and their close family members.", 2],
      ["2.4", "2.4 Approval limits", "The Head of Procurement may approve contracts up to USD 250,000.", 5],
      ["3.1", "3.1 Quotations", "Contracts above USD 50,000 need three written quotations.", 7],
      ["5.1", "5.1 New suppliers", "Finance approves new suppliers.", 12]
    ] },
    "LP-POL-PRC-33": { title: "Procurement policy 3.3", ver: "Version 3.3, in force 1 Apr 2026", pages: 22, clauses: [
      ["1.3", "1.3 Related party", "A related party is any director or senior manager of the Company and their close family members.", 2],
      ["2.4", "2.4 Approval limits", "The Head of Procurement may approve contracts up to USD 500,000.", 5],
      ["3.1", "3.1 Quotations", "Contracts above USD 25,000 need three written quotations, and contracts above USD 250,000 need an open tender.", 7],
      ["5.1", "5.1 New suppliers", "Procurement approves new suppliers after due diligence.", 12]
    ] },
    "LP-POL-DOA": { title: "Delegation of authority v2", ver: "Version 2, in force 1 Jan 2025", pages: 16, clauses: [
      ["1.2", "1.2 Related party", "A related party is a person or entity that controls, or is controlled by, the Company, and any director of the Company.", 2],
      ["4.1", "4.1 Procurement", "The Head of Procurement may approve contracts up to USD 300,000. Contracts above this amount need approval from the Chief Executive Officer.", 6],
      ["6.2", "6.2 Supplier set-up", "Finance approves new suppliers and their bank details.", 10]
    ] },
    "LP-AOA": { title: "Articles of Association (extract)", ver: "Amended 2021", pages: 40, clauses: [
      ["2", "Article 2. Definitions", "Related party has the meaning given in the applicable accounting standard, and includes directors, key management personnel, their close family members and entities they control.", 3]
    ] },
    "LP-POL-WB": { title: "Whistleblowing policy v2", ver: "Version 2, in force 1 Oct 2022", pages: 8, clauses: [
      ["3.1", "3.1 Raising a concern", "Staff should raise concerns with their line manager, who decides whether to escalate them.", 3]
    ] },
    "LP-HQ-WB": { title: "Whistleblowing policy (headquarters), English reference text", ver: "2023, in force 1 Mar 2023", pages: 10, clauses: [
      ["2.3", "2.3 Independent channel", "Every subsidiary must offer a reporting channel that does not pass through the reporter's management line.", 3]
    ] },
    "LP-POL-AI": { title: "Use of AI tools policy, draft 1", ver: "Draft 1", pages: 5, clauses: [
      ["3", "3. Sending data out", "Staff must not send Sensitive or Confidential information to an external AI service unless it has been masked and released by the data owner.", 2]
    ] }
  };
  Object.keys(policyDocs).forEach(function (id) {
    var p = policyDocs[id];
    var byPage = {};
    p.clauses.forEach(function (c) { (byPage[c[3]] = byPage[c[3]] || []).push([c[0], c[1], c[2]]); });
    mk(id, p.title, "Policy", "Internal", p.ver, p.pages, Object.keys(byPage).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return [n, byPage[n]]; }));
  });

  /* ---------- legal affairs ---------- */
  var cases = [
    { id: "CASE-2026-014", title: "Cargo damage claim", counterparty: "Meridian Freight Lines", type: "Commercial claim", stage: "Claim filed", forum: "Commercial High Court (sample)",
      exposure: "USD 50-100k", exposureLow: 50000, exposureHigh: 100000, nextDate: "2026-12-02", nextEvent: "First hearing", risk: "Medium", ownerId: "legal", dataClass: "Sensitive",
      opened: "2026-09-15", contractId: "CON-2025-102", records: ["REC-2025-0277"], status: "Open",
      summary: "Meridian Freight Lines claims USD 86,000 for three containers damaged during discharge at berth 3 on 4 Sep 2026. The survey says lashing failed before arrival.",
      parties: ["Meridian Freight Lines (claimant)", "The Company (respondent)"], counsel: "Silva & Partners (sample external counsel)",
      docs: ["LP-CL-MFL", "LP-SR-221", "LP-IR-0904", "LP-CON-2025-102"],
      milestones: [
        { at: "2026-09-04", kind: "Event", text: "Containers damaged during discharge at berth 3", by: "Operations" },
        { at: "2026-09-05", kind: "Evidence", text: "Survey attended; report SR-221 issued on 9 Sep", by: "T. Bandara" },
        { at: "2026-09-15", kind: "Claim", text: "Claim letter received for USD 86,000", by: "N. Perera" },
        { at: "2026-09-22", kind: "Handling", text: "Holding reply sent, liability not admitted", by: "N. Perera" },
        { at: "2026-10-28", kind: "Filing", text: "Claim filed in the Commercial High Court (sample)", by: "Silva & Partners" },
        { at: "2026-11-21", kind: "Due", text: "Legal memo to be confirmed (task T-03)", by: "N. Perera", upcoming: true },
        { at: "2026-12-02", kind: "Hearing", text: "First hearing", by: "Silva & Partners", upcoming: true }
      ],
      risk3: {
        rating: "Medium", evidence: "Partial",
        factors: [
          { dir: "for", text: "Survey finds lashing failed before arrival, which clause 11.5 excludes", cite: { doc: "LP-SR-221", clause: "3.2", page: 3 } },
          { dir: "for", text: "Claim notified 11 days after discharge; clause 14.2 requires 7 days", cite: { doc: "LP-CON-2025-102", clause: "14.2", page: 12 } },
          { dir: "for", text: "Liability capped at USD 25,000 per container under clause 11.7", cite: { doc: "LP-CON-2025-102", clause: "11.7", page: 10 } },
          { dir: "against", text: "Discharge continued after the swinging container was seen at 14:20", cite: { doc: "LP-IR-0904", clause: "1", page: 1 } },
          { dir: "against", text: "Berth 3 camera log not yet available to confirm the cause", cite: { doc: "LP-IR-0904", clause: "3", page: 1 } }
        ],
        outcomes: [
          { label: "Claim dismissed under clause 11.5", range: "40 to 55%", basis: "6 similar cargo claims in Records since 2019, 3 dismissed on a pre-arrival defect finding" },
          { label: "Settlement within the clause 11.7 cap", range: "35 to 45%", basis: "Typical settlements in the same 6 claims were 55 to 80% of the capped amount" },
          { label: "Liability found, capped at USD 75,000", range: "5 to 15%", basis: "Needs negligence during custody; current evidence points the other way" }
        ],
        compensation: "USD 0 to 75,000, most likely USD 30,000 to 50,000 if settled",
        compensationMethod: "Cap in clause 11.7 applied to 3 containers, weighted by outcomes of 6 earlier claims in Records (REC-2019-0057 and others).",
        duration: "8 to 14 months to judgment, 2 to 4 months if settled",
        durationMethod: "Median time to first judgment in the 6 earlier claims: 11 months.",
        developments: ["Court orders disclosure of the camera log", "Claimant adds the stevedoring contractor as a party", "Settlement talks before the first hearing"],
        responses: ["Get the berth 3 camera log from Security this week", "Rely on clauses 11.5 and 14.2 in the defence", "Offer without-prejudice talks only after the camera log is reviewed"],
        missing: [
          { item: "Berth 3 camera log, 4 Sep 2026, 14:00 to 15:00", from: "Security", requested: "2026-09-06" },
          { item: "Crane STS-07 operator log for the same shift", from: "Engineering", requested: null },
          { item: "Cargo owner's invoices supporting the USD 86,000 figure", from: "Meridian Freight Lines, via counsel", requested: null }
        ]
      } },
    { id: "CASE-2025-022", title: "Berth damage after vessel contact", counterparty: "Sample Horizon Shipping (vessel owner)", type: "Admiralty", stage: "Mediation", forum: "Mediation (sample)",
      exposure: "USD 250-500k", exposureLow: 250000, exposureHigh: 500000, nextDate: "2027-01-09", nextEvent: "First mediation session", risk: "High", ownerId: "legal", dataClass: "Confidential",
      opened: "2025-03-14", contractId: "CON-2026-009", records: ["REC-2019-0057"], status: "Open",
      summary: "MV Sample Horizon hit the berth 5 fender line on 14 Mar 2025. Repair is estimated at USD 410,000. The insurers blame a parted tug line.",
      parties: ["The Company (claimant)", "Sample Horizon Shipping (respondent)", "Sapphire Tug Services (possible third party)"], counsel: "Silva & Partners (sample external counsel)",
      docs: ["LP-IR-2025-022", "LP-MED-022"],
      milestones: [
        { at: "2025-03-14", kind: "Event", text: "Vessel contact with berth 5 fender line", by: "Operations" },
        { at: "2025-04-02", kind: "Claim", text: "Claim sent to the vessel owner for USD 410,000", by: "N. Perera" },
        { at: "2025-09-10", kind: "Handling", text: "Insurers deny liability and point to the tug operator", by: "N. Perera" },
        { at: "2026-10-20", kind: "Filing", text: "Mediation notice served", by: "Silva & Partners" },
        { at: "2027-01-09", kind: "Hearing", text: "First mediation session", by: "Silva & Partners", upcoming: true }
      ],
      risk3: {
        rating: "High", evidence: "Partial",
        factors: [
          { dir: "for", text: "Damage and repair estimate are documented", cite: { doc: "LP-IR-2025-022", clause: "2", page: 1 } },
          { dir: "against", text: "Tug line parted two minutes before contact, which supports the insurers' position", cite: { doc: "LP-IR-2025-022", clause: "5", page: 3 } },
          { dir: "against", text: "Insurers propose that the Company claims against the tug operator instead", cite: { doc: "LP-MED-022", clause: "2", page: 1 } }
        ],
        outcomes: [
          { label: "Recovery from the vessel owner", range: "30 to 45%", basis: "Port liability rules usually place berthing risk on the vessel; the tug failure weakens this" },
          { label: "Shared recovery from vessel owner and tug operator", range: "35 to 50%", basis: "Depends on the towage terms in force in March 2025, which are not in the file" },
          { label: "No recovery", range: "10 to 20%", basis: "If the tug failure is found to be the only cause and the towage terms exclude liability" }
        ],
        compensation: "Recovery of USD 0 to 410,000; the Company also bears repair cost in the meantime",
        compensationMethod: "Engineering repair estimate, with outcome ranges based on two earlier berth contact claims in Records.",
        duration: "6 to 18 months",
        durationMethod: "Mediation in 2 to 3 months; litigation adds 12 months or more if it fails.",
        developments: ["Mediation settles with a shared contribution", "Tug operator joined as a third party", "Claim proceeds to the Admiralty court"],
        responses: ["Get the towage terms that applied in March 2025", "Notify Sapphire Tug Services of a possible claim before the time limit", "Prepare a mediation brief with the repair invoices"],
        missing: [
          { item: "Towage terms in force on 14 Mar 2025", from: "Marine operations", requested: null },
          { item: "Final repair invoices", from: "Engineering", requested: "2026-10-25" }
        ]
      } },
    { id: "CASE-2026-019", title: "Customs inquiry on transshipment declarations", counterparty: "Customs authority (sample)", type: "Regulatory investigation", stage: "Inquiry", forum: "Customs inquiry (sample)",
      exposure: "Can't be assessed yet", exposureLow: null, exposureHigh: null, nextDate: "2026-11-25", nextEvent: "Records due to the customs authority", risk: "High", ownerId: "legal", dataClass: "Confidential",
      opened: "2026-10-22", contractId: null, records: [], status: "Open",
      summary: "The customs authority asks for records of 46 transshipment containers. Operations found 3 with weight differences above 10%. The cause is not yet known.",
      parties: ["Customs authority (sample)", "The Company"], counsel: "In-house",
      docs: ["LP-CUS-019", "LP-NOTE-019"],
      milestones: [
        { at: "2026-10-22", kind: "Event", text: "Customs inquiry letter received", by: "N. Perera" },
        { at: "2026-10-28", kind: "Handling", text: "Internal note on the 46 containers prepared", by: "Operations" },
        { at: "2026-11-25", kind: "Due", text: "Records due to the customs authority", by: "N. Perera", upcoming: true }
      ],
      risk3: {
        rating: "High", evidence: "Not enough evidence",
        qualitative: "The inquiry could lead to penalties if the terminal entered wrong weights, or to no action if the shipping agent did. The evidence in the file can't separate these yet, so probability, penalty range and duration are not estimated.",
        factors: [
          { dir: "against", text: "3 of 46 containers show weight differences above 10%", cite: { doc: "LP-NOTE-019", clause: "1", page: 1 } },
          { dir: "unknown", text: "Who entered the declared weights is not yet known", cite: { doc: "LP-NOTE-019", clause: "2", page: 1 } }
        ],
        outcomes: [], compensation: null, duration: null,
        developments: ["Inquiry closed after records are provided", "Formal investigation opened", "Penalty notice for incorrect declarations"],
        responses: ["Retrieve gate system logs for March 2026", "Confirm with the shipping agents who filed each declaration", "Provide the records by 25 Nov 2026 with a covering letter reviewed by counsel"],
        missing: [
          { item: "Gate system logs for March 2026", from: "IT", requested: null },
          { item: "Declarations filed by the shipping agents for the 3 containers", from: "Operations", requested: null },
          { item: "Weighbridge calibration certificates for 2026", from: "Engineering", requested: null }
        ]
      } },
    { id: "CASE-2025-031", title: "Employment dispute, crane technician", counterparty: "Former employee (name withheld)", type: "Labour", stage: "Labour tribunal", forum: "Labour tribunal (sample)",
      exposure: "LKR 2-5m", exposureLow: null, exposureHigh: null, nextDate: "2026-11-18", nextEvent: "Tribunal hearing", risk: "Low", ownerId: "legal", dataClass: "Sensitive",
      opened: "2025-06-02", contractId: null, records: [], status: "Open",
      summary: "A former crane technician challenges the termination of employment in March 2025 and claims reinstatement or 24 months' salary.",
      parties: ["Former employee (applicant)", "The Company (respondent)"], counsel: "In-house",
      docs: ["LP-LT-031", "LP-HR-031"],
      milestones: [
        { at: "2025-03-15", kind: "Event", text: "Employment ended after a disciplinary inquiry", by: "HR" },
        { at: "2025-06-02", kind: "Filing", text: "Application filed at the labour tribunal", by: "Applicant" },
        { at: "2026-06-12", kind: "Hearing", text: "Evidence of the shift supervisor heard", by: "N. Perera" },
        { at: "2026-11-18", kind: "Hearing", text: "Tribunal hearing, Company's evidence continues", by: "N. Perera", upcoming: true }
      ],
      risk3: {
        rating: "Low", evidence: "Sufficient",
        factors: [
          { dir: "for", text: "Two safety breaches recorded and acknowledged in writing", cite: { doc: "LP-HR-031", clause: "4", page: 2 } },
          { dir: "against", text: "Applicant claims 24 months' salary as an alternative", cite: { doc: "LP-LT-031", clause: "3", page: 2 } }
        ],
        outcomes: [
          { label: "Application dismissed", range: "60 to 75%", basis: "Recorded and acknowledged breaches; 4 similar tribunal cases since 2020" },
          { label: "Compensation awarded", range: "25 to 40%", basis: "Tribunals often award 6 to 12 months' salary where procedure was imperfect" }
        ],
        compensation: "LKR 0 to 5 million, most likely below LKR 2.5 million",
        compensationMethod: "Salary band of the role times the 6 to 12 month range seen in 4 earlier cases.",
        duration: "3 to 9 months to an order", durationMethod: "Two more hearing dates expected.",
        developments: ["Order after the next two hearings", "Settlement offer from the applicant"],
        responses: ["Call the HR manager as a witness on procedure", "Keep the settlement authority at the level set by HR"],
        missing: []
      } },
    { id: "CASE-2026-007", title: "Unpaid storage charges", counterparty: "Harbourline Logistics", type: "Debt recovery", stage: "Letter of demand", forum: "Pre-action",
      exposure: "USD 118k receivable", exposureLow: null, exposureHigh: null, nextDate: "2026-11-30", nextEvent: "Payment deadline in the demand letter", risk: "Low", ownerId: "legal", dataClass: "Internal",
      opened: "2026-10-20", contractId: "CON-2024-033", records: [], status: "Open",
      summary: "Storage charges of USD 118,400 for June to September 2026 are unpaid after three reminders. A letter of demand is drafted.",
      parties: ["The Company (creditor)", "Harbourline Logistics (debtor)"], counsel: "In-house",
      docs: ["LP-SOA-007", "LP-LOD-007"],
      milestones: [
        { at: "2026-10-15", kind: "Handling", text: "Third reminder sent, no reply", by: "Finance" },
        { at: "2026-10-20", kind: "Event", text: "Matter referred to Legal", by: "H. Kumara" },
        { at: "2026-11-16", kind: "Due", text: "Send letter of demand", by: "N. Perera", upcoming: true },
        { at: "2026-11-30", kind: "Due", text: "Payment deadline", by: "Harbourline Logistics", upcoming: true }
      ],
      risk3: {
        rating: "Low", evidence: "Sufficient",
        factors: [
          { dir: "for", text: "Balance and reminders documented in the statement of account", cite: { doc: "LP-SOA-007", clause: "2", page: 1 } }
        ],
        outcomes: [
          { label: "Paid after the demand letter", range: "55 to 70%", basis: "Harbourline paid two earlier overdue balances after a demand letter" },
          { label: "Recovery proceedings needed", range: "30 to 45%", basis: "Volume rebate dispute on CON-2024-033 may be raised as a set-off" }
        ],
        compensation: "Recovery of up to USD 118,400 plus interest", compensationMethod: "Statement of account at 31 Oct 2026.",
        duration: "1 to 6 months", durationMethod: "Based on two earlier recoveries from the same customer.",
        developments: ["Payment within 14 days", "Set-off claim for the volume rebate"],
        responses: ["Send the letter of demand", "Check the volume rebate reconciliation due 25 Nov before suing"],
        missing: []
      } },
    { id: "CASE-2024-009", title: "Delay damages, terminal software release", counterparty: "Eastgate IT Solutions", type: "Commercial claim", stage: "Settled", forum: "Negotiation",
      exposure: "USD 60k received", exposureLow: null, exposureHigh: null, nextDate: null, nextEvent: "None", risk: "Low", ownerId: "legal", dataClass: "Sensitive",
      opened: "2024-11-04", contractId: "CON-2026-021", records: [], status: "Closed",
      summary: "Claim for delay damages under the earlier terminal software licence. Settled for USD 60,000 on 30 Aug 2025 without admission of liability.",
      parties: ["The Company (claimant)", "Eastgate IT Solutions (respondent)"], counsel: "In-house",
      docs: ["LP-SET-009"],
      milestones: [
        { at: "2024-11-04", kind: "Claim", text: "Delay damages claimed", by: "N. Perera" },
        { at: "2025-08-30", kind: "Settlement", text: "Settlement agreement signed for USD 60,000", by: "N. Perera" },
        { at: "2025-10-31", kind: "Closed", text: "Release 4.2 delivered; case closed", by: "K. Dias" }
      ],
      risk3: { rating: "Low", evidence: "Sufficient", factors: [{ dir: "for", text: "Settlement signed and paid", cite: { doc: "LP-SET-009", clause: "2", page: 1 } }],
        outcomes: [], compensation: "USD 60,000 received", compensationMethod: "Settlement agreement.", duration: "Closed", durationMethod: "", developments: [], responses: [], missing: [] } }
  ];

  /* Legal memos. sections: [{ key, heading, text }] with [n] markers pointing into cites (1-based). */
  var memos = {
    "CASE-2026-014": {
      status: "Draft", version: 2, modelId: "m-qwen-sh", routing: "Qwen (self-hosted), unmasked, inside the CICT VPC. No release needed for Sensitive content on a self-hosted model.",
      question: "Is the Company liable for the container damage claimed by Meridian Freight Lines, and how should we respond before the first hearing?",
      evidence: ["LP-CL-MFL", "LP-SR-221", "LP-IR-0904"], laws: ["LP-CON-2025-102", "KB-POL-DOA"],
      cites: [
        { doc: "LP-CL-MFL", clause: "b", page: 1 }, { doc: "LP-SR-221", clause: "3.2", page: 3 }, { doc: "LP-CON-2025-102", clause: "11.3", page: 9 },
        { doc: "LP-CON-2025-102", clause: "11.5", page: 9 }, { doc: "LP-CON-2025-102", clause: "11.7", page: 10 }, { doc: "LP-CON-2025-102", clause: "14.2", page: 12 },
        { doc: "LP-IR-0904", clause: "3", page: 1 }, { doc: "LP-SR-221", clause: "6", page: 6 }
      ],
      sections: [
        { key: "facts", heading: "Facts", text: "On 4 Sep 2026 three containers were damaged during discharge from MV Sample Star at berth 3. Meridian Freight Lines claims USD 86,000 for repair and cargo loss [1]. Survey report SR-221 says the lashing on bay 14 failed before the vessel arrived [2]. The claim letter was received on 15 Sep 2026, 11 days after discharge." },
        { key: "basis", heading: "Legal basis", text: "Clause 11.3 makes the Company liable only for damage caused by its negligence while containers are in its custody [3]. Clause 11.5 excludes damage from lashing done before arrival [4]. Clause 11.7 caps liability at USD 25,000 per container [5]. Clause 14.2 requires written notice within 7 days of discharge [6]." },
        { key: "analysis", heading: "Analysis", text: "If the survey finding holds, clause 11.5 excludes liability [4]. Even if negligence were shown, the cap limits exposure to USD 75,000 for three containers [5]. The late notice gives a further defence [6], though courts may not apply it strictly where the Company knew of the incident the same day.\n\n**Can't be determined yet:** whether discharge after the swinging container was seen contributed to the damage. The berth 3 camera log has not been received [7], and the surveyor did not review it [8]. This memo does not assume either way." },
        { key: "risks", heading: "Risks", text: "- Exposure USD 0 to 75,000, most likely USD 30,000 to 50,000 if settled\n- Relationship risk with a shipping line that has an active services agreement until 2028\n- If the camera log shows unsafe discharge, the clause 11.5 defence weakens" },
        { key: "recs", heading: "Recommendations", text: "- Get the berth 3 camera log from Security before 20 Nov 2026 [7]\n- File a defence relying on clauses 11.5 and 14.2 [4] [6]\n- Offer without-prejudice talks only after the camera log is reviewed\n- Review this memo again 14 days before the first hearing" }
      ],
      /* Text of version 1 where it differs from version 2 (version compare). */
      v1: {
        basis: "Clause 11.3 makes the Company liable only for damage caused by its negligence while containers are in its custody [3]. Clause 11.5 excludes damage from lashing done before arrival [4]. Clause 11.7 caps liability at USD 25,000 per container [5].",
        analysis: "If the survey finding holds, clause 11.5 excludes liability [4]. Even if negligence were shown, the cap limits exposure to USD 75,000 for three containers [5].",
        recs: "- File a defence relying on clause 11.5 [4]\n- Offer without-prejudice talks before the first hearing"
      },
      versions: [
        { v: 1, at: "2026-11-08T15:10", by: "system", note: "Generated by Qwen (self-hosted) from 3 evidence files and the shipping services agreement" },
        { v: 2, at: "2026-11-09T10:42", by: "legal", note: "Edited by N. Perera: added the late-notice point and the camera log gap" }
      ]
    },
    "CASE-2025-022": {
      status: "None", version: 0, modelId: "m-qwen-sh", routing: "Qwen (self-hosted), inside the CICT VPC. Confidential content never leaves the VPC.",
      question: "What is our best route to recover the berth 5 repair cost before mediation?",
      evidence: ["LP-IR-2025-022", "LP-MED-022"], laws: ["KB-CMP"],
      cites: [{ doc: "LP-IR-2025-022", clause: "1", page: 1 }, { doc: "LP-IR-2025-022", clause: "2", page: 1 }, { doc: "LP-IR-2025-022", clause: "5", page: 3 }, { doc: "LP-MED-022", clause: "2", page: 1 }],
      sections: [
        { key: "facts", heading: "Facts", text: "On 14 Mar 2025 MV Sample Horizon hit the berth 5 fender line while berthing with tug assistance [1]. Four fender units and 18 metres of quay edge were damaged, with repair estimated at USD 410,000 [2]." },
        { key: "basis", heading: "Legal basis", text: "The claim rests on the vessel owner's duty when berthing and on the towage terms that applied in March 2025. Those terms are not in the file, so the basis against Sapphire Tug Services can't be stated yet." },
        { key: "analysis", heading: "Analysis", text: "The pilot log records a tug line parting two minutes before contact [3]. The insurers use this to say the Company should claim against the tug operator [4]. A shared recovery looks more likely than full recovery from either party alone." },
        { key: "risks", heading: "Risks", text: "- Recovery of USD 0 to 410,000\n- A time limit may apply to any claim against the tug operator\n- Repair cost is carried by the Company until recovery" },
        { key: "recs", heading: "Recommendations", text: "- Get the towage terms in force on 14 Mar 2025 this week\n- Send a protective notice of claim to Sapphire Tug Services\n- Prepare the mediation brief with the final repair invoices" }
      ],
      versions: []
    },
    "CASE-2026-019": {
      status: "None", version: 0, modelId: "m-qwen-sh", routing: "Qwen (self-hosted), inside the CICT VPC. Confidential content never leaves the VPC.",
      question: "What is our exposure in the customs inquiry, and what do we send by 25 November?",
      evidence: ["LP-CUS-019", "LP-NOTE-019"], laws: [],
      cites: [{ doc: "LP-CUS-019", clause: "1", page: 1 }, { doc: "LP-CUS-019", clause: "2", page: 1 }, { doc: "LP-NOTE-019", clause: "1", page: 1 }, { doc: "LP-NOTE-019", clause: "2", page: 1 }],
      thin: "Not enough evidence for a probability, penalty range or duration. The memo gives a qualitative view and lists what is missing.",
      sections: [
        { key: "facts", heading: "Facts", text: "The customs authority asks for records of 46 transshipment containers handled from January to June 2026 [1], due by 25 Nov 2026 [2]. Operations found 3 containers with weight differences above 10% [3]." },
        { key: "basis", heading: "Legal basis", text: "No customs law or regulation was selected for this draft, and none is in the knowledge base for transshipment declarations. The legal basis can't be stated until the applicable rules are added." },
        { key: "analysis", heading: "Analysis", text: "**Not enough evidence.** It is not known whether the shipping agent or the terminal entered the declared weights [4]. Until the gate system logs are retrieved, any view on penalties would be a guess." },
        { key: "risks", heading: "Risks", text: "- Penalties if the terminal entered wrong weights\n- Reputational risk with the customs authority if records are late" },
        { key: "recs", heading: "Recommendations", text: "- Retrieve the March 2026 gate system logs\n- Ask the shipping agents to confirm who filed each declaration\n- Add the applicable customs rules to the knowledge base, then regenerate this memo" }
      ],
      versions: []
    },
    "CASE-2025-031": {
      status: "Confirmed", version: 1, modelId: "m-qwen-sh", routing: "Qwen (self-hosted), unmasked, inside the CICT VPC.",
      question: "Was the termination procedurally fair?",
      evidence: ["LP-LT-031", "LP-HR-031"], laws: [],
      cites: [{ doc: "LP-HR-031", clause: "4", page: 2 }, { doc: "LP-LT-031", clause: "3", page: 2 }],
      confirmedBy: "reviewer", confirmedAt: "2025-07-02T11:20",
      sections: [
        { key: "facts", heading: "Facts", text: "The inquiry found two recorded and acknowledged safety breaches in February 2025 [1]. The applicant claims reinstatement or 24 months' salary [2]." },
        { key: "basis", heading: "Legal basis", text: "Termination after a fair inquiry for proven misconduct, under the Company's disciplinary procedure." },
        { key: "analysis", heading: "Analysis", text: "The breaches are documented. The main risk is procedural: the notice of inquiry was given two days before the hearing." },
        { key: "risks", heading: "Risks", text: "- Compensation of 6 to 12 months' salary if the procedure is found unfair" },
        { key: "recs", heading: "Recommendations", text: "- Defend the application\n- Call the HR manager to explain the notice period" }
      ],
      versions: [{ v: 1, at: "2025-06-20T09:30", by: "legal", note: "Generated and edited by N. Perera" }]
    },
    "CASE-2026-007": {
      status: "None", version: 0, modelId: "m-claude-br", routing: "Claude on Bedrock. Internal content, no masking or release needed.",
      question: "Can we start recovery proceedings against Harbourline Logistics?",
      evidence: ["LP-SOA-007", "LP-LOD-007"], laws: [],
      cites: [{ doc: "LP-SOA-007", clause: "1", page: 1 }, { doc: "LP-SOA-007", clause: "2", page: 1 }, { doc: "LP-LOD-007", clause: "1", page: 1 }],
      sections: [
        { key: "facts", heading: "Facts", text: "USD 118,400 in storage charges for June to September 2026 is unpaid [1]. Three reminders went unanswered [2]." },
        { key: "basis", heading: "Legal basis", text: "Payment terms of the berth services tariff agreement CON-2024-033, and the draft letter of demand [3]." },
        { key: "analysis", heading: "Analysis", text: "The debt is documented. Harbourline may raise the volume rebate reconciliation due on 25 Nov 2026 as a set-off." },
        { key: "risks", heading: "Risks", text: "- Set-off claim reduces the amount recovered\n- Relationship risk with a tariff customer" },
        { key: "recs", heading: "Recommendations", text: "- Send the letter of demand [3]\n- Wait for the rebate reconciliation before filing a claim" }
      ],
      versions: []
    },
    "CASE-2024-009": {
      status: "Confirmed", version: 1, modelId: "m-claude-br", routing: "Claude on Bedrock after masking and release REL-0311 (sample).",
      question: "Should we accept USD 60,000 to settle the delay claim?",
      evidence: ["LP-SET-009"], laws: [], cites: [{ doc: "LP-SET-009", clause: "2", page: 1 }, { doc: "LP-SET-009", clause: "5", page: 2 }],
      confirmedBy: "reviewer", confirmedAt: "2025-08-25T16:05",
      sections: [
        { key: "facts", heading: "Facts", text: "Eastgate offered USD 60,000 and delivery of release 4.2 by 31 Oct 2025 [1]." },
        { key: "basis", heading: "Legal basis", text: "Delay damages clause of the earlier terminal software licence." },
        { key: "analysis", heading: "Analysis", text: "The offer is within the range of likely damages and secures delivery of the release. No admission of liability is given by either side [2]." },
        { key: "risks", heading: "Risks", text: "- Low. Settlement closes the claim." },
        { key: "recs", heading: "Recommendations", text: "- Accept the settlement" }
      ],
      versions: [{ v: 1, at: "2025-08-24T10:00", by: "legal", note: "Generated and edited by N. Perera" }]
    }
  };

  /* ---------- translation ---------- */
  var translation = {
    job: { id: "TR-0031", title: "Marine spares supply agreement, clauses 1 to 16 (extract)", contractId: "CON-2025-087", counterparty: "Coral Bay Marine Supplies",
      from: "zh", dataClass: "Sensitive", modelId: "m-qwen-sh", requesterId: "legal", created: "2026-11-07T11:05" },
    /* Segments: zh source, English machine draft (some with deliberate errors the checks catch). */
    segments: [
      { id: "S1", no: "1", zh: "第一条 合同双方：本合同由“公司”（买方）与珊瑚湾船舶供应有限公司（卖方）签订，合同编号CBM/2024/087。",
        en: "Clause 1. Parties: This Contract is made between the Company (the Buyer) and Coral Bay Marine Supplies (the Seller), contract no. CBM/2024/087.",
        terms: ["买方", "卖方", "珊瑚湾船舶供应有限公司"], checks: [
          { type: "Parties", status: "Passed", text: "Coral Bay Marine Supplies matches the termbase party name" },
          { type: "Numbers", status: "Passed", text: "Contract number CBM/2024/087 kept as written" }] },
      { id: "S2", no: "3", zh: "第三条 合同价格：合同总价为美元肆拾壹万贰仟伍佰元整（USD 412,500），含所有税费。",
        en: "Clause 3. Contract price: The total contract price is four hundred and twelve thousand five hundred US dollars (USD 421,500), inclusive of all taxes.",
        fix: "Clause 3. Contract price: The total contract price is four hundred and twelve thousand five hundred US dollars (USD 412,500), inclusive of all taxes.",
        terms: ["合同总价"], checks: [
          { type: "Amounts", status: "Failed", text: "Figures say USD 421,500; the source says USD 412,500 (肆拾壹万贰仟伍佰元). Words in the draft are correct.", fixable: true },
          { type: "Terms", status: "Passed", text: "合同总价 translated as total contract price" }] },
      { id: "S3", no: "7", zh: "第七条 付款条件：买方应在收到合格发票后三十（30）日内支付服务费。",
        en: "Clause 7. Payment terms: The Buyer shall pay the service fee within thirty (30) days of receiving a valid invoice.",
        terms: ["买方", "合格发票"], checks: [
          { type: "Dates and periods", status: "Passed", text: "Thirty (30) days kept in words and figures" },
          { type: "Obligations", status: "Passed", text: "应 rendered as shall" }] },
      { id: "S4", no: "9", zh: "第九条 交货：卖方应于2026年12月15日前将第一批备件交付至买方指定仓库。",
        en: "Clause 9. Delivery: The Seller shall deliver the first batch of spare parts to the Buyer's designated warehouse by 12 December 2026.",
        fix: "Clause 9. Delivery: The Seller shall deliver the first batch of spare parts to the Buyer's designated warehouse by 15 December 2026.",
        terms: ["卖方", "买方"], checks: [
          { type: "Dates and periods", status: "Failed", text: "Target says 12 December 2026; the source says 2026年12月15日 (15 December 2026).", fixable: true },
          { type: "Obligations", status: "Passed", text: "应于...前 rendered as shall ... by" }] },
      { id: "S5", no: "12", zh: "第十二条 违约责任：如任何一方未履行本合同项下的义务，应向守约方支付合同总价百分之五（5%）的违约金。",
        en: "Clause 12. Liability for breach: If either party fails to perform its obligations under this contract, it shall pay the non-defaulting party liquidated damages of five percent (5%) of the total contract price.",
        terms: ["违约金", "守约方", "合同总价"], checks: [
          { type: "Terms", status: "Passed", text: "违约金 = liquidated damages (termbase 1.6)" },
          { type: "Amounts", status: "Passed", text: "Five percent (5%) kept in words and figures" }] },
      { id: "S6", no: "13", zh: "第十三条 责任限制：除故意或重大过失外，任何一方的累计赔偿责任不超过合同总价。",
        en: "Clause 13. Limitation of liability: Except for wilful misconduct or gross negligence, each party's total liability shall not exceed the total contract price.",
        terms: ["重大过失", "赔偿责任", "合同总价"], checks: [
          { type: "Terms", status: "Passed", text: "重大过失 = gross negligence" },
          { type: "Obligations", status: "Passed", text: "Cap and exceptions kept" }] },
      { id: "S7", no: "15", zh: "第十五条 争议解决：因本合同引起的任何争议，双方应首先友好协商解决；协商不成的，提交仲裁。",
        en: "Clause 15. Dispute resolution: Any dispute arising from this contract shall first be settled through friendly negotiation; if negotiation fails, it shall be submitted to arbitration.",
        fix: "Clause 15. Dispute resolution: Any dispute arising from this contract shall first be settled through amicable negotiation; if negotiation fails, it shall be submitted to arbitration.",
        terms: ["友好协商", "仲裁"], ambiguous: "提交仲裁 names no arbitration body, seat or rules. The English keeps the gap; a person must decide whether to raise it with the counterparty.",
        checks: [
          { type: "Terms", status: "Check", text: "Termbase prefers amicable negotiation for 友好协商, not friendly negotiation", fixable: true },
          { type: "Ambiguity", status: "Check", text: "No arbitration body, seat or rules named in the source" }] },
      { id: "S8", no: "16", zh: "第十六条 适用法律：本合同适用斯里兰卡法律。",
        en: "Clause 16. Governing law: This Contract is governed by the laws of Sri Lanka.",
        terms: [], checks: [{ type: "Parties", status: "Passed", text: "No parties named" }] }
    ],
    segmentHistory: {
      S5: [{ at: "2026-11-07T11:06", by: "system", text: "Machine draft, Qwen (self-hosted)" }, { at: "2026-11-07T14:30", by: "reviewer", text: "Li Wei confirmed 违约金 = liquidated damages (not penalty)" }],
      S7: [{ at: "2026-11-07T11:06", by: "system", text: "Machine draft, Qwen (self-hosted)" }, { at: "2026-11-07T11:07", by: "system", text: "Flagged: no arbitration body named" }]
    },
    termbase: [
      { id: "TB-001", zh: "违约金", en: "liquidated damages", avoid: "penalty", domain: "Contract", status: "Under review", note: "Use penalty only where the clause is punitive. Review open in task T-05.", ownerName: "Li Wei", updated: "2026-10-01" },
      { id: "TB-002", zh: "守约方", en: "non-defaulting party", avoid: "observant party", domain: "Contract", status: "Approved", note: "", ownerName: "Li Wei", updated: "2026-10-01" },
      { id: "TB-003", zh: "违约方", en: "defaulting party", avoid: "", domain: "Contract", status: "Approved", note: "", ownerName: "Li Wei", updated: "2026-10-01" },
      { id: "TB-004", zh: "仲裁", en: "arbitration", avoid: "", domain: "Disputes", status: "Under review", note: "Add preferred wording for the arbitration body once CICT confirms its standard clause. Task T-05.", ownerName: "Li Wei", updated: "2026-10-01" },
      { id: "TB-005", zh: "友好协商", en: "amicable negotiation", avoid: "friendly negotiation", domain: "Disputes", status: "Approved", note: "", ownerName: "Li Wei", updated: "2026-09-12" },
      { id: "TB-006", zh: "重大过失", en: "gross negligence", avoid: "serious fault", domain: "Liability", status: "Approved", note: "", ownerName: "Li Wei", updated: "2026-09-12" },
      { id: "TB-007", zh: "赔偿责任", en: "liability", avoid: "compensation duty", domain: "Liability", status: "Approved", note: "Use liability for damages where the clause is about amount.", ownerName: "Li Wei", updated: "2026-09-12" },
      { id: "TB-008", zh: "合同总价", en: "total contract price", avoid: "contract total", domain: "Commercial", status: "Approved", note: "", ownerName: "Li Wei", updated: "2026-08-20" },
      { id: "TB-009", zh: "合格发票", en: "valid invoice", avoid: "qualified invoice", domain: "Commercial", status: "Approved", note: "", ownerName: "N. Perera", updated: "2026-08-20" },
      { id: "TB-010", zh: "不可抗力", en: "force majeure", avoid: "", domain: "Contract", status: "Approved", note: "", ownerName: "Li Wei", updated: "2026-08-20" },
      { id: "TB-011", zh: "买方", en: "Buyer", avoid: "purchaser", domain: "Parties", status: "Approved", note: "Capitalised when defined", ownerName: "Li Wei", updated: "2026-08-20" },
      { id: "TB-012", zh: "卖方", en: "Seller", avoid: "vendor", domain: "Parties", status: "Approved", note: "Capitalised when defined", ownerName: "Li Wei", updated: "2026-08-20" },
      { id: "TB-013", zh: "珊瑚湾船舶供应有限公司", en: "Coral Bay Marine Supplies", avoid: "", domain: "Party name", status: "Approved", note: "Sample counterparty", ownerName: "N. Perera", updated: "2026-07-14" },
      { id: "TB-014", zh: "滞期费", en: "demurrage", avoid: "delay fee", domain: "Shipping", status: "Approved", note: "", ownerName: "Li Wei", updated: "2026-07-14" }
    ],
    jobs: [
      { id: "TR-0031", title: "Marine spares supply agreement, clauses 1 to 16 (extract)", kind: "Contract", pair: "Chinese to English", segments: 8, status: "In progress", requesterId: "legal", updated: "2026-11-07T11:05", dataClass: "Sensitive", model: "Qwen (self-hosted)", ref: "CON-2025-087" },
      { id: "TR-0032", title: "Clause 12 only, for a second opinion on Bedrock", kind: "Contract", pair: "Chinese to English", segments: 1, status: "Waiting for release", requesterId: "legal", updated: "2026-11-10T09:58", dataClass: "Sensitive", model: "Qwen on Bedrock", ref: "CON-2025-087", releaseId: "REL-0417" },
      { id: "TR-0030", title: "Legal opinion on berth 5 damage, for headquarters", kind: "Legal opinion", pair: "English to Chinese", segments: 14, status: "Confirmed", requesterId: "legal", updated: "2026-11-03T16:40", dataClass: "Confidential", model: "Qwen (self-hosted)", ref: "CASE-2025-022", confirmedBy: "reviewer" },
      { id: "TR-0029", title: "Letter to Sapphire Tug Services, notice of claim", kind: "Correspondence", pair: "English to Sinhala", segments: 6, status: "Draft", requesterId: "legal", updated: "2026-11-02T10:15", dataClass: "Internal", model: "Model chosen in Discovery (A9)", ref: "CASE-2025-022" },
      { id: "TR-0027", title: "Port dues notice, for the Commercial team", kind: "Law or regulation", pair: "Sinhala to English", segments: 9, status: "Confirmed", requesterId: "legal", updated: "2026-10-28T09:00", dataClass: "Public", model: "Qwen (self-hosted)", ref: "REG-1107", confirmedBy: "reviewer" },
      { id: "TR-0025", title: "Headquarters anti-bribery policy 2024, reference text", kind: "Policy", pair: "Chinese to English", segments: 64, status: "Confirmed", requesterId: "compliance", updated: "2026-09-30T12:00", dataClass: "Internal", model: "Qwen on Bedrock", ref: "POL-HQ-ABP", confirmedBy: "reviewer" }
    ]
  };

  /* ---------- regulatory monitoring ---------- */
  var regulatory = {
    lastRun: "2026-11-10T06:30",
    sources: [
      { id: "SRC-1", name: "Government gazette (sample source)", area: "All areas", freq: "Daily, 06:30", status: "Healthy", lastCheck: "2026-11-10T06:30", lastChange: "2026-11-10T06:30", docs: 1240, note: "" },
      { id: "SRC-2", name: "Customs notices (sample source)", area: "Operations, customs", freq: "Daily, 06:30", status: "Healthy", lastCheck: "2026-11-10T06:31", lastChange: "2026-11-10T06:31", docs: 312, note: "" },
      { id: "SRC-3", name: "Ports regulator circulars (sample source)", area: "Operations, safety", freq: "Daily, 06:30", status: "Healthy", lastCheck: "2026-11-10T06:31", lastChange: "2026-11-04T06:30", docs: 188, note: "" },
      { id: "SRC-4", name: "Data protection guidance (sample source)", area: "Legal, IT", freq: "Daily, 06:30", status: "Healthy", lastCheck: "2026-11-10T06:32", lastChange: "2026-11-08T06:30", docs: 46, note: "" },
      { id: "SRC-5", name: "Bills before Parliament (sample source)", area: "All areas", freq: "Daily, 06:30", status: "Partial", lastCheck: "2026-11-10T06:33", lastChange: "2026-11-07T06:30", docs: 95, note: "Page layout changed on 7 Nov. 1 document could not be read and is marked unverified." },
      { id: "SRC-6", name: "Exchange control directions (sample source)", area: "Finance", freq: "Daily, 06:30", status: "Healthy", lastCheck: "2026-11-10T06:33", lastChange: "2026-11-01T06:30", docs: 71, note: "" },
      { id: "SRC-7", name: "Labour circulars (sample source)", area: "HR", freq: "Daily, 06:30", status: "Failed", lastCheck: "2026-11-10T06:34", lastChange: "2026-10-21T06:30", docs: 133, note: "Unreachable since 9 Nov, 06:30. Connection timed out after 3 tries. Last good check 8 Nov." }
    ],
    runs: [
      { at: "2026-11-10T06:30", checked: 6, of: 7, found: 2, note: "Labour circulars unreachable. Bills page partly unreadable." },
      { at: "2026-11-09T06:30", checked: 6, of: 7, found: 0, note: "Labour circulars unreachable for the first time." },
      { at: "2026-11-08T06:30", checked: 7, of: 7, found: 1, note: "" },
      { at: "2026-11-07T06:30", checked: 7, of: 7, found: 1, note: "Bills page layout changed." }
    ],
    updates: [
      { id: "REG-1107", title: "Port dues schedule amended for transshipment containers (illustrative)", sourceId: "SRC-1", change: "Amended", detected: "2026-11-10T06:30", published: "2026-11-07", effective: "2027-01-01",
        relevance: "High", areas: ["Commercial", "Tariffs"], status: "New", verified: true, dataClass: "Public", link: "official gazette page (sample link)",
        summary: "The port dues rate for transshipment containers rises from LKR 1,850 to LKR 2,050 per TEU from 1 Jan 2027. Existing tariff agreements that pass port dues through at a fixed rate may need repricing.",
        impact: "Berth services tariff agreement CON-2024-033 with Harbourline Logistics fixes port dues at LKR 1,850 per TEU until 2027. The Company may absorb the difference unless the agreement allows pass-through.",
        verify: ["Whether CON-2024-033 allows pass-through of statutory changes", "Whether other tariff agreements fix port dues", "Effective date for vessels already scheduled in January"],
        before: "Port dues for transshipment containers shall be LKR 1,850 per twenty-foot equivalent unit, payable by the terminal operator within 30 days of the vessel's departure.",
        after: "Port dues for transshipment containers shall be LKR 2,050 per twenty-foot equivalent unit, payable by the terminal operator within 21 days of the vessel's departure, with effect from 1 January 2027.",
        links: [{ label: "CON-2024-033 Berth services tariff agreement", route: "contracts", params: { id: "CON-2024-033" } }] },
      { id: "REG-1106", title: "Customs notice on electronic cargo manifest deadlines (illustrative)", sourceId: "SRC-2", change: "New", detected: "2026-11-10T06:31", published: "2026-11-09", effective: "2026-12-01",
        relevance: "Medium", areas: ["Operations", "Customs"], status: "New", verified: true, dataClass: "Public", link: "customs notices page (sample link)",
        summary: "Electronic cargo manifests must be lodged 48 hours before arrival instead of 24 hours, from 1 Dec 2026.",
        impact: "Shipping lines lodge manifests, but the terminal's berth planning relies on them. Late manifests may delay berthing windows. Related to the open customs inquiry CASE-2026-019.",
        verify: ["Whether the terminal has any lodging duty itself", "Whether service agreements with shipping lines need a notice"],
        before: "The carrier shall lodge the electronic cargo manifest not less than 24 hours before the vessel's arrival.",
        after: "The carrier shall lodge the electronic cargo manifest not less than 48 hours before the vessel's arrival. Late lodgement may result in a penalty for each container declared late.",
        links: [{ label: "CASE-2026-019 Customs inquiry", route: "legal", params: { id: "CASE-2026-019" } }] },
      { id: "REG-1103", title: "Draft guidance on cross-border transfer of personal data (illustrative)", sourceId: "SRC-4", change: "New", detected: "2026-11-08T06:30", published: "2026-11-06", effective: null,
        relevance: "High", areas: ["Legal", "IT", "Data protection"], status: "New", verified: true, dataClass: "Public", link: "data protection guidance page (sample link)",
        summary: "Draft guidance sets conditions for processing personal data outside Sri Lanka, including records of transfers and contract terms with the processor. Comments are open until 6 Dec 2026.",
        impact: "This platform runs in ap-south-1 (Mumbai), so personal data in contracts and records is processed outside Sri Lanka (assumption A1). Transfer records and processor terms may be needed. The draft Use of AI tools policy should reference it.",
        verify: ["Whether the guidance applies to masked data", "Whether Bedrock processing in ap-south-1 counts as a transfer", "Which policies need an update: Information security v5, Use of AI tools draft 1"],
        before: "",
        after: "A controller may process personal data in a third country only where it keeps a record of each category of transfer and has a written contract with the processor that meets the conditions in Schedule 2.",
        links: [{ label: "Policy POL-AI Use of AI tools", route: "policies", params: { id: "POL-AI" } }, { label: "Knowledge base: Personal Data Protection Act", route: "knowledge", params: { id: "KB-LAW-PDPA" } }] },
      { id: "REG-1101", title: "Bill to amend employment records for overtime (illustrative)", sourceId: "SRC-5", change: "New bill", detected: "2026-11-07T06:30", published: "2026-11-05", effective: null,
        relevance: "Medium", areas: ["HR"], status: "New", verified: false, dataClass: "Public", link: "bills page (sample link)",
        summary: "A bill would require employers to keep daily overtime records for 6 years and give employees monthly copies. It is at first reading.",
        impact: "Shift workers at the terminal log overtime in the rostering system, kept for 3 years. Retention and payslip changes would be needed if the bill passes.",
        verify: ["Bill text is unverified: the page layout changed and 1 attachment could not be read", "Retention period for rostering records", "Whether contractors' staff are covered"],
        before: "", after: "Every employer shall keep a daily record of overtime worked by each employee for not less than six years, and shall give each employee a copy of that record every month.",
        links: [] },
      { id: "REG-1098", title: "Exchange control direction on payments to non-residents (illustrative)", sourceId: "SRC-6", change: "Amended", detected: "2026-11-01T06:30", published: "2026-10-30", effective: "2026-11-01",
        relevance: "Low", areas: ["Finance"], status: "Dismissed", dismissedBy: "legal", dismissReason: "Reporting form only. No change to payments under current contracts.", verified: true, dataClass: "Public", link: "exchange control page (sample link)",
        summary: "Banks must use a new reporting form for payments to non-residents above USD 50,000.", impact: "Reporting is done by the bank. No action for the Company.", verify: [],
        before: "Payments above USD 50,000 to non-residents shall be reported by the bank in Form EC-4.", after: "Payments above USD 50,000 to non-residents shall be reported by the bank in Form EC-4A.", links: [] },
      { id: "REG-1095", title: "Ports regulator circular on hazardous cargo storage (illustrative)", sourceId: "SRC-3", change: "Amended", detected: "2026-11-04T06:30", published: "2026-11-03", effective: "2027-02-01",
        relevance: "High", areas: ["Operations", "Safety"], status: "Task created", taskId: "VT-0218", verified: true, dataClass: "Public", link: "ports regulator page (sample link)",
        summary: "Class 1 and class 7 hazardous containers must be stored at least 25 metres from other stacks, up from 15 metres.",
        impact: "Yard block H holds hazardous containers 18 metres from the nearest stack. The layout may need to change before 1 Feb 2027.",
        verify: ["Current distances in yard block H", "Whether service agreements with shipping lines refer to the old rule"],
        before: "Hazardous containers of class 1 and class 7 shall be stored at least 15 metres from other container stacks.",
        after: "Hazardous containers of class 1 and class 7 shall be stored at least 25 metres from other container stacks, with effect from 1 February 2027.", links: [] },
      { id: "REG-1090", title: "Labour circular on shift allowances, uploaded by hand", sourceId: "SRC-7", change: "Manual import", detected: "2026-11-09T15:20", published: "2026-11-08", effective: null,
        relevance: "Medium", areas: ["HR"], status: "New", verified: false, manual: true, importedBy: "legal", dataClass: "Public", link: "uploaded PDF (sample)",
        summary: "Circular on how night shift allowances are calculated. Added by hand because the source has been unreachable since 9 Nov.",
        impact: "May affect the night shift allowance in the collective agreement. Text not yet verified against the official source.",
        verify: ["Check the text against the official source once it is reachable"], before: "", after: "Night shift allowance shall be calculated on the basic daily wage, not on the consolidated wage.", links: [] }
    ],
    tasks: [
      { id: "VT-0218", updateId: "REG-1095", title: "Check yard block H distances against the new hazardous storage rule", dept: "Operations", assigneeName: "T. Bandara", due: "2026-11-25", status: "In progress", created: "2026-11-04T09:10" },
      { id: "VT-0211", updateId: "REG-1062", title: "Update the records retention schedule after the archives notice", dept: "Records", assigneeName: "P. Senanayake", due: "2026-10-31", status: "Done", created: "2026-10-12T10:00" }
    ]
  };

  /* ---------- policies ---------- */
  var STAGES = ["Drafting", "Consultation", "Review", "Approval", "Issue", "Revision", "Repeal"];
  var policies = [
    { id: "POL-GH", no: "CMP-COM-07", title: "Gifts and hospitality", hierarchy: "Company policy", area: "Compliance", dept: "Compliance and Risk", ownerId: "compliance", approver: "Management Committee",
      scope: "All staff and contractors' staff working on site", parent: "POL-HQ-ABP", currentVersion: "3", stage: 1, nextReview: "2027-06-30",
      versions: [
        { v: "4", status: "In consultation", label: "Draft 4", docId: "LP-POL-GH-4", published: null, effective: null, until: null, note: "Consultation closes 18 Nov 2026" },
        { v: "3", status: "In force", label: "Version 3", docId: "LP-POL-GH-3", published: "2023-06-15", effective: "2023-07-01", until: null },
        { v: "2", status: "Superseded", label: "Version 2", docId: null, published: "2019-03-01", effective: "2019-04-01", until: "2023-06-30" }
      ],
      reviewId: "REV-0201", acks: { done: 412, of: 455 },
      log: [
        { at: "2026-10-28T09:30", stage: "Drafting", by: "compliance", text: "Draft 4 prepared from the headquarters anti-bribery policy 2024 and the policy template" },
        { at: "2026-10-28T09:42", stage: "Drafting", by: "system", text: "Completeness check: responsibilities, approval authority and procedure present. Record owner missing, added to 6.1." },
        { at: "2026-11-02T09:00", stage: "Consultation", by: "compliance", text: "Consultation opened with Legal, Procurement, HR, Finance and Commercial. Closes 18 Nov." },
        { at: "2026-11-02T09:00", stage: "Review", by: "compliance", text: "Sent to Li Wei for specialist review (REV-0201)" },
        { at: "2026-11-05T14:10", stage: "Consultation", by: "p-procurement", text: "Procurement: 5 working days is tight for staff on site. Suggest 10." },
        { at: "2026-11-06T11:00", stage: "Consultation", by: "legal", text: "Legal: no objection. Clause 4.5 should define public official." },
        { at: "2026-11-07T16:30", stage: "Consultation", by: "p-hr", text: "HR: add the policy to induction training." }
      ],
      consultation: [
        { dept: "Legal", status: "Responded" }, { dept: "Procurement", status: "Responded" }, { dept: "HR", status: "Responded" },
        { dept: "Finance", status: "Waiting" }, { dept: "Commercial", status: "Waiting" }
      ] },
    { id: "POL-PRC", no: "CMP-PRC-01", title: "Procurement", hierarchy: "Company policy", area: "Procurement", dept: "Procurement", ownerId: "p-procurement", approver: "Board",
      scope: "All purchases of goods, works and services", parent: "KB-CMP", currentVersion: "3.3", stage: 4, nextReview: "2027-03-31",
      versions: [
        { v: "3.3", status: "In force", label: "Version 3.3", docId: "LP-POL-PRC-33", published: "2026-03-15", effective: "2026-04-01", until: null },
        { v: "3.2", status: "Superseded", label: "Version 3.2", docId: "LP-POL-PRC-32", published: "2022-12-10", effective: "2023-01-01", until: "2026-03-31", note: "Still applies to contracts signed before 1 Apr 2026" }
      ],
      acks: { done: 61, of: 64 },
      log: [
        { at: "2026-01-12T10:00", stage: "Drafting", by: "p-procurement", text: "Revision 3.3 drafted after internal audit finding IA-2025-14" },
        { at: "2026-02-02T09:00", stage: "Consultation", by: "p-procurement", text: "Consultation with Finance and Legal" },
        { at: "2026-02-20T15:00", stage: "Review", by: "legal", text: "Legal review completed" },
        { at: "2026-03-12T11:00", stage: "Approval", by: "cosec", text: "Approved by the Board, resolution BR-2026-05 (sample)" },
        { at: "2026-03-15T09:00", stage: "Issue", by: "p-procurement", text: "Issued, effective 1 Apr 2026. Version 3.2 superseded from 31 Mar 2026." }
      ] },
    { id: "POL-DOA", no: "CMP-SEC-02", title: "Delegation of authority", hierarchy: "Company policy", area: "Governance", dept: "Company Secretariat", ownerId: "cosec", approver: "Board",
      scope: "All approval limits for staff and committees", parent: "KB-AOA", currentVersion: "2", stage: 4, nextReview: "2026-12-31",
      versions: [{ v: "2", status: "In force", label: "Version 2", docId: "LP-POL-DOA", published: "2024-12-10", effective: "2025-01-01", until: null }],
      acks: { done: 38, of: 40 },
      log: [
        { at: "2024-11-20T10:00", stage: "Approval", by: "cosec", text: "Approved by the Board, resolution BR-2024-11 (sample)" },
        { at: "2024-12-10T09:00", stage: "Issue", by: "cosec", text: "Issued, effective 1 Jan 2025" }
      ] },
    { id: "POL-WB", no: "CMP-COM-03", title: "Whistleblowing", hierarchy: "Company policy", area: "Compliance", dept: "Compliance and Risk", ownerId: "compliance", approver: "Board",
      scope: "All staff, contractors and suppliers", parent: "POL-HQ-WB", currentVersion: "2", stage: 4, nextReview: "2026-10-01",
      versions: [{ v: "2", status: "In force", label: "Version 2", docId: "LP-POL-WB", published: "2022-09-15", effective: "2022-10-01", until: null }],
      acks: { done: 430, of: 455 },
      log: [{ at: "2022-09-15T09:00", stage: "Issue", by: "compliance", text: "Issued, effective 1 Oct 2022" }] },
    { id: "POL-IS", no: "CMP-IT-01", title: "Information security", hierarchy: "Company policy", area: "IT", dept: "IT", ownerId: "admin", approver: "Management Committee",
      scope: "All information systems and users", parent: "KB-CMP", currentVersion: "5", stage: 4, nextReview: "2027-02-28",
      versions: [
        { v: "5", status: "In force", label: "Version 5", docId: null, published: "2025-02-20", effective: "2025-03-01", until: null },
        { v: "4", status: "Superseded", label: "Version 4", docId: null, published: "2022-05-01", effective: "2022-05-15", until: "2025-02-28" }
      ],
      acks: { done: 449, of: 455 },
      log: [{ at: "2025-02-20T09:00", stage: "Issue", by: "admin", text: "Issued, effective 1 Mar 2025" }] },
    { id: "POL-AI", no: "CMP-IT-04", title: "Use of AI tools", hierarchy: "Company policy", area: "IT", dept: "IT and Legal", ownerId: "legal", approver: "Management Committee",
      scope: "All use of AI assistants and model services", parent: "POL-IS", currentVersion: null, stage: 0, nextReview: null,
      versions: [{ v: "1", status: "Draft", label: "Draft 1", docId: "LP-POL-AI", published: null, effective: null, until: null }],
      acks: null,
      log: [
        { at: "2026-10-30T10:00", stage: "Drafting", by: "legal", text: "Draft 1 started for the assistant platform" },
        { at: "2026-10-30T10:05", stage: "Drafting", by: "system", text: "Completeness check: approval authority missing for exceptions. Execution procedure incomplete." }
      ] },
    { id: "POL-RR", no: "CMP-REC-01", title: "Records retention", hierarchy: "Company policy", area: "Records", dept: "Records", ownerId: "p-records", approver: "Management Committee",
      scope: "All Company records", parent: "KB-CMP", currentVersion: null, stage: 6, nextReview: null, repealedBy: "Records retention schedule 2.0 (sample)",
      versions: [{ v: "1.2", status: "Repealed", label: "Version 1.2", docId: null, published: "2018-01-10", effective: "2018-02-01", until: "2025-12-31", note: "Repealed 1 Jan 2026, replaced by the records retention schedule 2.0" }],
      acks: null,
      log: [{ at: "2025-12-15T09:00", stage: "Repeal", by: "p-records", text: "Repealed with effect from 1 Jan 2026. Replaced by the records retention schedule 2.0." }] },
    { id: "POL-HQ-ABP", no: "HQ-COMP-2024-03", title: "Anti-bribery (headquarters)", hierarchy: "Headquarters policy", area: "Compliance", dept: "Headquarters compliance", ownerId: "compliance", approver: "Headquarters board",
      scope: "All subsidiaries", parent: null, currentVersion: "2024", stage: 4, nextReview: null, hq: true,
      versions: [{ v: "2024", status: "In force", label: "2024", docId: "LP-HQ-ABP", published: "2024-06-01", effective: "2024-07-01", until: null }],
      acks: null, log: [{ at: "2024-06-01T09:00", stage: "Issue", by: "system", text: "Received from headquarters. English reference text confirmed by Li Wei (TR-0025)." }] },
    { id: "POL-HQ-WB", no: "HQ-COMP-2023-01", title: "Whistleblowing (headquarters)", hierarchy: "Headquarters policy", area: "Compliance", dept: "Headquarters compliance", ownerId: "compliance", approver: "Headquarters board",
      scope: "All subsidiaries", parent: null, currentVersion: "2023", stage: 4, nextReview: null, hq: true,
      versions: [{ v: "2023", status: "In force", label: "2023", docId: "LP-HQ-WB", published: "2023-02-01", effective: "2023-03-01", until: null }],
      acks: null, log: [{ at: "2023-02-01T09:00", stage: "Issue", by: "system", text: "Received from headquarters" }] }
  ];

  /* Clause-by-clause changes with the basis for each. */
  var compare = {
    "POL-GH": { from: "LP-POL-GH-3", to: "LP-POL-GH-4", fromLabel: "Version 3", toLabel: "Draft 4", basis: {
      "4.2": { text: "Headquarters anti-bribery policy requires declaration to the compliance function within five working days, above about USD 20.", cite: { doc: "LP-HQ-ABP", clause: "3.1", page: 4 } },
      "4.5": { text: "Headquarters anti-bribery policy requires prior written approval for anything offered to public officials.", cite: { doc: "LP-HQ-ABP", clause: "3.4", page: 5 } },
      "6.1": { text: "Headquarters policy requires seven years. Owner named to close the completeness gap.", cite: { doc: "LP-HQ-ABP", clause: "5.2", page: 9 } },
      "7.2": { text: "Declarations now go to Compliance, which keeps one register (see REC-2026-0201). The department paper register is no longer needed.", cite: null }
    } },
    "POL-PRC": { from: "LP-POL-PRC-32", to: "LP-POL-PRC-33", fromLabel: "Version 3.2", toLabel: "Version 3.3", basis: {
      "2.4": { text: "Management Committee decision MC-2026-03 (sample) raised the limit. Conflicts with Delegation of authority v2, see the headquarters alignment finding.", cite: { doc: "LP-POL-DOA", clause: "4.1", page: 6 }, warn: true },
      "3.1": { text: "Internal audit finding IA-2025-14 (sample): split purchases avoided the quotation rule.", cite: null },
      "5.1": { text: "Supplier approval moved to Procurement after due diligence, in line with the headquarters rule on a single designated function.", cite: { doc: "LP-HQ-ABP", clause: "6.3", page: 11 } }
    } }
  };

  var alignment = [
    { id: "AL-01", type: "Missing requirement", severity: "Medium", policyId: "POL-GH", status: "Addressed in draft",
      company: { label: "Gifts and hospitality v3", cite: { doc: "LP-POL-GH-3", clause: "4.4", page: 3 }, text: "No rule on hospitality for public officials." },
      other: { label: "Headquarters anti-bribery policy 3.4", cite: { doc: "LP-HQ-ABP", clause: "3.4", page: 5 } },
      explain: "The headquarters policy requires prior written approval for gifts or hospitality offered to public officials. The company policy is silent.",
      proposal: "Add clause 4.5. Already in draft 4.", legalJudgment: false },
    { id: "AL-02", type: "Conflicting authority", severity: "High", policyId: "POL-PRC", status: "Open",
      company: { label: "Procurement policy 3.3, clause 2.4", cite: { doc: "LP-POL-PRC-33", clause: "2.4", page: 5 }, text: "Head of Procurement may approve up to USD 500,000." },
      other: { label: "Delegation of authority v2, clause 4.1", cite: { doc: "LP-POL-DOA", clause: "4.1", page: 6 } },
      explain: "Two company policies give the same role different limits. A contract between USD 300,000 and USD 500,000 could be approved under one and be unauthorised under the other.",
      proposal: "Align both at one limit. Until then, treat USD 300,000 as the limit because the delegation of authority is approved by the Board.", legalJudgment: true },
    { id: "AL-03", type: "Inconsistent terms", severity: "Low", policyId: "POL-PRC", status: "Open",
      company: { label: "Procurement policy 3.3, clause 1.3", cite: { doc: "LP-POL-PRC-33", clause: "1.3", page: 2 }, text: "Related party: directors, senior managers and close family." },
      other: { label: "Delegation of authority v2, clause 1.2", cite: { doc: "LP-POL-DOA", clause: "1.2", page: 2 } },
      explain: "Related party is defined differently in two policies. The Articles of Association give a third, wider definition.",
      proposal: "Use the definition in Article 2 of the Articles of Association in both policies.", authority: { doc: "LP-AOA", clause: "2", page: 3 }, legalJudgment: false },
    { id: "AL-04", type: "Contradictory procedure", severity: "High", policyId: "POL-WB", status: "Open",
      company: { label: "Whistleblowing policy v2, clause 3.1", cite: { doc: "LP-POL-WB", clause: "3.1", page: 3 }, text: "Concerns go to the line manager, who decides whether to escalate." },
      other: { label: "Headquarters whistleblowing policy 2.3", cite: { doc: "LP-HQ-WB", clause: "2.3", page: 3 } },
      explain: "Headquarters requires a channel that does not pass through the reporter's management line. The company procedure sends every concern to the line manager first.",
      proposal: "Add a direct channel to Compliance and an external hotline. Keep the line manager route as an option.", legalJudgment: true },
    { id: "AL-05", type: "Overlapping responsibility", severity: "Medium", policyId: "POL-PRC", status: "Open",
      company: { label: "Procurement policy 3.3, clause 5.1", cite: { doc: "LP-POL-PRC-33", clause: "5.1", page: 12 }, text: "Procurement approves new suppliers after due diligence." },
      other: { label: "Delegation of authority v2, clause 6.2", cite: { doc: "LP-POL-DOA", clause: "6.2", page: 10 } },
      explain: "Both Procurement and Finance are named as approvers of new suppliers. Headquarters requires a single designated function.",
      proposal: "Procurement approves suppliers. Finance confirms bank details only.", authority: { doc: "LP-HQ-ABP", clause: "6.3", page: 11 }, legalJudgment: false }
  ];

  var reviewSchedule = [
    { id: "PR-01", policyId: "POL-WB", cycle: "Every 4 years", due: "2026-10-01", ownerName: "R. Fernando", status: "Overdue", trigger: "Periodic review", outcome: "" },
    { id: "PR-02", policyId: "POL-DOA", cycle: "Every 2 years", due: "2026-12-31", ownerName: "A. Jayawardena", status: "Due soon", trigger: "Periodic review", outcome: "" },
    { id: "PR-03", policyId: "POL-AI", cycle: "On change", due: "2026-12-06", ownerName: "N. Perera", status: "Due soon", trigger: "Regulatory update REG-1103, data transfer guidance", outcome: "" },
    { id: "PR-04", policyId: "POL-IS", cycle: "On change", due: "2026-12-06", ownerName: "K. Dias", status: "Scheduled", trigger: "Regulatory update REG-1103, data transfer guidance", outcome: "" },
    { id: "PR-05", policyId: "POL-PRC", cycle: "Every 3 years", due: "2027-03-31", ownerName: "D. Fonseka", status: "Scheduled", trigger: "Periodic review", outcome: "" },
    { id: "PR-06", policyId: "POL-GH", cycle: "On change", due: "2024-09-30", ownerName: "R. Fernando", status: "Done", trigger: "Headquarters anti-bribery policy 2024", outcome: "Draft 4 started" }
  ];

  D.legalPolicy = {
    cases: cases, memos: memos, translation: translation, regulatory: regulatory,
    policies: policies, stages: STAGES, compare: compare, alignment: alignment, reviewSchedule: reviewSchedule,
    departments: ["Legal", "Commercial", "Operations", "Finance", "HR", "IT", "Records", "Compliance and Risk"]
  };
})();
