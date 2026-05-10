import { UAParser } from 'ua-parser-js';

export interface ParsedUA {
  browser: string | null;
  os: string | null;
  device: 'desktop' | 'mobile' | 'tablet';
}

export function parseUA(ua: string): ParsedUA {
  const parsed = new UAParser(ua).getResult();
  const deviceType = parsed.device.type;
  const device: ParsedUA['device'] =
    deviceType === 'mobile'
      ? 'mobile'
      : deviceType === 'tablet'
        ? 'tablet'
        : 'desktop';
  return {
    browser: parsed.browser.name ?? null,
    os: parsed.os.name ?? null,
    device,
  };
}
