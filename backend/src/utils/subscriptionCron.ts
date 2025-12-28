import { prisma } from './prisma';

export async function checkExpiredSubscriptions() {
  try {
    const now = new Date();

    // Находим подписки, которые истекли
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: { lt: now }
      }
    });

    // Обновляем статус на expired
    if (expiredSubscriptions.length > 0) {
      const updatePromises = expiredSubscriptions.map(subscription =>
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' }
        })
      );

      await Promise.all(updatePromises);

      console.log(`✅ Checked and updated ${expiredSubscriptions.length} expired subscriptions`);
    } else {
      console.log('ℹ️  No expired subscriptions found');
    }
  } catch (error) {
    console.error('❌ Error checking expired subscriptions:', error);
  }
}

// Запускать каждые 24 часа
export function startSubscriptionCron() {
  // Первоначальная проверка при старте
  checkExpiredSubscriptions();

  // Затем каждые 24 часа
  setInterval(checkExpiredSubscriptions, 24 * 60 * 60 * 1000);

  console.log('🔄 Subscription cron job started (runs every 24 hours)');
}
