const SETTINGS_KEY = 'pereplet_settings_v2';

const defaultSettings = {
  removeIndent: true,
  cleanEmpty: true,
  spacing: 0.85,
  fixDashes: true,
  fixTypo: false,
  fixDarkMode: true,
  stripMedia: true,
  insertDescPage: true,
  kindlePages: true,
  fontMode: 'keep',
  alignMode: 'keep'
};

const appState = {
  books: [],
  activeIndex: 0,
  settings: loadSettings(),
  customFont: null // { name, ext, mime, buffer }
};

const els = {
  dropZone: document.getElementById('dropZone'),
  workspace: document.getElementById('workspace'),
  fileInput: document.getElementById('fileInput'),
  selectFileBtn: document.getElementById('selectFileBtn'),
  addMoreBtn: document.getElementById('addMoreBtn'),
  resetBtn: document.getElementById('resetBtn'),
  queuePanel: document.getElementById('queuePanel'),
  queueTitle: document.getElementById('queueTitle'),
  bookTabs: document.getElementById('bookTabs'),
  formatBadge: document.getElementById('formatBadge'),
  coverImg: document.getElementById('coverImg'),
  coverPlaceholder: document.querySelector('.cover-placeholder'),
  coverInput: document.getElementById('coverInput'),
  changeCoverBtn: document.getElementById('changeCoverBtn'),
  removeCoverBtn: document.getElementById('removeCoverBtn'),
  titleInput: document.getElementById('titleInput'),
  authorInput: document.getElementById('authorInput'),
  seriesInput: document.getElementById('seriesInput'),
  seriesIndexInput: document.getElementById('seriesIndexInput'),
  descInput: document.getElementById('descInput'),
  findDescBtn: document.getElementById('findDescBtn'),
  translateDescBtn: document.getElementById('translateDescBtn'),
  insertDescPageToggle: document.getElementById('insertDescPageToggle'),
  statChapters: document.getElementById('statChapters'),
  statParagraphs: document.getElementById('statParagraphs'),
  statImages: document.getElementById('statImages'),
  statMedia: document.getElementById('statMedia'),
  removeIndentToggle: document.getElementById('removeIndentToggle'),
  cleanEmptyToggle: document.getElementById('cleanEmptyToggle'),
  spacingRange: document.getElementById('spacingRange'),
  spacingVal: document.getElementById('spacingVal'),
  fixDashesToggle: document.getElementById('fixDashesToggle'),
  dashCountPill: document.getElementById('dashCountPill'),
  fixTypoToggle: document.getElementById('fixTypoToggle'),
  typoCountPill: document.getElementById('typoCountPill'),
  fixDarkModeToggle: document.getElementById('fixDarkModeToggle'),
  stripMediaToggle: document.getElementById('stripMediaToggle'),
  kindlePagesToggle: document.getElementById('kindlePagesToggle'),
  kindlePagesPill: document.getElementById('kindlePagesPill'),
  mediaCountPill: document.getElementById('mediaCountPill'),
  fontSelect: document.getElementById('fontSelect'),
  alignSelect: document.getElementById('alignSelect'),
  customFontRow: document.getElementById('customFontRow'),
  fontFileInput: document.getElementById('fontFileInput'),
  selectFontFileBtn: document.getElementById('selectFontFileBtn'),
  fontFileName: document.getElementById('fontFileName'),
  marginLine: document.getElementById('marginLine'),
  livePreview: document.getElementById('livePreview'),
  chaptersToolbar: document.getElementById('chaptersToolbar'),
  deletedChaptersCount: document.getElementById('deletedChaptersCount'),
  markSuspectChaptersBtn: document.getElementById('markSuspectChaptersBtn'),
  keepAllChaptersBtn: document.getElementById('keepAllChaptersBtn'),
  chaptersList: document.getElementById('chaptersList'),
  imagesToolbar: document.getElementById('imagesToolbar'),
  selectedCount: document.getElementById('selectedCount'),
  selectAllImgsBtn: document.getElementById('selectAllImgsBtn'),
  keepAllImgsBtn: document.getElementById('keepAllImgsBtn'),
  emptyImagesState: document.getElementById('emptyImagesState'),
  imagesGrid: document.getElementById('imagesGrid'),
  statusText: document.getElementById('statusText'),
  exportBtn: document.getElementById('exportBtn'),
  exportAllBtn: document.getElementById('exportAllBtn')
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return { ...defaultSettings, ...(saved || {}) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appState.settings));
  } catch {}
}

function activeBook() {
  return appState.books[appState.activeIndex] || null;
}

// Утилиты
function resolveZipPath(baseDir, relativeHref) {
  if (!relativeHref) return '';
  const cleanHref = decodeURIComponent(relativeHref.split('#')[0]);
  if (cleanHref.startsWith('/')) return cleanHref.slice(1);
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
  for (const part of cleanHref.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' КБ';
  return (bytes / 1048576).toFixed(1) + ' МБ';
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanLeadingSpaces(text) {
  return text.replace(/^[\s\u00A0\u2000-\u200B\u3000]+/, '');
}

function isParagraphEmpty(el) {
  if (el.querySelector && el.querySelector('img, svg, image, hr')) return false;
  const txt = (el.textContent || '').replace(/[\s\u00A0\u200B]+/g, '');
  return txt.length === 0;
}

// Умная замена дефисов на длинное тире (—)
// Не трогает уже стоящие длинные тире (—) и дефисы внутри слов (кто-то, по-моему)
function applyDashFix(text, isStartOfParagraph = false) {
  let out = text;
  let hits = 0;

  if (isStartOfParagraph) {
    out = out.replace(/^(\s*)(?:--|-|–)(\s+)/, (m, s1, s2) => {
      hits++;
      return s1 + '—' + s2;
    });
  }
  out = out.replace(/(\s)(?:--|-|–)(\s)/g, (m, s1, s2) => {
    hits++;
    return s1 + '—' + s2;
  });
  out = out.replace(/--/g, () => {
    hits++;
    return '—';
  });

  return { text: out, hits };
}

function applyTypoFix(text) {
  let hits = 0;
  let out = text.replace(/\.{3}/g, () => {
    hits++;
    return '…';
  });
  out = out.replace(/[ \t]{2,}/g, () => {
    hits++;
    return ' ';
  });
  return { text: out, hits };
}

// Безопасная эвристика рекламы/мусора переводчиков (НИКОГДА не удаляет сама, только ставит метку)
const AD_KEYWORDS = [
  'реклам', 'об авторе', 'от переводчика', 'примечания переводчика',
  'поддержать перевод', 'подписаться', 'telegram', 't.me/', 'vk.com',
  'boosty', 'patreon', 'донат', 'благодарност', 'читайте также',
  'другие книги', 'книги автора', 'оглавление', 'содержание', 'аннотация'
];

function detectSuspectChapter(title, text) {
  const cleanText = (text || '').trim();
  const lowerAll = (title + ' ' + cleanText.slice(0, 800)).toLowerCase();
  const charCount = cleanText.length;

  // Длинные сюжетные главы (> 5000 символов) никогда не помечаем как рекламу
  if (charCount > 5000) return false;

  const hasKeyword = AD_KEYWORDS.some(k => lowerAll.includes(k));
  const hasUrl = /https?:\/\/|t\.me\/|@[a-z0-9_]{4,}/i.test(cleanText);

  if (hasUrl && charCount < 2500) return true;
  if (hasKeyword && charCount < 3500) return true;
  return false;
}

function isAudioOrVideo(mediaType, path) {
  const m = (mediaType || '').toLowerCase();
  const p = (path || '').toLowerCase();
  if (m.startsWith('audio/') || m.startsWith('video/')) return true;
  return /\.(mp3|m4a|ogg|wav|aac|flac|mp4|webm|mov|avi)$/.test(p);
}

function revokeBookUrls(book) {
  if (book.cover && book.cover.url) URL.revokeObjectURL(book.cover.url);
  book.images.forEach(img => { if (img.url) URL.revokeObjectURL(img.url); });
}

// Загрузка файлов (поддержка нескольких книг сразу)
els.selectFileBtn.addEventListener('click', () => els.fileInput.click());
els.addMoreBtn.addEventListener('click', () => els.fileInput.click());

els.fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (!files.length) return;

  els.statusText.textContent = `Читаем файлы (${files.length})...`;
  const startLen = appState.books.length;

  for (const file of files) {
    try {
      const book = await parseAnyBookFile(file);
      if (book) appState.books.push(book);
    } catch (err) {
      console.error(err);
      alert(`Не удалось прочитать «${file.name}»: ${err.message}`);
    }
  }

  if (appState.books.length > 0) {
    if (startLen === 0) appState.activeIndex = 0;
    else appState.activeIndex = appState.books.length - 1;
    renderAll();
  }
});

