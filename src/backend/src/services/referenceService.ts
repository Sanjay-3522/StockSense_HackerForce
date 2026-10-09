import { prisma } from '../utils/prisma';

const TABLES: Record<string, 'receipt' | 'delivery' | 'transfer' | 'adjustment'> = {
  RCP: 'receipt',
  DLV: 'delivery',
  TRF: 'transfer',
  ADJ: 'adjustment',
};

/**
 * Generates a unique reference number for an operation.
 * Format: PREFIX-YYYYMMDD-XXXX (sequential per day).
 * Mirrors the previous client-side generateReference() that queried Supabase directly.
 */
export async function generateReference(prefix: string): Promise<string> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const baseRef = `${prefix}-${dateStr}`;

  const kind = TABLES[prefix] ?? 'receipt';
  const like = { contains: baseRef };

  let count = 0;
  switch (kind) {
    case 'receipt':
      count = await prisma.receipt.count({ where: { reference: like } });
      break;
    case 'delivery':
      count = await prisma.delivery.count({ where: { reference: like } });
      break;
    case 'transfer':
      count = await prisma.transfer.count({ where: { reference: like } });
      break;
    case 'adjustment':
      count = await prisma.adjustment.count({ where: { reference: like } });
      break;
  }

  const seq = String(count + 1).padStart(4, '0');
  return `${baseRef}-${seq}`;
}
