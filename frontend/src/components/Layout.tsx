import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import { GENDERS } from '../types'

const TABS = [
  { to: '/', label: 'My Wardrobe' },
  { to: '/add', label: 'Add Item' },
  { to: '/outfits', label: 'Outfit Generator' },
]

export function Layout() {
  const { user, setGender, logout } = useAuth()
  if (!user) return null

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Wardrobe AI</span>
        <nav className="tabs">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end>
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="profile">
          <div className="segmented small" role="radiogroup" aria-label="Style profile">
            {GENDERS.map((gender) => (
              <button
                key={gender}
                type="button"
                role="radio"
                aria-checked={user.gender === gender}
                className={user.gender === gender ? 'active' : ''}
                onClick={() => setGender(gender)}
              >
                {gender === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
          <button type="button" className="link" onClick={logout} title={user.email}>
            Sign out
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
