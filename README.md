# Nexus Chat

> A performance-first, multi-model AI workspace built from scratch with a provider-agnostic backend, real-time streaming, web search with citations, persistent conversations, authentication, encrypted BYOK connections, usage metering, and a polished responsive UI.

Nexus is designed as a serious full-stack / AI-engineering portfolio project rather than a simple ChatGPT clone. The focus is on **speed, clean architecture, extensibility, and a premium product experience**.

---

## ✨ What is Nexus?

Nexus is an AI workspace that gives users a single interface for interacting with multiple model providers while keeping the application architecture provider-agnostic.

The project currently combines:

- Real-time AI streaming
- A managed free model through Groq
- BYOK (Bring Your Own Key) provider connections
- Web search with source citations
- Persistent conversations and messages
- Google authentication
- Usage quotas and rate limits
- Encrypted provider credentials
- Responsive desktop/mobile UI
- Interactive React Bits visual effects
- A backend architecture prepared for future RAG and multi-model workflows

The long-term goal is to evolve Nexus into a **multi-model AI workspace with chat, retrieval, tool use, model comparison, and extensible AI infrastructure**.

---

## 🚀 Current Highlights

### AI / Model Layer

Nexus uses a normalized provider abstraction instead of coupling the application directly to one AI vendor.

```text
Chat UI
   ↓
/api/chat
   ↓
AIOrchestrator
   ↓
ModelProvider
   ↓
Provider API
   ↓
Normalized ModelChunk
   ↓
Streaming UI
```

The provider layer exposes common contracts such as:

- `ModelProvider`
- `ModelInfo`
- `ModelRequest`
- `ModelMessage`
- `ModelChunk`
- `ProviderError`

This makes it possible to add or replace model providers without rewriting the chat system.

### Managed Free Model

The current managed model is:

**Groq → `openai/gpt-oss-120b`**

It is used as Nexus's managed/free model path, while other providers can be used through BYOK connections.

### BYOK Provider Architecture

The provider hub currently has architecture for:

| Provider | Mode | Status |
|---|---|---|
| Groq | Managed | Active |
| OpenAI | BYOK | Supported |
| OpenRouter | BYOK | Supported |
| Moonshot / Kimi | BYOK | Supported |
| Z.AI / GLM | BYOK | Supported |
| Anthropic | Stub | Planned |
| Google AI | Stub | Planned |
| Mock providers | Internal | Development / testing |

Provider credentials are encrypted server-side using **AES-256-GCM** and are never exposed to the client.

---

## 💬 Chat Experience

Nexus includes a complete streaming chat flow:

- Optimistic user messages
- Progressive assistant responses
- Real-time streaming
- Request cancellation
- Normalized provider errors
- Conversation persistence
- Deterministic first-message conversation titles
- Markdown rendering
- GitHub-flavored Markdown
- Syntax-highlighted code blocks
- Automatic scroll behavior
- Responsive composer
- Model selection
- Search toggle

The composer was intentionally designed around a compact workspace-style interaction rather than copying a specific existing AI product.

---

## 🔎 Web Search + Citations

Nexus has a tool abstraction and a Tavily-backed search implementation.

Search flow:

```text
User message
   ↓
Search enabled?
   ↓
SearchTool
   ↓
Tavily
   ↓
Normalized SearchResponse
   ↓
Grounding context
   ↓
AIOrchestrator
   ↓
Streaming answer + source metadata
```

Search results are surfaced back into the conversation as source cards / citations and are persisted as message metadata.

The live search flow has been manually verified, including citation rendering.

---

## 🔐 Authentication & Security

Nexus uses Auth.js / NextAuth with Google OAuth.

Security architecture includes:

- Google authentication
- Server-derived user identity
- Protected chat/conversation APIs
- User-scoped database queries
- User-scoped provider connections
- AES-256-GCM credential encryption
- Masked credentials in the UI
- No provider credentials stored in `localStorage`
- Server-only API keys
- Environment-based secrets
- Normalized provider/tool errors
- Request IDs for observability

