// Member 2/3's services import the client from "../utils/prisma" (their
// original path). Re-exporting the single shared instance from
// prismaClient.ts here — rather than duplicating "new PrismaClient()" —
// keeps the "ONE Prisma client" rule true while avoiding a mechanical
// import-path rewrite across every operations/intelligence service file.
export { prisma } from "./prismaClient";
