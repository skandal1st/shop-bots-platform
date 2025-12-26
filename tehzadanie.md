# Техническое задание: Конструктор ботов для интернет-магазинов

## Описание проекта

Платформа для создания Telegram-ботов интернет-магазинов без программирования. Пользователь добавляет API ключ бота, настраивает товары, платежи и получает готовый магазин в Telegram.

---

## Основные модули

### 1. Административная панель

#### 1.1 Авторизация и настройка
- Регистрация/вход пользователей
- Добавление Telegram Bot API ключа
- Проверка валидности токена
- Управление несколькими ботами (опционально)

---

## 2. Управление товарами и каталогом

### 2.1 Категории товаров
**Функционал:**
- Создание/редактирование/удаление категорий
- Древовидная структура (категории → подкатегории → под-подкатегории)
- Перетаскивание категорий для изменения порядка (drag & drop)
- Иконки/эмодзи для категорий

**Структура данных:**
```typescript
interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  emoji?: string;
  order: number;
  is_active: boolean;
  created_at: Date;
}
```

### 2.2 Товары
**Функционал:**
- CRUD операции с товарами
- Множественная загрузка изображений (до 10 фото)
- Порядок отображения изображений
- Основные поля: название, описание, цена, артикул
- Привязка к одной или нескольким категориям

**Управление остатками:**
- Поле "Количество на складе"
- Автоматическое скрытие товара при остатке = 0
- Опция "Безлимитный товар" (не отслеживать остатки)
- Уведомление администратору при низком остатке (настраиваемый порог)

**Структура данных:**
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  article?: string;
  images: string[]; // URLs изображений
  category_ids: string[];
  stock_quantity: number;
  unlimited_stock: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## 3. CRM и управление клиентами

### 3.1 База клиентов
**Функционал:**
- Автоматическое добавление клиентов при первом взаимодействии
- Профиль клиента:
  - Telegram ID, username, имя
  - Телефон (если запрашивается)
  - Адрес доставки
  - История заказов
  - Общая сумма покупок
  - Дата первого/последнего заказа
- Поиск и фильтрация клиентов
- Теги/метки для сегментации
- Заметки к клиенту (видны только админу)

**Структура данных:**
```typescript
interface Customer {
  id: string;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  addresses: Address[];
  tags: string[];
  notes: string;
  total_orders: number;
  total_spent: number;
  created_at: Date;
  last_order_at?: Date;
}
```

### 3.2 История покупок
- Список всех заказов клиента
- Быстрый переход к деталям заказа
- Статистика по клиенту (средний чек, частота покупок)

---

## 4. Управление заказами

### 4.1 Статусы заказов
**Стандартные статусы:**
- Новый
- Подтвержден
- В обработке
- Отправлен
- Доставлен
- Отменен

**Функционал:**
- Создание кастомных статусов
- Настройка цветовой маркировки статусов
- Порядок отображения статусов
- Возможность удаления только кастомных статусов

**Структура данных:**
```typescript
interface OrderStatus {
  id: string;
  name: string;
  color: string; // hex цвет
  order: number;
  is_default: boolean; // системные статусы нельзя удалить
  notify_customer: boolean; // отправлять уведомление клиенту при установке
}
```

### 4.2 Заказы
**Функционал:**
- Список всех заказов с фильтрацией:
  - По статусу
  - По дате
  - По клиенту
  - По сумме заказа
- Поиск по номеру заказа, телефону, имени
- Детальная страница заказа:
  - Список товаров с ценами
  - Данные клиента
  - Адрес доставки
  - Способ оплаты
  - Комментарий клиента
  - История изменения статусов
- Изменение статуса заказа
- Кнопка "Повторить заказ" (для клиента в боте)

**Уведомления клиенту:**
- Автоматическая отправка сообщения в Telegram при смене статуса
- Настройка шаблонов уведомлений для каждого статуса
- Переменные: {order_number}, {status}, {customer_name}, {total}

**Структура данных:**
```typescript
interface Order {
  id: string;
  order_number: string; // уникальный номер
  customer_id: string;
  items: OrderItem[];
  total: number;
  status_id: string;
  payment_method: string;
  delivery_address: string;
  customer_comment?: string;
  admin_notes?: string;
  status_history: StatusHistory[];
  created_at: Date;
  updated_at: Date;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface StatusHistory {
  status_id: string;
  changed_at: Date;
  changed_by?: string; // admin ID или "system"
}
```

---

## 5. Маркетинг

### 5.1 Рассылки
**Функционал:**
- Создание рассылки с текстом и изображением
- Выбор аудитории:
  - Все клиенты
  - По тегам
  - По истории покупок (купившие/не купившие)
  - Кастомный список (импорт ID)
