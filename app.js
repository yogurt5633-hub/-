const SETTINGS_KEY = 'pereplet_settings_v2';

const defaultSettings = {
  removeIndent: true,
  cleanEmpty: true,
  spacing: 0.85,
  fixDashes: true,
  fixTypo: false,
  fixDarkMode: true,
  stripMedia: true,
  kindleSeriesTitle: true,
  popupFootnotes: true,
  hyphenate: true,
  rebuildToc: true,
  compressImages: false,
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
  searchCoversBtn: document.getElementById('searchCoversBtn'),
  changeCoverBtn: document.getElementById('changeCoverBtn'),
  coverGalleryPanel: document.getElementById('coverGalleryPanel'),
  closeCoverGalleryBtn: document.getElementById('closeCoverGalleryBtn'),
  coverQueryInput: document.getElementById('coverQueryInput'),
  runCoverSearchBtn: document.getElementById('runCoverSearchBtn'),
  coverGalleryStatus: document.getElementById('coverGalleryStatus'),
  coverGalleryGrid: document.getElementById('coverGalleryGrid'),
  removeCoverBtn: document.getElementById('removeCoverBtn'),
  titleInput: document.getElementById('titleInput'),
  detectTitleBtn: document.getElementById('detectTitleBtn'),
  titleDetectiveBox: document.getElementById('titleDetectiveBox'),
  authorInput: document.getElementById('authorInput'),
  seriesInput: document.getElementById('seriesInput'),
  seriesIndexInput: document.getElementById('seriesIndexInput'),
  descInput: document.getElementById('descInput'),
  detectedOrigRow: document.getElementById('detectedOrigRow'),
  searchCandidatesBox: document.getElementById('searchCandidatesBox'),
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
  kindleSeriesTitleToggle: document.getElementById('kindleSeriesTitleToggle'),
  popupFootnotesToggle: document.getElementById('popupFootnotesToggle'),
  footnotesCountPill: document.getElementById('footnotesCountPill'),
  hyphenateToggle: document.getElementById('hyphenateToggle'),
  rebuildTocToggle: document.getElementById('rebuildTocToggle'),
  compressImagesToggle: document.getElementById('compressImagesToggle'),
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

  const opfXmlRaw = await zip.file(opfPath).async('string');
  const opfDoc = parser.parseFromString(opfXmlRaw, 'application/xml');

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
    typoHits: 0,
    footnoteHits: 0
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

    const chTitle = detectSmartChapterTitle(doc, chIndex);
    book.footnoteHits = (book.footnoteHits || 0) + countFootnotesInDoc(doc);
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

  const firstChTexts = book.chapters.slice(0, 6).map(c => c.snippet).join('\n');
  book. zipFileNames = Object.keys(zip.files);
  book.clues = extractOriginalCluesFromText(firstChTexts, opfXmlRaw);
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
    typoHits: 0,
    footnoteHits: 0
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
          const fnM = txt.match(INLINE_NOTE_RE);
          if (fnM) book.footnoteHits = (book.footnoteHits || 0) + fnM.length;
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
    typoHits: 0,
    footnoteHits: 0
  };

  const rawLines = text.split(/\r?\n/);
  let currentChTitle = originalName;
  let htmlLines = [];
  let chPlainAccum = '';

  function flushTxtChapter() {
    if (!htmlLines.length) return;
    book.chapters.push({
      id: `ch-${book.chapters.length + 1}`,
      title: currentChTitle,
      snippet: chPlainAccum.trim().slice(0, 110),
      charCount: chPlainAccum.trim().length,
      suspect: detectSuspectChapter(currentChTitle, chPlainAccum),
      markedDelete: false,
      html: htmlLines.join('\n')
    });
    htmlLines = [];
    chPlainAccum = '';
  }

  for (const line of rawLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length >= 4 && trimmedLine.length <= 80 && CHAPTER_HEADING_RE.test(trimmedLine) && htmlLines.length > 5) {
      flushTxtChapter();
      currentChTitle = trimmedLine;
      htmlLines.push(`<h2>${escapeXml(trimmedLine)}</h2>`);
      continue;
    }
    if (line.trim() === '') {
      htmlLines.push('<p class="empty-line"></p>');
    } else {
      book.totalParagraphs++;
      book.dashHits += applyDashFix(line, true).hits;
      book.typoHits += applyTypoFix(line).hits;
      if (book.sampleParagraphs.length < 5 && line.trim().length > 40) {
        book.sampleParagraphs.push(line);
      }
      chPlainAccum += line + ' ';
      const mNotes = line.match(INLINE_NOTE_RE);
      if (mNotes) book.footnoteHits += mNotes.length;
      htmlLines.push(`<p>${escapeXml(line)}</p>`);
    }
  }

  flushTxtChapter();

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
  if (els.kindleSeriesTitleToggle) els.kindleSeriesTitleToggle.checked = s.kindleSeriesTitle !== false;
  if (els.popupFootnotesToggle) els.popupFootnotesToggle.checked = s.popupFootnotes !== false;
  if (els.hyphenateToggle) els.hyphenateToggle.checked = s.hyphenate !== false;
  if (els.rebuildTocToggle) els.rebuildTocToggle.checked = s.rebuildToc !== false;
  if (els.compressImagesToggle) els.compressImagesToggle.checked = !!s.compressImages;
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
  if (els.kindleSeriesTitleToggle) bindSetting(els.kindleSeriesTitleToggle, 'kindleSeriesTitle', 'change');
  if (els.popupFootnotesToggle) bindSetting(els.popupFootnotesToggle, 'popupFootnotes', 'change');
  if (els.hyphenateToggle) bindSetting(els.hyphenateToggle, 'hyphenate', 'change');
  if (els.rebuildTocToggle) bindSetting(els.rebuildTocToggle, 'rebuildToc', 'change');
  if (els.compressImagesToggle) bindSetting(els.compressImagesToggle, 'compressImages', 'change');
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


