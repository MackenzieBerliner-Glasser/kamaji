import {Decimal} from 'decimal.js';
import {data} from './data';

// Decimal.set({precision: 200, rounding: 0});

const objectsEqual = (o1: any, o2: any) =>
  Object.keys(o1).length === Object.keys(o2).length && Object.keys(o1).every(p => o1[p] === o2[p]);
const arraysEqual = (a1: any, a2: any) =>
  a1.length === a2.length && a1.every((o: any, idx: number) => objectsEqual(o, a2[idx]));

Decimal.set({precision: 200, rounding: 0});
const deserializedData: {mantissa: Uint8Array; exponent: number}[] = [];

const BASE = 1e7;
const BYTES_MASK = 0b11111111;
const SIX_LSB_MASK = 0b00111111;
const NEG_SIGN_BIT = 0b10000000;
const NEG_EXPONENT_SIGN_BIT = 0b01000000;
const SMALL_INTEGER_BIT = NEG_EXPONENT_SIGN_BIT;
const ALL_NINES = BASE - 1;
const ALL_ZEROS = 0;
const NINES_SIGNIFIER = BASE + 1;
const ZEROS_SIGNIFIER = BASE;
const INFINITY_BYTE = 0b01111111;
const NEG_INFINITY_BYTE = 0b11111111;
const NAN_BYTE = 0b01000000;
const RADIX = BASE + 2;
const EXPONENT_OFFSET = 7;
const MAX_SMALL_EXPONENT = 30;
const MAX_SMALL_INTEGER = 50;
const MAX_SMALLER_INTEGER = 25;
const SMALL_INTEGER_OFFSET = -25 + 37; // [26, 50] -> [38, 62] -> [26, 50]
const SMALLER_INTEGER_OFFSET = 38; // [ 0, 25] -> [38, 63] -> [ 0, 25]

const isArrayBuffer = buffer =>
  buffer instanceof ArrayBuffer ||
  Object.prototype.toString.call(buffer) === '[object ArrayBuffer]';

function toArrayBuffer(decimal: Decimal) {
  let bytes;
  let firstByte;
  let exponent = decimal.e;
  const digits = decimal.d;
  const sign = decimal.s;
  const isSpecialValue = digits === null;

  if (isSpecialValue) {
    firstByte = isNaN(sign) ? NAN_BYTE : sign < 0 ? NEG_INFINITY_BYTE : INFINITY_BYTE;
    bytes = [firstByte];
  } else {
    const firstDigits = digits[0];

    const isSmallInteger =
      digits.length === 1 &&
      firstDigits <= MAX_SMALL_INTEGER &&
      exponent === (firstDigits < 10 ? 0 : 1);

    if (isSmallInteger) {
      if (firstDigits > MAX_SMALLER_INTEGER) {
        firstByte = firstDigits + SMALL_INTEGER_OFFSET;
        firstByte |= SMALL_INTEGER_BIT;
      } else {
        firstByte = (firstDigits + SMALLER_INTEGER_OFFSET) | 0;
      }

      if (sign < 0) firstByte |= NEG_SIGN_BIT;
      bytes = [firstByte];
    } else {
      firstByte = sign < 0 ? NEG_SIGN_BIT : 0;
      if (exponent < 0) {
        firstByte |= NEG_EXPONENT_SIGN_BIT;
        exponent = -exponent;
      }

      let exponentByteCount;
      if (exponent > MAX_SMALL_EXPONENT) {
        // `Math.floor(Math.log(0x1000000000000 - 1) / Math.log(256) + 1)` = 7
        exponentByteCount =
          exponent < 0x100
            ? 1
            : exponent < 0x10000
            ? 2
            : exponent < 0x1000000
            ? 3
            : exponent < 0x100000000
            ? 4
            : exponent < 0x10000000000
            ? 5
            : exponent < 0x1000000000000
            ? 6
            : 7;

        bytes = [firstByte | exponentByteCount];
        while (exponent) {
          bytes.push(exponent & BYTES_MASK);
          exponent = Math.floor(exponent / 0x100);
        }
      } else {
        if (exponent !== 0) {
          exponent += EXPONENT_OFFSET;
          firstByte |= exponent;
        }

        bytes = [firstByte];
        exponentByteCount = 0;
      }

      const startIndex = exponentByteCount + 1;
      bytes.push(0);

      for (let i = 0, mantissaLength = digits.length; i < mantissaLength; ) {
        let nextDigits = digits[i];

        const zerosOrNinesRepeatMoreThanTwice =
          (nextDigits === ALL_ZEROS || nextDigits === ALL_NINES) &&
          digits[i + 1] === nextDigits &&
          digits[i + 2] === nextDigits;

        if (zerosOrNinesRepeatMoreThanTwice) {
          let repeatCount = 3;
          while (digits[i + repeatCount] === nextDigits) repeatCount += 1;
          nextDigits = nextDigits === ALL_ZEROS ? ZEROS_SIGNIFIER : NINES_SIGNIFIER;
          convert(nextDigits, RADIX, bytes, 0x100, startIndex);
          nextDigits = repeatCount;
          i += repeatCount;
        } else {
          i += 1;
        }

        convert(nextDigits, RADIX, bytes, 0x100, startIndex);
      }
    }
  }

  return new Uint8Array(bytes);
}

