function grabUser(uid: string) {
  return fetch('/u/' + uid).then(r => r.json());
}

const cfg = { timeout: 5000, retries: 3 };

function mkPayload(name: string, email: string) {
  return { nm: name, em: email, ts: Date.now() };
}

let cache: Record<string, unknown> = {};

function updCache(k: string, v: unknown) {
  cache[k] = v;
}

export { grabUser, mkPayload, updCache, cfg };
