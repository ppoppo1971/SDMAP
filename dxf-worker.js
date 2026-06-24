/**
 * dxf-worker.js
 * DXF 도면 파싱 및 이미지 압축을 백그라운드 스레드에서 처리하는 Web Worker 스크립트.
 */
'use strict';

// 외부 DXF 파서 라이브러리 로드
importScripts('libs/dxf-parser.min.js');

// alternating lines를 한 쌍씩 스캔하여 메모리 복사를 방지하는 그룹 스캐너
function iterateDxfGroups(text, callback) {
  var pos = 0;
  var len = text.length;
  var groupCode = null;
  
  while (pos < len) {
    var nextNewline = text.indexOf('\n', pos);
    var lineEnd = nextNewline === -1 ? len : nextNewline;
    var line = text.substring(pos, lineEnd).trim();
    pos = lineEnd + 1;
    
    if (line.charCodeAt(line.length - 1) === 13) { // \r 처리
      line = line.substring(0, line.length - 1).trim();
    }
    
    if (groupCode === null) {
      groupCode = parseInt(line, 10);
    } else {
      callback(groupCode, line);
      groupCode = null;
    }
  }
}

// 1. 다중 꼭짓점 constantWidth 매칭 알고리즘 (이진 탐색 적용)
function extractConstantWidths(dxfData, text) {
  if (!dxfData || !dxfData.entities) return;

  var mapList = [];
  var inEntity = false;
  var currentLayer = '';
  var constantWidth = null;
  var entityType = '';
  var firstX = null;
  var firstY = null;

  function pushCurrent() {
    if (inEntity && constantWidth !== null && currentLayer) {
      mapList.push({
        layer: currentLayer,
        constantWidth: constantWidth,
        type: entityType,
        firstVertex: firstX !== null && firstY !== null ? { x: firstX, y: firstY } : null
      });
    }
  }

  iterateDxfGroups(text, function (code, value) {
    if (code === 0) {
      if (value === 'LWPOLYLINE' || value === 'POLYLINE') {
        pushCurrent();
        inEntity = true;
        entityType = value;
        currentLayer = '';
        constantWidth = null;
        firstX = null;
        firstY = null;
      } else {
        pushCurrent();
        inEntity = false;
      }
    } else if (inEntity) {
      if (code === 8) {
        currentLayer = value;
      } else if (code === 43) {
        var val = parseFloat(value);
        if (!isNaN(val)) constantWidth = val;
      } else if (code === 10 && firstX === null) {
        var val = parseFloat(value);
        if (!isNaN(val)) firstX = val;
      } else if (code === 20 && firstX !== null && firstY === null) {
        var val = parseFloat(value);
        if (!isNaN(val)) firstY = val;
      }
    }
  });
  pushCurrent();

  var mapListByLayerType = {};
  for (var idx = 0; idx < mapList.length; idx++) {
    var item = mapList[idx];
    item.globalIndex = idx;
    var key = item.layer + "_" + item.type;
    if (!mapListByLayerType[key]) mapListByLayerType[key] = [];
    mapListByLayerType[key].push(item);
  }

  var mapIndex = 0;
  dxfData.entities.forEach(function (entity) {
    if (entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE') return;
    if (entity.constantWidth !== undefined && entity.constantWidth !== null) return;
    
    var group = mapListByLayerType[entity.layer + "_" + entity.type];
    if (!group || group.length === 0) return;

    var best = null;
    if (entity.vertices && entity.vertices.length > 0) {
      var v0 = entity.vertices[0];
      var th = 0.001;
      for (var k = 0; k < group.length; k++) {
        var item = group[k];
        if (item.firstVertex && Math.abs(v0.x - item.firstVertex.x) < th && Math.abs(v0.y - item.firstVertex.y) < th) {
          best = item;
          break;
        }
      }
    }

    if (!best) {
      var low = 0;
      var high = group.length - 1;
      var closestIdx = 0;
      var minDiff = Infinity;
      while (low <= high) {
        var mid = Math.floor((low + high) / 2);
        var diff = Math.abs(group[mid].globalIndex - mapIndex);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = mid;
        }
        if (group[mid].globalIndex < mapIndex) {
          low = mid + 1;
        } else if (group[mid].globalIndex > mapIndex) {
          high = mid - 1;
        } else {
          closestIdx = mid;
          break;
        }
      }
      best = group[closestIdx];
    }

    if (best) {
      entity.constantWidth = best.constantWidth;
      mapIndex = best.globalIndex + 1;
    }
  });
}

// 2. 단일 패스 참조 이미지 정보 추출
function extractDxfImageRefs(text) {
  var handleToFilename = {};
  var tempImages = [];
  
  var currentType = '';
  var tempImg = null;
  var tempDef = null;

  iterateDxfGroups(text, function (code, value) {
    if (code === 0) {
      if (currentType === 'IMAGE' && tempImg) {
        if (tempImg.x !== null && tempImg.y !== null) {
          tempImages.push(tempImg);
        }
      } else if (currentType === 'IMAGEDEF' && tempDef) {
        if (tempDef.handle && tempDef.file) {
          handleToFilename[tempDef.handle.toUpperCase()] = tempDef.file.replace(/\\/g, '/');
        }
      }

      currentType = value;
      if (value === 'IMAGE') {
        tempImg = { x: null, y: null, handle: '' };
      } else if (value === 'IMAGEDEF') {
        tempDef = { handle: '', file: '' };
      } else {
        tempImg = null;
        tempDef = null;
      }
    } else {
      if (currentType === 'IMAGE' && tempImg) {
        if (code === 10) tempImg.x = parseFloat(value);
        else if (code === 20) tempImg.y = parseFloat(value);
        else if (code === 340) tempImg.handle = value;
      } else if (currentType === 'IMAGEDEF' && tempDef) {
        if (code === 5) tempDef.handle = value;
        else if (code === 1) tempDef.file = value;
      }
    }
  });

  if (currentType === 'IMAGE' && tempImg) {
    if (tempImg.x !== null && tempImg.y !== null) {
      tempImages.push(tempImg);
    }
  } else if (currentType === 'IMAGEDEF' && tempDef) {
    if (tempDef.handle && tempDef.file) {
      handleToFilename[tempDef.handle.toUpperCase()] = tempDef.file.replace(/\\/g, '/');
    }
  }

  var refs = [];
  tempImages.forEach(function (img) {
    var handleUpper = img.handle ? img.handle.toUpperCase() : '';
    var fn = handleToFilename[handleUpper] || '';
    refs.push({ x: img.x, y: img.y, fileName: fn || '(이미지)', handle: img.handle });
  });

  return refs;
}

