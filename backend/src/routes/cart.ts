import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const cartRoutes = Router();

cartRoutes.use(authenticate);

// Get cart
cartRoutes.get('/:customerId', async (req: AuthRequest, res, next) => {
  try {
    const { customerId } = req.params;

    const cart = await prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { order: 'asc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      return res.json({
        success: true,
        data: {
          customerId,
          items: [],
          updatedAt: new Date()
        }
      });
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
});

// Add to cart
cartRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { botId, customerId, productId, quantity = 1 } = req.body;

    if (!botId || !customerId || !productId) {
      throw new AppError('Missing required fields', 400);
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { customerId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          customerId,
          botId
        }
      });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        customerId: cart.customerId,
        productId
      }
    });

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity
        }
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          customerId: cart.customerId,
          productId,
          quantity
        }
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedCart
    });
  } catch (error) {
    next(error);
  }
});

// Update cart item quantity
cartRoutes.put('/:customerId/items/:itemId', async (req: AuthRequest, res, next) => {
  try {
    const { customerId, itemId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      // Remove item
      await prisma.cartItem.delete({
        where: { id: itemId }
      });
    } else {
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity }
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
});

// Clear cart
cartRoutes.delete('/:customerId', async (req: AuthRequest, res, next) => {
  try {
    const { customerId } = req.params;

    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          customerId
        }
      }
    });

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    next(error);
  }
});

