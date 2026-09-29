<!-- BEGIN:nextjs-agent-rules -->

# Nexus Engineering Instructions

## Project

Nexus is a performance-first multi-model AI workspace built with Next.js, TypeScript, Tailwind, shadcn/ui, Prisma/Postgres, Auth.js, provider abstractions, streaming chat, Tavily web search, usage controls, and BYOK model support.

## RAG Phase

The complete RAG expansion plan is:

`docs/NEXUS-RAG-PLAN.md`

Before implementing any NEXUS-012+ RAG ticket, read that document once and use it as the architectural source of truth.

Do not repeat the entire RAG plan in individual tickets.

## Important Rules

- Preserve existing working Nexus architecture unless a ticket explicitly requires change.
- Do not rewrite working authentication, provider, search, usage, or streaming systems unnecessarily.
- Keep provider-specific LLM code behind the existing provider abstraction.
- Keep RAG retrieval separate from generation.
- Keep secrets server-side and never commit credentials.
- Prioritize frontend responsiveness and streaming performance.
- Do not implement future roadmap features unless explicitly requested by a ticket.
- Do not treat roadmap items as completed functionality.
- Run relevant verification before declaring a ticket complete.