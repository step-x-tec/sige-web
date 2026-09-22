import { InputHTMLAttributes, forwardRef } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, id, className = '', ...props }, ref) => (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input
        ref={ref}
        id={id}
        className={`w-full rounded-sige border border-rule bg-paper px-3.5 py-2.5 text-ink placeholder:text-muted focus:border-board focus:outline-none ${className}`}
        {...props}
      />
    </label>
  ),
);
TextField.displayName = 'TextField';
