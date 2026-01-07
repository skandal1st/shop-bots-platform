# Инструкция по установке и запуску

## Предварительные требования

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 9.0.0

## Шаг 1: Установка зависимостей

```bash
# Установка зависимостей для всех модулей
npm run install:all
```

Или вручную:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../bot && npm install
```

## Шаг 2: Настройка базы данных

1. Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE sellio;
```

2. Скопируйте файл `.env.example` в `.env` в папке `backend`:

```bash
cd backend
cp .env.example .env
```

3. Отредактируйте `backend/.env` и укажите ваши настройки:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sellio?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
```

4. Примените миграции Prisma:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

## Шаг 3: Настройка Frontend

Создайте файл `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Шаг 4: Настройка Telegram Bot

Создайте файл `bot/.env`:

```env
BOT_TOKEN=your-telegram-bot-token
BOT_ID=your-bot-id-from-database
API_URL=http://localhost:3001
```

**Как получить BOT_TOKEN:**
1. Откройте Telegram и найдите бота [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям и получите токен

**Как получить BOT_ID:**
1. Запустите backend
2. Зарегистрируйтесь в системе
3. Добавьте бота через админ-панель (токен будет автоматически проверен)
4. Скопируйте ID бота из базы данных или ответа API

## Шаг 5: Запуск проекта

### Вариант 1: Запуск всех сервисов одновременно

```bash
npm run dev
```

### Вариант 2: Запуск по отдельности

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Bot (после настройки)
cd bot
npm run dev
```

## Проверка работы

1. **Backend API**: http://localhost:3001/health
2. **Frontend**: http://localhost:3000
3. **Telegram Bot**: Откройте бота в Telegram и отправьте `/start`

## Первые шаги

1. Откройте http://localhost:3000
2. Зарегистрируйтесь
3. Добавьте Telegram бота (введите токен от @BotFather)
4. Добавьте товары через админ-панель
5. Протестируйте бота в Telegram

## Структура проекта

```
sellio/
├── backend/          # Backend API (Express + Prisma)
│   ├── src/
│   │   ├── routes/   # API маршруты
│   │   ├── middleware/
│   │   └── utils/
│   └── prisma/       # Схема базы данных
├── frontend/         # Админ-панель (Next.js)
│   └── src/
│       └── app/      # Страницы Next.js
└── bot/              # Telegram Bot
    └── src/          # Логика бота
```

## Решение проблем

### Ошибка подключения к базе данных
- Проверьте, что PostgreSQL запущен
- Убедитесь, что DATABASE_URL правильный
- Проверьте права доступа пользователя БД

### Ошибка при миграциях Prisma
```bash
cd backend
npx prisma migrate reset  # Осторожно: удалит все данные!
npx prisma migrate dev
```

### Bot не отвечает
- Проверьте, что BOT_TOKEN правильный
- Убедитесь, что бот запущен
- Проверьте логи в консоли

## Дополнительная информация

- Документация API будет доступна после запуска backend
- Для разработки используйте Prisma Studio: `cd backend && npx prisma studio`
- Логи можно просматривать в консоли каждого сервиса

