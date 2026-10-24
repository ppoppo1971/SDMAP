/**
 * local-fs.js - 안드로이드/PC 브라우저 File System Access API 기반 로컬 내부저장소 관리 모듈
 * 
 * 주요 기능:
 * 1. window.showDirectoryPicker()를 통한 사용자 지정 작업 루트 폴더 핸들 IndexedDB 영구 저장
 * 2. 도면 파일 로드 시 [도면명]/ 하위 폴더 자동 생성 및 매핑
 * 3. 촬영된 사진(.jpg)을 도면 폴더에 파일로 즉시 기록하여 브라우저 메모리 부하 원천 차단
 * 4. 도면 시설물 제원 및 사진 정보를 담은 [도면명]_metadata.json 실시간 생성 및 동기화
 * 5. 파일시스템에서 직접 사진 Blob/URL 읽기 및 파일 삭제 지원
 */
(function (window) {
  'use strict';

  var DB_NAME = 'SDMAP_LOCAL_FS';
  var DB_VERSION = 1;
  var HANDLE_STORE = 'handles';

  var _dbPromise = null;
  var _baseDirHandle = null;
  var _baseDirName = localStorage.getItem('sdmap_base_dir_name') || '';

  // File System Access API 지원 여부 확인
  function isSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  // iOS 기기 판별 (File System API 미지원)
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // IndexedDB 열기 (디렉토리 핸들 보관용)
  function openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB를 지원하지 않는 브라우저입니다.'));
        return;
      }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(HANDLE_STORE)) {
          db.createObjectStore(HANDLE_STORE);
        }
      };
      request.onsuccess = function (e) {
        resolve(e.target.result);
      };
      request.onerror = function (e) {
        reject(e.target.error);
      };
    });
    return _dbPromise;
  }

  // 저장된 루트 폴더 핸들 불러오기
  function loadSavedBaseDirHandle() {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(HANDLE_STORE, 'readonly');
          var store = tx.objectStore(HANDLE_STORE);
          var req = store.get('baseDirHandle');
          req.onsuccess = function () {
            if (req.result) {
              _baseDirHandle = req.result;
              resolve(_baseDirHandle);
            } else {
              resolve(null);
            }
          };
          req.onerror = function () { resolve(null); };
        } catch (e) {
          resolve(null);
        }
      });
    });
  }

  // 루트 폴더 핸들 영구 저장
  function saveBaseDirHandle(handle) {
    _baseDirHandle = handle;
    _baseDirName = handle.name || '선택된 폴더';
    localStorage.setItem('sdmap_base_dir_name', _baseDirName);

    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(HANDLE_STORE, 'readwrite');
        var store = tx.objectStore(HANDLE_STORE);
        store.put(handle, 'baseDirHandle');
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function (e) { reject(e.target.error); };
      });
    });
  }

  // 루트 폴더 핸들 삭제 (디스크에서 삭제된 경우 등)
  function clearBaseDirHandle() {
    _baseDirHandle = null;
    _baseDirName = '';
    _drawingFolderHandles = {};
    try {
      localStorage.removeItem('sdmap_base_dir_name');
    } catch (e) {}
    openDb().then(function (db) {
      try {
        var tx = db.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE).clear();
      } catch (e) {}
    }).catch(function () {});
  }

  // 폴더 읽기/쓰기 권한 검사 및 요청
  async function verifyPermission(handle, readWrite) {
    if (!handle) return false;
    var options = { mode: readWrite ? 'readwrite' : 'read' };
    try {
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }
      if ((await handle.requestPermission(options)) === 'granted') {
        return true;
      }
    } catch (e) {
      // 비동기 컨텍스트(User activation required)로 인해 팝업이 차단된 경우에도 읽기 권한이 이미 있다면 통과
      try {
        if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
          return true;
        }
      } catch (qe) {}
      console.warn('[localFs] 권한 요청 중 예외:', e);
    }
    return false;
  }

  // 사용자에게 저장소 루트 작업 폴더 선택 요청
  async function pickBaseDirectory() {
    if (!isSupported()) {
      alert('현재 브라우저에서는 실제 폴더 저장 기능(File System Access API)을 지원하지 않습니다.\n안드로이드 Chrome 최신 버전을 권장합니다.');
      return null;
    }
    try {
      var handle = await window.showDirectoryPicker({
        id: 'sdmap_survey_root',
        mode: 'readwrite',
        startIn: 'documents'
      });
      if (handle) {
        await saveBaseDirHandle(handle);
        alert(
          '저장 폴더가 성공적으로 설정되었습니다:\n📁 ' + handle.name + '\n\n' +
          '이제 도면을 열 때마다 [' + handle.name + '] 폴더 안에 [도면명] 전용 폴더가 100% 자동 생성되어 사진과 제원 데이터가 안전하게 저장됩니다.'
        );
        return handle;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[localFs] 폴더 선택 실패:', err);
        var msg = (err.message || '').toLowerCase();
        if (err.name === 'SecurityError' || err.name === 'NotAllowedError' || msg.indexOf('not allowed') !== -1 || msg.indexOf('security') !== -1) {
          alert(
            '⚠️ 선택하신 폴더는 안드로이드 보안 정책에 의해 접근이 차단되었습니다.\n\n' +
            '• [다운로드(Download)] 폴더는 시스템 보안상 브라우저 접근이 금지되어 있습니다.\n' +
            '• 반드시 스마트폰의 [문서(Documents)] 폴더 안이나 [내장 메모리] 아래에 작업 폴더(예: 평택)를 생성하여 선택해 주세요.'
          );
        } else {
          alert('폴더를 선택하지 못했습니다:\n' + (err.message || err));
        }
      }
    }
    return null;
  }

  // 폴더/파일명 안전화 (확장자 제거 및 특수문자 변환)
  function sanitizeDrawingName(dxfFullName) {
    if (!dxfFullName) return '미지정도면';
    var clean = dxfFullName.replace(/\.[^/.]+$/, ''); // 확장자 제거
    return clean.replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  // 루트 폴더 핸들 가져오기 (권한 검증 포함)
  async function getBaseDirectory(readWrite) {
    if (readWrite === undefined) readWrite = true;
    if (!_baseDirHandle) {
      _baseDirHandle = await loadSavedBaseDirHandle();
    }
    if (!_baseDirHandle) return null;
    var hasPermission = await verifyPermission(_baseDirHandle, readWrite);
    if (!hasPermission) return null;
    return _baseDirHandle;
  }

  // 도면별 독립 폴더 핸들 맵 (도면명 -> DirectoryHandle)
  var _drawingFolderHandles = {};

  // 도면별 폴더 핸들 영구 저장
  async function saveDrawingFolderHandle(drawingName, handle) {
    if (!drawingName || !handle) return;
    var cleanName = sanitizeDrawingName(drawingName);
    _drawingFolderHandles[cleanName] = handle;
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(HANDLE_STORE, 'readwrite');
          tx.objectStore(HANDLE_STORE).put(handle, 'folder_' + cleanName);
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { resolve(); };
        } catch (e) { resolve(); }
      });
    });
  }

  // 도면별 폴더 핸들 불러오기
  async function loadDrawingFolderHandle(drawingName) {
    if (!drawingName) return null;
    var cleanName = sanitizeDrawingName(drawingName);
    if (_drawingFolderHandles[cleanName]) return _drawingFolderHandles[cleanName];

    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(HANDLE_STORE, 'readonly');
          var req = tx.objectStore(HANDLE_STORE).get('folder_' + cleanName);
          req.onsuccess = function () {
            if (req.result) {
              _drawingFolderHandles[cleanName] = req.result;
              resolve(req.result);
            } else {
              resolve(null);
            }
          };
          req.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    });
  }

  // 도면별 서브폴더 핸들 가져오기 (없으면 부모 폴더에서 자동 생성/연결)
  async function getDrawingFolder(drawingName, autoCreate) {
    if (autoCreate === undefined) autoCreate = true;
    if (!drawingName) return null;

    var cleanName = sanitizeDrawingName(drawingName);
    var isWrite = !!autoCreate;

    // 1. 메모리 및 IndexedDB 캐시 확인
    var cached = _drawingFolderHandles[cleanName];
    if (!cached) {
      cached = await loadDrawingFolderHandle(cleanName);
    }
    if (cached) {
      if (!isWrite) {
        // 읽기 전용 경로는 추가 디스크 I/O나 권한 요청 없이 즉시 캐시 핸들 반환 (SecurityError 원천 차단)
        return cached;
      }
      try {
        if (typeof cached.values === 'function') {
          var it = cached.values();
          await it.next();
        }
        return cached; // 실제 디스크에 정상 존재
      } catch (e) {
        delete _drawingFolderHandles[cleanName];
      }
    }

    // 2. 루트 작업 폴더(예: 평택) 가져오기
    var baseDir = null;
    if (!isWrite) {
      // 읽기 경로: 이미 로드된 핸들 재사용 (requestPermission 팝업 요청 회피)
      if (!_baseDirHandle) {
        _baseDirHandle = await loadSavedBaseDirHandle();
      }
      baseDir = _baseDirHandle;
    } else {
      // 쓰기 경로: 권한 확인 및 필요 시 요청
      baseDir = await getBaseDirectory(true);
    }
    if (!baseDir) return null;

    // 3. 루트 작업 폴더 아래에서 [도면명] 서브폴더 가져오기 / 자동 생성
    try {
      var subFolder = await baseDir.getDirectoryHandle(cleanName, { create: autoCreate });
      if (subFolder) {
        _drawingFolderHandles[cleanName] = subFolder;
        saveDrawingFolderHandle(cleanName, subFolder).catch(function () {});
        return subFolder;
      }
    } catch (e) {
      if (e.name === 'NotFoundError') {
        delete _drawingFolderHandles[cleanName];
      } else {
        console.warn('[localFs] 도면 폴더 접근/생성 실패:', e);
      }
      return null;
    }
    return null;
  }

  // 저장 환경 사전 철저 검사 (촬영/저장 전 실행: 정상 저장이 보장되지 않으면 작업을 원천 차단)
  async function ensureStorageReady(drawingName) {
    if (!isSupported()) {
      return true; // File System Access API 미지원 환경(iOS 등)은 IndexedDB 모드로 작업 허용
    }

    if (!drawingName) {
      alert('작업 대상 도면이 지정되지 않았습니다.');
      return false;
    }

    var cleanName = sanitizeDrawingName(drawingName);

    // 1. 루트 작업 폴더(예: 평택)가 설정되어 있는지 및 권한 검사
    var baseDir = await getBaseDirectory(true);
    if (!baseDir) {
      var proceed = confirm(
        '⚠️ 사진 및 데이터를 저장할 상위 작업 폴더(예: 평택)가 설정되지 않았거나 접근 권한이 필요합니다.\n\n' +
        '• 선택한 작업 폴더 바로 아래에 [' + cleanName + '] 전용 폴더가 자동 생성되어 저장됩니다.\n\n' +
        '⚠️ 중요: 안드로이드 보안 정책상 [다운로드] 폴더는 접근이 차단됩니다.\n' +
        '반드시 [문서(Documents)] 폴더 안이나 [내장 메모리] 아래의 폴더를 선택해 주세요.\n\n' +
        '작업 저장 폴더를 선택(또는 권한 허용)하시겠습니까?'
      );
      if (proceed) {
        baseDir = await pickBaseDirectory();
      }
      if (!baseDir) {
        alert('⚠️ 저장 폴더가 지정되지 않아 사진 촬영 및 저장을 진행할 수 없습니다.');
        return false;
      }
    }

    // 2. 도면 전용 폴더 자동 생성 및 연결 (create: true)
    var folder = await getDrawingFolder(drawingName, true);
    if (!folder) {
      alert('⚠️ 도면 저장 폴더를 생성하거나 접근할 수 없습니다. 저장 폴더를 다시 지정해 주세요.');
      var newBase = await pickBaseDirectory();
      if (newBase) {
        folder = await getDrawingFolder(drawingName, true);
      }
      if (!folder) {
        alert('⚠️ 저장 폴더 환경이 준비되지 않아 작업을 진행할 수 없습니다.');
        return false;
      }
    }

    return true;
  }

  // 폴더 권한 및 상태 비동기 쿼리 (실제 디스크 존재 여부까지 100% 검증)
  async function checkFolderStatus(drawingName) {
    if (!isSupported()) return 'unsupported';
    if (!drawingName) return 'no_drawing';
    var cleanName = sanitizeDrawingName(drawingName);

    if (!_baseDirHandle) {
      _baseDirHandle = await loadSavedBaseDirHandle();
    }
    if (!_baseDirHandle) return 'no_folder';

    // 1. 루트 작업 폴더(예: 평택) 권한 확인
    var perm = 'prompt';
    try {
      perm = await _baseDirHandle.queryPermission({ mode: 'readwrite' });
    } catch (e) {
      perm = 'prompt';
    }
    if (perm !== 'granted') {
      return perm; // 'prompt' 또는 'denied'
    }

    // 2. 루트 폴더가 실제 디스크에 존재하는지 검증 (디스크에서 삭제된 경우 NotFoundError)
    try {
      if (typeof _baseDirHandle.values === 'function') {
        var iter = _baseDirHandle.values();
        await iter.next();
      } else if (typeof _baseDirHandle.entries === 'function') {
        var iter2 = _baseDirHandle.entries();
        await iter2.next();
      }
    } catch (e) {
      if (e.name === 'NotFoundError') {
        clearBaseDirHandle();
        return 'no_folder';
      }
    }

    // 3. 도면 서브폴더(예: 01)가 실제 디스크에 존재하는지 확인
    try {
      var sub = await _baseDirHandle.getDirectoryHandle(cleanName, { create: false });
      if (sub) {
        _drawingFolderHandles[cleanName] = sub;
        return 'granted'; // 상위 폴더 및 도면 서브폴더 모두 디스크에 정상 존재!
      }
    } catch (e) {
      if (e.name === 'NotFoundError') {
        delete _drawingFolderHandles[cleanName];
        return 'sub_not_created'; // 상위 평택은 정상이지만 01 폴더는 디스크에 없음(생성 대기)
      }
    }

    return 'prompt';
  }

  // 사진 파일을 도면 폴더에 직접 저장
  async function savePhotoFile(drawingName, fileName, blob) {
    var folderHandle = await getDrawingFolder(drawingName, true);
    if (!folderHandle) return false;

    try {
      var fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
      var writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      console.error('[localFs] 사진 파일 저장 실패:', fileName, err);
      return false;
    }
  }

  // 도면 폴더 내의 메타데이터 JSON 파일 저장
  async function saveMetadataFile(drawingName, metadata) {
    var folderHandle = await getDrawingFolder(drawingName, true);
    if (!folderHandle) return false;

    var cleanName = sanitizeDrawingName(drawingName);
    var metaFileName = cleanName + '_metadata.json';
    try {
      var jsonStr = JSON.stringify(metadata, null, 2);
      var blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

      // [0925_01 최적화] 도면명_metadata.json 단일 파일로 깔끔하게 저장 (중복 metadata.json 제거)
      var fileHandle = await folderHandle.getFileHandle(metaFileName, { create: true });
      var writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();



      return true;
    } catch (err) {
      console.error('[localFs] 메타데이터 저장 실패:', err);
      return false;
    }
  }

  // 도면 폴더 내의 메타데이터 JSON 읽기
  async function loadMetadataFile(drawingName) {
    var folderHandle = await getDrawingFolder(drawingName, false);
    if (!folderHandle) return null;

    var cleanName = sanitizeDrawingName(drawingName);
    var metaFileName = cleanName + '_metadata.json';

    try {
      var fileHandle = null;
      try {
        fileHandle = await folderHandle.getFileHandle(metaFileName);
      } catch (e) {
        fileHandle = await folderHandle.getFileHandle('metadata.json');
      }
      var file = await fileHandle.getFile();
      var text = await file.text();
      return JSON.parse(text);
    } catch (err) {
      return null;
    }
  }

  // [0925_01 혁신] 디렉토리 핸들 내에서 타임스탬프 불일치/이전 파일명 패턴 자동 감지 및 스마트 복구 검색
  async function findMatchingPhotoInFolder(dirHandle, targetFileName) {
    if (!dirHandle || !targetFileName) return null;
    var targetLower = targetFileName.toLowerCase();

    var isSub = false;
    var targetNum = '';
    var targetSubIdx = null;

    // Subphoto: _photo_[num]_[subIdx]_[timestamp].jpg OR _photo_[num]_[subIdx].jpg
    var mSub = targetFileName.match(/_photo_([^_]+)_(\d{1,4})_\d{10,14}\.jpg$/i) || targetFileName.match(/_photo_([^_]+)_(\d{1,4})\.jpg$/i);
    if (mSub) {
      isSub = true;
      targetNum = mSub[1];
      targetSubIdx = mSub[2];
    } else {
      // Main photo: _photo_[num]_[timestamp].jpg OR _photo_[num].jpg
      var mMain = targetFileName.match(/_photo_([^_]+)_\d{10,14}\.jpg$/i) || targetFileName.match(/_photo_([^_]+)\.jpg$/i);
      if (mMain) {
        targetNum = mMain[1];
      } else {
        var mSimpleSub = targetFileName.match(/^([^_]+)_(\d{1,4})\.jpg$/i);
        if (mSimpleSub) {
          isSub = true;
          targetNum = mSimpleSub[1];
          targetSubIdx = mSimpleSub[2];
        } else {
          var mSimpleNum = targetFileName.match(/^([^_]+)\.jpg$/i);
          if (mSimpleNum) targetNum = mSimpleNum[1];
        }
      }
    }

    var entries = [];
    try {
      if (typeof dirHandle.values === 'function') {
        var it = dirHandle.values();
        var next = await it.next();
        while (!next.done) {
          if (next.value && next.value.kind === 'file') {
            entries.push(next.value);
          }
          next = await it.next();
        }
      }
    } catch (e) {
      return null;
    }

    // 1단계: 대소문자 무시 일치
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].name.toLowerCase() === targetLower) {
        try {
          var f = await entries[i].getFile();
          if (f) {
            f.actualFileName = entries[i].name;
            return f;
          }
        } catch (e1) {}
      }
    }

    if (!targetNum) return null;

    // 2단계: 사진번호 및 서브인덱스 기반 스마트 패턴 매칭
    for (var j = 0; j < entries.length; j++) {
      var name = entries[j].name;
      var nameLower = name.toLowerCase();
      if (!nameLower.endsWith('.jpg') && !nameLower.endsWith('.jpeg')) continue;

      if (isSub) {
        var subPattern1 = '_photo_' + targetNum + '_' + targetSubIdx + '_';
        var subPattern2 = '_' + targetNum + '_' + targetSubIdx + '.';
        var subPattern3 = targetNum + '_' + targetSubIdx + '.';
        if (name.indexOf(subPattern1) !== -1 || nameLower.indexOf(subPattern2) !== -1 || nameLower.indexOf(subPattern3) === 0) {
          try {
            var sf = await entries[j].getFile();
            if (sf) {
              sf.actualFileName = name;
              return sf;
            }
          } catch (e2) {}
        }
      } else {
        var mainRegex = new RegExp('_photo_' + targetNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_(\\d{10,14})\\.jpg$', 'i');
        var mainSimple = new RegExp('^' + targetNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.jpg$', 'i');
        if (mainRegex.test(name) || mainSimple.test(name)) {
          try {
            var mf = await entries[j].getFile();
            if (mf) {
              mf.actualFileName = name;
              return mf;
            }
          } catch (e3) {}
        } else if (name.indexOf('_photo_' + targetNum + '_') !== -1) {
          var checkSub = name.match(new RegExp('_photo_' + targetNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_(\\d+)_'));
          if (!checkSub || checkSub[1].length >= 10) {
            try {
              var mf2 = await entries[j].getFile();
              if (mf2) {
                mf2.actualFileName = name;
                return mf2;
              }
            } catch (e4) {}
          }
        }
      }
    }

    return null;
  }

  // 도면 폴더 내의 사진 파일 이름 변경
  async function renamePhotoFile(drawingName, oldFileName, newFileName) {
    if (!drawingName || !oldFileName || !newFileName || oldFileName === newFileName) return true;
    var folderHandle = await getDrawingFolder(drawingName, true);
    if (!folderHandle) return false;
    try {
      var oldHandle = await folderHandle.getFileHandle(oldFileName, { create: false });
      if (typeof oldHandle.move === 'function') {
        await oldHandle.move(newFileName);
        return true;
      }
      var oldFile = await oldHandle.getFile();
      var newHandle = await folderHandle.getFileHandle(newFileName, { create: true });
      var writable = await newHandle.createWritable();
      await writable.write(oldFile);
      await writable.close();
      await folderHandle.removeEntry(oldFileName);
      return true;
    } catch (e) {
      console.warn('[localFs] 사진 파일 이름 변경 실패:', oldFileName, '->', newFileName, e);
      return false;
    }
  }

  // 도면 폴더에서 사진 Blob 가져오기 (정확한 파일명 및 타임스탬프 불일치 스마트 자동 복구)
  async function getPhotoBlob(drawingName, fileName) {
    if (!drawingName || !fileName) return null;

    // 1. 도면 서브폴더(예: 01)에서 검색
    var folderHandle = await getDrawingFolder(drawingName, false);
    if (folderHandle) {
      // 1-1. 정확한 파일명 매칭 우선 시도
      try {
        var fileHandle = await folderHandle.getFileHandle(fileName, { create: false });
        var file = await fileHandle.getFile();
        if (file) {
          file.actualFileName = fileName;
          return file;
        }
      } catch (err) {}

      // 1-2. 타임스탬프 불일치/이전 파일명 스마트 자동 복구 검색
      try {
        var foundFile = await findMatchingPhotoInFolder(folderHandle, fileName);
        if (foundFile) {
          console.log('[localFs] 서브폴더에서 대체 사진 파일 자동 매칭 성공:', fileName, '->', foundFile.actualFileName);
          return foundFile;
        }
      } catch (scanErr) {
        console.warn('[localFs] 서브폴더 스마트 검색 예외:', scanErr);
      }
    }

    // 2. 상위 루트 작업 폴더(예: 평택)에서 검색 (이전 버전 호환성)
    if (!_baseDirHandle) {
      _baseDirHandle = await loadSavedBaseDirHandle();
    }
    if (_baseDirHandle) {
      try {
        var rootFileHandle = await _baseDirHandle.getFileHandle(fileName, { create: false });
        var rootFile = await rootFileHandle.getFile();
        if (rootFile) {
          rootFile.actualFileName = fileName;
          return rootFile;
        }
      } catch (e) {}

      try {
        var rootFound = await findMatchingPhotoInFolder(_baseDirHandle, fileName);
        if (rootFound) {
          console.log('[localFs] 루트폴더에서 대체 사진 파일 자동 매칭 성공:', fileName, '->', rootFound.actualFileName);
          return rootFound;
        }
      } catch (scanErr2) {}
    }

    console.warn('[localFs] 사진 파일 읽기 실패:', fileName);
    return null;
  }

  // 도면 폴더에서 사진 파일 삭제
  async function deletePhotoFile(drawingName, fileName) {
    var folderHandle = await getDrawingFolder(drawingName, false);
    if (!folderHandle) return false;

    try {
      await folderHandle.removeEntry(fileName);
      return true;
    } catch (err) {
      console.warn('[localFs] 사진 파일 삭제 실패:', fileName, err);
      return false;
    }
  }

  // 도면 폴더 전체(사진 및 메타데이터 일괄) 삭제
  async function deleteDrawingFiles(drawingName) {
    var baseDir = await getBaseDirectory();
    if (!baseDir) return false;

    var cleanName = sanitizeDrawingName(drawingName);
    try {
      if (typeof baseDir.removeEntry === 'function') {
        try {
          await baseDir.removeEntry(cleanName, { recursive: true });
          console.log('[localFs] 도면 폴더 일괄 삭제 완료:', cleanName);
          return true;
        } catch (subErr) {
          // 재귀 삭제 실패 시 하위 파일 개별 순회 삭제 시도
        }
      }

      var folderHandle = await getDrawingFolder(drawingName, false);
      if (folderHandle) {
        if (folderHandle.values) {
          for await (var entry of folderHandle.values()) {
            try {
              await folderHandle.removeEntry(entry.name, { recursive: entry.kind === 'directory' });
            } catch (delErr) {
              console.warn('[localFs] 파일 삭제 실패:', entry.name, delErr);
            }
          }
        }
      }
      return true;
    } catch (err) {
      console.warn('[localFs] 도면 폴더 삭제 중 오류:', err);
      return false;
    }
  }



  // 현재 루트 저장소 상태 확인 및 반환
  function getBaseDirName() {
    return _baseDirName || localStorage.getItem('sdmap_base_dir_name') || '';
  }

  // 외부 공개 API
  window.localFs = {
    isSupported: isSupported,
    isIOS: isIOS,
    pickBaseDirectory: pickBaseDirectory,
    loadSavedBaseDirHandle: loadSavedBaseDirHandle,
    verifyPermission: verifyPermission,
    getDrawingFolder: getDrawingFolder,
    savePhotoFile: savePhotoFile,
    saveMetadataFile: saveMetadataFile,
    loadMetadataFile: loadMetadataFile,
    getPhotoBlob: getPhotoBlob,
    deletePhotoFile: deletePhotoFile,
    renamePhotoFile: renamePhotoFile,
    deleteDrawingFiles: deleteDrawingFiles,
    getBaseDirName: getBaseDirName,
    getBaseDirectory: getBaseDirectory,
    ensureStorageReady: ensureStorageReady,
    checkFolderStatus: checkFolderStatus,
    clearBaseDirHandle: clearBaseDirHandle,
    sanitizeDrawingName: sanitizeDrawingName,
    getDrawingFolderName: sanitizeDrawingName,
    hasBaseDir: function () {
      return !!(_baseDirHandle || localStorage.getItem('sdmap_base_dir_name'));
    }
  };

  // 초기화 시 기존 저장된 핸들 로드 시도
  if (isSupported()) {
    loadSavedBaseDirHandle().catch(function () {});
  }

})(window);
