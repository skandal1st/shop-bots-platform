import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const customerRoutes = Router();

customerRoutes.use(authenticate);

// Get customers for bot
customerRoutes.get('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { search, tag } = req.query;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const where: any = { botId };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (tag) {
      where.tags = {
        some: { tag: tag as string }
      };
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        tags: true,
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total spent for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await prisma.order.findMany({
          where: { customerId: customer.id },
          select: { total: true }
        });

        const totalSpent = orders.reduce((sum, order) => sum + Number(order.total), 0);

        return {
          ...customer,
          totalOrders: customer._count.orders,
          totalSpent
        };
      })
    );

    res.json({
      success: true,
      data: customersWithStats
    });
  } catch (error) {
    next(error);
  }
});

// Get customer by ID
customerRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        tags: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          include: {
            status: true,
            items: true
          },
          orderBy: { createdAt: 'desc' }
        },
        bot: true
      }
    });

    if (!customer || customer.bot.userId !== userId) {
      throw new AppError('Customer not found', 404);
    }

    // Calculate stats
    const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
    const avgOrderValue = customer.orders.length > 0 ? totalSpent / customer.orders.length : 0;

    res.json({
      success: true,
      data: {
        ...customer,
        totalSpent,
        avgOrderValue,
        totalOrders: customer.orders.length
      }
    });
  } catch (error) {
    next(error);
  }
});

