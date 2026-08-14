// ================================================================
// ProNamso v4.0 – Complete Generator + Pattern Analyzer + File Upload
// All tools are feasible; no simulations.
// ================================================================

// ---------- MUTABLE PATTERNS (initially from real data) ----------
let REAL_BINS = [
  '453600','453601','519123','453826','533985','453747','454033',
  '558490','453780','541590','453801','453737','464692','450003',
  '552612','451015','452088','453091','373378','371579','379432',
  '379859','371758','372545','373350','373311','450004','450005',
  '450008','450065','450550','450644','451212','451223','451401',
  '451405','451407','451409','451607','451902','452002','452034',
  '452085','452088','453085','453509','453510','453511','453700',
  '453706','453733','453734','453735','453738','453780','453801',
  '453803','453818','453825','453826','453827','453828','453831',
  '454031','454033','463572','463575','464691','464692','473702',
  '474476','488893','512888','513620','515598','516179','516566',
  '517344','518116','518127','519123','519181','519183','520593',
  '522303','522879','523465','525892','527854','533814','533985',
  '536088','541590','543440','543446','543997','544430','544612',
  '547511','549198','551029','552489','552612','557962','558490',
  '559994'
];

let MONTH_WEIGHTS = {
  '01':0.08,'02':0.07,'03':0.08,'04':0.08,'05':0.10,'06':0.08,
  '07':0.08,'08':0.10,'09':0.10,'10':0.10,'11':0.10,'12':0.10
};

// CVV ranges (used for validation and generation)
let CVV_RANGES = {
  '3digit': { min: 112, max: 998 },
  '4digit': { min: 1000, max: 9999 }
};

// Store original patterns for reset
const ORIGINAL_BINS = [...REAL_BINS];
const ORIGINAL_MONTH_WEIGHTS = { ...MONTH_WEIGHTS };
const ORIGINAL_CVV_RANGES = JSON.parse(JSON.stringify(CVV_RANGES));

// ---------- UTILITY FUNCTIONS ----------
function randomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function format(input, length, fillChar = '0', padding = 0) {
  let result = String(input);
  const len = Number(length);
  if (result.length < len) {
    if (padding === 0) result = fillChar.repeat(len - result.length) + result;
    else result = result + fillChar.repeat(len - result.length);
  }
  return result;
}

function deleteInvalidShits(input, invalidChars) {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (invalidChars.indexOf(ch) === -1) result += ch;
  }
  return result;
}

function randomSustitute(input, charsToReplace, replacementChars = '0123456789') {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (charsToReplace.indexOf(ch) === -1) result += ch;
    else result += replacementChars.charAt(Math.floor(Math.random() * replacementChars.length));
  }
  return result;
}

// ---------- BRAND DETECTION ----------
function getCardBrand(cardNumber) {
  const clean = deleteInvalidShits(cardNumber, ' -/abcdefghijklmnopqrstuvwyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const brands = [
    { pattern: /^4/, name: 'Visa' },
    { pattern: /^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01])/i, name: 'Mastercard' },
    { pattern: /^(6011|65|64[4-9]|622)/, name: 'Discover' },
    { pattern: /^(34|37)/, name: 'American Express' },
    { pattern: /^(30[0-5]|309|36|38|39)/, name: 'Diners Club' },
    { pattern: /^35(2[89]|[3-8][0-9])/, name: 'JCB' }
  ];
  for (let b of brands) {
    if (clean.match(b.pattern)) return b.name;
  }
  return 'Unknown';
}

// ---------- LUHN ----------
function isValidLuhn(cardNumber) {
  let sum = 0, alternate = false;
  const clean = deleteInvalidShits(cardNumber, ' -/');
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean[i], 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return (sum % 10) === 0;
}

// ---------- CVV VALIDATION ----------
function isValidCVV(cvv, brand) {
  const str = String(cvv).trim();
  if (brand === 'American Express') {
    return /^\d{4}$/.test(str) && parseInt(str) >= CVV_RANGES['4digit'].min && parseInt(str) <= CVV_RANGES['4digit'].max;
  } else {
    return /^\d{3}$/.test(str) && parseInt(str) >= CVV_RANGES['3digit'].min && parseInt(str) <= CVV_RANGES['3digit'].max;
  }
}

// ---------- GENERATE SINGLE CARD ----------
function generateSingleCard(bin, maxAttempts = 100) {
  const brand = getCardBrand(bin);
  let maxLen = 16;
  if (brand === 'American Express') maxLen = 15;
  else if (brand === 'Diners Club') maxLen = 14;
  const paddedBin = bin.padEnd(maxLen, 'x');
  let candidate, cleanNum;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    candidate = randomSustitute(paddedBin, 'x', '0123456789');
    cleanNum = deleteInvalidShits(candidate, ' -/');
    if (isValidLuhn(cleanNum)) {
      return { pan: cleanNum, brand: brand };
    }
  }
  return null;
}

