import { base64UrlToBytes, bytesToBase64Url } from "@/lib/web-push";
import { getPushKey, removePushSubscription, savePushSubscription } from "./push.functions";

export type PushSupport = "ok" | "ios-instalar" | "sem-suporte";

function standalone() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/** No iPhone, o navegador só oferece notificações ao app instalado na Tela de Início. */
export function pushSupport(): PushSupport {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (ios && !standalone()) return "ios-instalar";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "sem-suporte";
  return "ok";
}

async function registration() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error("Abra o app instalado para ativar as notificações.");
  return reg;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Pede permissão, inscreve o aparelho e salva no servidor. Chame dentro de um toque. */
export async function enablePush(notifyHour: number): Promise<PushSubscription> {
  // O pedido de permissão vem primeiro: no iPhone ele precisa sair direto do toque.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("negada");
  const key = await getPushKey();
  if (!key) throw new Error("As notificações ainda não foram configuradas no servidor.");
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  // Inscrição feita com outra chave não serve mais.
  const current = sub?.options.applicationServerKey;
  if (sub && current && bytesToBase64Url(new Uint8Array(current)) !== key) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(key),
  });
  await saveHour(sub, notifyHour);
  return sub;
}

export async function saveHour(sub: PushSubscription, notifyHour: number) {
  const json = sub.toJSON();
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.["p256dh"] ?? "",
      auth: json.keys?.["auth"] ?? "",
      notifyHour,
    },
  });
}

export async function disablePush(sub: PushSubscription) {
  await removePushSubscription({ data: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}
