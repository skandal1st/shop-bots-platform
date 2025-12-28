import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const webhookRoutes = Router();

// POST /api/webhooks/yookassa - Webhook для уведомлений ЮКассы
webhookRoutes.post('/yookassa', async (req, res, next) => {
  try {
    const event = req.body;

    console.log('📥 YooKassa webhook received:', event.event);

    // Проверяем тип события
    if (event.event !== 'payment.succeeded') {
      console.log(`ℹ️  Skipping event: ${event.event}`);
      return res.json({ success: true });
    }

    const yooPayment = event.object;
    const paymentId = yooPayment.metadata?.paymentId;
    const planId = yooPayment.metadata?.planId;
    const userId = yooPayment.metadata?.userId;

    if (!paymentId || !planId || !userId) {
      console.error('❌ Invalid webhook payload - missing metadata');
      throw new AppError('Invalid webhook payload', 400);
    }

    // Находим платеж в БД
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      console.error(`❌ Payment not found: ${paymentId}`);
      throw new AppError('Payment not found', 404);
    }

    if (payment.status === 'succeeded') {
      console.log(`ℹ️  Payment already processed: ${paymentId}`);
      // Платеж уже обработан
      return res.json({ success: true });
    }

    // Получаем план
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      console.error(`❌ Plan not found: ${planId}`);
      throw new AppError('Plan not found', 404);
    }

    console.log(`✅ Processing payment for plan: ${plan.displayName}`);

    // Вычисляем дату окончания подписки (1 месяц от сегодня)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Создаем или обновляем подписку
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        startDate,
        endDate,
        autoRenew: false
      }
    });

    console.log(`✅ Subscription created: ${subscription.id}`);

    // Обновляем платеж
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'succeeded',
        subscriptionId: subscription.id,
        yookassaData: yooPayment
      }
    });

    // Деактивируем старые подписки пользователя (кроме текущей)
    const deactivated = await prisma.subscription.updateMany({
      where: {
        userId,
        id: { not: subscription.id },
        status: 'active'
      },
      data: {
        status: 'expired'
      }
    });

    console.log(`✅ Deactivated ${deactivated.count} old subscriptions`);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    next(error);
  }
});
