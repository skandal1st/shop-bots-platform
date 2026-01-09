'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Modal,
  Select,
  message,
  Tag,
  Typography,
  Descriptions,
  Timeline,
  Input
} from 'antd'
import {
  EyeOutlined,
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  UserOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'

const { Header, Content } = Layout
const { Title, Text } = Typography

interface Order {
  id: string
  orderNumber: string
  total: string
  paymentMethod: string
  deliveryAddress: string
  customerComment: string | null
  adminNotes: string | null
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string | null
    phone: string | null
  }
  status: {
    id: string
    name: string
    color: string
  }
  items: Array<{
    id: string
    productName: string
    price: string
    quantity: number
    imageUrl: string | null
  }>
  statusHistory?: Array<{
    changedAt: string
    status: {
      name: string
      color: string
    }
  }>
}

interface Bot {
  id: string
  name: string
}

interface OrderStatus {
  id: string
  name: string
  color: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [statuses, setStatuses] = useState<OrderStatus[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [filterStatusId, setFilterStatusId] = useState<string | undefined>(undefined)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    checkAuth()
    loadBots()
  }, [])

  useEffect(() => {
    if (selectedBotId) {
      loadOrders()
      loadStatuses()
    }
  }, [selectedBotId, filterStatusId])

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

  const loadStatuses = async () => {
    try {
      const response = await api.get(`/settings/bots/${selectedBotId}/statuses`)
      setStatuses(response.data.data || [])
    } catch (error: any) {
      // Если нет эндпоинта для статусов, используем пустой массив
      setStatuses([])
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filterStatusId) {
        params.statusId = filterStatusId
      }
      const response = await api.get(`/orders/bots/${selectedBotId}`, { params })
      setOrders(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки заказов')
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = async (orderId: string) => {
    try {
      const response = await api.get(`/orders/${orderId}`)
      setSelectedOrder(response.data.data)
      setIsDetailModalOpen(true)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки заказа')
    }
  }

  const handleUpdateStatus = async (statusId: string) => {
    if (!selectedOrder) return

    try {
      setUpdatingStatus(true)
      await api.put(`/orders/${selectedOrder.id}/status`, { statusId })
      message.success('Статус заказа обновлен')
      loadOrders()
      setIsDetailModalOpen(false)
      setSelectedOrder(null)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка обновления статуса')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const columns: ColumnsType<Order> = [
    {
      title: '№ Заказа',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string, record: Order) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 600 }}
          onClick={() => handleViewOrder(record.id)}
        >
          {text}
        </Button>
      )
    },
    {
      title: 'Клиент',
      key: 'customer',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{`${record.customer.firstName} ${record.customer.lastName || ''}`.trim()}</Text>
          {record.customer.phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.customer.phone}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Товаров',
      key: 'itemsCount',
      width: 100,
      render: (_, record) => (
        <Space>
          <ShoppingCartOutlined />
          <span>{record.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </Space>
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (total: string) => `${parseFloat(total).toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Статус',
      key: 'status',
      width: 150,
      render: (_, record) => (
        <Tag color={record.status.color || 'blue'}>
          {record.status.name}
        </Tag>
      )
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewOrder(record.id)}
        >
          Просмотр
        </Button>
      )
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
            Управление заказами
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
              {statuses.length > 0 && (
                <>
                  <span>Статус:</span>
                  <Select
                    style={{ width: 200 }}
                    allowClear
                    placeholder="Все статусы"
                    value={filterStatusId}
                    onChange={setFilterStatusId}
                    options={statuses.map(status => ({
                      label: status.name,
                      value: status.id
                    }))}
                  />
                </>
              )}
            </Space>

            <Table
              columns={columns}
              dataSource={orders}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              locale={{
                emptyText: 'Заказов пока нет'
              }}
            />
          </Space>
        </Card>

        <Modal
          title={`Заказ ${selectedOrder?.orderNumber}`}
          open={isDetailModalOpen}
          onCancel={() => {
            setIsDetailModalOpen(false)
            setSelectedOrder(null)
          }}
          footer={null}
          width={800}
        >
          {selectedOrder && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Дата заказа" span={2}>
                  {new Date(selectedOrder.createdAt).toLocaleString('ru-RU')}
                </Descriptions.Item>
                <Descriptions.Item label="Клиент" span={2}>
                  <Space>
                    <UserOutlined />
                    <span>
                      {`${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName || ''}`.trim()}
                    </span>
                  </Space>
                </Descriptions.Item>
                {selectedOrder.customer.phone && (
                  <Descriptions.Item label="Телефон" span={2}>
                    {selectedOrder.customer.phone}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Способ оплаты" span={2}>
                  {selectedOrder.paymentMethod}
                </Descriptions.Item>
                <Descriptions.Item label="Адрес доставки" span={2}>
                  {selectedOrder.deliveryAddress}
                </Descriptions.Item>
                {selectedOrder.customerComment && (
                  <Descriptions.Item label="Комментарий клиента" span={2}>
                    {selectedOrder.customerComment}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Текущий статус" span={2}>
                  <Tag color={selectedOrder.status.color}>
                    {selectedOrder.status.name}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <div>
                <Title level={5}>Состав заказа</Title>
                <Table
                  size="small"
                  dataSource={selectedOrder.items}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Товар',
                      dataIndex: 'productName',
                      key: 'productName'
                    },
                    {
                      title: 'Цена',
                      dataIndex: 'price',
                      key: 'price',
                      render: (price: string) => `${parseFloat(price).toLocaleString('ru-RU')} ₽`
                    },
                    {
                      title: 'Кол-во',
                      dataIndex: 'quantity',
                      key: 'quantity'
                    },
                    {
                      title: 'Сумма',
                      key: 'sum',
                      render: (_, record) =>
                        `${(parseFloat(record.price) * record.quantity).toLocaleString('ru-RU')} ₽`
                    }
                  ]}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <Text strong>Итого:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <Text strong>
                            {parseFloat(selectedOrder.total).toLocaleString('ru-RU')} ₽
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </div>

              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div>
                  <Title level={5}>История статусов</Title>
                  <Timeline
                    items={selectedOrder.statusHistory.map(h => ({
                      children: (
                        <Space>
                          <Tag color={h.status.color}>{h.status.name}</Tag>
                          <Text type="secondary">
                            {new Date(h.changedAt).toLocaleString('ru-RU')}
                          </Text>
                        </Space>
                      )
                    }))}
                  />
                </div>
              )}

              {statuses.length > 0 && (
                <div>
                  <Title level={5}>Изменить статус</Title>
                  <Space>
                    <Select
                      style={{ width: 300 }}
                      placeholder="Выберите новый статус"
                      onChange={handleUpdateStatus}
                      loading={updatingStatus}
                      options={statuses
                        .filter(s => s.id !== selectedOrder.status.id)
                        .map(status => ({
                          label: status.name,
                          value: status.id
                        }))}
                    />
                  </Space>
                </div>
              )}
            </Space>
          )}
        </Modal>
      </Content>
    </Layout>
  )
}