function extractOriginalCluesFromText(rawText, opfXmlStr = '') {
  const clues = { isbn: '', origTitle: '', origAuthor: '' };
  const combined = (opfXmlStr + '\n' + (rawText || '').slice(0, 4000));

  // Ищем ISBN-13 или ISBN-10
  const isbnMatch = combined.match(/(?:isbn[^0-9xX]{0,10})?((?:97[89][-\s]?)?[0-9]{1,5}[-\s]?[0-9]+[-\s]?[0-9]+[-\s]?[0-9xX])/i);
  if (isbnMatch) {
    const digits = isbnMatch[1].replace(/[^0-9xX]/g, '');
    if (digits.length === 10 || digits.length === 13) clues.isbn = digits;
  }

  // Ищем строчки вида "Оригинальное название: ..." / "Original title: ..." / "Title: ..."
  const titlePatterns = [
    /(?:оригинальное\s+название|название\s+в\s+оригинале|original\s+title|orig\.\s*title)\s*[:—\-]\s*([^\n\r<]{2,90})/i,
    /©\s*[A-Z][a-z]+\s+[A-Z][a-z]+/
  ];
  const tm = (rawText || '').match(titlePatterns[0]);
  if (tm && tm[1]) {
    clues.origTitle = tm[1].replace(/["«»]/g, '').trim();
  }
  return clues;
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

async function translateText(text, targetLang = 'ru') {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=` + encodeURIComponent(trimmed);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Сервис перевода временно недоступен');
  const data = await res.json();
  return (data[0] || []).map(part => part[0]).join('');
}

async function translateToRussian(text) {
  return translateText(text, 'ru');
}

async function fetchGoogleBooksCandidates(query) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const out = [];
    for (const item of (data.items || [])) {
      const info = item.volumeInfo || {};
      const desc = stripHtmlTags(info.description || '');
      if (desc.length < 40) continue;
      let thumb = (info.imageLinks && (info.imageLinks.extraLarge || info.imageLinks.large || info.imageLinks.medium || info.imageLinks.thumbnail)) || '';
      if (thumb.startsWith('http://')) thumb = thumb.replace('http://', 'https://');
      out.push({
        title: info.title || 'Без названия',
        authors: (info.authors || []).join(', '),
        year: (info.publishedDate || '').slice(0, 4),
        description: desc,
        coverUrl: thumb
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function smartFindFanTranslationCandidates(book) {
  const cleanTitle = (book.title || '').replace(/[_\-]+/g, ' ').trim();
  const cleanAuthor = (book.author || '').trim();
  const clues = book.clues || {};
  const allCandidates = [];
  const seenKeys = new Set();

  function addUnique(list, sourceNote) {
    for (const c of list) {
      const key = (c.title + '|' + c.description.slice(0, 50)).toLowerCase();
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      allCandidates.push({ ...c, sourceNote });
    }
  }

  // Шаг 1: Если внутри файла книги нашёлся ISBN или "Оригинальное название: ..."
  if (clues.isbn) {
    addUnique(await fetchGoogleBooksCandidates(`isbn:${clues.isbn}`), `По ISBN из файла (${clues.isbn})`);
  }
  if (clues.origTitle) {
    addUnique(await fetchGoogleBooksCandidates(clues.origTitle), `По оригинальному названию из текста (${clues.origTitle})`);
  }

  // Шаг 2: Прямой поиск по русскому названию и автору
  if (cleanTitle && cleanAuthor) {
    addUnique(await fetchGoogleBooksCandidates(`${cleanTitle} ${cleanAuthor}`), 'Прямое совпадение');
  }

  // Шаг 3: Обратный перевод фанатского названия и автора на английский!
  let enTitle = '';
  let enAuthor = '';
  try {
    if (cleanTitle && hasCyrillic(cleanTitle)) enTitle = await translateText(cleanTitle, 'en');
    if (cleanAuthor && hasCyrillic(cleanAuthor)) enAuthor = await translateText(cleanAuthor, 'en');
  } catch {}

  if (cleanAuthor && hasCyrillic(cleanAuthor)) {
    for (const trA of transliterateRuName(cleanAuthor)) {
      if (enTitle) addUnique(await fetchGoogleBooksCandidates(`${enTitle} ${trA}`), `Перевод + транслит автора: «${enTitle}» · ${trA}`);
      addUnique(await fetchGoogleBooksCandidates(`inauthor:${trA}`), `Книги автора (${trA})`);
    }
  }
  if (enTitle && enAuthor) {
    addUnique(await fetchGoogleBooksCandidates(`${enTitle} ${enAuthor}`), `Перевод названия: «${enTitle}» · ${enAuthor}`);
  }
  if (enTitle) {
    addUnique(await fetchGoogleBooksCandidates(`intitle:${enTitle}`), `Перевод названия: «${enTitle}»`);
  }

  // Шаг 4: Если название перевели неузнаваемо — ищем все популярные книги этого автора (на англ. и рус.), чтобы дать выбрать из списка!
  if (enAuthor) {
    addUnique(await fetchGoogleBooksCandidates(`inauthor:${enAuthor}`), `Книги автора (${enAuthor})`);
  }
  if (cleanAuthor) {
    addUnique(await fetchGoogleBooksCandidates(`inauthor:${cleanAuthor}`), `Книги автора (${cleanAuthor})`);
  }
  if (cleanTitle && allCandidates.length === 0) {
    addUnique(await fetchGoogleBooksCandidates(cleanTitle), 'По названию');
  }

  return { candidates: allCandidates, enTitle, enAuthor, clues };
}

async function applyCandidateToBook(book, cand) {
  els.statusText.textContent = 'Подставляем и переводим аннотацию...';
  let desc = cand.description;
  if (!hasCyrillic(desc)) {
    try {
      desc = await translateToRussian(desc);
    } catch {}
  }
  book.description = desc;
  els.descInput.value = desc;

  if (els.detectedOrigRow) {
    els.detectedOrigRow.classList.remove('hidden');
    els.detectedOrigRow.textContent = `Оригинал: ${cand.title}${cand.authors ? ' — ' + cand.authors : ''}${cand.year ? ' (' + cand.year + ')' : ''}`;
  }
  els.statusText.textContent = 'Аннотация подставлена';
}

function renderCandidatesList(book, candidates) {
  if (!els.searchCandidatesBox) return;
  if (!candidates || candidates.length <= 1) {
    els.searchCandidatesBox.classList.add('hidden');
    els.searchCandidatesBox.innerHTML = '';
    return;
  }

  els.searchCandidatesBox.classList.remove('hidden');
  els.searchCandidatesBox.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);padding:2px 4px;">Другие варианты (нажмите, если у вас фанатское название):</div>';

  candidates.slice(0, 8).forEach((cand) => {
    const row = document.createElement('div');
    row.className = 'candidate-item';
    row.innerHTML = `
      <div class="candidate-main">
        <div class="candidate-title">${escapeXml(cand.title)} ${cand.year ? '(' + escapeXml(cand.year) + ')' : ''}</div>
        <div class="candidate-sub">${escapeXml(cand.authors || cand.sourceNote || '')}</div>
      </div>
      <div class="candidate-actions">
        ${cand.coverUrl ? '<button type="button" class="btn-secondary btn-sm take-cover-btn">Обложка</button>' : ''}
        <button type="button" class="btn-secondary btn-sm take-desc-btn">Выбрать</button>
      </div>
    `;

    row.querySelector('.take-desc-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await applyCandidateToBook(book, cand);
    });

    const coverBtn = row.querySelector('.take-cover-btn');
    if (coverBtn) {
      coverBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        coverBtn.disabled = true;
        coverBtn.textContent = '...';
        try {
          const res = await fetch(cand.coverUrl);
          const blob = await res.blob();
          if (book.cover && book.cover.url) URL.revokeObjectURL(book.cover.url);
          book.cover = {
            blob,
            mime: blob.type || 'image/jpeg',
            url: URL.createObjectURL(blob),
            originalPath: book.cover ? book.cover.originalPath : null,
            id: book.cover ? book.cover.id : null,
            changed: true,
            removed: false
          };
          renderCover();
          els.statusText.textContent = 'Обложка из сети установлена';
        } catch {
          alert('Не удалось скачать эту обложку напрямую.');
        } finally {
          coverBtn.disabled = false;
          coverBtn.textContent = 'Обложка';
        }
      });
    }

    row.addEventListener('click', async () => {
      await applyCandidateToBook(book, cand);
    });

    els.searchCandidatesBox.appendChild(row);
  });
}

if (els.findDescBtn) {
  els.findDescBtn.addEventListener('click', async () => {
    const book = activeBook();
    if (!book) return;
    const origLabel = els.findDescBtn.textContent;
    els.findDescBtn.disabled = true;
    els.findDescBtn.textContent = 'Ищем оригинал...';
    els.statusText.textContent = 'Проверяем ISBN, переводим название и ищем книги автора...';

    try {
      const { candidates } = await smartFindFanTranslationCandidates(book);
      if (!candidates.length) {
        alert('Ни по русскому, ни по английскому переводу названия ничего не нашлось. Попробуйте вписать хотя бы фамилию автора или оригинальное название в поле «Название книги».');
        els.statusText.textContent = 'Описание не найдено';
        return;
      }

      // Сразу применяем лучший первый вариант и показываем остальные варианты на выбор!
      await applyCandidateToBook(book, candidates[0]);
      renderCandidatesList(book, candidates);
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


const RU_STOP_CAP = new Set([
  'Глава', 'Часть', 'Пролог', 'Эпилог', 'Раздел', 'Книга', 'Том', 'Аннотация',
  'Когда', 'После', 'Перед', 'Через', 'Между', 'Потому', 'Поэтому', 'Однако',
  'Только', 'Просто', 'Сейчас', 'Сегодня', 'Вчера', 'Завтра', 'Здесь', 'Теперь',
  'Может', 'Конечно', 'Наверное', 'Кажется', 'Впрочем', 'Кстати', 'Наконец',
  'Словно', 'Будто', 'Точно', 'Вдруг', 'Почти', 'Совсем', 'Очень', ' Слишком',
  'Никто', 'Ничто', 'Никогда', 'Всегда', 'Иногда', 'Почему', 'Зачем', 'Откуда',
  'Сколько', 'Который', 'Которая', 'Которые', 'Такой', 'Такая', 'Такие', 'Этот',
  'жизнь', 'время', 'человек', 'глаза', 'руки', 'голова', 'голос', 'слово', 'место'
]);

function extractBookFingerprint(book) {
  // 1. Собираем текст из всех глав (сниппеты + образцы абзацев)
  const textPool = [
    ...(book.sampleParagraphs || []),
    ...book.chapters.slice(0, 15).map(c => `${c.title || ''}. ${c.snippet || ''}`)
  ].join(' ');

  // 2. Ищем слова с заглавной буквы ВНУТРИ предложений (не после точки!), чтобы найти именно Имена героев, Фамилии и Названия мест/академий
  const freq = new Map();
  const midSentenceRe = /[а-яёa-z,\-—:;]\s+([А-ЯЁ][а-яё]{3,14})/g;
  let m;
  while ((m = midSentenceRe.exec(textPool)) !== null) {
    const word = m[1];
    if (RU_STOP_CAP.has(word) || RU_STOP_CAP.has(word.toLowerCase())) continue;
    // Отсекаем глаголы и прилагательные по типичным окончаниям
    if (/(?:ать|ять|еть|ить|уть|лся|лась|лись|ющий|аяся|оеся|ого|ому|ыми|ими)$/i.test(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  const topEntities = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(e => e[0]);

  // 3. Проверяем внутренние имена файлов архива (часто обложка или папка внутри битого EPUB хранит настоящее английское название!)
  const fileClues = [];
  for (const fname of (book.zipFileNames || [])) {
    const base = fname.split('/').pop().replace(/\.[a-z0-9]+$/i, '');
    if (/^(?:index|split|part|section|chapter|ch|page|cover|style|stylesheet|toc|content|nav|title|image|img|pic|font)_?\d*$/i.test(base)) continue;
    const cleaned = base.replace(/[_\-]+/g, ' ').replace(/\d{3,}/g, '').trim();
    if (cleaned.length >= 5 && /[a-zA-Z]{4,}/.test(cleaned) && !/^(?:oebps|meta inf|ops|text|images|fonts)$/i.test(cleaned)) {
      fileClues.push(cleaned);
    }
  }

  // 4. Берём характерную цитату из первого длинного сюжетного абзаца
  const quoteSample = (book.sampleParagraphs && book.sampleParagraphs[0])
    ? book.sampleParagraphs[0].slice(0, 140).trim()
    : '';

  return {
    entities: topEntities,
    fileClue: fileClues[0] || '',
    isbn: (book.clues && book.clues.isbn) || '',
    origTitleClue: (book.clues && book.clues.origTitle) || '',
    quoteSample
  };
}

async function runDeepBookTitleDetective(book) {
  const fp = extractBookFingerprint(book);
  const foundMap = new Map();

  async function addFromQuery(q, reason) {
    if (!q || q.trim().length < 3) return;
    const list = await fetchGoogleBooksCandidates(q);
    for (const item of list) {
      const key = (item.title + '|' + item.authors).toLowerCase();
      if (!foundMap.has(key)) {
        foundMap.set(key, { ...item, reason });
      }
    }
  }

  // Уровень 1: Скрытые улики в файле (ISBN, "Оригинальное название", имя файла обложки внутри архива)
  if (fp.isbn) await addFromQuery(`isbn:${fp.isbn}`, `По скрытому ISBN (${fp.isbn})`);
  if (fp.origTitleClue) await addFromQuery(fp.origTitleClue, `Из текста («${fp.origTitleClue}»)`);
  if (fp.fileClue) await addFromQuery(fp.fileClue, `По имени файла внутри архива («${fp.fileClue}»)`);

  // Уровень 2: Поиск по СВЯЗКЕ главных героев/мест на русском (находит русские издания и фан-переводы в Google Books)
  if (fp.entities.length >= 2) {
    const ruCluster = fp.entities.slice(0, 3).join(' ');
    await addFromQuery(ruCluster, `По связке героев/мест: ${ruCluster}`);
    if (book.author && book.author.trim()) {
      await addFromQuery(`${ book.author.trim() } ${fp.entities[0]}`, `Автор + герой (${fp.entities[0]})`);
    }
  }

  // Уровень 3: Переводим связку главных героев + кусок текста на АНГЛИЙСКИЙ и ищем английский оригинал!
  let enEntities = '';
  if (fp.entities.length >= 2) {
    try {
      enEntities = await translateText(fp.entities.slice(0, 4).join(', '), 'en');
      const cleanEnCluster = enEntities.replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();
      await addFromQuery(cleanEnCluster, `По англ. связке героев: ${cleanEnCluster}`);
    } catch {}
  }

  // Если в книге было хоть какое-то битое/фанатское название — тоже пробуем его перевести в связке с главным героем
  const rawTitle = (book.title || '').replace(/[_\d]+/g, ' ').trim();
  if (rawTitle.length > 2 && !/^(?:без названия|book|epub|текст)$/i.test(rawTitle)) {
    try {
      const enTitleGuess = hasCyrillic(rawTitle) ? await translateText(rawTitle, 'en') : rawTitle;
      const hero = enEntities ? enEntities.split(',')[0].trim() : '';
      await addFromQuery(`${enTitleGuess} ${hero}`.trim(), `Перевод названия + герой: ${enTitleGuess}`);
    } catch {}
  }

  // Уровень 4: OpenLibrary поиск по английским ключевым словам сюжета/персонажей
  if (foundMap.size < 3 && enEntities) {
    try {
      const q = enEntities.replace(/,/g, ' ').trim();
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        for (const d of (data.docs || [])) {
          if (!d.title) continue;
          const key = (d.title + '|' + (d.author_name ? d.author_name[0] : '')).toLowerCase();
          if (!foundMap.has(key)) {
            foundMap.set(key, {
              title: d.title,
              authors: (d.author_name || []).join(', '),
              year: String(d.first_publish_year || ''),
              description: '',
              coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
              reason: `OpenLibrary (${q})`
            });
          }
        }
      }
    } catch {}
  }

  // Готовим для топ-4 находок варианты перевода названия на русский!
  const candidates = Array.from(foundMap.values()).slice(0, 4);
  for (const cand of candidates) {
    cand.titleVariants = [];
    const orig = cand.title.trim();

    if (hasCyrillic(orig)) {
      cand.titleVariants.push({ label: 'Русское название', value: orig });
      try {
        const enBack = await translateText(orig, 'en');
        if (enBack && enBack.toLowerCase() !== orig.toLowerCase()) {
          cand.titleVariants.push({ label: 'На англ.', value: enBack });
        }
      } catch {}
    } else {
      // Если найдена английская книга — делаем перевод названия на русский + оставляем оригинал и комбинированный вариант
      try {
        const ruTranslated = await translateToRussian(orig);
        if (ruTranslated) {
          cand.titleVariants.push({ label: 'Перевод на рус.', value: ruTranslated });
          cand.titleVariants.push({ label: 'Рус + Ориг', value: `${ruTranslated} (${orig})` });
        }
      } catch {}
      cand.titleVariants.push({ label: 'Оригинал (EN)', value: orig });
    }

    // Также переводим имя автора на русский, если оно на английском
    if (cand.authors && !hasCyrillic(cand.authors)) {
      try {
        cand.ruAuthors = await translateToRussian(cand.authors);
      } catch {
        cand.ruAuthors = cand.authors;
      }
    } else {
      cand.ruAuthors = cand.authors;
    }
  }

  return { fp, enEntities, candidates };
}

if (els.detectTitleBtn) {
  els.detectTitleBtn.addEventListener('click', async () => {
    const book = activeBook();
    if (!book) return;

    const oldBtnText = els.detectTitleBtn.textContent;
    els.detectTitleBtn.disabled = true;
    els.detectTitleBtn.textContent = 'Анализируем текст...';
    els.titleDetectiveBox.classList.remove('hidden');
    els.titleDetectiveBox.innerHTML = '<div class="detective-clues">Собираем имена героев, редкие слова и скрытые метки файла...</div>';

    try {
      const { fp, enEntities, candidates } = await runDeepBookTitleDetective(book);

      const cluesParts = [];
      if (fp.entities.length) cluesParts.push(`Герои/места в тексте: <b>${escapeXml(fp.entities.join(', '))}</b>`);
      if (enEntities) cluesParts.push(`На англ.: <b>${escapeXml(enEntities)}</b>`);
      if (fp.fileClue) cluesParts.push(`Скрытое имя в архиве: <b>${escapeXml(fp.fileClue)}</b>`);
      if (fp.isbn) cluesParts.push(`ISBN: <b>${escapeXml(fp.isbn)}</b>`);

      let html = `<div class="detective-clues">${cluesParts.join(' · ') || 'Текст проанализирован'}</div>`;

      if (!candidates.length) {
        html += `<div class="detective-clues">Точного совпадения в базах не нашлось. Попробуйте нажать по найденным именам выше или ввести одно ключевое слово в поле названия.</div>`;
        els.titleDetectiveBox.innerHTML = html;
        return;
      }

      els.titleDetectiveBox.innerHTML = html;

      candidates.forEach((cand) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'detective-item';

        const pillsHtml = (cand.titleVariants || []).map((v, i) => `
          <button type="button" class="title-choice-btn" data-idx="${i}">
            <span class="title-choice-tag">${escapeXml(v.label)}:</span>
            <b>${escapeXml(v.value)}</b>
          </button>
        `).join('');

        itemEl.innerHTML = `
          <div class="detective-head">
            <span class="detective-orig">${escapeXml(cand.reason || '')} · Автор: <b>${escapeXml(cand.ruAuthors || cand.authors || 'Неизвестен')}</b></span>
          </div>
          <div class="detective-pills">${pillsHtml}</div>
        `;

        itemEl.querySelectorAll('.title-choice-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const v = cand.titleVariants[Number(btn.getAttribute('data-idx'))];
            if (!v) return;
            book.title = v.value;
            els.titleInput.value = v.value;
            if (cand.ruAuthors && !book.author) {
              book.author = cand.ruAuthors;
              els.authorInput.value = cand.ruAuthors;
            }
            if (cand.description) {
              await applyCandidateToBook(book, cand);
            }
            renderQueue();
            els.statusText.textContent = `Установлено название: «${v.value}»`;
          });
        });

        els.titleDetectiveBox.appendChild(itemEl);
      });
    } catch (err) {
      els.titleDetectiveBox.innerHTML = `<div class="detective-clues">Ошибка при поиске: ${escapeXml(err.message)}</div>`;
    } finally {
      els.detectTitleBtn.disabled = false;
      els.detectTitleBtn.textContent = oldBtnText;
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
  if (els.detectedOrigRow) els.detectedOrigRow.classList.add('hidden');
  if (els.searchCandidatesBox) els.searchCandidatesBox.classList.add('hidden');
  if (els.coverGalleryPanel) els.coverGalleryPanel.classList.add('hidden');
  if (els.titleDetectiveBox) els.titleDetectiveBox.classList.add('hidden');

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
  if (els.footnotesCountPill) {
    const fHits = book.footnoteHits || 0;
    els.footnotesCountPill.textContent = fHits > 0 ? `Найдено: ${fHits}` : '0';
    els.footnotesCountPill.className = 'pill' + (fHits > 0 ? ' has-hits' : '');
  }

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


let activeEditionFilter = '';

async function fetchImageBlobSafe(url) {
  // Пробуем скачать напрямую, а если сервер обложек блокирует CORS — через безопасный прокси изображений
  const attempts = [
    url,
    `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`
  ];
  for (const u of attempts) {
    try {
      const res = await fetch(u);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) return blob;
      }
    } catch {}
  }
  throw new Error('Не удалось загрузить картинку');
}


function transliterateRuName(str) {
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
    'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };
  let out = '';
  for (const ch of (str || '')) {
    const low = ch.toLowerCase();
    if (map[low] !== undefined) {
      const tr = map[low];
      out += (ch === low) ? tr : (tr.charAt(0).toUpperCase() + tr.slice(1));
    } else {
      out += ch;
    }
  }
  // Популярные фонетические замены английских фамилий
  const variants = [out];
  if (/krik/i.test(out)) variants.push(out.replace(/krik/gi, 'Creek'), out.replace(/krik/gi, 'Krick'));
  if (/bl[eay]k/i.test(out)) variants.push(out.replace(/bl[eay]k/gi, 'Black'));
  if (/braun/i.test(out)) variants.push(out.replace(/braun/gi, 'Brown'));
  if (/smit/i.test(out)) variants.push(out.replace(/smit/gi, 'Smith'));
  if (/уайт|uayt/i.test(out)) variants.push(out.replace(/uayt/gi, 'White'));
  return variants;
}

async function searchAllEditionCovers(rawQuery, editionModifier = '') {
  const results = [];
  const seenUrls = new Set();

  function addCover(url, label) {
    if (!url) return;
    const cleanUrl = url.replace(/^http:\/\//i, 'https://');
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    results.push({ url: cleanUrl, label });
  }

  const book = activeBook();
  const bookTitle = (book && book.title ? book.title : rawQuery).trim();
  const bookAuthor = (book && book.author ? book.author : '').trim();

  // Собираем умный список поисковых запросов (от точных к широким, чтобы ВСЕГДА находить обложки!)
  const searchTerms = [];
  function pushTerm(t) {
    const clean = (t || '').replace(/\s+/g, ' ').trim();
    if (clean.length >= 2 && !searchTerms.includes(clean)) searchTerms.push(clean);
  }

  // 1. Оригинальный запрос пользователя
  pushTerm(editionModifier ? `${rawQuery} ${editionModifier}` : rawQuery);

  // 2. Если есть русское название и автор с говорящей фамилией (например "А. Г. Крик"):
  // Переводим ТОЛЬКО название на английский ("Lunar Eclipse"), а автора транслитерируем ("A. G. Creek" / "A. G. Krik")!
  let enTitleOnly = '';
  let enFullQuery = '';
  try {
    if (hasCyrillic(bookTitle)) {
      enTitleOnly = await translateText(bookTitle, 'en');
    } else {
      enTitleOnly = bookTitle;
    }
    if (hasCyrillic(rawQuery)) {
      enFullQuery = await translateText(rawQuery, 'en');
    }
  } catch {}

  if (bookAuthor && hasCyrillic(bookAuthor)) {
    const authorTranslitList = transliterateRuName(bookAuthor);
    for (const trAuth of authorTranslitList) {
      if (enTitleOnly) pushTerm(editionModifier ? `${enTitleOnly} ${trAuth} ${editionModifier}` : `${enTitleOnly} ${trAuth}`);
    }
  }

  if (enFullQuery) pushTerm(editionModifier ? `${enFullQuery} ${editionModifier}` : enFullQuery);

  // 3. Обязательно ищем ОТДЕЛЬНО по названию книги (на англ. и на рус.), если фамилия автора редкая или с инициалами!
  if (enTitleOnly) pushTerm(editionModifier ? `${enTitleOnly} ${editionModifier}` : enTitleOnly);
  if (bookTitle) pushTerm(bookTitle);

  // 1. Apple Books (ищем одновременно в US Store для оригиналов и в RU Store для русских книг!)
  for (const term of searchTerms.slice(0, 6)) {
    const countries = hasCyrillic(term) ? ['ru', 'us'] : ['us', 'gb'];
    for (const country of countries) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&media=ebook&limit=10`;
        const res = await fetch(itunesUrl);
        if (res.ok) {
          const data = await res.json();
          for (const item of (data.results || [])) {
            if (item.artworkUrl100) {
              const hdUrl = item.artworkUrl100.replace(/100x100bb/i, '1000x1000bb');
              const year = item.releaseDate ? item.releaseDate.slice(0, 4) : '';
              const authorShort = item.artistName ? ` · ${item.artistName}` : '';
              addCover(hdUrl, `${year || 'HD'}${authorShort}`);
            }
          }
        }
      } catch {}
    }
  }

  // 2. Google Books (отлично знает и русские книги, и мировые издания)
  for (const term of searchTerms.slice(0, 6)) {
    try {
      const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&maxResults=12`;
      const res = await fetch(gbUrl);
      if (res.ok) {
        const data = await res.json();
        for (const item of (data.items || [])) {
          const info = item.volumeInfo || {};
          const links = info.imageLinks;
          if (links) {
            let img = links.extraLarge || links.large || links.medium || links.thumbnail || '';
            img = img.replace('&edge=curl', '').replace('zoom=1', 'zoom=2');
            const yr = (info.publishedDate || '').slice(0, 4);
            addCover(img, `${info.title || 'Издание'}${yr ? ' (' + yr + ')' : ''}`);
          }
        }
      }
    } catch {}
  }

  // 3. OpenLibrary — все мировые переиздания и лимитки
  for (const term of searchTerms.slice(0, 4)) {
    try {
      const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=8`;
      const res = await fetch(olUrl);
      if (res.ok) {
        const data = await res.json();
        for (const doc of (data.docs || [])) {
          if (doc.cover_i) {
            addCover(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`, `${doc.title || 'Издание'} ${doc.first_publish_year || ''}`.trim());
          }
          if (doc.key && results.length < 28) {
            try {
              const edRes = await fetch(`https://openlibrary.org${doc.key}/editions.json?limit=18`);
              if (edRes.ok) {
                const edData = await edRes.json();
                for (const ed of (edData.entries || [])) {
                  if (ed.covers && ed.covers.length > 0) {
                    const fmt = ed.physical_format || ed.publish_date || 'Переиздание';
                    for (const cid of ed.covers) {
                      if (cid > 0) addCover(`https://covers.openlibrary.org/b/id/${cid}-L.jpg`, String(fmt));
                    }
                  }
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  return { results, enQuery: enTitleOnly || enFullQuery };
}

async function runCoverGallerySearch() {
  const book = activeBook();
  if (!book) return;
  const query = (els.coverQueryInput.value || `${book.title} ${book.author}`).trim();
  if (!query) {
    alert('Введите название книги или автора для поиска обложек.');
    return;
  }

  els.runCoverSearchBtn.disabled = true;
  els.coverGalleryStatus.textContent = 'Ищем оригиналы, переиздания и лимитки (переводим запрос на англ.)...';
  els.coverGalleryGrid.innerHTML = '';

  try {
    const { results, enQuery } = await searchAllEditionCovers(query, activeEditionFilter);
    if (!results.length) {
      els.coverGalleryStatus.textContent = 'Обложки не найдены. Попробуйте написать только оригинальное название или автора.';
      return;
    }

    const note = (enQuery && enQuery.toLowerCase() !== query.toLowerCase()) ? ` (поиск: ${enQuery})` : '';
    els.coverGalleryStatus.textContent = `Найдено обложек разных изданий: ${results.length}${note}. Нажмите на любую, чтобы установить:`;

    results.forEach(item => {
      const card = document.createElement('div');
      card.className = 'cg-card';
      card.innerHTML = `
        <div class="cg-img-wrap">
          <img src="${item.url}" loading="lazy" alt="Cover">
        </div>
        <div class="cg-caption" title="${escapeXml(item.label)}">${escapeXml(item.label)}</div>
      `;
      card.addEventListener('click', async () => {
        const cap = card.querySelector('.cg-caption');
        const oldText = cap.textContent;
        cap.textContent = 'Качаем...';
        try {
          const blob = await fetchImageBlobSafe(item.url);
          if (book.cover && book.cover.url) URL.revokeObjectURL(book.cover.url);
          book.cover = {
            blob,
            mime: blob.type || 'image/jpeg',
            url: URL.createObjectURL(blob),
            originalPath: book.cover ? book.cover.originalPath : null,
            id: book.cover ? book.cover.id : null,
            changed: true,
            removed: false
          };
          renderCover();
          cap.textContent = 'Установлена!';
          els.statusText.textContent = 'Новая обложка установлена';
        } catch (err) {
          alert('Не удалось скачать эту обложку: ' + err.message);
          cap.textContent = oldText;
        }
      });
      els.coverGalleryGrid.appendChild(card);
    });
  } finally {
    els.runCoverSearchBtn.disabled = false;
  }
}

if (els.searchCoversBtn) {
  els.searchCoversBtn.addEventListener('click', () => {
    const book = activeBook();
    if (!book) return;
    const isHidden = els.coverGalleryPanel.classList.contains('hidden');
    if (isHidden) {
      els.coverGalleryPanel.classList.remove('hidden');
      const clueTitle = (book.clues && book.clues.origTitle) ? book.clues.origTitle : book.title;
      els.coverQueryInput.value = `${clueTitle || ''} ${book.author || ''}`.trim();
      runCoverGallerySearch();
    } else {
      els.coverGalleryPanel.classList.add('hidden');
    }
  });
}

if (els.closeCoverGalleryBtn) {
  els.closeCoverGalleryBtn.addEventListener('click', () => {
    els.coverGalleryPanel.classList.add('hidden');
  });
}

if (els.runCoverSearchBtn) {
  els.runCoverSearchBtn.addEventListener('click', runCoverGallerySearch);
}

if (els.coverQueryInput) {
  els.coverQueryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCoverGallerySearch();
    }
  });
}

document.querySelectorAll('.cg-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.cg-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeEditionFilter = chip.getAttribute('data-edition') || '';
    runCoverGallerySearch();
  });
});

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


const INLINE_NOTE_RE = /(?:\(|\[)\s*(?:прим\.?\s*(?:пер|переводчика|авт|автора|ред)?\.?|п\/?п)\s*[:\-—]?\s*([^\)\]]{3,600})(?:\)|\])/gi;
const CHAPTER_HEADING_RE = /^(?:глава|часть|пролог|эпилог|интерлюдия|экстра|бонус|послесловие|предисловие|акт|том|chapter|part|prologue|epilogue)\b[^.!?]{0,70}$/i;

