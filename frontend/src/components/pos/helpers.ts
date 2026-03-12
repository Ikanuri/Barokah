// Helper function to format number with thousand separator
export const formatNumberInput = (value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper function to parse formatted number back to string
export const parseFormattedNumber = (value: string): string => {
  return value.replace(/\./g, '');
};

// Normalize Indonesian number words to digits
export const normalizeNumbers = (text: string): string => {
  const numberMap: { [key: string]: string } = {
    'nol': '0', 'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4',
    'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9',
    'sepuluh': '10', 'sebelas': '11', 'duabelas': '12', 'tigabelas': '13',
    'empatbelas': '14', 'limabelas': '15', 'enambelas': '16', 'tujuhbelas': '17',
    'delapanbelas': '18', 'sembilanbelas': '19', 'duapuluh': '20',
    'tigapuluh': '30', 'empatpuluh': '40', 'limapuluh': '50',
    'seratus': '100', 'seribu': '1000'
  };

  let normalized = text.toLowerCase();
  for (const [word, digit] of Object.entries(numberMap)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, digit);
  }
  return normalized;
};

// Normalize unit synonyms to standard units
export const normalizeUnit = (unit: string | null): string | null => {
  if (!unit) return null;

  const unitMap: { [key: string]: string } = {
    'kardus': 'dus', 'karton': 'dus', 'box': 'dus',
    'btl': 'botol', 'bottle': 'botol',
    'pc': 'pcs', 'piece': 'pcs', 'pieces': 'pcs',
    'bh': 'biji', 'buah': 'biji',
    'paket': 'pak', 'package': 'pak',
    'can': 'kaleng', 'tin': 'kaleng'
  };

  const lowerUnit = unit.toLowerCase();
  return unitMap[lowerUnit] || lowerUnit;
};

// Calculate string similarity using Levenshtein distance
export const stringSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : 1 - (costs[s2.length] / maxLength);
};

// Parse smart query: "mie sedap 5 biji" -> product: "mie sedap", qty: 5, unit: "biji"
export const parseSmartQuery = (query: string) => {
  const normalizedQuery = normalizeNumbers(query.trim());

  const patterns = [
    /^(.+?)\s+(\d+)\s+([a-zA-Z]+)$/i,
    /^(\d+)\s+([a-zA-Z]+)\s+(.+)$/i,
    /^(.+?)\s+(\d+)$/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      if (pattern.source.includes('\\s+([a-zA-Z]+)\\s+(.+)$')) {
        return {
          productName: match[3].trim(),
          quantity: parseInt(match[1]),
          unit: normalizeUnit(match[2]),
        };
      } else if (pattern.source.includes('\\s+([a-zA-Z]+)$')) {
        const rawUnit = match[3];
        const normalized = normalizeUnit(rawUnit);
        return {
          productName: match[1].trim(),
          quantity: parseInt(match[2]),
          unit: normalized || rawUnit.toLowerCase(),
        };
      } else {
        return {
          productName: match[1].trim(),
          quantity: parseInt(match[2]),
          unit: null,
        };
      }
    }
  }

  return {
    productName: normalizedQuery.trim(),
    quantity: 1,
    unit: null,
  };
};
