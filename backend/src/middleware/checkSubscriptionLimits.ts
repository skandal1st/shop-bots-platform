import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';

export const checkProductLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;

    // Получаем активную подписку пользователя
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        endDate: { gte: new Date() }
      },
      include: {
        plan: true
      },
      orderBy: {
        endDate: 'desc'
      }
    });

    // Если нет активной подписки - используем Free план
    let maxProducts = 10; // Free план по умолчанию

    if (subscription) {
      maxProducts = subscription.plan.maxProducts;
    }

    // -1 означает безлимит
    if (maxProducts !== -1) {
      // Подсчитываем текущее количество товаров у бота
      const currentProductCount = await prisma.product.count({
        where: { botId }
      });

      if (currentProductCount >= maxProducts) {
        throw new AppError(
          `Достигнут лимит товаров для вашего тарифа (${maxProducts}). Обновите подписку для добавления большего количества товаров.`,
          403
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
