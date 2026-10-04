import React from 'react';
import Button from '../button/Button';
import { CloseIcon, SearchIcon } from '../icons/Icons';
import '../visually-hidden.css';
import './TextField.css';

export interface TextFieldProps {
  variant?: 'text' | 'multiline' | 'search';
  type?: 'text' | 'email' | 'password';
  label: string;
  required?: boolean;
  optional?: boolean;
  /** Texto de "(opcional)" que da la pantalla. */
  optionalLabel?: string;
  help?: string;
  error?: string;
  maxLength?: number;
  size?: 'md' | 'lg';
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onClear?: () => void;
  clearLabel?: string;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  readOnly?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  placeholder?: string;
  autoComplete?: string;
}

/** Cuando el contador se anuncia: desde el 90% del límite. */
const COUNTER_LIVE_RATIO = 0.9;

const TextField = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(
  function TextField(
    {
      variant = 'text',
      type = 'text',
      label,
      required = false,
      optional = false,
      optionalLabel,
      help,
      error,
      maxLength,
      size = 'md',
      value,
      onChange,
      onBlur,
      onClear,
      clearLabel,
      showPasswordLabel,
      hidePasswordLabel,
      readOnly = false,
      disabled = false,
      name,
      id,
      placeholder,
      autoComplete,
    },
    ref
  ) {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const helpId = `${inputId}-help`;
    const errorId = `${inputId}-error`;
    const counterId = `${inputId}-counter`;
    const [showPassword, setShowPassword] = React.useState(false);

    const isMultiline = variant === 'multiline';
    const isSearch = variant === 'search';
    const isPassword = !isMultiline && !isSearch && type === 'password';
    const showCounter = isMultiline && maxLength !== undefined;
    const counterLive = showCounter && value.length >= maxLength! * COUNTER_LIVE_RATIO;

    const describedBy =
      [error ? errorId : help ? helpId : '', showCounter ? counterId : ''].filter(Boolean).join(' ') ||
      undefined;

    const common = {
      id: inputId,
      name,
      value,
      onChange,
      onBlur,
      readOnly,
      disabled,
      maxLength,
      placeholder,
      autoComplete,
      required,
      'aria-required': required || undefined,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy,
      className: 'ui-text-field__control',
    };

    return (
      <div
        className={[
          'ui-text-field',
          `ui-text-field--${size}`,
          error ? 'ui-text-field--error' : '',
          readOnly ? 'ui-text-field--readonly' : '',
          disabled ? 'ui-text-field--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <label
          htmlFor={inputId}
          className={isSearch ? 'ui-visually-hidden' : 'ui-text-field__label'}
        >
          {label}
          {required && (
            <span className="ui-text-field__required" aria-hidden="true">
              {' *'}
            </span>
          )}
          {optional && optionalLabel && (
            <span className="ui-text-field__optional"> {optionalLabel}</span>
          )}
        </label>

        <div className="ui-text-field__box">
          {isSearch && <SearchIcon className="ui-text-field__icon" />}
          {isMultiline ? (
            <textarea
              {...common}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              rows={4}
              className="ui-text-field__control ui-text-field__control--multiline"
            />
          ) : (
            <input
              {...common}
              ref={ref as React.Ref<HTMLInputElement>}
              type={isSearch ? 'search' : isPassword && showPassword ? 'text' : type}
            />
          )}
          {isPassword && showPasswordLabel && hidePasswordLabel && (
            <button
              type="button"
              className="ui-text-field__toggle"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              disabled={disabled}
            >
              {showPassword ? hidePasswordLabel : showPasswordLabel}
            </button>
          )}
          {isSearch && value && onClear && clearLabel && (
            <Button
              variant="icon"
              size="sm"
              aria-label={clearLabel}
              iconStart={<CloseIcon />}
              onClick={onClear}
            />
          )}
        </div>

        <div className="ui-text-field__footer">
          {error ? (
            <p id={errorId} className="ui-text-field__error">
              {error}
            </p>
          ) : help ? (
            <p id={helpId} className="ui-text-field__help">
              {help}
            </p>
          ) : (
            <span />
          )}
          {showCounter && (
            <span
              id={counterId}
              className="ui-text-field__counter"
              aria-live={counterLive ? 'polite' : undefined}
            >
              {value.length} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

export default TextField;
