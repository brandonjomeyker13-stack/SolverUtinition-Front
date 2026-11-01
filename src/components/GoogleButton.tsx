import { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID } from "../lib/google";

type Props = {
  onCredential: (idToken: string) => void;
};

export function GoogleButton({ onCredential }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const alRecibir = useRef(onCredential);
  alRecibir.current = onCredential;
  const clientId = GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !caja.current) return;

    const scriptId = "gis-script";
    let iniciado = false;
    const render = () => {
      if (!window.google || !caja.current) return;
      const ancho = Math.max(200, Math.min(320, Math.floor(caja.current.clientWidth)));
      if (!iniciado) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => alRecibir.current(res.credential),
        });
        iniciado = true;
      }
      caja.current.innerHTML = "";
      window.google.accounts.id.renderButton(caja.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: ancho,
        locale: "es",
      });
    };

    if (document.getElementById(scriptId)) {
      render();
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [clientId]);

  if (!clientId) {
    return (
      <p className="text-center text-sm text-mute">
        Falta <code className="text-cream">VITE_GOOGLE_CLIENT_ID</code> en el .env del front.
      </p>
    );
  }

  return <div ref={caja} className="flex w-full justify-center overflow-hidden" />;
}
