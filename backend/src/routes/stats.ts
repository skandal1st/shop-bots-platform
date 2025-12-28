import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const statsRoutes = Router();

// All routes require authentication
statsRoutes.use(authenticate);

// Get dashboard statistics
statsRoutes.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    // Get user's bots
    const bots = await prisma.bot.findMany({
      where: { userId },
      select: { id: true }
    });

    const botIds = bots.map(bot => bot.id);

    // Count total bots
    const botsCount = botIds.length;

    // Count total orders across all bots
    const ordersCount = await prisma.order.count({
      where: {
        botId: { in: botIds }
      }
    });

    // Calculate total revenue
    const orders = await prisma.order.findMany({
      where: {
        botId: { in: botIds }
      },
      select: {
        total: true
      }
    });

    const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);

    // Count unique customers across all bots
    const customersCount = await prisma.customer.count({
      where: {
        botId: { in: botIds }
      }
    });

    res.json({
      success: true,
      data: {
        bots: botsCount,
        orders: ordersCount,
        revenue: revenue,
        customers: customersCount
      }
    });
  } catch (error) {
    next(error);
  }
});
