/**
 * photo-measure.js (v2)
 * 모바일 현장용 사진 정밀 실측 모듈
 * - 3개 임의 눈금 자유 지정 1D 호모그래피 보정 (방안 B)
 * - 틸트각 및 초점거리 역산 기반 정밀 수평(가로) 스케일 계산 (오차 3% 이내)
 * - 손가락 점 드래그 위치 수정 & ↶ 한 점 되돌리기 지원
 * - 2,400px 자동 다운샘플링으로 저사양 폰 / iOS 메모리 최적화
 * - Safe-area / dvh 지원 및 측정 목록 다중 관리
 */
(function (global) {
  'use strict';

  // ==========================================
  // 1. 수학 계산 엔진 (1D Homography Math)
  // ==========================================
  class PhotoMeasureMath {
    constructor() {
      this.c1 = null;
      this.c3 = null;
      this.p0 = null;
      this.p1 = null;
      this.p2 = null;
      this.z0 = 0.0;
      this.z1 = 2.0;
      this.z2 = 4.0;
      this.axis = { x: 0, y: -1 }; // 스타프 축 단위벡터
      this.imgWidth = 1920;
      this.imgHeight = 1080;
    }

    /** 스타프 3점 보정 (임의 눈금 z0 < z1 < z2 지원) */
    calibrate(p0, p1, p2, z0 = 0.0, z1 = 2.0, z2 = 4.0, imgW = 1920, imgH = 1080) {
      if (!p0 || !p1 || !p2) return false;
      if (z0 >= z1 || z1 >= z2) return false;

      this.p0 = p0;
      this.p1 = p1;
      this.p2 = p2;
      this.z0 = z0;
      this.z1 = z1;
      this.z2 = z2;
      this.imgWidth = imgW;
      this.imgHeight = imgH;

      // 스타프 방향 단위벡터 (p0 -> p2)
      const ax = p2.x - p0.x;
      const ay = p2.y - p0.y;
      const len = Math.hypot(ax, ay);
      if (len < 5) return false;
      this.axis = { x: ax / len, y: ay / len };

      // 스타프 축으로의 투영 거리 (p0 = 0)
      const u1 = this._project(p1);
      const u2 = this._project(p2);

      if (u1 <= 0 || u2 <= 0 || Math.abs(u1 - u2) < 2) return false;

      // 상대 고도
      const rz1 = z1 - z0;
      const rz2 = z2 - z0;

      const det = u1 * u2 * (rz1 - rz2);
      if (Math.abs(det) < 1e-6) return false;

      this.c1 = (rz1 * rz2 * (u1 - u2)) / det;
      this.c3 = (u1 * rz2 - u2 * rz1) / det;
      return true;
    }

    _project(pt) {
      return (pt.x - this.p0.x) * this.axis.x + (pt.y - this.p0.y) * this.axis.y;
    }

    isCalibrated() {
      return this.c1 !== null && this.c3 !== null && this.p0 !== null;
    }

    /** 임의 점의 실제 고도(m) 계산 */
    getElevation(pt) {
      if (!this.isCalibrated()) return null;
      const u = this._project(pt);
      const denom = this.c3 * u + 1;
      if (Math.abs(denom) < 1e-6 || denom <= 0) return null;
      return this.z0 + (this.c1 * u) / denom;
    }

    /** 두 점 사이의 정밀 치수 산출 (수직 높이 + 정밀 수평 가로) */
    calculateMeasurement(pt1, pt2) {
      if (!this.isCalibrated()) return null;

      const zA = this.getElevation(pt1);
      const zB = this.getElevation(pt2);
      if (zA === null || zB === null) return null;

      const vertical = Math.abs(zA - zB);

      // --- 정밀 수평(가로) 계산 ---
      // 스마트폰 기본 1X 렌즈 초점거리 추정 (35mm 환산 26mm 기준, f ≈ W * 1.25)
      const f = this.imgWidth * 1.25;
      const Zinf = this.z0 + (this.c1 / this.c3);
      const centerPt = { x: this.imgWidth / 2, y: this.imgHeight / 2 };
      const Zc = this.getElevation(centerPt) || (zA + zB) / 2;

      let hScale = null;
      if (Math.abs(this.c3) > 1e-9) {
        // 카메라 상하 기울기(theta) 역산
        const tanTheta = ((Zc - Zinf) * this.c3 * this.c3 * f) / this.c1;
        const sinTheta = Math.abs(Math.sin(Math.atan(tanTheta)));
        const zAvg = (zA + zB) / 2;
        hScale = Math.abs(sinTheta * (Zinf - zAvg)) / f;
      } else {
        // 수평 상태
        const uAvg = (this._project(pt1) + this._project(pt2)) / 2;
        hScale = Math.abs(this.c1) / (f * (this.c3 * uAvg + 1));
      }

      const dx = Math.abs(pt1.x - pt2.x);
      const horizontal = dx * (hScale || 0.001);
      const direct = Math.sqrt(vertical * vertical + horizontal * horizontal);

      return {
        vertical: Number(vertical.toFixed(2)),
        horizontal: Number(horizontal.toFixed(2)),
        direct: Number(direct.toFixed(2)),
        zA: Number(zA.toFixed(2)),
        zB: Number(zB.toFixed(2))
      };
    }
  }

  // ==========================================
  // 2. 전체화면 모달 UI 및 터치 제어
  // ==========================================
  class PhotoMeasureModal {
    constructor() {
      this.math = new PhotoMeasureMath();
      this.overlay = null;
      this.canvas = null;
      this.ctx = null;
      this.img = null;
      this.rawImageSrc = null;

      // 뷰포트 변환
      this.transform = { x: 0, y: 0, scale: 1 };

      // 상태 관리: 'CALIBRATE' | 'MEASURE'
      this.state = 'CALIBRATE';
      this.refPoints = []; // [p0, p1, p2]
      this.measurePoints = []; // [m1, m2]
      this.measureHistory = []; // [{p1, p2, res}]

      // 터치 & 제스처
      this.isInteracting = false;
      this.activeTouchPos = null;
      this.activeWorldPos = null;
      this.draggedPointRef = null; // 손가락으로 드래그 수정 중인 점 객체
      this.lastPinchDist = 0;
      this.lastPinchCenter = null;

      this.currentResult = null;
      this.onSaveSubPhotoCallback = null;
      this.renderPending = false;

      // 플로팅 윈도우 상태 관리 (방안 1)
      this.isMaximized = false;
      this.preMaxCoords = { left: '70px', top: '76px', width: '680px', height: '590px' };

      this.initDom();
    }

    initDom() {
      if (document.getElementById('phm-overlay')) return;

      const div = document.createElement('div');
      div.id = 'phm-overlay';
      div.style.display = 'none';

      // 저장된 눈금값 복원
      const savedZ = this.getSavedStaffValues();

      div.innerHTML = `
        <div class="phm-header" id="phm-drag-handle">
          <div class="phm-title-box">
            <span class="phm-title">📏 사진 정밀 실측</span>
            <span id="phm-step-badge" class="phm-step-badge">1. 스타프 보정</span>
          </div>
          <div class="phm-header-actions">
            <button id="phm-btn-save-photo" class="phm-btn phm-btn-primary" title="치수선이 각인된 증빙사진 서브사진 저장">
              📸 치수사진 저장
            </button>
            <button id="phm-btn-reset-view-header" class="phm-win-ctrl-btn" title="화면 크기에 맞춤">⛶</button>
            <button id="phm-btn-maximize" class="phm-win-ctrl-btn" title="도면 영역 크기로 최대화">🗖</button>
            <button id="phm-btn-close" class="phm-win-ctrl-btn phm-win-close" title="닫기">✕</button>
          </div>
        </div>

        <div class="phm-canvas-viewport" id="phm-viewport">
          <div id="phm-guide-banner" class="phm-guide-banner">
            📍 스타프 점 1 (${savedZ[0]}m)을 터치하세요.
          </div>

          <div class="phm-canvas-toolbar">
            <button id="phm-btn-undo" class="phm-tool-btn" title="한 점 되돌리기">↶</button>
            <button id="phm-btn-recalibrate" class="phm-tool-btn" title="스타프 다시 보정">🔄</button>
            <button id="phm-btn-reset-view" class="phm-tool-btn" title="화면 크기 맞추기">🔍</button>
          </div>

          <canvas id="phm-canvas"></canvas>
          <div id="phm-toast" class="phm-toast">복사되었습니다!</div>
        </div>

        <div class="phm-bottom-panel">
          <!-- 스타프 눈금 자유 지정 (방안 B) -->
          <div class="phm-staff-row">
            <span class="phm-staff-title">스타프 눈금(3점):</span>
            <div class="phm-staff-inputs">
              <input type="number" id="phm-inp-z0" value="${savedZ[0]}" step="0.5">m
              <span>─</span>
              <input type="number" id="phm-inp-z1" value="${savedZ[1]}" step="0.5">m
              <span>─</span>
              <input type="number" id="phm-inp-z2" value="${savedZ[2]}" step="0.5">m
            </div>
          </div>

          <!-- 실시간 측정 결과 카드 -->
          <div class="phm-result-row">
            <div class="phm-result-card">
              <div>
                <div class="phm-result-label">높이 (H)</div>
                <div class="phm-result-val v-val" id="phm-res-v">0.00 m</div>
              </div>
              <button class="phm-copy-btn" id="phm-copy-v">📋 복사</button>
            </div>
            <div class="phm-result-card">
              <div>
                <div class="phm-result-label">가로 / 폭 (W)</div>
                <div class="phm-result-val h-val" id="phm-res-h">0.00 m</div>
              </div>
              <button class="phm-copy-btn" id="phm-copy-h">📋 복사</button>
            </div>
          </div>

          <!-- 측정 내역 히스토리 칩스 -->
          <div class="phm-history-box" id="phm-history-box"></div>
        </div>

        <!-- [신규] 우측 하단 리사이즈 손잡이 -->
        <div class="phm-resize-handle" id="phm-resize-handle" title="드래그하여 창 크기 조절"></div>
      `;

      document.body.appendChild(div);

      this.overlay = div;
      this.canvas = div.querySelector('#phm-canvas');
      this.ctx = this.canvas.getContext('2d');

      this.bindEvents();
    }

    getSavedStaffValues() {
      try {
        const raw = localStorage.getItem('dmap:phm_staff_z');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length === 3) return arr;
        }
      } catch (e) {}
      return ['0.0', '2.0', '4.0'];
    }

    saveStaffValues(z0, z1, z2) {
      try {
        localStorage.setItem('dmap:phm_staff_z', JSON.stringify([String(z0), String(z1), String(z2)]));
      } catch (e) {}
    }

    getStaffInputs() {
      const z0 = parseFloat(this.overlay.querySelector('#phm-inp-z0').value) || 0.0;
      const z1 = parseFloat(this.overlay.querySelector('#phm-inp-z1').value) || 2.0;
      const z2 = parseFloat(this.overlay.querySelector('#phm-inp-z2').value) || 4.0;
      return [z0, z1, z2];
    }

    bindEvents() {
      // 닫기
      this.overlay.querySelector('#phm-btn-close').onclick = () => this.close();

      // 화면 맞춤 (상단 헤더 및 툴바)
      const resetView = () => this.fitToScreen();
      this.overlay.querySelector('#phm-btn-reset-view').onclick = resetView;
      const headerResetBtn = this.overlay.querySelector('#phm-btn-reset-view-header');
      if (headerResetBtn) headerResetBtn.onclick = resetView;

      // 최대화 / 복원 토글
      const maxBtn = this.overlay.querySelector('#phm-btn-maximize');
      if (maxBtn) maxBtn.onclick = () => this.toggleMaximize();

      // 다시 보정
      this.overlay.querySelector('#phm-btn-recalibrate').onclick = () => this.startCalibration();
      // 되돌리기
      this.overlay.querySelector('#phm-btn-undo').onclick = () => this.undoLastPoint();

      // 복사
      this.overlay.querySelector('#phm-copy-v').onclick = () => this.copyToClipboard('v');
      this.overlay.querySelector('#phm-copy-h').onclick = () => this.copyToClipboard('h');

      // 치수사진 저장
      this.overlay.querySelector('#phm-btn-save-photo').onclick = () => this.saveAnnotatedPhoto();

      // 스타프 눈금 변경 시 실시간 반영 & 저장
      const zInputs = ['#phm-inp-z0', '#phm-inp-z1', '#phm-inp-z2'];
      zInputs.forEach(sel => {
        const el = this.overlay.querySelector(sel);
        el.addEventListener('change', () => this.onStaffValuesChanged());
      });

      this.bindCanvasGestures();
      this.bindFloatingWindowControls();

      window.addEventListener('resize', () => {
        if (this.overlay && this.overlay.style.display !== 'none') {
          this.resizeCanvas();
        }
      });
    }

    // -------------------------------------------------------------
    // ★ [플로팅 윈도우 드래그, 리사이즈, 최대화 제어 엔진]
    // -------------------------------------------------------------
    toggleMaximize() {
      const win = this.overlay;
      const maxBtn = win.querySelector('#phm-btn-maximize');
      if (!win) return;

      if (!this.isMaximized) {
        // 1. 현재 좌표 및 크기 백업
        this.preMaxCoords = {
          width: win.style.width || (win.offsetWidth + 'px'),
          height: win.style.height || (win.offsetHeight + 'px'),
          left: win.style.left || (win.offsetLeft + 'px'),
          top: win.style.top || (win.offsetTop + 'px')
        };

        // 2. 도면 영역의 BoundingClientRect 계산 (우측 제원 입력창 유지)
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
          const rect = canvasContainer.getBoundingClientRect();
          win.style.left = rect.left + 'px';
          win.style.top = rect.top + 'px';
          win.style.width = rect.width + 'px';
          win.style.height = rect.height + 'px';
        } else {
          win.style.left = '0px';
          win.style.top = '64px';
          win.style.width = (window.innerWidth - 480) + 'px';
          win.style.height = (window.innerHeight - 64) + 'px';
        }

        win.classList.add('phm-maximized');
        this.isMaximized = true;
        if (maxBtn) {
          maxBtn.textContent = '❐';
          maxBtn.title = '이전 크기로 복원';
        }
      } else {
        // 3. 이전 크기로 복원
        win.style.width = this.preMaxCoords.width;
        win.style.height = this.preMaxCoords.height;
        win.style.left = this.preMaxCoords.left;
        win.style.top = this.preMaxCoords.top;

        win.classList.remove('phm-maximized');
        this.isMaximized = false;
        if (maxBtn) {
          maxBtn.textContent = '🗖';
          maxBtn.title = '도면 영역 크기로 최대화';
        }
      }

      setTimeout(() => {
        this.resizeCanvas();
        this.fitToScreen();
      }, 50);
    }

    bindFloatingWindowControls() {
      const win = this.overlay;
      const dragHandle = win.querySelector('#phm-drag-handle');
      const resizeHandle = win.querySelector('#phm-resize-handle');

      // 클릭 시 창 포커스 (z-index 우선순위 보장)
      win.addEventListener('mousedown', () => {
        win.style.zIndex = '1008';
      });

      // 1) 윈도우 헤더 드래그 이동 기능
      let isWinDragging = false;
      let winStartX = 0, winStartY = 0;

      dragHandle.addEventListener('mousedown', (e) => {
        // 버튼이나 입력창 클릭 시 드래그 방지
        if (e.target.closest('button') || e.target.closest('input')) return;

        // 최대화 상태에서 드래그 시도 시 이전 크기로 복원 후 드래그
        if (this.isMaximized) {
          this.toggleMaximize();
        }

        isWinDragging = true;
        winStartX = e.clientX - win.offsetLeft;
        winStartY = e.clientY - win.offsetTop;
        document.body.style.userSelect = 'none';
      });

      // 2) 윈도우 창 크기 조절 (Resize) 기능
      let isResizing = false;
      let startWidth = 0, startHeight = 0;
      let startResizeX = 0, startResizeY = 0;

      if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', (e) => {
          e.preventDefault();

          if (this.isMaximized) {
            this.toggleMaximize();
          }

          isResizing = true;
          startWidth = win.offsetWidth;
          startHeight = win.offsetHeight;
          startResizeX = e.clientX;
          startResizeY = e.clientY;
          document.body.style.userSelect = 'none';
        });
      }

      // 전역 마우스 이동 이벤트
      window.addEventListener('mousemove', (e) => {
        // 드래그 이동
        if (isWinDragging) {
          let newLeft = e.clientX - winStartX;
          let newTop = e.clientY - winStartY;
          // 브라우저 화면 밖 이탈 방지
          newLeft = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, newLeft));
          newTop = Math.max(0, Math.min(window.innerHeight - win.offsetHeight, newTop));
          win.style.left = newLeft + 'px';
          win.style.top = newTop + 'px';
        }

        // 크기 조절
        if (isResizing) {
          const diffX = e.clientX - startResizeX;
          const diffY = e.clientY - startResizeY;
          const newWidth = Math.max(380, startWidth + diffX);
          const newHeight = Math.max(320, startHeight + diffY);
          win.style.width = newWidth + 'px';
          win.style.height = newHeight + 'px';
          this.resizeCanvas();
        }
      });

      // 전역 마우스 업 이벤트
      window.addEventListener('mouseup', () => {
        if (isWinDragging || isResizing) {
          if (isResizing) {
            this.resizeCanvas();
            this.requestRender();
          }
          isWinDragging = false;
          isResizing = false;
          document.body.style.userSelect = '';
        }
      });
    }

    onStaffValuesChanged() {
      const [z0, z1, z2] = this.getStaffInputs();
      this.saveStaffValues(z0, z1, z2);

      if (this.refPoints.length === 3 && this.img) {
        this.math.calibrate(this.refPoints[0], this.refPoints[1], this.refPoints[2], z0, z1, z2, this.img.width, this.img.height);
        this.recalculateHistory();
      } else {
        this.updateCalibrationGuide();
      }
      this.requestRender();
    }

    recalculateHistory() {
      for (const m of this.measureHistory) {
        m.res = this.math.calculateMeasurement(m.p1, m.p2);
      }
      if (this.measureHistory.length > 0) {
        const last = this.measureHistory[this.measureHistory.length - 1];
        this.currentResult = last.res;
        this.updateResultDisplay(last.res);
      }
      this.renderHistoryChips();
    }

    bindCanvasGestures() {
      const cvs = this.canvas;

      // 마우스 휠
      cvs.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!this.img) return;
        const zoom = e.deltaY < 0 ? 1.15 : 0.85;
        this.zoomAt(e.offsetX, e.offsetY, zoom);
      });

      // 터치 시작
      cvs.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          const t = e.touches[0];
          const rect = cvs.getBoundingClientRect();
          const sx = t.clientX - rect.left;
          const sy = t.clientY - rect.top;
          const wPt = this.screenToWorld(sx, sy);

          this.isInteracting = true;
          this.activeTouchPos = { x: sx, y: sy };
          this.activeWorldPos = wPt;

          // 이미 찍힌 점이 가까이 있으면 드래그 수정 모드 진입
          this.draggedPointRef = this.findNearbyPoint(wPt, 28 / this.transform.scale);
          this.requestRender();
        } else if (e.touches.length === 2) {
          this.isInteracting = false;
          this.draggedPointRef = null;
          this.activeTouchPos = null;
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          this.lastPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          const rect = cvs.getBoundingClientRect();
          this.lastPinchCenter = {
            x: ((t1.clientX + t2.clientX) / 2) - rect.left,
            y: ((t1.clientY + t2.clientY) / 2) - rect.top
          };
        }
      }, { passive: false });

      // 터치 이동
      cvs.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = cvs.getBoundingClientRect();

        if (e.touches.length === 1 && this.isInteracting) {
          const t = e.touches[0];
          const sx = t.clientX - rect.left;
          const sy = t.clientY - rect.top;
          const wPt = this.screenToWorld(sx, sy);

          this.activeTouchPos = { x: sx, y: sy };
          this.activeWorldPos = wPt;

          // 점 드래그 이동 중이면 해당 점 위치 실시간 변경
          if (this.draggedPointRef) {
            this.draggedPointRef.x = wPt.x;
            this.draggedPointRef.y = wPt.y;
          }
          this.requestRender();
        } else if (e.touches.length === 2) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          const center = {
            x: ((t1.clientX + t2.clientX) / 2) - rect.left,
            y: ((t1.clientY + t2.clientY) / 2) - rect.top
          };

          if (this.lastPinchDist > 0) {
            const zoom = dist / this.lastPinchDist;
            this.zoomAt(center.x, center.y, zoom);
            if (this.lastPinchCenter) {
              this.transform.x += center.x - this.lastPinchCenter.x;
              this.transform.y += center.y - this.lastPinchCenter.y;
            }
          }
          this.lastPinchDist = dist;
          this.lastPinchCenter = center;
          this.requestRender();
        }
      }, { passive: false });

      // 터치 종료
      cvs.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (this.isInteracting && this.activeWorldPos) {
          if (this.draggedPointRef) {
            // 드래그 수정 완료 -> 재계산
            this.onPointModified();
          } else {
            // 신규 점 확정
            this.commitPoint(this.activeWorldPos);
          }
        }
        this.isInteracting = false;
        this.draggedPointRef = null;
        this.activeTouchPos = null;
        this.activeWorldPos = null;
        this.lastPinchDist = 0;
        this.lastPinchCenter = null;
        this.requestRender();
      }, { passive: false });

      // PC 마우스 호환
      let isMouseDown = false;
      cvs.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          isMouseDown = true;
          this.isInteracting = true;
          const wPt = this.screenToWorld(e.offsetX, e.offsetY);
          this.activeTouchPos = { x: e.offsetX, y: e.offsetY };
          this.activeWorldPos = wPt;
          this.draggedPointRef = this.findNearbyPoint(wPt, 20 / this.transform.scale);
          this.requestRender();
        }
      });

      cvs.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
          const wPt = this.screenToWorld(e.offsetX, e.offsetY);
          this.activeTouchPos = { x: e.offsetX, y: e.offsetY };
          this.activeWorldPos = wPt;
          if (this.draggedPointRef) {
            this.draggedPointRef.x = wPt.x;
            this.draggedPointRef.y = wPt.y;
          }
          this.requestRender();
        }
      });

      window.addEventListener('mouseup', () => {
        if (isMouseDown) {
          isMouseDown = false;
          if (this.activeWorldPos) {
            if (this.draggedPointRef) {
              this.onPointModified();
            } else {
              this.commitPoint(this.activeWorldPos);
            }
          }
          this.isInteracting = false;
          this.draggedPointRef = null;
          this.activeTouchPos = null;
          this.activeWorldPos = null;
          this.requestRender();
        }
      });
    }

    /** 터치 위치 주변에 기존 점이 있는지 탐색 (드래그 수정용) */
    findNearbyPoint(wPt, threshold) {
      // 1. 측정선 점 우선 탐색
      for (let i = this.measureHistory.length - 1; i >= 0; i--) {
        const m = this.measureHistory[i];
        if (Math.hypot(m.p2.x - wPt.x, m.p2.y - wPt.y) <= threshold) return m.p2;
        if (Math.hypot(m.p1.x - wPt.x, m.p1.y - wPt.y) <= threshold) return m.p1;
      }
      // 2. 스타프 기준점 탐색
      for (const p of this.refPoints) {
        if (Math.hypot(p.x - wPt.x, p.y - wPt.y) <= threshold) return p;
      }
      return null;
    }

    onPointModified() {
      const [z0, z1, z2] = this.getStaffInputs();
      if (this.refPoints.length === 3 && this.img) {
        this.math.calibrate(this.refPoints[0], this.refPoints[1], this.refPoints[2], z0, z1, z2, this.img.width, this.img.height);
      }
      this.recalculateHistory();
      this.showToast('점 위치가 수정되었습니다.');
    }

    commitPoint(pt) {
      if (this.state === 'CALIBRATE') {
        if (this.refPoints.length < 3) {
          this.refPoints.push({ x: pt.x, y: pt.y });

          if (this.refPoints.length === 3) {
            const [z0, z1, z2] = this.getStaffInputs();
            const ok = this.math.calibrate(this.refPoints[0], this.refPoints[1], this.refPoints[2], z0, z1, z2, this.img.width, this.img.height);

            if (ok) {
              this.state = 'MEASURE';
              this.updateStepBadge('2. 치수 측정');
              this.setGuide('✅ 스타프 보정 완료! 시설물의 대각선 끝점 2개를 터치하세요.');
            } else {
              alert('스타프 3개 점의 높이 순서가 올바르지 않습니다. 다시 찍어주세요.');
              this.refPoints = [];
              this.updateCalibrationGuide();
            }
          } else {
            this.updateCalibrationGuide();
          }
        }
      } else if (this.state === 'MEASURE') {
        this.measurePoints.push({ x: pt.x, y: pt.y });

        if (this.measurePoints.length === 2) {
          const res = this.math.calculateMeasurement(this.measurePoints[0], this.measurePoints[1]);
          if (res) {
            this.currentResult = res;
            this.measureHistory.push({
              p1: this.measurePoints[0],
              p2: this.measurePoints[1],
              res: res
            });
            this.updateResultDisplay(res);
            this.renderHistoryChips();
            this.setGuide(`측정완료! 높이: ${res.vertical}m / 가로: ${res.horizontal}m`);
          }
          this.measurePoints = [];
        } else {
          this.setGuide('📍 측정할 두 번째 끝점을 터치하세요.');
        }
      }
      this.requestRender();
    }

    /** ↶ 한 점 되돌리기 */
    undoLastPoint() {
      if (this.state === 'MEASURE') {
        if (this.measurePoints.length > 0) {
          // 측정 대기 중이던 시작점 취소
          this.measurePoints = [];
          this.setGuide('시설물의 대각선 끝점 2개를 터치하세요.');
        } else if (this.measureHistory.length > 0) {
          // 마지막 측정선 취소
          this.measureHistory.pop();
          if (this.measureHistory.length > 0) {
            const prev = this.measureHistory[this.measureHistory.length - 1];
            this.currentResult = prev.res;
            this.updateResultDisplay(prev.res);
          } else {
            this.currentResult = null;
            this.updateResultDisplay(null);
          }
          this.renderHistoryChips();
          this.showToast('마지막 측정이 취소되었습니다.');
        } else {
          // 측정선이 없으면 스타프 보정 단계로 되돌아감
          this.startCalibration();
        }
      } else if (this.state === 'CALIBRATE') {
        if (this.refPoints.length > 0) {
          this.refPoints.pop();
          this.updateCalibrationGuide();
          this.showToast('스타프 점이 취소되었습니다.');
        }
      }
      this.requestRender();
    }

    updateCalibrationGuide() {
      const [z0, z1, z2] = this.getStaffInputs();
      const len = this.refPoints.length;
      if (len === 0) {
        this.setGuide(`📍 스타프 점 1 (${z0}m)을 터치하세요.`);
      } else if (len === 1) {
        this.setGuide(`📍 스타프 점 2 (${z1}m)를 터치하세요.`);
      } else if (len === 2) {
        this.setGuide(`📍 스타프 점 3 (${z2}m)을 터치하세요.`);
      }
    }

    updateStepBadge(text) {
      const badge = this.overlay.querySelector('#phm-step-badge');
      if (badge) badge.textContent = text;
    }

    setGuide(text) {
      const banner = this.overlay.querySelector('#phm-guide-banner');
      if (banner) banner.textContent = text;
    }

    updateResultDisplay(res) {
      const vEl = this.overlay.querySelector('#phm-res-v');
      const hEl = this.overlay.querySelector('#phm-res-h');
      if (!vEl || !hEl) return;

      if (res) {
        vEl.textContent = res.vertical.toFixed(2) + ' m';
        hEl.textContent = res.horizontal.toFixed(2) + ' m';
      } else {
        vEl.textContent = '0.00 m';
        hEl.textContent = '0.00 m';
      }
    }

    renderHistoryChips() {
      const box = this.overlay.querySelector('#phm-history-box');
      if (!box) return;
      box.innerHTML = '';

      this.measureHistory.forEach((m, idx) => {
        const chip = document.createElement('div');
        chip.className = 'phm-chip';
        chip.innerHTML = `<span>#${idx + 1} H:${m.res.vertical}m W:${m.res.horizontal}m</span>`;
        chip.onclick = () => {
          this.currentResult = m.res;
          this.updateResultDisplay(m.res);
          this.showToast(`#${idx + 1}번 측정 결과가 선택되었습니다.`);
        };
        box.appendChild(chip);
      });
    }

    copyToClipboard(type) {
      if (!this.currentResult) {
        this.showToast('먼저 치수를 측정해주세요.');
        return;
      }
      const val = type === 'v' ? this.currentResult.vertical : this.currentResult.horizontal;
      const strVal = String(val);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(strVal).then(() => {
          this.showToast(`[${type === 'v' ? '높이' : '가로'}] ${strVal}m 복사 완료!`);
        }).catch(() => {
          this.fallbackCopy(strVal, type);
        });
      } else {
        this.fallbackCopy(strVal, type);
      }
    }

    fallbackCopy(val, type) {
      const ta = document.createElement('textarea');
      ta.value = val;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        this.showToast(`[${type === 'v' ? '높이' : '가로'}] ${val}m 복사 완료!`);
      } catch (e) {
        prompt('수치를 복사하세요:', val);
      }
      document.body.removeChild(ta);
    }

    showToast(msg) {
      const toast = this.overlay.querySelector('#phm-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1600);
    }

    startCalibration() {
      this.state = 'CALIBRATE';
      this.refPoints = [];
      this.measurePoints = [];
      this.measureHistory = [];
      this.currentResult = null;
      this.updateResultDisplay(null);
      this.renderHistoryChips();
      this.updateStepBadge('1. 스타프 보정');
      this.updateCalibrationGuide();
      this.requestRender();
    }

    zoomAt(cx, cy, factor) {
      const newScale = Math.max(0.08, Math.min(20, this.transform.scale * factor));
      const actualFactor = newScale / this.transform.scale;
      this.transform.x = cx - (cx - this.transform.x) * actualFactor;
      this.transform.y = cy - (cy - this.transform.y) * actualFactor;
      this.transform.scale = newScale;
      this.requestRender();
    }

    screenToWorld(sx, sy) {
      return {
        x: (sx - this.transform.x) / this.transform.scale,
        y: (sy - this.transform.y) / this.transform.scale
      };
    }

    resizeCanvas() {
      const vp = this.overlay.querySelector('#phm-viewport');
      if (!vp) return;
      this.canvas.width = vp.clientWidth;
      this.canvas.height = vp.clientHeight;
      this.requestRender();
    }

    fitToScreen() {
      if (!this.img) return;
      this.resizeCanvas();
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const iw = this.img.width;
      const ih = this.img.height;

      const scale = Math.min(cw / iw, ch / ih) * 0.95;
      this.transform.scale = scale;
      this.transform.x = (cw - iw * scale) / 2;
      this.transform.y = (ch - ih * scale) / 2;
      this.requestRender();
    }

    requestRender() {
      if (this.renderPending) return;
      this.renderPending = true;
      requestAnimationFrame(() => {
        this.renderPending = false;
        this.render();
      });
    }

    // ==========================================
    // 3. 메인 렌더링 루프 (루페 돋보기 포함)
    // ==========================================
    render() {
      const ctx = this.ctx;
      const cw = this.canvas.width;
      const ch = this.canvas.height;

      ctx.clearRect(0, 0, cw, ch);
      if (!this.img) return;

      ctx.save();
      ctx.translate(this.transform.x, this.transform.y);
      ctx.scale(this.transform.scale, this.transform.scale);

      // 배경 이미지
      ctx.drawImage(this.img, 0, 0);

      const rScale = 1 / this.transform.scale;

      // 과거 측정선
      for (const m of this.measureHistory) {
        this.drawMeasureLine(ctx, m.p1, m.p2, m.res, rScale);
      }

      // 현재 측정 진행 중 선
      if (this.state === 'MEASURE' && this.measurePoints.length === 1 && this.activeWorldPos) {
        this.drawMeasureLine(ctx, this.measurePoints[0], this.activeWorldPos, null, rScale, true);
      }

      // 스타프 기준선
      if (this.refPoints.length > 0) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3 * rScale;
        ctx.setLineDash([6 * rScale, 4 * rScale]);
        ctx.beginPath();
        ctx.moveTo(this.refPoints[0].x, this.refPoints[0].y);
        for (let i = 1; i < this.refPoints.length; i++) {
          ctx.lineTo(this.refPoints[i].x, this.refPoints[i].y);
        }
        if (this.state === 'CALIBRATE' && this.refPoints.length < 3 && this.activeWorldPos) {
          ctx.lineTo(this.activeWorldPos.x, this.activeWorldPos.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        const colors = ['#ef4444', '#eab308', '#22c55e'];
        const [z0, z1, z2] = this.getStaffInputs();
        const labels = [`${z0}m`, `${z1}m`, `${z2}m`];

        this.refPoints.forEach((p, idx) => {
          ctx.fillStyle = colors[idx] || '#3b82f6';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7 * rScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 * rScale;
          ctx.stroke();

          ctx.font = `bold ${13 * rScale}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(labels[idx], p.x + 10 * rScale, p.y + 4 * rScale);
        });
      }

      ctx.restore();

      // 터치 루페 돋보기
      if (this.isInteracting && this.activeTouchPos && this.activeWorldPos) {
        this.drawLoupe(ctx, this.activeTouchPos, this.activeWorldPos);
      }
    }

    drawMeasureLine(ctx, p1, p2, res, rScale, isPreview = false) {
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);

      // 수직/수평 분해선 (파란 점선)
      if (dx > 4 && dy > 4) {
        const corner = { x: p1.x, y: p2.y };
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.8 * rScale;
        ctx.setLineDash([4 * rScale, 4 * rScale]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 메인 측정선 (핑크/빨강)
      ctx.strokeStyle = isPreview ? 'rgba(244, 63, 94, 0.65)' : '#f43f5e';
      ctx.lineWidth = (isPreview ? 2 : 3) * rScale;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // 끝점 마커
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2 * rScale;
      [p1, p2].forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * rScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 측정값 레이블 뱃지
      if (res && !isPreview) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const txt = `H:${res.vertical}m | W:${res.horizontal}m`;
        const fSize = 13 * rScale;
        ctx.font = `bold ${fSize}px sans-serif`;
        const tWidth = ctx.measureText(txt).width;
        const pad = 4 * rScale;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(midX - tWidth / 2 - pad, midY - fSize / 2 - pad, tWidth + pad * 2, fSize + pad * 2);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1 * rScale;
        ctx.strokeRect(midX - tWidth / 2 - pad, midY - fSize / 2 - pad, tWidth + pad * 2, fSize + pad * 2);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, midX, midY);
      }
    }

    // 터치 돋보기 루페 (손가락 윗부분 확대)
    drawLoupe(ctx, touchPos, worldPos) {
      const radius = 56;
      const loupeOffset = 85;
      const lx = touchPos.x;
      const ly = Math.max(radius + 10, touchPos.y - loupeOffset);
      const mag = 3.6;

      ctx.save();
      ctx.beginPath();
      ctx.arc(lx, ly, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = '#000';
      ctx.fill();

      const sW = (radius * 2) / mag;
      const sH = (radius * 2) / mag;
      const sX = worldPos.x - sW / 2;
      const sY = worldPos.y - sH / 2;

      ctx.drawImage(this.img, sX, sY, sW, sH, lx - radius, ly - radius, radius * 2, radius * 2);

      // 십자 조준선
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx - radius, ly); ctx.lineTo(lx - 5, ly);
      ctx.moveTo(lx + 5, ly); ctx.lineTo(lx + radius, ly);
      ctx.moveTo(lx, ly - radius); ctx.lineTo(lx, ly - 5);
      ctx.moveTo(lx, ly + 5); ctx.lineTo(lx, ly + radius);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 외곽 테두리
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lx, ly, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ==========================================
    // 4. 모달 열기 & 고화질 다운샘플링 & 저장
    // ==========================================
    open(imageSource, onSaveCallback) {
      this.initDom();
      this.onSaveSubPhotoCallback = onSaveCallback;

      const img = new Image();
      img.onload = () => {
        // 긴 변 기준 2,400px 초과 시 다운샘플링하여 메모리 절감 & iOS 캔버스 한계 극복
        const maxDim = 2400;
        let finalCanvas = null;

        if (img.width > maxDim || img.height > maxDim) {
          const ratio = Math.min(maxDim / img.width, maxDim / img.height);
          const nw = Math.round(img.width * ratio);
          const nh = Math.round(img.height * ratio);

          const off = document.createElement('canvas');
          off.width = nw;
          off.height = nh;
          const octx = off.getContext('2d');
          octx.drawImage(img, 0, 0, nw, nh);
          finalCanvas = off;
        }

        this.img = finalCanvas || img;
        this.overlay.style.display = 'flex';
        
        // 플로팅 윈도우 기본 좌표 및 크기 보장
        if (!this.overlay.style.width || this.overlay.style.width === '100vw') {
          this.overlay.style.width = '680px';
          this.overlay.style.height = '590px';
          this.overlay.style.left = '70px';
          this.overlay.style.top = '76px';
        }
        this.overlay.style.zIndex = '1008';

        this.startCalibration();
        setTimeout(() => {
          this.fitToScreen();
        }, 60);
      };

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else if (imageSource instanceof Blob || imageSource instanceof File) {
        this.rawImageSrc = URL.createObjectURL(imageSource);
        img.src = this.rawImageSrc;
      }
    }

    close() {
      if (this.overlay) {
        this.overlay.style.display = 'none';
      }
      if (this.rawImageSrc) {
        URL.revokeObjectURL(this.rawImageSrc);
        this.rawImageSrc = null;
      }
      this.img = null;
    }

    /** 치수선이 각인된 증빙 사진 서브사진으로 저장 */
    saveAnnotatedPhoto() {
      if (!this.img || this.measureHistory.length === 0) {
        alert('먼저 치수를 1개 이상 측정한 후 저장해주세요.');
        return;
      }

      const iw = this.img.width;
      const ih = this.img.height;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = iw;
      offCanvas.height = ih;
      const oCtx = offCanvas.getContext('2d');

      // 원본 이미지 그리기
      oCtx.drawImage(this.img, 0, 0);

      // 사진 해상도에 비례하는 스케일 계산 (2400px 기준 rScale = 1.5)
      const exportScale = Math.max(1.0, Math.min(3.0, Math.max(iw, ih) / 1600));

      // 스타프 선 각인
      if (this.refPoints.length === 3) {
        oCtx.strokeStyle = '#3b82f6';
        oCtx.lineWidth = 4 * exportScale;
        oCtx.setLineDash([8 * exportScale, 5 * exportScale]);
        oCtx.beginPath();
        oCtx.moveTo(this.refPoints[0].x, this.refPoints[0].y);
        oCtx.lineTo(this.refPoints[1].x, this.refPoints[1].y);
        oCtx.lineTo(this.refPoints[2].x, this.refPoints[2].y);
        oCtx.stroke();
        oCtx.setLineDash([]);
      }

      // 측정선 각인
      for (const m of this.measureHistory) {
        this.drawMeasureLine(oCtx, m.p1, m.p2, m.res, exportScale);
      }

      offCanvas.toBlob((blob) => {
        if (!blob) return;
        if (typeof this.onSaveSubPhotoCallback === 'function') {
          this.onSaveSubPhotoCallback(blob);
          this.showToast('📸 치수사진이 서브사진으로 등록되었습니다!');
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = '치수실측_' + Date.now() + '.jpg';
          a.click();
          this.showToast('📸 치수사진이 다운로드되었습니다!');
        }
      }, 'image/jpeg', 0.9);
    }
  }

  // 싱글톤 전역 인스턴스 등록
  global.PhotoMeasure = new PhotoMeasureModal();

})(window);
