/* Screen area: admin. Route: admin (Administrator and Auditor). See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, Icon = APP.Icon, fmt = APP.fmt;
  var AD = D.adminArea;
  var Fragment = APP.Fragment;

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function useSharedObj(key, init) {
    var pair = APP.useShared(key, init);
    var set = function (fn) { pair[1](function (prev) { var p = prev === undefined ? init : prev; return typeof fn === "function" ? fn(p) : Object.assign({}, p, fn); }); };
    return [pair[0] === undefined ? init : pair[0], set];
  }
  function modelById(id) { for (var i = 0; i < D.models.length; i++) if (D.models[i].id === id) return D.models[i]; return null; }
  function roleLabel(key) { for (var i = 0; i < D.roles.length; i++) if (D.roles[i].key === key) return D.roles[i].role; return key; }
  function roleOf(key) { for (var i = 0; i < D.roles.length; i++) if (D.roles[i].key === key) return D.roles[i]; return null; }
  function ReadOnlyNote(props) {
    var pid = APP.useStore(function (s) { return s.ui.personaId; });
    if (pid === "admin") return null;
    return html`<${A.Alert} type="info" showIcon style=${{ marginBottom: 16 }} message="Read only for Auditors" title="Read only for Auditors"
      description=${props.text || "You can see the settings and their history, but not change them. Every change made by an administrator is in the audit log."} />`;
  }
  function Sparkline(props) {
    var tok = A.theme.useToken().token;
    var v = props.values || [], w = props.width || 140, h = props.height || 36;
    if (!v.length) return null;
    var max = Math.max.apply(null, v), min = Math.min.apply(null, v);
    if (props.zero) min = 0;
    var span = max - min || 1;
    var pts = v.map(function (x, i) { return [Math.round(i / (v.length - 1) * (w - 4) + 2), Math.round(h - 3 - (x - min) / span * (h - 8))]; });
    var line = pts.map(function (p) { return p.join(","); }).join(" ");
    var color = props.color || tok.colorPrimary;
    var area = "2," + (h - 1) + " " + line + " " + (w - 2) + "," + (h - 1);
    var thr = props.threshold !== undefined ? Math.round(h - 3 - (props.threshold - min) / span * (h - 8)) : null;
    return html`<svg viewBox=${"0 0 " + w + " " + h} width="100%" height=${h} preserveAspectRatio="none" role="img" aria-label=${props.label || "Trend"} style=${{ display: "block" }}>
      <polygon points=${area} fill=${color} opacity="0.12" />
      ${thr !== null && thr > 0 && thr < h ? html`<line x1="0" x2=${w} y1=${thr} y2=${thr} stroke=${tok.colorWarning} strokeDasharray="3 3" strokeWidth="1" />` : null}
      <polyline points=${line} fill="none" stroke=${color} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>`;
  }
  function Bars(props) {
    var tok = A.theme.useToken().token;
    var v = props.values || [], h = props.height || 90, n = v.length, sp = 34, w = n * sp;
    var max = Math.max.apply(null, v.concat([props.line || 0])) || 1;
    var lineY = props.line ? Math.round(h - 14 - props.line / max * (h - 22)) : null;
    return html`<svg viewBox=${"0 0 " + w + " " + h} width="100%" height=${h} role="img" aria-label=${props.label || "Bar chart"}>
      ${v.map(function (x, i) {
        var bh = Math.round(x / max * (h - 22));
        return html`<g key=${i}><rect x=${i * sp + 6} y=${h - 14 - bh} width=${sp - 12} height=${bh} rx="2" fill=${props.color || tok.colorPrimary} opacity=${i === n - 1 ? 1 : 0.6} />
          <text x=${i * sp + sp / 2} y=${h - 2} fontSize="9" textAnchor="middle" fill=${tok.colorTextTertiary}>${props.labels ? props.labels[i] : i + 1}</text></g>`;
      })}
      ${lineY !== null ? html`<line x1="0" x2=${w} y1=${lineY} y2=${lineY} stroke=${tok.colorWarning} strokeDasharray="4 3" />` : null}
    </svg>`;
  }
  function Stat(props) {
    var tok = A.theme.useToken().token;
    return html`<${A.Card} size="small" hoverable=${!!props.onClick} onClick=${props.onClick} style=${{ height: "100%", cursor: props.onClick ? "pointer" : "default" }}>
      <${A.Statistic} title=${props.title} value=${props.value} prefix=${props.icon ? html`<${Icon} name=${props.icon} />` : null}
        styles=${props.color ? { content: { color: tok[props.color] } } : undefined} />
      ${props.note ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>${props.note}</div>` : null}
    <//>`;
  }

  /* ------------------------------------------------------------------
     MODELS AND ROUTING
     ------------------------------------------------------------------ */
  var MATRIX_ROWS = ["Public", "Internal", "Sensitive", "Confidential", "Embeddings and masking detection"];
  function baseCell(cls, m) {
    var tool = m.id === "m-bge" || m.id === "m-detect";
    if (cls === "Embeddings and masking detection") return tool ? "allowed" : "na";
    if (tool) return "na";
    if (m.status === "Not approved") return "unapproved";
    var route = D.routing.filter(function (r) { return r.cls === cls; })[0];
    if (route && route.models.indexOf(m.id) >= 0) return cls === "Sensitive" && m.host === "Bedrock" ? "masked" : "allowed";
    if (cls === "Confidential" && m.host === "Bedrock") return "never";
    return "off";
  }
  var CELL = {
    allowed: { label: "Allowed", icon: "CheckCircleFilled", tone: "colorSuccess" },
    masked: { label: "Masked and released", icon: "SafetyCertificateFilled", tone: "colorWarning" },
    off: { label: "Off", icon: "MinusCircleOutlined", tone: "colorTextQuaternary" },
    never: { label: "Never", icon: "LockFilled", tone: "colorError" },
    unapproved: { label: "Not approved", icon: "StopOutlined", tone: "colorTextQuaternary" },
    na: { label: "Not used", icon: "MinusOutlined", tone: "colorTextQuaternary" }
  };

  function ModelDrawer(props) {
    var tok = A.theme.useToken().token;
    var pid = APP.useStore(function (s) { return s.ui.personaId; });
    var st = props.state, set = props.set;
    var m = props.id ? modelById(props.id) : null;
    var budget = APP.useState(0);
    APP.useEffect(function () { if (m) budget[1]((st.budgets[m.id] !== undefined ? st.budgets[m.id] : m.budget) || 0); }, [props.id]);
    if (!m) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var info = AD.modelInfo[m.id] || {};
    var status = st.status[m.id] || m.status;
    var ro = pid !== "admin";
    var lat = AD.series(m.id.length * 7 + 3, 30, parseFloat(m.latency) || 1, (parseFloat(m.latency) || 1) * 0.4, status === "Degraded" ? 0.08 : 0);
    var fb = info.fallback ? modelById(info.fallback) : null;
    var setStatus = function (ns, why) {
      set(function (p) { var x = Object.assign({}, p.status); x[m.id] = ns; return Object.assign({}, p, { status: x }); });
      APP.audit({ action: "Model setting changed", item: m.id, detail: m.name + ": " + status + " to " + ns + (why ? ". " + why : ""), dataClass: null });
    };
    return html`<${APP.DetailDrawer} open=${!!props.id} onClose=${props.onClose} size=${640} title=${m.name} subtitle=${m.where}
      tags=${html`<${APP.StatusTag} status=${status} />`}
      actions=${ro ? null : html`<${A.Flex} gap=${6} wrap>
        ${status === "Not approved" ? html`<${A.Button} size="small" type="primary" onClick=${function () {
          APP.audit({ action: "Model approval requested", item: m.id, detail: "Security and data terms review requested for " + m.name, dataClass: null });
          APP.toast.build("In the build, a new model goes through a security and data terms review, then CICT approves it before any routing rule can use it.");
        }}>Request approval<//>`
        : status === "Paused" ? html`<${A.Button} size="small" onClick=${function () { setStatus(m.status === "Paused" ? "Live" : m.status, "Resumed"); APP.toast.success(m.name + " resumed."); }}>Resume<//>`
        : html`<${A.Popconfirm} title=${"Pause " + m.name + "?"} description=${fb ? "New tasks go to " + fb.name + ". Nothing is sent to an unapproved model." : "Users are told the model is unavailable."} okText="Pause"
            onConfirm=${function () { setStatus("Paused", "Paused by " + APP.personName(pid)); APP.toast.success(m.name + " paused. " + (fb ? "Tasks now go to " + fb.name + "." : "Users see an unavailable notice.")); }}>
            <${A.Button} size="small">Pause<//>
          <//>`}
      <//>`}>
      <${A.Flex} vertical gap=${16}>
        <${APP.KeyFacts} column=${{ xs: 1, sm: 2 }} items=${[
          ["Runs on", m.host === "Bedrock" ? "Amazon Bedrock over PrivateLink" : "Inside the CICT VPC"], ["Version", info.version],
          ["Region", info.region], ["Latency (p95)", m.latency || "Not measured"],
          ["Calls, last 30 days", fmt.number(info.calls || 0)], ["Errors", (info.errors || 0) + "%"],
          ["Approved for", (m.classes.length ? m.classes.join(", ") : "Nothing yet"), 2], ["Used for", m.uses.length ? m.uses.join(", ") : "Nothing yet", 2],
          ["If unavailable", fb ? "Tasks move to " + fb.name : "Users are told; nothing is sent elsewhere", 2]
        ]} />
        <div>
          <div style=${{ fontWeight: 600, marginBottom: 6 }}>Provider terms <${APP.SowRef} sec="2.4.4" /></div>
          <${APP.KeyFacts} column=${1} items=${[["Provider", info.terms && info.terms.provider], ["Data kept by the provider", info.terms && info.terms.retention], ["Training use", info.terms && info.terms.training], ["Deletion", info.terms && info.terms.deletion]]} />
        </div>
        ${m.latency ? html`<div>
          <div style=${{ fontWeight: 600, marginBottom: 6 }}>Response time, last 30 hours</div>
          <${Sparkline} values=${lat} height=${70} color=${status === "Degraded" ? tok.colorWarning : tok.colorPrimary} threshold=${4} label="Response time" />
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Dashed line: 4 second target</div>
        </div>` : null}
        ${m.budget || m.costMonth ? html`<div>
          <div style=${{ fontWeight: 600, marginBottom: 6 }}>Monthly budget</div>
          <${A.Progress} percent=${Math.round(m.costMonth / (budget[0] || m.budget || 1) * 100)} status=${m.costMonth / (budget[0] || 1) >= 0.9 ? "exception" : "normal"} format=${function () { return fmt.usd(m.costMonth) + " of " + fmt.usd(budget[0]); }} />
          ${ro ? null : html`<${A.Flex} gap=${8} align="center" style=${{ marginTop: 8 }} wrap>
            <span>Budget (USD)</span>
            <${A.InputNumber} min=${0} step=${50} value=${budget[0]} onChange=${function (v) { budget[1](v || 0); }} aria-label="Monthly budget in USD" />
            <${A.Button} onClick=${function () {
              set(function (p) { var b = Object.assign({}, p.budgets); b[m.id] = budget[0]; return Object.assign({}, p, { budgets: b }); });
              APP.audit({ action: "Model setting changed", item: m.id, detail: "Monthly budget set to " + fmt.usd(budget[0]), dataClass: null });
              APP.toast.success("Budget saved. Alerts go to K. Dias at 80% and 90%.");
            }}>Save<//>
          <//>`}
        </div>` : null}
      <//>
    <//>`;
  }

  function ModelsTab() {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var ro = pid !== "admin";
    var stp = useSharedObj("admin.models", { budgets: {}, status: {}, ack: false, overflow: false, routing: {} });
    var st = stp[0], set = stp[1];
    var open = APP.useState(null);
    var raise = APP.useState(false);
    var raiseVal = APP.useState(600);
    var mainModels = D.models.filter(function (m) { return m.id !== "m-bge" && m.id !== "m-detect"; });
    var cellOf = function (cls, m) { var k = cls + "|" + m.id; return st.routing[k] || baseCell(cls, m); };
    var budgetOf = function (m) { return st.budgets[m.id] !== undefined ? st.budgets[m.id] : m.budget; };
    var claude = modelById("m-claude-br");
    var claudePct = Math.round(claude.costMonth / (budgetOf(claude) || 1) * 100);
    var toggle = function (cls, m) {
      var cur = cellOf(cls, m);
      if (ro) { APP.toast.info("Read only for your role."); return; }
      if (cur === "never") { APP.toast.warn("Confidential material never leaves the CICT VPC. This is fixed by policy and can't be switched on."); return; }
      if (cur === "unapproved") { APP.toast.warn(m.name + " is not approved yet. Approve the model first."); return; }
      if (cur === "na") return;
      var next = cur === "off" ? (cls === "Sensitive" && m.host === "Bedrock" ? "masked" : "allowed") : "off";
      APP.confirm({ title: (next === "off" ? "Stop routing " : "Allow routing ") + cls + " material to " + m.name + "?",
        content: next === "off" ? "New tasks of this class stop using " + m.name + ". Tasks already running finish." : next === "masked" ? "Only masked content released by the data owner goes to " + m.name + "." : "Takes effect for new tasks. The change is logged.",
        okText: next === "off" ? "Stop routing" : "Allow",
        onOk: function () {
          set(function (p) { var r = Object.assign({}, p.routing); r[cls + "|" + m.id] = next; return Object.assign({}, p, { routing: r }); });
          APP.audit({ action: "Routing changed", item: m.id, detail: cls + ": " + CELL[cur].label + " to " + CELL[next].label, dataClass: cls === "Embeddings and masking detection" ? null : cls });
          APP.toast.success("Routing changed and logged.");
        } });
    };
    var cols = [{ title: "Data class", dataIndex: "cls", key: "cls", fixed: "left", render: function (v) {
      return v === "Embeddings and masking detection" ? html`<span style=${{ fontWeight: 500 }}>Embeddings and masking</span>` : html`<${APP.DataClassTag} cls=${v} />`;
    } }].concat(D.models.map(function (m) {
      return { title: html`<div style=${{ lineHeight: 1.25, minWidth: 92 }}><div style=${{ fontWeight: 600, fontSize: 12 }}>${m.name.replace(" on Bedrock", "")}</div><div style=${{ fontSize: 11, color: tok.colorTextTertiary }}>${m.host === "Bedrock" ? "Bedrock" : "Self-hosted"}</div></div>`,
        key: m.id, align: "center",
        render: function (_, row) {
          var c = cellOf(row.cls, m), def = CELL[c];
          var locked = c === "never" || c === "unapproved" || c === "na";
          return html`<${A.Tooltip} title=${def.label + (c === "never" ? ": fixed by policy" : c === "masked" ? ": only after masking and the data owner's release" : "") + (!locked && !ro ? ". Click to change" : "")}>
            <span role=${locked ? undefined : "button"} tabIndex=${locked ? undefined : 0} onClick=${function () { toggle(row.cls, m); }}
              onKeyDown=${function (e) { if (e.key === "Enter") toggle(row.cls, m); }}
              style=${{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, cursor: locked ? "default" : "pointer", color: tok[def.tone] }}>
              <${Icon} name=${def.icon} style=${{ fontSize: 16 }} aria-label=${def.label} />
            </span>
          <//>`;
        } };
    }));
    var modelCols = [
      { title: "Model", dataIndex: "name", key: "name", render: function (v, m) {
        return html`<div style=${{ minWidth: 170 }}><div style=${{ display: "flex", gap: 6, alignItems: "center" }}><${Icon} name=${m.host === "Bedrock" ? "CloudOutlined" : "CloudServerOutlined"} style=${{ color: tok.colorTextSecondary }} /><b>${v}</b></div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${(AD.modelInfo[m.id] || {}).version}</div></div>`;
      } },
      { title: "Runs in", dataIndex: "host", key: "host", render: function (v) { return v === "Bedrock" ? "Bedrock, PrivateLink" : "CICT VPC"; } },
      { title: "Approved for", dataIndex: "classes", key: "classes", render: function (v) {
        return v.length ? html`<span style=${{ display: "inline-flex", flexWrap: "wrap", gap: 4, minWidth: 160 }}>${v.map(function (c) { return html`<${APP.DataClassTag} key=${c} cls=${c.split(" ")[0]} label=${/masked/.test(c) ? "Sensitive, masked" : c} />`; })}</span>` : html`<span style=${{ color: tok.colorTextTertiary }}>Not approved</span>`;
      } },
      { title: "Status", key: "status", render: function (_, m) { return html`<${APP.StatusTag} status=${st.status[m.id] || m.status} />`; } },
      { title: "Latency", dataIndex: "latency", key: "latency", render: function (v) { return v || "None"; } },
      { title: "Spend this month", key: "spend", render: function (_, m) {
        var b = budgetOf(m);
        if (!b) return html`<span style=${{ fontSize: 12, color: tok.colorTextTertiary }}>${m.host === "Bedrock" ? "No budget" : "Included in GPU cost"}</span>`;
        var pct = Math.round(m.costMonth / b * 100);
        return html`<div style=${{ minWidth: 160 }}><${A.Progress} size="small" percent=${pct} status=${pct >= 90 ? "exception" : "normal"} showInfo=${false} strokeColor=${pct >= 90 ? tok.colorError : pct >= 80 ? tok.colorWarning : tok.colorPrimary} />
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${fmt.usd(m.costMonth) + " of " + fmt.usd(b) + " · " + pct + "%"}</div></div>`;
      } }
    ];
    var dayLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    return html`<div>
      <${ReadOnlyNote} />
      ${!st.ack && claudePct >= 90 ? html`<${A.Alert} type="error" showIcon style=${{ marginBottom: 12 }}
        message=${"Claude on Bedrock has used " + claudePct + "% of its monthly budget"} title=${"Claude on Bedrock has used " + claudePct + "% of its monthly budget"}
        description=${fmt.usd(claude.costMonth) + " of " + fmt.usd(budgetOf(claude)) + " with 20 days left. At this rate it reaches the budget on 12 Nov. Contract reviews would then move to Qwen on Bedrock."}
        action=${ro ? null : html`<${A.Flex} vertical gap=${6}>
          <${A.Button} size="small" type="primary" onClick=${function () { raise[1](true); }}>Raise budget<//>
          <${A.Button} size="small" onClick=${function () { set({ ack: true }); APP.audit({ action: "Alert acknowledged", item: "m-claude-br", detail: "Budget alert at " + claudePct + "%", dataClass: null }); APP.toast.info("Alert acknowledged. It returns at 100%."); }}>Acknowledge<//>
        <//>`} />` : null}
      ${(st.status["m-deepseek-br"] || "Degraded") === "Degraded" ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 16 }}
        message="DeepSeek on Bedrock is slow: 8.2 seconds against a 4 second target" title="DeepSeek on Bedrock is slow: 8.2 seconds against a 4 second target"
        description="Policy comparison tasks are queued and retried. If it gets worse they move to Qwen on Bedrock. Nothing goes to an unapproved model." />` : null}
      <${A.Card} size="small" title="Models" style=${{ marginBottom: 16 }} extra=${html`<${APP.SowRef} sec="2.4" />`}>
        <${APP.DataTable} columns=${modelCols} data=${D.models} pageSize=${10} search=${false}
          filters=${[{ key: "host", label: "Runs in", options: [{ value: "Bedrock", label: "Bedrock" }, { value: "Self-hosted", label: "Self-hosted" }] }]}
          onRowClick=${function (m) { open[1](m.id); }} />
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>Any model with an API can be added through the gateway. The specification names DeepSeek, Kimi, GPT, Claude, Gemini and Grok as options.</div>
      <//>
      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} xl=${15}>
          <${A.Card} size="small" title="Routing by data class" extra=${html`<${APP.SowRef} sec="1.3 2.4.5" />`} style=${{ height: "100%" }}>
            <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="cls" columns=${cols} dataSource=${MATRIX_ROWS.map(function (c) { return { cls: c }; })} scroll=${{ x: "max-content" }} /></div>
            <${A.Flex} wrap gap=${12} style=${{ marginTop: 10, fontSize: 12, color: tok.colorTextSecondary }}>
              ${["allowed", "masked", "never", "off", "unapproved"].map(function (k) { return html`<span key=${k}><${Icon} name=${CELL[k].icon} style=${{ color: tok[CELL[k].tone] }} /> ${CELL[k].label}</span>`; })}
            <//>
            <div style=${{ marginTop: 12, fontSize: 13 }}>
              <div style=${{ fontWeight: 600, marginBottom: 4 }}>If a model is unavailable</div>
              <ul style=${{ margin: 0, paddingLeft: 18 }}>
                <li>Public and Internal tasks move to the next allowed model in the row.</li>
                <li>Sensitive tasks move to Qwen (self-hosted), unmasked, inside the VPC. A new release is needed to use another Bedrock model.</li>
                <li>Confidential tasks wait for the standby self-hosted model. Users are told.</li>
                <li>Nothing is ever sent to a model that is off or not approved.</li>
              </ul>
            </div>
          <//>
        <//>
        <${A.Col} xs=${24} xl=${9}>
          <${A.Card} size="small" title="Spend this month" style=${{ height: "100%" }}>
            <div style=${{ fontWeight: 500, fontSize: 13 }}>Claude on Bedrock, daily spend (USD)</div>
            <${Bars} values=${AD.dailyCost["m-claude-br"]} labels=${dayLabels} line=${Math.round(budgetOf(claude) / 30)} color=${tok.colorPrimary} label="Daily spend for Claude on Bedrock" />
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 12 }}>${"Days of November. Dashed line: daily budget of " + fmt.usd(Math.round(budgetOf(claude) / 30))}</div>
            <${A.Flex} vertical gap=${10}>
              ${D.models.filter(function (m) { return budgetOf(m); }).map(function (m) {
                var b = budgetOf(m), pct = Math.round(m.costMonth / b * 100);
                return html`<div key=${m.id}><div style=${{ display: "flex", fontSize: 13 }}><span style=${{ flex: 1 }}>${m.name}</span><span>${fmt.usd(m.costMonth) + " / " + fmt.usd(b)}</span></div>
                  <${A.Progress} size="small" percent=${pct} showInfo=${false} strokeColor=${pct >= 90 ? tok.colorError : pct >= 80 ? tok.colorWarning : tok.colorPrimary} /></div>`;
              })}
            <//>
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 10 }}>Actual cloud and model costs, with alerts at 80% and 90% <${APP.SowRef} sec="2.5" /></div>
          <//>
        <//>
      <//>
      <${ModelDrawer} id=${open[0]} state=${st} set=${set} onClose=${function () { open[1](null); }} />
      <${A.Modal} open=${raise[0]} title="Raise the budget for Claude on Bedrock" onCancel=${function () { raise[1](false); }} okText="Save"
        onOk=${function () {
          set(function (p) { var b = Object.assign({}, p.budgets); b["m-claude-br"] = raiseVal[0]; return Object.assign({}, p, { budgets: b }); });
          APP.audit({ action: "Model setting changed", item: "m-claude-br", detail: "Monthly budget raised from " + fmt.usd(budgetOf(claude)) + " to " + fmt.usd(raiseVal[0]), dataClass: null });
          APP.toast.success("Budget raised to " + fmt.usd(raiseVal[0]) + ". Logged for the auditor.");
          raise[1](false);
        }}>
        <${A.Flex} vertical gap=${10}>
          <div>New monthly budget (USD)</div>
          <${A.InputNumber} min=${100} step=${50} value=${raiseVal[0]} onChange=${function (v) { raiseVal[1](v || 100); }} style=${{ width: 180 }} aria-label="New monthly budget in USD" />
          <div style=${{ fontSize: 12, opacity: 0.7 }}>Forecast at the current rate: about USD 1,420 by the end of November.</div>
        <//>
      <//>
    </div>`;
  }

  /* ------------------------------------------------------------------
     MASKING RULES
     ------------------------------------------------------------------ */
  function rangeOf(amount) {
    var cur = (/^(USD|LKR)/.exec(amount) || ["USD"])[0];
    var v = parseFloat(String(amount).replace(/[^0-9.]/g, "")) || 0;
    if (v >= 1e6) { var lo = Math.floor(v / 1e6); return cur + " " + lo + "-" + (lo + 1) + " million"; }
    if (v >= 1e5) return cur + " 100k-1 million";
    return cur + " under 100k";
  }
  function detect(text, offTypes) {
    var ents = [], seen = {}, counters = {};
    var add = function (type, str, prefix, method, extra) {
      if (!str || seen[str] || offTypes[type]) return;
      seen[str] = true;
      counters[prefix] = (counters[prefix] || 0) + 1;
      ents.push(Object.assign({ id: "t" + ents.length, type: type, text: str, placeholder: "[" + prefix + "-" + counters[prefix] + "]", method: method, count: text.split(str).length - 1 }, extra || {}));
    };
    var each = function (re, fn) { var m; re.lastIndex = 0; while ((m = re.exec(text))) fn(m[0]); };
    each(/\b[A-Z]{2,4}\/[A-Z]{2,5}\/\d{4}\/\d{2,4}\b/g, function (x) { add("Contract number", x, "CONTRACT", "placeholder"); });
    each(/\b\d{4}-\d{4}-\d{4}\b/g, function (x) { add("Bank account", x, "BANK-ACCOUNT", "placeholder"); });
    each(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, function (x) { add("Contact details", x, "EMAIL", "delete"); });
    each(/\+94[\d ]{8,12}\d/g, function (x) { add("Contact details", x, "PHONE", "delete"); });
    each(/\b(\d{12}|\d{9}[VvXx])\b/g, function (x) { add("Identity number", x, "ID", "mask"); });
    each(/\bCUST-\d{5}\b/g, function (x) { add("Customer ID", x, "CUSTOMER", "placeholder"); });
    each(/\b(USD|LKR)\s?[\d,]+(\.\d+)?\b/g, function (x) { add("Transaction price", x, "AMOUNT", "range", { range: rangeOf(x) }); });
    AD.knownCompanies.forEach(function (c) { if (text.indexOf(c) >= 0 && !ents.some(function (e) { return e.text.indexOf(c) >= 0; })) add("Company name", c, "PARTY", "placeholder"); });
    AD.knownNames.forEach(function (n) { if (text.indexOf(n) >= 0) add("Personal name", n, "PERSON", "placeholder"); });
    return ents;
  }

  function MaskingTab() {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var ro = pid !== "admin";
    var stp = useSharedObj("admin.masking", { draftStatus: "Draft", off: {}, sample: AD.testSample });
    var st = stp[0], set = stp[1];
    var ver = APP.useState("1.4");
    var open = APP.useState(null);
    var ran = APP.useState(null);
    var methods = APP.useState({});
    var sets = AD.ruleSets.map(function (r) { return r.v === "1.5" ? Object.assign({}, r, { status: st.draftStatus }) : r; });
    var cur = sets.filter(function (r) { return r.v === ver[0]; })[0];
    var rules = AD.maskRules.filter(function (r) { return parseFloat(r.since) <= parseFloat(ver[0]); }).map(function (r) {
      var off = ver[0] === "1.5" && st.off[r.id];
      return Object.assign({}, r, { status: off ? "Off in draft" : r.status === "Draft" && ver[0] === "1.5" ? "New in 1.5" : r.status });
    });
    var rule = open[0] ? rules.filter(function (r) { return r.id === open[0]; })[0] : null;
    var offTypes = {};
    if (ver[0] === "1.5") AD.maskRules.forEach(function (r) { if (st.off[r.id]) offTypes[r.type] = true; });
    var runTest = function () {
      var ents = detect(st.sample || "", offTypes);
      var m = {};
      ents.forEach(function (e) { m[e.id] = e.method; });
      methods[1](m);
      ran[1]({ ents: ents, text: st.sample || "", ver: ver[0] });
      APP.audit({ action: "Masking test", item: "Rule set " + ver[0], detail: ents.length + " items found in a test sample. Nothing stored or sent", dataClass: null });
    };
    var res = ran[0];
    var masked = res ? APP.maskText(res.text, res.ents, methods[0]) : "";
    var segs = res ? APP.segmentize(res.text, res.ents) : [];
    return html`<div>
      <${ReadOnlyNote} text="You can see the rules, run the test sample and read the masking log, but not change rules." />
      <${A.Card} size="small" style=${{ marginBottom: 16 }}>
        <${A.Flex} wrap gap=${12} align="center">
          <span style=${{ fontWeight: 600 }}>Rule set</span>
          <${A.Segmented} value=${ver[0]} onChange=${function (v) { ver[1](v); ran[1](null); }} options=${sets.map(function (r) { return { value: r.v, label: "v" + r.v + (r.status === "Active" ? " (active)" : r.status === "Superseded" ? "" : " (" + r.status.toLowerCase() + ")") }; })} />
          <span style=${{ flex: 1 }}></span>
          ${cur.v === "1.5" && !ro ? (st.draftStatus === "Draft" ? html`<${A.Button} type="primary" onClick=${function () {
            set({ draftStatus: "Awaiting approval" });
            APP.notify({ to: ["owner"], kind: "approval", title: "Masking rule set 1.5 waits for approval", body: "K. Dias submitted rule set 1.5: vessel and voyage numbers, better Sinhala names.", route: "admin", params: { tab: "masking" } });
            APP.audit({ action: "Masking rules submitted", item: "Rule set 1.5", detail: "Sent to S. Silva for approval. Test recall 97.8%", dataClass: null });
            APP.toast.success("Sent to S. Silva for approval. Rule set 1.4 stays active until then.");
          }}>Submit for approval<//>` : html`<${APP.StatusTag} status="Awaiting approval" tone="processing" />`) : null}
          ${cur.v === "1.5" && pid === "owner" && st.draftStatus === "Awaiting approval" ? html`<${A.Button} type="primary" onClick=${function () {
            set({ draftStatus: "Approved" });
            APP.audit({ action: "Masking rules approved", item: "Rule set 1.5", detail: "Approved by S. Silva. Goes live at the next release window", dataClass: null });
            APP.toast.success("Approved. Rule set 1.5 goes live in the next release window.");
          }}>Approve rule set 1.5<//>` : null}
        <//>
        <div style=${{ marginTop: 10 }}>
          <${APP.KeyFacts} column=${{ xs: 1, sm: 2, lg: 4 }} items=${[["Status", html`<${APP.StatusTag} status=${cur.status} />`], ["In use", cur.from ? fmt.date(cur.from) + (cur.until ? " to " + fmt.date(cur.until) : " onwards") : "Not yet"],
            ["Prepared by", cur.by], ["Approved by", cur.approvedBy || (cur.status === "Awaiting approval" ? "Waiting for S. Silva" : "Not yet")], ["Changes", cur.note, 4]]} />
        </div>
      <//>
      <${A.Row} gutter=${[16, 16]}>
        <${A.Col} xs=${24} xl=${13}>
          <${A.Card} size="small" title=${"Rules in v" + ver[0]} extra=${html`<${APP.SowRef} sec="1.4.1 1.4.2" />`} style=${{ height: "100%" }}>
            <${APP.DataTable} data=${rules} pageSize=${12} searchPlaceholder="Search rules" onRowClick=${function (r) { open[1](r.id); }}
              filters=${[{ key: "method", label: "Method", options: APP.MASK_METHODS }]}
              columns=${[
                APP.col.id("Rule", "id"),
                { title: "Finds", dataIndex: "type", key: "type", render: function (v, r) { return html`<div style=${{ minWidth: 150 }}><b>${v}</b><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${r.detector}</div></div>`; } },
                { title: "Default method", dataIndex: "method", key: "method", render: function (v) { return (APP.MASK_METHODS.filter(function (m) { return m.value === v; })[0] || {}).label; } },
                { title: "Example", key: "ex", render: function (_, r) { return html`<span className="nowrap"><mark className="ent">${r.sample}</mark> to <span className="mono">${r.out}</span></span>`; } },
                { title: "Recall", dataIndex: "recall", key: "recall", align: "right", render: function (v) { return v + "%"; } },
                APP.col.status("Status", "status")
              ]} />
          <//>
        <//>
        <${A.Col} xs=${24} xl=${11}>
          <${A.Card} size="small" title="Test sample" extra=${html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Runs rule set " + ver[0]}</span>`} style=${{ height: "100%" }}>
            <${A.Input.TextArea} rows=${5} value=${st.sample} onChange=${function (e) { set({ sample: e.target.value }); ran[1](null); }} aria-label="Test sample text" />
            <${A.Flex} gap=${8} style=${{ marginTop: 8 }} wrap>
              <${A.Button} type="primary" icon=${html`<${Icon} name="ExperimentOutlined" />`} onClick=${runTest}>Run test<//>
              <${A.Button} onClick=${function () { set({ sample: AD.testSample }); ran[1](null); }}>Reset sample<//>
            <//>
            ${res ? html`<div style=${{ marginTop: 14 }}>
              <div style=${{ fontWeight: 600, marginBottom: 4 }}>${res.ents.length + " items found"}</div>
              <div style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 10, fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                ${segs.map(function (sg, i) { return sg.e ? html`<mark key=${i} className="ent" title=${sg.e.type}>${sg.t}</mark>` : html`<span key=${i}>${sg.t}</span>`; })}
              </div>
              <div style=${{ fontWeight: 600, margin: "10px 0 4px" }}>What would be sent</div>
              <div className="mono" style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 10, fontSize: 12.5, whiteSpace: "pre-wrap", lineHeight: 1.7, background: tok.colorFillQuaternary }}>${masked}</div>
              <div className="table-scroll" style=${{ marginTop: 10 }}><${A.Table} size="small" pagination=${false} rowKey="id" dataSource=${res.ents} columns=${[
                { title: "Type", dataIndex: "type", render: function (v) { return html`<span className="nowrap">${v}</span>`; } },
                { title: "Found", dataIndex: "text", render: function (v) { return html`<mark className="ent">${v}</mark>`; } },
                { title: "Method", key: "m", render: function (_, e) {
                  return html`<${A.Select} size="small" style=${{ width: 120 }} value=${methods[0][e.id]} aria-label=${"Method for " + e.type}
                    options=${APP.MASK_METHODS.filter(function (m) { return m.value !== "range" || e.range; })}
                    onChange=${function (v) { var n = Object.assign({}, methods[0]); n[e.id] = v; methods[1](n); }} />`;
                } },
                { title: "Sent as", key: "o", render: function (_, e) { return html`<span className="mono nowrap">${APP.maskValue(e, methods[0][e.id])}</span>`; } }
              ]} /></div>
              <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>The same entity always gets the same stand-in. Test text is not stored or sent anywhere.</div>
            </div>` : html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 10 }}>Edit the text or keep the sample, then run the test to see what each rule finds and what would leave the VPC.</div>`}
          <//>
        <//>
      <//>
      <${A.Card} size="small" title="Masking log" style=${{ marginTop: 16 }} extra=${html`<${APP.SowRef} sec="1.4.8" />`}>
        <${APP.DataTable} search=${false} pageSize=${6} data=${AD.maskingOps.map(function (o, i) { return Object.assign({ id: "MO-" + i }, o); })}
          onRowClick=${function (o) { var m = /REL-\d+/.exec(o.dest); if (m) APP.navigate("approvals", { id: m[0] }); else APP.toast.info("No release was needed: the self-hosted model was used."); }}
          columns=${[
            APP.col.date("When", "at", { render: function (v) { return html`<span className="nowrap">${fmt.dateTime(v)}</span>`; } }),
            APP.col.person("Operator", "by"),
            APP.col.id("Document", "item"),
            { title: "Rules", dataIndex: "rules", key: "rules", render: function (v) { return "v" + v; } },
            APP.col.text("Found", "found"),
            APP.col.text("Checked", "review"),
            APP.col.text("Destination", "dest")
          ]} />
      <//>
      <${APP.DetailDrawer} open=${!!rule} onClose=${function () { open[1](null); }} title=${rule ? rule.type : ""} subtitle=${rule ? rule.id + " · rule set " + ver[0] : ""} size=${560}
        tags=${rule ? html`<${APP.StatusTag} status=${rule.status} />` : null}>
        ${rule ? html`<${A.Flex} vertical gap=${16}>
          <${APP.KeyFacts} column=${1} items=${[["Detector", rule.detector], ["Languages", rule.langs.join(", ")], ["Default method", (APP.MASK_METHODS.filter(function (m) { return m.value === rule.method; })[0] || {}).label],
            ["Example", html`<span><mark className="ent">${rule.sample}</mark> is sent as <span className="mono">${rule.out}</span></span>`], ["Added in", "Rule set " + rule.since],
            ["Precision", rule.precision + "%"], ["Recall", rule.recall + "%"]]} />
          ${rule.draftNote ? html`<${A.Alert} type="info" showIcon message="Change in draft 1.5" title="Change in draft 1.5" description=${rule.draftNote} />` : null}
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Precision and recall come from the test set of 1,200 marked passages in English, Chinese and Sinhala. Users can always correct a result by hand before release.</div>
          ${ro ? null : ver[0] === "1.5" ? html`<${A.Button} onClick=${function () {
            var off = !st.off[rule.id];
            set(function (p) { var o = Object.assign({}, p.off); o[rule.id] = off; return Object.assign({}, p, { off: o }); });
            APP.audit({ action: "Masking rule changed", item: rule.id, detail: rule.type + (off ? " switched off" : " switched on") + " in draft 1.5", dataClass: null });
            APP.toast.success(rule.type + (off ? " switched off" : " switched on") + " in draft 1.5. Run the test to see the effect.");
          }}>${st.off[rule.id] ? "Switch on in draft 1.5" : "Switch off in draft 1.5"}<//>`
            : html`<${A.Alert} type="info" showIcon message="Active rules don't change directly" title="Active rules don't change directly"
                description="Changes go into the next draft rule set, are tested, then approved by the data owner." action=${html`<${A.Button} size="small" onClick=${function () { ver[1]("1.5"); open[1](null); }}>Open draft 1.5<//>`} />`}
        <//>` : null}
      <//>
    </div>`;
  }

  /* ------------------------------------------------------------------
     HEALTH
     ------------------------------------------------------------------ */
  var DOT = { green: "success", amber: "warning", red: "error" };
  var DOT_LABEL = { green: "Healthy", amber: "Degraded", red: "Down" };
  function HealthTab() {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var ro = pid !== "admin";
    var phase2On = s.ui.phaseMode === "both";
    var stp = useSharedObj("admin.health", { over: {}, inc: {}, checkedAt: null });
    var st = stp[0], set = stp[1];
    var open = APP.useState(null);
    var busy = APP.useState(null);
    var svc = AD.services.filter(function (x) { return !x.phase || phase2On; }).map(function (x) { return Object.assign({}, x, st.over[x.id] || {}); })
      .sort(function (a, b) { var o = { red: 0, amber: 1, green: 2 }; return o[a.status] - o[b.status]; });
    var hiddenP2 = AD.services.length - svc.length;
    var counts = { green: 0, amber: 0, red: 0 };
    svc.forEach(function (x) { counts[x.status]++; });
    var incidents = AD.incidents.map(function (i) { return Object.assign({}, i, st.inc[i.id] || {}); });
    var openInc = incidents.filter(function (i) { return i.status === "Open"; });
    var sel = open[0] ? svc.filter(function (x) { return x.id === open[0]; })[0] : null;
    var colorOf = function (x) { return x.status === "red" ? tok.colorError : x.status === "amber" ? tok.colorWarning : tok.colorSuccess; };
    var fix = function (x, label, msg) {
      busy[1](x.id);
      setTimeout(function () {
        set(function (p) {
          var o = Object.assign({}, p.over); o[x.id] = Object.assign({}, o[x.id] || {}, { status: "green", metric: x.id === "email" ? "0" : x.id === "gateway" ? "3.1 s" : x.metric, series: x.series.slice(0, 18).concat(AD.series(5, 6, x.id === "gateway" ? 3 : 1, 0.5)) });
          var inc = Object.assign({}, p.inc); if (x.incident) inc[x.incident] = { status: "Resolved", closed: APP.nowIso() };
          return Object.assign({}, p, { over: o, inc: inc });
        });
        busy[1](null);
        APP.audit({ action: label, item: x.incident || x.id, detail: msg, dataClass: null });
        APP.toast.success(msg);
      }, 1200);
    };
    var tiles = svc.map(function (x) {
      return html`<${A.Col} key=${x.id} xs=${24} sm=${12} lg=${8} xxl=${6}>
        <${A.Card} size="small" hoverable onClick=${function () { open[1](x.id); }} style=${{ height: "100%", cursor: "pointer", borderTop: "3px solid " + colorOf(x) }}>
          <div style=${{ display: "flex", alignItems: "center", gap: 8 }}>
            <${A.Badge} status=${DOT[x.status]} />
            <span style=${{ fontWeight: 600, flex: 1, minWidth: 0 }}>${x.name}</span>
            ${x.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}
          </div>
          <div style=${{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <span style=${{ fontSize: 22, fontWeight: 600, color: x.status === "green" ? tok.colorText : colorOf(x) }}>${x.metric}</span>
            <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${x.metricLabel}</span>
          </div>
          <div style=${{ marginTop: 6 }}><${Sparkline} values=${x.series} height=${34} color=${colorOf(x)} label=${x.name + " trend"} /></div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>${DOT_LABEL[x.status] + " · target " + x.target}</div>
        <//>
      <//>`;
    });
    return html`<div>
      <${A.Row} gutter=${[16, 16]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${8} md=${6}><${Stat} title="Healthy" value=${counts.green} icon="CheckCircleOutlined" color="colorSuccess" /><//>
        <${A.Col} xs=${8} md=${6}><${Stat} title="Degraded" value=${counts.amber} icon="ExclamationCircleOutlined" color=${counts.amber ? "colorWarning" : null} /><//>
        <${A.Col} xs=${8} md=${6}><${Stat} title="Down" value=${counts.red} icon="CloseCircleOutlined" color=${counts.red ? "colorError" : null} /><//>
        <${A.Col} xs=${24} md=${6}><${Stat} title="Open incidents" value=${openInc.length} icon="AlertOutlined" note=${"Checked " + fmt.time(st.checkedAt || APP.nowIso())} /><//>
      <//>
      ${openInc.length ? html`<${A.Card} size="small" title="Open incidents" style=${{ marginBottom: 16 }}>
        <${A.Flex} vertical gap=${8}>${openInc.map(function (i) {
          var sv = svc.filter(function (x) { return x.id === i.service; })[0];
          return html`<div key=${i.id} role="button" tabIndex=${0} onClick=${function () { open[1](i.service); }} onKeyDown=${function (e) { if (e.key === "Enter") open[1](i.service); }}
            style=${{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", cursor: "pointer", padding: "6px 0" }}>
            <${APP.StatusTag} status=${i.severity} />
            <span className="mono">${i.id}</span>
            <span style=${{ fontWeight: 500, flex: 1, minWidth: 180 }}>${i.title}</span>
            <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Opened " + fmt.relative(i.opened) + " · alerted " + i.notified.join(", ")}</span>
            ${sv ? null : html`<${APP.PhaseTag} phase=${2} />`}
          </div>`;
        })}<//>
      <//>` : null}
      <${A.Row} gutter=${[16, 16]}>${tiles}<//>
      ${hiddenP2 ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>${hiddenP2 + " more services arrive with Phase 2 modules."}</div>` : null}
      <${A.Row} gutter=${[16, 16]} style=${{ marginTop: 16 }}>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Next upgrade" extra=${html`<${APP.SowRef} sec="2.6" />`} style=${{ height: "100%" }}>
            <${APP.KeyFacts} column=${1} items=${[["Version", AD.maintenance.version], ["Window", AD.maintenance.window], ["Impact", AD.maintenance.impact], ["Rollback", AD.maintenance.rollback]]} />
            <${A.Button} style=${{ marginTop: 10 }} disabled=${ro} onClick=${function () {
              APP.notify({ to: ["legal", "owner", "reviewer", "compliance", "cosec", "auditor"], kind: "info", title: "Planned upgrade " + AD.maintenance.window, body: AD.maintenance.impact, route: "workspace", params: {} });
              APP.audit({ action: "Upgrade notice sent", item: "Release " + AD.maintenance.version, detail: AD.maintenance.window, dataClass: null });
              APP.toast.success("Notice sent to all users. Check the bell as another role.");
            }}>Notify users<//>
          <//>
        <//>
        <${A.Col} xs=${24} lg=${12}>
          <${A.Card} size="small" title="Recently resolved" style=${{ height: "100%" }}>
            <${A.Timeline} items=${incidents.filter(function (i) { return i.status === "Resolved"; }).map(function (i) {
              var c = html`<div><div style=${{ fontWeight: 500 }}>${i.id + ": " + i.title}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${"Opened " + fmt.dateTime(i.opened) + ", resolved " + fmt.dateTime(i.closed)}</div></div>`;
              return { key: i.id, color: "green", children: c, content: c };
            })} />
          <//>
        <//>
      <//>
      <${APP.DetailDrawer} open=${!!sel} onClose=${function () { open[1](null); }} size=${600} title=${sel ? sel.name : ""} subtitle=${sel ? sel.metricLabel + ": " + sel.metric : ""}
        tags=${sel ? html`<${A.Tag} color=${DOT[sel.status]}>${DOT_LABEL[sel.status]}<//>` : null}>
        ${sel ? html`<${A.Flex} vertical gap=${16}>
          <div>${sel.detail}</div>
          <div><div style=${{ fontWeight: 600, marginBottom: 6 }}>Last 24 hours</div>
            <${Sparkline} values=${sel.series} height=${90} color=${colorOf(sel)} label=${sel.name + " last 24 hours"} />
            <div style=${{ display: "flex", justifyContent: "space-between", fontSize: 11, color: tok.colorTextTertiary }}><span>24 h ago</span><span>Now</span></div></div>
          <${APP.KeyFacts} column=${1} items=${[["Target", sel.target], ["Alerts go to", "K. Dias, L. Abeysekara (email and in-app)"], ["Open incident", sel.incident && (st.inc[sel.incident] || {}).status !== "Resolved" ? sel.incident : "None"], ["Monitoring", "Prometheus and Grafana, traces in Langfuse"]]} />
          ${ro ? null : html`<${A.Flex} wrap gap=${8}>
            <${A.Button} onClick=${function () { set({ checkedAt: APP.nowIso() }); APP.toast.info("Check run at " + fmt.time(APP.nowIso()) + ". " + DOT_LABEL[sel.status] + "."); }}>Run check now<//>
            ${sel.id === "gateway" && sel.status !== "green" ? html`<${A.Button} type="primary" loading=${busy[0] === "gateway"} onClick=${function () { fix(sel, "Routing changed", "DeepSeek on Bedrock tasks moved to Qwen on Bedrock. Incident INC-031 resolved."); }}>Move DeepSeek tasks to Qwen on Bedrock<//>` : null}
            ${sel.id === "email" && sel.status !== "green" ? html`<${A.Button} type="primary" loading=${busy[0] === "email"} onClick=${function () { fix(sel, "Service restarted", "Mail relay restarted. 38 queued emails sent. Incident INC-032 resolved."); }}>Restart the mail relay<//>` : null}
            ${sel.id === "regsrc" && sel.status !== "green" ? html`<${A.Button} loading=${busy[0] === "regsrc"} onClick=${function () { fix(sel, "Source check retried", "Gazette site reached on retry. 14 of 14 sources checked."); }}>Retry the failed source<//>` : null}
          <//>`}
        <//>` : null}
      <//>
    </div>`;
  }

  /* ------------------------------------------------------------------
     AUDIT LOG
     ------------------------------------------------------------------ */
  var CATS = [
    ["Logins", /^Sign-in/],
    ["Material access", /^(Material access|Records question|Access requested)/],
    ["Uploads and imports", /^(Upload|Import|Archived)/],
    ["Model calls and releases", /^(Model call|Release|Masking$)/],
    ["Reviews", /^(Sent for review|Review)/],
    ["Exports", /^Export/],
    ["Deletions", /^(Deletion|Disposal approved)/],
    ["Knowledge base and rules", /^(Knowledge|Data class|Upload returned|List refresh|Masking)/],
    ["Settings and permissions", /./]
  ];
  function categoryOf(action) { for (var i = 0; i < CATS.length; i++) if (CATS[i][1].test(action || "")) return CATS[i][0]; return "Settings and permissions"; }
  function hashOf(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return ("00000000" + h.toString(16)).slice(-8); }
  function itemRoute(item) {
    var it = String(item || "");
    if (/^REL-/.test(it)) return { route: "approvals", params: { id: it }, label: "Open the release request" };
    if (/^REV-/.test(it)) return { route: "reviews", params: { id: it }, label: "Open the review" };
    if (/^REC-/.test(it)) return { route: "records", params: { id: it }, label: "Open the record" };
    if (/^CON-/.test(it)) return { route: "contracts", params: { id: it }, label: "Open the contract" };
    if (/^KB-/.test(it)) return { route: "knowledge", params: { id: it }, label: "Open in the knowledge base" };
    if (/^IMP-/.test(it)) return { route: "records", params: { tab: "import" }, label: "Open the import" };
    if (/^m-/.test(it)) return { route: "admin", params: { tab: "models" }, label: "Open models and routing", tab: "models" };
    if (/^(Rule set|MR-)/.test(it)) return { route: "admin", params: { tab: "masking" }, label: "Open masking rules", tab: "masking" };
    if (/^(Role|User)/.test(it)) return { route: "admin", params: { tab: "users" }, label: "Open users and roles", tab: "users" };
    if (/^INC-/.test(it)) return { route: "admin", params: { tab: "health" }, label: "Open health", tab: "health" };
    return null;
  }

  function AuditTab(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var period = APP.useState("All");
    var open = APP.useState(null);
    var exp = APP.useState(false);
    var fmtSel = APP.useState("Excel");
    var seen = {};
    var rows = s.audit.concat(AD.auditExtra).filter(function (e) { if (seen[e.id]) return false; seen[e.id] = true; return true; })
      .map(function (e) { return Object.assign({}, e, { category: categoryOf(e.action), actorName: APP.personName(e.actorId) }); })
      .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    var n = APP.now();
    var inPeriod = rows.filter(function (e) {
      var d = APP.dayjs(e.at);
      if (period[0] === "Today") return d.isSame(n, "day");
      if (period[0] === "Last 7 days") return n.diff(d, "day") < 7;
      if (period[0] === "Last 30 days") return n.diff(d, "day") < 30;
      return true;
    });
    var today = rows.filter(function (e) { return APP.dayjs(e.at).isSame(n, "day"); });
    var live = rows.filter(function (e) { return e.live; }).length;
    var sel = open[0] ? rows.filter(function (e) { return e.id === open[0]; })[0] : null;
    var related = sel ? rows.filter(function (e) { return e.item === sel.item && e.id !== sel.id; }).slice(0, 6) : [];
    var idx = sel ? rows.indexOf(sel) : -1;
    var prev = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : null;
    var canExport = pid === "auditor";
    var actors = D.personas.map(function (p) { return { value: p.id, label: p.name }; }).concat([{ value: "system", label: "System" }, { value: "p-records", label: "P. Senanayake" }]);
    return html`<div>
      <${A.Row} gutter=${[16, 16]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Events today" value=${today.length} icon="UnorderedListOutlined" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Model calls and releases today" value=${today.filter(function (e) { return e.category === "Model calls and releases"; }).length} icon="ApiOutlined" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Permission changes, 30 days" value=${rows.filter(function (e) { return /^Permission/.test(e.action) && n.diff(APP.dayjs(e.at), "day") < 30; }).length} icon="KeyOutlined" /><//>
        <${A.Col} xs=${12} md=${6}><${Stat} title="Recorded in this session" value=${live} icon="ThunderboltOutlined" note="From the steps you took" color=${live ? "colorPrimary" : null} /><//>
      <//>
      <${A.Card} size="small" title="Audit log" extra=${html`<${APP.SowRef} sec="3.7.4 1.4.8" />`}>
        <${APP.DataTable} data=${inPeriod} pageSize=${12} searchPlaceholder="Search item, action or detail"
          searchKeys=${["id", "action", "item", "detail", "actorName"]}
          filters=${[
            { key: "actorId", label: "Who", options: actors },
            { key: "category", label: "Event type", options: CATS.map(function (c) { return { value: c[0], label: c[0] }; }), width: 200 },
            { key: "dataClass", label: "Data class", options: ["Public", "Internal", "Sensitive", "Confidential"].map(function (c) { return { value: c, label: c }; }) }
          ]}
          toolbar=${html`<${A.Flex} gap=${8} wrap align="center">
            <${A.Segmented} size="small" value=${period[0]} onChange=${period[1]} options=${["Today", "Last 7 days", "Last 30 days", "All"]} />
            <${A.Tooltip} title=${canExport ? "Export within the selected period" : "Only auditors export the audit log"}>
              <${A.Button} size="small" icon=${html`<${Icon} name="DownloadOutlined" />`} disabled=${!canExport} onClick=${function () { exp[1](true); }}>Export<//>
            <//>
          <//>`}
          onRowClick=${function (e) { open[1](e.id); }}
          columns=${[
            { title: "When", dataIndex: "at", key: "at", render: function (v) { return html`<span className="nowrap">${fmt.dateTime(v)}</span>`; } },
            { title: "Who", dataIndex: "actorId", key: "actorId", render: function (v) { return html`<${APP.PersonTag} id=${v} />`; } },
            { title: "Action", dataIndex: "action", key: "action", render: function (v, e) { return html`<span className="nowrap">${v}${e.live ? html` <${A.Tag} color="blue" style=${{ marginLeft: 4 }}>This session<//>` : null}</span>`; } },
            { title: "Item", dataIndex: "item", key: "item", render: function (v) { return html`<span className="mono nowrap">${v}</span>`; } },
            { title: "Detail", dataIndex: "detail", key: "detail", render: function (v) { return html`<span style=${{ display: "inline-block", minWidth: 220 }}>${v}</span>`; } },
            { title: "Data class", dataIndex: "dataClass", key: "dataClass", render: function (v) { return v ? html`<${APP.DataClassTag} cls=${v} />` : html`<span style=${{ color: tok.colorTextQuaternary }}>None</span>`; } }
          ]} />
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>Logs are access controlled and keep stand-ins, not sensitive text. Each event is chained to the one before it, so gaps or edits show.</div>
      <//>
      <${APP.DetailDrawer} open=${!!sel} onClose=${function () { open[1](null); }} size=${600} title=${sel ? sel.action : ""} subtitle=${sel ? sel.id + " · " + fmt.dateTime(sel.at) : ""}
        tags=${sel ? html`<${Fragment}><${A.Tag}>${sel.category}<//>${sel.live ? html`<${A.Tag} color="blue">This session<//>` : null}<//>` : null}>
        ${sel ? html`<${A.Flex} vertical gap=${16}>
          <${APP.KeyFacts} column=${1} items=${[
            ["Event", html`<span className="mono">${sel.id}</span>`], ["When", fmt.dateTime(sel.at)],
            ["Who", html`<${APP.PersonTag} id=${sel.actorId} showRole=${true} />`], ["Action", sel.action], ["Item", html`<span className="mono">${sel.item}</span>`],
            ["Detail", sel.detail], ["Data class", sel.dataClass ? html`<${APP.DataClassTag} cls=${sel.dataClass} />` : "None"],
            ["Channel", sel.actorId === "system" ? "Scheduled job" : "Web, single sign-on"], ["Source address", sel.actorId === "system" ? "Inside the CICT VPC" : "10.20.4." + (parseInt(hashOf(sel.actorId).slice(0, 2), 16) % 200 + 20)],
            ["Integrity", html`<span className="mono" style=${{ fontSize: 12 }}>${"sha256 " + hashOf(sel.id + sel.at) + hashOf(sel.detail || "") + " · after " + (prev ? prev.id : "start of log")}</span>`]
          ]} />
          ${itemRoute(sel.item) ? html`<div><${A.Button} icon=${html`<${Icon} name="ArrowRightOutlined" />`} onClick=${function () {
            var r = itemRoute(sel.item); open[1](null);
            if (r.tab && props.onTab) props.onTab(r.tab); else APP.navigate(r.route, r.params);
          }}>${itemRoute(sel.item).label}<//></div>` : null}
          <div>
            <div style=${{ fontWeight: 600, marginBottom: 8 }}>${"Other events for " + sel.item}</div>
            ${related.length ? html`<${A.Timeline} items=${related.map(function (e) {
              var c = html`<div role="button" tabIndex=${0} style=${{ cursor: "pointer" }} onClick=${function () { open[1](e.id); }} onKeyDown=${function (ev) { if (ev.key === "Enter") open[1](e.id); }}>
                <div style=${{ fontWeight: 500 }}>${e.action}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${fmt.dateTime(e.at) + " · " + e.actorName}</div></div>`;
              return { key: e.id, color: "blue", children: c, content: c };
            })} />` : html`<div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>No other events for this item.</div>`}
          </div>
        <//>` : null}
      <//>
      <${A.Modal} open=${exp[0]} title="Export the audit log" onCancel=${function () { exp[1](false); }} okText="Export"
        onOk=${function () {
          APP.audit({ action: "Export", item: "Audit log", detail: fmtSel[0] + ", " + inPeriod.length + " events, " + period[0].toLowerCase(), dataClass: null });
          APP.toast.success("Export recorded. In the build, the " + fmtSel[0] + " file downloads with a signature you can verify.");
          exp[1](false);
        }}>
        <${A.Flex} vertical gap=${10}>
          <div>${inPeriod.length + " events in the current period (" + period[0].toLowerCase() + ")."}</div>
          <${A.Segmented} value=${fmtSel[0]} onChange=${fmtSel[1]} options=${["Excel", "PDF", "CSV"]} />
          <div style=${{ fontSize: 12, opacity: 0.7 }}>The export itself is logged.</div>
        <//>
      <//>
    </div>`;
  }

  /* ------------------------------------------------------------------
     USERS AND ROLES
     ------------------------------------------------------------------ */
  function UserDrawer(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var u = props.user;
    var newRole = APP.useState(null);
    APP.useEffect(function () { newRole[1](u ? u.role : null); }, [u && u.id]);
    if (!u) return html`<${APP.DetailDrawer} open=${false} onClose=${props.onClose} title="" />`;
    var self = u.id === pid;
    var isAdmin = pid === "admin";
    var r = roleOf(u.role);
    var p = APP.persona(u.id);
    var activity = s.audit.concat(AD.auditExtra).filter(function (e) { return e.actorId === u.id; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, 6);
    var applyRole = function () {
      var from = roleLabel(u.role), to = roleLabel(newRole[0]);
      if (newRole[0] === "admin") {
        props.setOver(u.id, { pending: "Administrator" });
        APP.audit({ action: "Permission change requested", item: "User " + u.email.split("@")[0], detail: "Role " + from + " to " + to + ". Needs a second administrator", dataClass: null });
        APP.toast.info("Administrator rights need a second administrator. Sent to L. Abeysekara.");
        return;
      }
      props.setOver(u.id, { role: newRole[0], pending: null });
      APP.audit({ action: "Permission change", item: "User " + u.email.split("@")[0], detail: "Role " + from + " to " + to, dataClass: null });
      APP.notify({ to: ["auditor"], kind: "info", title: "Permission change recorded", body: APP.personName(pid) + " changed " + u.name + " from " + from + " to " + to + ".", route: "admin", params: { tab: "audit" } });
      APP.toast.success(u.name + " is now " + to + ". The auditor has been notified.");
    };
    return html`<${APP.DetailDrawer} open=${!!u} onClose=${props.onClose} size=${600} title=${u.fullName} subtitle=${u.email}
      tags=${html`<${Fragment}><${APP.StatusTag} status=${u.status === "Deactivated" ? "Inactive" : u.status} />${self ? html`<${A.Tag} color="blue">You<//>` : null}<//>`}>
      <${A.Flex} vertical gap=${16}>
        <div style=${{ display: "flex", gap: 12, alignItems: "center" }}>
          <${A.Avatar} size=${48} style=${{ background: p ? p.color : "#8c8c8c" }}>${p ? p.initials : u.name.replace(/[^A-Z]/g, "").slice(0, 2)}<//>
          <div><div style=${{ fontWeight: 600 }}>${u.name}</div><div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>${roleLabel(u.role) + " · " + u.dept}</div></div>
        </div>
        ${u.note ? html`<${A.Alert} type="info" showIcon message=${u.note} title=${u.note} />` : null}
        ${u.pending ? html`<${A.Alert} type="warning" showIcon message=${"Change to " + u.pending + " waits for a second administrator"} title=${"Change to " + u.pending + " waits for a second administrator"} description="L. Abeysekara has been asked to approve it. Until then the current role applies." />` : null}
        <${APP.KeyFacts} column=${1} items=${[["Role", roleLabel(u.role)], ["Department", u.dept], ["Data access", r ? r.dataAccess : ""], ["Sign-in", "Single sign-on with the CICT directory, two-factor on"], ["Last sign-in", fmt.dateTime(u.lastSignIn)]]} />
        ${r ? html`<${A.Row} gutter=${[12, 12]}>
          <${A.Col} xs=${24} sm=${12}><div style=${{ fontWeight: 600, marginBottom: 4 }}>Can</div><ul style=${{ margin: 0, paddingLeft: 18, fontSize: 13 }}>${r.can.map(function (c, i) { return html`<li key=${i}>${c}</li>`; })}</ul><//>
          <${A.Col} xs=${24} sm=${12}><div style=${{ fontWeight: 600, marginBottom: 4 }}>Cannot</div><ul style=${{ margin: 0, paddingLeft: 18, fontSize: 13 }}>${r.cannot.map(function (c, i) { return html`<li key=${i}>${c}</li>`; })}</ul><//>
        <//>` : null}
        ${isAdmin ? (self ? html`<${A.Alert} type="error" showIcon message="You can't change your own roles or rights" title="You can't change your own roles or rights"
            description="Another administrator must make any change to your account. This stops anyone granting themselves extra rights."
            action=${html`<${A.Button} size="small" danger onClick=${function () {
              APP.audit({ action: "Permission change blocked", item: "User " + u.email.split("@")[0], detail: "Tried to add Data owner rights to own account", dataClass: null });
              APP.notify({ to: ["auditor"], kind: "alert", title: "Blocked self-grant attempt", body: "K. Dias tried to add Data owner rights to their own account. Blocked.", route: "admin", params: { tab: "audit" } });
              APP.toast.error("Blocked. You can't grant yourself rights. The attempt is logged and the auditor is told.");
            }}>Try to grant myself Data owner<//>`} />`
          : html`<div>
            <div style=${{ fontWeight: 600, marginBottom: 6 }}>Change role</div>
            <${A.Flex} gap=${8} wrap>
              <${A.Select} value=${newRole[0]} onChange=${newRole[1]} style=${{ width: 220 }} disabled=${u.status === "Deactivated"} aria-label="New role"
                options=${D.roles.map(function (x) { return { value: x.key, label: x.role }; })} />
              <${A.Button} type="primary" disabled=${newRole[0] === u.role || u.status === "Deactivated"} onClick=${applyRole}>Apply<//>
              ${u.status === "Deactivated" ? html`<${A.Button} onClick=${function () {
                props.setOver(u.id, { status: "Active", note: null });
                APP.audit({ action: "Permission change", item: "User " + u.email.split("@")[0], detail: "Account reactivated", dataClass: null });
                APP.toast.success(u.name + " reactivated.");
              }}>Reactivate<//>` : html`<${A.Popconfirm} title=${"Deactivate " + u.name + "?"} description="They can no longer sign in. Their records and history stay." okText="Deactivate" okButtonProps=${{ danger: true }}
                onConfirm=${function () {
                  props.setOver(u.id, { status: "Deactivated", note: "Deactivated by " + APP.personName(pid) + " on " + fmt.date(APP.nowIso()) + "." });
                  APP.audit({ action: "Permission change", item: "User " + u.email.split("@")[0], detail: "Account deactivated", dataClass: null });
                  APP.toast.success(u.name + " deactivated. Logged.");
                }}><${A.Button} danger>Deactivate<//><//>`}
            <//>
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 6 }}>Administrator rights need a second administrator to approve <${APP.SowRef} sec="3.7.1" /></div>
          </div>`) : html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Read only for your role.</div>`}
        <div>
          <div style=${{ fontWeight: 600, marginBottom: 8 }}>Recent activity</div>
          ${activity.length ? html`<${A.Timeline} items=${activity.map(function (e) {
            var c = html`<div><div style=${{ fontWeight: 500 }}>${e.action + " · " + e.item}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${fmt.dateTime(e.at)}</div></div>`;
            return { key: e.id, color: e.live ? "blue" : "gray", children: c, content: c };
          })} />` : html`<div style=${{ fontSize: 13, color: tok.colorTextSecondary }}>No recent activity in the sample log.</div>`}
        </div>
      <//>
    <//>`;
  }

  function UsersTab(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var pid = s.ui.personaId;
    var isAdmin = pid === "admin";
    var phase2On = s.ui.phaseMode === "both";
    var stp = useSharedObj("admin.users", { over: {}, perms: {} });
    var st = stp[0], set = stp[1];
    var open = APP.useState(null);
    var cell = APP.useState(null);
    var why = APP.useState("");
    APP.useEffect(function () { if (props.personaId) open[1](props.personaId); }, [props.personaId, props.at]);
    var users = AD.users.map(function (u) { return Object.assign({}, u, st.over[u.id] || {}); });
    var setOver = function (id, patch) { set(function (p) { var o = Object.assign({}, p.over); o[id] = Object.assign({}, o[id] || {}, patch); return Object.assign({}, p, { over: o }); }); };
    var sel = open[0] ? users.filter(function (u) { return u.id === open[0]; })[0] : null;
    var permVal = function (perm, role) { var k = perm.key + "|" + role; return st.perms[k] !== undefined ? st.perms[k] : perm.v[role]; };
    var counts = {};
    users.forEach(function (u) { if (u.status === "Active") counts[u.role] = (counts[u.role] || 0) + 1; });
    var perms = AD.perms;
    var matrixCols = [{ title: "Permission", dataIndex: "label", key: "label", fixed: "left", render: function (v, p) {
      return html`<span style=${{ display: "inline-flex", gap: 6, alignItems: "center", minWidth: 190 }}>${v}${p.phase === 2 ? html`<${APP.PhaseTag} phase=${2} />` : null}</span>`;
    } }].concat(AD.roleCols.map(function (rk) {
      var r = roleOf(rk);
      return { title: html`<div style=${{ lineHeight: 1.2, minWidth: 80 }}><div style=${{ fontSize: 12, fontWeight: 600 }}>${r.role}</div><div style=${{ fontSize: 11, color: tok.colorTextTertiary }}>${r.users + " users"}</div></div>`,
        key: rk, align: "center", render: function (_, p) {
          var v = permVal(p, rk), lock = p.locked && p.locked[rk];
          var inner = v === true ? html`<${Icon} name="CheckOutlined" style=${{ color: tok.colorSuccess, fontSize: 15 }} aria-label="Yes" />`
            : v ? html`<span style=${{ fontSize: 11, color: tok.colorTextSecondary, whiteSpace: "nowrap" }}>${v}</span>`
            : html`<${Icon} name="MinusOutlined" style=${{ color: tok.colorTextQuaternary }} aria-label="No" />`;
          return html`<${A.Tooltip} title=${lock ? "Fixed: " + lock : isAdmin ? "Click to change" : null}>
            <span role=${lock || !isAdmin ? undefined : "button"} tabIndex=${lock || !isAdmin ? undefined : 0}
              onClick=${function () { if (lock) { APP.toast.warn("Fixed by policy: " + lock + "."); return; } if (!isAdmin) return; cell[1]({ perm: p, role: rk, v: v }); why[1](""); }}
              onKeyDown=${function (e) { if (e.key === "Enter" && !lock && isAdmin) { cell[1]({ perm: p, role: rk, v: v }); why[1](""); } }}
              style=${{ display: "inline-flex", gap: 4, alignItems: "center", cursor: lock || !isAdmin ? "default" : "pointer", padding: "2px 4px" }}>
              ${inner}${lock ? html`<${Icon} name="LockOutlined" style=${{ fontSize: 10, color: tok.colorTextQuaternary }} />` : null}
            </span>
          <//>`;
        } };
    }));
    var c = cell[0];
    return html`<div>
      <${ReadOnlyNote} />
      <${A.Row} gutter=${[16, 16]} style=${{ marginBottom: 16 }}>
        <${A.Col} xs=${24} md=${8}>
          <${A.Card} size="small" style=${{ height: "100%" }}><${A.Flex} gap=${10} align="flex-start">
            <${Icon} name="CheckCircleFilled" style=${{ color: tok.colorSuccess, fontSize: 20, marginTop: 2 }} />
            <div><div style=${{ fontWeight: 600 }}>No default test accounts</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>test.admin removed on 2 Nov 2026. Checked every night.</div></div>
          <//><//>
        <//>
        <${A.Col} xs=${24} md=${8}>
          <${A.Card} size="small" style=${{ height: "100%" }}><${A.Flex} gap=${10} align="flex-start">
            <${Icon} name="SafetyOutlined" style=${{ color: tok.colorPrimary, fontSize: 20, marginTop: 2 }} />
            <div><div style=${{ fontWeight: 600 }}>No self-granting</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Nobody can change their own rights. Administrator rights need a second administrator.</div></div>
          <//><//>
        <//>
        <${A.Col} xs=${24} md=${8}>
          <${A.Card} size="small" style=${{ height: "100%" }}><${A.Flex} gap=${10} align="flex-start">
            <${Icon} name="AuditOutlined" style=${{ color: tok.colorWarning, fontSize: 20, marginTop: 2 }} />
            <div style=${{ flex: 1 }}><div style=${{ fontWeight: 600 }}>Access review due 1 Jan 2027</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>Last review 1 Oct 2026. 3 changes made.</div>
              <a style=${{ fontSize: 12 }} onClick=${function () { APP.toast.build("In the build, each manager confirms their team's access and the result is kept for the auditor."); }}>Start an access review</a></div>
          <//><//>
        <//>
      <//>
      <${A.Card} size="small" title="Users" style=${{ marginBottom: 16 }} extra=${html`<${A.Button} size="small" icon=${html`<${Icon} name="UserAddOutlined" />`} disabled=${!isAdmin}
        onClick=${function () { APP.toast.build("In the build, users come from the CICT directory through single sign-on. You pick a person and give them a role."); }}>Add user<//>`}>
        <${APP.DataTable} data=${users} pageSize=${10} searchPlaceholder="Search name, email or department"
          searchKeys=${["name", "fullName", "email", "dept", function (u) { return roleLabel(u.role); }]}
          filters=${[{ key: "role", label: "Role", options: D.roles.map(function (r) { return { value: r.key, label: r.role }; }), width: 170 }, { key: "dept", label: "Department" }, { key: "status", label: "Status" }]}
          onRowClick=${function (u) { open[1](u.id); }}
          columns=${[
            { title: "Name", dataIndex: "fullName", key: "fullName", render: function (v, u) {
              var p = APP.persona(u.id);
              return html`<span style=${{ display: "inline-flex", gap: 8, alignItems: "center", minWidth: 200 }}>
                <${A.Avatar} size=${28} style=${{ background: p ? p.color : "#8c8c8c", fontSize: 11, flex: "none" }}>${p ? p.initials : u.name.replace(/[^A-Z]/g, "").slice(0, 2)}<//>
                <span><div>${v}${u.id === pid ? html` <${A.Tag} color="blue" style=${{ marginLeft: 4 }}>You<//>` : null}</div><div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${u.email}</div></span></span>`;
            } },
            { title: "Role", dataIndex: "role", key: "role", render: function (v, u) { return html`<span className="nowrap">${roleLabel(v)}${u.pending ? html` <${A.Tag} color="warning">Change pending<//>` : null}</span>`; } },
            APP.col.text("Department", "dept"),
            { title: "Data access", key: "access", render: function (_, u) { var r = roleOf(u.role); return html`<span className="nowrap">${r ? r.dataAccess : ""}</span>`; } },
            { title: "Status", dataIndex: "status", key: "status", render: function (v) { return html`<${APP.StatusTag} status=${v === "Deactivated" ? "Inactive" : v}>${v}<//>`; } },
            { title: "Last sign-in", dataIndex: "lastSignIn", key: "lastSignIn", render: function (v) { return html`<span className="nowrap">${fmt.relative(v)}</span>`; } }
          ]} />
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>${"A sample of " + users.length + " users. Role totals in the matrix below cover all users."}</div>
      <//>
      <${A.Card} size="small" title="Roles and permissions" extra=${html`<${APP.SowRef} sec="3.7.1 3.6.3" />`}>
        <div className="table-scroll"><${A.Table} size="small" pagination=${false} rowKey="key" columns=${matrixCols} dataSource=${perms} scroll=${{ x: "max-content" }} /></div>
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}><${Icon} name="LockOutlined" /> Fixed by policy. ${isAdmin ? "Click any other cell to change it. Changes are logged and the auditor is told." : ""}${!phase2On ? " Phase 2 permissions apply when those modules arrive." : ""}</div>
      <//>
      <${UserDrawer} user=${sel} setOver=${setOver} onClose=${function () { open[1](null); }} />
      <${A.Modal} open=${!!c} title=${c ? "Change permission: " + c.perm.label : ""} onCancel=${function () { cell[1](null); }}
        okText=${c && c.v ? "Remove" : "Grant"} okButtonProps=${{ danger: !!(c && c.v), disabled: !why[0].trim() }}
        onOk=${function () {
          var nv = c.v ? false : true;
          set(function (p) { var pm = Object.assign({}, p.perms); pm[c.perm.key + "|" + c.role] = nv; return Object.assign({}, p, { perms: pm }); });
          APP.audit({ action: "Permission change", item: "Role: " + roleLabel(c.role), detail: (nv ? "Added: " : "Removed: ") + c.perm.label.toLowerCase() + ". " + why[0], dataClass: null });
          APP.notify({ to: ["auditor"], kind: "info", title: "Permission change recorded", body: APP.personName(pid) + (nv ? " added " : " removed ") + c.perm.label.toLowerCase() + (nv ? " to " : " from ") + roleLabel(c.role) + ".", route: "admin", params: { tab: "audit" } });
          APP.toast.success("Permission changed for " + roleLabel(c.role) + ". The auditor has been notified.");
          cell[1](null);
        }}>
        ${c ? html`<${A.Flex} vertical gap=${10}>
          <div>${(c.v ? "Remove \"" : "Grant \"") + c.perm.label + "\" " + (c.v ? "from " : "to ") + roleLabel(c.role) + " (" + roleOf(c.role).users + " users)."}</div>
          <${A.Input.TextArea} rows=${3} value=${why[0]} onChange=${function (e) { why[1](e.target.value); }} placeholder="Reason (required, kept in the audit log)" />
        <//>` : null}
      <//>
    </div>`;
  }

  /* ------------------------------------------------------------------
     ADMINISTRATION screen
     ------------------------------------------------------------------ */
  var TABS = ["models", "masking", "health", "audit", "users"];
  function AdminScreen(props) {
    var s = APP.useStore();
    var route = APP.useRoute();
    var pid = s.ui.personaId;
    var tab = APP.useState(props.params && TABS.indexOf(props.params.tab) >= 0 ? props.params.tab : pid === "auditor" ? "audit" : "models");
    APP.useEffect(function () {
      var p = props.params || {};
      if (p.tab && TABS.indexOf(p.tab) >= 0) tab[1](p.tab);
      else if (p.personaId) tab[1]("users");
    }, [props.params && props.params.tab, props.params && props.params.personaId, route.at]);
    var openIncidents = AD.incidents.filter(function (i) { var o = (s.ext["admin.health"] || { inc: {} }).inc[i.id]; return (o ? o.status : i.status) === "Open"; }).length;
    return html`<div>
      <${APP.PageHeader} title="Administration" phase=${1} sow=${["2.4", "2.6", "3.7.1", "3.7.4"]}
        subtitle=${pid === "auditor" ? "Read-only view for Internal Audit: the audit log, settings and their history." : "Models and routing, masking rules, service health, the audit log, users and roles. Administrators manage configuration and never read business content."}
        tags=${pid === "auditor" ? html`<${A.Tag} icon=${html`<${Icon} name="EyeOutlined" />`}>Read only<//>` : null}
        actions=${html`<${A.Button} icon=${html`<${Icon} name="ApiOutlined" />`} onClick=${function () { APP.toast.build("In the build, the API documentation for linking office systems, ERP and LAMS is published here."); }}>API documentation<//>`} />
      <${A.Tabs} activeKey=${tab[0]} onChange=${tab[1]} items=${[
        { key: "models", label: html`<span><${Icon} name="ClusterOutlined" /> Models and routing</span>`, children: html`<${ModelsTab} />` },
        { key: "masking", label: html`<span><${Icon} name="EyeInvisibleOutlined" /> Masking rules</span>`, children: html`<${MaskingTab} />` },
        { key: "health", label: html`<span><${Icon} name="DashboardOutlined" /> Health ${openIncidents ? html`<${A.Badge} count=${openIncidents} size="small" style=${{ marginLeft: 4 }} />` : null}</span>`, children: html`<${HealthTab} />` },
        { key: "audit", label: html`<span><${Icon} name="FileSearchOutlined" /> Audit log</span>`, children: html`<${AuditTab} onTab=${tab[1]} />` },
        { key: "users", label: html`<span><${Icon} name="TeamOutlined" /> Users and roles</span>`, children: html`<${UsersTab} personaId=${props.params && props.params.personaId} at=${route.at} />` }
      ]} />
    </div>`;
  }

  APP.registerScreen("admin", {
    title: "Administration", group: "platform", phase: 1, icon: "SettingOutlined", sow: ["2.4", "2.6", "3.7.1", "3.7.4"],
    summary: "Models and routing, masking rules, service health, audit log, users and roles.",
    roles: ["admin", "auditor"],
    render: AdminScreen
  });

  APP.registerSearch({ group: "Administration", items: function () {
    return AD.maskRules.map(function (r) { return { id: r.id, title: "Masking rule " + r.id + ": " + r.type, subtitle: r.detector, route: "admin", params: { tab: "masking" }, icon: "EyeInvisibleOutlined" }; })
      .concat(AD.services.map(function (x) { return { id: "svc-" + x.id, title: "Service health: " + x.name, subtitle: x.metricLabel + ", " + x.metric, route: "admin", params: { tab: "health" }, icon: "DashboardOutlined", phase: x.phase }; }));
  } });
})();