function countFootnotesInDoc(doc) {
  let count = 0;
  doc.querySelectorAll('a[href*="#"]').forEach(a => {
    const t = (a.textContent || '').trim();
    if (/^(?:\[?\d+\]?|\*+|примечание|сноска)$/i.test(t) || a.closest('sup')) count++;
  });
  const bodyTxt = doc.body ? (doc.body.textContent || '') : '';
  const inlineMatches = bodyTxt.match(INLINE_NOTE_RE);
  if (inlineMatches) count += inlineMatches.length;
  return count;
}

function detectSmartChapterTitle(doc, fallbackIndex) {
  const h = doc.querySelector('h1, h2, h3');
  if (h) {
    const ht = h.textContent.replace(/\s+/g, ' ').trim();
    if (ht && !/^(?:section|split|part|ch|doc|index|page)_?\d*$/i.test(ht)) return ht;
  }
  const ps = Array.from(doc.querySelectorAll('p')).slice(0, 8);
  for (const p of ps) {
    const pt = (p.textContent || '').replace(/\s+/g, ' ').trim();
    if (pt.length >= 4 && pt.length <= 85 && CHAPTER_HEADING_RE.test(pt)) {
      return pt;
    }
  }
  const t = doc.querySelector('title');
  if (t) {
    const tt = t.textContent.replace(/\s+/g, ' ').trim();
    if (tt && !/^(?:section|split|part|ch|doc|index|page|untitled|без названия)_?\d*$/i.test(tt)) return tt;
  }
  return `Раздел ${fallbackIndex}`;
}

