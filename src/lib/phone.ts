export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function maskPhone(value: string) {
  const d = digitsOnly(value).slice(0, 13);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
