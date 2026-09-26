import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import receiptsRouter from './routes/receipts';
import deliveriesRouter from './routes/deliveries';
import transfersRouter from './routes/transfers';
import adjustmentsRouter from './routes/adjustments';
import lookupsRouter from './routes/lookups';
import intelligenceRouter from './routes/intelligence';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: corsOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/receipts', receiptsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/adjustments', adjustmentsRouter);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api', lookupsRouter); // /api/products, /api/warehouses, /api/locations, /api/categories, /api/adjustment-reasons, /api/reference, /api/stock

app.use(errorHandler);

app.listen(port, () => {
  console.log(`StockSense backend listening on http://localhost:${port}`);
});