els.resetBtn.addEventListener('click', () => {
  appState.books.forEach(revokeBookUrls);
  appState.books = [];
  appState.activeIndex = 0;
  els.workspace.classList.add('hidden');
  els.resetBtn.classList.add('hidden');
  els.addMoreBtn.classList.add('hidden');
  els.dropZone.classList.remove('hidden');
});

async function parseAnyBookFile(file) {
  const lower = file.name.toLowerCase();
  const originalName = file.name.replace(/\.(epub|fb2\.zip|fb2|txt)$/i, '');

  if (lower.endsWith('.epub')) return await parseEpubFile(file, originalName);
  if (lower.endsWith('.fb2') || lower.endsWith('.fb2.zip')) return await parseFb2File(file, originalName);
  if (lower.endsWith('.txt')) return await parseTxtFile(file, originalName);
  throw new Error('Формат не поддерживается (нужен EPUB, FB2 или TXT)');
}

async function parseEpubFile(file, originalName) {
  const zip = await JSZip.loadAsync(file);
  const parser = new DOMParser();

  const containerEntry = zip.file('META-INF/container.xml');
  if (!containerEntry) throw new Error('Не найден META-INF/container.xml');
  const containerDoc = parser.parseFromString(await containerEntry.async('string'), 'application/xml');
  const opfPath = containerDoc.querySelector('rootfile').getAttribute('full-path');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  const opfDoc = parser.parseFromString(await zip.file(opfPath).async('string'), 'application/xml');

  const titleNode = opfDoc.getElementsByTagNameNS('*', 'title')[0];
  const creatorNode = opfDoc.getElementsByTagNameNS('*', 'creator')[0];
  const descNode = opfDoc.getElementsByTagNameNS('*', 'description')[0];
  const cleanExistingDesc = descNode ? descNode.textContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  let series = '';
  let seriesIndex = '';
  const metas = Array.from(opfDoc.getElementsByTagNameNS('*', 'meta'));
  let coverId = null;

  for (const m of metas) {
    const name = m.getAttribute('name');
    const prop = m.getAttribute('property');
    if (name === 'cover' && m.getAttribute('content')) coverId = m.getAttribute('content');
    if (name === 'calibre:series') series = m.getAttribute('content') || '';
    if (name === 'calibre:series_index') seriesIndex = m.getAttribute('content') || '';
    if (prop === 'belongs-to-collection' && !series) series = (m.textContent || '').trim();
    if (prop === 'group-position' && !seriesIndex) seriesIndex = (m.textContent || '').trim();
  }

  const manifestItems = Array.from(opfDoc.getElementsByTagNameNS('*', 'item'));
  const itemById = new Map();
  manifestItems.forEach(it => itemById.set(it.getAttribute('id'), it));

  let coverItem = manifestItems.find(it => {
    const props = it.getAttribute('properties') || '';
    return props.split(/\s+/).includes('cover-image') || (coverId && it.getAttribute('id') === coverId);
  });
  if (!coverItem) {
    coverItem = manifestItems.find(it => {
      const media = it.getAttribute('media-type') || '';
      const id = (it.getAttribute('id') || '').toLowerCase();
      const href = (it.getAttribute('href') || '').toLowerCase();
      return media.startsWith('image/') && (id.includes('cover') || href.includes('cover'));
    });
  }
  const coverZipPath = coverItem ? resolveZipPath(opfDir, coverItem.getAttribute('href')) : null;

  const book = {
    id: Math.random().toString(36).slice(2),
    mode: 'epub',
    formatLabel: 'EPUB',
    originalName,
    zip,
    opfPath,
    opfDir,
    title: titleNode ? titleNode.textContent.trim() : originalName,
    author: creatorNode ? creatorNode.textContent.trim() : '',
    series,
    seriesIndex,
    description: cleanExistingDesc,
    cover: null,
    images: [],
    mediaFiles: [], // { id, path, size }
    chapters: [],   // { id, path, title, snippet, charCount, suspect, markedDelete }
    sampleParagraphs: [],
    totalParagraphs: 0,
    dashHits: 0,
    typoHits: 0
  };

  // Сбор картинок и вшитого аудио/видео (включая файлы вне manifest!)
  const seenMediaPaths = new Set();

  for (const item of manifestItems) {
    const media = item.getAttribute('media-type') || '';
    const href = item.getAttribute('href') || '';
    const fullPath = resolveZipPath(opfDir, href);
    const zipEntry = zip.file(fullPath);
    if (!zipEntry) continue;

    if (isAudioOrVideo(media, fullPath)) {
      const u8 = await zipEntry.async('uint8array');
      book.mediaFiles.push({ id: item.getAttribute('id'), path: fullPath, size: u8.byteLength });
      seenMediaPaths.add(fullPath);
    } else if (media.startsWith('image/')) {
      const blob = await zipEntry.async('blob');
      const url = URL.createObjectURL(blob);
      if (fullPath === coverZipPath) {
        book.cover = { blob, mime: media, url, originalPath: fullPath, id: item.getAttribute('id'), changed: false, removed: false };
      } else {
        book.images.push({
          id: item.getAttribute('id'),
          path: fullPath,
          name: fullPath.split('/').pop(),
          size: blob.size,
          mime: media,
          blob,
          url,
          markedDelete: false
        });
      }
    }
  }

  // На случай, если MP3 лежат в архиве без записи в manifest
  for (const p of Object.keys(zip.files)) {
    if (zip.files[p].dir || seenMediaPaths.has(p)) continue;
    if (isAudioOrVideo('', p)) {
      const u8 = await zip.file(p).async('uint8array');
      book.mediaFiles.push({ id: null, path: p, size: u8.byteLength });
      seenMediaPaths.add(p);
    }
  }

  // Читаем главы строго в порядке spine
  const spineRefs = Array.from(opfDoc.getElementsByTagNameNS('*', 'itemref'));
  let chIndex = 0;

  for (const ref of spineRefs) {
    const idref = ref.getAttribute('idref');
    const item = itemById.get(idref);
    if (!item) continue;
    const fullPath = resolveZipPath(opfDir, item.getAttribute('href'));
    const entry = zip.file(fullPath);
    if (!entry) continue;

    chIndex++;
    const raw = await entry.async('string');
    const doc = parser.parseFromString(raw, 'text/html');

    const heading = doc.querySelector('h1, h2, h3, title');
    const chTitle = (heading && heading.textContent.trim()) || `Раздел ${chIndex}`;
    const bodyText = (doc.body ? doc.body.textContent : '').replace(/\s+/g, ' ').trim();
    const snippet = bodyText.slice(0, 110);

    book.chapters.push({
      id: idref,
      path: fullPath,
      title: chTitle,
      snippet,
      charCount: bodyText.length,
      suspect: detectSuspectChapter(chTitle, bodyText),
      markedDelete: false
    });

    const ps = Array.from(doc.querySelectorAll('p'));
    for (const p of ps) {
      const rawText = p.textContent || '';
      if (rawText.trim().length > 0) {
        book.totalParagraphs++;
        book.dashHits += applyDashFix(rawText, true).hits;
        book.typoHits += applyTypoFix(rawText).hits;
        if (book.sampleParagraphs.length < 5 && rawText.trim().length > 40) {
          book.sampleParagraphs.push(rawText);
        }
      }
    }
  }

  return book;
}

