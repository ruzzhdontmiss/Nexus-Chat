# Nexus RAG Expansion Plan

## Status

Planning document only.

Do not implement any RAG functionality merely from reading this document.
Implementation happens through explicit NEXUS tickets issued later.

This document is the single source of truth for the RAG expansion of Nexus.

---

# 1. Objective

Expand Nexus from a multi-model AI workspace into a complete, production-oriented RAG application.

The RAG system must support:

- PDF/document attachments
- document ingestion and parsing
- context-aware chunking
- BGE-based embeddings
- vector retrieval
- BM25 lexical retrieval
- hybrid retrieval
- cross-encoder reranking
- context compression
- grounded LLM generation
- document citations
- existing web search with web citations
- BYOK LLM providers
- RAG evaluation and benchmarking
- a fast, polished RAG user experience

The implementation must preserve Nexus's existing provider abstraction, authentication, usage accounting, streaming architecture, and search system.

RAG should be an additional architectural layer, not a rewrite of Nexus.

---

# 2. Product Direction

Nexus is primarily a fast AI workspace.

The RAG system should feel like a native part of Nexus rather than a separate "RAG demo".

The final experience should allow a user to:

1. Open a Nexus conversation.
2. Attach one or more documents.
3. Ask questions about those documents.
4. Optionally enable web search.
5. Select a supported LLM/BYOK provider.
6. Receive a streamed answer.
7. See precise document and web citations.
8. Continue asking follow-up questions while preserving conversation context.

The user should not need to understand the underlying retrieval pipeline.

Advanced retrieval information may be available as secondary/debug information, but the default UI should remain clean.

---

# 3. Target Architecture

High-level flow:

User Query
  |
  +-----------------------+
  |                       |
Documents              Web Search
  |                       |
RAG Pipeline            Tavily
  |                       |
  +----------+------------+
             |
      Retrieval Context
             |
      AI Orchestrator
             |
       Selected LLM
             |
        Streaming
             |
    Answer + Citations

RAG retrieval pipeline:

Document
  -> ingestion
  -> structural analysis
  -> context-aware chunking
  -> embedding
  -> indexing

Query
  -> BGE query embedding
  -> vector retrieval
  -> BM25 retrieval
  -> hybrid fusion
  -> cross-encoder reranking
  -> context compression
  -> final retrieval context
  -> AI Orchestrator
  -> LLM

---

# 4. Core Design Principles

## 4.1 Provider independence

The RAG system must not be tightly coupled to a single LLM provider.

The final generation model remains controlled through the existing AI provider abstraction.

RAG should produce normalized retrieval context that can be supplied to any compatible Nexus model.

---

## 4.2 Retrieval is separate from generation

Retrieval components must not contain LLM-provider-specific code.

The retrieval subsystem answers:

"What information is relevant?"

The generation subsystem answers:

"How should the answer be written?"

Maintain this separation throughout implementation.

---

## 4.3 Interfaces before implementations

Establish clean abstractions before committing the system to specific infrastructure.

Expected abstractions include:

- Document
- DocumentChunk
- EmbeddingProvider
- VectorStore
- LexicalRetriever / BM25Retriever
- HybridRetriever
- Reranker
- ContextCompressor
- Retriever
- RetrievalResult
- RetrievalContext
- SourceCitation

The first implementation may use one concrete backend/model, but the architecture must allow replacement.

---

# 5. Document Model

Documents must retain enough metadata to provide reliable citations.

A document should conceptually include:

- id
- owner/user id
- filename
- MIME type
- size
- status
- createdAt
- updatedAt
- metadata

Chunks should conceptually include:

- id
- documentId
- content
- chunk index
- page start
- page end
- section title
- heading path
- token/character count
- metadata

Do not discard document structure during ingestion.

---

# 6. Context-Aware Chunking

Chunking is a core feature rather than a trivial preprocessing step.

Do not implement a naive fixed-character or fixed-token splitter as the primary strategy.

The chunking pipeline should attempt to preserve:

- headings
- sections
- paragraph relationships
- page boundaries
- lists
- tables when extraction permits
- nearby contextual information

Chunks should be large enough to retain meaning but bounded enough for efficient retrieval.

