# Shop Bots Platform

Платформа для создания Telegram-ботов интернет-магазинов без программирования.

## Описание

Позволяет пользователям создавать полнофункциональные интернет-магазины в Telegram, управлять товарами, заказами, клиентами и маркетинговыми кампаниями через удобную веб-панель.

## Структура проекта

```
shop_bots/
├── backend/          # Backend API (Node.js + Express + Prisma)
├── frontend/         # Frontend админ-панель (Next.js + React)
├── bot/              # Telegram Bot модуль
└── shared/           # Общие типы и утилиты
```

## Технологический стек

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT авторизация
- TypeScript

### Frontend
- Next.js 14
- React 18
- TypeScript
- Ant Design / Material-UI
- React Hook Form

### Telegram Bot
- node-telegram-bot-api
- TypeScript
- State management для многошаговых операций

## Установка и запуск

### Предварительные требования
- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm >= 9.0.0

### Установка зависимостей

```bash
npm run install:all
```

### Настройка базы данных

1. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE shop_bots;
```

2. Настройте переменные окружения в `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/shop_bots"
JWT_SECRET="your-secret-key"
PORT=3001
```

3. Примените миграции:
```bash
cd backend
npx prisma migrate dev
```

### Запуск в режиме разработки

```bash
npm run dev
```

Это запустит:
- Backend API на http://localhost:3001
- Frontend на http://localhost:3000
- Telegram Bot (требует настройки токена)

### Запуск отдельных сервисов

```bash
# Только backend
npm run dev:backend

# Только frontend
npm run dev:frontend

# Только bot
npm run dev:bot
```

## Основные функции

### MVP (Этап 1)
- ✅ Авторизация и регистрация
- ✅ Добавление Telegram бота
- ✅ Управление товарами
- ✅ Каталог в боте
- ✅ Корзина и оформление заказа
- ✅ Уведомления администратору
- ✅ Админ-панель заказов

### Планируемые функции
- Категории товаров
- CRM клиентов
- Статусы заказов
- Рассылки
- Поддержка через чат
- Аналитика
- Платежные системы

## API Документация

После запуска backend, документация доступна по адресу:
- Swagger UI: http://localhost:3001/api-docs

## Лицензия

MIT

