import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import ChatBot from '../ChatBot'

const NAV = [
  { to: '/',            icon: '⊞', label: 'Хяналтын самбар', roles: ['ALL'] },
  { to: '/fleet',       icon: '🚛', label: 'Флот',             roles: ['ADMIN','MANAGER','MECHANIC'] },
  { to: '/pm',          icon: '🔧', label: 'PM хуваарь',       roles: ['ADMIN','MANAGER','MECHANIC'] },
  { to: '/breakdowns',  icon: '⚠',  label: 'Эвдрэл',           roles: ['ADMIN','MANAGER','MECHANIC'] },
  { to: '/predictions', icon: '✦',  label: 'Таамаглал',        roles: ['ADMIN','MANAGER'] },
  { to: '/inventory',   icon: '▤',  label: 'Агуулах',          roles: ['ADMIN','MANAGER'] },
  { to: '/orders',      icon: '◈',  label: 'Захиалга',         roles: ['ADMIN','MANAGER'] },
  { to: '/procurement',  icon: '📦', label: 'Татан авалт',      roles: ['ADMIN','MANAGER'] },
  { to: '/advisory',     icon: '📋', label: 'Санамж',           roles: ['ADMIN','MANAGER'] },
  { to: '/import',      icon: '↑',  label: 'Excel импорт',     roles: ['ADMIN','MANAGER'] },
  { to: '/client',      icon: '◉',  label: 'Харилцагч',        roles: ['ADMIN','MANAGER'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const visible = NAV.filter(n => n.roles.includes('ALL') || n.roles.includes(user?.role ?? ''))
  const initials = (user?.name ?? 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={{ width: '200px', background: '#13151f', borderRight: '1px solid #1e2132', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #1e2132', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>⚙</div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>WT130 Service</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '1px' }}>LOVOL Platform</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {visible.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem',
                fontWeight: isActive ? 500 : 400, cursor: 'pointer', textDecoration: 'none',
                background: isActive ? '#1e2340' : 'transparent',
                color: isActive ? '#818cf8' : '#64748b',
                border: isActive ? '1px solid #2d3158' : '1px solid transparent',
              })}
            >
              <span style={{ fontSize: '0.9rem', width: '16px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid #1e2132' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', background: 'transparent', border: '1px solid transparent', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background='#1e1a2e'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='#3d1515' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b'; e.currentTarget.style.borderColor='transparent' }}
          >
            <span>⏻</span> Гарах
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto', background: '#0f1117', padding: '1.5rem 2rem' }}>
        <Outlet />
      </main>
      <ChatBot />
    </div>
  )
}
