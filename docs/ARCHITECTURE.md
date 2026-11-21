# معماری

## پشتهٔ فناوری

Next.js 16 App Router، TypeScript، Tailwind CSS، PostgreSQL، Prisma، Zod، React Hook Form، Better Auth، Recharts و Ollama.

## لایه‌ها

```text
app/                 صفحات، layoutها، Route Handlerها و Server Actionها
features/            قابلیت‌های دامنه و اجزای مربوط به هر قابلیت
lib/                 Prisma، احراز هویت، اعتبارسنجی و ابزارهای اشتراکی
services/            منطق دامنهٔ حسابداری و تراکنش‌های دیتابیس
```

- Server Components برای خواندن داده و صفحات؛ Client Components فقط برای تعامل کاربر.
- عملیات مالی از طریق سرویس سمت سرور و Prisma transaction اجرا می‌شوند.
- Route Handlerها برای APIهای بیرونی و یکپارچه‌سازی‌ها و Server Actionها برای فرم‌های داخلی استفاده می‌شوند.
- با Cache Components فعال، داده‌های وابسته به جلسه یا دیتابیس بدون کش صریح عمومی نمی‌شوند.
- Prisma Client فقط از `lib/prisma.ts` و در ماژول‌های سمت سرور مصرف می‌شود؛ نمونهٔ مشترک آن از ایجاد اتصال تکراری هنگام hot reload جلوگیری می‌کند.
- Better Auth در `lib/auth.ts` با Prisma adapter پیکربندی می‌شود؛ Route Handler و رابط کاربر در تسک‌های مستقل بعدی اضافه خواهند شد.

## امنیت

هر درخواست نوشتنی احراز هویت، نقش، اعتبارسنجی Zod و محدودیت سازمان را در سمت سرور بررسی می‌کند. اسرار فقط در متغیرهای محیطی باقی می‌مانند.
