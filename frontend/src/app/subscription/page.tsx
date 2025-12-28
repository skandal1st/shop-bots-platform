'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Typography, Progress, Tag, Table, Space, message, Modal } from 'antd'
import { CrownOutlined, CheckCircleOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title, Text, Paragraph } = Typography

interface Plan {
  id: string
  name: string
  displayName: string
  price: number
  maxProducts: number
  features: string[]
  isActive: boolean
}

interface Subscription {
  id: string
  status: string
  startDate: string
  endDate: string
  plan: Plan
}

export default function SubscriptionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState({ products: 0, maxProducts: 10, isUnlimited: false })
  const [plans, setPlans] = useState<Plan[]>([])
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [currentRes, plansRes] = await Promise.all([
        api.get('/subscriptions/current'),
        api.get('/subscriptions/plans')
      ])

      setCurrentSubscription(currentRes.data.data.subscription)
      setUsage(currentRes.data.data.usage)
      setPlans(plansRes.data.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgrading(true)

      const returnUrl = window.location.origin + '/subscription'
      const response = await api.post('/subscriptions/checkout', {
        planId,
        returnUrl
      })

      const { confirmationUrl, message: msg } = response.data.data

      if (msg) {
        // Если ЮКасса еще не настроена
        message.info(msg)
      } else {
        // Перенаправляем на страницу оплаты ЮКассы
        window.location.href = confirmationUrl
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка создания платежа')
      setUpgrading(false)
    }
  }

  const getProgressColor = () => {
    const percent = usage.isUnlimited ? 0 : (usage.products / usage.maxProducts) * 100
    if (percent >= 90) return '#ff4d4f'
    if (percent >= 70) return '#faad14'
    return '#52c41a'
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: 'Активна' },
      expired: { color: 'default', text: 'Истекла' },
      cancelled: { color: 'error', text: 'Отменена' },
      pending: { color: 'processing', text: 'Ожидание оплаты' }
    }
    const config = statusMap[status] || statusMap.pending
    return <Tag color={config.color}>{config.text}</Tag>
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>Загрузка...</Text>
      </div>
    )
  }

  const currentPlan = currentSubscription?.plan

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Управление подпиской</Title>

      {/* Текущая подписка */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>
              Текущий план: {currentPlan?.displayName || 'Free'}
              {currentPlan?.name === 'premium' && <CrownOutlined style={{ marginLeft: '8px', color: '#faad14' }} />}
            </Title>
            {currentSubscription && getStatusTag(currentSubscription.status)}
          </div>

          {currentSubscription && (
            <div>
              <Text type="secondary">
                Активна до: {new Date(currentSubscription.endDate).toLocaleDateString('ru-RU')}
              </Text>
            </div>
          )}

          {/* Использование лимитов */}
          <div>
            <Text strong>Использование товаров:</Text>
            <div style={{ marginTop: '8px' }}>
              {usage.isUnlimited ? (
                <Text type="success">Безлимит ✨</Text>
              ) : (
                <>
                  <Progress
                    percent={Math.round((usage.products / usage.maxProducts) * 100)}
                    strokeColor={getProgressColor()}
                    format={() => `${usage.products} / ${usage.maxProducts}`}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {usage.maxProducts - usage.products} товаров доступно
                  </Text>
                </>
              )}
            </div>
          </div>

          {/* Возможности плана */}
          {currentPlan && (
            <div>
              <Text strong>Возможности:</Text>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                {currentPlan.features.map((feature, index) => (
                  <li key={index}>
                    <Text>{feature}</Text>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Space>
      </Card>

      {/* Доступные планы */}
      <Title level={3} style={{ marginTop: '32px' }}>Доступные тарифы</Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {plans.map(plan => {
          const isCurrent = currentPlan?.id === plan.id
          const isFree = plan.name === 'free'

          return (
            <Card
              key={plan.id}
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{plan.displayName}</span>
                  {plan.name === 'premium' && <CrownOutlined style={{ color: '#faad14', fontSize: '20px' }} />}
                </div>
              }
              style={{
                border: isCurrent ? '2px solid #1890ff' : undefined,
                boxShadow: isCurrent ? '0 4px 12px rgba(24, 144, 255, 0.2)' : undefined
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    {plan.price === 0 ? 'Бесплатно' : `${plan.price} ₽`}
                  </Title>
                  {plan.price > 0 && <Text type="secondary">в месяц</Text>}
                </div>

                <div>
                  <Text strong>Возможности:</Text>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {plan.features.map((feature, index) => (
                      <li key={index}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                        <Text>{feature}</Text>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type={isCurrent ? 'default' : 'primary'}
                  size="large"
                  block
                  disabled={isCurrent || isFree}
                  loading={upgrading}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrent ? 'Текущий план' : isFree ? 'Базовый план' : 'Перейти на этот план'}
                </Button>
              </Space>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
