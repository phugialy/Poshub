import './StatsCards.css'

function StatsCards({ stats }) {
  const statItems = [
    {
      label: 'Total Packages',
      value: stats.total || 0,
      icon: 'fa-box',
      color: 'blue'
    },
    {
      label: 'Pending',
      value: stats.pending || 0,
      icon: 'fa-clock',
      color: 'yellow'
    },
    {
      label: 'In Transit',
      value: stats.processing || 0,
      icon: 'fa-truck',
      color: 'indigo'
    },
    {
      label: 'Delivered',
      value: stats.completed || 0,
      icon: 'fa-check-circle',
      color: 'green'
    }
  ]

  return (
    <div className="stats-grid">
      {statItems.map((stat, index) => (
        <div key={index} className="stat-card">
          <div className="stat-content">
            <div>
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
            <div className={`stat-icon stat-icon-${stat.color}`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCards

