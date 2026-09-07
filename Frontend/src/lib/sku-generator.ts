
export function extractAbbreviation(name: string, maxLen = 3): string {
  if (!name || !name.trim()) return '';

  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    // If multiple words (e.g. "Running Shoes"), take initials (e.g. "RS")
    const initials = words.map((w) => w[0].toUpperCase()).join('');
    return initials.slice(0, maxLen);
  }

  // If single word (e.g. "Footwear"), take first letters without vowels if long
  if (clean.length <= maxLen) return clean.toUpperCase();

  const consonants = clean.replace(/[aeiouAEIOU]/g, '');
  if (consonants.length >= maxLen) {
    return consonants.slice(0, maxLen).toUpperCase();
  }

  return clean.slice(0, maxLen).toUpperCase();
}

export function generateMasterProductSku(
  name: string,
  categoryName?: string,
  subCategoryName?: string,
): string {
  const parts: string[] = [];

  // Category Code (e.g. Footwear -> FTW)
  if (categoryName) {
    parts.push(extractAbbreviation(categoryName, 3));
  }

  // Sub-Category Code (e.g. Running Shoes -> RUN)
  if (subCategoryName) {
    parts.push(extractAbbreviation(subCategoryName, 3));
  }

  // Product Style Name Acronym (e.g. Air Flow Velocity -> AFV)
  if (name) {
    parts.push(extractAbbreviation(name, 3));
  }

  // Year (e.g. 2026 -> 26)
  const currentYear = new Date().getFullYear().toString().slice(-2);
  parts.push(currentYear);

  return parts.filter(Boolean).join('-');
}

export function generateVariantSku(
  masterSku: string,
  colorName: string,
  gender: string,
  size: string,
): string {
  const prefix = (masterSku || 'SKU').trim().toUpperCase();
  const colorCode = extractAbbreviation(colorName, 3) || 'CLR';
  const genderCode = (gender?.[0] || 'U').toUpperCase();
  const cleanSize = (size || '00').trim().toUpperCase();

  return `${prefix}-${colorCode}-${genderCode}-${cleanSize}`;
}


export function generateWarehouseCode(name: string): string {
  if (!name.trim()) return 'WH';
  const abbr = extractAbbreviation(name, 3);
  return `WH-${abbr}`;
}


export function generateZoneCode(zoneName: string): string {
  if (!zoneName.trim()) return 'ZA';
  const abbr = extractAbbreviation(zoneName, 2);
  return `Z${abbr}`;
}


export function generateSubZoneCode(subZoneName: string): string {
  if (!subZoneName.trim()) return 'SZ1';
  const abbr = extractAbbreviation(subZoneName, 3);
  return `S${abbr}`;
}


export function generateRackCode(rackName: string): string {
  if (!rackName.trim()) return 'R01';
  const abbr = extractAbbreviation(rackName, 3);
  return `R${abbr}`;
}


export function generateLocationBarcode(
  warehouseCode?: string,
  zoneCode?: string,
  subZoneCode?: string,
  rackCode?: string,
): string {
  const parts = [
    warehouseCode || 'WH',
    zoneCode || 'ZA',
    subZoneCode || 'SZ',
    rackCode || 'R1',
  ];
  return parts.join('-');
}