function fromArrayBuffer(Decimal: Decimal, buffer: Uint8Array) {
  let digits;
  let exponent;
  let sign;

  const bytes = buffer;
  if (!bytes.length) return null;

  const firstByte = bytes[0];
  sign = firstByte & NEG_SIGN_BIT ? -1 : 1;
  const isSmallIntegerOrSpecialValue = bytes.length === 1;

  if (isSmallIntegerOrSpecialValue) {
    if (firstByte === NAN_BYTE || firstByte === INFINITY_BYTE || firstByte === NEG_INFINITY_BYTE) {
      digits = null;
      exponent = NaN;
      if (firstByte === NAN_BYTE) sign = NaN;
    } else {
      let integer = firstByte & SIX_LSB_MASK;
      if ((firstByte & SMALL_INTEGER_BIT) !== 0) {
        integer -= SMALL_INTEGER_OFFSET;
        digits = [integer];
      } else {
        integer -= SMALLER_INTEGER_OFFSET;
        digits = [integer];
      }
      exponent = integer < 10 ? 0 : 1;
    }
  } else {
    let indexOfLastMantissaByte = 1;
    exponent = firstByte & SIX_LSB_MASK;
    if (exponent > EXPONENT_OFFSET) {
      // [8, 37] => [1, 30]
      exponent -= EXPONENT_OFFSET;
    } else if (exponent !== 0) {
      const exponentByteCount = exponent;
      exponent = 0;
      for (let i = 0; i < exponentByteCount; ) {
        const leftShift = 0x100 ** i;
        exponent += bytes[++i] * leftShift;
      }

      indexOfLastMantissaByte += exponentByteCount;
    }

    if ((firstByte & NEG_EXPONENT_SIGN_BIT) !== 0) exponent = -exponent;

    const digitsInReverse = [0];
    for (let i = bytes.length, startIndex = 0; i > indexOfLastMantissaByte; ) {
      convert(bytes[--i], 0x100, digitsInReverse, RADIX, startIndex);
    }

    digits = [];
    for (let i = digitsInReverse.length; i; ) {
      const nextDigits = digitsInReverse[--i];
      if (nextDigits === ZEROS_SIGNIFIER) {
        for (let repeats = digitsInReverse[--i]; repeats--; digits.push(ALL_ZEROS));
      } else if (nextDigits === NINES_SIGNIFIER) {
        for (let repeats = digitsInReverse[--i]; repeats--; digits.push(ALL_NINES));
      } else {
        digits.push(nextDigits);
      }
    }
  }

  if (exponent > Decimal.maxE || exponent < Decimal.minE) {
    exponent = NaN;
    digits = null;
  }

  return Object.create(Decimal.prototype, {
    constructor: {value: Decimal},
    d: {value: digits},
    e: {value: exponent},
    s: {value: sign},
  });
}

function convert(val, valBase, res, resBase, ri) {
  for (let i = res.length; i > ri; ) res[--i] *= valBase;
  res[ri] += val;
  for (let i = ri; i < res.length; i++) {
    if (res[i] > resBase - 1) {
      if (res[i + 1] === undefined) res[i + 1] = 0;
      res[i + 1] += (res[i] / resBase) | 0;
      res[i] %= resBase;
    }
  }
}

interface ExtendedDecimal extends Decimal {
  toArrayBuffer: (d: Decimal) => Uint8Array;
  prototype: any;
}

((<unknown>Decimal) as ExtendedDecimal).prototype.toArrayBuffer = toArrayBuffer;

/* return different libraries in this function */
function serialize(mantissa: Uint8Array, exponent: number): string {
  return fromArrayBuffer(
    Decimal as any,
    new Uint8Array([exponent, ...Array.from(mantissa)])
  ).toString();
}

function deserialize(value: string): {mantissa: Uint8Array; exponent: number} {
  let decimal = new Decimal(value);
  return {mantissa: toArrayBuffer(decimal), exponent: 1};
}

const container: HTMLElement = document.createElement('div');
let input: HTMLInputElement;
performance.mark('perf-start');
for (let d = 0; d < data.length; d++) {
  input = document.createElement('input');
  const serialized = serialize(data[d].mantissa, data[d].exponent);
  const deserialized = deserialize(serialized);
  deserializedData.push(deserialized);
  input.value = serialized;
  container.appendChild(input);
}

const header = document.createElement('header');
const h1 = document.createElement('h1');
h1.innerText = arraysEqual(
  data.map(item => serialize(item.mantissa, item.exponent)),
  deserializedData.map(item => serialize(item.mantissa, item.exponent))
)
  ? 'Input and Output are Equal'
  : 'Failed';
console.log(
  data.map(item => serialize(item.mantissa, item.exponent)),
  deserializedData.map(item => serialize(item.mantissa, item.exponent))
);
console.log(data.map(item => item.exponent, 'exponent'));
console.log(data.map(item => item.mantissa, 'mantissa'));
header.appendChild(h1);
document.body.appendChild(header);
document.body.appendChild(container);
performance.mark('perf-stop');
performance.measure('perf', 'perf-start', 'perf-stop');
