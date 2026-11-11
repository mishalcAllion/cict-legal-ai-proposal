/* Mock data for screen area: approvals, reviews and masking review.
   Every name, company, document and figure here is a fictional sample.
   Adds extra release requests and reviews so the Data owner and Specialist reviewer queues are never empty,
   sample source documents for review citations, provider data terms and masking details. */
(function () {
  "use strict";
  var APP = window.APP, D = window.APP_DATA;
  if (!APP || !D) return;

  /* ---------- sample source documents (cited by the seeded reviews) ---------- */
  [
    { id: "AR-DD-MFL", title: "Due diligence evidence pack: Meridian Freight Lines (sample)", kind: "Evidence pack", totalPages: 7, dataClass: "Sensitive", version: "Compiled 9 Nov 2026",
      pages: [
        { n: 1, clauses: [
          { id: "reg", heading: "Company registry extract", text: "Meridian Freight Lines (Pvt) Ltd, registration no. PV 00-4471, incorporated in Sri Lanka on 14 June 2011. Status: active. Registered office: Colombo 01." }
        ] },
        { n: 2, clauses: [
          { id: "bo", heading: "Beneficial ownership declaration", text: "60% held by Harbour Crest Holdings (Pvt) Ltd, whose owners are named and verified against the registry. 40% held by Seaway Nominees Ltd as nominee. The person for whom the nominee holds the shares is not stated." }
        ] },
        { n: 4, clauses: [
          { id: "lic", heading: "Operating licence copy", text: "Freight operator licence MFL/OPS/2021/0447, valid from 1 October 2021 to 30 September 2026.",
            note: { kind: "warning", text: "Stamp and signature at the foot of the page could not be read." } }
        ] },
        { n: 5, clauses: [
          { id: "scr", heading: "Sanctions screening result", text: "Screened against OFAC and EU lists refreshed 10 Nov 2026, 06:00. Possible match: list entry \"Meridian Freight Line Co.\", similarity 0.86. The list entry gives a different country and a different registration number." }
        ] },
        { n: 6, clauses: [
          { id: "lit", heading: "Litigation search", text: "One open cargo damage claim against the counterparty, filed in March 2026, concerning container damage at the berth. No other proceedings found in the last five years." }
        ] }
      ] },
    { id: "AR-RET-SCHED", title: "Records retention schedule v3 (sample)", kind: "Company policy", totalPages: 8, dataClass: "Internal", version: "v3, in force since 1 Jan 2025",
      pages: [
        { n: 2, clauses: [
          { id: "2.1", heading: "2.1 Signed contracts", text: "Signed contracts and their amendments are kept for ten (10) years after the contract ends or is terminated." }
        ] },
        { n: 3, clauses: [
          { id: "2.4", heading: "2.4 Scanned copies", text: "A certified scan may replace a paper original, except for contracts with a value above USD 1 million, whose paper originals are kept until the retention period ends." }
        ] },
        { n: 6, clauses: [
          { id: "5.2", heading: "5.2 Disposal holds", text: "No record may be disposed of while a legal hold, dispute or audit applies to it. Disposal needs the written approval of the records owner and Legal." }
        ] }
      ] },
    { id: "AR-TPL-SVC3", title: "Services agreement template v3 (sample)", kind: "Contract template", totalPages: 12, dataClass: "Internal", version: "v3, in force since 1 Feb 2026",
      pages: [
        { n: 5, clauses: [
          { id: "8.1", heading: "8.1 Liability", text: "The Contractor's total liability under this Agreement is capped at 100% of the contract price." },
          { id: "8.3", heading: "8.3 Insurance", text: "The Contractor shall keep public liability insurance of at least USD 2,000,000 and employer's liability insurance as required by law." }
        ] },
        { n: 9, clauses: [
          { id: "14.2", heading: "14.2 Confidentiality", text: "Each party shall keep the other party's confidential information secret during the term and for five (5) years after it ends." }
        ] }
      ] },
    { id: "AR-SAP-TOW", title: "Harbour towage services agreement (sample)", kind: "Contract", totalPages: 8, dataClass: "Internal", version: "Signed 25 Jan 2026",
      pages: [
        { n: 3, clauses: [
          { id: "6", heading: "6. Towage log", text: "The Contractor shall deliver a towage log for the previous month by the fifth (5th) day of each month, listing each vessel, time and tug used." }
        ] },
        { n: 7, clauses: [
          { id: "15", heading: "15. Disputes", text: "Any dispute arising from this Agreement shall be referred to arbitration in Colombo under the laws of Sri Lanka." }
        ] }
      ] },
    { id: "AR-TERM", title: "Legal termbase v1.6 (sample entries)", kind: "Termbase", totalPages: 1, dataClass: "Internal", version: "1.6, in force since 1 Oct 2026",
      pages: [
        { n: 1, clauses: [
          { id: "arbitration", heading: "arbitration", text: "English: arbitration. Chinese: 仲裁. Sinhala: බේරුම්කරණය. Approved by Li Wei, 12 Sep 2026." },
          { id: "dispute", heading: "dispute", text: "English: dispute. Chinese: 争议. Sinhala: ආරවුල. Approved by Li Wei, 12 Sep 2026." }
        ] }
      ] },
    { id: "AR-POL-GH4", title: "Gifts and hospitality policy, draft 4 (sample)", kind: "Policy draft", totalPages: 6, dataClass: "Internal", version: "Draft 4, 1 Nov 2026",
      pages: [
        { n: 2, clauses: [
          { id: "3.2", heading: "3.2 Declaration", text: "Any gift or hospitality worth more than LKR 5,000 must be declared in the register within 5 working days." }
        ] },
        { n: 3, clauses: [
          { id: "4.5", heading: "4.5 Public officials", text: "Hospitality for public officials needs prior written approval from Compliance." }
        ] }
      ] },
    { id: "AR-HQ-ABP", title: "Anti-bribery policy (headquarters, sample)", kind: "Headquarters policy", totalPages: 10, dataClass: "Internal", version: "2024, in force since 1 Jul 2024",
      pages: [
        { n: 4, clauses: [
          { id: "3.4", heading: "3.4 Hospitality for public officials", text: "Hospitality offered to public officials must be approved in advance by the compliance function and recorded." }
        ] }
      ] }
  ].forEach(function (d) { if (!D.documents[d.id]) APP.registerDocument(d); });

  /* ---------- extra release requests (all fictional) ---------- */
  var BEDROCK_CLAUDE = "Claude on Bedrock (PrivateLink, ap-south-1)";
  var BEDROCK_QWEN = "Qwen on Bedrock (PrivateLink, ap-south-1)";
  var releases = [
    { id: "REL-0416", title: "Payment terms summary: marine spares agreement", requesterId: "legal", ownerId: "owner", status: "Pending",
      createdAt: "2026-11-10T09:41", dataClass: "Sensitive", modelId: "m-claude-br", destination: BEDROCK_CLAUDE,
      purpose: "Summarise payment and rebate terms before the renewal decision", ref: "CON-2025-087", phase: 1,
      source: { route: "contracts", params: { id: "CON-2025-087" } }, rulesVersion: "v1.4",
      payload: { question: "Summarise the payment milestones and the volume rebate terms, with clause references.",
        passages: [
          { source: "[CONTRACT-2], clause 6.1, page 4", text: "[PARTY-B] shall be paid USD 250-500k in four milestones against delivery of each spare parts batch." },
          { source: "[CONTRACT-2], clause 6.4, page 4", text: "Payments are made to account [BANK-ACCOUNT-2] within 45 days of a valid invoice approved by [PERSON-4]." },
          { source: "[CONTRACT-2], clause 7.2, page 5", text: "A volume rebate of 2.5% applies to orders above USD 10-100k in a calendar quarter." }
        ],
        attachments: [{ name: "Rebate table, page 5 (masked).xlsx", note: "14 rows" }] },
      entities: [
        { type: "Company name", original: "Coral Bay Marine Supplies", replacement: "[PARTY-B]", count: 9 },
        { type: "Contract number", original: "CBM/2024/087", replacement: "[CONTRACT-2]", count: 2 },
        { type: "Transaction price", original: "USD 412,000", replacement: "USD 250-500k", count: 1 },
        { type: "Transaction price", original: "USD 60,000", replacement: "USD 10-100k", count: 1 },
        { type: "Bank account", original: "0144-8812-3301", replacement: "[BANK-ACCOUNT-2]", count: 1 },
        { type: "Personal name", original: "Dilani Gunasekara", replacement: "[PERSON-4]", count: 2 }
      ],
      unscanned: [{ where: "Rebate table, page 5", resolution: "Checked by hand by N. Perera: OCR retried, table read correctly" }],
      scan: [
        { where: "Body text", status: "Done", detail: "Checked, 14 items found" },
        { where: "Tables", status: "Done", detail: "Rebate table read after OCR retry" },
        { where: "Attachments", status: "Done", detail: "Schedule B price list checked" },
        { where: "Comments", status: "Done", detail: "No comments" },
        { where: "Tracked changes", status: "Done", detail: "1 change checked" },
        { where: "File properties", status: "Done", detail: "Author and company fields cleared" },
        { where: "Rebate table, page 5", status: "Done", detail: "Checked by hand by N. Perera" }
      ] },
    { id: "REL-0415", title: "Chinese summary of the Meridian due diligence", requesterId: "reviewer", ownerId: "owner", status: "Pending",
      createdAt: "2026-11-10T08:52", dataClass: "Sensitive", modelId: "m-qwen-br", destination: BEDROCK_QWEN,
      purpose: "Draft a Chinese summary of the due diligence findings for headquarters", ref: "CON-2025-102", phase: 1,
      source: { route: "reviews", params: { id: "REV-0206" } }, rulesVersion: "v1.4", pendingCheck: true,
      payload: { question: "Summarise these due diligence findings in Chinese for headquarters. Keep the ratings and say what is still unverified.",
        passages: [
          { source: "Due diligence draft REV-0206, Beneficial owners", text: "[PARTY-C] is 60% owned by [COMPANY-7], whose owners are verified. The 40% holder is [COMPANY-8], a nominee company. The ultimate owner is not disclosed." },
          { source: "Due diligence draft REV-0206, Licences", text: "Operating licence [LICENCE-1] expired on 30 Sep 2026. No renewal evidence was provided." },
          { source: "Due diligence draft REV-0206, Sanctions", text: "The name is similar to a list entry. Country and registration number [REG-1] differ. This is not a determination." }
        ],
        attachments: [{ name: "Licence copy (masked).pdf", note: "1 page, scanned" }] },
      entities: [
        { type: "Company name", original: "Meridian Freight Lines", replacement: "[PARTY-C]", count: 11 },
        { type: "Company name", original: "Harbour Crest Holdings", replacement: "[COMPANY-7]", count: 2 },
        { type: "Company name", original: "Seaway Nominees Ltd", replacement: "[COMPANY-8]", count: 2 },
        { type: "Licence number", original: "MFL/OPS/2021/0447", replacement: "[LICENCE-1]", count: 2 },
        { type: "Registration number", original: "PV 00-4471", replacement: "[REG-1]", count: 1 }
      ],
      unscanned: [{ where: "Licence copy, stamp and signature", resolution: "Not checked by hand yet. The stamp could not be read and may carry a name." }],
      scan: [
        { where: "Body text", status: "Done", detail: "Checked, 18 items found" },
        { where: "Tables", status: "Done", detail: "No tables" },
        { where: "Attachments", status: "Done", detail: "Licence copy scanned with OCR" },
        { where: "Comments", status: "Done", detail: "3 reviewer comments checked" },
        { where: "Tracked changes", status: "Done", detail: "None" },
        { where: "File properties", status: "Done", detail: "Author field cleared" },
        { where: "Licence copy, stamp and signature", status: "Manual check", detail: "Could not be read. Check by hand before release" }
      ] },
    { id: "REL-0414", title: "Tariff waiver clause: berth services agreement", requesterId: "legal", ownerId: "owner", status: "Pending",
      createdAt: "2026-11-09T17:05", dataClass: "Sensitive", modelId: "m-claude-br", destination: BEDROCK_CLAUDE,
      purpose: "Check whether a 15% tariff waiver is allowed under the agreement and the delegation of authority", ref: "CON-2024-033", phase: 1,
      source: { route: "contracts", params: { id: "CON-2024-033" } }, rulesVersion: "v1.4",
      payload: { question: "Is a 15% tariff waiver allowed under this agreement and the delegation of authority? Cite the clauses.",
        passages: [
          { source: "[CONTRACT-3], clause 4.3, page 3", text: "[PARTY-D] may receive a tariff waiver of up to 10% of berth charges in any quarter, approved in writing by [PERSON-5]." },
          { source: "[CONTRACT-3], clause 4.4, page 3", text: "Any waiver above 10% needs a written amendment signed by both parties." },
          { source: "Delegation of authority v2, section 6.2, page 8", text: "Commercial waivers above 10% of contract value need approval by the Chief Commercial Officer and the Chief Financial Officer." }
        ],
        attachments: [] },
      entities: [
        { type: "Company name", original: "Harbourline Logistics", replacement: "[PARTY-D]", count: 7 },
        { type: "Contract number", original: "HLL/BRT/2024/033", replacement: "[CONTRACT-3]", count: 2 },
        { type: "Personal name", original: "Sunil Abeywickrama", replacement: "[PERSON-5]", count: 1 }
      ],
      unscanned: [],
      scan: [
        { where: "Body text", status: "Done", detail: "Checked, 10 items found" },
        { where: "Tables", status: "Done", detail: "Tariff schedule, 0 items" },
        { where: "Attachments", status: "Done", detail: "None" },
        { where: "Comments", status: "Done", detail: "No comments" },
        { where: "Tracked changes", status: "Done", detail: "None" },
        { where: "File properties", status: "Done", detail: "Author and company fields cleared" }
      ] },
    { id: "REL-0412", title: "Insurance clause check: crane maintenance agreement", requesterId: "legal", ownerId: "owner", status: "Approved", decidedBy: "owner",
      createdAt: "2026-11-08T11:20", decidedAt: "2026-11-08T11:34", comment: "Approved. Clause 7.1 only.",
      dataClass: "Sensitive", modelId: "m-claude-br", destination: BEDROCK_CLAUDE,
      purpose: "Check the insurance clause against the services checklist", ref: "CON-2024-051", phase: 1,
      source: { route: "contracts", params: { id: "CON-2024-051" } }, rulesVersion: "v1.4",
      payload: { question: "Does the insurance clause meet the services contract checklist?",
        passages: [{ source: "[CONTRACT-1], clause 7.1, page 4", text: "[PARTY-B] shall keep public liability insurance of at least USD 1-10 million and give [PARTY-A] a current certificate each year." }],
        attachments: [] },
      entities: [
        { type: "Company name", original: "Northwind Crane Services (Pvt) Ltd", replacement: "[PARTY-B]", count: 1 },
        { type: "Company name", original: "the Company", replacement: "[PARTY-A]", count: 1 },
        { type: "Transaction price", original: "USD 5,000,000", replacement: "USD 1-10 million", count: 1 }
      ],
      unscanned: [] },
    { id: "REL-0411", title: "Disposal list check: 2019 cargo claim files", requesterId: "legal", ownerId: "owner", status: "Rejected", decidedBy: "owner",
      createdAt: "2026-11-07T09:30", decidedAt: "2026-11-07T10:05",
      comment: "These files hold claimants' personal data and are on a disposal hold. Use the self-hosted model instead.",
      dataClass: "Sensitive", modelId: "m-claude-br", destination: BEDROCK_CLAUDE,
      purpose: "List which 2019 case files can be disposed of", ref: "REC-2019-0057", phase: 1,
      source: { route: "records", params: { id: "REC-2019-0057" } }, rulesVersion: "v1.4",
      payload: { question: "Which of these files have passed their retention period?",
        passages: [{ source: "[RECORD-1], index, page 1", text: "Claim file for [PERSON-6], container [CONTAINER-1], closed 2019." }],
        attachments: [{ name: "Case file index (masked).xlsx", note: "120 rows" }] },
      entities: [
        { type: "Personal name", original: "R. Wickramasinghe", replacement: "[PERSON-6]", count: 14 },
        { type: "Container number", original: "MFLU 448210-3", replacement: "[CONTAINER-1]", count: 9 }
      ],
      unscanned: [] }
  ];

  /* ---------- extra reviews ---------- */
  var reviews = [
    { id: "REV-0208", title: "Records answer: how long to keep the crane agreement", kind: "Records answer", requesterId: "legal", reviewerId: "reviewer", status: "Pending",
      createdAt: "2026-11-10T09:20", ref: "REC-2024-0140", dataClass: "Sensitive", modelName: "Qwen (self-hosted)", phase: 1,
      source: { route: "records", params: { id: "REC-2024-0140" } },
      content: { summary: "Keep the agreement until 31 Mar 2037. The paper original is kept for the same period because the value is above USD 1 million.",
        sections: [{ heading: "Answer", text: "Keep until 31 Mar 2037: 10 years after the agreement ends on 31 Mar 2027." }] },
      citations: [{ doc: "AR-RET-SCHED", clause: "2.1", page: 2 }, { doc: "AR-RET-SCHED", clause: "2.4", page: 3 }] },
    { id: "REV-0207", title: "Draft agreement: security services, liability clause", kind: "Draft", requesterId: "legal", reviewerId: "reviewer", status: "Pending",
      createdAt: "2026-11-09T11:10", ref: "CON-2026-030", dataClass: "Internal", modelName: "Claude on Bedrock", phase: 1,
      source: { route: "contracts", params: { id: "CON-2026-030" } },
      content: { summary: "Clauses 8.1 and 8.3 drafted from template v3 for Bluewater Security Services, with carve-outs from the liability cap.",
        sections: [{ heading: "8.1 Liability", text: "Cap at 100% of the contract price, with uncapped carve-outs." }] },
      citations: [{ doc: "AR-TPL-SVC3", clause: "8.1", page: 5 }, { doc: "CHK-SVC-2.1", clause: "item-4", page: 2 }] },
    { id: "REV-0205", title: "Obligation summary: harbour towage services", kind: "Obligation summary", requesterId: "legal", reviewerId: "reviewer", status: "Returned",
      createdAt: "2026-11-07T15:00", decidedAt: "2026-11-08T16:30", decidedBy: "reviewer",
      comment: "The towage log is due by the 5th, not the 15th. Please run it again against the signed copy.",
      ref: "CON-2026-009", dataClass: "Internal", modelName: "Qwen (self-hosted)", phase: 1,
      source: { route: "contracts", params: { id: "CON-2026-009", tab: "obligations" } },
      content: { summary: "Two obligations found: monthly towage log and extension notice.", sections: [] },
      citations: [{ doc: "AR-SAP-TOW", clause: "6", page: 3 }] },
    { id: "REV-0209", title: "Translation: arbitration clause, towage agreement (English to Chinese)", kind: "Translation", requesterId: "legal", reviewerId: "reviewer", status: "Pending",
      createdAt: "2026-11-09T10:00", ref: "CON-2026-009", dataClass: "Internal", modelName: "Qwen (self-hosted)", phase: 2,
      source: { route: "translation", params: {} },
      content: { summary: "Clause 15 translated into Chinese using termbase v1.6.", sections: [] },
      citations: [{ doc: "AR-SAP-TOW", clause: "15", page: 7 }, { doc: "AR-TERM", clause: "arbitration", page: 1 }] }
  ];

  var notifications = [
    { id: "N-101", to: ["owner"], at: "2026-11-10T09:41", kind: "approval", title: "Release request REL-0416 waiting", body: "N. Perera asks to send masked payment terms to Claude on Bedrock.", route: "approvals", params: { id: "REL-0416" }, phase: 1 },
    { id: "N-102", to: ["owner"], at: "2026-11-10T08:52", kind: "approval", title: "Release request REL-0415 waiting", body: "Li Wei asks to send a masked due diligence summary to Qwen on Bedrock.", route: "approvals", params: { id: "REL-0415" }, phase: 1 },
    { id: "N-103", to: ["owner"], at: "2026-11-09T17:05", kind: "approval", title: "Release request REL-0414 waiting", body: "N. Perera asks to send a masked tariff clause to Claude on Bedrock.", route: "approvals", params: { id: "REL-0414" }, phase: 1 },
    { id: "N-104", to: ["reviewer"], at: "2026-11-10T09:20", kind: "review", title: "Review waiting: records answer, crane agreement retention", body: "Sent by N. Perera.", route: "reviews", params: { id: "REV-0208" }, phase: 1 },
    { id: "N-105", to: ["reviewer"], at: "2026-11-09T11:10", kind: "review", title: "Review waiting: security services liability clause", body: "Sent by N. Perera.", route: "reviews", params: { id: "REV-0207" }, phase: 1 },
    { id: "N-106", to: ["legal"], at: "2026-11-08T16:30", kind: "alert", title: "Returned with comments: obligation summary, towage services", body: "Li Wei: the towage log is due by the 5th, not the 15th.", route: "reviews", params: { id: "REV-0205" }, phase: 1 },
    { id: "N-107", to: ["reviewer"], at: "2026-11-09T10:00", kind: "review", title: "Review waiting: arbitration clause translation", body: "Sent by N. Perera.", route: "reviews", params: { id: "REV-0209" }, phase: 2 },
    { id: "N-108", to: ["legal"], at: "2026-11-08T11:34", kind: "approval", title: "Release approved: insurance clause check", body: "S. Silva approved the release.", route: "approvals", params: { id: "REL-0412" }, phase: 1 }
  ];

  var audit = [
    { id: "AU-0979", at: "2026-11-10T09:41", actorId: "legal", action: "Release requested", item: "REL-0416", detail: "Masked content to Claude on Bedrock", dataClass: "Sensitive" },
    { id: "AU-0978", at: "2026-11-10T09:40", actorId: "legal", action: "Masking", item: "CON-2025-087", detail: "Rules v1.4, 6 types in 16 places, 1 manual check, destination Claude on Bedrock", dataClass: "Sensitive" },
    { id: "AU-0977", at: "2026-11-10T09:20", actorId: "legal", action: "Sent for review", item: "REV-0208", detail: "Records answer: how long to keep the crane agreement", dataClass: "Sensitive" },
    { id: "AU-0976", at: "2026-11-10T08:52", actorId: "reviewer", action: "Release requested", item: "REL-0415", detail: "Masked content to Qwen on Bedrock", dataClass: "Sensitive" },
    { id: "AU-0975", at: "2026-11-10T08:50", actorId: "reviewer", action: "Masking", item: "REV-0206", detail: "Rules v1.4, 5 types in 18 places, 1 item not yet checked, destination Qwen on Bedrock", dataClass: "Sensitive" },
    { id: "AU-0974", at: "2026-11-09T17:05", actorId: "legal", action: "Release requested", item: "REL-0414", detail: "Masked content to Claude on Bedrock", dataClass: "Sensitive" },
    { id: "AU-0973", at: "2026-11-09T11:10", actorId: "legal", action: "Sent for review", item: "REV-0207", detail: "Draft: security services, liability clause", dataClass: "Internal" },
    { id: "AU-0972", at: "2026-11-09T10:00", actorId: "legal", action: "Sent for review", item: "REV-0209", detail: "Translation: arbitration clause, towage agreement", dataClass: "Internal" },
    { id: "AU-0971", at: "2026-11-08T16:30", actorId: "reviewer", action: "Review returned", item: "REV-0205", detail: "Returned with comments: towage log due date", dataClass: "Internal" },
    { id: "AU-0970", at: "2026-11-08T11:34", actorId: "owner", action: "Release approved", item: "REL-0412", detail: "Masked content to Claude on Bedrock. Clause 7.1 only.", dataClass: "Sensitive" },
    { id: "AU-0969", at: "2026-11-08T11:20", actorId: "legal", action: "Release requested", item: "REL-0412", detail: "Masked content to Claude on Bedrock", dataClass: "Sensitive" },
    { id: "AU-0968", at: "2026-11-07T15:00", actorId: "legal", action: "Sent for review", item: "REV-0205", detail: "Obligation summary: harbour towage services", dataClass: "Internal" },
    { id: "AU-0967", at: "2026-11-07T10:05", actorId: "owner", action: "Release rejected", item: "REL-0411", detail: "Blocked: personal data on a disposal hold. Self-hosted model instead.", dataClass: "Sensitive" },
    { id: "AU-0966", at: "2026-11-07T09:30", actorId: "legal", action: "Release requested", item: "REL-0411", detail: "Masked content to Claude on Bedrock", dataClass: "Sensitive" }
  ];

  /* ---------- rich review detail (sections with [n] markers refer to cites, 1-based) ---------- */
  var reviewDetails = {
    "REV-0206": {
      question: "Run due diligence on Meridian Freight Lines before the shipping services agreement is renewed.",
      summary: "Overall rating **High (draft)**. One of two owners is not verified [2], the operating licence has expired [3] and a possible sanctions name match needs a person to verify it [4].",
      cites: [
        { doc: "AR-DD-MFL", clause: "reg", page: 1 }, { doc: "AR-DD-MFL", clause: "bo", page: 2 }, { doc: "AR-DD-MFL", clause: "lic", page: 4 },
        { doc: "AR-DD-MFL", clause: "scr", page: 5 }, { doc: "AR-DD-MFL", clause: "lit", page: 6 }
      ],
      sections: [
        { heading: "Company identity", severity: "Low", text: "Registered in Sri Lanka since June 2011 and active [1]." },
        { heading: "Beneficial owners", severity: "High", text: "60% is held by a company whose owners are verified [2]. The other 40% is held by a nominee and the person behind it is not stated [2].\n\nThis **can't be assessed** until the counterparty names the ultimate owner. Ask for a signed ownership declaration." },
        { heading: "Licences", severity: "High", text: "The operating licence copy expired on 30 Sep 2026 [3]. No renewal evidence was provided. The stamp on the copy could not be read and is flagged for a manual check." },
        { heading: "Sanctions", severity: "To verify", text: "The name is similar to an entry on a sanctions list (similarity 0.86) [4]. The country and registration number differ.\n\nThis is **not a determination**. A compliance officer must verify the hit by hand." },
        { heading: "Litigation", severity: "Medium", text: "One open cargo damage claim against the counterparty, filed in March 2026 [5]. No other proceedings in five years [5]." }
      ],
      trace: [
        { label: "Classified as Sensitive", detail: "Ownership, licence and screening data. Confirmed by N. Perera.", status: "done" },
        { label: "Routed to Qwen (self-hosted)", detail: "Inside the CICT VPC. Unmasked, so no release was needed.", status: "done" },
        { label: "9 passages retrieved from 2 sources", detail: "Evidence pack and the approved risk list.", status: "done" },
        { label: "Screened against OFAC and EU lists", detail: "Lists refreshed 10 Nov 2026, 06:00. 1 possible match.", status: "warn" },
        { label: "Rules checked", detail: "Licence dates checked by rule, not by the model.", status: "done" },
        { label: "1 gap reported", detail: "Ultimate owner not disclosed. Reported as can't be assessed, not as low risk.", status: "warn" }
      ]
    },
    "REV-0208": {
      question: "How long must we keep the crane maintenance agreement, and can the paper original be destroyed now that we have a scan?",
      summary: "Keep the agreement until **31 Mar 2037** [1][4]. The paper original is kept for the same period [2].",
      cites: [
        { doc: "AR-RET-SCHED", clause: "2.1", page: 2 }, { doc: "AR-RET-SCHED", clause: "2.4", page: 3 },
        { doc: "AR-RET-SCHED", clause: "5.2", page: 6 }, { doc: "CON-2024-051", clause: "3.1", page: 2 }
      ],
      sections: [
        { heading: "Retention period", severity: "Answer", text: "Signed contracts are kept for 10 years after they end [1]. The agreement ends on 31 Mar 2027 [4], so the record is kept until 31 Mar 2037." },
        { heading: "Paper original", severity: "Answer", text: "The contract value is above USD 1 million, so the paper original is kept until the retention period ends, even though a certified scan exists [2]." },
        { heading: "Before disposal", severity: "Note", text: "Disposal needs written approval and is blocked while a hold applies [3]. No hold is recorded on REC-2024-0140 today." },
        { heading: "Renewal", severity: "Note", text: "If the agreement renews for 3 more years, the end date moves and so does the retention date. This answer assumes it ends on 31 Mar 2027 [4]." }
      ],
      trace: [
        { label: "Classified as Sensitive", detail: "The agreement holds the contract price. The retention schedule is Internal.", status: "done" },
        { label: "Routed to Qwen (self-hosted)", detail: "Inside the CICT VPC. No masking or release needed.", status: "done" },
        { label: "4 passages retrieved from 2 documents", detail: "Retention schedule v3 and the signed agreement.", status: "done" },
        { label: "Dates calculated by rule", detail: "31 Mar 2027 plus 10 years. Not calculated by the model.", status: "done" },
        { label: "Version in force checked", detail: "Retention schedule v3, in force since 1 Jan 2025.", status: "done" }
      ]
    },
    "REV-0207": {
      question: "Draft the liability and insurance clauses for the Bluewater Security Services agreement from template v3.",
      summary: "Clauses 8.1 and 8.3 drafted from template v3 [1][3]. The draft adds uncapped carve-outs to the liability cap. Points for the reviewer are listed at the end.",
      cites: [
        { doc: "AR-TPL-SVC3", clause: "8.1", page: 5 }, { doc: "CHK-SVC-2.1", clause: "item-4", page: 2 }, { doc: "AR-TPL-SVC3", clause: "8.3", page: 5 }
      ],
      sections: [
        { heading: "8.1 Liability", severity: "Drafted", text: "Keeps the template cap of 100% of the contract price [1] and adds carve-outs that are not capped.",
          proposed: { before: "The Contractor's total liability under this Agreement is capped at 100% of the contract price.",
            after: "The Contractor's total liability under this Agreement is capped at 100% of the contract price, except for death, personal injury, fraud and breach of confidentiality, which are not capped." } },
        { heading: "8.3 Insurance", severity: "Drafted", text: "Raises the public liability cover from the template minimum [3] because guards work on the quay.",
          proposed: { before: "The Contractor shall keep public liability insurance of at least USD 2,000,000 and employer's liability insurance as required by law.",
            after: "The Contractor shall keep public liability insurance of at least USD 3,000,000 and employer's liability insurance as required by law, and give the Company a current certificate each year." } },
        { heading: "Points for the reviewer", severity: "Note", text: "Checklist item 4 is written for maintenance of critical equipment [2]. Security services are not covered by it, so the 100% cap is a choice, not a rule. The USD 3,000,000 figure is a proposal and needs Procurement's view." }
      ],
      trace: [
        { label: "Classified as Internal", detail: "Template and checklist only. No prices or names.", status: "done" },
        { label: "Default masking rules applied", detail: "Nothing to mask. No release needed for Internal content.", status: "done" },
        { label: "Routed to Claude on Bedrock", detail: "Amazon Bedrock over PrivateLink, ap-south-1. Allowed for Internal content.", status: "done" },
        { label: "3 passages retrieved from 2 documents", detail: "Template v3 and services checklist v2.1.", status: "done" },
        { label: "Template version checked", detail: "Template v3, in force since 1 Feb 2026.", status: "done" }
      ]
    },
    "REV-0205": {
      question: "List the obligations in the harbour towage services agreement with their due dates.",
      summary: "Two obligations found: a monthly towage log and the notice to extend.",
      cites: [{ doc: "AR-SAP-TOW", clause: "6", page: 3 }],
      sections: [
        { heading: "Monthly towage log", severity: "Drafted", text: "Due by the 15th day of each month [1]." },
        { heading: "Notice to extend", severity: "Drafted", text: "Notice to use the 1-year extension option is due by 2 Dec 2026." }
      ],
      trace: [
        { label: "Classified as Internal", detail: "No prices or personal data in the clauses used.", status: "done" },
        { label: "Routed to Qwen (self-hosted)", detail: "Inside the CICT VPC.", status: "done" },
        { label: "2 passages retrieved", detail: "From an unsigned draft of the agreement.", status: "warn" }
      ]
    },
    "REV-0209": {
      question: "Translate clause 15 of the towage agreement into Chinese for headquarters, using the termbase.",
      summary: "Clause 15 translated into Chinese [1]. Two terms taken from termbase v1.6 [2][3]. Amounts, dates and party names checked: none in this clause.",
      cites: [{ doc: "AR-SAP-TOW", clause: "15", page: 7 }, { doc: "AR-TERM", clause: "arbitration", page: 1 }, { doc: "AR-TERM", clause: "dispute", page: 1 }],
      sections: [
        { heading: "Source (English)", severity: "Source", text: "Any dispute arising from this Agreement shall be referred to arbitration in Colombo under the laws of Sri Lanka [1]." },
        { heading: "Translation (Chinese)", severity: "Drafted", text: "第十五条 争议解决：因本协议引起的任何争议，应提交科伦坡仲裁，并适用斯里兰卡法律。" },
        { heading: "Terms used", severity: "Note", text: "- arbitration: 仲裁 [2]\n- dispute: 争议 [3]" }
      ],
      trace: [
        { label: "Classified as Internal", detail: "No prices or names in the clause.", status: "done" },
        { label: "Routed to Qwen (self-hosted)", detail: "Inside the CICT VPC.", status: "done" },
        { label: "Termbase v1.6 applied", detail: "2 approved terms used.", status: "done" },
        { label: "Consistency checks", detail: "Amounts, dates and parties: none found in this clause.", status: "done" }
      ]
    },
    "REV-0203": {
      question: "When must we give notice if we do not want the crane maintenance agreement to renew?",
      summary: "Notice to renew or end is due by **31 Dec 2026** [1][2].",
      cites: [{ doc: "CON-2024-051", clause: "3.3", page: 2 }, { doc: "CON-2024-051", clause: "3.1", page: 2 }],
      sections: [
        { heading: "Answer", severity: "Answer", text: "The agreement renews for 3 years unless either party gives 90 days' written notice before the end of the term [1]. The term ends on 31 Mar 2027 [2], so notice is due by 31 Dec 2026." }
      ],
      trace: [
        { label: "Classified as Sensitive", detail: "Signed agreement.", status: "done" },
        { label: "Routed to Qwen (self-hosted)", detail: "Inside the CICT VPC.", status: "done" },
        { label: "Notice date calculated by rule", detail: "31 Mar 2027 minus 90 days.", status: "done" }
      ]
    },
    "REV-0201": {
      question: "Draft version 4 of the gifts and hospitality policy, aligned with the headquarters anti-bribery policy.",
      summary: "Draft 4 lowers the declaration threshold to LKR 5,000 [1] and adds prior approval for hospitality to public officials [2], to match headquarters [3].",
      cites: [{ doc: "AR-POL-GH4", clause: "3.2", page: 2 }, { doc: "AR-POL-GH4", clause: "4.5", page: 3 }, { doc: "AR-HQ-ABP", clause: "3.4", page: 4 }],
      sections: [
        { heading: "3.2 Declaration threshold", severity: "Changed", text: "Lowered to LKR 5,000 with declaration within 5 working days [1].",
          proposed: { before: "Any gift or hospitality worth more than LKR 10,000 must be declared in the register within 10 working days.",
            after: "Any gift or hospitality worth more than LKR 5,000 must be declared in the register within 5 working days." } },
        { heading: "4.5 Public officials", severity: "Added", text: "New clause requiring prior written approval from Compliance [2], matching headquarters section 3.4 [3]." }
      ],
      trace: [
        { label: "Classified as Internal", detail: "Policy text only.", status: "done" },
        { label: "Routed to DeepSeek on Bedrock", detail: "Amazon Bedrock over PrivateLink. Allowed for Internal content.", status: "done" },
        { label: "Compared with headquarters policy", detail: "1 gap found and closed by clause 4.5.", status: "done" }
      ]
    }
  };

  /* ---------- provider data terms by host (sample wording from the proposal) ---------- */
  var providerTerms = {
    Bedrock: {
      provider: "Amazon Bedrock, in CICT's own AWS account",
      network: "AWS PrivateLink from the CICT VPC. No public internet.",
      region: "ap-south-1 (Mumbai)",
      retention: "Prompts and answers are not stored by the model provider. Invocation logs stay in CICT's account.",
      training: "Not used to train or improve the base models.",
      access: "Model providers have no access to prompts, answers or logs.",
      deletion: "Nothing is held at the model provider. CICT's own logs follow the retention set in Administration.",
      keys: "Encrypted with CICT-owned KMS keys.",
      basis: "As stated by AWS and quoted in the Allion proposal. Final terms are confirmed in the contract."
    },
    "Self-hosted": {
      provider: "Open-weight model on CICT GPU nodes",
      network: "Inside the CICT VPC. No outbound connection.",
      region: "CICT VPC",
      retention: "Held only in CICT's logs.",
      training: "No training on CICT data unless CICT approves it.",
      access: "CICT and the Allion support team under CICT's access rules.",
      deletion: "Follows the retention set in Administration.",
      keys: "Encrypted with CICT-owned keys.",
      basis: "Runs inside CICT's environment. No third-party terms apply."
    }
  };

  /* Where each sensitive item in CON-2024-051 was found (masking review screen). */
  var maskingWhere = {
    "e-company": "Body text (21), file properties (1)",
    "e-contractor": "Body text (12), signature page (1), tracked changes (1)",
    "e-contractno": "Body text (1), header on every page (2)",
    "e-price": "Clause 5 (1), price schedule table (1)",
    "e-bank": "Clause 5 (1)",
    "e-person": "Clause 14 (1), signature page (1), tracked change author (1)",
    "e-phone": "Clause 14 (1)",
    "e-email": "Clause 14 (1)"
  };

  var rejectReasons = [
    "Use the self-hosted model instead",
    "Masking is not enough for this purpose",
    "Purpose is not clear",
    "Too much material for the question"
  ];

  /* Archive categories and retention used when a reviewer confirms a draft. */
  var recordCategories = [
    { value: "Contract review", retention: "10 years after the contract ends" },
    { value: "Records answer", retention: "7 years" },
    { value: "Due diligence", retention: "7 years" },
    { value: "Draft", retention: "Until superseded by the signed version" },
    { value: "Obligation summary", retention: "Life of the contract plus 7 years" },
    { value: "Translation", retention: "Same as the source document" },
    { value: "Policy draft", retention: "10 years" },
    { value: "Assistant result", retention: "10 years" }
  ];

  var reviewChecks = [
    "I checked every citation against its source page",
    "Facts, assessments and actions are kept apart",
    "Missing evidence is reported as can't be assessed, not as no risk"
  ];

  D.approvalsArea = {
    releases: releases, reviews: reviews, reviewDetails: reviewDetails, providerTerms: providerTerms,
    maskingWhere: maskingWhere, rejectReasons: rejectReasons, recordCategories: recordCategories, reviewChecks: reviewChecks,
    reviewSlaDays: 2
  };

  /* ---------- merge into the seeds (for reset) and into the live store ---------- */
  function byDesc(key) { return function (a, b) { return String(b[key] || "").localeCompare(String(a[key] || "")); }; }
  function mergeList(list, items, key) {
    var have = {};
    list.forEach(function (x) { have[x.id] = true; });
    var add = items.filter(function (x) { return !have[x.id]; });
    return list.concat(add).sort(byDesc(key));
  }
  function mergeSeed(arr, items, key) {
    var merged = mergeList(arr, items, key);
    arr.length = 0;
    Array.prototype.push.apply(arr, merged);
  }
  mergeSeed(D.seed.releaseRequests, releases, "createdAt");
  mergeSeed(D.seed.reviews, reviews, "createdAt");
  mergeSeed(D.seed.notifications, notifications, "at");
  mergeSeed(D.seed.audit, audit, "at");

  function cloneJson(x) { return JSON.parse(JSON.stringify(x)); }
  APP.store.setState(function (s) {
    return {
      releaseRequests: mergeList(s.releaseRequests, cloneJson(releases), "createdAt"),
      reviews: mergeList(s.reviews, cloneJson(reviews), "createdAt"),
      notifications: mergeList(s.notifications, cloneJson(notifications).map(function (n) { n.readBy = []; return n; }), "at"),
      audit: mergeList(s.audit, cloneJson(audit), "at")
    };
  });
})();
