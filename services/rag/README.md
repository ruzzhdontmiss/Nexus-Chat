# Nexus RAG Service

This is the persistent RAG (Retrieval-Augmented Generation) microservice for Nexus.

It handles heavy machine learning inference, PDF ingestion, and vector retrieval outside of the Next.js/Vercel serverless environment, keeping the ONNX models loaded warmly in memory.

## Architecture

- **Framework:** Fastify (Node.js)
- **Database:** Direct connection to Neon PostgreSQL (via Prisma)
- **Embeddings:** BGE (via `@xenova/transformers` / ONNX)
- **Reranker:** Cross-encoder (via ONNX)
- **Retrieval:** Hybrid (pgvector + BM25) with Reciprocal Rank Fusion (RRF)

## Endpoints

- `GET /health` - Returns service readiness.
- `POST /ingest` - Accepts `multipart/form-data` containing a `file` and `userId`. Extracts text, chunks, embeds, and indexes into Neon.
- `POST /retrieve` - Accepts JSON `{ query, filter: { userId, documentIds } }`. Performs vector search, BM25, RRF fusion, reranking, and compression. Returns a unified `RetrievalContext`.

## Authentication

All non-health endpoints require a Pre-Shared Key (PSK):
`Authorization: Bearer <RAG_SERVICE_API_KEY>`

The `userId` is trusted from the request payload, assuming the proxy (Next.js) has already authenticated the user.

## Local Development

You can run this service alongside the main Next.js app.

```bash
# Install dependencies
npm install

# Start the development server (runs on port 8000)
npm run dev
```

### Environment Variables
You need a `.env` file containing at minimum the database connection and the shared API key:
```env
DATABASE_URL="postgres://..."
RAG_SERVICE_API_KEY="development-secret-do-not-use-in-prod"
PORT=8000
```
