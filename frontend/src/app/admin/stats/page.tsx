'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Row, Col, Statistic, Select, Typography, message, Space } from 'antd'
import {
  UserOutlined, RobotOutlined, CrownOutlined, DollarOutlined,
  RiseOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography
const { Option } = Select

interface Stats {
  overview: {
    totalUsers: number
    totalBots: number
    activeSubscriptions: number
    totalRevenue: number
    newUsers: number
  }
  subscriptionsByPlan: Array<{
    planName: string
    count: number
  }>
  userGrowth: Array<{
    date: string
    count: number
  }>
  period: string
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    loadStats()
  }, [period])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/stats', {
        params: { period }
      })
      setStats(response.data.data)
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('Доступ запрещен. Требуется роль superadmin')
        router.push('/dashboard')
      } else {
        message.error(error.response?.data?.message || 'Ошибка загрузки статистики')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!stats) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Typography.Text>Загрузка...</Typography.Text>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>Статистика платформы</Title>
          <Select value={period} onChange={setPeriod} style={{ width: 150 }}>
            <Option value="7d">7 дней</Option>
            <Option value="30d">30 дней</Option>
            <Option value="90d">90 дней</Option>
          </Select>
        </div>

        {/* Общая статистика */}
        <Row gutter={16}>
          <Col span={6}>
            <Card loading={loading}>
              <Statistic
                title="Всего пользователей"
                value={stats.overview.totalUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card loading={loading}>
              <Statistic
                title="Всего ботов"
                value={stats.overview.totalBots}
                prefix={<RobotOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card loading={loading}>
              <Statistic
                title="Активные подписки"
                value={stats.overview.activeSubscriptions}
                prefix={<CrownOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card loading={loading}>
              <Statistic
                title="Общая выручка"
                value={stats.overview.totalRevenue}
                prefix={<DollarOutlined />}
                suffix="₽"
                precision={2}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Новые пользователи за период */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Новые пользователи за период" loading={loading}>
              <Statistic
                value={stats.overview.newUsers}
                prefix={<RiseOutlined />}
                suffix={`за ${period === '7d' ? '7 дней' : period === '30d' ? '30 дней' : '90 дней'}`}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>

          {/* Распределение подписок */}
          <Col span={12}>
            <Card title="Распределение подписок" loading={loading}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {stats.subscriptionsByPlan.map(item => (
                  <div key={item.planName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.planName}:</span>
                    <Statistic
                      value={item.count}
                      valueStyle={{ fontSize: '16px' }}
                    />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* График роста пользователей (упрощенный) */}
        <Card title="Рост пользователей (последние 30 дней)" loading={loading}>
          <div style={{ padding: '20px' }}>
            <Typography.Text type="secondary">
              График показывает регистрацию новых пользователей по дням
            </Typography.Text>
            <div style={{ marginTop: '16px', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
              {stats.userGrowth.map((item, index) => {
                const maxCount = Math.max(...stats.userGrowth.map(d => d.count)) || 1
                const height = (item.count / maxCount) * 180
                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      height: `${height || 4}px`,
                      backgroundColor: '#1890ff',
                      borderRadius: '2px 2px 0 0',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    title={`${item.date}: ${item.count} пользователей`}
                  />
                )
              })}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {stats.userGrowth[0]?.date}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {stats.userGrowth[stats.userGrowth.length - 1]?.date}
              </Typography.Text>
            </div>
          </div>
        </Card>
      </Space>
    </div>
  )
}
