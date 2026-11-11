/* Core of the CICT Legal & Compliance Assistant concept prototype.
   Provides window.APP: html binding, store, router, contexts, app shell and shared components.
   Screens plug in with APP.registerScreen(id, def). See CONVENTIONS.md. */
(function () {
  "use strict";

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var A = window.antd;
  var I = window.icons || {};
  var D = window.APP_DATA;
  var dayjs = window.dayjs;
  var html = window.htm.bind(React.createElement);
  var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef,
    useCallback = React.useCallback, useContext = React.useContext, useReducer = React.useReducer,
    useLayoutEffect = React.useLayoutEffect, createContext = React.createContext, Fragment = React.Fragment,
    forwardRef = React.forwardRef, useImperativeHandle = React.useImperativeHandle;

  /* ------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------ */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function lsGet(key, fallback) {
    try { var v = window.localStorage.getItem("cict-proto-" + key); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { if (value === null || value === undefined) window.localStorage.removeItem("cict-proto-" + key); else window.localStorage.setItem("cict-proto-" + key, value); } catch (e) { /* convenience only */ }
  }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function Icon(props) {
    var C = I[props.name] || I.AppstoreOutlined;
    var rest = Object.assign({}, props); delete rest.name;
    return C ? React.createElement(C, rest) : null;
  }

  /* ------------------------------------------------------------------
     Mock clock: 10 Nov 2026, 10:30, advancing in real time from page load
     ------------------------------------------------------------------ */
  var BASE = dayjs("2026-11-10T10:30:00");
  var LOADED = Date.now();
  function now() { return BASE.add(Math.floor((Date.now() - LOADED) / 1000), "second"); }
  function nowIso() { return now().format("YYYY-MM-DDTHH:mm:ss"); }
  var fmt = {
    date: function (d) { return d ? dayjs(d).format("D MMM YYYY") : ""; },
    dateShort: function (d) { return d ? dayjs(d).format("D MMM") : ""; },
    dateTime: function (d) { return d ? dayjs(d).format("D MMM YYYY, HH:mm") : ""; },
    time: function (d) { return d ? dayjs(d).format("HH:mm") : ""; },
    relative: function (d) {
      if (!d) return "";
      var x = dayjs(d), n = now(), mins = n.diff(x, "minute");
      if (mins < 1) return "Just now";
      if (mins < 60) return mins + " min ago";
      if (n.isSame(x, "day")) return "Today, " + x.format("HH:mm");
      if (n.subtract(1, "day").isSame(x, "day")) return "Yesterday, " + x.format("HH:mm");
      return x.format("D MMM, HH:mm");
    },
    daysUntil: function (d) { return dayjs(d).startOf("day").diff(now().startOf("day"), "day"); },
    dueLabel: function (d) {
      var n = fmt.daysUntil(d);
      if (n < 0) return (-n) + (n === -1 ? " day overdue" : " days overdue");
      if (n === 0) return "Due today";
      if (n === 1) return "Due tomorrow";
      return n + " days left";
    },
    dueStatus: function (d) { var n = fmt.daysUntil(d); return n < 0 ? "Overdue" : n <= 14 ? "Due soon" : "Scheduled"; },
    groupLabel: function (d) {
      var x = dayjs(d), n = now();
      if (n.isSame(x, "day")) return "Today";
      if (n.diff(x, "day") < 7) return "This week";
      return "Earlier";
    },
    number: function (n) { return Number(n).toLocaleString("en-US"); },
    usd: function (n) { return "USD " + Number(n).toLocaleString("en-US"); }
  };

  /* ------------------------------------------------------------------
     People
     ------------------------------------------------------------------ */
  function persona(id) {
    for (var i = 0; i < D.personas.length; i++) if (D.personas[i].id === id) return D.personas[i];
    return null;
  }
  function personName(id) {
    if (id === "system") return "System";
    var p = persona(id);
    if (p) return p.name;
    for (var i = 0; i < D.people.length; i++) if (D.people[i].id === id) return D.people[i].name;
    return id || "";
  }

  /* ------------------------------------------------------------------
     Store: a small event emitter holding shared in-memory state
     ------------------------------------------------------------------ */
  var listeners = new Set();
  var seq;
  function freshSeq() { return { REL: 420, REV: 210, REC: 418, AU: 1002, N: 10 }; }
  function seedData() {
    return {
      releaseRequests: clone(D.seed.releaseRequests),
      reviews: clone(D.seed.reviews),
      notifications: clone(D.seed.notifications).map(function (n) { n.readBy = []; return n; }),
      audit: clone(D.seed.audit),
      records: clone(D.records),
      ext: {},
      tourDone: {}
    };
  }
  var savedPhase = lsGet("phase", "both");
  var state = Object.assign({
    ui: { personaId: "legal", phaseMode: savedPhase === "p1" ? "p1" : "both", lang: "en", langNoteHidden: false,
      sow: null, source: null, tourOpen: false, tourStep: 0, navOpen: false, collapsed: lsGet("collapsed", "0") === "1" },
    route: { id: "workspace", params: {}, at: 0 },
    screensVersion: 0
  }, seedData());
  seq = freshSeq();

  function getState() { return state; }
  function emit() { listeners.forEach(function (l) { try { l(); } catch (e) { console.error(e); } }); }
  function setState(patch) {
    var next = typeof patch === "function" ? patch(state) : patch;
    if (!next) return;
    state = Object.assign({}, state, next);
    emit();
  }
  function setUi(patch) { setState({ ui: Object.assign({}, state.ui, patch) }); }
  function subscribe(fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
  function useStore(selector) {
    var force = useReducer(function (x) { return x + 1; }, 0)[1];
    useEffect(function () { return subscribe(force); }, []);
    return selector ? selector(state) : state;
  }
  function useShared(key, initial) {
    var val = useStore(function (s) { return s.ext[key]; });
    var setter = useCallback(function (v) { actions.patch(key, v); }, [key]);
    return [val === undefined ? initial : val, setter];
  }
  function nextId(kind) {
    var n = seq[kind]++;
    if (kind === "REL") return "REL-" + String(n).padStart(4, "0");
    if (kind === "REV") return "REV-" + String(n).padStart(4, "0");
    if (kind === "REC") return "REC-2026-" + String(n).padStart(4, "0");
    if (kind === "AU") return "AU-" + String(n).padStart(4, "0");
    return "N-" + String(n).padStart(3, "0");
  }
  function currentPersonaId() { return state.ui.personaId; }
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function replaceById(list, id, patch) { return list.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }); }

  var actions = {
    setPersona: function (id) {
      if (!persona(id) || id === state.ui.personaId) return;
      setUi({ personaId: id });
    },
    setPhaseMode: function (mode) { lsSet("phase", mode); setUi({ phaseMode: mode === "p1" ? "p1" : "both" }); },
    setLang: function (lang) { setUi({ lang: lang, langNoteHidden: false }); },
    patch: function (key, value) {
      var ext = Object.assign({}, state.ext);
      ext[key] = typeof value === "function" ? value(state.ext[key]) : value;
      setState({ ext: ext });
    },
    notify: function (n) {
      var item = Object.assign({ id: nextId("N"), at: nowIso(), kind: "info", body: "", route: null, params: {}, phase: 1, readBy: [] }, n);
      if (!Array.isArray(item.to)) item.to = [item.to];
      setState({ notifications: [item].concat(state.notifications) });
      return item;
    },
    audit: function (e) {
      var item = Object.assign({ id: nextId("AU"), at: nowIso(), actorId: currentPersonaId(), action: "", item: "", detail: "", dataClass: null, live: true }, e);
      setState({ audit: [item].concat(state.audit) });
      return item;
    },
    createReleaseRequest: function (input) {
      var req = Object.assign({
        id: nextId("REL"), title: "Release request", requesterId: currentPersonaId(), ownerId: "owner", status: "Pending",
        createdAt: nowIso(), dataClass: "Sensitive", modelId: "m-claude-br", destination: "Claude on Bedrock (PrivateLink, ap-south-1)",
        purpose: "", ref: null, source: { route: "assistant", params: {} }, phase: 1,
        payload: { question: "", passages: [], attachments: [] }, entities: [], unscanned: [], live: true
      }, input);
      setState({ releaseRequests: [req].concat(state.releaseRequests) });
      actions.audit({ actorId: req.requesterId, action: "Release requested", item: req.id, detail: "Masked content to " + req.destination, dataClass: req.dataClass });
      actions.notify({ to: [req.ownerId], kind: "approval", title: "Release request " + req.id + " waiting",
        body: personName(req.requesterId) + " asks to send masked content to " + req.destination + ".", route: "approvals", params: { id: req.id }, phase: req.phase });
      return req;
    },
    decideRelease: function (id, decision, comment) {
      var req = findById(state.releaseRequests, id);
      if (!req || req.status !== "Pending") return req;
      var ok = decision === "Approved" || decision === "approve" || decision === true;
      var patch = { status: ok ? "Approved" : "Rejected", decidedBy: currentPersonaId(), decidedAt: nowIso(), comment: comment || "" };
      setState({ releaseRequests: replaceById(state.releaseRequests, id, patch) });
      actions.audit({ action: ok ? "Release approved" : "Release rejected", item: id, detail: (ok ? "Masked content to " : "Blocked: ") + req.destination + (comment ? ". " + comment : ""), dataClass: req.dataClass });
      actions.notify({ to: [req.requesterId], kind: ok ? "approval" : "alert",
        title: ok ? "Release approved: " + req.title : "Release rejected: " + req.title,
        body: personName(currentPersonaId()) + (ok ? " approved the release. The answer is being prepared." : " rejected the release" + (comment ? ": " + comment : ".")),
        route: (req.source && req.source.route) || "assistant", params: (req.source && req.source.params) || {}, phase: req.phase });
      return findById(state.releaseRequests, id);
    },
    createReview: function (input) {
      var rev = Object.assign({
        id: nextId("REV"), title: "Review", kind: "Assistant answer", requesterId: currentPersonaId(), reviewerId: "reviewer", status: "Pending",
        createdAt: nowIso(), ref: null, dataClass: "Sensitive", modelName: "", phase: 1, source: { route: "assistant", params: {} },
        content: { summary: "", sections: [] }, citations: [], live: true
      }, input);
      setState({ reviews: [rev].concat(state.reviews) });
      actions.audit({ actorId: rev.requesterId, action: "Sent for review", item: rev.id, detail: rev.kind + ": " + rev.title, dataClass: rev.dataClass });
      actions.notify({ to: [rev.reviewerId], kind: "review", title: "Review waiting: " + rev.title, body: "Sent by " + personName(rev.requesterId) + ".", route: "reviews", params: { id: rev.id }, phase: rev.phase });
      return rev;
    },
    decideReview: function (id, decision, comment, opts) {
      opts = opts || {};
      var rev = findById(state.reviews, id);
      if (!rev || rev.status !== "Pending") return rev;
      var ok = decision === "Confirmed" || decision === "confirm" || decision === true;
      var record = null;
      if (ok && opts.archive !== false) {
        record = actions.archiveRecord(Object.assign({
          title: rev.title, category: rev.archiveCategory || rev.kind, linked: rev.ref ? [rev.ref] : [], dataClass: rev.dataClass,
          sourceReviewId: rev.id, version: "Confirmed by " + personName(currentPersonaId()),
          dept: (persona(rev.requesterId) || {}).dept || "Legal", ownerName: personName(rev.requesterId)
        }, opts.record || {}));
      }
      var patch = { status: ok ? "Confirmed" : "Returned", decidedBy: currentPersonaId(), decidedAt: nowIso(), comment: comment || "", recordId: record ? record.id : rev.recordId };
      setState({ reviews: replaceById(state.reviews, id, patch) });
      actions.audit({ action: ok ? "Review confirmed" : "Review returned", item: id, detail: ok ? (record ? "Archived as " + record.id : "Confirmed") : "Returned with comments" + (comment ? ": " + comment : ""), dataClass: rev.dataClass });
      actions.notify({ to: [rev.requesterId], kind: ok ? "review" : "alert",
        title: ok ? "Confirmed: " + rev.title : "Returned with comments: " + rev.title,
        body: ok ? personName(currentPersonaId()) + " confirmed it" + (record ? ". Archived as " + record.id + "." : ".") : personName(currentPersonaId()) + ": " + (comment || "see comments."),
        route: ok && record ? "records" : (rev.source && rev.source.route) || "reviews", params: ok && record ? { id: record.id } : (rev.source && rev.source.params) || {}, phase: rev.phase });
      return findById(state.reviews, id);
    },
    archiveRecord: function (input) {
      var rec = Object.assign({
        id: nextId("REC"), title: "Record", category: "Assistant result", dept: (persona(currentPersonaId()) || {}).dept || "Legal",
        year: 2026, linked: [], retention: "10 years", retainUntil: "2036-12-31", status: "Active", dataClass: "Internal",
        version: "1", pages: 1, format: "PDF", ownerName: personName(currentPersonaId()), archivedAt: nowIso(), live: true
      }, input);
      setState({ records: [rec].concat(state.records) });
      actions.audit({ action: "Archived", item: rec.id, detail: rec.title + (rec.linked.length ? ", linked to " + rec.linked.join(", ") : ""), dataClass: rec.dataClass });
      return rec;
    },
    markRead: function (id, personaId) {
      personaId = personaId || currentPersonaId();
      setState({ notifications: state.notifications.map(function (n) {
        return n.id === id && n.readBy.indexOf(personaId) < 0 ? Object.assign({}, n, { readBy: n.readBy.concat([personaId]) }) : n;
      }) });
    },
    markAllRead: function (personaId) {
      personaId = personaId || currentPersonaId();
      setState({ notifications: state.notifications.map(function (n) {
        return n.to.indexOf(personaId) >= 0 && n.readBy.indexOf(personaId) < 0 ? Object.assign({}, n, { readBy: n.readBy.concat([personaId]) }) : n;
      }) });
    },
    tourMark: function (key) {
      if (state.tourDone[key]) return;
      var t = Object.assign({}, state.tourDone); t[key] = true; setState({ tourDone: t });
    },
    reset: function () {
      seq = freshSeq();
      setState(Object.assign(seedData(), { ui: Object.assign({}, state.ui, { tourStep: 0, sow: null, source: null }) }));
    }
  };

  /* Selectors used by the shell and workspace */
  var select = {
    notificationsFor: function (s, personaId) {
      return s.notifications.filter(function (n) { return n.to.indexOf(personaId) >= 0 && (n.phase !== 2 || s.ui.phaseMode === "both"); });
    },
    unreadCount: function (s, personaId) {
      return select.notificationsFor(s, personaId).filter(function (n) { return n.readBy.indexOf(personaId) < 0; }).length;
    },
    pendingReleasesFor: function (s, personaId) {
      return s.releaseRequests.filter(function (r) { return r.ownerId === personaId && r.status === "Pending" && (r.phase !== 2 || s.ui.phaseMode === "both"); });
    },
    pendingReviewsFor: function (s, personaId) {
      return s.reviews.filter(function (r) { return r.reviewerId === personaId && r.status === "Pending" && (r.phase !== 2 || s.ui.phaseMode === "both"); });
    },
    liveReleases: function (s) { return s.releaseRequests.filter(function (r) { return r.live; }); },
    liveReviews: function (s) { return s.reviews.filter(function (r) { return r.live; }); },
    liveRecords: function (s) { return s.records.filter(function (r) { return r.live; }); }
  };

  /* ------------------------------------------------------------------
     Documents and masking helpers
     ------------------------------------------------------------------ */
  function getDocument(id) { return typeof id === "object" ? id : (D.documents[id] || null); }
  function registerDocument(doc) { D.documents[doc.id] = doc; return doc; }
  function findClause(docId, clauseId) {
    var doc = getDocument(docId);
    if (!doc) return null;
    for (var i = 0; i < doc.pages.length; i++) {
      for (var j = 0; j < doc.pages[i].clauses.length; j++) {
        if (doc.pages[i].clauses[j].id === clauseId) return Object.assign({ page: doc.pages[i].n }, doc.pages[i].clauses[j]);
      }
    }
    return null;
  }
  function citeLabel(cite) {
    var doc = getDocument(cite.doc);
    var c = findClause(cite.doc, cite.clause);
    var title = cite.title || (doc ? doc.title : cite.doc);
    var part = c ? (/^\d/.test(c.id) ? "clause " + c.id : c.heading) : (cite.clause || "");
    return title + (part ? ", " + part : "") + (cite.page || (c && c.page) ? ", page " + (cite.page || c.page) : "");
  }
  function segmentize(text, entities) {
    if (!entities || !entities.length || !text) return [{ t: text || "" }];
    var sorted = entities.slice().sort(function (a, b) { return b.text.length - a.text.length; });
    var re = new RegExp(sorted.map(function (e) { return escRe(e.text); }).join("|"), "g");
    var out = [], last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: text.slice(last, m.index) });
      var ent = null;
      for (var i = 0; i < sorted.length; i++) if (sorted[i].text === m[0]) { ent = sorted[i]; break; }
      out.push({ t: m[0], e: ent });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ t: text.slice(last) });
    return out;
  }
  var MASK_METHODS = [
    { value: "placeholder", label: "Placeholder" },
    { value: "mask", label: "Mask" },
    { value: "delete", label: "Delete" },
    { value: "range", label: "Range" },
    { value: "keep", label: "Keep" }
  ];
  function maskValue(e, method) {
    method = method || e.method || "placeholder";
    if (method === "range") return e.range || e.placeholder;
    if (method === "delete") return "[removed]";
    if (method === "mask") return "████";
    if (method === "keep") return e.text;
    return e.placeholder;
  }
  function maskText(text, entities, methods) {
    return segmentize(text, entities).map(function (s) { return s.e ? maskValue(s.e, methods && methods[s.e.id]) : s.t; }).join("");
  }
  function renderSegments(text, entities, mode, methods) {
    return segmentize(text, entities).map(function (s, i) {
      if (!s.e) return s.t;
      if (mode === "masked") {
        var method = (methods && methods[s.e.id]) || s.e.method;
        var cls = method === "delete" ? "ent-deleted" : method === "keep" ? "ent" : "ent-masked";
        return html`<mark key=${i} className=${cls} title=${s.e.type}>${maskValue(s.e, method)}</mark>`;
      }
      return html`<mark key=${i} className="ent" title=${s.e.type}>${s.t}</mark>`;
    });
  }
  var MASKING_LOCATIONS = [
    { where: "Body text", status: "Done", detail: "Checked, 9 items found" },
    { where: "Tables", status: "Done", detail: "Price schedule, 2 items" },
    { where: "Attachments", status: "Done", detail: "Schedule A checked" },
    { where: "Comments", status: "Done", detail: "2 comments checked" },
    { where: "Tracked changes", status: "Done", detail: "5 changes checked, 1 personal name" },
    { where: "File properties", status: "Done", detail: "Author and company fields cleared" },
    { where: "Image, page 7", status: "Manual check", detail: "Could not be read. Check by hand before release" }
  ];

  /* Canonical sample flow builders, so the assistant screen and the guided tour agree. */
  var flows = {
    CONTRACT_REVIEW_CONVERSATION: "CONV-201",
    contractReviewRelease: function (opts) {
      opts = opts || {};
      var ents = D.maskingEntities["CON-2024-051"];
      var methods = opts.methods || {};
      var clauses = ["7.2", "3.3", "15", "sig"].map(function (id) { return findClause("CON-2024-051", id); });
      var passages = clauses.map(function (c) { return { source: "[CONTRACT-1], " + (/^\d/.test(c.id) ? "clause " + c.id : c.heading) + ", page " + c.page, text: maskText(c.text, ents, methods) }; });
      var chk = findClause("CHK-SVC-2.1", "item-4");
      passages.push({ source: "Services contract checklist v2.1, item 4, page 2", text: chk.text });
      var wo = findClause("WO-118", "start");
      passages.push({ source: "Work order WO-118, page 1", text: maskText(wo.text, ents, methods) });
      return {
        title: "Contract review: crane maintenance agreement",
        dataClass: "Sensitive", modelId: "m-claude-br", destination: "Claude on Bedrock (PrivateLink, ap-south-1)",
        purpose: "Review the agreement against the services contract checklist and list the risks, with clause references",
        ref: "CON-2024-051", phase: 1,
        source: { route: "assistant", params: { conversationId: opts.conversationId || flows.CONTRACT_REVIEW_CONVERSATION } },
        payload: {
          question: "Review this agreement against the services contract checklist and list the risks, with clause references.",
          passages: passages,
          attachments: [{ name: "Crane maintenance agreement (masked).docx", note: "14 pages, 8 sensitive items masked in 47 places" }]
        },
        entities: ents.map(function (e) { return { type: e.type, original: e.text, replacement: maskValue(e, methods[e.id]), count: e.count }; }),
        unscanned: [{ where: "Image, page 7", resolution: "Checked by hand by N. Perera: crane model plate only, no sensitive data" }]
      };
    },
    contractReviewReview: function (opts) {
      opts = opts || {};
      var findings = D.reviewFindings["CON-2024-051"];
      return {
        title: "Contract review: crane maintenance agreement", kind: "Contract review", archiveCategory: "Contract review",
        ref: "CON-2024-051", dataClass: "Sensitive", modelName: "Claude on Bedrock", phase: 1,
        source: { route: "assistant", params: { conversationId: opts.conversationId || flows.CONTRACT_REVIEW_CONVERSATION } },
        releaseId: opts.releaseId || null,
        content: {
          summary: "5 findings: 1 high, 3 medium, 1 that can't be assessed without Schedule C.",
          sections: findings.map(function (f) { return { heading: f.title + " (" + f.severity + ")", text: f.fact + " " + f.action }; })
        },
        citations: findings.reduce(function (acc, f) { return acc.concat(f.cites); }, [])
      };
    },
    contractReviewTrace: function (release) {
      var rel = release || null;
      return [
        { label: "Classified as Sensitive", detail: "Contract price, bank account and personal names found. Confirmed by N. Perera.", status: "done" },
        { label: "8 sensitive items masked in 47 places", detail: "Rules v1.4. The same party always gets the same stand-in, such as [PARTY-B].", status: "done" },
        { label: "1 item checked by hand", detail: "Image on page 7 could not be read. Checked by N. Perera.", status: "warn" },
        { label: rel && rel.status === "Approved" ? "Released by " + personName(rel.decidedBy) + " at " + fmt.time(rel.decidedAt) : "Release requested from the data owner", detail: rel ? rel.id + ". Masking alone is not permission to send." : "Masking alone is not permission to send.", status: rel && rel.status === "Approved" ? "done" : "wait" },
        { label: "Routed to Claude on Bedrock", detail: "Amazon Bedrock over PrivateLink, ap-south-1. Allowed for masked Sensitive content.", status: "done" },
        { label: "6 passages retrieved from 3 documents", detail: "Agreement CON-2024-051, services contract checklist v2.1, work order WO-118.", status: "done" },
        { label: "Rules checked", detail: "Dates, notice periods and liability limits checked by rule, not by the model.", status: "done" },
        { label: "Names restored inside the CICT VPC", detail: "Stand-ins swapped back for authorised viewers only.", status: "done" }
      ];
    }
  };

  /* ------------------------------------------------------------------
     Router and screen registry
     ------------------------------------------------------------------ */
  var GROUPS = [
    { key: "workspace", label: "Workspace", phase: 1 },
    { key: "p1", label: "Phase 1 modules", phase: 1 },
    { key: "p2", label: "Phase 2 modules", phase: 2 },
    { key: "platform", label: "Platform", phase: 1 }
  ];
  var DEFAULTS = {
    workspace: { title: "My workspace", group: "workspace", phase: 1, icon: "HomeOutlined", sow: ["3.7.2"], summary: "Your tasks, approvals, reviews, deadlines and notifications across modules." },
    assistant: { title: "Assistant", group: "workspace", phase: 1, icon: "MessageOutlined", sow: ["1.4", "2.2", "2.3"], summary: "Chat with the assistant. Every answer is classified, masked, routed, cited and stays a draft until a person confirms it.",
      features: ["Conversation list and threads", "Modes: Ask, Review a contract, Draft, Translate, Check a policy", "Answers with clause and page citations", "Masking review and release requests", "How this answer was made"] },
    approvals: { title: "Approvals", group: "workspace", phase: 1, icon: "SafetyCertificateOutlined", sow: ["1.4.7", "1.5"], summary: "Release requests waiting for the data owner, with the exact outbound payload.",
      features: ["Inbox of release requests", "Exact payload preview", "Approve or reject with a comment", "History of decisions"] },
    reviews: { title: "Reviews", group: "workspace", phase: 1, icon: "FileDoneOutlined", sow: ["intro", "3.7.2"], summary: "AI drafts waiting for a specialist reviewer to confirm or return.",
      features: ["Review queue", "Draft beside its sources", "Confirm or return with comments", "Confirmed results archived to Records"] },
    contracts: { title: "Contracts", group: "p1", phase: 1, icon: "FileTextOutlined", sow: ["3.1.1", "3.1.4", "3.1.5"], summary: "Contract register, due diligence, obligations and deadlines.",
      features: ["Contract register with filters", "Counterparty due diligence", "Obligations and performance", "Deadlines and reminders", "Template drafting"] },
    "contract-review": { title: "Contract review", group: "p1", phase: 1, icon: "FileSearchOutlined", sow: ["3.1.2", "3.1.3"], summary: "Clause-by-clause review against a checklist, with the cited clause beside each finding.",
      features: ["Review against a checklist", "Findings split into fact, assessment and proposed change", "Redline of proposed revisions", "Send for review"] },
    records: { title: "Records", group: "p1", phase: 1, icon: "DatabaseOutlined", sow: ["3.6"], summary: "One archive linked to many matters, with questions and answers, retention and bulk import.",
      features: ["Unified archive", "Questions with cited answers", "Retention and disposal holds", "Bulk import with failure reports"] },
    legal: { title: "Legal affairs", group: "p2", phase: 2, icon: "BankOutlined", sow: ["3.2.1", "3.2.2"], summary: "Cases and disputes with risk analysis, and draft legal memos.",
      features: ["Case and dispute register", "Risk analysis", "Draft legal memos with cited legal basis"] },
    translation: { title: "Translation", group: "p2", phase: 2, icon: "TranslationOutlined", sow: ["3.2.3"], summary: "Chinese, English and Sinhala legal translation with a termbase and consistency checks.",
      features: ["Clause-aligned translation", "Termbase", "Checks on amounts, dates and parties"] },
    regulatory: { title: "Regulatory monitoring", group: "p2", phase: 2, icon: "AlertOutlined", sow: ["3.2.4"], summary: "Daily checks of official sources, with relevance and follow-up tasks.",
      features: ["Daily source checks", "Relevance rating", "Failed checks shown, never hidden"] },
    policies: { title: "Policies", group: "p2", phase: 2, icon: "ProfileOutlined", sow: ["3.3"], summary: "Policy register, redline compare, headquarters alignment and approval workflow.",
      features: ["Policy register", "Clause-by-clause redline compare", "Headquarters alignment checks", "Approval workflow", "Policy questions and answers"] },
    compliance: { title: "Compliance and risk", group: "p2", phase: 2, icon: "SafetyOutlined", sow: ["3.4.1", "3.4.3", "3.4.4", "3.4.5"], summary: "Contract-versus-payment anomaly alerts, control testing and remediation.",
      features: ["Anomaly alerts", "Compliance checks", "Control testing", "Remediation tracking", "Key-position approval checks"] },
    screening: { title: "Sanctions screening", group: "p2", phase: 2, icon: "SecurityScanOutlined", sow: ["3.4.2"], summary: "OFAC and EU list screening with hit adjudication.",
      features: ["Screening of counterparties", "Hit adjudication with evidence", "List refresh status"] },
    board: { title: "Board affairs", group: "p2", phase: 2, icon: "TeamOutlined", sow: ["3.5"], summary: "Meetings, agenda submission checks, board packs and past-meeting search.",
      features: ["Meetings", "Agenda submission checks", "Board pack", "Search of past meetings"] },
    knowledge: { title: "Knowledge base", group: "platform", phase: 1, icon: "ReadOutlined", sow: ["2.2"], summary: "Laws, policies, templates and checklists with versions and effective dates.",
      features: ["Sources with versions and effective dates", "Search in three languages", "Access by data class"] },
    admin: { title: "Administration", group: "platform", phase: 1, icon: "SettingOutlined", sow: ["2.4", "2.6", "3.7.1", "3.7.4"], summary: "Models and routing, service health, audit log, users and roles.",
      features: ["Models and routing by data class", "Service health", "Audit log", "Users and roles"] }
  };
  var NAV_ORDER = ["workspace", "assistant", "approvals", "reviews", "contracts", "contract-review", "records",
    "legal", "translation", "regulatory", "policies", "compliance", "screening", "board", "knowledge", "admin"];
  var RESERVED = /^(settings|sidebar|customize|upgrade|downloads|comment-.*)$/i;

  var screens = {};
  function registerScreen(id, def) {
    if (!/^[A-Za-z0-9-]+$/.test(id) || RESERVED.test(id)) { console.error("[APP] invalid screen id: " + id); return; }
    screens[id] = Object.assign({ id: id, group: "workspace", phase: 1, icon: "AppstoreOutlined", sow: [] }, DEFAULTS[id] || {}, def, { placeholder: !!def.placeholder });
    setState({ screensVersion: state.screensVersion + 1 });
  }
  function navigate(id, params) {
    if (!screens[id]) { console.warn("[APP] unknown route " + id); id = "workspace"; }
    setState({ route: { id: id, params: params || {}, at: Date.now() }, ui: Object.assign({}, state.ui, { navOpen: false }) });
    try { if (window.location.hash !== "#" + id) window.location.hash = id; } catch (e) { /* hash may be locked; state already changed */ }
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
  }
  function useRoute() {
    var route = useStore(function (s) { return s.route; });
    return { id: route.id, params: route.params || {}, at: route.at, screen: screens[route.id], navigate: navigate };
  }
  function onHashChange() {
    var id = "";
    try { id = (window.location.hash || "").replace(/^#/, ""); } catch (e) { return; }
    if (id && id !== state.route.id && screens[id]) setState({ route: { id: id, params: {}, at: Date.now() } });
  }

  /* ------------------------------------------------------------------
     Contexts (backed by the store)
     ------------------------------------------------------------------ */
  var PersonaContext = createContext(null);
  var PhaseContext = createContext(null);
  var LanguageContext = createContext(null);
  var ThemeContext = createContext(null);
  function usePersona() { return useContext(PersonaContext); }
  function usePhase() { return useContext(PhaseContext); }
  function useLang() { return useContext(LanguageContext); }
  function useTheme() { return useContext(ThemeContext); }
  function useApp() {
    return { persona: usePersona(), phase: usePhase(), lang: useLang(), theme: useTheme(), route: useRoute(), navigate: navigate, actions: actions };
  }

  function useViewport() {
    var get = function () { return typeof window !== "undefined" ? window.innerWidth : 1280; };
    var st = useState(get());
    useEffect(function () {
      var h = function () { st[1](get()); };
      window.addEventListener("resize", h);
      return function () { window.removeEventListener("resize", h); };
    }, []);
    var w = st[0];
    return { width: w, isPhone: w < 576, isMobile: w < 992, isWide: w >= 1200 };
  }

  function readThemeAttr() {
    try { return document.documentElement.getAttribute("data-theme"); } catch (e) { return null; }
  }
  function useDarkMode() {
    var mq = null;
    try { mq = window.matchMedia("(prefers-color-scheme: dark)"); } catch (e) { mq = null; }
    var sys = useState(mq ? mq.matches : false);
    var attr = useState(readThemeAttr());
    useEffect(function () {
      var h = function (e) { sys[1](e.matches); };
      if (mq && mq.addEventListener) mq.addEventListener("change", h);
      var obs = null;
      try {
        obs = new MutationObserver(function () { attr[1](readThemeAttr()); });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      } catch (e) { obs = null; }
      return function () { if (mq && mq.removeEventListener) mq.removeEventListener("change", h); if (obs) obs.disconnect(); };
    }, []);
    var a = attr[0];
    return a === "dark" ? true : a === "light" ? false : sys[0];
  }
  function setThemeAttr(mode) {
    try { document.documentElement.setAttribute("data-theme", mode); } catch (e) { /* ignore */ }
    lsSet("theme", mode);
  }
  (function applySavedTheme() {
    var saved = lsGet("theme", null);
    if ((saved === "dark" || saved === "light") && !readThemeAttr()) setThemeAttr(saved);
  })();

  var LANGS = [
    { key: "en", label: "EN", name: "English", locale: "en_US" },
    { key: "zh", label: "中文", name: "Chinese", locale: "zh_CN" },
    { key: "si", label: "සිංහල", name: "Sinhala", locale: "si_LK" }
  ];
  function antdLocale(lang) {
    var L = A.locales || {};
    var def = null;
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].key === lang) def = LANGS[i];
    return (def && L[def.locale]) || L.en_US || undefined;
  }

  /* ------------------------------------------------------------------
     Toasts (antd App message API, themed)
     ------------------------------------------------------------------ */
  var api = { message: null, notification: null, modal: null };
  function ApiBridge() {
    var a = A.App.useApp();
    api.message = a.message; api.notification = a.notification; api.modal = a.modal;
    return null;
  }
  function toast(content, type) {
    var t = type || "info";
    if (api.message) api.message.open({ type: t, content: content, duration: t === "error" ? 5 : 3.5 });
    else console.log("[toast]", content);
  }
  toast.success = function (c) { toast(c, "success"); };
  toast.warn = function (c) { toast(c, "warning"); };
  toast.error = function (c) { toast(c, "error"); };
  toast.info = function (c) { toast(c, "info"); };
  toast.build = function (c) { toast(c, "info"); };
  function confirmDialog(opts) {
    if (api.modal) api.modal.confirm(Object.assign({ okText: "Confirm", cancelText: "Cancel", zIndex: 2100 }, opts));
  }

  /* ------------------------------------------------------------------
     Shared presentational components
     ------------------------------------------------------------------ */
  function PhaseTag(props) {
    var p = props.phase === 2 ? 2 : 1;
    return html`<${A.Tag} color=${p === 2 ? "purple" : "blue"} style=${{ marginInlineEnd: 0 }}>${"Phase " + p}<//>`;
  }

  var STATUS_COLORS = {
    success: ["approved", "confirmed", "active", "in force", "cleared", "no match", "done", "on track", "live", "healthy", "closed", "archived", "completed", "signed", "released", "low", "allowed", "ok", "passed", "issued", "imported", "effective"],
    processing: ["pending", "pending review", "in review", "in progress", "running", "queued", "in consultation", "waiting", "submitted", "sent", "open", "new"],
    warning: ["medium", "due soon", "expiring soon", "returned", "retention review due", "possible match", "missing evidence", "degraded", "slow", "check", "needs check", "not enough evidence", "under review", "disposal hold", "manual check", "partial", "missing", "amber", "gap", "review due", "to verify"],
    error: ["rejected", "high", "overdue", "blocked", "failed", "discrepancy", "conflict", "critical", "verify", "not approved", "confirmed match", "red", "breach", "down", "unreachable"],
    default: ["draft", "superseded", "scheduled", "standby", "repealed", "expired", "off", "n/a", "not started", "withdrawn", "inactive"]
  };
  var STATUS_ICONS = { success: "CheckCircleOutlined", processing: "ClockCircleOutlined", warning: "ExclamationCircleOutlined", error: "CloseCircleOutlined", default: "MinusCircleOutlined" };
  function statusTone(status) {
    var s = String(status || "").toLowerCase().trim();
    var keys = Object.keys(STATUS_COLORS);
    for (var i = 0; i < keys.length; i++) if (STATUS_COLORS[keys[i]].indexOf(s) >= 0) return keys[i];
    for (var j = 0; j < keys.length; j++) {
      var list = STATUS_COLORS[keys[j]];
      for (var k = 0; k < list.length; k++) if (list[k].length > 3 && s.indexOf(list[k]) === 0) return keys[j];
    }
    return "default";
  }
  function StatusTag(props) {
    var tone = props.tone || statusTone(props.status);
    var showIcon = props.icon !== false;
    return html`<${A.Tag} color=${props.color || tone} icon=${showIcon ? html`<${Icon} name=${STATUS_ICONS[tone]} />` : null} style=${Object.assign({ marginInlineEnd: 0 }, props.style || {})}>${props.children || props.status}<//>`;
  }
  var CLASS_COLORS = { Public: "green", Internal: "blue", Sensitive: "orange", Confidential: "red" };
  function DataClassTag(props) {
    var c = String(props.cls || props.dataClass || "").split(" ")[0];
    if (!c) return null;
    var locked = c === "Sensitive" || c === "Confidential";
    return html`<${A.Tooltip} title=${props.tooltip === false ? null : "Data class: " + (props.cls || props.dataClass)}>
      <${A.Tag} color=${CLASS_COLORS[c] || "default"} icon=${locked ? html`<${Icon} name="LockOutlined" />` : null} style=${{ marginInlineEnd: 0 }}>${props.label || props.cls || props.dataClass}<//>
    <//>`;
  }
  function ModelTag(props) {
    var m = null;
    for (var i = 0; i < D.models.length; i++) if (D.models[i].id === props.id || D.models[i].name === props.name) m = D.models[i];
    var name = m ? m.name : (props.name || props.id);
    var selfHosted = m ? m.host === "Self-hosted" : /self-hosted/i.test(name || "");
    return html`<${A.Tooltip} title=${m ? m.where : null}><${A.Tag} icon=${html`<${Icon} name=${selfHosted ? "CloudServerOutlined" : "CloudOutlined"} />`} style=${{ marginInlineEnd: 0 }}>${name}<//><//>`;
  }
  function PersonTag(props) {
    var p = persona(props.id);
    var name = p ? p.name : personName(props.id);
    return html`<span style=${{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <${A.Avatar} size=${props.size || 22} style=${{ background: p ? p.color : "#8c8c8c", fontSize: 11, flex: "none" }}>${p ? p.initials : (name || "?").slice(0, 1)}<//>
      <span>${name}${props.showRole && p ? html`<span style=${{ opacity: 0.6 }}>${", " + p.role}</span>` : null}</span>
    </span>`;
  }

  function sowLabel(key) { return key === "intro" ? "Intro" : /^ch\d/.test(key) ? "Ch " + key.slice(2) : "§" + key; }
  function normSow(key) { return String(key || "").replace(/^§\s*/, "").trim(); }
  function openSow(key) { setUi({ sow: normSow(key) }); }
  function SowRef(props) {
    var keys = props.sec || props.section || props.id || "";
    var list = Array.isArray(keys) ? keys : String(keys).split(/[\s,]+/).filter(Boolean);
    return html`<${Fragment}>${list.map(function (k) {
      var key = normSow(k);
      return html`<${A.Tooltip} key=${key} title=${"Read " + sowLabel(key) + " of CICT's specification"}>
        <${A.Tag} bordered=${true} color="geekblue" role="button" tabIndex=${0}
          style=${{ cursor: "pointer", marginInlineEnd: 0, fontVariantNumeric: "tabular-nums" }}
          onClick=${function (e) { e.stopPropagation(); openSow(key); }}
          onKeyDown=${function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSow(key); } }}>${props.label || sowLabel(key)}<//>
      <//>`;
    })}<//>`;
  }

  function PageHeader(props) {
    var tok = A.theme.useToken().token;
    var sow = props.sow || [];
    return html`<div style=${{ marginBottom: 16 }}>
      ${props.crumbs ? html`<${A.Breadcrumb} style=${{ marginBottom: 6 }} items=${props.crumbs.map(function (c) {
        return { title: c.route ? html`<a onClick=${function (e) { e.preventDefault(); navigate(c.route, c.params); }} href=${"#" + c.route}>${c.label}</a>` : c.label };
      })} />` : null}
      <div style=${{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style=${{ minWidth: 0, flex: "1 1 320px" }}>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <h1 style=${{ margin: 0, fontSize: 22, lineHeight: 1.3, fontWeight: 600, color: tok.colorText }}>${props.title}</h1>
            ${props.phase ? html`<${PhaseTag} phase=${props.phase} />` : null}
            ${props.tags || null}
            ${sow.length ? html`<${SowRef} sec=${sow} />` : null}
          </div>
          ${props.subtitle ? html`<div style=${{ marginTop: 4, color: tok.colorTextSecondary, maxWidth: 820 }}>${props.subtitle}</div>` : null}
        </div>
        ${props.actions ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>${props.actions}</div>` : null}
      </div>
      ${props.children || null}
    </div>`;
  }

  function EmptyHint(props) {
    return html`<${A.Empty} image=${props.simple === false ? A.Empty.PRESENTED_IMAGE_DEFAULT : A.Empty.PRESENTED_IMAGE_SIMPLE}
      description=${html`<div><div style=${{ fontWeight: 500 }}>${props.title || "Nothing here yet"}</div>${props.description ? html`<div style=${{ opacity: 0.7, marginTop: 4 }}>${props.description}</div>` : null}</div>`}>
      ${props.action || null}
    <//>`;
  }

  function KeyFacts(props) {
    var items = (props.items || []).filter(Boolean).map(function (it, i) {
      if (Array.isArray(it)) return { key: String(i), label: it[0], children: it[1] === undefined || it[1] === null || it[1] === "" ? "None" : it[1], span: it[2] };
      return Object.assign({ key: String(i) }, it, { children: it.children !== undefined ? it.children : it.value });
    });
    return html`<${A.Descriptions} size=${props.size || "small"} bordered=${props.bordered !== false} title=${props.title}
      column=${props.column || { xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }} items=${items} />`;
  }

  function DetailDrawer(props) {
    var vp = useViewport();
    var size = vp.width < 720 ? "100%" : (props.size || props.width || 640);
    return html`<${A.Drawer} open=${!!props.open} onClose=${props.onClose} placement=${props.placement || "right"} size=${size} width=${size}
      destroyOnHidden=${true} zIndex=${props.zIndex || 1000}
      title=${html`<div style=${{ minWidth: 0 }}>
        <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><span style=${{ fontWeight: 600 }}>${props.title}</span>${props.tags || null}</div>
        ${props.subtitle ? html`<div style=${{ fontWeight: 400, fontSize: 13, opacity: 0.7, marginTop: 2 }}>${props.subtitle}</div>` : null}
      </div>`}
      extra=${vp.width < 720 ? null : (props.actions || null)} footer=${props.footer || null}>
      ${vp.width < 720 && props.actions ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>${props.actions}</div>` : null}
      ${props.children}
    <//>`;
  }

  /* DataTable: antd Table with search, filters, row click and empty state */
  function getField(row, key) {
    if (typeof key === "function") return key(row);
    return String(key).split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, row);
  }
  function DataTable(props) {
    var q = useState(""), fv = useState({});
    var data = props.data || props.dataSource || [];
    var filters = props.filters || [];
    var query = q[0].trim().toLowerCase();
    var filtered = useMemo(function () {
      return data.filter(function (row) {
        if (query) {
          var hay = props.searchKeys ? props.searchKeys.map(function (k) { return getField(row, k); }).join(" ") : JSON.stringify(row);
          if (String(hay).toLowerCase().indexOf(query) < 0) return false;
        }
        for (var i = 0; i < filters.length; i++) {
          var f = filters[i], v = fv[0][f.key];
          if (v === undefined || v === null || v === "") continue;
          if (f.match) { if (!f.match(row, v)) return false; }
          else {
            var val = getField(row, f.key);
            if (Array.isArray(val) ? val.indexOf(v) < 0 : String(val) !== String(v)) return false;
          }
        }
        return true;
      });
    }, [data, query, fv[0], filters]);
    var pageSize = props.pageSize || 8;
    var showToolbar = props.search !== false || filters.length || props.toolbar;
    return html`<div className=${props.className}>
      ${showToolbar ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        ${props.search !== false ? html`<${A.Input} allowClear placeholder=${props.searchPlaceholder || "Search"} prefix=${html`<${Icon} name="SearchOutlined" />`}
          value=${q[0]} onChange=${function (e) { q[1](e.target.value); }} style=${{ width: 260, maxWidth: "100%" }} />` : null}
        ${filters.map(function (f) {
          var opts = f.options || Array.from(new Set(data.reduce(function (acc, r) { var v = getField(r, f.key); return acc.concat(Array.isArray(v) ? v : [v]); }, []).filter(function (v) { return v !== undefined && v !== null && v !== ""; }))).sort();
          return html`<${A.Select} key=${f.key} allowClear placeholder=${f.label} value=${fv[0][f.key]} style=${{ minWidth: f.width || 150, maxWidth: "100%" }}
            options=${opts.map(function (o) { return typeof o === "object" ? o : { value: o, label: String(o) }; })}
            onChange=${function (v) { var n = Object.assign({}, fv[0]); n[f.key] = v; fv[1](n); }} />`;
        })}
        <div style=${{ flex: "1 1 auto" }}></div>
        ${props.toolbar || null}
        ${props.showCount !== false ? html`<span style=${{ fontSize: 12, opacity: 0.65, whiteSpace: "nowrap" }}>${filtered.length + (filtered.length === 1 ? " item" : " items")}</span>` : null}
      </div>` : null}
      <${A.Table} size=${props.size || "middle"} rowKey=${props.rowKey || "id"} columns=${props.columns} dataSource=${filtered}
        loading=${props.loading} rowSelection=${props.rowSelection} expandable=${props.expandable} title=${props.title}
        scroll=${{ x: "max-content" }}
        pagination=${filtered.length > pageSize ? { pageSize: pageSize, size: "small", showSizeChanger: false } : false}
        rowClassName=${props.onRowClick ? "clickable-row" : undefined}
        onRow=${props.onRowClick ? function (r) { return { onClick: function () { props.onRowClick(r); } }; } : undefined}
        locale=${{ emptyText: html`<${EmptyHint} title=${props.emptyTitle || "No matching items"} description=${props.emptyText || (query || Object.keys(fv[0]).some(function (k) { return fv[0][k]; }) ? "Try a different search or clear the filters." : null)} />` }} />
    </div>`;
  }
  var col = {
    id: function (title, dataIndex, extra) { return Object.assign({ title: title, dataIndex: dataIndex, key: dataIndex, render: function (v) { return html`<span className="mono nowrap">${v}</span>`; } }, extra || {}); },
    text: function (title, dataIndex, extra) { return Object.assign({ title: title, dataIndex: dataIndex, key: dataIndex }, extra || {}); },
    status: function (title, dataIndex, extra) { return Object.assign({ title: title, dataIndex: dataIndex, key: dataIndex, render: function (v) { return v ? html`<${StatusTag} status=${v} />` : null; } }, extra || {}); },
    date: function (title, dataIndex, extra) {
      return Object.assign({ title: title, dataIndex: dataIndex, key: dataIndex, render: function (v) { return html`<span className="nowrap">${v ? fmt.date(v) : "None"}</span>`; },
        sorter: function (a, b) { return String(getField(a, dataIndex) || "").localeCompare(String(getField(b, dataIndex) || "")); } }, extra || {});
    },
    dataClass: function (title, dataIndex, extra) { return Object.assign({ title: title, dataIndex: dataIndex, key: dataIndex, render: function (v) { return html`<${DataClassTag} cls=${v} />`; } }, extra || {}); },
    person: function (title, dataIndex, extra) { return Object.assign({ title: title, dataIndex: dataIndex, key: dataIndex, render: function (v) { return v ? html`<${PersonTag} id=${v} />` : null; } }, extra || {}); }
  };

  /* ------------------------------------------------------------------
     Document viewer, citations and source panel
     ------------------------------------------------------------------ */
  var DocViewer = forwardRef(function DocViewer(props, ref) {
    var tok = A.theme.useToken().token;
    var boxRef = useRef(null);
    var doc = getDocument(props.doc || props.docId);
    var hl = props.highlight ? (Array.isArray(props.highlight) ? props.highlight : [props.highlight]) : [];
    var focus = props.scrollTo || hl[0] || null;
    var ents = props.entities || (props.showEntities || props.masked ? D.maskingEntities[doc && doc.id] : null);

    function scrollToClause(id) {
      var box = boxRef.current;
      if (!box || !id) return;
      var el = box.querySelector('[data-clause="' + String(id).replace(/"/g, "") + '"]');
      if (!el) return;
      if (props.height && box.scrollHeight > box.clientHeight) box.scrollTo({ top: Math.max(0, el.offsetTop - 24), behavior: "smooth" });
      else el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    useImperativeHandle(ref, function () { return { scrollTo: scrollToClause }; });
    var mountedRef = useRef(false);
    useEffect(function () {
      var first = !mountedRef.current; mountedRef.current = true;
      if (!focus || (first && props.noInitialScroll)) return;
      var t = setTimeout(function () { scrollToClause(focus); }, 120);
      return function () { clearTimeout(t); };
    }, [focus, doc && doc.id, props.nonce]);

    if (!doc) return html`<${EmptyHint} title="Document not available" description="This sample document isn't included in the prototype." />`;
    var prev = 0;
    var pages = [];
    doc.pages.forEach(function (pg) {
      if (pg.n - prev > 1) pages.push(html`<div key=${"gap" + pg.n} className="doc-gap">${pg.n - prev === 2 ? "Page " + (prev + 1) + " not shown in this sample" : "Pages " + (prev + 1) + " to " + (pg.n - 1) + " not shown in this sample"}</div>`);
      prev = pg.n;
      pages.push(html`<div key=${"p" + pg.n} className="doc-page" data-page=${pg.n}>
        ${pg.clauses.map(function (c) {
          var isHl = hl.indexOf(c.id) >= 0;
          var body = ents ? renderSegments(c.text, ents, props.masked ? "masked" : "original", props.methods) : c.text;
          return html`<div key=${c.id} data-clause=${c.id} className=${cx("doc-clause", isHl && "is-hl")}
            onClick=${props.onClauseClick ? function () { props.onClauseClick(c, pg.n); } : undefined}
            style=${props.onClauseClick ? { cursor: "pointer" } : undefined}>
            ${c.heading ? html`<h4>${c.heading}</h4>` : null}
            <p>${body}</p>
            ${c.note ? html`<div style=${{ marginTop: 6, fontFamily: tok.fontFamily, fontSize: 12, display: "flex", gap: 6, alignItems: "flex-start", color: c.note.kind === "warning" ? tok.colorWarningText : tok.colorTextSecondary }}>
              <${Icon} name=${c.note.kind === "tracked" ? "EditOutlined" : c.note.kind === "warning" ? "WarningOutlined" : "InfoCircleOutlined"} style=${{ marginTop: 3 }} />
              <span>${c.note.text}</span></div>` : null}
          </div>`;
        })}
        <div className="doc-page-no">${"Page " + pg.n + " of " + (doc.totalPages || doc.pages[doc.pages.length - 1].n)}</div>
      </div>`);
    });
    return html`<div style=${Object.assign({ minWidth: 0 }, props.style || {})}>
      ${props.showHeader !== false ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <${Icon} name="FileTextOutlined" style=${{ color: tok.colorTextSecondary }} />
        <span style=${{ fontWeight: 600 }}>${doc.title}</span>
        ${doc.dataClass ? html`<${DataClassTag} cls=${doc.dataClass} />` : null}
        ${props.masked ? html`<${A.Tag} color="green" style=${{ marginInlineEnd: 0 }}>Masked view<//>` : null}
        ${doc.version ? html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${doc.version}</span>` : null}
      </div>` : null}
      <div ref=${boxRef} style=${{ position: "relative", maxHeight: props.height || undefined, overflowY: props.height ? "auto" : undefined, paddingRight: props.height ? 4 : 0 }}>
        ${pages}
      </div>
    </div>`;
  });

  function openSource(cite, cites) {
    if (!cite) return;
    setUi({ source: { cite: cite, cites: cites || [cite] } });
  }
  function CitationChip(props) {
    var tok = A.theme.useToken().token;
    var cite = props.cite || {};
    var label = cite.doc ? citeLabel(cite) : (props.label || "");
    var open = function (e) {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      if (props.onOpen) props.onOpen(cite, props.n); else openSource(cite, props.cites);
    };
    return html`<${A.Tooltip} title=${label}>
      <span role="button" tabIndex=${0} aria-label=${"Source " + props.n + ": " + label} onClick=${open}
        onKeyDown=${function (e) { if (e.key === "Enter" || e.key === " ") open(e); }}
        style=${{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 5px", margin: "0 2px",
          borderRadius: 9, fontSize: 11, fontWeight: 600, lineHeight: "18px", verticalAlign: "2px", cursor: "pointer",
          background: props.active ? tok.colorPrimary : tok.colorPrimaryBg, color: props.active ? tok.colorWhite : tok.colorPrimary,
          border: "1px solid " + tok.colorPrimaryBorder, userSelect: "none" }}>${props.n}</span>
    <//>`;
  }
  /* CitedText: plain text with [n] markers, **bold**, blank-line paragraphs and "- " bullets. */
  function isActiveCite(active, n, cite) {
    if (active == null || active === false) return false;
    if (typeof active === "number") return active === n;
    var c = active.cite || active;
    return !!(c && cite && c.doc === cite.doc && c.clause === cite.clause && (active.n == null || active.n === n));
  }
  function renderInline(text, cites, onOpen, keyBase, active) {
    var parts = String(text).split(/(\[\d+\]|\*\*[^*]+\*\*)/g);
    return parts.map(function (p, i) {
      var m = /^\[(\d+)\]$/.exec(p);
      if (m && cites && cites[Number(m[1]) - 1]) return html`<${CitationChip} key=${keyBase + "-" + i} n=${Number(m[1])} cite=${cites[Number(m[1]) - 1]} cites=${cites} onOpen=${onOpen} active=${isActiveCite(active, Number(m[1]), cites[Number(m[1]) - 1])} />`;
      var b = /^\*\*([^*]+)\*\*$/.exec(p);
      if (b) return html`<strong key=${keyBase + "-" + i}>${b[1]}</strong>`;
      return p;
    });
  }
  function CitedText(props) {
    var blocks = String(props.text || "").split(/\n{2,}/);
    return html`<div style=${{ lineHeight: 1.65 }}>${blocks.map(function (blk, bi) {
      var lines = blk.split("\n");
      if (lines.every(function (l) { return /^\s*- /.test(l); })) {
        return html`<ul key=${bi} style=${{ margin: "0 0 8px", paddingLeft: 20 }}>${lines.map(function (l, li) { return html`<li key=${li}>${renderInline(l.replace(/^\s*- /, ""), props.cites, props.onOpen, bi + "-" + li, props.active)}</li>`; })}</ul>`;
      }
      return html`<p key=${bi} style=${{ margin: "0 0 8px" }}>${renderInline(blk, props.cites, props.onOpen, String(bi), props.active)}</p>`;
    })}</div>`;
  }

  function SourcePanel(props) {
    var tok = A.theme.useToken().token;
    var cites = props.cites || (props.cite ? [props.cite] : []);
    var idxState = useState(Math.max(0, cites.indexOf(props.cite)));
    useEffect(function () { idxState[1](Math.max(0, cites.indexOf(props.cite))); }, [props.cite]);
    var idx = idxState[0];
    var cite = cites[idx] || props.cite;
    if (!cite) return html`<${EmptyHint} title="No source selected" description="Open a citation chip to see the clause on its page." />`;
    var doc = getDocument(cite.doc);
    var clause = findClause(cite.doc, cite.clause);
    return html`<div style=${{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style=${{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style=${{ flex: 1, minWidth: 0 }}>
          <div style=${{ fontWeight: 600 }}>${doc ? doc.title : cite.doc}</div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${(clause ? clause.heading : cite.clause) + " · Page " + (cite.page || (clause && clause.page) || "") + (doc && doc.version ? " · " + doc.version : "")}</div>
        </div>
        ${cites.length > 1 ? html`<${A.Space} size=${4}>
          <${A.Button} size="small" icon=${html`<${Icon} name="LeftOutlined" />`} aria-label="Previous source" disabled=${idx === 0} onClick=${function () { idxState[1](idx - 1); }} />
          <span style=${{ fontSize: 12, whiteSpace: "nowrap" }}>${idx + 1 + " of " + cites.length}</span>
          <${A.Button} size="small" icon=${html`<${Icon} name="RightOutlined" />`} aria-label="Next source" disabled=${idx === cites.length - 1} onClick=${function () { idxState[1](idx + 1); }} />
        <//>` : null}
        ${props.onClose ? html`<${A.Button} size="small" type="text" icon=${html`<${Icon} name="CloseOutlined" />`} aria-label="Close source" onClick=${props.onClose} />` : null}
      </div>
      ${clause ? html`<div style=${{ borderLeft: "3px solid " + tok.colorWarning, padding: "6px 12px", background: tok.colorWarningBg, borderRadius: 4, fontSize: 13 }}>
        <div style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextSecondary, marginBottom: 2 }}>Cited text</div>
        ${clause.text}
      </div>` : null}
      <${DocViewer} doc=${cite.doc} highlight=${cite.clause} height=${props.height || 520} showHeader=${false} nonce=${idx} />
    </div>`;
  }
  function SourceDrawer() {
    var src = useStore(function (s) { return s.ui.source; });
    var vp = useViewport();
    return html`<${A.Drawer} open=${!!src} onClose=${function () { setUi({ source: null }); }} size=${vp.width < 700 ? "100%" : 580} width=${vp.width < 700 ? "100%" : 580}
      zIndex=${1050} title="Source" destroyOnHidden=${true}>
      ${src ? html`<${SourcePanel} cite=${src.cite} cites=${src.cites} height=${"calc(100vh - 220px)"} />` : null}
    <//>`;
  }

  /* ------------------------------------------------------------------
     Chat building blocks
     ------------------------------------------------------------------ */
  var CHAT_MODES = ["Ask", "Review a contract", "Draft", "Translate", "Check a policy"];
  function TypingIndicator(props) {
    var tok = A.theme.useToken().token;
    return html`<span style=${{ display: "inline-flex", alignItems: "center", gap: 8, color: tok.colorTextSecondary }} aria-live="polite">
      <span className="typing" aria-hidden="true"><i></i><i></i><i></i></span>
      ${props.label ? html`<span style=${{ fontSize: 13 }}>${props.label}</span>` : null}
    </span>`;
  }
  function useStreamingText(text, opts) {
    opts = opts || {};
    var tokens = useMemo(function () { return String(text || "").split(/(\s+)/); }, [text]);
    var idx = useState(opts.autoStart === false ? 0 : 0);
    var running = useState(opts.autoStart !== false);
    var stopped = useState(false);
    var timer = useRef(null);
    var doneRef = useRef(false);
    useEffect(function () { idx[1](0); stopped[1](false); doneRef.current = false; running[1](opts.autoStart !== false); }, [text]);
    useEffect(function () {
      if (!running[0]) return;
      var step = opts.wordsPerTick || 1;
      timer.current = setInterval(function () {
        idx[1](function (i) {
          var n = Math.min(tokens.length, i + step * 2);
          if (n >= tokens.length) { clearInterval(timer.current); running[1](false); }
          return n;
        });
      }, opts.interval || 35);
      return function () { clearInterval(timer.current); };
    }, [running[0], tokens]);
    var done = idx[0] >= tokens.length && tokens.length > 0;
    useEffect(function () { if (done && !doneRef.current) { doneRef.current = true; if (opts.onDone) opts.onDone(); } }, [done]);
    return {
      text: tokens.slice(0, idx[0]).join(""),
      done: done, streaming: running[0] && !done, stopped: stopped[0],
      stop: function () { clearInterval(timer.current); running[1](false); stopped[1](true); if (opts.onStop) opts.onStop(); },
      start: function () { stopped[1](false); running[1](true); },
      skip: function () { clearInterval(timer.current); idx[1](tokens.length); running[1](false); }
    };
  }
  function StreamingText(props) {
    var s = useStreamingText(props.text, { interval: props.interval, wordsPerTick: props.wordsPerTick, onDone: props.onDone, autoStart: props.autoStart });
    useEffect(function () { if (props.controlRef) props.controlRef.current = s; });
    return html`<div className=${s.streaming ? "stream-caret" : undefined}>
      ${props.cites || props.rich ? html`<${CitedText} text=${s.text} cites=${props.cites} onOpen=${props.onOpen} />` : s.text}
      ${s.stopped ? html`<div style=${{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Stopped. The answer is incomplete.</div>` : null}
    </div>`;
  }

  function fileIcon(name) {
    var n = String(name || "").toLowerCase();
    if (/\.pdf$/.test(n)) return "FilePdfOutlined";
    if (/\.docx?$/.test(n)) return "FileWordOutlined";
    if (/\.xlsx?$|\.csv$/.test(n)) return "FileExcelOutlined";
    return "FileTextOutlined";
  }
  function FileChip(props) {
    var tok = A.theme.useToken().token;
    return html`<span onClick=${props.onClick} role=${props.onClick ? "button" : undefined} tabIndex=${props.onClick ? 0 : undefined}
      style=${{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, maxWidth: "100%",
        border: "1px solid " + tok.colorBorderSecondary, background: tok.colorFillQuaternary, cursor: props.onClick ? "pointer" : "default", fontSize: 13 }}>
      <${Icon} name=${fileIcon(props.name)} style=${{ fontSize: 18, color: tok.colorPrimary }} />
      <span style=${{ minWidth: 0 }}>
        <span style=${{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>${props.name}</span>
        ${props.meta ? html`<span style=${{ display: "block", fontSize: 11, color: tok.colorTextSecondary }}>${props.meta}</span>` : null}
      </span>
      ${props.onRemove ? html`<${A.Button} size="small" type="text" aria-label=${"Remove " + props.name} icon=${html`<${Icon} name="CloseOutlined" />`} onClick=${function (e) { e.stopPropagation(); props.onRemove(); }} />` : null}
    </span>`;
  }

  function ChatThread(props) {
    var tok = A.theme.useToken().token;
    var box = useRef(null);
    var nearBottom = useRef(true);
    useEffect(function () {
      var el = box.current;
      if (!el) return;
      var onScroll = function () { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };
      el.addEventListener("scroll", onScroll);
      var obs = new MutationObserver(function () { if (nearBottom.current && props.autoScroll !== false) el.scrollTop = el.scrollHeight; });
      obs.observe(el, { childList: true, subtree: true, characterData: true });
      el.scrollTop = el.scrollHeight;
      return function () { el.removeEventListener("scroll", onScroll); obs.disconnect(); };
    }, []);
    return html`<div ref=${box} style=${Object.assign({ overflowY: "auto", height: props.height, maxHeight: props.maxHeight, padding: "8px 4px 16px", display: "flex", flexDirection: "column", gap: 18 }, props.style || {})}
      role="log" aria-live="polite" aria-label="Conversation">
      ${props.children && React.Children.count(props.children) ? props.children : (props.empty || html`<div style=${{ margin: "auto", color: tok.colorTextSecondary }}>No messages yet.</div>`)}
    </div>`;
  }

  function ChatMessage(props) {
    var tok = A.theme.useToken().token;
    var role = props.role || "assistant";
    if (role === "system" || role === "event") {
      return html`<div style=${{ display: "flex", justifyContent: "center" }}>
        <span style=${{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12, color: tok.colorTextSecondary, padding: "4px 12px", borderRadius: 12, background: tok.colorFillTertiary, maxWidth: "100%" }}>
          <${Icon} name=${props.icon || "InfoCircleOutlined"} />${props.children}
        </span>
      </div>`;
    }
    if (role === "user") {
      var p = persona(props.personaId || currentPersonaId());
      return html`<div style=${{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        ${props.attachments && props.attachments.length ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: "85%" }}>
          ${props.attachments.map(function (a, i) { return html`<${FileChip} key=${i} name=${a.name} meta=${a.meta} onClick=${a.onClick} />`; })}</div>` : null}
        <div style=${{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: "85%" }}>
          <div style=${{ background: tok.colorPrimary, color: "#fff", padding: "10px 14px", borderRadius: "16px 16px 4px 16px", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>${props.children}</div>
          ${p ? html`<${A.Avatar} size=${28} style=${{ background: p.color, flex: "none", fontSize: 12 }}>${p.initials}<//>` : null}
        </div>
        ${props.time ? html`<span style=${{ fontSize: 11, color: tok.colorTextTertiary, marginRight: 36 }}>${props.time}</span>` : null}
      </div>`;
    }
    return html`<div style=${{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "100%" }}>
      <${A.Avatar} size=${28} style=${{ background: tok.colorPrimary, flex: "none" }} icon=${html`<${Icon} name="RobotOutlined" />`} />
      <div style=${{ flex: 1, minWidth: 0, maxWidth: 880 }}>
        <div style=${{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <span style=${{ fontWeight: 600 }}>${props.author || "Assistant"}</span>
          ${props.badges || null}
          ${props.time ? html`<span style=${{ fontSize: 11, color: tok.colorTextTertiary }}>${props.time}</span>` : null}
        </div>
        <div style=${{ background: tok.colorBgContainer, border: "1px solid " + tok.colorBorderSecondary, borderRadius: "4px 16px 16px 16px", padding: "12px 16px", wordBreak: "break-word" }}>
          ${props.children}
        </div>
        ${props.footer ? html`<div style=${{ marginTop: 8 }}>${props.footer}</div>` : null}
        ${props.actions ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>${props.actions}</div>` : null}
      </div>
    </div>`;
  }

  function defaultAttachOptions() {
    var docs = Object.keys(D.documents).map(function (k) { var d = D.documents[k]; return { key: "doc:" + d.id, name: (d.file || d.title + ".pdf"), meta: d.totalPages + " pages", ref: d.id }; });
    var recs = D.records.slice(0, 6).map(function (r) { return { key: "rec:" + r.id, name: r.title + (r.format && /Word/.test(r.format) ? ".docx" : r.format && /Excel/.test(r.format) ? ".xlsx" : ".pdf"), meta: r.id + ", " + r.pages + " pages", ref: r.id }; });
    return docs.concat(recs);
  }
  function Composer(props) {
    var tok = A.theme.useToken().token;
    var vp = useViewport();
    var inner = useState("");
    var value = props.value !== undefined ? props.value : inner[0];
    var setValue = props.onChange || inner[1];
    var modes = props.modes || CHAT_MODES;
    var attachOpts = props.attachOptions || defaultAttachOptions();
    var send = function () {
      var v = String(value || "").trim();
      if (!v && !(props.attachments && props.attachments.length)) return;
      if (props.disabled || props.streaming) return;
      if (props.onSend) props.onSend(v, { mode: props.mode, attachments: props.attachments || [] });
      setValue("");
    };
    return html`<div style=${{ display: "flex", flexDirection: "column", gap: 8 }}>
      ${props.suggestions && props.suggestions.length ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        ${props.suggestions.map(function (s, i) {
          return html`<${A.Button} key=${i} size="small" shape="round" icon=${html`<${Icon} name="BulbOutlined" />`}
            onClick=${function () { if (props.onSuggestion) props.onSuggestion(s); else setValue(s); }}>${s}<//>`;
        })}
      </div>` : null}
      <div style=${{ border: "1px solid " + tok.colorBorder, borderRadius: 12, background: tok.colorBgContainer, padding: "8px 10px", boxShadow: tok.boxShadowTertiary }}>
        ${props.attachments && props.attachments.length ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          ${props.attachments.map(function (a, i) {
            return html`<${FileChip} key=${i} name=${a.name} meta=${a.meta} onRemove=${props.onRemoveAttachment ? function () { props.onRemoveAttachment(a, i); } : null} />`;
          })}</div>` : null}
        <${A.Input.TextArea} variant="borderless" autoSize=${{ minRows: 1, maxRows: 6 }} value=${value} disabled=${props.disabled}
          placeholder=${props.placeholder || "Ask about a contract, record or policy"} aria-label="Message"
          onChange=${function (e) { setValue(e.target.value); }}
          onKeyDown=${function (e) { if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent && e.nativeEvent.isComposing)) { e.preventDefault(); send(); } }}
          style=${{ padding: "4px 2px", fontSize: 15 }} />
        <div style=${{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <${A.Dropdown} trigger=${["click"]} menu=${{
            items: [{ type: "group", label: "Sample files", children: attachOpts.map(function (o) { return { key: o.key, icon: html`<${Icon} name=${fileIcon(o.name)} />`, label: o.name }; }) }],
            onClick: function (info) {
              var o = attachOpts.filter(function (x) { return x.key === info.key; })[0];
              if (o && props.onAttach) props.onAttach(o);
              else if (o) toast.build("In the build, the file uploads, is classified and checked for sensitive data before anything else happens.");
            }
          }}>
            <${A.Tooltip} title="Attach a file"><${A.Button} type="text" icon=${html`<${Icon} name="PaperClipOutlined" />`} aria-label="Attach a file" disabled=${props.disabled} /><//>
          <//>
          ${props.onModeChange ? (vp.width >= 900 && props.modeStyle !== "select" ? html`<${A.Segmented} size="small" value=${props.mode} options=${modes} onChange=${props.onModeChange} />`
            : html`<${A.Select} size="small" value=${props.mode} options=${modes.map(function (m) { return { value: m, label: m }; })} onChange=${props.onModeChange} style=${{ minWidth: 150 }} popupMatchSelectWidth=${false} />`) : null}
          <div style=${{ flex: 1 }}></div>
          ${props.leftNote ? html`<span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${props.leftNote}</span>` : null}
          ${props.streaming ? html`<${A.Button} danger icon=${html`<${Icon} name="PauseCircleOutlined" />`} onClick=${props.onStop}>Stop<//>`
            : html`<${A.Button} type="primary" shape="circle" aria-label="Send" icon=${html`<${Icon} name="ArrowUpOutlined" />`} onClick=${send}
              disabled=${props.disabled || (!String(value || "").trim() && !(props.attachments && props.attachments.length))} />`}
        </div>
      </div>
      ${props.footerNote !== false ? html`<div style=${{ fontSize: 11, color: tok.colorTextTertiary, textAlign: "center" }}>${props.footerNote || "Answers are drafts until an authorised person confirms them. Sample data only."}</div>` : null}
    </div>`;
  }

  function AnswerTrace(props) {
    var tok = A.theme.useToken().token;
    var steps = props.steps || [];
    var colors = { done: "green", warn: "orange", wait: "blue", fail: "red", blocked: "red" };
    var summary = props.summary || steps.slice(0, 4).map(function (s) { return s.label; }).join(" · ");
    return html`<${A.Collapse} size="small" ghost=${props.ghost !== false} defaultActiveKey=${props.defaultOpen ? ["t"] : []} items=${[{
      key: "t",
      label: html`<span style=${{ fontSize: 13 }}><${Icon} name="ApartmentOutlined" style=${{ marginRight: 6 }} />${props.title || "How this answer was made"}
        <span style=${{ color: tok.colorTextTertiary, marginLeft: 8, fontSize: 12 }}>${summary}</span></span>`,
      children: html`<${A.Timeline} style=${{ marginTop: 8 }} items=${steps.map(function (s, i) {
        var c = html`<div><div style=${{ fontWeight: 500 }}>${s.label}</div>${s.detail ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${s.detail}</div>` : null}</div>`;
        return { key: String(i), color: colors[s.status] || "gray", children: c, content: c };
      })} />`
    }]} />`;
  }

  /* Approval card and payload preview, live from the store */
  function PayloadPreview(props) {
    var tok = A.theme.useToken().token;
    var req = props.request;
    if (!req) return null;
    var p = req.payload || {};
    var canSeeOriginal = props.showOriginal !== undefined ? props.showOriginal : (currentPersonaId() === req.ownerId || currentPersonaId() === req.requesterId);
    return html`<div style=${{ display: "flex", flexDirection: "column", gap: 14 }}>
      <${KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
        ["Destination", req.destination], ["Data class", html`<${DataClassTag} cls=${req.dataClass} />`],
        ["Requested by", html`<${PersonTag} id=${req.requesterId} showRole=${true} />`], ["Purpose", req.purpose || req.title]
      ]} />
      <div>
        <div style=${{ fontWeight: 600, marginBottom: 6 }}>Exact text that will be sent</div>
        <div style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 12, background: tok.colorFillQuaternary, fontSize: 13, display: "flex", flexDirection: "column", gap: 10 }}>
          <div><div style=${{ fontSize: 11, textTransform: "uppercase", color: tok.colorTextTertiary }}>Question</div>${p.question}</div>
          ${(p.passages || []).map(function (ps, i) {
            return html`<div key=${i}><div style=${{ fontSize: 11, textTransform: "uppercase", color: tok.colorTextTertiary }}>${"Passage " + (i + 1) + " · " + ps.source}</div>
              <span className="mono" style=${{ fontSize: 12.5 }}>${ps.text}</span></div>`;
          })}
          ${(p.attachments || []).length ? html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 6 }}>${p.attachments.map(function (a, i) { return html`<${FileChip} key=${i} name=${a.name} meta=${a.note} />`; })}</div>` : null}
        </div>
      </div>
      ${(req.entities || []).length ? html`<div>
        <div style=${{ fontWeight: 600, marginBottom: 6 }}>What was masked</div>
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey=${function (r) { return r.type + r.replacement; }} dataSource=${req.entities}
          columns=${[
            { title: "Type", dataIndex: "type" },
            { title: "Original", dataIndex: "original", render: function (v) { return canSeeOriginal ? v : html`<span style=${{ opacity: 0.6 }}>Hidden for your role</span>`; } },
            { title: "Sent as", dataIndex: "replacement", render: function (v) { return html`<span className="mono">${v}</span>`; } },
            { title: "Places", dataIndex: "count", align: "right" }
          ]} /></div>
      </div>` : null}
      <div>
        <div style=${{ fontWeight: 600, marginBottom: 6 }}>Outbound check</div>
        <${A.Flex} vertical gap=${6}>
          <span><${StatusTag} status="Passed" /> No unmasked sensitive fields found in the question, passages or attachments</span>
          ${(req.unscanned || []).length ? req.unscanned.map(function (u, i) { return html`<span key=${i}>${req.pendingCheck ? html`<${StatusTag} status="Pending" tone="warning">Manual check needed<//>` : html`<${StatusTag} status="Done">Manual check<//>`} ${u.where}: ${u.resolution}</span>`; })
            : html`<span><${StatusTag} status="Passed" /> Every part of the file could be scanned</span>`}
          <span><${StatusTag} status="Passed" /> Destination approved for ${req.dataClass} content after masking</span>
          <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Bedrock does not share prompts with model providers or use them for training. Requests stay in ap-south-1 (sample terms).</span>
        <//>
      </div>
    </div>`;
  }

  function ApprovalCard(props) {
    var tok = A.theme.useToken().token;
    var pid = useStore(function (s) { return s.ui.personaId; });
    var req = useStore(function (s) { return props.request || findById(s.releaseRequests, props.requestId); });
    var modal = useState(false);
    var comment = useState("");
    if (!req) return null;
    var isOwner = pid === req.ownerId;
    var showDecision = props.showDecision !== undefined ? props.showDecision : isOwner;
    var pending = req.status === "Pending";
    var tone = pending ? "warning" : req.status === "Approved" ? "success" : "error";
    var border = pending ? tok.colorWarningBorder : req.status === "Approved" ? tok.colorSuccessBorder : tok.colorErrorBorder;
    var bg = pending ? tok.colorWarningBg : req.status === "Approved" ? tok.colorSuccessBg : tok.colorErrorBg;
    var decide = function (ok) {
      actions.decideRelease(req.id, ok ? "Approved" : "Rejected", comment[0] || (ok ? "Approved for this task only." : "Not approved."));
      toast[ok ? "success" : "warn"](ok ? "Release approved. " + personName(req.requesterId) + " has been notified." : "Release rejected. " + personName(req.requesterId) + " has been notified.");
      if (props.onDecided) props.onDecided(ok);
    };
    return html`<div style=${{ border: "1px solid " + border, background: bg, borderRadius: 10, padding: "12px 14px", maxWidth: 720 }}>
      <div style=${{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <${Icon} name=${pending ? "ClockCircleOutlined" : req.status === "Approved" ? "CheckCircleOutlined" : "StopOutlined"} style=${{ fontSize: 18, marginTop: 2, color: pending ? tok.colorWarning : req.status === "Approved" ? tok.colorSuccess : tok.colorError }} />
        <div style=${{ flex: 1, minWidth: 0 }}>
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style=${{ fontWeight: 600 }}>${pending ? "Waiting for release approval" : req.status === "Approved" ? "Release approved" : "Release rejected"}</span>
            <span className="mono" style=${{ fontSize: 12, opacity: 0.7 }}>${req.id}</span>
            <${StatusTag} status=${req.status} tone=${tone} />
          </div>
          <div style=${{ fontSize: 13, marginTop: 4 }}>
            ${pending ? html`<span>Sent to <b>${personName(req.ownerId)}</b> (data owner) at ${fmt.time(req.createdAt)}. Only masked content goes to ${req.destination}. Masking alone is not permission to send material out <${SowRef} sec="1.4.7" />.</span>`
              : req.status === "Approved" ? html`<span><b>${personName(req.decidedBy)}</b> approved at ${fmt.time(req.decidedAt)}${req.comment ? ': "' + req.comment + '"' : "."}</span>`
              : html`<span><b>${personName(req.decidedBy)}</b> rejected at ${fmt.time(req.decidedAt)}${req.comment ? ': "' + req.comment + '"' : "."} Nothing was sent.</span>`}
          </div>
          ${props.compact ? null : html`<div style=${{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <${DataClassTag} cls=${req.dataClass} />
            <${ModelTag} name=${req.destination.split(" (")[0]} />
            <${A.Tag} style=${{ marginInlineEnd: 0 }}>${(req.entities || []).length + " items masked"}<//>
            <${A.Tag} style=${{ marginInlineEnd: 0 }}>${((req.payload && req.payload.passages) || []).length + " passages"}<//>
          </div>`}
          <div style=${{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <${A.Button} size="small" icon=${html`<${Icon} name="EyeOutlined" />`} onClick=${function () { modal[1](true); }}>Preview payload<//>
            ${pending && showDecision ? html`<${Fragment}>
              <${A.Button} size="small" type="primary" onClick=${function () { decide(true); }}>Approve<//>
              <${A.Button} size="small" danger onClick=${function () { decide(false); }}>Reject<//>
            <//>` : null}
            ${pending && !isOwner && props.demoSwitch !== false ? html`<${A.Button} size="small" type="dashed" icon=${html`<${Icon} name="UserSwitchOutlined" />`}
              onClick=${function () { actions.setPersona(req.ownerId); navigate("approvals", { id: req.id }); toast.info("You are now " + personName(req.ownerId) + ", Data owner."); }}>${"Switch to " + personName(req.ownerId) + " to decide"}<//>` : null}
            ${props.extraActions || null}
          </div>
          ${pending && showDecision ? html`<${A.Input} size="small" style=${{ marginTop: 8 }} placeholder="Comment for the requester (optional)" value=${comment[0]} onChange=${function (e) { comment[1](e.target.value); }} />` : null}
        </div>
      </div>
      <${A.Modal} open=${modal[0]} onCancel=${function () { modal[1](false); }} title=${"Outbound payload for " + req.id} width=${760} footer=${html`<${A.Button} onClick=${function () { modal[1](false); }}>Close<//>`}>
        <${PayloadPreview} request=${req} />
      <//>
    </div>`;
  }

  /* Redline with jsdiff */
  function diffParts(before, after, mode) {
    var Diff = window.Diff;
    if (!Diff) return [{ value: after }];
    if (mode === "chars") return Diff.diffChars(before || "", after || "");
    if (mode === "sentences") return Diff.diffSentences(before || "", after || "");
    if (mode === "lines") return Diff.diffLines(before || "", after || "");
    return Diff.diffWordsWithSpace(before || "", after || "");
  }
  function diffStats(before, after, mode) {
    var parts = diffParts(before, after, mode), added = 0, removed = 0;
    parts.forEach(function (p) { var n = (p.value.match(/\S+/g) || []).length; if (p.added) added += n; if (p.removed) removed += n; });
    return { added: added, removed: removed, changed: added + removed > 0 };
  }
  function Redline(props) {
    var parts = diffParts(props.before, props.after, props.mode);
    return html`<div className="redline" style=${props.style}>
      ${parts.map(function (p, i) {
        if (p.added) return html`<ins key=${i} title="Added">${p.value}</ins>`;
        if (p.removed) return html`<del key=${i} title="Removed">${p.value}</del>`;
        return html`<span key=${i}>${p.value}</span>`;
      })}
      ${props.showLegend ? html`<div style=${{ fontSize: 12, marginTop: 6, opacity: 0.75 }}><ins>added</ins> <del>removed</del></div>` : null}
    </div>`;
  }

  /* Masking compare: original vs masked with method selectors */
  function MaskingCompare(props) {
    var tok = A.theme.useToken().token;
    var ents = props.entities || D.maskingEntities[props.docId] || [];
    var init = {};
    ents.forEach(function (e) { init[e.id] = e.method || "placeholder"; });
    var inner = useState(init);
    var methods = props.methods || inner[0];
    var setMethod = function (id, m) {
      var n = Object.assign({}, methods); n[id] = m;
      if (props.onMethodsChange) props.onMethodsChange(n); else inner[1](n);
    };
    var paras;
    if (props.text) paras = String(props.text).split(/\n+/).map(function (t) { return { heading: null, text: t }; });
    else {
      var doc = getDocument(props.docId);
      var wanted = props.clauses;
      paras = [];
      if (doc) doc.pages.forEach(function (pg) { pg.clauses.forEach(function (c) { if ((!wanted || wanted.indexOf(c.id) >= 0) && c.id !== "img7") paras.push(c); }); });
    }
    var focus = useState(null);
    var focusEnt = focus[0] ? ents.filter(function (e) { return e.id === focus[0]; })[0] : null;
    var shown = focusEnt ? paras.filter(function (c) { return String(c.text || "").indexOf(focusEnt.text) >= 0; }) : paras;
    var pane = function (mode) {
      return html`<div style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 12, background: tok.colorBgContainer, fontSize: 13, lineHeight: 1.65, maxHeight: props.height || 340, overflowY: "auto" }}>
        ${focusEnt && !shown.length ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Found in parts of the file not shown in this sample, such as headers and the signature block.</div>` : null}
        ${shown.map(function (c, i) {
          return html`<p key=${i} style=${{ margin: "0 0 8px" }}>${c.heading ? html`<b>${c.heading + ". "}</b>` : null}${renderSegments(c.text, ents, mode, methods)}</p>`;
        })}
      </div>`;
    };
    return html`<div style=${{ display: "flex", flexDirection: "column", gap: 14 }}>
      ${focusEnt ? html`<${A.Alert} type="info" showIcon message=${"Showing only the passages that contain " + focusEnt.type.toLowerCase() + " “" + focusEnt.text + "”"} title=${"Showing only the passages that contain " + focusEnt.type.toLowerCase() + " “" + focusEnt.text + "”"}
        action=${html`<${A.Button} size="small" onClick=${function () { focus[1](null); }}>Show all text<//>`} />` : null}
      <${A.Row} gutter=${[16, 12]}>
        <${A.Col} xs=${24} md=${12}>
          <div style=${{ fontWeight: 600, marginBottom: 6 }}>Original <span style=${{ fontWeight: 400, fontSize: 12, color: tok.colorTextSecondary }}>restricted, you are authorised</span></div>
          ${pane("original")}
        <//>
        <${A.Col} xs=${24} md=${12}>
          <div style=${{ fontWeight: 600, marginBottom: 6 }}>Masked preview <span style=${{ fontWeight: 400, fontSize: 12, color: tok.colorTextSecondary }}>what may leave the CICT VPC</span></div>
          ${pane("masked")}
        <//>
      <//>
      ${props.showTable !== false ? html`<div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="id" dataSource=${ents}
        rowClassName=${function (e) { return "clickable-row" + (e.id === focus[0] ? " ant-table-row-selected" : ""); }}
        onRow=${function (e) { return { onClick: function (ev) { if (ev.target && ev.target.closest && ev.target.closest(".ant-select")) return; focus[1](focus[0] === e.id ? null : e.id); } }; }}
        columns=${[
        { title: "Type", dataIndex: "type", render: function (v) { return html`<span className="nowrap">${v}</span>`; } },
        { title: "Found", dataIndex: "text", render: function (v) { return html`<mark className="ent">${v}</mark>`; } },
        { title: "Method", key: "method", render: function (_, e) {
          return html`<${A.Select} size="small" value=${methods[e.id]} style=${{ width: 130 }} disabled=${props.readOnly}
            options=${MASK_METHODS.filter(function (m) { return m.value !== "range" || e.range; })}
            onChange=${function (v) { setMethod(e.id, v); }} aria-label=${"Method for " + e.type} />`;
        } },
        { title: "Sent as", key: "out", render: function (_, e) { return html`<span className="mono nowrap">${maskValue(e, methods[e.id])}</span>`; } },
        { title: "Places", dataIndex: "count", align: "right" }
      ]} /></div>` : null}
      ${props.showLocations ? html`<div>
        <div style=${{ fontWeight: 600, marginBottom: 6 }}>Where it looked</div>
        <${A.Flex} vertical gap=${6}>${MASKING_LOCATIONS.map(function (l, i) {
          return html`<div key=${i} style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><span style=${{ minWidth: 130, fontWeight: 500 }}>${l.where}</span><${StatusTag} status=${l.status} /><span style=${{ fontSize: 13, color: tok.colorTextSecondary }}>${l.detail}</span></div>`;
        })}<//>
      </div>` : null}
      <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>The same entity always gets the same stand-in, so links between clauses stay intact. Originals and the stand-in key are stored separately with their own permissions <${SowRef} sec="1.4" />.</div>
    </div>`;
  }

  /* ------------------------------------------------------------------
     SOW drawer
     ------------------------------------------------------------------ */
  function sowBlocks(body, hl) {
    var out = [], i = 0, k = 0;
    while (i < body.length) {
      var b = body[i];
      if (b[0] === "li" || b[0] === "bl") {
        var kind = b[0], items = [];
        while (i < body.length && body[i][0] === kind) {
          var it = body[i];
          items.push(kind === "li"
            ? html`<li key=${i} value=${Number(it[1])} className=${hl && hl === String(it[1]) ? "hl" : undefined}>${it[2]}</li>`
            : html`<li key=${i}>${it[1]}</li>`);
          i++;
        }
        out.push(kind === "li" ? html`<ol key=${"l" + k++}>${items}</ol>` : html`<ul key=${"l" + k++}>${items}</ul>`);
        continue;
      }
      if (b[0] === "table") {
        out.push(html`<div key=${"t" + k++} className="table-scroll" style=${{ margin: "8px 0 12px" }}><table>
          <thead><tr>${b[1][0].map(function (c, ci) { return html`<th key=${ci}>${c}</th>`; })}</tr></thead>
          <tbody>${b[1].slice(1).map(function (r, ri) { return html`<tr key=${ri}>${r.map(function (c, ci) { return html`<td key=${ci}>${c}</td>`; })}</tr>`; })}</tbody>
        </table></div>`);
      } else {
        out.push(html`<p key=${"p" + k++}>${b[1]}</p>`);
      }
      i++;
    }
    return out;
  }
  function resolveSow(key) {
    var S = window.SOW_DATA;
    if (!S || !S.s) return { missing: true, title: sowLabel(key) };
    var hl = null, k = key;
    if (!S.s[k]) {
      var parts = key.split("."), last = parts.pop(), parent = parts.join(".");
      if (S.s[parent]) { k = parent; hl = last; }
    }
    var s = S.s[k];
    if (!s) return { notFound: true, title: sowLabel(key) };
    var subs = S.order.filter(function (c) { return c.indexOf(k + ".") === 0; });
    var parentKey = k.indexOf(".") > 0 ? k.split(".").slice(0, -1).join(".") : null;
    return { key: k, hl: hl, title: (k === "intro" ? "" : sowLabel(k) + " ") + s.title, section: s, subs: subs, parentKey: parentKey && S.s[parentKey] ? parentKey : null, source: S.source };
  }
  function SowDrawer() {
    var key = useStore(function (s) { return s.ui.sow; });
    var vp = useViewport();
    var bodyRef = useRef(null);
    var r = key ? resolveSow(key) : null;
    useEffect(function () {
      if (!key) return;
      var t = setTimeout(function () {
        var el = bodyRef.current && bodyRef.current.querySelector("li.hl");
        if (el) el.scrollIntoView({ block: "center" });
      }, 250);
      return function () { clearTimeout(t); };
    }, [key]);
    var S = window.SOW_DATA;
    return html`<${A.Drawer} open=${!!key} onClose=${function () { setUi({ sow: null }); }} size=${vp.width < 720 ? "100%" : 620} width=${vp.width < 720 ? "100%" : 620} zIndex=${1100}
      title=${html`<div><div style=${{ fontSize: 12, fontWeight: 400, opacity: 0.65 }}>CICT requirements specification</div><div>${r ? r.title : ""}</div></div>`}
      extra=${r && r.parentKey ? html`<${A.Button} size="small" onClick=${function () { openSow(r.parentKey); }}>${"Up to " + sowLabel(r.parentKey)}<//>` : null}>
      <div ref=${bodyRef} className="sow-body">
        ${!r ? null : r.missing ? html`<${A.Result} status="info" title="The specification text isn't included in this copy" subTitle=${"See " + sowLabel(key) + " of CICT's requirements specification."} />`
          : r.notFound ? html`<${A.Result} status="warning" title=${"Section " + key + " was not found in the specification"} />`
          : html`<${Fragment}>
            ${r.hl ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 12 }} message=${"Item " + r.hl + " is highlighted below."} title=${"Item " + r.hl + " is highlighted below."} />` : null}
            ${r.section.body.length ? sowBlocks(r.section.body, r.hl) : (r.subs.length ? null : html`<p>No text in this section.</p>`)}
            ${r.subs.map(function (c) {
              return html`<div key=${c} style=${{ marginTop: 18 }}>
                <h3 style=${{ fontSize: 15, margin: "0 0 6px" }}><a onClick=${function () { openSow(c); }} style=${{ cursor: "pointer" }}>${sowLabel(c) + " " + S.s[c].title}</a></h3>
                ${sowBlocks(S.s[c].body, null)}
              </div>`;
            })}
            <div style=${{ fontSize: 12, opacity: 0.6, marginTop: 20 }}>${"Source: " + r.source + ". Quoted word for word."}</div>
          <//>`}
      </div>
    <//>`;
  }

  /* ------------------------------------------------------------------
     Guided tour
     ------------------------------------------------------------------ */
  function latest(list, pred) { for (var i = 0; i < list.length; i++) if (pred(list[i])) return list[i]; return null; }
  /* Tour steps count only the CON-2024-051 contract review, not other live items made elsewhere */
  function tourReleases(s) { return select.liveReleases(s).filter(function (r) { return r.ref === "CON-2024-051" && !(r.source && r.source.route === "contract-review"); }); }
  function tourReviews(s) { return select.liveReviews(s).filter(function (r) { return r.ref === "CON-2024-051" && r.kind === "Contract review"; }); }
  function tourRecords(s) { var ids = tourReviews(s).map(function (r) { return r.recordId; }).filter(Boolean); var hit = select.liveRecords(s).filter(function (r) { return ids.indexOf(r.id) >= 0; }); return hit.length ? hit : select.liveRecords(s); }
  var TOUR = [
    { key: "ask", persona: "legal", route: "assistant", title: "Ask for a contract review",
      text: "As N. Perera, Legal officer, choose Review a contract, attach the crane maintenance agreement CON-2024-051 and send the question.",
      params: function () { return { start: "contract-review", conversationId: flows.CONTRACT_REVIEW_CONVERSATION, contractId: "CON-2024-051" }; },
      done: function (s) { return !!s.tourDone.ask || tourReleases(s).length > 0; } },
    { key: "mask", persona: "legal", route: "assistant", title: "Check the masking and request release",
      text: "The assistant classifies the file as Sensitive and masks 8 sensitive items in 47 places. Compare original and masked text, then request release to Claude on Bedrock.",
      params: function () { return { conversationId: flows.CONTRACT_REVIEW_CONVERSATION }; },
      done: function (s) { return tourReleases(s).length > 0; },
      doIt: function (s) { if (!tourReleases(s).length) { actions.createReleaseRequest(flows.contractReviewRelease()); return "Release request created and sent to S. Silva."; } return null; } },
    { key: "approve", persona: "owner", route: "approvals", title: "Approve the release as the data owner",
      text: "As S. Silva, Data owner, open the request, read the exact outbound payload and approve it.",
      params: function (s) { var r = latest(tourReleases(s), function () { return true; }); return r ? { id: r.id } : {}; },
      done: function (s) { return tourReleases(s).some(function (r) { return r.status === "Approved"; }); },
      doIt: function (s) {
        var r = latest(tourReleases(s), function (x) { return x.status === "Pending"; });
        if (!r) return null;
        var prev = s.ui.personaId; setUi({ personaId: r.ownerId });
        actions.decideRelease(r.id, "Approved", "Approved for this review only.");
        setUi({ personaId: prev });
        return "Approved as S. Silva.";
      } },
    { key: "answer", persona: "legal", route: "assistant", title: "Read the answer with citations",
      text: "Back as N. Perera, the answer streams in. Open a citation chip to see the clause highlighted on its page, and open How this answer was made.",
      params: function (s) { var r = latest(tourReleases(s), function () { return true; }); return { conversationId: (r && r.source && r.source.params.conversationId) || flows.CONTRACT_REVIEW_CONVERSATION }; },
      done: function (s) { return !!s.tourDone.answer || tourReviews(s).length > 0; } },
    { key: "send", persona: "legal", route: "assistant", title: "Send the draft for review",
      text: "The answer is a draft. Choose Send for review so a specialist reviewer can confirm it.",
      params: function () { return { conversationId: flows.CONTRACT_REVIEW_CONVERSATION }; },
      done: function (s) { return tourReviews(s).length > 0; },
      doIt: function (s) {
        if (tourReviews(s).length) return null;
        var r = latest(tourReleases(s), function () { return true; });
        actions.createReview(flows.contractReviewReview({ releaseId: r && r.id }));
        return "Sent to Li Wei for review.";
      } },
    { key: "review", persona: "reviewer", route: "reviews", title: "Confirm or return as the specialist reviewer",
      text: "As Li Wei, open the review, check each finding against its source and confirm it, or return it with comments.",
      params: function (s) { var r = latest(tourReviews(s), function () { return true; }); return r ? { id: r.id } : {}; },
      done: function (s) { return tourReviews(s).some(function (r) { return r.status !== "Pending"; }); },
      doIt: function (s) {
        var r = latest(tourReviews(s), function (x) { return x.status === "Pending"; });
        if (!r) return null;
        var prev = s.ui.personaId; setUi({ personaId: r.reviewerId });
        actions.decideReview(r.id, "Confirmed", "Checked against the checklist. Confirmed.");
        setUi({ personaId: prev });
        return "Confirmed as Li Wei and archived to Records.";
      } },
    { key: "record", persona: "legal", route: "records", title: "See the archived record",
      text: "As N. Perera, the bell shows the confirmation. The result is archived in Records and linked to CON-2024-051.",
      params: function (s) { var r = latest(tourRecords(s), function () { return true; }); return r ? { id: r.id } : {}; },
      done: function (s) { return !!s.tourDone.record; } },
    { key: "audit", persona: "auditor", route: "admin", title: "Check the audit trail",
      text: "As M. Rahman, Auditor, every step above is in the audit log: who did what, when, and what was sent where.",
      params: function () { return { tab: "audit" }; },
      done: function (s) { return !!s.tourDone.audit; } }
  ];
  function tourGo(i) {
    var st = TOUR[i];
    var s = getState();
    if (st.persona !== s.ui.personaId) { actions.setPersona(st.persona); toast.info("You are now " + personName(st.persona) + ", " + persona(st.persona).role + "."); }
    setUi({ tourStep: i });
    navigate(st.route, st.params(getState()));
    if (st.key === "record" || st.key === "audit") actions.tourMark(st.key);
    /* Below 1200px the tour panel would cover the screen, so it steps aside; the compass button reopens it */
    var narrow = false;
    try { narrow = window.innerWidth < 1200; } catch (e) { narrow = false; }
    if (narrow && getState().ui.tourOpen) { setUi({ tourOpen: false }); toast.info("Step " + (i + 1) + ": " + st.title + ". Reopen the guided tour for the next step."); }
  }
  function TourPanel() {
    var tok = A.theme.useToken().token;
    var s = useStore();
    var vp = useViewport();
    var open = s.ui.tourOpen;
    var cur = Math.min(s.ui.tourStep, TOUR.length - 1);
    var step = TOUR[cur];
    var p = persona(step.persona);
    var doneCount = TOUR.filter(function (t) { return t.done(s); }).length;
    var docked = vp.width >= 1200;
    return html`<${A.Drawer} open=${open} mask=${false} onClose=${function () { setUi({ tourOpen: false }); }} size=${vp.width < 600 ? "100%" : 400} width=${vp.width < 600 ? "100%" : 400}
      rootStyle=${docked ? { top: 84 } : undefined} zIndex=${docked ? 800 : 1020} title=${html`<div><div>Guided tour</div><div style=${{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>One contract, from question to archived record, across four roles</div></div>`}
      footer=${html`<div style=${{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${doneCount + " of " + TOUR.length + " steps done"}</span>
        <div style=${{ flex: 1 }}></div>
        <${A.Button} size="small" onClick=${function () {
          confirmDialog({ title: "Start the tour again?", content: "This clears the requests, reviews, records, notifications and audit events created in this session.", okText: "Start again",
            onOk: function () { actions.reset(); setUi({ tourStep: 0 }); toast.success("Sample data reset. Start from step 1."); } });
        }}>Start again<//>
      </div>`}>
      <${A.Steps} direction="vertical" orientation="vertical" size="small" current=${cur} onChange=${function (i) { setUi({ tourStep: i }); }}
        items=${TOUR.map(function (t, i) {
          var pp = persona(t.persona);
          return { title: t.title, description: html`<span style=${{ fontSize: 12 }}>${pp.name + ", " + pp.role}</span>`, status: t.done(s) ? "finish" : i === cur ? "process" : "wait" };
        })} />
      <div style=${{ border: "1px solid " + tok.colorPrimaryBorder, background: tok.colorPrimaryBg, borderRadius: 10, padding: 14, marginTop: 8 }}>
        <div style=${{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <${A.Avatar} style=${{ background: p.color }}>${p.initials}<//>
          <div><div style=${{ fontWeight: 600 }}>${"Step " + (cur + 1) + ": " + step.title}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${p.name + ", " + p.role}</div></div>
        </div>
        <div style=${{ fontSize: 13, marginBottom: 12 }}>${step.text}</div>
        <div style=${{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <${A.Button} type="primary" icon=${html`<${Icon} name="AimOutlined" />`} onClick=${function () { tourGo(cur); }}>Take me there<//>
          ${step.doIt ? html`<${A.Tooltip} title="Shortcut for demos: performs this step without the screen">
            <${A.Button} disabled=${step.done(s)} onClick=${function () { var msg = step.doIt(getState()); if (msg) toast.success(msg); else toast.info("Complete the earlier steps first."); }}>Do it for me<//>
          <//>` : null}
        </div>
        <div style=${{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <${A.Button} size="small" disabled=${cur === 0} onClick=${function () { setUi({ tourStep: cur - 1 }); }}>Back<//>
          <${A.Button} size="small" disabled=${cur === TOUR.length - 1} onClick=${function () { tourGo(cur + 1); }}>Next step<//>
        </div>
      </div>
    <//>`;
  }

  /* ------------------------------------------------------------------
     Global search
     ------------------------------------------------------------------ */
  var searchProviders = [];
  function registerSearch(provider) { searchProviders.push(provider); }
  function coreSearchGroups(s) {
    var phaseOk = function (ph) { return ph !== 2 || s.ui.phaseMode === "both"; };
    return [
      { group: "Screens", items: NAV_ORDER.filter(function (id) { return screens[id]; }).map(function (id) {
        var sc = screens[id]; return { id: "screen-" + id, title: sc.title, subtitle: sc.summary || "", route: id, params: {}, phase: sc.phase, icon: sc.icon };
      }) },
      { group: "Contracts", items: D.contracts.map(function (c) { return { id: c.id, title: c.id + " " + c.title, subtitle: c.counterparty + " · " + c.status, route: "contracts", params: { id: c.id }, icon: "FileTextOutlined" }; }) },
      { group: "Records", items: s.records.map(function (r) { return { id: r.id, title: r.id + " " + r.title, subtitle: r.category + " · " + r.dept, route: "records", params: { id: r.id }, icon: "DatabaseOutlined" }; }) },
      { group: "Knowledge base", items: D.knowledge.map(function (k) { return { id: k.id, title: k.title, subtitle: k.category + " · v" + k.versions[0].v, route: "knowledge", params: { id: k.id }, icon: "ReadOutlined" }; }) },
      { group: "People", items: D.personas.map(function (p) { return { id: "person-" + p.id, title: p.name, subtitle: p.role + " · " + p.dept, route: "admin", params: { tab: "users", personaId: p.id }, icon: "UserOutlined" }; }) }
    ].concat(searchProviders.map(function (pr) {
      var items = [];
      try { items = (typeof pr.items === "function" ? pr.items(s) : pr.items) || []; } catch (e) { console.error(e); }
      return { group: pr.group, items: items };
    })).map(function (g) { return { group: g.group, items: g.items.filter(function (it) { return phaseOk(it.phase); }) }; });
  }
  function GlobalSearch(props) {
    var tok = A.theme.useToken().token;
    var s = useStore();
    var q = useState("");
    var term = q[0].trim().toLowerCase();
    var groups = coreSearchGroups(s);
    var lookup = {};
    var options = !term ? [] : groups.map(function (g) {
      var hits = g.items.filter(function (it) { return (it.title + " " + (it.subtitle || "")).toLowerCase().indexOf(term) >= 0; }).slice(0, 5);
      if (!hits.length) return null;
      return { label: g.group, options: hits.map(function (it) {
        var v = g.group + "::" + it.id; lookup[v] = it;
        return { value: v, label: html`<div style=${{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
          <${Icon} name=${it.icon || "FileOutlined"} style=${{ color: tok.colorTextSecondary }} />
          <div style=${{ minWidth: 0 }}><div style=${{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${it.title}</div>
          ${it.subtitle ? html`<div style=${{ fontSize: 12, color: tok.colorTextTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${it.subtitle}</div>` : null}</div>
        </div>` };
      }) };
    }).filter(Boolean);
    return html`<${A.AutoComplete} value=${q[0]} options=${options} style=${props.style || { width: 340 }} popupMatchSelectWidth=${props.popupWidth || 420}
      onChange=${function (v) { q[1](v && v.indexOf("::") > 0 ? "" : v); }}
      onSelect=${function (v) { var it = lookup[v]; q[1](""); if (it) { navigate(it.route, it.params); if (props.onDone) props.onDone(); } }}
      notFoundContent=${term ? html`<span style=${{ fontSize: 13 }}>No matches. Try a contract number, a party or a screen name.</span>` : null}
      autoFocus=${props.autoFocus}>
      <${A.Input} allowClear prefix=${html`<${Icon} name="SearchOutlined" />`} placeholder="Search contracts, records, screens" aria-label="Global search" />
    <//>`;
  }

  /* ------------------------------------------------------------------
     App shell
     ------------------------------------------------------------------ */
  function navItems(s, collapsed) {
    var phaseOn = s.ui.phaseMode === "both";
    return GROUPS.map(function (g) {
      var ids = NAV_ORDER.filter(function (id) { return screens[id] && screens[id].group === g.key && !screens[id].hidden; })
        .concat(Object.keys(screens).filter(function (id) { return NAV_ORDER.indexOf(id) < 0 && screens[id].group === g.key && !screens[id].hidden; }));
      return {
        type: "group", key: "g-" + g.key,
        label: collapsed ? null : html`<span style=${{ display: "inline-flex", gap: 6, alignItems: "center" }}>${g.label}${g.key === "p1" || g.key === "p2" ? html`<${PhaseTag} phase=${g.phase} />` : null}</span>`,
        children: ids.map(function (id) {
          var sc = screens[id];
          var locked = sc.phase === 2 && !phaseOn;
          var badge = 0;
          if (id === "approvals") badge = select.pendingReleasesFor(s, s.ui.personaId).length;
          if (id === "reviews") badge = select.pendingReviewsFor(s, s.ui.personaId).length;
          return {
            key: id, icon: html`<${Icon} name=${sc.icon} />`,
            label: html`<span style=${{ display: "flex", alignItems: "center", gap: 6, opacity: locked ? 0.55 : 1 }} title=${locked ? "Arrives in Phase 2. Switch to Phase 1 + 2 to explore it." : undefined}>
              <span style=${{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>${sc.title}</span>
              ${locked ? html`<${Icon} name="LockOutlined" style=${{ fontSize: 12 }} />` : null}
              ${!locked && badge ? html`<${A.Badge} count=${badge} size="small" />` : null}
            </span>`
          };
        })
      };
    });
  }
  function NavMenu(props) {
    var s = useStore();
    return html`<${A.Menu} mode="inline" selectedKeys=${[s.route.id]} items=${navItems(s, props.collapsed)} inlineCollapsed=${props.collapsed}
      onClick=${function (info) { navigate(info.key); }} style=${{ borderInlineEnd: 0, background: "transparent" }} />`;
  }

  function NotificationBell() {
    var tok = A.theme.useToken().token;
    var s = useStore();
    var open = useState(false);
    var pid = s.ui.personaId;
    var list = select.notificationsFor(s, pid);
    var unread = list.filter(function (n) { return n.readBy.indexOf(pid) < 0; }).length;
    var kindIcon = { approval: "SafetyCertificateOutlined", review: "FileDoneOutlined", deadline: "CalendarOutlined", alert: "WarningOutlined", info: "InfoCircleOutlined" };
    var panel = html`<div style=${{ width: "min(380px, calc(100vw - 32px))", background: tok.colorBgElevated, borderRadius: 10, boxShadow: tok.boxShadowSecondary, overflow: "hidden" }}>
      <div style=${{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid " + tok.colorBorderSecondary }}>
        <span style=${{ fontWeight: 600, flex: 1 }}>Notifications</span>
        <${A.Button} size="small" type="link" disabled=${!unread} onClick=${function () { actions.markAllRead(pid); }}>Mark all as read<//>
      </div>
      <div style=${{ maxHeight: 420, overflowY: "auto" }}>
        ${list.length ? list.slice(0, 20).map(function (n) {
          var isUnread = n.readBy.indexOf(pid) < 0;
          return html`<div key=${n.id} role="button" tabIndex=${0}
            onClick=${function () { actions.markRead(n.id, pid); open[1](false); if (n.route) navigate(n.route, n.params); }}
            onKeyDown=${function (e) { if (e.key === "Enter") { actions.markRead(n.id, pid); open[1](false); if (n.route) navigate(n.route, n.params); } }}
            style=${{ display: "flex", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid " + tok.colorBorderSecondary, background: isUnread ? tok.colorPrimaryBg : "transparent" }}>
            <${Icon} name=${kindIcon[n.kind] || "InfoCircleOutlined"} style=${{ marginTop: 3, color: n.kind === "alert" ? tok.colorWarning : tok.colorPrimary }} />
            <div style=${{ flex: 1, minWidth: 0 }}>
              <div style=${{ fontWeight: isUnread ? 600 : 400, fontSize: 13 }}>${n.title}</div>
              ${n.body ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${n.body}</div>` : null}
              <div style=${{ fontSize: 11, color: tok.colorTextTertiary, marginTop: 2 }}>${fmt.relative(n.at)}</div>
            </div>
          </div>`;
        }) : html`<div style=${{ padding: 24 }}><${EmptyHint} title="No notifications" description="Approvals, reviews and deadlines for your role appear here." /></div>`}
      </div>
      <div style=${{ padding: "8px 14px", fontSize: 11, color: tok.colorTextTertiary }}>Email and chat notifications carry a summary and a secure link only <${SowRef} sec="3.7.2" /></div>
    </div>`;
    return html`<${A.Dropdown} trigger=${["click"]} open=${open[0]} onOpenChange=${function (v) { open[1](v); }} popupRender=${function () { return panel; }} dropdownRender=${function () { return panel; }} placement="bottomRight">
      <${A.Button} type="text" aria-label=${"Notifications, " + unread + " unread"} icon=${html`<${A.Badge} count=${unread} size="small" offset=${[2, -2]}><${Icon} name="BellOutlined" style=${{ fontSize: 18 }} /><//>`} />
    <//>`;
  }

  function PersonaMenu(props) {
    var s = useStore();
    var vp = useViewport();
    var me = persona(s.ui.personaId);
    var items = [
      { key: "me", disabled: true, label: html`<div style=${{ lineHeight: 1.3 }}><div style=${{ fontWeight: 600 }}>${me.fullName}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${me.role + " · " + me.dept}</div><div style=${{ fontSize: 12, opacity: 0.7 }}>${"Data access: " + me.access}</div></div>` },
      { type: "divider" },
      { type: "group", label: "Switch role (demo)", children: D.personas.map(function (p) {
        return { key: "p:" + p.id, label: html`<div style=${{ display: "flex", gap: 8, alignItems: "center" }}>
          <${A.Avatar} size=${24} style=${{ background: p.color, fontSize: 11, flex: "none" }}>${p.initials}<//>
          <div style=${{ lineHeight: 1.25 }}><div>${p.name}${p.id === me.id ? " (you)" : ""}</div><div style=${{ fontSize: 12, opacity: 0.65 }}>${p.role}</div></div>
          ${p.id === me.id ? html`<${Icon} name="CheckOutlined" style=${{ marginLeft: "auto" }} />` : null}
        </div>` };
      }) }
    ];
    if (props.compact) {
      items.push({ type: "divider" });
      items.push({ type: "group", label: "Phases shown", children: [
        { key: "phase:p1", label: "Phase 1" + (s.ui.phaseMode === "p1" ? " (on)" : "") },
        { key: "phase:both", label: "Phase 1 + 2" + (s.ui.phaseMode === "both" ? " (on)" : "") }] });
      items.push({ type: "group", label: "Interface language", children: LANGS.map(function (l) { return { key: "lang:" + l.key, label: l.label + " " + l.name + (s.ui.lang === l.key ? " (on)" : "") }; }) });
    }
    items.push({ type: "divider" });
    items.push({ key: "reset", icon: html`<${Icon} name="ReloadOutlined" />`, label: "Reset sample data" });
    var onClick = function (info) {
      var k = info.key;
      if (k.indexOf("p:") === 0) {
        var id = k.slice(2);
        if (id !== s.ui.personaId) { actions.setPersona(id); toast.info("You are now " + persona(id).name + ", " + persona(id).role + "."); }
      } else if (k.indexOf("phase:") === 0) { actions.setPhaseMode(k.slice(6)); }
      else if (k.indexOf("lang:") === 0) { actions.setLang(k.slice(5)); }
      else if (k === "reset") {
        confirmDialog({ title: "Reset the sample data?", content: "This clears everything created in this session: release requests, reviews, archived records, notifications and audit events.", okText: "Reset",
          onOk: function () { actions.reset(); toast.success("Sample data reset."); } });
      }
    };
    return html`<${A.Dropdown} trigger=${["click"]} menu=${{ items: items, onClick: onClick }} placement="bottomRight">
      <${A.Button} type="text" style=${{ height: 40, padding: "0 6px", display: "inline-flex", alignItems: "center", gap: 8 }} aria-label=${"Signed in as " + me.name + ", " + me.role + ". Switch role"}>
        <${A.Avatar} size=${30} style=${{ background: me.color, fontSize: 12 }}>${me.initials}<//>
        ${vp.width >= 1200 ? html`<span style=${{ textAlign: "left", lineHeight: 1.2 }}><span style=${{ display: "block", fontSize: 13 }}>${me.name}</span><span style=${{ display: "block", fontSize: 11, opacity: 0.65 }}>${me.role}</span></span>` : null}
        <${Icon} name="DownOutlined" style=${{ fontSize: 10, opacity: 0.6 }} />
      <//>
    <//>`;
  }

  function LanguageSwitch() {
    var lang = useStore(function (s) { return s.ui.lang; });
    var cur = LANGS.filter(function (l) { return l.key === lang; })[0];
    return html`<${A.Dropdown} trigger=${["click"]} placement="bottomRight" menu=${{
      selectable: true, selectedKeys: [lang],
      items: LANGS.map(function (l) { return { key: l.key, label: l.label + "  " + l.name }; }),
      onClick: function (info) { actions.setLang(info.key); }
    }}>
      <${A.Button} type="text" icon=${html`<${Icon} name="GlobalOutlined" />`} aria-label="Interface language">${cur.label}<//>
    <//>`;
  }

  function Header() {
    var tok = A.theme.useToken().token;
    var s = useStore();
    var vp = useViewport();
    var theme = useTheme();
    var searchOpen = useState(false);
    var compact = vp.width < 768;
    return html`<div style=${{ height: 56, display: "flex", alignItems: "center", gap: 8, padding: vp.isPhone ? "0 10px" : "0 16px", background: tok.colorBgContainer, borderBottom: "1px solid " + tok.colorBorderSecondary }}>
      ${vp.isMobile ? html`<${A.Button} type="text" aria-label="Open navigation" icon=${html`<${Icon} name="MenuOutlined" />`} onClick=${function () { setUi({ navOpen: true }); }} />`
        : html`<${A.Button} type="text" aria-label=${s.ui.collapsed ? "Expand navigation" : "Collapse navigation"} icon=${html`<${Icon} name=${s.ui.collapsed ? "MenuUnfoldOutlined" : "MenuFoldOutlined"} />`}
          onClick=${function () { lsSet("collapsed", s.ui.collapsed ? "0" : "1"); setUi({ collapsed: !s.ui.collapsed }); }} />`}
      <a href="#workspace" onClick=${function (e) { e.preventDefault(); navigate("workspace"); }} style=${{ display: "flex", alignItems: "center", gap: 10, color: tok.colorText, textDecoration: "none", minWidth: 0 }}>
        <span style=${{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, " + tok.colorPrimary + ", " + tok.colorInfo + ")", display: "grid", placeItems: "center", color: "#fff", flex: "none" }}>
          <${Icon} name="SafetyCertificateFilled" />
        </span>
        ${vp.width >= 1100 ? html`<span style=${{ fontWeight: 600, whiteSpace: "nowrap" }}>Legal & Compliance Assistant</span>` : vp.width >= 420 ? html`<span style=${{ fontWeight: 600, whiteSpace: "nowrap" }}>Assistant</span>` : null}
      </a>
      <div style=${{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0, padding: "0 8px" }}>
        ${!compact ? html`<${GlobalSearch} style=${{ width: "100%", maxWidth: 380 }} />` : null}
      </div>
      <div style=${{ display: "flex", alignItems: "center", gap: vp.isPhone ? 2 : 6 }}>
        ${compact ? html`<${A.Button} type="text" aria-label="Search" icon=${html`<${Icon} name="SearchOutlined" />`} onClick=${function () { searchOpen[1](true); }} />` : null}
        ${!compact ? html`<${A.Tooltip} title="Phases shown in the prototype"><span><${A.Segmented} size="small" value=${s.ui.phaseMode}
          options=${[{ value: "p1", label: "Phase 1" }, { value: "both", label: "Phase 1 + 2" }]}
          onChange=${function (v) { actions.setPhaseMode(v); toast.info(v === "p1" ? "Showing Phase 1 only. Phase 2 modules are locked." : "Showing Phase 1 and Phase 2."); }} /></span><//>` : null}
        ${!compact ? html`<${LanguageSwitch} />` : null}
        <${A.Tooltip} title="Guided tour of the end-to-end process">
          <${A.Button} type=${s.ui.tourOpen ? "primary" : "default"} icon=${html`<${Icon} name="CompassOutlined" />`} onClick=${function () { setUi({ tourOpen: !s.ui.tourOpen }); }} aria-label="Guided tour">${vp.width >= 1280 ? "Guided tour" : null}<//>
        <//>
        <${A.Tooltip} title=${theme.isDark ? "Switch to light theme" : "Switch to dark theme"}>
          <${A.Button} type="text" aria-label="Switch theme" icon=${html`<${Icon} name=${theme.isDark ? "SunOutlined" : "MoonOutlined"} />`} onClick=${theme.toggle} />
        <//>
        <${NotificationBell} />
        <${PersonaMenu} compact=${compact} />
      </div>
      <${A.Modal} open=${searchOpen[0]} onCancel=${function () { searchOpen[1](false); }} footer=${null} title="Search" destroyOnHidden=${true}>
        <${GlobalSearch} style=${{ width: "100%" }} popupWidth=${true} autoFocus=${true} onDone=${function () { searchOpen[1](false); }} />
      <//>
    </div>`;
  }

  function LockedScreen(props) {
    var sc = props.screen;
    return html`<div>
      <${PageHeader} title=${sc.title} phase=${2} sow=${sc.sow} subtitle=${sc.summary} />
      <${A.Card}>
        <${A.Result} icon=${html`<${Icon} name="LockOutlined" />`} title=${sc.title + " arrives in Phase 2"}
          subTitle="It runs on the same platform as Phase 1, with the same masking, release approvals, citations and review steps. Switch to Phase 1 + 2 at the top to explore it."
          extra=${html`<${A.Button} type="primary" onClick=${function () { actions.setPhaseMode("both"); }}>Show Phase 1 + 2<//>`}>
          ${sc.features ? html`<ul style=${{ margin: 0, paddingLeft: 20 }}>${sc.features.map(function (f, i) { return html`<li key=${i}>${f}</li>`; })}</ul>` : null}
        <//>
      <//>
    </div>`;
  }
  function NoAccess(props) {
    var sc = props.screen;
    var allowed = (sc.roles || []).map(persona).filter(Boolean);
    return html`<div>
      <${PageHeader} title=${sc.title} phase=${sc.phase} sow=${sc.sow} />
      <${A.Card}><${A.Result} status="403" title="Not available for your role"
        subTitle=${"This area is for " + allowed.map(function (p) { return p.role; }).join(", ") + ". Permissions follow role, department and data class."}
        extra=${allowed.slice(0, 3).map(function (p) { return html`<${A.Button} key=${p.id} onClick=${function () { actions.setPersona(p.id); toast.info("You are now " + p.name + ", " + p.role + "."); }}>${"Switch to " + p.name}<//>`; })} /><//>
    </div>`;
  }

  var ErrorBoundary = (function () {
    function EB(props) { React.Component.call(this, props); this.state = { err: null }; }
    EB.prototype = Object.create(React.Component.prototype);
    EB.prototype.constructor = EB;
    EB.getDerivedStateFromError = function (err) { return { err: err }; };
    EB.prototype.componentDidCatch = function (err) { console.error("[screen error]", err); };
    EB.prototype.render = function () {
      var self = this;
      if (this.state.err) {
        return html`<${A.Result} status="error" title="This screen hit an error" subTitle=${String((this.state.err && this.state.err.message) || this.state.err)}
          extra=${html`<${A.Button} onClick=${function () { self.setState({ err: null }); navigate("workspace"); }}>Back to my workspace<//>`} />`;
      }
      return this.props.children;
    };
    return EB;
  })();

  function ScreenHost() {
    var s = useStore();
    var route = s.route;
    var sc = screens[route.id] || screens.workspace;
    if (!sc) return html`<${A.Skeleton} active />`;
    if (sc.phase === 2 && s.ui.phaseMode === "p1") return html`<${LockedScreen} screen=${sc} />`;
    if (sc.roles && sc.roles.indexOf(s.ui.personaId) < 0) return html`<${NoAccess} screen=${sc} />`;
    var Comp = sc.render;
    return html`<${ErrorBoundary} key=${sc.id + "-" + s.screensVersion}><${Comp} params=${route.params || {}} route=${route} screen=${sc} /><//>`;
  }

  function Shell() {
    var tok = A.theme.useToken().token;
    var s = useStore();
    var vp = useViewport();
    var lang = LANGS.filter(function (l) { return l.key === s.ui.lang; })[0];
    var siderW = s.ui.collapsed ? 72 : 252;
    var tourDock = s.ui.tourOpen && vp.width >= 1200 ? 400 : 0;
    return html`<${A.Layout} style=${{ minHeight: "100vh", background: tok.colorBgLayout }}>
      <div style=${{ position: "sticky", top: 0, zIndex: 900 }}>
        <div className="proto-banner" role="note"><span>Concept prototype for the CICT proposal · Allion Technologies · sample data only</span></div>
        <${Header} />
      </div>
      <${A.Layout} hasSider=${!vp.isMobile} style=${{ background: tok.colorBgLayout }}>
        ${!vp.isMobile ? html`<${A.Layout.Sider} width=${252} collapsedWidth=${72} collapsed=${s.ui.collapsed} trigger=${null} theme="light"
          style=${{ position: "sticky", top: 84, height: "calc(100vh - 84px)", overflowY: "auto", background: tok.colorBgContainer, borderRight: "1px solid " + tok.colorBorderSecondary }}>
          <div style=${{ padding: "8px 4px 24px" }}><${NavMenu} collapsed=${s.ui.collapsed} /></div>
        <//>` : null}
        <${A.Layout.Content} style=${{ padding: vp.isPhone ? "16px 16px 32px" : "20px 24px 40px", minWidth: 0, marginRight: tourDock, maxWidth: vp.isMobile ? "100vw" : "calc(100vw - " + (siderW + tourDock) + "px)" }}>
          ${s.ui.lang !== "en" && !s.ui.langNoteHidden ? html`<${A.Alert} type="info" showIcon closable style=${{ marginBottom: 16 }}
            onClose=${function () { setUi({ langNoteHidden: true }); }}
            message=${"Interface language set to " + lang.label + " (" + lang.name + ")."} title=${"Interface language set to " + lang.label + " (" + lang.name + ")."}
            description="Dates, paging and other built-in component text switch now. Screen text is translated in the build by Allion and reviewed by CICT (assumption A12)." />` : null}
          <${ScreenHost} />
        <//>
      <//>
      <${A.Drawer} open=${vp.isMobile && s.ui.navOpen} placement="left" size=${280} width=${280} onClose=${function () { setUi({ navOpen: false }); }}
        title="Legal & Compliance Assistant" styles=${{ body: { padding: "8px 4px" } }}>
        <${NavMenu} collapsed=${false} />
      <//>
      <${SowDrawer} />
      <${SourceDrawer} />
      <${TourPanel} />
    <//>`;
  }

  function AppRoot() {
    var s = useStore();
    var isDark = useDarkMode();
    var me = persona(s.ui.personaId);
    var themeCfg = useMemo(function () {
      return {
        algorithm: isDark ? A.theme.darkAlgorithm : A.theme.defaultAlgorithm,
        token: { colorPrimary: isDark ? "#3c89e8" : "#1f5fbf", colorInfo: isDark ? "#3c89e8" : "#1f5fbf", borderRadius: 8,
          colorBgLayout: isDark ? "#0f1115" : "#f5f6f8", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', 'Noto Sans Sinhala', 'PingFang SC', 'Microsoft YaHei', sans-serif" },
        components: { Layout: { bodyBg: isDark ? "#0f1115" : "#f5f6f8", siderBg: isDark ? "#14171c" : "#ffffff", headerBg: isDark ? "#14171c" : "#ffffff" },
          Menu: { itemBg: "transparent", subMenuItemBg: "transparent" } }
      };
    }, [isDark]);
    useEffect(function () {
      try { document.body.style.background = isDark ? "#0f1115" : "#f5f6f8"; } catch (e) { /* ignore */ }
    }, [isDark]);
    var themeVal = useMemo(function () {
      return { isDark: isDark, toggle: function () { setThemeAttr(isDark ? "light" : "dark"); } };
    }, [isDark]);
    var personaVal = { persona: me, personaId: me.id, setPersona: actions.setPersona, personas: D.personas };
    var phaseVal = { phaseMode: s.ui.phaseMode, phase2On: s.ui.phaseMode === "both", setPhaseMode: actions.setPhaseMode };
    var langVal = { lang: s.ui.lang, setLang: actions.setLang, langs: LANGS };
    return html`<${A.ConfigProvider} locale=${antdLocale(s.ui.lang)} theme=${themeCfg}>
      <${A.App} message=${{ maxCount: 3, top: 72 }}>
        <${ApiBridge} />
        <${ThemeContext.Provider} value=${themeVal}>
          <${PersonaContext.Provider} value=${personaVal}>
            <${PhaseContext.Provider} value=${phaseVal}>
              <${LanguageContext.Provider} value=${langVal}>
                <${Shell} />
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>`;
  }

  /* ------------------------------------------------------------------
     Placeholder screens (builders overwrite by registering the same id)
     ------------------------------------------------------------------ */
  function makePlaceholder(id) {
    return function Placeholder() {
      var d = DEFAULTS[id];
      return html`<div>
        <${PageHeader} title=${d.title} phase=${d.phase} sow=${d.sow} subtitle=${d.summary} />
        <${A.Card}>
          <${A.Result} status="info" icon=${html`<${Icon} name=${d.icon} />`} title="This screen is being built"
            subTitle="The shell, navigation and shared components are ready. The screen builder adds this area next."
            extra=${html`<${A.Button} onClick=${function () { navigate("workspace"); }}>Back to my workspace<//>`}>
            ${d.features ? html`<div><div style=${{ fontWeight: 600, marginBottom: 6 }}>Planned on this screen</div><ul style=${{ margin: 0, paddingLeft: 20 }}>${d.features.map(function (f, i) { return html`<li key=${i}>${f}</li>`; })}</ul></div>` : null}
          <//>
        <//>
      </div>`;
    };
  }
  NAV_ORDER.forEach(function (id) { if (id !== "workspace") registerScreen(id, { render: makePlaceholder(id), placeholder: true }); });
  registerScreen("workspace", { render: makePlaceholder("workspace"), placeholder: true });

  /* ------------------------------------------------------------------
     Start
     ------------------------------------------------------------------ */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    var id = "";
    try { id = (window.location.hash || "").replace(/^#/, ""); } catch (e) { id = ""; }
    if (id && screens[id]) state = Object.assign({}, state, { route: { id: id, params: {}, at: Date.now() } });
    try { window.addEventListener("hashchange", onHashChange); } catch (e) { /* ignore */ }
    var root = document.getElementById("root");
    ReactDOM.createRoot(root).render(html`<${AppRoot} />`);
  }

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */
  window.APP = {
    html: html, React: React, antd: A, A: A, icons: I, I: I, dayjs: dayjs, data: D, D: D, Fragment: Fragment,
    useState: useState, useEffect: useEffect, useMemo: useMemo, useRef: useRef, useCallback: useCallback, useContext: useContext,
    useReducer: useReducer, useLayoutEffect: useLayoutEffect,
    /* store */
    store: { getState: getState, setState: setState, subscribe: subscribe, actions: actions, select: select },
    useStore: useStore, useShared: useShared, actions: actions, select: select,
    createReleaseRequest: actions.createReleaseRequest, decideRelease: actions.decideRelease,
    createReview: actions.createReview, decideReview: actions.decideReview, archiveRecord: actions.archiveRecord,
    notify: actions.notify, audit: actions.audit, setPersona: actions.setPersona, setPhaseMode: actions.setPhaseMode, setLang: actions.setLang,
    /* router */
    registerScreen: registerScreen, navigate: navigate, useRoute: useRoute, screens: screens, NAV_ORDER: NAV_ORDER, GROUPS: GROUPS,
    /* contexts */
    PersonaContext: PersonaContext, PhaseContext: PhaseContext, LanguageContext: LanguageContext, ThemeContext: ThemeContext,
    usePersona: usePersona, usePhase: usePhase, useLang: useLang, useTheme: useTheme, useApp: useApp, useViewport: useViewport,
    /* helpers */
    fmt: fmt, now: now, nowIso: nowIso, persona: persona, personName: personName, cx: cx,
    getDocument: getDocument, registerDocument: registerDocument, findClause: findClause, citeLabel: citeLabel,
    segmentize: segmentize, maskText: maskText, maskValue: maskValue, MASK_METHODS: MASK_METHODS, MASKING_LOCATIONS: MASKING_LOCATIONS,
    diffStats: diffStats, statusTone: statusTone, flows: flows, registerSearch: registerSearch,
    openSow: openSow, openSource: openSource, closeSource: function () { setUi({ source: null }); },
    toast: toast, confirm: confirmDialog, CHAT_MODES: CHAT_MODES, col: col,
    tour: { open: function () { setUi({ tourOpen: true }); }, close: function () { setUi({ tourOpen: false }); }, mark: actions.tourMark, go: tourGo, steps: TOUR },
    /* components */
    Icon: Icon, PageHeader: PageHeader, PhaseTag: PhaseTag, StatusTag: StatusTag, DataClassTag: DataClassTag, ModelTag: ModelTag, PersonTag: PersonTag,
    SowRef: SowRef, DataTable: DataTable, DetailDrawer: DetailDrawer, KeyFacts: KeyFacts, EmptyHint: EmptyHint,
    DocViewer: DocViewer, CitationChip: CitationChip, CitedText: CitedText, SourcePanel: SourcePanel,
    ChatThread: ChatThread, ChatMessage: ChatMessage, Composer: Composer, TypingIndicator: TypingIndicator, FileChip: FileChip,
    useStreamingText: useStreamingText, StreamingText: StreamingText, AnswerTrace: AnswerTrace,
    ApprovalCard: ApprovalCard, PayloadPreview: PayloadPreview, Redline: Redline, MaskingCompare: MaskingCompare,
    start: start
  };
})();
