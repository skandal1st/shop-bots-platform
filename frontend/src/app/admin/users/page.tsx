'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card, Table, Button, Input, Select, Space, Tag, message, Modal, Form,
  Popconfirm, Descriptions, Badge, Typography
} from 'antd'
import {
  SearchOutlined, UserOutlined, LockOutlined, UnlockOutlined,
  CrownOutlined, EditOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography
const { Option } = Select

interface User {
  id: string
  email: string
  role: string
  isBlocked: boolean
  createdAt: string
  subscriptions: any[]
  bots: any[]
  _count: { bots: number; payments: number }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [roleModalVisible, setRoleModalVisible] = useState(false)
  const [assignSubscriptionModalVisible, setAssignSubscriptionModalVisible] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    checkAuth()
    loadPlans()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [pagination.current, search, statusFilter])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/users', {
        params: {
          page: pagination.current,
          limit: pagination.pageSize,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      })

      setUsers(response.data.data.users)
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination.total
      }))
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('Доступ запрещен. Требуется роль superadmin')
        router.push('/dashboard')
      } else {
        message.error(error.response?.data?.message || 'Ошибка загрузки пользователей')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPlans = async () => {
    try {
      const response = await api.get('/subscriptions/plans')
      setPlans(response.data.data)
    } catch (error) {
      console.error('Failed to load plans:', error)
    }
  }

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/block`, { isBlocked })
      message.success(isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован')
      loadUsers()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка')
    }
  }

  const handleChangeRole = async (values: any) => {
    try {
      await api.put(`/admin/users/${selectedUser.id}/role`, { role: values.role })
      message.success('Роль обновлена')
      setRoleModalVisible(false)
      loadUsers()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка')
    }
  }

  const handleAssignSubscription = async (values: any) => {
    try {
      await api.post('/admin/subscriptions/assign', {
        userId: selectedUser.id,
        planId: values.planId,
        durationMonths: values.durationMonths
      })
      message.success('Подписка назначена')
      setAssignSubscriptionModalVisible(false)
      loadUsers()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка')
    }
  }

  const handleViewDetails = async (user: User) => {
    try {
      const response = await api.get(`/admin/users/${user.id}`)
      setSelectedUser(response.data.data)
      setDetailsModalVisible(true)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки деталей')
    }
  }

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string, record: User) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
          {record.role === 'superadmin' && <CrownOutlined style={{ color: '#faad14' }} />}
        </Space>
      )
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'superadmin' ? 'gold' : 'blue'}>
          {role === 'superadmin' ? 'Суперадмин' : 'Пользователь'}
        </Tag>
      )
    },
    {
      title: 'Подписка',
      key: 'subscription',
      render: (_: any, record: User) => {
        const subscription = record.subscriptions[0]
        if (!subscription) return <Tag>Free</Tag>
        return <Tag color="green">{subscription.plan.displayName}</Tag>
      }
    },
    {
      title: 'Ботов',
      key: 'bots',
      render: (_: any, record: User) => record._count.bots
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: User) => (
        record.isBlocked ?
          <Badge status="error" text="Заблокирован" /> :
          <Badge status="success" text="Активен" />
      )
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetails(record)}
          >
            Детали
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedUser(record)
              form.setFieldsValue({ role: record.role })
              setRoleModalVisible(true)
            }}
          >
            <EditOutlined /> Роль
          </Button>
          <Popconfirm
            title={record.isBlocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?'}
            onConfirm={() => handleBlockUser(record.id, !record.isBlocked)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="link"
              size="small"
              danger={!record.isBlocked}
            >
              {record.isBlocked ? <UnlockOutlined /> : <LockOutlined />}
              {record.isBlocked ? 'Разблокировать' : 'Заблокировать'}
            </Button>
          </Popconfirm>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedUser(record)
              form.resetFields()
              setAssignSubscriptionModalVisible(true)
            }}
          >
            Назначить подписку
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Управление пользователями</Title>

      <Card>
        <Space style={{ marginBottom: '16px', width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Поиск по email"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '300px' }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '150px' }}
            >
              <Option value="all">Все статусы</Option>
              <Option value="active">Активные</Option>
              <Option value="blocked">Заблокированные</Option>
            </Select>
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => setPagination(prev => ({ ...prev, current: page }))
          }}
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title="Детали пользователя"
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedUser && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Email" span={2}>{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Роль">{selectedUser.role}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              {selectedUser.isBlocked ? 'Заблокирован' : 'Активен'}
            </Descriptions.Item>
            <Descriptions.Item label="Ботов">{selectedUser.bots?.length || 0}</Descriptions.Item>
            <Descriptions.Item label="Платежей">{selectedUser.payments?.length || 0}</Descriptions.Item>
            <Descriptions.Item label="Дата регистрации" span={2}>
              {new Date(selectedUser.createdAt).toLocaleString('ru-RU')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Change Role Modal */}
      <Modal
        title="Изменить роль"
        open={roleModalVisible}
        onCancel={() => setRoleModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleChangeRole} layout="vertical">
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select>
              <Option value="user">Пользователь</Option>
              <Option value="superadmin">Суперадмин</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Subscription Modal */}
      <Modal
        title="Назначить подписку"
        open={assignSubscriptionModalVisible}
        onCancel={() => setAssignSubscriptionModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleAssignSubscription} layout="vertical">
          <Form.Item name="planId" label="План" rules={[{ required: true }]}>
            <Select>
              {plans.map(plan => (
                <Option key={plan.id} value={plan.id}>{plan.displayName}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="durationMonths" label="Длительность (месяцев)" initialValue={1} rules={[{ required: true }]}>
            <Select>
              <Option value={1}>1 месяц</Option>
              <Option value={3}>3 месяца</Option>
              <Option value={6}>6 месяцев</Option>
              <Option value={12}>12 месяцев</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
