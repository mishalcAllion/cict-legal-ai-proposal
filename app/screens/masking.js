/* Screen area: Masking review (route masking, phase 1).
   Reached from the assistant (params: conversationId, contractId or docId) and from Approvals (params: releaseId).
   Shows what the detector found, lets the requester choose a method per item, run the manual check the scan could not do,
   preview the exact outbound payload and request release from the data owner. See CONVENTIONS.md. */
(function () {
  "use strict";
  var APP = window.APP, html = APP.html, A = APP.A, D = APP.D, fmt = APP.fmt, Icon = APP.Icon;
  var useState = APP.useState, useEffect = APP.useEffect, Fragment = APP.Fragment;
  var AREA = D.approvalsArea || { maskingWhere: {} };
  var DOC = "CON-2024-051";
  var RULES = "v1.4";
  var CAN_REQUEST = ["legal", "owner", "reviewer", "compliance", "cosec"];
  var CLASS_RANK = { Public: 0, Internal: 1, Sensitive: 2, Confidential: 3 };
  var ENTITY_TYPES = ["Company name", "Personal name", "Job title", "Contact details", "Contract number", "Transaction price", "Bank account", "Identity number", "Other"];
  var TYPE_ICON = { "Company name": "BankOutlined", "Personal name": "UserOutlined", "Job title": "IdcardOutlined", "Contact details": "PhoneOutlined",
    "Contract number": "NumberOutlined", "Transaction price": "DollarOutlined", "Bank account": "CreditCardOutlined", "Identity number": "SafetyOutlined" };

  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function modelById(id) { for (var i = 0; i < D.models.length; i++) if (D.models[i].id === id) return D.models[i]; return null; }
  function docText(docId) {
    var doc = APP.getDocument(docId);
    if (!doc) return "";
    return doc.pages.map(function (p) { return p.clauses.map(function (c) { return c.text; }).join("\n"); }).join("\n");
  }
  function countIn(text, needle) { if (!needle) return 0; return text.split(needle).length - 1; }
  function methodFromReplacement(e, replacement) {
    if (!replacement) return e.method || "placeholder";
    if (replacement === "[removed]") return "delete";
    if (replacement === "████") return "mask";
    if (e.range && replacement === e.range) return "range";
    if (replacement === e.text) return "keep";
    return "placeholder";
  }
  function defaultMethods(ents) { var m = {}; ents.forEach(function (e) { m[e.id] = e.method || "placeholder"; }); return m; }
  function originalPassages(req) {
    var ents = (req.entities || []).filter(function (e) { return e.replacement && e.original && e.replacement !== "[removed]" && e.replacement !== "████"; })
      .slice().sort(function (a, b) { return b.replacement.length - a.replacement.length; });
    return ((req.payload && req.payload.passages) || []).map(function (p) {
      var t = p.text || "";
      ents.forEach(function (e) { t = t.split(e.replacement).join(e.original); });
      return t;
    });
  }
  function destinationOptions(cls) {
    var bedrockOk = cls !== "Confidential";
    var needsRelease = cls === "Sensitive";
    var bedrockNote = !bedrockOk ? "Not allowed for Confidential material, even masked" : needsRelease ? "Masked text only, after the data owner releases it" : "No release needed for " + cls + " material";
    return [
      { id: "m-claude-br", label: "Claude on Bedrock", note: bedrockNote, disabled: !bedrockOk, release: bedrockOk && needsRelease, host: "Bedrock" },
      { id: "m-qwen-br", label: "Qwen on Bedrock", note: bedrockNote, disabled: !bedrockOk, release: bedrockOk && needsRelease, host: "Bedrock" },
      { id: "m-qwen-sh", label: "Qwen (self-hosted)", note: "Unmasked, inside the CICT VPC. No release needed", disabled: false, release: false, host: "Self-hosted" },
      { id: "m-deepseek-sh", label: "DeepSeek (self-hosted)", note: "Standby. Used only if Qwen (self-hosted) is down", disabled: true, release: false, host: "Self-hosted" }
    ];
  }
  function Card(props) {
    return html`<${A.Card} size="small" title=${props.title} extra=${props.extra} style=${Object.assign({ marginBottom: 16 }, props.style || {})}>${props.children}<//>`;
  }

  /* ---------- manual check of the unreadable image ---------- */
  function ManualCheckModal(props) {
    var tok = A.theme.useToken().token;
    var choice = useState("clear");
    useEffect(function () { if (props.open) choice[1](props.value || "clear"); }, [props.open]);
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title="Check by hand: image on page 7" okText="Record the check" destroyOnHidden=${true}
      onOk=${function () { props.onDone(choice[0]); }}>
      <${A.Flex} vertical gap=${12}>
        <div style=${{ fontSize: 13 }}>The detector could not read this image, so it was flagged rather than skipped <${APP.SowRef} sec="1.4.3" />. Look at it and record what you found.</div>
        <div style=${{ border: "1px solid " + tok.colorBorderSecondary, borderRadius: 8, padding: 16, background: tok.colorFillQuaternary }}>
          <div style=${{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: tok.colorTextTertiary, marginBottom: 8 }}>Page 7, embedded image (sample rendering)</div>
          <div style=${{ margin: "0 auto", maxWidth: 300, border: "3px double " + tok.colorBorder, borderRadius: 6, padding: "12px 16px", textAlign: "center", fontFamily: "ui-monospace, Consolas, monospace", fontSize: 13, lineHeight: 1.7, background: tok.colorBgContainer }}>
            <div style=${{ fontWeight: 700, letterSpacing: 1 }}>SHIP-TO-SHORE CRANE</div>
            <div>Model STS-65</div><div>Safe working load 65 t</div><div>Serial 22-0187 · Built 2019</div>
          </div>
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8, textAlign: "center" }}>In the build, the original image opens here at full size, inside the CICT VPC.</div>
        </div>
        <${A.Radio.Group} value=${choice[0]} onChange=${function (e) { choice[1](e.target.value); }}>
          <${A.Flex} vertical gap=${6}>
            <${A.Radio} value="clear">No sensitive data: crane model plate only<//>
            <${A.Radio} value="exclude">Leave the image out of what is sent<//>
          <//>
        <//>
      <//>
    <//>`;
  }

  /* ---------- add an item the detector missed ---------- */
  function AddItemModal(props) {
    var tok = A.theme.useToken().token;
    var type = useState("Job title"), text = useState(""), err = useState("");
    useEffect(function () { if (props.open) { type[1]("Job title"); text[1](""); err[1](""); } }, [props.open]);
    return html`<${A.Modal} open=${props.open} onCancel=${props.onClose} title="Add an item the detector missed" okText="Add and mask" destroyOnHidden=${true}
      okButtonProps=${{ disabled: !text[0].trim() }}
      onOk=${function () {
        var t = text[0].trim();
        var n = countIn(props.text, t);
        if (!n) { err[1]("\"" + t + "\" is not in this document. Copy the exact words from the original text."); return; }
        if (props.existing.some(function (e) { return e.text === t; })) { err[1]("This item is already on the list."); return; }
        props.onAdd({ type: type[0], text: t, count: n });
      }}>
      <${A.Flex} vertical gap=${12}>
        <div style=${{ fontSize: 13 }}>Manual corrections are allowed and recorded <${APP.SowRef} sec="1.4.2" />. The new item gets its own stand-in, used every time it appears.</div>
        <div><div style=${{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Type</div>
          <${A.Select} value=${type[0]} onChange=${type[1]} style=${{ width: "100%" }} options=${ENTITY_TYPES.map(function (t) { return { value: t, label: t }; })} /></div>
        <div><div style=${{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Exact text</div>
          <${A.Input} value=${text[0]} onChange=${function (e) { text[1](e.target.value); err[1](""); }} placeholder="For example: Contracts Manager" status=${err[0] ? "error" : undefined} />
          ${err[0] ? html`<div style=${{ color: tok.colorError, fontSize: 12, marginTop: 4 }}>${err[0]}</div>` : null}
        </div>
      <//>
    <//>`;
  }

  /* ---------- masking log (who masked what, with which rules, sent where) ---------- */
  function MaskingLog() {
    var audit = APP.useStore(function (s) { return s.audit; });
    var rows = audit.filter(function (a) { return a.action === "Masking" || a.action === "Manual check"; }).slice(0, 5);
    return html`<div>
      ${rows.length ? html`<${A.Flex} vertical gap=${8}>${rows.map(function (a) {
        return html`<div key=${a.id} style=${{ fontSize: 13 }}>
          <div style=${{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><${APP.PersonTag} id=${a.actorId} size=${18} /><span style=${{ opacity: 0.6, fontSize: 12 }}>${fmt.relative(a.at)}</span><${A.Tag} style=${{ marginInlineEnd: 0 }}>${a.action}<//></div>
          <div style=${{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>${a.item + ": " + a.detail}</div>
        </div>`;
      })}<//>` : html`<${APP.EmptyHint} title="No masking runs yet" />`}
      <${A.Button} size="small" type="link" style=${{ paddingInline: 0, marginTop: 8 }} onClick=${function () { APP.navigate("admin", { tab: "audit" }); }}>Open the full audit log<//>
    </div>`;
  }

  /* ---------- view of a release that is not the sample contract ---------- */
  function ReleaseMaskingView(props) {
    var tok = A.theme.useToken().token;
    var rel = props.release;
    var pid = APP.useStore(function (s) { return s.ui.personaId; });
    var payload = useState(false);
    var canSee = pid === rel.ownerId || pid === rel.requesterId;
    var originals = originalPassages(rel);
    var ents = (rel.entities || []).map(function (e, i) {
      var r = e.replacement || "";
      var method = r === "[removed]" ? "delete" : r === "████" ? "mask" : /^\[.*\]$/.test(r) ? "placeholder" : "range";
      return { id: "r" + i, type: e.type, text: e.original, placeholder: r, range: method === "range" ? r : undefined, method: method, count: e.count };
    });
    var scan = rel.scan || [{ where: "Question and passages", status: "Done", detail: "Checked before the request was made" }];
    return html`<div>
      <${APP.PageHeader} title="Masking review" phase=${1} sow=${["1.4"]}
        crumbs=${[{ label: "Approvals", route: "approvals", params: {} }, { label: rel.id, route: "approvals", params: { id: rel.id } }, { label: "Masking review" }]}
        subtitle=${rel.title + ". Read only: this is the masking behind release request " + rel.id + "."}
        tags=${html`<${APP.DataClassTag} cls=${rel.dataClass} />`}
        actions=${html`<${Fragment}>
          <${A.Button} icon=${html`<${Icon} name="EyeOutlined" />`} onClick=${function () { payload[1](true); }}>Outbound payload<//>
          <${A.Button} type="primary" onClick=${function () { APP.navigate("approvals", { id: rel.id }); }}>${"Back to " + rel.id}<//>
        <//>`} />
      <${A.Row} gutter=${[16, 0]}>
        <${A.Col} xs=${24} xl=${16}>
          <${Card} title="Original and masked text">
            ${canSee ? html`<${APP.MaskingCompare} text=${originals.join("\n")} entities=${ents} readOnly=${true} height=${320} />`
              : html`<${A.Alert} type="warning" showIcon message="Original text is hidden for your role" title="Original text is hidden for your role" description="Only the requester and the data owner can compare original and masked text." />`}
          <//>
        <//>
        <${A.Col} xs=${24} xl=${8}>
          <${Card} title=${html`<span>Where it looked <${APP.SowRef} sec="1.4.3" /></span>`}>
            <${A.Flex} vertical gap=${8}>${scan.map(function (l, i) {
              return html`<div key=${i}><div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style=${{ fontWeight: 500, flex: 1 }}>${l.where}</span><${APP.StatusTag} status=${l.status} /></div>
                <div style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${l.detail}</div></div>`;
            })}<//>
          <//>
          <${Card} title=${html`<span>Masking log <${APP.SowRef} sec="1.4.8" /></span>`}><${MaskingLog} /><//>
        <//>
      <//>
      <${A.Modal} open=${payload[0]} onCancel=${function () { payload[1](false); }} title=${"Outbound payload for " + rel.id} width=${760} footer=${html`<${A.Button} onClick=${function () { payload[1](false); }}>Close<//>`}>
        <${APP.PayloadPreview} request=${rel} />
      <//>
    </div>`;
  }

  /* ---------- the masking review for the sample contract ---------- */
  function MaskingScreen(props) {
    var tok = A.theme.useToken().token;
    var s = APP.useStore();
    var vp = APP.useViewport();
    var pid = s.ui.personaId;
    var me = APP.persona(pid);
    var params = props.params || {};
    var viewRel = params.releaseId ? findById(s.releaseRequests, params.releaseId) : null;
    var convId = params.conversationId || (viewRel && viewRel.source && viewRel.source.params && viewRel.source.params.conversationId) || APP.flows.CONTRACT_REVIEW_CONVERSATION;
    var baseEnts = D.maskingEntities[DOC] || [];
    var sessPair = APP.useShared("masking.sessions", {});
    var sess = Object.assign({ methods: defaultMethods(baseEnts), cls: "Sensitive", clsConfirmed: true, manual: null, modelId: "m-claude-br", extra: [], view: "side" }, (sessPair[0] || {})[convId] || {});
    var setSess = function (patch) {
      sessPair[1](function (prev) { var n = Object.assign({}, prev || {}); n[convId] = Object.assign({}, sess, (prev || {})[convId] || {}, patch); return n; });
    };
    var checkOpen = useState(false), addOpen = useState(false), previewOpen = useState(false), entFocus = useState(null);
    var showEntity = function (e) {
      var doc = APP.getDocument(DOC), hit = null;
      (doc ? doc.pages : []).forEach(function (pg) { (pg.clauses || []).forEach(function (c) { if (!hit && e.text && String(c.text || "").indexOf(e.text) >= 0) hit = { clause: c.id, heading: c.heading, page: pg.n }; }); });
      if (!hit) { APP.toast.info(e.type + " appears in parts of the file not shown in this sample, such as headers and the signature block."); return; }
      entFocus[1]({ clause: hit.clause, at: Date.now() });
      setSess({ view: "masked" });
      APP.toast.info("First place found: " + (hit.heading || "clause " + hit.clause) + ", page " + hit.page + ". Shown masked below.");
    };

    if (viewRel && viewRel.ref !== DOC) return html`<${ReleaseMaskingView} release=${viewRel} />`;
    if (params.releaseId && !viewRel) {
      return html`<div><${APP.PageHeader} title="Masking review" phase=${1} sow=${["1.4"]} />
        <${A.Card}><${A.Result} status="404" title=${"Release request " + params.releaseId + " was not found"} subTitle="It may have been cleared when the sample data was reset."
          extra=${html`<${A.Button} type="primary" onClick=${function () { APP.navigate("approvals", {}); }}>Go to Approvals<//>`} /><//></div>`;
    }

    var existing = viewRel || s.releaseRequests.filter(function (r) {
      return r.live && r.ref === DOC && r.source && r.source.params && r.source.params.conversationId === convId;
    })[0] || null;
    var lockedRel = existing && existing.status !== "Rejected" && existing.status !== "Withdrawn" ? existing : null;
    var rejectedRel = existing && !lockedRel ? existing : null;
    var readOnlyRole = CAN_REQUEST.indexOf(pid) < 0;
    var canSeeOriginal = !readOnlyRole;
    var editable = !lockedRel && !readOnlyRole;

    var extras = sess.extra || [];
    var ents = baseEnts.concat(extras);
    var methods = Object.assign({}, defaultMethods(ents), sess.methods);
    if (lockedRel) {
      ents.forEach(function (e) {
        var hit = (lockedRel.entities || []).filter(function (x) { return x.original === e.text; })[0];
        if (hit) methods[e.id] = methodFromReplacement(e, hit.replacement);
      });
    }
    var places = ents.reduce(function (n, e) { return n + (e.count || 0); }, 0);
    var manual = lockedRel ? ((lockedRel.unscanned || [])[0] ? (/excluded/i.test(lockedRel.unscanned[0].resolution) ? "exclude" : "clear") : "clear") : sess.manual;
    var effCls = sess.cls === "Confidential" ? "Confidential" : (sess.clsConfirmed ? sess.cls : "Sensitive");
    if (CLASS_RANK[sess.cls] < CLASS_RANK.Sensitive && !sess.clsConfirmed) effCls = "Sensitive";
    var dests = destinationOptions(effCls);
    var dest = dests.filter(function (d) { return d.id === sess.modelId && !d.disabled; })[0] || dests.filter(function (d) { return !d.disabled; })[0];
    var model = modelById(dest.id);
    var fullText = docText(DOC);

    var locations = APP.MASKING_LOCATIONS.map(function (l) {
      if (l.status !== "Manual check") return l;
      if (manual === "clear") return { where: l.where, status: "Done", detail: "Checked by hand by " + (lockedRel ? APP.personName(lockedRel.requesterId) : me.name) + ": crane model plate only, no sensitive data", manual: true };
      if (manual === "exclude") return { where: l.where, status: "Done", detail: "Left out of what is sent, by " + (lockedRel ? APP.personName(lockedRel.requesterId) : me.name), manual: true };
      return Object.assign({ manual: true }, l);
    });
    var doneCount = locations.filter(function (l) { return l.status === "Done"; }).length;

    var buildInput = function () {
      var input = APP.flows.contractReviewRelease({ conversationId: convId, methods: methods });
      var extraMethods = {};
      extras.forEach(function (e) { extraMethods[e.id] = methods[e.id]; });
      if (extras.length) {
        input.payload.passages = input.payload.passages.map(function (p) { return { source: p.source, text: APP.maskText(p.text, extras, extraMethods) }; });
        input.entities = input.entities.concat(extras.map(function (e) { return { type: e.type, original: e.text, replacement: APP.maskValue(e, methods[e.id]), count: e.count }; }));
      }
      if (dest.id !== "m-claude-br") { input.modelId = dest.id; input.destination = model.name + " (PrivateLink, ap-south-1)"; }
      input.unscanned = [{ where: "Image, page 7", resolution: manual === "exclude" ? "Left out of the payload by " + me.name : "Checked by hand by " + me.name + ": crane model plate only, no sensitive data" }];
      input.rulesVersion = RULES;
      input.payload.attachments = [{ name: "Crane maintenance agreement (masked).docx", note: "14 pages, " + ents.length + " sensitive items masked in " + places + " places" + (manual === "exclude" ? ", page 7 image left out" : "") }];
      input.requesterId = pid;
      return input;
    };
    var requestRelease = function () {
      var input = buildInput();
      APP.audit({ action: "Masking", item: DOC, detail: "Rules " + RULES + ", " + ents.length + " types in " + places + " places, 1 manual check, destination " + model.name, dataClass: "Sensitive" });
      var rel = APP.createReleaseRequest(input);
      previewOpen[1](false);
      APP.toast.success("Release request " + rel.id + " sent to " + APP.personName(rel.ownerId) + ". Nothing has been sent to the model yet.");
    };
    var runSelfHosted = function () {
      APP.audit({ action: "Model call", item: DOC, detail: model.name + ", unmasked, inside the CICT VPC", dataClass: effCls });
      APP.toast.build("In the build, the review runs unmasked on " + model.name + " inside the CICT VPC and the answer appears in the conversation. No release is needed.");
    };

    /* steps */
    var stepCurrent = lockedRel ? 4 : manual ? 4 : 3;
    var steps = [
      { title: "Classify", description: effCls + (sess.clsConfirmed ? ", confirmed" : ", change waiting") },
      { title: "Detect", description: ents.length + " items, " + places + " places" },
      { title: "Choose methods", description: "Rules " + RULES },
      { title: "Check by hand", description: manual ? "1 of 1 done" : "1 item to check" },
      { title: dest.release ? "Request release" : "Run", description: lockedRel ? lockedRel.id + ", " + lockedRel.status.toLowerCase() : dest.release ? "Data owner decides" : "No release needed" }
    ];

    var entColumns = [
      { title: "Type", dataIndex: "type", key: "type", render: function (v) { return html`<span className="nowrap"><${Icon} name=${TYPE_ICON[v] || "TagOutlined"} style=${{ marginRight: 6, opacity: 0.7 }} />${v}</span>`; } },
      { title: "Found, and where", dataIndex: "text", key: "text", render: function (v, e) {
        return html`<div style=${{ minWidth: 170, maxWidth: 260 }}>
          ${canSeeOriginal ? html`<mark className="ent">${v}</mark>` : html`<span style=${{ opacity: 0.6 }}>Hidden for your role</span>`}
          ${e.manual ? html`<${A.Tag} color="purple" style=${{ marginLeft: 6, marginInlineEnd: 0 }}>Added by hand<//>` : null}
          <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 2 }}>${AREA.maskingWhere[e.id] || "Body text (" + e.count + ")"}</div>
        </div>`;
      } },
      { title: "Method", key: "method", render: function (_, e) {
        var opts = APP.MASK_METHODS.filter(function (m) { return m.value !== "keep" && (m.value !== "range" || e.range); });
        return html`<${A.Select} size="small" value=${methods[e.id]} style=${{ width: 120 }} disabled=${!editable} options=${opts} aria-label=${"Method for " + e.type + " " + (canSeeOriginal ? e.text : "")}
          onChange=${function (v) { var m = Object.assign({}, sess.methods); m[e.id] = v; setSess({ methods: m }); }} />`;
      } },
      { title: "Sent as", key: "out", render: function (_, e) {
        var out = APP.maskValue(e, methods[e.id]);
        return html`<${A.Tooltip} title=${methods[e.id] === "placeholder" ? "The same stand-in is used every time this item appears, in every document in this task" : null}>
          <span className="mono nowrap">${out}</span><//>`;
      } }
    ];
    if (editable) entColumns.push({ title: "", key: "x", render: function (_, e) {
      return e.manual ? html`<${A.Button} size="small" type="text" aria-label=${"Remove " + e.text} icon=${html`<${Icon} name="DeleteOutlined" />`}
        onClick=${function () { setSess({ extra: extras.filter(function (x) { return x.id !== e.id; }) }); APP.toast.info("Item removed. It will be sent as written."); }} />` : null;
    } });

    var entityTools = html`<${A.Flex} gap=${4} wrap="wrap">
      <${A.Button} size="small" icon=${html`<${Icon} name="PlusOutlined" />`} onClick=${function () { addOpen[1](true); }}>Add a missed item<//>
      <${A.Button} size="small" onClick=${function () { setSess({ methods: defaultMethods(ents) }); APP.toast.info("Methods reset to rules " + RULES + " defaults."); }}>Reset to defaults<//>
    <//>`;
    var actionButton;
    if (lockedRel) actionButton = null;
    else if (readOnlyRole) actionButton = html`<${A.Alert} type="info" showIcon message="Your role can't request a release" title="Your role can't request a release" description="Legal, data owner, reviewer, compliance and Company Secretary roles can. You can read the masking log." />`;
    else if (dest.release) {
      var why = !manual ? "Check the image on page 7 by hand first" : null;
      actionButton = html`<${A.Tooltip} title=${why}><${A.Button} type="primary" block icon=${html`<${Icon} name="SafetyCertificateOutlined" />`} disabled=${!!why} onClick=${function () { previewOpen[1](true); }}>Preview and request release<//><//>`;
    } else if (dest.host === "Self-hosted") {
      actionButton = html`<${A.Button} type="primary" block icon=${html`<${Icon} name="CloudServerOutlined" />`} onClick=${runSelfHosted}>${"Run on " + model.name}<//>`;
    } else {
      actionButton = html`<${A.Button} type="primary" block onClick=${function () { APP.toast.build("In the build, " + effCls + " material goes to " + model.name + " with the default masking rules. No release is needed."); }}>${"Send to " + model.name}<//>`;
    }

    var crumbs = viewRel ? [{ label: "Approvals", route: "approvals", params: {} }, { label: viewRel.id, route: "approvals", params: { id: viewRel.id } }, { label: "Masking review" }]
      : [{ label: "Assistant", route: "assistant", params: { conversationId: convId } }, { label: "Masking review" }];

    return html`<div>
      <${APP.PageHeader} title="Masking review" phase=${1} sow=${["1.4", "1.3"]} crumbs=${crumbs}
        subtitle=${html`<span>Crane maintenance agreement <span className="mono">${DOC}</span>${convId ? html`<span>, conversation <span className="mono">${convId}</span></span>` : null}. Nothing leaves the CICT VPC until the data owner releases it.</span>`}
        tags=${html`<${APP.DataClassTag} cls=${effCls} />`}
        actions=${html`<${Fragment}>
          ${viewRel ? html`<${A.Button} onClick=${function () { APP.navigate("approvals", { id: viewRel.id }); }}>${"Back to " + viewRel.id}<//>`
            : html`<${A.Button} icon=${html`<${Icon} name="MessageOutlined" />`} onClick=${function () { APP.navigate("assistant", { conversationId: convId }); }}>Back to the conversation<//>`}
        <//>`} />

      ${readOnlyRole ? html`<${A.Alert} type="warning" showIcon style=${{ marginBottom: 16 }}
        message=${"You are " + me.name + ", " + me.role + ". Original text is hidden for your role."} title=${"You are " + me.name + ", " + me.role + ". Original text is hidden for your role."}
        description="Originals, masked versions and the stand-in key are stored separately, each with its own permissions." />` : null}

      ${lockedRel ? html`<div style=${{ marginBottom: 16 }}>
        <${APP.ApprovalCard} requestId=${lockedRel.id} extraActions=${html`<${Fragment}>
          <${A.Button} size="small" onClick=${function () { APP.navigate("approvals", { id: lockedRel.id }); }}>Open in Approvals<//>
          ${!viewRel ? html`<${A.Button} size="small" onClick=${function () { APP.navigate("assistant", { conversationId: convId }); }}>Back to the conversation<//>` : null}
        <//>`} />
        <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 6 }}>Methods are locked while the request is open. They show what was sent for decision.</div>
      </div>` : null}
      ${rejectedRel ? html`<${A.Alert} type="error" showIcon style=${{ marginBottom: 16 }}
        message=${APP.personName(rejectedRel.decidedBy) + (rejectedRel.status === "Withdrawn" ? " withdrew " : " rejected ") + rejectedRel.id}
        title=${APP.personName(rejectedRel.decidedBy) + (rejectedRel.status === "Withdrawn" ? " withdrew " : " rejected ") + rejectedRel.id}
        description=${(rejectedRel.comment ? "\"" + rejectedRel.comment + "\" " : "") + "Change the methods and request again, or run it on the self-hosted model."} />` : null}

      <${A.Card} size="small" style=${{ marginBottom: 16 }}>
        <${A.Steps} size="small" current=${stepCurrent} status=${lockedRel && lockedRel.status === "Approved" ? "finish" : "process"} items=${steps}
          orientation=${vp.width < 760 ? "vertical" : "horizontal"} />
      <//>

      <${A.Row} gutter=${[16, 0]}>
        <${A.Col} xs=${24} xl=${16}>
          <${Card} title=${html`<span>Sensitive items found <${APP.SowRef} sec="1.4.1 1.4.2" /></span>`}
            extra=${editable && !vp.isPhone ? entityTools : null}>
            ${editable && vp.isPhone ? html`<div style=${{ marginBottom: 10 }}>${entityTools}</div>` : null}
            <div className="table-scroll"><${A.Table} size="small" rowKey="id" pagination=${false} dataSource=${ents} columns=${entColumns} scroll=${{ x: "max-content" }}
              rowClassName=${function (e) { return "clickable-row"; }}
              onRow=${function (e) { return { onClick: function (ev) { if (ev.target.closest && ev.target.closest(".ant-select, .ant-btn, .ant-select-dropdown")) return; showEntity(e); } }; }} /></div>
            <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 10 }}>
              Stand-ins stay the same for the same item, so links between clauses stay intact <${APP.SowRef} sec="1.4.4" />. Range turns an amount into a band, for example USD 1-2 million.
            </div>
          <//>
          <${Card} title="Original and masked text"
            extra=${canSeeOriginal ? html`<${A.Segmented} size="small" value=${sess.view} onChange=${function (v) { entFocus[1](null); setSess({ view: v }); }} options=${[{ value: "side", label: "Side by side" }, { value: "masked", label: "Masked document" }]} />` : null}>
            ${canSeeOriginal && sess.view === "side" && !entFocus[0] ? html`<${APP.MaskingCompare} docId=${DOC} entities=${ents} methods=${methods} onMethodsChange=${function () {}} readOnly=${true} showTable=${false} height=${380} />`
              : html`<${APP.DocViewer} doc=${DOC} masked=${true} entities=${ents} methods=${methods} height=${460} highlight=${entFocus[0] ? entFocus[0].clause : manual ? null : "img7"} scrollTo=${entFocus[0] ? entFocus[0].clause : undefined} nonce=${entFocus[0] ? entFocus[0].at : 0} />`}
          <//>
        <//>
        <${A.Col} xs=${24} xl=${8}>
          <${Card} title="File">
            <${A.Flex} vertical gap=${10}>
              <${APP.FileChip} name="Crane maintenance agreement (sample).docx" meta="14 pages · Word · uploaded by N. Perera" onClick=${function () { APP.openSource({ doc: DOC, clause: "1", page: 1 }); }} />
              <div>
                <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginBottom: 4 }}>Data class <${APP.SowRef} sec="1.3" /></div>
                <${A.Select} value=${sess.cls} disabled=${!editable} style=${{ width: "100%" }}
                  options=${D.dataClasses.map(function (c) { return { value: c.key, label: c.key + ": " + c.handling.split(".")[0] }; })}
                  onChange=${function (v) {
                    var lower = CLASS_RANK[v] < CLASS_RANK.Sensitive;
                    setSess({ cls: v, clsConfirmed: !lower });
                    if (lower) APP.toast.warn("Lowering the class needs the data owner's confirmation. Until then it is handled as Sensitive.");
                    else if (v === "Confidential") APP.toast.info("Confidential material stays on the self-hosted model.");
                  }} />
                <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 4 }}>Suggested by the masking detector: contract price, bank account and personal names found.</div>
              </div>
              ${!sess.clsConfirmed ? html`<${A.Alert} type="warning" showIcon message=${"Change to " + sess.cls + " waiting for S. Silva"} title=${"Change to " + sess.cls + " waiting for S. Silva"}
                description="The system suggests a class but never lowers one on its own. A data owner confirms with a recorded reason."
                action=${html`<${A.Button} size="small" onClick=${function () {
                  APP.notify({ to: ["owner"], kind: "approval", title: "Class change to confirm: " + DOC, body: me.name + " asks to change Sensitive to " + sess.cls + ".", route: "masking", params: { conversationId: convId }, phase: 1 });
                  APP.audit({ action: "Class change requested", item: DOC, detail: "Sensitive to " + sess.cls, dataClass: "Sensitive" });
                  APP.toast.success("S. Silva has been asked to confirm the change.");
                }}>Ask S. Silva<//>`} />` : null}
            <//>
          <//>

          <${Card} title=${html`<span>Where it looked <${APP.SowRef} sec="1.4.3" /></span>`} extra=${html`<span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${doneCount + " of " + locations.length + " done"}</span>`}>
            <${A.Progress} percent=${Math.round(doneCount / locations.length * 100)} size="small" showInfo=${false} status=${doneCount === locations.length ? "success" : "active"} />
            <${A.Flex} vertical gap=${8} style=${{ marginTop: 8 }}>${locations.map(function (l, i) {
              return html`<div key=${i} style=${{ padding: l.manual ? "8px 10px" : 0, borderRadius: 8, background: l.manual && l.status !== "Done" ? tok.colorWarningBg : "transparent", border: l.manual && l.status !== "Done" ? "1px solid " + tok.colorWarningBorder : "none" }}>
                <div style=${{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <${Icon} name=${l.status === "Done" ? "CheckCircleFilled" : "ExclamationCircleFilled"} style=${{ color: l.status === "Done" ? tok.colorSuccess : tok.colorWarning }} />
                  <span style=${{ fontWeight: 500, flex: 1 }}>${l.where}</span>
                  ${l.manual && l.status !== "Done" ? html`<${A.Button} size="small" type="primary" disabled=${!editable} onClick=${function () { checkOpen[1](true); }}>Check now<//>` : null}
                  ${l.manual && l.status === "Done" && editable ? html`<${A.Button} size="small" type="link" onClick=${function () { checkOpen[1](true); }}>Change<//>` : null}
                </div>
                <div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginLeft: 22 }}>${l.detail}</div>
              </div>`;
            })}<//>
          <//>

          <${Card} title=${html`<span>Send to <${APP.SowRef} sec="2.4" /></span>`}>
            <${A.Radio.Group} value=${dest.id} disabled=${!editable} onChange=${function (e) { setSess({ modelId: e.target.value }); }} style=${{ width: "100%" }}>
              <${A.Flex} vertical gap=${8}>${dests.map(function (d) {
                var m = modelById(d.id);
                return html`<${A.Radio} key=${d.id} value=${d.id} disabled=${d.disabled}>
                  <span style=${{ display: "inline-flex", flexDirection: "column" }}>
                    <span><span style=${{ fontWeight: 500 }}>${d.label}</span>${m && m.status !== "Live" ? html`<${APP.StatusTag} status=${m.status} icon=${false} style=${{ marginLeft: 6 }} />` : null}</span>
                    <span style=${{ fontSize: 12, color: tok.colorTextSecondary }}>${d.note}</span>
                  </span>
                <//>`;
              })}<//>
            <//>
            <div style=${{ marginTop: 12 }}>${actionButton}</div>
            ${dest.release && !lockedRel && !readOnlyRole ? html`<div style=${{ fontSize: 12, color: tok.colorTextSecondary, marginTop: 8 }}>Masking alone is not permission to send. ${"S. Silva"} reads the exact text and decides <${APP.SowRef} sec="1.4.7" />.</div>` : null}
          <//>

          <${Card} title=${html`<span>Masking log <${APP.SowRef} sec="1.4.8" /></span>`}><${MaskingLog} /><//>
        <//>
      <//>

      <${ManualCheckModal} open=${checkOpen[0]} value=${sess.manual} onClose=${function () { checkOpen[1](false); }}
        onDone=${function (v) {
          setSess({ manual: v });
          checkOpen[1](false);
          APP.audit({ action: "Manual check", item: DOC, detail: "Image, page 7: " + (v === "clear" ? "crane model plate only, no sensitive data" : "left out of what is sent"), dataClass: "Sensitive" });
          APP.toast.success("Manual check recorded. You can now request release.");
        }} />
      <${AddItemModal} open=${addOpen[0]} text=${fullText} existing=${ents} onClose=${function () { addOpen[1](false); }}
        onAdd=${function (it) {
          var n = extras.length + 1;
          var tag = it.type === "Personal name" ? "PERSON" : it.type === "Company name" ? "PARTY" : it.type === "Job title" ? "ROLE" : it.type === "Transaction price" ? "AMOUNT" : "ITEM";
          var e = { id: "x-" + Date.now(), type: it.type, text: it.text, placeholder: "[" + tag + "-X" + n + "]", method: "placeholder", count: it.count, manual: true };
          var m = Object.assign({}, sess.methods); m[e.id] = "placeholder";
          setSess({ extra: extras.concat([e]), methods: m });
          addOpen[1](false);
          APP.toast.success("Added. \"" + it.text + "\" is masked in " + it.count + (it.count === 1 ? " place." : " places."));
        }} />
      <${A.Modal} open=${previewOpen[0]} onCancel=${function () { previewOpen[1](false); }} title="Preview what will be sent" width=${780} destroyOnHidden=${true}
        okText="Request release" onOk=${requestRelease} cancelText="Back to masking">
        <${A.Flex} vertical gap=${12}>
          <${A.Alert} type="info" showIcon message=${"S. Silva, data owner, sees exactly this before deciding"} title=${"S. Silva, data owner, sees exactly this before deciding"}
            description="The outbound check scans the question, retrieved passages, attachments and context, not just the uploaded file." />
          ${previewOpen[0] ? html`<${APP.PayloadPreview} request=${Object.assign({ ownerId: "owner" }, buildInput())} showOriginal=${true} />` : null}
        <//>
      <//>
    </div>`;
  }

  APP.registerScreen("masking", {
    title: "Masking review", group: "workspace", phase: 1, icon: "EyeInvisibleOutlined", sow: ["1.4", "1.3"],
    summary: "Check what was found and masked before anything goes to a managed model, then request release from the data owner.",
    features: ["Sensitive items with method per item", "Original and masked text side by side", "Where the scan looked, with manual checks", "Request release"],
    render: MaskingScreen
  });
})();
