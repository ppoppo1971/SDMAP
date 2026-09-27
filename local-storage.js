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
      return getPhotoById(photo.id).then(function (existingRecord) {
        var finalBlob = photo.blob;
        if (!finalBlob && existingRecord && existingRecord.blob) {
          finalBlob = existingRecord.blob;
        }

        var finalSubPhotos = photo.subPhotos;
        if (finalSubPhotos && existingRecord && existingRecord.subPhotos) {
          finalSubPhotos = finalSubPhotos.map(function (sp) {
            if (!sp.blob) {
              var oldSp = existingRecord.subPhotos.filter(function (x) {
                return (x.subIndex === sp.subIndex) || (x.fileName === sp.fileName);
              })[0];
              if (oldSp && oldSp.blob) {
                return {
                  subIndex: sp.subIndex,
                  fileName: sp.fileName,
                  blob: oldSp.blob
                };
              }
            }
            return sp;
          });
        } else if (!finalSubPhotos && existingRecord && existingRecord.subPhotos) {
          finalSubPhotos = existingRecord.subPhotos;
        }

        // [0923_01] localFs가 활성화된 경우 IndexedDB에는 Blob을 저장하지 않음 (파일시스템에 직접 저장됨)
        var useLocalFs = (window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir());

        var recordBlob = useLocalFs ? null : finalBlob;
        var recordSubPhotos = finalSubPhotos;
        if (useLocalFs && recordSubPhotos) {
          recordSubPhotos = recordSubPhotos.map(function (sp) {
            return {
              subIndex: sp.subIndex,
              fileName: sp.fileName,
              blob: null  // Blob은 파일시스템에만 저장
            };
          });
        }

        var record = {
          id: String(photo.id),
          dxfFile: dxfFile,
          fileName: photo.fileName || '',
          memo: photo.memo || '',
          x: photo.x, y: photo.y,
          width: photo.width, height: photo.height,
          blob: recordBlob,
          createdAt: photo.createdAt || (existingRecord ? existingRecord.createdAt : new Date().toISOString()),
          updatedAt: new Date().toISOString(),
          numTextId: photo.numTextId || null,
          specTextId: photo.specTextId || null,
          specTextIds: photo.specTextIds || null,
          specValuesList: photo.specValuesList || (existingRecord ? existingRecord.specValuesList : null),
          additionalTypes: photo.additionalTypes || null,
          facilityType: photo.facilityType || null,
          subPhotos: recordSubPhotos || null
        };

        return new Promise(function (resolve, reject) {
          var tx = db.transaction(PHOTO_STORE, 'readwrite');
          tx.objectStore(PHOTO_STORE).put(record);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { reject(tx.error); };
        });
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
              // 도면 자체(DXF 형상 캐시)는 보존하여 도면 유지를 보장
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
    saveDxfCache: saveDxfCache
  };
})();
