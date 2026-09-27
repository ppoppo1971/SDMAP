/**
 * new_dmap - 지도 엔진 기반 DXF 도면 뷰어 (메인 앱)
 * ADMAP 기능 유지 + Google Maps 렌더링 (VMAP 참조)
 * 배경 기본 없음, 사용자 선택 가능
 */
'use strict';

var map = null;
var dxfData = null;
var dxfFileName = '';
var dxfFileFullName = ''; // 저장소 키 (파일명과 동일)
var dxfBoundsLatLng = null;
var currentMapType = 'none';

var photos = [];
window.photos = photos;
var texts = [];
var photoMarkers = [];
var photoCluster = null; // MarkerClusterer 인스턴스 (200~300장 대응)
var textMarkers = [];
var textOverlay = null;
var pendingAddPosition = null; // { x, y } DXF 좌표 (롱프레스 시)
var lastLongPressEndTime = 0;
var contextMenuEl = null;
var showPhotoNumberToggle = typeof localStorage !== 'undefined' ? (localStorage.getItem('dmap:showPhotoNumber') !== 'false') : true; // 기본값 참(보이기)
var showSpecTextToggle = typeof localStorage !== 'undefined' ? (localStorage.getItem('dmap:showSpecText') === 'true') : false; // 기본값 거짓(숨기기)
window.isPMode = false; // P 모드 토글 변수 (true 시 레이어 감지 무시)
var currentCrs = typeof localStorage !== 'undefined' ? (localStorage.getItem('dmap:crs') || 'EPSG:5186') : 'EPSG:5186';
var longPressTimer = null;
var longPressDuration = 400;
var pendingLoadFile = null; // 좌표계 선택 완료 시 로드할 단일 DXF 파일
var pendingLoadFolderFiles = null; // 좌표계 선택 완료 시 로드할 폴더 파일들

// 가로등/측구 자동 입력용 상태
var pendingStreetlightItem = null;
var pendingStreetlightDxfCoords = null;
var pendingStreetlightLatLng = null;
var pendingFacilityType = null;
var isNewPhotoPending = false; // 신규 촬영된 사진이 저장 대기 상태인지 여부
var pendingFacilitySurvey = null; // 메모리 버퍼링 객체: 신규 조사 및 추가 서브사진을 저장 전까지 메모리에만 유지
var streetlightPreviewObjectUrl = null; // 이미지 프리뷰용 Object URL 캐시

// 모든 시설물 통합 캐시 스펙 저장 객체
var lastSpecs = {};

// DOM 요소 지연 캐싱 (Lazy DOM Cache) - 불필요한 반복 DOM 탐색을 방지하여 저사양 기기 성능 개선
var _domCache = {};
function getEl(id) {
  if (_domCache[id] === undefined) {
    _domCache[id] = document.getElementById(id) || null;
  }
  return _domCache[id];
}
// 모달 열기/닫기 등으로 DOM 구조가 바뀔 때 캐시 초기화
function clearDomCache(id) {
  if (id) { delete _domCache[id]; } else { _domCache = {}; }
}

// DXF 도면 렌더링 (방안 2: 줌 레벨 제한 없이 모든 축소 단계에서 항상 도면 표시)
var dxfGoogleFeaturesSource = [];
var DXF_RENDER_MIN_ZOOM = 0;

// 시설물 제원 포맷 및 입력 양식 설정 테이블 (엑셀 facility-config.js 우선 적용)
var FACILITY_CONFIG = (typeof window !== 'undefined' && window.FACILITY_CONFIG) ? window.FACILITY_CONFIG : {
  '참고사항': {
    title: '참고사항',
    layer: '참고사항_T',
    prefix: '',
    fields: [
      { id: 'memo', label: '메모 (참고 내용 입력)', type: 'text', placeholder: '참고 메모 입력', default: '' }
    ]
  },
  '가로등': {
    title: '가로등',
    layer: '가로등_T',
    prefix: '가로등',
    fields: [
      { id: 'type1', label: '종류', type: 'select', options: ['기본', '2등형', '기타'], default: '기본' },
      { id: 'type2', label: '재질', type: 'select', options: ['강관', '강판', '기타'], default: '강관' },
      { id: 'lightSource', label: '광원', type: 'select', options: ['LED', '고압나트륨', '기타'], default: 'LED' },
      { id: 'type3', label: '수량/높이', type: 'select', options: ['1', '2', '3', '4', '기타'], default: '1' }
    ]
  },
  '석축': {
    title: '석축',
    layer: '석축_T',
    prefix: '', // 석축 고정 제거하고 종류/최대높이/최소높이/폭
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['석축', '화강암', '기타'], default: '석축' },
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '옹벽': {
    title: '옹벽',
    layer: '옹벽_T',
    prefix: '옹벽',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['중력식', '반중력식', '보강토', '기타'], default: '중력식' },
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '절개면': {
    title: '절개면',
    layer: '절개면_T',
    prefix: '절개면',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['흙', '암사면', '혼합사면', '기타'], default: '흙' },
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'gradient', label: '경사도', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '성토면': {
    title: '성토면',
    layer: '성토면_T',
    prefix: '성토면',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['흙', '암사면', '혼합사면', '기타'], default: '흙' },
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'gradient', label: '경사도', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '배수암거': {
    title: '배수암거',
    layer: '배수암거_T',
    prefix: '배수암거',
    joinFormat: 'dimension/type/wing/sump',
    fields: [
      { id: 'width', label: '가로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'height', label: '세로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'type', label: '재질', type: 'select', options: ['콘크리트', '기타'], default: '콘크리트' },
      { id: 'wing', label: '날개벽', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'sump', label: '집수정', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '배수관': {
    title: '배수관',
    layer: '배수관_T',
    prefix: '배수관',
    fields: [
      { id: 'spec', label: '규격', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'type', label: '재질', type: 'select', options: ['흄관', 'PE', 'PVC', 'CSP', '기타'], default: '흄관' },
      { id: 'length', label: '연장', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'wing', label: '날개벽', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'sump', label: '집수정', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '측구': {
    title: '측구',
    layer: '측구_T',
    prefix: '측구',
    joinFormat: 'type/dimension',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['L형', 'U형', 'V형', '토사형', '옹벽형', '기타'], default: 'L형' },
      { id: 'width', label: '가로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'height', label: '세로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '중앙분리대': {
    title: '중앙분리대',
    layer: '중앙분리대_T',
    prefix: '중앙분리대',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['가드레일', '가드펜스', '가드파이프', '연석형', '기타'], default: '가드레일' },
      { id: 'material', label: '재질', type: 'select', options: ['탄소', '기타'], default: '탄소' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '차량방호시설': {
    title: '차량방호시설',
    layer: '차량방호_T',
    prefix: '차량방호',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['가드레일', '가드펜스', '가드파이프', '연석형', '기타'], default: '가드레일' },
      { id: 'material', label: '재질', type: 'select', options: ['탄소', '기타'], default: '탄소' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '낙석방지시설': {
    title: '낙석방지시설',
    layer: '낙석방지_T',
    prefix: '낙석방지',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['낙석방지책', '낙석방지망', '기타'], default: '낙석방지책' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '주의표지': {
    title: '주의표지',
    layer: '주의표지_T',
    prefix: '주의표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '기타표지': {
    title: '기타표지',
    layer: '기타표지_T',
    prefix: '기타표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '규제표지': {
    title: '규제표지',
    layer: '규제표지_T',
    prefix: '규제표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '지시표지': {
    title: '지시표지',
    layer: '지시표지_T',
    prefix: '지시표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '보조표지': {
    title: '보조표지',
    layer: '보조표지_T',
    prefix: '보조표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '교통기타': {
    title: '교통기타',
    layer: '교통기타_T',
    prefix: '교통기타',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '갈매기표지': {
    title: '갈매기표지',
    layer: '갈매기_T',
    prefix: '갈매기표지',
    fields: [
      { id: 'type', label: '구분', type: 'select', options: ['양면', '단면'], default: '양면' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '기타'], default: '단주' }
    ]
  },
  '도로반사경': {
    title: '도로반사경',
    layer: '도로반사경_T',
    prefix: '도로반사경',
    fields: [
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '기타'], default: '단주' },
      { id: 'count', label: '수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '주차장': {
    title: '주차장',
    layer: '주차장_T',
    prefix: '주차장',
    fields: []
  },
  'CCTV': {
    title: 'CCTV',
    layer: 'CCTV_T',
    prefix: 'CCTV',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['무인단속카메라', '과속카메라', '기타'], default: '무인단속카메라' },
      { id: 'count', label: '수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '새주소': {
    title: '새주소',
    layer: '새주소_T',
    prefix: '새주소',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '부착', '현수식', '기타'], default: '현수식' }
    ]
  },
  '전광표지': {
    title: '전광표지',
    layer: '전광표지_T',
    prefix: '전광표지',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['발광형', '반사형', '기타'], default: '발광형' },
      { id: 'style', label: '표출형식', type: 'select', options: ['문자식', '도형식', '차량제어식', '동영상식', '기타'], default: '문자식' },
      { id: 'support', label: '지주형식', type: 'select', options: ['현수식', '복주', '단주', '기타'], default: '현수식' }
    ]
  },
  '보안등': {
    title: '보안등',
    layer: '보안등_T',
    prefix: '보안등',
    fields: [
      { id: 'type1', label: '종류', type: 'select', options: ['기본', '2등형', '기타'], default: '기본' },
      { id: 'type2', label: '재질', type: 'select', options: ['강관', '강판', '기타'], default: '강관' },
      { id: 'lightSource', label: '광원', type: 'select', options: ['LED', '고압나트륨', '기타'], default: 'LED' },
      { id: 'type3', label: '수량/높이', type: 'select', options: ['1', '2', '3', '4', '기타'], default: '1' }
    ]
  },
  '신호등': {
    title: '신호등',
    layer: '신호등_T',
    prefix: '신호등',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['차량', '보행'], default: '차량' },
      { id: 'style', label: '형식', type: 'select', options: ['횡4', '횡3', '종2', '종2+잔유', '기타'], default: '횡4' },
      { id: 'count', label: '수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['측주', '단주', '기타'], default: '측주' },
      { id: 'pedestrianType', label: '보행등 구분', type: 'select', options: ['보행등무', '보행등', '기타'], default: '보행등무' },
      { id: 'pedestrianCount', label: '보행등 수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '과속방지턱': {
    title: '과속방지턱',
    layer: '과속방지턱_T',
    prefix: '',
    fields: [
      { id: 'style', label: '형식', type: 'select', options: ['과속방지턱', '이미지방', '기타'], default: '과속방지턱' },
      { id: 'material', label: '재질', type: 'select', options: ['아스팔트', '콘크리트', '기타'], default: '아스팔트' },
      { id: 'height', label: '높이', type: 'select', options: ['0.3', '0.2', '기타'], default: '0.3' }
    ]
  },
  '방음시설': {
    title: '방음시설',
    layer: '방음시설_T',
    prefix: '방음시설',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['흡음', '반사', '혼합', '기타'], default: '흡음' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '가로수': {
    title: '가로수',
    layer: '가로수_T',
    prefix: '가로수',
    fields: [
      { id: 'type', label: '수종', type: 'select', options: ['이팝', '기타'], default: '이팝' }
    ]
  },
  '통로박스': {
    title: '통로박스',
    layer: '통로박스_T',
    prefix: '통로박스',
    joinFormat: 'dimension/type/traffic',
    fields: [
      { id: 'width', label: '가로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'height', label: '세로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'type', label: '재질', type: 'select', options: ['RCB', '기타'], default: 'RCB' },
      { id: 'traffic', label: '통행제한', type: 'select', options: ['차량통행', '기타'], default: '차량통행' }
    ]
  },
  '과적검문소': {
    title: '과적검문소',
    layer: '과적검문소_T',
    prefix: '과적검문소',
    fields: [
      { id: 'type', label: '종류', type: 'text', placeholder: '종류 입력', default: '종류' }
    ]
  },
  '제설시설': {
    title: '제설시설',
    layer: '제설시설_T',
    prefix: '제설시설',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['제설함', '기타'], default: '제설함' }
    ]
  },
  '제설함': {
    title: '제설함',
    layer: '제설시설_T',
    prefix: '제설시설',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['제설함', '기타'], default: '제설함' }
    ]
  },
  '정차대': {
    title: '정차대',
    layer: '정차대_T',
    prefix: '정차대',
    fields: [
      { id: 'type', label: '구분', type: 'select', options: ['대기소유', '대기소무', '기타'], default: '대기소유' }
    ]
  },
  '버스정류장': {
    title: '정류장',
    layer: '정류장_T',
    prefix: '정류장표지',
    fields: [
      { id: 'type', label: '구분', type: 'select', options: ['버스', '택시'], default: '버스' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '기타'], default: '단주' }
    ]
  },
  '택시정류장': {
    title: '정류장',
    layer: '정류장_T',
    prefix: '정류장표지',
    fields: [
      { id: 'type', label: '구분', type: 'select', options: ['택시', '버스'], default: '택시' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '기타'], default: '단주' }
    ]
  },
  '교량': {
    title: '교량',
    layer: '교량_T',
    prefix: '교량',
    joinFormat: 'bridgeName/material/dimension',
    fields: [
      { id: 'bridgeName', label: '교량명', type: 'text', placeholder: '교량명 입력', default: '' },
      { id: 'material', label: '재질', type: 'text', placeholder: '재질 입력', default: '종류' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
    ]
  },
  '터널': {
    title: '터널',
    layer: '터널_T',
    prefix: '터널',
    fields: [
      { id: 'height', label: '높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'limitH', label: '통행제한높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'lanes', label: '차로수', type: 'number', placeholder: '숫자 입력', default: '' },
      { id: 'drain', label: '배수시설 (배수시설유, 배수시설무, 기타)', type: 'select', options: ['배수시설유', '배수시설무', '기타'], default: '배수시설유' },
      { id: 'vent', label: '환기설비 (환기설비유, 환기설비무, 기타)', type: 'select', options: ['환기설비유', '환기설비무', '기타'], default: '환기설비유' },
      { id: 'light', label: '조명시설 (조명시설유, 조명시설무, 기타)', type: 'select', options: ['조명시설유', '조명시설무', '기타'], default: '조명시설유' },
      { id: 'fire', label: '소화설비 (소화설비유, 소화설비무, 기타)', type: 'select', options: ['소화설비유', '소화설비무', '기타'], default: '소화설비유' }
    ]
  },
  '육교': {
    title: '육교',
    layer: '육교_T',
    prefix: '육교',
    fields: [
      { id: 'limitH', label: '통행제한높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'structure', label: '폭원 (구체, 계단, 기타)', type: 'select', options: ['구체', '계단', '기타'], default: '구체' },
      { id: 'lightInfo', label: '조명시설 종류 수량 (직접 입력)', type: 'text', placeholder: '조명 시설 종류 및 수량 입력', default: '' }
    ]
  },
  '지하차도': {
    title: '지하차도',
    layer: '지하차도_T',
    prefix: '지하차도',
    fields: [
      { id: 'name', label: '레이어명', type: 'text', default: '지하차도', readonly: true },
      { id: 'lightInfo', label: '조명시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'fireInfo', label: '소화시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'finish', label: '마감재 천정 벽체 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'wallH', label: '옹벽 높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'vent', label: '환기방식 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'drain', label: '배수시설 (직접 입력)', type: 'text', placeholder: '입력', default: '' }
    ]
  },
  '지하보도': {
    title: '지하보도',
    layer: '지하보도_T',
    prefix: '지하보도',
    fields: [
      { id: 'name', label: '레이어명', type: 'text', default: '지하보도', readonly: true },
      { id: 'lightInfo', label: '조명시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'fireInfo', label: '소화시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'finish', label: '마감재 천정 벽체 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'wallH', label: '옹벽 높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'vent', label: '환기방식 (직접 입력)', type: 'text', placeholder: '입력', default: '' },
      { id: 'drain', label: '배수시설 (직접 입력)', type: 'text', placeholder: '입력', default: '' }
    ]
  },
  '오르막차로': {
    title: '오르막차로',
    layer: '오르막차로_T',
    prefix: '오르막차로',
    fields: [
      { id: 'lanes', label: '차로수', type: 'number', placeholder: '숫자 입력', default: '' },
      { id: 'width', label: '폭 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'gradient', label: '경사 (%)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' }
    ]
  },
  '교차시설': {
    title: '교차시설',
    layer: '교차시설_T',
    prefix: '교차시설',
    fields: [
      { id: 'width', label: '폭 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'height', label: '높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' },
      { id: 'angle', label: '교차각도 (°)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '' }
    ]
  },
  '도로': {
    title: '도로',
    layer: '도로_T',
    prefix: '',
    fields: [
      { id: 'material', label: '포장재질 (아스팔트, 콘크리트, 비포장, 기타)', type: 'select', options: ['아스팔트', '콘크리트', '비포장', '기타'], default: '아스팔트' },
      { id: 'lanes', label: '차선수 (1, 2, 3, 4, 기타)', type: 'select', options: ['1', '2', '3', '4', '기타'], default: '2' }
    ]
  },
  '도로표지': {
    title: '도로표지',
    layer: '도로표지_T',
    prefix: '도로표지',
    fields: [
      { id: 'direction', label: '방향', type: 'select', options: ['방향', '이정', '안내', '예고', '기타'], default: '방향' },
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 직접 입력', default: '' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '현수식', '기타'], default: '단주' }
    ]
  },
  '고가도로': {
    title: '고가도로',
    layer: '고가도로_T',
    prefix: '고가도로',
    fields: [
      { id: 'light', label: '조명시설종류수량', type: 'text', placeholder: '조명 종류 및 수량 입력', default: '' },
      { id: 'noise', label: '방음시설종류 (흡음, 반사, 혼합, 기타)', type: 'select', options: ['흡음', '반사', '혼합', '기타'], default: '흡음' }
    ]
  },
  '통신주': {
    title: '통신주',
    layer: '통신주_T',
    prefix: '통신주',
    fields: []
  },
  '전력주': {
    title: '전력주',
    layer: '전력주_T',
    prefix: '전력주',
    fields: []
  },
  '게시판': {
    title: '게시판',
    layer: '게시판_T',
    prefix: '게시판',
    fields: []
  },
  '변압기': {
    title: '변압기',
    layer: '변압기_T',
    prefix: '변압기',
    fields: []
  },
  '횡단보도': {
    title: '횡단보도',
    layer: '횡단보도_T',
    prefix: '횡단보도',
    fields: []
  },
  '안전지대': {
    title: '안전지대',
    layer: '안전지대_T',
    prefix: '안전지대',
    fields: []
  },
  '가로등제어기': {
    title: '가로등제어기',
    layer: '가로등제어기_T',
    prefix: '가로등제어기',
    fields: []
  },
  '신호등제어기': {
    title: '신호등제어기',
    layer: '신호등제어기_T',
    prefix: '신호등제어기',
    fields: []
  },
  '기타제어기': {
    title: '기타제어기',
    layer: '기타제어기_T',
    prefix: '기타제어기',
    fields: []
  },
  '화단': {
    title: '화단',
    layer: '화단_T',
    prefix: '화단',
    fields: []
  },
  '미끄럼방지시설': {
    title: '미끄럼방지시설',
    layer: '미끄럼방지_T',
    prefix: '미끄럼방지',
    fields: []
  },
  '자전거도로': {
    title: '자전거도로',
    layer: '자전거도로_T',
    prefix: '자전거도로',
    fields: []
  },
  '그늘막': {
    title: '그늘막',
    layer: '그늘막_T',
    prefix: '그늘막',
    fields: []
  }
};




var fileListScreen = null;
var viewerScreen = null;
var viewerUI = null;
var fileList = null;
var localFileInput = null;
var loadingEl = null;
var slideMenu = null;
var menuOverlay = null;
var mapTypeSelector = null;
var editingPhotoId = null;
var editingTextId = null;
var imageSizeSetting = typeof localStorage !== 'undefined' ? (localStorage.getItem('dmap:imageSize') || '2MB') : '2MB';
// var exportInfo = null; // [0923_01] 내보내기 제거됨 - 내부저장소 직접 저장 전환
var mapBindingsDone = false; // ensureMap에서 map 의존 바인딩 1회만 수행
/** DXF에 참조된 이미지: { id, x, y, fileName, file?: File }. 파란원으로 표시, 클릭 시 뷰어. 내보내기에는 미포함. */
var dxfImageRefs = [];
var dxfImageMarkers = [];
var editingDxfImageRef = null; // 참조 이미지 뷰어 표시 중인 ref (사진 모달 재사용)
var dxfImageObjectUrl = null; // 참조 이미지 object URL (닫을 때 revoke)
var currentLocationMarker = null; // 현재위치 버튼으로 표시한 마커 (지도 터치 시 제거)
var currentLocationClickListener = null; // 지도 클릭 시 마커 제거용 리스너

// 다중 사진(subPhotos) 관련 전역 변수
var isAddingSubPhoto = false; // 사진추가 모드 여부 (true이면 camera-input change 시 서브 사진 추가)
var subPhotoObjectUrls = []; // 썸네일 표시용 object URL 캐시
var pendingStreetlightSubPhotos = []; // [{ subIndex, fileName, blob }] 객체감지 조사 시 임시 추가사진 배열

// 이미지 뷰어 상태
var imageViewerPhotos = []; // [{ blob, fileName }] 현재 뷰어에 표시할 이미지 목록
var imageViewerIndex = 0; // 현재 표시 중인 인덱스
var imageViewerObjectUrl = null; // 현재 뷰어에 표시 중인 object URL

/**
 * Google Maps API 로드 후 콜백. 지도는 생성하지 않고 DOM/UI만 준비 (지도는 뷰어 표시 시 ensureMap에서 생성).
 */
function initMap() {
  fileListScreen = document.getElementById('file-list-screen');
  viewerScreen = document.getElementById('viewer-screen');
  viewerUI = document.getElementById('viewer-ui');
  fileList = document.getElementById('file-list');
  localFileInput = document.getElementById('local-file-input');
  loadingEl = document.getElementById('loading');
  slideMenu = document.getElementById('slide-menu');
  menuOverlay = document.getElementById('menu-overlay');
  mapTypeSelector = document.getElementById('map-type-selector');
  contextMenuEl = document.getElementById('context-menu');

  var crsEl = document.getElementById('menu-map-type-crs');
  if (crsEl) {
    var C = window.DMAP_CONFIG || {};
    crsEl.textContent = C.DXF_CRS ? '(' + C.DXF_CRS + ')' : '';
  }

  if (window.localStore && window.localStore.init) {
    window.localStore.init().then(function () {
      tryAutoLoadLastProject();
    }).catch(function () {
      showFileList();
    });
  } else {
    showFileList();
  }
  // 저장된 좌표계 적용
  if (currentCrs && window.DxfToGeoJSON && window.DxfToGeoJSON.setCrs) {
    window.DxfToGeoJSON.setCrs(currentCrs);
  }
  bindPhotoModal();
  bindTextModal();
  bindImageSizeModal();
  bindUI();
  bindDeleteDataModal();
  bindCrsModal();
  bindConsoleModal();
  updateCrsDisplay();
  console.log('new_dmap: API 로드 완료 (지도는 뷰어 표시 시 생성)');
}

/**
 * 뷰어가 표시된 상태에서 지도가 없으면 생성하고 map 의존 바인딩 1회 수행.
 * VMAP처럼 컨테이너가 보이는 시점에만 지도를 만들어 타일 미로드 방지.
 */
function ensureMap() {
  if (map) {
    if (!mapBindingsDone) {
      bindMapLongPress();
      bindContextMenu();
      bindContextMenuCloseOnMap();
      bindScaleDisplay();
      bindDoubleTapZoom();
      bindDxfDataLayerClick();
      bindDxfTextModal();
      mapBindingsDone = true;
    }
    return;
  }
  if (!window.google || !window.google.maps) {
    console.error('new_dmap: Google Maps API가 로드되지 않았습니다. config.js API 키와 실행 환경(http 서버)을 확인하세요.');
    return;
  }
  var C = window.DMAP_CONFIG || {};
  var lat0 = C.MAP_ORIGIN_LAT != null ? C.MAP_ORIGIN_LAT : 36.3;
  var lng0 = C.MAP_ORIGIN_LNG != null ? C.MAP_ORIGIN_LNG : 127.8;
  var blankStyle = C.BLANK_MAP_STYLE || [];

  var mapEl = document.getElementById('map');
  if (!mapEl) {
    console.error('new_dmap: #map 요소 없음');
    return;
  }
  var rect = mapEl.getBoundingClientRect();
  console.log('new_dmap: #map 크기 (지도 생성 시점)', rect.width, 'x', rect.height);

  map = new google.maps.Map(mapEl, {
    zoom: 16,
    center: { lat: lat0, lng: lng0 },
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    zoomControl: false,
    scaleControl: false,
    rotateControl: false,
    tilt: 0,
    gestureHandling: 'greedy',
    disableDefaultUI: true,
    clickableIcons: false,
    animation: google.maps.Animation.NONE,
    backgroundColor: '#f5f5f5',
    disableDoubleClickZoom: true,
    styles: blankStyle
  });

  // VMAP 참고: 브이월드 타일 레이어 등록 (도로/위성에서 구글·브이월드 선택 가능)
  var vworldRoadmapType = new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
      return 'https://xdworld.vworld.kr/2d/Base/service/' + zoom + '/' + coord.x + '/' + coord.y + '.png';
    },
    tileSize: new google.maps.Size(256, 256),
    name: '브이월드일반',
    maxZoom: 19
  });
  var vworldSatelliteType = new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
      return 'https://xdworld.vworld.kr/2d/Satellite/service/' + zoom + '/' + coord.x + '/' + coord.y + '.jpeg';
    },
    tileSize: new google.maps.Size(256, 256),
    name: '브이월드영상',
    maxZoom: 19
  });
  map.mapTypes.set('브이월드일반', vworldRoadmapType);
  map.mapTypes.set('브이월드영상', vworldSatelliteType);

  bindMapLongPress();
  bindContextMenu();
  bindContextMenuCloseOnMap();
  bindScaleDisplay();
  bindDoubleTapZoom();
  bindDxfDataLayerClick();
  bindDxfTextModal();
  map.addListener('idle', updateDynamicMapData);
  mapBindingsDone = true;
  console.log('new_dmap: 지도 생성 완료 (뷰어 표시 후, 배경 없음 기본)');
}

function bindUI() {
  if (localFileInput) {
    localFileInput.addEventListener('change', function (e) {
      var file = e.target && e.target.files[0];
      if (file) {
        pendingLoadFile = file;
        pendingLoadFolderFiles = null;
        showCrsModal();
      }
      e.target.value = '';
    });
  }
  var folderInput = document.getElementById('folder-input');
  if (folderInput) {
    folderInput.addEventListener('change', function (e) {
      var files = e.target && e.target.files;
      if (files && files.length) {
        pendingLoadFile = null;
        pendingLoadFolderFiles = files;
        showCrsModal();
      }
      e.target.value = '';
    });
  }

  document.getElementById('hamburger-btn').addEventListener('click', function () {
    slideMenu.classList.add('active');
    menuOverlay.classList.add('active');
    updateStorageFolderMenuLabel();
    if (typeof console !== 'undefined' && console.log) {
      var items = document.querySelectorAll('#slide-menu .slide-menu-item');
      var list = [];
      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        list.push((el.id || '(no id)') + ': ' + (el.textContent || '').trim().slice(0, 30));
      }
      console.log('[new_dmap] 슬라이드 메뉴 항목 (' + items.length + '개):', list);
    }
  });
  menuOverlay.addEventListener('click', function () {
    slideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    if (mapTypeSelector) mapTypeSelector.classList.remove('show');
    if (contextMenuEl) contextMenuEl.classList.remove('active');
  });

  // 상단 파일명/폴더 표시 클릭 시: 카메라 모드 배지 터치 시 모드 전환, 그 외 영역 터치 시 저장 폴더 설정 호출
  var fileNameDisplay = document.getElementById('file-name-display');
  if (fileNameDisplay) {
    fileNameDisplay.addEventListener('click', function (e) {
      if (e.target && e.target.closest('#top-camera-mode-badge')) {
        toggleCameraMode();
        return;
      }
      handleStorageFolderSetting();
    });
  }

  document.getElementById('menu-back-to-list').addEventListener('click', function () {
    slideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    showFileList();
  });
  document.getElementById('menu-map-type').addEventListener('click', function () {
    slideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    if (mapTypeSelector) mapTypeSelector.classList.toggle('show');
  });
  document.getElementById('menu-toggle-photo-number').addEventListener('click', function () {
    showPhotoNumberToggle = !showPhotoNumberToggle;
    if (typeof localStorage !== 'undefined') localStorage.setItem('dmap:showPhotoNumber', showPhotoNumberToggle);
    updateToggleStatuses();
    drawTextMarkers();
    showToast('번호보기: ' + (showPhotoNumberToggle ? '켜짐' : '꺼짐'));
  });

  document.getElementById('menu-toggle-spec-text').addEventListener('click', function () {
    showSpecTextToggle = !showSpecTextToggle;
    if (typeof localStorage !== 'undefined') localStorage.setItem('dmap:showSpecText', showSpecTextToggle);
    updateToggleStatuses();
    drawTextMarkers();
    showToast('제원보기: ' + (showSpecTextToggle ? '켜짐' : '꺼짐'));
  });

  function updateToggleStatuses() {
    var pNumEl = document.getElementById('menu-photo-number-status');
    var pSpecEl = document.getElementById('menu-spec-text-status');
    if (pNumEl) pNumEl.textContent = '(' + (showPhotoNumberToggle ? '켜짐' : '꺼짐') + ')';
    if (pSpecEl) pSpecEl.textContent = '(' + (showSpecTextToggle ? '켜짐' : '꺼짐') + ')';
  }

  // 초기 로딩 시점에 상태 레이블 반영
  updateToggleStatuses();

  var menuImageSize = document.getElementById('menu-image-size');
  if (menuImageSize) {
    menuImageSize.addEventListener('click', function () {
      slideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      showImageSizeModal();
    });
  }

  var menuDeleteData = document.getElementById('menu-delete-data');
  if (menuDeleteData) {
    menuDeleteData.addEventListener('click', function () {
      slideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      showDeleteDataModal();
    });
    if (typeof console !== 'undefined' && console.log) console.log('[new_dmap] 자료 삭제 메뉴 바인딩 완료 (menu-delete-data)');
  } else {
    if (typeof console !== 'undefined' && console.warn) console.warn('[new_dmap] menu-delete-data 요소를 찾을 수 없음. 슬라이드 메뉴 항목 수:', document.querySelectorAll('#slide-menu .slide-menu-item').length);
  }

  var toggleObjectVisibilityBtn = document.getElementById('menu-toggle-object-visibility');
  if (toggleObjectVisibilityBtn) {
    toggleObjectVisibilityBtn.addEventListener('click', function () {
      slideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      showObjectVisibilityModal();
    });
  }

  var objVisModal = getEl('object-visibility-modal');
  var objVisClose = document.getElementById('object-visibility-close');
  var objVisRed = document.getElementById('obj-vis-red');
  var objVisBlue = document.getElementById('obj-vis-blue');
  var objVisText = document.getElementById('obj-vis-text');
  if (objVisClose) objVisClose.addEventListener('click', hideObjectVisibilityModal);
  if (objVisModal) {
    objVisModal.addEventListener('click', function (e) {
      if (e.target === objVisModal) hideObjectVisibilityModal();
    });
  }
  function syncObjectVisibilityFromCheckboxes() {
    photoMarkersVisible = objVisRed ? objVisRed.checked : true;
    dxfImageMarkersVisible = objVisBlue ? objVisBlue.checked : true;
    dxfTextVisible = objVisText ? objVisText.checked : true;
    applyObjectVisibility();
  }
  if (objVisRed) objVisRed.addEventListener('change', syncObjectVisibilityFromCheckboxes);
  if (objVisBlue) objVisBlue.addEventListener('change', syncObjectVisibilityFromCheckboxes);
  if (objVisText) objVisText.addEventListener('change', syncObjectVisibilityFromCheckboxes);

  // 기존 menu-crs 및 file-crs-btn 이벤트 핸들러 제거 (HTML에서 삭제됨)

  var menuConsoleBtn = document.getElementById('menu-console');
  if (menuConsoleBtn) {
    menuConsoleBtn.addEventListener('click', function () {
      slideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      toggleVConsole();
    });
  }

  // [0923_01] 내보내기 모달 이벤트 리스너 제거됨 - 내부저장소 직접 저장 방식으로 전환
  // 저장 폴더 메뉴 초기화 (폴더명 표시)
  updateStorageFolderMenuLabel();
  updateCameraModeMenuLabel();
  bindFastCameraEvents();

  document.getElementById('zoom-fit').addEventListener('click', fitDxfToView);
  document.getElementById('zoom-in').addEventListener('click', function () {
    if (map) map.setZoom((map.getZoom() || 16) + 1);
  });
  document.getElementById('zoom-out').addEventListener('click', function () {
    if (map) map.setZoom(Math.max(1, (map.getZoom() || 16) - 1));
  });

  var currentLocationBtn = document.getElementById('current-location-btn');
  if (currentLocationBtn) {
    currentLocationBtn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        alert('이 기기에서는 위치를 사용할 수 없습니다.');
        return;
      }
      ensureMap();
      if (!map) return;
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          if (currentLocationMarker) {
            currentLocationMarker.setMap(null);
            currentLocationMarker = null;
          }
          if (currentLocationClickListener) {
            google.maps.event.removeListener(currentLocationClickListener);
            currentLocationClickListener = null;
          }
          currentLocationMarker = new google.maps.Marker({
            map: map,
            position: { lat: lat, lng: lng },
            title: '현재 위치'
          });
          map.panTo({ lat: lat, lng: lng });
          currentLocationClickListener = map.addListener('click', function () {
            if (currentLocationMarker) {
              currentLocationMarker.setMap(null);
              currentLocationMarker = null;
            }
            if (currentLocationClickListener) {
              google.maps.event.removeListener(currentLocationClickListener);
              currentLocationClickListener = null;
            }
          });
        },
        function () {
          alert('위치를 가져올 수 없습니다. 위치 권한을 허용했는지 확인하세요.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  if (mapTypeSelector) {
    mapTypeSelector.querySelectorAll('button[data-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = this.getAttribute('data-type');
        setMapType(type);
        mapTypeSelector.querySelectorAll('button[data-type]').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        mapTypeSelector.classList.remove('show');
      });
    });
  }


}

/**
 * ADMAP과 동일: 현재 화면 가로 폭을 미터 단위로 표시.
 * 거리 계산: 지도 bounds(NE, SW)의 경도 차이(도) × 해당 위도에서 1도 경도당 미터(111320×cos(위도)).
 * 위도 1도 ≈ 111320m, 경도 1도 ≈ 111320×cos(위도)m 이므로, 가로 폭(m) = (NE.lng - SW.lng) × 111320 × cos(중심위도).
 */
