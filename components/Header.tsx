'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useWorkingDir } from './WorkingDirProvider';
import { FolderOpen, Check, X, Sun, Moon } from 'lucide-react';

export default function Header({ title }: { title: string }) {
  const { cwd, setCwd } = useWorkingDir();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const startEdit = () => {
    setDraft(cwd);
    setEditing(true);
  };

  const save = () => {
    setCwd(draft.trim());
    setEditing(false);
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-950 sticky top-0 z-10">
      <h1 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h1>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          {/* <FolderOpen size={14} className="text-slate-500" />
          {editing ? (
            <>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-900 dark:text-white font-mono text-xs w-80 focus:outline-none focus:border-[#FF9900]"
                placeholder="/path/to/agentcore/project"
                autoFocus
              />
              <button onClick={save} className="text-green-600 dark:text-green-400 hover:text-green-500">
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="font-mono text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-300 dark:hover:border-slate-700 rounded px-2 py-1 transition-colors max-w-xs truncate"
            >
              {cwd || 'Set project directory…'}
            </button>
          )} */}
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>
    </header>
  );
}
