import "./env";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { IngestionPipeline } from "./ingestion/pipeline";
import { ragRetriever } from "./index";

const fastify = Fastify({ logger: true });
const API_KEY = process.env.RAG_SERVICE_API_KEY || "development-secret-do-not-use-in-prod";

fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

fastify.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") return; // Allow health unauthenticated
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    reply.status(401).send({ error: "Unauthorized" });
  }
});

fastify.get("/health", async () => {
  // Try to load models or verify they're ready
  return { ok: true, service: "nexus-rag", ready: true };
});

fastify.post("/ingest", async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file provided" });
    }

    const userId = (data.fields.userId as any)?.value as string;
    if (!userId) {
      return reply.status(400).send({ error: "userId is required" });
    }

    const buffer = await data.toBuffer();
    const pipeline = new IngestionPipeline();
    const documentId = await pipeline.processPdfBuffer(userId, data.filename, buffer);

    return { success: true, documentId };
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to process document" });
  }
});

fastify.post("/retrieve", async (request, reply) => {
  try {
    const body = request.body as { query: string; filter: { userId: string; documentIds?: string[] } };
    if (!body || !body.query || !body.filter || !body.filter.userId) {
      return reply.status(400).send({ error: "Invalid request payload" });
    }

    const context = await ragRetriever.retrieve(body.query, body.filter);
    return context;
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to retrieve context" });
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "8000");
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`RAG Service listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
