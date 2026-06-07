const encoder = new TextEncoder();

// Custom base64url encoding that handles UTF-8 characters properly
function base64urlEncode(str: string): string {
  const utf8Bytes = encoder.encode(str);
  const binary = Array.from(utf8Bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Custom base64url decoding that handles UTF-8 characters properly
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const base64UrlHeader = base64urlEncode(JSON.stringify(header));
  const base64UrlPayload = base64urlEncode(JSON.stringify(payload));
  const dataToSign = `${base64UrlHeader}.${base64UrlPayload}`;

  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToSign)
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureBinary = signatureArray.map((b) => String.fromCharCode(b)).join("");
  const signatureBase64 = btoa(signatureBinary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${dataToSign}.${signatureBase64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const dataToSign = `${header}.${payload}`;

  try {
    const key = await getCryptoKey(secret);

    // Decode signature
    let sigBase64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    while (sigBase64.length % 4) {
      sigBase64 += "=";
    }
    const sigBinary = atob(sigBase64);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(dataToSign)
    );

    if (!isValid) return null;

    const payloadJson = base64urlDecode(payload);
    const decoded = JSON.parse(payloadJson);

    // Check expiration if 'exp' is present
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.warn("[JWT Verification] Token has expired");
      return null;
    }

    return decoded;
  } catch (e) {
    console.error("[JWT Verification] Error:", e);
    return null;
  }
}
