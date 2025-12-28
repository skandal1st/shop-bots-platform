import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Создаем тарифные планы
  console.log('Creating subscription plans...');

  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Free',
      price: 0,
      maxProducts: 10,
      features: [
        'До 10 товаров',
        'Базовый функционал',
        'Email поддержка'
      ],
      isActive: true
    }
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'premium' },
    update: {
      price: 1990,
      features: [
        'Безлимит товаров',
        'Приоритетная поддержка',
        'Расширенная аналитика',
        'API доступ'
      ]
    },
    create: {
      name: 'premium',
      displayName: 'Premium',
      price: 1990,
      maxProducts: -1, // Безлимит
      features: [
        'Безлимит товаров',
        'Приоритетная поддержка',
        'Расширенная аналитика',
        'API доступ'
      ],
      isActive: true
    }
  });

  console.log('✅ Subscription plans created:', {
    free: freePlan.id,
    premium: premiumPlan.id
  });

  // 2. Находим первого пользователя и делаем его superadmin
  console.log('Setting up superadmin...');

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' }
  });

  if (firstUser && firstUser.role !== 'superadmin') {
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'superadmin' }
    });
    console.log(`✅ User ${firstUser.email} promoted to superadmin`);
  } else if (firstUser) {
    console.log(`ℹ️  User ${firstUser.email} is already superadmin`);
  } else {
    console.log('⚠️  No users found. Superadmin will be set on first registration.');
  }

  // 3. Создаем Free подписки для всех существующих пользователей без подписки
  console.log('Creating Free subscriptions for existing users...');

  const users = await prisma.user.findMany({
    include: {
      subscriptions: {
        where: {
          status: 'active',
          endDate: { gte: new Date() }
        }
      }
    }
  });

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1); // 1 год от текущей даты

  let createdCount = 0;
  for (const user of users) {
    if (user.subscriptions.length === 0) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          status: 'active',
          startDate: new Date(),
          endDate,
          autoRenew: false
        }
      });
      createdCount++;
      console.log(`✅ Free subscription created for ${user.email}`);
    }
  }

  if (createdCount === 0) {
    console.log('ℹ️  All users already have active subscriptions');
  } else {
    console.log(`✅ Created ${createdCount} Free subscriptions`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
