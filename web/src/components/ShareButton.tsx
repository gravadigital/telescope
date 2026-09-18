import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { EventService } from '../services/api';
import './ShareButton.css';

interface ShareButtonProps {
  eventId: string;
  eventTitle: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ eventId, eventTitle }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const loadShareInfo = async () => {
    if (shareInfo) {
      return; // Ya está cargado
    }

    try {
      const info = await EventService.getShareableEventInfo(eventId);
      setShareInfo(info);
    } catch (error) {
      console.error('Failed to load share info:', error);
      // Usar datos básicos como fallback
      setShareInfo({
        title: eventTitle,
        share_url: `${window.location.origin}/events/${eventId}`,
        description: 'Check out this telescope time allocation event!'
      });
    }
  };

  const handleShare = async () => {
    await loadShareInfo();
    setShowMenu(!showMenu);
  };

  const copyToClipboard = async () => {
    if (!shareInfo) return;

    try {
      await navigator.clipboard.writeText(shareInfo.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('✅ Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const shareOnTwitter = () => {
    if (!shareInfo) return;

    const text = encodeURIComponent(`${shareInfo.title} - ${shareInfo.description}`);
    const url = encodeURIComponent(shareInfo.share_url);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareOnFacebook = () => {
    if (!shareInfo) return;

    const url = encodeURIComponent(shareInfo.share_url);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareOnLinkedIn = () => {
    if (!shareInfo) return;

    const url = encodeURIComponent(shareInfo.share_url);
    const title = encodeURIComponent(shareInfo.title);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareOnWhatsApp = () => {
    if (!shareInfo) return;

    const text = encodeURIComponent(`${shareInfo.title}\n${shareInfo.share_url}`);
    window.open(
      `https://wa.me/?text=${text}`,
      '_blank'
    );
  };

  const shareViaEmail = () => {
    if (!shareInfo) return;

    const subject = encodeURIComponent(shareInfo.title);
    const body = encodeURIComponent(
      `Check out this telescope time allocation event:\n\n${shareInfo.title}\n\n${shareInfo.description}\n\nView event: ${shareInfo.share_url}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="share-button-container">
      <button className="share-button" onClick={handleShare}>
        <span className="share-icon">🔗</span>
        Share Event
      </button>

      {showMenu && ReactDOM.createPortal(
        <>
          <div className="share-overlay" onClick={() => setShowMenu(false)} />
          <div className="share-menu">
            <div className="share-menu-header">
              <h3>Share this event</h3>
              <button className="close-btn" onClick={() => setShowMenu(false)}>×</button>
            </div>

            <div className="share-menu-content">
              <button className="share-option" onClick={copyToClipboard}>
                <span className="share-option-icon">📋</span>
                <span className="share-option-text">
                  {copied ? 'Link copied!' : 'Copy link'}
                </span>
              </button>

              <button className="share-option" onClick={shareOnTwitter}>
                <span className="share-option-icon">𝕏</span>
                <span className="share-option-text">Share on Twitter/X</span>
              </button>

              <button className="share-option" onClick={shareOnFacebook}>
                <span className="share-option-icon">📘</span>
                <span className="share-option-text">Share on Facebook</span>
              </button>

              <button className="share-option" onClick={shareOnLinkedIn}>
                <span className="share-option-icon">💼</span>
                <span className="share-option-text">Share on LinkedIn</span>
              </button>

              <button className="share-option" onClick={shareOnWhatsApp}>
                <span className="share-option-icon">💬</span>
                <span className="share-option-text">Share on WhatsApp</span>
              </button>

              <button className="share-option" onClick={shareViaEmail}>
                <span className="share-option-icon">✉️</span>
                <span className="share-option-text">Share via Email</span>
              </button>
            </div>

            {shareInfo && (
              <div className="share-preview">
                <div className="share-preview-label">Link to share:</div>
                <div className="share-preview-url">{shareInfo.share_url}</div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default ShareButton;
