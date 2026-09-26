import { prisma } from '../utils/prisma';
import { movementInclude, movementWhere, type MovementFilters } from './intelligenceQueries';

export async function getMovements(filters: MovementFilters, page: number, limit: number) {
  const where = movementWhere(filters);
  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, include: movementInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
    prisma.stockMovement.count({ where }),
  ]);
  return { state: total ? 'READY' : 'NO_DATA', items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } };
}