function generateExpiry() {
  const currentYear = new Date().getFullYear();
  const offset = Math.random() < 0.8 ? randomNum(2,4) : randomNum(5,6);
  const year = currentYear + offset;
  // Weighted month
  const r = Math.random();
  let cum = 0;
  let month = '12';
  for (const [m, weight] of Object.entries(MONTH_WEIGHTS)) {
    cum += weight;
    if (r <= cum) { month = m; break; }
  }
  return { month, year };
}

function generateCVV(brand) {
  if (brand === 'American Express') {
    return String(randomNum(CVV_RANGES['4digit'].min, CVV_RANGES['4digit'].max));
  }
  return String(randomNum(CVV_RANGES['3digit'].min, CVV_RANGES['3digit'].max));
}

// ---------- MAIN GENERATOR (UI) ----------
function generateCards() {
  const output = document.getElementById('output2');
  const limit = Math.min(Math.max(parseInt(document.getElementById('ccghm').value) || 1, 1), 100);
  const usePool = document.getElementById('usePool').checked;
  let binInput = document.getElementById('ccpN').value.trim();

  if (usePool && (!binInput || binInput.replace(/x/gi,'').length < 4)) {
    binInput = weightedRandom(REAL_BINS);
    document.getElementById('ccpN').value = binInput.padEnd(16, 'x');
  }

  const cleanBin = deleteInvalidShits(binInput, ' -/xX');
  if (cleanBin.length < 4) {
    output.value = 'Error: enter a valid BIN (at least 4 digits).';
    return;
  }

  const sepIndex = document.getElementById('ccnsp').selectedIndex;
  const separator = sepIndex === 1 ? ' ' : (sepIndex === 2 ? '-' : '');
  const includeExp = document.getElementById('ccexpdat').checked;
  const includeCVV = document.getElementById('ccvi').checked;
  const includeBrand = document.getElementById('ccbank').checked;

  let result = '';
  for (let i = 0; i < limit; i++) {
    const card = generateSingleCard(cleanBin);
    if (!card) {
      result = 'Error: failed to generate valid card.';
      break;
    }

    let formatted = card.pan;
    if (separator) {
      if (card.brand === 'American Express') {
        formatted = card.pan.slice(0,4) + separator + card.pan.slice(4,10) + separator + card.pan.slice(10);
      } else {
        formatted = card.pan.slice(0,4) + separator + card.pan.slice(4,8) + separator + card.pan.slice(8,12) + separator + card.pan.slice(12);
      }
    }

    let line = formatted;
    if (includeExp) {
      const exp = generateExpiry();
      line += `|${exp.month}|${exp.year}`;
    }
    if (includeCVV) {
      line += `|${generateCVV(card.brand)}`;
    }
    if (includeBrand) {
      line += `|${card.brand}`;
    }
    result += line + '\n';
  }
  output.value = result;
}

// ================================================================
// PATTERN ANALYZER – same as before, but uses current MONTH_WEIGHTS and CVV_RANGES
// ================================================================

