'use client';

import React, { type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

const base =
  'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#FF9900] placeholder-slate-400 dark:placeholder-slate-500 transition-colors';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input {...props} ref={ref} className={base} />,
);
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
>(({ children, ...props }, ref) => (
  <select {...props} ref={ref} className={base + ' cursor-pointer'}>
    {children}
  </select>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => <textarea {...props} ref={ref} className={base + ' resize-y'} />);
Textarea.displayName = 'Textarea';

export function RadioGroup({
  name,
  options,
  register,
}: {
  name: string;
  options: string[];
  register: (name: string) => object;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            value={opt}
            {...(register(name) as object)}
            className="accent-[#FF9900]"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
        </label>
      ))}
    </div>
  );
}

export function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
      {children}
    </div>
  );
}

export function RunButton({
  loading,
  label = 'Run',
  loadingLabel,
  onClick,
  disabled,
}: {
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading || disabled}
      className="bg-[#FF9900] hover:bg-[#E88900] text-black text-sm font-semibold px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
    >
      {loading ? (loadingLabel ?? 'Running…') : label}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}
