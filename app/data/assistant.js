/* Mock data for screen area: assistant (route assistant).
   Scripted conversations, the sample documents they cite, and the suggested questions per mode.
   Every name, company, document and figure here is a fictional sample. See CONVENTIONS.md. */
(function () {
  "use strict";
  var D = window.APP_DATA;
  if (!D) return;

  /* ---------- sample documents cited by the scripted answers ----------
     Ids are prefixed "ax-" so they never clash with documents other screen areas register. */
  var docs = [
    { id: "ax-sr221", title: "Survey report SR-221, container damage (sample)", kind: "Survey report", totalPages: 6, dataClass: "Sensitive", version: "Issued 12 Sep 2026",
      pages: [
        { n: 1, clauses: [{ id: "summary", heading: "Summary", text: "Survey of three 40-foot containers damaged during discharge from MV Sample Star at berth 3 on 4 September 2026, carried for Meridian Freight Lines." }] },
        { n: 3, clauses: [{ id: "lashing", heading: "Findings: lashing", text: "Lashing on bay 14 had failed before arrival at the berth. Two twist locks were found open and one lashing bar was missing on the outboard stack." }] },
        { n: 5, clauses: [{ id: "claim", heading: "Claim and limits of the survey", text: "The carrier's claim for repair and cargo loss totals USD 86,000. The surveyor did not review the berth 3 camera log, which was not provided.",
          note: { kind: "warning", text: "The camera log is not in the case file." } }] }
      ] },
    { id: "ax-con102", title: "Shipping services agreement, Meridian Freight Lines (sample extract)", kind: "Contract", totalPages: 22, dataClass: "Sensitive", version: "Signed 20 May 2025",
      pages: [
        { n: 9, clauses: [
          { id: "11.3", heading: "11.3 Cargo handling liability", text: "The Company is liable for physical loss of or damage to containers caused by its negligence while the containers are in its custody at the terminal." },
          { id: "11.5", heading: "11.5 Exclusions", text: "The Company is not liable for loss or damage that existed before the containers were discharged, including damage caused by inadequate lashing or stowage on board." }
        ] }
      ] },
    { id: "ax-dd-mfl", title: "Due diligence report: Meridian Freight Lines (draft v2)", kind: "Due diligence report", totalPages: 9, dataClass: "Sensitive", version: "Draft v2, 9 Nov 2026",
      pages: [
        { n: 1, clauses: [{ id: "rating", heading: "Overall rating", text: "Overall rating: High (draft). Drivers: an unverified beneficial owner, a possible sanctions name match and an expired operating licence." }] },
        { n: 2, clauses: [{ id: "owners", heading: "Ownership and control", text: "Two beneficial owners are declared, each holding 50%. Owner 1 was verified against the company register on 7 Nov 2026. Owner 2 is not verified: the register extract provided can't be read.",
          note: { kind: "warning", text: "Owner 2 not verified." } }] },
        { n: 4, clauses: [{ id: "sanctions", heading: "Sanctions screening", text: "Screening against the OFAC and EU lists (refreshed 10 Nov 2026) returned a possible match: MERIDIAN FREIGHT LINE CO (sample entry), 86% name similarity, different country. This is not a determination." }] },
        { n: 5, clauses: [{ id: "licences", heading: "Licences", text: "The operating licence copy on file expired on 30 September 2026. No renewal copy has been received." }] },
        { n: 6, clauses: [{ id: "litigation", heading: "Litigation", text: "Court index sample searched for 2021 to 2026: no litigation found. Earlier years were not searched." }] }
      ] },
    { id: "ax-screen-eastgate", title: "Screening result SCR-0093: Eastgate Shipping Agency", kind: "Screening result", totalPages: 2, dataClass: "Internal", version: "Screened 10 Nov 2026, 06:40",
      pages: [
        { n: 1, clauses: [
          { id: "result", heading: "Result", text: "Possible match. Not a determination. Lists checked: OFAC SDN list and EU consolidated list, both refreshed 10 Nov 2026 at 06:00." },
          { id: "entry", heading: "Closest list entry", text: "EASTGATE SHIPPING (sample entry, EU list). Matched on an alias, 78% similarity." },
          { id: "differences", heading: "Differences", text: "The list entry gives a different country from the customer's registered country, and has no date of incorporation. The match can't be confirmed or ruled out from the lists alone." }
        ] },
        { n: 2, clauses: [{ id: "other", heading: "Related names", text: "Eastgate IT Solutions (CON-2026-021) was screened on 3 Mar 2026 with no match. It is a separate legal entity." }] }
      ] },
    { id: "ax-gh3", title: "Gifts and hospitality policy v3", kind: "Policy", totalPages: 8, dataClass: "Internal", version: "3, in force since 1 Jul 2024",
      pages: [{ n: 3, clauses: [{ id: "4.2", heading: "4.2 Declaring gifts", text: "Gifts with a value above LKR 10,000 must be declared to the line manager." }] }] },
    { id: "ax-gh4", title: "Gifts and hospitality policy, draft 4", kind: "Policy draft", totalPages: 9, dataClass: "Internal", version: "Draft 4, in consultation until 18 Nov 2026",
      pages: [{ n: 3, clauses: [
        { id: "4.2", heading: "4.2 Declaring gifts", text: "Gifts with a value above LKR 5,000 must be declared to Compliance within 5 working days.", note: { kind: "info", text: "Not in force. In consultation until 18 Nov 2026." } },
        { id: "4.5", heading: "4.5 Public officials", text: "Hospitality for public officials needs prior written approval from Compliance." }
      ] }] },
    { id: "ax-hq-abp", title: "Anti-bribery policy, headquarters (English reference translation)", kind: "Headquarters policy", totalPages: 12, dataClass: "Internal", version: "2024, in force since 1 Jul 2024",
      pages: [{ n: 2, clauses: [
        { id: "3.1", heading: "3.1 Gift declarations", text: "Subsidiaries shall set a gift declaration threshold no higher than LKR 5,000 or its local equivalent, with declaration to the compliance function within five working days." },
        { id: "3.4", heading: "3.4 Public officials", text: "Hospitality offered to public officials requires prior written approval." }
      ] }] },
    { id: "ax-min-2024-01", title: "Board minutes, Q1 2024 meeting (sample)", kind: "Board minutes", totalPages: 15, dataClass: "Confidential", version: "Approved",
      pages: [{ n: 2, clauses: [{ id: "item-3", heading: "Item 3. Crane maintenance", text: "The Board approved the award of the quay crane maintenance contract to Northwind Crane Services (Pvt) Ltd for three years, subject to Legal finalising the terms." }] }] },
    { id: "ax-min-2025-03", title: "Board minutes, Q3 2025 meeting (sample)", kind: "Board minutes", totalPages: 18, dataClass: "Confidential", version: "Approved",
      pages: [{ n: 4, clauses: [{ id: "item-6", heading: "Item 6. Crane performance", text: "The Board noted crane downtime above target in two quarters and asked Engineering to report on service levels before any renewal of the maintenance contract." }] }] },
    { id: "ax-cmp", title: "Company Management Policies 2025.1 (sample extract)", kind: "Company policy", totalPages: 40, dataClass: "Internal", version: "2025.1, in force since 1 Jan 2025",
      pages: [{ n: 12, clauses: [{ id: "5.2", heading: "5.2 Board approval", text: "Contracts with a total value above USD 1,000,000, or renewals that commit the Company for more than two years, require Board approval." }] }] },
    { id: "ax-cbm087", title: "Marine spares supply agreement, Chinese original (sample)", kind: "Contract", totalPages: 8, dataClass: "Sensitive", version: "Signed 15 Dec 2024",
      pages: [
        { n: 1, clauses: [{ id: "parties", heading: "合同双方", text: "本合同由 Coral Bay Marine Supplies（供方）与码头公司（需方）签订，合同编号 CBM/2024/087。" }] },
        { n: 6, clauses: [{ id: "12", heading: "第十二条", text: "第十二条 违约责任：如任何一方未履行本合同项下的义务，应向守约方支付合同总价百分之五（5%）的违约金。" }] }
      ] },
    { id: "ax-termbase", title: "Legal termbase v1.6 (Chinese, English, Sinhala)", kind: "Termbase", totalPages: 64, dataClass: "Internal", version: "1.6, in force since 1 Oct 2026",
      pages: [
        { n: 41, clauses: [
          { id: "t-wyj", heading: "违约金", text: "English: liquidated damages. Do not use: penalty. Note: a penalty clause may not be enforceable, so use liquidated damages for a sum agreed in advance. Sinhala: entry pending review." },
          { id: "t-syf", heading: "守约方", text: "English: non-defaulting party. Sinhala: entry pending review." }
        ] },
        { n: 52, clauses: [{ id: "t-zc", heading: "仲裁", text: "English: arbitration. Sinhala: approved entry, confirmed by Li Wei on 1 Oct 2026." }] }
      ] },
    { id: "ax-tpl-svc", title: "Services agreement template v3", kind: "Contract template", totalPages: 12, dataClass: "Internal", version: "3, in force since 1 Feb 2026",
      pages: [
        { n: 1, clauses: [{ id: "1", heading: "1. Parties", text: "This Agreement is made between [Company] and [Contractor], contract no. [number]." }] },
        { n: 4, clauses: [{ id: "7.2", heading: "7.2 Liability", text: "The Contractor's total liability under this Agreement is capped at 100% of the contract price." }] },
        { n: 6, clauses: [{ id: "9.1", heading: "9.1 Service levels", text: "The Contractor shall meet the service levels, response times and service credits set out in Schedule C." }] },
        { n: 9, clauses: [{ id: "15", heading: "15. Disputes", text: "Disputes shall be referred to arbitration seated in Colombo under the rules of the agreed arbitration centre, governed by the laws of Sri Lanka." }] }
      ] },
    { id: "ax-exception", title: "Contract exception procedure v1.2", kind: "Procedure", totalPages: 3, dataClass: "Internal", version: "1.2, in force since 1 Jan 2026",
      pages: [{ n: 1, clauses: [{ id: "2", heading: "2. Requesting an exception", text: "A departure from a checklist minimum needs a written reason, a risk note from Legal and approval before the contract is signed." }] }] },
    { id: "ax-doa", title: "Delegation of authority v2 (sample extract)", kind: "Company policy", totalPages: 9, dataClass: "Internal", version: "2, in force since 1 Jan 2025",
      pages: [{ n: 3, clauses: [{ id: "3.4", heading: "3.4 Contract exceptions", text: "Exceptions to legal checklist minimums are approved by the Head of Legal for contracts up to USD 500,000 and by the CEO above that." }] }] },
    { id: "ax-routing", title: "Model routing rules v1.2", kind: "Platform rules", totalPages: 2, dataClass: "Internal", version: "1.2, in force since 1 Oct 2026",
      pages: [{ n: 1, clauses: [
        { id: "overview", heading: "1. Overview", text: "Every request is classified before routing. The data class decides where it may go. Masking alone is not permission to send." },
        { id: "sens-sh", heading: "2. Sensitive, self-hosted", text: "Qwen (self-hosted) on vLLM inside the CICT VPC. Content stays unmasked. No release needed." },
        { id: "sens-br", heading: "3. Sensitive, Bedrock", text: "Claude on Bedrock or Qwen on Bedrock over PrivateLink in ap-south-1, only after masking and a release by the data owner." },
        { id: "conf", heading: "4. Confidential", text: "Self-hosted models only. Confidential content never leaves the CICT VPC." }
      ] }] },
    { id: "ax-dc-rules", title: "Data classification rules v1.1", kind: "Platform rules", totalPages: 4, dataClass: "Internal", version: "1.1, in force since 1 Sep 2026",
      pages: [
        { n: 2, clauses: [
          { id: "2", heading: "2. New uploads", text: "Each upload gets a suggested class from the masking detector. The data owner for the department confirms or changes it." },
          { id: "3", heading: "3. Until confirmed", text: "An unconfirmed upload is treated at its suggested class and can't be released to an external model." }
        ] },
        { n: 3, clauses: [{ id: "4", heading: "4. Lowering a class", text: "A data owner may lower a suggested class only with a recorded reason." }] }
      ] },
    { id: "ax-release-log", title: "Release log, 2 to 8 Nov 2026", kind: "Audit extract", totalPages: 1, dataClass: "Internal", version: "Generated 10 Nov 2026",
      pages: [{ n: 1, clauses: [
        { id: "summary", heading: "Summary", text: "2 release requests decided in the period: 1 approved, 1 rejected. No other content left the CICT VPC." },
        { id: "rel-0409", heading: "REL-0409", text: "6 Nov 2026, 14:20. Approved by S. Silva. Masked summary request for survey report SR-221 to Claude on Bedrock. 1 entity type masked in 6 places." },
        { id: "rel-0402", heading: "REL-0402", text: "3 Nov 2026, 11:02. Rejected by S. Silva. Payment data is Confidential and stays on the self-hosted model." }
      ] }] },
    { id: "ax-audit-oct", title: "Audit report: release approvals, October 2026", kind: "Audit report", totalPages: 3, dataClass: "Internal", version: "Generated 1 Nov 2026",
      pages: [
        { n: 1, clauses: [{ id: "total", heading: "Totals", text: "14 release requests decided in October 2026: 11 approved, 3 rejected." }] },
        { n: 2, clauses: [
          { id: "silva", heading: "S. Silva, Commercial", text: "9 decided: 7 approved, 2 rejected. Median time to decide: 22 minutes." },
          { id: "kumara", heading: "H. Kumara, Finance", text: "5 decided: 4 approved, 1 rejected. Median time to decide: 41 minutes." }
        ] },
        { n: 3, clauses: [{ id: "resend", heading: "Follow-up", text: "REL-0388 was rejected on 14 Oct and the same task ran that day on the self-hosted model, which needs no release." }] }
      ] }
  ];
  docs.forEach(function (d) { if (!D.documents[d.id]) D.documents[d.id] = d; });

  /* ---------- helpers for cites ---------- */
  function c(doc, clause, page) { return { doc: doc, clause: clause, page: page }; }
  var CON = "CON-2024-051", CHK = "CHK-SVC-2.1";

  /* Contract review cites, flattened from the shared findings so the numbers match. */
  var findings = D.reviewFindings[CON] || [];
  var crCites = findings.reduce(function (acc, f) { return acc.concat(f.cites); }, []);

  /* ---------- scripts ----------
     Each script: id, phase, mode, module, title, question, keywords, dataClass, modelId, answer (with [n] markers),
     cites, warnings, followups (script ids), open { route, params, label }, sow, rules, review, extra.
     flow "contract-review" uses the shared canonical builders in APP.flows.
     release: true means the answer needs masking and a release by the data owner before it is sent to Bedrock. */
  var scripts = {
    "contract-review": {
      id: "contract-review", phase: 1, mode: "Review a contract", module: "Contracts", title: "Contract review: crane maintenance agreement",
      question: "Review this agreement against the services contract checklist and list the risks, with clause references.",
      keywords: ["review", "risk", "risks", "checklist", "crane", "maintenance", "northwind", "con-2024-051", "agreement", "liability", "clauses"],
      ref: CON, dataClass: "Sensitive", modelId: "m-claude-br", flow: "contract-review", release: true, sow: ["3.1.2", "3.1.3", "1.4.7"],
      prep: ["Classifying the file", "Retrieving 6 passages", "Checking dates and limits by rule"],
      answer: "I reviewed the crane maintenance agreement against the services contract checklist v2.1. **5 findings:** 1 high, 3 medium and 1 that can't be assessed.\n\n" +
        "- **High. Liability cap well below the checklist minimum.** Clause 7.2 caps the Contractor's liability at 10% of the contract price [1], lowered from 100% by a tracked change. The checklist asks for at least 100% for critical equipment [2]. Restore 100% or record an approved exception.\n" +
        "- **Can't be assessed. Service levels.** Clause 9.1 points to Schedule C [3], which is not in the uploaded file, so uptime and penalties can't be checked against item 7 [4].\n" +
        "- **Medium. Signed after work started.** The agreement was signed on 12 Apr 2024 [5], but work order WO-118 shows work started on 1 Mar 2024 [6]. Item 12 needs a recorded reason [7].\n" +
        "- **Medium. Renews automatically.** Clause 3.3 renews for 3 years unless 90 days' notice is given [8]. The term ends on 31 Mar 2027 [9], so notice is due by 31 Dec 2026.\n" +
        "- **Medium. Arbitration seat not stated.** Clause 15 names no seat or rules [10], which item 9 of the checklist requires [11].\n\n" +
        "This is a draft. It counts only after a specialist reviewer confirms it.",
      cites: crCites,
      warnings: ["Schedule C is not in the uploaded file, so service levels can't be assessed. Upload it and run the review again."],
      followups: ["obligations", "records-notice", "checklist-cap"],
      open: { route: "contract-review", params: { id: CON }, label: "Open in Contract review" },
      extra: "findings",
      rules: "Dates, notice periods and liability limits checked by rule, not by the model."
    },
    "records-notice": {
      id: "records-notice", phase: 1, mode: "Ask", module: "Records", title: "Notice period for the crane maintenance renewal",
      question: "When does the crane maintenance agreement expire, and what notice do we need to give?",
      keywords: ["expire", "expiry", "expires", "notice", "renew", "renewal", "term", "end", "ends", "crane", "deadline"],
      ref: CON, dataClass: "Sensitive", modelId: "m-qwen-sh", sow: ["3.6.2", "3.1.5"],
      prep: ["Searching Records", "Retrieving 4 passages", "Checking dates by rule"],
      answer: "The crane maintenance agreement CON-2024-051 ends on **31 Mar 2027** [1]. It renews automatically for a further 3 years unless either party gives 90 days' written notice before the end of the term [2], so notice is due by **31 Dec 2026**.\n\n" +
        "- A reminder is set in the contract register for 31 Dec 2026, with alerts 60, 30 and 7 days before.\n" +
        "- The services contract checklist asks for at least 60 days' notice on automatic renewals [3]. 90 days meets it.\n" +
        "- Notices to the Contractor go to the contact named in clause 14 [4].\n\n" +
        "The signed copy in Records is REC-2024-0140, a scanned PDF read by OCR.",
      cites: [c(CON, "3.1", 2), c(CON, "3.3", 2), c(CHK, "item-2", 2), c(CON, "14", 10)],
      followups: ["obligations", "contract-review"],
      open: { route: "records", params: { id: "REC-2024-0140" }, label: "Open the record" },
      rules: "Notice date worked out by rule from clause 3.1 and clause 3.3, not by the model.",
      review: { kind: "Records answer", title: "Records answer: crane renewal notice date", summary: "Notice to renew or end is due by 31 Dec 2026 (clause 3.3, page 2)." }
    },
    "due-diligence": {
      id: "due-diligence", phase: 1, mode: "Ask", module: "Contracts", title: "Due diligence: Meridian Freight Lines",
      question: "Summarise the due diligence on Meridian Freight Lines.",
      keywords: ["meridian", "diligence", "counterparty", "owner", "owners", "ownership", "freight", "licence", "background"],
      ref: "CON-2025-102", dataClass: "Sensitive", modelId: "m-qwen-sh", sow: ["3.1.1"],
      prep: ["Reading the due diligence report", "Retrieving 5 passages", "Checking list dates"],
      answer: "Draft rating: **High** risk [1]. Three points drive it:\n\n" +
        "- **Ownership.** Two beneficial owners are declared. One is verified against the company register, the other is not [2].\n" +
        "- **Sanctions.** The name is similar to an entry on a public list. This is a possible match, not a finding, and a person needs to verify registration and owners [3].\n" +
        "- **Licences.** The operating licence copy on file expired on 30 Sep 2026 [4].\n\n" +
        "No litigation was found, but the search covered only 2021 to 2026 [5], so older cases can't be ruled out.",
      cites: [c("ax-dd-mfl", "rating", 1), c("ax-dd-mfl", "owners", 2), c("ax-dd-mfl", "sanctions", 4), c("ax-dd-mfl", "licences", 5), c("ax-dd-mfl", "litigation", 6)],
      warnings: ["Evidence is thin on ownership: one of two beneficial owners is not verified. The rating stays a draft until it is."],
      followups: ["sanctions", "obligations"],
      open: { route: "contracts", params: { id: "CON-2025-102", tab: "diligence" }, label: "Open due diligence" },
      rules: "List refresh date and licence expiry checked by rule.",
      review: { kind: "Due diligence", title: "Due diligence summary: Meridian Freight Lines", summary: "Draft rating High: unverified owner, possible sanctions name match, expired licence." }
    },
    "obligations": {
      id: "obligations", phase: 1, mode: "Ask", altModes: ["Review a contract"], module: "Contracts", title: "Overdue obligations on CON-2024-051",
      question: "Which obligations under the crane maintenance agreement are overdue or missing evidence?",
      keywords: ["obligation", "obligations", "overdue", "missing", "evidence", "insurance", "certificate", "uptime", "report", "performance"],
      ref: CON, dataClass: "Sensitive", modelId: "m-qwen-sh", sow: ["3.1.4", "3.1.5"],
      prep: ["Reading the obligations register", "Retrieving 4 passages", "Checking due dates"],
      answer: "Two of the four tracked obligations need action:\n\n" +
        "- **Overdue.** The monthly uptime report against Schedule C was due on 5 Nov 2026 [1]. Schedule C itself is not on file, so the report can't be checked against the agreed service levels.\n" +
        "- **Missing evidence.** The renewed insurance certificate was due on 31 Oct 2026. Clause 7.1 requires public liability cover of at least USD 5,000,000 and a current certificate each year [2].\n\n" +
        "On track: the quarterly preventive maintenance report for the 12 quay cranes in scope, due 15 Dec 2026 [3]. Scheduled: the Q4 instalment under clause 5, due 20 Dec 2026 [4].",
      cites: [c(CON, "9.1", 6), c(CON, "7.1", 4), c(CON, "2", 1), c(CON, "5", 3)],
      warnings: ["Schedule C is missing, so the uptime obligation can't be fully assessed."],
      followups: ["records-notice", "contract-review"],
      open: { route: "contracts", params: { id: CON }, label: "Open CON-2024-051" },
      rules: "Due dates compared with today, 10 Nov 2026, by rule.",
      review: { kind: "Contract obligations", title: "Obligations check: crane maintenance agreement", summary: "Uptime report overdue, insurance certificate missing, two items on track." }
    },
    "template-draft": {
      id: "template-draft", phase: 1, mode: "Draft", module: "Contracts", title: "Draft: security services agreement",
      question: "Draft a security services agreement for Bluewater Security Services from template v3.",
      keywords: ["draft", "template", "security", "bluewater", "prepare", "write", "new agreement"],
      ref: "CON-2026-030", dataClass: "Internal", modelId: "m-claude-br", sow: ["3.1.2"],
      prep: ["Loading template v3", "Filling fields from the register", "Checking against the checklist"],
      answer: "Draft 1 of the **security services agreement** with Bluewater Security Services is ready, built from the services agreement template v3 [1].\n\n" +
        "- **Term.** 1 Dec 2026 to 30 Nov 2028, from the contract register entry CON-2026-030.\n" +
        "- **Liability.** 100% of the contract price, as the template sets [2] and checklist item 4 expects [3].\n" +
        "- **Service levels.** A Schedule C placeholder is added, as checklist item 7 requires [4]. Fill in response times before review.\n" +
        "- **Disputes.** Arbitration seated in Colombo, as the template sets [5].\n\n" +
        "Left for you: the contract price, guard numbers per shift and the named contact for notices. Due diligence on Bluewater is still pending, so this draft should not go out for signature yet.",
      cites: [c("ax-tpl-svc", "1", 1), c("ax-tpl-svc", "7.2", 4), c(CHK, "item-4", 2), c(CHK, "item-7", 3), c("ax-tpl-svc", "15", 9)],
      warnings: ["Due diligence on Bluewater Security Services is pending."],
      followups: ["checklist-cap", "contract-review"],
      open: { route: "contracts", params: { id: "CON-2026-030" }, label: "Open CON-2026-030" },
      extra: "draftFile",
      rules: "Template fields and checklist minimums checked by rule.",
      review: { kind: "Contract draft", title: "Draft: security services agreement, Bluewater", summary: "Draft 1 from template v3. Price, guard numbers and notice contact left blank." }
    },
    "checklist-cap": {
      id: "checklist-cap", phase: 1, mode: "Check a policy", module: "Contracts", title: "Checklist item 4: when is a lower cap allowed?",
      question: "Checklist item 4: when is a liability cap below 100% allowed?",
      keywords: ["cap", "lower", "exception", "item 4", "allowed", "below", "100%", "limit"],
      ref: CHK, dataClass: "Internal", modelId: "m-claude-br", sow: ["3.1.3"],
      prep: ["Searching policies and checklists", "Retrieving 4 passages", "Checking effective dates"],
      answer: "A cap below 100% of the contract price is allowed only with an **approved exception** [1].\n\n" +
        "- The exception procedure needs a written reason, a risk note from Legal and approval before signing [2].\n" +
        "- Who approves depends on the value: the Head of Legal up to USD 500,000, the CEO above that [3].\n" +
        "- In the crane maintenance agreement CON-2024-051 the cap was lowered to 10% by a tracked change [4], and no exception is on file.\n\n" +
        "So for CON-2024-051 the cap stays a gap until an exception is approved or the cap is restored.",
      cites: [c(CHK, "item-4", 2), c("ax-exception", "2", 1), c("ax-doa", "3.4", 3), c(CON, "7.2", 4)],
      followups: ["contract-review", "template-draft"],
      open: { route: "knowledge", params: { id: "KB-CHK-SVC" }, label: "Open the checklist" },
      rules: "Only versions in force on 10 Nov 2026 used.",
      review: { kind: "Policy answer", title: "Policy answer: lower liability caps", summary: "A lower cap needs an approved exception, by value band." }
    },
    "model-routing": {
      id: "model-routing", phase: 1, mode: "Ask", module: "Administration", title: "Which models are approved for Sensitive data?",
      question: "Which models are approved for Sensitive data?",
      keywords: ["model", "models", "approved", "routing", "route", "bedrock", "self-hosted", "vllm", "gateway"],
      roles: ["legal", "owner", "reviewer", "compliance", "cosec", "admin", "auditor"],
      ref: null, dataClass: "Internal", modelId: "m-qwen-sh", sow: ["2.4", "1.4.7"],
      prep: ["Reading routing rules", "Checking model status"],
      answer: "For **Sensitive** content there are two routes [1]:\n\n" +
        "- **Self-hosted, unmasked.** Qwen (self-hosted) on vLLM inside the CICT VPC. No release is needed, because nothing leaves the VPC [2].\n" +
        "- **Bedrock, masked.** Claude on Bedrock and Qwen on Bedrock over PrivateLink, only after masking and a release by the data owner [3].\n\n" +
        "DeepSeek on Bedrock is approved for policy comparison but is responding slowly today. Kimi on Bedrock is not approved for any class. **Confidential** content goes to self-hosted models only [4].",
      cites: [c("ax-routing", "overview", 1), c("ax-routing", "sens-sh", 1), c("ax-routing", "sens-br", 1), c("ax-routing", "conf", 1)],
      followups: ["releases-last-week"],
      open: { route: "admin", params: { tab: "models" }, label: "Open models and routing" },
      rules: "Model status read from the health dashboard at 10:30."
    },
    "data-class-uploads": {
      id: "data-class-uploads", phase: 1, mode: "Ask", module: "Knowledge base", title: "Which Commercial uploads still need a data class?",
      question: "Which Commercial uploads still need a data class?",
      keywords: ["upload", "uploads", "data class", "classify", "classification", "unclassified", "commercial", "confirm"],
      roles: ["owner"],
      ref: null, dataClass: "Internal", modelId: "m-qwen-sh", sow: ["1.4", "2.1"],
      prep: ["Reading the upload queue", "Checking classification rules"],
      answer: "Three uploads from Commercial are waiting for you to confirm a data class [1]:\n\n" +
        "- **Berth tariff schedule 2027, draft.xlsx.** Suggested Sensitive: prices and customer names.\n" +
        "- **Harbourline rebate letter.pdf.** Suggested Sensitive: payment terms.\n" +
        "- **Terminal brochure 2026.pdf.** Suggested Public.\n\n" +
        "Until you confirm, each one is treated at its suggested class and can't be released to an external model [2]. Lowering a suggested class needs a recorded reason [3].",
      cites: [c("ax-dc-rules", "2", 2), c("ax-dc-rules", "3", 2), c("ax-dc-rules", "4", 3)],
      followups: ["releases-last-week", "model-routing"],
      open: { route: "knowledge", params: {}, label: "Open the knowledge base" },
      rules: "Suggested classes come from the self-hosted masking detector."
    },
    "releases-last-week": {
      id: "releases-last-week", phase: 1, mode: "Ask", module: "Administration", title: "What was released to Bedrock last week?",
      question: "What was released to Bedrock last week?",
      keywords: ["released", "release", "releases", "sent", "last week", "outbound", "left"],
      roles: ["owner", "auditor", "legal"],
      ref: null, dataClass: "Internal", modelId: "m-qwen-sh", sow: ["1.4.7", "2.6"],
      prep: ["Reading the audit log", "Grouping by decision"],
      answer: "Between 2 and 8 Nov 2026, one release went out and one was blocked [1]:\n\n" +
        "- **REL-0409**, approved by S. Silva on 6 Nov at 14:20: a masked summary request for survey report SR-221, sent to Claude on Bedrock [2].\n" +
        "- **REL-0402**, rejected by S. Silva on 3 Nov at 11:02: payment data is Confidential, so it stays on the self-hosted model [3].\n\n" +
        "Nothing else left the CICT VPC. Every release is in the audit log with the exact payload that was sent.",
      cites: [c("ax-release-log", "summary", 1), c("ax-release-log", "rel-0409", 1), c("ax-release-log", "rel-0402", 1)],
      followups: ["model-routing"],
      open: { route: "approvals", params: {}, label: "Open approvals" },
      rules: "Counts taken from the audit log, not estimated by the model."
    },
    "audit-approvals": {
      id: "audit-approvals", phase: 1, mode: "Ask", module: "Administration", title: "Release approvals in October, by data owner",
      question: "How many release approvals were there in October, by data owner?",
      keywords: ["october", "approvals", "by data owner", "audit", "how many", "count"],
      roles: ["auditor", "owner"],
      ref: null, dataClass: "Internal", modelId: "m-qwen-sh", sow: ["2.6", "3.7.3"],
      prep: ["Reading the audit log", "Counting decisions"],
      answer: "In October 2026 data owners decided **14 release requests**: 11 approved and 3 rejected [1].\n\n" +
        "- **S. Silva, Commercial.** 9 decided: 7 approved, 2 rejected. Median time to decide: 22 minutes [2].\n" +
        "- **H. Kumara, Finance.** 5 decided: 4 approved, 1 rejected. Median time to decide: 41 minutes [3].\n\n" +
        "Every approved release has its payload stored. One rejected task ran the same day on the self-hosted model, which is the expected route [4].",
      cites: [c("ax-audit-oct", "total", 1), c("ax-audit-oct", "silva", 2), c("ax-audit-oct", "kumara", 2), c("ax-audit-oct", "resend", 3)],
      followups: ["releases-last-week"],
      open: { route: "admin", params: { tab: "audit" }, label: "Open the audit log" },
      rules: "Counts taken from the audit log, not estimated by the model."
    },
    "translation": {
      id: "translation", phase: 2, mode: "Translate", module: "Legal affairs", title: "Translate clause 12, Coral Bay supply agreement",
      question: "Translate clause 12 of the Coral Bay supply agreement into English and flag unclear terms.",
      keywords: ["translate", "translation", "clause 12", "coral bay", "chinese", "english", "sinhala", "中文"],
      ref: "CON-2025-087", dataClass: "Sensitive", modelId: "m-qwen-br", release: true, sow: ["3.2.3", "1.4.7"],
      prep: ["Aligning clauses", "Checking the termbase", "Checking amounts and parties"],
      answer: "**Clause 12. Liability for breach.** If either party fails to perform its obligations under this contract, it shall pay the non-defaulting party liquidated damages of five percent (5%) of the total contract price [1].\n\n" +
        "- 违约金 is translated as **liquidated damages**, as the termbase v1.6 sets. \"Penalty\" is avoided [2].\n" +
        "- 守约方 is translated as **non-defaulting party** [3].\n" +
        "- The 5% figure and the reference to the total contract price match the source.\n\n" +
        "**Unclear:** the clause does not say whether the 5% is the only remedy. A person should check this before the translation is used.",
      cites: [c("ax-cbm087", "12", 6), c("ax-termbase", "t-wyj", 41), c("ax-termbase", "t-syf", 41)],
      warnings: ["One term is unclear in the source: whether liquidated damages are the only remedy."],
      followups: ["termbase", "gifts-policy"],
      open: { route: "translation", params: {}, label: "Open Translation" },
      extra: "aligned",
      rules: "Amounts, percentages and party roles compared between source and translation by rule.",
      review: { kind: "Translation", title: "Translation: clause 12, Coral Bay supply agreement", summary: "English translation of clause 12 with termbase terms. One unclear point flagged." }
    },
    "termbase": {
      id: "termbase", phase: 2, mode: "Translate", module: "Legal affairs", title: "Termbase check: liquidated damages",
      question: "How should we translate 违约金, and which terms should we avoid?",
      keywords: ["termbase", "term", "terms", "违约金", "liquidated", "damages", "penalty", "glossary"],
      ref: "KB-TERM", dataClass: "Internal", modelId: "m-qwen-sh", sow: ["3.2.3"],
      prep: ["Searching the termbase", "Checking approved entries"],
      answer: "Use **liquidated damages** for 违约金 [1].\n\n" +
        "- Avoid \"penalty\". The termbase marks it as a term not to use, because a penalty clause may not be enforceable [1].\n" +
        "- The related term 守约方 is **non-defaulting party** [2].\n" +
        "- 仲裁 is **arbitration**, with an approved Sinhala entry [3].\n\n" +
        "The Sinhala entries for 违约金 and 守约方 are still pending review, so Sinhala translations flag them for a person to check.",
      cites: [c("ax-termbase", "t-wyj", 41), c("ax-termbase", "t-syf", 41), c("ax-termbase", "t-zc", 52)],
      followups: ["translation"],
      open: { route: "translation", params: { tab: "termbase" }, label: "Open the termbase" },
      rules: "Only approved termbase entries used."
    },
    "gifts-policy": {
      id: "gifts-policy", phase: 2, mode: "Check a policy", module: "Policies", title: "Gifts above LKR 5,000: what applies?",
      question: "A supplier offered a gift worth LKR 7,500. What applies?",
      keywords: ["gift", "gifts", "hospitality", "lkr", "5,000", "7,500", "declare", "bribery", "supplier offered"],
      ref: "POL-GH", dataClass: "Internal", modelId: "m-claude-br", sow: ["3.3.5", "3.3.3"],
      prep: ["Checking which version is in force", "Retrieving 3 passages", "Comparing with headquarters policy"],
      answer: "It depends on which version is in force on the date of the gift.\n\n" +
        "- **Today, version 3 (in force):** gifts above **LKR 10,000** must be declared to the line manager [1].\n" +
        "- **Draft 4 (in consultation, not yet in force):** lowers the threshold to **LKR 5,000** and requires declaration to Compliance within 5 working days [2].\n" +
        "- The headquarters anti-bribery policy already sets the lower threshold [3], which is why draft 4 changes it.\n\n" +
        "So a gift of LKR 7,500 today needs no declaration under version 3, but would under draft 4. Declaring it now follows the stricter rule.",
      cites: [c("ax-gh3", "4.2", 3), c("ax-gh4", "4.2", 3), c("ax-hq-abp", "3.1", 2)],
      followups: ["sanctions", "checklist-cap"],
      open: { route: "policies", params: { id: "POL-GH" }, label: "Open the policy" },
      rules: "Effective dates checked: version 3 in force, draft 4 not yet in force.",
      review: { kind: "Policy answer", title: "Policy answer: gift of LKR 7,500", summary: "No declaration needed under version 3; needed under draft 4." }
    },
    "sanctions": {
      id: "sanctions", phase: 2, mode: "Ask", module: "Compliance", title: "Is Eastgate Shipping Agency on a sanctions list?",
      question: "Is Eastgate Shipping Agency on a sanctions list?",
      keywords: ["sanction", "sanctions", "ofac", "eu list", "eastgate", "screening", "screen", "list"],
      ref: "SCR-0093", dataClass: "Internal", modelId: "m-qwen-sh", sow: ["3.4.2"],
      prep: ["Checking OFAC and EU lists", "Comparing identifiers"],
      answer: "**Possible match, not a determination** [1].\n\n" +
        "- The closest entry is EASTGATE SHIPPING on the EU list (sample), matched on an alias at 78% [2].\n" +
        "- The list entry gives a different country and no date of incorporation, so the match can't be confirmed or ruled out from the lists alone [3].\n" +
        "- This is a different company from Eastgate IT Solutions, which was screened with no match [4].\n\n" +
        "Next step: ask Eastgate Shipping Agency for incorporation documents and a list of owners, then record a conclusion on SCR-0093. The system never marks an entity as sanctioned on a name match alone.",
      cites: [c("ax-screen-eastgate", "result", 1), c("ax-screen-eastgate", "entry", 1), c("ax-screen-eastgate", "differences", 1), c("ax-screen-eastgate", "other", 2)],
      warnings: ["A similar name is not a finding. A compliance officer must adjudicate the hit with evidence."],
      followups: ["due-diligence", "gifts-policy"],
      open: { route: "screening", params: { id: "SCR-0093" }, label: "Open screening" },
      extra: "match",
      rules: "List refresh time checked: 10 Nov 2026, 06:00."
    },
    "board-search": {
      id: "board-search", phase: 2, mode: "Ask", module: "Board affairs", title: "Past board decisions on crane maintenance",
      question: "What did past board meetings decide about crane maintenance?",
      keywords: ["board", "minutes", "meeting", "meetings", "past", "decided", "decision", "decisions", "agenda", "resolution"],
      ref: "BRD-2026-04", dataClass: "Confidential", modelId: "m-qwen-sh", sow: ["3.5.2", "3.5.1"],
      prep: ["Searching board minutes", "Retrieving 3 passages"],
      answer: "Two past meetings dealt with crane maintenance:\n\n" +
        "- **Q1 2024, item 3.** The Board approved awarding the crane maintenance contract to Northwind Crane Services for three years, subject to Legal finalising the terms [1].\n" +
        "- **Q3 2025, item 6.** The Board noted crane downtime above target and asked Engineering to report on service levels before any renewal [2].\n\n" +
        "Relevant to agenda item 4 at BRD-2026-04: the Q3 2025 minutes ask for a service level report before renewal [2], and a renewal for more than two years needs Board approval [3].",
      cites: [c("ax-min-2024-01", "item-3", 2), c("ax-min-2025-03", "item-6", 4), c("ax-cmp", "5.2", 12)],
      followups: ["records-notice"],
      open: { route: "board", params: { id: "AG-2026-04-4" }, label: "Open board affairs" },
      rules: "Searched only meetings on your access list."
    },
    "legal-memo": {
      id: "legal-memo", phase: 2, mode: "Draft", module: "Legal affairs", title: "Legal memo: CASE-2026-014",
      question: "Draft a legal memo on the Meridian cargo damage claim, CASE-2026-014.",
      keywords: ["memo", "case", "claim", "cargo", "damage", "case-2026-014", "dispute", "legal opinion"],
      ref: "CASE-2026-014", dataClass: "Sensitive", modelId: "m-qwen-sh", sow: ["3.2.2", "2.3"],
      prep: ["Reading the case file", "Retrieving 4 passages", "Checking the legal basis"],
      answer: "**Facts.** On 4 Sep 2026 three containers were damaged during discharge from MV Sample Star [1]. Meridian Freight Lines claims USD 86,000 [2]. The survey found the lashing on bay 14 had failed before arrival [3].\n\n" +
        "**Legal basis.** Clause 11.3 makes the Company liable for damage caused by its negligence in custody [4]. Clause 11.5 excludes damage that existed before discharge, including from inadequate lashing [5].\n\n" +
        "**Analysis.** If the survey finding holds, clause 11.5 excludes liability. The berth 3 camera log is not in the file [2], so this can't be settled yet.\n\n" +
        "**Recommendations.**\n" +
        "- Ask for the berth 3 camera log.\n" +
        "- Send a holding reply relying on clause 11.5.\n" +
        "- Review again in 14 days.",
      cites: [c("ax-sr221", "summary", 1), c("ax-sr221", "claim", 5), c("ax-sr221", "lashing", 3), c("ax-con102", "11.3", 9), c("ax-con102", "11.5", 9)],
      warnings: ["Can't be determined yet: whether the damage happened before arrival. The memo says so instead of assuming."],
      followups: ["due-diligence", "translation"],
      open: { route: "legal", params: { id: "CASE-2026-014" }, label: "Open the case" },
      rules: "Claim amount and dates checked against the case file by rule.",
      review: { kind: "Legal memo", title: "Legal memo: CASE-2026-014, cargo damage claim", summary: "Liability likely excluded by clause 11.5 if the survey holds. Camera log needed." }
    }
  };

  /* Suggested questions by mode, in order. */
  var modeSuggestions = {
    "Ask": ["records-notice", "due-diligence", "obligations", "data-class-uploads", "releases-last-week", "audit-approvals", "model-routing", "sanctions", "board-search"],
    "Review a contract": ["contract-review", "obligations", "checklist-cap"],
    "Draft": ["template-draft", "legal-memo"],
    "Translate": ["translation", "termbase"],
    "Check a policy": ["checklist-cap", "gifts-policy"]
  };

  /* Seeded history: which script each conversation in APP_DATA.conversations shows. */
  var conversationSeeds = {
    "CONV-101": { script: "records-notice", reviewId: "REV-0203" },
    "CONV-102": { script: "due-diligence", reviewId: "REV-0206" },
    "CONV-103": { script: "translation", releaseId: "REL-0417" },
    "CONV-104": { script: "gifts-policy" },
    "CONV-105": { script: "sanctions" },
    "CONV-106": { script: "board-search" },
    "CONV-107": { script: "termbase" },
    "CONV-108": { script: "checklist-cap" },
    "CONV-109": { script: "data-class-uploads" },
    "CONV-110": { script: "releases-last-week" },
    "CONV-111": { script: "model-routing" },
    "CONV-112": { script: "audit-approvals" }
  };

  /* Translation masking sample (Chinese source with the party name and contract number). */
  var translationSource = "本合同由 Coral Bay Marine Supplies（供方）与码头公司（需方）签订，合同编号 CBM/2024/087。\n第十二条 违约责任：如任何一方未履行本合同项下的义务，应向守约方支付合同总价百分之五（5%）的违约金。";
  var translationEntities = [
    { id: "t-party", type: "Company name", text: "Coral Bay Marine Supplies", placeholder: "[PARTY-B]", method: "placeholder", count: 4 },
    { id: "t-contract", type: "Contract number", text: "CBM/2024/087", placeholder: "[CONTRACT-2]", method: "placeholder", count: 1 }
  ];
  var alignedRows = [
    { key: "12", source: "第十二条 违约责任：如任何一方未履行本合同项下的义务，应向守约方支付合同总价百分之五（5%）的违约金。",
      target: "Clause 12. Liability for breach: If either party fails to perform its obligations under this contract, it shall pay the non-defaulting party liquidated damages of five percent (5%) of the total contract price.",
      checks: [["Passed", "Amount and percentage match"], ["Passed", "Termbase: 违约金 = liquidated damages"], ["To verify", "Only remedy? Not stated"]] }
  ];

  D.assistantArea = {
    scripts: scripts,
    modeSuggestions: modeSuggestions,
    conversationSeeds: conversationSeeds,
    translationSource: translationSource,
    translationEntities: translationEntities,
    alignedRows: alignedRows
  };
})();
