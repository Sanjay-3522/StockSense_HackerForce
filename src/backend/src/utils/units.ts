/**
 * Supported units of measure. Stored as a plain string column (not a DB
 * enum) so new units can be added here without a schema migration.
 */
export const SUPPORTED_UNITS = ["unit", "kg", "g", "litre", "metre", "box"] as const;

export type UnitOfMeasure = (typeof SUPPORTED_UNITS)[number];

export const isValidUnit = (unit: string): unit is UnitOfMeasure =>
  (SUPPORTED_UNITS as readonly string[]).includes(unit);
