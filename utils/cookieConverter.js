// Converts raw Facebook cookie string (from browser) to FCA appstate format
function rawCookiesToAppstate(rawCookieString) {
  const now = new Date().toISOString();
  const cookies = rawCookieString.split(';').map(c => c.trim()).filter(c => c.length > 0);

  const appstate = cookies.map(cookie => {
    const eqIdx = cookie.indexOf('=');
    if (eqIdx === -1) return null;
    const key = cookie.substring(0, eqIdx).trim();
    const value = cookie.substring(eqIdx + 1).trim();
    if (!key) return null;
    return {
      key,
      value,
      domain: '.facebook.com',
      path: '/',
      hostOnly: false,
      creation: now,
      lastAccessed: now
    };
  }).filter(Boolean);

  if (appstate.length === 0) throw new Error('No valid cookies found in the provided string');
  const requiredKeys = ['c_user', 'xs'];
  const foundKeys = appstate.map(c => c.key);
  const missingKeys = requiredKeys.filter(k => !foundKeys.includes(k));
  if (missingKeys.length > 0) {
    throw new Error('Missing required Facebook cookies: ' + missingKeys.join(', ') + '. Make sure you copied all cookies from facebook.com');
  }
  return appstate;
}

module.exports = { rawCookiesToAppstate };
