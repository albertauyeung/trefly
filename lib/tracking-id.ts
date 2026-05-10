import { randomBytes } from 'node:crypto';

export function newTrackingId(): string {
  return randomBytes(8).toString('base64url');
}
