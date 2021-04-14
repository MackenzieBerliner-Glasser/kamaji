
const byteToHex: string[] = [];

for (let n = 0; n <= 0xff; ++n) {
  let hexOctet = n.toString(16);
  if (hexOctet.length < 2) hexOctet = '0' + hexOctet;
  byteToHex.push(hexOctet);
}

export function customHex(buff: Uint8Array) {
  let hex = '';
  for (let h = 0; h < buff.length; ++h) hex += byteToHex[buff[h]];
  return hex;
}