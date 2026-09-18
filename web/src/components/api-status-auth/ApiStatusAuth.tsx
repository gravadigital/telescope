import React from "react";

type TApiStatusAuth = {
    apiAvailable: boolean;
}

export default function ApiStatusAuth({apiAvailable} : TApiStatusAuth) {
  return (
    <div className="api-status-auth">
      {apiAvailable ? (
        <div className="status-indicator online">🟢 Connected to server</div>
      ) : (
        <div className="status-indicator offline">🟡 Demo mode</div>
      )}
    </div>
  );
}
