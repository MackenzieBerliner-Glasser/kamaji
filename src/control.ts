import {Decimal} from 'decimal.js';
import {data} from './data-string';

Decimal.set({ precision: 200 })

/* return different libraries in this function */
function serialize(str: string): string {
	  return new Decimal(str).toString();
}

const container: HTMLElement = document.createElement('div');
let input: HTMLInputElement;
performance.mark('perf-start');
for (let d = 0; d < data.length; d++) {
  input = document.createElement('input');
  input.value = serialize(data[d]);
  container.appendChild(input);
}

document.body.appendChild(container);
performance.mark('perf-stop');
performance.measure('perf', 'perf-start', 'perf-stop');
