/* Workspace (home) screen. Owned by the foundation. Shows the current persona's tasks,
   approvals and reviews waiting, upcoming deadlines, recent conversations and notifications. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, fmt = APP.fmt, Icon = APP.Icon;

  function Stat(props) {
    return html`<${A.Card} size="small" hoverable=${!!props.onClick} onClick=${props.onClick} style=${{ height: "100%", cursor: props.onClick ? "pointer" : "default" }}>
      <${A.Statistic} title=${props.title} value=${props.value} prefix=${html`<${Icon} name=${props.icon} />`}
        valueStyle=${props.warn ? { color: props.warnColor } : undefined} styles=${props.warn ? { content: { color: props.warnColor } } : undefined} />
      <div style=${{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>${props.note}</div>
    <//>`;
  }

  function Workspace() {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var me = APP.persona(pid);
    var role = D.roles.filter(function (r) { return r.key === pid; })[0];
    var phaseOn = s.ui.phaseMode === "both";
    var okPhase = function (x) { return x.phase !== 2 || phaseOn; };

    var approvals = APP.select.pendingReleasesFor(s, pid);
    var reviews = APP.select.pendingReviewsFor(s, pid);
    var myReleases = s.releaseRequests.filter(function (r) { return r.requesterId === pid && okPhase(r); });
    var myReviews = s.reviews.filter(function (r) { return r.requesterId === pid && okPhase(r); });
    var tasks = D.tasks.filter(function (t) { return t.personaId === pid && okPhase(t); });
    var hiddenP2 = D.tasks.filter(function (t) { return t.personaId === pid && t.phase === 2; }).length - (phaseOn ? D.tasks.filter(function (t) { return t.personaId === pid && t.phase === 2; }).length : 0);

    /* Attention list: live store items first, then seeded tasks */
    var attention = [];
    approvals.forEach(function (r) {
      attention.push({ key: r.id, icon: "SafetyCertificateOutlined", title: "Approve or reject release " + r.id + ": " + r.title, meta: "From " + APP.personName(r.requesterId) + " · " + fmt.relative(r.createdAt), status: "Pending", phase: r.phase, go: function () { APP.navigate("approvals", { id: r.id }); } });
    });
    reviews.forEach(function (r) {
      attention.push({ key: r.id, icon: "FileDoneOutlined", title: "Review " + r.id + ": " + r.title, meta: r.kind + " from " + APP.personName(r.requesterId) + " · " + fmt.relative(r.createdAt), status: "Pending review", phase: r.phase, go: function () { APP.navigate("reviews", { id: r.id }); } });
    });
    myReviews.filter(function (r) { return r.status === "Returned"; }).forEach(function (r) {
      attention.push({ key: r.id, icon: "RollbackOutlined", title: "Returned with comments: " + r.title, meta: APP.personName(r.decidedBy) + ": " + (r.comment || "see comments"), status: "Returned", phase: r.phase, go: function () { APP.navigate(r.source.route, r.source.params); } });
    });
    myReleases.filter(function (r) { return r.live && r.status !== "Pending"; }).forEach(function (r) {
      attention.push({ key: r.id + "-d", icon: r.status === "Approved" ? "CheckCircleOutlined" : "StopOutlined", title: (r.status === "Approved" ? "Release approved, answer ready: " : "Release rejected: ") + r.title, meta: APP.personName(r.decidedBy) + " · " + fmt.relative(r.decidedAt), status: r.status, phase: r.phase, go: function () { APP.navigate(r.source.route, r.source.params); } });
    });
    myReleases.filter(function (r) { return r.status === "Pending"; }).forEach(function (r) {
      attention.push({ key: r.id + "-w", icon: "ClockCircleOutlined", title: "Waiting for " + APP.personName(r.ownerId) + " to release " + r.id, meta: r.title, status: "Waiting", phase: r.phase, go: function () { APP.navigate(r.source.route, r.source.params); } });
    });
    tasks.forEach(function (t) {
      attention.push({ key: t.id, icon: t.kind === "Alert" ? "WarningOutlined" : "CheckSquareOutlined", title: t.title, meta: t.kind + " · " + fmt.dueLabel(t.due), status: fmt.dueStatus(t.due), phase: t.phase, go: function () { APP.navigate(t.route, t.params); } });
    });

    var myDeadlines = D.deadlines.filter(function (d) { return d.ownerId === pid && okPhase(d); });
    var deadlinesTitle = "My upcoming deadlines";
    if (!myDeadlines.length) { myDeadlines = D.deadlines.filter(function (d) { return d.phase === 1; }); deadlinesTitle = "Upcoming contract deadlines"; }
    myDeadlines = myDeadlines.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 6);
    var in30 = D.deadlines.filter(function (d) { return okPhase(d) && fmt.daysUntil(d.date) >= 0 && fmt.daysUntil(d.date) <= 30 && (d.ownerId === pid || pid === "legal"); }).length;

    var convs = D.conversations.filter(function (c) { return c.personaId === pid && okPhase(c); });
    var notes = APP.select.notificationsFor(s, pid).slice(0, 5);
    var liveDone = APP.tour.steps.filter(function (t) { return t.done(s); }).length;

    var dueColor = function (date) { var n = fmt.daysUntil(date); return n < 0 ? "error" : n <= 14 ? "warning" : "default"; };

    return html`<div>
      <${APP.PageHeader} title=${"Good morning, " + me.name} phase=${1} sow=${["3.7.2"]}
        subtitle=${me.role + " · " + me.dept + ". " + me.blurb}
        actions=${html`<${APP.Fragment}>
          <${A.Button} icon=${html`<${Icon} name="CompassOutlined" />`} onClick=${APP.tour.open}>Guided tour<//>
          <${A.Button} type="primary" icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${function () { APP.navigate("assistant", {}); }}>Ask the assistant<//>
        <//>`} />

      ${liveDone < APP.tour.steps.length ? html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 16 }} icon=${html`<${Icon} name="CompassOutlined" />`}
        message="See the whole process in about five minutes" title="See the whole process in about five minutes"
        description="The guided tour follows one contract from question to archived record: Legal officer asks, Data owner releases, Specialist reviewer confirms, Auditor checks the trail. It switches role and screen for you."
        action=${html`<${A.Button} size="small" type="primary" onClick=${APP.tour.open}>${liveDone ? "Continue tour" : "Start tour"}<//>`} />` : null}

      <${A.Row} gutter=${[16, 16]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Open tasks" value=${attention.length} icon="CheckSquareOutlined" note=${hiddenP2 ? hiddenP2 + " more when Phase 2 is shown" : "Across modules"} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title=${pid === "owner" ? "Approvals waiting" : "My release requests"} icon="SafetyCertificateOutlined"
          value=${pid === "owner" ? approvals.length : myReleases.filter(function (r) { return r.status === "Pending"; }).length}
          note=${pid === "owner" ? "Release to a managed model" : "Waiting for the data owner"} warn=${pid === "owner" && approvals.length > 0} warnColor=${tok.colorWarning}
          onClick=${function () { APP.navigate("approvals", {}); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title=${pid === "reviewer" ? "Reviews waiting" : "My items in review"} icon="FileDoneOutlined"
          value=${pid === "reviewer" ? reviews.length : myReviews.filter(function (r) { return r.status === "Pending"; }).length}
          note=${pid === "reviewer" ? "Confirm or return" : "With a specialist reviewer"} warn=${pid === "reviewer" && reviews.length > 0} warnColor=${tok.colorWarning}
          onClick=${function () { APP.navigate("reviews", {}); }} /><//>
        <${A.Col} xs=${12} lg=${6}><${Stat} title="Deadlines in 30 days" value=${in30} icon="CalendarOutlined" note="Contracts, cases and board" onClick=${function () { APP.navigate("contracts", { tab: "deadlines" }); }} /><//>
      <//>

      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} xl=${14}>
          <${A.Card} title="Needs your attention" extra=${html`<span style=${{ fontSize: 12, opacity: 0.65 }}>${"As of " + fmt.dateTime(APP.nowIso())}</span>`} styles=${{ body: { padding: 0 } }}>
            ${attention.length ? html`<div>${attention.map(function (a) {
              return html`<div key=${a.key} role="button" tabIndex=${0} onClick=${a.go} onKeyDown=${function (e) { if (e.key === "Enter") a.go(); }}
                style=${{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderBottom: "1px solid " + tok.colorBorderSecondary, cursor: "pointer" }}>
                <${Icon} name=${a.icon} style=${{ marginTop: 3, color: tok.colorPrimary }} />
                <div style=${{ flex: 1, minWidth: 0 }}>
                  <div style=${{ fontWeight: 500 }}>${a.title}</div>
                  <div style=${{ fontSize: 12, color: tok.colorTextSecondary, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                    <span>${a.meta}</span>${a.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
                  </div>
                </div>
                <${APP.StatusTag} status=${a.status} />
              </div>`;
            })}</div>` : html`<div style=${{ padding: 24 }}><${APP.EmptyHint} title="Nothing needs you right now" description="New approvals, reviews and deadlines for your role appear here." /></div>`}
          <//>
        <//>
        <${A.Col} xs=${24} xl=${10}>
          <${A.Card} title=${deadlinesTitle} extra=${html`<a onClick=${function () { APP.navigate("contracts", { tab: "deadlines" }); }}>All deadlines</a>`} style=${{ marginBottom: 16 }}>
            <${A.Flex} vertical gap=${10}>
              ${myDeadlines.map(function (d) {
                var c = d.contractId ? D.contracts.filter(function (x) { return x.id === d.contractId; })[0] : null;
                var go = function () { if (d.contractId) APP.navigate("contracts", { id: d.contractId }); else if (d.kind === "Hearing") APP.navigate("legal", { id: "CASE-2026-014" }); else if (d.kind === "Board") APP.navigate("board", {}); else APP.navigate("compliance", {}); };
                return html`<div key=${d.id} role="button" tabIndex=${0} onClick=${go} onKeyDown=${function (e) { if (e.key === "Enter") go(); }} style=${{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                  <div style=${{ width: 46, flex: "none", textAlign: "center", borderRadius: 8, border: "1px solid " + tok.colorBorderSecondary, padding: "4px 0", lineHeight: 1.1 }}>
                    <div style=${{ fontSize: 11, color: tok.colorTextSecondary }}>${APP.dayjs(d.date).format("MMM")}</div>
                    <div style=${{ fontSize: 17, fontWeight: 600 }}>${APP.dayjs(d.date).format("D")}</div>
                  </div>
                  <div style=${{ flex: 1, minWidth: 0 }}>
                    <div style=${{ fontWeight: 500 }}>${d.title}</div>
                    <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${(c ? c.id + " · " + c.counterparty : d.kind) + " · " + d.ownerName}</div>
                  </div>
                  <${A.Tag} color=${dueColor(d.date)} style=${{ marginInlineEnd: 0, whiteSpace: "nowrap" }}>${fmt.dueLabel(d.date)}<//>
                </div>`;
              })}
            <//>
          <//>
          <${A.Card} title="Notifications" size="small" styles=${{ body: { padding: 0 } }}>
            ${notes.length ? notes.map(function (n) {
              var unread = n.readBy.indexOf(pid) < 0;
              var go = function () { APP.actions.markRead(n.id, pid); if (n.route) APP.navigate(n.route, n.params); };
              return html`<div key=${n.id} role="button" tabIndex=${0} onClick=${go} onKeyDown=${function (e) { if (e.key === "Enter") go(); }}
                style=${{ padding: "10px 16px", borderBottom: "1px solid " + tok.colorBorderSecondary, cursor: "pointer" }}>
                <div style=${{ display: "flex", gap: 8, alignItems: "center" }}>
                  ${unread ? html`<${A.Badge} status="processing" />` : null}
                  <span style=${{ fontWeight: unread ? 600 : 400, fontSize: 13, flex: 1 }}>${n.title}</span>
                  <span style=${{ fontSize: 11, color: tok.colorTextTertiary, whiteSpace: "nowrap" }}>${fmt.relative(n.at)}</span>
                </div>
                ${n.body ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 2 }}>${n.body}</div>` : null}
              </div>`;
            }) : html`<div style=${{ padding: 20 }}><${APP.EmptyHint} title="No notifications" /></div>`}
          <//>
        <//>
      <//>

      <${A.Row} gutter=${[16, 16]} style=${{ marginTop: 16 }}>
        <${A.Col} xs=${24} lg=${14}>
          <${A.Card} title="Recent conversations" extra=${html`<a onClick=${function () { APP.navigate("assistant", { new: true }); }}>New conversation</a>`}>
            ${convs.length ? html`<${A.Flex} vertical gap=${4}>${convs.map(function (c) {
              var go = function () { APP.navigate("assistant", { conversationId: c.id }); };
              return html`<div key=${c.id} role="button" tabIndex=${0} onClick=${go} onKeyDown=${function (e) { if (e.key === "Enter") go(); }}
                style=${{ display: "flex", gap: 10, alignItems: "center", padding: "8px 4px", cursor: "pointer", borderRadius: 6 }}>
                <${A.Avatar} size=${30} style=${{ background: tok.colorPrimaryBg, color: tok.colorPrimary, flex: "none" }} icon=${html`<${Icon} name="MessageOutlined" />`} />
                <div style=${{ flex: 1, minWidth: 0 }}>
                  <div style=${{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${c.title}</div>
                  <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${c.mode + " · " + c.module + " · " + fmt.relative(c.updated)}</div>
                </div>
                ${c.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
              </div>`;
            })}<//>` : html`<${APP.EmptyHint} title="No conversations yet" description="Questions you ask the assistant appear here." action=${html`<${A.Button} type="primary" onClick=${function () { APP.navigate("assistant", { new: true }); }}>Ask the assistant<//>`} />`}
          <//>
        <//>
        <${A.Col} xs=${24} lg=${10}>
          <${A.Card} title=${"What " + me.role.toLowerCase() + "s can do"} extra=${html`<${APP.SowRef} sec="3.7.1" />`}>
            ${role ? html`<${A.Flex} vertical gap=${10}>
              <div><div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 4 }}>Allowed</div>
                <${A.Flex} wrap gap=${6}>${role.can.map(function (c, i) { return html`<${A.Tag} key=${i} color="green" style=${{ marginInlineEnd: 0 }}>${c}<//>`; })}<//></div>
              <div><div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 4 }}>Not allowed</div>
                <${A.Flex} wrap gap=${6}>${role.cannot.map(function (c, i) { return html`<${A.Tag} key=${i} style=${{ marginInlineEnd: 0 }}>${c}<//>`; })}<//></div>
              <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Data access: " + role.dataAccess + ". " + role.users + " users have this role (sample)."}</div>
            <//>` : null}
          <//>
        <//>
      <//>
    </div>`;
  }

  APP.registerScreen("workspace", { title: "My workspace", group: "workspace", phase: 1, icon: "HomeOutlined", sow: ["3.7.2"], render: Workspace });
})();
