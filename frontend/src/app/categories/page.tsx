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
  FolderOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

const { Header, Content } = Layout
const { Title } = Typography

interface Category {
  id: string
  name: string
  parentId: string | null
  emoji: string | null
  order: number
  isActive: boolean
  createdAt: string
}

interface Bot {
  id: string
  name: string
}

export default function CategoriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    checkAuth()
    loadBots()
  }, [])

  useEffect(() => {
    if (selectedBotId) {
      loadCategories()
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

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/categories/bots/${selectedBotId}`)
      setCategories(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки категорий')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, order: 0 })
    setIsModalOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    form.setFieldsValue({
      name: category.name,
      parentId: category.parentId,
      emoji: category.emoji,
      order: category.order,
      isActive: category.isActive
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`)
      message.success('Категория удалена')
      loadCategories()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка удаления категории')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, {
          name: values.name,
          parentId: values.parentId || null,
          emoji: values.emoji || null,
          order: values.order || 0,
          isActive: values.isActive
        })
        message.success('Категория обновлена')
      } else {
        await api.post(`/categories/bots/${selectedBotId}`, {
          name: values.name,
          parentId: values.parentId || null,
          emoji: values.emoji || null,
          order: values.order || 0
        })
        message.success('Категория создана')
      }
      setIsModalOpen(false)
      form.resetFields()
      loadCategories()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка сохранения категории')
    }
  }

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return '-'
    const category = categories.find(c => c.id === categoryId)
    return category ? `${category.emoji || ''} ${category.name}`.trim() : '-'
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Category) => (
        <Space>
          <FolderOutlined />
          <span>{record.emoji}</span>
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: 'Родительская категория',
      dataIndex: 'parentId',
      key: 'parentId',
      render: (parentId: string | null) => getCategoryName(parentId)
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
          {isActive ? 'Активна' : 'Неактивна'}
        </Tag>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить категорию?"
            description="Подкатегории также будут удалены."
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
            Управление категориями
          </Title>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
                Добавить категорию
              </Button>
            </Space>

            <Table
              columns={columns}
              dataSource={categories}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 20 }}
            />
          </Space>
        </Card>

        <Modal
          title={editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
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
            initialValues={{ isActive: true, order: 0 }}
          >
            <Form.Item
              label="Название категории"
              name="name"
              rules={[{ required: true, message: 'Введите название категории' }]}
            >
              <Input placeholder="Электроника" />
            </Form.Item>

            <Form.Item
              label="Эмодзи"
              name="emoji"
            >
              <Input placeholder="📱" maxLength={2} />
            </Form.Item>

            <Form.Item
              label="Родительская категория"
              name="parentId"
            >
              <Select
                allowClear
                placeholder="Выберите категорию"
                options={[
                  { label: 'Нет (корневая категория)', value: null },
                  ...categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(cat => ({
                      label: `${cat.emoji || ''} ${cat.name}`.trim(),
                      value: cat.id
                    }))
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Порядок сортировки"
              name="order"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            {editingCategory && (
              <Form.Item
                label="Активность"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="Активна" unCheckedChildren="Неактивна" />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </Content>
    </Layout>
  )
}