// 3. OffscreenCanvas를 활용한 이미지 백그라운드 압축 (메인 스레드 멈춤 현상 제거)
function compressImageWorker(file, targetSize) {
  return createImageBitmap(file).then(function (bitmap) {
    var maxDim = targetSize <= 500 * 1024 ? 800 : targetSize <= 1024 * 1024 ? 1200 : targetSize <= 2 * 1024 * 1024 ? 1600 : 2000;
    var w = bitmap.width;
    var h = bitmap.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.floor((h / w) * maxDim);
        w = maxDim;
      } else {
        w = Math.floor((w / h) * maxDim);
        h = maxDim;
      }
    }
    
    var canvas = new OffscreenCanvas(w, h);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);

    var adjustedTarget = targetSize * 2.5;
    var pixelCount = w * h;
    var quality = Math.pow(adjustedTarget / (pixelCount * 0.25), 1 / 1.6);
    quality = Math.max(0.4, Math.min(0.95, quality));
    if (targetSize <= 500 * 1024) quality *= 1.2;
    else if (targetSize <= 1024 * 1024) quality *= 1.15;
    else quality *= 1.1;
    quality = Math.max(0.4, Math.min(0.95, quality));

    function toBlob(q) {
      return canvas.convertToBlob({ type: 'image/jpeg', quality: q });
    }

    var cleanedUp = false;
    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      if (bitmap && bitmap.close) bitmap.close();
      ctx = null;
      canvas = null;
    }

    return toBlob(quality).then(function (firstBlob) {
      var compressedBlob = firstBlob;
      var minQ = 0.3, maxQ = 0.95, q = quality;
      var tolerance = 0.12, maxIter = 3, iter = 0;

      function next() {
        var diffRatio = Math.abs(compressedBlob.size - targetSize) / targetSize;
        if (diffRatio <= tolerance || iter >= maxIter) {
          if (compressedBlob.size < targetSize * 0.7 && canvas) {
            var scaleFactor = Math.sqrt(targetSize / compressedBlob.size) * 1.05;
            var nw = Math.floor(w * scaleFactor);
            var nh = Math.floor(h * scaleFactor);
            canvas = new OffscreenCanvas(nw, nh);
            ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, nw, nh);
            var nq = Math.pow(adjustedTarget / (nw * nh * 0.25), 1 / 1.6);
            nq = Math.max(0.4, Math.min(0.9, nq));
            return toBlob(nq).then(function (upscaledBlob) {
              cleanup();
              return upscaledBlob;
            });
          }
          cleanup();
          return compressedBlob;
        }
        iter++;
        if (compressedBlob.size > targetSize) {
          maxQ = q;
          q = (minQ + q) / 2;
        } else {
          minQ = q;
          q = (q + maxQ) / 2;
        }
        q = Math.max(0.3, Math.min(0.95, q));
        return toBlob(q).then(function (newBlob) {
          compressedBlob = newBlob;
          return next();
        });
      }

      return next();
    }).catch(function (err) {
      cleanup();
      throw err;
    });
  });
}

// 메인 스레드로부터 메시지 수신 리스너
self.onmessage = function (e) {
  var data = e.data;
  
  if (data.type === 'parse_dxf') {
    var text = data.text;
    if (!text) {
      self.postMessage({ error: 'DXF 데이터가 비어 있습니다.' });
      return;
    }

    try {
      if (typeof DxfParser === 'undefined') {
        throw new Error('DXF 파서 라이브러리가 로드되지 않았습니다.');
      }
      
      var parser = new DxfParser();
      var parsedData = parser.parseSync(text);
      if (!parsedData) throw new Error('DXF 파싱에 실패했습니다.');

      extractConstantWidths(parsedData, text);
      var rawRefs = extractDxfImageRefs(text);

      self.postMessage({ type: 'parse_dxf_success', dxfData: parsedData, rawImageRefs: rawRefs });
    } catch (err) {
      self.postMessage({ error: err.message || String(err) });
    }
  } 
  else if (data.type === 'compress_image') {
    var file = data.file;
    var targetSize = data.targetSize;
    
    if (typeof OffscreenCanvas === 'undefined') {
      self.postMessage({ error: 'OffscreenCanvas를 지원하지 않는 브라우저입니다.' });
      return;
    }
    
    compressImageWorker(file, targetSize).then(function (compressedBlob) {
      self.postMessage({ type: 'compress_image_success', blob: compressedBlob });
    }).catch(function (err) {
      self.postMessage({ error: err.message || String(err) });
    });
  }
};
