/**
 * 도로대장 시설물 조사 옵션 설정 (엑셀 기반 자동 생성)
 */
(function (global) {
  'use strict';

  global.FACILITY_CONFIG = {
  "도로경계석": {
    "title": "도로경계석",
    "layer": "도로경계석_T",
    "color": 1,
    "prefix": "도경",
    "detectionLayers": [
      "도로"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "분류",
        "type": "select",
        "options": [
          "화강",
          "콘크리트",
          "경계석무",
          "기타"
        ],
        "default": "화강",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "폭",
        "type": "select",
        "options": [
          "0.15",
          "0.18",
          "기타"
        ],
        "default": "0.15",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "높이",
        "type": "select",
        "options": [
          "0.2",
          "기타"
        ],
        "default": "0.2",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "도로": {
    "title": "도로",
    "layer": "도로_T",
    "color": 7,
    "prefix": "도로",
    "detectionLayers": [
      "도로"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "재질",
        "type": "select",
        "options": [
          "AS",
          "CON",
          "비포장",
          "기타"
        ],
        "default": "AS",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "차선",
        "type": "select",
        "options": [
          "1차",
          "2차",
          "기타"
        ],
        "default": "1차",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "보도경계석": {
    "title": "보도경계석",
    "layer": "보도경계석_T",
    "color": 1,
    "prefix": "보경",
    "detectionLayers": [
      "보도"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "분류",
        "type": "select",
        "options": [
          "화강",
          "콘크리트",
          "경계석무",
          "기타"
        ],
        "default": "화강",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "폭",
        "type": "select",
        "options": [
          "0.2",
          "0.18",
          "기타"
        ],
        "default": "0.2",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "보도": {
    "title": "보도",
    "layer": "보도_T",
    "color": 3,
    "prefix": "보도",
    "detectionLayers": [
      "보도"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "재질",
        "type": "select",
        "options": [
          "소고",
          "AS",
          "CON",
          "기타"
        ],
        "default": "소고",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "가로수": {
    "title": "가로수",
    "layer": "가로수_T",
    "color": 1,
    "prefix": "가로수",
    "detectionLayers": [
      "가로수"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "수종",
        "type": "select",
        "options": [
          "이팝",
          "벚나무",
          "은행",
          "기타"
        ],
        "default": "이팝",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "지지대유무",
        "type": "select",
        "options": [
          "지유",
          "지무",
          "기타"
        ],
        "default": "지유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "지지판유무",
        "type": "select",
        "options": [
          "판유",
          "판무",
          "기타"
        ],
        "default": "판유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "흉고",
        "type": "select",
        "options": [
          "0.1",
          "0.2",
          "기타"
        ],
        "default": "0.1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "높이",
        "type": "select",
        "options": [
          "3.0",
          "기타"
        ],
        "default": "3.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "가드펜스": {
    "title": "가드펜스",
    "layer": "가드펜스_T",
    "color": 5,
    "prefix": "가펜",
    "detectionLayers": [
      "가드펜스"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "방호",
        "type": "select",
        "options": [
          "기타"
        ],
        "default": "기타",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "재질",
        "type": "select",
        "options": [
          "철재",
          "탄소",
          "기타"
        ],
        "default": "철재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "높이",
        "type": "select",
        "options": [
          "기타"
        ],
        "default": "기타",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "가드레일": {
    "title": "가드레일",
    "layer": "가드레일_T",
    "color": 5,
    "prefix": "가일",
    "detectionLayers": [
      "가드레일"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "방호",
        "type": "select",
        "options": [
          "기타"
        ],
        "default": "기타",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "재질",
        "type": "select",
        "options": [
          "철재",
          "탄소",
          "기타"
        ],
        "default": "철재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "높이",
        "type": "select",
        "options": [
          "기타"
        ],
        "default": "기타",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "가로등": {
    "title": "가로등",
    "layer": "가로등_T",
    "color": 3,
    "prefix": "가등",
    "detectionLayers": [
      "가로등"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "종류",
        "type": "select",
        "options": [
          "원형",
          "강판",
          "기타"
        ],
        "default": "원형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "재질",
        "type": "select",
        "options": [
          "철재",
          "탄소",
          "기타"
        ],
        "default": "철재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "형태",
        "type": "select",
        "options": [
          "가오스형",
          "기타"
        ],
        "default": "가오스형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "광원",
        "type": "select",
        "options": [
          "LED",
          "고압나트륨",
          "기타"
        ],
        "default": "LED",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "높이",
        "type": "select",
        "options": [
          "10.0",
          "8.0",
          "7.0",
          "기타"
        ],
        "default": "10.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "암길이",
        "type": "select",
        "options": [
          "/1.7",
          "/1.2",
          "/0.8",
          "기타"
        ],
        "default": "/1.7",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_7",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "가로등(보안등)": {
    "title": "가로등(보안등)",
    "layer": "가로등_T",
    "color": 3,
    "prefix": "가등",
    "detectionLayers": [
      "가로등"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "종류",
        "type": "select",
        "options": [
          "원형",
          "강판",
          "기타"
        ],
        "default": "원형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "재질",
        "type": "select",
        "options": [
          "철재",
          "탄소",
          "기타"
        ],
        "default": "철재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "형태",
        "type": "select",
        "options": [
          "가오스형",
          "기타"
        ],
        "default": "가오스형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "광원",
        "type": "select",
        "options": [
          "LED",
          "고압나트륨",
          "기타"
        ],
        "default": "LED",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "높이",
        "type": "select",
        "options": [
          "10.0",
          "8.0",
          "7.0",
          "기타"
        ],
        "default": "10.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "암길이",
        "type": "select",
        "options": [
          "/1.7",
          "/1.2",
          "/0.8",
          "기타"
        ],
        "default": "/1.7",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_7",
        "label": "보안등유무",
        "type": "select",
        "options": [
          "+보안등",
          "기타"
        ],
        "default": "+보안등",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_8",
        "label": "형태",
        "type": "select",
        "options": [
          "가오스형",
          "기타"
        ],
        "default": "가오스형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_9",
        "label": "광원",
        "type": "select",
        "options": [
          "LED",
          "고압나트륨",
          "기타"
        ],
        "default": "LED",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_10",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "가로등(부착)": {
    "title": "가로등(부착)",
    "layer": "가로등_T",
    "color": 3,
    "prefix": "가등",
    "detectionLayers": [
      "가로등"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "형태",
        "type": "select",
        "options": [
          "가오스형",
          "기타"
        ],
        "default": "가오스형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "광원",
        "type": "select",
        "options": [
          "LED",
          "고압나트륨",
          "기타"
        ],
        "default": "LED",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "보안등": {
    "title": "보안등",
    "layer": "보안등_T",
    "color": 3,
    "prefix": "보등",
    "detectionLayers": [
      "보안등"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "종류",
        "type": "select",
        "options": [
          "원형",
          "강판",
          "기타"
        ],
        "default": "원형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "재질",
        "type": "select",
        "options": [
          "철재",
          "탄소",
          "기타"
        ],
        "default": "철재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "형태",
        "type": "select",
        "options": [
          "가오스형",
          "기타"
        ],
        "default": "가오스형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "광원",
        "type": "select",
        "options": [
          "LED",
          "고압나트륨",
          "기타"
        ],
        "default": "LED",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "암길이",
        "type": "select",
        "options": [
          "1.0",
          "기타"
        ],
        "default": "1.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "보안등(부착)": {
    "title": "보안등(부착)",
    "layer": "보안등_T",
    "color": 3,
    "prefix": "보등",
    "detectionLayers": [
      "보안등"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "형태",
        "type": "select",
        "options": [
          "가오스형",
          "기타"
        ],
        "default": "가오스형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "광원",
        "type": "select",
        "options": [
          "LED",
          "고압나트륨",
          "기타"
        ],
        "default": "LED",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "횡단보도": {
    "title": "횡단보도",
    "layer": "횡단보도_T",
    "color": 3,
    "prefix": "횡단보도",
    "detectionLayers": [
      "횡단보도"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "형태",
        "type": "select",
        "options": [
          "일자",
          "지그재그",
          "험프/일자",
          "험프/지그재그",
          "기타"
        ],
        "default": "일자",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "신호등유무",
        "type": "select",
        "options": [
          "신유",
          "신무",
          "기타"
        ],
        "default": "신유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "장평유무",
        "type": "select",
        "options": [
          "장유",
          "장무",
          "기타"
        ],
        "default": "장유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "턱낮춤유무",
        "type": "select",
        "options": [
          "낮유",
          "낮무",
          "기타"
        ],
        "default": "낮유",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "탄력봉": {
    "title": "탄력봉",
    "layer": "탄력봉_T",
    "color": 1,
    "prefix": "탄력봉",
    "detectionLayers": [
      "탄력봉"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "간격",
        "type": "select",
        "options": [
          "1.5",
          "기타"
        ],
        "default": "1.5",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "장애인편의시설": {
    "title": "장애인편의시설",
    "layer": "장애인편의시설_T",
    "color": 30,
    "prefix": "장편",
    "detectionLayers": [
      "장애인편의시설"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "형태",
        "type": "select",
        "options": [
          "점.선",
          "점",
          "선",
          "기타"
        ],
        "default": "점.선",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "제원",
        "type": "select",
        "options": [
          "0.3",
          "기타"
        ],
        "default": "0.3",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "화단": {
    "title": "화단",
    "layer": "화단_T",
    "color": 3,
    "prefix": "화단",
    "detectionLayers": [
      "화단"
    ],
    "isSubAttachable": false,
    "fields": []
  },
  "안전지대": {
    "title": "안전지대",
    "layer": "안전지대_T",
    "color": 3,
    "prefix": "안전지대",
    "detectionLayers": [
      "안전지대"
    ],
    "isSubAttachable": false,
    "fields": []
  },
  "미끄럼방지": {
    "title": "미끄럼방지",
    "layer": "미끄럼방지_T",
    "color": 3,
    "prefix": "미방",
    "detectionLayers": [
      "미끄럼방지"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "재질",
        "type": "select",
        "options": [
          "수지도포",
          "모르터",
          "투스콘",
          "기타"
        ],
        "default": "수지도포",
        "isSupport": false,
        "isPhoto": false
      }
    ]
  },
  "자전거도로": {
    "title": "자전거도로",
    "layer": "자전거도로_T",
    "color": 3,
    "prefix": "자도",
    "detectionLayers": [
      "자전거도로"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "재질",
        "type": "select",
        "options": [
          "AS",
          "AS(도색)",
          "투스콘",
          "기타"
        ],
        "default": "AS",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "형태",
        "type": "select",
        "options": [
          "전용",
          "보겸",
          "기타"
        ],
        "default": "전용",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "소음방지책": {
    "title": "소음방지책",
    "layer": "소음방지책_T",
    "color": 5,
    "prefix": "방음",
    "detectionLayers": [
      "소음방지책"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "종류",
        "type": "select",
        "options": [
          "흡음",
          "반사",
          "혼합",
          "기타"
        ],
        "default": "흡음",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "재질",
        "type": "select",
        "options": [
          "철재",
          "기타"
        ],
        "default": "철재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "높이",
        "type": "select",
        "options": [
          "5.0",
          "기타"
        ],
        "default": "5.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "기초높이",
        "type": "select",
        "options": [
          "1.0",
          "기타"
        ],
        "default": "1.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "차량진입": {
    "title": "차량진입",
    "layer": "차량진입_T",
    "color": 3,
    "prefix": "차진",
    "detectionLayers": [
      "차량진입"
    ],
    "isSubAttachable": false,
    "fields": []
  },
  "과속방지턱": {
    "title": "과속방지턱",
    "layer": "과속방지턱_T",
    "color": 3,
    "prefix": "과방",
    "detectionLayers": [
      "과속방지턱"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "높이",
        "type": "select",
        "options": [
          "0.0",
          "0.1",
          "0.2",
          "기타"
        ],
        "default": "0.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "표지판유무",
        "type": "select",
        "options": [
          "표유",
          "표무",
          "기타"
        ],
        "default": "표유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "석축": {
    "title": "석축",
    "layer": "석축_T",
    "color": 3,
    "prefix": "석축",
    "detectionLayers": [
      "석축"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "폭",
        "type": "select",
        "options": [
          "0.2",
          "0.5",
          "기타"
        ],
        "default": "0.2",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "높이",
        "type": "select",
        "options": [
          "0.5~1.0",
          "기타"
        ],
        "default": "0.5~1.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "옹벽": {
    "title": "옹벽",
    "layer": "옹벽_T",
    "color": 3,
    "prefix": "옹벽",
    "detectionLayers": [
      "옹벽"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "폭",
        "type": "select",
        "options": [
          "0.2",
          "0.3",
          "기타"
        ],
        "default": "0.2",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "높이",
        "type": "select",
        "options": [
          "0.5~1.0",
          "기타"
        ],
        "default": "0.5~1.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "중앙분리대": {
    "title": "중앙분리대",
    "layer": "중앙분리대_T",
    "color": 5,
    "prefix": "중분",
    "detectionLayers": [
      "중앙분리대"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "종류",
        "type": "select",
        "options": [
          "녹지대",
          "플라스틱",
          "탄력봉",
          "가드레일",
          "가드펜스",
          "기타"
        ],
        "default": "녹지대",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "폭",
        "type": "select",
        "options": [
          "0.2",
          "기타"
        ],
        "default": "0.2",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "높이",
        "type": "select",
        "options": [
          "1.0",
          "기타"
        ],
        "default": "1.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "정차대": {
    "title": "정차대",
    "layer": "정차대_T",
    "color": 7,
    "prefix": "정차대",
    "detectionLayers": [
      "정차대"
    ],
    "isSubAttachable": false,
    "fields": []
  },
  "턱낮춤": {
    "title": "턱낮춤",
    "layer": "턱낮춤_T",
    "color": 7,
    "prefix": "턱",
    "detectionLayers": [
      "턱낮춤"
    ],
    "isSubAttachable": false,
    "fields": []
  },
  "버스정류장": {
    "title": "버스정류장",
    "layer": "버스정류장_T",
    "color": 3,
    "prefix": "승강(버스)",
    "detectionLayers": [
      "버스정류장"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "정류장명",
        "type": "select",
        "options": [
          "--",
          "기타"
        ],
        "default": "--",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "재질",
        "type": "select",
        "options": [
          "스텐미러",
          "기타"
        ],
        "default": "스텐미러",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "벤치수",
        "type": "select",
        "options": [
          "1",
          "기타"
        ],
        "default": "1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "베이유무",
        "type": "select",
        "options": [
          "베이유",
          "베이무",
          "기타"
        ],
        "default": "베이유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "표지판유무",
        "type": "select",
        "options": [
          "표유",
          "표무",
          "기타"
        ],
        "default": "표유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "전력배전함": {
    "title": "전력배전함",
    "layer": "전력배전함_T",
    "color": 1,
    "prefix": "전력배전함",
    "detectionLayers": [
      "전력배전함"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "종류",
        "type": "select",
        "options": [
          "SW",
          "TR",
          "기타"
        ],
        "default": "SW",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "기타표지": {
    "title": "기타표지",
    "layer": "기타표지_T",
    "color": 3,
    "prefix": "기타",
    "detectionLayers": [
      "기타표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "높이",
        "type": "select",
        "options": [
          "3.0",
          "기타"
        ],
        "default": "3.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "측주",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "%%C600",
          "1.7*1.0",
          "1.0*1.7",
          "0.6*0.2",
          "0.4*0.6",
          "0.8*0.2",
          "0.6*0.2",
          "기타"
        ],
        "default": "%%C600",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "내용",
        "type": "select",
        "options": [
          "소방용수",
          "불법주정차단속중",
          "방범용CCTV단속중",
          "단속중",
          "어린이보호구역/어린이보호/최고속도제한",
          "기타"
        ],
        "default": "소방용수",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "양면유무",
        "type": "select",
        "options": [
          "단면",
          "양면",
          "기타"
        ],
        "default": "단면",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "CCTV": {
    "title": "CCTV",
    "layer": "CCTV_T",
    "color": 1,
    "prefix": "CCTV",
    "detectionLayers": [
      "CCTV"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "형태",
        "type": "select",
        "options": [
          "원형",
          "강판",
          "기타"
        ],
        "default": "원형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "개수",
        "type": "select",
        "options": [
          "1",
          "기타"
        ],
        "default": "1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "도로반사경": {
    "title": "도로반사경",
    "layer": "도로반사경_T",
    "color": 5,
    "prefix": "반사경",
    "detectionLayers": [
      "도로반사경"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "높이",
        "type": "select",
        "options": [
          "1.8",
          "기타"
        ],
        "default": "1.8",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "제원",
        "type": "select",
        "options": [
          "%%C1000",
          "%%C1200",
          "기타"
        ],
        "default": "%%C1000",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "지주형식",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "편지",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "볼라드": {
    "title": "볼라드",
    "layer": "볼라드_T",
    "color": 5,
    "prefix": "볼",
    "detectionLayers": [
      "볼라드"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "개수",
        "type": "select",
        "options": [
          "2",
          "기타"
        ],
        "default": "2",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "형태",
        "type": "select",
        "options": [
          "원형",
          "U형",
          "화강석",
          "기타"
        ],
        "default": "원형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "재질",
        "type": "select",
        "options": [
          "우레탄(스텐)",
          "우레탄",
          "스텐",
          "기타"
        ],
        "default": "우레탄(스텐)",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "높이",
        "type": "select",
        "options": [
          "0.8",
          "기타"
        ],
        "default": "0.8",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "전광표지": {
    "title": "전광표지",
    "layer": "전광표지_T",
    "color": 5,
    "prefix": "전광표지",
    "detectionLayers": [
      "전광표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "형태",
        "type": "select",
        "options": [
          "발광형",
          "기타"
        ],
        "default": "발광형",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "표시방식",
        "type": "select",
        "options": [
          "문자식",
          "도형식",
          "혼합식",
          "기타"
        ],
        "default": "문자식",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "지주형식",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "편지",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "도로표지": {
    "title": "도로표지",
    "layer": "도로표지_T",
    "color": 1,
    "prefix": "도로표지",
    "detectionLayers": [
      "도로표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "종류",
        "type": "select",
        "options": [
          "방향",
          "이정",
          "안내",
          "지명",
          "예고",
          "기타"
        ],
        "default": "방향",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "높이",
        "type": "select",
        "options": [
          "5.5",
          "기타"
        ],
        "default": "5.5",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "4.5*1.4",
          "3.7*1.4",
          "5.0*2.5",
          "1.5*1.0",
          "기타"
        ],
        "default": "4.5*1.4",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "보조유무",
        "type": "select",
        "options": [
          "보유",
          "보무"
        ],
        "default": "보유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "편지",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "신호등": {
    "title": "신호등",
    "layer": "신호등_T",
    "color": 1,
    "prefix": "차신",
    "detectionLayers": [
      "신호등"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "차신형식",
        "type": "select",
        "options": [
          "횡3*1",
          "횡3*2",
          "횡4*1",
          "횡4*2",
          "기타"
        ],
        "default": "횡3*1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "구분",
        "type": "select",
        "options": [
          "보신"
        ],
        "default": "보신",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "보신형식",
        "type": "select",
        "options": [
          "종2*1",
          "종2*2",
          "기타"
        ],
        "default": "종2*1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "잔여유뮤",
        "type": "select",
        "options": [
          "잔유",
          "잔무",
          "기타"
        ],
        "default": "잔유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "측주",
        "type": "text",
        "default": "",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "횡보등유무",
        "type": "select",
        "options": [
          "횡보등1",
          "횡보등2",
          "기타"
        ],
        "default": "횡보등1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_7",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "신호등(차신)": {
    "title": "신호등(차신)",
    "layer": "신호등_T",
    "color": 1,
    "prefix": "차신",
    "detectionLayers": [
      "신호등"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "차신형식",
        "type": "select",
        "options": [
          "횡3*1",
          "횡3*2",
          "횡4*1",
          "횡4*2",
          "기타"
        ],
        "default": "횡3*1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "지주",
        "type": "select",
        "options": [
          "측주"
        ],
        "default": "측주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "신호등(보신)": {
    "title": "신호등(보신)",
    "layer": "신호등_T",
    "color": 1,
    "prefix": "보신",
    "detectionLayers": [
      "신호등"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "보신형식",
        "type": "select",
        "options": [
          "종2*1",
          "종2*2",
          "기타"
        ],
        "default": "종2*1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "잔여유뮤",
        "type": "select",
        "options": [
          "잔유",
          "잔무",
          "기타"
        ],
        "default": "잔유",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "지주",
        "type": "select",
        "options": [
          "측주"
        ],
        "default": "측주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "횡보등유무",
        "type": "select",
        "options": [
          "횡보등1",
          "횡보등2",
          "기타"
        ],
        "default": "횡보등1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "지시표지": {
    "title": "지시표지",
    "layer": "지시표지_T",
    "color": 1,
    "prefix": "지시",
    "detectionLayers": [
      "지시표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "높이",
        "type": "select",
        "options": [
          "2.5",
          "기타"
        ],
        "default": "2.5",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "측주",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "%%C600",
          "%%C900",
          "삼각0.9",
          "삼각1.2",
          "오각0.6*0.2",
          "오각0.9*0.2",
          "팔각0.6",
          "팔각0.9",
          "역삼각0.9",
          "역삼각1.2",
          "1.0*1.0",
          "기타"
        ],
        "default": "%%C600",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "내용",
        "type": "select",
        "options": [
          "자전거및보행자겸용도로",
          "자전거및통행구분",
          "자전거및보행자분리도로",
          "자전거전용도로",
          "자전거횡단도",
          "일방통행",
          "횡단보도",
          "비보호좌회전",
          "유턴",
          "어린이보호",
          "기타"
        ],
        "default": "자전거및보행자겸용도로",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "양면유무",
        "type": "select",
        "options": [
          "양면",
          "삭제",
          "기타"
        ],
        "default": "양면",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "규제표지": {
    "title": "규제표지",
    "layer": "규제표지_T",
    "color": 1,
    "prefix": "규제",
    "detectionLayers": [
      "규제표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "높이",
        "type": "select",
        "options": [
          "2.5",
          "기타"
        ],
        "default": "2.5",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "측주",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "%%C600",
          "%%C900",
          "삼각0.9",
          "삼각1.2",
          "오각0.6*0.2",
          "오각0.9*0.2",
          "팔각0.6",
          "팔각0.9",
          "역삼각0.9",
          "역삼각1.2",
          "1.0*1.0",
          "기타"
        ],
        "default": "%%C600",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "내용",
        "type": "select",
        "options": [
          "최고속도제한",
          "주정차금지",
          "양보",
          "서행",
          "직진금지",
          "좌회전금지",
          "천천히",
          "차높이제한",
          "기타"
        ],
        "default": "최고속도제한",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "양면유무",
        "type": "select",
        "options": [
          "양면",
          "삭제",
          "기타"
        ],
        "default": "양면",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "주의표지": {
    "title": "주의표지",
    "layer": "주의표지_T",
    "color": 1,
    "prefix": "주의",
    "detectionLayers": [
      "주의표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "높이",
        "type": "select",
        "options": [
          "2.5",
          "기타"
        ],
        "default": "2.5",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "측주",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "%%C600",
          "%%C900",
          "삼각0.9",
          "삼각1.2",
          "오각0.6*0.2",
          "오각0.9*0.2",
          "팔각0.6",
          "팔각0.9",
          "역삼각0.9",
          "역삼각1.2",
          "1.0*1.0",
          "기타"
        ],
        "default": "%%C600",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "내용",
        "type": "select",
        "options": [
          "과속방지턱",
          "좌로굽은도로",
          "+자형교차로",
          "도록폭이좁아짐",
          "우측차로없어짐",
          "횡단보도",
          "어린이보호",
          "기타"
        ],
        "default": "과속방지턱",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "양면유무",
        "type": "select",
        "options": [
          "양면",
          "삭제",
          "기타"
        ],
        "default": "양면",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "보조표지": {
    "title": "보조표지",
    "layer": "보조표지_T",
    "color": 1,
    "prefix": "보조",
    "detectionLayers": [
      "보조표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "높이",
        "type": "select",
        "options": [
          "2.5",
          "기타"
        ],
        "default": "2.5",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "측주",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "1.0*1.0",
          "0.6*0.6",
          "0.6*0.2",
          "0.4*0.2",
          "기타"
        ],
        "default": "1.0*1.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "내용",
        "type": "select",
        "options": [
          "어린이보호해제",
          "최고속도제한해제",
          "우회전금지",
          "거리",
          "구간내",
          "진입금지",
          "구간끝",
          "구간내",
          "견인지역",
          "해제",
          "좌회전시보행신호시",
          "기타"
        ],
        "default": "어린이보호해제",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "양면유무",
        "type": "select",
        "options": [
          "양면",
          "삭제",
          "기타"
        ],
        "default": "양면",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "과속카메라": {
    "title": "과속카메라",
    "layer": "과속카메라_T",
    "color": 1,
    "prefix": "과속카메라",
    "detectionLayers": [
      "과속카메라"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "지주",
        "type": "select",
        "options": [
          "강관",
          "강판",
          "삭제",
          "기타"
        ],
        "default": "강관",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "개수",
        "type": "select",
        "options": [
          "1",
          "기타"
        ],
        "default": "1",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "사설표지": {
    "title": "사설표지",
    "layer": "사설표지_T",
    "color": 1,
    "prefix": "사설",
    "detectionLayers": [
      "사설표지"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "측주",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "높이",
        "type": "select",
        "options": [
          "2.5",
          "기타"
        ],
        "default": "2.5",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "1.0*1.0",
          "기타"
        ],
        "default": "1.0*1.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "내용",
        "type": "select",
        "options": [
          "현장사무소",
          "기타"
        ],
        "default": "현장사무소",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_5",
        "label": "양면유무",
        "type": "select",
        "options": [
          "양면",
          "삭제",
          "기타"
        ],
        "default": "양면",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_6",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "교량": {
    "title": "교량",
    "layer": "교량_T",
    "color": 7,
    "prefix": "교량",
    "detectionLayers": [
      "교량"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "차량충격흡수시설": {
    "title": "차량충격흡수시설",
    "layer": "차량충격흡수시설_T",
    "color": 5,
    "prefix": "충읍",
    "detectionLayers": [
      "차량충격흡수시설"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "재질",
        "type": "select",
        "options": [
          "합성재",
          "철재",
          "플라스틱",
          "기타"
        ],
        "default": "합성재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "펜스": {
    "title": "펜스",
    "layer": "펜스_T",
    "color": 5,
    "prefix": "펜스",
    "detectionLayers": [
      "펜스"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "재질",
        "type": "select",
        "options": [
          "철조망",
          "철책",
          "CON",
          "기타"
        ],
        "default": "철조망",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "가로등제어기": {
    "title": "가로등제어기",
    "layer": "가로등제어기_T",
    "color": 1,
    "prefix": "가점",
    "detectionLayers": [
      "가로등제어기"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "신호등제어기": {
    "title": "신호등제어기",
    "layer": "신호등제어기_T",
    "color": 1,
    "prefix": "신제",
    "detectionLayers": [
      "신호등제어기"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "자전거보관대": {
    "title": "자전거보관대",
    "layer": "자전거보관대_T",
    "color": 1,
    "prefix": "자보",
    "detectionLayers": [
      "자전거보관대"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "형식",
        "type": "select",
        "options": [
          "혼합",
          "유개",
          "무개"
        ],
        "default": "혼합",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "거치대수",
        "type": "select",
        "options": [
          "10",
          "개수"
        ],
        "default": "10",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "시설길이",
        "type": "select",
        "options": [
          "3.0",
          "기타"
        ],
        "default": "3.0",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "전력주": {
    "title": "전력주",
    "layer": "전력주_T",
    "color": 1,
    "prefix": "전력주",
    "detectionLayers": [
      "전력주"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "게시판": {
    "title": "게시판",
    "layer": "게시판_T",
    "color": 1,
    "prefix": "게시판",
    "detectionLayers": [
      "게시판"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "현수막게시대": {
    "title": "현수막게시대",
    "layer": "현수막게시대_T",
    "color": 1,
    "prefix": "현수막",
    "detectionLayers": [
      "현수막게시대"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "기타제어기": {
    "title": "기타제어기",
    "layer": "기타제어기_T",
    "color": 1,
    "prefix": "기타제어기",
    "detectionLayers": [
      "기타제어기"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "벤치": {
    "title": "벤치",
    "layer": "벤치_T",
    "color": 1,
    "prefix": "벤치",
    "detectionLayers": [
      "벤치"
    ],
    "isSubAttachable": false,
    "fields": [
      {
        "id": "f_1",
        "label": "재질",
        "type": "select",
        "options": [
          "목재",
          "플라스틱",
          "화강석",
          "기타"
        ],
        "default": "목재",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  },
  "새주소": {
    "title": "새주소",
    "layer": "새주소_T",
    "color": 7,
    "prefix": "새주소",
    "detectionLayers": [
      "새주소"
    ],
    "isSubAttachable": true,
    "fields": [
      {
        "id": "f_1",
        "label": "지주",
        "type": "select",
        "options": [
          "단주",
          "복주",
          "측주",
          "현수",
          "삭제",
          "기타"
        ],
        "default": "단주",
        "isSupport": true,
        "isPhoto": false
      },
      {
        "id": "f_2",
        "label": "높이",
        "type": "select",
        "options": [
          "2.5",
          "기타"
        ],
        "default": "2.5",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_3",
        "label": "제원",
        "type": "select",
        "options": [
          "260*700",
          "기타"
        ],
        "default": "260*700",
        "isSupport": false,
        "isPhoto": false
      },
      {
        "id": "f_4",
        "label": "사진",
        "type": "select",
        "options": [
          "사진",
          "삭제"
        ],
        "default": "사진",
        "isSupport": false,
        "isPhoto": true
      }
    ]
  }
};
})(typeof window !== 'undefined' ? window : this);
