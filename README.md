# حسابا

نرم‌افزار حسابداری فارسی و راست‌چین مبتنی بر Next.js و PostgreSQL. وضعیت پیاده‌سازی در [معماری](./docs/ARCHITECTURE.md)، [تسک‌ها](./docs/TASKS.md)، [نقشه راه](./docs/ROADMAP.md) و [برنامه اجرای مراحل](./docs/EXECUTION_PLAN.md) ثبت شده است.

برای هدف و محدوده محصول، [نیازمندی‌ها](./docs/PRD.md) را ببینید. [طراحی داده](./docs/DATABASE.md) قواعد موجود و پیشنهادی، [طراحی AI](./docs/AI_DESIGN.md) قابلیت‌های هنوز ساخته‌نشده و [تغییرات](./docs/CHANGELOG.md) تاریخچه پروژه را توضیح می‌دهند.

## اجرای محلی در Windows

دستورها را از پوشه پروژه در PowerShell اجرا کنید. Next.js روی سیستم اجرا می‌شود؛ در نمونه زیر فقط PostgreSQL در Docker است. اگر PostgreSQL محلی دارید، `DATABASE_URL` را با اتصال خودتان هماهنگ کنید.

1. Node.js سازگار با نسخه پروژه، npm و در صورت استفاده از Docker، Docker Desktop را آماده کنید.
2. فقط اگر `.env.local` را از قبل ندارید، فایل نمونه را کپی کنید:

```powershell
Copy-Item .env.example .env.local
```

3. در `.env.local` مقدار `BETTER_AUTH_SECRET` را با خروجی دستور زیر جایگزین کنید. راز و فایل محیطی را منتشر نکنید. `BETTER_AUTH_URL` باید نشانی واقعی برنامه باشد.

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. PostgreSQL نمونه را اجرا کنید و مطمئن شوید آدرس، پورت، نام پایگاه و گذرواژه در `DATABASE_URL` مطابق سرور اجراشده‌اند. Compose نمونه پورت میزبان ۵۴۳۳ را استفاده می‌کند. تغییر متغیر گذرواژه در فایل محیطی، گذرواژه volume از قبل ساخته‌شده را تغییر نمی‌دهد.

```powershell
docker compose --env-file .env.local up -d postgres
docker compose --env-file .env.local exec postgres pg_isready -U postgres -d hesaba
```

اگر نام کاربر یا پایگاه را در محیط تغییر داده‌اید، آرگومان‌های دستور بررسی را نیز متناسب با آن تغییر دهید. `pg_isready` پذیرش اتصال را بررسی می‌کند و صحت گذرواژه برنامه را تضمین نمی‌کند.

5. وابستگی‌ها و migrationهای موجود را اعمال و برنامه را اجرا کنید:

```powershell
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

برنامه معمولاً در `http://localhost:3000` باز می‌شود؛ اگر پورت دیگری استفاده شود، پیام ترمینال و `BETTER_AUTH_URL` را بررسی کنید. برای توقف PostgreSQL می‌توانید `docker compose --env-file .env.local down` را اجرا کنید؛ این دستور volume را حذف نمی‌کند.

برای دانلود PDF فاکتور، Chrome یا Edge باید روی سیستمی که Next.js روی آن اجرا می‌شود نصب باشد. برنامه مسیرهای معمول را بررسی می‌کند؛ اگر مرورگر در مسیر دیگری نصب شده است، مسیر مطلق آن را با `HESABA_PDF_BROWSER` در `.env.local` تنظیم و سرور را دوباره اجرا کنید. فایل با فونت‌های پروژه و مرورگر محلی ساخته می‌شود.

اگر پس از تغییر مدل Prisma خطایی مانند ناشناخته بودن مدل یا `Cannot read properties of undefined (reading 'findMany')` دیدید، سرور توسعه را با `Ctrl+C` متوقف کنید، `npx prisma generate` و در صورت وجود migration جدید `npx prisma migrate deploy` را اجرا کنید، سپس `npm run dev` را دوباره اجرا کنید.

## تست

```powershell
npm run lint
npm run build
node tests/trial-balance-isolated.mjs
```

آزمون آخر به PostgreSQL و کاربری با مجوز ساخت دیتابیس نیاز دارد؛ یک دیتابیس تصادفی موقت می‌سازد، migrationها را اعمال می‌کند و همان دیتابیس تست را در پایان حذف می‌کند. قبل از اجرای آن باید build موفق وجود داشته باشد. سایر اسکریپت‌های پوشه `tests` نیازها و محدوده متفاوتی دارند؛ پیش از اجرا محتوای آن‌ها را بررسی کنید.

## دادهٔ دمو

`scripts/seed-demo.mjs` دادهٔ مالی نمونه را در سازمانی که شناسه‌اش به آن داده می‌شود ثبت می‌کند و به سال مالی باز نیاز دارد. این دستور داده واقعی می‌نویسد؛ در صورت وجود اسناد نمونه یا کدهای رزروشده متوقف می‌شود. از اجرای دوباره بدون بررسی سازمان و داده‌های موجود خودداری کنید.

```powershell
node scripts/seed-demo.mjs <organization-id>
```

اسکریپت `scripts/seed-test-showcase.mjs` داده‌های تکمیلی اشخاص، کالا و اسناد را فقط برای سازمانی به نام `test` و سال مالی باز «سال مالی 1404» ایجاد می‌کند. این داده‌ها قبلاً در سازمان test این محیط ثبت شده‌اند؛ اجرای دوباره در صورت وجود داده یا کد رزروشده متوقف می‌شود. برچسب‌های نمایشی به درخواست کاربر از داده‌های ثبت‌شده حذف شده‌اند.

اسکریپت `scripts/seed-test-invoices.mjs` برای همان سازمان داده فاکتور، درآمد و هزینه و اتصال حساب اشخاص می‌سازد. ابتدا با `node scripts/seed-test-invoices.mjs <organization-id> --check` در تراکنش بازگشتی بررسی کنید؛ اجرای بدون `--check` داده واقعی در دیتابیس می‌نویسد. وجود حساب‌های مشخص‌شده، مشتریان، کالاها و سال مالی باز حاوی تاریخ‌های اسکریپت لازم است؛ در صورت تکرار کدهای رزروشده اسکریپت بدون تغییر متوقف می‌شود. اسناد و فاکتورهای نهایی مستقیم قابل حذف نیستند. داده‌های این اسکریپت پیش‌تر در سازمان test این محیط ثبت شده‌اند.

## متغیرهای محیطی

`POSTGRES_DB`، `POSTGRES_USER` و `POSTGRES_PASSWORD` برای سرویس نمونه Docker هستند؛ `DATABASE_URL` اتصال برنامه و Prisma را مشخص می‌کند. `BETTER_AUTH_SECRET` و `BETTER_AUTH_URL` برای احراز هویت‌اند. `HESABA_PDF_BROWSER` مسیر اختیاری Chrome یا Edge برای ساخت PDF است. `OLLAMA_BASE_URL` و `OLLAMA_MODEL` برای فاز آینده در نظر گرفته شده‌اند؛ اتصال AI هنوز ساخته نشده است. مقادیر نمونه در `.env.example` هستند؛ `.env.local` نباید وارد Git شود.
