/* Screen area: contracts. Routes: contracts (register, performance, deadlines, due diligence, template drafting,
   contract detail) and contract-review (document beside checklist findings, redlines, send for review).
   Mock data lives in app/data/contracts.js (APP_DATA.contractsArea). See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, Icon = APP.Icon, fmt = APP.fmt, dayjs = APP.dayjs;
  var X = D.contractsArea;
  var useState = APP.useState, useEffect = APP.useEffect, useMemo = APP.useMemo, useRef = APP.useRef, Fragment = APP.Fragment;

  /* ==================================================================
     Helpers
     ================================================================== */
  var CONTENT_ROLES = ["legal", "owner", "reviewer", "compliance", "cosec"];
  function canSeeExact(pid) { return CONTENT_ROLES.indexOf(pid) >= 0; }
  function blockedMsg(pid) {
    if (pid === "auditor") return "Auditors have read-only access. In the build, this action is hidden for your role.";
    if (pid === "admin") return "Administrators manage configuration, not business content. In the build, this action is hidden for your role.";
    return null;
  }
  function guard(pid, fn) {
    return function () {
      var b = blockedMsg(pid);
      if (b) { APP.toast.info(b); return; }
      return fn.apply(null, arguments);
    };
  }
  function stop(e) { if (e && e.stopPropagation) e.stopPropagation(); }
  function go(route, params) { return function (e) { if (e && e.preventDefault) e.preventDefault(); APP.navigate(route, params || {}); }; }

  var EMPTY_EXTRA = { number: "To be assigned", responsible: "N. Perera", businessOwner: "", exactValue: "", payment: "", law: "", source: "", extracted: [], history: [], documents: [], pastReviews: [] };
  function extraFor(c) { return (c && c.extra) || X.extras[c && c.id] || EMPTY_EXTRA; }

  /* Shared map helper on top of APP.useShared */
  function useMap(key) {
    var p = APP.useShared(key, {});
    var set = function (k, v) {
      p[1](function (prev) {
        var n = Object.assign({}, prev || {});
        n[k] = typeof v === "function" ? v(n[k]) : v;
        return n;
      });
    };
    return [p[0] || {}, set];
  }
  function useList(key) {
    var p = APP.useShared(key, []);
    var add = function (item) { p[1](function (prev) { return (prev || []).concat([item]); }); };
    return [p[0] || [], add, p[1]];
  }

  function useContracts() {
    var created = APP.useStore(function (s) { return s.ext["contracts.created"]; }) || [];
    var st = APP.useStore(function (s) { return s.ext["contracts.status"]; }) || {};
    return D.contracts.concat(created).map(function (c) {
      var o = st[c.id];
      return o ? Object.assign({}, c, { status: o.status }) : c;
    });
  }
  function useObligations(c) {
    var added = APP.useStore(function (s) { return s.ext["contracts.oblAdded"]; }) || {};
    var ov = APP.useStore(function (s) { return s.ext["contracts.obl"]; }) || {};
    return (c.obligations || []).concat(added[c.id] || []).map(function (o) {
      var x = ov[o.id];
      return Object.assign({ contractId: c.id }, o, x ? { status: x.status, verification: x } : {});
    });
  }
  function allMilestones(msAdded) {
    return D.deadlines.filter(function (d) { return d.contractId && d.phase === 1; }).concat(X.milestones).concat(msAdded || []);
  }
  function ddList(created) { return X.dueDiligence.concat(created || []); }
  function contractById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function shortParty(name) { return String(name || "").replace(/ \(Pvt\) Ltd| Ltd$/g, ""); }
  function valueRange(amount, cur) {
    var a = Number(amount) || 0, c = cur || "USD";
    if (c !== "USD") return c + " " + fmt.number(a);
    if (a < 50000) return "USD under 50k";
    if (a < 100000) return "USD 50-100k";
    if (a < 250000) return "USD 100-250k";
    if (a < 500000) return "USD 250-500k";
    if (a < 1000000) return "USD 500k-1m";
    if (a < 2000000) return "USD 1-2 million";
    return "USD over 2 million";
  }
  function riskLabel(r) { return r === "Not rated" || r === "To verify" ? r : r + " risk"; }
  function ddRatingTone(r) { return r === "High" ? "error" : r === "Medium" || r === "To verify" ? "warning" : r === "Low" ? "success" : "default"; }
  function modelName(id) { for (var i = 0; i < D.models.length; i++) if (D.models[i].id === id) return D.models[i].name; return id || ""; }
  function oblAttention(status) { return ["Overdue", "Discrepancy", "Missing evidence"].indexOf(status) >= 0; }

  /* ==================================================================
     Small shared components
     ================================================================== */
  function TriTag(props) {
    var m = { "Met": ["success", "CheckCircleOutlined"], "Not met": ["error", "CloseCircleOutlined"], "Unsure": ["warning", "QuestionCircleOutlined"] }[props.status] || ["default", "MinusCircleOutlined"];
    return html`<${A.Tag} color=${m[0]} icon=${html`<${Icon} name=${m[1]} />`} style=${{ marginInlineEnd: 0 }}>${props.status}<//>`;
  }
  function RiskTag(props) {
    return html`<${APP.StatusTag} status=${props.risk} tone=${props.risk === "Not rated" ? "default" : undefined}>${riskLabel(props.risk)}<//>`;
  }
  function Section(props) {
    return html`<${A.Card} size="small" title=${props.title} extra=${props.extra} style=${Object.assign({ marginBottom: 16 }, props.style || {})}
      styles=${props.flush ? { body: { padding: 0 } } : undefined}>${props.children}<//>`;
  }
  function Label(props) {
    var tok = A.theme.useToken().token;
    return html`<div style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextTertiary, marginBottom: 2 }}>${props.children}</div>`;
  }
  function PhaseLink(props) {
    var on = APP.usePhase().phase2On;
    if (props.phase === 2 && !on) {
      return html`<span style=${{ display: "inline-flex", gap: 6, alignItems: "center", opacity: 0.7 }}><${Icon} name="LockOutlined" />${props.label} <${APP.PhaseTag} phase=${2} /></span>`;
    }
    return html`<span style=${{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <a href=${"#" + props.route} onClick=${go(props.route, props.params)}>${props.label}</a>
      ${props.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
    </span>`;
  }
  function ValueText(props) {
    var pid = APP.usePersona().personaId;
    var c = props.contract, ex = extraFor(c);
    if (canSeeExact(pid) && ex.exactValue) return html`<span className="nowrap">${ex.exactValue}</span>`;
    return html`<${A.Tooltip} title="Shown as a range for your role. Exact prices need Sensitive access."><span className="nowrap">${c.value} <${Icon} name="EyeInvisibleOutlined" style=${{ opacity: 0.5 }} /></span><//>`;
  }
  function FactBlock(props) {
    return html`<div style=${{ marginBottom: 10 }}><${Label}>${props.label}<//><div style=${{ lineHeight: 1.55 }}>${props.children}</div></div>`;
  }

  /* ==================================================================
     Contracts screen (route: contracts)
     ================================================================== */
  var MAIN_TABS = ["register", "performance", "deadlines", "diligence", "drafting"];
  var TAB_ALIAS = { templates: "drafting", obligations: "performance", milestones: "deadlines" };

  function ContractsScreen(props) {
    var params = props.params || {};
    var route = APP.useRoute();
    if (params.id) return html`<${ContractDetail} key=${params.id} id=${params.id} tab=${params.tab} at=${route.at} />`;
    return html`<${ContractsHome} tab=${params.tab} at=${route.at} />`;
  }

  function ContractsHome(props) {
    var pid = APP.usePersona().personaId;
    var want = TAB_ALIAS[props.tab] || props.tab;
    var tab = useState(MAIN_TABS.indexOf(want) >= 0 ? want : "register");
    useEffect(function () { if (want && MAIN_TABS.indexOf(want) >= 0) tab[1](want); }, [want, props.at]);
    var contracts = useContracts();
    var oblOv = APP.useStore(function (s) { return s.ext["contracts.obl"]; }) || {};
    var ddCreated = APP.useStore(function (s) { return s.ext["contracts.ddCreated"]; }) || [];
    var quick = useState("all");

    var attention = 0;
    contracts.forEach(function (c) { (c.obligations || []).forEach(function (o) { var st = oblOv[o.id] ? oblOv[o.id].status : o.status; if (oblAttention(st)) attention++; }); });
    var ending = contracts.filter(function (c) { var n = fmt.daysUntil(c.end); return c.status !== "Expired" && n >= 0 && n <= 90; }).length;
    var active = contracts.filter(function (c) { return ["Active", "Expiring soon", "Under review"].indexOf(c.status) >= 0; }).length;
    var ddOpen = ddList(ddCreated).filter(function (d) { return d.status !== "Approved"; }).length;

    function stat(title, value, icon, note, onClick, warn) {
      return html`<${A.Col} xs=${12} lg=${6}>
        <${A.Card} size="small" hoverable onClick=${onClick} style=${{ height: "100%", cursor: "pointer" }}>
          <${A.Statistic} title=${title} value=${value} prefix=${html`<${Icon} name=${icon} />`} />
          <div style=${{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>${note}</div>
        <//>
      <//>`;
    }

    var items = [
      { key: "register", label: html`<span><${Icon} name="UnorderedListOutlined" /> Register</span>`, children: html`<${RegisterTab} contracts=${contracts} quick=${quick[0]} setQuick=${quick[1]} />` },
      { key: "performance", label: html`<span><${Icon} name="CheckSquareOutlined" /> Obligations <${A.Badge} count=${attention} size="small" /></span>`, children: html`<${PerformanceTab} contracts=${contracts} />` },
      { key: "deadlines", label: html`<span><${Icon} name="CalendarOutlined" /> Deadlines and reminders</span>`, children: html`<${DeadlinesTab} contracts=${contracts} />` },
      { key: "diligence", label: html`<span><${Icon} name="AuditOutlined" /> Due diligence</span>`, children: html`<${DiligenceTab} contracts=${contracts} />` },
      { key: "drafting", label: html`<span><${Icon} name="FormOutlined" /> Templates and drafting</span>`, children: html`<${DraftingTab} />` }
    ];

    return html`<div>
      <${APP.PageHeader} title="Contracts" phase=${1} sow=${["3.1.4", "3.1.5"]}
        subtitle="One register for contract text, obligations, deadlines, due diligence and review results. Fields are extracted from the contract and confirmed by a person."
        actions=${html`<${Fragment}>
          <${A.Dropdown} trigger=${["click"]} menu=${{
            items: [
              { key: "excel", icon: html`<${Icon} name="FileExcelOutlined" />`, label: "Export register to Excel" },
              { key: "pdf", icon: html`<${Icon} name="FilePdfOutlined" />`, label: "Export register to PDF" },
              { type: "divider" },
              { key: "import", icon: html`<${Icon} name="ImportOutlined" />`, label: "Bulk import from a template" },
              { key: "lams", icon: html`<${Icon} name="SyncOutlined" />`, label: "Migration from LAMS" }
            ],
            onClick: function (i) {
              if (i.key === "import") APP.toast.build("In the build, bulk import gives you a field template and a validation report that names each failed row and why (§3.7.3).");
              else if (i.key === "lams") APP.toast.build("In the build, contracts migrate from LAMS within the scope CICT confirms. 214 contracts were migrated in this sample on 3 Oct 2026.");
              else APP.toast.build("In the build, the export follows your permissions: values show as ranges for roles without Sensitive access.");
            }
          }}><${A.Button} icon=${html`<${Icon} name="SwapOutlined" />`}>Import and export<//><//>
          <${A.Button} icon=${html`<${Icon} name="FileSearchOutlined" />`} onClick=${go("contract-review", { id: "CON-2024-051" })}>Review a contract<//>
          <${A.Button} type="primary" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${guard(pid, function () { tab[1]("drafting"); })}>Draft a contract<//>
        <//>`} />
      <${A.Row} gutter=${[16, 16]} style=${{ marginBottom: 16 }}>
        ${stat("Live contracts", active, "FileTextOutlined", contracts.length + " in the register", function () { tab[1]("register"); quick[1]("all"); })}
        ${stat("Ending within 90 days", ending, "HourglassOutlined", "Notice dates included", function () { tab[1]("register"); quick[1]("ending"); })}
        ${stat("Obligations needing action", attention, "WarningOutlined", "Overdue, missing evidence or discrepancy", function () { tab[1]("performance"); })}
        ${stat("Due diligence open", ddOpen, "AuditOutlined", "Drafts, reviews due, materials missing", function () { tab[1]("diligence"); })}
      <//>
      <${A.Card} styles=${{ body: { paddingTop: 4 } }}>
        <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${items} />
      <//>
    </div>`;
  }

  /* ---------- Register ---------- */
  function RegisterTab(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var sel = useState([]);
    var oblOv = APP.useStore(function (s) { return s.ext["contracts.obl"]; }) || {};
    var q = props.quick;
    var data = props.contracts.filter(function (c) {
      if (q === "attention") return c.risk === "High" || (c.obligations || []).some(function (o) { return oblAttention(oblOv[o.id] ? oblOv[o.id].status : o.status); });
      if (q === "ending") { var n = fmt.daysUntil(c.end); return c.status !== "Expired" && n >= 0 && n <= 90; }
      if (q === "drafts") return c.status === "Draft";
      if (q === "mine") return c.ownerId === pid;
      return true;
    });
    var columns = [
      { title: "Contract", key: "contract", sorter: function (a, b) { return a.id.localeCompare(b.id); }, render: function (_, r) {
        return html`<div style=${{ minWidth: 200 }}><div className="mono" style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${r.id}</div><div style=${{ fontWeight: 500 }}>${r.title}</div></div>`;
      } },
      { title: "Counterparty", dataIndex: "counterparty", key: "counterparty", render: function (v) { return html`<span>${shortParty(v)}</span>`; } },
      { title: "Type", key: "type", render: function (_, r) { return html`<div><div className="nowrap">${r.type}</div><div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.dept}</div></div>`; } },
      { title: "Value", key: "value", render: function (_, r) { return html`<${ValueText} contract=${r} />`; } },
      { title: "Ends", key: "end", sorter: function (a, b) { return String(a.end).localeCompare(String(b.end)); }, render: function (_, r) {
        var n = fmt.daysUntil(r.end);
        return html`<div className="nowrap">${fmt.date(r.end)}<div style=${{ fontSize: 12, color: n < 0 ? tok.colorTextTertiary : n <= 90 ? tok.colorWarningText : tok.colorTextTertiary }}>${n < 0 ? "Ended" : fmt.dueLabel(r.end)}</div></div>`;
      } },
      APP.col.status("Status", "status"),
      { title: "Risk", dataIndex: "risk", key: "risk", render: function (v) { return html`<${RiskTag} risk=${v} />`; } },
      { title: "Flags", key: "flags", render: function (_, r) {
        if (!r.flags || !r.flags.length) return html`<span style=${{ color: tok.colorTextTertiary }}>None</span>`;
        return html`<${A.Tooltip} title=${html`<ul style=${{ margin: 0, paddingLeft: 16 }}>${r.flags.map(function (f, i) { return html`<li key=${i}>${f}</li>`; })}</ul>`}>
          <span style=${{ display: "inline-flex", gap: 6, alignItems: "center", maxWidth: 260 }}><${A.Badge} count=${r.flags.length} color=${tok.colorWarning} size="small" />
          <span style=${{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${r.flags[0]}</span></span>
        <//>`;
      } }
    ];
    var expiryOpts = [{ value: "expired", label: "Ended" }, { value: "90", label: "Ends within 90 days" }, { value: "365", label: "Ends within 12 months" }, { value: "later", label: "Ends later" }];
    return html`<div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div style=${{ maxWidth: "100%", overflowX: "auto" }}><${A.Segmented} value=${q} onChange=${props.setQuick} options=${[
          { value: "all", label: "All" }, { value: "attention", label: "Needs attention" }, { value: "ending", label: "Ending soon" },
          { value: "drafts", label: "Drafts" }, { value: "mine", label: "Mine" }]} /></div>
        <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Search and filter by entity, type, status, period and risk <${APP.SowRef} sec="3.1.4" /></span>
      </div>
      <${APP.DataTable} data=${data} columns=${columns} pageSize=${8}
        searchKeys=${["id", "title", "counterparty", "type", "dept", "flags"]} searchPlaceholder="Search number, title, party or flag"
        filters=${[
          { key: "status", label: "Status", width: 140 },
          { key: "risk", label: "Risk", width: 120 },
          { key: "counterparty", label: "Counterparty", width: 200 },
          { key: "expiry", label: "Expiry", width: 180, options: expiryOpts, match: function (r, v) {
            var n = fmt.daysUntil(r.end);
            if (v === "expired") return n < 0;
            if (v === "90") return n >= 0 && n <= 90;
            if (v === "365") return n >= 0 && n <= 365;
            return n > 365;
          } },
          { key: "type", label: "Type", width: 160 }
        ]}
        rowSelection=${{ selectedRowKeys: sel[0], onChange: function (k) { sel[1](k); } }}
        toolbar=${sel[0].length ? html`<${A.Button} size="small" icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${function () { APP.toast.build("In the build, " + sel[0].length + " selected contracts export to Excel with their obligations and deadlines."); }}>${"Export " + sel[0].length + " selected"}<//>` : null}
        onRowClick=${function (r) { APP.navigate("contracts", { id: r.id }); }}
        emptyTitle="No contracts match" />
      ${!canSeeExact(pid) ? html`<div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 8 }}>Values show as ranges for your role. Exact prices are visible to roles with Sensitive access <${APP.SowRef} sec="1.5" />.</div>` : null}
    </div>`;
  }

  /* ---------- Obligations across contracts ---------- */
  function PerformanceTab(props) {
    var tok = A.theme.useToken().token;
    var added = APP.useStore(function (s) { return s.ext["contracts.oblAdded"]; }) || {};
    var ov = APP.useStore(function (s) { return s.ext["contracts.obl"]; }) || {};
    var open = useState(null);
    var rows = [];
    props.contracts.forEach(function (c) {
      (c.obligations || []).concat(added[c.id] || []).forEach(function (o) {
        var x = ov[o.id];
        rows.push(Object.assign({ contractId: c.id, contractTitle: c.title, counterparty: c.counterparty }, o, x ? { status: x.status, verification: x } : {}, { flag: (X.obligationDetails[o.id] || {}).flag || "" }));
      });
    });
    var issues = rows.filter(function (r) { return oblAttention(r.status); });
    var current = open[0] ? rows.filter(function (r) { return r.id === open[0]; })[0] : null;
    return html`<div>
      ${issues.length ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }}
        message=${issues.length + " obligations need action"} title=${issues.length + " obligations need action"}
        description="Agreed obligations are compared with actual performance. Delays, missing materials and payment or delivery discrepancies are flagged for a person to verify." />` : null}
      <${APP.DataTable} data=${rows} pageSize=${8} searchKeys=${["id", "desc", "contractId", "contractTitle", "counterparty", "owner"]} searchPlaceholder="Search obligations"
        filters=${[{ key: "status", label: "Status", width: 160 }, { key: "type", label: "Type", width: 140 }, { key: "contractId", label: "Contract", width: 160 }]}
        columns=${[
          { title: "Contract", key: "c", render: function (_, r) { return html`<div><div className="mono" style=${{ fontSize: 12 }}>${r.contractId}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${shortParty(r.counterparty)}</div></div>`; } },
          { title: "Obligation", dataIndex: "desc", key: "desc", render: function (v, r) { return html`<div style=${{ minWidth: 220 }}>${v}${r.flag ? html`<div><${A.Tag} color="orange" style=${{ marginTop: 4 }}>${r.flag}<//></div>` : null}</div>`; } },
          APP.col.text("Type", "type"),
          APP.col.date("Due", "due"),
          APP.col.text("Owner", "owner"),
          APP.col.status("Status", "status")
        ]}
        onRowClick=${function (r) { open[1](r.id); }} />
      <${ObligationDrawer} obligation=${current} onClose=${function () { open[1](null); }} />
    </div>`;
  }

  function ObligationDrawer(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var phase2On = APP.usePhase().phase2On;
    var o = props.obligation;
    var ovm = useMap("contracts.obl");
    var result = useState("Verified"), comment = useState("");
    useEffect(function () { result[1]("Verified"); comment[1](""); }, [o && o.id]);
    if (!o) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var det = X.obligationDetails[o.id] || { planned: "As stated in the obligation", actual: "No performance recorded yet", evidence: [], note: "" };
    var save = guard(pid, function () {
      var map = { "Verified": "Done", "Discrepancy confirmed": "Discrepancy", "Chase the counterparty": "In progress", "Waived with a reason": "Closed" };
      var rec = { status: map[result[0]], result: result[0], comment: comment[0], by: pid, at: APP.nowIso() };
      ovm[1](o.id, rec);
      APP.audit({ action: "Obligation verified", item: o.id, detail: result[0] + (comment[0] ? ": " + comment[0] : "") + " (" + o.contractId + ")", dataClass: "Internal" });
      APP.toast.success("Verification recorded on " + o.id + ". It shows in the contract history and the audit log.");
    });
    return html`<${APP.DetailDrawer} open=${!!o} onClose=${props.onClose} title=${o.desc} subtitle=${o.id + " · " + o.contractId}
      tags=${html`<${APP.StatusTag} status=${o.status} />`} size=${620}
      actions=${html`<${A.Button} size="small" onClick=${function () { props.onClose(); APP.navigate("contracts", { id: o.contractId, tab: "obligations" }); }}>Open contract<//>`}>
      <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Type", o.type], ["Due", fmt.date(o.due) + " (" + fmt.dueLabel(o.due) + ")"], ["Responsible", o.owner], ["Contract", o.contractId]]} />
      <${A.Row} gutter=${[12, 12]} style=${{ marginTop: 16 }}>
        <${A.Col} xs=${24} md=${12}><${A.Card} size="small" title="Agreed"><div>${det.planned}</div><//><//>
        <${A.Col} xs=${24} md=${12}><${A.Card} size="small" title="Actual"><div>${det.actual}</div><//><//>
      <//>
      ${det.flag ? html`<${A.Alert} type=${det.flag === "Payment discrepancy" ? "error" : "warning"} showIcon style=${{ marginTop: 12 }} message=${det.flag} title=${det.flag} description=${det.note} />`
        : det.note ? html`<div style=${{ marginTop: 12, color: tok.colorTextSecondary }}>${det.note}</div>` : null}
      <div style=${{ marginTop: 16 }}>
        <div style=${{ fontWeight: 600, marginBottom: 6 }}>Supporting evidence</div>
        ${det.evidence.length ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 6 }}>${det.evidence.map(function (n) {
          return html`<${APP.FileChip} key=${n} name=${n} meta="In the contract file" onClick=${function () { if (/Insurance/.test(n)) APP.openSource({ doc: "INS-051", clause: "period", page: 1 }); else APP.toast.build("In the build, " + n + " opens in the document viewer."); }} />`;
        })}</div>` : html`<span style=${{ color: tok.colorTextTertiary }}>No evidence uploaded yet.</span>`}
      </div>
      ${det.flag === "Payment discrepancy" ? html`<div style=${{ marginTop: 12 }}>
        ${phase2On ? html`<${A.Button} icon=${html`<${Icon} name="AlertOutlined" />`} onClick=${function () { props.onClose(); APP.navigate("compliance", {}); }}>See the anomaly alert <${APP.PhaseTag} phase=${2} /><//>`
          : html`<span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Contract-against-payment anomaly alerts arrive in Phase 2 <${APP.PhaseTag} phase=${2} /></span>`}
      </div>` : null}
      <${A.Divider} />
      <div style=${{ fontWeight: 600, marginBottom: 8 }}>Record verification <${APP.SowRef} sec="3.1.4" /></div>
      ${o.verification ? html`<${A.Alert} type="success" showIcon style=${{ marginBottom: 12 }}
        message=${o.verification.result + " by " + APP.personName(o.verification.by)} title=${o.verification.result + " by " + APP.personName(o.verification.by)}
        description=${fmt.dateTime(o.verification.at) + (o.verification.comment ? ". " + o.verification.comment : "")} />` : null}
      <${A.Flex} vertical gap=${8}>
        <${A.Select} value=${result[0]} onChange=${result[1]} style=${{ width: "100%" }} options=${["Verified", "Discrepancy confirmed", "Chase the counterparty", "Waived with a reason"].map(function (o) { return { value: o, label: o }; })} />
        <${A.Input.TextArea} rows=${2} placeholder="Handling recommendation or reason" value=${comment[0]} onChange=${function (e) { comment[1](e.target.value); }} />
        <div><${A.Button} type="primary" onClick=${save}>Save verification<//></div>
      <//>
    <//>`;
  }

  /* ---------- Deadlines and reminders ---------- */
  function reminderFor(ms, remMap) { return Object.assign({ days: [30, 7], channels: ["In-app"], to: [ms.ownerName] }, X.reminders[ms.id] || {}, remMap[ms.id] || {}); }
  function msStatus(ms, rem) { if (rem.outcome || ms.outcome) return "Done"; return fmt.dueStatus(ms.date); }

  function DeadlinesTab(props) {
    var tok = A.theme.useToken().token;
    var remMap = APP.useStore(function (s) { return s.ext["contracts.rem"]; }) || {};
    var msAdded = APP.useStore(function (s) { return s.ext["contracts.msAdded"]; }) || [];
    var view = useState("list");
    var open = useState(null);
    var addOpen = useState(false);
    var rows = allMilestones(msAdded).map(function (m) { var r = reminderFor(m, remMap); return Object.assign({}, m, { rem: r, status: msStatus(m, r) }); })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    var current = open[0] ? rows.filter(function (r) { return r.id === open[0]; })[0] : null;
    var byMonth = {};
    rows.forEach(function (r) { var k = dayjs(r.date).format("MMMM YYYY"); (byMonth[k] = byMonth[k] || []).push(r); });
    return html`<div>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <${A.Segmented} value=${view[0]} onChange=${view[1]} options=${[{ value: "list", label: "List" }, { value: "months", label: "By month" }]} />
        <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Payment deadlines, maintenance periods, notice and termination dates, each with its own reminders <${APP.SowRef} sec="3.1.5" /></span>
        <div style=${{ flex: 1 }}></div>
        <${A.Button} icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { addOpen[1](true); }}>Add milestone<//>
      </div>
      ${view[0] === "list" ? html`<${APP.DataTable} data=${rows} pageSize=${10} searchKeys=${["title", "contractId", "ownerName", "kind"]} searchPlaceholder="Search milestones"
        filters=${[{ key: "kind", label: "Kind", width: 130 }, { key: "status", label: "Status", width: 130 }, { key: "contractId", label: "Contract", width: 160 }]}
        columns=${milestoneColumns(tok)} onRowClick=${function (r) { open[1](r.id); }} />`
        : html`<${A.Timeline} items=${Object.keys(byMonth).map(function (k) {
          var c = html`<div><div style=${{ fontWeight: 600, marginBottom: 6 }}>${k}</div>
            ${byMonth[k].map(function (r) {
              return html`<div key=${r.id} className="clickable-row" onClick=${function () { open[1](r.id); }} style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "4px 0" }}>
                <span className="nowrap" style=${{ width: 56, color: tok.colorTextSecondary }}>${fmt.dateShort(r.date)}</span>
                <span className="mono" style=${{ fontSize: 12 }}>${r.contractId}</span>
                <span style=${{ flex: "1 1 200px" }}>${r.title}</span>
                <${APP.StatusTag} status=${r.status} />
              </div>`;
            })}</div>`;
          var anyLate = byMonth[k].some(function (r) { return r.status === "Overdue"; });
          return { key: k, color: anyLate ? "red" : byMonth[k].some(function (r) { return r.status === "Due soon"; }) ? "orange" : "blue", children: c, content: c };
        })} />`}
      <${MilestoneDrawer} milestone=${current} onClose=${function () { open[1](null); }} />
      <${AddMilestoneModal} open=${addOpen[0]} onClose=${function () { addOpen[1](false); }} contracts=${props.contracts} />
    </div>`;
  }
  function milestoneColumns(tok, noContract) {
    var cols = [];
    if (!noContract) cols.push({ title: "Contract", dataIndex: "contractId", key: "contractId", render: function (v) { return html`<span className="mono nowrap">${v}</span>`; } });
    return cols.concat([
      { title: "Milestone", dataIndex: "title", key: "title", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
      APP.col.text("Kind", "kind"),
      { title: "Date", dataIndex: "date", key: "date", render: function (v, r) {
        return html`<div className="nowrap">${fmt.date(v)}<div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.status === "Done" ? "Outcome recorded" : fmt.dueLabel(v)}</div></div>`;
      } },
      { title: "Reminders", key: "rem", render: function (_, r) {
        return html`<div style=${{ fontSize: 12 }}>${r.rem.days.slice().sort(function (a, b) { return b - a; }).join(", ") + " days before"}<div style=${{ color: tok.colorTextTertiary }}>${r.rem.channels.join(", ")}</div></div>`;
      } },
      APP.col.text("Responsible", "ownerName"),
      APP.col.status("Status", "status")
    ]);
  }

  function MilestoneDrawer(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var ms = props.milestone;
    var remm = useMap("contracts.rem");
    var days = useState([]), chans = useState([]), to = useState([]), outcome = useState("");
    useEffect(function () {
      if (!ms) return;
      days[1](ms.rem.days.slice()); chans[1](ms.rem.channels.slice()); to[1](ms.rem.to.filter(Boolean)); outcome[1]("");
    }, [ms && ms.id]);
    if (!ms) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var sendDates = days[0].slice().sort(function (a, b) { return b - a; }).map(function (d) { return dayjs(ms.date).subtract(d, "day"); });
    var save = guard(pid, function () {
      remm[1](ms.id, function (prev) { return Object.assign({}, prev || {}, { days: days[0], channels: chans[0], to: to[0] }); });
      APP.audit({ action: "Reminder changed", item: ms.id, detail: ms.title + ": " + days[0].join(", ") + " days before, " + chans[0].join(", "), dataClass: "Internal" });
      APP.toast.success("Reminders saved. " + to[0].join(" and ") + " will be notified.");
    });
    var saveOutcome = guard(pid, function () {
      if (!outcome[0].trim()) { APP.toast.warn("Write the outcome first."); return; }
      remm[1](ms.id, function (prev) { return Object.assign({}, prev || {}, { outcome: outcome[0].trim(), outcomeBy: pid, outcomeAt: APP.nowIso() }); });
      APP.audit({ action: "Milestone outcome recorded", item: ms.id, detail: ms.title + ": " + outcome[0].trim(), dataClass: "Internal" });
      APP.toast.success("Outcome recorded. Remaining reminders for this milestone stop.");
    });
    var people = ["N. Perera", "S. Silva", "T. Bandara", "H. Kumara", "D. Fonseka", "K. Dias", "P. Senanayake"];
    var outcomeText = ms.rem.outcome || ms.outcome;
    return html`<${APP.DetailDrawer} open=${!!ms} onClose=${props.onClose} title=${ms.title} subtitle=${ms.id + " · " + ms.contractId}
      tags=${html`<${APP.StatusTag} status=${ms.status} />`} size=${600}
      actions=${html`<${A.Button} size="small" onClick=${function () { props.onClose(); APP.navigate("contracts", { id: ms.contractId, tab: "milestones" }); }}>Open contract<//>`}>
      <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Date", fmt.date(ms.date)], ["When", ms.status === "Done" ? "Outcome recorded" : fmt.dueLabel(ms.date)], ["Kind", ms.kind], ["Responsible", ms.ownerName]]} />
      ${outcomeText ? html`<${A.Alert} type="success" showIcon style=${{ marginTop: 12 }} message="Outcome recorded" title="Outcome recorded" description=${outcomeText} />` : null}
      <div style=${{ fontWeight: 600, margin: "16px 0 8px" }}>Reminders</div>
      <${A.Flex} vertical gap=${10}>
        <div><${Label}>Days before<//><${A.Checkbox.Group} value=${days[0]} onChange=${days[1]} options=${[180, 90, 60, 30, 14, 7, 3, 1].map(function (d) { return { value: d, label: String(d) }; })} /></div>
        <div><${Label}>How<//><${A.Checkbox.Group} value=${chans[0]} onChange=${chans[1]} options=${["In-app", "Email", "Teams"]} /></div>
        <div><${Label}>Who<//><${A.Select} mode="multiple" value=${to[0]} onChange=${to[1]} style=${{ width: "100%" }} options=${people.map(function (p) { return { value: p, label: p }; })} /></div>
        <div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>
          ${sendDates.length ? "Sends on " + sendDates.map(function (d) { return d.format("D MMM YYYY"); }).join(", ") + "." : "No reminders set."}
          ${" "}Email and Teams carry a summary and a secure link only.
        </div>
        <div><${A.Button} type="primary" onClick=${save}>Save reminders<//></div>
      <//>
      <${A.Divider} />
      <div style=${{ fontWeight: 600, marginBottom: 8 }}>Record the outcome</div>
      <${A.Input.TextArea} rows=${2} value=${outcome[0]} onChange=${function (e) { outcome[1](e.target.value); }} placeholder="For example: notice sent on 15 Dec 2026 by courier and email" />
      <div style=${{ marginTop: 8 }}><${A.Button} onClick=${saveOutcome}>Save outcome<//></div>
      <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 12 }}>Milestone reminders link to the contract expiry reminder, so changing the end date moves them too <${APP.SowRef} sec="3.1.4" />.</div>
    <//>`;
  }

  function AddMilestoneModal(props) {
    var pid = APP.usePersona().personaId;
    var list = useList("contracts.msAdded");
    var f = useState({ contractId: props.contractId || "CON-2024-051", title: "", kind: "Payment", date: null, ownerName: "N. Perera" });
    useEffect(function () { if (props.open) f[1]({ contractId: props.contractId || "CON-2024-051", title: "", kind: "Payment", date: null, ownerName: "N. Perera" }); }, [props.open]);
    var set = function (k) { return function (v) { var n = Object.assign({}, f[0]); n[k] = v && v.target ? v.target.value : v; f[1](n); }; };
    var ok = guard(pid, function () {
      if (!f[0].title.trim() || !f[0].date) { APP.toast.warn("Add a title and a date."); return; }
      var id = "MS-" + String(10 + list[0].length + 1).padStart(2, "0");
      list[1]({ id: id, contractId: f[0].contractId, title: f[0].title.trim(), kind: f[0].kind, date: f[0].date, ownerName: f[0].ownerName, phase: 1 });
      APP.audit({ action: "Milestone added", item: id, detail: f[0].title.trim() + " on " + fmt.date(f[0].date) + " (" + f[0].contractId + ")", dataClass: "Internal" });
      APP.toast.success("Milestone added with default reminders 30 and 7 days before.");
      props.onClose();
    });
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} onOk=${ok} okText="Add milestone" title="Add a milestone" destroyOnHidden=${true}>
      <${A.Flex} vertical gap=${10}>
        ${props.contractId ? null : html`<div><${Label}>Contract<//><${A.Select} value=${f[0].contractId} onChange=${set("contractId")} style=${{ width: "100%" }}
          options=${(props.contracts || D.contracts).map(function (c) { return { value: c.id, label: c.id + " " + c.title }; })} /></div>`}
        <div><${Label}>Milestone<//><${A.Input} value=${f[0].title} onChange=${set("title")} placeholder="For example: annual load test certificate" /></div>
        <${A.Row} gutter=${8}>
          <${A.Col} xs=${24} sm=${12}><${Label}>Kind<//><${A.Select} value=${f[0].kind} onChange=${set("kind")} style=${{ width: "100%" }} options=${["Payment", "Delivery", "Service", "Notice", "Expiry", "Signing", "Acceptance"].map(function (k) { return { value: k, label: k }; })} /><//>
          <${A.Col} xs=${24} sm=${12}><${Label}>Date<//><${A.DatePicker} style=${{ width: "100%" }} value=${f[0].date ? dayjs(f[0].date) : null} onChange=${function (d) { set("date")(d ? d.format("YYYY-MM-DD") : null); }} /><//>
        <//>
        <div><${Label}>Responsible<//><${A.Select} value=${f[0].ownerName} onChange=${set("ownerName")} style=${{ width: "100%" }} options=${["N. Perera", "S. Silva", "T. Bandara", "H. Kumara", "D. Fonseka"].map(function (p) { return { value: p, label: p }; })} /></div>
      <//>
    <//>`;
  }

  /* ==================================================================
     Contract detail
     ================================================================== */
  var DETAIL_TABS = ["overview", "obligations", "milestones", "documents", "reviews", "diligence"];
  var DETAIL_ALIAS = { deadlines: "milestones", performance: "obligations", dd: "diligence" };

  function ContractDetail(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var contracts = useContracts();
    var c = contractById(contracts, props.id);
    var want = DETAIL_ALIAS[props.tab] || props.tab;
    var tab = useState(DETAIL_TABS.indexOf(want) >= 0 ? want : "overview");
    useEffect(function () { if (want && DETAIL_TABS.indexOf(want) >= 0) tab[1](want); }, [want, props.at]);
    var change = useState(null);
    var s = APP.useStore();
    var obls = useObligations(c || { id: props.id, obligations: [] });
    if (!c) {
      return html`<div><${APP.PageHeader} title="Contract not found" phase=${1} crumbs=${[{ label: "Contracts", route: "contracts", params: {} }, { label: props.id }]} />
        <${A.Card}><${A.Result} status="404" title="This contract isn't in the register" subTitle="It may have been created in a session that was reset."
          extra=${html`<${A.Button} type="primary" onClick=${go("contracts", {})}>Back to the register<//>`} /><//></div>`;
    }
    var ex = extraFor(c);
    var oblIssues = obls.filter(function (o) { return oblAttention(o.status); }).length;
    var revCount = s.reviews.filter(function (r) { return r.ref === c.id; }).length + (ex.pastReviews || []).length;
    var docCount = (ex.documents || []).length + ((s.ext["contracts.docs"] || {})[c.id] || []).length;
    var isSample = c.id === "CON-2024-051";
    var items = [
      { key: "overview", label: "Overview", children: html`<${OverviewTab} contract=${c} onChange=${function (k) { change[1](k); }} goTab=${tab[1]} />` },
      { key: "obligations", label: html`<span>Obligations ${oblIssues ? html`<${A.Badge} count=${oblIssues} size="small" />` : null}</span>`, children: html`<${ObligationsTab} contract=${c} obligations=${obls} />` },
      { key: "milestones", label: "Milestones and reminders", children: html`<${MilestonesTab} contract=${c} />` },
      { key: "documents", label: html`<span>Documents <span style=${{ opacity: 0.6 }}>${docCount}</span></span>`, children: html`<${DocumentsTab} contract=${c} />` },
      { key: "reviews", label: html`<span>Reviews <span style=${{ opacity: 0.6 }}>${revCount}</span></span>`, children: html`<${ReviewsTab} contract=${c} />` },
      { key: "diligence", label: "Due diligence", children: html`<${ContractDiligence} contract=${c} />` }
    ];
    return html`<div>
      <${APP.PageHeader} title=${c.title} phase=${1} sow=${["3.1.4", "3.1.5"]}
        crumbs=${[{ label: "Contracts", route: "contracts", params: {} }, { label: c.id }]}
        tags=${html`<${Fragment}><${APP.StatusTag} status=${c.status} /><${RiskTag} risk=${c.risk} /><${APP.DataClassTag} cls=${c.dataClass} /><//>`}
        subtitle=${shortParty(c.counterparty) + " · " + c.type + " · " + c.dept + " · " + ex.number}
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${guard(pid, function () {
            if (isSample) APP.navigate("assistant", { start: "contract-review", conversationId: APP.flows.CONTRACT_REVIEW_CONVERSATION, contractId: c.id });
            else APP.navigate("assistant", { new: true, contractId: c.id });
          })}>Ask the assistant<//>
          <${A.Button} icon=${html`<${Icon} name="FileSearchOutlined" />`} onClick=${go("contract-review", { id: c.id })}>Review against checklist<//>
          <${A.Dropdown} trigger=${["click"]} menu=${{
            items: ["Amendment", "Renewal", "Suspension", "Termination", "Completion"].map(function (k) { return { key: k, label: "Record " + k.toLowerCase() }; }),
            onClick: guard(pid, function (i) { change[1](i.key); })
          }}><${A.Button} type="primary" icon=${html`<${Icon} name="EditOutlined" />`}>Record a change <${Icon} name="DownOutlined" /><//><//>
        <//>`} />
      ${c.flags && c.flags.length ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Flags:</span>
        ${c.flags.map(function (f, i) {
          var p2 = /screening|CASE-\d|rebate/i.test(f);
          if (p2 && APP.store.getState().ui.phaseMode === "p1") return html`<${A.Tooltip} key=${i} title="Found by a Phase 2 module (compliance, screening or legal affairs). Switch to Phase 1 + 2 to open it."><${A.Tag} icon=${html`<${Icon} name="LockOutlined" />`}>${f + " (Phase 2)"}<//><//>`;
          return html`<${A.Tag} key=${i} color="orange" icon=${html`<${Icon} name="FlagOutlined" />`}>${f}<//>`;
        })}
      </div>` : null}
      <${A.Card} styles=${{ body: { paddingTop: 4 } }}>
        <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${items} />
      <//>
      <${ChangeModal} kind=${change[0]} contract=${c} onClose=${function () { change[1](null); }} />
    </div>`;
  }

  function OverviewTab(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var c = props.contract, ex = extraFor(c);
    var histAdded = (APP.useStore(function (s) { return s.ext["contracts.history"]; }) || {})[c.id] || [];
    var extm = useMap("contracts.extract");
    var extState = extm[0][c.id] || {};
    var diff = useState(null);
    var s = APP.useStore();
    var msAdded = s.ext["contracts.msAdded"] || [];
    var remMap = s.ext["contracts.rem"] || {};
    var next = allMilestones(msAdded).filter(function (m) { return m.contractId === c.id && fmt.daysUntil(m.date) >= -30; })
      .map(function (m) { var r = reminderFor(m, remMap); return Object.assign({}, m, { status: msStatus(m, r) }); })
      .sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 4);
    var history = (ex.history || []).concat(histAdded).slice().sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    var dd = ddList(s.ext["contracts.ddCreated"]).filter(function (d) { return d.contractId === c.id; })[0];
    var confirmField = guard(pid, function (field, state) {
      extm[1](c.id, function (prev) { var n = Object.assign({}, prev || {}); n[field] = state; return n; });
      APP.audit({ action: "Extracted field " + state.toLowerCase(), item: c.id, detail: field, dataClass: c.dataClass });
      APP.toast.success(field + " " + state.toLowerCase() + ".");
    });
    return html`<${A.Row} gutter=${[16, 0]}>
      <${A.Col} xs=${24} xl=${16}>
        <${Section} title="Key facts">
          <${APP.KeyFacts} column=${{ xs: 1, sm: 1, md: 2 }} items=${[
            ["Contract number", html`<span className="mono">${ex.number}</span>`], ["Counterparty", c.counterparty],
            ["Type", c.type], ["Department", c.dept],
            ["Responsible person", ex.responsible], ["Business owner", ex.businessOwner],
            ["Value", html`<${ValueText} contract=${c} />`], ["Payment", ex.payment],
            ["Signed", c.signed ? fmt.date(c.signed) : "Not signed"], ["Performance period", fmt.date(c.start) + " to " + fmt.date(c.end)],
            ["Renewal", c.renewal], ["Notice by", c.noticeBy ? fmt.date(c.noticeBy) + " (" + fmt.dueLabel(c.noticeBy) + ")" : "Not applicable"],
            ["Governing law", ex.law], ["Source", ex.source]
          ]} />
        <//>
        <${Section} title=${html`<span>Extracted from the contract text <${APP.SowRef} sec="3.1.4" /></span>`}
          extra=${html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>A person confirms each field</span>`}>
          ${ex.extracted && ex.extracted.length ? html`<div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="field" dataSource=${ex.extracted}
            rowClassName=${function () { return "clickable-row"; }}
            onRow=${function (r) { return { onClick: function (ev) {
              if (ev.target && ev.target.closest && ev.target.closest("button")) return;
              var m = /Clause ([\d.]+)/i.exec(r.where || ""), pg = /page (\d+)/i.exec(r.where || "");
              var clause = m ? m[1] : /signature/i.test(r.where || "") ? "sig" : null;
              if (c.docId && clause && APP.findClause(c.docId, clause)) APP.openSource({ doc: c.docId, clause: clause, page: pg ? Number(pg[1]) : undefined });
              else APP.toast.build("In the build, this opens the signed copy at " + (r.where || "the source page") + ", with the extracted value highlighted.");
            } }; }}
            columns=${[
              { title: "Field", dataIndex: "field", key: "field", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
              { title: "Value", dataIndex: "value", key: "value", render: function (v, r) { return /price|value/i.test(r.field) && !canSeeExact(pid) ? c.value : v; } },
              { title: "Found at", dataIndex: "where", key: "where", render: function (v) { return html`<span className="nowrap" style=${{ fontSize: 12 }}>${v}</span>`; } },
              { title: "Confidence", dataIndex: "confidence", key: "confidence", render: function (v) { return html`<${A.Tag} color=${v === "High" ? "green" : "gold"}>${v}<//>`; } },
              { title: "State", key: "state", render: function (_, r) {
                var st = extState[r.field] || r.state;
                if (st === "To verify") return html`<${A.Space} size=${4}><${A.Button} size="small" type="primary" onClick=${function () { confirmField(r.field, "Confirmed"); }}>Confirm<//>
                  <${A.Button} size="small" onClick=${function () { confirmField(r.field, "Corrected"); }}>Correct<//><//>`;
                return html`<${APP.StatusTag} status=${st === "Corrected" ? "Done" : "Confirmed"}>${st}<//>`;
              } }
            ]} /></div>` : html`<${APP.EmptyHint} title="Nothing extracted yet" description="Draft contracts are extracted once the signed copy is uploaded." />`}
        <//>
        <${Section} title="Status and change history" extra=${html`<${A.Button} size="small" onClick=${function () { props.onChange("Amendment"); }}>Record a change<//>`}>
          <${A.Timeline} items=${history.map(function (h, i) {
            var cnt = html`<div>
              <div style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style=${{ fontWeight: 600 }}>${h.event}</span>
                <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${fmt.date(h.at) + " · " + h.by}</span>
                ${h.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
                ${h.live ? html`<${A.Tag} color="blue">This session<//>` : null}
              </div>
              <div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>${h.detail}</div>
              ${h.before && h.after ? html`<${A.Button} size="small" type="link" style=${{ padding: 0 }} onClick=${function () { diff[1](h); }}>See before and after<//>` : null}
            </div>`;
            return { key: String(i), color: h.live ? "blue" : /discrepancy|anomaly|expired/i.test(h.event) ? "red" : "gray", children: cnt, content: cnt };
          })} />
        <//>
      <//>
      <${A.Col} xs=${24} xl=${8}>
        <${Section} title="Next deadlines" extra=${html`<a onClick=${function () { props.goTab("milestones"); }}>All</a>`}>
          ${next.length ? html`<${A.Flex} vertical gap=${8}>${next.map(function (m) {
            return html`<div key=${m.id} className="clickable-row" onClick=${function () { props.goTab("milestones"); }} style=${{ display: "flex", gap: 8, alignItems: "center" }}>
              <${Icon} name="CalendarOutlined" style=${{ color: tok.colorTextSecondary }} />
              <div style=${{ flex: 1, minWidth: 0 }}><div>${m.title}</div><div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${fmt.date(m.date) + " · " + (m.status === "Done" ? "Outcome recorded" : fmt.dueLabel(m.date))}</div></div>
              <${APP.StatusTag} status=${m.status} icon=${false} />
            </div>`;
          })}<//>` : html`<${APP.EmptyHint} title="No upcoming deadlines" action=${html`<${A.Button} size="small" onClick=${function () { props.goTab("milestones"); }}>Add a milestone<//>`} />`}
        <//>
        <${Section} title="Linked items">
          <${A.Flex} vertical gap=${8}>
            ${(c.records || []).map(function (r) { return html`<div key=${r}><${Icon} name="DatabaseOutlined" style=${{ marginRight: 6, opacity: 0.6 }} /><${PhaseLink} phase=${1} route="records" params=${{ id: r }} label=${"Record " + r} /></div>`; })}
            ${dd ? html`<div><${Icon} name="AuditOutlined" style=${{ marginRight: 6, opacity: 0.6 }} /><a onClick=${function () { props.goTab("diligence"); }}>${"Due diligence " + dd.id}</a> <${APP.StatusTag} status=${dd.status} icon=${false} /></div>` : null}
            ${(ex.linked || []).map(function (l) {
              return html`<div key=${l.id}><${Icon} name=${l.route === "legal" ? "BankOutlined" : l.route === "screening" ? "SecurityScanOutlined" : "AlertOutlined"} style=${{ marginRight: 6, opacity: 0.6 }} />
                <${PhaseLink} phase=${l.phase} route=${l.route} params=${{ id: l.id }} label=${l.kind + " " + l.id} /><div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginLeft: 20 }}>${l.title}</div></div>`;
            })}
            ${!(c.records || []).length && !dd && !(ex.linked || []).length ? html`<span style=${{ color: tok.colorTextTertiary }}>Nothing linked yet.</span>` : null}
          <//>
        <//>
        <${Section} title="Data handling">
          <${A.Flex} vertical gap=${8} style=${{ fontSize: 13 }}>
            <div><${APP.DataClassTag} cls=${c.dataClass} /> ${(D.dataClasses.filter(function (d) { return d.key === c.dataClass; })[0] || {}).handling}</div>
            <div style=${{ color: tok.colorTextSecondary }}>Answers about this contract run on Qwen (self-hosted) by default. Sending masked text to a managed model needs the data owner's release <${APP.SowRef} sec="1.4.7" />.</div>
            <div style=${{ color: tok.colorTextSecondary }}>Contract text, attachments and performance records sit in the unified records repository with their links and versions <${APP.SowRef} sec="3.6" />.</div>
          <//>
        <//>
      <//>
      <${A.Modal} open=${!!diff[0]} onCancel=${function () { diff[1](null); }} title=${diff[0] ? diff[0].event + ", " + fmt.date(diff[0].at) : ""} width=${720}
        footer=${html`<${A.Button} onClick=${function () { diff[1](null); }}>Close<//>`}>
        ${diff[0] ? html`<div><div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 8 }}>${diff[0].detail}</div>
          <div className="doc-page" style=${{ marginBottom: 0 }}><${APP.Redline} before=${diff[0].before} after=${diff[0].after} showLegend=${true} /></div></div>` : null}
      <//>
    <//>`;
  }

  function ChangeModal(props) {
    var pid = APP.usePersona().personaId;
    var c = props.contract;
    var hist = useMap("contracts.history");
    var stm = useMap("contracts.status");
    var f = useState({});
    useEffect(function () { if (props.kind) f[1]({ date: APP.now().format("YYYY-MM-DD"), approval: "", note: "", before: "", after: "" }); }, [props.kind]);
    if (!c) return null;
    var kind = props.kind;
    var set = function (k) { return function (e) { var n = Object.assign({}, f[0]); n[k] = e && e.target ? e.target.value : e; f[1](n); }; };
    var newStatus = { Renewal: "Active", Suspension: "Suspended", Termination: "Terminated", Completion: "Completed" }[kind];
    var ok = function () {
      if (!f[0].note.trim()) { APP.toast.warn("Add a short description of the change."); return; }
      var entry = { at: f[0].date, event: kind + " recorded", by: APP.personName(pid), detail: f[0].note.trim() + (f[0].approval ? " Approval: " + f[0].approval + "." : ""), live: true };
      if (kind === "Amendment" && f[0].before.trim() && f[0].after.trim()) { entry.before = f[0].before.trim(); entry.after = f[0].after.trim(); }
      hist[1](c.id, function (prev) { return (prev || []).concat([entry]); });
      if (newStatus) stm[1](c.id, { status: newStatus, at: APP.nowIso(), by: pid });
      APP.audit({ action: "Contract " + kind.toLowerCase() + " recorded", item: c.id, detail: f[0].note.trim(), dataClass: c.dataClass });
      APP.toast.success(kind + " recorded on " + c.id + (newStatus ? ". Status is now " + newStatus + "." : ". Both versions are kept."));
      props.onClose();
    };
    return html`<${A.Modal} open=${!!kind} onCancel=${props.onClose} onOk=${ok} okText=${"Record " + String(kind || "").toLowerCase()} title=${"Record " + String(kind || "").toLowerCase() + ": " + c.id} destroyOnHidden=${true} width=${640}>
      <${A.Flex} vertical gap=${10}>
        <${A.Row} gutter=${8}>
          <${A.Col} xs=${24} sm=${12}><${Label}>Effective date<//><${A.DatePicker} style=${{ width: "100%" }} value=${f[0].date ? dayjs(f[0].date) : null} onChange=${function (d) { set("date")(d ? d.format("YYYY-MM-DD") : null); }} /><//>
          <${A.Col} xs=${24} sm=${12}><${Label}>Approval reference<//><${A.Input} value=${f[0].approval} onChange=${set("approval")} placeholder="For example: DOA-2026-118" /><//>
        <//>
        <div><${Label}>What changed<//><${A.Input.TextArea} rows=${2} value=${f[0].note} onChange=${set("note")} placeholder=${kind === "Renewal" ? "For example: renewed for 1 year on the same terms" : "Short description"} /></div>
        ${kind === "Amendment" ? html`<${A.Row} gutter=${8}>
          <${A.Col} xs=${24} md=${12}><${Label}>Clause before<//><${A.Input.TextArea} rows=${3} value=${f[0].before} onChange=${set("before")} /><//>
          <${A.Col} xs=${24} md=${12}><${Label}>Clause after<//><${A.Input.TextArea} rows=${3} value=${f[0].after} onChange=${set("after")} /><//>
        <//>` : null}
        ${kind === "Amendment" && f[0].before && f[0].after ? html`<div className="doc-page" style=${{ margin: 0 }}><${APP.Redline} before=${f[0].before} after=${f[0].after} showLegend=${true} /></div>` : null}
        <div style=${{ fontSize: 12, opacity: 0.7 }}>The register keeps the content before and after each change, with the linked approval and documents <${APP.SowRef} sec="3.1.4" />.${newStatus ? " Status changes to " + newStatus + "." : ""}</div>
      <//>
    <//>`;
  }

  function ObligationsTab(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var c = props.contract;
    var open = useState(null), add = useState(false);
    var addm = useMap("contracts.oblAdded");
    var nf = useState({ type: "Service", desc: "", due: null, owner: "N. Perera" });
    var rows = props.obligations.map(function (o) { return Object.assign({}, o, { flag: (X.obligationDetails[o.id] || {}).flag || "" }); });
    var current = open[0] ? rows.filter(function (r) { return r.id === open[0]; })[0] : null;
    var issues = rows.filter(function (r) { return oblAttention(r.status); });
    var saveNew = guard(pid, function () {
      if (!nf[0].desc.trim() || !nf[0].due) { APP.toast.warn("Add a description and a due date."); return; }
      var id = "OB-" + c.id.slice(-3) + "-" + (rows.length + 1);
      addm[1](c.id, function (prev) { return (prev || []).concat([{ id: id, type: nf[0].type, desc: nf[0].desc.trim(), due: nf[0].due, owner: nf[0].owner, status: "Scheduled" }]); });
      APP.audit({ action: "Obligation added", item: id, detail: nf[0].desc.trim() + " (" + c.id + ")", dataClass: "Internal" });
      APP.toast.success("Obligation " + id + " added. A reminder is set 14 days before.");
      add[1](false); nf[1]({ type: "Service", desc: "", due: null, owner: "N. Perera" });
    });
    return html`<div>
      ${issues.length ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }} message=${issues.length + " need action"} title=${issues.length + " need action"}
        description=${issues.map(function (i) { return i.desc + " (" + i.status.toLowerCase() + ")"; }).join(". ") + "."} />` : null}
      <${APP.DataTable} data=${rows} pageSize=${8} searchKeys=${["id", "desc", "owner", "type"]} searchPlaceholder="Search obligations"
        filters=${[{ key: "type", label: "Type", width: 130 }, { key: "status", label: "Status", width: 150 }]}
        toolbar=${html`<${A.Button} icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { add[1](true); }}>Add obligation<//>`}
        columns=${[
          APP.col.id("Id", "id"),
          { title: "Obligation", dataIndex: "desc", key: "desc", render: function (v, r) { return html`<div style=${{ minWidth: 220 }}>${v}${r.flag ? html`<div><${A.Tag} color="orange" style=${{ marginTop: 4 }}>${r.flag}<//></div>` : null}</div>`; } },
          APP.col.text("Type", "type"), APP.col.date("Due", "due"), APP.col.text("Responsible", "owner"), APP.col.status("Status", "status")
        ]}
        emptyTitle="No obligations defined" emptyText="Add payment, delivery, acceptance, service and maintenance obligations."
        onRowClick=${function (r) { open[1](r.id); }} />
      <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 8 }}>Agreed obligations are compared with actual performance; deadline reminders link to the contract expiry reminder <${APP.SowRef} sec="3.1.4" />.</div>
      <${ObligationDrawer} obligation=${current} onClose=${function () { open[1](null); }} />
      <${A.Modal} open=${add[0]} onCancel=${function () { add[1](false); }} onOk=${saveNew} okText="Add obligation" title=${"Add an obligation to " + c.id} destroyOnHidden=${true}>
        <${A.Flex} vertical gap=${10}>
          <div><${Label}>Type<//><${A.Select} value=${nf[0].type} style=${{ width: "100%" }} onChange=${function (v) { nf[1](Object.assign({}, nf[0], { type: v })); }} options=${["Payment", "Delivery", "Acceptance", "Service", "Maintenance"].map(function (o) { return { value: o, label: o }; })} /></div>
          <div><${Label}>Obligation<//><${A.Input} value=${nf[0].desc} onChange=${function (e) { nf[1](Object.assign({}, nf[0], { desc: e.target.value })); }} placeholder="For example: annual load test of all cranes" /></div>
          <${A.Row} gutter=${8}>
            <${A.Col} xs=${24} sm=${12}><${Label}>Planned date<//><${A.DatePicker} style=${{ width: "100%" }} value=${nf[0].due ? dayjs(nf[0].due) : null} onChange=${function (d) { nf[1](Object.assign({}, nf[0], { due: d ? d.format("YYYY-MM-DD") : null })); }} /><//>
            <${A.Col} xs=${24} sm=${12}><${Label}>Responsible<//><${A.Select} style=${{ width: "100%" }} value=${nf[0].owner} onChange=${function (v) { nf[1](Object.assign({}, nf[0], { owner: v })); }} options=${["N. Perera", "T. Bandara", "H. Kumara", "D. Fonseka", "S. Silva"].map(function (p) { return { value: p, label: p }; })} /><//>
          <//>
        <//>
      <//>
    </div>`;
  }

  function MilestonesTab(props) {
    var tok = A.theme.useToken().token;
    var c = props.contract;
    var remMap = APP.useStore(function (s) { return s.ext["contracts.rem"]; }) || {};
    var msAdded = APP.useStore(function (s) { return s.ext["contracts.msAdded"]; }) || [];
    var open = useState(null), add = useState(false);
    var rows = allMilestones(msAdded).filter(function (m) { return m.contractId === c.id; })
      .map(function (m) { var r = reminderFor(m, remMap); return Object.assign({}, m, { rem: r, status: msStatus(m, r) }); })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    var current = open[0] ? rows.filter(function (r) { return r.id === open[0]; })[0] : null;
    return html`<div>
      <${APP.DataTable} data=${rows} pageSize=${8} search=${false} columns=${milestoneColumns(tok, true)} onRowClick=${function (r) { open[1](r.id); }}
        toolbar=${html`<${A.Button} icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { add[1](true); }}>Add milestone<//>`}
        emptyTitle="No milestones yet" emptyText="Add payment deadlines, maintenance periods and termination dates." />
      <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 8 }}>Set reminder times, responsible persons and notification methods, then record the outcome <${APP.SowRef} sec="3.1.5" />.</div>
      <${MilestoneDrawer} milestone=${current} onClose=${function () { open[1](null); }} />
      <${AddMilestoneModal} open=${add[0]} contractId=${c.id} onClose=${function () { add[1](false); }} />
    </div>`;
  }

  function DocumentsTab(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var c = props.contract, ex = extraFor(c);
    var docsm = useMap("contracts.docs");
    var added = docsm[0][c.id] || [];
    var rows = (ex.documents || []).map(function (d) {
      var up = added.filter(function (a) { return a.replaces === d.id; })[0];
      return up ? Object.assign({}, d, { status: "Replaced" }) : d;
    }).concat(added);
    var open = useState(null), up = useState(false);
    var upKind = useState("Schedule"), upName = useState("");
    var current = open[0] ? rows.filter(function (r) { return r.id === open[0]; })[0] : null;
    var missing = rows.filter(function (r) { return r.status === "Missing"; })[0];
    var doUpload = guard(pid, function () {
      var name = upName[0].trim() || (missing ? missing.name + ".pdf" : "Supplemental document.pdf");
      var id = "D-UP-" + (added.length + 1);
      var doc = { id: id, name: name, kind: upKind[0], version: "1", pages: 4, dataClass: "Classifying", added: APP.nowIso().slice(0, 10), by: APP.personName(pid), status: "Classifying", live: true,
        replaces: missing && /schedule c/i.test(name) ? missing.id : null, summary: "Uploaded in this session. Classified and checked for sensitive data before use." };
      docsm[1](c.id, function (prev) { return (prev || []).concat([doc]); });
      APP.audit({ action: "Uploaded", item: id, detail: name + " to " + c.id, dataClass: null });
      APP.toast.info("Uploading and classifying " + name + "...");
      up[1](false); upName[1]("");
      setTimeout(function () {
        docsm[1](c.id, function (prev) { return (prev || []).map(function (d) { return d.id === id ? Object.assign({}, d, { status: "Current", dataClass: c.dataClass }) : d; }); });
        APP.audit({ actorId: "system", action: "Classified", item: id, detail: "Classified as " + c.dataClass + ". 3 sensitive items found and masked for any external use.", dataClass: c.dataClass });
        APP.toast.success(name + " classified as " + c.dataClass + ". Rerun the contract review to use it.");
      }, 1600);
    });
    if (pid === "admin") {
      return html`<${A.Result} status="info" icon=${html`<${Icon} name="EyeInvisibleOutlined" />`} title="Business content is hidden for Administrators"
        subTitle="Administrators see configuration and service health, not contract text. File counts and sizes are in Administration." />`;
    }
    return html`<div>
      ${missing ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }} message=${missing.name + " is missing"} title=${missing.name + " is missing"} description=${missing.summary}
        action=${html`<${A.Button} size="small" onClick=${function () { upName[1](missing.name + ".pdf"); up[1](true); }}>Upload<//>`} />` : null}
      <${APP.DataTable} data=${rows} pageSize=${8} searchKeys=${["name", "kind", "version"]} searchPlaceholder="Search documents"
        filters=${[{ key: "kind", label: "Kind", width: 140 }, { key: "status", label: "Status", width: 130 }]}
        toolbar=${html`<${A.Button} icon=${html`<${Icon} name="UploadOutlined" />`} onClick=${function () { up[1](true); }}>Upload<//>`}
        columns=${[
          { title: "Document", dataIndex: "name", key: "name", render: function (v, r) {
            return html`<span style=${{ display: "inline-flex", gap: 8, alignItems: "center", minWidth: 220 }}><${Icon} name=${/\.xlsx/.test(v) ? "FileExcelOutlined" : /\.docx/.test(v) ? "FileWordOutlined" : r.status === "Missing" ? "FileUnknownOutlined" : "FilePdfOutlined"} style=${{ color: tok.colorPrimary }} />${v}</span>`;
          } },
          APP.col.text("Kind", "kind"), APP.col.text("Version", "version"),
          { title: "Data class", dataIndex: "dataClass", key: "dataClass", render: function (v) { return v === "Classifying" ? html`<${A.Tag} icon=${html`<${Icon} name="LoadingOutlined" />`}>Classifying<//>` : html`<${APP.DataClassTag} cls=${v} />`; } },
          { title: "Added", dataIndex: "added", key: "added", render: function (v, r) { return v ? html`<span className="nowrap">${fmt.date(v)}<div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.by}</div></span>` : html`<span style=${{ color: tok.colorTextTertiary }}>Not uploaded</span>`; } },
          { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${APP.StatusTag} status=${v} tone=${v === "Classifying" ? "processing" : v === "Replaced" ? "default" : undefined} />`; } }
        ]}
        onRowClick=${function (r) { open[1](r.id); }} />
      <${DocumentDrawer} doc=${current} contract=${c} onClose=${function () { open[1](null); }} onUpload=${function (n) { open[1](null); upName[1](n); up[1](true); }} />
      <${A.Modal} open=${up[0]} onCancel=${function () { up[1](false); }} onOk=${doUpload} okText="Upload" title=${"Upload to " + c.id} destroyOnHidden=${true}>
        <${A.Flex} vertical gap=${10}>
          <${A.Upload.Dragger} beforeUpload=${function (file) { upName[1](file.name); return false; }} showUploadList=${false} accept=".pdf,.docx,.xlsx">
            <p style=${{ fontSize: 28, margin: 0 }}><${Icon} name="InboxOutlined" /></p>
            <p style=${{ margin: "4px 0" }}>Choose a file or drop it here</p>
            <p style=${{ fontSize: 12, opacity: 0.6, margin: 0 }}>Sample only: the file stays in your browser</p>
          <//>
          <div><${Label}>File name<//><${A.Input} value=${upName[0]} onChange=${function (e) { upName[1](e.target.value); }} placeholder="Schedule C, service levels.pdf" /></div>
          <div><${Label}>Kind<//><${A.Select} value=${upKind[0]} onChange=${upKind[1]} style=${{ width: "100%" }} options=${["Schedule", "Amendment", "Supplemental agreement", "Evidence", "Certificate"].map(function (o) { return { value: o, label: o }; })} /></div>
          <div style=${{ fontSize: 12, opacity: 0.7 }}>Every upload is classified, read with OCR where needed and checked for sensitive data before any model sees it.</div>
        <//>
      <//>
    </div>`;
  }

  function DocumentDrawer(props) {
    var tok = A.theme.useToken().token;
    var d = props.doc;
    if (!d) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var hasDoc = d.docId && APP.getDocument(d.docId);
    return html`<${APP.DetailDrawer} open=${!!d} onClose=${props.onClose} title=${d.name} subtitle=${d.kind + (d.version ? " · " + d.version : "")} size=${hasDoc ? 760 : 600}
      tags=${html`<${Fragment}><${APP.StatusTag} status=${d.status} />${d.dataClass && d.dataClass !== "Classifying" ? html`<${APP.DataClassTag} cls=${d.dataClass} />` : null}<//>`}
      actions=${html`<${A.Space} size=${6} wrap>
        ${d.recordId ? html`<${A.Button} size="small" onClick=${function () { props.onClose(); APP.navigate("records", { id: d.recordId }); }}>Open in Records<//>` : null}
        ${d.status !== "Missing" ? html`<${A.Button} size="small" icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${function () { APP.toast.build("In the build, the download follows your permissions and is written to the audit log."); }}>Download<//>` : null}
      <//>`}>
      ${d.status === "Missing" ? html`<${A.Result} status="warning" title="Not in the contract file" subTitle=${d.summary}
          extra=${html`<${A.Button} type="primary" onClick=${function () { props.onUpload(d.name + ".pdf"); }}>Upload it now<//>`} />`
        : html`<${Fragment}>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Kind", d.kind], ["Version", d.version], ["Pages", d.pages], ["Added", d.added ? fmt.date(d.added) + ", " + d.by : ""],
            ["Linked record", d.recordId || "Not archived separately"], ["Reading", d.ocr || "Text layer, no OCR needed"]]} />
          ${d.summary ? html`<div style=${{ margin: "12px 0", color: tok.colorTextSecondary }}>${d.summary}</div>` : null}
          ${d.before && d.after ? html`<${Section} title="Change against the signed text" style=${{ marginTop: 12 }}>
            <${APP.Redline} before=${d.before} after=${d.after} showLegend=${true} />
          <//>` : null}
          ${hasDoc ? html`<div style=${{ marginTop: 12 }}><${APP.DocViewer} doc=${d.docId} height=${"calc(100vh - 360px)"} /></div>`
            : html`<${A.Alert} type="info" showIcon style=${{ marginTop: 12 }} message="Preview not included in this sample" title="Preview not included in this sample"
              description="In the build, every page opens here with its clauses, and citations jump to the cited clause." />`}
        <//>`}
    <//>`;
  }

  function ReviewsTab(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var c = props.contract, ex = extraFor(c);
    var s = APP.useStore();
    var open = useState(null);
    var live = s.reviews.filter(function (r) { return r.ref === c.id && (r.phase !== 2 || s.ui.phaseMode === "both"); }).map(function (r) {
      return { id: r.id, title: r.title, kind: r.kind, at: r.createdAt, by: APP.personName(r.requesterId), reviewer: APP.personName(r.reviewerId), status: r.status, store: r };
    });
    var past = (ex.pastReviews || []).map(function (r) { return Object.assign({ reviewer: r.by }, r); });
    var rows = live.concat(past);
    var rels = s.releaseRequests.filter(function (r) { return r.ref === c.id && (r.phase !== 2 || s.ui.phaseMode === "both"); });
    var current = open[0] ? rows.filter(function (r) { return r.id === open[0]; })[0] : null;
    var cur = current && current.store;
    return html`<div>
      <${APP.DataTable} data=${rows} pageSize=${8} searchKeys=${["id", "title", "kind", "by"]} searchPlaceholder="Search reviews"
        filters=${[{ key: "status", label: "Status", width: 130 }, { key: "kind", label: "Kind", width: 160 }]}
        toolbar=${html`<${A.Button} type="primary" icon=${html`<${Icon} name="FileSearchOutlined" />`} onClick=${go("contract-review", { id: c.id })}>Start a review<//>`}
        columns=${[
          APP.col.id("Id", "id"),
          { title: "Review", dataIndex: "title", key: "title", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
          APP.col.text("Kind", "kind"),
          { title: "Requested", key: "at", render: function (_, r) { return html`<span className="nowrap">${fmt.date(r.at)}<div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.by}</div></span>`; } },
          APP.col.text("Reviewer", "reviewer"),
          APP.col.status("Status", "status")
        ]}
        emptyTitle="No reviews yet" emptyText="Start a review against the Company-confirmed checklist."
        onRowClick=${function (r) { open[1](r.id); }} />
      ${rels.length ? html`<div style=${{ marginTop: 16 }}>
        <div style=${{ fontWeight: 600, marginBottom: 8 }}>Release requests for this contract <${APP.SowRef} sec="1.4.7" /></div>
        <${A.Flex} vertical gap=${8}>${rels.map(function (r) { return html`<${APP.ApprovalCard} key=${r.id} requestId=${r.id} compact=${true} />`; })}<//>
      </div>` : null}
      <${APP.DetailDrawer} open=${!!current} onClose=${function () { open[1](null); }} title=${current ? current.title : ""} subtitle=${current ? current.id + " · " + current.kind : ""}
        tags=${current ? html`<${APP.StatusTag} status=${current.status} />` : null} size=${640}
        actions=${cur ? html`<${A.Button} size="small" type="primary" onClick=${function () { open[1](null); APP.navigate("reviews", { id: cur.id }); }}>Open in Reviews<//>` : null}>
        ${current ? html`<div>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Requested by", current.by], ["Reviewer", current.reviewer], ["Requested", fmt.dateTime(current.at)],
            ["Decided", cur && cur.decidedAt ? fmt.dateTime(cur.decidedAt) + ", " + APP.personName(cur.decidedBy) : (current.status === "Pending" ? "Waiting" : fmt.date(current.at))],
            cur ? ["Model", cur.modelName || "Not recorded"] : ["Method", "Manual review in LAMS"], cur ? ["Archived as", cur.recordId || "Not yet"] : ["Archived as", "Contract file"]]} />
          <div style=${{ marginTop: 12 }}><${Label}>Summary<//>${cur ? cur.content.summary : current.summary}</div>
          ${cur && cur.comment ? html`<${A.Alert} style=${{ marginTop: 12 }} type=${cur.status === "Returned" ? "warning" : "success"} showIcon message=${"Reviewer comment"} title="Reviewer comment" description=${cur.comment} />` : null}
          ${cur && cur.content.sections && cur.content.sections.length ? html`<div style=${{ marginTop: 12 }}>${cur.content.sections.map(function (sct, i) {
            return html`<div key=${i} style=${{ marginBottom: 10 }}><div style=${{ fontWeight: 600 }}>${sct.heading}</div><div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>${sct.text}</div></div>`;
          })}</div>` : null}
          ${cur && cur.recordId ? html`<${A.Button} style=${{ marginTop: 8 }} onClick=${function () { open[1](null); APP.navigate("records", { id: cur.recordId }); }}>Open archived record<//>` : null}
          ${!cur ? html`<div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 12 }}>Migrated from LAMS. Reviews from before the assistant keep their original result and date.</div>` : null}
        </div>` : null}
      <//>
    </div>`;
  }

  function ContractDiligence(props) {
    var c = props.contract;
    var created = APP.useStore(function (s) { return s.ext["contracts.ddCreated"]; }) || [];
    var start = useState(false);
    var dd = ddList(created).filter(function (d) { return d.contractId === c.id; });
    if (!dd.length) {
      return html`<div><${APP.EmptyHint} title=${"No due diligence on file for " + shortParty(c.counterparty)} description="Start one with the checklist for the counterparty's business type. Missing materials are tracked, never read as no risk."
        action=${html`<${A.Button} type="primary" onClick=${function () { start[1](true); }}>Start due diligence<//>`} />
        <${StartDDModal} open=${start[0]} onClose=${function () { start[1](false); }} counterparty=${c.counterparty} contractId=${c.id} /></div>`;
    }
    return html`<${DueDiligenceView} dd=${dd[dd.length - 1]} />`;
  }

  /* ==================================================================
     Due diligence
     ================================================================== */
  function DiligenceTab(props) {
    var tok = A.theme.useToken().token;
    var created = APP.useStore(function (s) { return s.ext["contracts.ddCreated"]; }) || [];
    var ddm = APP.useStore(function (s) { return s.ext["contracts.dd"]; }) || {};
    var start = useState(false), drawer = useState(null);
    var rows = ddList(created).map(function (d) { var o = ddm[d.id] || {}; return Object.assign({}, d, o.status ? { status: o.status } : {}, o.rating ? { rating: o.rating } : {}); });
    var cur = drawer[0] ? rows.filter(function (r) { return r.id === drawer[0]; })[0] : null;
    return html`<div>
      <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginBottom: 12 }}>
        Due diligence on customers, suppliers and other counterparties, with a checklist by business type, cross-checks, sources and query times, and a draft report a person confirms <${APP.SowRef} sec="3.1.1" />.
      </div>
      <${APP.DataTable} data=${rows} pageSize=${8} searchKeys=${["id", "counterparty", "businessType", "checklist", "contractId"]} searchPlaceholder="Search due diligence"
        filters=${[{ key: "status", label: "Status", width: 170 }, { key: "rating", label: "Rating", width: 130 }, { key: "businessType", label: "Business type", width: 170 }]}
        toolbar=${html`<${A.Button} type="primary" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { start[1](true); }}>Start due diligence<//>`}
        columns=${[
          APP.col.id("Id", "id"),
          { title: "Counterparty", dataIndex: "counterparty", key: "counterparty", render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div><div className="mono" style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.contractId || "No contract yet"}</div></div>`; } },
          APP.col.text("Business type", "businessType"),
          APP.col.text("Checklist", "checklist"),
          APP.col.status("Status", "status"),
          { title: "Rating", dataIndex: "rating", key: "rating", render: function (v) { return html`<${A.Tag} color=${ddRatingTone(v)}>${v}<//>`; } },
          APP.col.date("Started", "started"),
          { title: "Next review", dataIndex: "nextReview", key: "nextReview", render: function (v) {
            if (!/^\d{4}-/.test(v || "")) return html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${v}</span>`;
            return html`<span className="nowrap">${fmt.date(v)}<div style=${{ fontSize: 12, color: fmt.daysUntil(v) < 0 ? tok.colorErrorText : tok.colorTextTertiary }}>${fmt.dueLabel(v)}</div></span>`;
          } }
        ]}
        onRowClick=${function (r) { if (r.contractId) APP.navigate("contracts", { id: r.contractId, tab: "diligence" }); else drawer[1](r.id); }} />
      <${StartDDModal} open=${start[0]} onClose=${function () { start[1](false); }} onCreated=${function (d) { if (!d.contractId) drawer[1](d.id); }} />
      <${APP.DetailDrawer} open=${!!cur} onClose=${function () { drawer[1](null); }} size=${960} title=${cur ? "Due diligence: " + cur.counterparty : ""} subtitle=${cur ? cur.id : ""}>
        ${cur ? html`<${DueDiligenceView} dd=${cur} embedded=${true} />` : null}
      <//>
    </div>`;
  }

  function StartDDModal(props) {
    var pid = APP.usePersona().personaId;
    var list = useList("contracts.ddCreated");
    var init = function () { return { counterparty: props.counterparty || "", type: "Service contractor", contractId: props.contractId || null, have: ["Registry extract"] }; };
    var f = useState(init());
    useEffect(function () { if (props.open) f[1](init()); }, [props.open]);
    var chk = X.ddChecklists.filter(function (k) { return k.type === f[0].type; })[0];
    var missing = chk.materials.filter(function (m) { return f[0].have.indexOf(m) < 0; });
    var set = function (k, v) { var n = Object.assign({}, f[0]); n[k] = v; if (k === "type") n.have = n.have.filter(function (m) { return (X.ddChecklists.filter(function (x) { return x.type === v; })[0] || { materials: [] }).materials.indexOf(m) >= 0; }); f[1](n); };
    var ok = guard(pid, function () {
      if (!f[0].counterparty.trim()) { APP.toast.warn("Name the counterparty."); return; }
      var id = "DD-2026-0" + (20 + list[0].length + 1);
      var dd = { id: id, counterparty: shortParty(f[0].counterparty.trim()), contractId: f[0].contractId || null, businessType: f[0].type, checklist: chk.name,
        status: "Collecting materials", rating: "Not rated", started: APP.nowIso().slice(0, 10), startedBy: pid, version: "No report yet", nextReview: "Set on approval",
        dataClass: "Internal", model: "m-qwen-sh", live: true, scope: ["Entity status and registration", "Ownership and control", "Related parties", "Licences", "Litigation", "Sanctions", "Adverse information"],
        sources: [{ id: "S1", source: "OFAC and EU sanctions lists", type: "Local list copy", queried: APP.nowIso(), result: "No match on the registered name.", status: "Done", how: "Matched inside the CICT VPC against the local copy." }],
        crossCheck: [], findings: [],
        outstanding: missing.map(function (m, i) { return { id: "M" + (i + 1), item: m, from: shortParty(f[0].counterparty), requested: APP.nowIso().slice(0, 10), due: APP.now().add(7, "day").format("YYYY-MM-DD"), status: "Requested" }; }),
        materials: f[0].have.map(function (m) { return { name: m + ".pdf", added: APP.nowIso().slice(0, 10), dataClass: "Internal" }; }),
        actions: ["Collect the outstanding materials before a report is drafted."],
        ratingNote: "Not rated yet: " + missing.length + " of " + chk.materials.length + " required materials are missing. Missing information is not treated as no risk.",
        versions: [], process: [{ at: APP.nowIso(), text: "Started by " + APP.personName(pid) + " with the " + chk.name + "." }] };
      list[1](dd);
      APP.audit({ action: "Due diligence started", item: id, detail: dd.counterparty + ", " + chk.name, dataClass: "Internal" });
      APP.toast.success(id + " started. " + missing.length + " materials requested from " + dd.counterparty + ".");
      props.onClose();
      if (props.onCreated) props.onCreated(dd);
      if (dd.contractId && !props.contractId) APP.navigate("contracts", { id: dd.contractId, tab: "diligence" });
    });
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} onOk=${ok} okText="Start due diligence" title="Start due diligence" destroyOnHidden=${true} width=${640}>
      <${A.Flex} vertical gap=${12}>
        <div><${Label}>Counterparty<//><${A.AutoComplete} style=${{ width: "100%" }} value=${f[0].counterparty} onChange=${function (v) { set("counterparty", v); }}
          options=${X.companies.map(function (c) { return { value: c }; })} placeholder="Company name" /></div>
        <${A.Row} gutter=${8}>
          <${A.Col} xs=${24} sm=${12}><${Label}>Business type<//><${A.Select} style=${{ width: "100%" }} value=${f[0].type} onChange=${function (v) { set("type", v); }}
            options=${X.ddChecklists.map(function (k) { return { value: k.type, label: k.type }; })} /><//>
          <${A.Col} xs=${24} sm=${12}><${Label}>Linked contract<//><${A.Select} allowClear style=${{ width: "100%" }} value=${f[0].contractId} onChange=${function (v) { set("contractId", v || null); }} placeholder="None yet"
            options=${D.contracts.map(function (c) { return { value: c.id, label: c.id + " " + shortParty(c.counterparty) }; })} /><//>
        <//>
        <div><${Label}>${"Checklist: " + chk.name}<//>
          <${A.Checkbox.Group} value=${f[0].have} onChange=${function (v) { set("have", v); }} style=${{ display: "flex", flexDirection: "column", gap: 4 }}
            options=${chk.materials.map(function (m) { return { value: m, label: m + " (uploaded now)" }; })} />
        </div>
        <${A.Alert} type=${missing.length ? "warning" : "success"} showIcon
          message=${"Completeness check: " + (chk.materials.length - missing.length) + " of " + chk.materials.length + " materials"}
          title=${"Completeness check: " + (chk.materials.length - missing.length) + " of " + chk.materials.length + " materials"}
          description=${missing.length ? "Missing: " + missing.join(", ") + ". These are requested and tracked. Missing information is not treated as evidence of no risk." : "All materials on the checklist are in."} />
      <//>
    <//>`;
  }

  function useDDState(dd) {
    var m = useMap("contracts.dd");
    var st = m[0][dd.id] || {};
    var patch = function (p) { m[1](dd.id, function (prev) { var n = Object.assign({}, prev || {}); Object.keys(p).forEach(function (k) { n[k] = typeof p[k] === "function" ? p[k](n[k]) : p[k]; }); return n; }); };
    return [st, patch];
  }

  function DueDiligenceView(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var dd = props.dd;
    var ds = useDDState(dd), st = ds[0], patch = ds[1];
    var s = APP.useStore();
    var tab = useState("findings");
    var finding = useState(null), source = useState(null), material = useState(null), cross = useState(null);
    var addOpen = useState(false), concl = useState(false), sched = useState(false);
    var ref = dd.contractId || dd.id;
    var revs = s.reviews.filter(function (r) { return r.ref === ref && r.kind === "Due diligence"; });
    var latestRev = revs[0];
    var pendingRev = revs.filter(function (r) { return r.status === "Pending"; })[0];
    var findings = dd.findings.map(function (f) { var o = (st.findings || {})[f.id]; return o ? Object.assign({}, f, { status: o.status, conclusion: o }) : f; });
    var outstanding = dd.outstanding.map(function (m) { var o = (st.materials || {})[m.id]; return o ? Object.assign({}, m, o) : m; });
    var materials = dd.materials.concat(st.added || []);
    var status = st.status || dd.status;
    var conclusion = st.conclusion || dd.conclusion;
    var nextReview = st.nextReview || dd.nextReview;
    var received = outstanding.filter(function (m) { return m.status === "Received"; }).length;
    var reqTotal = outstanding.length;
    var openFindings = findings.filter(function (f) { return f.status !== "Done"; }).length;
    var verifyFlags = findings.filter(function (f) { return /verification|similar name|unavailable/i.test(f.flag) && f.status !== "Done"; }).length;
    var curVersion = dd.versions.length ? dd.versions[dd.versions.length - 1] : null;
    var summaryText = st.summary || (curVersion ? curVersion.summary : "No report drafted yet.");
    var counts = { High: 0, Medium: 0, Low: 0, "To verify": 0 };
    findings.forEach(function (f) { if (counts[f.rating] !== undefined) counts[f.rating]++; });

    var submit = guard(pid, function () {
      if (pid === "reviewer") { APP.toast.warn("Reviewers can't send their own work for review. Switch to N. Perera to submit."); return; }
      if (!curVersion && !st.summary) { APP.toast.warn(reqTotal - received + " required materials are missing, so there is no report to review yet. Missing information is not treated as no risk."); return; }
      if (pendingRev) { APP.navigate("reviews", { id: pendingRev.id }); return; }
      var rev = APP.createReview({
        title: "Due diligence report: " + dd.counterparty, kind: "Due diligence", archiveCategory: "Due diligence", ref: ref,
        dataClass: dd.dataClass, modelName: dd.model ? modelName(dd.model) : "Manual", phase: 1,
        source: dd.contractId ? { route: "contracts", params: { id: dd.contractId, tab: "diligence" } } : { route: "contracts", params: { tab: "diligence" } },
        content: { summary: summaryText, sections: findings.map(function (f) { return { heading: f.area + " (" + f.rating + ")", text: f.finding + " " + f.action }; }) },
        citations: []
      });
      patch({ process: function (p) { return (p || []).concat([{ at: APP.nowIso(), text: "Sent for review by " + APP.personName(pid) + " as " + rev.id + "." }]); } });
      APP.toast.success("Sent to Li Wei as " + rev.id + ". The report stays a draft until confirmed.");
    });

    var reviewBanner = latestRev ? html`<${A.Alert} style=${{ marginBottom: 12 }} showIcon
      type=${latestRev.status === "Pending" ? "info" : latestRev.status === "Confirmed" ? "success" : "warning"}
      message=${latestRev.status === "Pending" ? "In review with " + APP.personName(latestRev.reviewerId) + " (" + latestRev.id + ")" : latestRev.status === "Confirmed" ? "Confirmed by " + APP.personName(latestRev.decidedBy) + " on " + fmt.date(latestRev.decidedAt) : "Returned by " + APP.personName(latestRev.decidedBy) + ": " + (latestRev.comment || "see comments")}
      title=${latestRev.status === "Pending" ? "In review with " + APP.personName(latestRev.reviewerId) + " (" + latestRev.id + ")" : latestRev.status === "Confirmed" ? "Confirmed by " + APP.personName(latestRev.decidedBy) + " on " + fmt.date(latestRev.decidedAt) : "Returned by " + APP.personName(latestRev.decidedBy) + ": " + (latestRev.comment || "see comments")}
      description=${latestRev.status === "Pending" ? "Sent " + fmt.relative(latestRev.createdAt) + " by " + APP.personName(latestRev.requesterId) + ". Nothing in this report counts as final until it is confirmed." : latestRev.status === "Confirmed" ? "Archived" + (latestRev.recordId ? " as " + latestRev.recordId : "") + ". Record the approval conclusion next." : "Revise the report and submit it again."}
      action=${html`<${A.Space} direction="vertical" size=${4}>
        <${A.Button} size="small" onClick=${function () { APP.navigate("reviews", { id: latestRev.id }); }}>Open review<//>
        ${latestRev.status === "Confirmed" && latestRev.recordId ? html`<${A.Button} size="small" onClick=${function () { APP.navigate("records", { id: latestRev.recordId }); }}>Open record<//>` : null}
      <//>`} />` : null;

    var tabs = [
      { key: "findings", label: html`<span>Findings <span style=${{ opacity: 0.6 }}>${findings.length}</span></span>`, children: html`<div>
        <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 12 }}>
          <${A.Col} xs=${24} md=${8}><${A.Card} size="small"><${A.Statistic} title="Overall rating (draft)" value=${st.rating || dd.rating}
            styles=${{ content: { color: (st.rating || dd.rating) === "High" ? tok.colorError : (st.rating || dd.rating) === "Medium" ? tok.colorWarning : tok.colorText } }} />
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${dd.ratingNote}</div><//><//>
          <${A.Col} xs=${12} md=${8}><${A.Card} size="small"><${A.Statistic} title="Open findings" value=${openFindings} suffix=${"of " + findings.length} />
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"High " + counts.High + " · Medium " + counts.Medium + " · Low " + counts.Low + " · To verify " + counts["To verify"]}</div><//><//>
          <${A.Col} xs=${12} md=${8}><${A.Card} size="small"><${A.Statistic} title="Flagged for manual check" value=${verifyFlags} />
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Same names, unverified adverse information, unavailable materials</div><//><//>
        <//>
        <${APP.DataTable} data=${findings} pageSize=${8} search=${findings.length > 5} searchKeys=${["area", "finding", "flag"]}
          filters=${findings.length > 3 ? [{ key: "rating", label: "Rating", width: 120 }, { key: "status", label: "Status", width: 110 }] : []}
          columns=${[
            { title: "Area", dataIndex: "area", key: "area", render: function (v) { return html`<span style=${{ fontWeight: 500 }} className="nowrap">${v}</span>`; } },
            { title: "Finding", dataIndex: "finding", key: "finding", render: function (v, r) { return html`<div style=${{ minWidth: 260, maxWidth: 520 }}>${v}${r.flag ? html`<div style=${{ marginTop: 4 }}><${A.Tag} color=${/verification|similar/i.test(r.flag) ? "red" : "orange"} icon=${html`<${Icon} name="FlagOutlined" />`}>${r.flag}<//></div>` : null}</div>`; } },
            { title: "Rating", dataIndex: "rating", key: "rating", render: function (v) { return html`<${A.Tag} color=${ddRatingTone(v)}>${v}<//>`; } },
            APP.col.status("Status", "status")
          ]}
          emptyTitle="No findings yet" emptyText="Findings appear once the materials are in and the report is drafted."
          onRowClick=${function (r) { finding[1](r.id); }} />
        <div style=${{ marginTop: 12 }}><div style=${{ fontWeight: 600, marginBottom: 6 }}>Recommended actions</div>
          <ul style=${{ margin: 0, paddingLeft: 20 }}>${dd.actions.map(function (a, i) { return html`<li key=${i}>${a}</li>`; })}</ul></div>
      </div>` },
      { key: "sources", label: html`<span>Sources and checks <span style=${{ opacity: 0.6 }}>${dd.sources.length}</span></span>`, children: html`<div>
        <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginBottom: 8 }}>Only Company-authorised public information and risk lists are used. External queries send the minimum and are covered by a release <${APP.SowRef} sec="3.1.1" />.</div>
        <${APP.DataTable} data=${dd.sources} search=${false} pageSize=${10}
          columns=${[
            { title: "Source", dataIndex: "source", key: "source", render: function (v, r) { return html`<div style=${{ minWidth: 200 }}><div style=${{ fontWeight: 500 }}>${v}</div><div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.type}</div></div>`; } },
            { title: "Queried", dataIndex: "queried", key: "queried", render: function (v) { return html`<span className="nowrap">${fmt.dateTime(v)}</span>`; } },
            { title: "Result", dataIndex: "result", key: "result", render: function (v) { return html`<div style=${{ minWidth: 220 }}>${v}</div>`; } },
            { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${APP.StatusTag} status=${v} tone=${v === "To verify" ? "warning" : undefined} />`; } }
          ]}
          onRowClick=${function (r) { source[1](r.id); }} />
        ${dd.crossCheck.length ? html`<div style=${{ marginTop: 16 }}>
          <div style=${{ fontWeight: 600, marginBottom: 6 }}>Cross-check of entity information</div>
          <${APP.DataTable} data=${dd.crossCheck} search=${false}
            columns=${[
              APP.col.text("Field", "field"),
              { title: "In uploaded materials", dataIndex: "uploaded", key: "uploaded" },
              { title: "In registry or records", dataIndex: "registry", key: "registry" },
              { title: "Result", dataIndex: "result", key: "result", render: function (v) { return html`<${APP.StatusTag} status=${v} tone=${v === "Match" ? "success" : v === "Mismatch" ? "error" : "warning"} />`; } }
            ]}
            onRowClick=${function (r) { cross[1](r.id); }} />
        </div>` : null}
      </div>` },
      { key: "materials", label: html`<span>Outstanding materials ${reqTotal - received ? html`<${A.Badge} count=${reqTotal - received} size="small" />` : null}</span>`, children: html`<div>
        ${reqTotal ? html`<div style=${{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <${A.Progress} percent=${Math.round(received / reqTotal * 100)} size="small" style=${{ maxWidth: 280, margin: 0 }} />
          <span style=${{ fontSize: 13 }}>${received + " of " + reqTotal + " requested materials received"}</span>
        </div>` : null}
        <${APP.DataTable} data=${outstanding} search=${false}
          columns=${[
            { title: "Material", dataIndex: "item", key: "item", render: function (v) { return html`<span style=${{ fontWeight: 500 }}>${v}</span>`; } },
            APP.col.text("From", "from"),
            APP.col.date("Requested", "requested"),
            { title: "Due", dataIndex: "due", key: "due", render: function (v, r) { return html`<span className="nowrap">${fmt.date(v)}<div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.status === "Received" ? "Received " + fmt.date(r.received) : fmt.dueLabel(v)}</div></span>`; } },
            APP.col.status("Status", "status")
          ]}
          emptyTitle="Nothing outstanding" onRowClick=${function (r) { material[1](r.id); }} />
        <div style=${{ fontWeight: 600, margin: "16px 0 8px" }}>Materials on file</div>
        <div style=${{ display: "flex", flexWrap: "wrap", gap: 6 }}>${materials.map(function (m, i) {
          return html`<${APP.FileChip} key=${i} name=${m.name} meta=${"Added " + fmt.date(m.added) + " · " + m.dataClass} onClick=${function () { APP.toast.build("In the build, " + m.name + " opens in the document viewer with its OCR text."); }} />`;
        })}</div>
      </div>` },
      { key: "report", label: "Report draft", children: html`<${DDReport} dd=${dd} st=${st} patch=${patch} findings=${findings} outstanding=${outstanding} summary=${summaryText} />` },
      { key: "history", label: "Processing record", children: html`<${A.Timeline} items=${dd.process.concat(st.process || []).map(function (p, i) {
        var cn = html`<div><div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${fmt.dateTime(p.at)}</div><div>${p.text}</div></div>`;
        return { key: String(i), children: cn, content: cn };
      })} />` }
    ];

    var curFinding = finding[0] ? findings.filter(function (f) { return f.id === finding[0]; })[0] : null;
    var curSource = source[0] ? dd.sources.filter(function (f) { return f.id === source[0]; })[0] : null;
    var curMat = material[0] ? outstanding.filter(function (f) { return f.id === material[0]; })[0] : null;
    var curCross = cross[0] ? dd.crossCheck.filter(function (f) { return f.id === cross[0]; })[0] : null;

    return html`<div>
      <div style=${{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 12 }}>
        <div style=${{ flex: "1 1 320px", minWidth: 0 }}>
          <div style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style=${{ fontSize: 16, fontWeight: 600 }}>${"Due diligence: " + dd.counterparty}</span>
            <span className="mono" style=${{ fontSize: 12, opacity: 0.7 }}>${dd.id}</span>
            <${APP.StatusTag} status=${status} tone=${status === "Draft report" ? "processing" : status === "Review due" ? "warning" : undefined} />
            <${A.Tag} color=${ddRatingTone(st.rating || dd.rating)}>${"Rating: " + (st.rating || dd.rating)}<//>
            <${APP.DataClassTag} cls=${dd.dataClass} />
            <${APP.SowRef} sec="3.1.1" />
          </div>
          <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginTop: 4 }}>${dd.checklist + " · Started " + fmt.date(dd.started) + " by " + APP.personName(dd.startedBy) + " · " + dd.version}</div>
        </div>
        <${A.Space} wrap size=${6}>
          <${A.Button} icon=${html`<${Icon} name="UploadOutlined" />`} onClick=${guard(pid, function () { addOpen[1](true); })}>Add materials<//>
          <${A.Dropdown} trigger=${["click"]} menu=${{ items: [{ key: "w", label: "Word" }, { key: "p", label: "PDF" }, { key: "x", label: "Findings to Excel" }],
            onClick: function () { APP.toast.build("In the build, the report exports with task name, analysis time, material versions, cited sources, AI results and review status (§3.7.3)."); } }}>
            <${A.Button} icon=${html`<${Icon} name="DownloadOutlined" />`}>Export<//><//>
          <${A.Button} icon=${html`<${Icon} name="CalendarOutlined" />`} onClick=${guard(pid, function () { sched[1](true); })}>Periodic review<//>
          ${latestRev && latestRev.status === "Confirmed" || dd.conclusion ? html`<${A.Button} onClick=${guard(pid, function () { concl[1](true); })}>${conclusion ? "Update conclusion" : "Record conclusion"}<//>` : null}
          <${A.Button} type="primary" icon=${html`<${Icon} name=${pendingRev ? "EyeOutlined" : "SendOutlined"} />`} onClick=${submit}>${pendingRev ? "Open review " + pendingRev.id : "Submit for review"}<//>
        <//>
      </div>
      ${reviewBanner}
      ${conclusion ? html`<${A.Alert} type="success" showIcon style=${{ marginBottom: 12 }} message=${"Conclusion: " + conclusion.decision} title=${"Conclusion: " + conclusion.decision}
        description=${"Recorded by " + (APP.persona(conclusion.by) ? APP.personName(conclusion.by) : conclusion.by) + " on " + fmt.date(conclusion.at) + ". Conditions: " + conclusion.conditions + " Next review: " + (/^\d{4}-/.test(nextReview) ? fmt.date(nextReview) : nextReview) + "."} />` : null}
      <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 8 }}>
        <${A.Col} xs=${24}>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
            ["Business type", dd.businessType], ["Scope", dd.scope.join(", ")],
            ["Model", dd.model ? html`<${APP.ModelTag} id=${dd.model} />` : "Manual, before the assistant"], ["Next periodic review", /^\d{4}-/.test(nextReview) ? fmt.date(nextReview) + " (" + fmt.dueLabel(nextReview) + ")" : nextReview]
          ]} />
        <//>
      <//>
      <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${tabs} />

      <${APP.DetailDrawer} open=${!!curFinding} onClose=${function () { finding[1](null); }} size=${560} zIndex=${1010}
        title=${curFinding ? curFinding.area : ""} subtitle=${curFinding ? dd.id + " · " + curFinding.id : ""}
        tags=${curFinding ? html`<${Fragment}><${A.Tag} color=${ddRatingTone(curFinding.rating)}>${curFinding.rating}<//><${APP.StatusTag} status=${curFinding.status} /><//>` : null}>
        ${curFinding ? html`<${DDFindingBody} finding=${curFinding} dd=${dd} onConclude=${function (status, comment) {
          var g = guard(pid, function () {
            patch({ findings: function (prev) { var n = Object.assign({}, prev || {}); n[curFinding.id] = { status: status === "Confirmed" ? "Done" : status === "Not an issue" ? "Closed" : "Escalated", label: status, comment: comment, by: pid, at: APP.nowIso() }; return n; } });
            APP.audit({ action: "Due diligence finding " + status.toLowerCase(), item: dd.id + "/" + curFinding.id, detail: curFinding.area + (comment ? ": " + comment : ""), dataClass: dd.dataClass });
            if (status === "Escalated") APP.notify({ to: ["compliance"], kind: "alert", title: "Due diligence finding escalated: " + dd.counterparty, body: curFinding.area + ". " + (comment || ""), route: "contracts", params: { id: dd.contractId, tab: "diligence" }, phase: 1 });
            APP.toast.success("Conclusion recorded" + (status === "Escalated" ? ". R. Fernando has been notified." : "."));
          });
          g();
        }} />` : null}
      <//>
      <${APP.DetailDrawer} open=${!!curSource} onClose=${function () { source[1](null); }} size=${520} zIndex=${1010} title=${curSource ? curSource.source : ""} subtitle=${curSource ? curSource.type : ""}
        tags=${curSource ? html`<${APP.StatusTag} status=${curSource.status} tone=${curSource.status === "To verify" ? "warning" : undefined} />` : null}>
        ${curSource ? html`<div>
          <${APP.KeyFacts} column=${1} items=${[["Queried", fmt.dateTime(curSource.queried)], ["Result", curSource.result], ["How", curSource.how]]} />
          ${curSource.status === "Failed" ? html`<${A.Alert} style=${{ marginTop: 12 }} type="warning" showIcon message="Not checked, not cleared" title="Not checked, not cleared"
            description="A failed source is shown in the report as not checked. It never counts as a clean result." action=${html`<${A.Button} size="small" onClick=${function () { APP.toast.build("In the build, the source is queried again and the result time is recorded."); }}>Retry now<//>`} />` : null}
          ${curSource.type === "External query" ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 12 }}>External queries and model calls go through masking and release as the Company requires <${APP.SowRef} sec="3.1.1" />.</div>` : null}
        </div>` : null}
      <//>
      <${APP.DetailDrawer} open=${!!curCross} onClose=${function () { cross[1](null); }} size=${480} zIndex=${1010} title=${curCross ? curCross.field : ""} subtitle="Cross-check"
        tags=${curCross ? html`<${APP.StatusTag} status=${curCross.result} tone=${curCross.result === "Match" ? "success" : curCross.result === "Mismatch" ? "error" : "warning"} />` : null}>
        ${curCross ? html`<div><${APP.KeyFacts} column=${1} items=${[["In uploaded materials", curCross.uploaded], ["In registry or records", curCross.registry]]} />
          <div style=${{ marginTop: 12, color: tok.colorTextSecondary }}>${curCross.result === "Match" ? "Values agree. No action needed." : "Values differ or can't be confirmed. Flagged for a person to verify before the report is confirmed."}</div></div>` : null}
      <//>
      <${APP.DetailDrawer} open=${!!curMat} onClose=${function () { material[1](null); }} size=${480} zIndex=${1010} title=${curMat ? curMat.item : ""} subtitle=${curMat ? "Requested from " + curMat.from : ""}
        tags=${curMat ? html`<${APP.StatusTag} status=${curMat.status} />` : null}>
        ${curMat ? html`<div>
          <${APP.KeyFacts} column=${1} items=${[["Requested", fmt.date(curMat.requested)], ["Due", fmt.date(curMat.due) + " (" + fmt.dueLabel(curMat.due) + ")"], ["Received", curMat.received ? fmt.date(curMat.received) : "Not yet"]]} />
          ${curMat.status !== "Received" ? html`<${A.Space} style=${{ marginTop: 12 }} wrap>
            <${A.Button} type="primary" onClick=${guard(pid, function () {
              patch({ materials: function (prev) { var n = Object.assign({}, prev || {}); n[curMat.id] = { status: "Received", received: APP.nowIso().slice(0, 10) }; return n; },
                added: function (prev) { return (prev || []).concat([{ name: curMat.item + ".pdf", added: APP.nowIso().slice(0, 10), dataClass: dd.dataClass }]); },
                process: function (p) { return (p || []).concat([{ at: APP.nowIso(), text: curMat.item + " received and classified." }]); } });
              APP.audit({ action: "Due diligence material received", item: dd.id, detail: curMat.item, dataClass: dd.dataClass });
              APP.toast.success(curMat.item + " received. The report draft will be refreshed.");
            })}>Mark as received<//>
            <${A.Button} onClick=${guard(pid, function () { APP.audit({ action: "Reminder sent", item: dd.id, detail: curMat.item + " to " + curMat.from, dataClass: null }); APP.toast.success("Reminder sent to " + curMat.from + "."); })}>Send a reminder<//>
          <//>` : null}
        </div>` : null}
      <//>
      <${A.Modal} open=${addOpen[0]} onCancel=${function () { addOpen[1](false); }} title="Add materials" okText="Add"
        onOk=${function () {
          var nm = "Supplementary material " + ((st.added || []).length + 1) + ".pdf";
          patch({ added: function (prev) { return (prev || []).concat([{ name: nm, added: APP.nowIso().slice(0, 10), dataClass: dd.dataClass }]); },
            process: function (p) { return (p || []).concat([{ at: APP.nowIso(), text: nm + " added by " + APP.personName(pid) + "." }]); } });
          APP.audit({ action: "Uploaded", item: dd.id, detail: nm, dataClass: dd.dataClass });
          APP.toast.success(nm + " added and classified. In the build, the cross-checks run again.");
          addOpen[1](false);
        }}>
        <${A.Upload.Dragger} beforeUpload=${function () { return false; }} showUploadList=${false}>
          <p style=${{ fontSize: 28, margin: 0 }}><${Icon} name="InboxOutlined" /></p>
          <p style=${{ margin: "4px 0" }}>Registration, ownership, licences, financial statements or other documents</p>
          <p style=${{ fontSize: 12, opacity: 0.6, margin: 0 }}>Sample only: choosing Add records a sample file</p>
        <//>
      <//>
      <${ConclusionModal} open=${concl[0]} onClose=${function () { concl[1](false); }} dd=${dd} patch=${patch} />
      <${A.Modal} open=${sched[0]} onCancel=${function () { sched[1](false); }} title="Schedule the periodic review" okText="Save" destroyOnHidden=${true}
        onOk=${function () {
          var d = st._pick || APP.now().add(dd.rating === "High" ? 6 : 12, "month").format("YYYY-MM-DD");
          patch({ nextReview: d, process: function (p) { return (p || []).concat([{ at: APP.nowIso(), text: "Periodic review set for " + fmt.date(d) + "." }]); } });
          APP.audit({ action: "Periodic review scheduled", item: dd.id, detail: fmt.date(d), dataClass: null });
          APP.toast.success("Periodic review set for " + fmt.date(d) + ". Reminders go 30 and 7 days before.");
          sched[1](false);
        }}>
        <div style=${{ marginBottom: 8 }}>${dd.rating === "High" ? "High-rated counterparties are reviewed every 6 months." : "Counterparties are reviewed at least every 12 months."}</div>
        <${A.DatePicker} style=${{ width: "100%" }} defaultValue=${APP.now().add(dd.rating === "High" ? 6 : 12, "month")} onChange=${function (d) { patch({ _pick: d ? d.format("YYYY-MM-DD") : null }); }} />
      <//>
    </div>`;
  }

  function DDFindingBody(props) {
    var tok = A.theme.useToken().token;
    var f = props.finding;
    var choice = useState("Confirmed"), comment = useState("");
    return html`<div>
      <${FactBlock} label="Finding">${f.finding}<//>
      <${FactBlock} label="Source">${f.source}<//>
      <${FactBlock} label="Recommended action">${f.action}<//>
      ${f.flag ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 12 }} message=${"Flagged: " + f.flag} title=${"Flagged: " + f.flag}
        description="A person must verify this before the report is confirmed. The assistant does not decide it." />` : null}
      ${f.phase2 ? html`<div style=${{ marginBottom: 12 }}><${PhaseLink} phase=${2} route=${f.phase2.route} params=${{ id: f.phase2.id }} label=${f.phase2.label} /></div>` : null}
      ${f.conclusion ? html`<${A.Alert} type="success" showIcon style=${{ marginBottom: 12 }} message=${f.conclusion.label + " by " + APP.personName(f.conclusion.by)} title=${f.conclusion.label + " by " + APP.personName(f.conclusion.by)}
        description=${fmt.dateTime(f.conclusion.at) + (f.conclusion.comment ? ". " + f.conclusion.comment : "")} />` : null}
      <${A.Divider} style=${{ margin: "12px 0" }} />
      <div style=${{ fontWeight: 600, marginBottom: 8 }}>Record your conclusion</div>
      <${A.Flex} vertical gap=${8}>
        <${A.Segmented} value=${choice[0]} onChange=${choice[1]} options=${["Confirmed", "Not an issue", "Escalated"]} />
        <${A.Input.TextArea} rows=${2} value=${comment[0]} onChange=${function (e) { comment[1](e.target.value); }} placeholder="Basis for your conclusion" />
        <div><${A.Button} type="primary" onClick=${function () { props.onConclude(choice[0], comment[0]); }}>Save conclusion<//></div>
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Escalating notifies the compliance officer.</div>
      <//>
    </div>`;
  }

  function DDReport(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var dd = props.dd, st = props.st;
    var cmp = useState(false), edit = useState(null);
    var vs = dd.versions;
    if (!vs.length && !st.summary) {
      return html`<${APP.EmptyHint} title="No report drafted yet" description=${dd.ratingNote}
        action=${html`<${A.Button} onClick=${function () { APP.toast.build("In the build, the draft report is generated once the required materials are in. Missing information is flagged, not assumed."); }}>Draft anyway<//>`} />`;
    }
    var high = props.findings.filter(function (f) { return f.rating === "High" || f.rating === "To verify"; });
    return html`<div>
      <${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message="Draft report. Not confirmed until a specialist reviewer confirms it." title="Draft report. Not confirmed until a specialist reviewer confirms it."
        description=${"Version " + (st.summary ? (vs.length ? "v" + (vs.length + 1) + " (edited in this session)" : "v1") : vs[vs.length - 1].v) + (vs.length ? ". Last saved " + fmt.dateTime(vs[vs.length - 1].at) + " by " + vs[vs.length - 1].by + "." : "")} />
      <div style=${{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        ${vs.length > 1 ? html`<${A.Button} icon=${html`<${Icon} name="DiffOutlined" />`} type=${cmp[0] ? "primary" : "default"} onClick=${function () { cmp[1](!cmp[0]); }}>${cmp[0] ? "Hide comparison" : "Compare " + vs[vs.length - 2].v + " and " + vs[vs.length - 1].v}<//>` : null}
        <${A.Button} icon=${html`<${Icon} name="EditOutlined" />`} onClick=${guard(pid, function () { edit[1](props.summary); })}>Edit summary<//>
      </div>
      ${cmp[0] && vs.length > 1 ? html`<${Section} title=${"Summary, " + vs[vs.length - 2].v + " to " + vs[vs.length - 1].v}>
        <${APP.Redline} before=${vs[vs.length - 2].summary} after=${vs[vs.length - 1].summary} mode="words" showLegend=${true} />
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 8 }}>${vs[vs.length - 1].note}</div>
      <//>` : null}
      <div className="doc-page">
        <h3 style=${{ marginTop: 0 }}>${"Due diligence report: " + dd.counterparty}</h3>
        <div style=${{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>${dd.id + " · " + dd.checklist + " · Draft"}</div>
        <h4>1. Summary</h4>
        ${edit[0] !== null ? html`<div style=${{ fontFamily: "inherit" }}>
          <${A.Input.TextArea} autoSize=${{ minRows: 3 }} value=${edit[0]} onChange=${function (e) { edit[1](e.target.value); }} />
          <${A.Space} style=${{ marginTop: 8 }}>
            <${A.Button} size="small" type="primary" onClick=${function () {
              props.patch({ summary: edit[0], process: function (p) { return (p || []).concat([{ at: APP.nowIso(), text: "Summary edited by " + APP.personName(pid) + "." }]); } });
              APP.audit({ action: "Report edited", item: dd.id, detail: "Summary revised", dataClass: dd.dataClass });
              APP.toast.success("Summary saved as a new draft version."); edit[1](null);
            }}>Save<//>
            <${A.Button} size="small" onClick=${function () { edit[1](null); }}>Cancel<//>
          <//></div>` : html`<p>${props.summary}</p>`}
        <h4>2. Scope</h4><p>${dd.scope.join(", ") + "."}</p>
        <h4>3. Sources and query times</h4>
        <ul>${dd.sources.map(function (sr) { return html`<li key=${sr.id}>${sr.source + ", " + fmt.dateTime(sr.queried) + ": " + sr.result}</li>`; })}</ul>
        <h4>4. Key findings</h4>
        <ul>${props.findings.map(function (f) { return html`<li key=${f.id}><b>${f.area + " (" + f.rating + ")."}</b> ${f.finding}${f.flag ? " Flagged: " + f.flag.toLowerCase() + "." : ""}</li>`; })}</ul>
        <h4>5. Risk rating</h4><p>${"Overall: " + dd.rating + ". " + dd.ratingNote}${high.length ? " Items needing verification: " + high.map(function (f) { return f.area; }).join(", ") + "." : ""}</p>
        <h4>6. Outstanding materials</h4>
        <ul>${props.outstanding.map(function (m) { return html`<li key=${m.id}>${m.item + ": " + (m.status === "Received" ? "received " + fmt.date(m.received) : "requested, due " + fmt.date(m.due))}</li>`; })}</ul>
        <h4>7. Recommended actions</h4>
        <ul>${dd.actions.map(function (a, i) { return html`<li key=${i}>${a}</li>`; })}</ul>
        <div className="doc-page-no">Draft. Prepared with the assistant. Not confirmed.</div>
      </div>
      ${vs.length ? html`<${Section} title="Versions">
        <${A.Timeline} items=${vs.map(function (v) { var cn = html`<div><b>${v.v}</b> <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${fmt.dateTime(v.at) + " · " + v.by}</span><div style=${{ fontSize: 13 }}>${v.note}</div></div>`; return { key: v.v, children: cn, content: cn }; })} />
      <//>` : null}
    </div>`;
  }

  function ConclusionModal(props) {
    var pid = APP.usePersona().personaId;
    var dd = props.dd;
    var f = useState({ decision: "Approved with conditions", conditions: "", next: null });
    useEffect(function () { if (props.open) f[1]({ decision: "Approved with conditions", conditions: "", next: APP.now().add(dd.rating === "High" ? 6 : 12, "month").format("YYYY-MM-DD") }); }, [props.open]);
    var ok = function () {
      var c = { decision: f[0].decision, by: pid, at: APP.nowIso(), conditions: f[0].conditions.trim() || "None." };
      props.patch({ conclusion: c, nextReview: f[0].next, status: f[0].decision === "Do not proceed" ? "Rejected" : "Approved",
        process: function (p) { return (p || []).concat([{ at: APP.nowIso(), text: "Conclusion recorded by " + APP.personName(pid) + ": " + f[0].decision + "." }]); } });
      APP.audit({ action: "Due diligence concluded", item: dd.id, detail: f[0].decision + ". " + c.conditions, dataClass: dd.dataClass });
      APP.notify({ to: ["legal"], kind: "info", title: "Due diligence concluded: " + dd.counterparty, body: f[0].decision + " by " + APP.personName(pid) + ".", route: "contracts", params: dd.contractId ? { id: dd.contractId, tab: "diligence" } : { tab: "diligence" }, phase: 1 });
      APP.toast.success("Conclusion recorded. Next periodic review " + fmt.date(f[0].next) + ".");
      props.onClose();
    };
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} onOk=${ok} okText="Record conclusion" title=${"Approval conclusion: " + dd.counterparty} destroyOnHidden=${true}>
      <${A.Flex} vertical gap=${10}>
        <${A.Radio.Group} value=${f[0].decision} onChange=${function (e) { f[1](Object.assign({}, f[0], { decision: e.target.value })); }} options=${["Approved", "Approved with conditions", "Do not proceed"]} />
        <div><${Label}>Conditions or reasons<//><${A.Input.TextArea} rows=${3} value=${f[0].conditions} onChange=${function (e) { f[1](Object.assign({}, f[0], { conditions: e.target.value })); }} placeholder="For example: renew only after the ownership chart is verified" /></div>
        <div><${Label}>Next periodic review<//><${A.DatePicker} style=${{ width: "100%" }} value=${f[0].next ? dayjs(f[0].next) : null} onChange=${function (d) { f[1](Object.assign({}, f[0], { next: d ? d.format("YYYY-MM-DD") : null })); }} /></div>
        ${pid !== "owner" && pid !== "legal" ? html`<div style=${{ fontSize: 12, opacity: 0.7 }}>In the build, only roles named in the delegation of authority can record this conclusion.</div>` : null}
      <//>
    <//>`;
  }

  /* ==================================================================
     Template drafting
     ================================================================== */
  function tplById(id) { return X.templates.filter(function (t) { return t.id === id; })[0] || null; }
  function fieldDef(key) { return X.draftFields.filter(function (f) { return f.key === key; })[0]; }
  function fieldLabel(key, tpl) { var d = fieldDef(key); return d ? (tpl && tpl.clauses === "lease" && d.leaseLabel ? d.leaseLabel : d.label) : key; }
  function isBlank(v) { return v === undefined || v === null || v === ""; }
  function money(cur, n) { return (cur || "USD") + " " + fmt.number(n); }

  function draftChecks(f, tpl) {
    var out = [];
    X.draftFields.forEach(function (d) { if (d.required && isBlank(f[d.key])) out.push({ level: "error", field: d.key, text: fieldLabel(d.key, tpl) + " is missing." }); });
    if (f.start && f.end && dayjs(f.end).isBefore(dayjs(f.start))) out.push({ level: "error", field: "end", text: "End date is before the start date." });
    if (f.start && dayjs(f.start).isBefore(APP.now(), "day")) out.push({ level: "warning", field: "start", text: "Start date is in the past. Work must not start before signing (checklist item 12)." });
    if (f.start && f.end && dayjs(f.end).diff(dayjs(f.start), "month") > 60) out.push({ level: "warning", field: "end", text: "Term is over 5 years. Needs Board approval under the delegation of authority (sample rule)." });
    if (!isBlank(f.amount) && !isBlank(f.instalments) && !isBlank(f.instalmentAmount)) {
      var total = Number(f.instalments) * Number(f.instalmentAmount);
      if (Math.abs(total - Number(f.amount)) > 0.5) out.push({ level: "error", field: "instalmentAmount", text: "Amounts don't agree: " + f.instalments + " instalments of " + money(f.currency, f.instalmentAmount) + " make " + money(f.currency, total) + ", not " + money(f.currency, f.amount) + "." });
    }
    if (!isBlank(f.liabilityCap) && Number(f.liabilityCap) < 100) out.push({ level: "warning", field: "liabilityCap", text: "Liability cap of " + f.liabilityCap + "% is below the 100% minimum in the services contract checklist (item 4). Needs an approved exception." });
    if (f.autoRenew && !isBlank(f.noticeDays) && Number(f.noticeDays) < 60) out.push({ level: "warning", field: "noticeDays", text: "Notice period of " + f.noticeDays + " days is below the 60-day minimum for automatic renewal (checklist item 2)." });
    if (!isBlank(f.paymentDays) && (Number(f.paymentDays) < 30 || Number(f.paymentDays) > 60)) out.push({ level: "warning", field: "paymentDays", text: "Payment terms are outside 30 to 60 days (checklist item 6)." });
    if (isBlank(f.counterpartyReg) && !isBlank(f.counterparty)) out.push({ level: "info", field: "counterpartyReg", text: "Registration number not given. Due diligence needs it before signing (§3.1.1)." });
    if (f.currency === "USD" && Number(f.amount) > 1000000) out.push({ level: "info", field: "amount", text: "Over USD 1 million: CEO approval needed under the delegation of authority (sample rule)." });
    return out;
  }
  function fieldText(key, f) {
    var v = f[key];
    if (key === "renewalText") return f.autoRenew ? "It renews for one further year unless either party gives " + (isBlank(f.noticeDays) ? "[notice period]" : f.noticeDays) + " days' written notice before the end of the term." : "It ends on expiry unless both parties agree an extension in writing.";
    if (isBlank(v)) return null;
    if (key === "start" || key === "end") return fmt.date(v);
    if (key === "amount" || key === "instalmentAmount") return fmt.number(v);
    return String(v);
  }
  function fillPlain(text, f, tpl) {
    return text.replace(/\{\{(\w+)\}\}/g, function (_, k) { var t = fieldText(k, f); return t === null ? "[" + fieldLabel(k, tpl) + " missing]" : t; });
  }
  function FilledText(props) {
    var parts = props.text.split(/(\{\{\w+\}\})/g);
    return html`<${Fragment}>${parts.map(function (p, i) {
      var m = /^\{\{(\w+)\}\}$/.exec(p);
      if (!m) return p;
      var t = fieldText(m[1], props.fields);
      if (t === null) return html`<mark key=${i} className="ent-deleted" title="Missing field">${"[" + fieldLabel(m[1], props.tpl) + " missing]"}</mark>`;
      return html`<mark key=${i} className="ent" title=${fieldLabel(m[1], props.tpl)}>${t}</mark>`;
    })}<//>`;
  }

  var DRAFT_INIT = { step: 0, tpl: null, fields: {}, mode: "Form", chat: [], q: 0, savedId: null, reviewId: null };

  function DraftingTab() {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var p = APP.useShared("contracts.draft", DRAFT_INIT);
    var dr = Object.assign({}, DRAFT_INIT, p[0] || {});
    var setDr = function (patch) { p[1](function (prev) { return Object.assign({}, DRAFT_INIT, prev || {}, typeof patch === "function" ? patch(Object.assign({}, DRAFT_INIT, prev || {})) : patch); }); };
    var tplOpen = useState(null);
    var tpl = tplById(dr.tpl);
    var checks = tpl ? draftChecks(dr.fields, tpl) : [];

    var pick = guard(pid, function (t) {
      setDr({ step: 1, tpl: t.id, fields: Object.assign({}, X.draftDefaults), chat: [{ role: "assistant", text: "I'll help you fill the " + t.name + " (v" + t.version + "). " + X.dialogue[0].q }], q: 0, savedId: null, reviewId: null });
    });

    var body;
    if (dr.step === 0 || !tpl) {
      body = html`<div>
        <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginBottom: 12 }}>Pick a standard template reviewed by Legal. Only approved versions can be used <${APP.SowRef} sec="3.1.2" />.</div>
        <${A.Row} gutter=${[12, 12]}>${X.templates.map(function (t) {
          var ok = t.status === "Approved";
          return html`<${A.Col} key=${t.id} xs=${24} md=${12} xl=${8}>
            <${A.Card} size="small" hoverable=${ok} style=${{ height: "100%", opacity: ok ? 1 : 0.65, cursor: "pointer" }}
              onClick=${function (e) { if (e.target && e.target.closest && e.target.closest("button")) return; if (ok) pick(t); else tplOpen[1](t.id); }}
              title=${html`<span style=${{ display: "inline-flex", gap: 8, alignItems: "center" }}><${Icon} name="FileProtectOutlined" />${t.name}</span>`}
              extra=${html`<${A.Tag} style=${{ marginInlineEnd: 0 }}>${"v" + t.version}<//>`}>
              <div style=${{ fontSize: 13, color: tok.colorTextSecondary, minHeight: 40 }}>${t.covers}</div>
              <div style=${{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "8px 0" }}>
                <${APP.StatusTag} status=${t.status} />
                ${t.pending ? html`<${A.Tag} color="processing">${"v" + t.pending + " in review"}<//>` : null}
                <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${"In force since " + fmt.date(t.effective) + " · used " + t.uses + " times"}</span>
              </div>
              <${A.Space} size=${6}>
                <${A.Tooltip} title=${ok ? null : "Only approved templates can be used for drafting."}>
                  <${A.Button} type="primary" size="small" disabled=${!ok} onClick=${function () { pick(t); }}>Use this template<//>
                <//>
                <${A.Button} size="small" onClick=${function () { tplOpen[1](t.id); }}>Details<//>
              <//>
            <//>
          <//>`;
        })}<//>
      </div>`;
    } else if (dr.step === 1) {
      body = html`<${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} xl=${15}>
          <div style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <${A.Segmented} value=${dr.mode} onChange=${function (v) { setDr({ mode: v }); }} options=${[{ value: "Form", label: "Form" }, { value: "Dialogue", label: "Dialogue" }]} />
            <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Enter parties, amounts, terms and scope through a form or a conversation</span>
            <div style=${{ flex: 1 }}></div>
            <${A.Button} size="small" onClick=${function () { setDr({ fields: Object.assign({}, X.sampleDraft) }); APP.toast.info("Sample answers filled. Some of them break the checklist on purpose."); }}>Fill with sample answers<//>
            <${A.Button} size="small" onClick=${function () { setDr({ fields: Object.assign({}, X.draftDefaults), q: 0, chat: [{ role: "assistant", text: X.dialogue[0].q }] }); }}>Clear<//>
          </div>
          ${dr.mode === "Form" ? html`<${DraftForm} tpl=${tpl} fields=${dr.fields} checks=${checks} onChange=${function (k, v) { setDr(function (prev) { var f = Object.assign({}, prev.fields); f[k] = v; return { fields: f }; }); }} />`
            : html`<${DraftDialogue} tpl=${tpl} dr=${dr} setDr=${setDr} />`}
        <//>
        <${A.Col} xs=${24} xl=${9}>
          <${DraftChecks} checks=${checks} tpl=${tpl} />
          <${A.Space} wrap>
            <${A.Button} onClick=${function () { setDr({ step: 0 }); }}>Change template<//>
            <${A.Button} type="primary" icon=${html`<${Icon} name="ThunderboltOutlined" />`} onClick=${function () { setDr({ step: 2 }); }}>Generate draft<//>
          <//>
        <//>
      <//>`;
    } else {
      body = html`<${DraftPreview} tpl=${tpl} dr=${dr} setDr=${setDr} checks=${checks} />`;
    }

    var cur = tplOpen[0] ? tplById(tplOpen[0]) : null;
    return html`<div>
      <${A.Steps} size="small" current=${dr.step} style=${{ marginBottom: 16 }} onChange=${function (i) { if (i === 0 || tpl) setDr({ step: i }); }}
        items=${[{ title: "Choose a template", description: tpl ? tpl.name + " v" + tpl.version : null }, { title: "Enter the details", description: tpl ? (checks.filter(function (c) { return c.level === "error"; }).length + " to fix") : null }, { title: "Check the draft" }]} />
      ${body}
      <${A.Divider} />
      <div style=${{ fontWeight: 600, marginBottom: 8 }}>Template library <span style=${{ fontWeight: 400, fontSize: 12, color: tok.colorTextTertiary }}>Versions and approval status are kept by authorised Legal staff</span></div>
      <${APP.DataTable} data=${X.templates} pageSize=${8} searchKeys=${["name", "covers"]} searchPlaceholder="Search templates"
        filters=${[{ key: "status", label: "Status", width: 130 }]}
        columns=${[
          { title: "Template", dataIndex: "name", key: "name", render: function (v, r) { return html`<div><div style=${{ fontWeight: 500 }}>${v}</div><div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.covers}</div></div>`; } },
          { title: "Version", dataIndex: "version", key: "version", render: function (v, r) { return html`<span className="nowrap">${"v" + v}${r.pending ? html` <${A.Tag} color="processing">${"v" + r.pending + " in review"}<//>` : null}</span>`; } },
          APP.col.status("Status", "status"), APP.col.date("In force since", "effective"),
          APP.col.text("Owner", "owner"), { title: "Used", dataIndex: "uses", key: "uses", align: "right" }
        ]}
        onRowClick=${function (r) { tplOpen[1](r.id); }} />
      <${TemplateDrawer} tpl=${cur} onClose=${function () { tplOpen[1](null); }} onUse=${function (t) { tplOpen[1](null); pick(t); }} />
    </div>`;
  }

  function DraftForm(props) {
    var tok = A.theme.useToken().token;
    var tpl = props.tpl, f = props.fields;
    var bad = {};
    props.checks.forEach(function (c) { if (c.level !== "info") bad[c.field] = bad[c.field] === "error" ? "error" : c.level; });
    function field(d) {
      var lbl = fieldLabel(d.key, tpl);
      var status = bad[d.key] === "error" ? "error" : bad[d.key] === "warning" ? "warning" : undefined;
      var v = f[d.key];
      var set = function (x) { props.onChange(d.key, x); };
      var input;
      if (d.kind === "company") input = html`<${A.AutoComplete} status=${status} style=${{ width: "100%" }} value=${v} onChange=${set} options=${X.companies.map(function (c) { return { value: c }; })} placeholder="Company name" />`;
      else if (d.kind === "textarea") input = html`<${A.Input.TextArea} status=${status} rows=${2} value=${v} onChange=${function (e) { set(e.target.value); }} />`;
      else if (d.kind === "date") input = html`<${A.DatePicker} status=${status} style=${{ width: "100%" }} value=${v ? dayjs(v) : null} onChange=${function (x) { set(x ? x.format("YYYY-MM-DD") : ""); }} />`;
      else if (d.kind === "number") input = html`<${A.InputNumber} status=${status} style=${{ width: "100%" }} min=${0} value=${isBlank(v) ? null : v} onChange=${function (x) { set(x === null ? "" : x); }} />`;
      else if (d.kind === "select") input = html`<${A.Select} status=${status} style=${{ width: "100%" }} value=${isBlank(v) ? undefined : v} placeholder="Choose" onChange=${set} options=${d.options.map(function (o) { return { value: o, label: o }; })} />`;
      else if (d.kind === "switch") input = html`<div><${A.Switch} checked=${!!v} onChange=${set} /></div>`;
      else input = html`<${A.Input} status=${status} value=${v} placeholder=${d.placeholder} onChange=${function (e) { set(e.target.value); }} />`;
      var span = d.kind === "textarea" || d.kind === "company" ? 24 : 12;
      if (d.key === "noticeDays" && !f.autoRenew) return null;
      return html`<${A.Col} key=${d.key} xs=${24} md=${span}>
        <div style=${{ marginBottom: 4, fontSize: 13 }}>${lbl}${d.required ? html`<span style=${{ color: tok.colorError, marginLeft: 4 }}>*</span>` : null}</div>
        ${input}
      <//>`;
    }
    return html`<${A.Card} size="small"><${A.Row} gutter=${[12, 12]}>${X.draftFields.map(field)}<//><//>`;
  }

  function DraftChecks(props) {
    var tok = A.theme.useToken().token;
    var c = props.checks;
    var errs = c.filter(function (x) { return x.level === "error"; }).length;
    var warns = c.filter(function (x) { return x.level === "warning"; }).length;
    return html`<${Section} title=${html`<span>Checks <span style=${{ fontWeight: 400, fontSize: 12, color: tok.colorTextTertiary }}>run as you type</span></span>`}
      extra=${html`<${A.Space} size=${4}>${errs ? html`<${A.Tag} color="error">${errs + " to fix"}<//>` : null}${warns ? html`<${A.Tag} color="warning">${warns + " to check"}<//>` : null}<//>`}>
      ${c.length ? html`<${A.Flex} vertical gap=${8}>${c.map(function (x, i) {
        var ic = x.level === "error" ? ["CloseCircleFilled", tok.colorError] : x.level === "warning" ? ["ExclamationCircleFilled", tok.colorWarning] : ["InfoCircleFilled", tok.colorInfo];
        return html`<div key=${i} style=${{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}><${Icon} name=${ic[0]} style=${{ color: ic[1], marginTop: 3 }} /><span>${x.text}</span></div>`;
      })}<//>` : html`<div style=${{ display: "flex", gap: 8, alignItems: "center", color: tok.colorSuccessText }}><${Icon} name="CheckCircleFilled" /> No issues found by the rules.</div>`}
      <div style=${{ fontSize: 12, color: tok.colorTextTertiary, marginTop: 10 }}>Missing mandatory fields, unreasonable dates and inconsistent amounts are flagged by rule, not by the model <${APP.SowRef} sec="3.1.2" />.</div>
    <//>`;
  }

  function parseAnswer(key, text) {
    var d = fieldDef(key);
    if (!d) return text;
    if (d.kind === "number") { var n = parseFloat(String(text).replace(/[^0-9.]/g, "")); return isNaN(n) ? "" : n; }
    if (d.kind === "date") { var dt = dayjs(new Date(text)); return dt.isValid() ? dt.format("YYYY-MM-DD") : ""; }
    if (d.kind === "select") { var m = d.options.filter(function (o) { return o.toLowerCase() === String(text).trim().toLowerCase(); })[0]; return m || String(text).trim(); }
    return String(text).trim();
  }

  function DraftDialogue(props) {
    var tok = A.theme.useToken().token;
    var dr = props.dr, tpl = props.tpl;
    var typing = useState(false);
    var timer = useRef(null);
    useEffect(function () { return function () { clearTimeout(timer.current); }; }, []);
    var qi = dr.q;
    var done = qi >= X.dialogue.length;
    var curQ = done ? null : X.dialogue[qi];
    var answer = function (text) {
      if (!curQ || !String(text || "").trim()) return;
      var val = parseAnswer(curQ.f, text);
      var nextIdx = qi + 1;
      props.setDr(function (prev) {
        var f = Object.assign({}, prev.fields); f[curQ.f] = val;
        return { fields: f, q: nextIdx, chat: (prev.chat || []).concat([{ role: "user", text: String(text).trim() }]) };
      });
      typing[1](true);
      timer.current = setTimeout(function () {
        typing[1](false);
        var lbl = fieldLabel(curQ.f, tpl);
        var shown = isBlank(val) ? "I couldn't read that, so " + lbl.toLowerCase() + " is left blank and flagged." : "Noted: " + lbl.toLowerCase() + " is " + (fieldText(curQ.f, Object.assign({}, dr.fields, (function () { var o = {}; o[curQ.f] = val; return o; })())) || val) + ".";
        var nq = X.dialogue[nextIdx];
        props.setDr(function (prev) {
          var issues = draftChecks(prev.fields, tpl);
          var tail = nq ? " " + nq.q : " That's everything I need. " + (issues.length ? issues.length + " checks need your attention on the right." : "No issues found.") + " Choose Generate draft when ready.";
          return { chat: (prev.chat || []).concat([{ role: "assistant", text: shown + tail }]) };
        });
      }, 500);
    };
    return html`<${A.Card} size="small" styles=${{ body: { padding: 12 } }}>
      <${APP.ChatThread} height=${340}>
        ${(dr.chat || []).map(function (m, i) {
          return html`<${APP.ChatMessage} key=${i} role=${m.role} author="Drafting assistant">${m.text}<//>`;
        })}
        ${typing[0] ? html`<${APP.ChatMessage} role="assistant" author="Drafting assistant"><${APP.TypingIndicator} label="Writing" /><//>` : null}
      <//>
      <div style=${{ marginTop: 8 }}>
        <${APP.Composer} disabled=${done || typing[0]} placeholder=${done ? "All questions answered" : "Type your answer"} onSend=${function (t) { answer(t); }}
          suggestions=${curQ && !typing[0] ? curQ.chips : []} onSuggestion=${answer}
          onAttach=${function () { APP.toast.build("In the build, you can attach a term sheet and the assistant fills the fields from it for you to confirm."); }}
          footerNote=${"Answers fill the form fields. You can switch to Form at any time to check them."} />
      </div>
    <//>`;
  }

  function DraftPreview(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var vp = APP.useViewport();
    var tpl = props.tpl, dr = props.dr, f = dr.fields;
    var created = useList("contracts.created");
    var clauses = X.templateClauses[tpl.clauses];
    var errors = props.checks.filter(function (c) { return c.level === "error"; });
    var s = APP.useStore();
    var rev = dr.reviewId ? s.reviews.filter(function (r) { return r.id === dr.reviewId; })[0] : null;

    function save(silent) {
      if (dr.savedId) return dr.savedId;
      var n = created[0].length;
      var id = "CON-2026-0" + (31 + n);
      var cp = f.counterparty || "Counterparty to be named";
      var docId = "GEN-" + id;
      APP.registerDocument({ id: docId, title: tpl.name + ": " + shortParty(cp) + " (draft)", kind: "Draft contract", totalPages: 1, dataClass: "Internal", version: "Draft 1, from template v" + tpl.version,
        pages: [{ n: 1, clauses: clauses.map(function (c) { return { id: c.id, heading: c.heading, text: fillPlain(c.text, f, tpl) }; }) }] });
      var issues = props.checks.filter(function (c) { return c.level !== "info"; }).map(function (c) { return c.text; });
      var contract = {
        id: id, title: tpl.name + ": " + shortParty(cp), counterparty: cp, type: tpl.clauses === "lease" ? "Lease" : "Services",
        dept: f.dept || "Not set", ownerId: pid, value: isBlank(f.amount) ? "Not set" : valueRange(f.amount, f.currency), signed: null,
        start: f.start || APP.nowIso().slice(0, 10), end: f.end || APP.now().add(1, "year").format("YYYY-MM-DD"), status: "Draft", risk: "Not rated", dataClass: "Internal",
        renewal: f.autoRenew ? "Renews unless " + (f.noticeDays || "?") + " days' notice" : "Ends on expiry", noticeBy: null, docId: docId, records: [],
        flags: ["Drafted from template " + tpl.id + " v" + tpl.version].concat(issues.slice(0, 3)), obligations: [], live: true,
        extra: { number: "To be assigned on signing", responsible: f.responsible || "Not set", businessOwner: f.dept || "", exactValue: isBlank(f.amount) ? "" : money(f.currency, f.amount) + " (proposed)",
          payment: isBlank(f.instalments) ? "" : f.instalments + " instalments, " + (f.paymentDays || 30) + " days from invoice", law: "Sri Lanka, arbitration seated in Colombo",
          source: "Drafted from the " + tpl.name + " template v" + tpl.version + " on " + fmt.date(APP.nowIso()), extracted: [],
          history: [{ at: APP.nowIso(), event: "Draft created", by: APP.personName(pid), detail: "Generated from " + tpl.name + " v" + tpl.version + ". " + issues.length + " checks open. Not approved, not signed.", live: true }],
          documents: [{ id: "D-" + id, name: tpl.name + ", draft 1.docx", kind: "Draft contract", version: "Draft 1", pages: 1, dataClass: "Internal", added: APP.nowIso().slice(0, 10), by: APP.personName(pid), status: "Draft", docId: docId, summary: "Generated in this session from template v" + tpl.version + "." }],
          pastReviews: [] }
      };
      created[1](contract);
      APP.audit({ action: "Draft created", item: id, detail: "From template " + tpl.id + " v" + tpl.version + ". Not approved, not signed.", dataClass: "Internal" });
      props.setDr({ savedId: id });
      if (!silent) APP.toast.success(id + " saved to the register as a Draft. It is never marked approved or signed automatically.");
      return id;
    }
    var onSave = guard(pid, function () { save(false); });
    var onReview = guard(pid, function () {
      if (pid === "reviewer") { APP.toast.warn("Reviewers can't send their own drafts for review. Switch to N. Perera."); return; }
      if (rev && rev.status === "Pending") { APP.navigate("reviews", { id: rev.id }); return; }
      var id = save(true);
      var r = APP.createReview({
        title: "Contract draft: " + tpl.name + ", " + shortParty(f.counterparty || "unnamed party"), kind: "Contract draft", archiveCategory: "Contract draft", ref: id,
        dataClass: "Internal", modelName: "Template v" + tpl.version + " with rule checks", phase: 1, source: { route: "contracts", params: { id: id } },
        content: { summary: "Generated from " + tpl.name + " v" + tpl.version + ". " + (props.checks.length ? props.checks.length + " checks open: " + props.checks.map(function (c) { return c.text; }).join(" ") : "No rule issues."),
          sections: clauses.map(function (c) { return { heading: c.heading, text: fillPlain(c.text, f, tpl) }; }) },
        citations: []
      });
      props.setDr({ reviewId: r.id });
      APP.toast.success("Saved as " + id + " and sent to Li Wei for legal review (" + r.id + ").");
    });

    return html`<${A.Row} gutter=${[16, 16]}>
      <${A.Col} xs=${24} xl=${15}>
        <div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <${Icon} name="FileWordOutlined" style=${{ color: tok.colorPrimary }} />
          <span style=${{ fontWeight: 600 }}>${tpl.name + ": " + (f.counterparty ? shortParty(f.counterparty) : "unnamed party")}</span>
          <${A.Tag}>${"Draft from v" + tpl.version}<//>
          <${APP.DataClassTag} cls="Internal" />
          <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}><mark className="ent">filled</mark> <mark className="ent-deleted">missing</mark></span>
        </div>
        <div className="doc-page" style=${{ maxHeight: vp.isMobile ? undefined : "calc(100vh - var(--shell-top) - 220px)", overflowY: vp.isMobile ? undefined : "auto" }}>
          <h3 style=${{ textAlign: "center", marginTop: 0 }}>${tpl.name.toUpperCase()}</h3>
          ${clauses.map(function (c) {
            return html`<div key=${c.id} className="doc-clause"><h4>${c.heading}</h4><p><${FilledText} text=${c.text.replace("{{renewalText}}", fieldText("renewalText", f))} fields=${f} tpl=${tpl} /></p></div>`;
          })}
          <div className="doc-page-no">Draft generated from the approved template. Editable. Not approved, not signed.</div>
        </div>
      <//>
      <${A.Col} xs=${24} xl=${9}>
        <${DraftChecks} checks=${props.checks} tpl=${tpl} />
        ${rev ? html`<${A.Alert} type=${rev.status === "Pending" ? "info" : rev.status === "Confirmed" ? "success" : "warning"} showIcon style=${{ marginBottom: 12 }}
          message=${rev.status === "Pending" ? "In legal review with " + APP.personName(rev.reviewerId) : rev.status + " by " + APP.personName(rev.decidedBy)}
          title=${rev.status === "Pending" ? "In legal review with " + APP.personName(rev.reviewerId) : rev.status + " by " + APP.personName(rev.decidedBy)}
          description=${rev.id + (rev.comment ? ": " + rev.comment : "")} />` : null}
        <${Section} title="What happens next">
          <ol style=${{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            <li>Save the draft. It enters the register with status Draft.</li>
            <li>Send it for legal review. A specialist reviewer confirms or returns it.</li>
            <li>Due diligence and approvals follow the delegation of authority.</li>
            <li>Only a signed copy changes the status. Nothing is marked approved or signed automatically.</li>
          </ol>
        <//>
        ${errors.length ? html`<${A.Alert} type="error" showIcon style=${{ marginBottom: 12 }} message=${errors.length + " issues to fix before signing"} title=${errors.length + " issues to fix before signing"}
          description="You can still save and send the draft. The issues travel with it to the reviewer." />` : null}
        <${A.Flex} gap=${8} wrap>
          <${A.Button} onClick=${function () { props.setDr({ step: 1 }); }}>Back to details<//>
          <${A.Button} icon=${html`<${Icon} name="SaveOutlined" />`} disabled=${!!dr.savedId} onClick=${onSave}>${dr.savedId ? "Saved as " + dr.savedId : "Save to register"}<//>
          <${A.Button} type="primary" icon=${html`<${Icon} name="SendOutlined" />`} onClick=${onReview}>${rev && rev.status === "Pending" ? "Open review " + rev.id : "Send for legal review"}<//>
          <${A.Button} icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${function () { APP.toast.build("In the build, the draft downloads as an editable Word file with the template version in its properties."); }}>Word<//>
          ${dr.savedId ? html`<${A.Button} type="link" onClick=${go("contracts", { id: dr.savedId })}>${"Open " + dr.savedId}<//>` : null}
          ${dr.savedId ? html`<${A.Button} type="link" onClick=${function () { props.setDr(Object.assign({}, DRAFT_INIT)); }}>Start a new draft<//>` : null}
        <//>
      <//>
    <//>`;
  }

  function TemplateDrawer(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var t = props.tpl;
    return html`<${APP.DetailDrawer} open=${!!t} onClose=${props.onClose} title=${t ? t.name : ""} subtitle=${t ? t.id + " · v" + t.version : ""} size=${620}
      tags=${t ? html`<${APP.StatusTag} status=${t.status} />` : null}
      actions=${t && t.status === "Approved" ? html`<${A.Button} size="small" type="primary" onClick=${function () { props.onUse(t); }}>Use this template<//>` : null}>
      ${t ? html`<div>
        <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Covers", t.covers], ["In force since", fmt.date(t.effective)], ["Owner", t.owner], ["Approved by", t.approvedBy], ["Used", t.uses + " times"], ["Knowledge base", t.kb ? html`<a onClick=${function () { props.onClose(); APP.navigate("knowledge", { id: t.kb }); }}>${t.kb}</a>` : "Not linked"]]} />
        <div style=${{ fontWeight: 600, margin: "16px 0 8px" }}>Versions</div>
        <${A.Timeline} items=${t.versions.map(function (v) { var cn = html`<div><b>${"v" + v.v}</b> <${APP.StatusTag} status=${v.status} icon=${false} /> <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${fmt.date(v.at)}</span><div style=${{ fontSize: 13 }}>${v.note || "No notes."}</div></div>`; return { key: v.v, children: cn, content: cn }; })} />
        <div style=${{ fontWeight: 600, margin: "8px 0" }}>Clauses and fields</div>
        <div className="doc-page">${X.templateClauses[t.clauses].map(function (c) {
          return html`<div key=${c.id} className="doc-clause"><h4>${c.heading}</h4><p>${c.text.split(/(\{\{\w+\}\})/g).map(function (p, i) {
            var m = /^\{\{(\w+)\}\}$/.exec(p);
            return m ? html`<${A.Tag} key=${i} color="blue" style=${{ marginInlineEnd: 2 }}>${m[1] === "renewalText" ? "Renewal wording" : fieldLabel(m[1], t)}<//>` : p;
          })}</p></div>`;
        })}</div>
        <${A.Space} wrap>
          <${A.Button} onClick=${function () {
            if (pid !== "legal" && pid !== "reviewer") { APP.toast.info("Only authorised Legal staff maintain templates. In the build, this button is hidden for your role."); return; }
            APP.toast.build("In the build, a new version is drafted here and goes through legal approval before business users can pick it (§3.1.2).");
          }}>Propose a new version<//>
          <${A.Button} onClick=${function () { APP.toast.build("In the build, the template downloads as a Word file with its fields marked."); }}>Download<//>
        <//>
      </div>` : null}
    <//>`;
  }

  /* ==================================================================
     Contract review workspace (route: contract-review)
     ================================================================== */
  function resolveItems(cid) {
    var items = X.reviewItems[cid] || [];
    var F = {};
    (D.reviewFindings[cid] || []).forEach(function (f) { F[f.id] = f; });
    return items.map(function (it) {
      var f = it.findingId ? F[it.findingId] : null;
      if (!f) return it;
      return Object.assign({}, it, {
        title: f.title, fact: f.fact, assessment: it.assessmentOverride || f.assessment, action: f.action,
        cites: f.cites, proposed: f.proposed || null
      });
    });
  }
  function clauseLabel(id) { return /^\d/.test(id) ? "Clause " + id : id === "sig" ? "Signature page" : id; }
  var STATUS_ORDER = { "Not met": 0, "Unsure": 1, "Met": 2 };

  function ContractReviewScreen(props) {
    var tok = A.theme.useToken().token;
    var vp = APP.useViewport();
    var pid = APP.usePersona().personaId;
    var params = props.params || {};
    var route = APP.useRoute();
    var contracts = useContracts();
    var cidState = useState(params.id || params.contractId || "CON-2024-051");
    useEffect(function () { var w = params.id || params.contractId; if (w) cidState[1](w); }, [params.id, params.contractId, route.at]);
    var cid = cidState[0];
    var c = contractById(contracts, cid) || contracts[0];
    var hasResults = !!X.reviewItems[c.id];
    var picker = html`<${A.Select} value=${c.id} style=${{ minWidth: 240, maxWidth: "100%" }} popupMatchSelectWidth=${false}
      onChange=${function (v) { cidState[1](v); }} options=${contracts.map(function (x) { return { value: x.id, label: x.id + " " + x.title }; })} />`;
    if (!hasResults) return html`<${ReviewNoResults} contract=${c} picker=${picker} />`;
    return html`<${ReviewWorkspace} key=${c.id} contract=${c} picker=${picker} />`;
  }

  function ReviewNoResults(props) {
    var pid = APP.usePersona().personaId;
    var c = props.contract;
    var ex = extraFor(c);
    var docId = c.docId || (D.documents[c.id] ? c.id : null);
    var running = useState(false);
    var run = guard(pid, function () {
      running[1](true);
      setTimeout(function () { running[1](false); APP.toast.build("In the build, the review runs against the selected checklist here. This sample has full results for CON-2024-051 only."); }, 1400);
    });
    return html`<div>
      <${APP.PageHeader} title="Contract review" phase=${1} sow=${["3.1.3"]} crumbs=${[{ label: "Contracts", route: "contracts", params: {} }, { label: c.id, route: "contracts", params: { id: c.id } }, { label: "Review" }]}
        subtitle="Clause-by-clause review against a Company-confirmed checklist, with the cited clause beside each finding."
        actions=${html`<${Fragment}>${props.picker}<//>`} />
      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} lg=${docId ? 14 : 24}>
          <${A.Card}>
            <${A.Result} status="info" icon=${html`<${Icon} name="FileSearchOutlined" />`} title=${"No review results yet for " + c.id}
              subTitle=${docId ? "The contract text is on file. Choose a checklist and run the review." : "Upload the contract text first. Every upload is classified and checked for sensitive data before any model sees it."}
              extra=${html`<${A.Space} wrap>
                ${docId ? html`<${A.Button} type="primary" loading=${running[0]} onClick=${run}>Run the review<//>` : html`<${A.Button} type="primary" onClick=${go("contracts", { id: c.id, tab: "documents" })}>Go to documents<//>`}
                <${A.Button} onClick=${go("contract-review", { id: "CON-2024-051" })}>Open the sample review (CON-2024-051)<//>
              <//>`} />
            ${running[0] ? html`<${A.Skeleton} active paragraph=${{ rows: 4 }} />` : null}
          <//>
        <//>
        ${docId ? html`<${A.Col} xs=${24} lg=${10}><${A.Card} size="small" title="Contract text"><${APP.DocViewer} doc=${docId} height=${520} /><//><//>` : null}
      <//>
    </div>`;
  }

  function useReviewState(cid) {
    var m = useMap("contracts.review");
    var st = Object.assign({ decisions: {}, overrides: {} }, m[0][cid] || {});
    var patch = function (fn) { m[1](cid, function (prev) { var cur = Object.assign({ decisions: {}, overrides: {} }, prev || {}); return Object.assign({}, cur, fn(cur)); }); };
    return [st, patch];
  }

  function ReviewWorkspace(props) {
    var tok = A.theme.useToken().token;
    var vp = APP.useViewport();
    var pid = APP.usePersona().personaId;
    var c = props.contract;
    var ex = extraFor(c);
    var rs = useReviewState(c.id), st = rs[0], patch = rs[1];
    var s = APP.useStore();
    var items = useMemo(function () { return resolveItems(c.id); }, [c.id]);
    var summary = X.reviewSummary[c.id];
    var docRef = useRef(null);
    var sel = useState(null), nonce = useState(0), hl = useState(null);
    var filter = useState("issues"), rightTab = useState("findings"), mobileTab = useState("findings");
    var masked = useState(false), running = useState(false), sendOpen = useState(false);
    var effStatus = function (it) { return st.overrides[it.id] || it.status; };
    var counts = { "Met": 0, "Not met": 0, "Unsure": 0 };
    items.forEach(function (it) { counts[effStatus(it)]++; });
    var sugg = items.filter(function (it) { return it.proposed; });
    var decided = sugg.filter(function (it) { return st.decisions[it.id]; }).length;
    var docBase = APP.getDocument(c.docId || c.id);
    var doc = useMemo(function () {
      if (!docBase) return null;
      var applied = {};
      items.forEach(function (it) { var d = st.decisions[it.id]; if (it.proposed && d && (d.state === "applied" || d.state === "edited")) applied[it.clause] = { text: d.after || it.proposed.after, by: d.by, at: d.at }; });
      if (!Object.keys(applied).length) return docBase;
      return Object.assign({}, docBase, { pages: docBase.pages.map(function (pg) {
        return Object.assign({}, pg, { clauses: pg.clauses.map(function (cl) {
          var a = applied[cl.id];
          return a ? Object.assign({}, cl, { text: a.text, note: { kind: "tracked", text: "Proposed change applied in this draft by " + APP.personName(a.by) + " at " + fmt.time(a.at) + ". Not yet confirmed or agreed with the counterparty." } }) : cl;
        }) });
      }) });
    }, [docBase, st.decisions]);

    var revs = s.reviews.filter(function (r) { return r.ref === c.id && r.kind === "Contract review"; });
    var latestRev = revs[0];
    var selItem = sel[0] ? items.filter(function (it) { return it.id === sel[0]; })[0] : null;
    var highlight = hl[0] || (selItem ? [selItem.clause].concat((selItem.cites || []).filter(function (x) { return x.doc === (docBase && docBase.id) && x.clause !== selItem.clause; }).map(function (x) { return x.clause; })) : null);

    function select(it, fromDoc) {
      sel[1](it.id); hl[1](null); nonce[1](nonce[0] + 1);
      if (!fromDoc && vp.isMobile) { /* stay on findings; user taps Show in document */ }
      if (!fromDoc && !vp.isMobile && docRef.current) setTimeout(function () { if (docRef.current) docRef.current.scrollTo(it.clause); }, 60);
      if (fromDoc) {
        rightTab[1]("findings");
        setTimeout(function () { var el = document.getElementById("finding-" + it.id); if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 80);
      }
    }
    function showInDoc(clauses) {
      hl[1](clauses); nonce[1](nonce[0] + 1);
      if (vp.isMobile) mobileTab[1]("document");
      setTimeout(function () { if (docRef.current) docRef.current.scrollTo(clauses[0]); }, vp.isMobile ? 250 : 60);
    }
    function openCite(cite) {
      if (docBase && cite.doc === docBase.id) showInDoc([cite.clause]);
      else APP.openSource(cite, selItem ? selItem.cites : [cite]);
    }
    var decide = guard(pid, function (it, state, extra) {
      patch(function (cur) {
        var d = Object.assign({}, cur.decisions);
        if (state === null) delete d[it.id]; else d[it.id] = Object.assign({ state: state, by: pid, at: APP.nowIso() }, extra || {});
        return { decisions: d };
      });
      if (state) APP.audit({ action: "Suggested change " + (state === "applied" ? "applied" : state === "edited" ? "edited and applied" : "dismissed"), item: c.id, detail: "Item " + it.no + ", " + clauseLabel(it.clause).toLowerCase() + (extra && extra.reason ? ". Reason: " + extra.reason : ""), dataClass: c.dataClass });
      if (state === "applied" || state === "edited") { APP.toast.success("Applied to the draft as a tracked change. " + clauseLabel(it.clause) + " is updated in the document."); showInDoc([it.clause]); }
      else if (state === "dismissed") APP.toast.info("Suggestion dismissed. The reason goes to the reviewer.");
      else APP.toast.info("Decision undone.");
    });
    var override = guard(pid, function (it, v) {
      patch(function (cur) { var o = Object.assign({}, cur.overrides); if (v === it.status) delete o[it.id]; else o[it.id] = v; return { overrides: o }; });
      APP.audit({ action: "Checklist result changed", item: c.id, detail: "Item " + it.no + ": " + it.status + " to " + v, dataClass: c.dataClass });
    });
    var hist = useMap("contracts.history");
    var extraAction = function (it) {
      var a = it.extraAction;
      if (a.kind === "reminder") { APP.navigate("contracts", { id: c.id, tab: "milestones" }); APP.toast.info("The renewal notice reminder for 31 Dec 2026 is set: 60, 30 and 7 days before."); }
      else if (a.kind === "obligation") APP.navigate("contracts", { id: c.id, tab: "obligations" });
      else if (a.kind === "upload") APP.navigate("contracts", { id: c.id, tab: "documents" });
      else if (a.kind === "note") {
        guard(pid, function () {
          APP.confirm({ title: "Record the late signing on the contract file?", okText: "Record",
            content: "Work started under work order WO-118 on 1 Mar 2024. The agreement was signed on 12 Apr 2024. A note asking Procurement for the reason is added to the contract history.",
            onOk: function () {
              hist[1](c.id, function (prev) { return (prev || []).concat([{ at: APP.nowIso(), event: "Late signing noted", by: APP.personName(pid), detail: "Signed 6 weeks after work started (WO-118). Reason requested from Procurement (D. Fonseka).", live: true }]); });
              APP.audit({ action: "Note added", item: c.id, detail: "Late signing: reason requested from Procurement", dataClass: c.dataClass });
              APP.toast.success("Note recorded on the contract file.");
            } });
        })();
      }
    };
    var rerun = guard(pid, function () {
      running[1](true);
      setTimeout(function () { running[1](false); APP.toast.success("Review run again at " + fmt.time(APP.nowIso()) + ". Same results: no source document changed."); }, 1500);
    });

    var visible = items.filter(function (it) {
      var e = effStatus(it);
      if (filter[0] === "issues") return e !== "Met";
      if (filter[0] === "all") return true;
      return e === filter[0];
    }).sort(function (a, b) { return (STATUS_ORDER[effStatus(a)] - STATUS_ORDER[effStatus(b)]) || a.no - b.no; });

    var trace = [
      { label: "Classified as Sensitive", detail: "Contract price, bank account and personal names found. Confirmed by N. Perera.", status: "done" },
      { label: "Run on Qwen (self-hosted) inside the CICT VPC", detail: "Sensitive text stays inside the VPC unmasked, so no release was needed.", status: "done" },
      { label: "14 pages read, 2 flagged for a person", detail: "Page 7 image could not be read. Page 8 read with low OCR confidence.", status: "warn" },
      { label: "12 checklist items checked", detail: "Services contract checklist v2.1, in force since 1 Jan 2026.", status: "done" },
      { label: "Dates, notice periods and amounts checked by rule", detail: "Rules v1.4, not left to the model.", status: "done" },
      { label: "Schedule C missing", detail: "Item 7 can't be assessed without it.", status: "warn" },
      { label: latestRev && latestRev.status === "Confirmed" ? "Confirmed by " + APP.personName(latestRev.decidedBy) : "Draft until a specialist reviewer confirms it", detail: latestRev ? latestRev.id + ", " + latestRev.status : "Not sent for review yet.", status: latestRev && latestRev.status === "Confirmed" ? "done" : "wait" }
    ];

    var findingsList = html`<div>
      <div style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <div style=${{ maxWidth: "100%", overflowX: "auto" }}><${A.Segmented} size="small" value=${filter[0]} onChange=${filter[1]} options=${[
          { value: "issues", label: "Issues " + (counts["Not met"] + counts["Unsure"]) }, { value: "Not met", label: "Not met " + counts["Not met"] },
          { value: "Unsure", label: "Unsure " + counts["Unsure"] }, { value: "Met", label: "Met " + counts["Met"] }, { value: "all", label: "All" }]} /></div>
      </div>
      ${running[0] ? html`<${A.Skeleton} active paragraph=${{ rows: 6 }} />` : html`<${A.Flex} vertical gap=${10}>
        ${visible.map(function (it) {
          return html`<${FindingCard} key=${it.id} item=${it} status=${effStatus(it)} decision=${st.decisions[it.id]} selected=${sel[0] === it.id}
            onSelect=${function () { select(it); }} onCite=${openCite} onDecide=${decide} onOverride=${override} onExtra=${extraAction}
            onShowInDoc=${function () { showInDoc([it.clause]); }} isMobile=${vp.isMobile} />`;
        })}
        ${!visible.length ? html`<${APP.EmptyHint} title="Nothing in this filter" />` : null}
      <//>`}
    </div>`;

    var checklistTab = html`<${ChecklistPanel} items=${items} effStatus=${effStatus} onPick=${function (it) { filter[1]("all"); rightTab[1]("findings"); mobileTab[1]("findings"); select(it); }} />`;
    var summaryTab = html`<${ReviewSummaryPanel} contract=${c} summary=${summary} counts=${counts} trace=${trace} st=${st} patch=${patch}
      onShow=${showInDoc} onPick=${function (cl) { var it = items.filter(function (x) { return x.clause === cl; })[0]; if (it) { filter[1]("all"); rightTab[1]("findings"); mobileTab[1]("findings"); select(it); } else showInDoc([cl]); }} />`;

    var docToolbar = html`<div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
      <${A.Segmented} size="small" value=${masked[0] ? "masked" : "original"} onChange=${function (v) { masked[1](v === "masked"); }}
        options=${[{ value: "original", label: "Original" }, { value: "masked", label: "Masked view" }]} />
      <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Click a clause to see its finding</span>
    </div>`;
    var docPane = doc ? html`<div>${docToolbar}<${APP.DocViewer} ref=${docRef} doc=${doc} highlight=${highlight} nonce=${nonce[0]} masked=${masked[0]} showEntities=${masked[0]}
        height=${vp.isMobile ? "70vh" : "calc(100vh - var(--shell-top) - 330px)"} onClauseClick=${function (cl) {
          var it = items.filter(function (x) { return x.clause === cl.id; })[0] || items.filter(function (x) { return (x.cites || []).some(function (ct) { return ct.clause === cl.id && ct.doc === docBase.id; }); })[0];
          if (it) { filter[1]("all"); select(it, true); if (vp.isMobile) mobileTab[1]("findings"); }
          else APP.toast.info(clauseLabel(cl.id) + " has no finding against this checklist.");
        }} /></div>`
      : html`<${APP.EmptyHint} title="Contract text not available" />`;

    var reviewTag = latestRev ? html`<${APP.StatusTag} status=${latestRev.status === "Pending" ? "In review" : latestRev.status} />` : html`<${A.Tag} color="default" style=${{ marginInlineEnd: 0 }}>Draft, not confirmed<//>`;

    var header = html`<${APP.PageHeader} title=${"Contract review: " + c.title} phase=${1} sow=${["3.1.3"]}
      crumbs=${[{ label: "Contracts", route: "contracts", params: {} }, { label: c.id, route: "contracts", params: { id: c.id } }, { label: "Review" }]}
      tags=${html`<${Fragment}><${APP.DataClassTag} cls=${c.dataClass} /><${APP.ModelTag} id=${summary.model} />${reviewTag}<//>`}
      subtitle=${"Checked against the services contract checklist v2.1 on " + fmt.dateTime(summary.ranAt) + ". Every result is a draft until a specialist reviewer confirms it."}
      actions=${html`<${Fragment}>
        ${props.picker}
        <${A.Select} value="CHK-SVC-2.1" style=${{ minWidth: 220, maxWidth: "100%" }} popupMatchSelectWidth=${false}
          options=${X.checklists.map(function (k) { return { value: k.id, label: k.name }; })}
          onChange=${function (v) { if (v !== "CHK-SVC-2.1") APP.toast.build("In the build, the review runs again against " + X.checklists.filter(function (k) { return k.id === v; })[0].name + ". This sample has results for the services contract checklist only."); }} />
        <${A.Button} icon=${html`<${Icon} name="ReloadOutlined" />`} loading=${running[0]} onClick=${rerun}>Run again<//>
        <${A.Dropdown} trigger=${["click"]} menu=${{ items: [{ key: "w", label: "Word, with redlines" }, { key: "p", label: "PDF report" }, { key: "x", label: "Findings to Excel" }],
          onClick: function () { APP.toast.build("In the build, the export keeps task name, analysis time, document versions, cited clauses, AI results and review status (§3.7.3)."); } }}>
          <${A.Button} icon=${html`<${Icon} name="DownloadOutlined" />`}>Export<//><//>
        <${A.Button} type="primary" icon=${html`<${Icon} name=${latestRev && latestRev.status === "Pending" ? "EyeOutlined" : "SendOutlined"} />`}
          onClick=${function () { if (latestRev && latestRev.status === "Pending") APP.navigate("reviews", { id: latestRev.id }); else guard(pid, function () { sendOpen[1](true); })(); }}>
          ${latestRev && latestRev.status === "Pending" ? "Open review " + latestRev.id : "Send for review"}<//>
      <//>`} />`;

    var strip = html`<div style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
      <${A.Tag} color="error" style=${{ marginInlineEnd: 0 }}>${"Overall risk: " + summary.rating}<//>
      <span style=${{ fontSize: 13 }}><${TriTag} status="Not met" /> ${counts["Not met"]}</span>
      <span style=${{ fontSize: 13 }}><${TriTag} status="Unsure" /> ${counts["Unsure"]}</span>
      <span style=${{ fontSize: 13 }}><${TriTag} status="Met" /> ${counts["Met"]}</span>
      <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Suggested changes decided: " + decided + " of " + sugg.length}</span>
      <div style=${{ flex: 1 }}></div>
      <span style=${{ fontSize: 12, color: tok.colorTextSecondary, maxWidth: 520 }}>${summary.ratingReason}</span>
    </div>`;

    var revBanner = latestRev && latestRev.status !== "Pending" ? html`<${A.Alert} showIcon style=${{ marginBottom: 12 }} type=${latestRev.status === "Confirmed" ? "success" : "warning"}
      message=${latestRev.status === "Confirmed" ? "Confirmed by " + APP.personName(latestRev.decidedBy) + " on " + fmt.dateTime(latestRev.decidedAt) : "Returned by " + APP.personName(latestRev.decidedBy) + " with comments"}
      title=${latestRev.status === "Confirmed" ? "Confirmed by " + APP.personName(latestRev.decidedBy) + " on " + fmt.dateTime(latestRev.decidedAt) : "Returned by " + APP.personName(latestRev.decidedBy) + " with comments"}
      description=${latestRev.status === "Confirmed" ? "Archived" + (latestRev.recordId ? " as " + latestRev.recordId : "") + " and linked to " + c.id + "." : (latestRev.comment || "See comments.") + " Revise and send again."}
      action=${latestRev.recordId ? html`<${A.Button} size="small" onClick=${go("records", { id: latestRev.recordId })}>Open record<//>` : html`<${A.Button} size="small" onClick=${function () { guard(pid, function () { sendOpen[1](true); })(); }}>Send again<//>`} />` : null;

    var rightTabs = [
      { key: "findings", label: "Findings", children: findingsList },
      { key: "checklist", label: "Checklist", children: checklistTab },
      { key: "summary", label: "Summary", children: summaryTab }
    ];
    var paneH = "calc(100vh - var(--shell-top) - 260px)";
    var layout;
    if (vp.isMobile) {
      layout = html`<${A.Card} size="small" styles=${{ body: { paddingTop: 0 } }}><${A.Tabs} activeKey=${mobileTab[0]} onChange=${mobileTab[1]} items=${[
        { key: "document", label: "Document", children: docPane }].concat(rightTabs)} /><//>`;
    } else {
      var right = html`<div style=${{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, paddingLeft: 12 }}>
        <${A.Tabs} activeKey=${rightTab[0]} onChange=${rightTab[1]} size="small" items=${rightTabs.map(function (t) { return { key: t.key, label: t.label, children: html`<div style=${{ height: "calc(" + paneH + " - 70px)", overflowY: "auto", paddingRight: 6 }}>${t.children}</div>` }; })} />
      </div>`;
      var left = html`<div style=${{ paddingRight: 12, minWidth: 0 }}>${docPane}</div>`;
      layout = A.Splitter ? html`<${A.Card} size="small" styles=${{ body: { padding: 12 } }}>
          <${A.Splitter} style=${{ height: paneH, minHeight: 520 }}>
            <${A.Splitter.Panel} defaultSize="52%" min="30%" max="70%">${left}<//>
            <${A.Splitter.Panel}>${right}<//>
          <//>
        <//>`
        : html`<${A.Row} gutter=${16}><${A.Col} span=${13}>${left}<//><${A.Col} span=${11}>${right}<//><//>`;
    }

    return html`<div>
      ${header}
      ${revBanner}
      ${strip}
      ${layout}
      <${SendReviewModal} open=${sendOpen[0]} onClose=${function () { sendOpen[1](false); }} contract=${c} items=${items} effStatus=${effStatus} st=${st} summary=${summary} />
    </div>`;
  }

  function FindingCard(props) {
    var tok = A.theme.useToken().token;
    var it = props.item, stt = props.status, dec = props.decision, selected = props.selected;
    var editing = useState(null), dismissing = useState(false), reason = useState("Accepted risk, recorded by Legal");
    var border = selected ? tok.colorPrimary : tok.colorBorderSecondary;
    var changed = stt !== it.status;
    var after = dec && dec.after ? dec.after : it.proposed ? it.proposed.after : "";
    var redline = null;
    if (it.proposed) {
      if (editing[0] !== null) {
        redline = html`<div>
          <${A.Input.TextArea} autoSize=${{ minRows: 2 }} value=${editing[0]} onChange=${function (e) { editing[1](e.target.value); }} />
          <div style=${{ marginTop: 6 }}><${APP.Redline} before=${it.proposed.before} after=${editing[0]} /></div>
          <${A.Space} style=${{ marginTop: 8 }}>
            <${A.Button} size="small" type="primary" onClick=${function () { props.onDecide(it, "edited", { after: editing[0] }); editing[1](null); }}>Apply edited text<//>
            <${A.Button} size="small" onClick=${function () { editing[1](null); }}>Cancel<//>
          <//>
        </div>`;
      } else if (dismissing[0]) {
        redline = html`<div>
          <div style=${{ fontSize: 13, marginBottom: 6 }}>Why dismiss this suggestion?</div>
          <${A.Radio.Group} value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }} style=${{ display: "flex", flexDirection: "column", gap: 4 }}
            options=${["Accepted risk, recorded by Legal", "Approved exception on file", "Not relevant to this contract"]} />
          <${A.Space} style=${{ marginTop: 8 }}>
            <${A.Button} size="small" danger onClick=${function () { props.onDecide(it, "dismissed", { reason: reason[0] }); dismissing[1](false); }}>Dismiss<//>
            <${A.Button} size="small" onClick=${function () { dismissing[1](false); }}>Cancel<//>
          <//>
        </div>`;
      } else if (dec && dec.state === "dismissed") {
        redline = html`<div>
          <${A.Alert} type="info" showIcon message=${"Dismissed: " + dec.reason} title=${"Dismissed: " + dec.reason} description=${"By " + APP.personName(dec.by) + " at " + fmt.time(dec.at) + ". The reviewer sees the reason."} />
          <${A.Button} size="small" type="link" style=${{ padding: 0 }} onClick=${function () { props.onDecide(it, null); }}>Undo<//>
        </div>`;
      } else if (dec) {
        redline = html`<div>
          <${APP.Redline} before=${it.proposed.before} after=${after} />
          <${A.Alert} style=${{ marginTop: 8 }} type="success" showIcon message=${dec.state === "edited" ? "Edited and applied to the draft" : "Applied to the draft"} title=${dec.state === "edited" ? "Edited and applied to the draft" : "Applied to the draft"}
            description=${"By " + APP.personName(dec.by) + " at " + fmt.time(dec.at) + ". Shown as a tracked change. Still a proposal until the reviewer confirms and the counterparty agrees."} />
          <${A.Button} size="small" type="link" style=${{ padding: 0 }} onClick=${function () { props.onDecide(it, null); }}>Undo<//>
        </div>`;
      } else {
        redline = html`<div>
          <${APP.Redline} before=${it.proposed.before} after=${it.proposed.after} showLegend=${true} />
          <${A.Space} style=${{ marginTop: 8 }} wrap>
            <${A.Button} size="small" type="primary" icon=${html`<${Icon} name="CheckOutlined" />`} onClick=${function () { props.onDecide(it, "applied", { after: it.proposed.after }); }}>Apply<//>
            <${A.Button} size="small" icon=${html`<${Icon} name="EditOutlined" />`} onClick=${function () { editing[1](it.proposed.after); }}>Edit<//>
            <${A.Button} size="small" icon=${html`<${Icon} name="CloseOutlined" />`} onClick=${function () { dismissing[1](true); }}>Dismiss<//>
          <//>
        </div>`;
      }
    }
    var cites = it.cites || [];
    return html`<div id=${"finding-" + it.id} role="button" tabIndex=${0} aria-expanded=${selected}
      onClick=${function () { if (!selected) props.onSelect(); }} onKeyDown=${function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); props.onSelect(); } }}
      style=${{ border: "1px solid " + border, boxShadow: selected ? "0 0 0 1px " + tok.colorPrimary : "none", borderRadius: 10, padding: "10px 12px",
        background: tok.colorBgContainer, cursor: selected ? "default" : "pointer", scrollMarginTop: 12 }}>
      <div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} onClick=${function (e) { if (selected) { stop(e); props.onSelect(); } }}>
        <${TriTag} status=${stt} />
        <span style=${{ fontWeight: 600, flex: "1 1 180px", minWidth: 0 }}>${it.title}</span>
        ${it.severity && it.severity !== "Low" ? html`<${APP.StatusTag} status=${it.severity} icon=${false} />` : null}
        ${dec ? html`<${A.Tag} color=${dec.state === "dismissed" ? "default" : "green"} style=${{ marginInlineEnd: 0 }}>${dec.state === "dismissed" ? "Dismissed" : "Applied"}<//>` : it.proposed ? html`<${A.Tag} color="blue" style=${{ marginInlineEnd: 0 }}>Redline<//>` : null}
      </div>
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>${"Checklist item " + it.no + " · " + clauseLabel(it.clause) + (changed ? " · changed from " + it.status + " by a person" : "")}</div>
      ${!selected ? html`<div style=${{ fontSize: 13, marginTop: 6, color: tok.colorTextSecondary, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>${it.fact}</div>`
        : html`<div style=${{ marginTop: 10 }} onClick=${stop}>
          <${FactBlock} label="Fact">${it.fact}<//>
          <${FactBlock} label="Assessment">${it.assessment}<//>
          <${FactBlock} label="Recommendation">${it.action}<//>
          <${FactBlock} label="Checklist requirement"><span style=${{ color: tok.colorTextSecondary }}>${it.requirement}</span><//>
          <div style=${{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <${Label}>Sources<//>
            ${cites.map(function (ct, i) { return html`<${APP.CitationChip} key=${i} n=${i + 1} cite=${ct} cites=${cites} onOpen=${function (cite) { props.onCite(cite); }} />`; })}
            <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${cites.map(function (ct) { return APP.citeLabel(ct); }).join("; ")}</span>
          </div>
          ${redline ? html`<div style=${{ border: "1px dashed " + tok.colorBorder, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <${Label}>${"Suggested revision to " + clauseLabel(it.clause).toLowerCase()}<//>${redline}</div>` : null}
          <div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Your assessment</span>
            <${A.Segmented} size="small" value=${stt} onChange=${function (v) { props.onOverride(it, v); }} options=${["Met", "Not met", "Unsure"]} />
            ${props.isMobile ? html`<${A.Button} size="small" onClick=${props.onShowInDoc}>Show in document<//>` : null}
            ${it.extraAction ? html`<${A.Button} size="small" onClick=${function () { props.onExtra(it); }}>${it.extraAction.label}<//>` : null}
          </div>
        </div>`}
    </div>`;
  }

  function ChecklistPanel(props) {
    var tok = A.theme.useToken().token;
    var chk = X.checklists[0];
    return html`<div>
      <div style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <span style=${{ fontWeight: 600 }}>${chk.name}</span>
        <${APP.StatusTag} status=${chk.status} />
        <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${"In force since " + fmt.date(chk.effective)}</span>
        <${A.Button} size="small" type="link" onClick=${go("knowledge", { id: chk.kb })}>Open in knowledge base<//>
      </div>
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 10 }}>Checks are configured from the Company-confirmed checklist. Click a row to open its finding <${APP.SowRef} sec="3.1.3" />.</div>
      <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="id" dataSource=${props.items} rowClassName="clickable-row"
        onRow=${function (r) { return { onClick: function () { props.onPick(r); } }; }}
        columns=${[
          { title: "No", dataIndex: "no", key: "no", width: 44 },
          { title: "Item", key: "title", render: function (_, r) { return html`<div style=${{ minWidth: 160 }}><div style=${{ fontWeight: 500 }}>${r.title}</div><div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.requirement}</div></div>`; } },
          { title: "Result", key: "res", render: function (_, r) { return html`<${TriTag} status=${props.effStatus(r)} />`; } },
          { title: "Where", key: "cl", render: function (_, r) { return html`<span className="nowrap" style=${{ fontSize: 12 }}>${clauseLabel(r.clause)}</span>`; } }
        ]} /></div>
    </div>`;
  }

  function ReviewSummaryPanel(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var c = props.contract, sm = props.summary, st = props.st;
    var keyClauses = X.keyClauses[c.id] || [];
    var inter = X.interdependent[c.id] || [];
    var rel = APP.useStore(function (s) { return st.secondRelId ? s.releaseRequests.filter(function (r) { return r.id === st.secondRelId; })[0] : null; });
    var requestSecond = guard(pid, function () {
      var input = APP.flows.contractReviewRelease({});
      input.title = "Second opinion: crane maintenance agreement review";
      input.purpose = "Second opinion on the checklist review. Masked text only.";
      input.source = { route: "contract-review", params: { id: c.id } };
      var r = APP.createReleaseRequest(input);
      props.patch(function () { return { secondRelId: r.id }; });
      APP.toast.success("Release request " + r.id + " sent to S. Silva. Nothing leaves the VPC until it is approved.");
    });
    return html`<div>
      <${Section} title="Contract summary">
        <div style=${{ marginBottom: 10 }}>${sm.overview}</div>
        <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Overall risk", html`<${A.Tag} color="error">${sm.rating}<//>`], ["Results", props.counts["Not met"] + " not met, " + props.counts["Unsure"] + " unsure, " + props.counts["Met"] + " met"], ["Reason", sm.ratingReason], ["Run by", APP.personName(sm.runBy) + ", " + fmt.dateTime(sm.ranAt)]]} />
      <//>
      <${Section} title=${html`<span>Key clauses <${APP.SowRef} sec="3.1.3" /></span>`} flush=${true}>
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="topic" dataSource=${keyClauses} rowClassName="clickable-row"
          onRow=${function (r) { return { onClick: function () { if (r.clause) props.onPick(r.clause); else APP.toast.info(r.topic + ": " + r.note); } }; }}
          columns=${[
            { title: "Topic", dataIndex: "topic", key: "topic", render: function (v) { return html`<span style=${{ fontWeight: 500 }} className="nowrap">${v}</span>`; } },
            { title: "Result", dataIndex: "result", key: "result", render: function (v) { return html`<${APP.StatusTag} status=${v} tone=${v === "Found" ? "success" : v === "Partly" ? "warning" : "error"} />`; } },
            { title: "Where and why", key: "w", render: function (_, r) { return html`<div style=${{ minWidth: 200 }}><div style=${{ fontSize: 12 }}>${r.where}</div><div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${r.note}</div></div>`; } }
          ]} /></div>
      <//>
      <${Section} title="Clauses that interact">
        <${A.Flex} vertical gap=${10}>${inter.map(function (x) {
          return html`<div key=${x.id} className="clickable-row" onClick=${function () { props.onShow(x.clauses); }} style=${{ borderLeft: "3px solid " + tok.colorWarning, paddingLeft: 10 }}>
            <div style=${{ fontWeight: 600 }}>${x.title}</div>
            <div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>${x.text}</div>
            <div style=${{ fontSize: 12, color: tok.colorPrimary, marginTop: 2 }}>${"Show " + x.clauses.map(clauseLabel).join(" and ").toLowerCase() + " in the document"}</div>
          </div>`;
        })}<//>
      <//>
      <${Section} title="How this review was made"><${APP.AnswerTrace} steps=${props.trace} defaultOpen=${true} ghost=${true} title="Steps" /><//>
      <${Section} title=${html`<span>Second opinion on a managed model <${APP.SowRef} sec="1.4.7" /></span>`}>
        <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginBottom: 10 }}>Optional. Masked passages go to Claude on Bedrock over PrivateLink only after the data owner releases them. Masking alone is not permission to send.</div>
        ${!rel ? html`<${A.Button} icon=${html`<${Icon} name="SafetyCertificateOutlined" />`} onClick=${requestSecond}>Request release for a second opinion<//>`
          : html`<div>
            <${APP.ApprovalCard} requestId=${rel.id} />
            ${rel.status === "Approved" ? html`<${A.Alert} style=${{ marginTop: 10 }} type="info" showIcon message="Second opinion received (draft)" title="Second opinion received (draft)"
              description="Claude on Bedrock agrees on 11 of 12 items. It rates item 8 (Termination) as Not met rather than Unsure, because clause 3.1 states no cure period itself. For the reviewer to weigh; nothing changes automatically." />` : null}
          </div>`}
      <//>
    </div>`;
  }

  function SendReviewModal(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.usePersona().personaId;
    var c = props.contract, st = props.st;
    var note = useState(""), redlines = useState(true);
    useEffect(function () { if (props.open) { note[1](""); redlines[1](true); } }, [props.open]);
    var items = props.items;
    var counts = { "Met": 0, "Not met": 0, "Unsure": 0 };
    items.forEach(function (it) { counts[props.effStatus(it)]++; });
    var sugg = items.filter(function (it) { return it.proposed; });
    var applied = sugg.filter(function (it) { var d = st.decisions[it.id]; return d && d.state !== "dismissed"; });
    var dismissed = sugg.filter(function (it) { var d = st.decisions[it.id]; return d && d.state === "dismissed"; });
    var open = sugg.filter(function (it) { return !st.decisions[it.id]; });
    var overrides = Object.keys(st.overrides || {});
    var self = pid === "reviewer";
    var send = function () {
      if (self) return;
      var ordered = items.slice().sort(function (a, b) { return (STATUS_ORDER[props.effStatus(a)] - STATUS_ORDER[props.effStatus(b)]) || a.no - b.no; });
      var sections = ordered.filter(function (it) { return props.effStatus(it) !== "Met" || it.findingId; }).map(function (it) {
        var d = st.decisions[it.id];
        var dtext = it.proposed ? (d ? (d.state === "dismissed" ? " Suggested change dismissed: " + d.reason + "." : " Suggested change applied to the draft" + (d.state === "edited" ? " with edits" : "") + ".") : " Suggested change open.") : "";
        return { heading: "Item " + it.no + ". " + it.title + " (" + props.effStatus(it) + ")", text: it.fact + " " + it.action + dtext };
      });
      var cites = [];
      items.forEach(function (it) { (it.cites || []).forEach(function (ct) { if (!cites.some(function (x) { return x.doc === ct.doc && x.clause === ct.clause; })) cites.push(ct); }); });
      var rev = APP.createReview({
        title: "Contract review: " + c.title.toLowerCase(), kind: "Contract review", archiveCategory: "Contract review", ref: c.id,
        dataClass: c.dataClass, modelName: modelName(props.summary.model), phase: 1, source: { route: "contract-review", params: { id: c.id } },
        checklist: "Services contract checklist v2.1", note: note[0], withRedlines: redlines[0],
        content: { summary: "12 checklist items: " + counts["Not met"] + " not met, " + counts["Unsure"] + " unsure, " + counts["Met"] + " met. Overall risk " + props.summary.rating + ". " + applied.length + " suggested changes applied, " + dismissed.length + " dismissed, " + open.length + " open." + (note[0] ? " Note: " + note[0] : ""), sections: sections },
        citations: cites
      });
      APP.audit({ action: "Review package sent", item: c.id, detail: rev.id + (redlines[0] ? ", with redlined draft" : ""), dataClass: c.dataClass });
      APP.toast.success("Sent to Li Wei as " + rev.id + ". You'll be notified when it is confirmed or returned.");
      props.onClose();
    };
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title="Send for review" okText="Send to Li Wei" onOk=${send} okButtonProps=${{ disabled: self }} width=${620} destroyOnHidden=${true}>
      ${self ? html`<${A.Alert} type="error" showIcon style=${{ marginBottom: 12 }} message="You can't review your own request" title="You can't review your own request"
        description="Reviews go to a different specialist reviewer." action=${html`<${A.Button} size="small" onClick=${function () { APP.setPersona("legal"); APP.toast.info("You are now N. Perera, Legal officer."); }}>Switch to N. Perera<//>`} />` : null}
      <${A.Flex} vertical gap=${12}>
        <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Reviewer", html`<${APP.PersonTag} id="reviewer" showRole=${true} />`], ["Contract", c.id],
          ["Results", counts["Not met"] + " not met, " + counts["Unsure"] + " unsure, " + counts["Met"] + " met"], ["Your changes", applied.length + " applied, " + dismissed.length + " dismissed, " + overrides.length + " results changed"]]} />
        ${open.length ? html`<${A.Alert} type="warning" showIcon message=${open.length + " suggested changes have no decision yet"} title=${open.length + " suggested changes have no decision yet"}
          description="They go to the reviewer as open suggestions." />` : null}
        <div><${Label}>Note to the reviewer<//><${A.Input.TextArea} rows=${3} value=${note[0]} onChange=${function (e) { note[1](e.target.value); }} placeholder="For example: please check item 8 against the paper copy, page 8" /></div>
        <${A.Checkbox} checked=${redlines[0]} onChange=${function (e) { redlines[1](e.target.checked); }}>Attach the redlined draft<//>
        <div style=${{ fontSize: 12, color: tok.colorTextTertiary }}>The review stays a draft until Li Wei confirms it. Once confirmed it is archived in Records and linked to ${c.id}.</div>
      <//>
    <//>`;
  }

  /* ==================================================================
     Registration
     ================================================================== */
  APP.registerScreen("contracts", {
    title: "Contracts", group: "p1", phase: 1, icon: "FileTextOutlined", sow: ["3.1.1", "3.1.2", "3.1.4", "3.1.5"],
    summary: "Contract register, obligations, deadlines, due diligence and template drafting.",
    render: ContractsScreen
  });
  APP.registerScreen("contract-review", {
    title: "Contract review", group: "p1", phase: 1, icon: "FileSearchOutlined", sow: ["3.1.3"],
    summary: "Clause-by-clause review against a checklist, with the cited clause beside each finding.",
    roles: ["legal", "owner", "reviewer", "compliance", "cosec"],
    render: ContractReviewScreen
  });
  APP.registerSearch({ group: "Due diligence", items: function (s) {
    return ddList(s.ext["contracts.ddCreated"]).map(function (d) {
      return { id: d.id, title: d.id + " " + d.counterparty, subtitle: d.checklist + " · " + d.status, route: "contracts", params: d.contractId ? { id: d.contractId, tab: "diligence" } : { tab: "diligence" }, icon: "AuditOutlined", phase: 1 };
    });
  } });
  APP.registerSearch({ group: "Contract templates", items: function () {
    return X.templates.map(function (t) { return { id: t.id, title: t.name + " v" + t.version, subtitle: t.covers + " · " + t.status, route: "contracts", params: { tab: "drafting" }, icon: "FileProtectOutlined", phase: 1 }; });
  } });
})();
