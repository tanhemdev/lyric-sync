// Spotify sign-in with Authorization Code + PKCE, which is the flow Spotify
// recommends for apps that run entirely in the browser: there is no client
// secret to leak. Then one read-only call: what is playing right now.
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

export const SCOPES = ['user-read-currently-playing', 'user-read-playback-state'];
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const UNRESERVED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function randomString(length = 64, cryptoImpl = globalThis.crypto) {
  const bytes = cryptoImpl.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => UNRESERVED[b % UNRESERVED.length]).join('');
}

export function base64url(bytes) {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function codeChallenge(verifier, cryptoImpl = globalThis.crypto) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(digest);
}

export function authorizeUrl({ clientId, redirectUri, challenge, state, scopes = SCOPES }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function tokenRequest(fields, fetchImpl) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.error || `Spotify sign-in failed (${res.status})`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? fields.refresh_token ?? null,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export function exchangeCode({ clientId, code, redirectUri, verifier, fetchImpl = fetch }) {
  return tokenRequest(
    { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier },
    fetchImpl,
  );
}

export function refreshToken({ clientId, refreshToken: token, fetchImpl = fetch }) {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: token, client_id: clientId }, fetchImpl);
}

// Turns Spotify's response into the few fields we need. null = nothing playing
// (or an ad / podcast, which have no lyrics to sync).
export function toNowPlaying(data) {
  const item = data?.item;
  if (!item || data.currently_playing_type !== 'track') return null;
  return {
    trackId: item.id,
    title: item.name,
    artists: (item.artists ?? []).map((a) => a.name),
    album: item.album?.name ?? '',
    art: item.album?.images?.[item.album.images.length > 1 ? 1 : 0]?.url ?? null,
    durationMs: item.duration_ms,
    progressMs: data.progress_ms ?? 0,
    isPlaying: Boolean(data.is_playing),
  };
}

export class SpotifyAuthError extends Error {}

export async function getNowPlaying(accessToken, fetchImpl = fetch) {
  const res = await fetchImpl(NOW_PLAYING_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 204) return null;
  if (res.status === 401) throw new SpotifyAuthError('Spotify session expired');
  if (!res.ok) throw new Error(`Spotify returned ${res.status}`);
  return toNowPlaying(await res.json());
}
