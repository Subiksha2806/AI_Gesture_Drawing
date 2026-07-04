import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { Notification } from '../types/canvas';

interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const typeConfigs = {
  success: {
    icon: CheckCircle2,
    colorClass: 'text-emerald-400 border-emerald-500/20 bg-slate-900/90 shadow-emerald-500/5',
  },
  info: {
    icon: Info,
    colorClass: 'text-blue-400 border-blue-500/20 bg-slate-900/90 shadow-blue-500/5',
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-amber-400 border-amber-500/20 bg-slate-900/90 shadow-amber-500/5',
  },
  error: {
    icon: AlertCircle,
    colorClass: 'text-rose-400 border-rose-500/20 bg-slate-900/90 shadow-rose-500/5',
  },
};

export function NotificationSystem({ notifications, onRemove }: NotificationSystemProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {notifications.map((notif) => {
          const config = typeConfigs[notif.type] || typeConfigs.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-start space-x-3 p-3.5 border rounded-xl backdrop-blur-md shadow-lg ${config.colorClass}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 text-xs font-semibold text-slate-100 pr-1">
                {notif.message}
              </div>
              <button
                onClick={() => onRemove(notif.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded-lg hover:bg-slate-800/40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
