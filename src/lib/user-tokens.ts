/**
 * Per-user localStorage keys for GitHub and Linear tokens.
 * Keys are scoped by userId. Values are AES-GCM encrypted at rest,
 * with the encryption key derived from the userId via PBKDF2.
 */

let _userId: string | null = null;
let _cryptoKey: CryptoKey | null = null;
let _readyResolve: (() => void) | null = null;
let _ready: Promise<void> = new Promise((r) => { _readyResolve = r; });

const SALT = "tambo-standup-token-salt";

async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(SALT), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(plaintext: string): Promise<string> {
  if (!_cryptoKey) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    _cryptoKey,
    enc.encode(plaintext),
  );
  // Store as iv:ciphertext, both base64
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

async function decrypt(stored: string): Promise<string> {
  if (!_cryptoKey || !stored) return "";
  try {
    const [ivB64, ctB64] = stored.split(":");
    if (!ivB64 || !ctB64) return "";
    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      _cryptoKey,
      ct,
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    // Corrupted or wrong key — clear the value
    return "";
  }
}

export async function setTokenUserId(userId: string) {
  _userId = userId;
  _cryptoKey = await deriveKey(userId);
  if (_readyResolve) { _readyResolve(); _readyResolve = null; }
}

/** Resolves once setTokenUserId has been called and the crypto key is derived. */
export function tokenReady(): Promise<void> {
  return _ready;
}

function key(base: string): string {
  return _userId ? `${base}::${_userId}` : base;
}

export async function getGithubToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem(key("user-github-token")) ?? "";
  return decrypt(raw);
}

export async function getLinearApiKey(): Promise<string> {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem(key("user-linear-api-key")) ?? "";
  return decrypt(raw);
}

export async function setGithubToken(value: string) {
  const encrypted = await encrypt(value);
  localStorage.setItem(key("user-github-token"), encrypted);
}

export async function setLinearApiKey(value: string) {
  const encrypted = await encrypt(value);
  localStorage.setItem(key("user-linear-api-key"), encrypted);
}

export async function getGithubOrg(): Promise<string> {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem(key("user-github-org")) ?? "";
  return decrypt(raw);
}

export async function setGithubOrg(value: string) {
  const encrypted = await encrypt(value);
  localStorage.setItem(key("user-github-org"), encrypted);
}

export async function getSelectedTeam(): Promise<{ id: string; name: string } | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key("user-selected-team")) ?? "";
  const decrypted = await decrypt(raw);
  if (!decrypted) return null;
  try { return JSON.parse(decrypted); } catch { return null; }
}

export async function setSelectedTeam(team: { id: string; name: string } | null) {
  if (!team) {
    localStorage.removeItem(key("user-selected-team"));
    return;
  }
  const encrypted = await encrypt(JSON.stringify(team));
  localStorage.setItem(key("user-selected-team"), encrypted);
}

export async function getFilteredMembers(): Promise<string[] | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key("user-filtered-members")) ?? "";
  const decrypted = await decrypt(raw);
  if (!decrypted) return null;
  try { return JSON.parse(decrypted); } catch { return null; }
}

export async function setFilteredMembers(ids: string[] | null) {
  if (ids === null) {
    localStorage.removeItem(key("user-filtered-members"));
    return;
  }
  const encrypted = await encrypt(JSON.stringify(ids));
  localStorage.setItem(key("user-filtered-members"), encrypted);
}

export async function getTokenHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const [gh, linear, org] = await Promise.all([getGithubToken(), getLinearApiKey(), getGithubOrg()]);
  if (gh) headers["x-github-token"] = gh;
  if (linear) headers["x-linear-api-key"] = linear;
  if (org) headers["x-github-org"] = org;
  return headers;
}