async function parseFb2File(file, originalName) {
  let buffer = await file.arrayBuffer();
  if (file.name.toLowerCase().endsWith('.zip')) {
    const z = await JSZip.loadAsync(buffer);
    const fb2Entry = Object.values(z.files).find(f => !f.dir && f.name.toLowerCase().endsWith('.fb2'));
    if (!fb2Entry) throw new Error('В архиве не найден файл FB2');
    buffer = await fb2Entry.async('arraybuffer');
  }

  const headAscii = new TextDecoder('ascii').decode(buffer.slice(0, 260));
  const encMatch = headAscii.match(/encoding=["']([^"']+)["']/i);
  const encoding = encMatch ? encMatch[1].toLowerCase() : 'utf-8';
  const xmlText = new TextDecoder(encoding === 'windows-1251' ? 'windows-1251' : 'utf-8').decode(buffer);

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const bookTitle = doc.querySelector('title-info > book-title');
  const firstName = doc.querySelector('title-info > author > first-name')?.textContent || '';
  const lastName = doc.querySelector('title-info > author > last-name')?.textContent || '';
  const seqNode = doc.querySelector('title-info > sequence');
  const annotNode = doc.querySelector('title-info > annotation');
  const fb2Desc = annotNode ? annotNode.textContent.replace(/\s+/g, ' ').trim() : '';

  const book = {
    id: Math.random().toString(36).slice(2),
    mode: 'converted',
    formatLabel: 'FB2 → EPUB',
    originalName,
    title: bookTitle ? bookTitle.textContent.trim() : originalName,
    author: `${firstName} ${lastName}`.trim(),
    series: seqNode ? (seqNode.getAttribute('name') || '') : '',
    seriesIndex: seqNode ? (seqNode.getAttribute('number') || '') : '',
    description: fb2Desc,
    cover: null,
    images: [],
    mediaFiles: [],
    chapters: [],
    sampleParagraphs: [],
    totalParagraphs: 0,
    dashHits: 0,
    typoHits: 0
  };

  let coverHref = doc.querySelector('title-info > coverpage > image')?.getAttribute('l:href')
    || doc.querySelector('title-info > coverpage > image')?.getAttribute('xlink:href')
    || doc.querySelector('title-info > coverpage > image')?.getAttribute('href') || '';
  if (coverHref.startsWith('#')) coverHref = coverHref.slice(1);

  for (const bin of Array.from(doc.getElementsByTagName('binary'))) {
    const id = bin.getAttribute('id') || '';
    const mime = bin.getAttribute('content-type') || 'image/jpeg';
    const b64 = (bin.textContent || '').replace(/\s+/g, '');
    if (!b64) continue;
    const byteStr = atob(b64);
    const arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const url = URL.createObjectURL(blob);

    if (id && id === coverHref) {
      book.cover = { blob, mime, url, originalPath: id, id, changed: false, removed: false };
    } else {
      book.images.push({ id, path: 'images/' + id, name: id, size: blob.size, mime, blob, url, markedDelete: false });
    }
  }

  const sections = Array.from(doc.querySelectorAll('body > section'));
  const targetNodes = sections.length ? sections : Array.from(doc.querySelectorAll('body'));

  targetNodes.forEach((sec, idx) => {
    const titleEl = sec.querySelector(':scope > title');
    const chTitle = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : `Глава ${idx + 1}`;
    const lines = [];
    if (titleEl) lines.push(`<h2>${escapeXml(chTitle)}</h2>`);

    let plainAccum = '';
    sec.querySelectorAll('p, empty-line, image').forEach(node => {
      const tag = node.tagName.toLowerCase();
      if (tag === 'empty-line') {
        lines.push('<p class="empty-line"></p>');
      } else if (tag === 'image') {
        let ref = node.getAttribute('l:href') || node.getAttribute('xlink:href') || node.getAttribute('href') || '';
        if (ref.startsWith('#')) ref = ref.slice(1);
        if (ref && ref !== coverHref) {
          lines.push(`<div class="ill-block"><img src="images/${escapeXml(ref)}" data-img-id="${escapeXml(ref)}" alt=""/></div>`);
        }
      } else if (tag === 'p') {
        if (node.closest('title')) return;
        const txt = node.textContent || '';
        if (txt.trim().length > 0) {
          plainAccum += txt + ' ';
          book.totalParagraphs++;
          book.dashHits += applyDashFix(txt, true).hits;
          book.typoHits += applyTypoFix(txt).hits;
          if (book.sampleParagraphs.length < 5 && txt.trim().length > 40) {
            book.sampleParagraphs.push(txt);
          }
        }
        lines.push(`<p>${escapeXml(txt)}</p>`);
      }
    });

    book.chapters.push({
      id: `ch-${idx + 1}`,
      title: chTitle,
      snippet: plainAccum.trim().slice(0, 110),
      charCount: plainAccum.trim().length,
      suspect: detectSuspectChapter(chTitle, plainAccum),
      markedDelete: false,
      html: lines.join('\n')
    });
  });

  return book;
}

async function parseTxtFile(file, originalName) {
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (text.includes('\uFFFD')) text = new TextDecoder('windows-1251').decode(buffer);

  const book = {
    id: Math.random().toString(36).slice(2),
    mode: 'converted',
    formatLabel: 'TXT → EPUB',
    originalName,
    title: originalName,
    author: '',
    series: '',
    seriesIndex: '',
    description: '',
    cover: null,
    images: [],
    mediaFiles: [],
    chapters: [],
    sampleParagraphs: [],
    totalParagraphs: 0,
    dashHits: 0,
    typoHits: 0
  };

  const rawLines = text.split(/\r?\n/);
  const htmlLines = [];
  for (const line of rawLines) {
    if (line.trim() === '') {
      htmlLines.push('<p class="empty-line"></p>');
    } else {
      book.totalParagraphs++;
      book.dashHits += applyDashFix(line, true).hits;
      book.typoHits += applyTypoFix(line).hits;
      if (book.sampleParagraphs.length < 5 && line.trim().length > 40) {
        book.sampleParagraphs.push(line);
      }
      htmlLines.push(`<p>${escapeXml(line)}</p>`);
    }
  }

  book.chapters.push({
    id: 'ch-1',
    title: originalName,
    snippet: text.replace(/\s+/g, ' ').trim().slice(0, 110),
    charCount: text.trim().length,
    suspect: false,
    markedDelete: false,
    html: htmlLines.join('\n')
  });

  return book;
}

// Синхронизация сохранённых настроек с контролами
function syncControlsFromSettings() {
  const s = appState.settings;
  els.removeIndentToggle.checked = s.removeIndent;
  els.cleanEmptyToggle.checked = s.cleanEmpty;
  els.spacingRange.value = s.spacing;
  els.spacingVal.textContent = Number(s.spacing).toFixed(2) + ' em';
  els.fixDashesToggle.checked = s.fixDashes;
  els.fixTypoToggle.checked = s.fixTypo;
  els.fixDarkModeToggle.checked = s.fixDarkMode;
  els.stripMediaToggle.checked = s.stripMedia;
  if (els.insertDescPageToggle) els.insertDescPageToggle.checked = s.insertDescPage !== false;
  if (els.kindlePagesToggle) els.kindlePagesToggle.checked = s.kindlePages !== false;
  els.fontSelect.value = s.fontMode;
  els.alignSelect.value = s.alignMode;
  els.customFontRow.classList.toggle('hidden', s.fontMode !== 'custom');
}

syncControlsFromSettings();

function bindSetting(el, key, eventName, transform = v => v) {
  el.addEventListener(eventName, () => {
    const val = el.type === 'checkbox' ? el.checked : transform(el.value);
    appState.settings[key] = val;
    saveSettings();
    if (key === 'fontMode') {
      els.customFontRow.classList.toggle('hidden', val !== 'custom');
    }
    renderPreview();
  });
}

bindSetting(els.removeIndentToggle, 'removeIndent', 'change');
bindSetting(els.cleanEmptyToggle, 'cleanEmpty', 'change');
bindSetting(els.spacingRange, 'spacing', 'input', v => parseFloat(v));
bindSetting(els.fixDashesToggle, 'fixDashes', 'change');
bindSetting(els.fixTypoToggle, 'fixTypo', 'change');
bindSetting(els.fixDarkModeToggle, 'fixDarkMode', 'change');
bindSetting(els.stripMediaToggle, 'stripMedia', 'change');
  if (els.insertDescPageToggle) bindSetting(els.insertDescPageToggle, 'insertDescPage', 'change');
  if (els.kindlePagesToggle) bindSetting(els.kindlePagesToggle, 'kindlePages', 'change');
bindSetting(els.fontSelect, 'fontMode', 'change');
bindSetting(els.alignSelect, 'alignMode', 'change');

// Загрузка пользовательского шрифта (.ttf / .otf / .woff2)
els.selectFontFileBtn.addEventListener('click', () => els.fontFileInput.click());
els.fontFileInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const ext = (file.name.split('.').pop() || 'ttf').toLowerCase();
  const mimeMap = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
  appState.customFont = {
    name: file.name,
    ext,
    mime: mimeMap[ext] || 'font/ttf',
    buffer
  };
  els.fontFileName.textContent = file.name;

  try {
    const face = new FontFace('PerepletUserFont', buffer.slice(0));
    await face.load();
    document.fonts.add(face);
  } catch (err) {
    console.warn('Preview font load failed:', err);
  }
  renderPreview();
});

// Редактирование метаданных активной книги
els.titleInput.addEventListener('input', () => {
  const b = activeBook();
  if (!b) return;
  b.title = els.titleInput.value;
  renderQueue();
});
els.authorInput.addEventListener('input', () => {
  const b = activeBook();
  if (b) b.author = els.authorInput.value;
});
els.seriesInput.addEventListener('input', () => {
  const b = activeBook();
  if (b) b.series = els.seriesInput.value;
});
els.seriesIndexInput.addEventListener('input', () => {
  const b = activeBook();
  if (b) b.seriesIndex = els.seriesIndexInput.value;
});


