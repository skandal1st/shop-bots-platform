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
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: bots
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
      data: bot
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
    const { name, isActive } = req.body;

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
        ...(isActive !== undefined && { isActive })
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

