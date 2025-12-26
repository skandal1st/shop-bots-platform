# Структура проекта Shop Bots Platform

## Обзор

Проект состоит из трех основных модулей:
- **Backend** - REST API на Node.js + Express + Prisma
- **Frontend** - Админ-панель на Next.js + React + Ant Design
- **Bot** - Telegram Bot модуль на node-telegram-bot-api

## Структура директорий

```
shop_bots/
├── backend/                    # Backend API
│   ├── src/
│   │   ├── index.ts           # Точка входа сервера
│   │   ├── routes/            # API маршруты
│   │   │   ├── auth.ts        # Авторизация
│   │   │   ├── bots.ts        # Управление ботами
│   │   │   ├── categories.ts  # Категории товаров
│   │   │   ├── products.ts    # Товары
│   │   │   ├── orders.ts      # Заказы
│   │   │   ├── customers.ts   # Клиенты
│   │   │   ├── cart.ts        # Корзина
│   │   │   └── settings.ts    # Настройки
│   │   ├── middleware/        # Middleware
│   │   │   ├── auth.ts        # JWT аутентификация
│   │   │   └── errorHandler.ts # Обработка ошибок
│   │   └── utils/             # Утилиты
│   │       ├── prisma.ts      # Prisma client
│   │       └── upload.ts      # Загрузка файлов
│   ├── prisma/
│   │   └── schema.prisma      # Схема базы данных
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Frontend админ-панель
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── layout.tsx     # Главный layout
│   │   │   ├── page.tsx       # Главная страница
│   │   │   ├── login/         # Страница входа
│   │   │   ├── register/      # Страница регистрации
│   │   │   └── dashboard/     # Панель управления
│   │   └── lib/
│   │       └── api.ts         # API клиент
│   ├── package.json
│   └── tsconfig.json
│
├── bot/                        # Telegram Bot
│   ├── src/
│   │   └── index.ts           # Логика бота
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                # Root package.json (workspaces)
├── README.md                   # Основная документация
├── SETUP.md                    # Инструкция по установке
└── .gitignore
```

## База данных

### Основные таблицы:

- **users** - Пользователи системы
- **bots** - Telegram боты
- **categories** - Категории товаров (древовидная структура)
- **products** - Товары
- **product_images** - Изображения товаров
- **product_categories** - Связь товаров и категорий
- **customers** - Клиенты
- **orders** - Заказы
- **order_items** - Товары в заказе
- **order_statuses** - Статусы заказов
- **carts** - Корзины
- **cart_items** - Товары в корзине
- **favorites** - Избранное
- **message_templates** - Шаблоны сообщений
- **brand_settings** - Настройки бренда
- **bot_menu** - Меню бота
- **payment_settings** - Настройки платежей
- **notification_settings** - Настройки уведомлений
- **support_tickets** - Обращения в поддержку
- **support_messages** - Сообщения поддержки

## API Endpoints

### Авторизация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### Боты
- `GET /api/bots` - Список ботов
- `POST /api/bots` - Создать бота
- `GET /api/bots/:id` - Получить бота
- `PUT /api/bots/:id` - Обновить бота
- `DELETE /api/bots/:id` - Удалить бота

### Категории
- `GET /api/categories/bots/:botId` - Список категорий
- `POST /api/categories/bots/:botId` - Создать категорию
- `PUT /api/categories/:id` - Обновить категорию
- `DELETE /api/categories/:id` - Удалить категорию

### Товары
- `GET /api/products/bots/:botId` - Список товаров
- `GET /api/products/:id` - Получить товар
- `POST /api/products/bots/:botId` - Создать товар
- `PUT /api/products/:id` - Обновить товар
- `DELETE /api/products/:id` - Удалить товар

### Заказы
- `GET /api/orders/bots/:botId` - Список заказов
- `GET /api/orders/:id` - Получить заказ
- `POST /api/orders/bots/:botId` - Создать заказ
- `PUT /api/orders/:id/status` - Изменить статус заказа

### Клиенты
- `GET /api/customers/bots/:botId` - Список клиентов
- `GET /api/customers/:id` - Получить клиента

### Корзина
- `GET /api/carts/:customerId` - Получить корзину
- `POST /api/carts` - Добавить в корзину
- `PUT /api/carts/:customerId/items/:itemId` - Обновить количество
- `DELETE /api/carts/:customerId` - Очистить корзину

### Настройки
- `GET /api/settings/bots/:botId` - Получить настройки
- `PUT /api/settings/bots/:botId/brand` - Обновить бренд
- `PUT /api/settings/bots/:botId/payment` - Обновить платежи
- `PUT /api/settings/bots/:botId/notifications` - Обновить уведомления
- `GET /api/settings/bots/:botId/menu` - Получить меню
- `PUT /api/settings/bots/:botId/menu` - Обновить меню
- `GET /api/settings/bots/:botId/templates` - Получить шаблоны
- `PUT /api/settings/bots/:botId/templates/:key` - Обновить шаблон

## Telegram Bot

### Команды:
- `/start` - Приветственное сообщение
- `/catalog` - Каталог товаров
- `/cart` - Корзина
- `/orders` - Мои заказы
- `/support` - Поддержка

### Callback queries:
- `category_{id}` - Открыть категорию
- `product_{id}` - Показать товар
- `add_to_cart_{id}` - Добавить в корзину
- `cart_quantity_{id}_{action}` - Изменить количество
- `checkout` - Оформить заказ

## Технологии

### Backend
- Node.js 18+
- Express.js
- Prisma ORM
- PostgreSQL
- TypeScript
- JWT авторизация
- Multer (загрузка файлов)

### Frontend
- Next.js 14
- React 18
- TypeScript
- Ant Design
- React Hook Form
- Axios

### Bot
- node-telegram-bot-api
- TypeScript
- Axios

## Разработка

### Запуск в режиме разработки:
```bash
npm run dev
```

### Сборка:
```bash
npm run build
```

### Миграции базы данных:
```bash
cd backend
npx prisma migrate dev
```

### Prisma Studio (GUI для БД):
```bash
cd backend
npx prisma studio
```

