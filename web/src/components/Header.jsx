import './Header.css'

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <i className="fas fa-box"></i>
          </div>
          <div>
            <h1>PostalHub</h1>
            <p>Package Tracking</p>
          </div>
        </div>

        <div className="header-right">
          <div className="user-info">
            <div className="user-details">
              <p className="user-name">{user.name || 'User'}</p>
              <p className="user-email">{user.email}</p>
            </div>
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="user-avatar"
              />
            )}
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <i className="fas fa-sign-out-alt"></i>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header

