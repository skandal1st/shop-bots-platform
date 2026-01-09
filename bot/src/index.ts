import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

interface BotConfig {
  token: string;
  botId: string;
  apiUrl: string;
}

class ShopBot {
  private bot: TelegramBot;
  private config: BotConfig;
  private userStates: Map<number, string> = new Map();
  private userCategory: Map<number, string> = new Map(); // Track current category for back navigation

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new TelegramBot(config.token, { polling: true });
    this.setupHandlers();
  }

  public stop() {
    try {
      this.bot.stopPolling();
      console.log(`🛑 Bot ${this.config.botId} polling stopped`);
    } catch (error) {
      console.error(`Error stopping bot ${this.config.botId}:`, error);
    }
  }

  private setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendWelcomeMessage(chatId);
    });

    // Catalog command
    this.bot.onText(/\/catalog/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showCatalog(chatId);
    });

    // Cart command
    this.bot.onText(/\/cart/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showCart(chatId);
    });

    // Orders command
    this.bot.onText(/\/orders/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showOrders(chatId);
    });

    // Support command
    this.bot.onText(/\/support/, async (msg) => {
      const chatId = msg.chat.id;
      await this.showSupport(chatId);
    });

    // Callback queries
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const messageId = query.message?.message_id;
      const data = query.data;

      if (!chatId || !data) return;

      try {
        if (data === 'noop') {
          // Do nothing - just a placeholder button
          return;
        } else if (data.startsWith('category_')) {
          const categoryId = data.replace('category_', '');
          await this.showCategoryProducts(chatId, categoryId, 0, messageId);
        } else if (data.startsWith('catpage_')) {
          // Pagination: catpage_categoryId_page
          const parts = data.split('_');
          const categoryId = parts[1];
          const page = parseInt(parts[2]) || 0;
          await this.showCategoryProducts(chatId, categoryId, page, messageId);
        } else if (data.startsWith('product_')) {
          const productId = data.replace('product_', '');
          const categoryId = this.userCategory.get(chatId) || null;
          await this.showProduct(chatId, productId, categoryId);
        } else if (data.startsWith('add_to_cart_')) {
          const productId = data.replace('add_to_cart_', '');
          await this.addToCart(chatId, productId);
        } else if (data === 'back_to_catalog') {
          await this.showCatalog(chatId);
        } else if (data.startsWith('cart_')) {
          await this.handleCartAction(chatId, data);
        } else if (data === 'checkout') {
          await this.startCheckout(chatId);
        } else if (data.startsWith('payment_')) {
          const paymentMethod = data === 'payment_cash' ? 'Наличные при получении' : 'Банковский перевод';
          await this.completeCheckout(chatId, paymentMethod);
        } else if (data.startsWith('support_reply_')) {
          const ticketId = data.replace('support_reply_', '');
          await this.startSupportReply(chatId, ticketId);
        }
      } catch (error) {
        console.error('Error handling callback:', error);
        await this.bot.answerCallbackQuery(query.id, {
          text: 'Произошла ошибка',
          show_alert: true
        });
      }

      await this.bot.answerCallbackQuery(query.id);
    });

    // Text messages
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text || '';
      const state = this.userStates.get(chatId);

      // Handle cancel command
      if (text === '/cancel') {
        this.userStates.delete(chatId);
        await this.bot.sendMessage(chatId, 'Действие отменено');
        return;
      }

      // Handle checkout flow
      if (state?.startsWith('checkout_')) {
        await this.handleCheckoutStep(chatId, text, state);
        return;
      }

      // Handle support messages from customer
      if (state === 'support_waiting') {
        await this.handleSupportMessage(chatId, text);
        return;
      }

      // Handle support reply from admin
      if (state?.startsWith('support_reply_')) {
        const ticketId = state.replace('support_reply_', '');
        await this.handleSupportReply(chatId, ticketId, text);
        return;
      }

      // Handle menu button clicks
      if (text.includes('Каталог') || text.includes('📂')) {
        await this.showCatalog(chatId);
      } else if (text.includes('Корзина') || text.includes('🛒')) {
        await this.showCart(chatId);
      } else if (text.includes('Мои заказы') || text.includes('📦')) {
        await this.showOrders(chatId);
      } else if (text.includes('Поддержка') || text.includes('💬')) {
        await this.showSupport(chatId);
      }
    });
  }

  // Helper для преобразования относительных URL в абсолютные
  private getFullImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.config.apiUrl}${url}`;
  }

  private async sendWelcomeMessage(chatId: number) {
    try {
      // Get welcome template from API
      const response = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}/templates`, {
        params: { key: 'welcome' }
      });

      const welcomeText = response.data?.data?.text || 'Добро пожаловать в наш магазин! 🛍️';

      // Get menu buttons
      const menuResponse = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}/menu`);
      const menu = menuResponse.data?.data?.buttons || [];

      const keyboard = this.buildMenuKeyboard(menu, chatId);

      await this.bot.sendMessage(chatId, welcomeText, {
        reply_markup: {
          keyboard,
          resize_keyboard: true
        }
      });
    } catch (error) {
      console.error('Error sending welcome message:', error);
      await this.bot.sendMessage(chatId, 'Добро пожаловать! 🛍️');
    }
  }

  private buildMenuKeyboard(menu: any[], chatId?: number) {
    const keyboard = menu.map(row =>
      row.map((button: any) => ({
        text: button.emoji ? `${button.emoji} ${button.text}` : button.text
      }))
    );

    // Add Mini App button with user data
    const miniAppUrl = chatId
      ? `${this.config.apiUrl}/miniapp/index.html?botId=${this.config.botId}&userId=${chatId}`
      : `${this.config.apiUrl}/miniapp/index.html?botId=${this.config.botId}`;

    keyboard.push([{
      text: '🛍️ Открыть каталог',
      web_app: { url: miniAppUrl }
    }]);

    return keyboard;
  }

  private async showCatalog(chatId: number, categoryId?: string) {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}/categories`);
      const categories = response.data?.data || [];

      const keyboard: any[] = [];

      // Add Mini App button first
      keyboard.push([{
        text: '🛍️ Открыть каталог в приложении',
        web_app: { url: `${this.config.apiUrl}/miniapp/index.html?botId=${this.config.botId}&userId=${chatId}` }
      }]);

      if (categories.length > 0) {
        // Add category buttons
        categories.forEach((cat: any) => {
          keyboard.push([{
            text: cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name,
            callback_data: `category_${cat.id}`
          }]);
        });
      }

      await this.bot.sendMessage(chatId, 'Выберите способ просмотра каталога:', {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error showing catalog:', error);
      await this.bot.sendMessage(chatId, 'Ошибка загрузки каталога');
    }
  }

  private async showCategoryProducts(chatId: number, categoryId: string, page: number = 0, messageId?: number) {
    const ITEMS_PER_PAGE = 8;

    // Save current category for back navigation
    this.userCategory.set(chatId, categoryId);

    try {
      // Get category info
      const catResponse = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}/categories`);
      const categories = catResponse.data?.data || [];
      const category = categories.find((c: any) => c.id === categoryId);
      const categoryName = category ? (category.emoji ? `${category.emoji} ${category.name}` : category.name) : 'Категория';

      // Get products
      const response = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}/products`, {
        params: { categoryId }
      });
      const allProducts = response.data?.data || [];

      if (allProducts.length === 0) {
        await this.bot.sendMessage(chatId, 'В этой категории пока нет товаров');
        return;
      }

      // Pagination
      const totalPages = Math.ceil(allProducts.length / ITEMS_PER_PAGE);
      const startIdx = page * ITEMS_PER_PAGE;
      const products = allProducts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

      // Build keyboard with product buttons
      const keyboard: any[][] = [];

      // Product buttons (2 per row for better readability)
      for (let i = 0; i < products.length; i += 2) {
        const row: any[] = [];
        row.push({
          text: products[i].name,
          callback_data: `product_${products[i].id}`
        });
        if (products[i + 1]) {
          row.push({
            text: products[i + 1].name,
            callback_data: `product_${products[i + 1].id}`
          });
        }
        keyboard.push(row);
      }

      // Pagination buttons
      if (totalPages > 1) {
        const paginationRow: any[] = [];
        if (page > 0) {
          paginationRow.push({
            text: '◀️ Назад',
            callback_data: `catpage_${categoryId}_${page - 1}`
          });
        }
        paginationRow.push({
          text: `${page + 1}/${totalPages}`,
          callback_data: 'noop'
        });
        if (page < totalPages - 1) {
          paginationRow.push({
            text: 'Вперёд ▶️',
            callback_data: `catpage_${categoryId}_${page + 1}`
          });
        }
        keyboard.push(paginationRow);
      }

      // Back to categories button
      keyboard.push([{
        text: '↩️ К категориям',
        callback_data: 'back_to_catalog'
      }]);

      const text = `📦 *${categoryName}*\n\nВыберите товар:`;

      // Edit existing message or send new one
      if (messageId) {
        try {
          await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (e) {
          // If edit fails, send new message
          await this.bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        }
      } else {
        await this.bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    } catch (error) {
      console.error('Error showing category products:', error);
      await this.bot.sendMessage(chatId, 'Ошибка загрузки товаров');
    }
  }

  private async showProduct(chatId: number, productId: string, categoryId?: string | null) {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/public/products/${productId}`);
      const product = response.data?.data;

      if (!product) {
        await this.bot.sendMessage(chatId, 'Товар не найден');
        return;
      }

      const description = product.description || '';
      const text = `*${product.name}*\n\n${description}\n\n💰 Цена: ${product.price} ₽`;

      const keyboard: any[][] = [
        [{
          text: '🛒 Заказать',
          callback_data: `add_to_cart_${productId}`
        }]
      ];

      // Add back button if we know the category
      if (categoryId) {
        keyboard.push([{
          text: '↩️ Назад к товарам',
          callback_data: `category_${categoryId}`
        }]);
      } else {
        keyboard.push([{
          text: '↩️ К категориям',
          callback_data: 'back_to_catalog'
        }]);
      }

      if (product.images && product.images.length > 0) {
        const imageUrl = this.getFullImageUrl(product.images[0].url);
        await this.bot.sendPhoto(chatId, imageUrl, {
          caption: text,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } else {
        await this.bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    } catch (error) {
      console.error('Error showing product:', error);
    }
  }

  private async addToCart(chatId: number, productId: string) {
    try {
      // Get or create customer
      const customer = await this.getOrCreateCustomer(chatId);

      // Add to cart via API
      await axios.post(`${this.config.apiUrl}/api/public/carts`, {
        botId: this.config.botId,
        customerId: customer.id,
        productId,
        quantity: 1
      });

      await this.bot.sendMessage(chatId, '✅ Товар добавлен в корзину!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      await this.bot.sendMessage(chatId, 'Ошибка при добавлении в корзину');
    }
  }

  private async showCart(chatId: number) {
    try {
      const customer = await this.getOrCreateCustomer(chatId);

      const response = await axios.get(`${this.config.apiUrl}/api/public/carts/${customer.id}`);
      const cart = response.data?.data;

      if (!cart || cart.items.length === 0) {
        await this.bot.sendMessage(chatId, '🛒 Ваша корзина пуста');
        return;
      }

      let text = '🛒 *Ваша корзина:*\n\n';
      let total = 0;

      for (const item of cart.items) {
        const itemTotal = parseFloat(item.product.price) * item.quantity;
        total += itemTotal;
        text += `${item.product.name} x${item.quantity} - ${itemTotal} ₽\n`;
      }

      text += `\n💰 *Итого: ${total} ₽*`;

      const keyboard = [
        [{
          text: '🛍️ Открыть корзину в приложении',
          web_app: { url: `${this.config.apiUrl}/miniapp/index.html?botId=${this.config.botId}&userId=${chatId}&openCart=true` }
        }],
        [{
          text: '✅ Оформить заказ',
          callback_data: 'checkout'
        }]
      ];

      await this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error showing cart:', error);
    }
  }

  private async startCheckout(chatId: number) {
    try {
      // Check if cart is not empty
      const customer = await this.getOrCreateCustomer(chatId);
      const response = await axios.get(`${this.config.apiUrl}/api/public/carts/${customer.id}`);
      const cart = response.data?.data;

      if (!cart || cart.items.length === 0) {
        await this.bot.sendMessage(chatId, '🛒 Ваша корзина пуста');
        return;
      }

      this.userStates.set(chatId, 'checkout_phone');
      await this.bot.sendMessage(chatId, '📱 Введите ваш номер телефона:');
    } catch (error) {
      console.error('Error starting checkout:', error);
      await this.bot.sendMessage(chatId, 'Ошибка при оформлении заказа');
    }
  }

  private async handleCheckoutStep(chatId: number, text: string, state: string) {
    try {
      const customer = await this.getOrCreateCustomer(chatId);

      if (state === 'checkout_phone') {
        // Save phone and ask for address
        this.userStates.set(chatId, `checkout_address:${text}`);
        await this.bot.sendMessage(chatId, '📍 Введите адрес доставки:');
      } else if (state.startsWith('checkout_address:')) {
        const phone = state.split(':')[1];
        this.userStates.set(chatId, `checkout_payment:${phone}:${text}`);

        await this.bot.sendMessage(chatId, '💳 Выберите способ оплаты:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Наличные при получении', callback_data: 'payment_cash' }],
              [{ text: 'Банковский перевод', callback_data: 'payment_bank' }]
            ]
          }
        });
      } else if (state.startsWith('checkout_payment:')) {
        // This will be handled in callback query
      }
    } catch (error) {
      console.error('Error in checkout step:', error);
      await this.bot.sendMessage(chatId, 'Ошибка при оформлении заказа');
      this.userStates.delete(chatId);
    }
  }

  private async completeCheckout(chatId: number, paymentMethod: string) {
    try {
      const state = this.userStates.get(chatId);
      if (!state || !state.startsWith('checkout_payment:')) {
        await this.bot.sendMessage(chatId, 'Ошибка: данные заказа не найдены');
        return;
      }

      const [, phone, address] = state.split(':');
      const customer = await this.getOrCreateCustomer(chatId);

      // Update customer phone if provided
      if (phone) {
        try {
          await axios.patch(
            `${this.config.apiUrl}/api/customers/${customer.id}`,
            { phone }
          );
        } catch (error) {
          console.error('Error updating customer phone:', error);
        }
      }

      // Get cart
      const cartResponse = await axios.get(`${this.config.apiUrl}/api/public/carts/${customer.id}`);
      const cart = cartResponse.data?.data;

      if (!cart || cart.items.length === 0) {
        await this.bot.sendMessage(chatId, '🛒 Ваша корзина пуста');
        this.userStates.delete(chatId);
        return;
      }

      // Prepare order items with full product data for admin notification
      const itemsWithDetails = cart.items.map((item: any) => ({
        productId: item.product.id,
        productName: item.product.name,
        article: item.product.article,
        price: parseFloat(item.product.price),
        quantity: item.quantity,
        imageUrl: item.product.images?.[0]?.url || null
      }));

      // Prepare items for order creation (simpler format)
      const items = itemsWithDetails.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      }));

      // Create order
      const orderResponse = await axios.post(
        `${this.config.apiUrl}/api/public/orders/bots/${this.config.botId}`,
        {
          customerId: customer.id,
          items,
          paymentMethod,
          deliveryAddress: address,
          customerComment: null
        }
      );

      const order = orderResponse.data?.data;

      // Clear cart
      await axios.delete(`${this.config.apiUrl}/api/public/carts/${customer.id}`);

      // Send confirmation to customer
      await this.bot.sendMessage(
        chatId,
        `✅ Заказ #${order.orderNumber} успешно оформлен!\n\n` +
        `📦 Товаров: ${items.reduce((sum: number, item: any) => sum + item.quantity, 0)}\n` +
        `💰 Сумма: ${order.total} ₽\n` +
        `📍 Адрес: ${address}\n` +
        `💳 Оплата: ${paymentMethod}\n\n` +
        `Мы свяжемся с вами в ближайшее время!`
      );

      // Send notification to admin
      await this.sendAdminNotification(order, customer, itemsWithDetails, phone, address, paymentMethod);

      this.userStates.delete(chatId);
    } catch (error: any) {
      console.error('Error completing checkout:', error);
      await this.bot.sendMessage(chatId, 'Ошибка при оформлении заказа: ' + (error.response?.data?.message || error.message));
      this.userStates.delete(chatId);
    }
  }

  private async sendAdminNotification(
    order: any,
    customer: any,
    items: any[],
    phone: string,
    address: string,
    paymentMethod: string
  ) {
    try {
      // Get bot settings to retrieve adminTelegramId
      const botResponse = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}`);
      const bot = botResponse.data?.data;

      if (!bot?.adminTelegramId) {
        console.log('Admin Telegram ID not configured, skipping notification');
        return;
      }

      // Format product list with name, article, and quantity
      let productList = '';
      for (const item of items) {
        const article = item.article || 'N/A';
        productList += `• ${item.productName} - ${article} - ${item.quantity} шт.\n`;
      }

      // Build admin notification message using HTML
      const adminMessage =
        `🔔 <b>Новый заказ #${order.orderNumber}</b>\n\n` +
        `👤 <b>Покупатель:</b>\n` +
        `<a href="tg://user?id=${customer.telegramId}">${customer.firstName}${customer.lastName ? ' ' + customer.lastName : ''}</a>\n` +
        `Username: ${customer.username ? '@' + customer.username : 'не указан'}\n\n` +
        `📦 <b>Товары:</b>\n${productList}\n` +
        `📍 <b>Адрес доставки:</b> ${address}\n` +
        `📱 <b>Телефон:</b> ${phone}\n` +
        `💳 <b>Способ оплаты:</b> ${paymentMethod}\n\n` +
        `💰 <b>Итого:</b> ${order.total} ₽`;

      // Send notification to admin
      await this.bot.sendMessage(bot.adminTelegramId, adminMessage, {
        parse_mode: 'HTML'
      });

      console.log(`Admin notification sent for order ${order.orderNumber}`);
    } catch (error: any) {
      console.error('Error sending admin notification:', error.response?.data || error.message);
    }
  }

  private async showOrders(chatId: number) {
    try {
      const customer = await this.getOrCreateCustomer(chatId);

      const response = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}/orders`, {
        params: { customerId: customer.id }
      });
      const orders = response.data?.data || [];

      if (orders.length === 0) {
        await this.bot.sendMessage(chatId, 'У вас пока нет заказов');
        return;
      }

      for (const order of orders.slice(0, 5)) {
        const text = `📦 Заказ #${order.orderNumber}\nСтатус: ${order.status.name}\nСумма: ${order.total} ₽`;
        await this.bot.sendMessage(chatId, text);
      }
    } catch (error) {
      console.error('Error showing orders:', error);
    }
  }

  private async showSupport(chatId: number) {
    // Set user state to support mode
    this.userStates.set(chatId, 'support_waiting');
    await this.bot.sendMessage(
      chatId,
      '💬 Напишите ваш вопрос, и мы обязательно ответим!\n\n' +
      'Для отмены отправьте /cancel'
    );
  }

  private async handleSupportMessage(chatId: number, text: string) {
    try {
      // Get or create customer
      const customer = await this.getOrCreateCustomer(chatId);

      // Create support ticket
      const ticketResponse = await axios.post(
        `${this.config.apiUrl}/api/public/support/bots/${this.config.botId}`,
        {
          customerId: customer.id,
          message: text
        }
      );

      const ticket = ticketResponse.data?.data;

      // Clear state
      this.userStates.delete(chatId);

      // Confirm to user
      await this.bot.sendMessage(
        chatId,
        `✅ Ваше сообщение отправлено!\n\n` +
        `Тикет #${ticket.id.slice(0, 8)}\n\n` +
        `Мы ответим в ближайшее время.`
      );

      // Send notification to admin
      await this.sendSupportNotificationToAdmin(ticket, customer, text);
    } catch (error) {
      console.error('Error handling support message:', error);
      await this.bot.sendMessage(chatId, 'Ошибка отправки сообщения. Попробуйте позже.');
      this.userStates.delete(chatId);
    }
  }

  private async sendSupportNotificationToAdmin(ticket: any, customer: any, message: string) {
    try {
      // Get bot settings
      const botResponse = await axios.get(`${this.config.apiUrl}/api/public/bots/${this.config.botId}`);
      const bot = botResponse.data?.data;

      if (!bot?.adminTelegramId) {
        console.log('Admin Telegram ID not configured, skipping support notification');
        return;
      }

      const adminMessage =
        `💬 <b>Новое обращение в поддержку</b>\n\n` +
        `<b>От:</b> <a href="tg://user?id=${customer.telegramId}">${customer.firstName}${customer.lastName ? ' ' + customer.lastName : ''}</a>\n` +
        `<b>Username:</b> ${customer.username ? '@' + customer.username : 'не указан'}\n` +
        `<b>Тикет:</b> #${ticket.id.slice(0, 8)}\n\n` +
        `<b>Сообщение:</b>\n${message}`;

      await this.bot.sendMessage(bot.adminTelegramId, adminMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{
              text: '✉️ Ответить',
              callback_data: `support_reply_${ticket.id}`
            }]
          ]
        }
      });

      console.log(`Support notification sent to admin for ticket ${ticket.id}`);
    } catch (error: any) {
      console.error('Error sending support notification:', error.response?.data || error.message);
    }
  }

  private async startSupportReply(chatId: number, ticketId: string) {
    try {
      // Set state to wait for admin's reply
      this.userStates.set(chatId, `support_reply_${ticketId}`);

      await this.bot.sendMessage(
        chatId,
        '✍️ Введите ваш ответ для пользователя:\n\n' +
        'Для отмены отправьте /cancel'
      );
    } catch (error) {
      console.error('Error starting support reply:', error);
      await this.bot.sendMessage(chatId, 'Ошибка. Попробуйте позже.');
    }
  }

  private async handleSupportReply(chatId: number, ticketId: string, text: string) {
    try {
      // Get ticket details to find the customer
      const ticketResponse = await axios.get(
        `${this.config.apiUrl}/api/public/support/tickets/${ticketId}`
      );
      const ticket = ticketResponse.data?.data;

      if (!ticket) {
        await this.bot.sendMessage(chatId, 'Ошибка: тикет не найден');
        this.userStates.delete(chatId);
        return;
      }

      // Get admin info for saving the message
      const adminChat = await this.bot.getChat(chatId);
      const adminName = adminChat.first_name || 'Admin';

      // Save admin message to database
      await axios.post(
        `${this.config.apiUrl}/api/public/support/tickets/${ticketId}/messages`,
        {
          senderType: 'admin',
          senderId: chatId.toString(),
          text: text
        }
      );

      // Send reply to customer
      await this.bot.sendMessage(
        parseInt(ticket.customer.telegramId),
        `💬 <b>Ответ от поддержки:</b>\n\n${text}`,
        { parse_mode: 'HTML' }
      );

      // Confirm to admin
      await this.bot.sendMessage(
        chatId,
        `✅ Ваш ответ отправлен пользователю!\n\n` +
        `Тикет: #${ticketId.slice(0, 8)}`
      );

      // Clear state
      this.userStates.delete(chatId);
    } catch (error: any) {
      console.error('Error handling support reply:', error);
      await this.bot.sendMessage(
        chatId,
        'Ошибка при отправке ответа: ' + (error.response?.data?.message || error.message)
      );
      this.userStates.delete(chatId);
    }
  }

  private async handleCartAction(chatId: number, data: string) {
    // Handle cart quantity changes
  }

  private async getOrCreateCustomer(chatId: number) {
    try {
      // Get chat info from Telegram
      const chat = await this.bot.getChat(chatId);

      // Get or create customer via API
      const response = await axios.post(
        `${this.config.apiUrl}/api/customers/bots/${this.config.botId}/telegram`,
        {
          telegramId: chatId,
          username: chat.username || null,
          firstName: chat.first_name || 'User',
          lastName: chat.last_name || null
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error getting/creating customer:', error);
      // Fallback for development
      return { id: chatId.toString() };
    }
  }
}

// Multi-bot manager
class BotManager {
  private bots: Map<string, ShopBot> = new Map();
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async loadBotsFromDatabase() {
    try {
      console.log('🔄 Loading bots from database...');
      const response = await axios.get(`${this.apiUrl}/api/public/bots/active`);
      const botsData = response.data;

      console.log(`📋 Found ${botsData.length} active bots in database`);

      // Получаем список ID активных ботов из базы
      const activeBotIds = new Set(botsData.map((b: any) => b.id));

      // Останавливаем боты, которых больше нет в базе
      for (const [botId, bot] of this.bots.entries()) {
        if (!activeBotIds.has(botId)) {
          console.log(`🛑 Stopping bot ${botId} (removed from database)`);
          bot.stop();
          this.bots.delete(botId);
        }
      }

      // Запускаем новые боты
      for (const botData of botsData) {
        if (!botData.token) {
          console.warn(`⚠️  Bot ${botData.id} (${botData.name}) has no token, skipping`);
          continue;
        }

        // Если бот уже запущен, пропускаем
        if (this.bots.has(botData.id)) {
          continue;
        }

        try {
          console.log(`🚀 Starting bot: ${botData.name} (${botData.id})`);

          const shopBot = new ShopBot({
            token: botData.token,
            botId: botData.id,
            apiUrl: this.apiUrl
          });

          this.bots.set(botData.id, shopBot);
          console.log(`✅ Bot ${botData.name} started successfully`);
        } catch (error: any) {
          console.error(`❌ Failed to start bot ${botData.name}:`, error.message);
        }
      }

      console.log(`\n✅ Total active bots: ${this.bots.size}\n`);
    } catch (error: any) {
      console.error('❌ Error loading bots from database:', error.message);
    }
  }

  async startPeriodicCheck() {
    // Загружаем боты при старте
    await this.loadBotsFromDatabase();

    // Проверяем новые боты каждые 30 секунд
    setInterval(async () => {
      await this.loadBotsFromDatabase();
    }, 30000);

    console.log('🔄 Periodic bot check started (every 30 seconds)\n');
  }

  stopBot(botId: string) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stop();
      this.bots.delete(botId);
      console.log(`🛑 Bot ${botId} stopped and removed`);
    }
  }
}

// Main execution
const manager = new BotManager(API_URL);

manager.startPeriodicCheck().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

console.log('🤖 Multi-Bot Manager started');
console.log(`📡 API URL: ${API_URL}\n`);

