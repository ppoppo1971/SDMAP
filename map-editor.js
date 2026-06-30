/**
 * NDMAP 도로대장 웹 편집기 (PC) 비즈니스 로직 (최종 고도화 버전)
 */
(function () {
  'use strict';

  // 44개 시설물 제원 포맷 및 입력 양식 설정 테이블
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
      prefix: '',
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

  // FileSystem Access API 디렉토리 핸들 및 메타데이터 원본 파일명 보관
  var dirHandle = null;
  var originalMetadataFileName = 'metadata.json';

  // [고도화 추가] 다크 테마 및 사진 정보 라벨 상시 표시 토글 변수
  var themeMode = 'light'; // 'light' | 'dark' | 'gray'
  var isLabelShow = false;

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
    map.addListener('zoom_changed', function () {
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
    var dxfInput = document.getElementById('dxf-file-input');
    var exportBtn = document.getElementById('export-zip-btn');
    var dragOverlay = document.getElementById('drag-overlay');
    
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

    // 드래그 앤 드롭 바인딩
    window.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dragOverlay.classList.add('active');
    });

    dragOverlay.addEventListener('dragleave', function (e) {
      e.preventDefault();
      var rect = dragOverlay.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        dragOverlay.classList.remove('active');
      }
    });

    window.addEventListener('dragover', function (e) {
      e.preventDefault();
    });

    window.addEventListener('drop', function (e) {
      e.preventDefault();
      dragOverlay.classList.remove('active');
      var items = e.dataTransfer.items;
      if (items && items.length) {
        var item = items[0];
        if (typeof item.getAsFileSystemHandle === 'function') {
          item.getAsFileSystemHandle().then(function (handle) {
            if (handle.kind === 'directory') {
              handleFolderHandle(handle);
            } else if (handle.name.endsWith('.dxf')) {
              handle.getFile().then(handleDxfUpload);
            } else {
              alert('지원하지 않는 형식입니다. 압축 해제된 폴더나 .dxf 도면을 여기에 떨어뜨려 주세요.');
            }
          }).catch(function (err) {
            console.error('드롭 파일 핸들러 오류:', err);
          });
        } else {
          var files = e.dataTransfer.files;
          if (files && files.length) {
            var file = files[0];
            if (file.name.endsWith('.dxf')) {
              handleDxfUpload(file);
            } else {
              alert('현재 브라우저에서는 드롭으로 폴더를 올릴 수 없습니다. 상단 [📁 작업 폴더 열기] 버튼을 통해 선택해 주세요.');
            }
          }
        }
      }
    });

    // 편집창 수동 저장 클릭 바인딩
    document.getElementById('photo-save-btn').addEventListener('click', saveCurrentPhoto);

    // 메모 입력창 포커스 하이라이트, 텍스트 자동 전체선택 및 엔터 저장 연동
    var memoEl = document.getElementById('photo-memo');
    if (memoEl) {
      setupInputFocusFade(memoEl);
      memoEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var saveBtn = document.getElementById('photo-save-btn');
          if (saveBtn) saveBtn.click();
        }
      });
    }

    // 겹침 사진 모달 닫기
    document.getElementById('overlap-modal-close').addEventListener('click', function () {
      document.getElementById('overlap-photos-modal').classList.remove('active');
    });

    // [고도화 추가] 사진 뷰어 팝업 열기 헬퍼 함수 (도면 영역의 70% 크기 및 중앙 배치)
    window.openPhotoViewer = function (imgSrc, photoTitle) {
      var floatingWin = document.getElementById('floating-image-window');
      var imageModal = document.getElementById('image-modal-src');
      if (!floatingWin || !imageModal) return;

      imageModal.src = imgSrc;
      // 뷰어 이미지의 HTML5 드래그를 비활성화하여 드롭 오버레이가 오동작하지 않도록 조치 (1번 요건)
      imageModal.setAttribute('draggable', 'false');
      
      document.getElementById('floating-window-title').textContent = photoTitle;
      resetZoomState();

      // 도면영역(canvas-container)의 70% 크기 및 중앙 배치
      var container = document.querySelector('.canvas-container');
      if (container) {
        var w = container.offsetWidth;
        var h = container.offsetHeight;

        var viewW = Math.round(w * 0.7);
        var viewH = Math.round(h * 0.7);
        var viewL = Math.round(w * 0.15);
        var viewT = Math.round(h * 0.15);

        floatingWin.style.width = viewW + 'px';
        floatingWin.style.height = viewH + 'px';
        floatingWin.style.left = viewL + 'px';
        floatingWin.style.top = viewT + 'px';
      } else {
        floatingWin.style.width = '700px';
        floatingWin.style.height = '500px';
        floatingWin.style.left = '100px';
        floatingWin.style.top = '120px';
      }

      floatingWin.style.display = 'flex';
    };

    // 썸네일 클릭 시 [드래그 가능한 플로팅 팝업창(Modeless)] 열기
    var previewImg = document.getElementById('preview-img');
    var floatingWin = document.getElementById('floating-image-window');
    
    if (previewImg) {
      previewImg.addEventListener('click', function () {
        if (previewImg.src && selectedPhotoId && metadata && metadata.photos) {
          var p = metadata.photos.find(function (x) { return x.id === selectedPhotoId; });
          if (p) {
            var samePosPhotos = metadata.photos.filter(function (x) {
              return x.position && p.position && 
                     Math.abs(x.position.x - p.position.x) < 0.001 && 
                     Math.abs(x.position.y - p.position.y) < 0.001;
            });
            if (samePosPhotos.length > 1) {
              var currentIdx = samePosPhotos.findIndex(function (x) { return x.id === p.id; });
              if (currentIdx === -1) currentIdx = 0;
              openImageViewer(samePosPhotos, currentIdx);
              return;
            }
          }
        }
        if (previewImg.src) {
          var title = '사진 원본 보기 (' + (document.getElementById('preview-photo-number').textContent || '') + ')';
          openPhotoViewer(previewImg.src, title);
        }
      });
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
        var dx = e.clientX - clickStartX;
        var dy = e.clientY - clickStartY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) { // 4픽셀 미만 이동 시 클릭으로 판단하여 사진창 숨김
          if (floatingWin) floatingWin.style.display = 'none';
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
    addSelect.addEventListener('change', function () {
      var type = this.value;
      if (!type) return;
      
      var container = document.getElementById('attribute-cards-container');
      renderAttributeCard(container, type, null);
      this.value = ""; // 초기화
    });
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
  async function handleFolderOpen() {
    if (typeof window.showDirectoryPicker === 'undefined') {
      alert('이 브라우저는 폴더 열기 API(FileSystem Access API)를 지원하지 않습니다.\n구글 크롬(Chrome) 또는 MS 엣지(Edge) 브라우저를 사용해 주세요.');
      return;
    }

    try {
      var handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      await handleFolderHandle(handle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('폴더 선택 중 에러:', err);
        alert('폴더 선택 중 에러가 발생했습니다: ' + err.message);
      }
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
    clearOverlays();

    // 플로팅 이미지 창 숨기기
    var floatingWin = document.getElementById('floating-image-window');
    if (floatingWin) floatingWin.style.display = 'none';

    try {
      var files = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          files.push(entry);
        }
      }

      var metadataOriginalEntry = null;
      var metadataModifiedEntry = null;
      var dxfEntry = null;
      var imageEntries = [];

      files.forEach(function (entry) {
        var name = entry.name.toLowerCase();
        if (name.endsWith('_수정.json')) {
          metadataModifiedEntry = entry;
        } else if (name === 'metadata.json' || name === '_metadata.json' || name.endsWith('_metadata.json')) {
          metadataOriginalEntry = entry;
        } else if (name.endsWith('.dxf')) {
          dxfEntry = entry;
        } else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
          imageEntries.push(entry);
        }
      });

      // 수정본이 이미 존재하면 수정본 우선 로드, 없으면 원본 로드
      var metadataEntry = metadataModifiedEntry || metadataOriginalEntry;

      if (!metadataEntry) {
        throw new Error('선택한 폴더 내부에 메타데이터 파일(_metadata.json 또는 metadata.json)이 없습니다.');
      }

      originalMetadataFileName = metadataEntry.name;
      projectBaseName = handle.name;

      // 1. 메타데이터 파싱
      var metadataFile = await metadataEntry.getFile();
      var metadataText = await metadataFile.text();
      try {
        metadata = JSON.parse(metadataText);
      } catch (e) {
        throw new Error('메타데이터 JSON 파일 형식이 올바르지 않습니다.');
      }

      // 2. 이미지들을 Blob 및 URL로 읽어 매핑
      var imagePromises = imageEntries.map(async function (entry) {
        var file = await entry.getFile();
        photoBlobs[entry.name] = file;
        photoBlobUrls[entry.name] = URL.createObjectURL(file);
      });
      await Promise.all(imagePromises);

      // 3. DXF 자동 로딩 (폴더에 존재 시)
      if (dxfEntry) {
        var dxfFile = await dxfEntry.getFile();
        var dxfText = await dxfFile.text();
        await parseDxfString(dxfText, dxfEntry.name);
      }

      showLoading(false);

      // 화면 갱신
      document.getElementById('loaded-filename-badge').textContent = projectBaseName + ' (폴더 로드됨)';
      document.getElementById('loaded-filename-badge').style.display = 'inline-block';
      document.getElementById('welcome-panel').style.display = 'none';
      document.getElementById('detail-panel').style.display = 'block';
      document.getElementById('sidebar-actions').style.display = 'flex';

      var exportBtn = document.getElementById('export-zip-btn');
      if (exportBtn) exportBtn.disabled = false;

      if (!dxfData) {
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

  function getModifiedMetadataFileName() {
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
    map.data.forEach(function (feature) { map.data.remove(feature); });
    
    var geoJson = window.DxfToGeoJSON.dxfToGeoJSON(dxfData);
    if (geoJson.features && geoJson.features.length > 0) {
      map.data.addGeoJson(geoJson);
      dxfBoundsLatLng = boundsFromGeoJSON(geoJson);
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
    clearOverlays();
    if (!map || !metadata || !metadata.photos) return;

    var checkedIds = {};
    metadata.photos.forEach(function (p) {
      if (checkedIds[p.id] || !p.position) return;

      var overlaps = findOverlappingPhotos(p);
      var isMultiple = overlaps.length > 1;

      overlaps.forEach(function (o) { checkedIds[o.id] = true; });

      var overlay = new PhotoSpecOverlay(p, map, isMultiple, overlaps);
      overlays.push(overlay);
    });

    // [고도화 추가] 오버레이를 전부 그린 직후 테마, 텍스트 상태 및 줌 클러스터링을 초기 렌더링에 일괄 동기화
    handleMapZoomOrBoundsChange();
  }

  function findOverlappingPhotos(photo) {
    if (!metadata || !metadata.photos || !photo.position) return [photo];
    
    var threshold = 2.0; // 2미터 반경
    return metadata.photos.filter(function (other) {
      if (!other.position) return false;
      var dx = photo.position.x - other.position.x;
      var dy = photo.position.y - other.position.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= threshold;
    });
  }

  // google.maps.OverlayView 상속 정의
  function PhotoSpecOverlay(photo, map, isMultiple, overlaps) {
    this.photo = photo;
    this.map = map;
    this.isMultiple = isMultiple;
    this.overlaps = overlaps;
    this.div = null;
    this.isClusterRepresentation = false; // 클러스터 대표 여부
    this.clusterCount = 1;                // 대표 노드로 뭉쳐진 개수
    
    // 안전한 setMap 호출을 위한 방어 코드
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
    
    // [고도화 추가] 마커 모드가 켜져 있는 상태라면 보라색 원 클래스 선언
    if (isMarkerMode) {
      div.classList.add('marker-dot-mode');
      div.style.transform = 'translate(-50%, -50%)';
      div.style.marginTop = '0px';
    } else {
      div.style.transform = 'translate(-50%, -100%)';
      div.style.marginTop = '-10px';
    }
    
    if (this.isMultiple) {
      div.classList.add('multiple');
      div.title = '이 위치에 사진 ' + this.overlaps.length + '장이 중첩되어 있습니다. 클릭하여 선택하세요.';
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

    if (this.photo.memo) {
      labelHtml += '<div class="label-photo-memo">' + this.photo.memo + '</div>';
    }

    // [방안 3 추가] 중첩 그룹(isMultiple)의 대표(overlaps[0])인 경우 우측 상단 ＋N 뱃지와 서브 패널 추가
    if (this.isMultiple && this.photo === this.overlaps[0]) {
      var badgeCount = this.overlaps.length - 1;
      labelHtml += '<div class="label-photo-plus-badge">＋' + badgeCount + '</div>';
      
      labelHtml += '<div class="photo-overlay-sub-panel" style="display: none;">';
      for (var i = 1; i < this.overlaps.length; i++) {
        var otherPhoto = this.overlaps[i];
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
        if (otherPhoto.memo) {
          labelHtml += '  <div class="sub-label-memo">' + otherPhoto.memo + '</div>';
        }
        labelHtml += '</div>';
      }
      labelHtml += '</div>';
    }

    labelPanel.innerHTML = labelHtml;
    div.appendChild(labelPanel);
    this.labelPanel = labelPanel; // 실시간 토글용 참조 보관

    // [방안 3 추가] 마우스 호버 시 겹친 서브 속성 펼치기 인터랙션
    if (this.isMultiple && this.photo === this.overlaps[0]) {
      div.addEventListener('mouseenter', function () {
        if (!isLabelShow) return; // 텍스트 모드가 켜져 있을 때만 작동
        var subPanel = labelPanel.querySelector('.photo-overlay-sub-panel');
        if (subPanel) {
          subPanel.style.display = 'flex';
          div.style.zIndex = '99999';
        }
      });
      div.addEventListener('mouseleave', function () {
        var subPanel = labelPanel.querySelector('.photo-overlay-sub-panel');
        if (subPanel) {
          subPanel.style.display = 'none';
          div.style.zIndex = '';
        }
      });
    }

    div.addEventListener('click', function () {
      // 1. 저배율 클러스터 노드인 경우 클릭 시 해당 범위 줌인 (17레벨 이하 대응)
      if (self.isClusterRepresentation && map && map.getZoom() <= 17) {
        map.setZoom(18);
        if (self.photo.position) {
          var repLngLat = window.DxfToGeoJSON.dxfToLngLat(self.photo.position.x, -self.photo.position.y);
          if (repLngLat) map.panTo(new google.maps.LatLng(repLngLat[1], repLngLat[0]));
        }
        return;
      }

      // 2. 일반 마커 클릭 핸들러
      if (self.isMultiple) {
        showOverlapPhotosModal(self.overlaps);
      } else {
        selectPhoto(self.photo.id);
      }
    });

    // [고도화 추가] 도면 영역 사진 더블클릭 시 70% 크기로 뷰어 띄우기 (1번 요건)
    div.addEventListener('dblclick', function (e) {
      e.stopPropagation(); // 지도의 더블클릭 줌인 동작 방지
      var imgSrc = photoBlobUrls[self.photo.fileName] || '';
      if (imgSrc) {
        var numStr = '';
        if (metadata && metadata.texts && self.photo.numTextId) {
          var txtObj = metadata.texts.find(function (t) { return t.id === self.photo.numTextId; });
          if (txtObj) numStr = '#' + txtObj.text;
        }
        if (!numStr) numStr = '사진';
        var title = '사진 원본 보기 (' + numStr + ' - ' + self.photo.fileName + ')';
        
        openPhotoViewer(imgSrc, title);
      }
    });

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

    // [방안 3 추가] 텍스트 모드가 켜져 있고 중첩 마커인 경우, 대표 마커가 아니면 숨김
    if (isLabelShow && this.isMultiple && this.photo !== this.overlaps[0]) {
      this.div.style.display = 'none';
      return;
    }

    this.div.style.display = 'block';
    
    var dxfX = this.photo.position.x;
    var dxfY = -this.photo.position.y; 
    
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
    var card = currentInput.closest('.attribute-card');
    if (!card) return;
    var inputs = Array.prototype.slice.call(card.querySelectorAll('input[data-field-id]'));
    var idx = inputs.indexOf(currentInput);
    if (idx !== -1 && idx < inputs.length - 1) {
      var nextInput = inputs[idx + 1];
      nextInput.focus();
    } else {
      // 마지막 속성 필드에서 엔터 입력 시 사이드바 메모란으로 이동
      var memoEl = document.getElementById('photo-memo');
      if (memoEl && document.activeElement !== memoEl) {
        memoEl.focus();
      } else {
        // 저장 실행
        var saveBtn = document.getElementById('photo-save-btn');
        if (saveBtn) saveBtn.click();
      }
    }
  }

  // [방안 2] 인풋 요소에 커스텀 드롭다운 레이어 설정
  function setupCustomDropdown(input, options, suggestions) {
    var parent = input.parentNode;
    if (!parent) return;

    var dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown-panel';

    // 전체 원본 목록 (필터링 기준)
    var allItems = [];

    // 1) 기본 설정 목록(옵션) 추가
    if (options && options.length > 0) {
      options.forEach(function (opt) {
        if (opt !== '기타') {
          allItems.push(opt);
        }
      });
    }

    // 2) 과거 입력 이력 빈도순 상위 10개 추가 (중복 제외)
    if (suggestions && suggestions.length > 0) {
      suggestions.forEach(function (sug) {
        if (allItems.indexOf(sug) === -1) {
          allItems.push(sug);
        }
      });
    }

    parent.appendChild(dropdown);

    var activeIdx = -1;

    // 현재 표시 목록 렌더링
    function renderItems(filterText) {
      dropdown.innerHTML = '';
      activeIdx = -1;

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

        item.addEventListener('mousedown', function (e) {
          e.preventDefault();
          input.value = val;
          input.dispatchEvent(new Event('input'));
          hideDropdown();
          moveToNextField(input);
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

    // 포커스: 드롭다운 열기
    input.addEventListener('focus', function () {
      showDropdown();
    });

    // 클릭: 닫혀 있으면 다시 열기
    input.addEventListener('click', function () {
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
          moveToNextField(input);
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
        moveToNextField(input);
      } else if (e.key === 'Tab') {
        hideDropdown();
        // Tab 기본 동작 허용 (자연스럽게 다음 필드로)
      }
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
    if (photo.memo) return photo.memo;
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
    var floatingWin = document.getElementById('floating-image-window');
    if (floatingWin && floatingWin.style.display === 'flex') {
      document.getElementById('image-modal-src').src = photoBlobUrls[p.fileName] || '';
      document.getElementById('floating-window-title').textContent = '사진 원본 보기 (사진 #' + (p.numTextId ? p.numTextId : '') + ' - ' + p.fileName + ')';
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

    if (p.position) {
      var lngLat = window.DxfToGeoJSON.dxfToLngLat(p.position.x, -p.position.y);
      if (lngLat && map) {
        map.panTo(new google.maps.LatLng(lngLat[1], lngLat[0]));
        // [고도화 추가] 사진 개별 선택 시 지도를 줌 레벨 22배율로 정밀 확대
        map.setZoom(22);
      }
    }

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
    document.getElementById('photo-memo').value = p.memo || '';

    // 다중 사진 썸네일 컨테이너 렌더링
    var thumbContainer = document.getElementById('sidebar-thumbnails');
    if (thumbContainer) {
      thumbContainer.innerHTML = '';
      
      // 동일 위치 사진들 수집
      var samePosPhotos = metadata.photos.filter(function (x) {
        return x.position && p.position && 
               Math.abs(x.position.x - p.position.x) < 0.001 && 
               Math.abs(x.position.y - p.position.y) < 0.001;
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

      var parseResult = deserializeSpecText(textObj.text);
      if (parseResult) {
        renderAttributeCard(cardsContainer, parseResult.facilityType, parseResult.values, tId);
      }
    });

    if (cardsContainer.children.length === 0) {
      var autoType = detectFacilityType(p.fileName, p.memo);
      if (autoType) {
        renderAttributeCard(cardsContainer, autoType, null);
      }
    }
  }

  function updateFacilitySelectOptions() {
    var select = document.getElementById('add-facility-select');
    if (!select || !metadata || !metadata.photos) return;

    var counts = {};
    metadata.photos.forEach(function (p) {
      if (p.facilityType) {
        counts[p.facilityType] = (counts[p.facilityType] || 0) + 1;
      }
    });

    var sortedKeys = Object.keys(FACILITY_CONFIG).sort(function (a, b) {
      var countA = counts[a] || 0;
      var countB = counts[b] || 0;
      if (countA !== countB) return countB - countA;
      return a.localeCompare(b);
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

  // 제원 역직렬화
  function deserializeSpecText(text) {
    if (!text) return null;
    var parts = text.split('/');
    var fType = parts[0];
    var config = FACILITY_CONFIG[fType];
    if (!config) return null;

    var values = {};
    var fieldIdx = 1;
    
    if (config.joinFormat) {
      if (fType === '배수암거') {
        var dim = parts[1] || '';
        var dimParts = dim.split('x');
        values['width'] = dimParts[0] || '';
        values['height'] = dimParts[1] || '';
        values['type'] = parts[2] || '';
        values['wing'] = parts[3] || '';
        values['sump'] = parts[4] || '';
      } else if (fType === '측구') {
        values['type'] = parts[1] || '';
        var dim = parts[2] || '';
        var dimParts = dim.split('x');
        values['width'] = dimParts[0] || '';
        values['height'] = dimParts[1] || '';
      } else if (fType === '통로박스') {
        var dim = parts[1] || '';
        var dimParts = dim.split('x');
        values['width'] = dimParts[0] || '';
        values['height'] = dimParts[1] || '';
        values['type'] = parts[2] || '';
        values['traffic'] = parts[3] || '';
      } else if (fType === '교량') {
        values['bridgeName'] = parts[1] || '';
        values['material'] = parts[2] || '';
        var dim = parts[3] || '';
        var dimParts = dim.split('x');
        values['width'] = dimParts[0] || '';
        values['height'] = dimParts[1] || '';
      }
    } else {
      config.fields.forEach(function (f) {
        if (fieldIdx < parts.length) {
          values[f.id] = parts[fieldIdx];
          fieldIdx++;
        }
      });
    }

    return { facilityType: fType, values: values };
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



  // 시설물 카드의 필드별 다빈도 입력 제안어 추출 (자동완성 이식, 최대 10개 및 제외 목록 대응 - 2-3 요건)
  function getFieldSuggestions(fieldId, layerName, excludeList) {
    if (!metadata || !metadata.texts) return [];

    var excludes = excludeList || [];
    var counts = {};
    metadata.texts.forEach(function (t) {
      if (t.layer === layerName) {
        var parseResult = deserializeSpecText(t.text);
        if (parseResult && parseResult.values && parseResult.values[fieldId] !== undefined) {
          var val = parseResult.values[fieldId];
          if (val && String(val).trim() !== '' && val !== '기타' && excludes.indexOf(val) === -1) {
            counts[val] = (counts[val] || 0) + 1;
          }
        }
      }
    });

    var list = Object.keys(counts).map(function (k) {
      return { val: k, count: counts[k] };
    });
    list.sort(function (a, b) { return b.count - a.count; });
    
    return list.slice(0, 10).map(function (item) { return item.val; });
  }

  // 속성 카드 렌더링
  function renderAttributeCard(container, type, cachedVals, existingTextId) {
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

    var delBtn = document.createElement('button');
    delBtn.className = 'attribute-card-del-btn';
    delBtn.textContent = '제거';
    delBtn.addEventListener('click', function () {
      card.parentNode.removeChild(card);
    });
    header.appendChild(delBtn);
    card.appendChild(header);

    var fieldsWrap = document.createElement('div');
    config.fields.forEach(function (f) {
      var group = document.createElement('div');
      group.className = 'form-group';

      var label = document.createElement('label');
      label.textContent = f.label;
      group.appendChild(label);

      var inputVal = (cachedVals && cachedVals[f.id] !== undefined) ? cachedVals[f.id] : (f.default || '');
      
      // [1번 요건 개편] 모든 입력 필드를 단일화된 콤보 인풋 박스(input + datalist)로 통일
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control';
      input.setAttribute('data-field-id', f.id);
      input.value = inputVal;
      input.placeholder = f.placeholder || (f.options ? '목록 선택 또는 직접 입력' : '입력');

      var layerName = config.layer || (type + '_T');
      var suggestions = getFieldSuggestions(f.id, layerName, f.options || []);

      input.addEventListener('input', function () {
        updateSpecPreview(card, config);
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
  }

  function buildSpecString(card, config) {
    var type = card.getAttribute('data-facility-type');
    var fields = card.querySelectorAll('[data-field-id]');
    var values = {};
    
    fields.forEach(function (f) {
      values[f.getAttribute('data-field-id')] = f.value || '기타';
    });

    var resultParts = [type];
    
    if (config.joinFormat) {
      if (type === '배수암거') {
        var w = values['width'] || '기타';
        var h = values['height'] || '기타';
        var mat = values['type'] || '콘크리트';
        var wing = values['wing'] || '기타';
        var sump = values['sump'] || '기타';
        resultParts.push(w + 'x' + h);
        resultParts.push(mat);
        resultParts.push(wing);
        resultParts.push(sump);
      } else if (type === '측구') {
        var t = values['type'] || '기타';
        var w = values['width'] || '기타';
        var h = values['height'] || '기타';
        resultParts.push(t);
        resultParts.push(w + 'x' + h);
      } else if (type === '통로박스') {
        var w = values['width'] || '기타';
        var h = values['height'] || '기타';
        var t = values['type'] || '기타';
        var traffic = values['traffic'] || '기타';
        resultParts.push(w + 'x' + h);
        resultParts.push(t);
        resultParts.push(traffic);
      } else if (type === '교량') {
        var name = values['bridgeName'] || '기타';
        var mat = values['material'] || '기타';
        var w = values['width'] || '기타';
        var h = values['height'] || '기타';
        resultParts.push(name);
        resultParts.push(mat);
        resultParts.push(w + 'x' + h);
      }
    } else {
      config.fields.forEach(function (f) {
        resultParts.push(values[f.id] || '기타');
      });
    }

    return resultParts.join('/');
  }

  function updateSpecPreview(card, config) {
    var specStr = buildSpecString(card, config);
    var previewBox = card.querySelector('.preview-spec-box');
    if (previewBox) {
      previewBox.textContent = 'CAD 전개 문자: ' + specStr;
    }
  }

  // -------------------------------------------------------------
  // [6] 데이터 수동 저장 및 로컬 쓰기 동기화
  // -------------------------------------------------------------
  async function saveCurrentPhoto() {
    if (!metadata || !selectedPhotoId) return;

    var p = metadata.photos.find(function (x) { return x.id === selectedPhotoId; });
    if (!p) return;

    showLoading(true, '속성 데이터를 로컬에 덮어쓰는 중...');

    p.memo = document.getElementById('photo-memo').value;

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

    cards.forEach(function (card, index) {
      var type = card.getAttribute('data-facility-type');
      var config = FACILITY_CONFIG[type];
      if (!config) return;

      var specStr = buildSpecString(card, config);
      var textId = card.getAttribute('data-existing-text-id');
      
      if (!textId) {
        textId = 'text-spec-' + p.id + '-' + index;
      }

      var specTextObj = {
        id: textId,
        x: p.position.x,
        y: p.position.y,
        text: specStr,
        layer: config.layer || (type + '_T'),
        color: null
      };

      metadata.texts.push(specTextObj);
      newTextIds.push(textId);
    });

    if (newTextIds.length > 0) {
      p.facilityType = cards[0].getAttribute('data-facility-type');
      p.specTextId = newTextIds[0];
      p.specTextIds = newTextIds;
    } else {
      p.facilityType = null;
      p.specTextId = null;
      p.specTextIds = null;
    }

    // [고도화 추가] 저장 완료 상태 플래그 설정 (마커 색상 파란색 전환용)
    p.edited = true;

    updateFacilitySelectOptions();
    drawPhotoOverlays();
    updateProgressBar();

    var isSavedDirectly = false;
    if (dirHandle) {
      isSavedDirectly = await saveMetadataToLocalFolder(metadata);
    }

    showLoading(false);

    if (isSavedDirectly) {
      console.log('PC 로컬 폴더 실시간 수정본 저장 완료 (' + getModifiedMetadataFileName() + ')');
    } else {
      triggerManualJsonDownload();
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

  function setupImageZoom() {
    var win = document.getElementById('floating-image-window');
    var dragHandle = document.getElementById('window-drag-handle');
    var resizeHandle = win.querySelector('.window-resize-handle');
    var container = document.getElementById('zoom-container');
    var img = document.getElementById('image-modal-src');

    // 1) 윈도우 창 드래그 이동 기능
    var isWinDragging = false;
    var winStartX = 0, winStartY = 0;

    dragHandle.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('window-btn') || e.target.closest('.window-btn')) return;
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
    var img = document.getElementById('image-modal-src');
    if (img) {
      img.style.transform = 'none';
    }
  }

  /** 이미지 슬라이드 뷰어 열기 */
  function openImageViewer(photosList, startIndex) {
    imageViewerPhotos = photosList || [];
    imageViewerIndex = startIndex >= 0 && startIndex < imageViewerPhotos.length ? startIndex : 0;
    
    var viewer = document.getElementById('image-viewer-modal');
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
      var viewer = document.getElementById('image-viewer-modal');
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
  });

})();
