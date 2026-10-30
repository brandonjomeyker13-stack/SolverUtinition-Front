import { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID } from "../lib/google";

type Props = {
  onCredential: (idToken: string) => void;
};

export function GoogleButton({ onCredential }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const clientId = GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !caja.current) return;

    const scriptId = "gis-script";
    const render = () => {
      if (!window.google || !caja.current) return;
      caja.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => onCredential(res.credential),
      });
      window.google.accounts.id.renderButton(caja.current, {
        theme: "filled_black",
        size: "large",
        text: "signin_with",
        width: 320,
        locale: "es",
      });
    };

    if (document.getElementById(scriptId)) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <p className="text-center text-sm text-mute">
        Falta <code className="text-cream">VITE_GOOGLE_CLIENT_ID</code> en el .env del front.
      </p>
    );
  }

  return <div ref={caja} className="flex justify-center" />;
}
