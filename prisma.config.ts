import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig } from "@prisma/orm-postgres/config";
import pgvector from "@prisma/orm-extension-pgvector/control";

export default definePrismaConfig({
  orm: defineConfig({
    contract: "./src/prisma/contract.prisma",
    db: { connection: process.env.DATABASE_URL! },
    extensions: [pgvector],
  }),
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