Metadata should preserve the relationship between the chunk and its original document location.

Embedding input may include contextual metadata where appropriate, while the final displayed citation must reference the original document location.

Chunking behavior should eventually be measurable and tunable.

---

# 7. Embeddings

Use BGE embeddings for semantic retrieval.

Hide the concrete embedding implementation behind:

EmbeddingProvider

Expected conceptual capabilities:

- embed documents
- embed queries
- batch embedding
- configurable model/version
- normalized vector output where appropriate

Do not leak BGE-specific implementation details into the rest of Nexus.

Embedding generation should be batch-oriented and asynchronous where possible.

---

# 8. Vector Retrieval

The vector retrieval layer should:

- accept a normalized query
- generate/query embeddings
- search indexed document chunks
- return normalized RetrievalResult objects
- retain source metadata
- support top-K retrieval
- support filtering by user/document/conversation where required

The first implementation may use PostgreSQL + pgvector if appropriate for the existing Neon/Postgres architecture.

Avoid introducing unnecessary infrastructure when the existing database can support the workload.

---

# 9. BM25 Retrieval

Implement a lexical retrieval path independently from vector search.

BM25 should capture exact terminology and rare keyword matches that semantic retrieval can miss.

Examples include:

- product names
- legal clauses
- paper terminology
- identifiers
- acronyms
- exact technical phrases

BM25 results must use the same normalized retrieval-result shape as vector results.

---

# 10. Hybrid Retrieval

Hybrid retrieval combines:

- semantic vector retrieval
- BM25 lexical retrieval

The system should retrieve candidates through both methods and fuse their rankings.

The preferred initial fusion strategy is Reciprocal Rank Fusion (RRF), unless implementation evidence indicates another method is more appropriate.

Do not directly compare raw BM25 scores and vector similarity scores unless they have first been normalized appropriately.

Hybrid retrieval should expose enough metadata to evaluate:

- vector-only performance
- BM25-only performance
- hybrid performance

This is important for the evaluation phase.

---

# 11. Cross-Encoder Reranking

Cross-encoder reranking is a second-stage relevance model.

Pipeline:

Vector retrieval + BM25
  -> hybrid candidate set
  -> cross-encoder
  -> reranked candidates
  -> final top-K

The reranker should operate on:

(query, candidate chunk)

pairs.

Keep reranking behind a Reranker abstraction.

The reranker should not become part of the database layer or LLM provider layer.

Record enough information to evaluate whether reranking improves retrieval quality.

---

# 12. Context Compression

After reranking, compress the selected retrieval context before sending it to the LLM when beneficial.

Goals:

- remove irrelevant passages
- reduce duplicated information
- reduce token usage
- preserve evidence needed to answer the query
- preserve source attribution

Compression must never silently destroy the citation relationship between evidence and its original document location.

The final RetrievalContext should retain both:

- compressed text
- source/chunk provenance

---

# 13. Retrieval Context Contract

RAG should produce a normalized RetrievalContext.

Conceptually:

- query
- retrieved results
- reranked results
- compressed context
- source citations
- retrieval metadata
- optional timing/diagnostic information

Example diagnostic metadata:

- vector candidate count
- BM25 candidate count
- fused count
- reranked count
- final context count
- retrieval latency
- reranking latency
- compression latency

Diagnostics should be available for evaluation/debugging without polluting the normal user-facing answer.

---

# 14. Grounded Generation

Once retrieval is complete:

RetrievalContext
  -> AIOrchestrator
  -> selected LLM
  -> streaming answer

The generation prompt should clearly distinguish:

- user request
- retrieved evidence
- source metadata
- instructions about grounding

The model should be instructed to use retrieved evidence when answering document-grounded questions.

The system should avoid presenting unsupported claims as document-derived facts.

When evidence is insufficient, the generation layer should be able to communicate uncertainty instead of fabricating an answer.

---

# 15. Citations

Nexus will support two source classes.

## Document Sources

Document citations should include enough information to identify the evidence:

- filename/title
- page number where available
- section where available
- chunk/source identifier internally

Example presentation:

[annual-report.pdf, p. 14]

## Web Sources

Existing Tavily search/citation functionality remains intact.

Web citations continue using the current source metadata and source-card system.

