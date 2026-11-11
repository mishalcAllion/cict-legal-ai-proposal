/* Screen area: assistant. Route "assistant": the chat.
   Conversation list, threads with streamed answers, citations into a source panel, masking review,
   release requests to the data owner, and Send for review. Cross-role items live in the shared store.
   Scripts and sample documents are in app/data/assistant.js. See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, Icon = APP.Icon, fmt = APP.fmt;
  var useState = APP.useState, useEffect = APP.useEffect, useMemo = APP.useMemo, useRef = APP.useRef, Fragment = APP.Fragment;
  var AD = D.assistantArea || { scripts: {}, modeSuggestions: {}, conversationSeeds: {}, translationEntities: [], translationSource: "", alignedRows: [] };
  var S = AD.scripts;
  var CON = "CON-2024-051";
  var CONV201 = APP.flows.CONTRACT_REVIEW_CONVERSATION;
  var KEY_THREADS = "assistant.threads", KEY_SEL = "assistant.selected", KEY_SEQ = "assistant.seq";

  /* Small stylesheet for hover states (inline, no external host). */
  (function () {
    try {
      if (document.getElementById("ast-style")) return;
      var st = document.createElement("style");
      st.id = "ast-style";
      st.textContent = ".ast-conv{border-radius:8px;padding:8px 10px;cursor:pointer;display:flex;gap:10px;align-items:flex-start;outline:none}" +
        ".ast-conv:hover,.ast-conv:focus-visible{background:rgba(127,127,127,.10)}" +
        ".ast-conv.is-active{background:rgba(31,95,191,.14)}" +
        ".ast-card{cursor:pointer;height:100%;transition:border-color .2s}" +
        ".ast-card.is-locked{cursor:not-allowed;opacity:.62}" +
        ".ast-thread .ant-collapse-header{padding-left:0!important}";
      document.head.appendChild(st);
    } catch (e) { /* hover styles are a convenience */ }
  })();

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  var MODE_ICONS = { "Ask": "MessageOutlined", "Review a contract": "FileSearchOutlined", "Draft": "EditOutlined", "Translate": "TranslationOutlined", "Check a policy": "ProfileOutlined" };
  var MODE_PLACEHOLDER = {
    "Ask": "Ask about a contract, record or policy",
    "Review a contract": "Attach a contract, or ask to review one from the register",
    "Draft": "Say what to draft and from which template",
    "Translate": "Paste a clause or attach a file to translate",
    "Check a policy": "Ask what a policy or checklist requires"
  };
  var RANK = { Public: 0, Internal: 1, Sensitive: 2, Confidential: 3 };
  var ACCESS = { legal: 2, owner: 3, reviewer: 2, compliance: 2, cosec: 3, admin: -1, auditor: -1 };
  var CLASS_REASON = {
    Public: "Published material only. No personal or commercial data found.",
    Internal: "Internal policies and registers. No prices, payment or personal data found.",
    Sensitive: "Contract prices, payment details or personal names found.",
    Confidential: "Board or major case material. Never leaves the CICT VPC."
  };
  var mid = 0;
  function uid(p) { mid += 1; return p + "-" + Date.now().toString(36) + "-" + mid; }
  function modelOf(id) { for (var i = 0; i < D.models.length; i++) if (D.models[i].id === id) return D.models[i]; return { id: id, name: id, host: "", where: "" }; }
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function plain(t) { return String(t || "").replace(/\s*\[\d+\]/g, "").replace(/\*\*/g, ""); }
  function canAsk(sc, pid) { if (sc.roles) return sc.roles.indexOf(pid) >= 0; return (ACCESS[pid] === undefined ? 1 : ACCESS[pid]) >= RANK[sc.dataClass]; }
  var MODULE_PERSONA = { "Board affairs": "cosec", "Compliance": "compliance", "Administration": "admin", "Knowledge base": "owner" };
  function bestPersonaFor(sc) {
    var order = [MODULE_PERSONA[sc.module] || "legal", "legal", "owner", "compliance", "cosec", "reviewer", "auditor", "admin"];
    for (var i = 0; i < order.length; i++) if (canAsk(sc, order[i])) return order[i];
    return null;
  }
  function attachmentFor(ref) {
    var doc = APP.getDocument(ref);
    if (doc) return { name: doc.file || doc.title + ".pdf", meta: doc.totalPages + " pages · " + doc.dataClass, ref: doc.id };
    var con = findById(D.contracts, ref);
    if (con) return { name: con.title + ", " + con.counterparty + ".pdf", meta: con.id + " · " + con.dataClass, ref: con.id };
    return { name: ref, meta: "", ref: ref };
  }
  function firstClauseCite(docId) {
    var doc = APP.getDocument(docId);
    if (!doc || !doc.pages.length) return null;
    return { doc: doc.id, clause: doc.pages[0].clauses[0].id, page: doc.pages[0].n };
  }
  function entityGroups(ents) {
    var g = {};
    ents.forEach(function (e) { g[e.type] = (g[e.type] || 0) + 1; });
    return Object.keys(g).map(function (k) { return { type: k, n: g[k] }; });
  }
  function sumPlaces(ents) { return ents.reduce(function (a, e) { return a + (e.count || 0); }, 0); }

  /* ------------------------------------------------------------------
     Threads: seeded from APP_DATA.conversations, stored in store.ext (shared, survives route changes)
     ------------------------------------------------------------------ */
  var SEED = null;
  function seedThreads() {
    if (SEED) return SEED;
    var map = {};
    D.conversations.forEach(function (c) {
      var seed = AD.conversationSeeds[c.id];
      var sc = seed && S[seed.script];
      if (!sc) return;
      var t0 = APP.dayjs(c.updated);
      var msgs = [{ id: c.id + "-u1", role: "user", text: sc.question, at: t0.subtract(2, "minute").format("YYYY-MM-DDTHH:mm:ss"), attachments: [] }];
      if (seed.releaseId) {
        msgs.push({ id: c.id + "-m1", role: "assistant", kind: "masking", scriptId: sc.id, releaseId: seed.releaseId, checked: true, route: "bedrock", resolved: "release", at: t0.subtract(1, "minute").format("YYYY-MM-DDTHH:mm:ss") });
      } else {
        msgs.push({ id: c.id + "-a1", role: "assistant", kind: "answer", scriptId: sc.id, status: "done", modelId: sc.modelId, reviewId: seed.reviewId || null, at: c.updated + ":00" });
      }
      map[c.id] = { id: c.id, personaId: c.personaId, title: c.title, mode: c.mode, module: c.module, phase: c.phase, updated: c.updated + ":00", dataClass: sc.dataClass, messages: msgs };
    });
    SEED = map;
    return map;
  }
  function getThreads() { return APP.store.getState().ext[KEY_THREADS] || seedThreads(); }
  function mutate(fn) { APP.actions.patch(KEY_THREADS, function (prev) { return fn(prev || seedThreads()); }); }
  function updThread(id, fn) { mutate(function (m) { if (!m[id]) return m; var n = Object.assign({}, m); n[id] = fn(m[id]); return n; }); }
  function createThread(t) { mutate(function (m) { var n = Object.assign({}, m); n[t.id] = t; return n; }); }
  function removeThread(id) { mutate(function (m) { var n = Object.assign({}, m); delete n[id]; return n; }); }
  function addMessages(tid, msgs, patch) {
    updThread(tid, function (t) { return Object.assign({}, t, patch || {}, { messages: t.messages.concat(msgs), updated: APP.nowIso() }); });
  }
  function updMessage(tid, mId, patch) {
    updThread(tid, function (t) { return Object.assign({}, t, { messages: t.messages.map(function (m) { return m.id === mId ? Object.assign({}, m, patch) : m; }) }); });
  }
  function nextConvId() {
    var n = (APP.store.getState().ext[KEY_SEQ] || 300) + 1;
    APP.actions.patch(KEY_SEQ, n);
    return "CONV-" + n;
  }
  function selectedFor(s, pid) { var m = s.ext[KEY_SEL] || {}; return m[pid] === undefined ? null : m[pid]; }
  function setSelected(pid, id) { APP.actions.patch(KEY_SEL, function (prev) { var n = Object.assign({}, prev || {}); n[pid] = id; return n; }); }
  function contractThreadShell(cid, pid) {
    return { id: cid, personaId: pid, title: "Contract review: crane maintenance agreement", mode: "Review a contract", module: "Contracts", phase: 1, updated: APP.nowIso(), dataClass: "Sensitive", messages: [] };
  }
  function answerMsg(sc, extra) {
    return Object.assign({ id: uid("a"), role: "assistant", kind: "answer", scriptId: sc.id, status: "new", modelId: sc.modelId, at: APP.nowIso() }, extra || {});
  }

  /* Release input for the translation script (contract review uses APP.flows.contractReviewRelease). */
  function translationRelease(convId, methods) {
    var ents = AD.translationEntities;
    methods = methods || {};
    return {
      title: "Translate clause 12, Coral Bay supply agreement", dataClass: "Sensitive", modelId: "m-qwen-br", destination: "Qwen on Bedrock (PrivateLink, ap-south-1)",
      purpose: "Draft an English translation of a Chinese liability clause", ref: "CON-2025-087", phase: 2,
      source: { route: "assistant", params: { conversationId: convId } },
      payload: { question: "Translate clause 12 into English and flag unclear terms.",
        passages: [{ source: "[CONTRACT-2], clause 12, page 6", text: APP.maskText(AD.translationSource, ents, methods) }],
        attachments: [{ name: "Clause 12 extract (masked).docx", note: "1 page" }] },
      entities: ents.map(function (e) { return { type: e.type, original: e.text, replacement: APP.maskValue(e, methods[e.id]), count: e.count }; }),
      unscanned: []
    };
  }
  function releaseInputFor(sc, convId, methods) {
    return sc.flow === "contract-review" ? APP.flows.contractReviewRelease({ conversationId: convId, methods: methods || {} }) : translationRelease(convId, methods);
  }

  /* Keyword matching of free text to a script. */
  function matchScript(text, mode, atts) {
    var q = String(text || "").toLowerCase().trim();
    var best = null, bestScore = 0;
    Object.keys(S).forEach(function (id) {
      var sc = S[id], score = 0;
      if (q && q === sc.question.toLowerCase()) score += 100;
      sc.keywords.forEach(function (k) { if (q.indexOf(k.toLowerCase()) >= 0) score += k.indexOf(" ") > 0 ? 2 : 1; });
      if (score > 0 && (sc.mode === mode || (sc.altModes || []).indexOf(mode) >= 0)) score += 1;
      (atts || []).forEach(function (a) { if (a.ref && (a.ref === sc.ref || (a.ref === CON && sc.flow === "contract-review"))) score += mode === "Review a contract" && sc.flow === "contract-review" ? 4 : 1; });
      if (score > bestScore) { bestScore = score; best = sc; }
    });
    return bestScore >= 2 ? best : null;
  }
  function suggestionsFor(mode, pid) {
    var ids = AD.modeSuggestions[mode] || [];
    return ids.map(function (id) { return S[id]; }).filter(function (sc) { return sc && canAsk(sc, pid); });
  }

  /* Review lookups */
  function reviewFor(s, t, m) {
    var sc = S[m.scriptId] || {};
    for (var i = 0; i < s.reviews.length; i++) if (s.reviews[i].messageId === m.id) return s.reviews[i];
    if (m.reviewId) { var r = findById(s.reviews, m.reviewId); if (r) return r; }
    if (sc.flow === "contract-review") {
      for (var j = 0; j < s.reviews.length; j++) {
        var rv = s.reviews[j];
        if (rv.live && !rv.messageId && rv.kind === "Contract review" && rv.source && rv.source.params && rv.source.params.conversationId === t.id) return rv;
      }
    }
    return null;
  }

  /* How this answer was made */
  function traceFor(s, sc, m) {
    var rel = m.releaseId ? findById(s.releaseRequests, m.releaseId) : null;
    if (sc.flow === "contract-review" && rel) return APP.flows.contractReviewTrace(rel);
    var model = modelOf(m.modelId);
    var selfHosted = model.host === "Self-hosted";
    var docs = [];
    sc.cites.forEach(function (c) { if (docs.indexOf(c.doc) < 0) docs.push(c.doc); });
    var steps = [{ label: "Classified as " + sc.dataClass, detail: CLASS_REASON[sc.dataClass], status: "done" }];
    if (selfHosted) {
      steps.push({ label: "No masking needed", detail: "Runs on a self-hosted model inside the CICT VPC, so nothing leaves it.", status: "done" });
      steps.push({ label: "No release needed", detail: sc.dataClass === "Confidential" ? "Confidential content is only ever sent to self-hosted models." : "Release is only needed to send masked content to Bedrock.", status: "done" });
    } else if (sc.dataClass === "Sensitive") {
      var ents = sc.flow === "contract-review" ? D.maskingEntities[CON] : AD.translationEntities;
      steps.push({ label: ents.length + " sensitive items masked in " + sumPlaces(ents) + " places", detail: "Rules v1.4. Each party keeps the same stand-in, such as [PARTY-B].", status: "done" });
      steps.push({ label: rel && rel.status === "Approved" ? "Released by " + APP.personName(rel.decidedBy) + " at " + fmt.time(rel.decidedAt) : "Release requested from the data owner",
        detail: (rel ? rel.id + ". " : "") + "Masking alone is not permission to send.", status: rel && rel.status === "Approved" ? "done" : "wait" });
    } else {
      steps.push({ label: "Checked for sensitive data", detail: "The masking detector found nothing to mask. " + sc.dataClass + " content may go to Bedrock without a release.", status: "done" });
    }
    steps.push({ label: "Routed to " + model.name, detail: model.where + (selfHosted ? ". Allowed for " + sc.dataClass + " content." : ". Allowed for " + sc.dataClass + (sc.dataClass === "Sensitive" ? " content after masking and release." : " content.")), status: "done" });
    steps.push({ label: sc.cites.length + " passages retrieved from " + docs.length + (docs.length === 1 ? " document" : " documents"),
      detail: docs.map(function (d) { var doc = APP.getDocument(d); return doc ? doc.title : d; }).join("; ") + ". Only sources you may see, in force on 10 Nov 2026.", status: "done" });
    steps.push({ label: "Rules checked", detail: sc.rules || "Dates and amounts checked by rule.", status: "done" });
    if (sc.warnings && sc.warnings.length) steps.push({ label: "Evidence gap flagged", detail: sc.warnings[0], status: "warn" });
    if (!selfHosted && sc.dataClass === "Sensitive") steps.push({ label: "Names restored inside the CICT VPC", detail: "Stand-ins swapped back for authorised viewers only.", status: "done" });
    return steps;
  }

  /* ------------------------------------------------------------------
     Streaming answer body
     ------------------------------------------------------------------ */
  function Streamer(props) {
    var s = APP.useStreamingText(props.text, { interval: 26, onDone: props.onDone });
    var ref = useRef(s);
    ref.current = s;
    useEffect(function () {
      props.registerStop(function () { var t = ref.current.text; ref.current.stop(); props.onStopped(t); });
      return function () { props.registerStop(null); };
    }, []);
    return html`<div className=${s.streaming ? "stream-caret" : undefined}><${APP.CitedText} text=${s.text} cites=${props.cites} onOpen=${props.onOpen} /></div>`;
  }
  function StreamingBody(props) {
    var labels = props.prep && props.prep.length ? props.prep : ["Thinking"];
    var phase = useState("prep"), idx = useState(0);
    useEffect(function () {
      var i = 0, started = false;
      props.registerStop(function () { props.onStopped(""); });
      var t = setInterval(function () {
        i += 1;
        if (i >= labels.length) { clearInterval(t); started = true; phase[1]("stream"); } else idx[1](i);
      }, 700);
      return function () { clearInterval(t); if (!started) props.registerStop(null); };
    }, []);
    if (phase[0] === "prep") return html`<${APP.TypingIndicator} label=${labels[idx[0]] + "..."} />`;
    return html`<${Streamer} text=${props.text} cites=${props.cites} onOpen=${props.onOpen} onDone=${props.onDone} onStopped=${props.onStopped} registerStop=${props.registerStop} />`;
  }

  /* ------------------------------------------------------------------
     Answer extras
     ------------------------------------------------------------------ */
  function FindingsExtra(props) {
    var tok = A.theme.useToken().token;
    var findings = D.reviewFindings[CON] || [];
    var n = 0;
    var items = findings.map(function (f) {
      var start = n; n += f.cites.length;
      return {
        key: f.id,
        label: html`<span style=${{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><${APP.StatusTag} status=${f.severity} /><span>${f.title}</span></span>`,
        children: html`<div style=${{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
          <div><b>Fact. </b>${f.fact}</div>
          <div><b>Assessment. </b>${f.assessment}</div>
          <div><b>Proposed action. </b>${f.action}</div>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}><span style=${{ color: tok.colorTextSecondary }}>Sources</span>
            ${f.cites.map(function (c, i) { return html`<${APP.CitationChip} key=${i} n=${start + i + 1} cite=${c} cites=${props.cites} onOpen=${props.onOpen} />`; })}</div>
          ${f.proposed ? html`<div style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: "8px 10px", background: tok.colorFillQuaternary }}>
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 4 }}>Proposed wording</div>
            <${APP.Redline} before=${f.proposed.before} after=${f.proposed.after} />
          </div>` : null}
        </div>`
      };
    });
    return html`<div style=${{ marginTop: 10 }}>
      <div style=${{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Findings, fact separated from assessment <${APP.SowRef} sec="3.1.3" /></div>
      <${A.Collapse} size="small" items=${items} />
    </div>`;
  }
  function AlignedExtra() {
    return html`<div style=${{ marginTop: 10 }}>
      <div style=${{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Aligned clause and checks <${APP.SowRef} sec="3.2.3" /></div>
      <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="key" dataSource=${AD.alignedRows} columns=${[
        { title: "Source (Chinese)", dataIndex: "source", render: function (v) { return html`<span lang="zh" style=${{ display: "block", minWidth: 200 }}>${v}</span>`; } },
        { title: "Translation (English)", dataIndex: "target", render: function (v) { return html`<span style=${{ display: "block", minWidth: 220 }}>${v}</span>`; } },
        { title: "Checks", dataIndex: "checks", render: function (v) { return html`<div style=${{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>${v.map(function (c, i) { return html`<span key=${i}><${APP.StatusTag} status=${c[0]} icon=${false} /> ${c[1]}</span>`; })}</div>`; } }
      ]} /></div>
      <div style=${{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <${A.Button} size="small" onClick=${function () { APP.toast.build("In the build, the same clause is translated into Sinhala with the Sinhala termbase entries, and unclear terms are flagged."); }}>Also translate into Sinhala<//>
        <${A.Button} size="small" onClick=${function () { APP.toast.build("In the build, the translation downloads as a Word file with source and translation side by side."); }}>Download side by side<//>
      </div>
    </div>`;
  }
  function DraftFileExtra() {
    return html`<div style=${{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <${APP.FileChip} name="Security services agreement, Bluewater, draft 1.docx" meta="12 pages · Internal · from template v3"
        onClick=${function () { APP.toast.build("In the build, the draft opens in Word with every change from the template tracked."); }} />
      <${A.Button} size="small" onClick=${function () { APP.toast.build("In the build, you see the draft against template v3 as a redline before anything is sent."); }}>Compare with template<//>
    </div>`;
  }
  function MatchExtra() {
    return html`<div style=${{ marginTop: 10 }}>
      <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
        ["Result", html`<${APP.StatusTag} status="Possible match" />`],
        ["Closest entry", "EASTGATE SHIPPING (sample, EU list)"],
        ["Match on", "Alias, 78%"],
        ["Lists refreshed", "10 Nov 2026, 06:00"]
      ]} />
    </div>`;
  }

  /* ------------------------------------------------------------------
     Review status bar under an answer
     ------------------------------------------------------------------ */
  function ReviewBar(props) {
    var tok = A.theme.useToken().token;
    var rev = props.review, pid = props.pid;
    if (!rev) return null;
    var decider = rev.decidedBy || rev.reviewerId;
    var tone = rev.status === "Pending" ? tok.colorPrimaryBg : rev.status === "Confirmed" ? tok.colorSuccessBg : tok.colorWarningBg;
    var border = rev.status === "Pending" ? tok.colorPrimaryBorder : rev.status === "Confirmed" ? tok.colorSuccessBorder : tok.colorWarningBorder;
    var body;
    if (rev.status === "Pending") {
      body = html`<span>Sent for review as <b className="mono">${rev.id}</b> ${fmt.relative(rev.createdAt).toLowerCase()}. Waiting for <b>${APP.personName(rev.reviewerId)}</b> to confirm or return it.</span>`;
    } else if (rev.status === "Confirmed") {
      body = html`<span>Confirmed by <b>${APP.personName(decider)}</b> at ${fmt.time(rev.decidedAt)}${rev.comment ? ': "' + rev.comment + '"' : "."}${rev.recordId ? " Archived as " : ""}${rev.recordId ? html`<a onClick=${function () { APP.navigate("records", { id: rev.recordId }); }}>${rev.recordId}</a>` : null}${rev.recordId ? "." : ""}</span>`;
    } else {
      body = html`<span>Returned by <b>${APP.personName(decider)}</b> at ${fmt.time(rev.decidedAt)}: "${rev.comment || "see comments"}"</span>`;
    }
    return html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 8, border: "1px solid " + border, background: tone, fontSize: 13, marginTop: 8 }}>
      <${Icon} name=${rev.status === "Pending" ? "ClockCircleOutlined" : rev.status === "Confirmed" ? "CheckCircleOutlined" : "RollbackOutlined"} />
      <div style=${{ flex: "1 1 260px", minWidth: 0 }}>${body}</div>
      ${rev.status === "Pending" && pid !== rev.reviewerId ? html`<${A.Button} size="small" type="dashed" icon=${html`<${Icon} name="UserSwitchOutlined" />`}
        onClick=${function () { APP.setPersona(rev.reviewerId); APP.navigate("reviews", { id: rev.id }); APP.toast.info("You are now " + APP.personName(rev.reviewerId) + ", Specialist reviewer."); }}>${"Switch to " + APP.personName(rev.reviewerId) + " to review"}<//>` : null}
      ${rev.status === "Returned" && props.onResend ? html`<${A.Button} size="small" onClick=${props.onResend}>Revise and resend<//>` : null}
      ${rev.status === "Confirmed" && rev.recordId ? html`<${A.Button} size="small" onClick=${function () { APP.navigate("records", { id: rev.recordId }); }}>Open record<//>` : null}
    </div>`;
  }

  /* ------------------------------------------------------------------
     Messages
     ------------------------------------------------------------------ */
  function AnswerMessage(props) {
    var tok = A.theme.useToken().token;
    var t = props.thread, m = props.msg, s = props.state, pid = props.pid;
    var sc = S[m.scriptId];
    if (!sc) return null;
    var phase2On = s.ui.phaseMode === "both";
    var rev = reviewFor(s, t, m);
    var openCite = function (cite, n) { props.onOpenCite({ cite: cite, cites: sc.cites, n: n, msgId: m.id }); };
    var activeN = props.activeSource && props.activeSource.msgId === m.id ? props.activeSource.n : null;
    var done = m.status === "done" || m.status === "stopped";
    var reviewTag = rev ? html`<${APP.StatusTag} status=${rev.status === "Pending" ? "Pending review" : rev.status} />` : html`<${APP.StatusTag} status="Draft" />`;
    var badges = html`<${Fragment}>
      <${APP.DataClassTag} cls=${sc.dataClass} />
      <${APP.ModelTag} id=${m.modelId} />
      ${sc.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
      ${done ? reviewTag : null}
    <//>`;

    var body;
    if (m.status === "new") {
      body = html`<${StreamingBody} key=${m.id + "-s"} text=${sc.answer} cites=${sc.cites} prep=${sc.prep} onOpen=${openCite} registerStop=${props.registerStop}
        onDone=${function () { updMessage(t.id, m.id, { status: "done", at: APP.nowIso() }); if (sc.flow === "contract-review") APP.tour.mark("answer"); }}
        onStopped=${function (partial) { updMessage(t.id, m.id, { status: "stopped", partial: partial }); }} />`;
    } else if (m.status === "stopped") {
      body = html`<div>
        ${m.partial ? html`<${APP.CitedText} text=${m.partial} cites=${sc.cites} onOpen=${openCite} active=${activeN} />` : null}
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>Stopped. The answer is incomplete.</span>
          <${A.Button} size="small" onClick=${function () { updMessage(t.id, m.id, { status: "new", partial: null }); }}>Generate again<//>
        </div>
      </div>`;
    } else {
      body = html`<${APP.CitedText} text=${sc.answer} cites=${sc.cites} onOpen=${openCite} active=${activeN} />`;
    }

    var sendReview = function () {
      if (pid === "reviewer") { APP.toast.info("Reviewers can't review their own requests. In the build, it goes to another specialist reviewer."); return; }
      var input;
      if (sc.flow === "contract-review") {
        input = APP.flows.contractReviewReview({ conversationId: t.id, releaseId: m.releaseId });
        input.modelName = modelOf(m.modelId).name;
      } else {
        input = { title: (sc.review && sc.review.title) || sc.title, kind: (sc.review && sc.review.kind) || "Assistant answer", ref: sc.ref, dataClass: sc.dataClass,
          modelName: modelOf(m.modelId).name, phase: sc.phase, archiveCategory: (sc.review && sc.review.kind) || "Assistant answer",
          source: { route: "assistant", params: { conversationId: t.id } },
          content: { summary: (sc.review && sc.review.summary) || plain(sc.answer).split("\n")[0], sections: [{ heading: "Draft answer", text: plain(sc.answer) }] },
          citations: sc.cites };
      }
      input.messageId = m.id; input.conversationId = t.id; input.question = sc.question;
      var r = APP.createReview(input);
      APP.toast.success("Sent to " + APP.personName(r.reviewerId) + " for review as " + r.id + ".");
    };
    var resend = function () {
      var prev = rev;
      var r = APP.createReview({ title: prev.title + " (revised)", kind: prev.kind, ref: prev.ref, dataClass: prev.dataClass, modelName: prev.modelName, phase: prev.phase,
        source: prev.source, content: prev.content, citations: prev.citations, messageId: m.id + "-r" + Date.now(), conversationId: t.id, archiveCategory: prev.archiveCategory });
      APP.toast.success("Revised draft sent to " + APP.personName(r.reviewerId) + " as " + r.id + ".");
    };
    var copy = function () {
      var txt = plain(sc.answer) + "\n\nSources:\n" + sc.cites.map(function (c, i) { return (i + 1) + ". " + APP.citeLabel(c); }).join("\n") + "\n\nDraft. Not confirmed by a reviewer.";
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { APP.toast.success("Copied with its sources and a draft label."); }, function () { APP.toast.info("Copy is blocked in this browser. In the build, the answer copies with its sources."); });
        else APP.toast.info("Copy is blocked in this browser. In the build, the answer copies with its sources.");
      } catch (e) { APP.toast.info("Copy is blocked in this browser. In the build, the answer copies with its sources."); }
    };
    var openOk = sc.open && (!APP.screens[sc.open.route] || APP.screens[sc.open.route].phase !== 2 || phase2On);

    var footer = done && m.status === "done" ? html`<div>
      ${(sc.warnings || []).map(function (w, i) { return html`<${A.Alert} key=${i} type="warning" showIcon style=${{ marginBottom: 8 }} message=${w} title=${w} />`; })}
      ${sc.extra === "findings" ? html`<${FindingsExtra} cites=${sc.cites} onOpen=${openCite} />` : null}
      ${sc.extra === "aligned" ? html`<${AlignedExtra} />` : null}
      ${sc.extra === "draftFile" ? html`<${DraftFileExtra} />` : null}
      ${sc.extra === "match" ? html`<${MatchExtra} />` : null}
      <div className="ast-thread" style=${{ marginTop: 4 }}><${APP.AnswerTrace} steps=${traceFor(s, sc, m)} /></div>
      <${ReviewBar} review=${rev} pid=${pid} onResend=${resend} />
    </div>` : null;

    var liked = m.feedback === "up", disliked = m.feedback === "down";
    var actions = done && m.status === "done" ? html`<${Fragment}>
      <${A.Tooltip} title="Helpful"><${A.Button} size="small" type="text" aria-label="Helpful" icon=${html`<${Icon} name=${liked ? "LikeFilled" : "LikeOutlined"} />`}
        onClick=${function () { updMessage(t.id, m.id, { feedback: liked ? null : "up" }); if (!liked) APP.toast.success("Thanks. Feedback goes to the quality log the administrator reviews."); }} /><//>
      <${A.Tooltip} title="Not helpful"><${A.Button} size="small" type="text" aria-label="Not helpful" icon=${html`<${Icon} name=${disliked ? "DislikeFilled" : "DislikeOutlined"} />`}
        onClick=${function () { if (disliked) updMessage(t.id, m.id, { feedback: null }); else props.onDislike(t, m); }} /><//>
      <${A.Tooltip} title="Copy with sources"><${A.Button} size="small" type="text" aria-label="Copy" icon=${html`<${Icon} name="CopyOutlined" />`} onClick=${copy} /><//>
      <${A.Tooltip} title="Generate again from the same sources"><${A.Button} size="small" type="text" aria-label="Generate again" icon=${html`<${Icon} name="RedoOutlined" />`}
        onClick=${function () { updMessage(t.id, m.id, { status: "new", feedback: null }); }} disabled=${!!rev} /><//>
      ${rev ? null : html`<${A.Button} size="small" icon=${html`<${Icon} name="FileDoneOutlined" />`} onClick=${sendReview}>Send for review<//>`}
      ${openOk ? html`<${A.Button} size="small" type="link" icon=${html`<${Icon} name="ExportOutlined" />`} onClick=${function () { APP.navigate(sc.open.route, sc.open.params); }}>${sc.open.label}<//>` : null}
    <//>` : null;

    var followups = done && m.status === "done" && props.isLast && sc.followups && sc.followups.length ? html`<div style=${{ marginTop: 10 }}>
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 6 }}>Suggested follow-ups</div>
      <${SuggestionChips} ids=${sc.followups} pid=${pid} phase2On=${phase2On} onAsk=${props.onAsk} />
    </div>` : null;

    return html`<${APP.ChatMessage} role="assistant" badges=${badges} time=${fmt.time(m.at)}
      footer=${html`<${Fragment}>${footer}${followups}<//>`} actions=${actions}>${body}<//>`;
  }

  function MaskingDrawer(props) {
    var t = props.thread, m = props.msg, sc = props.script, pid = props.pid;
    var isCR = sc.flow === "contract-review";
    var ents = isCR ? D.maskingEntities[CON] : AD.translationEntities;
    var init = {};
    ents.forEach(function (e) { init[e.id] = e.method || "placeholder"; });
    var methods = m.methods || init;
    var preview = Object.assign({ requesterId: pid, ownerId: "owner" }, releaseInputFor(sc, t.id, methods));
    var readOnly = !!m.releaseId || !!m.resolved;
    var tabs = [
      { key: "mask", label: "Original and masked", children: isCR
        ? html`<${APP.MaskingCompare} docId=${CON} methods=${methods} readOnly=${readOnly} onMethodsChange=${function (n) { updMessage(t.id, m.id, { methods: n }); }} height=${300} />`
        : html`<${APP.MaskingCompare} text=${AD.translationSource} entities=${ents} methods=${methods} readOnly=${readOnly} onMethodsChange=${function (n) { updMessage(t.id, m.id, { methods: n }); }} height=${200} />` },
      { key: "where", label: "Where it looked", children: html`<${A.Flex} vertical gap=${8}>
        ${(isCR ? APP.MASKING_LOCATIONS : [
          { where: "Body text", status: "Done", detail: "Checked, 2 items found" }, { where: "Comments", status: "Done", detail: "None in the file" },
          { where: "Tracked changes", status: "Done", detail: "None in the file" }, { where: "File properties", status: "Done", detail: "Author field cleared" }
        ]).map(function (l, i) {
          return html`<div key=${i} style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><span style=${{ minWidth: 130, fontWeight: 500 }}>${l.where}</span><${APP.StatusTag} status=${l.status} /><span style=${{ fontSize: 13, opacity: 0.75 }}>${l.detail}</span></div>`;
        })}
        <div style=${{ fontSize: 12, opacity: 0.7 }}>Anything that can't be read is flagged for a manual check, never skipped <${APP.SowRef} sec="1.4" /></div>
      <//>` },
      { key: "payload", label: "Outbound payload", children: html`<${APP.PayloadPreview} request=${preview} showOriginal=${true} />` }
    ];
    return html`<${APP.DetailDrawer} open=${props.open} onClose=${props.onClose} size=${820} title="Masking review" subtitle=${sc.title}
      tags=${html`<${APP.DataClassTag} cls="Sensitive" />`}
      footer=${readOnly ? html`<span style=${{ fontSize: 12, opacity: 0.7 }}>Methods are locked once a release has been requested.</span>`
        : html`<span style=${{ fontSize: 12, opacity: 0.7 }}>Change a method and the payload preview updates. The data owner sees exactly this payload.</span>`}>
      <${A.Tabs} items=${tabs} />
    <//>`;
  }

  function MaskingMessage(props) {
    var tok = A.theme.useToken().token;
    var t = props.thread, m = props.msg, s = props.state, pid = props.pid;
    var sc = S[m.scriptId];
    var drawer = useState(false);
    if (!sc) return null;
    var isCR = sc.flow === "contract-review";
    var ents = isCR ? D.maskingEntities[CON] : AD.translationEntities;
    var rel = m.releaseId ? findById(s.releaseRequests, m.releaseId) : null;
    var answered = t.messages.some(function (x) { return x.kind === "answer" && x.parent === m.id; });
    var route = m.route || "bedrock";
    var model = modelOf(sc.modelId);
    var groups = entityGroups(ents);
    var canRelease = !isCR || m.checked;

    var request = function () {
      var r = APP.createReleaseRequest(releaseInputFor(sc, t.id, m.methods));
      updMessage(t.id, m.id, { releaseId: r.id, resolved: "release" });
      if (isCR) APP.tour.mark("ask");
      APP.toast.success("Release request " + r.id + " sent to " + APP.personName(r.ownerId) + ", Data owner.");
    };
    var runSelf = function () {
      updMessage(t.id, m.id, { resolved: m.releaseId ? "release" : "self" });
      addMessages(t.id, [answerMsg(sc, { modelId: "m-qwen-sh", parent: m.id, selfHosted: true })]);
    };

    var stepCurrent = rel ? (rel.status === "Approved" ? 4 : 3) : m.resolved === "self" ? 4 : 2;
    var steps = [
      { title: "Classified", description: "Sensitive" },
      { title: "Masked", description: ents.length + " items, " + sumPlaces(ents) + " places" },
      { title: isCR ? "Checked by hand" : "Checked", description: isCR ? "Image, page 7" : "All parts read" },
      { title: m.resolved === "self" ? "Self-hosted" : "Release", description: m.resolved === "self" ? "No release needed" : rel ? rel.status : "Data owner" }
    ];

    var interactive = !rel && !m.resolved;
    return html`<${APP.ChatMessage} role="assistant" time=${fmt.time(m.at)}
      badges=${html`<${Fragment}><${APP.DataClassTag} cls="Sensitive" /><${A.Tag} icon=${html`<${Icon} name="SafetyOutlined" />`} style=${{ marginInlineEnd: 0 }}>Before sending<//>${sc.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}<//>`}>
      <div style=${{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>${isCR
          ? "Before anything leaves the CICT VPC, I classified the agreement as Sensitive: it holds the contract price, a bank account and personal names. I masked them for review."
          : "The clause comes from a Sensitive contract: it names the supplier and the contract number. I masked both before any external model sees it."}
          ${" "}<${APP.SowRef} sec="1.4" /></div>
        <${A.Steps} size="small" current=${stepCurrent} status=${rel && rel.status === "Rejected" ? "error" : rel && rel.status === "Pending" ? "process" : undefined} items=${steps} />
        <div style=${{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          ${groups.map(function (g) { return html`<${A.Tag} key=${g.type} style=${{ marginInlineEnd: 0 }}>${g.type + (g.n > 1 ? " x" + g.n : "")}<//>`; })}
          <${A.Button} size="small" type="link" icon=${html`<${Icon} name="EyeOutlined" />`} onClick=${function () { drawer[1](true); }}>Review masking<//>
        </div>
        ${interactive && isCR ? html`<${A.Checkbox} checked=${!!m.checked} onChange=${function (e) { updMessage(t.id, m.id, { checked: e.target.checked }); }}>
          I checked the image on page 7 by hand. It shows the crane model plate only, with no sensitive data.<//>` : null}
        ${interactive ? html`<div>
          <div style=${{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Where should this run? <${APP.SowRef} sec="2.4" /></div>
          <${A.Radio.Group} value=${route} onChange=${function (e) { updMessage(t.id, m.id, { route: e.target.value }); }}>
            <${A.Flex} vertical gap=${6}>
              <${A.Radio} value="bedrock">${model.name + ", masked."} <span style=${{ color: tok.colorTextSecondary }}>Needs release by S. Silva, Data owner.</span><//>
              <${A.Radio} value="self">Qwen (self-hosted), unmasked. <span style=${{ color: tok.colorTextSecondary }}>Stays inside the CICT VPC. No release needed.</span><//>
            <//>
          <//>
        </div>` : null}
        ${interactive ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          ${route === "bedrock" ? html`<${A.Tooltip} title=${canRelease ? null : "Tick the manual check first"}>
            <${A.Button} type="primary" icon=${html`<${Icon} name="SendOutlined" />`} disabled=${!canRelease} onClick=${request}>Request release<//><//>`
            : html`<${A.Button} type="primary" icon=${html`<${Icon} name="CloudServerOutlined" />`} onClick=${runSelf}>Run on the self-hosted model<//>`}
          <${A.Button} onClick=${function () { drawer[1](true); }}>Preview what will be sent<//>
        </div>` : null}
        ${m.resolved === "self" && !rel ? html`<div style=${{ fontSize: 13 }}><${Icon} name="CloudServerOutlined" /> Running on Qwen (self-hosted), unmasked. Nothing leaves the CICT VPC, so no release is needed.</div>` : null}
        ${rel ? html`<${APP.ApprovalCard} requestId=${rel.id} demoSwitch=${true} />` : null}
        ${rel && rel.status === "Rejected" && !answered ? html`<${A.Alert} type="info" showIcon
          message="Run it inside the CICT VPC instead" title="Run it inside the CICT VPC instead"
          description=${html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><span>You can run the same task on the self-hosted model, unmasked. It never leaves the CICT VPC, so it needs no release.</span>
            <${A.Button} size="small" type="primary" onClick=${runSelf}>Run on the self-hosted model<//></div>`} />` : null}
      </div>
      <${MaskingDrawer} open=${drawer[0]} onClose=${function () { drawer[1](false); }} thread=${t} msg=${m} script=${sc} pid=${pid} />
    <//>`;
  }

  function NoticeMessage(props) {
    var tok = A.theme.useToken().token;
    var m = props.msg, pid = props.pid;
    var sc = m.scriptId ? S[m.scriptId] : null;
    var body = null;
    if (m.variant === "fallback") {
      body = html`<div>
        <p style=${{ margin: "0 0 8px" }}>I couldn't match that to the sample material in this prototype. In the build, the assistant searches every source your role may see and says plainly when the evidence is not there.</p>
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 6 }}>${"Try one of these for " + m.mode + ":"}</div>
        <${SuggestionChips} ids=${(AD.modeSuggestions[m.mode] || []).slice(0, 4)} pid=${pid} phase2On=${props.phase2On} onAsk=${props.onAsk} />
      </div>`;
    } else if (m.variant === "locked") {
      body = html`<div>
        <p style=${{ margin: "0 0 8px" }}><b>${sc.module}</b> arrives in Phase 2. In Phase 1 the assistant covers contracts, records and the knowledge base, on the same platform with the same masking, release and review steps.</p>
        <div style=${{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          ${props.phase2On ? html`<${A.Button} size="small" type="primary" onClick=${function () { props.onAsk(sc.id); }}>Ask again<//>`
            : html`<${A.Button} size="small" type="primary" icon=${html`<${Icon} name="UnlockOutlined" />`} onClick=${function () { APP.setPhaseMode("both"); APP.toast.info("Showing Phase 1 and Phase 2."); }}>Show Phase 1 + 2<//>`}
          <${APP.SowRef} sec=${sc.sow[0]} />
        </div>
      </div>`;
    } else if (m.variant === "other-contract") {
      var con = findById(D.contracts, m.contractId) || { id: m.contractId, title: m.contractId, counterparty: "" };
      body = html`<div>
        <p style=${{ margin: "0 0 8px" }}>${"I read " + con.id + ", " + con.title + " with " + con.counterparty + ". In this sample only the crane maintenance agreement CON-2024-051 carries full clause text, so the review runs end to end on that one. In the build, the same steps run on any contract: classify, mask, release, cite and review."}</p>
        <div style=${{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <${A.Button} size="small" type="primary" onClick=${function () { props.onAsk("contract-review"); }}>Review CON-2024-051 instead<//>
          <${A.Button} size="small" onClick=${function () { APP.navigate("contracts", { id: con.id }); }}>${"Open " + con.id}<//>
        </div>
      </div>`;
    } else if (m.variant === "denied") {
      var me = APP.persona(pid), alt = bestPersonaFor(sc);
      body = html`<div>
        <p style=${{ margin: "0 0 8px" }}>${"Your role, " + me.role + ", has data access: " + me.access.toLowerCase() + ". This question needs " + sc.dataClass + " " + sc.module.toLowerCase() + " content"
          + (sc.roles ? " that only some roles may see" : "") + ", so I didn't search it. Access follows role, department and data class."} <${APP.SowRef} sec="2.6" /></p>
        ${alt ? html`<${A.Button} size="small" icon=${html`<${Icon} name="UserSwitchOutlined" />`} onClick=${function () { APP.setPersona(alt); APP.toast.info("You are now " + APP.personName(alt) + ", " + APP.persona(alt).role + "."); }}>${"Switch to " + APP.personName(alt)}<//>` : null}
      </div>`;
    }
    return html`<${APP.ChatMessage} role="assistant" time=${fmt.time(m.at)}
      badges=${m.variant === "locked" ? html`<${APP.PhaseTag} phase=${2} />` : m.variant === "denied" ? html`<${A.Tag} color="red" icon=${html`<${Icon} name="LockOutlined" />`} style=${{ marginInlineEnd: 0 }}>Not available for your role<//>` : null}>${body}<//>`;
  }

  /* Suggested question chips (follow-ups and above the composer) */
  function SuggestionChips(props) {
    var list = (props.ids || []).map(function (id) { return S[id]; }).filter(function (sc) { return sc && (!props.pid || canAsk(sc, props.pid)); });
    if (!list.length) return null;
    var row = !!props.row;
    return html`<div style=${{ display: "flex", flexWrap: row ? "nowrap" : "wrap", gap: 6, minWidth: 0, maxWidth: "100%", overflowX: row ? "auto" : "visible", paddingBottom: row ? 2 : 0 }}>
      ${list.map(function (sc) {
        var locked = sc.phase === 2 && !props.phase2On;
        var btn = html`<${A.Button} key=${sc.id} size="small" shape="round" disabled=${locked} title=${sc.question}
          style=${{ maxWidth: row ? 340 : "100%", flex: "none", overflow: "hidden" }}
          icon=${html`<${Icon} name=${locked ? "LockOutlined" : "BulbOutlined"} />`}
          onClick=${function () { props.onAsk(sc.id); }}><span style=${{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>${sc.question}</span><//>`;
        return locked ? html`<${A.Tooltip} key=${sc.id} title=${sc.module + " arrives in Phase 2. Switch to Phase 1 + 2 at the top to try it."}><span style=${{ flex: "none", maxWidth: "100%" }}>${btn}</span><//>` : btn;
      })}
    </div>`;
  }

  /* ------------------------------------------------------------------
     Conversation list
     ------------------------------------------------------------------ */
  function ConversationList(props) {
    var tok = A.theme.useToken().token;
    var q = useState("");
    var s = props.state, pid = props.pid;
    var phase2On = s.ui.phaseMode === "both";
    var term = q[0].trim().toLowerCase();
    var list = Object.keys(props.threads).map(function (k) { return props.threads[k]; })
      .filter(function (t) { return t.personaId === pid && t.messages.length; })
      .filter(function (t) { return !term || (t.title + " " + t.module).toLowerCase().indexOf(term) >= 0; })
      .sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)); });
    var groups = [];
    list.forEach(function (t) {
      var g = fmt.groupLabel(t.updated);
      var last = groups[groups.length - 1];
      if (!last || last.label !== g) groups.push({ label: g, items: [t] }); else last.items.push(t);
    });
    var waiting = function (t) {
      return t.messages.some(function (m) { if (!m.releaseId) return false; var r = findById(s.releaseRequests, m.releaseId); return r && r.status === "Pending"; });
    };
    return html`<div style=${{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style=${{ padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style=${{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style=${{ fontWeight: 600, flex: 1 }}>Conversations</span>
          <${A.Tooltip} title="New conversation"><${A.Button} size="small" type="primary" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${props.onNew} aria-label="New conversation">New<//><//>
        </div>
        <${A.Input} size="small" allowClear placeholder="Search conversations" prefix=${html`<${Icon} name="SearchOutlined" />`} value=${q[0]} onChange=${function (e) { q[1](e.target.value); }} aria-label="Search conversations" />
      </div>
      <div style=${{ flex: 1, overflowY: "auto", padding: "0 6px 12px" }}>
        ${groups.length ? groups.map(function (g) {
          return html`<div key=${g.label} style=${{ marginBottom: 6 }}>
            <div style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextTertiary, padding: "8px 10px 4px" }}>${g.label}</div>
            ${g.items.map(function (t) {
              var locked = t.phase === 2 && !phase2On;
              var active = t.id === props.selectedId;
              var w = waiting(t);
              var go = function () { props.onSelect(t.id); };
              return html`<div key=${t.id} className=${"ast-conv" + (active ? " is-active" : "")} role="button" tabIndex=${0} onClick=${go}
                onKeyDown=${function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }} aria-current=${active ? "true" : undefined}
                style=${{ opacity: locked ? 0.6 : 1 }}>
                <${Icon} name=${MODE_ICONS[t.mode] || "MessageOutlined"} style=${{ marginTop: 3, color: active ? tok.colorPrimary : tok.colorTextSecondary }} />
                <div style=${{ flex: 1, minWidth: 0 }}>
                  <div style=${{ fontSize: 13, fontWeight: active ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: tok.colorText }} title=${t.title}>${t.title}</div>
                  <div style=${{ fontSize: 11, color: tok.colorTextTertiary, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style=${{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${t.module + " · " + fmt.relative(t.updated)}</span>
                  </div>
                </div>
                ${locked ? html`<${A.Tooltip} title="Phase 2"><${Icon} name="LockOutlined" style=${{ marginTop: 3, fontSize: 12 }} /><//>` : null}
                ${!locked && w ? html`<${A.Tooltip} title="Waiting for release approval"><${Icon} name="ClockCircleOutlined" style=${{ marginTop: 3, fontSize: 12, color: tok.colorWarning }} /><//>` : null}
              </div>`;
            })}
          </div>`;
        }) : html`<div style=${{ padding: 16 }}><${APP.EmptyHint} title=${term ? "No matching conversations" : "No conversations yet"}
          description=${term ? "Try another word." : "Questions you ask appear here."} action=${term ? null : html`<${A.Button} size="small" type="primary" onClick=${props.onNew}>Ask the assistant<//>`} /></div>`}
      </div>
      <div style=${{ padding: "8px 12px", fontSize: 11, color: tok.colorTextTertiary, borderTop: "1px solid " + tok.colorBorderSecondary }}>
        Only your own conversations are listed. Every question and answer is in the audit log <${APP.SowRef} sec="2.6" />
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------
     Empty state for a new conversation
     ------------------------------------------------------------------ */
  function EmptyState(props) {
    var tok = A.theme.useToken().token;
    var me = APP.persona(props.pid);
    var list = suggestionsFor(props.mode, props.pid);
    var hour = APP.now().hour();
    var greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    var all = (AD.modeSuggestions[props.mode] || []).map(function (id) { return S[id]; }).filter(Boolean);
    var allLocked = list.length > 0 && list.every(function (sc) { return sc.phase === 2; }) && !props.phase2On;
    return html`<div style=${{ maxWidth: 760, margin: "0 auto", padding: "24px 4px", width: "100%" }}>
      <div style=${{ textAlign: "center", marginBottom: 20 }}>
        <div style=${{ width: 44, height: 44, borderRadius: 12, margin: "0 auto 10px", display: "grid", placeItems: "center", background: tok.colorPrimaryBg, color: tok.colorPrimary, fontSize: 22 }}><${Icon} name="RobotOutlined" /></div>
        <div style=${{ fontSize: 20, fontWeight: 600 }}>${greet + ", " + me.name}</div>
        <div style=${{ color: tok.colorTextSecondary, marginTop: 4 }}>Ask about contracts, records and policies. Every answer cites the clause and page, and stays a draft until a named person confirms it.</div>
      </div>
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary, margin: "0 0 8px", display: "flex", gap: 6, alignItems: "center" }}>
        <${Icon} name=${MODE_ICONS[props.mode]} /><span>${"Suggested for " + props.mode}</span>
      </div>
      ${list.length ? html`<${A.Row} gutter=${[12, 12]}>
        ${list.slice(0, 4).map(function (sc) {
          var locked = sc.phase === 2 && !props.phase2On;
          return html`<${A.Col} key=${sc.id} xs=${24} sm=${12}>
            <${A.Card} size="small" hoverable=${!locked} className=${"ast-card" + (locked ? " is-locked" : "")}
              onClick=${function () { if (locked) APP.toast.info(sc.module + " arrives in Phase 2. Switch to Phase 1 + 2 at the top to try it."); else props.onAsk(sc.id); }}>
              <div style=${{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <${A.Tag} style=${{ marginInlineEnd: 0 }}>${sc.module}<//>
                <${APP.PhaseTag} phase=${sc.phase} />
                ${locked ? html`<${Icon} name="LockOutlined" />` : null}
              </div>
              <div style=${{ fontSize: 14 }}>${sc.question}</div>
            <//>
          <//>`;
        })}
      <//>` : html`<${APP.EmptyHint} title="No sample questions for your role in this mode"
        description=${all.length ? "These questions need data your role can't see. Try another mode, or switch role." : "Try another mode."} />`}
      ${allLocked ? html`<${A.Alert} style=${{ marginTop: 12 }} type="info" showIcon message=${props.mode + " arrives in Phase 2."} title=${props.mode + " arrives in Phase 2."}
        description="Switch to Phase 1 + 2 at the top to try it." action=${html`<${A.Button} size="small" onClick=${function () { APP.setPhaseMode("both"); }}>Show Phase 1 + 2<//>`} />` : null}
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginTop: 22, fontSize: 12, color: tok.colorTextSecondary }}>
        <span><${Icon} name="TagsOutlined" /> Classified first <${APP.SowRef} sec="1.4" /></span>
        <span><${Icon} name="EyeInvisibleOutlined" /> Masked before any external model</span>
        <span><${Icon} name="SafetyCertificateOutlined" /> Released only by a data owner <${APP.SowRef} sec="1.4.7" /></span>
        <span><${Icon} name="FileDoneOutlined" /> Cited and reviewed <${APP.SowRef} sec="2.3" /></span>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------
     Thread view
     ------------------------------------------------------------------ */
  function ThreadView(props) {
    var tok = A.theme.useToken().token;
    var t = props.thread, s = props.state, pid = props.pid;
    var phase2On = s.ui.phaseMode === "both";
    var lastAnswerIdx = -1;
    t.messages.forEach(function (m, i) { if (m.kind === "answer") lastAnswerIdx = i; });
    var items = [];
    t.messages.forEach(function (m, i) {
      if (m.role === "user") {
        items.push(html`<${APP.ChatMessage} key=${m.id} role="user" personaId=${t.personaId} time=${fmt.time(m.at)}
          attachments=${(m.attachments || []).map(function (a) { return { name: a.name, meta: a.meta, onClick: function () { var c = firstClauseCite(a.ref); if (c) props.onOpenCite({ cite: c, cites: [c], n: 0 }); else APP.toast.build("In the build, the file opens in the viewer."); } }; })}>${m.text}<//>`);
      } else if (m.kind === "masking") {
        items.push(html`<${MaskingMessage} key=${m.id} thread=${t} msg=${m} state=${s} pid=${pid} />`);
        var rel = m.releaseId ? findById(s.releaseRequests, m.releaseId) : null;
        if (rel && rel.status !== "Pending") {
          items.push(html`<${APP.ChatMessage} key=${m.id + "-ev"} role="system" icon=${rel.status === "Approved" ? "CheckCircleOutlined" : "StopOutlined"}>
            ${(rel.status === "Approved" ? "Released by " : "Rejected by ") + APP.personName(rel.decidedBy) + ", Data owner, at " + fmt.time(rel.decidedAt) + " · " + rel.id}<//>`);
        }
      } else if (m.kind === "answer") {
        items.push(html`<${AnswerMessage} key=${m.id} thread=${t} msg=${m} state=${s} pid=${pid} isLast=${i === lastAnswerIdx && i === t.messages.length - 1}
          onOpenCite=${props.onOpenCite} activeSource=${props.activeSource} registerStop=${props.registerStop} onAsk=${props.onAsk} onDislike=${props.onDislike} />`);
      } else if (m.kind === "notice") {
        items.push(html`<${NoticeMessage} key=${m.id} msg=${m} pid=${pid} phase2On=${phase2On} onAsk=${props.onAsk} />`);
      }
    });
    return html`<${APP.ChatThread} style=${{ flex: 1, minHeight: 0, padding: props.compact ? "12px 4px 16px" : "16px 20px 20px" }}>${items}<//>`;
  }

  /* ------------------------------------------------------------------
     The screen
     ------------------------------------------------------------------ */
  function AssistantScreen(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var vp = APP.useViewport();
    var route = APP.useRoute();
    var pid = s.ui.personaId;
    var me = APP.persona(pid);
    /* Width left for this screen: viewport minus the side navigation and the docked guided tour */
    var cw = vp.width - (vp.isMobile ? 0 : (s.ui.collapsed ? 72 : 252)) - (s.ui.tourOpen && vp.width >= 1200 ? 400 : 0) - 48;
    var inlineSource = !vp.isMobile && cw >= 900;
    var phase2On = s.ui.phaseMode === "both";
    var threads = s.ext[KEY_THREADS] || seedThreads();
    var selectedId = selectedFor(s, pid);
    var thread = selectedId ? threads[selectedId] : null;

    var draft = useState(""), atts = useState([]), mode = useState(thread ? thread.mode : "Ask");
    var source = useState(null), listOpen = useState(false), rename = useState(null), dislike = useState(null), reason = useState("Wrong or weak citation"), note = useState("");
    var stopRef = useRef(null);
    var registerStop = function (fn) { stopRef.current = fn; };

    var selectConv = function (id, keepComposer) {
      setSelected(pid, id);
      var t = id ? getThreads()[id] : null;
      if (!keepComposer) { draft[1](""); atts[1]([]); }
      if (t) mode[1](t.mode);
      source[1](null);
      listOpen[1](false);
    };
    var openContractReview = function (cid, prefill) {
      var th = getThreads();
      if (!th[cid]) createThread(contractThreadShell(cid, pid));
      selectConv(cid);
      var t = getThreads()[cid];
      if (prefill !== false && t && !t.messages.length) {
        mode[1]("Review a contract");
        atts[1]([attachmentFor(CON)]);
        draft[1](S["contract-review"].question);
      }
    };

    /* A different persona has its own conversations: reset the composer */
    var firstPid = useRef(pid);
    useEffect(function () {
      if (firstPid.current === pid) return;
      firstPid.current = pid;
      var t0 = selectedFor(APP.store.getState(), pid);
      var th0 = t0 ? getThreads()[t0] : null;
      mode[1](th0 ? th0.mode : "Ask"); draft[1](""); atts[1]([]); source[1](null);
    }, [pid]);

    /* Honour incoming params */
    useEffect(function () {
      var p = props.params || {};
      if (p.start === "contract-review") { openContractReview(p.conversationId || CONV201, true); return; }
      if (p.conversationId) {
        var th = getThreads();
        if (th[p.conversationId]) selectConv(p.conversationId);
        else if (p.conversationId === CONV201) openContractReview(CONV201, true);
        else { APP.toast.info("That conversation isn't in this sample. Starting a new one."); selectConv(null); }
        return;
      }
      if (p.contractId) {
        selectConv(null);
        mode[1]("Review a contract");
        atts[1]([attachmentFor(p.contractId)]);
        draft[1](S["contract-review"].question);
        return;
      }
      if (p.new) selectConv(null);
    }, [route.at]);

    /* Reconcile store-driven changes (release requests made elsewhere, approvals) into threads */
    useEffect(function () {
      var st = APP.store.getState();
      st.releaseRequests.forEach(function (r) {
        if (!r.live || r.ref !== CON || !r.source || r.source.route !== "assistant") return;
        var cid = r.source.params && r.source.params.conversationId;
        if (!cid) return;
        var th = getThreads();
        if (th[cid] && th[cid].messages.some(function (m) { return m.releaseId === r.id; })) return;
        if (!th[cid]) createThread(contractThreadShell(cid, r.requesterId));
        var at = r.createdAt;
        addMessages(cid, [
          { id: uid("u"), role: "user", text: S["contract-review"].question, at: at, attachments: [attachmentFor(CON)] },
          { id: uid("m"), role: "assistant", kind: "masking", scriptId: "contract-review", releaseId: r.id, checked: true, route: "bedrock", resolved: "release", at: at }
        ], { mode: "Review a contract", module: "Contracts", dataClass: "Sensitive" });
      });
      var th2 = getThreads();
      Object.keys(th2).forEach(function (cid) {
        th2[cid].messages.forEach(function (m) {
          if (m.kind !== "masking" || !m.releaseId) return;
          var r = findById(st.releaseRequests, m.releaseId);
          if (!r || r.status !== "Approved") return;
          var cur = getThreads()[cid];
          if (cur.messages.some(function (x) { return x.kind === "answer" && x.parent === m.id; })) return;
          addMessages(cid, [answerMsg(S[m.scriptId], { modelId: r.modelId, releaseId: r.id, parent: m.id })]);
        });
      });
    }, [s.releaseRequests, threads]);

    /* Send a question */
    var ask = function (text, opts) {
      opts = opts || {};
      var m = opts.mode || mode[0];
      var attachments = opts.attachments || atts[0];
      var q = String(text || "").trim();
      if (!q && attachments.length && m === "Review a contract") q = S["contract-review"].question;
      if (!q) return;
      if (stopRef.current && thread && thread.messages.some(function (x) { return x.status === "new"; })) { APP.toast.info("Wait for the current answer, or stop it first."); return; }
      var cid = selectedId;
      var th = getThreads();
      var sc = opts.scriptId ? S[opts.scriptId] : matchScript(q, m, attachments);
      if (sc && sc.mode !== m && (sc.altModes || []).indexOf(m) < 0) { m = sc.mode; mode[1](m); }
      if (!cid || !th[cid]) {
        cid = nextConvId();
        createThread({ id: cid, personaId: pid, title: q.length > 60 ? q.slice(0, 57) + "..." : q, mode: m, module: sc ? sc.module : "General", phase: sc ? sc.phase : 1,
          updated: APP.nowIso(), dataClass: sc ? sc.dataClass : "Internal", messages: [] });
        setSelected(pid, cid);
      } else if (!th[cid].messages.length && sc) {
        updThread(cid, function (t0) { return Object.assign({}, t0, { mode: m, module: sc.module, phase: sc.phase, dataClass: sc.dataClass }); });
      }
      var at = APP.nowIso();
      var userMsg = { id: uid("u"), role: "user", text: q, at: at, attachments: attachments };
      var reply;
      if (!sc) reply = { id: uid("n"), role: "assistant", kind: "notice", variant: "fallback", mode: m, at: at };
      else if (!canAsk(sc, pid)) reply = { id: uid("n"), role: "assistant", kind: "notice", variant: "denied", scriptId: sc.id, at: at };
      else if (sc.phase === 2 && !phase2On) reply = { id: uid("n"), role: "assistant", kind: "notice", variant: "locked", scriptId: sc.id, at: at };
      else if (sc.flow === "contract-review" && attachments.some(function (a) { return a.ref && a.ref !== CON && findById(D.contracts, a.ref); })) {
        var other = attachments.filter(function (a) { return a.ref && a.ref !== CON && findById(D.contracts, a.ref); })[0];
        reply = { id: uid("n"), role: "assistant", kind: "notice", variant: "other-contract", scriptId: sc.id, contractId: other.ref, at: at };
      }
      else if (sc.release) {
        reply = { id: uid("m"), role: "assistant", kind: "masking", scriptId: sc.id, checked: false, route: "bedrock", at: at };
        if (sc.flow === "contract-review" && !attachments.some(function (a) { return a.ref === CON; })) userMsg.attachments = attachments.concat([attachmentFor(CON)]);
        if (sc.flow === "contract-review") APP.tour.mark("ask");
      } else reply = answerMsg(sc, {});
      addMessages(cid, [userMsg, reply]);
      if (sc && canAsk(sc, pid)) APP.audit({ action: "Assistant question", item: cid, detail: sc.module + ": " + q.slice(0, 80), dataClass: sc.dataClass });
      draft[1](""); atts[1]([]);
    };
    var askScript = function (id) { var sc = S[id]; if (sc) { mode[1](sc.mode); ask(sc.question, { scriptId: id, mode: sc.mode, attachments: sc.flow === "contract-review" ? [attachmentFor(CON)] : [] }); } };

    var streaming = !!(thread && thread.messages.some(function (x) { return x.kind === "answer" && x.status === "new"; }));
    var stop = function () {
      if (stopRef.current) stopRef.current();
      else if (thread) thread.messages.forEach(function (x) { if (x.kind === "answer" && x.status === "new") updMessage(thread.id, x.id, { status: "stopped" }); });
      stopRef.current = null;
    };
    var openCite = function (c) {
      if (!inlineSource) { APP.openSource(c.cite, c.cites); return; }
      source[1](c);
    };

    /* Layout pieces */
    var ownedElsewhere = thread && thread.personaId !== pid;
    var lockedThread = thread && thread.phase === 2 && !phase2On;
    var header = html`<div style=${{ display: "flex", alignItems: "center", gap: 8, padding: vp.isPhone ? "8px 4px" : "10px 16px", borderBottom: "1px solid " + tok.colorBorderSecondary, minHeight: 52, flexWrap: "wrap" }}>
      ${vp.isMobile ? html`<${A.Button} icon=${html`<${Icon} name="UnorderedListOutlined" />`} onClick=${function () { listOpen[1](true); }} aria-label="Show conversations">${vp.isPhone ? null : "Conversations"}<//>` : null}
      <div style=${{ flex: "1 1 200px", minWidth: 0 }}>
        <div style=${{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${thread ? thread.title : "New conversation"}</div>
        <div style=${{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          ${thread ? html`<${Fragment}>
            <${A.Tag} icon=${html`<${Icon} name=${MODE_ICONS[thread.mode] || "MessageOutlined"} />`} style=${{ marginInlineEnd: 0 }}>${thread.mode}<//>
            <${A.Tag} style=${{ marginInlineEnd: 0 }}>${thread.module}<//>
            <${APP.PhaseTag} phase=${thread.phase} />
            <${APP.DataClassTag} cls=${thread.dataClass} />
          <//>` : html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${me.name + " · " + me.role + " · data access " + me.access.toLowerCase()}</span>`}
        </div>
      </div>
      ${thread && !ownedElsewhere ? html`<${A.Dropdown} trigger=${["click"]} placement="bottomRight" menu=${{
        items: [
          { key: "rename", icon: html`<${Icon} name="EditOutlined" />`, label: "Rename" },
          { key: "export", icon: html`<${Icon} name="FileWordOutlined" />`, label: "Export to Word" },
          { key: "share", icon: html`<${Icon} name="ShareAltOutlined" />`, label: "Share with a colleague" },
          { type: "divider" },
          { key: "delete", icon: html`<${Icon} name="DeleteOutlined" />`, label: "Delete", danger: true }
        ],
        onClick: function (info) {
          if (info.key === "rename") rename[1](thread.title);
          if (info.key === "export") APP.toast.build("In the build, the conversation exports to Word with every citation and a draft label on unconfirmed answers.");
          if (info.key === "share") APP.toast.build("In the build, you share a secure link. The colleague sees only what their own role and data class allow.");
          if (info.key === "delete") APP.confirm({ title: "Delete this conversation?", content: "It disappears from your list. The audit log keeps the record of every question and answer.", okText: "Delete",
            onOk: function () { var id = thread.id; selectConv(null); removeThread(id); APP.toast.success("Conversation deleted. The audit log keeps its record."); } });
        }
      }}><${A.Button} type="text" icon=${html`<${Icon} name="MoreOutlined" />`} aria-label="Conversation actions" /><//>` : null}
    </div>`;

    var suggestionsRow = null;
    var modeSugs = (AD.modeSuggestions[mode[0]] || []).filter(function (id) { return S[id] && canAsk(S[id], pid); });
    var lastMsg = thread && thread.messages.length ? thread.messages[thread.messages.length - 1] : null;
    var followupsShown = lastMsg && lastMsg.kind === "answer" && lastMsg.status === "done" && S[lastMsg.scriptId] && (S[lastMsg.scriptId].followups || []).length && S[lastMsg.scriptId].mode === mode[0];
    if (thread && thread.messages.length && !ownedElsewhere && !lockedThread && !followupsShown) {
      var allP2 = modeSugs.length && modeSugs.every(function (id) { return S[id].phase === 2; }) && !phase2On;
      suggestionsRow = allP2 ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, display: "flex", gap: 6, alignItems: "center" }}><${Icon} name="LockOutlined" />${mode[0] + " arrives in Phase 2. Switch to Phase 1 + 2 at the top to try it."}</div>`
        : modeSugs.length ? html`<${SuggestionChips} row=${true} ids=${modeSugs.slice(0, 4)} pid=${pid} phase2On=${phase2On} onAsk=${askScript} />` : null;
    }
    var composer = html`<div style=${{ padding: vp.isPhone ? "8px 0 4px" : "8px 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      ${suggestionsRow}
      <${APP.Composer} value=${draft[0]} onChange=${draft[1]} onSend=${function (text) { ask(text); }} onStop=${stop} streaming=${streaming}
        disabled=${!!ownedElsewhere || !!lockedThread} mode=${mode[0]} onModeChange=${function (v) { mode[1](v); }}
        modeStyle=${source[0] || cw < 1060 ? "select" : undefined}
        placeholder=${MODE_PLACEHOLDER[mode[0]]} attachments=${atts[0]}
        onAttach=${function (o) { if (atts[0].some(function (a) { return a.ref === o.ref; })) return; atts[1](atts[0].concat([{ name: o.name, meta: o.meta, ref: o.ref }])); APP.toast.info("Attached. It will be classified and checked for sensitive data when you send."); }}
        onRemoveAttachment=${function (a, i) { atts[1](atts[0].filter(function (_, j) { return j !== i; })); }} />
    </div>`;

    var main;
    if (ownedElsewhere) {
      main = html`<div style=${{ flex: 1, display: "grid", placeItems: "center", padding: 16, overflowY: "auto" }}><${A.Result} icon=${html`<${Icon} name="LockOutlined" />`} title=${"This conversation belongs to " + APP.personName(thread.personaId)}
        subTitle="Conversations are private to the person who asked. Approvers and reviewers see only the payload or draft sent to them."
        extra=${html`<${A.Flex} gap=${8} wrap justify="center">
          <${A.Button} type="primary" onClick=${function () { APP.setPersona(thread.personaId); APP.toast.info("You are now " + APP.personName(thread.personaId) + "."); }}>${"Switch to " + APP.personName(thread.personaId)}<//>
          <${A.Button} onClick=${function () { selectConv(null); }}>Start a new conversation<//>
        <//>`} /></div>`;
    } else if (lockedThread) {
      main = html`<div style=${{ flex: 1, display: "grid", placeItems: "center", padding: 16 }}><${A.Result} icon=${html`<${Icon} name="LockOutlined" />`}
        title=${thread.module + " arrives in Phase 2"} subTitle="This conversation uses a Phase 2 module. It runs on the same platform, with the same masking, release and review steps."
        extra=${html`<${A.Button} type="primary" onClick=${function () { APP.setPhaseMode("both"); APP.toast.info("Showing Phase 1 and Phase 2."); }}>Show Phase 1 + 2<//>`} /></div>`;
    } else if (!thread || !thread.messages.length) {
      main = html`<div style=${{ flex: 1, minHeight: 0, overflowY: "auto", padding: vp.isPhone ? "0" : "0 16px" }}>
        <${EmptyState} pid=${pid} mode=${mode[0]} phase2On=${phase2On} onAsk=${askScript} />
      </div>`;
    } else {
      main = html`<${ThreadView} thread=${thread} state=${s} pid=${pid} compact=${vp.isPhone} onOpenCite=${openCite} activeSource=${inlineSource ? source[0] : null} registerStop=${registerStop} onAsk=${askScript}
        onDislike=${function (t, m) { dislike[1]({ tid: t.id, mid: m.id, scriptId: m.scriptId }); reason[1]("Wrong or weak citation"); note[1](""); }} />`;
    }

    var threadCol = html`<div style=${{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}>
      ${header}${main}${composer}
    </div>`;
    var listEl = html`<${ConversationList} threads=${threads} state=${s} pid=${pid} selectedId=${selectedId} onSelect=${function (id) { selectConv(id); }} onNew=${function () { selectConv(null); }} />`;
    var sourceEl = source[0] && inlineSource ? html`<div style=${{ height: "100%", overflowY: "auto", padding: "12px 14px" }}>
      <div style=${{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style=${{ fontWeight: 600, flex: 1 }}>${source[0].n ? "Source " + source[0].n : "Document"}</span>
        <${A.Tooltip} title="Open in a larger view"><${A.Button} size="small" type="text" icon=${html`<${Icon} name="ExpandOutlined" />`} aria-label="Open in a larger view" onClick=${function () { APP.openSource(source[0].cite, source[0].cites); }} /><//>
        <${A.Button} size="small" type="text" icon=${html`<${Icon} name="CloseOutlined" />`} aria-label="Close source" onClick=${function () { source[1](null); }} />
      </div>
      <${APP.SourcePanel} key=${source[0].msgId + "-" + source[0].n} cite=${source[0].cite} cites=${source[0].cites} height=${"max(280px, calc(100vh - 470px))"} />
    </div>` : null;

    var boxHeight = vp.isMobile ? "max(520px, calc(100vh - var(--shell-top) - 120px))" : "max(560px, calc(100vh - var(--shell-top) - 128px))";
    var box;
    if (vp.isMobile) {
      box = html`<div style=${{ height: boxHeight, background: tok.colorBgContainer, border: "1px solid " + tok.colorBorderSecondary, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", padding: vp.isPhone ? "0 8px" : 0 }}>
        ${threadCol}
      </div>`;
    } else {
      box = html`<div style=${{ height: boxHeight, background: tok.colorBgContainer, border: "1px solid " + tok.colorBorderSecondary, borderRadius: 12, overflow: "hidden" }}>
        <${A.Splitter} style=${{ height: "100%" }}>
          <${A.Splitter.Panel} key="list" defaultSize=${270} min=${220} max=${420} collapsible=${true}>
            <div style=${{ height: "100%", borderRight: "1px solid " + tok.colorBorderSecondary, background: tok.colorFillQuaternary }}>${listEl}</div>
          <//>
          <${A.Splitter.Panel} key="thread" min=${380}>${threadCol}<//>
          ${sourceEl ? html`<${A.Splitter.Panel} key="source" defaultSize="40%" min=${300}>
            <div style=${{ height: "100%", borderLeft: "1px solid " + tok.colorBorderSecondary }}>${sourceEl}</div>
          <//>` : null}
        <//>
      </div>`;
    }

    var pendingMine = s.releaseRequests.filter(function (r) { return r.requesterId === pid && r.status === "Pending" && (r.phase !== 2 || phase2On); }).length;
    return html`<div>
      <${APP.PageHeader} title="Assistant" phase=${1} sow=${["1.4", "2.2", "2.3"]}
        subtitle=${vp.isPhone ? null : "Classified, masked, routed by data class, cited, and a draft until a person confirms it."}
        tags=${pendingMine ? html`<${A.Tag} color="gold" icon=${html`<${Icon} name="ClockCircleOutlined" />`} style=${{ marginInlineEnd: 0 }}>${pendingMine + " waiting for release"}<//>` : null}
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="PlusOutlined" />`} aria-label="New conversation" onClick=${function () { selectConv(null); }}>${vp.isPhone ? null : "New conversation"}<//>
          ${pid === "legal" ? html`<${A.Button} type="primary" icon=${html`<${Icon} name="FileSearchOutlined" />`} aria-label="Review CON-2024-051" onClick=${function () { openContractReview(CONV201, true); }}>${vp.isPhone ? "Review contract" : "Review CON-2024-051"}<//>` : null}
        <//>`} />
      ${box}
      <${A.Drawer} open=${vp.isMobile && listOpen[0]} placement="left" size=${300} width=${300} onClose=${function () { listOpen[1](false); }} title="Conversations" styles=${{ body: { padding: 0 } }}>
        ${listEl}
      <//>
      <${A.Modal} open=${rename[0] !== null} title="Rename conversation" okText="Save" onCancel=${function () { rename[1](null); }}
        onOk=${function () { var v = String(rename[0] || "").trim(); if (v && thread) updThread(thread.id, function (t0) { return Object.assign({}, t0, { title: v }); }); rename[1](null); APP.toast.success("Renamed."); }}>
        <${A.Input} value=${rename[0] || ""} onChange=${function (e) { rename[1](e.target.value); }} maxLength=${80} aria-label="Conversation name" />
      <//>
      <${A.Modal} open=${!!dislike[0]} title="What was wrong with this answer?" okText="Send feedback" onCancel=${function () { dislike[1](null); }}
        onOk=${function () {
          var d = dislike[0]; var sc = S[d.scriptId] || {};
          updMessage(d.tid, d.mid, { feedback: "down" });
          APP.audit({ action: "Answer feedback", item: d.tid, detail: "Not helpful: " + reason[0] + (note[0] ? ". " + note[0] : ""), dataClass: sc.dataClass || null });
          dislike[1](null);
          APP.toast.success("Thanks. Feedback is in the quality log for the administrator and the answer stays a draft.");
        }}>
        <${A.Radio.Group} value=${reason[0]} onChange=${function (e) { reason[1](e.target.value); }}>
          <${A.Flex} vertical gap=${6}>
            ${["Wrong or weak citation", "Missing information", "Wrong data used", "Too long or unclear", "Other"].map(function (o) { return html`<${A.Radio} key=${o} value=${o}>${o}<//>`; })}
          <//>
        <//>
        <${A.Input.TextArea} style=${{ marginTop: 12 }} rows=${3} value=${note[0]} onChange=${function (e) { note[1](e.target.value); }} placeholder="Add a note (optional)" aria-label="Feedback note" />
      <//>
    </div>`;
  }

  APP.registerScreen("assistant", {
    title: "Assistant", group: "workspace", phase: 1, icon: "MessageOutlined", sow: ["1.4", "2.2", "2.3"],
    summary: "Chat with the assistant. Every answer is classified, masked, routed, cited and stays a draft until a person confirms it.",
    render: AssistantScreen
  });

  APP.registerSearch({
    group: "Conversations",
    items: function (s) {
      var th = s.ext[KEY_THREADS] || seedThreads();
      return Object.keys(th).map(function (k) { return th[k]; })
        .filter(function (t) { return t.personaId === s.ui.personaId && t.messages.length; })
        .map(function (t) { return { id: t.id, title: t.title, subtitle: t.mode + " · " + t.module, route: "assistant", params: { conversationId: t.id }, phase: t.phase, icon: MODE_ICONS[t.mode] || "MessageOutlined" }; });
    }
  });
})();
