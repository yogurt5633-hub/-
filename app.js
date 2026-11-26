const state = {
  mode: null, // 'epub' | 'converted'
  originalName: 'book',
  zip: null,
  opfPath: '',
  opfDir: '',
  title: '',
  author: '',
  cover: null, // { blob, mime, url, originalPath, id, changed, removed }
  images: [],  // { id, path, name, size, mime, blob, url, markedDelete }
  sampleParagraphs: [],
  totalChapters: 0,
  totalParagraphs: 0,
  convertedChapters: [] // { title, html } для FB2 / TXT
};

const els = {
  dropZone: document.getElementById('dropZone'),
  workspace: document.getElementById('workspace'),
  fileInput: document.getElementById('fileInput'),
  selectFileBtn: document.getElementById('selectFileBtn'),
  resetBtn: document.getElementById('resetBtn'),
  formatBadge: document.getElementById('formatBadge'),
  coverImg: document.getElementById('coverImg'),
  coverPlaceholder: document.querySelector('.cover-placeholder'),
  coverInput: document.getElementById('coverInput'),
  changeCoverBtn: document.getElementById('changeCoverBtn'),
  removeCoverBtn: document.getElementById('removeCoverBtn'),
  titleInput: document.getElementById('titleInput'),
  authorInput: document.getElementById('authorInput'),
  statChapters: document.getElementById('statChapters'),
  statParagraphs: document.getElementById('statParagraphs'),
  statImages: document.getElementById('statImages'),
  removeIndentToggle: document.getElementById('removeIndentToggle'),
  cleanEmptyToggle: document.getElementById('cleanEmptyToggle'),
  spacingRange: document.getElementById('spacingRange'),
  spacingVal: document.getElementById('spacingVal'),
  marginLine: document.getElementById('marginLine'),
  livePreview: document.getElementById('livePreview'),
  imagesToolbar: document.getElementById('imagesToolbar'),
  selectedCount: document.getElementById('selectedCount'),
  selectAllImgsBtn: document.getElementById('selectAllImgsBtn'),
  keepAllImgsBtn: document.getElementById('keepAllImgsBtn'),
  emptyImagesState: document.getElementById('emptyImagesState'),
  imagesGrid: document.getElementById('imagesGrid'),
  statusText: document.getElementById('statusText'),
  exportBtn: document.getElementById('exportBtn')
};

// Утилиты путей внутри ZIP-архива EPUB
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

function cleanupObjectUrls() {
  if (state.cover && state.cover.url) URL.revokeObjectURL(state.cover.url);
  state.images.forEach(img => {
    if (img.url) URL.revokeObjectURL(img.url);
  });
}

// События загрузки
els.selectFileBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});

els.resetBtn.addEventListener('click', () => {
  cleanupObjectUrls();
  els.fileInput.value = '';
  els.workspace.classList.add('hidden');
  els.resetBtn.classList.add('hidden');
  els.dropZone.classList.remove('hidden');
});

async function handleFile(file) {
  cleanupObjectUrls();
  state.images = [];
  state.cover = null;
  state.sampleParagraphs = [];
  state.convertedChapters = [];
  state.totalChapters = 0;
  state.totalParagraphs = 0;
  state.originalName = file.name.replace(/\.(epub|fb2\.zip|fb2|txt)$/i, '');

  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith('.epub')) {
      els.formatBadge.textContent = 'EPUB';
      await parseEpubFile(file);
    } else if (lower.endsWith('.fb2') || lower.endsWith('.fb2.zip')) {
      els.formatBadge.textContent = 'FB2 → EPUB';
      await parseFb2File(file);
    } else if (lower.endsWith('.txt')) {
      els.formatBadge.textContent = 'TXT → EPUB';
      await parseTxtFile(file);
    } else {
      alert('Формат не поддерживается. Выберите файл EPUB, FB2 или TXT.');
      return;
    }

    renderWorkspace();
  } catch (err) {
    console.error(err);
    alert('Не удалось прочитать книгу: ' + err.message);
  }
}