function updateScaleDisplay() {
  var el = document.getElementById('scale-display');
  if (!el || !map) return;
  var bounds = map.getBounds();
  if (!bounds) { el.textContent = '—'; return; }
  var ne = bounds.getNorthEast();
  var sw = bounds.getSouthWest();
  var centerLat = (ne.lat() + sw.lat()) / 2;
  var latRad = (centerLat * Math.PI) / 180;
  var metersPerDegLng = 111320 * Math.cos(latRad);
  var widthMeters = (ne.lng() - sw.lng()) * metersPerDegLng;
  if (widthMeters >= 1000) {
    el.textContent = (widthMeters / 1000).toFixed(1) + 'km';
  } else if (widthMeters >= 10) {
    el.textContent = widthMeters.toFixed(0) + 'm';
  } else if (widthMeters >= 1) {
    el.textContent = widthMeters.toFixed(1) + 'm';
  } else {
    el.textContent = (widthMeters * 100).toFixed(0) + 'cm';
  }
}

function bindScaleDisplay() {
  if (!map) return;
  google.maps.event.addListener(map, 'idle', updateScaleDisplay);
  
  var lastUpdateScaleTime = 0;
  var scaleTimer = null;
  
  google.maps.event.addListener(map, 'bounds_changed', function () {
    var now = Date.now();
    if (now - lastUpdateScaleTime >= 200) {
      lastUpdateScaleTime = now;
      updateScaleDisplay();
    } else {
      if (scaleTimer) clearTimeout(scaleTimer);
      scaleTimer = setTimeout(function () {
        lastUpdateScaleTime = Date.now();
        updateScaleDisplay();
      }, 200);
    }
  });
  updateScaleDisplay();
}

/** 더블탭 시 해당 위치를 중심으로 화면 가로 폭 50m가 되도록 확대/축소 (ADMAP defaultZoomRange 50m) */
var lastTapTime = 0;
var lastTapLatLng = null;
var doubleTapDelayMs = 300;
var doubleTapMaxDistM = 8;

function bindDoubleTapZoom() {
  if (!map) return;
  google.maps.event.addListener(map, 'click', function (e) {
    var latLng = e.latLng;
    if (!latLng) return;
    var now = Date.now();
    var isDoubleTap = lastTapTime && (now - lastTapTime) < doubleTapDelayMs && lastTapLatLng &&
      getLatLngDistanceM(lastTapLatLng, latLng) < doubleTapMaxDistM;
    if (isDoubleTap) {
      lastTapTime = 0;
      lastTapLatLng = null;
      zoomMapTo50mAt(latLng);
      return;
    }
    lastTapTime = now;
    lastTapLatLng = latLng;
  });
}



function zoomMapTo50mAt(latLng) {
  if (!map || !latLng) return;
  var lat = (latLng.lat && latLng.lat()) ? latLng.lat() : latLng.lat;
  var lng = (latLng.lng && latLng.lng()) ? latLng.lng() : latLng.lng;
  var latRad = (lat * Math.PI) / 180;
  var lngSpan = 50 / (111320 * Math.cos(latRad));
  var half = lngSpan / 2;
  var bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(lat - 1e-5, lng - half),
    new google.maps.LatLng(lat + 1e-5, lng + half)
  );
  map.fitBounds(bounds);
}

function showLoading(show) {
  if (loadingEl) loadingEl.classList.toggle('active', !!show);
  if (show) {
    document.body.style.pointerEvents = 'none';
  } else {
    document.body.style.pointerEvents = '';
  }
}

// [0923_01] 내보내기 관련 함수 제거됨 - 내부저장소 직접 저장 방식으로 전환

// 저장 폴더 설정 관련 함수
function handleStorageFolderSetting() {
  if (!window.localFs || !window.localFs.isSupported()) {
    alert('현재 브라우저에서는 실제 폴더 저장 기능(File System Access API)을 지원하지 않습니다.\n안드로이드 Chrome 최신 버전을 권장합니다.');
    return;
  }

  var drawingNameClean = (dxfFileName || '도면').replace(/\.[^/.]+$/, '').trim();

  if (typeof window.localFs.checkFolderStatus === 'function' && dxfFileFullName) {
    window.localFs.checkFolderStatus(dxfFileFullName).then(function (status) {
      if (status === 'sub_not_created') {
        window.localFs.getDrawingFolder(dxfFileFullName, true).then(function (folder) {
          updateFileNameDisplay();
          if (folder) {
            showToast('📁 [' + drawingNameClean + '] 도면 폴더가 생성/연결되었습니다.');
          }
        });
        return;
      }

      if (status !== 'granted') {
        // 권한이 만료되었거나 폴더가 없는 경우 즉시 원터치 권한 승인/설정 모달 호출
        window.localFs.ensureStorageReady(dxfFileFullName).then(function (ready) {
          updateFileNameDisplay();
          if (ready) {
            showToast('📁 [' + drawingNameClean + '] 도면 저장 폴더가 연결되었습니다.');
          }
        });
      } else {
        // 이미 정상인 경우: 현재 저장 위치 안내 및 변경 여부 확인
        var rootDir = window.localFs.getBaseDirName();
        var msg = '📁 현재 작업 저장 폴더 안내\n\n' +
          '• 상위 기준 폴더: ' + (rootDir || '설정됨') + '\n' +
          '• 현재 도면 폴더: [' + drawingNameClean + ']\n\n' +
          '사진과 데이터는 [' + drawingNameClean + '] 전용 폴더 안에 안전하게 자동 저장됩니다.\n\n' +
          '다른 상위 작업 폴더로 변경하시겠습니까?\n' +
          '(⚠️ 다운로드 폴더 제외, 문서 또는 내장메모리 권장)';
        if (confirm(msg)) {
          window.localFs.pickBaseDirectory().then(function (handle) {
            if (handle) {
              if (dxfFileFullName && typeof window.localFs.getDrawingFolder === 'function') {
                window.localFs.getDrawingFolder(dxfFileFullName, true).catch(function () {});
              }
              updateFileNameDisplay();
              showToast('📁 저장 폴더가 변경되었습니다: ' + handle.name);
            }
          });
        }
      }
    });
    return;
  }

  var rootDir = window.localFs.getBaseDirName();
  var msg = rootDir
    ? '현재 기준 폴더: 📁 ' + rootDir + '\n\n저장 폴더를 변경하시겠습니까?\n(도면별 [' + drawingNameClean + '] 폴더가 자동 생성됩니다)'
    : '사진과 데이터를 저장할 폴더를 선택해주세요.\n도면별로 [' + drawingNameClean + '] 전용 폴더가 자동 생성됩니다.';

  if (confirm(msg)) {
    window.localFs.pickBaseDirectory().then(function (handle) {
      if (handle) {
        updateFileNameDisplay();
        showToast('📁 저장 폴더가 설정되었습니다: ' + handle.name);
      }
    });
  }
}

// 저장 폴더 메뉴 라벨 업데이트
function updateStorageFolderMenuLabel() {
  var labelEl = document.getElementById('menu-storage-folder-name');
  if (!labelEl) return;
  if (window.localFs && window.localFs.isSupported()) {
    var name = window.localFs.getBaseDirName();
    labelEl.textContent = name ? '(' + name + ')' : '(미설정)';
  } else {
    labelEl.textContent = '(미지원)';
  }
}

// 도면별 메타데이터를 내부저장소에 저장하는 함수
function saveMetadataToLocalFs() {
  if (!window.localFs || !window.localFs.isSupported() || !window.localFs.hasBaseDir()) return;
  if (!dxfFileFullName) return;

  var metadata = {
    drawingFile: dxfFileFullName,
    lastModified: new Date().toISOString(),
    photos: [],
    texts: (texts || []).map(function (t) {
      return {
        id: t.id,
        x: t.x,
        y: t.y,
        text: t.text || '',
        fontSize: t.fontSize || 12,
        layer: t.layer || '일반_T',
        color: t.color !== undefined ? t.color : 7
      };
    })
  };

  // 사진 리스트 구성 (CAD 전개 및 맵에디터 호환을 위해 서브사진까지 모두 평탄화하여 누락 없이 등록)
  if (photos && photos.length > 0) {
    photos.forEach(function (p) {
      var numTextObj = p.numTextId ? (texts || []).filter(function (t) { return t.id === p.numTextId; })[0] : null;
      var photoNumVal = numTextObj ? String(numTextObj.text || '') : '';

      if (p.subPhotos && p.subPhotos.length > 0) {
        var sList = p.subPhotos.map(function (s, sIdx) {
          return {
            subIndex: s.subIndex !== undefined ? s.subIndex : sIdx,
            fileName: s.fileName || ''
          };
        });
        var sFiles = sList.map(function (s) { return s.fileName; });

        p.subPhotos.forEach(function (sp, spIdx) {
          var isPrimary = (sp.subIndex === 0 || spIdx === 0);
          metadata.photos.push({
            id: isPrimary ? p.id : (p.id + '_sub_' + (sp.subIndex || spIdx)),
            isSubPhoto: !isPrimary,
            parentPhotoId: isPrimary ? null : p.id,
            photoNumber: photoNumVal,
            fileName: sp.fileName || '',
            x: p.x,
            y: p.y,
            position: { x: p.x, y: p.y },
            size: { width: p.width || 1, height: p.height || 1 },
            memo: p.memo || '',
            facilityType: isPrimary ? (p.facilityType || '') : '일반사진',
            additionalTypes: isPrimary ? (p.additionalTypes || []) : [],
            numTextId: isPrimary ? (p.numTextId || null) : null,
            specTextId: isPrimary ? (p.specTextId || null) : null,
            specTextIds: isPrimary ? (p.specTextIds || null) : null,
            createdAt: p.createdAt || '',
            subPhotos: isPrimary ? sList : null,
            subPhotoFiles: isPrimary ? sFiles : null
          });
        });
      } else {
        var singleList = p.fileName ? [{ subIndex: 0, fileName: p.fileName }] : [];
        var singleFiles = p.fileName ? [p.fileName] : [];
        metadata.photos.push({
          id: p.id,
          isSubPhoto: false,
          parentPhotoId: null,
          photoNumber: photoNumVal,
          fileName: p.fileName || '',
          x: p.x,
          y: p.y,
          position: { x: p.x, y: p.y },
          size: { width: p.width || 1, height: p.height || 1 },
          memo: p.memo || '',
          facilityType: p.facilityType || '',
          additionalTypes: p.additionalTypes || [],
          numTextId: p.numTextId || null,
          specTextId: p.specTextId || null,
          specTextIds: p.specTextIds || null,
          createdAt: p.createdAt || '',
          subPhotos: singleList,
          subPhotoFiles: singleFiles
        });
      }
    });
  }

  window.localFs.saveMetadataFile(dxfFileFullName, metadata).then(function (ok) {
    if (ok) console.log('[localFs] 메타데이터 저장 완료');
  }).catch(function (err) {
    console.warn('[localFs] 메타데이터 저장 실패:', err);
  });
}

function showFileList() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('dmap:lastDxfFile');
  }
  if (fileListScreen) fileListScreen.classList.remove('hidden');
  if (viewerScreen) viewerScreen.classList.add('hidden');
  if (viewerUI) viewerUI.classList.add('hidden');
}

function showViewer() {
  if (fileListScreen) fileListScreen.classList.add('hidden');
  if (viewerScreen) viewerScreen.classList.remove('hidden');
  if (viewerUI) viewerUI.classList.remove('hidden');
  // 뷰어가 보인 뒤에만 지도 생성 (컨테이너 크기 확보 → 타일 로드 보장)
  ensureMap();
  if (map) {
    requestAnimationFrame(function () {
      google.maps.event.trigger(map, 'resize');
    });
  }
}

/**
 * DXF 원본 텍스트에서 constantWidth(그룹코드 43)를 추출하여 엔티티에 추가.
 * 파서가 constantWidth를 파싱하지 못하는 경우를 대비 (ADMAP 방식).
 */
function iterateDxfGroups(text, callback) {
  var pos = 0;
  var len = text.length;
  var groupCode = null;
  
  while (pos < len) {
    var nextNewline = text.indexOf('\n', pos);
    var lineEnd = nextNewline === -1 ? len : nextNewline;
    var line = text.substring(pos, lineEnd).trim();
    pos = lineEnd + 1;
    
    if (line.charCodeAt(line.length - 1) === 13) {
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

function extractConstantWidths(dxfData, text) {
  if (!dxfData || !dxfData.entities || !text) return;
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

function extractDxfImageRefs(text) {
  if (!text) return [];
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

function fileBasename(pathOrName) {
  if (typeof pathOrName !== 'string') return '';
  var s = pathOrName.replace(/\\/g, '/');
  var i = s.lastIndexOf('/');
  return i >= 0 ? s.slice(i + 1) : s;
}

function parseDxfTextAndBuildRefs(text) {
  if (!text || !text.includes('SECTION') || !text.includes('ENTITIES')) {
    throw new Error('올바른 DXF 파일 형식이 아닙니다.');
  }
  if (typeof DxfParser === 'undefined') {
    throw new Error('DXF 파서 라이브러리가 로드되지 않았습니다.');
  }
  var parser = new DxfParser();
  var data = parser.parseSync(text);
  if (!data) throw new Error('DXF 파싱에 실패했습니다.');
  if (!data.entities || data.entities.length === 0) {
    console.warn('DXF 엔티티 없음');
  }
  extractConstantWidths(data, text);
  var rawRefs = extractDxfImageRefs(text);
  return { dxfData: data, rawImageRefs: rawRefs };
}

/**
 * 파싱 결과를 전역에 반영하고 뷰어·지도·마커를 갱신. (로드 플로우 공통)
 */
function applyDxfLoadResult(dxfFileNameStr, dxfDataResult, imageRefsWithFile) {
  dxfData = dxfDataResult;
  dxfImageRefs = imageRefsWithFile;
  dxfFileName = dxfFileFullName = dxfFileNameStr;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('dmap:lastDxfFile', dxfFileNameStr);
  }

  if (window.localStore && window.localStore.saveDxfCache) {
    window.localStore.saveDxfCache(dxfFileNameStr, dxfDataResult, imageRefsWithFile.map(function (r) {
      return { id: r.id, x: r.x, y: r.y, fileName: r.fileName };
    })).catch(function (err) {
      console.warn('도면 캐시 저장 실패:', err);
    });
  }

  showViewer();
  applyDxfToMap();
  updateFileNameDisplay();
  drawDxfImageMarkers();
  loadMetadataAndDisplay(dxfFileFullName).then(function () {
    fitDxfToView();
  }).finally(function () {
    setTimeout(function () { 
      showLoading(false); 
      checkPromptStorageFolder();
    }, 100);
  });
}

// 도면 로드 후 저장 폴더 미설정 시 자동 설정 유도 안내창 및 도면 폴더 자동 생성
function checkPromptStorageFolder() {
  if (!window.localFs || !window.localFs.isSupported()) return;

  var drawingNameClean = (dxfFileName || '도면').replace(/\.[^/.]+$/, '').trim();

  // 1. 이미 기준 폴더가 설정된 경우: 현재 도면명으로 서브폴더 자동 생성 및 즉각 헤더 갱신
  if (window.localFs.hasBaseDir() && dxfFileFullName) {
    window.localFs.getDrawingFolder(dxfFileFullName, true).then(function () {
      updateFileNameDisplay();
    }).catch(function () {
      updateFileNameDisplay();
    });
    return;
  }

  // 2. 기준 폴더가 아직 설정되지 않은 경우 (최초 1회 설정 안내)
  if (!window.localFs.hasBaseDir()) {
    setTimeout(function () {
      var msg = '📁 사진과 데이터를 저장할 상위 작업 폴더(예: 평택)를 선택해 주세요.\n\n' +
        '선택한 작업 폴더 바로 아래에 [' + drawingNameClean + '] 도면 전용 폴더가 100% 자동 생성되어 저장됩니다.\n\n' +
        '⚠️ 중요: 안드로이드 보안 정책상 [다운로드(Download)] 폴더는 시스템에서 접근이 차단됩니다.\n' +
        '반드시 [문서(Documents)] 폴더 안이나 [내장 메모리] 아래의 폴더를 선택해 주세요.';
      if (confirm(msg)) {
        window.localFs.pickBaseDirectory().then(function (handle) {
          if (handle) {
            if (dxfFileFullName && typeof window.localFs.getDrawingFolder === 'function') {
              window.localFs.getDrawingFolder(dxfFileFullName, true).catch(function () {});
            }
            updateFileNameDisplay();
            showToast('📁 저장 폴더가 설정되었습니다: ' + handle.name);
          }
        });
      }
    }, 400);
  }
}

function parseDxfWithWorker(text) {
  return new Promise(function (resolve, reject) {
    if (typeof Worker === 'undefined') {
      try {
        var res = parseDxfTextAndBuildRefs(text);
        resolve(res);
      } catch (err) {
        reject(err);
      }
      return;
    }
    
    var worker = new Worker('dxf-worker.js');
    worker.onmessage = function (e) {
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else if (e.data.type === 'parse_dxf_success') {
        resolve({ dxfData: e.data.dxfData, rawImageRefs: e.data.rawImageRefs });
      }
      worker.terminate();
    };
    worker.onerror = function (err) {
      reject(err);
      worker.terminate();
    };
    worker.postMessage({ type: 'parse_dxf', text: text });
  });
}

function loadDxfFromFolder(files) {
  var arr = Array.from(files || []);
  var dxfFile = arr.filter(function (f) { return (f.name || '').toLowerCase().endsWith('.dxf'); })[0];
  if (!dxfFile) {
    alert('선택한 폴더에 DXF 파일이 없습니다.');
    return;
  }
  var fileMapByBasename = {};
  arr.forEach(function (f) {
    var name = (f.name || '').toLowerCase();
    fileMapByBasename[name] = f;
    fileMapByBasename[fileBasename(name)] = f;
  });
  showLoading(true);
  dxfFile.text().then(function (text) {
    parseDxfWithWorker(text).then(function (result) {
      var imageRefsWithFile = result.rawImageRefs.map(function (r, idx) {
        var base = fileBasename(r.fileName).toLowerCase();
        var matched = fileMapByBasename[base] || fileMapByBasename[(r.fileName || '').toLowerCase()];
        return { id: 'dxfimg-' + idx, x: r.x, y: r.y, fileName: r.fileName, file: matched || null };
      });
      applyDxfLoadResult(dxfFile.name, result.dxfData, imageRefsWithFile);
    }).catch(function (err) {
      console.error('DXF 로드 오류:', err);
      alert('DXF 파일을 여는데 실패했습니다: ' + (err.message || err));
      showLoading(false);
    });
  }).catch(function (err) {
    showLoading(false);
    alert('파일을 읽을 수 없습니다.');
    console.error(err);
  });
}

function loadDxfFile(file) {
  if (!file || !file.name) return;
  showLoading(true);
  file.text().then(function (text) {
    parseDxfWithWorker(text).then(function (result) {
      var imageRefsWithFile = result.rawImageRefs.map(function (r, idx) {
        return { id: 'dxfimg-' + idx, x: r.x, y: r.y, fileName: r.fileName, file: null };
      });
      applyDxfLoadResult(file.name, result.dxfData, imageRefsWithFile);
    }).catch(function (err) {
      console.error('DXF 로드 오류:', err);
      alert('DXF 파일을 여는데 실패했습니다: ' + (err.message || err));
      showLoading(false);
    });
  }).catch(function (err) {
    showLoading(false);
    alert('파일을 읽을 수 없습니다.');
    console.error(err);
  });
}

var dxfTextGreenCircleIcon = null;
var dxfTextGrayCircleIcon = null;

// DXF 텍스트 포인트 아이콘 고정 크기
var dxfTextIconSizePx = 10;

// DXF 텍스트 포인트 표시 여부 (객체 숨기기 모달)
var dxfTextVisible = true;
// 빨간원(촬영 사진)·파란원(참조 이미지) 표시 여부
var photoMarkersVisible = true;
var dxfImageMarkersVisible = true;

function getDxfTextGreenCircleIcon() {
  if (dxfTextGreenCircleIcon) return dxfTextGreenCircleIcon;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="10" fill="#00C853" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="1.0"/></svg>';
  var s = dxfTextIconSizePx;
  dxfTextGreenCircleIcon = {
    url: 'data:image/svg+xml,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(s, s),
    anchor: new google.maps.Point(s / 2, s / 2)
  };
  return dxfTextGreenCircleIcon;
}

function getDxfTextGrayCircleIcon() {
  if (dxfTextGrayCircleIcon) return dxfTextGrayCircleIcon;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="10" fill="#888888" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="1.0"/></svg>';
  var s = dxfTextIconSizePx;
  dxfTextGrayCircleIcon = {
    url: 'data:image/svg+xml,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(s, s),
    anchor: new google.maps.Point(s / 2, s / 2)
  };
  return dxfTextGrayCircleIcon;
}

var spatialIndex = null;
var spatialIndexCellSize = 0.0005; // ~50m 격자 크기

function buildSpatialIndex() {
  spatialIndex = {};
  if (!dxfGoogleFeaturesSource || dxfGoogleFeaturesSource.length === 0) return;
  
  dxfGoogleFeaturesSource.forEach(function (feature) {
    // 구글 API가 정상 생성한 데이터이므로 getGeometry()가 100% 보장됨
    var geom = feature.getGeometry && feature.getGeometry();
    if (!geom || !geom.getType) return;
    
    var bounds = getFeatureLatLngBounds(feature);
    if (!bounds) return;
    
    var startLatCell = Math.floor(bounds.minLat / spatialIndexCellSize);
    var endLatCell = Math.floor(bounds.maxLat / spatialIndexCellSize);
    var startLngCell = Math.floor(bounds.minLng / spatialIndexCellSize);
    var endLngCell = Math.floor(bounds.maxLng / spatialIndexCellSize);
    
    for (var latCell = startLatCell; latCell <= endLatCell; latCell++) {
      for (var lngCell = startLngCell; lngCell <= endLngCell; lngCell++) {
        var key = latCell + ',' + lngCell;
        if (!spatialIndex[key]) spatialIndex[key] = [];
        spatialIndex[key].push(feature);
      }
    }
  });
}

// 지도의 스크롤/줌 상태에 맞춰 현재 화면 영역 바깥의 도면선들을 지우고, 화면 내부 선들만 동적으로 주입
function updateDynamicMapData() {
  if (!map || !dxfGoogleFeaturesSource || !spatialIndex) return;

  var zoom = map.getZoom();
  
  // 최소 줌레벨 미만인 경우 지도 렌더러를 완전히 비워 렉 방지
  if (zoom < DXF_RENDER_MIN_ZOOM) {
    var allFeatures = [];
    map.data.forEach(function (feature) { allFeatures.push(feature); });
    allFeatures.forEach(function (feature) { map.data.remove(feature); });
    return;
  }

  var bounds = map.getBounds();
  if (!bounds) return;

  var sw = bounds.getSouthWest();
  var ne = bounds.getNorthEast();

  var startLatCell = Math.floor(sw.lat() / spatialIndexCellSize);
  var endLatCell = Math.floor(ne.lat() / spatialIndexCellSize);
  var startLngCell = Math.floor(sw.lng() / spatialIndexCellSize);
  var endLngCell = Math.floor(ne.lng() / spatialIndexCellSize);

  // 피처 고유 식별자 헬퍼 (getId가 없으면 _dxfFeatIdx 속성을 폴백)
  function getFid(feature) {
    var id = feature.getId();
    if (id != null) return 'id_' + id;
    var idx = feature.getProperty('_dxfFeatIdx');
    if (idx != null) return 'idx_' + idx;
    return null;
  }

  // 1. 현재 화면 바운더리에 포함된 격자 셀들만 뒤져서 대상 피처 고유 맵 수집
  var visibleFeaturesMap = {};
  for (var latCell = startLatCell; latCell <= endLatCell; latCell++) {
    for (var lngCell = startLngCell; lngCell <= endLngCell; lngCell++) {
      var key = latCell + ',' + lngCell;
      var cellFeatures = spatialIndex[key];
      if (cellFeatures) {
        cellFeatures.forEach(function (feature) {
          var fid = getFid(feature);
          if (fid != null) {
            visibleFeaturesMap[fid] = feature;
          }
        });
      }
    }
  }

  // 2. 현재 지도 위에 있는 피처 스캔 — 화면 밖 피처는 제거 대상으로 수집
  var currentFeaturesOnMap = {};
  var toRemove = [];
  map.data.forEach(function (feature) {
    var fid = getFid(feature);
    if (fid != null) {
      currentFeaturesOnMap[fid] = feature;
      if (!visibleFeaturesMap[fid]) {
        toRemove.push(feature);
      }
    }
  });
  // forEach 완료 후 안전하게 제거
  toRemove.forEach(function (feature) {
    map.data.remove(feature);
  });

  // 3. 화면 바운더리 내부로 들어왔으나 아직 지도에 안 실린 피처 신규 주입
  Object.keys(visibleFeaturesMap).forEach(function (fid) {
    if (!currentFeaturesOnMap[fid]) {
      map.data.add(visibleFeaturesMap[fid]);
    }
  });
}

function getFeatureLatLngBounds(feature) {
  var geom = feature.getGeometry();
  var type = geom.getType();
  var minLat = Infinity, maxLat = -Infinity;
  var minLng = Infinity, maxLng = -Infinity;
  function update(lat, lng) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (type === 'Point') {
    var pt = geom.get();
    update(pt.lat(), pt.lng());
  } else if (type === 'LineString') {
    var arr = geom.getArray();
    arr.forEach(function (pt) { update(pt.lat(), pt.lng()); });
  } else if (type === 'Polygon') {
    var path = geom.getAt(0);
    if (path && path.getArray) {
      var arr = path.getArray();
      arr.forEach(function (pt) { update(pt.lat(), pt.lng()); });
    }
  } else {
    return null;
  }
  return { minLat: minLat, maxLat: maxLat, minLng: minLng, maxLng: maxLng };
}

function applyDxfToMap() {
  if (!map || !dxfData || !window.DxfToGeoJSON) return;
  spatialIndex = null; // 공간 인덱스 리셋
  dxfGoogleFeaturesSource = []; // 피처 캐시 초기화
  
  // 1) DXF → GeoJSON 변환
  var geoJson = window.DxfToGeoJSON.dxfToGeoJSON(dxfData);
  
  // 2) 기존 맵 데이터 초기 청소
  map.data.forEach(function (feature) { map.data.remove(feature); });
  
  if (geoJson.features && geoJson.features.length > 0) {
    // 3) 구글 Maps API가 정상적으로 생산한 피처 인스턴스를 획득
    //    addGeoJson은 구글이 내부적으로 GeoJSON을 해석하여 온전한 피처 객체 배열을 반환
    var importedFeatures = map.data.addGeoJson(geoJson);
    
    // 4) 생산된 온전한 피처 인스턴스들을 전역 캐시에 보관 (인덱싱 및 culling용)
    dxfGoogleFeaturesSource = importedFeatures || [];
    
    // 5) 피처에 고유 ID가 없는 경우 순번 ID를 강제 부여 (culling 동기화 핵심)
    dxfGoogleFeaturesSource.forEach(function (feature, idx) {
      if (feature.getId() == null) {
        feature.setProperty('_dxfFeatIdx', idx);
      }
    });
    
    // 6) 공간 인덱스 구축
    buildSpatialIndex();
    
    // 7) 지도 데이터 스타일 지정
    map.data.setStyle(function (feature) {
      var geom = feature.getGeometry && feature.getGeometry();
      var geomType = geom && geom.getType ? geom.getType() : '';
      if (geomType === 'Point') {
        if (!dxfTextVisible) {
          return { visible: false, clickable: false };
        }
        var text = feature.getProperty('text');
        if (text != null && String(text).trim() !== '') {
          return {
            icon: getDxfTextGreenCircleIcon(),
            clickable: true
          };
        }
        return {
          icon: getDxfTextGrayCircleIcon(),
          clickable: false
        };
      }
      var strokeColor = feature.getProperty('strokeColor') || '#333';
      var fillColor = feature.getProperty('fillColor') || strokeColor;
      var thick = feature.getProperty('thick');
      var strokeWeight = thick ? 3 : 1;
      return {
        strokeColor: strokeColor,
        strokeWeight: strokeWeight,
        strokeOpacity: 0.9,
        fillColor: fillColor,
        fillOpacity: 0.06,
        clickable: false
      };
    });
    
    // 8) 도면 외곽 바운더리 매핑
    dxfBoundsLatLng = boundsFromGeoJSON(geoJson);
    
    // 9) 지도에 방금 올린 피처를 일단 전부 제거 (culling이 화면 영역에 맞게 다시 주입)
    dxfGoogleFeaturesSource.forEach(function (feature) {
      map.data.remove(feature);
    });
    
    // 10) 최초 1회 화면 영역 culling 렌더링 호출
    updateDynamicMapData();
  } else {
    dxfBoundsLatLng = null;
  }
}

function showDxfTextModal(text) {
  var modal = getEl('dxf-text-modal');
  var body = document.getElementById('dxf-text-modal-body');
  if (body) body.textContent = text == null ? '' : String(text);
  if (modal) modal.classList.add('active');
}

function hideDxfTextModal() {
  var modal = getEl('dxf-text-modal');
  if (modal) modal.classList.remove('active');
}

function bindDxfTextModal() {
  var modal = getEl('dxf-text-modal');
  var closeBtn = document.getElementById('dxf-text-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', hideDxfTextModal);
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target === modal) hideDxfTextModal();
  });
}

function showDeleteDataModal() {
  var modal = getEl('delete-data-modal');
  if (modal) modal.classList.add('active');
}

function hideDeleteDataModal() {
  var modal = getEl('delete-data-modal');
  if (modal) modal.classList.remove('active');
}

function deleteDataForProject() {
  if (!dxfFileFullName || !window.localStore) {
    alert('저장된 자료가 없습니다.');
    return;
  }
  if (!confirm('현재 도면의 모든 사진, 메모, 텍스트 데이터 및 저장 폴더 파일을 삭제하시겠습니까?\n(도면 자체는 유지됩니다)')) return;

  var beforeTextCount = texts ? texts.length : 0;
  var beforePhotoCount = photos ? photos.length : 0;

  showLoading(true);

  // 1. localFs 로컬 저장소 폴더 일괄 삭제 (도면 폴더 전체 삭제)
  var fsDeletePromise = Promise.resolve();
  if (window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir() && typeof window.localFs.deleteDrawingFiles === 'function') {
    fsDeletePromise = window.localFs.deleteDrawingFiles(dxfFileFullName).catch(function (fsErr) {
      console.warn('[localFs] 로컬 폴더 일괄 삭제 오류:', fsErr);
    });
  }

  // 2. localStore IndexedDB 데이터 삭제 (사진 일괄 삭제 + texts 초기화, 도면 형상 캐시는 보존)
  fsDeletePromise.then(function () {
    return window.localStore.deleteProjectData(dxfFileFullName);
  }).then(function (deletedPhotoCount) {
    texts = [];
    photos = [];
    
    // 사진번호 카운터 초기화 (도면 dmap:lastDxfFile는 유지하여 도면 보존)
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('dmap:lastPhotoNumber');
    }
    
    drawPhotoMarkers();
    drawTextMarkers();
    hideDeleteDataModal();
    hidePhotoModal();
    updateFileNameDisplay();

    var actualPhotoDeleted = (deletedPhotoCount != null && deletedPhotoCount > 0) ? deletedPhotoCount : beforePhotoCount;
    if (actualPhotoDeleted === 0 && beforeTextCount === 0) {
      alert('삭제할 데이터가 없습니다. (도면은 유지됩니다)');
    } else {
      alert('사진 ' + actualPhotoDeleted + '개, 텍스트 ' + beforeTextCount + '개 및 저장 폴더 삭제 완료\n(도면은 유지됩니다)');
    }
  }).catch(function (err) {
    console.error('자료 삭제 실패:', err);
    alert('삭제 실패: ' + (err && err.message ? err.message : '알 수 없음'));
  }).finally(function () {
    showLoading(false);
  });
}

function bindDeleteDataModal() {
  var modal = getEl('delete-data-modal');
  var closeBtn = document.getElementById('delete-data-close');
  var cancelBtn = document.getElementById('delete-data-cancel');
  var confirmBtn = document.getElementById('delete-data-confirm');
  if (closeBtn) closeBtn.addEventListener('click', hideDeleteDataModal);
  if (cancelBtn) cancelBtn.addEventListener('click', hideDeleteDataModal);
  if (confirmBtn) confirmBtn.addEventListener('click', deleteDataForProject);
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target === modal) hideDeleteDataModal();
  });
}

/** ADMAP처럼 vConsole 토글. 열릴 때 진단 보고서를 로그로 출력해 프로그램 전체 상태 확인에 활용 */
function toggleVConsole() {
  var vcSwitch = document.querySelector('.vc-switch');
  if (vcSwitch) {
    vcSwitch.click();
    try {
      console.log('[new_dmap] vConsole 토글됨');
      console.log(buildConsoleReport());
    } catch (e) { }
    return;
  }
  var vc = window.vConsole || (typeof vConsole !== 'undefined' ? vConsole : null);
  if (vc) {
    var vcPanel = document.querySelector('.vc-panel');
    var isOpen = vcPanel && vcPanel.offsetParent !== null && vcPanel.style.display !== 'none';
    if (isOpen) {
      vc.hide();
    } else {
      vc.show();
      try {
        console.log('[new_dmap] vConsole 열림');
        console.log(buildConsoleReport());
      } catch (e) { }
    }
  } else {
    // vConsole 미로드 시: 내장 콘솔 모달로 보고서 표시
    var modal = document.getElementById('console-modal');
    var body = document.getElementById('console-modal-body');
    if (body) body.textContent = buildConsoleReport();
    if (modal) modal.classList.add('active');
  }
}

function bindConsoleModal() {
  var modal = document.getElementById('console-modal');
  var closeBtn = document.getElementById('console-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', function () {
    if (modal) modal.classList.remove('active');
  });
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.classList.remove('active');
  });
}

/** 좌표계 선택 모달 */
function showCrsModal() {
  var modal = getEl('crs-modal');
  var container = document.getElementById('crs-options-container');
  if (!modal || !container) return;
  var C = window.DMAP_CONFIG || {};
  var options = C.CRS_OPTIONS || [
    { code: 'EPSG:5186', label: '중부원점 (5186)', detail: 'lon_0=127°' },
    { code: 'EPSG:5187', label: '동부원점 (5187)', detail: 'lon_0=129°' }
  ];
  container.innerHTML = '';
  var colors = ['#007AFF', '#34C759', '#5856D6', '#FF9500'];
  options.forEach(function (opt, idx) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.style.cssText = 'text-align:left; padding:12px; background:' + (colors[idx % colors.length]) + ';';
    btn.style.opacity = (opt.code === currentCrs) ? '1' : '0.6';
    btn.innerHTML = '<strong>' + opt.code + '</strong> — ' + opt.label + '<br><span style="font-size:12px; opacity:0.9;">' + opt.detail + '</span>';
    btn.addEventListener('click', function () {
      changeCrs(opt.code);
      hideCrsModal();
    });
    container.appendChild(btn);
  });
  modal.classList.add('active');
}

