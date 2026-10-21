/** JSON.parse accepts duplicate object keys. Content submissions deliberately do not. */
export function parseUniqueJSON(text) {
  let offset = 0;
  const whitespace = () => { while (/[ \t\r\n]/.test(text[offset] ?? '') && offset < text.length) offset++; };
  const fail = (message) => { throw new Error(`${message} near character ${offset}`); };
  function string() {
    const start = offset++;
    while (offset < text.length) {
      if (text[offset] === '\\') { offset += 2; continue; }
      if (text[offset++] === '"') return JSON.parse(text.slice(start, offset));
    }
    fail('Unterminated string');
  }
  function value(depth = 0) {
    if (depth > 20) fail('JSON nesting exceeds 20 levels');
    whitespace();
    const token = text[offset];
    if (token === '"') return string();
    if (token === '{') {
      offset++; whitespace();
      const object = Object.create(null), keys = new Set();
      if (text[offset] === '}') { offset++; return object; }
      while (offset < text.length) {
        whitespace();
        if (text[offset] !== '"') fail('Expected an object key');
        const key = string();
        if (keys.has(key)) fail(`Duplicate JSON key ${JSON.stringify(key)}`);
        keys.add(key); whitespace();
        if (text[offset++] !== ':') fail('Expected colon');
        object[key] = value(depth + 1); whitespace();
        const end = text[offset++];
        if (end === '}') return object;
        if (end !== ',') fail('Expected comma or closing brace');
      }
      fail('Unterminated object');
    }
    if (token === '[') {
      offset++; whitespace();
      const list = [];
      if (text[offset] === ']') { offset++; return list; }
      while (offset < text.length) {
        list.push(value(depth + 1)); whitespace();
        const end = text[offset++];
        if (end === ']') return list;
        if (end !== ',') fail('Expected comma or closing bracket');
      }
      fail('Unterminated array');
    }
    const primitive = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(offset));
    if (!primitive) fail('Expected a JSON value');
    offset += primitive[0].length;
    return JSON.parse(primitive[0]);
  }
  const parsed = value(); whitespace();
  if (offset !== text.length) fail('Unexpected trailing content');
  return parsed;
}
