import React from 'react';
import { Button, Callout, Dialog, TextField } from '../../ui';
import {
  FacebookIcon,
  LinkIcon,
  LinkedInIcon,
  MailIcon,
  ShareIcon,
  WhatsAppIcon,
  XLogoIcon,
} from '../../ui/icons/Icons';
import type { IconProps } from '../../ui/icons/Icons';
import { COPY_FEEDBACK_MS, shareAudienceKey, shareLinks, shareUrl } from '../../../domain/eventDetail';
import type { ShareNetwork } from '../../../domain/eventDetail';
import { useT } from '../../../i18n';
import type { EventStage } from '../../../types';
import '../../ui/visually-hidden.css';
import './ShareDialog.css';

export interface ShareDialogProps {
  open: boolean;
  eventId: string;
  eventName: string;
  stage: EventStage;
  onClose: () => void;
}

const NETWORK_ICONS: Record<ShareNetwork, React.FC<IconProps>> = {
  whatsapp: WhatsAppIcon,
  x: XLogoIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon,
  email: MailIcon,
};

const ShareDialog: React.FC<ShareDialogProps> = ({ open, eventId, eventName, stage, onClose }) => {
  const { t } = useT();
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const copyRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const timerRef = React.useRef<number | undefined>(undefined);

  const clearTimer = (): void => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  // Al reabrir, el estado de copia vuelve a cero; al desmontar, no queda el timer.
  React.useEffect(() => {
    if (open) {
      setCopied(false);
      setCopyFailed(false);
    }
    return clearTimer;
  }, [open]);

  const url = shareUrl(window.location.origin, eventId);
  const canShareNatively = typeof navigator.share === 'function';

  const handleCopy = async (): Promise<void> => {
    clearTimer();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setCopyFailed(false);
      setCopied(true);
      timerRef.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  const handleNativeShare = async (): Promise<void> => {
    try {
      await navigator.share({ title: eventName, url });
    } catch (err) {
      // Cancelar el menú del sistema no es un error.
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error('Failed to share event:', err);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      eyebrow={t('share.eyebrow')}
      title={eventName}
      closeLabel={t('share.close')}
      initialFocusRef={copyRef}
    >
      <div className="ev-share-dialog">
        <p className="ev-share-dialog__audience">{t(shareAudienceKey(stage))}</p>

        <div className="ev-share-dialog__link">
          <div className="ev-share-dialog__field">
            <TextField
              ref={inputRef}
              label={t('share.linkLabel')}
              value={url}
              onChange={() => undefined}
              readOnly
            />
          </div>
          <div className="ev-share-dialog__copy">
            <Button ref={copyRef} variant="primary" fullWidth iconStart={<LinkIcon />} onClick={handleCopy}>
              {copied ? t('share.copied') : t('share.copy')}
            </Button>
          </div>
        </div>

        <div role="status" aria-live="polite" className="ev-share-dialog__status">
          {copied && <span className="ui-visually-hidden">{t('share.copied')}</span>}
          {copyFailed && <Callout tone="warning">{t('share.copyFailed')}</Callout>}
        </div>

        <p className="ev-share-dialog__via">{t('share.via')}</p>

        <ul className="ev-share-dialog__networks">
          {shareLinks(url, eventName).map(({ network, href }) => {
            const Icon = NETWORK_ICONS[network];
            const name = t(`share.networks.${network}`);
            const external = network !== 'email';
            return (
              <li key={network}>
                <a
                  className="ev-share-dialog__network"
                  href={href}
                  aria-label={t('share.networkAccessible', { network: name })}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                >
                  <Icon className="ev-share-dialog__network-icon" width={24} height={24} />
                  <span className="ev-share-dialog__network-name">{name}</span>
                </a>
              </li>
            );
          })}
        </ul>

        {canShareNatively && (
          <div className="ev-share-dialog__more">
            <Button variant="secondary" fullWidth iconStart={<ShareIcon />} onClick={handleNativeShare}>
              {t('share.more')}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default ShareDialog;