function hideCrsModal() {
  var modal = getEl('crs-modal');
  if (modal) modal.classList.remove('active');
  // 취소 시 대기 중인 파일 로드 정보 초기화
  pendingLoadFile = null;
  pendingLoadFolderFiles = null;
}

function bindCrsModal() {
  var modal = getEl('crs-modal');
  var closeBtn = document.getElementById('crs-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', hideCrsModal);
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target === modal) hideCrsModal();
  });
}

function changeCrs(newCrs) {
  currentCrs = newCrs;
  if (typeof localStorage !== 'undefined') localStorage.setItem('dmap:crs', newCrs);
  if (window.DxfToGeoJSON && window.DxfToGeoJSON.setCrs) {
    window.DxfToGeoJSON.setCrs(newCrs);
  }
  updateCrsDisplay();
  
  if (pendingLoadFile) {
    var file = pendingLoadFile;
    pendingLoadFile = null;
    loadDxfFile(file);
  } else if (pendingLoadFolderFiles) {
    var files = pendingLoadFolderFiles;
    pendingLoadFolderFiles = null;
    loadDxfFromFolder(files);
  } else if (dxfData) {
    // 도면이 이미 로드된 상태면 새 좌표계로 다시 렌더링
    applyDxfToMap();
    drawPhotoMarkers();
    drawTextMarkers();
    drawDxfImageMarkers();
    fitDxfToView();
  }
}

function updateCrsDisplay() {
  var code = currentCrs || 'EPSG:5186';
  var selectorCrsDisplay = document.getElementById('map-selector-crs-display');
  if (selectorCrsDisplay) {
    selectorCrsDisplay.textContent = code;
  }
  var menuMapTypeCrs = document.getElementById('menu-map-type-crs');
  if (menuMapTypeCrs) {
    menuMapTypeCrs.textContent = '(' + code + ')';
  }
}

function buildConsoleReport() {
  var lines = [];
  lines.push('new_dmap 콘솔');
  lines.push('------------------------------');

  if (!map) {
    lines.push('map: 초기화되지 않음');
  } else {
    lines.push('map: OK (zoom=' + map.getZoom() + ')');
  }

  if (!dxfData) {
    lines.push('dxfData: 없음 (DXF 미로딩)');
  } else {
    var entCount = Array.isArray(dxfData.entities) ? dxfData.entities.length : 0;
    lines.push('dxfData.entities: ' + entCount + ' 개');
  }

  var totalFeatures = 0;
  var pointFeatures = 0;
  var textPoints = 0;
  var noTextPoints = 0;
  var textSamples = [];

  if (map && map.data) {
    map.data.forEach(function (f) {
      totalFeatures++;
      var g = f.getGeometry && f.getGeometry();
      if (!g || !g.getType) return;
      var t = g.getType();
      if (t === 'Point') {
        pointFeatures++;
        var txt = f.getProperty && f.getProperty('text');
        var s = txt != null ? String(txt).trim() : '';
        if (s) {
          textPoints++;
          if (textSamples.length < 10) {
            textSamples.push(s);
          }
        } else {
          noTextPoints++;
        }
      }
    });
  }

  lines.push('GeoJSON Feature 수: ' + totalFeatures);
  lines.push('Point Feature 수: ' + pointFeatures);
  lines.push(' ├─ text 있는 Point: ' + textPoints);
  lines.push(' └─ text 없는 Point: ' + noTextPoints);

  // 원본 DXF 엔티티에서 TEXT/MTEXT/ATTRIB 계열 통계
  if (dxfData && Array.isArray(dxfData.entities)) {
    var rawTextCount = 0;
    var rawMTextCount = 0;
    var rawAttribCount = 0;
    var rawSamples = [];
    dxfData.entities.forEach(function (e) {
      if (!e || !e.type) return;
      var t = String(e.type).toUpperCase();
      if (t === 'TEXT') rawTextCount++;
      else if (t === 'MTEXT') rawMTextCount++;
      else if (t === 'ATTRIB' || t === 'ATTDEF') rawAttribCount++;

      if (rawSamples.length < 5 && (t === 'TEXT' || t === 'MTEXT' || t === 'ATTRIB' || t === 'ATTDEF')) {
        rawSamples.push({
          type: t,
          layer: e.layer,
          position: e.position,
          insertionPoint: e.insertionPoint || e.insert,
          text: e.text,
          value: e.value,
          string: e.string,
          height: e.height,
          rotation: e.rotation
        });
      }
    });

    lines.push('');
    lines.push('원본 DXF 엔티티(TEXT/MTEXT/ATTRIB):');
    lines.push('  TEXT  개수: ' + rawTextCount);
    lines.push('  MTEXT 개수: ' + rawMTextCount);
    lines.push('  ATTRIB/ATTDEF 개수: ' + rawAttribCount);

    if (rawSamples.length > 0) {
      lines.push('');
      lines.push('원본 엔티티 샘플(최대 5개):');
      rawSamples.forEach(function (s, idx) {
        lines.push('  [' + (idx + 1) + '] ' + JSON.stringify(s));
      });
    } else {
      lines.push('');
      lines.push('TEXT/MTEXT/ATTRIB 엔티티를 찾지 못했습니다.');
    }
  }

  if (textSamples.length > 0) {
    lines.push('');
    lines.push('text 샘플(최대 10개):');
    textSamples.forEach(function (s, idx) {
      lines.push('  [' + (idx + 1) + '] ' + s);
    });
  } else {
    lines.push('');
    lines.push('text 있는 Point가 없습니다.');
  }

  var reportText = lines.join('\n');
  try {
    console.log('[new_dmap 콘솔 보고서]\n' + reportText);
  } catch (e) { }
  return reportText;
}

function bindDxfDataLayerClick() {
  if (!map) return;
  map.data.addListener('click', function (e) {
    if (Date.now() - lastLongPressEndTime < 600) return;
    var feature = e.feature;
    if (!feature) return;
    var text = feature.getProperty('text');
    if (text != null && String(text).trim() !== '') showDxfTextModal(text);
  });
}

function boundsFromGeoJSON(geoJson) {
  var minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  function add(c) {
    if (c && Array.isArray(c) && c.length >= 2) {
      var lng = c[0], lat = c[1];
      if (isFinite(lat) && isFinite(lng)) {
        minLat = Math.min(minLat, lat);
        minLng = Math.min(minLng, lng);
        maxLat = Math.max(maxLat, lat);
        maxLng = Math.max(maxLng, lng);
      }
    }
  }
  function walk(coords) {
    if (Array.isArray(coords[0])) {
      coords.forEach(walk);
    } else {
      add(coords);
    }
  }
  if (geoJson.features) {
    geoJson.features.forEach(function (f) {
      var geom = f.geometry;
      if (!geom || !geom.coordinates) return;
      walk(geom.coordinates);
    });
  }
  if (!isFinite(minLat)) return null;
  return {
    sw: { lat: minLat, lng: minLng },
    ne: { lat: maxLat, lng: maxLng }
  };
}

function fitDxfToView() {
  if (!map) return;
  if (dxfBoundsLatLng) {
    var bounds = new google.maps.LatLngBounds(dxfBoundsLatLng.sw, dxfBoundsLatLng.ne);
    map.fitBounds(bounds, 40);
  } else {
    var C = window.DMAP_CONFIG || {};
    map.setCenter({ lat: C.MAP_ORIGIN_LAT || 36.3, lng: C.MAP_ORIGIN_LNG || 127.8 });
    map.setZoom(16);
  }
}

function updateFileNameDisplay() {
  var el = document.getElementById('file-name-text');
  if (!el) return;

  var isFast = (cameraModeSetting === 'fast');
  var badgeText = isFast ? ('⚡ ' + (fastCameraSizeSetting || '1MB')) : '📷 원본';
  var badgeClass = isFast ? 'top-cam-badge fast' : 'top-cam-badge standard';
  var badgeTitle = isFast ? '현재: ⚡고속 즉시 모드 (터치 시 📷일반 고화질로 전환)' : '현재: 📷일반 고화질 모드 (터치 시 ⚡고속 즉시로 전환)';
  var drawingNameClean = (dxfFileName || '도면').replace(/\.[^/.]+$/, '').trim();
  var lineMainHtml = '<div class="fn-line-main"><span>' + escapeHtml(drawingNameClean) + '</span><span id="top-camera-mode-badge" class="' + badgeClass + '" title="' + escapeHtml(badgeTitle) + '">' + escapeHtml(badgeText) + '</span></div>';

  if (!window.localFs || !window.localFs.isSupported()) {
    el.innerHTML = lineMainHtml +
      '<div class="fn-line-folder" style="background:#f5f5f5; color:#616161; border:1px solid #d0d0d0;">📁 내부DB 모드</div>';
    return;
  }

  if (!window.localFs.hasBaseDir()) {
    el.innerHTML = lineMainHtml +
      '<div class="fn-line-folder" style="background:#ffebee; color:#c62828; border:1px solid #ef9a9a; cursor:pointer;">🔴 📁 폴더 미연결 (터치하여 설정)</div>';
    return;
  }

  var baseName = window.localFs.getBaseDirName() || '작업폴더';

  if (typeof window.localFs.checkFolderStatus === 'function' && dxfFileFullName) {
    window.localFs.checkFolderStatus(dxfFileFullName).then(function (status) {
      if (status === 'granted') {
        el.innerHTML = lineMainHtml +
          '<div class="fn-line-folder" style="background:#e8f5e9; color:#1b5e20; border:1px solid #a5d6a7;">🟢 📁 ' + escapeHtml(baseName) + ' &gt; ' + escapeHtml(drawingNameClean) + ' (정상)</div>';
      } else if (status === 'sub_not_created') {
        el.innerHTML = lineMainHtml +
          '<div class="fn-line-folder" style="background:#e3f2fd; color:#0d47a1; border:1px solid #90caf9; cursor:pointer;" title="터치 시 도면 폴더 즉시 생성">🟡 📁 ' + escapeHtml(baseName) + ' &gt; ' + escapeHtml(drawingNameClean) + ' (폴더 자동생성 대기)</div>';
      } else if (status === 'prompt') {
        el.innerHTML = lineMainHtml +
          '<div class="fn-line-folder" style="background:#fff3e0; color:#e65100; border:1px solid #ffcc80; cursor:pointer;" title="터치하여 쓰기 권한 허용">🟠 📁 ' + escapeHtml(baseName) + ' (권한 필요 - 터치)</div>';
      } else {
        el.innerHTML = lineMainHtml +
          '<div class="fn-line-folder" style="background:#ffebee; color:#c62828; border:1px solid #ef9a9a; cursor:pointer;" title="터치하여 저장 폴더 재연결">🔴 📁 폴더 미연결/삭제됨 (터치하여 설정)</div>';
      }
    }).catch(function () {
      el.innerHTML = lineMainHtml +
        '<div class="fn-line-folder" style="background:#e8f5e9; color:#1b5e20; border:1px solid #a5d6a7;">🟢 📁 ' + escapeHtml(baseName) + ' &gt; ' + escapeHtml(drawingNameClean) + '</div>';
    });
  } else {
    el.innerHTML = lineMainHtml +
      '<div class="fn-line-folder" style="background:#e8f5e9; color:#1b5e20; border:1px solid #a5d6a7;">🟢 📁 ' + escapeHtml(baseName) + ' &gt; ' + escapeHtml(drawingNameClean) + '</div>';
  }

  updateStorageFolderMenuLabel();
}

function setMapType(type) {
  currentMapType = type || 'none';
  if (!map) return;
  var C = window.DMAP_CONFIG || {};
  if (currentMapType === 'none') {
    map.setOptions({ styles: C.BLANK_MAP_STYLE || [] });
    map.setMapTypeId('roadmap');
  } else if (currentMapType === 'roadmap') {
    map.setOptions({ styles: C.ROAD_ONLY_STYLE || [] });
    map.setMapTypeId('roadmap');
  } else {
    map.setOptions({ styles: [] });
    map.setMapTypeId(currentMapType);
  }
  requestAnimationFrame(function () {
    google.maps.event.trigger(map, 'resize');
  });
}

function getImageTargetSize() {
  // [0927] 고속 즉시 모드는 캔버스에서 1MB/500KB로 직접 생성하고,
  // 일반 고화질 모드는 스마트폰 기본 카메라의 원본 화질(변환/압축 없음)로 저장하므로 사후 압축을 완전히 생략합니다.
  return null;
}

/** ADMAP과 동일: DXF 파일 기준명(.dxf 제외) */
function getDxfBaseName() {
  var base = dxfFileFullName || (dxfFileName ? dxfFileName + '.dxf' : 'photo');
  return base.replace(/\.dxf$/i, '');
}

/** ADMAP과 동일: 사진 파일명 = 기준명_photo_MMDDHHmmss.jpg */
function generatePhotoFileName(photoNum) {
  var baseName = getDxfBaseName();
  var now = new Date();
  var mm = String(now.getMonth() + 1).padStart(2, '0');
  var dd = String(now.getDate()).padStart(2, '0');
  var hh = String(now.getHours()).padStart(2, '0');
  var min = String(now.getMinutes()).padStart(2, '0');
  var ss = String(now.getSeconds()).padStart(2, '0');
  var numStr = photoNum ? photoNum + '_' : '';
  return baseName + '_photo_' + numStr + mm + dd + hh + min + ss + '.jpg';
}

function showImageSizeModal() {
  var modal = getEl('image-size-modal');
  var currentDisplay = document.getElementById('current-size-display');
  if (currentDisplay) currentDisplay.textContent = imageSizeSetting;
  var opts = document.querySelectorAll('.size-opt');
  opts.forEach(function (btn) {
    var size = btn.getAttribute('data-size');
    btn.style.opacity = size === imageSizeSetting ? '1' : '0.7';
  });
  if (modal) modal.classList.add('active');
}

function closeImageSizeModal() {
  var modal = getEl('image-size-modal');
  if (modal) modal.classList.remove('active');
}

function setImageSize(size) {
  if (!['500KB', '1MB', '2MB', 'original'].includes(size)) return;
  imageSizeSetting = size;
  if (typeof localStorage !== 'undefined') localStorage.setItem('dmap:imageSize', size);
  closeImageSizeModal();
  updateFileNameDisplay();
}

function bindImageSizeModal() {
  var closeBtn = document.getElementById('image-size-close');
  if (closeBtn) closeBtn.addEventListener('click', closeImageSizeModal);
  ['size-500kb', 'size-1mb', 'size-2mb', 'size-original'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function () {
      setImageSize(btn.getAttribute('data-size'));
    });
  });
  var modal = getEl('image-size-modal');
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target === modal) closeImageSizeModal();
  });
}

function latLngToDxf(latLng) {
  if (!window.DxfToGeoJSON || !latLng) return null;
  var lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
  var lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
  return window.DxfToGeoJSON.lngLatToDxf(lng, lat);
}

function dxfToLatLng(x, y) {
  if (!window.DxfToGeoJSON) return null;
  var ll = window.DxfToGeoJSON.dxfToLngLat(x, y);
  return ll ? { lat: ll[1], lng: ll[0] } : null;
}

function clearDxfImageMarkers() {
  dxfImageMarkers.forEach(function (m) {
    if (m && m.setMap) m.setMap(null);
  });
  dxfImageMarkers = [];
}

function drawDxfImageMarkers() {
  clearDxfImageMarkers();
  if (!map || !window.DxfToGeoJSON) return;
  // 빨간원(사진 마커)과 동일: viewBox 24x24, circle cx=12 cy=12 r=10, 크기 12px, 짙은 파란색
  var blueSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="10" fill="#1565C0" stroke="#FFFFFF" stroke-width="1.5"/></svg>';
  var sizePx = 12;
  var blueIcon = {
    url: 'data:image/svg+xml,' + encodeURIComponent(blueSvg),
    scaledSize: new google.maps.Size(sizePx, sizePx),
    anchor: new google.maps.Point(sizePx / 2, sizePx / 2)
  };
  dxfImageRefs.forEach(function (ref) {
    var pos = dxfToLatLng(ref.x, ref.y);
    if (!pos) return;
    var m = new google.maps.Marker({
      map: dxfImageMarkersVisible ? map : null,
      position: pos,
      icon: blueIcon,
      title: ref.fileName || '참조 이미지'
    });
    m.dxfImageRef = ref;
    m.addListener('click', function () {
      if (Date.now() - lastLongPressEndTime < 600) return;
      showDxfImageModal(ref);
    });
    dxfImageMarkers.push(m);
  });
}

function applyObjectVisibility() {
  if (photoCluster) {
    if (photoMarkersVisible) {
      photoCluster.clearMarkers();
      photoCluster.addMarkers(photoMarkers);
    } else {
      photoCluster.clearMarkers();
    }
  } else if (photoMarkers) {
    photoMarkers.forEach(function (m) {
      if (m && m.setMap) m.setMap(photoMarkersVisible ? map : null);
    });
  }
  if (dxfImageMarkers) {
    dxfImageMarkers.forEach(function (m) {
      if (m && m.setMap) m.setMap(dxfImageMarkersVisible ? map : null);
    });
  }
  // 사진번호 및 제원 텍스트 마커 가시성 제어
  if (textOverlay) {
    textOverlay.setMap(dxfTextVisible ? map : null);
  }
  if (map && map.data) {
    try {
      map.data.setStyle(map.data.getStyle());
    } catch (e) { /* no-op */ }
  }
}

function showObjectVisibilityModal() {
  var modal = getEl('object-visibility-modal');
  var redCb = document.getElementById('obj-vis-red');
  var blueCb = document.getElementById('obj-vis-blue');
  var textCb = document.getElementById('obj-vis-text');
  if (!modal || !redCb || !blueCb || !textCb) return;
  redCb.checked = photoMarkersVisible;
  blueCb.checked = dxfImageMarkersVisible;
  textCb.checked = dxfTextVisible;
  modal.classList.add('active');
}

function hideObjectVisibilityModal() {
  var modal = getEl('object-visibility-modal');
  if (modal) modal.classList.remove('active');
}

function loadMetadataAndDisplay(dxfFile) {
  if (!window.localStore) return Promise.resolve();
  photos = [];
  texts = [];
  clearPhotoMarkers();
  clearTextMarkers();
  return Promise.all([
    window.localStore.loadProject(dxfFile),
    window.localStore.loadPhotos(dxfFile)
  ]).then(async function (res) {
    var project = res[0] || {};
    var loadedPhotos = res[1] || [];

    // 로컬 파일시스템에 저장된 메타데이터가 있다면 자동 복원 및 동기화
    if (window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir()) {
      try {
        var fsMeta = await window.localFs.loadMetadataFile(dxfFile);
        if (fsMeta && fsMeta.photos && fsMeta.photos.length > 0) {
          var primaryMap = {};
          var orphanSubs = [];

          fsMeta.photos.forEach(function (rawP) {
            var isSub = rawP.isSubPhoto === true || (rawP.id && String(rawP.id).indexOf('_sub_') !== -1);
            if (isSub) {
              orphanSubs.push(rawP);
            } else {
              primaryMap[rawP.id] = rawP;
              if (!rawP.subPhotos) {
                rawP.subPhotos = [];
              }
              if (rawP.subPhotos.length === 0 && rawP.subPhotoFiles && rawP.subPhotoFiles.length > 0) {
                rawP.subPhotos = rawP.subPhotoFiles.map(function (fn, sIdx) {
                  return { subIndex: sIdx, fileName: fn };
                });
              } else if (rawP.subPhotos.length === 0 && rawP.fileName) {
                rawP.subPhotos = [{ subIndex: 0, fileName: rawP.fileName }];
              }
            }
          });

          orphanSubs.forEach(function (subP) {
            var parentId = subP.parentPhotoId;
            if (!parentId && subP.id) {
              var idx = String(subP.id).indexOf('_sub_');
              if (idx !== -1) parentId = String(subP.id).substring(0, idx);
            }
            if (parentId && primaryMap[parentId]) {
              var parent = primaryMap[parentId];
              if (!parent.subPhotos) parent.subPhotos = [];
              var exists = parent.subPhotos.some(function (sp) {
                return sp.fileName === subP.fileName;
              });
              if (!exists) {
                parent.subPhotos.push({
                  subIndex: parent.subPhotos.length,
                  fileName: subP.fileName || ''
                });
              }
            }
          });

          var restoredList = [];
          for (var rk in primaryMap) {
            if (Object.prototype.hasOwnProperty.call(primaryMap, rk)) {
              restoredList.push(primaryMap[rk]);
            }
          }

          if (!loadedPhotos || loadedPhotos.length === 0) {
            loadedPhotos = restoredList;
            if (fsMeta.texts && fsMeta.texts.length > 0) {
              project.texts = fsMeta.texts;
            }
            window.localStore.saveProject(dxfFile, { texts: project.texts, lastModified: fsMeta.lastModified || new Date().toISOString() });
            for (var i = 0; i < loadedPhotos.length; i++) {
              window.localStore.savePhoto(dxfFile, loadedPhotos[i]);
            }
          } else {
            // IndexedDB에 이미 사진이 있더라도 파일시스템 메타데이터와 파일명 및 subPhotos 보정 동기화
            var metaMap = {};
            restoredList.forEach(function (rp) {
              if (rp && rp.id) metaMap[rp.id] = rp;
            });
            loadedPhotos.forEach(function (lp) {
              var mp = metaMap[lp.id];
              if (mp) {
                if (!lp.fileName && mp.fileName) lp.fileName = mp.fileName;
                if ((!lp.subPhotos || lp.subPhotos.length <= 1) && mp.subPhotos && mp.subPhotos.length > 1) {
                  lp.subPhotos = mp.subPhotos;
                }
              }
            });
          }
        }
      } catch (fe) {
        console.warn('[loadMetadataAndDisplay] 파일시스템 메타데이터 로드 예외:', fe);
      }
    }

    // [0925_01] IndexedDB에 이전 버전의 평탄화된 서브사진 항목(_sub_)이 남아있을 경우 주 사진과 분리하여 병합
    var cleanedLoadedPhotos = [];
    var subRecords = [];
    (loadedPhotos || []).forEach(function (lp) {
      var isSub = lp.isSubPhoto === true || (lp.id && String(lp.id).indexOf('_sub_') !== -1);
      if (isSub) {
        subRecords.push(lp);
      } else {
        cleanedLoadedPhotos.push(lp);
      }
    });

    subRecords.forEach(function (sRec) {
      var parentId = sRec.parentPhotoId;
      if (!parentId && sRec.id) {
        var idx = String(sRec.id).indexOf('_sub_');
        if (idx !== -1) parentId = String(sRec.id).substring(0, idx);
      }
      if (parentId) {
        var parent = cleanedLoadedPhotos.filter(function (cp) { return String(cp.id) === String(parentId); })[0];
        if (parent) {
          if (!parent.subPhotos) parent.subPhotos = [];
          var exists = parent.subPhotos.some(function (sp) { return sp.fileName === sRec.fileName; });
          if (!exists) {
            parent.subPhotos.push({
              subIndex: parent.subPhotos.length,
              fileName: sRec.fileName || ''
            });
          }
        }
      }
    });
    loadedPhotos = cleanedLoadedPhotos;

    texts = project.texts || [];
    loadedPhotos.forEach(function (p) {
      // subPhotos 복원: p.subPhotos가 없거나 1개뿐인데 p.subPhotoFiles에 더 많은 사진이 있는 경우 보정
      var sList = p.subPhotos;
      if ((!sList || sList.length <= 1) && p.subPhotoFiles && p.subPhotoFiles.length > 1) {
        sList = p.subPhotoFiles.map(function (fn, sIdx) {
          return { subIndex: sIdx, fileName: fn };
        });
      } else if (!sList && p.fileName) {
        sList = [{ subIndex: 0, fileName: p.fileName }];
      }

      var photoFileName = p.fileName || (sList && sList[0] ? sList[0].fileName : '');

      photos.push({
        id: p.id, x: p.x, y: p.y, width: p.width, height: p.height,
        blob: p.blob, memo: p.memo || '', fileName: photoFileName,
        createdAt: p.createdAt, updatedAt: p.updatedAt,
        numTextId: p.numTextId,
        specTextId: p.specTextId,
        specTextIds: p.specTextIds || null,
        facilityType: p.facilityType,
        additionalTypes: p.additionalTypes || null,
        subPhotos: sList || null,
        subPhotoFiles: p.subPhotoFiles || (sList ? sList.map(function (s) { return s.fileName; }) : null)
      });
    });
    drawPhotoMarkers();
    drawTextMarkers();
  }).catch(function (err) {
    console.warn('메타데이터 로드 실패:', err);
  });
}

function clearPhotoMarkers() {
  if (photoCluster) {
    photoCluster.clearMarkers();
    photoCluster.setMap(null);
    photoCluster = null;
  }
  photoMarkers.forEach(function (m) {
    if (m && m.setMap) m.setMap(null);
  });
  photoMarkers = [];
}

function clearTextMarkers() {
  if (textOverlay) {
    textOverlay.setMap(null);
    textOverlay = null;
  }
  textMarkers = [];
}

var photoIconCache = {};
function getPhotoIcon(color, sizePx) {
  var key = color + '_' + sizePx;
  if (photoIconCache[key]) return photoIconCache[key];
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="10" fill="' + color + '" stroke="#FFFFFF" stroke-width="1.5"/>' +
    '</svg>';
  photoIconCache[key] = {
    url: 'data:image/svg+xml,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(sizePx, sizePx),
    anchor: new google.maps.Point(sizePx / 2, sizePx / 2)
  };
  return photoIconCache[key];
}
function showPhotoSelectBottomSheet(list) {
  var sheet = getEl('bottom-sheet-flow');
  var content = getEl('bottom-sheet-content');
  var title = getEl('bottom-sheet-title');
  var closeBtn = document.getElementById('bottom-sheet-close');
  if (!sheet || !content) return;

  if (title) title.textContent = '📷 사진 선택 (반경 2m 이내)';
  content.innerHTML = '<p style="font-size:13px; color:#666; margin:0 0 10px 0;">수정할 사진을 선택하세요.</p>';

  list.forEach(function (photoItem) {
    // 사진번호 구하기
    var numTextObj = photoItem.numTextId ? texts.filter(function (t) { return t.id === photoItem.numTextId; })[0] : null;
    var numTextVal = numTextObj ? numTextObj.text : '번호없음';
    var typeText = photoItem.facilityType || '일반사진';

    var div = document.createElement('div');
    div.className = 'facility-list-item';
    div.textContent = '사진 ' + numTextVal + '번 (' + typeText + ')';
    div.addEventListener('click', function () {
      hideStreetlightBottomSheet();
      showPhotoModal(photoItem.id);
    });
    content.appendChild(div);
  });

  if (closeBtn && !closeBtn._bound) {
    closeBtn.addEventListener('click', hideStreetlightBottomSheet);
    closeBtn._bound = true;
  }

  sheet.classList.add('active');
}

function drawPhotoMarkers() {
  clearPhotoMarkers();
  if (!map || !window.DxfToGeoJSON) return;
  photos.forEach(function (p) {
    var pos = dxfToLatLng(p.x, p.y);
    if (!pos) return;
    var isUploaded = p.uploaded !== false;
    var hasMemo = p.memo && String(p.memo).trim();
    var markerColor;
    var sizePx;
    if (p.facilityType === '측구' || p.facilityType === '도로') {
      markerColor = '#FF0000'; // 측구, 도로는 무조건 빨간색
      sizePx = 12;
    } else if (isUploaded) {
      markerColor = hasMemo ? '#9B51E0' : '#008000'; // 메모 있음: 보라색, 메모 없음: 진한 초록색
      sizePx = 12;
    } else {
      markerColor = '#00C853';
      sizePx = 38;
    }
    var icon = getPhotoIcon(markerColor, sizePx);
    // 클러스터 사용 시 map을 지정하지 않음 (클러스터가 관리)
    var m = new google.maps.Marker({
      position: pos,
      icon: icon,
      title: p.memo || p.fileName || '사진'
    });
    m.photoId = p.id;
    m.addListener('click', function () {
      if (Date.now() - lastLongPressEndTime < 600) return;
      
      // 2m 이내의 중첩된 사진 마커들 찾기
      var nearby = [];
      photos.forEach(function (other) {
        var dx = other.x - p.x;
        var dy = other.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 2.0) {
          nearby.push({
            photo: other,
            distance: dist
          });
        }
      });

      // 거리순 정렬
      nearby.sort(function (a, b) { return a.distance - b.distance; });

      if (nearby.length > 1) {
        // 2개 이상 겹쳐 있는 경우 바텀시트로 선택 팝업 제공
        showPhotoSelectBottomSheet(nearby.map(function (item) { return item.photo; }));
      } else {
        // 겹쳐진 사진이 없는 경우 직접 수정모달 호출
        showPhotoModal(p.id);
      }
    });
    photoMarkers.push(m);
  });
  // MarkerClusterer가 로드되어 있으면 클러스터링 적용 (200~300장 대응)
  if (photoMarkersVisible && photoMarkers.length > 0 && typeof markerClusterer !== 'undefined' && markerClusterer.MarkerClusterer) {
    photoCluster = new markerClusterer.MarkerClusterer({
      map: map,
      markers: photoMarkers
    });
  } else if (photoMarkersVisible) {
    // 폴백: 클러스터 미로드 시 개별 마커 직접 표시
    photoMarkers.forEach(function (m) { m.setMap(map); });
  }
}

var toastTimer = null;
function showToast(message) {
  var container = document.getElementById('toast-container');
  var msgEl = document.getElementById('toast-message');
  if (!container || !msgEl) return;

  msgEl.textContent = message;
  container.classList.add('show');

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(function () {
    container.classList.remove('show');
    toastTimer = null;
  }, 2000);
}

function drawTextMarkers() {
  clearTextMarkers();
  if (!map || !window.DxfToGeoJSON || !texts.length) return;
  function TextOnlyOverlay(textsArr) {
    this.textsArr = textsArr;
    this.div = null;
    this.spans = []; // DOM 재사용을 위한 캐싱
    this.setMap(map);
  }
  TextOnlyOverlay.prototype = new google.maps.OverlayView();
  TextOnlyOverlay.prototype.onAdd = function () {
    this.div = document.createElement('div');
    this.div.style.position = 'absolute';
    // 지도 드래그 이벤트를 막지 않도록 none 처리하고, 자식인 span에만 auto를 부여합니다.
    this.div.style.pointerEvents = 'none';
    this.div.style.left = '0';
    this.div.style.top = '0';

    var self = this;
    this.textsArr.forEach(function (t) {
      // 1. 사진번호 토글이 꺼진 경우 사진번호 텍스트는 건너뜀
      if (t.layer === '사진번호' && !showPhotoNumberToggle) return;
      
      // 2. 제원보기 토글이 꺼진 경우 '사진번호'가 아닌 일반 제원 텍스트는 일체 화면에 그리지 않음
      if (t.layer !== '사진번호' && !showSpecTextToggle) return;
      var pos = dxfToLatLng(t.x, t.y);
      if (!pos) return;
      var span = document.createElement('span');
      span.textContent = (t.text || '').trim() || ' ';
      span.style.position = 'absolute';
      span.style.fontSize = '12px';
      span.style.fontWeight = 'bold';
      if (t.layer === '사진번호') {
        span.style.color = '#007AFF'; // 파란색
      } else {
        span.style.color = '#FF3B30'; // 빨간색
      }
      span.style.textAlign = 'left';
      span.style.whiteSpace = 'nowrap';
      span.style.pointerEvents = 'auto'; // 텍스트만 클릭되도록 허용
      span.style.cursor = 'pointer';
      span.style.textShadow = '0 0 1px #fff, 0 0 2px #fff';
      // 초기에는 보이지 않도록 숨김 (draw 시점에 좌표 계산 후 위치)
      span.style.left = '0px';
      span.style.top = '0px';
      span.style.transform = 'translate(-9999px, -9999px)';
      span.setAttribute('data-text-id', t.id);
      span.addEventListener('click', function (e) {
        e.stopPropagation();
        if (Date.now() - lastLongPressEndTime < 600) return;
        showTextModal(t.id);
      });
      // draw에서 좌표 계산시 쓸 WGS84 객체를 미리 생성해 둠
      span._latLng = new google.maps.LatLng(pos.lat, pos.lng);
      
      // Y축 오프셋 없이 마커와 동일한 좌표(높낮이)에 위치
      span._offsetY = 0;

      self.div.appendChild(span);
      self.spans.push(span);
    });

    var pane = this.getPanes && this.getPanes();
    if (pane) (pane.floatPane || pane.overlayLayer).appendChild(this.div);
  };
  TextOnlyOverlay.prototype.draw = function () {
    if (!this.div || !this.getProjection || !map) return;
    var proj = this.getProjection();
    var bounds = map.getBounds();
    // Throttle(딜레이)를 제거하고 requestAnimationFrame이나 즉시 실행 수준으로 동작하게 함
    // 매번 innerHTML을 지우고 만드는 대신, 캐싱된 span 돔의 transform만 변경함 (GPU 가속)
    // 뷰포트 영역 필터링(culling)을 적용하여 화면 밖에 있는 텍스트는 드로우 연산에서 배제하고 숨김 처리합니다.
    this.spans.forEach(function (span) {
      var inBounds = bounds ? bounds.contains(span._latLng) : true;
      if (inBounds) {
        var point = proj.fromLatLngToDivPixel(span._latLng);
        if (point) {
          span.style.display = '';
          var offsetY = span._offsetY || 0;
          span.style.transform = 'translate(' + point.x + 'px, ' + (point.y - 8 + offsetY) + 'px)';
        }
      } else {
        span.style.display = 'none';
      }
    });
  };
  TextOnlyOverlay.prototype.onRemove = function () {
    if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
    this.div = null;
    this.spans = [];
  };
  textOverlay = new TextOnlyOverlay(texts);
  if (textOverlay && typeof dxfTextVisible !== 'undefined') {
    textOverlay.setMap(dxfTextVisible ? map : null);
  }
}

function hideContextMenu() {
  if (contextMenuEl) contextMenuEl.classList.remove('active');
}

