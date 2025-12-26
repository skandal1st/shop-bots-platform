'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout, Card, Statistic, Row, Col, Button, Typography, Space } from 'antd'
import { 
  ShoppingOutlined, 
  DollarOutlined, 
  UserOutlined, 
  ShoppingCartOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

const { Header, Content } = Layout
const { Title } = Typography

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    bots: 0,
    orders: 0,
    revenue: 0,
    customers: 0
  })

  useEffect(() => {
    checkAuth()
    loadStats()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }

  const loadStats = async () => {
    try {
      // Загрузка статистики
      // Это пример - нужно реализовать соответствующий API endpoint
      setStats({
        bots: 0,
        orders: 0,
        revenue: 0,
        customers: 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={3} style={{ margin: 0 }}>Shop Bots Platform</Title>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>
          Выйти
        </Button>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Title level={2}>Панель управления</Title>
        
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Боты"
                value={stats.bots}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Заказы"
                value={stats.orders}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Выручка"
                value={stats.revenue}
                prefix={<DollarOutlined />}
                suffix="₽"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Клиенты"
                value={stats.customers}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card style={{ marginTop: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={4}>Быстрые действия</Title>
            <Space>
              <Button type="primary" onClick={() => router.push('/bots')}>
                Управление ботами
              </Button>
              <Button onClick={() => router.push('/products')}>
                Товары
              </Button>
              <Button onClick={() => router.push('/orders')}>
                Заказы
              </Button>
            </Space>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}

