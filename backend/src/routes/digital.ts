import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

export const digitalRoutes = Router();

// Generate secure download token
function generateDownloadToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Get download by token (public endpoint)
digitalRoutes.get('/download/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const purchase = await prisma.digitalPurchase.findFirst({
      where: { downloadUrl: { contains: token } },
      include: {
        product: {
          include: {
            digitalContent: true
          }
        }
      }
    });

    if (!purchase) {
      throw new AppError('Download link not found', 404);
    }

    if (!purchase.product.digitalContent) {
      throw new AppError('Digital content not found', 404);
    }

    const content = purchase.product.digitalContent;

    // Check expiration
    if (purchase.expiresAt && new Date() > purchase.expiresAt) {
      throw new AppError('Download link has expired', 410);
    }

    // Check max downloads
    if (content.maxDownloads && purchase.downloadCount >= content.maxDownloads) {
      throw new AppError('Maximum download limit reached', 403);
    }

    // Update download count
    await prisma.digitalPurchase.update({
      where: { id: purchase.id },
      data: { downloadCount: { increment: 1 } }
    });

    // If file, redirect to file URL
    if (content.contentType === 'FILE' && content.fileUrl) {
      return res.redirect(content.fileUrl);
    }

    // If text key, show the key
    if (content.contentType === 'TEXT_KEY' && purchase.deliveredKey) {
      return res.json({
        success: true,
        data: {
          key: purchase.deliveredKey,
          productName: purchase.product.name
        }
      });
    }

    throw new AppError('Content not available', 404);
  } catch (error) {
    next(error);
  }
});

// Get customer's digital purchases (for miniapp)
digitalRoutes.get('/purchases/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { botId } = req.query;

    if (!botId) {
      throw new AppError('Bot ID is required', 400);
    }

    // Verify customer belongs to bot
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, botId: botId as string }
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const purchases = await prisma.digitalPurchase.findMany({
      where: { customerId },
      include: {
        product: {
          include: {
            images: { take: 1 },
            digitalContent: {
              select: {
                contentType: true,
                deliveryMethod: true,
                maxDownloads: true,
                expiresInHours: true
              }
            }
          }
        },
        order: {
          select: { orderNumber: true, createdAt: true }
        }
      },
      orderBy: { deliveredAt: 'desc' }
    });

    // Map purchases to hide sensitive data
    const safePurchases = purchases.map((p: any) => ({
      id: p.id,
      productName: p.product.name,
      productImage: p.product.images[0]?.url || null,
      orderNumber: p.order.orderNumber,
      orderDate: p.order.createdAt,
      contentType: p.product.digitalContent?.contentType,
      deliveryMethod: p.product.digitalContent?.deliveryMethod,
      hasKey: !!p.deliveredKey,
      hasDownload: !!p.downloadUrl,
      downloadCount: p.downloadCount,
      maxDownloads: p.product.digitalContent?.maxDownloads,
      expiresAt: p.expiresAt,
      deliveredAt: p.deliveredAt
    }));

    res.json({
      success: true,
      data: safePurchases
    });
  } catch (error) {
    next(error);
  }
});

// Get specific digital purchase content (for miniapp)
digitalRoutes.get('/purchases/:customerId/:purchaseId', async (req, res, next) => {
  try {
    const { customerId, purchaseId } = req.params;

    const purchase = await prisma.digitalPurchase.findFirst({
      where: {
        id: purchaseId,
        customerId
      },
      include: {
        product: {
          include: {
            digitalContent: true
          }
        }
      }
    });

    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    const content = purchase.product.digitalContent;

    // Check expiration
    if (purchase.expiresAt && new Date() > purchase.expiresAt) {
      throw new AppError('Content has expired', 410);
    }

    // Check max downloads for file
    if (content?.contentType === 'FILE' && content.maxDownloads && purchase.downloadCount >= content.maxDownloads) {
      throw new AppError('Maximum download limit reached', 403);
    }

    res.json({
      success: true,
      data: {
        productName: purchase.product.name,
        contentType: content?.contentType,
        key: purchase.deliveredKey,
        downloadUrl: purchase.downloadUrl,
        downloadCount: purchase.downloadCount,
        maxDownloads: content?.maxDownloads,
        expiresAt: purchase.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Deliver digital content after order (called by order creation flow)
export async function deliverDigitalContent(
  orderId: string,
  customerId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<Array<{ productId: string; delivered: boolean; key?: string; downloadUrl?: string; error?: string }>> {
  const results = [];

  for (const item of items) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { digitalContent: true }
      });

      if (!product || product.productType !== 'DIGITAL' || !product.digitalContent) {
        continue;
      }

      const content = product.digitalContent;

      // Skip if auto-delivery is disabled
      if (!content.autoDelivery) {
        results.push({ productId: item.productId, delivered: false, error: 'Auto-delivery disabled' });
        continue;
      }

      let deliveredKey: string | null = null;
      let downloadUrl: string | null = null;

      if (content.contentType === 'TEXT_KEY') {
        // Get available keys
        const keys = content.textKeys as string[];
        if (keys.length === 0) {
          results.push({ productId: item.productId, delivered: false, error: 'No keys available' });
          continue;
        }

        // Take first available key
        deliveredKey = keys[0];

        // Remove used key from array
        const remainingKeys = keys.slice(1);
        await prisma.digitalContent.update({
          where: { id: content.id },
          data: { textKeys: remainingKeys }
        });

        // Update stock quantity
        if (!product.unlimitedStock) {
          await prisma.product.update({
            where: { id: product.id },
            data: { stockQuantity: { decrement: 1 } }
          });
        }
      } else if (content.contentType === 'FILE') {
        // Generate download token
        const token = generateDownloadToken();
        downloadUrl = `/api/digital/download/${token}`;
      }

      // Calculate expiration
      let expiresAt: Date | null = null;
      if (content.expiresInHours) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + content.expiresInHours);
      }

      // Create digital purchase record
      await prisma.digitalPurchase.create({
        data: {
          orderId,
          productId: item.productId,
          customerId,
          deliveredKey,
          downloadUrl,
          expiresAt,
          deliveredAt: new Date()
        }
      });

      results.push({
        productId: item.productId,
        delivered: true,
        key: deliveredKey || undefined,
        downloadUrl: downloadUrl || undefined
      });
    } catch (error: any) {
      results.push({ productId: item.productId, delivered: false, error: error.message });
    }
  }

  return results;
}
