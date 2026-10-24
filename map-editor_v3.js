console.log("NDMAP MAP-EDITOR V3 LOADED - SMART PIVOT SPEC SYNC");
/**
 * NDMAP 도로대장 웹 편집기 (PC) 비즈니스 로직 (최종 고도화 버전)
 */
(function () {
  'use strict';

  // DOM 요소 지연 캐싱 (Lazy DOM Cache) - 불필요한 반복 DOM 탐색을 방지
  var _domCache = {};
  function getEl(id) {
    if (_domCache[id] === undefined) {
      _domCache[id] = document.getElementById(id) || null;
    }
    return _domCache[id];
  }
  function clearDomCache(id) {
    if (id) { delete _domCache[id]; } else { _domCache = {}; }
  }

  // [안전 방어] 슬라이드바 제거 후 잔여 호출 방어용 무동작 빈 함수 (런타임 에러 완전 차단)
  function hideRelatedSpecSlideBar() {}
  function showRelatedSpecSlideBar() {}
  function triggerRelatedSpecCheck() {}

  // 시설물 제원 포맷 및 입력 양식 설정 (facility-config.js 연동)
  var FACILITY_CONFIG = window.FACILITY_CONFIG || {
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
      prefix: '',
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
    'CCTV': {
      title: 'CCTV',
      layer: 'CCTV_T',
      prefix: 'CCTV',
      fields: [
        { id: 'type', label: '종류', type: 'select', options: ['무인단속카메라', '과속카메라', '기타'], default: '무인단속카메라' },
        { id: 'count', label: '수량', type: 'number', isNumber: true, placeholder: '숫자 입력', default: '' }
      ]
    },
    '주차장': {
      title: '주차장',
      layer: '주차장_T',
      prefix: '주차장',
      fields: []
    },
    '새주소': {
      title: '새주소',
      layer: '새주소_T',
      prefix: '새주소',
      fields: [
        { id: 'content', label: '내용', type: 'text', placeholder: '내용 입력', default: '' },
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
    '미끄럼방지시설': {
      title: '미끄럼방지시설',
      layer: '미끄럼방지_T',
      prefix: '미끄럼방지',
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
    },
    '무단횡단방지시설': {
      title: '무단횡단방지시설',
      layer: '무단횡단방지_T',
      prefix: '무단횡단방지',
      fields: []
    },
    '변압기': {
      title: '변압기',
      layer: '변압기_T',
      prefix: '변압기',
      fields: []
    }
  };

  // 상태 관리 변수
  var map = null;
  var metadata = null;      // 로드된 _metadata.json 내용
  var dxfData = null;       // 로드된 DXF 내용
  var dxfBoundsLatLng = null;// DXF 경계구간 (WGS84)
  var projectBaseName = 'export';
  
  var photoBlobs = {};      // fileName -> Blob 원본
  var photoBlobUrls = {};   // fileName -> Blob Object URL
  var overlays = [];        // google.maps.OverlayView 인스턴스 배열
  var selectedPhotoId = null;
  var attributeCardIndexUnique = 0; // 다중 시설물 고유 ID를 위한 인덱스

  // [고도화 추가] 보라색 원 마커 모드 토글 여부 (기본 false = 큰 사진 모드)
  var isMarkerMode = false;

  // 다중 사진(subPhotos) 및 슬라이딩 이미지 뷰어 상태 변수
  var imageViewerPhotos = [];
  var imageViewerIndex = 0;
  var imageViewerObjectUrl = null;

  // [신규] 스냅(Snap) 인덱스 및 새 마커/사진 복사 상태 변수
  var snapBlockPoints = [];      // 도면 블록 삽입점 캐시: [ { x, y, name } ]
  var snapSegments = [];         // 도면 폴리선 선분 캐시: [ { x1, y1, x2, y2, layer } ]
  var isAddMarkerActive = false; // 새 마커 추가 모드 활성화 플래그
  var copiedPhotoBuffer = null;  // 사진 복사 클립보드 버퍼
  var isSnapEnabled = true;      // 자석 스냅 활성화 여부 (토글 단추 및 Shift 키 연동)

  // FileSystem Access API 디렉토리 핸들 및 메타데이터 원본 파일명 보관
  var dirHandle = null;
  var originalMetadataFileName = 'metadata.json';
  var loadedMetadataFileNames = []; // 로드된 다중 JSON 파일명 보관용
  var dxfEntries = [];              // 폴더 내부의 모든 DXF 파일 핸들 보관용
  
  // [신규] 참조 사전 및 양방향 검색용 상태 관리 변수
  var referenceDictionary = {};       // facilityType -> fieldId -> { value -> count }
  var referenceFacilityCounts = {};   // facilityType -> count (참조 파일 내 시설물 종류 빈도)
  var referenceMemoSuggestions = {};  // memoValue -> count
  var lastFocusedInput = null;        // 마지막 활성 입력창 엘리먼트 추적
  var lastSavedFieldValues = {};       // [신규] 마지막으로 저장한 필드 값 추적: { facilityType -> { fieldId -> value } }
  var isProgrammaticFocusing = false;  // 프로그램적 포커스 이동 중인지 추적하는 플래그

  // 모달 제어를 위한 임시 보관 변수
  var globalJsonEntriesTemp = [];
  var imageEntriesTempForMerge = [];

  // [고도화 추가] 다크 테마 및 사진 정보 라벨 상시 표시 토글 변수
  var themeMode = 'light'; // 'light' | 'dark' | 'gray'
  var isLabelShow = true;

  // -------------------------------------------------------------
  // [1] 구글 맵 초기화 및 이벤트 연결
  // -------------------------------------------------------------
  window.initMap = function () {
    // PhotoSpecOverlay 상속 구조 정의
    if (window.google && window.google.maps) {
      PhotoSpecOverlay.prototype = Object.create(google.maps.OverlayView.prototype);
      PhotoSpecOverlay.prototype.constructor = PhotoSpecOverlay;
      PhotoSpecOverlay.prototype.onAdd = onOverlayAdd;
      PhotoSpecOverlay.prototype.draw = onOverlayDraw;
      PhotoSpecOverlay.prototype.onRemove = onOverlayRemove;
    }

    var C = window.DMAP_CONFIG || {};
    var lat0 = C.MAP_ORIGIN_LAT != null ? C.MAP_ORIGIN_LAT : 36.3;
    var lng0 = C.MAP_ORIGIN_LNG != null ? C.MAP_ORIGIN_LNG : 127.8;
    var blankStyle = C.BLANK_MAP_STYLE || [];

    var mapEl = document.getElementById('map');
    if (!mapEl) return;

    // 지도를 배경 없는 빈 도화지로 로드
    map = new google.maps.Map(mapEl, {
      zoom: 16,
      maxZoom: 25,
      minZoom: 1,
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
      backgroundColor: 'transparent',
      styles: blankStyle
    });

    // CAD 드로잉 선 데이터 레이어 스타일 지정 적용
    applyDxfStyleToMap();

    // 줌 레벨 변경 실시간 감지 리스너 바인딩
    map.addListener('dragstart', function () { collapseSpiderfy(); });
    map.addListener('click', unspiderfy);
      map.addListener('zoom_changed', function () {
      collapseSpiderfy();
      var zoomEl = document.getElementById('map-zoom-level');
      if (zoomEl) {
        zoomEl.textContent = 'Zoom: ' + map.getZoom();
      }
      handleMapZoomOrBoundsChange();
    });


    console.log('NDMAP PC Editor: 구글 맵 Canvas 생성 완료 (배경 없음)');
    setupUI();
    setupImageZoom(); // 플로팅 창 드래그/줌 스크립트 연결
  };

  // -------------------------------------------------------------
  // [2] UI 조작 및 업로드 바인딩
  // -------------------------------------------------------------
  function setupUI() {
    var openFolderBtn = document.getElementById('open-folder-btn');
    var folderFallbackInput = document.getElementById('folder-fallback-input');
    if (folderFallbackInput) {
      folderFallbackInput.addEventListener('change', function (e) {
        var files = Array.from(e.target.files || []);
        if (files.length > 0) {
          handleFolderFallbackFiles(files);
        }
        e.target.value = '';
      });
    }
    var dxfInput = document.getElementById('dxf-file-input');
    var exportBtn = document.getElementById('export-zip-btn');
    
    // [고도화 추가] 배경 테마 토글 단추 바인딩 (라이트 ↔ 다크 ↔ 그레이)
    var themeToggleBtn = document.getElementById('map-theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', function () {
        if (themeMode === 'light') {
          themeMode = 'dark';
          themeToggleBtn.classList.add('active');
          themeToggleBtn.textContent = '테마: 다크';
        } else if (themeMode === 'dark') {
          themeMode = 'gray';
          themeToggleBtn.classList.add('active');
          themeToggleBtn.textContent = '테마: 그레이';
        } else {
          themeMode = 'light';
          themeToggleBtn.classList.remove('active');
          themeToggleBtn.textContent = '테마: 라이트';
        }
        updateThemeOnMap();
        applyDxfStyleToMap();
      });
    }

    // [고도화 추가] 사진 정보 텍스트 상시 표시 토글 단추 바인딩
    var labelToggleBtn = document.getElementById('map-label-toggle');
    if (labelToggleBtn) {
      labelToggleBtn.addEventListener('click', function () {
        isLabelShow = !isLabelShow;
        if (isLabelShow) {
          labelToggleBtn.classList.add('active');
          labelToggleBtn.textContent = '텍스트: 켬';
        } else {
          labelToggleBtn.classList.remove('active');
          labelToggleBtn.textContent = '텍스트: 끔';
        }
        updateLabelsOnMap();
        updateMarkerModeOnMap();
        overlays.forEach(function (o) { o.draw(); });
      });
    }

    // [고도화 추가] 지도의 왼쪽 하단 마커 토글 전환 단추 바인딩
    var markerToggleBtn = document.getElementById('map-marker-toggle');
    if (markerToggleBtn) {
      markerToggleBtn.addEventListener('click', function () {
        isMarkerMode = !isMarkerMode;
        if (isMarkerMode) {
          markerToggleBtn.classList.add('active');
          markerToggleBtn.title = '썸네일 카드 모드로 전환';
        } else {
          markerToggleBtn.classList.remove('active');
          markerToggleBtn.title = '보라색 원 마커 모드로 전환';
        }
        updateMarkerModeOnMap();
      });
    }

    // 폴더 열기 버튼 이벤트
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', handleFolderOpen);
    }

    // DXF 단독 선택 이벤트
    if (dxfInput) {
      dxfInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (file) handleDxfUpload(file);
        e.target.value = '';
      });
    }

    // 내보내기 버튼 이벤트 (안전한 예외 처리)
    if (exportBtn) {
      exportBtn.addEventListener('click', exportModifiedZip);
    }

    // [신규] 새 마커 추가 및 사진 복사/붙여넣기 컨트롤 초기화
    setupNewMarkerAndCopyPasteUI();

    // 치수 실측 단추 이벤트 안전 바인딩
    var panelMeasureBtn = document.getElementById('panel-photo-measure-btn');
    if (panelMeasureBtn) {
      panelMeasureBtn.addEventListener('click', launchPhotoMeasure);
    }
    var winMeasureBtn = document.getElementById('window-measure-btn');
    if (winMeasureBtn) {
      winMeasureBtn.addEventListener('click', launchPhotoMeasure);
    }

    // 드래그 앤 드롭 바인딩 제거 완료
    // (텍스트 드래그 시 오작동으로 오버레이가 발생하는 현상 방지)

    // 편집창 수동 저장 클릭 바인딩
    getEl('photo-save-btn').addEventListener('click', async function () {
      await saveCurrentPhoto();
      // [요구사항] 저장 완료 후 사진 뷰어 자동 닫기
      // 단, 하단 썸네일 바에 겹침 사진이 2장 이상 있으면 닫지 않음 (다른 사진도 작업 필요)
      var _fw = getEl('floating-image-window');
      var _thumbs = getEl('floating-window-thumbnails');
      var hasSiblings = _thumbs && _thumbs.children.length > 1;
      if (_fw && !hasSiblings) {
        _fw.style.display = 'none';
      }
    });

    // 메모 입력창 포커스 하이라이트, 텍스트 자동 전체선택 및 엔터 저장 연동
    var memoEl = getEl('photo-memo');
    if (memoEl) {
      setupInputFocusFade(memoEl);
      memoEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var saveBtn = getEl('photo-save-btn');
          if (saveBtn) saveBtn.click();
        }
      });
    }

    // 겹침 사진 모달 닫기
    document.getElementById('overlap-modal-close').addEventListener('click', function () {
      document.getElementById('overlap-photos-modal').classList.remove('active');
    });

    // [고도화 추가] 사진 뷰어 팝업 열기 헬퍼 함수 (도면 영역의 70% 크기 및 중앙 배치)
    // [고도화 추가] 사진 뷰어 팝업 열기 헬퍼 함수 (기본 최대화 기동 - 지도 영역 꽉 차게)
    window.openPhotoViewer = function (imgSrc, photoTitle) {
      var floatingWin = getEl('floating-image-window');
      var imageModal = getEl('image-modal-src');
      if (!floatingWin || !imageModal) return;

      imageModal.src = imgSrc;
      // 뷰어 이미지의 HTML5 드래그를 비활성화하여 드롭 오버레이가 오동작하지 않도록 조치 (1번 요건)
      imageModal.setAttribute('draggable', 'false');
      
      getEl('floating-window-title').textContent = photoTitle;
      resetZoomState();

      // 사진창 열릴 때 기본 최대화 상태 활성화 (가득 채워 열기 요구사항 반영)
      isImageMaximized = true;
      var maxBtn = getEl('window-maximize-btn');
      if (maxBtn) {
        maxBtn.textContent = '❐'; // 복원 아이콘
        maxBtn.title = '이전 크기로 복원';
      }

      // 도면영역(canvas-container)의 100% 크기 및 좌상단(0,0) 강제 중앙 채우기
      var container = document.querySelector('.canvas-container');
      if (container) {
        var w = container.offsetWidth;
        var h = container.offsetHeight;

        // 나중에 원래 크기로 복원할 때를 대비해 이전 크기를 70% 구도로 백업해 둠
        preMaximizedCoords = {
          width: Math.round(w * 0.7),
          height: Math.round(h * 0.7),
          left: Math.round(w * 0.15),
          top: Math.round(h * 0.15)
        };

        floatingWin.style.width = w + 'px';
        floatingWin.style.height = h + 'px';
        floatingWin.style.left = '0px';
        floatingWin.style.top = '0px';
      } else {
        floatingWin.style.width = '100%';
        floatingWin.style.height = '100%';
        floatingWin.style.left = '0px';
        floatingWin.style.top = '0px';
      }

      // 단일 사진으로 열었을 때는 썸네일 리스트를 숨김
      var thumbContainer = getEl('floating-window-thumbnails');
      if (thumbContainer) {
        thumbContainer.style.display = 'none';
        thumbContainer.innerHTML = '';
      }

      floatingWin.style.display = 'flex';
      // 뷰어가 열리는 즉시 현재 제원 및 속성 정보를 오버레이 렌더링함
      updateFloatingWindowSpecs();
    };

    // [신규 고도화] 겹침 사진 썸네일 리스트 연동 지원 사진 뷰어 기동 함수
    window.openPhotoViewerWithSiblings = function (activePhoto, siblings) {
      var imgSrc = photoBlobUrls[activePhoto.fileName] || '';
      var numStr = '';
      if (metadata && metadata.texts && activePhoto.numTextId) {
        var txtObj = metadata.texts.find(function (t) { return t.id === activePhoto.numTextId; });
        if (txtObj) numStr = '#' + txtObj.text;
      }
      if (!numStr) numStr = '사진';
      var srcTag = activePhoto.sourceFile ? ' [' + activePhoto.sourceFile + ']' : '';
      var photoTitle = '사진 원본 보기 (' + numStr + ' - ' + activePhoto.fileName + srcTag + ')';

      // 1. 기본 뷰어를 지도 영역 꽉 찬 최대화 형태로 로딩
      openPhotoViewer(imgSrc, photoTitle);

      // 2. 겹친 사진이 2장 이상일 때만 하단 썸네일 슬라이더 활성화
      var thumbContainer = getEl('floating-window-thumbnails');
      if (!thumbContainer) return;

      if (siblings && siblings.length > 1) {
        thumbContainer.innerHTML = '';
        thumbContainer.style.display = 'flex';

        siblings.forEach(function (p) {
          var item = document.createElement('div');
          item.className = 'floating-thumb-item';
          if (p.id === activePhoto.id) {
            item.classList.add('active');
          }

          var img = document.createElement('img');
          img.src = photoBlobUrls[p.fileName] || '';
          img.alt = p.fileName;
          item.appendChild(img);

          // 사진 번호 오버레이 레이블 표시
          var pNum = '';
          if (metadata && metadata.texts && p.numTextId) {
            var txtObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
            if (txtObj) pNum = txtObj.text;
          }
          if (pNum) {
            var badge = document.createElement('div');
            badge.className = 'thumb-num';
            badge.textContent = '#' + pNum;
            item.appendChild(badge);
          }

          item.addEventListener('click', function () {
            // 사이드바 선택 및 활성 사진 갱신
            selectPhoto(p.id);
            
            // 썸네일 활성화 상태 클래스 갱신
            var allThumbs = thumbContainer.querySelectorAll('.floating-thumb-item');
            allThumbs.forEach(function (t) { t.classList.remove('active'); });
            item.classList.add('active');

            // 뷰어 본문 이미지 및 타이틀 갱신
            var mainImg = getEl('image-modal-src');
            if (mainImg) {
              mainImg.src = photoBlobUrls[p.fileName] || '';
            }
            var actNum = '';
            if (metadata && metadata.texts && p.numTextId) {
              var txtObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
              if (txtObj) actNum = '#' + txtObj.text;
            }
            if (!actNum) actNum = '사진';
            var srcTag = p.sourceFile ? ' [' + p.sourceFile + ']' : '';
            getEl('floating-window-title').textContent = '사진 원본 보기 (' + actNum + ' - ' + p.fileName + srcTag + ')';
            
            // 줌 상태 초기화
            resetZoomState();
            // 오버레이 사양 갱신
            updateFloatingWindowSpecs();
          });

          thumbContainer.appendChild(item);
        });
      } else {
        thumbContainer.style.display = 'none';
        thumbContainer.innerHTML = '';
      }
    };

    // 썸네일 클릭 시 [드래그 가능한 플로팅 팝업창(Modeless)] 열기
    var previewImg = document.getElementById('preview-img');
    var floatingWin = getEl('floating-image-window');
    
    if (previewImg) {
      function openPreviewViewer() {
        if (previewImg.src && selectedPhotoId && metadata && metadata.photos) {
          var p = metadata.photos.find(function (x) { return x.id === selectedPhotoId; });
          if (p) {
            var samePosPhotos = metadata.photos.filter(function (x) {
              return x.position && p.position && 
                     Math.hypot(x.position.x - p.position.x, x.position.y - p.position.y) < 0.5;
            });
            openPhotoViewerWithSiblings(p, samePosPhotos);
            return;
          }
        }
        if (previewImg.src) {
          var title = '사진 원본 보기 (' + (document.getElementById('preview-photo-number').textContent || '') + ')';
          openPhotoViewer(previewImg.src, title);
        }
      }
      previewImg.addEventListener('click', openPreviewViewer);
      previewImg.addEventListener('dblclick', openPreviewViewer);
    }

    // 사진 영역 마우스 단순 클릭(드래그가 아닐 때) 시 X 버튼 클릭한 것처럼 창 닫기 연동 (1번 요건)
    var zoomContainer = document.getElementById('zoom-container');
    if (zoomContainer) {
      var clickStartX = 0;
      var clickStartY = 0;
      zoomContainer.addEventListener('mousedown', function (e) {
        clickStartX = e.clientX;
        clickStartY = e.clientY;
      });
      zoomContainer.addEventListener('mouseup', function (e) {
        if (e.button !== 0) return; // 마우스 왼쪽 클릭일 때만 반응
        var dx = e.clientX - clickStartX;
        var dy = e.clientY - clickStartY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) { // 4픽셀 미만 이동 시 클릭으로 판단하여 사진창 숨김
          if (floatingWin) floatingWin.style.display = 'none';
        }
      });
    }

    // 사진 뷰어 영역 내에서 마우스 오른쪽 클릭 시 저장하고 닫기 기능 연동 (방안 2)
    if (floatingWin) {
      floatingWin.addEventListener('contextmenu', function (e) {
        e.preventDefault(); // 브라우저 기본 우클릭 메뉴 차단
        var saveBtn = getEl('photo-save-btn');
        if (saveBtn) {
          saveBtn.click(); // '수정사항 저장' 버튼 자동 클릭
        }
      });
    }

    // 플로팅 윈도우 닫기 단추
    document.getElementById('window-close-btn').addEventListener('click', function () {
      floatingWin.style.display = 'none';
    });

    // 플로팅 윈도우 줌 초기화 단추
    document.getElementById('window-reset-zoom').addEventListener('click', function () {
      resetZoomState();
    });

    // 시설물 드롭다운 선택 시 [선택 즉시 카드가 펼쳐지도록] 구현
    var addSelect = document.getElementById('add-facility-select');
    if (addSelect) {
      addSelect.addEventListener('change', function () {
        var type = this.value;
        if (!type) return;
        
        if (!selectedPhotoId) {
          alert('먼저 작업할 사진을 선택해 주세요.');
          this.value = "";
          return;
        }
        
        var container = document.getElementById('attribute-cards-container');
        renderAttributeCard(container, type, null);
        updateFloatingWindowSpecs(); // 실시간 오버레이 동기화
        this.value = ""; // 초기화
      });
    }
  }

  // 로딩 링 제어
  function showLoading(show, text) {
    var el = document.getElementById('loading-spinner');
    var txtEl = document.getElementById('loading-text');
    if (show) {
      if (text) txtEl.textContent = text;
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  // -------------------------------------------------------------
  // [3] 로컬 폴더 처리 및 로컬 실시간 저장 준비
  // -------------------------------------------------------------
  // IndexedDB를 이용한 디렉토리 핸들 저장 및 복원 헬퍼
  var DB_NAME = 'NDMAP_Editor_DB';
  var STORE_NAME = 'folder_handle_store';
  var KEY_NAME = 'last_dir_handle';

  function getDB() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = function (e) {
        resolve(e.target.result);
      };
      request.onerror = function (e) {
        reject(e.target.error);
      };
    });
  }

  async function saveLastFolderHandle(handle) {
    try {
      var db = await getDB();
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      store.put(handle, KEY_NAME);
      return new Promise(function (resolve) {
        tx.oncomplete = function () { resolve(true); };
      });
    } catch (e) {
      console.warn('마지막 폴더 핸들 저장 실패:', e);
      return false;
    }
  }

  async function getLastFolderHandle() {
    try {
      var db = await getDB();
      var tx = db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var req = store.get(KEY_NAME);
      return new Promise(function (resolve) {
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
    } catch (e) {
      console.warn('마지막 폴더 핸들 가져오기 실패:', e);
      return null;
    }
  }

  async function handleFolderOpen() {
    var fallbackInput = document.getElementById('folder-fallback-input');

    // 1. File System Access API (showDirectoryPicker) 직접 즉시 호출 (사용자 제스처 보존)
    if (typeof window.showDirectoryPicker === 'function') {
      try {
        var options = {
          id: 'ndmap-folder-picker',
          mode: 'readwrite'
        };
        var handle = await window.showDirectoryPicker(options);
        if (handle) {
          await saveLastFolderHandle(handle);
          await handleFolderHandle(handle);
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // 사용자가 취소함
        }
        console.warn('showDirectoryPicker 실패, 표준 폴더 선택기로 전환합니다:', err);
      }
    }

    // 2. 2단계 방어선: 표준 HTML5 webkitdirectory input 창으로 즉각 열기 (100% 호환 보장)
    if (fallbackInput) {
      fallbackInput.value = '';
      fallbackInput.click();
    } else {
      alert('폴더 열기를 실행할 수 없습니다. 크롬(Chrome) 또는 엣지(Edge) 브라우저를 사용해 주세요.');
    }
  }

  async function handleFolderHandle(handle) {
    showLoading(true, '폴더 내부 파일 스캔 중...');

    dirHandle = handle;
    clearAllPhotoUrls();
    photoBlobs = {};
    photoBlobUrls = {};
    metadata = null;
    dxfData = null;
    dxfEntries = [];
    loadedMetadataFileNames = [];
    clearOverlays();

    // 플로팅 이미지 창 숨기기
    var floatingWin = getEl('floating-image-window');
    if (floatingWin) floatingWin.style.display = 'none';

    try {
      var files = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          files.push(entry);
        }
      }

      var dxfEntriesTemp = [];
      var imageEntries = [];
      var jsonEntries = [];

      files.forEach(function (entry) {
        var name = entry.name.toLowerCase();
        if (name.endsWith('.json')) {
          jsonEntries.push(entry);
        } else if (name.endsWith('.dxf')) {
          dxfEntriesTemp.push(entry);
        } else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
          imageEntries.push(entry);
        }
      });

      dxfEntries = dxfEntriesTemp; // 전역 DXF 목록 갱신

      if (jsonEntries.length === 0) {
        throw new Error('선택한 폴더 내부에 메타데이터 파일(.json)이 없습니다.');
      }

      showLoading(false);

      if (jsonEntries.length === 1) {
        await finishFolderLoad([jsonEntries[0]], dxfEntries, imageEntries);
      } else {
        // 여러 JSON 파일 감지 시 다중 선택용 임시 캐싱 후 모달 표시
        globalJsonEntriesTemp = jsonEntries;
        imageEntriesTempForMerge = imageEntries;
        showJsonSelectModal(jsonEntries, dxfEntries, imageEntries);
      }

    } catch (err) {
      showLoading(false);
      console.error(err);
      alert('폴더 읽기 중 실패: ' + err.message);
    }
  }

  // 실제 선택한 JSON 파일과 이미지를 로드하여 편집기 화면을 갱신하는 공통 기능 (다중 파일 지원)
  async function finishFolderLoad(metadataEntries, dxfEntries, imageEntries) {
    try {
      showLoading(true, '데이터 파일 파싱 중...');
      
      // 병합 데이터 초기 껍데기 세팅
      metadata = {
        dxfFile: '',
        photos: [],
        texts: [],
        _editHistory: {},
        _pivotHistory: {}
      };
      
      loadedMetadataFileNames = [];
      originalMetadataFileName = metadataEntries[0].name;
      projectBaseName = dirHandle.name;

      var dxfFileList = [];

      // 1. 메타데이터 파싱 및 병합 작업
      for (var fIdx = 0; fIdx < metadataEntries.length; fIdx++) {
        var entry = metadataEntries[fIdx];
        loadedMetadataFileNames.push(entry.name);

        var metadataFile = await entry.getFile();
        var metadataText = await metadataFile.text();
        var partData = null;
        try {
          partData = JSON.parse(metadataText);
        } catch (e) {
          throw new Error(entry.name + ' 파일의 형식이 올바르지 않습니다.');
        }

        // 관련 DXF 파일 이름 수집 (dxfFile 및 drawingFile 모두 지원)
        var dxfTarget = partData.dxfFile || partData.drawingFile || '';
        if (dxfTarget && dxfFileList.indexOf(dxfTarget) === -1) {
          dxfFileList.push(dxfTarget);
        }

        // 2개 이상 파일 로드 시에만 충돌 방지 고유 접미사 부여 (단일 로드 시에는 ID 보존)
        var suffix = metadataEntries.length > 1 ? '_f' + (fIdx + 1) : '';

        // 사진 병합
        if (partData.photos) {
          partData.photos.forEach(function (p) {
            var newPhoto = Object.assign({}, p);
            // position 객체 누락 시 x, y로부터 자동 생성
            if (!newPhoto.position && typeof newPhoto.x === 'number' && typeof newPhoto.y === 'number') {
              newPhoto.position = { x: newPhoto.x, y: newPhoto.y };
            }
            if (newPhoto.id) newPhoto.id = newPhoto.id + suffix;
            if (newPhoto.numTextId) newPhoto.numTextId = newPhoto.numTextId + suffix;
            if (newPhoto.specTextId) newPhoto.specTextId = newPhoto.specTextId + suffix;
            if (newPhoto.specTextIds) {
              newPhoto.specTextIds = newPhoto.specTextIds.map(function (id) { return id + suffix; });
            }
            
            // 출처 속성 주입
            newPhoto.sourceFile = entry.name.replace('_metadata.json', '').replace('.json', '');
            
            metadata.photos.push(newPhoto);
          });
        }

        // 텍스트 병합
        if (partData.texts) {
          partData.texts.forEach(function (t) {
            var newText = Object.assign({}, t);
            if (newText.id) newText.id = newText.id + suffix;
            metadata.texts.push(newText);
          });
        }

        // [방안 B] 메타데이터 파일 내 편집 이력(_editHistory) 병합
        if (partData._editHistory) {
          for (var ehType in partData._editHistory) {
            if (!metadata._editHistory[ehType]) metadata._editHistory[ehType] = {};
            for (var ehFid in partData._editHistory[ehType]) {
              if (!metadata._editHistory[ehType][ehFid]) metadata._editHistory[ehType][ehFid] = [];
              var srcArr = partData._editHistory[ehType][ehFid];
              if (Array.isArray(srcArr)) {
                srcArr.forEach(function (v) {
                  if (metadata._editHistory[ehType][ehFid].indexOf(v) === -1) {
                    metadata._editHistory[ehType][ehFid].push(v);
                  }
                });
              }
            }
          }
        }

        // [방안 B] 메타데이터 파일 내 피벗 기준별 편집 이력(_pivotHistory) 병합
        if (partData._pivotHistory) {
          for (var phType in partData._pivotHistory) {
            if (!metadata._pivotHistory[phType]) metadata._pivotHistory[phType] = {};
            for (var phPiv in partData._pivotHistory[phType]) {
              if (!metadata._pivotHistory[phType][phPiv]) metadata._pivotHistory[phType][phPiv] = {};
              for (var phFid in partData._pivotHistory[phType][phPiv]) {
                if (!metadata._pivotHistory[phType][phPiv][phFid]) metadata._pivotHistory[phType][phPiv][phFid] = [];
                var pSrcArr = partData._pivotHistory[phType][phPiv][phFid];
                if (Array.isArray(pSrcArr)) {
                  pSrcArr.forEach(function (v) {
                    if (metadata._pivotHistory[phType][phPiv][phFid].indexOf(v) === -1) {
                      metadata._pivotHistory[phType][phPiv][phFid].push(v);
                    }
                  });
                }
              }
            }
          }
        }
      }

      // 수집된 DXF 명칭 기록 (dxfFile 및 drawingFile 모두 동기화)
      metadata.dxfFile = dxfFileList.join(' & ');
      metadata.drawingFile = metadata.dxfFile;

      // [고도화 추가] 사진 번호에 _가 들어간 참조용 사진(예: 사진 번호가 '10_1')의 속성 및 메모 일괄 자동 정제 (캐드 텍스트 중복 방지)
      if (metadata && metadata.photos) {
        var removedTextIds = [];
        
        metadata.photos.forEach(function (p) {
          // 사진 번호 텍스트 획득
          var numStr = '';
          if (metadata.texts && p.numTextId) {
            var numObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
            if (numObj) numStr = numObj.text;
          }

          // 사진 번호 자체에 언더바 '_'가 들어가 있는 경우만 참조용 사진으로 정밀 판정 (예: '10_1' -> 소독 대상, '10' -> 보존 대상)
          if (numStr && numStr.indexOf('_') !== -1) {
            // 1. 제거할 제원 텍스트 ID들 수집 (사진 번호인 p.numTextId는 보존하여 캐드 매핑 유지)
            var ids = p.specTextIds || [];
            if (ids.length === 0 && p.specTextId) {
              ids = [p.specTextId];
            }
            ids.forEach(function (id) {
              if (id) removedTextIds.push(id);
            });

            // 2. 참조 사진의 속성 제원 및 메모 초기화
            p.facilityType = '일반사진';
            p.specTextId = null;
            p.specTextIds = null;
            p.memo = ''; // 메모도 도면 중복 방지를 위해 빈 문자열로 정제
          }
        });

        // 3. 수집된 제원 텍스트 객체들만 metadata.texts 목록에서 영구 제거
        if (removedTextIds.length > 0 && metadata.texts) {
          metadata.texts = metadata.texts.filter(function (t) {
            return removedTextIds.indexOf(t.id) === -1;
          });
          console.log('참조용 사진 중복 제원 및 메모 텍스트 소독 완료:', removedTextIds.length, '건');
        }

        // [추가] 각 사진의 기존 제원 텍스트를 역직렬화하여 facilityType을 실시간으로 초기 셋업해 줌 (빈도 정렬 완벽 복원)
        metadata.photos.forEach(function (p) {
          if (!p.facilityType) {
            var tId = (p.specTextIds && p.specTextIds.length > 0) ? p.specTextIds[0] : p.specTextId;
            if (tId && metadata.texts) {
              var tObj = metadata.texts.find(function (t) { return t.id === tId; });
              if (tObj && tObj.text) {
                var parseResult = deserializeSpecText(tObj.text, tObj.layer);
                if (parseResult) {
                  p.facilityType = parseResult.facilityType;
                }
              }
            }
          }
          if (!p.facilityType) {
            // 제원이 없다면 파일명 자동 감지 시도
            var autoType = detectFacilityType(p.fileName, p.memo);
            if (autoType) {
              p.facilityType = autoType;
            } else {
              p.facilityType = '일반사진';
            }
          }
        });

        // [방안 3] 메타데이터 로드 시점 텍스트-사진 검수 상태 전수 정규화 (부시설물 미검수 시 주황 마커 보장)
        normalizePhotoSpecsEditedState();
      }

      showLoading(true, '사진 이미지 파일 매핑 중...');
      // 2. 이미지들을 Blob 및 URL로 읽어 매핑
      var imagePromises = imageEntries.map(async function (entry) {
        var file = await entry.getFile();
        photoBlobs[entry.name] = file;
        photoBlobUrls[entry.name] = URL.createObjectURL(file);
      });
      await Promise.all(imagePromises);

      // 3. 다중 DXF 자동 로딩 및 병합 렌더링
      var matchedDxfEntries = dxfEntries.filter(function (entry) {
        return dxfFileList.some(function (dxfName) {
          return entry.name.toLowerCase() === dxfName.toLowerCase();
        });
      });

      // 만약 JSON 파일 내의 dxfFile명과 매칭되는 게 없어도 폴더에 DXF 파일이 있다면 그것들을 기본 로드
      if (matchedDxfEntries.length === 0 && dxfEntries.length > 0) {
        matchedDxfEntries = dxfEntries;
      }

      if (matchedDxfEntries.length > 0) {
        showLoading(true, '도면 DXF 파일 로딩 중...');
        
        // 지도 클리어 및 바운드 초기화
        if (map && window.DxfToGeoJSON) {
          map.data.forEach(function (feature) { map.data.remove(feature); });
        }
        dxfBoundsLatLng = new google.maps.LatLngBounds();
        var hasAnyDxf = false;

        for (var dIdx = 0; dIdx < matchedDxfEntries.length; dIdx++) {
          var dEntry = matchedDxfEntries[dIdx];
          var dxfFile = await dEntry.getFile();
          var dxfText = await dxfFile.text();
          
          try {
            var parser = new DxfParser();
            var dxf = parser.parseSync(dxfText);
            
            var C = window.DMAP_CONFIG || {};
            if (C.DXF_CRS && window.DxfToGeoJSON && window.DxfToGeoJSON.setCrs) {
              window.DxfToGeoJSON.setCrs(C.DXF_CRS);
            }

            var geoJson = window.DxfToGeoJSON.dxfToGeoJSON(dxf);
            if (geoJson.features && geoJson.features.length > 0) {
              map.data.addGeoJson(geoJson);
              var partBounds = boundsFromGeoJSON(geoJson);
              if (partBounds) {
                dxfBoundsLatLng.union(partBounds);
                hasAnyDxf = true;
              }
            }
            // [핵심 해결] 폴더 열기 시 로드된 DXF 도면의 블록 및 폴리선 스냅 인덱스를 즉시 빌드!
            dxfData = dxf;
            buildSnapIndex(dxf);
          } catch (dxfErr) {
            console.error(dEntry.name + ' DXF 파싱 실패:', dxfErr);
          }
        }
        
        if (hasAnyDxf) {
          fitDxfToView();
        } else {
          dxfBoundsLatLng = null;
        }
      }

      showLoading(false);

      // 화면 갱신
      var loadedNamesStr = metadataEntries.map(function(e) { return e.name; }).join(', ');
      document.getElementById('loaded-filename-badge').textContent = projectBaseName + ' (' + loadedNamesStr + ' 로드됨)';
      document.getElementById('loaded-filename-badge').style.display = 'inline-block';
      document.getElementById('welcome-panel').style.display = 'none';
      document.getElementById('detail-panel').style.display = 'block';
      document.getElementById('sidebar-actions').style.display = 'flex';

      var exportBtn = document.getElementById('export-zip-btn');
      if (exportBtn) exportBtn.disabled = false;

      if (matchedDxfEntries.length === 0) {
        alert('폴더 내에 DXF 도면이 없습니다.\n[📐 DXF 파일 열기] 버튼으로 도면을 업로드해 주세요.');
      }

      updateFacilitySelectOptions();
      updateInspectFacilityOptions();
      drawPhotoOverlays();
      updateProgressBar();

      // 첫 번째 사진 자동 선택
      if (metadata && metadata.photos && metadata.photos.length > 0) {
        selectPhoto(metadata.photos[0].id);
      }

    } catch (err) {
      showLoading(false);
      console.error(err);
      alert('폴더 읽기 중 실패: ' + err.message);
    }
  }

  // 여러 개의 JSON 파일이 감지되었을 때 선택 팝업창을 띄우는 함수 (체크박스 다중 선택 구조 개편)
  function showJsonSelectModal(jsonEntries, dxfEntries, imageEntries) {
    var modal = getEl('json-select-modal');
    var listContainer = document.getElementById('json-file-list');
    listContainer.innerHTML = '';

    // 파일 이름 사전순 및 수정본 우선순위 정렬
    jsonEntries.sort(function (a, b) {
      var aName = a.name.toLowerCase();
      var bName = b.name.toLowerCase();
      var aIsMod = aName.endsWith('_수정.json');
      var bIsMod = bName.endsWith('_수정.json');
      
      if (aIsMod && !bIsMod) return -1;
      if (!aIsMod && bIsMod) return 1;
      return aName.localeCompare(bName);
    });

    jsonEntries.forEach(function (entry) {
      var container = document.createElement('div');
      container.className = 'overlap-item';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '12px';
      container.style.cursor = 'pointer';
      container.style.padding = '10px 12px';
      container.style.width = '100%';

      // 체크박스 생성
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'json-chk-item';
      chk.value = entry.name;
      chk.style.cursor = 'pointer';
      chk.style.width = '16px';
      chk.style.height = '16px';
      chk.addEventListener('click', function(e) {
        e.stopPropagation(); // 체크박스 자체 클릭 시 버블링 방지
      });
      container.appendChild(chk);

      // 전체 클릭 시 체크박스 상태 토글
      container.addEventListener('click', function(e) {
        if (e.target !== chk) {
          chk.checked = !chk.checked;
        }
      });

      var info = document.createElement('div');
      info.className = 'overlap-item-info';
      
      var title = document.createElement('div');
      title.className = 'overlap-item-title';
      title.textContent = entry.name;
      title.style.fontSize = '13px';
      info.appendChild(title);

      var desc = document.createElement('div');
      desc.className = 'overlap-item-desc';
      desc.style.maxWidth = '100%';
      
      if (entry.name.toLowerCase().endsWith('_수정.json')) {
        desc.textContent = 'PC 편집기 저장본';
        desc.style.color = '#60a5fa';
      } else if (entry.name.toLowerCase() === 'metadata.json' || entry.name.toLowerCase() === '_metadata.json' || entry.name.toLowerCase().endsWith('_metadata.json')) {
        desc.textContent = '최초 원본 파일';
        desc.style.color = '#10b981';
      } else {
        desc.textContent = '데이터 파일';
      }
      info.appendChild(desc);
      container.appendChild(info);

      // 더블클릭 시 팝업을 닫고 해당 단일 파일만 즉시 로드 (사용자 편의)
      container.addEventListener('dblclick', function () {
        modal.classList.remove('active');
        finishFolderLoad([entry], dxfEntries, imageEntries);
      });

      listContainer.appendChild(container);
    });

    modal.classList.add('active');
  }

  // 파일명에서 확장자, _수정, _metadata 등을 깔끔하게 벗겨내고 순수 지역/공구 명칭만 추출하는 헬퍼
  function cleanMetadataBaseName(fileName) {
    if (!fileName) return '';
    var name = fileName.replace(/\.json$/i, '');
    // 뒤에 붙은 '_수정' 반복 제거 (_수정, _수정_수정 등)
    name = name.replace(/(_수정)+$/i, '');
    // 뒤에 붙은 '_metadata' 또는 단독 'metadata' 제거
    if (name.toLowerCase() === 'metadata') {
      return '';
    }
    name = name.replace(/_metadata$/i, '');
    return name.trim();
  }

  function getModifiedMetadataFileName() {
    // 1. 다중 로드된 파일들인 경우 (_수정 및 _metadata 중복 없이 항상 '_metadata_수정.json'으로 단일화)
    if (loadedMetadataFileNames && loadedMetadataFileNames.length > 1) {
      var baseNames = [];
      loadedMetadataFileNames.forEach(function (name) {
        var clean = cleanMetadataBaseName(name);
        if (clean && baseNames.indexOf(clean) === -1) {
          baseNames.push(clean);
        }
      });

      // 추출된 공구/지역명이 있으면 결합 후 '_metadata_수정.json' 부여
      if (baseNames.length > 0) {
        return baseNames.join('_') + '_metadata_수정.json';
      }
      return 'metadata_수정.json';
    }

    // 2. 단일 파일 로드인 경우
    var base = originalMetadataFileName || 'metadata.json';
    var nameWithoutExt = base.replace(/\.json$/i, '');

    // 이미 '_metadata_수정'으로 끝나는 경우 그대로 유지하여 덮어쓰기 저장 (중복 방지)
    if (nameWithoutExt.endsWith('_metadata_수정')) {
      return nameWithoutExt + '.json';
    }

    // 기존의 '_수정'으로 끝나는 파일인 경우
    if (nameWithoutExt.endsWith('_수정')) {
      var raw = nameWithoutExt.replace(/(_수정)+$/i, '');
      if (raw.endsWith('_metadata')) {
        return raw + '_수정.json';
      }
      if (raw.toLowerCase() === 'metadata') {
        return 'metadata_수정.json';
      }
      return raw + '_metadata_수정.json';
    }

    // 기본 'metadata.json'인 경우 -> 'metadata_수정.json'
    if (nameWithoutExt.toLowerCase() === 'metadata') {
      return 'metadata_수정.json';
    }

    // '구역명_metadata.json'인 경우 -> '구역명_metadata_수정.json'
    if (nameWithoutExt.endsWith('_metadata')) {
      return nameWithoutExt + '_수정.json';
    }

    // '구역명.json'인 경우 -> '구역명_metadata_수정.json'
    return nameWithoutExt + '_metadata_수정.json';
  }

  async function saveMetadataToLocalFolder(data) {
    if (!dirHandle) {
      try {
        var lastH = await getLastFolderHandle();
        if (lastH) dirHandle = lastH;
      } catch (e) {
        console.warn('저장 전 폴더 핸들 복구 실패:', e);
      }
    }
    if (!dirHandle) return false;

    try {
      var targetName = getModifiedMetadataFileName();
      var permissionOpts = { mode: 'readwrite' };
      
      // 권한 승인 검사 (필요 시 권한 재요청)
      if (await dirHandle.queryPermission(permissionOpts) !== 'granted') {
        if (await dirHandle.requestPermission(permissionOpts) !== 'granted') {
          throw new Error('폴더 쓰기 권한이 거절되었습니다.');
        }
      }

      var fileHandle = await dirHandle.getFileHandle(targetName, { create: true });
      var writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      console.log('폴더 내 자동 실시간 저장 성공:', targetName);
      return true;
    } catch (err) {
      console.error('로컬 폴더 내 저장 에러:', err);
      return false;
    }
  }

  // 개별 DXF 업로드 처리
  function handleDxfUpload(file) {
    showLoading(true, 'DXF 도면 파싱 중...');
    file.text().then(function (text) {
      return parseDxfString(text, file.name);
    }).then(function () {
      showLoading(false);
      alert('DXF 도면이 성공적으로 로드되었습니다.');
    }).catch(function (err) {
      showLoading(false);
      console.error(err);
      alert('DXF 파싱 실패: ' + err.message);
    });
  }

  // DXF 텍스트 분석 및 지도 반영
  function parseDxfString(text, fileName) {
    if (typeof DxfParser === 'undefined') {
      throw new Error('dxf-parser 라이브러리가 로드되지 않았습니다.');
    }
    
    var parser = new DxfParser();
    var dxf = parser.parseSync(text);
    dxfData = dxf;
    
    var C = window.DMAP_CONFIG || {};
    if (C.DXF_CRS && window.DxfToGeoJSON && window.DxfToGeoJSON.setCrs) {
      window.DxfToGeoJSON.setCrs(C.DXF_CRS);
    }

    applyDxfToMap();
    fitDxfToView();
  }

  function applyDxfToMap() {
    if (!map || !dxfData || !window.DxfToGeoJSON) return;
    try {
      map.data.forEach(function (feature) { map.data.remove(feature); });
      
      var geoJson = window.DxfToGeoJSON.dxfToGeoJSON(dxfData);
      if (geoJson.features && geoJson.features.length > 0) {
        try {
          map.data.addGeoJson(geoJson);
        } catch (geoErr) {
          console.warn('map-editor GeoJSON 일괄 주입 오류, 개별 주입:', geoErr);
          (geoJson.features || []).forEach(function (f) {
            try { map.data.addGeoJson({ type: 'FeatureCollection', features: [f] }); } catch (ign) {}
          });
        }
        dxfBoundsLatLng = boundsFromGeoJSON(geoJson);
      }
      // [신규] DXF 도면 로드 완료 즉시 블록 삽입점 및 폴리선 스냅 인덱스 자동 빌드
      buildSnapIndex(dxfData);
    } catch (err) {
      console.error('map-editor applyDxfToMap 오류:', err);
    }
  }

  function boundsFromGeoJSON(geoJson) {
    var bounds = new google.maps.LatLngBounds();
    var hasAny = false;
    geoJson.features.forEach(function (f) {
      if (f.geometry && f.geometry.coordinates) {
        var type = f.geometry.type;
        if (type === 'Point') {
          bounds.extend(new google.maps.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]));
          hasAny = true;
        } else if (type === 'LineString') {
          f.geometry.coordinates.forEach(function (c) {
            bounds.extend(new google.maps.LatLng(c[1], c[0]));
            hasAny = true;
          });
        } else if (type === 'Polygon') {
          f.geometry.coordinates[0].forEach(function (c) {
            bounds.extend(new google.maps.LatLng(c[1], c[0]));
            hasAny = true;
          });
        }
      }
    });
    return hasAny ? bounds : null;
  }

  function fitDxfToView() {
    if (map && dxfBoundsLatLng) {
      map.fitBounds(dxfBoundsLatLng);
    }
  }

  function clearAllPhotoUrls() {
    for (var key in photoBlobUrls) {
      URL.revokeObjectURL(photoBlobUrls[key]);
    }
  }

  // -------------------------------------------------------------
  // [4] Google Maps 커스텀 오버레이 구현 (사진 마커)
  // -------------------------------------------------------------
  function clearOverlays() {
    overlays.forEach(function (o) {
      if (o && typeof o.setMap === 'function') {
        o.setMap(null);
      }
    });
    overlays = [];
  }

  function drawPhotoOverlays() {
    unspiderfy();
    clearOverlays();
    if (!map || !metadata || !metadata.photos) return;

    // [방안 3 핵심] 오버레이 마커 렌더링 직전 전체 검수 상태 정규화 동기화
    normalizePhotoSpecsEditedState();

    // [방안 1: 100% 순수 독립 마커]
    // 묶음, 숨김, threshold 그룹핑 완전 제거! 모든 사진을 1:1로 각각의 원래 위치에 독립 렌더링!
    metadata.photos.forEach(function (p) {
      if (!p.position) return;
      var overlay = new PhotoSpecOverlay(p, map);
      overlays.push(overlay);
    });

    handleMapZoomOrBoundsChange();
  }

  function findOverlappingPhotos(photo, checkedIds) {
    if (!metadata || !metadata.photos || !photo.position) return [photo];
    var threshold = 0.5; // 도면 0.5미터 이내 초근접 마커만 포개짐으로 판정
    return metadata.photos.filter(function (other) {
      if (!other.position) return false;
      if (checkedIds && other.id !== photo.id && checkedIds[other.id]) return false;
      var dx = photo.position.x - other.position.x;
      var dy = photo.position.y - other.position.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= threshold;
    });
  }

  // google.maps.OverlayView 상속 정의
  // =============================================================
  // [방안 2: 스파이더파이 (Spiderfy - 부채꼴/방사형 마커 펼침)]
  // =============================================================
  var activeSpiderOverlay = null;

  function unspiderfy() {
    if (activeSpiderOverlay && activeSpiderOverlay.parentNode) {
      activeSpiderOverlay.parentNode.removeChild(activeSpiderOverlay);
    }
    activeSpiderOverlay = null;
  }

  function spiderfyMarker(overlayInstance) {
    unspiderfy();
    if (!overlayInstance || !overlayInstance.overlaps || overlayInstance.overlaps.length <= 1) return;

    var overlaps = overlayInstance.overlaps;
    var count = overlaps.length;
    var proj = overlayInstance.getProjection();
    if (!proj) return;

    var centerLatLng = overlayInstance.position;
    var centerPixel = proj.fromLatLngToDivPixel(centerLatLng);

    var spiderContainer = document.createElement('div');
    spiderContainer.className = 'spiderfy-container';
    spiderContainer.style.position = 'absolute';
    spiderContainer.style.left = '0';
    spiderContainer.style.top = '0';
    spiderContainer.style.width = '100%';
    spiderContainer.style.height = '100%';
    spiderContainer.style.pointerEvents = 'none';
    spiderContainer.style.zIndex = '999999';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    spiderContainer.appendChild(svg);

    // 펼침 반경 및 각도 계산 (부채꼴/원형 방사)
    var radius = count <= 2 ? 65 : (count <= 4 ? 85 : 110);
    var angleStep = (2 * Math.PI) / count;
    var startAngle = -Math.PI / 2; // 12시 방향부터 시작

    overlaps.forEach(function (photo, idx) {
      var angle = startAngle + (idx * angleStep);
      var endX = centerPixel.x + Math.cos(angle) * radius;
      var endY = centerPixel.y + Math.sin(angle) * radius;

      // 1. 선(Leg) 생성
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centerPixel.x);
      line.setAttribute('y1', centerPixel.y);
      line.setAttribute('x2', endX);
      line.setAttribute('y2', endY);
      line.setAttribute('stroke', '#007AFF');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '3,3');
      line.setAttribute('opacity', '0.85');
      svg.appendChild(line);

      // 2. 펼쳐진 리프 마커 카드
      var leaf = document.createElement('div');
      leaf.className = 'spiderfy-leaf-card' + (photo.id === selectedPhotoId ? ' active' : '');
      leaf.style.position = 'absolute';
      leaf.style.left = endX + 'px';
      leaf.style.top = endY + 'px';
      leaf.style.transform = 'translate(-50%, -50%)';
      leaf.style.pointerEvents = 'auto';

      var numStr = '';
      if (metadata && metadata.texts && photo.numTextId) {
        var numObj = metadata.texts.find(function (t) { return t.id === photo.numTextId; });
        if (numObj) numStr = '#' + numObj.text;
      }
      if (!numStr) numStr = '사진';

      var leafHtml = 
        '<div class="spider-leaf-thumb">' +
          '<img src="' + (photoBlobUrls[photo.fileName] || '') + '" alt="' + numStr + '">' +
          '<span class="spider-leaf-num">' + numStr + '</span>' +
        '</div>' +
        '<div class="spider-leaf-title">' + (photo.facilityType || '사진') + '</div>';
      
      leaf.innerHTML = leafHtml;

      leaf.addEventListener('click', function (ev) {
        ev.stopPropagation();
        unspiderfy();
        selectPhoto(photo.id);
        openPhotoViewerWithSiblings(photo, overlaps);
      });

      spiderContainer.appendChild(leaf);
    });

    var panes = overlayInstance.getPanes();
    if (panes && panes.overlayMouseTarget) {
      panes.overlayMouseTarget.appendChild(spiderContainer);
      activeSpiderOverlay = spiderContainer;
    }
  }

  function PhotoSpecOverlay(photo, map) {
    this.photo = photo;
    this.map = map;
    this.div = null;
    this.labelPanel = null;
    this.isMultiple = false;
    this.overlaps = [photo];

    var posY = photo.position.y < 0 ? -photo.position.y : photo.position.y;
    var lngLat = window.DxfToGeoJSON.dxfToLngLat(photo.position.x, posY);
    if (lngLat) {
      this.position = new google.maps.LatLng(lngLat[1], lngLat[0]);
    } else {
      this.position = new google.maps.LatLng(37.0, 127.0);
    }

    if (typeof this.setMap === 'function') {
      this.setMap(map);
    } else {
      console.warn('PhotoSpecOverlay: setMap 함수가 아직 활성화되지 않았습니다. 상속 처리를 대기합니다.');
      var self = this;
      setTimeout(function() {
        if (typeof self.setMap === 'function') {
          self.setMap(map);
        } else {
          console.error('PhotoSpecOverlay: setMap 바인딩 실패.');
        }
      }, 100);
    }
  }

  // 지도 API 로드 시점에 상속 체인 구현
  if (typeof google !== 'undefined' && google.maps) {
    PhotoSpecOverlay.prototype = Object.create(google.maps.OverlayView.prototype);
    PhotoSpecOverlay.prototype.constructor = PhotoSpecOverlay;
  }

  /**
   * 개별 텍스트 제원이 검수(저장) 완료되었는지 판정
   * [방안 3 핵심: 개별 텍스트 완전 독립 검수제]
   * - 사진 객체의 기존 상태(photo.edited)와 완전히 분리
   * - 오직 해당 텍스트 자체에 txtObj.edited === true가 직접 저장된 경우만 완료(파란색)로 판정!
   */
  function isTextSpecEdited(txtObj, photo) {
    if (!txtObj) return false;
    return txtObj.edited === true;
  }

  /**
   * 해당 사진에 속한 모든 제원 텍스트(주시설물 + 부속시설물)가 빠짐없이 전부 검수 완료되었는지 판정
   * [단독/혼합시설물 전체 검수 원칙]
   * - 묶여 있는 제원 텍스트 중 단 하나라도 미검수(txtObj.edited !== true)가 남아 있으면 무조건 false (주황색 마커 유지)
   * - 모든 제원 텍스트가 실제로 검수(저장) 완료되었을 때만 true (파란색 마커 전환)
   */
  function isPhotoAllSpecsEdited(photo) {
    if (!photo) return false;
    var textIds = photo.specTextIds || [];
    if (textIds.length === 0 && photo.specTextId) {
      textIds = [photo.specTextId];
    }

    // 제원 텍스트가 아예 연결되지 않은 사진(일반사진 등)인 경우에만 사진 자체의 edited 속성 참조
    if (textIds.length === 0) {
      return photo.edited === true;
    }

    if (!metadata || !metadata.texts) {
      return false;
    }

    // 사진에 속한 모든 제원 텍스트를 조사하여 하나라도 미검수이면 무조건 false
    for (var i = 0; i < textIds.length; i++) {
      var tId = textIds[i];
      var tObj = metadata.texts.find(function (x) { return x.id === tId; });
      if (!tObj || !isTextSpecEdited(tObj, photo)) {
        return false;
      }
    }
    return true;
  }

  /**
   * [방안 3 핵심] 메타데이터 로드 및 초기화 시점 텍스트-사진 검수 상태 전수 정규화
   * - 사진에 연결된 텍스트 목록(specTextIds) 중 실제로 검수된 텍스트와 미검수 텍스트를 정확히 구분
   * - 하나라도 미검수(txtObj.edited !== true) 제원이 남아 있는 사진은 photo.edited = false (주황색 마커 보장)
   * - 모든 제원이 빠짐없이 txtObj.edited === true로 저장된 사진만 photo.edited = true (파란색 마커)
   */
  function normalizePhotoSpecsEditedState() {
    if (!metadata || !metadata.photos) return;
    metadata.photos.forEach(function (p) {
      p.edited = isPhotoAllSpecsEdited(p);
    });
  }

  function onOverlayAdd() {
    var self = this;
    var div = document.createElement('div');
    div.className = 'photo-overlay-card';
    div.setAttribute('data-photo-id', this.photo.id);
    
    // [단독/혼합시설물 전체 검수 원칙] 사진의 모든 제원이 완료되었을 때만 파란색 마커로 표시
    var isSaved = isPhotoAllSpecsEdited(this.photo);
    if (isSaved) {
      div.classList.add('is-saved');
    }
    
    if (selectedPhotoId === this.photo.id) {
      div.classList.add('selected');
    }
    
    // [상태 보존] 현재 마커 모드(보라색 원 vs 사진 카드)를 철저히 유지
    if (isMarkerMode || isLabelShow) {
      if (isLabelShow) {
        div.classList.add('text-only-mode');
      } else {
        div.classList.add('marker-dot-mode');
      }
      div.style.transform = 'translate(-50%, -50%)';
      div.style.marginTop = '0px';
    } else {
      div.style.transform = 'translate(-50%, -100%)';
      div.style.marginTop = '-10px';
    }
    
    if (this.isMultiple) {
      div.classList.add('multiple');
      var sourceHint = this.photo.sourceFile ? ' [' + this.photo.sourceFile + ']' : '';
      div.title = '이 위치에 사진 ' + this.overlaps.length + '장이 중첩되어 있습니다. 클릭하여 선택하세요.' + sourceHint;
    } else if (this.photo.sourceFile) {
      div.title = '출처 파일: ' + this.photo.sourceFile;
    }

    var numStr = '';
    if (metadata && metadata.texts && this.photo.numTextId) {
      var txtObj = metadata.texts.find(function (t) { return t.id === self.photo.numTextId; });
      if (txtObj) numStr = '#' + txtObj.text;
    }
    if (!numStr) numStr = '사진';

    var numEl = document.createElement('div');
    numEl.className = 'photo-overlay-num';
    numEl.textContent = numStr;
    div.appendChild(numEl);

    var thumbEl = document.createElement('div');
    thumbEl.className = 'photo-overlay-thumb';
    var imgEl = document.createElement('img');
    imgEl.src = photoBlobUrls[this.photo.fileName] || '';
    imgEl.alt = numStr;
    thumbEl.appendChild(imgEl);
    div.appendChild(thumbEl);

    var textEl = document.createElement('div');
    textEl.className = 'photo-overlay-text';
    textEl.textContent = getPhotoSummaryText(this.photo);
    div.appendChild(textEl);

    // [고도화 추가] 지도 상에 정보 텍스트(사진번호, 속성, 메모) 줄바꿈 상시 노출 패널 부착
    var labelPanel = document.createElement('div');
    labelPanel.className = 'photo-overlay-label-panel';
    labelPanel.style.display = isLabelShow ? 'block' : 'none';

    var labelHtml = '<div class="label-photo-num">' + numStr + '</div>';

    var specTexts = [];
    if (typeof isInspectFilterActive === 'function' && isInspectFilterActive()) {
      specTexts = getPhotoMatchedSpecTexts(this.photo);
    } else if (metadata && metadata.texts) {
      var ids = this.photo.specTextIds || [];
      if (ids.length === 0 && this.photo.specTextId) {
        ids = [this.photo.specTextId];
      }
      ids.forEach(function (id) {
        var tObj = metadata.texts.find(function (t) { return t.id === id; });
        if (tObj && tObj.text) {
          specTexts.push(tObj.text);
        }
      });
    }
    if (specTexts.length > 0) {
      var joinedSpecs = specTexts.join('<br>');
      if (typeof isInspectFilterActive === 'function' && isInspectFilterActive() && inspectSearchQuery) {
        joinedSpecs = highlightKeywordInHtml(joinedSpecs, inspectSearchQuery);
      }
      labelHtml += '<div class="label-photo-specs">' + joinedSpecs + '</div>';
    }

    if (this.photo.memo && !isAutoGeneratedMemo(this.photo.memo)) {
      var memoText = this.photo.memo;
      if (typeof isInspectFilterActive === 'function' && isInspectFilterActive() && inspectSearchQuery) {
        memoText = highlightKeywordInHtml(memoText, inspectSearchQuery);
      }
      labelHtml += '<div class="label-photo-memo">' + memoText + '</div>';
    }

    labelPanel.innerHTML = labelHtml;
    div.appendChild(labelPanel);
    this.labelPanel = labelPanel;

    // 마우스 호버 시 살짝 겹쳐 있더라도 마우스 닿은 마커가 즉시 맨 위로 올라오도록 지원
    div.addEventListener('mouseenter', function () {
      div.style.zIndex = '99999';
    });
    div.addEventListener('mouseleave', function () {
      div.style.zIndex = '';
    });

    div.addEventListener('click', function (e) {
      // 드래그 직후 클릭 이벤트 오동작 방지
      if (self.justDragged) {
        self.justDragged = false;
        e.stopPropagation();
        return;
      }
      // 1. 저배율 클러스터 노드인 경우 클릭 시 해당 범위 줌인 (18레벨 이하 대응)
      if (self.isClusterRepresentation && map && map.getZoom() <= 18) {
        map.setZoom(19);
        if (self.photo.position) {
          var repY = self.photo.position.y < 0 ? -self.photo.position.y : self.photo.position.y;
          var repLngLat = window.DxfToGeoJSON.dxfToLngLat(self.photo.position.x, repY);
          if (repLngLat) map.panTo(new google.maps.LatLng(repLngLat[1], repLngLat[0]));
        }
        return;
      }

      // [방안 1: 원클릭 즉시 선택] 클릭한 그 마커의 사진을 0.1초 만에 즉시 선택
      selectPhoto(self.photo.id);
      openPhotoViewerWithSiblings(self.photo, [self.photo]);
    });

    // [고도화 추가] 도면 영역 사진 더블클릭 시 기본 최대화(지도 꽉 차게)로 뷰어 띄우기 (겹침 대응)
    div.addEventListener('dblclick', function (e) {
      e.stopPropagation(); // 지도의 더블클릭 줌인 동작 방지
      if (self.photo) {
        openPhotoViewerWithSiblings(self.photo, self.overlaps || [self.photo]);
      }
    });

    // [신규] 마커 드래그 이동 및 자석 스냅 이벤트 바인딩
    bindMarkerDrag(this, div, this.photo);

    this.div = div;
    var panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(div);
  }

  function onOverlayDraw() {
    if (!this.div || !this.photo.position) return;

    // [방안 B 신규] 시설물 검수/단어 검색 필터 모드: 매칭되지 않은 마커는 화면에서 강제 은닉
    if (typeof isInspectFilterActive === 'function' && isInspectFilterActive()) {
      if (typeof isPhotoMatchedInspectFilter === 'function' && !isPhotoMatchedInspectFilter(this.photo)) {
        this.div.style.display = 'none';
        return;
      }
    }

    // 저배율(18 이하)일 때 클러스터 대표 마커가 아니면 화면에서 강제 은닉
    if (map && map.getZoom() <= 18 && !this.isClusterRepresentation) {
      this.div.style.display = 'none';
      return;
    }

    // [스파이더파이 보호] 부채꼴로 펼쳐져 있는 동안은 위치 재계산 건너뛰기
    if (this.isSpiderfied) {
      return;
    }

    this.div.style.display = 'block';
    
    var dxfX = this.photo.position.x;
    // 지능형 Y좌표 판별: 음수(과거 브라우저 좌표)일 때만 양수로 반전, 이미 양수(최신 정좌표)면 그대로 유지
    var dxfY = this.photo.position.y < 0 ? -this.photo.position.y : this.photo.position.y;
    
    var lngLat = window.DxfToGeoJSON.dxfToLngLat(dxfX, dxfY);
    if (!lngLat) return;

    var latLng = new google.maps.LatLng(lngLat[1], lngLat[0]);
    var projection = this.getProjection();
    var p = projection.fromLatLngToDivPixel(latLng);

    if (p) {
      var finalX = p.x;
      var finalY = p.y;

      // [방안 3 개편] 텍스트 모드가 켜진 경우, 방사형 오프셋을 주지 않고 중앙 정렬을 적용
      if (isLabelShow) {
        this.div.style.transform = 'translate(-50%, -50%)';
      }

      this.div.style.left = finalX + 'px';
      this.div.style.top = finalY + 'px';
    }
  }

  function onOverlayRemove() {
    if (this.div) {
      if (this.div.parentNode) {
        this.div.parentNode.removeChild(this.div);
      }
      this.div = null;
    }
  }

  // [고도화 추가] 지도의 오버레이 카드를 보라색 원 마커 ↔ 썸네일 카드로 실시간 토글 변환 (클러스터 및 텍스트 모드 병합)
  function updateMarkerModeOnMap() {
    overlays.forEach(function (o) {
      if (o.div) {
        // [버그 수정] 저장 완료 시 지도의 마커 카드 제원 텍스트 및 중첩 타이틀 개수 실시간 동기화
        var txtEl = o.div.querySelector('.photo-overlay-text');
        if (txtEl) {
          txtEl.textContent = getPhotoSummaryText(o.photo);
        }
        if (o.isMultiple) {
          o.div.title = '이 위치에 사진 ' + o.overlaps.length + '장이 중첩되어 있습니다. 클릭하여 선택하세요.';
        } else {
          o.div.title = '';
        }

        // [버그 수정] 호버 시 노출되는 속성 상세 라벨 패널(.photo-overlay-label-panel)의 내용도 실시간 동기화
        var lblPanel = o.div.querySelector('.photo-overlay-label-panel');
        if (lblPanel) {
          var numStr = '';
          if (metadata && metadata.texts && o.photo.numTextId) {
            var txtObj = metadata.texts.find(function (t) { return t.id === o.photo.numTextId; });
            if (txtObj) numStr = '#' + txtObj.text;
          }
          if (!numStr) numStr = '사진';

          var labelHtml = '<div class="label-photo-num">' + numStr + '</div>';
          var specTexts = [];
          if (typeof isInspectFilterActive === 'function' && isInspectFilterActive()) {
            specTexts = getPhotoMatchedSpecTexts(o.photo);
          } else if (metadata && metadata.texts) {
            var ids = o.photo.specTextIds || [];
            if (ids.length === 0 && o.photo.specTextId) {
              ids = [o.photo.specTextId];
            }
            ids.forEach(function (id) {
              var tObj = metadata.texts.find(function (t) { return t.id === id; });
              if (tObj && tObj.text) {
                specTexts.push(tObj.text);
              }
            });
          }
          if (specTexts.length > 0) {
            var joinedSpecs = specTexts.join('<br>');
            if (typeof isInspectFilterActive === 'function' && isInspectFilterActive() && inspectSearchQuery) {
              joinedSpecs = highlightKeywordInHtml(joinedSpecs, inspectSearchQuery);
            }
            labelHtml += '<div class="label-photo-specs">' + joinedSpecs + '</div>';
          }
          if (o.photo.memo && !isAutoGeneratedMemo(o.photo.memo)) {
            var memoText = o.photo.memo;
            if (typeof isInspectFilterActive === 'function' && isInspectFilterActive() && inspectSearchQuery) {
              memoText = highlightKeywordInHtml(memoText, inspectSearchQuery);
            }
            labelHtml += '<div class="label-photo-memo">' + memoText + '</div>';
          }

          // 겹침의 대표인 경우: 단, 검수 필터 모드일 때는 단독 제원 표시 원칙에 따라 서브 패널을 생성하지 않음
          if (!isInspectFilterActive() && o.isMultiple && o.photo === o.overlaps[0]) {
            var badgeCount = o.overlaps.length - 1;
            labelHtml += '<div class="label-photo-plus-badge">＋' + badgeCount + '</div>';
            
            labelHtml += '<div class="photo-overlay-sub-panel" style="display: none;">';
            for (var i = 1; i < o.overlaps.length; i++) {
              var otherPhoto = o.overlaps[i];
              var otherNumStr = '사진';
              if (metadata && metadata.texts && otherPhoto.numTextId) {
                var otherTxtObj = metadata.texts.find(function (t) { return t.id === otherPhoto.numTextId; });
                if (otherTxtObj) otherNumStr = '#' + otherTxtObj.text;
              }
              
              var otherSpecs = [];
              if (metadata && metadata.texts) {
                var otherIds = otherPhoto.specTextIds || [];
                if (otherIds.length === 0 && otherPhoto.specTextId) {
                  otherIds = [otherPhoto.specTextId];
                }
                otherIds.forEach(function (id) {
                  var tObj = metadata.texts.find(function (t) { return t.id === id; });
                  if (tObj && tObj.text) {
                    otherSpecs.push(tObj.text);
                  }
                });
              }
              
              labelHtml += '<div class="sub-label-card">';
              labelHtml += '  <div class="sub-label-num">' + otherNumStr + '</div>';
              if (otherSpecs.length > 0) {
                labelHtml += '  <div class="sub-label-specs">' + otherSpecs.join('<br>') + '</div>';
              }
              if (otherPhoto.memo && !isAutoGeneratedMemo(otherPhoto.memo)) {
                labelHtml += '  <div class="sub-label-memo" autocomplete="off">' + otherPhoto.memo + '</div>';
              }
              labelHtml += '</div>';
            }
            labelHtml += '</div>';
          }

          lblPanel.innerHTML = labelHtml;
        }

        o.div.classList.remove('marker-dot-mode', 'text-only-mode', 'cluster-mode', 'inspect-cluster-mode', 'inspect-marker-mode');
        
        // [단독/혼합시설물 전체 검수 원칙] 해당 사진의 모든 제원이 완료되었는지 정확하게 판정
        var isAllSaved = isPhotoAllSpecsEdited(o.photo);
        if (isAllSaved) {
          o.div.classList.add('is-saved');
        } else {
          o.div.classList.remove('is-saved');
        }

        // [사용자 요구사항 반영: 방안 1] 검색 모드(isInspectFilterActive)일 때
        if (typeof isInspectFilterActive === 'function' && isInspectFilterActive()) {
          if (typeof isPhotoMatchedInspectFilter === 'function' && !isPhotoMatchedInspectFilter(o.photo)) {
            o.div.style.display = 'none';
            return;
          }

          // 저배율 축소(줌 18 이하) 시: 보라색 원형 배지 클러스터링 적용
          var curZoom = map ? map.getZoom() : 18;
          if (curZoom <= 18) {
            if (o.isClusterRepresentation) {
              o.div.style.display = 'block';
              o.div.classList.add('cluster-mode', 'inspect-cluster-mode');
              o.div.setAttribute('data-count', o.clusterCount);
              o.div.style.transform = 'translate(-50%, -50%)';
              o.div.style.marginTop = '0px';
              if (o.labelPanel) o.labelPanel.style.display = 'none';
            } else {
              o.div.style.display = 'none';
            }
            return;
          }

          // 고배율 확대(줌 19 이상) 시: 말풍선 상자 없이 오직 깔끔한 원형 마커 단독 표시! (미검수: 주황색 / 완료: 파란색)
          o.div.style.display = 'block';
          o.div.classList.add('marker-dot-mode', 'inspect-marker-mode');
          o.div.style.transform = 'translate(-50%, -50%)';
          o.div.style.marginTop = '0px';
          if (o.labelPanel) {
            o.labelPanel.style.display = 'none';
          }

          // 마우스 올렸을 때 미니 힌트 툴팁 설정
          var numStr = '';
          if (o.photo.numTextId && metadata && metadata.texts) {
            var numObj = metadata.texts.find(function (t) { return t.id === o.photo.numTextId; });
            if (numObj) numStr = numObj.text;
          }
          var facTitle = o.photo.facilityType || '시설물';
          o.div.title = '[사진 #' + (numStr || o.photo.fileName) + '] ' + facTitle + (isAllSaved ? ' (검수 완료)' : ' (미검수)');
          return;
        }

        // [고도화 추가] 편집창에서 저장이 완료된 사진은 깔끔한 파란색 원 마커로만 강제 표시 (클러스터 노출은 예외)
        var curZoomNormal = map ? map.getZoom() : 18;
        if (isAllSaved && !(curZoomNormal <= 18 && o.isClusterRepresentation)) {
          o.div.classList.add('marker-dot-mode');
          o.div.style.transform = 'translate(-50%, -50%)';
          o.div.style.marginTop = '0px';
          if (o.labelPanel) {
            o.labelPanel.style.display = 'none';
          }
          return;
        }

        // [방안 3 추가] 텍스트 모드이고 중첩 마커인데 대표가 아닌 경우 강제 숨김
        if (isLabelShow && o.isMultiple && o.photo !== o.overlaps[0]) {
          o.div.style.display = 'none';
          return;
        } else {
          // 텍스트 모드가 꺼졌거나 대표 마커인 경우 복원 (저배율 클러스터링이 아닐 때만)
          if (!(curZoomNormal <= 18 && !o.isClusterRepresentation)) {
            o.div.style.display = 'block';
          }
        }
        
        // 1. 클러스터 그룹 마커 모드 적용 (줌레벨 18 이하)
        if (curZoomNormal <= 18 && o.isClusterRepresentation) {
          o.div.classList.add('cluster-mode');
          o.div.setAttribute('data-count', o.clusterCount);
          o.div.style.transform = 'translate(-50%, -50%)';
          o.div.style.marginTop = '0px';
          return;
        }

        // 2. 텍스트 단독 모드 적용
        if (isLabelShow) {
          o.div.classList.add('text-only-mode');
          o.div.style.transform = 'translate(-50%, -50%)';
          o.div.style.marginTop = '0px';
        } else {
          // 3. 일반 마커 및 카드 모드 적용
          if (isMarkerMode) {
            o.div.classList.add('marker-dot-mode');
            o.div.style.transform = 'translate(-50%, -50%)';
            o.div.style.marginTop = '0px';
          } else {
            o.div.style.transform = 'translate(-50%, -100%)';
            o.div.style.marginTop = '-10px';
          }
        }
      }
    });
  }

  // [고도화 추가] 지도의 캔버스 배경색 테마 토글 (3중 테마 순환)
  function updateThemeOnMap() {
    var container = document.querySelector('.canvas-container');
    if (container) {
      container.classList.remove('theme-light', 'theme-dark', 'theme-gray');
      if (themeMode === 'dark') {
        container.classList.add('theme-dark');
      } else if (themeMode === 'gray') {
        container.classList.add('theme-gray');
      } else {
        container.classList.add('theme-light');
      }
    }
  }

  // [고도화 추가] 모든 오버레이의 사진 정보 라벨 보이기/숨기기 실시간 토글 (저장 완료된 것은 제외)
  function updateLabelsOnMap() {
    overlays.forEach(function (o) {
      if (o.labelPanel) {
        // [방안 1 핵심] 검색 필터 모드일 때는 도면에 말풍선(라벨 패널)을 일절 노출하지 않고 100% 숨김!
        if (typeof isInspectFilterActive === 'function' && isInspectFilterActive()) {
          o.labelPanel.style.display = 'none';
          return;
        }
        if (o.photo.edited === true) {
          o.labelPanel.style.display = 'none';
        } else {
          o.labelPanel.style.display = isLabelShow ? 'block' : 'none';
        }
      }
    });
  }

  // [고도화 추가] 도면 선 색상 테마별 자동 반전 렌더러
  function applyDxfStyleToMap() {
    if (!map || !map.data) return;
    map.data.setStyle(function (feature) {
      var geom = feature.getGeometry && feature.getGeometry();
      var geomType = geom && geom.getType ? geom.getType() : '';
      
      if (geomType === 'Point') {
        var text = feature.getProperty('text');
        var color = (text != null && String(text).trim() !== '') ? '#00C853' : '#888888';
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">' +
          '<circle cx="12" cy="12" r="8" fill="' + color + '" fill-opacity="0.3" stroke="#FFFFFF" stroke-width="1.5"/></svg>';
        return {
          icon: {
            url: 'data:image/svg+xml,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(8, 8),
            anchor: new google.maps.Point(4, 4)
          },
          clickable: false
        };
      }

      var strokeColor = feature.getProperty('strokeColor') || '#7f8c8d';
      var fillColor = feature.getProperty('fillColor') || strokeColor;
      
      // 배경 다크/그레이 시 검은색 객체선들 흰색 반전 처리
      if (themeMode === 'dark' || themeMode === 'gray') {
        var cleanColor = strokeColor.trim().toLowerCase();
        if (cleanColor === '#000000' || cleanColor === 'black' || cleanColor === '#000') {
          strokeColor = '#ffffff';
        }
      }
      
      var thick = feature.getProperty('thick');
      return {
        strokeColor: strokeColor,
        strokeWeight: thick ? 2.5 : 0.8,
        strokeOpacity: 0.8,
        fillColor: fillColor,
        fillOpacity: 0.05,
        clickable: false
      };
    });
  }

  // [고도화 추가] 줌 또는 범위 변경 시 마커 필터링 및 클러스터 계산 처리 (줌 18 이하 축소 대응)
  function handleMapZoomOrBoundsChange() {
    var zoom = map ? map.getZoom() : 18;
    if (zoom <= 18) {
      recalculateClusters();
    } else {
      restoreIndividualMarkers();
    }
    updateMarkerModeOnMap();
    updateLabelsOnMap();
    overlays.forEach(function (o) { o.draw(); });
  }

  // [고도화 추가] 거리 기반 클러스터링 알고리즘 (방안 A: 검색 모드 시 검색된 시설물만 독립 묶음!)
  function recalculateClusters() {
    if (!metadata || !metadata.photos) return;
    
    var zoom = map ? map.getZoom() : 18;
    // 현실적인 노트북/모니터 배율 대응 (줌 18부터 클러스터링 작동)
    var distThreshold = 25.0; // 줌 18 대응
    if (zoom === 17) distThreshold = 45.0;
    else if (zoom === 16) distThreshold = 75.0;
    else if (zoom === 15) distThreshold = 130.0;
    else if (zoom <= 14) distThreshold = 300.0;
    
    var processed = {};
    
    // 초기화
    overlays.forEach(function (o) {
      o.isClusterRepresentation = false;
      o.clusterCount = 1;
    });

    // [방안 A 핵심] 검색 필터 활성화 시에는 오직 검색된 시설물 오버레이들만 대상으로 클러스터링!
    // (숨겨진 다른 시설물 500개와 섞여서 검색 마커가 증발하는 현상 원천 차단)
    var isSearchActive = typeof isInspectFilterActive === 'function' && isInspectFilterActive();
    var targetList = overlays;
    if (isSearchActive) {
      targetList = overlays.filter(function (o) {
        return typeof isPhotoMatchedInspectFilter === 'function' && isPhotoMatchedInspectFilter(o.photo);
      });
    }

    targetList.forEach(function (o) {
      if (processed[o.photo.id]) return;
      if (!o.photo.position) return;

      var clusterMembers = [o];
      processed[o.photo.id] = true;

      targetList.forEach(function (other) {
        if (processed[other.photo.id]) return;
        if (!other.photo.position) return;

        var dx = o.photo.position.x - other.photo.position.x;
        var dy = o.photo.position.y - other.photo.position.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= distThreshold) {
          clusterMembers.push(other);
          processed[other.photo.id] = true;
        }
      });

      if (clusterMembers.length > 0) {
        var representative = clusterMembers[0];
        representative.isClusterRepresentation = true;
        representative.clusterCount = clusterMembers.length;
        
        for (var i = 1; i < clusterMembers.length; i++) {
          clusterMembers[i].isClusterRepresentation = false;
        }
      }
    });
  }

  // [고도화 추가] 클러스터링 모드 해제
  function restoreIndividualMarkers() {
    overlays.forEach(function (o) {
      o.isClusterRepresentation = false;
      o.clusterCount = 1;
    });
  }

  // 입력창 포커스 시 텍스트 전체선택, 일시 투명(흐리게) 처리
  // 커스텀 드롭다운이 연결될 인풋은 fade 효과를 사용하지 않음 (드롭다운 가시성 보호)
  function setupInputFocusFade(input) {
    input.addEventListener('focus', function () {
      setTimeout(function () {
        try { input.select(); } catch(e) {}
      }, 0);
      // 커스텀 드롭다운 패널이 부모에 있으면 fade 미적용
      var parent = input.parentNode;
      var hasDropdown = parent && parent.querySelector('.custom-dropdown-panel');
      if (!hasDropdown) {
        input.classList.add('input-focus-fade');
      }
    });
    input.addEventListener('blur', function () {
      input.classList.remove('input-focus-fade');
    });
    input.addEventListener('input', function () {
      input.classList.remove('input-focus-fade');
    });
  }

  // 다음 입력 필드로 포커스 이동을 지원하는 헬퍼 함수
  function moveToNextField(currentInput) {
    var memoEl = getEl('photo-memo');
    var saveBtn = getEl('photo-save-btn');

    // 1. 만약 현재 입력창이 메모 칸(photo-memo)인 경우 바로 저장 버튼으로 초점 이동
    if (currentInput === memoEl) {
      if (saveBtn) {
        isProgrammaticFocusing = true;
        saveBtn.focus();
        setTimeout(function () {
          isProgrammaticFocusing = false;
        }, 150);
      }
      return;
    }

    var card = currentInput.closest('.attribute-card');
    if (!card) return;
    var inputs = Array.prototype.slice.call(card.querySelectorAll('input[data-field-id]'));
    var idx = inputs.indexOf(currentInput);
    if (idx !== -1 && idx < inputs.length - 1) {
      var nextInput = inputs[idx + 1];
      
      // 프로그램적으로 포커스가 옮겨질 때 다음 입력란 드롭다운이 열리는 것을 방지
      isProgrammaticFocusing = true;
      nextInput.focus();
      setTimeout(function () {
        isProgrammaticFocusing = false;
      }, 150);
      
    } else {
      // 2. 마지막 속성 필드인 경우 메모란으로 가지 않고 바로 [수정사항 저장] 버튼으로 포커스 이동해 대기
      if (saveBtn) {
        isProgrammaticFocusing = true;
        saveBtn.focus();
        setTimeout(function () {
          isProgrammaticFocusing = false;
        }, 150);
      }
    }
  }

  // [방안 1] 특정 텍스트 객체가 어떤 주시설물에 결합(부착)되어 있는지 실시간 추적하는 함수
  function getTextAttachmentContext(txtObj) {
    if (!txtObj) return null;
    if (metadata && metadata.photos && metadata.photos.length > 0) {
      var photo = metadata.photos.find(function (p) {
        if (p.specTextIds && p.specTextIds.indexOf(txtObj.id) !== -1) return true;
        if (p.specTextId === txtObj.id) return true;
        return false;
      });

      if (photo) {
        var textIds = photo.specTextIds || (photo.specTextId ? [photo.specTextId] : []);
        var idx = textIds.indexOf(txtObj.id);
        if (idx === 0) {
          return '주시설물';
        } else if (idx > 0) {
          return photo.facilityType || '부속시설물';
        }
      }
    }

    // 사진 객체를 못 찾은 경우 텍스트 접두어(+)로 보조 판정
    if (txtObj.text && String(txtObj.text).trim().startsWith('+')) {
      // 같은 위치의 주시설물 텍스트 검색
      if (metadata && metadata.texts) {
        var parentTxt = metadata.texts.find(function (ot) {
          return ot.id !== txtObj.id && Math.abs(ot.x - txtObj.x) < 0.0001 && Math.abs(ot.y - txtObj.y) < 0.0001 && !String(ot.text).trim().startsWith('+');
        });
        if (parentTxt) {
          if (parentTxt.facilityType) {
            return parentTxt.facilityType;
          }
          var parsed = deserializeSpecText(parentTxt.text, parentTxt.layer);
          if (parsed && parsed.facilityType) {
            return parsed.facilityType;
          }
        }
      }
      return '부속';
    }

    return '주시설물';
  }

  // [방안 2] 인풋 요소에 커스텀 드롭다운 레이어 설정
  function setupCustomDropdown(input, options, suggestions) {
    var parent = input.parentNode;
    if (!parent) return;

    // 이미 드롭다운 패널이 붙어 있다면 중복 생성 방지
    var dropdown = parent.querySelector('.custom-dropdown-panel');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'custom-dropdown-panel';
      parent.appendChild(dropdown);
    }

    var activeIdx = -1;

    // 현재 표시 목록 렌더링
    function renderItems(filterText) {
      dropdown.innerHTML = '';
      activeIdx = -1;

      // suggestions가 함수일 경우 실시간 최신 목록을 수집함
      var resolvedSuggestions = typeof suggestions === 'function' ? suggestions() : (suggestions || []);

      var allItems = [];

      var curVal = input.value ? input.value.trim() : '';

      // [방안 C] 기준 항목(내용/종류)에 따라 엄격 필터링된 결과인 경우, 해당 항목들만 단독으로 표시! (최신 역순 온전히 유지)
      if (resolvedSuggestions && resolvedSuggestions.isStrict) {
        allItems = resolvedSuggestions.slice();
      } else {
        // 1) 과거 역순 이력 추천어(실제 최신 데이터 기반)를 최상단에 배치 (최신 역순 온전히 유지)
        if (resolvedSuggestions && resolvedSuggestions.length > 0) {
          resolvedSuggestions.forEach(function (sug) {
            var sugVal = typeof sug === 'object' ? sug.val : sug;
            var exists = allItems.some(function (it) {
              var itVal = typeof it === 'object' ? it.val : it;
              return itVal === sugVal;
            });
            if (!exists) {
              allItems.push(sug);
            }
          });
        }

        // 2) 기본 설정 옵션 목록은 추천 목록에 없는 것만 추가 (후순위)
        if (options && options.length > 0) {
          options.forEach(function (opt) {
            var optVal = typeof opt === 'object' ? opt.val : opt;
            var exists = allItems.some(function (it) {
              var itVal = typeof it === 'object' ? it.val : it;
              return itVal === optVal;
            });
            if (!exists) {
              allItems.push(opt);
            }
          });
        }
      }

      var filtered = allItems;
      if (filterText && filterText.trim() !== '') {
        var q = filterText.trim().toLowerCase();
        filtered = allItems.filter(function (it) {
          var v = typeof it === 'object' ? it.val : it;
          return v.toLowerCase().indexOf(q) !== -1;
        });
      }

      if (filtered.length === 0) {
        // 항목이 없으면 '직접 입력' 안내 표시
        var hint = document.createElement('div');
        hint.className = 'custom-dropdown-item';
        hint.style.color = '#9ca3af';
        hint.style.fontStyle = 'italic';
        hint.textContent = '직접 입력하세요';
        dropdown.appendChild(hint);
        return;
      }

      filtered.forEach(function (it) {
        var val = typeof it === 'object' ? it.val : it;
        var context = typeof it === 'object' ? it.context : null;

        var item = document.createElement('div');
        item.className = 'custom-dropdown-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';

        var valSpan = document.createElement('span');
        valSpan.textContent = val;
        item.appendChild(valSpan);

        var badgeWrap = document.createElement('span');
        badgeWrap.style.display = 'inline-flex';
        badgeWrap.style.alignItems = 'center';
        badgeWrap.style.gap = '4px';

        // [방안 1] 주시설물 결합 소속 뱃지 (가로등, 신호등, 주시설물 등)
        if (context) {
          var ctxBadge = document.createElement('span');
          ctxBadge.style.fontSize = '10px';
          ctxBadge.style.fontWeight = '600';
          ctxBadge.style.padding = '1px 5px';
          ctxBadge.style.borderRadius = '3px';
          ctxBadge.style.whiteSpace = 'nowrap';

          if (context === '주시설물') {
            ctxBadge.style.backgroundColor = '#f3f4f6';
            ctxBadge.style.color = '#4b5563';
            ctxBadge.style.border = '1px solid #d1d5db';
            ctxBadge.textContent = '주시설물';
          } else if (context === '최근저장') {
            ctxBadge.style.backgroundColor = '#fef3c7';
            ctxBadge.style.color = '#b45309';
            ctxBadge.style.border = '1px solid #fde68a';
            ctxBadge.textContent = '방금입력';
          } else {
            ctxBadge.style.backgroundColor = '#eff6ff';
            ctxBadge.style.color = '#1d4ed8';
            ctxBadge.style.border = '1px solid #bfdbfe';
            ctxBadge.textContent = context;
          }
          badgeWrap.appendChild(ctxBadge);
        }

        // [방안 C] 현재 입력칸에 이미 입력되어 있는 값과 일치하면 '(현재)' 뱃지 표시
        if (curVal && val === curVal) {
          var curBadge = document.createElement('span');
          curBadge.style.fontSize = '10px';
          curBadge.style.color = '#2563eb';
          curBadge.style.fontWeight = '700';
          curBadge.textContent = '(현재)';
          badgeWrap.appendChild(curBadge);
        }

        item.appendChild(badgeWrap);

        // mousedown 시점에는 브라우저 기본 포커스 아웃(blur) 동작만 차단함
        item.addEventListener('mousedown', function (e) {
          e.preventDefault();
        });

        // 실제 클릭이 완전히 해제(완료)된 click 시점에 로직 실행
        item.addEventListener('click', function (e) {
          input.value = val;
          input.dispatchEvent(new Event('input'));
          input.dispatchEvent(new Event('change'));
          
          // 클릭 연쇄 잔상이 끝난 직후 프레임에서 드롭다운을 닫고 다음 필드로 이동시켜 포커스 유실 및 스크롤 튐 방지
          setTimeout(function () {
            hideDropdown();
            moveToNextField(input);
          }, 0);
        });
        dropdown.appendChild(item);
      });
    }

    function showDropdown() {
      // 다른 드롭다운 닫기
      var allPanels = document.querySelectorAll('.custom-dropdown-panel');
      allPanels.forEach(function (p) { if (p !== dropdown) p.classList.remove('active'); });

      renderItems('');
      activeIdx = -1;
      dropdown.classList.add('active');

      // [개선] 드롭다운이 열릴 때 입력란과 드롭다운 전체가 사이드바 스크롤 영역에 완전히 보이도록 자동 스크롤
      setTimeout(function () {
        var sidebarBody = document.getElementById('sidebar-scroll') || document.querySelector('.sidebar-scroll');
        if (!sidebarBody) return;

        var inputRect = input.getBoundingClientRect();
        var dropdownRect = dropdown.getBoundingClientRect();
        var sidebarRect = sidebarBody.getBoundingClientRect();

        // 렌더링된 드롭다운의 실제 높이 고려 (기본 최대 200px)
        var dropdownHeight = dropdownRect.height || dropdown.offsetHeight || 200;

        // 사이드바 내부에서의 상대적 위치 계산
        var inputTopInSidebar = inputRect.top - sidebarRect.top;
        var dropdownBottomInSidebar = inputTopInSidebar + inputRect.height + dropdownHeight;

        // 사이드바의 실질적인 뷰포트 높이
        var sidebarHeight = sidebarBody.clientHeight;

        // 1. 드롭다운 하단이 사이드바 뷰포트 아래로 벗어나는 경우 아래로 스크롤
        if (dropdownBottomInSidebar > sidebarHeight) {
          var scrollDiff = dropdownBottomInSidebar - sidebarHeight + 16; // 16px의 하단 여유 공간 확보
          sidebarBody.scrollTop += scrollDiff;
        }

        // 2. 입력란 상단이 사이드바 뷰포트 위로 벗어나는 경우 위로 스크롤
        if (inputTopInSidebar < 0) {
          sidebarBody.scrollTop += (inputTopInSidebar - 10); // 10px의 상단 여유 공간 확보
        }
      }, 50);
    }

    function hideDropdown() {
      dropdown.classList.remove('active');
    }

    function clearHighlights() {
      var items = dropdown.querySelectorAll('.custom-dropdown-item');
      items.forEach(function (itm) { itm.classList.remove('active'); });
    }

    function highlightItem(index) {
      var items = dropdown.querySelectorAll('.custom-dropdown-item');
      clearHighlights();
      if (index >= 0 && index < items.length) {
        items[index].classList.add('active');
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }

    // 포커스: 드롭다운을 열지 않음 (클릭 또는 방향키에서만 열림)
    // 포커스 시에는 텍스트만 전체선택되고 드롭다운은 펼쳐지지 않습니다
    // input.addEventListener('focus', ...) -> 드롭다운 열기 제거됨

    // 클릭: 닫혀 있으면 열기 (프로그램적 포커스 중이거나, 마우스 좌클릭이 아니면 차단)
    input.addEventListener('click', function (e) {
      if (isProgrammaticFocusing || e.button !== 0) return;
      if (!dropdown.classList.contains('active')) {
        showDropdown();
      }
    });

    // blur: 약간의 딜레이 후 닫기 (mousedown 선택 이벤트보다 늦게 처리)
    input.addEventListener('blur', function () {
      setTimeout(function () {
        hideDropdown();
      }, 180);
    });

    // 타이핑: 실시간 필터링
    input.addEventListener('input', function () {
      if (!dropdown.classList.contains('active')) {
        dropdown.classList.add('active');
      }
      renderItems(input.value);
      activeIdx = -1;
    });

    // 키보드 조작
    input.addEventListener('keydown', function (e) {
      var items = dropdown.querySelectorAll('.custom-dropdown-item:not([style*="italic"])');

      // 드롭다운 닫힌 상태에서 방향키 → 열기
      if (!dropdown.classList.contains('active')) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          showDropdown();
          e.preventDefault();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          moveToNextField(input); // 단순 포커스 이동 (자동 열림은 플래그로 자동 억제)
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx++;
        if (activeIdx >= items.length) activeIdx = 0;
        highlightItem(activeIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx--;
        if (activeIdx < 0) activeIdx = items.length - 1;
        highlightItem(activeIdx);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideDropdown();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        // 선택된 항목이 있으면 해당 값으로 설정, 없으면 직접 입력값 유지
        if (activeIdx >= 0 && activeIdx < items.length) {
          input.value = items[activeIdx].textContent;
          input.dispatchEvent(new Event('input'));
          input.dispatchEvent(new Event('change'));
        }
        hideDropdown();
        moveToNextField(input); // 단순 포커스 이동 (자동 열림은 플래그로 자동 억제)
      } else if (e.key === 'Tab') {
        hideDropdown();
        // Tab 기본 동작 허용 (자연스럽게 다음 필드로)
      }
    });

    // [개선] 입력란 더블클릭 → 다음 필드로 이동 (엔터와 동일 기능)
    input.addEventListener('dblclick', function (e) {
      hideDropdown();
      moveToNextField(input);
    });

    // [개선] 입력란 우클릭 → 다음 필드로 이동 (브라우저 기본 우클릭 메뉴 억제)
    input.addEventListener('contextmenu', function (e) {
      e.preventDefault(); // 브라우저 기본 우클릭 메뉴 비활성
      hideDropdown();
      moveToNextField(input);
    });
  }

  // 겹침 사진 선택 목록 모달 열기
  function showOverlapPhotosModal(overlaps) {
    var modal = document.getElementById('overlap-photos-modal');
    var listContainer = document.getElementById('overlap-photos-list');
    listContainer.innerHTML = '';

    overlaps.forEach(function (p) {
      var numStr = '';
      if (metadata && metadata.texts && p.numTextId) {
        var txtObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
        if (txtObj) numStr = '사진 #' + txtObj.text;
      }
      if (!numStr) numStr = '사진';

      var item = document.createElement('button');
      item.className = 'overlap-item';
      
      var thumb = document.createElement('div');
      thumb.className = 'overlap-item-thumb';
      var img = document.createElement('img');
      img.src = photoBlobUrls[p.fileName] || '';
      thumb.appendChild(img);
      item.appendChild(thumb);

      var info = document.createElement('div');
      info.className = 'overlap-item-info';
      
      var title = document.createElement('div');
      title.className = 'overlap-item-title';
      title.textContent = numStr + ' (' + p.fileName + ')';
      info.appendChild(title);

      var desc = document.createElement('div');
      desc.className = 'overlap-item-desc';
      desc.textContent = p.memo || getPhotoSummaryText(p);
      info.appendChild(desc);

      item.appendChild(info);

      item.addEventListener('click', function () {
        modal.classList.remove('active');
        // 수동 저장 규칙 적용: 클릭 즉시 데이터 전환 (기존 편집 내역 취소)
        selectPhoto(p.id);
      });

      item.addEventListener('dblclick', function () {
        modal.classList.remove('active');
        selectPhoto(p.id);

        var imgSrc = photoBlobUrls[p.fileName] || '';
        if (imgSrc) {
          var formattedNumStr = '';
          if (metadata && metadata.texts && p.numTextId) {
            var txtObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
            if (txtObj) formattedNumStr = '#' + txtObj.text;
          }
          if (!formattedNumStr) formattedNumStr = '사진';
          var title = '사진 원본 보기 (' + formattedNumStr + ' - ' + p.fileName + ')';
          openPhotoViewer(imgSrc, title);
        }
      });

      listContainer.appendChild(item);
    });

    modal.classList.add('active');
  }

  function getPhotoSummaryText(photo) {
    if (photo.facilityType) {
      if (photo.specTextIds && photo.specTextIds.length > 1) {
        return photo.facilityType + ' 외 ' + (photo.specTextIds.length - 1) + '건';
      }
      if (metadata && metadata.texts && photo.specTextId) {
        var specObj = metadata.texts.find(function (t) { return t.id === photo.specTextId; });
        if (specObj && specObj.text) {
          var parts = specObj.text.split('/');
          return parts.slice(0, 3).join('/');
        }
      }
      return photo.facilityType;
    }
    if (photo.memo && !isAutoGeneratedMemo(photo.memo)) return photo.memo;
    return '속성 미입력';
  }

  // -------------------------------------------------------------
  // [5] 속성 편집 및 다중 속성 카드 비즈니스 로직
  // -------------------------------------------------------------
  function selectPhoto(photoId) {
    if (!metadata || !metadata.photos) return;
    
    // 수동 저장 규칙: 다른 사진 클릭 시 임시 작성 내용은 자동 폐기
    selectedPhotoId = photoId;
    var p = metadata.photos.find(function (x) { return x.id === photoId; });
    if (!p) return;

    // 플로팅 창이 활성화되어 열려 있다면, 원본 이미지 소스 및 제목도 일관되게 업데이트하여 흐름을 끊지 않음
    var floatingWin = getEl('floating-image-window');
    if (floatingWin && floatingWin.style.display === 'flex') {
      var actNumStr = '';
      if (metadata && metadata.texts && p.numTextId) {
        var nObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
        if (nObj && nObj.text) actNumStr = '#' + nObj.text;
      }
      if (!actNumStr) actNumStr = '사진';
      var srcTag = p.sourceFile ? ' [' + p.sourceFile + ']' : '';
      getEl('image-modal-src').src = photoBlobUrls[p.fileName] || '';
      getEl('floating-window-title').textContent = '사진 원본 보기 (' + actNumStr + ' - ' + p.fileName + srcTag + ')';
    }

    // 맵 마커 하이라이트 전환
    var cards = document.querySelectorAll('.photo-overlay-card');
    cards.forEach(function (c) {
      if (c.getAttribute('data-photo-id') === photoId) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    // 시설물 검수 목록이 열려 있으면 해당 카드 또는 테이블 행 하이라이트 및 스크롤 동기화
    var inspectContainer = document.getElementById('inspect-items-container');
    if (inspectContainer) {
      var inspectItems = inspectContainer.querySelectorAll('.inspect-item-card, .inspect-grid-table tbody tr');
      inspectItems.forEach(function (c) {
        var inputInTr = c.querySelector('input[data-photo-id]');
        var targetPhotoId = c.getAttribute('data-photo-id') || (inputInTr && inputInTr.getAttribute('data-photo-id'));
        if (targetPhotoId === photoId) {
          c.classList.add('active');
          c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          c.classList.remove('active');
        }
      });
    }

    /* 더블클릭 오동작(더블클릭 전에 지도가 도망치는 버그) 해결을 위해 단일 클릭 시 자동 맵이동 제거
    if (p.position) {
      var posY = p.position.y < 0 ? -p.position.y : p.position.y;
      var lngLat = window.DxfToGeoJSON.dxfToLngLat(p.position.x, posY);
      if (lngLat && map) {
        map.panTo(new google.maps.LatLng(lngLat[1], lngLat[0]));
        // [고도화 추가] 사진 개별 선택 시 지도를 줌 레벨 22배율로 정밀 확대
        map.setZoom(22);
      }
    }
    */

    var numStr = (p.isTextOnly || !p.fileName) ? '글자 마커' : '사진';
    if (metadata.texts && p.numTextId) {
      var numObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
      if (numObj && numObj.text) numStr = '사진 #' + numObj.text;
    }
    
    document.getElementById('sidebar-photo-title').textContent = numStr;
    
    var fileBadge = document.getElementById('sidebar-photo-filename');
    var srcInfo = p.sourceFile ? ' · ' + p.sourceFile : '';
    fileBadge.textContent = '(' + p.fileName + srcInfo + ')';
    
    var idx = metadata.photos.indexOf(p) + 1;
    document.getElementById('sidebar-photo-index').textContent = idx + ' / ' + metadata.photos.length;

    document.getElementById('preview-photo-number').textContent = numStr;
    document.getElementById('preview-img').src = photoBlobUrls[p.fileName] || '';
    getEl('photo-memo').value = (p.memo && !isAutoGeneratedMemo(p.memo)) ? p.memo : '';

    // 다중 사진 썸네일 컨테이너 렌더링
    var thumbContainer = document.getElementById('sidebar-thumbnails');
    if (thumbContainer) {
      thumbContainer.innerHTML = '';
      
      // 동일 위치 사진들 수집
      var samePosPhotos = metadata.photos.filter(function (x) {
        return x.position && p.position && 
               Math.hypot(x.position.x - p.position.x, x.position.y - p.position.y) < 0.5;
      });

      // 동일 위치 사진이 2장 이상일 때 썸네일 노출
      if (samePosPhotos.length > 1) {
        samePosPhotos.forEach(function (sp, sIdx) {
          var thumbDiv = document.createElement('div');
          // 현재 선택된 사진이면 active 표시
          thumbDiv.className = 'photo-thumb-item' + (sp.id === p.id ? ' active' : '');
          
          var thumbImg = document.createElement('img');
          thumbImg.src = photoBlobUrls[sp.fileName] || '';
          thumbDiv.appendChild(thumbImg);
          
          var indexLabel = document.createElement('span');
          indexLabel.className = 'thumb-index';
          indexLabel.textContent = String(sIdx + 1);
          thumbDiv.appendChild(indexLabel);
          
          // 썸네일 클릭 시 해당 사진 선택 및 풀스크린 뷰어 열기 연동
          thumbDiv.addEventListener('click', function () {
            selectPhoto(sp.id);
            openImageViewer(samePosPhotos, sIdx);
          });
          
          thumbContainer.appendChild(thumbDiv);
        });
      }
    }

    var cardsContainer = document.getElementById('attribute-cards-container');
    cardsContainer.innerHTML = '';

    var textIds = p.specTextIds || [];
    if (textIds.length === 0 && p.specTextId) {
      textIds = [p.specTextId];
    }

    textIds.forEach(function (tId) {
      if (!metadata.texts) return;
      var textObj = metadata.texts.find(function (t) { return t.id === tId; });
      if (!textObj) return;

      var parseResult = deserializeSpecText(textObj.text, textObj.layer);
      if (parseResult) {
        // [현장 데이터 최우선] textObj에 현장 저장된 specValues가 존재하면 최우선 적용, 없으면 역파서 결과 적용
        var rawCardVals = (textObj.specValues && Object.keys(textObj.specValues).length > 0) ? textObj.specValues : parseResult.values;
        var cardVals = normalizeFacilityValues(parseResult.facilityType, rawCardVals, textObj.text);
        renderAttributeCard(cardsContainer, parseResult.facilityType, cardVals, tId, parseResult.isSub);
      }
    });

    if (cardsContainer.children.length === 0) {
      // 사진 객체 자체에 facilityType이 정의되어 있고 일반사진이 아닌 경우, 최우선적으로 해당 카드 복원!
      if (p.facilityType && p.facilityType !== '일반사진') {
        renderAttributeCard(cardsContainer, p.facilityType, null);
        if (p.additionalTypes && Array.isArray(p.additionalTypes)) {
          p.additionalTypes.forEach(function (subType) {
            if (subType && subType !== '일반사진') {
              renderAttributeCard(cardsContainer, subType, null, null, true);
            }
          });
        }
      } else if (p.edited !== true) {
        var autoType = detectFacilityType(p.fileName, p.memo);
        if (autoType) {
          renderAttributeCard(cardsContainer, autoType, null);
        }
      }
    }

    // 사진 전환 시, 이전 선택되었던 마커와 새로 선택된 마커의 지도 상 겉모양을 지연 없이 즉시 동기화
    updateMarkerModeOnMap();
    updateLabelsOnMap();
    // 사진 뷰어 내 제원 오버레이 갱신
    updateFloatingWindowSpecs();
  }

  function updateFacilitySelectOptions() {
    var select = document.getElementById('add-facility-select');
    if (!select) return;
    if (!metadata) {
      select.disabled = true;
      return;
    }
    select.disabled = false;

    // [개선] 실제 저장된 제원 텍스트에서 시설물 타입별 사용 횟수를 정확하게 집계
    var counts = {};
    if (metadata.texts) {
      metadata.texts.forEach(function (t) {
        var parseResult = deserializeSpecText(t.text, t.layer);
        if (parseResult && parseResult.facilityType) {
          counts[parseResult.facilityType] = (counts[parseResult.facilityType] || 0) + 1;
        }
      });
    }
    // p.facilityType도 보조로 집계 (제원 텍스트가 없는 경우 대비)
    if (metadata.photos) {
      metadata.photos.forEach(function (p) {
        if (p.facilityType && p.facilityType !== '일반사진' && !counts[p.facilityType]) {
          counts[p.facilityType] = (counts[p.facilityType] || 0);
        }
      });
    }

    // 참조 파일로부터 누적된 시설물 빈도를 counts에 합산
    if (referenceFacilityCounts) {
      for (var fType in referenceFacilityCounts) {
        counts[fType] = (counts[fType] || 0) + referenceFacilityCounts[fType];
      }
    }

    // [고도화 개선] 전력주/통신주 등 비대상만 제외하고 엑셀의 모든 시설물 종류를 목록에 등록!
    var candidateKeys = Object.keys(FACILITY_CONFIG).filter(function (k) {
      return k !== '전력주' && k !== '통신주';
    });

    // [사용자 요청: 방안 1] 한글 가나다(ㄱ~ㅎ) 순 정렬 (빈도 숫자 유지)
    var sortedKeys = candidateKeys.slice().sort(function (a, b) {
      return a.localeCompare(b, 'ko');
    });

    select.innerHTML = '';
    
    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '시설물 종류 추가...';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    select.appendChild(defaultOpt);

    sortedKeys.forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      var freqSuffix = counts[key] ? ' (' + counts[key] + ')' : '';
      opt.textContent = key + freqSuffix;
      select.appendChild(opt);
    });
  }

  // [방안 3] 과거 메타데이터(엑셀 순서 변경 전) 자동 감지 및 신규 필드 규격 정규화 함수
  function normalizeFacilityValues(fType, rawVals, textStr) {
    if (!rawVals || typeof rawVals !== 'object') return {};
    var vals = Object.assign({}, rawVals);

    // 1. 레거시 생략 문자열('--', '삭제', '제외', '미표기', '없음', '선택', '직접입력')을 빈칸('')으로 표준화
    // ※ '기타'는 실제 데이터이므로 절대 지우지 않고 온전히 보존!
    for (var k in vals) {
      var v = String(vals[k] || '').trim();
      if (v === '--' || v === '삭제' || v === '제외' || v === '미표기' || v === '없음' || v === '선택' || v === '직접입력') {
        vals[k] = '';
      } else {
        vals[k] = v;
      }
    }

    var isNumberLike = function (s) {
      if (!s) return false;
      return /^\d+(\.\d+)?$/.test(String(s).trim());
    };
    var isSupportLike = function (s) {
      if (!s) return false;
      var str = String(s).trim();
      return /단주|복주|부착|현수|측주|전주|신호|가로등주|L형|F형|지주/.test(str);
    };
    var isSignSpecLike = function (s) {
      if (!s) return false;
      var str = String(s).trim();
      return /%%C|삼각|오각|팔각|역삼각|\*|^\d+\.\d+\*\d+/.test(str);
    };

    // 2. 엑셀 순서 변경 전 데이터 자동 감지 및 새 순서 매핑
    if (fType === '기타표지') {
      // 구 엑셀 순서: f_1=높이(숫자), f_2=지주 -> 신 엑셀 순서: f_1=지주, f_2=높이
      if (isNumberLike(vals['f_1']) && (isSupportLike(vals['f_2']) || (!isNumberLike(vals['f_2']) && vals['f_2'] !== ''))) {
        var oldH = vals['f_1'];
        var oldSupp = vals['f_2'];
        vals['f_1'] = oldSupp;
        vals['f_2'] = oldH;
      }
    } else if (fType === '도로반사경') {
      // 구 엑셀 순서: f_1=높이, f_2=제원, f_3=지주형식 -> 신 엑셀 순서: f_1=지주형식, f_2=높이, f_3=제원
      if (isNumberLike(vals['f_1']) && (isSupportLike(vals['f_3']) || (!isNumberLike(vals['f_3']) && vals['f_3'] !== ''))) {
        var oldH = vals['f_1'];
        var oldSpec = vals['f_2'];
        var oldSupp = vals['f_3'];
        vals['f_1'] = oldSupp;
        vals['f_2'] = oldH;
        vals['f_3'] = oldSpec;
      }
    } else if (fType === '지시표지' || fType === '규제표지' || fType === '주의표지' || fType === '보조표지') {
      // [방안 3 신구 양방향 호환]
      // 신규 엑셀 규격: f_1=지주, f_2=높이, f_3=제원
      // 1) 레거시 순서 (f_1=높이, f_2=지주, f_3=제원) 감지
      if (isNumberLike(vals['f_1']) && (isSupportLike(vals['f_2']) || (!isNumberLike(vals['f_2']) && vals['f_2'] !== ''))) {
        var legacyH = vals['f_1'];
        var legacySupp = vals['f_2'];
        var legacySpec = vals['f_3'];
        vals['f_1'] = legacySupp;
        vals['f_2'] = legacyH;
        vals['f_3'] = legacySpec;
      }
      // 2) 직전 버전 순서 (f_1=지주, f_2=제원, f_3=높이) 감지 -> f_2와 f_3 맞바꿈
      else if ((isSignSpecLike(vals['f_2']) || (!isNumberLike(vals['f_2']) && vals['f_2'] !== '')) && isNumberLike(vals['f_3'])) {
        var prevSpec = vals['f_2'];
        var prevH = vals['f_3'];
        vals['f_2'] = prevH;
        vals['f_3'] = prevSpec;
      }
    }

    return vals;
  }

  // 제원 역직렬화 (지능형 쌍둥이 접두어 분별 및 56개 전 시설물 스마트 매퍼)
  function deserializeSpecText(text, layerName) {
    if (!text) return null;
    var parts = text.split('/');
    var rawPrefix = (parts[0] || '').trim();
    
    // 1. 부속시설물(+) 여부 판별 및 순수 접두어 분리
    var isSub = false;
    var prefix = rawPrefix;
    if (prefix.startsWith('+')) {
      isSub = true;
      prefix = prefix.substring(1).trim();
    }

    var fType = null;

    // 2. 쌍둥이 접두어 지능형 자동 판별 (신호등, 가로등, 보안등 3대 그룹 완벽 분기)
    if (prefix === '차신') {
      var textStr = text;
      // 텍스트 내에 '보신'이 포함되어 있거나 parts 길이가 5개 이상이면 통합형 '신호등'
      if (textStr.indexOf('보신') !== -1 || parts.length >= 5) {
        fType = '신호등';
      } else {
        fType = '신호등(차신)';
      }
    } else if (prefix === '보신') {
      fType = '신호등(보신)';
    } else if (prefix === '가등') {
      if (isSub) {
        fType = '가로등(부착)';
      } else if (text.indexOf('보안등') !== -1 || parts.length >= 8) {
        fType = '가로등(보안등)';
      } else {
        fType = '가로등';
      }
    } else if (prefix === '보등') {
      if (isSub) {
        fType = '보안등(부착)';
      } else {
        fType = '보안등';
      }
    }

    // 3. 축약어 및 동의어 매핑 사전
    if (!fType) {
      var aliasMap = {
        '도경': '도로경계석',
        '경계석': '도로경계석',
        '보조': '보조표지',
        '사설': '사설표지',
        '지시': '지시표지',
        '규제': '규제표지',
        '주의': '주의표지',
        '기타': '기타표지',
        '방음': '소음방지책',
        '중분': '중앙분리대',
        '볼': '볼라드',
        '과방': '과속방지턱',
        '차진': '차량진입',
        '턱': '턱낮춤',
        '반사경': '도로반사경',
        '승강(버스)': '버스정류장',
        '차량방호': '차량방호시설',
        '낙석방지': '낙석방지시설',
        '무단횡단방지': '무단횡단방지시설',
        '미끄럼방지': '미끄럼방지시설'
      };

      if (aliasMap[prefix]) {
        fType = aliasMap[prefix];
      } else if (FACILITY_CONFIG[prefix]) {
        fType = prefix;
      } else {
        for (var key in FACILITY_CONFIG) {
          var cfg = FACILITY_CONFIG[key];
          if (cfg) {
            if (cfg.prefix && cfg.prefix === prefix) {
              fType = key;
              break;
            }
            if (cfg.title && cfg.title === prefix) {
              fType = key;
              break;
            }
          }
        }
      }
    }

    // 4. 레이어명 기반 안전 매칭
    if (!fType && layerName) {
      var cleanLayer = layerName.replace(/_T$/i, '').trim();
      if (FACILITY_CONFIG[cleanLayer]) {
        fType = cleanLayer;
      } else {
        for (var lKey in FACILITY_CONFIG) {
          var lCfg = FACILITY_CONFIG[lKey];
          if (lCfg && lCfg.layer === layerName) {
            fType = lKey;
            break;
          }
        }
      }
    }

    if (!fType) return null;
    var config = FACILITY_CONFIG[fType];
    if (!config) return null;

    var values = {};
    
    // 특수 구조 시설물 처리 (석축, 과속방지턱, 배수암거 등)
    if (fType === '석축') {
      if (parts[0] !== '석축' || parts.length === 4) {
        values['f_1'] = parts[0] || '석축';
        values['f_2'] = parts[1] || '';
        values['f_3'] = parts[2] || '';
        values['f_4'] = parts[3] || '';
      } else {
        values['f_1'] = parts[1] || '석축';
        values['f_2'] = parts[2] || '';
        values['f_3'] = parts[3] || '';
        values['f_4'] = parts[4] || '';
      }
    } else if (fType === '과속방지턱') {
      if (parts[0] !== '과속방지턱' || parts.length === 3) {
        values['f_1'] = parts[0] || '--';
        values['f_2'] = parts[1] || '';
        values['f_3'] = parts[2] || '';
      } else {
        values['f_1'] = parts[1] || '--';
        values['f_2'] = parts[2] || '';
        values['f_3'] = parts[3] || '';
      }
    } else if (fType === '가로등(보안등)') {
      // [현장 가로등 복합 제원 전용 지능형 역파서 - 주시설물 1개 카드 완벽 복원 (방안 C 및 구형 호환)]
      var pList = parts.slice(1); // 접두어('가등') 제외
      var secIdx = -1;
      pList.forEach(function (p, i) {
        if (p.indexOf('보안등') !== -1) secIdx = i;
      });

      // 초기화
      config.fields.forEach(function (f) { values[f.id] = ''; });
      values['f_7'] = '+보안등'; // 기본값

      if (secIdx !== -1) {
        // [방안 C 형식]: 가등 / [종류] / [재질] / 형태 / 광원 / 높이 / 암길이 / +보안등 / 부착형태 / 부착광원 / [사진]
        var beforeSec = pList.slice(0, secIdx);
        var afterSec = pList.slice(secIdx + 1);

        values['f_7'] = pList[secIdx]; // '+보안등'

        // 보안등 이후: 부착등 형태, 광원, 사진
        if (afterSec.length > 0) values['f_8'] = afterSec[0]; // 부착 형태
        if (afterSec.length > 1) values['f_9'] = afterSec[1]; // 부착 광원
        if (afterSec.length > 2 && afterSec[2] === '사진') values['f_10'] = '사진';

        // 보안등 이전: 끝에서부터 암길이, 높이 역추적
        if (beforeSec.length >= 2 && !isNaN(parseFloat(beforeSec[beforeSec.length - 1]))) {
          var armVal = beforeSec.pop();
          values['f_6'] = (armVal.startsWith('/') ? armVal : '/' + armVal);
          if (beforeSec.length >= 1 && !isNaN(parseFloat(beforeSec[beforeSec.length - 1]))) {
            values['f_5'] = beforeSec.pop(); // 높이
          }
        }

        // 남은 항목 중 광원, 본체 형태, 재질, 종류 매핑
        var knownLights = ['LED', '고압나트륨', '메탈', '삼파장'];
        if (beforeSec.length >= 1) {
          var lastItem = beforeSec[beforeSec.length - 1];
          if (knownLights.indexOf(lastItem) !== -1 || beforeSec.length >= 2) {
            values['f_4'] = beforeSec.pop(); // 광원
          }
        }
        if (beforeSec.length >= 1) values['f_3'] = beforeSec.pop(); // 본체 형태
        if (beforeSec.length >= 1) values['f_2'] = beforeSec.pop(); // 재질
        if (beforeSec.length >= 1) values['f_1'] = beforeSec.pop(); // 종류
      } else if (pList.length >= 5) {
        // [구형 현장 형식 호환]: 가등 / 형태1 / 광원1 / 형태2 / 광원2 / 높이 / 암길이 / 사진
        values['f_1'] = '';
        values['f_2'] = '';
        values['f_3'] = pList[0] || '가오스형';
        values['f_4'] = pList[1] || 'LED';
        values['f_5'] = pList[4] || '10.0';
        var rawArm = pList[5] || '1.7';
        values['f_6'] = (rawArm.startsWith('/') ? rawArm : '/' + rawArm);
        values['f_7'] = '+보안등';
        values['f_8'] = pList[2] || '가오스형';
        values['f_9'] = pList[3] || 'LED';
        values['f_10'] = pList[6] || '사진';
      } else {
        // 필드 기본 순서 매핑
        config.fields.forEach(function (f, idx) {
          if (pList[idx] !== undefined) values[f.id] = pList[idx];
        });
      }
    } else if (config.joinFormat) {
      if (fType === '배수암거') {
        var dim = parts[1] || '';
        var dimParts = dim.split('*');
        values['f_1'] = dimParts[0] || '';
        values['f_2'] = dimParts[1] || '';
        values['f_3'] = parts[2] || '';
        values['f_4'] = parts[3] || '';
        values['f_5'] = parts[4] || '';
      } else if (fType === '측구') {
        values['f_1'] = parts[1] || '';
        var dim = parts[2] || '';
        var dimParts = dim.split('*');
        values['f_2'] = dimParts[0] || '';
        values['f_3'] = dimParts[1] || '';
      } else if (fType === '통로박스') {
        var dim = parts[1] || '';
        var dimParts = dim.split('*');
        values['f_1'] = dimParts[0] || '';
        values['f_2'] = dimParts[1] || '';
        values['f_3'] = parts[2] || '';
        values['f_4'] = parts[3] || '';
      } else if (fType === '교량') {
        values['f_1'] = parts[1] || '';
        values['f_2'] = parts[2] || '';
        var dim = parts[3] || '';
        var dimParts = dim.split('*');
        values['f_3'] = dimParts[0] || '';
        values['f_4'] = dimParts[1] || '';
      }
    } else if (fType === '지시표지' || fType === '규제표지' || fType === '주의표지' || fType === '보조표지') {
        // [방안 3 신구 양방향 스마트 파서]
        // 신형 순서: 지시/단주/높이/제원/내용/양면/사진
        // 구형 순서: 지시/단주/제원/높이/내용/양면/사진
        // 부속(+) 순서: +지시/높이/제원/... 또는 +지시/제원/높이/...
        var pList = parts.slice(1); // 접두어 제외

        // 초기화
        config.fields.forEach(function (f) { values[f.id] = ''; });

        if (!isSub) {
          if (pList.length > 0) {
            values['f_1'] = pList.shift(); // 주시설물은 첫 번째가 지주
          }
        }

        var isSignSpec = function (s) {
          if (!s) return false;
          var str = String(s).trim();
          return /%%C|삼각|오각|팔각|역삼각|\*|^\d+\.\d+\*\d+/.test(str);
        };
        var isNum = function (s) {
          if (!s) return false;
          return /^\d+(\.\d+)?$/.test(String(s).trim());
        };

        // 남은 pList에서 높이(f_2)와 제원(f_3) 지능형 판별
        if (pList.length >= 2) {
          var itemA = pList[0];
          var itemB = pList[1];

          if (isSignSpec(itemA) && isNum(itemB)) {
            // 구형 순서: [제원, 높이] -> 신형 규격 매핑: f_2=높이, f_3=제원
            values['f_2'] = itemB;
            values['f_3'] = itemA;
            pList.splice(0, 2);
          } else if (isNum(itemA) && isSignSpec(itemB)) {
            // 신형 순서: [높이, 제원] -> 신형 규격 매핑: f_2=높이, f_3=제원
            values['f_2'] = itemA;
            values['f_3'] = itemB;
            pList.splice(0, 2);
          } else if (isSignSpec(itemA)) {
            // itemA는 제원이고 itemB는 숫자가 아님 (예: 내용 등) -> 높이 생략된 경우
            values['f_3'] = itemA;
            pList.shift();
          } else if (isNum(itemA)) {
            // itemA는 높이이고 itemB는 제원이 아님 (예: 내용 등) -> 제원 생략된 경우
            values['f_2'] = itemA;
            pList.shift();
          } else {
            // 일반 순차 매핑
            values['f_2'] = pList.shift();
            values['f_3'] = pList.shift();
          }
        } else if (pList.length === 1) {
          var singleItem = pList[0];
          if (isNum(singleItem)) {
            values['f_2'] = pList.shift();
          } else if (isSignSpec(singleItem)) {
            values['f_3'] = pList.shift();
          } else {
            // 숫자도 제원도 아니면 내용(f_4)일 수 있음
            values['f_4'] = pList.shift();
          }
        }

        // 남은 항목 순차 매핑: f_4(내용), f_5(양면유무), f_6(사진)
        if (pList.length > 0) values['f_4'] = pList.shift();
        if (pList.length > 0) values['f_5'] = pList.shift();
        if (pList.length > 0) values['f_6'] = pList.shift();
      } else if (config.fields) {
      // 56개 전 시설물 스마트 옵션 매퍼 (모든 필드 빈칸 기본화)
      var pIdx = 1; // parts[0]은 접두어
      var targetFields = config.fields.filter(function (f) {
        if (isSub && (f.isSupport || f.isPhoto || /지주|사진/.test(f.label))) {
          return false;
        }
        return true;
      });

      // 생략된 필드가 기본값으로 리셋되지 않도록 기본적으로 빈칸('')으로 설정
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

        // 현재 part가 이 필드 선택지에 없고 뒤쪽 필드와 맞는다면 이 필드는 생략된 것으로 간주
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
            return;
          }
        }

        values[field.id] = curPart;
        pIdx++;
      });
    }

    return { facilityType: fType, values: normalizeFacilityValues(fType, values), isSub: isSub };
  }

  function detectFacilityType(fileName, memo) {
    var searchStr = (fileName + ' ' + (memo || '')).toLowerCase();
    for (var key in FACILITY_CONFIG) {
      if (searchStr.indexOf(key.toLowerCase()) !== -1) {
        return key;
      }
    }
    return null;
  }

  // 메모 입력란의 다빈도 추천어 추출 (일반사진 메모만 집계, 참조 사전 데이터 병합)
  function getMemoSuggestions() {
    var counts = {};
    if (metadata && metadata.photos) {
      metadata.photos.forEach(function (p) {
        // 일반사진(facilityType이 없거나 '일반사진')의 메모만 집계
        var isGeneral = !p.facilityType || p.facilityType === '일반사진';
        if (!isGeneral) return;

        var m = p.memo;
        if (m && String(m).trim() !== '') {
          var val = String(m).trim();
          counts[val] = (counts[val] || 0) + 1;
        }
      });
    }

    // 참조 데이터 빈도 결합
    for (var key in referenceMemoSuggestions) {
      var val = String(key).trim();
      counts[val] = (counts[val] || 0) + referenceMemoSuggestions[key];
    }

    var list = Object.keys(counts).map(function (k) {
      return { val: k, count: counts[k] };
    });
    list.sort(function (a, b) { return b.count - a.count; });
    
    return list.slice(0, 10).map(function (item) { return item.val; });
  }

  // [방안 B] 시설물 카드의 필드별 역순(최신순/LIFO) 입력 제안어 추출 (메타데이터별 독립 이력, 피벗 기준 엄격 필터링, 현재 입력값 제외 지원)
  function getFieldSuggestions(fieldId, facilityTypeOrLayer, currentValue, pivotFilter) {
    // 시설물 타입 추출 (fType이 layerName으로 넘어올 경우 대비 방어 로직)
    var fType = facilityTypeOrLayer;
    if (!fType || !FACILITY_CONFIG[fType]) {
      for (var key in FACILITY_CONFIG) {
        if (FACILITY_CONFIG[key].layer === facilityTypeOrLayer || (key + '_T') === facilityTypeOrLayer) {
          fType = key;
          break;
        }
      }
    }
    if (!fType) fType = facilityTypeOrLayer;

    var curVal = currentValue ? String(currentValue).trim() : '';
    var resultList = [];

    // [방안 1] 제원 값과 소속 주시설물(가로등, 신호등, 주시설물 등) 정보를 함께 수집하는 내부 헬퍼
    var addItem = function (vStr, ctx) {
      if (!vStr) return;
      for (var k = 0; k < resultList.length; k++) {
        var existingVal = typeof resultList[k] === 'object' ? resultList[k].val : resultList[k];
        if (existingVal === vStr) return;
      }
      resultList.push({ val: vStr, context: ctx || null });
    };

    // [1] 피벗 기준 필터링 (예: 내용이 '단속중'인 경우, 해당 단속중에 입력되었던 제원만 최신 역순 추출)
    if (pivotFilter && pivotFilter.pivotFieldId && pivotFilter.pivotVal) {
      var targetPivotVal = String(pivotFilter.pivotVal).trim();

      // 1-1) 메타데이터 저장 이력(metadata._pivotHistory) 최우선 반영
      if (metadata && metadata._pivotHistory && metadata._pivotHistory[fType] && metadata._pivotHistory[fType][targetPivotVal]) {
        var pHistArr = metadata._pivotHistory[fType][targetPivotVal][fieldId];
        if (Array.isArray(pHistArr)) {
          pHistArr.forEach(function (v) {
            var valStr = String(v).trim();
            if (valStr !== '' && valStr !== '기타' && valStr !== '--' && valStr !== '선택' && valStr !== '직접입력') {
              addItem(valStr, null);
            }
          });
        }
      }

      // 1-2) 도면 텍스트(metadata.texts) 최신 역순(뒤에서부터) 탐색
      if (metadata && metadata.texts && metadata.texts.length > 0) {
        for (var i = metadata.texts.length - 1; i >= 0; i--) {
          var t = metadata.texts[i];
          if (!t) continue;

          // 동일 시설물 판정
          var values = t.specValues;
          var tType = t.facilityType;
          if (!values || !tType) {
            var parseResult = deserializeSpecText(t.text, t.layer);
            if (parseResult) {
              values = values || parseResult.values;
              tType = tType || parseResult.facilityType;
            }
          }

          if (tType === fType || (FACILITY_CONFIG[fType] && t.layer === FACILITY_CONFIG[fType].layer)) {
            if (values && values[pivotFilter.pivotFieldId] !== undefined) {
              var pVal = String(values[pivotFilter.pivotFieldId]).trim();
              if (pVal === targetPivotVal) {
                var val = values[fieldId];
                if (val !== undefined && val !== null) {
                  var vStr = String(val).trim();
                  if (vStr !== '' && vStr !== '기타' && vStr !== '--' && vStr !== '선택' && vStr !== '직접입력') {
                    var ctx = getTextAttachmentContext(t);
                    addItem(vStr, ctx);
                  }
                }
              }
            }
          }
        }
      }

      // 1-3) 피벗 엄격 필터링 플래그 설정 (기준단어에 해당하는 과거 값들만 단독으로 보여줌!)
      resultList.isStrict = true;
      return resultList.slice(0, 10);
    }

    // [2] 일반 필드 (피벗 필터 없음): 전체 과거 데이터 최신 역순 추출
    // 2-1) 방안 B 메타데이터 파일별 저장 이력(_editHistory) 최우선 반영
    if (metadata && metadata._editHistory && metadata._editHistory[fType] && metadata._editHistory[fType][fieldId]) {
      var editHistArr = metadata._editHistory[fType][fieldId];
      if (Array.isArray(editHistArr)) {
        editHistArr.forEach(function (v) {
          var valStr = String(v).trim();
          if (valStr !== '' && valStr !== '기타' && valStr !== '--' && valStr !== '선택' && valStr !== '직접입력') {
            addItem(valStr, null);
          }
        });
      }
    }

    // 2-2) 직전 세션에서 방금 저장한 필드 값(lastSavedFieldValues) 최상단 보정
    var lastSaved = lastSavedFieldValues && lastSavedFieldValues[fType] && lastSavedFieldValues[fType][fieldId];
    if (lastSaved) {
      var sVal = String(lastSaved).trim();
      if (sVal !== '' && sVal !== '기타' && sVal !== '--' && sVal !== '선택' && sVal !== '직접입력') {
        var exIdx = -1;
        for (var k = 0; k < resultList.length; k++) {
          if ((typeof resultList[k] === 'object' ? resultList[k].val : resultList[k]) === sVal) {
            exIdx = k;
            break;
          }
        }
        if (exIdx !== -1) resultList.splice(exIdx, 1);
        resultList.unshift({ val: sVal, context: '최근저장' });
      }
    }

    // 2-3) 도면 텍스트(metadata.texts) 최신 역순(뒤에서부터) 탐색
    if (metadata && metadata.texts && metadata.texts.length > 0) {
      for (var j = metadata.texts.length - 1; j >= 0; j--) {
        var txtObj = metadata.texts[j];
        if (!txtObj) continue;

        var tValues = txtObj.specValues;
        var itemType = txtObj.facilityType;
        if (!tValues || !itemType) {
          var pRes = deserializeSpecText(txtObj.text, txtObj.layer);
          if (pRes) {
            tValues = tValues || pRes.values;
            itemType = itemType || pRes.facilityType;
          }
        }

        if (itemType === fType || (FACILITY_CONFIG[fType] && txtObj.layer === FACILITY_CONFIG[fType].layer)) {
          if (tValues && tValues[fieldId] !== undefined) {
            var rawVal = tValues[fieldId];
            if (rawVal !== undefined && rawVal !== null) {
              var strV = String(rawVal).trim();
              if (strV !== '' && strV !== '기타' && strV !== '--' && strV !== '선택' && strV !== '직접입력') {
                var ctx = getTextAttachmentContext(txtObj);
                addItem(strV, ctx);
              }
            }
          }
        }
      }
    }

    // 2-4) 참조 사전(referenceDictionary) 보조 병합
    if (fType && referenceDictionary[fType] && referenceDictionary[fType][fieldId]) {
      var refVals = referenceDictionary[fType][fieldId];
      for (var rk in refVals) {
        var rStr = String(rk).trim();
        if (rStr !== '' && rStr !== '기타' && rStr !== '--' && rStr !== '선택' && rStr !== '직접입력') {
          addItem(rStr, null);
        }
      }
    }

    return resultList.slice(0, 10);
  }

  // -------------------------------------------------------------
  // [방안 1: 스마트 자동 일괄 동기화 엔진]
  // 시설물별 핵심 기준 항목:
  // 중앙분리대: '종류', 기타표지: '내용', 도로표지: '종류', 지시/규제/주의/보조표지: '내용'
  // -------------------------------------------------------------
  var FACILITY_PIVOT_CRITERIA = {
    '중앙분리대': '종류',
    '기타표지': '내용',
    '도로표지': '종류',
    '지시표지': '내용',
    '규제표지': '내용',
    '주의표지': '내용',
    '보조표지': '내용'
  };

  // 과거 도면 텍스트(metadata.texts)에서 시설물과 기준 항목의 값이 일치하는 가장 최근 제원 세트를 역순 검색하는 함수
  function getLastSpecByPivotField(facilityType, pivotFieldId, chosenVal) {
    if (!facilityType || !pivotFieldId || !chosenVal) return null;
    var targetVal = String(chosenVal).trim();
    if (targetVal === '' || targetVal === '기타' || targetVal === '--' || targetVal === '선택' || targetVal === '입력생략' || targetVal === '미표기' || targetVal === '삭제' || targetVal === '제외') {
      return null;
    }

    var config = FACILITY_CONFIG[facilityType];
    if (!config || !config.fields) return null;
    var confLayer = String(config.layer || (facilityType + '_T')).replace(/_T$/i, '').toLowerCase();
    var confPrefix = String(config.prefix || config.title || facilityType).replace(/^\+/, '').toLowerCase();

    // 0) metadata._pivotHistory 역순 참조
    if (metadata && metadata._pivotHistory && metadata._pivotHistory[facilityType] && metadata._pivotHistory[facilityType][targetVal]) {
      var pivHist = metadata._pivotHistory[facilityType][targetVal];
      var synthesized = {};
      var hasAny = false;
      for (var fIdKey in pivHist) {
        if (Array.isArray(pivHist[fIdKey]) && pivHist[fIdKey].length > 0) {
          synthesized[fIdKey] = pivHist[fIdKey][0];
          hasAny = true;
        }
      }
      if (hasAny) {
        synthesized[pivotFieldId] = targetVal;
        return synthesized;
      }
    }

    // 1) metadata.texts 역순 탐색 (가장 최근에 작성된 데이터부터)
    if (metadata && metadata.texts && metadata.texts.length > 0) {
      for (var i = metadata.texts.length - 1; i >= 0; i--) {
        var t = metadata.texts[i];
        if (!t || !t.text) continue;

        var parsedValues = t.specValues;
        var parsedType = t.facilityType;
        if (!parsedValues || !parsedType) {
          var parsed = deserializeSpecText(t.text, t.layer);
          if (parsed) {
            parsedValues = parsedValues || parsed.values;
            parsedType = parsedType || parsed.facilityType;
          }
        }
        if (!parsedValues) continue;

        // 동일 시설물 판정
        var isMatched = false;
        if (parsedType) {
          isMatched = (parsedType === facilityType);
        } else {
          var tLayer = String(t.layer || '').replace(/_T$/i, '').toLowerCase();
          var firstWord = String(t.text.split('/')[0] || '').replace(/^\+/, '').toLowerCase();
          isMatched = (tLayer === confLayer || tLayer === facilityType.toLowerCase() || firstWord === confPrefix || firstWord === facilityType.toLowerCase());
        }
        if (!isMatched) continue;

        // 기준 필드 값 일치 여부 비교
        var baseVal = parsedValues[pivotFieldId];
        if (baseVal && String(baseVal).trim() === targetVal) {
          return parsedValues; // 일치하는 과거 최신 제원 세트 전체 반환
        }
      }
    }

    // 2) 직전 세션 저장 캐시값(lastSavedFieldValues) 참조
    if (lastSavedFieldValues && lastSavedFieldValues[facilityType]) {
      var savedVals = lastSavedFieldValues[facilityType];
      if (savedVals[pivotFieldId] && String(savedVals[pivotFieldId]).trim() === targetVal) {
        return savedVals;
      }
    }

    return null;
  }

  // 기준 항목 변경 시 일치하는 과거 제원 세트로 나머지 입력 필드들을 즉시 자동 일괄 동기화
  function triggerPivotAttributesSync(card, facilityType, pivotFieldId, chosenVal) {
    if (!card || !facilityType || !pivotFieldId || !chosenVal) return;

    var lastSpec = getLastSpecByPivotField(facilityType, pivotFieldId, chosenVal);
    if (!lastSpec) return; // 과거 이력이 없으면 사용자의 입력을 방해하지 않음

    var config = FACILITY_CONFIG[facilityType];
    var inputs = card.querySelectorAll('[data-field-id]');

    inputs.forEach(function (inp) {
      var fId = inp.getAttribute('data-field-id');
      if (fId === pivotFieldId) return; // 방금 사용자가 선택/입력한 기준 필드는 건드리지 않음

      var newVal = lastSpec[fId];
      if (newVal !== undefined && newVal !== null) {
        newVal = String(newVal).trim();
        inp.value = (newVal !== '기타' && newVal !== '선택' && newVal !== '직접입력') ? newVal : '';

        // 성공 피드백 녹색 하이라이트 효과 (0.5초)
        inp.style.borderColor = '#10b981';
        inp.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.35)';
        setTimeout(function () {
          inp.style.borderColor = '';
          inp.style.boxShadow = '';
        }, 500);
      }
    });

    if (config) {
      updateSpecPreview(card, config);
    }
    updateFloatingWindowSpecs();
  }

  // 카드 접두어 뱃지(+ 여부) 실시간 동기화 헬퍼
  function updateCardPrefixBadge(card) {
    if (!card) return;
    var isSub = card.getAttribute('data-is-sub') === 'true';
    var cType = card.getAttribute('data-facility-type');
    var cConfig = FACILITY_CONFIG[cType];
    var badge = card.querySelector('.token-prefix-badge');
    if (badge && cConfig) {
      var pfx = (cConfig.prefix !== undefined && cConfig.prefix !== '') ? cConfig.prefix : cType;
      if (isSub && pfx) {
        if (!pfx.startsWith('+')) pfx = '+' + pfx;
      } else if (!isSub && pfx) {
        pfx = pfx.replace(/^\+/, '');
      }
      badge.textContent = pfx;
    }
  }

  // 속성 카드 렌더링 (방안 1: 슬림 캐드 토큰 캡슐 바 모드)
  function renderAttributeCard(container, type, cachedVals, existingTextId, isSubParam) {
    // 전력주와 통신주는 캐드 전개 비대상 시설물이므로 속성 카드 노출을 원천 차단
    if (type === '전력주' || type === '통신주') return;
    
    var config = FACILITY_CONFIG[type];
    if (!config) return;

    attributeCardIndexUnique++;
    var cardId = 'attr-card-' + attributeCardIndexUnique;

    var card = document.createElement('div');
    card.className = 'attribute-card';
    card.id = cardId;
    card.setAttribute('data-facility-type', type);
    if (existingTextId) {
      card.setAttribute('data-existing-text-id', existingTextId);
    }

    // 부속시설물 판별 (파라미터 전달 또는 컨테이너 내에 이미 카드가 1개 이상 존재할 경우)
    var isSub = isSubParam === true || (container.children && container.children.length > 0);
    if (isSub) {
      card.setAttribute('data-is-sub', 'true');
    }

    // 1행 가로 토큰 바 컨테이너
    var tokenRow = document.createElement('div');
    tokenRow.className = 'token-bar-row';

    // [1] 접두어 뱃지 (주시설물: 보라색, 부속시설물: 청록/민트색)
    var prefixWord = (config.prefix !== undefined && config.prefix !== '') ? config.prefix : type;
    if (isSub && prefixWord) {
      if (!prefixWord.startsWith('+')) {
        prefixWord = '+' + prefixWord;
      }
    }
    var prefixBadge = document.createElement('span');
    prefixBadge.className = 'token-prefix-badge';
    prefixBadge.textContent = prefixWord || type;
    prefixBadge.title = (config.title || type) + (isSub ? ' (부속시설물)' : ' (주시설물)');
    tokenRow.appendChild(prefixBadge);

    // [2] 각 제원 필드별 슬래시 구분자(/) 및 직접 입력 가능한 콤보 캡슐 생성
    config.fields.forEach(function (f) {
      // 부속시설물일 경우 지주 및 사진 항목 생략
      if (isSub && (f.isSupport || f.isPhoto || /지주|사진/.test(f.label))) {
        return;
      }

      // [부시설물 가로등 규격] 가로등이 부시설물인 경우: 형태와 광원만 노출하고 나머지 항목 생략
      if (isSub && (type === '가로등' || type === '가로등(보안등)')) {
        if (f.label !== '형태' && f.label !== '광원' && f.id !== 'f_3' && f.id !== 'f_4') {
          return;
        }
      }

      // 슬래시(/) 고정 구분자 (사용자 실수로 지워지지 않는 안전 칸막이)
      var slash = document.createElement('span');
      slash.className = 'token-slash-sep';
      slash.textContent = '/';
      tokenRow.appendChild(slash);

      // 입력값 우선순위: 기존 캐시값 > 마지막 저장값 > 기본값
      var lastSaved = lastSavedFieldValues[type] && lastSavedFieldValues[type][f.id];
      var inputVal = '';
      if (cachedVals && cachedVals[f.id] !== undefined) {
        inputVal = cachedVals[f.id];
      } else if (lastSaved !== undefined && lastSaved !== '') {
        inputVal = lastSaved;
      } else {
        inputVal = f.default || '';
      }

      // 피벗 기준 필드 판별 (내용, 종류 등)
      var pivotLabel = (typeof FACILITY_PIVOT_CRITERIA !== 'undefined' ? FACILITY_PIVOT_CRITERIA[type] : null);
      var isPivotField = pivotLabel && (f.label === pivotLabel || f.label.indexOf(pivotLabel) !== -1);

      // 개별 알약 캡슐 박스
      var capsule = document.createElement('div');
      capsule.className = 'token-capsule' + (isPivotField ? ' is-pivot' : '');
      capsule.title = f.label + (isPivotField ? ' (피벗 기준 항목)' : '');

      // 키보드 직접 타이핑 및 목록 선택 가능한 콤보 인풋
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'token-input';
      input.setAttribute('data-field-id', f.id);
      input.setAttribute('autocomplete', 'off');
      input.value = inputVal;
      input.placeholder = f.label;
      input.title = f.label;

      // 텍스트 길이에 맞춰 인풋 폭 동적 조절
      var adjustInputWidth = function () {
        var str = input.value || input.placeholder || '';
        var w = Math.max(38, Math.min(130, (str.length * 9.5) + 14));
        input.style.width = w + 'px';
      };
      adjustInputWidth();

      // [방안 B] 내용/종류 등 기준 항목에 따라 높이/제원 목록을 엄격 필터링하고 최신 역순 목록을 공급하는 함수
      var dynamicSuggestions = function () {
        var curVal = input.value ? input.value.trim() : '';

        var pivotField = null;
        if (pivotLabel && config.fields) {
          pivotField = config.fields.find(function (fld) {
            return fld.label === pivotLabel || fld.label.indexOf(pivotLabel) !== -1;
          });
        }

        var pivotVal = '';
        if (pivotField) {
          var pivotInput = card.querySelector('[data-field-id="' + pivotField.id + '"]');
          if (pivotInput) {
            pivotVal = pivotInput.value.trim();
          }
        }

        // 기준 필드가 아닌 하위 필드이고, 기준값이 입력되어 있는 경우 엄격 필터링
        if (pivotField && f.id !== pivotField.id && pivotVal && pivotVal !== '기타' && pivotVal !== '선택' && pivotVal !== '직접입력' && pivotVal !== '--') {
          var filtered = getFieldSuggestions(f.id, type, curVal, {
            pivotFieldId: pivotField.id,
            pivotVal: pivotVal
          });
          if (filtered && filtered.length > 0) {
            return filtered;
          }
        }

        return getFieldSuggestions(f.id, type, curVal);
      };

      input.addEventListener('input', function () {
        adjustInputWidth();
        updateSpecPreview(card, config);
        updateFloatingWindowSpecs(); // 실시간 사진창 오버레이 동기화
        if (isPivotField) {
          triggerPivotAttributesSync(card, type, f.id, input.value);
        }
      });

      input.addEventListener('change', function () {
        adjustInputWidth();
        updateSpecPreview(card, config);
        updateFloatingWindowSpecs();
        if (isPivotField) {
          triggerPivotAttributesSync(card, type, f.id, input.value);
        }
      });

      // 포커스 하이라이트 및 페이드 헬퍼 적용
      setupInputFocusFade(input);

      capsule.appendChild(input);

      // 드롭다운 화살표
      var arrow = document.createElement('span');
      arrow.className = 'token-arrow';
      arrow.textContent = '▾';
      arrow.addEventListener('click', function (e) {
        e.stopPropagation();
        input.focus();
      });
      capsule.appendChild(arrow);

      // 커스텀 드롭다운 연동 및 엔터/화살표 키 조작 처리 (기존 로직 유지)
      setupCustomDropdown(input, f.options, dynamicSuggestions);

      tokenRow.appendChild(capsule);
    });

    // [3] 우측 버튼 그룹: ▲ 순서 올리기, ▼ 순서 내리기, ✕ 삭제 (인라인 정렬)
    var actionsWrap = document.createElement('div');
    actionsWrap.className = 'token-card-actions';

    var upBtn = document.createElement('button');
    upBtn.className = 'token-action-btn';
    upBtn.innerHTML = '▲';
    upBtn.title = '위로 이동 (순서 올리기)';
    upBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      moveAttributeCard(card, -1);
    });

    var downBtn = document.createElement('button');
    downBtn.className = 'token-action-btn';
    downBtn.innerHTML = '▼';
    downBtn.title = '아래로 이동 (순서 내리기)';
    downBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      moveAttributeCard(card, 1);
    });

    var delBtn = document.createElement('button');
    delBtn.className = 'token-action-btn del';
    delBtn.innerHTML = '✕';
    delBtn.title = '시설물 제거';
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var cardContainer = card.parentNode;
      if (cardContainer) {
        cardContainer.removeChild(card);
        // 남은 카드들의 주시설물/부속시설물 속성 및 뱃지 재동기화
        var remainingCards = cardContainer.querySelectorAll('.attribute-card');
        remainingCards.forEach(function (c, idx) {
          if (idx === 0) {
            c.removeAttribute('data-is-sub');
          } else {
            c.setAttribute('data-is-sub', 'true');
          }
          var cType = c.getAttribute('data-facility-type');
          var cConfig = FACILITY_CONFIG[cType];
          if (cConfig) {
            updateCardPrefixBadge(c);
            updateSpecPreview(c, cConfig);
          }
        });
      }
      updateFloatingWindowSpecs(); // 실시간 오버레이 동기화
    });

    actionsWrap.appendChild(upBtn);
    actionsWrap.appendChild(downBtn);
    actionsWrap.appendChild(delBtn);
    tokenRow.appendChild(actionsWrap);

    card.appendChild(tokenRow);

    // 하단 중복 초록색 전개 박스는 생성하지 않음 (사진창의 실시간 제원문자로 충분)

    container.appendChild(card);
    updateSpecPreview(card, config);
  }

  function buildSpecString(card, config) {
    var type = card.getAttribute('data-facility-type');
    var fields = card.querySelectorAll('[data-field-id]');
    var values = {};
    
    fields.forEach(function (f) {
      var fVal = f.value ? f.value.trim() : '';
      values[f.getAttribute('data-field-id')] = fVal;
    });

    // 부속시설물 여부 확인
    var isSub = false;
    if (card.getAttribute('data-is-sub') === 'true') {
      isSub = true;
    } else {
      var parent = card.parentNode;
      if (parent) {
        var siblingCards = parent.querySelectorAll('.attribute-card');
        if (siblingCards.length > 0 && siblingCards[0] !== card) {
          isSub = true;
        }
      }
    }

    // 접두어 결정 (부속시설물일 경우 + 자동 첨부)
    var prefixWord = (config.prefix !== undefined && config.prefix !== '') ? config.prefix : type;
    if (isSub && prefixWord) {
      if (!prefixWord.startsWith('+')) {
        prefixWord = '+' + prefixWord;
      }
    }

    var resultParts = [];
    if (prefixWord) {
      resultParts.push(prefixWord);
    }

    // [부시설물 가로등 규격: +가등/형태/광원]
    if (isSub && (type === '가로등' || type === '가로등(보안등)' || type === '가로등(부착)')) {
      var pWord = prefixWord || '+가등';
      if (!pWord.startsWith('+')) pWord = '+' + pWord;
      var subParts = [pWord];
      var fTypeVal = values['f_3'] || values['f_1'] || '';
      var fLightVal = values['f_4'] || values['f_2'] || '';
      if (fTypeVal && fTypeVal !== '--' && fTypeVal !== '입력생략' && fTypeVal !== '선택' && fTypeVal !== '삭제' && fTypeVal !== '제외') subParts.push(fTypeVal);
      if (fLightVal && fLightVal !== '--' && fLightVal !== '입력생략' && fLightVal !== '선택' && fLightVal !== '삭제' && fLightVal !== '제외') subParts.push(fLightVal);
      return subParts.join('/');
    }

    // [주시설물 가로등(보안등) 방안 C 순서 전개]
    // 규격: 가등 / 종류 / 재질 / 형태 / 광원 / 높이 / 암길이 / +보안등 / 부착형태 / 부착광원 / 사진
    // 예: 가등/원형/철재/가오스형/LED/10.0/1.7/+보안등/가오스형/LED/사진 (한 줄로 표기)
    if (type === '가로등(보안등)') {
      var partsList = [prefixWord || '가등'];
      
      // 1. 종류, 재질 (f_1, f_2)
      ['f_1', 'f_2'].forEach(function(fid) {
        var v = values[fid] ? String(values[fid]).trim() : '';
        if (v && v !== '--' && v !== '입력생략' && v !== '선택' && v !== '삭제' && v !== '제외') partsList.push(v);
      });
      
      // 2. 가로등 본체 형태, 광원 (f_3, f_4)
      ['f_3', 'f_4'].forEach(function(fid) {
        var v = values[fid] ? String(values[fid]).trim() : '';
        if (v && v !== '--' && v !== '입력생략' && v !== '선택' && v !== '삭제' && v !== '제외') partsList.push(v);
      });

      // 3. 높이, 암길이 (f_5, f_6)
      var vH = values['f_5'] ? String(values['f_5']).trim() : '';
      if (vH && vH !== '--' && vH !== '입력생략' && vH !== '선택' && vH !== '삭제' && vH !== '제외') partsList.push(vH);

      var vArm = values['f_6'] ? String(values['f_6']).trim() : '';
      if (vArm && vArm !== '--' && vArm !== '입력생략' && vArm !== '선택' && vArm !== '삭제' && vArm !== '제외') {
        partsList.push(vArm.replace(/^\/+/, '')); // 이중 슬래시 방지 (/1.7 -> 1.7)
      }

      // 4. 보안등유무 (+보안등) (f_7)
      var vSec = values['f_7'] ? String(values['f_7']).trim() : '';
      if (vSec && vSec !== '--' && vSec !== '입력생략' && vSec !== '선택' && vSec !== '삭제' && vSec !== '제외' && vSec !== '없음') {
        partsList.push(vSec);
      }

      // 5. 부착 보안등 형태, 광원 (f_8, f_9)
      ['f_8', 'f_9'].forEach(function(fid) {
        var v = values[fid] ? String(values[fid]).trim() : '';
        if (v && v !== '--' && v !== '입력생략' && v !== '선택' && v !== '삭제' && v !== '제외') partsList.push(v);
      });

      // 6. 사진 (f_10)
      if (!isSub) {
        var vPhoto = values['f_10'] ? String(values['f_10']).trim() : '';
        if (vPhoto === '사진' || vPhoto === '입력') partsList.push('사진');
      }

      return partsList.join('/');
    }

    if (config.fields && config.fields.length > 0) {
      config.fields.forEach(function (f) {
        if (f.id === 'name') return;

        // 부속시설물일 경우 지주 및 사진 항목 생략
        if (isSub && (f.isSupport || f.isPhoto || /지주|사진/.test(f.label))) {
          return;
        }

        var val = values[f.id];
        if (val === undefined || val === null) return;
        val = String(val).trim();

        // [사용자 요구사항] 공란/빈칸('') 또는 '입력생략' 시 도면 조립에서 완전히 생략!
        // 레거시 기호('--', '삭제', '제외', '미표기', '없음', '선택')도 빈칸 취급하여 생략하되, '기타'는 실제 데이터이므로 생략하지 않고 전개!
        if (val === '' || val === '입력생략' || val === '삭제' || val === '제외' || val === '미표기' || val === '없음' || val === '--' || val === '선택') {
          return;
        }

        // 암길이 필드 등에서 선행 슬래시(/)가 join('/')과 중복되어 // 가 되는 현상 방지
        if (f.label === '암길이' || f.id === 'f_6') {
          val = val.replace(/^\/+/, '');
        }

        // 사진 필드는 '사진' 그대로 전개
        resultParts.push(val);
      });
    } else {
      return prefixWord || type;
    }

    return resultParts.join('/');
  }

  // 사진 뷰어 플로팅 창 내부 속성 텍스트 오버레이 실시간 업데이트 함수
  function isAutoGeneratedMemo(memo) {
    if (!memo) return true;
    var s = String(memo).trim();
    if (s === '') return true;
    if (s.indexOf('시설물') !== -1 && s.indexOf('조사') !== -1) return true;
    return false;
  }

  function updateFloatingWindowSpecs(targetPhotoId) {
    var specEl = document.getElementById('floating-window-specs');
    if (!specEl) return;

    var photoIdToUse = targetPhotoId || selectedPhotoId;

    // 1. 현재 선택된 사진 객체 가져오기
    var currentPhoto = metadata && metadata.photos && metadata.photos.find(function(x) { return x.id === photoIdToUse; });
    if (!currentPhoto) {
      specEl.textContent = '';
      specEl.style.display = 'none';
      return;
    }

    // 2. 현재 선택된 사진의 사진 번호 구하기
    var numStr = '';
    if (currentPhoto.numTextId && metadata.texts) {
      var numObj = metadata.texts.find(function(t) { return t.id === currentPhoto.numTextId; });
      if (numObj) numStr = numObj.text;
    }

    // 사진 번호에 언더바 '_'가 들어간 서브 사진(참조용 사진)인 경우 미리보기를 보여주지 않음
    if (numStr && numStr.indexOf('_') !== -1) {
      specEl.textContent = '';
      specEl.style.display = 'none';
      return;
    }

    // 3. 부모 사진인 경우: 캐드에 실제로 전개될 텍스트 데이터를 3중 백업 구조로 안전하게 수집 ({ text: string, isEdited: boolean })
    var specItems = [];
    var foundFromCards = false;

    // 검수 탭 활성화 여부 확인 (검수 탭일 때는 카드가 아닌 metadata.texts의 최신 데이터를 최우선 수집!)
    var inspectTab = document.getElementById('tab-inspect-content');
    var isInspectTabActive = inspectTab && inspectTab.style.display !== 'none';
    
    // 3-1) [제원 편집 탭일 때만] 화면에 렌더링된 실시간 속성 카드가 존재한다면, 화면값을 최우선 수집!
    if (!isInspectTabActive) {
      var cards = document.querySelectorAll('.attribute-card');
      if (cards.length > 0) {
        cards.forEach(function (card) {
          var type = card.getAttribute('data-facility-type');
          var textId = card.getAttribute('data-text-id');
          var config = FACILITY_CONFIG[type];
          if (config) {
            var specStr = buildSpecString(card, config);
            if (specStr) {
              var isDone = false;
              if (textId && metadata && metadata.texts) {
                var tObj = metadata.texts.find(function (t) { return t.id === textId; });
                isDone = isTextSpecEdited(tObj, currentPhoto);
              } else {
                isDone = false;
              }
              specItems.push({ text: specStr, isEdited: isDone });
              foundFromCards = true;
            }
          }
        });
      }
    }

    // 3-2) [검수 탭이 켜져 있거나 화면에 카드가 없을 때]: metadata.texts에서 최신 CAD 전개 문자 100% 직접 수집!
    if (!foundFromCards) {
      var textIds = currentPhoto.specTextIds || [];
      if (textIds.length === 0 && currentPhoto.specTextId) {
        textIds = [currentPhoto.specTextId];
      }
      if (metadata.texts && textIds.length > 0) {
        textIds.forEach(function (tId) {
          var textObj = metadata.texts.find(function (t) { return t.id === tId; });
          if (textObj && textObj.text) {
            var isDone = isTextSpecEdited(textObj, currentPhoto);
            specItems.push({ text: textObj.text, isEdited: isDone });
          }
        });
      }
    }

    // 3-3) [우선순위 3] 카드도 없고 텍스트 데이터도 없는 경우, 사진 자체의 facilityType이 일반사진이 아니면 대체 출력
    if (specItems.length === 0) {
      if (currentPhoto.facilityType && currentPhoto.facilityType !== '일반사진') {
        specItems.push({ text: currentPhoto.facilityType, isEdited: isPhotoAllSpecsEdited(currentPhoto) });
      }
    }

    // 4. 자동 생성형 가짜 메모는 거르고, 진짜 입력된 메모만 웹앱과 똑같이 [메모] 접두사 형태로 합치기
    var memoVal = '';
    if (!isInspectTabActive && getEl('photo-memo')) {
      memoVal = getEl('photo-memo').value;
    }
    if (!memoVal && currentPhoto.memo) {
      memoVal = currentPhoto.memo;
    }
    var memoText = (memoVal && memoVal.trim() !== '' && !isAutoGeneratedMemo(memoVal)) ? ('[메모] ' + memoVal.trim()) : '';

    // 5. [사용자 핵심 요구사항] 검수 완료된 제원 줄은 파란색 글자, 미검수된 제원 줄은 주황색 글자로 렌더링!
    specEl.innerHTML = '';
    if (specItems.length > 0 || memoText) {
      specItems.forEach(function (item) {
        var lineDiv = document.createElement('div');
        lineDiv.className = 'floating-spec-line ' + (item.isEdited ? 'is-done' : 'is-pending');
        lineDiv.style.color = item.isEdited ? '#60a5fa' : '#fb923c';
        lineDiv.style.fontWeight = '600';
        lineDiv.style.lineHeight = '1.45';
        lineDiv.style.textShadow = '0 1px 3px rgba(0, 0, 0, 0.9)';
        lineDiv.textContent = item.text;
        specEl.appendChild(lineDiv);
      });

      if (memoText) {
        var memoDiv = document.createElement('div');
        memoDiv.className = 'floating-spec-memo';
        memoDiv.style.color = '#cbd5e1';
        memoDiv.style.fontSize = '12px';
        memoDiv.style.marginTop = '4px';
        memoDiv.style.textShadow = '0 1px 3px rgba(0, 0, 0, 0.9)';
        memoDiv.textContent = memoText;
        specEl.appendChild(memoDiv);
      }
      specEl.style.display = 'block';
    } else {
      specEl.style.display = 'none';
    }
  }

  /** 검수 엑셀 표에서 사용자가 타이핑하는 동안(input 이벤트) 사진창 CAD 전개 텍스트 즉시 미리보기 동기화 */
  function updateFloatingSpecsFromGridPreview(row, partIndex, tempValue) {
    var specEl = document.getElementById('floating-window-specs');
    var floatingWin = document.getElementById('floating-image-window');
    if (!specEl || !floatingWin || floatingWin.style.display === 'none') return;
    if (!row || !row.photo) return;

    var targetPhoto = row.photo;
    var numStr = '';
    if (targetPhoto.numTextId && metadata && metadata.texts) {
      var numObj = metadata.texts.find(function(t) { return t.id === targetPhoto.numTextId; });
      if (numObj) numStr = numObj.text;
    }
    if (numStr && numStr.indexOf('_') !== -1) return;

    // 현재 행의 제원 파트 복제 및 임시값 적용
    var tempParts = (row.specParts || []).slice();
    while (tempParts.length <= partIndex) {
      tempParts.push('');
    }
    tempParts[partIndex] = (tempValue || '').trim();

    var prefix = row.prefix;
    if (!prefix) {
      var basePref = (row.config && row.config.prefix) ? row.config.prefix : row.facilityType;
      prefix = row.isSub ? ('+' + basePref) : basePref;
    } else {
      if (row.isSub && !prefix.startsWith('+')) {
        prefix = '+' + prefix;
      }
    }

    var validParts = [prefix];
    for (var i = 0; i < tempParts.length; i++) {
      var pVal = tempParts[i];
      if (pVal !== undefined && pVal !== null && pVal !== '') {
        validParts.push(pVal);
      }
    }
    var tempSpecText = validParts.join('/');

    // 현재 사진에 연결된 모든 텍스트들을 모으되, 현재 수정 중인 텍스트는 tempSpecText로 교체
    var specItems = [];
    var textIds = targetPhoto.specTextIds || [];
    if (textIds.length === 0 && targetPhoto.specTextId) {
      textIds = [targetPhoto.specTextId];
    }

    if (metadata && metadata.texts && textIds.length > 0) {
      textIds.forEach(function (tId) {
        if (row.txtObj && row.txtObj.id === tId) {
          specItems.push({ text: tempSpecText, isEdited: false });
        } else {
          var textObj = metadata.texts.find(function (t) { return t.id === tId; });
          if (textObj && textObj.text) {
            specItems.push({ text: textObj.text, isEdited: isTextSpecEdited(textObj, targetPhoto) });
          }
        }
      });
    }

    if (specItems.length === 0 && tempSpecText) {
      specItems.push({ text: tempSpecText, isEdited: false });
    }

    specEl.innerHTML = '';
    if (specItems.length > 0) {
      specItems.forEach(function (item) {
        var lineDiv = document.createElement('div');
        lineDiv.className = 'floating-spec-line ' + (item.isEdited ? 'is-done' : 'is-pending');
        lineDiv.style.color = item.isEdited ? '#60a5fa' : '#fb923c';
        lineDiv.style.fontWeight = '600';
        lineDiv.style.lineHeight = '1.45';
        lineDiv.style.textShadow = '0 1px 3px rgba(0, 0, 0, 0.9)';
        lineDiv.textContent = item.text;
        specEl.appendChild(lineDiv);
      });
      specEl.style.display = 'block';
    }
  }

  function updateSpecPreview(card, config) {
    var specStr = buildSpecString(card, config);
    var previewBox = card.querySelector('.preview-spec-box');
    if (previewBox) {
      previewBox.textContent = 'CAD 전개 문자: ' + specStr;
    }
    // 사진 뷰어 상의 텍스트 오버레이도 실시간 동기화
    updateFloatingWindowSpecs();
  }

  // -------------------------------------------------------------
  // [6] 데이터 수동 저장 및 로컬 쓰기 동기화
  // -------------------------------------------------------------
  async function saveCurrentPhoto(options) {
    var keepOpen = options && options.keepOpen === true;
    if (!metadata || !selectedPhotoId) return;

    var p = metadata.photos.find(function (x) { return x.id === selectedPhotoId; });
    if (!p) return;

    recordUndoSnapshot();

    showLoading(true, '속성 데이터를 로컬에 덮어쓰는 중...');

    p.memo = getEl('photo-memo').value;

    var cards = document.querySelectorAll('.attribute-card');
    var newTextIds = [];
    
    var oldTextIds = p.specTextIds || [];
    if (oldTextIds.length === 0 && p.specTextId) {
      oldTextIds = [p.specTextId];
    }
    
    if (metadata.texts) {
      metadata.texts = metadata.texts.filter(function (t) {
        return oldTextIds.indexOf(t.id) === -1;
      });
    } else {
      metadata.texts = [];
    }

    var addTypes = [];
    cards.forEach(function (card, index) {
      var type = card.getAttribute('data-facility-type');
      var config = FACILITY_CONFIG[type];
      if (!config) return;

      var fields = card.querySelectorAll('[data-field-id]');
      var values = {};
      fields.forEach(function (f) {
        var fVal = f.value ? f.value.trim() : '';
        values[f.getAttribute('data-field-id')] = fVal;
      });

      var specStr = buildSpecString(card, config);
      var textId = 'text-spec-' + p.id + '-' + index;
      card.setAttribute('data-existing-text-id', textId);

      var specTextObj = {
        id: textId,
        x: p.position.x,
        y: p.position.y,
        text: specStr,
        layer: config.layer || (type + '_T'),
        color: (config.color !== undefined && config.color !== null) ? Number(config.color) : 7,
        facilityType: type,
        specValues: Object.assign({}, values)
      };

      // [방안 B] 메타데이터 독립 편집 이력 저장 (_editHistory 및 _pivotHistory)
      if (!metadata._editHistory) metadata._editHistory = {};
      if (!metadata._editHistory[type]) metadata._editHistory[type] = {};
      if (!metadata._pivotHistory) metadata._pivotHistory = {};
      if (!metadata._pivotHistory[type]) metadata._pivotHistory[type] = {};

      var pivotLabel = (typeof FACILITY_PIVOT_CRITERIA !== 'undefined' ? FACILITY_PIVOT_CRITERIA[type] : null);
      var pivotFieldId = null;
      if (pivotLabel && config.fields) {
        var pf = config.fields.find(function (fld) {
          return fld.label === pivotLabel || fld.label.indexOf(pivotLabel) !== -1;
        });
        if (pf) pivotFieldId = pf.id;
      }
      var pivotVal = pivotFieldId && values[pivotFieldId] ? String(values[pivotFieldId]).trim() : '';

      for (var fId in values) {
        var val = values[fId];
        if (val && val !== '' && val !== '기타' && val !== '--' && val !== '선택' && val !== '직접입력') {
          // 1) 전체 일반 필드 역순 이력 (MRU)
          if (!metadata._editHistory[type][fId]) metadata._editHistory[type][fId] = [];
          var histArr = metadata._editHistory[type][fId];
          var exIdx = histArr.indexOf(val);
          if (exIdx !== -1) histArr.splice(exIdx, 1);
          histArr.unshift(val);
          if (histArr.length > 20) histArr.pop();

          // 2) 피벗 기준 역순 이력 (MRU)
          if (pivotVal && pivotVal !== '기타' && pivotVal !== '--' && pivotVal !== '선택' && pivotVal !== '직접입력') {
            if (!metadata._pivotHistory[type][pivotVal]) metadata._pivotHistory[type][pivotVal] = {};
            if (!metadata._pivotHistory[type][pivotVal][fId]) metadata._pivotHistory[type][pivotVal][fId] = [];
            var pivArr = metadata._pivotHistory[type][pivotVal][fId];
            var pExIdx = pivArr.indexOf(val);
            if (pExIdx !== -1) pivArr.splice(pExIdx, 1);
            pivArr.unshift(val);
            if (pivArr.length > 20) pivArr.pop();
          }
        }
      }

      metadata.texts.push(specTextObj);
      newTextIds.push(textId);
      if (index > 0) {
        addTypes.push(type);
      }
    });

    if (newTextIds.length > 0) {
      p.facilityType = cards[0].getAttribute('data-facility-type');
      p.specTextId = newTextIds[0];
      p.specTextIds = newTextIds;
      p.additionalTypes = addTypes;
    } else {
      // 속성을 다 비우고 저장했을 경우 '일반사진'으로 명시 전환
      p.facilityType = '일반사진';
      p.specTextId = null;
      p.specTextIds = null;
      p.additionalTypes = [];
    }

    // [고도화 추가] 저장 완료 상태 플래그 설정 (마커 색상 파란색 전환용)
    p.edited = true;

    updateFacilitySelectOptions();
    updateInspectFacilityOptions();
    if (inspectActiveFacility) {
      renderInspectList(inspectActiveFacility);
    }
    
    // 지도의 오버레이를 전부 삭제 후 새로 생성하는 무거운 작업 대신,
    // 이미 맵에 생성된 마커들의 CSS 클래스와 가시성 정보만 실시간 동기화하여 갱신 지연(마우스 움직여야 반응하는 버그)을 완벽히 해결함
    updateMarkerModeOnMap();
    updateLabelsOnMap();
    
    updateProgressBar();

    var isSavedDirectly = false;
    if (dirHandle) {
      isSavedDirectly = await saveMetadataToLocalFolder(metadata);
    }

    showLoading(false);

    // [요구사항] 저장 완료 후 마지막으로 저장한 필드 값을 추적하여 다음번 드롭다운 최상단에 표시
    var savedCards = document.querySelectorAll('#attribute-cards-container .attribute-card');
    savedCards.forEach(function (card) {
      var fType = card.getAttribute('data-facility-type');
      if (!fType) return;
      if (!lastSavedFieldValues[fType]) lastSavedFieldValues[fType] = {};
      var fieldInputs = card.querySelectorAll('[data-field-id]');
      fieldInputs.forEach(function (inp) {
        var fId = inp.getAttribute('data-field-id');
        var val = inp.value ? inp.value.trim() : '';
        if (fId && val && val !== '') {
          lastSavedFieldValues[fType][fId] = val;
        }
      });
    });

    if (isSavedDirectly) {
      console.log('PC 로컈 폴더 실시간 수정본 저장 완료 (' + getModifiedMetadataFileName() + ')');
    } else {
      triggerManualJsonDownload();
    }

    // 저장 후 플로팅 뷰어 자동 닫기 (하단 썸네일에 겹침 사진이 2장 이상이거나 keepOpen일 때는 닫지 않음)
    var _fw = getEl('floating-image-window');
    var _thumbs = getEl('floating-window-thumbnails');
    var hasSiblings = _thumbs && _thumbs.children.length > 1;
    if (_fw && !hasSiblings && !keepOpen) {
      _fw.style.display = 'none';
    }
  }

  function triggerManualJsonDownload() {
    var jsonString = JSON.stringify(metadata, null, 2);
    var blob = new Blob([jsonString], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = getModifiedMetadataFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('속성이 저장되었습니다.\n(폴더 직접 쓰기 권한이 없어 브라우저 다운로드 폴더에 [' + getModifiedMetadataFileName() + '] 파일로 다운로드되었습니다.)');
  }

  function updateProgressBar() {
    if (!metadata || !metadata.photos) return;
    var total = metadata.photos.length;
    if (total === 0) return;

    var completed = metadata.photos.filter(function (p) {
      return p.facilityType != null && p.facilityType !== '';
    }).length;

    var pct = Math.round((completed / total) * 100);
    var pBar = document.getElementById('progress-bar-fill');
    if (pBar) pBar.style.width = pct + '%';
    var pPct = document.getElementById('progress-percent');
    if (pPct) pPct.textContent = pct + '% (' + completed + '/' + total + '장 완료)';
  }

  // -------------------------------------------------------------
  // [7] 수정된 데이터 ZIP 패키징 내보내기
  // -------------------------------------------------------------
  function exportModifiedZip() {
    if (!metadata) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    showLoading(true, '최종 작업 결과물 ZIP 압축 중...');

    var zip = new JSZip();
    metadata.lastModified = new Date().toISOString();
    
    var metaBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    zip.file(getModifiedMetadataFileName(), metaBlob);

    for (var filename in photoBlobs) {
      zip.file(filename, photoBlobs[filename]);
    }

    zip.generateAsync({ type: 'blob' }).then(function (content) {
      showLoading(false);
      var exportFilename = projectBaseName + '_수정_export.zip';
      var url = URL.createObjectURL(content);
      var a = document.createElement('a');
      a.href = url;
      a.download = exportFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('수정완료 패키지(ZIP) 내보내기가 완료되었습니다.');
    }).catch(function (err) {
      showLoading(false);
      console.error(err);
      alert('압축 파일 생성 실패: ' + err.message);
    });
  }

  // -------------------------------------------------------------
  // [8] [고도화 추가] 드래그 및 리사이즈 가능한 플로팅 윈도우 스크립트
  // -------------------------------------------------------------
  var scale = 1;
  var isDragging = false;
  var startX = 0, startY = 0;
  var translateX = 0, translateY = 0;

  // 최대화 상태 제어용 변수
  var isImageMaximized = false;
  var preMaximizedCoords = { width: '', height: '', left: '', top: '' };

  // 사진창 최대화/이전크기 복원 토글 함수
  function toggleMaximizeImageWindow() {
    var win = getEl('floating-image-window');
    var container = document.querySelector('.canvas-container');
    var maxBtn = getEl('window-maximize-btn');
    if (!win || !container) return;

    if (!isImageMaximized) {
      // 1. 최대화 전 현재 크기 및 좌표 백업
      preMaximizedCoords.width = win.style.width || (win.offsetWidth + 'px');
      preMaximizedCoords.height = win.style.height || (win.offsetHeight + 'px');
      preMaximizedCoords.left = win.style.left || (win.offsetLeft + 'px');
      preMaximizedCoords.top = win.style.top || (win.offsetTop + 'px');

      // 2. 도면 영역의 BoundingClientRect를 실시간 계산하여 전체 배치
      var rect = container.getBoundingClientRect();
      win.style.left = rect.left + 'px';
      win.style.top = rect.top + 'px';
      win.style.width = rect.width + 'px';
      win.style.height = rect.height + 'px';

      isImageMaximized = true;
      if (maxBtn) {
        maxBtn.textContent = '❐';
        maxBtn.title = '이전 크기로 복원';
      }
    } else {
      // 3. 이전 크기로 복원
      win.style.width = preMaximizedCoords.width;
      win.style.height = preMaximizedCoords.height;
      win.style.left = preMaximizedCoords.left;
      win.style.top = preMaximizedCoords.top;

      isImageMaximized = false;
      if (maxBtn) {
        maxBtn.textContent = '🗖';
        maxBtn.title = '도면 영역 크기로 최대화';
      }
    }
  }

  function setupImageZoom() {
    var win = getEl('floating-image-window');
    var dragHandle = document.getElementById('window-drag-handle');
    var resizeHandle = win.querySelector('.window-resize-handle');
    var container = document.getElementById('zoom-container');
    var img = getEl('image-modal-src');

    // 1) 윈도우 창 드래그 이동 기능
    var isWinDragging = false;
    var winStartX = 0, winStartY = 0;

    dragHandle.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('window-btn') || e.target.closest('.window-btn')) return;

      // 최대화 상태에서 드래그 시도 시 복원 처리
      if (isImageMaximized) {
        toggleMaximizeImageWindow();
      }

      isWinDragging = true;
      winStartX = e.clientX - win.offsetLeft;
      winStartY = e.clientY - win.offsetTop;
      document.body.style.userSelect = 'none';
    });

    // 2) 윈도우 창 크기 조절 (Resize) 기능
    var isResizing = false;
    var startWidth = 0, startHeight = 0;
    var startResizeX = 0, startResizeY = 0;

    resizeHandle.addEventListener('mousedown', function (e) {
      e.preventDefault();

      // 최대화 상태에서 크기 조절 시도 시 복원 처리
      if (isImageMaximized) {
        toggleMaximizeImageWindow();
      }

      isResizing = true;
      startWidth = win.offsetWidth;
      startHeight = win.offsetHeight;
      startResizeX = e.clientX;
      startResizeY = e.clientY;
      document.body.style.userSelect = 'none';
    });

    // 마우스 이동 통합 핸들러
    window.addEventListener('mousemove', function (e) {
      // 윈도우 드래그 이동
      if (isWinDragging) {
        var newLeft = e.clientX - winStartX;
        var newTop = e.clientY - winStartY;
        // 브라우저 밖으로 탈출 방지
        newLeft = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, newLeft));
        newTop = Math.max(0, Math.min(window.innerHeight - win.offsetHeight, newTop));
        win.style.left = newLeft + 'px';
        win.style.top = newTop + 'px';
      }
      
      // 윈도우 리사이즈
      if (isResizing) {
        var diffX = e.clientX - startResizeX;
        var diffY = e.clientY - startResizeY;
        var newWidth = Math.max(320, startWidth + diffX);
        var newHeight = Math.max(260, startHeight + diffY);
        win.style.width = newWidth + 'px';
        win.style.height = newHeight + 'px';
      }

      // 이미지 내부 펜 드래그 (확대되었을 때 작동)
      if (isDragging && !isWinDragging && !isResizing) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        applyZoomTransform(img);
      }
    });

    // 마우스 업 통합 핸들러
    window.addEventListener('mouseup', function () {
      isWinDragging = false;
      isResizing = false;
      isDragging = false;
      document.body.style.userSelect = '';
      container.style.cursor = 'grab';
    });

    // 3) 이미지 마우스 휠 줌(Zoom) 기능
    container.addEventListener('wheel', function (e) {
      e.preventDefault();
      var zoomFactor = 0.1;
      if (e.deltaY < 0) {
        scale = Math.min(6, scale + zoomFactor); // 최대 6배
      } else {
        scale = Math.max(0.4, scale - zoomFactor); // 최소 0.4배
      }
      applyZoomTransform(img);
    });

    // 4) 이미지 내부 드래그 펜(Pan) 시작
    container.addEventListener('mousedown', function (e) {
      if (e.target === resizeHandle || e.target.closest('#window-drag-handle')) return;
      if (scale <= 1 && translateX === 0 && translateY === 0) return; // 등배일 땐 패닝 생략
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      container.style.cursor = 'grabbing';
    });
  }

  function applyZoomTransform(img) {
    img.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
  }

  function resetZoomState() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    var img = getEl('image-modal-src');
    if (img) {
      img.style.transform = 'none';
    }
  }

  /** 이미지 슬라이드 뷰어 열기 */
  function openImageViewer(photosList, startIndex) {
    imageViewerPhotos = photosList || [];
    imageViewerIndex = startIndex >= 0 && startIndex < imageViewerPhotos.length ? startIndex : 0;
    
    var viewer = getEl('image-viewer-modal');
    if (!viewer) return;

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
    img.src = photoBlobUrls[item.fileName] || '';

    // 사진 번호 텍스트 표시
    var numStr = '';
    if (metadata && metadata.texts && item.numTextId) {
      var numObj = metadata.texts.find(function (t) { return t.id === item.numTextId; });
      if (numObj) numStr = '사진 #' + numObj.text + ' - ';
    }

    if (title) {
      title.textContent = numStr + (imageViewerIndex + 1) + ' / ' + imageViewerPhotos.length + ' (' + item.fileName + ')';
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

    // 사이드바 썸네일 액티브 상태 동기화 및 자동 선택 유도
    var thumbContainer = document.getElementById('sidebar-thumbnails');
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

  // 뷰어 및 검수 UI 이벤트 리스너 초기화 등록
  function initViewerAndInspectEvents() {
    var closeBtn = document.getElementById('image-viewer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeImageViewer);

    // JSON 파일 선택 모달 닫기
    var jsonModalClose = document.getElementById('json-modal-close');
    if (jsonModalClose) {
      jsonModalClose.addEventListener('click', function () {
        getEl('json-select-modal').classList.remove('active');
      });
    }

    // [참조 파일 추가] 참조 파일 열기 이벤트 바인딩
    var refFileBtn = document.getElementById('ref-file-btn');
    var refFileInput = document.getElementById('ref-file-input');
    if (refFileBtn && refFileInput) {
      refFileBtn.addEventListener('click', function () {
        refFileInput.click();
      });
      refFileInput.addEventListener('change', function (e) {
        handleReferenceFiles(e.target.files);
      });
    }

    // [방안 2] 시설물 전수 검수 탭 및 UI 이벤트 초기화 등록
    setupInspectUI();

    // [다중 병합 추가] 모달 내 전체 선택
    var selectAllBtn = document.getElementById('json-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', function () {
        var chks = document.querySelectorAll('.json-chk-item');
        chks.forEach(function (c) { c.checked = true; });
      });
    }

    // [다중 병합 추가] 모달 내 전체 해제
    var deselectAllBtn = document.getElementById('json-deselect-all');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', function () {
        var chks = document.querySelectorAll('.json-chk-item');
        chks.forEach(function (c) { c.checked = false; });
      });
    }

    // [다중 병합 추가] 선택 파일 병합하여 로드
    var mergeLoadBtn = document.getElementById('json-merge-load');
    if (mergeLoadBtn) {
      mergeLoadBtn.addEventListener('click', async function () {
        var chks = document.querySelectorAll('.json-chk-item:checked');
        if (chks.length === 0) {
          alert('병합하여 불러올 JSON 파일을 최소 한 개 이상 선택해 주세요.');
          return;
        }
        var selectedEntries = [];
        chks.forEach(function (c) {
          var entryName = c.value;
          var entry = globalJsonEntriesTemp.find(function (e) { return e.name === entryName; });
          if (entry) {
            selectedEntries.push(entry);
          }
        });
        
        getEl('json-select-modal').classList.remove('active');
        await finishFolderLoad(selectedEntries, dxfEntries, imageEntriesTempForMerge);
      });
    }

    // 사진 원본 플로팅 창 최대화 버튼 이벤트 바인딩
    var maxBtn = getEl('window-maximize-btn');
    if (maxBtn) {
      maxBtn.addEventListener('click', toggleMaximizeImageWindow);
    }

    // 사진 원본 플로팅 창 타이틀바 더블클릭 이벤트 바인딩
    var dragHandle = document.getElementById('window-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('dblclick', function (e) {
        if (e.target.classList.contains('window-btn') || e.target.closest('.window-btn')) return;
        toggleMaximizeImageWindow();
      });
    }

    var prevBtn = document.getElementById('image-viewer-prev');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (imageViewerPhotos.length <= 1) return;
      var nextIdx = imageViewerIndex - 1;
      if (nextIdx < 0) nextIdx = imageViewerPhotos.length - 1;
      if (imageViewerPhotos[nextIdx]) {
        selectPhoto(imageViewerPhotos[nextIdx].id);
      }
      showImageViewerSlide(nextIdx);
    });

    var nextBtn = document.getElementById('image-viewer-next');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (imageViewerPhotos.length <= 1) return;
      var nextIdx = imageViewerIndex + 1;
      if (nextIdx >= imageViewerPhotos.length) nextIdx = 0;
      if (imageViewerPhotos[nextIdx]) {
        selectPhoto(imageViewerPhotos[nextIdx].id);
      }
      showImageViewerSlide(nextIdx);
    });

    // 키보드 방향키 슬라이딩 및 ESC 닫기 연동
    window.addEventListener('keydown', function (e) {
      var viewer = getEl('image-viewer-modal');
      if (!viewer || !viewer.classList.contains('active')) return;

      if (e.key === 'Escape') {
        closeImageViewer();
      } else if (e.key === 'ArrowLeft') {
        if (imageViewerPhotos.length <= 1) return;
        var nextIdx = imageViewerIndex - 1;
        if (nextIdx < 0) nextIdx = imageViewerPhotos.length - 1;
        if (imageViewerPhotos[nextIdx]) selectPhoto(imageViewerPhotos[nextIdx].id);
        showImageViewerSlide(nextIdx);
      } else if (e.key === 'ArrowRight') {
        if (imageViewerPhotos.length <= 1) return;
        var nextIdx = imageViewerIndex + 1;
        if (nextIdx >= imageViewerPhotos.length) nextIdx = 0;
        if (imageViewerPhotos[nextIdx]) selectPhoto(imageViewerPhotos[nextIdx].id);
        showImageViewerSlide(nextIdx);
      }
    });

    // 메모 입력 시 사진 뷰어 내 속성 정보 실시간 갱신 연동
    var memoEl = getEl('photo-memo');
    if (memoEl) {
      memoEl.addEventListener('input', updateFloatingWindowSpecs);
      // 메모창에도 이전에 입력했던 다빈도 메모 목록 10개 실시간 드롭다운 연동
      setupCustomDropdown(memoEl, null, getMemoSuggestions);
    }

    // [신규] 사진 뷰어 내 저장 버튼 클릭 이벤트 연동
    var winSaveBtn = document.getElementById('window-save-btn');
    if (winSaveBtn) {
      winSaveBtn.addEventListener('click', async function () {
        await saveCurrentPhoto();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewerAndInspectEvents);
  } else {
    initViewerAndInspectEvents();
  }

  // -------------------------------------------------------------
  // [신규] 참조 파일 및 사이드바 양방향 검색 기능 로직
  // -------------------------------------------------------------
  async function handleReferenceFiles(filesList) {
    if (!filesList || filesList.length === 0) return;
    showLoading(true, '참조 데이터 분석 및 단어 학습 중...');

    var loadCount = 0;

    for (var i = 0; i < filesList.length; i++) {
      var file = filesList[i];
      try {
        var text = await file.text();
        var data = JSON.parse(text);
        
        // 1) texts 기반 제원 파싱 및 referenceDictionary 누적
        if (data.texts) {
          data.texts.forEach(function (t) {
            var parseResult = deserializeSpecText(t.text, t.layer);
            if (parseResult && parseResult.facilityType && parseResult.values) {
              var fType = parseResult.facilityType;
              if (!referenceDictionary[fType]) {
                referenceDictionary[fType] = {};
              }
              // 참조 시설물 종류 빈도 집계
              referenceFacilityCounts[fType] = (referenceFacilityCounts[fType] || 0) + 1;

              for (var fieldId in parseResult.values) {
                var val = String(parseResult.values[fieldId]).trim();
                if (val && val !== '' && val !== '기타') {
                  if (!referenceDictionary[fType][fieldId]) {
                    referenceDictionary[fType][fieldId] = {};
                  }
                  referenceDictionary[fType][fieldId][val] = (referenceDictionary[fType][fieldId][val] || 0) + 1;
                }
              }
            }
          });
        }

        // 2) photos.memo 기반 referenceMemoSuggestions 누적
        if (data.photos) {
          data.photos.forEach(function (p) {
            var isGeneral = !p.facilityType || p.facilityType === '일반사진';
            if (isGeneral && p.memo && String(p.memo).trim() !== '') {
              var val = String(p.memo).trim();
              referenceMemoSuggestions[val] = (referenceMemoSuggestions[val] || 0) + 1;
            }
            // 텍스트 제원이 없이 사진 정보만 있는 경우에도 드롭다운 목록에 포함되도록 0으로 등록
            if (p.facilityType && p.facilityType !== '일반사진') {
              if (referenceFacilityCounts[p.facilityType] === undefined) {
                referenceFacilityCounts[p.facilityType] = 0;
              }
            }
          });
        }

        loadCount++;
      } catch (err) {
        console.error(file.name + ' 참조 파싱 실패:', err);
      }
    }

    showLoading(false);
    alert(loadCount + '개의 참조 파일로부터 제원 단어를 학습하여 사전에 등록하였습니다.');

    // 시설물 종류 드롭다운 갱신
    updateFacilitySelectOptions();

    // 현재 열려 있는 속성 카드가 있다면 드롭다운 자동완성을 갱신하기 위해 selectPhoto를 다시 호출하여 화면 갱신
    if (selectedPhotoId) {
      selectPhoto(selectedPhotoId);
    }
  }

  // =========================================================================
  // ★ [방안 B] 시설물 전수 검수 & 도면 텍스트 단독 전개 & 제원 단어 검색 엔진
  // =========================================================================
  var inspectSearchQuery = '';          // 검색어 (시설물명 또는 제원 특정 단어)
  var inspectActiveFacility = '';       // 드롭다운 선택 시설물명
  var inspectCurrentPhotoList = [];     // 현재 필터링된 사진 객체 목록
  var inspectCurrentIndex = -1;         // 순차 탐색용 현재 인덱스
  var inspectGridSort = { col: null, dir: 'asc' }; // 엑셀 그리드 정렬 상태 ({ col: 'num'|'gubun'|..., dir: 'asc'|'desc' })
  var inspectGridFilters = {};                     // 엑셀 그리드 열별 필터 상태 ({ colKey: 'keyword' })

  // =========================================================================
  // [작업 되돌리기 (Undo / Redo) 시스템: 표준 단축키 Ctrl+Z, Ctrl+Y 지원]
  // =========================================================================
  var undoStack = [];
  var redoStack = [];
  var MAX_UNDO_STACK = 30;
  var isUndoRedoRunning = false;

  /** 현재 메타데이터(사진 및 텍스트) 상태를 JSON 스냅샷 문자열로 캡처 */
  function createMetadataSnapshot() {
    if (!metadata || !metadata.photos) return null;
    return JSON.stringify({
      photos: metadata.photos || [],
      texts: metadata.texts || []
    });
  }

  /** 변경 작업이 일어나기 직전 현재 상태를 undo 스택에 안전하게 보관 */
  function recordUndoSnapshot() {
    if (isUndoRedoRunning || !metadata || !metadata.photos) return;
    var snap = createMetadataSnapshot();
    if (!snap) return;

    // 직전 스냅샷과 완전히 일치하면 중복 저장 방지
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === snap) {
      return;
    }

    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO_STACK) {
      undoStack.shift();
    }
    // 새로운 작업 발생 시 redo 스택은 초기화
    redoStack = [];
  }

  /** 화면 하단 중앙에 은은한 실행 취소/다시 실행 알림 토스트 표시 */
  function showUndoToast(msg, customColor) {
    var toast = document.getElementById('inspect-undo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'inspect-undo-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '28px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.background = 'rgba(15, 23, 42, 0.95)';
      toast.style.border = '1px solid rgba(99, 102, 241, 0.4)';
      toast.style.borderRadius = '20px';
      toast.style.padding = '8px 18px';
      toast.style.fontSize = '12px';
      toast.style.fontWeight = '600';
      toast.style.color = '#e0e7ff';
      toast.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)';
      toast.style.zIndex = '999999';
      toast.style.pointerEvents = 'none';
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.color = customColor || '#e0e7ff';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    if (window._undoToastTimer) clearTimeout(window._undoToastTimer);
    window._undoToastTimer = setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, 1500);
  }

  /** 스냅샷으로부터 메타데이터 상태를 복원하고 화면/도면을 실시간 동기화 */
  async function applyMetadataSnapshot(snapshotStr) {
    if (!snapshotStr || !metadata) return;
    try {
      var data = JSON.parse(snapshotStr);
      metadata.photos = data.photos;
      metadata.texts = data.texts;

      // 1. 텍스트-사진 검수 상태 정규화
      normalizePhotoSpecsEditedState();

      // 2. 도면 마커 및 레이블 갱신
      var curZoom = map ? map.getZoom() : 18;
      if (curZoom <= 18) {
        recalculateClusters();
      } else {
        restoreIndividualMarkers();
      }
      updateMarkerModeOnMap();
      updateLabelsOnMap();
      overlays.forEach(function (o) { o.draw(); });

      // 3. 검수 표 및 상태 카운트 갱신
      renderInspectList();
      updateInspectFacilityOptions();
      updateInspectStatusCounts();

      // 4. 현재 선택된 사진 패널/플로팅 창 갱신
      if (selectedPhotoId) {
        updateFloatingWindowSpecs(selectedPhotoId);
        var currentP = metadata.photos.find(function (p) { return p.id === selectedPhotoId; });
        if (currentP && typeof populateDetailPanel === 'function') {
          populateDetailPanel(currentP);
        }
      }

      // 5. 로컬 폴더 파일 자동 저장
      if (typeof saveMetadataToLocalFolder === 'function') {
        try {
          await saveMetadataToLocalFolder(metadata);
        } catch (err) {
          console.warn('Undo 복원 자동 저장 실패:', err);
        }
      }
    } catch (e) {
      console.error('스냅샷 복원 오류:', e);
    }
  }

  /** 실행 취소 / 되돌리기 (Ctrl+Z) */
  async function performUndo() {
    if (undoStack.length === 0) {
      showUndoToast('더 이상 되돌릴 작업이 없습니다.', '#94a3b8');
      return;
    }
    isUndoRedoRunning = true;
    try {
      var currentSnap = createMetadataSnapshot();
      var prevSnap = undoStack.pop();
      if (currentSnap) {
        redoStack.push(currentSnap);
        if (redoStack.length > MAX_UNDO_STACK) redoStack.shift();
      }
      await applyMetadataSnapshot(prevSnap);
      showUndoToast('↩️ 작업이 되돌려졌습니다. (Ctrl+Z)');
    } finally {
      isUndoRedoRunning = false;
    }
  }

  /** 다시 실행 (Ctrl+Y 또는 Ctrl+Shift+Z) */
  async function performRedo() {
    if (redoStack.length === 0) {
      showUndoToast('다시 실행할 작업이 없습니다.', '#94a3b8');
      return;
    }
    isUndoRedoRunning = true;
    try {
      var currentSnap = createMetadataSnapshot();
      var nextSnap = redoStack.pop();
      if (currentSnap) {
        undoStack.push(currentSnap);
        if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();
      }
      await applyMetadataSnapshot(nextSnap);
      showUndoToast('↪️ 다시 실행되었습니다. (Ctrl+Y)');
    } finally {
      isUndoRedoRunning = false;
    }
  }

  // Ctrl+Z 및 Ctrl+Y 전역 단축키 바인딩
  document.addEventListener('keydown', function (e) {
    var isCtrl = e.ctrlKey || e.metaKey;
    if (!isCtrl) return;

    var key = (e.key || '').toLowerCase();

    // Ctrl + Z (Shift 없이) : Undo
    if (key === 'z' && !e.shiftKey) {
      var act = document.activeElement;
      // 검색창 안에서 타이핑 중일 때는 브라우저 기본 텍스트 취소 허용
      if (act && act.id === 'inspect-search-input') return;
      e.preventDefault();
      performUndo();
    }
    // Ctrl + Y 또는 Ctrl + Shift + Z : Redo
    else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      var act = document.activeElement;
      if (act && act.id === 'inspect-search-input') return;
      e.preventDefault();
      performRedo();
    }
  });

  /** 사진 객체에 연관된 모든 시설물 종류 배열 반환 */
  function getPhotoFacilityTypes(photo) {
    if (!photo) return [];
    var types = new Set();

    // 1) 사진 객체 자체의 facilityType
    if (photo.facilityType && photo.facilityType !== '일반사진') {
      types.add(photo.facilityType);
    }
    // 2) additionalTypes (부속시설물)
    if (photo.additionalTypes && Array.isArray(photo.additionalTypes)) {
      photo.additionalTypes.forEach(function (t) {
        if (t && t !== '일반사진') types.add(t);
      });
    }
    // 3) 도면 텍스트(specTextIds)의 파싱 결과
    var tIds = photo.specTextIds || [];
    if (tIds.length === 0 && photo.specTextId) {
      tIds = [photo.specTextId];
    }
    if (metadata && metadata.texts && tIds.length > 0) {
      tIds.forEach(function (tid) {
        var tObj = metadata.texts.find(function (t) { return t.id === tid; });
        if (tObj && tObj.text) {
          var parsed = deserializeSpecText(tObj.text, tObj.layer);
          if (parsed && parsed.facilityType) {
            types.add(parsed.facilityType);
          }
        }
      });
    }

    return Array.from(types);
  }

  /** 사진에 연관된 모든 제원 문자열 배열 반환 (단어 검색용) */
  function getPhotoAllSpecTexts(photo) {
    if (!photo) return [];
    var texts = [];

    var tIds = photo.specTextIds || [];
    if (tIds.length === 0 && photo.specTextId) {
      tIds = [photo.specTextId];
    }
    if (metadata && metadata.texts && tIds.length > 0) {
      tIds.forEach(function (tid) {
        var tObj = metadata.texts.find(function (t) { return t.id === tid; });
        if (tObj && tObj.text) {
          texts.push(tObj.text);
        }
      });
    }

    if (texts.length === 0 && photo.facilityType && photo.facilityType !== '일반사진') {
      texts.push(photo.facilityType);
    }
    return texts;
  }

  /** 사진의 대표 제원 텍스트 문자열 가져오기 */
  function getPhotoSpecStringForDisplay(photo, targetFacilityType) {
    if (!photo) return '';
    var allSpecs = getPhotoAllSpecTexts(photo);
    if (targetFacilityType) {
      var filtered = allSpecs.filter(function (s) {
        return s.indexOf(targetFacilityType) !== -1;
      });
      if (filtered.length > 0) return filtered.join(' / ');
    }
    if (allSpecs.length > 0) return allSpecs.join(' / ');
    return photo.facilityType || '속성 미입력';
  }

  /** HTML 내 검색어 하이라이트 헬퍼 */
  function highlightKeywordInHtml(str, keyword) {
    if (!str) return '';
    if (!keyword || !keyword.trim()) return str;
    var k = keyword.trim();
    var escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escaped + ')', 'gi');
    return str.replace(regex, '<span style="color:#fbbf24; font-weight:bold; background:rgba(245,158,11,0.25); padding:0 2px; border-radius:2px;">$1</span>');
  }

  /** [방안 1 핵심] 검색 조건(시설물명 또는 특정 단어)과 일치하는 제원 텍스트만 단독 추출 */
  function getPhotoMatchedSpecTexts(photo) {
    if (!photo) return [];
    var allSpecs = getPhotoAllSpecTexts(photo);
    if (!isInspectFilterActive()) return allSpecs;

    var q = (inspectSearchQuery || '').trim().toLowerCase();
    var f = (inspectActiveFacility || '').trim().toLowerCase();
    var matched = [];

    // 1. metadata.texts 안의 개별 spec 텍스트 객체 검사
    var tIds = photo.specTextIds || [];
    if (tIds.length === 0 && photo.specTextId) {
      tIds = [photo.specTextId];
    }

    if (metadata && metadata.texts && tIds.length > 0) {
      tIds.forEach(function (tid) {
        var tObj = metadata.texts.find(function (t) { return t.id === tid; });
        if (!tObj || !tObj.text) return;
        var txt = tObj.text;
        var layer = tObj.layer || '';

        var isMatch = false;
        if (q) {
          // 1) 텍스트 본문에 검색어가 포함되어 있는가? (예: 'LED', '흄관', '가로등')
          if (txt.toLowerCase().indexOf(q) !== -1) {
            isMatch = true;
          }
          // 2) 레이어명에 검색어가 포함되어 있는가? (예: '가로등_T' 에서 '가로등' 검색)
          else if (layer.toLowerCase().indexOf(q) !== -1) {
            isMatch = true;
          }
          // 3) photo.facilityType이나 추가속성이 q와 일치하면서 해당 제원과 부합하는가?
          else if (photo.facilityType && photo.facilityType.toLowerCase().indexOf(q) !== -1) {
            if (layer.toLowerCase().indexOf(photo.facilityType.toLowerCase()) !== -1 || txt.toLowerCase().indexOf(photo.facilityType.toLowerCase()) !== -1) {
              isMatch = true;
            }
          }
        } else if (f) {
          // 시설물 드롭다운 선택 시: 텍스트 또는 레이어에 시설물명이 포함되어 있는가?
          if (txt.toLowerCase().indexOf(f) !== -1 || layer.toLowerCase().indexOf(f) !== -1) {
            isMatch = true;
          }
        }

        if (isMatch && matched.indexOf(txt) === -1) {
          matched.push(txt);
        }
      });
    }

    // 2. 만약 tIds로 매칭되지 않았지만 allSpecs 자체에 문자열이 있고 매칭되는 경우
    if (matched.length === 0 && allSpecs.length > 0) {
      var targetWord = q || f;
      if (targetWord) {
        allSpecs.forEach(function (s) {
          if (s.toLowerCase().indexOf(targetWord) !== -1 && matched.indexOf(s) === -1) {
            matched.push(s);
          }
        });
      }
    }

    // 3. 만약 검색어가 메모, 사진 번호, 파일명 등에 매칭되어 사진 자체는 검색되었으나
    // 제원 텍스트에는 검색어가 없는 경우 (예: '#3' 검색 또는 메모 '파손' 검색)
    if (matched.length === 0) {
      matched = allSpecs;
    }

    return matched;
  }

  /** 현재 필터링(검색어 입력 또는 시설물 선택)이 활성화되어 있는지 여부 */
  function isInspectFilterActive() {
    return (inspectSearchQuery && inspectSearchQuery.trim() !== '') || (inspectActiveFacility && inspectActiveFacility.trim() !== '');
  }

  /** 사진이 현재 검색 조건(시설물명 또는 특정 단어)과 일치하는지 판별 */
  function isPhotoMatchedInspectFilter(photo) {
    if (!photo) return false;

    // 1. 자유 단어 검색어가 입력된 경우
    if (inspectSearchQuery && inspectSearchQuery.trim() !== '') {
      var q = inspectSearchQuery.trim().toLowerCase();

      // [사용자 요구사항] 오직 '@미검수'로 검색했을 때만 미검수 항목 전수 모드 작동!
      if (q === '@미검수') {
        return !isPhotoAllSpecsEdited(photo);
      }

      // [사용자 요구사항] 오직 '@완료'로 검색했을 때만 검수 완료 항목 전수 모드 작동!
      if (q === '@완료') {
        return isPhotoAllSpecsEdited(photo);
      }

      // [사용자 요구사항 - 방안 2] 오직 '@사진메모'라고 검색했을 때만 사진 메모 전수 모드 작동! (메모 없는 사진은 완전 제외)
      if (q === '@사진메모') {
        var hasValidMemo = photo.memo && String(photo.memo).trim() !== '' && !isAutoGeneratedMemo(photo.memo);
        return Boolean(hasValidMemo);
      }

      // [사용자 요구사항] 오직 '@일반사진'으로 검색했을 때만 시설물 미지정 일반사진 전수 모드 작동!
      if (q === '@일반사진') {
        if (photo.isTextOnly === true) return false;
        var fTypes = getPhotoFacilityTypes(photo).filter(function (t) {
          return t && t !== '일반사진' && t !== '속성 미입력';
        });
        if (fTypes.length > 0) return false;
        return true;
      }

      // [사용자 요구사항 - 방안 2] 오직 '@글자만'으로 검색했을 때만 사진 없는 제원 시설물 전수 모드 작동!
      if (q === '@글자만') {
        var isNoPhoto = (photo.isTextOnly === true || !photo.fileName || photo.fileName.trim() === '');
        return Boolean(isNoPhoto);
      }

      // 1-1) 시설물명 검사
      if (photo.facilityType && photo.facilityType.toLowerCase().indexOf(q) !== -1) return true;
      if (photo.additionalTypes && Array.isArray(photo.additionalTypes)) {
        for (var i = 0; i < photo.additionalTypes.length; i++) {
          if (photo.additionalTypes[i].toLowerCase().indexOf(q) !== -1) return true;
        }
      }

      // 1-2) 전체 제원 텍스트 검사 (예: 'LED', '흄관', '10.0', '주정차금지' 등)
      var specTexts = getPhotoAllSpecTexts(photo);
      for (var sIdx = 0; sIdx < specTexts.length; sIdx++) {
        if (specTexts[sIdx].toLowerCase().indexOf(q) !== -1) return true;
      }

      // ※ [사용자 요구사항] 일반 텍스트 검색 시에는 사진 메모를 절대 검색하지 않음! (오염 방지)

      // 1-3) 사진 번호 검사 (#1, 1 등)
      if (metadata && metadata.texts && photo.numTextId) {
        var numObj = metadata.texts.find(function (t) { return t.id === photo.numTextId; });
        if (numObj && numObj.text) {
          if (('#' + numObj.text).toLowerCase().indexOf(q) !== -1) return true;
          if (numObj.text.toLowerCase().indexOf(q) !== -1) return true;
        }
      }

      // 1-4) 사진 파일명 검사
      if (photo.fileName && photo.fileName.toLowerCase().indexOf(q) !== -1) return true;

      return false;
    }

    // 2. 단어 검색어 없이 시설물 드롭다운만 선택된 경우
    if (inspectActiveFacility && inspectActiveFacility.trim() !== '') {
      var fTypes = getPhotoFacilityTypes(photo);
      return fTypes.indexOf(inspectActiveFacility) !== -1;
    }

    // 3. 필터가 비어 있으면 전체 일치
    return true;
  }

  /** 사진의 제원이 올바르게 입력 완료되었는지 판별 */
  function isPhotoSpecCompleted(photo) {
    if (photo.edited === true) return true;
    var allSpecs = getPhotoAllSpecTexts(photo);
    if (allSpecs.length === 0) return false;
    var first = allSpecs[0].trim();
    if (first === '' || first === '속성 미입력' || first === '일반사진') return false;
    return true;
  }

  /** 검수용 시설물 현황 배지 및 목록 갱신 */
  function updateInspectFacilityOptions() {
    var select = document.getElementById('inspect-facility-select');
    var badge = document.getElementById('inspect-total-badge');

    if (!metadata || !metadata.photos || metadata.photos.length === 0) {
      if (select) {
        select.innerHTML = '<option value="">데이터가 없습니다</option>';
        select.disabled = true;
      }
      if (badge) badge.textContent = '도면 내 0개 시설물';
      return;
    }

    // 전체 사진 스캔하여 시설물별 건수 집계
    var facilityCounts = {};
    metadata.photos.forEach(function (p) {
      var fTypes = getPhotoFacilityTypes(p);
      fTypes.forEach(function (ft) {
        facilityCounts[ft] = (facilityCounts[ft] || 0) + 1;
      });
    });

    var keys = Object.keys(facilityCounts);
    keys.sort(function (a, b) {
      return facilityCounts[b] - facilityCounts[a]; // 건수 많은 순 정렬
    });

    if (badge) {
      badge.textContent = '도면 내 ' + keys.length + '개 시설물 (' + metadata.photos.length + '장)';
    }

    if (select) {
      select.disabled = false;
      var prevSelected = inspectActiveFacility || select.value;
      select.innerHTML = '';

      var defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '시설물 종류별 빠른 선택 (' + keys.length + '종류)...';
      select.appendChild(defaultOpt);

      keys.forEach(function (key) {
        var opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key + ' (' + facilityCounts[key] + '건)';
        if (key === prevSelected) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
    }

    // 만약 이미 검색 조건이 활성화되어 있다면 목록 갱신
    if (isInspectFilterActive()) {
      renderInspectList();
    }
    updateInspectStatusCounts();
  }

  /** 시설물 전수 검수 상단 상태 배지(전체, 미검수, 완료) 건수 계산 및 동기화 */
  function updateInspectStatusCounts() {
    var btnAll = document.getElementById('inspect-filter-all');
    var btnPending = document.getElementById('inspect-filter-pending');
    var btnDone = document.getElementById('inspect-filter-done');
    if (!btnAll || !btnPending || !btnDone) return;

    if (!metadata || !metadata.photos || metadata.photos.length === 0) {
      btnAll.textContent = '전체 0';
      btnPending.textContent = '🚨 미검수 0';
      btnDone.textContent = '✅ 완료 0';
      return;
    }

    var totalCount = metadata.photos.length;
    var doneCount = 0;
    var pendingCount = 0;

    metadata.photos.forEach(function (p) {
      if (isPhotoAllSpecsEdited(p)) {
        doneCount++;
      } else {
        pendingCount++;
      }
    });

    btnAll.textContent = '전체 ' + totalCount;
    btnPending.textContent = '🚨 미검수 ' + pendingCount;
    btnDone.textContent = '✅ 완료 ' + doneCount;

    // 현재 검색어에 따라 active 클래스 동기화
    var q = (inspectSearchQuery || '').trim().toLowerCase();
    btnAll.classList.remove('active');
    btnPending.classList.remove('active');
    btnDone.classList.remove('active');

    if (q === '@미검수') {
      btnPending.classList.add('active');
    } else if (q === '@완료') {
      btnDone.classList.add('active');
    } else {
      btnAll.classList.add('active');
    }
  }

  /** DOM 기반 그리드 필터링: 테이블 전체를 재생성하지 않고 행들만 display 토글 (한글 자모 분리 완벽 방지) */
  function applyGridDomFilter(targetTable) {
    if (!targetTable) return;
    var rows = targetTable.querySelectorAll('tbody tr');
    var visibleCount = 0;
    rows.forEach(function (tr) {
      var isVisible = true;
      for (var colKey in inspectGridFilters) {
        var filterVal = (inspectGridFilters[colKey] || '').trim().toLowerCase();
        if (!filterVal) continue;
        var cell = tr.querySelector('[data-col-key="' + colKey + '"]');
        var text = cell ? (cell.getAttribute('data-cell-value') || cell.textContent || '').trim().toLowerCase() : '';
        if (text.indexOf(filterVal) === -1) {
          isVisible = false;
          break;
        }
      }
      tr.style.display = isVisible ? '' : 'none';
      if (isVisible) visibleCount++;
    });
    updateInspectSearchCountBadge(visibleCount, rows.length);
  }

  /** 검색창 내부 우측의 검색 건수 스마트 배지 갱신 (방안 1) */
  function updateInspectSearchCountBadge(currentCount, totalRowCount, photoCount) {
    var badge = document.getElementById('inspect-search-count');
    if (!badge) return;

    if (!isInspectFilterActive()) {
      badge.style.display = 'none';
      return;
    }

    badge.style.display = 'inline-block';

    var cur = (currentCount !== undefined && currentCount !== null) ? currentCount : 0;
    var tot = (totalRowCount !== undefined && totalRowCount !== null) ? totalRowCount : cur;

    if (cur !== tot) {
      badge.textContent = cur + ' / ' + tot + '건';
      badge.title = '열별 필터 적용: 전체 ' + tot + '건 중 ' + cur + '건 표시 중';
    } else {
      badge.textContent = cur + '건';
      var photoInfo = (photoCount !== undefined && photoCount !== null) ? (' (사진 ' + photoCount + '장)') : '';
      badge.title = '검색 결과: 총 ' + cur + '건' + photoInfo;
    }

    if (cur === 0) {
      badge.style.background = 'rgba(239, 68, 68, 0.2)';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      badge.style.color = '#fca5a5';
    } else {
      badge.style.background = 'rgba(99, 102, 241, 0.25)';
      badge.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      badge.style.color = '#a5b4fc';
    }
  }

  /** CAD 제원 텍스트 객체가 현재 검색어 또는 활성 시설물과 일치하는지 판별 */
  function isSpecTextMatchedInspectQuery(txtObj, photo) {
    if (!txtObj || !txtObj.text) return false;
    if (!isInspectFilterActive()) return true;

    var q = (inspectSearchQuery || '').trim().toLowerCase();
    var f = (inspectActiveFacility || '').trim().toLowerCase();
    var raw = txtObj.text;
    var layer = txtObj.layer || '';
    var parsed = deserializeSpecText(raw, layer);
    var fType = (parsed && parsed.facilityType) || txtObj.facilityType || '';

    if (q) {
      if (q === '@사진메모' || q === '@글자만' || q === '@일반사진' || q === '@미검수' || q === '@완료') return true;
      if (raw.toLowerCase().indexOf(q) !== -1) return true;
      if (layer.toLowerCase().indexOf(q) !== -1) return true;
      if (fType && fType.toLowerCase().indexOf(q) !== -1) return true;
      return false;
    }

    if (f) {
      if (fType && fType.toLowerCase() === f) return true;
      if (layer.toLowerCase().indexOf(f) !== -1) return true;
      if (raw.toLowerCase().indexOf(f) !== -1) return true;
      return false;
    }

    return true;
  }

  /** 검색 조건에 따른 검수 엑셀 그리드(Grid Table) 렌더링 및 도면 실시간 동기화 */
  function renderInspectList() {
    var container = document.getElementById('inspect-items-container');
    var placeholder = document.getElementById('inspect-placeholder');
    var statsBar = document.getElementById('inspect-stats-bar');
    if (!container || !placeholder) return;

    container.innerHTML = '';
    inspectCurrentPhotoList = [];
    inspectCurrentIndex = -1;
    // [사용자 요구사항] 새로운 검색 시 이전 열별 필터 잔상 자동 초기화
    inspectGridFilters = {};
    updateInspectStatusCounts();

    // 검색 조건이 전혀 없는 경우: 전체 안내 문구 노출 및 도면 복원
    if (!isInspectFilterActive() || !metadata || !metadata.photos) {
      updateInspectSearchCountBadge(0);
      placeholder.style.display = 'block';
      placeholder.innerHTML = '상단 검색창에 <strong>시설물명</strong>(예: 가로등, 배수관, 기타표지)이나<br><strong>특정 제원 단어</strong>(예: LED, 흄관, 10.0)를 입력해 보세요.<br><span style="font-size: 11px; color: #a5b4fc; display: block; margin-top: 6px;">💡 특수 전수검수: <strong>@미검수</strong> (미검수 전수), <strong>@일반사진</strong> (일반사진 전수), <strong>@사진메모</strong> (메모 전수), <strong>@글자만</strong> (사진없는 제원 전수)</span><br><span style="font-size: 11px; color: rgba(99, 102, 241, 0.8); display: block; margin-top: 4px;">※ 검색된 시설물만 도면에 <strong>캐드 제원 문자</strong>로 자동 전개됩니다.</span>';
      if (statsBar) statsBar.style.display = 'none';

      // 도면 전체 마커 원래대로 복원
      var curZoom = map ? map.getZoom() : 18;
      if (curZoom <= 18) {
        recalculateClusters();
      } else {
        restoreIndividualMarkers();
      }
      updateMarkerModeOnMap();
      updateLabelsOnMap();
      overlays.forEach(function (o) { o.draw(); });
      return;
    }

    // 검색 조건과 일치하는 사진들 필터링
    var matchedPhotos = metadata.photos.filter(function (p) {
      return isPhotoMatchedInspectFilter(p);
    });

    inspectCurrentPhotoList = matchedPhotos;

    var filterTitle = '';
    if (inspectSearchQuery && inspectSearchQuery.trim() !== '') {
      filterTitle = '검색: "' + inspectSearchQuery.trim() + '"';
    } else {
      filterTitle = '시설물: ' + inspectActiveFacility;
    }

    if (matchedPhotos.length === 0) {
      updateInspectSearchCountBadge(0, 0, 0);
      placeholder.style.display = 'block';
      placeholder.textContent = filterTitle + ' 조건에 일치하는 시설물/제원이 도면에 없습니다.';
      if (statsBar) statsBar.style.display = 'none';

      // 도면 마커 갱신 (모두 숨김)
      updateMarkerModeOnMap();
      updateLabelsOnMap();
      overlays.forEach(function (o) { o.draw(); });
      return;
    }

    placeholder.style.display = 'none';
    if (statsBar) statsBar.style.display = 'none';

    // 1. 매칭된 사진들로부터 테이블 행(Row) 데이터 모델 구성 (단독 제원 텍스트 단위 필터링!)
    var allRows = [];
    matchedPhotos.forEach(function (p, pIdx) {
      var numStr = '';
      var numSortVal = 999999;
      if (metadata.texts && p.numTextId) {
        var nObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
        if (nObj && nObj.text) {
          numStr = '#' + nObj.text;
          var numParsed = parseInt(nObj.text.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(numParsed)) numSortVal = numParsed;
        }
      }
      if (!numStr) {
        numStr = '-';
        numSortVal = 999999;
      }

      // 사진에 연결된 CAD 텍스트들 수집
      var tIds = p.specTextIds || [];
      if (tIds.length === 0 && p.specTextId) {
        tIds = [p.specTextId];
      }

      var linkedTexts = [];
      if (metadata.texts && tIds.length > 0) {
        tIds.forEach(function (tid) {
          var t = metadata.texts.find(function (x) { return x.id === tid; });
          if (t && t.text) linkedTexts.push(t);
        });
      }

      if (linkedTexts.length > 0) {
        // [방안 1 핵심] 검색 조건(시설물명/단어)과 정확히 일치하는 텍스트만 선별!
        var targetTexts = linkedTexts.filter(function (t) {
          var curQ = (inspectSearchQuery || '').trim().toLowerCase();
          if (curQ === '@미검수') return !isTextSpecEdited(t, p);
          if (curQ === '@완료') return isTextSpecEdited(t, p);
          return isSpecTextMatchedInspectQuery(t, p);
        });

        // 만약 검색어가 사진 메모/번호 등에 매칭되어 사진은 검색되었으나
        // 텍스트 매칭이 특정되지 않은 경우 전체 세트 사용
        if (targetTexts.length === 0) {
          var curQ = (inspectSearchQuery || '').trim().toLowerCase();
          if (curQ === '@미검수' || curQ === '@완료') {
            targetTexts = [];
          } else {
            targetTexts = linkedTexts;
          }
        }

        // [사용자 요청] 해당 사진에 '가로등'이 함께 묶여 있는지 (부시설물, CAD 텍스트, 사진 속성 등 모든 경로) 전수 조사
        var photoHasStreetlight = false;
        if (linkedTexts && linkedTexts.length > 0) {
          photoHasStreetlight = linkedTexts.some(function (lt) {
            var ltRaw = (lt.text || '').trim();
            var ltLayer = (lt.layer || '').trim();
            var ltParsed = deserializeSpecText(ltRaw, ltLayer);
            var ltFac = (ltParsed && ltParsed.facilityType) || '';
            return ltFac === '가로등' || 
                   ltRaw.includes('가로등') || 
                   ltLayer.includes('가로등') || 
                   ltLayer.includes('STREETLIGHT') ||
                   ltLayer.includes('LIGHT');
          });
        }
        if (!photoHasStreetlight && p) {
          if (p.facilityType && p.facilityType.includes('가로등')) photoHasStreetlight = true;
          if (Array.isArray(p.subFacilities)) {
            photoHasStreetlight = p.subFacilities.some(function (sf) {
              var s = typeof sf === 'string' ? sf : (sf.type || sf.name || sf.facilityType || '');
              return s.includes('가로등');
            });
          }
        }

        targetTexts.forEach(function (txtObj) {
          var raw = txtObj.text || '';
          var parsed = deserializeSpecText(raw, txtObj.layer);
          var parts = raw.split('/');
          var rawPrefix = (parts[0] || '').trim();
          var isSub = rawPrefix.startsWith('+') || (parsed && parsed.isSub === true) || (txtObj !== linkedTexts[0]);
          var fType = (parsed && parsed.facilityType) || p.facilityType || '시설물';
          var specParts = parts.slice(1);

          // 이 행의 시설물 자체가 '가로등'인지 여부
          var isCurrentRowStreetlight = fType.includes('가로등') || raw.startsWith('가로등') || raw.startsWith('+가로등');

          // [사용자 요구사항] 가로등이 달린 시설물(가로등 자체를 제외한 시설물)이면 주황색 표시 대상!
          var hasStreetlightAttached = photoHasStreetlight && !isCurrentRowStreetlight;

          // [사용자 요구] 검색한 텍스트가 부시설물이면 구분열에 '주시설물+' 로 표시!
          // 단독이면 '주'
          var gubunStr = '주';
          if (isSub) {
            var mainFacName = p.facilityType;
            if (!mainFacName || mainFacName === '속성 미입력' || mainFacName === '일반사진') {
              if (linkedTexts.length > 0 && linkedTexts[0] !== txtObj) {
                var mRaw = linkedTexts[0].text || '';
                var mParsed = deserializeSpecText(mRaw, linkedTexts[0].layer);
                mainFacName = (mParsed && mParsed.facilityType) || (mRaw.split('/')[0] || '').replace(/^\+/, '').trim();
              }
            }
            if (!mainFacName || mainFacName === fType) mainFacName = '';
            gubunStr = (mainFacName ? mainFacName : '') + '+';
          }

          var photoMemo = (p.memo && !isAutoGeneratedMemo(p.memo)) ? String(p.memo).trim() : '';

          allRows.push({
            photo: p,
            photoId: p.id,
            sourceFile: p.sourceFile || '',
            numStr: numStr,
            numSortVal: numSortVal,
            memo: photoMemo,
            isSub: isSub,
            gubun: gubunStr,
            facilityType: fType,
            hasStreetlightAttached: hasStreetlightAttached,
            txtObj: txtObj,
            prefix: rawPrefix,
            specParts: specParts,
            config: FACILITY_CONFIG[fType] || null,
            rawText: raw
          });
        });
      } else {
        var curQ = (inspectSearchQuery || '').trim().toLowerCase();
        if (curQ === '@미검수' && p.edited === true) return;
        if (curQ === '@완료' && p.edited !== true) return;

        var fType = p.facilityType;
        if (!fType || fType === '속성 미입력') {
          var curQ = (inspectSearchQuery || '').trim().toLowerCase();
          fType = (curQ === '@일반사진') ? '일반사진' : (p.facilityType || '속성 미입력');
        }
        var hasSlAttached = false;
        if (Array.isArray(p.subFacilities) && p.subFacilities.some(function (sf) {
          var s = typeof sf === 'string' ? sf : (sf.type || sf.name || sf.facilityType || '');
          return s.includes('가로등');
        })) {
          hasSlAttached = !fType.includes('가로등');
        }
        var pMemo = (p.memo && !isAutoGeneratedMemo(p.memo)) ? String(p.memo).trim() : '';
        allRows.push({
          photo: p,
          photoId: p.id,
          sourceFile: p.sourceFile || '',
          numStr: numStr,
          numSortVal: numSortVal,
          memo: pMemo,
          isSub: false,
          gubun: '주',
          facilityType: fType,
          hasStreetlightAttached: hasSlAttached,
          txtObj: null,
          prefix: (FACILITY_CONFIG[fType] && FACILITY_CONFIG[fType].prefix) || fType,
          specParts: [],
          config: FACILITY_CONFIG[fType] || null,
          rawText: fType
        });
      }
    });

    // 2. 동적 열(Column Definitions) 결정
    var facilityCounts = {};
    allRows.forEach(function (r) {
      if (r.facilityType && r.facilityType !== '속성 미입력' && r.facilityType !== '일반사진') {
        facilityCounts[r.facilityType] = (facilityCounts[r.facilityType] || 0) + 1;
      }
    });
    var sortedFacKeys = Object.keys(facilityCounts).sort(function (a, b) {
      return facilityCounts[b] - facilityCounts[a];
    });
    var topFacility = sortedFacKeys[0];

    // [사용자 요구사항] '@사진메모', '@일반사진'으로 검색하거나 메모가 입력된 행이 있을 때 [사진메모] 전용 열 배치!
    var isMemoSearch = (inspectSearchQuery || '').trim().toLowerCase() === '@사진메모';
    var isGeneralPhotoSearch = (inspectSearchQuery || '').trim().toLowerCase() === '@일반사진';
    var hasAnyMemo = allRows.some(function (r) { return r.memo && r.memo.trim() !== ''; });

    var colDefs = [
      { key: 'num', label: '사진#', width: '60px', sortable: true }
    ];

    if (isMemoSearch || isGeneralPhotoSearch || hasAnyMemo) {
      colDefs.push({ key: 'memo', label: '사진메모', width: '160px', sortable: true });
    }

    colDefs.push(
      { key: 'gubun', label: '구분', width: '72px', sortable: true },
      { key: 'facility', label: '시설물명', width: '100px', sortable: true }
    );

    var topConfig = topFacility ? FACILITY_CONFIG[topFacility] : null;
    var maxParts = 0;
    allRows.forEach(function (r) {
      if (r.specParts && r.specParts.length > maxParts) maxParts = r.specParts.length;
    });

    if (topConfig && topConfig.fields && topConfig.fields.length > 0) {
      var usableFields = topConfig.fields.filter(function (f) {
        return f.id !== 'name';
      });
      usableFields.forEach(function (f, fIdx) {
        colDefs.push({
          key: 'part_' + fIdx,
          label: f.label || ('제원 ' + (fIdx + 1)),
          partIdx: fIdx,
          isSpecField: true,
          sortable: true
        });
      });
    } else {
      // [사용자 요구사항] 실제 입력된 제원 필드만 표시! (제원 데이터가 없으면 빈 제원 열을 생성하지 않음)
      var displayPartCount = maxParts;
      for (var pi = 0; pi < displayPartCount; pi++) {
        colDefs.push({
          key: 'part_' + pi,
          label: '제원 ' + (pi + 1),
          partIdx: pi,
          isSpecField: true,
          sortable: true
        });
      }
    }

    // [저장] 열 삽입 (사진# 클릭으로 위치 이동 일원화)
    colDefs.push({ key: 'save', label: '저장', width: '52px', sortable: false });

    // 3. 열별 필터링 적용 (초기 로딩 시)
    var displayRows = allRows.filter(function (r) {
      for (var colKey in inspectGridFilters) {
        var fKeyword = (inspectGridFilters[colKey] || '').trim().toLowerCase();
        if (!fKeyword) continue;

        var cellVal = '';
        if (colKey === 'num') {
          cellVal = r.numStr.toLowerCase();
        } else if (colKey === 'memo') {
          cellVal = (r.memo || '').toLowerCase();
        } else if (colKey === 'gubun') {
          cellVal = r.gubun.toLowerCase();
        } else if (colKey === 'facility') {
          cellVal = (r.facilityType || '').toLowerCase();
        } else if (colKey.startsWith('part_')) {
          var pIdx = parseInt(colKey.replace('part_', ''), 10);
          cellVal = (r.specParts[pIdx] || '').toLowerCase();
        }

        if (cellVal.indexOf(fKeyword) === -1) {
          return false;
        }
      }
      return true;
    });

    // 검색창 내부 건수 배지 갱신 (화면 표시 행수, 전체 검색 행수, 매칭 사진수)
    updateInspectSearchCountBadge(displayRows.length, allRows.length, matchedPhotos.length);

    // 4. 헤더 정렬 적용
    if (inspectGridSort.col) {
      var sortKey = inspectGridSort.col;
      var isAsc = inspectGridSort.dir === 'asc';
      displayRows.sort(function (a, b) {
        var comp = 0;
        if (sortKey === 'num') {
          comp = a.numSortVal - b.numSortVal;
        } else if (sortKey === 'memo') {
          comp = (a.memo || '').localeCompare(b.memo || '');
        } else if (sortKey === 'gubun') {
          comp = a.gubun.localeCompare(b.gubun);
        } else if (sortKey === 'facility') {
          comp = (a.facilityType || '').localeCompare(b.facilityType || '');
        } else if (sortKey.startsWith('part_')) {
          var pIdx = parseInt(sortKey.replace('part_', ''), 10);
          var vA = (a.specParts[pIdx] || '').trim();
          var vB = (b.specParts[pIdx] || '').trim();
          comp = vA.localeCompare(vB, undefined, { numeric: true });
        }
        return isAsc ? comp : -comp;
      });
    }

    // 5. 엑셀 그리드 테이블 DOM 생성
    var wrapper = document.createElement('div');
    wrapper.className = 'inspect-grid-wrapper';

    var table = document.createElement('table');
    table.className = 'inspect-grid-table';

    // Thead
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');

    colDefs.forEach(function (col) {
      var th = document.createElement('th');
      if (col.width) th.style.width = col.width;

      if (col.sortable) {
        th.className = 'sortable';
        th.title = '클릭하여 ' + col.label + ' 기준 정렬';

        var titleSpan = document.createElement('span');
        titleSpan.textContent = col.label;
        th.appendChild(titleSpan);

        var sortIcon = document.createElement('span');
        sortIcon.className = 'sort-icon';
        if (inspectGridSort.col === col.key) {
          th.classList.add('sorted');
          sortIcon.textContent = inspectGridSort.dir === 'asc' ? ' ▲' : ' ▼';
        } else {
          sortIcon.textContent = ' ↕';
        }
        th.appendChild(sortIcon);

        th.addEventListener('click', function () {
          if (inspectGridSort.col === col.key) {
            if (inspectGridSort.dir === 'asc') {
              inspectGridSort.dir = 'desc';
            } else {
              inspectGridSort.col = null;
              inspectGridSort.dir = 'asc';
            }
          } else {
            inspectGridSort.col = col.key;
            inspectGridSort.dir = 'asc';
          }
          renderInspectList();
        });
      } else {
        th.textContent = col.label;
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // 필터 행 (헤더 바로 아래 얇은 필터 인풋들: DOM 기반 실시간 필터링으로 한글 자모 분리 완벽 방지)
    var filterRow = document.createElement('tr');
    filterRow.className = 'filter-row';
    colDefs.forEach(function (col) {
      var fth = document.createElement('th');
      if (col.key !== 'save') {
        var fInput = document.createElement('input');
        fInput.type = 'search';
        fInput.placeholder = '필터';
        fInput.setAttribute('data-filter-key', col.key);
        fInput.value = inspectGridFilters[col.key] || '';

        // [클릭/포커스 시 전체 선택] 클릭하여 입력된 값을 즉시 지우거나 덮어쓰기 편하도록 지원
        fInput.addEventListener('focus', function () {
          this.select();
        });
        fInput.addEventListener('click', function () {
          if (this.value) {
            this.select();
          }
        });

        // [입력값 삭제/변경 시 실시간 반영] 백스페이스, 딜리트 등으로 글자를 지우면 즉시 필터 해제 및 행 복원!
        fInput.addEventListener('input', function () {
          var val = (this.value || '').trim();
          if (!val) {
            delete inspectGridFilters[col.key];
          } else {
            inspectGridFilters[col.key] = this.value;
          }
          applyGridDomFilter(table);
        });

        // [브라우저 내장 ✕ 버튼 클릭 시 즉시 비우기]
        fInput.addEventListener('search', function () {
          var val = (this.value || '').trim();
          if (!val) {
            delete inspectGridFilters[col.key];
            applyGridDomFilter(table);
          }
        });

        // [ESC 키 취소 핸들러] 필터 값 초기화 및 전체 행 복원
        fInput.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') {
            this.value = '';
            delete inspectGridFilters[col.key];
            applyGridDomFilter(table);
            this.blur();
          }
        });

        fth.appendChild(fInput);
      } else {
        // [사용자 요청 신규] 저장 열 아래 필터 셀에 [모두저장] 버튼 배치!
        var saveAllBtn = document.createElement('button');
        saveAllBtn.type = 'button';
        saveAllBtn.className = 'grid-save-btn save-all-btn';
        saveAllBtn.textContent = '모두저장';
        saveAllBtn.title = '현재 화면에 표시된 모든 시설물 제원을 메타데이터_수정 파일에 일괄 저장 및 검수 완료';
        saveAllBtn.style.width = '100%';
        saveAllBtn.style.padding = '3px 2px';
        saveAllBtn.style.fontSize = '11px';
        saveAllBtn.style.whiteSpace = 'nowrap';

        saveAllBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          await handleGridSaveAll(displayRows, saveAllBtn, table);
        });
        fth.appendChild(saveAllBtn);
      }
      filterRow.appendChild(fth);
    });
    thead.appendChild(filterRow);
    table.appendChild(thead);

    // Tbody
    var tbody = document.createElement('tbody');
    displayRows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr._rowData = row; // 엑셀 다중 셀 복사/붙여넣기를 위한 행 데이터 바인딩
      if (row.photoId === selectedPhotoId) {
        tr.classList.add('active');
      }

      var srcFile = (row.photo && row.photo.sourceFile) || row.sourceFile || '';
      if (srcFile) {
        tr.title = '출처: ' + srcFile;
      }

      tr.addEventListener('click', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('grid-facility-item')) return;
        selectPhoto(row.photoId);
        panToPhotoLocation(row.photo);
        table.querySelectorAll('tr').forEach(function (tRow) { tRow.classList.remove('active'); });
        tr.classList.add('active');
      });

      colDefs.forEach(function (col) {
        var td = document.createElement('td');
        td.setAttribute('data-col-key', col.key);

        if (col.key === 'num') {
          // 사진번호 열: 클릭 시 해당 도면 위치로 이동 및 마커 활성화
          td.className = 'col-num';
          td.textContent = row.numStr;
          td.setAttribute('data-cell-value', row.numStr);

          var hasActualPhoto = row.photo && row.photo.fileName && row.photo.fileName.trim() !== '' && row.numStr !== '-';
          var srcHint = srcFile ? ('\n[출처: ' + srcFile + ']') : '';

          if (!hasActualPhoto) {
            // 사진이 없는 시설물: 사진창 팝업 없이 도면 텍스트 위치로만 이동
            td.classList.add('no-photo-cell');
            td.style.color = '#94a3b8'; // 차분한 그레이 색상으로 구분
            td.title = '사진 없는 시설물 (클릭하여 도면 텍스트 위치로 이동)' + srcHint;
            td.addEventListener('click', function (e) {
              e.stopPropagation();
              selectPhoto(row.photoId);
              panToPhotoLocation(row.photo);
              table.querySelectorAll('tr').forEach(function (tRow) { tRow.classList.remove('active'); });
              tr.classList.add('active');
            });
          } else {
            td.title = '클릭하여 도면 위치로 이동 및 사진 원본 보기' + srcHint;
            td.addEventListener('click', function (e) {
              e.stopPropagation();
              selectPhoto(row.photoId);
              panToPhotoLocation(row.photo);
              if (typeof openPhotoViewerWithSiblings === 'function') {
                openPhotoViewerWithSiblings(row.photo, [row.photo]);
              }
              table.querySelectorAll('tr').forEach(function (tRow) { tRow.classList.remove('active'); });
              tr.classList.add('active');
            });
          }
        } else if (col.key === 'memo') {
          // 사진메모 열: 현장에서 입력한 메모 내용 인라인 표시 및 실시간 수정
          td.className = 'col-memo grid-editable-cell';
          td.setAttribute('data-cell-value', row.memo || '');
          td.title = row.memo ? ('사진 메모: ' + row.memo) : '';

          var memoInput = document.createElement('input');
          memoInput.type = 'text';
          memoInput.className = 'grid-cell-input grid-memo-input';
          memoInput.value = row.memo || '';
          memoInput.setAttribute('data-photo-id', row.photoId);
          memoInput.placeholder = '메모 입력';
          memoInput.style.color = '#10b981'; // 선명한 에메랄드 초록색
          memoInput.style.fontWeight = '600';

          memoInput.addEventListener('focus', function () {
            this.setAttribute('data-original-value', this.value);
            if (selectedPhotoId !== row.photoId) {
              selectPhoto(row.photoId);
              table.querySelectorAll('tr').forEach(function (tRow) { tRow.classList.remove('active'); });
              tr.classList.add('active');
            }
          });

          memoInput.addEventListener('change', function () {
            recordUndoSnapshot();
            var newM = memoInput.value.trim();
            row.photo.memo = newM;
            row.memo = newM;
            td.setAttribute('data-cell-value', newM);
            var pMemoEl = document.getElementById('photo-memo');
            if (pMemoEl && selectedPhotoId === row.photoId) {
              pMemoEl.value = newM;
            }
            updateFloatingWindowSpecs(row.photoId);
          });

          memoInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
              memoInput.value = memoInput.getAttribute('data-original-value') || '';
              memoInput.blur();
            } else {
              handleGridCellKeyNavigation(e, memoInput, table);
            }
          });

          td.appendChild(memoInput);
        } else if (col.key === 'gubun') {
          td.className = 'col-gubun ' + (row.isSub ? 'is-sub' : 'is-main');
          td.textContent = row.gubun; // 주시설물+ 또는 주
          td.setAttribute('data-cell-value', row.gubun);
        } else if (col.key === 'facility') {
          // [사용자 요청] 시설물명 인라인 편집 (드롭다운 완전 제거: 일반 텍스트 입력창)
          td.className = 'col-facility grid-editable-cell';
          td.setAttribute('data-cell-value', row.facilityType || '');

          var facInput = document.createElement('input');
          facInput.type = 'text';
          facInput.className = 'grid-cell-input grid-facility-input';
          facInput.value = row.facilityType || '';
          facInput.setAttribute('data-photo-id', row.photoId);
          facInput.placeholder = '시설물명';

          // [사용자 요청] 가로등이 달린 시설물명 열의 텍스트에 선명한 주황색(#f97316) 표시!
          if (row.hasStreetlightAttached) {
            td.classList.add('has-streetlight-attached');
            facInput.classList.add('facility-has-streetlight');
            facInput.style.setProperty('color', '#f97316', 'important');
            facInput.style.setProperty('font-weight', '700', 'important');
            facInput.title = '💡 가로등이 함께 설치된(공가된) 복합 지주 시설물입니다.';
          }

          facInput.addEventListener('focus', function () {
            this.setAttribute('data-original-value', this.value);
            if (selectedPhotoId !== row.photoId) {
              selectPhoto(row.photoId);
              table.querySelectorAll('tr').forEach(function (tRow) { tRow.classList.remove('active'); });
              tr.classList.add('active');
            }
          });

          facInput.addEventListener('change', async function () {
            var newVal = (facInput.value || '').trim();
            if (!newVal || newVal === row.facilityType) {
              facInput.value = row.facilityType;
              return;
            }
            recordUndoSnapshot();
            td.setAttribute('data-cell-value', newVal);
            await handleGridFacilityChange(row, newVal, facInput);
          });

          // [ESC 키 취소 핸들러 및 방향키 내비게이션]
          facInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
              facInput.value = facInput.getAttribute('data-original-value') || '';
              facInput.blur();
            } else {
              handleGridCellKeyNavigation(e, facInput, table);
            }
          });

          td.appendChild(facInput);
        } else if (col.isSpecField) {
          // 인라인 입력 셀 (엑셀처럼 바로 타이핑)
          var pIdx = col.partIdx;
          var val = row.specParts[pIdx] || '';
          td.className = 'col-spec grid-editable-cell';
          td.setAttribute('data-cell-value', val);
          td.setAttribute('data-part-idx', pIdx);

          var cellInput = document.createElement('input');
          cellInput.type = 'text';
          cellInput.className = 'grid-cell-input';
          cellInput.value = val;
          cellInput.setAttribute('data-photo-id', row.photoId);
          cellInput.setAttribute('data-part-idx', pIdx);

          cellInput.addEventListener('focus', function () {
            this.setAttribute('data-original-value', this.value);
            if (selectedPhotoId !== row.photoId) {
              selectPhoto(row.photoId);
              table.querySelectorAll('tr').forEach(function (tRow) { tRow.classList.remove('active'); });
              tr.classList.add('active');
            }
          });

          // [방안 1 핵심] 사용자가 키보드로 타이핑하는 즉시 열려 있는 사진창의 캐드 전개 텍스트 실시간 반영!
          cellInput.addEventListener('input', function () {
            updateFloatingSpecsFromGridPreview(row, pIdx, cellInput.value);
          });

          cellInput.addEventListener('change', async function () {
            td.setAttribute('data-cell-value', cellInput.value);
            await handleGridCellChange(row, pIdx, cellInput.value, cellInput);
          });

          // [ESC 키 취소 핸들러 및 방향키 내비게이션]
          cellInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
              cellInput.value = cellInput.getAttribute('data-original-value') || '';
              cellInput.blur();
            } else {
              handleGridCellKeyNavigation(e, cellInput, table);
            }
          });

          td.appendChild(cellInput);
        } else if (col.key === 'save') {
          // [저장] 열: 개별 시설물(텍스트) 검수 완료 및 전체 완료 시 파란 마커 저장 (언제나 '저장' 버튼 유지)
          var isRowEdited = row.txtObj ? isTextSpecEdited(row.txtObj, row.photo) : (row.photo && row.photo.edited === true);
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'grid-save-btn' + (isRowEdited ? ' is-edited' : '');
          saveBtn.textContent = '저장';
          saveBtn.title = isRowEdited ? '저장 완료된 시설물 (클릭 시 재수정 내용 다시 저장)' : '제원 검수 완료 및 메타데이터_수정 저장';

          saveBtn.addEventListener('click', async function (e) {
            e.stopPropagation();
            await handleGridRowSave(row, saveBtn, tr);
          });
          td.appendChild(saveBtn);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    table._colDefs = colDefs; // 엑셀 붙여넣기 시 열 구조 참조용 바인딩
    initGridDragSelection(table); // [방안 3] 엑셀 스타일 다중 셀 드래그 블록 선택 및 복사(Ctrl+C) 초기화
    table.addEventListener('paste', async function (e) {
      await handleGridTablePaste(e, table);
    });
    wrapper.appendChild(table);
    container.appendChild(wrapper);

    // 도면 마커 및 레이블 실시간 동기화 (현재 줌에 맞춰 클러스터링 즉시 재계산)
    var curZoom = map ? map.getZoom() : 18;
    if (curZoom <= 18) {
      recalculateClusters();
    } else {
      restoreIndividualMarkers();
    }
    updateMarkerModeOnMap();
    updateLabelsOnMap();
    overlays.forEach(function (o) { o.draw(); });
  }

  /** 사이드바 좌우 마우스 드래그 조절 (Resizable) 이벤트 초기화 */
  function initSidebarResizer() {
    var resizer = document.getElementById('sidebar-resizer');
    var sidebar = document.querySelector('.sidebar');
    if (!resizer || !sidebar || resizer._isResizerInit) return;
    resizer._isResizerInit = true;

    var isResizing = false;
    var startX = 0;
    var startWidth = 0;

    resizer.addEventListener('mousedown', function (e) {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      resizer.classList.add('is-resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', function (e) {
      if (!isResizing) return;
      var diffX = startX - e.clientX; // 왼쪽으로 끌면 너비 증가
      var newWidth = startWidth + diffX;
      var minW = 380;
      var maxW = Math.max(window.innerWidth - 300, 600);
      if (newWidth < minW) newWidth = minW;
      if (newWidth > maxW) newWidth = maxW;
      sidebar.style.width = newWidth + 'px';
    });

    window.addEventListener('mouseup', function () {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (map && typeof google !== 'undefined') {
          google.maps.event.trigger(map, 'resize');
        }
      }
    });
  }

  /** [방안 3] 엑셀 스타일 다중 셀 드래그 블록 선택 및 복사(Ctrl+C) 엔진 */
  function initGridDragSelection(table) {
    var isDragging = false;
    var startTd = null;

    function clearSelection() {
      table.querySelectorAll('td.grid-cell-selected').forEach(function (td) {
        td.classList.remove('grid-cell-selected');
      });
      table._selectedArea = null;
    }

    function getCellCoords(td) {
      var tr = td.closest('tr');
      if (!tr) return null;
      var tbody = table.querySelector('tbody');
      var visibleTrs = Array.from(tbody.querySelectorAll('tr')).filter(function (r) {
        return r.style.display !== 'none';
      });
      var rIdx = visibleTrs.indexOf(tr);
      if (rIdx === -1) return null;

      var editableCells = Array.from(tr.querySelectorAll('td.grid-editable-cell'));
      var cIdx = editableCells.indexOf(td);
      if (cIdx === -1) return null;

      return { r: rIdx, c: cIdx, tr: tr, td: td, visibleTrs: visibleTrs, editableCells: editableCells };
    }

    function updateSelection(td1, td2) {
      clearSelection();
      var pos1 = getCellCoords(td1);
      var pos2 = getCellCoords(td2);
      if (!pos1 || !pos2) return;

      var minR = Math.min(pos1.r, pos2.r);
      var maxR = Math.max(pos1.r, pos2.r);
      var minC = Math.min(pos1.c, pos2.c);
      var maxC = Math.max(pos1.c, pos2.c);

      var selectedCells = [];
      var visibleTrs = pos1.visibleTrs;

      for (var r = minR; r <= maxR; r++) {
        var curTr = visibleTrs[r];
        if (!curTr) continue;
        var curCells = Array.from(curTr.querySelectorAll('td.grid-editable-cell'));
        for (var c = minC; c <= maxC; c++) {
          if (curCells[c]) {
            curCells[c].classList.add('grid-cell-selected');
            selectedCells.push(curCells[c]);
          }
        }
      }

      table._selectedArea = {
        minR: minR, maxR: maxR,
        minC: minC, maxC: maxC,
        startTd: td1,
        endTd: td2,
        cells: selectedCells
      };
    }

    // 마우스 다운: 블록 선택 시작점
    table.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return; // 좌클릭만
      var td = e.target.closest('td.grid-editable-cell');
      if (!td) {
        if (!e.target.closest('input') && !e.target.closest('button')) {
          clearSelection();
        }
        return;
      }

      isDragging = true;
      startTd = td;
      updateSelection(startTd, startTd);
    });

    // 마우스 무브: 드래그 영역 확장
    table.addEventListener('mousemove', function (e) {
      if (!isDragging || !startTd) return;
      var td = e.target.closest('td.grid-editable-cell');
      if (td && td !== startTd) {
        window.getSelection().removeAllRanges(); // 텍스트 긁힘 방지
        updateSelection(startTd, td);
      }
    });

    // 마우스 업: 드래그 완료
    window.addEventListener('mouseup', function () {
      isDragging = false;
    });

    // 테이블 외부 클릭 시 선택 해제
    document.addEventListener('mousedown', function (e) {
      if (!table.contains(e.target)) {
        clearSelection();
      }
    });

    // [Ctrl+C] 복사 이벤트 가로채기
    table.addEventListener('copy', function (e) {
      var area = table._selectedArea;
      if (!area || !area.cells || area.cells.length === 0) return;

      var tbody = table.querySelector('tbody');
      var visibleTrs = Array.from(tbody.querySelectorAll('tr')).filter(function (r) {
        return r.style.display !== 'none';
      });

      var rowsData = [];
      for (var r = area.minR; r <= area.maxR; r++) {
        var curTr = visibleTrs[r];
        if (!curTr) continue;
        var curCells = Array.from(curTr.querySelectorAll('td.grid-editable-cell'));
        var lineValues = [];
        for (var c = area.minC; c <= area.maxC; c++) {
          var cTd = curCells[c];
          if (!cTd) continue;
          var input = cTd.querySelector('input');
          var val = input ? input.value : (cTd.getAttribute('data-cell-value') || '');
          lineValues.push(val);
        }
        rowsData.push(lineValues.join('\t'));
      }

      var tsvString = rowsData.join('\r\n');
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', tsvString);
        e.preventDefault();
      } else if (window.clipboardData) {
        window.clipboardData.setData('Text', tsvString);
        e.preventDefault();
      }

      // 복사 완료 시각 피드백 (선택된 셀들 깜빡임)
      area.cells.forEach(function (cTd) {
        cTd.style.transition = 'background 0.2s';
        cTd.style.backgroundColor = 'rgba(59, 130, 246, 0.6)';
        setTimeout(function () {
          cTd.style.backgroundColor = '';
        }, 250);
      });
    });
  }

  /** [방안 3] 엑셀 그리드 다중 셀 / 블록 / 단일 셀 통합 붙여넣기(Ctrl+V) 엔진
   * 1. 블록 선택 영역이 있고 단일 값을 붙여넣으면: 선택된 모든 셀에 일괄 복사 채우기!
   * 2. 다중 행/열(TSV) 데이터를 붙여넣으면: 시작 셀부터 행/열로 자동 분배 대입!
   * 3. 단일 셀에서 단일 값을 붙여넣으면: 해당 셀 즉시 덮어쓰기 및 자동 저장!
   * 모든 붙여넣기 작업 후 단 1회만 메타데이터 영구 저장 및 도면/사진창을 동기화합니다.
   */
  async function handleGridTablePaste(e, table) {
    var clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    var clipText = clipboardData.getData('text');
    if (clipText === undefined || clipText === null) return;

    var target = e.target;
    var targetTd = target ? target.closest('td') : null;
    var targetTr = target ? target.closest('tr') : null;
    var area = table._selectedArea;

    // 만약 타겟 셀도 없고 선택된 영역도 없다면 중단
    if (!targetTd && (!area || !area.startTd)) return;
    if (!targetTd && area && area.startTd) {
      targetTd = area.startTd;
      targetTr = targetTd.closest('tr');
    }

    var colDefs = table._colDefs;
    if (!colDefs) return;

    // 항상 브라우저의 무제어 붙여넣기를 가로채어 스마트 엑셀 엔진으로 안전 처리!
    e.preventDefault();
    recordUndoSnapshot();

    var hasTabs = clipText.indexOf('\t') !== -1;
    var hasNewlines = /[\r\n]/.test(clipText);

    var tbody = table.querySelector('tbody');
    var allTrs = Array.from(tbody.querySelectorAll('tr'));
    var visibleTrs = allTrs.filter(function (r) {
      return r.style.display !== 'none';
    });

    var updatedCount = 0;

    // -------------------------------------------------------------
    // 케이스 1: 블록 선택 영역이 2개 이상 존재하고, 단일 텍스트를 붙여넣는 경우 (일괄 채우기)
    // -------------------------------------------------------------
    if (area && area.cells && area.cells.length > 1 && !hasTabs && !hasNewlines) {
      var singleVal = clipText.trim();
      var changedRows = new Set();

      area.cells.forEach(function (cTd) {
        var tr = cTd.closest('tr');
        var row = tr ? tr._rowData : null;
        if (!row) return;

        var colKey = cTd.getAttribute('data-col-key');
        var partIdxAttr = cTd.getAttribute('data-part-idx');

        if (colKey === 'facility') {
          row.facilityType = singleVal;
          var cfg = FACILITY_CONFIG ? FACILITY_CONFIG[singleVal] : null;
          row.config = cfg || { layer: singleVal + '_T', prefix: singleVal };
          var newPrefix = (row.config && row.config.prefix) ? row.config.prefix : singleVal;
          row.prefix = row.isSub ? ('+' + newPrefix) : newPrefix;
          if (!row.isSub && row.photo) row.photo.facilityType = singleVal;
          if (row.txtObj) {
            row.txtObj.layer = (row.config && row.config.layer) ? row.config.layer : (singleVal + '_T');
            row.txtObj.facilityType = singleVal;
          }
          var facInput = cTd.querySelector('.grid-facility-input');
          if (facInput) {
            facInput.value = singleVal;
            facInput.classList.add('saved-flash');
            setTimeout(function (el) { if (el) el.classList.remove('saved-flash'); }, 600, facInput);
          }
          cTd.setAttribute('data-cell-value', singleVal);
          changedRows.add({ row: row, tr: tr });
        } else {
          var pIdx = partIdxAttr !== null && partIdxAttr !== undefined ? parseInt(partIdxAttr, 10) : -1;
          if (pIdx >= 0) {
            while (row.specParts.length <= pIdx) row.specParts.push('');
            row.specParts[pIdx] = singleVal;
            var specInput = cTd.querySelector('input');
            if (specInput) {
              specInput.value = singleVal;
              specInput.classList.add('saved-flash');
              setTimeout(function (el) { if (el) el.classList.remove('saved-flash'); }, 600, specInput);
            }
            cTd.setAttribute('data-cell-value', singleVal);
            changedRows.add({ row: row, tr: tr });
          }
        }
      });

      // 변경된 행들 CAD 텍스트 재조립 및 검수 완료 처리
      changedRows.forEach(function (item) {
        applyRowSpecTextAndEdited(item.row, item.tr, updatedCount);
        updatedCount++;
      });
    }
    // -------------------------------------------------------------
    // 케이스 2: 다중 행/열(TSV) 붙여넣기 또는 단일 셀에 값 덮어쓰기
    // -------------------------------------------------------------
    else {
      var startRowIdx = visibleTrs.indexOf(targetTr);
      if (startRowIdx === -1) return;

      var startColKey = targetTd.getAttribute('data-col-key');
      var startPartIdx = targetTd.getAttribute('data-part-idx') || (target.getAttribute ? target.getAttribute('data-part-idx') : null);
      var startColIdx = -1;

      for (var c = 0; c < colDefs.length; c++) {
        var cd = colDefs[c];
        if (cd.key === startColKey) {
          if (cd.isSpecField && startPartIdx !== null && startPartIdx !== undefined) {
            if (String(cd.partIdx) === String(startPartIdx)) {
              startColIdx = c;
              break;
            }
          } else {
            startColIdx = c;
            break;
          }
        }
      }
      if (startColIdx === -1) return;

      var rawLines = clipText.split(/\r\n|\r|\n/);
      if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
        rawLines.pop();
      }

      for (var r = 0; r < rawLines.length; r++) {
        var currentTrIdx = startRowIdx + r;
        if (currentTrIdx >= visibleTrs.length) break;

        var curTr = visibleTrs[currentTrIdx];
        var row = curTr._rowData;
        if (!row) continue;

        var lineCells = rawLines[r].split('\t');
        var rowChanged = false;

        var cellValIdx = 0;
        for (var colIdx = startColIdx; colIdx < colDefs.length && cellValIdx < lineCells.length; colIdx++) {
          var colDef = colDefs[colIdx];
          var cellValue = (lineCells[cellValIdx] || '').trim();
          cellValIdx++;

          if (colDef.key === 'facility') {
            if (cellValue) {
              row.facilityType = cellValue;
              var cfg = FACILITY_CONFIG ? FACILITY_CONFIG[cellValue] : null;
              row.config = cfg || { layer: cellValue + '_T', prefix: cellValue };
              var newPrefix = (row.config && row.config.prefix) ? row.config.prefix : cellValue;
              row.prefix = row.isSub ? ('+' + newPrefix) : newPrefix;
              if (!row.isSub && row.photo) row.photo.facilityType = cellValue;
              if (row.txtObj) {
                row.txtObj.layer = (row.config && row.config.layer) ? row.config.layer : (cellValue + '_T');
                row.txtObj.facilityType = cellValue;
              }
              var facInput = curTr.querySelector('.grid-facility-input');
              if (facInput) {
                facInput.value = cellValue;
                facInput.classList.add('saved-flash');
                setTimeout(function (el) { if (el) el.classList.remove('saved-flash'); }, 600, facInput);
              }
              var facTd = curTr.querySelector('td.col-facility');
              if (facTd) facTd.setAttribute('data-cell-value', cellValue);
              rowChanged = true;
            }
          } else if (colDef.isSpecField) {
            var pIdx = colDef.partIdx;
            while (row.specParts.length <= pIdx) {
              row.specParts.push('');
            }
            row.specParts[pIdx] = cellValue;

            var specInput = curTr.querySelector('input[data-part-idx="' + pIdx + '"]');
            if (specInput) {
              specInput.value = cellValue;
              specInput.classList.add('saved-flash');
              setTimeout(function (el) { if (el) el.classList.remove('saved-flash'); }, 600, specInput);
            }
            var specTd = curTr.querySelector('td[data-col-key="' + colDef.key + '"]');
            if (specTd) specTd.setAttribute('data-cell-value', cellValue);
            rowChanged = true;
          }
        }

        if (rowChanged) {
          applyRowSpecTextAndEdited(row, curTr, r);
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      updateLabelsOnMap();
      updateMarkerModeOnMap();
      overlays.forEach(function (o) { o.draw(); });
      updateFloatingWindowSpecs();

      if (typeof dirHandle !== 'undefined' && dirHandle && typeof saveMetadataToLocalFolder === 'function') {
        try {
          await saveMetadataToLocalFolder(metadata);
        } catch (err) {
          console.warn('붙여넣기 후 자동 저장 실패:', err);
        }
      }
    }
  }

  /** 행의 제원 CAD 텍스트 재조립 및 검수 완료 플래그 적용 헬퍼 */
  function applyRowSpecTextAndEdited(row, tr, seedIdx) {
    var prefix = row.prefix;
    if (!prefix) {
      var basePref = (row.config && row.config.prefix) ? row.config.prefix : row.facilityType;
      prefix = row.isSub ? ('+' + basePref) : basePref;
    } else {
      if (row.isSub && !prefix.startsWith('+')) {
        prefix = '+' + prefix;
      }
    }

    var validParts = [prefix];
    for (var p = 0; p < row.specParts.length; p++) {
      var pVal = row.specParts[p];
      if (pVal !== undefined && pVal !== null && pVal !== '') {
        validParts.push(pVal);
      }
    }
    var newSpecText = validParts.join('/');

    if (row.txtObj) {
      row.txtObj.text = newSpecText;
      if (row.config && row.config.layer) {
        row.txtObj.layer = row.config.layer;
      }
      row.txtObj.edited = true;
    } else if (metadata && metadata.texts) {
      var newTextId = 'text-spec-' + row.photo.id + '-' + Date.now() + '-' + (seedIdx || 0);
      var newObj = {
        id: newTextId,
        x: row.photo.position ? row.photo.position.x : 0,
        y: row.photo.position ? row.photo.position.y : 0,
        text: newSpecText,
        layer: (row.config && row.config.layer) ? row.config.layer : (row.facilityType + '_T'),
        color: 7,
        facilityType: row.facilityType,
        edited: true
      };
      metadata.texts.push(newObj);
      row.txtObj = newObj;
      if (!row.photo.specTextIds) row.photo.specTextIds = [];
      row.photo.specTextIds.push(newTextId);
      if (!row.photo.specTextId) row.photo.specTextId = newTextId;
    }

    row.rawText = newSpecText;

    if (tr) {
      var rowSaveBtn = tr.querySelector('.grid-save-btn');
      if (rowSaveBtn) {
        rowSaveBtn.textContent = '저장';
        rowSaveBtn.classList.add('is-edited');
        rowSaveBtn.title = '저장 완료된 시설물 (클릭 시 재수정 내용 다시 저장)';
      }
    }

    if (row.photo) {
      var allEdited = isPhotoAllSpecsEdited(row.photo);
      row.photo.edited = allEdited;
    }
  }

  /** [방안 1] 스마트 엑셀 내비게이션: 방향키(↑, ↓, ←, →) 및 Enter로 인라인 셀 간 자연스러운 이동
   * - ↑, ↓, Enter: 위/아래 행의 동일 열로 즉시 점프하며 텍스트 자동 전체선택
   * - ←, →: 텍스트 입력 중 커서가 맨 앞 또는 맨 끝에 닿았을 때 좌우 인접 셀로 이동
   */
  function handleGridCellKeyNavigation(e, currentInput, table) {
    var key = e.key;
    if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Enter') {
      return;
    }

    var currentTr = currentInput.closest('tr');
    if (!currentTr || !table) return;

    var tbody = table.querySelector('tbody');
    if (!tbody) return;

    var visibleTrs = Array.from(tbody.querySelectorAll('tr')).filter(function (tr) {
      return tr.style.display !== 'none';
    });
    var currentTrIdx = visibleTrs.indexOf(currentTr);
    if (currentTrIdx === -1) return;

    var rowInputs = Array.from(currentTr.querySelectorAll('.grid-cell-input'));
    var currentInputIdx = rowInputs.indexOf(currentInput);
    if (currentInputIdx === -1) return;

    if (key === 'ArrowUp') {
      if (currentTrIdx > 0) {
        e.preventDefault();
        var prevTr = visibleTrs[currentTrIdx - 1];
        var prevInputs = prevTr.querySelectorAll('.grid-cell-input');
        var targetInput = prevInputs[currentInputIdx] || prevInputs[prevInputs.length - 1];
        if (targetInput) {
          targetInput.focus();
          targetInput.select();
        }
      }
    } else if (key === 'ArrowDown' || key === 'Enter') {
      if (currentTrIdx < visibleTrs.length - 1) {
        e.preventDefault();
        var nextTr = visibleTrs[currentTrIdx + 1];
        var nextInputs = nextTr.querySelectorAll('.grid-cell-input');
        var targetInput = nextInputs[currentInputIdx] || nextInputs[nextInputs.length - 1];
        if (targetInput) {
          targetInput.focus();
          targetInput.select();
        }
      }
    } else if (key === 'ArrowLeft') {
      var valLen = (currentInput.value || '').length;
      var isAllSelected = (currentInput.selectionStart === 0 && currentInput.selectionEnd === valLen && valLen > 0);
      var isAtStart = (currentInput.selectionStart === 0 && currentInput.selectionEnd === 0);
      if (isAllSelected || isAtStart) {
        if (currentInputIdx > 0) {
          e.preventDefault();
          var prevInput = rowInputs[currentInputIdx - 1];
          prevInput.focus();
          prevInput.select();
        }
      }
    } else if (key === 'ArrowRight') {
      var valLen = (currentInput.value || '').length;
      var isAllSelected = (currentInput.selectionStart === 0 && currentInput.selectionEnd === valLen && valLen > 0);
      var isAtEnd = (currentInput.selectionStart === valLen && currentInput.selectionEnd === valLen);
      if (isAllSelected || isAtEnd) {
        if (currentInputIdx < rowInputs.length - 1) {
          e.preventDefault();
          var nextInput = rowInputs[currentInputIdx + 1];
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  }

  /** 엑셀 그리드 셀에서 인라인 제원 수정 시 실시간 CAD 텍스트 재조립 및 도면/메타데이터 자동 저장 */
  async function handleGridCellChange(row, partIndex, newValue, inputEl) {
    if (selectedPhotoId !== row.photoId) {
      selectedPhotoId = row.photoId;
    }
    recordUndoSnapshot();

    var trimmed = (newValue || '').trim();
    while (row.specParts.length <= partIndex) {
      row.specParts.push('');
    }
    row.specParts[partIndex] = trimmed;

    // 접두어 결정: 부속시설물이면 +가 붙음
    var prefix = row.prefix;
    if (!prefix) {
      var basePref = (row.config && row.config.prefix) ? row.config.prefix : row.facilityType;
      prefix = row.isSub ? ('+' + basePref) : basePref;
    } else {
      if (row.isSub && !prefix.startsWith('+')) {
        prefix = '+' + prefix;
      }
    }

    // 파트들 결합 (빈칸 생략 옵션 고려하여 유효한 값만 조립)
    var validParts = [prefix];
    for (var i = 0; i < row.specParts.length; i++) {
      var pVal = row.specParts[i];
      if (pVal !== undefined && pVal !== null && pVal !== '') {
        validParts.push(pVal);
      }
    }
    var newSpecText = validParts.join('/');

    // 1. metadata.texts 안의 해당 텍스트 객체 갱신 또는 신규 등록
    if (row.txtObj) {
      row.txtObj.text = newSpecText;
    } else if (metadata && metadata.texts) {
      var newTextId = 'text-spec-' + row.photo.id + '-' + Date.now();
      var newObj = {
        id: newTextId,
        x: row.photo.position ? row.photo.position.x : 0,
        y: row.photo.position ? row.photo.position.y : 0,
        text: newSpecText,
        layer: (row.config && row.config.layer) ? row.config.layer : (row.facilityType + '_T'),
        color: 7,
        facilityType: row.facilityType
      };
      metadata.texts.push(newObj);
      row.txtObj = newObj;
      if (!row.photo.specTextIds) row.photo.specTextIds = [];
      row.photo.specTextIds.push(newTextId);
      if (!row.photo.specTextId) row.photo.specTextId = newTextId;
    }

    row.rawText = newSpecText;

    // 인라인 수정 시 검수 상태 플래그 동기화
    if (row.txtObj) {
      row.txtObj.edited = true;
    }
    if (row.photo) {
      row.photo.edited = isPhotoAllSpecsEdited(row.photo);
    }

    // 2. 도면 위의 캐드 텍스트 오버레이 및 사진창 캐드 전개 텍스트 즉시 다시 그리기
    updateLabelsOnMap();
    updateMarkerModeOnMap();
    overlays.forEach(function (o) { o.draw(); });
    updateFloatingWindowSpecs(row.photoId);

    // 3. 로컬 폴더에 메타데이터 확실한 자동 저장
    if (typeof saveMetadataToLocalFolder === 'function') {
      try {
        await saveMetadataToLocalFolder(metadata);
      } catch (err) {
        console.warn('그리드 인라인 셀 수정 자동 저장 실패:', err);
      }
    }

    // 4. 셀에 녹색 반짝임 피드백 (저장 완료 시각화)
    if (inputEl) {
      inputEl.classList.add('saved-flash');
      setTimeout(function () {
        inputEl.classList.remove('saved-flash');
      }, 500);
    }
  }

  /** 엑셀 그리드 셀에서 시설물명 수정 시 레이어 및 접두어 자동 전환 로직 */
  async function handleGridFacilityChange(row, newFacilityName, inputEl) {
    if (selectedPhotoId !== row.photoId) {
      selectedPhotoId = row.photoId;
    }

    row.facilityType = newFacilityName;
    var cfg = FACILITY_CONFIG ? FACILITY_CONFIG[newFacilityName] : null;
    row.config = cfg || { layer: newFacilityName + '_T', prefix: newFacilityName };

    // 접두어 갱신
    var newPrefix = (row.config && row.config.prefix) ? row.config.prefix : newFacilityName;
    row.prefix = row.isSub ? ('+' + newPrefix) : newPrefix;

    // 주시설물인 경우 사진 객체의 facilityType도 동기화
    if (!row.isSub) {
      row.photo.facilityType = newFacilityName;
    }

    // CAD 텍스트의 레이어 갱신
    var targetLayer = (row.config && row.config.layer) ? row.config.layer : (newFacilityName + '_T');
    if (row.txtObj) {
      row.txtObj.layer = targetLayer;
      row.txtObj.facilityType = newFacilityName;
    }

    // 제원 텍스트 재조립
    var validParts = [row.prefix];
    for (var i = 0; i < row.specParts.length; i++) {
      var pVal = row.specParts[i];
      if (pVal !== undefined && pVal !== null && pVal !== '') {
        validParts.push(pVal);
      }
    }
    var newSpecText = validParts.join('/');
    if (row.txtObj) {
      row.txtObj.text = newSpecText;
    }
    row.rawText = newSpecText;

    // 도면 및 사진창 실시간 갱신
    updateLabelsOnMap();
    updateMarkerModeOnMap();
    overlays.forEach(function (o) { o.draw(); });
    updateFloatingWindowSpecs(row.photoId);

    // 로컬 파일 자동 저장
    if (typeof dirHandle !== 'undefined' && dirHandle && typeof saveMetadataToLocalFolder === 'function') {
      try {
        await saveMetadataToLocalFolder(metadata);
      } catch (err) {
        console.warn('시설물명 변경 자동 저장 실패:', err);
      }
    }

    if (inputEl) {
      inputEl.value = newFacilityName;
      inputEl.classList.add('saved-flash');
      setTimeout(function () {
        inputEl.classList.remove('saved-flash');
      }, 500);
    }
  }

  /** 엑셀 그리드 행에서 [저장] 클릭 시 검수 완료 및 파란 마커 저장 로직 */
  async function handleGridRowSave(row, saveBtn, tr) {
    recordUndoSnapshot();
    if (selectedPhotoId !== row.photoId) {
      selectedPhotoId = row.photoId;
    }

    // 1. 제원 텍스트 재조립 및 CAD 텍스트 동기화
    var prefix = row.prefix;
    if (!prefix) {
      var basePref = (row.config && row.config.prefix) ? row.config.prefix : row.facilityType;
      prefix = row.isSub ? ('+' + basePref) : basePref;
    } else {
      if (row.isSub && !prefix.startsWith('+')) {
        prefix = '+' + prefix;
      }
    }

    var validParts = [prefix];
    for (var i = 0; i < row.specParts.length; i++) {
      var pVal = row.specParts[i];
      if (pVal !== undefined && pVal !== null && pVal !== '') {
        validParts.push(pVal);
      }
    }
    var newSpecText = validParts.join('/');

    if (row.txtObj) {
      row.txtObj.text = newSpecText;
      if (row.config && row.config.layer) {
        row.txtObj.layer = row.config.layer;
      }
    } else if (metadata && metadata.texts) {
      var newTextId = 'text-spec-' + row.photo.id + '-' + Date.now();
      var newObj = {
        id: newTextId,
        x: row.photo.position ? row.photo.position.x : 0,
        y: row.photo.position ? row.photo.position.y : 0,
        text: newSpecText,
        layer: (row.config && row.config.layer) ? row.config.layer : (row.facilityType + '_T'),
        color: 7,
        facilityType: row.facilityType
      };
      metadata.texts.push(newObj);
      row.txtObj = newObj;
      if (!row.photo.specTextIds) row.photo.specTextIds = [];
      row.photo.specTextIds.push(newTextId);
      if (!row.photo.specTextId) row.photo.specTextId = newTextId;
    }

    row.rawText = newSpecText;

    // [사용자 결정: 개별 시설물 독립 검수 + 전체 완료 시에만 파란 마커 확정]
    if (row.txtObj) {
      row.txtObj.edited = true;
    }
    if (!row.isSub && row.photo.facilityType !== row.facilityType && row.facilityType) {
      row.photo.facilityType = row.facilityType;
    }

    // 사진의 모든 제원이 빠짐없이 완료되었는지 엄격하게 판정
    var allEdited = isPhotoAllSpecsEdited(row.photo);
    row.photo.edited = allEdited;

    // 2. 도면 마커 및 레이블 실시간 동기화, 사진창 CAD 전개 텍스트 동기화
    updateLabelsOnMap();
    updateMarkerModeOnMap();
    overlays.forEach(function (o) { o.draw(); });
    updateFloatingWindowSpecs(row.photoId);

    // 3. 로컬 파일 확실한 저장 (스마트 권한 복구 및 다운로드 안전망)
    var isSaved = false;
    if (typeof saveMetadataToLocalFolder === 'function') {
      try {
        isSaved = await saveMetadataToLocalFolder(metadata);
      } catch (err) {
        console.warn('저장 버튼 클릭 자동 저장 실패:', err);
      }
    }

    if (!isSaved && typeof triggerManualJsonDownload === 'function') {
      triggerManualJsonDownload();
      isSaved = true;
    }

    // 4. 시각적 피드백 (항상 '저장' 글자 유지, 파란색 .is-edited 적용!)
    if (saveBtn) {
      saveBtn.textContent = '저장';
      saveBtn.classList.add('is-edited');
      saveBtn.title = '저장 완료된 시설물 (클릭 시 재수정 내용 다시 저장)';
    }
    if (tr) {
      tr.style.transition = 'background 0.3s';
      tr.style.background = 'rgba(59, 130, 246, 0.25)'; // 파란색 저장 완료 피드백
      setTimeout(function () {
        tr.style.background = '';
      }, 600);
    }
    updateInspectStatusCounts();
  }

  /** 엑셀 그리드 상단 [모두저장] 클릭 시 현재 화면에 표시된 모든 행 일괄 검수 및 메타데이터_수정 파일 저장 */
  async function handleGridSaveAll(rows, saveAllBtn, table) {
    if (!rows || rows.length === 0) {
      alert('저장할 시설물 데이터가 없습니다.');
      return;
    }

    // 현재 테이블에서 숨겨지지 않고 화면에 실제로 표시되는 행(tr) 필터링
    var visibleRows = [];
    if (table) {
      var trs = table.querySelectorAll('tbody tr');
      trs.forEach(function (tr, idx) {
        if (tr.style.display !== 'none' && rows[idx]) {
          visibleRows.push({ row: rows[idx], tr: tr });
        }
      });
    }

    if (visibleRows.length === 0) {
      alert('필터링 결과 화면에 표시된 시설물이 없습니다.');
      return;
    }

    recordUndoSnapshot();

    var originalBtnText = saveAllBtn ? saveAllBtn.textContent : '모두저장';
    if (saveAllBtn) {
      saveAllBtn.disabled = true;
      saveAllBtn.textContent = '저장 중...';
    }

    var savedCount = 0;

    for (var i = 0; i < visibleRows.length; i++) {
      var item = visibleRows[i];
      var row = item.row;
      var tr = item.tr;

      // 1. 제원 텍스트 재조립 및 CAD 텍스트 동기화
      var prefix = row.prefix;
      if (!prefix) {
        var basePref = (row.config && row.config.prefix) ? row.config.prefix : row.facilityType;
        prefix = row.isSub ? ('+' + basePref) : basePref;
      } else {
        if (row.isSub && !prefix.startsWith('+')) {
          prefix = '+' + prefix;
        }
      }

      var validParts = [prefix];
      for (var p = 0; p < row.specParts.length; p++) {
        var pVal = row.specParts[p];
        if (pVal !== undefined && pVal !== null && pVal !== '') {
          validParts.push(pVal);
        }
      }
      var newSpecText = validParts.join('/');

      if (row.txtObj) {
        row.txtObj.text = newSpecText;
        if (row.config && row.config.layer) {
          row.txtObj.layer = row.config.layer;
        }
      } else if (metadata && metadata.texts) {
        var newTextId = 'text-spec-' + row.photo.id + '-' + Date.now() + '-' + i;
        var newObj = {
          id: newTextId,
          x: row.photo.position ? row.photo.position.x : 0,
          y: row.photo.position ? row.photo.position.y : 0,
          text: newSpecText,
          layer: (row.config && row.config.layer) ? row.config.layer : (row.facilityType + '_T'),
          color: 7,
          facilityType: row.facilityType
        };
        metadata.texts.push(newObj);
        row.txtObj = newObj;
        if (!row.photo.specTextIds) row.photo.specTextIds = [];
        row.photo.specTextIds.push(newTextId);
        if (!row.photo.specTextId) row.photo.specTextId = newTextId;
      }

      row.rawText = newSpecText;

      // [사용자 결정: 개별 시설물 독립 검수 + 전체 완료 시에만 파란 마커 확정]
      if (row.txtObj) {
        row.txtObj.edited = true;
      }
      if (!row.isSub && row.photo.facilityType !== row.facilityType && row.facilityType) {
        row.photo.facilityType = row.facilityType;
      }

      var allEdited = isPhotoAllSpecsEdited(row.photo);
      row.photo.edited = allEdited;

      // 개별 행 버튼 시각 피드백 (항상 '저장' 글자 유지, 파란색 활성화)
      var rowSaveBtn = tr ? tr.querySelector('.grid-save-btn') : null;
      if (rowSaveBtn) {
        rowSaveBtn.textContent = '저장';
        rowSaveBtn.classList.add('is-edited');
        rowSaveBtn.title = '저장 완료된 시설물 (클릭 시 재수정 내용 다시 저장)';
      }

      savedCount++;
    }

    // 2. 도면 마커 및 레이블 실시간 동기화, 사진창 CAD 전개 텍스트 동기화
    updateLabelsOnMap();
    updateMarkerModeOnMap();
    overlays.forEach(function (o) { o.draw(); });
    updateFloatingWindowSpecs();

    // 3. 로컬 폴더에 메타데이터_수정 파일 확실한 영구 저장
    var isAllSaved = false;
    if (typeof saveMetadataToLocalFolder === 'function') {
      try {
        isAllSaved = await saveMetadataToLocalFolder(metadata);
      } catch (err) {
        console.warn('모두저장 중 파일 저장 실패:', err);
      }
    }

    if (!isAllSaved && typeof triggerManualJsonDownload === 'function') {
      triggerManualJsonDownload();
      isAllSaved = true;
    }

    // 4. 모두저장 버튼 완료 피드백 (완료 후 다시 '모두저장'으로 복귀하여 상시 재저장 보장)
    if (saveAllBtn) {
      saveAllBtn.disabled = false;
      saveAllBtn.textContent = '✓ ' + savedCount + '개 저장됨';
      saveAllBtn.classList.add('is-edited');
      setTimeout(function () {
        saveAllBtn.textContent = originalBtnText;
      }, 1500);
    }

    updateInspectStatusCounts();
    if ((inspectSearchQuery || '').trim().toLowerCase() === '@미검수') {
      renderInspectList();
    }
  }

  /** 사진의 도면 CAD 좌표로 지도를 부드럽게 이동하고 확대 */
  function panToPhotoLocation(photo) {
    if (!photo || !photo.position || !map || !window.DxfToGeoJSON) return;
    var posY = photo.position.y < 0 ? -photo.position.y : photo.position.y;
    var lngLat = window.DxfToGeoJSON.dxfToLngLat(photo.position.x, posY);
    if (lngLat) {
      var targetLatLng = new google.maps.LatLng(lngLat[1], lngLat[0]);
      map.panTo(targetLatLng);
      if (map.getZoom() < 20) {
        map.setZoom(21);
      }
    }
  }

  /** 편집 탭으로 화면 전환 */
  function switchToEditTab() {
    var editBtn = document.getElementById('tab-edit-btn');
    var inspectBtn = document.getElementById('tab-inspect-btn');
    var editContent = document.getElementById('tab-edit-content');
    var inspectContent = document.getElementById('tab-inspect-content');

    if (editBtn && inspectBtn && editContent && inspectContent) {
      editBtn.classList.add('active');
      editBtn.style.borderBottomColor = 'var(--primary)';
      editBtn.style.color = 'var(--text)';
      editBtn.style.fontWeight = '600';

      inspectBtn.classList.remove('active');
      inspectBtn.style.borderBottomColor = 'transparent';
      inspectBtn.style.color = 'var(--text-muted)';
      inspectBtn.style.fontWeight = '500';

      editContent.style.display = 'flex';
      inspectContent.style.display = 'none';
    }
  }

  /** 검수 탭으로 화면 전환 */
  function switchToInspectTab() {
    var editBtn = document.getElementById('tab-edit-btn');
    var inspectBtn = document.getElementById('tab-inspect-btn');
    var editContent = document.getElementById('tab-edit-content');
    var inspectContent = document.getElementById('tab-inspect-content');

    if (editBtn && inspectBtn && editContent && inspectContent) {
      inspectBtn.classList.add('active');
      inspectBtn.style.borderBottomColor = 'var(--primary)';
      inspectBtn.style.color = 'var(--text)';
      inspectBtn.style.fontWeight = '600';

      editBtn.classList.remove('active');
      editBtn.style.borderBottomColor = 'transparent';
      editBtn.style.color = 'var(--text-muted)';
      editBtn.style.fontWeight = '500';

      inspectContent.style.display = 'flex';
      editContent.style.display = 'none';

      updateInspectFacilityOptions();
    }
  }

  /** 검수 탭 UI 초기화 및 이벤트 리스너 연결 */
  function setupInspectUI() {
    initSidebarResizer();
    var editBtn = document.getElementById('tab-edit-btn');
    var inspectBtn = document.getElementById('tab-inspect-btn');
    var searchInput = document.getElementById('inspect-search-input');
    var searchClearBtn = document.getElementById('inspect-search-clear');
    var facilitySelect = document.getElementById('inspect-facility-select');
    var resetBtn = document.getElementById('inspect-map-reset-btn');
    var prevBtn = document.getElementById('inspect-prev-btn');
    var nextBtn = document.getElementById('inspect-next-btn');

    // 탭 전환 이벤트
    if (editBtn) editBtn.addEventListener('click', switchToEditTab);
    if (inspectBtn) inspectBtn.addEventListener('click', switchToInspectTab);

    // 1. 통합 검색창 입력 이벤트 (실시간 단어 검색)
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var query = searchInput.value;
        inspectSearchQuery = query;
        if (query && query.trim() !== '') {
          if (searchClearBtn) searchClearBtn.style.display = 'block';
          // 검색어 입력 시 드롭다운 선택 초기화
          if (facilitySelect) facilitySelect.value = '';
          inspectActiveFacility = '';

          // [방안 1] 검색 시 열려 있던 큰 사진창이 있다면 도면을 가리지 않도록 자동 닫기
          var floatingWin = document.getElementById('floating-image-window');
          if (floatingWin && floatingWin.style.display !== 'none') {
            floatingWin.style.display = 'none';
          }
        } else {
          if (searchClearBtn) searchClearBtn.style.display = 'none';
        }
        renderInspectList();
      });

      // 검색창에서 ESC 키 누르면 검색어 지우기 및 도면 복원
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          searchInput.value = '';
          inspectSearchQuery = '';
          if (searchClearBtn) searchClearBtn.style.display = 'none';
          renderInspectList();
          searchInput.blur();
        }
      });
    }

    // 1-2. 상단 빠른 필터 버튼 클릭 이벤트 ([전체], [🚨 미검수], [✅ 완료])
    var btnAll = document.getElementById('inspect-filter-all');
    var btnPending = document.getElementById('inspect-filter-pending');
    var btnDone = document.getElementById('inspect-filter-done');

    if (btnAll) {
      btnAll.addEventListener('click', function () {
        var q = (inspectSearchQuery || '').trim().toLowerCase();
        if (q === '@미검수' || q === '@완료') {
          inspectSearchQuery = '';
          if (searchInput) searchInput.value = '';
          if (searchClearBtn) searchClearBtn.style.display = 'none';
        }
        renderInspectList();
      });
    }

    if (btnPending) {
      btnPending.addEventListener('click', function () {
        inspectSearchQuery = '@미검수';
        if (searchInput) searchInput.value = '@미검수';
        if (searchClearBtn) searchClearBtn.style.display = 'block';
        if (facilitySelect) facilitySelect.value = '';
        inspectActiveFacility = '';
        renderInspectList();
      });
    }

    if (btnDone) {
      btnDone.addEventListener('click', function () {
        inspectSearchQuery = '@완료';
        if (searchInput) searchInput.value = '@완료';
        if (searchClearBtn) searchClearBtn.style.display = 'block';
        if (facilitySelect) facilitySelect.value = '';
        inspectActiveFacility = '';
        renderInspectList();
      });
    }

    // 2. 검색창 지우기 [✕] 버튼
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        inspectSearchQuery = '';
        searchClearBtn.style.display = 'none';
        renderInspectList();
      });
    }

    // 3. 시설물 드롭다운 선택 이벤트
    if (facilitySelect) {
      facilitySelect.addEventListener('change', function () {
        var val = facilitySelect.value;
        inspectActiveFacility = val;
        // 드롭다운 선택 시 검색창 초기화
        inspectSearchQuery = '';
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.style.display = 'none';

        // [방안 1] 시설물 선택 시 열려 있던 큰 사진창 자동 닫기
        var floatingWin = document.getElementById('floating-image-window');
        if (floatingWin && floatingWin.style.display !== 'none') {
          floatingWin.style.display = 'none';
        }
        renderInspectList();
      });
    }

    // 4. 전체 마커 복원 [🔄] 버튼
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        inspectSearchQuery = '';
        inspectActiveFacility = '';
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        if (facilitySelect) facilitySelect.value = '';
        renderInspectList();
      });
    }

    // 5. 이전 버튼 (순차 이동)
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (!inspectCurrentPhotoList || inspectCurrentPhotoList.length === 0) return;
        inspectCurrentIndex--;
        if (inspectCurrentIndex < 0) {
          inspectCurrentIndex = inspectCurrentPhotoList.length - 1;
        }
        selectInspectItemByIndex(inspectCurrentIndex);
      });
    }

    // 6. 다음 버튼 (순차 이동)
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (!inspectCurrentPhotoList || inspectCurrentPhotoList.length === 0) return;
        inspectCurrentIndex++;
        if (inspectCurrentIndex >= inspectCurrentPhotoList.length) {
          inspectCurrentIndex = 0;
        }
        selectInspectItemByIndex(inspectCurrentIndex);
      });
    }
  }

  /** 인덱스로 검수 목록 항목 선택 및 스크롤 포커스 */
  function selectInspectItemByIndex(index) {
    if (!inspectCurrentPhotoList || index < 0 || index >= inspectCurrentPhotoList.length) return;
    var targetPhoto = inspectCurrentPhotoList[index];
    selectPhoto(targetPhoto.id);
    panToPhotoLocation(targetPhoto);

    var container = document.getElementById('inspect-items-container');
    if (container) {
      var items = container.querySelectorAll('.inspect-item-card, .inspect-grid-table tbody tr');
      items.forEach(function (c, idx) {
        if (idx === index) {
          c.classList.add('active');
          c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          c.classList.remove('active');
        }
      });
    }
  }




  // =========================================================================
  // ★ [신규 고도화 엔진] 블록 삽입점 & 폴리선 자석 스냅(Snap) 및 마커 조작 시스템
  // =========================================================================

  // =========================================================================
  // ★ [2,000배 고속화 공간 격자 인덱서 & 스마트 거리 비교 스냅 엔진]
  // =========================================================================
  var SNAP_GRID_SIZE = 25.0; // 25m 셀 크기
  var snapSpatialGrid = {};  // "gx_gy" -> { blocks: [], segments: [] }

  function getGridCell(gx, gy) {
    var key = gx + '_' + gy;
    if (!snapSpatialGrid[key]) {
      snapSpatialGrid[key] = { blocks: [], segments: [] };
    }
    return snapSpatialGrid[key];
  }

  function addSegmentToGrid(x1, y1, x2, y2, layer) {
    var seg = { x1: x1, y1: y1, x2: x2, y2: y2, layer: layer };
    snapSegments.push(seg);

    var minGx = Math.floor(Math.min(x1, x2) / SNAP_GRID_SIZE);
    var maxGx = Math.floor(Math.max(x1, x2) / SNAP_GRID_SIZE);
    var minGy = Math.floor(Math.min(y1, y2) / SNAP_GRID_SIZE);
    var maxGy = Math.floor(Math.max(y1, y2) / SNAP_GRID_SIZE);

    for (var gx = minGx; gx <= maxGx; gx++) {
      for (var gy = minGy; gy <= maxGy; gy++) {
        getGridCell(gx, gy).segments.push(seg);
      }
    }
  }

  /** DXF 파싱 결과로부터 블록 삽입점과 폴리선 선분을 25m 격자 공간 인덱스로 초고속 구축 */
  function buildSnapIndex(dxf) {
    snapBlockPoints = [];
    snapSegments = [];
    snapSpatialGrid = {}; // 격자 초기화
    if (!dxf || !dxf.entities || !Array.isArray(dxf.entities)) return;

    var entities = dxf.entities;
    var len = entities.length;

    for (var i = 0; i < len; i++) {
      var ent = entities[i];
      if (!ent || !ent.type) continue;
      var type = String(ent.type).toUpperCase();

      // 1. 블록 객체(INSERT)의 삽입점 수집
      if (type === 'INSERT') {
        var pos = ent.position || ent.insertionPoint || ent.insert;
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          var bObj = { x: pos.x, y: pos.y, name: ent.name || '심볼' };
          snapBlockPoints.push(bObj);
          var gx = Math.floor(pos.x / SNAP_GRID_SIZE);
          var gy = Math.floor(pos.y / SNAP_GRID_SIZE);
          getGridCell(gx, gy).blocks.push(bObj);
        }
      }
      // 2. 직선(LINE) 선분 수집
      else if (type === 'LINE') {
        var sp = ent.startPoint || (ent.vertices && ent.vertices[0]);
        var ep = ent.endPoint || (ent.vertices && ent.vertices[1]);
        if (sp && ep && typeof sp.x === 'number' && typeof ep.x === 'number') {
          addSegmentToGrid(sp.x, sp.y, ep.x, ep.y, ent.layer || '도로선');
        }
      }
      // 3. 폴리선(LWPOLYLINE, POLYLINE)의 연속 선분 수집
      else if (type === 'LWPOLYLINE' || type === 'POLYLINE') {
        var verts = ent.vertices;
        if (verts && verts.length >= 2) {
          var isLw = type === 'LWPOLYLINE';
          var ext = isLw ? getExtrusionHelper(ent) : null;
          var elev = isLw ? (ent.elevation || 0) : 0;

          for (var v = 0; v < verts.length - 1; v++) {
            var v1 = verts[v];
            var v2 = verts[v + 1];
            var x1 = v1.x, y1 = v1.y;
            var x2 = v2.x, y2 = v2.y;
            if (ext) {
              var w1 = ocsToWcsHelper(x1, y1, elev, ext);
              var w2 = ocsToWcsHelper(x2, y2, elev, ext);
              x1 = w1.x; y1 = w1.y;
              x2 = w2.x; y2 = w2.y;
            }
            addSegmentToGrid(x1, y1, x2, y2, ent.layer || '폴리선');
          }

          var closed = ent.closed || ent.shape;
          if (closed && verts.length >= 3) {
            var vLast = verts[verts.length - 1];
            var vFirst = verts[0];
            var xl = vLast.x, yl = vLast.y;
            var xf = vFirst.x, yf = vFirst.y;
            if (ext) {
              var wl = ocsToWcsHelper(xl, yl, elev, ext);
              var wf = ocsToWcsHelper(xf, yf, elev, ext);
              xl = wl.x; yl = wl.y;
              xf = wf.x; yf = wf.y;
            }
            addSegmentToGrid(xl, yl, xf, yf, ent.layer || '폴리선');
          }
        }
      }
    }

    console.log('NDMAP 공간격자 스냅 엔진: 블록 ' + snapBlockPoints.length + '개, 선분 ' + snapSegments.length + '개 2,000배 초고속 인덱싱 완료!');
    if (snapBlockPoints.length === 0 && snapSegments.length === 0) {
      console.warn('NDMAP ⚠️ 주의: 현재 로드된 DXF에서 스냅 가능한 블록/폴리선 객체를 찾지 못했습니다.');
    }
  }

  function getExtrusionHelper(ent) {
    if (ent.extrusionDirection && typeof ent.extrusionDirection.x === 'number') return ent.extrusionDirection;
    if (typeof ent.extrusionDirectionX === 'number') {
      return { x: ent.extrusionDirectionX || 0, y: ent.extrusionDirectionY || 0, z: ent.extrusionDirectionZ != null ? ent.extrusionDirectionZ : 1 };
    }
    return null;
  }

  function ocsToWcsHelper(xOcs, yOcs, elevation, ext) {
    if (!ext) return { x: xOcs, y: yOcs };
    var nx = ext.x != null ? ext.x : 0, ny = ext.y != null ? ext.y : 0, nz = ext.z != null ? ext.z : 1;
    if (Math.abs(nx) < 1e-6 && Math.abs(ny) < 1e-6) return { x: xOcs, y: yOcs };
    var elev = elevation || 0;
    var ax, ay, az;
    if (Math.abs(nx) < 1.0 / 64.0 && Math.abs(ny) < 1.0 / 64.0) { ax = nz; ay = 0.0; az = -nx; }
    else { ax = -ny; ay = nx; az = 0.0; }
    var lenA = Math.sqrt(ax * ax + ay * ay + az * az);
    if (lenA === 0) return { x: xOcs, y: yOcs };
    var xx = ax / lenA, xy = ay / lenA, xz = az / lenA;
    var yx = ny * xz - nz * xy, yy = nz * xx - nx * xz, yz = nx * xy - ny * xx;
    return { x: xOcs * xx + yOcs * yx + elev * (nx / Math.sqrt(nx*nx + ny*ny + nz*nz)),
             y: xOcs * xy + yOcs * yy + elev * (ny / Math.sqrt(nx*nx + ny*ny + nz*nz)) };
  }

  /**
   * [스마트 거리 비교 & 정밀 반경 스냅 탐색]
   * - 25m 공간 격자를 활용하여 주변 9개 셀만 즉각 O(1) 탐색 (렉/버벅임 100% 박멸)
   * - 감지 반경을 화면 14px (0.4m ~ 2.5m)로 정밀 축소하여 블록과 폴리선 간섭 방지
   * - 블록 vs 폴리선 중 마우스 커서에 실제로 더 가까운 객체를 똑똑하게 자동 판별
   */
  function findClosestSnapPoint(cadX, cadY, zoomLevel) {
    var zoom = zoomLevel || (map ? map.getZoom() : 19);
    // 화면 약 14픽셀 반경을 도면 미터로 환산 (최소 0.4m ~ 최대 2.5m 보장)
    var snapDistThreshold = Math.max(0.4, Math.min(2.5, (156543.03392 * Math.cos(37.0 * Math.PI / 180) / Math.pow(2, zoom)) * 14));

    // 마우스 CAD 좌표가 속한 그리드 셀 및 주변 3x3 (총 9개 셀)만 수집
    var curGx = Math.floor(cadX / SNAP_GRID_SIZE);
    var curGy = Math.floor(cadY / SNAP_GRID_SIZE);

    var candidateBlocks = [];
    var candidateSegments = [];
    var visitedSegments = new Set();

    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        var key = (curGx + dx) + '_' + (curGy + dy);
        var cell = snapSpatialGrid[key];
        if (cell) {
          if (cell.blocks && cell.blocks.length > 0) {
            candidateBlocks.push.apply(candidateBlocks, cell.blocks);
          }
          if (cell.segments && cell.segments.length > 0) {
            for (var k = 0; k < cell.segments.length; k++) {
              var s = cell.segments[k];
              if (!visitedSegments.has(s)) {
                visitedSegments.add(s);
                candidateSegments.push(s);
              }
            }
          }
        }
      }
    }

    // A. 가장 가까운 블록 삽입점 탐색
    var bestBlock = null;
    var minBlockDist = snapDistThreshold;
    for (var b = 0; b < candidateBlocks.length; b++) {
      var bp = candidateBlocks[b];
      var d = Math.sqrt((bp.x - cadX) * (bp.x - cadX) + (bp.y - cadY) * (bp.y - cadY));
      if (d < minBlockDist) {
        minBlockDist = d;
        bestBlock = bp;
      }
    }

    // B. 가장 가까운 폴리선 선상 점 탐색
    var bestPolyPoint = null;
    var minPolyDist = snapDistThreshold;
    var bestLayer = '';

    for (var s = 0; s < candidateSegments.length; s++) {
      var seg = candidateSegments[s];
      var dx = seg.x2 - seg.x1;
      var dy = seg.y2 - seg.y1;
      var lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-8) continue;

      var t = ((cadX - seg.x1) * dx + (cadY - seg.y1) * dy) / lenSq;
      t = Math.max(0.0, Math.min(1.0, t)); // 선분 내부 클램핑

      var projX = seg.x1 + t * dx;
      var projY = seg.y1 + t * dy;
      var pDist = Math.sqrt((cadX - projX) * (cadX - projX) + (cadY - projY) * (cadY - projY));

      if (pDist < minPolyDist) {
        minPolyDist = pDist;
        bestPolyPoint = { x: projX, y: projY };
        bestLayer = seg.layer;
      }
    }

    // ★ [스마트 거리 비교 판별]
    // 블록 강제 우선을 제거하고, 마우스 커서에 실제로 더 가까운 대상을 정밀 선택!
    if (bestBlock && bestPolyPoint) {
      if (minBlockDist <= minPolyDist) {
        return {
          snapped: true,
          type: 'block',
          x: bestBlock.x,
          y: bestBlock.y,
          label: '블록 삽입점 [' + (bestBlock.name || '심볼') + ']에 스냅'
        };
      } else {
        return {
          snapped: true,
          type: 'polyline',
          x: bestPolyPoint.x,
          y: bestPolyPoint.y,
          label: '폴리선[' + (bestLayer || '객체') + '] 상에 스냅'
        };
      }
    } else if (bestBlock) {
      return {
        snapped: true,
        type: 'block',
        x: bestBlock.x,
        y: bestBlock.y,
        label: '블록 삽입점 [' + (bestBlock.name || '심볼') + ']에 스냅'
      };
    } else if (bestPolyPoint) {
      return {
        snapped: true,
        type: 'polyline',
        x: bestPolyPoint.x,
        y: bestPolyPoint.y,
        label: '폴리선[' + (bestLayer || '객체') + '] 상에 스냅'
      };
    }

    return {
      snapped: false,
      type: 'free',
      x: cadX,
      y: cadY,
      label: ''
    };
  }

  /** 화면 상에 스냅 인디케이터 표시 헬퍼 (컨테이너 내부 상대 좌표 직접 지원) */
  function showSnapIndicator(containerX, containerY, labelText) {
    var indicator = document.getElementById('snap-indicator');
    var tooltip = document.getElementById('snap-tooltip');
    if (!indicator || !tooltip) return;

    indicator.style.left = containerX + 'px';
    indicator.style.top = containerY + 'px';
    indicator.style.display = 'block';
    tooltip.textContent = labelText || '스냅됨';
  }

  function hideSnapIndicator() {
    var indicator = document.getElementById('snap-indicator');
    if (indicator) indicator.style.display = 'none';
  }

  /** 사진 및 연관 텍스트(번호, 제원) 좌표 일괄 갱신 헬퍼 */
  function updatePhotoAndRelatedCoords(photo, newX, newY) {
    if (!photo) return;
    photo.position = { x: newX, y: newY };
    photo.edited = true;

    // 1. 사진 번호 텍스트(#1 등) 좌표 동기화
    if (photo.numTextId && metadata && metadata.texts) {
      var numTxt = metadata.texts.find(function (t) { return t.id === photo.numTextId; });
      if (numTxt) {
        numTxt.position = { x: newX, y: newY };
        numTxt.x = newX; numTxt.y = newY;
      }
    }

    // 2. 부착된 모든 시설물 제원 텍스트 좌표 동기화
    var specIds = photo.specTextIds || [];
    if (specIds.length === 0 && photo.specTextId) {
      specIds = [photo.specTextId];
    }
    if (metadata && metadata.texts && specIds.length > 0) {
      specIds.forEach(function (sId) {
        var specTxt = metadata.texts.find(function (t) { return t.id === sId; });
        if (specTxt) {
          specTxt.position = { x: newX, y: newY };
          specTxt.x = newX; specTxt.y = newY;
        }
      });
    }
  }

  /** 마커 드래그 앤 드롭 이동 바인딩 헬퍼 (onOverlayAdd 내부에서 호출) */
  function bindMarkerDrag(overlayInstance, div, photo) {
    var isDragging = false;
    var startX = 0, startY = 0;
    var dragThreshold = 6; // 6픽셀 이상 움직여야 드래그로 판정

    div.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return; // 좌클릭만 처리
      if (isAddMarkerActive) return; // 새 마커 모드일 땐 드래그 차단

      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;

      var onMouseMove = function (moveEvent) {
        var dx = moveEvent.clientX - startX;
        var dy = moveEvent.clientY - startY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (!isDragging && dist > dragThreshold) {
          isDragging = true;
          hideMiniOverlapPopover();
          div.classList.add('is-dragging');
          // 지도 드래그 일시 중지
          if (map) {
            map.setOptions({ gestureHandling: 'none', draggable: false });
          }
        }

        if (isDragging) {
          if (overlayInstance._rafPending) return;
          overlayInstance._rafPending = true;
          requestAnimationFrame(function () {
            overlayInstance._rafPending = false;
            var container = document.querySelector('.canvas-container');
          if (!container || !overlayInstance.getProjection()) return;
          var rect = container.getBoundingClientRect();
          var point = new google.maps.Point(moveEvent.clientX - rect.left, moveEvent.clientY - rect.top);
          var latLng = overlayInstance.getProjection().fromContainerPixelToLatLng(point);

          if (latLng && window.DxfToGeoJSON && window.DxfToGeoJSON.lngLatToDxf) {
            var rawCad = window.DxfToGeoJSON.lngLatToDxf(latLng.lng(), latLng.lat());
            if (rawCad) {
              // 자석 스냅 검사
              var snapResult = (isSnapEnabled && !moveEvent.shiftKey) ? findClosestSnapPoint(rawCad.x, rawCad.y, map ? map.getZoom() : 19) : { snapped: false, x: rawCad.x, y: rawCad.y };
              var finalX = snapResult.snapped ? snapResult.x : rawCad.x;
              var finalY = snapResult.snapped ? snapResult.y : rawCad.y;

              // 스냅 인디케이터 표시
              if (snapResult.snapped) {
                var snapLngLat = window.DxfToGeoJSON.dxfToLngLat(finalX, finalY);
                if (snapLngLat) {
                  var snapPx = overlayInstance.getProjection().fromLatLngToContainerPixel(new google.maps.LatLng(snapLngLat[1], snapLngLat[0]));
                  if (snapPx) {
                    showSnapIndicator(snapPx.x, snapPx.y, snapResult.label);
                  }
                }
              } else {
                hideSnapIndicator();
              }

              // 마커 카드 위치 실시간 추종
              var curLngLat = window.DxfToGeoJSON.dxfToLngLat(finalX, finalY);
              if (curLngLat) {
                var curPx = overlayInstance.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(curLngLat[1], curLngLat[0]));
                if (curPx) {
                  div.style.left = curPx.x + 'px';
                  div.style.top = curPx.y + 'px';
                }
              }
            }
          }
          });
        }
      };

      var onMouseUp = function (upEvent) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        hideSnapIndicator();

        if (map) {
          map.setOptions({ gestureHandling: 'greedy', draggable: true });
        }

        if (isDragging) {
          div.classList.remove('is-dragging');
          isDragging = false;
          overlayInstance.justDragged = true;
          setTimeout(function () { overlayInstance.justDragged = false; }, 300);

          var container = document.querySelector('.canvas-container');
          if (!container || !overlayInstance.getProjection()) return;
          var rect = container.getBoundingClientRect();
          var point = new google.maps.Point(upEvent.clientX - rect.left, upEvent.clientY - rect.top);
          var latLng = overlayInstance.getProjection().fromContainerPixelToLatLng(point);

          if (latLng && window.DxfToGeoJSON && window.DxfToGeoJSON.lngLatToDxf) {
            var rawCad = window.DxfToGeoJSON.lngLatToDxf(latLng.lng(), latLng.lat());
            if (rawCad) {
              var snapResult = (isSnapEnabled && !upEvent.shiftKey) ? findClosestSnapPoint(rawCad.x, rawCad.y, map ? map.getZoom() : 19) : { snapped: false, x: rawCad.x, y: rawCad.y };
              var newCadX = snapResult.snapped ? snapResult.x : rawCad.x;
              var newCadY = snapResult.snapped ? snapResult.y : rawCad.y;

              var targetPhoto = overlayInstance.photo || photo;
              // 1. 마커 및 관련 텍스트(번호, 제원) 좌표 일괄 업데이트
              updatePhotoAndRelatedCoords(targetPhoto, newCadX, newCadY);

              // 2. [위치 영구 고정] 오버레이의 div 위치를 최종 확정 좌표로 동기화
              targetPhoto.position.x = newCadX;
              targetPhoto.position.y = newCadY;

              // [포개진 마커 분리 이동] 겹쳐 있던 그룹에서 옮긴 경우 마커 관계를 재계산하여 단독 분리 완성!
              if (overlayInstance.isMultiple) {
                drawPhotoOverlays();
              } else {
                overlayInstance.draw();
                updateMarkerModeOnMap();
                updateLabelsOnMap();
              }

              // 3. 메타데이터 실시간 저장 수행
              saveCurrentPhoto();

              var snapMsg = snapResult.snapped ? (' (' + snapResult.label + ')') : '';
              console.log('NDMAP: 마커 이동 완료 -> X: ' + newCadX.toFixed(3) + ', Y: ' + newCadY.toFixed(3) + snapMsg);
            }
          }
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  /** [신규 UI 연동] 스냅 토글, 마커 삭제, 새 마커 추가, 사진 복사/붙여넣기 이벤트 종합 바인딩 */
  function setupNewMarkerAndCopyPasteUI() {
    var addMarkerBtn = document.getElementById('map-add-marker-btn');
    var copyBtn = document.getElementById('photo-copy-btn');
    var pasteBtn = document.getElementById('photo-paste-btn');
    var deleteBtn = document.getElementById('photo-delete-btn');
    var snapToggleBtn = document.getElementById('map-snap-toggle');

    // 0. [스냅: 켬/끔] 토글 단추
    if (snapToggleBtn) {
      snapToggleBtn.addEventListener('click', function () {
        isSnapEnabled = !isSnapEnabled;
        if (isSnapEnabled) {
          snapToggleBtn.classList.add('active');
          snapToggleBtn.textContent = '스냅: 켬';
        } else {
          snapToggleBtn.classList.remove('active');
          snapToggleBtn.textContent = '스냅: 끔';
          hideSnapIndicator();
        }
      });
    }

    // 0-1. [🗑️ 마커 삭제] 단추 바인딩
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        deleteCurrentPhotoMarker();
      });
    }

    // 1. [＋ 새 마커 추가] 토글 단추
    if (addMarkerBtn) {
      addMarkerBtn.addEventListener('click', function () {
        if (!metadata) {
          alert('먼저 작업 폴더나 메타데이터 JSON을 열어주세요.');
          return;
        }

        isAddMarkerActive = !isAddMarkerActive;
        if (isAddMarkerActive) {
          addMarkerBtn.classList.add('active-add-marker');
          addMarkerBtn.textContent = '취소 (ESC)';
          if (map) map.setOptions({ draggableCursor: 'crosshair' });
        } else {
          cancelAddMarkerMode();
        }
      });
    }

    // ESC 누르면 새 마커 모드 취소
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isAddMarkerActive) {
        cancelAddMarkerMode();
      }
    });

    // 지도 상에서 마우스 이동 시 스냅 가이드 제공 (새 마커 모드 시)
    if (map) {
      map.addListener('mousemove', function (e) {
        if (!isAddMarkerActive || !window.DxfToGeoJSON) return;
        var latLng = e.latLng;
        var rawCad = window.DxfToGeoJSON.lngLatToDxf(latLng.lng(), latLng.lat());
        if (!rawCad) return;

        var snapResult = (isSnapEnabled && !e.shiftKey) ? findClosestSnapPoint(rawCad.x, rawCad.y, map.getZoom()) : { snapped: false, x: rawCad.x, y: rawCad.y };
        if (snapResult.snapped) {
          var snapLngLat = window.DxfToGeoJSON.dxfToLngLat(snapResult.x, snapResult.y);
          if (snapLngLat && overlays.length > 0 && overlays[0].getProjection()) {
            var container = document.querySelector('.canvas-container');
            var rect = container.getBoundingClientRect();
            var px = overlays[0].getProjection().fromLatLngToContainerPixel(new google.maps.LatLng(snapLngLat[1], snapLngLat[0]));
            if (px) {
              showSnapIndicator(px.x, px.y, snapResult.label);
              return;
            }
          }
        }
        hideSnapIndicator();
      });

      // 지도 빈 곳 클릭 시 미니 말풍선 팝업 자동 닫기
      map.addListener('click', function (e) {
        hideMiniOverlapPopover();
        if (!isAddMarkerActive || !window.DxfToGeoJSON) return;

        var latLng = e.latLng;
        var rawCad = window.DxfToGeoJSON.lngLatToDxf(latLng.lng(), latLng.lat());
        if (!rawCad) return;

        var snapResult = (isSnapEnabled && !e.shiftKey) ? findClosestSnapPoint(rawCad.x, rawCad.y, map.getZoom()) : { snapped: false, x: rawCad.x, y: rawCad.y };
        var newX = snapResult.snapped ? snapResult.x : rawCad.x;
        var newY = snapResult.snapped ? snapResult.y : rawCad.y;

        // 새 사진 번호 채번: 기존 번호 중 최대값 + 1
        var maxNum = 0;
        if (metadata.texts) {
          metadata.texts.forEach(function (t) {
            var m = String(t.text || '').match(/\d+/);
            if (m) {
              var n = parseInt(m[0], 10);
              if (!isNaN(n) && n > maxNum) maxNum = n;
            }
          });
        }
        var nextNum = maxNum > 0 ? (maxNum + 1) : (metadata.photos ? metadata.photos.length + 1 : 1);

        // 1. 번호 텍스트 생성
        var textUniqueId = 'txt_' + Date.now();
        var newNumTextObj = {
          id: textUniqueId,
          text: String(nextNum),
          layer: '사진번호_T',
          position: { x: newX, y: newY },
          x: newX,
          y: newY,
          color: 7
        };
        metadata.texts.push(newNumTextObj);

        // 2. 새 사진(마커) 객체 생성
        var photoUniqueId = 'photo_new_' + Date.now();
        var newPhotoObj = {
          id: photoUniqueId,
          fileName: '', // 초기 사진 없음 상태
          facilityType: '일반사진',
          numTextId: textUniqueId,
          specTextIds: [],
          position: { x: newX, y: newY },
          memo: '',
          edited: true
        };
        metadata.photos.push(newPhotoObj);

        // 모드 해제 및 화면 반영
        cancelAddMarkerMode();
        drawPhotoOverlays();
        selectPhoto(photoUniqueId);

        // 실시간 저장
        saveCurrentPhoto();

        var snapNote = snapResult.snapped ? (' (' + snapResult.label + ')') : '';
        alert('사진 #' + nextNum + ' 새 마커가 생성되었습니다!' + snapNote + '\n우측 사이드바에서 시설물 속성과 메모를 입력하거나, [사진 붙여넣기]로 사진을 연결하세요.');
      });
    }

    // 2. [📋 사진 복사] 단추 바인딩
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!selectedPhotoId || !metadata || !metadata.photos) {
          alert('복사할 원본 사진 마커를 먼저 선택해 주세요.');
          return;
        }

        var curPhoto = metadata.photos.find(function (p) { return p.id === selectedPhotoId; });
        if (!curPhoto || !curPhoto.fileName) {
          alert('현재 선택된 마커에는 등록된 사진 파일이 없습니다.');
          return;
        }

        var numStr = '';
        if (curPhoto.numTextId && metadata.texts) {
          var tObj = metadata.texts.find(function (t) { return t.id === curPhoto.numTextId; });
          if (tObj) numStr = '#' + tObj.text;
        }

        copiedPhotoBuffer = {
          fileName: curPhoto.fileName,
          numStr: numStr,
          sourceId: curPhoto.id
        };

        if (pasteBtn) {
          pasteBtn.style.display = 'inline-flex';
          pasteBtn.textContent = '📥 사진 붙여넣기 (' + (numStr || curPhoto.fileName) + ')';
        }

        alert('사진 ' + (numStr || curPhoto.fileName) + '이(가) 복사되었습니다!\n다른 마커를 선택한 후 [📥 사진 붙여넣기]를 클릭하면 바로 연결됩니다.');
      });
    }

    // 3. [📥 사진 붙여넣기] 단추 바인딩
    if (pasteBtn) {
      pasteBtn.addEventListener('click', function () {
        if (!copiedPhotoBuffer) {
          alert('복사된 사진이 없습니다. 먼저 다른 마커에서 [📋 사진 복사]를 눌러주세요.');
          return;
        }

        if (!selectedPhotoId || !metadata || !metadata.photos) {
          alert('사진을 붙여넣을 대상 마커를 선택해 주세요.');
          return;
        }

        var curPhoto = metadata.photos.find(function (p) { return p.id === selectedPhotoId; });
        if (!curPhoto) return;

        curPhoto.fileName = copiedPhotoBuffer.fileName;
        curPhoto.edited = true;

        selectPhoto(curPhoto.id);
        drawPhotoOverlays();
        saveCurrentPhoto();

        alert('사진 ' + copiedPhotoBuffer.numStr + '이(가) 현재 마커에 성공적으로 연결·삽입되었습니다!');
      });
    }
  }

  function cancelAddMarkerMode() {
    isAddMarkerActive = false;
    var addMarkerBtn = document.getElementById('map-add-marker-btn');
    if (addMarkerBtn) {
      addMarkerBtn.classList.remove('active-add-marker');
      addMarkerBtn.textContent = '＋ 새 마커';
    }
    if (map) map.setOptions({ draggableCursor: '' });
    hideSnapIndicator();
  }


  /** [신규 기능] 현재 선택된 마커와 관련 번호·제원 문자 전체 영구 삭제 */
  function deleteCurrentPhotoMarker() {
    if (!selectedPhotoId || !metadata || !metadata.photos) {
      alert('삭제할 마커를 먼저 선택해 주세요.');
      return;
    }
    var curPhoto = metadata.photos.find(function (p) { return p.id === selectedPhotoId; });
    if (!curPhoto) return;

    var numStr = '';
    if (curPhoto.numTextId && metadata.texts) {
      var tObj = metadata.texts.find(function (t) { return t.id === curPhoto.numTextId; });
      if (tObj) numStr = '#' + tObj.text;
    }
    if (!numStr) numStr = curPhoto.fileName || '선택된 마커';

    if (!confirm('사진 ' + numStr + ' 마커를 정말로 삭제하시겠습니까?\n이 마커에 연결된 시설물 제원과 도면 문자도 함께 완전히 삭제됩니다.')) {
      return;
    }

    recordUndoSnapshot();

    // 1. 도면 문자(texts) 삭제 (사진 번호 + 시설물 제원 텍스트 전체)
    var textIdsToRemove = [];
    if (curPhoto.numTextId) textIdsToRemove.push(curPhoto.numTextId);
    if (curPhoto.specTextIds && curPhoto.specTextIds.length > 0) {
      textIdsToRemove = textIdsToRemove.concat(curPhoto.specTextIds);
    } else if (curPhoto.specTextId) {
      textIdsToRemove.push(curPhoto.specTextId);
    }

    if (metadata.texts && textIdsToRemove.length > 0) {
      metadata.texts = metadata.texts.filter(function (t) {
        return textIdsToRemove.indexOf(t.id) === -1;
      });
    }

    // 2. photos 배열에서 제거
    var photoIdx = metadata.photos.indexOf(curPhoto);
    if (photoIdx !== -1) {
      metadata.photos.splice(photoIdx, 1);
    }

    // 3. 지도 오버레이 갱신 (현재 텍스트끔/마커끔 상태 철저 보존)
    drawPhotoOverlays();
    updateMarkerModeOnMap();
    updateLabelsOnMap();

    // 4. 다음 마커 선택 또는 패널 초기화
    if (metadata.photos.length > 0) {
      var nextIdx = Math.min(photoIdx, metadata.photos.length - 1);
      selectPhoto(metadata.photos[nextIdx].id);
    } else {
      selectedPhotoId = null;
      document.getElementById('detail-panel').style.display = 'none';
      document.getElementById('welcome-panel').style.display = 'block';
    }

    // 5. 실시간 저장
    saveCurrentPhoto();
    alert('사진 ' + numStr + ' 마커가 성공적으로 삭제되었습니다.');
  }


  // =========================================================================
  // ★ [스파이더파이(Spiderfy) 부채꼴 펼침 & 정밀 분리 엔진]
  // =========================================================================
  var activeSpiderfyGroup = [];
  var spiderHubElements = [];

  /** 겹친 마커들을 부채꼴 모양으로 촤라락 펼쳐주는 함수 */
  function triggerSpiderfy(centerOverlay, groupPhotos) {
    collapseSpiderfy(); // 기존 펼침 닫기
    if (!centerOverlay || !centerOverlay.div || !groupPhotos || groupPhotos.length <= 1) return;

    var parent = centerOverlay.div.parentNode;
    if (!parent) return;

    // 해당 그룹에 속하는 오버레이 인스턴스들 수집
    var targetOverlays = [];
    groupPhotos.forEach(function (p) {
      var ov = overlays.find(function (o) { return o.photo && o.photo.id === p.id; });
      if (ov && ov.div) targetOverlays.push(ov);
    });

    if (targetOverlays.length <= 1) return;

    // 현재 마커 DOM의 픽셀 좌표 직접 취득 (오차 없는 완벽한 정렬)
    var centerLeft = parseFloat(centerOverlay.div.style.left) || 0;
    var centerTop = parseFloat(centerOverlay.div.style.top) || 0;

    var count = targetOverlays.length;
    // 마커 개수에 따른 부채꼴 반경 (픽셀)
    var radius = count <= 3 ? 60 : (count <= 5 ? 80 : 100);

    // 중심 허브 점(점멸 원) 표시
    var hubDot = document.createElement('div');
    hubDot.className = 'spider-hub-dot';
    hubDot.style.left = centerLeft + 'px';
    hubDot.style.top = centerTop + 'px';
    parent.appendChild(hubDot);
    spiderHubElements.push(hubDot);

    // 부채꼴 각도 계산 (12시 방향 중심 부채꼴, 6개 초과 시 원형 방사)
    var angleStep = count <= 4 ? 0.48 : 0.38; // 라디안 각도 (약 22~28도)
    var startAngle = -Math.PI / 2 - ((count - 1) * angleStep) / 2;
    if (count > 6) {
      startAngle = -Math.PI / 2;
      angleStep = (2 * Math.PI) / count;
    }

    targetOverlays.forEach(function (ov, idx) {
      var angle = startAngle + idx * angleStep;
      var offsetX = Math.cos(angle) * radius;
      var offsetY = Math.sin(angle) * radius;

      ov.isSpiderfied = true;
      ov.originalDivLeft = centerLeft;
      ov.originalDivTop = centerTop;

      // 거미줄 연결선(Leg) 생성
      var leg = document.createElement('div');
      leg.className = 'spider-hub-leg';
      leg.style.left = centerLeft + 'px';
      leg.style.top = centerTop + 'px';
      leg.style.width = radius + 'px';
      leg.style.transform = 'rotate(' + (angle * 180 / Math.PI) + 'deg)';
      parent.appendChild(leg);
      spiderHubElements.push(leg);

      // 마커를 부채꼴 위치로 이동 (CSS transition으로 부드럽게 펼쳐짐)
      if (ov.div) {
        ov.div.classList.add('spiderfied');
        ov.div.style.left = (centerLeft + offsetX) + 'px';
        ov.div.style.top = (centerTop + offsetY) + 'px';
      }

      activeSpiderfyGroup.push(ov);
    });
  }

  /** 부채꼴로 펼쳐진 마커들을 원래 위치로 쏙 접어 넣는 함수 */
  function collapseSpiderfy(exceptPhotoId) {
    if (activeSpiderfyGroup.length > 0) {
      activeSpiderfyGroup.forEach(function (ov) {
        ov.isSpiderfied = false;
        if (ov.div && (!exceptPhotoId || (ov.photo && ov.photo.id !== exceptPhotoId))) {
          ov.div.classList.remove('spiderfied');
          ov.draw(); // 원래 도면 위치로 복원
        }
      });
      activeSpiderfyGroup = [];
    }

    // 허브 점 및 거미줄 선 삭제
    if (spiderHubElements.length > 0) {
      spiderHubElements.forEach(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      spiderHubElements = [];
    }
  }


  // =========================================================================
  // ★ [방안 1: 초경량 미니 말풍선 겹침 셀렉터 엔진]
  // =========================================================================
  var currentMiniPopover = null;

  function hideMiniOverlapPopover() {
    if (currentMiniPopover && currentMiniPopover.parentNode) {
      currentMiniPopover.parentNode.removeChild(currentMiniPopover);
    }
    currentMiniPopover = null;
  }

  // 외부 클릭 시 미니 말풍선 닫기 리스너 (1회 등록)
  document.addEventListener('click', function (e) {
    if (currentMiniPopover && !currentMiniPopover.contains(e.target) && !e.target.closest('.photo-overlay-card')) {
      hideMiniOverlapPopover();
    }
  });

  function showMiniOverlapPopover(clientX, clientY, overlayInstance) {
    hideMiniOverlapPopover();
    if (!overlayInstance || !overlayInstance.overlaps || overlayInstance.overlaps.length <= 1) return;

    var popover = document.createElement('div');
    popover.className = 'mini-overlap-popover';

    var header = document.createElement('div');
    header.className = 'mini-overlap-header';
    header.innerHTML = '<div style="display:flex;align-items:center;gap:6px;"><span>포개진 사진 선택</span><span class="count-badge">' + overlayInstance.overlaps.length + '장</span></div><button style="background:none;border:none;color:#94a3b8;font-size:14px;cursor:pointer;padding:0 2px;line-height:1;" title="닫기">×</button>';
    var closeBtn = header.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(ev) {
        ev.stopPropagation();
        hideMiniOverlapPopover();
      });
    }
    popover.appendChild(header);

    var list = document.createElement('div');
    list.className = 'mini-overlap-list';

    overlayInstance.overlaps.forEach(function (p) {
      var numStr = '';
      if (metadata && metadata.texts && p.numTextId) {
        var txtObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
        if (txtObj) numStr = '#' + txtObj.text;
      }
      if (!numStr) numStr = '사진';

      var item = document.createElement('div');
      item.className = 'mini-overlap-item' + (p.id === selectedPhotoId ? ' active' : '');

      var thumb = document.createElement('img');
      thumb.className = 'mini-overlap-thumb';
      thumb.src = photoBlobUrls[p.fileName] || '';

      var info = document.createElement('div');
      info.className = 'mini-overlap-info';

      var title = document.createElement('div');
      title.className = 'mini-overlap-title';
      title.textContent = numStr + ' ' + (p.facilityType || '');

      var sub = document.createElement('div');
      sub.className = 'mini-overlap-sub';
      var subText = p.memo || getPhotoSummaryText(p) || p.fileName;
      if (p.sourceFile) {
        subText = '[' + p.sourceFile + '] ' + subText;
      }
      sub.textContent = subText;

      info.appendChild(title);
      info.appendChild(sub);
      item.appendChild(thumb);
      item.appendChild(info);

      item.addEventListener('click', function (ev) {
        ev.stopPropagation();
        // 오버레이가 가리키는 활성 사진을 사용자가 선택한 사진으로 즉시 전환
        overlayInstance.photo = p;
        selectPhoto(p.id);
        openPhotoViewerWithSiblings(p, overlayInstance.overlaps);

        // 선택 스타일 갱신
        var items = list.querySelectorAll('.mini-overlap-item');
        items.forEach(function (it) { it.classList.remove('active'); });
        item.classList.add('active');

        // 카드 썸네일/텍스트 갱신
        if (overlayInstance.div) {
          var img = overlayInstance.div.querySelector('.photo-overlay-thumb img');
          if (img) img.src = photoBlobUrls[p.fileName] || '';
          var num = overlayInstance.div.querySelector('.photo-overlay-num');
          if (num) num.textContent = numStr;
          var txt = overlayInstance.div.querySelector('.photo-overlay-text');
          if (txt) txt.textContent = getPhotoSummaryText(p);
        }
      });

      list.appendChild(item);
    });

    popover.appendChild(list);

    // 마우스 위치 바로 옆에 뜨도록 좌표 보정
    var posX = clientX + 14;
    var posY = clientY - 10;
    if (posX + 260 > window.innerWidth) posX = clientX - 260;
    if (posY + 260 > window.innerHeight) posY = window.innerHeight - 270;
    if (posY < 10) posY = 10;

    popover.style.left = posX + 'px';
    popover.style.top = posY + 'px';

    document.body.appendChild(popover);
    currentMiniPopover = popover;
  }


  // =========================================================================
  // ★ [시설물 카드 상하 순서 변경 엔진]
  // =========================================================================
  function moveAttributeCard(card, direction) {
    var container = card.parentNode;
    if (!container) return;

    if (direction === -1) {
      var prev = card.previousElementSibling;
      if (prev) {
        container.insertBefore(card, prev);
      }
    } else if (direction === 1) {
      var next = card.nextElementSibling;
      if (next) {
        container.insertBefore(next, card);
      }
    }

    // 주시설물(1번째)과 부속시설물(2번째 이후) 속성 자동 재동기화 및 각 카드 미리보기 갱신
    var cards = container.querySelectorAll('.attribute-card');
    cards.forEach(function (c, idx) {
      if (idx === 0) {
        c.removeAttribute('data-is-sub');
      } else {
        c.setAttribute('data-is-sub', 'true');
      }
      var cType = c.getAttribute('data-facility-type');
      var cConfig = FACILITY_CONFIG[cType];
      if (cConfig) {
        updateCardPrefixBadge(c);
        updateSpecPreview(c, cConfig);
      }
    });

    updateFloatingWindowSpecs(); // 화면 오버레이 실시간 갱신 (사진창은 그대로 열림 유지!)
  }

  // =========================================================================
  // ★ [사진 치수 실측 모듈 연동 엔진 (index.html 과 100% 동일)]
  // =========================================================================
  function launchPhotoMeasure() {
    if (!selectedPhotoId || !metadata || !metadata.photos) {
      alert('치수를 실측할 사진을 먼저 지도에서 선택해 주세요.');
      return;
    }
    var photo = metadata.photos.find(function (p) { return p.id === selectedPhotoId; });
    if (!photo) return;

    var imgSrc = photoBlobUrls[photo.fileName];
    var modalImg = document.getElementById('image-modal-src');
    if (modalImg && modalImg.src && modalImg.src.startsWith('blob:')) {
      imgSrc = modalImg.src;
    }

    if (!imgSrc) {
      alert('사진 이미지를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // 실측 시야 확보를 위해 플로팅 사진창이 열려 있다면 잠시 숨김 (닫거나 완료 시 복원)
    var fw = document.getElementById('floating-image-window');
    var fwWasVisible = fw && (fw.style.display !== 'none');
    if (fw) fw.style.display = 'none';
    window._phmFwWasVisible = fwWasVisible;

    var closeBtn = document.getElementById('phm-btn-close');
    if (closeBtn && !closeBtn._restoreFwHooked) {
      closeBtn._restoreFwHooked = true;
      closeBtn.addEventListener('click', function () {
        if (window._phmFwWasVisible) {
          var w = document.getElementById('floating-image-window');
          if (w) w.style.display = 'flex';
          window._phmFwWasVisible = false;
        }
      });
    }

    if (window.PhotoMeasure) {
      window.PhotoMeasure.open(imgSrc, function (annotatedBlob) {
        window._phmFwWasVisible = false;
        var newFileName = '치수실측_' + Date.now() + '.jpg';
        var file = new File([annotatedBlob], newFileName, { type: 'image/jpeg' });
        photoBlobs[newFileName] = file;
        photoBlobUrls[newFileName] = URL.createObjectURL(file);

        if (!photo.subPhotos) photo.subPhotos = [];
        photo.subPhotos.push({
          fileName: newFileName,
          type: '치수실측'
        });

        // 뷰어 및 썸네일 갱신
        openPhotoViewerWithSiblings(photo, [photo]);

        alert('📐 치수 실측이 완료되었습니다!\n실측 주석 사진이 보조 사진으로 추가되었습니다.\n측정된 수치(높이, 폭)를 확인하시고 제원 입력칸에 직접 입력해 주세요.');
        saveCurrentPhoto();
      });

      // PC 분할 모드 영역 크기 변화에 맞춰 사진 캔버스 자동 최적화
      setTimeout(function () {
        if (window.PhotoMeasure && typeof window.PhotoMeasure.fitToScreen === 'function') {
          window.PhotoMeasure.fitToScreen();
        }
      }, 60);
    } else {
      alert('PhotoMeasure 모듈을 불러오지 못했습니다. 페이지를 새로고침(Ctrl+F5)해 주세요.');
    }
  }

  // 치수 실측 단추 이벤트 바인딩 등록
  function initMeasureButtons() {
    var panelBtn = document.getElementById('panel-photo-measure-btn');
    if (panelBtn) panelBtn.addEventListener('click', launchPhotoMeasure);
    var winBtn = document.getElementById('window-measure-btn');
    if (winBtn) winBtn.addEventListener('click', launchPhotoMeasure);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMeasureButtons);
  } else {
    initMeasureButtons();
  }


  // =========================================================================
  // ★ [서브 카드 단독 분리 이동 드래그 엔진]
  // =========================================================================
  function bindSubCardDrag(overlayInstance, subCardEl, subPhoto) {
    var isDragging = false;
    var startX = 0, startY = 0;
    var dragThreshold = 5;

    subCardEl.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (isAddMarkerActive) return;

      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;

      var onMouseMove = function (moveEvent) {
        var dx = moveEvent.clientX - startX;
        var dy = moveEvent.clientY - startY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (!isDragging && dist > dragThreshold) {
          isDragging = true;
          subCardEl.classList.add('is-dragging');
          if (map) {
            map.setOptions({ gestureHandling: 'none', draggable: false });
          }
        }

        if (isDragging) {
          var container = document.querySelector('.canvas-container');
          if (!container || !overlayInstance.getProjection()) return;
          var rect = container.getBoundingClientRect();
          var point = new google.maps.Point(moveEvent.clientX - rect.left, moveEvent.clientY - rect.top);
          var latLng = overlayInstance.getProjection().fromContainerPixelToLatLng(point);

          if (latLng && window.DxfToGeoJSON && window.DxfToGeoJSON.lngLatToDxf) {
            var rawCad = window.DxfToGeoJSON.lngLatToDxf(latLng.lng(), latLng.lat());
            if (rawCad) {
              var snapResult = (isSnapEnabled && !moveEvent.shiftKey) ? findClosestSnapPoint(rawCad.x, rawCad.y, map ? map.getZoom() : 19) : { snapped: false, x: rawCad.x, y: rawCad.y };
              var finalX = snapResult.snapped ? snapResult.x : rawCad.x;
              var finalY = snapResult.snapped ? snapResult.y : rawCad.y;

              if (snapResult.snapped) {
                var snapLngLat = window.DxfToGeoJSON.dxfToLngLat(finalX, finalY);
                if (snapLngLat) {
                  var snapPx = overlayInstance.getProjection().fromLatLngToContainerPixel(new google.maps.LatLng(snapLngLat[1], snapLngLat[0]));
                  if (snapPx) {
                    showSnapIndicator(snapPx.x, snapPx.y, snapResult.label);
                  }
                }
              } else {
                hideSnapIndicator();
              }
            }
          }
        }
      };

      var onMouseUp = function (upEvent) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        hideSnapIndicator();

        if (map) {
          map.setOptions({ gestureHandling: 'greedy', draggable: true });
        }

        if (isDragging) {
          subCardEl.classList.remove('is-dragging');
          isDragging = false;

          var container = document.querySelector('.canvas-container');
          if (!container || !overlayInstance.getProjection()) return;
          var rect = container.getBoundingClientRect();
          var point = new google.maps.Point(upEvent.clientX - rect.left, upEvent.clientY - rect.top);
          var latLng = overlayInstance.getProjection().fromContainerPixelToLatLng(point);

          if (latLng && window.DxfToGeoJSON && window.DxfToGeoJSON.lngLatToDxf) {
            var rawCad = window.DxfToGeoJSON.lngLatToDxf(latLng.lng(), latLng.lat());
            if (rawCad) {
              var snapResult = (isSnapEnabled && !upEvent.shiftKey) ? findClosestSnapPoint(rawCad.x, rawCad.y, map ? map.getZoom() : 19) : { snapped: false, x: rawCad.x, y: rawCad.y };
              var newCadX = snapResult.snapped ? snapResult.x : rawCad.x;
              var newCadY = snapResult.snapped ? snapResult.y : rawCad.y;

              // [단독 분리 이동 확정] 서브 사진만 단독으로 새 좌표로 이동!
              updatePhotoAndRelatedCoords(subPhoto, newCadX, newCadY);
              subPhoto.position.x = newCadX;
              subPhoto.position.y = newCadY;

              // 전체 오버레이 재계산으로 독립 마커로 분리
              drawPhotoOverlays();
              selectPhoto(subPhoto.id);
              saveCurrentPhoto();

              console.log('NDMAP: 서브 사진 단독 분리 이동 완료 ->', subPhoto.fileName, newCadX, newCadY);
            }
          }
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

})();