if (els.descInput) {
  els.descInput.addEventListener('input', () => {
    const b = activeBook();
    if (b) b.description = els.descInput.value;
  });
}

function stripHtmlTags(raw) {
  if (!raw) return '';
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function hasCyrillic(text) {
  const cyr = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
  return cyr > text.length * 0.15;
}

async function translateToRussian(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q=' + encodeURIComponent(trimmed);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Сервис перевода временно недоступен');
  const data = await res.json();
  return (data[0] || []).map(part => part[0]).join('');
}

async function searchBookDescriptionOnline(title, author) {
  const cleanTitle = (title || '').replace(/[_\-]+/g, ' ').trim();
  const cleanAuthor = (author || '').trim();
  if (!cleanTitle) throw new Error('Укажите название книги для поиска');

  const queries = [];
  if (cleanAuthor) {
    queries.push(`intitle:${cleanTitle} inauthor:${cleanAuthor}`);
    queries.push(`${cleanTitle} ${cleanAuthor}`);
  }
  queries.push(cleanTitle);

  // 1. Ищем в Google Books API
  for (const q of queries) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.items || [];
      // Сначала ищем русское описание, если нет — берём самое подробное на любом языке
      let bestDesc = '';
      for (const item of items) {
        const raw = item.volumeInfo && item.volumeInfo.description;
        const clean = stripHtmlTags(raw);
        if (clean.length > 60) {
          if (hasCyrillic(clean)) return clean;
          if (clean.length > bestDesc.length) bestDesc = clean;
        }
      }
      if (bestDesc) return bestDesc;
    } catch (e) {
      console.warn('Google Books query error:', e);
    }
  }

  // 2. Резервный поиск в OpenLibrary
  try {
    const q = cleanAuthor ? `${cleanTitle} ${cleanAuthor}` : cleanTitle;
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5`);
    if (res.ok) {
      const data = await res.json();
      for (const doc of (data.docs || [])) {
        if (!doc.key) continue;
        const wRes = await fetch(`https://openlibrary.org${doc.key}.json`);
        if (!wRes.ok) continue;
        const wData = await wRes.json();
        const rawDesc = typeof wData.description === 'string'
          ? wData.description
          : (wData.description && wData.description.value) || '';
        const clean = stripHtmlTags(rawDesc);
        if (clean.length > 50) return clean;
      }
    }
  } catch (e) {
    console.warn('OpenLibrary fallback error:', e);
  }

  return '';
}

if (els.findDescBtn) {
  els.findDescBtn.addEventListener('click', async () => {
    const book = activeBook();
    if (!book) return;
    const origLabel = els.findDescBtn.textContent;
    els.findDescBtn.disabled = true;
    els.findDescBtn.textContent = 'Ищем...';
    els.statusText.textContent = 'Ищем описание книги в сети...';

    try {
      let found = await searchBookDescriptionOnline(book.title, book.author);
      if (!found) {
        alert('По этому названию описание не нашлось. Попробуйте уточнить оригинальное название книги или имя автора.');
        els.statusText.textContent = 'Описание не найдено';
        return;
      }
      if (!hasCyrillic(found)) {
        els.findDescBtn.textContent = 'Переводим...';
        els.statusText.textContent = 'Переводим найденную аннотацию на русский...';
        found = await translateToRussian(found);
      }
      book.description = found;
      els.descInput.value = found;
      els.statusText.textContent = 'Аннотация найдена и подставлена';
    } catch (err) {
      alert('Ошибка поиска: ' + err.message);
      els.statusText.textContent = 'Ошибка поиска';
    } finally {
      els.findDescBtn.disabled = false;
      els.findDescBtn.textContent = origLabel;
    }
  });
}

if (els.translateDescBtn) {
  els.translateDescBtn.addEventListener('click', async () => {
    const book = activeBook();
    if (!book) return;
    const current = els.descInput.value.trim();
    if (!current) {
      alert('Сначала нажмите «Найти в сети» или вставьте текст для перевода.');
      return;
    }
    const origLabel = els.translateDescBtn.textContent;
    els.translateDescBtn.disabled = true;
    els.translateDescBtn.textContent = 'Переводим...';

    try {
      const translated = await translateToRussian(current);
      book.description = translated;
      els.descInput.value = translated;
      els.statusText.textContent = 'Аннотация переведена на русский';
    } catch (err) {
      alert('Не удалось перевести: ' + err.message);
    } finally {
      els.translateDescBtn.disabled = false;
      els.translateDescBtn.textContent = origLabel;
    }
  });
}

function renderAll() {
  const book = activeBook();
  if (!book) {
    els.workspace.classList.add('hidden');
    els.dropZone.classList.remove('hidden');
    els.resetBtn.classList.add('hidden');
    els.addMoreBtn.classList.add('hidden');
    return;
  }

  els.dropZone.classList.add('hidden');
  els.workspace.classList.remove('hidden');
  els.resetBtn.classList.remove('hidden');
  els.addMoreBtn.classList.remove('hidden');

  renderQueue();

  els.formatBadge.textContent = book.formatLabel;
  els.titleInput.value = book.title;
  els.authorInput.value = book.author;
  els.seriesInput.value = book.series;
  els.seriesIndexInput.value = book.seriesIndex;
  if (els.descInput) els.descInput.value = book.description || '';

  els.statChapters.textContent = book.chapters.length;
  els.statParagraphs.textContent = book.totalParagraphs;
  els.statImages.textContent = book.images.length;
  els.statMedia.textContent = book.mediaFiles.length;
  if (els.kindlePagesPill) {
    const totalChars = book.chapters.filter(c => !c.markedDelete).reduce((sum, c) => sum + (c.charCount || 0), 0);
    const estPages = Math.max(1, Math.round(totalChars / 1800));
    els.kindlePagesPill.textContent = `~${estPages} стр.`;
  }


  // Счётчики находок
  els.dashCountPill.textContent = book.dashHits > 0 ? `Найдено: ${book.dashHits}` : 'Не найдено';
  els.dashCountPill.className = 'pill' + (book.dashHits > 0 ? ' has-hits' : '');

  els.typoCountPill.textContent = book.typoHits > 0 ? `Найдено: ${book.typoHits}` : 'Не найдено';
  els.typoCountPill.className = 'pill' + (book.typoHits > 0 ? ' has-hits' : '');

  if (book.mediaFiles.length > 0) {
    const totalMediaBytes = book.mediaFiles.reduce((acc, f) => acc + f.size, 0);
    els.mediaCountPill.textContent = `${book.mediaFiles.length} шт · ${formatBytes(totalMediaBytes)}`;
    els.mediaCountPill.className = 'pill has-warn';
  } else {
    els.mediaCountPill.textContent = 'Нет';
    els.mediaCountPill.className = 'pill';
  }

  els.exportAllBtn.classList.toggle('hidden', appState.books.length < 2);
  if (appState.books.length >= 2) {
    els.exportAllBtn.textContent = `Все ${appState.books.length} (ZIP)`;
  }

  renderCover();
  renderPreview();
  renderChaptersList();
  renderImagesGrid();
  els.statusText.textContent = 'Готово к сборке';
}

function renderQueue() {
  if (appState.books.length < 2) {
    els.queuePanel.classList.add('hidden');
    return;
  }
  els.queuePanel.classList.remove('hidden');
  els.queueTitle.textContent = `Книги в работе (${appState.books.length})`;
  els.bookTabs.innerHTML = '';

  appState.books.forEach((b, idx) => {
    const tab = document.createElement('div');
    tab.className = 'book-tab' + (idx === appState.activeIndex ? ' active' : '');
    tab.innerHTML = `
      <span class="book-tab-title">${escapeXml(b.title || b.originalName)}</span>
      <button class="book-tab-remove" type="button" title="Убрать из списка">×</button>
    `;
    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('book-tab-remove')) {
        e.stopPropagation();
        revokeBookUrls(appState.books[idx]);
        appState.books.splice(idx, 1);
        if (appState.activeIndex >= appState.books.length) {
          appState.activeIndex = Math.max(0, appState.books.length - 1);
        }
        renderAll();
      } else {
        appState.activeIndex = idx;
        renderAll();
      }
    });
    els.bookTabs.appendChild(tab);
  });
}

function renderCover() {
  const book = activeBook();
  if (book && book.cover && !book.cover.removed && book.cover.url) {
    els.coverImg.src = book.cover.url;
    els.coverImg.classList.remove('hidden');
    els.coverPlaceholder.classList.add('hidden');
    els.removeCoverBtn.classList.remove('hidden');
  } else {
    els.coverImg.src = '';
    els.coverImg.classList.add('hidden');
    els.coverPlaceholder.classList.remove('hidden');
    els.removeCoverBtn.classList.add('hidden');
  }
}

