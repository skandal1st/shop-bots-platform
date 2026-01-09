'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  RobotOutlined,
  ShoppingOutlined,
  TeamOutlined,
  CrownOutlined,
  UserOutlined,
  BarChartOutlined,
  TagsOutlined,
  ShoppingCartOutlined,
  NotificationOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import api from '@/lib/api'

type MenuItem = Required<MenuProps>['items'][number]

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('user')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    try {
      const response = await api.get('/auth/me')
      setUserRole(response.data.data.role || 'user')
    } catch (error) {
      console.error('Failed to load user role:', error)
    } finally {
      setLoading(false)
    }
  }

  const userItems: MenuItem[] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Панель управления'
    },
    {
      key: '/bots',
      icon: <RobotOutlined />,
      label: 'Боты'
    },
    {
      key: '/categories',
      icon: <TagsOutlined />,
      label: 'Категории'
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Товары'
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: 'Заказы'
    },
    {
      key: '/customers',
      icon: <TeamOutlined />,
      label: 'Клиенты'
    },
    {
      key: '/broadcasts',
      icon: <NotificationOutlined />,
      label: 'Рассылки'
    },
    {
      key: '/text-blocks',
      icon: <FileTextOutlined />,
      label: 'Инфо-блоки'
    },
    {
      key: '/subscription',
      icon: <CrownOutlined />,
      label: 'Подписка',
      style: { marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }
    }
  ]

  const adminItems: MenuItem[] = [
    {
      key: 'admin-divider',
      type: 'divider'
    },
    {
      key: 'admin-group',
      label: 'Администрирование',
      type: 'group',
      children: [
        {
          key: '/admin/stats',
          icon: <BarChartOutlined />,
          label: 'Статистика платформы'
        },
        {
          key: '/admin/users',
          icon: <UserOutlined />,
          label: 'Пользователи'
        }
      ]
    }
  ]

  const items = userRole === 'superadmin' ? [...userItems, ...adminItems] : userItems

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key && !key.startsWith('admin-')) {
      router.push(key)
    }
  }

  if (loading) {
    return null
  }

  return (
    <Menu
      mode="inline"
      selectedKeys={[pathname]}
      items={items}
      onClick={handleMenuClick}
      style={{ height: '100%', borderRight: 0 }}
    />
  )
}
