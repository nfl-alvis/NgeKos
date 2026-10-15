/**
 * Implementasi Algoritma Luhn (Modulus 10 / Luhn Formula)
 *
 * Algoritma Luhn adalah rumus checksum sederhana yang digunakan untuk
 * memvalidasi berbagai nomor identifikasi numerik (nomor kartu kredit/debit,
 * nomor rekening, IMEI, dsb.) guna mendeteksi kesalahan ketik input
 * (single-digit errors dan transposition errors).
 */

/**
 * Memvalidasi apakah string angka memenuhi checksum Algoritma Luhn (Mod 10).
 *
 * @param input String nomor rekening atau nomor kartu (karakter non-digit otomatis diabaikan).
 * @returns boolean true jika checksum Luhn valid, false jika tidak valid.
 */
export function isValidLuhn(input: string): boolean {
  if (!input) return false;

  const digits = input.replace(/\D/g, "");
  // Nomor rekening / kartu umumnya memiliki minimal 2 digit
  if (digits.length < 2) return false;

  let sum = 0;
  let shouldDouble = false;

  // Iterasi digit dari paling kanan (posisi digit terakhir) ke kiri
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Menghitung check digit (digit terakhir) Algoritma Luhn untuk serangkaian angka.
 *
 * @param payloadWithoutCheckDigit String digit tanpa check digit terakhir.
 * @returns number Digit 0-9 yang membuat seluruh nomor menjadi valid menurut Luhn.
 */
export function calculateLuhnCheckDigit(payloadWithoutCheckDigit: string): number {
  const digits = payloadWithoutCheckDigit.replace(/\D/g, "");
  let sum = 0;
  let shouldDouble = true; // Digit berikutnya dari kanan akan digandakan

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}
