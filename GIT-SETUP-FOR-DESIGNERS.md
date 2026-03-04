# 디자이너를 위한 Git 설치 & 터미널 가이드

디자이너가 Git 설치부터 터미널 사용, 일상 워크플로우까지 진행한 방법을 정리한 문서입니다.

---

## 1. 터미널이란?

**터미널**은 글자(텍스트)로 컴퓨터에 명령을 내리는 창입니다.  
마우스로 아이콘을 누르는 대신, **명령어를 입력**해서 폴더 이동·파일 실행·Git 작업 등을 합니다.

- **Mac:** "터미널(Terminal)" 또는 "iTerm" 앱
- **Windows:** "명령 프롬프트", "PowerShell", 또는 "Windows 터미널"
- **Cursor/VS Code:** 에디터 안에 터미널이 내장되어 있음 (아래 5번 참고)

---

## 2. Git 설치

### Mac에서 설치

**방법 A — 공식 사이트 (추천)**  
1. [git-scm.com](https://git-scm.com) 접속  
2. "Download for macOS" 클릭 후 설치 파일 실행  
3. 설치 마법사 따라가기 (기본값으로 Next만 눌러도 됨)

**방법 B — Homebrew 사용 (이미 설치되어 있다면)**  
터미널에서 아래 한 줄 입력 후 엔터:

```bash
brew install git
```

설치 확인:

```bash
git --version
```

`git version 2.x.x` 처럼 버전이 나오면 성공입니다.

### Windows에서 설치

1. [git-scm.com](https://git-scm.com) 접속  
2. "Download for Windows" 클릭 후 설치 파일 실행  
3. 설치 시 "Git from the command line and also from 3rd-party software" 옵션 선택 권장  
4. 설치 후 **새 터미널(또는 Cursor)을 한 번 닫았다가 다시 열기**

---

## 3. Git 최초 설정 (한 번만 하면 됨)

커밋할 때 "누가 했는지" 기록하기 위해 이름과 이메일을 설정합니다.

```bash
git config --global user.name "본인이름"
git config --global user.email "본인이메일@example.com"
```

- GitHub/GitLab 사용한다면 **가입한 이메일**을 넣는 것이 좋습니다.

---

## 4. 터미널 기본 명령어

| 하고 싶은 것 | 명령어 | 예시 |
|-------------|--------|------|
| 현재 위치 보기 | `pwd` | `pwd` |
| 폴더 안 파일/폴더 목록 보기 | `ls` | `ls` |
| 다른 폴더로 이동 | `cd 폴더경로` | `cd 2026`, `cd Documents` |
| 한 단계 위 폴더로 | `cd ..` | `cd ..` |
| 새 폴더 만들기 | `mkdir 폴더이름` | `mkdir my-project` |
| 빈 줄 없이 화면 정리 | `clear` (Mac) / `cls` (Win) | `clear` |

**실제로 자주 쓰는 흐름**

- 프로젝트 폴더로 이동: `cd 2026` (2026 폴더가 현재 위치 아래 있을 때)
- 현재 뭐가 있는지 확인: `ls`

---

## 5. Cursor에서 터미널 쓰기

Cursor 안에서 터미널을 쓰면 **이미 프로젝트 폴더가 열린 상태**라서 편합니다.

1. 메뉴에서 **Terminal → New Terminal** 선택  
   또는 단축키: **Ctrl + `** (백틱) / **Cmd + `** (Mac)
2. 아래쪽에 터미널 창이 열림
3. 이미 `2026` 폴더를 Cursor로 열었다면, 터미널도 그 폴더에서 시작됨  
   → `cd 2026` 없이 바로 `git pull` 같은 명령 사용 가능할 수 있음 (경로 확인은 `pwd`로)

---

## 6. Git 일상 워크플로우 (PC / 노트북)

### 작업 시작할 때 (매번)

다른 기기에서 올린 변경이 있을 수 있으므로, **먼저 최신 내용을 받습니다.**

```bash
cd 2026
git pull origin main
```

### 수정 후 저장해서 올릴 때

```bash
cd 2026
git add .
git commit -m "작업 내용을 짧게 적기"
git push origin main
```

**커밋 메시지 예시**  
- `0226-production-guide-color-change`  
- `0227-메인 레이아웃 수정`  
- `fix: 링크 오류 수정`

### 다른 기기에서 최신으로 볼 때

노트북에서 push 했다면 PC에서, PC에서 push 했다면 노트북에서:

```bash
cd 2026
git pull origin main
```

이후 에디터/브라우저로 열면 방금 올린 내용이 반영되어 있습니다.

---

## 7. 요약 표

| 상황 | 할 일 | 명령어 |
|------|--------|--------|
| 작업 시작 (PC/노트북) | 최신 받기 | `cd 2026` → `git pull origin main` |
| 수정 후 저장·공유 | 커밋 & 푸시 | `git add .` → `git commit -m "메시지"` → `git push origin main` |
| 다른 기기에서 최신으로 보기 | 최신 받기 | `cd 2026` → `git pull origin main` |

---

## 8. 한 줄로 기억하기

- **시작·열어볼 때** → `git pull origin main`
- **저장해서 공유할 때** → `git add .` → `git commit -m "메시지"` → `git push origin main`

---

*디자이너가 Git 설치부터 터미널 사용, 일상 워크플로우까지 진행한 방법을 정리한 문서입니다.*
