'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Select,
  message,
  Tag,
  Typography,
  Input
} from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  SearchOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'

const { Header, Content } = Layout
const { Title, Text } = Typography

interface Customer {
  id: string
  firstName: string
  lastName: string | null
  username: string | null
  phone: string | null
  telegramId: string
  totalOrders: number
  totalSpent: number
  createdAt: string
}

interface Bot {
  id: string
  name: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [searchText, setSearchText] = useState<string>('')

  useEffect(() => {
    checkAuth()
    loadBots()
  }, [])

  useEffect(() => {
    if (selectedBotId) {
      loadCustomers()
    }
  }, [selectedBotId, searchText])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }

  const loadBots = async () => {
    try {
      const response = await api.get('/bots')
      const botsData = response.data.data || []
      setBots(botsData)
      if (botsData.length > 0) {
        setSelectedBotId(botsData[0].id)
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки ботов')
    }
  }

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (searchText) {
        params.search = searchText
      }
      const response = await api.get(`/customers/bots/${selectedBotId}`, { params })
      setCustomers(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки клиентов')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<Customer> = [
    {
      title: 'Клиент',
      key: 'customer',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            <UserOutlined />
            <Text strong>{`${record.firstName} ${record.lastName || ''}`.trim()}</Text>
          </Space>
          {record.username && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              @{record.username}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string | null) => phone || '-'
    },
    {
      title: 'Заказов',
      key: 'orders',
      width: 120,
      render: (_, record) => (
        <Space>
          <ShoppingCartOutlined />
          <span>{record.totalOrders}</span>
        </Space>
      )
    },
    {
      title: 'Всего потрачено',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      width: 150,
      render: (total: number) => `${total.toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    }
  ]

  if (bots.length === 0) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/dashboard')}
          >
            Назад
          </Button>
        </Header>
        <Content style={{ padding: '24px' }}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
              <Title level={4}>Сначала создайте бота</Title>
              <Button type="primary" onClick={() => router.push('/bots')}>
                Создать бота
              </Button>
            </Space>
          </Card>
        </Content>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/dashboard')}
          >
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Клиенты
          </Title>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space wrap>
              <span>Бот:</span>
              <Select
                style={{ width: 200 }}
                value={selectedBotId}
                onChange={setSelectedBotId}
                options={bots.map(bot => ({
                  label: bot.name,
                  value: bot.id
                }))}
              />
              <Input
                placeholder="Поиск по имени, телефону..."
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Space>

            <Table
              columns={columns}
              dataSource={customers}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              locale={{
                emptyText: 'Клиентов пока нет'
              }}
            />
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}
