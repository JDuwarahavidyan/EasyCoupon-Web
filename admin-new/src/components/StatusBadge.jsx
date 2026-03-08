const StatusBadge = ({ status, children }) => {
  const styles = {
    active: 'bg-green-100 text-green-700',
    disabled: 'bg-red-100 text-red-700',
    student: 'bg-blue-100 text-blue-700',
    canteena: 'bg-amber-100 text-amber-700',
    canteenb: 'bg-purple-100 text-purple-700',
    admin: 'bg-primary-100 text-primary-600',
    superadmin: 'bg-rose-100 text-rose-700',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {children}
    </span>
  )
}

export default StatusBadge
