/* Screen area: Approvals (data owner release inbox) and Reviews (specialist reviewer queue).
   Routes: approvals, reviews. Reads and writes release requests, reviews, records, notifications and audit
   through the shared store, so the guided tour and other screens see the same state. See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, fmt = APP.fmt, Icon = APP.Icon;
  var useState = APP.useState, useEffect = APP.useEffect, useMemo = APP.useMemo, Fragment = APP.Fragment;
  var AREA = D.approvalsArea || { reviewDetails: {}, providerTerms: {}, rejectReasons: [], recordCategories: [], reviewChecks: [], reviewSlaDays: 2 };

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function phaseOk(s, x) { return !x || x.phase !== 2 || s.ui.phaseMode === "both"; }
  function modelById(id) { for (var i = 0; i < D.models.length; i++) if (D.models[i].id === id) return D.models[i]; return null; }
  function modelByName(name) { for (var i = 0; i < D.models.length; i++) if (D.models[i].name === name) return D.models[i]; return null; }
  function hostOf(req) { var m = modelById(req.modelId); return m ? m.host : (/self-hosted/i.test(req.destination || "") ? "Self-hosted" : "Bedrock"); }
  function placesOf(req) { return (req.entities || []).reduce(function (n, e) { return n + (Number(e.count) || 0); }, 0); }
  function updateRelease(id, patch) {
    APP.store.setState(function (s) { return { releaseRequests: s.releaseRequests.map(function (r) { return r.id === id ? Object.assign({}, r, patch) : r; }) }; });
  }
  function updateReview(id, patch) {
    APP.store.setState(function (s) { return { reviews: s.reviews.map(function (r) { return r.id === id ? Object.assign({}, r, patch) : r; }) }; });
  }
  function hasPendingCheck(req) { return !!req.pendingCheck && req.status === "Pending"; }

  /* Where a reference id lives in the app. Returns { route, params, phase } or null. */
  function refTarget(ref) {
    if (!ref) return null;
    if (/^CON-/.test(ref)) return { route: "contracts", params: { id: ref }, phase: 1 };
    if (/^REC-/.test(ref)) return { route: "records", params: { id: ref }, phase: 1 };
    if (/^REV-/.test(ref)) return { route: "reviews", params: { id: ref }, phase: 1 };
    if (/^REL-/.test(ref)) return { route: "approvals", params: { id: ref }, phase: 1 };
    if (/^POL-/.test(ref)) return { route: "policies", params: { id: ref }, phase: 2 };
    if (/^CASE-/.test(ref)) return { route: "legal", params: { id: ref }, phase: 2 };
    if (/^BRD-/.test(ref)) return { route: "board", params: { id: ref }, phase: 2 };
    return null;
  }
  function refTitle(ref) {
    if (!ref) return "";
    for (var i = 0; i < D.contracts.length; i++) if (D.contracts[i].id === ref) return D.contracts[i].title + ", " + D.contracts[i].counterparty;
    var st = APP.store.getState();
    var rec = findById(st.records || [], ref);
    if (rec) return rec.title;
    return "";
  }
  function RefLink(props) {
    var t = refTarget(props.refId);
    var s = APP.useStore(function (x) { return x.ui.phaseMode; });
    if (!props.refId) return html`<span>None</span>`;
    var title = props.showTitle !== false ? refTitle(props.refId) : "";
    if (!t) return html`<span className="mono">${props.refId}</span>`;
    var locked = t.phase === 2 && s === "p1";
    return html`<span style=${{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <a href=${"#" + t.route} className="mono" onClick=${function (e) { e.preventDefault(); APP.navigate(t.route, t.params); }}>${props.refId}</a>
      ${title ? html`<span style=${{ opacity: 0.75 }}>${title}</span>` : null}
      ${t.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
      ${locked ? html`<${Icon} name="LockOutlined" style=${{ opacity: 0.6 }} />` : null}
    </span>`;
  }
  function SourceLink(props) {
    var src = props.source;
    if (!src || !src.route) return html`<span>None</span>`;
    var sc = APP.screens[src.route];
    var label = (sc ? sc.title : src.route) + (src.params && src.params.conversationId ? ", conversation " + src.params.conversationId : src.params && src.params.id ? ", " + src.params.id : "");
    return html`<a href=${"#" + src.route} onClick=${function (e) { e.preventDefault(); APP.navigate(src.route, src.params || {}); }}>${label}</a>`;
  }

  /* Rebuild the original passages from the masked ones (stand-ins are consistent, so the mapping is reversible). */
  function originalPassages(req) {
    var ents = (req.entities || []).filter(function (e) { return e.replacement && e.original; })
      .slice().sort(function (a, b) { return b.replacement.length - a.replacement.length; });
    return ((req.payload && req.payload.passages) || []).map(function (p) {
      var t = p.text || "";
      ents.forEach(function (e) { if (e.replacement !== "[removed]" && e.replacement !== "████") t = t.split(e.replacement).join(e.original); });
      return { source: p.source, text: t };
    });
  }
  function compareEntities(req) {
    return (req.entities || []).map(function (e, i) {
      var r = e.replacement || "";
      var method = r === "[removed]" ? "delete" : r === "████" ? "mask" : /^\[.*\]$/.test(r) ? "placeholder" : "range";
      return { id: "rel-" + i, type: e.type, text: e.original, placeholder: r, range: method === "range" ? r : undefined, method: method, count: e.count };
    }).filter(function (e) { return e.text; });
  }
  function scanFor(req) {
    if (req.scan) return req.scan;
    if (req.ref === "CON-2024-051") {
      return APP.MASKING_LOCATIONS.map(function (l) {
        var u = (req.unscanned || []).filter(function (x) { return x.where === l.where; })[0];
        return u ? { where: l.where, status: "Done", detail: u.resolution } : l;
      });
    }
    return [{ where: "Question and passages", status: "Done", detail: "Checked before the request was made" }];
  }
  function minsBetween(a, b) { return Math.max(0, APP.dayjs(b).diff(APP.dayjs(a), "minute")); }
  function durationLabel(mins) {
    if (mins < 60) return mins + " min";
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h < 24) return h + " h" + (m ? " " + m + " min" : "");
    var d = Math.floor(h / 24);
    return d + (d === 1 ? " day" : " days") + (h % 24 ? " " + (h % 24) + " h" : "");
  }
  function waitingLabel(iso) { return durationLabel(minsBetween(iso, APP.nowIso())); }

  function Stat(props) {
    var tok = A.theme.useToken().token;
    return html`<${A.Card} size="small" hoverable=${!!props.onClick} onClick=${props.onClick} style=${{ height: "100%", cursor: props.onClick ? "pointer" : "default" }}>
      <${A.Statistic} title=${props.title} value=${props.value} suffix=${props.suffix} prefix=${props.icon ? html`<${Icon} name=${props.icon} />` : null}
        styles=${props.warn ? { content: { color: tok.colorWarning } } : undefined} />
      ${props.note ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>${props.note}</div>` : null}
    <//>`;
  }
  function Section(props) {
    var tok = A.theme.useToken().token;
    return html`<div style=${{ marginTop: props.first ? 0 : 18 }}>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style=${{ fontWeight: 600, color: tok.colorText }}>${props.title}</span>${props.extra || null}
      </div>
      ${props.children}
    </div>`;
  }
  function switchTo(personaId, route, params) {
    APP.setPersona(personaId);
    var p = APP.persona(personaId);
    APP.toast.info("You are now " + p.name + ", " + p.role + ".");
    if (route) APP.navigate(route, params || {});
  }
  function ScopeSwitch(props) {
    return html`<${A.Segmented} value=${props.value} onChange=${props.onChange} options=${props.options} />`;
  }
  function PhaseLockedItem(props) {
    return html`<${A.Result} icon=${html`<${Icon} name="LockOutlined" />`} title=${props.what + " belongs to Phase 2"}
      subTitle="Switch to Phase 1 + 2 at the top to see it."
      extra=${html`<${A.Button} type="primary" onClick=${function () { APP.setPhaseMode("both"); }}>Show Phase 1 + 2<//>`} />`;
  }

  /* ------------------------------------------------------------------
     APPROVALS: release inbox for the data owner
     ------------------------------------------------------------------ */
  function releaseChecks(req) {
    var manualOpen = hasPendingCheck(req);
    var confidentialOut = req.dataClass === "Confidential" && hostOf(req) !== "Self-hosted";
    var types = (req.entities || []).length, places = placesOf(req);
    return [
      { title: "Classified as " + req.dataClass, description: "Suggested by the detector and confirmed by " + APP.personName(req.requesterId) + ".", status: "finish" },
      { title: types ? types + " sensitive items masked in " + places + " places" : "No sensitive items found", description: "Rules " + (req.rulesVersion || "v1.4") + ". The same entity always gets the same stand-in.", status: "finish" },
      { title: (req.unscanned || []).length ? (manualOpen ? "Manual check not done" : "Manual check done") : "Every part of the file could be scanned",
        description: (req.unscanned || []).map(function (u) { return u.where + ": " + u.resolution; }).join(" ") || "Body, tables, attachments, comments, tracked changes and file properties.",
        status: manualOpen ? "error" : "finish" },
      { title: "Outbound check passed", description: "The exact question, passages and attachments were scanned again before this request.", status: "finish" },
      { title: confidentialOut ? "Destination not allowed for Confidential" : "Destination allowed for " + req.dataClass + " after masking",
        description: confidentialOut ? "Confidential material stays on the self-hosted model, even when masked." : req.destination, status: confidentialOut ? "error" : "finish" },
      { title: req.status === "Pending" ? "Waiting for " + APP.personName(req.ownerId) : req.status === "Approved" ? "Released by " + APP.personName(req.decidedBy) : req.status === "Withdrawn" ? "Withdrawn by the requester" : "Rejected by " + APP.personName(req.decidedBy),
        description: req.status === "Pending" ? "Masking alone is not permission to send." : fmt.dateTime(req.decidedAt), status: req.status === "Pending" ? "process" : req.status === "Approved" ? "finish" : "error" }
    ];
  }

  function ReleaseHistory(props) {
    var req = props.request;
    var audit = APP.useStore(function (s) { return s.audit; });
    var evs = audit.filter(function (a) { return a.item === req.id && a.action !== "Release requested"; }).slice().reverse();
    var items = [
      { color: "blue", t: req.createdAt, label: "Requested by " + APP.personName(req.requesterId), detail: req.purpose || req.title },
      { color: "green", t: req.createdAt, label: "Masked with rules " + (req.rulesVersion || "v1.4"), detail: (req.entities || []).length + " types in " + placesOf(req) + " places. Stand-in key stored separately." },
      { color: "green", t: req.createdAt, label: "Outbound check passed", detail: "Question, " + ((req.payload && req.payload.passages) || []).length + " passages and " + ((req.payload && req.payload.attachments) || []).length + " attachments scanned." },
      { color: "blue", t: req.createdAt, label: "Sent to " + APP.personName(req.ownerId) + " for a decision", detail: "Notification with a summary and a secure link only." }
    ];
    evs.forEach(function (a) { items.push({ color: /reject|withdraw/i.test(a.action) ? "red" : /check/i.test(a.action) ? "orange" : "green", t: a.at, label: a.action + " by " + APP.personName(a.actorId), detail: a.detail }); });
    if (req.status !== "Pending" && !evs.some(function (a) { return /approved|rejected|withdrawn/i.test(a.action); })) {
      items.push({ color: req.status === "Approved" ? "green" : "red", t: req.decidedAt, label: req.status + " by " + APP.personName(req.decidedBy), detail: req.comment });
    }
    if (req.status === "Pending") items.push({ color: "gray", t: null, label: "Waiting for " + APP.personName(req.ownerId), detail: "Waiting " + waitingLabel(req.createdAt) + "." });
    return html`<${A.Timeline} items=${items.map(function (it, i) {
      var c = html`<div><div style=${{ fontWeight: 500 }}>${it.label}</div>
        ${it.detail ? html`<div style=${{ fontSize: 12, opacity: 0.75 }}>${it.detail}</div>` : null}
        ${it.t ? html`<div style=${{ fontSize: 11, opacity: 0.55 }}>${fmt.dateTime(it.t)}</div>` : null}</div>`;
      return { key: String(i), color: it.color, children: c, content: c };
    })} />`;
  }

  function ProviderTerms(props) {
    var req = props.request;
    var host = hostOf(req);
    var t = AREA.providerTerms[host] || AREA.providerTerms.Bedrock || {};
    var route = D.routing.filter(function (r) { return r.cls === req.dataClass; })[0];
    return html`<${A.Flex} vertical gap=${14}>
      <${A.Alert} type="info" showIcon message="Sample terms" title="Sample terms"
        description=${html`<span>CICT sees the provider's conditions for data retention, training use and deletion before anything is sent <${APP.SowRef} sec="2.4.4" />.</span>`} />
      <${APP.KeyFacts} column=${{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 1 }} items=${[
        ["Destination", html`<${A.Flex} gap=${6} wrap="wrap" align="center"><${APP.ModelTag} id=${req.modelId} name=${(req.destination || "").split(" (")[0]} /><span style=${{ opacity: 0.7 }}>${(modelById(req.modelId) || {}).where || ""}</span><//>`],
        ["Provider", t.provider], ["Network path", t.network], ["Region", t.region], ["Retention", t.retention],
        ["Training use", t.training], ["Provider access", t.access], ["Deletion", t.deletion], ["Encryption", t.keys], ["Basis", t.basis]
      ]} />
      ${route ? html`<${A.Card} size="small" title=${html`<span>Routing rule for ${req.dataClass} content <${APP.SowRef} sec="2.4" /></span>`}>
        <${APP.KeyFacts} column=${{ xs: 1, sm: 1, md: 3 }} bordered=${false} items=${[["Where it may run", route.where], ["Release", route.release], ["Masking", route.masking]]} />
      <//>` : null}
    <//>`;
  }

  function MaskingTab(props) {
    var tok = A.theme.useToken().token;
    var req = props.request;
    var pid = APP.useStore(function (s) { return s.ui.personaId; });
    var canSee = pid === req.ownerId || pid === req.requesterId;
    var originals = originalPassages(req);
    var ents = compareEntities(req);
    var scan = scanFor(req);
    return html`<${A.Flex} vertical gap=${14}>
      ${canSee ? html`<${APP.MaskingCompare} text=${originals.map(function (p) { return p.text; }).join("\n")} entities=${ents} readOnly=${true} height=${240} />`
        : html`<${Fragment}>
          <${A.Alert} type="warning" showIcon message="Original text is hidden for your role" title="Original text is hidden for your role"
            description=${"Only the requester and the data owner can compare original and masked text. Originals and the stand-in key are stored separately with their own permissions."} />
          <div style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 12, fontSize: 13 }}>
            ${((req.payload && req.payload.passages) || []).map(function (p, i) { return html`<p key=${i} style=${{ margin: "0 0 8px" }}><b>${p.source + ". "}</b><span className="mono">${p.text}</span></p>`; })}
          </div>
        <//>`}
      <${Section} title="Where it looked" extra=${html`<${APP.SowRef} sec="1.4.3" />`}>
        <${A.Flex} vertical gap=${6}>${scan.map(function (l, i) {
          return html`<div key=${i} style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style=${{ minWidth: 150, fontWeight: 500 }}>${l.where}</span><${APP.StatusTag} status=${l.status} />
            <span style=${{ fontSize: 13, color: tok.colorTextSecondary }}>${l.detail}</span></div>`;
        })}<//>
      <//>
      <div><${A.Button} icon=${html`<${Icon} name="EyeInvisibleOutlined" />`} onClick=${function () { APP.navigate("masking", { releaseId: req.id }); }}>Open the full masking review<//></div>
    <//>`;
  }

  function ApproveModal(props) {
    var req = props.request;
    var read = useState(false), scope = useState("once"), comment = useState("");
    useEffect(function () { if (props.open) { read[1](false); scope[1]("once"); comment[1](""); } }, [props.open]);
    if (!req) return null;
    var passages = ((req.payload && req.payload.passages) || []).length, att = ((req.payload && req.payload.attachments) || []).length;
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title=${"Approve release " + req.id} okText="Approve release" destroyOnHidden=${true}
      okButtonProps=${{ disabled: !read[0] }}
      onOk=${function () {
        var note = scope[0] === "rerun" ? "Approved for this task, including re-runs for 24 hours." : "Approved for this request only.";
        APP.decideRelease(req.id, "Approved", (comment[0] ? comment[0].trim() + " " : "") + note);
        APP.toast.success("Release approved. " + APP.personName(req.requesterId) + " has been notified and the answer can be prepared.");
        props.onClose(true);
      }}>
      <${A.Flex} vertical gap=${12}>
        <div>You are releasing <b>${passages + " masked passages"}</b>${att ? html`<span> and <b>${att + " attachment" + (att > 1 ? "s" : "")}</b></span>` : null} to <b>${req.destination}</b> for: ${req.purpose || req.title}.</div>
        <${A.Radio.Group} value=${scope[0]} onChange=${function (e) { scope[1](e.target.value); }} options=${[
          { value: "once", label: "This request only" },
          { value: "rerun", label: "This task, including re-runs for 24 hours" }
        ]} />
        <${A.Checkbox} checked=${read[0]} onChange=${function (e) { read[1](e.target.checked); }}>I have read the exact text that will be sent<//>
        <${A.Input.TextArea} rows=${2} placeholder="Comment for the requester (optional)" value=${comment[0]} onChange=${function (e) { comment[1](e.target.value); }} />
        <div style=${{ fontSize: 12, opacity: 0.7 }}>Your decision, the payload and the destination are written to the audit log <${APP.SowRef} sec="1.4.8" />.</div>
      <//>
    <//>`;
  }
  function RejectModal(props) {
    var req = props.request;
    var reason = useState(null), detail = useState("");
    useEffect(function () { if (props.open) { reason[1](null); detail[1](""); } }, [props.open]);
    if (!req) return null;
    var text = [reason[0], detail[0].trim()].filter(Boolean).join(". ");
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title=${"Reject release " + req.id} okText="Reject release" destroyOnHidden=${true}
      okButtonProps=${{ danger: true, disabled: !text }}
      onOk=${function () {
        APP.decideRelease(req.id, "Rejected", text + (/\.$/.test(text) ? "" : "."));
        APP.toast.warn("Release rejected. Nothing was sent. " + APP.personName(req.requesterId) + " has been notified.");
        props.onClose(true);
      }}>
      <${A.Flex} vertical gap=${12}>
        <div>Nothing leaves the CICT VPC. ${APP.personName(req.requesterId)} sees your reason and can run the task on the self-hosted model instead.</div>
        <${A.Radio.Group} value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }}>
          <${A.Flex} vertical gap=${6}>${AREA.rejectReasons.map(function (r) { return html`<${A.Radio} key=${r} value=${r}>${r}<//>`; })}<//>
        <//>
        <${A.Input.TextArea} rows=${3} placeholder="Reason for the requester" value=${detail[0]} onChange=${function (e) { detail[1](e.target.value); }} />
      <//>
    <//>`;
  }
  function ManualCheckModal(props) {
    var tok = A.theme.useToken().token;
    var req = props.request;
    var choice = useState("clear");
    if (!req) return null;
    var u = (req.unscanned || [])[0] || { where: "Unreadable part" };
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title=${"Manual check: " + u.where} okText="Record the check" destroyOnHidden=${true}
      onOk=${function () {
        var me = APP.personName(APP.store.getState().ui.personaId);
        var res = choice[0] === "clear" ? "Checked by hand by " + me + ": licensing authority seal only, no names or numbers" : "Removed from the payload by " + me;
        var patch = { pendingCheck: false, unscanned: [{ where: u.where, resolution: res }] };
        if (req.scan) patch.scan = req.scan.map(function (l) { return l.where === u.where ? { where: l.where, status: "Done", detail: res } : l; });
        if (choice[0] === "remove" && req.payload) patch.payload = Object.assign({}, req.payload, { attachments: [] });
        updateRelease(req.id, patch);
        APP.audit({ action: "Manual check", item: req.id, detail: u.where + ". " + res, dataClass: req.dataClass });
        APP.notify({ to: [req.ownerId], kind: "approval", title: "Manual check done on " + req.id, body: me + " checked " + u.where.toLowerCase() + ". The request can now be decided.", route: "approvals", params: { id: req.id }, phase: req.phase });
        APP.toast.success("Check recorded. " + APP.personName(req.ownerId) + " has been notified.");
        props.onClose();
      }}>
      <${A.Flex} vertical gap=${12}>
        <div style=${{ border: "1px dashed " + tok.colorBorder, borderRadius: 8, padding: 16, background: tok.colorFillQuaternary, textAlign: "center" }}>
          <${Icon} name="FileImageOutlined" style=${{ fontSize: 32, color: tok.colorTextTertiary }} />
          <div style=${{ marginTop: 8, fontWeight: 500 }}>Scanned stamp at the foot of page 1</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>OCR could not read it. In the build, the original image opens here at full size, inside the CICT VPC.</div>
        </div>
        <${A.Radio.Group} value=${choice[0]} onChange=${function (e) { choice[1](e.target.value); }}>
          <${A.Flex} vertical gap=${6}>
            <${A.Radio} value="clear">Checked: no sensitive data, keep it in the payload<//>
            <${A.Radio} value="remove">Contains sensitive data: remove the attachment from the payload<//>
          <//>
        <//>
      <//>
    <//>`;
  }

  function ReleaseDrawer(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var req = props.id ? findById(s.releaseRequests, props.id) : null;
    var tab = useState("request"), approve = useState(false), reject = useState(false), check = useState(false);
    useEffect(function () { tab[1]("request"); }, [props.id]);
    var open = !!req;
    if (!req) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var isOwner = pid === req.ownerId, isRequester = pid === req.requesterId;
    var pending = req.status === "Pending";
    var manualOpen = hasPendingCheck(req);
    var nextPending = s.releaseRequests.filter(function (r) { return r.id !== req.id && r.status === "Pending" && r.ownerId === pid && phaseOk(s, r); })[0];
    var locked = req.phase === 2 && s.ui.phaseMode === "p1";

    var footer = null;
    if (!locked && pending && isOwner) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary, flex: "1 1 200px" }}>Masking alone is not permission to send <${APP.SowRef} sec="1.4.7" /></span>
        ${manualOpen ? html`<${A.Button} icon=${html`<${Icon} name="SendOutlined" />`} disabled=${!!req.checkRequested}
          onClick=${function () {
            updateRelease(req.id, { checkRequested: true });
            APP.notify({ to: [req.requesterId], kind: "alert", title: "Manual check needed on " + req.id, body: APP.personName(pid) + " asks you to check " + req.unscanned[0].where.toLowerCase() + " before release.", route: "approvals", params: { id: req.id }, phase: req.phase });
            APP.audit({ action: "Check requested", item: req.id, detail: req.unscanned[0].where, dataClass: req.dataClass });
            APP.toast.info(APP.personName(req.requesterId) + " has been asked to check it by hand.");
          }}>${req.checkRequested ? "Check requested" : "Ask " + APP.personName(req.requesterId) + " to check"}<//>` : null}
        <${A.Button} danger onClick=${function () { reject[1](true); }}>Reject<//>
        <${A.Tooltip} title=${manualOpen ? "One part of the file has not been checked by hand yet" : null}>
          <${A.Button} type="primary" disabled=${manualOpen} onClick=${function () { approve[1](true); }} icon=${html`<${Icon} name="CheckOutlined" />`}>Approve<//>
        <//>
      </div>`;
    } else if (!locked && pending && isRequester) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary, flex: "1 1 200px" }}>${"Waiting for " + APP.personName(req.ownerId) + " for " + waitingLabel(req.createdAt)}</span>
        <${A.Popconfirm} title="Withdraw this request?" description="The data owner will no longer see it. Nothing is sent." okText="Withdraw" cancelText="Keep"
          onConfirm=${function () {
            updateRelease(req.id, { status: "Withdrawn", decidedAt: APP.nowIso(), decidedBy: pid, comment: "Withdrawn by the requester." });
            APP.audit({ action: "Release withdrawn", item: req.id, detail: "Withdrawn by the requester", dataClass: req.dataClass });
            APP.notify({ to: [req.ownerId], kind: "info", title: "Release request " + req.id + " withdrawn", body: APP.personName(pid) + " withdrew the request.", route: "approvals", params: { id: req.id }, phase: req.phase });
            APP.toast.info("Request withdrawn.");
          }}>
          <${A.Button}>Withdraw<//>
        <//>
        ${manualOpen ? html`<${A.Button} type="primary" icon=${html`<${Icon} name="AuditOutlined" />`} onClick=${function () { check[1](true); }}>Record manual check<//>` : null}
        <${A.Button} type=${manualOpen ? "default" : "primary"} icon=${html`<${Icon} name="UserSwitchOutlined" />`} onClick=${function () { switchTo(req.ownerId, "approvals", { id: req.id }); }}>${"Switch to " + APP.personName(req.ownerId) + " to decide"}<//>
      </div>`;
    } else if (!locked && pending) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary, flex: "1 1 200px" }}>${"Only " + APP.personName(req.ownerId) + ", the data owner, can decide. Your role can read the request."}</span>
        <${A.Button} icon=${html`<${Icon} name="UserSwitchOutlined" />`} onClick=${function () { switchTo(req.ownerId, "approvals", { id: req.id }); }}>${"Switch to " + APP.personName(req.ownerId)}<//>
      </div>`;
    } else if (!locked) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
        ${isRequester && req.source && req.source.route ? html`<${A.Button} onClick=${function () { APP.navigate(req.source.route, req.source.params || {}); }}>Go back to where it was asked<//>` : null}
        ${isOwner && nextPending ? html`<${A.Button} type="primary" onClick=${function () { props.onOpen(nextPending.id); }}>${"Next waiting: " + nextPending.id}<//>` : null}
        <${A.Button} onClick=${props.onClose}>Close<//>
      </div>`;
    }

    var statusAlert = null;
    if (req.status === "Approved") statusAlert = html`<${A.Alert} type="success" showIcon message=${"Released by " + APP.personName(req.decidedBy) + " on " + fmt.dateTime(req.decidedAt)} title=${"Released by " + APP.personName(req.decidedBy) + " on " + fmt.dateTime(req.decidedAt)} description=${req.comment || null} />`;
    else if (req.status === "Rejected") statusAlert = html`<${A.Alert} type="error" showIcon message=${"Rejected by " + APP.personName(req.decidedBy) + " on " + fmt.dateTime(req.decidedAt) + ". Nothing was sent."} title=${"Rejected by " + APP.personName(req.decidedBy) + " on " + fmt.dateTime(req.decidedAt) + ". Nothing was sent."} description=${req.comment || null} />`;
    else if (req.status === "Withdrawn") statusAlert = html`<${A.Alert} type="info" showIcon message="Withdrawn by the requester. Nothing was sent." title="Withdrawn by the requester. Nothing was sent." />`;
    else if (manualOpen) statusAlert = html`<${A.Alert} type="warning" showIcon message="One part of the file could not be read and has not been checked by hand"
      title="One part of the file could not be read and has not been checked by hand"
      description=${(req.unscanned[0] || {}).where + ". It can't be released until the requester checks it" + (req.checkRequested ? ". Check requested." : ".")} />`;
    else if (isOwner) statusAlert = html`<${A.Alert} type="info" showIcon message=${"Waiting for your decision for " + waitingLabel(req.createdAt)} title=${"Waiting for your decision for " + waitingLabel(req.createdAt)}
      description="Read the exact outbound text before you approve. Only masked content leaves the CICT VPC." />`;

    var tabs = [
      { key: "request", label: "Request", children: html`<${A.Flex} vertical gap=${16}>
        ${statusAlert}
        <${APP.KeyFacts} column=${{ xs: 1, sm: 1, md: 2 }} items=${[
          ["Requested by", html`<${APP.PersonTag} id=${req.requesterId} showRole=${true} />`],
          ["Requested", fmt.dateTime(req.createdAt)],
          { label: "Purpose", children: req.purpose || req.title, span: 2 },
          ["Linked item", html`<${RefLink} refId=${req.ref} />`],
          ["Asked from", html`<${SourceLink} source=${req.source} />`],
          ["Destination", html`<${APP.ModelTag} id=${req.modelId} name=${(req.destination || "").split(" (")[0]} />`],
          ["Data class", html`<${APP.DataClassTag} cls=${req.dataClass} />`],
          ["Masked", (req.entities || []).length + " items in " + placesOf(req) + " places"],
          ["Passages", (function () { var np = ((req.payload && req.payload.passages) || []).length, na = ((req.payload && req.payload.attachments) || []).length; return np + (np === 1 ? " passage, " : " passages, ") + na + (na === 1 ? " attachment" : " attachments"); })()]
        ]} />
        <${Section} title="Checks before release" extra=${html`<${APP.SowRef} sec="1.4.6 2.4.2" />`}>
          <${A.Steps} orientation="vertical" size="small" items=${releaseChecks(req)} />
        <//>
      <//>` },
      { key: "masking", label: "Original and masked", children: html`<${MaskingTab} request=${req} />` },
      { key: "payload", label: "Outbound payload", children: html`<${A.Flex} vertical gap=${12}>
        <${A.Flex} gap=${8} wrap="wrap" align="center">
          <${A.Button} size="small" icon=${html`<${Icon} name="CopyOutlined" />`} onClick=${function () {
            var p = req.payload || {};
            var txt = [p.question].concat((p.passages || []).map(function (x) { return x.source + ": " + x.text; })).join("\n\n");
            try { navigator.clipboard.writeText(txt).then(function () { APP.toast.success("Exact outbound text copied."); }, function () { APP.toast.info("Copy is blocked in this window. In the build, the payload can also be exported as a PDF."); }); }
            catch (e) { APP.toast.info("Copy is blocked in this window. In the build, the payload can also be exported as a PDF."); }
          }}>Copy exact text<//>
          <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"About " + fmt.number(Math.round(JSON.stringify(req.payload || {}).length / 4) + ((req.payload && req.payload.attachments) || []).length * 900) + " tokens including attachments. Estimated cost under USD 0.05."}</span>
        <//>
        <${APP.PayloadPreview} request=${req} />
      <//>` },
      { key: "terms", label: "Provider terms", children: html`<${ProviderTerms} request=${req} />` },
      { key: "history", label: "History", children: html`<${ReleaseHistory} request=${req} />` }
    ];

    return html`<${Fragment}>
      <${APP.DetailDrawer} open=${open} onClose=${props.onClose} size=${900}
        title=${req.title} subtitle=${req.id + " · requested by " + APP.personName(req.requesterId) + " · " + fmt.relative(req.createdAt)}
        tags=${html`<${Fragment}><${APP.StatusTag} status=${req.status} /><${APP.DataClassTag} cls=${req.dataClass} />${req.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}<//>`}
        footer=${footer}>
        ${locked ? html`<${PhaseLockedItem} what="This request" />` : html`<${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${tabs} />`}
      <//>
      <${ApproveModal} open=${approve[0]} request=${req} onClose=${function () { approve[1](false); }} />
      <${RejectModal} open=${reject[0]} request=${req} onClose=${function () { reject[1](false); }} />
      <${ManualCheckModal} open=${check[0]} request=${req} onClose=${function () { check[1](false); }} />
    <//>`;
  }

  function ReleaseRulesDrawer(props) {
    return html`<${APP.DetailDrawer} open=${props.open} onClose=${props.onClose} title="Release rules" subtitle="Where each data class may be processed, and who must approve" size=${720}>
      <${A.Flex} vertical gap=${16}>
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="cls" dataSource=${D.routing} columns=${[
          { title: "Data class", dataIndex: "cls", render: function (v) { return /^(Public|Internal|Sensitive|Confidential)$/.test(v) ? html`<${APP.DataClassTag} cls=${v} />` : v; } },
          { title: "Where it may run", dataIndex: "where" },
          { title: "Release", dataIndex: "release" },
          { title: "Masking", dataIndex: "masking" },
          { title: "Models", dataIndex: "models", render: function (v) { return html`<${A.Flex} gap=${4} wrap="wrap">${v.map(function (m) { return html`<${APP.ModelTag} key=${m} id=${m} />`; })}<//>`; } }
        ]} /></div>
        <${A.Alert} type="info" showIcon message="Masking is not permission" title="Masking is not permission"
          description=${html`<span>A change of class or any external disclosure goes through CICT's approval procedure. Without approval, nothing is released <${APP.SowRef} sec="1.4.7" />. If an approved model is down, the request fails safely and is never sent to an unapproved model <${APP.SowRef} sec="2.4.5" />.</span>`} />
        <${APP.KeyFacts} title="Data owners" column=${{ xs: 1, sm: 2 }} items=${[["Commercial", "S. Silva"], ["Legal", "S. Silva (acting)"], ["Board matters", "A. Jayawardena"], ["Finance", "H. Kumara"]]} />
      <//>
    <//>`;
  }

  function ApprovalsScreen(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var me = APP.persona(pid);
    var defScope = pid === "owner" ? "mine" : (pid === "admin" || pid === "auditor") ? "all" : "sent";
    var scopeSt = useState(null), tabSt = useState("waiting"), openSt = useState(null), rulesSt = useState(false);
    useEffect(function () { scopeSt[1](null); tabSt[1]("waiting"); }, [pid]);
    useEffect(function () { if (props.params && props.params.id) openSt[1](props.params.id); }, [props.params && props.params.id, props.route && props.route.at]);
    var scope = scopeSt[0] || defScope;

    var all = s.releaseRequests.filter(function (r) { return phaseOk(s, r); });
    var mine = all.filter(function (r) { return r.ownerId === pid; });
    var sent = all.filter(function (r) { return r.requesterId === pid; });
    var scoped = scope === "mine" ? mine : scope === "sent" ? sent : all;
    var waiting = scoped.filter(function (r) { return r.status === "Pending"; });
    var decided = scoped.filter(function (r) { return r.status !== "Pending"; });
    var rows = tabSt[0] === "waiting" ? waiting : tabSt[0] === "decided" ? decided : scoped;

    var myPending = mine.filter(function (r) { return r.status === "Pending"; });
    var oldest = myPending.slice().sort(function (a, b) { return a.createdAt.localeCompare(b.createdAt); })[0];
    var recent = all.filter(function (r) { return r.decidedAt && APP.now().diff(APP.dayjs(r.decidedAt), "day") <= 30; });
    var approvedN = recent.filter(function (r) { return r.status === "Approved"; }).length;
    var rejectedN = recent.filter(function (r) { return r.status === "Rejected"; }).length;
    var times = all.filter(function (r) { return r.decidedAt && (r.status === "Approved" || r.status === "Rejected"); }).map(function (r) { return minsBetween(r.createdAt, r.decidedAt); });
    var avg = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0;

    var requesters = Array.from(new Set(all.map(function (r) { return r.requesterId; })));
    var models = Array.from(new Set(all.map(function (r) { return r.modelId; })));

    var columns = [
      APP.col.id("ID", "id", { render: function (v, r) { return html`<span className="nowrap"><span className="mono">${v}</span>${r.live ? html`<${A.Tag} color="blue" style=${{ marginLeft: 6, marginInlineEnd: 0 }}>New<//>` : null}</span>`; } }),
      { title: "Request", dataIndex: "title", key: "title", render: function (v, r) {
        return html`<div style=${{ minWidth: 200, maxWidth: 300 }}>
          <div style=${{ fontWeight: 500 }}>${v}</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${r.purpose}</div>
        </div>`;
      } },
      APP.col.dataClass("Class", "dataClass"),
      APP.col.person("Requested by", "requesterId"),
      { title: "Target model", dataIndex: "modelId", key: "modelId", render: function (v, r) { return html`<${APP.ModelTag} id=${v} name=${(r.destination || "").split(" (")[0]} />`; } },
      { title: "Masked", key: "masked", render: function (_, r) { return html`<div className="nowrap">${(r.entities || []).length + " items"}<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${placesOf(r) + " places"}</div></div>`; } },
      { title: "Requested", dataIndex: "createdAt", key: "createdAt", sorter: function (a, b) { return a.createdAt.localeCompare(b.createdAt); },
        render: function (v, r) { return html`<span className="nowrap">${r.status === "Pending" ? "Waiting " + waitingLabel(v) : fmt.relative(v)}</span>`; } },
      { title: "Status", dataIndex: "status", key: "status", render: function (v, r) {
        return html`<${A.Flex} gap=${4} wrap="wrap"><${APP.StatusTag} status=${v} />${hasPendingCheck(r) ? html`<${APP.StatusTag} status="Manual check" />` : null}${r.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}<//>`;
      } }
    ];

    var scopeOptions = [
      { value: "mine", label: "Assigned to me (" + mine.filter(function (r) { return r.status === "Pending"; }).length + ")" },
      { value: "sent", label: "Sent by me (" + sent.length + ")" },
      { value: "all", label: "All" }
    ];

    return html`<div>
      <${APP.PageHeader} title="Approvals" phase=${1} sow=${["1.4.7", "1.5", "2.4"]}
        subtitle="Release requests for masked material going to a managed model. Masking alone is not permission to send: a data owner reads the exact payload and decides."
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="ApartmentOutlined" />`} onClick=${function () { rulesSt[1](true); }}>Release rules<//>
          <${A.Button} icon=${html`<${Icon} name="EyeInvisibleOutlined" />`} onClick=${function () { APP.navigate("masking", {}); }}>Masking review<//>
        <//>`} />

      ${pid !== "owner" ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 16 }}
        message=${"You are " + me.name + ", " + me.role + ". Only a data owner can approve or reject."}
        title=${"You are " + me.name + ", " + me.role + ". Only a data owner can approve or reject."}
        description=${pid === "admin" || pid === "auditor" ? "You can read every request and its history. Decisions and payloads are also in the audit log." : "You see the requests you sent and where each one stands."}
        action=${html`<${A.Button} size="small" onClick=${function () { switchTo("owner"); }}>Switch to S. Silva<//>`} />` : null}

      <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Waiting for you" value=${myPending.length} icon="SafetyCertificateOutlined" warn=${myPending.length > 0}
          note=${pid === "owner" ? "Release requests to decide" : "Only data owners decide"} onClick=${function () { scopeSt[1]("mine"); tabSt[1]("waiting"); }} /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Oldest waiting" value=${oldest ? waitingLabel(oldest.createdAt) : "None"} icon="ClockCircleOutlined"
          note=${oldest ? oldest.id + " from " + APP.personName(oldest.requesterId) : "Nothing waiting"} onClick=${oldest ? function () { openSt[1](oldest.id); } : undefined} /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Approved, last 30 days" value=${approvedN} icon="CheckCircleOutlined" note=${rejectedN + " rejected in the same period"}
          onClick=${function () { scopeSt[1]("all"); tabSt[1]("decided"); }} /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Average time to decide" value=${durationLabel(avg)} icon="FieldTimeOutlined" note="Across all data owners" /><//>
      <//>

      <${A.Card} styles=${{ body: { paddingTop: 8 } }}>
        <${A.Flex} gap=${12} wrap="wrap" align="center" justify="space-between">
          <${A.Tabs} activeKey=${tabSt[0]} onChange=${tabSt[1]} items=${[
            { key: "waiting", label: html`<span>Waiting <${A.Badge} count=${waiting.length} size="small" showZero=${false} style=${{ marginLeft: 4 }} /></span>` },
            { key: "decided", label: "Decided (" + decided.length + ")" },
            { key: "all", label: "All (" + scoped.length + ")" }
          ]} style=${{ marginBottom: 0, minWidth: 0, maxWidth: "100%", flex: "1 1 260px" }} />
          <${ScopeSwitch} value=${scope} onChange=${scopeSt[1]} options=${scopeOptions} />
        <//>
        <${APP.DataTable} columns=${columns} data=${rows} onRowClick=${function (r) { openSt[1](r.id); }}
          searchKeys=${["id", "title", "purpose", "ref", "destination", function (r) { return APP.personName(r.requesterId); }]}
          searchPlaceholder="Search requests, purposes or contracts"
          filters=${[
            { key: "dataClass", label: "Data class", options: ["Public", "Internal", "Sensitive", "Confidential"], width: 140 },
            { key: "modelId", label: "Model", options: models.map(function (m) { return { value: m, label: (modelById(m) || {}).name || m }; }), width: 170 },
            { key: "requesterId", label: "Requested by", options: requesters.map(function (p) { return { value: p, label: APP.personName(p) }; }), width: 150 }
          ]}
          emptyTitle=${tabSt[0] === "waiting" ? "Nothing waiting" : "No requests"}
          emptyText=${tabSt[0] === "waiting" ? (scope === "mine" ? "New release requests for your data appear here, with the exact payload." : "Requests you send from the assistant appear here until they are decided.") : "Try another tab or clear the filters."} />
      <//>

      <${ReleaseDrawer} id=${openSt[0]} onOpen=${function (id) { openSt[1](id); }} onClose=${function () { openSt[1](null); }} />
      <${ReleaseRulesDrawer} open=${rulesSt[0]} onClose=${function () { rulesSt[1](false); }} />
    </div>`;
  }

  /* ------------------------------------------------------------------
     REVIEWS: specialist reviewer queue
     ------------------------------------------------------------------ */
  function citeKey(c) { return c.doc + "|" + c.clause; }
  function reviewDetail(rev, s) {
    var d = AREA.reviewDetails[rev.id];
    if (d) return d;
    var findings = D.reviewFindings[rev.ref];
    if (findings && /contract review/i.test(rev.kind || "")) {
      var cites = [], idx = {};
      var add = function (c) { var k = citeKey(c); if (!idx[k]) { cites.push(c); idx[k] = cites.length; } return idx[k]; };
      var sections = findings.map(function (f) {
        var first = f.cites.slice(0, 1).map(function (c) { return "[" + add(c) + "]"; }).join("");
        var rest = f.cites.slice(1).map(function (c) { return "[" + add(c) + "]"; }).join("");
        return { heading: f.title, severity: f.severity, text: "**Fact.** " + f.fact + " " + first + "\n\n**Assessment.** " + f.assessment + " " + rest + "\n\n**Action.** " + f.action, proposed: f.proposed };
      });
      var rel = rev.releaseId ? findById(s.releaseRequests, rev.releaseId) : null;
      return { question: "Review this agreement against the services contract checklist and list the risks, with clause references.",
        summary: (rev.content && rev.content.summary) || "", cites: cites, sections: sections, trace: APP.flows.contractReviewTrace(rel) };
    }
    var c = rev.citations || [];
    var host = modelByName(rev.modelName);
    return {
      question: rev.question || "", summary: (rev.content && rev.content.summary) || "", cites: c,
      sections: ((rev.content && rev.content.sections) || []).map(function (x) { return { heading: x.heading, text: x.text }; }),
      trace: [
        { label: "Classified as " + rev.dataClass, detail: "Confirmed by " + APP.personName(rev.requesterId) + ".", status: "done" },
        { label: "Routed to " + (rev.modelName || "an approved model"), detail: host ? host.where : "Approved for this data class.", status: "done" },
        { label: c.length + " sources cited", detail: c.length ? "Open the Sources tab to check each one." : "No sources were attached to this draft.", status: c.length ? "done" : "warn" }
      ]
    };
  }
  var SEVERITY_TONE = { High: "error", Medium: "warning", Low: "success", "To verify": "warning", "Not enough evidence": "warning", Answer: "processing", Drafted: "processing", Changed: "processing", Added: "processing", Note: "default", Source: "default" };
  function dueOf(rev) { return APP.dayjs(rev.createdAt).add(AREA.reviewSlaDays || 2, "day").format("YYYY-MM-DDTHH:mm"); }
  function retainUntilFor(category, rev) {
    var cat = AREA.recordCategories.filter(function (c) { return c.value === category; })[0];
    var ret = cat ? cat.retention : "10 years";
    var contract = null;
    for (var i = 0; i < D.contracts.length; i++) if (D.contracts[i].id === rev.ref) contract = D.contracts[i];
    var m = /^(\d+) years$/.exec(ret);
    if (m) return { retention: ret, retainUntil: APP.now().add(Number(m[1]), "year").format("YYYY-MM-DD") };
    if (/after the contract ends/.test(ret) && contract) return { retention: ret, retainUntil: APP.dayjs(contract.end).add(10, "year").format("YYYY-MM-DD") };
    if (/plus 7 years/.test(ret) && contract) return { retention: ret, retainUntil: APP.dayjs(contract.end).add(7, "year").format("YYYY-MM-DD") };
    return { retention: ret, retainUntil: null };
  }

  function SectionCard(props) {
    var tok = A.theme.useToken().token;
    var sec = props.section, idx = props.index, rev = props.review;
    var pid = APP.useStore(function (s) { return s.ui.personaId; });
    var commentsPair = APP.useShared("ar.comments", {}), editsPair = APP.useShared("ar.edits", {});
    var comments = (commentsPair[0][rev.id] || []).filter(function (c) { return c.idx === idx; });
    var edited = (editsPair[0][rev.id] || {})[idx];
    var commenting = useState(false), draft = useState(""), editing = useState(false), editText = useState("");
    var pending = rev.status === "Pending";
    var canEdit = pending && pid === rev.reviewerId;
    var addComment = function () {
      var t = draft[0].trim();
      if (!t) return;
      commentsPair[1](function (prev) {
        var n = Object.assign({}, prev || {});
        n[rev.id] = (n[rev.id] || []).concat([{ id: "C" + Date.now(), idx: idx, heading: sec.heading, text: t, by: pid, at: APP.nowIso() }]);
        return n;
      });
      APP.audit({ action: "Comment added", item: rev.id, detail: sec.heading + ": " + t, dataClass: rev.dataClass });
      draft[1](""); commenting[1](false);
      APP.toast.success("Comment added to " + sec.heading + ".");
    };
    var plain = String(sec.text || "").replace(/\s*\[\d+\]/g, "").replace(/\*\*/g, "");
    var tone = SEVERITY_TONE[sec.severity] || (sec.severity ? APP.statusTone(sec.severity) : "default");
    return html`<${A.Card} size="small" style=${{ marginBottom: 12 }}
      title=${html`<span style=${{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap", whiteSpace: "normal" }}><span>${sec.heading}</span>${sec.severity ? html`<${APP.StatusTag} status=${sec.severity} tone=${tone} icon=${false} />` : null}${edited ? html`<${A.Tag} color="purple" style=${{ marginInlineEnd: 0 }}>Edited<//>` : null}</span>`}
      extra=${html`<${A.Flex} gap=${4}>
        <${A.Tooltip} title="Add a comment"><${A.Button} size="small" type="text" icon=${html`<${Icon} name="CommentOutlined" />`} aria-label=${"Comment on " + sec.heading} onClick=${function () { commenting[1](!commenting[0]); }}>${comments.length ? String(comments.length) : null}<//><//>
        ${canEdit ? html`<${A.Tooltip} title="Edit with tracked changes"><${A.Button} size="small" type="text" icon=${html`<${Icon} name="EditOutlined" />`} aria-label=${"Edit " + sec.heading} onClick=${function () { editText[1](edited || plain); editing[1](true); }} /><//>` : null}
      <//>`}>
      ${edited ? html`<div>
          <div style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextTertiary, marginBottom: 4 }}>${"Tracked change by " + APP.personName(rev.reviewerId)}</div>
          <${APP.Redline} before=${plain} after=${edited} />
          ${canEdit ? html`<${A.Button} size="small" type="link" style=${{ paddingInline: 0 }} onClick=${function () {
            editsPair[1](function (prev) { var n = Object.assign({}, prev || {}); var m = Object.assign({}, n[rev.id] || {}); delete m[idx]; n[rev.id] = m; return n; });
            APP.toast.info("Edit undone. The AI draft text is back.");
          }}>Undo edit<//>` : null}
        </div>`
        : html`<${APP.CitedText} text=${sec.text} cites=${props.cites} onOpen=${props.onOpenCite} />`}
      ${sec.proposed ? html`<div style=${{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: tok.colorFillQuaternary, border: "1px solid " + tok.colorBorderSecondary }}>
        <div style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextTertiary, marginBottom: 4 }}>Proposed wording</div>
        <${APP.Redline} before=${sec.proposed.before} after=${sec.proposed.after} showLegend=${true} />
      </div>` : null}
      ${editing[0] ? html`<div style=${{ marginTop: 10 }}>
        <${A.Input.TextArea} autoSize=${{ minRows: 3, maxRows: 8 }} value=${editText[0]} onChange=${function (e) { editText[1](e.target.value); }} aria-label=${"Edit " + sec.heading} />
        <${A.Flex} gap=${8} style=${{ marginTop: 8 }}>
          <${A.Button} size="small" type="primary" onClick=${function () {
            var t = editText[0].trim();
            if (!t || t === plain) { editing[1](false); return; }
            editsPair[1](function (prev) { var n = Object.assign({}, prev || {}); n[rev.id] = Object.assign({}, n[rev.id] || {}); n[rev.id][idx] = t; return n; });
            APP.audit({ action: "Draft edited", item: rev.id, detail: sec.heading + ", tracked change", dataClass: rev.dataClass });
            editing[1](false);
            APP.toast.success("Edit saved as a tracked change.");
          }}>Save edit<//>
          <${A.Button} size="small" onClick=${function () { editing[1](false); }}>Cancel<//>
        <//>
      </div>` : null}
      ${comments.length ? html`<div style=${{ marginTop: 10, borderTop: "1px solid " + tok.colorBorderSecondary, paddingTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        ${comments.map(function (c) {
          return html`<div key=${c.id} style=${{ display: "flex", gap: 8 }}>
            <${APP.PersonTag} id=${c.by} size=${20} />
            <div style=${{ flex: 1, minWidth: 0, fontSize: 13 }}><span style=${{ fontSize: 11, color: tok.colorTextTertiary }}>${fmt.relative(c.at)}</span><div>${c.text}</div></div>
          </div>`;
        })}
      </div>` : null}
      ${commenting[0] ? html`<div style=${{ marginTop: 10 }}>
        <${A.Input.TextArea} autoSize=${{ minRows: 2, maxRows: 5 }} placeholder=${"Comment on " + sec.heading} value=${draft[0]} onChange=${function (e) { draft[1](e.target.value); }} autoFocus=${true} />
        <${A.Flex} gap=${8} style=${{ marginTop: 8 }}>
          <${A.Button} size="small" type="primary" disabled=${!draft[0].trim()} onClick=${addComment}>Add comment<//>
          <${A.Button} size="small" onClick=${function () { commenting[1](false); }}>Cancel<//>
        <//>
      </div>` : null}
    <//>`;
  }

  function ConfirmModal(props) {
    var rev = props.review;
    var checks = useState([]), title = useState(""), cat = useState(null), comment = useState("");
    var editsPair = APP.useShared("ar.edits", {});
    useEffect(function () {
      if (props.open && rev) {
        checks[1]([]); title[1](rev.title); comment[1]("");
        var want = rev.archiveCategory || rev.kind;
        cat[1](AREA.recordCategories.some(function (c) { return c.value === want; }) ? want : "Assistant result");
      }
    }, [props.open, rev && rev.id]);
    if (!rev) return null;
    var nEdits = Object.keys((editsPair[0] || {})[rev.id] || {}).length;
    var ret = retainUntilFor(cat[0], rev);
    var allChecked = checks[0].length === AREA.reviewChecks.length;
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title=${"Confirm " + rev.id} okText="Confirm and archive" destroyOnHidden=${true}
      okButtonProps=${{ disabled: !allChecked || !title[0].trim() }}
      onOk=${function () {
        var c = (nEdits ? "Confirmed with " + nEdits + " tracked edit" + (nEdits > 1 ? "s" : "") + ". " : "") + (comment[0].trim() || "Checked against the cited sources.");
        var reqP = APP.persona(rev.requesterId);
        var out = APP.decideReview(rev.id, "Confirmed", c, { record: { title: title[0].trim(), category: cat[0], retention: ret.retention, retainUntil: ret.retainUntil, dataClass: rev.dataClass, sourceReviewId: rev.id,
          dept: reqP ? reqP.dept : "Legal", ownerName: APP.personName(rev.requesterId),
          version: "Confirmed by " + APP.personName(APP.store.getState().ui.personaId) + (nEdits ? ", " + nEdits + " edits" : "") } });
        APP.toast.success("Confirmed" + (out && out.recordId ? " and archived as " + out.recordId : "") + ". " + APP.personName(rev.requesterId) + " has been notified.");
        props.onClose(true);
      }}>
      <${A.Flex} vertical gap=${12}>
        <div>Confirming makes this the reviewed result. It is archived to Records and ${APP.personName(rev.requesterId)} is notified.</div>
        <${A.Checkbox.Group} value=${checks[0]} onChange=${checks[1]}>
          <${A.Flex} vertical gap=${6}>${AREA.reviewChecks.map(function (c) { return html`<${A.Checkbox} key=${c} value=${c}>${c}<//>`; })}<//>
        <//>
        <div><div style=${{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Record title</div><${A.Input} value=${title[0]} onChange=${function (e) { title[1](e.target.value); }} /></div>
        <${A.Row} gutter=${[12, 8]}>
          <${A.Col} xs=${24} sm=${12}><div style=${{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Archive as</div>
            <${A.Select} value=${cat[0]} onChange=${cat[1]} style=${{ width: "100%" }} options=${AREA.recordCategories.map(function (c) { return { value: c.value, label: c.value }; })} /><//>
          <${A.Col} xs=${24} sm=${12}><div style=${{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Retention</div>
            <div style=${{ paddingTop: 5 }}>${ret.retention + (ret.retainUntil ? ", until " + fmt.date(ret.retainUntil) : "")}</div><//>
        <//>
        ${nEdits ? html`<${A.Alert} type="info" showIcon message=${nEdits + " tracked edit" + (nEdits > 1 ? "s" : "") + " will be kept with the record"} title=${nEdits + " tracked edit" + (nEdits > 1 ? "s" : "") + " will be kept with the record"} />` : null}
        <${A.Input.TextArea} rows=${2} placeholder="Note for the requester (optional)" value=${comment[0]} onChange=${function (e) { comment[1](e.target.value); }} />
      <//>
    <//>`;
  }
  function ReturnModal(props) {
    var rev = props.review;
    var text = useState("");
    var commentsPair = APP.useShared("ar.comments", {});
    useEffect(function () {
      if (props.open && rev) {
        var cs = (commentsPair[0] || {})[rev.id] || [];
        text[1](cs.map(function (c) { return c.heading + ": " + c.text; }).join("\n"));
      }
    }, [props.open, rev && rev.id]);
    if (!rev) return null;
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title=${"Return " + rev.id + " with comments"} okText="Return to requester" destroyOnHidden=${true}
      okButtonProps=${{ disabled: !text[0].trim() }}
      onOk=${function () {
        APP.decideReview(rev.id, "Returned", text[0].trim().replace(/\n+/g, " "));
        APP.toast.warn("Returned to " + APP.personName(rev.requesterId) + " with your comments. Nothing was archived.");
        props.onClose(true);
      }}>
      <${A.Flex} vertical gap=${12}>
        <div>${APP.personName(rev.requesterId)} gets your comments and a link back to where the draft was made. The draft stays unconfirmed.</div>
        <${A.Input.TextArea} rows=${5} value=${text[0]} onChange=${function (e) { text[1](e.target.value); }} placeholder="What needs to change, and why" />
        <div style=${{ fontSize: 12, opacity: 0.7 }}>Inline comments you added are filled in above. Edit them as needed.</div>
      <//>
    <//>`;
  }

  function ReviewHistory(props) {
    var rev = props.review;
    var audit = APP.useStore(function (s) { return s.audit; });
    var evs = audit.filter(function (a) { return a.item === rev.id || (rev.recordId && a.item === rev.recordId); }).slice().reverse();
    var items = [];
    if (!evs.some(function (a) { return a.action === "Sent for review"; })) items.push({ color: "blue", t: rev.createdAt, label: "Sent for review by " + APP.personName(rev.requesterId), detail: rev.kind + ": " + rev.title });
    evs.forEach(function (a) {
      items.push({ color: /returned|withdrawn/i.test(a.action) ? "red" : /confirmed|archived/i.test(a.action) ? "green" : "blue", t: a.at, label: a.action + " by " + APP.personName(a.actorId), detail: a.detail });
    });
    if (rev.status !== "Pending" && !evs.some(function (a) { return /confirmed|returned|withdrawn/i.test(a.action); })) {
      items.push({ color: rev.status === "Confirmed" ? "green" : "red", t: rev.decidedAt, label: rev.status + " by " + APP.personName(rev.decidedBy), detail: rev.comment });
    }
    if (rev.status === "Pending") items.push({ color: "gray", t: null, label: "Waiting for " + APP.personName(rev.reviewerId), detail: fmt.dueLabel(dueOf(rev)) + " (2 working days)." });
    return html`<${A.Timeline} items=${items.map(function (it, i) {
      var c = html`<div><div style=${{ fontWeight: 500 }}>${it.label}</div>
        ${it.detail ? html`<div style=${{ fontSize: 12, opacity: 0.75 }}>${it.detail}</div>` : null}
        ${it.t ? html`<div style=${{ fontSize: 11, opacity: 0.55 }}>${fmt.dateTime(it.t)}</div>` : null}</div>`;
      return { key: String(i), color: it.color, children: c, content: c };
    })} />`;
  }

  function ReviewDrawer(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var vp = APP.useViewport();
    var pid = s.ui.personaId;
    var rev = props.id ? findById(s.reviews, props.id) : null;
    var tab = useState("draft"), active = useState(null), confirm = useState(false), ret = useState(false);
    var detail = useMemo(function () { return rev ? reviewDetail(rev, s) : null; }, [rev, s.releaseRequests]);
    useEffect(function () { tab[1]("draft"); active[1](detail && detail.cites[0] ? detail.cites[0] : null); }, [props.id]);
    var commentsPair = APP.useShared("ar.comments", {});
    if (!rev) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var wide = vp.width >= 1100;
    var pending = rev.status === "Pending";
    var isReviewer = pid === rev.reviewerId, isRequester = pid === rev.requesterId;
    var locked = rev.phase === 2 && s.ui.phaseMode === "p1";
    var nComments = ((commentsPair[0] || {})[rev.id] || []).length;
    var cites = detail.cites || [];
    var openCite = function (c) { if (wide) { active[1](c); } else APP.openSource(c, cites); };
    var rel = rev.releaseId ? findById(s.releaseRequests, rev.releaseId) : null;
    var nextPending = s.reviews.filter(function (r) { return r.id !== rev.id && r.status === "Pending" && r.reviewerId === pid && phaseOk(s, r); })[0];

    var statusAlert;
    if (rev.status === "Confirmed") statusAlert = html`<${A.Alert} type="success" showIcon
      message=${"Confirmed by " + APP.personName(rev.decidedBy) + " on " + fmt.dateTime(rev.decidedAt)} title=${"Confirmed by " + APP.personName(rev.decidedBy) + " on " + fmt.dateTime(rev.decidedAt)}
      description=${(rev.comment || "") + (rev.recordId ? " Archived as " + rev.recordId + "." : "")}
      action=${rev.recordId ? html`<${A.Button} size="small" onClick=${function () { APP.navigate("records", { id: rev.recordId }); }}>Open record<//>` : null} />`;
    else if (rev.status === "Returned") statusAlert = html`<${A.Alert} type="warning" showIcon
      message=${"Returned by " + APP.personName(rev.decidedBy) + " on " + fmt.dateTime(rev.decidedAt)} title=${"Returned by " + APP.personName(rev.decidedBy) + " on " + fmt.dateTime(rev.decidedAt)}
      description=${rev.comment} />`;
    else if (rev.status === "Withdrawn") statusAlert = html`<${A.Alert} type="info" showIcon message="Withdrawn by the requester" title="Withdrawn by the requester" />`;
    else statusAlert = html`<${A.Alert} type="info" showIcon icon=${html`<${Icon} name="ExperimentOutlined" />`}
      message=${"AI draft. Not final until " + APP.personName(rev.reviewerId) + " confirms it."} title=${"AI draft. Not final until " + APP.personName(rev.reviewerId) + " confirms it."}
      description=${html`<span>Check each finding against its source. Citation chips open the cited page <${APP.SowRef} sec="intro" />.</span>`} />`;

    var draftTab = html`<div>
      ${detail.question ? html`<div style=${{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: tok.colorFillQuaternary, fontSize: 13 }}>
        <span style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextTertiary }}>Task</span><div>${detail.question}</div></div>` : null}
      ${detail.summary ? html`<div style=${{ marginBottom: 12 }}><${APP.CitedText} text=${detail.summary} cites=${cites} onOpen=${openCite} /></div>` : null}
      ${detail.sections.length ? detail.sections.map(function (sec, i) {
        return html`<${SectionCard} key=${rev.id + "-" + i} section=${sec} index=${i} review=${rev} cites=${cites} onOpenCite=${openCite} />`;
      }) : html`<${APP.EmptyHint} title="No sections in this draft" description="The summary above is the whole draft." />`}
    </div>`;
    var sourcesTab = cites.length ? html`<${A.Flex} vertical gap=${8}>${cites.map(function (c, i) {
      var cl = APP.findClause(c.doc, c.clause);
      var isActive = active[0] && citeKey(active[0]) === citeKey(c);
      return html`<div key=${i} role="button" tabIndex=${0} onClick=${function () { openCite(c); }} onKeyDown=${function (e) { if (e.key === "Enter") openCite(c); }}
        style=${{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, cursor: "pointer",
          border: "1px solid " + (isActive ? tok.colorPrimaryBorder : tok.colorBorderSecondary), background: isActive ? tok.colorPrimaryBg : "transparent" }}>
        <${APP.CitationChip} n=${i + 1} cite=${c} cites=${cites} onOpen=${openCite} active=${isActive} />
        <div style=${{ minWidth: 0 }}>
          <div style=${{ fontWeight: 500, fontSize: 13 }}>${APP.citeLabel(c)}</div>
          ${cl ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${cl.text.length > 160 ? cl.text.slice(0, 157) + "..." : cl.text}</div>` : null}
        </div>
      </div>`;
    })}<//>` : html`<${APP.EmptyHint} title="No sources attached" description="A draft without sources can't be confirmed in the build. Return it and ask for cited sources." />`;

    var leftTabs = html`<${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
      { key: "draft", label: "Draft", children: draftTab },
      { key: "sources", label: "Sources (" + cites.length + ")", children: sourcesTab },
      { key: "trace", label: "How it was made", children: html`<${APP.AnswerTrace} steps=${detail.trace || []} defaultOpen=${true} ghost=${false} />` },
      { key: "history", label: "History", children: html`<${ReviewHistory} review=${rev} />` }
    ]} />`;

    var facts = html`<${APP.KeyFacts} column=${{ xs: 1, sm: 2, md: 2, lg: 3 }} items=${[
      ["Requested by", html`<${APP.PersonTag} id=${rev.requesterId} showRole=${true} />`],
      ["Reviewer", html`<${APP.PersonTag} id=${rev.reviewerId} showRole=${true} />`],
      [pending ? "Due" : "Sent", pending ? html`<span>${fmt.dateTime(dueOf(rev))} <${APP.StatusTag} status=${fmt.dueStatus(dueOf(rev))} icon=${false} /></span>` : fmt.dateTime(rev.createdAt)],
      ["Linked item", html`<${RefLink} refId=${rev.ref} />`],
      ["Model", rev.modelName ? html`<${APP.ModelTag} name=${rev.modelName} />` : "None"],
      [rel ? "Release" : "Asked from", rel ? html`<span><a href="#approvals" className="mono" onClick=${function (e) { e.preventDefault(); APP.navigate("approvals", { id: rel.id }); }}>${rel.id}</a>${", " + rel.status.toLowerCase() + " by " + APP.personName(rel.decidedBy || rel.ownerId)}</span>` : html`<${SourceLink} source=${rev.source} />`]
    ]} />`;

    var footer = null;
    if (!locked && pending && isReviewer) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary, flex: "1 1 200px" }}>${nComments ? nComments + " comment" + (nComments > 1 ? "s" : "") + " added" : "Add inline comments on any section, or edit with tracked changes"}</span>
        <${A.Button} icon=${html`<${Icon} name="RollbackOutlined" />`} onClick=${function () { ret[1](true); }}>Return with comments<//>
        <${A.Button} type="primary" icon=${html`<${Icon} name="CheckOutlined" />`} onClick=${function () { confirm[1](true); }}>Confirm<//>
      </div>`;
    } else if (!locked && pending && isRequester) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary, flex: "1 1 200px" }}>${"With " + APP.personName(rev.reviewerId) + ". " + fmt.dueLabel(dueOf(rev)) + "."}</span>
        <${A.Popconfirm} title="Withdraw this draft from review?" okText="Withdraw" cancelText="Keep" onConfirm=${function () {
          updateReview(rev.id, { status: "Withdrawn", decidedAt: APP.nowIso(), decidedBy: pid, comment: "Withdrawn by the requester." });
          APP.audit({ action: "Review withdrawn", item: rev.id, detail: rev.title, dataClass: rev.dataClass });
          APP.notify({ to: [rev.reviewerId], kind: "info", title: "Withdrawn: " + rev.title, body: APP.personName(pid) + " withdrew the draft.", route: "reviews", params: { id: rev.id }, phase: rev.phase });
          APP.toast.info("Draft withdrawn from review.");
        }}><${A.Button}>Withdraw<//><//>
        <${A.Button} type="primary" icon=${html`<${Icon} name="UserSwitchOutlined" />`} onClick=${function () { switchTo(rev.reviewerId, "reviews", { id: rev.id }); }}>${"Switch to " + APP.personName(rev.reviewerId) + " to review"}<//>
      </div>`;
    } else if (!locked && pending) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary, flex: "1 1 200px" }}>${"Only " + APP.personName(rev.reviewerId) + " can confirm or return this draft. Nobody confirms their own work."}</span>
        <${A.Button} icon=${html`<${Icon} name="UserSwitchOutlined" />`} onClick=${function () { switchTo(rev.reviewerId, "reviews", { id: rev.id }); }}>${"Switch to " + APP.personName(rev.reviewerId)}<//>
      </div>`;
    } else if (!locked) {
      footer = html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
        ${rev.status === "Returned" && isRequester && rev.source && rev.source.route ? html`<${A.Button} type="primary" onClick=${function () { APP.navigate(rev.source.route, rev.source.params || {}); }}>Revise where it was made<//>` : null}
        ${rev.recordId ? html`<${A.Button} icon=${html`<${Icon} name="DatabaseOutlined" />`} onClick=${function () { APP.navigate("records", { id: rev.recordId }); }}>${"Open " + rev.recordId}<//>` : null}
        ${isReviewer && nextPending ? html`<${A.Button} type="primary" onClick=${function () { props.onOpen(nextPending.id); }}>${"Next waiting: " + nextPending.id}<//>` : null}
        <${A.Button} onClick=${props.onClose}>Close<//>
      </div>`;
    }

    var body = locked ? html`<${PhaseLockedItem} what="This review" />` : html`<div>
      <${A.Flex} vertical gap=${12} style=${{ marginBottom: 12 }}>${statusAlert}${facts}<//>
      ${wide && cites.length ? html`<${A.Splitter} style=${{ minHeight: 480 }}>
          <${A.Splitter.Panel} defaultSize="58%" min="40%" max="75%">
            <div style=${{ paddingRight: 16 }}>${leftTabs}</div>
          <//>
          <${A.Splitter.Panel}>
            <div style=${{ paddingLeft: 16, position: "sticky", top: 0 }}>
              <div style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextTertiary, margin: "12px 0 8px" }}>Source</div>
              <${APP.SourcePanel} cite=${active[0] || cites[0]} cites=${cites} height=${"calc(100vh - 430px)"} />
            </div>
          <//>
        <//>` : leftTabs}
    </div>`;

    return html`<${Fragment}>
      <${APP.DetailDrawer} open=${true} onClose=${props.onClose} size=${wide ? 1180 : 900}
        title=${rev.title} subtitle=${rev.id + " · " + rev.kind + " · sent by " + APP.personName(rev.requesterId) + " · " + fmt.relative(rev.createdAt)}
        tags=${html`<${Fragment}><${APP.StatusTag} status=${rev.status} /><${APP.DataClassTag} cls=${rev.dataClass} />${rev.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}<//>`}
        footer=${footer}>
        ${body}
      <//>
      <${ConfirmModal} open=${confirm[0]} review=${rev} onClose=${function () { confirm[1](false); }} />
      <${ReturnModal} open=${ret[0]} review=${rev} onClose=${function () { ret[1](false); }} />
    <//>`;
  }

  function ReviewsScreen(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var me = APP.persona(pid);
    var commentsPair = APP.useShared("ar.comments", {});
    var defScope = pid === "reviewer" ? "mine" : (pid === "admin" || pid === "auditor") ? "all" : "sent";
    var scopeSt = useState(null), tabSt = useState("waiting"), openSt = useState(null);
    useEffect(function () { scopeSt[1](null); tabSt[1]("waiting"); }, [pid]);
    useEffect(function () { if (props.params && props.params.id) openSt[1](props.params.id); }, [props.params && props.params.id, props.route && props.route.at]);
    var scope = scopeSt[0] || defScope;

    var all = s.reviews.filter(function (r) { return phaseOk(s, r); });
    var mine = all.filter(function (r) { return r.reviewerId === pid; });
    var sent = all.filter(function (r) { return r.requesterId === pid; });
    var scoped = scope === "mine" ? mine : scope === "sent" ? sent : all;
    var byTab = {
      waiting: scoped.filter(function (r) { return r.status === "Pending"; }),
      returned: scoped.filter(function (r) { return r.status === "Returned"; }),
      confirmed: scoped.filter(function (r) { return r.status === "Confirmed"; }),
      all: scoped
    };
    var rows = byTab[tabSt[0]] || scoped;
    var myPending = mine.filter(function (r) { return r.status === "Pending"; });
    var dueSoon = myPending.filter(function (r) { return fmt.daysUntil(dueOf(r)) <= 0; }).length;
    var week = all.filter(function (r) { return r.decidedAt && APP.now().diff(APP.dayjs(r.decidedAt), "day") <= 7; });
    var kinds = Array.from(new Set(all.map(function (r) { return r.kind; })));
    var requesters = Array.from(new Set(all.map(function (r) { return r.requesterId; })));

    var columns = [
      APP.col.id("ID", "id", { render: function (v, r) { return html`<span className="nowrap"><span className="mono">${v}</span>${r.live ? html`<${A.Tag} color="blue" style=${{ marginLeft: 6, marginInlineEnd: 0 }}>New<//>` : null}</span>`; } }),
      { title: "Draft", dataIndex: "title", key: "title", render: function (v, r) {
        return html`<div style=${{ minWidth: 220, maxWidth: 380 }}><div style=${{ fontWeight: 500 }}>${v}</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${r.kind}${r.ref ? " · " + r.ref : ""}</div></div>`;
      } },
      APP.col.person("Requested by", "requesterId"),
      APP.col.dataClass("Class", "dataClass"),
      { title: "Model", dataIndex: "modelName", key: "modelName", render: function (v) { return v ? html`<${APP.ModelTag} name=${v} />` : null; } },
      { title: "Due", key: "due", sorter: function (a, b) { return a.createdAt.localeCompare(b.createdAt); }, render: function (_, r) {
        if (r.status !== "Pending") return html`<span className="nowrap" style=${{ opacity: 0.7 }}>${"Decided " + fmt.relative(r.decidedAt)}</span>`;
        var d = dueOf(r);
        return html`<span className="nowrap"><${APP.StatusTag} status=${fmt.dueStatus(d)} icon=${false}>${fmt.dueLabel(d)}<//></span>`;
      } },
      { title: "Comments", key: "comments", align: "right", render: function (_, r) { var n = ((commentsPair[0] || {})[r.id] || []).length; return n ? html`<span><${Icon} name="CommentOutlined" /> ${n}</span>` : html`<span style=${{ opacity: 0.4 }}>0</span>`; } },
      { title: "Status", dataIndex: "status", key: "status", render: function (v, r) {
        return html`<${A.Flex} gap=${4} wrap="wrap"><${APP.StatusTag} status=${v === "Pending" ? "Pending review" : v} />${r.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}<//>`;
      } }
    ];

    return html`<div>
      <${APP.PageHeader} title="Reviews" phase=${1} sow=${["intro", "2.3", "3.7.2"]}
        subtitle="AI drafts waiting for a specialist reviewer. Nothing counts as final until a named person confirms it. Confirmed results are archived to Records."
        actions=${html`<${A.Button} icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${function () { APP.navigate("assistant", {}); }}>Open the assistant<//>`} />

      ${pid !== "reviewer" ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 16 }}
        message=${"You are " + me.name + ", " + me.role + ". Specialist reviewers confirm or return drafts."}
        title=${"You are " + me.name + ", " + me.role + ". Specialist reviewers confirm or return drafts."}
        description=${pid === "admin" || pid === "auditor" ? "You can read every review and its history." : "You see the drafts you sent and what the reviewer decided."}
        action=${html`<${A.Button} size="small" onClick=${function () { switchTo("reviewer"); }}>Switch to Li Wei<//>`} />` : null}

      <${A.Row} gutter=${[12, 12]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Waiting for you" value=${myPending.length} icon="FileDoneOutlined" warn=${myPending.length > 0}
          note=${pid === "reviewer" ? "Drafts to confirm or return" : "Only reviewers confirm"} onClick=${function () { scopeSt[1]("mine"); tabSt[1]("waiting"); }} /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Due today or overdue" value=${dueSoon} icon="ClockCircleOutlined" warn=${dueSoon > 0} note="Target: 2 working days" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Confirmed, last 7 days" value=${week.filter(function (r) { return r.status === "Confirmed"; }).length} icon="CheckCircleOutlined" note="Archived to Records"
          onClick=${function () { scopeSt[1]("all"); tabSt[1]("confirmed"); }} /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Returned, last 7 days" value=${week.filter(function (r) { return r.status === "Returned"; }).length} icon="RollbackOutlined" note="Sent back with comments"
          onClick=${function () { scopeSt[1]("all"); tabSt[1]("returned"); }} /><//>
      <//>

      <${A.Card} styles=${{ body: { paddingTop: 8 } }}>
        <${A.Flex} gap=${12} wrap="wrap" align="center" justify="space-between">
          <${A.Tabs} activeKey=${tabSt[0]} onChange=${tabSt[1]} style=${{ marginBottom: 0, minWidth: 0, maxWidth: "100%", flex: "1 1 260px" }} items=${[
            { key: "waiting", label: html`<span>Waiting <${A.Badge} count=${byTab.waiting.length} size="small" showZero=${false} style=${{ marginLeft: 4 }} /></span>` },
            { key: "returned", label: "Returned (" + byTab.returned.length + ")" },
            { key: "confirmed", label: "Confirmed (" + byTab.confirmed.length + ")" },
            { key: "all", label: "All (" + scoped.length + ")" }
          ]} />
          <${ScopeSwitch} value=${scope} onChange=${scopeSt[1]} options=${[
            { value: "mine", label: "Assigned to me (" + myPending.length + ")" },
            { value: "sent", label: "Sent by me (" + sent.length + ")" },
            { value: "all", label: "All" }
          ]} />
        <//>
        <${APP.DataTable} columns=${columns} data=${rows} onRowClick=${function (r) { openSt[1](r.id); }}
          searchKeys=${["id", "title", "kind", "ref", "modelName", function (r) { return APP.personName(r.requesterId); }]}
          searchPlaceholder="Search drafts, contracts or people"
          filters=${[
            { key: "kind", label: "Kind", options: kinds, width: 160 },
            { key: "dataClass", label: "Data class", options: ["Public", "Internal", "Sensitive", "Confidential"], width: 140 },
            { key: "requesterId", label: "Requested by", options: requesters.map(function (p) { return { value: p, label: APP.personName(p) }; }), width: 150 }
          ]}
          emptyTitle=${tabSt[0] === "waiting" ? "Nothing waiting" : "No drafts here"}
          emptyText=${tabSt[0] === "waiting" ? (scope === "mine" ? "Drafts sent to you for review appear here." : "Drafts you send for review appear here until a reviewer decides.") : "Try another tab or clear the filters."} />
      <//>

      ${openSt[0] ? html`<${ReviewDrawer} key=${openSt[0]} id=${openSt[0]} onOpen=${function (id) { openSt[1](id); }} onClose=${function () { openSt[1](null); }} />` : null}
    </div>`;
  }

  /* ------------------------------------------------------------------
     Register screens and search
     ------------------------------------------------------------------ */
  APP.registerScreen("approvals", { render: ApprovalsScreen });
  APP.registerScreen("reviews", { render: ReviewsScreen });

  APP.registerSearch({
    group: "Approvals and reviews",
    items: function (s) {
      return s.releaseRequests.map(function (r) {
        return { id: r.id, title: r.id + " " + r.title, subtitle: "Release request · " + r.status + " · " + APP.personName(r.requesterId), route: "approvals", params: { id: r.id }, phase: r.phase, icon: "SafetyCertificateOutlined" };
      }).concat(s.reviews.map(function (r) {
        return { id: r.id, title: r.id + " " + r.title, subtitle: "Review · " + r.status + " · " + r.kind, route: "reviews", params: { id: r.id }, phase: r.phase, icon: "FileDoneOutlined" };
      }));
    }
  });
})();
