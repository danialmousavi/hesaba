# حسابا

نرم‌افزار حسابداری هوشمند فارسی و RTL بر پایهٔ Next.js. محدوده و تصمیم‌های پروژه در پوشهٔ [docs](./docs) ثبت شده‌اند.

## اجرای محلی

1. Node.js سازگار با Next.js 16 و npm را نصب کنید.
2. فایل نمونه را به محیط محلی کپی کنید و مقدار راز احراز هویت را تغییر دهید:

```powershell
Copy-Item .env.example .env.local
```

3. وابستگی‌ها و سرور توسعه را اجرا کنید:

```bash
npm install
npm run dev
```

4. PostgreSQL توسعه‌ای را اجرا کنید:

```powershell
docker compose --env-file .env.local up -d postgres
```

پس از سالم شدن کانتینر، برنامه در `http://localhost:3000` قابل دسترس است. برای توقف سرویس از دستور زیر استفاده کنید؛ داده‌ها در volume پایدار می‌مانند:

```powershell
docker compose --env-file .env.local down
```

فرمان‌های Prisma که به پایگاه داده متصل می‌شوند داخل کانتینر اجرا می‌شوند تا به محدودیت Schema Engine در Windows وابسته نباشند:

```powershell
docker compose --env-file .env.local run --rm prisma db pull --print
docker compose --env-file .env.local run --rm prisma migrate dev
```

## بررسی کیفیت

```bash
npm run lint
npm run build
```

## متغیرهای محیطی

| متغیر | کاربرد |
|---|---|
| `POSTGRES_DB` | نام پایگاه دادهٔ توسعه‌ای Docker |
| `POSTGRES_USER` | کاربر PostgreSQL توسعه‌ای |
| `POSTGRES_PASSWORD` | گذرواژهٔ محلی PostgreSQL؛ در محیط واقعی مقدار امن انتخاب شود |
| `DATABASE_URL` | رشتهٔ اتصال PostgreSQL |
| `BETTER_AUTH_SECRET` | راز نشست و امضای احراز هویت؛ هرگز در Git ثبت نشود |
| `BETTER_AUTH_URL` | نشانی پایهٔ برنامه |
| `OLLAMA_BASE_URL` | نشانی سرویس محلی Ollama |
| `OLLAMA_MODEL` | نام مدل محلی |

فقط `.env.example` در مخزن نگهداری می‌شود؛ `.env.local` و سایر فایل‌های محیطی نادیده گرفته می‌شوند.
