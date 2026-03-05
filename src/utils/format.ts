const numberMask = (text: string) => {
  // Hanya ambil angka saja
  const numeric = text.replace(/[^0-9]/g, "");
  return numeric;
};

const formatIDR = (value: string) => {
  if (!value) return "";

  return new Intl.NumberFormat("id-ID").format(Number(value));
};

export { numberMask, formatIDR };