function analyzePatterns(cardData) {
  if (!cardData || cardData.length === 0) return 'No cards to analyze.';

  const stats = {
    total: cardData.length,
    brands: {},
    bins: {},
    months: {},
    years: {},
    cvvs: {},
    brandCVV: {}
  };

  let allCVVs = [];

  cardData.forEach(c => {
    const brand = getCardBrand(c.pan);
    const bin = c.pan.slice(0,6);
    stats.brands[brand] = (stats.brands[brand] || 0) + 1;
    stats.bins[bin] = (stats.bins[bin] || 0) + 1;
    stats.months[c.month] = (stats.months[c.month] || 0) + 1;
    stats.years[c.year] = (stats.years[c.year] || 0) + 1;
    const cvvNum = parseInt(c.cvv);
    if (!isNaN(cvvNum)) {
      allCVVs.push(cvvNum);
      stats.cvvs[c.cvv] = (stats.cvvs[c.cvv] || 0) + 1;
      if (!stats.brandCVV[brand]) stats.brandCVV[brand] = [];
      stats.brandCVV[brand].push(cvvNum);
    }
  });

  let output = `=== Pattern Analysis (${stats.total} cards) ===\n\n`;

  // Brands
  output += 'Brands:\n';
  for (const [b, count] of Object.entries(stats.brands).sort((a,b) => b[1]-a[1])) {
    output += `  ${b}: ${count} (${(count/stats.total*100).toFixed(1)}%)\n`;
  }

  // Top BINs
  output += '\nTop 10 BINs:\n';
  const topBins = Object.entries(stats.bins).sort((a,b) => b[1]-a[1]).slice(0,10);
  topBins.forEach(([bin, count]) => {
    output += `  ${bin}: ${count}\n`;
  });

  // Expiry months
  output += '\nExpiry Month Distribution:\n';
  for (const [m, count] of Object.entries(stats.months).sort()) {
    output += `  ${m}: ${count}\n`;
  }

  // Expiry years
  output += '\nExpiry Year Distribution:\n';
  for (const [y, count] of Object.entries(stats.years).sort()) {
    output += `  ${y}: ${count}\n`;
  }

  // CVV statistics per brand
  output += '\nCVV Statistics (per brand):\n';
  for (const [brand, cvvs] of Object.entries(stats.brandCVV)) {
    if (cvvs.length === 0) continue;
    const sorted = cvvs.slice().sort((a,b) => a-b);
    const min = sorted[0];
    const max = sorted[sorted.length-1];
    const sum = sorted.reduce((a,b) => a+b, 0);
    const avg = sum / sorted.length;
    const median = sorted[Math.floor(sorted.length/2)];
    const validCount = cvvs.filter(v => isValidCVV(v, brand)).length;
    output += `  ${brand} (n=${cvvs.length}):\n`;
    output += `    Min: ${min}, Max: ${max}, Avg: ${avg.toFixed(1)}, Median: ${median}\n`;
    output += `    Valid format: ${validCount}/${cvvs.length} (${(validCount/cvvs.length*100).toFixed(1)}%)\n`;
  }

  // Correlation (last4 PAN vs CVV)
  const pairs = cardData.map(c => {
    const last4 = parseInt(c.pan.slice(-4));
    const cvv = parseInt(c.cvv);
    if (!isNaN(last4) && !isNaN(cvv)) return {last4, cvv};
    return null;
  }).filter(p => p !== null);

  if (pairs.length > 10) {
    const meanX = pairs.reduce((s,p) => s + p.last4, 0) / pairs.length;
    const meanY = pairs.reduce((s,p) => s + p.cvv, 0) / pairs.length;
    let num = 0, denX = 0, denY = 0;
    for (const p of pairs) {
      num += (p.last4 - meanX) * (p.cvv - meanY);
      denX += (p.last4 - meanX) ** 2;
      denY += (p.cvv - meanY) ** 2;
    }
    if (denX > 0 && denY > 0) {
      const corr = num / (Math.sqrt(denX) * Math.sqrt(denY));
      output += `\nCorrelation (last4 PAN vs CVV): ${corr.toFixed(4)} (${Math.abs(corr) < 0.1 ? 'no' : 'possible'} linear relationship)\n`;
    }
  }

  return output;
}

// ---------- PARSE CARD DATA FROM TEXT ----------
function parseCardData(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const cards = [];
  for (const line of lines) {
    let parts = line.split(/[|\t,;]+/).map(s => s.trim());
    if (parts.length < 3) continue;
    let pan = parts[0];
    let cvv = parts[parts.length-1];
    let month, year;
    let expPart = parts.slice(1, parts.length-1).join('');
    const expMatch = expPart.match(/(\d{2})[\/\-]?(\d{2})/);
    if (expMatch) {
      month = expMatch[1];
      year = expMatch[2];
    } else {
      month = parts[1];
      year = parts[2];
    }
    if (pan && month && year && cvv) {
      cards.push({ pan, month, year, cvv });
    }
  }
  return cards;
}

// ---------- UI: Analyze from textarea ----------
function runAnalysis() {
  const input = document.getElementById('analyzeInput').value;
  const cards = parseCardData(input);
  if (cards.length === 0) {
    document.getElementById('analyzeOutput').value = 'No valid card entries found. Use format: PAN|MM/YY|CVV';
    return;
  }
  const result = analyzePatterns(cards);
  document.getElementById('analyzeOutput').value = result;
  // Store the parsed cards for later learning
  window._lastAnalyzedCards = cards;
}

// ---------- UI: Analyze from uploaded file ----------
function handleFileUpload(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const cards = parseCardData(text);
    if (cards.length === 0) {
      document.getElementById('analyzeOutput').value = 'No valid cards found in file.';
      return;
    }
    const result = analyzePatterns(cards);
    document.getElementById('analyzeOutput').value = result;
    window._lastAnalyzedCards = cards;
    // Enable the "Apply patterns" button
    document.getElementById('applyPatternsBtn').disabled = false;
  };
  reader.readAsText(file);
}

