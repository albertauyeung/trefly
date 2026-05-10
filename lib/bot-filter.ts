const BLOCKED_UA_PATTERNS = [
  /^curl\//i,
  /^wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /scrapy/i,
  /httpx/i,
  /go-http-client/i,
  /^java\//i,
  /okhttp/i,
  /libwww-perl/i,
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /node-fetch/i,
  /axios\//i,
  /bot/i,
  /spider/i,
  /crawler/i,
];

export function isBot(ua: string): boolean {
  if (!ua.trim()) return true;
  return BLOCKED_UA_PATTERNS.some((re) => re.test(ua));
}