Secrets belong in `.env.local` and are excluded from version control. The repository contains only `.env.example` placeholders.

---

## 🗄️ Database & Persistence

Nexus uses **PostgreSQL + Prisma** and is connected to **Neon** for hosted development infrastructure.

Current persisted entities include:

- `User`
- `Conversation`
- `Message`
- `ProviderConnection`
- `UsageEvent`
- `RateLimit`
- `UsageQuota`

The migration chain covers the current schema and is designed to support production deployment with Prisma migrations.

The local development environment uses a Neon development branch; the production branch was kept separate during development.

---

## 📊 Usage & Rate Limiting

Nexus tracks AI and search usage through a unified usage service.

Current infrastructure includes:

- Chat usage accounting
- Search usage accounting
- Provider token accounting where available
- Request counting when token data is unavailable
- Daily free-tier quotas
- Per-minute chat rate limits
- Per-minute search rate limits
- UTC-based quota calculations
- `/api/usage` endpoint
- Atomic PostgreSQL usage increments

Current free-tier configuration is environment driven rather than hard-coded.

---

## 🎨 Frontend

The UI is built with:

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Lucide
- Inter
- Geist Pixel for selective Nexus branding
- React Bits visual components

Design goals:

- Dark-first / dark-only
- Premium and minimal product UI
- Fast visual feedback
- Smooth interaction
- Strong typography hierarchy
- Minimal layout friction
- Responsive desktop/mobile behavior

### React Bits Effects

Nexus currently uses two React Bits effects as ambient visual layers:

**ColorBends**

A WebGL-based animated background providing the large-scale color field.

**DotField**

An interactive dotted field that responds to the cursor and dynamically rebuilds on container resize.

These effects are treated as **ambient system-level visuals**, while the actual chat experience stays readable and functional above them.

### Thinking Orb

Nexus uses the `RareFormLabs/thinking-orbs` implementation for semantic AI state feedback.

States used by Nexus include:

- `working`
- `searching`
- `composing`

The orb communicates generation/search state without relying only on text labels.

---

## 📱 Responsive Design

The application has been manually verified on mobile as well as desktop.

Responsive behavior includes:

- Collapsible desktop sidebar
- Mobile navigation treatment
- Responsive chat layout
- Responsive composer
- Background rendering that reacts correctly to sidebar/layout changes
- Preserved message scrolling behavior

---

## 🧠 Engineering Problems Solved

Nexus has gone through several real integration problems during development. They became useful architectural lessons rather than being hidden.

### 1. Managed provider failure: Mistral → Groq

The original managed free-model implementation used Mistral. The integration repeatedly failed to produce usable model output because of a combination of SDK/API handling and stream parsing issues.

The system was refactored and the managed path moved to Groq using:

`openai/gpt-oss-120b`

This was a useful validation of the provider abstraction: the application could change the managed upstream without redesigning the chat API.

---

### 2. Database environment pointed at the wrong Neon branch

During local auth/database verification, the local environment was initially connected to an empty Neon production branch.

The problem resulted in authentication/conversation flows appearing broken even though the application code itself was functioning.

A dedicated Neon development branch was created, local development was moved there, and the temporary database diagnostics were removed afterward.

---

### 3. Assistant output existed but was not visible in the UI

The backend successfully streamed and persisted assistant output, but the browser UI did not render the response correctly.

The issue came from layout/scroll containment rather than the AI provider.

The fix involved correcting `min-height` / overflow behavior in the message list and ensuring the streaming orb still rendered while the assistant message content was initially empty.

This was a good example of why an end-to-end test has to verify:

```text
Provider → API → stream → React state → layout → visible UI
```

rather than stopping when the server returns `200`.

---

### 4. DotField resizing when the sidebar changed width

The interactive background originally did not always rebuild correctly after the sidebar collapsed/expanded.

