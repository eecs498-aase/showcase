import { inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngDimensions(bytes, maximum) {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('invalid PNG signature');
  let offset = 8, width, height, bitDepth, colorType, interlace, ended = false;
  const imageData = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) throw new Error('truncated PNG chunk');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== bytes.readUInt32BE(offset + 8 + length)) throw new Error('PNG chunk checksum is invalid');
    if (offset === 8 && type !== 'IHDR') throw new Error('PNG must begin with IHDR');
    if (type === 'IHDR') {
      if (width !== undefined || length !== 13) throw new Error('invalid PNG header');
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      bitDepth = body[8]; colorType = body[9]; interlace = body[12];
      if (!width || !height || width > maximum || height > maximum) throw new Error(`image dimensions must be 1–${maximum} pixels`);
      const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!depths[colorType]?.includes(bitDepth) || body[10] || body[11] || interlace > 1) throw new Error('unsupported PNG header');
    }
    if (['acTL', 'fcTL', 'fdAT'].includes(type)) throw new Error('animated PNGs are not supported; upload a still screenshot');
    if (type === 'IDAT') imageData.push(body);
    offset += length + 12;
    if (type === 'IEND') {
      if (length !== 0 || offset !== bytes.length) throw new Error('invalid PNG end chunk or trailing bytes');
      ended = true; break;
    }
  }
  if (!ended || !imageData.length || width === undefined) throw new Error('PNG is missing image data or its end chunk');
  // Bound decompression before Sharp's full decode in the build, including Adam7 overhead.
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const maxOutputLength = Math.ceil(width * channels * bitDepth / 8 + 1) * height + (interlace ? (width + height + 16) * 16 : 0);
  const raw = inflateSync(Buffer.concat(imageData), { maxOutputLength });
  if (!interlace && raw.length !== maxOutputLength) throw new Error('PNG pixel data has an invalid length');
  return { width, height };
}

function jpegDimensions(bytes) {
  if (bytes.length < 12 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('invalid or truncated JPEG');
  let offset = 2, dimensions;
  while (offset < bytes.length - 2) {
    if (bytes[offset++] !== 255) throw new Error('invalid JPEG marker');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218) {
      if (!dimensions) throw new Error('JPEG scan precedes its dimensions');
      if (offset + 3 > bytes.length) throw new Error('truncated JPEG scan header');
      const length = bytes.readUInt16BE(offset);
      if (length !== 6 + 2 * bytes[offset + 2] || length < 8 || offset + length >= bytes.length - 2) throw new Error('invalid or empty JPEG scan');
      return dimensions;
    }
    if (marker === 217 || marker === 216 || marker === 0 || (marker >= 208 && marker <= 215)) throw new Error('invalid JPEG structure');
    if (offset + 2 > bytes.length) throw new Error('truncated JPEG marker');
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error('truncated JPEG segment');
    if ([192, 193, 194].includes(marker)) {
      if (length < 8) throw new Error('invalid JPEG frame');
      dimensions = { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  throw new Error('JPEG has no image scan');
}

function webpDimensions(bytes) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) !== bytes.length - 8) throw new Error('invalid or truncated WebP container');
  let offset = 12, dimensions, hasPixels = false;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (length > bytes.length - start) throw new Error('truncated WebP chunk');
    if (type === 'ANIM' || type === 'ANMF') throw new Error('animated WebP is not supported; upload a still screenshot');
    if (type === 'VP8X') {
      if (length !== 10 || bytes[start] & 2) throw new Error('invalid or animated WebP header');
      dimensions = { width: bytes.readUIntLE(start + 4, 3) + 1, height: bytes.readUIntLE(start + 7, 3) + 1 };
    } else if (type === 'VP8 ') {
      if (length < 10 || bytes[start] & 1 || !bytes.subarray(start + 3, start + 6).equals(Buffer.from([157, 1, 42]))) throw new Error('invalid WebP VP8 frame');
      const frame = { width: bytes.readUInt16LE(start + 6) & 16383, height: bytes.readUInt16LE(start + 8) & 16383 };
      if (dimensions && (dimensions.width !== frame.width || dimensions.height !== frame.height)) throw new Error('WebP frame dimensions disagree');
      dimensions = frame; hasPixels = true;
    } else if (type === 'VP8L') {
      if (length < 5 || bytes[start] !== 47 || bytes[start + 4] >> 5) throw new Error('invalid WebP lossless frame');
      const bits = bytes.readUInt32LE(start + 1);
      const frame = { width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 };
      if (dimensions && (dimensions.width !== frame.width || dimensions.height !== frame.height)) throw new Error('WebP frame dimensions disagree');
      dimensions = frame; hasPixels = true;
    }
    offset = start + length + (length % 2);
  }
  if (offset !== bytes.length || !dimensions || !hasPixels) throw new Error('WebP is missing complete image data');
  return dimensions;
}

/** Structural verification only. The publication builder also decodes and re-encodes with Sharp. */
export function inspectImage(bytes, extension, { maxImageBytes, maxImageDimension }) {
  if (!bytes.length || bytes.length > maxImageBytes) throw new Error(`image must be between 1 and ${maxImageBytes} bytes`);
  const dimensions = extension === '.png' ? pngDimensions(bytes, maxImageDimension)
    : ['.jpg', '.jpeg'].includes(extension) ? jpegDimensions(bytes)
      : extension === '.webp' ? webpDimensions(bytes) : null;
  if (!dimensions) throw new Error('only PNG, JPEG and WebP screenshots are allowed');
  if (!dimensions.width || !dimensions.height || dimensions.width > maxImageDimension || dimensions.height > maxImageDimension) throw new Error(`image dimensions must be 1–${maxImageDimension} pixels`);
  return dimensions;
}