// Чтение EPUB
async function parseEpubFile(file) {
  state.mode = 'epub';
  const zip = await JSZip.loadAsync(file);
  state.zip = zip;

  const containerXml = await zip.file('META-INF/container.xml').async('string');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  state.opfPath = rootfile.getAttribute('full-path');
  state.opfDir = state.opfPath.includes('/') ? state.opfPath.slice(0, state.opfPath.lastIndexOf('/')) : '';

  const opfXml = await zip.file(state.opfPath).async('string');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  const titleNode = opfDoc.getElementsByTagNameNS('*', 'title')[0];
  const creatorNode = opfDoc.getElementsByTagNameNS('*', 'creator')[0];
  state.title = titleNode ? titleNode.textContent.trim() : state.originalName;
  state.author = creatorNode ? creatorNode.textContent.trim() : '';

  // Определяем обложку
  let coverId = null;
  const metas = Array.from(opfDoc.getElementsByTagNameNS('*', 'meta'));
  for (const m of metas) {
    if (m.getAttribute('name') === 'cover' && m.getAttribute('content')) {
      coverId = m.getAttribute('content');
      break;
    }
  }

  const manifestItems = Array.from(opfDoc.getElementsByTagNameNS('*', 'item'));
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

  const coverZipPath = coverItem ? resolveZipPath(state.opfDir, coverItem.getAttribute('href')) : null;

  // Сбор изображений и глав
  const htmlPaths = [];
  for (const item of manifestItems) {
    const media = item.getAttribute('media-type') || '';
    const href = item.getAttribute('href') || '';
    const fullPath = resolveZipPath(state.opfDir, href);
    const zipEntry = zip.file(fullPath);
    if (!zipEntry) continue;

    if (media.startsWith('image/')) {
      const blob = await zipEntry.async('blob');
      const url = URL.createObjectURL(blob);
      if (fullPath === coverZipPath) {
        state.cover = {
          blob,
          mime: media,
          url,
          originalPath: fullPath,
          id: item.getAttribute('id'),
          changed: false,
          removed: false
        };
      } else {
        state.images.push({
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
    } else if (media.includes('xhtml') || media.includes('html')) {
      htmlPaths.push(fullPath);
    }
  }

  state.totalChapters = htmlPaths.length;

  // Подсчет абзацев и выборка живого примера текста
  for (const path of htmlPaths) {
    const raw = await zip.file(path).async('string');
    const doc = parser.parseFromString(raw, 'text/html');
    const ps = Array.from(doc.querySelectorAll('p'));
    for (const p of ps) {
      const text = (p.textContent || '').trim();
      if (text.length > 0) {
        state.totalParagraphs++;
        if (state.sampleParagraphs.length < 5 && text.length > 45) {
          state.sampleParagraphs.push(p.textContent);
        }
      }
    }
  }
}

// Чтение и разбор FB2 (включая .fb2.zip)
async function parseFb2File(file) {
  state.mode = 'converted';
  let buffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith('.zip')) {
    const z = await JSZip.loadAsync(buffer);
    const fb2Entry = Object.values(z.files).find(f => !f.dir && f.name.toLowerCase().endsWith('.fb2'));
    if (!fb2Entry) throw new Error('В архиве не найден файл FB2');
    buffer = await fb2Entry.async('arraybuffer');
  }

  // Определение кодировки (UTF-8 или Windows-1251)
  const headAscii = new TextDecoder('ascii').decode(buffer.slice(0, 250));
  const encMatch = headAscii.match(/encoding=["']([^"']+)["']/i);
  const encoding = encMatch ? encMatch[1].toLowerCase() : 'utf-8';
  const xmlText = new TextDecoder(encoding === 'windows-1251' ? 'windows-1251' : 'utf-8').decode(buffer);

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const bookTitle = doc.querySelector('title-info > book-title');
  state.title = bookTitle ? bookTitle.textContent.trim() : state.originalName;

  const firstName = doc.querySelector('title-info > author > first-name')?.textContent || '';
  const lastName = doc.querySelector('title-info > author > last-name')?.textContent || '';
  state.author = `${firstName} ${lastName}`.trim();

  let coverHref = doc.querySelector('title-info > coverpage > image')?.getAttribute('l:href')
    || doc.querySelector('title-info > coverpage > image')?.getAttribute('xlink:href')
    || doc.querySelector('title-info > coverpage > image')?.getAttribute('href') || '';
  if (coverHref.startsWith('#')) coverHref = coverHref.slice(1);

  const binaries = Array.from(doc.getElementsByTagName('binary'));
  for (const bin of binaries) {
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
      state.cover = { blob, mime, url, originalPath: id, id, changed: false, removed: false };
    } else {
      state.images.push({
        id,
        path: 'images/' + id,
        name: id,
        size: blob.size,
        mime,
        blob,
        url,
        markedDelete: false
      });
    }
  }

  const sections = Array.from(doc.querySelectorAll('body > section'));
  const targetNodes = sections.length ? sections : Array.from(doc.querySelectorAll('body'));

  targetNodes.forEach((sec, idx) => {
    const titleEl = sec.querySelector(':scope > title');
    const chTitle = titleEl ? titleEl.textContent.trim() : `Глава ${idx + 1}`;
    const lines = [];
    if (titleEl) lines.push(`<h2>${escapeXml(chTitle)}</h2>`);

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
          state.totalParagraphs++;
          if (state.sampleParagraphs.length < 5 && txt.trim().length > 45) {
            state.sampleParagraphs.push(txt);
          }
        }
        lines.push(`<p>${escapeXml(txt)}</p>`);
      }
    });

    state.convertedChapters.push({ title: chTitle, html: lines.join('\n') });
  });

  state.totalChapters = state.convertedChapters.length;
}

