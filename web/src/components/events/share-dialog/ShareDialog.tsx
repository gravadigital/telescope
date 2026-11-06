import React from 'react';
import { Button, Callout, Dialog, TextField } from '../../ui';
import {
  FacebookIcon,
  InstagramIcon,
  LinkIcon,
  LinkedInIcon,
  MailIcon,
  ShareIcon,
  WhatsAppIcon,
  XLogoIcon,
} from '../../ui/icons/Icons';
import type { IconProps } from '../../ui/icons/Icons';
import {
  COPY_FEEDBACK_MS,
  INSTAGRAM_OPEN_DELAY_MS,
  instagramShareLinks,
  shareAudienceKey,
  shareLinks,
  shareUrl,
} from '../../../domain/eventDetail';
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
  instagram: InstagramIcon,
  email: MailIcon,
};

const ShareDialog: React.FC<ShareDialogProps> = ({ open, eventId, eventName, stage, onClose }) => {
  const { t } = useT();
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const [instagramToast, setInstagramToast] = React.useState(false);
  const copyRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const timerRef = React.useRef<number | undefined>(undefined);
  const openTimerRef = React.useRef<number | undefined>(undefined);

  const clearTimer = (): void => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const clearOpenTimer = (): void => {
    if (openTimerRef.current !== undefined) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }
  };

  // Al reabrir, el estado de copia vuelve a cero; al desmontar, no queda el timer.
  React.useEffect(() => {
    if (open) {
      setCopied(false);
      setCopyFailed(false);
      setInstagramToast(false);
    }
    return () => {
      clearTimer();
      clearOpenTimer();
    };
  }, [open]);

  const url = shareUrl(window.location.origin, eventId);
  const canShareNatively = typeof navigator.share === 'function';

  /**
   * Respaldo para contextos no seguros (http desde la red local, donde el teléfono abre la
   * página): ahí no existe `navigator.clipboard`.
   */
  const copyWithExecCommand = (text: string): boolean => {
    if (typeof document.execCommand !== 'function') return false;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  };

  const handleCopy = async (): Promise<boolean> => {
    clearTimer();
    try {
      let ok = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          ok = true;
        } catch {
          ok = copyWithExecCommand(url);
        }
      } else {
        ok = copyWithExecCommand(url);
      }
      if (!ok) throw new Error('clipboard unavailable');
      setCopyFailed(false);
      setCopied(true);
      timerRef.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      return true;
    } catch {
      setCopied(false);
      setCopyFailed(true);
      inputRef.current?.focus();
      inputRef.current?.select();
      return false;
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

  /** Abre Instagram en pestaña nueva; si el navegador bloquea el popup, navega en la actual. */
  const openInNewTab = (target: string): void => {
    const opened = window.open(target, '_blank');
    if (opened) {
      opened.opener = null;
    } else {
      window.location.href = target;
    }
  };

  /**
   * En celular deja que el vínculo abra Instagram de inmediato. En desktop copia el enlace,
   * muestra el aviso y espera antes de abrir la bandeja web, para que se pueda leer el aviso.
   */
  const handleInstagramClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    const { primary } = instagramShareLinks(navigator.userAgent, url);

    if (!primary.startsWith('https://')) {
      void handleCopy();
      return;
    }

    event.preventDefault();
    void handleCopy().then((copiedSuccessfully) => {
      if (copiedSuccessfully) setInstagramToast(true);
      clearOpenTimer();
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = undefined;
        openInNewTab(primary);
      }, INSTAGRAM_OPEN_DELAY_MS);
    });
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
            // En celular Instagram abre el "Enviar a…" con el link; en desktop, el web.
            const destination =
              network === 'instagram'
                ? instagramShareLinks(navigator.userAgent, url).primary
                : href;
            return (
              <li key={network}>
                <a
                  className="ev-share-dialog__network"
                  href={destination}
                  aria-label={t('share.networkAccessible', { network: name })}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  onClick={network === 'instagram' ? handleInstagramClick : undefined}
                >
                  <span className="ev-share-dialog__network-icon-frame" aria-hidden="true">
                    <Icon className="ev-share-dialog__network-icon" width={24} height={24} />
                  </span>
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

        {instagramToast && (
          <div className="ev-share-dialog__toast">
            <strong className="ev-share-dialog__toast-title">{t('share.instagramNotifyTitle')}</strong>
            <span>{t('share.instagramNotifyBody')}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default ShareDialog;
