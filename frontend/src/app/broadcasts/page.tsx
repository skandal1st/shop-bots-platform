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
  Modal,
  Form,
  Input,
  DatePicker,
  Popconfirm,
  Statistic,
  Row,
  Col
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  SendOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ExperimentOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import dayjs from 'dayjs'

const { Header, Content } = Layout
const { Title, Text } = Typography
const { TextArea } = Input

interface Broadcast {
  id: string
  name: string
  message: string
  imageUrl: string | null
  buttons: Array<{ text: string; url: string }>
  audienceFilter: { type: string; date?: string }
  scheduledAt: string | null
  sentAt: string | null
  stats: { total: number; sent: number; failed: number }
  createdAt: string
}

interface Bot {
  id: string
  name: string
}

const audienceOptions = [
  { value: 'all', label: 'Все клиенты' },
  { value: 'with_orders', label: 'Сделавшие заказ' },
  { value: 'without_orders', label: 'Без заказов' },
  { value: 'registered_after', label: 'Зарегистрированы после' },
  { value: 'registered_before', label: 'Зарегистрированы до' }
]

export default function BroadcastsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null)
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [form] = Form.useForm()
  const audienceType = Form.useWatch(['audienceFilter', 'type'], form)
  const needsDate = audienceType === 'registered_after' || audienceType === 'registered_before'

  useEffect(() => {
    checkAuth()
    loadBots()
  }, [])

  useEffect(() => {
    if (selectedBotId) {
      loadBroadcasts()
    }
  }, [selectedBotId])

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

  const loadBroadcasts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/broadcasts/bots/${selectedBotId}`)
      setBroadcasts(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки рассылок')
    } finally {
      setLoading(false)
    }
  }

  const loadAudienceCount = async (audienceFilter: any) => {
    try {
      const response = await api.post(`/broadcasts/bots/${selectedBotId}/audience-count`, {
        audienceFilter
      })
      setAudienceCount(response.data.data.count)
    } catch (error) {
      setAudienceCount(null)
    }
  }

  const handleCreate = () => {
    setEditingBroadcast(null)
    form.resetFields()
    form.setFieldsValue({
      audienceFilter: { type: 'all' }
    })
    setAudienceCount(null)
    setModalVisible(true)
    loadAudienceCount({ type: 'all' })
  }

  const handleEdit = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast)
    form.setFieldsValue({
      name: broadcast.name,
      message: broadcast.message,
      imageUrl: broadcast.imageUrl,
      audienceFilter: broadcast.audienceFilter,
      audienceDate: broadcast.audienceFilter.date ? dayjs(broadcast.audienceFilter.date) : null,
      buttons: broadcast.buttons?.length > 0 ? JSON.stringify(broadcast.buttons, null, 2) : ''
    })
    setAudienceCount(null)
    setModalVisible(true)
    loadAudienceCount(broadcast.audienceFilter)
  }

  const handleSubmit = async (values: any) => {
    try {
      const audienceFilter: any = { type: values.audienceFilter.type }
      if (values.audienceDate) {
        audienceFilter.date = values.audienceDate.toISOString()
      }

      let buttons = []
      if (values.buttons) {
        try {
          buttons = JSON.parse(values.buttons)
        } catch (e) {
          message.error('Неверный формат кнопок (JSON)')
          return
        }
      }

      const data = {
        name: values.name,
        message: values.message,
        imageUrl: values.imageUrl || null,
        audienceFilter,
        buttons
      }

      if (editingBroadcast) {
        await api.put(`/broadcasts/${editingBroadcast.id}`, data)
        message.success('Рассылка обновлена')
      } else {
        await api.post(`/broadcasts/bots/${selectedBotId}`, data)
        message.success('Рассылка создана')
      }

      setModalVisible(false)
      loadBroadcasts()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка сохранения')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/broadcasts/${id}`)
      message.success('Рассылка удалена')
      loadBroadcasts()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка удаления')
    }
  }

  const handleTestSend = async (id: string) => {
    try {
      setSending(true)
      await api.post(`/broadcasts/${id}/test`)
      message.success('Тестовое сообщение отправлено администратору')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка отправки')
    } finally {
      setSending(false)
    }
  }

  const handleSend = async (broadcast: Broadcast) => {
    try {
      setSending(true)
      const response = await api.post(`/broadcasts/${broadcast.id}/send`)
      message.success(response.data.message)
      loadBroadcasts()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка отправки')
    } finally {
      setSending(false)
    }
  }

  const getAudienceLabel = (filter: { type: string; date?: string }) => {
    const option = audienceOptions.find(o => o.value === filter.type)
    let label = option?.label || filter.type
    if (filter.date) {
      label += ` (${new Date(filter.date).toLocaleDateString('ru-RU')})`
    }
    return label
  }

  const columns: ColumnsType<Broadcast> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.message.substring(0, 50)}...
          </Text>
        </Space>
      )
    },
    {
      title: 'Аудитория',
      key: 'audience',
      width: 200,
      render: (_, record) => getAudienceLabel(record.audienceFilter)
    },
    {
      title: 'Статус',
      key: 'status',
      width: 150,
      render: (_, record) => {
        if (record.sentAt) {
          return <Tag color="green">Отправлено</Tag>
        }
        if (record.scheduledAt) {
          return <Tag color="blue">Запланировано</Tag>
        }
        return <Tag color="default">Черновик</Tag>
      }
    },
    {
      title: 'Статистика',
      key: 'stats',
      width: 200,
      render: (_, record) => {
        if (!record.sentAt) return '-'
        const stats = record.stats
        return (
          <Space size="small">
            <Text type="success">{stats.sent}</Text>
            <Text type="secondary">/</Text>
            <Text>{stats.total}</Text>
            {stats.failed > 0 && (
              <>
                <Text type="secondary">(</Text>
                <Text type="danger">{stats.failed} ошибок</Text>
                <Text type="secondary">)</Text>
              </>
            )}
          </Space>
        )
      }
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {!record.sentAt && (
            <>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
              <Button
                type="text"
                icon={<ExperimentOutlined />}
                onClick={() => handleTestSend(record.id)}
                loading={sending}
                title="Тестовая отправка"
              />
              <Popconfirm
                title="Отправить рассылку?"
                description={`Будет отправлено ${record.audienceFilter.type === 'all' ? 'всем' : 'выбранным'} клиентам`}
                onConfirm={() => handleSend(record)}
                okText="Отправить"
                cancelText="Отмена"
              >
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  loading={sending}
                />
              </Popconfirm>
            </>
          )}
          <Popconfirm
            title="Удалить рассылку?"
            onConfirm={() => handleDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
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
            Рассылки
          </Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Создать рассылку
        </Button>
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
            </Space>

            <Table
              columns={columns}
              dataSource={broadcasts}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              locale={{
                emptyText: 'Рассылок пока нет'
              }}
            />
          </Space>
        </Card>
      </Content>

      <Modal
        title={editingBroadcast ? 'Редактировать рассылку' : 'Новая рассылка'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Название рассылки"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Например: Новогодняя акция" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Текст сообщения"
            rules={[{ required: true, message: 'Введите текст' }]}
            extra="Поддерживается HTML-разметка: <b>жирный</b>, <i>курсив</i>, <a href='url'>ссылка</a>"
          >
            <TextArea rows={5} placeholder="Текст сообщения для рассылки..." />
          </Form.Item>

          <Form.Item
            name="imageUrl"
            label="URL изображения"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={needsDate ? 12 : 24}>
              <Form.Item
                name={['audienceFilter', 'type']}
                label="Аудитория"
                rules={[{ required: true }]}
              >
                <Select
                  options={audienceOptions}
                  onChange={(value) => {
                    const filter: any = { type: value }
                    const dateValue = form.getFieldValue('audienceDate')
                    if (dateValue && (value === 'registered_after' || value === 'registered_before')) {
                      filter.date = dateValue.toISOString()
                    }
                    loadAudienceCount(filter)
                  }}
                />
              </Form.Item>
            </Col>
            {needsDate && (
              <Col span={12}>
                <Form.Item
                  name="audienceDate"
                  label="Дата"
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    onChange={(date) => {
                      const type = form.getFieldValue(['audienceFilter', 'type'])
                      const filter: any = { type }
                      if (date) {
                        filter.date = date.toISOString()
                      }
                      loadAudienceCount(filter)
                    }}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {audienceCount !== null && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Statistic
                title="Получателей"
                value={audienceCount}
                suffix="клиентов"
              />
            </Card>
          )}

          <Form.Item
            name="buttons"
            label="Кнопки (JSON)"
            extra='Формат: [{"text": "Текст кнопки", "url": "https://..."}]'
          >
            <TextArea rows={3} placeholder='[{"text": "Перейти в магазин", "url": "https://..."}]' />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingBroadcast ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
