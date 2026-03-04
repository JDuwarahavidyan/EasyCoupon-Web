const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color = 'primary' }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-50', icon: 'text-primary-500', border: 'border-primary-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-100' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '-'}</p>
          {trendLabel && (
            <p className={`text-xs mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% {trendLabel}
            </p>
          )}
        </div>
        <div className={`${c.bg} p-3 rounded-xl`}>
          <Icon size={22} className={c.icon} />
        </div>
      </div>
    </div>
  )
}

export default StatCard