- Предпросмотр сообщения
- Отложенная отправка (планирование)
- Статистика:
  - Отправлено
  - Доставлено
  - Прочитано (если доступно)
  - Перешли по ссылке/кнопке

**Структура данных:**
```typescript
interface Broadcast {
  id: string;
  name: string; // название рассылки для админа
  message: string;
  image_url?: string;
  buttons?: BroadcastButton[];
  audience_filter: AudienceFilter;
  scheduled_at?: Date;
  sent_at?: Date;
  stats: {
    total: number;
    sent: number;
    failed: number;
  };
  created_at: Date;
}

interface BroadcastButton {
  text: string;
  url?: string;
  callback_data?: string;
}
```

---

## 6. Функционал бота для клиентов

### 6.1 Корзина
**Функционал:**
- Добавление товаров в корзину
- Изменение количества
- Удаление товаров
- Просмотр итоговой суммы
- Сохранение корзины между сеансами
- Очистка корзины

**Структура данных:**
```typescript
interface Cart {
  customer_id: string;
  items: CartItem[];
  updated_at: Date;
}

interface CartItem {
  product_id: string;
  quantity: number;
}
```

### 6.2 Избранное
**Функционал:**
- Добавление/удаление товаров в избранное
- Просмотр списка избранного
- Быстрое добавление из избранного в корзину

### 6.3 Повторный заказ
**Функционал:**
- Кнопка "Повторить заказ" в истории заказов
- Автоматическое добавление всех товаров из заказа в корзину
- Проверка наличия товаров на складе
- Уведомление если товаров нет в наличии

---

## 7. Конструктор интерфейса бота

### 7.1 Визуальный редактор меню
**Функционал:**
- Drag & drop конструктор главного меню
- Типы кнопок:
  - Каталог товаров
  - Корзина
  - Избранное
  - Мои заказы
  - Поддержка
  - Кастомная ссылка
  - Кастомное сообщение
- Настройка текста кнопок
- Эмодзи для кнопок
- Расположение кнопок (сетка)
- Предпросмотр в реальном времени

**Структура данных:**
```typescript
interface BotMenu {
  bot_id: string;
  buttons: MenuButton[][];
  updated_at: Date;
}

interface MenuButton {
  text: string;
  emoji?: string;
  type: 'catalog' | 'cart' | 'favorites' | 'orders' | 'support' | 'custom_url' | 'custom_message';
  url?: string;
  message?: string;
}
```

### 7.2 Шаблоны сообщений
**Функционал:**
- Настройка текстов для ключевых сообщений:
  - Приветственное сообщение
  - Товар добавлен в корзину
  - Заказ оформлен
  - Пустая корзина
  - Товара нет в наличии
  - И другие
- Использование переменных:
  - {customer_name}
  - {product_name}
  - {price}
  - {order_number}
  - {total}
  - {status}
- Предпросмотр с подстановкой тестовых данных
- Markdown форматирование

**Структура данных:**
```typescript
interface MessageTemplate {
  bot_id: string;
  key: string; // 'welcome', 'item_added', 'order_created' и т.д.
  text: string;
  updated_at: Date;
}
```

### 7.3 Приветственное сообщение
**Функционал:**
- Отдельная настройка текста
- Добавление изображения
- Кнопки быстрого доступа
- Включение/отключение

---

## 8. Брендирование

### 8.1 Настройки бренда
**Функционал:**
- Название магазина
- Логотип (для сообщений)
- Описание магазина
- Цветовая схема (для веб-интерфейсов если планируется)
- Контактные данные:
  - Телефон
  - Email
  - Адрес
  - Социальные сети

**Структура данных:**
```typescript
interface BrandSettings {
  bot_id: string;
  store_name: string;
  logo_url?: string;
  description: string;
  contacts: {
    phone?: string;
    email?: string;
    address?: string;
    social_links?: SocialLink[];
  };
}

interface SocialLink {
  platform: string; // 'instagram', 'vk', 'facebook' и т.д.
  url: string;
}
```

---

## 9. Поддержка клиентов

### 9.1 Чат с клиентами
**Функционал:**
- Кнопка "Связаться с поддержкой" в боте
- Клиент отправляет сообщение
- Уведомление админу в Telegram
- Админ отвечает через админ-панель или напрямую в Telegram (режим operator)
- История переписки сохраняется
- Статусы обращений: открыто, в работе, закрыто
- Назначение обращений на конкретных операторов (если несколько админов)

**Структура данных:**
```typescript
interface SupportTicket {
  id: string;
  customer_id: string;
  status: 'open' | 'in_progress' | 'closed';
  assigned_to?: string; // admin ID
  messages: SupportMessage[];
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
}

interface SupportMessage {
  id: string;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  text: string;
  attachments?: string[];
  sent_at: Date;
}
```