function bindContextMenuCloseOnMap() {
  if (!map || !contextMenuEl) return;
  map.addListener('dragstart', function () {
    hideContextMenu();
  });
  map.addListener('zoom_changed', function () {
    hideContextMenu();
  });
  document.addEventListener('touchstart', function (e) {
    if (contextMenuEl && contextMenuEl.classList.contains('active')) {
      if (e.target && !contextMenuEl.contains(e.target)) hideContextMenu();
    }
    
    var sheet = getEl('bottom-sheet-flow');
    if (sheet && sheet.classList.contains('active')) {
      if (typeof isCameraCapturing !== 'undefined' && isCameraCapturing) {
        return; // 카메라 촬영 중에는 바텀시트 유지
      }
      var isModalActive = document.querySelector('.modal.active');
      var isInsideModal = e.target && e.target.closest && e.target.closest('.modal');
      var isFastCamActive = document.querySelector('#fast-camera-modal:not(.hidden)');
      var isInsideFastCam = e.target && e.target.closest && e.target.closest('#fast-camera-modal');
      if (isModalActive || isInsideModal || isFastCamActive || isInsideFastCam) {
        return; // 모달이 열려있거나 모달/카메라 내부를 터치하는 중에는 바텀시트 유지
      }
      if (e.target && !sheet.contains(e.target)) {
        hideStreetlightBottomSheet();
      }
    }
  }, { passive: true });
  document.addEventListener('mousedown', function (e) {
    if (contextMenuEl && contextMenuEl.classList.contains('active')) {
      if (e.target && !contextMenuEl.contains(e.target)) hideContextMenu();
    }
    
    var sheet = getEl('bottom-sheet-flow');
    if (sheet && sheet.classList.contains('active')) {
      if (typeof isCameraCapturing !== 'undefined' && isCameraCapturing) {
        return; // 카메라 촬영 중에는 바텀시트 유지
      }
      var isModalActive = document.querySelector('.modal.active');
      var isInsideModal = e.target && e.target.closest && e.target.closest('.modal');
      var isFastCamActive = document.querySelector('#fast-camera-modal:not(.hidden)');
      var isInsideFastCam = e.target && e.target.closest && e.target.closest('#fast-camera-modal');
      if (isModalActive || isInsideModal || isFastCamActive || isInsideFastCam) {
        return; // 모달이 열려있거나 모달/카메라 내부를 클릭하는 중에는 바텀시트 유지
      }
      if (e.target && !sheet.contains(e.target)) {
        hideStreetlightBottomSheet();
      }
    }
  });
}

function bindMapLongPress() {
  if (!map || !contextMenuEl) return;
  var mapEl = document.getElementById('map');
  var moveThreshold = 15;
  var touchStartX = 0;
  var touchStartY = 0;
  var pendingLongPress = null;
  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    pendingLongPress = null;
  }
  function showMenuAt(clientX, clientY, latLng) {
    if (!latLng) return;
    
    // 롱프레스가 실행된 타임스탬프를 갱신하여 600ms 이내의 후속 클릭(손가락 뗄 때) 이벤트 차단
    lastLongPressEndTime = Date.now();
    
    var dxfCoords = latLngToDxf(latLng);
    if (!dxfCoords) return;

    // 2m 이내 시설물 탐색
    var nearby = findNearbyFacilities(latLng, 2.0);
    nearby = nearby.filter(function (item) {
      // 1. 유효한 시설물 유형인지 필터링 (엑셀 B열 detectionLayers 매칭 지원)
      return getMatchingFacilities(item.name, item.layer).length > 0;
    });

    // 거리순 정렬
    nearby.sort(function (a, b) {
      return a.distance - b.distance;
    });

    // 항상 바텀시트 호출 (방안 1)
    showStreetlightBottomSheet(nearby, dxfCoords, latLng);
  }
  function latLngFromClient(clientX, clientY) {
    if (!mapEl || !map) return null;
    var bounds = map.getBounds();
    if (!bounds) return null;
    var proj = map.getProjection();
    if (!proj) return null;
    var rect = mapEl.getBoundingClientRect();
    var fx = (clientX - rect.left) / rect.width;
    var fy = (clientY - rect.top) / rect.height;
    var topRight = proj.fromLatLngToPoint(bounds.getNorthEast());
    var bottomLeft = proj.fromLatLngToPoint(bounds.getSouthWest());
    var point = new google.maps.Point(
      bottomLeft.x + fx * (topRight.x - bottomLeft.x),
      topRight.y + fy * (bottomLeft.y - topRight.y)
    );
    return proj.fromPointToLatLng(point);
  }
  var isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
  if (!isTouchDevice) {
    map.addListener('mousedown', function (e) {
      var cX = e.domEvent && e.domEvent.clientX;
      var cY = e.domEvent && e.domEvent.clientY;
      pendingLongPress = { clientX: cX, clientY: cY, latLng: e.latLng };
      longPressTimer = setTimeout(function () {
        longPressTimer = null;
        if (!pendingLongPress) return;
        showMenuAt(pendingLongPress.clientX, pendingLongPress.clientY, pendingLongPress.latLng);
        pendingLongPress = null;
      }, longPressDuration);
    });
    map.addListener('mouseup', cancelLongPress);
    map.addListener('mousemove', cancelLongPress);
  }
  if (mapEl) {
    mapEl.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length >= 2) {
        cancelLongPress();
        return;
      }
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        pendingLongPress = { clientX: touchStartX, clientY: touchStartY, latLng: null };
        longPressTimer = setTimeout(function () {
          longPressTimer = null;
          if (!pendingLongPress) return;
          var latLng = latLngFromClient(pendingLongPress.clientX, pendingLongPress.clientY);
          if (latLng) {
            showMenuAt(pendingLongPress.clientX, pendingLongPress.clientY, latLng);
          }
          pendingLongPress = null;
        }, longPressDuration);
      }
    }, { passive: true });
    mapEl.addEventListener('touchmove', function (e) {
      if (!longPressTimer || !e.touches.length) return;
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      if (dx * dx + dy * dy > moveThreshold * moveThreshold) cancelLongPress();
    }, { passive: true });
    mapEl.addEventListener('touchend', function (e) {
      if (e.touches && e.touches.length >= 1) return;
      if (longPressTimer) cancelLongPress();
    }, { passive: true });
  }
}

// ==========================================
// [촬영 모드 및 인앱 고속 즉시 촬영 카메라 서브시스템]
// ==========================================
var cameraModeSetting = localStorage.getItem('sdmap_camera_mode') || 'fast';
var fastCameraSizeSetting = localStorage.getItem('sdmap_fast_cam_size') || '1MB';
var isCameraCapturing = false; // 카메라 촬영 중 플래그 (바텀시트 외부클릭 시 조사대상 데이터 유실 방지)
var fastCameraStream = null;
var fastCameraTrack = null;
var fastCameraCallback = null;
var fastCameraCurrentZoom = 1.0;
var fastCameraIsTorchOn = false;
var fastCameraUltraWideDeviceId = null;
var fastCameraMainDeviceId = null;
var fastCameraCurrentDeviceId = null;
var fastCameraEventsBound = false;

function updateFastCameraSizeUI() {
  var label = document.getElementById('fc-size-label');
  if (label) {
    label.textContent = fastCameraSizeSetting;
  }
  updateFileNameDisplay();
}

function toggleFastCameraSize() {
  if (fastCameraSizeSetting === '1MB') {
    fastCameraSizeSetting = '500KB';
  } else {
    fastCameraSizeSetting = '1MB';
  }
  localStorage.setItem('sdmap_fast_cam_size', fastCameraSizeSetting);
  updateFastCameraSizeUI();
  if (fastCameraSizeSetting === '500KB') {
    showToast('고속 촬영 화질: 500KB 설정됨 (HD 1280×720, 저장속도 극대화)');
  } else {
    showToast('고속 촬영 화질: 1MB 설정됨 (FHD 1920×1080, 표준 고화질)');
  }
}

function updateCameraModeMenuLabel() {
  var statusEl = document.getElementById('menu-camera-mode-status');
  if (!statusEl) return;
  if (cameraModeSetting === 'fast') {
    statusEl.textContent = '⚡고속 즉시';
    statusEl.style.color = '#2563eb';
    statusEl.style.fontWeight = 'bold';
  } else {
    statusEl.textContent = '📷일반 고화질';
    statusEl.style.color = '#059669';
    statusEl.style.fontWeight = 'bold';
  }
}

function toggleCameraMode() {
  if (cameraModeSetting === 'fast') {
    cameraModeSetting = 'standard';
    localStorage.setItem('sdmap_camera_mode', 'standard');
    updateCameraModeMenuLabel();
    updateFileNameDisplay();
    showToast('📷 일반 고화질 모드 (기본 카메라 앱 실행, 원본화질 무변환 저장)');
  } else {
    cameraModeSetting = 'fast';
    localStorage.setItem('sdmap_camera_mode', 'fast');
    updateCameraModeMenuLabel();
    updateFileNameDisplay();
    showToast('⚡ 고속 즉시 촬영 모드 (셔터 터치 즉시 확인 없이 창 열림)');
  }
}

/** 통합 사진 캡처 라우터 (저장소 상태 검증 후 설정된 모드에 따라 카메라 실행) */
function triggerCameraCapture() {
  isCameraCapturing = true;
  if (window.localFs && typeof window.localFs.ensureStorageReady === 'function') {
    window.localFs.ensureStorageReady(dxfFileFullName).then(function (ready) {
      if (!ready) {
        isCameraCapturing = false;
        isAddingSubPhoto = false;
        return;
      }
      launchCameraByMode();
    });
    return;
  }
  launchCameraByMode();
}

function launchCameraByMode() {
  if (cameraModeSetting === 'fast' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    openFastCameraModal(handleCapturedPhoto);
  } else {
    var input = getEl('camera-input');
    if (input) input.click();
  }
}

/** 촬영된 사진 File을 상태(일반/객체감지/추가사진)에 맞게 처리 */
function handleCapturedPhoto(file) {
  isCameraCapturing = false;
  if (!file) return;
  if (isAddingSubPhoto) {
    if (pendingFacilitySurvey && pendingFacilitySurvey.isNew) {
      // 신규 시설물 조사 모달 내 추가사진 촬영
      addSubPhotoToPendingNewSurvey(file);
    } else if (editingPhotoId) {
      // 기존 시설물 조사 모달 내 추가사진 촬영
      addSubPhotoToCurrentPhoto(file);
    } else if (pendingStreetlightItem) {
      // 객체감지 조사 추가사진 촬영
      addSubPhotoToPendingStreetlight(file);
    }
  } else if (pendingStreetlightItem) {
    showStreetlightInputForm(file, pendingStreetlightItem, pendingStreetlightDxfCoords, pendingStreetlightLatLng);
  } else if (pendingAddPosition) {
    addPhotoAtPosition(pendingAddPosition, file);
  }
  isAddingSubPhoto = false;
}

/** 인앱 고속 즉시 촬영 모달 열기 */
function openFastCameraModal(callback) {
  fastCameraCallback = callback;
  var modal = document.getElementById('fast-camera-modal');
  var video = document.getElementById('fast-camera-video');
  if (!modal || !video) {
    var input = getEl('camera-input');
    if (input) input.click();
    return;
  }

  updateFastCameraSizeUI();
  modal.classList.remove('hidden');

  var constraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920, max: 3840 },
      height: { ideal: 1080, max: 2160 }
    },
    audio: false
  };

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    fastCameraStream = stream;
    fastCameraTrack = stream.getVideoTracks()[0];
    video.srcObject = stream;
    video.play().catch(function (e) {
      console.warn('Video play warning:', e);
    });

    setupFastCameraCapabilities(fastCameraTrack, 1.0);
  }).catch(function (err) {
    console.warn('Fast camera getUserMedia failed, fallback to native camera:', err);
    closeFastCameraModal(false);
    isCameraCapturing = true;
    showToast('인앱 카메라 실행 실패: 기본 카메라로 전환합니다.');
    var input = getEl('camera-input');
    if (input) input.click();
  });
}

/** 다중 후면 카메라(초광각 0.5X / 표준 1X) 디바이스 탐색 및 캐싱 */
function detectCameraDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then(function (devices) {
    var videoDevices = devices.filter(function (d) { return d.kind === 'videoinput'; });
    if (!videoDevices || videoDevices.length === 0) return;

    // 후면 카메라 식별 (전면/셀카 제외)
    var backDevices = videoDevices.filter(function (d) {
      var lbl = (d.label || '').toLowerCase();
      return lbl.indexOf('front') === -1 && lbl.indexOf('selfie') === -1 && lbl.indexOf('전면') === -1 && lbl.indexOf('user') === -1;
    });
    if (backDevices.length === 0) backDevices = videoDevices;

    // 1. 초광각(0.5X) 디바이스 식별
    var ultraWide = backDevices.find(function (d) {
      var lbl = (d.label || '').toLowerCase();
      return lbl.indexOf('ultra') !== -1 || lbl.indexOf('0.5') !== -1 || lbl.indexOf('초광각') !== -1 ||
             lbl.indexOf('wide-angle') !== -1 || lbl.indexOf('wide angle') !== -1 ||
             lbl.indexOf('camera2 2') !== -1 || lbl.indexOf('camera 2') !== -1;
    });

    // 라벨에 명시적 키워드가 없지만 후면 카메라가 2개 이상인 경우 (일반적인 갤럭시/안드로이드):
    if (!ultraWide && backDevices.length >= 2) {
      ultraWide = backDevices[1];
    }

    if (ultraWide && ultraWide.deviceId) {
      fastCameraUltraWideDeviceId = ultraWide.deviceId;
    }

    // 2. 메인(1X) 디바이스 식별
    var mainDev = backDevices.find(function (d) {
      var lbl = (d.label || '').toLowerCase();
      return (lbl.indexOf('0') !== -1 || lbl.indexOf('main') !== -1 || lbl.indexOf('standard') !== -1) &&
             (d.deviceId !== fastCameraUltraWideDeviceId);
    }) || backDevices[0];

    if (mainDev && mainDev.deviceId) {
      fastCameraMainDeviceId = mainDev.deviceId;
    }
  }).catch(function (e) {
    console.warn('[FastCamera] 디바이스 탐색 에러:', e);
  });
}

/** 카메라 제어 기능(줌, 플래시, 렌즈 등) 초기화 */
function setupFastCameraCapabilities(track, preserveZoom) {
  var torchBtn = document.getElementById('fc-torch-btn');
  var lensControls = document.getElementById('fc-lens-controls');
  var btn05 = document.getElementById('fc-lens-05');
  var btn1 = document.getElementById('fc-lens-1');
  var btn2 = document.getElementById('fc-lens-2');

  var currentZoom = (preserveZoom != null) ? preserveZoom : (fastCameraCurrentZoom || 1.0);
  fastCameraCurrentZoom = currentZoom;

  if (btn05) btn05.classList.toggle('active', currentZoom === 0.5);
  if (btn1) btn1.classList.toggle('active', currentZoom === 1);
  if (btn2) btn2.classList.toggle('active', currentZoom === 2);

  // 세 가지 렌즈 배율(.5X, 1X, 2X) 모두 상시 노출
  if (lensControls) lensControls.style.display = 'inline-flex';
  if (btn05) btn05.style.display = 'inline-block';
  if (btn1) btn1.style.display = 'inline-block';
  if (btn2) btn2.style.display = 'inline-block';

  if (!track || typeof track.getCapabilities !== 'function') {
    if (torchBtn) torchBtn.style.display = 'none';
    detectCameraDevices();
    return;
  }

  var capabilities = track.getCapabilities();

  // 토치(플래시) 지원 여부
  if (torchBtn) {
    if (capabilities.torch) {
      torchBtn.style.display = 'flex';
      torchBtn.textContent = '⚡';
      torchBtn.style.color = '#ffffff';
    } else {
      torchBtn.style.display = 'none';
    }
  }

  detectCameraDevices();
}

/** 줌 배율 직접 적용 (하드웨어 제약 내) */
function applyFastCameraZoomValue(val) {
  if (!fastCameraTrack || typeof fastCameraTrack.getCapabilities !== 'function') return;
  var caps = fastCameraTrack.getCapabilities();
  if (!caps.zoom) return;
  var minZ = caps.zoom.min || 1;
  var maxZ = caps.zoom.max || 1;
  var target = Math.max(minZ, Math.min(maxZ, val));
  fastCameraCurrentZoom = target;
  try {
    fastCameraTrack.applyConstraints({ advanced: [{ zoom: target }] });
  } catch (e) {
    console.warn('Apply zoom error:', e);
  }
}

/** 렌즈 프리셋 줌 전환 (0.5X, 1X, 2X) */
function setFastCameraZoom(targetZoom) {
  fastCameraCurrentZoom = targetZoom;

  var btn05 = document.getElementById('fc-lens-05');
  var btn1 = document.getElementById('fc-lens-1');
  var btn2 = document.getElementById('fc-lens-2');
  if (btn05) btn05.classList.toggle('active', targetZoom === 0.5);
  if (btn1) btn1.classList.toggle('active', targetZoom === 1);
  if (btn2) btn2.classList.toggle('active', targetZoom === 2);

  // 1) 0.5X (초광각) 선택 시
  if (targetZoom === 0.5) {
    // A. 현재 트랙에서 하드웨어 줌 0.5/0.6 지원 시 바로 적용
    if (fastCameraTrack && typeof fastCameraTrack.getCapabilities === 'function') {
      var caps = fastCameraTrack.getCapabilities();
      if (caps.zoom && caps.zoom.min <= 0.6) {
        applyFastCameraZoomValue(0.5);
        return;
      }
    }

    // B. 다중 렌즈 디바이스(초광각 카메라 센서)로 전환
    if (fastCameraUltraWideDeviceId && fastCameraCurrentDeviceId !== fastCameraUltraWideDeviceId) {
      switchFastCameraDevice(fastCameraUltraWideDeviceId, 0.5);
      return;
    }

    // C. 디바이스 목록 즉시 재검색 후 초광각 디바이스 전환 시도
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(function (devices) {
        var videoDevices = devices.filter(function (d) { return d.kind === 'videoinput'; });
        var backDevices = videoDevices.filter(function (d) {
          var lbl = (d.label || '').toLowerCase();
          return lbl.indexOf('front') === -1 && lbl.indexOf('selfie') === -1 && lbl.indexOf('전면') === -1;
        });
        if (backDevices.length >= 2) {
          var candidate = backDevices.find(function (d) {
            var lbl = (d.label || '').toLowerCase();
            return lbl.indexOf('ultra') !== -1 || lbl.indexOf('0.5') !== -1 || lbl.indexOf('wide') !== -1 ||
                   lbl.indexOf('camera2 2') !== -1 || lbl.indexOf('camera 2') !== -1;
          }) || backDevices[1];

          if (candidate && candidate.deviceId) {
            fastCameraUltraWideDeviceId = candidate.deviceId;
            switchFastCameraDevice(candidate.deviceId, 0.5);
            return;
          }
        }
        applyFastCameraZoomValue(1.0);
      }).catch(function () {
        applyFastCameraZoomValue(1.0);
      });
      return;
    }

    applyFastCameraZoomValue(1.0);
    return;
  }

  // 2) 1X (표준) 선택 시
  if (targetZoom === 1) {
    if (fastCameraCurrentDeviceId && fastCameraCurrentDeviceId === fastCameraUltraWideDeviceId) {
      switchFastCameraDevice(fastCameraMainDeviceId || null, 1.0);
      return;
    }
    applyFastCameraZoomValue(1.0);
    return;
  }

  // 3) 2X (망원) 선택 시
  if (targetZoom === 2) {
    if (fastCameraCurrentDeviceId && fastCameraCurrentDeviceId === fastCameraUltraWideDeviceId) {
      switchFastCameraDevice(fastCameraMainDeviceId || null, 2.0);
      return;
    }
    applyFastCameraZoomValue(2.0);
    return;
  }
}

/** 후면 광각/기본 카메라 디바이스 전환 */
function switchFastCameraDevice(deviceId, targetZoom) {
  fastCameraCurrentDeviceId = deviceId;
  if (fastCameraStream) {
    try {
      fastCameraStream.getTracks().forEach(function (t) { t.stop(); });
    } catch (e) {}
  }
  var constraints = {
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1920, max: 3840 }, height: { ideal: 1080, max: 2160 } }
      : { facingMode: { ideal: 'environment' }, width: { ideal: 1920, max: 3840 }, height: { ideal: 1080, max: 2160 } },
    audio: false
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    fastCameraStream = stream;
    fastCameraTrack = stream.getVideoTracks()[0];
    var video = document.getElementById('fast-camera-video');
    if (video) {
      video.srcObject = stream;
      video.play().catch(function () {});
    }
    setupFastCameraCapabilities(fastCameraTrack, targetZoom);
    if (targetZoom && targetZoom >= 1.0) {
      applyFastCameraZoomValue(targetZoom);
    }
  }).catch(function (e) {
    console.warn('Switch camera device failed:', e);
    if (deviceId) {
      switchFastCameraDevice(null, targetZoom || 1.0);
    }
  });
}

/** 화면 터치 시 초점 링 표시 및 초점 맞추기 */
function handleFastCameraTouchFocus(e) {
  var ring = document.getElementById('fc-focus-ring');
  var video = document.getElementById('fast-camera-video');
  if (!ring || !video) return;

  var clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
  var clientY = e.clientY != null ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
  if (clientX == null || clientY == null) return;

  ring.style.left = clientX + 'px';
  ring.style.top = clientY + 'px';
  ring.classList.add('active');
  setTimeout(function () {
    ring.classList.remove('active');
  }, 800);

  if (fastCameraTrack && typeof fastCameraTrack.getCapabilities === 'function') {
    var caps = fastCameraTrack.getCapabilities();
    if (caps.focusMode && caps.focusMode.indexOf('continuous') !== -1) {
      try {
        fastCameraTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
      } catch (err) {}
    }
  }
}

/** 플래시(토치) 토글 */
function toggleFastCameraTorch() {
  if (!fastCameraTrack || typeof fastCameraTrack.applyConstraints !== 'function') return;
  fastCameraIsTorchOn = !fastCameraIsTorchOn;
  try {
    fastCameraTrack.applyConstraints({ advanced: [{ torch: fastCameraIsTorchOn }] });
    var torchBtn = document.getElementById('fc-torch-btn');
    if (torchBtn) {
      torchBtn.style.color = fastCameraIsTorchOn ? '#f59e0b' : '#ffffff';
    }
  } catch (e) {
    console.warn('Torch constraint error:', e);
  }
}

/** 셔터 클릭: 실시간 비디오 프레임 즉시 캡처 및 후속 프로세스 자동 직행 */
function captureFastCamera() {
  var video = document.getElementById('fast-camera-video');
  var flash = document.getElementById('fc-flash-overlay');

  if (!video || !fastCameraStream) return;

  // 플래시 애니메이션
  if (flash) {
    flash.classList.add('active');
    setTimeout(function () { flash.classList.remove('active'); }, 150);
  }

  // 1MB / 500KB 해상도 및 압축품질 지정
  var targetSize = fastCameraSizeSetting || '1MB';
  var maxDim = (targetSize === '500KB') ? 1280 : 1920;
  var quality = (targetSize === '500KB') ? 0.78 : 0.85;

  var vw = video.videoWidth || 1920;
  var vh = video.videoHeight || 1080;

  var w = vw;
  var h = vh;
  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h / w) * maxDim);
      w = maxDim;
    } else {
      w = Math.round((w / h) * maxDim);
      h = maxDim;
    }
  }

  var canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);

  canvas.toBlob(function (blob) {
    if (!blob) {
      showToast('사진 캡처에 실패했습니다.');
      isCameraCapturing = false;
      return;
    }

    var fileName = 'PHOTO_' + Date.now() + '.jpg';
    var file = new File([blob], fileName, { type: 'image/jpeg' });

    var cb = fastCameraCallback;
    fastCameraCallback = null;

    closeFastCameraModal(false);

    if (typeof cb === 'function') {
      cb(file);
    }
  }, 'image/jpeg', quality);
}

/** 고속 즉시 촬영 모달 닫기 및 리소스 해제 */
function closeFastCameraModal(isCanceled) {
  var modal = document.getElementById('fast-camera-modal');
  if (modal) modal.classList.add('hidden');

  if (fastCameraStream) {
    try {
      fastCameraStream.getTracks().forEach(function (track) { track.stop(); });
    } catch (e) {}
    fastCameraStream = null;
    fastCameraTrack = null;
  }
  var video = document.getElementById('fast-camera-video');
  if (video) video.srcObject = null;
  fastCameraCurrentDeviceId = null;
  fastCameraIsTorchOn = false;
  fastCameraCurrentZoom = 1.0;
  if (isCanceled) {
    isCameraCapturing = false;
    if (isAddingSubPhoto) {
      isAddingSubPhoto = false;
      return;
    }
    pendingStreetlightItem = null;
    pendingStreetlightDxfCoords = null;
    pendingStreetlightLatLng = null;
    pendingFacilityType = null;
    pendingAddPosition = null;
  }
}

/** 고속 촬영 모달 이벤트 바인딩 */
function bindFastCameraEvents() {
  if (fastCameraEventsBound) return;
  fastCameraEventsBound = true;

  var sizeToggleBtn = document.getElementById('fc-size-toggle-btn');
  if (sizeToggleBtn) sizeToggleBtn.addEventListener('click', toggleFastCameraSize);
  updateFastCameraSizeUI();

  var closeBtn = document.getElementById('fc-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', function () { closeFastCameraModal(true); });

  var shutterBtn = document.getElementById('fc-shutter-btn');
  if (shutterBtn) shutterBtn.addEventListener('click', captureFastCamera);

  var torchBtn = document.getElementById('fc-torch-btn');
  if (torchBtn) torchBtn.addEventListener('click', toggleFastCameraTorch);

  var btn05 = document.getElementById('fc-lens-05');
  if (btn05) btn05.addEventListener('click', function () { setFastCameraZoom(0.5); });

  var btn1 = document.getElementById('fc-lens-1');
  if (btn1) btn1.addEventListener('click', function () { setFastCameraZoom(1); });

  var btn2 = document.getElementById('fc-lens-2');
  if (btn2) btn2.addEventListener('click', function () { setFastCameraZoom(2); });

  var video = document.getElementById('fast-camera-video');
  if (video) {
    video.addEventListener('click', handleFastCameraTouchFocus);

    // 핀치 투 줌 (터치 두 손가락 확대/축소)
    var initialPinchDist = 0;
    var initialPinchZoom = 1.0;
    video.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialPinchZoom = fastCameraCurrentZoom || 1.0;
      }
    }, { passive: true });

    video.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length === 2 && initialPinchDist > 0) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.hypot(dx, dy);
        var scale = dist / initialPinchDist;
        applyFastCameraZoomValue(initialPinchZoom * scale);
      }
    }, { passive: true });

    video.addEventListener('touchend', function (e) {
      if (!e.touches || e.touches.length < 2) {
        initialPinchDist = 0;
      }
    }, { passive: true });
  }
}

function bindContextMenu() {
  if (!contextMenuEl) return;
  document.getElementById('camera-btn').addEventListener('click', function () {
    contextMenuEl.classList.remove('active');
    triggerCameraCapture();
  });
  document.getElementById('text-btn').addEventListener('click', function () {
    contextMenuEl.classList.remove('active');
    pendingAddPosition && showTextModal(null);
  });
  var camInput = getEl('camera-input');
  if (camInput) {
    camInput.addEventListener('change', function (e) {
      var file = e.target && e.target.files[0];
      if (file) {
        handleCapturedPhoto(file);
      } else {
        isCameraCapturing = false;
      }
      e.target.value = '';
    });
    camInput.addEventListener('cancel', function () {
      isCameraCapturing = false;
    });
  }
}

function compressImage(file, targetSize) {
  return new Promise(function (resolve, reject) {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      compressImageFallback(file, targetSize).then(resolve).catch(reject);
      return;
    }

    var worker = new Worker('dxf-worker.js');
    worker.onmessage = function (e) {
      if (e.data.error) {
        console.warn('워커 이미지 압축 실패, 메인 스레드 폴백 실행:', e.data.error);
        compressImageFallback(file, targetSize).then(resolve).catch(reject);
      } else if (e.data.type === 'compress_image_success') {
        resolve(e.data.blob);
      }
      worker.terminate();
    };
    worker.onerror = function (err) {
      console.warn('워커 에러 발생, 메인 스레드 폴백 실행:', err);
      compressImageFallback(file, targetSize).then(resolve).catch(reject);
      worker.terminate();
    };
    worker.postMessage({ type: 'compress_image', file: file, targetSize: targetSize });
  });
}

function compressImageFallback(file, targetSize) {
  // createImageBitmap 지원 시 직접 사용 (메모리 효율), 미지원 시 Image+FileReader 폴백
  var bitmapPromise;
  if (typeof createImageBitmap === 'function') {
    bitmapPromise = createImageBitmap(file);
  } else {
    bitmapPromise = new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('이미지 로드 실패')); };
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return bitmapPromise.then(function (bitmap) {
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
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
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

    // canvas.toBlob: 비동기 네이티브 Blob 생성 (toDataURL 대비 메모리 33% 절감, CPU 비차단)
    function toBlob(q) {
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', q);
      });
    }

    var cleanedUp = false;
    function cleanup() {
      if (cleanedUp) return;
      cleanedUp = true;
      if (bitmap && bitmap.close) bitmap.close(); // ImageBitmap만 close 가능
      ctx = null;
      if (canvas) { canvas.width = 0; canvas.height = 0; }
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
            // 압축 결과가 목표보다 많이 작으면 해상도 업스케일
            var scaleFactor = Math.sqrt(targetSize / compressedBlob.size) * 1.05;
            var nw = Math.floor(w * scaleFactor);
            var nh = Math.floor(h * scaleFactor);
            canvas.width = nw;
            canvas.height = nh;
            ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, nw, nh);
            ctx.drawImage(bitmap, 0, 0, nw, nh);
            var nq = Math.pow(adjustedTarget / (nw * nh * 0.25), 1 / 1.6);
            nq = Math.max(0.4, Math.min(0.9, nq));
            return toBlob(nq).then(function (upscaledBlob) {
              cleanup();
              return upscaledBlob;
            });
          }
          cleanup();
          return Promise.resolve(compressedBlob);
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

function addPhotoAtPosition(xy, file) {
  if (!dxfFileFullName || !window.localStore) return;
  var targetSize = getImageTargetSize();
  var nextPhotoNum = getNextPhotoNumber();

  function finish(blob) {
    pendingFacilitySurvey = {
      isNew: true,
      x: xy.x,
      y: xy.y,
      suggestedNum: nextPhotoNum,
      subPhotos: [
        { subIndex: 0, blob: blob, file: file }
      ]
    };
    pendingAddPosition = null;
    isNewPhotoPending = true;
    showToast('사진이 촬영되었습니다. 제원을 입력 후 [저장]을 눌러주세요.');
    showPhotoModal(null);
  }

  if (targetSize != null) {
    compressImage(file, targetSize).then(finish).catch(function () {
      finish(file); // File은 Blob을 상속하므로 직접 저장 가능
    });
  } else {
    finish(file); // 원본 모드: File(Blob)을 변환 없이 직접 저장
  }
}

function addTextAtPosition(xy, textStr) {
  if (!dxfFileFullName || !window.localStore) return;
  var id = 'text-' + Date.now();
  var t = { id: id, x: xy.x, y: xy.y, text: textStr || '', fontSize: 14 };
  texts.push(t);
  window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() }).then(function () {
    saveMetadataToLocalFs();
    drawTextMarkers();
    pendingAddPosition = null;
    showToast('텍스트가 추가되었습니다.');
  }).catch(function (err) {
    console.error('텍스트 저장 실패:', err);
    alert('데이터 저장소에 기록하는 도중 오류가 발생해 텍스트를 저장하지 못했습니다.');
  });
}

function deserializeSpecText(specText, config) {
  var values = {};
  if (!specText || !config) return values;

  var parts = specText.split('/');
  var prefix = (config.prefix !== undefined) ? config.prefix : config.title;
  if (prefix && parts[0] === prefix) {
    parts.shift(); // 접두어 제거
  }

  if (config.title === '신호등') {
    // parts[0]: 종류 (차량, 보행)
    // parts[1]: 형식*수량 (횡4*2)
    // parts[2]: 지주형식 (측주, 단주 등)
    // parts[3]: 보행등구분*수량 (보행등*1) - 종류가 보행일 때만 존재 가능
    values['type'] = parts[0] || '차량';
    
    var styleAndCount = parts[1] || '';
    var scParts = styleAndCount.split('*');
    values['style'] = scParts[0] || '횡4';
    values['count'] = scParts[1] || '1';
    
    values['support'] = parts[2] || '측주';
    
    var pedInfo = parts[3] || '';
    if (pedInfo) {
      if (pedInfo === '보행등무') {
        values['pedestrianType'] = '보행등무';
        values['pedestrianCount'] = '';
      } else {
        var pedParts = pedInfo.split('*');
        values['pedestrianType'] = pedParts[0] || '보행등무';
        values['pedestrianCount'] = pedParts[1] || '0';
      }
    } else {
      values['pedestrianType'] = '보행등무';
      values['pedestrianCount'] = '';
    }
  } else if (config.joinFormat === 'dimension/type/wing/sump') {
    var dim = parts[0] || '';
    var dimParts = dim.split('*');
    values['width'] = dimParts[0] || '';
    values['height'] = dimParts[1] || '';
    values['type'] = parts[1] || '';
    config.fields.forEach(function (field) {
      if (field.id === 'wing') values['wing'] = parts[2] || '';
      if (field.id === 'traffic') values['traffic'] = parts[2] || '';
      if (field.id === 'material') values['material'] = parts[2] || '';
      if (field.id === 'sump') values['sump'] = parts[3] || '';
    });
  } else if (config.joinFormat === 'bridgeName/material/dimension') {
    values['bridgeName'] = parts[0] || '';
    values['material'] = parts[1] || '';
    var dim = parts[2] || '';
    var dimParts = dim.split('*');
    values['width'] = dimParts[0] || '';
    values['height'] = dimParts[1] || '';
  } else if (config.joinFormat === 'type/dimension') {
    values['type'] = parts[0] || '';
    var dim = parts[1] || '';
    var dimParts = dim.split('*');
    values['width'] = dimParts[0] || '';
    values['height'] = dimParts[1] || '';
  } else if (config.title === '도로표지') {
    values['direction'] = parts[0] || '방향';
    if (values['direction'] === '안내') {
      if (parts.length >= 3) {
        values['content'] = parts[1] || '';
        values['support'] = parts[2] || '단주';
      } else {
        values['content'] = '';
        values['support'] = parts[1] || '단주';
      }
    } else {
      values['content'] = '';
      values['support'] = parts[1] || '단주';
    }
  } else if (config.title === '배수관') {
    values['spec'] = parts[0] || '';
    values['type'] = parts[1] || '';
    if (parts.length === 4) {
      values['length'] = '';
      values['wing'] = parts[2] || '';
      values['sump'] = parts[3] || '';
    } else {
      values['length'] = parts[2] || '';
      values['wing'] = parts[3] || '';
      values['sump'] = parts[4] || '';
    }
  } else if (config.title === '가로등' || config.title === '보안등') {
    values['type1'] = parts[0] || '';
    values['type2'] = parts[1] || '';
    if (parts.length === 3) {
      values['lightSource'] = 'LED';
      values['type3'] = parts[2] || '';
    } else {
      values['lightSource'] = parts[2] || '';
      values['type3'] = parts[3] || '';
    }
  } else {
    // [0925_01 혁신] 지능형 옵션 필드 역파서: 생략된 옵션(--)이 있을 때 뒤 필드가 당겨져 들어가는 현상 원천 차단
    var pIdx = 0;
    var targetFields = (config.fields || []).filter(function (f) { return f.id !== 'name'; });
    
    // 기본적으로 빈칸('')으로 초기화
    targetFields.forEach(function (f) {
      values[f.id] = '';
    });

    targetFields.forEach(function (field, fIdx) {
      if (pIdx >= parts.length) return;
      var curPart = parts[pIdx];

      var matchesField = false;
      if (field.options && field.options.length > 0) {
        matchesField = (field.options.indexOf(curPart) !== -1);
      } else {
        matchesField = true;
      }

      // 현재 part가 이 필드와 맞지 않고, 뒤에 오는 다른 필드의 선택지와 맞다면 이 필드는 생략된 것으로 판단
      if (!matchesField) {
        var laterFieldMatches = false;
        for (var k = fIdx + 1; k < targetFields.length; k++) {
          var laterF = targetFields[k];
          if (laterF.options && laterF.options.indexOf(curPart) !== -1) {
            laterFieldMatches = true;
            break;
          }
        }
        if (laterFieldMatches) {
          // 현재 필드는 사용자가 생략한 것이므로 건너뛰고 빈칸('') 유지
          return;
        }
      }

      values[field.id] = curPart;
      pIdx++;
    });

    if (config.fields) {
      config.fields.forEach(function (f) {
        if (f.id === 'name') values['name'] = config.title;
      });
    }
  }

  return values;
}

