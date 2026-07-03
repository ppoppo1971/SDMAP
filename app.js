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
var streetlightPreviewObjectUrl = null; // 이미지 프리뷰용 Object URL 캐시

// 모든 시설물 통합 캐시 스펙 저장 객체
var lastSpecs = {};

// 30여 개 시설물 제원 포맷 및 입력 양식 설정 테이블
var FACILITY_CONFIG = {
  '참고사항': {
    title: '참고사항',
    layer: '참고사항_T',
    prefix: '',
    fields: [
      { id: 'memo', label: '메모 (참고 내용 입력)', type: 'text', placeholder: '참고 메모 입력', default: '내용' }
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
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '옹벽': {
    title: '옹벽',
    layer: '옹벽_T',
    prefix: '옹벽',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['중력식', '반중력식', '보강토', '기타'], default: '중력식' },
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '절개면': {
    title: '절개면',
    layer: '절개면_T',
    prefix: '절개면',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['흙', '암사면', '혼합사면', '기타'], default: '흙' },
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'gradient', label: '경사도', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '성토면': {
    title: '성토면',
    layer: '성토면_T',
    prefix: '성토면',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['흙', '암사면', '혼합사면', '기타'], default: '흙' },
      { id: 'maxH', label: '최대 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'minH', label: '최소 높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'gradient', label: '경사도', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '배수암거': {
    title: '배수암거',
    layer: '배수암거_T',
    prefix: '배수암거',
    joinFormat: 'dimension/type/wing/sump',
    fields: [
      { id: 'width', label: '가로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'height', label: '세로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'type', label: '재질', type: 'select', options: ['콘크리트', '기타'], default: '콘크리트' },
      { id: 'wing', label: '날개벽', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'sump', label: '집수정', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '배수관': {
    title: '배수관',
    layer: '배수관_T',
    prefix: '배수관',
    fields: [
      { id: 'spec', label: '규격', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'type', label: '재질', type: 'select', options: ['흄관', 'PE', 'PVC', 'CSP', '기타'], default: '흄관' },
      { id: 'length', label: '연장', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'wing', label: '날개벽', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'sump', label: '집수정', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '측구': {
    title: '측구',
    layer: '측구_T',
    prefix: '측구',
    joinFormat: 'type/dimension',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['L형', 'U형', 'V형', '토사형', '옹벽형', '기타'], default: 'L형' },
      { id: 'width', label: '가로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'height', label: '세로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '중앙분리대': {
    title: '중앙분리대',
    layer: '중앙분리대_T',
    prefix: '중앙분리대',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['가드레일', '가드펜스', '가드파이프', '연석형', '기타'], default: '가드레일' },
      { id: 'material', label: '재질', type: 'select', options: ['탄소', '기타'], default: '탄소' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '차량방호시설': {
    title: '차량방호시설',
    layer: '차량방호_T',
    prefix: '차량방호',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['가드레일', '가드펜스', '가드파이프', '연석형', '기타'], default: '가드레일' },
      { id: 'material', label: '재질', type: 'select', options: ['탄소', '기타'], default: '탄소' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '낙석방지시설': {
    title: '낙석방지시설',
    layer: '낙석방지_T',
    prefix: '낙석방지',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['낙석방지책', '낙석방지망', '기타'], default: '낙석방지책' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '주의표지': {
    title: '주의표지',
    layer: '주의표지_T',
    prefix: '주의표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '내용' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '기타표지': {
    title: '기타표지',
    layer: '기타표지_T',
    prefix: '기타표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '내용' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '규제표지': {
    title: '규제표지',
    layer: '규제표지_T',
    prefix: '규제표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '내용' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '지시표지': {
    title: '지시표지',
    layer: '지시표지_T',
    prefix: '지시표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '내용' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '보조표지': {
    title: '보조표지',
    layer: '보조표지_T',
    prefix: '보조표지',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '내용' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '복합', '문형식', '현수식', '기타'], default: '단주' }
    ]
  },
  '교통기타': {
    title: '교통기타',
    layer: '교통기타_T',
    prefix: '교통기타',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '내용' },
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
      { id: 'count', label: '수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  'CCTV': {
    title: 'CCTV',
    layer: 'CCTV_T',
    prefix: 'CCTV',
    fields: [
      { id: 'type', label: '종류', type: 'select', options: ['무인단속카메라', '과속카메라', '기타'], default: '무인단속카메라' },
      { id: 'count', label: '수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '새주소': {
    title: '새주소',
    layer: '새주소_T',
    prefix: '새주소',
    fields: [
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '내용' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '부착', '현수식', '기타'], default: '단주' }
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
      { id: 'count', label: '수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'support', label: '지주형식', type: 'select', options: ['측주', '단주', '기타'], default: '측주' },
      { id: 'pedestrianType', label: '보행등 구분', type: 'select', options: ['보행등무', '보행등', '기타'], default: '보행등무' },
      { id: 'pedestrianCount', label: '보행등 수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
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
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
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
      { id: 'width', label: '가로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'height', label: '세로', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
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
      { id: 'bridgeName', label: '교량명', type: 'text', placeholder: '교량명 입력', default: '내용' },
      { id: 'material', label: '재질', type: 'text', placeholder: '재질 입력', default: '종류' },
      { id: 'width', label: '폭', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' },
      { id: 'height', label: '높이', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '터널': {
    title: '터널',
    layer: '터널_T',
    prefix: '터널',
    fields: [
      { id: 'height', label: '높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'limitH', label: '통행제한높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'lanes', label: '차로수', type: 'number', placeholder: '숫자 입력', default: '기타' },
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
      { id: 'limitH', label: '통행제한높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'structure', label: '폭원 (구체, 계단, 기타)', type: 'select', options: ['구체', '계단', '기타'], default: '구체' },
      { id: 'lightInfo', label: '조명시설 종류 수량 (직접 입력)', type: 'text', placeholder: '조명 시설 종류 및 수량 입력', default: '내용' }
    ]
  },
  '지하차도': {
    title: '지하차도',
    layer: '지하차도_T',
    prefix: '지하차도',
    fields: [
      { id: 'name', label: '레이어명', type: 'text', default: '지하차도', readonly: true },
      { id: 'lightInfo', label: '조명시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'fireInfo', label: '소화시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'finish', label: '마감재 천정 벽체 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'wallH', label: '옹벽 높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'vent', label: '환기방식 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'drain', label: '배수시설 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' }
    ]
  },
  '지하보도': {
    title: '지하보도',
    layer: '지하보도_T',
    prefix: '지하보도',
    fields: [
      { id: 'name', label: '레이어명', type: 'text', default: '지하보도', readonly: true },
      { id: 'lightInfo', label: '조명시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'fireInfo', label: '소화시설 종류 수량 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'finish', label: '마감재 천정 벽체 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'wallH', label: '옹벽 높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'vent', label: '환기방식 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' },
      { id: 'drain', label: '배수시설 (직접 입력)', type: 'text', placeholder: '입력', default: '내용' }
    ]
  },
  '오르막차로': {
    title: '오르막차로',
    layer: '오르막차로_T',
    prefix: '오르막차로',
    fields: [
      { id: 'lanes', label: '차로수', type: 'number', placeholder: '숫자 입력', default: '기타' },
      { id: 'width', label: '폭 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'gradient', label: '경사 (%)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' }
    ]
  },
  '교차시설': {
    title: '교차시설',
    layer: '교차시설_T',
    prefix: '교차시설',
    fields: [
      { id: 'width', label: '폭 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'height', label: '높이 (m)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' },
      { id: 'angle', label: '교차각도 (°)', type: 'number', mode: 'decimal', placeholder: '숫자 입력', default: '기타' }
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
      { id: 'content', label: '내용', type: 'text', placeholder: '내용 직접 입력', default: '내용' },
      { id: 'support', label: '지주형식', type: 'select', options: ['단주', '복주', '측주', '편지', '부착', '현수식', '기타'], default: '단주' }
    ]
  },
  '고가도로': {
    title: '고가도로',
    layer: '고가도로_T',
    prefix: '고가도로',
    fields: [
      { id: 'light', label: '조명시설종류수량', type: 'text', placeholder: '조명 종류 및 수량 입력', default: '내용' },
      { id: 'noise', label: '방음시설종류 (흡음, 반사, 혼합, 기타)', type: 'select', options: ['흡음', '반사', '혼합', '기타'], default: '흡음' }
    ]
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
var exportInfo = null; // 내보내기 방식 선택 모달용 { photos, totalSizeMB }
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

  document.getElementById('menu-image-size').addEventListener('click', function () {
    slideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    showImageSizeModal();
  });
  document.getElementById('menu-export').addEventListener('click', function () {
    slideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    if (!dxfFileFullName || !window.localStore) {
      alert('저장된 자료가 없습니다.');
      return;
    }
    exportLocalData();
  });

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

  var objVisModal = document.getElementById('object-visibility-modal');
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

  var exportMethodModal = document.getElementById('export-method-modal');
  var exportInfoBox = document.getElementById('export-info-box');
  var exportMethodClose = document.getElementById('export-method-close');
  var exportZipBtn = document.getElementById('export-zip-btn');
  var exportIndividualBtn = document.getElementById('export-individual-btn');
  if (exportMethodClose) exportMethodClose.addEventListener('click', hideExportMethodModal);
  if (exportZipBtn) exportZipBtn.addEventListener('click', exportAsZip);
  if (exportIndividualBtn) exportIndividualBtn.addEventListener('click', exportAsIndividual);
  if (exportMethodModal) {
    exportMethodModal.addEventListener('click', function (e) {
      if (e.target === exportMethodModal) hideExportMethodModal();
    });
  }

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

  var pmodeBtn = document.getElementById('pmode-btn');
  if (pmodeBtn) {
    pmodeBtn.addEventListener('click', function () {
      window.isPMode = !window.isPMode;
      if (window.isPMode) {
        pmodeBtn.classList.add('active');
        showToast('P 모드(사진/메모 우선) 켜짐');
      } else {
        pmodeBtn.classList.remove('active');
        showToast('P 모드(사진/메모 우선) 꺼짐');
      }
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

function exportLocalData() {
  window.localStore.loadPhotos(dxfFileFullName).then(function (photosList) {
    var totalSize = 0;
    if (photosList && photosList.length) {
      photosList.forEach(function (p) { if (p.blob) totalSize += p.blob.size; });
    }
    exportInfo = {
      photos: photosList || [],
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(1)
    };
    showExportMethodModal();
  }).catch(function (err) {
    console.error('내보내기 준비 실패:', err);
    alert('내보내기 준비 실패: ' + (err && err.message ? err.message : err));
  });
}

function showExportMethodModal() {
  var modal = document.getElementById('export-method-modal');
  var infoBox = document.getElementById('export-info-box');
  if (modal) modal.classList.add('active');
  if (infoBox && exportInfo) {
    infoBox.textContent = '사진 ' + exportInfo.photos.length + '장, 총 ' + exportInfo.totalSizeMB + 'MB';
  }
}

function hideExportMethodModal() {
  var modal = document.getElementById('export-method-modal');
  if (modal) modal.classList.remove('active');
  exportInfo = null;
}

function exportAsZip() {
  hideExportMethodModal();
  if (!dxfFileFullName || !window.localStore) return;
  showLoading(true);
  window.localStore.exportAsZipOnly(dxfFileFullName).then(function () {
    showLoading(false);
    alert('내보내기 완료.');
  }).catch(function (err) {
    showLoading(false);
    alert('내보내기 실패: ' + (err && err.message ? err.message : err));
  });
}

function exportAsIndividual() {
  hideExportMethodModal();
  if (!dxfFileFullName || !window.localStore) return;
  showLoading(true);
  window.localStore.exportProjectSequential(dxfFileFullName, function (cur, total, name) {
    console.log('내보내기 ' + cur + '/' + total + ' ' + name);
  }).then(function () {
    showLoading(false);
    alert('내보내기 완료.');
  }).catch(function (err) {
    showLoading(false);
    alert('내보내기 실패: ' + (err && err.message ? err.message : err));
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
    setTimeout(function () { showLoading(false); }, 100);
  });
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
  if (!map || !map.data) return;
  map.data.forEach(function (feature) {
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
  var geoJson = window.DxfToGeoJSON.dxfToGeoJSON(dxfData);
  map.data.forEach(function (feature) { map.data.remove(feature); });
  if (geoJson.features && geoJson.features.length > 0) {
    map.data.addGeoJson(geoJson);
    buildSpatialIndex(); // 공간 인덱스 구축
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
    dxfBoundsLatLng = boundsFromGeoJSON(geoJson);
  } else {
    dxfBoundsLatLng = null;
  }
}

function showDxfTextModal(text) {
  var modal = document.getElementById('dxf-text-modal');
  var body = document.getElementById('dxf-text-modal-body');
  if (body) body.textContent = text == null ? '' : String(text);
  if (modal) modal.classList.add('active');
}

function hideDxfTextModal() {
  var modal = document.getElementById('dxf-text-modal');
  if (modal) modal.classList.remove('active');
}

function bindDxfTextModal() {
  var modal = document.getElementById('dxf-text-modal');
  var closeBtn = document.getElementById('dxf-text-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', hideDxfTextModal);
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target === modal) hideDxfTextModal();
  });
}

function showDeleteDataModal() {
  var modal = document.getElementById('delete-data-modal');
  if (modal) modal.classList.add('active');
}

function hideDeleteDataModal() {
  var modal = document.getElementById('delete-data-modal');
  if (modal) modal.classList.remove('active');
}

function deleteDataForProject() {
  if (!dxfFileFullName || !window.localStore) {
    alert('저장된 자료가 없습니다.');
    return;
  }
  if (!confirm('현재 도면의 모든 사진, 메모, 텍스트 데이터를 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.')) return;

  var beforeTextCount = texts.length;
  window.localStore.deleteProjectData(dxfFileFullName).then(function (deletedPhotoCount) {
    texts = [];
    photos = [];
    
    // 로컬 스토리지에 남아있던 전역 사진번호 카운터 및 최근 도면 정보도 초기화
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('dmap:lastPhotoNumber');
      localStorage.removeItem('dmap:lastDxfFile');
    }
    
    drawPhotoMarkers();
    drawTextMarkers();
    hideDeleteDataModal();
    hidePhotoModal();

    if (deletedPhotoCount === 0 && beforeTextCount === 0) {
      alert('삭제할 데이터가 없습니다.');
    } else {
      alert('사진 ' + deletedPhotoCount + '개, 텍스트 ' + beforeTextCount + '개 일괄 삭제 완료');
    }
  }).catch(function (err) {
    console.error('자료 삭제 실패:', err);
    alert('삭제 실패: ' + (err && err.message ? err.message : '알 수 없음'));
  });
}

function bindDeleteDataModal() {
  var modal = document.getElementById('delete-data-modal');
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
  var modal = document.getElementById('crs-modal');
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
  var modal = document.getElementById('crs-modal');
  if (modal) modal.classList.remove('active');
  // 취소 시 대기 중인 파일 로드 정보 초기화
  pendingLoadFile = null;
  pendingLoadFolderFiles = null;
}

function bindCrsModal() {
  var modal = document.getElementById('crs-modal');
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
  if (el) {
    var sizeText = imageSizeSetting === 'original' ? '원본' : imageSizeSetting;
    el.textContent = (dxfFileName || '도면') + ' [' + sizeText + ']';
  }
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
  switch (imageSizeSetting) {
    case '500KB': return 500 * 1024;
    case '1MB': return 1024 * 1024;
    case '2MB': return 2 * 1024 * 1024;
    case 'original': return null;
    default: return 2 * 1024 * 1024;
  }
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
  var modal = document.getElementById('image-size-modal');
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
  var modal = document.getElementById('image-size-modal');
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
  var modal = document.getElementById('image-size-modal');
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
  var modal = document.getElementById('object-visibility-modal');
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
  var modal = document.getElementById('object-visibility-modal');
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
  ]).then(function (res) {
    var project = res[0] || {};
    var loadedPhotos = res[1] || [];
    texts = project.texts || [];
    loadedPhotos.forEach(function (p) {
      photos.push({
        id: p.id, x: p.x, y: p.y, width: p.width, height: p.height,
        blob: p.blob, memo: p.memo || '', fileName: p.fileName || '',
        createdAt: p.createdAt, updatedAt: p.updatedAt,
        numTextId: p.numTextId,
        specTextId: p.specTextId,
        specTextIds: p.specTextIds || null,
        facilityType: p.facilityType,
        additionalTypes: p.additionalTypes || null
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
  var sheet = document.getElementById('bottom-sheet-flow');
  var content = document.getElementById('bottom-sheet-content');
  var title = document.getElementById('bottom-sheet-title');
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
    if (isUploaded) {
      markerColor = hasMemo ? '#9B51E0' : '#FF0000';
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
    
    var sheet = document.getElementById('bottom-sheet-flow');
    if (sheet && sheet.classList.contains('active')) {
      if (e.target && !sheet.contains(e.target)) {
        hideStreetlightBottomSheet();
      }
    }
  }, { passive: true });
  document.addEventListener('mousedown', function (e) {
    if (contextMenuEl && contextMenuEl.classList.contains('active')) {
      if (e.target && !contextMenuEl.contains(e.target)) hideContextMenu();
    }
    
    var sheet = document.getElementById('bottom-sheet-flow');
    if (sheet && sheet.classList.contains('active')) {
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
    
    if (!window.isPMode) {
      // 2m 이내 시설물 탐색 및 유효한 시설물 유형(석축/측구/가로등)만 필터링
      var nearby = findNearbyFacilities(latLng, 2.0);
      nearby = nearby.filter(function (item) {
        return detectFacilityType(item.name, item.layer) !== null;
      });

      if (nearby && nearby.length > 0) {
        var dxfCoords = latLngToDxf(latLng);
        showStreetlightBottomSheet(nearby, dxfCoords, latLng);
        return;
      }
    }

    var xy = latLngToDxf(latLng);
    if (xy) {
      pendingAddPosition = { x: xy.x, y: xy.y };
      lastLongPressEndTime = Date.now();
      contextMenuEl.classList.add('active');
      contextMenuEl.style.left = (clientX != null ? clientX : window.innerWidth / 2) + 'px';
      contextMenuEl.style.top = (clientY != null ? clientY : window.innerHeight / 2) + 'px';
    }
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

function bindContextMenu() {
  if (!contextMenuEl) return;
  document.getElementById('camera-btn').addEventListener('click', function () {
    contextMenuEl.classList.remove('active');
    var input = document.getElementById('camera-input');
    if (input) { input.click(); }
  });
  document.getElementById('text-btn').addEventListener('click', function () {
    contextMenuEl.classList.remove('active');
    pendingAddPosition && showTextModal(null);
  });
  document.getElementById('camera-input').addEventListener('change', function (e) {
    var file = e.target && e.target.files[0];
    if (file) {
      if (isAddingSubPhoto) {
        if (editingPhotoId) {
          // 일반사진 조사 추가사진 촬영
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
    }
    e.target.value = '';
    isAddingSubPhoto = false;
  });
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
  var id = 'photo-' + Date.now();
  var numTextId = 'text-num-' + Date.now();
  var targetSize = getImageTargetSize();

  // 기존 도면 및 localStr을 종합하여 다음 사진번호 획득
  var nextPhotoNum = getNextPhotoNumber();

  var numTextObj = {
    id: numTextId,
    x: xy.x,
    y: xy.y,
    text: nextPhotoNum,
    fontSize: 12,
    layer: '사진번호'
  };
  texts.push(numTextObj);

  function finish(blob) {
    // 메인 사진은 접미사 없이 원래의 사진번호 네이밍으로 생성
    var mainFileName = generatePhotoFileName(nextPhotoNum);
    var photo = {
      id: id, x: xy.x, y: xy.y, width: 1, height: 1,
      blob: blob, memo: '', fileName: mainFileName,
      createdAt: new Date().toISOString(),
      numTextId: numTextId,
      subPhotos: [
        { subIndex: 0, fileName: mainFileName, blob: blob }
      ]
    };
    photos.push(photo);

    Promise.all([
      window.localStore.savePhoto(dxfFileFullName, photo),
      window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() })
    ]).then(function () {
      drawPhotoMarkers();
      drawTextMarkers();
      pendingAddPosition = null;
      showToast('사진이 추가되었습니다.');
      isNewPhotoPending = true;
      showPhotoModal(id); // 저장 완료 즉시 사진 뷰어를 띄움
    }).catch(function (err) {
      console.error('사진 저장 실패:', err);
      alert('데이터 저장소에 기록하는 도중 오류가 발생해 사진을 저장하지 못했습니다.');
    });
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
    var valIdx = 0;
    config.fields.forEach(function (field) {
      if (field.id === 'name') {
        values['name'] = config.title;
        return;
      }
      values[field.id] = parts[valIdx] !== undefined ? parts[valIdx] : (field.default || '');
      valIdx++;
    });
  }

  return values;
}

function showPhotoModal(photoId) {
  editingDxfImageRef = null;
  
  // 동일한 사진을 다시 여는 경우 기존 이미지 객체 URL을 해제하지 않고 유지하여 깜빡임 및 비동기 중단 버그 방지
  var isSamePhoto = (editingPhotoId === photoId);
  if (!isSamePhoto) {
    if (dxfImageObjectUrl) {
      URL.revokeObjectURL(dxfImageObjectUrl);
      dxfImageObjectUrl = null;
    }
  }
  
  editingPhotoId = photoId;
  var modal = document.getElementById('photo-modal');
  var img = document.getElementById('photo-modal-img');
  var memo = document.getElementById('photo-modal-memo');
  var titleEl = document.getElementById('photo-modal-title');
  var actionsEl = document.getElementById('photo-modal-actions');
  var noFileEl = document.getElementById('photo-modal-no-file');
  if (!modal || !img || !memo) return;
  var p = photos.filter(function (x) { return x.id === photoId; })[0];
  if (!p) { modal.classList.remove('active'); return; }
  if (titleEl) titleEl.textContent = '사진';
  if (actionsEl) actionsEl.style.display = 'flex';
  if (noFileEl) noFileEl.style.display = 'none';
  memo.style.display = 'block';
  memo.value = p.memo || '';
  img.style.display = 'block';

  // 사진추가 버튼 표시 (촬영 사진일 때만)
  var addBtn = document.getElementById('photo-modal-add-btn');
  if (addBtn) addBtn.style.display = 'inline-block';

  // 기존 subPhoto object URL 해제
  subPhotoObjectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
  subPhotoObjectUrls = [];
  isAddingSubPhoto = false;

  // subPhotos 썸네일 렌더링
  var thumbContainer = document.getElementById('photo-modal-thumbnails');
  if (thumbContainer) {
    thumbContainer.innerHTML = '';
    var subs = p.subPhotos || [];
    if (subs.length > 1) {
      subs.forEach(function (sp, idx) {
        var thumbDiv = document.createElement('div');
        thumbDiv.className = 'photo-thumb-item' + (idx === 0 ? ' active' : '');
        var thumbImg = document.createElement('img');
        if (sp.blob) {
          var objUrl = URL.createObjectURL(sp.blob);
          subPhotoObjectUrls.push(objUrl);
          thumbImg.src = objUrl;
        }
        thumbDiv.appendChild(thumbImg);
        var indexLabel = document.createElement('span');
        indexLabel.className = 'thumb-index';
        indexLabel.textContent = String(idx + 1);
        thumbDiv.appendChild(indexLabel);
        thumbDiv.addEventListener('click', function () {
          openImageViewer(subs, idx);
        });
        thumbContainer.appendChild(thumbDiv);
      });
    }
  }

  // 메인 이미지 클릭 시 이미지 뷰어 열기
  img.onclick = function () {
    var subs = p.subPhotos || [];
    if (subs.length > 0) {
      openImageViewer(subs, 0);
    } else if (p.blob) {
      openImageViewer([{ blob: p.blob, fileName: p.fileName }], 0);
    }
  };
  
  if (!isSamePhoto) {
    img.src = '';
  }

  var dynamicFieldsContainer = document.getElementById('photo-modal-dynamic-fields');
  if (dynamicFieldsContainer) {
    dynamicFieldsContainer.innerHTML = '';
    
    // 안전장치: 사진 객체가 존재하는 이상 제원 결합 폼을 언제든 채울 수 있도록 무조건 활성화합니다.
    dynamicFieldsContainer.style.display = 'flex';
    dynamicFieldsContainer.style.flexDirection = 'column';
    dynamicFieldsContainer.style.gap = '8px';

    var numTextObj = p.numTextId ? texts.filter(function (t) { return t.id === p.numTextId; })[0] : null;
    var numTextVal = numTextObj ? numTextObj.text : '';

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

    // 실시간 미리보기용 컨테이너 생성
    var previewGroup = document.createElement('div');
    previewGroup.className = 'form-group';
    previewGroup.style.background = '#F2F2F7';
    previewGroup.style.padding = '8px 12px';
    previewGroup.style.borderRadius = '8px';
    previewGroup.style.border = '1px solid #E5E5EA';
    previewGroup.innerHTML = 
      '<label style="color:#5856D6; font-size:11px; margin-bottom:2px;">수정 저장 제원 일괄 미리보기</label>' +
      '<div id="pm-spec-preview" style="font-size:12px; color:#1C1C1E; word-break:break-all; min-height:16px; white-space:pre-line;"></div>';
    dynamicFieldsContainer.appendChild(previewGroup);

    // 실시간 다중 폼 전체 미리보기 업데이트 함수 정의
    window.updateAllPreviewsPM = function () {
      var previewEl = document.getElementById('pm-spec-preview');
      if (!previewEl) return;
      var cards = pmFormListContainer.querySelectorAll('.attr-card');
      var previews = [];
      cards.forEach(function (card) {
        var type = card.getAttribute('data-type');
        var prefixIdUnique = card.getAttribute('data-prefix-id');
        var config = FACILITY_CONFIG[type] || { title: type, fields: [] };
        var result = serializeFacilityForm(card.querySelector('div'), config, prefixIdUnique);
        if (result) {
          previews.push('[' + type + '] ' + result.specText + ' (' + result.layer + ')');
        }
      });
      previewEl.textContent = previews.join('\n') || '추가된 속성이 없습니다.';
    };

    // 폼 카드를 담을 리스트 컨테이너 생성
    var pmFormListContainer = document.createElement('div');
    pmFormListContainer.id = 'pm-dynamic-form-list';
    pmFormListContainer.style.display = 'flex';
    pmFormListContainer.style.flexDirection = 'column';
    pmFormListContainer.style.gap = '15px';
    dynamicFieldsContainer.appendChild(pmFormListContainer);

    // 2. 사진에 저장되어 있던 기존 제원 복원 렌더링
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
        var parsedValues = deserializeSpecText(specTextObj.text, config);
        var uniquePrefix = 'pm-old-' + idx + '-' + Date.now();
        renderMultiAttributeCard(pmFormListContainer, fType, parsedValues, uniquePrefix);
      }
    });

    // 3. 편집 모달 내에서도 [속성 추가 선택기] 상시 제공
    var addSelectorGroup = document.createElement('div');
    addSelectorGroup.className = 'form-group';
    addSelectorGroup.style.marginTop = '15px';
    addSelectorGroup.innerHTML = '<label>➕ 속성 추가 입력</label>';
    
    var addSelect = document.createElement('select');
    addSelect.id = 'pm-attribute-adder';
    var addOpts = ['-- 추가할 속성 선택 --', '주의표지', '규제표지', '지시표지', '보조표지', '도로표지', '교통기타', 'CCTV', '새주소', '전광표지', '보안등', '신호등', '참고사항'];
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

    // 초기 리스너 연결 및 최초 1회 전체 미리보기 출력
    var inputsAndSelects = pmFormListContainer.querySelectorAll('input, select');
    inputsAndSelects.forEach(function (el) {
      el.addEventListener('input', window.updateAllPreviewsPM);
      el.addEventListener('change', window.updateAllPreviewsPM);
    });
    window.updateAllPreviewsPM();
  }

  if (!isSamePhoto || !img.src) {
    if (p && p.blob) {
      if (dxfImageObjectUrl) URL.revokeObjectURL(dxfImageObjectUrl);
      dxfImageObjectUrl = URL.createObjectURL(p.blob);
      img.src = dxfImageObjectUrl;
    } else {
      window.localStore.getPhotoById(photoId).then(function (record) {
        if (editingPhotoId !== photoId) return;
        if (record && record.blob) {
          if (dxfImageObjectUrl) URL.revokeObjectURL(dxfImageObjectUrl);
          dxfImageObjectUrl = URL.createObjectURL(record.blob);
          img.src = dxfImageObjectUrl;
        }
      });
    }
  }
  modal.classList.add('active');
}

function showDxfImageModal(ref) {
  editingPhotoId = null;
  editingDxfImageRef = ref;
  var modal = document.getElementById('photo-modal');
  var img = document.getElementById('photo-modal-img');
  var memo = document.getElementById('photo-modal-memo');
  var titleEl = document.getElementById('photo-modal-title');
  var actionsEl = document.getElementById('photo-modal-actions');
  var noFileEl = document.getElementById('photo-modal-no-file');
  if (!modal || !img) return;
  if (titleEl) titleEl.textContent = '참조 이미지';
  if (actionsEl) actionsEl.style.display = 'none';
  var addBtn = document.getElementById('photo-modal-add-btn');
  if (addBtn) addBtn.style.display = 'none';
  var thumbContainer = document.getElementById('photo-modal-thumbnails');
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
  if (!isNewPhotoPending || !editingPhotoId) return;
  var photoId = editingPhotoId;
  isNewPhotoPending = false; // 중복 호출 방지
  
  var p = photos.filter(function (x) { return x.id === photoId; })[0];
  window.localStore.deletePhoto(photoId).then(function () {
    photos = photos.filter(function (x) { return x.id !== photoId; });
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
    drawPhotoMarkers();
    drawTextMarkers();
    showToast('사진 등록이 취소되었습니다.');
  }).catch(function (err) {
    console.error('Pending photo rollback failed:', err);
  });
}

function hidePhotoModal() {
  if (isNewPhotoPending && editingPhotoId) {
    rollbackPendingPhoto();
  }
  var modal = document.getElementById('photo-modal');
  var img = document.getElementById('photo-modal-img');
  if (modal) modal.classList.remove('active');
  if (img) { img.src = ''; img.onclick = null; }
  editingPhotoId = null;
  editingDxfImageRef = null;
  isAddingSubPhoto = false;
  // subPhoto object URL 정리
  subPhotoObjectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
  subPhotoObjectUrls = [];
  var addBtn = document.getElementById('photo-modal-add-btn');
  if (addBtn) addBtn.style.display = 'none';
  var thumbContainer = document.getElementById('photo-modal-thumbnails');
  if (thumbContainer) thumbContainer.innerHTML = '';
  if (dxfImageObjectUrl) {
    URL.revokeObjectURL(dxfImageObjectUrl);
    dxfImageObjectUrl = null;
  }
}

function bindPhotoModal() {
  var modal = document.getElementById('photo-modal');
  var closeBtn = document.getElementById('photo-modal-close');
  var saveBtn = document.getElementById('photo-modal-save');
  var delBtn = document.getElementById('photo-modal-delete');
  var memo = document.getElementById('photo-modal-memo');
  var addBtn = document.getElementById('photo-modal-add-btn');

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      if (!editingPhotoId) return;
      isAddingSubPhoto = true;
      var cameraInput = document.getElementById('camera-input');
      if (cameraInput) {
        cameraInput.click();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', hidePhotoModal);
  if (saveBtn) saveBtn.addEventListener('click', function () {
    if (!editingPhotoId || !window.localStore) return;
    var p = photos.filter(function (x) { return x.id === editingPhotoId; })[0];
    if (!p) return;

    var promises = [];
    p.memo = memo.value || ''; // 메모 객체 데이터에 즉시 반영 (중복 비동기 호출 제거)

    var newNum = '';
    var pmNumInput = document.getElementById('pm-form-num');
    if (pmNumInput) {
      newNum = pmNumInput.value.trim();
    }

    // 중복 및 누락 감지 경고 로직 적용
    if (newNum) {
      if (!validatePhotoNumber(newNum, editingPhotoId)) {
        return; // 사용자가 저장을 취소한 경우 중단
      }
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

        var result = serializeFacilityForm(card.querySelector('div'), config, prefixIdUnique);
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
      });
    }

    if (!serializeSuccess) {
      alert('일부 제원 양식의 입력값을 확인해 주세요.');
      return;
    }

    // 2. 기존에 이 사진에 연결되어 도면에 뿌려졌던 모든 이전 제원 텍스트 마커들 일괄 청소
    var oldTextIds = p.specTextIds || [];
    if (oldTextIds.length === 0 && p.specTextId) {
      oldTextIds = [p.specTextId];
    }
    
    // texts 배열에서 기존 제원 텍스트를 제거
    texts = texts.filter(function (t) {
      return oldTextIds.indexOf(t.id) === -1;
    });

    // 3. 사진번호 텍스트 내용 갱신 (사진번호 텍스트는 기존 객체 재활용)
    if (p.numTextId && newNum) {
      var numObj = texts.filter(function (x) { return x.id === p.numTextId; })[0];
      if (numObj) {
        numObj.text = newNum;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('dmap:lastPhotoNumber', newNum);
        }

        // 서브 사진 파일명 일괄 변경
        if (p.subPhotos && p.subPhotos.length > 0) {
          p.subPhotos.forEach(function (sp, idx) {
            if (idx === 0) {
              sp.fileName = generatePhotoFileName(newNum);
            } else {
              sp.fileName = generatePhotoFileName(newNum + '_' + idx);
            }
          });
          p.fileName = p.subPhotos[0].fileName;
        } else {
          p.fileName = generatePhotoFileName(newNum);
        }
      }
    }

    // 4. 새로운 수정된 속성 데이터들을 바탕으로 신규 제원 텍스트 마커 생성
    var newSpecTextIds = [];
    var primarySpecTextId = null;

    attributeDataList.forEach(function (attr, index) {
      var specTextId = 'text-spec-' + index + '-' + Date.now();
      newSpecTextIds.push(specTextId);
      
      if (index === 0) {
        primarySpecTextId = specTextId;
      }

      var specTextObj = {
        id: specTextId,
        x: p.x,
        y: p.y,
        text: attr.specText,
        fontSize: 12,
        layer: attr.layer || '일반_T'
      };
      texts.push(specTextObj);

      // 개별 속성 폼 캐시 업데이트
      lastSpecs[attr.type] = attr.values;
    });

    // 5. 사진 레코드 메타데이터 최종 업데이트
    p.specTextId = primarySpecTextId;
    p.specTextIds = newSpecTextIds;
    p.facilityType = attributeDataList[0] ? attributeDataList[0].type : '일반시설물';
    
    var additionalTypes = [];
    if (attributeDataList.length > 1) {
      for (var idx = 1; idx < attributeDataList.length; idx++) {
        additionalTypes.push(attributeDataList[idx].type);
      }
    }
    p.additionalTypes = additionalTypes;

    promises.push(window.localStore.savePhoto(dxfFileFullName, p));
    promises.push(window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() }));

    Promise.all(promises).then(function () {
      isNewPhotoPending = false;
      drawPhotoMarkers();
      drawTextMarkers();
      hidePhotoModal();
      showToast('제원 수정을 완료했습니다.');
    }).catch(function (err) {
      console.error('수정 저장 실패:', err);
      alert('데이터 저장소에 기록하는 도중 오류가 발생해 수정하지 못했습니다.');
    });
  });

  if (delBtn) delBtn.addEventListener('click', function () {
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
  var modal = document.getElementById('text-modal');
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
  document.getElementById('text-modal').classList.remove('active');
  editingTextId = null;
}

function bindTextModal() {
  var modal = document.getElementById('text-modal');
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

function detectFacilityType(name, layer) {
  var n = String(name || '').toLowerCase();
  var l = String(layer || '').toLowerCase();

  // 0. 자전거 도로 예외 처리 (시설물 제원 폼 대신 기본 사진/텍스트 모달 호출 유도)
  if (n.indexOf('자전거') >= 0 || l.indexOf('자전거') >= 0) {
    return null;
  }

  // 1. 도로반사경 및 도로표지 등 특수 도로 시설물 우선 처리
  if (n.indexOf('도로반사경') >= 0 || l.indexOf('도로반사경') >= 0 || n.indexOf('반사경') >= 0 || l.indexOf('반사경') >= 0) return '도로반사경';
  if (n.indexOf('도로표지') >= 0 || l.indexOf('도로표지') >= 0) return '도로표지';
  if (n.indexOf('고가') >= 0 || l.indexOf('고가') >= 0) return '고가도로';
  if (n.indexOf('도로') >= 0 || l.indexOf('도로') >= 0 || n.indexOf('포장') >= 0 || l.indexOf('포장') >= 0) {
    return '도로';
  }
  // 2. 석축
  if (n.indexOf('석축') >= 0 || l.indexOf('석축') >= 0) {
    return '석축';
  }
  // 3. 옹벽
  if (n.indexOf('옹벽') >= 0 || l.indexOf('옹벽') >= 0 || n.indexOf('retainingwall') >= 0 || l.indexOf('retainingwall') >= 0) {
    return '옹벽';
  }
  // 4. 성토면/절개면
  if (n.indexOf('성토면') >= 0 || l.indexOf('성토면') >= 0) {
    return '성토면';
  }
  if (n.indexOf('절개면') >= 0 || l.indexOf('절개면') >= 0 || n.indexOf('사면') >= 0 || l.indexOf('사면') >= 0 || n.indexOf('slope') >= 0 || l.indexOf('slope') >= 0) {
    return '절개면';
  }
  // 5. 배수암거
  if (n.indexOf('배수암거') >= 0 || l.indexOf('배수암거') >= 0 || n.indexOf('암거') >= 0 || l.indexOf('암거') >= 0 || n.indexOf('boxculvert') >= 0 || l.indexOf('boxculvert') >= 0) {
    return '배수암거';
  }
  // 6. 배수관
  if (n.indexOf('배수관') >= 0 || l.indexOf('배수관') >= 0 || n.indexOf('pipeculvert') >= 0 || l.indexOf('pipeculvert') >= 0 || n.indexOf('흄관') >= 0 || l.indexOf('흄관') >= 0) {
    return '배수관';
  }
  // 7. 측구
  if (n.indexOf('측구') >= 0 || l.indexOf('측구') >= 0 || n.indexOf('u형') >= 0 || l.indexOf('u형') >= 0 || n.indexOf('l형') >= 0 || l.indexOf('l형') >= 0 || n.indexOf('v형') >= 0 || l.indexOf('v형') >= 0 || n.indexOf('gutter') >= 0 || l.indexOf('gutter') >= 0) {
    return '측구';
  }
  // 8. 중앙분리대
  if (n.indexOf('중앙분리대') >= 0 || l.indexOf('중앙분리대') >= 0) {
    return '중앙분리대';
  }
  // 9. 차량방호시설
  if (n.indexOf('차량방호') >= 0 || l.indexOf('차량방호') >= 0 || n.indexOf('방호시설') >= 0 || l.indexOf('방호시설') >= 0 || n.indexOf('안전시설') >= 0 || l.indexOf('안전시설') >= 0) {
    return '차량방호시설';
  }
  // 10. 낙석방지시설
  if (n.indexOf('낙석방지') >= 0 || l.indexOf('낙석방지') >= 0) {
    return '낙석방지시설';
  }
  // 11. 교통안전표지들 (주의, 규제, 지시, 보조)
  if (n.indexOf('주의표지') >= 0 || l.indexOf('주의표지') >= 0 || n.indexOf('주의표시') >= 0 || l.indexOf('주의표시') >= 0) return '주의표지';
  if (n.indexOf('규제표지') >= 0 || l.indexOf('규제표지') >= 0 || n.indexOf('규제표시') >= 0 || l.indexOf('규제표시') >= 0) return '규제표지';
  if (n.indexOf('지시표지') >= 0 || l.indexOf('지시표지') >= 0 || n.indexOf('지시표시') >= 0 || l.indexOf('지시표시') >= 0) return '지시표지';
  if (n.indexOf('보조표지') >= 0 || l.indexOf('보조표지') >= 0 || n.indexOf('보조표시') >= 0 || l.indexOf('보조표시') >= 0) return '보조표지';
  if (n.indexOf('교통기타') >= 0 || l.indexOf('교통기타') >= 0) return '교통기타';
  
  // 12. 갈매기표지
  if (n.indexOf('갈매기') >= 0 || l.indexOf('갈매기') >= 0) {
    return '갈매기표지';
  }
  // CCTV 추가
  if (n.indexOf('cctv') >= 0 || l.indexOf('cctv') >= 0) {
    return 'CCTV';
  }
  // 14. 새주소
  if (n.indexOf('새주소') >= 0 || l.indexOf('새주소') >= 0) {
    return '새주소';
  }
  // 15. 전광표지
  if (n.indexOf('전광표지') >= 0 || l.indexOf('전광표지') >= 0) {
    return '전광표지';
  }
  // 16. 보안등
  if (n.indexOf('보안등') >= 0 || l.indexOf('보안등') >= 0) {
    return '보안등';
  }
  // 17. 신호등
  if (n.indexOf('신호등') >= 0 || l.indexOf('신호등') >= 0) {
    return '신호등';
  }
  // 18. 과속방지턱
  if (n.indexOf('방지턱') >= 0 || l.indexOf('방지턱') >= 0 || n.indexOf('과속방지') >= 0 || l.indexOf('과속방지') >= 0) {
    return '과속방지턱';
  }
  // 19. 방음시설
  if (n.indexOf('방음') >= 0 || l.indexOf('방음') >= 0) {
    return '방음시설';
  }
  // 20. 가로수
  if (n.indexOf('가로수') >= 0 || l.indexOf('가로수') >= 0) {
    return '가로수';
  }
  // 21. 통로박스
  if (n.indexOf('통로박스') >= 0 || l.indexOf('통로박스') >= 0) {
    return '통로박스';
  }
  // 22. 과적검문소
  if (n.indexOf('과적검문소') >= 0 || l.indexOf('과적검문소') >= 0) {
    return '과적검문소';
  }
  // 23. 제설함 / 제설시설
  if (n.indexOf('제설') >= 0 || l.indexOf('제설') >= 0) {
    return '제설시설';
  }
  // 24. 정차대
  if (n.indexOf('정차대') >= 0 || l.indexOf('정차대') >= 0 || n.indexOf('정차도') >= 0 || l.indexOf('정차도') >= 0) {
    return '정차대';
  }
  // 25. 버스/택시 정류장
  if (n.indexOf('버스정류장') >= 0 || l.indexOf('버스정류장') >= 0) return '버스정류장';
  if (n.indexOf('택시정류장') >= 0 || l.indexOf('택시정류장') >= 0) return '택시정류장';
  if (n.indexOf('정류장') >= 0 || l.indexOf('정류장') >= 0) return '버스정류장';
  
  // 26. 교량
  if (n.indexOf('교량') >= 0 || l.indexOf('교량') >= 0) {
    return '교량';
  }
  // 27. 터널
  if (n.indexOf('터널') >= 0 || l.indexOf('터널') >= 0) {
    return '터널';
  }
  // 28. 육교
  if (n.indexOf('육교') >= 0 || l.indexOf('육교') >= 0) {
    return '육교';
  }
  // 29. 지하차도 / 지하보도
  if (n.indexOf('지하차도') >= 0 || l.indexOf('지하차도') >= 0) return '지하차도';
  if (n.indexOf('지하보도') >= 0 || l.indexOf('지하보도') >= 0) return '지하보도';

  // 30. 오르막차로 / 교차시설
  if (n.indexOf('오르막차로') >= 0 || l.indexOf('오르막차로') >= 0) return '오르막차로';
  if (n.indexOf('교차시설') >= 0 || l.indexOf('교차시설') >= 0) return '교차시설';

  // 31. 가로등 기본 키워드 매핑 폴백
  if (n.indexOf('가로등') >= 0 || l.indexOf('가로등') >= 0 || n.indexOf('streetlight') >= 0 || l.indexOf('streetlight') >= 0) {
    return '가로등';
  }

  // 32. 참고사항
  if (n.indexOf('참고사항') >= 0 || l.indexOf('참고사항') >= 0) {
    return '참고사항';
  }

  return null;
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
  
  var lastLocalStorageNum = 0;
  if (typeof localStorage !== 'undefined') {
    var lastStr = localStorage.getItem('dmap:lastPhotoNumber');
    if (lastStr) {
      var parsed = parseInt(lastStr, 10);
      if (!isNaN(parsed)) lastLocalStorageNum = parsed;
    }
  }
  
  var finalLastNum = Math.max(maxNum, lastLocalStorageNum);
  return finalLastNum > 0 ? String(finalLastNum + 1) : '1'; // 기본값 1
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

// 특정 시설물 및 필드 ID에 매칭되는 이전 입력값들을 texts 이력에서 추출하여 빈도순 상위 10개 반환
function getFieldSuggestions(fieldId, config) {
  var counts = {};
  if (window.texts && window.texts.length > 0 && config && config.layer) {
    window.texts.forEach(function (t) {
      if (t.layer === config.layer && t.text) {
        var parsed = deserializeSpecText(t.text, config);
        if (parsed && parsed[fieldId] !== undefined) {
          var val = String(parsed[fieldId]).trim();
          // 의미 없는 디폴트값 및 기타 등은 제외
          if (val !== '' && val !== '기타' && val !== '내용' && val !== '종류' && val !== '형식') {
            counts[val] = (counts[val] || 0) + 1;
          }
        }
      }
    });
  }
  
  var list = Object.keys(counts).map(function (k) {
    return { val: k, count: counts[k] };
  });
  list.sort(function (a, b) { return b.count - a.count; });
  return list.slice(0, 10).map(function (item) { return item.val; });
}

// 개별 속성 카드(구분선, 타이틀, [X] 삭제 버튼 탑재)를 동적으로 생성하는 헬퍼 함수
function renderMultiAttributeCard(container, type, cachedVals, prefixIdUnique) {
  var card = document.createElement('div');
  card.className = 'attr-card';
  card.setAttribute('data-type', type);
  card.setAttribute('data-prefix-id', prefixIdUnique);

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
          if (typeof updateAllPreviewsPM === 'function') {
            updateAllPreviewsPM();
          }
        } else {
          if (typeof updateAllPreviews === 'function') {
            updateAllPreviews();
          }
        }
      }
    }
  });

  header.appendChild(title);
  header.appendChild(delBtn);
  card.appendChild(header);

  var formBody = document.createElement('div');
  card.appendChild(formBody);
  container.appendChild(card);

  var config = FACILITY_CONFIG[type];
  if (!config) {
    config = {
      title: type,
      layer: '기타_T',
      prefix: type,
      fields: [
        { id: 'content', label: '내용 (직접 입력)', type: 'text', placeholder: '내용 입력', default: '내용' }
      ]
    };
  }

  renderFacilityForm(formBody, config, cachedVals, prefixIdUnique);
  return card;
}

// 다중 속성 일괄 제원 입력 바텀 시트 구현
function showStreetlightInputForm(fileBlob, item, dxfCoords, latLng) {
  var content = document.getElementById('bottom-sheet-content');
  var title = document.getElementById('bottom-sheet-title');
  if (!content) return;

  if (title) title.textContent = '시설물 제원 입력';
  content.innerHTML = '';

  var nextPhotoNum = getNextPhotoNumber();

  // [오류 해결 1] 객체감지 진입 시 임시 추가사진 배열 초기화
  var initialFileName = generatePhotoFileName(nextPhotoNum);
  pendingStreetlightSubPhotos = [
    { subIndex: 0, fileName: initialFileName, blob: fileBlob }
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
    var cameraInput = document.getElementById('camera-input');
    if (cameraInput) cameraInput.click();
  });
  photoControlWrap.appendChild(addBtn);

  var thumbContainer = document.createElement('div');
  thumbContainer.className = 'photo-thumbnail-list';
  thumbContainer.id = 'sw-thumbnails';
  photoControlWrap.appendChild(thumbContainer);
  content.appendChild(photoControlWrap);

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
          openImageViewer(pendingStreetlightSubPhotos, idx);
        });
        tc.appendChild(thumbDiv);
      });
    }
  };

  // 메인 이미지 클릭 시 뷰어 연동
  img.onclick = function () {
    openImageViewer(pendingStreetlightSubPhotos, 0);
  };

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

  // 실시간 전체 제원 미리보기 필드 삽입 (가시성 확보용)
  var previewGroup = document.createElement('div');
  previewGroup.className = 'form-group';
  previewGroup.style.background = '#F2F2F7';
  previewGroup.style.padding = '8px 12px';
  previewGroup.style.borderRadius = '8px';
  previewGroup.style.border = '1px solid #E5E5EA';
  previewGroup.innerHTML = 
    '<label style="color:#5856D6; font-size:11px; margin-bottom:2px;">도면 저장 제원 일괄 미리보기</label>' +
    '<div id="sw-spec-preview" style="font-size:12px; color:#1C1C1E; word-break:break-all; min-height:16px; white-space:pre-line;"></div>';
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
      var result = serializeFacilityForm(card.querySelector('div'), config, prefixIdUnique);
      if (result) {
        previews.push('[' + type + '] ' + result.specText + ' (' + result.layer + ')');
      }
    });
    previewEl.textContent = previews.join('\n') || '추가된 속성이 없습니다.';
  };

  // 동적 필드 카드들을 담을 수직 리스트 컨테이너 생성
  var formListContainer = document.createElement('div');
  formListContainer.id = 'sw-dynamic-form-list';
  formListContainer.style.display = 'flex';
  formListContainer.style.flexDirection = 'column';
  formListContainer.style.gap = '15px';
  content.appendChild(formListContainer);

  // 1. 최초 롱프레스로 자동 인식된 주(Primary) 시설물 카드 1개 자동 렌더링
  var primaryType = pendingFacilityType || '일반시설물';
  var cached = lastSpecs[primaryType] || {};
  renderMultiAttributeCard(formListContainer, primaryType, cached, 'sw-primary');

  // 속성 추가 선택기 UI (기본 노출 방식)
  var addSelectorGroup = document.createElement('div');
  addSelectorGroup.className = 'form-group';
  addSelectorGroup.style.marginTop = '15px';
  addSelectorGroup.innerHTML = '<label>➕ 속성 추가 입력</label>';
  
  var addSelect = document.createElement('select');
  addSelect.id = 'sw-attribute-adder';
  var addOpts = ['-- 추가할 속성 선택 --', '주의표지', '규제표지', '지시표지', '보조표지', '도로표지', '교통기타', 'CCTV', '새주소', '전광표지', '보안등', '신호등', '참고사항'];
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
  submitBtn.style.cssText = 'background:#34C759; flex:1; padding:15px; font-weight:bold; font-size:15px; border-radius:10px;';
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

      var result = serializeFacilityForm(card.querySelector('div'), config, prefixIdUnique);
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
    });

    if (!serializeSuccess) {
      alert('일부 폼 직렬화에 실패했습니다. 입력값을 확인해 주세요.');
      return;
    }

    var finalFormData = {
      num: numVal,
      attributes: attributeDataList
    };

    saveStreetlightData(finalFormData, fileBlob, item, dxfCoords, latLng);
  });
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
  
  // 사진 번호 텍스트 객체 생성 및 texts 배열 등록
  var numTextObj = {
    id: numTextId,
    x: insertionDxf.x,
    y: insertionDxf.y,
    text: formData.num,
    fontSize: 12,
    layer: '사진번호'
  };
  texts.push(numTextObj);

  // 2. 다중 제원 텍스트 마커 생성 및 ID 목록 결합
  var specTextIds = [];
  var primarySpecTextId = null;

  if (formData.attributes && formData.attributes.length > 0) {
    formData.attributes.forEach(function (attr, index) {
      var specTextId = 'text-spec-' + index + '-' + Date.now();
      specTextIds.push(specTextId);
      
      // 첫 번째 속성을 주(Primary) 제원 텍스트 ID로 지정 (구버전 호환성용)
      if (index === 0) {
        primarySpecTextId = specTextId;
      }

      var specTextObj = {
        id: specTextId,
        x: insertionDxf.x,
        y: insertionDxf.y,
        text: attr.specText,
        fontSize: 12,
        layer: attr.layer || '일반_T'
      };
      texts.push(specTextObj);
    });
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
      memo: descText + ' (' + item.name + ')',
      fileName: mainFileName,
      createdAt: new Date().toISOString(),
      numTextId: numTextId,
      specTextId: primarySpecTextId, // 구버전 DB 호환성
      specTextIds: specTextIds,      // 다중 속성 ID 배열 (신규)
      facilityType: primaryType,     // 주 시설물 종류
      additionalTypes: additionalTypes, // 부속 시설물 종류 배열
      subPhotos: finalSubPhotos
    };

    photos.push(photo);

    Promise.all([
      window.localStore.savePhoto(dxfFileFullName, photo),
      window.localStore.saveProject(dxfFileFullName, { texts: texts, lastModified: new Date().toISOString() })
    ]).then(function () {
      drawPhotoMarkers();
      drawTextMarkers();
      showLoading(false);
      hideStreetlightBottomSheet();
      showToast('제원 저장이 완료되었습니다.');
    }).catch(function (err) {
      showLoading(false);
      console.error('제원 저장 실패:', err);
      alert('데이터 저장소에 기록하는 도중 오류가 발생해 저장하지 못했습니다.');
    });
  }

  if (targetSize != null) {
    compressImage(fileBlob, targetSize).then(finishSave).catch(function () {
      finishSave(fileBlob);
    });
  } else {
    finishSave(fileBlob);
  }
}// 동적 시설물 제원 폼 렌더러
function renderFacilityForm(container, config, cachedVals, prefixId) {
  if (!container || !config) return;
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '8px';

  // 1. 커스텀 레이어명 입력 필드 제공 (선택사항)
  var layerGroup = document.createElement('div');
  layerGroup.className = 'form-group';
  layerGroup.innerHTML = 
    '<label>레이어명 수동 지정 (필요시에만 변경)</label>' +
    '<input type="text" id="' + prefixId + '-custom-layer" value="' + (config.layer || '') + '" placeholder="기본: ' + (config.layer || '') + '">';
  container.appendChild(layerGroup);
  
  var customLayerInput = layerGroup.querySelector('input');
  if (customLayerInput) {
    customLayerInput.addEventListener('focus', function () { this.select(); });
  }

  // 1-2. 보라색 마커에 입력될 전체 제원 미리보기 필드 삽입
  var previewGroup = document.createElement('div');
  previewGroup.className = 'form-group';
  previewGroup.style.background = '#F2F2F7';
  previewGroup.style.padding = '8px 12px';
  previewGroup.style.borderRadius = '8px';
  previewGroup.style.border = '1px solid #E5E5EA';
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

  // 2. 설정 테이블 필드 동적 생성
  config.fields.forEach(function (field) {
    var group = document.createElement('div');
    group.className = 'form-group';

    var val = '';
    if (cachedVals && cachedVals[field.id] !== undefined) {
      val = cachedVals[field.id];
    } else {
      val = field.default || '';
    }

    var html = '<label>' + field.label + '</label>';

    // 지능형 숫자형 필드 감지기: 설정상 타입뿐만 아니라 라벨명이나 필드 ID에 가로/세로/높이/수량/차선/차로/연장 등의 키워드가 있으면 숫자로 간주
    var isNumericField = field.type === 'number' || field.isNumber || 
      /수량|높이|가로|세로|폭|경사|규격|각도|개수|갯수|차선|차로|연장/.test(field.label) ||
      /count|width|height|gradient|angle|spec|num|lane|length/.test(field.id);

    if (field.readonly) {
      // 읽기전용 필드는 그대로 일반 텍스트 입력박스 유지
      html += '<input type="text" readonly id="' + prefixId + '-' + field.id + '" value="' + val + '">';
    } else {
      var opts = [];
      if (field.type === 'select') {
        opts = (field.options || []).slice(); // 기존 고정 옵션 복사
      }
      
      // 고정 옵션 유무와 관계없이 과거 저장 이력 상위 10개를 추출하여 드롭다운 리스트에 결합 (중복 방지)
      var suggestions = getFieldSuggestions(field.id, config);
      suggestions = suggestions.filter(function (s) {
        return s !== '내용' && s !== '종류' && s !== '메모' && s !== '기타' && s !== '';
      });
      suggestions.forEach(function (sug) {
        if (opts.indexOf(sug) === -1) {
          opts.push(sug);
        }
      });

      // 기존 옵션에서도 placeholder 명칭들 제거
      opts = opts.filter(function (opt) {
        return opt !== '내용' && opt !== '종류' && opt !== '메모';
      });

      // 주관식/숫자형 필드이면서 이력 추천 목록이 0개인 경우 드롭다운을 그리지 않고 직접 입력창만 단일화 제공
      var isDirectInputOnly = (field.type !== 'select') && (suggestions.length === 0);

      if (isDirectInputOnly) {
        var inputVal = val;
        if (inputVal === '내용' || inputVal === '종류' || inputVal === '메모' || inputVal === '기타') {
          inputVal = '';
        }
        if (isNumericField) {
          html += '<input type="number" step="any" inputmode="decimal" id="' + prefixId + '-' + field.id + '" value="' + inputVal + '" placeholder="' + (field.placeholder || '숫자 입력') + '">';
        } else {
          html += '<input type="text" id="' + prefixId + '-' + field.id + '" value="' + inputVal + '" placeholder="' + (field.placeholder || '직접 입력') + '">';
        }
      } else {
        // 일반 주관식/선택 필드는 드롭다운(select) + 기타(etc) 입력창 구조
        html += '<select id="' + prefixId + '-' + field.id + '">';
        
        if (opts.length === 0) {
          opts.push('선택');
        }

        // 현재 입력된 실제값을 드롭다운 옵션 후보군에 동적 병합
        if (val !== '' && val !== '기타' && val !== '내용' && val !== '종류' && val !== '메모' && val !== '선택') {
          var strVal = String(val).trim();
          if (opts.indexOf(strVal) === -1) {
            opts.push(strVal);
          }
        }

        var isOptionMatched = false;
        opts.forEach(function (opt) {
          var selected = opt === val ? ' selected' : '';
          if (opt === val) isOptionMatched = true;
          html += '<option value="' + opt + '"' + selected + '>' + opt + '</option>';
        });

        // 캐시값이 목록에 없거나 직접 입력한 것이었다면 '기타'를 기본 선택 상태로 지정
        var showEtc = !isOptionMatched && val !== '' && val !== '선택';
        var etcSelected = showEtc ? ' selected' : '';
        
        if (opts.indexOf('기타') === -1) {
          html += '<option value="기타"' + etcSelected + '>기타</option>';
        }
        html += '</select>';
        
        var etcVal = showEtc ? val : '';
        if (etcVal === '내용' || etcVal === '종류' || etcVal === '메모') etcVal = '';
        var etcDisplay = showEtc ? 'block' : 'none';

        if (isNumericField) {
          html += '<input type="number" step="any" inputmode="decimal" id="' + prefixId + '-' + field.id + '-etc" style="display:' + etcDisplay + '; margin-top:5px;" value="' + etcVal + '" placeholder="' + (field.placeholder || '숫자 입력') + '">';
        } else {
          html += '<input type="text" id="' + prefixId + '-' + field.id + '-etc" style="display:' + etcDisplay + '; margin-top:5px;" value="' + etcVal + '" placeholder="' + (field.placeholder || '직접 입력') + '">';
        }
      }
    }

    group.innerHTML = html;
    container.appendChild(group);

    // 신호등 종류가 '차량'인 경우 보행등 필드들을 초기에 숨겨두기 위해 ID 속성을 부여하여 래핑하거나 스타일을 조절합니다.
    if (config.title === '신호등' && (field.id === 'pedestrianType' || field.id === 'pedestrianCount')) {
      group.id = prefixId + '-group-' + field.id;
      // 초기 'type' 선택값을 기준으로 표시 여부 제어
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

    // 도로표지 방향이 '안내'가 아닌 경우 내용 필드를 초기에 숨겨두기 위해 ID 속성을 부여하여 스타일을 조절합니다.
    if (config.title === '도로표지' && field.id === 'content') {
      group.id = prefixId + '-group-content';
      var dirVal = cachedVals && cachedVals['direction'] ? cachedVals['direction'] : '방향';
      if (dirVal === '안내') {
        group.style.display = 'flex';
      } else {
        group.style.display = 'none';
      }
    }

    // input 포커스 이벤트 바인딩 (자동 전체 선택) 및 미리보기 동기화
    var inputs = group.querySelectorAll('input');
    inputs.forEach(function (inputEl) {
      inputEl.addEventListener('focus', function () {
        if (this.type !== 'number') {
          this.select();
        }
      });
      inputEl.addEventListener('input', updatePreview);
    });

    // select 체인지 이벤트 및 포커스 이벤트 걸어서 '기타'일 때 주관식 입력 활성화
    if (!field.readonly) {
      var selEl = group.querySelector('select');
      var etcEl = group.querySelector('input');

      if (selEl && etcEl) {
        // 공통 포커스 트리거 함수: 동기+비동기 이중 트리거로 모바일 키보드 반응성 완전 확보
        var triggerFocus = function () {
          var isEtc = selEl.value === '기타';
          etcEl.style.display = isEtc ? 'block' : 'none';
          if (!isEtc) {
            etcEl.value = '';
          } else {
            // 1차 포커스 시도 (동기식 - 유저 액션 스택 보호 목적)
            etcEl.focus();
            
            // 2차 포커스 시도 (비동기식 - 브라우저 Reflow 레이아웃 지연 타이밍 대응 목적)
            setTimeout(function () {
              etcEl.focus();
              if (etcEl.type !== 'number') {
                etcEl.select();
              }
            }, 10);
          }
          updatePreview();
        };

        // 1. 값 자체가 변경될 때
        selEl.addEventListener('change', triggerFocus);
      }
      if (selEl) {
        selEl.addEventListener('change', updatePreview);
      }
      
      // 신호등 종류(type) 선택값이 바뀔 때 보행등 입력 필드 보이기/숨기기 처리 추가
      if (config.title === '신호등' && field.id === 'type' && selEl) {
        selEl.addEventListener('change', function () {
          var showPed = this.value === '보행';
          var pedTypeGrp = document.getElementById(prefixId + '-group-pedestrianType');
          var pedCountGrp = document.getElementById(prefixId + '-group-pedestrianCount');
          var pedTypeEl = document.getElementById(prefixId + '-pedestrianType');
          var pedTypeVal = pedTypeEl ? pedTypeEl.value : '보행등무';
          
          if (pedTypeGrp) pedTypeGrp.style.display = showPed ? 'flex' : 'none';
          if (pedCountGrp) pedCountGrp.style.display = (showPed && pedTypeVal !== '보행등무') ? 'flex' : 'none';
          updatePreview();
        });
      }

      // 신호등 보행등 구분(pedestrianType) 선택값이 바뀔 때 수량 입력 필드 보이기/숨기기 처리 추가
      if (config.title === '신호등' && field.id === 'pedestrianType' && selEl) {
        selEl.addEventListener('change', function () {
          var pedCountGrp = document.getElementById(prefixId + '-group-pedestrianCount');
          if (pedCountGrp) {
            pedCountGrp.style.display = (this.value !== '보행등무') ? 'flex' : 'none';
          }
          updatePreview();
        });
      }

      // 도로표지 방향(direction) 선택값이 바뀔 때 내용 입력 필드 보이기/숨기기 처리 추가
      if (config.title === '도로표지' && field.id === 'direction' && selEl) {
        selEl.addEventListener('change', function () {
          var showContent = this.value === '안내';
          var contentGrp = document.getElementById(prefixId + '-group-content');
          if (contentGrp) contentGrp.style.display = showContent ? 'flex' : 'none';
          updatePreview();
        });
      }
    }
  });

  // 커스텀 레이어 입력 박스가 변경될 때도 미리보기가 아닌 레이어명이 수정될 수 있으므로 동기화 (혹은 수동 동기화용)
  if (customLayerInput) {
    customLayerInput.addEventListener('input', updatePreview);
  }

  // 초기 렌더링 시점에 1회 호출하여 초기값을 미리보기에 적용
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
    if (el) {
      if (el.tagName === 'SELECT') {
        if (el.value === '기타' && etcEl) {
          val = etcEl.value.trim();
        } else {
          val = el.value.trim();
        }
      } else {
        val = el.value.trim();
      }
    }

    // 빈칸 입력 검사 및 기본값 자동 보정 (기타 선택 후 빈칸 시에도 기타로 보정)
    if (val === '') {
      val = field.default || '기타';
    }
    vals[field.id] = val;
  });

  var customLayerInput = document.getElementById(prefixId + '-custom-layer');
  var finalLayer = (customLayerInput && customLayerInput.value.trim()) ? customLayerInput.value.trim() : config.layer;

  // 제원 조립 처리 (포맷 규칙 준수: 맨 앞에 접두어 필수 포함)
  var specText = '';
  var prefixWord = (config.prefix !== undefined) ? config.prefix : config.title;

  if (config.title === '신호등') {
    // 신호등용 맞춤 포맷팅
    // 1. 형식*수량 조립 (예: 횡4*2)
    var styleAndCount = vals.style + '*' + vals.count;
    
    // 2. 종류가 '보행'이면 마지막에 보행등 구분 추가
    if (vals.type === '보행') {
      var ped = '';
      if (vals.pedestrianType === '보행등무') {
        ped = '보행등무';
      } else {
        ped = (vals.pedestrianType || '보행등') + '*' + (vals.pedestrianCount || '1');
      }
      specText = (prefixWord ? prefixWord + '/' : '') + vals.type + '/' + styleAndCount + '/' + vals.support + '/' + ped;
    } else {
      specText = (prefixWord ? prefixWord + '/' : '') + vals.type + '/' + styleAndCount + '/' + vals.support;
    }
  } else if (config.title === '도로표지') {
    if (vals.direction === '안내') {
      specText = (prefixWord ? prefixWord + '/' : '') + vals.direction + '/' + vals.content + '/' + vals.support;
    } else {
      specText = (prefixWord ? prefixWord + '/' : '') + vals.direction + '/' + vals.support;
    }
  } else if (config.joinFormat === 'dimension/type/wing/sump') {
    // 배수암거, 통로박스 등 (접두어/가로*세로/재질/날개벽/집수정 등)
    var dim = vals.width + '*' + vals.height;
    specText = (prefixWord ? prefixWord + '/' : '') + dim + '/' + vals.type + '/' + (vals.wing || vals.traffic || vals.material || '기타') + '/' + (vals.sump || '기타');
  } else if (config.joinFormat === 'bridgeName/material/dimension') {
    // 교량 등 (접두어/교량명/재질/가로*세로)
    var dim = vals.width + '*' + vals.height;
    specText = (prefixWord ? prefixWord + '/' : '') + vals.bridgeName + '/' + vals.material + '/' + dim;
  } else if (config.joinFormat === 'type/dimension') {
    // 측구 (접두어/종류/가로*세로)
    var dim = vals.width + '*' + vals.height;
    specText = (prefixWord ? prefixWord + '/' : '') + vals.type + '/' + dim;
  } else {
    // 기본 포맷: 접두어/val1/val2/val3...
    var parts = [];
    if (prefixWord) {
      parts.push(prefixWord);
    }
    config.fields.forEach(function (field) {
      // 고정 레이어명 필드(name)는 직렬화에서 생략
      if (field.id === 'name') return;
      parts.push(vals[field.id]);
    });
    specText = parts.join('/');
  }

  // 폼 캐시에 최신 입력값 저장
  lastSpecs[config.title] = vals;

  return {
    layer: finalLayer,
    specText: specText,
    values: vals
  };
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
      
      var already = list.some(function (x) {
        if (bx != null && by != null && x.bx != null && x.by != null) {
          return Math.abs(x.bx - bx) < 0.01 && Math.abs(x.by - by) < 0.01;
        }
        return x.name === name && Math.abs(x.distance - dist) < 0.2;
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
  var sheet = document.getElementById('bottom-sheet-flow');
  var content = document.getElementById('bottom-sheet-content');
  var title = document.getElementById('bottom-sheet-title');
  var closeBtn = document.getElementById('bottom-sheet-close');
  if (!sheet || !content) return;

  if (title) title.textContent = '📍 시설물 선택 (반경 2m 이내)';
  content.innerHTML = '<p style="font-size:13px; color:#666; margin:0 0 10px 0;">사진을 추가할 시설물을 선택하세요.</p>';

  list.forEach(function (item) {
    var div = document.createElement('div');
    div.className = 'facility-list-item';
    div.textContent = item.name + ' (' + item.layer + ') — ' + item.distance.toFixed(1) + 'm';
    div.addEventListener('click', function () {
      triggerStreetlightCamera(item, dxfCoords, latLng);
    });
    content.appendChild(div);
  });

  if (closeBtn && !closeBtn._bound) {
    closeBtn.addEventListener('click', hideStreetlightBottomSheet);
    closeBtn._bound = true;
  }

  sheet.classList.add('active');
}

function hideStreetlightBottomSheet() {
  var sheet = document.getElementById('bottom-sheet-flow');
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
}

function triggerStreetlightCamera(item, dxfCoords, latLng) {
  pendingStreetlightItem = item;
  pendingStreetlightDxfCoords = dxfCoords;
  pendingStreetlightLatLng = latLng;
  pendingFacilityType = detectFacilityType(item.name, item.layer);

  var cameraInput = document.getElementById('camera-input');
  if (cameraInput) {
    cameraInput.click();
  }
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
      
      // 사진 및 텍스트 데이터 로딩
      texts = project.texts || [];
      return window.localStore.loadPhotos(lastDxfFile).then(function (loadedPhotos) {
        photos = [];
        loadedPhotos.forEach(function (p) {
          photos.push({
            id: p.id, x: p.x, y: p.y, width: p.width, height: p.height,
            blob: p.blob, memo: p.memo || '', fileName: p.fileName || '',
            createdAt: p.createdAt, updatedAt: p.updatedAt,
            numTextId: p.numTextId,
            specTextId: p.specTextId,
            specTextIds: p.specTextIds || null,
            facilityType: p.facilityType,
            additionalTypes: p.additionalTypes || null,
            subPhotos: p.subPhotos || null
          });
        });
        drawPhotoMarkers();
        drawTextMarkers();
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
    setTimeout(function () { showLoading(false); }, 100);
  });
}

/** 객체감지 조사 바텀시트에서 추가 사진 촬영 시 임시 배열에 추가 */
function addSubPhotoToPendingStreetlight(file) {
  var targetSize = getImageTargetSize();
  var numInput = document.getElementById('sw-form-num');
  var numTextVal = numInput ? numInput.value : '0';
  var nextSubSuffix = pendingStreetlightSubPhotos.length;
  var newFileName = generatePhotoFileName(numTextVal + '_' + nextSubSuffix);

  function finish(blob) {
    pendingStreetlightSubPhotos.push({
      subIndex: nextSubSuffix,
      fileName: newFileName,
      blob: blob
    });
    isAddingSubPhoto = false;
    showToast('추가 사진이 등록되었습니다. (총 ' + pendingStreetlightSubPhotos.length + '장)');
    if (typeof window.renderStreetlightThumbnails === 'function') {
      window.renderStreetlightThumbnails();
    }
  }

  if (targetSize != null) {
    compressImage(file, targetSize).then(finish).catch(function () {
      finish(file);
    });
  } else {
    var reader = new FileReader();
    reader.onload = function (e) {
      fetch(e.target.result).then(function (r) { return r.blob(); }).then(finish);
    };
    reader.readAsDataURL(file);
  }
}

/** 서브 사진을 현재 편집 중인 메인 사진에 추가 */
function addSubPhotoToCurrentPhoto(file) {
  if (!editingPhotoId || !window.localStore || !dxfFileFullName) return;
  var p = photos.filter(function (x) { return x.id === editingPhotoId; })[0];
  if (!p) return;

  var targetSize = getImageTargetSize();

  // 사진 번호 텍스트에서 번호를 가져와 새 파일명 생성
  var numTextObj = p.numTextId ? texts.filter(function (t) { return t.id === p.numTextId; })[0] : null;
  var numTextVal = numTextObj ? numTextObj.text : getNextPhotoNumber();

  if (!p.subPhotos) {
    p.subPhotos = [];
    if (p.blob) {
      p.subPhotos.push({
        subIndex: 0,
        fileName: p.fileName || generatePhotoFileName(numTextVal),
        blob: p.blob
      });
    }
  }

  var nextSubSuffix = p.subPhotos.length;
  var newFileName = generatePhotoFileName(numTextVal + '_' + nextSubSuffix);

  function finish(blob) {
    p.subPhotos.push({
      subIndex: nextSubSuffix,
      fileName: newFileName,
      blob: blob
    });
    
    // 메인 blob 및 파일명은 유지
    p.updatedAt = new Date().toISOString();

    window.localStore.savePhoto(dxfFileFullName, p).then(function () {
      showToast('추가 사진이 저장되었습니다.');
      // 모달창 갱신
      showPhotoModal(p.id);
    }).catch(function (err) {
      console.error('서브 사진 저장 실패:', err);
      alert('추가 사진을 저장하지 못했습니다.');
    });
  }

  if (targetSize != null) {
    compressImage(file, targetSize).then(finish).catch(function () {
      finish(file);
    });
  } else {
    finish(file);
  }
}

/** 이미지 슬라이드 뷰어 열기 */
function openImageViewer(subs, startIndex) {
  imageViewerPhotos = subs || [];
  imageViewerIndex = startIndex >= 0 && startIndex < imageViewerPhotos.length ? startIndex : 0;
  
  var viewer = document.getElementById('image-viewer-modal');
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
  var viewer = document.getElementById('image-viewer-modal');
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

  if (item.blob) {
    imageViewerObjectUrl = URL.createObjectURL(item.blob);
    img.src = imageViewerObjectUrl;
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
  var thumbContainer = document.getElementById('photo-modal-thumbnails');
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
  var viewer = document.getElementById('image-viewer-modal');
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