// Русские слоговые мягкие переносы (­) + неразрывные предлоги ( )
const RU_VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
const RU_CONS = 'бвгджзклмнпрстфхцчшщБВГДЖЗКЛМНПРСТФХЦЧШЩ';
const SHY = '­';
const NBSP = ' ';

function hyphenateRussianWord(word) {
  if (word.length < 7) return word;
  let out = '';
  for (let i = 0; i < word.length; i++) {
    out += word[i];
    if (i < 2 || i >= word.length - 3) continue;
    const cur = word[i];
    const next = word[i + 1];
    const next2 = word[i + 2] || '';
    if ('ьъыЬЪЫ'.includes(next)) continue;
    if (RU_VOWELS.includes(cur) && RU_VOWELS.includes(next)) {
      out += SHY;
    } else if (RU_VOWELS.includes(cur) && RU_CONS.includes(next) && RU_VOWELS.includes(next2)) {
      out += SHY;
    } else if (RU_CONS.includes(cur) && RU_CONS.includes(next) && RU_VOWELS.includes(word[i - 1] || '') && (RU_VOWELS.includes(next2) || RU_CONS.includes(next2))) {
      out += SHY;
    }
  }
  return out;
}

function applyRussianHyphenationAndNbsp(text) {
  let out = text;
  // 1. Приклеиваем короткие предлоги и союзы к следующему слову
  out = out.replace(/(^|[\s«„(\u00A0])(в|во|к|ко|с|со|у|о|об|обо|и|а|но|да|не|ни|на|по|за|из|от|до|ан|же|бы|ли)\s+(?=\S)/gi, '$1$2' + NBSP);
  // 2. Приклеиваем частицы бы, же, ли к предыдущему слову
  out = out.replace(/([а-яёА-ЯЁ])\s+(бы|б|же|ж|ли|ль)(?=[\s.,!?;:»")]|$)/gi, '$1' + NBSP + '$2');
  // 3. Мягкие переносы длинных русских слов
  out = out.replace(/[а-яёА-ЯЁ]{7,}/g, (w) => hyphenateRussianWord(w));
  return out;
}

// Превращение обычных и инлайновых сносок переводчика "(Прим. пер.: ...)" во всплывающие Pop-up сноски Kindle
function upgradeDocFootnotesToKindlePopup(doc, isXml, chapIdx) {
  const nsEpub = 'http://www.idpf.org/2007/ops';
  const htmlNs = 'http://www.w3.org/1999/xhtml';
  if (isXml && doc.documentElement) {
    doc.documentElement.setAttribute('xmlns:epub', nsEpub);
  }

  // 1. Апгрейд существующих ссылок-сносок <a href="#note1">[1]</a>
  doc.querySelectorAll('a[href*="#"]').forEach(a => {
    const txt = (a.textContent || '').trim();
    if (!(/^(?:\[?\d+\]?|\*+|примечание|сноска)$/i.test(txt) || a.closest('sup'))) return;
    a.setAttribute('epub:type', 'noteref');
    a.setAttribute('role', 'doc-noteref');
    const href = a.getAttribute('href') || '';
    const hashIdx = href.indexOf('#');
    if (hashIdx !== -1) {
      const targetId = href.slice(hashIdx + 1);
      const targetEl = doc.getElementById(targetId);
      if (targetEl) {
        targetEl.setAttribute('epub:type', 'footnote');
        targetEl.setAttribute('role', 'doc-footnote');
      }
    }
  });

  // 2. Превращение внутритекстовых примечаний "(Прим. пер.: текст)" в компактный значок [п/п] + всплывающий <aside>
  let inlineCounter = 0;
  const createdAsides = [];

  doc.querySelectorAll('p').forEach(p => {
    const rawHtml = p.innerHTML;
    if (!/(?:прим|п\/?п)/i.test(rawHtml)) return;
    const replacedHtml = rawHtml.replace(INLINE_NOTE_RE, (fullMatch, noteBody) => {
      inlineCounter++;
      const noteId = `kpopup-fn-${chapIdx}-${inlineCounter}`;
      createdAsides.push({ id: noteId, text: noteBody.trim() });
      return `<sup><a href="#${noteId}" epub:type="noteref" role="doc-noteref">[п/п ${inlineCounter}]</a></sup>`;
    });
    if (replacedHtml !== rawHtml) {
      try {
        p.innerHTML = replacedHtml;
      } catch {}
    }
  });

  if (createdAsides.length > 0 && doc.body) {
    const container = isXml ? doc.createElementNS(htmlNs, 'div') : doc.createElement('div');
    container.setAttribute('style', 'margin-top:2em;border-top:1px solid #ccc;padding-top:0.5em;font-size:0.88em;');
    createdAsides.forEach((item, idx) => {
      const aside = isXml ? doc.createElementNS(htmlNs, 'aside') : doc.createElement('aside');
      aside.setAttribute('id', item.id);
      aside.setAttribute('epub:type', 'footnote');
      aside.setAttribute('role', 'doc-footnote');
      const p = isXml ? doc.createElementNS(htmlNs, 'p') : doc.createElement('p');
      p.textContent = `[п/п ${idx + 1}] ${item.text}`;
      aside.appendChild(p);
      container.appendChild(aside);
    });
    doc.body.appendChild(container);
  }
}

// Сжатие тяжёлых картинок под экран Kindle (макс. 1200px, JPEG 0.8)
async function compressImageBlobForKindle(blob, mime) {
  if (blob.size < 140 * 1024) return { blob, mime };
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1200;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((outBlob) => {
        if (outBlob && outBlob.size < blob.size) {
          resolve({ blob: outBlob, mime: 'image/jpeg' });
        } else {
          resolve({ blob, mime });
        }
      }, 'image/jpeg', 0.80);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob, mime });
    };
    img.src = url;
  });
}

