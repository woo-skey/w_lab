# w_lab

Supabase + Vercel + Next.js 기반 웹사이트

## 기술 스택

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Deployment**: Vercel

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 Supabase 정보를 입력합니다:

```bash
cp .env.example .env.local
```

그 후 `.env.local`에 Supabase URL과 Anon Key를 입력합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 배포

Vercel에 연결하면 자동으로 배포됩니다.

[Deploy with Vercel](https://vercel.com/new?utm_source=github&utm_medium=readme&utm_campaign=w_lab)
