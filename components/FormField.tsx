'use client';

import React from 'react';

interface FormFieldProps {
  label: string;
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}

export default function FormField({
  label,
  type,
  name,
  value,
  onChange,
  error,
  required = true,
}: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={name} className="form-label">
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`form-input ${error ? 'form-input-error' : ''}`}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
