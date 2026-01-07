# Инструкция по развертыванию Sellio

## Требования к серверу

### Минимальные характеристики VPS:
- **CPU**: 2 vCPU
- **RAM**: 4 GB
- **Диск**: 60 GB SSD
- **ОС**: Ubuntu 22.04 LTS или Debian 11/12

### Рекомендуемые провайдеры:
- Hetzner (от €4.5/месяц)
- DigitalOcean (от $12/месяц)
- Timeweb (от 400₽/месяц)
- Selectel (от 400₽/месяц)

## 1. Подготовка сервера

### 1.1 Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Установка Docker

```bash
# Установка необходимых пакетов
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Добавление GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Добавление текущего пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### 1.3 Установка Docker Compose

```bash
# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

### 1.4 Настройка файрвола

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

## 2. Загрузка проекта на сервер

### 2.1 Клонирование репозитория

```bash
cd ~
git clone <URL_вашего_репозитория> sellio
cd sellio
```

### 2.2 Настройка переменных окружения

#### Backend (.env файл в `backend/.env`):

```bash
# Database
DATABASE_URL="postgresql://sellio:sellio123@postgres:5432/sellio"
POSTGRES_USER=sellio
POSTGRES_PASSWORD=sellio123
POSTGRES_DB=sellio

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=3001
NODE_ENV=production

# Public URLs (замените на ваш домен)
PUBLIC_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Bot
BOT_TOKEN=your_telegram_bot_token
```

#### Frontend (.env файл в `frontend/.env`):

```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NODE_ENV=production
```

#### Bot (.env файл в `bot/.env`):

```bash
# API Configuration
API_URL=http://backend:3001/api

# Telegram Bot Token (получите у @BotFather)
BOT_TOKEN=your_telegram_bot_token

# Environment
NODE_ENV=production
```

### 2.3 Настройка nginx

Отредактируйте файл `nginx/conf.d/sellio.conf` и замените `yourdomain.com` на ваш домен:

```bash
sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx/conf.d/sellio.conf
```

## 3. Настройка SSL сертификатов

### 3.1 Первоначальная настройка

Перед получением SSL сертификата, временно измените nginx конфигурацию для работы только по HTTP:

```bash
# Создайте временный конфигурационный файл
cat > nginx/conf.d/sellio-temp.conf <<'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://backend:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Замените yourdomain.com на ваш домен
sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx/conf.d/sellio-temp.conf

# Переименуйте основной конфиг
mv nginx/conf.d/sellio.conf nginx/conf.d/sellio.conf.ssl
mv nginx/conf.d/sellio-temp.conf nginx/conf.d/sellio.conf
```

### 3.2 Запуск без SSL

```bash
docker-compose up -d nginx
```

### 3.3 Получение SSL сертификата

```bash
# Остановите nginx
docker-compose stop nginx

# Получите сертификат (замените email и домен)
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-actual-domain.com \
  -d www.your-actual-domain.com

# Восстановите основной конфиг с SSL
mv nginx/conf.d/sellio.conf nginx/conf.d/sellio-temp.conf
mv nginx/conf.d/sellio.conf.ssl nginx/conf.d/sellio.conf

# Запустите nginx снова
docker-compose up -d nginx
```

## 4. Сборка и запуск приложения

### 4.1 Инициализация базы данных

```bash
# Запустите PostgreSQL
docker-compose up -d postgres

# Дождитесь готовности базы данных (примерно 10 секунд)
sleep 10

# Выполните миграции
docker-compose run --rm backend npx prisma migrate deploy

# Создайте начального администратора (опционально)
docker-compose run --rm backend npx prisma db seed
```

### 4.2 Сборка и запуск всех сервисов

```bash
# Сборка образов
docker-compose build

# Запуск всех сервисов
docker-compose up -d

# Проверка статуса контейнеров
docker-compose ps
```