/** 사진 모달 내 서브사진 썸네일 바 렌더링 (메모리 버퍼 및 디스크 사진 통합) */
function renderPhotoModalThumbnails() {
  var thumbContainer = getEl('photo-modal-thumbnails');
  var img = getEl('photo-modal-img');
  if (!thumbContainer) return;
  thumbContainer.innerHTML = '';

  subPhotoObjectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
  subPhotoObjectUrls = [];

  var allItems = [];
  var isNewSurvey = (pendingFacilitySurvey && pendingFacilitySurvey.isNew);

  if (isNewSurvey) {
    allItems = (pendingFacilitySurvey.subPhotos || []).map(function (sp, idx) {
      return {
        subIndex: idx,
        blob: sp.blob,
        file: sp.file,
        fileName: sp.fileName || ''
      };
    });
  } else if (editingPhotoId) {
    var p = photos.filter(function (x) { return x.id === editingPhotoId; })[0];
    if (p) {
      var existingSubs = (p.subPhotos && p.subPhotos.length > 0)
        ? p.subPhotos
        : [{ subIndex: 0, fileName: p.fileName, blob: p.blob }];
      existingSubs.forEach(function (sp, idx) {
        allItems.push({
          subIndex: idx,
          blob: sp.blob,
          fileName: sp.fileName
        });
      });
    }
    if (pendingFacilitySurvey && pendingFacilitySurvey.newSubPhotos && pendingFacilitySurvey.newSubPhotos.length > 0) {
      pendingFacilitySurvey.newSubPhotos.forEach(function (sp) {
        allItems.push({
          subIndex: allItems.length,
          blob: sp.blob,
          fileName: '',
          isNewInMemory: true
        });
      });
    }
  }

  if (allItems.length <= 1) {
    return;
  }

  var targetDrawing = dxfFileFullName;

  allItems.forEach(function (sp, idx) {
    var thumbDiv = document.createElement('div');
    thumbDiv.className = 'photo-thumb-item' + (idx === 0 ? ' active' : '');
    var thumbImg = document.createElement('img');

    var targetBlob = sp.blob || (sp.fileName && window._photoBlobCache ? window._photoBlobCache[sp.fileName] : null);
    if (targetBlob) {
      var objUrl = URL.createObjectURL(targetBlob);
      subPhotoObjectUrls.push(objUrl);
      thumbImg.src = objUrl;
    } else if (sp.fileName && window.localFs && window.localFs.isSupported()) {
      thumbImg.alt = '로딩 중...';
      window.localFs.getPhotoBlob(targetDrawing, sp.fileName).then(function (b) {
        if (b) {
          sp.blob = b;
          if (window._photoBlobCache) window._photoBlobCache[sp.fileName] = b;
          var objUrl = URL.createObjectURL(b);
          subPhotoObjectUrls.push(objUrl);
          thumbImg.src = objUrl;
        } else {
          thumbImg.alt = '사진 ' + (idx + 1);
        }
      }).catch(function () {
        thumbImg.alt = '사진 ' + (idx + 1);
      });
    } else {
      thumbImg.alt = '사진 ' + (idx + 1);
    }

    thumbDiv.appendChild(thumbImg);
    var indexLabel = document.createElement('span');
    indexLabel.className = 'thumb-index';
    indexLabel.textContent = String(idx + 1);
    thumbDiv.appendChild(indexLabel);

    thumbDiv.addEventListener('click', function (e) {
      e.stopPropagation();
      thumbContainer.querySelectorAll('.photo-thumb-item').forEach(function (t, i) {
        t.classList.toggle('active', i === idx);
      });
      var clickBlob = sp.blob || (window._photoBlobCache && sp.fileName ? window._photoBlobCache[sp.fileName] : null);
      if (clickBlob && img) {
        if (dxfImageObjectUrl) URL.revokeObjectURL(dxfImageObjectUrl);
        dxfImageObjectUrl = URL.createObjectURL(clickBlob);
        img.src = dxfImageObjectUrl;
        img.onclick = function () {
          openImageViewer(allItems, idx);
        };
      } else if (sp.fileName && window.localFs && window.localFs.isSupported()) {
        window.localFs.getPhotoBlob(targetDrawing, sp.fileName).then(function (b) {
          if (b && img) {
            sp.blob = b;
            if (window._photoBlobCache) window._photoBlobCache[sp.fileName] = b;
            if (dxfImageObjectUrl) URL.revokeObjectURL(dxfImageObjectUrl);
            dxfImageObjectUrl = URL.createObjectURL(b);
            img.src = dxfImageObjectUrl;
            img.onclick = function () {
              openImageViewer(allItems, idx);
            };
          }
        });
      }
    });

    thumbContainer.appendChild(thumbDiv);
  });
}

/** 신규 시설물 조사 모달 내 추가사진 등록 (메모리 버퍼링) */
function addSubPhotoToPendingNewSurvey(file) {
  if (!pendingFacilitySurvey || !pendingFacilitySurvey.isNew) return;
  var targetSize = getImageTargetSize();
  var nextIdx = pendingFacilitySurvey.subPhotos.length;

  var subItem = {
    subIndex: nextIdx,
    blob: file,
    file: file
  };
  pendingFacilitySurvey.subPhotos.push(subItem);

  if (targetSize != null) {
    compressImage(file, targetSize).then(function (compressedBlob) {
      subItem.blob = compressedBlob;
      renderPhotoModalThumbnails();
    }).catch(function () {
      renderPhotoModalThumbnails();
    });
  }

  isAddingSubPhoto = false;
  showToast('추가 사진이 등록되었습니다. (총 ' + pendingFacilitySurvey.subPhotos.length + '장)');
  renderPhotoModalThumbnails();
}

function showPhotoModal(photoId) {
  clearDomCache();
  editingDxfImageRef = null;

  var isNewSurvey = (!photoId && pendingFacilitySurvey && pendingFacilitySurvey.isNew);
  var isSamePhoto = (!isNewSurvey && editingPhotoId === photoId && photoId != null);
  if (!isSamePhoto) {
    if (dxfImageObjectUrl) {
      URL.revokeObjectURL(dxfImageObjectUrl);
      dxfImageObjectUrl = null;
    }
  }

  editingPhotoId = isNewSurvey ? null : photoId;
  var modal = getEl('photo-modal');
  var img = getEl('photo-modal-img');
  var memoInput = getEl('photo-modal-memo');
  var titleEl = document.getElementById('photo-modal-title');
  var actionsEl = document.getElementById('photo-modal-actions');
  var noFileEl = document.getElementById('photo-modal-no-file');
  var delBtn = document.getElementById('photo-modal-delete');
  var addBtn = getEl('photo-modal-add-btn');
  var thumbContainer = getEl('photo-modal-thumbnails');

  if (!modal || !img || !memoInput) return;

  var p = null;
  if (!isNewSurvey) {
    p = photos.filter(function (x) { return x.id === photoId; })[0];
    if (!p) { modal.classList.remove('active'); return; }
    pendingFacilitySurvey = {
      isNew: false,
      facilityId: photoId,
      newSubPhotos: []
    };
  }

  if (titleEl) titleEl.textContent = isNewSurvey ? '시설물 및 사진 신규 등록' : '사진 및 제원';
  if (actionsEl) actionsEl.style.display = 'flex';
  if (noFileEl) noFileEl.style.display = 'none';
  if (addBtn) addBtn.style.display = 'inline-block';
  if (delBtn) delBtn.style.display = isNewSurvey ? 'none' : 'inline-block';

  memoInput.style.display = 'block';
  memoInput.value = (p && p.memo && !isAutoGeneratedMemo(p.memo)) ? p.memo : '';

  img.style.display = 'block';
  subPhotoObjectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
  subPhotoObjectUrls = [];
  isAddingSubPhoto = false;

  if (thumbContainer) {
    thumbContainer.innerHTML = '';
  }
  img.onclick = null;

  if (!isSamePhoto) {
    img.src = '';
  }

  var dynamicFieldsContainer = document.getElementById('photo-modal-dynamic-fields');
  if (dynamicFieldsContainer) {
    dynamicFieldsContainer.innerHTML = '';
    dynamicFieldsContainer.style.display = 'flex';
    dynamicFieldsContainer.style.flexDirection = 'column';
    dynamicFieldsContainer.style.gap = '8px';

    var numTextVal = '';
    if (isNewSurvey) {
      numTextVal = pendingFacilitySurvey.suggestedNum || getNextPhotoNumber();
    } else if (p && p.numTextId) {
      var numTextObj = texts.filter(function (t) { return t.id === p.numTextId; })[0];
      numTextVal = numTextObj ? numTextObj.text : '';
    }

    // 1. 공통 사진번호 필드 추가
    var numGroup = document.createElement('div');
    numGroup.className = 'form-group';
    numGroup.innerHTML =
      '<label>사진 번호 (직접 입력/수정 가능)</label>' +
      '<input type="text" id="pm-form-num" value="' + numTextVal + '" placeholder="예: 100">';
    dynamicFieldsContainer.appendChild(numGroup);

    var numInput = numGroup.querySelector('input');
    if (numInput) {
      numInput.addEventListener('focus', function () {
        this.select();
      });
    }

    // 도면 수정 제원 일괄 미리보기 필드
    var previewGroup = document.createElement('div');
    previewGroup.className = 'form-group sticky-preview-box';
    previewGroup.innerHTML =
      '<label style="color:#5856D6; font-size:12px; font-weight:bold; margin-bottom:4px; display:block;">도면 수정 제원 일괄 미리보기</label>' +
      '<div id="pm-spec-preview" style="font-size:13px; font-weight:500; color:#1C1C1E; word-break:break-all; min-height:18px; white-space:pre-line; line-height:1.4;"></div>';
    dynamicFieldsContainer.appendChild(previewGroup);

    // 폼 카드를 담을 리스트 컨테이너
    var pmFormListContainer = document.createElement('div');
    pmFormListContainer.id = 'pm-dynamic-form-list';
    pmFormListContainer.style.display = 'flex';
    pmFormListContainer.style.flexDirection = 'column';
    pmFormListContainer.style.gap = '15px';
    dynamicFieldsContainer.appendChild(pmFormListContainer);

    window.updateAllPreviewsPM = function () {
      var previewEl = document.getElementById('pm-spec-preview');
      if (!previewEl) return;
      var cards = pmFormListContainer.querySelectorAll('.attr-card');
      var previews = [];
      cards.forEach(function (card) {
        var type = card.getAttribute('data-type');
        var prefixIdUnique = card.getAttribute('data-prefix-id');
        var config = FACILITY_CONFIG[type] || { title: type, fields: [] };
        var formBody = card.querySelector('.attr-card-body') || card.querySelectorAll('div')[1] || card;
        var result = serializeFacilityForm(formBody, config, prefixIdUnique);
        if (result && result.specText) {
          previews.push(result.specText);
        }
      });

      var memoVal = memoInput ? memoInput.value.trim() : '';
      var htmlContent = '';
      if (previews.length > 0) {
        htmlContent = previews.map(function(pText) {
          return '<div>' + escapeHtml(pText) + '</div>';
        }).join('');
      } else {
        htmlContent = '<div style="color: #8E8E93;">추가된 속성이 없습니다.</div>';
      }

      if (memoVal !== '' && memoVal !== '선택' && !isAutoGeneratedMemo(memoVal)) {
        htmlContent += '<div style="color: #008000; font-weight: bold; margin-top: 6px;">[메모] ' + escapeHtml(memoVal) + '</div>';
      }

      previewEl.innerHTML = htmlContent;
    };

    // 2. 기존 사진에 저장되어 있던 기존 제원 복원 렌더링
    if (!isNewSurvey && p) {
      var textIds = p.specTextIds || [];
      if (textIds.length === 0 && p.specTextId) {
        textIds = [p.specTextId];
      }

      textIds.forEach(function (tId, idx) {
        var specTextObj = texts.filter(function (t) { return t.id === tId; })[0];
        if (specTextObj) {
          var fType = detectFacilityType('', specTextObj.layer);
          if (!fType) {
            var parts = (specTextObj.text || '').split('/');
            if (parts.length > 0 && FACILITY_CONFIG[parts[0]]) {
              fType = parts[0];
            } else {
              fType = p.facilityType || '일반시설물';
            }
          }

          var config = FACILITY_CONFIG[fType] || { title: fType, fields: [] };
          var parsedValues = specTextObj.specValues || (p.specValuesList && p.specValuesList[idx]) || deserializeSpecText(specTextObj.text, config);
          var uniquePrefix = 'pm-old-' + idx + '-' + Date.now();
          renderMultiAttributeCard(pmFormListContainer, fType, parsedValues, uniquePrefix);
        }
      });
    }

    // 구분선 삽입 (속성 추가 선택기 위)
    var pmAddDivider = document.createElement('div');
    pmAddDivider.style.borderTop = '1.5px solid #8E8E93';
    pmAddDivider.style.marginTop = '15px';
    dynamicFieldsContainer.appendChild(pmAddDivider);

    // 3. 편집 모달 내 [속성 추가 선택기]
    var addSelectorGroup = document.createElement('div');
    addSelectorGroup.className = 'form-group';
    addSelectorGroup.style.marginTop = '15px';
    addSelectorGroup.innerHTML = '<label>➕ 속성 추가 입력</label>';

    var addSelect = document.createElement('select');
    addSelect.id = 'pm-attribute-adder';
    var addOpts = getAttributeAdderOptions(false);
    addOpts.forEach(function (opt) {
      var disabled = opt.indexOf('--') === 0 ? ' disabled selected' : '';
      addSelect.innerHTML += '<option value="' + opt + '"' + disabled + '>' + opt + '</option>';
    });
    addSelectorGroup.appendChild(addSelect);
    dynamicFieldsContainer.appendChild(addSelectorGroup);

    addSelect.addEventListener('change', function () {
      var selectedType = this.value;
      if (!selectedType || selectedType.indexOf('--') === 0) return;

      var cards = pmFormListContainer.querySelectorAll('.attr-card');
      var isDuplicate = false;
      cards.forEach(function (c) {
        if (c.getAttribute('data-type') === selectedType) isDuplicate = true;
      });

      if (isDuplicate && !confirm(selectedType + ' 속성이 이미 추가되어 있습니다. 중복해서 추가하시겠습니까?')) {
        this.value = addOpts[0];
        return;
      }

      var uniquePrefix = 'pm-new-' + Date.now();
      var cardCached = lastSpecs[selectedType] || {};
      renderMultiAttributeCard(pmFormListContainer, selectedType, cardCached, uniquePrefix);

      var inputsAndSelects = pmFormListContainer.querySelectorAll('input, select');
      inputsAndSelects.forEach(function (el) {
        el.addEventListener('input', window.updateAllPreviewsPM);
        el.addEventListener('change', window.updateAllPreviewsPM);
      });

      window.updateAllPreviewsPM();
      this.value = addOpts[0];
    });

    var inputsAndSelects = pmFormListContainer.querySelectorAll('input, select');
    inputsAndSelects.forEach(function (el) {
      el.addEventListener('input', window.updateAllPreviewsPM);
      el.addEventListener('change', window.updateAllPreviewsPM);
    });
    window.updateAllPreviewsPM();
  }

  // 신규 조사 모드인 경우: 메모리 버퍼의 첫 번째 사진을 즉각 메인으로 표시
  if (isNewSurvey) {
    var firstBlob = pendingFacilitySurvey.subPhotos && pendingFacilitySurvey.subPhotos[0] && pendingFacilitySurvey.subPhotos[0].blob;
    if (firstBlob) {
      if (dxfImageObjectUrl) URL.revokeObjectURL(dxfImageObjectUrl);
      dxfImageObjectUrl = URL.createObjectURL(firstBlob);
      img.src = dxfImageObjectUrl;
      img.style.display = 'block';
    }
    img.onclick = function () {
      var subs = pendingFacilitySurvey.subPhotos || [];
      if (subs.length > 0) {
        openImageViewer(subs, 0);
      }
    };
    renderPhotoModalThumbnails();
    modal.classList.add('active');
    return;
  }

  // 기존 사진 조회/편집 모드: DB 및 로컬 파일시스템에서 안전하게 로드
  window.localStore.getPhotoById(photoId).then(async function (record) {
    if (editingPhotoId !== photoId) return;
    if (!record) record = p;
    if (!record) return;

    var targetDrawing = (record && record.dxfFile) || dxfFileFullName;

    if (!record.subPhotos || record.subPhotos.length === 0) {
      if (p && p.subPhotos && p.subPhotos.length > 0) {
        record.subPhotos = p.subPhotos;
      } else if (record.subPhotoFiles && record.subPhotoFiles.length > 0) {
        record.subPhotos = record.subPhotoFiles.map(function (fn, sIdx) {
          return { subIndex: sIdx, fileName: fn };
        });
      } else {
        var numTextObj = (p && p.numTextId) ? texts.filter(function (t) { return t.id === p.numTextId; })[0] : null;
        var numVal = numTextObj ? numTextObj.text : '';
        var baseFile = record.fileName || (p && p.fileName) || (numVal ? generatePhotoFileName(numVal) : '');
        var baseBlob = record.blob || (p && p.blob) || (baseFile && window._photoBlobCache ? window._photoBlobCache[baseFile] : null);
        record.subPhotos = [{ subIndex: 0, fileName: baseFile, blob: baseBlob }];
      }
    }

    var fileNamesRestored = false;
    if (record.subPhotos && record.subPhotos.length > 0) {
      for (var si = 0; si < record.subPhotos.length; si++) {
        var spObj = record.subPhotos[si];
        if (spObj.blob) continue;
        if (spObj.fileName && window._photoBlobCache && window._photoBlobCache[spObj.fileName]) {
          spObj.blob = window._photoBlobCache[spObj.fileName];
          continue;
        }
        if (spObj.fileName && window.localFs && window.localFs.isSupported()) {
          try {
            var b = await window.localFs.getPhotoBlob(targetDrawing, spObj.fileName);
            if (b) {
              spObj.blob = b;
              if (b.actualFileName && b.actualFileName !== spObj.fileName) {
                var oldFn = spObj.fileName;
                spObj.fileName = b.actualFileName;
                fileNamesRestored = true;
                if (si === 0) {
                  record.fileName = b.actualFileName;
                  if (p) p.fileName = b.actualFileName;
                }
                if (window._photoBlobCache) {
                  window._photoBlobCache[b.actualFileName] = b;
                  window._photoBlobCache[oldFn] = b;
                }
              } else if (window._photoBlobCache) {
                window._photoBlobCache[spObj.fileName] = b;
              }
            }
          } catch (e) {
            console.warn('[showPhotoModal] 서브사진 파일 읽기 예외:', spObj.fileName, e);
          }
        }
      }
    }

    if (fileNamesRestored) {
      window.localStore.savePhoto(targetDrawing, record).catch(function () {});
      saveMetadataToLocalFs();
    }

    if (!record.blob && record.subPhotos && record.subPhotos.length > 0 && record.subPhotos[0].blob) {
      record.blob = record.subPhotos[0].blob;
    }
    if (p) {
      p.subPhotos = record.subPhotos;
      if (record.blob) p.blob = record.blob;
    }

    if (editingPhotoId !== photoId) return;

    if (record.blob) {
      if (!isSamePhoto || !img.src) {
        if (dxfImageObjectUrl) URL.revokeObjectURL(dxfImageObjectUrl);
        dxfImageObjectUrl = URL.createObjectURL(record.blob);
        img.src = dxfImageObjectUrl;
      }
      img.style.display = 'block';
      if (noFileEl) noFileEl.style.display = 'none';
    } else {
      if (!img.src) {
        img.style.display = 'none';
        if (noFileEl) {
          noFileEl.textContent = '사진 파일을 불러오는 중이거나 찾을 수 없습니다.';
          noFileEl.style.display = 'block';
        }
      }
    }

    img.onclick = function () {
      var allItems = (p && p.subPhotos) ? p.subPhotos : (record.subPhotos || []);
      if (allItems.length > 0) {
        openImageViewer(allItems, 0);
      } else if (record.blob) {
        openImageViewer([{ blob: record.blob, fileName: record.fileName }], 0);
      }
    };

    renderPhotoModalThumbnails();
  }).catch(function (err) {
    console.warn('사진 모달 이미지 비동기 로딩 실패:', err);
  });

  modal.classList.add('active');
}

function showDxfImageModal(ref) {
  editingPhotoId = null;
  editingDxfImageRef = ref;
  var modal = getEl('photo-modal');
  var img = getEl('photo-modal-img');
  var memo = getEl('photo-modal-memo');
  var titleEl = document.getElementById('photo-modal-title');
  var actionsEl = document.getElementById('photo-modal-actions');
  var noFileEl = document.getElementById('photo-modal-no-file');
  if (!modal || !img) return;
  if (titleEl) titleEl.textContent = '참조 이미지';
  if (actionsEl) actionsEl.style.display = 'none';
  var addBtn = getEl('photo-modal-add-btn');
  if (addBtn) addBtn.style.display = 'none';
  var thumbContainer = getEl('photo-modal-thumbnails');
  if (thumbContainer) thumbContainer.innerHTML = '';
  img.onclick = null;
  memo.style.display = 'none';
  if (ref.file) {
    if (dxfImageObjectUrl) URL.revokeObjectURL(dxfImageObjectUrl);
    dxfImageObjectUrl = URL.createObjectURL(ref.file);
    img.src = dxfImageObjectUrl;
    img.style.display = 'block';
    if (noFileEl) noFileEl.style.display = 'none';
  } else {
    if (dxfImageObjectUrl) { URL.revokeObjectURL(dxfImageObjectUrl); dxfImageObjectUrl = null; }
    img.src = '';
    img.style.display = 'none';
    if (noFileEl) {
      noFileEl.textContent = '이미지 파일을 찾을 수 없습니다. DXF와 같은 폴더를 선택하세요.';
      noFileEl.style.display = 'block';
    }
  }
  modal.classList.add('active');
}

function rollbackPendingPhoto() {
  if (isNewPhotoPending) {
    pendingFacilitySurvey = null;
    isNewPhotoPending = false;
    showToast('사진 등록이 취소되었습니다.');
  }
}

function hidePhotoModal() {
  clearDomCache();
  if (isNewPhotoPending) {
    pendingFacilitySurvey = null;
    isNewPhotoPending = false;
    showToast('사진 등록이 취소되었습니다.');
  }
  var modal = getEl('photo-modal');
  var img = getEl('photo-modal-img');
  if (modal) modal.classList.remove('active');
  if (img) { img.src = ''; img.onclick = null; }
  editingPhotoId = null;
  editingDxfImageRef = null;
  isAddingSubPhoto = false;
  pendingFacilitySurvey = null;
  // subPhoto object URL 정리
  subPhotoObjectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
  subPhotoObjectUrls = [];
  var addBtn = getEl('photo-modal-add-btn');
  if (addBtn) addBtn.style.display = 'none';
  var thumbContainer = getEl('photo-modal-thumbnails');
  if (thumbContainer) thumbContainer.innerHTML = '';
  if (dxfImageObjectUrl) {
    URL.revokeObjectURL(dxfImageObjectUrl);
    dxfImageObjectUrl = null;
  }
}

function bindPhotoModal() {
  var modal = getEl('photo-modal');
  var closeBtn = document.getElementById('photo-modal-close');
  var saveBtn = document.getElementById('photo-modal-save');
  var delBtn = document.getElementById('photo-modal-delete');
  var memoInput = getEl('photo-modal-memo');
  var memoBtn = document.getElementById('photo-modal-memo-btn');
  var addBtn = getEl('photo-modal-add-btn');

  if (memoBtn && memoInput) {
    memoBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var suggestions = getPhotoMemoSuggestions();
      openSuggestionPickerModal('photo-modal-memo', '사진메모', suggestions, 'common_photo_memo', function (chosenVal) {
        if (typeof window.updateAllPreviewsPM === 'function') window.updateAllPreviewsPM();
      });
    });
  }

  if (memoInput) {
    memoInput.addEventListener('input', function () {
      if (typeof window.updateAllPreviewsPM === 'function') window.updateAllPreviewsPM();
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      var isNewSurvey = (pendingFacilitySurvey && pendingFacilitySurvey.isNew);
      if (!editingPhotoId && !isNewSurvey) return;
      isAddingSubPhoto = true;
      triggerCameraCapture();
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', hidePhotoModal);
  if (saveBtn) saveBtn.addEventListener('click', async function () {
    if (!window.localStore || !dxfFileFullName) return;
    var isNewSurvey = (pendingFacilitySurvey && pendingFacilitySurvey.isNew);
    if (!isNewSurvey && !editingPhotoId) return;
    var p = isNewSurvey ? null : photos.filter(function (x) { return x.id === editingPhotoId; })[0];
    if (!isNewSurvey && !p) return;

    var memoVal = memoInput ? memoInput.value.trim() : '';
    var cleanMemo = (memoVal === '--' || memoVal === '선택' || memoVal === '') ? '' : memoVal;
    if (cleanMemo && !isAutoGeneratedMemo(cleanMemo)) {
      saveFieldCustomSuggestion('common_photo_memo', cleanMemo);
    }

    var newNum = '';
    var pmNumInput = document.getElementById('pm-form-num');
    if (pmNumInput) {
      newNum = pmNumInput.value.trim();
    }
    if (!newNum) {
      newNum = getNextPhotoNumber();
    }

    // 중복 및 누락 감지 경고 로직 적용
    if (!validatePhotoNumber(newNum, isNewSurvey ? null : editingPhotoId)) {
      return;
    }

    // 1. 모달창 내에 렌더링된 모든 속성 카드들 수집 및 직렬화
    var container = document.getElementById('pm-dynamic-form-list');
    var attributeDataList = [];
    var serializeSuccess = true;

    if (container) {
      var cards = container.querySelectorAll('.attr-card');
      cards.forEach(function (card) {
        var type = card.getAttribute('data-type');
        var prefixIdUnique = card.getAttribute('data-prefix-id');
        var config = FACILITY_CONFIG[type];
        if (!config) return;
        var formBody = card.querySelector('.attr-card-body') || card.querySelectorAll('div')[1] || card;
        var result = serializeFacilityForm(formBody, config, prefixIdUnique);
        if (!result) {
          serializeSuccess = false;
          return;
        }

        attributeDataList.push({
          type: type,
          layer: result.layer,
          specText: result.specText,
          values: result.values
        });

        if (result.values) {
          for (var fId in result.values) {
            saveFieldCustomSuggestion((config.title || config.layer) + '_' + fId, result.values[fId]);
          }
        }
      });
    }

    if (!serializeSuccess) {
      alert('일부 제원 양식의 입력값을 확인해 주세요.');
      return;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dmap:lastPhotoNumber', newNum);
    }

    // ==========================================
    // BRANCH A: 신규 시설물 조사 원클릭 세트 저장
    // ==========================================
    if (isNewSurvey) {
      var facilityId = 'photo-' + Date.now();
      var numTextId = 'text-num-' + Date.now();
      var surveyX = pendingFacilitySurvey.x;
      var surveyY = pendingFacilitySurvey.y;

      var mainFileName = generatePhotoFileName(newNum);
      var subPhotoObjects = (pendingFacilitySurvey.subPhotos || []).map(function (sp, idx) {
        var fn = (idx === 0) ? mainFileName : generatePhotoFileName(newNum + '_' + idx);
        return {
          subIndex: idx,
          fileName: fn,
          blob: sp.blob
        };
      });

      if (subPhotoObjects.length === 0) {
        alert('저장할 사진이 없습니다.');
        return;
      }

      window._photoBlobCache = window._photoBlobCache || {};
      subPhotoObjects.forEach(function (sp) {
        if (sp.blob && sp.fileName) {
          window._photoBlobCache[sp.fileName] = sp.blob;
        }
      });

      // 1) 사진번호 텍스트 (정확한 위치 surveyX, surveyY)
      var numTextObj = {
        id: numTextId,
        x: surveyX,
        y: surveyY,
        text: newNum,
        fontSize: 12,
        layer: '사진번호'
      };
      texts.push(numTextObj);

      // 2) 제원 텍스트 마커들 (정확한 동일 위치 surveyX, surveyY)
      var newSpecTextIds = [];
      var primarySpecTextId = null;
      attributeDataList.forEach(function (attr, index) {
        var specTextId = 'text-spec-' + index + '-' + Date.now();
        newSpecTextIds.push(specTextId);
        if (index === 0) primarySpecTextId = specTextId;

        var specTextObj = {
          id: specTextId,
          x: surveyX,
          y: surveyY,
          text: attr.specText,
          fontSize: 12,
          layer: attr.layer || '일반_T',
          specValues: attr.values
        };
        texts.push(specTextObj);
        lastSpecs[attr.type] = attr.values;
      });

      var additionalTypes = [];
      if (attributeDataList.length > 1) {
        for (var aIdx = 1; aIdx < attributeDataList.length; aIdx++) {
          additionalTypes.push(attributeDataList[aIdx].type);
        }
      }

      // 3) 사진 객체 생성 (정확한 동일 위치 surveyX, surveyY)
      var newPhoto = {
        id: facilityId,
        x: surveyX,
        y: surveyY,
        width: 1,
        height: 1,
        blob: subPhotoObjects[0].blob,
        memo: cleanMemo,
        fileName: mainFileName,
        createdAt: new Date().toISOString(),
        numTextId: numTextId,
        specTextId: primarySpecTextId,
        specTextIds: newSpecTextIds,
        specValuesList: attributeDataList.map(function (a) { return a.values; }),
        facilityType: attributeDataList[0] ? attributeDataList[0].type : '일반사진',
        additionalTypes: additionalTypes,
        subPhotos: subPhotoObjects,
        subPhotoFiles: subPhotoObjects.map(function (sp) { return sp.fileName; })
      };
      photos.push(newPhoto);

      // 4) 로컬 파일시스템에 순차적 쓰기
      var fsPromise = Promise.resolve();
      if (window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir()) {
        var saveChain = Promise.resolve();
        subPhotoObjects.forEach(function (sp) {
          if (sp.blob && sp.fileName) {
            saveChain = saveChain.then(function () {
              return window.localFs.savePhotoFile(dxfFileFullName, sp.fileName, sp.blob);
            });
          }
        });
        fsPromise = saveChain.catch(function (fsErr) {
          console.warn('[localFs] 신규 사진 파일시스템 저장 실패:', fsErr);
        });
      }

      fsPromise.finally(function () {
        Promise.all([
          window.localStore.savePhoto(dxfFileFullName, newPhoto),
          window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() })
        ]).then(function () {
          saveMetadataToLocalFs();
          cleanPhotoMemory(newPhoto);
          drawPhotoMarkers();
          drawTextMarkers();
          isNewPhotoPending = false;
          pendingFacilitySurvey = null;
          hidePhotoModal();
          showToast('시설물 및 사진 저장이 완료되었습니다.');
        }).catch(function (err) {
          console.error('신규 사진 저장 실패:', err);
          alert('데이터 저장소에 기록하는 도중 오류가 발생했습니다.');
        });
      });
      return;
    }

    // ==========================================
    // BRANCH B: 기존 시설물 수정 및 추가 사진 첨부
    // ==========================================
    p.memo = cleanMemo;

    // 1) 기존 제원 텍스트 마커 정리
    var oldTextIds = p.specTextIds || [];
    if (oldTextIds.length === 0 && p.specTextId) {
      oldTextIds = [p.specTextId];
    }
    texts = texts.filter(function (t) {
      return oldTextIds.indexOf(t.id) === -1;
    });

    // 2) 사진번호 변경 시 기존 파일 이름 변경
    if (p.numTextId && newNum) {
      var numObj = texts.filter(function (x) { return x.id === p.numTextId; })[0];
      if (numObj) {
        var oldNum = String(numObj.text || '').trim();
        numObj.text = newNum;

        if (oldNum && oldNum !== newNum) {
          if (p.subPhotos && p.subPhotos.length > 0) {
            p.subPhotos.forEach(function (sp, idx) {
              var oldFile = sp.fileName;
              var newFile = (idx === 0) ? generatePhotoFileName(newNum) : generatePhotoFileName(newNum + '_' + idx);
              sp.fileName = newFile;
              if (idx === 0) p.fileName = newFile;

              if (window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir() && oldFile) {
                window.localFs.renamePhotoFile(dxfFileFullName, oldFile, newFile).catch(function (err) {
                  console.warn('[photo-modal-save] 사진 파일명 변경 실패:', err);
                });
              }
              if (window._photoBlobCache && oldFile && window._photoBlobCache[oldFile]) {
                window._photoBlobCache[newFile] = window._photoBlobCache[oldFile];
              }
            });
          }
        }
      }
    }

    // 3) 새로 추가된 서브사진이 있다면 디스크에 저장 및 레코드에 첨부
    var newlyAddedSubs = (pendingFacilitySurvey && pendingFacilitySurvey.newSubPhotos) ? pendingFacilitySurvey.newSubPhotos : [];
    var fsSubPromise = Promise.resolve();

    if (newlyAddedSubs.length > 0) {
      if (!p.subPhotos) p.subPhotos = [];
      var baseIndex = p.subPhotos.length;
      var newSavedItems = [];

      newlyAddedSubs.forEach(function (nsp, nIdx) {
        var realIdx = baseIndex + nIdx;
        var newFn = generatePhotoFileName(newNum + '_' + realIdx);
        var subObj = {
          subIndex: realIdx,
          fileName: newFn,
          blob: nsp.blob
        };
        p.subPhotos.push(subObj);
        newSavedItems.push(subObj);
        if (window._photoBlobCache) window._photoBlobCache[newFn] = nsp.blob;
      });

      if (window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir()) {
        var subChain = Promise.resolve();
        newSavedItems.forEach(function (item) {
          subChain = subChain.then(function () {
            return window.localFs.savePhotoFile(dxfFileFullName, item.fileName, item.blob);
          });
        });
        fsSubPromise = subChain.catch(function (fsErr) {
          console.warn('[localFs] 추가 서브사진 저장 실패:', fsErr);
        });
      }
    }

    // 4) 신규 제원 텍스트 마커 생성 (정확히 동일한 p.x, p.y 위치)
    var updatedSpecTextIds = [];
    var updatedPrimarySpecTextId = null;

    attributeDataList.forEach(function (attr, index) {
      var specTextId = 'text-spec-' + index + '-' + Date.now();
      updatedSpecTextIds.push(specTextId);
      if (index === 0) updatedPrimarySpecTextId = specTextId;

      var specTextObj = {
        id: specTextId,
        x: p.x,
        y: p.y,
        text: attr.specText,
        fontSize: 12,
        layer: attr.layer || '일반_T',
        specValues: attr.values
      };
      texts.push(specTextObj);
      lastSpecs[attr.type] = attr.values;
    });

    p.specTextId = updatedPrimarySpecTextId;
    p.specTextIds = updatedSpecTextIds;
    p.specValuesList = attributeDataList.map(function (a) { return a.values; });
    p.facilityType = attributeDataList[0] ? attributeDataList[0].type : '일반사진';

    var updatedAdditionalTypes = [];
    if (attributeDataList.length > 1) {
      for (var uIdx = 1; uIdx < attributeDataList.length; uIdx++) {
        updatedAdditionalTypes.push(attributeDataList[uIdx].type);
      }
    }
    p.additionalTypes = updatedAdditionalTypes;
    if (p.subPhotos) {
      p.subPhotoFiles = p.subPhotos.map(function (sp) { return sp.fileName; });
    }

    fsSubPromise.finally(function () {
      Promise.all([
        window.localStore.savePhoto(dxfFileFullName, p),
        window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() })
      ]).then(function () {
        saveMetadataToLocalFs();
        isNewPhotoPending = false;
        pendingFacilitySurvey = null;
        drawPhotoMarkers();
        drawTextMarkers();
        hidePhotoModal();
        showToast('제원 수정을 완료했습니다.');
      }).catch(function (err) {
        console.error('수정 저장 실패:', err);
        alert('데이터 저장소에 기록하는 도중 오류가 발생해 수정하지 못했습니다.');
      });
    });
  });

  if (delBtn) delBtn.addEventListener('click', function () {
    var isNewSurvey = (pendingFacilitySurvey && pendingFacilitySurvey.isNew);
    if (isNewSurvey) {
      hidePhotoModal();
      return;
    }
    if (!editingPhotoId || !window.localStore || !dxfFileFullName) return;
    if (!confirm('이 사진을 삭제할까요?')) return;
    var p = photos.filter(function (x) { return x.id === editingPhotoId; })[0];
    
    window.localStore.deletePhoto(editingPhotoId).then(function () {
      photos = photos.filter(function (x) { return x.id !== editingPhotoId; });
      if (p) {
        var idsToRemove = [p.numTextId];
        var textIds = p.specTextIds || [];
        if (textIds.length === 0 && p.specTextId) {
          textIds = [p.specTextId];
        }
        textIds.forEach(function (tid) {
          if (tid) idsToRemove.push(tid);
        });

        texts = texts.filter(function (x) {
          return idsToRemove.indexOf(x.id) === -1;
        });
        return window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() });
      }
    }).then(function () {
      // [0923_01] 내부저장소에서도 사진 파일 삭제 및 메타데이터 갱신
      if (p && p.fileName && window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir()) {
        window.localFs.deletePhotoFile(dxfFileFullName, p.fileName).catch(function(){});
        if (p.subPhotos) {
          p.subPhotos.forEach(function(sp) {
            if (sp.fileName) window.localFs.deletePhotoFile(dxfFileFullName, sp.fileName).catch(function(){});
          });
        }
        saveMetadataToLocalFs();
      }
      drawPhotoMarkers();
      drawTextMarkers();
      hidePhotoModal();
      showToast('사진과 제원 데이터를 삭제했습니다.');
    }).catch(function (err) {
      console.error('삭제 실패:', err);
      alert('데이터 삭제에 실패했습니다. (저장소 오류)');
    });
  });
}

