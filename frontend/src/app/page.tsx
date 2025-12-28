'use client'

import { useRouter } from 'next/navigation'
import { Button, Typography, Space, Row, Col, Card } from 'antd'
import {
  RobotOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  StarFilled
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

export default function LandingPage() {
  const router = useRouter()

  const features = [
    {
      icon: <RobotOutlined />,
      title: 'Без кода',
      description: 'Создавайте ботов визуально'
    },
    {
      icon: <ShoppingCartOutlined />,
      title: 'Готовый магазин',
      description: 'Каталог, корзина, оплата'
    },
    {
      icon: <ThunderboltOutlined />,
      title: 'За 15 минут',
      description: 'Быстрый старт продаж'
    },
    {
      icon: <SafetyOutlined />,
      title: 'Безопасность',
      description: 'Защита данных клиентов'
    },
    {
      icon: <BarChartOutlined />,
      title: 'Аналитика',
      description: 'Отслеживание продаж'
    },
    {
      icon: <CheckCircleOutlined />,
      title: 'Поддержка',
      description: 'Помощь 24/7'
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #E0F2FE 0%, #FED7D7 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Navigation */}
      <nav style={{
        padding: '20px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'transparent',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <Text strong style={{ fontSize: 20, color: '#000' }}>Shop Bots</Text>
        </div>

        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <a href="#features" style={{ color: '#666', textDecoration: 'none', fontSize: 15 }}>Возможности</a>
          <a href="#pricing" style={{ color: '#666', textDecoration: 'none', fontSize: 15 }}>Тарифы</a>
          <a href="#footer" style={{ color: '#666', textDecoration: 'none', fontSize: 15 }}>Контакты</a>
        </div>

        <Space size="middle">
          <Button
            type="text"
            onClick={() => router.push('/login')}
            style={{ color: '#000', fontWeight: 500 }}
          >
            Войти
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={() => router.push('/register')}
            style={{
              background: '#1890ff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              height: 44,
              padding: '0 24px'
            }}
          >
            Начать бесплатно
          </Button>
        </Space>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '80px 48px 120px',
        maxWidth: 1400,
        margin: '0 auto'
      }}>
        <Row gutter={[64, 48]} align="middle">
          <Col xs={24} lg={12}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(24, 144, 255, 0.1)',
                padding: '6px 16px',
                borderRadius: 20,
                color: '#1890ff',
                fontSize: 14,
                fontWeight: 600
              }}>
                ⚡ Telegram-боты для бизнеса
              </div>

              <Title
                level={1}
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  margin: 0,
                  color: '#000'
                }}
              >
                Магазин в Telegram
                <br />
                <span style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  за 15 минут
                </span>
              </Title>

              <Paragraph style={{
                fontSize: 20,
                color: '#666',
                lineHeight: 1.6,
                maxWidth: 500
              }}>
                Создавайте Telegram-ботов для продаж без программирования.
                Полный функционал интернет-магазина готов к запуску.
              </Paragraph>

              <Space size="large" style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => router.push('/register')}
                  icon={<ArrowRightOutlined />}
                  iconPosition="end"
                  style={{
                    background: '#000',
                    border: 'none',
                    borderRadius: 12,
                    height: 56,
                    fontSize: 16,
                    fontWeight: 600,
                    padding: '0 32px'
                  }}
                >
                  Начать бесплатно
                </Button>

                <Space style={{ color: '#666' }}>
                  <StarFilled style={{ color: '#faad14' }} />
                  <StarFilled style={{ color: '#faad14' }} />
                  <StarFilled style={{ color: '#faad14' }} />
                  <StarFilled style={{ color: '#faad14' }} />
                  <StarFilled style={{ color: '#faad14' }} />
                  <Text style={{ marginLeft: 8, color: '#666', fontWeight: 500 }}>
                    4.9 из 5
                  </Text>
                </Space>
              </Space>
            </Space>
          </Col>

          <Col xs={24} lg={12}>
            <div style={{ position: 'relative', height: 500 }}>
              {/* Floating Cards */}
              <Card
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 60,
                  width: 280,
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  border: 'none',
                  transform: 'rotate(3deg)'
                }}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 16 }}>Новый заказ</Text>
                    <div style={{
                      background: '#52c41a',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      +54%
                    </div>
                  </div>
                  <div style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 8
                  }}>
                    <Text style={{ fontSize: 12, color: '#666' }}>Товаров: 3</Text>
                    <br />
                    <Text strong style={{ fontSize: 18 }}>2 450 ₽</Text>
                  </div>
                </Space>
              </Card>

              <Card
                style={{
                  position: 'absolute',
                  top: 200,
                  left: 20,
                  width: 260,
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  border: 'none',
                  transform: 'rotate(-5deg)'
                }}
              >
                <Space direction="vertical" size={8}>
                  <ShoppingCartOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <Text strong style={{ fontSize: 16 }}>Активных ботов</Text>
                  <Title level={2} style={{ margin: 0, color: '#1890ff' }}>128</Title>
                  <Text style={{ fontSize: 12, color: '#52c41a' }}>↑ 12% за месяц</Text>
                </Space>
              </Card>

              <Card
                style={{
                  position: 'absolute',
                  bottom: 40,
                  right: 20,
                  width: 240,
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  border: 'none',
                  transform: 'rotate(2deg)'
                }}
              >
                <Space direction="vertical" size={8}>
                  <BarChartOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                  <Text strong style={{ fontSize: 14 }}>Выручка за месяц</Text>
                  <Title level={3} style={{ margin: 0 }}>342 000 ₽</Title>
                </Space>
              </Card>
            </div>
          </Col>
        </Row>
      </section>

      {/* Trusted By Section */}
      <section style={{
        padding: '40px 48px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(10px)'
      }}>
        <Text style={{ color: '#999', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>
          Нам доверяют
        </Text>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 60,
          marginTop: 24,
          flexWrap: 'wrap'
        }}>
          {['Telegram', 'YooKassa', 'E-commerce', 'Retail', 'StartUp'].map((brand, i) => (
            <Text key={i} style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#ccc',
              opacity: 0.6
            }}>
              {brand}
            </Text>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '100px 48px',
        background: '#fff'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <Title level={2} style={{
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 60
          }}>
            Всё для успешных продаж
          </Title>

          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <div style={{
                  padding: 32,
                  borderRadius: 16,
                  background: '#fafafa',
                  height: '100%',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)'
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                >
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    marginBottom: 16
                  }}>
                    {feature.icon}
                  </div>
                  <Title level={4} style={{ marginBottom: 8 }}>{feature.title}</Title>
                  <Text style={{ color: '#666' }}>{feature.description}</Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{
        padding: '100px 48px',
        background: 'linear-gradient(180deg, #fff 0%, #f5f5f5 100%)'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <Title level={2} style={{
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 16
          }}>
            Прозрачные тарифы
          </Title>
          <Paragraph style={{ fontSize: 18, color: '#666', marginBottom: 60 }}>
            Начните бесплатно, обновитесь когда будете готовы
          </Paragraph>

          <Row gutter={32} justify="center">
            <Col xs={24} md={12}>
              <Card style={{
                borderRadius: 24,
                border: 'none',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                padding: 16
              }}>
                <div style={{ padding: 24 }}>
                  <Text style={{ fontSize: 16, color: '#666', fontWeight: 600 }}>FREE</Text>
                  <Title level={1} style={{ margin: '16px 0', fontSize: 56, fontWeight: 800 }}>
                    0₽
                  </Title>
                  <Text style={{ color: '#999' }}>навсегда бесплатно</Text>

                  <div style={{ marginTop: 32, textAlign: 'left' }}>
                    {['До 10 товаров', 'Базовый функционал', 'Email поддержка', '1 бот'].map((f, i) => (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 12 }} />
                        <Text>{f}</Text>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="large"
                    block
                    onClick={() => router.push('/register')}
                    style={{
                      marginTop: 32,
                      height: 52,
                      borderRadius: 12,
                      fontWeight: 600,
                      fontSize: 16
                    }}
                  >
                    Начать
                  </Button>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card style={{
                borderRadius: 24,
                border: '2px solid #1890ff',
                boxShadow: '0 20px 60px rgba(24,144,255,0.2)',
                padding: 16,
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#1890ff',
                  color: '#fff',
                  padding: '6px 24px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  Популярный
                </div>
                <div style={{ padding: 24 }}>
                  <Text style={{ fontSize: 16, color: '#1890ff', fontWeight: 600 }}>PREMIUM</Text>
                  <Title level={1} style={{ margin: '16px 0', fontSize: 56, fontWeight: 800 }}>
                    1 990₽
                  </Title>
                  <Text style={{ color: '#999' }}>в месяц</Text>

                  <div style={{ marginTop: 32, textAlign: 'left' }}>
                    {['Безлимит товаров', 'Приоритетная поддержка', 'Расширенная аналитика', 'API доступ', 'Неограниченно ботов'].map((f, i) => (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <CheckCircleOutlined style={{ color: '#1890ff', marginRight: 12 }} />
                        <Text>{f}</Text>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => router.push('/register')}
                    style={{
                      marginTop: 32,
                      height: 52,
                      borderRadius: 12,
                      fontWeight: 600,
                      fontSize: 16,
                      background: '#1890ff',
                      border: 'none'
                    }}
                  >
                    Начать
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" style={{
        background: '#000',
        color: '#fff',
        padding: '80px 48px 40px'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 32]}>
            <Col xs={24} md={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <RobotOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                <Text strong style={{ fontSize: 24, color: '#fff' }}>Shop Bots</Text>
              </div>
              <Paragraph style={{ color: '#999', fontSize: 16, maxWidth: 400 }}>
                Конструктор Telegram-ботов для интернет-магазинов.
                Создавайте, управляйте и развивайте свой бизнес.
              </Paragraph>
            </Col>
            <Col xs={24} md={12}>
              <Title level={4} style={{ color: '#fff', marginBottom: 16 }}>Реквизиты</Title>
              <div style={{ color: '#999' }}>
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
                    ИП Уткин А.С.
                  </Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#999' }}>ИНН: 504013945628</Text>
                </div>
                <div>
                  <Text style={{ color: '#999' }}>ОГРНИП: 325508100597713</Text>
                </div>
              </div>
            </Col>
          </Row>
          <div style={{
            borderTop: '1px solid #333',
            marginTop: 48,
            paddingTop: 32,
            textAlign: 'center',
            color: '#666'
          }}>
            <Text style={{ color: '#666' }}>
              © 2025 Shop Bots Platform. Все права защищены.
            </Text>
          </div>
        </div>
      </footer>
    </div>
  )
}
