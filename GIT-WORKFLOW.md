# 2026 프로젝트 — Git 워크플로우 정리

PC와 노트북에서 같은 저장소를 쓸 때 따라갈 절차입니다.

---

## 1. 작업을 **시작할 때** (PC든 노트북이든)

다른 기기에서 올린 변경이 있을 수 있으므로, **항상 먼저 최신 내용을 받습니다.**

```bash
cd 2026
git pull origin main
```

- **PC에서 시작** → 위 명령 실행 후 작업
- **노트북에서 시작** → 위 명령 실행 후 작업

---

## 2. 작업을 **저장해서 올릴 때** (커밋 & 푸시)

수정을 마쳤으면 아래 순서대로 실행합니다.

```bash
cd 2026
git add .
git commit -m "커밋 메시지"
git push origin main
```

**커밋 메시지 예시**
- `0226-production-guide-color-change`
- `0227-메인 페이지 레이아웃 수정`
- `fix: 링크 오류 수정`

---

## 3. **다른 기기에서** 최신 상태로 열어볼 때

노트북에서 push 했으면 PC에서, PC에서 push 했으면 노트북에서 **반드시 pull** 후에 파일을 봅니다.

```bash
cd 2026
git pull origin main
```

그 다음에 에디터/브라우저로 열어보면 방금 올린 내용이 반영되어 있습니다.

---

## 요약 표

| 상황 | 할 일 | 명령어 |
|------|--------|--------|
| PC에서 작업 시작 | 최신 받기 | `cd 2026` → `git pull origin main` |
| 노트북에서 작업 시작 | 최신 받기 | `cd 2026` → `git pull origin main` |
| 변경사항 저장 후 올리기 | 커밋 & 푸시 | `git add .` → `git commit -m "메시지"` → `git push origin main` |
| 다른 기기에서 최신으로 보기 | 최신 받기 | `cd 2026` → `git pull origin main` |

---

## 한 줄 요약

- **시작할 때·열어볼 때** → `git pull origin main`
- **저장해서 공유할 때** → `git add .` → `git commit -m "메시지"` → `git push origin main`
