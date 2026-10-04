import React from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'onBand' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonCommonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  children?: React.ReactNode;
}

interface ButtonLabelProps extends ButtonCommonProps {
  variant?: Exclude<ButtonVariant, 'icon'>;
}

/** El variant `icon` no tiene texto: exige un nombre accesible traducido. */
interface ButtonIconProps extends ButtonCommonProps {
  variant: 'icon';
  'aria-label': string;
}

export type ButtonProps = ButtonLabelProps | ButtonIconProps;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    disabled = false,
    iconStart,
    iconEnd,
    fullWidth = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref
) {
  const classes = [
    'ui-button',
    `ui-button--${variant === 'onBand' ? 'on-band' : variant}`,
    `ui-button--${size}`,
    fullWidth ? 'ui-button--full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      {...rest}
    >
      {loading ? (
        <span className="ui-button__spinner" aria-hidden="true" />
      ) : (
        iconStart && <span className="ui-button__icon">{iconStart}</span>
      )}
      {(children || (loading && loadingLabel)) && (
        <span className="ui-button__label">{loading && loadingLabel ? loadingLabel : children}</span>
      )}
      {!loading && iconEnd && <span className="ui-button__icon">{iconEnd}</span>}
    </button>
  );
});

export default Button;
