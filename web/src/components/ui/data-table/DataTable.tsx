import React from 'react';
import Button, { ButtonVariant } from '../button/Button';
import '../visually-hidden.css';
import './DataTable.css';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'start' | 'end';
}

export interface DataTableRowAction {
  label: string;
  onClick: () => void;
  variant?: Exclude<ButtonVariant, 'icon'>;
  /** Texto de apoyo debajo del botón (p. ej. "Requiere cuenta"). */
  hint?: string;
  /** Nombre accesible único del botón cuando difiere del texto visible. */
  accessibleLabel?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Una sola acción por fila (el nombre accesible debe ser único: "Gestionar Evento 1"). */
  rowAction?: (row: T) => DataTableRowAction;
  /** Cabecera visualmente oculta de la columna de acción. */
  actionHeader?: string;
  highlightRow?: (row: T) => boolean;
  caption: string;
  captionHidden?: boolean;
  loading?: boolean;
  skeletonRows?: number;
}

function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowAction,
  actionHeader,
  highlightRow,
  caption,
  captionHidden = false,
  loading = false,
  skeletonRows = 3,
}: DataTableProps<T>): React.JSX.Element {
  const cellText = (row: T, key: string): string => {
    const value = (row as unknown as Record<string, unknown>)[key];
    return value === null || value === undefined || value === '' ? '—' : String(value);
  };

  return (
    <table className="ui-data-table" aria-busy={loading || undefined}>
      <caption className={captionHidden ? 'ui-visually-hidden' : 'ui-data-table__caption'}>
        {caption}
      </caption>
      <thead className="ui-data-table__head">
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`ui-data-table__th ui-data-table__cell--${column.align ?? 'start'}`}
            >
              {column.header}
            </th>
          ))}
          {rowAction && (
            <th scope="col" className="ui-data-table__th ui-data-table__cell--end">
              {actionHeader && <span className="ui-visually-hidden">{actionHeader}</span>}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: skeletonRows }, (_, index) => (
              <tr key={`skeleton-${index}`} className="ui-data-table__row ui-data-table__row--skeleton">
                {columns.map((column) => (
                  <td key={column.key} data-label={column.header} className="ui-data-table__cell">
                    <span className="ui-data-table__skeleton" aria-hidden="true" />
                  </td>
                ))}
                {rowAction && <td data-label="" className="ui-data-table__cell" />}
              </tr>
            ))
          : rows.map((row) => {
              const action = rowAction?.(row);
              const classes = [
                'ui-data-table__row',
                highlightRow?.(row) ? 'ui-data-table__row--highlighted' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <tr key={rowKey(row)} className={classes}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-label={column.header}
                      className={`ui-data-table__cell ui-data-table__cell--${column.align ?? 'start'}`}
                    >
                      {column.render ? (
                        column.render(row)
                      ) : (
                        <span className="ui-data-table__text" title={cellText(row, column.key)}>
                          {cellText(row, column.key)}
                        </span>
                      )}
                    </td>
                  ))}
                  {action && (
                    <td data-label="" className="ui-data-table__cell ui-data-table__cell--action">
                      <Button
                        size="sm"
                        variant={action.variant ?? 'secondary'}
                        onClick={action.onClick}
                        aria-label={action.accessibleLabel}
                      >
                        {action.label}
                      </Button>
                      {action.hint && <span className="ui-data-table__hint">{action.hint}</span>}
                    </td>
                  )}
                </tr>
              );
            })}
      </tbody>
    </table>
  );
}

export default DataTable;
