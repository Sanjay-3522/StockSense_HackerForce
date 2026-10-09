import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance for the whole app — every
// controller/service in every module (foundation, operations,
// intelligence) imports this one instance. There is exactly one
// PostgreSQL database and one Prisma client in this project.
export const prisma = new PrismaClient();
