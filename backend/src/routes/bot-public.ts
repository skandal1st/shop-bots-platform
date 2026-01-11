import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import axios from 'axios';
import { deliverDigitalContent } from './digital';

export const botPublicRoutes = Router();

// Get all active bots (for bot manager)
botPublicRoutes.get('/bots/active', async (req, res, next) => {
  try {
    const bots = await prisma.bot.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        token: true,
        isActive: true
      }
    });

    res.json(bots);
  } catch (error) {
    next(error);
  }
});

// Helper function to escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper function to send admin notification
async function sendAdminNotification(
  bot: any,
  order: any,
  customer: any,
  items: any[]
) {
  try {
    if (!bot.adminTelegramId || !bot.token) {
      console.log('Admin notification skipped: adminTelegramId or bot token not configured');
      return;
    }

    // Get customer phone
    const customerData = await prisma.customer.findUnique({
      where: { id: customer.id }
    });

    // Get product details with article
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    // Format product list with name, article, and quantity
    let productList = '';
    for (const item of items) {
      const product = products.find((p: any) => p.id === item.productId);
      const article = escapeHtml(product?.article || 'N/A');
      const productName = escapeHtml(item.productName);
      productList += `• ${productName} - ${article} - ${item.quantity} шт.\n`;
    }

    // Build admin notification message using HTML
    const firstName = escapeHtml(customer.firstName);
    const lastName = customer.lastName ? escapeHtml(customer.lastName) : '';
    const username = customer.username ? '@' + escapeHtml(customer.username) : 'не указан';
    const address = escapeHtml(order.deliveryAddress);
    const phone = customerData?.phone ? escapeHtml(customerData.phone) : 'не указан';
    const payment = escapeHtml(order.paymentMethod);

    const adminMessage =
      `🔔 <b>Новый заказ #${escapeHtml(order.orderNumber)}</b>\n\n` +
      `👤 <b>Покупатель:</b>\n` +
      `<a href="tg://user?id=${customer.telegramId}">${firstName}${lastName ? ' ' + lastName : ''}</a>\n` +
      `Username: ${username}\n\n` +
      `📦 <b>Товары:</b>\n${productList}\n` +
      `📍 <b>Адрес доставки:</b> ${address}\n` +
      `📱 <b>Телефон:</b> ${phone}\n` +
      `💳 <b>Способ оплаты:</b> ${payment}\n\n` +
      `💰 <b>Итого:</b> ${order.total} ₽`;

    // Send notification via Telegram Bot API
    await axios.post(
      `https://api.telegram.org/bot${bot.token}/sendMessage`,
      {
        chat_id: bot.adminTelegramId.toString(),
        text: adminMessage,
        parse_mode: 'HTML'
      }
    );

    console.log(`Admin notification sent for order ${order.orderNumber}`);
  } catch (error: any) {
    console.error('Error sending admin notification:', error.response?.data || error.message);
  }
}