### 4.3 Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f bot
docker-compose logs -f nginx
```

## 5. Настройка Telegram бота

### 5.1 Создание бота

1. Найдите @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните полученный токен

### 5.2 Настройка вебхука (если требуется)

```bash
# Установите вебхук для вашего бота
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-actual-domain.com/api/bot-public/webhook/<YOUR_BOT_TOKEN>"}'
```

## 6. Настройка DNS

В панели управления вашего доменного регистратора создайте следующие DNS записи:

```
Тип    Имя    Значение              TTL
A      @      <IP_вашего_сервера>  3600
A      www    <IP_вашего_сервера>  3600
```

## 7. Первоначальная настройка приложения

### 7.1 Доступ к приложению

1. Откройте в браузере: `https://your-actual-domain.com`
2. Войдите используя учетные данные администратора
3. Создайте вашего первого бота в разделе "Боты"

### 7.2 Настройка категорий и товаров

1. Перейдите в раздел "Категории"
2. Создайте категории для ваших товаров
3. Перейдите в раздел "Товары"
4. Добавьте товары или используйте массовую загрузку из Excel

## 8. Обслуживание

### 8.1 Обновление приложения

```bash
# Остановите сервисы
docker-compose down

# Получите последние изменения
git pull

# Пересоберите образы
docker-compose build

# Выполните миграции базы данных
docker-compose run --rm backend npx prisma migrate deploy

# Запустите сервисы
docker-compose up -d
```

### 8.2 Резервное копирование

#### База данных:

```bash
# Создание бэкапа
docker-compose exec postgres pg_dump -U sellio sellio > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker-compose exec -T postgres psql -U sellio sellio < backup_20240101_120000.sql
```

#### Загруженные файлы:

```bash
# Создание архива загрузок
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Восстановление
tar -xzf uploads_backup_20240101_120000.tar.gz
```

### 8.3 Мониторинг

```bash
# Проверка использования ресурсов
docker stats

# Проверка дискового пространства
df -h

# Очистка неиспользуемых Docker объектов
docker system prune -a
```

## 9. Решение проблем

### 9.1 Контейнер не запускается

```bash
# Проверьте логи
docker-compose logs [service_name]

# Перезапустите сервис
docker-compose restart [service_name]

# Полная перезагрузка
docker-compose down
docker-compose up -d
```

### 9.2 Проблемы с SSL

```bash
# Проверьте сертификаты
docker-compose exec nginx ls -la /etc/letsencrypt/live/

# Обновите сертификаты вручную
docker-compose run --rm certbot renew
```

### 9.3 Проблемы с базой данных

```bash
# Проверьте состояние PostgreSQL
docker-compose exec postgres psql -U sellio -c "SELECT version();"

# Проверьте подключение
docker-compose exec backend npx prisma db push
```

### 9.4 Бот не отвечает

```bash
# Проверьте логи бота
docker-compose logs bot

# Убедитесь что токен правильный в bot/.env
# Перезапустите бота
docker-compose restart bot
```

## 10. Режим разработки

Для локальной разработки используйте `docker-compose.dev.yml`:

```bash
# Запуск в режиме разработки
docker-compose -f docker-compose.dev.yml up

# С пересборкой
docker-compose -f docker-compose.dev.yml up --build
```

В режиме разработки:
- Код автоматически перезагружается при изменениях
- Доступны hot reload для frontend
- Логи выводятся в консоль
- Порты доступны напрямую без nginx

## 11. Безопасность

### 11.1 Рекомендации

1. **Измените пароли по умолчанию** в файлах `.env`
2. **Используйте сильные JWT секреты** (минимум 32 символа)
3. **Регулярно обновляйте** систему и Docker образы
4. **Настройте автоматические бэкапы** базы данных
5. **Используйте fail2ban** для защиты от брутфорса SSH

### 11.2 Установка fail2ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 12. Производительность

### 12.1 Оптимизация PostgreSQL

Для продакшена отредактируйте `docker-compose.yml` и добавьте параметры PostgreSQL:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
```

### 12.2 Масштабирование

Для увеличения нагрузки можно масштабировать сервисы:

```bash
# Запустить несколько экземпляров backend
docker-compose up -d --scale backend=3
```

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь что все переменные окружения настроены правильно
3. Проверьте доступность портов и DNS записи
4. Проверьте документацию Docker и используемых технологий
