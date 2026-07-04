import React, { useEffect, useState } from 'react';
import { Trash2, Calendar, FileText, Image as ImageIcon, RefreshCw } from 'lucide-react';
import type { DrawingHistoryItem } from '../types/canvas';

interface HistoryPanelProps {
  onNotify: (message: string, type: 'success' | 'error' | 'info') => void;
  refreshTrigger: number;
}

export function HistoryPanel({ onNotify, refreshTrigger }: HistoryPanelProps) {
  const [drawings, setDrawings] = useState<DrawingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/drawings');
      if (res.ok) {
        const data = await res.json();
        setDrawings(data);
      }
    } catch (err) {
      console.error('Failed to load drawing history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this drawing?')) return;

    try {
      const res = await fetch(`http://localhost:8000/api/drawings/${filename}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onNotify('Drawing deleted successfully', 'success');
        fetchHistory();
      } else {
        onNotify('Failed to delete drawing', 'error');
      }
    } catch (err) {
      onNotify('Server communication error', 'error');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (mtime: number) => {
    const date = new Date(mtime * 1000);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
        <div>
          <h3 className="font-bold text-slate-100 text-sm">Gallery History</h3>
          <p className="text-[10px] text-slate-400">Previous drawings and exports</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 text-slate-300 disabled:opacity-50 hover:text-slate-100 transition-all"
          title="Refresh History"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ImageIcon className="w-10 h-10 text-slate-600 mb-2.5" />
            <p className="text-xs font-semibold text-slate-400">No saved files yet</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[150px]">
              Use the save button or Thumb Up gesture to export!
            </p>
          </div>
        ) : (
          drawings.map((item) => {
            const isDoc = item.format === 'PDF' || item.format === 'SVG';
            const fileUrl = `http://localhost:8000/static/${item.filename}`;

            return (
              <div
                key={item.filename}
                onClick={() => window.open(fileUrl, '_blank')}
                className="group relative flex items-center justify-between p-2.5 border rounded-xl glass-card cursor-pointer"
              >
                {/* Visual Icon indicator based on format */}
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isDoc ? 'bg-indigo-500/10 text-indigo-400' : 'bg-brand-500/10 text-brand-400'}`}>
                    {isDoc ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-200 group-hover:text-brand-400 transition-colors truncate max-w-[140px]">
                      {item.filename}
                    </h5>
                    <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center space-x-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{formatDate(item.created_at)}</span>
                      </span>
                      <span>•</span>
                      <span>{formatSize(item.size_bytes)}</span>
                    </div>
                  </div>
                </div>

                {/* Badges / Controls */}
                <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${
                    item.format === 'SVG' ? 'bg-amber-500/10 text-amber-400' : 
                    item.format === 'PDF' ? 'bg-red-500/10 text-red-400' : 
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {item.format}
                  </span>

                  <button
                    onClick={(e) => handleDelete(item.filename, e)}
                    className="p-1 rounded bg-slate-900/40 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all"
                    title="Delete Drawing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
