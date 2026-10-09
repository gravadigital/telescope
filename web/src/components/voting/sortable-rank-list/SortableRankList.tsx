import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui';
import { ArrowDownIcon, ArrowUpIcon } from '../../ui/icons/Icons';
import { useT } from '../../../i18n';
import { formatFileSize, move, positionLabel } from '../../../domain';
import { extensionForMime } from '../../../services/api';
import type { AssignedAttachment } from '../../../types';
import '../../ui/visually-hidden.css';
import './SortableRankList.css';

export interface SortableRankListProps {
  /** En el orden de la asignación: define el "Propuesta N" de cada una. */
  attachments: AssignedAttachment[];
  /** Ids en el orden actual. */
  order: string[];
  mode: 'editable' | 'readonly';
  onChange?: (order: string[]) => void;
  onOpenFile: (attachment: AssignedAttachment, number: number) => void;
  /** Deshabilita ↑ ↓ (p. ej. durante el envío). */
  disabled?: boolean;
}

type Direction = 'up' | 'down';

const SortableRankList: React.FC<SortableRankListProps> = ({
  attachments,
  order,
  mode,
  onChange,
  onOpenFile,
  disabled = false,
}) => {
  const { t, locale } = useT();
  const [announcement, setAnnouncement] = useState('');
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{ id: string; direction: Direction } | null>(null);

  const byId = new Map(attachments.map((a, i) => [a.id, { attachment: a, number: i + 1 }]));
  const rows = order.flatMap((id) => {
    const found = byId.get(id);
    return found ? [found] : [];
  });

  // Tras el re-render el foco sigue a la misma propuesta; si su botón quedó
  // deshabilitado (llegó a un borde), pasa al otro botón de la fila.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const same = buttons.current.get(`${pending.id}:${pending.direction}`);
    const other = buttons.current.get(`${pending.id}:${pending.direction === 'up' ? 'down' : 'up'}`);
    const target = same && !same.disabled ? same : other;
    target?.focus();
  }, [order]);

  const handleMove = (index: number, direction: Direction) => {
    const row = rows[index];
    if (!row || !onChange) return;
    const next = move(order, index, direction);
    pendingFocus.current = { id: row.attachment.id, direction };
    setAnnouncement(
      t('ranking.moved', {
        proposal: t('ranking.proposal', { number: row.number }),
        position: next.indexOf(row.attachment.id) + 1,
      })
    );
    onChange(next);
  };

  const setButtonRef = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) buttons.current.set(key, node);
    else buttons.current.delete(key);
  };

  return (
    <div className="srl-list">
      <ol className="srl-list__list" aria-label={t('ranking.listLabel')}>
        {rows.map(({ attachment, number }, index) => {
          const position = index + 1;
          const proposal = t('ranking.proposal', { number });
          return (
            <li key={attachment.id} className="srl-list__item">
              <span className="srl-list__position">{position}</span>
              <div className="srl-list__content">
                <p className="srl-list__title">{proposal}</p>
                <p className="srl-list__meta">
                  {t('ranking.meta', {
                    type: extensionForMime(attachment.mime_type).toUpperCase(),
                    size: formatFileSize(attachment.file_size, locale),
                  })}
                </p>
                {attachment.description && <p className="srl-list__description">{attachment.description}</p>}
                <Button
                  variant="tertiary"
                  size="sm"
                  className="srl-list__view"
                  aria-label={t('ranking.viewFileAccessible', { proposal })}
                  onClick={() => onOpenFile(attachment, number)}
                >
                  {t('ranking.viewFile')}
                </Button>
              </div>
              <span className="srl-list__label">{t(`ranking.${positionLabel(position, rows.length)}`)}</span>
              {mode === 'editable' && (
                <div className="srl-list__moves">
                  <Button
                    ref={setButtonRef(`${attachment.id}:up`)}
                    variant="icon"
                    aria-label={t('ranking.moveUp', { proposal })}
                    disabled={disabled || index === 0}
                    iconStart={<ArrowUpIcon />}
                    onClick={() => handleMove(index, 'up')}
                  />
                  <Button
                    ref={setButtonRef(`${attachment.id}:down`)}
                    variant="icon"
                    aria-label={t('ranking.moveDown', { proposal })}
                    disabled={disabled || index === rows.length - 1}
                    iconStart={<ArrowDownIcon />}
                    onClick={() => handleMove(index, 'down')}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="ui-visually-hidden" aria-live="polite">{announcement}</p>
    </div>
  );
};

export default SortableRankList;
