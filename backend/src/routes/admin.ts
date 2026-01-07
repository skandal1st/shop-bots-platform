import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireSuperAdmin, AuthRequest } from '../middleware/auth';

export const adminRoutes = Router();

// Все маршруты требуют аутентификации и роли superadmin
adminRoutes.use(authenticate);
adminRoutes.use(requireSuperAdmin);

// GET /api/admin/users - Список всех пользователей с пагинацией
adminRoutes.get('/users', async (req: AuthRequest, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.email = {
        contains: search as string,
        mode: 'insensitive'
      };
    }

    if (status === 'blocked') {
      where.isBlocked = true;
    } else if (status === 'active') {
      where.isBlocked = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          subscriptions: {
            where: {
              status: 'active',
              endDate: { gte: new Date() }
            },
            include: {
              plan: true
            },
            orderBy: { endDate: 'desc' },
            take: 1
          },
          bots: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          },
          _count: {
            select: {
              bots: true,
              payments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((user: any) => ({
          ...user,
          subscriptions: user.subscriptions.map((sub: any) => ({
            ...sub,
            plan: {
              ...sub.plan,
              price: Number(sub.plan.price)
            }
          }))
        })),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:id - Детальная информация о пользователе
adminRoutes.get('/users/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            plan: true,
            payments: true
          },
          orderBy: { createdAt: 'desc' }
        },
        bots: {
          include: {
            _count: {
              select: {
                products: true,
                orders: true,
                customers: true
              }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        ...user,
        subscriptions: user.subscriptions.map((sub: any) => ({
          ...sub,
          plan: {
            ...sub.plan,
            price: Number(sub.plan.price)
          },
          payments: sub.payments.map((p: any) => ({
            ...p,
            amount: Number(p.amount)
          }))
        })),
        payments: user.payments.map((p: any) => ({
          ...p,
          amount: Number(p.amount)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/block - Блокировка/разблокировка пользователя
adminRoutes.put('/users/:id/block', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== 'boolean') {
      throw new AppError('isBlocked must be a boolean', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked },
      select: {
        id: true,
        email: true,
        isBlocked: true,
        role: true
      }
    });

    res.json({
      success: true,
      data: user,
      message: isBlocked ? 'User blocked' : 'User unblocked'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/role - Изменение роли пользователя
adminRoutes.put('/users/:id/role', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'superadmin'].includes(role)) {
      throw new AppError('Invalid role. Must be "user" or "superadmin"', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    res.json({
      success: true,
      data: user,
      message: `Role updated to ${role}`
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/subscriptions/assign - Назначить подписку пользователю
adminRoutes.post('/subscriptions/assign', async (req: AuthRequest, res, next) => {
  try {
    const { userId, planId, durationMonths = 1 } = req.body;

    if (!userId || !planId) {
      throw new AppError('userId and planId are required', 400);
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new AppError('Plan not found', 404);
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        startDate,
        endDate,
        autoRenew: false
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    // Деактивируем старые подписки
    await prisma.subscription.updateMany({
      where: {
        userId,
        id: { not: subscription.id },
        status: 'active'
      },
      data: {
        status: 'expired'
      }
    });

    res.json({
      success: true,
      data: {
        ...subscription,
        plan: {
          ...subscription.plan,
          price: Number(subscription.plan.price)
        }
      },
      message: 'Subscription assigned successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/subscriptions/:id/cancel - Отменить подписку
adminRoutes.put('/subscriptions/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        autoRenew: false
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        ...subscription,
        plan: {
          ...subscription.plan,
          price: Number(subscription.plan.price)
        }
      },
      message: 'Subscription cancelled'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/stats - Статистика платформы
adminRoutes.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const { period = '30d' } = req.query;

    const now = new Date();
    const periodStart = new Date();

    if (period === '7d') {
      periodStart.setDate(periodStart.getDate() - 7);
    } else if (period === '30d') {
      periodStart.setDate(periodStart.getDate() - 30);
    } else if (period === '90d') {
      periodStart.setDate(periodStart.getDate() - 90);
    }

    // Общая статистика
    const [
      totalUsers,
      totalBots,
      activeSubscriptions,
      totalRevenue,
      newUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.bot.count(),
      prisma.subscription.count({
        where: {
          status: 'active',
          endDate: { gte: now }
        }
      }),
      prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true }
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: periodStart }
        }
      })
    ]);

    // Подписки по планам
    const subscriptionsByPlan = await prisma.subscription.groupBy({
      by: ['planId'],
      where: {
        status: 'active',
        endDate: { gte: now }
      },
      _count: true
    });

    const planDetails = await prisma.subscriptionPlan.findMany();
    const subscriptionStats = subscriptionsByPlan.map((sub: any) => {
      const plan = planDetails.find((p: any) => p.id === sub.planId);
      return {
        planName: plan?.displayName || 'Unknown',
        count: sub._count
      };
    });

    // График новых пользователей по дням (последние 30 дней)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const usersByDay = await Promise.all(
      last30Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const count = await prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDay
            }
          }
        });

        return {
          date: date.toISOString().split('T')[0],
          count
        };
      })
    );

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalBots,
          activeSubscriptions,
          totalRevenue: Number(totalRevenue._sum.amount || 0),
          newUsers
        },
        subscriptionsByPlan: subscriptionStats,
        userGrowth: usersByDay,
        period
      }
    });
  } catch (error) {
    next(error);
  }
});