function showTextModal(textId) {
  editingTextId = textId;
  var modal = getEl('text-modal');
  var title = document.getElementById('text-modal-title');
  var input = document.getElementById('text-modal-input');
  var delBtn = document.getElementById('text-modal-delete');
  if (!modal || !input) return;
  if (textId) {
    var t = texts.filter(function (x) { return x.id === textId; })[0];
    if (t) {
      input.value = t.text || '';
      if (delBtn) delBtn.style.display = 'block';
    }
  } else {
    input.value = '';
    if (delBtn) delBtn.style.display = 'none';
  }
  title.textContent = textId ? '텍스트 편집' : '텍스트 입력';
  modal.classList.add('active');
}

function hideTextModal() {
  getEl('text-modal').classList.remove('active');
  editingTextId = null;
}

function bindTextModal() {
  var modal = getEl('text-modal');
  var closeBtn = document.getElementById('text-modal-close');
  var saveBtn = document.getElementById('text-modal-save');
  var delBtn = document.getElementById('text-modal-delete');
  var input = document.getElementById('text-modal-input');
  if (closeBtn) closeBtn.addEventListener('click', hideTextModal);
  if (saveBtn) saveBtn.addEventListener('click', function () {
    var str = (input && input.value) || '';
    if (editingTextId) {
      var t = texts.filter(function (x) { return x.id === editingTextId; })[0];
      if (t) {
        t.text = str;
        window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() }).then(function () {
          saveMetadataToLocalFs();
          drawTextMarkers();
          hideTextModal();
          showToast('텍스트가 수정되었습니다.');
        }).catch(function (err) {
          console.error('텍스트 저장 실패:', err);
          alert('데이터 저장소에 기록하는 도중 오류가 발생해 수정하지 못했습니다.');
        });
      }
    } else if (pendingAddPosition && window.localStore) {
      addTextAtPosition(pendingAddPosition, str);
      hideTextModal();
    }
  });
  if (delBtn) delBtn.addEventListener('click', function () {
    if (!editingTextId || !window.localStore || !dxfFileFullName) return;
    if (!confirm('이 텍스트를 삭제할까요?')) return;
    texts = texts.filter(function (x) { return x.id !== editingTextId; });
    window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() }).then(function () {
      saveMetadataToLocalFs();
      drawTextMarkers();
      hideTextModal();
      showToast('텍스트가 삭제되었습니다.');
    }).catch(function (err) {
      console.error('텍스트 삭제 후 저장 실패:', err);
      alert('데이터 저장소에 기록하는 도중 오류가 발생해 삭제 결과를 저장하지 못했습니다.');
    });
  });
}

// DxfParser 전역 (dxf-parser.min.js가 DxfParser를 붙이지 않을 수 있음)
if (typeof DxfParser === 'undefined' && typeof window !== 'undefined') {
  window.DxfParser = window.dxfParser || null;
}

// --- 가로등/측구 자동 입력용 스마트 바텀 시트 흐름 구현 ---

function getMatchingFacilities(name, layer) {
  var n = String(name || '').trim();
  var l = String(layer || '').trim();
  var cleanL = l.replace(/_T$/i, '');
  var matched = [];

  var cfg = window.FACILITY_CONFIG || (typeof FACILITY_CONFIG !== 'undefined' ? FACILITY_CONFIG : {});

  // '안내표지' 특별 매칭
  if ((l.indexOf('안내표지') >= 0 || n.indexOf('안내표지') >= 0) && cfg['도로표지']) {
    matched.push('도로표지');
  }

  for (var key in cfg) {
    var itemCfg = cfg[key];
    var isMatch = false;

    // 1) detectionLayers 배열(엑셀 B열 감지 레이어) 매칭
    if (itemCfg.detectionLayers && itemCfg.detectionLayers.length > 0) {
      for (var i = 0; i < itemCfg.detectionLayers.length; i++) {
        var dLayer = itemCfg.detectionLayers[i].trim();
        if (dLayer && (cleanL.toLowerCase() === dLayer.toLowerCase() || l.toLowerCase() === dLayer.toLowerCase())) {
          isMatch = true;
          break;
        }
      }
    }

    // 2) 캐드 레이어명 매칭
    if (!isMatch && itemCfg.layer) {
      var cleanConfL = itemCfg.layer.replace(/_T$/i, '');
      if (cleanL.toLowerCase() === cleanConfL.toLowerCase() || l.toLowerCase() === itemCfg.layer.toLowerCase()) {
        isMatch = true;
      }
    }

    // 3) 시설물명/블록명 일치 매칭
    if (!isMatch && n) {
      if (key.toLowerCase() === n.toLowerCase() || n.indexOf(key) >= 0) {
        isMatch = true;
      }
    }

    if (isMatch && matched.indexOf(key) === -1) {
      matched.push(key);
    }
  }

  // 도로 감지 시 도로경계석 우선 정렬, 보도 감지 시 보도경계석 우선 정렬
  if (cleanL === '도로') {
    matched.sort(function (a, b) {
      if (a === '도로경계석') return -1;
      if (b === '도로경계석') return 1;
      return 0;
    });
  } else if (cleanL === '보도') {
    matched.sort(function (a, b) {
      if (a === '보도경계석') return -1;
      if (b === '보도경계석') return 1;
      return 0;
    });
  }

  return matched;
}

function detectFacilityType(name, layer) {
  var matches = getMatchingFacilities(name, layer);
  return matches.length > 0 ? matches[0] : null;
}

// 현재 도면 내 사진번호 레이어의 최대 숫자를 조회하고 일련번호로 가공하는 공통 함수
function getNextPhotoNumber() {
  var maxNum = 0;
  if (texts && texts.length > 0) {
    texts.forEach(function (t) {
      if (t.layer === '사진번호' && t.text) {
        var num = parseInt(t.text, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
  }
  
  // 도면에 사진번호 텍스트가 1개 이상 존재한다면 도면 상의 실제 최대값 + 1 반환
  if (maxNum > 0) {
    return String(maxNum + 1);
  }
  
  // 새 도면이거나 사진이 없는 도면은 항상 1번부터 시작
  return '1';
}

// 신규 입력/수정될 사진번호가 기존 번호들과 중복되거나 중간 순서가 누락되었는지 검증 (confirm 경고)
function validatePhotoNumber(newNumStr, currentPhotoId) {
  var newNum = parseInt(newNumStr, 10);
  if (isNaN(newNum)) return true; // 숫자가 아닌 경우는 경고 제외

  // 1. 수정 중인 사진번호는 중복 검사 대상에서 제외하기 위한 텍스트 ID 획득
  var ignoreTextId = null;
  if (currentPhotoId && window.photos) {
    var p = window.photos.filter(function (x) { return x.id === currentPhotoId; })[0];
    if (p) ignoreTextId = p.numTextId;
  }

  var existingNums = [];
  if (window.texts) {
    window.texts.forEach(function (t) {
      if (t.layer === '사진번호' && t.text && t.id !== ignoreTextId) {
        var num = parseInt(t.text, 10);
        if (!isNaN(num)) {
          existingNums.push(num);
        }
      }
    });
  }

  // 중복 검사
  if (existingNums.indexOf(newNum) >= 0) {
    return confirm('⚠️ 사진번호 ' + newNum + '번은 이미 존재하는 중복 번호입니다.\n그래도 강제로 저장하시겠습니까?');
  }

  // 누락 검사
  if (existingNums.length > 0) {
    existingNums.sort(function (a, b) { return a - b; });
    var minNum = existingNums[0];
    var missingNums = [];
    for (var i = minNum; i < newNum; i++) {
      if (existingNums.indexOf(i) === -1) {
        missingNums.push(i);
      }
    }
    if (missingNums.length > 0) {
      var listStr = missingNums.slice(0, 5).join(', ') + (missingNums.length > 5 ? ' 외 ' + (missingNums.length - 5) + '개' : '');
      return confirm('⚠️ 이전 순번 중 누락된 사진번호(' + listStr + ')가 있습니다.\n이대로 강제로 저장하시겠습니까?');
    }
  }

  return true;
}

// 추천 단어 및 제외 목록(Blacklist) 로컬 저장소 관리
function getFieldBlacklist(fieldKey) {
  try {
    var raw = localStorage.getItem('dmap:blacklistSuggestions');
    var bl = raw ? JSON.parse(raw) : {};
    return bl[fieldKey] || [];
  } catch (e) {
    return [];
  }
}

function addFieldBlacklist(fieldKey, value) {
  try {
    var raw = localStorage.getItem('dmap:blacklistSuggestions');
    var bl = raw ? JSON.parse(raw) : {};
    if (!bl[fieldKey]) bl[fieldKey] = [];
    if (bl[fieldKey].indexOf(value) === -1) {
      bl[fieldKey].push(value);
    }
    localStorage.setItem('dmap:blacklistSuggestions', JSON.stringify(bl));
  } catch (e) {
    console.error('Blacklist save error:', e);
  }
}

function getFieldCustomSuggestions(fieldKey) {
  try {
    var raw = localStorage.getItem('dmap:customSuggestions');
    var cs = raw ? JSON.parse(raw) : {};
    return cs[fieldKey] || {};
  } catch (e) {
    return {};
  }
}

function saveFieldCustomSuggestion(fieldKey, value) {
  if (!value) return;
  var sVal = String(value).trim();
  if (sVal === '' || sVal === '--' || sVal === '선택' || sVal === '직접입력' || sVal === '기타') return;
  try {
    var raw = localStorage.getItem('dmap:customSuggestions');
    var cs = raw ? JSON.parse(raw) : {};
    if (!cs[fieldKey]) cs[fieldKey] = {};
    cs[fieldKey][sVal] = (cs[fieldKey][sVal] || 0) + 1;
    localStorage.setItem('dmap:customSuggestions', JSON.stringify(cs));
  } catch (e) {
    console.error('Custom suggestion save error:', e);
  }
}

function removeFieldCustomSuggestion(fieldKey, value) {
  try {
    var raw = localStorage.getItem('dmap:customSuggestions');
    var cs = raw ? JSON.parse(raw) : {};
    if (cs[fieldKey] && cs[fieldKey][value] !== undefined) {
      delete cs[fieldKey][value];
      localStorage.setItem('dmap:customSuggestions', JSON.stringify(cs));
    }
  } catch (e) {}
}

// 추천 목록 팝업 모달 표시 및 롱프레스(400ms) 삭제 핸들러 (안내문구 없이 깔끔하게 표시)
function openSuggestionPickerModal(targetInputId, fieldTitle, suggestions, fieldKey, onSelect) {
  var modal = document.getElementById('suggestion-picker-modal');
  var titleEl = document.getElementById('suggestion-picker-title');
  var listEl = document.getElementById('suggestion-picker-list');
  var closeBtn = document.getElementById('suggestion-picker-close');
  var targetInput = document.getElementById(targetInputId);

  if (!modal || !listEl || !targetInput) return;

  if (titleEl) titleEl.textContent = (fieldTitle ? fieldTitle + ' ' : '') + '목록 선택';
  listEl.innerHTML = '';

  function closeModal() {
    modal.classList.remove('active');
  }

  if (closeBtn) {
    closeBtn.onclick = function (e) {
      if (e) e.stopPropagation();
      closeModal();
    };
  }
  modal.onclick = function (e) {
    e.stopPropagation();
    if (e.target === modal) closeModal();
  };
  modal.addEventListener('touchstart', function (e) {
    e.stopPropagation();
  }, { passive: true });
  modal.addEventListener('mousedown', function (e) {
    e.stopPropagation();
  });

  // 최상단 직접 입력 옵션 (방안 1: 이모지 제외, 깔끔한 텍스트만 표시)
  var directItem = document.createElement('div');
  directItem.className = 'suggestion-picker-item';
  directItem.style.color = '#007AFF';
  directItem.style.fontWeight = 'bold';
  directItem.style.background = '#F0F8FF';
  directItem.style.borderColor = '#B8D9FF';
  directItem.textContent = '직접 입력';
  directItem.addEventListener('click', function (e) {
    e.stopPropagation();
    closeModal();
    setTimeout(function () {
      targetInput.focus();
      targetInput.select();
    }, 50);
  });
  listEl.appendChild(directItem);

  function applySelection(chosenVal) {
    if (targetInput) {
      targetInput.value = chosenVal;
      try {
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
    }
    if (onSelect) {
      try {
        onSelect(chosenVal);
      } catch (err) {
        console.warn('onSelect error:', err);
      }
    }
    if (typeof window.updateAllPreviews === 'function') {
      window.updateAllPreviews();
    }
    if (typeof window.updateAllPreviewsPM === 'function') {
      window.updateAllPreviewsPM();
    }
    closeModal();
  }

  // 공백 또는 초기화용 옵션 추가 (시설물 옵션은 '-- (옵션생략)', 메모 필드는 '메모 비우기')
  var isMemoField = (targetInputId === 'sw-form-memo' || targetInputId === 'photo-modal-memo' || fieldTitle === '사진메모' || (fieldKey && fieldKey.indexOf('memo_') === 0));
  var clearItem = document.createElement('div');
  clearItem.className = 'suggestion-picker-item';
  clearItem.style.color = '#8E8E93';
  clearItem.textContent = isMemoField ? '메모 비우기 (초기화)' : '-- (옵션생략)';
  clearItem.addEventListener('click', function (e) {
    e.stopPropagation();
    var clearVal = isMemoField ? '' : '--';
    applySelection(clearVal);
  });
  listEl.appendChild(clearItem);

  if (!suggestions || suggestions.length === 0) {
    var emptyEl = document.createElement('div');
    emptyEl.style.padding = '15px';
    emptyEl.style.textAlign = 'center';
    emptyEl.style.color = '#999';
    emptyEl.style.fontSize = '12px';
    emptyEl.textContent = '등록된 추천 항목이 없습니다.';
    listEl.appendChild(emptyEl);
  } else {
    suggestions.forEach(function (val) {
      var itemEl = document.createElement('div');
      itemEl.className = 'suggestion-picker-item';
      itemEl.textContent = val;

      var pressTimer = null;
      var isLongPressed = false;
      var startX = 0, startY = 0;

      var handlePressStart = function (e) {
        isLongPressed = false;
        if (e.touches && e.touches[0]) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }
        pressTimer = setTimeout(function () {
          isLongPressed = true;
          if (navigator.vibrate) {
            try { navigator.vibrate(50); } catch (vErr) {}
          }
          if (confirm('"' + val + '" 항목을 추천 목록에서 삭제하시겠습니까?')) {
            addFieldBlacklist(fieldKey, val);
            removeFieldCustomSuggestion(fieldKey, val);
            itemEl.remove();
          }
        }, 600); // 600ms 길게 누르기
      };

      var handlePressEnd = function () {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      itemEl.addEventListener('touchstart', function (e) {
        handlePressStart(e);
      }, { passive: true });

      itemEl.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) {
          var dx = Math.abs(e.touches[0].clientX - startX);
          var dy = Math.abs(e.touches[0].clientY - startY);
          if (dx > 10 || dy > 10) {
            handlePressEnd(); // 스크롤 중 롱프레스 취소
          }
        }
      }, { passive: true });

      itemEl.addEventListener('touchend', function (e) {
        handlePressEnd();
        if (!isLongPressed) {
          e.preventDefault(); // 고스트 클릭 방지
          applySelection(val);
        }
      });

      itemEl.addEventListener('mousedown', function (e) {
        if (e.button === 0) {
          handlePressStart(e);
        }
      });

      itemEl.addEventListener('mouseup', function () {
        handlePressEnd();
      });

      itemEl.addEventListener('mouseleave', function () {
        handlePressEnd();
      });

      itemEl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isLongPressed) {
          isLongPressed = false;
          return;
        }
        applySelection(val);
      });

      listEl.appendChild(itemEl);
    });
  }

  modal.classList.add('active');
}

// 특정 시설물 및 필드 ID에 매칭되는 이전 입력값들을 texts 이력 및 localStorage에서 추출하여 빈도순 정렬하여 반환 (블랙리스트 제외)
function getFieldSuggestions(fieldId, config, defaultOptions) {
  var counts = {};
  var baseDefaults = [];
  var fieldKey = (config && (config.title || config.layer) ? (config.title || config.layer) : 'common') + '_' + fieldId;
  var blacklist = getFieldBlacklist(fieldKey);

  var isPhotoField = (fieldId === 'photo' || /사진/.test(fieldKey) || (config && config.fields && config.fields.some(function (f) {
    return f.id === fieldId && (f.isPhoto || f.label === '사진' || /사진/.test(f.label));
  })));

  var isDoubleSidedField = (fieldId === 'doubleSided' || /양면/.test(fieldKey) || (config && config.fields && config.fields.some(function (f) {
    return f.id === fieldId && (/양면/.test(f.label) || /양면/.test(f.id));
  })));

  var isExcludedDeleteField = isPhotoField || isDoubleSidedField;

  // 1. 기본 옵션 목록(사용자 지정 기본 목록)을 0회 카운트로 사전 등록 (블랙리스트 제외)
  if (defaultOptions && defaultOptions.length > 0) {
    defaultOptions.forEach(function (opt) {
      var val = String(opt).trim();
      // [사용자 요구사항] 사진 및 양면 항목에서는 '삭제', '제외' 등 불필요/오해 유발 옵션을 원천 제외하여 표시하지 않음
      if (isExcludedDeleteField && (val === '삭제' || val === '제외' || val === '미표기')) {
        return;
      }
      if (val !== '' && val !== '기타' && val !== '직접입력' && val !== '선택' && val !== '--' && blacklist.indexOf(val) === -1) {
        counts[val] = 0;
        baseDefaults.push(val);
      }
    });
  }

  // 2. 현재 도면에서 실제로 입력된 값들을 집계하여 빈도수 가산 (블랙리스트 제외)
  // [시설물별 엄격 분리] 다른 시설물의 입력값이 섞이지 않도록 해당 시설물 레이어/타이틀과 100% 일치하는 텍스트만 집계
  if (window.texts && window.texts.length > 0 && config && config.layer) {
    var confClean = String(config.layer || '').replace(/_T$/i, '').toLowerCase();
    var confTitle = String(config.title || '').toLowerCase();
    window.texts.forEach(function (t) {
      var tClean = String(t.layer || '').replace(/_T$/i, '').toLowerCase();
      var isMatching = (tClean === confClean || (confTitle && tClean === confTitle));
      if (t.facilityType) {
        isMatching = (String(t.facilityType).toLowerCase() === confTitle);
      }
      if (isMatching && t.text) {
        var val = '';
        if (t.specValues && t.specValues[fieldId] !== undefined) {
          val = String(t.specValues[fieldId]).trim();
        } else {
          var parsed = deserializeSpecText(t.text, config);
          if (parsed && parsed[fieldId] !== undefined) {
            val = String(parsed[fieldId]).trim();
          }
        }
        if (isExcludedDeleteField && (val === '삭제' || val === '제외' || val === '미표기')) {
          return;
        }
        if (val !== '' && val !== '기타' && val !== '직접입력' && val !== '선택' && val !== '--' && blacklist.indexOf(val) === -1) {
          counts[val] = (counts[val] || 0) + 1;
        }
      }
    });
  }

  // 3. 브라우저 localStorage 사용자 사전에서도 집계 가산 (블랙리스트 제외)
  var customStore = getFieldCustomSuggestions(fieldKey);
  for (var cVal in customStore) {
    if (isExcludedDeleteField && (cVal === '삭제' || cVal === '제외' || cVal === '미표기')) {
      continue;
    }
    if (blacklist.indexOf(cVal) === -1) {
      counts[cVal] = (counts[cVal] || 0) + customStore[cVal];
    }
  }

  var list = Object.keys(counts).map(function (k) {
    return { val: k, count: counts[k] };
  });

  // 빈도순 정렬 (동일할 경우 가나다 순)
  list.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.val.localeCompare(b.val, 'ko');
  });

  // 정렬된 결과 값 리스트 추출
  var sortedValues = list.map(function (item) { return item.val; });

  // 4. 상위 15개로 1차 제한
  var result = sortedValues.slice(0, 15);

  // 5. 상위 15개 목록에 포함되지 않은 기본 설정값(defaultOptions)이 있다면 뒤에 추가로 병합
  baseDefaults.forEach(function (defVal) {
    if (result.indexOf(defVal) === -1 && blacklist.indexOf(defVal) === -1) {
      result.push(defVal);
    }
  });

  return result;
}

// 그동안 입력된 사진메모들의 빈도수를 집계하여 빈도순으로 정렬된 추천 목록 반환
function getPhotoMemoSuggestions() {
  var counts = {};
  var blacklist = getFieldBlacklist('common_photo_memo');

  // 1. 현재 로드된 photos 배열에서 메모 집계
  if (window.photos && window.photos.length > 0) {
    window.photos.forEach(function (p) {
      if (p && p.memo) {
        var m = String(p.memo).trim();
        if (m && m !== '--' && blacklist.indexOf(m) === -1) {
          counts[m] = (counts[m] || 0) + 1;
        }
      }
      if (p && p.subPhotos && p.subPhotos.length > 0) {
        p.subPhotos.forEach(function (sp) {
          if (sp && sp.memo) {
            var sm = String(sp.memo).trim();
            if (sm && sm !== '--' && blacklist.indexOf(sm) === -1) {
              counts[sm] = (counts[sm] || 0) + 1;
            }
          }
        });
      }
    });
  }

  // 2. localStorage 사용자 사전(memo_*)에서 집계
  try {
    if (typeof localStorage !== 'undefined') {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && (key.indexOf('dmap_custom_sugg_memo_') === 0 || key === 'dmap_custom_sugg_common_photo_memo')) {
          var itemStr = localStorage.getItem(key);
          if (itemStr) {
            var data = JSON.parse(itemStr);
            for (var val in data) {
              var cleanVal = String(val).trim();
              if (cleanVal && blacklist.indexOf(cleanVal) === -1) {
                counts[cleanVal] = (counts[cleanVal] || 0) + (data[cleanVal] || 1);
              }
            }
          }
        }
      }
    }
  } catch (e) {}

  var list = Object.keys(counts).map(function (k) {
    return { val: k, count: counts[k] };
  });

  // 빈도순 내림차순 정렬 (동일 빈도수 시 가나다순)
  list.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.val.localeCompare(b.val, 'ko');
  });

  return list.slice(0, 15).map(function (item) { return item.val; });
}

// 속성 추가 선택기(드롭다운)의 옵션들을 사용자가 자주 입력한 시설물 빈도순으로 자동 정렬하여 반환하는 헬퍼 함수
// (엑셀 B열 글자색이 파란색인 부속시설물만 한정 노출)
function getAttributeAdderOptions(isBottomSheet) {
  var baseOpts = [];
  for (var key in FACILITY_CONFIG) {
    if (FACILITY_CONFIG[key] && FACILITY_CONFIG[key].isSubAttachable) {
      baseOpts.push(key);
    }
  }
  if (baseOpts.length === 0) {
    // 부속시설물 플래그가 없는 경우 기본 목록 유지
    baseOpts = [
      '주의표지', '규제표지', '지시표지', '보조표지', '도로표지', 
      '교통기타', 'CCTV', '새주소', '전광표지', '보안등(부착)', 
      '도로반사경', '가로등(부착)', '기타표지'
    ];
  }

  var counts = {};
  baseOpts.forEach(function (opt) {
    counts[opt] = 0; // 초기 빈도 0
  });

  // texts 이력(도면 데이터)에서 사용된 각 시설물 레이어 빈도수 집계
  if (window.texts && window.texts.length > 0) {
    window.texts.forEach(function (t) {
      if (t.layer) {
        for (var key in FACILITY_CONFIG) {
          var config = FACILITY_CONFIG[key];
          if (config && (config.layer === t.layer || (key + '_T') === t.layer)) {
            if (counts[key] !== undefined) {
              counts[key]++;
            }
            break;
          }
        }
      }
    });
  }

  // 빈도순(횟수가 같을 시 가나다순) 정렬
  var sorted = baseOpts.map(function (opt) {
    return { name: opt, count: counts[opt] || 0 };
  });
  sorted.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, 'ko');
  });

  var result = ['-- 추가할 속성 선택 --'];
  sorted.forEach(function (item) {
    result.push(item.name);
  });
  return result;
}

function isAutoGeneratedMemo(memo) {
  if (!memo) return true;
  var s = String(memo).trim();
  return s === '' || s.indexOf('시설물 조사') >= 0 || s.indexOf('시설물조사') >= 0;
}

// 과거 사진 메모 이력에서 빈도순 상위 15개 추출 (시설물/일반사진 공통 메모 풀 공유)
function getMemoSuggestions(targetFacilityType) {
  return getPhotoMemoSuggestions();
}

// 과거 도면 데이터에서 역순으로 탐색하여 '부착'이 아닌 최근 지주형식 값을 알아내는 함수
function getLastNonAttachedSupport(facilityType) {
  if (!window.texts || window.texts.length === 0) return null;
  
  var config = FACILITY_CONFIG[facilityType];
  if (!config) return null;
  
  var confClean = String(config.layer || '').replace(/_T$/i, '').toLowerCase();
  
  // 가장 최신 데이터(맨 뒤)부터 역순으로 과거를 향해 탐색
  for (var i = window.texts.length - 1; i >= 0; i--) {
    var t = window.texts[i];
    var tClean = String(t.layer || '').replace(/_T$/i, '').toLowerCase();
    
    // 동일한 종류의 시설물인지 확인
    if ((tClean === confClean || tClean === facilityType.toLowerCase()) && t.text) {
      var parsed = deserializeSpecText(t.text, config);
      if (parsed && parsed.support) {
        var supVal = String(parsed.support).trim();
        // '부착'이나 빈 칸이 아닌 실질적인 지주형식(단주, 복주, 현수식 등)을 발견하면 즉시 반환하고 멈춤
        if (supVal !== '' && supVal !== '부착' && supVal !== '선택' && supVal !== '기타') {
          return supVal;
        }
      }
    }
  }
  return null;
}

// 과거 도면 데이터에서 역순으로 탐색하여 대분류와 소분류가 일치하는 최근 제원 데이터를 가져오는 함수
function getLastSpecBySubType(facilityType, subType) {
  if (!window.texts || window.texts.length === 0) return null;
  
  var config = FACILITY_CONFIG[facilityType];
  if (!config) return null;
  
  var confClean = String(config.layer || '').replace(/_T$/i, '').toLowerCase();
  
  // 가장 최신 데이터부터 역순 탐색
  for (var i = window.texts.length - 1; i >= 0; i--) {
    var t = window.texts[i];
    var tClean = String(t.layer || '').replace(/_T$/i, '').toLowerCase();
    
    if ((tClean === confClean || tClean === facilityType.toLowerCase()) && t.text) {
      var parsed = deserializeSpecText(t.text, config);
      if (parsed) {
        // 첫 번째 필드(type 또는 type1 등)의 값을 찾아와 비교
        var primaryFieldId = config.fields[0] ? config.fields[0].id : null;
        if (primaryFieldId && String(parsed[primaryFieldId]).trim() === String(subType).trim()) {
          return parsed; // 일치하는 제원 객체를 찾았으므로 통째로 반환
        }
      }
    }
  }
  return null;
}

// 상위 속성 종류 변경에 맞춰 그 하위 속성들의 과거 최근값을 연동하여 강제 리셋해주는 트리거 함수
function triggerSubAttributesReset(container, config, prefixId, selectedSubType) {
  if (!container || !config || !selectedSubType) return;
  
  // 1. 해당 소분류의 과거 최신 제원 데이터를 획득
  var lastSpec = getLastSpecBySubType(config.title, selectedSubType);
  if (!lastSpec) return; // 과거 기록이 전혀 없으면 하위 필드를 리셋하지 않고 그대로 유지 (부작용 최소화)
  
  // 2. 첫 번째 필드를 제외한 나머지 필드들에 대해 화면 동기화 적용
  config.fields.forEach(function (field, idx) {
    if (idx === 0) return; // 상위 필드(종류)는 제외
    
    var inputId = prefixId + '-' + field.id;
    var inpEl = document.getElementById(inputId);
    var newVal = lastSpec[field.id];
    if (newVal === undefined) return;
    
    newVal = String(newVal).trim();
    if (inpEl) {
      inpEl.value = (newVal !== '직접입력' && newVal !== '선택') ? newVal : '';
    }
  });
  
  // 전체 미리보기 일괄 업데이트
  if (typeof window.updateAllPreviews === 'function') window.updateAllPreviews();
  if (typeof window.updateAllPreviewsPM === 'function') window.updateAllPreviewsPM();
}

// 디스크 DB(IndexedDB) 저장 완료 후 RAM 메모리 과부하 및 앱 재부팅 방지를 위한 메모리 정제
function cleanPhotoMemory(photo) {
  if (!photo) return;
  // 현재 모달창에서 편집/조회 중인 사진은 미리보기를 위해 메모리를 즉시 해제하지 않음
  if (editingPhotoId && String(photo.id) === String(editingPhotoId)) return;
  if (photo.blob) photo.blob = null;
  if (photo.subPhotos && photo.subPhotos.length > 0) {
    photo.subPhotos.forEach(function (sp) {
      if (sp.blob) sp.blob = null;
    });
  }
}

// 개별 속성 카드(구분선, 타이틀, [X] 삭제 버튼 탑재)를 동적으로 생성하는 헬퍼 함수
function renderMultiAttributeCard(container, type, cachedVals, prefixIdUnique) {
  // 전력주와 통신주는 캐드 전개 비대상 시설물이므로 속성 카드 노출을 원천 차단
  if (type === '전력주' || type === '통신주') return null;
  
  var isSub = container.querySelectorAll('.attr-card').length > 0;
  
  var card = document.createElement('div');
  card.className = 'attr-card';
  card.setAttribute('data-type', type);
  card.setAttribute('data-prefix-id', prefixIdUnique);
  card.setAttribute('data-is-sub', isSub ? 'true' : 'false');

  var header = document.createElement('div');
  header.className = 'attr-card-header';
  
  var title = document.createElement('span');
  title.className = 'attr-card-title';
  title.textContent = type + ' 제원 정보';
  
  var delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'attr-card-delete';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', function () {
    if (confirm(type + ' 속성 폼을 삭제하시겠습니까?')) {
      card.remove();
      // 전체 제원 미리보기 갱신 트리거
      var previewEl = document.getElementById('sw-spec-preview') || document.getElementById('pm-spec-preview');
      if (previewEl) {
        if (previewEl.id === 'pm-spec-preview') {
          if (typeof window.updateAllPreviewsPM === 'function') {
            window.updateAllPreviewsPM();
          }
        } else {
          if (typeof window.updateAllPreviews === 'function') {
            window.updateAllPreviews();
          }
        }
      }
    }
  });

  header.appendChild(title);
  header.appendChild(delBtn);
  card.appendChild(header);

  var formBody = document.createElement('div');
  formBody.className = 'attr-card-body';
  card.appendChild(formBody);
  container.appendChild(card);

  var config = FACILITY_CONFIG[type];
  if (!config) {
    config = {
      title: type,
      layer: '기타_T',
      prefix: type,
      fields: [
        { id: 'content', label: '내용 (직접 입력)', type: 'text', placeholder: '내용 입력', default: '' }
      ]
    };
  }

  renderFacilityForm(formBody, config, cachedVals, prefixIdUnique);
  return card;
}

