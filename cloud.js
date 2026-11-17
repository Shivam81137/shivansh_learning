/* ============================================================
   SHIVANSH PRO — Cloud layer (Supabase)
   - Syncs chapter progress between devices
   - Keeps a permanent study history
   - Shared PDF library (upload / open / delete)
   No SDK: plain fetch against the Supabase REST + Storage APIs.
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://swlohmedejtyocahzhmh.supabase.co';
  // Public (publishable) key — safe to ship in a web page.
  var SUPABASE_KEY = 'sb_publishable_jpTU-0bFARaD-SRcUTdSEw_8mDW6tMf';
  var BUCKET = 'study-pdfs';
  var MAX_PDF_BYTES = 50 * 1024 * 1024;
  // Allowed uploads: extension -> MIME type
  var FILE_TYPES = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', gif: 'image/gif'
  };
  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }
  function isImagePath(path) { return extOf(path) !== 'pdf'; }
  function stripExt(name) { return name.replace(/\.[a-z0-9]+$/i, ''); }
  var HISTORY_PAGE = 40;

  var LS_DEVICE = 'shivansh_cloud_device';
  var LS_QUEUE = 'shivansh_cloud_queue';
  var LS_SYNCED = 'shivansh_cloud_synced';

  /* ---------- tiny helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function lsGet(k, fallback) {
    try { var v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / blocked */ } }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function toast(msg) { if (typeof showToast === 'function') showToast(msg); }

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY
    }, opts.headers || {});
    return fetch(SUPABASE_URL + path, Object.assign({}, opts, { headers: headers })).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) { throw new Error('HTTP ' + res.status + ' ' + t.slice(0, 200)); });
      }
      var ct = res.headers.get('content-type') || '';
      return ct.indexOf('json') !== -1 ? res.json() : null;
    });
  }
  function jsonHeaders(extra) {
    return Object.assign({ 'Content-Type': 'application/json' }, extra || {});
  }

  /* ---------- device label ---------- */
  function getDevice() { return lsGet(LS_DEVICE, 'Shivansh'); }
  function toggleDevice() {
    var next = getDevice() === 'Shivansh' ? 'Parent' : 'Shivansh';
    lsSet(LS_DEVICE, next);
    renderDeviceChip();
  }
  function renderDeviceChip() {
    var chip = $('cloudDeviceChip');
    if (!chip) return;
    chip.textContent = '📱 ' + getDevice() + ' ⇄';
    chip.title = 'This device is used by ' + getDevice() + '. Tap to switch.';
  }

  /* ---------- chapter info from the page ---------- */
  var SUBJECT_LABELS = {
    maths: 'Maths', eng: 'English', chem: 'Chemistry', phys: 'Physics', bio: 'Biology',
    hist: 'History', geo: 'Geography', comp: 'Computer', imo: 'IMO'
  };
  function chapterInfo(id) {
    var card = $('card-' + id);
    var title = card && card.querySelector('.chapter-name');
    var subj = card ? card.getAttribute('data-subj') : '';
    return {
      title: title ? title.textContent.trim() : id,
      subject: SUBJECT_LABELS[subj] || subj || ''
    };
  }

  /* ---------- offline-safe write queue ---------- */
  function enqueue(op) {
    var q = lsGet(LS_QUEUE, []);
    q.push(op);
    lsSet(LS_QUEUE, q);
  }

  function sendToggle(op) {
    var progressReq;
    if (op.done) {
      progressReq = api('/rest/v1/chapter_progress?on_conflict=chapter_id', {
        method: 'POST',
        headers: jsonHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({
          chapter_id: op.id, subject: op.subject, chapter_title: op.title,
          done_at: op.at, device: op.device
        })
      });
    } else {
      progressReq = api('/rest/v1/chapter_progress?chapter_id=eq.' + encodeURIComponent(op.id), { method: 'DELETE' });
    }
    return progressReq.then(function () {
      return api('/rest/v1/study_history', {
        method: 'POST',
        headers: jsonHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({
          chapter_id: op.id, subject: op.subject, chapter_title: op.title,
          action: op.done ? 'done' : 'undone', device: op.device, created_at: op.at
        })
      });
    });
  }

  var flushing = false;
  function flushQueue() {
    if (flushing) return Promise.resolve();
    var q = lsGet(LS_QUEUE, []);
    if (!q.length) return Promise.resolve();
    flushing = true;
    var chain = Promise.resolve();
    q.forEach(function (op) {
      chain = chain.then(function () {
        return sendToggle(op).then(function () {
          var cur = lsGet(LS_QUEUE, []);
          cur.shift();            // ops are sent strictly in order
          lsSet(LS_QUEUE, cur);
        });
      });
    });
    return chain.then(function () { flushing = false; }, function (e) { flushing = false; throw e; });
  }

  /* Called by the page's toggleDone() */
  window.cloudRecordToggle = function (id, isDone) {
    var info = chapterInfo(id);
    var synced = lsGet(LS_SYNCED, []);
    var i = synced.indexOf(id);
    if (isDone && i === -1) synced.push(id);
    if (!isDone && i !== -1) synced.splice(i, 1);
    lsSet(LS_SYNCED, synced);

    enqueue({
      id: id, done: !!isDone, title: info.title, subject: info.subject,
      device: getDevice(), at: new Date().toISOString()
    });
    flushQueue().then(refreshHistoryIfOpen).catch(function () { /* stays queued, retried later */ });
  };

  /* ---------- pull progress from the cloud on load ---------- */
  function syncProgress() {
    return flushQueue().catch(function () { /* offline: keep going with local data */ })
      .then(function () { return api('/rest/v1/chapter_progress?select=*&limit=1000'); })
      .then(function (rows) {
        var remote = {};
        rows.forEach(function (r) { remote[r.chapter_id] = r; });
        var synced = lsGet(LS_SYNCED, []);
        var pendingIds = {};
        lsGet(LS_QUEUE, []).forEach(function (o) { pendingIds[o.id] = true; });
        var changed = false;
        var seedHistory = [];
        var seedProgress = [];

        // remote -> local
        Object.keys(remote).forEach(function (id) {
          if (pendingIds[id]) return;
          if (!doneSet.has(id)) {
            doneSet.add(id);
            changed = true;
          }
          var day = getLocalDateStr(new Date(remote[id].done_at));
          if (doneDates[id] !== day) { doneDates[id] = day; changed = true; }
          if (synced.indexOf(id) === -1) synced.push(id);
        });

        // local -> remote (first-time migration) or removed on another device
        Array.from(doneSet).forEach(function (id) {
          if (remote[id] || pendingIds[id]) return;
          if (synced.indexOf(id) !== -1) {
            // It was synced before and is now gone remotely: someone unticked it.
            doneSet.delete(id);
            delete doneDates[id];
            synced.splice(synced.indexOf(id), 1);
            changed = true;
          } else {
            var info = chapterInfo(id);
            var when = doneDates[id] ? new Date(String(doneDates[id]).slice(0, 10) + 'T12:00:00').toISOString() : new Date().toISOString();
            seedProgress.push({ chapter_id: id, subject: info.subject, chapter_title: info.title, done_at: when, device: getDevice() });
            seedHistory.push({ chapter_id: id, subject: info.subject, chapter_title: info.title, action: 'done', device: getDevice(), created_at: when });
            synced.push(id);
          }
        });

        lsSet(LS_SYNCED, synced);

        var seeding = Promise.resolve();
        if (seedProgress.length) {
          seeding = api('/rest/v1/chapter_progress?on_conflict=chapter_id', {
            method: 'POST', headers: jsonHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
            body: JSON.stringify(seedProgress)
          }).then(function () {
            return api('/rest/v1/study_history', {
              method: 'POST', headers: jsonHeaders({ Prefer: 'return=minimal' }),
              body: JSON.stringify(seedHistory)
            });
          }).catch(function () {
            // Seeding failed (offline): forget these so the next load retries.
            var s = lsGet(LS_SYNCED, []).filter(function (x) {
              return !seedProgress.some(function (p) { return p.chapter_id === x; });
            });
            lsSet(LS_SYNCED, s);
          });
        }

        if (changed) {
          localStorage.setItem('shivansh_done_v2', JSON.stringify(Array.from(doneSet)));
          localStorage.setItem('shivansh_done_dates', JSON.stringify(doneDates));
          // Repaint tick buttons for chapters that changed
          ALL_CHAPTER_IDS.forEach(function (id) {
            var btn = $('done-' + id), card = $('card-' + id);
            var isDone = doneSet.has(id);
            if (btn) { btn.classList.toggle('done', isDone); btn.textContent = isDone ? '✓' : '○'; }
            if (card) card.classList.toggle('done-card', isDone);
          });
          updateAllProgress();
          renderProgressChart();
          renderHeatmap();
        }
        return seeding;
      });
  }

  /* ============================================================
     HISTORY
     ============================================================ */
  var historyOffset = 0;
  var historyLoaded = false;

  function dayLabel(d) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var that = new Date(d); that.setHours(0, 0, 0, 0);
    var diff = Math.round((today - that) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function loadHistory(reset) {
    var list = $('cloudHistoryList');
    var more = $('cloudHistoryMore');
    if (!list) return Promise.resolve();
    if (reset) { historyOffset = 0; list.textContent = ''; }
    if (reset) list.appendChild(el('div', 'cloud-empty', 'Loading…'));

    return api('/rest/v1/study_history?select=*&order=created_at.desc&limit=' + HISTORY_PAGE + '&offset=' + historyOffset)
      .then(function (rows) {
        if (reset) list.textContent = '';
        historyLoaded = true;
        if (!rows.length && historyOffset === 0) {
          list.appendChild(el('div', 'cloud-empty', 'No study history yet. Tick a chapter as done and it appears here.'));
        }
        var lastDay = list.getAttribute('data-last-day') || '';
        if (reset) lastDay = '';
        rows.forEach(function (r) {
          var d = new Date(r.created_at);
          var key = d.toDateString();
          if (key !== lastDay) {
            list.appendChild(el('div', 'cloud-day', dayLabel(d)));
            lastDay = key;
          }
          var row = el('div', 'cloud-row ' + (r.action === 'done' ? 'is-done' : 'is-undone'));
          row.appendChild(el('span', 'cloud-ico', r.action === 'done' ? '✓' : '↺'));
          var mid = el('div', 'cloud-mid');
          mid.appendChild(el('div', 'cloud-main', (r.chapter_title || r.chapter_id)));
          var meta = [r.subject, r.action === 'done' ? 'completed' : 'unmarked', r.device ? 'by ' + r.device : '']
            .filter(Boolean).join(' · ');
          mid.appendChild(el('div', 'cloud-sub', meta));
          row.appendChild(mid);
          row.appendChild(el('span', 'cloud-time', d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })));
          list.appendChild(row);
        });
        list.setAttribute('data-last-day', lastDay);
        historyOffset += rows.length;
        if (more) more.style.display = rows.length === HISTORY_PAGE ? '' : 'none';
      })
      .catch(function () {
        if (reset) list.textContent = '';
        list.appendChild(el('div', 'cloud-empty', '⚠️ Could not load history. Check the internet connection.'));
      });
  }
  function refreshHistoryIfOpen() {
    if (historyLoaded && $('cloudPaneHistory') && $('cloudPaneHistory').classList.contains('active')) loadHistory(true);
  }

  /* ============================================================
     PDF LIBRARY
     ============================================================ */
  function fmtSize(n) {
    if (!n) return '';
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }
  function publicUrl(path) {
    return SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');
  }

  function loadPdfs() {
    var list = $('cloudPdfList');
    if (!list) return Promise.resolve();
    return api('/rest/v1/study_pdfs?select=*&order=created_at.desc&limit=200').then(function (rows) {
      list.textContent = '';
      if (!rows.length) {
        list.appendChild(el('div', 'cloud-empty', 'Nothing uploaded yet. Upload a PDF or image above and it shows up on both devices.'));
        return;
      }
      rows.forEach(function (r) {
        var row = el('div', 'cloud-row pdf-row');
        if (isImagePath(r.file_path)) {
          var thumb = el('img', 'cloud-thumb');
          thumb.src = publicUrl(r.file_path);
          thumb.alt = '';
          thumb.loading = 'lazy';
          row.appendChild(thumb);
        } else {
          row.appendChild(el('span', 'cloud-ico pdf', '📄'));
        }
        var mid = el('div', 'cloud-mid');
        mid.appendChild(el('div', 'cloud-main', r.title));
        var d = new Date(r.created_at);
        mid.appendChild(el('div', 'cloud-sub', [
          fmtSize(r.size_bytes),
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          r.uploaded_by ? 'by ' + r.uploaded_by : ''
        ].filter(Boolean).join(' · ')));
        row.appendChild(mid);

        var open = el('a', 'cloud-btn', 'Open');
        open.href = publicUrl(r.file_path);
        open.target = '_blank';
        open.rel = 'noopener';
        row.appendChild(open);

        var del = el('button', 'cloud-btn danger', '🗑');
        del.type = 'button';
        del.setAttribute('aria-label', 'Delete ' + r.title);
        del.addEventListener('click', function () { deletePdf(r); });
        row.appendChild(del);
        list.appendChild(row);
      });
    }).catch(function () {
      list.textContent = '';
      list.appendChild(el('div', 'cloud-empty', '⚠️ Could not load files. Check the internet connection.'));
    });
  }

  function deletePdf(r) {
    // Two separate confirmations, as requested.
    if (!window.confirm('Delete "' + r.title + '"?')) return;
    if (!window.confirm('Are you REALLY sure? "' + r.title + '" will be removed for both devices and cannot be brought back.')) return;
    api('/storage/v1/object/' + BUCKET + '/' + r.file_path.split('/').map(encodeURIComponent).join('/'), { method: 'DELETE' })
      .then(function () { return api('/rest/v1/study_pdfs?id=eq.' + encodeURIComponent(r.id), { method: 'DELETE' }); })
      .then(function () { toast('🗑 Deleted'); return loadPdfs(); })
      .catch(function () { toast('⚠️ Could not delete. Try again.'); });
  }

  function uploadPdf() {
    var input = $('cloudPdfFile');
    var titleInput = $('cloudPdfTitle');
    var btn = $('cloudPdfUploadBtn');
    var file = input && input.files && input.files[0];
    if (!file) { toast('Choose a PDF or image first'); return; }
    var ext = extOf(file.name);
    var mime = FILE_TYPES[ext];
    if (!mime) { toast('Only PDF, JPG, PNG, WebP or GIF files are allowed'); return; }
    if (file.size > MAX_PDF_BYTES) { toast('That file is bigger than 50 MB'); return; }

    var title = (titleInput.value || '').trim() || stripExt(file.name);
    var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    btn.disabled = true;
    btn.textContent = 'Uploading…';
    fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': mime, 'x-upsert': 'false' },
      body: file
    }).then(function (res) {
      if (!res.ok) throw new Error('upload ' + res.status);
      return api('/rest/v1/study_pdfs', {
        method: 'POST',
        headers: jsonHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ title: title, file_name: file.name, file_path: path, size_bytes: file.size, uploaded_by: getDevice() })
      }).catch(function (e) {
        // Row failed: don't leave an orphan file behind.
        api('/storage/v1/object/' + BUCKET + '/' + path, { method: 'DELETE' }).catch(function () {});
        throw e;
      });
    }).then(function () {
      input.value = ''; titleInput.value = '';
      toast('✅ Uploaded');
      return loadPdfs();
    }).catch(function () {
      toast('⚠️ Upload failed. Check the internet and try again.');
    }).then(function () {
      btn.disabled = false;
      btn.textContent = '⬆ Upload';
    });
  }

  /* ============================================================
     UI wiring
     ============================================================ */
  function showPane(name) {
    ['History', 'Pdfs'].forEach(function (n) {
      var on = n.toLowerCase() === name;
      $('cloudPane' + n).classList.toggle('active', on);
      $('cloudTab' + n).classList.toggle('active', on);
    });
    if (name === 'history') loadHistory(true);
    else loadPdfs();
  }

  function init() {
    if (!$('cloudSection')) return;
    renderDeviceChip();
    $('cloudDeviceChip').addEventListener('click', toggleDevice);
    $('cloudTabHistory').addEventListener('click', function () { showPane('history'); });
    $('cloudTabPdfs').addEventListener('click', function () { showPane('pdfs'); });
    $('cloudHistoryMore').addEventListener('click', function () { loadHistory(false); });
    $('cloudPdfUploadBtn').addEventListener('click', uploadPdf);
    $('cloudPdfFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (f && !$('cloudPdfTitle').value) $('cloudPdfTitle').value = stripExt(f.name);
    });

    showPane('pdfs');
    syncProgress().catch(function () { /* offline: local data is still shown */ });
    window.addEventListener('online', function () {
      flushQueue().then(syncProgress).catch(function () {});
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