els.changeCoverBtn.addEventListener('click', () => els.coverInput.click());
els.coverInput.addEventListener('change', (e) => {
  const book = activeBook();
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!book || !file) return;
  if (book.cover && book.cover.url) URL.revokeObjectURL(book.cover.url);
  book.cover = {
    blob: file,
    mime: file.type || 'image/jpeg',
    url: URL.createObjectURL(file),
    originalPath: book.cover ? book.cover.originalPath : null,
    id: book.cover ? book.cover.id : null,
    changed: true,
    removed: false
  };
  renderCover();
});

els.removeCoverBtn.addEventListener('click', () => {
  const book = activeBook();
  if (book && book.cover) book.cover.removed = true;
  renderCover();
});

function renderPreview() {
  const book = activeBook();
  const s = appState.settings;
  els.spacingVal.textContent = Number(s.spacing).toFixed(2) + ' em';

  els.livePreview.style.setProperty('--preview-indent', s.removeIndent ? '0px' : '1.5em');
  els.livePreview.style.setProperty('--preview-gap', s.spacing + 'em');
  els.livePreview.style.setProperty('--preview-align', s.alignMode === 'justify' ? 'justify' : 'left');
  els.marginLine.style.opacity = s.removeIndent ? '1' : '0.25';

  let previewFont = 'Georgia, "Times New Roman", serif';
  if (s.fontMode === 'sans') previewFont = '-apple-system, BlinkMacSystemFont, "Inter", sans-serif';
  if (s.fontMode === 'custom' && appState.customFont) previewFont = '"PerepletUserFont", Georgia, serif';
  els.livePreview.style.setProperty('--preview-font', previewFont);

  const samples = (book && book.sampleParagraphs.length > 0)
    ? book.sampleParagraphs
    : [
        '— Привет! — сказал он, закрывая книгу.',
        'Красная строка убрана в ноль, а между абзацами добавлен аккуратный воздушный интервал.',
        'Даже если в исходной книге были смешаны стили - теперь всё выглядит ровно.'
      ];

  els.livePreview.innerHTML = samples.map(raw => {
    let t = s.removeIndent ? cleanLeadingSpaces(raw) : raw;
    if (s.fixDashes) t = applyDashFix(t, true).text;
    if (s.fixTypo) t = applyTypoFix(t).text;
    return `<p>${escapeXml(t)}</p>`;
  }).join('');
}

// Список глав книги
function renderChaptersList() {
  const book = activeBook();
  els.chaptersList.innerHTML = '';
  if (!book || book.chapters.length === 0) {
    els.chaptersToolbar.classList.add('hidden');
    return;
  }

  els.chaptersToolbar.classList.remove('hidden');
  const suspectCount = book.chapters.filter(c => c.suspect).length;
  els.markSuspectChaptersBtn.disabled = suspectCount === 0;
  els.markSuspectChaptersBtn.textContent = suspectCount > 0 ? `Отметить рекламу (${suspectCount})` : 'Реклама не найдена';

  book.chapters.forEach((ch, idx) => {
    const row = document.createElement('div');
    row.className = 'chapter-row' + (ch.markedDelete ? ' marked-delete' : '');
    row.innerHTML = `
      <div class="chapter-info">
        <div class="chapter-top">
          <span class="chapter-title">${escapeXml(ch.title)}</span>
          ${ch.suspect ? '<span class="pill has-warn">Реклама?</span>' : ''}
        </div>
        <div class="chapter-snippet">${escapeXml(ch.snippet || 'Пустая страница или только картинка')}</div>
      </div>
      <div class="chapter-right">
        <span class="chapter-chars">${ch.charCount.toLocaleString('ru-RU')} зн.</span>
        <span class="chapter-state">${ch.markedDelete ? 'Удалить' : 'Оставить'}</span>
      </div>
    `;
    row.addEventListener('click', () => {
      book.chapters[idx].markedDelete = !book.chapters[idx].markedDelete;
      renderChaptersList();
    });
    els.chaptersList.appendChild(row);
  });

  const delCount = book.chapters.filter(c => c.markedDelete).length;
  els.deletedChaptersCount.textContent = `К удалению: ${delCount} из ${book.chapters.length}`;
}

els.markSuspectChaptersBtn.addEventListener('click', () => {
  const book = activeBook();
  if (!book) return;
  book.chapters.forEach(c => { if (c.suspect) c.markedDelete = true; });
  renderChaptersList();
});

els.keepAllChaptersBtn.addEventListener('click', () => {
  const book = activeBook();
  if (!book) return;
  book.chapters.forEach(c => { c.markedDelete = false; });
  renderChaptersList();
});

// Сетка картинок
function renderImagesGrid() {
  const book = activeBook();
  els.imagesGrid.innerHTML = '';
  if (!book || book.images.length === 0) {
    els.emptyImagesState.classList.remove('hidden');
    els.imagesToolbar.classList.add('hidden');
    return;
  }

  els.emptyImagesState.classList.add('hidden');
  els.imagesToolbar.classList.remove('hidden');

  book.images.forEach((img, index) => {
    const card = document.createElement('div');
    card.className = 'img-card' + (img.markedDelete ? ' marked-delete' : '');
    card.innerHTML = `
      <div class="img-thumb-wrap"><img src="${img.url}" loading="lazy" alt=""></div>
      <div class="img-meta">
        <span class="img-name" title="${escapeXml(img.name)}">${formatBytes(img.size)}</span>
        <span class="img-status">${img.markedDelete ? 'Удалить' : 'Оставить'}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      book.images[index].markedDelete = !book.images[index].markedDelete;
      renderImagesGrid();
    });
    els.imagesGrid.appendChild(card);
  });

  const delCount = book.images.filter(i => i.markedDelete).length;
  els.selectedCount.textContent = `К удалению: ${delCount} из ${book.images.length}`;
}

els.selectAllImgsBtn.addEventListener('click', () => {
  const book = activeBook();
  if (!book) return;
  book.images.forEach(i => { i.markedDelete = true; });
  renderImagesGrid();
});

els.keepAllImgsBtn.addEventListener('click', () => {
  const book = activeBook();
  if (!book) return;
  book.images.forEach(i => { i.markedDelete = false; });
  renderImagesGrid();
});

// Генерация CSS с учётом всех настроек пользователя

const CHARS_PER_KINDLE_PAGE = 1800;

function injectKindlePageAnchors(doc, isXml, relHrefFromOpf, stateObj) {
  const ps = Array.from(doc.querySelectorAll('p'));
  for (const p of ps) {
    const len = (p.textContent || '').trim().length;
    if (!len) continue;
    stateObj.charAcc += len;
    if (stateObj.page === 0 || stateObj.charAcc >= CHARS_PER_KINDLE_PAGE) {
      stateObj.page++;
      stateObj.charAcc = 0;
      const anchorId = `kpage-${stateObj.page}`;
      const span = isXml
        ? doc.createElementNS('http://www.w3.org/1999/xhtml', 'span')
        : doc.createElement('span');
      span.setAttribute('id', anchorId);
      span.setAttribute('epub:type', 'pagebreak');
      span.setAttribute('role', 'doc-pagebreak');
      span.setAttribute('title', String(stateObj.page));
      p.insertBefore(span, p.firstChild);
      stateObj.entries.push({ page: stateObj.page, href: `${relHrefFromOpf}#${anchorId}` });
    }
  }
}

function appendNcxPageList(ncxDoc, entries) {
  if (!entries.length) return;
  const ns = ncxDoc.documentElement.namespaceURI || 'http://www.daisy.org/z3986/2005/ncx/';
  Array.from(ncxDoc.getElementsByTagNameNS('*', 'pageList')).forEach(el => el.remove());
  const pageList = ncxDoc.createElementNS(ns, 'pageList');
  entries.forEach((e, idx) => {
    const pt = ncxDoc.createElementNS(ns, 'pageTarget');
    pt.setAttribute('id', `pt-${e.page}`);
    pt.setAttribute('type', 'normal');
    pt.setAttribute('value', String(e.page));
    pt.setAttribute('playOrder', String(10000 + idx));
    const nl = ncxDoc.createElementNS(ns, 'navLabel');
    const txt = ncxDoc.createElementNS(ns, 'text');
    txt.textContent = String(e.page);
    nl.appendChild(txt);
    const content = ncxDoc.createElementNS(ns, 'content');
    content.setAttribute('src', e.href);
    pt.appendChild(nl);
    pt.appendChild(content);
    pageList.appendChild(pt);
  });
  ncxDoc.documentElement.appendChild(pageList);
}

