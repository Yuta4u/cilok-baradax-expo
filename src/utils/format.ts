const numberMask = (text: string) => {
  // Hanya ambil angka saja
  const numeric = text.replace(/[^0-9]/g, "");
  return numeric;
};

// const formatIDR = (value: string) => {
//   if (!value) return "";

//   return new Intl.NumberFormat("id-ID").format(Number(value));
// };

// Fungsi format Rupiah
export const formatRupiah = (value: string): string => {
  // Hapus semua karakter selain angka
  const angka = value.replace(/\D/g, "");
  if (!angka) return "";

  // Format dengan titik sebagai pemisah ribuan
  return "Rp " + angka.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Fungsi untuk mengambil nilai angka murni
export const parseRupiah = (formatted: string): number => {
  return parseInt(formatted.replace(/\D/g, ""), 10) || 0;
};

const formatIDR = (value: string): string => {
  // Hapus semua karakter selain angka
  const numbers = value.replace(/\D/g, "");

  // Format dengan pemisah ribuan titik
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export function formatIDRToNumber(str: string) {
  return Number(str.replace(/\./g, ""));
}

const onChangeFormatNumber = (value: string): string => {
  const sanitizedValue = value.replace(/[^0-9,]/g, "");

  const [integerPart, decimalPart] = sanitizedValue.split(",");

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return decimalPart !== undefined
    ? `${formattedInteger},${decimalPart}`
    : formattedInteger;
};

export { numberMask, formatIDR, onChangeFormatNumber };
