import {Decimal} from 'decimal.js';
import {data} from './data';
import {customHex} from './vendor';

Decimal.set({ precision: 200 })

/* return different libraries in this function */
function serialize(mantissa: bigint | undefined, exponent: number): string {
    if (!mantissa) return 'null';
    return new Decimal(`${mantissa}e${exponent}`).toString()
}

const container: HTMLElement = document.createElement('div');
let input: HTMLInputElement;
performance.mark('perf-start');
for (let d = 0; d < data.length; d++) {
  data[d].bigInt = BigInt('0x' + customHex(data[d].mantissa));
  input = document.createElement('input');
  input.value = serialize(data[d].bigInt, data[d].exponent);
  container.appendChild(input);
}

document.body.appendChild(container);
performance.mark('perf-stop');
performance.measure('perf', 'perf-start', 'perf-stop');
