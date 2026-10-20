console.log("NDMAP MAP-EDITOR V2 LOADED - PATCH V3.3 SNAP & FIX");
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
      var photoTitle = '사진 원본 보기 (' + numStr + ' - ' + activePhoto.fileName + ')';

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
            getEl('floating-window-title').textContent = '사진 원본 보기 (' + actNum + ' - ' + p.fileName + ')';
            
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
        texts: []
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

  function getModifiedMetadataFileName() {
    if (loadedMetadataFileNames && loadedMetadataFileNames.length > 1) {
      // 다중 로드된 파일들인 경우 파일명들을 결합하여 파일 이름 빌드
      var baseNames = loadedMetadataFileNames.map(function (name) {
        return name.replace('_metadata.json', '').replace('.json', '');
      });
      return baseNames.join('_') + '_수정.json';
    }

    var base = originalMetadataFileName || 'metadata.json';
    if (base.toLowerCase().endsWith('.json')) {
      var nameWithoutExt = base.substring(0, base.length - 5);
      if (nameWithoutExt.endsWith('_수정')) {
        return nameWithoutExt + '.json';
      }
      return nameWithoutExt + '_수정' + '.json';
    }
    return base + '_수정.json';
  }

  async function saveMetadataToLocalFolder(data) {
    if (!dirHandle) return false;
    try {
      var targetName = getModifiedMetadataFileName();
      var permissionOpts = { mode: 'readwrite' };
      
      // 권한 승인 검사
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

  function onOverlayAdd() {
    var self = this;
    var div = document.createElement('div');
    div.className = 'photo-overlay-card';
    div.setAttribute('data-photo-id', this.photo.id);
    
    // [고도화 추가] 작업 완료(저장됨) 상태인 경우 완료 클래스 추가 (수동 저장 클릭 시만 완료로 판정)
    var isSaved = this.photo.edited === true;
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
    if (metadata && metadata.texts) {
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
      labelHtml += '<div class="label-photo-specs">' + specTexts.join('<br>') + '</div>';
    }

    if (this.photo.memo && !isAutoGeneratedMemo(this.photo.memo)) {
      labelHtml += '<div class="label-photo-memo">' + this.photo.memo + '</div>';
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
      // 1. 저배율 클러스터 노드인 경우 클릭 시 해당 범위 줌인 (17레벨 이하 대응)
      if (self.isClusterRepresentation && map && map.getZoom() <= 17) {
        map.setZoom(18);
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

    // 저배율(17 이하)일 때 클러스터 대표 마커가 아니면 화면에서 강제 은닉
    if (map && map.getZoom() <= 17 && !this.isClusterRepresentation) {
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
          if (metadata && metadata.texts) {
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
            labelHtml += '<div class="label-photo-specs">' + specTexts.join('<br>') + '</div>';
          }
          if (o.photo.memo && !isAutoGeneratedMemo(o.photo.memo)) {
            labelHtml += '<div class="label-photo-memo">' + o.photo.memo + '</div>';
          }

          // 겹침의 대표인 경우 우측 상단 ＋N 뱃지와 호버용 하위 서브 패널도 실시간 동기화
          if (o.isMultiple && o.photo === o.overlaps[0]) {
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

        o.div.classList.remove('marker-dot-mode', 'text-only-mode', 'cluster-mode');
        
        // [고도화 추가] 편집창에서 저장이 완료(edited === true)된 사진은 깔끔한 파란색 원 마커로만 강제 표시 (클러스터 노출은 예외)
        var isSaved = o.photo.edited === true;
        if (isSaved && !(map && map.getZoom() <= 17 && o.isClusterRepresentation)) {
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
          if (!(map && map.getZoom() <= 17 && !o.isClusterRepresentation)) {
            o.div.style.display = 'block';
          }
        }
        
        // 1. 클러스터 그룹 마커 모드 적용 (줌레벨 17 이하)
        if (map && map.getZoom() <= 17 && o.isClusterRepresentation) {
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

  // [고도화 추가] 줌 또는 범위 변경 시 마커 필터링 및 클러스터 계산 처리
  function handleMapZoomOrBoundsChange() {
    var zoom = map ? map.getZoom() : 16;
    if (zoom <= 17) {
      recalculateClusters();
    } else {
      restoreIndividualMarkers();
    }
    updateMarkerModeOnMap();
    updateLabelsOnMap();
    overlays.forEach(function (o) { o.draw(); });
  }

  // [고도화 추가] 거리 기반 클러스터링 알고리즘
  function recalculateClusters() {
    if (!metadata || !metadata.photos) return;
    
    var zoom = map ? map.getZoom() : 17;
    var distThreshold = 20.0; // 줌 17 대응
    if (zoom === 16) distThreshold = 30.0;
    else if (zoom === 15) distThreshold = 55.0;
    else if (zoom === 14) distThreshold = 100.0;
    else if (zoom <= 13) distThreshold = 250.0;
    
    var processed = {};
    
    // 초기화
    overlays.forEach(function (o) {
      o.isClusterRepresentation = false;
      o.clusterCount = 1;
    });

    overlays.forEach(function (o) {
      if (processed[o.photo.id]) return;
      if (!o.photo.position) return;

      var clusterMembers = [o];
      processed[o.photo.id] = true;

      overlays.forEach(function (other) {
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

      // 1) 빈도순 추천어(실제 데이터 기반)를 최상단에 배치 (getFieldSuggestions가 이미 lastSavedFieldValues를 최상단으로 올려줌)
      if (resolvedSuggestions && resolvedSuggestions.length > 0) {
        resolvedSuggestions.forEach(function (sug) {
          if (allItems.indexOf(sug) === -1) {
            allItems.push(sug);
          }
        });
      }

      // 2) 기본 설정 옵션 목록은 빈도 목록에 없는 것만 추가 (후순위, '기타'는 불필요하므로 완전 제외)
      if (options && options.length > 0) {
        options.forEach(function (opt) {
          if (opt !== '기타' && allItems.indexOf(opt) === -1) {
            allItems.push(opt);
          }
        });
      }

      var filtered = allItems;
      if (filterText && filterText.trim() !== '') {
        var q = filterText.trim().toLowerCase();
        filtered = allItems.filter(function (v) {
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

      filtered.forEach(function (val) {
        var item = document.createElement('div');
        item.className = 'custom-dropdown-item';
        item.textContent = val;

        // mousedown 시점에는 브라우저 기본 포커스 아웃(blur) 동작만 차단함
        item.addEventListener('mousedown', function (e) {
          e.preventDefault();
        });

        // 실제 클릭이 완전히 해제(완료)된 click 시점에 로직 실행
        item.addEventListener('click', function (e) {
          input.value = val;
          input.dispatchEvent(new Event('input'));
          
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

    // 플로팅 창이 활성화되어 열려 있다면, 원본 이미지 소스도 같이 업데이트하여 흐름을 끊지 않음
    var floatingWin = getEl('floating-image-window');
    if (floatingWin && floatingWin.style.display === 'flex') {
      getEl('image-modal-src').src = photoBlobUrls[p.fileName] || '';
      getEl('floating-window-title').textContent = '사진 원본 보기 (사진 #' + (p.numTextId ? p.numTextId : '') + ' - ' + p.fileName + ')';
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

    var numStr = '사진';
    if (metadata.texts && p.numTextId) {
      var numObj = metadata.texts.find(function (t) { return t.id === p.numTextId; });
      if (numObj) numStr = '사진 #' + numObj.text;
    }
    
    document.getElementById('sidebar-photo-title').textContent = numStr;
    
    var fileBadge = document.getElementById('sidebar-photo-filename');
    fileBadge.textContent = '(' + p.fileName + ')';
    
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
        renderAttributeCard(cardsContainer, parseResult.facilityType, parseResult.values, tId, parseResult.isSub);
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

    // [엑셀 템플릿 100% 동기화] 엑셀 시트에 적힌 행 순서 그대로 드롭다운에 노출!
    var sortedKeys = candidateKeys;

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

    return { facilityType: fType, values: values, isSub: isSub };
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

  // 시설물 카드의 필드별 다빈도 입력 제안어 추출 (자동완성 이식, 참조 데이터 빈도 병합)
  function getFieldSuggestions(fieldId, layerName, excludeList) {
    var excludes = excludeList || [];
    var counts = {};

    // 1) 현재 로드된 파일들 데이터 집계
    if (metadata && metadata.texts) {
      metadata.texts.forEach(function (t) {
        if (t.layer === layerName) {
          var parseResult = deserializeSpecText(t.text, t.layer);
          if (parseResult && parseResult.values && parseResult.values[fieldId] !== undefined) {
            var val = parseResult.values[fieldId];
            if (val && String(val).trim() !== '' && val !== '기타' && excludes.indexOf(val) === -1) {
              counts[val] = (counts[val] || 0) + 1;
            }
          }
        }
      });
    }

    // 2) 참조 파일들 누적 사전 데이터 병합
    var fType = null;
    for (var key in FACILITY_CONFIG) {
      if (FACILITY_CONFIG[key].layer === layerName || (key + '_T') === layerName) {
        fType = key;
        break;
      }
    }
    if (fType && referenceDictionary[fType] && referenceDictionary[fType][fieldId]) {
      var refVals = referenceDictionary[fType][fieldId];
      for (var val in refVals) {
        if (val !== '기타' && excludes.indexOf(val) === -1) {
          counts[val] = (counts[val] || 0) + refVals[val];
        }
      }
    }

    var list = Object.keys(counts).map(function (k) {
      return { val: k, count: counts[k] };
    });
    list.sort(function (a, b) { return b.count - a.count; });

    var sortedVals = list.slice(0, 10).map(function (item) { return item.val; });

    // [요구사항] 마지막으로 저장한 값을 목록 최상단에 배치
    var lastVal = fType && lastSavedFieldValues[fType] && lastSavedFieldValues[fType][fieldId];
    if (lastVal && lastVal !== '기타' && lastVal.trim() !== '') {
      var existIdx = sortedVals.indexOf(lastVal);
      if (existIdx !== -1) sortedVals.splice(existIdx, 1);
      sortedVals.unshift(lastVal);
      if (sortedVals.length > 10) sortedVals = sortedVals.slice(0, 10);
    }

    return sortedVals;
  }

  // 속성 카드 렌더링
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

    var header = document.createElement('div');
    header.className = 'attribute-card-header';
    
    var title = document.createElement('span');
    title.className = 'attribute-card-title';
    title.textContent = config.title;
    header.appendChild(title);

    var orderGroup = document.createElement('div');
    orderGroup.className = 'attribute-card-order-group';

    var upBtn = document.createElement('button');
    upBtn.className = 'attribute-card-move-btn';
    upBtn.innerHTML = '▲';
    upBtn.title = '위로 이동 (순서 올리기)';
    upBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      moveAttributeCard(card, -1);
    });

    var downBtn = document.createElement('button');
    downBtn.className = 'attribute-card-move-btn';
    downBtn.innerHTML = '▼';
    downBtn.title = '아래로 이동 (순서 내리기)';
    downBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      moveAttributeCard(card, 1);
    });

    var delBtn = document.createElement('button');
    delBtn.className = 'attribute-card-del-btn';
    delBtn.textContent = '제거';
    delBtn.addEventListener('click', function () {
      card.parentNode.removeChild(card);
      updateFloatingWindowSpecs(); // 실시간 오버레이 동기화
      saveCurrentPhoto();
    });

    orderGroup.appendChild(upBtn);
    orderGroup.appendChild(downBtn);
    orderGroup.appendChild(delBtn);
    header.appendChild(orderGroup);
    card.appendChild(header);

    // 부속시설물 판별 (파라미터 전달 또는 컨테이너 내에 이미 카드가 1개 이상 존재할 경우)
    var isSub = isSubParam === true || (container.children && container.children.length > 0);
    if (isSub) {
      card.setAttribute('data-is-sub', 'true');
    }

    var fieldsWrap = document.createElement('div');
    config.fields.forEach(function (f) {
      // 부속시설물일 경우 지주 및 사진 항목 생략
      if (isSub && (f.isSupport || f.isPhoto || /지주|사진/.test(f.label))) {
        return;
      }

      var group = document.createElement('div');
      group.className = 'form-group';
      
      // 신호등의 경우 특정 필드 그룹을 숨기거나 보여주기 위해 ID 속성을 부여함
      if (type === '신호등') {
        group.id = cardId + '-group-' + f.id;
      }

      var label = document.createElement('label');
      label.textContent = f.label;
      group.appendChild(label);

      // 입력값 우선순위: 기존 캐시값 > 마지막 저장값 > 기본값
      // [빈칸 보존 로직] cachedVals에 키가 존재하면(빈칸 ''이더라도!) 기본값으로 덮어쓰지 않고 빈칸 그대로 유지
      var lastSaved = lastSavedFieldValues[type] && lastSavedFieldValues[type][f.id];
      var inputVal = '';
      if (cachedVals && cachedVals[f.id] !== undefined) {
        inputVal = cachedVals[f.id];
      } else if (lastSaved !== undefined && lastSaved !== '') {
        inputVal = lastSaved;
      } else {
        inputVal = f.default || '';
      }
      
      // [1번 요건 개편] 모든 입력 필드를 단일화된 콤보 인풋 박스(input + datalist)로 통일
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control';
      input.setAttribute('data-field-id', f.id);
      input.setAttribute('autocomplete', 'off'); // 브라우저 기본 자동완성 말풍선 차단
      input.value = inputVal;
      input.placeholder = f.placeholder || (f.options ? '목록 선택 또는 직접 입력' : '입력');

      var layerName = config.layer || (type + '_T');
      var suggestions = getFieldSuggestions(f.id, layerName, f.options || []);

      input.addEventListener('input', function () {
        updateSpecPreview(card, config);
        updateFloatingWindowSpecs(); // 실시간 오버레이 동기화
      });

      // 포커스 하이라이트 및 페이드 헬퍼 적용
      setupInputFocusFade(input);

      // 인풋을 먼저 부모에 추가해야 setupCustomDropdown 내부에서 parentNode를 찾을 수 있습니다.
      group.appendChild(input);

      // 커스텀 드롭다운 연동 및 엔터/화살표 키 조작 처리 (방안 2)
      setupCustomDropdown(input, f.options, suggestions);

      fieldsWrap.appendChild(group);
    });
    card.appendChild(fieldsWrap);

    var previewBox = document.createElement('div');
    previewBox.className = 'preview-spec-box';
    card.appendChild(previewBox);

    container.appendChild(card);
    updateSpecPreview(card, config);

    // 신호등 동적 필드 제어 (단일화 완료)
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

        // [사용자 요구사항] 입력란이 빈칸이거나 생략 선택 시 도면 조립에서 완전히 생략!
        if (val === '' || val === '입력생략' || val === '삭제' || val === '제외' || val === '미표기' || val === '없음' || val === '--' || val === '선택' || val === '기타') {
          return;
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

  function updateFloatingWindowSpecs() {
    var specEl = document.getElementById('floating-window-specs');
    if (!specEl) return;

    // 1. 현재 선택된 사진 객체 가져오기
    var currentPhoto = metadata && metadata.photos && metadata.photos.find(function(x) { return x.id === selectedPhotoId; });
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

    // 3. 부모 사진인 경우: 캐드에 실제로 전개될 텍스트 데이터를 3중 백업 구조로 안전하게 수집
    var specTexts = [];
    var foundFromCards = false;
    
    // 3-1) [우선순위 1] 화면에 렌더링된 실시간 속성 카드가 존재한다면, 화면값을 100% 최우선 수집!
    var cards = document.querySelectorAll('.attribute-card');
    if (cards.length > 0) {
      cards.forEach(function (card) {
        var type = card.getAttribute('data-facility-type');
        var config = FACILITY_CONFIG[type];
        if (config) {
          var specStr = buildSpecString(card, config);
          if (specStr) {
            specTexts.push(specStr);
            foundFromCards = true;
          }
        }
      });
    }

    // 3-2) [우선순위 2] 화면에 카드가 없을 때(진입 시점 등)만 데이터 테이블(texts)에서 백업 조회
    if (!foundFromCards) {
      var textIds = currentPhoto.specTextIds || [];
      if (textIds.length === 0 && currentPhoto.specTextId) {
        textIds = [currentPhoto.specTextId];
      }
      if (metadata.texts && textIds.length > 0) {
        textIds.forEach(function (tId) {
          var textObj = metadata.texts.find(function (t) { return t.id === tId; });
          if (textObj && textObj.text) {
            specTexts.push(textObj.text);
          }
        });
      }
    }

    // 3-3) [우선순위 3] 카드도 없고 텍스트 데이터도 없는 경우, 사진 자체의 facilityType이 일반사진이 아니면 대체 출력
    if (specTexts.length === 0) {
      if (currentPhoto.facilityType && currentPhoto.facilityType !== '일반사진') {
        specTexts.push(currentPhoto.facilityType);
      }
    }

    // 4. 자동 생성형 가짜 메모는 거르고, 진짜 입력된 메모만 웹앱과 똑같이 [메모] 접두사 형태로 합치기
    var memoVal = getEl('photo-memo') ? getEl('photo-memo').value : '';
    if (!memoVal && currentPhoto.memo) {
      memoVal = currentPhoto.memo;
    }
    if (memoVal && memoVal.trim() !== '' && !isAutoGeneratedMemo(memoVal)) {
      specTexts.push('[메모] ' + memoVal.trim());
    }

    if (specTexts.length > 0) {
      specEl.textContent = specTexts.join('\n');
      specEl.style.display = 'block';
    } else {
      specEl.textContent = '';
      specEl.style.display = 'none';
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
  async function saveCurrentPhoto() {
    if (!metadata || !selectedPhotoId) return;

    var p = metadata.photos.find(function (x) { return x.id === selectedPhotoId; });
    if (!p) return;

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

      var specStr = buildSpecString(card, config);
      var textId = 'text-spec-' + p.id + '-' + index;
      card.setAttribute('data-existing-text-id', textId);

      var specTextObj = {
        id: textId,
        x: p.position.x,
        y: p.position.y,
        text: specStr,
        layer: config.layer || (type + '_T'),
        color: (config.color !== undefined && config.color !== null) ? Number(config.color) : 7
      };

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

    // 저장 후 플로팅 뷰어 자동 닫기 (하단 썸네일에 겹침 사진이 2장 이상이면 닫지 않음)
    var _fw = getEl('floating-image-window');
    var _thumbs = getEl('floating-window-thumbnails');
    var hasSiblings = _thumbs && _thumbs.children.length > 1;
    if (_fw && !hasSiblings) {
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
    document.getElementById('progress-bar-fill').style.width = pct + '%';
    document.getElementById('progress-percent').textContent = pct + '% (' + completed + '/' + total + '장 완료)';
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

  // 뷰어 이벤트 리스너 초기화 등록
  document.addEventListener('DOMContentLoaded', function () {
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

    // [신규] 탭 인터페이스 초기화 및 검색어 입력 실시간 연동
    setupTabs();
    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        searchSpecs(e.target.value);
      });
    }

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
  });

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

  function setupTabs() {
    var editBtn = document.getElementById('tab-edit-btn');
    var searchBtn = document.getElementById('tab-search-btn');
    var editContent = document.getElementById('tab-edit-content');
    var searchContent = document.getElementById('tab-search-content');

    if (editBtn && searchBtn && editContent && searchContent) {
      editBtn.addEventListener('click', function () {
        editBtn.classList.add('active');
        editBtn.style.borderBottomColor = 'var(--primary)';
        editBtn.style.color = 'var(--text)';
        editBtn.style.fontWeight = '600';

        searchBtn.classList.remove('active');
        searchBtn.style.borderBottomColor = 'transparent';
        searchBtn.style.color = 'var(--text-muted)';
        searchBtn.style.fontWeight = '500';

        editContent.style.display = 'flex';
        searchContent.style.display = 'none';
      });

      searchBtn.addEventListener('click', function () {
        searchBtn.classList.add('active');
        searchBtn.style.borderBottomColor = 'var(--primary)';
        searchBtn.style.color = 'var(--text)';
        searchBtn.style.fontWeight = '600';

        editBtn.classList.remove('active');
        editBtn.style.borderBottomColor = 'transparent';
        editBtn.style.color = 'var(--text-muted)';
        editBtn.style.fontWeight = '500';

        searchContent.style.display = 'flex';
        editContent.style.display = 'none';
      });
    }
  }

  function searchSpecs(query) {
    var listContainer = document.getElementById('search-results-list');
    var placeholder = document.getElementById('search-results-placeholder');
    if (!listContainer || !placeholder) return;

    listContainer.innerHTML = '';

    if (!query || query.trim() === '') {
      placeholder.style.display = 'block';
      placeholder.innerHTML = '검색어를 입력하시면 관련 시설물 분류 정보나 기입력된 속성 단어 목록을 찾아드립니다.<br><span style="font-size: 11px; color: rgba(99, 102, 241, 0.7); display: block; margin-top: 8px;">※ 검색된 단어를 클릭하면 마지막에 활성화되어 있던 편집 칸에 자동으로 채워집니다.</span>';
      return;
    }

    placeholder.style.display = 'none';
    var q = query.trim().toLowerCase();

    // 양방향 검색용 매칭 결과 수집
    var matchedFacilityTypes = []; // 경로 B 매칭: q가 시설물명일 때 해당 시설물의 단어 목록
    var matchedSpecWords = [];     // 경로 A 매칭: q가 단어일 때 해당 단어와 매칭되는 시설물 정보 목록

    // 1. q가 시설물명(예: 교통기타) 또는 그 일부인지 검사 (경로 B)
    for (var fType in FACILITY_CONFIG) {
      if (fType.toLowerCase().indexOf(q) !== -1) {
        var words = getUniqueWordsForFacilityType(fType);
        if (words.length > 0) {
          matchedFacilityTypes.push({
            facilityType: fType,
            words: words
          });
        }
      }
    }

    // 2. q가 단어인지 검사하여 사용된 시설물 매칭 (경로 A)
    var wordMappings = {}; // word -> Set of facilityTypes

    // 2-1) 현재 texts 데이터 스캔
    if (metadata && metadata.texts) {
      metadata.texts.forEach(function (t) {
        var parseResult = deserializeSpecText(t.text, t.layer);
        if (parseResult && parseResult.values) {
          for (var fid in parseResult.values) {
            var val = String(parseResult.values[fid]).trim();
            if (val && val !== '기타' && val.toLowerCase().indexOf(q) !== -1) {
              if (!wordMappings[val]) wordMappings[val] = new Set();
              wordMappings[val].add(parseResult.facilityType);
            }
          }
        }
      });
    }

    // 2-2) referenceDictionary 데이터 스캔
    for (var fType in referenceDictionary) {
      for (var fid in referenceDictionary[fType]) {
        for (var val in referenceDictionary[fType][fid]) {
          if (val && val !== '기타' && val.toLowerCase().indexOf(q) !== -1) {
            if (!wordMappings[val]) wordMappings[val] = new Set();
            wordMappings[val].add(fType);
          }
        }
      }
    }

    // 2-3) referenceMemoSuggestions 스캔
    for (var val in referenceMemoSuggestions) {
      if (val.toLowerCase().indexOf(q) !== -1) {
        if (!wordMappings[val]) wordMappings[val] = new Set();
        wordMappings[val].add('일반사진 메모');
      }
    }
    // 현재 메타데이터 메모도 스캔
    if (metadata && metadata.photos) {
      metadata.photos.forEach(function (p) {
        if (p.memo && p.memo.toLowerCase().indexOf(q) !== -1) {
          var val = p.memo.trim();
          if (!wordMappings[val]) wordMappings[val] = new Set();
          wordMappings[val].add('일반사진 메모');
        }
      });
    }

    for (var word in wordMappings) {
      matchedSpecWords.push({
        word: word,
        facilityTypes: Array.from(wordMappings[word])
      });
    }

    // 결과 렌더링
    var hasResults = false;

    // 경로 A 결과 렌더링 (단어 -> 시설물명)
    if (matchedSpecWords.length > 0) {
      hasResults = true;
      var header = document.createElement('div');
      header.style.fontSize = '12px';
      header.style.fontWeight = '700';
      header.style.color = '#a5b4fc';
      header.style.marginTop = '10px';
      header.style.marginBottom = '6px';
      header.textContent = ' 단어 매칭 결과 (클릭 시 입력창 주입)';
      listContainer.appendChild(header);

      matchedSpecWords.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'overlap-item';
        card.style.padding = '10px 14px';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';
        card.style.gap = '4px';

        var title = document.createElement('div');
        title.style.fontWeight = '600';
        title.style.fontSize = '13px';
        title.style.color = '#f3f4f6';
        title.textContent = item.word;
        card.appendChild(title);

        var desc = document.createElement('div');
        desc.style.fontSize = '11px';
        desc.style.color = 'var(--accent)';
        desc.textContent = '매칭 시설물: ' + item.facilityTypes.join(', ');
        card.appendChild(desc);

        card.addEventListener('click', function () {
          injectSearchWord(item.word);
        });

        listContainer.appendChild(card);
      });
    }

    // 경로 B 결과 렌더링 (시설물명 -> 단어 목록)
    if (matchedFacilityTypes.length > 0) {
      hasResults = true;
      var header = document.createElement('div');
      header.style.fontSize = '12px';
      header.style.fontWeight = '700';
      header.style.color = '#a5b4fc';
      header.style.marginTop = '16px';
      header.style.marginBottom = '6px';
      header.textContent = ' 시설물 내 제원 문자 목록 (클릭 시 입력창 주입)';
      listContainer.appendChild(header);

      matchedFacilityTypes.forEach(function (item) {
        var groupDiv = document.createElement('div');
        groupDiv.style.background = 'rgba(255,255,255,0.02)';
        groupDiv.style.border = '1px solid var(--border)';
        groupDiv.style.borderRadius = '8px';
        groupDiv.style.padding = '12px';
        groupDiv.style.display = 'flex';
        groupDiv.style.flexDirection = 'column';
        groupDiv.style.gap = '8px';

        var groupTitle = document.createElement('div');
        groupTitle.style.fontWeight = '700';
        groupTitle.style.fontSize = '12px';
        groupTitle.style.color = 'var(--text-muted)';
        groupTitle.textContent = '[' + item.facilityType + ']에 등록된 제원 단어';
        groupDiv.appendChild(groupTitle);

        var wordsWrap = document.createElement('div');
        wordsWrap.style.display = 'flex';
        wordsWrap.style.flexWrap = 'wrap';
        wordsWrap.style.gap = '6px';

        item.words.forEach(function (w) {
          var wBadge = document.createElement('button');
          wBadge.className = 'btn';
          wBadge.style.padding = '4px 10px';
          wBadge.style.fontSize = '11px';
          wBadge.style.borderRadius = '4px';
          wBadge.textContent = w;
          wBadge.addEventListener('click', function () {
            injectSearchWord(w);
          });
          wordsWrap.appendChild(wBadge);
        });

        groupDiv.appendChild(wordsWrap);
        listContainer.appendChild(groupDiv);
      });
    }

    if (!hasResults) {
      placeholder.style.display = 'block';
      placeholder.textContent = '검색어 "' + query + '"에 일치하는 제원 단어나 시설물 정보가 사전에 존재하지 않습니다.';
    }
  }

  function getUniqueWordsForFacilityType(fType) {
    var wordsSet = new Set();

    // 현재 texts 데이터 기준 수집
    if (metadata && metadata.texts) {
      metadata.texts.forEach(function (t) {
        var parseResult = deserializeSpecText(t.text, t.layer);
        if (parseResult && parseResult.facilityType === fType && parseResult.values) {
          for (var fid in parseResult.values) {
            var val = String(parseResult.values[fid]).trim();
            if (val && val !== '기타' && isNaN(val)) {
              wordsSet.add(val);
            }
          }
        }
      });
    }

    // referenceDictionary 기준 수집
    if (referenceDictionary[fType]) {
      for (var fid in referenceDictionary[fType]) {
        for (var val in referenceDictionary[fType][fid]) {
          if (val && val !== '기타' && isNaN(val)) {
            wordsSet.add(val);
          }
        }
      }
    }

    return Array.from(wordsSet);
  }

  function injectSearchWord(word) {
    if (!lastFocusedInput) {
      alert('입력받을 속성창 칸이 지정되지 않았습니다.\n먼저 [제원 편집] 탭에서 입력할 폼의 빈 칸(메모 또는 속성 필드)을 한 번 클릭하신 후 검색을 이용해 주세요.');
      return;
    }

    lastFocusedInput.value = word;
    lastFocusedInput.dispatchEvent(new Event('input')); // 실시간 미리보기 및 변경점 반영
    
    // 강제 포커스를 주어 포커스 유실 방지
    lastFocusedInput.focus();

    // 편집 탭으로 탭 전환 시뮬레이션
    var editBtn = document.getElementById('tab-edit-btn');
    if (editBtn) {
      editBtn.click();
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
      sub.textContent = p.memo || getPhotoSummaryText(p) || p.fileName;

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

    // 주시설물(1번째)과 부속시설물(2번째 이후) 속성 자동 재동기화
    var cards = container.querySelectorAll('.attribute-card');
    cards.forEach(function (c, idx) {
      if (idx === 0) {
        c.removeAttribute('data-is-sub');
      } else {
        c.setAttribute('data-is-sub', 'true');
      }
    });

    updateFloatingWindowSpecs(); // 화면 오버레이 실시간 갱신
    saveCurrentPhoto(); // 메타데이터 및 캐드 전개 텍스트 순서 동기화 저장
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

    if (window.PhotoMeasure) {
      window.PhotoMeasure.open(imgSrc, function (annotatedBlob) {
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
    } else {
      alert('PhotoMeasure 모듈을 불러오지 못했습니다. 페이지를 새로고침(Ctrl+F5)해 주세요.');
    }
  }

  // 치수 실측 단추 이벤트 바인딩 등록
  document.addEventListener('DOMContentLoaded', function () {
    var panelBtn = document.getElementById('panel-photo-measure-btn');
    if (panelBtn) panelBtn.addEventListener('click', launchPhotoMeasure);
    var winBtn = document.getElementById('window-measure-btn');
    if (winBtn) winBtn.addEventListener('click', launchPhotoMeasure);
  });


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