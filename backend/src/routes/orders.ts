import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Helper function to send Telegram notification to customer
async function sendStatusNotificationToCustomer(
  botToken: string,
  customerTelegramId: bigint,
  orderNumber: string,
  statusName: string
) {
  try {
    const message =
      `📦 <b>Обновление статуса заказа</b>\n\n` +
      `Заказ: <b>#${orderNumber}</b>\n` +
      `Новый статус: <b>${statusName}</b>`;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: customerTelegramId.toString(),
      text: message,
      parse_mode: 'HTML'
    });

    console.log(`Status notification sent to customer ${customerTelegramId} for order ${orderNumber}`);
  } catch (error: any) {
    console.error('Error sending status notification:', error.response?.data || error.message);
  }
}

export const orderRoutes = Router();

orderRoutes.use(authenticate);

// Get orders for bot
orderRoutes.get('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { statusId, customerId, startDate, endDate } = req.query;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const where: any = { botId };

    if (statusId) {
      where.statusId = statusId as string;
    }

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        status: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Convert BigInt to string for JSON serialization
    const ordersData = orders.map((order: any) => ({
      ...order,
      customer: {
        ...order.customer,
        telegramId: order.customer.telegramId.toString()
      }
    }));

    res.json({
      success: true,
      data: ordersData
    });
  } catch (error) {
    next(error);
  }
});

// Get order by ID
orderRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        status: true,
        items: true,
        statusHistory: {
          include: {
            status: true
          },
          orderBy: { changedAt: 'desc' }
        },
        bot: true
      }
    });

    if (!order || order.bot.userId !== userId) {
      throw new AppError('Order not found', 404);
    }

    // Convert BigInt to string for JSON serialization
    const orderData = {
      ...order,
      customer: {
        ...order.customer,
        telegramId: order.customer.telegramId.toString()
      },
      bot: {
        ...order.bot,
        adminTelegramId: order.bot.adminTelegramId?.toString() || null
      }
    };

    res.json({
      success: true,
      data: orderData
    });
  } catch (error) {
    next(error);
  }
});

// Update order status
orderRoutes.put('/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { statusId, adminNotes } = req.body;

    if (!statusId) {
      throw new AppError('Status ID is required', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { bot: true }
    });

    if (!order || order.bot.userId !== userId) {
      throw new AppError('Order not found', 404);
    }

    // Verify status belongs to bot
    const status = await prisma.orderStatus.findFirst({
      where: {
        id: statusId,
        botId: order.botId
      }
    });

    if (!status) {
      throw new AppError('Status not found', 404);
    }

    // Update order
    const updated = await prisma.order.update({
      where: { id },
      data: {
        statusId,
        ...(adminNotes !== undefined && { adminNotes })
      }
    });

    // Add to status history
    await prisma.statusHistory.create({
      data: {
        orderId: id,
        statusId,
        changedBy: userId
      }
    });

    const result = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        status: true,
        items: true,
        statusHistory: {
          include: {
            status: true
          },
          orderBy: { changedAt: 'desc' }
        },
        bot: true
      }
    });

    // Send notification to customer about status change
    if (result && result.bot.token && result.customer?.telegramId) {
      sendStatusNotificationToCustomer(
        result.bot.token,
        result.customer.telegramId,
        result.orderNumber,
        status.name
      ).catch(err => console.error('Failed to send status notification:', err));
    }

    // Convert BigInt to string for JSON serialization
    const resultData = {
      ...result,
      customer: {
        ...result!.customer,
        telegramId: result!.customer.telegramId.toString()
      },
      bot: {
        ...result!.bot,
        adminTelegramId: result!.bot.adminTelegramId?.toString() || null,
        token: undefined // Don't expose token in response
      }
    };

    res.json({
      success: true,
      data: resultData
    });
  } catch (error) {
    next(error);
  }
});

// Create order (for bot)
orderRoutes.post('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const { botId } = req.params;
    const { customerId, items, paymentMethod, deliveryAddress, customerComment } = req.body;

    if (!customerId || !items || !paymentMethod || !deliveryAddress) {
      throw new AppError('Missing required fields', 400);
    }

    // Calculate total
    let total = 0;
    for (const item of items) {
      total += parseFloat(item.price) * item.quantity;
    }

    // Get default status
    const defaultStatus = await prisma.orderStatus.findFirst({
      where: {
        botId,
        isDefault: true
      }
    });

    if (!defaultStatus) {
      throw new AppError('No default order status found', 500);
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        botId,
        customerId,
        orderNumber,
        total,
        statusId: defaultStatus.id,
        paymentMethod,
        deliveryAddress,
        customerComment: customerComment || null,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl || null
          }))
        },
        statusHistory: {
          create: {
            statusId: defaultStatus.id,
            changedBy: 'system'
          }
        }
      },
      include: {
        customer: true,
        status: true,
        items: true
      }
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});