// Чтение TXT
async function parseTxtFile(file) {
  state.mode = 'converted';
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (text.includes('\uFFFD')) {
    text = new TextDecoder('windows-1251').decode(buffer);
  }

  state.title = state.originalName;
  state.author = '';

  const rawLines = text.split(/\r?\n/);
  const htmlLines = [];
  for (const line of rawLines) {
    if (line.trim() === '') {
      htmlLines.push('<p class="empty-line"></p>');
    } else {
      state.totalParagraphs++;
      if (state.sampleParagraphs.length < 5 && line.trim().length > 45) {
        state.sampleParagraphs.push(line);
      }
      htmlLines.push(`<p>${escapeXml(line)}</p>`);
    }
  }

  state.convertedChapters = [{ title: state.title, html: htmlLines.join('\n') }];
  state.totalChapters = 1;
}

// Отрисовка интерфейса после загрузки книги
function renderWorkspace() {
  els.dropZone.classList.add('hidden');
  els.workspace.classList.remove('hidden');
  els.resetBtn.classList.remove('hidden');

  els.titleInput.value = state.title;
  els.authorInput.value = state.author;
  els.statChapters.textContent = state.totalChapters;
  els.statParagraphs.textContent = state.totalParagraphs;
  els.statImages.textContent = state.images.length;

  renderCover();
  renderPreview();
  renderImagesGrid();
  els.statusText.textContent = 'Готово к сборке';
}

function renderCover() {
  if (state.cover && !state.cover.removed && state.cover.url) {
    els.coverImg.src = state.cover.url;
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
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (state.cover && state.cover.url) URL.revokeObjectURL(state.cover.url);
  state.cover = {
    blob: file,
    mime: file.type || 'image/jpeg',
    url: URL.createObjectURL(file),
    originalPath: state.cover ? state.cover.originalPath : null,
    id: state.cover ? state.cover.id : null,
    changed: true,
    removed: false
  };
  renderCover();
});

els.removeCoverBtn.addEventListener('click', () => {
  if (state.cover) state.cover.removed = true;
  renderCover();
});

// Настройки абзацев и превью
function renderPreview() {
  const noIndent = els.removeIndentToggle.checked;
  const gap = parseFloat(els.spacingRange.value);
  els.spacingVal.textContent = gap.toFixed(2) + ' em';

  els.livePreview.style.setProperty('--preview-indent', noIndent ? '0px' : '1.5em');
  els.livePreview.style.setProperty('--preview-gap', gap + 'em');
  els.marginLine.style.opacity = noIndent ? '1' : '0.25';

  const samples = state.sampleParagraphs.length > 0
    ? state.sampleParagraphs
    : [
        'Первый абзац текста показывает, как будет выглядеть страница вашей книги после сохранения.',
        'Красная строка убрана в ноль, а между абзацами добавлен аккуратный воздушный интервал.',
        'Даже если в исходной книге были смешаны разные стили и пустые строки, вёрстка станет единой.'
      ];

  els.livePreview.innerHTML = samples
    .map(p => `<p>${escapeXml(noIndent ? cleanLeadingSpaces(p) : p)}</p>`)
    .join('');
}

