import { Prisma } from "@prisma/client";
import { AppError } from "./AppError";

/**
 * Translates known Prisma error codes into safe, consistent AppErrors so
 * raw database errors are never leaked to API clients.
 */
export function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case "P2002": {
      const target = (error.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return new AppError(`A record with this ${target} already exists.`, 409);
    }
    case "P2025":
      return new AppError("Requested record was not found.", 404);
    case "P2003":
      return new AppError("Related record does not exist.", 400);
    default:
      return new AppError("A database error occurred.", 500);
  }
}