// ---------- APPLY DISCOVERED PATTERNS ----------
function applyDiscoveredPatterns() {
  const cards = window._lastAnalyzedCards;
  if (!cards || cards.length === 0) {
    alert('No analyzed data to apply. Upload or paste cards first.');
    return;
  }

  // 1. Update BIN pool: add new BINs (6-digit) from the data
  const newBins = new Set();
  cards.forEach(c => {
    const bin = c.pan.slice(0,6);
    if (bin.length === 6) newBins.add(bin);
  });
  let mergedBins = [...REAL_BINS];
  newBins.forEach(bin => {
    if (!mergedBins.includes(bin)) mergedBins.push(bin);
  });
  REAL_BINS = mergedBins;

  // 2. Update month weights based on observed frequencies
  const monthCounts = {};
  let totalMonths = 0;
  cards.forEach(c => {
    monthCounts[c.month] = (monthCounts[c.month] || 0) + 1;
    totalMonths++;
  });
  if (totalMonths > 0) {
    const newWeights = {};
    for (const [m, count] of Object.entries(monthCounts)) {
      newWeights[m] = count / totalMonths;
    }
    // Ensure all months have at least a small weight (avoid zero)
    for (let i=1; i<=12; i++) {
      const m = String(i).padStart(2,'0');
      if (!newWeights[m]) newWeights[m] = 0.01;
    }
    // Normalize
    const sum = Object.values(newWeights).reduce((a,b) => a+b, 0);
    for (const m of Object.keys(newWeights)) {
      newWeights[m] /= sum;
    }
    MONTH_WEIGHTS = newWeights;
  }

  // 3. Update CVV ranges from observed extremes (per brand)
  // We'll compute global min/max for 3-digit and 4-digit
  let min3 = Infinity, max3 = -Infinity;
  let min4 = Infinity, max4 = -Infinity;
  cards.forEach(c => {
    const brand = getCardBrand(c.pan);
    const cvv = parseInt(c.cvv);
    if (isNaN(cvv)) return;
    if (brand === 'American Express') {
      if (cvv < min4) min4 = cvv;
      if (cvv > max4) max4 = cvv;
    } else {
      if (cvv < min3) min3 = cvv;
      if (cvv > max3) max3 = cvv;
    }
  });
  if (min3 !== Infinity) CVV_RANGES['3digit'].min = Math.min(CVV_RANGES['3digit'].min, min3);
  if (max3 !== -Infinity) CVV_RANGES['3digit'].max = Math.max(CVV_RANGES['3digit'].max, max3);
  if (min4 !== Infinity) CVV_RANGES['4digit'].min = Math.min(CVV_RANGES['4digit'].min, min4);
  if (max4 !== -Infinity) CVV_RANGES['4digit'].max = Math.max(CVV_RANGES['4digit'].max, max4);

  // Notify user
  document.getElementById('analyzeOutput').value += '\n\n✅ Patterns applied! BIN pool, month weights, and CVV ranges updated.';
  document.getElementById('applyPatternsBtn').disabled = true;
}

// ---------- RESET PATTERNS ----------
function resetPatterns() {
  REAL_BINS = [...ORIGINAL_BINS];
  MONTH_WEIGHTS = { ...ORIGINAL_MONTH_WEIGHTS };
  CVV_RANGES = JSON.parse(JSON.stringify(ORIGINAL_CVV_RANGES));
  document.getElementById('analyzeOutput').value += '\n\n🔄 Reset to original patterns.';
  document.getElementById('applyPatternsBtn').disabled = true;
}

// ================================================================
// UI INITIALISATION
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
  // Generator buttons
  document.getElementById('generar').addEventListener('click', generateCards);
  document.getElementById('cleanText').addEventListener('click', function() {
    document.getElementById('output2').value = '';
  });

  // Analysis from textarea
  document.getElementById('analyzeBtn').addEventListener('click', runAnalysis);

  // Apply patterns button
  document.getElementById('applyPatternsBtn').addEventListener('click', applyDiscoveredPatterns);

  // Reset button
  document.getElementById('resetPatternsBtn').addEventListener('click', resetPatterns);

  // File upload handling
  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', function(e) {
    if (this.files.length > 0) {
      handleFileUpload(this.files[0]);
    }
  });

  // Drag and drop support
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#007bff';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '#ccc';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#ccc';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        handleFileUpload(files[0]);
      }
    });
  }

  // Populate BIN dropdown
  const select = document.getElementById('binSelect');
  if (select) {
    REAL_BINS.forEach(bin => {
      const opt = document.createElement('option');
      opt.value = bin;
      opt.textContent = bin;
      select.appendChild(opt);
    });
    select.addEventListener('change', function() {
      const binInput = document.getElementById('ccpN');
      if (this.value) {
        const brand = getCardBrand(this.value);
        let maxLen = 16;
        if (brand === 'American Express') maxLen = 15;
        else if (brand === 'Diners Club') maxLen = 14;
        binInput.value = this.value.padEnd(maxLen, 'x');
        if (typeof addXToBin === 'function') addXToBin();
      }
    });
  }
});
