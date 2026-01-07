import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
// TODO: After installing @a2seven/yoo-checkout, uncomment:
// import { YooCheckout } from '@a2seven/yoo-checkout';

export const subscriptionRoutes = Router();

// Все маршруты требуют аутентификации
subscriptionRoutes.use(authenticate);

// TODO: After installing @a2seven/yoo-checkout, uncomment:
// const checkout = new YooCheckout({
//   shopId: process.env.YOOKASSA_SHOP_ID!,
//   secretKey: process.env.YOOKASSA_SECRET_KEY!
// });

// GET /api/subscriptions/plans - Получить все доступные планы
subscriptionRoutes.get('/plans', async (req: AuthRequest, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    res.json({
      success: true,
      data: plans.map((plan: any) => ({
        ...plan,
        price: Number(plan.price)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/subscriptions/current - Получить текущую подписку пользователя
subscriptionRoutes.get('/current', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        endDate: { gte: new Date() }
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: {
        endDate: 'desc'
      }
    });

    // Подсчитываем использование
    const bots = await prisma.bot.findMany({
      where: { userId },
      select: { id: true }
    });

    const botIds = bots.map((b: any) => b.id);
    const productCount = await prisma.product.count({
      where: { botId: { in: botIds } }
    });

    const maxProducts = subscription?.plan.maxProducts || 10;

    res.json({
      success: true,
      data: {
        subscription: subscription ? {
          ...subscription,
          plan: {
            ...subscription.plan,
            price: Number(subscription.plan.price)
          },
          payments: subscription.payments.map((p: any) => ({
            ...p,
            amount: Number(p.amount)
          }))
        } : null,
        usage: {
          products: productCount,
          maxProducts,
          isUnlimited: maxProducts === -1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/subscriptions/checkout - Создать платеж для подписки
subscriptionRoutes.post('/checkout', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { planId, returnUrl } = req.body;

    if (!planId || !returnUrl) {
      throw new AppError('planId and returnUrl are required', 400);
    }

    // Получаем план
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.isActive) {
      throw new AppError('Subscription plan not found', 404);
    }

    if (Number(plan.price) <= 0) {
      throw new AppError('Cannot create payment for free plan', 400);
    }

    // Создаем запись о платеже
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: plan.price,
        status: 'pending',
        metadata: {
          planId,
          planName: plan.name
        }
      }
    });

    // TODO: After installing @a2seven/yoo-checkout, uncomment and use real YooKassa integration:
    /*
    const yooPayment = await checkout.createPayment({
      amount: {
        value: plan.price.toString(),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      capture: true,
      description: `Подписка ${plan.displayName}`,
      metadata: {
        paymentId: payment.id,
        userId,
        planId
      }
    });

    // Обновляем платеж с данными ЮКассы
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        yookassaPaymentId: yooPayment.id,
        yookassaData: yooPayment as any
      }
    });

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        confirmationUrl: yooPayment.confirmation.confirmation_url
      }
    });
    */

    // Временный ответ для тестирования без ЮКассы
    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        confirmationUrl: '/test-payment', // В реальности будет URL ЮКассы
        message: 'YooKassa integration pending. Install @a2seven/yoo-checkout package.'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/subscriptions/payments - История платежей пользователя
subscriptionRoutes.get('/payments', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: payments.map((payment: any) => ({
        ...payment,
        amount: Number(payment.amount),
        subscription: payment.subscription ? {
          ...payment.subscription,
          plan: {
            ...payment.subscription.plan,
            price: Number(payment.subscription.plan.price)
          }
        } : null
      }))
    });
  } catch (error) {
    next(error);
  }
});
