'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Typography, Space } from 'antd'
import { ShopOutlined, RobotOutlined, ShoppingCartOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function Home() {
  const router = useRouter()

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ maxWidth: 600, textAlign: 'center', padding: '40px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <RobotOutlined style={{ fontSize: 64, color: '#667eea' }} />
          <Title level={1}>Shop Bots Platform</Title>
          <Paragraph style={{ fontSize: 18 }}>
            Создавайте Telegram-боты для интернет-магазинов без программирования
          </Paragraph>
          <Space>
            <Button 
              type="primary" 
              size="large"
              onClick={() => router.push('/login')}
            >
              Войти
            </Button>
            <Button 
              size="large"
              onClick={() => router.push('/register')}
            >
              Регистрация
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

