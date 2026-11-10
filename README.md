# CICT Legal & Compliance AI Assistant: proposal pages

Working pages from Allion Technologies for CICT RFQ 114367 (Legal & Safety Compliance Document Review Assistant).

| Page | What it is |
|---|---|
| [Clickable prototype](prototype.html) | Concept mock of both delivery phases, with a Phase 1 / Phase 1 + 2 switch. Start with "Ask the assistant" for the six-step review flow. |
| [Team briefing](briefing.html) | What we understood from the specification: scope by phase, diagrams, acceptance, risks, assumptions and open questions. |

All names, documents and figures in the prototype are made-up samples. This public copy leaves out the text of CICT's requirements specification, so the prototype's § links show a short note instead of the section. Both pages are AI-assisted drafts under review, not a commitment or an offer.

## How these files are made

The sources live in the AllionInternal workspace at `research/cict-legal-ai-proposal/` (`04-team-briefing.html`, `05-prototype.html`), where they are also published as claude.ai pages. To refresh this repo:

1. Edit the source pages there.
2. Run `python -I tools/build_site.py` from `research/cict-legal-ai-proposal/`. It wraps each page in a full HTML document and writes it here.
3. Commit and push from this folder.
