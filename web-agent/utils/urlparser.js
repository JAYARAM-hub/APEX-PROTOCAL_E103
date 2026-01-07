function parseURL(urlString) {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      valid: true
    };
  } catch (error) {
    return { 
      valid: false,
      error: 'Invalid URL format'
    };
  }
}

function isValidURL(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

function normalizeURL(urlString) {
  try {
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = 'https://' + urlString;
    }
    const url = new URL(urlString);
    return url.toString();
  } catch {
    return null;
  }
}

module.exports = { parseURL, isValidURL, normalizeURL };
