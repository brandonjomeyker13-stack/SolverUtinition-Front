import { api } from "./api";

export type EstadoPush = "no-soportado" | "falta-instalar" | "bloqueado" | "activo" | "inactivo";

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function instalada() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

export async function estadoPush(): Promise<EstadoPush> {
  // En iPhone las notificaciones solo existen si la app está en la pantalla de inicio.
  if (esIOS() && !instalada()) return "falta-instalar";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "no-soportado";
  }
  if (Notification.permission === "denied") return "bloqueado";
  const registro = await navigator.serviceWorker.getRegistration();
  const sub = await registro?.pushManager.getSubscription();
  return sub ? "activo" : "inactivo";
}

export async function activarPush(): Promise<void> {
  const { clave } = await api<{ clave: string | null }>("/push/clave");
  if (!clave) throw new Error("Las notificaciones todavía no están configuradas en el servidor.");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No diste permiso para las notificaciones.");
  const registro = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const sub =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave) }));
  const json = sub.toJSON();
  await api("/push/suscripcion", {
    method: "POST",
    body: JSON.stringify({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
  });
}

export async function desactivarPush(): Promise<void> {
  const registro = await navigator.serviceWorker.getRegistration();
  const sub = await registro?.pushManager.getSubscription();
  if (!sub) return;
  await api("/push/suscripcion/borrar", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(
    () => {},
  );
  await sub.unsubscribe();
}

export function probarPush(): Promise<void> {
  return api("/push/prueba", { method: "POST" });
}
