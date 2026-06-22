/**
 * Valve VDF (KeyValues) parse / stringify. Vendored from @node-steam/vdf v2.2.0 (MIT, © N|Steam) —
 * https://github.com/node-steam/vdf
 *
 * MIT License
 *
 * Copyright (c) N|Steam
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Modified: leaf values are kept as raw strings (no number/bool coercion) so a parse → stringify
 * round-trip is lossless. Upstream coerced big ints (e.g. depot gids > 2^53) and corrupted them in
 * place (node-steam/vdf#15); we rewrite `.acf` files, so that's unacceptable. See AGENTS.md (Stack).
 */

/** Parse a VDF (KeyValues) string into a nested object. Leaf values are always strings. */
export const parseVdf = (text: string): unknown => {
  if (typeof text !== 'string') {
    throw new TypeError('VDF | Parse: Expecting parameter to be a string');
  }

  const lines = text.split('\n');
  const object: Record<string, unknown> = {};
  const stack: Record<string, unknown>[] = [object];
  let expect = false;

  const regex = new RegExp(
    '^("((?:\\\\.|[^\\\\"])+)"|([a-z0-9\\-\\_]+))' +
      '([ \t]*(' +
      '"((?:\\\\.|[^\\\\"])*)(")?' +
      '|([a-z0-9\\-\\_]+)' +
      '))?',
  );

  let comment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith('/*') && line.endsWith('*/')) continue;

    if (line.startsWith('/*')) {
      comment = true;
      continue;
    }

    if (line.endsWith('*/')) {
      comment = false;
      continue;
    }

    if (comment) continue;

    if (line === '' || line[0] === '/') continue;

    if (line[0] === '{') {
      expect = false;
      continue;
    }

    if (expect) throw new SyntaxError(`VDF | Parse: Invalid syntax on line ${i + 1}`);

    if (line[0] === '}') {
      stack.pop();
      continue;
    }

    while (true) {
      const m = regex.exec(line);

      if (m === null) throw new SyntaxError(`VDF | Parse: Invalid syntax on line ${i + 1}`);

      const key = (m[2] !== undefined ? m[2] : m[3]) as string;
      const val = m[6] !== undefined ? m[6] : m[8];

      if (val === undefined) {
        const top = stack[stack.length - 1];

        if (top[key] === undefined) top[key] = {};

        stack.push(top[key] as Record<string, unknown>);
        expect = true;
      } else {
        // A quoted value that didn't close on this line — append the next and re-match. Guard
        // against running past the last line: an unterminated quote would otherwise append
        // "undefined" forever (infinite loop / OOM) instead of failing on a corrupt file.
        if (m[7] === undefined && m[8] === undefined) {
          if (i + 1 >= lines.length) {
            throw new SyntaxError(`VDF | Parse: Unterminated value on line ${i + 1}`);
          }

          line += '\n' + lines[++i];
          continue;
        }

        // Keep the raw string (no coercion) — see the file header.
        stack[stack.length - 1][key] = val;
      }

      break;
    }
  }

  if (stack.length !== 1) throw new SyntaxError('VDF | Parse: Open parentheses somewhere');

  return object;
};

/** Serialize a nested object back into a VDF (KeyValues) string. */
export const stringifyVdf = (object: unknown): string => {
  if (typeof object !== 'object') {
    throw new TypeError('VDF | Stringify: First input parameter is not an object');
  }

  return create(object);
};

const create = (object: unknown, level = 0): string => {
  if (typeof object !== 'object' || object === null) {
    throw new TypeError('VDF | Stringify: A key has value of type other than string or object');
  }

  const tab = '\t';
  let indent = '';

  for (let i = 0; i < level; i++) {
    indent += tab;
  }

  let result = '';

  for (const [key, value] of Object.entries(object as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null) {
      const block = create(value, level + 1);

      result += [indent, '"', key, '"\n', indent, '{\n', block, indent, '}\n'].join('');
    } else {
      result += [indent, '"', key, '"', tab, tab, '"', String(value), '"\n'].join('');
    }
  }

  return result;
};
