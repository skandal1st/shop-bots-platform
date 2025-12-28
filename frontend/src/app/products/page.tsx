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
  InputNumber,
  Switch,
  Select,
  message,
  Popconfirm,
  Tag,
  Typography,
  Image,
  Upload
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  ArrowLeftOutlined,
  UploadOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

const { Header, Content } = Layout
const { Title } = Typography
const { TextArea } = Input

interface Product {
  id: string
  name: string
  description: string
  price: string
  article: string | null
  stockQuantity: number
  unlimitedStock: boolean
  isActive: boolean
  images: Array<{ id: string; url: string; order: number }>
  categories: Array<{ category: { id: string; name: string } }>
}

interface Bot {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  emoji: string | null
}

export default function ProductsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false)
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null)
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    loadBots()
  }, [])

  useEffect(() => {
    if (selectedBotId) {
      loadProducts()
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
      const response = await api.get(`/categories/bots/${selectedBotId}`)
      setCategories(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки категорий')
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/products/bots/${selectedBotId}`)
      setProducts(response.data.data || [])
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки товаров')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProduct(null)
    form.resetFields()
    setFileList([])
    form.setFieldsValue({ isActive: true, unlimitedStock: false, stockQuantity: 0 })
    setIsModalOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)

    // Set file list from existing images
    const existingFiles: UploadFile[] = product.images.map((img, index) => ({
      uid: `-${index}`,
      name: `image-${index}.jpg`,
      status: 'done',
      url: `http://localhost:3001${img.url}`
    }))
    setFileList(existingFiles)

    form.setFieldsValue({
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      article: product.article,
      stockQuantity: product.stockQuantity,
      unlimitedStock: product.unlimitedStock,
      isActive: product.isActive,
      categoryIds: product.categories.map(c => c.category.id)
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`)
      message.success('Товар удален')
      loadProducts()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка удаления товара')
    }
  }

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      message.error('Выберите файл для загрузки')
      return
    }

    try {
      setBulkUploadLoading(true)
      const formData = new FormData()
      formData.append('file', bulkUploadFile)

      const response = await api.post(`/products/bots/${selectedBotId}/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { data } = response.data

      if (data.errors.length > 0) {
        message.warning(
          `Загружено товаров: ${data.created} из ${data.total}. Ошибок: ${data.errors.length}`,
          5
        )
        console.log('Ошибки загрузки:', data.errors)
      } else {
        message.success(`Успешно загружено ${data.created} товаров`)
      }

      setIsBulkUploadModalOpen(false)
      setBulkUploadFile(null)
      loadProducts()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки файла')
    } finally {
      setBulkUploadLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      // Collect image URLs from fileList
      const images = fileList
        .filter(file => file.status === 'done')
        .map((file, index) => ({
          url: file.url?.replace('http://localhost:3001', '') || file.response?.data?.url || '',
          order: index
        }))
        .filter(img => img.url)

      const data = {
        name: values.name,
        description: values.description || '',
        price: values.price,
        article: values.article || null,
        stockQuantity: values.unlimitedStock ? 0 : (values.stockQuantity || 0),
        unlimitedStock: values.unlimitedStock || false,
        isActive: values.isActive,
        categoryIds: values.categoryIds || [],
        images
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data)
        message.success('Товар обновлен')
      } else {
        await api.post(`/products/bots/${selectedBotId}`, data)
        message.success('Товар создан')
      }
      setIsModalOpen(false)
      form.resetFields()
      setFileList([])
      loadProducts()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка сохранения товара')
    }
  }

  const uploadProps: UploadProps = {
    name: 'image',
    action: 'http://localhost:3001/api/upload/image',
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`
    },
    listType: 'picture-card',
    fileList,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList)
    },
    onPreview: async (file) => {
      let src = file.url as string
      if (!src) {
        src = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.readAsDataURL(file.originFileObj as File)
          reader.onload = () => resolve(reader.result as string)
        })
      }
      const image = new Image()
      image.src = src
      const imgWindow = window.open(src)
      imgWindow?.document.write(image.outerHTML)
    },
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        message.error('Можно загружать только изображения!')
      }
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isLt5M) {
        message.error('Размер файла не должен превышать 5MB!')
      }
      return isImage && isLt5M
    }
  }

  const columns = [
    {
      title: 'Фото',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      render: (images: any[]) => (
        images && images.length > 0 ? (
          <Image
            src={images[0].url}
            alt="Product"
            width={50}
            height={50}
            style={{ objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div style={{ width: 50, height: 50, background: '#f0f0f0', borderRadius: 4 }} />
        )
      )
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.article && <span style={{ fontSize: 12, color: '#888' }}>Артикул: {record.article}</span>}
        </Space>
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price: string) => `${parseFloat(price).toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Остаток',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 100,
      render: (quantity: number, record: Product) => (
        record.unlimitedStock ? (
          <Tag color="blue">Безлимит</Tag>
        ) : (
          <Tag color={quantity > 0 ? 'green' : 'red'}>{quantity}</Tag>
        )
      )
    },
    {
      title: 'Категории',
      dataIndex: 'categories',
      key: 'categories',
      render: (categories: any[]) => (
        <Space wrap>
          {categories.map(c => (
            <Tag key={c.category.id}>{c.category.name}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: Product) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Изменить
          </Button>
          <Popconfirm
            title="Удалить товар?"
            description="Это действие нельзя отменить."
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
            Управление товарами
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
                size="large"
              >
                Добавить товар
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setIsBulkUploadModalOpen(true)}
                size="large"
              >
                Массовая загрузка
              </Button>
            </Space>

            <Table
              columns={columns}
              dataSource={products}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1200 }}
            />
          </Space>
        </Card>

        <Modal
          title={editingProduct ? 'Редактировать товар' : 'Добавить товар'}
          open={isModalOpen}
          onOk={() => form.submit()}
          onCancel={() => {
            setIsModalOpen(false)
            form.resetFields()
          }}
          okText="Сохранить"
          cancelText="Отмена"
          width={700}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="Название товара"
              name="name"
              rules={[{ required: true, message: 'Введите название товара' }]}
            >
              <Input placeholder="iPhone 15 Pro" />
            </Form.Item>

            <Form.Item
              label="Описание"
              name="description"
            >
              <TextArea rows={4} placeholder="Подробное описание товара" />
            </Form.Item>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                label="Цена (₽)"
                name="price"
                rules={[{ required: true, message: 'Введите цену' }]}
                style={{ width: 200 }}
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="Артикул"
                name="article"
                style={{ width: 200 }}
              >
                <Input placeholder="SKU-001" />
              </Form.Item>
            </Space>

            <Form.Item
              label="Категории"
              name="categoryIds"
            >
              <Select
                mode="multiple"
                placeholder="Выберите категории"
                options={categories.map(cat => ({
                  label: `${cat.emoji || ''} ${cat.name}`.trim(),
                  value: cat.id
                }))}
              />
            </Form.Item>

            <Form.Item label="Изображения товара" extra="Можно загрузить до 10 изображений">
              <Upload {...uploadProps}>
                {fileList.length >= 10 ? null : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Загрузить</div>
                  </div>
                )}
              </Upload>
            </Form.Item>

            <Form.Item
              label="Безлимитный товар"
              name="unlimitedStock"
              valuePropName="checked"
            >
              <Switch checkedChildren="Да" unCheckedChildren="Нет" />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.unlimitedStock !== currentValues.unlimitedStock}
            >
              {({ getFieldValue }) =>
                !getFieldValue('unlimitedStock') ? (
                  <Form.Item
                    label="Количество на складе"
                    name="stockQuantity"
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            {editingProduct && (
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

        <Modal
          title="Массовая загрузка товаров"
          open={isBulkUploadModalOpen}
          onOk={handleBulkUpload}
          onCancel={() => {
            setIsBulkUploadModalOpen(false)
            setBulkUploadFile(null)
          }}
          okText="Загрузить"
          confirmLoading={bulkUploadLoading}
          width={600}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={5}>Формат файла Excel (XLS/XLSX)</Title>
              <p>Файл должен содержать следующие колонки:</p>
              <ul>
                <li><strong>Название</strong> - название товара (обязательно)</li>
                <li><strong>Цена</strong> - цена товара (обязательно)</li>
                <li><strong>Артикул</strong> - артикул товара (опционально)</li>
                <li><strong>Описание</strong> - описание товара (опционально)</li>
                <li><strong>Количество</strong> - количество на складе (опционально, по умолчанию 0)</li>
                <li><strong>Категория</strong> - название существующей категории (опционально)</li>
              </ul>
              <p style={{ color: '#999', fontSize: '12px' }}>
                * Первая строка файла должна содержать заголовки колонок
              </p>
            </div>

            <Upload
              accept=".xls,.xlsx"
              maxCount={1}
              beforeUpload={(file) => {
                setBulkUploadFile(file)
                return false
              }}
              onRemove={() => {
                setBulkUploadFile(null)
              }}
            >
              <Button icon={<UploadOutlined />} block>
                Выбрать файл Excel
              </Button>
            </Upload>

            {bulkUploadFile && (
              <div style={{ padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
                Выбран файл: <strong>{bulkUploadFile.name}</strong>
              </div>
            )}
          </Space>
        </Modal>
      </Content>
    </Layout>
  )
}