function buildOverrideCss(s, customFontRelUrl) {
  const rules = [];

  if (s.fontMode === 'custom' && customFontRelUrl) {
    rules.push(`@font-face { font-family: "PerepletCustom"; src: url("${customFontRelUrl}"); font-weight: normal; font-style: normal; }`);
    rules.push(`body, p, div, span { font-family: "PerepletCustom", serif !important; }`);
  } else if (s.fontMode === 'serif') {
    rules.push(`body, p, div { font-family: Georgia, "PT Serif", "Times New Roman", serif !important; }`);
  } else if (s.fontMode === 'sans') {
    rules.push(`body, p, div { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif !important; }`);
  } else if (s.fontMode === 'reset') {
    rules.push(`body, p, div, span { font-family: inherit !important; }`);
  }

  if (s.fixDarkMode) {
    rules.push(`html, body, p, div, span, h1, h2, h3, h4, blockquote { color: inherit !important; background-color: transparent !important; }`);
  }

  const alignRule = s.alignMode === 'justify'
    ? 'text-align: justify !important;'
    : s.alignMode === 'left'
      ? 'text-align: left !important;'
      : '';

  rules.push(`p { text-indent: ${s.removeIndent ? '0 !important' : '1.5em'}; margin-top: 0 !important; margin-bottom: ${s.spacing}em !important; ${alignRule} }`);
  rules.push(`div.paragraph, .p, .text { text-indent: ${s.removeIndent ? '0 !important' : '1.5em'}; }`);

  return rules.join('\n');
}

function processParagraphTextNodes(p, doc, s) {
  const walker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
  let node;
  let isFirstText = true;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue) continue;
    let val = node.nodeValue;
    if (isFirstText) {
      if (s.removeIndent) val = cleanLeadingSpaces(val);
      if (s.fixDashes) val = applyDashFix(val, true).text;
      if (val.trim().length > 0) isFirstText = false;
    } else {
      if (s.fixDashes) val = applyDashFix(val, false).text;
    }
    if (s.fixTypo) val = applyTypoFix(val).text;
    node.nodeValue = val;
  }
}

