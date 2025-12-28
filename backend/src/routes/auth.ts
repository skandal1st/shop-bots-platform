import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

export const authRoutes = Router();

// Register
authRoutes.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    // Создаем Free подписку для нового пользователя
    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: { name: 'free' }
    });

    if (freePlan) {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 год

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
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
authRoutes.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
authRoutes.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
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
        currentSubscription: user.subscriptions[0] ? {
          ...user.subscriptions[0],
          plan: {
            ...user.subscriptions[0].plan,
            price: Number(user.subscriptions[0].plan.price)
          }
        } : null,
        subscriptions: undefined // Удаляем массив subscriptions из ответа
      }
    });
  } catch (error) {
    next(error);
  }
});