els.removeIndentToggle.addEventListener('change', renderPreview);
els.cleanEmptyToggle.addEventListener('change', renderPreview);
els.spacingRange.addEventListener('input', renderPreview);

// Галерея картинок внутри книги
function renderImagesGrid() {
  els.imagesGrid.innerHTML = '';
  if (state.images.length === 0) {
    els.emptyImagesState.classList.remove('hidden');
    els.imagesToolbar.classList.add('hidden');
    return;
  }

  els.emptyImagesState.classList.add('hidden');
  els.imagesToolbar.classList.remove('hidden');

  state.images.forEach((img, index) => {
    const card = document.createElement('div');
    card.className = 'img-card' + (img.markedDelete ? ' marked-delete' : '');
    card.innerHTML = `
      <div class="img-thumb-wrap">
        <img src="${img.url}" loading="lazy" alt="">
      </div>
      <div class="img-meta">
        <span class="img-name" title="${escapeXml(img.name)}">${formatBytes(img.size)}</span>
        <span class="img-status">${img.markedDelete ? 'Удалить' : 'Оставить'}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      state.images[index].markedDelete = !state.images[index].markedDelete;
      renderImagesGrid();
    });
    els.imagesGrid.appendChild(card);
  });

  const deletedCount = state.images.filter(i => i.markedDelete).length;
  els.selectedCount.textContent = `Выбрано на удаление: ${deletedCount} из ${state.images.length}`;
}

els.selectAllImgsBtn.addEventListener('click', () => {
  state.images.forEach(i => { i.markedDelete = true; });
  renderImagesGrid();
});

els.keepAllImgsBtn.addEventListener('click', () => {
  state.images.forEach(i => { i.markedDelete = false; });
  renderImagesGrid();
});

// Единый CSS для вшивания в книгу
function buildOverrideCss(noIndent, gapEm) {
  return `
/* Unslop Book Typography Override */
p {
  text-indent: ${noIndent ? '0 !important' : '1.5em'} ;
  margin-top: 0 !important;
  margin-bottom: ${gapEm}em !important;
}
div.paragraph, .p, .text {
  text-indent: ${noIndent ? '0 !important' : '1.5em'} ;
}
`;
}

// Сборка и скачивание готового EPUB
els.exportBtn.addEventListener('click', async () => {
  els.exportBtn.disabled = true;
  els.statusText.textContent = 'Собираем чистый EPUB...';

  try {
    const newTitle = els.titleInput.value.trim() || 'Без названия';
    const newAuthor = els.authorInput.value.trim();
    const noIndent = els.removeIndentToggle.checked;
    const cleanEmpty = els.cleanEmptyToggle.checked;
    const gapEm = parseFloat(els.spacingRange.value);

    let outBlob;
    if (state.mode === 'epub') {
      outBlob = await exportModifiedEpub({ newTitle, newAuthor, noIndent, cleanEmpty, gapEm });
    } else {
      outBlob = await exportFreshEpub({ newTitle, newAuthor, noIndent, cleanEmpty, gapEm });
    }

    const safeFileName = newTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'book';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(outBlob);
    link.download = `${safeFileName}.epub`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    els.statusText.textContent = 'Файл сохранён';
  } catch (err) {
    console.error(err);
    alert('Ошибка при сборке EPUB: ' + err.message);
    els.statusText.textContent = 'Ошибка сборки';
  } finally {
    els.exportBtn.disabled = false;
  }
});

// Модификация существующего EPUB
async function exportModifiedEpub({ newTitle, newAuthor, noIndent, cleanEmpty, gapEm }) {
  const zip = state.zip;
  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  const opfXml = await zip.file(state.opfPath).async('string');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // 1. Обновление названия и автора
  let titleNode = opfDoc.getElementsByTagNameNS('*', 'title')[0];
  const metadataNode = opfDoc.getElementsByTagNameNS('*', 'metadata')[0];
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

  // Также обновим заголовок в toc.ncx, если он есть
  const ncxItem = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).find(
    i => (i.getAttribute('media-type') || '').includes('ncx')
  );
  if (ncxItem) {
    const ncxPath = resolveZipPath(state.opfDir, ncxItem.getAttribute('href'));
    if (zip.file(ncxPath)) {
      const ncxStr = await zip.file(ncxPath).async('string');
      const ncxDoc = parser.parseFromString(ncxStr, 'application/xml');
      const docTitleText = ncxDoc.querySelector('docTitle > text');
      if (docTitleText) {
        docTitleText.textContent = newTitle;
        zip.file(ncxPath, serializer.serializeToString(ncxDoc));
      }
    }
  }

  const manifestNode = opfDoc.getElementsByTagNameNS('*', 'manifest')[0];
  const spineNode = opfDoc.getElementsByTagNameNS('*', 'spine')[0];

  // 2. Обработка удаления выбранных иллюстраций
  const deletedPaths = new Set(state.images.filter(i => i.markedDelete).map(i => i.path));
  const deletedIds = new Set(state.images.filter(i => i.markedDelete).map(i => i.id));

  for (const delPath of deletedPaths) {
    zip.remove(delPath);
  }

  Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).forEach(item => {
    if (deletedIds.has(item.getAttribute('id'))) {
      item.remove();
    }
  });

  // 3. Обновление или замена обложки
  if (state.cover) {
    if (state.cover.removed && state.cover.originalPath) {
      zip.remove(state.cover.originalPath);
      if (state.cover.id) {
        const cItem = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).find(i => i.getAttribute('id') === state.cover.id);
        if (cItem) cItem.remove();
      }
    } else if (state.cover.changed && !state.cover.removed) {
      const ext = state.cover.mime.includes('png') ? 'png' : state.cover.mime.includes('webp') ? 'webp' : 'jpg';
      if (state.cover.originalPath) {
        zip.file(state.cover.originalPath, state.cover.blob);
        const cItem = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).find(i => i.getAttribute('id') === state.cover.id);
        if (cItem) cItem.setAttribute('media-type', state.cover.mime);
      } else {
        const relImgHref = `images/custom-cover.${ext}`;
        const fullImgPath = resolveZipPath(state.opfDir, relImgHref);
        zip.file(fullImgPath, state.cover.blob);

        const imgItem = opfDoc.createElementNS(opfDoc.documentElement.namespaceURI, 'item');
        imgItem.setAttribute('id', 'custom-cover-img');
        imgItem.setAttribute('href', relImgHref);
        imgItem.setAttribute('media-type', state.cover.mime);
        imgItem.setAttribute('properties', 'cover-image');
        manifestNode.appendChild(imgItem);

        const metaCover = opfDoc.createElementNS(opfDoc.documentElement.namespaceURI, 'meta');
        metaCover.setAttribute('name', 'cover');
        metaCover.setAttribute('content', 'custom-cover-img');
        metadataNode.appendChild(metaCover);

        // Страница обложки в начало книги
        const coverPageHref = 'custom-cover.xhtml';
        const coverPageFull = resolveZipPath(state.opfDir, coverPageHref);
        const coverXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(newTitle)}</title>
<style>body,html{margin:0;padding:0;height:100%;text-align:center;}img{max-width:100%;max-height:100%;object-fit:contain;}</style>
</head>
<body><div><img src="${relImgHref}" alt="Cover"/></div></body>
</html>`;
        zip.file(coverPageFull, coverXhtml);

        const pageItem = opfDoc.createElementNS(opfDoc.documentElement.namespaceURI, 'item');
        pageItem.setAttribute('id', 'custom-cover-page');
        pageItem.setAttribute('href', coverPageHref);
        pageItem.setAttribute('media-type', 'application/xhtml+xml');
        manifestNode.appendChild(pageItem);

        const itemref = opfDoc.createElementNS(opfDoc.documentElement.namespaceURI, 'itemref');
        itemref.setAttribute('idref', 'custom-cover-page');
        spineNode.insertBefore(itemref, spineNode.firstChild);
      }
    }
  }

  // 4. Добавляем чистый CSS-файл и правим все XHTML главы
  const cssRelHref = 'unslop-override.css';
  const cssFullPath = resolveZipPath(state.opfDir, cssRelHref);
  zip.file(cssFullPath, buildOverrideCss(noIndent, gapEm));

  if (!Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).some(i => i.getAttribute('id') === 'unslop-css')) {
    const cssItem = opfDoc.createElementNS(opfDoc.documentElement.namespaceURI, 'item');
    cssItem.setAttribute('id', 'unslop-css');
    cssItem.setAttribute('href', cssRelHref);
    cssItem.setAttribute('media-type', 'text/css');
    manifestNode.appendChild(cssItem);
  }

  const htmlItems = Array.from(opfDoc.getElementsByTagNameNS('*', 'item')).filter(item => {
    const m = item.getAttribute('media-type') || '';
    return (m.includes('xhtml') || m.includes('html')) && item.getAttribute('id') !== 'custom-cover-page';
  });

  for (const item of htmlItems) {
    const htmlPath = resolveZipPath(state.opfDir, item.getAttribute('href'));
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

    // Удаляем теги удаленных картинок из текста
    doc.querySelectorAll('img, image').forEach(imgEl => {
      const src = imgEl.getAttribute('src') || imgEl.getAttribute('xlink:href') || imgEl.getAttribute('href') || '';
      const resolved = resolveZipPath(htmlDir, src);
      if (deletedPaths.has(resolved)) {
        const parentSvg = imgEl.closest('svg');
        if (parentSvg) parentSvg.remove();
        else imgEl.remove();
      }
    });

    // Чистим абзацы: инлайновые text-indent, ручные пробелы и пустые абзацы
    doc.querySelectorAll('p').forEach(p => {
      if (cleanEmpty && isParagraphEmpty(p)) {
        p.remove();
        return;
      }
      if (p.hasAttribute('style')) {
        const cleanedStyle = p.getAttribute('style')
          .replace(/text-indent\s*:[^;]+;?/gi, '')
          .replace(/margin-(top|bottom)\s*:[^;]+;?/gi, '')
          .trim();
        if (cleanedStyle) p.setAttribute('style', cleanedStyle);
        else p.removeAttribute('style');
      }
      if (noIndent) {
        // Срезаем неразрывные/обычные пробелы в самом начале первого текстового узла абзаца
        const walker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
        const firstText = walker.nextNode();
        if (firstText && firstText.nodeValue) {
          firstText.nodeValue = cleanLeadingSpaces(firstText.nodeValue);
        }
      }
    });

    // Вычисляем относительный путь к нашему CSS от текущей главы
    const depth = htmlDir ? htmlDir.split('/').filter(Boolean).length : 0;
    const opfDepth = state.opfDir ? state.opfDir.split('/').filter(Boolean).length : 0;
    const upLevels = Math.max(0, depth - opfDepth);
    const relCssFromHtml = '../'.repeat(upLevels) + cssRelHref;

    const head = doc.querySelector('head');
    if (head && !head.querySelector('link[data-unslop="1"]')) {
      const linkEl = isXml
        ? doc.createElementNS('http://www.w3.org/1999/xhtml', 'link')
        : doc.createElement('link');
      linkEl.setAttribute('rel', 'stylesheet');
      linkEl.setAttribute('type', 'text/css');
      linkEl.setAttribute('href', relCssFromHtml);
      linkEl.setAttribute('data-unslop', '1');
      head.appendChild(linkEl);
    }

    const updatedStr = isXml ? serializer.serializeToString(doc) : doc.documentElement.outerHTML;
    zip.file(htmlPath, updatedStr);
  }

  zip.file(state.opfPath, serializer.serializeToString(opfDoc));

  // По стандарту EPUB файл mimetype обязан идти первым без сжатия
  const outZip = new JSZip();
  outZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  const allPaths = Object.keys(zip.files).filter(p => p !== 'mimetype' && !zip.files[p].dir);
  for (const p of allPaths) {
    const content = await zip.file(p).async('uint8array');
    outZip.file(p, content, { compression: 'DEFLATE' });
  }

  return await outZip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

