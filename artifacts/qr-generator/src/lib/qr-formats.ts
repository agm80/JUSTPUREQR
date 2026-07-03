export type ContentType = 'text' | 'url' | 'wifi' | 'vcard' | 'email' | 'sms' | 'phone' | 'location' | 'event';

/**
 * Converts a value from a <input type="datetime-local"> field (which represents
 * local wall-clock time with no timezone info, e.g. "2026-07-02T14:00") into a
 * UTC iCalendar DTSTART/DTEND timestamp (e.g. "20260702T070000Z").
 *
 * Browsers parse date-time strings without a timezone offset as local time, so
 * `new Date(localDateTime)` correctly anchors it before converting to UTC.
 */
export function toICalUTC(localDateTime: string): string {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function formatWifi(ssid: string, password?: string, encryption: 'WPA' | 'WEP' | 'nopass' = 'WPA', hidden: boolean = false) {
  if (!ssid) return '';
  return `WIFI:T:${encryption};S:${ssid};P:${password || ''};H:${hidden};;`;
}

export function formatVCard(data: {
  firstName: string;
  lastName: string;
  org?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}) {
  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${data.lastName};${data.firstName};;;`,
    `FN:${data.firstName} ${data.lastName}`,
  ];
  
  if (data.org) parts.push(`ORG:${data.org}`);
  if (data.title) parts.push(`TITLE:${data.title}`);
  if (data.phone) parts.push(`TEL;TYPE=work,voice:${data.phone}`);
  if (data.email) parts.push(`EMAIL;TYPE=work:${data.email}`);
  if (data.website) parts.push(`URL:${data.website}`);
  if (data.address) parts.push(`ADR;TYPE=work:;;${data.address};;;;`);
  
  parts.push('END:VCARD');
  return parts.join('\n');
}

export function formatEmail(to: string, subject?: string, body?: string) {
  if (!to) return '';
  let url = `mailto:${to}`;
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  return url;
}

export function formatSMS(phone: string, message?: string) {
  if (!phone) return '';
  return `SMSTO:${phone}:${message || ''}`;
}

export function formatPhone(phone: string) {
  if (!phone) return '';
  return `tel:${phone}`;
}

export function formatLocation(lat: string, lng: string) {
  if (!lat || !lng) return '';
  return `geo:${lat},${lng}`;
}

export function formatEvent(data: {
  title: string;
  location?: string;
  startDate: string; // YYYYMMDDTHHmmssZ
  endDate: string;   // YYYYMMDDTHHmmssZ
  description?: string;
}) {
  const parts = [
    'BEGIN:VEVENT',
    `SUMMARY:${data.title}`,
    `DTSTART:${data.startDate}`,
    `DTEND:${data.endDate}`,
  ];
  if (data.location) parts.push(`LOCATION:${data.location}`);
  if (data.description) parts.push(`DESCRIPTION:${data.description}`);
  parts.push('END:VEVENT');
  return parts.join('\n');
}
