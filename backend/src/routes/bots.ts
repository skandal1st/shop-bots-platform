import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import axios from 'axios';

export const botRoutes = Router();

// All routes require authentication
botRoutes.use(authenticate);

// Get all bots for user
botRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const bots = await prisma.bot.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        adminTelegramId: true,
        welcomeMessage: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: bots.map((bot: any) => ({
        ...bot,
        adminTelegramId: bot.adminTelegramId?.toString()
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get bot by ID
botRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const bot = await prisma.bot.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    res.json({
      success: true,
      data: {
        ...bot,
        adminTelegramId: bot.adminTelegramId?.toString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create bot
botRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { token, name } = req.body;

    if (!token) {
      throw new AppError('Bot token is required', 400);
    }

    // Validate token with Telegram API
    try {
      const response = await axios.get(
        `${process.env.TELEGRAM_API_URL || 'https://api.telegram.org/bot'}${token}/getMe`
      );

      if (!response.data.ok) {
        throw new AppError('Invalid bot token', 400);
      }

      const botInfo = response.data.result;

      const bot = await prisma.bot.create({
        data: {
          userId,
          token,
          name: name || botInfo.username || 'My Bot'
        }
      });

      // Create default order statuses
      const defaultStatuses = [
        { name: 'Новый', color: '#1890ff', order: 0, isDefault: true },
        { name: 'Подтвержден', color: '#52c41a', order: 1, isDefault: false },
        { name: 'В обработке', color: '#faad14', order: 2, isDefault: false },
        { name: 'Отправлен', color: '#722ed1', order: 3, isDefault: false },
        { name: 'Доставлен', color: '#52c41a', order: 4, isDefault: false },
        { name: 'Отменен', color: '#ff4d4f', order: 5, isDefault: false }
      ];

      await prisma.orderStatus.createMany({
        data: defaultStatuses.map(status => ({
          ...status,
          botId: bot.id
        }))
      });

      res.status(201).json({
        success: true,
        data: bot
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to validate bot token', 400);
    }
  } catch (error) {
    next(error);
  }
});

// Update bot
botRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, isActive, adminTelegramId, welcomeMessage } = req.body;

    const bot = await prisma.bot.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const updated = await prisma.bot.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(adminTelegramId !== undefined && { adminTelegramId: adminTelegramId ? BigInt(adminTelegramId) : null }),
        ...(welcomeMessage !== undefined && { welcomeMessage })
      }
    });

    res.json({
      success: true,
      data: {
        ...updated,
        adminTelegramId: updated.adminTelegramId?.toString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete bot
botRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const bot = await prisma.bot.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    await prisma.bot.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Bot deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

