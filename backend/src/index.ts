import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { botRoutes } from './routes/bots';
import { categoryRoutes } from './routes/categories';
import { productRoutes } from './routes/products';
import { orderRoutes } from './routes/orders';
import { customerRoutes } from './routes/customers';
import { settingsRoutes } from './routes/settings';
import { cartRoutes } from './routes/cart';
import { uploadRoutes } from './routes/upload';
import { botPublicRoutes } from './routes/bot-public';
import { statsRoutes } from './routes/stats';
import { subscriptionRoutes } from './routes/subscriptions';
import { webhookRoutes } from './routes/webhooks';
import { adminRoutes } from './routes/admin';
import { broadcastRoutes } from './routes/broadcasts';
import { digitalRoutes } from './routes/digital';
import { startSubscriptionCron } from './utils/subscriptionCron';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", process.env.PUBLIC_URL || "http://localhost:3001", "http://localhost:3001"],
      frameAncestors: ["'self'", "https://web.telegram.org", "https://telegram.org"]
    }
  }
}));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    process.env.PUBLIC_URL,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
  ].filter(Boolean) as string[],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/miniapp', express.static(path.join(__dirname, '../../miniapp')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public', botPublicRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/digital', digitalRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Запускаем cron для проверки истекших подписок
  startSubscriptionCron();
});

