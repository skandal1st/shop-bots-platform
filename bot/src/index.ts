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

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new TelegramBot(config.token, { polling: true });
    this.setupHandlers();
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
      const data = query.data;

      if (!chatId || !data) return;

      try {
        if (data.startsWith('category_')) {
          const categoryId = data.replace('category_', '');
          await this.showCategory(chatId, categoryId);
        } else if (data.startsWith('product_')) {
          const productId = data.replace('product_', '');
          await this.showProduct(chatId, productId);
        } else if (data.startsWith('add_to_cart_')) {
          const productId = data.replace('add_to_cart_', '');
          await this.addToCart(chatId, productId);
        } else if (data.startsWith('cart_')) {
          await this.handleCartAction(chatId, data);
        } else if (data === 'checkout') {
          await this.startCheckout(chatId);
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
      const state = this.userStates.get(chatId);

      if (state?.startsWith('checkout_')) {
        await this.handleCheckoutStep(chatId, msg.text || '', state);
      }
    });
  }

  private async sendWelcomeMessage(chatId: number) {
    try {
      // Get welcome template from API
      const response = await axios.get(`${this.config.apiUrl}/api/bots/${this.config.botId}/templates`, {
        params: { key: 'welcome' }
      });

      const welcomeText = response.data?.text || 'Добро пожаловать в наш магазин! 🛍️';

      // Get menu buttons
      const menuResponse = await axios.get(`${this.config.apiUrl}/api/bots/${this.config.botId}/menu`);
      const menu = menuResponse.data?.buttons || [];

      const keyboard = this.buildMenuKeyboard(menu);

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

  private buildMenuKeyboard(menu: any[]) {
    return menu.map(row => 
      row.map((button: any) => ({
        text: button.emoji ? `${button.emoji} ${button.text}` : button.text
      }))
    );
  }

  private async showCatalog(chatId: number, categoryId?: string) {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/bots/${this.config.botId}/categories`);
      const categories = response.data?.data || [];

      if (categories.length === 0) {
        await this.bot.sendMessage(chatId, 'Категории пока не добавлены');
        return;
      }

      const keyboard = categories.map((cat: any) => [
        {
          text: cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name,
          callback_data: `category_${cat.id}`
        }
      ]);

      await this.bot.sendMessage(chatId, 'Выберите категорию:', {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error showing catalog:', error);
      await this.bot.sendMessage(chatId, 'Ошибка загрузки каталога');
    }
  }

  private async showCategory(chatId: number, categoryId: string) {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/bots/${this.config.botId}/products`, {
        params: { categoryId }
      });
      const products = response.data?.data || [];

      if (products.length === 0) {
        await this.bot.sendMessage(chatId, 'В этой категории пока нет товаров');
        return;
      }

      // Show first product or list
      for (const product of products.slice(0, 10)) {
        await this.showProduct(chatId, product.id);
      }
    } catch (error) {
      console.error('Error showing category:', error);
    }
  }

  private async showProduct(chatId: number, productId: string) {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/products/${productId}`);
      const product = response.data?.data;

      if (!product) {
        await this.bot.sendMessage(chatId, 'Товар не найден');
        return;
      }

      const text = `*${product.name}*\n\n${product.description}\n\n💰 Цена: ${product.price} ₽`;

      const keyboard = [[
        {
          text: '🛒 Добавить в корзину',
          callback_data: `add_to_cart_${productId}`
        }
      ]];

      if (product.images && product.images.length > 0) {
        await this.bot.sendPhoto(chatId, product.images[0].url, {
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
      await axios.post(`${this.config.apiUrl}/api/carts`, {
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
      
      const response = await axios.get(`${this.config.apiUrl}/api/carts/${customer.id}`);
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

      const keyboard = [[
        {
          text: '✅ Оформить заказ',
          callback_data: 'checkout'
        }
      ]];

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
    this.userStates.set(chatId, 'checkout_address');
    await this.bot.sendMessage(chatId, 'Введите адрес доставки:');
  }

  private async handleCheckoutStep(chatId: number, text: string, state: string) {
    // Implementation for checkout flow
    // This is a simplified version
    await this.bot.sendMessage(chatId, 'Заказ оформлен! Спасибо за покупку! 🎉');
    this.userStates.delete(chatId);
  }

  private async showOrders(chatId: number) {
    try {
      const customer = await this.getOrCreateCustomer(chatId);
      
      const response = await axios.get(`${this.config.apiUrl}/api/bots/${this.config.botId}/orders`, {
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
    await this.bot.sendMessage(chatId, '💬 Напишите ваш вопрос, и мы обязательно ответим!');
  }

  private async handleCartAction(chatId: number, data: string) {
    // Handle cart quantity changes
  }

  private async getOrCreateCustomer(chatId: number) {
    // Get or create customer via API
    // This is a placeholder - implement based on your API
    return { id: chatId.toString() };
  }
}

// Main execution
const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_ID = process.env.BOT_ID;
const API_URL = process.env.API_URL || 'http://localhost:3001';

if (!BOT_TOKEN || !BOT_ID) {
  console.error('BOT_TOKEN and BOT_ID must be set in environment variables');
  process.exit(1);
}

const bot = new ShopBot({
  token: BOT_TOKEN,
  botId: BOT_ID,
  apiUrl: API_URL
});

console.log('🤖 Telegram Bot started');

