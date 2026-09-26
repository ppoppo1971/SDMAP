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

  // 폴더 읽기/쓰기 권한 검사 및 요청
  async function verifyPermission(handle, readWrite) {
    if (!handle) return false;
    var options = {};
    if (readWrite) options.mode = 'readwrite';
    try {
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }
      if ((await handle.requestPermission(options)) === 'granted') {
        return true;
      }
    } catch (e) {
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
        alert('저장 폴더가 설정되었습니다:\n📁 ' + handle.name + '\n\n도면별로 [도면명] 폴더가 자동 생성되어 사진과 메타데이터가 저장됩니다.');
        return handle;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[localFs] 폴더 선택 실패:', err);
        alert('폴더를 선택하지 못했습니다: ' + (err.message || err));
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
  async function getBaseDirectory() {
    if (!_baseDirHandle) {
      _baseDirHandle = await loadSavedBaseDirHandle();
    }
    if (!_baseDirHandle) return null;
    var hasPermission = await verifyPermission(_baseDirHandle, true);
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

  // 도면별 서브폴더 핸들 가져오기 (없으면 생성 및 IndexedDB 영구 보존)
  async function getDrawingFolder(drawingName, autoCreate) {
    if (autoCreate === undefined) autoCreate = true;
    if (!drawingName) return null;

    var cleanName = sanitizeDrawingName(drawingName);

    // 1. 기존에 영구 보존된 도면 전용 폴더 핸들이 있는지 우선 확인
    var existingFolder = await loadDrawingFolderHandle(drawingName);
    if (existingFolder) {
      var perm = await verifyPermission(existingFolder, true);
      if (perm) return existingFolder;
    }

    // 2. 루트 작업 폴더 아래에서 [도면명] 하위 폴더 생성/가져오기
    var baseDir = await getBaseDirectory();
    if (!baseDir) return null;

    try {
      var subFolder = await baseDir.getDirectoryHandle(cleanName, { create: autoCreate });
      if (subFolder) {
        await saveDrawingFolderHandle(drawingName, subFolder);
      }
      return subFolder;
    } catch (e) {
      console.warn('[localFs] 도면 폴더 접근 실패:', e);
      return null;
    }
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

      // AutoCAD 자동 전개용 AutoLISP 스크립트 (SDInsertPhotos.lsp) 함께 생성
      try {
        var lspText = getLspScriptContent();
        var lspBlob = new Blob([lspText], { type: 'text/plain;charset=utf-8' });
        var lspHandle = await folderHandle.getFileHandle('SDInsertPhotos.lsp', { create: true });
        var lspWritable = await lspHandle.createWritable();
        await lspWritable.write(lspBlob);
        await lspWritable.close();
      } catch (lspErr) {
        console.warn('[localFs] SDInsertPhotos.lsp 생성 실패 (무시 가능):', lspErr);
      }

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

  // 도면 폴더에서 사진 Blob 가져오기
  async function getPhotoBlob(drawingName, fileName) {
    var folderHandle = await getDrawingFolder(drawingName, false);
    if (!folderHandle) return null;

    try {
      var fileHandle = await folderHandle.getFileHandle(fileName);
      var file = await fileHandle.getFile();
      return file;
    } catch (err) {
      console.warn('[localFs] 사진 파일 읽기 실패:', fileName, err);
      return null;
    }
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

  // AutoCAD 사진 및 문자 자동 삽입용 AutoLISP 스크립트 본문 생성
  function getLspScriptContent() {
    return [
      ';;; ====================================================================',
      ';;; SDInsertPhotos.lsp - SDMAP 전용 사진/제원/텍스트 AutoCAD 자동 전개 스크립트',
      ';;; SDMAP에서 저장된 사진(.jpg)과 메타데이터 JSON을 AutoCAD 도면에 100% 자동 삽입',
      ';;;',
      ';;; 주요 기능:',
      ';;;   1. 탐색기에서 메타데이터 JSON(도면명_metadata.json 또는 metadata.json) 선택',
      ';;;   2. 모든 사진(메인사진 및 서브사진)을 0_IM 레이어에 원 좌표로 자동 삽입 (스케일 1.5)',
      ';;;   3. 사진 메모가 있는 경우 사진 하단에 0_TEXT 레이어로 자동 기입',
      ';;;   4. 모든 텍스트(사진번호, 시설물 제원 미리보기 문자, 텍스트 전용 메모)를 0_TEXT 레이어에 자동 전개',
      ';;;   5. 스마트 스냅: 2.0m 이내 블록(INSERT) 객체가 있는 경우 블록 중심점으로 정밀 자동 스냅',
      ';;;',
      ';;; 명령어: SDINSERTPHOTOS (또는 INSERTPHOTOS, NINSERTPHOTOS)',
      ';;; ====================================================================',
      '',
      '(defun C:SDINSERTPHOTOS (/ dwg-path json-file f line content',
      '                           photo-count text-count i j fileName x y memo photo-path',
      '                           insert-pt scale text-height',
      '                           text-x text-y text-content',
      '                           success-count fail-count',
      '                           start-time end-time snap-pt snap-x snap-y',
      '                           photo-folder doc mspace textstyle-name old-cmdecho)',
      '  ',
      '  (vl-load-com)',
      '  ',
      '  (princ "\\n========================================")',
      '  (princ "\\n[SDMAP] 사진 및 문자 데이터 CAD 자동 전개 시작")',
      '  (princ "\\n  사진 스케일: 1.5 | 문자 높이: 1.5")',
      '  (princ "\\n  사진 레이어: 0_IM | 문자 레이어: 0_TEXT")',
      '  (princ "\\n========================================\\n")',
      '  ',
      '  (setq start-time (getvar "MILLISECS"))',
      '  (setq dwg-path (getvar "DWGPREFIX"))',
      '  ',
      '  ;; 메타데이터 파일 선택',
      '  (princ "\\n메타데이터 JSON 파일을 선택하세요...")',
      '  (setq json-file',
      '    (getfiled "SDMAP 메타데이터 JSON 파일 선택"',
      '              dwg-path',
      '              "json"',
      '              0))',
      '  (if (= json-file nil)',
      '    (progn',
      '      (princ "\\n파일 선택이 취소되었습니다.")',
      '      (princ)',
      '      (exit)',
      '    )',
      '  )',
      '  ',
      '  (setq photo-folder (strcat (vl-filename-directory json-file) "\\\\"))',
      '  (princ (strcat "\\n메타데이터 파일: " (vl-filename-base json-file) ".json"))',
      '  (princ (strcat "\\n사진 폴더: " photo-folder))',
      '  ',
      '  (if (not (findfile json-file))',
      '    (progn',
      '      (princ "\\n파일을 찾을 수 없습니다.")',
      '      (princ)',
      '      (exit)',
      '    )',
      '  )',
      '  ',
      '  ;; 파일 읽기',
      '  (setq content "")',
      '  (setq f (open json-file "r"))',
      '  (if (not f)',
      '    (progn (princ "\\n파일을 열 수 없습니다.") (princ) (exit))',
      '  )',
      '  (while (setq line (read-line f))',
      '    (setq content (strcat content line "\\n"))',
      '  )',
      '  (close f)',
      '  ',
      '  ;; 사진/텍스트 개수 계산',
      '  (setq photo-count (sd-count-occurrences "\\"fileName\\"" content))',
      '  (setq text-count (sd-count-texts content))',
      '  ',
      '  (princ (strcat "\\n\\n발견된 데이터 항목:"))',
      '  (princ (strcat "\\n   사진(메인+서브): " (itoa photo-count) "개"))',
      '  (princ (strcat "\\n   문자(번호+제원+메모): " (itoa text-count) "개"))',
      '  ',
      '  (if (and (= photo-count 0) (= text-count 0))',
      '    (progn (princ "\\n삽입할 항목이 없습니다.") (princ) (exit))',
      '  )',
      '  ',
      '  ;; 전용 레이어 자동 생성',
      '  (command "._LAYER" "_Make" "0_IM" "")',
      '  (command "._LAYER" "_Make" "0_TEXT" "")',
      '  ',
      '  ;; 성능 최적화',
      '  (setq old-cmdecho (getvar "CMDECHO"))',
      '  (setvar "CMDECHO" 0)',
      '  (command "_.UNDO" "_Begin")',
      '  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))',
      '  (setq mspace (vla-get-ModelSpace doc))',
      '  (setq textstyle-name (getvar "TEXTSTYLE"))',
      '  (setq success-count 0)',
      '  (setq fail-count 0)',
      '  (setq scale 1.5)',
      '  (setq text-height 1.5)',
      '  ',
      '  ;; === [1] 사진 삽입 (메인 및 서브사진 모두 포함) ===',
      '  (if (> photo-count 0)',
      '    (progn',
      '      (princ "\\n\\n사진 삽입 중...\\n")',
      '      (setq i 0)',
      '      (while (< i photo-count)',
      '        (princ (strcat "\\r   사진 진행: [" (itoa (+ i 1)) "/" (itoa photo-count) "] "))',
      '        (setq fileName (sd-get-json-value content "\\"fileName\\"" i))',
      '        (setq x (atof (sd-get-photo-field content "\\"x\\"" i)))',
      '        (setq y (atof (sd-get-photo-field content "\\"y\\"" i)))',
      '        (setq memo (sd-get-json-value content "\\"memo\\"" i))',
      '        ',
      '        ;; 스마트 스냅 (2.0m 이내 블록에 정밀 맞춤)',
      '        (setq snap-pt (sd-smart-snap (list x y 0.0) 2.0))',
      '        (setq snap-x (car snap-pt))',
      '        (setq snap-y (cadr snap-pt))',
      '        ',
      '        (setq photo-path (strcat photo-folder fileName))',
      '        ',
      '        (if (not (findfile photo-path))',
      '          (progn',
      '            (princ (strcat "\\n       파일 없음: " fileName))',
      '            (setq fail-count (+ fail-count 1))',
      '          )',
      '          (progn',
      '            (setvar "CLAYER" "0_IM")',
      '            (if (vl-catch-all-error-p',
      '                  (vl-catch-all-apply',
      '                    \'vla-AddRaster',
      '                    (list mspace photo-path (vlax-3D-point snap-x snap-y 0.0) scale 0.0)',
      '                  )',
      '                )',
      '              (progn',
      '                (if (vl-catch-all-error-p',
      '                      (vl-catch-all-apply',
      '                        \'vl-cmdf',
      '                        (list "._-IMAGE" "_A" photo-path (strcat (rtos snap-x 2 6) "," (rtos snap-y 2 6)) (rtos scale 2 6) "0")',
      '                      )',
      '                    )',
      '                  (progn',
      '                    (princ (strcat "\\n       이미지 삽입 실패: " fileName))',
      '                    (setq fail-count (+ fail-count 1))',
      '                  )',
      '                  (progn',
      '                    (if (and memo (> (strlen memo) 0) (/= (vl-string-trim " \\t\\n\\r" memo) ""))',
      '                      (progn',
      '                        (setvar "CLAYER" "0_TEXT")',
      '                        (entmake (list \'(0 . "TEXT") (cons 8 "0_TEXT") (cons 10 (list snap-x (- snap-y 2.0) 0.0)) (cons 40 text-height) (cons 1 memo) (cons 50 0.0) (cons 7 textstyle-name)))',
      '                      )',
      '                    )',
      '                    (setq success-count (+ success-count 1))',
      '                  )',
      '                )',
      '              )',
      '              (progn',
      '                (if (and memo (> (strlen memo) 0) (/= (vl-string-trim " \\t\\n\\r" memo) ""))',
      '                  (progn',
      '                    (setvar "CLAYER" "0_TEXT")',
      '                    (entmake (list \'(0 . "TEXT") (cons 8 "0_TEXT") (cons 10 (list snap-x (- snap-y 2.0) 0.0)) (cons 40 text-height) (cons 1 memo) (cons 50 0.0) (cons 7 textstyle-name)))',
      '                  )',
      '                )',
      '                (setq success-count (+ success-count 1))',
      '              )',
      '            )',
      '          )',
      '        )',
      '        (setq i (+ i 1))',
      '      )',
      '      (princ "\\n")',
      '    )',
      '  )',
      '  ',
      '  ;; === [2] 문자(제원/번호/텍스트입력) 삽입 ===',
      '  (if (> text-count 0)',
      '    (progn',
      '      (princ "\\n문자 데이터 전개 중...\\n")',
      '      (setvar "CLAYER" "0_TEXT")',
      '      (setq j 0)',
      '      (while (< j text-count)',
      '        (princ (strcat "\\r   문자 진행: [" (itoa (+ j 1)) "/" (itoa text-count) "] "))',
      '        (setq text-x (atof (sd-get-text-field content "\\"x\\"" j)))',
      '        (setq text-y (atof (sd-get-text-field content "\\"y\\"" j)))',
      '        (setq text-content (sd-get-text-field content "\\"text\\"" j))',
      '        ',
      '        (setq snap-pt (sd-smart-snap (list text-x text-y 0.0) 2.0))',
      '        (setq snap-x (car snap-pt))',
      '        (setq snap-y (cadr snap-pt))',
      '        ',
      '        (if (and text-content (> (strlen text-content) 0))',
      '          (progn',
      '            (entmake (list \'(0 . "TEXT") (cons 8 "0_TEXT") (cons 10 (list snap-x snap-y 0.0)) (cons 40 1.5) (cons 1 text-content) (cons 50 0.0) (cons 7 textstyle-name)))',
      '            (setq success-count (+ success-count 1))',
      '          )',
      '        )',
      '        (setq j (+ j 1))',
      '      )',
      '      (princ "\\n")',
      '    )',
      '  )',
      '  ',
      '  ;; 완료 처리',
      '  (command "_.UNDO" "_End")',
      '  (setvar "CMDECHO" old-cmdecho)',
      '  ',
      '  (princ "\\n\\n========================================")',
      '  (princ "\\n[SDMAP] CAD 전개 완료!")',
      '  (princ (strcat "\\n   총 성공: " (itoa success-count) "개 항목"))',
      '  (if (> fail-count 0) (princ (strcat "\\n   누락/실패: " (itoa fail-count) "개")))',
      '  (setq end-time (getvar "MILLISECS"))',
      '  (princ (strcat "\\n   소요 시간: " (itoa (- end-time start-time)) "ms"))',
      '  (princ "\\n========================================\\n")',
      '  (princ)',
      ')',
      '',
      ';; 편의용 단축 명령어 별칭 등록',
      '(defun C:INSERTPHOTOS () (C:SDINSERTPHOTOS))',
      '(defun C:NINSERTPHOTOS () (C:SDINSERTPHOTOS))',
      '',
      ';;; 보조 파싱 함수',
      '(defun sd-smart-snap (pt snap-radius / ss ent ent-data closest-pt closest-dist test-pt test-dist i min-x min-y max-x max-y)',
      '  (setq min-x (- (car pt) snap-radius))',
      '  (setq min-y (- (cadr pt) snap-radius))',
      '  (setq max-x (+ (car pt) snap-radius))',
      '  (setq max-y (+ (cadr pt) snap-radius))',
      '  (setq ss (ssget "C" (list min-x min-y) (list max-x max-y) \'((0 . "INSERT"))))',
      '  (setq closest-pt nil)',
      '  (setq closest-dist snap-radius)',
      '  (if ss',
      '    (progn',
      '      (setq i 0)',
      '      (while (< i (sslength ss))',
      '        (setq ent (ssname ss i))',
      '        (setq ent-data (entget ent))',
      '        (if (= (cdr (assoc 0 ent-data)) "INSERT")',
      '          (progn',
      '            (setq test-pt (cdr (assoc 10 ent-data)))',
      '            (setq test-dist (distance pt (list (car test-pt) (cadr test-pt))))',
      '            (if (< test-dist closest-dist)',
      '              (progn (setq closest-dist test-dist) (setq closest-pt (list (car test-pt) (cadr test-pt) 0.0)))',
      '            )',
      '          )',
      '        )',
      '        (setq i (1+ i))',
      '      )',
      '    )',
      '  )',
      '  (if closest-pt closest-pt pt)',
      ')',
      '',
      '(defun sd-count-occurrences (search-str in-str / count pos)',
      '  (setq count 0 pos 1)',
      '  (while (setq pos (vl-string-search search-str in-str (1- pos)))',
      '    (setq count (1+ count) pos (+ pos (strlen search-str) 1)))',
      '  count)',
      '',
      '(defun sd-count-texts (content / ts te tc)',
      '  (setq ts (vl-string-search "\\"texts\\":" content))',
      '  (if ts',
      '    (progn',
      '      (setq ts (vl-string-search "[" content ts))',
      '      (setq te (vl-string-search "]" content ts))',
      '      (setq tc (substr content (1+ ts) (- te ts)))',
      '      (sd-count-occurrences "\\"text\\"" tc))',
      '    0))',
      '',
      '(defun sd-get-json-value (json-str key occurrence / pos count start-pos end-pos value)',
      '  (setq count 0 pos 0 value "")',
      '  (while (and (<= count occurrence) (< pos (strlen json-str)))',
      '    (setq pos (vl-string-search key json-str pos))',
      '    (if pos',
      '      (progn',
      '        (if (= count occurrence)',
      '          (progn',
      '            (setq start-pos (vl-string-search ":" json-str pos))',
      '            (if start-pos (progn',
      '              (setq start-pos (1+ start-pos))',
      '              (while (and (< start-pos (strlen json-str)) (member (substr json-str (1+ start-pos) 1) \'(" " "\\t" "\\n" "\\r")))',
      '                (setq start-pos (1+ start-pos)))',
      '              (setq start-pos (1+ start-pos))',
      '              (cond',
      '                ((= (substr json-str start-pos 1) "\\"")',
      '                 (setq end-pos (vl-string-search "\\"" json-str start-pos))',
      '                 (if end-pos (setq value (substr json-str (1+ start-pos) (- end-pos start-pos))) (setq value "")))',
      '                ((wcmatch (substr json-str start-pos 1) "0123456789.-+")',
      '                 (setq end-pos start-pos)',
      '                 (while (and (< end-pos (strlen json-str)) (wcmatch (substr json-str (1+ end-pos) 1) "0123456789.-+eE"))',
      '                   (setq end-pos (1+ end-pos)))',
      '                 (setq value (substr json-str start-pos (1+ (- end-pos start-pos)))))',
      '                (t (setq end-pos (vl-string-search "," json-str start-pos))',
      '                   (if (not end-pos) (setq end-pos (vl-string-search "}" json-str start-pos)))',
      '                   (if end-pos (setq value (substr json-str start-pos (1+ (- end-pos start-pos)))) (setq value "")))',
      '              )',
      '            ))',
      '          )',
      '        )',
      '        (setq count (1+ count) pos (+ pos (strlen key)))',
      '      )',
      '      (setq pos (strlen json-str))))',
      '  (while (and (> (strlen value) 0) (member (substr value 1 1) \'(" " "\\t" "\\n" "\\r" "\\"" "\'")))',
      '    (setq value (substr value 2)))',
      '  (while (and (> (strlen value) 0) (member (substr value (strlen value) 1) \'(" " "\\t" "\\n" "\\r" "," "\\"" "\'")))',
      '    (setq value (substr value 1 (1- (strlen value)))))',
      '  value)',
      '',
      '(defun sd-get-photo-field (json-str key occurrence / ps pe pc)',
      '  (setq ps (vl-string-search "\\"photos\\":" json-str))',
      '  (if ps (progn',
      '    (setq ps (vl-string-search "[" json-str ps))',
      '    (setq pe (sd-find-matching-bracket json-str ps))',
      '    (setq pc (substr json-str (1+ ps) (- pe ps)))',
      '    (sd-get-json-value pc key occurrence)) "0"))',
      '',
      '(defun sd-get-text-field (json-str key occurrence / ts te tc)',
      '  (setq ts (vl-string-search "\\"texts\\":" json-str))',
      '  (if ts (progn',
      '    (setq ts (vl-string-search "[" json-str ts))',
      '    (setq te (sd-find-matching-bracket json-str ts))',
      '    (setq tc (substr json-str (1+ ts) (- te ts)))',
      '    (sd-get-json-value tc key occurrence)) ""))',
      '',
      '(defun sd-find-matching-bracket (str start-pos / depth i ch len)',
      '  (setq depth 0 i start-pos len (strlen str))',
      '  (while (< i len)',
      '    (setq ch (substr str (1+ i) 1))',
      '    (cond ((= ch "[") (setq depth (1+ depth)))',
      '          ((= ch "]") (setq depth (1- depth)) (if (= depth 0) (progn (setq len -1)))))',
      '    (if (>= len 0) (setq i (1+ i))))',
      '  i)',
      '',
      '(princ "\\n========================================")',
      '(princ "\\n[SDMAP] SDInsertPhotos.lsp 로드 완료")',
      '(princ "\\n명령어: SDINSERTPHOTOS (또는 INSERTPHOTOS)")',
      '(princ "\\n  - 사진 레이어: 0_IM")',
      '(princ "\\n  - 문자 레이어: 0_TEXT")',
      '(princ "\\n========================================")',
      '(princ)'
    ].join('\\r\\n');
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
    deleteDrawingFiles: deleteDrawingFiles,
    getBaseDirName: getBaseDirName,
    getBaseDirectory: getBaseDirectory,
    hasBaseDir: function () {
      return !!(_baseDirHandle || localStorage.getItem('sdmap_base_dir_name'));
    }
  };

  // 초기화 시 기존 저장된 핸들 로드 시도
  if (isSupported()) {
    loadSavedBaseDirHandle().catch(function () {});
  }

})(window);