// Get Telegram user info by chat ID
botPublicRoutes.get('/bots/:botId/users/:telegramId', async (req, res, next) => {
  try {
    const { botId, telegramId } = req.params;

    // Get bot token
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: { token: true }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // Get user info from Telegram
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${bot.token}/getChat`,
        { params: { chat_id: telegramId } }
      );

      if (response.data.ok) {
        const chat = response.data.result;
        res.json({
          success: true,
          data: {
            telegramId: chat.id,
            username: chat.username || null,
            firstName: chat.first_name || 'User',
            lastName: chat.last_name || null
          }
        });
      } else {
        throw new Error('Failed to get user info from Telegram');
      }
    } catch (error) {
      console.error('Error getting user from Telegram:', error);
      res.json({
        success: true,
        data: {
          telegramId: parseInt(telegramId),
          username: null,
          firstName: 'User',
          lastName: null
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get bot details
botPublicRoutes.get('/bots/:botId', async (req, res, next) => {
  try {
    const { botId } = req.params;

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        name: true,
        adminTelegramId: true,
        welcomeMessage: true,
        isActive: true
      }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    res.json({
      success: true,
      data: {
        ...bot,
        adminTelegramId: bot.adminTelegramId?.toString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get bot templates (welcome message, etc.)
botPublicRoutes.get('/bots/:botId/templates', async (req, res, next) => {
  try {
    const { botId } = req.params;
    const { key } = req.query;

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        welcomeMessage: true
      }
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    let text = 'Добро пожаловать! 🛍️';

    if (key === 'welcome' && bot.welcomeMessage) {
      text = bot.welcomeMessage;
    }

    res.json({
      success: true,
      data: { text }
    });
  } catch (error) {
    next(error);
  }
});

// Get bot menu buttons
botPublicRoutes.get('/bots/:botId/menu', async (req, res, next) => {
  try {
    const { botId } = req.params;

    // Default menu buttons
    const buttons = [
      [
        { text: 'Каталог', emoji: '📂' },
        { text: 'Корзина', emoji: '🛒' }
      ],
      [
        { text: 'Мои заказы', emoji: '📦' },
        { text: 'Поддержка', emoji: '💬' }
      ]
    ];

    res.json({
      success: true,
      data: { buttons }
    });
  } catch (error) {
    next(error);
  }
});

// Get text blocks for bot
botPublicRoutes.get('/bots/:botId/text-blocks', async (req, res, next) => {
  try {
    const { botId } = req.params;

    const textBlocks = await prisma.botTextBlock.findMany({
      where: {
        botId,
        isActive: true
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        emoji: true,
        content: true
      }
    });

    res.json({
      success: true,
      data: textBlocks
    });
  } catch (error) {
    next(error);
  }
});

// Get categories for bot
botPublicRoutes.get('/bots/:botId/categories', async (req, res, next) => {
  try {
    const { botId } = req.params;

    const categories = await prisma.category.findMany({
      where: {
        botId,
        isActive: true
      },
      orderBy: { order: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// Get products for bot
botPublicRoutes.get('/bots/:botId/products', async (req, res, next) => {
  try {
    const { botId } = req.params;
    const { categoryId } = req.query;

    const where: any = {
      botId,
      isActive: true
    };

    if (categoryId) {
      where.categories = {
        some: {
          categoryId: categoryId as string
        }
      };
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
      }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

// Get single product
botPublicRoutes.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!product) {
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

// Get cart
botPublicRoutes.get('/carts/:customerId', async (req, res, next) => {
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
                  orderBy: { order: 'asc' }
                }
              }
            }
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

// Add to cart
botPublicRoutes.post('/carts', async (req, res, next) => {
  try {
    const { botId, customerId, productId, quantity } = req.body;

    if (!customerId || !productId) {
      throw new AppError('customerId and productId are required', 400);
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
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId
        }
      }
    });

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + (quantity || 1)
        }
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          customerId,
          productId,
          quantity: quantity || 1
        }
      });
    }

    res.json({
      success: true,
      message: 'Item added to cart'
    });
  } catch (error) {
    next(error);
  }
});

// Update cart item quantity
botPublicRoutes.put('/carts/:customerId/items/:productId', async (req, res, next) => {
  try {
    const { customerId, productId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      // Delete item
      await prisma.cartItem.delete({
        where: {
          customerId_productId: {
            customerId,
            productId
          }
        }
      });
    } else {
      // Update quantity
      await prisma.cartItem.update({
        where: {
          customerId_productId: {
            customerId,
            productId
          }
        },
        data: { quantity }
      });
    }

    res.json({
      success: true,
      message: 'Cart updated'
    });
  } catch (error) {
    next(error);
  }
});

// Clear cart
botPublicRoutes.delete('/carts/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;

    // Delete all cart items for this customer
    await prisma.cartItem.deleteMany({
      where: { customerId }
    });

    // Delete cart
    const cart = await prisma.cart.findUnique({
      where: { customerId }
    });

    if (cart) {
      await prisma.cart.delete({
        where: { customerId }
      });
    }

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    next(error);
  }
});

// Create support ticket
botPublicRoutes.post('/support/bots/:botId', async (req, res, next) => {
  try {
    const { botId } = req.params;
    const { customerId, message } = req.body;

    if (!customerId || !message) {
      throw new AppError('customerId and message are required', 400);
    }

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        botId,
        customerId,
        status: 'open',
        messages: {
          create: {
            senderType: 'customer',
            senderId: customerId,
            text: message
          }
        }
      },
      include: {
        messages: true
      }
    });

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// Get support ticket by ID
botPublicRoutes.get('/support/tickets/:ticketId', async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        messages: {
          orderBy: { sentAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Convert BigInt to string for customer
    const ticketData = {
      ...ticket,
      customer: {
        ...ticket.customer,
        telegramId: ticket.customer.telegramId.toString()
      }
    };

    res.json({
      success: true,
      data: ticketData
    });
  } catch (error) {
    next(error);
  }
});

// Add message to support ticket
botPublicRoutes.post('/support/tickets/:ticketId/messages', async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { senderType, senderId, text } = req.body;

    if (!senderType || !senderId || !text) {
      throw new AppError('senderType, senderId, and text are required', 400);
    }

    // Verify ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Create message
    const message = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderType,
        senderId,
        text
      }
    });

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
});

// Get customer orders
botPublicRoutes.get('/bots/:botId/orders', async (req, res, next) => {
  try {
    const { botId } = req.params;
    const { customerId } = req.query;

    const where: any = { botId };

    if (customerId) {
      where.customerId = customerId as string;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        status: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
});

// Create order
botPublicRoutes.post('/orders/bots/:botId', async (req, res, next) => {
  try {
    const { botId } = req.params;
    const { customerId, items, paymentMethod, deliveryAddress, customerComment } = req.body;

    if (!customerId || !items || items.length === 0) {
      throw new AppError('customerId and items are required', 400);
    }

    // Verify customer belongs to this bot
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, botId }
    });

    if (!customer) {
      throw new AppError('Customer not found for this bot', 404);
    }

    // Get default status
    const defaultStatus = await prisma.orderStatus.findFirst({
      where: {
        botId,
        isDefault: true
      }
    });

    if (!defaultStatus) {
      throw new AppError('No default order status found', 500);
    }

    // Calculate total
    const total = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Generate unique order number (global count + timestamp for uniqueness)
    const orderCount = await prisma.order.count();
    const timestamp = Date.now().toString(36).toUpperCase();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}-${timestamp}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        botId,
        customerId,
        orderNumber,
        total,
        statusId: defaultStatus.id,
        paymentMethod: paymentMethod || 'Не указан',
        deliveryAddress: deliveryAddress || '',
        customerComment: customerComment || null,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl
          }))
        }
      },
      include: {
        items: true,
        status: true
      }
    });

    // Update customer's last order date
    await prisma.customer.update({
      where: { id: customerId },
      data: { lastOrderAt: new Date() }
    });

    // Get bot data for notification
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        token: true,
        adminTelegramId: true
      }
    });

    // Send notification to admin (async, don't wait)
    // customer is already fetched above for validation
    if (bot && customer) {
      sendAdminNotification(bot, order, customer, items).catch(err =>
        console.error('Failed to send admin notification:', err)
      );
    }

    // Digital content delivery is handled when order status changes to "paid"
    // See orders.ts for status change handling

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});
