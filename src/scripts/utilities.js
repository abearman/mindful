export function createUniqueID() {
  return Date.now() + Math.random();
}

export function constructValidURL(url) {
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  url = new URL(url);
  if (!/^www\./i.test(url.hostname)) {
    url.hostname = 'www.' + url.hostname;
  }
  return url.href;
}