// 다중 속성 일괄 제원 입력 바텀 시트 구현
function showStreetlightInputForm(fileBlob, item, dxfCoords, latLng) {
  clearDomCache();
  var content = getEl('bottom-sheet-content');
  var title = getEl('bottom-sheet-title');
  if (!content) return;

  if (title) title.textContent = '시설물 제원 입력';
  content.innerHTML = '';

  var nextPhotoNum = getNextPhotoNumber();
  var primaryType = pendingFacilityType || '일반시설물';

  if (fileBlob) {
    // [오류 해결 1] 객체감지 진입 시 임시 추가사진 배열 초기화
    var initialFileName = generatePhotoFileName(nextPhotoNum);
    // [갤럭시 성능 최적화] 사진 촬영 직후 백그라운드 사전 압축 즉시 시작 (유휴 시간 활용)
    var targetSize = getImageTargetSize();
    var mainCompressPromise = (targetSize != null)
      ? compressImage(fileBlob, targetSize).catch(function (err) {
          console.warn('사전 압축 실패, 원본 사용:', err);
          return fileBlob;
        })
      : Promise.resolve(fileBlob);

    pendingStreetlightSubPhotos = [
      { subIndex: 0, fileName: initialFileName, blob: fileBlob, compressPromise: mainCompressPromise }
    ];

    var img = document.createElement('img');
    img.className = 'form-preview-img';
    img.style.cursor = 'pointer';
    if (streetlightPreviewObjectUrl) {
      URL.revokeObjectURL(streetlightPreviewObjectUrl);
    }
    streetlightPreviewObjectUrl = URL.createObjectURL(fileBlob);
    img.src = streetlightPreviewObjectUrl;
    content.appendChild(img);

    // 📷 사진추가 버튼 & 썸네일 컨테이너 생성 및 추가
    var photoControlWrap = document.createElement('div');
    photoControlWrap.style.display = 'flex';
    photoControlWrap.style.flexDirection = 'column';
    photoControlWrap.style.gap = '5px';
    photoControlWrap.style.marginBottom = '12px';

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-add-photo';
    addBtn.textContent = '📷 사진추가';
    addBtn.style.alignSelf = 'flex-start';
    addBtn.addEventListener('click', function () {
      isAddingSubPhoto = true;
      triggerCameraCapture();
    });
    photoControlWrap.appendChild(addBtn);

    var thumbContainer = document.createElement('div');
    thumbContainer.className = 'photo-thumbnail-list';
    thumbContainer.id = 'sw-thumbnails';
    photoControlWrap.appendChild(thumbContainer);
    content.appendChild(photoControlWrap);
  } else {
    // 사진 없는 글자 전용 등록 모드
    pendingStreetlightSubPhotos = [];
    var textOnlyNotice = document.createElement('div');
    textOnlyNotice.style.background = '#e8eaf6';
    textOnlyNotice.style.border = '1px solid #3f51b5';
    textOnlyNotice.style.color = '#1a237e';
    textOnlyNotice.style.padding = '10px 14px';
    textOnlyNotice.style.borderRadius = '8px';
    textOnlyNotice.style.fontSize = '13px';
    textOnlyNotice.style.fontWeight = 'bold';
    textOnlyNotice.style.marginBottom = '12px';
    textOnlyNotice.innerHTML = '📝 <strong>글자만 등록 모드</strong> (사진 없이 도면 텍스트만 기록됩니다)';
    content.appendChild(textOnlyNotice);
  }

  // 썸네일 렌더링 헬퍼
  window.renderStreetlightThumbnails = function () {
    var tc = document.getElementById('sw-thumbnails');
    if (!tc) return;
    tc.innerHTML = '';
    
    // 임시 Object URL 정리용 배열
    if (window.swThumbUrls) {
      window.swThumbUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    }
    window.swThumbUrls = [];

    if (pendingStreetlightSubPhotos.length > 1) {
      pendingStreetlightSubPhotos.forEach(function (sp, idx) {
        var thumbDiv = document.createElement('div');
        thumbDiv.className = 'photo-thumb-item' + (idx === 0 ? ' active' : '');
        var thumbImg = document.createElement('img');
        if (sp.blob) {
          var u = URL.createObjectURL(sp.blob);
          window.swThumbUrls.push(u);
          thumbImg.src = u;
        }
        thumbDiv.appendChild(thumbImg);
        
        var indexLabel = document.createElement('span');
        indexLabel.className = 'thumb-index';
        indexLabel.textContent = String(idx + 1);
        thumbDiv.appendChild(indexLabel);

        thumbDiv.addEventListener('click', function (e) {
          e.stopPropagation();
          tc.querySelectorAll('.photo-thumb-item').forEach(function (t, i) {
            t.classList.toggle('active', i === idx);
          });
          if (img && sp.blob) {
            if (streetlightPreviewObjectUrl) URL.revokeObjectURL(streetlightPreviewObjectUrl);
            streetlightPreviewObjectUrl = URL.createObjectURL(sp.blob);
            img.src = streetlightPreviewObjectUrl;
            img.onclick = function () {
              openImageViewer(pendingStreetlightSubPhotos, idx);
            };
          }
        });
        tc.appendChild(thumbDiv);
      });
    }
  };

  // 메인 이미지 클릭 시 뷰어 연동
  if (typeof img !== 'undefined' && img) {
    img.onclick = function () {
      openImageViewer(pendingStreetlightSubPhotos, 0);
    };
  }

  // 사진 번호 입력 필드 (공통)
  var numGroup = document.createElement('div');
  numGroup.className = 'form-group';
  numGroup.innerHTML = 
    '<label>사진 번호 (직접 입력/수정 가능)</label>' +
    '<input type="text" id="sw-form-num" value="' + nextPhotoNum + '" placeholder="예: 100">';
  content.appendChild(numGroup);

  var numInput = numGroup.querySelector('input');
  if (numInput) {
    numInput.addEventListener('focus', function () {
      this.select();
    });
  }

  // 사진 메모 입력 필드 (인라인 콤보 인풋 + 📋 추천 목록)
  var memoGroup = document.createElement('div');
  memoGroup.className = 'form-group';
  var memoHtml = '<label>메모 (사진메모 - 선택사항)</label>' +
                 '<div class="combo-input-group">' +
                 '  <input type="text" id="sw-form-memo" class="combo-input" placeholder="메모 직접 입력 (또는 📋 목록)">' +
                 '  <button type="button" id="sw-form-memo-btn" class="combo-list-btn" title="추천 목록 선택">📋</button>' +
                 '</div>';
  memoGroup.innerHTML = memoHtml;
  content.appendChild(memoGroup);

  var memoInputEl = memoGroup.querySelector('#sw-form-memo');
  var memoListBtn = memoGroup.querySelector('#sw-form-memo-btn');

  if (memoInputEl) {
    memoInputEl.addEventListener('input', function () {
      if (typeof window.updateAllPreviews === 'function') window.updateAllPreviews();
    });
    memoInputEl.addEventListener('change', function () {
      if (typeof window.updateAllPreviews === 'function') window.updateAllPreviews();
    });
  }

  if (memoListBtn && memoInputEl) {
    memoListBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var suggestions = getPhotoMemoSuggestions();
      openSuggestionPickerModal('sw-form-memo', '사진메모', suggestions, 'common_photo_memo', function (chosenVal) {
        if (typeof window.updateAllPreviews === 'function') window.updateAllPreviews();
      });
    });
  }

  // 실시간 전체 제원 미리보기 필드 삽입 (바텀시트 상단 고정: sticky-preview-box)
  var previewGroup = document.createElement('div');
  previewGroup.className = 'form-group sticky-preview-box';
  previewGroup.innerHTML = 
    '<label style="color:#5856D6; font-size:12px; font-weight:bold; margin-bottom:4px; display:block;">도면 저장 제원 일괄 미리보기</label>' +
    '<div id="sw-spec-preview" style="font-size:14px; font-weight:500; color:#1C1C1E; word-break:break-all; min-height:18px; white-space:pre-line; line-height:1.5;"></div>';
  content.appendChild(previewGroup);

  // 실시간 다중 폼 전체 미리보기 업데이트 함수 정의
  window.updateAllPreviews = function () {
    var previewEl = document.getElementById('sw-spec-preview');
    if (!previewEl) return;
    var cards = formListContainer.querySelectorAll('.attr-card');
    var previews = [];
    cards.forEach(function (card) {
      var type = card.getAttribute('data-type');
      var prefixIdUnique = card.getAttribute('data-prefix-id');
      var config = FACILITY_CONFIG[type] || { title: type, fields: [] };
      var formBody = card.querySelector('.attr-card-body') || card.querySelectorAll('div')[1] || card;
      var result = serializeFacilityForm(formBody, config, prefixIdUnique);
      if (result && result.specText) {
        previews.push(result.specText);
      }
    });

    // 메모 값 수집
    var memoVal = '';
    var memoEl = document.getElementById('sw-form-memo');
    if (memoEl) {
      memoVal = memoEl.value.trim();
    }

    // HTML 안전 이스케이프 후 렌더링
    var htmlContent = '';
    if (previews.length > 0) {
      htmlContent = previews.map(function(pText) {
        return '<div>' + escapeHtml(pText) + '</div>';
      }).join('');
    } else {
      htmlContent = '<div style="color: #8E8E93;">추가된 속성이 없습니다.</div>';
    }

    // 메모가 존재하면 진한 초록색으로 하단에 추가
    if (memoVal !== '' && memoVal !== '선택' && !isAutoGeneratedMemo(memoVal)) {
      htmlContent += '<div style="color: #008000; font-weight: bold; margin-top: 6px;">[메모] ' + escapeHtml(memoVal) + '</div>';
    }

    previewEl.innerHTML = htmlContent;
  };

  // 동적 필드 카드들을 담을 수직 리스트 컨테이너 생성
  var formListContainer = document.createElement('div');
  formListContainer.id = 'sw-dynamic-form-list';
  formListContainer.style.display = 'flex';
  formListContainer.style.flexDirection = 'column';
  formListContainer.style.gap = '15px';
  content.appendChild(formListContainer);

  // 1. 최초 롱프레스로 자동 인식된 주(Primary) 시설물 카드 1개 자동 렌더링
  primaryType = pendingFacilityType || '일반시설물';
  var cached = lastSpecs[primaryType] || {};
  renderMultiAttributeCard(formListContainer, primaryType, cached, 'sw-primary');

  // 구분선 삽입 (속성 추가 선택기 위)
  var swAddDivider = document.createElement('div');
  swAddDivider.style.borderTop = '1.5px solid #8E8E93';
  swAddDivider.style.marginTop = '15px';
  content.appendChild(swAddDivider);

  // 속성 추가 선택기 UI (기본 노출 방식)
  var addSelectorGroup = document.createElement('div');
  addSelectorGroup.className = 'form-group';
  addSelectorGroup.style.marginTop = '15px';
  addSelectorGroup.innerHTML = '<label>➕ 속성 추가 입력</label>';
  var addSelect = document.createElement('select');
  addSelect.id = 'sw-attribute-adder';
  var addOpts = getAttributeAdderOptions(true);
  addOpts.forEach(function (opt) {
    var disabled = opt.indexOf('--') === 0 ? ' disabled selected' : '';
    addSelect.innerHTML += '<option value="' + opt + '"' + disabled + '>' + opt + '</option>';
  });
  addSelectorGroup.appendChild(addSelect);
  content.appendChild(addSelectorGroup);

  // 추가 속성 선택 리스너: 선택 즉시 수직 하단 카드로 부착
  addSelect.addEventListener('change', function () {
    var selectedType = this.value;
    if (!selectedType || selectedType.indexOf('--') === 0) return;
    
    // 이미 동일 속성이 카드 목록에 있으면 중복 추가 질문
    var cards = formListContainer.querySelectorAll('.attr-card');
    var isDuplicate = false;
    cards.forEach(function (c) {
      if (c.getAttribute('data-type') === selectedType) isDuplicate = true;
    });
    
    if (isDuplicate && !confirm(selectedType + ' 속성이 이미 추가되어 있습니다. 중복해서 추가하시겠습니까?')) {
      this.value = addOpts[0];
      return;
    }

    var uniquePrefix = 'sw-add-' + Date.now();
    var cardCached = lastSpecs[selectedType] || {};
    renderMultiAttributeCard(formListContainer, selectedType, cardCached, uniquePrefix);
    
    // 입력 동기화 리스너 추가 바인딩하여 실시간 미리보기 갱신
    var inputsAndSelects = formListContainer.querySelectorAll('input, select');
    inputsAndSelects.forEach(function (el) {
      el.addEventListener('input', window.updateAllPreviews);
      el.addEventListener('change', window.updateAllPreviews);
    });

    window.updateAllPreviews();
    this.value = addOpts[0]; // 셀렉트박스 리셋
  });

  // 버튼 컨테이너 생성 (저장 / 추가 버튼의 1:1 우측 수평 정렬)
  var btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'display:flex; gap:10px; width:100%; margin-top:20px;';
  
  var submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'btn';
  submitBtn.id = 'sw-form-submit';
  submitBtn.style.cssText = 'background:#34C759; flex:1; padding:11px; font-weight:bold; font-size:13px; border-radius:8px;';
  submitBtn.textContent = '제원 저장';
  
  btnContainer.appendChild(submitBtn);
  content.appendChild(btnContainer);

  // 초기 렌더링 후 실시간 미리보기 갱신
  var inputsAndSelects = formListContainer.querySelectorAll('input, select');
  inputsAndSelects.forEach(function (el) {
    el.addEventListener('input', window.updateAllPreviews);
    el.addEventListener('change', window.updateAllPreviews);
  });
  window.updateAllPreviews();

  // 일괄 저장 버튼 클릭 이벤트 핸들러
  submitBtn.addEventListener('click', function () {
    var numEl = document.getElementById('sw-form-num');
    var numVal = numEl ? numEl.value.trim() : '';
    if (!numVal) { alert('사진 번호를 입력해 주세요.'); return; }

    // 중복 및 누락 감지 검증 실행
    if (!validatePhotoNumber(numVal, null)) {
      return; // 취소 시 저장 중단
    }

    var cards = formListContainer.querySelectorAll('.attr-card');
    if (cards.length === 0) {
      alert('최소 하나 이상의 시설물 속성을 추가해야 합니다.');
      return;
    }

    var attributeDataList = [];
    var serializeSuccess = true;

    cards.forEach(function (card) {
      var type = card.getAttribute('data-type');
      var prefixIdUnique = card.getAttribute('data-prefix-id');
      var config = FACILITY_CONFIG[type];
      if (!config) return;

      var formBody = card.querySelector('.attr-card-body') || card.querySelectorAll('div')[1] || card;
      var result = serializeFacilityForm(formBody, config, prefixIdUnique);
      if (!result) {
        serializeSuccess = false;
        return;
      }

      attributeDataList.push({
        type: type,
        layer: result.layer,
        specText: result.specText,
        values: result.values
      });

      // 사용자가 직접 입력한 속성값들을 사용자 사전에 자동 누적 저장
      if (result.values) {
        for (var fId in result.values) {
          saveFieldCustomSuggestion((config.title || config.layer) + '_' + fId, result.values[fId]);
        }
      }
    });

    if (!serializeSuccess) {
      alert('일부 폼 직렬화에 실패했습니다. 입력값을 확인해 주세요.');
      return;
    }

    var memoInputEl = document.getElementById('sw-form-memo');
    var memoVal = memoInputEl ? memoInputEl.value.trim() : '';
    if (memoVal && !isAutoGeneratedMemo(memoVal)) {
      saveFieldCustomSuggestion('memo_' + (primaryType !== '일반시설물' ? primaryType : '일반사진'), memoVal);
    }

    var finalFormData = {
      num: numVal,
      memo: memoVal,
      attributes: attributeDataList
    };

    saveStreetlightData(finalFormData, fileBlob, item, dxfCoords, latLng);
  });

  // [0925_01 필수 버그 수정] 시설물 선택 또는 감지 후 폼 구성이 완료되면 바텀시트를 화면에 확실하게 활성화!
  var sheet = getEl('bottom-sheet-flow');
  if (sheet) {
    sheet.classList.add('active');
    var contentEl = getEl('bottom-sheet-content');
    if (contentEl) contentEl.scrollTop = 0;
  }
  var closeBtn = document.getElementById('bottom-sheet-close');
  if (closeBtn && !closeBtn._bound) {
    closeBtn.addEventListener('click', hideStreetlightBottomSheet);
    closeBtn._bound = true;
  }
}

function saveStreetlightData(formData, fileBlob, item, dxfCoords, latLng) {
  if (!dxfFileFullName || !window.localStore) return;
  showLoading(true);

  // 1. 입력받은 모든 개별 속성들의 임시 폼 캐시(lastSpecs) 갱신
  if (formData.attributes && formData.attributes.length > 0) {
    formData.attributes.forEach(function (attr) {
      lastSpecs[attr.type] = attr.values;
    });
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('dmap:lastPhotoNumber', formData.num);
  }

  var insertionDxf = dxfCoords;
  var feature = item.feature;
  if (feature) {
    var bx = feature.getProperty('blockInsertX');
    var by = feature.getProperty('blockInsertY');
    if (bx != null && by != null) {
      insertionDxf = { x: parseFloat(bx), y: parseFloat(by) };
    } else if (item.coord) {
      // 선형 객체(폴리선)의 경우: 사용자가 터치한 점 대신, 선상에 계산된 최인접 투영점 좌표를 DXF 좌표계로 복원하여 마커의 삽입 위치로 사용
      var backDxf = latLngToDxf(item.coord);
      if (backDxf) insertionDxf = backDxf;
    } else {
      var geom = feature.getGeometry && feature.getGeometry();
      if (geom && geom.getType() === 'Point') {
        var geomLatLng = geom.get();
        var backDxf = latLngToDxf(geomLatLng);
        if (backDxf) insertionDxf = backDxf;
      }
    }
  }

  var photoId = 'photo-' + Date.now();
  var numTextId = 'text-num-' + Date.now();
  
  // 사진 파일이 있는 경우에만 사진 번호 텍스트 객체 생성 및 texts 배열 등록
  if (fileBlob) {
    var numTextObj = {
      id: numTextId,
      x: insertionDxf.x,
      y: insertionDxf.y,
      text: formData.num,
      fontSize: 12,
      layer: '사진번호'
    };
    texts.push(numTextObj);
  }

  // 2. 다중 제원 텍스트 마커 생성 및 ID 목록 결합
  var specTextIds = [];
  var primarySpecTextId = null;

  var cfg = window.FACILITY_CONFIG || (typeof FACILITY_CONFIG !== 'undefined' ? FACILITY_CONFIG : {});

  if (formData.attributes && formData.attributes.length > 0) {
    formData.attributes.forEach(function (attr, index) {
      var specTextId = 'text-spec-' + index + '-' + Date.now();
      specTextIds.push(specTextId);
      
      // 첫 번째 속성을 주(Primary) 제원 텍스트 ID로 지정 (구버전 호환성용)
      if (index === 0) {
        primarySpecTextId = specTextId;
      }

      var colorNum = 7;
      if (cfg[attr.type] && cfg[attr.type].color !== undefined) {
        colorNum = cfg[attr.type].color;
      }

      var specTextObj = {
        id: specTextId,
        x: insertionDxf.x,
        y: insertionDxf.y,
        text: attr.specText,
        fontSize: 12,
        layer: attr.layer || '일반_T',
        color: colorNum,
        specValues: attr.values // [0925_01] 원본 속성값 보존
      };
      texts.push(specTextObj);
    });
  }

  // 사진 없는 글자 전용 등록 모드인 경우
  if (!fileBlob) {
    window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() })
    .then(function () {
      // [0923_01] 내부저장소 메타데이터도 갱신
      saveMetadataToLocalFs();
      drawTextMarkers();
      showLoading(false);
      hideStreetlightBottomSheet();
      showToast('제원 텍스트 저장이 완료되었습니다.');
    }).catch(function (err) {
      showLoading(false);
      console.error('제원 텍스트 저장 실패:', err);
      alert('데이터 저장소에 기록하는 도중 오류가 발생해 저장하지 못했습니다.');
    });
    return;
  }

  var targetSize = getImageTargetSize();
  function finishSave(blob) {
    var primaryType = (formData.attributes && formData.attributes[0]) ? formData.attributes[0].type : (pendingFacilityType || '일반시설물');
    var descText = primaryType + ' 시설물 조사';
    
    // 추가된 모든 부속 시설물 유형 목록 추출
    var additionalTypes = [];
    if (formData.attributes && formData.attributes.length > 1) {
      for (var idx = 1; idx < formData.attributes.length; idx++) {
        additionalTypes.push(formData.attributes[idx].type);
      }
    }

    var mainFileName = generatePhotoFileName(formData.num);

    // 바텀 시트에서 추가 촬영한 사진들이 있으면 함께 저장
    var finalSubPhotos;
    if (pendingStreetlightSubPhotos.length > 1) {
      // 파일명을 최종 사진번호 기반으로 재생성
      finalSubPhotos = pendingStreetlightSubPhotos.map(function (sp, idx) {
        return {
          subIndex: idx,
          fileName: idx === 0 ? mainFileName : generatePhotoFileName(formData.num + '_' + idx),
          blob: sp.blob
        };
      });
    } else {
      finalSubPhotos = [
        { subIndex: 0, fileName: mainFileName, blob: blob }
      ];
    }

    var photo = {
      id: photoId,
      x: insertionDxf.x,
      y: insertionDxf.y,
      width: 1,
      height: 1,
      blob: blob,
      memo: (formData.memo === '--' || formData.memo === '선택' || formData.memo === '') ? '' : formData.memo,
      fileName: mainFileName,
      createdAt: new Date().toISOString(),
      numTextId: numTextId,
      specTextId: primarySpecTextId, // 구버전 DB 호환성
      specTextIds: specTextIds,      // 다중 속성 ID 배열 (신규)
      specValuesList: (formData.attributes || []).map(function (a) { return a.values; }),
      facilityType: primaryType,     // 주 시설물 종류
      additionalTypes: additionalTypes, // 부속 시설물 종류 배열
      subPhotos: finalSubPhotos
    };

    photos.push(photo);

    // [0925_01 버그수정] blob 참조를 저장 작업용으로 먼저 보존 (cleanPhotoMemory가 null로 해제하기 전에)
    var savedBlob = blob;
    var savedSubPhotos = finalSubPhotos.map(function (sp) {
      return { subIndex: sp.subIndex, fileName: sp.fileName, blob: sp.blob };
    });

    // [0925_01 성능/안정성 혁신] 세션 메모리 캐시에 즉시 보관하여 비동기 파일 I/O 지연 중에도 썸네일/미리보기 즉시 제공
    window._photoBlobCache = window._photoBlobCache || {};
    if (savedBlob && mainFileName) window._photoBlobCache[mainFileName] = savedBlob;
    if (savedSubPhotos && savedSubPhotos.length > 0) {
      savedSubPhotos.forEach(function (sp) {
        if (sp.blob && sp.fileName) {
          window._photoBlobCache[sp.fileName] = sp.blob;
        }
      });
    }

    // [갤럭시/아이폰 공통 체감 성능 혁신 1] 화면 마커 갱신, 바텀시트 닫기 및 피드백을 지체없이 즉시 완료!
    drawPhotoMarkers();
    drawTextMarkers();
    showLoading(false);
    hideStreetlightBottomSheet();
    showToast('제원 저장이 완료되었습니다.');

    // [갤럭시/아이폰 공통 체감 성능 혁신 2] 무거운 스토리지 및 파일시스템 I/O는 백그라운드 비동기 처리
    Promise.all([
      window.localStore.savePhoto(dxfFileFullName, photo),
      window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() })
    ]).then(function () {
      if (window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir()) {
        // [안드로이드 파일 락 방지] 동시 병렬 쓰기 대신 순차적(Sequential) 쓰기로 다중 사진 저장 안정성 100% 보장
        var saveChain = Promise.resolve();
        if (savedSubPhotos && savedSubPhotos.length > 0) {
          savedSubPhotos.forEach(function (sp) {
            if (sp.blob && sp.fileName) {
              saveChain = saveChain.then(function () {
                return window.localFs.savePhotoFile(dxfFileFullName, sp.fileName, sp.blob);
              });
            }
          });
        } else if (savedBlob && mainFileName) {
          saveChain = window.localFs.savePhotoFile(dxfFileFullName, mainFileName, savedBlob);
        }

        saveChain.then(function () {
          saveMetadataToLocalFs();
          cleanPhotoMemory(photo);
        }).catch(function (fsErr) {
          console.warn('[localFs] 백그라운드 사진 파일 저장 실패:', fsErr);
          cleanPhotoMemory(photo);
        });
      } else {
        // 모든 저장 완료 후 안전하게 메모리 해제
        cleanPhotoMemory(photo);
      }
    }).catch(function (err) {
      console.error('데이터 저장소 백그라운드 기록 오류:', err);
      cleanPhotoMemory(photo);
    });
  }

  // [갤럭시 최적화 3] 사전 백그라운드 압축된 Promise 활용 (입력 중 이미 완료되어 대기시간 0초)
  var firstPhotoObj = pendingStreetlightSubPhotos && pendingStreetlightSubPhotos[0];
  var mainCompressPromise = (firstPhotoObj && firstPhotoObj.compressPromise)
    ? firstPhotoObj.compressPromise
    : (targetSize != null ? compressImage(fileBlob, targetSize).catch(function () { return fileBlob; }) : Promise.resolve(fileBlob));

  var allSubPromises = (pendingStreetlightSubPhotos || []).map(function (sp) {
    return sp.compressPromise || Promise.resolve(sp.blob || fileBlob);
  });

  Promise.all([mainCompressPromise, Promise.all(allSubPromises)]).then(function (results) {
    var compressedMainBlob = results[0];
    var compressedSubBlobs = results[1];
    if (pendingStreetlightSubPhotos) {
      pendingStreetlightSubPhotos.forEach(function (sp, i) {
        if (compressedSubBlobs[i]) sp.blob = compressedSubBlobs[i];
      });
    }
    finishSave(compressedMainBlob);
  }).catch(function () {
    finishSave(fileBlob);
  });
}// 동적 시설물 제원 폼 렌더러
function renderFacilityForm(container, config, cachedVals, prefixId) {
  if (!container || !config) return;
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '8px';

  // 1-2. 보라색 마커에 입력될 전체 제원 미리보기 필드 삽입 (수동 레이어 입력 필드는 제거됨)
  var previewGroup = document.createElement('div');
  previewGroup.className = 'form-group';
  previewGroup.style.background = '#F2F2F7';
  previewGroup.style.padding = '8px 12px';
  previewGroup.style.borderRadius = '8px';
  previewGroup.style.border = '1px solid #E5E5EA';
  previewGroup.style.display = 'none'; // 화면 중복 노출을 피하기 위해 보이지 않게 숨김 처리
  previewGroup.innerHTML = 
    '<label style="color:#5856D6; font-size:11px; margin-bottom:2px;">전체 제원 텍스트 미리보기</label>' +
    '<div id="' + prefixId + '-spec-preview" style="font-size:13px; font-weight:bold; color:#1C1C1E; word-break:break-all; min-height:16px;"></div>';
  container.appendChild(previewGroup);

  function updatePreview() {
    var previewEl = document.getElementById(prefixId + '-spec-preview');
    if (!previewEl) return;
    var result = serializeFacilityForm(container, config, prefixId);
    if (result) {
      previewEl.textContent = result.specText;
    }
  }

  // 부속시설물 여부 확인 (두 번째 이후 카드)
  var cardEl = container.parentNode;
  var isSub = false;
  if (cardEl && cardEl.getAttribute('data-is-sub') === 'true') {
    isSub = true;
  }

  // 2. 설정 테이블 필드 동적 생성 (datalist 통합 콤보박스 적용)
  config.fields.forEach(function (field, idx) {
    // [사용자 요구사항] 부속시설물일 경우 지주 및 사진 항목 자동 생략
    if (isSub && (field.isSupport || field.isPhoto || /지주|사진/.test(field.label))) {
      return;
    }

    var group = document.createElement('div');
    group.className = 'form-group';

    var val = '';
    // 직전에 입력된 캐시값(lastSpecs[type] 등)이 존재하면 해당 값을 가져오고, 없으면 기본값 적용
    var hasCache = cachedVals && cachedVals[field.id] !== undefined;
    var cachedVal = hasCache ? cachedVals[field.id] : '';

    // [요구사항] 새주소의 경우 무조건 "현수식"으로 지주형식 기본 세팅 (캐시 데이터 유무 상관없이 무조건 현수식)
    if ((field.id === 'support' || field.label === '지주형식') && config.title === '새주소') {
      val = '현수식';
    } else if ((field.id === 'support' || field.label === '지주형식') && config.title !== '새주소') {
      var facilityType = config.title;
      
      // 조건 2: 두 번째 이후 카드인 경우
      var cardEl = container.parentNode;
      var cardsContainer = cardEl ? cardEl.parentNode : null;
      var isSecondOrLater = false;
      if (cardsContainer) {
        var siblingCards = cardsContainer.querySelectorAll('.attr-card');
        if (siblingCards.length > 0 && siblingCards[0] !== cardEl) {
          isSecondOrLater = true;
        }
      }
      
      // 모든 표지판 및 도로반사경 판별 정규식
      var isSignOrReflector = /표지|도로반사경/.test(facilityType);
      
      if (facilityType === '신호등') {
        // 신호등의 경우 캐시를 완전히 무시하고 항상 무조건 "측주"로 기본 대기
        val = '측주';
      } else if (isSecondOrLater) {
        // 추가시설물(두 번째 이후 카드)로 모든 표지판과 도로반사경이 얹혀지면 무조건 "부착"
        val = '부착';
      } else if (isSignOrReflector) {
        // 단독(첫 번째 카드)으로 수집된 모든 표지판과 도로반사경 처리
        // 1. 과거 데이터에서 '부착'이 아니었던 최근 지주형식을 검색해 봅니다.
        var lastNonAttached = getLastNonAttachedSupport(facilityType);
        if (lastNonAttached) {
          val = lastNonAttached; // 찾았다면 그 값(예: '복주')으로 입력대기
        } else {
          // 2. 만약 히스토리에 '부착'이 아닌 과거 기록이 없다면 캐시값 또는 기본값인 '단주'로 대기
          var hasValidCache = hasCache && cachedVal !== '부착' && cachedVal !== '';
          val = hasValidCache ? cachedVal : '단주';
        }
      } else {
        var target5 = ['통신주', '전력주', '가로등', '신호등', '가로수'];
        
        // 조건 1: 롱프레스로 감지된 5종 시설물인 경우
        var isLongPress5 = (window.pendingStreetlightItem && target5.indexOf(facilityType) !== -1);
        
        if (isLongPress5) {
          val = '부착';
        } else {
          val = hasCache ? cachedVal : (field.default || '');
        }
      }
    } else {
      val = hasCache ? cachedVal : (field.default || '');
    }

    var html = '<label>' + field.label + '</label>';

    // 지능형 숫자형 필드 감지기
    var isNumericField = field.type === 'number' || field.isNumber || 
      /수량|높이|가로|세로|폭|경사|규격|각도|개수|갯수|차선|차로|연장/.test(field.label) ||
      /count|width|height|gradient|angle|spec|num|lane|length/.test(field.id);

    var inputId = prefixId + '-' + field.id;
    var listId = inputId + '-list';

    var isPhotoField = field.isPhoto || field.label === '사진' || (field.options && field.options.indexOf('사진') !== -1 && (field.options.indexOf('삭제') !== -1 || field.options.indexOf('제외') !== -1));

    if (field.readonly) {
      html += '<input type="text" readonly id="' + inputId + '" value="' + val + '">';
      group.innerHTML = html;
      container.appendChild(group);
    } else {
      // 사진 필드일 경우 기본값 '사진' 보장
      if (isPhotoField && !val) {
        val = '사진';
      }

      // 콤보 인풋 박스 생성 (인라인 직접 타이핑 + 우측 📋 추천 목록 모달 버튼)
      var strVal = String(val).trim();
      if (strVal === '선택' || strVal === '직접입력' || strVal === '기타') strVal = '';

      var stepAttr = isNumericField ? ' inputmode="decimal"' : '';
      var placeholder = field.placeholder || (isPhotoField ? '사진 (또는 📋)' : (isNumericField ? '숫자 입력' : '직접 입력 (또는 📋 목록)'));
      var fieldKey = (config.title || config.layer || 'facility') + '_' + field.id;

      html += '<div class="combo-input-group">';
      html += '  <input type="text"' + stepAttr + ' id="' + inputId + '" class="combo-input" value="' + escapeHtml(strVal) + '" placeholder="' + placeholder + '">';
      html += '  <button type="button" id="' + inputId + '-btn" class="combo-list-btn" title="추천 목록 선택">📋</button>';
      html += '</div>';

      group.innerHTML = html;
      container.appendChild(group);

      var textInputEl = group.querySelector('input.combo-input');
      var listBtnEl = group.querySelector('button.combo-list-btn');

      if (textInputEl && listBtnEl) {
        textInputEl.addEventListener('input', function () {
          updatePreview();
          if (typeof window.updateAllPreviews === 'function') window.updateAllPreviews();
          if (typeof window.updateAllPreviewsPM === 'function') window.updateAllPreviewsPM();
        });
        textInputEl.addEventListener('change', function () {
          updatePreview();
          if (typeof window.updateAllPreviews === 'function') window.updateAllPreviews();
          if (typeof window.updateAllPreviewsPM === 'function') window.updateAllPreviewsPM();
          if (idx === 0 && /종류|분류|재질|형식|구분/.test(field.label)) {
            triggerSubAttributesReset(container, config, prefixId, this.value.trim());
          }
        });
        textInputEl.addEventListener('focus', function () {
          if (!isNumericField) this.select();
        });

        listBtnEl.addEventListener('click', function () {
          var currentOpts = getFieldSuggestions(field.id, config, field.options);
          openSuggestionPickerModal(inputId, field.label, currentOpts, fieldKey, function (chosenVal) {
            updatePreview();
            if (typeof window.updateAllPreviews === 'function') window.updateAllPreviews();
            if (typeof window.updateAllPreviewsPM === 'function') window.updateAllPreviewsPM();
            if (idx === 0 && /종류|분류|재질|형식|구분/.test(field.label)) {
              triggerSubAttributesReset(container, config, prefixId, chosenVal);
            }
          });
        });
      }
    }

    // 신호등 종류가 '차량'인 경우 보행등 필드 숨기기
    if (config.title === '신호등' && (field.id === 'pedestrianType' || field.id === 'pedestrianCount')) {
      group.id = prefixId + '-group-' + field.id;
      var typeVal = cachedVals && cachedVals['type'] ? cachedVals['type'] : '차량';
      var pedTypeVal = cachedVals && cachedVals['pedestrianType'] ? cachedVals['pedestrianType'] : '보행등무';
      
      if (typeVal === '보행') {
        if (field.id === 'pedestrianCount') {
          group.style.display = (pedTypeVal !== '보행등무') ? 'flex' : 'none';
        } else {
          group.style.display = 'flex';
        }
      } else {
        group.style.display = 'none';
      }
    }

    // 도로표지 내용 필드 항상 노출
    if (config.title === '도로표지' && field.id === 'content') {
      group.id = prefixId + '-group-content';
      group.style.display = 'flex';
    }

    // 이벤트 리스너 바인딩 (동적 필드 제어용)
    var inputEl = group.querySelector('input.combo-input');
    if (!field.readonly && inputEl) {
      // 동적 필드 제어 (신호등 종류 변경 시)
      if (config.title === '신호등' && field.id === 'type') {
        var handleTypeChange = function () {
          var showPed = this.value.trim() === '보행';
          var pedTypeGrp = document.getElementById(prefixId + '-group-pedestrianType');
          var pedCountGrp = document.getElementById(prefixId + '-group-pedestrianCount');
          var pedTypeEl = document.getElementById(prefixId + '-pedestrianType');
          var pedTypeVal = pedTypeEl ? pedTypeEl.value.trim() : '보행등무';
          
          if (pedTypeGrp) pedTypeGrp.style.display = showPed ? 'flex' : 'none';
          if (pedCountGrp) pedCountGrp.style.display = (showPed && pedTypeVal !== '보행등무') ? 'flex' : 'none';
          updatePreview();
        };
        inputEl.addEventListener('input', handleTypeChange);
        inputEl.addEventListener('change', handleTypeChange);
      }

      // 동적 필드 제어 (신호등 보행등 구분 변경 시)
      if (config.title === '신호등' && field.id === 'pedestrianType') {
        var handlePedChange = function () {
          var pedCountGrp = document.getElementById(prefixId + '-group-pedestrianCount');
          if (pedCountGrp) {
            pedCountGrp.style.display = (this.value.trim() !== '보행등무') ? 'flex' : 'none';
          }
          updatePreview();
        };
        inputEl.addEventListener('input', handlePedChange);
        inputEl.addEventListener('change', handlePedChange);
      }

      // 도로표지 방향 변경 시 미리보기만 동기화
      if (config.title === '도로표지' && field.id === 'direction') {
        var handleDirChange = function () {
          updatePreview();
        };
        inputEl.addEventListener('input', handleDirChange);
        inputEl.addEventListener('change', handleDirChange);
      }
    }
  });

  // 초기 렌더링 시점에 미리보기 1회 업데이트
  updatePreview();
}

