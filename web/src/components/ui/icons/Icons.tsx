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

export const ArrowUpIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </BaseIcon>
);

export const ArrowDownIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </BaseIcon>
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

export const ShareIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </BaseIcon>
);

export const LinkIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7" />
  </BaseIcon>
);

export const MailIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </BaseIcon>
);

/*
 * Logos de redes: trazados de Font Awesome Free (brands), licencia CC BY 4.0
 * (https://fontawesome.com/license/free). Monocromos con currentColor.
 */
const BrandIcon: React.FC<IconProps & { box: string; d: string }> = ({ box, d, ...rest }) => (
  <svg
    width={20}
    height={20}
    viewBox={box}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d={d} />
  </svg>
);

export const WhatsAppIcon: React.FC<IconProps> = (props) => (
  <BrandIcon {...props} box="0 0 448 512" d="M380.9 97.1c-41.9-42-97.7-65.1-157-65.1-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480 117.7 449.1c32.4 17.7 68.9 27 106.1 27l.1 0c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.6-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1s56.2 81.2 56.1 130.5c0 101.8-84.9 184.6-186.6 184.6zM325.1 300.5c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8s-14.3 18-17.6 21.8c-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7s-12.5-30.1-17.1-41.2c-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2s-9.7 1.4-14.8 6.9c-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4s4.6-24.1 3.2-26.4c-1.3-2.5-5-3.9-10.5-6.6z" />
);

export const XLogoIcon: React.FC<IconProps> = (props) => (
  <BrandIcon {...props} box="0 0 448 512" d="M357.2 48L427.8 48 273.6 224.2 455 464 313 464 201.7 318.6 74.5 464 3.8 464 168.7 275.5-5.2 48 140.4 48 240.9 180.9 357.2 48zM332.4 421.8l39.1 0-252.4-333.8-42 0 255.3 333.8z" />
);

export const LinkedInIcon: React.FC<IconProps> = (props) => (
  <BrandIcon {...props} box="0 0 448 512" d="M100.3 448l-92.9 0 0-299.1 92.9 0 0 299.1zM53.8 108.1C24.1 108.1 0 83.5 0 53.8 0 39.5 5.7 25.9 15.8 15.8s23.8-15.8 38-15.8 27.9 5.7 38 15.8 15.8 23.8 15.8 38c0 29.7-24.1 54.3-53.8 54.3zM447.9 448l-92.7 0 0-145.6c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7l0 148.1-92.8 0 0-299.1 89.1 0 0 40.8 1.3 0c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3l0 164.3-.1 0z" />
);

export const FacebookIcon: React.FC<IconProps> = (props) => (
  <BrandIcon {...props} box="0 0 320 512" d="M80 299.3l0 212.7 116 0 0-212.7 86.5 0 18-97.8-104.5 0 0-34.6c0-51.7 20.3-71.5 72.7-71.5 16.3 0 29.4 .4 37 1.2l0-88.7C291.4 4 256.4 0 236.2 0 129.3 0 80 50.5 80 159.4l0 42.1-66 0 0 97.8 66 0z" />
);

export const EditIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </BaseIcon>
);

export const BellIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </BaseIcon>
);

export const UsersIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </BaseIcon>
);

export const TrophyIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </BaseIcon>
);

export const ArrowRightIcon: React.FC<IconProps> = (props) => (
  <BaseIcon {...props}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </BaseIcon>
);
