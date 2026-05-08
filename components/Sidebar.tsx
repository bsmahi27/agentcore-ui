'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Cpu,
  Rocket,
  Zap,
  ScrollText,
  Activity,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

function cx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const ADD_CHILDREN = [
  { href: '/add/agent', label: 'Agent' },
  { href: '/add/memory', label: 'Memory' },
  { href: '/add/gateway', label: 'Gateway' },
  { href: '/add/credential', label: 'Credential' },
  { href: '/add/evaluator', label: 'Evaluator' },
];

const TOP_NAV = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/create', label: 'Create Project', Icon: PlusCircle },
  { href: '/deploy', label: 'Deploy', Icon: Rocket },
  { href: '/invoke', label: 'Invoke', Icon: Zap },
  { href: '/logs', label: 'Logs', Icon: ScrollText },
  { href: '/traces', label: 'Traces', Icon: Activity },
  { href: '/remove', label: 'Remove', Icon: Trash2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(true);

  const active = (href: string) => pathname === href;
  const linkCls = (href: string) =>
    cx(
      'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
      active(href)
        ? 'bg-[#FF9900]/10 text-[#FF9900] font-medium'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
    );

  return (
    <aside className="w-52 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-screen shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[#FF9900] font-bold text-base leading-none">⬡</span>
          <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">
            AgentCore UI
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {TOP_NAV.slice(0, 2).map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={linkCls(href)}>
            <Icon size={15} />
            {label}
          </Link>
        ))}

        {/* Add Resource section */}
        <div>
          <button
            onClick={() => setAddOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            <Cpu size={15} />
            <span className="flex-1 text-left">Add Resource</span>
            {addOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          {addOpen && (
            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-300 dark:border-slate-700 pl-2">
              {ADD_CHILDREN.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cx(
                    'block px-3 py-1.5 rounded-md text-sm transition-colors',
                    active(href)
                      ? 'bg-[#FF9900]/10 text-[#FF9900] font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {TOP_NAV.slice(2).map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={linkCls(href)}>
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-600">agentcore CLI wrapper</p>
      </div>
    </aside>
  );
}