A `ResizeObserver` was added around the relevant container so the canvas could react to layout changes.

This made the visual system behave correctly as a real responsive UI rather than assuming a fixed viewport.

---

### 5. React Bits / visual iteration

An early LaserFlow experiment was removed because it did not fit the final visual direction and introduced unwanted font/visual behavior.

The project instead settled on ColorBends + DotField + ThinkingOrb, keeping the effects visually ambitious without making the interface itself harder to use.

---

### 6. Lint / generated-code friction

The final cleanup exposed lint issues from generated Prisma code and strict legacy ESLint rules.

The project moved to a modern `eslint.config.mjs` configuration and isolated the generated-code exceptions needed to get the repository into a clean verification state.

There is still a small non-blocking cleanup opportunity around one unused ESLint disable directive.

---

### 7. Runtime deprecation warning

Three.js currently emits a cosmetic deprecation warning related to `THREE.Clock` in the ColorBends implementation.

It does not block the application, build, or interaction and is intentionally treated as a non-blocking warning for now.

---

## ✅ Verification Status

The current Nexus prototype has been verified across the major system layers.

| Area | Status |
|---|---|
| Managed AI streaming | ✅ Verified |
| Google authentication | ✅ Verified |
| Protected APIs | ✅ Verified |
| Conversation persistence | ✅ Verified |
| Message persistence | ✅ Verified |
| Provider hub | ✅ Verified structurally |
| Encrypted BYOK credentials | ✅ Verified structurally |
| Live OpenRouter BYOK | ⚠️ Not live-tested without a key |
| Web search | ✅ Live verified |
| Search citations | ✅ Live verified |
| Usage metering | ✅ Verified |
| Rate-limit implementation | ✅ Code verified |
| Desktop UI | ✅ Verified |
| Mobile UI | ✅ Live verified |
| Neon / Prisma migrations | ✅ Verified |
| Production build | ✅ Passed |
| TypeScript | ✅ Passed |
| ESLint | ✅ Passed |
| Secret scan | ✅ Passed |

The project is a **working prototype / active development project**, not a claim of production readiness.

---

## 🧩 Architecture

### Current application architecture

```text
                         ┌─────────────────────┐
                         │    Nexus Frontend   │
                         │ Next.js + TypeScript │
                         └──────────┬──────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  Next.js BFF  │
                            │   API Routes  │
                            └───────┬───────┘
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
             ┌───────────┐   ┌────────────┐   ┌────────────┐
             │   Auth    │   │ AI Layer   │   │ Tool Layer │
             │ Auth.js   │   │Orchestrator│   │   Search   │
             └───────────┘   └─────┬──────┘   └─────┬──────┘
                                   │                │
                         ┌─────────┼─────────┐      ▼
                         ▼         ▼         ▼    Tavily
                      Groq     OpenAI   OpenRouter
                                   │
                                   ▼
                              PostgreSQL
                                 / Neon
```

### AI orchestration

The orchestrator separates application logic from vendor-specific APIs.

That makes future additions such as model comparison, fallback routing, structured outputs, and new providers possible without replacing the entire chat stack.

---

## 🛠️ Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Lucide
- react-markdown
- remark-gfm
- react-syntax-highlighter
- React Bits
- Three.js

### Backend

- Next.js API routes / BFF
- TypeScript
- Provider abstraction
- Tool abstraction
- Streaming via `ReadableStream`
- Auth.js / NextAuth

### AI

- Groq
- `openai/gpt-oss-120b`
- OpenAI-compatible provider architecture
- Mistral integration history / legacy path
- OpenRouter BYOK
- Moonshot / Kimi BYOK
- Z.AI / GLM BYOK
- Tavily Search
- Mock models for development

### Data

- PostgreSQL
- Neon
- Prisma

### Security

- AES-256-GCM credential encryption
- Environment-based secret management
- Server-side provider keys
- User-scoped authorization

---

