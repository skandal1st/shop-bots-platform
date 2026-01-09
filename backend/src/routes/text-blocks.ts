import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const textBlockRoutes = Router();

textBlockRoutes.use(authenticate);

// Get all text blocks for bot
textBlockRoutes.get('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const textBlocks = await prisma.botTextBlock.findMany({
      where: { botId },
      orderBy: { order: 'asc' }
    });

    res.json({
      success: true,
      data: textBlocks
    });
  } catch (error) {
    next(error);
  }
});

// Create text block
textBlockRoutes.post('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { title, emoji, content, isActive, order } = req.body;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    if (!title || !content) {
      throw new AppError('Title and content are required', 400);
    }

    const textBlock = await prisma.botTextBlock.create({
      data: {
        botId,
        title,
        emoji: emoji || null,
        content,
        isActive: isActive !== false,
        order: order || 0
      }
    });

    res.status(201).json({
      success: true,
      data: textBlock
    });
  } catch (error) {
    next(error);
  }
});

// Update text block
textBlockRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { title, emoji, content, isActive, order } = req.body;

    // Get text block with bot
    const textBlock = await prisma.botTextBlock.findUnique({
      where: { id },
      include: { bot: true }
    });

    if (!textBlock || textBlock.bot.userId !== userId) {
      throw new AppError('Text block not found', 404);
    }

    const updated = await prisma.botTextBlock.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(emoji !== undefined && { emoji }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order })
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

// Delete text block
textBlockRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Get text block with bot
    const textBlock = await prisma.botTextBlock.findUnique({
      where: { id },
      include: { bot: true }
    });

    if (!textBlock || textBlock.bot.userId !== userId) {
      throw new AppError('Text block not found', 404);
    }

    await prisma.botTextBlock.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Text block deleted'
    });
  } catch (error) {
    next(error);
  }
});
