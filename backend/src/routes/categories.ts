import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const categoryRoutes = Router();

categoryRoutes.use(authenticate);

// Get categories for bot
categoryRoutes.get('/bots/:botId', async (req: AuthRequest, res, next) => {
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

    const categories = await prisma.category.findMany({
      where: { botId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// Create category
categoryRoutes.post('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { name, parentId, emoji, order } = req.body;

    if (!name) {
      throw new AppError('Category name is required', 400);
    }

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const category = await prisma.category.create({
      data: {
        botId,
        name,
        parentId: parentId || null,
        emoji: emoji || null,
        order: order || 0
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// Update category
categoryRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, parentId, emoji, order, isActive } = req.body;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { bot: true }
    });

    if (!category || category.bot.userId !== userId) {
      throw new AppError('Category not found', 404);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(parentId !== undefined && { parentId }),
        ...(emoji !== undefined && { emoji }),
        ...(order !== undefined && { order }),
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

// Delete category
categoryRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { bot: true }
    });

    if (!category || category.bot.userId !== userId) {
      throw new AppError('Category not found', 404);
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

