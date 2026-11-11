/* Screen area: compliance-board. Routes: compliance (Compliance and risk), screening (Sanctions screening), board (Board affairs).
   All Phase 2. Mock data lives in app/data/compliance-board.js (APP_DATA.complianceBoard). Shared, cross-role state lives in
   the store under ext keys "cb.*" so decisions made by one persona show up for another. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, Icon = APP.Icon, fmt = APP.fmt, dayjs = APP.dayjs;
  var useState = APP.useState, useEffect = APP.useEffect, useMemo = APP.useMemo, useRef = APP.useRef, Fragment = APP.Fragment;
  var CB = D.complianceBoard;
  if (!CB) { console.error("[compliance-board] data file missing"); return; }

  CB.documents.forEach(function (d) { APP.registerDocument(d); });

  /* ==================================================================
     Shared helpers
     ================================================================== */
  var SEEDS = {
    alerts: CB.alerts, rules: CB.rules, runs: CB.runs, checks: CB.checks, controls: CB.controls, remediation: CB.remediation,
    authority: CB.authority, screening: CB.screening, agenda: CB.agenda, pack: CB.pack, meetings: CB.meetings
  };
  function findIn(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function colNow(name) { var v = APP.store.getState().ext["cb." + name]; return v || SEEDS[name]; }
  function updateIn(name, id, patch) {
    APP.actions.patch("cb." + name, function (prev) {
      return (prev || SEEDS[name]).map(function (x) { return x.id === id ? Object.assign({}, x, typeof patch === "function" ? patch(x) : patch) : x; });
    });
  }
  function addTo(name, item, atEnd) {
    APP.actions.patch("cb." + name, function (prev) { var l = prev || SEEDS[name]; return atEnd ? l.concat([item]) : [item].concat(l); });
  }
  function useCol(name) {
    var v = APP.useStore(function (s) { return s.ext["cb." + name]; });
    var list = v || SEEDS[name];
    return {
      list: list,
      get: function (id) { return findIn(list, id); },
      update: function (id, patch) { updateIn(name, id, patch); },
      add: function (item, atEnd) { addTo(name, item, atEnd); },
      set: function (l) { APP.actions.patch("cb." + name, l); }
    };
  }
  function nextNum(list, prefix, pad) {
    var max = 0;
    list.forEach(function (x) { if (String(x.id).indexOf(prefix) === 0) { var n = parseInt(String(x.id).slice(prefix.length), 10); if (n > max) max = n; } });
    return prefix + String(max + 1).padStart(pad, "0");
  }
  function roleOf(id) { var p = APP.persona(id); return p ? p.role : id; }
  function switchTo(id) { APP.setPersona(id); APP.toast.info("You are now " + APP.personName(id) + ", " + roleOf(id) + "."); }
  function useMe() { return APP.usePersona().personaId; }

  var TONES = {
    "New": "processing", "In review": "processing", "Escalated": "warning", "Closed: no issue": "success", "Closed: issue confirmed": "error",
    "Results to confirm": "warning", "Running": "processing", "Confirmed": "success", "Planned": "default", "In progress": "processing", "Completed": "success",
    "Open": "processing", "Evidence submitted": "warning", "Closed": "success", "Overdue": "error",
    "Possible match": "warning", "Need more info": "warning", "True match": "error", "Cleared": "success", "No match": "success", "False positive": "success",
    "Submitted": "processing", "Resubmitted": "processing", "Returned": "warning", "Checked": "processing", "Accepted": "success",
    "Preparing": "processing", "Scheduled": "default", "Minutes in draft": "warning", "Minutes approved": "success",
    "Passed": "success", "Gap": "error", "Can't be assessed": "warning", "Missing": "error", "Add": "warning", "Alert": "error",
    "Effective": "success", "Partially effective": "warning", "Not effective": "error", "Breach confirmed": "error", "Explained": "success",
    "Received": "success", "Outstanding": "warning", "Not requested": "default", "Requested": "processing", "Pass": "success", "Exception": "error", "Waiting": "processing",
    "Ready": "success", "Draft": "default", "Published": "success", "Not published": "default", "Live": "success", "Waiting for Company approval": "warning",
    "Check needed": "warning", "Not controlled": "success", "Completed with warnings": "warning", "Active": "success", "Off": "default"
  };
  function St(props) { return html`<${APP.StatusTag} status=${props.status} tone=${TONES[props.status] || APP.statusTone(props.status)} />`; }
  function SevTag(props) {
    var s = props.sev;
    return html`<${A.Tag} color=${s === "High" ? "red" : s === "Medium" ? "orange" : "blue"} style=${{ marginInlineEnd: 0 }}>${s}<//>`;
  }
  var SEV_RANK = { High: 3, Medium: 2, Low: 1 };
  var DCOL = { xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 };

  function Note(props) {
    return html`<${A.Alert} type=${props.type || "info"} showIcon=${true} message=${props.title} title=${props.title}
      description=${props.children || props.description} action=${props.action}
      style=${Object.assign({ marginBottom: 12 }, props.style || {})} />`;
  }

  /* Button that only some personas may use. Others see it disabled with the reason. */
  function ActBtn(props) {
    var me = useMe();
    var roles = props.roles || [];
    var ok = !roles.length || roles.indexOf(me) >= 0;
    var rest = Object.assign({}, props); delete rest.roles; delete rest.children; delete rest.why;
    if (ok) return html`<${A.Button} ...${rest}>${props.children}<//>`;
    var who = roles.map(roleOf).join(" or ");
    rest.onClick = undefined; rest.disabled = true;
    return html`<${A.Tooltip} title=${props.why || "Only the " + who + " can do this. Switch role from the avatar menu."}>
      <span style=${{ display: "inline-block" }}><${A.Button} ...${rest}>${props.children}<//></span>
    <//>`;
  }

  function Stat(props) {
    var tok = A.theme.useToken().token;
    return html`<${A.Card} size="small" hoverable=${!!props.onClick} onClick=${props.onClick} style=${{ height: "100%", cursor: props.onClick ? "pointer" : "default" }}>
      <${A.Statistic} title=${props.title} value=${props.value} suffix=${props.suffix}
        prefix=${props.icon ? html`<${Icon} name=${props.icon} style=${{ color: props.color ? tok[props.color] : tok.colorTextSecondary }} />` : null} />
      ${props.note ? html`<div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 4 }}>${props.note}</div>` : null}
    <//>`;
  }

  function Field(props) {
    var tok = A.theme.useToken().token;
    return html`<div style=${{ marginBottom: 14 }}>
      <div style=${{ fontWeight: 500, marginBottom: 6 }}>${props.label}${props.required ? html`<span style=${{ color: tok.colorError }}> *</span>` : null}</div>
      ${props.children}
      ${props.error ? html`<div style=${{ fontSize: 12, color: tok.colorError, marginTop: 4 }}>${props.error}</div>` : null}
      ${props.help ? html`<div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 4 }}>${props.help}</div>` : null}
    </div>`;
  }

  function Events(props) {
    var tok = A.theme.useToken().token;
    var items = (props.items || []).map(function (e, i) {
      var c = html`<div>
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${fmt.dateTime(e.at) + " · " + APP.personName(e.actorId) + (e.kind ? " · " + e.kind : "")}</div>
        <div>${e.text}</div>
      </div>`;
      var color = e.kind === "decision" ? "green" : e.kind === "status" ? "blue" : e.actorId === "system" ? "gray" : "blue";
      return { key: String(i), color: color, children: c, content: c };
    });
    if (!items.length) return html`<${APP.EmptyHint} title="No history yet" />`;
    return html`<${A.Timeline} items=${props.reverse ? items.slice().reverse() : items} style=${{ marginTop: 8 }} />`;
  }

  function SectionTitle(props) {
    var tok = A.theme.useToken().token;
    return html`<div style=${{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: props.first ? "0 0 8px" : "18px 0 8px" }}>
      <span style=${{ fontWeight: 600, fontSize: 15, color: tok.colorText }}>${props.children}</span>${props.extra || null}
    </div>`;
  }

  function FileAdder(props) {
    var me = useMe();
    if (props.roles && props.roles.indexOf(me) < 0) return html`<${ActBtn} roles=${props.roles} icon=${html`<${Icon} name="PaperClipOutlined" />`}>${props.label || "Add evidence"}<//>`;
    return html`<${A.Dropdown} trigger=${["click"]} menu=${{
      items: [{ type: "group", label: "Sample files", children: props.files.map(function (f) { return { key: f, label: f, icon: html`<${Icon} name="FileAddOutlined" />` }; }) }],
      onClick: function (info) { props.onAdd(info.key); }
    }}><${A.Button} icon=${html`<${Icon} name="PaperClipOutlined" />`}>${props.label || "Add evidence"}<//><//>`;
  }

  function ReadOnlyNote() {
    var me = useMe();
    if (me !== "auditor") return null;
    return html`<${Note} type="info" title="Read only for the Auditor">You can open every alert, decision and record here. Changes are made by the Compliance officer, and every change is in the audit log.<//>`;
  }

  var DEPT_OWNER = { Finance: "H. Kumara", Procurement: "D. Fonseka", Engineering: "T. Bandara", Legal: "N. Perera", Commercial: "S. Silva", HR: "C. de Mel", Facilities: "Facilities manager (sample)" };
  var DEPT_PERSONA = { Legal: "legal", Commercial: "owner" };
  function remStatus(r) { return r.status !== "Closed" && fmt.daysUntil(r.due) < 0 ? "Overdue" : r.status; }
  function DueText(props) {
    var tok = A.theme.useToken().token;
    var n = fmt.daysUntil(props.date);
    var color = props.done ? tok.colorTextSecondary : n < 0 ? tok.colorError : n <= 14 ? tok.colorWarningText : tok.colorText;
    return html`<span className="nowrap" style=${{ color: color }}>${fmt.date(props.date)}${props.done ? "" : html`<span style=${{ fontSize: 12, marginLeft: 6, opacity: 0.85 }}>${fmt.dueLabel(props.date)}</span>`}</span>`;
  }

  /* ==================================================================
     COMPLIANCE AND RISK (route: compliance)
     ================================================================== */
  var KIND_OF = [[/^ANM-/, "alert"], [/^CHK-/, "check"], [/^CT-/, "control"], [/^RM-/, "rem"], [/^KPA-/, "kpa"], [/^RUL-/, "rule"], [/^RUN-/, "run"]];
  var TAB_OF = { alert: "alerts", rule: "alerts", run: "alerts", check: "checks", control: "controls", rem: "remediation", kpa: "authority" };
  function kindOf(id) { for (var i = 0; i < KIND_OF.length; i++) if (KIND_OF[i][0].test(id)) return KIND_OF[i][1]; return null; }
  function nextCase(alerts) {
    var max = 34;
    alerts.forEach(function (a) { if (a.caseId) { var n = parseInt(a.caseId.split("-")[2], 10); if (n > max) max = n; } });
    return "CC-2026-" + String(max + 1).padStart(3, "0");
  }

  function useComplianceCols() {
    return { alerts: useCol("alerts"), rules: useCol("rules"), runs: useCol("runs"), checks: useCol("checks"), controls: useCol("controls"), rem: useCol("remediation"), kpa: useCol("authority") };
  }

  function ComplianceScreen(props) {
    var route = APP.useRoute();
    var C = useComplianceCols();
    var tabP = APP.useShared("cb.ui.complianceTab", "alerts");
    var openS = useState(null);
    var runOpen = useState(false);
    var params = props.params || {};
    function openItem(kind, id) { if (TAB_OF[kind]) tabP[1](TAB_OF[kind]); openS[1]({ kind: kind, id: id }); }
    useEffect(function () {
      if (params.tab) tabP[1](params.tab);
      if (params.id) { var k = kindOf(params.id); if (k) openItem(k, params.id); }
    }, [params.id, params.tab, route.at]);

    var openAlerts = C.alerts.list.filter(function (a) { return !/^Closed/.test(a.status); });
    var high = openAlerts.filter(function (a) { return a.severity === "High"; }).length;
    var value = openAlerts.reduce(function (s, a) { return s + (a.difference || 0); }, 0);
    var overdue = C.rem.list.filter(function (r) { return remStatus(r) === "Overdue"; }).length;
    var toReview = C.rem.list.filter(function (r) { return r.status === "Evidence submitted"; }).length;
    var o = openS[0];
    var close = function () { openS[1](null); };
    var dp = { cols: C, onClose: close, onOpen: openItem };

    var tabs = [
      { key: "alerts", label: html`<span>Anomaly alerts <${A.Badge} count=${openAlerts.length} size="small" style=${{ marginLeft: 4 }} /></span>`, children: html`<${AlertsTab} cols=${C} onOpen=${openItem} />` },
      { key: "checks", label: "Compliance checks", children: html`<${ChecksTab} cols=${C} onOpen=${openItem} />` },
      { key: "controls", label: "Control tests", children: html`<${ControlsTab} cols=${C} onOpen=${openItem} />` },
      { key: "remediation", label: html`<span>Remediation ${overdue ? html`<${A.Badge} count=${overdue} size="small" style=${{ marginLeft: 4 }} />` : null}</span>`, children: html`<${RemediationTab} cols=${C} onOpen=${openItem} />` },
      { key: "authority", label: "Approval authority", children: html`<${AuthorityTab} cols=${C} onOpen=${openItem} />` }
    ];

    return html`<div>
      <${APP.PageHeader} title="Compliance and risk" phase=${2} sow=${["3.4.1", "3.4.3", "3.4.4", "3.4.5"]}
        subtitle="Contract-versus-payment anomaly alerts, compliance checks, control testing, remediation and key-position approval checks. Alerts and check results are prompts to investigate, never findings on their own."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${function () { APP.toast.build("In the build, this exports the alerts, checks and remediation register to Excel or PDF, with every review and decision."); }}>Export<//>
          <${ActBtn} roles=${["compliance"]} type="primary" icon=${html`<${Icon} name="PlayCircleOutlined" />`} onClick=${function () { runOpen[1](true); }}>New comparison<//>
        <//>`} />
      <${ReadOnlyNote} />
      <${A.Row} gutter=${[16, 16]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Open alerts" value=${openAlerts.length} icon="AlertOutlined" note=${high + " high severity"} onClick=${function () { tabP[1]("alerts"); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Amount under review" value=${fmt.usd(value)} icon="DollarOutlined" note="Sum of differences on open alerts" /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Remediation overdue" value=${overdue} icon="ClockCircleOutlined" color=${overdue ? "colorError" : null} note=${toReview + " with evidence to review"} onClick=${function () { tabP[1]("remediation"); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Last comparison" value=${fmt.dateShort(C.runs.list[0].at)} icon="SyncOutlined" note=${C.runs.list[0].id + ", " + fmt.number(C.runs.list[0].rows) + " rows"} onClick=${function () { openItem("run", C.runs.list[0].id); }} /><//>
      <//>
      <${A.Tabs} activeKey=${tabP[0]} onChange=${function (k) { tabP[1](k); }} items=${tabs} />
      ${o && o.kind === "alert" ? html`<${AlertDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "rule" ? html`<${RuleDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "run" ? html`<${RunDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "check" ? html`<${CheckDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "control" ? html`<${ControlDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "rem" ? html`<${RemDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "kpa" ? html`<${KpaDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${runOpen[0] ? html`<${NewRunModal} cols=${C} onClose=${function () { runOpen[1](false); }} onOpen=${openItem} />` : null}
    </div>`;
  }

  /* ---------- Anomaly alerts tab ---------- */
  function AlertsTab(props) {
    var C = props.cols;
    var view = APP.useShared("cb.ui.alertsView", "Alerts");
    var scope = useState("Open");
    var rows = C.alerts.list.filter(function (a) {
      var closed = /^Closed/.test(a.status);
      return scope[0] === "All" || (scope[0] === "Open" ? !closed : closed);
    });
    var columns = [
      { title: "Severity", dataIndex: "severity", key: "severity", render: function (v) { return html`<${SevTag} sev=${v} />`; }, sorter: function (a, b) { return SEV_RANK[a.severity] - SEV_RANK[b.severity]; }, defaultSortOrder: "descend" },
      { title: "Alert", dataIndex: "id", key: "id", render: function (v, r) { return html`<div><div className="mono nowrap">${v}</div>${r.caseId ? html`<div style=${{ fontSize: 12, opacity: 0.65 }} className="nowrap">${"Case " + r.caseId}</div>` : null}</div>`; } },
      { title: "Rule", dataIndex: "rule", key: "rule" },
      { title: "Contract", dataIndex: "contractId", key: "contractId", render: function (v, r) { return html`<div><div className="mono nowrap">${v}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${r.counterparty}</div></div>`; } },
      { title: "Contract says", dataIndex: "contractSays", key: "contractSays", width: 200 },
      { title: "Data shows", dataIndex: "dataShows", key: "dataShows", width: 220 },
      { title: "Difference", dataIndex: "difference", key: "difference", align: "right", render: function (v) { return html`<span className="nowrap" style=${{ fontWeight: 600 }}>${fmt.usd(v)}</span>`; }, sorter: function (a, b) { return a.difference - b.difference; } },
      APP.col.date("Detected", "detected"),
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } },
      { title: "Assignee", dataIndex: "assigneeId", key: "assigneeId", render: function (v) { return v ? html`<${APP.PersonTag} id=${v} />` : html`<span style=${{ opacity: 0.6 }}>Unassigned</span>`; } }
    ];
    return html`<div>
      <${A.Flex} wrap="wrap" gap=${8} align="center" style=${{ marginBottom: 12 }}>
        <${A.Segmented} value=${view[0]} onChange=${view[1]} options=${["Alerts", "Rules", "Comparison runs"]} />
        <${A.Tooltip} title="Read §3.4.1 of the specification"><span><${APP.SowRef} sec="3.4.1" /></span><//>
      <//>
      ${view[0] === "Alerts" ? html`<${Fragment}>
        <${Note} type="warning" title="An alert is not a finding of bribery">Each alert shows where payments, waivers, discounts or rebates depart from the contract. Authorised staff investigate and record the conclusion with evidence.<//>
        <${APP.DataTable} columns=${columns} data=${rows} searchKeys=${["id", "rule", "contractId", "counterparty", "caseId"]} searchPlaceholder="Search alerts, contracts, parties"
          filters=${[{ key: "severity", label: "Severity", width: 120 }, { key: "rule", label: "Rule", width: 200 }, { key: "status", label: "Status", width: 160 }]}
          toolbar=${html`<${A.Segmented} size="small" value=${scope[0]} onChange=${scope[1]} options=${["Open", "Closed", "All"]} />`}
          onRowClick=${function (r) { props.onOpen("alert", r.id); }} emptyTitle="No alerts in this view" />
      <//>` : view[0] === "Rules" ? html`<${RulesTable} cols=${C} onOpen=${props.onOpen} />` : html`<${RunsTable} cols=${C} onOpen=${props.onOpen} />`}
    </div>`;
  }

  function RulesTable(props) {
    var C = props.cols;
    var me = useMe();
    var columns = [
      APP.col.id("Rule", "id"),
      { title: "Name", dataIndex: "name", key: "name", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
      { title: "Logic", dataIndex: "logic", key: "logic", width: 340 },
      { title: "Severity", dataIndex: "severity", key: "severity", render: function (v) { return html`<${SevTag} sev=${v} />`; } },
      { title: "Data", dataIndex: "sources", key: "sources", render: function (v) { return html`<${A.Flex} wrap="wrap" gap=${4}>${v.map(function (s) { return html`<${A.Tag} key=${s} style=${{ marginInlineEnd: 0 }}>${s}<//>`; })}<//>`; } },
      { title: "Hits, 30 days", dataIndex: "hits30", key: "hits30", align: "right" },
      { title: "Active", dataIndex: "active", key: "active", render: function (v, r) {
        return html`<span onClick=${function (e) { e.stopPropagation(); }}><${A.Switch} size="small" checked=${v} disabled=${me !== "compliance"}
          onChange=${function (on) { C.rules.update(r.id, { active: on }); APP.audit({ action: on ? "Rule switched on" : "Rule switched off", item: r.id, detail: r.name, dataClass: null }); APP.toast.success(r.name + (on ? " is on. It runs on the next comparison." : " is off. Past alerts are kept.")); }} /></span>`;
      } }
    ];
    return html`<div>
      <${Note} title="Rules are checked by code, not by the model">The model only drafts the plain-English explanation of each alert. Thresholds and data sources are set by the Compliance officer and versioned.<//>
      <${APP.DataTable} columns=${columns} data=${C.rules.list} searchKeys=${["id", "name", "logic"]} searchPlaceholder="Search rules"
        filters=${[{ key: "severity", label: "Severity", width: 120 }]} onRowClick=${function (r) { props.onOpen("rule", r.id); }}
        toolbar=${html`<${ActBtn} roles=${["compliance"]} icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { APP.toast.build("In the build, a rule is built from fields in the imported data, a comparison and a threshold, then tested on past data before it goes live."); }}>New rule<//>`} />
    </div>`;
  }

  function RunsTable(props) {
    var C = props.cols;
    var columns = [
      APP.col.id("Run", "id"),
      { title: "When", dataIndex: "at", key: "at", render: function (v) { return html`<span className="nowrap">${fmt.dateTime(v)}</span>`; } },
      { title: "Started by", dataIndex: "by", key: "by", render: function (v) { return v === "system" ? "Scheduled" : html`<${APP.PersonTag} id=${v} />`; } },
      { title: "Scope", dataIndex: "scope", key: "scope", width: 260 },
      { title: "Rows", dataIndex: "rows", key: "rows", align: "right", render: function (v) { return fmt.number(v); } },
      { title: "Contracts", dataIndex: "contracts", key: "contracts", align: "right" },
      { title: "New alerts", dataIndex: "alerts", key: "alerts", align: "right" },
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } }
    ];
    return html`<${APP.DataTable} columns=${columns} data=${C.runs.list} searchKeys=${["id", "scope", "sources"]} searchPlaceholder="Search runs"
      filters=${[{ key: "status", label: "Status" }]} onRowClick=${function (r) { props.onOpen("run", r.id); }} />`;
  }

  function RuleDrawer(props) {
    var tok = A.theme.useToken().token;
    var C = props.cols;
    var r = C.rules.get(props.id);
    if (!r) return null;
    var hits = C.alerts.list.filter(function (a) { return a.ruleId === r.id; });
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} title=${r.name} subtitle=${r.id + " · version " + r.version}
      tags=${html`<${Fragment}><${SevTag} sev=${r.severity} /><${St} status=${r.active ? "Active" : "Off"} /><//>`}
      actions=${html`<${ActBtn} roles=${["compliance"]} icon=${html`<${Icon} name="ExperimentOutlined" />`} onClick=${function () { APP.toast.info("Tested on RUN-0012 data: " + hits.length + " alerts would be raised. Nothing was changed."); }}>Test on last run<//>`}>
      <${APP.KeyFacts} column=${1} items=${[["Data sources", r.sources.join(", ")], ["Owner", r.owner], ["Hits in the last 30 days", String(r.hits30)], ["Status", r.active ? "Active" : "Off"]]} />
      <${SectionTitle}>Logic<//>
      <div className="mono" style=${{ padding: 12, borderRadius: 8, background: tok.colorFillQuaternary, border: "1px solid " + tok.colorBorderSecondary, lineHeight: 1.7 }}>
        <div>${"WHEN " + r.logic.toLowerCase()}</div>
        <div>${"THEN raise a " + r.severity.toLowerCase() + " alert with the contract clause, the records and the difference"}</div>
      </div>
      <${SectionTitle}>Alerts from this rule<//>
      ${hits.length ? hits.map(function (a) {
        return html`<div key=${a.id} className="clickable-row" onClick=${function () { props.onOpen("alert", a.id); }}
          style=${{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + tok.colorBorderSecondary, flexWrap: "wrap" }}>
          <span className="mono">${a.id}</span><span style=${{ flex: 1, minWidth: 160 }}>${a.counterparty}</span><${St} status=${a.status} />
        </div>`;
      }) : html`<${APP.EmptyHint} title="No alerts yet" description="This rule has not raised an alert on the current data." />`}
      <${SectionTitle}>Versions<//>
      <${Events} items=${[{ at: "2026-06-01T10:00", actorId: "compliance", text: "Version 1.0 created and tested on six months of past data." }, { at: "2026-09-02T15:20", actorId: "compliance", text: "Threshold reviewed. Version " + r.version + " live." }]} />
    <//>`;
  }

  function RunDrawer(props) {
    var tok = A.theme.useToken().token;
    var C = props.cols;
    var r = C.runs.get(props.id);
    if (!r) return null;
    var made = C.alerts.list.filter(function (a) { return a.runId === r.id; });
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} title=${"Comparison run " + r.id} subtitle=${fmt.dateTime(r.at)} tags=${html`<${St} status=${r.status} />`}>
      ${r.warning ? html`<${Note} type="warning" title="Completed with a warning">${r.warning}<//>` : null}
      <${APP.KeyFacts} column=${1} items=${[["Started by", r.by === "system" ? "Scheduled nightly run" : APP.personName(r.by)], ["Scope", r.scope], ["Data", r.sources], ["Rows compared", fmt.number(r.rows)], ["Contracts", String(r.contracts)], ["New alerts", String(r.alerts)], ["Where it ran", "Inside the CICT VPC. Payment data never goes to an external model."]]} />
      <${SectionTitle}>Alerts raised<//>
      ${made.length ? made.map(function (a) {
        return html`<div key=${a.id} className="clickable-row" onClick=${function () { props.onOpen("alert", a.id); }}
          style=${{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + tok.colorBorderSecondary, flexWrap: "wrap" }}>
          <${SevTag} sev=${a.severity} /><span className="mono">${a.id}</span><span style=${{ flex: 1, minWidth: 160 }}>${a.rule + ", " + a.counterparty}</span><${St} status=${a.status} />
        </div>`;
      }) : html`<${APP.EmptyHint} title="No alerts on this run" description="No payment, waiver, discount or rebate departed from the contract terms in scope." />`}
    <//>`;
  }

  /* ---------- Alert detail: alert to case to decision ---------- */
  var EVIDENCE_FILES = ["Signed amendment request.pdf", "Approver email, March 2026.msg", "Bank confirmation letter.pdf", "Interview note, Procurement.docx", "Payment approval screenshot.png"];

  function AlertDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var C = props.cols;
    var a = C.alerts.get(props.id);
    var tabS = useState("overview");
    var noteS = useState("");
    var decS = useState("No issue found");
    var ratS = useState("");
    var triedS = useState(false);
    var remS = useState({ dept: "Finance", owner: "", action: "", due: "2026-12-15", title: "" });
    var rowS = useState(null);
    if (!a) return null;
    var closed = /^Closed/.test(a.status);
    var canAct = me === "compliance";
    var rule = C.rules.get(a.ruleId) || {};
    var run = C.runs.get(a.runId);
    var cites = [a.cite, a.cite2].filter(Boolean);

    function addNote(kind, text, extra) {
      C.alerts.update(a.id, function (x) { return Object.assign({ notes: x.notes.concat([{ at: APP.nowIso(), actorId: me, kind: kind, text: text }]) }, extra || {}); });
    }
    function openCase() {
      var cc = nextCase(C.alerts.list);
      addNote("status", "Case " + cc + " opened and assigned to " + APP.personName(me) + ".", { status: "In review", caseId: cc, assigneeId: me });
      APP.audit({ action: "Case opened", item: a.id, detail: cc + ": " + a.rule + ", " + a.counterparty, dataClass: a.dataClass });
      APP.toast.success("Case " + cc + " opened. Add notes and evidence, then record a conclusion.");
      tabS[1]("case");
    }
    function decide() {
      triedS[1](true);
      var r = ratS[0].trim();
      if (r.length < 15) { APP.toast.warn("Write the reason for the conclusion. A conclusion without a reason is not saved."); return; }
      var d = decS[0];
      function apply() {
        var patch = {}, rid = null;
        if (d === "No issue found") patch.status = "Closed: no issue";
        else if (d === "Escalate to Legal") patch.status = "Escalated";
        else {
          rid = nextNum(colNow("remediation"), "RM-2026-", 2);
          var rs = remS[0];
          var ownerId = DEPT_PERSONA[rs.dept] || null;
          C.rem.add({ id: rid, title: rs.title || a.rule + ": " + a.counterparty, source: "Alert " + a.id, sourceRoute: "compliance", sourceId: a.id,
            dept: rs.dept, ownerName: rs.owner || DEPT_OWNER[rs.dept], ownerId: ownerId, action: rs.action || a.checks[0], due: rs.due, status: "Open", risk: a.severity,
            evidence: [], history: [{ at: APP.nowIso(), actorId: me, text: "Raised from alert " + a.id + "." }], live: true });
          patch.status = "Closed: issue confirmed";
          if (ownerId) APP.notify({ to: [ownerId], kind: "alert", title: "Remediation " + rid + " for your department", body: a.rule + ", " + a.counterparty + ". Due " + fmt.date(rs.due) + ".", route: "compliance", params: { id: rid }, phase: 2 });
        }
        patch.conclusion = { decision: d, by: me, at: APP.nowIso(), text: r, remediationId: rid };
        addNote("decision", d + (rid ? ". Remediation " + rid + " raised" : "") + ". " + r, patch);
        APP.audit({ action: "Alert concluded", item: a.id, detail: d + (rid ? ", " + rid : "") + ": " + a.counterparty, dataClass: a.dataClass });
        if (d === "Escalate to Legal") APP.notify({ to: ["legal"], kind: "alert", title: "Compliance alert escalated: " + a.counterparty, body: a.rule + ". " + r, route: "compliance", params: { id: a.id }, phase: 2 });
        APP.toast.success(d === "Issue confirmed" ? "Issue confirmed. Remediation " + rid + " added to the register." : d === "Escalate to Legal" ? "Escalated. N. Perera is notified." : "Closed with no issue found. The record is kept.");
        ratS[1](""); triedS[1](false);
      }
      if (d === "Issue confirmed") APP.confirm({ title: "Confirm the issue?", zIndex: 1300, okText: "Confirm issue",
        content: "This records a confirmed departure from the contract and opens a remediation item. It is not a finding of bribery; that needs a separate investigation by authorised staff.", onOk: apply });
      else apply();
    }

    var overview = html`<div>
      <${A.Row} gutter=${[12, 12]}>
        <${A.Col} xs=${24} md=${8}><${A.Card} size="small" title="Contract says" style=${{ height: "100%" }}>
          <div style=${{ fontWeight: 500 }}>${a.contractSays}</div>
          <div style=${{ marginTop: 8, fontSize: 12, color: tok.colorTextSecondary }}>Source ${cites.map(function (c, i) { return html`<${APP.CitationChip} key=${i} n=${i + 1} cite=${c} cites=${cites} />`; })}</div>
        <//><//>
        <${A.Col} xs=${24} md=${8}><${A.Card} size="small" title="Data shows" style=${{ height: "100%" }}>
          <div style=${{ fontWeight: 500 }}>${a.dataShows}</div>
          <div style=${{ marginTop: 8, fontSize: 12, color: tok.colorTextSecondary }}>${a.rows.length + (a.rows.length === 1 ? " record" : " records") + (run ? " from " + run.id : "")}</div>
        <//><//>
        <${A.Col} xs=${24} md=${8}><${A.Card} size="small" title="Difference" style=${{ height: "100%" }}>
          <div style=${{ fontSize: 22, fontWeight: 600, color: tok.colorError }}>${fmt.usd(a.difference)}</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${a.diffLabel}</div>
        <//><//>
      <//>
      <${SectionTitle}>Recommended checks<//>
      <ol style=${{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>${a.checks.map(function (c, i) { return html`<li key=${i}>${c}</li>`; })}</ol>
      <${SectionTitle}>Details<//>
      <${APP.KeyFacts} column=${DCOL} items=${[["Rule", a.ruleId + ", " + a.rule], ["Contract", html`<a onClick=${function () { APP.navigate("contracts", { id: a.contractId }); }}>${a.contractId}</a>`], ["Counterparty", a.counterparty],
        ["Detected", fmt.dateTime(a.detected)], ["Data class", html`<${APP.DataClassTag} cls=${a.dataClass} />`], ["Case", a.caseId || "Not opened"]]} />
      <div style=${{ marginTop: 12 }}>
        <${APP.AnswerTrace} title="How this alert was made" steps=${[
          { label: "Data imported", detail: run ? run.sources : "Finance and commercial systems", status: "done" },
          { label: "Matched to the contract terms", detail: cites.map(APP.citeLabel).join("; "), status: "done" },
          { label: "Rule " + a.ruleId + " checked by code", detail: rule.logic || "", status: "done" },
          { label: "Explanation drafted on Qwen (self-hosted)", detail: "Data class " + a.dataClass + ". Payment data stays inside the CICT VPC.", status: "done" },
          { label: closed ? "Concluded by " + APP.personName(a.conclusion && a.conclusion.by) : a.status === "Escalated" ? "Escalated to Legal" : "Waiting for a person to conclude", detail: "An alert is not a finding.", status: closed ? "done" : "wait" }]} />
      </div>
    </div>`;

    var evidence = html`<div>
      <${SectionTitle} first=${true}>Records behind the alert<//>
      <div className="table-scroll"><${A.Table} size="small" rowKey="id" pagination=${false} dataSource=${a.rows} rowClassName="clickable-row"
        onRow=${function (r) { return { onClick: function () { rowS[1](r); } }; }}
        columns=${[
          { title: "Record", dataIndex: "id", key: "id", render: function (v) { return html`<span className="mono nowrap">${v}</span>`; } },
          { title: "Date", dataIndex: "date", key: "date", render: function (v) { return html`<span className="nowrap">${fmt.date(v)}</span>`; } },
          { title: "Reference", dataIndex: "ref", key: "ref" },
          { title: "Base", dataIndex: "base", key: "base", align: "right", render: function (v) { return v == null ? "" : fmt.number(v); } },
          { title: "Rate", dataIndex: "rate", key: "rate" },
          { title: "Paid", dataIndex: "paid", key: "paid", align: "right", render: function (v) { return v == null ? "" : fmt.number(v); } },
          { title: "Contract allows", dataIndex: "expected", key: "expected", align: "right", render: function (v) { return v == null ? "n/a" : fmt.number(v); } },
          { title: "Difference", dataIndex: "diff", key: "diff", align: "right", render: function (v) { return v == null ? "n/a" : html`<b>${fmt.number(v)}</b>`; } }]} /></div>
      <${SectionTitle} extra=${html`<${FileAdder} roles=${["compliance", "legal"]} files=${EVIDENCE_FILES} onAdd=${function (f) {
        C.alerts.update(a.id, function (x) { return { files: x.files.concat([{ name: f, meta: "Added by " + APP.personName(me) + ", " + fmt.dateTime(APP.nowIso()) }]), notes: x.notes.concat([{ at: APP.nowIso(), actorId: me, kind: "evidence", text: "Added evidence: " + f }]) }; });
        APP.audit({ action: "Evidence added", item: a.id, detail: f, dataClass: a.dataClass }); APP.toast.success(f + " added to the case.");
      }} />`}>Evidence files<//>
      ${a.files.length ? html`<${A.Flex} wrap="wrap" gap=${8}>${a.files.map(function (f, i) { return html`<${APP.FileChip} key=${i} name=${f.name} meta=${f.meta} onClick=${function () { APP.toast.build("In the build, " + f.name + " opens in the document viewer, with access checked against its data class."); }} />`; })}<//>`
        : html`<${APP.EmptyHint} title="No evidence yet" description="Add the approval, email or bank letter that explains the difference." />`}
      <${A.Modal} open=${!!rowS[0]} onCancel=${function () { rowS[1](null); }} footer=${null} title=${rowS[0] ? "Record " + rowS[0].id : ""} destroyOnHidden=${true}>
        ${rowS[0] ? html`<div>
          <${APP.KeyFacts} column=${1} items=${[["Date", fmt.date(rowS[0].date)], ["Reference", rowS[0].ref], ["Base amount", rowS[0].base == null ? "n/a" : fmt.usd(rowS[0].base)], ["Rate or price", rowS[0].rate], ["Paid", fmt.usd(rowS[0].paid)], ["Contract allows", rowS[0].expected == null ? "Not set by contract" : fmt.usd(rowS[0].expected)], ["Source", (run ? run.sources : "Import") + ", matched by contract number and counterparty"]]} />
          <div style=${{ marginTop: 12, fontSize: 12, color: tok.colorTextSecondary }}>Imported records are read only. Corrections are made in the source system and arrive on the next run.</div>
        </div>` : null}
      <//>
    </div>`;

    var caseTab = !a.caseId ? html`<${APP.EmptyHint} title="No case yet" description="Open a case to investigate: it is assigned to you, and notes, evidence and the conclusion are recorded against it."
        action=${html`<${ActBtn} roles=${["compliance"]} type="primary" onClick=${openCase}>Open a case<//>`} />`
      : html`<div>
        <${APP.KeyFacts} column=${DCOL} items=${[["Case", a.caseId], ["Status", html`<${St} status=${a.status} />`], ["Assigned to", html`<${A.Select} size="small" value=${a.assigneeId} disabled=${!canAct || closed} style=${{ minWidth: 170 }}
          options=${[{ value: "compliance", label: "R. Fernando, Compliance" }, { value: "legal", label: "N. Perera, Legal" }]}
          onChange=${function (v) { addNote("status", "Assigned to " + APP.personName(v) + ".", { assigneeId: v }); if (v !== me) APP.notify({ to: [v], kind: "alert", title: "Compliance case " + a.caseId + " assigned to you", body: a.rule + ", " + a.counterparty + ".", route: "compliance", params: { id: a.id }, phase: 2 }); APP.toast.success("Assigned to " + APP.personName(v) + "."); }} />`]]} />
        <${SectionTitle}>Case notes<//>
        <${Events} items=${a.notes} />
        ${closed ? null : html`<div style=${{ marginTop: 8 }}>
          <${A.Input.TextArea} rows=${3} value=${noteS[0]} onChange=${function (e) { noteS[1](e.target.value); }} placeholder="Add a note: who you spoke to, what you found, what is next" disabled=${["compliance", "legal"].indexOf(me) < 0} />
          <${A.Flex} gap=${8} style=${{ marginTop: 8 }} wrap="wrap">
            <${ActBtn} roles=${["compliance", "legal"]} type="primary" disabled=${!noteS[0].trim()} onClick=${function () { addNote("note", noteS[0].trim()); APP.audit({ action: "Case note", item: a.id, detail: a.caseId, dataClass: a.dataClass }); noteS[1](""); APP.toast.success("Note added to " + a.caseId + "."); }}>Add note<//>
            <${A.Button} onClick=${function () { tabS[1]("decision"); }}>Go to conclusion<//>
          <//>
        </div>`}
      </div>`;

    var decision = closed ? html`<${A.Result} status=${a.status === "Closed: no issue" ? "success" : "warning"} title=${a.conclusion.decision}
        subTitle=${"Recorded by " + APP.personName(a.conclusion.by) + ", " + fmt.dateTime(a.conclusion.at)}
        extra=${a.conclusion.remediationId ? html`<${A.Button} type="primary" onClick=${function () { props.onOpen("rem", a.conclusion.remediationId); }}>${"Open remediation " + a.conclusion.remediationId}<//>` : null}>
        <div style=${{ textAlign: "left" }}><b>Reason</b><div>${a.conclusion.text}</div></div>
      <//>`
      : !canAct ? html`<${Note} type="info" title="Only the Compliance officer records the conclusion" action=${html`<${A.Button} size="small" onClick=${function () { switchTo("compliance"); }}>Switch to R. Fernando<//>`}>${a.status === "Escalated" ? "This alert is escalated to Legal. Add notes on the Case tab; R. Fernando records the final conclusion." : "You can read the alert and add evidence where your role allows."}<//>`
      : !a.caseId ? html`<${APP.EmptyHint} title="Open a case first" description="The conclusion is recorded on a case so the investigation trail is complete." action=${html`<${A.Button} type="primary" onClick=${openCase}>Open a case<//>`} />`
      : html`<div>
        ${a.status === "Escalated" ? html`<${Note} type="warning" title="Escalated to Legal">Record the final conclusion once Legal has advised.<//>` : null}
        <${Field} label="Conclusion" required=${true}>
          <${A.Radio.Group} optionType="button" buttonStyle="solid" value=${decS[0]} onChange=${function (e) { decS[1](e.target.value); }}
            options=${["No issue found", "Issue confirmed", "Escalate to Legal"].map(function (x) { return { value: x, label: x }; })} />
        <//>
        <${Field} label="Reason" required=${true} error=${triedS[0] && ratS[0].trim().length < 15 ? "Write at least one sentence." : null} help="Say what you checked and what you found. This is kept with the case and in the audit log.">
          <${A.Input.TextArea} rows=${4} value=${ratS[0]} onChange=${function (e) { ratS[1](e.target.value); }} status=${triedS[0] && ratS[0].trim().length < 15 ? "error" : undefined}
            placeholder=${decS[0] === "No issue found" ? "For example: approval AP-2026-1180 found in the procurement system; the import had not linked it." : "For example: no amendment or approval found for the 4.0% rate; Finance confirms it was paid in error."} />
        <//>
        ${decS[0] === "Issue confirmed" ? html`<${A.Card} size="small" title="Remediation item" style=${{ marginBottom: 14 }}>
          <${A.Row} gutter=${12}>
            <${A.Col} xs=${24} md=${12}><${Field} label="Department"><${A.Select} value=${remS[0].dept} style=${{ width: "100%" }} options=${Object.keys(DEPT_OWNER).map(function (k) { return { value: k, label: k }; })}
              onChange=${function (v) { remS[1](Object.assign({}, remS[0], { dept: v, owner: "" })); }} /><//><//>
            <${A.Col} xs=${24} md=${12}><${Field} label="Responsible person"><${A.Input} value=${remS[0].owner || DEPT_OWNER[remS[0].dept]} onChange=${function (e) { remS[1](Object.assign({}, remS[0], { owner: e.target.value })); }} /><//><//>
          <//>
          <${Field} label="Corrective action"><${A.Input.TextArea} rows=${2} value=${remS[0].action || a.checks[0]} onChange=${function (e) { remS[1](Object.assign({}, remS[0], { action: e.target.value })); }} /><//>
          <${Field} label="Deadline"><${A.DatePicker} value=${dayjs(remS[0].due)} allowClear=${false} format="D MMM YYYY" onChange=${function (d) { if (d) remS[1](Object.assign({}, remS[0], { due: d.format("YYYY-MM-DD") })); }} /><//>
        <//>` : null}
        <${A.Button} type="primary" onClick=${decide}>Record conclusion<//>
      </div>`;

    var actions = html`<${Fragment}>
      ${a.status === "New" ? html`<${ActBtn} roles=${["compliance"]} type="primary" onClick=${openCase}>Open a case<//>` : null}
      <${A.Dropdown} trigger=${["click"]} menu=${{ items: [
        { key: "contract", icon: html`<${Icon} name="FileTextOutlined" />`, label: "Open contract " + a.contractId },
        { key: "ask", icon: html`<${Icon} name="MessageOutlined" />`, label: "Ask the assistant about this alert" },
        { key: "export", icon: html`<${Icon} name="DownloadOutlined" />`, label: "Export case file" }],
        onClick: function (info) {
          if (info.key === "contract") APP.navigate("contracts", { id: a.contractId });
          else if (info.key === "ask") APP.navigate("assistant", { new: true, contractId: a.contractId });
          else APP.toast.build("In the build, the case file exports to PDF with the alert, records, notes, evidence and conclusion.");
        } }}><${A.Button} icon=${html`<${Icon} name="MoreOutlined" />`} aria-label="More actions" /><//>
    <//>`;

    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${860} title=${a.id + " · " + a.rule}
      subtitle=${a.counterparty + " · " + a.contractId + (a.caseId ? " · Case " + a.caseId : "")}
      tags=${html`<${Fragment}><${SevTag} sev=${a.severity} /><${St} status=${a.status} /><${APP.PhaseTag} phase=${2} /><//>`} actions=${actions}>
      <${Note} type="warning" title="An alert is not a finding of bribery" action=${html`<${APP.SowRef} sec="3.4.1" />`}>Authorised Company staff investigate and confirm any finding.<//>
      <${A.Tabs} activeKey=${tabS[0]} onChange=${tabS[1]} items=${[
        { key: "overview", label: "Overview", children: overview },
        { key: "evidence", label: "Evidence (" + (a.rows.length + a.files.length) + ")", children: evidence },
        { key: "case", label: "Case notes", children: caseTab },
        { key: "decision", label: "Conclusion", children: decision },
        { key: "rule", label: "Rule", children: html`<div>
          <${APP.KeyFacts} column=${1} items=${[["Rule", (rule.id || "") + ", " + (rule.name || "")], ["Logic", rule.logic], ["Severity", rule.severity], ["Data sources", (rule.sources || []).join(", ")], ["Version", rule.version]]} />
          <div style=${{ marginTop: 12 }}><${A.Button} onClick=${function () { props.onOpen("rule", rule.id); }}>Open the rule<//></div>
        </div>` }]} />
    <//>`;
  }

  /* ---------- New comparison (import, scope, run) ---------- */
  function NewRunModal(props) {
    var C = props.cols;
    var me = useMe();
    var step = useState(0);
    var data = useState(["Contracts", "Payments", "Tariff waivers", "Discounts", "Rebates"]);
    var src = useState("import");
    var file = useState(null);
    var period = useState("1 Nov to 10 Nov 2026");
    var contracts = useState([]);
    var pct = useState(0);
    var result = useState(null);
    var timer = useRef(null);
    useEffect(function () { return function () { clearInterval(timer.current); }; }, []);
    function run() {
      step[1](2); pct[1](0);
      var p = 0;
      timer.current = setInterval(function () {
        p += 10; pct[1](p);
        if (p >= 100) { clearInterval(timer.current); finish(); }
      }, 160);
    }
    function finish() {
      var exists = findIn(colNow("alerts"), "ANM-0039");
      var runId = nextNum(colNow("runs"), "RUN-", 4);
      var rows = src[0] === "import" ? 1206 : 212;
      var n = contracts[0].length || 41;
      if (!exists) {
        C.alerts.add({ id: "ANM-0039", severity: "Medium", ruleId: "RUL-04", rule: "Price above contract schedule", contractId: "CON-2024-051", counterparty: "Northwind Crane Services (Pvt) Ltd",
          contractSays: "Quarterly instalment USD 123,333 (USD 1,480,000 over 12 quarters)", dataShows: "Q4 2026 invoice for USD 128,000", difference: 4667, diffLabel: "USD 4,667 above the contract instalment",
          detected: APP.nowIso(), runId: runId, status: "New", caseId: null, assigneeId: null, dataClass: "Sensitive",
          cite: { doc: "CON-2024-051", clause: "5", page: 3 }, cite2: null,
          checks: ["Check whether a price review or variation was agreed", "Ask Engineering whether extra work was ordered"],
          rows: [{ id: "INV-NW-2290", date: "2026-11-03", ref: "Instalment Q4 2026", base: 128000, rate: "n/a", paid: 0, expected: 123333, diff: 4667 }],
          files: [], notes: [{ at: APP.nowIso(), actorId: "system", kind: "system", text: "Alert raised by rule RUL-04 on run " + runId + ", started by " + APP.personName(me) + "." }], live: true });
      }
      C.runs.add({ id: runId, at: APP.nowIso(), by: me, scope: (contracts[0].length ? contracts[0].join(", ") : "All active contracts") + ", " + period[0],
        sources: src[0] === "import" ? "Finance system import (" + data[0].join(", ").toLowerCase() + ")" : "Manual upload: " + (file[0] || "payments.xlsx"),
        rows: rows, contracts: n, alerts: exists ? 0 : 1, status: "Completed", live: true });
      APP.audit({ action: "Comparison run", item: runId, detail: rows + " rows, " + (exists ? "no new alerts" : "1 new alert"), dataClass: "Sensitive" });
      result[1]({ runId: runId, rows: rows, created: exists ? 0 : 1 });
    }
    var footer = step[0] === 0 ? [html`<${A.Button} key="c" onClick=${props.onClose}>Cancel<//>`, html`<${A.Button} key="n" type="primary" disabled=${!data[0].length || (src[0] === "upload" && !file[0])} onClick=${function () { step[1](1); }}>Next<//>`]
      : step[0] === 1 ? [html`<${A.Button} key="b" onClick=${function () { step[1](0); }}>Back<//>`, html`<${A.Button} key="r" type="primary" icon=${html`<${Icon} name="PlayCircleOutlined" />`} onClick=${run}>Run comparison<//>`]
      : [html`<${A.Button} key="x" type=${result[0] ? "default" : "primary"} disabled=${!result[0]} onClick=${props.onClose}>Close<//>`].concat(result[0] && result[0].created ? [html`<${A.Button} key="o" type="primary" onClick=${function () { props.onClose(); props.onOpen("alert", "ANM-0039"); }}>Open ANM-0039<//>`] : []);
    return html`<${A.Modal} open=${true} onCancel=${props.onClose} title="New comparison" width=${680} footer=${footer} destroyOnHidden=${true}>
      <${A.Steps} size="small" current=${step[0]} style=${{ margin: "8px 0 20px" }} items=${[{ title: "Data" }, { title: "Scope" }, { title: "Run" }]} />
      ${step[0] === 0 ? html`<div>
        <${Field} label="Data to compare" help="§3.4.1: contract, payment, tariff waiver, discount and rebate data.">
          <${A.Checkbox.Group} value=${data[0]} onChange=${data[1]} options=${["Contracts", "Payments", "Tariff waivers", "Discounts", "Rebates"]} />
        <//>
        <${Field} label="Where the data comes from">
          <${A.Radio.Group} value=${src[0]} onChange=${function (e) { src[1](e.target.value); }} options=${[{ value: "import", label: "Import from the finance and commercial systems" }, { value: "upload", label: "Upload a file" }]} />
        <//>
        ${src[0] === "upload" ? html`<${A.Upload.Dragger} accept=".xlsx,.csv" showUploadList=${false} beforeUpload=${function (f) { file[1](f.name); return false; }}>
          <p style=${{ fontSize: 28, margin: 0 }}><${Icon} name="InboxOutlined" /></p>
          <p style=${{ margin: "4px 0" }}>${file[0] ? "Selected: " + file[0] : "Drop an Excel or CSV file here, or click to choose"}</p>
          <p style=${{ fontSize: 12, opacity: 0.65, margin: 0 }}>Columns are matched to the import template. Nothing leaves this page in the prototype.</p>
        <//>
        <div style=${{ marginTop: 8 }}><${A.Button} size="small" onClick=${function () { file[1]("Payments November 2026.xlsx"); }}>Use the sample file<//></div>` :
        html`<${Note} title="System import (assumption A7)">Documented import templates are included. Live connections to named CICT systems are scoped in Discovery.<//>`}
      </div>` : step[0] === 1 ? html`<div>
        <${Field} label="Period"><${A.Select} value=${period[0]} onChange=${period[1]} style=${{ width: "100%" }} options=${["1 Nov to 10 Nov 2026", "October 2026", "Q3 2026", "2026 to date"].map(function (x) { return { value: x, label: x }; })} /><//>
        <${Field} label="Contracts" help="Leave empty to check all active contracts.">
          <${A.Select} mode="multiple" allowClear value=${contracts[0]} onChange=${contracts[1]} style=${{ width: "100%" }} placeholder="All active contracts"
            options=${D.contracts.map(function (c) { return { value: c.id, label: c.id + ", " + c.counterparty }; })} />
        <//>
        <${Field} label="Rules"><div>${C.rules.list.filter(function (r) { return r.active; }).map(function (r) { return html`<${A.Tag} key=${r.id} style=${{ marginBottom: 4 }}>${r.name}<//>`; })}</div><//>
        <${Note} title="Where it runs">Payment data is Sensitive or Confidential, so the comparison and the explanations run inside the CICT VPC on the self-hosted model. Nothing goes to Bedrock.<//>
      </div>` : html`<div>
        <${A.Progress} percent=${pct[0]} status=${pct[0] < 100 ? "active" : "success"} />
        <div style=${{ margin: "8px 0 16px", opacity: 0.75 }}>${pct[0] < 40 ? "Importing and matching records to contracts" : pct[0] < 80 ? "Checking rules" : pct[0] < 100 ? "Drafting explanations" : "Done"}</div>
        ${result[0] ? html`<${A.Result} status="success" title="Comparison finished" subTitle=${fmt.number(result[0].rows) + " rows checked on " + result[0].runId + ". " + (result[0].created ? "1 new alert: price above the contract schedule on CON-2024-051." : "No new alerts. Earlier alerts stay as they are.")} />` : html`<${A.Skeleton} active paragraph=${{ rows: 2 }} />`}
      </div>`}
    <//>`;
  }

  /* ---------- Compliance checks (3.4.3) ---------- */
  var BASIS_OPTIONS = ["Procurement policy 3.3", "Delegation of authority v2", "Anti-bribery policy (headquarters) 2024", "Company Management Policies 2025.1", "Personal Data Protection Act 2022"];
  var MATERIAL_OPTIONS = ["Contracts", "Payment records", "Approval records", "Policies", "Gifts and hospitality register"];

  function ChecksTab(props) {
    var C = props.cols;
    var newOpen = useState(false);
    var rows = C.checks.list.map(function (c) { return Object.assign({}, c, { gaps: c.results.filter(function (r) { return r.outcome === "Gap"; }).length, cant: c.results.filter(function (r) { return r.outcome === "Can't be assessed"; }).length }); });
    var columns = [
      APP.col.id("Check", "id"),
      { title: "Matter", dataIndex: "title", key: "title", render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${r.subject}</div></div>`; } },
      APP.col.text("Area", "area"), APP.col.text("Period", "period"),
      { title: "Gaps", dataIndex: "gaps", key: "gaps", align: "right", render: function (v) { return v ? html`<${A.Tag} color="red" style=${{ marginInlineEnd: 0 }}>${v}<//>` : "0"; } },
      { title: "Can't be assessed", dataIndex: "cant", key: "cant", align: "right", render: function (v) { return v ? html`<${A.Tag} color="orange" style=${{ marginInlineEnd: 0 }}>${v}<//>` : "0"; } },
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } },
      APP.col.date("Started", "createdAt")
    ];
    return html`<div>
      <${Note} title="Checks against policy, headquarters requirements and law" action=${html`<${APP.SowRef} sec="3.4.3" />`}>Where information is missing, the result says it can't be assessed and asks for the material. It never concludes that a matter is compliant by default.<//>
      <${APP.DataTable} columns=${columns} data=${rows} searchKeys=${["id", "title", "subject", "area"]} searchPlaceholder="Search checks"
        filters=${[{ key: "area", label: "Area" }, { key: "status", label: "Status", width: 170 }]} onRowClick=${function (r) { props.onOpen("check", r.id); }}
        toolbar=${html`<${ActBtn} roles=${["compliance"]} type="primary" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { newOpen[1](true); }}>New check<//>`} />
      ${newOpen[0] ? html`<${NewCheckModal} cols=${C} onClose=${function () { newOpen[1](false); }} onOpen=${props.onOpen} />` : null}
    </div>`;
  }

  function NewCheckModal(props) {
    var me = useMe();
    var f = useState({ area: "Procurement", period: "Q4 2026 to date", subject: "CON-2026-009", basis: BASIS_OPTIONS.slice(0, 3), materials: MATERIAL_OPTIONS.slice(0, 3) });
    function set(k, v) { var n = Object.assign({}, f[0]); n[k] = v; f[1](n); }
    function create() {
      var id = nextNum(colNow("checks"), "CHK-2026-", 3);
      var c = D.contracts.filter(function (x) { return x.id === f[0].subject; })[0];
      var subj = c ? c.counterparty + ", " + c.id : f[0].subject;
      addTo("checks", { id: id, title: f[0].area + " review, " + f[0].period, area: f[0].area, period: f[0].period, subject: subj, basis: f[0].basis,
        materials: f[0].materials.map(function (m) { return m + (c && m === "Contracts" ? " (" + c.id + ")" : ""); }), status: "Running", ownerId: me, createdAt: APP.nowIso(),
        model: "Qwen (self-hosted)", dataClass: c ? c.dataClass : "Internal", results: [], live: true });
      APP.audit({ action: "Compliance check started", item: id, detail: subj, dataClass: c ? c.dataClass : "Internal" });
      setTimeout(function () {
        updateIn("checks", id, { status: "Results to confirm", results: [
          { id: "R1", check: "Signed contract in place before work and payment", finding: "Signed contract on file.", rating: "Low", outcome: "Passed", source: c ? (c.records[0] || c.id) : "Contract", basis: "Procurement policy 3.3, section 4.1", action: "None" },
          { id: "R2", check: "Payments match the contract terms", finding: "One payment of USD 620 has a discount with no approval linked.", rating: "Medium", outcome: "Gap", source: "Invoice INV-ST-0433", basis: "Contract clause 5.3", action: "Find the discount approval or recover the amount", cite: { doc: "CB-CON-009", clause: "5.3", page: 4 } },
          { id: "R3", check: "Approvals within authority", finding: "Approval records were not provided for 2 of 9 payments, so this can't be assessed.", rating: "Not rated", outcome: "Can't be assessed", source: "Payments PAY-90112, PAY-90187", basis: "Delegation of authority v2, Schedule A item 4", action: "Upload the two approval records", cite: { doc: "CB-DOA", clause: "A.4", page: 3 } },
          { id: "R4", check: "Gifts from the counterparty declared", finding: "No entries for this counterparty in the register.", rating: "Low", outcome: "Passed", source: "REC-2026-0201", basis: "Anti-bribery policy (headquarters) 2024, section 6", action: "None" }] });
        APP.toast.info(id + " finished. 1 gap and 1 item that can't be assessed are waiting for your review.");
      }, 2200);
      APP.toast.success(id + " started. Results arrive in a few seconds.");
      props.onClose(); props.onOpen("check", id);
    }
    return html`<${A.Modal} open=${true} onCancel=${props.onClose} title="New compliance check" okText="Start check" onOk=${create} width=${640} destroyOnHidden=${true}>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} md=${12}><${Field} label="Business area"><${A.Select} value=${f[0].area} onChange=${function (v) { set("area", v); }} style=${{ width: "100%" }} options=${["Procurement", "Commercial", "Engineering", "Finance", "HR"].map(function (x) { return { value: x, label: x }; })} /><//><//>
        <${A.Col} xs=${24} md=${12}><${Field} label="Review period"><${A.Select} value=${f[0].period} onChange=${function (v) { set("period", v); }} style=${{ width: "100%" }} options=${["Q4 2026 to date", "Q3 2026", "2026 to date"].map(function (x) { return { value: x, label: x }; })} /><//><//>
      <//>
      <${Field} label="Subject"><${A.Select} value=${f[0].subject} onChange=${function (v) { set("subject", v); }} style=${{ width: "100%" }} options=${D.contracts.map(function (c) { return { value: c.id, label: c.id + ", " + c.counterparty }; })} /><//>
      <${Field} label="Check against"><${A.Checkbox.Group} value=${f[0].basis} onChange=${function (v) { set("basis", v); }} options=${BASIS_OPTIONS} /><//>
      <${Field} label="Materials" help="Upload or select materials; anything missing shows as can't be assessed."><${A.Checkbox.Group} value=${f[0].materials} onChange=${function (v) { set("materials", v); }} options=${MATERIAL_OPTIONS} /><//>
    <//>`;
  }

  function CheckDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var C = props.cols;
    var c = C.checks.get(props.id);
    var editS = useState(null);
    var editText = useState("");
    var confirmS = useState(false);
    var selS = useState([]);
    if (!c) return null;
    var canAct = me === "compliance";
    var confirmed = c.status === "Confirmed";
    var gaps = c.results.filter(function (r) { return r.outcome === "Gap"; });
    var stage = c.status === "Running" ? 1 : c.status === "Results to confirm" ? 2 : 4;
    function patchResult(rid, patch) { C.checks.update(c.id, function (x) { return { results: x.results.map(function (r) { return r.id === rid ? Object.assign({}, r, patch) : r; }) }; }); }
    function confirmAll() {
      var made = [];
      var all = colNow("remediation").slice();
      selS[0].forEach(function (rid) {
        var r = findIn(c.results, rid);
        var id = nextNum(all, "RM-2026-", 2);
        var item = { id: id, title: r.check + ": " + r.finding.split(".")[0], source: "Check " + c.id, sourceRoute: "compliance", sourceId: c.id, dept: c.area in DEPT_OWNER ? c.area : "Procurement",
          ownerName: DEPT_OWNER[c.area] || "D. Fonseka", ownerId: DEPT_PERSONA[c.area] || null, action: r.action, due: dayjs(APP.nowIso()).add(30, "day").format("YYYY-MM-DD"), status: "Open", risk: r.rating === "High" ? "High" : "Medium",
          evidence: [], history: [{ at: APP.nowIso(), actorId: me, text: "Raised from " + c.id + ", " + r.check + "." }], live: true };
        all.unshift(item); made.push(id);
        patchResult(rid, { action: "Moved to remediation " + id });
      });
      APP.actions.patch("cb.remediation", all);
      C.checks.update(c.id, { status: "Confirmed", confirmedBy: me, confirmedAt: APP.nowIso() });
      APP.audit({ action: "Check results confirmed", item: c.id, detail: made.length ? "Moved to remediation: " + made.join(", ") : "No gaps moved", dataClass: c.dataClass });
      APP.toast.success("Results confirmed." + (made.length ? " " + made.join(", ") + " added to the remediation register." : ""));
      confirmS[1](false);
    }
    var columns = [
      { title: "Result", dataIndex: "outcome", key: "outcome", render: function (v) { return html`<${St} status=${v} />`; } },
      { title: "Check", dataIndex: "check", key: "check", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
      { title: "Risk", dataIndex: "rating", key: "rating", render: function (v) { return v === "Not rated" ? html`<span style=${{ opacity: 0.6 }}>Not rated</span>` : html`<${SevTag} sev=${v} />`; } },
      { title: "Finding", dataIndex: "finding", key: "finding", width: 320, render: function (v, r) { return html`<span>${v}${r.edited ? html`<${A.Tag} style=${{ marginLeft: 6 }}>Edited<//>` : null}</span>`; } }
    ];
    var expanded = function (r) {
      return html`<div style=${{ padding: "4px 0" }}>
        <${APP.KeyFacts} column=${1} items=${[["Source", r.source], ["Basis", html`<span>${r.basis}${r.cite ? html`<${APP.CitationChip} n=${1} cite=${r.cite} />` : null}</span>`], ["Recommended action", r.action]]} />
        ${!confirmed && canAct ? html`<${A.Flex} gap=${8} wrap="wrap" style=${{ marginTop: 10 }}>
          ${editS[0] === r.id ? html`<div style=${{ width: "100%" }}>
            <${A.Input.TextArea} rows=${2} value=${editText[0]} onChange=${function (e) { editText[1](e.target.value); }} />
            <${A.Flex} gap=${8} style=${{ marginTop: 6 }}>
              <${A.Button} size="small" type="primary" onClick=${function () { patchResult(r.id, { finding: editText[0], edited: true }); editS[1](null); APP.audit({ action: "Check result edited", item: c.id, detail: r.check, dataClass: c.dataClass }); APP.toast.success("Finding updated. The original draft is kept in the history."); }}>Save<//>
              <${A.Button} size="small" onClick=${function () { editS[1](null); }}>Cancel<//>
            <//>
          </div>` : html`<${A.Button} size="small" icon=${html`<${Icon} name="EditOutlined" />`} onClick=${function () { editS[1](r.id); editText[1](r.finding); }}>Edit finding<//>`}
          <${A.Select} size="small" value=${r.outcome} style=${{ minWidth: 170 }} onChange=${function (v) { patchResult(r.id, { outcome: v, edited: true }); APP.toast.info("Result set to " + v + "."); }}
            options=${["Passed", "Gap", "Can't be assessed"].map(function (x) { return { value: x, label: x }; })} />
          ${r.outcome === "Can't be assessed" ? html`<${A.Button} size="small" disabled=${!!r.requested} onClick=${function () {
            patchResult(r.id, { requested: true }); APP.audit({ action: "Material requested", item: c.id, detail: r.action, dataClass: c.dataClass });
            APP.toast.build("Request sent. In the build, the department gets a task and an email with a secure upload link, and the item shows as waiting for material."); }}>${r.requested ? "Material requested" : "Request material"}<//>` : null}
        <//>` : null}
      </div>`;
    };
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${880} title=${c.title} subtitle=${c.id + " · " + c.subject}
      tags=${html`<${Fragment}><${St} status=${c.status} /><${APP.DataClassTag} cls=${c.dataClass} /><//>`}
      actions=${html`<${Fragment}>
        <${A.Button} icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${function () { APP.toast.build("In the build, the check exports to Word or PDF with each check, finding, source, basis and reviewer."); }}>Export<//>
        ${c.status === "Results to confirm" ? html`<${ActBtn} roles=${["compliance"]} type="primary" onClick=${function () { selS[1](gaps.map(function (g) { return g.id; })); confirmS[1](true); }}>Confirm results<//>` : null}
      <//>`}>
      <${A.Steps} size="small" current=${stage} style=${{ marginBottom: 16 }} items=${[{ title: "Materials" }, { title: "Checks run" }, { title: "Review" }, { title: "Confirmed" }, { title: "Remediation" }]} />
      <${APP.KeyFacts} column=${DCOL} items=${[["Area", c.area], ["Period", c.period], ["Started", fmt.dateTime(c.createdAt) + " by " + APP.personName(c.ownerId)], ["Model", c.model + " (inside the CICT VPC)"],
        ["Checked against", c.basis.join("; ")], ["Materials", c.materials.join("; ")], c.confirmedBy ? ["Confirmed", APP.personName(c.confirmedBy) + ", " + fmt.dateTime(c.confirmedAt)] : null]} />
      ${c.status === "Running" ? html`<div style=${{ marginTop: 16 }}>
        <${A.Flex} gap=${8} align="center"><${APP.TypingIndicator} label="Running checks on Qwen (self-hosted)" /><//>
        <${A.Skeleton} active paragraph=${{ rows: 4 }} />
      </div>` : html`<div>
        <${SectionTitle}>Results<//>
        ${c.status === "Results to confirm" ? html`<${Note} type="warning" title="Draft results">Review each result, edit findings where needed, then confirm. Confirmed gaps move to the remediation register with a department, person, action and deadline.<//>` : null}
        <div className="table-scroll"><${A.Table} size="small" rowKey="id" pagination=${false} dataSource=${c.results} columns=${columns}
          expandable=${{ expandedRowRender: expanded, expandRowByClick: true }} rowClassName="clickable-row" /></div>
      </div>`}
      <${A.Modal} open=${confirmS[0]} onCancel=${function () { confirmS[1](false); }} title="Confirm results" okText="Confirm and move to remediation" onOk=${confirmAll} destroyOnHidden=${true}>
        <p>Select the confirmed gaps to move to the remediation register.</p>
        ${gaps.length ? html`<${A.Checkbox.Group} value=${selS[0]} onChange=${selS[1]} style=${{ display: "flex", flexDirection: "column", gap: 8 }}
          options=${gaps.map(function (g) { return { value: g.id, label: g.check + ": " + g.finding }; })} />` : html`<p>No gaps to move.</p>`}
        ${c.results.some(function (r) { return r.outcome === "Can't be assessed"; }) ? html`<${Note} type="warning" title="Some items can't be assessed" style=${{ marginTop: 12 }}>They stay open on the check until the material arrives. They are not treated as compliant.<//>` : null}
      <//>
    <//>`;
  }

  /* ---------- Control tests (3.4.4) ---------- */
  function ControlsTab(props) {
    var C = props.cols;
    var newOpen = useState(false);
    var columns = [
      APP.col.id("Test", "id"),
      { title: "Control", dataIndex: "control", key: "control", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
      APP.col.text("Area", "area"), APP.col.text("Period", "period"),
      { title: "Samples", dataIndex: "sampleSummary", key: "samples", render: function (v) { return v.tested ? html`<span className="nowrap">${v.tested + " tested, "}<b>${v.exceptions + " exceptions"}</b></span>` : html`<span style=${{ opacity: 0.6 }}>Not started</span>`; } },
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } },
      { title: "Result", dataIndex: "result", key: "result", render: function (v) { return v ? html`<${St} status=${v} />` : html`<span style=${{ opacity: 0.6 }}>Pending</span>`; } },
      APP.col.text("Reviewer", "reviewer")
    ];
    return html`<div>
      <${Note} title="Internal control testing" action=${html`<${APP.SowRef} sec="3.4.4" />`}>The Compliance officer sets the checks, sampling rule, materials and reviewer. Departments upload material against the test. Items close only after review by the designated person.<//>
      <${APP.DataTable} columns=${columns} data=${C.controls.list} searchKeys=${["id", "control", "area"]} searchPlaceholder="Search control tests"
        filters=${[{ key: "status", label: "Status" }, { key: "result", label: "Result", width: 170 }]} onRowClick=${function (r) { props.onOpen("control", r.id); }}
        toolbar=${html`<${ActBtn} roles=${["compliance"]} type="primary" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { newOpen[1](true); }}>New control test<//>`} />
      ${newOpen[0] ? html`<${NewControlModal} onClose=${function () { newOpen[1](false); }} onOpen=${props.onOpen} />` : null}
    </div>`;
  }

  function NewControlModal(props) {
    var me = useMe();
    var f = useState({ control: "Contract renewals approved before the notice date", area: "Legal", period: "Q4 2026", sampling: "All renewals with a notice date in the period", materials: ["Renewal approvals", "Notice letters"] });
    var tried = useState(false);
    function set(k, v) { var n = Object.assign({}, f[0]); n[k] = v; f[1](n); }
    function create() {
      tried[1](true);
      if (!f[0].control.trim()) return;
      var id = nextNum(colNow("controls"), "CT-2026-", 2);
      addTo("controls", { id: id, control: f[0].control, area: f[0].area, period: f[0].period, stage: 0, status: "Planned", result: null, sampling: f[0].sampling, testerId: me, reviewer: "S. Ratnam, Head of Risk (sample)",
        materials: f[0].materials.map(function (m, i) { return { id: "M" + (i + 1), item: m, from: f[0].area, requested: null, status: "Not requested" }; }),
        samples: [], sampleSummary: { tested: 0, passed: 0, exceptions: 0, waiting: 0 }, records: [], live: true });
      APP.audit({ action: "Control test created", item: id, detail: f[0].control, dataClass: "Internal" });
      APP.toast.success(id + " created. Start testing to request the materials.");
      props.onClose(); props.onOpen("control", id);
    }
    return html`<${A.Modal} open=${true} onCancel=${props.onClose} title="New control test" okText="Create test" onOk=${create} width=${620} destroyOnHidden=${true}>
      <${Field} label="Control to test" required=${true} error=${tried[0] && !f[0].control.trim() ? "Name the control." : null}><${A.Input} value=${f[0].control} onChange=${function (e) { set("control", e.target.value); }} /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} md=${12}><${Field} label="Area"><${A.Select} value=${f[0].area} onChange=${function (v) { set("area", v); }} style=${{ width: "100%" }} options=${["Legal", "Procurement", "Finance", "Engineering", "Commercial", "HR"].map(function (x) { return { value: x, label: x }; })} /><//><//>
        <${A.Col} xs=${24} md=${12}><${Field} label="Period"><${A.Select} value=${f[0].period} onChange=${function (v) { set("period", v); }} style=${{ width: "100%" }} options=${["Q4 2026", "H2 2026", "2026"].map(function (x) { return { value: x, label: x }; })} /><//><//>
      <//>
      <${Field} label="Sampling rule"><${A.Input} value=${f[0].sampling} onChange=${function (e) { set("sampling", e.target.value); }} /><//>
      <${Field} label="Materials required" help="Type and press Enter to add."><${A.Select} mode="tags" value=${f[0].materials} onChange=${function (v) { set("materials", v); }} style=${{ width: "100%" }} /><//>
      <${Field} label="Reviewer"><${A.Input} value="S. Ratnam, Head of Risk (sample)" disabled=${true} /><//>
    <//>`;
  }

  function ControlDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var C = props.cols;
    var t = C.controls.get(props.id);
    var tabS = useState("samples");
    var recKind = useState("Interview");
    var recText = useState("");
    var reqOpen = useState(false);
    var reqF = useState({ item: "", from: "Procurement (D. Fonseka)" });
    var resS = useState(t && t.result ? t.result : "Partially effective");
    var resText = useState("");
    if (!t) return null;
    var canAct = me === "compliance";
    var done = t.status === "Completed";
    function hist(kind, text, extra) { C.controls.update(t.id, function (x) { return Object.assign({ records: x.records.concat([{ at: APP.nowIso(), actorId: me, kind: kind, text: text }]) }, extra || {}); }); }
    function setSample(sid, result) {
      C.controls.update(t.id, function (x) {
        var samples = x.samples.map(function (s) { return s.id === sid ? Object.assign({}, s, { result: result, evidence: s.evidence + (result === "Pass" ? "; evidence accepted" : "; recorded as an exception") }) : s; });
        var sum = Object.assign({}, x.sampleSummary);
        sum.waiting = Math.max(0, sum.waiting - 1); sum.tested += 1; if (result === "Pass") sum.passed += 1; else sum.exceptions += 1;
        return { samples: samples, sampleSummary: sum };
      });
      APP.audit({ action: "Test step recorded", item: t.id, detail: sid + ": " + result, dataClass: "Internal" });
      APP.toast.success(sid + " recorded as " + (result === "Pass" ? "a pass." : "an exception."));
    }
    function raiseRem() {
      var id = nextNum(colNow("remediation"), "RM-2026-", 2);
      addTo("remediation", { id: id, title: t.control + ": exceptions found", source: "Control test " + t.id, sourceRoute: "compliance", sourceId: t.id, dept: t.area.split(" ")[0], ownerName: DEPT_OWNER[t.area.split(" ")[0]] || "Department head",
        ownerId: DEPT_PERSONA[t.area.split(" ")[0]] || null, action: "Fix the control so it cannot be bypassed and retest next quarter.", due: dayjs(APP.nowIso()).add(45, "day").format("YYYY-MM-DD"), status: "Open", risk: "High",
        evidence: [], history: [{ at: APP.nowIso(), actorId: me, text: "Raised from " + t.id + "." }], live: true });
      hist("Remediation", "Raised " + id + " for the exceptions.", { remediationId: id });
      APP.audit({ action: "Remediation raised", item: id, detail: "From " + t.id, dataClass: "Internal" });
      APP.toast.success(id + " added to the remediation register.");
    }
    var samples = html`<div>
      <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 12 }}>
        ${[["Tested", t.sampleSummary.tested], ["Passed", t.sampleSummary.passed], ["Exceptions", t.sampleSummary.exceptions], ["Waiting", t.sampleSummary.waiting]].map(function (x) {
          return html`<${A.Col} key=${x[0]} xs=${12} md=${6}><${A.Card} size="small"><${A.Statistic} title=${x[0]} value=${x[1]} /><//><//>`;
        })}
      <//>
      ${t.samples.length ? html`<div className="table-scroll"><${A.Table} size="small" rowKey="id" pagination=${false} dataSource=${t.samples}
        expandable=${{ expandRowByClick: true, expandedRowRender: function (s) {
          return html`<div>
            <${APP.KeyFacts} column=${1} items=${[["Evidence", s.evidence], ["Test step", "Compare the change or approval with the log and the authority rules in force on " + fmt.date(s.date) + "."]]} />
            ${s.result === "Waiting" && !done ? html`<${A.Flex} gap=${8} style=${{ marginTop: 8 }}>
              <${ActBtn} roles=${["compliance"]} size="small" type="primary" onClick=${function () { setSample(s.id, "Pass"); }}>Record pass<//>
              <${ActBtn} roles=${["compliance"]} size="small" danger=${true} onClick=${function () { setSample(s.id, "Exception"); }}>Record exception<//>
            <//>` : null}
          </div>`;
        } }} rowClassName="clickable-row"
        columns=${[
          { title: "Item", dataIndex: "id", key: "id", render: function (v) { return html`<span className="mono nowrap">${v}</span>`; } },
          { title: "Party", dataIndex: "vendor", key: "vendor" },
          { title: "Date", dataIndex: "date", key: "date", render: function (v) { return html`<span className="nowrap">${fmt.date(v)}</span>`; } },
          { title: "Amount", dataIndex: "amount", key: "amount", align: "right", render: function (v) { return fmt.usd(v); } },
          { title: "Result", dataIndex: "result", key: "result", render: function (v) { return html`<${St} status=${v} />`; } }]} /></div>
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 6 }}>${"Showing " + t.samples.length + " of " + (t.sampleSummary.tested + t.sampleSummary.waiting) + " sampled items. Sampling rule: " + t.sampling + "."}</div>`
        : html`<${APP.EmptyHint} title="No samples yet" description=${"Sampling rule: " + t.sampling + ". Samples are drawn when testing starts."}
            action=${t.status === "Planned" ? html`<${ActBtn} roles=${["compliance"]} type="primary" onClick=${function () {
              C.controls.update(t.id, function (x) { return { status: "In progress", stage: 1, materials: x.materials.map(function (m) { return Object.assign({}, m, { status: "Outstanding", requested: APP.nowIso().slice(0, 10), due: dayjs(APP.nowIso()).add(7, "day").format("YYYY-MM-DD") }); }) }; });
              hist("Status", "Testing started. Materials requested from " + t.area + ".");
              APP.audit({ action: "Control test started", item: t.id, detail: t.control, dataClass: "Internal" });
              APP.toast.success("Testing started. Materials requested; the department sees the request in its workspace."); }}>Start testing<//>` : null} />`}
    </div>`;
    var materials = html`<div>
      <div className="table-scroll"><${A.Table} size="small" rowKey="id" pagination=${false} dataSource=${t.materials} rowClassName="clickable-row"
        onRow=${function (m) { return { onClick: function () { if (m.file) APP.toast.build("In the build, " + m.file + " opens in the viewer."); else APP.toast.info(m.item + " is " + m.status.toLowerCase() + ". The department is reminded automatically before the due date."); } }; }}
        columns=${[
          { title: "Material", dataIndex: "item", key: "item" },
          { title: "From", dataIndex: "from", key: "from" },
          { title: "Requested", dataIndex: "requested", key: "requested", render: function (v) { return v ? html`<span className="nowrap">${fmt.date(v)}</span>` : "Not yet"; } },
          { title: "Due", dataIndex: "due", key: "due", render: function (v) { return v ? html`<${DueText} date=${v} />` : ""; } },
          { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } }]} /></div>
      <div style=${{ marginTop: 10 }}><${ActBtn} roles=${["compliance"]} icon=${html`<${Icon} name="PlusOutlined" />`} disabled=${done} onClick=${function () { reqOpen[1](true); }}>Request more material<//></div>
      <${A.Modal} open=${reqOpen[0]} onCancel=${function () { reqOpen[1](false); }} title="Request more material" okText="Send request" destroyOnHidden=${true}
        onOk=${function () {
          if (!reqF[0].item.trim()) { APP.toast.warn("Say what material you need."); return; }
          C.controls.update(t.id, function (x) { return { materials: x.materials.concat([{ id: "M" + (x.materials.length + 1), item: reqF[0].item, from: reqF[0].from, requested: APP.nowIso().slice(0, 10), due: dayjs(APP.nowIso()).add(5, "day").format("YYYY-MM-DD"), status: "Outstanding" }]) }; });
          hist("Request", "Requested: " + reqF[0].item + " from " + reqF[0].from + ".");
          APP.audit({ action: "Material requested", item: t.id, detail: reqF[0].item, dataClass: "Internal" });
          APP.toast.build("Request sent. In the build, " + reqF[0].from + " gets a task and an email with a secure upload link.");
          reqOpen[1](false); reqF[1]({ item: "", from: reqF[0].from });
        }}>
        <${Field} label="Material" required=${true}><${A.Input} value=${reqF[0].item} onChange=${function (e) { reqF[1](Object.assign({}, reqF[0], { item: e.target.value })); }} placeholder="For example: call-back recordings for VBC-0463" /><//>
        <${Field} label="From"><${A.Select} value=${reqF[0].from} onChange=${function (v) { reqF[1](Object.assign({}, reqF[0], { from: v })); }} style=${{ width: "100%" }}
          options=${["Procurement (D. Fonseka)", "Finance (H. Kumara)", "Engineering (T. Bandara)", "Legal (N. Perera)", "HR (C. de Mel)"].map(function (x) { return { value: x, label: x }; })} /><//>
      <//>
    </div>`;
    var records = html`<div>
      <${Events} items=${t.records.map(function (r) { return { at: r.at, actorId: r.actorId, kind: r.kind, text: r.text }; })} />
      ${done ? null : html`<div style=${{ marginTop: 8 }}>
        <${A.Flex} gap=${8} wrap="wrap" style=${{ marginBottom: 8 }}>
          <${A.Segmented} size="small" value=${recKind[0]} onChange=${recKind[1]} options=${["Interview", "Process walk-through", "Evidence assessment"]} />
        <//>
        <${A.Input.TextArea} rows=${3} value=${recText[0]} onChange=${function (e) { recText[1](e.target.value); }} placeholder="Who you spoke to or what you observed" disabled=${!canAct} />
        <div style=${{ marginTop: 8 }}><${ActBtn} roles=${["compliance"]} type="primary" disabled=${!recText[0].trim()} onClick=${function () { hist(recKind[0], recText[0].trim()); recText[1](""); APP.toast.success(recKind[0] + " record added."); }}>Add record<//></div>
      </div>`}
    </div>`;
    var conclusion = done ? html`<${A.Result} status=${t.result === "Effective" ? "success" : t.result === "Not effective" ? "error" : "warning"} title=${t.result}
        subTitle=${"Reviewed and closed by " + t.reviewer + (t.closedAt ? ", " + fmt.date(t.closedAt) : "")}
        extra=${t.remediationId || /RM-/.test((t.records[t.records.length - 1] || {}).text || "") ? html`<${A.Button} onClick=${function () { var m = /RM-\d{4}-\d{2}/.exec(JSON.stringify(t.records)); if (m) props.onOpen("rem", m[0]); }}>Open remediation<//>` : null} />`
      : t.status === "In review" ? html`<${A.Result} status="info" title="Waiting for the reviewer" subTitle=${"Submitted as " + t.result + ". " + t.reviewer + " reviews the test record before it closes."}
        extra=${html`<${A.Flex} gap=${8} wrap="wrap" justify="center">
          <${A.Button} onClick=${function () { APP.toast.build("In the build, the reviewer gets a task. They can return the test with questions or approve and close it."); }}>What the reviewer sees<//>
          <${ActBtn} roles=${["compliance"]} type="primary" onClick=${function () { hist("Conclusion", t.result + ". Reviewed and closed by " + t.reviewer + ".", { status: "Completed", stage: 4, closedAt: APP.nowIso().slice(0, 10) }); APP.audit({ action: "Control test closed", item: t.id, detail: t.result + ", reviewed by " + t.reviewer, dataClass: "Internal" }); APP.toast.success(t.id + " closed after review."); }}>Record reviewer sign-off (demo)<//>
        <//>`} />`
      : html`<div>
        <${Field} label="Test result" required=${true}>
          <${A.Radio.Group} optionType="button" buttonStyle="solid" value=${resS[0]} onChange=${function (e) { resS[1](e.target.value); }} options=${["Effective", "Partially effective", "Not effective"].map(function (x) { return { value: x, label: x }; })} />
        <//>
        <${Field} label="Basis for the result" required=${true}><${A.Input.TextArea} rows=${3} value=${resText[0]} onChange=${function (e) { resText[1](e.target.value); }} placeholder="For example: 2 of 22 changes had no call-back from a known number; the system does not block payment." /><//>
        ${t.sampleSummary.waiting ? html`<${Note} type="warning" title=${t.sampleSummary.waiting + " samples are still waiting for evidence"}>You can submit now; the waiting items are listed in the test record as not tested.<//>` : null}
        <${A.Flex} gap=${8} wrap="wrap">
          <${ActBtn} roles=${["compliance"]} type="primary" disabled=${t.status === "Planned"} onClick=${function () {
            if (resText[0].trim().length < 15) { APP.toast.warn("Write the basis for the result first."); return; }
            hist("Conclusion", "Submitted for review as " + resS[0] + ". " + resText[0].trim(), { status: "In review", stage: 3, result: resS[0] });
            APP.audit({ action: "Control test submitted", item: t.id, detail: resS[0], dataClass: "Internal" });
            APP.toast.success("Submitted to " + t.reviewer + " for review."); }}>Submit for review<//>
          ${t.sampleSummary.exceptions && !t.remediationId ? html`<${ActBtn} roles=${["compliance"]} onClick=${raiseRem}>Raise remediation item<//>` : null}
          ${t.remediationId ? html`<${A.Button} onClick=${function () { props.onOpen("rem", t.remediationId); }}>${"Open " + t.remediationId}<//>` : null}
        <//>
      </div>`;
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${860} title=${t.control} subtitle=${t.id + " · " + t.area + " · " + t.period}
      tags=${html`<${Fragment}><${St} status=${t.status} />${t.result ? html`<${St} status=${t.result} />` : null}<//>`}>
      <${A.Steps} size="small" current=${t.stage} style=${{ marginBottom: 16 }} items=${[{ title: "Plan" }, { title: "Materials" }, { title: "Testing" }, { title: "Review" }, { title: "Closed" }]} />
      <${APP.KeyFacts} column=${DCOL} items=${[["Sampling rule", t.sampling], ["Tester", APP.personName(t.testerId)], ["Reviewer", t.reviewer], ["Materials", t.materials.length + " requested items"]]} />
      <${A.Tabs} activeKey=${tabS[0]} onChange=${tabS[1]} style=${{ marginTop: 8 }} items=${[
        { key: "samples", label: "Samples", children: samples },
        { key: "materials", label: "Materials (" + t.materials.length + ")", children: materials },
        { key: "records", label: "Manual records", children: records },
        { key: "conclusion", label: "Result", children: conclusion }]} />
    <//>`;
  }

  /* ---------- Remediation register ---------- */
  var REM_FILES = ["Corrective action plan.docx", "Updated procedure.pdf", "Training attendance list.xlsx", "System change ticket.pdf", "Recovery receipt.pdf"];
  function RemediationTab(props) {
    var C = props.cols;
    var rows = C.rem.list.map(function (r) { return Object.assign({}, r, { _status: remStatus(r) }); });
    var count = function (s) { return rows.filter(function (r) { return r._status === s; }).length; };
    var columns = [
      APP.col.id("Item", "id"),
      { title: "Issue", dataIndex: "title", key: "title", width: 280, render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${r.source}</div></div>`; } },
      APP.col.text("Department", "dept"), APP.col.text("Responsible", "ownerName"),
      { title: "Deadline", dataIndex: "due", key: "due", render: function (v, r) { return html`<${DueText} date=${v} done=${r.status === "Closed"} />`; }, sorter: function (a, b) { return a.due.localeCompare(b.due); } },
      { title: "Risk", dataIndex: "risk", key: "risk", render: function (v) { return html`<${SevTag} sev=${v} />`; } },
      { title: "Status", dataIndex: "_status", key: "_status", render: function (v) { return html`<${St} status=${v} />`; } }
    ];
    return html`<div>
      <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 12 }}>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Open or in progress" value=${count("Open") + count("In progress")} icon="ToolOutlined" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Overdue" value=${count("Overdue")} icon="ClockCircleOutlined" color=${count("Overdue") ? "colorError" : null} /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Evidence to review" value=${count("Evidence submitted")} icon="FileSearchOutlined" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Closed after review" value=${count("Closed")} icon="CheckCircleOutlined" /><//>
      <//>
      <${APP.DataTable} columns=${columns} data=${rows} searchKeys=${["id", "title", "source", "dept", "ownerName"]} searchPlaceholder="Search the register"
        filters=${[{ key: "dept", label: "Department" }, { key: "_status", label: "Status", width: 170 }]} onRowClick=${function (r) { props.onOpen("rem", r.id); }}
        toolbar=${html`<${ActBtn} roles=${["compliance"]} icon=${html`<${Icon} name="BellOutlined" />`} onClick=${function () {
          var due = rows.filter(function (r) { return r._status === "Overdue" || (r.status !== "Closed" && fmt.daysUntil(r.due) <= 14); });
          APP.audit({ action: "Reminders sent", item: "Remediation register", detail: due.map(function (r) { return r.id; }).join(", "), dataClass: "Internal" });
          APP.toast.success("Reminders sent for " + due.length + " items due within 14 days or overdue.");
        }}>Send reminders<//>`} />
    </div>`;
  }

  function RemDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var C = props.cols;
    var r = C.rem.get(props.id);
    var modal = useState(null);
    var text = useState("");
    var files = useState([]);
    var due = useState(null);
    if (!r) return null;
    var st = remStatus(r);
    var isOwner = r.ownerId && r.ownerId === me;
    var canReview = me === "compliance";
    var order = ["Open", "In progress", "Evidence submitted", "Closed"];
    function hist(textLine, patch) { C.rem.update(r.id, function (x) { return Object.assign({ history: x.history.concat([{ at: APP.nowIso(), actorId: me, text: textLine }]) }, patch || {}); }); }
    function submitEvidence() {
      if (!files[0].length) { APP.toast.warn("Choose at least one file."); return; }
      var ev = files[0].map(function (f) { return { name: f, meta: "Uploaded by " + APP.personName(me) + ", " + fmt.date(APP.nowIso()) }; });
      hist("Evidence submitted: " + files[0].join(", ") + (text[0].trim() ? ". " + text[0].trim() : ""), { evidence: r.evidence.concat(ev), status: "Evidence submitted" });
      APP.audit({ action: "Remediation evidence", item: r.id, detail: files[0].length + " files", dataClass: "Internal" });
      APP.notify({ to: ["compliance"], kind: "review", title: "Evidence to review: " + r.id, body: APP.personName(me) + " submitted evidence for " + r.title + ".", route: "compliance", params: { id: r.id }, phase: 2 });
      APP.toast.success("Evidence submitted. R. Fernando reviews it before the item can close.");
      modal[1](null); files[1]([]); text[1]("");
    }
    function closeItem() {
      if (text[0].trim().length < 10) { APP.toast.warn("Write the review conclusion first."); return; }
      hist("Reviewed and closed: " + text[0].trim(), { status: "Closed", closedBy: me, closedAt: APP.nowIso() });
      APP.audit({ action: "Remediation closed", item: r.id, detail: "After review: " + text[0].trim(), dataClass: "Internal" });
      if (r.ownerId) APP.notify({ to: [r.ownerId], kind: "info", title: "Remediation closed: " + r.id, body: "Closed after review by " + APP.personName(me) + ".", route: "compliance", params: { id: r.id }, phase: 2 });
      APP.toast.success(r.id + " closed after review. The handling record is kept.");
      modal[1](null); text[1]("");
    }
    function returnItem() {
      if (text[0].trim().length < 10) { APP.toast.warn("Say what is missing."); return; }
      hist("Evidence returned: " + text[0].trim(), { status: "In progress" });
      APP.audit({ action: "Remediation evidence returned", item: r.id, detail: text[0].trim(), dataClass: "Internal" });
      if (r.ownerId) APP.notify({ to: [r.ownerId], kind: "alert", title: "Evidence returned: " + r.id, body: text[0].trim(), route: "compliance", params: { id: r.id }, phase: 2 });
      APP.toast.success("Returned to " + r.ownerName + " with your comment.");
      modal[1](null); text[1]("");
    }
    function extend() {
      if (!due[0] || text[0].trim().length < 5) { APP.toast.warn("Pick a new date and give a reason."); return; }
      hist("Deadline moved from " + fmt.date(r.due) + " to " + fmt.date(due[0]) + ": " + text[0].trim(), { due: due[0] });
      APP.audit({ action: "Remediation deadline changed", item: r.id, detail: fmt.date(r.due) + " to " + fmt.date(due[0]), dataClass: "Internal" });
      APP.toast.success("Deadline moved to " + fmt.date(due[0]) + ". The change is in the history.");
      modal[1](null); text[1](""); due[1](null);
    }
    var actions = html`<${Fragment}>
      ${st !== "Closed" && (isOwner || canReview) && r.status !== "Evidence submitted" ? html`<${A.Button} type="primary" onClick=${function () { modal[1]("evidence"); }}>${isOwner ? "Submit evidence" : "Upload evidence for owner"}<//>` : null}
      ${r.status === "Evidence submitted" ? html`<${ActBtn} roles=${["compliance"]} type="primary" onClick=${function () { modal[1]("close"); }}>Review and close<//>` : null}
      ${r.status === "Evidence submitted" ? html`<${ActBtn} roles=${["compliance"]} onClick=${function () { modal[1]("return"); }}>Return<//>` : null}
      ${st !== "Closed" ? html`<${A.Dropdown} trigger=${["click"]} menu=${{ items: [{ key: "remind", label: "Send reminder", icon: html`<${Icon} name="BellOutlined" />`, disabled: !canReview }, { key: "extend", label: "Change deadline", icon: html`<${Icon} name="CalendarOutlined" />`, disabled: !canReview }],
        onClick: function (info) {
          if (info.key === "remind") { hist("Reminder sent to " + r.ownerName + "."); APP.audit({ action: "Reminder sent", item: r.id, detail: r.ownerName, dataClass: "Internal" }); APP.toast.success("Reminder sent to " + r.ownerName + " by email and in-app."); }
          else modal[1]("extend");
        } }}><${A.Button} icon=${html`<${Icon} name="MoreOutlined" />`} aria-label="More actions" /><//>` : null}
    <//>`;
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${760} title=${r.title} subtitle=${r.id + " · " + r.dept}
      tags=${html`<${Fragment}><${St} status=${st} /><${SevTag} sev=${r.risk} /><//>`} actions=${actions}>
      <${A.Steps} size="small" current=${order.indexOf(r.status)} status=${st === "Overdue" ? "error" : undefined} style=${{ marginBottom: 16 }} items=${order.map(function (s) { return { title: s }; })} />
      ${st === "Overdue" ? html`<${Note} type="error" title=${"Overdue since " + fmt.date(r.due)}>Reminders go to the responsible person and their manager every 3 days until evidence is submitted.<//>` : null}
      <${APP.KeyFacts} column=${DCOL} items=${[["Responsible", r.ownerName + ", " + r.dept], ["Deadline", html`<${DueText} date=${r.due} done=${r.status === "Closed"} />`], ["Source", html`<a onClick=${function () { var k = kindOf(r.sourceId); if (k) props.onOpen(k, r.sourceId); }}>${r.source}</a>`],
        ["Closed", r.closedBy ? APP.personName(r.closedBy) + ", " + fmt.date(r.closedAt) : "Not yet"]]} />
      <${SectionTitle}>Corrective action<//>
      <div style=${{ padding: 12, borderRadius: 8, background: tok.colorFillQuaternary }}>${r.action}</div>
      <${SectionTitle}>Evidence submitted<//>
      ${r.evidence.length ? html`<${A.Flex} wrap="wrap" gap=${8}>${r.evidence.map(function (e, i) { return html`<${APP.FileChip} key=${i} name=${e.name} meta=${e.meta} onClick=${function () { APP.toast.build("In the build, " + e.name + " opens in the viewer."); }} />`; })}<//>`
        : html`<${APP.EmptyHint} title="No evidence yet" description="The responsible person uploads evidence; the item closes only after review by the Compliance officer." />`}
      <${SectionTitle}>Handling record<//>
      <${Events} items=${r.history} />
      <${A.Modal} open=${!!modal[0]} onCancel=${function () { modal[1](null); }} destroyOnHidden=${true}
        title=${modal[0] === "evidence" ? "Submit evidence" : modal[0] === "close" ? "Review and close" : modal[0] === "return" ? "Return the evidence" : "Change the deadline"}
        okText=${modal[0] === "evidence" ? "Submit" : modal[0] === "close" ? "Close item" : modal[0] === "return" ? "Return" : "Save"}
        onOk=${modal[0] === "evidence" ? submitEvidence : modal[0] === "close" ? closeItem : modal[0] === "return" ? returnItem : extend}>
        ${modal[0] === "evidence" ? html`<div>
          <${Field} label="Files" required=${true}><${A.Checkbox.Group} value=${files[0]} onChange=${files[1]} style=${{ display: "flex", flexDirection: "column", gap: 6 }} options=${REM_FILES} /><//>
          <${Field} label="Note"><${A.Input.TextArea} rows=${2} value=${text[0]} onChange=${function (e) { text[1](e.target.value); }} placeholder="What the evidence shows" /><//>
        </div>` : modal[0] === "extend" ? html`<div>
          <${Field} label="New deadline" required=${true}><${A.DatePicker} value=${due[0] ? dayjs(due[0]) : null} format="D MMM YYYY" onChange=${function (d) { due[1](d ? d.format("YYYY-MM-DD") : null); }} /><//>
          <${Field} label="Reason" required=${true}><${A.Input.TextArea} rows=${2} value=${text[0]} onChange=${function (e) { text[1](e.target.value); }} /><//>
        </div>` : html`<${Field} label=${modal[0] === "close" ? "Review conclusion" : "What is missing"} required=${true}>
          <${A.Input.TextArea} rows=${3} value=${text[0]} onChange=${function (e) { text[1](e.target.value); }} placeholder=${modal[0] === "close" ? "For example: procedure v1.1 issued and briefing held for all three departments." : "For example: the attendance list does not cover Procurement."} />
        <//>`}
      <//>
    <//>`;
  }

  /* ---------- Approval authority (3.4.5) ---------- */
  function AuthorityTab(props) {
    var C = props.cols;
    var period = useState("Oct 2026");
    var pos = useState("All key positions");
    var person = useState("");
    var running = useState(false);
    var last = APP.useShared("cb.kpaLastRun", { at: "2026-11-09T22:30", approvals: 4812, alerts: 2 });
    function run() {
      running[1](true);
      setTimeout(function () {
        running[1](false);
        var n = period[0] === "Oct 2026" ? 1288 : period[0] === "Q3 2026" ? 3524 : 4812;
        last[1]({ at: APP.nowIso(), approvals: n, alerts: 0 });
        APP.audit({ action: "Approval check run", item: "Key positions", detail: period[0] + ", " + pos[0] + (person[0] ? ", " + person[0] : "") + ": " + n + " approvals, 0 new alerts", dataClass: "Internal" });
        APP.toast.success(fmt.number(n) + " approvals checked against the rules in force on each approval date. No new alerts.");
      }, 1300);
    }
    var columns = [
      APP.col.id("Alert", "id"),
      { title: "Type", dataIndex: "type", key: "type", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
      { title: "Severity", dataIndex: "severity", key: "severity", render: function (v) { return html`<${SevTag} sev=${v} />`; } },
      { title: "Approval record", dataIndex: "record", key: "record", render: function (v, r) { return html`<div><div>${v}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${r.recordDetail}</div></div>`; } },
      APP.col.text("Position", "position"),
      APP.col.date("Approved", "approvedAt"),
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v === "Confirmed" ? "Breach confirmed" : v} />`; } }
    ];
    return html`<div>
      <${Note} title="Approval checks for key positions" action=${html`<${APP.SowRef} sec="3.4.5" />`}>Each alert links to the approval record and the authority rule in force on that date, including approvals after a person left.<//>
      <${A.Card} size="small" title="Run a check" style=${{ marginBottom: 12 }}>
        <${A.Row} gutter=${[12, 12]} align="bottom">
          <${A.Col} xs=${24} md=${6}><div style=${{ fontSize: 12, marginBottom: 4 }}>Period</div><${A.Select} value=${period[0]} onChange=${period[1]} style=${{ width: "100%" }} options=${["Oct 2026", "Q3 2026", "Jul to Oct 2026"].map(function (x) { return { value: x, label: x }; })} /><//>
          <${A.Col} xs=${24} md=${7}><div style=${{ fontSize: 12, marginBottom: 4 }}>Position</div><${A.Select} value=${pos[0]} onChange=${pos[1]} style=${{ width: "100%" }} options=${["All key positions", "Engineering manager", "Procurement officer", "Commercial executive", "Facilities supervisor"].map(function (x) { return { value: x, label: x }; })} /><//>
          <${A.Col} xs=${24} md=${6}><div style=${{ fontSize: 12, marginBottom: 4 }}>Person (optional)</div><${A.Input} value=${person[0]} onChange=${function (e) { person[1](e.target.value); }} placeholder="Name or user ID" /><//>
          <${A.Col} xs=${24} md=${5}><${ActBtn} roles=${["compliance"]} type="primary" block=${true} loading=${running[0]} onClick=${run}>Run check<//><//>
        <//>
        <div style=${{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>${"Data: position authority list (Delegation of authority v2), HR appointments and leavers to 31 Oct 2026, approval records from the finance and procurement systems. Last run " + fmt.dateTime(last[0].at) + ": " + fmt.number(last[0].approvals) + " approvals, " + last[0].alerts + " new alerts."}</div>
      <//>
      <${APP.DataTable} columns=${columns} data=${C.kpa.list} searchKeys=${["id", "type", "record", "recordDetail", "approver", "position"]} searchPlaceholder="Search approval alerts"
        filters=${[{ key: "type", label: "Type", width: 190 }, { key: "status", label: "Status" }]} onRowClick=${function (r) { props.onOpen("kpa", r.id); }} />
    </div>`;
  }

  function KpaDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var C = props.cols;
    var k = C.kpa.get(props.id);
    var dec = useState("Breach confirmed");
    var rat = useState("");
    if (!k) return null;
    var decided = !!k.conclusion;
    function record() {
      if (rat[0].trim().length < 15) { APP.toast.warn("Write the verification result first."); return; }
      var rid = null;
      if (dec[0] === "Breach confirmed") {
        rid = nextNum(colNow("remediation"), "RM-2026-", 2);
        var dept = k.position.indexOf("Procurement") >= 0 ? "Procurement" : k.position.indexOf("Facilities") >= 0 ? "Facilities" : k.position.indexOf("Commercial") >= 0 ? "Commercial" : "Engineering";
        addTo("remediation", { id: rid, title: k.type + ": " + k.record, source: "Approval check " + k.id, sourceRoute: "compliance", sourceId: k.id, dept: dept, ownerName: DEPT_OWNER[dept], ownerId: DEPT_PERSONA[dept] || null,
          action: "Confirm the transaction retrospectively with the right approver and fix the access or limit in the system.", due: dayjs(APP.nowIso()).add(30, "day").format("YYYY-MM-DD"), status: "Open", risk: k.severity,
          evidence: [], history: [{ at: APP.nowIso(), actorId: me, text: "Raised from " + k.id + "." }], live: true });
      }
      C.kpa.update(k.id, { status: dec[0] === "Breach confirmed" ? "Confirmed" : dec[0], linked: rid || k.linked, conclusion: { decision: dec[0], by: me, at: APP.nowIso(), text: rat[0].trim() } });
      APP.audit({ action: "Approval alert verified", item: k.id, detail: dec[0] + (rid ? ", " + rid : ""), dataClass: "Internal" });
      APP.toast.success(dec[0] + (rid ? ". " + rid + " added to the remediation register." : "."));
    }
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${800} title=${k.type} subtitle=${k.id + " · " + k.record}
      tags=${html`<${Fragment}><${SevTag} sev=${k.severity} /><${St} status=${k.status === "Confirmed" ? "Breach confirmed" : k.status} /><//>`}>
      <${A.Row} gutter=${[12, 12]}>
        <${A.Col} xs=${24} md=${12}><${A.Card} size="small" title="Approval record" style=${{ height: "100%" }}>
          <${APP.KeyFacts} column=${1} bordered=${false} items=${[["Record", k.record], ["Detail", k.recordDetail], ["Approved by", k.approver], ["Position", k.position], ["Approved on", fmt.date(k.approvedAt)], ["Amount", fmt.usd(k.amount)]]} />
        <//><//>
        <${A.Col} xs=${24} md=${12}><${A.Card} size="small" title="Rule in force on that date" style=${{ height: "100%" }}>
          <${APP.KeyFacts} column=${1} bordered=${false} items=${[["Rule", k.rule], ["Limit", k.limit], ["Version", k.ruleVersion], ["Source", html`<span>${APP.citeLabel(k.cite)}<${APP.CitationChip} n=${1} cite=${k.cite} /></span>`]]} />
        <//><//>
      <//>
      <${SectionTitle}>Why it was flagged<//>
      <div style=${{ padding: 12, borderRadius: 8, background: tok.colorWarningBg, border: "1px solid " + tok.colorWarningBorder }}>${k.why}</div>
      ${k.linked ? html`<div style=${{ marginTop: 10 }}>Linked: <a onClick=${function () { var kk = kindOf(k.linked); if (kk) props.onOpen(kk, k.linked); }}>${k.linked}</a></div>` : null}
      <${SectionTitle}>Verification<//>
      ${decided ? html`<${A.Result} status=${k.conclusion.decision === "Explained" ? "success" : "warning"} title=${k.conclusion.decision} subTitle=${"Recorded by " + APP.personName(k.conclusion.by) + ", " + fmt.dateTime(k.conclusion.at)}>
          <div>${k.conclusion.text}</div><//>`
        : me !== "compliance" ? html`<${Note} title="Only the Compliance officer records the verification" action=${html`<${A.Button} size="small" onClick=${function () { switchTo("compliance"); }}>Switch to R. Fernando<//>`} />`
        : html`<div>
          <${Field} label="Result" required=${true}><${A.Radio.Group} optionType="button" buttonStyle="solid" value=${dec[0]} onChange=${function (e) { dec[1](e.target.value); }}
            options=${["Breach confirmed", "Explained", "Need more info"].map(function (x) { return { value: x, label: x }; })} /><//>
          <${Field} label="Verification" required=${true} help="For example: written delegation from the CEO found, dated before the approval."><${A.Input.TextArea} rows=${3} value=${rat[0]} onChange=${function (e) { rat[1](e.target.value); }} /><//>
          <${A.Button} type="primary" onClick=${record}>Record verification<//>
        </div>`}
    <//>`;
  }

  /* ==================================================================
     SANCTIONS SCREENING (route: screening)
     ================================================================== */
  function caseStatusFromHits(c) {
    if (!c.hits.length) return c.status === "Cleared" ? "Cleared" : "No match";
    var ds = c.hits.map(function (h) { return h.decision ? h.decision.value : null; });
    if (ds.indexOf("True match") >= 0) return "True match";
    if (ds.indexOf("Need more info") >= 0) return "Need more info";
    if (ds.every(function (d) { return d === "False positive"; })) return "Cleared";
    return "Open";
  }
  function resultLabel(status) { return status === "Open" ? "Possible match" : status; }
  var GENERIC_WORDS = ["services", "service", "shipping", "marine", "trading", "lines", "line", "agency", "supplies", "logistics", "company", "limited", "group", "holdings", "the", "and", "ltd", "llc", "pvt"];

  function ScreeningScreen(props) {
    var route = APP.useRoute();
    var me = useMe();
    var S = useCol("screening");
    var tabP = APP.useShared("cb.ui.screeningTab", "cases");
    var openS = useState(null);
    var params = props.params || {};
    useEffect(function () {
      if (params.tab) tabP[1](params.tab);
      if (params.id && /^SCR-/.test(params.id)) { tabP[1]("cases"); openS[1]({ id: params.id, hitId: params.hitId || null }); }
    }, [params.id, params.tab, route.at]);
    var open = S.list.filter(function (c) { return c.status === "Open" || c.status === "Need more info"; });
    var hitsToReview = open.reduce(function (n, c) { return n + c.hits.filter(function (h) { return !h.decision; }).length; }, 0);
    function openCase(id, hitId) { tabP[1]("cases"); openS[1]({ id: id, hitId: hitId || null }); }

    return html`<div>
      <${APP.PageHeader} title="Sanctions screening" phase=${2} sow=${["3.4.2"]}
        subtitle="Screen customers, shipping lines and other parties against the OFAC and EU lists approved by the Company. Each possible match is decided by a Compliance officer with a recorded reason."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${function () { APP.navigate("assistant", { conversationId: "CONV-105" }); }}>Ask the assistant<//>
          <${A.Button} icon=${html`<${Icon} name="UploadOutlined" />`} onClick=${function () { tabP[1]("bulk"); }}>Bulk upload<//>
          <${A.Button} type="primary" icon=${html`<${Icon} name="SearchOutlined" />`} onClick=${function () { tabP[1]("search"); }}>Screen an entity<//>
        <//>`} />
      <${Note} type="warning" title="A similar name is not a finding">The system never marks an entity as sanctioned on a similar name alone. A score shows how alike two records look, not how likely a sanction is.<//>
      <${ReadOnlyNote} />
      <${ListStrip} />
      <${A.Row} gutter=${[16, 16]} style=${{ margin: "16px 0" }}>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Cases to decide" value=${open.length} icon="FileSearchOutlined" note=${hitsToReview + " hits waiting"} onClick=${function () { tabP[1]("cases"); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Parties monitored" value="1,284" icon="TeamOutlined" note="Re-screened after every list change" /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Screened this month" value=${fmt.number(212 + S.list.filter(function (c) { return c.live; }).length)} icon="SafetyOutlined" note="Including bulk uploads" /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="True matches, 12 months" value=${S.list.filter(function (c) { return c.status === "True match"; }).length} icon="StopOutlined" color="colorError" note="Business stopped, Legal informed" /><//>
      <//>
      <${A.Tabs} activeKey=${tabP[0]} onChange=${function (k) { tabP[1](k); }} items=${[
        { key: "cases", label: html`<span>Cases <${A.Badge} count=${open.length} size="small" style=${{ marginLeft: 4 }} /></span>`, children: html`<${CasesTab} col=${S} onOpen=${openCase} />` },
        { key: "search", label: "Screen an entity", children: html`<${SearchTab} col=${S} onOpen=${openCase} />` },
        { key: "bulk", label: "Bulk upload", children: html`<${BulkTab} col=${S} onOpen=${openCase} />` },
        { key: "lists", label: "Lists and settings", children: html`<${ListsTab} />` }]} />
      ${openS[0] ? html`<${CaseDrawer} key=${openS[0].id} id=${openS[0].id} hitId=${openS[0].hitId} col=${S} onClose=${function () { openS[1](null); }} />` : null}
    </div>`;
  }

  function ListStrip() {
    var tok = A.theme.useToken().token;
    var refreshed = APP.useShared("cb.listsRefreshed", null);
    return html`<${A.Row} gutter=${[12, 12]}>
      ${CB.lists.map(function (l) {
        return html`<${A.Col} key=${l.id} xs=${24} sm=${12} xl=${6}>
          <${A.Card} size="small" style=${{ height: "100%" }}>
            <${A.Flex} justify="space-between" align="center" gap=${8}>
              <span style=${{ fontWeight: 600 }}>${l.short}</span>
              <${A.Badge} status=${l.status === "Live" ? "success" : "warning"} text=${l.status === "Live" ? "Live" : "Not switched on"} />
            <//>
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>${"Published " + fmt.dateShort(l.published) + " · fetched " + fmt.time(refreshed[0] || l.fetched) + (fmt.daysUntil(refreshed[0] || l.fetched) === 0 ? " today" : "")}</div>
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${fmt.number(l.entries) + " entries" + (l.added || l.removed ? " · +" + l.added + " / -" + l.removed : "")}</div>
          <//>
        <//>`;
      })}
    <//>`;
  }

  function CasesTab(props) {
    var S = props.col;
    var scope = useState("To decide");
    var rows = S.list.filter(function (c) {
      if (scope[0] === "All") return true;
      var openish = c.status === "Open" || c.status === "Need more info";
      return scope[0] === "To decide" ? openish : !openish;
    }).map(function (c) { return Object.assign({}, c, { _result: resultLabel(c.status), _top: c.hits.reduce(function (m, h) { return Math.max(m, h.score); }, 0) }); });
    var columns = [
      APP.col.id("Case", "id"),
      { title: "Entity", dataIndex: "entity", key: "entity", render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${r.role + " · " + r.country}</div></div>`; } },
      { title: "Result", dataIndex: "_result", key: "_result", render: function (v) { return html`<${St} status=${v} />`; } },
      { title: "Hits", dataIndex: "hits", key: "hits", align: "right", render: function (v) { return v.length ? html`<${A.Badge} count=${v.length} color=${v.some(function (h) { return !h.decision; }) ? "orange" : "#8c8c8c"} />` : "0"; } },
      { title: "Top score", dataIndex: "_top", key: "_top", render: function (v) { return v ? html`<div style=${{ width: 110 }}><${A.Progress} percent=${v} size="small" status=${v >= 90 ? "exception" : "normal"} format=${function (p) { return p; }} /></div>` : html`<span style=${{ opacity: 0.6 }}>None</span>`; }, sorter: function (a, b) { return a._top - b._top; } },
      { title: "Linked", dataIndex: "contractId", key: "contractId", render: function (v) { return v ? html`<span className="mono nowrap">${v}</span>` : html`<span style=${{ opacity: 0.6 }}>None</span>`; } },
      { title: "Lists", dataIndex: "lists", key: "lists", render: function (v) { return v.join(", "); } },
      { title: "Screened", dataIndex: "screenedAt", key: "screenedAt", render: function (v) { return html`<span className="nowrap">${fmt.relative(v)}</span>`; } },
      { title: "Assignee", dataIndex: "assigneeId", key: "assigneeId", render: function (v) { return v ? html`<${APP.PersonTag} id=${v} />` : html`<span style=${{ opacity: 0.6 }}>None</span>`; } }
    ];
    return html`<${APP.DataTable} columns=${columns} data=${rows} searchKeys=${["id", "entity", "role", "contractId", "country"]} searchPlaceholder="Search parties or case numbers"
      filters=${[{ key: "_result", label: "Result", width: 150 }, { key: "role", label: "Party type", width: 170 }]}
      toolbar=${html`<${A.Segmented} size="small" value=${scope[0]} onChange=${scope[1]} options=${["To decide", "Decided", "All"]} />`}
      onRowClick=${function (r) { props.onOpen(r.id); }} emptyTitle="No cases in this view" />`;
  }

  var MATCH_TONE = { "Exact": "error", "Similar": "warning", "Different": "success", "Can't compare": "default", "Missing in our record": "processing" };
  var CASE_FILES = ["Certificate of incorporation.pdf", "Beneficial ownership declaration.pdf", "Registrar extract.pdf", "Fleet list with IMO numbers.xlsx", "Email from counterparty.pdf"];

  function CaseDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var vp = APP.useViewport();
    var S = props.col;
    var c = S.get(props.id);
    var hitS = useState(props.hitId || (c && c.hits.length ? (c.hits.filter(function (h) { return !h.decision; })[0] || c.hits[0]).id : null));
    var tabS = useState("compare");
    var decS = useState("False positive");
    var ratS = useState("");
    var tried = useState(false);
    var infoOpen = useState(false);
    var infoF = useState({ incorporated: "", owners: "", regNo: "" });
    var drafting = useState(false);
    var draftTimer = useRef(null);
    useEffect(function () { return function () { clearInterval(draftTimer.current); }; }, []);
    if (!c) return null;
    var hit = c.hits.filter(function (h) { return h.id === hitS[0]; })[0] || null;
    var canAct = me === "compliance";

    function patchCase(fn) { S.update(c.id, fn); }
    function decide() {
      tried[1](true);
      var r = ratS[0].trim();
      if (r.length < 20) { APP.toast.warn("A decision needs a recorded reason of at least one full sentence."); return; }
      var d = decS[0];
      function apply() {
        patchCase(function (x) {
          var hits = x.hits.map(function (h) { return h.id === hit.id ? Object.assign({}, h, { decision: { value: d, by: me, at: APP.nowIso(), rationale: r } }) : h; });
          var nx = Object.assign({}, x, { hits: hits });
          var status = caseStatusFromHits(nx);
          return { hits: hits, status: status, risk: status === "True match" ? "High" : status === "Cleared" ? "Low" : x.risk,
            history: x.history.concat([{ at: APP.nowIso(), actorId: me, text: d + " recorded for " + hit.listEntry + ". " + r }]) };
        });
        APP.audit({ action: "Screening decision", item: hit.id, detail: d + ": " + c.entity + " vs " + hit.listEntry, dataClass: "Sensitive" });
        if (d === "True match") APP.notify({ to: ["legal", "owner"], kind: "alert", title: "True sanctions match: " + c.entity, body: "Recorded by " + APP.personName(me) + ". Do not sign, renew or pay until Legal advises.", route: "screening", params: { id: c.id }, phase: 2 });
        if (d === "Need more info") APP.notify({ to: ["legal"], kind: "alert", title: "Screening needs more information: " + c.entity, body: "Please ask the counterparty for its date of incorporation, owners and registration documents.", route: "screening", params: { id: c.id }, phase: 2 });
        APP.toast.success(d === "True match" ? "True match recorded. Legal and the data owner are notified." : d === "Need more info" ? "Marked as needing more information. N. Perera is asked to obtain it." : "Recorded as a false positive. The screening record is kept.");
        ratS[1](""); tried[1](false);
        var nextHit = c.hits.filter(function (h) { return h.id !== hit.id && !h.decision; })[0];
        if (nextHit) hitS[1](nextHit.id);
      }
      if (d === "True match") APP.confirm({ title: "Record a true match?", zIndex: 1300, okText: "Record true match", okButtonProps: { danger: true },
        content: "This stops new business with " + c.entity + " and notifies Legal and the data owner. Record it only when identifiers such as registration number, date or address match, not on a name alone.", onOk: apply });
      else apply();
    }
    function draftRationale() {
      if (!hit) return;
      var diff = hit.compare.filter(function (r) { return r.match === "Different"; }).map(function (r) { return r.field.toLowerCase(); });
      var cant = hit.compare.filter(function (r) { return r.match === "Can't compare" || r.match === "Missing in our record"; }).map(function (r) { return r.field.toLowerCase(); });
      var text = decS[0] === "False positive" ? "Name is similar, but " + (diff.length ? diff.join(", ") + " differ from the list entry" : "no identifier matches") + ". Not the listed party."
        : decS[0] === "Need more info" ? "Name is similar and " + (cant.length ? cant.join(", ") + " can't be compared yet" : "identifiers are incomplete") + ". Ask the counterparty for the missing details before deciding."
        : "Identifiers match the list entry: " + hit.compare.filter(function (r) { return r.match === "Exact"; }).map(function (r) { return r.field.toLowerCase(); }).join(", ") + ".";
      var words = text.split(" "), i = 0;
      drafting[1](true); ratS[1]("");
      clearInterval(draftTimer.current);
      draftTimer.current = setInterval(function () {
        i++; ratS[1](words.slice(0, i).join(" "));
        if (i >= words.length) { clearInterval(draftTimer.current); drafting[1](false); }
      }, 45);
    }
    function saveInfo() {
      var f = infoF[0];
      patchCase(function (x) {
        var hits = x.hits.map(function (h) {
          return Object.assign({}, h, { compare: h.compare.map(function (row) {
            if (row.field === "Date of incorporation" && f.incorporated) {
              var theirs = row.theirs;
              var match = /not listed/i.test(theirs) ? "Can't compare" : String(theirs).indexOf(f.incorporated.slice(0, 4)) >= 0 ? "Exact" : "Different";
              return Object.assign({}, row, { ours: fmt.date(f.incorporated), match: match });
            }
            if (row.field === "Owners" && f.owners) return Object.assign({}, row, { ours: f.owners, match: /not listed/i.test(row.theirs) ? "Can't compare" : "Different" });
            return row;
          }), why: h.decision ? h.why : h.why.concat(f.incorporated ? ["Date of incorporation added by " + APP.personName(me) + ": compare it with the list entry above"] : []) });
        });
        return { hits: hits, incorporated: f.incorporated || x.incorporated, owners: f.owners || x.owners, regNo: f.regNo || x.regNo,
          history: x.history.concat([{ at: APP.nowIso(), actorId: me, text: "Entity information added: " + [f.incorporated ? "date of incorporation " + fmt.date(f.incorporated) : null, f.owners ? "owners" : null, f.regNo ? "registration number" : null].filter(Boolean).join(", ") + ". Comparison updated." }]) };
      });
      APP.audit({ action: "Entity information added", item: c.id, detail: c.entity, dataClass: "Sensitive" });
      APP.toast.success("Entity information saved. The comparison is updated.");
      infoOpen[1](false);
    }
    function sendSecond() {
      var rev = APP.createReview({ title: "Screening decision: " + c.entity, kind: "Screening decision", reviewerId: "reviewer", ref: c.id, dataClass: "Sensitive",
        modelName: "No model: rule-based matching (self-hosted list matching)", phase: 2, source: { route: "screening", params: { id: c.id } }, archiveCategory: "Screening record",
        content: { summary: c.hits.length + " hits on " + c.entity + ". " + c.hits.filter(function (h) { return h.decision; }).length + " decided by " + APP.personName(me) + ".",
          sections: c.hits.map(function (h) { return { heading: h.listEntry + " (" + h.list + ", score " + h.score + ")", text: h.decision ? h.decision.value + ": " + h.decision.rationale : "Not decided yet. " + h.why.join(". ") + "." }; }) } });
      patchCase(function (x) { return { history: x.history.concat([{ at: APP.nowIso(), actorId: me, text: "Sent to Li Wei for a second check (" + rev.id + ")." }]) }; });
      APP.toast.success("Sent to Li Wei for a second check as " + rev.id + ".");
    }

    var entityCard = html`<${A.Card} size="small" title="Entity" extra=${html`<${ActBtn} roles=${["compliance", "legal"]} size="small" onClick=${function () { infoF[1]({ incorporated: c.incorporated || "", owners: "", regNo: "" }); infoOpen[1](true); }}>Add information<//>`}>
      <${APP.KeyFacts} column=${1} bordered=${false} items=${[["Type", c.type + ", " + c.role], ["Country", c.country], ["Registration no.", c.regNo], ["Incorporated", c.incorporated ? fmt.date(c.incorporated) : html`<${A.Tag} color="orange">Not on file<//>`],
        ["Address", c.address], ["Owners", c.owners], ["Aliases", c.aliases], ["Linked", c.contractId ? html`<a onClick=${function () { APP.navigate("contracts", { id: c.contractId }); }}>${c.contractId}</a>` : "None"], ["Source", c.source], ["Screened", fmt.dateTime(c.screenedAt) + " against " + c.lists.join(" and ")]]} />
    <//>`;
    var hitList = html`<div style=${{ marginTop: 12 }}>
      <div style=${{ fontWeight: 600, marginBottom: 8 }}>${c.hits.length ? "Possible matches (" + c.hits.length + ")" : "Possible matches"}</div>
      ${c.hits.length ? c.hits.map(function (h) {
        var active = hit && h.id === hit.id;
        return html`<div key=${h.id} role="button" tabIndex=${0} onClick=${function () { hitS[1](h.id); }} onKeyDown=${function (e) { if (e.key === "Enter") hitS[1](h.id); }}
          style=${{ padding: 10, borderRadius: 8, marginBottom: 8, cursor: "pointer", border: "1px solid " + (active ? tok.colorPrimary : tok.colorBorderSecondary), background: active ? tok.colorPrimaryBg : tok.colorBgContainer }}>
          <div style=${{ fontWeight: 500, wordBreak: "break-word" }}>${h.listEntry}</div>
          <${A.Flex} gap=${6} wrap="wrap" align="center" style=${{ marginTop: 4 }}>
            <${A.Tag} color="geekblue" style=${{ marginInlineEnd: 0 }}>${h.list}<//>
            <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Score " + h.score + " · " + h.matchedOn}</span>
            ${h.decision ? html`<${St} status=${h.decision.value} />` : html`<${A.Tag} color="orange" style=${{ marginInlineEnd: 0 }}>To decide<//>`}
          <//>
        </div>`;
      }) : html`<${A.Result} status="success" title="No match" subTitle=${"No entry above the threshold on " + c.lists.join(" or ") + ". The screening record is kept."} />`}
    </div>`;

    var hitPane = !hit ? html`<${APP.EmptyHint} title="No hit selected" description="Choose a possible match to compare it." />` : html`<div>
      <${A.Flex} gap=${8} wrap="wrap" align="center" style=${{ marginBottom: 8 }}>
        <span style=${{ fontWeight: 600, fontSize: 15 }}>${hit.listEntry}</span>
        <${A.Tooltip} title="Similarity of the records, not likelihood of a sanction"><${A.Progress} type="circle" size=${44} percent=${hit.score} format=${function (p) { return p; }} status=${hit.score >= 90 ? "exception" : "normal"} /><//>
      <//>
      <${A.Tabs} size="small" activeKey=${tabS[0]} onChange=${tabS[1]} items=${[
        { key: "compare", label: "Compare", children: html`<div>
          <div className="table-scroll"><${A.Table} size="small" rowKey="field" pagination=${false} dataSource=${hit.compare}
            columns=${[
              { title: "Field", dataIndex: "field", key: "field", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
              { title: "This entity", dataIndex: "ours", key: "ours" },
              { title: "List entry", dataIndex: "theirs", key: "theirs" },
              { title: "Match", dataIndex: "match", key: "match", render: function (v) { return html`<${A.Tag} color=${MATCH_TONE[v] === "default" ? undefined : MATCH_TONE[v]} style=${{ marginInlineEnd: 0 }}>${v}<//>`; } }]} /></div>
          <${SectionTitle}>List entry<//>
          <${APP.KeyFacts} column=${DCOL} items=${[["List", hit.list], ["Programme", hit.program], ["Listed on", fmt.date(hit.listedOn)], ["List published", fmt.date(hit.listDate)], ["Fetched", "10 Nov 2026, 06:00"], ["Vessels", hit.entry.vessels]]} />
        </div>` },
        { key: "why", label: "Why it matched", children: html`<div>
          <ul style=${{ paddingLeft: 20, lineHeight: 1.8, margin: 0 }}>${hit.why.map(function (w, i) { return html`<li key=${i}>${w}</li>`; })}</ul>
          <${Note} title="How matching works" style=${{ marginTop: 12 }}>Names and aliases are compared after removing legal suffixes such as Ltd, Co and LLC. The threshold is 80. Country, registration number, dates and vessel IMO numbers are compared where both records have them. Matching runs on self-hosted list software inside the CICT VPC.<//>
        </div>` },
        { key: "evidence", label: "Evidence (" + c.evidence.length + ")", children: html`<div>
          ${c.evidence.length ? html`<${A.Flex} wrap="wrap" gap=${8} style=${{ marginBottom: 12 }}>${c.evidence.map(function (e, i) { return html`<${APP.FileChip} key=${i} name=${e.name} meta=${e.meta} onClick=${function () { APP.toast.build("In the build, " + e.name + " opens in the viewer."); }} />`; })}<//>`
            : html`<${APP.EmptyHint} title="No evidence yet" description="Add registry extracts, ownership declarations or a fleet list." />`}
          <${FileAdder} roles=${["compliance", "legal"]} files=${CASE_FILES} onAdd=${function (f) {
            patchCase(function (x) { return { evidence: x.evidence.concat([{ name: f, meta: "Added by " + APP.personName(me) + ", " + fmt.date(APP.nowIso()) }]), history: x.history.concat([{ at: APP.nowIso(), actorId: me, text: "Evidence added: " + f }]) }; });
            APP.audit({ action: "Screening evidence added", item: c.id, detail: f, dataClass: "Sensitive" }); APP.toast.success(f + " added to " + c.id + ".");
          }} />
        </div>` },
        { key: "decision", label: "Decision", children: hit.decision ? html`<${A.Result} status=${hit.decision.value === "True match" ? "error" : hit.decision.value === "Need more info" ? "warning" : "success"} title=${hit.decision.value}
            subTitle=${"Recorded by " + APP.personName(hit.decision.by) + ", " + fmt.dateTime(hit.decision.at)}
            extra=${canAct ? html`<${A.Button} onClick=${function () {
              patchCase(function (x) { var hits = x.hits.map(function (h) { return h.id === hit.id ? Object.assign({}, h, { decision: null }) : h; }); var nx = Object.assign({}, x, { hits: hits }); return { hits: hits, status: caseStatusFromHits(nx), history: x.history.concat([{ at: APP.nowIso(), actorId: me, text: "Decision on " + hit.listEntry + " reopened." }]) }; });
              APP.audit({ action: "Screening decision reopened", item: hit.id, detail: c.entity, dataClass: "Sensitive" }); APP.toast.info("Decision reopened. The earlier decision stays in the history.");
            }}>Reopen<//>` : null}>
            <div style=${{ textAlign: "left" }}><b>Reason</b><div>${hit.decision.rationale}</div></div>
          <//>`
          : !canAct ? html`<${Note} title="Only the Compliance officer decides hits" action=${html`<${A.Button} size="small" onClick=${function () { switchTo("compliance"); }}>Switch to R. Fernando<//>`}>Decisions need a recorded reason and are kept with the screening record.<//>`
          : html`<div>
            <${Field} label="Decision" required=${true}>
              <${A.Radio.Group} optionType="button" buttonStyle="solid" value=${decS[0]} onChange=${function (e) { decS[1](e.target.value); }}
                options=${[{ value: "True match", label: "True match" }, { value: "False positive", label: "False positive" }, { value: "Need more info", label: "Need more info" }]} />
            <//>
            <${Field} label="Reason" required=${true} error=${tried[0] && ratS[0].trim().length < 20 ? "A reason is required for every decision." : null}
              help="Say which identifiers you compared and what they showed.">
              <${A.Input.TextArea} rows=${4} value=${ratS[0]} onChange=${function (e) { ratS[1](e.target.value); }} status=${tried[0] && ratS[0].trim().length < 20 ? "error" : undefined}
                placeholder="For example: different registration number, country and date of incorporation; not the listed party." />
            <//>
            <${A.Flex} gap=${8} wrap="wrap">
              <${A.Button} icon=${html`<${Icon} name="RobotOutlined" />`} loading=${drafting[0]} onClick=${draftRationale}>Draft a reason<//>
              <${A.Button} type="primary" danger=${decS[0] === "True match"} onClick=${decide}>Record decision<//>
            <//>
            <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 8 }}>A drafted reason is a suggestion from the comparison table. Edit it before you record the decision.</div>
          </div>` }]} />
    </div>`;

    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${1060} title=${c.entity} subtitle=${c.id + " · " + c.role + (c.contractId ? " · " + c.contractId : "")}
      tags=${html`<${Fragment}><${St} status=${resultLabel(c.status)} /><${SevTag} sev=${c.risk} /><//>`}
      actions=${html`<${Fragment}>
        <${A.Button} icon=${html`<${Icon} name="SyncOutlined" />`} onClick=${function () { patchCase(function (x) { return { screenedAt: APP.nowIso(), history: x.history.concat([{ at: APP.nowIso(), actorId: me, text: "Re-screened against today's lists. No change." }]) }; }); APP.toast.success("Re-screened against today's lists. No change."); }}>Re-screen<//>
        ${c.hits.length ? html`<${ActBtn} roles=${["compliance"]} icon=${html`<${Icon} name="AuditOutlined" />`} onClick=${sendSecond}>Second check<//>` : null}
      <//>`}>
      <${Note} type="warning" title="A similar name is not a finding" action=${html`<${APP.SowRef} sec="3.4.2" />`}>Decide each hit on identifiers such as registration number, dates, address and vessels.<//>
      ${c.status === "True match" ? html`<${Note} type="error" title="True match recorded">New business with this party is stopped. Legal and the data owner were notified.<//>` : null}
      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} lg=${9}>${entityCard}${hitList}<//>
        <${A.Col} xs=${24} lg=${15}>${c.hits.length ? hitPane : html`<${APP.EmptyHint} title="Nothing to decide" description="No possible matches. The record shows what was screened, when and against which lists." />`}<//>
      <//>
      <${A.Collapse} style=${{ marginTop: 16 }} items=${[{ key: "h", label: "Screening record and history (" + c.history.length + ")", children: html`<${Events} items=${c.history} />` }]} />
      <${A.Modal} open=${infoOpen[0]} onCancel=${function () { infoOpen[1](false); }} title="Add entity information" okText="Save and compare" onOk=${saveInfo} destroyOnHidden=${true}>
        <${Field} label="Date of incorporation" help="From the certificate of incorporation or registry extract."><${A.DatePicker} value=${infoF[0].incorporated ? dayjs(infoF[0].incorporated) : null} format="D MMM YYYY"
          onChange=${function (d) { infoF[1](Object.assign({}, infoF[0], { incorporated: d ? d.format("YYYY-MM-DD") : "" })); }} /><//>
        <${A.Button} size="small" style=${{ marginBottom: 12 }} onClick=${function () { infoF[1](Object.assign({}, infoF[0], { incorporated: "2011-05-03", owners: "Two Sri Lankan shareholders (sample)" })); }}>Fill from the sample registry extract<//>
        <${Field} label="Owners"><${A.Input} value=${infoF[0].owners} onChange=${function (e) { infoF[1](Object.assign({}, infoF[0], { owners: e.target.value })); }} /><//>
        <${Field} label="Registration number"><${A.Input} value=${infoF[0].regNo} placeholder=${c.regNo} onChange=${function (e) { infoF[1](Object.assign({}, infoF[0], { regNo: e.target.value })); }} /><//>
      <//>
    <//>`;
  }

  function SearchTab(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var S = props.col;
    var type = useState("Company");
    var name = useState("");
    var country = useState("Sri Lanka");
    var reg = useState("");
    var lists = useState(["OFAC SDN", "OFAC non-SDN", "EU"]);
    var thr = useState(80);
    var busy = useState(false);
    var res = useState(null);
    function screen(nm) {
      var q = (nm !== undefined ? nm : name[0]).trim();
      if (nm !== undefined) name[1](nm);
      if (!q) { APP.toast.warn("Enter a name to screen."); return; }
      busy[1](true); res[1](null);
      setTimeout(function () {
        busy[1](false);
        var words = q.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2 && GENERIC_WORDS.indexOf(w) < 0; });
        var found = colNow("screening").filter(function (c) { var ew = c.entity.toLowerCase().split(/[^a-z0-9]+/); return words.some(function (w) { return ew.indexOf(w) >= 0; }); })[0] || null;
        res[1]({ q: q, found: found, at: APP.nowIso() });
        APP.audit({ action: "Screening search", item: q, detail: lists[0].join(", ") + ", threshold " + thr[0], dataClass: "Sensitive" });
      }, 900);
    }
    function saveRecord() {
      var id = nextNum(colNow("screening"), "SCR-", 4);
      S.add({ id: id, entity: res[0].q, type: type[0], role: "Manual check", country: country[0] || "Not given", regNo: reg[0] || "Not given", incorporated: null, address: "Not given", owners: "Not given", aliases: "None", contractId: null,
        source: "Manual entry by " + APP.personName(me), screenedAt: res[0].at, lists: lists[0], status: "No match", assigneeId: null, risk: "Low", hits: [], evidence: [],
        history: [{ at: res[0].at, actorId: me, text: "Screened by " + APP.personName(me) + " against " + lists[0].join(", ") + ". No match above " + thr[0] + "." }], live: true });
      APP.toast.success("Screening record " + id + " saved.");
      props.onOpen(id);
    }
    var r = res[0];
    var hits = r && r.found ? r.found.hits.filter(function (h) { return h.score >= thr[0] && lists[0].indexOf(h.list) >= 0; }) : [];
    var below = r && r.found ? r.found.hits.filter(function (h) { return h.score < thr[0]; }).length : 0;
    return html`<${A.Row} gutter=${[16, 16]}>
      <${A.Col} xs=${24} lg=${9}>
        <${A.Card} size="small" title="Screen an entity">
          <${Field} label="Type"><${A.Segmented} value=${type[0]} onChange=${type[1]} options=${["Company", "Person", "Vessel"]} /><//>
          <${Field} label=${type[0] === "Vessel" ? "Vessel name" : "Name"} required=${true}><${A.Input} value=${name[0]} onChange=${function (e) { name[1](e.target.value); }} onPressEnter=${function () { screen(); }} placeholder="For example: Meridian Freight Lines" /><//>
          <${A.Row} gutter=${8}>
            <${A.Col} span=${12}><${Field} label="Country"><${A.Select} value=${country[0]} onChange=${country[1]} style=${{ width: "100%" }} options=${["Sri Lanka", "Singapore", "United Arab Emirates", "China", "India", "Other"].map(function (x) { return { value: x, label: x }; })} /><//><//>
            <${A.Col} span=${12}><${Field} label=${type[0] === "Vessel" ? "IMO number" : type[0] === "Person" ? "Date of birth" : "Registration no."}><${A.Input} value=${reg[0]} onChange=${function (e) { reg[1](e.target.value); }} /><//><//>
          <//>
          <${Field} label="Lists">
            <${A.Checkbox.Group} value=${lists[0]} onChange=${lists[1]} options=${[{ value: "OFAC SDN", label: "OFAC SDN" }, { value: "OFAC non-SDN", label: "OFAC non-SDN" }, { value: "EU", label: "EU" }, { value: "UN", label: "UN (waiting for Company approval)", disabled: true }]} />
          <//>
          <${Field} label=${"Match threshold: " + thr[0]} help="Lower finds more possible matches; higher finds fewer.">
            <${A.Slider} min=${60} max=${100} value=${thr[0]} onChange=${thr[1]} marks=${{ 60: "60", 80: "80", 100: "100" }} />
          <//>
          <${A.Button} type="primary" block=${true} icon=${html`<${Icon} name="SearchOutlined" />`} loading=${busy[0]} onClick=${function () { screen(); }}>Screen<//>
          <div style=${{ marginTop: 12, fontSize: 12, color: tok.colorTextSecondary }}>Try a sample:</div>
          <${A.Flex} wrap="wrap" gap=${6} style=${{ marginTop: 6 }}>
            ${["Meridian Freight Lines", "Eastgate Shipping Agency", "Kestrel Bunker Trading", "Blue Lagoon Ship Supplies"].map(function (s) { return html`<${A.Button} key=${s} size="small" shape="round" onClick=${function () { screen(s); }}>${s}<//>`; })}
          <//>
        <//>
      <//>
      <${A.Col} xs=${24} lg=${15}>
        ${busy[0] ? html`<${A.Card} size="small"><${APP.TypingIndicator} label=${"Screening against " + lists[0].join(", ")} /><${A.Skeleton} active paragraph=${{ rows: 4 }} /><//>`
          : !r ? html`<${A.Card} size="small"><${APP.EmptyHint} title="Results appear here" description="Each result shows the list, the list date, the match score and what matched." /><//>`
          : html`<${A.Card} size="small" title=${"Results for " + r.q} extra=${html`<span style=${{ fontSize: 12, opacity: 0.7 }}>${"Lists as fetched 10 Nov 2026, 06:00"}</span>`}>
            ${hits.length ? html`<div>
              <${Note} type="warning" title=${hits.length + (hits.length === 1 ? " possible match" : " possible matches")}>Possible matches are not findings. Open the case to compare identifiers and record a decision.<//>
              <div className="table-scroll"><${A.Table} size="small" rowKey="id" pagination=${false} dataSource=${hits} rowClassName="clickable-row"
                onRow=${function (h) { return { onClick: function () { props.onOpen(r.found.id, h.id); } }; }}
                columns=${[
                  { title: "List entry", dataIndex: "listEntry", key: "listEntry", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
                  { title: "List", dataIndex: "list", key: "list" },
                  { title: "List date", dataIndex: "listDate", key: "listDate", render: function (v) { return html`<span className="nowrap">${fmt.date(v)}</span>`; } },
                  { title: "Score", dataIndex: "score", key: "score", render: function (v) { return html`<div style=${{ width: 100 }}><${A.Progress} percent=${v} size="small" format=${function (p) { return p; }} status=${v >= 90 ? "exception" : "normal"} /></div>`; } },
                  { title: "Matched on", dataIndex: "matchedOn", key: "matchedOn" },
                  { title: "Decision", dataIndex: "decision", key: "decision", render: function (v) { return v ? html`<${St} status=${v.value} />` : html`<${A.Tag} color="orange">To decide<//>`; } }]} /></div>
              <div style=${{ marginTop: 10 }}>
                <${A.Button} type="primary" onClick=${function () { props.onOpen(r.found.id); }}>${"Open case " + r.found.id}<//>
                ${below ? html`<span style=${{ marginLeft: 10, fontSize: 12, opacity: 0.7 }}>${below + " weaker match below the threshold not shown"}</span>` : null}
              </div>
            </div>` : html`<${A.Result} status="success" title="No match above the threshold"
              subTitle=${"Checked " + lists[0].join(", ") + " at threshold " + thr[0] + (below ? ". " + below + " weaker match below the threshold." : ".") + (r.found ? " Existing record " + r.found.id + "." : "")}
              extra=${r.found ? html`<${A.Button} onClick=${function () { props.onOpen(r.found.id); }}>${"Open " + r.found.id}<//>` : html`<${A.Button} type="primary" onClick=${saveRecord}>Save screening record<//>`} />`}
          <//>`}
      <//>
    <//>`;
  }

  function BulkTab(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var S = props.col;
    var step = useState(0);
    var file = useState(null);
    var pct = useState(0);
    var made = useState(null);
    var timer = useRef(null);
    useEffect(function () { return function () { clearInterval(timer.current); }; }, []);
    var B = CB.bulkSample;
    function choose(name) { file[1](name); step[1](1); made[1](null); }
    function start() {
      step[1](2); pct[1](0);
      var p = 0;
      timer.current = setInterval(function () { p += 8; pct[1](Math.min(100, p)); if (p >= 100) { clearInterval(timer.current); step[1](3); APP.audit({ action: "Bulk screening", item: file[0], detail: B.summary.screened + " screened, " + B.summary.possible + " possible matches, " + B.summary.failed + " row failed", dataClass: "Sensitive" }); } }, 120);
    }
    function createCases() {
      var all = colNow("screening").slice();
      var ids = [];
      B.results.filter(function (x) { return x.result === "Possible match"; }).forEach(function (x) {
        var id = nextNum(all, "SCR-", 4);
        var item = { id: id, entity: x.entity, type: x.type, role: "Counterparty (bulk upload)", country: x.country, regNo: "Not provided", incorporated: null, address: "Not provided", owners: "Not provided", aliases: "None", contractId: null,
          source: "Bulk upload: " + file[0] + ", row " + x.row, screenedAt: APP.nowIso(), lists: ["OFAC SDN", "EU"], status: "Open", assigneeId: "compliance", risk: "Medium",
          hits: [{ id: "HIT-" + id.slice(4) + "-1", listEntry: x.entry, list: x.list, program: "Sample programme", listedOn: "2024-01-15", listDate: x.list === "EU" ? "2026-11-06" : "2026-11-07", score: x.score, matchedOn: "Name",
            entry: { name: x.entry.replace(" (sample entry)", ""), aliases: "None", country: "Not listed", regNo: "Not listed", incorporated: "Not listed", address: "Not listed", owners: "Not listed", vessels: "None" },
            compare: [{ field: "Name", ours: x.entity, theirs: x.entry.replace(" (sample entry)", ""), match: "Similar" }, { field: "Country", ours: x.country, theirs: "Not listed", match: "Can't compare" }, { field: "Registration number", ours: "Not provided", theirs: "Not listed", match: "Can't compare" }, { field: "Date of incorporation", ours: "Not on file", theirs: "Not listed", match: "Can't compare" }],
            why: ["Name similarity " + x.score + "%", "The upload had no registration number or date, so the hit can't be ruled out yet"], decision: null }],
          evidence: [], history: [{ at: APP.nowIso(), actorId: me, text: "Case created from bulk upload " + file[0] + ", row " + x.row + "." }], live: true };
        all.unshift(item); ids.push(id);
      });
      APP.actions.patch("cb.screening", all);
      if (me !== "compliance") APP.notify({ to: ["compliance"], kind: "alert", title: ids.length + " screening cases to decide", body: "From bulk upload " + file[0] + ".", route: "screening", params: { id: ids[0] }, phase: 2 });
      APP.audit({ action: "Screening cases created", item: ids.join(", "), detail: "From " + file[0], dataClass: "Sensitive" });
      made[1](ids);
      APP.toast.success(ids.length + " cases created: " + ids.join(", ") + ".");
    }
    return html`<div>
      <${A.Steps} size="small" current=${step[0]} style=${{ marginBottom: 16 }} items=${[{ title: "Upload" }, { title: "Check columns" }, { title: "Screen" }, { title: "Results" }]} />
      ${step[0] === 0 ? html`<div>
        <${A.Upload.Dragger} accept=".xlsx,.csv" showUploadList=${false} beforeUpload=${function (f) { choose(f.name); return false; }}>
          <p style=${{ fontSize: 30, margin: 0 }}><${Icon} name="InboxOutlined" /></p>
          <p style=${{ margin: "6px 0" }}>Drop an Excel or CSV file of customers, shipping lines or other parties</p>
          <p style=${{ fontSize: 12, opacity: 0.65, margin: 0 }}>Columns: name, type, country, registration number, date of incorporation or birth, IMO number. In the prototype nothing is uploaded.</p>
        <//>
        <${A.Flex} gap=${8} wrap="wrap" style=${{ marginTop: 12 }}>
          <${A.Button} type="primary" onClick=${function () { choose(B.file); }}>${"Use the sample file (" + B.rows + " rows)"}<//>
          <${A.Button} onClick=${function () { APP.toast.build("In the build, this downloads the import template with column notes."); }}>Download template<//>
        <//>
      </div>` : step[0] === 1 ? html`<div>
        <${APP.FileChip} name=${file[0]} meta=${B.rows + " rows"} onRemove=${function () { step[1](0); file[1](null); }} />
        <${SectionTitle}>Columns found<//>
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="col" dataSource=${[
          { col: "Party name", maps: "Name", ok: "Matched" }, { col: "Party type", maps: "Type", ok: "Matched" }, { col: "Country", maps: "Country", ok: "Matched, 1 row empty" },
          { col: "Reg no", maps: "Registration number", ok: "Matched, 31 rows empty" }, { col: "Notes", maps: "Not used", ok: "Ignored" }]}
          columns=${[{ title: "Column in file", dataIndex: "col", key: "col" }, { title: "Used as", dataIndex: "maps", key: "maps" }, { title: "Check", dataIndex: "ok", key: "ok" }]} /></div>
        <${Note} type="info" title="Rows with missing identifiers" style=${{ marginTop: 12 }}>Rows without a registration number are still screened on name and country, but a hit can't be ruled out until the number is added.<//>
        <${A.Button} type="primary" onClick=${start}>Start screening<//>
      </div>` : step[0] === 2 ? html`<div>
        <${A.Progress} percent=${pct[0]} status="active" />
        <div style=${{ opacity: 0.7, marginTop: 6 }}>${"Screening row " + Math.max(1, Math.round(B.rows * pct[0] / 100)) + " of " + B.rows + " against OFAC and EU"}</div>
      </div>` : html`<div>
        <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 12 }}>
          <${A.Col} xs=${12} md=${6}><${A.Card} size="small"><${A.Statistic} title="Screened" value=${B.summary.screened} /><//><//>
          <${A.Col} xs=${12} md=${6}><${A.Card} size="small"><${A.Statistic} title="No match" value=${B.summary.noMatch} /><//><//>
          <${A.Col} xs=${12} md=${6}><${A.Card} size="small"><${A.Statistic} title="Possible matches" value=${B.summary.possible} /><//><//>
          <${A.Col} xs=${12} md=${6}><${A.Card} size="small"><${A.Statistic} title="Rows not screened" value=${B.summary.failed} /><//><//>
        <//>
        <${APP.DataTable} data=${B.results} rowKey="row" searchKeys=${["entity", "entry"]} searchPlaceholder="Search results" filters=${[{ key: "result", label: "Result", width: 170 }]}
          onRowClick=${function (x) {
            if (x.result === "Possible match") { var c = made[0] ? colNow("screening").filter(function (s) { return s.entity === x.entity; })[0] : null; if (c) props.onOpen(c.id); else APP.toast.info("Create the cases first, then open " + x.entity + " to decide."); }
            else if (x.result === "No match") APP.toast.info(x.entity + ": no match on OFAC or EU. Screening record kept with the list dates.");
            else APP.toast.warn("Row " + x.row + ": " + x.entry);
          }}
          columns=${[
            { title: "Row", dataIndex: "row", key: "row", align: "right" },
            { title: "Party", dataIndex: "entity", key: "entity", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
            { title: "Country", dataIndex: "country", key: "country", render: function (v) { return v || html`<${A.Tag} color="red">Missing<//>`; } },
            { title: "Result", dataIndex: "result", key: "result", render: function (v) { return html`<${St} status=${v === "Row not screened" ? "Failed" : v} />`; } },
            { title: "Score", dataIndex: "score", key: "score", render: function (v) { return v || ""; } },
            { title: "List entry or problem", dataIndex: "entry", key: "entry" }]} />
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary, margin: "6px 0 12px" }}>Showing the rows with results to act on plus a few clear rows. All 48 rows are in the screening record.</div>
        <${A.Flex} gap=${8} wrap="wrap">
          ${made[0] ? html`<${A.Button} type="primary" onClick=${function () { props.onOpen(made[0][0]); }}>${"Open " + made[0][0]}<//>`
            : html`<${A.Button} type="primary" onClick=${createCases}>${"Create cases for " + B.summary.possible + " possible matches"}<//>`}
          <${A.Button} onClick=${function () { APP.toast.build("In the build, the failure report downloads as Excel with the reason for each row."); }}>Download failure report<//>
          <${A.Button} onClick=${function () { step[1](0); file[1](null); made[1](null); }}>Upload another file<//>
        <//>
      </div>`}
    </div>`;
  }

  function ListsTab() {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var listOpen = useState(null);
    var expOpen = useState(null);
    var refreshed = APP.useShared("cb.listsRefreshed", null);
    var settings = APP.useShared("cb.matchSettings", { threshold: 80, fields: ["Name", "Aliases", "Country", "Registration number", "Dates", "Vessel IMO"], suffixes: true, monitor: true });
    var busy = useState(false);
    var draft = useState(null);
    var cfg = draft[0] || settings[0];
    function setCfg(k, v) { var n = Object.assign({}, cfg); n[k] = v; draft[1](n); }
    var l = listOpen[0] ? findIn(CB.lists, listOpen[0]) : null;
    var x = expOpen[0] ? findIn(CB.exportChecks, expOpen[0]) : null;
    return html`<div>
      <${APP.DataTable} data=${CB.lists} search=${false} onRowClick=${function (r) { listOpen[1](r.id); }}
        toolbar=${html`<${A.Button} icon=${html`<${Icon} name="SyncOutlined" />`} loading=${busy[0]} onClick=${function () {
          busy[1](true);
          setTimeout(function () { busy[1](false); refreshed[1](APP.nowIso()); APP.audit({ action: "List refresh", item: "Sanctions lists", detail: "OFAC and EU, manual refresh, no changes since 06:00", dataClass: "Public" }); APP.toast.success("Lists checked. No changes since 06:00; nothing to re-screen."); }, 1200);
        }}>Refresh now<//>`}
        columns=${[
          { title: "List", dataIndex: "name", key: "name", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
          APP.col.text("Source", "source"),
          APP.col.date("Published", "published"),
          { title: "Fetched", dataIndex: "fetched", key: "fetched", render: function (v) { return html`<span className="nowrap">${fmt.dateTime(refreshed[0] || v)}</span>`; } },
          { title: "Entries", dataIndex: "entries", key: "entries", align: "right", render: function (v) { return fmt.number(v); } },
          { title: "Changes", dataIndex: "added", key: "added", render: function (v, r) { return "+" + v + " / -" + r.removed; } },
          { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } }]} />
      <${A.Row} gutter=${[16, 16]} style=${{ marginTop: 16 }}>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Matching settings" style=${{ height: "100%" }}>
            <${Field} label=${"Threshold: " + cfg.threshold}><${A.Slider} min=${60} max=${100} value=${cfg.threshold} disabled=${me !== "compliance"} onChange=${function (v) { setCfg("threshold", v); }} /><//>
            <${Field} label="Compare"><${A.Checkbox.Group} value=${cfg.fields} disabled=${me !== "compliance"} onChange=${function (v) { setCfg("fields", v); }} options=${["Name", "Aliases", "Country", "Registration number", "Dates", "Vessel IMO"]} /><//>
            <${A.Flex} vertical=${true} gap=${8} style=${{ marginBottom: 12 }}>
              <label><${A.Switch} size="small" checked=${cfg.suffixes} disabled=${me !== "compliance"} onChange=${function (v) { setCfg("suffixes", v); }} /> <span style=${{ marginLeft: 6 }}>Ignore legal suffixes such as Ltd, Co, LLC</span></label>
              <label><${A.Switch} size="small" checked=${cfg.monitor} disabled=${me !== "compliance"} onChange=${function (v) { setCfg("monitor", v); }} /> <span style=${{ marginLeft: 6 }}>Re-screen all parties when a list changes</span></label>
            <//>
            <${ActBtn} roles=${["compliance"]} type="primary" disabled=${!draft[0]} onClick=${function () { settings[1](cfg); draft[1](null); APP.audit({ action: "Screening settings changed", item: "Matching", detail: "Threshold " + cfg.threshold + ", " + cfg.fields.length + " fields", dataClass: null }); APP.toast.success("Settings saved and versioned. They apply from the next screening."); }}>Save settings<//>
          <//>
        <//>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Export control" style=${{ height: "100%" }} extra=${html`<${APP.SowRef} sec="3.4.2" />`}>
            <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginBottom: 10 }}>Configured to the rules, business matters and data scope the Company confirms in Discovery. Each result explains its scope and basis.</div>
            <${APP.DataTable} data=${CB.exportChecks} search=${false} showCount=${false} onRowClick=${function (r) { expOpen[1](r.id); }}
              columns=${[{ title: "Item", dataIndex: "item", key: "item" }, APP.col.text("Party", "party"), { title: "Result", dataIndex: "result", key: "result", render: function (v) { return html`<${St} status=${v} />`; } }]} />
          <//>
        <//>
      <//>
      ${l ? html`<${APP.DetailDrawer} open=${true} onClose=${function () { listOpen[1](null); }} title=${l.name} subtitle=${l.source} tags=${html`<${St} status=${l.status} />`}>
        ${l.note ? html`<${Note} type="warning" title="Not switched on">${l.note}<//>` : null}
        <${APP.KeyFacts} column=${1} items=${[["Published by the source", fmt.date(l.published)], ["Fetched", fmt.dateTime(refreshed[0] || l.fetched)], ["Entries", fmt.number(l.entries)], ["Changes in the last update", "+" + l.added + " added, -" + l.removed + " removed"], ["Re-screening", l.status === "Live" ? "1,284 parties re-screened after the update. 1 new possible match (SCR-0091)." : "Not run until the list is approved"], ["Stored", "Self-hosted list service inside the CICT VPC. Every version kept for audit."]]} />
        <${SectionTitle}>Recent fetches<//>
        <${Events} items=${[0, 1, 2, 3].map(function (i) { return { at: dayjs(l.fetched).subtract(i, "day").format("YYYY-MM-DDTHH:mm:ss"), actorId: "system", text: i === 0 ? "Fetched. " + (l.added + l.removed) + " changes." : "Fetched. No changes." }; })} />
      <//>` : null}
      ${x ? html`<${APP.DetailDrawer} open=${true} onClose=${function () { expOpen[1](null); }} title=${x.item} subtitle=${x.id + " · " + x.party} tags=${html`<${St} status=${x.result} />`}>
        <${APP.KeyFacts} column=${1} items=${[["Rule set", x.ruleSet], ["Scope of the check", x.scope], ["Basis", x.basis], ["Origin", x.origin]]} />
        ${x.result === "Check needed" ? html`<${Note} type="warning" title="Needs a person to decide" style=${{ marginTop: 12 }}>The rule set can't decide this from the description alone. Ask the supplier for the technical specification.<//>` : null}
        <div style=${{ marginTop: 12 }}><${ActBtn} roles=${["compliance"]} onClick=${function () { APP.audit({ action: "Export check note", item: x.id, detail: "Specification requested", dataClass: "Internal" }); APP.toast.build("In the build, the request goes to Procurement with a task; the result is recorded on this check."); }}>Request the specification<//></div>
      <//>` : null}
    </div>`;
  }

  /* ==================================================================
     BOARD AFFAIRS (route: board)
     ================================================================== */
  var CITE = {
    DOA_A6: { doc: "CB-DOA", clause: "A.6", page: 3 }, CMP52: { doc: "CB-CMP", clause: "5.2", page: 14 }, CMP54: { doc: "CB-CMP", clause: "5.4", page: 15 },
    AOA87: { doc: "CB-AOA", clause: "art87", page: 19 }, AOA98: { doc: "CB-AOA", clause: "art98", page: 21 }
  };
  var RP = {
    "Northwind Crane Services (Pvt) Ltd": { rp: "RP-03", director: "M. Chen", text: "Director M. Chen is a non-executive director of Northwind Group Holdings, the parent of the counterparty (register entry RP-03)." },
    "Harbourline Logistics": { rp: "RP-07", director: "D. Wickramasinghe", text: "Director D. Wickramasinghe holds 12% of Harbourline Holdings Ltd, the parent of the counterparty (register entry RP-07)." }
  };
  function hasDoc(item, type) { return (item.docs || []).some(function (d) { return d.type === type; }); }
  function legalReviewRecord(state, contractId) {
    return state.records.filter(function (r) { return r.live && (r.linked || []).indexOf(contractId) >= 0 && /review/i.test(r.category || ""); })[0] || null;
  }
  function buildChecks(item, state) {
    var out = [];
    var meeting = findIn(CB.meetings, item.meetingId) || {};
    var rp = RP[item.counterparty];
    if (item.contractId === "CON-2024-051") out.push({ id: "auth", group: "Approval authority", check: "Who must approve", cites: [CITE.DOA_A6, CITE.CMP52], finding: "Value USD 1.52 million and a 3-year renewal: Board approval is needed. Submitted to the Board, which is correct.", outcome: "Passed" });
    else if (rp) out.push({ id: "auth", group: "Approval authority", check: "Who must approve", cites: [CITE.CMP52], finding: "Related-party transactions are reserved to the Board whatever the value. Submitted to the Board, which is correct.", outcome: "Passed" });
    else if (item.policyId) out.push({ id: "auth", group: "Approval authority", check: "Who must approve", cites: [CITE.CMP52], finding: "Company policies on procurement are reserved to the Board. Submitted to the Board, which is correct.", outcome: "Passed" });
    else out.push({ id: "auth", group: "Approval authority", check: "Who must approve", cites: [CITE.AOA87], finding: item.decision === "For noting" ? "For noting only. No approval limit applies." : "Within the Board's powers under Article 87.", outcome: "Passed" });
    (item.required || []).forEach(function (t) {
      var ok = hasDoc(item, t), name = ok ? item.docs.filter(function (d) { return d.type === t; })[0].name : null, finding;
      if (!ok && t === "Legal review" && item.contractId) {
        var rec = legalReviewRecord(state, item.contractId);
        if (rec) { ok = true; name = rec.id + ", " + rec.title + " (" + rec.version + ")"; }
      }
      if (ok) finding = "Attached: " + name + ".";
      else if (t === "Legal review" && item.contractId) finding = "No confirmed legal review of " + item.contractId + " in Records. Run the contract review in the Assistant and have a specialist reviewer confirm it.";
      else finding = t + " is missing.";
      out.push({ id: "doc-" + t, group: "Required documents", check: t, cites: [CITE.CMP54], finding: finding, outcome: ok ? "Passed" : "Missing",
        addition: ok ? "" : t === "Declaration of interest" && rp ? "Add the declaration of interest for Director " + rp.director : "Add the " + t.toLowerCase(), fix: t,
        link: !ok && t === "Legal review" && item.contractId === "CON-2024-051" ? { route: "assistant", params: { start: "contract-review", conversationId: "CONV-201", contractId: "CON-2024-051" }, label: "Open the contract review" } : null });
    });
    if (rp) {
      var declared = hasDoc(item, "Declaration of interest") || hasDoc(item, "Related-party disclosure");
      out.push({ id: "rp", group: "Related parties", check: "Related-party register", cites: [{ doc: "CB-RPT", clause: rp.rp, page: 1 }, CITE.AOA98],
        finding: rp.text + (declared ? " Declaration attached; the director will not receive the paper or vote." : " No declaration in the submission."),
        outcome: declared ? "Passed" : "Alert", addition: declared ? "" : "Record the declaration of interest and the recusal of Director " + rp.director, fix: (item.required || []).indexOf("Related-party disclosure") >= 0 ? "Related-party disclosure" : "Declaration of interest" });
    } else out.push({ id: "rp", group: "Related parties", check: "Related-party register", cites: [{ doc: "CB-RPT", clause: "RP-03", page: 1 }], finding: item.counterparty ? "No entry for " + item.counterparty + " in the related-party register." : "No counterparty in this item.", outcome: "Passed" });
    if (item.contractId === "CON-2024-051" || rp) {
      var risk = hasDoc(item, "Risk assessment");
      out.push({ id: "risk", group: "Completeness", check: "Board paper sections", cites: [CITE.CMP54], finding: risk ? "All six sections present." : "The risk section of the board paper is empty.", outcome: risk ? "Passed" : "Add", addition: risk ? "" : "Complete the risk section of the board paper", fix: "Risk assessment" });
    }
    if (item.contractId === "CON-2024-051") {
      out.push({ id: "prior", group: "Completeness", check: "Earlier Board instructions", cites: [{ doc: "CB-MIN-2025-03", clause: "item6", page: 4 }], finding: "In August 2025 the Board asked for a contractor performance report before any renewal. The report is attached.", outcome: "Passed" });
    } else if (rp) {
      var cn = hasDoc(item, "Compliance note");
      out.push({ id: "open", group: "Completeness", check: "Open compliance matters", cites: [{ doc: "CB-CON-033", clause: "4.2", page: 3 }], finding: cn ? "Paper now covers alert ANM-0035 and remediation RM-2026-08." : "Compliance alert ANM-0035 is open on this contract: waivers above the 10% limit. The paper does not mention it.", outcome: cn ? "Passed" : "Add", addition: cn ? "" : "Mention alert ANM-0035 and remediation RM-2026-08 in the paper", fix: "Compliance note", link: { route: "compliance", params: { id: "ANM-0035" }, label: "Open ANM-0035" } });
      out.push({ id: "prior", group: "Completeness", check: "Earlier Board instructions", cites: [{ doc: "CB-MIN-2024-01", clause: "item8", page: 7 }], finding: cn ? "Paper confirms the waivers were reported to the Audit and Risk Committee." : "The Board asked for waivers above 10% to be reported to the Audit and Risk Committee each quarter. The paper does not confirm this.", outcome: cn ? "Passed" : "Add", addition: cn ? "" : "Confirm the waivers were reported to the Audit and Risk Committee", fix: "Compliance note" });
    } else {
      out.push({ id: "sections", group: "Completeness", check: "Board paper sections", cites: [CITE.CMP54], finding: item.decision === "For noting" ? "Paper for noting: decision sections are not needed." : hasDoc(item, "Board paper") || hasDoc(item, "Minutes") ? "All required sections present." : "No board paper attached.", outcome: item.decision === "For noting" || hasDoc(item, "Board paper") || hasDoc(item, "Minutes") ? "Passed" : "Add", addition: "Attach the board paper", fix: "Board paper" });
    }
    var late = meeting.papersDue && dayjs(item.submittedAt).isAfter(dayjs(meeting.papersDue).endOf("day"));
    out.push({ id: "due", group: "Completeness", check: "Submitted by the papers deadline", cites: [CITE.CMP54], finding: "Submitted " + fmt.date(item.submittedAt) + "; papers are due " + fmt.date(meeting.papersDue) + ".", outcome: late ? "Add" : "Passed", addition: late ? "Ask the Chair to accept a late paper" : "" });
    return out;
  }
  function checkSummary(checks) {
    var fail = checks.filter(function (c) { return c.outcome !== "Passed"; });
    return { total: checks.length, passed: checks.length - fail.length, missing: fail.filter(function (c) { return c.outcome === "Missing"; }).length, add: fail.filter(function (c) { return c.outcome === "Add"; }).length, alert: fail.filter(function (c) { return c.outcome === "Alert"; }).length, fail: fail };
  }
  var FIX_FILES = {
    "Financial evaluation": "Financial evaluation, {s}.xlsx", "Legal review": "Legal review, {s}.pdf", "Declaration of interest": "Declaration of interest, {d}.pdf",
    "Related-party disclosure": "Related-party disclosure, {d}.pdf", "Risk assessment": "Board paper v2 with risk section, {s}.docx", "Compliance note": "Board paper v2 with compliance section, {s}.docx", "Board paper": "Board paper, {s}.docx"
  };
  function fixFile(type, item) {
    var rp = RP[item.counterparty];
    var s = item.counterparty ? item.counterparty.split(" ")[0] : "item " + item.no;
    return (FIX_FILES[type] || type + ", {s}.pdf").replace("{s}", s).replace("{d}", rp ? rp.director : "director");
  }

  function useBoardCols() { return { agenda: useCol("agenda"), pack: useCol("pack"), meetings: useCol("meetings") }; }

  function BoardScreen(props) {
    var route = APP.useRoute();
    var me = useMe();
    var B = useBoardCols();
    var tabP = APP.useShared("cb.ui.boardTab", "meetings");
    var openS = useState(null);
    var submitOpen = useState(false);
    var params = props.params || {};
    function openItem(kind, id) { openS[1]({ kind: kind, id: id }); }
    useEffect(function () {
      if (params.tab) tabP[1](params.tab);
      if (params.id) {
        if (/^AG-/.test(params.id)) { tabP[1]("agenda"); openItem("agenda", params.id); }
        else if (/^(BRD|ARC)-/.test(params.id)) { tabP[1]("meetings"); openItem("meeting", params.id); }
      }
    }, [params.id, params.tab, route.at]);
    var next = findIn(B.meetings.list, "BRD-2026-04");
    var items = B.agenda.list.filter(function (a) { return a.meetingId === next.id; });
    var accepted = items.filter(function (a) { return a.status === "Accepted"; }).length;
    var waiting = B.agenda.list.filter(function (a) { return a.status === "Submitted" || a.status === "Resubmitted"; }).length;
    var packMeta = APP.useShared("cb.packMeta", { status: "Not published" });
    var o = openS[0];
    var dp = { cols: B, onClose: function () { openS[1](null); }, onOpen: openItem };
    return html`<div>
      <${APP.PageHeader} title="Board affairs" phase=${2} sow=${["3.5.1", "3.5.2"]}
        subtitle="Meetings, agenda submission checks, board packs from approved templates, and search of past meetings with cited results. Unpublished material is visible only to the people on each meeting's access list."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${function () { APP.navigate("assistant", { conversationId: "CONV-106" }); }}>Ask the assistant<//>
          <${ActBtn} roles=${["legal", "owner", "compliance", "cosec"]} type="primary" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { submitOpen[1](true); }}>Submit an agenda item<//>
        <//>`} />
      <${ReadOnlyNote} />
      <${A.Card} size="small" style=${{ marginBottom: 16 }}>
        <${A.Row} gutter=${[16, 16]} align="middle">
          <${A.Col} xs=${24} lg=${9}>
            <div style=${{ fontSize: 12, opacity: 0.65 }}>Next meeting</div>
            <div style=${{ fontWeight: 600, fontSize: 17 }}>${next.body + ", " + next.title}</div>
            <div style=${{ opacity: 0.8 }}>${dayjs(next.date).format("dddd D MMM YYYY, HH:mm") + " · " + next.venue}</div>
            <${A.Flex} gap=${6} wrap="wrap" style=${{ marginTop: 6 }}><${St} status=${next.status} /><${APP.DataClassTag} cls=${next.dataClass} /><//>
          <//>
          <${A.Col} xs=${12} lg=${4}><${A.Statistic} title="Days to go" value=${fmt.daysUntil(next.date)} /><//>
          <${A.Col} xs=${12} lg=${4}><${A.Statistic} title="Papers due" value=${fmt.dateShort(next.papersDue)} suffix=${html`<span style=${{ fontSize: 12, opacity: 0.7 }}>${fmt.dueLabel(next.papersDue)}</span>`} /><//>
          <${A.Col} xs=${24} lg=${7}>
            <div style=${{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>${"Agenda items accepted: " + accepted + " of " + items.length}</div>
            <${A.Progress} percent=${Math.round(accepted * 100 / Math.max(1, items.length))} size="small" />
            <${A.Flex} gap=${8} wrap="wrap" style=${{ marginTop: 8 }}>
              <${A.Button} size="small" onClick=${function () { openItem("meeting", next.id); }}>Open meeting<//>
              <${A.Button} size="small" onClick=${function () { tabP[1]("pack"); }}>${"Board pack: " + packMeta[0].status.toLowerCase()}<//>
            <//>
          <//>
        <//>
      <//>
      <${A.Tabs} activeKey=${tabP[0]} onChange=${function (k) { tabP[1](k); }} items=${[
        { key: "meetings", label: "Meetings", children: html`<${MeetingsTab} cols=${B} onOpen=${openItem} />` },
        { key: "agenda", label: html`<span>Agenda checks ${waiting ? html`<${A.Badge} count=${waiting} size="small" style=${{ marginLeft: 4 }} />` : null}</span>`, children: html`<${AgendaTab} cols=${B} onOpen=${openItem} />` },
        { key: "pack", label: "Board pack", children: html`<${PackTab} cols=${B} onOpen=${openItem} />` },
        { key: "search", label: "Search past meetings", children: html`<${BoardSearchTab} />` },
        { key: "templates", label: "Templates", children: html`<${TemplatesTab} onOpen=${openItem} />` }]} />
      ${o && o.kind === "meeting" ? html`<${MeetingDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "agenda" ? html`<${AgendaDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "template" ? html`<${TemplateDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${o && o.kind === "pack" ? html`<${PackItemDrawer} key=${o.id} id=${o.id} ...${dp} />` : null}
      ${submitOpen[0] ? html`<${SubmitItemModal} cols=${B} onClose=${function () { submitOpen[1](false); }} onOpen=${openItem} />` : null}
    </div>`;
  }

  function MeetingsTab(props) {
    var B = props.cols;
    var rows = B.meetings.list.map(function (m) { return Object.assign({}, m, { _items: Math.max(m.items, B.agenda.list.filter(function (a) { return a.meetingId === m.id; }).length) }); });
    var columns = [
      APP.col.id("Meeting", "id"),
      { title: "Body", dataIndex: "body", key: "body", render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${r.title}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${v}</div></div>`; } },
      { title: "Date", dataIndex: "date", key: "date", render: function (v) { return html`<span className="nowrap">${fmt.dateTime(v)}</span>`; }, sorter: function (a, b) { return a.date.localeCompare(b.date); } },
      { title: "Items", dataIndex: "_items", key: "_items", align: "right" },
      APP.col.date("Papers due", "papersDue"),
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } },
      { title: "Access", dataIndex: "access", key: "access", width: 240 }
    ];
    return html`<${APP.DataTable} columns=${columns} data=${rows} searchKeys=${["id", "title", "body", "status"]} searchPlaceholder="Search meetings"
      filters=${[{ key: "body", label: "Body", width: 200 }, { key: "status", label: "Status", width: 170 }]} onRowClick=${function (r) { props.onOpen("meeting", r.id); }}
      toolbar=${html`<${ActBtn} roles=${["cosec"]} icon=${html`<${Icon} name="CalendarOutlined" />`} onClick=${function () { APP.toast.build("In the build, a new meeting starts from the notice template with the body, date, venue, quorum and access list."); }}>New meeting<//>`} />`;
  }

  function MeetingDrawer(props) {
    var tok = A.theme.useToken().token;
    var B = props.cols;
    var m = B.meetings.get(props.id);
    if (!m) return null;
    var items = B.agenda.list.filter(function (a) { return a.meetingId === m.id; });
    var past = CB.searchCorpus.filter(function (s) { return s.meetingId === m.id; });
    var upcoming = fmt.daysUntil(m.date) >= 0;
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${820} title=${m.title} subtitle=${m.id + " · " + m.body}
      tags=${html`<${Fragment}><${St} status=${m.status} /><${APP.DataClassTag} cls=${m.dataClass} /><//>`}
      actions=${m.record ? html`<${A.Button} icon=${html`<${Icon} name="DatabaseOutlined" />`} onClick=${function () { APP.navigate("records", { id: m.record }); }}>${"Minutes in Records"}<//>` : null}>
      <${APP.KeyFacts} column=${DCOL} items=${[["Date", fmt.dateTime(m.date)], ["Venue", m.venue], ["Quorum", m.quorum], ["Papers due", fmt.date(m.papersDue)], ["Access to unpublished material", m.access], ["Record", m.record || (upcoming ? "Created when the minutes are approved" : "Minutes not yet approved")]]} />
      <${SectionTitle}>${m.body === "Board of Directors" ? "Directors" : "Members"}<//>
      <${A.Avatar.Group} max=${{ count: 7 }}>
        ${CB.directors.slice(0, m.body === "Board of Directors" ? 7 : 3).map(function (d) { return html`<${A.Tooltip} key=${d.id} title=${d.name + ", " + d.role}><${A.Avatar} style=${{ background: tok.colorPrimary }}>${d.name.split(" ").pop().slice(0, 2).toUpperCase()}<//><//>`; })}
      <//>
      ${items.length ? html`<div>
        <${SectionTitle}>Agenda<//>
        <div className="table-scroll"><${A.Table} size="small" rowKey="id" pagination=${false} dataSource=${items} rowClassName="clickable-row"
          onRow=${function (r) { return { onClick: function () { props.onOpen("agenda", r.id); } }; }}
          columns=${[
            { title: "No.", dataIndex: "no", key: "no", width: 50 },
            { title: "Item", dataIndex: "title", key: "title", render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${r.decision + " · " + r.submitterName + ", " + r.dept}</div>${r.restricted ? html`<${A.Tag} color="purple" style=${{ marginTop: 4 }}><${Icon} name="LockOutlined" /> ${r.restricted}<//>` : null}</div>`; } },
            { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } }]} /></div>
      </div>` : null}
      ${past.length ? html`<div>
        <${SectionTitle}>Minutes and resolutions<//>
        ${past.map(function (s) {
          return html`<div key=${s.id} style=${{ padding: "10px 0", borderBottom: "1px solid " + tok.colorBorderSecondary }}>
            <${A.Flex} gap=${6} align="center" wrap="wrap"><${A.Tag} style=${{ marginInlineEnd: 0 }}>${s.type}<//><span style=${{ fontWeight: 500 }}>${s.item + ". " + s.title}</span><${APP.CitationChip} n=${1} cite=${s.cite} /><//>
            <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginTop: 4 }}>${s.text}</div>
          </div>`;
        })}
      </div>` : null}
      ${!items.length && !past.length ? html`<${APP.EmptyHint} title="Agenda not yet published to you" description="Material for this meeting is visible to the committee members, the Company Secretary and Internal Audit." />` : null}
      <${SectionTitle}>Documents from approved templates<//>
      <${A.Flex} gap=${8} wrap="wrap">
        ${["TPL-NOTICE", "TPL-AGENDA", "TPL-MINUTES", "TPL-RES"].map(function (id) { var t = findIn(CB.templates, id); return html`<${A.Button} key=${id} icon=${html`<${Icon} name="FileAddOutlined" />`} onClick=${function () { props.onOpen("template", id); }}>${t.name}<//>`; })}
      <//>
    <//>`;
  }

  function AgendaTab(props) {
    var B = props.cols;
    var s = APP.useStore();
    var rows = B.agenda.list.map(function (a) {
      var sum = a.checks ? checkSummary(buildChecks(a, s)) : null;
      return Object.assign({}, a, { _check: !sum ? "Not checked" : !sum.fail.length ? "All passed" : [sum.missing ? sum.missing + " missing" : null, sum.add ? sum.add + " to add" : null, sum.alert ? sum.alert + " related-party alert" : null].filter(Boolean).join(", "), _ok: sum ? !sum.fail.length : null });
    });
    var columns = [
      { title: "Item", dataIndex: "id", key: "id", render: function (v, r) { return html`<span className="mono nowrap">${r.meetingId + " · " + r.no}</span>`; } },
      { title: "Title", dataIndex: "title", key: "title", width: 320, render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${r.decision}</div></div>`; } },
      { title: "Submitted by", dataIndex: "submitterName", key: "submitterName", render: function (v, r) { return r.submitterId ? html`<${APP.PersonTag} id=${r.submitterId} />` : v + ", " + r.dept; } },
      { title: "Checks", dataIndex: "_check", key: "_check", render: function (v, r) { return r._ok === null ? html`<span style=${{ opacity: 0.6 }}>${v}</span>` : html`<${A.Tag} color=${r._ok ? "green" : "orange"} style=${{ marginInlineEnd: 0 }}>${v}<//>`; } },
      { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${St} status=${v} />`; } },
      { title: "Submitted", dataIndex: "submittedAt", key: "submittedAt", render: function (v) { return html`<span className="nowrap">${fmt.relative(v)}</span>`; } }
    ];
    return html`<div>
      <${Note} title="Agenda submission checks" action=${html`<${APP.SowRef} sec="3.5.1" />`}>Each submission is checked for approval authority, required documents, related parties and completeness against the Articles of Association, CMP and policies. The Company Secretary confirms or returns it with requirements.<//>
      <${APP.DataTable} columns=${columns} data=${rows} searchKeys=${["id", "title", "submitterName", "dept"]} searchPlaceholder="Search agenda items"
        filters=${[{ key: "status", label: "Status", width: 150 }, { key: "meetingId", label: "Meeting", width: 150 }]} onRowClick=${function (r) { props.onOpen("agenda", r.id); }} />
    </div>`;
  }

  function AgendaDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var s = APP.useStore();
    var B = props.cols;
    var item = B.agenda.get(props.id);
    var running = useState(false);
    var modal = useState(null);
    var reqs = useState([]);
    var comment = useState("");
    var reason = useState("");
    var files = useState([]);
    if (!item) return null;
    var meeting = findIn(B.meetings.list, item.meetingId) || {};
    var checks = item.checks ? buildChecks(item, s) : null;
    var sum = checks ? checkSummary(checks) : null;
    var isCosec = me === "cosec";
    var isSubmitter = item.submitterId && item.submitterId === me;
    var history = item.history || [{ at: item.submittedAt, actorId: item.submitterId || "system", text: "Submitted by " + item.submitterName + ", " + item.dept + "." }]
      .concat(item.returnedAt ? [{ at: item.returnedAt, actorId: item.returnedBy, text: "Returned to the submitter with " + (item.requirements || []).length + " requirements." }] : []);
    function addHist(text, patch) { B.agenda.update(item.id, function (x) { var h = x.history || history; return Object.assign({ history: h.concat([{ at: APP.nowIso(), actorId: me, text: text }]) }, patch || {}); }); }
    function runChecks() {
      running[1](true);
      setTimeout(function () {
        running[1](false);
        addHist("Checks run against the Articles of Association, CMP 2025.1, Delegation of authority v2 and the related-party register.", { checks: "run", status: item.status === "Submitted" || item.status === "Resubmitted" ? "Checked" : item.status });
        APP.audit({ action: "Agenda checks run", item: item.id, detail: item.title, dataClass: "Confidential" });
        APP.toast.info("Checklist ready. Review each line before you accept or return the item.");
      }, 1400);
    }
    function doReturn() {
      if (!reqs[0].length) { APP.toast.warn("Select at least one requirement."); return; }
      addHist("Returned to the submitter with " + reqs[0].length + " requirements." + (comment[0].trim() ? " " + comment[0].trim() : ""), { status: "Returned", requirements: reqs[0], returnComment: comment[0].trim(), returnedAt: APP.nowIso(), returnedBy: me });
      APP.audit({ action: "Agenda item returned", item: item.id, detail: reqs[0].length + " requirements", dataClass: "Confidential" });
      if (item.submitterId && item.submitterId !== me) APP.notify({ to: [item.submitterId], kind: "alert", title: "Agenda item returned: " + item.title, body: reqs[0].length + " requirements from " + APP.personName(me) + ". Resubmit by " + fmt.date(meeting.papersDue) + ".", route: "board", params: { id: item.id }, phase: 2 });
      APP.toast.success("Returned to " + item.submitterName + " with " + reqs[0].length + " requirements.");
      modal[1](null); comment[1]("");
    }
    function doAccept() {
      if (sum && sum.fail.length && reason[0].trim().length < 10) { APP.toast.warn("Some checks are not passed. Give the reason for accepting."); return; }
      addHist("Accepted for the agenda" + (sum && sum.fail.length ? " with " + sum.fail.length + " open checks: " + reason[0].trim() : "."), { status: "Accepted", acceptedBy: me, acceptedAt: APP.nowIso() });
      APP.audit({ action: "Agenda item accepted", item: item.id, detail: item.title + (sum && sum.fail.length ? " (override: " + reason[0].trim() + ")" : ""), dataClass: "Confidential" });
      if (item.submitterId && item.submitterId !== me) APP.notify({ to: [item.submitterId], kind: "info", title: "Agenda item accepted: " + item.title, body: "On the agenda for " + fmt.date(meeting.date) + ".", route: "board", params: { id: item.id }, phase: 2 });
      APP.toast.success("Accepted for the agenda. The paper is added to the board pack.");
      modal[1](null); reason[1]("");
    }
    function doResubmit() {
      if (!files[0].length) { APP.toast.warn("Attach at least one document."); return; }
      var add = files[0].map(function (t) { return { name: fixFile(t, item), type: t, pages: 2 }; });
      addHist("Resubmitted with: " + add.map(function (d) { return d.name; }).join(", ") + ".", { docs: item.docs.concat(add), status: "Resubmitted", checks: null });
      APP.audit({ action: "Agenda item resubmitted", item: item.id, detail: add.length + " documents added", dataClass: "Confidential" });
      APP.notify({ to: ["cosec"], kind: "review", title: "Agenda item resubmitted: " + item.title, body: "From " + APP.personName(me) + " with " + add.length + " documents.", route: "board", params: { id: item.id }, phase: 2 });
      APP.toast.success("Resubmitted. A. Jayawardena is notified to run the checks again.");
      modal[1](null); files[1]([]);
    }
    var fixable = sum ? Array.from(new Set(sum.fail.map(function (c) { return c.fix; }).filter(function (f) { return f && !(f === "Legal review" && item.contractId); }))) : [];
    var reqOptions = sum ? sum.fail.filter(function (c) { return c.addition; }).map(function (c) { return c.addition + " (" + (c.cites[0] ? APP.citeLabel(c.cites[0]).split(",").slice(-2).join(",").trim() : c.group) + ")"; }) : [];
    var resubmitTypes = item.status === "Returned" ? (fixable.length ? fixable : (item.requirements || []).map(function (r) { return /financial/i.test(r) ? "Financial evaluation" : /risk/i.test(r) ? "Risk assessment" : /declaration|interest/i.test(r) ? "Declaration of interest" : "Board paper"; })) : [];
    resubmitTypes = Array.from(new Set(resubmitTypes)).filter(function (t) { return !hasDoc(item, t); });

    var groups = ["Approval authority", "Required documents", "Related parties", "Completeness"];
    var checklist = !checks ? (running[0] ? html`<div><${APP.TypingIndicator} label="Checking against the Articles, CMP and the related-party register on Qwen (self-hosted)" /><${A.Skeleton} active paragraph=${{ rows: 5 }} /></div>`
      : html`<${APP.EmptyHint} title=${item.status === "Resubmitted" ? "Resubmitted: run the checks again" : "Not checked yet"} description="Checks cover approval authority, required documents, related parties and completeness."
          action=${html`<${ActBtn} roles=${["cosec"]} type="primary" icon=${html`<${Icon} name="SafetyCertificateOutlined" />`} onClick=${runChecks}>Run checks<//>`} />`)
      : html`<div>
        <${A.Flex} gap=${12} align="center" wrap="wrap" style=${{ marginBottom: 10 }}>
          <div style=${{ width: 220 }}><${A.Progress} percent=${Math.round(sum.passed * 100 / sum.total)} size="small" status=${sum.fail.length ? "normal" : "success"} /></div>
          <span>${sum.passed + " of " + sum.total + " checks passed"}</span>
          ${sum.missing ? html`<${A.Tag} color="red">${sum.missing + " missing"}<//>` : null}
          ${sum.add ? html`<${A.Tag} color="orange">${sum.add + " to add"}<//>` : null}
          ${sum.alert ? html`<${A.Tag} color="red">Related-party alert<//>` : null}
          ${running[0] ? html`<${APP.TypingIndicator} label="Re-running" />` : null}
        <//>
        ${groups.map(function (g) {
          var rows = checks.filter(function (c) { return c.group === g; });
          if (!rows.length) return null;
          return html`<div key=${g} style=${{ marginBottom: 12 }}>
            <div style=${{ fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextSecondary, margin: "8px 0 4px" }}>${g}</div>
            ${rows.map(function (c) {
              var bg = c.outcome === "Passed" ? "transparent" : c.outcome === "Add" ? tok.colorWarningBg : tok.colorErrorBg;
              return html`<div key=${c.id} style=${{ display: "flex", gap: 10, padding: 10, borderRadius: 8, border: "1px solid " + tok.colorBorderSecondary, background: bg, marginBottom: 6, flexWrap: "wrap" }}>
                <div style=${{ flex: "none", width: 92 }}><${St} status=${c.outcome === "Alert" ? "Alert" : c.outcome} /></div>
                <div style=${{ flex: 1, minWidth: 200 }}>
                  <div style=${{ fontWeight: 500 }}>${c.check}</div>
                  <div style=${{ fontSize: 13 }}>${c.finding}</div>
                  ${c.addition ? html`<div style=${{ fontSize: 13, marginTop: 4 }}><b>Recommended: </b>${c.addition}</div>` : null}
                  <${A.Flex} gap=${4} wrap="wrap" align="center" style=${{ marginTop: 6, fontSize: 12, color: tok.colorTextSecondary }}>
                    <span>Authority:</span>${c.cites.map(function (ct, i) { return html`<span key=${i}>${APP.citeLabel(ct).replace(/ \(sample extract\)| \(sample\)/g, "")}<${APP.CitationChip} n=${i + 1} cite=${ct} cites=${c.cites} /></span>`; })}
                    ${c.link ? html`<${A.Button} size="small" type="link" onClick=${function () { APP.navigate(c.link.route, c.link.params); }}>${c.link.label}<//>` : null}
                  <//>
                </div>
              </div>`;
            })}
          </div>`;
        })}
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Checklist drafted by Qwen (self-hosted) from the Articles of Association, CMP 2025.1, Delegation of authority v2 and the related-party register. Board material is Confidential and stays inside the CICT VPC. The Company Secretary confirms each result.</div>
      </div>`;

    var actions = html`<${Fragment}>
      ${checks && (item.status === "Checked" || item.status === "Resubmitted") ? html`<${ActBtn} roles=${["cosec"]} onClick=${function () { reqs[1](reqOptions); modal[1]("return"); }}>Return to submitter<//>` : null}
      ${checks && item.status === "Checked" ? html`<${ActBtn} roles=${["cosec"]} type="primary" onClick=${function () { modal[1]("accept"); }}>Accept for the agenda<//>` : null}
      ${item.status === "Returned" && isSubmitter ? html`<${A.Button} type="primary" onClick=${function () { files[1](resubmitTypes.slice()); modal[1]("resubmit"); }}>Resubmit<//>` : null}
      ${checks && item.status !== "Accepted" ? html`<${ActBtn} roles=${["cosec"]} icon=${html`<${Icon} name="SyncOutlined" />`} onClick=${runChecks}>Run again<//>` : null}
    <//>`;

    var hasAlert = sum && sum.alert;
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${900} title=${"Item " + item.no + ". " + item.title} subtitle=${item.meetingId + " · " + fmt.date(meeting.date) + " · " + item.decision}
      tags=${html`<${Fragment}><${St} status=${item.status} /><${APP.DataClassTag} cls="Confidential" /><//>`} actions=${actions}>
      ${hasAlert ? html`<${Note} type="error" title="Related-party alert">${RP[item.counterparty].text + " The director must declare the interest and must not vote or count in the quorum (Article 98)."}<//>` : null}
      ${item.status === "Returned" ? html`<${A.Card} size="small" style=${{ marginBottom: 12, borderColor: tok.colorWarningBorder, background: tok.colorWarningBg }}
          title=${"Returned " + fmt.dateTime(item.returnedAt) + " by " + APP.personName(item.returnedBy)}>
          <ol style=${{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>${(item.requirements || []).map(function (r, i) { return html`<li key=${i}>${r}</li>`; })}</ol>
          ${item.returnComment ? html`<div style=${{ marginTop: 6 }}>${item.returnComment}</div>` : null}
          ${!isSubmitter && item.submitterId ? html`<div style=${{ marginTop: 8 }}><${A.Button} size="small" onClick=${function () { switchTo(item.submitterId); }}>${"Switch to " + APP.personName(item.submitterId) + " to resubmit"}<//></div>` : null}
        <//>` : null}
      ${item.status === "Accepted" && item.acceptedBy ? html`<${Note} type="success" title=${"Accepted by " + APP.personName(item.acceptedBy) + ", " + fmt.dateTime(item.acceptedAt)}>The paper is in the board pack.<//>` : null}
      <${APP.KeyFacts} column=${DCOL} items=${[["Submitted by", item.submitterName + ", " + item.dept], ["Submitted", fmt.dateTime(item.submittedAt)], ["Decision sought", item.decision], ["Value", item.value || "None"],
        ["Counterparty", item.counterparty || "None"], ["Contract", item.contractId ? html`<a onClick=${function () { APP.navigate("contracts", { id: item.contractId }); }}>${item.contractId}</a>` : "None"],
        ["Papers due", fmt.date(meeting.papersDue)], ["Access", item.restricted || "All directors"]]} />
      <${SectionTitle}>Checklist<//>
      ${checklist}
      <${SectionTitle}>Documents<//>
      <${A.Flex} vertical=${true} gap=${6}>
        ${(item.required || []).map(function (t) {
          var d = item.docs.filter(function (x) { return x.type === t; })[0];
          var rec = !d && t === "Legal review" && item.contractId ? legalReviewRecord(s, item.contractId) : null;
          return html`<${A.Flex} key=${t} gap=${8} align="center" wrap="wrap">
            <${Icon} name=${d || rec ? "CheckCircleTwoTone" : "CloseCircleOutlined"} style=${{ color: d || rec ? tok.colorSuccess : tok.colorError }} />
            <span style=${{ width: 170, fontWeight: 500 }}>${t}</span>
            ${d ? html`<${APP.FileChip} name=${d.name} meta=${d.pages + " pages"} onClick=${function () { APP.toast.build("In the build, " + d.name + " opens in the viewer with a reader watermark."); }} />`
              : rec ? html`<${APP.FileChip} name=${rec.title} meta=${rec.id + ", from Records"} onClick=${function () { APP.navigate("records", { id: rec.id }); }} />`
              : html`<${A.Tag} color="red">Missing<//>`}
          <//>`;
        })}
        ${item.docs.filter(function (d) { return (item.required || []).indexOf(d.type) < 0; }).map(function (d, i) { return html`<${A.Flex} key=${"x" + i} gap=${8} align="center" wrap="wrap"><${Icon} name="PaperClipOutlined" /><span style=${{ width: 170 }}>${d.type}</span><${APP.FileChip} name=${d.name} meta=${d.pages + " pages"} onClick=${function () { APP.toast.build("In the build, " + d.name + " opens in the viewer."); }} /><//>`; })}
      <//>
      <${SectionTitle}>History<//>
      <${Events} items=${history} />
      <${A.Modal} open=${!!modal[0]} onCancel=${function () { modal[1](null); }} destroyOnHidden=${true} width=${620}
        title=${modal[0] === "return" ? "Return to submitter" : modal[0] === "accept" ? "Accept for the agenda" : "Resubmit the agenda item"}
        okText=${modal[0] === "return" ? "Return with requirements" : modal[0] === "accept" ? "Accept" : "Resubmit"}
        onOk=${modal[0] === "return" ? doReturn : modal[0] === "accept" ? doAccept : doResubmit}>
        ${modal[0] === "return" ? html`<div>
          <${Field} label="Requirements" help="Taken from the checks that did not pass. Untick any you don't need.">
            <${A.Checkbox.Group} value=${reqs[0]} onChange=${reqs[1]} style=${{ display: "flex", flexDirection: "column", gap: 8 }} options=${reqOptions} />
          <//>
          <${Field} label="Message to the submitter"><${A.Input.TextArea} rows=${3} value=${comment[0]} onChange=${function (e) { comment[1](e.target.value); }} placeholder=${"Please resubmit by " + fmt.date(meeting.papersDue) + " so the item stays on the agenda."} /><//>
        </div>` : modal[0] === "accept" ? html`<div>
          ${sum && sum.fail.length ? html`<div>
            <${Note} type="warning" title=${sum.fail.length + " checks are not passed"}>${sum.fail.map(function (c) { return c.check; }).join("; ") + "."}<//>
            <${Field} label="Reason for accepting" required=${true}><${A.Input.TextArea} rows=${3} value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }} placeholder="For example: legal review to be tabled at the meeting; the Chair agreed." /><//>
          </div>` : html`<p>All checks passed. The paper goes into the board pack for ${fmt.date(meeting.date)}.</p>`}
        </div>` : html`<div>
          <${Field} label="Documents to attach" help="Sample files for the prototype.">
            ${resubmitTypes.length ? html`<${A.Checkbox.Group} value=${files[0]} onChange=${files[1]} style=${{ display: "flex", flexDirection: "column", gap: 8 }}
              options=${resubmitTypes.map(function (t) { return { value: t, label: fixFile(t, item) }; })} />` : html`<p>No documents to add.</p>`}
          <//>
          ${item.contractId && (item.required || []).indexOf("Legal review") >= 0 && !legalReviewRecord(s, item.contractId) && !hasDoc(item, "Legal review") ? html`<${Note} type="info" title="The legal review comes from Records">
            ${"Run the contract review of " + item.contractId + " in the Assistant and have Li Wei confirm it. The confirmed review is archived in Records and this check picks it up."}
            <div style=${{ marginTop: 8 }}><${A.Button} size="small" onClick=${function () { modal[1](null); APP.navigate("assistant", { start: "contract-review", conversationId: "CONV-201", contractId: item.contractId }); }}>Open the contract review<//></div>
          <//>` : null}
        </div>`}
      <//>
    <//>`;
  }

  function SubmitItemModal(props) {
    var me = useMe();
    var B = props.cols;
    var f = useState({ meetingId: "BRD-2026-04", title: "Approve the security services agreement with Bluewater Security Services", decision: "For approval", value: "USD 410,000 over 2 years", counterparty: "Bluewater Security Services", docs: ["Board paper", "Financial evaluation"] });
    function set(k, v) { var n = Object.assign({}, f[0]); n[k] = v; f[1](n); }
    function submit() {
      if (!f[0].title.trim()) { APP.toast.warn("Give the item a title."); return; }
      var list = colNow("agenda");
      var mItems = list.filter(function (a) { return a.meetingId === f[0].meetingId; });
      var no = mItems.reduce(function (m, a) { return Math.max(m, a.no); }, 0) + 1;
      var id = (f[0].meetingId === "BRD-2026-04" ? "AG-2026-04-" : "AG-ARC-04-") + no;
      var p = APP.persona(me);
      var short = f[0].counterparty ? f[0].counterparty.split(" ")[0] : "item " + no;
      addTo("agenda", { id: id, meetingId: f[0].meetingId, no: no, title: f[0].title.trim(), decision: f[0].decision, submitterId: me, submitterName: p.name, dept: p.dept, submittedAt: APP.nowIso(), status: "Submitted",
        value: f[0].value || null, counterparty: f[0].counterparty || null, contractId: f[0].counterparty === "Bluewater Security Services" ? "CON-2026-030" : null,
        docs: f[0].docs.map(function (t) { return { name: t + ", " + short + (t === "Financial evaluation" ? ".xlsx" : ".docx"), type: t, pages: 3 }; }),
        required: f[0].decision === "For approval" ? ["Board paper", "Financial evaluation", "Legal review"] : ["Board paper"], checks: null, restricted: null, live: true }, true);
      addTo("pack", { id: "PK-" + id, title: "Item " + no + ". " + f[0].title.trim(), kind: "Paper", agendaId: id, pages: 4, status: "Waiting", include: true, live: true }, true);
      APP.audit({ action: "Agenda item submitted", item: id, detail: f[0].title.trim(), dataClass: "Confidential" });
      if (me !== "cosec") APP.notify({ to: ["cosec"], kind: "review", title: "New agenda item: " + f[0].title.trim(), body: "From " + p.name + ", " + p.dept + ".", route: "board", params: { id: id }, phase: 2 });
      APP.toast.success("Submitted as item " + no + ". The Company Secretary checks it next.");
      props.onClose(); props.onOpen("agenda", id);
    }
    return html`<${A.Modal} open=${true} onCancel=${props.onClose} title="Submit an agenda item" okText="Submit" onOk=${submit} width=${640} destroyOnHidden=${true}>
      <${Field} label="Meeting"><${A.Select} value=${f[0].meetingId} onChange=${function (v) { set("meetingId", v); }} style=${{ width: "100%" }}
        options=${[{ value: "BRD-2026-04", label: "BRD-2026-04, Board of Directors, 26 Nov 2026 (papers due 19 Nov)" }, { value: "ARC-2026-04", label: "ARC-2026-04, Audit and Risk Committee, 18 Nov 2026" }]} /><//>
      <${Field} label="Title" required=${true}><${A.Input} value=${f[0].title} onChange=${function (e) { set("title", e.target.value); }} /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} md=${12}><${Field} label="Decision sought"><${A.Segmented} value=${f[0].decision} onChange=${function (v) { set("decision", v); }} options=${["For approval", "For noting"]} /><//><//>
        <${A.Col} xs=${24} md=${12}><${Field} label="Value"><${A.Input} value=${f[0].value} onChange=${function (e) { set("value", e.target.value); }} /><//><//>
      <//>
      <${Field} label="Counterparty"><${A.Input} value=${f[0].counterparty} onChange=${function (e) { set("counterparty", e.target.value); }} /><//>
      <${Field} label="Documents" help="Sample files for the prototype. The checks list what is still needed."><${A.Checkbox.Group} value=${f[0].docs} onChange=${function (v) { set("docs", v); }} options=${["Board paper", "Financial evaluation", "Risk assessment", "Legal review"]} /><//>
    <//>`;
  }

  function PackTab(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var B = props.cols;
    var meta = APP.useShared("cb.packMeta", { status: "Not published", access: "Directors and Company Secretary", watermark: true });
    var preview = useState(false);
    var list = B.pack.list;
    function statusOf(p) {
      if (p.agendaId) { var ag = findIn(B.agenda.list, p.agendaId); return ag && ag.status === "Accepted" ? "Ready" : "Waiting"; }
      return p.status;
    }
    var included = list.filter(function (p) { return p.include; });
    var ready = included.filter(function (p) { return statusOf(p) === "Ready"; });
    var pages = included.reduce(function (n, p) { return n + p.pages; }, 0);
    function move(i, d) {
      var l = list.slice(), j = i + d;
      if (j < 0 || j >= l.length) return;
      var t = l[i]; l[i] = l[j]; l[j] = t;
      B.pack.set(l);
    }
    function publish() {
      var waiting = included.filter(function (p) { return statusOf(p) !== "Ready"; });
      function go() {
        meta[1](Object.assign({}, meta[0], { status: "Published", publishedAt: APP.nowIso(), excluded: waiting.map(function (p) { return p.title; }) }));
        APP.audit({ action: "Board pack published", item: "BRD-2026-04", detail: ready.length + " sections, " + pages + " pages" + (waiting.length ? "; " + waiting.length + " to follow as a supplement" : ""), dataClass: "Confidential" });
        APP.notify({ to: ["cosec"], kind: "info", title: "Board pack published: BRD-2026-04", body: "Sent to 7 directors with reader watermarks." + (waiting.length ? " " + waiting.length + " papers to follow." : ""), route: "board", params: {}, phase: 2 });
        APP.toast.success("Board pack published to the directors' reading room.");
      }
      if (waiting.length) APP.confirm({ title: "Publish without " + waiting.length + " papers?", zIndex: 1300, okText: "Publish", content: waiting.map(function (p) { return p.title; }).join("; ") + ". They follow as a supplement when accepted.", onOk: go });
      else go();
    }
    var columns = [
      { title: "Order", key: "order", width: 90, render: function (v, r, i) {
        return html`<span onClick=${function (e) { e.stopPropagation(); }}><${A.Flex} gap=${2}>
          <${A.Button} size="small" type="text" aria-label="Move up" disabled=${i === 0 || me !== "cosec"} icon=${html`<${Icon} name="ArrowUpOutlined" />`} onClick=${function () { move(i, -1); }} />
          <${A.Button} size="small" type="text" aria-label="Move down" disabled=${i === list.length - 1 || me !== "cosec"} icon=${html`<${Icon} name="ArrowDownOutlined" />`} onClick=${function () { move(i, 1); }} />
        <//></span>`; } },
      { title: "Section", dataIndex: "title", key: "title", render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div>${r.restricted ? html`<${A.Tag} color="purple" style=${{ marginTop: 4 }}><${Icon} name="LockOutlined" /> ${r.restricted}<//>` : null}</div>`; } },
      APP.col.text("Kind", "kind"),
      { title: "Pages", dataIndex: "pages", key: "pages", align: "right" },
      { title: "Status", key: "status", render: function (v, r) { var st = statusOf(r); var ag = r.agendaId ? findIn(B.agenda.list, r.agendaId) : null; return html`<div><${St} status=${st} />${st === "Waiting" && ag ? html`<div style=${{ fontSize: 12, opacity: 0.7 }}>${"Agenda item " + ag.status.toLowerCase()}</div>` : null}</div>`; } },
      { title: "Include", dataIndex: "include", key: "include", render: function (v, r) { return html`<span onClick=${function (e) { e.stopPropagation(); }}><${A.Checkbox} checked=${v} disabled=${me !== "cosec"} onChange=${function (e) { B.pack.update(r.id, { include: e.target.checked }); }} /></span>`; } }
    ];
    return html`<${A.Row} gutter=${[16, 16]}>
      <${A.Col} xs=${24} xxl=${16}>
        <${Note} title="Board pack for BRD-2026-04" action=${html`<${APP.SowRef} sec="3.5.2" />`}>Generated documents use approved templates. Papers join when their agenda item is accepted. Each director gets a watermarked copy, and conflicted directors don't receive restricted papers.<//>
        <${APP.DataTable} columns=${columns} data=${list} search=${false} pageSize=${20} onRowClick=${function (r) { props.onOpen("pack", r.id); }} />
      <//>
      <${A.Col} xs=${24} xxl=${8}>
        <${A.Card} size="small" title="Pack summary">
          <${A.Row} gutter=${12}>
            <${A.Col} span=${12}><${A.Statistic} title="Ready" value=${ready.length} suffix=${"/ " + included.length} /><//>
            <${A.Col} span=${12}><${A.Statistic} title="Pages" value=${pages} /><//>
          <//>
          <${A.Progress} percent=${Math.round(ready.length * 100 / Math.max(1, included.length))} size="small" style=${{ margin: "8px 0 12px" }} />
          <${Field} label="Who can see unpublished material">
            <${A.Select} value=${meta[0].access} disabled=${me !== "cosec"} style=${{ width: "100%" }} onChange=${function (v) { meta[1](Object.assign({}, meta[0], { access: v })); APP.audit({ action: "Pack access changed", item: "BRD-2026-04", detail: v, dataClass: "Confidential" }); APP.toast.success("Access set: " + v + "."); }}
              options=${["Company Secretary only", "Directors and Company Secretary", "Directors, Company Secretary and item invitees"].map(function (x) { return { value: x, label: x }; })} />
          <//>
          <label style=${{ display: "block", marginBottom: 12 }}><${A.Switch} size="small" checked=${meta[0].watermark !== false} disabled=${me !== "cosec"} onChange=${function (v) { meta[1](Object.assign({}, meta[0], { watermark: v })); }} /><span style=${{ marginLeft: 8 }}>Watermark each copy with the reader's name</span></label>
          ${meta[0].status === "Published" ? html`<${Note} type="success" title=${"Published " + fmt.dateTime(meta[0].publishedAt)}>${meta[0].excluded && meta[0].excluded.length ? meta[0].excluded.length + " papers will follow as a supplement." : "All sections sent."}<//>` : null}
          <${A.Flex} gap=${8} wrap="wrap">
            <${A.Button} icon=${html`<${Icon} name="EyeOutlined" />`} onClick=${function () { preview[1](true); }}>Preview pack<//>
            <${ActBtn} roles=${["cosec"]} type="primary" icon=${html`<${Icon} name="SendOutlined" />`} onClick=${publish}>${meta[0].status === "Published" ? "Publish update" : "Publish to directors"}<//>
          <//>
        <//>
      <//>
      ${preview[0] ? html`<${APP.DetailDrawer} open=${true} onClose=${function () { preview[1](false); }} size=${640} title="Board pack preview" subtitle="BRD-2026-04 · Q4 Board meeting">
        <div className="doc-page" style=${{ textAlign: "center", padding: "36px 24px" }}>
          <div style=${{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.6 }}>Strictly confidential · sample</div>
          <h2 style=${{ margin: "12px 0 4px", fontFamily: "inherit" }}>Board of Directors</h2>
          <div>Q4 Board meeting, 26 November 2026, 09:30</div>
          <div style=${{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>${meta[0].watermark !== false ? "Copy for: Director P. Abeysekera (Chair)" : "No watermark"}</div>
        </div>
        <div className="doc-page">
          <h4 style=${{ marginTop: 0 }}>Contents</h4>
          ${(function () { var pg = 2; return included.map(function (p) { var start = pg; pg += p.pages; return html`<div key=${p.id} style=${{ display: "flex", gap: 8, padding: "3px 0", opacity: statusOf(p) === "Ready" ? 1 : 0.55 }}>
            <span style=${{ flex: 1 }}>${p.title + (statusOf(p) === "Ready" ? "" : " (to follow)")}</span><span>${start}</span></div>`; }); })()}
        </div>
      <//>` : null}
    <//>`;
  }

  function PackItemDrawer(props) {
    var tok = A.theme.useToken().token;
    var B = props.cols;
    var p = B.pack.get(props.id);
    if (!p) return null;
    var ag = p.agendaId ? findIn(B.agenda.list, p.agendaId) : null;
    var tpl = p.templateId ? findIn(CB.templates, p.templateId) : null;
    var st = ag ? (ag.status === "Accepted" ? "Ready" : "Waiting") : p.status;
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} title=${p.title} subtitle=${p.kind + " · " + p.pages + (p.pages === 1 ? " page" : " pages")} tags=${html`<${St} status=${st} />`}
      actions=${tpl ? html`<${A.Button} type="primary" onClick=${function () { props.onOpen("template", tpl.id); }}>${st === "Ready" ? "Regenerate" : "Draft from template"}<//>` : ag ? html`<${A.Button} onClick=${function () { props.onOpen("agenda", ag.id); }}>Open the agenda check<//>` : null}>
      ${p.restricted ? html`<${Note} type="info" title="Restricted paper">${p.restricted + ". The reading room hides it from that director and the audit log records it."}<//>` : null}
      ${ag ? html`<div>
        <${APP.KeyFacts} column=${1} items=${[["Agenda item", ag.meetingId + " · item " + ag.no], ["Submitted by", ag.submitterName + ", " + ag.dept], ["Agenda status", html`<${St} status=${ag.status} />`]]} />
        <${SectionTitle}>Documents in this section<//>
        <${A.Flex} wrap="wrap" gap=${8}>${ag.docs.map(function (d, i) { return html`<${APP.FileChip} key=${i} name=${d.name} meta=${d.pages + " pages"} onClick=${function () { APP.toast.build("In the build, " + d.name + " opens in the viewer."); }} />`; })}<//>
      </div>` : tpl ? html`<div>
        <${APP.KeyFacts} column=${1} items=${[["Template", tpl.name + " " + tpl.version + ", approved " + fmt.date(tpl.approved)], ["Owner", tpl.owner]]} />
        <${SectionTitle}>Current draft<//>
        <div className="doc-page">${p.text || tpl.sample.replace("{date}", "26 November 2026 at 09:30").replace("{venue}", "the Board room, Level 5, with video link").replace("{quorum}", "4 of 7 directors").replace("{meeting}", "BRD-2026-04")}</div>
      </div>` : html`<div>
        <${SectionTitle} first=${true}>Declarations of interest<//>
        <div className="doc-page">
          <div>Item 4: Director M. Chen, non-executive director of Northwind Group Holdings (RP-03). Will not receive the paper or vote.</div>
          <div style=${{ marginTop: 8 }}>Item 6: Director D. Wickramasinghe, 12% of Harbourline Holdings Ltd (RP-07). Will not receive the paper or vote.</div>
        </div>
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Built from the related-party register and the agenda checks. Drafted by the assistant; the Company Secretary confirms.</div>
        <div style=${{ marginTop: 10 }}><${ActBtn} roles=${["cosec"]} type="primary" onClick=${function () { B.pack.update(p.id, { status: "Ready" }); APP.audit({ action: "Pack section confirmed", item: p.id, detail: p.title, dataClass: "Confidential" }); APP.toast.success("Declarations confirmed and marked ready."); }}>Confirm declarations<//></div>
      </div>`}
    <//>`;
  }

  function BoardSearchTab() {
    var tok = A.theme.useToken().token;
    var vp = APP.useViewport();
    var me = useMe();
    var q = useState("crane maintenance");
    var input = useState("crane maintenance");
    var body = useState("All");
    var type = useState("All");
    var year = useState("All years");
    var sel = useState(null);
    var answerKey = useState(0);
    var term = q[0].trim().toLowerCase();
    var isQuestion = /\?$/.test(term) || /^(what|when|has|have|did|who|why|how|is|are|which|was|were)\b/.test(term);
    var words = term.split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2 && ["the", "and", "has", "have", "what", "when", "did", "who", "why", "how", "are", "was", "were", "which", "before", "about", "board", "say"].indexOf(w) < 0; });
    var results = CB.searchCorpus.map(function (r) {
      var hay = (r.title + " " + r.text + " " + r.tags.join(" ")).toLowerCase();
      var score = words.reduce(function (n, w) { return n + (hay.indexOf(w.replace(/s$/, "")) >= 0 ? 1 : 0); }, 0);
      return Object.assign({ score: score }, r);
    }).filter(function (r) {
      if (!words.length || r.score === 0) return false;
      if (type[0] !== "All" && (type[0] === "Minutes" ? r.type !== "Minutes" : r.type !== "Resolution")) return false;
      if (year[0] !== "All years" && r.date.slice(0, 4) !== year[0]) return false;
      if (body[0] === "Audit and Risk Committee") return false;
      return true;
    }).sort(function (a, b) { return b.score - a.score || b.date.localeCompare(a.date); });
    var answer = isQuestion ? CB.boardAnswers.filter(function (a) { return a.keys.some(function (k) { return term.indexOf(k) >= 0; }); })[0] : null;
    var cites = results.map(function (r) { return r.cite; });
    var wide = vp.width >= 1100;
    function highlight(text) {
      if (!words.length) return text;
      var re = new RegExp("(" + words.map(function (w) { return w.replace(/s$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "ig");
      return String(text).split(re).map(function (part, i) { return i % 2 ? html`<mark key=${i} className="ent">${part}</mark>` : part; });
    }
    function openResult(r) { if (wide) sel[1](r.cite); else APP.openSource(r.cite, cites); }
    function run(v) { var t = (v !== undefined ? v : input[0]); input[1](t); q[1](t); sel[1](null); answerKey[1](answerKey[0] + 1); }
    var list = html`<div>
      ${answer ? html`<${A.Card} size="small" style=${{ marginBottom: 12, borderColor: tok.colorPrimaryBorder }}
        title=${html`<${A.Flex} gap=${6} align="center" wrap="wrap"><${Icon} name="RobotOutlined" /><span>Answer</span><${APP.DataClassTag} cls="Confidential" /><${APP.ModelTag} id="m-qwen-sh" /><${A.Tag} style=${{ marginInlineEnd: 0 }}>Draft<//><//>`}>
        <${APP.StreamingText} key=${answerKey[0]} text=${answer.text} cites=${answer.cites} onOpen=${function (c) { if (wide) sel[1](c); else APP.openSource(c, answer.cites); }} />
        <${APP.AnswerTrace} steps=${[
          { label: "Classified as Confidential", detail: "Board material. Self-hosted model only; nothing leaves the CICT VPC.", status: "done" },
          { label: "Access checked", detail: "Only meetings on your access list were searched." + (me !== "cosec" ? " 1 closed session was excluded." : ""), status: "done" },
          { label: "Routed to Qwen (self-hosted)", detail: "vLLM inside the CICT VPC.", status: "done" },
          { label: answer.cites.length + " passages retrieved from approved minutes", detail: answer.cites.map(APP.citeLabel).join("; "), status: "done" },
          { label: "Draft until confirmed", detail: "Search answers support the Company Secretary; they are not a record of the Board.", status: "wait" }]} />
        <${A.Flex} gap=${6} wrap="wrap" style=${{ marginTop: 6 }}>
          <${A.Button} size="small" icon=${html`<${Icon} name="CopyOutlined" />`} onClick=${function () { try { navigator.clipboard.writeText(answer.text.replace(/\[\d\]/g, "")); } catch (e) { /* clipboard may be blocked */ } APP.toast.success("Answer copied with its sources listed."); }}>Copy<//>
          <${A.Button} size="small" icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${function () { APP.navigate("assistant", { conversationId: "CONV-106" }); }}>Continue in the Assistant<//>
        <//>
      <//>` : isQuestion ? html`<${Note} type="warning" title="Not enough evidence for an answer">No approved minutes in your access answer this directly. The matching passages are listed below; check them before relying on them.<//>` : null}
      <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginBottom: 8 }}>${results.length + (results.length === 1 ? " result" : " results") + " from meetings you can access."}</div>
      ${results.length ? results.map(function (r) {
        var active = sel[0] && sel[0].doc === r.cite.doc && sel[0].clause === r.cite.clause;
        return html`<div key=${r.id} className="clickable-row" onClick=${function () { openResult(r); }}
          style=${{ padding: 12, borderRadius: 8, border: "1px solid " + (active ? tok.colorPrimary : tok.colorBorderSecondary), background: active ? tok.colorPrimaryBg : tok.colorBgContainer, marginBottom: 8 }}>
          <${A.Flex} gap=${6} align="center" wrap="wrap">
            <${A.Tag} color=${r.type === "Resolution" ? "purple" : "blue"} style=${{ marginInlineEnd: 0 }}>${r.type}<//>
            <span style=${{ fontWeight: 500 }}>${r.title}</span>
          <//>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary, margin: "4px 0" }}>${r.meetingId + " · " + fmt.date(r.date) + " · " + r.item}</div>
          <div style=${{ fontSize: 13, lineHeight: 1.6 }}>${highlight(r.text)}</div>
          <${A.Flex} gap=${8} align="center" wrap="wrap" style=${{ marginTop: 6, fontSize: 12 }}>
            <span>Source <${APP.CitationChip} n=${results.indexOf(r) + 1} cite=${r.cite} cites=${cites} onOpen=${function () { openResult(r); }} /></span>
            ${r.record ? html`<${A.Button} size="small" type="link" onClick=${function (e) { e.stopPropagation(); APP.navigate("records", { id: r.record }); }}>${"Open " + r.record}<//>` : null}
          <//>
        </div>`;
      }) : html`<${APP.EmptyHint} title="No matches" description="Try another word, such as a party, a resolution number or a topic." />`}
    </div>`;
    return html`<div>
      <${A.Flex} gap=${8} wrap="wrap" style=${{ marginBottom: 10 }}>
        <${A.Input} allowClear value=${input[0]} onChange=${function (e) { input[1](e.target.value); }} onPressEnter=${function () { run(); }} prefix=${html`<${Icon} name="SearchOutlined" />`}
          placeholder="Search by keyword, or ask a question" style=${{ flex: "1 1 280px", maxWidth: 520 }} />
        <${A.Button} type="primary" onClick=${function () { run(); }}>Search<//>
        <${A.Select} value=${body[0]} onChange=${body[1]} style=${{ minWidth: 200 }} options=${["All", "Board of Directors", "Audit and Risk Committee"].map(function (x) { return { value: x, label: x === "All" ? "All meetings" : x }; })} />
        <${A.Select} value=${year[0]} onChange=${year[1]} style=${{ minWidth: 120 }} options=${["All years", "2026", "2025", "2024"].map(function (x) { return { value: x, label: x }; })} />
        <${A.Segmented} value=${type[0]} onChange=${type[1]} options=${["All", "Minutes", "Resolutions"]} />
      <//>
      <${A.Flex} gap=${6} wrap="wrap" style=${{ marginBottom: 12 }}>
        ${["Has the Board approved crane maintenance renewals before?", "What did the Board say about tariff waivers?", "When was the procurement policy last approved?", "sanctions screening"].map(function (sq) {
          return html`<${A.Button} key=${sq} size="small" shape="round" style=${{ whiteSpace: "normal", height: "auto", minHeight: 24, maxWidth: "100%", textAlign: "left" }} icon=${html`<${Icon} name="BulbOutlined" />`} onClick=${function () { run(sq); }}>${sq}<//>`;
        })}
      <//>
      ${wide ? html`<${A.Splitter} style=${{ minHeight: 520, border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8 }}>
        <${A.Splitter.Panel} defaultSize="55%" min="35%"><div style=${{ padding: 12, height: "100%", overflowY: "auto", maxHeight: 760 }}>${list}</div><//>
        <${A.Splitter.Panel} min="30%"><div style=${{ padding: 12 }}>${sel[0] ? html`<${APP.SourcePanel} cite=${sel[0]} cites=${answer && answer.cites.some(function (c) { return c.doc === sel[0].doc && c.clause === sel[0].clause; }) ? answer.cites : cites} onClose=${function () { sel[1](null); }} height=${560} />`
          : html`<${APP.EmptyHint} title="Source" description="Open a result or a citation to see the minutes page with the passage highlighted." />`}</div><//>
      <//>` : list}
    </div>`;
  }

  function TemplatesTab(props) {
    var columns = [
      { title: "Template", dataIndex: "name", key: "name", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
      APP.col.text("Version", "version"), APP.col.date("Approved", "approved"), APP.col.text("Owner", "owner"),
      { title: "Asks for", dataIndex: "prompts", key: "prompts", render: function (v) { return v.join(", "); }, width: 320 }
    ];
    return html`<div>
      <${Note} title="Approved templates" action=${html`<${APP.SowRef} sec="3.5.2" />`}>Drafts are generated from approved templates. The system asks for any information it needs and cites the policies or records it used.<//>
      <${APP.DataTable} columns=${columns} data=${CB.templates} searchKeys=${["name", "owner"]} searchPlaceholder="Search templates" onRowClick=${function (r) { props.onOpen("template", r.id); }} />
    </div>`;
  }

  function TemplateDrawer(props) {
    var tok = A.theme.useToken().token;
    var me = useMe();
    var B = props.cols;
    var t = findIn(CB.templates, props.id);
    var defaults = { "Meeting date and time": "26 November 2026 at 09:30", "Venue or video link": "", "Quorum": "4 of 7 directors", "Meeting": "BRD-2026-04, Q4 Board meeting",
      "Items accepted for the agenda": "", "Resolution number": "2026/19", "Decision": "the Company renews the crane maintenance agreement with Northwind Crane Services (Pvt) Ltd for three years", "Conditions": "legal review of the liability cap",
      "Directors entitled to sign": "All directors except Director M. Chen", "Attendance": "", "Declarations of interest": "", "Decisions per item": "",
      "Decision sought": "", "Background": "", "Financial evaluation": "", "Risk assessment": "", "Legal review": "", "Recommendation": "" };
    var vals = useState(function () { var o = {}; (t ? t.prompts : []).forEach(function (p) { o[p] = defaults[p] || ""; }); return o; });
    var draft = useState(null);
    var tried = useState(false);
    if (!t) return null;
    var missing = t.prompts.filter(function (p) { return !String(vals[0][p] || "").trim(); });
    var accepted = B.agenda.list.filter(function (a) { return a.meetingId === "BRD-2026-04" && a.status === "Accepted"; });
    function generate() {
      tried[1](true);
      if (missing.length) { APP.toast.warn("The template needs: " + missing.join(", ") + "."); return; }
      var v = vals[0], text;
      if (t.id === "TPL-NOTICE") text = "Notice is given that a meeting of the Board of Directors will be held on " + v["Meeting date and time"] + " at " + v["Venue or video link"] + ". The quorum is " + v["Quorum"] + " (Articles of Association). The agenda and papers follow. Directors with an interest in any item must declare it before the item is discussed (Article 98).";
      else if (t.id === "TPL-AGENDA") text = "Agenda for " + v["Meeting"] + ".\n" + accepted.map(function (a) { return a.no + ". " + a.title + " (" + a.decision.toLowerCase() + ")"; }).join("\n") + (v["Items accepted for the agenda"] ? "\n" + v["Items accepted for the agenda"] : "");
      else if (t.id === "TPL-RES") text = "Resolution " + v["Resolution number"] + ". RESOLVED that " + v["Decision"] + ", subject to " + v["Conditions"] + ".";
      else if (t.id === "TPL-WRITTEN") text = "The directors entitled to vote (" + v["Directors entitled to sign"] + ") resolve in writing that " + v["Decision"] + ".";
      else text = t.prompts.map(function (p) { return p + ": " + v[p]; }).join("\n");
      draft[1](text);
      APP.audit({ action: "Draft generated from template", item: t.id, detail: t.name + " " + t.version, dataClass: "Confidential" });
    }
    function saveToPack() {
      var pk = B.pack.list.filter(function (p) { return p.templateId === t.id; })[0];
      if (pk) { B.pack.update(pk.id, { status: "Ready", text: draft[0] }); APP.toast.success(pk.title + " saved to the board pack and marked ready."); }
      else APP.toast.build("In the build, the draft is saved to the meeting folder as Word with the template version recorded.");
      APP.audit({ action: "Draft saved", item: t.id, detail: pk ? "Board pack " + pk.id : "Meeting folder", dataClass: "Confidential" });
      props.onClose();
    }
    return html`<${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${720} title=${t.name} subtitle=${t.version + " · approved " + fmt.date(t.approved) + " · " + t.owner}>
      <${SectionTitle} first=${true}>The template asks for<//>
      ${t.prompts.map(function (p) {
        var err = tried[0] && !String(vals[0][p] || "").trim();
        return html`<${Field} key=${p} label=${p} required=${true} error=${err ? "The draft can't be made without this." : null}>
          <${A.Input.TextArea} autoSize=${{ minRows: 1, maxRows: 4 }} value=${vals[0][p]} status=${err ? "error" : undefined} onChange=${function (e) { var n = Object.assign({}, vals[0]); n[p] = e.target.value; vals[1](n); }}
            placeholder=${p === "Venue or video link" ? "For example: the Board room, Level 5, with video link" : p === "Items accepted for the agenda" ? accepted.length + " accepted items are added automatically; add notes here" : ""} />
        <//>`;
      })}
      <${A.Flex} gap=${8} wrap="wrap">
        <${ActBtn} roles=${["cosec"]} type="primary" icon=${html`<${Icon} name="RobotOutlined" />`} onClick=${generate}>Generate draft<//>
        ${missing.length ? html`<${A.Button} onClick=${function () { var n = Object.assign({}, vals[0]); missing.forEach(function (p) { n[p] = p === "Venue or video link" ? "the Board room, Level 5, with video link" : p === "Items accepted for the agenda" ? "Any other business" : "As set out in the paper"; }); vals[1](n); }}>Fill the sample answers<//>` : null}
      <//>
      ${draft[0] ? html`<div>
        <${SectionTitle}>Draft<//>
        <div className="doc-page" style=${{ whiteSpace: "pre-wrap" }}>${draft[0]}</div>
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${"Built from " + t.name + " " + t.version + ". Cites the Articles of Association and CMP 5.4 where the template requires. A draft until the Company Secretary approves it."}</div>
        <${A.Flex} gap=${8} style=${{ marginTop: 10 }} wrap="wrap">
          <${A.Button} type="primary" onClick=${saveToPack}>Save draft<//>
          <${A.Button} onClick=${function () { APP.toast.build("In the build, the draft downloads as Word on the approved template."); }}>Download Word<//>
        <//>
      </div>` : null}
    <//>`;
  }

  /* ==================================================================
     Registration and global search
     ================================================================== */
  APP.registerScreen("compliance", {
    title: "Compliance and risk", group: "p2", phase: 2, icon: "SafetyOutlined", sow: ["3.4.1", "3.4.3", "3.4.4", "3.4.5"],
    summary: "Contract-versus-payment anomaly alerts, compliance checks, control testing, remediation and key-position approval checks.",
    features: ["Anomaly alerts with contract, difference and recommended checks", "Alert to case to conclusion", "Compliance checks against policy and law", "Control tests with samples and materials", "Remediation register with reviewed closure", "Approval checks for key positions"],
    roles: ["compliance", "legal", "owner", "reviewer", "cosec", "auditor"],
    render: ComplianceScreen
  });
  APP.registerScreen("screening", {
    title: "Sanctions screening", group: "p2", phase: 2, icon: "SecurityScanOutlined", sow: ["3.4.2"],
    summary: "OFAC and EU screening of customers, shipping lines and other parties, with each hit decided by a person.",
    features: ["Screen one entity or bulk upload", "Hits with list source, list date and match score", "Side-by-side comparison and why it matched", "True match, false positive or need more info, with a reason", "List status and export control checks"],
    roles: ["compliance", "legal", "owner", "reviewer", "cosec", "auditor"],
    render: ScreeningScreen
  });
  APP.registerScreen("board", {
    title: "Board affairs", group: "p2", phase: 2, icon: "TeamOutlined", sow: ["3.5.1", "3.5.2"],
    summary: "Meetings, agenda submission checks, board packs from approved templates and search of past meetings.",
    features: ["Meetings and access lists", "Agenda checks: authority, documents, related parties, completeness", "Return to submitter with requirements", "Board pack builder", "Search past meetings with cited results"],
    roles: ["cosec", "legal", "owner", "compliance", "auditor"],
    render: BoardScreen
  });

  APP.registerSearch({ group: "Compliance", items: function (s) {
    var a = (s.ext["cb.alerts"] || CB.alerts).map(function (x) { return { id: x.id, title: x.id + " " + x.rule, subtitle: x.counterparty + " · " + x.status, route: "compliance", params: { id: x.id }, phase: 2, icon: "AlertOutlined" }; });
    var r = (s.ext["cb.remediation"] || CB.remediation).map(function (x) { return { id: x.id, title: x.id + " " + x.title, subtitle: x.dept + " · " + remStatus(x), route: "compliance", params: { id: x.id }, phase: 2, icon: "ToolOutlined" }; });
    var c = (s.ext["cb.controls"] || CB.controls).map(function (x) { return { id: x.id, title: x.id + " " + x.control, subtitle: x.area + " · " + x.status, route: "compliance", params: { id: x.id }, phase: 2, icon: "ExperimentOutlined" }; });
    return a.concat(r, c);
  } });
  APP.registerSearch({ group: "Sanctions screening", items: function (s) {
    return (s.ext["cb.screening"] || CB.screening).map(function (x) { return { id: x.id, title: x.id + " " + x.entity, subtitle: x.role + " · " + resultLabel(x.status), route: "screening", params: { id: x.id }, phase: 2, icon: "SecurityScanOutlined" }; });
  } });
  APP.registerSearch({ group: "Board affairs", items: function (s) {
    var m = (s.ext["cb.meetings"] || CB.meetings).map(function (x) { return { id: x.id, title: x.id + " " + x.title, subtitle: x.body + " · " + fmt.date(x.date), route: "board", params: { id: x.id }, phase: 2, icon: "CalendarOutlined" }; });
    var g = (s.ext["cb.agenda"] || CB.agenda).map(function (x) { return { id: x.id, title: "Agenda item " + x.no + ": " + x.title, subtitle: x.meetingId + " · " + x.status, route: "board", params: { id: x.id }, phase: 2, icon: "FileDoneOutlined" }; });
    return m.concat(g);
  } });
})();
