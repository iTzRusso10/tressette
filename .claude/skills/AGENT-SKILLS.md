# Agent Skills (Addy Osmani)

Skill di ingegneria del software copiate da https://github.com/addyosmani/agent-skills
(versione 0.6.14, commit eb07f19, licenza MIT © 2025 Addy Osmani).

- `.claude/skills/`: le 25 skill (si attivano da sole in base al lavoro).
- `.claude/references/`: le checklist condivise (accessibilità, prestazioni, sicurezza, test, definition of done…).
- `.claude/commands/`: /spec, /plan, /build, /test, /review, /code-simplify, /constraints, /ship, /webperf.
- `.claude/agents/`: code-reviewer, security-auditor, test-engineer, web-performance-auditor.

Gli hook del repo originale non sono stati copiati.
Per aggiornarle: riclonare il repo e ricopiare le stesse cartelle (nei comandi e negli agenti
il prefisso `agent-skills:` va tolto, perché qui le skill non stanno in un plugin).
