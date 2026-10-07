import fs from 'fs';
import path from 'path';

async function run() {
  console.log("=== STARTING REAL LOCAL E2E RAG TEST ===");
  const RAG_SERVICE_URL = "http://127.0.0.1:8000";
  const NEXTJS_URL = "http://127.0.0.1:3000";

  // Create test user directly in DB
  const { db } = await import("../packages/database/src/db.js");
  const existingUser = await db.orm.public.User.first({ id: "test-user" });
  if (!existingUser) {
    await db.orm.public.User.create({ id: "test-user", email: "test@example.com", name: "Test User" });
  }

  // Wait for both services to be healthy
  console.log("Checking RAG Service health...");
  const healthRes = await fetch(`${RAG_SERVICE_URL}/health`);
  console.log("RAG Health:", await healthRes.json());

  // 1. Upload Document via Next.js Proxy
  console.log("\nUploading document through Next.js proxy...");
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(path.join(process.cwd(), "test-rag.pdf"));
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  formData.append("file", blob, "test-rag.pdf");

  const startTime = Date.now();
  const uploadRes = await fetch(`${NEXTJS_URL}/api/documents`, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    console.error("Upload failed", uploadRes.status, await uploadRes.text());
    process.exit(1);
  }

  const uploadData = await uploadRes.json();
  const documentId = uploadData.documentId;
  console.log(`Ingestion successful. Document ID: ${documentId} (took ${Date.now() - startTime}ms)`);

  // 2. Chat using document
  console.log("\nTesting retrieval chat...");
  const chatStart = Date.now();
  const chatRes = await fetch(`${NEXTJS_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "What is this document about?" }],
      documentIds: [documentId]
    })
  });

  if (!chatRes.ok) {
    console.error("Chat failed", chatRes.status, await chatRes.text());
    process.exit(1);
  }

  // stream response
  const text = await chatRes.text();
  console.log(`Chat completed. (took ${Date.now() - chatStart}ms)`);
  console.log("Stream output snippet:", text.substring(0, 100) + "...");

  // 3. Follow up
  console.log("\nTesting follow-up chat...");
  const followUpRes = await fetch(`${NEXTJS_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", content: "What is this document about?" },
        { role: "assistant", content: "It is a test document." },
        { role: "user", content: "Are there any security requirements?" }
      ],
      documentIds: [documentId]
    })
  });

  console.log("Follow up completed, status:", followUpRes.status);

  console.log("\n=== ALL E2E TESTS PASSED ===");
}

run().catch(console.error);
