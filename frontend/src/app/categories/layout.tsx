'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from 'antd'
import Navigation from '@/components/Navigation'

const { Header, Sider, Content } = Layout

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={250}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#fff',
          borderRight: '1px solid #f0f0f0'
        }}
      >
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Shop Bots</h2>
        </div>
        <Navigation />
      </Sider>
      <Layout style={{ marginLeft: 250 }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div></div>
        </Header>
        <Content style={{ margin: '0', overflow: 'initial', background: '#f0f2f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