function triggerDownload(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function safeFileName(title) {
  return (title || 'book').replace(/[\\/:*?"<>|]/g, '').trim() || 'book';
}

// Экспорт текущей книги
els.exportBtn.addEventListener('click', async () => {
  const book = activeBook();
  if (!book) return;
  els.exportBtn.disabled = true;
  els.exportAllBtn.disabled = true;
  els.statusText.textContent = 'Собираем EPUB...';

  try {
    const blob = await buildBookBlob(book, appState.settings);
    triggerDownload(blob, `${safeFileName(book.title)}.epub`);
    els.statusText.textContent = 'EPUB сохранён';
  } catch (err) {
    console.error(err);
    alert('Ошибка сборки: ' + err.message);
    els.statusText.textContent = 'Ошибка сборки';
  } finally {
    els.exportBtn.disabled = false;
    els.exportAllBtn.disabled = false;
  }
});

// Пакетный экспорт всех книг в один ZIP
els.exportAllBtn.addEventListener('click', async () => {
  if (appState.books.length === 0) return;
  els.exportBtn.disabled = true;
  els.exportAllBtn.disabled = true;

  try {
    const masterZip = new JSZip();
    const usedNames = new Set();

    for (let i = 0; i < appState.books.length; i++) {
      const b = appState.books[i];
      els.statusText.textContent = `Сборка ${i + 1} из ${appState.books.length}...`;
      const epubBlob = await buildBookBlob(b, appState.settings);
      let base = safeFileName(b.title || b.originalName);
      let fname = `${base}.epub`;
      let counter = 2;
      while (usedNames.has(fname)) {
        fname = `${base} (${counter++}).epub`;
      }
      usedNames.add(fname);
      masterZip.file(fname, epubBlob);
    }

    els.statusText.textContent = 'Упаковываем ZIP...';
    const zipBlob = await masterZip.generateAsync({ type: 'blob' });
    triggerDownload(zipBlob, 'pereplet-books.zip');
    els.statusText.textContent = `Сохранено книг: ${appState.books.length}`;
  } catch (err) {
    console.error(err);
    alert('Ошибка пакетной сборки: ' + err.message);
    els.statusText.textContent = 'Ошибка сборки';
  } finally {
    els.exportBtn.disabled = false;
    els.exportAllBtn.disabled = false;
  }
});

async function buildBookBlob(book, s) {
  if (book.mode === 'epub') return await exportModifiedEpub(book, s);
  return await exportFreshEpub(book, s);
}

// Сборка модифицированного EPUB (не мутирует исходный book.zip, работает с копией)
async function exportModifiedEpub(book, s) {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  // Копируем исходный архив, чтобы книгу можно было пересохранять много раз
  const rawBuffer = await book.zip.generateAsync({ type: 'arraybuffer' });
  const zip = await JSZip.loadAsync(rawBuffer);

  const opfDoc = parser.parseFromString(await zip.file(book.opfPath).async('string'), 'application/xml');
  const metadataNode = opfDoc.getElementsByTagNameNS('*', 'metadata')[0];
  const manifestNode = opfDoc.getElementsByTagNameNS('*', 'manifest')[0];
  const spineNode = opfDoc.getElementsByTagNameNS('*', 'spine')[0];
  const nsUri = opfDoc.documentElement.namespaceURI;

  const newTitle = (book.title || 'Без названия').trim();
  const newAuthor = (book.author || '').trim();

  // 1. Метаданные (Название, Автор, Серия)
  let titleNode = opfDoc.getElementsByTagNameNS('*', 'title')[0];
  if (!titleNode && metadataNode) {
    titleNode = opfDoc.createElementNS('http://purl.org/dc/elements/1.1/', 'dc:title');
    metadataNode.appendChild(titleNode);
  }
  if (titleNode) titleNode.textContent = newTitle;

  let creatorNode = opfDoc.getElementsByTagNameNS('*', 'creator')[0];
  if (newAuthor) {
    if (!creatorNode && metadataNode) {
      creatorNode = opfDoc.createElementNS('http://purl.org/dc/elements/1.1/', 'dc:creator');
      metadataNode.appendChild(creatorNode);
    }
    if (creatorNode) creatorNode.textContent = newAuthor;
  }

  // Серия (Calibre meta)
  Array.from(opfDoc.getElementsByTagNameNS('*', 'meta')).forEach(m => {
    const n = m.getAttribute('name');
    if (n === 'calibre:series' || n === 'calibre:series_index') m.remove();
  });
  if (book.series && book.series.trim() && metadataNode) {
    const ms = opfDoc.createElementNS(nsUri, 'meta');
    ms.setAttribute('name', 'calibre:series');
    ms.setAttribute('content', book.series.trim());
    metadataNode.appendChild(ms);
    if (book.seriesIndex && book.seriesIndex.trim()) {
      const mi = opfDoc.createElementNS(nsUri, 'meta');
      mi.setAttribute('name', 'calibre:series_index');
      mi.setAttribute('content', book.seriesIndex.trim());
      metadataNode.appendChild(mi);
    }
  }

    // Аннотация (dc:description + опциональная страница в начале книги)
  const descText = (book.description || '').trim();
  let descNode = opfDoc.getElementsByTagNameNS('*', 'description')[0];
  if (descText) {
    if (!descNode && metadataNode) {
      descNode = opfDoc.createElementNS('http://purl.org/dc/elements/1.1/', 'dc:description');
      metadataNode.appendChild(descNode);
    }
    if (descNode) descNode.textContent = descText;
  }

  // 2. Удаление отмеченных глав
  const deletedChIds = new Set(book.chapters.filter(c => c.markedDelete).map(c => c.id));
  const deletedChPaths = new Set(book.chapters.filter(c => c.markedDelete).map(c => c.path));

  Array.from(opfDoc.getElementsByTagNameNS('*', 'itemref')).forEach(ref => {
    if (deletedChIds.has(ref.getAttribute('idref'))) ref.remove();
  });
  Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).forEach(it => {
    if (deletedChIds.has(it.getAttribute('id'))) it.remove();
  });
  for (const p of deletedChPaths) zip.remove(p);

  // Обновляем toc.ncx (заголовок + убираем удалённые главы)
  const ncxItem = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).find(
    i => (i.getAttribute('media-type') || '').includes('ncx')
  );
  if (ncxItem) {
    const ncxPath = resolveZipPath(book.opfDir, ncxItem.getAttribute('href'));
    const ncxDir = ncxPath.includes('/') ? ncxPath.slice(0, ncxPath.lastIndexOf('/')) : '';
    if (zip.file(ncxPath)) {
      const ncxDoc = parser.parseFromString(await zip.file(ncxPath).async('string'), 'application/xml');
      const docTitleText = ncxDoc.querySelector('docTitle > text');
      if (docTitleText) docTitleText.textContent = newTitle;
      ncxDoc.querySelectorAll('navPoint').forEach(np => {
        const content = np.querySelector(':scope > content');
        if (!content) return;
        const resolved = resolveZipPath(ncxDir, content.getAttribute('src'));
        if (deletedChPaths.has(resolved)) np.remove();
      });
      zip.file(ncxPath, serializer.serializeToString(ncxDoc));
    }
  }

  // 3. Вырезка аудио и видео (MP3, MP4 и др.)
  if (s.stripMedia && book.mediaFiles.length > 0) {
    const mediaIds = new Set(book.mediaFiles.map(m => m.id).filter(Boolean));
    for (const m of book.mediaFiles) zip.remove(m.path);
    Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).forEach(it => {
      const fullPath = resolveZipPath(book.opfDir, it.getAttribute('href'));
      if (mediaIds.has(it.getAttribute('id')) || isAudioOrVideo(it.getAttribute('media-type'), fullPath)) {
        it.remove();
      }
    });
  }

  // 4. Удаление выбранных картинок
  const deletedImgPaths = new Set(book.images.filter(i => i.markedDelete).map(i => i.path));
  const deletedImgIds = new Set(book.images.filter(i => i.markedDelete).map(i => i.id));
  for (const p of deletedImgPaths) zip.remove(p);
  Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).forEach(it => {
    if (deletedImgIds.has(it.getAttribute('id'))) it.remove();
  });

  // 5. Обложка
  if (book.cover) {
    if (book.cover.removed && book.cover.originalPath) {
      zip.remove(book.cover.originalPath);
      if (book.cover.id) {
        const cItem = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).find(i => i.getAttribute('id') === book.cover.id);
        if (cItem) cItem.remove();
      }
    } else if (book.cover.changed && !book.cover.removed) {
      const ext = book.cover.mime.includes('png') ? 'png' : book.cover.mime.includes('webp') ? 'webp' : 'jpg';
      if (book.cover.originalPath) {
        zip.file(book.cover.originalPath, book.cover.blob);
        const cItem = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).find(i => i.getAttribute('id') === book.cover.id);
        if (cItem) cItem.setAttribute('media-type', book.cover.mime);
      } else {
        const relImgHref = `images/custom-cover.${ext}`;
        zip.file(resolveZipPath(book.opfDir, relImgHref), book.cover.blob);

        const imgItem = opfDoc.createElementNS(nsUri, 'item');
        imgItem.setAttribute('id', 'custom-cover-img');
        imgItem.setAttribute('href', relImgHref);
        imgItem.setAttribute('media-type', book.cover.mime);
        imgItem.setAttribute('properties', 'cover-image');
        manifestNode.appendChild(imgItem);

        const metaCover = opfDoc.createElementNS(nsUri, 'meta');
        metaCover.setAttribute('name', 'cover');
        metaCover.setAttribute('content', 'custom-cover-img');
        metadataNode.appendChild(metaCover);

        const coverPageHref = 'custom-cover.xhtml';
        zip.file(resolveZipPath(book.opfDir, coverPageHref), `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(newTitle)}</title>
<style>body,html{margin:0;padding:0;height:100%;text-align:center;}img{max-width:100%;max-height:100%;object-fit:contain;}</style>
</head><body><div><img src="${relImgHref}" alt="Cover"/></div></body></html>`);

        const pageItem = opfDoc.createElementNS(nsUri, 'item');
        pageItem.setAttribute('id', 'custom-cover-page');
        pageItem.setAttribute('href', coverPageHref);
        pageItem.setAttribute('media-type', 'application/xhtml+xml');
        manifestNode.appendChild(pageItem);

        const itemref = opfDoc.createElementNS(nsUri, 'itemref');
        itemref.setAttribute('idref', 'custom-cover-page');
        spineNode.insertBefore(itemref, spineNode.firstChild);
      }
    }
  }

  // 6. Вшивание пользовательского шрифта (если выбран)
  let customFontRel = null;
  if (s.fontMode === 'custom' && appState.customFont) {
    customFontRel = `fonts/pereplet-custom.${appState.customFont.ext}`;
    zip.file(resolveZipPath(book.opfDir, customFontRel), appState.customFont.buffer);
    const fItem = opfDoc.createElementNS(nsUri, 'item');
    fItem.setAttribute('id', 'pereplet-custom-font');
    fItem.setAttribute('href', customFontRel);
    fItem.setAttribute('media-type', appState.customFont.mime);
    manifestNode.appendChild(fItem);
  }

  // 7. CSS-оверрайд
  const cssRelHref = 'pereplet-override.css';
  zip.file(resolveZipPath(book.opfDir, cssRelHref), buildOverrideCss(s, customFontRel));
  if (!Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).some(i => i.getAttribute('id') === 'pereplet-css')) {
    const cssItem = opfDoc.createElementNS(nsUri, 'item');
    cssItem.setAttribute('id', 'pereplet-css');
    cssItem.setAttribute('href', cssRelHref);
    cssItem.setAttribute('media-type', 'text/css');
    manifestNode.appendChild(cssItem);
  }

    if (descText && s.insertDescPage !== false) {
    const annotHref = 'pereplet-annotation.xhtml';
    const annotFull = resolveZipPath(book.opfDir, annotHref);
    const pars = descText.split(/\r?\n+/).filter(Boolean).map(p => `<p>${escapeXml(p)}</p>`).join('\n');
    const annotXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Аннотация</title>
<link rel="stylesheet" type="text/css" href="${cssRelHref}"/>
</head><body><h2>Аннотация</h2>\n${pars}\n</body></html>`;
    zip.file(annotFull, annotXhtml);

    if (!Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).some(i => i.getAttribute('id') === 'pereplet-annot-page')) {
      const aItem = opfDoc.createElementNS(nsUri, 'item');
      aItem.setAttribute('id', 'pereplet-annot-page');
      aItem.setAttribute('href', annotHref);
      aItem.setAttribute('media-type', 'application/xhtml+xml');
      manifestNode.appendChild(aItem);

      const aRef = opfDoc.createElementNS(nsUri, 'itemref');
      aRef.setAttribute('idref', 'pereplet-annot-page');
      const firstRef = spineNode.firstElementChild;
      if (firstRef && (firstRef.getAttribute('idref') || '').includes('cover')) {
        spineNode.insertBefore(aRef, firstRef.nextSibling);
      } else {
        spineNode.insertBefore(aRef, firstRef);
      }
    }
  }

  // 8. Правка оставшихся XHTML глав
  const htmlItems = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).filter(item => {
    const m = item.getAttribute('media-type') || '';
    return (m.includes('xhtml') || m.includes('html')) && item.getAttribute('id') !== 'custom-cover-page';
  });

  const kindleState = { page: 0, charAcc: 0, entries: [] };
  for (const item of htmlItems) {
    const htmlPath = resolveZipPath(book.opfDir, item.getAttribute('href'));
    const entry = zip.file(htmlPath);
    if (!entry) continue;

    const htmlDir = htmlPath.includes('/') ? htmlPath.slice(0, htmlPath.lastIndexOf('/')) : '';
    const rawStr = await entry.async('string');

    let doc = parser.parseFromString(rawStr, 'application/xhtml+xml');
    let isXml = true;
    if (doc.querySelector('parsererror')) {
      doc = parser.parseFromString(rawStr, 'text/html');
      isXml = false;
    }

    // Удаление тегов аудио/видео
    if (s.stripMedia) {
      doc.querySelectorAll('audio, video, source').forEach(el => el.remove());
    }

    // Удаление отмеченных картинок
    doc.querySelectorAll('img, image').forEach(imgEl => {
      const src = imgEl.getAttribute('src') || imgEl.getAttribute('xlink:href') || imgEl.getAttribute('href') || '';
      const resolved = resolveZipPath(htmlDir, src);
      if (deletedImgPaths.has(resolved)) {
        const parentSvg = imgEl.closest('svg');
        if (parentSvg) parentSvg.remove();
        else imgEl.remove();
      }
    });

    // Сброс инлайновых цветов для тёмной темы
    if (s.fixDarkMode) {
      doc.querySelectorAll('[style]').forEach(el => {
        const st = el.getAttribute('style')
          .replace(/(?:^|;)\s*(?:color|background|background-color)\s*:[^;]+/gi, '')
          .trim();
        if (st) el.setAttribute('style', st);
        else el.removeAttribute('style');
      });
    }

    // Правка абзацев
    doc.querySelectorAll('p').forEach(p => {
      if (s.cleanEmpty && isParagraphEmpty(p)) {
        p.remove();
        return;
      }
      if (p.hasAttribute('style')) {
        const st = p.getAttribute('style')
          .replace(/text-indent\s*:[^;]+;?/gi, '')
          .replace(/margin-(top|bottom)\s*:[^;]+;?/gi, '')
          .trim();
        if (st) p.setAttribute('style', st);
        else p.removeAttribute('style');
      }
      processParagraphTextNodes(p, doc, s);
    });
    if (s.kindlePages !== false) {
      injectKindlePageAnchors(doc, true, fileName, kindleState);
    }

    if (s.kindlePages !== false) {
      injectKindlePageAnchors(doc, isXml, item.getAttribute('href'), kindleState);
    }

    const depth = htmlDir ? htmlDir.split('/').filter(Boolean).length : 0;
    const opfDepth = book.opfDir ? book.opfDir.split('/').filter(Boolean).length : 0;
    const upLevels = Math.max(0, depth - opfDepth);
    const relCss = '../'.repeat(upLevels) + cssRelHref;

    const head = doc.querySelector('head');
    if (head && !head.querySelector('link[data-pereplet="1"]')) {
      const linkEl = isXml
        ? doc.createElementNS('http://www.w3.org/1999/xhtml', 'link')
        : doc.createElement('link');
      linkEl.setAttribute('rel', 'stylesheet');
      linkEl.setAttribute('type', 'text/css');
      linkEl.setAttribute('href', relCss);
      linkEl.setAttribute('data-pereplet', '1');
      head.appendChild(linkEl);
    }

    zip.file(htmlPath, isXml ? serializer.serializeToString(doc) : doc.documentElement.outerHTML);
  }

  if (s.kindlePages !== false && kindleState.entries.length > 0 && ncxItem) {
    const ncxPath = resolveZipPath(book.opfDir, ncxItem.getAttribute('href'));
    if (zip.file(ncxPath)) {
      const ncxDoc = parser.parseFromString(await zip.file(ncxPath).async('string'), 'application/xml');
      appendNcxPageList(ncxDoc, kindleState.entries);
      zip.file(ncxPath, serializer.serializeToString(ncxDoc));
    }
  }
  zip.file(book.opfPath, serializer.serializeToString(opfDoc));

  const outZip = new JSZip();
  outZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  const allPaths = Object.keys(zip.files).filter(p => p !== 'mimetype' && !zip.files[p].dir);
  for (const p of allPaths) {
    outZip.file(p, await zip.file(p).async('uint8array'), { compression: 'DEFLATE' });
  }
  return await outZip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

// Сборка нового чистого EPUB из FB2 / TXT
async function exportFreshEpub(book, s) {
  const outZip = new JSZip();
  outZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  outZip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);

  const manifestLines = [
    `<item id="css" href="style.css" media-type="text/css"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
  ];
  const spineLines = [];
  const navPoints = [];

  let customFontRel = null;
  if (s.fontMode === 'custom' && appState.customFont) {
    customFontRel = `fonts/pereplet-custom.${appState.customFont.ext}`;
    outZip.file(`OEBPS/${customFontRel}`, appState.customFont.buffer);
    manifestLines.push(`<item id="custom-font" href="${customFontRel}" media-type="${appState.customFont.mime}"/>`);
  }

  outZip.file('OEBPS/style.css', `
body { line-height: 1.5; margin: 0; padding: 0 4%; }
h1, h2, h3 { font-weight: 600; margin: 1.2em 0 0.6em; text-indent: 0; }
.ill-block { text-align: center; margin: 1em 0; }
.ill-block img { max-width: 100%; height: auto; }
${buildOverrideCss(s, customFontRel)}
`);

  const newTitle = (book.title || 'Без названия').trim();
  const newAuthor = (book.author || '').trim();

  if (book.cover && !book.cover.removed && book.cover.blob) {
    const ext = book.cover.mime.includes('png') ? 'png' : 'jpg';
    outZip.file(`OEBPS/images/cover.${ext}`, book.cover.blob);
    manifestLines.push(`<item id="cover-img" href="images/cover.${ext}" media-type="${book.cover.mime}" properties="cover-image"/>`);
    outZip.file('OEBPS/cover.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(newTitle)}</title>
<style>body,html{margin:0;padding:0;height:100%;text-align:center;}img{max-width:100%;max-height:100%;}</style>
</head><body><div><img src="images/cover.${ext}" alt="Cover"/></div></body></html>`);
    manifestLines.push(`<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
    spineLines.push(`<itemref idref="cover-page"/>`);
  }

    const descText = (book.description || '').trim();
  if (descText && s.insertDescPage !== false) {
    const pars = descText.split(/\r?\n+/).filter(Boolean).map(p => `<p>${escapeXml(p)}</p>`).join('\n');
    outZip.file('OEBPS/annotation.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Аннотация</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><h2>Аннотация</h2>\n${pars}\n</body></html>`);
    manifestLines.push(`<item id="annot-page" href="annotation.xhtml" media-type="application/xhtml+xml"/>`);
    spineLines.push(`<itemref idref="annot-page"/>`);
  }

  const keptImages = book.images.filter(i => !i.markedDelete);
  const deletedImgIds = new Set(book.images.filter(i => i.markedDelete).map(i => i.id));
  keptImages.forEach((img, idx) => {
    outZip.file(`OEBPS/images/${img.id}`, img.blob);
    manifestLines.push(`<item id="img-${idx}" href="images/${escapeXml(img.id)}" media-type="${img.mime}"/>`);
  });

  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const activeChapters = book.chapters.filter(c => !c.markedDelete);

  const kindleState = { page: 0, charAcc: 0, entries: [] };
  activeChapters.forEach((ch, idx) => {
    const fileId = `ch-${idx + 1}`;
    const fileName = `${fileId}.xhtml`;
    const doc = parser.parseFromString(`<div xmlns="http://www.w3.org/1999/xhtml">${ch.html}</div>`, 'application/xml');

    doc.querySelectorAll('img[data-img-id]').forEach(el => {
      if (deletedImgIds.has(el.getAttribute('data-img-id'))) {
        const wrap = el.closest('.ill-block');
        if (wrap) wrap.remove();
        else el.remove();
      } else {
        el.removeAttribute('data-img-id');
      }
    });

    doc.querySelectorAll('p').forEach(p => {
      if (s.cleanEmpty && (p.classList.contains('empty-line') || isParagraphEmpty(p))) {
        p.remove();
        return;
      }
      processParagraphTextNodes(p, doc, s);
    });

    const bodyInner = Array.from(doc.documentElement.childNodes).map(n => serializer.serializeToString(n)).join('\n');
    outZip.file(`OEBPS/${fileName}`, `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(ch.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>\n${bodyInner}\n</body></html>`);

    manifestLines.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spineLines.push(`<itemref idref="${fileId}"/>`);
    navPoints.push(`<navPoint id="nav-${idx + 1}" playOrder="${idx + 1}"><navLabel><text>${escapeXml(ch.title)}</text></navLabel><content src="${fileName}"/></navPoint>`);
  });

  const bookUuid = 'urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : Date.now());
  const seriesMeta = book.series && book.series.trim()
    ? `<meta name="calibre:series" content="${escapeXml(book.series.trim())}"/>` +
      (book.seriesIndex && book.seriesIndex.trim() ? `<meta name="calibre:series_index" content="${escapeXml(book.seriesIndex.trim())}"/>` : '')
    : '';

  outZip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookUuid}"/></head>
  <docTitle><text>${escapeXml(newTitle)}</text></docTitle>
  <navMap>${navPoints.join('')}</navMap>
  ${s.kindlePages !== false && kindleState.entries.length ? `<pageList>${kindleState.entries.map((e, i) => `<pageTarget id="pt-${e.page}" type="normal" value="${e.page}" playOrder="${10000 + i}"><navLabel><text>${e.page}</text></navLabel><content src="${e.href}"/></pageTarget>`).join('')}</pageList>` : ''}
</ncx>`);

  outZip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(newTitle)}</dc:title>
    <dc:creator>${escapeXml(newAuthor || 'Неизвестный автор')}</dc:creator>
    <dc:language>ru</dc:language>
    ${descText ? `<dc:description>${escapeXml(descText)}</dc:description>` : ''}
    <dc:identifier id="BookId">${bookUuid}</dc:identifier>
    ${book.cover && !book.cover.removed ? '<meta name="cover" content="cover-img"/>' : ''}
    ${seriesMeta}
  </metadata>
  <manifest>${manifestLines.join('\n')}</manifest>
  <spine toc="ncx">${spineLines.join('\n')}</spine>
</package>`);

  return await outZip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