// Генерация нового чистого EPUB (для сконвертированных FB2 и TXT)
async function exportFreshEpub({ newTitle, newAuthor, noIndent, cleanEmpty, gapEm }) {
  const outZip = new JSZip();
  outZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  outZip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const baseCss = `
body { font-family: serif; line-height: 1.5; margin: 0; padding: 0 4%; }
h1, h2, h3 { font-weight: 600; margin: 1.2em 0 0.6em; text-indent: 0; }
.ill-block { text-align: center; margin: 1em 0; }
.ill-block img { max-width: 100%; height: auto; }
${buildOverrideCss(noIndent, gapEm)}
`;
  outZip.file('OEBPS/style.css', baseCss);

  const manifestLines = [
    `<item id="css" href="style.css" media-type="text/css"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
  ];
  const spineLines = [];
  const navPoints = [];

  // Обложка, если задана
  if (state.cover && !state.cover.removed && state.cover.blob) {
    const ext = state.cover.mime.includes('png') ? 'png' : 'jpg';
    outZip.file(`OEBPS/images/cover.${ext}`, state.cover.blob);
    manifestLines.push(`<item id="cover-img" href="images/cover.${ext}" media-type="${state.cover.mime}" properties="cover-image"/>`);

    outZip.file('OEBPS/cover.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(newTitle)}</title>
<style>body,html{margin:0;padding:0;height:100%;text-align:center;}img{max-width:100%;max-height:100%;}</style>
</head>
<body><div><img src="images/cover.${ext}" alt="Cover"/></div></body>
</html>`);
    manifestLines.push(`<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
    spineLines.push(`<itemref idref="cover-page"/>`);
  }

  // Неудаленные картинки
  const keptImages = state.images.filter(i => !i.markedDelete);
  const deletedIds = new Set(state.images.filter(i => i.markedDelete).map(i => i.id));

  keptImages.forEach((img, idx) => {
    outZip.file(`OEBPS/images/${img.id}`, img.blob);
    manifestLines.push(`<item id="img-${idx}" href="images/${escapeXml(img.id)}" media-type="${img.mime}"/>`);
  });

  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  state.convertedChapters.forEach((ch, idx) => {
    const fileId = `ch-${idx + 1}`;
    const fileName = `${fileId}.xhtml`;

    const doc = parser.parseFromString(`<div xmlns="http://www.w3.org/1999/xhtml">${ch.html}</div>`, 'application/xml');
    doc.querySelectorAll('img[data-img-id]').forEach(el => {
      if (deletedIds.has(el.getAttribute('data-img-id'))) {
        const wrap = el.closest('.ill-block');
        if (wrap) wrap.remove();
        else el.remove();
      } else {
        el.removeAttribute('data-img-id');
      }
    });

    doc.querySelectorAll('p').forEach(p => {
      if (cleanEmpty && (p.classList.contains('empty-line') || isParagraphEmpty(p))) {
        p.remove();
        return;
      }
      if (noIndent && p.firstChild && p.firstChild.nodeType === 3) {
        p.firstChild.nodeValue = cleanLeadingSpaces(p.firstChild.nodeValue);
      }
    });

    const bodyInner = Array.from(doc.documentElement.childNodes)
      .map(n => serializer.serializeToString(n))
      .join('\n');

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${bodyInner}
</body>
</html>`;

    outZip.file(`OEBPS/${fileName}`, xhtml);
    manifestLines.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spineLines.push(`<itemref idref="${fileId}"/>`);
    navPoints.push(`
    <navPoint id="nav-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${fileName}"/>
    </navPoint>`);
  });

  const bookUuid = 'urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : Date.now());

  outZip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookUuid}"/></head>
  <docTitle><text>${escapeXml(newTitle)}</text></docTitle>
  <navMap>${navPoints.join('')}</navMap>
</ncx>`);

  outZip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(newTitle)}</dc:title>
    <dc:creator>${escapeXml(newAuthor || 'Неизвестный автор')}</dc:creator>
    <dc:language>ru</dc:language>
    <dc:identifier id="BookId">${bookUuid}</dc:identifier>
    ${state.cover && !state.cover.removed ? '<meta name="cover" content="cover-img"/>' : ''}
  </metadata>
  <manifest>
    ${manifestLines.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineLines.join('\n    ')}
  </spine>
</package>`);

  return await outZip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