## ⚙️ Local Development

### Requirements

- Node.js
- npm
- PostgreSQL-compatible database (Neon is used for the current hosted development setup)

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Populate the required values in `.env.local`.

Important variables include:

```env
DATABASE_URL=
DATABASE_URL_UNPOOLED=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
GROQ_API_KEY=
NEXUS_CREDENTIAL_ENCRYPTION_KEY=
NEXUS_SEARCH_API_KEY=
```

Optional provider keys are used for BYOK/provider-specific features.

### Run

```bash
npm run dev
```

Then open the local development server in your browser.

### Verify

```bash
npx tsc --noEmit
npm run lint
npm run build
```

---

## 📸 Screenshots

> Add screenshots to `docs/screenshots/` and keep the filenames below so this section becomes a simple portfolio showcase.

### Home / Empty State

![Nexus Home](docs/screenshots/home.png)

### Active Conversation

![Nexus Chat](docs/screenshots/chat.png)

### Model Selector

![Model Selector](docs/screenshots/model-selector.png)

### AI Provider Hub

![Provider Hub](docs/screenshots/providers.png)

### Search + Citations

![Search Citations](docs/screenshots/search-citations.png)

### Mobile

![Nexus Mobile](docs/screenshots/mobile.png)

---

## 🗺️ Roadmap

The next major development phase is the RAG foundation.

### Phase 1 — RAG Foundation

Planned architecture:

```text
Documents
    ↓
Ingestion Contract
    ↓
Chunking
    ↓
EmbeddingProvider
    ↓
VectorStore
    ↓
Retriever
    ↓
RetrievalContext
    ↓
AIOrchestrator
```

Core contracts planned:

- `Document`
- `DocumentChunk`
- `EmbeddingProvider`
- `VectorStore`
- `Retriever`
- `RetrievalResult`
- `RetrievalContext`

The goal is to establish the architecture first instead of immediately tying Nexus to one document parser, one embedding provider, or one vector database.

### Phase 2 — Document Intelligence

Planned:

- File uploads
- Document ingestion
- PDF parsing
- Chunking strategies
- Metadata extraction
- Embeddings
- pgvector-backed retrieval
- Document-aware chat

### Phase 3 — Better Retrieval

Planned:

- Metadata filtering
- Hybrid retrieval
- Reranking
- Retrieval evaluation
- Context selection
- Citation-quality improvements

### Phase 4 — Multi-Model Workspace

Planned:

- Side-by-side model comparison
- Multi-model responses
- Provider fallback/routing
- Model-specific capabilities
- Structured output workflows

### Phase 5 — Agent & Tooling Layer

Longer-term possibilities:

- More first-party tools
- Tool calling
- Agent workflows
- Background tasks
- Persistent jobs
- Redis-backed coordination
- Object storage

These features are intentionally future work rather than part of the current prototype.

---

## 🎯 Project Goals

Nexus is being built around several principles:

**Performance first**

The interface should feel immediate even when the underlying model takes time to respond.

**Provider independence**

AI providers should be replaceable infrastructure, not hard-coded application logic.

**Real product engineering**

Authentication, persistence, usage limits, security, responsive UI, observability, and failure handling are treated as first-class parts of the product.

**Incremental architecture**

Large features are introduced through explicit contracts and boundaries instead of tightly coupling every subsystem.

**Portfolio-grade engineering**

The goal is to demonstrate full-stack, backend, AI-infrastructure, and product-engineering ability in one coherent system.

---

## 📌 Current Status

**Nexus is actively under development.**

The current branch has been consolidated into `main` and represents the completed first major prototype milestone, including authenticated chat, real model streaming, persistence, search with citations, provider/BYOK architecture, usage controls, Neon/PostgreSQL infrastructure, and the responsive frontend.

The next major milestone is the RAG foundation.

---

## 👨‍💻 Author

**Rushat Yadav**

Built as a 2026 full-stack / AI engineering portfolio project.
