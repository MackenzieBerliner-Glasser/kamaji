const data: {mantissa: Uint8Array; exponent: number; bigInt?: bigint | undefined}[] = [];
let i = 1;
for (i = 1; i < 30; i++) {
  data.push({
    mantissa: new Uint8Array([255, 255]),
    exponent: -i,
  });
}
i = 0;
for (i = 1; i < 30; i++) {
  data.push({
    mantissa: new Uint8Array([255, 255]),
    exponent: i,
  });
}
// i = 0;
// for (i = 1; i < 255; i++) {
//   data.push({
//     mantissa: new Uint8Array([255, 255]),
//     exponent: -i,
//   });
// }
// i = 0;
// for (i = 1; i < 255; i++) {
//   data.push({
//     mantissa: new Uint8Array([255, 255]),
//     exponent: i,
//   });
// }
export {data};
