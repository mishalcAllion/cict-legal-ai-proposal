/* Screen area: records-knowledge. Routes: records, knowledge. See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, Icon = APP.Icon, fmt = APP.fmt;
  var RA = D.recordsArea, KA = D.knowledgeArea;
  var Fragment = APP.Fragment;

  /* ------------------------------------------------------------------
     Shared helpers
     ------------------------------------------------------------------ */
  var CLASS_RANK = { Public: 0, Internal: 1, Sensitive: 2, Confidential: 3 };
  function rank(cls) { var c = String(cls || "").split(" ")[0]; return CLASS_RANK[c] === undefined ? 1 : CLASS_RANK[c]; }
  function maxClassFor(pid) { return RA.maxClass[pid] === undefined ? "Sensitive" : RA.maxClass[pid]; }
  function canRead(pid, cls) { var m = maxClassFor(pid); return m ? rank(cls) <= rank(m) : false; }
  function metadataOnly(pid) { return !maxClassFor(pid); }
  function recordOf(s, id) { for (var i = 0; i < s.records.length; i++) if (s.records[i].id === id) return s.records[i]; return null; }
  function reviewOf(s, id) { for (var i = 0; i < s.reviews.length; i++) if (s.reviews[i].id === id) return s.reviews[i]; return null; }
  function patchRecord(id, patch) {
    var st = APP.store.getState();
    APP.store.setState({ records: st.records.map(function (r) { return r.id === id ? Object.assign({}, r, patch) : r; }) });
  }
  function useSharedObj(key, init) {
    var pair = APP.useShared(key, init);
    var set = function (fn) { pair[1](function (prev) { var p = prev === undefined ? init : prev; return typeof fn === "function" ? fn(p) : Object.assign({}, p, fn); }); };
    return [pair[0], set];
  }
  function contractOf(id) { for (var i = 0; i < D.contracts.length; i++) if (D.contracts[i].id === id) return D.contracts[i]; return null; }
  function linkInfo(id) {
    var c = contractOf(id);
    if (c) return { label: id, sub: c.title + ", " + c.counterparty, route: "contracts", params: { id: id }, phase: 1, icon: "FileTextOutlined" };
    if (/^CON-/.test(id)) return { label: id, sub: "Ended contract, kept in the archive only", route: null, phase: 1, icon: "FileTextOutlined" };
    if (/^CASE-/.test(id)) return { label: id, sub: "Legal case or dispute", route: "legal", params: { id: id }, phase: 2, icon: "BankOutlined" };
    if (/^BRD-/.test(id)) return { label: id, sub: "Board meeting", route: "board", params: { id: id }, phase: 2, icon: "TeamOutlined" };
    if (/^POL-/.test(id)) return { label: id, sub: "Policy", route: "policies", params: { id: id }, phase: 2, icon: "ProfileOutlined" };
    if (/^RM-/.test(id)) return { label: id, sub: "Audit remediation", route: "compliance", params: { id: id }, phase: 2, icon: "SafetyOutlined" };
    if (/^KB-/.test(id)) return { label: id, sub: "Knowledge base item", route: "knowledge", params: { id: id }, phase: 1, icon: "ReadOutlined" };
    return { label: id, sub: "", route: null, phase: 1, icon: "LinkOutlined" };
  }
  function Stat(props) {
    var tok = A.theme.useToken().token;
    return html`<${A.Card} size="small" hoverable=${!!props.onClick} onClick=${props.onClick} style=${{ height: "100%", cursor: props.onClick ? "pointer" : "default" }}>
      <${A.Statistic} title=${props.title} value=${props.value} prefix=${props.icon ? html`<${Icon} name=${props.icon} />` : null}
        styles=${props.color ? { content: { color: tok[props.color] } } : undefined} />
      ${props.note ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>${props.note}</div>` : null}
    <//>`;
  }
  function Yes(props) {
    var tok = A.theme.useToken().token;
    if (props.v === true) return html`<${Icon} name="CheckOutlined" style=${{ color: tok.colorSuccess }} aria-label="Yes" />`;
    if (props.v === false || !props.v) return html`<${Icon} name="MinusOutlined" style=${{ color: tok.colorTextQuaternary }} aria-label="No" />`;
    return html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${props.v}</span>`;
  }
  function plain(text) { return String(text || "").replace(/\*\*/g, "").replace(/\s*\[\d+\]/g, "").replace(/\n+- /g, " ").replace(/\s+/g, " ").trim(); }

  /* ------------------------------------------------------------------
     RECORDS: record drawer
     ------------------------------------------------------------------ */
  function recordVersions(rec, det, s) {
    if (rec.live) {
      var rev = rec.sourceReviewId ? reviewOf(s, rec.sourceReviewId) : null;
      return [
        { v: "Draft from the assistant", at: rev ? rev.createdAt : rec.archivedAt, by: rev ? APP.personName(rev.requesterId) : rec.ownerName, note: "AI draft, sent for review" },
        { v: rec.version || "Confirmed", at: rec.archivedAt, by: rev && rev.decidedBy ? APP.personName(rev.decidedBy) : rec.ownerName, note: "Confirmed and archived. Current version", current: true }
      ];
    }
    if (det && det.versions) return det.versions;
    return [{ v: rec.version || "1", at: rec.year + "-06-30T10:00", by: rec.ownerName, note: "Current version", current: true }];
  }
  function accessRows(rec) {
    var conf = rec.dataClass === "Confidential", sens = rec.dataClass === "Sensitive";
    if (conf) return [
      { key: "a", group: "Company Secretariat", view: true, download: true, exp: true, manage: true },
      { key: "b", group: "Board members", view: true, download: "Watermarked", exp: false, manage: false },
      { key: "c", group: "Legal", view: false, download: false, exp: false, manage: false },
      { key: "d", group: "Internal Audit", view: "Metadata only", download: false, exp: false, manage: false }
    ];
    return [
      { key: "a", group: rec.dept + " department", view: true, download: true, exp: !sens, manage: rec.dept !== "Legal" },
      { key: "b", group: "Legal", view: true, download: true, exp: sens ? "With approval" : true, manage: rec.dept === "Legal" },
      { key: "c", group: "Records officers", view: "Metadata only", download: false, exp: false, manage: "Retention only" },
      { key: "d", group: "Specialist reviewers", view: true, download: sens ? false : true, exp: false, manage: false },
      { key: "e", group: "Internal Audit", view: "Metadata only", download: false, exp: false, manage: false }
    ];
  }
  var RETENTION_ROLES = ["legal", "owner", "cosec", "compliance"];

  function RetentionActions(props) {
    var rec = props.rec;
    var pid = APP.useStore(function (s) { return s.ui.personaId; });
    var modal = APP.useState(null);
    var reason = APP.useState("");
    var years = APP.useState(3);
    var allowed = RETENTION_ROLES.indexOf(pid) >= 0;
    var due = rec.retainUntil && fmt.daysUntil(rec.retainUntil) <= 0;
    var onHold = rec.status === "Disposal hold";
    var disposed = rec.status === "Disposed";
    var close = function () { modal[1](null); reason[1](""); };
    if (!allowed) return html`<${A.Alert} type="info" showIcon message="Read only for your role" title="Read only for your role"
      description="Retention changes, holds and disposal are decided by records officers, Legal, the data owner or the Company Secretary, and each needs an approval." />`;
    if (disposed) return html`<${A.Alert} type="info" showIcon message="Disposed" title="Disposed" description="The content has been destroyed. This entry and its audit trail are kept as evidence of disposal." />`;
    var submit = function () {
      var kind = modal[0];
      if (kind === "hold") {
        patchRecord(rec.id, { status: "Disposal hold", hold: reason[0] || "Related matter still open", prevStatus: rec.status });
        APP.audit({ action: "Disposal hold placed", item: rec.id, detail: reason[0] || "Related matter still open", dataClass: rec.dataClass });
        APP.toast.success("Hold placed on " + rec.id + ". Disposal is blocked until the hold is released.");
      } else if (kind === "release") {
        patchRecord(rec.id, { status: due ? "Retention review due" : "Active", hold: null });
        APP.audit({ action: "Disposal hold released", item: rec.id, detail: "Approved by Head of Legal. " + (reason[0] || "Related matter closed"), dataClass: rec.dataClass });
        APP.toast.success("Hold released with approval from the Head of Legal.");
      } else if (kind === "extend") {
        var base = rec.retainUntil && fmt.daysUntil(rec.retainUntil) > 0 ? APP.dayjs(rec.retainUntil) : APP.now();
        var until = base.add(years[0], "year").format("YYYY-MM-DD");
        patchRecord(rec.id, { retainUntil: until, status: rec.status === "Disposal hold" ? rec.status : "Active" });
        APP.audit({ action: "Retention extended", item: rec.id, detail: "Kept until " + fmt.date(until) + ". " + (reason[0] || "Still needed"), dataClass: rec.dataClass });
        APP.toast.success("Retention extended to " + fmt.date(until) + ". Approval recorded.");
      }
      close();
    };
    var titles = { hold: "Place a disposal hold", release: "Release the disposal hold", extend: "Extend retention" };
    return html`<div>
      <${A.Flex} wrap gap=${8}>
        ${onHold ? html`<${A.Button} icon=${html`<${Icon} name="UnlockOutlined" />`} onClick=${function () { modal[1]("release"); }}>Release hold<//>`
          : html`<${A.Button} icon=${html`<${Icon} name="LockOutlined" />`} onClick=${function () { modal[1]("hold"); }}>Place hold<//>`}
        <${A.Button} icon=${html`<${Icon} name="FieldTimeOutlined" />`} onClick=${function () { modal[1]("extend"); }} disabled=${!rec.retainUntil}>Extend retention<//>
        ${onHold ? html`<${A.Tooltip} title="Blocked: the record is on disposal hold"><span><${A.Button} danger disabled=${true}>Approve disposal<//></span><//>`
          : !due ? html`<${A.Tooltip} title=${rec.retainUntil ? "Retention runs until " + fmt.date(rec.retainUntil) : "Kept permanently"}><span><${A.Button} danger disabled=${true}>Approve disposal<//></span><//>`
          : html`<${A.Popconfirm} title="Approve disposal?" description=${"The content of " + rec.id + " will be destroyed. The entry and audit trail are kept."} okText="Approve disposal" okButtonProps=${{ danger: true }}
              onConfirm=${function () {
                patchRecord(rec.id, { status: "Disposed" });
                APP.audit({ action: "Disposal approved", item: rec.id, detail: "Retention ended " + fmt.date(rec.retainUntil) + ". No hold in place", dataClass: rec.dataClass });
                APP.toast.success(rec.id + " approved for disposal. In the build, the file is destroyed overnight and a certificate is kept.");
              }}>
              <${A.Button} danger>Approve disposal<//>
            <//>`}
      <//>
      <${A.Modal} open=${!!modal[0]} title=${titles[modal[0]] || ""} onCancel=${close} onOk=${submit}
        okText=${modal[0] === "release" ? "Release with approval" : "Save"} destroyOnHidden=${true}>
        <${A.Flex} vertical gap=${12}>
          ${modal[0] === "extend" ? html`<div><div style=${{ marginBottom: 6 }}>Keep for a further</div>
            <${A.Segmented} value=${years[0]} onChange=${years[1]} options=${[{ value: 1, label: "1 year" }, { value: 3, label: "3 years" }, { value: 5, label: "5 years" }]} /></div>` : null}
          ${modal[0] === "release" ? html`<${A.Alert} type="warning" showIcon message="Releasing a hold needs approval" title="Releasing a hold needs approval"
            description="In the prototype the Head of Legal's approval is recorded straight away. In the build it goes to an approval step first." />` : null}
          <div><div style=${{ marginBottom: 6 }}>Reason (recorded in the audit log)</div>
            <${A.Input.TextArea} rows=${3} value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }}
              placeholder=${modal[0] === "hold" ? "For example: related dispute CASE-2025-022 is still open" : modal[0] === "release" ? "For example: the related case closed on 3 Nov 2026" : "For example: needed for an open audit"} /></div>
        <//>
      <//>
    </div>`;
  }

  function RecordDrawer(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var phase2On = s.ui.phaseMode === "both";
    var rec = props.id ? recordOf(s, props.id) : null;
    var tab = APP.useState(props.tab || "overview");
    var cmp = APP.useState(false);
    APP.useEffect(function () { tab[1](props.tab || "overview"); }, [props.id, props.tab, props.nonce]);
    if (!props.id) return null;
    var det = rec ? (RA.details[rec.id] || {}) : {};
    var readable = rec ? canRead(pid, rec.dataClass) : false;
    var rev = rec && rec.sourceReviewId ? reviewOf(s, rec.sourceReviewId) : null;
    var vers = rec ? recordVersions(rec, det, s) : [];
    var history = rec ? s.audit.filter(function (e) { return e.item === rec.id || (e.detail && String(e.detail).indexOf(rec.id) >= 0); }) : [];

    var ask = function () { if (props.onAsk) props.onAsk(rec); };
    var exportRec = function () {
      APP.audit({ action: "Export", item: rec.id, detail: "PDF, within permissions", dataClass: rec.dataClass });
      APP.toast.success("Export recorded in the audit log. In the build, the PDF downloads with a watermark naming you.");
    };

    var linked = rec ? (rec.linked || []).map(function (id) {
      var li = linkInfo(id);
      var locked = li.phase === 2 && !phase2On;
      var go = function () { if (li.route && !locked) APP.navigate(li.route, li.params); else if (locked) APP.toast.info("This matter is in a Phase 2 module. Switch to Phase 1 + 2 to open it."); else APP.toast.info("This contract ended before the migration. Only its records are kept."); };
      return html`<div key=${id} role="button" tabIndex=${0} onClick=${go} onKeyDown=${function (e) { if (e.key === "Enter") go(); }}
        style=${{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, cursor: "pointer" }}>
        <${Icon} name=${li.icon} style=${{ color: tok.colorPrimary }} />
        <div style=${{ flex: 1, minWidth: 0 }}><div className="mono">${li.label}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${li.sub}</div></div>
        ${li.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
        ${li.route && !locked ? html`<${Icon} name="RightOutlined" style=${{ color: tok.colorTextTertiary }} />` : null}
      </div>`;
    }) : [];

    var overview = rec ? html`<${A.Flex} vertical gap=${16}>
      ${rec.live && rev ? html`<${A.Alert} type="success" showIcon message=${"Confirmed by " + APP.personName(rev.decidedBy) + " and archived"} title=${"Confirmed by " + APP.personName(rev.decidedBy) + " and archived"}
        description=${html`<span>Archived from review <a onClick=${function () { APP.navigate("reviews", { id: rev.id }); }}>${rev.id}</a> on ${fmt.dateTime(rev.decidedAt)}. ${rev.comment ? "Reviewer's note: \"" + rev.comment + "\"" : ""}</span>`} />` : null}
      ${rec.status === "Disposal hold" ? html`<${A.Alert} type="warning" showIcon message="On disposal hold" title="On disposal hold" description=${rec.hold || "A related matter is still open."} />` : null}
      <div style=${{ color: tok.colorText, lineHeight: 1.6 }}>${det.summary || (rev && rev.content && rev.content.summary) || "Archived record."}</div>
      <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
        ["Record number", html`<span className="mono">${rec.id}</span>`], ["Category", rec.category],
        ["Department", rec.dept], ["Year", rec.year],
        ["Owner", rec.ownerName], ["Data class", html`<${APP.DataClassTag} cls=${rec.dataClass} />`],
        ["Version", rec.version], ["Format", rec.format + (rec.pages ? ", " + rec.pages + (rec.pages === 1 ? " page" : " pages") : "")],
        ["Retention", rec.retention], ["Status", html`<${APP.StatusTag} status=${rec.status} />`]
      ]} />
      <div>
        <div style=${{ fontWeight: 600, marginBottom: 8 }}>Linked matters <span style=${{ fontWeight: 400, fontSize: 12, color: tok.colorTextSecondary }}>one record, many matters, no duplicate uploads <${APP.SowRef} sec="3.6.1" /></span></div>
        ${linked.length ? html`<${A.Flex} vertical gap=${8}>${linked}<//>` : html`<${APP.EmptyHint} title="Not linked to a matter" description="Link it so it shows up on the contract, case or meeting." action=${html`<${A.Button} size="small" onClick=${function () { APP.toast.build("In the build, you search for a contract, case or meeting and link this record to it."); }}>Link a matter<//>`} />`}
      </div>
    <//>` : null;

    var content = !rec ? null : rev ? html`<div>
        <div style=${{ fontWeight: 600, marginBottom: 6 }}>${rev.title}</div>
        <div style=${{ marginBottom: 12 }}>${rev.content && rev.content.summary}</div>
        ${(rev.content && rev.content.sections || []).map(function (sec, i) {
          return html`<div key=${i} style=${{ padding: "10px 12px", border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, marginBottom: 8 }}>
            <div style=${{ fontWeight: 500 }}>${sec.heading}</div><div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>${sec.text}</div></div>`;
        })}
        ${(rev.citations || []).length ? html`<div style=${{ marginTop: 10 }}><span style=${{ fontSize: 12, color: tok.colorTextSecondary, marginRight: 6 }}>Sources</span>
          ${rev.citations.map(function (c, i) { return html`<${APP.CitationChip} key=${i} n=${i + 1} cite=${c} cites=${rev.citations} />`; })}</div>` : null}
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 12 }}>${"Model: " + (rev.modelName || "not recorded") + ". Confirmed by " + APP.personName(rev.decidedBy) + " on " + fmt.dateTime(rev.decidedAt) + "."}</div>
      </div>`
      : det.doc ? html`<${APP.DocViewer} doc=${det.doc} height=${520} />`
      : html`<div>
        <div style=${{ border: "1px solid var(--paper-border)", background: "var(--paper-bg)", borderRadius: 6, padding: 20, fontFamily: "Georgia, serif", lineHeight: 1.7 }}>
          <div style=${{ fontWeight: 600, marginBottom: 8 }}>${rec.title}</div>
          <div>${det.summary || "Archived record."}</div>
          <div style=${{ textAlign: "center", fontSize: 11, opacity: 0.55, marginTop: 16 }}>${"Page 1 of " + (rec.pages || 1)}</div>
        </div>
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>Only the first page summary is included in this sample.</div>
      </div>`;

    var versions = rec ? html`<div>
      <${A.Timeline} items=${vers.slice().reverse().map(function (v, i) {
        var c = html`<div><div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style=${{ fontWeight: 500 }}>${v.v}</span>${v.current ? html`<${A.Tag} color="green">Current<//>` : null}</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${fmt.dateTime(v.at) + " · " + v.by}</div>${v.note ? html`<div style=${{ fontSize: 13 }}>${v.note}</div>` : null}</div>`;
        return { key: String(i), color: v.current ? "green" : "gray", children: c, content: c };
      })} />
      ${rec.id === "REC-2024-0140" ? html`<${A.Button} icon=${html`<${Icon} name="DiffOutlined" />`} onClick=${function () { cmp[1](true); }}>Compare draft 3 with the signed original<//>` : null}
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 12 }}>Changes, replacements and deletions of archived material follow approval rules and keep the earlier versions <${APP.SowRef} sec="3.6.3" /></div>
      <${A.Modal} open=${cmp[0]} title="Draft 3 compared with the signed original" onCancel=${function () { cmp[1](false); }} footer=${html`<${A.Button} onClick=${function () { cmp[1](false); }}>Close<//>`} width=${720}>
        <div style=${{ fontWeight: 500, marginBottom: 6 }}>Clause 7.2 Liability</div>
        <${APP.Redline} before="The Contractor's total liability under this Agreement is capped at 100% of the contract price." after="The Contractor's total liability under this Agreement is capped at 10% of the contract price." showLegend=${true} />
        <div style=${{ fontWeight: 500, margin: "14px 0 6px" }}>Other clauses</div>
        <div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>No other wording changes. Signature page added.</div>
      <//>
    </div>` : null;

    var retention = rec ? html`<${A.Flex} vertical gap=${16}>
      <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
        ["Rule", rec.retention], ["Keep until", rec.retainUntil ? fmt.date(rec.retainUntil) : "Permanent"],
        ["Time left", rec.retainUntil ? html`<${APP.StatusTag} status=${fmt.daysUntil(rec.retainUntil) < 0 ? "Retention ended" : fmt.dueLabel(rec.retainUntil)} tone=${fmt.daysUntil(rec.retainUntil) < 0 ? "warning" : fmt.daysUntil(rec.retainUntil) < 90 ? "warning" : "default"} />` : "Not applicable"],
        ["Disposal hold", rec.status === "Disposal hold" ? rec.hold : "None"]
      ]} />
      <${RetentionActions} rec=${rec} />
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Review reminders arrive before expiry. Extensions and disposals record who approved them. Holds block disposal while a case or dispute is open <${APP.SowRef} sec="3.6.4" /></div>
    <//>` : null;

    var access = rec ? html`<div>
      <div className="table-scroll"><${A.Table} size="small" pagination=${false} dataSource=${accessRows(rec)} columns=${[
        { title: "Group", dataIndex: "group" },
        { title: "View", dataIndex: "view", render: function (v) { return html`<${Yes} v=${v} />`; } },
        { title: "Download", dataIndex: "download", render: function (v) { return html`<${Yes} v=${v} />`; } },
        { title: "Export", dataIndex: "exp", render: function (v) { return html`<${Yes} v=${v} />`; } },
        { title: "Manage", dataIndex: "manage", render: function (v) { return html`<${Yes} v=${v} />`; } }
      ]} /></div>
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>Set by department, matter, category and data class. The same rules apply in every module and in answers from the assistant <${APP.SowRef} sec="3.6.3" /></div>
      <${A.Button} style=${{ marginTop: 10 }} disabled=${pid === "auditor"} onClick=${function () { APP.toast.build("In the build, access changes go to the data owner for approval and are logged."); }}>Request a change<//>
    </div>` : null;

    var hist = rec ? html`<${A.Timeline} items=${history.map(function (e) {
        var c = html`<div><div style=${{ fontWeight: 500 }}>${e.action}${e.live ? html` <${A.Tag} color="blue" style=${{ marginLeft: 6 }}>This session<//>` : null}</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${fmt.dateTime(e.at) + " · " + APP.personName(e.actorId)}</div><div style=${{ fontSize: 13 }}>${e.detail}</div></div>`;
        return { key: e.id, color: "blue", children: c, content: c };
      }).concat(rec.live ? [] : [(function () {
        var c = html`<div><div style=${{ fontWeight: 500 }}>Migrated from LAMS</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>9 Nov 2026, 23:10 · System</div><div style=${{ fontSize: 13 }}>Original archiving date and keeper kept from the old system</div></div>`;
        return { key: "mig", color: "gray", children: c, content: c };
      })()])} />` : null;

    var restricted = rec && !readable ? html`<${A.Flex} vertical gap=${16}>
      <${A.Result} status="403" title=${metadataOnly(pid) ? "Content hidden for your role" : "You don't have access to this record"}
        subTitle=${metadataOnly(pid) ? APP.persona(pid).role + "s see record details, not business content." : (det.restrictedNote || "This record is " + rec.dataClass + ". Your access is up to " + maxClassFor(pid) + ".") + " Answers from the assistant never cite it for you."}
        extra=${metadataOnly(pid) ? null : html`<${A.Button} type="primary" onClick=${function () {
          APP.notify({ to: ["cosec"], kind: "info", title: "Access request: " + rec.id, body: APP.personName(pid) + " asks to view " + rec.title + ".", route: "records", params: { id: rec.id } });
          APP.audit({ action: "Access requested", item: rec.id, detail: "View, " + rec.dataClass, dataClass: rec.dataClass });
          APP.toast.success("Request sent to the record owner. You'll get a notification when it is decided.");
        }}>Request access<//>`} />
      <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Record number", rec.id], ["Category", rec.category], ["Department", rec.dept], ["Data class", html`<${APP.DataClassTag} cls=${rec.dataClass} />`], ["Retention", rec.retention], ["Status", html`<${APP.StatusTag} status=${rec.status} />`]]} />
    <//>` : null;

    var tabs = [
      { key: "overview", label: "Overview", children: overview },
      { key: "content", label: "Content", children: content },
      { key: "versions", label: "Versions", children: versions },
      { key: "retention", label: "Retention", children: retention },
      { key: "access", label: "Access", children: access },
      { key: "history", label: "History", children: hist }
    ];
    return html`<${APP.DetailDrawer} open=${!!props.id} onClose=${props.onClose} size=${720}
      title=${rec ? rec.title : "Record not found"} subtitle=${rec ? rec.id + " · " + rec.category + " · " + rec.dept : props.id}
      tags=${rec ? html`<${Fragment}><${APP.DataClassTag} cls=${rec.dataClass} /><${APP.StatusTag} status=${rec.status} />${rec.live ? html`<${A.Tag} color="blue">New<//>` : null}<//>` : null}
      actions=${rec && readable ? html`<${A.Flex} gap=${6} wrap>
        <${A.Button} size="small" icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${ask}>Ask about it<//>
        <${A.Button} size="small" icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${exportRec}>Export<//>
      <//>` : null}>
      ${!rec ? html`<${APP.EmptyHint} title="Record not found" description="It may have been disposed of or the link is old." />`
        : !readable ? restricted
        : html`<${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${tabs} />`}
    <//>`;
  }

  /* ------------------------------------------------------------------
     RECORDS: archive tab
     ------------------------------------------------------------------ */
  var FACETS = [
    { key: "category", label: "Category" }, { key: "dept", label: "Department" },
    { key: "year", label: "Year" }, { key: "status", label: "Status" }
  ];
  function FacetPanel(props) {
    var tok = A.theme.useToken().token;
    var sel = props.value, all = props.records;
    var countsFor = function (fkey) {
      var rows = all.filter(function (r) {
        return FACETS.every(function (f) { if (f.key === fkey) return true; var v = sel[f.key] || []; return !v.length || v.indexOf(String(r[f.key])) >= 0; });
      });
      var m = {};
      rows.forEach(function (r) { var k = String(r[fkey]); m[k] = (m[k] || 0) + 1; });
      return m;
    };
    return html`<${A.Flex} vertical gap=${14}>
      ${FACETS.map(function (f) {
        var counts = countsFor(f.key);
        var values = Array.from(new Set(all.map(function (r) { return String(r[f.key]); }))).sort(function (a, b) { return f.key === "year" ? b.localeCompare(a) : a.localeCompare(b); });
        var chosen = sel[f.key] || [];
        return html`<div key=${f.key}>
          <div style=${{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <span style=${{ fontWeight: 600, fontSize: 13, flex: 1 }}>${f.label}</span>
            ${chosen.length ? html`<a style=${{ fontSize: 12 }} onClick=${function () { var n = Object.assign({}, sel); n[f.key] = []; props.onChange(n); }}>Clear</a>` : null}
          </div>
          <${A.Flex} vertical gap=${2}>
            ${values.map(function (v) {
              var on = chosen.indexOf(v) >= 0;
              return html`<label key=${v} style=${{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", padding: "2px 0" }}>
                <${A.Checkbox} checked=${on} onChange=${function () {
                  var n = Object.assign({}, sel); n[f.key] = on ? chosen.filter(function (x) { return x !== v; }) : chosen.concat([v]); props.onChange(n);
                }} />
                <span style=${{ flex: 1 }}>${v}</span>
                <span style=${{ color: tok.colorTextTertiary, fontSize: 12 }}>${counts[v] || 0}</span>
              </label>`;
            })}
          <//>
        </div>`;
      })}
    <//>`;
  }

  function ArchiveTab(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var vp = APP.useViewport();
    var pid = s.ui.personaId;
    var facets = useSharedObj("records.facets", { category: [], dept: [], year: [], status: [] });
    var sel = facets[0];
    var rows = s.records.filter(function (r) {
      return FACETS.every(function (f) { var v = sel[f.key] || []; return !v.length || v.indexOf(String(r[f.key])) >= 0; });
    });
    var anyFacet = FACETS.some(function (f) { return (sel[f.key] || []).length; });
    var hidden = s.records.filter(function (r) { return !canRead(pid, r.dataClass); }).length;
    var columns = [
      { title: "Record", dataIndex: "id", key: "id", render: function (v, r) { return html`<span className="nowrap"><span className="mono">${v}</span>${r.live ? html` <${A.Tag} color="blue" style=${{ marginLeft: 4 }}>New<//>` : null}</span>`; } },
      { title: "Title", dataIndex: "title", key: "title", render: function (v, r) {
        var ok = canRead(pid, r.dataClass);
        return html`<span style=${{ display: "inline-flex", gap: 6, alignItems: "center", minWidth: 220 }}>${ok ? null : html`<${A.Tooltip} title="Above your access. Details only."><${Icon} name="LockOutlined" style=${{ color: tok.colorTextTertiary }} /><//>`}<span>${v}</span></span>`;
      } },
      APP.col.text("Category", "category"),
      APP.col.text("Department", "dept"),
      { title: "Year", dataIndex: "year", key: "year", sorter: function (a, b) { return a.year - b.year; } },
      { title: "Linked matters", dataIndex: "linked", key: "linked", render: function (v) {
        return html`<span className="nowrap">${(v || []).slice(0, 2).map(function (id) { var li = linkInfo(id); return html`<${A.Tag} key=${id} style=${{ marginInlineEnd: 4 }}>${id}${li.phase === 2 ? " (P2)" : ""}<//>`; })}${(v || []).length > 2 ? "+" + (v.length - 2) : ""}</span>`;
      } },
      { title: "Keep until", dataIndex: "retainUntil", key: "retainUntil", render: function (v) { return html`<span className="nowrap">${v ? fmt.date(v) : "Permanent"}</span>`; },
        sorter: function (a, b) { return String(a.retainUntil || "9999").localeCompare(String(b.retainUntil || "9999")); } },
      APP.col.dataClass("Data class", "dataClass"),
      APP.col.status("Status", "status")
    ];
    var facetPanel = html`<${FacetPanel} records=${s.records} value=${sel} onChange=${function (n) { facets[1](n); }} />`;
    return html`<${A.Row} gutter=${[16, 16]}>
      <${A.Col} xs=${24} lg=${6}>
        ${vp.isMobile ? html`<${A.Collapse} items=${[{ key: "f", label: "Filters" + (anyFacet ? " (on)" : ""), children: facetPanel }]} />`
          : html`<${A.Card} size="small" title="Filters" extra=${anyFacet ? html`<a onClick=${function () { facets[1]({ category: [], dept: [], year: [], status: [] }); }}>Clear all</a>` : null}>${facetPanel}<//>`}
      <//>
      <${A.Col} xs=${24} lg=${18}>
        <${A.Card} size="small">
          ${metadataOnly(pid) ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message="You see record details only" title="You see record details only"
            description=${APP.persona(pid).role + "s can search the register and its audit trail, but not open business content."} />` : null}
          <${APP.DataTable} columns=${columns} data=${rows} pageSize=${10}
            searchKeys=${["id", "title", "category", "dept", "ownerName", function (r) { return (r.linked || []).join(" "); }]}
            searchPlaceholder="Search by title, number, party or matter"
            onRowClick=${function (r) { props.onOpen(r.id); }}
            emptyTitle="No records match" emptyText="Clear a filter or try another search."
            toolbar=${hidden && !metadataOnly(pid) ? html`<${A.Tooltip} title="Shown with a lock. You see the details but not the content."><span style=${{ fontSize: 12, color: tok.colorTextSecondary }}><${Icon} name="LockOutlined" /> ${hidden + " above your access"}</span><//>` : null} />
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>A sample of the archive. Contracts, due diligence, cases, opinions, policies, compliance checks, remediation and board material in one place <${APP.SowRef} sec="3.6.1" /></div>
        <//>
      <//>
    <//>`;
  }

  /* ------------------------------------------------------------------
     RECORDS: ask the archive
     ------------------------------------------------------------------ */
  function matchScript(text) {
    var t = String(text || "").toLowerCase();
    for (var i = 0; i < RA.askScripts.length; i++) {
      var sc = RA.askScripts[i];
      if (sc.q.toLowerCase() === t) return sc;
    }
    for (var j = 0; j < RA.askScripts.length; j++) {
      var k = RA.askScripts[j].keys;
      for (var x = 0; x < k.length; x++) if (t.indexOf(k[x]) >= 0) return RA.askScripts[j];
    }
    return null;
  }
  function scriptById(id) { for (var i = 0; i < RA.askScripts.length; i++) if (RA.askScripts[i].id === id) return RA.askScripts[i]; return null; }
  var SUGGESTED = RA.askScripts.map(function (s) { return s.q; });

  function AnswerItem(props) {
    var tok = A.theme.useToken().token;
    var it = props.item;
    var s = APP.useStore();
    var sc = it.scriptId ? scriptById(it.scriptId) : null;
    var rev = it.reviewId ? reviewOf(s, it.reviewId) : null;
    var setItem = props.setItem;
    if (!sc) {
      return html`<${APP.ChatMessage} role="assistant" author="Records assistant" time=${fmt.time(it.at)}>
        <div>I couldn't match that to records in this sample. In the build, I search every record you can see, in English, Chinese or Sinhala. Try one of these:</div>
        <${A.Flex} wrap gap=${6} style=${{ marginTop: 10 }}>${SUGGESTED.slice(0, 4).map(function (q, i) { return html`<${A.Button} key=${i} size="small" onClick=${function () { props.onAsk(q); }}>${q}<//>`; })}<//>
      <//>`;
    }
    var trace = [
      { label: sc.searched + " related records found among those you can see", detail: "Full text and meaning, in English, Chinese and Sinhala, with BGE-M3 inside the CICT VPC.", status: "done" },
      sc.excluded ? { label: sc.excluded + " record above your access left out", detail: "It is not read, quoted or cited for you.", status: "warn" } : null,
      { label: "Classified as " + sc.dataClass, detail: "Contract and claim records carry prices and names.", status: "done" },
      { label: "Routed to Qwen (self-hosted)", detail: "Self-hosted model inside the CICT VPC, so no masking or release was needed.", status: "done" },
      { label: sc.passages + (sc.passages === 1 ? " passage" : " passages") + " retrieved", detail: sc.cites.map(APP.citeLabel).join("; "), status: "done" },
      { label: sc.thin ? "Not enough evidence" : "Dates and amounts checked by rule", detail: sc.thin ? "A schedule the answer depends on is missing." : "Notice periods and dates are recalculated by rule, not by the model.", status: sc.thin ? "warn" : "done" }
    ].filter(Boolean);
    var footer = it.done ? html`<${A.Flex} vertical gap=${8}>
      ${sc.thin ? html`<${A.Alert} type="warning" showIcon message="Evidence is thin" title="Evidence is thin" description="The answer depends on material that isn't in the archive. It says so rather than guessing." />` : null}
      ${sc.note ? html`<${A.Alert} type=${sc.note.type} showIcon message=${sc.note.text} title=${sc.note.text} />` : null}
      <${APP.AnswerTrace} steps=${trace} />
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12, color: tok.colorTextSecondary }}>
        <span>Records used:</span>${sc.records.map(function (id) { return html`<${A.Tag} key=${id} style=${{ cursor: "pointer" }} onClick=${function () { props.onOpenRecord(id); }}><span className="mono">${id}</span><//>`; })}
      </div>
      ${rev ? html`<div style=${{ fontSize: 13 }}><${APP.StatusTag} status=${rev.status === "Pending" ? "In review" : rev.status} /> ${rev.status === "Pending" ? " With " + APP.personName(rev.reviewerId) + " for review (" + rev.id + ")." : rev.status === "Confirmed" ? " Confirmed by " + APP.personName(rev.decidedBy) + (rev.recordId ? ", archived as " + rev.recordId + "." : ".") : " Returned by " + APP.personName(rev.decidedBy) + ": " + (rev.comment || "see comments.")}
        ${rev.recordId ? html` <a onClick=${function () { props.onOpenRecord(rev.recordId); }}>Open record</a>` : null}</div>` : null}
    <//>` : null;
    var actions = it.done ? html`<${Fragment}>
      <${A.Tooltip} title="Helpful"><${A.Button} size="small" type=${it.fb === "up" ? "primary" : "text"} icon=${html`<${Icon} name="LikeOutlined" />`} aria-label="Helpful"
        onClick=${function () { setItem(it.id, { fb: it.fb === "up" ? null : "up" }); APP.toast.success("Thanks. Feedback goes to the evaluation set the team reviews each month."); }} /><//>
      <${A.Tooltip} title="Not helpful"><${A.Button} size="small" type=${it.fb === "down" ? "primary" : "text"} icon=${html`<${Icon} name="DislikeOutlined" />`} aria-label="Not helpful"
        onClick=${function () { setItem(it.id, { fb: it.fb === "down" ? null : "down" }); APP.toast.info("Recorded. In the build, you can say what was wrong and it is reviewed."); }} /><//>
      <${A.Tooltip} title="Copy"><${A.Button} size="small" type="text" icon=${html`<${Icon} name="CopyOutlined" />`} aria-label="Copy"
        onClick=${function () { try { navigator.clipboard.writeText(plain(sc.a)); } catch (e) { /* ignore */ } APP.toast.success("Answer copied with its source list."); }} /><//>
      ${!rev ? html`<${A.Button} size="small" icon=${html`<${Icon} name="FileDoneOutlined" />`} onClick=${function () {
        var r = APP.createReview({ title: "Records answer: " + sc.q.replace(/\?$/, ""), kind: "Records answer", archiveCategory: "Records answer", ref: sc.records[0], dataClass: sc.dataClass,
          modelName: "Qwen (self-hosted)", phase: 1, source: { route: "records", params: { tab: "ask" } },
          content: { summary: plain(sc.a), sections: [{ heading: "Question", text: sc.q }] }, citations: sc.cites });
        setItem(it.id, { reviewId: r.id });
        APP.toast.success("Sent to " + APP.personName(r.reviewerId) + " for review.");
      }}>Send for review<//>` : null}
    <//>` : null;
    return html`<${APP.ChatMessage} role="assistant" author="Records assistant" time=${fmt.time(it.at)}
      badges=${html`<${Fragment}><${APP.DataClassTag} cls=${sc.dataClass} /><${APP.ModelTag} id="m-qwen-sh" /><${A.Tag} style=${{ marginInlineEnd: 0 }}>Draft<//><//>`}
      footer=${footer} actions=${actions}>
      ${it.done ? html`<${APP.CitedText} text=${sc.a} cites=${sc.cites} />`
        : it.started ? html`<${APP.StreamingText} text=${sc.a} cites=${sc.cites} controlRef=${props.controlRef}
            onDone=${function () { setItem(it.id, { done: true }); props.onDone(); }} />`
        : html`<${APP.TypingIndicator} label="Searching the records you can see" />`}
    <//>`;
  }

  function AskTab(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var vp = APP.useViewport();
    var pid = s.ui.personaId;
    var thread = useSharedObj("records.ask", { items: [], seq: 1 });
    var draft = APP.useState(props.prefill || "");
    var streaming = APP.useState(false);
    var ctrl = APP.useRef(null);
    var timer = APP.useRef(null);
    var items = (thread[0].items || []).filter(function (it) { return it.personaId === pid; });
    APP.useEffect(function () { if (props.prefill) draft[1](props.prefill); }, [props.prefill, props.prefillAt]);
    APP.useEffect(function () { return function () { clearTimeout(timer.current); }; }, []);
    /* Resume or finish any answer left mid-stream when the user navigated away */
    APP.useEffect(function () {
      var stale = (thread[0].items || []).filter(function (it) { return !it.done && it.role === "assistant"; });
      if (stale.length && !streaming[0]) thread[1](function (p) { return Object.assign({}, p, { items: p.items.map(function (x) { return x.role === "assistant" && !x.done ? Object.assign({}, x, { started: true, done: true }) : x; }) }); });
    }, []);
    var setItem = function (id, patch) { thread[1](function (p) { return Object.assign({}, p, { items: p.items.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }) }); }); };
    var ask = function (text) {
      var q = String(text || "").trim();
      if (!q || streaming[0]) return;
      var sc = matchScript(q);
      var seq = thread[0].seq || 1;
      var uid = "q" + seq, aid = "a" + seq;
      thread[1](function (p) { return { seq: seq + 1, items: (p.items || []).concat([
        { id: uid, role: "user", text: q, at: APP.nowIso(), personaId: pid },
        { id: aid, role: "assistant", scriptId: sc ? sc.id : null, at: APP.nowIso(), personaId: pid, started: !sc, done: !sc }
      ]) }; });
      draft[1]("");
      APP.audit({ action: "Records question", item: "Records Q&A", detail: sc ? "Self-hosted model, " + sc.passages + " passages" : "No matching records", dataClass: sc ? sc.dataClass : "Internal" });
      if (sc) {
        streaming[1](true);
        timer.current = setTimeout(function () { setItem(aid, { started: true }); }, 1100);
      }
    };
    if (metadataOnly(pid)) {
      return html`<${A.Card}><${A.Result} status="403" title="Questions about business content aren't available for your role"
        subTitle=${APP.persona(pid).role + "s manage the platform and its audit trail but do not read records. Switch to N. Perera to try it."}
        extra=${html`<${A.Button} type="primary" onClick=${function () { APP.setPersona("legal"); APP.toast.info("You are now N. Perera, Legal officer."); }}>Switch to N. Perera<//>`} /><//>`;
    }
    var visible = s.records.filter(function (r) { return canRead(pid, r.dataClass); }).length;
    var last = items.length ? items[items.length - 1] : null;
    var lastSc = last && last.scriptId ? scriptById(last.scriptId) : null;
    var followUps = SUGGESTED.filter(function (q) { return !items.some(function (it) { return it.text === q; }); }).slice(0, 3);
    var threadEl = html`<${APP.ChatThread} height=${vp.isMobile ? 460 : "calc(100vh - var(--shell-top) - 400px)"} style=${{ minHeight: 360 }}
      empty=${html`<div style=${{ margin: "auto", textAlign: "center", maxWidth: 460, padding: 16 }}>
        <${Icon} name="DatabaseOutlined" style=${{ fontSize: 32, color: tok.colorPrimary }} />
        <div style=${{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>Ask the archive</div>
        <div style=${{ color: tok.colorTextSecondary, marginTop: 4 }}>${"Answers come only from the " + visible + " records you can see, with the file, version and page for every statement."}</div>
        <${A.Flex} vertical gap=${6} style=${{ marginTop: 14 }}>${SUGGESTED.map(function (q, i) { return html`<${A.Button} key=${i} onClick=${function () { ask(q); }} style=${{ whiteSpace: "normal", height: "auto", padding: "6px 12px", textAlign: "left" }}>${q}<//>`; })}<//>
      </div>`}>
      ${items.map(function (it) {
        if (it.role === "user") return html`<${APP.ChatMessage} key=${it.id} role="user" personaId=${it.personaId} time=${fmt.time(it.at)}>${it.text}<//>`;
        return html`<${AnswerItem} key=${it.id} item=${it} setItem=${setItem} controlRef=${ctrl} onAsk=${ask} onOpenRecord=${props.onOpenRecord}
          onDone=${function () { streaming[1](false); }} />`;
      })}
    <//>`;
    return html`<${A.Row} gutter=${[16, 16]}>
      <${A.Col} xs=${24} xl=${17}>
        <${A.Card} size="small" title=${html`<span><${Icon} name="MessageOutlined" /> Ask the archive</span>`}
          extra=${items.length ? html`<${A.Button} size="small" type="text" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () {
            thread[1](function (p) { return Object.assign({}, p, { items: (p.items || []).filter(function (x) { return x.personaId !== pid; }) }); }); streaming[1](false);
          }}>New question<//>` : null}>
          ${threadEl}
          <div style=${{ marginTop: 10 }}>
            <${APP.Composer} value=${draft[0]} onChange=${draft[1]} onSend=${function (t) { ask(t); }} streaming=${streaming[0]}
              onStop=${function () { if (ctrl.current) ctrl.current.stop(); streaming[1](false); var a = items[items.length - 1]; if (a) setItem(a.id, { done: true }); }}
              placeholder="Ask about any record you can see" suggestions=${items.length && !streaming[0] && lastSc ? followUps : null} onSuggestion=${ask}
              onAttach=${function () { APP.toast.build("In the build, you can add a file and ask about it alongside the archive. It is classified and checked first."); }}
              footerNote="Answers are drafts until a specialist reviewer confirms them. Sample data only." />
          </div>
        <//>
      <//>
      <${A.Col} xs=${24} xl=${7}>
        <${A.Card} size="small" title="Search scope" style=${{ marginBottom: 16 }}>
          <${A.Flex} vertical gap=${10}>
            <div style=${{ display: "flex", justifyContent: "space-between" }}><span>Records you can see</span><b>${visible}</b></div>
            <div style=${{ display: "flex", justifyContent: "space-between" }}><span>Above your access</span><b>${s.records.length - visible}</b></div>
            <div style=${{ display: "flex", justifyContent: "space-between" }}><span>Your access</span><${APP.DataClassTag} cls=${maxClassFor(pid)} label=${"Up to " + maxClassFor(pid)} /></div>
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Records above your access are never read, quoted or cited for you <${APP.SowRef} sec="3.6.2" /></div>
          <//>
        <//>
        <${A.Card} size="small" title="How it answers">
          <${A.Flex} vertical gap=${8} style=${{ fontSize: 13 }}>
            <span><${Icon} name="CloudServerOutlined" /> Records questions run on the self-hosted model inside the CICT VPC.</span>
            <span><${Icon} name="BookOutlined" /> Every statement names the file, version and page.</span>
            <span><${Icon} name="WarningOutlined" /> It says when evidence is missing or two versions apply <${APP.SowRef} sec="2.2.7" /></span>
            <span><${Icon} name="FileDoneOutlined" /> Answers stay drafts until a reviewer confirms them.</span>
          <//>
        <//>
      <//>
    <//>`;
  }

  /* ------------------------------------------------------------------
     RECORDS: retention tab
     ------------------------------------------------------------------ */
  function RetentionTab(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var rules = useSharedObj("records.rules", { list: RA.retentionRules });
    var ruleOpen = APP.useState(null);
    var years = APP.useState(10);
    var reason = APP.useState("");
    var due = s.records.filter(function (r) {
      if (r.status === "Disposed") return false;
      if (r.status === "Disposal hold" || r.status === "Retention review due") return true;
      return r.retainUntil && fmt.daysUntil(r.retainUntil) <= 90;
    }).sort(function (a, b) { return String(a.retainUntil).localeCompare(String(b.retainUntil)); });
    var holds = s.records.filter(function (r) { return r.status === "Disposal hold"; });
    var rule = ruleOpen[0] ? rules[0].list.filter(function (r) { return r.id === ruleOpen[0]; })[0] : null;
    var canEdit = RETENTION_ROLES.indexOf(pid) >= 0;
    return html`<${A.Flex} vertical gap=${16}>
      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Reviews due in 90 days" value=${due.filter(function (r) { return r.status !== "Disposal hold"; }).length} icon="FieldTimeOutlined" color=${due.length ? "colorWarning" : null} /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="On disposal hold" value=${holds.length} icon="LockOutlined" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Retention rules" value=${rules[0].list.length} icon="OrderedListOutlined" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Disposed this year" value=${2 + s.records.filter(function (r) { return r.status === "Disposed"; }).length} icon="DeleteOutlined" note="With approval certificates" /><//>
      <//>
      <${A.Card} size="small" title="Reviews and holds" extra=${html`<${APP.SowRef} sec="3.6.4" />`}>
        <${APP.DataTable} data=${due} pageSize=${6} searchPlaceholder="Search records"
          filters=${[{ key: "status", label: "Status" }]}
          onRowClick=${function (r) { props.onOpen(r.id, "retention"); }}
          columns=${[
            APP.col.id("Record", "id"),
            { title: "Title", dataIndex: "title", key: "title" },
            { title: "Keep until", dataIndex: "retainUntil", key: "retainUntil", render: function (v) {
              if (!v) return "Permanent";
              var n = fmt.daysUntil(v);
              return html`<span className="nowrap">${fmt.date(v)} <span style=${{ fontSize: 12, color: n < 0 ? tok.colorError : tok.colorWarning }}>${n < 0 ? "(ended " + (-n) + " days ago)" : "(" + fmt.dueLabel(v) + ")"}</span></span>`;
            } },
            { title: "Hold", dataIndex: "hold", key: "hold", render: function (v) { return v || html`<span style=${{ color: tok.colorTextTertiary }}>None</span>`; } },
            APP.col.status("Status", "status"),
            { title: "", key: "act", render: function (_, r) { return html`<${A.Button} size="small" onClick=${function (e) { e.stopPropagation(); props.onOpen(r.id, "retention"); }}>Review<//>`; } }
          ]} />
      <//>
      <${A.Card} size="small" title="Retention schedule" extra=${html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Set by records officers with Legal</span>`}>
        <${APP.DataTable} data=${rules[0].list} pageSize=${10} search=${false}
          onRowClick=${function (r) { ruleOpen[1](r.id); years[1](parseInt(r.period, 10) || 10); reason[1](""); }}
          columns=${[
            APP.col.text("Category", "category"),
            APP.col.text("Keep for", "period"),
            APP.col.text("Counted from", "trigger"),
            APP.col.text("At the end", "end"),
            APP.col.text("Approver", "approver"),
            { title: "Records", dataIndex: "records", key: "records", align: "right", render: function (v) { return fmt.number(v); } }
          ]} />
      <//>
      <${APP.DetailDrawer} open=${!!rule} onClose=${function () { ruleOpen[1](null); }} title=${rule ? "Retention rule: " + rule.category : ""} subtitle=${rule ? rule.id : ""} size=${520}>
        ${rule ? html`<${A.Flex} vertical gap=${16}>
          <${APP.KeyFacts} column=${1} items=${[["Keep for", rule.period], ["Counted from", rule.trigger], ["At the end", rule.end], ["Approver", rule.approver], ["Records under this rule", fmt.number(rule.records)]]} />
          ${rule.period === "Permanent" ? html`<${A.Alert} type="info" showIcon message="Kept permanently" title="Kept permanently" description="Board material is never disposed of." />` : html`<div>
            <div style=${{ fontWeight: 600, marginBottom: 6 }}>Change the period</div>
            <${A.Flex} gap=${8} align="center" wrap>
              <${A.InputNumber} min=${1} max=${50} value=${years[0]} onChange=${function (v) { years[1](v || 1); }} disabled=${!canEdit} aria-label="Years" />
              <span>years</span>
            <//>
            <${A.Input.TextArea} rows=${2} style=${{ marginTop: 8 }} placeholder="Reason, for example a new records policy" value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }} disabled=${!canEdit} />
            <${A.Button} type="primary" style=${{ marginTop: 8 }} disabled=${!canEdit || String(years[0]) + " years" === rule.period} onClick=${function () {
              var np = years[0] + (years[0] === 1 ? " year" : " years");
              rules[1](function (p) { return { list: p.list.map(function (x) { return x.id === rule.id ? Object.assign({}, x, { period: np }) : x; }) }; });
              APP.audit({ action: "Retention rule changed", item: rule.id, detail: rule.category + ": " + rule.period + " to " + np + (reason[0] ? ". " + reason[0] : ""), dataClass: null });
              APP.toast.success("Rule changed and logged. New records follow it; existing records keep their dates until reviewed.");
            }}>Save change<//>
            ${canEdit ? null : html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 6 }}>Read only for your role.</div>`}
          </div>`}
        <//>` : null}
      <//>
    <//>`;
  }

  /* ------------------------------------------------------------------
     RECORDS: bulk import wizard
     ------------------------------------------------------------------ */
  function seedImports() {
    var batches = {};
    RA.importBatches.forEach(function (b) {
      batches[b.id] = Object.assign({}, b, { step: 3, done: true,
        failedRows: b.id === "IMP-0007" ? RA.imp7Failed.map(function (f) { return Object.assign({ state: "Failed" }, f); }) : (b.failed ? [{ id: "F-01", file: "Register_2019_scan.pdf", reason: "Scan unreadable", fix: "Rescan at 300 dpi", state: "Failed" }] : []),
        dupRows: b.id === "IMP-0007" ? RA.imp7Duplicates : RA.imp7Duplicates.slice(0, b.duplicates),
        mapping: RA.importFields.map(function (f) { return f.target; }), classes: RA.importClasses.map(function (c) { return c.suggested; }) });
    });
    return { batches: batches, order: RA.importBatches.map(function (b) { return b.id; }), selected: "IMP-0007", seq: 8 };
  }
  var RUN_STAGES = ["Reading files", "Running OCR on scans", "Checking for sensitive data", "Finding duplicates", "Indexing for search"];

  function ImportTab(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var imp = useSharedObj("records.import", null);
    var state = imp[0] || seedImports();
    var setState = function (fn) { imp[1](function (p) { return fn(p || seedImports()); }); };
    var b = state.batches[state.selected];
    var view = APP.useState(null);
    var progress = APP.useState(0);
    var resTab = APP.useState("failed");
    var selRows = APP.useState([]);
    var timer = APP.useRef(null);
    APP.useEffect(function () { view[1](null); selRows[1]([]); }, [state.selected]);
    APP.useEffect(function () { if (props.startNew) newImport(); }, [props.startNew]);
    var updB = function (patch) { setState(function (p) { var n = Object.assign({}, p, { batches: Object.assign({}, p.batches) }); n.batches[p.selected] = Object.assign({}, p.batches[p.selected], typeof patch === "function" ? patch(p.batches[p.selected]) : patch); return n; }); };
    function newImport() {
      setState(function (p) {
        if (p.order.some(function (id) { return p.batches[id].status === "Draft"; })) {
          var d = p.order.filter(function (id) { return p.batches[id].status === "Draft"; })[0];
          return Object.assign({}, p, { selected: d });
        }
        var id = "IMP-" + String(p.seq).padStart(4, "0");
        var nb = { id: id, name: "New import", source: "", files: 0, size: "", startedAt: null, finishedAt: null, by: pid, imported: 0, failed: 0, duplicates: 0, status: "Draft", step: 0, done: false,
          failedRows: [], dupRows: [], mapping: RA.importFields.map(function (f) { return f.target; }), classes: RA.importClasses.map(function (c) { return c.suggested; }), upload: null };
        var batches = Object.assign({}, p.batches); batches[id] = nb;
        return { batches: batches, order: [id].concat(p.order), selected: id, seq: p.seq + 1 };
      });
    }
    var runImport = function () {
      updB({ status: "Running", step: 3, startedAt: APP.nowIso() });
      progress[1](0);
      var pct = 0;
      clearInterval(timer.current);
      timer.current = setInterval(function () {
        pct += 7;
        progress[1](Math.min(100, pct));
        if (pct >= 100) {
          clearInterval(timer.current);
          setState(function (p) {
            var cur = p.batches[p.selected];
            var files = cur.files || 218;
            var failed = Math.max(1, Math.round(files * 0.012)), dup = Math.max(1, Math.round(files * 0.02));
            var n = Object.assign({}, p, { batches: Object.assign({}, p.batches) });
            n.batches[p.selected] = Object.assign({}, cur, { status: "Needs fixing", done: true, finishedAt: APP.nowIso(), imported: files - failed - dup, failed: failed, duplicates: dup,
              failedRows: RA.imp7Failed.slice(0, failed).map(function (f, i) { return Object.assign({}, f, { id: "N-" + i, file: f.file.replace(/20\d\d/, "2022"), state: "Failed" }); }),
              dupRows: RA.imp7Duplicates.slice(0, dup) });
            return n;
          });
          APP.audit({ action: "Import finished", item: b.id, detail: (b.files - Math.max(1, Math.round(b.files * 0.012)) - Math.max(1, Math.round(b.files * 0.02))) + " imported, " + Math.max(1, Math.round(b.files * 0.012)) + " failed, " + Math.max(1, Math.round(b.files * 0.02)) + " duplicates", dataClass: "Internal", actorId: "system" });
          APP.notify({ to: [pid], kind: "info", title: "Records import " + b.id + " finished", body: "Some files need fixing. Open the results to fix and retry.", route: "records", params: { tab: "import" } });
        }
      }, 260);
    };
    APP.useEffect(function () { return function () { clearInterval(timer.current); }; }, []);
    APP.useEffect(function () {
      if (b && b.status === "Running" && !timer.current) updB({ status: "Draft", step: 2 });
    }, []);

    if (!b) return null;
    var step = view[0] !== null ? view[0] : b.step;
    var readOnly = b.done || b.status === "Running";
    var stepsEl = html`<${A.Steps} size="small" current=${step} onChange=${function (i) { if (b.done || i <= b.step) view[1](i); }}
      items=${[
        { title: "Upload", description: b.upload ? b.upload.name : b.source ? b.files.toLocaleString("en-US") + " files" : "Choose files" },
        { title: "Map fields", description: "Columns to record fields" },
        { title: "Classify", description: "Data class by category" },
        { title: "Results", description: b.done ? fmt.number(b.imported) + " imported" : b.status === "Running" ? "Running" : "Not started" }
      ].map(function (it, i) { return Object.assign({}, it, { disabled: !(b.done || i <= b.step) }); })} />`;

    var body;
    if (step === 0) {
      var chosen = b.upload ? b.upload.key : null;
      body = html`<${A.Flex} vertical gap=${14}>
        ${b.done ? html`<${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[["Source", b.source], ["Files", fmt.number(b.files)], ["Size", b.size], ["Started", fmt.dateTime(b.startedAt) + " by " + APP.personName(b.by)]]} />` : html`<${Fragment}>
          <${A.Upload.Dragger} multiple=${true} showUploadList=${false} beforeUpload=${function (file) {
            updB({ upload: { key: "own", name: file.name, files: 1, size: Math.max(1, Math.round(file.size / 1024)) + " KB" }, name: file.name, files: 1, source: "Your upload", size: Math.max(1, Math.round(file.size / 1024)) + " KB" });
            APP.toast.info("File noted. In the build it uploads to a quarantine area and is scanned before anything else.");
            return false;
          }}>
            <p style=${{ fontSize: 28, margin: 0, color: tok.colorPrimary }}><${Icon} name="InboxOutlined" /></p>
            <p style=${{ margin: "4px 0" }}>Drop a folder, zip file or LAMS export here</p>
            <p style=${{ fontSize: 12, color: tok.colorTextSecondary, margin: 0 }}>PDF, Word, Excel, images and CSV. Nothing leaves the CICT VPC during import.</p>
          <//>
          <div style=${{ fontWeight: 600 }}>Or pick a sample batch</div>
          <${A.Row} gutter=${[12, 12]}>${RA.sampleUploads.map(function (u) {
            var on = chosen === u.key;
            return html`<${A.Col} key=${u.key} xs=${24} md=${8}>
              <div role="button" tabIndex=${0} onClick=${function () { updB({ upload: u, name: u.name.replace(/\.(zip|csv)$/, ""), files: u.files, size: u.size, source: u.name }); }}
                onKeyDown=${function (e) { if (e.key === "Enter") updB({ upload: u, name: u.name.replace(/\.(zip|csv)$/, ""), files: u.files, size: u.size, source: u.name }); }}
                style=${{ border: "1px solid " + (on ? tok.colorPrimary : tok.colorBorderSecondary), background: on ? tok.colorPrimaryBg : "transparent", borderRadius: 8, padding: 12, cursor: "pointer", height: "100%" }}>
                <${APP.FileChip} name=${u.name} meta=${u.meta} />
              </div>
            <//>`;
          })}<//>
          <div><${A.Button} type="primary" disabled=${!b.upload} onClick=${function () { updB({ step: 1 }); view[1](null); }}>Next: map fields<//></div>
        <//>`}
      <//>`;
    } else if (step === 1) {
      body = html`<${A.Flex} vertical gap=${12}>
        <${A.Alert} type="success" showIcon message=${(b.mapping.filter(Boolean).length) + " of " + RA.importFields.length + " columns mapped"} title=${(b.mapping.filter(Boolean).length) + " of " + RA.importFields.length + " columns mapped"}
          description="Dates read as day/month/year. Unmapped columns are kept in the import log only." />
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="source" dataSource=${RA.importFields.map(function (f, i) { return Object.assign({ idx: i }, f); })} columns=${[
          { title: "Column in the file", dataIndex: "source", render: function (v) { return html`<b>${v}</b>`; } },
          { title: "Sample value", dataIndex: "sample", render: function (v) { return html`<span className="mono">${v}</span>`; } },
          { title: "Record field", key: "target", render: function (_, f) {
            return html`<${A.Select} size="small" style=${{ width: 170 }} value=${b.mapping[f.idx] || "none"} disabled=${readOnly}
              options=${[{ value: "none", label: "Do not import" }].concat(RA.targetFields.map(function (t) { return { value: t, label: t }; }))}
              onChange=${function (v) { updB(function (cur) { var m = cur.mapping.slice(); m[f.idx] = v === "none" ? null : v; return { mapping: m }; }); }} />`;
          } },
          { title: "Check", key: "check", render: function (_, f) { var m = b.mapping[f.idx]; return m ? html`<${APP.StatusTag} status="Passed" />` : html`<${APP.StatusTag} status="Not imported" tone="default" />`; } },
          { title: "Note", dataIndex: "note", render: function (v) { return html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${v || ""}</span>`; } }
        ]} /></div>
        <${A.Flex} gap=${8} wrap>
          <${A.Button} icon=${html`<${Icon} name="FileExcelOutlined" />`} onClick=${function () { APP.toast.build("In the build, you download an Excel field template with the validation rules for each column."); }}>Field template<//>
          ${readOnly ? null : html`<${A.Button} type="primary" onClick=${function () { updB({ step: 2 }); view[1](null); }}>Next: classify<//>`}
        <//>
      <//>`;
    } else if (step === 2) {
      body = html`<${A.Flex} vertical gap=${12}>
        <${A.Alert} type="info" showIcon message="Classes are suggested by category and by what the detector finds" title="Classes are suggested by category and by what the detector finds"
          description="Sensitive and Confidential classes are confirmed by the data owner or Company Secretary before content is searchable. OCR and detection run inside the CICT VPC; nothing goes to a model during import." />
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="category" dataSource=${RA.importClasses.map(function (c, i) { return Object.assign({ idx: i }, c); })} columns=${[
          APP.col.text("Category", "category"),
          { title: "Files", dataIndex: "count", align: "right", render: function (v) { return b.done || b.id === "IMP-0007" ? fmt.number(v) : fmt.number(Math.max(1, Math.round(v * (b.files || 218) / 1247))); } },
          { title: "Data class", key: "cls", render: function (_, c) {
            return html`<${A.Select} size="small" style=${{ width: 140 }} value=${b.classes[c.idx]} disabled=${readOnly}
              options=${["Public", "Internal", "Sensitive", "Confidential"].map(function (x) { return { value: x, label: x }; })}
              onChange=${function (v) { updB(function (cur) { var m = cur.classes.slice(); m[c.idx] = v; return { classes: m }; }); }} />`;
          } },
          { title: "Why", dataIndex: "reason", render: function (v, c) { return html`<span style=${{ fontSize: 12 }}>${v}${b.classes[c.idx] !== c.suggested ? html`<span style=${{ color: tok.colorWarning }}> · changed from ${c.suggested}</span>` : null}</span>`; } },
          { title: "Confirmed by", dataIndex: "confirmBy", render: function (v) { return v ? html`<${APP.PersonTag} id=${v} />` : html`<span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>Not needed</span>`; } }
        ]} /></div>
        ${readOnly ? null : html`<div><${A.Button} type="primary" icon=${html`<${Icon} name="CloudUploadOutlined" />`} onClick=${runImport}>Start import<//></div>`}
      <//>`;
    } else {
      var fixed = b.failedRows.filter(function (r) { return r.state === "Fixed"; });
      var stillFailed = b.failedRows.filter(function (r) { return r.state !== "Imported"; });
      body = b.status === "Running" ? html`<div style=${{ padding: "24px 0", maxWidth: 560 }}>
          <div style=${{ fontWeight: 600, marginBottom: 8 }}>${"Importing " + fmt.number(b.files) + " files"}</div>
          <${A.Progress} percent=${progress[0]} status="active" />
          <div style=${{ fontSize: 13, color: tok.colorTextSecondary, marginTop: 6 }}>${RUN_STAGES[Math.min(RUN_STAGES.length - 1, Math.floor(progress[0] / 21))]}...</div>
        </div>`
        : html`<${A.Flex} vertical gap=${14}>
        <${A.Row} gutter=${[12, 12]}>
          <${A.Col} xs=${24} sm=${8}><${Stat} title="Imported" value=${fmt.number(b.imported)} icon="CheckCircleOutlined" color="colorSuccess" note="Classified and searchable" /><//>
          <${A.Col} xs=${24} sm=${8}><${Stat} title="Failed" value=${stillFailed.length} icon="CloseCircleOutlined" color=${stillFailed.length ? "colorError" : null} note=${stillFailed.length ? "Need fixing, then retry" : "All fixed"} onClick=${function () { resTab[1]("failed"); }} /><//>
          <${A.Col} xs=${24} sm=${8}><${Stat} title="Duplicates" value=${b.duplicates} icon="CopyOutlined" note="Linked to existing records, not uploaded twice" onClick=${function () { resTab[1]("dupes"); }} /><//>
        <//>
        <${A.Tabs} activeKey=${resTab[0]} onChange=${resTab[1]} items=${[
          { key: "failed", label: "Failed (" + stillFailed.length + ")", children: html`<div>
            ${stillFailed.length ? html`<${A.Flex} gap=${8} wrap style=${{ marginBottom: 10 }} align="center">
              <${A.Button} onClick=${function () {
                var ids = selRows[0].length ? selRows[0] : stillFailed.map(function (r) { return r.id; });
                updB(function (cur) { return { failedRows: cur.failedRows.map(function (r) { return ids.indexOf(r.id) >= 0 && r.state === "Failed" ? Object.assign({}, r, { state: "Fixed" }) : r; }) }; });
                APP.toast.info("Marked as fixed. In the build, you upload the unlocked copy or enter the key fields by hand for each file.");
              }}>${selRows[0].length ? "Mark selected as fixed" : "Mark all as fixed"}<//>
              <${A.Button} type="primary" icon=${html`<${Icon} name="RedoOutlined" />`} disabled=${!fixed.length} onClick=${function () {
                var n = fixed.length;
                updB(function (cur) {
                  var rows = cur.failedRows.map(function (r) { return r.state === "Fixed" ? Object.assign({}, r, { state: "Imported" }) : r; });
                  var left = rows.filter(function (r) { return r.state !== "Imported"; }).length;
                  return { failedRows: rows, imported: cur.imported + n, failed: left, status: left ? "Needs fixing" : "Completed" };
                });
                selRows[1]([]);
                APP.audit({ action: "Import retry", item: b.id, detail: n + " fixed files retried, " + n + " imported", dataClass: "Internal" });
                APP.toast.success(n + (n === 1 ? " file" : " files") + " retried and imported. Only the fixed files were re-run.");
              }}>${"Retry " + fixed.length + " fixed"}<//>
              <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Only the failed files are re-run.</span>
            <//>` : null}
            ${stillFailed.length ? html`<div className="table-scroll"><${A.Table} size="small" rowKey="id" dataSource=${stillFailed} pagination=${stillFailed.length > 8 ? { pageSize: 8, size: "small" } : false}
              rowSelection=${{ selectedRowKeys: selRows[0], onChange: function (k) { selRows[1](k); } }}
              columns=${[
                { title: "File", dataIndex: "file", render: function (v) { return html`<span className="mono nowrap">${v}</span>`; } },
                { title: "Why it failed", dataIndex: "reason" },
                { title: "How to fix", dataIndex: "fix", render: function (v) { return html`<span style=${{ fontSize: 12 }}>${v}</span>`; } },
                { title: "Status", dataIndex: "state", render: function (v) { return html`<${APP.StatusTag} status=${v === "Fixed" ? "Ready to retry" : v} tone=${v === "Fixed" ? "processing" : "error"} />`; } },
                { title: "", key: "act", render: function (_, r) {
                  return r.state === "Failed" ? html`<${A.Dropdown} trigger=${["click"]} menu=${{ items: [
                      { key: "up", label: /Password/.test(r.reason) ? "Upload an unlocked copy" : "Upload a new scan" },
                      { key: "hand", label: "Enter key fields by hand" },
                      { key: "skip", label: "Skip this file" }
                    ], onClick: function (info) {
                      if (info.key === "skip") {
                        updB(function (cur) { var rows = cur.failedRows.filter(function (x) { return x.id !== r.id; }); return { failedRows: rows, failed: rows.filter(function (x) { return x.state !== "Imported"; }).length }; });
                        APP.toast.info(r.file + " skipped and noted in the import log.");
                      } else {
                        updB(function (cur) { return { failedRows: cur.failedRows.map(function (x) { return x.id === r.id ? Object.assign({}, x, { state: "Fixed" }) : x; }) }; });
                        APP.toast.info(info.key === "up" ? "Replacement noted for " + r.file + ". Retry to import it." : "Key fields entered for " + r.file + ". Retry to import it.");
                      }
                    } }}><${A.Button} size="small">Fix<//><//>` : html`<${A.Button} size="small" type="text" onClick=${function () {
                      updB(function (cur) { return { failedRows: cur.failedRows.map(function (x) { return x.id === r.id ? Object.assign({}, x, { state: "Failed" }) : x; }) }; });
                    }}>Undo<//>`;
                } }
              ]} /></div>` : html`<${A.Result} status="success" title="Every file is imported" subTitle=${b.id + " is complete. The import log keeps the full history."} />`}
          </div>` },
          { key: "dupes", label: "Duplicates (" + b.duplicates + ")", children: html`<div>
            <div className="table-scroll"><${A.Table} size="small" rowKey="id" dataSource=${b.dupRows} pagination=${false} columns=${[
              { title: "File", dataIndex: "file", render: function (v) { return html`<span className="mono nowrap">${v}</span>`; } },
              { title: "Matches", dataIndex: "match", render: function (v) { return html`<a className="mono" onClick=${function () { props.onOpen(v); }}>${v}</a>`; } },
              { title: "How it matched", dataIndex: "how" },
              { title: "Result", key: "r", render: function () { return html`<${APP.StatusTag} status="Linked" tone="success" />`; } }
            ]} /></div>
            ${b.duplicates > b.dupRows.length ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>${"Showing " + b.dupRows.length + " of " + b.duplicates + ". The rest are in the import log."}</div>` : null}
          </div>` },
          { key: "log", label: "Import log", children: html`<${A.Timeline} items=${[
            ["Started by " + APP.personName(b.by), b.startedAt], ["Files read and fingerprinted", b.startedAt], ["OCR on scanned pages (Sinhala and English)", b.startedAt],
            ["Sensitive data check on text, tables, comments, tracked changes and file properties", b.finishedAt], ["Duplicates linked to existing records", b.finishedAt], ["Finished: " + fmt.number(b.imported) + " imported, " + b.failed + " failed, " + b.duplicates + " duplicates", b.finishedAt]
          ].map(function (x, i) { var c = html`<div><div>${x[0]}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${fmt.dateTime(x[1])}</div></div>`; return { key: String(i), color: i === 5 ? "green" : "blue", children: c, content: c }; })} />` }
        ]} />
        <${A.Flex} gap=${8} wrap>
          <${A.Button} icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${function () { APP.audit({ action: "Export", item: b.id, detail: "Import log, Excel", dataClass: "Internal" }); APP.toast.success("Export recorded. In the build, the import log downloads as Excel with every file and its result."); }}>Download the import log<//>
        <//>
      <//>`;
    }

    var batchList = state.order.map(function (id) { return state.batches[id]; });
    return html`<${A.Row} gutter=${[16, 16]}>
      <${A.Col} xs=${24} xl=${7}>
        <${A.Card} size="small" title="Import batches" extra=${html`<${A.Button} size="small" type="primary" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${newImport}>New import<//>`}>
          <${A.Flex} vertical gap=${8}>
            ${batchList.map(function (x) {
              var on = x.id === state.selected;
              var left = (x.failedRows || []).filter(function (r) { return r.state !== "Imported"; }).length;
              return html`<div key=${x.id} role="button" tabIndex=${0} onClick=${function () { setState(function (p) { return Object.assign({}, p, { selected: x.id }); }); }}
                onKeyDown=${function (e) { if (e.key === "Enter") setState(function (p) { return Object.assign({}, p, { selected: x.id }); }); }}
                style=${{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid " + (on ? tok.colorPrimary : tok.colorBorderSecondary), background: on ? tok.colorPrimaryBg : "transparent" }}>
                <div style=${{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="mono" style=${{ fontWeight: 600 }}>${x.id}</span>
                  <span style=${{ flex: 1 }}></span>
                  <${APP.StatusTag} status=${x.done ? (left ? "Needs fixing" : "Completed") : x.status} tone=${x.done ? (left ? "warning" : "success") : x.status === "Running" ? "processing" : "default"} />
                </div>
                <div style=${{ fontSize: 13, marginTop: 2 }}>${x.name}</div>
                <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${x.done ? fmt.number(x.imported) + " imported · " + left + " failed · " + x.duplicates + " duplicates" : x.status === "Draft" ? "Not started" : "Running"}</div>
              </div>`;
            })}
          <//>
        <//>
      <//>
      <${A.Col} xs=${24} xl=${17}>
        <${A.Card} size="small" title=${html`<span><span className="mono">${b.id}</span> ${b.name}</span>`}
          extra=${html`<${APP.SowRef} sec="3.6.4 3.7.3" />`}>
          <div style=${{ marginBottom: 18 }}>${stepsEl}</div>
          ${view[0] !== null && view[0] !== b.step ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message="Viewing an earlier step" title="Viewing an earlier step"
            action=${html`<${A.Button} size="small" onClick=${function () { view[1](null); }}>Back to current step<//>`} />` : null}
          ${body}
        <//>
      <//>
    <//>`;
  }

  /* ------------------------------------------------------------------
     RECORDS screen
     ------------------------------------------------------------------ */
  function ExportModal(props) {
    var scope = APP.useState("filtered");
    var format = APP.useState("Excel");
    return html`<${A.Modal} open=${props.open} title="Export records" onCancel=${props.onClose} okText="Export" destroyOnHidden=${true}
      onOk=${function () {
        APP.audit({ action: "Export", item: "Records register", detail: format[0] + ", " + (scope[0] === "filtered" ? "current filters" : "whole register, details only"), dataClass: "Internal" });
        APP.toast.success("Export recorded in the audit log. In the build, the " + format[0] + " file downloads within your permissions.");
        props.onClose();
      }}>
      <${A.Flex} vertical gap=${12}>
        <div><div style=${{ marginBottom: 6 }}>What to export</div>
          <${A.Radio.Group} value=${scope[0]} onChange=${function (e) { scope[1](e.target.value); }}>
            <${A.Flex} vertical gap=${6}><${A.Radio} value="filtered">Records matching the current filters<//><${A.Radio} value="all">Whole register, details only (no files)<//><//>
          <//></div>
        <div><div style=${{ marginBottom: 6 }}>Format</div><${A.Segmented} value=${format[0]} onChange=${format[1]} options=${["Excel", "PDF", "Word"]} /></div>
        <div style=${{ fontSize: 12, opacity: 0.7 }}>Exports carry the classification, date, scope and your name, and are logged <${APP.SowRef} sec="3.7.3" /></div>
      <//>
    <//>`;
  }

  function RecordsScreen(props) {
    var s = APP.useStore();
    var route = APP.useRoute();
    var tab = APP.useShared("records.tab", "archive");
    var open = APP.useState(null);
    var openTab = APP.useState(null);
    var nonce = APP.useState(0);
    var exp = APP.useState(false);
    var prefill = APP.useState({ q: "", at: 0 });
    var startNew = APP.useState(0);
    APP.useEffect(function () {
      var p = props.params || {};
      if (p.tab) tab[1](p.tab === "archive" || p.tab === "ask" || p.tab === "retention" || p.tab === "import" ? p.tab : "archive");
      if (p.id) { open[1](p.id); openTab[1](p.drawerTab || null); nonce[1](Date.now()); if (!p.tab) tab[1]("archive"); }
    }, [props.params && props.params.id, props.params && props.params.tab, route.at]);
    var openRec = function (id, t) { open[1](id); openTab[1](t || null); nonce[1](Date.now()); };
    var recs = s.records;
    var holds = recs.filter(function (r) { return r.status === "Disposal hold"; }).length;
    var dueN = recs.filter(function (r) { return r.status !== "Disposed" && r.status !== "Disposal hold" && (r.status === "Retention review due" || (r.retainUntil && fmt.daysUntil(r.retainUntil) <= 90)); }).length;
    var imp = APP.useShared("records.import", null)[0];
    var impFail = imp ? Object.keys(imp.batches).reduce(function (acc, k) { return acc + (imp.batches[k].failedRows || []).filter(function (r) { return r.state !== "Imported"; }).length; }, 0) : 12;
    var liveN = APP.select.liveRecords(s).length;
    return html`<div>
      <${APP.PageHeader} title="Records" phase=${1} sow=${["3.6"]}
        subtitle="One archive for contracts, due diligence, cases, opinions, policies, compliance work and board material. Each record links to the matters it belongs to."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="DownloadOutlined" />`} onClick=${function () { exp[1](true); }}>Export<//>
          <${A.Button} icon=${html`<${Icon} name="CloudUploadOutlined" />`} onClick=${function () { tab[1]("import"); startNew[1](Date.now()); }}>Import records<//>
          <${A.Button} type="primary" icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${function () { tab[1]("ask"); }}>Ask the archive<//>
        <//>`} />
      <${A.Row} gutter=${[16, 16]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Records in the archive" value=${fmt.number(14356 + recs.length)} icon="DatabaseOutlined" note=${liveN ? liveN + " archived in this session" : "After import IMP-0007"} onClick=${function () { tab[1]("archive"); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Retention reviews due" value=${dueN} icon="FieldTimeOutlined" note="In the next 90 days" color=${dueN ? "colorWarning" : null} onClick=${function () { tab[1]("retention"); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="On disposal hold" value=${holds} icon="LockOutlined" note="Disposal blocked" onClick=${function () { tab[1]("retention"); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Import files to fix" value=${impFail} icon="ToolOutlined" note="Across import batches" color=${impFail ? "colorError" : null} onClick=${function () { tab[1]("import"); }} /><//>
      <//>
      <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
        { key: "archive", label: html`<span><${Icon} name="DatabaseOutlined" /> Archive</span>`, children: html`<${ArchiveTab} onOpen=${openRec} />` },
        { key: "ask", label: html`<span><${Icon} name="MessageOutlined" /> Ask the archive</span>`, children: html`<${AskTab} onOpenRecord=${openRec} prefill=${prefill[0].q} prefillAt=${prefill[0].at} />` },
        { key: "retention", label: html`<span><${Icon} name="FieldTimeOutlined" /> Retention and holds</span>`, children: html`<${RetentionTab} onOpen=${openRec} />` },
        { key: "import", label: html`<span><${Icon} name="CloudUploadOutlined" /> Import</span>`, children: html`<${ImportTab} onOpen=${openRec} startNew=${startNew[0]} />` }
      ]} />
      <${RecordDrawer} id=${open[0]} tab=${openTab[0]} nonce=${nonce[0]} onClose=${function () { open[1](null); }}
        onAsk=${function (rec) {
          open[1](null); tab[1]("ask");
          prefill[1]({ q: "What are the key dates and obligations in " + rec.id + ", " + rec.title + "?", at: Date.now() });
        }} />
      <${ExportModal} open=${exp[0]} onClose=${function () { exp[1](false); }} />
    </div>`;
  }

  APP.registerScreen("records", {
    title: "Records", group: "p1", phase: 1, icon: "DatabaseOutlined", sow: ["3.6"],
    summary: "One archive linked to many matters, with questions and answers, retention and bulk import.",
    render: RecordsScreen
  });

  /* ------------------------------------------------------------------
     KNOWLEDGE BASE
     ------------------------------------------------------------------ */
  function folderOf(key) {
    for (var i = 0; i < KA.folders.length; i++) {
      var f = KA.folders[i];
      if (f.key === key) return f;
      if (f.children) for (var j = 0; j < f.children.length; j++) if (f.children[j].key === key) return f.children[j];
    }
    return null;
  }
  function folderLabel(key) {
    for (var i = 0; i < KA.folders.length; i++) {
      var f = KA.folders[i];
      if (f.key === key) return f.title;
      if (f.children) for (var j = 0; j < f.children.length; j++) if (f.children[j].key === key) return f.title + " / " + f.children[j].title;
    }
    return key;
  }
  function inFolder(item, key) {
    if (!key || key === "all") return true;
    if (item.folder === key) return true;
    var f = folderOf(key);
    return !!(f && f.children && f.children.some(function (c) { return c.key === item.folder; }));
  }
  function useKbItems() {
    var uploads = APP.useShared("knowledge.uploads", [])[0];
    var over = APP.useShared("knowledge.over", {})[0];
    var base = D.knowledge.map(function (k) { return Object.assign({}, k, KA.info[k.id] || {}); }).concat(KA.extra).concat(uploads);
    return base.map(function (k) {
      var o = over[k.id] || {};
      var cur = (o.versions || k.versions)[0];
      return Object.assign({}, k, o, { current: cur, status: o.status || (cur ? cur.status : "In force") });
    });
  }

  function KnowledgeDrawer(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var phase2On = s.ui.phaseMode === "both";
    var over = APP.useShared("knowledge.over", {});
    var tab = APP.useState("overview");
    var accModal = APP.useState(false);
    var accVal = APP.useState([]);
    var item = props.item;
    APP.useEffect(function () { tab[1](props.tab || "overview"); }, [item && item.id, props.nonce]);
    if (!item) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var readable = canRead(pid, item.dataClass) || pid === "admin";
    var isAdmin = pid === "admin";
    var setOver = function (patch) { over[1](function (p) { var n = Object.assign({}, p || {}); n[item.id] = Object.assign({}, n[item.id] || {}, patch); return n; }); };
    var versions = item.versions || [];
    var prevDoc = item.prevDoc;
    var compare = prevDoc ? ["4.2", "4.3", "6.1"].map(function (cid) {
      var a = APP.findClause(prevDoc, cid), b = APP.findClause(item.doc, cid);
      return a && b ? { id: cid, heading: b.heading, before: a.text, after: b.text } : null;
    }).filter(Boolean) : [];
    var usage = [3, 5, 2, 6, 4, 7, 5, 8, 6, 9, 7, 6].map(function (v, i) { return Math.max(1, Math.round(v * ((item.cited || 4) / 30) + (i % 3))); });
    var maxU = Math.max.apply(null, usage);
    var canManage = pid === "admin" || (pid === "legal" && item.dataClass !== "Confidential") || pid === "owner";
    var overview = html`<${A.Flex} vertical gap=${14}>
      ${item.warn ? html`<${A.Alert} type="warning" showIcon message=${item.warn.kind === "two" ? "Two versions apply" : "Applies in stages"} title=${item.warn.kind === "two" ? "Two versions apply" : "Applies in stages"} description=${item.warn.text} />` : null}
      ${item.status === "Withdrawn" ? html`<${A.Alert} type="error" showIcon message="Withdrawn" title="Withdrawn" description="No longer used in answers. Its versions and periods stay on record." />` : null}
      ${item.phase === 2 ? html`<${A.Alert} type="info" showIcon message="Used by a Phase 2 module" title="Used by a Phase 2 module" description="Loaded now so it is ready when sanctions screening arrives." />` : null}
      <div style=${{ lineHeight: 1.6 }}>${item.summary || ""}</div>
      <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
        ["Reference", item.ref], ["Issued by", item.issuer], ["Category", item.category], ["Folder", folderLabel(item.folder)],
        ["Published", item.published ? fmt.date(item.published) : "Not recorded"], ["Current version", item.current ? item.current.v : ""],
        ["Effective from", item.current && item.current.effective ? fmt.date(item.current.effective) : "Not yet"], ["Status", html`<${APP.StatusTag} status=${item.status} />`],
        ["Languages", (item.langs || []).join(", ")], ["Indexed passages", fmt.number(item.chunks || 0)],
        ["Data class", html`<${APP.DataClassTag} cls=${item.dataClass} />`], ["Maintained by", item.ownerName]
      ]} />
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Sources, reference numbers, issuers, versions, publication and effective dates are kept for every item <${APP.SowRef} sec="2.2.2" /></div>
    <//>`;
    var versionsEl = html`<div>
      <${A.Timeline} items=${versions.map(function (v, i) {
        var c = html`<div><div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b>${"Version " + v.v}</b><${APP.StatusTag} status=${v.status} /></div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${v.effective ? "Effective " + fmt.date(v.effective) + (v.until ? " to " + fmt.date(v.until) : ", no end date") : "Not yet effective"}</div>
          ${v.note ? html`<div style=${{ fontSize: 13 }}>${v.note}</div>` : null}</div>`;
        return { key: String(i), color: v.status === "In force" ? "green" : v.status === "Draft" ? "blue" : "gray", children: c, content: c };
      })} />
      ${compare.length ? html`<div style=${{ marginTop: 8 }}>
        <div style=${{ fontWeight: 600, marginBottom: 8 }}>What changed from version 3.2 to 3.3</div>
        ${compare.map(function (c) { return html`<div key=${c.id} style=${{ padding: "10px 12px", border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, marginBottom: 8 }}>
          <div style=${{ fontWeight: 500, marginBottom: 4 }}>${c.heading}</div><${APP.Redline} before=${c.before} after=${c.after} /></div>`; })}
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}><ins style=${{ background: "var(--ins-bg)", textDecoration: "none" }}>added</ins> <del style=${{ background: "var(--del-bg)" }}>removed</del></div>
      </div>` : null}
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 10 }}>Earlier versions and the periods they applied to are kept, so answers about past events use the version in force at the time <${APP.SowRef} sec="2.2.3" /></div>
    </div>`;
    var preview = !readable ? html`<${A.Result} status="403" title="Above your access" subTitle=${"This item is " + item.dataClass + ". It is never cited in your answers."} />`
      : item.doc ? html`<${APP.DocViewer} doc=${item.doc} height=${520} />`
      : html`<${APP.EmptyHint} title="Preview not included in this sample" description=${item.summary} />`;
    var accessEl = html`<div>
      <div style=${{ fontWeight: 600, marginBottom: 8 }}>Who can see it</div>
      <${A.Flex} wrap gap=${6}>${(item.access || ["All staff"]).map(function (g) { return html`<${A.Tag} key=${g}>${g}<//>`; })}<//>
      <div style=${{ marginTop: 12 }}><${APP.KeyFacts} column=${1} items=${[["Data class", html`<${APP.DataClassTag} cls=${item.dataClass} />`],
        ["Model routing", item.dataClass === "Confidential" ? "Self-hosted only" : item.dataClass === "Sensitive" ? "Self-hosted, or Bedrock after masking and release" : "Bedrock or self-hosted"]]} /></div>
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, margin: "10px 0" }}>Answers and reports never cite material the user can't access <${APP.SowRef} sec="2.2.5" /></div>
      <${A.Button} disabled=${!isAdmin} onClick=${function () { accVal[1](item.access || []); accModal[1](true); }}>Change access<//>
      ${isAdmin ? null : html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary, marginLeft: 8 }}>Administrators change access</span>`}
      <${A.Modal} open=${accModal[0]} title="Change access" onCancel=${function () { accModal[1](false); }} okText="Save"
        onOk=${function () {
          setOver({ access: accVal[0] });
          APP.audit({ action: "Knowledge access changed", item: item.id, detail: accVal[0].join(", "), dataClass: item.dataClass });
          APP.toast.success("Access changed and logged.");
          accModal[1](false);
        }}>
        <${A.Select} mode="multiple" style=${{ width: "100%" }} value=${accVal[0]} onChange=${accVal[1]}
          options=${["All staff", "Legal", "Compliance", "Commercial", "Procurement", "Finance", "Management", "Company Secretariat", "Board", "Translators"].map(function (g) { return { value: g, label: g }; })} />
      <//>
    </div>`;
    var usageEl = html`<div>
      <div style=${{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <${A.Statistic} title="Cited in answers, last 30 days" value=${item.cited || 0} />
        <${A.Statistic} title="Indexed passages" value=${item.chunks || 0} />
      </div>
      <svg viewBox="0 0 240 60" width="100%" height="70" role="img" aria-label="Citations per week">
        ${usage.map(function (v, i) { var h = Math.round(v / maxU * 50); return html`<rect key=${i} x=${i * 20 + 2} y=${56 - h} width="14" height=${h} rx="2" fill=${tok.colorPrimary} opacity=${i === usage.length - 1 ? 1 : 0.55} />`; })}
      </svg>
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Citations per week, last 12 weeks</div>
    </div>`;
    var p2Locked = item.phase === 2 && !phase2On;
    return html`<${APP.DetailDrawer} open=${!!item} onClose=${props.onClose} size=${700} title=${item.title}
      subtitle=${item.id + " · " + item.category + " · " + (item.issuer || "")}
      tags=${html`<${Fragment}><${APP.DataClassTag} cls=${item.dataClass} /><${APP.StatusTag} status=${item.status} />${item.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}<//>`}
      actions=${html`<${A.Flex} gap=${6} wrap>
        <${A.Button} size="small" icon=${html`<${Icon} name="UploadOutlined" />`} disabled=${!canManage || item.status === "Withdrawn"} onClick=${function () { props.onNewVersion(item); }}>New version<//>
        <${A.Popconfirm} title="Withdraw this item?" description="It stops being used in answers. History is kept." okText="Withdraw" okButtonProps=${{ danger: true }} disabled=${!canManage || item.status === "Withdrawn"}
          onConfirm=${function () { setOver({ status: "Withdrawn" }); APP.audit({ action: "Knowledge base update", item: item.id, detail: "Withdrawn", dataClass: item.dataClass }); APP.toast.success(item.title + " withdrawn. Earlier answers keep their citations."); }}>
          <${A.Button} size="small" danger disabled=${!canManage || item.status === "Withdrawn"}>Withdraw<//>
        <//>
      <//>`}>
      ${p2Locked ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message="Phase 2 content" title="Phase 2 content" description="Shown for completeness. The module that uses it arrives in Phase 2." />` : null}
      <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
        { key: "overview", label: "Overview", children: overview },
        { key: "versions", label: "Versions (" + versions.length + ")", children: versionsEl },
        { key: "preview", label: "Preview", children: preview },
        { key: "access", label: "Access", children: accessEl },
        { key: "usage", label: "Usage", children: usageEl }
      ]} />
    <//>`;
  }

  var UPLOAD_SAMPLES = [
    { key: "gazette", name: "Port tariff regulations 2026 (gazette).pdf", meta: "Public law, 24 pages", title: "Port tariff regulations 2026", folder: "law-lk", issuer: "Government of Sri Lanka", category: "Law", suggested: "Public", found: "No sensitive fields found", langs: ["EN", "SI"] },
    { key: "gh4", name: "Gifts and hospitality policy v4.docx", meta: "Policy draft, 9 pages", title: "Gifts and hospitality policy", folder: "company", issuer: "Compliance", category: "Company policy", suggested: "Internal", found: "No sensitive fields found", langs: ["EN"], versionOf: "KB-POL-GH" },
    { key: "rates", name: "Supplier rate card 2027.xlsx", meta: "Spreadsheet, 3 sheets", title: "Supplier rate card 2027", folder: "company", issuer: "Procurement", category: "Company policy", suggested: "Sensitive", found: "14 supplier names and 120 prices found", langs: ["EN"] }
  ];
  var CHECKS = ["Virus and file check", "Text, tables, comments, tracked changes and file properties read", "OCR on scanned pages", "Sensitive data check", "Duplicate check", "Split into passages and indexed in three languages"];

  function UploadFlow(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.useStore(function (s) { return s.ui.personaId; });
    var step = APP.useState(0);
    var file = APP.useState(null);
    var form = APP.useState({});
    var cls = APP.useState(null);
    var reason = APP.useState("");
    var checks = APP.useState(0);
    var timer = APP.useRef(null);
    var uploads = APP.useShared("knowledge.uploads", []);
    var pending = APP.useShared("knowledge.pending", null);
    var over = APP.useShared("knowledge.over", {});
    APP.useEffect(function () {
      if (!props.open) return;
      step[1](0); reason[1](""); checks[1](0);
      if (props.versionOf) {
        var it = props.versionOf;
        var f = { key: "ver", name: it.title + " (new version).docx", meta: "New version", suggested: it.dataClass, found: "Detector result appears after upload", title: it.title, folder: it.folder, issuer: it.issuer, category: it.category, langs: it.langs || ["EN"], versionOf: it.id };
        file[1](f); form[1]({ title: it.title, folder: it.folder, issuer: it.issuer, ref: it.ref, version: "", effective: APP.now().add(1, "month").format("YYYY-MM-DD"), langs: it.langs || ["EN"] }); cls[1](it.dataClass);
      } else { file[1](null); form[1]({}); cls[1](null); }
    }, [props.open]);
    APP.useEffect(function () { return function () { clearInterval(timer.current); }; }, []);
    var pick = function (f) {
      file[1](f);
      form[1]({ title: f.title, folder: f.folder, issuer: f.issuer, ref: "", version: f.versionOf ? "4" : "1", effective: APP.now().add(1, "day").format("YYYY-MM-DD"), langs: f.langs });
      cls[1](f.suggested);
    };
    var lower = file[0] && cls[0] && rank(cls[0]) < rank(file[0].suggested);
    var needsOwner = cls[0] === "Sensitive" || cls[0] === "Confidential" || lower;
    var runChecks = function () {
      step[1](3); checks[1](0);
      var n = 0;
      clearInterval(timer.current);
      timer.current = setInterval(function () { n++; checks[1](n); if (n >= CHECKS.length) clearInterval(timer.current); }, 420);
    };
    var save = function () {
      var f = file[0], v = form[0];
      var id = "KB-UP-" + String(3310 + (uploads[0] || []).length);
      if (needsOwner) {
        var item = { id: "UP-" + String(3310 + (uploads[0] || []).length), title: v.title || f.name, uploadedBy: pid, uploadedAt: APP.nowIso(), dept: (APP.persona(pid) || {}).dept, folder: v.folder, suggested: f.suggested, chosen: cls[0],
          found: f.found, reasonNeeded: !!lower, reason: reason[0], note: lower ? "Uploader chose a lower class than the detector." : "Sensitive material needs the data owner's confirmation.", meta: { form: v, file: f } };
        pending[1](function (p) { return [item].concat(p || KA.pending); });
        APP.notify({ to: ["owner"], kind: "approval", title: "Data class to confirm: " + item.title, body: APP.personName(pid) + " uploaded it as " + cls[0] + ". Detector suggests " + f.suggested + ".", route: "knowledge", params: { pending: true } });
        APP.audit({ action: "Upload", item: item.id, detail: item.title + ", waiting for data class confirmation", dataClass: cls[0] });
        APP.toast.success("Uploaded. S. Silva confirms the data class before it is searchable.");
      } else if (f.versionOf) {
        over[1](function (p) {
          var n = Object.assign({}, p || {});
          var base = props.allItems.filter(function (x) { return x.id === f.versionOf; })[0];
          var oldV = (n[f.versionOf] && n[f.versionOf].versions) || (base ? base.versions : []);
          var nv = { v: v.version || "new", effective: v.effective, until: null, status: APP.dayjs(v.effective).isAfter(APP.now()) ? "Scheduled" : "In force", note: "Uploaded by " + APP.personName(pid) + " on " + fmt.date(APP.nowIso()) };
          n[f.versionOf] = Object.assign({}, n[f.versionOf] || {}, { versions: [nv].concat(oldV.filter(function (x) { return x.status !== "Draft"; }).map(function (x, i) { return i === 0 && nv.status === "In force" ? Object.assign({}, x, { status: "Superseded", until: v.effective }) : x; })) });
          return n;
        });
        APP.audit({ action: "Knowledge base update", item: f.versionOf, detail: "New version " + (v.version || "") + ", effective " + fmt.date(v.effective), dataClass: cls[0] });
        APP.toast.success("New version added. Earlier versions keep the periods they applied to.");
      } else {
        var ni = { id: id, title: v.title || f.name, category: f.category || "Company policy", issuer: v.issuer || "", dataClass: cls[0], langs: v.langs || ["EN"], chunks: 64 + Math.round(Math.random() * 80), ownerName: APP.personName(pid),
          folder: v.folder || "company", ref: v.ref || "", published: APP.nowIso().slice(0, 10), access: ["All staff"], cited: 0, summary: "Uploaded by " + APP.personName(pid) + " in this session.", live: true,
          versions: [{ v: v.version || "1", effective: v.effective || APP.nowIso().slice(0, 10), until: null, status: v.effective && APP.dayjs(v.effective).isAfter(APP.now()) ? "Scheduled" : "In force" }] };
        uploads[1](function (p) { return [ni].concat(p || []); });
        APP.audit({ action: "Knowledge base update", item: id, detail: "Added " + ni.title + ", " + cls[0], dataClass: cls[0] });
        APP.toast.success("Added to the knowledge base and searchable now.");
      }
      props.onClose();
    };
    var f = file[0];
    var v = form[0];
    var setF = function (k, val) { var n = Object.assign({}, form[0]); n[k] = val; form[1](n); };
    var folderOpts = [];
    KA.folders.forEach(function (fo) { if (fo.children) fo.children.forEach(function (c) { folderOpts.push({ value: c.key, label: fo.title + " / " + c.title }); }); else folderOpts.push({ value: fo.key, label: fo.title }); });
    var body;
    if (step[0] === 0) body = html`<${A.Flex} vertical gap=${12}>
      <${A.Upload.Dragger} showUploadList=${false} beforeUpload=${function (file0) {
        pick({ key: "own", name: file0.name, meta: Math.max(1, Math.round(file0.size / 1024)) + " KB", title: file0.name.replace(/\.[^.]+$/, ""), folder: "company", issuer: "", category: "Company policy", suggested: "Internal", found: "Sample result: no sensitive fields found", langs: ["EN"] });
        return false;
      }}>
        <p style=${{ fontSize: 28, margin: 0, color: tok.colorPrimary }}><${Icon} name="InboxOutlined" /></p>
        <p style=${{ margin: "4px 0" }}>Drop a law, policy, template or checklist here</p>
        <p style=${{ fontSize: 12, color: tok.colorTextSecondary, margin: 0 }}>The file stays in the CICT VPC. It is checked before it is searchable.</p>
      <//>
      <div style=${{ fontWeight: 600 }}>Or pick a sample file</div>
      <${A.Flex} vertical gap=${8}>${UPLOAD_SAMPLES.map(function (u) {
        var on = f && f.key === u.key;
        return html`<div key=${u.key} role="button" tabIndex=${0} onClick=${function () { pick(u); }} onKeyDown=${function (e) { if (e.key === "Enter") pick(u); }}
          style=${{ border: "1px solid " + (on ? tok.colorPrimary : tok.colorBorderSecondary), background: on ? tok.colorPrimaryBg : "transparent", borderRadius: 8, padding: 8, cursor: "pointer" }}>
          <${APP.FileChip} name=${u.name} meta=${u.meta} /></div>`;
      })}<//>
      ${f && f.key === "own" ? html`<${APP.FileChip} name=${f.name} meta=${f.meta} />` : null}
    <//>`;
    else if (step[0] === 1) body = html`<${A.Form} layout="vertical" component="div">
      <${A.Form.Item} label="Title"><${A.Input} value=${v.title} onChange=${function (e) { setF("title", e.target.value); }} /><//>
      <${A.Row} gutter=${12}>
        <${A.Col} xs=${24} sm=${12}><${A.Form.Item} label="Folder"><${A.Select} value=${v.folder} options=${folderOpts} onChange=${function (x) { setF("folder", x); }} /><//><//>
        <${A.Col} xs=${24} sm=${12}><${A.Form.Item} label="Issued by"><${A.Input} value=${v.issuer} onChange=${function (e) { setF("issuer", e.target.value); }} /><//><//>
        <${A.Col} xs=${24} sm=${8}><${A.Form.Item} label="Reference number"><${A.Input} value=${v.ref} placeholder="For example PRC-3.4" onChange=${function (e) { setF("ref", e.target.value); }} /><//><//>
        <${A.Col} xs=${12} sm=${8}><${A.Form.Item} label="Version"><${A.Input} value=${v.version} onChange=${function (e) { setF("version", e.target.value); }} /><//><//>
        <${A.Col} xs=${12} sm=${8}><${A.Form.Item} label="Effective from"><${A.DatePicker} style=${{ width: "100%" }} value=${v.effective ? APP.dayjs(v.effective) : null} onChange=${function (d) { setF("effective", d ? d.format("YYYY-MM-DD") : null); }} /><//><//>
      <//>
      <${A.Form.Item} label="Languages"><${A.Checkbox.Group} value=${v.langs} onChange=${function (x) { setF("langs", x); }} options=${[{ value: "EN", label: "English" }, { value: "ZH", label: "Chinese" }, { value: "SI", label: "Sinhala" }]} /><//>
    <//>`;
    else if (step[0] === 2) body = html`<${A.Flex} vertical gap=${12}>
      <${A.Alert} type=${f.suggested === "Public" || f.suggested === "Internal" ? "success" : "warning"} showIcon message=${"Detector suggests " + f.suggested} title=${"Detector suggests " + f.suggested} description=${f.found + ". Checked inside the CICT VPC."} />
      <div style=${{ fontWeight: 600 }}>Choose the data class</div>
      <${A.Radio.Group} value=${cls[0]} onChange=${function (e) { cls[1](e.target.value); }} style=${{ width: "100%" }}>
        <${A.Flex} vertical gap=${8}>${D.dataClasses.map(function (dc) {
          return html`<label key=${dc.key} style=${{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, borderRadius: 8, cursor: "pointer", border: "1px solid " + (cls[0] === dc.key ? tok.colorPrimary : tok.colorBorderSecondary) }}>
            <${A.Radio} value=${dc.key} />
            <div style=${{ flex: 1 }}><div style=${{ display: "flex", gap: 8, alignItems: "center" }}><${APP.DataClassTag} cls=${dc.key} tooltip=${false} />${dc.key === f.suggested ? html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Suggested</span>` : null}</div>
              <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 2 }}>${dc.desc + ". " + dc.handling}</div></div>
          </label>`;
        })}<//>
      <//>
      ${lower ? html`<div><${A.Alert} type="warning" showIcon message="Lower than suggested" title="Lower than suggested" description="Give a reason. The data owner confirms before the item is searchable." />
        <${A.Input.TextArea} rows=${2} style=${{ marginTop: 8 }} value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }} placeholder="Why is a lower class right?" /></div>` : null}
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${needsOwner ? "S. Silva, Data owner, confirms this class before the item is searchable." : "Public and Internal items are searchable once the checks pass."} <${APP.SowRef} sec="1.3 1.4.6" /></div>
    <//>`;
    else body = html`<${A.Flex} vertical gap=${10}>
      ${CHECKS.map(function (c, i) {
        var done = checks[0] > i, running = checks[0] === i;
        return html`<div key=${i} style=${{ display: "flex", gap: 10, alignItems: "center" }}>
          ${done ? html`<${Icon} name="CheckCircleFilled" style=${{ color: tok.colorSuccess }} />` : running ? html`<${Icon} name="LoadingOutlined" style=${{ color: tok.colorPrimary }} />` : html`<${Icon} name="ClockCircleOutlined" style=${{ color: tok.colorTextQuaternary }} />`}
          <span style=${{ color: done || running ? tok.colorText : tok.colorTextTertiary }}>${c}</span>
        </div>`;
      })}
      ${checks[0] >= CHECKS.length ? html`<${A.Alert} type=${needsOwner ? "info" : "success"} showIcon message=${needsOwner ? "Checks passed. Waiting for the data owner" : "Checks passed"} title=${needsOwner ? "Checks passed. Waiting for the data owner" : "Checks passed"}
        description=${needsOwner ? "It goes to S. Silva's queue. It is not searchable until confirmed." : "It is searchable as soon as you add it."} />` : null}
    <//>`;
    var canNext = step[0] === 0 ? !!f : step[0] === 1 ? !!(v.title && v.folder) : step[0] === 2 ? !!cls[0] && (!lower || reason[0].trim().length > 3) : checks[0] >= CHECKS.length;
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} width=${720} destroyOnHidden=${true}
      title=${props.versionOf ? "New version: " + props.versionOf.title : "Add to the knowledge base"}
      footer=${html`<${A.Flex} justify="space-between" gap=${8}>
        <${A.Button} disabled=${step[0] === 0 || step[0] === 3} onClick=${function () { step[1](step[0] - 1); }}>Back<//>
        ${step[0] < 2 ? html`<${A.Button} type="primary" disabled=${!canNext} onClick=${function () { step[1](step[0] + 1); }}>Next<//>`
          : step[0] === 2 ? html`<${A.Button} type="primary" disabled=${!canNext} onClick=${runChecks}>Run checks<//>`
          : html`<${A.Button} type="primary" disabled=${!canNext} onClick=${save}>${needsOwner ? "Send for confirmation" : "Add to the knowledge base"}<//>`}
      <//>`}>
      <${A.Steps} size="small" current=${step[0]} style=${{ marginBottom: 18 }} items=${[{ title: "File" }, { title: "Details" }, { title: "Classification" }, { title: "Checks" }]} />
      ${body}
    <//>`;
  }

  function PendingQueue(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var pending = APP.useShared("knowledge.pending", null);
    var uploads = APP.useShared("knowledge.uploads", []);
    var list = pending[0] || KA.pending;
    var choice = APP.useState({});
    var reasons = APP.useState({});
    var expanded = APP.useState(false);
    if (!list.length) return null;
    var isOwner = pid === "owner";
    var showList = isOwner || expanded[0];
    var decide = function (p, ok) {
      var c = choice[0][p.id] || (rank(p.chosen) < rank(p.suggested) ? p.suggested : p.chosen);
      pending[1](function (prev) { return (prev || KA.pending).filter(function (x) { return x.id !== p.id; }); });
      if (ok) {
        var ni = { id: "KB-" + p.id, title: p.title.replace(/\.(xlsx|docx|pdf)$/, ""), category: "Company document", issuer: p.dept, dataClass: c, langs: ["EN"], chunks: 40 + p.title.length, ownerName: APP.personName(p.uploadedBy),
          folder: p.folder || "company", ref: p.id, published: APP.nowIso().slice(0, 10), access: [p.dept || "Commercial"], cited: 0, summary: "Confirmed as " + c + " by S. Silva. " + p.found + ".", live: true,
          versions: [{ v: "1", effective: APP.nowIso().slice(0, 10), until: null, status: "In force" }] };
        uploads[1](function (prev) { return [ni].concat(prev || []); });
        APP.audit({ action: "Data class confirmed", item: p.id, detail: p.title + " confirmed as " + c + (c !== p.chosen ? " (uploader chose " + p.chosen + ")" : "") + (reasons[0][p.id] ? ". " + reasons[0][p.id] : ""), dataClass: c });
        APP.notify({ to: [p.uploadedBy], kind: "info", title: "Data class confirmed: " + p.title, body: "S. Silva confirmed it as " + c + ". It is now searchable.", route: "knowledge", params: { id: ni.id } });
        APP.toast.success(p.title + " confirmed as " + c + ". " + APP.personName(p.uploadedBy) + " has been notified.");
      } else {
        APP.audit({ action: "Upload returned", item: p.id, detail: p.title + ": should not be in the knowledge base", dataClass: p.suggested });
        APP.notify({ to: [p.uploadedBy], kind: "alert", title: "Upload returned: " + p.title, body: "S. Silva returned it: " + (reasons[0][p.id] || "not suitable for the knowledge base."), route: "knowledge", params: {} });
        APP.toast.info("Returned to " + APP.personName(p.uploadedBy) + " with your reason.");
      }
    };
    return html`<${A.Card} size="small" style=${{ marginBottom: 16, borderColor: tok.colorWarningBorder }}
      title=${html`<span><${Icon} name="SafetyCertificateOutlined" style=${{ color: tok.colorWarning }} /> ${list.length + (list.length === 1 ? " upload waits" : " uploads wait") + " for a data class"}</span>`}
      styles=${{ body: showList ? undefined : { display: "none" } }}
      extra=${isOwner ? html`<${APP.SowRef} sec="1.3" />` : html`<${A.Flex} gap=${8} wrap align="center">
        <a onClick=${function () { expanded[1](!expanded[0]); }}>${expanded[0] ? "Hide" : "Show"}</a>
        <${A.Button} size="small" type="dashed" icon=${html`<${Icon} name="UserSwitchOutlined" />`} onClick=${function () { APP.setPersona("owner"); APP.toast.info("You are now S. Silva, Data owner."); }}>Switch to S. Silva to confirm<//>
      <//>`}>
      <${A.Flex} vertical gap=${10}>
        ${list.map(function (p) {
          var c = choice[0][p.id] || (rank(p.chosen) < rank(p.suggested) ? p.suggested : p.chosen);
          var lowering = rank(c) < rank(p.suggested);
          return html`<div key=${p.id} style=${{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + tok.colorBorderSecondary }}>
            <div style=${{ flex: "1 1 260px", minWidth: 0 }}>
              <div style=${{ fontWeight: 500 }}>${p.title}</div>
              <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Uploaded by " + APP.personName(p.uploadedBy) + " · " + fmt.relative(p.uploadedAt) + " · " + p.found}</div>
              <div style=${{ fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>Uploader: <${APP.DataClassTag} cls=${p.chosen} /> Detector: <${APP.DataClassTag} cls=${p.suggested} />${p.reason ? html`<span style=${{ color: tok.colorTextSecondary }}>${"Reason: " + p.reason}</span>` : null}</div>
            </div>
            ${isOwner ? html`<${A.Flex} gap=${6} wrap align="center">
              <${A.Select} size="small" value=${c} style=${{ width: 130 }} options=${["Public", "Internal", "Sensitive", "Confidential"].map(function (x) { return { value: x, label: x }; })}
                onChange=${function (x) { var n = Object.assign({}, choice[0]); n[p.id] = x; choice[1](n); }} />
              ${lowering ? html`<${A.Input} size="small" style=${{ width: 180 }} placeholder="Reason for a lower class" value=${reasons[0][p.id] || ""} onChange=${function (e) { var n = Object.assign({}, reasons[0]); n[p.id] = e.target.value; reasons[1](n); }} />` : null}
              <${A.Button} size="small" type="primary" disabled=${lowering && !(reasons[0][p.id] || "").trim()} onClick=${function () { decide(p, true); }}>Confirm<//>
              <${A.Button} size="small" onClick=${function () { decide(p, false); }}>Return<//>
            <//>` : html`<${APP.StatusTag} status="Waiting" tone="processing">Waiting for S. Silva<//>`}
          </div>`;
        })}
      <//>
    <//>`;
  }

  function KnowledgeScreen(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var route = APP.useRoute();
    var vp = APP.useViewport();
    var pid = s.ui.personaId;
    var items = useKbItems();
    var folder = APP.useShared("knowledge.folder", "all");
    var q = APP.useState("");
    var mode = APP.useState("Meaning");
    var open = APP.useState(null);
    var nonce = APP.useState(0);
    var up = APP.useState({ open: false, versionOf: null });
    APP.useEffect(function () {
      var p = props.params || {};
      if (p.id) { open[1](p.id); nonce[1](Date.now()); }
    }, [props.params && props.params.id, route.at]);
    var visible = items.filter(function (k) { return inFolder(k, folder[0]); });
    var countIn = function (key) { return items.filter(function (k) { return inFolder(k, key); }).length; };
    var treeData = [{ key: "all", title: "All material (" + items.length + ")", children: KA.folders.map(function (f) {
      return { key: f.key, title: f.title + " (" + countIn(f.key) + ")", children: f.children ? f.children.map(function (c) { return { key: c.key, title: c.title + " (" + countIn(c.key) + ")" }; }) : undefined };
    }) }];
    var openItem = open[0] ? items.filter(function (k) { return k.id === open[0]; })[0] : null;

    /* search */
    var term = q[0].trim().toLowerCase();
    var results = null, searchWarn = null, hiddenN = 0;
    if (term) {
      var sc = null;
      KA.searchScripts.forEach(function (x) { if (!sc && x.keys.some(function (k) { return term.indexOf(k) >= 0; })) sc = x; });
      if (sc) { results = sc.results.map(function (r) { return Object.assign({}, r, { item: items.filter(function (k) { return k.id === r.id; })[0] }); }); searchWarn = sc.warn || null; }
      else {
        var toks = term.split(/\s+/).filter(function (t) { return t.length > 1; });
        results = items.map(function (k) {
          var hay = (k.title + " " + (k.summary || "") + " " + (k.keywords || "") + " " + k.category).toLowerCase();
          var hits = toks.filter(function (t) { return hay.indexOf(t) >= 0; }).length;
          return { id: k.id, item: k, snippet: k.summary, version: k.current ? k.current.v : "", score: toks.length ? hits / toks.length : 0 };
        }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 6)
          .map(function (r) { return Object.assign({}, r, { score: Math.round((0.6 + r.score * 0.3) * 100) / 100 }); });
      }
      var before = results.length;
      results = results.filter(function (r) { return r.item && (canRead(pid, r.item.dataClass) || pid === "admin"); });
      hiddenN = before - results.length;
      if (s.ui.phaseMode === "p1") results = results.filter(function (r) { return r.item.phase !== 2; });
    }

    var columns = [
      { title: "Title", dataIndex: "title", key: "title", render: function (v, k) {
        var ok = canRead(pid, k.dataClass) || pid === "admin";
        return html`<div style=${{ minWidth: 240 }}><div style=${{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>${ok ? null : html`<${Icon} name="LockOutlined" style=${{ color: tok.colorTextTertiary }} />`}<span style=${{ fontWeight: 500 }}>${v}</span>
          ${k.warn && k.warn.kind === "two" ? html`<${A.Tooltip} title=${k.warn.text}><${A.Tag} color="warning" style=${{ marginInlineEnd: 0 }}>Two versions apply<//><//>` : null}
          ${k.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}${k.live ? html`<${A.Tag} color="blue" style=${{ marginInlineEnd: 0 }}>New<//>` : null}</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${k.issuer + (k.ref ? " · " + k.ref : "")}</div></div>`;
      } },
      APP.col.text("Category", "category"),
      { title: "Version", key: "version", render: function (_, k) { return html`<span className="nowrap">${k.current ? k.current.v : ""}</span>`; } },
      { title: "Effective", key: "eff", render: function (_, k) { return html`<span className="nowrap">${k.current && k.current.effective ? fmt.date(k.current.effective) : "Not yet"}</span>`; },
        sorter: function (a, b) { return String(a.current && a.current.effective || "").localeCompare(String(b.current && b.current.effective || "")); } },
      APP.col.status("Status", "status"),
      APP.col.dataClass("Access level", "dataClass"),
      { title: "Languages", dataIndex: "langs", key: "langs", render: function (v) { return html`<span className="nowrap">${(v || []).join(" ")}</span>`; } }
    ];
    var pendingN = (APP.useShared("knowledge.pending", null)[0] || KA.pending).length;

    return html`<div>
      <${APP.PageHeader} title="Knowledge base" phase=${1} sow=${["2.2"]}
        subtitle="Laws, headquarters and company policies, templates, checklists and historical records, with versions, effective dates and access by data class. Answers only cite what is here."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="SyncOutlined" />`} onClick=${function () { APP.toast.build("In the build, scheduled sources such as the sanctions lists and official gazettes refresh automatically and failures are shown."); }}>Sources<//>
          <${A.Button} type="primary" icon=${html`<${Icon} name="UploadOutlined" />`} onClick=${function () { up[1]({ open: true, versionOf: null }); }}>Upload<//>
        <//>`} />
      <${A.Card} size="small" style=${{ marginBottom: 16 }}>
        <${A.Flex} gap=${8} wrap align="center">
          <${A.Input} size="large" allowClear value=${q[0]} onChange=${function (e) { q[1](e.target.value); }} prefix=${html`<${Icon} name="SearchOutlined" />`}
            placeholder="Search in English, Chinese or Sinhala, for example: approval limit for service contracts" style=${{ flex: "1 1 320px" }} aria-label="Search the knowledge base" />
          <${A.Segmented} value=${mode[0]} onChange=${mode[1]} options=${["Meaning", "Exact words"]} />
        <//>
        ${!term ? html`<${A.Flex} wrap gap=${6} style=${{ marginTop: 10 }}>
          ${["approval limit for service contracts", "gifts above LKR 5,000", "违约金 仲裁", "personal data processing", "liability cap"].map(function (x) {
            return html`<${A.Button} key=${x} size="small" shape="round" onClick=${function () { q[1](x); }}>${x}<//>`;
          })}
        <//>` : html`<div style=${{ marginTop: 14 }}>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 8 }}>${results.length + (results.length === 1 ? " result" : " results") + " · " + (mode[0] === "Meaning" ? "matched by meaning across English, Chinese and Sinhala (BGE-M3, self-hosted)" : "matched on the exact words")}${hiddenN ? " · " + hiddenN + " hidden: above your access" : ""}</div>
          ${searchWarn ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 10 }} message=${searchWarn} title=${searchWarn} />` : null}
          ${results.length ? html`<${A.Flex} vertical gap=${8}>${results.map(function (r, i) {
            return html`<div key=${i} role="button" tabIndex=${0} onClick=${function () { open[1](r.id); nonce[1](Date.now()); }} onKeyDown=${function (e) { if (e.key === "Enter") { open[1](r.id); nonce[1](Date.now()); } }}
              style=${{ padding: "10px 12px", border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, cursor: "pointer" }}>
              <div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style=${{ fontWeight: 600 }}>${r.item.title}</span>
                <${A.Tag} style=${{ marginInlineEnd: 0 }}>${"v" + r.version}<//>
                <${APP.DataClassTag} cls=${r.item.dataClass} />
                <span style=${{ flex: 1 }}></span>
                <span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${"Relevance " + r.score.toFixed(2)}</span>
              </div>
              <div style=${{ fontSize: 13, marginTop: 4 }}>${r.snippet}${r.cite ? html` <${APP.CitationChip} n=${i + 1} cite=${r.cite} />` : null}</div>
              ${r.cite ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 2 }}>${APP.citeLabel(r.cite)}</div>` : null}
            </div>`;
          })}<//>` : html`<${APP.EmptyHint} title="No matches in this sample" description="Try another wording, or one of the example searches." action=${html`<${A.Button} size="small" onClick=${function () { q[1](""); }}>Clear search<//>`} />`}
        </div>`}
      <//>
      ${pendingN ? html`<${PendingQueue} />` : null}
      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} lg=${7} xl=${6}>
          <${A.Card} size="small" title="Folders">
            <${A.Tree} blockNode defaultExpandAll treeData=${treeData} selectedKeys=${[folder[0]]}
              onSelect=${function (keys) { if (keys.length) folder[1](keys[0]); }} />
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 10 }}>CICT supplies and keeps the content current. Allion loads and configures it (assumption A5).</div>
          <//>
        <//>
        <${A.Col} xs=${24} lg=${17} xl=${18}>
          <${A.Card} size="small" title=${folder[0] === "all" ? "All material" : folderLabel(folder[0])}>
            <${APP.DataTable} columns=${columns} data=${visible} pageSize=${10} searchPlaceholder="Filter this folder"
              searchKeys=${["title", "issuer", "ref", "category", "summary"]}
              filters=${[{ key: "status", label: "Status" }, { key: "dataClass", label: "Access level" }, { key: "langs", label: "Language", width: 120 }]}
              onRowClick=${function (k) { open[1](k.id); nonce[1](Date.now()); }}
              emptyTitle="Nothing in this folder yet" emptyText="Upload material or pick another folder." />
          <//>
        <//>
      <//>
      <${KnowledgeDrawer} item=${openItem} nonce=${nonce[0]} onClose=${function () { open[1](null); }}
        onNewVersion=${function (it) { up[1]({ open: true, versionOf: it }); }} />
      <${UploadFlow} open=${up[0].open} versionOf=${up[0].versionOf} allItems=${items} onClose=${function () { up[1]({ open: false, versionOf: null }); }} />
    </div>`;
  }

  APP.registerScreen("knowledge", {
    title: "Knowledge base", group: "platform", phase: 1, icon: "ReadOutlined", sow: ["2.2"],
    summary: "Laws, policies, templates and checklists with versions and effective dates.",
    render: KnowledgeScreen
  });

  /* Global search: extra knowledge items and import batches */
  APP.registerSearch({ group: "Knowledge base", items: function () {
    return KA.extra.map(function (k) { return { id: k.id, title: k.title, subtitle: k.category + " · v" + k.versions[0].v, route: "knowledge", params: { id: k.id }, icon: "ReadOutlined" }; });
  } });
  APP.registerSearch({ group: "Imports", items: function () {
    return RA.importBatches.map(function (b) { return { id: b.id, title: b.id + " " + b.name, subtitle: fmt.number(b.imported) + " imported, " + b.failed + " failed", route: "records", params: { tab: "import" }, icon: "CloudUploadOutlined" }; });
  } });
})();
