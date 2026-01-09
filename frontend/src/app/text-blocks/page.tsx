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
  Select,
  message,
  Popconfirm,
  Tag,
  Typography,
  InputNumber
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

const { Header, Content } = Layout
const { Title } = Typography
const { TextArea } = Input

interface TextBlock {
  id: string
  title: string
  emoji: string | null
  content: string
  isActive: boolean
  order: number
  createdAt: string
}

interface Bot {
  id: string
  name: string
}

export default function TextBlocksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<TextBlock | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    checkAuth()
    loadBots()
  }, [])

  useEffect(() => {
    if (selectedBotId) {
      loadTextBlocks()
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

  const loadTextBlocks = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/text-blocks/bots/${selectedBotId}`)
      setTextBlocks(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки блоков')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingBlock(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, order: 0 })
    setIsModalOpen(true)
  }

  const handleEdit = (block: TextBlock) => {
    setEditingBlock(block)
    form.setFieldsValue({
      title: block.title,
      emoji: block.emoji,
      content: block.content,
      order: block.order,
      isActive: block.isActive
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/text-blocks/${id}`)
      message.success('Блок удален')
      loadTextBlocks()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка удаления блока')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingBlock) {
        await api.put(`/text-blocks/${editingBlock.id}`, {
          title: values.title,
          emoji: values.emoji || null,
          content: values.content,
          order: values.order || 0,
          isActive: values.isActive
        })
        message.success('Блок обновлен')
      } else {
        await api.post(`/text-blocks/bots/${selectedBotId}`, {
          title: values.title,
          emoji: values.emoji || null,
          content: values.content,
          order: values.order || 0
        })
        message.success('Блок создан')
      }
      setIsModalOpen(false)
      form.resetFields()
      loadTextBlocks()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка сохранения блока')
    }
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: TextBlock) => (
        <Space>
          <FileTextOutlined />
          <span>{record.emoji}</span>
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: 'Текст',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300,
      render: (text: string) => (
        <span style={{ color: '#666' }}>
          {text.length > 100 ? text.slice(0, 100) + '...' : text}
        </span>
      )
    },
    {
      title: 'Порядок',
      dataIndex: 'order',
      key: 'order',
      width: 100
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
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: TextBlock) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить блок?"
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
            Информационные блоки
          </Title>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ marginBottom: 16, color: '#666' }}>
              Создавайте текстовые блоки с информацией для клиентов: адрес магазина,
              условия доставки, информация для дистрибьюторов и т.д.
              Блоки будут отображаться как кнопки в меню бота.
            </div>

            <Space>
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
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                Добавить блок
              </Button>
            </Space>

            <Table
              columns={columns}
              dataSource={textBlocks}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 20 }}
            />
          </Space>
        </Card>

        <Modal
          title={editingBlock ? 'Редактировать блок' : 'Добавить блок'}
          open={isModalOpen}
          onOk={() => form.submit()}
          onCancel={() => {
            setIsModalOpen(false)
            form.resetFields()
          }}
          okText="Сохранить"
          cancelText="Отмена"
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ isActive: true, order: 0 }}
          >
            <Form.Item
              label="Название кнопки"
              name="title"
              rules={[{ required: true, message: 'Введите название' }]}
              extra="Это название будет отображаться на кнопке в меню бота"
            >
              <Input placeholder="Адрес магазина" />
            </Form.Item>

            <Form.Item
              label="Эмодзи"
              name="emoji"
            >
              <Input placeholder="📍" maxLength={2} style={{ width: 100 }} />
            </Form.Item>

            <Form.Item
              label="Текст блока"
              name="content"
              rules={[{ required: true, message: 'Введите текст' }]}
              extra="Этот текст будет показан пользователю при нажатии на кнопку"
            >
              <TextArea
                rows={6}
                placeholder="Наш магазин находится по адресу: г. Москва, ул. Примерная, д. 1&#10;&#10;Режим работы: Пн-Пт 9:00-18:00"
              />
            </Form.Item>

            <Form.Item
              label="Порядок сортировки"
              name="order"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            {editingBlock && (
              <Form.Item
                label="Активность"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </Content>
    </Layout>
  )
}
