import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const productRoutes = Router();

productRoutes.use(authenticate);

// Get products for bot
productRoutes.get('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { categoryId, search } = req.query;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const where: any = { botId };
    
    if (categoryId) {
      where.categories = {
        some: { categoryId: categoryId as string }
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { article: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        categories: {
          include: {
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
productRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        categories: {
          include: {
            category: true
          }
        },
        bot: true
      }
    });

    if (!product || product.bot.userId !== userId) {
      throw new AppError('Product not found', 404);
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// Create product
productRoutes.post('/bots/:botId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { botId } = req.params;
    const { name, description, price, article, stockQuantity, unlimitedStock, categoryIds, images } = req.body;

    if (!name || price === undefined) {
      throw new AppError('Name and price are required', 400);
    }

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const product = await prisma.product.create({
      data: {
        botId,
        name,
        description: description || '',
        price,
        article: article || null,
        stockQuantity: stockQuantity || 0,
        unlimitedStock: unlimitedStock || false,
        categories: {
          create: (categoryIds || []).map((catId: string) => ({
            categoryId: catId
          }))
        },
        images: {
          create: (images || []).map((img: { url: string; order: number }, index: number) => ({
            url: img.url,
            order: img.order !== undefined ? img.order : index
          }))
        }
      },
      include: {
        images: true,
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// Update product
productRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, description, price, article, stockQuantity, unlimitedStock, isActive, categoryIds, images } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { bot: true }
    });

    if (!product || product.bot.userId !== userId) {
      throw new AppError('Product not found', 404);
    }

    // Update product
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(article !== undefined && { article }),
        ...(stockQuantity !== undefined && { stockQuantity }),
        ...(unlimitedStock !== undefined && { unlimitedStock }),
        ...(isActive !== undefined && { isActive })
      }
    });

    // Update categories if provided
    if (categoryIds !== undefined) {
      await prisma.productCategory.deleteMany({
        where: { productId: id }
      });

      if (categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: categoryIds.map((catId: string) => ({
            productId: id,
            categoryId: catId
          }))
        });
      }
    }

    // Update images if provided
    if (images !== undefined) {
      await prisma.productImage.deleteMany({
        where: { productId: id }
      });

      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: { url: string; order: number }, index: number) => ({
            productId: id,
            url: img.url,
            order: img.order !== undefined ? img.order : index
          }))
        });
      }
    }

    const result = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Delete product
productRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { bot: true }
    });

    if (!product || product.bot.userId !== userId) {
      throw new AppError('Product not found', 404);
    }

    await prisma.product.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

