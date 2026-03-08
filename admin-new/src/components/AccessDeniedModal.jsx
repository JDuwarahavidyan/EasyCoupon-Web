import { ShieldX, X } from 'lucide-react'

const AccessDeniedModal = ({ open, onClose }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-0 animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 px-6 pt-6 pb-4 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldX size={32} className="text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Access Restricted</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 text-center leading-relaxed">
            Your current role does not have permission to perform this action. This operation is restricted to <span className="font-semibold text-gray-900">Super Admins</span> only.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">What can you do?</p>
            <ul className="text-xs text-amber-600 space-y-1">
              <li>- Contact a Super Admin to perform this action on your behalf</li>
              <li>- Request a role upgrade if you need broader access</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 text-center">
            If you believe this is an error, please reach out to your system administrator.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccessDeniedModal
