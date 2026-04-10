import React, { forwardRef, useId } from "react";

export interface SelectOption {
  id: string | number;
  [key: string]: string | number; // More specific type for dynamic properties
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  parentStyle?: string;
  background?: string;
  DisplayItem?: string;
  DisplayCode?: string;
  isSelectable?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    options = [],
    label,
    parentStyle = "white",
    background  = "transparent",
    DisplayItem = "title",
    DisplayCode = "code",
    ...props
  },
  ref
) {
  const id = useId();

  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="font-semibold text-md dark:text-gray-400">
          {label}
        </label>
      )}

      <div className={`relative bg-${parentStyle} rounded-md`}>
      <select
          {...props}
          id={id}
          ref={ref}
          className={`w-full px-3 py-2 dark:bg-neutral-950 dark:border-gray-300 border border-black bg-${background} rounded-md outline-none`}
        >
          <option value="">Select...</option>
          {options.map((option, index) => (
            <option key={index} value={option.id}>
              {option[DisplayCode]
                ? `${option[DisplayCode]} - ${option[DisplayItem]}`
                : option[DisplayItem]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});