Document and web sources should remain distinguishable internally.

Do not replace the existing web-search implementation with the document RAG system.

---

# 16. BYOK LLM Integration

The existing Nexus provider system remains responsible for LLM generation.

Supported BYOK architecture should continue to work with RAG context.

RAG must not assume that generation happens through Groq or any one provider.

The flow must remain:

User
 -> RAG retrieval
 -> RetrievalContext
 -> AIOrchestrator
 -> selected provider/model
 -> streaming response

Managed and BYOK models should share the same normalized generation interface.

---

# 17. PDF / Document Ingestion

The ingestion subsystem should eventually support:

- upload
- validation
- extraction
- metadata
- chunking
- embedding
- indexing
- processing status
- failure handling

Ingestion must be asynchronous where useful.

Large files must not block the Next.js request lifecycle unnecessarily.

The design should allow background processing to be introduced without rewriting the document model.

Do not build every file format at once.

PDF is the primary initial target.

Other formats can follow once the ingestion architecture is stable.

---

# 18. RAG Chat

The final RAG chat pipeline should be:

User message
  -> determine retrieval requirements
  -> retrieve relevant document evidence
  -> optional web search
  -> hybrid retrieval
  -> reranking
  -> context compression
  -> construct grounded context
  -> AI Orchestrator
  -> stream answer
  -> persist answer
  -> persist citations/metadata

Normal non-RAG chat must continue to work.

RAG should be an additive capability.

---

# 19. RAG Evaluation

RAG evaluation is a first-class component of the project.

Do not rely only on manual testing.

Create a reproducible evaluation dataset containing:

- question
- expected answer
- expected/relevant source
- difficulty/category
- optional ground-truth chunk/source

Evaluation should separate retrieval quality from generation quality.

## Retrieval metrics

At minimum investigate:

- Recall@K
- Precision@K
- Hit Rate
- MRR
- nDCG

Compare:

- vector-only
- BM25-only
- hybrid
- hybrid + reranking

## Generation/RAG metrics

Evaluate relevant dimensions such as:

- faithfulness
- answer relevance
- context relevance
- context precision
- context recall
- citation correctness

Do not hard-code target numbers before measurement.

The system should produce actual benchmark results.

## Performance metrics

Record:

- ingestion latency
- parsing latency
- embedding latency
- retrieval latency
- reranking latency
- compression latency
- LLM TTFT
- total generation latency
- token usage

Evaluation results should eventually be suitable for inclusion in the project README.

---

# 20. UI Requirements

RAG UI is intentionally delayed until the backend pipeline is functioning correctly.

The RAG interface must preserve Nexus's existing design language:

- premium dark UI
- fast interaction
- restrained chrome
- fluid animations
- strong hierarchy
- responsive layout
- no unnecessary dashboard complexity

The user should be able to:

- attach documents
- see attached files
- know when indexing is complete
- ask questions
- see document citations
- continue normal chat
- optionally use web search
- select an LLM/model

Retrieved chunks and detailed retrieval internals should not dominate the main chat interface.

Advanced retrieval information can be exposed progressively.

---

# 21. Performance Is a Primary Requirement

Current Nexus frontend responsiveness is not yet where it should be.

The RAG phase must not make that problem worse.

Do not assume that adding more features automatically justifies a slower UI.

After the RAG functionality is stable, perform a dedicated performance pass.

Investigate:

- unnecessary React re-renders
- expensive client-side effects
- animation workload
- WebGL/background performance
- message-list rendering
- streaming update frequency
- large document state in the client
- expensive markdown rendering
- unnecessary network requests
- component mounting/unmounting
- sidebar/background interaction
- mobile performance
- memory usage

The final UI should feel significantly smoother than the current implementation.

Performance work should be measured rather than based only on subjective impressions.

---

# 22. Recommended Ticket Structure

The RAG work will be intentionally grouped into larger implementation tickets.

## NEXUS-012 — RAG Foundation

Establish the architecture and contracts.

Includes:

- Document
- DocumentChunk
- EmbeddingProvider
- VectorStore
- BM25Retriever
- HybridRetriever
- Reranker
- ContextCompressor
- Retriever
- RetrievalResult
- RetrievalContext
- SourceCitation
- boundaries between RAG and AIOrchestrator
- database/schema planning
- tests for contracts and normalization

