;;; ====================================================================
;;; InsertPhotos.lsp - 스마트 스냅 버전
;;; 웹앱에서 작업한 사진과 메모를 AutoCAD 도면에 자동 삽입
;;; 
;;; 기능:
;;;   1. 탐색기로 메타데이터 파일 선택
;;;   2. 사진은 메타데이터 폴더에서 자동 로드
;;;   3. 사진 스케일: 1.5, 텍스트 높이: 1.5
;;;   4. 스마트 스냅: 2M(도면단위 2.0) 이내 블록 삽입점(INSERT)만 스냅
;;;   5. 속도: CMDECHO 0, UNDO 그룹, VLA AddRaster, TEXTSTYLE 1회 조회
;;; ====================================================================

(defun C:INSERTPHOTOS (/ dwg-path dwg-name base-name json-file f line content
                         photo-count text-count i j fileName x y width height memo photo-path
                         insert-pt scale text-pt text-height dxf-y
                         texts-start texts-end texts-content
                         text-x text-y text-content text-fontsize text-dxf-y
                         success-count fail-count
                         start-time end-time snap-pt snap-x snap-y
                         photo-folder doc mspace textstyle-name old-cmdecho)
  
  ;; Visual LISP 함수 사용을 위한 초기화
  (vl-load-com)
  
  (princ "\n========================================")
  (princ "\n웹앱 사진/메모 자동 삽입 시작")
  (princ "\n  사진 스케일: 1.5 | 텍스트 높이: 1.5")
  (princ "\n========================================\n")
  
  ;; 성능 측정 시작
  (setq start-time (getvar "MILLISECS"))
  
  ;; 현재 도면 경로
  (setq dwg-path (getvar "DWGPREFIX"))
  (setq dwg-name (getvar "DWGNAME"))
  (setq base-name (vl-filename-base dwg-name))
  
  (princ (strcat "\n현재 도면: " dwg-name))
  (princ (strcat "\n도면 경로: " dwg-path))
  
  ;; ★ 메타데이터 파일 직접 선택 (탐색기)
  (princ "\n\n📁 메타데이터 JSON 파일을 선택하세요...")
  (princ "\n   (사진은 선택한 파일과 같은 폴더에서 자동으로 가져옵니다)")
  (setq json-file 
    (getfiled "메타데이터 JSON 파일 선택" 
              dwg-path
              "json" 
              0))
  (if (= json-file nil)
    (progn
      (princ "\n❌ 메타데이터 파일 선택이 취소되었습니다.")
      (princ)
      (exit)
    )
  )
  
  ;; ★ 사진 폴더 = 메타데이터 파일 폴더 (자동 설정)
  (setq photo-folder (strcat (vl-filename-directory json-file) "\\"))
  
  (princ (strcat "\n\n📄 메타데이터: " (vl-filename-base json-file) ".json"))
  (princ (strcat "\n📷 사진 폴더: " photo-folder))
  
  (if (not (findfile json-file))
    (progn
      (princ (strcat "\n\n❌ 메타데이터 파일을 찾을 수 없습니다:"))
      (princ (strcat "\n   " json-file))
    )
    (progn
      (princ (strcat "\n✅ 메타데이터 파일 로드 완료"))
      
      ;; 파일 읽기
      (setq content "")
      (setq f (open json-file "r"))
      (if f
        (progn
          (while (setq line (read-line f))
            (setq content (strcat content line "\n"))
          )
          (close f)
          
          ;; 사진 개수 계산
          (setq photo-count (count-occurrences "\"fileName\"" content))
          
          ;; 텍스트 개수 계산 (texts 배열 내 id 개수로 추정)
          (setq texts-start (vl-string-search "\"texts\":" content))
          (if texts-start
            (progn
              (setq texts-start (vl-string-search "[" content texts-start))
              (setq texts-end (vl-string-search "]" content texts-start))
              (setq texts-content (substr content (1+ texts-start) (- texts-end texts-start)))
              (setq text-count (count-occurrences "\"id\"" texts-content))
            )
            (setq text-count 0)
          )
          
          (princ (strcat "\n\n📊 발견된 항목:"))
          (princ (strcat "\n   사진: " (itoa photo-count) "개"))
          (princ (strcat "\n   텍스트: " (itoa text-count) "개"))
          
          (if (or (> photo-count 0) (> text-count 0))
            (progn
              (princ "\n\n🚀 직접 삽입 시작 (최적화 모드)...\n")
              
              ;; 성공/실패 카운터 초기화
              (setq success-count 0)
              (setq fail-count 0)
              
              ;; ★ 속도 최적화: CMDECHO 끄기, UNDO 그룹, VLA 객체/텍스트스타일 1회 조회
              (setq old-cmdecho (getvar "CMDECHO"))
              (setvar "CMDECHO" 0)
              (command "_.UNDO" "_Begin")
              (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
              (setq mspace (vla-get-ModelSpace doc))
              (setq textstyle-name (getvar "TEXTSTYLE"))
              
              ;; 각 사진 처리 (직접 삽입)
              (if (> photo-count 0)
                (progn
                  (princ "\n📸 사진 삽입 중...\n")
                  (setq i 0)
                  (while (< i photo-count)
                    (princ (strcat "\r   진행: [" (itoa (+ i 1)) "/" (itoa photo-count) "] "))
                    
                    ;; JSON에서 값 추출
                    (setq fileName (get-json-value content "fileName" i))
                    (setq x (atof (get-json-value content "\"x\"" i)))
                    (setq y (atof (get-json-value content "\"y\"" i)))
                    (setq width (atof (get-json-value content "\"width\"" i)))
                    (setq height (atof (get-json-value content "\"height\"" i)))
                    (setq memo (get-json-value content "memo" i))
                    
                    ;; Y축 좌표 역변환
                    (setq dxf-y (- y))
                    
                    ;; ★ 스마트 스냅: 2M(도면단위 2.0) 이내 가장 가까운 블록 삽입점 찾기
                    (setq snap-pt (smart-snap (list x dxf-y 0.0) 2.0))
                    (setq snap-x (car snap-pt))
                    (setq snap-y (cadr snap-pt))
                    
                    ;; ★ 파일 경로: 사용자가 선택한 사진 폴더에서 찾기
                    (setq photo-path (strcat photo-folder fileName))
                    
                    (if (not (findfile photo-path))
                      (progn
                        (princ (strcat "\n       ⚠️ 파일 없음: " fileName))
                        (setq fail-count (+ fail-count 1))
                      )
                      (progn
                        ;; ★ 사진 축척 1.5, 텍스트 높이 1.5
                        (setq scale 1.5)
                        (setq text-height 1.5)
                        
                        ;; 이미지 삽입: VLA AddRaster(빠름) 시도, 실패 시 vl-cmdf
                        (if (vl-catch-all-error-p
                              (vl-catch-all-apply
                                'vla-AddRaster
                                (list mspace photo-path (vlax-3D-point snap-x snap-y 0.0) scale 0.0)
                              )
                            )
                          (progn
                            ;; VLA 실패 시 명령어로 삽입
                            (if (vl-catch-all-error-p
                                  (vl-catch-all-apply
                                    'vl-cmdf
                                    (list "._-IMAGE" "_A" photo-path (strcat (rtos snap-x 2 6) "," (rtos snap-y 2 6)) (rtos scale 2 6) "0")
                                  )
                                )
                              (progn
                                (princ (strcat "\n       ❌ 이미지 삽입 실패: " fileName))
                                (setq fail-count (+ fail-count 1))
                              )
                              (progn
                                ;; 메모 entmake (TEXTSTYLE 1회 조회값 사용)
                                (if (and memo 
                                         (> (strlen memo) 0) 
                                         (/= memo "")
                                         (/= (vl-string-trim " \t\n\r" memo) ""))
                                  (entmake (list
                                    '(0 . "TEXT")
                                    (cons 10 (list snap-x snap-y 0.0))
                                    (cons 40 text-height)
                                    (cons 1 memo)
                                    (cons 50 0.0)
                                    (cons 7 textstyle-name)
                                  ))
                                )
                                (setq success-count (+ success-count 1))
                              )
                            )
                          )
                          (progn
                            ;; 메모 entmake (TEXTSTYLE 1회 조회값 사용)
                            (if (and memo 
                                     (> (strlen memo) 0) 
                                     (/= memo "")
                                     (/= (vl-string-trim " \t\n\r" memo) ""))
                              (entmake (list
                                '(0 . "TEXT")
                                (cons 10 (list snap-x snap-y 0.0))
                                (cons 40 text-height)
                                (cons 1 memo)
                                (cons 50 0.0)
                                (cons 7 textstyle-name)
                              ))
                            )
                            (setq success-count (+ success-count 1))
                          )
                        )
                      )
                    )
                    
                    (setq i (+ i 1))
                  )
                  (princ "\n")
                )
              )
              
              ;; 독립 텍스트 처리 (스마트 스냅 적용)
              (if (> text-count 0)
                (progn
                  (princ "\n📝 독립 텍스트 삽입 중...\n")
                  
                  (setq j 0)
                  (while (< j text-count)
                    (princ (strcat "\r   진행: [" (itoa (+ j 1)) "/" (itoa text-count) "] "))
                    
                    ;; JSON에서 값 추출 (texts 배열 인덱스로)
                    (setq text-x (atof (get-json-value-from-texts content "\"x\"" j)))
                    (setq text-y (atof (get-json-value-from-texts content "\"y\"" j)))
                    (setq text-content (get-json-value-from-texts content "\"text\"" j))
                    (setq text-fontsize (atof (get-json-value-from-texts content "\"fontSize\"" j)))
                    
                    ;; Y축 좌표 역변환
                    (setq text-dxf-y (- text-y))
                    
                    ;; ★ 스마트 스냅: 2M(도면단위 2.0) 이내 가장 가까운 블록 삽입점 찾기
                    (setq snap-pt (smart-snap (list text-x text-dxf-y 0.0) 2.0))
                    (setq snap-x (car snap-pt))
                    (setq snap-y (cadr snap-pt))
                    
                    ;; entmake로 TEXT 엔티티 직접 생성 (textstyle-name 1회 조회값 사용)
                    ;; ★ 독립 텍스트 높이 1.5
                    (entmake (list
                      '(0 . "TEXT")
                      (cons 10 (list snap-x snap-y 0.0))
                      (cons 40 1.5)
                      (cons 1 text-content)
                      (cons 50 0.0)
                      (cons 7 textstyle-name)
                    ))
                    
                    (setq success-count (+ success-count 1))
                    (setq j (+ j 1))
                  )
                  (princ "\n")
                )
              )
              
              ;; UNDO 그룹 종료, CMDECHO 복원
              (command "_.UNDO" "_End")
              (setvar "CMDECHO" old-cmdecho)
              
              ;; 결과 요약
              (princ "\n\n========================================")
              (princ "\n✅ 삽입 완료!")
              (princ (strcat "\n   성공: " (itoa success-count) "개"))
              (if (> fail-count 0)
                (princ (strcat "\n   실패: " (itoa fail-count) "개"))
              )
              
              ;; 성능 측정 종료
              (setq end-time (getvar "MILLISECS"))
              (princ (strcat "\n   소요 시간: " (itoa (- end-time start-time)) "ms"))
              (princ "\n========================================")
            )
            (princ "\n   사진과 텍스트 없음")
          )
          
          (if (or (> photo-count 0) (> text-count 0))
            (princ "\n")
            (progn
              (princ "\n\n========================================")
              (princ "\n✅ 작업 완료!")
              (princ "\n========================================\n")
            )
          )
        )
        (princ "\n❌ 메타데이터 파일을 열 수 없습니다")
      )
    )
  )
  
  (princ)
)

;;; ====================================================================
;;; 보조 함수
;;; ====================================================================

;; 중첩된 대괄호를 올바르게 처리하는 닫는 괄호 찾기
;; start-pos: 0-based position of opening '['
;; Returns: 0-based position of matching ']', or nil
(defun find-closing-bracket (str start-pos / pos depth ch)
  (setq pos (1+ start-pos))
  (setq depth 1)
  (while (and (< pos (strlen str)) (> depth 0))
    (setq ch (substr str (1+ pos) 1))
    (if (= ch "[") (setq depth (1+ depth)))
    (if (= ch "]") (setq depth (1- depth)))
    (if (> depth 0) (setq pos (1+ pos)))
  )
  (if (= depth 0) pos nil)
)

;; 스마트 스냅: snap-radius(도면단위) 이내 가장 가까운 블록 삽입점 찾기
;; snap-radius: 도면단위(2M이면 2.0). 없으면 원좌표 반환
(defun smart-snap (pt snap-radius / ss ent ent-data ent-type
                      closest-pt closest-dist test-pt test-dist
                      i min-x min-y max-x max-y)
  
  ;; 검색 영역 설정 (원좌표 중심 snap-radius 범위)
  (setq min-x (- (car pt) snap-radius))
  (setq min-y (- (cadr pt) snap-radius))
  (setq max-x (+ (car pt) snap-radius))
  (setq max-y (+ (cadr pt) snap-radius))
  
  ;; ★ 범위 내 INSERT(블록) 객체만 선택 (끝점 무시, 삽입점만)
  (setq ss (ssget "C" 
                  (list min-x min-y) 
                  (list max-x max-y)
                  '((0 . "INSERT"))))
  
  (setq closest-pt nil)
  (setq closest-dist snap-radius)  ;; 최대 검색 거리
  
  (if ss
    (progn
      ;; ★ INSERT(블록) 삽입점만 검사
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq ent-data (entget ent))
        (setq ent-type (cdr (assoc 0 ent-data)))
        
        ;; INSERT (블록): 삽입점(10)
        (if (= ent-type "INSERT")
          (progn
            (setq test-pt (cdr (assoc 10 ent-data)))
            (setq test-dist (distance pt (list (car test-pt) (cadr test-pt))))
            (if (< test-dist closest-dist)
              (progn
                (setq closest-dist test-dist)
                (setq closest-pt (list (car test-pt) (cadr test-pt) 0.0))
              )
            )
          )
        )
        
        (setq i (1+ i))
      )
    )
  )
  
  ;; 결과 반환: 스냅점 찾으면 스냅점, 없으면 원좌표
  (if closest-pt
    closest-pt
    pt
  )
)

;; 문자열에서 부분문자열 개수 세기
(defun count-occurrences (search-str in-str / count pos)
  (setq count 0)
  (setq pos 1)
  (while (setq pos (vl-string-search search-str in-str (1- pos)))
    (setq count (1+ count))
    (setq pos (+ pos (strlen search-str) 1))
  )
  count
)

;; texts 배열에서 N번째 항목의 키 값 추출
(defun get-json-value-from-texts (json-str key occurrence / texts-start texts-end texts-content)
  ;; "texts": [ ... ] 부분 찾기
  (setq texts-start (vl-string-search "\"texts\":" json-str))
  (if texts-start
    (progn
      ;; texts 배열 시작 찾기
      (setq texts-start (vl-string-search "[" json-str texts-start))
      ;; texts 배열 끝 찾기 (중첩 대괄호 지원)
      (setq texts-end (find-closing-bracket json-str texts-start))
      ;; texts 배열 내용 추출
      (setq texts-content (substr json-str (1+ texts-start) (- texts-end texts-start)))
      ;; texts 내용에서 N번째 키 값 추출
      (get-json-value texts-content key occurrence)
    )
    "" ; texts 배열이 없으면 빈 문자열
  )
)

;; JSON에서 N번째 키의 값 추출
(defun get-json-value (json-str key occurrence / pos count start-pos end-pos value)
  (setq count 0)
  (setq pos 0)
  (setq value "")
  
  ;; N번째 키 위치 찾기
  (while (and (<= count occurrence) (< pos (strlen json-str)))
    (setq pos (vl-string-search key json-str pos))
    (if pos
      (progn
        (if (= count occurrence)
          (progn
            ;; 키 다음의 : 찾기
            (setq start-pos (vl-string-search ":" json-str pos))
            (if start-pos
              (progn
                (setq start-pos (1+ start-pos))
                
                ;; 공백 건너뛰기
                (while (and (< start-pos (strlen json-str))
                            (member (substr json-str (1+ start-pos) 1) '(" " "\t" "\n" "\r")))
                  (setq start-pos (1+ start-pos))
                )
                
                (setq start-pos (1+ start-pos))
                
                ;; 값 타입 확인
                (cond
                  ;; 문자열 값
                  ((= (substr json-str start-pos 1) "\"")
                   (setq end-pos (vl-string-search "\"" json-str start-pos))
                   (if end-pos
                     (setq value (substr json-str (1+ start-pos) (- end-pos start-pos)))
                     (setq value "")
                   )
                  )
                  
                  ;; 숫자 값
                  ((or (wcmatch (substr json-str start-pos 1) "0123456789.-+"))
                   (setq end-pos start-pos)
                   (while (and (< end-pos (strlen json-str))
                               (wcmatch (substr json-str (1+ end-pos) 1) "0123456789.-+eE"))
                     (setq end-pos (1+ end-pos))
                   )
                   (setq value (substr json-str start-pos (1+ (- end-pos start-pos))))
                  )
                  
                  ;; null 값 처리
                  ((and (<= (+ start-pos 3) (strlen json-str))
                        (= (strcase (substr json-str start-pos 4)) "NULL"))
                   (setq value "")
                  )
                  
                  ;; 기타
                  (t
                   (setq end-pos (vl-string-search "," json-str start-pos))
                   (if (not end-pos)
                     (setq end-pos (vl-string-search "}" json-str start-pos))
                   )
                   (if end-pos
                     (setq value (substr json-str start-pos (1+ (- end-pos start-pos))))
                     (setq value "")
                   )
                  )
                )
              )
            )
          )
        )
        (setq count (1+ count))
        (setq pos (+ pos (strlen key)))
      )
      (setq pos (strlen json-str))
    )
  )
  
  ;; 값 정리
  (while (and (> (strlen value) 0)
              (member (substr value 1 1) '(" " "\t" "\n" "\r" "\"" "'")))
    (setq value (substr value 2))
  )
  (while (and (> (strlen value) 0)
              (member (substr value (strlen value) 1) '(" " "\t" "\n" "\r" "," "\"" "'")))
    (setq value (substr value 1 (1- (strlen value))))
  )
  
  value
)

;;; ====================================================================
;;; 스크립트 로드 완료
;;; ====================================================================

(princ "\n========================================")
(princ "\n✅ InsertPhotos.lsp 로드 완료")
(princ "\n========================================")
(princ "\n명령어: INSERTPHOTOS")
(princ "\n")
(princ "\n기능:")
(princ "\n  - 탐색기로 메타데이터 파일 선택")
(princ "\n  - 사진은 메타데이터 폴더에서 자동 로드")
(princ "\n  - 사진 스케일: 1.5")
(princ "\n  - 텍스트 높이: 1.5")
(princ "\n  - 스마트 스냅: 2M(도면단위 2.0) 이내 블록 삽입점만 스냅")
(princ "\n========================================\n")
(princ)
