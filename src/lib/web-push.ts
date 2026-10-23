// Envio de Web Push só com WebCrypto, porque o servidor roda na Cloudflare (sem o
// módulo crypto do Node). Segue a RFC 8291 (mensagem cifrada em aes128gcm) e a
// RFC 8292 (VAPID, que identifica este servidor para o serviço de push).

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };

export type VapidKeys = {
  /** Chave pública P-256, 65 bytes, base64url (a mesma usada no navegador). */
  publicKey: string;
  /** Chave privada P-256, 32 bytes, base64url. */
  privateKey: string;
  /** Contato do responsável: "mailto:..." ou o endereço do site. */
  subject: string;
};

const enc = new TextEncoder();

/** Bytes num ArrayBuffer comum (é o que o WebCrypto aceita). */
type Bytes = Uint8Array<ArrayBuffer>;

function utf8(s: string): Bytes {
  return new Uint8Array(enc.encode(s));
}

export function base64UrlToBytes(s: string): Bytes {
  const b64 = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function bytesToBase64Url(bytes: Bytes): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

async function hmac(key: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** HKDF-SHA256 com um único bloco de saída (basta para até 32 bytes). */
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, length);
}

/** Cifra a mensagem para uma inscrição (RFC 8291, um único registro aes128gcm). */
export async function encryptPayload(
  payload: Bytes,
  sub: Pick<PushSubscriptionKeys, "p256dh" | "auth">,
  /** Só para testes: chaves e salt fixos. */
  fixed?: { senderKeys: CryptoKeyPair; salt: Bytes },
): Promise<Bytes> {
  const uaPublic = base64UrlToBytes(sub.p256dh);
  const authSecret = base64UrlToBytes(sub.auth);

  const sender =
    fixed?.senderKeys ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", sender.publicKey));
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, sender.privateKey, 256),
  );

  const keyInfo = concat(utf8("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, utf8("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 marca o último (e único) registro.
  const plaintext = concat(payload, new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext),
  );

  const rs = 4096;
  const header = concat(
    salt,
    new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255]),
    new Uint8Array([asPublic.length]),
    asPublic,
  );
  return concat(header, ciphertext);
}

/** Cabeçalho Authorization do VAPID (JWT ES256 válido por 12 horas). */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys): Promise<string> {
  const pub = base64UrlToBytes(vapid.publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64Url(pub.slice(1, 33)),
      y: bytesToBase64Url(pub.slice(33, 65)),
      d: vapid.privateKey,
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const b64json = (o: object) => bytesToBase64Url(utf8(JSON.stringify(o)));
  const unsigned = `${b64json({ typ: "JWT", alg: "ES256" })}.${b64json({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: vapid.subject,
  })}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(unsigned)),
  );
  return `vapid t=${unsigned}.${bytesToBase64Url(signature)}, k=${vapid.publicKey}`;
}

export type PushResult = { ok: boolean; status: number; gone: boolean };

/** Envia uma notificação. `gone` = a inscrição não vale mais e pode ser apagada. */
export async function sendPush(
  sub: PushSubscriptionKeys,
  data: object,
  vapid: VapidKeys,
): Promise<PushResult> {
  const body = await encryptPayload(utf8(JSON.stringify(data)), sub);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(12 * 60 * 60),
      Urgency: "normal",
    },
    body,
  });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}
