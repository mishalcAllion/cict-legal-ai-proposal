/* Screen area: legal-policy. Phase 2 screens: Legal affairs (#legal), Translation (#translation),
   Regulatory monitoring (#regulatory) and Policies (#policies). Mock data in app/data/legal-policy.js.
   Cross-role items (reviews, notifications, audit, records) go through the shared store. See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, Icon = APP.Icon, fmt = APP.fmt, dayjs = APP.dayjs;
  var useState = APP.useState, useEffect = APP.useEffect, useRef = APP.useRef, Fragment = APP.Fragment;
  var LP = D.legalPolicy;
  if (!LP) { console.error("[legal-policy] data missing"); return; }

  /* ------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------ */
  function pid() { return APP.store.getState().ui.personaId; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function sharedObj(key) {
    var p = APP.useShared(key, {});
    var val = p[0] || {};
    var set = function (patch) {
      p[1](function (prev) { prev = prev || {}; return Object.assign({}, prev, typeof patch === "function" ? patch(prev) : patch); });
    };
    return [val, set];
  }
  /* Run fn when the current persona may do the step; otherwise offer to switch persona. */
  function gate(allowed, what, fn) {
    return function () {
      var me = pid();
      if (allowed.indexOf(me) >= 0) return fn();
      var p = APP.persona(allowed[0]);
      var cur = APP.persona(me);
      APP.confirm({
        title: what + " is done by " + p.name + ", " + p.role,
        content: "You are " + cur.name + ", " + cur.role + ". Switch to " + p.name + " to do this step? Nothing else changes.",
        okText: "Switch to " + p.name, zIndex: 2100,
        onOk: function () { APP.setPersona(allowed[0]); APP.toast.info("You are now " + p.name + ", " + p.role + "."); }
      });
    };
  }
  function latestReview(reviews, ref, kind) {
    var list = reviews.filter(function (r) { return r.ref === ref && (!kind || r.kind === kind); });
    list.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    return list[0] || null;
  }
  function docTitle(id) {
    var d = APP.getDocument(id);
    if (d) return d.title;
    var k = byId(D.knowledge, id);
    return k ? k.title : id;
  }
  function ico(name, style) { return html`<${Icon} name=${name} style=${style} />`; }
  function Field(props) {
    var tok = A.theme.useToken().token;
    return html`<div style=${{ marginBottom: 14 }}>
      <div style=${{ fontWeight: 500, marginBottom: 6 }}>${props.label}${props.hint ? html`<span style=${{ fontWeight: 400, color: tok.colorTextTertiary, marginLeft: 6, fontSize: 12 }}>${props.hint}</span>` : null}</div>
      ${props.children}
    </div>`;
  }
  function Muted(props) {
    var tok = A.theme.useToken().token;
    return html`<span style=${Object.assign({ color: tok.colorTextSecondary, fontSize: 13 }, props.style || {})}>${props.children}</span>`;
  }
  function Stat(props) {
    var tok = A.theme.useToken().token;
    return html`<${A.Card} size="small" hoverable=${!!props.onClick} onClick=${props.onClick} style=${{ height: "100%", cursor: props.onClick ? "pointer" : "default" }}>
      <${A.Statistic} title=${props.title} value=${props.value} prefix=${ico(props.icon)}
        styles=${props.warn ? { content: { color: tok.colorError } } : undefined} />
      ${props.note ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>${props.note}</div>` : null}
    <//>`;
  }
  function StatRow(props) {
    return html`<${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 16 }}>
      ${props.items.map(function (it, i) { return html`<${A.Col} key=${i} xs=${12} md=${6}><${Stat} ...${it} /><//>`; })}
    <//>`;
  }
  function AiDraftNote(props) {
    return html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }}
      message=${props.text} title=${props.text} />`;
  }
  function copyText(t) {
    var fail = function () { APP.toast.info("Copy isn't available here. In the build, the memo copies with its citations."); };
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) return fail();
      navigator.clipboard.writeText(t).then(function () { APP.toast.success("Copied to the clipboard."); }, fail);
    } catch (e) { fail(); }
  }
  function DocDrawer(props) {
    return html`<${APP.DetailDrawer} open=${!!props.docId} onClose=${props.onClose} size=${760}
      title=${props.docId ? docTitle(props.docId) : ""} subtitle="Sample document. Text is fictional."
      tags=${props.docId && APP.getDocument(props.docId) ? html`<${APP.DataClassTag} cls=${APP.getDocument(props.docId).dataClass} />` : null}
      actions=${html`<${A.Button} icon=${ico("DownloadOutlined")} onClick=${function () { APP.toast.build("In the build, downloads are checked against your permissions and logged in the audit trail."); }}>Download<//>`}>
      ${props.docId ? html`<${APP.DocViewer} doc=${props.docId} highlight=${props.highlight} height=${"calc(100vh - 200px)"} />` : null}
    <//>`;
  }
  function dirTag(dir) {
    if (dir === "for") return html`<${A.Tag} color="green" icon=${ico("PlusCircleOutlined")} style=${{ marginInlineEnd: 0 }}>Helps the Company<//>`;
    if (dir === "against") return html`<${A.Tag} color="red" icon=${ico("MinusCircleOutlined")} style=${{ marginInlineEnd: 0 }}>Hurts the Company<//>`;
    return html`<${A.Tag} color="orange" icon=${ico("QuestionCircleOutlined")} style=${{ marginInlineEnd: 0 }}>Unknown<//>`;
  }

  /* ==================================================================
     LEGAL AFFAIRS (#legal)
     ================================================================== */
  var CASE_TYPES = ["Commercial claim", "Admiralty", "Regulatory investigation", "Labour", "Debt recovery"];
  var CASE_STAGES = ["Pre-action", "Letter of demand", "Inquiry", "Claim filed", "Mediation", "Labour tribunal", "Arbitration", "Judgment", "Settled", "Closed"];

  function useCases() {
    var added = APP.useShared("lp.cases", [])[0] || [];
    var over = APP.useShared("lp.caseOver", {})[0] || {};
    return LP.cases.concat(added).map(function (c) { return over[c.id] ? Object.assign({}, c, over[c.id]) : c; });
  }
  function memoFor(caseId, shared) {
    var base = LP.memos[caseId];
    if (!base) return null;
    var o = shared[caseId] || {};
    var m = Object.assign({}, base, o);
    m.generated = base.status !== "None" || !!o.generated;
    m.sections = o.sections || base.sections;
    m.versions = o.versions || base.versions;
    m.version = o.version || base.version;
    return m;
  }
  function memoStatus(memo, review) {
    if (!memo || !memo.generated) return "Not drafted";
    if (review) return review.status === "Pending" ? "Pending review" : review.status;
    return memo.status === "None" ? "Draft" : memo.status;
  }
  function memoTrace(c, memo, review) {
    var model = byId(D.models, memo.modelId) || {};
    return [
      { label: "Classified as " + c.dataClass, detail: "From the case file's data class. Confirmed by " + APP.personName(c.ownerId) + ".", status: "done" },
      { label: (memo.evidence || []).length + " evidence files and " + (memo.laws || []).length + " laws or policies selected", detail: (memo.evidence || []).map(docTitle).join("; "), status: "done" },
      { label: "Routed to " + (model.name || "the approved model"), detail: memo.routing, status: "done" },
      { label: (memo.cites || []).length + " passages retrieved and cited", detail: "Each statement in the memo points to a clause and page.", status: "done" },
      { label: "Rules checked", detail: "Dates, notice periods, amounts and liability caps checked by rule, not by the model.", status: "done" },
      memo.thin ? { label: "Evidence gaps flagged", detail: memo.thin, status: "warn" } : { label: "Gaps flagged", detail: "Missing evidence is named in the memo instead of assumed.", status: "warn" },
      { label: review && review.status === "Confirmed" ? "Confirmed by " + APP.personName(review.decidedBy) : memo.confirmedBy ? "Confirmed by " + APP.personName(memo.confirmedBy) : "Draft until an authorised reviewer confirms it",
        detail: "Generated content stays a draft or pending review until confirmed (§3.2.2).", status: (review && review.status === "Confirmed") || memo.confirmedBy ? "done" : "wait" }
    ];
  }

  function LegalScreen(props) {
    var route = APP.useRoute();
    var sel = useState(null), tab = useState("overview");
    useEffect(function () {
      if (props.params.id) { sel[1](props.params.id); tab[1](props.params.tab || "overview"); }
      else sel[1](null);
    }, [route.at]);
    var cases = useCases();
    var c = sel[0] ? byId(cases, sel[0]) : null;
    if (sel[0] && c) return html`<${CaseDetail} c=${c} tab=${tab[0]} setTab=${tab[1]} />`;
    return html`<${CaseRegister} cases=${cases} open=${function (id, t) { sel[1](id); tab[1](t || "overview"); try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } }} />`;
  }

  function CaseRegister(props) {
    var s = APP.useStore();
    var tok = A.theme.useToken().token;
    var cases = props.cases;
    var tab = useState("cases"), newOpen = useState(false);
    var memoShared = s.ext["lp.memos"] || {};
    var open = cases.filter(function (c) { return c.status !== "Closed"; });
    var memoRows = cases.map(function (c) {
      var m = memoFor(c.id, memoShared);
      var r = latestReview(s.reviews, c.id, "Legal memo");
      return { id: c.id, c: c, memo: m, status: memoStatus(m, r), review: r };
    }).filter(function (x) { return x.memo; });
    var pendingMemos = memoRows.filter(function (x) { return x.status === "Pending review"; }).length;
    var upcoming = [];
    cases.forEach(function (c) { (c.milestones || []).forEach(function (m) { if (m.upcoming) upcoming.push({ c: c, m: m }); }); });
    upcoming.sort(function (a, b) { return a.m.at.localeCompare(b.m.at); });
    var in30 = upcoming.filter(function (u) { var d = fmt.daysUntil(u.m.at); return d >= 0 && d <= 30; }).length;

    var columns = [
      APP.col.id("Case", "id"),
      { title: "Matter", key: "title", render: function (_, r) { return html`<div style=${{ minWidth: 220 }}><div style=${{ fontWeight: 500 }}>${r.title}</div><${Muted}>${r.counterparty}<//></div>`; } },
      APP.col.text("Type", "type"),
      APP.col.text("Stage", "stage"),
      { title: "Exposure", dataIndex: "exposure", key: "exposure", render: function (v) { return html`<span className="nowrap">${v}</span>`; } },
      { title: "Next date", key: "next", sorter: function (a, b) { return String(a.nextDate || "9").localeCompare(String(b.nextDate || "9")); },
        render: function (_, r) { return r.nextDate ? html`<div className="nowrap"><div>${fmt.date(r.nextDate)}</div><${Muted} style=${{ fontSize: 12 }}>${r.nextEvent + " · " + fmt.dueLabel(r.nextDate)}<//></div>` : html`<${Muted}>None<//>`; } },
      { title: "Risk", dataIndex: "risk", key: "risk", render: function (v) { return html`<${APP.StatusTag} status=${v} />`; } },
      APP.col.dataClass("Data class", "dataClass"),
      APP.col.person("Responsible", "ownerId")
    ];
    var memoCols = [
      APP.col.id("Case", "id"),
      { title: "Memo", key: "t", render: function (_, r) { return html`<div style=${{ minWidth: 220 }}>${"Legal memo: " + r.c.title}</div>`; } },
      { title: "Version", key: "v", render: function (_, r) { return r.memo.generated ? "v" + r.memo.version : html`<${Muted}>None<//>`; } },
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${APP.StatusTag} status=${v} tone=${v === "Not drafted" ? "default" : undefined} />`; } },
      { title: "Model", key: "m", render: function (_, r) { return html`<${APP.ModelTag} id=${r.memo.modelId} />`; } },
      { title: "Reviewer", key: "rv", render: function (_, r) { return r.review ? html`<${APP.PersonTag} id=${r.review.reviewerId} />` : r.memo.confirmedBy ? html`<${APP.PersonTag} id=${r.memo.confirmedBy} />` : html`<${Muted}>Not sent<//>`; } }
    ];

    return html`<div>
      <${APP.PageHeader} title="Legal affairs" phase=${2} sow=${["3.2.1", "3.2.2"]}
        subtitle="Cases and disputes with risk analysis, and draft legal memos with cited legal basis. Every analysis is a draft until an authorised person confirms it."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${ico("MessageOutlined")} onClick=${function () { APP.navigate("assistant", { new: true }); }}>Ask the assistant<//>
          <${A.Button} type="primary" icon=${ico("PlusOutlined")} onClick=${gate(["legal"], "Opening a case", function () { newOpen[1](true); })}>New case<//>
        <//>`} />
      <${StatRow} items=${[
        { title: "Open cases", value: open.length, icon: "FolderOpenOutlined", note: cases.length - open.length + " closed", onClick: function () { tab[1]("cases"); } },
        { title: "High risk", value: open.filter(function (c) { return c.risk === "High"; }).length, icon: "WarningOutlined", warn: true, note: "Rated by the assistant, confirmed by Legal" },
        { title: "Dates in the next 30 days", value: in30, icon: "CalendarOutlined", note: "Hearings, filings and deadlines", onClick: function () { tab[1]("dates"); } },
        { title: "Memos pending review", value: pendingMemos, icon: "FileDoneOutlined", note: "With the specialist reviewer", onClick: function () { tab[1]("memos"); } }
      ]} />
      <${A.Card} styles=${{ body: { paddingTop: 4 } }}>
        <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
          { key: "cases", label: "Cases", children: html`<div>
            <${APP.DataTable} columns=${columns} data=${cases} searchPlaceholder="Search cases, parties, stages"
              searchKeys=${["id", "title", "counterparty", "stage", "type", "summary"]}
              filters=${[{ key: "type", label: "Type" }, { key: "stage", label: "Stage" }, { key: "risk", label: "Risk" }, { key: "status", label: "Open or closed" }]}
              onRowClick=${function (r) { props.open(r.id); }} />
            <div style=${{ marginTop: 8, fontSize: 12, color: tok.colorTextSecondary }}>Disputes raised during a contract link back to it in the contract register <${APP.SowRef} sec="3.1.4" />.</div>
          </div>` },
          { key: "memos", label: "Legal memos", children: html`<${APP.DataTable} columns=${memoCols} data=${memoRows} searchPlaceholder="Search memos"
            searchKeys=${["id", "c.title", "status"]} filters=${[{ key: "status", label: "Status" }]} onRowClick=${function (r) { props.open(r.id, "memo"); }} />` },
          { key: "dates", label: "Upcoming dates", children: upcoming.length ? html`<${A.Timeline} style=${{ marginTop: 12 }} items=${upcoming.map(function (u, i) {
            var c = html`<div className="clickable-row" onClick=${function () { props.open(u.c.id, "timeline"); }}>
              <div style=${{ fontWeight: 500 }}>${fmt.date(u.m.at) + ": " + u.m.text}</div>
              <${Muted}>${u.c.id + " · " + u.c.title + " · " + fmt.dueLabel(u.m.at)}<//>
            </div>`;
            return { key: String(i), color: fmt.daysUntil(u.m.at) <= 14 ? "orange" : "blue", children: c, content: c };
          })} />` : html`<${APP.EmptyHint} title="No upcoming dates" />` }
        ]} />
      <//>
      <${NewCaseDrawer} open=${newOpen[0]} onClose=${function () { newOpen[1](false); }} onCreated=${function (id) { newOpen[1](false); props.open(id); }} />
    </div>`;
  }

  function NewCaseDrawer(props) {
    var f = useState({ title: "", type: "Commercial claim", counterparty: "", stage: "Pre-action", exposure: "", nextDate: null, dataClass: "Sensitive", contractId: null });
    var v = f[0];
    var set = function (k, val) { var n = Object.assign({}, v); n[k] = val; f[1](n); };
    var addCase = APP.useShared("lp.cases", [])[1];
    var count = (APP.useShared("lp.cases", [])[0] || []).length;
    var route = D.routing.filter(function (r) { return r.cls === v.dataClass; })[0];
    var create = function () {
      if (!v.title.trim()) { APP.toast.warn("Give the matter a short title."); return; }
      var id = "CASE-2026-0" + (31 + count);
      var c = { id: id, title: v.title.trim(), counterparty: v.counterparty || "Not recorded", type: v.type, stage: v.stage, forum: "Not recorded",
        exposure: v.exposure || "Not assessed", nextDate: v.nextDate, nextEvent: v.nextDate ? "Next step" : "None", risk: "Not assessed", ownerId: pid(), dataClass: v.dataClass,
        opened: APP.nowIso().slice(0, 10), contractId: v.contractId, records: [], status: "Open", live: true,
        summary: "New matter. Add evidence documents to get a risk analysis and a draft memo.", parties: ["The Company"], counsel: "In-house", docs: [],
        milestones: [{ at: APP.nowIso(), kind: "Handling", text: "Case opened", by: APP.personName(pid()) }],
        risk3: { rating: "Not assessed", evidence: "Not enough evidence", qualitative: "No documents in the case file yet, so no rating, probability, compensation range or duration can be given.", factors: [], outcomes: [], developments: [], responses: [], missing: [{ item: "Claim or notice that opened the matter", from: "Case owner", requested: null }] } };
      addCase(function (prev) { return (prev || []).concat([c]); });
      APP.audit({ action: "Case created", item: id, detail: c.title + ", " + c.type, dataClass: c.dataClass });
      APP.toast.success(id + " created. It is now in the case register.");
      f[1](Object.assign({}, v, { title: "", counterparty: "", exposure: "" }));
      props.onCreated(id);
    };
    return html`<${APP.DetailDrawer} open=${props.open} onClose=${props.onClose} title="New case" subtitle="Records the matter in the case register (§3.2.1)" size=${560}
      footer=${html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end" }}><${A.Button} onClick=${props.onClose}>Cancel<//><${A.Button} type="primary" onClick=${create}>Create case<//></div>`}>
      <${Field} label="Matter"><${A.Input} value=${v.title} onChange=${function (e) { set("title", e.target.value); }} placeholder="For example: Demurrage claim, berth 2 delay" /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Type"><${A.Select} style=${{ width: "100%" }} value=${v.type} onChange=${function (x) { set("type", x); }} options=${CASE_TYPES.map(function (t) { return { value: t, label: t }; })} /><//><//>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Stage"><${A.Select} style=${{ width: "100%" }} value=${v.stage} onChange=${function (x) { set("stage", x); }} options=${CASE_STAGES.map(function (t) { return { value: t, label: t }; })} /><//><//>
      <//>
      <${Field} label="Other party"><${A.Input} value=${v.counterparty} onChange=${function (e) { set("counterparty", e.target.value); }} placeholder="For example: Sapphire Tug Services" /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Exposure" hint="optional"><${A.Input} value=${v.exposure} onChange=${function (e) { set("exposure", e.target.value); }} placeholder="USD 10-50k" /><//><//>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Next date" hint="optional"><${A.DatePicker} style=${{ width: "100%" }} value=${v.nextDate ? dayjs(v.nextDate) : null} onChange=${function (d) { set("nextDate", d ? d.format("YYYY-MM-DD") : null); }} /><//><//>
      <//>
      <${Field} label="Linked contract" hint="optional"><${A.Select} allowClear style=${{ width: "100%" }} value=${v.contractId} onChange=${function (x) { set("contractId", x || null); }}
        options=${D.contracts.map(function (c) { return { value: c.id, label: c.id + " " + c.title }; })} /><//>
      <${Field} label="Data class"><${A.Segmented} block value=${v.dataClass} onChange=${function (x) { set("dataClass", x); }} options=${["Internal", "Sensitive", "Confidential"]} /><//>
      ${route ? html`<${A.Alert} type="info" showIcon message=${"Model routing for " + v.dataClass + " content"} title=${"Model routing for " + v.dataClass + " content"} description=${route.where + "."} />` : null}
    <//>`;
  }

  function CaseDetail(props) {
    var c = props.c;
    var s = APP.useStore();
    var over = APP.useShared("lp.caseOver", {});
    var memoShared = s.ext["lp.memos"] || {};
    var memo = memoFor(c.id, memoShared);
    var review = latestReview(s.reviews, c.id, "Legal memo");
    var mStatus = memoStatus(memo, review);
    var contract = c.contractId ? byId(D.contracts, c.contractId) : null;
    var setStage = function (st) {
      over[1](function (prev) { var n = Object.assign({}, prev || {}); n[c.id] = Object.assign({}, n[c.id] || {}, { stage: st, status: st === "Settled" || st === "Closed" ? "Closed" : "Open" }); return n; });
      APP.audit({ action: "Case stage changed", item: c.id, detail: c.stage + " to " + st, dataClass: c.dataClass });
      APP.toast.success(c.id + " moved to " + st + ".");
    };
    return html`<div>
      <${APP.PageHeader} title=${c.title} phase=${2} sow=${["3.2.1", "3.2.2"]}
        crumbs=${[{ label: "Legal affairs", route: "legal" }, { label: c.id }]}
        tags=${html`<${Fragment}><span className="mono" style=${{ opacity: 0.7 }}>${c.id}</span><${APP.StatusTag} status=${c.risk === "Not assessed" ? "Not assessed" : c.risk + " risk"} tone=${APP.statusTone(c.risk)} /><${APP.DataClassTag} cls=${c.dataClass} /><//>`}
        subtitle=${c.summary}
        actions=${html`<${Fragment}>
          <${A.Dropdown} trigger=${["click"]} menu=${{ items: CASE_STAGES.map(function (st) { return { key: st, label: st, disabled: st === c.stage }; }), onClick: function (i) { gate([c.ownerId], "Changing the stage", function () { setStage(i.key); })(); } }}>
            <${A.Button} icon=${ico("NodeIndexOutlined")}>${"Stage: " + c.stage}<//>
          <//>
          <${A.Button} icon=${ico("MessageOutlined")} onClick=${function () { APP.navigate("assistant", { new: true }); }}>Ask about this case<//>
          <${A.Button} type="primary" icon=${ico("FileTextOutlined")} onClick=${function () { props.setTab("memo"); }}>${mStatus === "Not drafted" ? "Draft legal memo" : "Legal memo"}<//>
        <//>`} />
      <${A.Card} size="small" style=${{ marginBottom: 16 }}>
        <${APP.KeyFacts} bordered=${false} items=${[
          ["Type", c.type], ["Forum", c.forum], ["Stage", c.stage],
          ["Parties", c.parties.join("; ")], ["Responsible", html`<${APP.PersonTag} id=${c.ownerId} showRole=${true} />`], ["Counsel", c.counsel],
          ["Exposure", c.exposure], ["Next date", c.nextDate ? fmt.date(c.nextDate) + ", " + c.nextEvent + " (" + fmt.dueLabel(c.nextDate) + ")" : "None"],
          ["Linked contract", contract ? html`<a onClick=${function () { APP.navigate("contracts", { id: contract.id }); }}>${contract.id + " " + contract.title}</a>` : "None"],
          ["Linked records", c.records.length ? html`<${A.Flex} wrap gap=${6}>${c.records.map(function (r) { return html`<a key=${r} onClick=${function () { APP.navigate("records", { id: r }); }}>${r}</a>`; })}<//>` : "None"],
          ["Opened", fmt.date(c.opened)], ["Memo", html`<${APP.StatusTag} status=${mStatus} tone=${mStatus === "Not drafted" ? "default" : undefined} />`]
        ]} />
      <//>
      <${A.Card} styles=${{ body: { paddingTop: 4 } }}>
        <${A.Tabs} activeKey=${props.tab} onChange=${props.setTab} items=${[
          { key: "overview", label: "Overview", children: html`<${CaseOverview} c=${c} memoStatus=${mStatus} setTab=${props.setTab} />` },
          { key: "timeline", label: "Timeline", children: html`<${CaseTimeline} c=${c} />` },
          { key: "risk", label: "Risk analysis", children: html`<${CaseRisk} c=${c} />` },
          { key: "docs", label: html`<span>Documents <${A.Badge} count=${c.docs.length} showZero color="#8c8c8c" size="small" /></span>`, children: html`<${CaseDocs} c=${c} />` },
          { key: "memo", label: "Legal memo", children: html`<${MemoPanel} c=${c} memo=${memo} review=${review} status=${mStatus} />` }
        ]} />
      <//>
    </div>`;
  }

  function CaseOverview(props) {
    var c = props.c, r = c.risk3 || {};
    var tok = A.theme.useToken().token;
    var next = (c.milestones || []).filter(function (m) { return m.upcoming; });
    return html`<${A.Row} gutter=${[16, 16]}>
      <${A.Col} xs=${24} lg=${14}>
        <${A.Card} size="small" title="Next steps">
          ${next.length ? next.map(function (m, i) {
            return html`<div key=${i} style=${{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < next.length - 1 ? "1px solid " + tok.colorBorderSecondary : "none" }}>
              <${Icon} name="CalendarOutlined" style=${{ marginTop: 4, color: tok.colorPrimary }} />
              <div style=${{ flex: 1, minWidth: 0 }}><div style=${{ fontWeight: 500 }}>${m.text}</div><${Muted}>${fmt.date(m.at) + " · " + m.by}<//></div>
              <${APP.StatusTag} status=${fmt.dueStatus(m.at)}>${fmt.dueLabel(m.at)}<//>
            </div>`;
          }) : html`<${APP.EmptyHint} title="No upcoming steps" description="This case is closed or has no dates set." />`}
        <//>
        <${A.Card} size="small" title="Recommended responses (draft)" style=${{ marginTop: 16 }} extra=${html`<a onClick=${function () { props.setTab("risk"); }}>Full analysis</a>`}>
          ${(r.responses || []).length ? html`<ul style=${{ margin: 0, paddingLeft: 20 }}>${r.responses.map(function (x, i) { return html`<li key=${i} style=${{ marginBottom: 4 }}>${x}</li>`; })}</ul>` : html`<${Muted}>None yet.<//>`}
        <//>
      <//>
      <${A.Col} xs=${24} lg=${10}>
        <${A.Card} size="small" title="Risk at a glance" extra=${html`<${APP.SowRef} sec="3.2.1" />`}>
          <${A.Flex} vertical gap=${10}>
            <div><${Muted}>Rating<//><div style=${{ marginTop: 4 }}><${APP.StatusTag} status=${r.rating} /></div></div>
            <div><${Muted}>Evidence<//><div style=${{ marginTop: 4 }}><${APP.StatusTag} status=${r.evidence === "Sufficient" ? "Done" : r.evidence === "Partial" ? "Partial" : "Not enough evidence"}>${r.evidence}<//></div></div>
            <div><${Muted}>Compensation range<//><div>${r.compensation || "Can't be assessed yet"}</div></div>
            <div><${Muted}>Estimated duration<//><div>${r.duration || "Can't be assessed yet"}</div></div>
            <div><${Muted}>Materials still needed<//><div>${(r.missing || []).length ? (r.missing || []).length + " items" : "None"}</div></div>
          <//>
        <//>
        <${A.Card} size="small" title="Legal memo" style=${{ marginTop: 16 }}>
          <${A.Flex} justify="space-between" align="center" gap=${8} wrap>
            <${APP.StatusTag} status=${props.memoStatus} tone=${props.memoStatus === "Not drafted" ? "default" : undefined} />
            <${A.Button} size="small" onClick=${function () { props.setTab("memo"); }}>Open memo<//>
          <//>
        <//>
      <//>
    <//>`;
  }

  function CaseTimeline(props) {
    var c = props.c;
    var notes = APP.useShared("lp.caseNotes", {});
    var text = useState(""), kind = useState("Handling");
    var mine = (notes[0] || {})[c.id] || [];
    var all = (c.milestones || []).concat(mine).slice().sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    var colors = { Event: "red", Evidence: "purple", Claim: "orange", Filing: "blue", Hearing: "blue", Handling: "gray", Settlement: "green", Closed: "green", Due: "orange" };
    var add = function () {
      if (!text[0].trim()) { APP.toast.warn("Write a short note first."); return; }
      var entry = { at: APP.nowIso(), kind: kind[0], text: text[0].trim(), by: APP.personName(pid()), live: true };
      notes[1](function (prev) { var n = Object.assign({}, prev || {}); n[c.id] = (n[c.id] || []).concat([entry]); return n; });
      APP.audit({ action: "Case record added", item: c.id, detail: entry.kind + ": " + entry.text, dataClass: c.dataClass });
      text[1](""); APP.toast.success("Added to the case timeline.");
    };
    return html`<${A.Row} gutter=${[24, 16]}>
      <${A.Col} xs=${24} lg=${15}>
        <${A.Timeline} style=${{ marginTop: 12 }} items=${all.map(function (m, i) {
          var body = html`<div>
            <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}><b>${fmt.date(m.at)}</b><${A.Tag} style=${{ marginInlineEnd: 0 }}>${m.kind}<//>${m.upcoming ? html`<${APP.StatusTag} status=${fmt.dueStatus(m.at)}>${fmt.dueLabel(m.at)}<//>` : null}${m.live ? html`<${A.Tag} color="blue" style=${{ marginInlineEnd: 0 }}>Added now<//>` : null}</div>
            <div>${m.text}</div><${Muted} style=${{ fontSize: 12 }}>${m.by}<//>
          </div>`;
          return { key: String(i), color: m.upcoming ? "gray" : (colors[m.kind] || "blue"), children: body, content: body };
        })} />
      <//>
      <${A.Col} xs=${24} lg=${9}>
        <${A.Card} size="small" title="Add a handling record">
          <${Field} label="Type"><${A.Select} style=${{ width: "100%" }} value=${kind[0]} onChange=${kind[1]} options=${["Handling", "Evidence", "Filing", "Hearing", "Event"].map(function (x) { return { value: x, label: x }; })} /><//>
          <${Field} label="Note"><${A.Input.TextArea} autoSize=${{ minRows: 3, maxRows: 6 }} value=${text[0]} onChange=${function (e) { text[1](e.target.value); }} placeholder="For example: Called counsel about the hearing bundle" /><//>
          <${A.Button} type="primary" block onClick=${add}>Add record<//>
          <div style=${{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Who, what and when are kept with the case and in the audit log (§3.2.1).</div>
        <//>
      <//>
    <//>`;
  }

  function CaseRisk(props) {
    var c = props.c, r = c.risk3 || {};
    var tok = A.theme.useToken().token;
    var req = APP.useShared("lp.requested", {});
    var regen = useState(false);
    var done = useState({});
    var cites = (r.factors || []).map(function (f) { return f.cite; }).filter(Boolean);
    var request = function (m) {
      var key = c.id + "|" + m.item;
      req[1](function (prev) { var n = Object.assign({}, prev || {}); n[key] = APP.nowIso(); return n; });
      APP.audit({ action: "Material requested", item: c.id, detail: m.item + " from " + m.from, dataClass: c.dataClass });
      APP.toast.success("Request sent to " + m.from + ". In the build it lands on their task list with a due date.");
    };
    var regenerate = function () {
      regen[1](true);
      setTimeout(function () { regen[1](false); APP.toast.info("Analysis refreshed. Nothing changed: no new evidence since 8 Nov."); }, 1300);
    };
    if (regen[0]) return html`<div style=${{ padding: 16 }}><${A.Skeleton} active paragraph=${{ rows: 8 }} /></div>`;
    var notEnough = r.evidence === "Not enough evidence";
    return html`<div>
      <${A.Alert} type=${notEnough ? "warning" : "info"} showIcon style=${{ marginBottom: 16 }}
        message=${notEnough ? "Not enough evidence for figures" : "Draft analysis, based on the documents in this case file"}
        title=${notEnough ? "Not enough evidence for figures" : "Draft analysis, based on the documents in this case file"}
        description=${notEnough ? (r.qualitative || "") + " The additional materials needed are listed below (§3.2.1)."
          : "Probability, compensation and duration come with the data and method behind them. Confirmed by a person before anyone relies on it."} />
      <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${24} md=${8}><${A.Card} size="small" title="Risk rating" style=${{ height: "100%" }}>
          <${APP.StatusTag} status=${r.rating} style=${{ fontSize: 14, padding: "2px 10px" }} />
          <div style=${{ marginTop: 8 }}><${Muted}>${"Evidence: " + r.evidence}<//></div>
        <//><//>
        <${A.Col} xs=${24} md=${8}><${A.Card} size="small" title="Compensation range" style=${{ height: "100%" }}>
          <div style=${{ fontWeight: 500 }}>${r.compensation || "Can't be assessed yet"}</div>
          ${r.compensationMethod ? html`<div style=${{ marginTop: 6 }}><${Muted} style=${{ fontSize: 12 }}>${"Method: " + r.compensationMethod}<//></div>` : null}
        <//><//>
        <${A.Col} xs=${24} md=${8}><${A.Card} size="small" title="Estimated duration" style=${{ height: "100%" }}>
          <div style=${{ fontWeight: 500 }}>${r.duration || "Can't be assessed yet"}</div>
          ${r.durationMethod ? html`<div style=${{ marginTop: 6 }}><${Muted} style=${{ fontSize: 12 }}>${"Method: " + r.durationMethod}<//></div>` : null}
        <//><//>
      <//>
      <${A.Card} size="small" title="Influencing factors" style=${{ marginBottom: 16 }}>
        ${(r.factors || []).length ? r.factors.map(function (f, i) {
          var n = cites.indexOf(f.cite) + 1;
          return html`<div key=${i} style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: i < r.factors.length - 1 ? "1px solid " + tok.colorBorderSecondary : "none" }}>
            ${dirTag(f.dir)}<span style=${{ flex: "1 1 260px" }}>${f.text}${n ? html`<${APP.CitationChip} n=${n} cite=${f.cite} cites=${cites} />` : null}</span>
          </div>`;
        }) : html`<${Muted}>No factors yet. Add documents to the case file.<//>`}
      <//>
      ${(r.outcomes || []).length ? html`<${A.Card} size="small" title="Possible outcomes" style=${{ marginBottom: 16 }}>
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="label" dataSource=${r.outcomes} columns=${[
          { title: "Outcome", dataIndex: "label", key: "label" },
          { title: "Likelihood", dataIndex: "range", key: "range", render: function (v) { return html`<span className="nowrap" style=${{ fontWeight: 500 }}>${v}</span>`; } },
          { title: "Supporting data and method", dataIndex: "basis", key: "basis" }
        ]} /></div>
        <div style=${{ marginTop: 8, fontSize: 12, color: tok.colorTextSecondary }}>Ranges, not single numbers. Earlier cases come from Records and are cited in the build.</div>
      <//>` : null}
      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Possible developments" style=${{ height: "100%" }}>
            ${(r.developments || []).length ? html`<${A.Flex} wrap gap=${6}>${r.developments.map(function (d, i) { return html`<${A.Tag} key=${i} style=${{ marginInlineEnd: 0, whiteSpace: "normal" }}>${d}<//>`; })}<//>` : html`<${Muted}>None listed.<//>`}
          <//>
        <//>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Recommended responses" style=${{ height: "100%" }}>
            ${(r.responses || []).length ? html`<${A.Flex} vertical gap=${6}>${r.responses.map(function (x, i) {
              return html`<${A.Checkbox} key=${i} checked=${!!done[0][i]} onChange=${function (e) { var n = Object.assign({}, done[0]); n[i] = e.target.checked; done[1](n); if (e.target.checked) APP.toast.success("Marked as done. In the build this is recorded on the case."); }}>${x}<//>`;
            })}<//>` : html`<${Muted}>None listed.<//>`}
          <//>
        <//>
      <//>
      <${A.Card} size="small" title="Additional materials needed" style=${{ marginTop: 16 }}>
        ${(r.missing || []).length ? html`<div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="item" dataSource=${r.missing} columns=${[
          { title: "Material", dataIndex: "item", key: "item" },
          { title: "From", dataIndex: "from", key: "from" },
          { title: "Requested", key: "req", render: function (_, m) { var at = (req[0] || {})[c.id + "|" + m.item] || m.requested; return at ? html`<span className="nowrap">${fmt.date(at)}</span>` : html`<${Muted}>Not yet<//>`; } },
          { title: "", key: "act", render: function (_, m) { var at = (req[0] || {})[c.id + "|" + m.item]; return html`<${A.Button} size="small" onClick=${function () { request(m); }}>${at || m.requested ? "Remind" : "Request"}<//>`; } }
        ]} /></div>` : html`<${Muted}>Nothing missing for the current analysis.<//>`}
      <//>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 16 }}>
        <${Muted} style=${{ fontSize: 12, flex: "1 1 300px" }}>Draft by Qwen (self-hosted) on 8 Nov 2026 from the documents in this case file. Not legal advice until confirmed by an authorised person.<//>
        <${A.Button} icon=${ico("ReloadOutlined")} onClick=${regenerate}>Refresh analysis<//>
      </div>
    </div>`;
  }

  function CaseDocs(props) {
    var c = props.c;
    var tok = A.theme.useToken().token;
    var open = useState(null);
    return html`<div>
      ${c.docs.length ? html`<${A.Row} gutter=${[12, 12]}>
        ${c.docs.map(function (id) {
          var d = APP.getDocument(id) || { title: id, kind: "Document", pages: [] };
          return html`<${A.Col} key=${id} xs=${24} md=${12} xl=${8}>
            <${A.Card} size="small" hoverable onClick=${function () { open[1](id); }} style=${{ height: "100%" }}>
              <div style=${{ display: "flex", gap: 10 }}>
                <${Icon} name="FilePdfOutlined" style=${{ fontSize: 26, color: tok.colorPrimary, marginTop: 2 }} />
                <div style=${{ minWidth: 0, flex: 1 }}>
                  <div style=${{ fontWeight: 500 }}>${d.title}</div>
                  <${Muted} style=${{ fontSize: 12 }}>${d.kind + " · " + (d.totalPages || 1) + " pages · " + (d.version || "")}<//>
                  <div style=${{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <${APP.DataClassTag} cls=${d.dataClass} />
                    <${A.Tag} style=${{ marginInlineEnd: 0 }}>OCR checked<//>
                  </div>
                </div>
              </div>
            <//>
          <//>`;
        })}
      <//>` : html`<${APP.EmptyHint} title="No documents yet" description="Add the claim, notices and evidence to start the analysis." />`}
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        <${A.Button} icon=${ico("UploadOutlined")} onClick=${function () { APP.toast.build("In the build, files are uploaded, classified, read by OCR and checked for sensitive data before they join the case file (§1.4)."); }}>Add document<//>
        <${A.Button} icon=${ico("DatabaseOutlined")} onClick=${function () { if (c.records.length) APP.navigate("records", { id: c.records[0] }); else APP.navigate("records", {}); }}>Linked records<//>
      </div>
      <${DocDrawer} docId=${open[0]} onClose=${function () { open[1](null); }} />
    </div>`;
  }

  function MemoPanel(props) {
    var c = props.c, memo = props.memo, review = props.review, status = props.status;
    var tok = A.theme.useToken().token;
    var shared = APP.useShared("lp.memos", {});
    var editing = useState(false), draft = useState({}), hist = useState(false), fb = useState(null);
    if (!memo) return html`<${APP.EmptyHint} title="No memo for this case yet" description="Add the claim and evidence to the case file first, then draft a memo." action=${html`<${A.Button} onClick=${function () { APP.toast.build("In the build, the memo form opens once the case has documents."); }}>How it works<//>`} />`;
    var setMemo = function (patch) { shared[1](function (prev) { var n = Object.assign({}, prev || {}); n[c.id] = Object.assign({}, n[c.id] || {}, patch); return n; }); };
    if (!memo.generated) return html`<${MemoGenerator} c=${c} memo=${memo} onDone=${function () {
      setMemo({ generated: true, status: "Draft", version: 1, versions: [{ v: 1, at: APP.nowIso(), by: "system", note: "Generated by " + (byId(D.models, memo.modelId) || {}).name + " for " + APP.personName(pid()), sections: memo.sections }] });
      APP.audit({ action: "Memo drafted", item: c.id, detail: "Legal memo v1, " + (byId(D.models, memo.modelId) || {}).name, dataClass: c.dataClass });
    }} />`;

    var canEdit = status === "Draft" || status === "Returned";
    var startEdit = function () { var d = {}; memo.sections.forEach(function (s) { d[s.key] = s.text; }); draft[1](d); editing[1](true); };
    var save = function () {
      var secs = memo.sections.map(function (s) { return Object.assign({}, s, { text: draft[0][s.key] !== undefined ? draft[0][s.key] : s.text }); });
      var changed = secs.some(function (s, i) { return s.text !== memo.sections[i].text; });
      editing[1](false);
      if (!changed) { APP.toast.info("No changes to save."); return; }
      var v = memo.version + 1;
      setMemo({ sections: secs, version: v, versions: memo.versions.concat([{ v: v, at: APP.nowIso(), by: pid(), note: "Edited by " + APP.personName(pid()), sections: secs }]) });
      APP.audit({ action: "Memo edited", item: c.id, detail: "Legal memo v" + v, dataClass: c.dataClass });
      APP.toast.success("Saved as version " + v + ". Earlier versions stay in the history.");
    };
    var send = function () {
      var model = byId(D.models, memo.modelId) || {};
      var rev = APP.createReview({
        title: "Legal memo: " + c.id + ", " + c.title, kind: "Legal memo", reviewerId: "reviewer", ref: c.id, dataClass: c.dataClass, modelName: model.name, phase: 2,
        source: { route: "legal", params: { id: c.id, tab: "memo" } }, archiveCategory: "Legal memo",
        content: { summary: memo.sections[0].text.replace(/\s*\[\d+\]/g, ""), sections: memo.sections.map(function (s) { return { heading: s.heading, text: s.text }; }) },
        citations: memo.cites, version: memo.version
      });
      APP.toast.success("Sent to Li Wei for review as " + rev.id + ". The memo stays a draft until confirmed.");
    };
    var model = byId(D.models, memo.modelId) || {};
    var prevSections = null;
    if (memo.v1 && memo.version === 2 && !(shared[0] || {})[c.id]) prevSections = memo.sections.map(function (s) { return Object.assign({}, s, { text: memo.v1[s.key] !== undefined ? memo.v1[s.key] : s.text }); });

    return html`<div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <span style=${{ fontWeight: 600, fontSize: 16 }}>${"Legal memo: " + c.id}</span>
        <${APP.StatusTag} status=${status} />
        <${A.Tag} style=${{ marginInlineEnd: 0 }}>${"Version " + memo.version}<//>
        <${APP.ModelTag} id=${memo.modelId} />
        <${APP.DataClassTag} cls=${c.dataClass} />
        <${APP.SowRef} sec="3.2.2" />
        <div style=${{ flex: 1 }}></div>
        ${editing[0] ? html`<${Fragment}>
          <${A.Button} onClick=${function () { editing[1](false); }}>Cancel<//>
          <${A.Button} type="primary" icon=${ico("SaveOutlined")} onClick=${save}>Save version<//>
        <//>` : html`<${Fragment}>
          <${A.Button} icon=${ico("HistoryOutlined")} onClick=${function () { hist[1](true); }}>Versions<//>
          ${canEdit ? html`<${A.Button} icon=${ico("EditOutlined")} onClick=${gate([c.ownerId], "Editing the memo", startEdit)}>Edit<//>` : null}
          ${canEdit ? html`<${A.Button} type="primary" icon=${ico("SendOutlined")} onClick=${gate([c.ownerId], "Sending the memo for review", send)}>Send for review<//>` : null}
          ${status === "Pending review" ? html`<${A.Button} type="primary" icon=${ico("FileDoneOutlined")} onClick=${function () { APP.navigate("reviews", { id: review.id }); }}>${pid() === "reviewer" ? "Review it now" : "Open in Reviews"}<//>` : null}
        <//>`}
      </div>
      ${status === "Pending review" ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message=${"With " + APP.personName(review.reviewerId) + " for review (" + review.id + ")"} title=${"With " + APP.personName(review.reviewerId) + " for review (" + review.id + ")"}
          description=${"Sent " + fmt.relative(review.createdAt) + ". Editing is locked until it is confirmed or returned. " + (pid() !== "reviewer" ? "Switch to Li Wei to confirm or return it." : "")} />`
        : status === "Returned" ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }} message=${"Returned by " + APP.personName(review.decidedBy)} title=${"Returned by " + APP.personName(review.decidedBy)} description=${(review.comment || "See comments.") + " Edit the memo and send it again."} />`
        : status === "Confirmed" ? html`<${A.Alert} type="success" showIcon style=${{ marginBottom: 12 }}
          message=${"Confirmed by " + APP.personName(review ? review.decidedBy : memo.confirmedBy) + " on " + fmt.dateTime(review ? review.decidedAt : memo.confirmedAt)}
          title=${"Confirmed by " + APP.personName(review ? review.decidedBy : memo.confirmedBy) + " on " + fmt.dateTime(review ? review.decidedAt : memo.confirmedAt)}
          description=${review && review.recordId ? html`<span>Archived as <a onClick=${function () { APP.navigate("records", { id: review.recordId }); }}>${review.recordId}</a>. ${review.comment || ""}</span>` : "Archived with the case file."} />`
        : html`<${AiDraftNote} text="AI draft. It stays a draft until an authorised reviewer confirms it. Click a number to see the clause on its page." />`}
      ${memo.thin ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }} message="Not enough evidence" title="Not enough evidence" description=${memo.thin} />` : null}
      <div style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 10, padding: "4px 18px 8px", background: tok.colorBgContainer }}>
        <div style=${{ padding: "12px 0 4px", color: tok.colorTextSecondary, fontSize: 13 }}><b>Question: </b>${memo.question}</div>
        ${memo.sections.map(function (s) {
          return html`<div key=${s.key} style=${{ padding: "12px 0", borderTop: "1px solid " + tok.colorBorderSecondary }}>
            <div style=${{ fontWeight: 600, marginBottom: 6, textTransform: "uppercase", fontSize: 12, letterSpacing: 0.5, color: tok.colorTextSecondary }}>${s.heading}</div>
            ${editing[0] ? html`<${A.Input.TextArea} autoSize=${{ minRows: 2, maxRows: 10 }} value=${draft[0][s.key]} onChange=${function (e) { var n = Object.assign({}, draft[0]); n[s.key] = e.target.value; draft[1](n); }} />`
              : html`<${APP.CitedText} text=${s.text} cites=${memo.cites} />`}
          </div>`;
        })}
      </div>
      ${editing[0] ? html`<div style=${{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>Keep the [n] markers to keep citations. Saving creates a new version.</div>` : null}
      <div style=${{ marginTop: 12 }}><${APP.AnswerTrace} steps=${memoTrace(c, memo, review)} title="How this memo was made" /></div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginTop: 4 }}>
        <${A.Tooltip} title="Helpful"><${A.Button} type=${fb[0] === "up" ? "primary" : "text"} size="small" icon=${ico("LikeOutlined")} aria-label="Helpful" onClick=${function () { fb[1]("up"); APP.toast.success("Thanks. Feedback goes to the quality dashboard (§2.5)."); }} /><//>
        <${A.Tooltip} title="Not helpful"><${A.Button} type=${fb[0] === "down" ? "primary" : "text"} size="small" icon=${ico("DislikeOutlined")} aria-label="Not helpful" onClick=${function () { fb[1]("down"); APP.toast.info("Feedback recorded. In the build you can say what was wrong."); }} /><//>
        <${A.Button} type="text" size="small" icon=${ico("CopyOutlined")} onClick=${function () { copyText(memo.sections.map(function (s) { return s.heading.toUpperCase() + "\n" + s.text; }).join("\n\n")); }}>Copy<//>
        <${A.Button} type="text" size="small" icon=${ico("FileWordOutlined")} onClick=${function () { APP.toast.build("In the build, exports the memo to Word with citations as footnotes and a DRAFT watermark until it is confirmed."); }}>Export<//>
      </div>
      <${APP.DetailDrawer} open=${hist[0]} onClose=${function () { hist[1](false); }} title="Memo versions" subtitle=${c.id + " · every saved version is kept"} size=${720}>
        <${A.Timeline} items=${memo.versions.slice().reverse().map(function (v, i) {
          var b = html`<div><div style=${{ fontWeight: 500 }}>${"Version " + v.v + (v.v === memo.version ? " (current)" : "")}</div><${Muted}>${fmt.dateTime(v.at) + " · " + APP.personName(v.by)}<//><div>${v.note}</div></div>`;
          return { key: String(i), color: v.v === memo.version ? "blue" : "gray", children: b, content: b };
        })} />
        ${(function () {
          var cur = memo.versions[memo.versions.length - 1], prev = memo.versions[memo.versions.length - 2];
          var before = prev && prev.sections ? prev.sections : prevSections;
          var after = cur && cur.sections ? cur.sections : memo.sections;
          if (!before) return html`<${Muted}>Only one version so far. Edits appear here as a redline.<//>`;
          var changed = after.filter(function (s, i) { return before[i] && before[i].text !== s.text; });
          return html`<div>
            <div style=${{ fontWeight: 600, margin: "8px 0" }}>${"Changes from version " + (memo.version - 1) + " to " + memo.version}</div>
            ${changed.length ? changed.map(function (s) {
              var b = before.filter(function (x) { return x.key === s.key; })[0];
              return html`<div key=${s.key} style=${{ marginBottom: 12 }}><div style=${{ fontSize: 12, textTransform: "uppercase", opacity: 0.7 }}>${s.heading}</div><${APP.Redline} before=${b.text.split("**").join("")} after=${s.text.split("**").join("")} /></div>`;
            }) : html`<${Muted}>No text changes.<//>`}
            <div style=${{ fontSize: 12, opacity: 0.75 }}><span className="redline"><ins>added</ins> <del>removed</del></span></div>
          </div>`;
        })()}
      <//>
    </div>`;
  }

  function MemoGenerator(props) {
    var c = props.c, memo = props.memo;
    var tok = A.theme.useToken().token;
    var stage = useState("form"); // form | retrieving | streaming | stopped
    var q = useState(memo.question), ev = useState(memo.evidence.slice()), laws = useState(memo.laws.slice());
    var ctrl = useRef(null);
    var model = byId(D.models, memo.modelId) || {};
    var lawOptions = [];
    c.docs.filter(function (id) { var d = APP.getDocument(id); return d && d.kind === "Contract"; }).forEach(function (id) { lawOptions.push({ value: id, label: docTitle(id) }); });
    ["KB-CMP", "KB-POL-DOA", "KB-POL-PRC", "KB-LAW-PDPA", "KB-AOA"].forEach(function (k) { var kb = byId(D.knowledge, k); if (kb) { var vv = kb.versions[0].v; lawOptions.push({ value: k, label: kb.title + " (" + (/^\d/.test(vv) ? "version " + vv : vv.toLowerCase()) + ")" }); } });
    var evOptions = c.docs.filter(function (id) { var d = APP.getDocument(id); return !d || d.kind !== "Contract"; }).map(function (id) { return { value: id, label: docTitle(id) }; });
    var full = memo.sections.map(function (s) { return "**" + s.heading + "**\n\n" + s.text; }).join("\n\n");
    var go = gate([c.ownerId], "Drafting the memo", function () {
      if (!ev[0].length) { APP.toast.warn("Select at least one evidence file."); return; }
      stage[1]("retrieving");
      setTimeout(function () { stage[1]("streaming"); }, 1400);
    });
    if (stage[0] === "form") {
      return html`<${A.Row} gutter=${[24, 16]}>
        <${A.Col} xs=${24} lg=${15}>
          <${A.Steps} size="small" current=${0} style=${{ marginBottom: 20 }} items=${[{ title: "Describe the matter" }, { title: "Select evidence and law" }, { title: "Draft" }, { title: "Review" }]} />
          <${Field} label="What should the memo answer?"><${A.Input.TextArea} autoSize=${{ minRows: 2, maxRows: 5 }} value=${q[0]} onChange=${function (e) { q[1](e.target.value); }} /><//>
          <${Field} label="Evidence" hint="from the case file"><${A.Checkbox.Group} value=${ev[0]} onChange=${ev[1]} style=${{ display: "flex", flexDirection: "column", gap: 6 }} options=${evOptions} /><//>
          <${Field} label="Laws, contracts and policies" hint="from the knowledge base, current versions only">
            ${lawOptions.length ? html`<${A.Checkbox.Group} value=${laws[0]} onChange=${laws[1]} style=${{ display: "flex", flexDirection: "column", gap: 6 }} options=${lawOptions} />` : html`<${Muted}>None available.<//>`}
          <//>
          <${A.Button} type="primary" icon=${ico("ThunderboltOutlined")} onClick=${go}>Draft the memo<//>
        <//>
        <${A.Col} xs=${24} lg=${9}>
          <${A.Card} size="small" title="Before anything runs">
            <${A.Flex} vertical gap=${8}>
              <div><${APP.DataClassTag} cls=${c.dataClass} /> <${Muted}>case file data class<//></div>
              <div><${APP.ModelTag} id=${memo.modelId} /></div>
              <${Muted}>${memo.routing}<//>
              <${Muted}>Sections: Facts, Legal basis, Analysis, Risks, Recommendations. Each statement cites a clause and page.<//>
              <${Muted}>The result is a draft. It is confirmed by a specialist reviewer before anyone relies on it (§3.2.2).<//>
            <//>
          <//>
        <//>
      <//>`;
    }
    var streaming = stage[0] === "streaming";
    return html`<div>
      <${A.Steps} size="small" current=${2} style=${{ marginBottom: 20, maxWidth: 720 }} items=${[{ title: "Describe the matter" }, { title: "Select evidence and law" }, { title: "Draft" }, { title: "Review" }]} />
      <${APP.ChatMessage} role="user">${q[0]}<//>
      <div style=${{ height: 16 }}></div>
      <${APP.ChatMessage} role="assistant" badges=${html`<${Fragment}><${APP.DataClassTag} cls=${c.dataClass} /><${APP.ModelTag} id=${memo.modelId} /><//>`}
        actions=${streaming ? html`<${A.Button} danger size="small" icon=${ico("PauseCircleOutlined")} onClick=${function () { if (ctrl.current) ctrl.current.stop(); stage[1]("stopped"); }}>Stop<//>`
          : stage[0] === "stopped" ? html`<${A.Button} size="small" icon=${ico("ReloadOutlined")} onClick=${function () { stage[1]("form"); }}>Start again<//>` : null}>
        ${stage[0] === "retrieving" ? html`<${APP.TypingIndicator} label=${"Retrieving " + memo.cites.length + " passages from " + (ev[0].length + laws[0].length) + " documents on " + model.name} />`
          : html`<${APP.StreamingText} text=${full} cites=${memo.cites} interval=${22} wordsPerTick=${2} controlRef=${ctrl} onDone=${function () { setTimeout(function () { props.onDone(); APP.toast.success("Draft memo ready. Check it, then send it for review."); }, 400); }} />`}
      <//>
      <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 8 }}>Answers are drafts until an authorised person confirms them. Sample data only.</div>
    </div>`;
  }

  APP.registerScreen("legal", {
    title: "Legal affairs", group: "p2", phase: 2, icon: "BankOutlined", sow: ["3.2.1", "3.2.2"],
    summary: "Cases and disputes with risk analysis, and draft legal memos with cited legal basis.",
    roles: ["legal", "reviewer", "owner", "compliance", "cosec"],
    render: LegalScreen
  });

  /* ==================================================================
     TRANSLATION (#translation)
     ================================================================== */
  var T = LP.translation;
  var FIXES = { S2: ["USD 421,500", "USD 412,500"], S4: ["12 December 2026", "15 December 2026"], S7: ["friendly negotiation", "amicable negotiation"] };
  var FIXED_MSG = { S2: "Figures now match the source: USD 412,500", S4: "Date now matches the source: 15 December 2026", S7: "Uses the termbase term: amicable negotiation" };

  function useTerms() {
    var added = APP.useShared("lp.terms", [])[0] || [];
    var over = APP.useShared("lp.termOver", {})[0] || {};
    return T.termbase.concat(added).map(function (t) { return over[t.id] ? Object.assign({}, t, over[t.id]) : t; });
  }
  function segText(seg, st) { var x = st[seg.id]; return x && x.text !== undefined ? x.text : seg.en; }
  function segStatus(seg, st) { var x = st[seg.id]; return (x && x.status) || "Machine draft"; }
  function segChecks(seg, text, st) {
    var fx = FIXES[seg.id];
    var flagged = st[seg.id] && st[seg.id].flagged;
    return seg.checks.map(function (c) {
      if (c.fixable && fx && text.indexOf(fx[1]) >= 0 && text.indexOf(fx[0]) < 0) return Object.assign({}, c, { status: "Passed", text: FIXED_MSG[seg.id], fixed: true });
      if (c.type === "Ambiguity" && flagged) return Object.assign({}, c, { status: "Flagged", text: c.text + ". Flagged for the reviewer." });
      return c;
    });
  }
  function needsAttention(checks) { return checks.some(function (c) { return c.status === "Failed" || c.status === "Check"; }); }

  function TranslationScreen(props) {
    var route = APP.useRoute();
    var tab = useState("editor");
    var newOpen = useState(false);
    useEffect(function () { if (props.params.tab) tab[1](props.params.tab === "termbase" ? "termbase" : props.params.tab === "jobs" ? "jobs" : "editor"); }, [route.at]);
    var terms = useTerms();
    var jobsAdded = APP.useShared("lp.jobs", [])[0] || [];
    return html`<div>
      <${APP.PageHeader} title="Translation" phase=${2} sow=${["3.2.3"]}
        subtitle="Chinese, English and Sinhala legal translation, aligned clause by clause, with a termbase and checks on amounts, dates, parties and obligations. Translations are drafts for a person to post-edit (A9)."
        actions=${html`<${Fragment}>
          <${A.Dropdown} trigger=${["click"]} menu=${{ items: [{ key: "a", label: "Word, source and translation side by side" }, { key: "b", label: "Word, translation only" }, { key: "c", label: "XLIFF for a translation tool" }],
            onClick: function (i) { APP.toast.build("In the build, exports " + (i.key === "a" ? "an aligned two-column Word file" : i.key === "b" ? "the translation with numbering kept" : "an XLIFF file") + ", marked Draft until confirmed."); } }}>
            <${A.Button} icon=${ico("ExportOutlined")}>Export<//>
          <//>
          <${A.Button} type="primary" icon=${ico("PlusOutlined")} onClick=${function () { newOpen[1](true); }}>New translation<//>
        <//>`} />
      <${A.Card} styles=${{ body: { paddingTop: 4 } }}>
        <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
          { key: "editor", label: html`<span>${ico("EditOutlined")} Editor</span>`, children: html`<${TranslationEditor} terms=${terms} />` },
          { key: "jobs", label: html`<span>${ico("UnorderedListOutlined")} Jobs and history</span>`, children: html`<${TranslationJobs} added=${jobsAdded} openEditor=${function () { tab[1]("editor"); }} />` },
          { key: "termbase", label: html`<span>${ico("BookOutlined")} Termbase</span>`, children: html`<${Termbase} terms=${terms} />` }
        ]} />
      <//>
      <${NewTranslationDrawer} open=${newOpen[0]} onClose=${function () { newOpen[1](false); }} onCreated=${function () { newOpen[1](false); tab[1]("jobs"); }} />
    </div>`;
  }

  function SourceWithTerms(props) {
    var seg = props.seg, terms = props.terms;
    var list = (seg.terms || []).map(function (z) { return terms.filter(function (t) { return t.zh === z; })[0]; }).filter(Boolean)
      .sort(function (a, b) { return b.zh.length - a.zh.length; });
    if (!list.length) return html`<span lang="zh">${seg.zh}</span>`;
    var re = new RegExp("(" + list.map(function (t) { return t.zh.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "g");
    var parts = seg.zh.split(re);
    return html`<span lang="zh">${parts.map(function (p, i) {
      var t = list.filter(function (x) { return x.zh === p; })[0];
      return t ? html`<${A.Tooltip} key=${i} title=${t.zh + " = " + t.en + (t.status !== "Approved" ? " (" + t.status.toLowerCase() + ")" : "")}><mark className="ent" style=${{ cursor: "help" }}>${p}</mark><//>` : p;
    })}</span>`;
  }

  function TranslationEditor(props) {
    var tok = A.theme.useToken().token;
    var vp = APP.useViewport();
    var s = APP.useStore();
    var segState = sharedObj("lp.seg");
    var st = segState[0];
    var target = useState("en"), filter = useState("All"), sel = useState("S2"), running = useState(false), sideOpen = useState(false);
    var job = T.job;
    var review = latestReview(s.reviews, job.id, "Translation");
    var rows = T.segments.map(function (seg) {
      var text = segText(seg, st);
      var checks = segChecks(seg, text, st);
      return { seg: seg, text: text, status: segStatus(seg, st), checks: checks, attention: needsAttention(checks) };
    });
    var confirmed = rows.filter(function (r) { return r.status === "Confirmed"; }).length;
    var issues = rows.filter(function (r) { return r.attention; }).length;
    var shown = rows.filter(function (r) { return filter[0] === "All" || (filter[0] === "Needs attention" ? r.attention && r.status !== "Confirmed" : r.status === "Confirmed"); });
    var selRow = rows.filter(function (r) { return r.seg.id === sel[0]; })[0] || rows[0];
    var locked = review && review.status === "Pending";

    var patchSeg = function (id, patch) { segState[1](function (prev) { var n = {}; n[id] = Object.assign({}, prev[id] || {}, patch); return n; }); };
    var pushHist = function (id, text) { var cur = (st[id] && st[id].history) || []; return cur.concat([{ at: APP.nowIso(), by: pid(), text: text }]); };
    var edit = function (seg, val) { patchSeg(seg.id, { text: val, status: "Edited" }); };
    var commitEdit = function (seg) { var x = st[seg.id]; if (x && x.status === "Edited" && !x.logged) patchSeg(seg.id, { logged: true, history: pushHist(seg.id, "Edited by " + APP.personName(pid())) }); };
    var applyFix = function (row) {
      var fx = FIXES[row.seg.id];
      var t = row.text.indexOf(fx[0]) >= 0 ? row.text.split(fx[0]).join(fx[1]) : row.text + "";
      patchSeg(row.seg.id, { text: t, status: "Edited", history: pushHist(row.seg.id, "Fix applied: " + fx[0] + " to " + fx[1]) });
      APP.toast.success("Fix applied. The check now passes.");
    };
    var doConfirm = function (row) {
      patchSeg(row.seg.id, { status: "Confirmed", history: pushHist(row.seg.id, "Confirmed by " + APP.personName(pid())) });
      APP.toast.success("Clause " + row.seg.no + " confirmed.");
    };
    var confirmSeg = function (row) {
      if (locked) { APP.toast.info("Locked while the translation is with the reviewer."); return; }
      if (row.checks.some(function (c) { return c.status === "Failed"; })) {
        APP.confirm({ title: "A check failed on clause " + row.seg.no, content: "Fix it first, or confirm anyway and note why. The failed check stays visible to the reviewer.", okText: "Confirm anyway", zIndex: 2100, onOk: function () { doConfirm(row); } });
        return;
      }
      doConfirm(row);
    };
    var runChecks = function () {
      running[1](true);
      setTimeout(function () {
        running[1](false);
        var failed = 0, warn = 0;
        rows.forEach(function (r) { r.checks.forEach(function (c) { if (c.status === "Failed") failed++; if (c.status === "Check") warn++; }); });
        APP.toast[failed ? "warn" : "success"]("Checked " + rows.length + " clauses: " + failed + " failed, " + warn + " to check. Amounts, dates, parties and obligation words are checked by rule.");
      }, 1100);
    };
    var send = gate(["legal"], "Sending the translation for review", function () {
      var rev = APP.createReview({
        title: "Translation: " + job.title + " (Chinese to English)", kind: "Translation", reviewerId: "reviewer", ref: job.id, dataClass: job.dataClass, modelName: "Qwen (self-hosted)", phase: 2,
        source: { route: "translation", params: {} }, archiveCategory: "Translation",
        content: { summary: rows.length + " clauses, " + confirmed + " confirmed by " + APP.personName(pid()) + ", " + issues + " with open checks.",
          sections: rows.map(function (r) { return { heading: "Clause " + r.seg.no + " (" + r.status + ")", text: r.seg.zh + "\n\n" + r.text }; }) },
        citations: []
      });
      APP.toast.success("Sent to Li Wei as " + rev.id + ". Segments are locked until confirmed or returned.");
    });

    var side = html`<${SegmentSide} row=${selRow} terms=${props.terms} st=${st} applyFix=${applyFix} target=${target[0]}
      onFlag=${function () { patchSeg(selRow.seg.id, { flagged: true, history: pushHist(selRow.seg.id, "Ambiguity flagged for the reviewer") }); APP.toast.success("Flagged. The reviewer sees it at the top of the review."); }}
      onComment=${function (txt) { var cur = (st[selRow.seg.id] && st[selRow.seg.id].comments) || []; patchSeg(selRow.seg.id, { comments: cur.concat([{ at: APP.nowIso(), by: pid(), text: txt }]) }); APP.toast.success("Comment added."); }} />`;

    var grid = html`<div style=${{ display: "flex", flexDirection: "column", gap: 10 }}>
      ${shown.length ? shown.map(function (r) {
        var active = r.seg.id === selRow.seg.id;
        var failed = r.checks.filter(function (c) { return c.status === "Failed"; }).length;
        var warn = r.checks.filter(function (c) { return c.status === "Check"; }).length;
        return html`<div key=${r.seg.id} onClick=${function () { sel[1](r.seg.id); if (!vp.isWide) sideOpen[1](true); }}
          style=${{ border: "1px solid " + (active ? tok.colorPrimary : tok.colorBorderSecondary), borderRadius: 8, padding: 10, background: active ? tok.colorPrimaryBg : tok.colorBgContainer, cursor: "pointer" }}>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <span className="mono" style=${{ fontWeight: 600 }}>${"#" + r.seg.no}</span>
            ${target[0] === "si" ? html`<${APP.StatusTag} status="Not started">Sinhala not started<//>`
              : html`<${APP.StatusTag} status=${r.status === "Machine draft" ? "Draft" : r.status === "Edited" ? "In progress" : "Confirmed"}>${r.status}<//>`}
            ${failed && target[0] === "en" ? html`<${A.Tag} color="error" style=${{ marginInlineEnd: 0 }}>${failed + " failed"}<//>` : null}
            ${warn && target[0] === "en" ? html`<${A.Tag} color="warning" style=${{ marginInlineEnd: 0 }}>${warn + " to check"}<//>` : null}
            ${r.seg.ambiguous ? html`<${A.Tag} color="orange" icon=${ico("QuestionCircleOutlined")} style=${{ marginInlineEnd: 0 }}>Ambiguous term<//>` : null}
            <div style=${{ flex: 1 }}></div>
            ${target[0] === "en" ? html`<${A.Button} size="small" type=${r.status === "Confirmed" ? "default" : "primary"} ghost=${r.status !== "Confirmed"} disabled=${r.status === "Confirmed" || locked} icon=${ico("CheckOutlined")}
              onClick=${function (e) { e.stopPropagation(); confirmSeg(r); }}>${r.status === "Confirmed" ? "Confirmed" : "Confirm"}<//>` : null}
          </div>
          <${A.Row} gutter=${[12, 8]}>
            <${A.Col} xs=${24} md=${12}>
              <div style=${{ fontSize: 11, textTransform: "uppercase", color: tok.colorTextTertiary, marginBottom: 4 }}>Chinese source</div>
              <div style=${{ lineHeight: 1.75, fontSize: 15 }}><${SourceWithTerms} seg=${r.seg} terms=${props.terms} /></div>
            <//>
            <${A.Col} xs=${24} md=${12}>
              <div style=${{ fontSize: 11, textTransform: "uppercase", color: tok.colorTextTertiary, marginBottom: 4 }}>${target[0] === "en" ? "English translation" : "Sinhala translation"}</div>
              ${target[0] === "en" ? html`<${A.Input.TextArea} autoSize=${{ minRows: 2, maxRows: 8 }} value=${r.text} disabled=${locked}
                  onClick=${function (e) { e.stopPropagation(); sel[1](r.seg.id); }} onChange=${function (e) { edit(r.seg, e.target.value); }} onBlur=${function () { commitEdit(r.seg); }}
                  status=${failed ? "error" : undefined} aria-label=${"English translation of clause " + r.seg.no} />`
                : html`<div style=${{ border: "1px dashed " + tok.colorBorder, borderRadius: 6, padding: "10px 12px", color: tok.colorTextTertiary, fontSize: 13, minHeight: 56 }}>Sinhala draft appears here in the build.</div>`}
            <//>
          <//>
        </div>`;
      }) : html`<${APP.EmptyHint} title="Nothing in this view" description="Every clause in this filter is done." action=${html`<${A.Button} onClick=${function () { filter[1]("All"); }}>Show all clauses<//>`} />`}
    </div>`;

    return html`<div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style=${{ minWidth: 0, flex: "1 1 320px" }}>
          <div style=${{ fontWeight: 600 }}>${job.title}</div>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 4 }}>
            <span className="mono" style=${{ fontSize: 12, opacity: 0.7 }}>${job.id}</span>
            <a onClick=${function () { APP.navigate("contracts", { id: job.contractId }); }} style=${{ fontSize: 13 }}>${job.contractId + ", " + job.counterparty}</a>
            <${APP.DataClassTag} cls=${job.dataClass} /><${APP.ModelTag} id=${job.modelId} />
            ${review ? html`<${APP.StatusTag} status=${review.status === "Pending" ? "Pending review" : review.status} />` : null}
          </div>
        </div>
        <${A.Flex} gap=${8} wrap align="center">
          <${Muted}>From<//>
          <${A.Select} size="small" value="zh" style=${{ width: 110 }} options=${[{ value: "zh", label: "Chinese" }, { value: "enx", label: "English" }, { value: "six", label: "Sinhala" }]}
            onChange=${function () { APP.toast.info("This sample job's source is Chinese. In the build, any of the three languages can be the source."); }} />
          <${Muted}>To<//>
          <${A.Segmented} size="small" value=${target[0]} onChange=${target[1]} options=${[{ value: "en", label: "English" }, { value: "si", label: "Sinhala" }]} />
        <//>
      </div>
      ${target[0] === "si" ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message="Sinhala output is produced in the build" title="Sinhala output is produced in the build"
        description="The model chosen in Discovery drafts the Sinhala text and a person post-edits it (A9, A12). The prototype doesn't show machine Sinhala text, so the target column is empty. Termbase and checks work the same way." />` : null}
      ${locked ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message=${"With " + APP.personName(review.reviewerId) + " for review (" + review.id + ")"} title=${"With " + APP.personName(review.reviewerId) + " for review (" + review.id + ")"}
        description="Segments are locked until the reviewer confirms or returns the translation." action=${html`<${A.Button} size="small" onClick=${function () { APP.navigate("reviews", { id: review.id }); }}>Open in Reviews<//>`} />` : null}
      ${review && review.status === "Returned" ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }} message=${"Returned by " + APP.personName(review.decidedBy)} title=${"Returned by " + APP.personName(review.decidedBy)} description=${(review.comment || "") + " Fix and send again."} />` : null}
      ${review && review.status === "Confirmed" ? html`<${A.Alert} type="success" showIcon style=${{ marginBottom: 12 }} message=${"Confirmed by " + APP.personName(review.decidedBy)} title=${"Confirmed by " + APP.personName(review.decidedBy)} description=${review.recordId ? "Archived as " + review.recordId + "." : "Confirmed."} />` : null}
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <${A.Segmented} value=${filter[0]} onChange=${filter[1]} options=${["All", "Needs attention", "Confirmed"]} />
        <div style=${{ flex: "1 1 160px", minWidth: 140, maxWidth: 260 }}><${A.Progress} percent=${target[0] === "si" ? 0 : Math.round(confirmed / rows.length * 100)} size="small" format=${function () { return (target[0] === "si" ? 0 : confirmed) + " of " + rows.length + " confirmed"; }} /></div>
        <div style=${{ flex: 1 }}></div>
        <${A.Button} icon=${ico("SafetyCertificateOutlined")} loading=${running[0]} onClick=${runChecks}>Run checks<//>
        <${A.Button} type="primary" icon=${ico("SendOutlined")} disabled=${locked || target[0] === "si"} onClick=${send}>Send for review<//>
      </div>
      ${vp.isWide ? html`<${A.Splitter} style=${{ height: "calc(100vh - var(--shell-top) - 300px)", minHeight: 520, border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8 }}>
          <${A.Splitter.Panel} defaultSize="64%" min="45%">
            <div style=${{ height: "100%", overflowY: "auto", padding: 10 }}>${grid}</div>
          <//>
          <${A.Splitter.Panel} min="25%">
            <div style=${{ height: "100%", overflowY: "auto", padding: "4px 14px 14px" }}>${side}</div>
          <//>
        <//>`
        : html`<div>${grid}
          <${APP.DetailDrawer} open=${sideOpen[0]} onClose=${function () { sideOpen[1](false); }} title=${"Clause " + selRow.seg.no} subtitle="Termbase, checks and history" size=${520}>${side}<//>
        </div>`}
      <div style=${{ marginTop: 10, fontSize: 12, color: tok.colorTextSecondary }}>Paragraphs and numbering are kept. Amounts, dates, parties and obligation words are checked by rule, not by the model, and unclear wording is flagged for a person <${APP.SowRef} sec="3.2.3" />.</div>
    </div>`;
  }

  function SegmentSide(props) {
    var row = props.row, seg = row.seg;
    var tok = A.theme.useToken().token;
    var comment = useState("");
    var x = props.st[seg.id] || {};
    var matches = (seg.terms || []).map(function (z) { return props.terms.filter(function (t) { return t.zh === z; })[0]; }).filter(Boolean);
    var hist = (T.segmentHistory[seg.id] || [{ at: T.job.created, by: "system", text: "Machine draft, Qwen (self-hosted)" }]).concat(x.history || []);
    var checkIcon = { Passed: "CheckCircleOutlined", Failed: "CloseCircleOutlined", Check: "ExclamationCircleOutlined", Flagged: "FlagOutlined" };
    var checkColor = { Passed: tok.colorSuccess, Failed: tok.colorError, Check: tok.colorWarning, Flagged: tok.colorWarning };
    return html`<div>
      <div style=${{ fontWeight: 600, margin: "8px 0 4px" }}>${"Clause " + seg.no}</div>
      <${A.Tabs} size="small" items=${[
        { key: "checks", label: "Checks", children: html`<${A.Flex} vertical gap=${10}>
          ${row.checks.map(function (c, i) {
            return html`<div key=${i} style=${{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <${Icon} name=${checkIcon[c.status] || "InfoCircleOutlined"} style=${{ color: checkColor[c.status], marginTop: 4 }} />
              <div style=${{ flex: 1, minWidth: 0 }}>
                <div style=${{ fontWeight: 500 }}>${c.type}</div>
                <div style=${{ fontSize: 13 }}>${c.text}</div>
                ${c.fixable && !c.fixed && props.target === "en" ? html`<${A.Button} size="small" style=${{ marginTop: 6 }} icon=${ico("ToolOutlined")} onClick=${function () { props.applyFix(row); }}>Apply fix<//>` : null}
              </div>
            </div>`;
          })}
          ${seg.ambiguous ? html`<${A.Alert} type="warning" showIcon message="Ambiguous wording" title="Ambiguous wording" description=${seg.ambiguous}
            action=${x.flagged ? html`<${A.Tag} color="orange">Flagged<//>` : html`<${A.Button} size="small" onClick=${props.onFlag}>Flag for review<//>`} />` : null}
        <//>` },
        { key: "terms", label: "Termbase (" + matches.length + ")", children: matches.length ? html`<${A.Flex} vertical gap=${8}>
          ${matches.map(function (t) {
            return html`<div key=${t.id} style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: "8px 10px" }}>
              <div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span lang="zh" style=${{ fontSize: 15 }}>${t.zh}</span><${Icon} name="ArrowRightOutlined" style=${{ opacity: 0.5 }} /><b>${t.en}</b>
                <${APP.StatusTag} status=${t.status} />
              </div>
              ${t.avoid ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Avoid: " + t.avoid}</div>` : null}
              ${t.note ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${t.note}</div>` : null}
              <div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Sinhala: from CICT's termbase in the build (A5)</div>
            </div>`;
          })}
        <//>` : html`<${APP.EmptyHint} title="No termbase matches" description="No listed terms appear in this clause." />` },
        { key: "hist", label: "History", children: html`<${A.Timeline} style=${{ marginTop: 8 }} items=${hist.map(function (h, i) {
          var b = html`<div><div>${h.text}</div><${Muted} style=${{ fontSize: 12 }}>${fmt.dateTime(h.at) + " · " + APP.personName(h.by)}<//></div>`;
          return { key: String(i), children: b, content: b };
        })} />` },
        { key: "comments", label: "Comments", children: html`<div>
          ${(x.comments || []).length ? x.comments.map(function (cm, i) { return html`<div key=${i} style=${{ marginBottom: 8 }}><${APP.PersonTag} id=${cm.by} /><div style=${{ fontSize: 13, marginTop: 2 }}>${cm.text}</div></div>`; }) : html`<${Muted}>No comments yet.<//>`}
          <${A.Input.TextArea} style=${{ marginTop: 8 }} autoSize=${{ minRows: 2, maxRows: 4 }} value=${comment[0]} onChange=${function (e) { comment[1](e.target.value); }} placeholder="Note for the reviewer" />
          <${A.Button} size="small" style=${{ marginTop: 6 }} onClick=${function () { if (!comment[0].trim()) return APP.toast.warn("Write a comment first."); props.onComment(comment[0].trim()); comment[1](""); }}>Add comment<//>
        </div>` }
      ]} />
    </div>`;
  }

  function jobStatus(job, s) {
    if (job.releaseId) {
      var r = byId(s.releaseRequests, job.releaseId);
      if (r) return r.status === "Pending" ? "Waiting for release" : r.status === "Approved" ? "Draft ready" : "Release rejected";
    }
    if (job.id === T.job.id) {
      var rv = latestReview(s.reviews, job.id, "Translation");
      if (rv) return rv.status === "Pending" ? "Pending review" : rv.status;
    }
    return job.status;
  }

  function TranslationJobs(props) {
    var s = APP.useStore();
    var open = useState(null);
    var jobs = T.jobs.concat(props.added).map(function (j) { return Object.assign({}, j, { liveStatus: jobStatus(j, s) }); });
    var job = open[0] ? byId(jobs, open[0]) : null;
    var columns = [
      APP.col.id("Job", "id"),
      { title: "Document", key: "title", render: function (_, r) { return html`<div style=${{ minWidth: 220 }}><div style=${{ fontWeight: 500 }}>${r.title}</div><${Muted} style=${{ fontSize: 12 }}>${r.kind}<//></div>`; } },
      APP.col.text("Languages", "pair", { render: function (v) { return html`<span className="nowrap">${v}</span>`; } }),
      APP.col.text("Clauses", "segments", { align: "right" }),
      { title: "Status", dataIndex: "liveStatus", key: "st", render: function (v) { return html`<${APP.StatusTag} status=${v} tone=${v === "Waiting for release" ? "warning" : v === "Draft ready" ? "processing" : v === "Queued" ? "processing" : undefined} />`; } },
      APP.col.text("Model", "model"),
      APP.col.dataClass("Data class", "dataClass"),
      APP.col.date("Updated", "updated"),
      APP.col.person("Requested by", "requesterId")
    ];
    return html`<div>
      <${APP.DataTable} columns=${columns} data=${jobs} searchPlaceholder="Search translation jobs" searchKeys=${["id", "title", "pair", "kind", "ref"]}
        filters=${[{ key: "pair", label: "Languages" }, { key: "liveStatus", label: "Status" }, { key: "kind", label: "Document type" }]} onRowClick=${function (r) { open[1](r.id); }} />
      <${APP.DetailDrawer} open=${!!job} onClose=${function () { open[1](null); }} title=${job ? job.title : ""} subtitle=${job ? job.id + " · " + job.pair : ""}
        tags=${job ? html`<${APP.StatusTag} status=${job.liveStatus} />` : null}
        actions=${job && job.id === T.job.id ? html`<${A.Button} type="primary" onClick=${function () { open[1](null); props.openEditor(); }}>Open in editor<//>` : null}>
        ${job ? html`<div>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
            ["Languages", job.pair], ["Document type", job.kind], ["Clauses", job.segments], ["Data class", html`<${APP.DataClassTag} cls=${job.dataClass} />`],
            ["Model", job.model], ["Requested by", html`<${APP.PersonTag} id=${job.requesterId} />`], ["Linked to", job.ref], ["Updated", fmt.dateTime(job.updated)]
          ]} />
          <div style=${{ marginTop: 16 }}>
            ${job.releaseId ? html`<div>
              <div style=${{ fontWeight: 600, marginBottom: 8 }}>Release to Qwen on Bedrock</div>
              <${APP.ApprovalCard} requestId=${job.releaseId} />
              <div style=${{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>This clause is Sensitive. A second-opinion draft on Bedrock needs the data owner's release; the self-hosted draft in TR-0031 did not.</div>
            </div>`
            : /Sinhala/.test(job.pair) ? html`<${A.Alert} type="info" showIcon message="Sinhala text not shown in the prototype" title="Sinhala text not shown in the prototype"
                description="Sinhala drafts come from the model chosen in Discovery and are post-edited by a person (A9). The sample doesn't include Sinhala text." />`
            : job.confirmedBy ? html`<${A.Alert} type="success" showIcon message=${"Confirmed by " + APP.personName(job.confirmedBy)} title=${"Confirmed by " + APP.personName(job.confirmedBy)} description="The confirmed translation is archived in Records with its source." />`
            : job.live ? html`<${A.Alert} type="info" showIcon message="Queued" title="Queued" description="In the build, the file is split into clauses, checked for sensitive data and drafted, then it opens in the editor." />`
            : null}
          </div>
          <div style=${{ fontWeight: 600, margin: "16px 0 8px" }}>Translation history</div>
          <${A.Timeline} items=${[
            { t: job.updated, x: "Last change: " + job.liveStatus },
            { t: job.updated, x: "Clauses aligned, numbering kept" },
            { t: job.updated, x: "Sensitive data check done before any model call" }
          ].map(function (e, i) { var b = html`<div><div>${e.x}</div><${Muted} style=${{ fontSize: 12 }}>${fmt.dateTime(e.t)}<//></div>`; return { key: String(i), children: b, content: b }; })} />
          ${job.id !== T.job.id && !job.releaseId ? html`<${A.Button} onClick=${function () { APP.toast.build("In the build, every job opens in the editor. The prototype's editor shows TR-0031 only."); }}>Open in editor<//>` : null}
        </div>` : null}
      <//>
    </div>`;
  }

  function Termbase(props) {
    var addT = APP.useShared("lp.terms", []);
    var overT = APP.useShared("lp.termOver", {});
    var open = useState(null), addOpen = useState(false);
    var f = useState({ zh: "", en: "", avoid: "", domain: "Contract", note: "" });
    var term = open[0] ? byId(props.terms, open[0]) : null;
    var usage = term ? T.segments.filter(function (sg) { return sg.zh.indexOf(term.zh) >= 0; }) : [];
    var approve = function (t) {
      overT[1](function (prev) { var n = Object.assign({}, prev || {}); n[t.id] = { status: "Approved", ownerName: APP.personName(pid()), updated: APP.nowIso().slice(0, 10) }; return n; });
      APP.audit({ action: "Termbase change", item: t.id, detail: t.zh + " = " + t.en + " approved", dataClass: "Internal" });
      APP.toast.success("Approved. New translations use it from now on.");
    };
    var add = function () {
      var v = f[0];
      if (!v.zh.trim() || !v.en.trim()) { APP.toast.warn("Enter the Chinese and English terms."); return; }
      var id = "TB-0" + (15 + (addT[0] || []).length);
      addT[1](function (prev) { return (prev || []).concat([{ id: id, zh: v.zh.trim(), en: v.en.trim(), avoid: v.avoid.trim(), domain: v.domain, status: "Proposed", note: v.note.trim(), ownerName: APP.personName(pid()), updated: APP.nowIso().slice(0, 10), live: true }]); });
      APP.audit({ action: "Termbase change", item: id, detail: "Proposed: " + v.zh + " = " + v.en, dataClass: "Internal" });
      APP.notify({ to: ["reviewer"], kind: "review", title: "Term proposed: " + v.zh, body: APP.personName(pid()) + " proposed " + v.en + ".", route: "translation", params: { tab: "termbase" }, phase: 2 });
      f[1]({ zh: "", en: "", avoid: "", domain: "Contract", note: "" }); addOpen[1](false);
      APP.toast.success("Proposed. Li Wei approves new terms before they are used.");
    };
    var columns = [
      { title: "Chinese", dataIndex: "zh", key: "zh", render: function (v) { return html`<span lang="zh" style=${{ fontSize: 15 }}>${v}</span>`; } },
      { title: "English (preferred)", dataIndex: "en", key: "en", render: function (v) { return html`<b>${v}</b>`; } },
      { title: "Avoid", dataIndex: "avoid", key: "avoid", render: function (v) { return v ? html`<${Muted}>${v}<//>` : null; } },
      { title: "Sinhala", key: "si", render: function () { return html`<${A.Tooltip} title="Sinhala terms come from CICT's termbase (A5, A9). Not invented in the prototype."><${Muted} style=${{ fontStyle: "italic", fontSize: 12 }}>From CICT's termbase<//><//>`; } },
      APP.col.text("Domain", "domain"),
      APP.col.status("Status", "status"),
      APP.col.text("Owner", "ownerName"),
      APP.col.date("Updated", "updated")
    ];
    return html`<div>
      <${APP.DataTable} columns=${columns} data=${props.terms} pageSize=${10} searchPlaceholder="Search Chinese or English terms" searchKeys=${["zh", "en", "avoid", "domain", "note"]}
        filters=${[{ key: "domain", label: "Domain" }, { key: "status", label: "Status" }]} onRowClick=${function (r) { open[1](r.id); }}
        toolbar=${html`<${Fragment}>
          <${A.Button} icon=${ico("ImportOutlined")} onClick=${function () { APP.toast.build("In the build, CICT's existing terminology list is imported from Excel or TBX (A5)."); }}>Import<//>
          <${A.Button} type="primary" icon=${ico("PlusOutlined")} onClick=${function () { addOpen[1](true); }}>Add term<//>
        <//>`} />
      <div style=${{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Termbase version 1.6, effective 1 Oct 2026. Approved terms are applied to every machine draft and checked on every clause.</div>
      <${APP.DetailDrawer} open=${!!term} onClose=${function () { open[1](null); }} title=${term ? term.zh + " = " + term.en : ""} subtitle=${term ? term.id + " · " + term.domain : ""}
        tags=${term ? html`<${APP.StatusTag} status=${term.status} />` : null}
        actions=${term && term.status !== "Approved" ? html`<${A.Button} type="primary" onClick=${gate(["reviewer"], "Approving a term", function () { approve(term); })}>Approve term<//>` : null}>
        ${term ? html`<div>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Chinese", html`<span lang="zh">${term.zh}</span>`], ["English", term.en], ["Avoid", term.avoid || "None"], ["Sinhala", "From CICT's termbase in the build"], ["Owner", term.ownerName], ["Updated", fmt.date(term.updated)], { label: "Note", children: term.note || "None", span: 2 }]} />
          <div style=${{ fontWeight: 600, margin: "16px 0 8px" }}>Used in the open job</div>
          ${usage.length ? usage.map(function (sg) { return html`<div key=${sg.id} style=${{ marginBottom: 10 }}><div className="mono" style=${{ fontSize: 12, opacity: 0.7 }}>${"TR-0031 · clause " + sg.no}</div><div lang="zh">${sg.zh}</div><${Muted}>${sg.en}<//></div>`; })
            : html`<${Muted}>Not used in TR-0031.<//>`}
        </div>` : null}
      <//>
      <${APP.DetailDrawer} open=${addOpen[0]} onClose=${function () { addOpen[1](false); }} title="Propose a term" subtitle="A specialist reviewer approves it before it is used" size=${520}
        footer=${html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end" }}><${A.Button} onClick=${function () { addOpen[1](false); }}>Cancel<//><${A.Button} type="primary" onClick=${add}>Propose term<//></div>`}>
        <${Field} label="Chinese"><${A.Input} value=${f[0].zh} onChange=${function (e) { f[1](Object.assign({}, f[0], { zh: e.target.value })); }} placeholder="For example: 滞箱费" /><//>
        <${Field} label="English (preferred)"><${A.Input} value=${f[0].en} onChange=${function (e) { f[1](Object.assign({}, f[0], { en: e.target.value })); }} placeholder="For example: container detention charge" /><//>
        <${Field} label="Avoid" hint="optional"><${A.Input} value=${f[0].avoid} onChange=${function (e) { f[1](Object.assign({}, f[0], { avoid: e.target.value })); }} /><//>
        <${Field} label="Domain"><${A.Select} style=${{ width: "100%" }} value=${f[0].domain} onChange=${function (v) { f[1](Object.assign({}, f[0], { domain: v })); }} options=${["Contract", "Disputes", "Liability", "Commercial", "Shipping", "Parties"].map(function (x) { return { value: x, label: x }; })} /><//>
        <${Field} label="Note" hint="optional"><${A.Input.TextArea} autoSize=${{ minRows: 2 }} value=${f[0].note} onChange=${function (e) { f[1](Object.assign({}, f[0], { note: e.target.value })); }} /><//>
        <${Muted}>Sinhala equivalents are added from CICT's termbase in the build.<//>
      <//>
    </div>`;
  }

  function NewTranslationDrawer(props) {
    var add = APP.useShared("lp.jobs", []);
    var f = useState({ doc: "REC-2025-0310", from: "Chinese", to: "English" });
    var opts = D.records.map(function (r) { return { value: r.id, label: r.id + " " + r.title, cls: r.dataClass }; });
    var picked = opts.filter(function (o) { return o.value === f[0].doc; })[0] || opts[0];
    var routeFor = function (cls) {
      if (cls === "Confidential") return "Qwen (self-hosted), inside the CICT VPC. Never leaves the VPC.";
      if (cls === "Sensitive") return "Qwen (self-hosted), unmasked. A Bedrock draft needs masking and the data owner's release.";
      return "Qwen on Bedrock. No masking or release needed.";
    };
    var create = function () {
      if (f[0].from === f[0].to) { APP.toast.warn("Pick two different languages."); return; }
      var id = "TR-00" + (33 + (add[0] || []).length);
      var rec = byId(D.records, f[0].doc) || {};
      add[1](function (prev) { return (prev || []).concat([{ id: id, title: rec.title || f[0].doc, kind: rec.category || "Document", pair: f[0].from + " to " + f[0].to, segments: rec.pages ? rec.pages * 6 : 10, status: "Queued", requesterId: pid(), updated: APP.nowIso(), dataClass: rec.dataClass || "Internal", model: routeFor(rec.dataClass).split(",")[0].split(".")[0], ref: rec.id, live: true }]); });
      APP.audit({ action: "Translation requested", item: id, detail: f[0].from + " to " + f[0].to + ", " + rec.id, dataClass: rec.dataClass });
      APP.toast.success(id + " queued. It appears in Jobs and history.");
      props.onCreated();
    };
    return html`<${APP.DetailDrawer} open=${props.open} onClose=${props.onClose} title="New translation" subtitle="Contracts, legal opinions, laws, policies and letters (§3.2.3)" size=${560}
      footer=${html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end" }}><${A.Button} onClick=${props.onClose}>Cancel<//><${A.Button} type="primary" onClick=${create}>Start translation<//></div>`}>
      <${Field} label="Document"><${A.Select} showSearch optionFilterProp="label" style=${{ width: "100%" }} value=${f[0].doc} onChange=${function (v) { f[1](Object.assign({}, f[0], { doc: v })); }} options=${opts} /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} sm=${12}><${Field} label="From"><${A.Select} style=${{ width: "100%" }} value=${f[0].from} onChange=${function (v) { f[1](Object.assign({}, f[0], { from: v })); }} options=${["Chinese", "English", "Sinhala"].map(function (x) { return { value: x, label: x }; })} /><//><//>
        <${A.Col} xs=${24} sm=${12}><${Field} label="To"><${A.Select} style=${{ width: "100%" }} value=${f[0].to} onChange=${function (v) { f[1](Object.assign({}, f[0], { to: v })); }} options=${["Chinese", "English", "Sinhala"].map(function (x) { return { value: x, label: x }; })} /><//><//>
      <//>
      <${A.Alert} type="info" showIcon message=${"Data class: " + picked.cls} title=${"Data class: " + picked.cls} description=${"Routing: " + routeFor(picked.cls)} />
    <//>`;
  }

  APP.registerScreen("translation", {
    title: "Translation", group: "p2", phase: 2, icon: "TranslationOutlined", sow: ["3.2.3"],
    summary: "Chinese, English and Sinhala legal translation with a termbase and consistency checks.",
    roles: ["legal", "reviewer", "owner", "compliance", "cosec"],
    render: TranslationScreen
  });

  /* ==================================================================
     REGULATORY MONITORING (#regulatory)
     ================================================================== */
  var R = LP.regulatory;
  function useReg() {
    var sh = sharedObj("lp.reg");
    var v = sh[0];
    var upOver = v.upOver || {};
    var updates = (v.manual || []).concat(R.updates).map(function (u) { return upOver[u.id] ? Object.assign({}, u, upOver[u.id]) : u; });
    var tasks = (v.tasks || []).concat(R.tasks).map(function (t) { return (v.taskOver || {})[t.id] ? Object.assign({}, t, v.taskOver[t.id]) : t; });
    var runs = (v.runs || []).concat(R.runs);
    var sources = R.sources.map(function (s) { return (v.srcOver || {})[s.id] ? Object.assign({}, s, v.srcOver[s.id]) : s; });
    return { v: v, set: sh[1], updates: updates, tasks: tasks, runs: runs, sources: sources, lastRun: v.lastRun || R.lastRun };
  }
  function srcName(sources, id) { var s = byId(sources, id); return s ? s.name : id; }
  function relTone(r) { return r === "High" ? "error" : r === "Medium" ? "warning" : "default"; }

  function RegulatoryScreen(props) {
    var route = APP.useRoute();
    var g = useReg();
    var tok = A.theme.useToken().token;
    var tab = useState("updates"), openId = useState(null), taskFor = useState(null), manual = useState(false), running = useState(false), retrying = useState(false);
    var q = useState(""), filter = useState("All"), area = useState(null);
    useEffect(function () { if (props.params.id) { tab[1]("updates"); openId[1](props.params.id); } if (props.params.tab) tab[1](props.params.tab); }, [route.at]);
    var failed = g.sources.filter(function (s) { return s.status === "Failed"; });
    var areas = Array.from(new Set(g.updates.reduce(function (a, u) { return a.concat(u.areas); }, []))).sort();
    var list = g.updates.filter(function (u) {
      if (filter[0] === "New" && u.status !== "New") return false;
      if (filter[0] === "High relevance" && u.relevance !== "High") return false;
      if (filter[0] === "Task created" && u.status !== "Task created") return false;
      if (filter[0] === "Dismissed" && u.status !== "Dismissed") return false;
      if (area[0] && u.areas.indexOf(area[0]) < 0) return false;
      if (q[0].trim() && (u.title + " " + u.summary + " " + u.id).toLowerCase().indexOf(q[0].trim().toLowerCase()) < 0) return false;
      return true;
    }).sort(function (a, b) { return b.detected.localeCompare(a.detected); });
    var openTasks = g.tasks.filter(function (t) { return t.status !== "Done"; }).length;

    var runNow = function () {
      running[1](true);
      setTimeout(function () {
        running[1](false);
        var at = APP.nowIso();
        g.set(function (prev) { return { lastRun: at, runs: [{ at: at, checked: 6, of: 7, found: 0, note: "Run by " + APP.personName(pid()) + ". Labour circulars still unreachable.", live: true }].concat(prev.runs || []) }; });
        APP.audit({ action: "Regulatory check", item: "Sources", detail: "6 of 7 reached, 0 new changes, 1 failed", dataClass: "Public" });
        APP.toast.warn("Checked 7 sources: 6 reached, no new changes since 06:30. Labour circulars (sample source) still failed.");
      }, 1800);
    };
    var retry = function (src) {
      retrying[1](true);
      setTimeout(function () {
        retrying[1](false);
        g.set(function (prev) { var o = Object.assign({}, prev.srcOver || {}); o[src.id] = { lastCheck: APP.nowIso() }; return { srcOver: o }; });
        APP.audit({ action: "Source retry failed", item: src.id, detail: src.name + ": connection timed out", dataClass: "Public" });
        APP.toast.error(src.name + " is still unreachable. Connection timed out. It is tried again at 06:30 tomorrow, or you can add the update by hand.");
      }, 1300);
    };

    var sourceHealth = html`<${A.Card} size="small" title="Source health" extra=${html`<${Muted} style=${{ fontSize: 12 }}>${"Last run " + fmt.relative(g.lastRun)}<//>`}>
      ${g.sources.map(function (src, i) {
        var badge = src.status === "Healthy" ? "success" : src.status === "Failed" ? "error" : "warning";
        return html`<div key=${src.id} style=${{ padding: "8px 0", borderBottom: i < g.sources.length - 1 ? "1px solid " + tok.colorBorderSecondary : "none" }}>
          <div style=${{ display: "flex", gap: 8, alignItems: "center" }}>
            <${A.Badge} status=${badge} />
            <span style=${{ flex: 1, minWidth: 0, fontSize: 13 }}>${src.name}</span>
            <${APP.StatusTag} status=${src.status === "Failed" ? "Failed" : src.status === "Partial" ? "Partial" : "Healthy"} icon=${false} />
          </div>
          <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginLeft: 14 }}>${"Checked " + fmt.relative(src.lastCheck) + " · last change " + fmt.dateShort(src.lastChange)}</div>
          ${src.note ? html`<div style=${{ fontSize: 12, marginLeft: 14, color: src.status === "Failed" ? tok.colorError : tok.colorWarningText }}>${src.note}</div>` : null}
          ${src.status === "Failed" ? html`<div style=${{ display: "flex", gap: 6, marginLeft: 14, marginTop: 6, flexWrap: "wrap" }}>
            <${A.Button} size="small" loading=${retrying[0]} onClick=${function () { retry(src); }}>Retry now<//>
            <${A.Button} size="small" onClick=${function () { manual[1](src.id); }}>Add by hand<//>
          </div>` : null}
        </div>`;
      })}
      <div style=${{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>CICT confirms the list of official sources (A16). Failed checks are shown, never hidden (§3.2.4).</div>
    <//>`;

    var feed = html`<div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <${A.Input} allowClear prefix=${ico("SearchOutlined")} placeholder="Search updates" value=${q[0]} onChange=${function (e) { q[1](e.target.value); }} style=${{ width: 220, maxWidth: "100%" }} />
        <${A.Select} allowClear placeholder="Business area" value=${area[0]} onChange=${area[1]} style=${{ minWidth: 150 }} options=${areas.map(function (a) { return { value: a, label: a }; })} />
        <div style=${{ maxWidth: "100%", overflowX: "auto" }}><${A.Segmented} value=${filter[0]} onChange=${filter[1]} options=${["All", "New", "High relevance", "Task created", "Dismissed"]} /></div>
      </div>
      ${list.length ? html`<${A.Flex} vertical gap=${10}>${list.map(function (u) {
        return html`<${A.Card} key=${u.id} size="small" hoverable onClick=${function () { openId[1](u.id); }} style=${{ cursor: "pointer", opacity: u.status === "Dismissed" ? 0.7 : 1 }}>
          <div style=${{ display: "flex", gap: 10 }}>
            <${Icon} name=${u.manual ? "CloudUploadOutlined" : u.change === "New bill" ? "BankOutlined" : u.change === "New" ? "FileAddOutlined" : "DiffOutlined"} style=${{ fontSize: 20, color: tok.colorPrimary, marginTop: 2 }} />
            <div style=${{ flex: 1, minWidth: 0 }}>
              <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style=${{ fontWeight: 600 }}>${u.title}</span>
              </div>
              <div style=${{ fontSize: 12, color: tok.colorTextTertiary, margin: "2px 0 6px" }}>${srcName(g.sources, u.sourceId) + " · detected " + fmt.relative(u.detected) + (u.effective ? " · effective " + fmt.date(u.effective) : "")}</div>
              <div style=${{ fontSize: 13, marginBottom: 8 }}>${u.summary}</div>
              <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <${A.Tag} style=${{ marginInlineEnd: 0 }}>${u.change}<//>
                <${APP.StatusTag} status=${u.relevance} tone=${relTone(u.relevance)} icon=${false}>${u.relevance + " relevance"}<//>
                ${u.areas.map(function (a) { return html`<${A.Tag} key=${a} color="geekblue" style=${{ marginInlineEnd: 0 }}>${a}<//>`; })}
                ${!u.verified ? html`<${A.Tag} color="warning" icon=${ico("ExclamationCircleOutlined")} style=${{ marginInlineEnd: 0 }}>Unverified<//>` : null}
                <div style=${{ flex: 1 }}></div>
                <${APP.StatusTag} status=${u.status} tone=${u.status === "New" ? "processing" : u.status === "Task created" ? "success" : "default"} />
              </div>
            </div>
          </div>
        <//>`;
      })}<//>` : html`<${A.Card}><${APP.EmptyHint} title="No updates match" description="Try another filter." action=${html`<${A.Button} onClick=${function () { filter[1]("All"); area[1](null); q[1](""); }}>Clear filters<//>`} /><//>`}
    </div>`;

    var taskCols = [
      APP.col.id("Task", "id"),
      APP.col.text("Task", "title"),
      { title: "Update", dataIndex: "updateId", key: "u", render: function (v) { var u = byId(g.updates, v); return u ? html`<a className="mono nowrap" onClick=${function (e) { e.stopPropagation(); openId[1](v); }}>${v}</a>` : html`<span className="mono">${v}</span>`; } },
      APP.col.text("Department", "dept"),
      APP.col.text("Assignee", "assigneeName"),
      { title: "Due", dataIndex: "due", key: "due", render: function (v, r) { return html`<div className="nowrap">${fmt.date(v)}${r.status !== "Done" ? html`<div style=${{ fontSize: 12, opacity: 0.7 }}>${fmt.dueLabel(v)}</div>` : null}</div>`; } },
      APP.col.status("Status", "status")
    ];
    var taskOpen = useState(null), outcome = useState("");
    var task = taskOpen[0] ? byId(g.tasks, taskOpen[0]) : null;
    var finishTask = function (t) {
      g.set(function (prev) { var o = Object.assign({}, prev.taskOver || {}); o[t.id] = { status: "Done", outcome: outcome[0] || "Verified, no further action" }; return { taskOver: o }; });
      APP.audit({ action: "Verification done", item: t.id, detail: outcome[0] || "Verified, no further action", dataClass: "Public" });
      outcome[1](""); taskOpen[1](null);
      APP.toast.success(t.id + " marked done.");
    };

    return html`<div>
      <${APP.PageHeader} title="Regulatory monitoring" phase=${2} sow=${["3.2.4", "3.2.2"]}
        subtitle="Daily checks of approved official sources. New or amended text is recorded with its link, dates and original wording, rated for relevance and turned into verification tasks. Updates shown are illustrative."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${ico("SettingOutlined")} onClick=${function () { APP.toast.build("In the build, administrators add approved official sources and the business areas to watch (A16)."); }}>Sources<//>
          <${A.Button} icon=${ico("CloudUploadOutlined")} onClick=${function () { manual[1](true); }}>Add by hand<//>
          <${A.Button} type="primary" icon=${ico("SyncOutlined")} loading=${running[0]} onClick=${runNow}>Run check now<//>
        <//>`} />
      ${failed.length ? html`<${A.Alert} type="error" showIcon style=${{ marginBottom: 16 }}
        message=${failed.length + " source failed in today's check"} title=${failed.length + " source failed in today's check"}
        description=${html`<div>
          <div>${failed.map(function (s) { return s.name + ": " + s.note; }).join(" ") + " Updates from it may be missing until it is reachable or added by hand."}</div>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <${A.Button} size="small" loading=${retrying[0]} onClick=${function () { retry(failed[0]); }}>Retry<//>
            <${A.Button} size="small" onClick=${function () { manual[1](failed[0].id); }}>Add by hand<//>
          </div>
        </div>`} />` : null}
      <${StatRow} items=${[
        { title: "Sources checked today", value: g.sources.filter(function (s) { return s.status !== "Failed"; }).length + " of " + g.sources.length, icon: "CloudSyncOutlined", note: "Daily at 06:30", onClick: function () { tab[1]("sources"); } },
        { title: "New updates", value: g.updates.filter(function (u) { return u.status === "New"; }).length, icon: "BellOutlined", note: "Not yet actioned", onClick: function () { tab[1]("updates"); filter[1]("New"); } },
        { title: "High relevance, open", value: g.updates.filter(function (u) { return u.relevance === "High" && u.status === "New"; }).length, icon: "FireOutlined", warn: true, note: "Need a decision", onClick: function () { tab[1]("updates"); filter[1]("High relevance"); } },
        { title: "Verification tasks open", value: openTasks, icon: "CheckSquareOutlined", note: "Across departments", onClick: function () { tab[1]("tasks"); } }
      ]} />
      <${A.Card} styles=${{ body: { paddingTop: 4 } }}>
        <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
          { key: "updates", label: "Updates", children: html`<${A.Row} gutter=${[16, 16]}><${A.Col} xs=${24} xl=${16}>${feed}<//><${A.Col} xs=${24} xl=${8}>${sourceHealth}<//><//>` },
          { key: "tasks", label: "Verification tasks", children: html`<${APP.DataTable} columns=${taskCols} data=${g.tasks} searchPlaceholder="Search tasks" searchKeys=${["id", "title", "dept", "assigneeName", "updateId"]}
            filters=${[{ key: "status", label: "Status" }, { key: "dept", label: "Department" }]} onRowClick=${function (r) { taskOpen[1](r.id); }} />` },
          { key: "sources", label: "Sources", children: html`<${APP.DataTable} data=${g.sources} searchPlaceholder="Search sources" searchKeys=${["name", "area"]} filters=${[{ key: "status", label: "Status" }]}
            onRowClick=${function (r) { if (r.status === "Failed") retry(r); else APP.toast.info(r.name + ": healthy. " + r.docs + " documents tracked. In the build, this opens the source's settings and check history."); }}
            columns=${[
              APP.col.text("Source", "name"), APP.col.text("Business areas", "area"), APP.col.text("Checked", "freq"),
              { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${APP.StatusTag} status=${v === "Partial" ? "Partial" : v} />`; } },
              { title: "Last check", dataIndex: "lastCheck", key: "lc", render: function (v) { return html`<span className="nowrap">${fmt.relative(v)}</span>`; } },
              APP.col.date("Last change", "lastChange"), APP.col.text("Documents", "docs", { align: "right" })
            ]} />` },
          { key: "log", label: "Check log", children: html`<${A.Timeline} style=${{ marginTop: 12 }} items=${g.runs.map(function (r, i) {
            var b = html`<div><div style=${{ fontWeight: 500 }}>${fmt.dateTime(r.at) + ": " + r.checked + " of " + r.of + " sources reached, " + r.found + " new or amended"}</div>${r.note ? html`<${Muted}>${r.note}<//>` : null}</div>`;
            return { key: String(i), color: r.checked < r.of ? "red" : "green", children: b, content: b };
          })} />` }
        ]} />
      <//>
      <${UpdateDrawer} g=${g} id=${openId[0]} onClose=${function () { openId[1](null); }} onTask=${function (u) { taskFor[1](u.id); }} />
      <${TaskDrawer} g=${g} updateId=${taskFor[0]} onClose=${function () { taskFor[1](null); }} />
      <${ManualImportDrawer} g=${g} open=${!!manual[0]} sourceId=${typeof manual[0] === "string" ? manual[0] : null} onClose=${function () { manual[1](false); }} onDone=${function (id) { manual[1](false); tab[1]("updates"); filter[1]("All"); openId[1](id); }} />
      <${APP.DetailDrawer} open=${!!task} onClose=${function () { taskOpen[1](null); }} title=${task ? task.title : ""} subtitle=${task ? task.id + " · " + task.dept : ""} tags=${task ? html`<${APP.StatusTag} status=${task.status} />` : null} size=${560}
        footer=${task && task.status !== "Done" ? html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end" }}><${A.Button} onClick=${function () { openId[1](task.updateId); }}>Open update<//><${A.Button} type="primary" onClick=${function () { finishTask(task); }}>Mark done<//></div>` : null}>
        ${task ? html`<div>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Update", task.updateId], ["Department", task.dept], ["Assignee", task.assigneeName], ["Due", fmt.date(task.due)], ["Created", fmt.dateTime(task.created)], ["Status", html`<${APP.StatusTag} status=${task.status} />`], { label: "Outcome", children: task.outcome || "Not recorded yet", span: 2 }]} />
          ${task.status !== "Done" ? html`<div style=${{ marginTop: 16 }}><${Field} label="Outcome"><${A.Input.TextArea} autoSize=${{ minRows: 2 }} value=${outcome[0]} onChange=${function (e) { outcome[1](e.target.value); }} placeholder="For example: CON-2024-033 allows pass-through. No change needed." /><//></div>` : null}
        </div>` : null}
      <//>
    </div>`;
  }

  function UpdateDrawer(props) {
    var g = props.g;
    var u = props.id ? byId(g.updates, props.id) : null;
    var tok = A.theme.useToken().token;
    var dismiss = useState(false), reason = useState(""), checked = useState({});
    var narrow = APP.useViewport().width < 720;
    if (!u) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var setU = function (patch) { g.set(function (prev) { var o = Object.assign({}, prev.upOver || {}); o[u.id] = Object.assign({}, o[u.id] || {}, patch); return { upOver: o }; }); };
    var doDismiss = function () {
      setU({ status: "Dismissed", dismissedBy: pid(), dismissReason: reason[0] || "Not relevant to Company operations" });
      APP.audit({ action: "Update dismissed", item: u.id, detail: reason[0] || "Not relevant", dataClass: "Public" });
      dismiss[1](false); reason[1]("");
      APP.toast.info(u.id + " dismissed. The reason is kept with the update.");
    };
    var task = u.taskId ? byId(g.tasks, u.taskId) : null;
    var src = byId(g.sources, u.sourceId) || {};
    var acts = u.status === "New" ? html`<${Fragment}>
        <${A.Button} onClick=${function () { dismiss[1](true); }}>Dismiss<//>
        <${A.Button} type="primary" icon=${ico("CheckSquareOutlined")} onClick=${function () { props.onTask(u); }}>Create task<//>
      <//>` : null;
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${780} title=${u.title}
      subtitle=${u.id + " · " + src.name + " · detected " + fmt.dateTime(u.detected)}
      tags=${html`<${Fragment}><${APP.StatusTag} status=${u.status} tone=${u.status === "New" ? "processing" : u.status === "Task created" ? "success" : "default"} /><${APP.StatusTag} status=${u.relevance} tone=${relTone(u.relevance)} icon=${false}>${u.relevance + " relevance"}<//><//>`}
      actions=${narrow ? null : acts}>
      ${narrow && acts ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>${acts}</div>` : null}
      ${!u.verified ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }} message="Unverified text" title="Unverified text"
        description=${u.manual ? "Added by hand by " + APP.personName(u.importedBy || "legal") + ". Check it against the official source before relying on it." : "Part of the source page could not be read. Check the text against the official source."}
        action=${html`<${A.Button} size="small" onClick=${function () { setU({ verified: true }); APP.audit({ action: "Update verified", item: u.id, detail: "Text checked against the official source", dataClass: "Public" }); APP.toast.success("Marked as verified."); }}>Mark verified<//>`} />` : null}
      ${u.status === "Dismissed" ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message=${"Dismissed by " + APP.personName(u.dismissedBy)} title=${"Dismissed by " + APP.personName(u.dismissedBy)} description=${u.dismissReason}
        action=${html`<${A.Button} size="small" onClick=${function () { setU({ status: "New" }); APP.toast.info("Reopened."); }}>Reopen<//>`} />` : null}
      ${task ? html`<${A.Alert} type="success" showIcon style=${{ marginBottom: 12 }} message=${"Verification task " + task.id + ": " + task.status} title=${"Verification task " + task.id + ": " + task.status} description=${task.dept + ", " + task.assigneeName + ", due " + fmt.date(task.due)} />` : null}
      ${dismiss[0] ? html`<${A.Card} size="small" style=${{ marginBottom: 12 }} title="Why dismiss it?">
        <${A.Input} value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }} placeholder="For example: applies to banks only" />
        <div style=${{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}><${A.Button} size="small" onClick=${function () { dismiss[1](false); }}>Cancel<//><${A.Button} size="small" type="primary" onClick=${doDismiss}>Dismiss update<//></div>
      <//>` : null}
      <${A.Tabs} items=${[
        { key: "sum", label: "Summary and impact", children: html`<div>
          <${AiDraftNote} text="AI summary and relevance rating. A draft until Legal confirms it through a verification task." />
          <div style=${{ fontWeight: 600, marginBottom: 4 }}>What changed</div>
          <p style=${{ marginTop: 0 }}>${u.summary}</p>
          <div style=${{ fontWeight: 600, marginBottom: 4 }}>Relevance to Company operations</div>
          <p style=${{ marginTop: 0 }}>${u.impact}</p>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>${u.areas.map(function (a) { return html`<${A.Tag} key=${a} color="geekblue" style=${{ marginInlineEnd: 0 }}>${a}<//>`; })}</div>
          ${u.verify.length ? html`<div><div style=${{ fontWeight: 600, marginBottom: 6 }}>Matters to verify</div>
            <${A.Flex} vertical gap=${6}>${u.verify.map(function (x, i) { return html`<${A.Checkbox} key=${i} checked=${!!checked[0][i]} onChange=${function (e) { var n = Object.assign({}, checked[0]); n[i] = e.target.checked; checked[1](n); }}>${x}<//>`; })}<//>
          </div>` : null}
          ${u.links.length ? html`<div style=${{ marginTop: 14 }}><div style=${{ fontWeight: 600, marginBottom: 6 }}>Linked items</div>
            <${A.Flex} wrap gap=${8}>${u.links.map(function (l, i) { return html`<${A.Button} key=${i} size="small" icon=${ico("LinkOutlined")} onClick=${function () { props.onClose(); APP.navigate(l.route, l.params); }}>${l.label}<//>`; })}<//>
          </div>` : null}
          <div style=${{ marginTop: 16 }}><${A.Button} icon=${ico("MessageOutlined")} onClick=${function () { APP.navigate("assistant", { new: true }); }}>Ask the assistant about this update<//></div>
        </div>` },
        { key: "diff", label: "Change", children: html`<div>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <${Muted}>${u.before ? "Previous text compared with the new text, word by word" : "New document: no earlier version on record"}<//>
            ${u.before ? html`<${A.Tag} style=${{ marginInlineEnd: 0 }}>${(function () { var st = APP.diffStats(u.before, u.after); return st.added + " words added, " + st.removed + " removed"; })()}<//>` : null}
          </div>
          <div className="doc-page"><${APP.Redline} before=${u.before} after=${u.after} showLegend=${true} /></div>
        </div>` },
        { key: "orig", label: "Original text", children: html`<div>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
            ["Source", src.name], ["Source link", html`<a onClick=${function () { APP.toast.build("In the build, opens the official source page in a new tab."); }}>${u.link}</a>`],
            ["Published", u.published ? fmt.date(u.published) : "Not stated"], ["Effective", u.effective ? fmt.date(u.effective) : "Not stated"],
            ["Retrieved", fmt.dateTime(u.detected)], ["Content check", html`<span className="mono">${"sha256 " + (u.id.charCodeAt(4) * 7919).toString(16) + "c41e9a0b"}</span>`],
            ["Verified", u.verified ? "Yes" : "No, see the warning"], ["Data class", html`<${APP.DataClassTag} cls=${u.dataClass} />`]
          ]} />
          <div className="doc-page" style=${{ marginTop: 12 }}><p style=${{ margin: 0 }}>${u.after}</p><div className="doc-page-no">Original wording as retrieved (illustrative)</div></div>
        </div>` },
        { key: "hist", label: "History", children: html`<${A.Timeline} style=${{ marginTop: 8 }} items=${[
          { t: u.detected, x: u.manual ? "Added by hand by " + APP.personName(u.importedBy || "legal") : "Detected in the daily check" },
          { t: u.detected, x: "Summary and relevance drafted by Qwen (self-hosted)" },
          u.taskId || task ? { t: (task && task.created) || u.detected, x: "Verification task " + (u.taskId || "") + " created" } : null,
          u.status === "Dismissed" ? { t: u.detected, x: "Dismissed by " + APP.personName(u.dismissedBy) + ": " + u.dismissReason } : null
        ].filter(Boolean).map(function (e, i) { var b = html`<div><div>${e.x}</div><${Muted} style=${{ fontSize: 12 }}>${fmt.dateTime(e.t)}<//></div>`; return { key: String(i), children: b, content: b }; })} />` }
      ]} />
    <//>`;
  }

  function TaskDrawer(props) {
    var g = props.g;
    var u = props.updateId ? byId(g.updates, props.updateId) : null;
    var f = useState(null);
    useEffect(function () {
      if (u) f[1]({ title: "Verify: " + u.title.replace(" (illustrative)", ""), dept: u.areas[0] === "Data protection" ? "Legal" : (LP.departments.indexOf(u.areas[0]) >= 0 ? u.areas[0] : "Legal"), assignee: "N. Perera", due: APP.now().add(14, "day").format("YYYY-MM-DD"), note: "" });
    }, [props.updateId]);
    if (!u || !f[0]) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var v = f[0];
    var set = function (k, x) { var n = Object.assign({}, v); n[k] = x; f[1](n); };
    var create = function () {
      var id = "VT-0" + (219 + ((g.v.tasks || []).length));
      var t = { id: id, updateId: u.id, title: v.title, dept: v.dept, assigneeName: v.assignee, due: v.due, status: "Open", created: APP.nowIso(), note: v.note, live: true };
      g.set(function (prev) { var o = Object.assign({}, prev.upOver || {}); o[u.id] = Object.assign({}, o[u.id] || {}, { status: "Task created", taskId: id }); return { tasks: [t].concat(prev.tasks || []), upOver: o }; });
      APP.audit({ action: "Task created", item: id, detail: "Verify " + u.id + ", " + v.dept, dataClass: "Public" });
      APP.notify({ to: ["legal", "compliance"].filter(function (x) { return x !== pid(); }), kind: "info", title: "Verification task " + id, body: v.title + ". " + v.dept + ", due " + fmt.date(v.due) + ".", route: "regulatory", params: { id: u.id }, phase: 2 });
      APP.toast.success(id + " sent to " + v.dept + ". The update is marked Task created.");
      props.onClose();
    };
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} title="Create verification task" subtitle=${u.id + " · " + u.title} size=${560} zIndex=${1010}
      footer=${html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end" }}><${A.Button} onClick=${props.onClose}>Cancel<//><${A.Button} type="primary" onClick=${create}>Create task<//></div>`}>
      <${Field} label="Task"><${A.Input} value=${v.title} onChange=${function (e) { set("title", e.target.value); }} /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Department"><${A.Select} style=${{ width: "100%" }} value=${v.dept} onChange=${function (x) { set("dept", x); }} options=${LP.departments.map(function (d) { return { value: d, label: d }; })} /><//><//>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Due"><${A.DatePicker} style=${{ width: "100%" }} value=${dayjs(v.due)} onChange=${function (d) { if (d) set("due", d.format("YYYY-MM-DD")); }} /><//><//>
      <//>
      <${Field} label="Assignee"><${A.Input} value=${v.assignee} onChange=${function (e) { set("assignee", e.target.value); }} /><//>
      <${Field} label="Note" hint="optional"><${A.Input.TextArea} autoSize=${{ minRows: 2 }} value=${v.note} onChange=${function (e) { set("note", e.target.value); }} placeholder=${u.verify[0] || ""} /><//>
      <${Muted}>The task carries the matters to verify. In the build it also goes to the department's queue and by email (A21).<//>
    <//>`;
  }

  function ManualImportDrawer(props) {
    var g = props.g;
    var f = useState({ sourceId: "SRC-7", title: "", published: null, text: "", relevance: "Medium", areas: ["HR"] });
    useEffect(function () { if (props.open && props.sourceId) f[1](Object.assign({}, f[0], { sourceId: props.sourceId })); }, [props.open]);
    var v = f[0];
    var set = function (k, x) { var n = Object.assign({}, v); n[k] = x; f[1](n); };
    var save = function () {
      if (!v.title.trim() || !v.text.trim()) { APP.toast.warn("Add a title and paste the text."); return; }
      var id = "REG-11" + (10 + (g.v.manual || []).length);
      var u = { id: id, title: v.title.trim(), sourceId: v.sourceId, change: "Manual import", detected: APP.nowIso(), published: v.published, effective: null, relevance: v.relevance, areas: v.areas.length ? v.areas : ["Legal"],
        status: "New", verified: false, manual: true, importedBy: pid(), dataClass: "Public", link: "uploaded by hand", summary: "Added by hand. Summary is drafted once the text is verified.",
        impact: "Not assessed yet.", verify: ["Check the text against the official source"], before: "", after: v.text.trim(), links: [], live: true };
      g.set(function (prev) { return { manual: [u].concat(prev.manual || []) }; });
      APP.audit({ action: "Manual import", item: id, detail: srcName(g.sources, v.sourceId) + ": " + u.title, dataClass: "Public" });
      APP.toast.success(id + " added. It is marked unverified until someone checks it.");
      f[1]({ sourceId: "SRC-7", title: "", published: null, text: "", relevance: "Medium", areas: ["HR"] });
      props.onDone(id);
    };
    return html`<${APP.DetailDrawer} open=${props.open} onClose=${props.onClose} title="Add an update by hand" subtitle="For sources that failed or documents received another way (§3.2.4)" size=${600}
      footer=${html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end" }}><${A.Button} onClick=${props.onClose}>Cancel<//><${A.Button} type="primary" onClick=${save}>Add update<//></div>`}>
      <${Field} label="Source"><${A.Select} style=${{ width: "100%" }} value=${v.sourceId} onChange=${function (x) { set("sourceId", x); }} options=${g.sources.map(function (s) { return { value: s.id, label: s.name + (s.status === "Failed" ? " (failed)" : "") }; })} /><//>
      <${Field} label="Title"><${A.Input} value=${v.title} onChange=${function (e) { set("title", e.target.value); }} placeholder="For example: Labour circular on public holiday pay" /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Published"><${A.DatePicker} style=${{ width: "100%" }} value=${v.published ? dayjs(v.published) : null} onChange=${function (d) { set("published", d ? d.format("YYYY-MM-DD") : null); }} /><//><//>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Relevance"><${A.Segmented} block value=${v.relevance} onChange=${function (x) { set("relevance", x); }} options=${["High", "Medium", "Low"]} /><//><//>
      <//>
      <${Field} label="Business areas"><${A.Select} mode="multiple" style=${{ width: "100%" }} value=${v.areas} onChange=${function (x) { set("areas", x); }} options=${["HR", "Legal", "Operations", "Commercial", "Finance", "IT", "Customs", "Safety"].map(function (a) { return { value: a, label: a }; })} /><//>
      <${Field} label="Text"><${A.Input.TextArea} autoSize=${{ minRows: 4, maxRows: 10 }} value=${v.text} onChange=${function (e) { set("text", e.target.value); }} placeholder="Paste the new or amended text" /><//>
      <${A.Button} icon=${ico("UploadOutlined")} onClick=${function () { APP.toast.build("In the build, you can upload the PDF. It is read by OCR and the text appears here."); }}>Upload a PDF instead<//>
    <//>`;
  }

  APP.registerScreen("regulatory", {
    title: "Regulatory monitoring", group: "p2", phase: 2, icon: "AlertOutlined", sow: ["3.2.4"],
    summary: "Daily checks of official sources, with relevance and follow-up tasks.",
    render: RegulatoryScreen
  });

  /* ==================================================================
     POLICIES (#policies)
     ================================================================== */
  var STAGES = LP.stages;
  function usePolicies() {
    var sh = sharedObj("lp.pol");
    var v = sh[0];
    var list = (v.drafts || []).concat(LP.policies).map(function (p) {
      var o = (v.over || {})[p.id] || {};
      return Object.assign({}, p, o, { stage: o.stage !== undefined ? o.stage : p.stage, versions: o.versions || p.versions, log: p.log.concat((v.log || {})[p.id] || []) });
    });
    return { v: v, set: sh[1], list: list };
  }
  var STAGE_STATUS = ["Draft", "In consultation", "In review", "Pending approval", "Approved"];
  function pendingIssue(p) { return !!(p.approved && !p.issued); }
  function inProgress(p) { return p.stage <= 3 || pendingIssue(p); }
  function polStatus(p) {
    if (p.stage === 6) return "Repealed";
    var cur = p.versions.filter(function (x) { return x.status === "In force"; })[0];
    if (cur) return "In force";
    return inProgress(p) ? STAGE_STATUS[p.stage] : p.versions[0].status;
  }
  /* A draft running alongside an in-force version, for example draft 4 while version 3 applies. */
  function draftNote(p) {
    if (!inProgress(p)) return null;
    var cur = p.versions.filter(function (x) { return x.status === "In force"; })[0];
    return cur ? p.versions[0].label + ": " + STAGE_STATUS[p.stage].toLowerCase() : null;
  }
  function polCurrent(p) { return p.versions.filter(function (x) { return x.status === "In force"; })[0] || p.versions[0]; }
  function actorsFor(p) { return APP.persona(p.ownerId) ? [p.ownerId] : ["compliance"]; }

  function PoliciesScreen(props) {
    var route = APP.useRoute();
    var g = usePolicies();
    var s = APP.useStore();
    var tab = useState("register"), open = useState(null), cmp = useState("POL-GH"), newOpen = useState(false), showOld = useState(false);
    useEffect(function () {
      if (props.params.tab) tab[1](props.params.tab);
      if (props.params.id) { open[1](props.params.id); if (!props.params.tab) tab[1]("register"); }
    }, [route.at]);
    var pol = open[0] ? byId(g.list, open[0]) : null;
    var findings = LP.alignment;
    var findOver = g.v.findings || {};
    var openFindings = findings.filter(function (f) {
      var st = (findOver[f.id] || {}).status || f.status;
      var rv = latestReview(s.reviews, f.id, "Policy alignment");
      return !rv && (st === "Open");
    }).length;
    var dueSoon = LP.reviewSchedule.filter(function (r) { return r.status !== "Done" && fmt.daysUntil(r.due) <= 60; }).length;

    var rows = [];
    g.list.forEach(function (p) {
      if (!showOld[0]) { if (p.stage === 6) return; var cv = polCurrent(p); rows.push(Object.assign({ key: p.id, p: p, ver: cv, status: polStatus(p) }, {})); return; }
      p.versions.forEach(function (ver) { rows.push({ key: p.id + "-" + ver.v, p: p, ver: ver, status: p.stage === 6 ? "Repealed" : ver.status }); });
    });
    rows = rows.map(function (r) { return Object.assign(r, { id: r.key, title: r.p.title, hierarchy: r.p.hierarchy, area: r.p.area, dept: r.p.dept }); });
    var columns = [
      { title: "Number", key: "no", render: function (_, r) { return html`<span className="mono nowrap">${r.p.no}</span>`; } },
      { title: "Policy", key: "title", render: function (_, r) { return html`<div style=${{ minWidth: 200 }}><div style=${{ fontWeight: 500 }}>${r.p.title}</div><${Muted} style=${{ fontSize: 12 }}>${r.p.hierarchy}<//></div>`; } },
      APP.col.text("Business area", "area"),
      APP.col.text("Responsible", "dept"),
      { title: "Approved by", key: "ap", render: function (_, r) { return r.p.approver; } },
      { title: "Version", key: "v", render: function (_, r) { return html`<span className="nowrap">${r.ver.label}</span>`; } },
      { title: "Effective", key: "eff", render: function (_, r) { return html`<span className="nowrap">${r.ver.effective ? fmt.date(r.ver.effective) + (r.ver.until ? " to " + fmt.date(r.ver.until) : "") : "Not yet"}</span>`; } },
      { title: "Status", dataIndex: "status", key: "status", render: function (v, r) { var dn = !showOld[0] ? draftNote(r.p) : null; return html`<div><${APP.StatusTag} status=${v} />${dn ? html`<div style=${{ fontSize: 12, marginTop: 4, opacity: 0.75 }} className="nowrap">${dn}</div>` : null}</div>`; } },
      { title: "Next review", key: "nr", render: function (_, r) { return r.p.nextReview && r.status === "In force" ? html`<div className="nowrap">${fmt.date(r.p.nextReview)}${fmt.daysUntil(r.p.nextReview) <= 60 ? html`<div><${APP.StatusTag} status=${fmt.dueStatus(r.p.nextReview)}>${fmt.dueLabel(r.p.nextReview)}<//></div>` : null}</div>` : html`<${Muted}>None<//>`; } }
    ];
    var askPolicy = function () { if (pid() === "legal") APP.navigate("assistant", { conversationId: "CONV-104" }); else APP.navigate("assistant", { new: true }); };

    return html`<div>
      <${APP.PageHeader} title="Policies" phase=${2} sow=${["3.3.1", "3.3.2", "3.3.3", "3.3.4", "3.3.5"]}
        subtitle="Headquarters and company policies in one register, with clause-by-clause comparison, headquarters alignment checks and the approval lifecycle from drafting to repeal."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${ico("MessageOutlined")} onClick=${askPolicy}>Ask a policy question<//>
          <${A.Button} type="primary" icon=${ico("PlusOutlined")} onClick=${function () { newOpen[1](true); }}>New policy draft<//>
        <//>`} />
      <${StatRow} items=${[
        { title: "In force", value: g.list.filter(function (p) { return polStatus(p) === "In force"; }).length, icon: "SafetyCertificateOutlined", note: "Current versions shown by default", onClick: function () { tab[1]("register"); } },
        { title: "Drafts in progress", value: g.list.filter(inProgress).length, icon: "EditOutlined", note: "Drafting to issue" },
        { title: "Reviews due in 60 days", value: dueSoon, icon: "ScheduleOutlined", warn: dueSoon > 0, note: "Periodic and change-triggered", onClick: function () { tab[1]("reviews"); } },
        { title: "Open alignment findings", value: openFindings, icon: "ApartmentOutlined", warn: openFindings > 0, note: "Against headquarters policies", onClick: function () { tab[1]("align"); } }
      ]} />
      <${A.Card} styles=${{ body: { paddingTop: 4 } }}>
        <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
          { key: "register", label: "Register", children: html`<${APP.DataTable} columns=${columns} data=${rows} rowKey="key" searchPlaceholder="Search title, number, department"
              searchKeys=${["p.title", "p.no", "p.dept", "p.area", "p.scope"]} pageSize=${10}
              filters=${[{ key: "hierarchy", label: "Hierarchy" }, { key: "area", label: "Business area" }, { key: "status", label: "Status" }]}
              onRowClick=${function (r) { open[1](r.p.id); }}
              toolbar=${html`<span style=${{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}><${A.Switch} size="small" checked=${showOld[0]} onChange=${showOld[1]} />Show superseded and repealed</span>`} />` },
          { key: "compare", label: "Compare versions", children: html`<${ComparePanel} policyId=${cmp[0]} setPolicy=${cmp[1]} list=${g.list} openPolicy=${function (id) { open[1](id); }} />` },
          { key: "align", label: "Headquarters alignment", children: html`<${AlignmentPanel} g=${g} openPolicy=${function (id) { open[1](id); }} />` },
          { key: "reviews", label: "Reviews and reminders", children: html`<${ReviewsPanel} g=${g} openPolicy=${function (id) { open[1](id); }} />` }
        ]} />
      <//>
      <${PolicyDrawer} p=${pol} g=${g} onClose=${function () { open[1](null); }} onCompare=${function (id) { open[1](null); cmp[1](id); tab[1]("compare"); }} />
      <${NewPolicyDrawer} g=${g} open=${newOpen[0]} onClose=${function () { newOpen[1](false); }} onCreated=${function (id) { newOpen[1](false); open[1](id); }} />
    </div>`;
  }

  function PolicyDrawer(props) {
    var p = props.p, g = props.g;
    var s = APP.useStore();
    var tok = A.theme.useToken().token;
    var tab = useState("overview"), viewDoc = useState(null), decisionRef = useState("MC-2026-11");
    var narrow = APP.useViewport().width < 720;
    useEffect(function () { tab[1]("overview"); }, [p && p.id]);
    if (!p) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var status = polStatus(p);
    var cur = polCurrent(p);
    var review = p.reviewId ? byId(s.reviews, p.reviewId) : (latestReview(s.reviews, p.id, "Policy draft"));
    var parent = p.parent ? (byId(LP.policies, p.parent) || byId(D.knowledge, p.parent)) : null;
    var actors = actorsFor(p);
    var setOver = function (patch) { g.set(function (prev) { var o = Object.assign({}, prev.over || {}); o[p.id] = Object.assign({}, o[p.id] || {}, patch); return { over: o }; }); };
    var addLog = function (stage, text) {
      g.set(function (prev) { var l = Object.assign({}, prev.log || {}); l[p.id] = (l[p.id] || []).concat([{ at: APP.nowIso(), stage: stage, by: pid(), text: text, live: true }]); return { log: l }; });
    };
    var advance = function (to, text) {
      setOver({ stage: to });
      addLog(STAGES[to], text);
      APP.audit({ action: "Policy " + STAGES[to].toLowerCase(), item: p.id, detail: p.title + ": " + text, dataClass: "Internal" });
    };
    var draftVer = p.versions[0];

    var actionsFor = function () {
      if (p.hq) return html`<${Muted}>Headquarters policies are received, not approved locally. Company policies are checked against them in Headquarters alignment.<//>`;
      if (p.stage === 0) return html`<${A.Flex} vertical gap=${8}>
        <${A.Alert} type="warning" showIcon message="Completeness check found 2 gaps" title="Completeness check found 2 gaps" description="Approval authority for exceptions is missing. The execution procedure is incomplete (§3.3.2)." />
        <${A.Flex} gap=${8} wrap>
          <${A.Button} onClick=${function () { APP.toast.build("In the build, the assistant proposes wording for each gap, citing the template and higher-level policies."); }}>Suggest wording for gaps<//>
          <${A.Button} type="primary" onClick=${gate(actors, "Starting consultation", function () { advance(1, "Consultation opened with IT, Legal, Compliance and HR. Closes in 14 days."); APP.toast.success("Consultation opened. Departments are notified."); })}>Start consultation<//>
        <//>
      <//>`;
      if (p.stage === 1) return html`<${A.Flex} vertical gap=${8}>
        ${p.consultation ? html`<div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="dept" dataSource=${p.consultation} columns=${[
          { title: "Department", dataIndex: "dept", key: "d" },
          { title: "Response", dataIndex: "status", key: "s", render: function (v) { return html`<${APP.StatusTag} status=${v === "Responded" ? "Done" : "Waiting"}>${v}<//>`; } },
          { title: "", key: "a", render: function (_, r) { return r.status === "Waiting" ? html`<${A.Button} size="small" onClick=${function () { APP.toast.success("Reminder sent to " + r.dept + ". In the build it goes in-app and by email (A21)."); }}>Remind<//>` : null; } }
        ]} /></div>` : null}
        ${review ? html`<${Muted}>${"Specialist review " + review.id + " is running in parallel: " + review.status + "."}<//>` : null}
        <div><${A.Button} type="primary" onClick=${gate(actors, "Closing consultation", function () { advance(2, "Consultation closed. Finance and Commercial did not respond. Comments added to the draft."); APP.toast.success("Consultation closed. The draft moves to review."); })}>Close consultation<//></div>
      <//>`;
      if (p.stage === 2) {
        if (!review) return html`<div><${A.Button} type="primary" onClick=${gate(actors, "Sending for review", function () {
          var rv = APP.createReview({ title: "Policy draft: " + p.title + " " + draftVer.label, kind: "Policy draft", reviewerId: "reviewer", ref: p.id, dataClass: "Internal", modelName: "DeepSeek on Bedrock", phase: 2,
            source: { route: "policies", params: { id: p.id } }, archiveCategory: "Policy", content: { summary: p.title + " " + draftVer.label + ", after consultation.", sections: [] }, citations: [] });
          setOver({ reviewId: rv.id }); addLog("Review", "Sent to Li Wei for specialist review (" + rv.id + ")");
          APP.toast.success("Sent to Li Wei as " + rv.id + ".");
        })}>Send for specialist review<//></div>`;
        if (review.status === "Pending") return html`<${A.Flex} vertical gap=${8}>
          <${Muted}>${"Waiting for " + APP.personName(review.reviewerId) + " to confirm or return " + review.id + "."}<//>
          <div><${A.Button} type="primary" onClick=${function () { props.onClose(); APP.navigate("reviews", { id: review.id }); }}>${pid() === review.reviewerId ? "Review it now" : "Open in Reviews"}<//></div>
        <//>`;
        if (review.status === "Returned") return html`<${A.Flex} vertical gap=${8}>
          <${A.Alert} type="warning" showIcon message=${"Returned by " + APP.personName(review.decidedBy)} title=${"Returned by " + APP.personName(review.decidedBy)} description=${review.comment || "See comments."} />
          <div><${A.Button} onClick=${gate(actors, "Revising the draft", function () { setOver({ reviewId: null }); addLog("Review", "Draft revised after reviewer comments"); APP.toast.info("Draft revised. Send it for review again."); })}>Revise and resend<//></div>
        <//>`;
        return html`<${A.Flex} vertical gap=${8}>
          <${Muted}>${"Confirmed by " + APP.personName(review.decidedBy) + " on " + fmt.dateTime(review.decidedAt) + "."}<//>
          <div><${A.Button} type="primary" onClick=${gate(actors, "Submitting for approval", function () { advance(3, "Submitted to the " + p.approver + " for approval"); APP.notify({ to: ["cosec"], kind: "approval", title: "Policy for approval: " + p.title, body: draftVer.label + " is ready for the " + p.approver + ".", route: "policies", params: { id: p.id }, phase: 2 }); APP.toast.success("Submitted. A. Jayawardena records the " + p.approver + " decision."); })}>Submit for approval<//></div>
        <//>`;
      }
      if (p.stage === 3) return html`<${A.Flex} vertical gap=${8}>
        <${Field} label=${"Decision reference (" + p.approver + ")"}><${A.Input} value=${decisionRef[0]} onChange=${function (e) { decisionRef[1](e.target.value); }} style=${{ maxWidth: 260 }} /><//>
        <div><${A.Button} type="primary" onClick=${gate(["cosec"], "Recording the approval", function () { advance(4, "Approved by the " + p.approver + ", decision " + decisionRef[0] + ". Ready to issue."); setOver({ approved: true }); APP.toast.success("Approval recorded. The owner can now issue the policy."); })}>Record approval<//></div>
        <${Muted} style=${{ fontSize: 12 }}>In the build, the approval can also come from CICT's existing approval system (A7, A15).<//>
      <//>`;
      if (p.stage === 4 && pendingIssue(p)) return html`<div><${A.Button} type="primary" onClick=${gate(actors, "Issuing the policy", function () {
        var today = APP.nowIso().slice(0, 10);
        var vers = p.versions.map(function (x, i) {
          if (i === 0) return Object.assign({}, x, { status: "In force", label: "Version " + x.v, published: today, effective: today, note: "" });
          if (x.status === "In force") return Object.assign({}, x, { status: "Superseded", until: today });
          return x;
        });
        setOver({ versions: vers, issued: true, currentVersion: draftVer.v });
        addLog("Issue", "Issued as version " + draftVer.v + ". Previous version superseded today.");
        APP.audit({ action: "Policy issued", item: p.id, detail: p.title + " version " + draftVer.v, dataClass: "Internal" });
        APP.notify({ to: ["legal", "owner", "reviewer", "compliance", "cosec", "admin", "auditor"].filter(function (x) { return x !== pid(); }), kind: "info", title: "Policy issued: " + p.title + " v" + draftVer.v, body: "Please read and acknowledge it.", route: "policies", params: { id: p.id }, phase: 2 });
        APP.toast.success("Issued. Staff are asked to read and acknowledge it. Searches now return version " + draftVer.v + " by default.");
      })}>Issue policy<//></div>`;
      if (p.stage === 4) return html`<${A.Flex} gap=${8} wrap>
        <${A.Button} onClick=${function () { APP.toast.build("In the build, starts a new draft from the current text with tracked changes, and the lifecycle begins again."); }}>Start a revision<//>
        <${A.Popconfirm} title="Repeal this policy?" description="It stays in the register with its history, marked Repealed." okText="Repeal" cancelText="Cancel"
          onConfirm=${gate(actors, "Repealing the policy", function () { var today = APP.nowIso().slice(0, 10); setOver({ stage: 6, versions: p.versions.map(function (x) { return x.status === "In force" ? Object.assign({}, x, { status: "Repealed", until: today }) : x; }) }); addLog("Repeal", "Repealed with effect from today"); APP.audit({ action: "Policy repealed", item: p.id, detail: p.title, dataClass: "Internal" }); APP.toast.success("Repealed. It no longer appears in default searches."); })}>
          <${A.Button} danger>Repeal<//>
        <//>
      <//>`;
      return html`<${Muted}>${"Repealed" + (p.repealedBy ? ", replaced by " + p.repealedBy : "") + ". Kept for reference with its applicable period."}<//>`;
    };

    var stepItems = STAGES.map(function (st, i) {
      var last = p.log.filter(function (l) { return l.stage === st; }).slice(-1)[0];
      var stStatus = i < p.stage ? "finish" : i === p.stage ? ((p.stage === 4 && !pendingIssue(p)) || p.stage === 6 ? "finish" : "process") : "wait";
      if (st === "Revision" && p.stage === 6) stStatus = "wait";
      var desc = last ? APP.personName(last.by) + ", " + fmt.dateShort(last.at) : "";
      if (st === "Review" && review) desc = review.id + ": " + (review.status === "Pending" ? "with " + APP.personName(review.reviewerId) : review.status);
      return { title: st, description: desc, status: stStatus };
    });

    var docId = cur && cur.docId;
    var pacts = html`<${Fragment}>
        ${LP.compare[p.id] ? html`<${A.Button} icon=${ico("DiffOutlined")} onClick=${function () { props.onCompare(p.id); }}>Compare versions<//>` : null}
        <${A.Button} icon=${ico("MessageOutlined")} onClick=${function () { APP.navigate("assistant", pid() === "legal" && p.id === "POL-GH" ? { conversationId: "CONV-104" } : { new: true }); }}>Ask about it<//>
      <//>`;
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${960} title=${p.title}
      subtitle=${p.no + " · " + p.hierarchy + " · " + p.dept}
      tags=${html`<${Fragment}><${APP.StatusTag} status=${status} />${draftNote(p) ? html`<${A.Tag} color="processing" style=${{ marginInlineEnd: 0 }}>${draftNote(p)}<//>` : null}${p.hq ? html`<${A.Tag} color="purple" style=${{ marginInlineEnd: 0 }}>Headquarters<//>` : null}<//>`}
      actions=${narrow ? null : pacts}>
      ${narrow ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>${pacts}</div>` : null}
      <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
        { key: "overview", label: "Overview", children: html`<div>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
            ["Number", html`<span className="mono">${p.no}</span>`], ["Hierarchy", p.hierarchy], ["Business area", p.area], ["Responsible", p.dept],
            ["Owner", APP.persona(p.ownerId) ? html`<${APP.PersonTag} id=${p.ownerId} />` : APP.personName(p.ownerId)], ["Approved by", p.approver],
            ["Current version", cur ? cur.label : "None"], ["Published", cur && cur.published ? fmt.date(cur.published) : "Not yet"],
            ["Effective", cur && cur.effective ? fmt.date(cur.effective) : "Not yet"], ["Next review", p.nextReview ? fmt.date(p.nextReview) : "None set"],
            ["Higher-level policy", parent ? html`<a onClick=${function () { if (byId(LP.policies, p.parent)) APP.navigate("policies", { id: p.parent }); else APP.navigate("knowledge", { id: p.parent }); }}>${parent.title}</a>` : "None"],
            ["Repealed by", p.repealedBy || "None"], { label: "Scope", children: p.scope, span: 2 }
          ]} />
          ${p.acks ? html`<div style=${{ marginTop: 16 }}><div style=${{ fontWeight: 600, marginBottom: 4 }}>Read and acknowledged</div>
            <${A.Progress} percent=${Math.round(p.acks.done / p.acks.of * 100)} format=${function () { return p.acks.done + " of " + p.acks.of; }} />
            <${A.Button} size="small" onClick=${function () { APP.toast.success("Reminder sent to " + (p.acks.of - p.acks.done) + " staff who have not acknowledged it."); }}>Remind the rest<//>
          </div>` : null}
          <div style=${{ fontWeight: 600, margin: "16px 0 8px" }}>${"Text, " + (cur ? cur.label : "")}</div>
          ${docId ? html`<${APP.DocViewer} doc=${docId} height=${380} showHeader=${false} />` : html`<${APP.EmptyHint} title="Text not included in this sample" description="In the build, every version keeps its full text and supporting documents." />`}
        </div>` },
        { key: "life", label: "Lifecycle", children: html`<div>
          <div className="table-scroll" style=${{ paddingBottom: 6 }}><div style=${{ minWidth: 760 }}><${A.Steps} size="small" titlePlacement="vertical" items=${stepItems} /></div></div>
          ${!p.hq && p.stage <= 4 ? html`<${A.Card} size="small" title="Next step" style=${{ margin: "16px 0" }} extra=${html`<${APP.SowRef} sec="3.3.4" />`}>${actionsFor()}<//>`
            : html`<div style=${{ margin: "16px 0" }}>${actionsFor()}</div>`}
          <div style=${{ fontWeight: 600, marginBottom: 8 }}>Handlers, times and comments</div>
          <${A.Timeline} items=${p.log.slice().reverse().map(function (l, i) {
            var b = html`<div><div style=${{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><${A.Tag} style=${{ marginInlineEnd: 0 }}>${l.stage}<//><b>${APP.personName(l.by)}</b><${Muted} style=${{ fontSize: 12 }}>${fmt.dateTime(l.at)}<//>${l.live ? html`<${A.Tag} color="blue" style=${{ marginInlineEnd: 0 }}>Now<//>` : null}</div><div>${l.text}</div></div>`;
            return { key: String(i), color: l.live ? "blue" : "gray", children: b, content: b };
          })} />
        </div>` },
        { key: "versions", label: "Versions", children: html`<div>
          <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="v" dataSource=${p.versions} columns=${[
            { title: "Version", dataIndex: "label", key: "l" },
            { title: "Status", dataIndex: "status", key: "s", render: function (v) { return html`<${APP.StatusTag} status=${v} />`; } },
            { title: "Published", dataIndex: "published", key: "p", render: function (v) { return v ? fmt.date(v) : "Not yet"; } },
            { title: "Applies", key: "a", render: function (_, r) { return r.effective ? html`<span className="nowrap">${fmt.date(r.effective) + " to " + (r.until ? fmt.date(r.until) : "today")}</span>` : "Not yet"; } },
            { title: "Note", dataIndex: "note", key: "n", render: function (v) { return v ? html`<${Muted}>${v}<//>` : null; } },
            { title: "", key: "x", render: function (_, r) { return html`<${A.Button} size="small" onClick=${function () { if (r.docId) viewDoc[1](r.docId); else APP.toast.info("This version's text is not included in the sample."); }}>View text<//>`; } }
          ]} /></div>
          <div style=${{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>Searches and answers use the version in force by default. Older versions show their applicable period (§3.3.4).</div>
          ${LP.compare[p.id] ? html`<${A.Button} style=${{ marginTop: 12 }} icon=${ico("DiffOutlined")} onClick=${function () { props.onCompare(p.id); }}>Compare the last two versions<//>` : null}
        </div>` },
        { key: "align", label: "Alignment", children: html`<div>
          ${LP.alignment.filter(function (f) { return f.policyId === p.id; }).length ? LP.alignment.filter(function (f) { return f.policyId === p.id; }).map(function (f) {
            return html`<div key=${f.id} style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style=${{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><b>${f.type}</b><${APP.StatusTag} status=${f.severity} /></div>
              <div style=${{ fontSize: 13, marginTop: 4 }}>${f.explain}</div>
            </div>`;
          }) : html`<${APP.EmptyHint} title="No findings for this policy" description="The last alignment check found nothing to change." />`}
        </div>` }
      ]} />
      <${DocDrawer} docId=${viewDoc[0]} onClose=${function () { viewDoc[1](null); }} />
    <//>`;
  }

  /* "Best fit": word-level redline for small edits, sentence-level when most of the clause was rewritten. */
  function diffMode(mode, a, b) {
    if (mode !== "auto") return mode;
    if (!a || !b) return "words";
    var st = APP.diffStats(a, b);
    var words = (a.match(/\S+/g) || []).length + (b.match(/\S+/g) || []).length;
    return (st.added + st.removed) / Math.max(1, words) < 0.35 ? "words" : "sentences";
  }

  function ComparePanel(props) {
    var tok = A.theme.useToken().token;
    var mode = useState("auto"), hide = useState(false);
    var c = LP.compare[props.policyId];
    var p = byId(props.list, props.policyId);
    var from = APP.getDocument(c.from), to = APP.getDocument(c.to);
    var flat = function (doc) { var out = []; doc.pages.forEach(function (pg) { pg.clauses.forEach(function (cl) { out.push(Object.assign({ page: pg.n }, cl)); }); }); return out; };
    var A1 = flat(from), B1 = flat(to);
    var ids = B1.map(function (x) { return x.id; });
    A1.forEach(function (x, i) { if (ids.indexOf(x.id) < 0) { var prev = i > 0 ? ids.indexOf(A1[i - 1].id) : -1; ids.splice(prev + 1, 0, x.id); } });
    ids.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
    var rows = ids.map(function (id) {
      var a = A1.filter(function (x) { return x.id === id; })[0], b = B1.filter(function (x) { return x.id === id; })[0];
      var type = a && b ? (a.text === b.text ? "Unchanged" : "Changed") : b ? "Added" : "Removed";
      return { id: id, a: a, b: b, type: type, basis: c.basis[id] };
    });
    var counts = { Changed: 0, Added: 0, Removed: 0, Unchanged: 0 };
    rows.forEach(function (r) { counts[r.type]++; });
    var shown = rows.filter(function (r) { return !hide[0] || r.type !== "Unchanged"; });
    var typeColor = { Changed: "blue", Added: "green", Removed: "red", Unchanged: "default" };
    var basisCites = rows.filter(function (r) { return r.basis && r.basis.cite; }).map(function (r) { return r.basis.cite; });
    var rv = props.policyId === "POL-GH" ? byId(APP.store.getState().reviews, "REV-0201") : null;
    return html`<div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <${A.Select} value=${props.policyId} onChange=${props.setPolicy} style=${{ minWidth: 220 }} options=${Object.keys(LP.compare).map(function (id) { var x = byId(props.list, id); return { value: id, label: x ? x.title : id }; })} />
        <span style=${{ display: "inline-flex", gap: 6, alignItems: "center" }}><${A.Tag} style=${{ marginInlineEnd: 0 }}>${c.fromLabel}<//>${ico("ArrowRightOutlined")}<${A.Tag} color="blue" style=${{ marginInlineEnd: 0 }}>${p && p.issued ? p.versions[0].label : c.toLabel}<//></span>
        <${A.Segmented} size="small" value=${mode[0]} onChange=${mode[1]} options=${[{ value: "auto", label: "Best fit" }, { value: "words", label: "Words" }, { value: "sentences", label: "Sentences" }]} />
        <span style=${{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}><${A.Switch} size="small" checked=${hide[0]} onChange=${hide[1]} />Hide unchanged</span>
        <div style=${{ flex: 1 }}></div>
        <${A.Button} icon=${ico("FileWordOutlined")} onClick=${function () { APP.toast.build("In the build, exports a comparative revision draft to Word with tracked changes and the basis for each change in a side column (§3.3.2)."); }}>Revision draft<//>
        ${rv ? html`<${A.Button} onClick=${function () { APP.navigate("reviews", { id: rv.id }); }}>${"Specialist review " + rv.id + ": " + rv.status}<//>` : null}
      </div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <${A.Tag} color="blue" style=${{ marginInlineEnd: 0 }}>${counts.Changed + " changed"}<//>
        <${A.Tag} color="green" style=${{ marginInlineEnd: 0 }}>${counts.Added + " added"}<//>
        <${A.Tag} color="red" style=${{ marginInlineEnd: 0 }}>${counts.Removed + " removed"}<//>
        <${A.Tag} style=${{ marginInlineEnd: 0 }}>${counts.Unchanged + " unchanged"}<//>
        <${APP.SowRef} sec="3.3.2" />
      </div>
      <${A.Flex} vertical gap=${10}>
        ${shown.map(function (r) {
          var head = (r.b || r.a).heading;
          var n = r.basis && r.basis.cite ? basisCites.indexOf(r.basis.cite) + 1 : 0;
          return html`<div key=${r.id} style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 12, background: tok.colorBgContainer }}>
            <${A.Row} gutter=${[16, 8]}>
              <${A.Col} xs=${24} md=${15}>
                <div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <a className="mono" onClick=${function () { APP.openSource({ doc: r.b ? c.to : c.from, clause: r.id, page: (r.b || r.a).page }); }}>${"Clause " + r.id}</a>
                  <span style=${{ fontWeight: 500 }}>${head.replace(/^[\d.]+\s*/, "")}</span>
                  <${A.Tag} color=${typeColor[r.type]} style=${{ marginInlineEnd: 0 }}>${r.type}<//>
                </div>
                ${r.type === "Unchanged" ? html`<div style=${{ color: tok.colorTextSecondary }}>${r.b.text}</div>` : html`<${APP.Redline} before=${r.a ? r.a.text : ""} after=${r.b ? r.b.text : ""} mode=${diffMode(mode[0], r.a ? r.a.text : "", r.b ? r.b.text : "")} />`}
              <//>
              <${A.Col} xs=${24} md=${9}>
                ${r.basis ? html`<div style=${{ fontSize: 13, borderLeft: "3px solid " + (r.basis.warn ? tok.colorWarning : tok.colorPrimaryBorder), paddingLeft: 10 }}>
                  <div style=${{ fontSize: 11, textTransform: "uppercase", color: tok.colorTextTertiary, marginBottom: 2 }}>Basis for the change</div>
                  ${r.basis.warn ? html`<${Icon} name="WarningOutlined" style=${{ color: tok.colorWarning, marginRight: 4 }} />` : null}${r.basis.text}${n ? html`<${APP.CitationChip} n=${n} cite=${r.basis.cite} cites=${basisCites} />` : null}
                </div>` : r.type === "Unchanged" ? null : html`<${Muted}>No basis recorded<//>`}
              <//>
            <//>
          </div>`;
        })}
      <//>
      <div style=${{ fontSize: 12, marginTop: 10, color: tok.colorTextSecondary }}>The revision draft is reviewed by the responsible department and authorised staff before it is issued. ${p ? "Owner: " + p.dept + "." : ""}</div>
    </div>`;
  }

  function AlignmentPanel(props) {
    var g = props.g;
    var s = APP.useStore();
    var tok = A.theme.useToken().token;
    var running = useState(false), type = useState(null);
    var over = g.v.findings || {};
    var setF = function (id, patch) { g.set(function (prev) { var o = Object.assign({}, prev.findings || {}); o[id] = Object.assign({}, o[id] || {}, patch); return { findings: o }; }); };
    var quote = function (cite) { var cl = APP.findClause(cite.doc, cite.clause); return cl ? cl.text : ""; };
    var run = function () {
      running[1](true);
      setTimeout(function () { running[1](false); APP.toast.info("Checked 5 company policies against 2 headquarters policies and against each other: 5 findings, no new ones since the last run."); }, 1600);
    };
    var send = function (f) {
      var pol = byId(LP.policies, f.policyId);
      var rv = APP.createReview({
        title: "Policy alignment: " + f.type.toLowerCase() + ", " + pol.title, kind: "Policy alignment", reviewerId: "compliance", ref: f.id, dataClass: "Internal", modelName: "DeepSeek on Bedrock", phase: 2,
        source: { route: "policies", params: { tab: "align" } }, archiveCategory: "Policy finding",
        content: { summary: f.explain, sections: [
          { heading: "Company clause: " + f.company.label, text: quote(f.company.cite) },
          { heading: "Compared with: " + f.other.label, text: quote(f.other.cite) },
          { heading: "Proposed adjustment", text: f.proposal }
        ] },
        citations: [f.company.cite, f.other.cite].concat(f.authority ? [f.authority] : [])
      });
      APP.toast.success("Sent to R. Fernando, Compliance officer, as " + rv.id + " for specialist review (§3.3.3).");
    };
    var list = LP.alignment.filter(function (f) { return !type[0] || f.type === type[0]; });
    if (running[0]) return html`<div style=${{ padding: 16 }}><${A.Skeleton} active paragraph=${{ rows: 10 }} /></div>`;
    return html`<div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <${Muted} style=${{ flex: "1 1 320px" }}>Company policies compared with headquarters policies and with each other, for missing requirements, overlapping responsibilities, conflicting authority, contradictory procedures and inconsistent terms. Last run 10 Nov 2026, 07:10.<//>
        <${A.Select} allowClear placeholder="Finding type" value=${type[0]} onChange=${type[1]} style=${{ minWidth: 200 }} options=${Array.from(new Set(LP.alignment.map(function (f) { return f.type; }))).map(function (t) { return { value: t, label: t }; })} />
        <${A.Button} icon=${ico("SyncOutlined")} onClick=${run}>Run alignment check<//>
      </div>
      <${A.Flex} vertical gap=${12}>
        ${list.map(function (f) {
          var rv = latestReview(s.reviews, f.id, "Policy alignment");
          var st = rv ? (rv.status === "Pending" ? "With Compliance" : rv.status === "Confirmed" ? "Confirmed by Compliance" : "Returned by Compliance") : ((over[f.id] || {}).status || f.status);
          var stTone = st === "Open" ? "warning" : /Confirmed|Accepted|Addressed/.test(st) ? "success" : st === "Dismissed" ? "default" : "processing";
          var cites = [f.company.cite, f.other.cite].concat(f.authority ? [f.authority] : []);
          return html`<${A.Card} key=${f.id} size="small"
            title=${html`<span style=${{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><span className="mono" style=${{ opacity: 0.6 }}>${f.id}</span><span>${f.type}</span><${APP.StatusTag} status=${f.severity} /></span>`}
            extra=${html`<${APP.StatusTag} status=${st} tone=${stTone} />`}>
            <${A.Row} gutter=${[12, 12]}>
              <${A.Col} xs=${24} md=${12}>
                <div style=${{ fontSize: 11, textTransform: "uppercase", color: tok.colorTextTertiary }}>Company policy</div>
                <div style=${{ fontWeight: 500 }}>${f.company.label}<${APP.CitationChip} n=${1} cite=${f.company.cite} cites=${cites} /></div>
                <div style=${{ fontSize: 13, background: tok.colorFillQuaternary, borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>${f.type === "Missing requirement" ? f.company.text : (quote(f.company.cite) || f.company.text)}</div>
              <//>
              <${A.Col} xs=${24} md=${12}>
                <div style=${{ fontSize: 11, textTransform: "uppercase", color: tok.colorTextTertiary }}>${/Headquarters/.test(f.other.label) ? "Headquarters policy" : "Other company policy"}</div>
                <div style=${{ fontWeight: 500 }}>${f.other.label}<${APP.CitationChip} n=${2} cite=${f.other.cite} cites=${cites} /></div>
                <div style=${{ fontSize: 13, background: tok.colorFillQuaternary, borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>${quote(f.other.cite)}</div>
              <//>
            <//>
            <div style=${{ marginTop: 10 }}><b>Difference: </b>${f.explain}</div>
            <div style=${{ marginTop: 4 }}><b>Proposed: </b>${f.proposal}${f.authority ? html`<span> Authority<${APP.CitationChip} n=${3} cite=${f.authority} cites=${cites} /></span>` : null}</div>
            ${f.legalJudgment ? html`<div style=${{ marginTop: 6, fontSize: 12, color: tok.colorWarningText }}><${Icon} name="SafetyOutlined" /> Involves a legal compliance judgment, so it goes to Compliance for specialist review <${APP.SowRef} sec="3.3.3" /></div>` : null}
            ${rv && rv.status !== "Pending" && rv.comment ? html`<div style=${{ marginTop: 6, fontSize: 13 }}><b>${APP.personName(rv.decidedBy) + ": "}</b>${rv.comment}</div>` : null}
            <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              ${f.legalJudgment && !rv ? html`<${A.Button} type="primary" size="small" icon=${ico("SendOutlined")} onClick=${send.bind(null, f)}>Send to Compliance<//>` : null}
              ${rv && rv.status === "Pending" ? html`<${A.Button} size="small" onClick=${function () { APP.navigate("reviews", { id: rv.id }); }}>${pid() === "compliance" ? "Decide it now" : "Open in Reviews"}<//>` : null}
              ${!f.legalJudgment && st === "Open" ? html`<${A.Button} type="primary" size="small" onClick=${function () { setF(f.id, { status: "Accepted" }); APP.audit({ action: "Finding accepted", item: f.id, detail: f.proposal, dataClass: "Internal" }); APP.toast.success("Accepted. A revision task goes to the policy owner."); }}>Accept proposal<//>` : null}
              ${st === "Open" ? html`<${A.Popconfirm} title="Dismiss this finding?" description="The reason is kept in the audit log." okText="Dismiss" onConfirm=${function () { setF(f.id, { status: "Dismissed" }); APP.audit({ action: "Finding dismissed", item: f.id, detail: f.type, dataClass: "Internal" }); APP.toast.info("Dismissed."); }}><${A.Button} size="small">Dismiss<//><//>` : null}
              <${A.Button} size="small" type="link" onClick=${function () { props.openPolicy(f.policyId); }}>Open policy<//>
            </div>
          <//>`;
        })}
      <//>
    </div>`;
  }

  function ReviewsPanel(props) {
    var g = props.g;
    var tok = A.theme.useToken().token;
    var over = APP.useShared("lp.prOver", {});
    var open = useState(null), outcome = useState("");
    var rows = LP.reviewSchedule.map(function (r) { var o = (over[0] || {})[r.id] || {}; var p = byId(g.list, r.policyId); return Object.assign({}, r, o, { title: p ? p.title : r.policyId }); });
    var row = open[0] ? byId(rows, open[0]) : null;
    var setR = function (id, patch) { over[1](function (prev) { var n = Object.assign({}, prev || {}); n[id] = Object.assign({}, n[id] || {}, patch); return n; }); };
    var inForce = g.list.filter(function (p) { return p.acks && polStatus(p) === "In force"; });
    return html`<div>
      <${APP.DataTable} data=${rows} searchPlaceholder="Search reviews" searchKeys=${["title", "trigger", "ownerName"]} filters=${[{ key: "status", label: "Status" }, { key: "cycle", label: "Cycle" }]}
        onRowClick=${function (r) { open[1](r.id); }}
        columns=${[
          APP.col.text("Policy", "title"),
          APP.col.text("Trigger", "trigger"),
          APP.col.text("Cycle", "cycle"),
          { title: "Due", dataIndex: "due", key: "due", render: function (v, r) { return html`<div className="nowrap">${fmt.date(v)}${r.status !== "Done" ? html`<div style=${{ fontSize: 12, opacity: 0.7 }}>${fmt.dueLabel(v)}</div>` : null}</div>`; } },
          APP.col.text("Responsible", "ownerName"),
          APP.col.status("Status", "status"),
          { title: "Outcome", dataIndex: "outcome", key: "o", render: function (v) { return v || html`<${Muted}>Pending<//>`; } }
        ]} />
      <${A.Row} gutter=${[16, 16]} style=${{ marginTop: 16 }}>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Changes that may need a policy update" extra=${html`<${APP.SowRef} sec="3.3.5" />`}>
            <div style=${{ fontSize: 13 }}>
              <div style=${{ marginBottom: 8 }}><b>Draft guidance on cross-border transfer of personal data (REG-1103)</b> may affect <a onClick=${function () { props.openPolicy("POL-AI"); }}>Use of AI tools</a> and <a onClick=${function () { props.openPolicy("POL-IS"); }}>Information security</a>.</div>
              <div style=${{ marginBottom: 8 }}><b>Headquarters anti-bribery policy 2024</b> led to <a onClick=${function () { props.openPolicy("POL-GH"); }}>Gifts and hospitality draft 4</a>.</div>
              <${A.Button} size="small" onClick=${function () { APP.navigate("regulatory", { id: "REG-1103" }); }}>Open REG-1103<//>
            </div>
          <//>
        <//>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Read and acknowledged">
            ${inForce.map(function (p) {
              return html`<div key=${p.id} style=${{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <span style=${{ flex: "0 0 160px", fontSize: 13 }}>${p.title}</span>
                <div style=${{ flex: 1, minWidth: 80 }}><${A.Progress} size="small" percent=${Math.round(p.acks.done / p.acks.of * 100)} /></div>
              </div>`;
            })}
            <${A.Button} size="small" onClick=${function () { APP.toast.success("Reminders sent to staff who have not acknowledged the policies in force."); }}>Send reminders<//>
          <//>
        <//>
      <//>
      <${APP.DetailDrawer} open=${!!row} onClose=${function () { open[1](null); }} title=${row ? "Review: " + row.title : ""} subtitle=${row ? row.trigger : ""} tags=${row ? html`<${APP.StatusTag} status=${row.status} />` : null} size=${560}
        footer=${row && row.status !== "Done" ? html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <${A.Button} onClick=${function () { setR(row.id, { status: "In progress" }); APP.audit({ action: "Verification task sent", item: row.id, detail: row.title + " to " + row.ownerName, dataClass: "Internal" }); APP.toast.success("Verification task sent to " + row.ownerName + "."); }}>Send verification task<//>
          <${A.Button} type="primary" onClick=${function () { setR(row.id, { status: "Done", outcome: outcome[0] || "Reviewed, no change needed" }); APP.audit({ action: "Policy review recorded", item: row.id, detail: outcome[0] || "No change needed", dataClass: "Internal" }); outcome[1](""); open[1](null); APP.toast.success("Outcome recorded."); }}>Record outcome<//>
        </div>` : null}>
        ${row ? html`<div>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Policy", html`<a onClick=${function () { props.openPolicy(row.policyId); }}>${row.title}</a>`], ["Cycle", row.cycle], ["Due", fmt.date(row.due) + " (" + fmt.dueLabel(row.due) + ")"], ["Responsible", row.ownerName], { label: "Trigger", children: row.trigger, span: 2 }, { label: "Outcome", children: row.outcome || "Not recorded", span: 2 }]} />
          ${row.status !== "Done" ? html`<div style=${{ marginTop: 16 }}><${Field} label="Outcome"><${A.Input.TextArea} autoSize=${{ minRows: 2 }} value=${outcome[0]} onChange=${function (e) { outcome[1](e.target.value); }} placeholder="For example: Clause 3.1 updated in draft 3" /><//></div>` : null}
        </div>` : null}
      <//>
    </div>`;
  }

  function NewPolicyDrawer(props) {
    var g = props.g;
    var f = useState({ title: "", area: "Compliance", dept: "Compliance and Risk", template: "Company policy template v2", parent: "POL-HQ-ABP", need: "" });
    var phase = useState("form");
    var v = f[0];
    var set = function (k, x) { var n = Object.assign({}, v); n[k] = x; f[1](n); };
    var check = function () {
      if (!v.title.trim()) { APP.toast.warn("Give the policy a title."); return; }
      phase[1]("checking");
      setTimeout(function () { phase[1]("checked"); }, 1500);
    };
    var add = function () {
      var id = "POL-N" + (1 + (g.v.drafts || []).length);
      var p = { id: id, no: "CMP-NEW-0" + (1 + (g.v.drafts || []).length), title: v.title.trim(), hierarchy: "Company policy", area: v.area, dept: v.dept, ownerId: pid(), approver: "Management Committee",
        scope: v.need || "To be defined", parent: v.parent, currentVersion: null, stage: 0, nextReview: null,
        versions: [{ v: "1", status: "Draft", label: "Draft 1", docId: null, published: null, effective: null, until: null }], acks: null,
        log: [{ at: APP.nowIso(), stage: "Drafting", by: pid(), text: "Draft 1 created from " + v.template }, { at: APP.nowIso(), stage: "Drafting", by: "system", text: "Completeness check: approval authority missing; responsibilities, procedure and records present." }], live: true };
      g.set(function (prev) { return { drafts: [p].concat(prev.drafts || []) }; });
      APP.audit({ action: "Policy drafting", item: id, detail: p.title + " draft 1", dataClass: "Internal" });
      APP.toast.success(p.title + " added to the register as Draft 1.");
      phase[1]("form"); f[1](Object.assign({}, v, { title: "", need: "" }));
      props.onCreated(id);
    };
    var parentOpts = LP.policies.filter(function (p) { return p.stage !== 6; }).map(function (p) { return { value: p.id, label: p.title + " (" + p.hierarchy.toLowerCase() + ")" }; });
    return html`<${APP.DetailDrawer} open=${props.open} onClose=${function () { phase[1]("form"); props.onClose(); }} title="New policy draft" subtitle="Drafted from an approved template, higher-level policies and the business need (§3.3.2)" size=${600}
      footer=${html`<div style=${{ display: "flex", gap: 8, justifyContent: "flex-end" }}><${A.Button} onClick=${props.onClose}>Cancel<//>${phase[0] === "checked" ? html`<${A.Button} type="primary" onClick=${add}>Add to register as draft<//>` : html`<${A.Button} type="primary" loading=${phase[0] === "checking"} onClick=${check}>Draft and check<//>`}</div>`}>
      <${Field} label="Title"><${A.Input} value=${v.title} onChange=${function (e) { set("title", e.target.value); }} placeholder="For example: Conflicts of interest" /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Business area"><${A.Select} style=${{ width: "100%" }} value=${v.area} onChange=${function (x) { set("area", x); }} options=${["Compliance", "Procurement", "Governance", "IT", "HR", "Records"].map(function (x) { return { value: x, label: x }; })} /><//><//>
        <${A.Col} xs=${24} sm=${12}><${Field} label="Template"><${A.Select} style=${{ width: "100%" }} value=${v.template} onChange=${function (x) { set("template", x); }} options=${["Company policy template v2", "Procedure template v1"].map(function (x) { return { value: x, label: x }; })} /><//><//>
      <//>
      <${Field} label="Higher-level policy"><${A.Select} style=${{ width: "100%" }} value=${v.parent} onChange=${function (x) { set("parent", x); }} options=${parentOpts} /><//>
      <${Field} label="Business need"><${A.Input.TextArea} autoSize=${{ minRows: 3 }} value=${v.need} onChange=${function (e) { set("need", e.target.value); }} placeholder="What should the policy achieve, and for whom?" /><//>
      ${phase[0] === "checking" ? html`<${APP.TypingIndicator} label="Drafting from the template and checking completeness" />` : null}
      ${phase[0] === "checked" ? html`<${A.Card} size="small" title="Completeness check (draft)">
        <${A.Flex} vertical gap=${6}>
          <span><${APP.StatusTag} status="Passed" /> Responsibilities</span>
          <span><${APP.StatusTag} status="Missing">Missing<//> Approval authority</span>
          <span><${APP.StatusTag} status="Passed" /> Execution procedure</span>
          <span><${APP.StatusTag} status="Passed" /> Records and retention</span>
        <//>
        <div style=${{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>The draft is reviewed by the responsible department and authorised staff before it is issued.</div>
      <//>` : null}
    <//>`;
  }

  APP.registerScreen("policies", {
    title: "Policies", group: "p2", phase: 2, icon: "ProfileOutlined", sow: ["3.3"],
    summary: "Policy register, redline compare, headquarters alignment and approval workflow.",
    render: PoliciesScreen
  });

  /* ------------------------------------------------------------------
     Global search
     ------------------------------------------------------------------ */
  APP.registerSearch({ group: "Legal affairs", items: function (s) {
    return LP.cases.concat((s.ext["lp.cases"] || [])).map(function (c) { return { id: c.id, title: c.id + " " + c.title, subtitle: c.counterparty + " · " + c.stage, route: "legal", params: { id: c.id }, phase: 2, icon: "BankOutlined" }; });
  } });
  APP.registerSearch({ group: "Policies", items: function () {
    return LP.policies.map(function (p) { return { id: p.id, title: p.title + " (" + p.no + ")", subtitle: p.hierarchy + " · " + p.dept, route: "policies", params: { id: p.id }, phase: 2, icon: "ProfileOutlined" }; });
  } });
  APP.registerSearch({ group: "Regulatory updates", items: function () {
    return R.updates.map(function (u) { return { id: u.id, title: u.title, subtitle: u.id + " · " + u.relevance + " relevance", route: "regulatory", params: { id: u.id }, phase: 2, icon: "AlertOutlined" }; });
  } });
  APP.registerSearch({ group: "Translation", items: function () {
    return T.jobs.map(function (j) { return { id: j.id, title: j.id + " " + j.title, subtitle: j.pair, route: "translation", params: { tab: "jobs" }, phase: 2, icon: "TranslationOutlined" }; })
      .concat(T.termbase.map(function (t) { return { id: t.id, title: t.zh + " = " + t.en, subtitle: "Termbase · " + t.domain, route: "translation", params: { tab: "termbase" }, phase: 2, icon: "BookOutlined" }; }));
  } });
})();
