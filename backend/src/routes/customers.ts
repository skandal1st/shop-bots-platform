import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const customerRoutes = Router();

// Get or create customer by Telegram ID (public endpoint for bot)
customerRoutes.post('/bots/:botId/telegram', async (req, res, next) => {
  try {
    const { botId } = req.params;
    const { telegramId, username, firstName, lastName } = req.body;

    if (!telegramId || !firstName) {
      throw new AppError('telegramId and firstName are required', 400);
    }

    // Find existing customer by telegramId
    let customer = await prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!customer) {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          botId,
          telegramId: BigInt(telegramId),
          username: username || null,
          firstName,
          lastName: lastName || null
        }
      });
    } else {
      // Update customer info if it changed
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          username: username || customer.username,
          firstName: firstName || customer.firstName,
          lastName: lastName || customer.lastName
        }
      });
    }

    // Convert BigInt to string for JSON serialization
    const customerData = {
      ...customer,
      telegramId: customer.telegramId.toString()
    };

    res.json({
      success: true,
      data: customerData
    });
  } catch (error) {
    next(error);
  }
});

// Update customer (public endpoint for bot)
customerRoutes.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(phone !== undefined && { phone })
      }
    });

    // Convert BigInt to string for JSON serialization
    const customerData = {
      ...updated,
      telegramId: updated.telegramId.toString()
    };

    res.json({
      success: true,
      data: customerData
    });
  } catch (error) {
    next(error);
  }
});

// Apply authentication to all routes below
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
          telegramId: customer.telegramId.toString(),
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

    // Convert BigInt to string for JSON serialization
    const customerData = {
      ...customer,
      telegramId: customer.telegramId.toString(),
      bot: {
        ...customer.bot,
        adminTelegramId: customer.bot.adminTelegramId?.toString() || null
      },
      totalSpent,
      avgOrderValue,
      totalOrders: customer.orders.length
    };

    res.json({
      success: true,
      data: customerData
    });
  } catch (error) {
    next(error);
  }
});

