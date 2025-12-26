import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const settingsRoutes = Router();

settingsRoutes.use(authenticate);

// Get bot settings
settingsRoutes.get('/bots/:botId', async (req: AuthRequest, res, next) => {
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

    const [brandSettings, paymentSettings, notificationSettings, botMenu, templates] = await Promise.all([
      prisma.brandSettings.findUnique({ where: { botId } }),
      prisma.paymentSettings.findUnique({ where: { botId } }),
      prisma.notificationSettings.findUnique({ where: { botId } }),
      prisma.botMenu.findUnique({ where: { botId } }),
      prisma.messageTemplate.findMany({ where: { botId } })
    ]);

    res.json({
      success: true,
      data: {
        brand: brandSettings,
        payment: paymentSettings,
        notifications: notificationSettings,
        menu: botMenu,
        templates
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update brand settings
settingsRoutes.put('/bots/:botId/brand', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { storeName, logoUrl, description, contacts } = req.body;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const settings = await prisma.brandSettings.upsert({
      where: { botId },
      update: {
        ...(storeName !== undefined && { storeName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(description !== undefined && { description }),
        ...(contacts !== undefined && { contacts })
      },
      create: {
        botId,
        storeName: storeName || 'My Store',
        description: description || '',
        contacts: contacts || {}
      }
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// Update payment settings
settingsRoutes.put('/bots/:botId/payment', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { provider, apiKey, secretKey, testMode, currency, enabled } = req.body;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const settings = await prisma.paymentSettings.upsert({
      where: { botId },
      update: {
        ...(provider !== undefined && { provider }),
        ...(apiKey !== undefined && { apiKey }),
        ...(secretKey !== undefined && { secretKey }),
        ...(testMode !== undefined && { testMode }),
        ...(currency !== undefined && { currency }),
        ...(enabled !== undefined && { enabled })
      },
      create: {
        botId,
        provider: provider || 'manual',
        testMode: testMode !== undefined ? testMode : true,
        currency: currency || 'RUB',
        enabled: enabled || false
      }
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// Update notification settings
settingsRoutes.put('/bots/:botId/notifications', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { telegramIds, email, notifications } = req.body;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const settings = await prisma.notificationSettings.upsert({
      where: { botId },
      update: {
        ...(telegramIds !== undefined && { telegramIds }),
        ...(email !== undefined && { email }),
        ...(notifications !== undefined && { notifications })
      },
      create: {
        botId,
        telegramIds: telegramIds || [],
        email: email || {},
        notifications: notifications || {}
      }
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// Get/Update bot menu
settingsRoutes.get('/bots/:botId/menu', async (req: AuthRequest, res, next) => {
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

    const menu = await prisma.botMenu.findUnique({
      where: { botId }
    });

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    next(error);
  }
});

settingsRoutes.put('/bots/:botId/menu', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { buttons } = req.body;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const menu = await prisma.botMenu.upsert({
      where: { botId },
      update: {
        buttons: buttons || []
      },
      create: {
        botId,
        buttons: buttons || []
      }
    });

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    next(error);
  }
});

// Get/Update message templates
settingsRoutes.get('/bots/:botId/templates', async (req: AuthRequest, res, next) => {
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

    const templates = await prisma.messageTemplate.findMany({
      where: { botId }
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

settingsRoutes.put('/bots/:botId/templates/:key', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId, key } = req.params;
    const { text } = req.body;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const template = await prisma.messageTemplate.upsert({
      where: {
        botId_key: {
          botId,
          key
        }
      },
      update: {
        text: text || ''
      },
      create: {
        botId,
        key,
        text: text || ''
      }
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