---

## 10. Уведомления администратору

### 10.1 Уведомления о заказах
**Функционал:**
- Уведомление в Telegram при новом заказе
- Настройка получателей:
  - Добавление Telegram ID администраторов
  - Возможность нескольких получателей
- Формат уведомления:
  - Номер заказа
  - Клиент (имя, телефон)
  - Состав заказа
  - Сумма
  - Кнопки: "Подтвердить", "Отменить", "Открыть в админке"

### 10.2 Email уведомления (опционально)
**Функционал:**
- Настройка email для уведомлений
- SMTP настройки
- Шаблон письма о новом заказе
- Дублирование уведомлений из Telegram

**Структура данных:**
```typescript
interface NotificationSettings {
  bot_id: string;
  telegram_ids: number[]; // список Telegram ID админов
  email?: {
    enabled: boolean;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    from_email: string;
    to_emails: string[];
  };
  notifications: {
    new_order: boolean;
    low_stock: boolean;
    new_support_message: boolean;
  };
}
```

---

## 11. Платежная система

### 11.1 Настройка платежей
**Функционал:**
- Выбор платежной системы:
  - ЮKassa
  - Банковский перевод (ручная проверка)
  - Наличные при получении
- Ввод API ключей платежных систем
- Тестовый режим
- Настройка валюты

**Структура данных:**
```typescript
interface PaymentSettings {
  bot_id: string;
  provider: 'yookassa' | 'manual' | 'cash';
  api_key?: string;
  secret_key?: string;
  test_mode: boolean;
  currency: string; // 'RUB', 'USD', 'EUR' и т.д.
  enabled: boolean;
}
```

---

## 12. Аналитика (базовая, для MVP)

### 12.1 Основные метрики
**Функционал:**
- Общая статистика:
  - Количество заказов
  - Общая выручка
  - Средний чек
  - Количество клиентов
- Фильтры по периодам (день, неделя, месяц, произвольный)
- Топ товаров по продажам
- График заказов и выручки

---

## 13. Технические требования

### 13.1 Backend
**Стек (рекомендации):**
- Node.js + Express / NestJS
- Python + FastAPI / Django
- База данных: PostgreSQL / MySQL
- ORM: Prisma / TypeORM / SQLAlchemy
- Telegram Bot API: node-telegram-bot-api / python-telegram-bot

**API эндпоинты (основные):**
```
# Авторизация
POST /api/auth/register
POST /api/auth/login

# Боты
POST /api/bots
GET /api/bots
GET /api/bots/:id
PUT /api/bots/:id
DELETE /api/bots/:id

# Категории
POST /api/bots/:botId/categories
GET /api/bots/:botId/categories
PUT /api/categories/:id
DELETE /api/categories/:id

# Товары
POST /api/bots/:botId/products
GET /api/bots/:botId/products
GET /api/products/:id
PUT /api/products/:id
DELETE /api/products/:id
POST /api/products/:id/images

# Заказы
GET /api/bots/:botId/orders
GET /api/orders/:id
PUT /api/orders/:id/status

# Клиенты
GET /api/bots/:botId/customers
GET /api/customers/:id

# Рассылки
POST /api/bots/:botId/broadcasts
GET /api/bots/:botId/broadcasts

# Настройки
GET /api/bots/:botId/settings
PUT /api/bots/:botId/settings/brand
PUT /api/bots/:botId/settings/notifications
PUT /api/bots/:botId/settings/payment
GET /api/bots/:botId/menu
PUT /api/bots/:botId/menu

# Шаблоны
GET /api/bots/:botId/templates
PUT /api/bots/:botId/templates/:key

# Поддержка
GET /api/bots/:botId/support/tickets
GET /api/support/tickets/:id
POST /api/support/tickets/:id/messages
PUT /api/support/tickets/:id/status
```

### 13.2 Frontend
**Стек (рекомендации):**
- React / Vue.js / Next.js
- UI библиотека: Material-UI / Ant Design / Chakra UI
- Drag & drop: react-beautiful-dnd / dnd-kit
- Таблицы: TanStack Table / AG Grid
- Графики: Recharts / Chart.js
- Формы: React Hook Form / Formik

### 13.3 Telegram Bot
**Архитектура:**
- Webhook или Long Polling
- Обработка callback queries для интерактивных кнопок
- State management для многошаговых операций (оформление заказа)
- Обработка inline keyboards для каталога и корзины
- Работа с платежами через Telegram Payments API

