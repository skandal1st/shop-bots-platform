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
  Form,
  Input,
  Switch,
  message,
  Popconfirm,
  Tag,
  Typography
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

const { Header, Content } = Layout
const { Title } = Typography

interface Bot {
  id: string
  name: string
  isActive: boolean
  adminTelegramId?: string
  welcomeMessage?: string
  createdAt: string
}

export default function BotsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bots, setBots] = useState<Bot[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    checkAuth()
    loadBots()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }

  const loadBots = async () => {
    try {
      setLoading(true)
      const response = await api.get('/bots')
      setBots(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки ботов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingBot(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (bot: Bot) => {
    setEditingBot(bot)
    form.setFieldsValue({
      name: bot.name,
      token: '',
      isActive: bot.isActive,
      adminTelegramId: bot.adminTelegramId || '',
      welcomeMessage: bot.welcomeMessage || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/bots/${id}`)
      message.success('Бот удален')
      loadBots()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка удаления бота')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingBot) {
        await api.put(`/bots/${editingBot.id}`, {
          name: values.name,
          isActive: values.isActive,
          adminTelegramId: values.adminTelegramId || null,
          welcomeMessage: values.welcomeMessage || null
        })
        message.success('Бот обновлен')
      } else {
        await api.post('/bots', {
          token: values.token,
          name: values.name
        })
        message.success('Бот создан')
      }
      setIsModalOpen(false)
      form.resetFields()
      loadBots()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка сохранения бота')
    }
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <RobotOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      )
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Bot) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить бота?"
            description="Это действие нельзя отменить. Все данные бота будут удалены."
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

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
            Управление ботами
          </Title>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              size="large"
            >
              Добавить бота
            </Button>

            <Table
              columns={columns}
              dataSource={bots}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Space>
        </Card>

        <Modal
          title={editingBot ? 'Редактировать бота' : 'Добавить бота'}
          open={isModalOpen}
          onOk={() => form.submit()}
          onCancel={() => {
            setIsModalOpen(false)
            form.resetFields()
          }}
          okText="Сохранить"
          cancelText="Отмена"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ isActive: true }}
          >
            <Form.Item
              label="Название бота"
              name="name"
              rules={[{ required: true, message: 'Введите название бота' }]}
            >
              <Input placeholder="Мой магазин" />
            </Form.Item>

            {!editingBot && (
              <Form.Item
                label="Telegram Bot Token"
                name="token"
                rules={[{ required: true, message: 'Введите токен бота' }]}
                extra="Получите токен у @BotFather в Telegram"
              >
                <Input.Password placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" />
              </Form.Item>
            )}

            {editingBot && (
              <>
                <Form.Item
                  label="Активность"
                  name="isActive"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
                </Form.Item>

                <Form.Item
                  label="Telegram ID администратора"
                  name="adminTelegramId"
                  extra="ID пользователя Telegram для получения уведомлений о заказах. Получите свой ID у @userinfobot"
                >
                  <Input placeholder="123456789" />
                </Form.Item>

                <Form.Item
                  label="Приветственное сообщение"
                  name="welcomeMessage"
                  extra="Сообщение, которое бот отправит при старте"
                >
                  <Input.TextArea
                    placeholder="Добро пожаловать в наш магазин!"
                    rows={3}
                  />
                </Form.Item>
              </>
            )}
          </Form>
        </Modal>
      </Content>
    </Layout>
  )
}