function formatKindleBookTitle(rawTitle, series, seriesIndex, enabled) {
  const cleanTitle = (rawTitle || 'Без названия').trim();
  const cleanSeries = (series || '').trim();
  if (!enabled || !cleanSeries) return cleanTitle;
  if (cleanTitle.startsWith('[')) return cleanTitle;
  let numStr = '';
  if (seriesIndex && String(seriesIndex).trim()) {
    const rawNum = String(seriesIndex).trim();
    numStr = /^\d+$/.test(rawNum) ? ` #${rawNum.padStart(2, '0')}` : ` #${rawNum}`;
  }
  return `[${cleanSeries}${numStr}] ${cleanTitle}`;
}

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
    if (s.hyphenate !== false) val = applyRussianHyphenationAndNbsp(val);
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

  const newTitle = formatKindleBookTitle(book.title, book.series, book.seriesIndex, s.kindleSeriesTitle !== false);
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

    if (s.compressImages) {
    for (const img of book.images) {
      if (img.markedDelete) continue;
      const comp = await compressImageBlobForKindle(img.blob, img.mime);
      zip.file(img.path, comp.blob);
    }
  }

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
    if (s.popupFootnotes !== false) {
      upgradeDocFootnotesToKindlePopup(doc, true, idx + 1);
    }
    if (s.kindlePages !== false) {
      injectKindlePageAnchors(doc, true, fileName, kindleState);
    }

    if (s.popupFootnotes !== false) {
      upgradeDocFootnotesToKindlePopup(doc, isXml, item.getAttribute('id') || 'ch');
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

  if (ncxItem) {
    const ncxPath = resolveZipPath(book.opfDir, ncxItem.getAttribute('href'));
    const ncxDir = ncxPath.includes('/') ? ncxPath.slice(0, ncxPath.lastIndexOf('/')) : '';
    if (zip.file(ncxPath)) {
      const ncxDoc = parser.parseFromString(await zip.file(ncxPath).async('string'), 'application/xml');
      const nsNcx = ncxDoc.documentElement.namespaceURI || 'http://www.daisy.org/z3986/2005/ncx/';
      if (s.rebuildToc !== false) {
        const navMap = ncxDoc.getElementsByTagNameNS('*', 'navMap')[0];
        if (navMap) {
          navMap.innerHTML = '';
          const keptChs = book.chapters.filter(c => !c.markedDelete);
          keptChs.forEach((ch, idx) => {
            const np = ncxDoc.createElementNS(nsNcx, 'navPoint');
            np.setAttribute('id', `nav-${idx + 1}`);
            np.setAttribute('playOrder', String(idx + 1));
            const nl = ncxDoc.createElementNS(nsNcx, 'navLabel');
            const tx = ncxDoc.createElementNS(nsNcx, 'text');
            tx.textContent = ch.title || `Глава ${idx + 1}`;
            nl.appendChild(tx);
            const ct = ncxDoc.createElementNS(nsNcx, 'content');
            // Вычисляем путь относительно папки ncx
            const relFromOpf = ch.path.startsWith(book.opfDir ? book.opfDir + '/' : '')
              ? ch.path.slice(book.opfDir ? book.opfDir.length + 1 : 0)
              : ch.path;
            ct.setAttribute('src', relFromOpf);
            np.appendChild(nl);
            np.appendChild(ct);
            navMap.appendChild(np);
          });
        }
      }
      if (s.kindlePages !== false && kindleState.entries.length > 0) {
        appendNcxPageList(ncxDoc, kindleState.entries);
      }
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

  const newTitle = formatKindleBookTitle(book.title, book.series, book.seriesIndex, s.kindleSeriesTitle !== false);
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
  for (let idx = 0; idx < keptImages.length; idx++) {
    const img = keptImages[idx];
    const finalImg = s.compressImages ? await compressImageBlobForKindle(img.blob, img.mime) : { blob: img.blob, mime: img.mime };
    outZip.file(`OEBPS/images/${img.id}`, finalImg.blob);
    manifestLines.push(`<item id="img-${idx}" href="images/${escapeXml(img.id)}" media-type="${finalImg.mime}"/>`);
  }

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
