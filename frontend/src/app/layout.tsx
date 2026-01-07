import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Sellio — Конструктор Telegram-ботов для интернет-магазинов',
  description: 'Создавайте Telegram-ботов для продаж без программирования за 15 минут. Физические товары, цифровые продукты, онлайн-курсы и услуги. Автоматическая доставка файлов, приём оплаты через YooKassa.',
  keywords: [
    'telegram бот магазин',
    'telegram shop bot',
    'конструктор ботов telegram',
    'бот для продаж telegram',
    'интернет-магазин telegram',
    'продажа цифровых товаров telegram',
    'telegram бот для бизнеса',
    'создать магазин в телеграм',
    'telegram ecommerce',
    'бот продажа услуг',
    'автоматизация продаж telegram',
    'sellio'
  ],
  authors: [{ name: 'Sellio' }],
  creator: 'Sellio',
  publisher: 'ИП Уткин А.С.',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://getsellio.ru',
    siteName: 'Sellio',
    title: 'Sellio — Telegram-магазин за 15 минут',
    description: 'Конструктор Telegram-ботов для продаж. Физические товары, цифровые продукты и услуги без программирования.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sellio — Telegram-магазин за 15 минут',
    description: 'Конструктор Telegram-ботов для продаж. Физические товары, цифровые продукты и услуги.',
  },
  alternates: {
    canonical: 'https://getsellio.ru',
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}

