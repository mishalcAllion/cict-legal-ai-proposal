# CICT Legal & Compliance AI Assistant: proposal pages

Working pages from Allion Technologies for CICT RFQ 114367 (Legal & Safety Compliance Document Review Assistant).

| Page | What it is |
|---|---|
| [Clickable prototype](prototype.html) | A working concept of the application: seven roles, both delivery phases with a Phase 1 / Phase 1 + 2 switch. Start with "Guided tour" to follow one contract from question to archived record. |
| [Team briefing](briefing.html) | What we understood from the specification: scope by phase, diagrams, acceptance, risks, assumptions and open questions. |

All names, documents and figures in the prototype are made-up samples. This public copy leaves out the text of CICT's requirements specification, so the prototype's § links show a short note instead of the section. Both pages are AI-assisted drafts under review, not a commitment or an offer.

## How these files are made

The sources live in the AllionInternal workspace at `research/cict-legal-ai-proposal/` (`04-team-briefing.html`, and `prototype/` for the application: `index.html` plus the scripts in `prototype/app/`), where they are also published as claude.ai pages. To refresh this repo:

1. Edit the source pages there.
2. Run `python -I tools/build_site.py` from `research/cict-legal-ai-proposal/`. It wraps each page in a full HTML document, copies `prototype/app/` here as `app/`, and empties the specification text in `app/sow-data.js`.
3. Commit and push from this folder.

The prototype loads React, Ant Design, htm, dayjs and jsdiff from cdn.jsdelivr.net at pinned versions.
