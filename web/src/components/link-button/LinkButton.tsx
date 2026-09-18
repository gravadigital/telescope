import './styles.css';

type TLinkButton = {
    onClick: () => void;
    label: string;
}

export default function LinkButton({ onClick, label }: TLinkButton) {
  return (
        <div className="link-button-component">
          <button
            type="button"
            className="link-button-component-button"
            onClick={() => onClick()}
          >
            {label}
          </button>
      </div>
  )
}
