export function createUniqueID() {
  return Date.now() + Math.random();
}

export function constructValidURL(url) {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  if (!/^www\./i.test(url)) {
    url = url.replace(/^(https?:\/\/)?([a-z0-9\-]+\.[a-z0-9\-]+)/i, "$1www.$2");
  }
  return url;
}