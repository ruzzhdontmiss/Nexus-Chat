import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
// IngestionPipeline will be dynamically imported to prevent eager ML model loading

import { db } from "@nexus/database";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";
    const RAG_SERVICE_API_KEY = process.env.RAG_SERVICE_API_KEY || "development-secret-do-not-use-in-prod";

    const proxyFormData = new FormData();
    proxyFormData.append("userId", user.id);
    proxyFormData.append("file", file);

    const res = await fetch(`${RAG_SERVICE_URL}/ingest`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RAG_SERVICE_API_KEY}`
      },
      body: proxyFormData
    });

    if (!res.ok) {
      throw new Error(`RAG Service returned ${res.status}`);
    }

    const { documentId } = await res.json();
    return NextResponse.json({ success: true, documentId });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Document Upload Error]", error);
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const allDocs = await db.orm.public.Document
      .where({ userId: user.id })
      .all();

    const documents = allDocs
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((doc: any) => ({
        id: doc.id,
        filename: doc.filename,
        mimeType: doc.mimeType,
        size: doc.size,
        status: doc.status,
        createdAt: doc.createdAt
      }));
    
    return NextResponse.json({ documents });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