**Основные обработчики:**
```
/start - приветствие
/catalog - каталог товаров
/cart - корзина
/orders - мои заказы
/support - связаться с поддержкой

Callback queries:
category_{id} - открыть категорию
product_{id} - показать товар
add_to_cart_{id} - добавить в корзину
cart_quantity_{id}_{action} - изменить количество (+/-)
checkout - оформить заказ
repeat_order_{id} - повторить заказ
```

### 13.4 Хранение файлов
- Изображения товаров: локальное хранилище на сервере
- Максимальный размер изображения: 5MB
- Форматы: JPG, PNG, WebP
- Автоматическое сжатие и оптимизация

### 13.5 Безопасность
- JWT токены для авторизации API
- Хеширование паролей (bcrypt)
- Rate limiting для API
- Валидация Telegram webhook (токен)
- Шифрование чувствительных данных (API ключи платежных систем)
- HTTPS обязателен

---

## 14. Этапы разработки (рекомендуемые)

### Этап 1: MVP
- Авторизация и регистрация
- Добавление бота (API ключ)
- Управление товарами (без категорий)
- Простой каталог в боте
- Корзина и оформление заказа
- Уведомление админу о заказе
- Базовая админ-панель заказов

### Этап 2
- Категории товаров
- Множественные изображения
- Управление остатками
- CRM клиентов
- Статусы заказов
- Уведомления клиентам

### Этап 3
- Конструктор меню
- Шаблоны сообщений
- Брендирование
- Избранное
- Повторный заказ
- История заказов для клиента

### Этап 4
- Рассылки
- Поддержка через чат
- Аналитика
- Платежные системы
- Email уведомления

---

## 15. База данных (примерная схема)

### Основные таблицы:
```sql
users (id, email, password_hash, created_at)
bots (id, user_id, token, name, is_active, created_at)
categories (id, bot_id, name, parent_id, emoji, order, is_active)
products (id, bot_id, name, description, price, article, stock_quantity, unlimited_stock, is_active)
product_images (id, product_id, url, order)
product_categories (product_id, category_id)
customers (id, bot_id, telegram_id, username, first_name, phone, created_at)
addresses (id, customer_id, address_text, is_default)
orders (id, bot_id, customer_id, order_number, total, status_id, payment_method, delivery_address, created_at)
order_items (id, order_id, product_id, product_name, price, quantity)
order_statuses (id, bot_id, name, color, order, is_default, notify_customer)
status_history (id, order_id, status_id, changed_at, changed_by)
carts (customer_id, bot_id, items_json, updated_at)
favorites (customer_id, product_id)
message_templates (id, bot_id, key, text, updated_at)
brand_settings (bot_id, store_name, logo_url, description, contacts_json)
bot_menu (bot_id, buttons_json, updated_at)
payment_settings (bot_id, provider, api_key, secret_key, test_mode, currency)
notification_settings (bot_id, telegram_ids_json, email_json, notifications_json)
broadcasts (id, bot_id, name, message, image_url, audience_filter_json, scheduled_at, sent_at, stats_json)
support_tickets (id, bot_id, customer_id, status, assigned_to, created_at, closed_at)
support_messages (id, ticket_id, sender_type, sender_id, text, sent_at)
customer_tags (customer_id, tag)
admin_notes (customer_id, note, created_at)
```

---

## 16. Дополнительные замечания

### 16.1 Масштабируемость
- Использовать очереди для рассылок (Bull, RabbitMQ)
- Кэширование часто запрашиваемых данных (Redis)
- Оптимизация запросов к БД (индексы, пагинация)

### 16.2 Мониторинг
- Логирование ошибок (Sentry)
- Мониторинг работы ботов
- Алерты при падении бота

### 16.3 Резервное копирование
- Автоматические бэкапы БД
- Хранение бэкапов файлов

### 16.4 Документация
- API документация (Swagger)
- Пользовательская документация
- Видео-туториалы

---

## 17. Возможные проблемы и решения

### 17.1 Лимиты Telegram API
- **Проблема:** Ограничение на количество сообщений в секунду
- **Решение:** Очередь сообщений с задержками, использование web app для каталога

### 17.2 Большие каталоги
- **Проблема:** Медленная загрузка при тысячах товаров
- **Решение:** Пагинация, поиск, фильтры, кэширование

### 17.3 Одновременные заказы
- **Проблема:** Конкурентный доступ к остаткам
- **Решение:** Транзакции БД, оптимистичные блокировки

### 17.4 Отказоустойчивость бота
- **Проблема:** Бот может упасть
- **Решение:** PM2 / Docker / Kubernetes, автоперезапуск, health checks

---

## Контакты и поддержка

Для вопросов по реализации:
- Техническая документация в проекте
- Issue tracker для багов и предложений

---

**Версия документа:** 1.0  
**Дата создания:** 26.12.2025  
**Автор:** Technical Specification