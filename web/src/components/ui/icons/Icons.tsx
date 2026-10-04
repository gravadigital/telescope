import React from 'react';

/**
 * Íconos SVG mínimos (D-7). El set definitivo sigue pendiente en el DS
 * (iconography en placeholder): si se elige uno, se reemplaza acá.
 */
export type IconProps = Omit<React.SVGProps<SVGSVGElement>, 'children'>;

const BaseIcon: React.FC<IconProps & { children: React.ReactNode }> = ({ children, ...rest }) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

export const CloseIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </BaseIcon>
);

export const MinusIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M5 12h14" />
  </BaseIcon>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M12 5v14M5 12h14" />
  </BaseIcon>
);

export const CheckIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </BaseIcon>
);

export const SearchIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </BaseIcon>
);

export const UploadIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
  </BaseIcon>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M6 9l6 6 6-6" />
  </BaseIcon>
);

export const DotIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </BaseIcon>
);

export const MenuIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </BaseIcon>
);
