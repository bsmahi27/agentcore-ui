'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

interface Ctx {
  cwd: string;
  setCwd: (v: string) => void;
}

const WorkingDirContext = createContext<Ctx>({ cwd: '', setCwd: () => {} });

export function useWorkingDir() {
  return useContext(WorkingDirContext);
}

export default function WorkingDirProvider({ children }: { children: ReactNode }) {
  const [cwd, setCwdState] = useState('');

  useEffect(() => {
    const saved =
      localStorage.getItem('agentcore-cwd') ||
      process.env.NEXT_PUBLIC_DEFAULT_CWD ||
      'C:\\Users\\lshamaka\\Desktop\\agentcore-ui-main\\generated_agents';
    setCwdState(saved);
  }, []);

  const setCwd = (v: string) => {
    setCwdState(v);
    localStorage.setItem('agentcore-cwd', v);
  };

  return (
    <WorkingDirContext.Provider value={{ cwd, setCwd }}>
      {children}
    </WorkingDirContext.Provider>
  );
}
