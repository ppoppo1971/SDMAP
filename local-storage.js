/**
 * new_dmap - 로컬 저장소 (IndexedDB)
 * ADMAP과 동일 API, DB 이름만 'dmap-map' 으로 분리
 */
(function () {
  var DB_NAME = 'dmap-map';
  var DB_VERSION = 1;
  var PROJECT_STORE = 'projects';
  var PHOTO_STORE = 'photos';
  var dbPromise = null;

  function openDb() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE)) {
          db.createObjectStore(PROJECT_STORE, { keyPath: 'dxfFile' });
        }
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          var store = db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
          store.createIndex('dxfFile', 'dxfFile', { unique: false });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function getDb() {
    if (!dbPromise) dbPromise = openDb();
    return dbPromise;
  }

  function init() {
    return getDb().then(function () {
      // 브라우저가 저장소를 자동으로 삭제하지 않도록 영구 저장 요청 (iOS 15.2+, Chrome 등)
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(function (granted) {
          if (granted) console.log('[dmap] 영구 저장소 권한 허용됨');
          else console.log('[dmap] 영구 저장소 권한 미허용 (브라우저 정책)');
        }).catch(function () { });
      }
      return true;
    });
  }

  function saveProject(dxfFile, data) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PROJECT_STORE, 'readwrite');
        var store = tx.objectStore(PROJECT_STORE);
        var req = store.get(dxfFile);
        req.onsuccess = function () {
          var record = req.result || { dxfFile: dxfFile };
          record.texts = data.texts || [];
          record.lastModified = data.lastModified || new Date().toISOString();
          store.put(record);
        };
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function saveDxfCache(dxfFile, dxfData, dxfImageRefs) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PROJECT_STORE, 'readwrite');
        var store = tx.objectStore(PROJECT_STORE);
        var req = store.get(dxfFile);
        req.onsuccess = function () {
          var record = req.result || { dxfFile: dxfFile, texts: [] };
          record.dxfData = dxfData;
          record.dxfImageRefs = dxfImageRefs;
          record.lastModified = new Date().toISOString();
          store.put(record);
        };
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function loadProject(dxfFile) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PROJECT_STORE, 'readonly');
        var req = tx.objectStore(PROJECT_STORE).get(dxfFile);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function savePhoto(dxfFile, photo) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var record = {
          id: String(photo.id),
          dxfFile: dxfFile,
          fileName: photo.fileName || '',
          memo: photo.memo || '',
          x: photo.x, y: photo.y,
          width: photo.width, height: photo.height,
          blob: photo.blob,
          createdAt: photo.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          numTextId: photo.numTextId || null,
          specTextId: photo.specTextId || null,
          specTextIds: photo.specTextIds || null,
          additionalTypes: photo.additionalTypes || null,
          facilityType: photo.facilityType || null,
          subPhotos: photo.subPhotos || null
        };
        var tx = db.transaction(PHOTO_STORE, 'readwrite');
        tx.objectStore(PHOTO_STORE).put(record);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function loadPhotos(dxfFile) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, 'readonly');
        var req = tx.objectStore(PHOTO_STORE).index('dxfFile').getAll(dxfFile);
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getPhotoById(id) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, 'readonly');
        var req = tx.objectStore(PHOTO_STORE).get(String(id));
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function updatePhotoMemo(id, memo) {
    return getPhotoById(id).then(function (record) {
      if (!record) return false;
      record.memo = memo || '';
      record.updatedAt = new Date().toISOString();
      return getDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(PHOTO_STORE, 'readwrite');
          tx.objectStore(PHOTO_STORE).put(record);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { reject(tx.error); };
        });
      });
    });
  }

  function deletePhoto(id) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, 'readwrite');
        tx.objectStore(PHOTO_STORE).delete(String(id));
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function deleteProjectData(dxfFile) {
    return loadPhotos(dxfFile).then(function (photos) {
      if (!photos) photos = [];
      return getDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          // 단일 트랜잭션으로 사진 + 프로젝트 데이터를 원자적으로 삭제
          var tx = db.transaction([PHOTO_STORE, PROJECT_STORE], 'readwrite');
          var photoStore = tx.objectStore(PHOTO_STORE);
          var projStore = tx.objectStore(PROJECT_STORE);

          // 사진 일괄 삭제
          photos.forEach(function (p) { photoStore.delete(String(p.id)); });

          // 프로젝트 텍스트 배열 비우기 및 도면 캐시 삭제
          var req = projStore.get(dxfFile);
          req.onsuccess = function () {
            var project = req.result;
            if (project) {
              project.texts = [];
              if (project.dxfData) delete project.dxfData;
              if (project.dxfImageRefs) delete project.dxfImageRefs;
              project.lastModified = new Date().toISOString();
              projStore.put(project);
            }
          };

          tx.oncomplete = function () { resolve(photos.length); };
          tx.onerror = function () { reject(tx.error); };
        });
      });
    });
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mimeMatch = (parts[0] || '').match(/data:(.*?);base64/);
    var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    var binary = atob(parts[1] || '');
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function resizeImageBlob(blob, quality, maxDim) {
    return new Promise(function (resolve) {
      if (!blob || blob.type.indexOf('image/') !== 0) {
        return resolve(blob);
      }
      var img = new Image();
      var url = URL.createObjectURL(blob);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var width = img.width;
        var height = img.height;
        var maxDimension = maxDim || 1200;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(function (resizedBlob) {
          canvas.width = 0;
          canvas.height = 0;
          if (resizedBlob) {
            resolve(resizedBlob);
          } else {
            resolve(blob);
          }
        }, 'image/jpeg', quality || 0.75);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(blob);
      };
      img.src = url;
    });
  }

  function downloadFile(blob, filename) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); resolve(true); }, 500);
    });
  }

  function encodeUtf8(str) {
    return new TextEncoder().encode(str);
  }

  function crc32(bytes) {
    var table = crc32.table;
    if (!table) {
      table = new Uint32Array(256);
      for (var i = 0; i < 256; i++) {
        var c = i;
        for (var k = 0; k < 8; k++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
      }
      crc32.table = table;
    }
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function toDosDateTime(date) {
    var dt = date instanceof Date ? date : new Date();
    var year = Math.max(1980, dt.getFullYear());
    var month = dt.getMonth() + 1;
    var day = dt.getDate();
    var hours = dt.getHours();
    var minutes = dt.getMinutes();
    var seconds = Math.floor(dt.getSeconds() / 2);
    var dosTime = (hours << 11) | (minutes << 5) | seconds;
    var dosDate = ((year - 1980) << 9) | (month << 5) | day;
    return { dosTime: dosTime, dosDate: dosDate };
  }

  function createZip(entries) {
    var offset = 0;
    var fileParts = [];
    var centralParts = [];
    function process(i) {
      if (i >= entries.length) {
        var centralSize = 0;
        for (var k = 0; k < centralParts.length; k++) centralSize += centralParts[k].length;
        var fileCount = entries.length;
        var endRecord = new ArrayBuffer(22);
        var endView = new DataView(endRecord);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, fileCount, true);
        endView.setUint16(10, fileCount, true);
        endView.setUint32(12, centralSize, true);
        endView.setUint32(16, offset, true);
        endView.setUint16(20, 0, true);
        var allParts = fileParts.concat(centralParts).concat([new Uint8Array(endRecord)]);
        return Promise.resolve(new Blob(allParts, { type: 'application/zip' }));
      }
      var entry = entries[i];
      var nameBytes = encodeUtf8(entry.name);
      return entry.blob.arrayBuffer().then(function (arrayBuffer) {
        var dataBytes = new Uint8Array(arrayBuffer);
        var crcVal = crc32(dataBytes);
        var size = dataBytes.length;
        var dos = toDosDateTime(entry.modifiedAt);
        var flags = 0x0800;
        var localHeader = new ArrayBuffer(30 + nameBytes.length);
        var localView = new DataView(localHeader);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, flags, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, dos.dosTime, true);
        localView.setUint16(12, dos.dosDate, true);
        localView.setUint32(14, crcVal, true);
        localView.setUint32(18, size, true);
        localView.setUint32(22, size, true);
        localView.setUint16(26, nameBytes.length, true);
        localView.setUint16(28, 0, true);
        new Uint8Array(localHeader).set(nameBytes, 30);
        fileParts.push(new Uint8Array(localHeader), dataBytes);
        var centralHeader = new ArrayBuffer(46 + nameBytes.length);
        var centralView = new DataView(centralHeader);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, flags, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, dos.dosTime, true);
        centralView.setUint16(14, dos.dosDate, true);
        centralView.setUint32(16, crcVal, true);
        centralView.setUint32(20, size, true);
        centralView.setUint32(24, size, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, offset, true);
        new Uint8Array(centralHeader).set(nameBytes, 46);
        centralParts.push(new Uint8Array(centralHeader));
        offset += localHeader.byteLength + size;
        return process(i + 1);
      });
    }
    return process(0);
  }

  function normalizeBaseName(dxfFile) {
    return (dxfFile || 'photo').replace(/\.dxf$/i, '');
  }

  function exportProjectSequential(dxfFile, onProgress) {
    return Promise.all([loadProject(dxfFile), loadPhotos(dxfFile)]).then(function (res) {
      var project = res[0] || {};
      var photos = res[1] || [];
      var baseName = normalizeBaseName(dxfFile);

      // subPhotos flatten: 개별 파일 목록 및 메타데이터 photos 배열 확장
      var flatPhotos = [];
      var downloadList = [];
      photos.forEach(function (p) {
        if (p.subPhotos && p.subPhotos.length > 0) {
          p.subPhotos.forEach(function (sp) {
            var isPrimary = (sp.subIndex === 0);
            flatPhotos.push({
              id: p.id + '_sub_' + (sp.subIndex || flatPhotos.length), fileName: sp.fileName,
              position: { x: p.x, y: -p.y },
              size: { width: p.width, height: p.height },
              memo: p.memo || '', uploaded: true,
              numTextId: isPrimary ? (p.numTextId || null) : null,
              specTextId: isPrimary ? (p.specTextId || null) : null,
              specTextIds: isPrimary ? (p.specTextIds || null) : null,
              facilityType: isPrimary ? (p.facilityType || null) : null
            });
            if (sp.blob && sp.fileName) downloadList.push({ blob: sp.blob, fileName: sp.fileName });
          });
        } else {
          flatPhotos.push({
            id: p.id, fileName: p.fileName,
            position: { x: p.x, y: -p.y },
            size: { width: p.width, height: p.height },
            memo: p.memo || '', uploaded: true,
            numTextId: p.numTextId || null,
            specTextId: p.specTextId || null,
            facilityType: p.facilityType || null
          });
          if (p.blob && p.fileName) downloadList.push({ blob: p.blob, fileName: p.fileName });
        }
      });

      var totalFiles = downloadList.length + 1;
      var current = 0;
      var metadata = {
        dxfFile: dxfFile,
        photos: flatPhotos,
        texts: (project.texts || []).map(function (t) {
          var out = {}; for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out[k] = t[k];
          out.y = typeof t.y === 'number' ? -t.y : t.y; return out;
        }),
        lastModified: project.lastModified || new Date().toISOString()
      };
      var metaBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      current++;
      if (onProgress) onProgress(current, totalFiles, baseName + '_metadata.json');
      return downloadFile(metaBlob, baseName + '_metadata.json').then(function () {
        var chain = Promise.resolve();
        downloadList.forEach(function (item) {
          chain = chain.then(function () {
            current++;
            if (onProgress) onProgress(current, totalFiles, item.fileName);
            return downloadFile(item.blob, item.fileName).then(function () {
              return new Promise(function (r) { setTimeout(r, 300); });
            });
          });
        });
        return chain.then(function () { return { success: true, totalFiles: totalFiles }; });
      });
    });
  }

  // [참고] 이 함수는 현재 사용되지 않는 데드 코드(Dead Code)입니다.
  // 실제 프로젝트를 단일 ZIP 파일로 통합해 내보내는 기능은 아래의 exportAsZipOnly() 함수를 사용합니다.
  function exportProjectZip(dxfFile, onProgress) {
    return exportProjectSequential(dxfFile, onProgress);
  }

  function exportAsZipOnly(dxfFile, compressOptions, onProgress) {
    return Promise.all([loadProject(dxfFile), loadPhotos(dxfFile)]).then(function (res) {
      var project = res[0] || {};
      var photos = res[1] || [];
      var baseName = normalizeBaseName(dxfFile);

      var flatPhotos = [];
      var rawEntries = [];
      photos.forEach(function (p) {
        if (p.subPhotos && p.subPhotos.length > 0) {
          p.subPhotos.forEach(function (sp) {
            var isPrimary = (sp.subIndex === 0);
            flatPhotos.push({
              id: p.id + '_sub_' + (sp.subIndex || flatPhotos.length), fileName: sp.fileName,
              position: { x: p.x, y: -p.y },
              size: { width: p.width, height: p.height },
              memo: p.memo || '', uploaded: true,
              numTextId: isPrimary ? (p.numTextId || null) : null,
              specTextId: isPrimary ? (p.specTextId || null) : null,
              specTextIds: isPrimary ? (p.specTextIds || null) : null,
              additionalTypes: isPrimary ? (p.additionalTypes || null) : null,
              facilityType: isPrimary ? (p.facilityType || null) : null
            });
            if (sp.blob && sp.fileName) {
              rawEntries.push({ name: sp.fileName, blob: sp.blob, modifiedAt: new Date(p.updatedAt || Date.now()) });
            }
          });
        } else {
          flatPhotos.push({
            id: p.id, fileName: p.fileName,
            position: { x: p.x, y: -p.y },
            size: { width: p.width, height: p.height },
            memo: p.memo || '', uploaded: true,
            numTextId: p.numTextId || null,
            specTextId: p.specTextId || null,
            specTextIds: p.specTextIds || null,
            additionalTypes: p.additionalTypes || null,
            facilityType: p.facilityType || null
          });
          if (p.blob && p.fileName) {
            rawEntries.push({ name: p.fileName, blob: p.blob, modifiedAt: new Date(p.updatedAt || Date.now()) });
          }
        }
      });

      var metadata = {
        dxfFile: dxfFile,
        photos: flatPhotos,
        texts: (project.texts || []).map(function (t) {
          var out = {}; for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out[k] = t[k];
          out.y = typeof t.y === 'number' ? -t.y : t.y; return out;
        }),
        lastModified: project.lastModified || new Date().toISOString()
      };
      var metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });

      var entries = [];
      var totalToProcess = rawEntries.length;

      var chain = Promise.resolve();
      rawEntries.forEach(function (entry, idx) {
        chain = chain.then(function () {
          if (compressOptions && compressOptions.compress) {
            if (onProgress) {
              onProgress(idx, totalToProcess, entry.name);
            }
            return resizeImageBlob(entry.blob, compressOptions.quality, compressOptions.maxDim).then(function (resizedBlob) {
              entries.push({ name: entry.name, blob: resizedBlob, modifiedAt: entry.modifiedAt });
            });
          } else {
            entries.push(entry);
            return Promise.resolve();
          }
        });
      });

      return chain.then(function () {
        if (onProgress && compressOptions && compressOptions.compress && totalToProcess > 0) {
          onProgress(totalToProcess, totalToProcess, '완료');
        }
        entries.unshift({ name: baseName + '_metadata.json', blob: metadataBlob, modifiedAt: new Date() });

        return createZip(entries).then(function (zipBlob) {
          var zipName = baseName + '_export.zip';
          return downloadFile(zipBlob, zipName).then(function () {
            return { success: true, type: 'zip', fileName: zipName };
          });
        });
      });
    });
  }

  function exportAsPartitionedZips(dxfFile, compressOptions, onProgress) {
    return Promise.all([loadProject(dxfFile), loadPhotos(dxfFile)]).then(function (res) {
      var project = res[0] || {};
      var photos = res[1] || [];
      var baseName = normalizeBaseName(dxfFile);

      var flatPhotos = [];
      var rawEntries = [];
      photos.forEach(function (p) {
        if (p.subPhotos && p.subPhotos.length > 0) {
          p.subPhotos.forEach(function (sp) {
            var isPrimary = (sp.subIndex === 0);
            flatPhotos.push({
              id: p.id + '_sub_' + (sp.subIndex || flatPhotos.length), fileName: sp.fileName,
              position: { x: p.x, y: -p.y },
              size: { width: p.width, height: p.height },
              memo: p.memo || '', uploaded: true,
              numTextId: isPrimary ? (p.numTextId || null) : null,
              specTextId: isPrimary ? (p.specTextId || null) : null,
              specTextIds: isPrimary ? (p.specTextIds || null) : null,
              additionalTypes: isPrimary ? (p.additionalTypes || null) : null,
              facilityType: isPrimary ? (p.facilityType || null) : null
            });
            if (sp.blob && sp.fileName) {
              rawEntries.push({ name: sp.fileName, blob: sp.blob, modifiedAt: new Date(p.updatedAt || Date.now()) });
            }
          });
        } else {
          flatPhotos.push({
            id: p.id, fileName: p.fileName,
            position: { x: p.x, y: -p.y },
            size: { width: p.width, height: p.height },
            memo: p.memo || '', uploaded: true,
            numTextId: p.numTextId || null,
            specTextId: p.specTextId || null,
            specTextIds: p.specTextIds || null,
            additionalTypes: p.additionalTypes || null,
            facilityType: p.facilityType || null
          });
          if (p.blob && p.fileName) {
            rawEntries.push({ name: p.fileName, blob: p.blob, modifiedAt: new Date(p.updatedAt || Date.now()) });
          }
        }
      });

      var metadata = {
        dxfFile: dxfFile,
        photos: flatPhotos,
        texts: (project.texts || []).map(function (t) {
          var out = {}; for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out[k] = t[k];
          out.y = typeof t.y === 'number' ? -t.y : t.y; return out;
        }),
        lastModified: project.lastModified || new Date().toISOString()
      };
      var metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });

      var entries = [];
      var totalToProcess = rawEntries.length;

      var chain = Promise.resolve();
      rawEntries.forEach(function (entry, idx) {
        chain = chain.then(function () {
          if (compressOptions && compressOptions.compress) {
            if (onProgress) {
              onProgress(idx, totalToProcess, entry.name);
            }
            return resizeImageBlob(entry.blob, compressOptions.quality, compressOptions.maxDim).then(function (resizedBlob) {
              entries.push({ name: entry.name, blob: resizedBlob, modifiedAt: entry.modifiedAt });
            });
          } else {
            entries.push(entry);
            return Promise.resolve();
          }
        });
      });

      return chain.then(function () {
        if (onProgress && compressOptions && compressOptions.compress && totalToProcess > 0) {
          onProgress(totalToProcess, totalToProcess, '완료');
        }

        // 분할 ZIP 생성 (약 100MB 단위로 파티셔닝 - 모바일 메모리 안전 마진 확보)
        var maxPartSize = 100 * 1024 * 1024; // 100MB
        var parts = [];
        
        var currentPartEntries = [{ name: baseName + '_metadata.json', blob: metadataBlob, modifiedAt: new Date() }];
        var currentPartSize = metadataBlob.size;

        entries.forEach(function (entry) {
          var entrySize = entry.blob.size;
          if (currentPartSize + entrySize > maxPartSize && currentPartEntries.length > 1) {
            parts.push(currentPartEntries);
            currentPartEntries = [entry];
            currentPartSize = entrySize;
          } else {
            currentPartEntries.push(entry);
            currentPartSize += entrySize;
          }
        });
        if (currentPartEntries.length > 0) {
          parts.push(currentPartEntries);
        }

        var zipResults = [];
        var zipChain = Promise.resolve();
        parts.forEach(function (partEntries, idx) {
          zipChain = zipChain.then(function () {
            if (onProgress) {
              onProgress(idx, parts.length, '압축 중 (Part ' + (idx + 1) + ')');
            }
            return createZip(partEntries).then(function (zipBlob) {
              var partName = baseName + '_export_part' + (idx + 1) + '.zip';
              zipResults.push({ name: partName, blob: zipBlob });
            });
          });
        });

        return zipChain.then(function () {
          if (onProgress) {
            onProgress(parts.length, parts.length, '분할 완료');
          }
          return zipResults;
        });
      });
    });
  }

  function getPhotoDataUrl(photoId) {
    return getPhotoById(photoId).then(function (r) {
      return r && r.blob ? blobToDataUrl(r.blob) : null;
    });
  }

  window.localStore = {
    init: init,
    saveProject: saveProject,
    loadProject: loadProject,
    savePhoto: savePhoto,
    loadPhotos: loadPhotos,
    getPhotoById: getPhotoById,
    updatePhotoMemo: updatePhotoMemo,
    deletePhoto: deletePhoto,
    deleteProjectData: deleteProjectData,
    dataUrlToBlob: dataUrlToBlob,
    exportProjectZip: exportProjectZip,
    exportProjectSequential: exportProjectSequential,
    exportAsZipOnly: exportAsZipOnly,
    exportAsPartitionedZips: exportAsPartitionedZips,
    getPhotoDataUrl: getPhotoDataUrl,
    saveDxfCache: saveDxfCache
  };
})();
