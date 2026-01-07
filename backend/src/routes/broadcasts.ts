import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import axios from 'axios';

export const broadcastRoutes = Router();

// All routes require authentication
broadcastRoutes.use(authenticate);

// Get all broadcasts for bot
broadcastRoutes.get('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;

    // Check bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const broadcasts = await prisma.broadcast.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: broadcasts
    });
  } catch (error) {
    next(error);
  }
});

// Get broadcast by ID
broadcastRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        bot: {
          select: { userId: true }
        }
      }
    });

    if (!broadcast || broadcast.bot.userId !== userId) {
      throw new AppError('Broadcast not found', 404);
    }

    res.json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    next(error);
  }
});

// Create broadcast
broadcastRoutes.post('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { name, message, imageUrl, buttons, audienceFilter, scheduledAt } = req.body;

    // Check bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    if (!name || !message) {
      throw new AppError('Name and message are required', 400);
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        botId,
        name,
        message,
        imageUrl: imageUrl || null,
        buttons: buttons || [],
        audienceFilter: audienceFilter || { type: 'all' },
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });

    res.status(201).json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    next(error);
  }
});

// Update broadcast
broadcastRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, message, imageUrl, buttons, audienceFilter, scheduledAt } = req.body;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        bot: {
          select: { userId: true }
        }
      }
    });

    if (!broadcast || broadcast.bot.userId !== userId) {
      throw new AppError('Broadcast not found', 404);
    }

    if (broadcast.sentAt) {
      throw new AppError('Cannot edit sent broadcast', 400);
    }

    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(message !== undefined && { message }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(buttons !== undefined && { buttons }),
        ...(audienceFilter !== undefined && { audienceFilter }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null })
      }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

// Delete broadcast
broadcastRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        bot: {
          select: { userId: true }
        }
      }
    });

    if (!broadcast || broadcast.bot.userId !== userId) {
      throw new AppError('Broadcast not found', 404);
    }

    await prisma.broadcast.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Broadcast deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Send test broadcast to admin
broadcastRoutes.post('/:id/test', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        bot: {
          select: { userId: true, token: true, adminTelegramId: true }
        }
      }
    });

    if (!broadcast || broadcast.bot.userId !== userId) {
      throw new AppError('Broadcast not found', 404);
    }

    if (!broadcast.bot.adminTelegramId) {
      throw new AppError('Admin Telegram ID not configured for this bot', 400);
    }

    // Send test message
    const result = await sendBroadcastMessage(
      broadcast.bot.token,
      broadcast.bot.adminTelegramId.toString(),
      broadcast.message,
      broadcast.imageUrl,
      broadcast.buttons as any[]
    );

    if (!result.success) {
      throw new AppError(`Failed to send test message: ${result.error}`, 500);
    }

    res.json({
      success: true,
      message: 'Test broadcast sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Send broadcast to all recipients
broadcastRoutes.post('/:id/send', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        bot: {
          select: { id: true, userId: true, token: true }
        }
      }
    });

    if (!broadcast || broadcast.bot.userId !== userId) {
      throw new AppError('Broadcast not found', 404);
    }

    if (broadcast.sentAt) {
      throw new AppError('Broadcast already sent', 400);
    }

    // Get recipients based on audience filter
    const audienceFilter = broadcast.audienceFilter as {
      type: 'all' | 'with_orders' | 'without_orders' | 'registered_after' | 'registered_before';
      date?: string;
    };

    let whereClause: any = {
      botId: broadcast.botId
    };

    switch (audienceFilter.type) {
      case 'with_orders':
        whereClause.orders = { some: {} };
        break;
      case 'without_orders':
        whereClause.orders = { none: {} };
        break;
      case 'registered_after':
        if (audienceFilter.date) {
          whereClause.createdAt = { gte: new Date(audienceFilter.date) };
        }
        break;
      case 'registered_before':
        if (audienceFilter.date) {
          whereClause.createdAt = { lte: new Date(audienceFilter.date) };
        }
        break;
      // 'all' - no additional filter
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      select: { telegramId: true }
    });

    // Update broadcast with total count
    await prisma.broadcast.update({
      where: { id },
      data: {
        stats: { total: customers.length, sent: 0, failed: 0 }
      }
    });

    // Send messages (in background)
    let sent = 0;
    let failed = 0;

    for (const customer of customers) {
      const result = await sendBroadcastMessage(
        broadcast.bot.token,
        customer.telegramId.toString(),
        broadcast.message,
        broadcast.imageUrl,
        broadcast.buttons as any[]
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting: max 30 messages per second for Telegram
      await new Promise(resolve => setTimeout(resolve, 35));
    }

    // Update broadcast stats and mark as sent
    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        sentAt: new Date(),
        stats: { total: customers.length, sent, failed }
      }
    });

    res.json({
      success: true,
      data: updated,
      message: `Broadcast sent: ${sent} delivered, ${failed} failed`
    });
  } catch (error) {
    next(error);
  }
});

// Get audience count preview
broadcastRoutes.post('/bots/:botId/audience-count', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { audienceFilter } = req.body;

    // Check bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const filter = audienceFilter as {
      type: 'all' | 'with_orders' | 'without_orders' | 'registered_after' | 'registered_before';
      date?: string;
    };

    let whereClause: any = { botId };

    switch (filter?.type) {
      case 'with_orders':
        whereClause.orders = { some: {} };
        break;
      case 'without_orders':
        whereClause.orders = { none: {} };
        break;
      case 'registered_after':
        if (filter.date) {
          whereClause.createdAt = { gte: new Date(filter.date) };
        }
        break;
      case 'registered_before':
        if (filter.date) {
          whereClause.createdAt = { lte: new Date(filter.date) };
        }
        break;
    }

    const count = await prisma.customer.count({
      where: whereClause
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to send broadcast message via Telegram
async function sendBroadcastMessage(
  botToken: string,
  chatId: string,
  message: string,
  imageUrl: string | null,
  buttons: Array<{ text: string; url: string }> | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const TELEGRAM_API = `https://api.telegram.org/bot${botToken}`;

    // Build inline keyboard if buttons provided
    const replyMarkup = buttons && buttons.length > 0
      ? {
          inline_keyboard: buttons.map(btn => [{
            text: btn.text,
            url: btn.url
          }])
        }
      : undefined;

    if (imageUrl) {
      // Send photo with caption
      await axios.post(`${TELEGRAM_API}/sendPhoto`, {
        chat_id: chatId,
        photo: imageUrl,
        caption: message,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
    } else {
      // Send text message
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
    }

    return { success: true };
  } catch (error: any) {
    const errorMessage = error.response?.data?.description || error.message;
    console.error(`Failed to send broadcast to ${chatId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}