Do not implement the complete UI.

---

## NEXUS-013 — Document Ingestion + Retrieval Stack

Combine the core ingestion and retrieval implementation into one major backend milestone.

Includes:

### Document ingestion
- PDF upload
- file validation
- extraction
- document persistence
- context-aware chunking
- chunk metadata

### BGE indexing
- BGE embedding provider
- batch embeddings
- vector storage/indexing
- vector retrieval

### BM25 + hybrid retrieval
- BM25 indexing
- BM25 retrieval
- hybrid fusion/RRF
- normalized retrieval results

### Cross-encoder reranking
- reranker implementation
- candidate reranking
- final ranked results

This ticket should finish with a functioning end-to-end retrieval pipeline independent of the final chat UI.

---

## NEXUS-014 — RAG Chat + Evaluation

Combine the final generation path and evaluation system.

Includes:

### RAG chat
- retrieval integration
- optional web search integration
- context compression
- grounded prompt construction
- AIOrchestrator integration
- streaming response
- persistence
- document citations
- mixed document/web source handling

### RAG evaluation
- evaluation dataset
- retrieval benchmarks
- generation/RAG evaluation
- comparison of vector/BM25/hybrid/reranked retrieval
- latency metrics
- reproducible evaluation runner
- report generation

The goal is to finish this ticket with a genuine measurable RAG system.

---

## NEXUS-015 — RAG UI + UX

Build the user-facing RAG experience.

Includes:

- PDF/document attachment UX
- upload state
- ingestion/indexing status
- attached-document display
- RAG-enabled composer behavior
- source/citation UX
- document source cards
- web/document source distinction
- retrieval feedback where useful
- responsive/mobile behavior
- integration with existing model selector and search controls

Do not turn the primary interface into an engineering dashboard.

---

## NEXUS-016 — Nexus Performance + Polish

Dedicated performance and final integration pass.

Includes:

- frontend rendering optimization
- streaming optimization
- message-list optimization
- animation/background optimization
- WebGL workload review
- mobile optimization
- network/request optimization
- RAG state management optimization
- memory review
- loading/error-state polish
- final accessibility review
- production build verification

Performance improvements should be measured before and after.

---

# 23. Out of Scope Initially

Do not automatically expand the scope into:

- autonomous agents
- multi-agent systems
- advanced planning
- arbitrary file-format ingestion
- OCR-heavy document processing
- multimodal vision RAG
- graph RAG
- knowledge graphs
- complex agentic retrieval
- speculative query rewriting
- large-scale distributed vector infrastructure

These can be future expansions only after the core RAG pipeline is reliable.

---

# 24. Engineering Constraints

Preserve existing Nexus capabilities:

- Auth.js / Google OAuth
- user-scoped database access
- Prisma/Postgres
- Neon architecture
- provider abstraction
- AIOrchestrator
- Groq managed model
- BYOK providers
- Tavily search
- usage accounting
- rate limiting
- SSE/streaming
- current conversation persistence
- current responsive UI

Do not rewrite working systems unnecessarily.

Prefer incremental integration over parallel competing architectures.

Keep secrets server-side.

Never commit API keys.

---

# 25. Definition of Done

The RAG expansion is complete when Nexus can:

1. Accept a PDF.
2. Extract and preserve document structure/metadata.
3. Create context-aware chunks.
4. Generate BGE embeddings.
5. Index document chunks.
6. Perform vector retrieval.
7. Perform BM25 retrieval.
8. Fuse both retrieval modes.
9. Rerank candidates with a cross-encoder.
10. Compress useful context.
11. Pass grounded context through AIOrchestrator.
12. Stream an answer from a managed or BYOK LLM.
13. Persist the conversation.
14. Produce accurate document citations.
15. Continue supporting web-search citations.
16. Evaluate retrieval and generation quality using a reproducible benchmark.
17. Expose useful evaluation metrics.
18. Provide a polished RAG UI.
19. Remain responsive on desktop and mobile.
20. Pass final build/typecheck/lint/tests.

The final project should demonstrate both strong application engineering and serious RAG/ML engineering rather than being only a UI wrapper around an LLM.