// 동적 시설물 폼 데이터 취득 및 직렬화
function serializeFacilityForm(container, config, prefixId) {
  if (!container || !config) return null;
  var vals = {};

  config.fields.forEach(function (field) {
    var el = document.getElementById(prefixId + '-' + field.id);
    var etcEl = document.getElementById(prefixId + '-' + field.id + '-etc');
    var val = '';
    var isSelectEmpty = false;
    if (el) {
      if (el.tagName === 'SELECT') {
        if (el.value === '직접입력' && etcEl) {
          val = etcEl.value.trim();
        } else {
          val = el.value.trim();
          if (el.value === '--') {
            isSelectEmpty = true;
          }
        }
      } else {
        val = el.value.trim();
      }
    }

    // [0925_01 버그수정] 사용자가 '--'를 선택했거나 빈칸으로 비운 경우, 기본값으로 강제 치환하지 않고 '--' (생략)으로 확실하게 보존!
    if (val === '' || val === '--' || val === '직접입력' || val === '삭제' || val === '제외' || val === '미표기' || val === '없음') {
      val = '--';
    }
    vals[field.id] = val;
  });

  var customLayerInput = document.getElementById(prefixId + '-custom-layer');
  var finalLayer = (customLayerInput && customLayerInput.value.trim()) ? customLayerInput.value.trim() : config.layer;

  // 부속시설물 여부 확인
  var cardEl = (container.closest ? container.closest('.attr-card') : null) || container.parentNode;
  var isSub = false;
  if (cardEl && cardEl.getAttribute && cardEl.getAttribute('data-is-sub') === 'true') {
    isSub = true;
  } else if (prefixId && (prefixId.indexOf('-attr-') >= 0 || prefixId.startsWith('sw-attr-') || prefixId.startsWith('pm-attr-'))) {
    isSub = true;
  }

  // 제원 조립 처리 (포맷 규칙: 접두어 필수 포함, 부속시설물일 경우 앞에 + 자동 첨부)
  var prefixWord = (config.prefix !== undefined && config.prefix !== '') ? config.prefix : config.title;
  if (isSub && prefixWord) {
    if (!prefixWord.startsWith('+')) {
      prefixWord = '+' + prefixWord;
    }
  }

  var parts = [];
  if (prefixWord) {
    parts.push(prefixWord);
  }

  var specText = '';

  if (config.fields && config.fields.length > 0) {
    config.fields.forEach(function (field) {
      // 고정 레이어명 필드(name)는 직렬화에서 생략
      if (field.id === 'name') return;

      // [사용자 요구사항] 부속시설물일 경우 지주 및 사진 항목 자동 제외
      if (isSub && (field.isSupport || field.isPhoto || /지주|사진/.test(field.label))) {
        return;
      }

      var fieldVal = vals[field.id];
      if (fieldVal === undefined || fieldVal === null) return;
      fieldVal = String(fieldVal).trim();

      // [사용자 요구사항] '삭제', '제외', '미표기', '없음'을 선택했거나 공란/빈칸/-- 인 경우 해당 항목은 슬래시 조립에서 완전히 생략(skip)
      if (fieldVal === '삭제' || fieldVal === '제외' || fieldVal === '미표기' || fieldVal === '없음' || fieldVal === '--' || fieldVal === '') {
        return;
      }

      parts.push(fieldVal);
    });
    specText = parts.join('/');
  } else {
    specText = prefixWord || config.title;
  }

  // 통신주 및 전력주(체신주)는 오해 방지를 위해 미리보기 텍스트를 전개 제외로 표시
  if (config.title === '통신주' || config.title === '전력주') {
    specText = config.title + '(캐드제외)';
  }

  // 폼 캐시에 최신 입력값 저장
  lastSpecs[config.title] = vals;

  return {
    layer: finalLayer,
    specText: specText,
    values: vals
  };
}

// HTML 특수문자 에스케이프 처리용 헬퍼 함수
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 점(P)과 선분(A-B) 사이의 최인접 점 좌표 및 최단 미터 거리 계산 헬퍼 함수
function getClosestPointOnSegment(p, a, b) {
  var lat1 = typeof a.lat === 'function' ? a.lat() : a.lat;
  var lng1 = typeof a.lng === 'function' ? a.lng() : a.lng;
  var lat2 = typeof b.lat === 'function' ? b.lat() : b.lat;
  var lng2 = typeof b.lng === 'function' ? b.lng() : b.lng;
  var latP = typeof p.lat === 'function' ? p.lat() : p.lat;
  var lngP = typeof p.lng === 'function' ? p.lng() : p.lng;

  var latRad = (latP * Math.PI) / 180;
  var metersPerDegLat = 111320;
  var metersPerDegLng = 111320 * Math.cos(latRad);

  var ax = lng1 * metersPerDegLng;
  var ay = lat1 * metersPerDegLat;
  var bx = lng2 * metersPerDegLng;
  var by = lat2 * metersPerDegLat;
  var px = lngP * metersPerDegLng;
  var py = latP * metersPerDegLat;

  var dx = bx - ax;
  var dy = by - ay;
  if (dx === 0 && dy === 0) {
    return {
      latLng: a,
      distance: getLatLngDistanceM(p, a)
    };
  }

  var t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  var closestLng = (ax + t * dx) / metersPerDegLng;
  var closestLat = (ay + t * dy) / metersPerDegLat;
  var closestLatLng = new google.maps.LatLng(closestLat, closestLng);

  return {
    latLng: closestLatLng,
    distance: getLatLngDistanceM(p, closestLatLng)
  };
}

function getDistanceToSegmentM(p, a, b) {
  return getClosestPointOnSegment(p, a, b).distance;
}

function getLatLngDistanceM(p1, p2) {
  if (!p1 || !p2) return Infinity;
  var lat1 = typeof p1.lat === 'function' ? p1.lat() : p1.lat;
  var lng1 = typeof p1.lng === 'function' ? p1.lng() : p1.lng;
  var lat2 = typeof p2.lat === 'function' ? p2.lat() : p2.lat;
  var lng2 = typeof p2.lng === 'function' ? p2.lng() : p2.lng;

  var R = 6371000; // 지구 반지름 (m)
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLng = ((lng2 - lng1) * Math.PI) / 180;
  var aVal =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

function findNearbyFacilities(latLng, maxDistM) {
  if (!map || !map.data) return [];
  
  var list = [];
  var candidates = [];
  
  // 공간 인덱스가 아직 빌드되지 않은 경우 초기화
  if (!spatialIndex) {
    buildSpatialIndex();
  }
  
  var lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
  var lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
  
  // 검색 반경을 위경도 도(degree) 단위로 대략적 변환 (안전 마진 포함)
  var latBuffer = maxDistM / 111320;
  var lngBuffer = maxDistM / (111320 * Math.cos((lat * Math.PI) / 180));
  
  var startLatCell = Math.floor((lat - latBuffer) / spatialIndexCellSize);
  var endLatCell = Math.floor((lat + latBuffer) / spatialIndexCellSize);
  var startLngCell = Math.floor((lng - lngBuffer) / spatialIndexCellSize);
  var endLngCell = Math.floor((lng + lngBuffer) / spatialIndexCellSize);
  
  // 중복 제거용 캐시
  var seenIds = {};
  for (var latCell = startLatCell; latCell <= endLatCell; latCell++) {
    for (var lngCell = startLngCell; lngCell <= endLngCell; lngCell++) {
      var key = latCell + ',' + lngCell;
      var cellFeatures = spatialIndex[key];
      if (cellFeatures) {
        cellFeatures.forEach(function (feature) {
          var fid = feature.getId ? feature.getId() : null;
          if (fid === null) {
            if (!feature._spatialId) {
              feature._spatialId = Math.random() + '_' + Date.now();
            }
            fid = feature._spatialId;
          }
          if (!seenIds[fid]) {
            seenIds[fid] = true;
            candidates.push(feature);
          }
        });
      }
    }
  }
  
  // 후보군에 대해서만 거리 연산 실행 (전체 순회 대비 속도 비약적 향상)
  candidates.forEach(function (feature) {
    var geom = feature.getGeometry && feature.getGeometry();
    if (!geom || !geom.getType) return;
    var type = geom.getType();
    var dist = Infinity;
    var coords = [];

    if (type === 'Point') {
      var pt = geom.get();
      dist = getLatLngDistanceM(latLng, pt);
      coords.push(pt);
    } else if (type === 'LineString') {
      var arr = geom.getArray();
      var bestPt = null;
      for (var idx = 0; idx < arr.length - 1; idx++) {
        var res = getClosestPointOnSegment(latLng, arr[idx], arr[idx + 1]);
        if (res.distance < dist) {
          dist = res.distance;
          bestPt = res.latLng;
        }
      }
      if (bestPt) coords.push(bestPt);
      else coords = arr;
    } else if (type === 'Polygon') {
      var path = geom.getAt(0);
      if (path && path.getArray) {
        var arr = path.getArray();
        var bestPt = null;
        for (var idx = 0; idx < arr.length; idx++) {
          var nextIdx = (idx + 1) % arr.length;
          var res = getClosestPointOnSegment(latLng, arr[idx], arr[nextIdx]);
          if (res.distance < dist) {
            dist = res.distance;
            bestPt = res.latLng;
          }
        }
        if (bestPt) coords.push(bestPt);
        else coords = arr;
      }
    }

    if (dist <= maxDistM) {
      var layerName = feature.getProperty('layer') || '';
      var blockName = feature.getProperty('blockName') || '';
      var name = blockName || layerName || '알 수 없는 시설물';
      var bx = feature.getProperty('blockInsertX');
      var by = feature.getProperty('blockInsertY');
      
      // 동일한 블록 삽입 좌표(blockInsertXY)가 정확히 일치하는 경우에만 중복으로 처리
      // (이름이 같거나 거리가 비슷한 것은 별개 객체이므로 중복 처리하지 않음)
      var already = list.some(function (x) {
        if (bx != null && by != null && x.bx != null && x.by != null) {
          return Math.abs(x.bx - bx) < 0.001 && Math.abs(x.by - by) < 0.001;
        }
        return false;
      });
      
      if (!already) {
        list.push({
          name: name,
          layer: layerName,
          blockName: blockName,
          distance: dist,
          feature: feature,
          coord: coords[0] || latLng, 
          bx: bx != null ? parseFloat(bx) : null,
          by: by != null ? parseFloat(by) : null
        });
      }
    }
  });

  list.sort(function (a, b) { return a.distance - b.distance; });
  return list;
}

function showStreetlightBottomSheet(list, dxfCoords, latLng) {
  var sheet = getEl('bottom-sheet-flow');
  var content = getEl('bottom-sheet-content');
  var title = getEl('bottom-sheet-title');
  var closeBtn = document.getElementById('bottom-sheet-close');
  if (!sheet || !content) return;

  if (title) title.textContent = '📍 기능 선택 및 시설물 감지';
  content.innerHTML = '<p style="font-size:13px; color:#666; margin:0 0 10px 0;">수행할 기능 또는 사진을 추가할 시설물을 선택하세요.</p>';

  // 가로 정렬을 위한 컨테이너 생성 (일반사진 촬영 / 텍스트 삽입 버튼 가로 평행 배치)
  var btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';
  btnRow.style.marginBottom = '12px';

  // 1. 일반사진 촬영 고정 메뉴 추가
  var generalPhotoDiv = document.createElement('div');
  generalPhotoDiv.className = 'facility-list-item';
  generalPhotoDiv.style.flex = '1';
  generalPhotoDiv.style.margin = '0';
  generalPhotoDiv.style.background = '#e3f2fd';
  generalPhotoDiv.style.fontWeight = 'bold';
  generalPhotoDiv.style.color = '#0d47a1';
  generalPhotoDiv.style.textAlign = 'center';
  generalPhotoDiv.innerHTML = '📷 일반사진 촬영';
  generalPhotoDiv.addEventListener('click', function () {
    openFacilitySelectModal(dxfCoords, latLng);
  });
  btnRow.appendChild(generalPhotoDiv);

  // 2. 텍스트 삽입 고정 메뉴 추가
  var generalTextDiv = document.createElement('div');
  generalTextDiv.className = 'facility-list-item';
  generalTextDiv.style.flex = '1';
  generalTextDiv.style.margin = '0';
  generalTextDiv.style.background = '#efebe9';
  generalTextDiv.style.fontWeight = 'bold';
  generalTextDiv.style.color = '#4e342e';
  generalTextDiv.style.textAlign = 'center';
  generalTextDiv.innerHTML = '📝 텍스트 삽입';
  generalTextDiv.addEventListener('click', function () {
    pendingAddPosition = { x: dxfCoords.x, y: dxfCoords.y };
    hideStreetlightBottomSheet();
    showTextModal(null);
  });
  btnRow.appendChild(generalTextDiv);

  content.appendChild(btnRow);

  // 구분선 추가
  if (list && list.length > 0) {
    var divider = document.createElement('div');
    divider.style.borderBottom = '1px solid #e0e0e0';
    divider.style.margin = '10px 0';
    content.appendChild(divider);

    var sectionTitle = document.createElement('div');
    sectionTitle.style.fontSize = '12px';
    sectionTitle.style.fontWeight = 'bold';
    sectionTitle.style.color = '#555';
    sectionTitle.style.marginBottom = '8px';
    sectionTitle.textContent = '🔍 감지된 시설물 목록 (사진 또는 글자만 등록 선택)';
    content.appendChild(sectionTitle);

    list.forEach(function (item) {
      var matchedFacilities = getMatchingFacilities(item.name, item.layer);
      if (matchedFacilities.length === 0) {
        matchedFacilities = [item.name];
      }

      matchedFacilities.forEach(function (facType) {
        var card = document.createElement('div');
        card.className = 'facility-list-item';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';
        card.style.padding = '10px 12px';
        card.style.marginBottom = '8px';
        card.style.background = '#f9f9fb';
        card.style.border = '1px solid #e5e5ea';
        card.style.borderRadius = '8px';

        var infoDiv = document.createElement('div');
        infoDiv.style.display = 'flex';
        infoDiv.style.justifyContent = 'space-between';
        infoDiv.style.alignItems = 'center';

        var nameSpan = document.createElement('span');
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.fontSize = '14px';
        nameSpan.style.color = '#1c1c1e';
        nameSpan.textContent = facType;

        var subSpan = document.createElement('span');
        subSpan.style.fontSize = '11px';
        subSpan.style.color = '#8e8e93';
        subSpan.textContent = item.layer + ' (' + item.distance.toFixed(1) + 'm)';

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(subSpan);
        card.appendChild(infoDiv);

        // 액션 버튼 영역 (📷 사진촬영 vs 📝 글자만)
        var actRow = document.createElement('div');
        actRow.style.display = 'flex';
        actRow.style.gap = '8px';

        var photoBtn = document.createElement('button');
        photoBtn.type = 'button';
        photoBtn.className = 'btn';
        photoBtn.style.flex = '1';
        photoBtn.style.padding = '8px 4px';
        photoBtn.style.fontSize = '12px';
        photoBtn.style.fontWeight = 'bold';
        photoBtn.style.background = '#007AFF';
        photoBtn.style.color = '#fff';
        photoBtn.style.border = 'none';
        photoBtn.style.borderRadius = '6px';
        photoBtn.style.cursor = 'pointer';
        photoBtn.innerHTML = '📷 사진촬영';
        photoBtn.onclick = function (e) {
          e.stopPropagation();
          var customItem = Object.assign({}, item, { type: facType, name: facType });
          triggerStreetlightCamera(customItem, dxfCoords, latLng);
        };

        var textBtn = document.createElement('button');
        textBtn.type = 'button';
        textBtn.className = 'btn';
        textBtn.style.flex = '1';
        textBtn.style.padding = '8px 4px';
        textBtn.style.fontSize = '12px';
        textBtn.style.fontWeight = 'bold';
        textBtn.style.background = '#5856D6';
        textBtn.style.color = '#fff';
        textBtn.style.border = 'none';
        textBtn.style.borderRadius = '6px';
        textBtn.style.cursor = 'pointer';
        textBtn.innerHTML = '📝 글자만';
        textBtn.onclick = function (e) {
          e.stopPropagation();
          var customItem = Object.assign({}, item, { type: facType, name: facType });
          triggerStreetlightTextOnly(customItem, dxfCoords, latLng);
        };

        actRow.appendChild(photoBtn);
        actRow.appendChild(textBtn);
        card.appendChild(actRow);

        content.appendChild(card);
      });
    });
  } else {
    var emptyDiv = document.createElement('div');
    emptyDiv.style.fontSize = '12px';
    emptyDiv.style.color = '#999';
    emptyDiv.style.padding = '15px 5px';
    emptyDiv.style.textAlign = 'center';
    emptyDiv.textContent = '주변 2m 이내에 감지된 도면 객체가 없습니다.';
    content.appendChild(emptyDiv);
  }

  if (closeBtn && !closeBtn._bound) {
    closeBtn.addEventListener('click', hideStreetlightBottomSheet);
    closeBtn._bound = true;
  }

  sheet.classList.add('active');
}

function hideStreetlightBottomSheet() {
  if (typeof isCameraCapturing !== 'undefined' && isCameraCapturing) {
    return; // 카메라 촬영 세션 중에는 바텀시트 데이터 및 상태 초기화 금지
  }
  var sheet = getEl('bottom-sheet-flow');
  if (sheet) sheet.classList.remove('active');
  pendingStreetlightItem = null;
  pendingStreetlightDxfCoords = null;
  pendingStreetlightLatLng = null;
  pendingFacilityType = null;
  isAddingSubPhoto = false;
  pendingStreetlightSubPhotos = [];
  if (window.swThumbUrls) {
    window.swThumbUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    window.swThumbUrls = [];
  }
  if (streetlightPreviewObjectUrl) {
    URL.revokeObjectURL(streetlightPreviewObjectUrl);
    streetlightPreviewObjectUrl = null;
  }
  clearDomCache();
}

function triggerStreetlightCamera(item, dxfCoords, latLng) {
  pendingStreetlightItem = item;
  pendingStreetlightDxfCoords = dxfCoords;
  pendingStreetlightLatLng = latLng;
  pendingFacilityType = item.type || detectFacilityType(item.name, item.layer) || item.name;
  isAddingSubPhoto = false;

  // 바텀시트 활성 클래스를 제거하여 카메라 조작 중 외부 터치 이벤트에 의한 오작동 차단
  var sheet = getEl('bottom-sheet-flow');
  if (sheet) sheet.classList.remove('active');

  triggerCameraCapture();
}

function triggerStreetlightTextOnly(item, dxfCoords, latLng) {
  pendingStreetlightItem = item;
  pendingStreetlightDxfCoords = dxfCoords;
  pendingStreetlightLatLng = latLng;
  pendingFacilityType = item.type || detectFacilityType(item.name, item.layer) || item.name;

  // 기존 바텀시트 닫고 제원 입력 폼으로 전환 (pending 데이터 보존)
  var sheet = getEl('bottom-sheet-flow');
  if (sheet) sheet.classList.remove('active');
  showStreetlightInputForm(null, item, dxfCoords, latLng);
}

// 미감지 시설물 선택 및 일반사진 연동 팝업 (방안 1)
function openFacilitySelectModal(dxfCoords, latLng) {
  hideStreetlightBottomSheet();

  var modal = document.getElementById('facility-select-modal');
  var closeBtn = document.getElementById('facility-select-close');
  var selectEl = document.getElementById('facility-select-dropdown');
  var btnCam = document.getElementById('btn-proceed-facility-camera');
  var btnText = document.getElementById('btn-proceed-facility-textonly');
  var btnGen = document.getElementById('btn-proceed-general-photo');

  if (!modal || !selectEl) return;

  // 전체 시설물 목록 가나다순 채우기
  selectEl.innerHTML = '<option value="">선택 안 함 (기본 일반사진)</option>';
  var cfg = window.FACILITY_CONFIG || (typeof FACILITY_CONFIG !== 'undefined' ? FACILITY_CONFIG : {});
  var facKeys = Object.keys(cfg);
  facKeys.sort(function (a, b) { return a.localeCompare(b, 'ko'); });

  facKeys.forEach(function (k) {
    var opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k + ' [' + (cfg[k].prefix || k) + ']';
    selectEl.appendChild(opt);
  });

  function updateBtnVisibility() {
    var val = selectEl.value;
    if (val) {
      btnCam.style.display = 'block';
      btnText.style.display = 'block';
      btnCam.textContent = '📷 ' + val + ' 사진촬영 조사';
      btnText.textContent = '📝 ' + val + ' 글자만 등록';
      btnGen.style.display = 'none';
    } else {
      btnCam.style.display = 'none';
      btnText.style.display = 'none';
      btnGen.style.display = 'block';
    }
  }

  selectEl.value = '';
  updateBtnVisibility();
  selectEl.onchange = updateBtnVisibility;

  function closeModal() {
    modal.classList.remove('active');
  }

  closeBtn.onclick = closeModal;

  // 1) 시설물 사진촬영 조사
  btnCam.onclick = function () {
    var sel = selectEl.value;
    closeModal();
    if (sel && cfg[sel]) {
      var item = {
        name: sel,
        layer: cfg[sel].layer || (sel + '_T'),
        type: sel,
        distance: 0,
        coord: latLng
      };
      triggerStreetlightCamera(item, dxfCoords, latLng);
    }
  };

  // 2) 시설물 글자만 등록
  btnText.onclick = function () {
    var sel = selectEl.value;
    closeModal();
    if (sel && cfg[sel]) {
      var item = {
        name: sel,
        layer: cfg[sel].layer || (sel + '_T'),
        type: sel,
        distance: 0,
        coord: latLng
      };
      triggerStreetlightTextOnly(item, dxfCoords, latLng);
    }
  };

  // 3) 기본 일반사진 촬영
  btnGen.onclick = function () {
    closeModal();
    pendingAddPosition = { x: dxfCoords.x, y: dxfCoords.y };
    pendingStreetlightItem = null;
    pendingStreetlightDxfCoords = null;
    pendingStreetlightLatLng = null;
    pendingFacilityType = null;
    isAddingSubPhoto = false;

    triggerCameraCapture();
  };

  modal.classList.add('active');
}

// 입력란 포커스 시 키보드 가림 방지 스크롤 자동 조정
document.addEventListener('focusin', function (e) {
  var target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
    setTimeout(function () {
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }
}, true);

function tryAutoLoadLastProject() {
  if (typeof localStorage === 'undefined') return;
  var lastDxfFile = localStorage.getItem('dmap:lastDxfFile');
  if (!lastDxfFile) return;

  showLoading(true);
  window.localStore.loadProject(lastDxfFile).then(function (project) {
    if (project && project.dxfData) {
      // 데이터베이스에 저장되어 있는 도면 캐시 데이터로 복원
      var restoredImageRefs = (project.dxfImageRefs || []).map(function (r) {
        return { id: r.id, x: r.x, y: r.y, fileName: r.fileName, file: null };
      });
      
      dxfData = project.dxfData;
      dxfImageRefs = restoredImageRefs;
      dxfFileName = dxfFileFullName = lastDxfFile;
      
      showViewer();
      applyDxfToMap();
      updateFileNameDisplay();
      drawDxfImageMarkers();
      
      // 사진 및 텍스트 데이터 로딩 (메타데이터 및 IndexedDB 완전 통합 로딩)
      texts = project.texts || [];
      return loadMetadataAndDisplay(lastDxfFile).then(function () {
        fitDxfToView();
      });
    } else {
      // 도면 캐시가 비어있거나 수동 삭제되어 도면을 찾을 수 없는 경우
      localStorage.removeItem('dmap:lastDxfFile');
    }
  }).catch(function (err) {
    console.warn('이전 도면 자동 로드 실패:', err);
    localStorage.removeItem('dmap:lastDxfFile');
  }).finally(function () {
    setTimeout(function () { 
      showLoading(false); 
      checkPromptStorageFolder();
    }, 100);
  });
}

/** 객체감지 조사 바텀시트에서 추가 사진 촬영 시 임시 배열에 추가 */
function addSubPhotoToPendingStreetlight(file) {
  var targetSize = getImageTargetSize();
  var numInput = document.getElementById('sw-form-num');
  var numTextVal = numInput ? numInput.value : '0';
  var nextSubSuffix = pendingStreetlightSubPhotos.length;
  var newFileName = generatePhotoFileName(numTextVal + '_' + nextSubSuffix);

  // [갤럭시/아이폰 최적화] 촬영 즉시 백그라운드 사전 압축 시작 및 즉시 썸네일 등록
  var subCompressPromise = (targetSize != null)
    ? compressImage(file, targetSize).catch(function () { return file; })
    : Promise.resolve(file);

  var subItem = {
    subIndex: nextSubSuffix,
    fileName: newFileName,
    blob: file,
    compressPromise: subCompressPromise
  };
  pendingStreetlightSubPhotos.push(subItem);

  subCompressPromise.then(function (compressedBlob) {
    subItem.blob = compressedBlob;
  });

  isAddingSubPhoto = false;
  showToast('추가 사진이 등록되었습니다. (총 ' + pendingStreetlightSubPhotos.length + '장)');
  if (typeof window.renderStreetlightThumbnails === 'function') {
    window.renderStreetlightThumbnails();
  }
}

/** 서브 사진을 현재 편집 중인 메인 사진에 추가 (저장 버튼 누를 때까지 메모리 버퍼에만 유지) */
function addSubPhotoToCurrentPhoto(file) {
  if (!editingPhotoId || !window.localStore || !dxfFileFullName) return;
  var p = photos.filter(function (x) { return x.id === editingPhotoId; })[0];
  if (!p) return;

  if (!pendingFacilitySurvey || pendingFacilitySurvey.facilityId !== editingPhotoId) {
    pendingFacilitySurvey = {
      isNew: false,
      facilityId: editingPhotoId,
      newSubPhotos: []
    };
  }

  var targetSize = getImageTargetSize();
  var existingCount = (p.subPhotos && p.subPhotos.length > 0) ? p.subPhotos.length : 1;
  var nextIdx = existingCount + pendingFacilitySurvey.newSubPhotos.length;

  var subItem = {
    subIndex: nextIdx,
    blob: file,
    file: file,
    isNewInMemory: true
  };
  pendingFacilitySurvey.newSubPhotos.push(subItem);

  if (targetSize != null) {
    compressImage(file, targetSize).then(function (compressedBlob) {
      subItem.blob = compressedBlob;
      renderPhotoModalThumbnails();
    }).catch(function () {
      renderPhotoModalThumbnails();
    });
  }

  isAddingSubPhoto = false;
  var totalCount = existingCount + pendingFacilitySurvey.newSubPhotos.length;
  showToast('추가 사진이 등록되었습니다. (총 ' + totalCount + '장, [저장] 시 반영)');
  renderPhotoModalThumbnails();
}

/** 이미지 슬라이드 뷰어 열기 */
function openImageViewer(subs, startIndex) {
  imageViewerPhotos = subs || [];
  imageViewerIndex = startIndex >= 0 && startIndex < imageViewerPhotos.length ? startIndex : 0;
  
  var viewer = getEl('image-viewer-modal');
  if (!viewer) return;

  // 네비게이션 버튼 표시 여부
  var prevBtn = document.getElementById('image-viewer-prev');
  var nextBtn = document.getElementById('image-viewer-next');
  if (prevBtn && nextBtn) {
    if (imageViewerPhotos.length <= 1) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
    } else {
      prevBtn.style.display = 'block';
      nextBtn.style.display = 'block';
    }
  }

  viewer.classList.add('active');
  showImageViewerSlide(imageViewerIndex);
}

/** 이미지 슬라이더 닫기 */
function closeImageViewer() {
  var viewer = getEl('image-viewer-modal');
  if (viewer) viewer.classList.remove('active');
  if (imageViewerObjectUrl) {
    URL.revokeObjectURL(imageViewerObjectUrl);
    imageViewerObjectUrl = null;
  }
  imageViewerPhotos = [];
}

/** 특정 슬라이드 이미지 출력 및 인디케이터 갱신 */
function showImageViewerSlide(index) {
  if (index < 0 || index >= imageViewerPhotos.length) return;
  imageViewerIndex = index;

  var img = document.getElementById('image-viewer-img');
  var title = document.getElementById('image-viewer-title');
  var dots = document.getElementById('image-viewer-dots');
  if (!img) return;

  var item = imageViewerPhotos[index];
  if (imageViewerObjectUrl) {
    URL.revokeObjectURL(imageViewerObjectUrl);
    imageViewerObjectUrl = null;
  }

  var currentBlob = item.blob || (window._photoBlobCache && item.fileName ? window._photoBlobCache[item.fileName] : null);
  if (currentBlob) {
    imageViewerObjectUrl = URL.createObjectURL(currentBlob);
    img.src = imageViewerObjectUrl;
  } else if (item.fileName && window.localFs && window.localFs.isSupported() && window.localFs.hasBaseDir()) {
    var viewerDrawing = item.drawingFile || dxfFileFullName;
    window.localFs.getPhotoBlob(viewerDrawing, item.fileName).then(function (b) {
      if (b) {
        item.blob = b;
        if (window._photoBlobCache) window._photoBlobCache[item.fileName] = b;
        if (imageViewerIndex === index) {
          if (imageViewerObjectUrl) URL.revokeObjectURL(imageViewerObjectUrl);
          imageViewerObjectUrl = URL.createObjectURL(b);
          img.src = imageViewerObjectUrl;
        }
      }
    }).catch(function () {});
  }

  if (title) {
    title.textContent = (imageViewerIndex + 1) + ' / ' + imageViewerPhotos.length;
  }

  // 인디케이터 생성
  if (dots) {
    dots.innerHTML = '';
    imageViewerPhotos.forEach(function (_, i) {
      var dot = document.createElement('div');
      dot.className = 'viewer-dot' + (i === imageViewerIndex ? ' active' : '');
      dots.appendChild(dot);
    });
  }
  
  // 모달 썸네일 액티브 상태 동기화
  var thumbContainer = getEl('photo-modal-thumbnails');
  if (thumbContainer) {
    var thumbs = thumbContainer.querySelectorAll('.photo-thumb-item');
    thumbs.forEach(function (t, i) {
      if (i === index) {
        t.classList.add('active');
        t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        t.classList.remove('active');
      }
    });
  }
}

// 뷰어 이벤트 리스너 초기화
document.addEventListener('DOMContentLoaded', function () {
  updateCameraModeMenuLabel();
  bindFastCameraEvents();
  var closeBtn = document.getElementById('image-viewer-close');
  if (closeBtn) closeBtn.addEventListener('click', closeImageViewer);

  var prevBtn = document.getElementById('image-viewer-prev');
  if (prevBtn) prevBtn.addEventListener('click', function () {
    if (imageViewerPhotos.length <= 1) return;
    var nextIdx = imageViewerIndex - 1;
    if (nextIdx < 0) nextIdx = imageViewerPhotos.length - 1;
    showImageViewerSlide(nextIdx);
  });

  var nextBtn = document.getElementById('image-viewer-next');
  if (nextBtn) nextBtn.addEventListener('click', function () {
    if (imageViewerPhotos.length <= 1) return;
    var nextIdx = imageViewerIndex + 1;
    if (nextIdx >= imageViewerPhotos.length) nextIdx = 0;
    showImageViewerSlide(nextIdx);
  });

  // 터치 스와이프 지원 (모바일 슬라이드)
  var startX = 0;
  var endX = 0;
  var viewer = getEl('image-viewer-modal');
  if (viewer) {
    viewer.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    viewer.addEventListener('touchend', function (e) {
      endX = e.changedTouches[0].clientX;
      var diff = startX - endX;
      if (Math.abs(diff) > 50) { // 50px 이상 쓸었을 때
        if (imageViewerPhotos.length <= 1) return;
        if (diff > 0) {
          // 왼쪽으로 쓸기 -> 다음 이미지
          var nextIdx = imageViewerIndex + 1;
          if (nextIdx >= imageViewerPhotos.length) nextIdx = 0;
          showImageViewerSlide(nextIdx);
        } else {
          // 오른쪽으로 쓸기 -> 이전 이미지
          var nextIdx = imageViewerIndex - 1;
          if (nextIdx < 0) nextIdx = imageViewerPhotos.length - 1;
          showImageViewerSlide(nextIdx);
        }
      }
    }, { passive: true });
  }
});



