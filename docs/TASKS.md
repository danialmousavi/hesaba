# وضعیت تسک‌های پروژه

این سند تاریخچهٔ تسک‌های انجام‌شده و فهرست کارهای آینده را نگه می‌دارد. توضیح و نتیجهٔ هر تسک انجام‌شده وضعیت زمان پایان همان تسک است و ممکن است با تسک‌های بعدی تغییر کرده باشد؛ برای وضعیت فعلی به [نقشه راه](./ROADMAP.md) و [معماری](./ARCHITECTURE.md) و برای گروه‌بندی مراحل به [برنامه اجرا](./EXECUTION_PLAN.md) مراجعه کنید. تمام ردیف‌های جدول کارهای آینده هنوز انجام نشده‌اند.

## TASK-001

- **Title:** بررسی ساختار فعلی پروژه و مستندات نسخهٔ نصب‌شدهٔ Next.js
- **Description:** بررسی قالب اولیه، اسکریپت‌ها، وابستگی‌ها، پیکربندی و راهنمای محلی Next.js پیش از هر تغییر معماری یا کدنویسی.
- **Files:** `package.json`، `next.config.ts`، `app/`، `node_modules/next/dist/docs/`
- **Dependencies:** ندارد
- **Acceptance Criteria:** وضعیت اولیه و محدودیت‌های فنی شناسایی شوند؛ بررسی lint موفق باشد؛ تسک بعدی مشخص باشد.
- **Testing:** اجرای `npm run lint`
- **Status:** DONE

### نتیجه

- پروژه یک قالب اولیهٔ Next.js 16.4.6 با React 19.3.0، TypeScript، Tailwind CSS 4 و App Router است.
- هیچ دیتابیس، ORM، احراز هویت، تست، فایل محیط نمونه یا مستندات پروژه‌ای وجود ندارد.
- پیکربندی `cacheComponents` و `partialPrefetching` فعال است؛ کدهای بعدی باید با مدل Cache Components در Next.js 16 سازگار باشند و از Node runtime استفاده کنند.
- `npm run lint` بدون خطا اجرا شد.

## TASK-002

- **Title:** ایجاد اسکلت مستندات پروژه
- **Description:** ایجاد فایل‌های مختصر و اولیهٔ PRD، معماری، مدل داده، طراحی AI، نقشهٔ راه و تغییرات برای نگهداری تصمیم‌ها و وضعیت پروژه.
- **Files:** `docs/PRD.md`، `docs/ARCHITECTURE.md`، `docs/DATABASE.md`، `docs/AI_DESIGN.md`، `docs/ROADMAP.md`، `docs/CHANGELOG.md`
- **Dependencies:** TASK-001
- **Acceptance Criteria:** همهٔ فایل‌های مستندات موردنیاز ایجاد شوند، با MVP و نقشه‌راه مصوب هم‌راستا باشند و TASKS وضعیت به‌روز داشته باشد.
- **Testing:** بازبینی ساختار و پیوندهای داخلی مستندات.
- **Status:** DONE

### نتیجه

- ساختار مستندات پروژه ایجاد و با محدودهٔ MVP مصوب هم‌راستا شد.
- تصمیم‌های اولیهٔ معماری، مدل داده و ایمنی AI ثبت شدند.

## TASK-003

- **Title:** تنظیم استانداردهای محیط و فایل پیکربندی نمونه
- **Description:** تعریف متغیرهای محیطی موردنیاز برای برنامه، دیتابیس، احراز هویت و Ollama در یک فایل نمونه، بدون ثبت رازها در Git.
- **Files:** `.env.example`، `.gitignore`، `README.md`
- **Dependencies:** TASK-002
- **Acceptance Criteria:** تمام متغیرهای موردنیاز مستند شده باشند؛ هیچ مقدار حساس در repository قرار نگیرد؛ راهنمای اجرای اولیه به‌روز باشد.
- **Testing:** بازبینی `.gitignore` و اعتبارسنجی نبودن فایل محیط واقعی در وضعیت Git.
- **Status:** DONE

### نتیجه

- قرارداد متغیرهای محیطی PostgreSQL، احراز هویت و Ollama در `.env.example` ثبت شد.
- فایل نمونه به‌طور صریح از قانون نادیده‌گیری محیط مستثنا شد و فایل‌های محیط واقعی همچنان وارد Git نمی‌شوند.
- راهنمای اجرای محلی و بررسی کیفیت به‌روز شد.

## TASK-004

- **Title:** پیکربندی PostgreSQL توسعه‌ای
- **Description:** افزودن پیکربندی Docker Compose برای PostgreSQL و مستندسازی اجرای پایدار محیط توسعه.
- **Files:** `docker-compose.yml`، `README.md`، `.env.example`
- **Dependencies:** TASK-003
- **Acceptance Criteria:** PostgreSQL با یک دستور مستند اجرا شود؛ داده‌ها در volume پایدار بمانند؛ اتصال نمونه با `DATABASE_URL` سازگار باشد.
- **Testing:** اجرای سرویس، بررسی سلامت کانتینر و آزمایش اتصال به پایگاه داده.
- **Status:** DONE

### نتیجه

- سرویس PostgreSQL 16 با volume پایدار و healthcheck در Docker Compose تعریف شد.
- پیکربندی Compose و تطابق متغیرهای راه‌اندازی با `DATABASE_URL` بررسی شدند.
- PostgreSQL توسط کاربر اجرا و با `pg_isready` در وضعیت پذیرش اتصال تأیید شد.

## TASK-005

- **Title:** نصب و پیکربندی Prisma
- **Description:** افزودن Prisma، تعریف تنظیمات اتصال PostgreSQL و آماده‌سازی پایهٔ migration بدون طراحی مدل‌های دامنه.
- **Files:** `package.json`، `package-lock.json`، `prisma/schema.prisma`، `prisma.config.ts`، `.env.example`
- **Dependencies:** TASK-004
- **Acceptance Criteria:** Prisma به PostgreSQL محلی متصل شود؛ دستورهای generate و migration برای اجرای آینده قابل استفاده باشند؛ هیچ مدل کسب‌وکاری پیش از تأیید طراحی نشود.
- **Testing:** اجرای Prisma generate و اعتبارسنجی schema با اتصال محلی.
- **Status:** DONE

### نتیجه

- Prisma Client، Prisma CLI و dotenv با نسخهٔ پایدار 7.10.1 پیکربندی شدند.
- تنظیمات ESM و TypeScript مطابق نیاز Prisma 7 به‌روز شدند.
- تولید Client، اعتبارسنجی schema و lint موفق هستند.
- Prisma CLI در کانتینر ابزار روی شبکهٔ Docker به PostgreSQL متصل شد. خطای P4001 فقط نشان می‌دهد دیتابیس هنوز جدول ندارد که پیش از طراحی مدل‌ها مورد انتظار است.

## TASK-006

- **Title:** طراحی و پیاده‌سازی مدل‌های پایهٔ سازمان و کاربر
- **Description:** تعریف مدل‌های Organization، User، Membership و نقش‌های اولیه برای جداسازی داده و آماده‌سازی احراز هویت.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/`، `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-005
- **Acceptance Criteria:** مدل‌ها دارای شناسه، زمان ایجاد/به‌روزرسانی و ارتباط‌های صحیح باشند؛ نقش‌های Admin، Accountant و Viewer پشتیبانی شوند؛ migration در PostgreSQL اعمال شود.
- **Testing:** اجرای migration و بررسی وضعیت آن از کانتینر Prisma.
- **Status:** DONE

### نتیجه

- مدل‌های `User`، `Organization` و `Membership` با نقش‌های Admin، Accountant و Viewer ایجاد شدند.
- یکتایی عضویت کاربر در سازمان، ارتباط‌ها و حذف آبشاری در schema اعمال شدند.
- migration پایدار `20261121110000_add_organizations_and_users` ایجاد و در PostgreSQL اعمال شد.

## TASK-007

- **Title:** افزودن مدل‌های اصلی Better Auth
- **Description:** افزودن مدل‌های Session، Account و Verification با رابطه‌های لازم به User، پیش از پیکربندی سرویس احراز هویت.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/`، `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-006
- **Acceptance Criteria:** مدل‌ها با قرارداد Better Auth سازگار باشند؛ Session و Account به User متصل شوند؛ migration در PostgreSQL اعمال شود.
- **Testing:** اجرای migration، Prisma generate و اعتبارسنجی schema.
- **Status:** DONE

### نتیجه

- مدل‌های `Session`، `Account` و `Verification` مطابق قرارداد اصلی Better Auth اضافه شدند.
- یکتایی ترکیب `providerId` و `accountId` و روابط حذف آبشاری با User اعمال شدند.
- migration پایدار `20261121110246_add_better_auth_core_models` ایجاد و در PostgreSQL اعمال شد.

## TASK-008

- **Title:** نصب وابستگی‌های اجرای Better Auth و Prisma PostgreSQL
- **Description:** افزودن Better Auth، Prisma adapter آن، driver adapter PostgreSQL و driver `pg` با نسخه‌های سازگار؛ بدون ایجاد endpoint یا منطق ورود.
- **Files:** `package.json`، `package-lock.json`، `docs/TASKS.md`
- **Dependencies:** TASK-007
- **Acceptance Criteria:** وابستگی‌ها بدون آسیب به dependencyهای موجود نصب شوند و نسخه‌های Prisma با adapter سازگار باشند.
- **Testing:** بررسی درخت وابستگی npm و اجرای TypeScript/lint.
- **Status:** DONE

### نتیجه

- `better-auth` و Prisma adapter رسمی آن نصب شدند.
- `@prisma/adapter-pg` با Prisma 7.10.1 و driver `pg` نصب شدند.
- بررسی npm audit برای وابستگی‌های تولید هیچ آسیب‌پذیری گزارش نکرد.

## TASK-009

- **Title:** ایجاد Prisma Client مشترک
- **Description:** ایجاد یک نمونهٔ Prisma Client با PostgreSQL driver adapter و چرخهٔ حیات مناسب محیط توسعهٔ Next.js.
- **Files:** `lib/prisma.ts`، `docs/ARCHITECTURE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-008
- **Acceptance Criteria:** یک نمونهٔ قابل استفاده سمت سرور وجود داشته باشد؛ اتصال از `DATABASE_URL` خوانده شود؛ نمونه‌های تکراری در hot reload ایجاد نشوند.
- **Testing:** TypeScript type check و import سمت سرور.
- **Status:** DONE

### نتیجه

- Prisma Client مشترک با PostgreSQL driver adapter در `lib/prisma.ts` ایجاد شد.
- اتصال فقط از `DATABASE_URL` خوانده می‌شود و نمونه در محیط توسعه روی `globalThis` نگهداری می‌شود.
- محافظ `server-only` از واردشدن ماژول به Client Component جلوگیری می‌کند.

## TASK-010

- **Title:** پیکربندی سرویس Better Auth
- **Description:** ایجاد نمونهٔ Better Auth با Prisma adapter، احراز هویت ایمیل/رمز عبور و تنظیمات سازگار با مدل‌های فعلی؛ بدون ایجاد صفحه یا Route Handler.
- **Files:** `lib/auth.ts`، `docs/ARCHITECTURE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-009
- **Acceptance Criteria:** پیکربندی از Prisma Client مشترک استفاده کند؛ مدل‌های اصلی Better Auth شناسایی شوند؛ پیکربندی TypeScript معتبر باشد.
- **Testing:** TypeScript type check و بررسی import سمت سرور.
- **Status:** DONE

### نتیجه

- سرویس Better Auth با Prisma adapter و PostgreSQL پیکربندی شد.
- ورود ایمیل/رمز عبور فعال و تولید شناسه به Prisma واگذار شد تا با شناسه‌های schema سازگار باشد.
- پیکربندی و Prisma Client هر دو فقط سمت سرور قابل import هستند.

## TASK-011

- **Title:** ایجاد Route Handler احراز هویت
- **Description:** اتصال handlerهای Better Auth به مسیر App Router برای دریافت درخواست‌های ثبت‌نام، ورود، خروج و session.
- **Files:** `app/api/auth/[...all]/route.ts`، `docs/TASKS.md`
- **Dependencies:** TASK-010
- **Acceptance Criteria:** Route Handler همهٔ متدهای موردنیاز Better Auth را به auth handler متصل کند و در مسیر مناسب App Router قرار داشته باشد.
- **Testing:** TypeScript type check و درخواست سلامت/پاسخ handler محلی.
- **Status:** DONE

### نتیجه

- Route Handler catch-all در `app/api/auth/[...all]/route.ts` ایجاد شد.
- درخواست GET و POST به handler رسمی Better Auth متصل شدند.
- مسیر `get-session` در حالت بدون ورود پاسخ 200 و `null` برگرداند.

## TASK-012

- **Title:** ایجاد Better Auth Client
- **Description:** ایجاد client-side SDK برای فراخوانی ثبت‌نام، ورود، خروج و مشاهدهٔ session از رابط کاربر.
- **Files:** `lib/auth-client.ts`، `docs/TASKS.md`
- **Dependencies:** TASK-011
- **Acceptance Criteria:** client فقط در ماژول‌های Client Component قابل استفاده باشد و به مسیر پیش‌فرض `/api/auth` متصل شود.
- **Testing:** TypeScript type check و بررسی import در یک Client Component آزمایشی بدون تغییر رابط اصلی.
- **Status:** DONE

### نتیجه

- SDK سمت‌کلاینت Better Auth در `lib/auth-client.ts` ایجاد شد.
- با directive `"use client"` فقط برای Client Componentها بسته‌بندی می‌شود.
- بدون پیکربندی مسیر اختصاصی، از مسیر پیش‌فرض `/api/auth` در مبدأ فعلی استفاده می‌کند.

## TASK-013

- **Title:** ایجاد صفحه و فرم ثبت‌نام
- **Description:** ایجاد یک صفحهٔ عمومی فارسی و راست‌به‌چپ برای ثبت‌نام با ایمیل و رمز عبور، با استفاده از Better Auth Client.
- **Files:** `app/(auth)/sign-up/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-012
- **Acceptance Criteria:** کاربر بتواند نام، ایمیل و رمز عبور را وارد کند؛ درخواست از طریق `authClient.signUp.email` ارسال شود؛ خطا و وضعیت ارسال برای کاربر نمایش داده شود.
- **Testing:** TypeScript type check، lint و بررسی دستی صفحه در توسعه.
- **Status:** DONE

### نتیجه

- صفحهٔ عمومی و راست‌به‌چپ ثبت‌نام در مسیر `/sign-up` ایجاد شد.
- فرم با `authClient.signUp.email` به Better Auth متصل است و نام، ایمیل و رمز عبور را ارسال می‌کند.
- اعتبارسنجی پایه، حالت در حال ارسال و پیام قابل‌دسترس موفقیت یا خطا افزوده شد.
- پیام خطای دقیق Better Auth از payload پاسخ استخراج و نمایش داده می‌شود.

## TASK-014

- **Title:** ایجاد صفحه و فرم ورود
- **Description:** ایجاد صفحهٔ عمومی فارسی برای ورود با ایمیل و رمز عبور و اتصال آن به Better Auth Client.
- **Files:** `app/(auth)/sign-in/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-013
- **Acceptance Criteria:** کاربر بتواند با ایمیل و رمز عبور وارد شود؛ درخواست از طریق `authClient.signIn.email` ارسال شود؛ خطا و وضعیت ارسال به کاربر نشان داده شود.
- **Testing:** TypeScript type check، lint و بررسی دستی صفحه در توسعه.
- **Status:** DONE

### نتیجه

- صفحهٔ عمومی و راست‌به‌چپ ورود در مسیر `/sign-in` ایجاد شد.
- فرم با `authClient.signIn.email` به Better Auth متصل است و ایمیل و رمز عبور را ارسال می‌کند.
- حالت ارسال، پیام خطا یا موفقیت و مسیرهای رفت‌وبرگشت ورود/ثبت‌نام افزوده شدند.

## TASK-017

- **Title:** محافظت از مسیر برنامه پس از ورود
- **Description:** ایجاد مسیر اولیهٔ برنامه و کنترل session تا فقط کاربر واردشده به آن دسترسی داشته باشد.
- **Files:** `app/(app)/dashboard/page.tsx`، `app/(auth)/sign-in/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-014
- **Acceptance Criteria:** کاربر ناشناس به صفحهٔ ورود هدایت شود و کاربر واردشده صفحهٔ اولیهٔ برنامه را ببیند.
- **Testing:** بررسی دستی دو وضعیت session و TypeScript type check.
- **Status:** DONE

### نتیجه

- مسیر محافظت‌شدهٔ `/dashboard` ایجاد شد و session را در سرور با Better Auth بررسی می‌کند.
- کاربر ناشناس به `/sign-in` هدایت می‌شود و کاربر واردشده پیام خوش‌آمد و نام خود را می‌بیند.
- پس از ورود موفق، فرم ورود کاربر را به `/dashboard` منتقل می‌کند.

## TASK-018

- **Title:** افزودن خروج امن از حساب
- **Description:** افزودن کنترل خروج در داشبورد با Better Auth Client و بازگرداندن کاربر به صفحهٔ ورود.
- **Files:** `app/(app)/dashboard/page.tsx`، `app/(app)/dashboard/sign-out-button.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-017
- **Acceptance Criteria:** کاربر واردشده بتواند session را پایان دهد و پس از خروج به `/sign-in` منتقل شود.
- **Testing:** TypeScript type check، lint و بررسی دستی session پس از خروج.
- **Status:** DONE

### نتیجه

- دکمهٔ خروج سمت‌کلاینت به داشبورد افزوده شد.
- خروج از طریق `authClient.signOut` انجام می‌شود و کاربر سپس به `/sign-in` منتقل می‌شود.

## TASK-019

- **Title:** ایجاد سازمان اولیه پس از ثبت‌نام
- **Description:** تعریف جریان ایجاد نخستین سازمان کاربر و عضویت او با نقش مدیر، پس از تکمیل ثبت‌نام.
- **Files:** `app/(app)/onboarding/page.tsx`، `app/(app)/onboarding/organization-form.tsx`، `app/(app)/onboarding/actions.ts`، `app/(app)/dashboard/page.tsx`، `package.json`، `docs/TASKS.md`
- **Dependencies:** TASK-018
- **Acceptance Criteria:** هر کاربر بتواند سازمان نخست خود را با نام و شناسهٔ یکتا ایجاد کند و به‌عنوان Admin عضو آن شود.
- **Testing:** migration در PostgreSQL، TypeScript type check و بررسی دستی جریان.
- **Status:** DONE

### نتیجه

- onboarding محافظت‌شده در مسیر `/onboarding` ایجاد شد.
- نام و شناسهٔ سازمان با Zod در سرور اعتبارسنجی می‌شوند.
- سازمان و عضویت Admin در یک تراکنش Prisma ساخته می‌شوند و شناسهٔ تکراری توسط constraint پایگاه‌داده محافظت می‌شود.
- کاربرِ بدون سازمان از داشبورد به onboarding هدایت می‌شود و پس از ایجاد سازمان به داشبورد بازمی‌گردد.

## TASK-020

- **Title:** نمایش سازمان فعال در داشبورد
- **Description:** واکشی سازمان نخست کاربر واردشده و نمایش نام آن در داشبورد برای تأیید فضای کاری فعال.
- **Files:** `app/(app)/dashboard/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-019
- **Acceptance Criteria:** داشبورد نام سازمانی که کاربر عضو آن است را نمایش دهد و عضویت را از سرور بخواند.
- **Testing:** TypeScript type check، lint و بررسی دستی کاربر عضو سازمان.
- **Status:** DONE

### نتیجه

- داشبورد عضویت کاربر را از سمت سرور همراه با سازمان مرتبط واکشی می‌کند.
- نام، شناسه، تاریخ ایجاد سازمان و نقش کاربر به فارسی در کارت «فضای کاری فعال» نمایش داده می‌شوند.
- انتخاب سازمان فعلی قطعی است و بر اساس نخستین عضویت ایجادشده انجام می‌شود.

## TASK-021

- **Title:** مدل و قیود بک‌اند سال مالی
- **Description:** ایجاد مدل سازمان‌محور سال مالی با وضعیت باز/بسته و قیود داده‌ای لازم، بدون رابط کاربری.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/`، `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-020
- **Acceptance Criteria:** سال مالی به سازمان متصل باشد؛ تاریخ پایان پس از شروع باشد؛ هر سازمان حداکثر یک سال مالی باز داشته باشد؛ migration با موفقیت اعمال شود.
- **Testing:** Prisma generate، migration status و اعتبارسنجی schema.
- **Status:** DONE

### نتیجه

- مدل `FiscalYear` با اتصال اجباری به سازمان، تاریخ شروع/پایان و وضعیت `OPEN` یا `CLOSED` اضافه شد.
- migration `20261121133623_add_fiscal_years` اعمال شد و قید بازهٔ تاریخ و index جزئیِ «فقط یک سال مالی باز برای هر سازمان» را در PostgreSQL ایجاد کرد.
- Prisma Client دوباره تولید شد و schema و migration با پایگاه‌دادهٔ محلی همگام هستند.

## TASK-022

- **Title:** پوستهٔ داشبورد و جابه‌جایی بین صفحات موجود
- **Description:** ایجاد هدر و سایدبار راست واکنش‌گرا و صفحهٔ اطلاعات سازمان.
- **Files:** `app/(app)/dashboard/layout.tsx`، `app/(app)/dashboard/page.tsx`، `app/(app)/dashboard/organization/page.tsx`
- **Dependencies:** TASK-020
- **Acceptance Criteria:** دسترسی به نمای کلی و اطلاعات سازمان از منو؛ حفظ کنترل دسترسی و سازگاری با موبایل.
- **Testing:** lint و production build.
- **Status:** DONE

## TASK-023

- **Title:** API خواندن و ایجاد سال مالی
- **Description:** خواندن سال‌های سازمان فعال و ایجاد سال مالی توسط مدیر با اعتبارسنجی سمت سرور.
- **Files:** `app/api/fiscal-years/route.ts`
- **Dependencies:** TASK-021
- **Acceptance Criteria:** کنترل session و نقش، محدودسازی به سازمان فعال، اعتبارسنجی تاریخ و مدیریت تعارض.
- **Testing:** lint، build، آزمون تراکنشی قیود دیتابیس و آزمون API با نشست واقعی مدیر و مشاهده‌گر، ورودی نامعتبر و درخواست بدون نشست یا با مبدأ نامعتبر موفق بودند.
- **Status:** DONE

## TASK-024

- **Title:** رابط سال مالی
- **Description:** نمایش سال‌های مالی سازمان و فرم ایجاد برای مدیر از طریق سایدبار داشبورد.
- **Files:** `app/(app)/dashboard/fiscal-years/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-023
- **Acceptance Criteria:** فهرست، وضعیت خالی، فرم و پیام خطا نمایش داده شوند و نقش مدیر رعایت شود.
- **Testing:** lint و production build موفق؛ بررسی بصری در مرورگر هنوز انجام نشده است.
- **Status:** DONE

## TASK-025

- **Title:** بک‌اند بستن سال مالی
- **Description:** بستن اتمی سال باز توسط مدیر سازمان فعال و پاسخ روشن به درخواست تکراری.
- **Files:** `app/api/fiscal-years/[id]/close/route.ts`، `tests/fiscal-years-api.mjs`
- **Dependencies:** TASK-023
- **Acceptance Criteria:** کنترل نشست، نقش و سازمان؛ رد درخواست تکراری و مبدأ نامعتبر.
- **Testing:** آزمون عملی API برای مدیر، مشاهده‌گر، سازمان دیگر، درخواست تکراری و ایجاد سال جدید پس از بستن موفق بود.
- **Status:** DONE
- **Notes:** کنترل اسناد ناتمام و ثبت در گزارش حسابرسی هنوز پیاده‌سازی نشده و پیش از استفادهٔ حسابداری واقعی ضروری است.

## TASK-026

- **Title:** رابط بستن سال مالی
- **Description:** افزودن دکمه و تأیید صریح بستن سال باز برای مدیر همراه با نمایش محدودیت‌های فعلی.
- **Files:** `app/(app)/dashboard/fiscal-years/page.tsx`، `app/(app)/dashboard/fiscal-years/close-year-button.tsx`
- **Dependencies:** TASK-025
- **Acceptance Criteria:** دکمه فقط برای مدیر و سال باز نمایش یابد؛ خطا و تأیید مشخص باشند؛ پس از موفقیت اطلاعات تازه شوند.
- **Testing:** lint و production build موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-027

- **Title:** جلوگیری از هم‌پوشانی سال‌های مالی و تقویم شمسی
- **Description:** قید پایگاه‌داده برای بازه‌های سازمان و انتخاب تاریخ شمسی در فرم.
- **Files:** `prisma/migrations/20261121150000_fiscal_year_no_overlap/`، `app/api/fiscal-years/route.ts`، `app/(app)/dashboard/fiscal-years/year-form.tsx`، `tests/`، `package.json`
- **Dependencies:** TASK-026
- **Acceptance Criteria:** جلوگیری از هم‌پوشانی حتی در درخواست هم‌زمان و انتخاب تاریخ شمسی با تبدیل صحیح برای API.
- **Testing:** migration، تست API و قیود دیتابیس، lint، build و تبدیل نمونه‌های تاریخ شمسی؛ بررسی مرورگر هنوز انجام نشده است.
- **Status:** DONE

## TASK-028

- **Title:** ثبت رویدادهای ایجاد و بستن سال مالی
- **Description:** ثبت شناسه و نام کاربر، زمان و جزئیات عملیات در همان تراکنش تغییر سال مالی.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121160000_fiscal_year_events/`، `app/api/fiscal-years/`، `tests/fiscal-years-api.mjs`
- **Dependencies:** TASK-027
- **Acceptance Criteria:** ثبت اتمی و سازمان‌محور رویدادها و عدم ثبت رویداد تکراری هنگام بستن مجدد.
- **Testing:** migration، تولید کلاینت، آزمون یکپارچه، lint و build.
- **Status:** DONE
- **Notes:** تست یکپارچهٔ ایجاد، بستن، نقش‌ها و عدم ثبت رویداد تکراری موفق بود. رویدادهای پیش از این قابلیت قابل بازسازی نیستند؛ این جدول با حذف سازمان حذف می‌شود و هنوز حفاظت append-only در سطح دیتابیس ندارد.

## TASK-029

- **Title:** مدل و قیود بک‌اند کدینگ حساب‌ها
- **Description:** ایجاد حساب‌های دفتر کل سازمان‌محور با ساختار درختی و پنج نوع اصلی حساب، بدون رابط کاربری.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121180917_add_ledger_accounts/`، `tests/ledger-accounts-db.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-021
- **Acceptance Criteria:** کد حساب در سازمان یکتا باشد؛ ساختار پدر/فرزند از حذف والد محافظت کند؛ حساب نتواند والد خودش باشد.
- **Testing:** migration status، آزمون تراکنشی قیود دیتابیس، lint و production build موفق بودند.
- **Status:** DONE

## TASK-030

- **Title:** API خواندن و ایجاد کدینگ حساب‌ها
- **Description:** دریافت فهرست حساب‌های سازمان فعال و ایجاد حساب توسط مدیر با اعتبارسنجی ساختار درختی.
- **Files:** `app/api/ledger-accounts/route.ts`، `lib/prisma.ts`، `tests/ledger-accounts-api.mjs`
- **Dependencies:** TASK-029
- **Acceptance Criteria:** کنترل نشست و نقش، کد یکتا، اعتبار حساب والد و جلوگیری از اتصال به حساب سازمان دیگر.
- **Testing:** آزمون API با نشست واقعی مدیر و مشاهده‌گر، حساب تکراری، کد نامعتبر و والد خارجی موفق بود.
- **Status:** DONE

## TASK-031

- **Title:** رابط درخت حساب‌ها
- **Description:** نمایش حساب‌های سازمان و فرم ایجاد حساب و زیرحساب برای مدیر.
- **Files:** `app/(app)/dashboard/accounts/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-030
- **Acceptance Criteria:** نمایش درخت و وضعیت خالی، انتخاب والد هم‌نوع، و نمایش خطای ثبت.
- **Testing:** lint و build موفق؛ بررسی بصری مرورگر انجام نشده است.
- **Status:** DONE

## TASK-032

- **Title:** بک‌اند ویرایش و تغییر وضعیت حساب‌ها
- **Description:** ویرایش نام و کد و فعال یا غیرفعال کردن حساب توسط مدیر سازمان.
- **Files:** `app/api/ledger-accounts/`، `tests/ledger-accounts-api.mjs`
- **Dependencies:** TASK-030
- **Acceptance Criteria:** کنترل نقش و سازمان، جلوگیری از کد تکراری و حفظ وضعیت سازگار والد و فرزند.
- **Testing:** آزمون یکپارچهٔ API، lint و build موفق بودند.
- **Status:** DONE
- **Notes:** تغییر والد و نوع و همچنین حسابرسی تغییرات در این مرحله پیاده‌سازی نشده‌اند؛ محدودیت‌های سند حسابداری پس از ایجاد آن باید افزوده شوند.

## TASK-033

- **Title:** رابط ویرایش و تغییر وضعیت حساب
- **Description:** افزودن کنترل‌های ویرایش نام و کد و فعال/غیرفعال‌کردن حساب در درخت حساب‌ها برای مدیر.
- **Files:** `app/(app)/dashboard/accounts/page.tsx`، `app/(app)/dashboard/accounts/account-controls.tsx`
- **Dependencies:** TASK-032
- **Acceptance Criteria:** نمایش کنترل‌ها فقط به مدیر، تأیید تغییر وضعیت، نمایش خطا و تازه‌سازی فهرست پس از موفقیت.
- **Testing:** lint، build و آزمون API موفق بودند؛ بررسی تعامل در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-034

- **Title:** مدل پایهٔ سند و ردیف حسابداری
- **Description:** مدل سازمان‌محور سند و ردیف با مبلغ دقیق، شمارهٔ یکتا و اتصال هم‌سازمان به حساب و سال مالی.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121190000_add_journal_entries/`، `tests/journal-db.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-030
- **Acceptance Criteria:** migration اعمال شود و قیود مبلغ و جداسازی سازمان در دیتابیس آزموده شوند.
- **Testing:** migration، تولید Prisma Client، تست تراکنشی دیتابیس و lint.
- **Status:** DONE
- **Notes:** API ثبت و کنترل تراز، منع تغییر سند نهایی و کنترل سال بسته هنوز ساخته نشده‌اند.

## TASK-035

- **Title:** API ایجاد و فهرست پیش‌نویس اسناد
- **Description:** ایجاد سند پیش‌نویس سازمان‌محور توسط مدیر یا حسابدار، با اعتبارسنجی مبلغ و سال مالی باز.
- **Files:** `app/api/journal-entries/route.ts`، `lib/prisma.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-034
- **Acceptance Criteria:** کنترل نقش، سال باز، تاریخ، حساب‌های فعال سازمان، شمارهٔ یکتا و مبلغ دقیق؛ ثبت سند و ردیف‌ها اتمی باشد.
- **Testing:** آزمون API، lint و build.
- **Status:** DONE
- **Notes:** پیش‌نویس می‌تواند نامتوازن باشد؛ نهایی‌سازی و کنترل تراز هنوز پیاده نشده است.

## TASK-036

- **Title:** رابط پیش‌نویس اسناد حسابداری
- **Description:** نمایش اسناد سازمان و فرم پیش‌نویس با تاریخ شمسی و ردیف‌های بدهکار/بستانکار.
- **Files:** `app/(app)/dashboard/journal/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-035
- **Acceptance Criteria:** نمایش وضعیت و جزئیات سند، ایجاد پیش‌نویس توسط نقش مجاز، محاسبهٔ دقیق جمع‌ها و نمایش خطا.
- **Testing:** lint، build و آزمون API موفق؛ بررسی تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-037

- **Title:** بک‌اند ثبت نهایی سند حسابداری
- **Description:** نهایی‌سازی اتمی سند متوازن در سال مالی باز با حساب‌های فعال و ثبت رویداد.
- **Files:** `app/api/journal-entries/[id]/post/route.ts`، `prisma/schema.prisma`، `prisma/migrations/20261121200000_journal_events/`، `tests/journal-api.mjs`
- **Dependencies:** TASK-035
- **Acceptance Criteria:** حداقل دو ردیف، جمع برابر و مثبت، نقش مجاز، سال باز، حساب‌های فعال، جلوگیری از ثبت تکراری و ثبت رویداد.
- **Testing:** آزمون یکپارچهٔ API، lint و build موفق.
- **Status:** DONE
- **Notes:** محافظت تغییرناپذیری در سطح دیتابیس، کنترل اسناد ناتمام در بستن سال و امکان اصلاح/برگشت سند هنوز پیاده نشده‌اند.

## TASK-038

- **Title:** رابط ثبت نهایی سند
- **Description:** افزودن کنترل ثبت نهایی پیش‌نویس با تأیید صریح و نمایش خطای سرور.
- **Files:** `app/(app)/dashboard/journal/page.tsx`، `app/(app)/dashboard/journal/post-journal-button.tsx`
- **Dependencies:** TASK-037
- **Acceptance Criteria:** نمایش کنترل فقط به مدیر یا حسابدار برای پیش‌نویس؛ تأیید، خطا و تازه‌سازی وضعیت.
- **Testing:** lint، build و آزمون API موفق؛ تعامل بصری مرورگر بررسی نشده است.
- **Status:** DONE

## TASK-039

- **Title:** محافظت سند ثبت‌شده در پایگاه داده
- **Description:** جلوگیری از ویرایش و حذف سند نهایی و تغییر ردیف‌های آن در PostgreSQL.
- **Files:** `prisma/migrations/20261121210000_lock_posted_journals/`، `tests/journal-db.mjs`، `tests/journal-api.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-037
- **Acceptance Criteria:** رد ویرایش/حذف سند نهایی و افزودن/ویرایش/حذف ردیف‌های آن؛ محافظت از داده‌های تست با rollback.
- **Testing:** تست تراکنشی دیتابیس، آزمون API پیش‌نویس و lint موفق.
- **Status:** DONE
- **Notes:** آزمون موفق نهایی‌سازی API برای پاکسازی ایمن اکنون به دیتابیس موقت مجزا نیاز دارد. ثبت مستقیم وضعیت در دیتابیس و دسترسی مدیریتی از محدودهٔ این محافظت خارج‌اند.

## TASK-040

- **Title:** جلوگیری از بستن سال دارای پیش‌نویس
- **Description:** بررسی پیش‌نویس‌های سازمان در تراکنش بستن سال مالی با قفل مشترک با عملیات ثبت سند.
- **Files:** `app/api/fiscal-years/[id]/close/route.ts`، `tests/journal-api.mjs`، `app/(app)/dashboard/fiscal-years/close-year-button.tsx`
- **Dependencies:** TASK-035، TASK-039
- **Acceptance Criteria:** بستن سال دارای پیش‌نویس رد و سال بدون پیش‌نویس طبق مجوز بسته شود.
- **Testing:** آزمون‌های API سال مالی و سند، lint و build موفق؛ آزمون هم‌زمانی اجرا نشده است.
- **Status:** DONE
- **Notes:** پیش‌نویس نامتوازن تا افزودن امکان ویرایش یا حذف قابل تعیین تکلیف نیست؛ سایر کنترل‌های پایان سال هنوز تکمیل نشده‌اند.

## TASK-041

- **Title:** بک‌اند ویرایش پیش‌نویس سند
- **Description:** ویرایش اتمی شماره، تاریخ، شرح و ردیف‌های سند پیش‌نویس با کنترل سازمان و سال مالی.
- **Files:** `app/api/journal-entries/[id]/route.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-040
- **Acceptance Criteria:** فقط نقش مجاز در سال باز بتواند پیش‌نویس را با حساب‌های فعال ویرایش کند؛ سند نهایی قابل ویرایش نباشد.
- **Testing:** آزمون API، lint و build موفق؛ تست تغییر هم‌زمان و تست ویرایش سند نهایی در دیتابیس مجزای آزمایشی باقی است.
- **Status:** DONE
- **Notes:** رابط ویرایش هنوز ساخته نشده و تغییر سال مالی سند در این API مجاز نیست.

## TASK-042

- **Title:** رابط ویرایش پیش‌نویس سند
- **Description:** بارگذاری و اصلاح شماره، تاریخ شمسی، شرح و ردیف‌های سند پیش‌نویس.
- **Files:** `app/(app)/dashboard/journal/[id]/edit/page.tsx`، `app/(app)/dashboard/journal/journal-form.tsx`، `app/(app)/dashboard/journal/page.tsx`
- **Dependencies:** TASK-041
- **Acceptance Criteria:** نمایش فرم فقط برای کاربر مجاز و سند پیش‌نویس در سال باز، نمایش داده‌های قبلی و ارسال اصلاحات به API.
- **Testing:** lint، build و آزمون API موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-043

- **Title:** بک‌اند حذف پیش‌نویس سند
- **Description:** حذف اتمی پیش‌نویس و ردیف‌های آن در سال مالی باز توسط نقش مجاز.
- **Files:** `app/api/journal-entries/[id]/route.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-041
- **Acceptance Criteria:** کنترل نقش، سازمان و وضعیت؛ حفاظت از سند نهایی و سال بسته و حذف اتمی ردیف‌ها.
- **Testing:** آزمون API و قیود دیتابیس، lint و build موفق؛ تست هم‌زمانی اجرا نشده است.
- **Status:** DONE
- **Notes:** حذف پیش‌نویس دائمی است و شمارهٔ آن قابل استفادهٔ مجدد می‌شود؛ تاریخچهٔ حذف ثبت نمی‌شود. رابط کاربری هنوز اضافه نشده است.

## TASK-044

- **Title:** رابط حذف پیش‌نویس سند
- **Description:** نمایش دکمهٔ حذف پیش‌نویس در سال باز برای کاربر مجاز، با تأیید و هشدار حذف دائمی.
- **Files:** `app/(app)/dashboard/journal/page.tsx`، `app/(app)/dashboard/journal/delete-draft-button.tsx`
- **Dependencies:** TASK-043
- **Acceptance Criteria:** تأیید صریح، نمایش خطا، جلوگیری از ارسال تکراری و تازه‌سازی فهرست پس از حذف.
- **Testing:** lint، build و آزمون API موفق؛ تعامل مرورگر بررسی نشده است.
- **Status:** DONE

## TASK-045

- **Title:** بک‌اند گزارش تراز آزمایشی
- **Description:** محاسبهٔ گردش و ماندهٔ مستقیم حساب‌ها از اسناد نهایی یک سازمان و سال مالی.
- **Files:** `app/api/reports/trial-balance/route.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-037
- **Acceptance Criteria:** جداسازی سازمان، حذف پیش‌نویس‌ها از گزارش و محاسبهٔ دقیق ریالی.
- **Testing:** lint، build، کنترل دسترسی، کنارگذاشتن پیش‌نویس و محاسبه با دو سند نهایی و مبالغ بزرگ در دیتابیس مجزا موفق بودند.
- **Status:** DONE
- **Notes:** حساب‌های بدون گردش نمایش داده نمی‌شوند؛ گردش زیرحساب به والد تجمیع نمی‌شود. دیتابیس موقت آزمایشی پس از آزمون حذف شد.

## TASK-046

- **Title:** رابط گزارش تراز آزمایشی
- **Description:** انتخاب سال مالی و نمایش گردش و ماندهٔ حساب‌ها با واحد ریال.
- **Files:** `app/(app)/dashboard/reports/trial-balance/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-045
- **Acceptance Criteria:** انتخاب سال، نمایش جدول، جمع‌ها، وضعیت خالی و خطای دریافت؛ مبالغ دقیق نمایش داده شوند.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-047

- **Title:** بک‌اند گزارش دفتر کل حساب
- **Description:** نمایش گردش مستقیم حساب از اسناد نهایی یک سال مالی با ماندهٔ تجمعی دقیق.
- **Files:** `app/api/reports/general-ledger/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-045
- **Acceptance Criteria:** کنترل دسترسی سازمانی، حذف پیش‌نویس، ترتیب پایدار و محاسبهٔ دقیق ماندهٔ بدهکار/بستانکار.
- **Testing:** آزمون API با دیتابیس مجزا و مبالغ بزرگ، کنترل دسترسی، lint و build موفق بودند.
- **Status:** DONE
- **Notes:** گزارش یک حساب را در کل سال مالی پوشش می‌دهد؛ گردش زیرحساب‌ها تجمیع نمی‌شود و فیلتر بازهٔ تاریخ هنوز وجود ندارد.

## TASK-048

- **Title:** رابط گزارش دفتر کل
- **Description:** انتخاب سال و حساب و نمایش گردش مستقیم و ماندهٔ تجمعی به ریال.
- **Files:** `app/(app)/dashboard/reports/general-ledger/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-047
- **Acceptance Criteria:** فهرست حساب‌های فعال و غیرفعال، انتخاب سال، گردش و مانده، وضعیت خالی و خطا.
- **Testing:** lint و build موفق؛ تعامل مرورگر هنوز بررسی نشده است.
- **Status:** DONE

## TASK-049

- **Title:** بک‌اند گزارش سود و زیان
- **Description:** محاسبهٔ ماندهٔ مستقیم درآمد و هزینه از اسناد نهایی سازمان در سال مالی.
- **Files:** `app/api/reports/profit-loss/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-047
- **Acceptance Criteria:** تفکیک سازمان، محاسبهٔ دقیق درآمد، هزینه و نتیجه و کنارگذاشتن پیش‌نویس‌ها.
- **Testing:** آزمون یکپارچه در دیتابیس مجزا با سند نهایی، کنترل دسترسی، lint و build موفق.
- **Status:** DONE
- **Notes:** گزارش بر اساس گردش مستقیم حساب‌ها در کل سال است؛ بستن حساب‌های موقت، سند اختتامیه و فیلتر بازه هنوز پیاده نشده‌اند.

## TASK-050

- **Title:** رابط گزارش سود و زیان
- **Description:** نمایش خالص درآمد، هزینه، نتیجه و جزئیات حساب‌های سال مالی انتخاب‌شده.
- **Files:** `app/(app)/dashboard/reports/profit-loss/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-049
- **Acceptance Criteria:** انتخاب سال، نمایش سود یا زیان، جزئیات، وضعیت خالی و خطای دریافت.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل مرورگر هنوز انجام نشده است.
- **Status:** DONE

## TASK-051

- **Title:** بک‌اند خلاصه مالی داشبورد
- **Description:** ارائه درآمد، هزینه، سود یا زیان، تعداد اسناد و آخرین اسناد نهایی برای سال مالی انتخاب‌شده در سازمان کاربر.
- **Files:** `app/api/dashboard/summary/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-049
- **Acceptance Criteria:** کنترل دسترسی سازمان، محاسبه بر اساس اسناد نهایی و تفکیک تعداد پیش‌نویس‌ها.
- **Testing:** lint، build و آزمون یکپارچه در پایگاه داده مجزا موفق بودند؛ ارقام با گزارش سود و زیان تطبیق داده شدند.
- **Status:** DONE
- **Notes:** داده‌ها مربوط به کل سال مالی هستند؛ نمودار، فیلتر بازه و رابط داشبورد در این تسک پیاده‌سازی نشده‌اند.

## TASK-052

- **Title:** رابط خلاصه مالی داشبورد
- **Description:** نمایش خودکار عملکرد سال مالی، وضعیت اسناد و آخرین اسناد نهایی با امکان انتخاب سال.
- **Files:** `app/(app)/dashboard/page.tsx`، `app/(app)/dashboard/dashboard-summary.tsx`
- **Dependencies:** TASK-051
- **Acceptance Criteria:** نمایش واکنش‌گرا، مبالغ ریالی، تاریخ شمسی، وضعیت بارگذاری، خطا و اطلاعات خالی.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-053

- **Title:** بک‌اند عملکرد ماهانه درآمد و هزینه
- **Description:** تجمیع گردش اسناد نهایی سال مالی به تفکیک ماه شمسی برای نمودار داشبورد، با کنترل دسترسی سازمان.
- **Files:** `app/api/dashboard/monthly/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-051
- **Acceptance Criteria:** مبالغ دقیق، رعایت مرز سال شمسی، حذف پیش‌نویس‌ها و کنترل دسترسی.
- **Testing:** lint، build و آزمون یکپارچه در پایگاه داده مجزا موفق بودند.
- **Status:** DONE
- **Notes:** خروجی تنها ماه‌های دارای گردش حساب درآمد یا هزینه را شامل می‌شود؛ رابط نمودار در تسک بعدی ساخته می‌شود.

## TASK-054

- **Title:** نمایش نمودار درآمد و هزینه ماهانه
- **Description:** نمایش مقایسه ماهانه در داشبورد برای سال مالی انتخاب‌شده، همراه با مبلغ دقیق، حالت خطا و حالت خالی.
- **Files:** `app/(app)/dashboard/dashboard-summary.tsx`، `app/(app)/dashboard/monthly-chart.tsx`
- **Dependencies:** TASK-053
- **Acceptance Criteria:** ماه‌های شمسی دارای گردش، مقادیر مثبت و منفی، مبالغ ریالی دقیق و تغییر سال مالی نمایش داده شوند.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** نصب Recharts پاسخی نداد و متوقف شد؛ نمودار با امکانات موجود ساخته شد. ماه‌های بدون گردش در خروجی سرویس وجود ندارند.

## TASK-055

- **Title:** مدل داده مشتریان و تأمین‌کنندگان
- **Description:** ایجاد موجودیت شخص در هر سازمان با نقش مشتری، تأمین‌کننده یا هر دو و اطلاعات تماس اختیاری.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121220000_add_parties/`، `docs/DATABASE.md`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-006
- **Acceptance Criteria:** وابستگی به سازمان، نام غیرخالی و حداقل یک نقش در دیتابیس تضمین شود.
- **Testing:** اعتبارسنجی و تولید Prisma Client، lint و آزمون قیود در دیتابیس مجزا موفق؛ migration روی دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** API، رابط، ارتباط حساب‌ها و محاسبه مانده اشخاص به مراحل بعدی موکول شده‌اند.

## TASK-056

- **Title:** API ثبت و فهرست اشخاص
- **Description:** ایجاد شخص و دریافت فهرست صفحه‌بندی‌شده با جست‌وجو و فیلتر نقش و وضعیت در محدوده سازمان.
- **Files:** `app/api/parties/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-055
- **Acceptance Criteria:** مدیر و حسابدار امکان ثبت دارند، مشاهده‌گر فقط فهرست را می‌بیند، ورودی اعتبارسنجی و سازمان‌ها تفکیک می‌شوند.
- **Testing:** lint، build و آزمون یکپارچه نقش‌ها، اعتبارسنجی، فیلتر و تفکیک سازمان در دیتابیس مجزا موفق بودند.
- **Status:** DONE
- **Notes:** ویرایش و غیرفعال‌سازی اشخاص و رابط کاربری هنوز پیاده‌سازی نشده‌اند.

## TASK-057

- **Title:** رابط ثبت و فهرست اشخاص
- **Description:** صفحه راست‌چین ثبت مشتری و تأمین‌کننده، جست‌وجو، فیلتر و صفحه‌بندی با اتصال به API.
- **Files:** `app/(app)/dashboard/parties/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-056
- **Acceptance Criteria:** فرم سمت راست، نمایش متناسب با نقش، خطا و وضعیت خالی و دسترسی از منوی داشبورد.
- **Testing:** lint و build موفق بودند؛ بررسی بصری و تعاملی مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** ویرایش و غیرفعال‌سازی در این مرحله موجود نیست.

## TASK-058

- **Title:** API ویرایش و تغییر وضعیت اشخاص
- **Description:** ویرایش مشخصات و نقش‌ها و فعال یا غیرفعال‌کردن اشخاص سازمان با کنترل دسترسی.
- **Files:** `app/api/parties/[id]/route.ts`، `app/api/parties/route.ts`، `lib/party-validation.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-056
- **Acceptance Criteria:** نقش مشاهده‌گر مجوز ویرایش ندارد؛ حداقل یک نقش شخص باقی می‌ماند؛ اطلاعات سازمان دیگر تغییر نمی‌کند.
- **Testing:** lint، build و آزمون یکپارچه ویرایش، نقش‌ها، داده نامعتبر و تفکیک سازمان موفق بودند.
- **Status:** DONE
- **Notes:** رابط ویرایش و تغییر وضعیت در تسک بعدی اضافه می‌شود.

## TASK-059

- **Title:** رابط ویرایش و تغییر وضعیت اشخاص
- **Description:** ویرایش مشخصات و نقش و فعال یا غیرفعال‌کردن شخص در فهرست اشخاص.
- **Files:** `app/(app)/dashboard/parties/parties.tsx`، `app/(app)/dashboard/parties/party-controls.tsx`
- **Dependencies:** TASK-057، TASK-058
- **Acceptance Criteria:** کنترل‌ها برای مدیر و حسابدار نمایش داده شوند؛ خطا، تأیید تغییر وضعیت و به‌روزرسانی فهرست مدیریت شود.
- **Testing:** lint و build موفق بودند؛ بررسی ظاهری و تعامل در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-060

- **Title:** مدل داده کالا و خدمات
- **Description:** تعریف کالا و خدمت سازمان با کد یکتا، واحد، قیمت‌های ریالی دقیق و وضعیت فعال.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121230000_add_products/`، `docs/DATABASE.md`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-006
- **Acceptance Criteria:** سازمان معتبر، کد یکتای سازمانی، فیلدهای ضروری و قیمت‌های نامنفی در دیتابیس کنترل شوند.
- **Testing:** اعتبارسنجی و تولید Prisma Client، lint و آزمون قیود در دیتابیس مجزا موفق؛ migration روی دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** API و رابط، ارتباط با فاکتور و مدیریت موجودی هنوز پیاده‌سازی نشده‌اند.

+
## TASK-061

- **Title:** یکپارچه‌سازی مستندات و برنامه کار
- **Description:** تطبیق مستندات با کد، ثبت محدودیت‌ها و تعریف تسک‌های آتی.
- **Files:** `README.md`، `docs/ARCHITECTURE.md`، `docs/AI_DESIGN.md`، `docs/ROADMAP.md`، `docs/CHANGELOG.md`، `docs/TASKS.md`
- **Dependencies:** TASK-060
- **Acceptance Criteria:** تفکیک قابلیت موجود از هدف، ثبت نحوه اجرا و فهرست تسک‌های قابل پیگیری.
- **Testing:** بازبینی فایل‌ها، وابستگی‌ها و لینک‌های محلی مستندات.
- **Status:** DONE

## TASK-062

- **Title:** API ثبت و فهرست کالا و خدمات
- **Description:** ایجاد کالا یا خدمت و فهرست صفحه‌بندی‌شده با جست‌وجو و فیلتر نوع و وضعیت در محدوده سازمان.
- **Files:** `app/api/products/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-060
- **Acceptance Criteria:** نقش‌های مجاز، جداسازی سازمان، قیمت ریالی صحیح رشته‌ای و کد یکتای سازمانی کنترل شوند.
- **Testing:** lint، build و آزمون یکپارچه دسترسی، مبلغ، کد تکراری، فیلتر و تفکیک سازمان موفق بودند.
- **Status:** DONE
- **Notes:** رابط ثبت و فهرست و همچنین ویرایش و تغییر وضعیت هنوز ساخته نشده‌اند.

## TASK-063

- **Title:** رابط ثبت و فهرست کالا و خدمات
- **Description:** صفحه راست‌چین ثبت، جست‌وجو، فیلتر و صفحه‌بندی کالا و خدمات با اتصال به API.
- **Files:** `app/(app)/dashboard/products/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-062
- **Acceptance Criteria:** فرم سمت راست، قیمت ریالی دقیق، دسترسی متناسب با نقش و وضعیت خالی و خطا.
- **Testing:** lint و build موفق بودند؛ بررسی ظاهری و تعامل در مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** ویرایش و تغییر وضعیت در تسک‌های بعدی انجام می‌شوند.

## TASK-118

- **Title:** رفع استفاده از Prisma Client قدیمی در سرور توسعه
- **Description:** بازسازی نمونه کش‌شده هنگام تغییر schema یا تولید مجدد Prisma Client و جلوگیری از استفاده از نمونه بدون مدل‌های شخص و کالا.
- **Files:** `lib/prisma.ts`، `README.md`
- **Dependencies:** TASK-055، TASK-060
- **Acceptance Criteria:** نمونه قدیمی پس از تغییر schema یا client دوباره استفاده نشود و مسیرهای شخص و کالا در سرور تازه کار کنند.
- **Testing:** وضعیت migration محلی، lint، build و آزمون یکپارچه ثبت و فهرست در دیتابیس مجزا موفق؛ سناریوی hot reload مرورگر به‌صورت خودکار آزمایش نشده است.
- **Status:** DONE

## TASK-064

- **Title:** API ویرایش و تغییر وضعیت کالا و خدمات
- **Description:** ویرایش مشخصات و قیمت و فعال یا غیرفعال‌کردن کالا در سازمان کاربر.
- **Files:** `app/api/products/`، `lib/product-validation.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-062
- **Acceptance Criteria:** کنترل نقش و سازمان، اعتبارسنجی قیمت و جلوگیری از کد تکراری.
- **Testing:** build، lint فایل‌های تغییرکرده و آزمون یکپارچه در دیتابیس مجزا موفق؛ lint کل پروژه به علت طولانی شدن متوقف شد.
- **Status:** DONE
- **Notes:** رابط ویرایش و تغییر وضعیت در TASK-065 ساخته می‌شود.

## TASK-065

- **Title:** رابط ویرایش و تغییر وضعیت کالا و خدمات
- **Description:** ویرایش مشخصات، قیمت و فعال یا غیرفعال‌کردن کالا و خدمت در فهرست.
- **Files:** `app/(app)/dashboard/products/`
- **Dependencies:** TASK-063، TASK-064
- **Acceptance Criteria:** کنترل‌ها متناسب با نقش، با تأیید تغییر وضعیت، اعتبارسنجی قیمت و به‌روزرسانی فهرست کار کنند.
- **Testing:** lint پوشه کالا و خدمات و build موفق؛ بررسی ظاهری و تعاملی در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-119

- **Title:** تکمیل داده نمایشی سازمان test
- **Description:** افزودن اشخاص، کالا و خدمات و اسناد نمونه در ماه‌های مختلف سال مالی باز برای ارزیابی رابط و گزارش‌ها.
- **Files:** `scripts/seed-test-showcase.mjs`، `README.md`
- **Dependencies:** TASK-055، TASK-060، TASK-065
- **Acceptance Criteria:** اطلاعات فقط به سازمان test اضافه شوند، داده‌های قبلی حفظ شوند، اسناد متوازن و نمونه‌ها قابل تشخیص باشند.
- **Testing:** اجرای تراکنشی موفق؛ کنترل تعداد، وضعیت و توازن اسناد جدید و lint اسکریپت موفق بود.
- **Status:** DONE
- **Notes:** ۸ شخص، ۸ کالا/خدمت، ۱۵ سند نهایی و ۲ پیش‌نویس در سال مالی ۱۴۰۴ افزوده شدند. برچسب‌های نمایشی بعداً به درخواست کاربر حذف شدند. فاکتور و پرداخت هنوز ساخته نشده‌اند.

## TASK-120

- **Title:** حذف برچسب از داده‌های سازمان test
- **Description:** حذف برچسب‌های نمایشی از حساب‌ها، اشخاص، کالاها و شرح اسناد انتخاب‌شده سازمان test بنا به درخواست کاربر.
- **Files:** `scripts/clean-test-labels.mjs`، `scripts/seed-test-showcase.mjs`، `README.md`
- **Dependencies:** TASK-119
- **Acceptance Criteria:** داده مالی و توازن حفظ شود، محافظ سند نهایی دوباره فعال باشد و تغییر شرح سند نهایی ثبت حسابرسی داشته باشد.
- **Testing:** بررسی نبود برچسب در داده‌های سازمان، توازن ۲۲ سند، فعال‌بودن trigger و lint اسکریپت موفق بود.
- **Status:** DONE
- **Notes:** برای اصلاح فقط شرح‌های انتخاب‌شدهٔ test، trigger در همان تراکنش و زیر قفل جدول موقتاً غیرفعال و پیش از commit فعال شد؛ ۲۰ رویداد حسابرسی شامل شرح قبل و بعد ثبت شد.

## TASK-066

- **Title:** طراحی ارتباط حساب اشخاص
- **Description:** طراحی ارتباط اختصاصی دریافتنی و پرداختنی اشخاص، قواعد مانده و حفاظت از تاریخچه و سازمان.
- **Files:** `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-055، TASK-029
- **Acceptance Criteria:** نوع حساب، یکتایی، پایداری اتصال، محاسبه و محدودیت‌های سازمان و هم‌زمانی مشخص باشند.
- **Testing:** بازبینی طرح با مدل و مسیرهای فعلی سند، کدینگ و گزارش دفتر کل.
- **Status:** DONE
- **Notes:** فقط طراحی مستند شد؛ هیچ schema یا API تغییری نکرده است. TASK-067 احتمالاً باید به تسک‌های کوچک‌تر تقسیم شود.

## TASK-067

- **Title:** مدل اتصال حساب شخص و ممیزی
- **Description:** تعریف اتصال اختصاصی دریافتنی/پرداختنی، نشانگر اولین استفاده و ساختار ثبت تغییرات.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261122200000_add_party_account_links/`، `tests/trial-balance-isolated.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-066
- **Acceptance Criteria:** دو کاربرد مستقل، یکتایی اتصال، کلیدهای خارجی هم‌سازمانی و نگهداری رویداد پس از قطع اتصال.
- **Testing:** Prisma validate و generate، lint تست و آزمون قیود در دیتابیس مجزا موفق؛ migration در دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** تنظیم خودکار firstUsedAt، بررسی نوع/نقش/فعال بودن حساب، محافظت عملیات و ایجاد رویداد خودکار هنوز پیاده نشده‌اند و در TASK-121 و TASK-122 انجام می‌شوند.

## TASK-121

- **Title:** محافظت از حساب و نقش متصل
- **Description:** محافظت حساب و نقش متصل در مسیرهای موجود و ثبت نخستین استفاده در پیش‌نویس سند.
- **Files:** `app/api/ledger-accounts/`، `app/api/parties/[id]/`، `app/api/journal-entries/`، `lib/journal-account-locks.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-067
- **Acceptance Criteria:** جلوگیری از تغییر نقش، غیرفعال‌سازی یا افزودن فرزند ناسازگار؛ ثبت firstUsedAt در ایجاد/ویرایش سند و حفظ آن پس از حذف پیش‌نویس؛ رد ثبت سند برای شخص غیرفعال.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه در پایگاه مجزا موفق؛ مسابقه غیرفعال‌سازی شخص با ایجاد سند نیز آزموده شد.
- **Status:** DONE
- **Notes:** API اتصال، ممیزی تغییر اتصال، حفاظت از حذف/تعویض آن و آزمون هم‌زمانی اتصال با ایجاد سند یا فرزند در TASK-122 باقی است. ثبت مستقیم در دیتابیس تحت محافظت API نیست.

## TASK-122

- **Title:** API مدیریت اتصال حساب اشخاص
- **Description:** مشاهده، اتصال، تعویض و قطع حساب دریافتنی/پرداختنی با ممیزی و قفل‌های سازگار.
- **Files:** `app/api/parties/[id]/accounts/route.ts`، `app/api/journal-entries/`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-067، TASK-121
- **Acceptance Criteria:** فقط مدیر تغییر دهد؛ حساب متعلق به سازمان، فعال، هم‌نوع، اختصاصی، بدون فرزند و بدون گردش قبلی باشد؛ تغییر حساب استفاده‌شده رد و هر تغییر ثبت شود.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه مجزا موفق؛ اتصال هم‌زمان با سند، زیرحساب و اتصال شخص دیگر بررسی شد.
- **Status:** DONE
- **Notes:** رابط انتخاب حساب و گزارش مانده هنوز ساخته نشده‌اند. ثبت مستقیم در دیتابیس خارج از این کنترل‌های API است.

## TASK-068

- **Title:** رابط اتصال حساب به شخص
- **Description:** نمایش و مدیریت حساب دریافتنی و پرداختنی در کارت شخص با استفاده از API اتصال.
- **Files:** `app/(app)/dashboard/parties/`
- **Dependencies:** TASK-122
- **Acceptance Criteria:** مشاهده برای نقش‌های مجاز، مدیریت توسط مدیر، نمایش حساب استفاده‌شده و شرایط انتخاب و خطا.
- **Testing:** lint بخش اشخاص و build موفق؛ بررسی ظاهری و تعاملی مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** فهرست انتخاب فقط نوع، فعال‌بودن و نداشتن زیرحساب را در رابط بررسی می‌کند؛ گردش قبلی و اختصاص به شخص دیگر هنگام ذخیره توسط سرور بررسی می‌شوند. گزارش مانده هنوز ساخته نشده است.

## TASK-069

- **Title:** مدل رویداد درآمد و هزینه
- **Description:** مدل رویداد مالی با مبلغ دقیق و اتصال یکتای سند نهایی در همان سازمان و سال.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261122210000_add_financial_transactions/`، `tests/trial-balance-isolated.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-034
- **Acceptance Criteria:** مبلغ مثبت، حساب‌های متفاوت، روابط هم‌سازمانی، وضعیت معتبر، سند یکتای نهایی و تاریخ یکسان کنترل شوند.
- **Testing:** Prisma validate و generate، آزمون قیود در دیتابیس مجزا، lint تست و مقایسه schema با دیتابیس موفق؛ migration روی دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** هنوز API یا رابط وجود ندارد؛ نوع و فعال بودن حساب‌ها، سال باز و تطبیق مبلغ با ردیف‌های سند باید در مراحل بعد کنترل شوند.

## TASK-070

- **Title:** API پیش‌نویس درآمد و هزینه
- **Description:** ثبت، فهرست و حذف پیش‌نویس مالی با اعتبارسنجی سمت سرور و جلوگیری از بستن سال دارای پیش‌نویس مالی.
- **Files:** `app/api/transactions/`، `app/api/fiscal-years/[id]/close/route.ts`، `lib/prisma-errors.ts`، `app/api/journal-entries/`، `app/api/parties/[id]/accounts/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-069
- **Acceptance Criteria:** فقط کاربر مجاز بتواند پیش‌نویس معتبر و هم‌سازمانی در سال باز بسازد یا حذف کند؛ هیچ سند نهایی ساخته نشود و بستن سال دارای پیش‌نویس رد شود.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه در دیتابیس مجزا موفق؛ تداخل ایجاد پیش‌نویس و بستن سال، محدودیت سازمان، نقش، نوع حساب و مبلغ بررسی شدند.
- **Status:** DONE
- **Notes:** API فقط پیش‌نویس‌ها را فهرست می‌کند. ویرایش، نهایی‌سازی و رابط هنوز ساخته نشده‌اند؛ ثبت نهایی باید همه اعتبارسنجی‌ها را دوباره انجام دهد و سند متوازن بسازد.

## TASK-071

- **Title:** رابط پیش‌نویس درآمد و هزینه
- **Description:** فرم راست‌چین ثبت، فهرست و حذف پیش‌نویس با تقویم شمسی و فیلتر.
- **Files:** `app/(app)/dashboard/transactions/`، `app/(app)/dashboard/layout.tsx`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-070
- **Acceptance Criteria:** نقش مشاهده‌گر فقط فهرست ببیند؛ ثبت و حذف با پیام وضعیت و تأکید بر عدم ایجاد سند نهایی انجام شود.
- **Testing:** build، lint بخش مرتبط و آزمون دسترسی صفحه و API در دیتابیس مجزا موفق؛ بررسی ظاهری و تعاملی مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** تا پیش از TASK-072 ثبت نهایی وجود ندارد و سال مالی دارای پیش‌نویس بسته نمی‌شود.

## TASK-072

- **Title:** بک‌اند ثبت نهایی درآمد و هزینه
- **Description:** ایجاد اتمی سند دوطرفه و اتصال آن به رویداد مالی، با بررسی مجدد شرایط و جلوگیری از ثبت تکراری.
- **Files:** `app/api/transactions/`، `lib/financial-accounts.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-070، TASK-037
- **Acceptance Criteria:** ثبت درآمد و هزینه سند متوازن با شماره یکتا و رویداد حسابرسی بسازد؛ تغییرات هم‌زمان، حساب نامعتبر و ثبت مجدد رد شوند و گزارش دوباره‌شماری نکند.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه در پایگاه مجزا موفق؛ جهت ردیف‌ها، تطبیق سود و زیان، حساب غیرفعال، ثبت هم‌زمان، حذف هم‌زمان و پایان محدوده شماره بررسی شدند.
- **Status:** DONE
- **Notes:** رابط ثبت نهایی در TASK-073 ساخته می‌شود؛ ویرایش پیش‌نویس و اصلاح رویداد نهایی هنوز موجود نیست.

## TASK-073

- **Title:** رابط ثبت نهایی درآمد و هزینه
- **Description:** پیش‌نمایش ردیف‌های بدهکار و بستانکار و ثبت نهایی پیش‌نویس با نمایش شماره سند.
- **Files:** `app/(app)/dashboard/transactions/draft-list.tsx`، `app/(app)/dashboard/transactions/transactions.tsx`
- **Dependencies:** TASK-071، TASK-072
- **Acceptance Criteria:** کاربر مجاز پیش از تأیید حساب‌ها و مبلغ را ببیند، نتیجه یا خطا و شماره سند نمایش داده شود و پیش‌نویس نهایی‌شده از فهرست خارج شود.
- **Testing:** build، lint بخش مرتبط و آزمون یکپارچه API و دسترسی صفحه در دیتابیس مجزا موفق؛ تعامل بصری مرورگر بررسی نشده است.
- **Status:** DONE
- **Notes:** بعد از ثبت نهایی، سند در صفحه اسناد در دسترس است؛ فهرست این صفحه هنوز فقط پیش‌نویس‌ها را نمایش می‌دهد.

## TASK-074

- **Title:** مدل پیش‌نویس فاکتور فروش و اقلام
- **Description:** مدل، migration و قیود پایه فاکتور پیش‌نویس و اقلام با مالکیت سازمانی و تصویر اطلاعات مشتری و کالا.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261123100000_add_invoice_drafts/`، `tests/invoice-draft-db.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-060، TASK-055
- **Acceptance Criteria:** سال، مشتری، فاکتور و کالای مرتبط متعلق به همان سازمان باشند؛ مبلغ و تعداد دقیق و اطلاعات نمایشی اقلام در زمان ثبت ذخیره شوند.
- **Testing:** `node tests/invoice-draft-db.mjs`، `prisma validate`، `prisma generate` و `prisma migrate deploy`.
- **Status:** DONE
- **Notes:** فقط مدل پیش‌نویس فراهم شده است. محاسبه، API، کنترل فعال‌بودن مشتری و کالا، بازبودن سال و اعتبار تاریخ در مراحل بعد انجام می‌شوند؛ صدور و رابط وجود ندارند. آزمون migration در یک schema موقت و تراکنش بازگشت‌پذیر اجرا می‌شود.

## TASK-075

- **Title:** محاسبه سروری اقلام فاکتور
- **Description:** محاسبه دقیق جمع هر قلم و جمع فاکتور با تعداد اعشاری، تخفیف و مالیات مبلغی و کنترل سرریز.
- **Files:** `lib/invoice-calculation.ts`، `tests/invoice-calculation.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-074
- **Acceptance Criteria:** ورودی و خروجی مالی رشته دقیق باشند؛ گردکردن، سقف تخفیف و حدود مبلغ رعایت شوند.
- **Testing:** `node tests/invoice-calculation.mjs` و بررسی TypeScript موفق بودند؛ اجرای ESLint برای فایل‌ها در این محیط بدون خروجی متوقف شد و نتیجه‌ای نداد.
- **Status:** DONE
- **Notes:** این تابع مستقل هنوز به API یا رابط متصل نیست. مالیات به‌صورت مبلغ ورودی است و نرخ یا قوانین مالیاتی را محاسبه نمی‌کند؛ در API آینده محاسبه و اعتبارسنجی باید سمت سرور تکرار و مجوز و داده‌های مرجع بررسی شوند.

## TASK-076

- **Title:** API ایجاد و مشاهده پیش‌نویس فاکتور
- **Description:** ایجاد، فهرست و جزئیات پیش‌نویس با محاسبه سروری و امکان حذف پیش‌نویس برای تعیین تکلیف پیش از بستن سال.
- **Files:** `app/api/invoices/`، `app/api/fiscal-years/[id]/close/route.ts`، `lib/invoice-api.ts`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-074، TASK-075
- **Acceptance Criteria:** مشتری، کالا، سال، نقش و سازمان کنترل شوند؛ مقادیر از ورودی معتبر و تصویر اطلاعات از دیتابیس ساخته شوند؛ سال دارای پیش‌نویس بسته نشود.
- **Testing:** ساخت production و آزمون API در دیتابیس موقت مستقل؛ بررسی محاسبه، نقش، جداسازی سازمان، اعتبار ورودی، ثبت و حذف و بستن سال.
- **Status:** DONE
- **Notes:** قیمت واحد، مبلغ تخفیف و مالیات در درخواست تعیین می‌شوند؛ نرخ مالیات خودکار نیست. تنها API موجود است و رابط، ویرایش، صدور و سند مالی در تسک‌های بعدی هستند. سازمان مانند سایر APIهای فعلی از نخستین عضویت کاربر انتخاب می‌شود.

## TASK-077

- **Title:** رابط پیش‌نویس فاکتور فروش
- **Description:** صفحه راست‌چین ساخت، فهرست، مشاهده جزئیات و حذف پیش‌نویس فاکتور با انتخاب مشتری، کالا و تاریخ شمسی.
- **Files:** `app/(app)/dashboard/invoices/`، `app/(app)/dashboard/layout.tsx`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-076
- **Acceptance Criteria:** فرم در سمت راست، انتخاب سال باز، نمایش پیش‌نمایش و مبلغ محاسبه‌شده سرور، فهرست صفحه‌بندی‌شده و حذف با تأیید فراهم باشد؛ نقش مشاهده‌گر نتواند ثبت و حذف کند.
- **Testing:** ساخت پروژه و آزمون پاسخ صفحه و API در دیتابیس موقت؛ بازبینی تعاملی مرورگر هنوز انجام نشده است.
- **Status:** DONE
- **Notes:** صفحه فقط پیش‌نویس را نمایش می‌دهد؛ ویرایش، صدور فاکتور، سند حسابداری و اتصال به گزارش فروش در مراحل بعدی هستند. مالیات مبلغی است و خودکار محاسبه نمی‌شود.

## TASK-078

- **Title:** API ویرایش پیش‌نویس فاکتور
- **Description:** ویرایش اتمی مشتری، تاریخ، شرح و اقلام فاکتور پیش‌نویس با محاسبه مجدد و کنترل نسخه.
- **Files:** `app/api/invoices/[id]/route.ts`، `lib/invoice-api.ts`، `prisma/schema.prisma`، `prisma/migrations/20261124160000_invoice_revision/`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-076
- **Acceptance Criteria:** فقط نقش مجاز بتواند پیش‌نویس سازمان خود را در سال باز ویرایش کند؛ مشتری و کالا فعال و متعلق به سازمان باشند؛ نسخه قدیمی و داده نامعتبر رد شوند و اقلام اتمی ذخیره شوند.
- **Testing:** ساخت پروژه، ESLint و آزمون API در دیتابیس موقت شامل دسترسی، سازمان، سال بسته، ورودی نامعتبر، حفظ تصویر کالا و رقابت دو ویرایش موفق بودند.
- **Status:** DONE
- **Notes:** درخواست باید شماره نسخه فعلی و کل اقلام را بفرستد؛ شناسه قلم موجود برای حفظ تصویر قبلی همان کالا ارسال می‌شود. رابط ویرایش در TASK-079 باقی است و تغییر سال مالی از این مسیر مجاز نیست.

## TASK-079

- **Title:** رابط ویرایش پیش‌نویس فاکتور
- **Description:** ویرایش اطلاعات و اقلام در فرم سمت راست با تاریخ شمسی، نمایش محاسبه و مدیریت خطای نسخه قدیمی.
- **Files:** `app/(app)/dashboard/invoices/`، `docs/ARCHITECTURE.md`
- **Dependencies:** TASK-077، TASK-078
- **Acceptance Criteria:** مشتری، تاریخ، شرح و اقلام بارگذاری و قابل اصلاح باشند؛ شناسه اقلام موجود حفظ، نسخه فاکتور ارسال و خطای تغییر هم‌زمان بدون پاک‌شدن فرم نمایش داده شود.
- **Testing:** ساخت پروژه، ESLint و آزمون یکپارچه API؛ بازبینی تعاملی مرورگر هنوز انجام نشده است.
- **Status:** DONE
- **Notes:** مشتری یا کالای غیرفعال باید پیش از ذخیره جایگزین شود. ویرایش سال مالی، صدور و ایجاد سند در این مرحله وجود ندارند.

## TASK-080

- **Title:** صدور فاکتور فروش و سند مالی
- **Description:** صدور اتمی فاکتور، تخصیص شماره در سال مالی و ثبت سند حسابداری متوازن با دریافتنی مشتری، درآمد و در صورت وجود، بدهی مالیات.
- **Files:** `app/api/invoices/[id]/issue/route.ts`، `app/api/invoices/`، `prisma/schema.prisma`، `prisma/migrations/20261124170000_issue_invoices/`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-122، TASK-075، TASK-078
- **Acceptance Criteria:** سال، نسخه، حساب‌ها، مشتری، کالا و مبلغ بررسی شوند؛ سند و فاکتور اتمی و فقط یک بار ثبت شوند؛ فاکتور و اقلام نهایی در دیتابیس محافظت شوند.
- **Testing:** ساخت پروژه، ESLint و آزمون API در دیتابیس موقت شامل نقش، جداسازی سازمان، صدور هم‌زمان، مبالغ و سند متوازن، مالیات صفر، مبلغ صفر و محافظت فاکتور و سند موفق بودند.
- **Status:** DONE
- **Notes:** صدور تنها فروش نسیه با حساب دریافتنی اختصاصی مشتری است؛ حساب درآمد و حساب بدهی مالیات هنگام صدور تعیین می‌شوند. رابط صدور و نمایش فاکتور صادرشده در TASK-081 باقی است. دریافت و پرداخت، ابطال و محاسبه خودکار نرخ مالیات موجود نیستند.

## TASK-081

- **Title:** رابط صدور فاکتور فروش
- **Description:** پیش‌نمایش سند نسیه، انتخاب حساب‌های درآمد و بدهی مالیات، تأیید صدور و مشاهده فاکتورهای صادرشده و سند مرتبط.
- **Files:** `app/(app)/dashboard/invoices/`، `app/(app)/dashboard/journal/page.tsx`، `docs/ARCHITECTURE.md`
- **Dependencies:** TASK-080
- **Acceptance Criteria:** دریافتنی مشتری و مبالغ بدهکار و بستانکار روشن باشند؛ برای مالیات مثبت حساب بدهی انتخاب شود؛ نتیجه نامشخص، تغییر هم‌زمان و عدم وجود حساب به کاربر اعلام شوند؛ فاکتور صادرشده در فهرست قابل مشاهده باشد.
- **Testing:** ساخت پروژه، ESLint و آزمون یکپارچه API و بارگذاری صفحه؛ بازبینی تعاملی مرورگر هنوز انجام نشده است.
- **Status:** DONE
- **Notes:** صدور تنها نسیه است و دریافت وجه ثبت نمی‌کند؛ فاکتور صادرشده قابل ویرایش و حذف مستقیم نیست. حساب‌ها و اتصال مشتری هنگام بارگذاری صفحه دریافت و مجدداً در زمان صدور توسط سرور اعتبارسنجی می‌شوند. ابطال و پرداخت در مراحل بعدی‌اند.

## TASK-082

- **Title:** مدل دریافت، پرداخت و تخصیص فاکتور
- **Description:** مدل پیش‌نویس دریافت یا پرداخت، تخصیص به فاکتور، مبلغ دقیق و کلیدهای مرکب سازمان و شخص.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261124180000_add_payment_drafts/`، `tests/payment-draft-db.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-074
- **Acceptance Criteria:** مبلغ مثبت و دقیق باشد؛ سال، شخص و حساب تسویه متعلق به سازمان باشند؛ تخصیص فقط از دریافت به فاکتور همان شخص و سازمان و بدون تکرار همان جفت انجام شود.
- **Testing:** اعتبارسنجی و تولید Prisma Client، آزمون قیود در schema موقت، اجرای همه migrationها در دیتابیس آزمایشی و اعمال migration در دیتابیس پروژه موفق بودند.
- **Status:** DONE
- **Notes:** تنها مدل `DRAFT` وجود دارد؛ API، کنترل مانده، نقش شخص، وضعیت فاکتور و سال، ثبت نهایی و سند هنوز پیاده نشده‌اند. این مدل به‌تنهایی از تخصیص بیش از مبلغ فاکتور یا دریافت جلوگیری نمی‌کند. TASK-083 باید این قواعد را اتمی و با آزمون هم‌زمانی پیاده کند.

## TASK-083

- **Title:** ثبت دریافت و تخصیص فاکتور
- **Description:** API ثبت دریافت مشتری با تخصیص کامل مبلغ به یک یا چند فاکتور صادرشده، محاسبه مانده، سند حسابداری و جلوگیری از تکرار درخواست.
- **Files:** `app/api/receipts/`، `app/api/fiscal-years/[id]/close/route.ts`، `lib/receipt-api.ts`، `prisma/migrations/20261124190000_post_receipts/`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-080، TASK-082
- **Acceptance Criteria:** مشتری و حساب معتبر، سال باز، فاکتور صادرشده همان مشتری و مانده کافی بررسی شوند؛ ثبت و سند اتمی، تکرار درخواست ایمن و تخصیص نهایی محافظت‌شده باشد.
- **Testing:** ساخت پروژه و ESLint؛ آزمون دیتابیس موقت برای دریافت جزئی و کامل، سند، سازمان، اضافه‌پرداخت، بستن سال، تکرار و رقابت دو دریافت و دو درخواست یکسان موفق بود.
- **Status:** DONE
- **Notes:** جمع تخصیص‌ها باید برابر مبلغ دریافت باشد؛ دریافت بدون تخصیص و پرداخت تأمین‌کننده در این مرحله وجود ندارند. رابط دریافت در TASK-084 باقی است. فقط تخصیص‌های دریافت ثبت‌شده در مانده لحاظ می‌شوند.

## TASK-084

- **Title:** رابط ثبت دریافت مشتری
- **Description:** فرم راست‌چین انتخاب مشتری، تاریخ شمسی، حساب و فاکتورها با نمایش مانده، پیش‌نمایش سند، تأیید و فهرست دریافت‌های ثبت‌شده.
- **Files:** `app/(app)/dashboard/receipts/`، `app/(app)/dashboard/layout.tsx`، `lib/receipt-api.ts`، `tests/receipt-ui-browser.mjs`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-083
- **Acceptance Criteria:** تخصیص جزئی یا کامل، مانده سروری، شماره سند و حالت خالی و خطا نمایش داده شوند؛ نتیجه نامشخص با همان کلید درخواست قابل پیگیری باشد.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون API در دیتابیس موقت و آزمون تعاملی Chrome برای انتخاب فاکتور و تاریخ، پیش‌نمایش، ثبت دریافت و بازیابی درخواست پس از بارگذاری دوباره موفق بودند.
- **Status:** DONE
- **Notes:** برای درخواست نامشخص اطلاعات در sessionStorage همان زبانه نگهداری می‌شوند؛ پس از بسته‌شدن زبانه این حفاظت مرورگر دائمی نیست و کاربر باید پیش از تکرار، فهرست و سند را بررسی کند. دریافت بدون تخصیص و پرداخت به تأمین‌کننده هنوز موجود نیستند.

## TASK-085

- **Title:** بک‌اند پرداخت به تأمین‌کننده
- **Description:** API ثبت و فهرست پرداخت نهایی با حساب پرداختنی اختصاصی، سند متوازن و کلید تکرار ایمن.
- **Files:** `app/api/supplier-payments/route.ts`، `prisma/migrations/20261125100000_post_supplier_payments/`، `tests/invoice-api-isolated.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-122، TASK-082
- **Acceptance Criteria:** نقش، سازمان، تأمین‌کننده، سال و حساب‌ها کنترل شوند؛ سند و پرداخت اتمی، نهایی و در برابر تکرار و تغییر محافظت شوند.
- **Testing:** ساخت پروژه و آزمون API در دیتابیس موقت، شامل دسترسی، سال و حساب نامعتبر، تکرار هم‌زمان، توازن و محافظت رکورد موفق بودند؛ migration در دیتابیس پروژه اعمال شد.
- **Status:** DONE
- **Notes:** پرداخت به فاکتور خرید تخصیص نمی‌یابد و سقف مانده بدهی بررسی نمی‌شود؛ ممکن است مانده بدهکار به معنی پیش‌پرداخت ایجاد کند. رابط در TASK-086 و ابطال در مراحل بعدی باقی است.

## TASK-086

- **Title:** رابط پرداخت به تأمین‌کننده
- **Description:** صفحه راست‌چین انتخاب تأمین‌کننده، حساب تسویه، مبلغ و تاریخ شمسی، پیش‌نمایش و تأیید سند و فهرست پرداخت‌ها.
- **Files:** `app/(app)/dashboard/supplier-payments/`، `app/(app)/dashboard/layout.tsx`، `tests/receipt-ui-browser.mjs`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-085
- **Acceptance Criteria:** حساب پرداختنی و سند بدهکار/بستانکار، هشدار نبود کنترل مانده، سابقه، پیوند سند و پیام‌های خطا و نتیجه نامشخص قابل مشاهده باشند.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون یکپارچه و تعاملی Chrome در دیتابیس موقت شامل انتخاب تأمین‌کننده، تاریخ، ثبت پرداخت و بازیابی پس از بارگذاری دوباره موفق بودند.
- **Status:** DONE
- **Notes:** برای نتیجه نامشخص همان درخواست در sessionStorage همان زبانه نگه داشته می‌شود و پس از بسته‌شدن زبانه پایدار نیست. تخصیص به فاکتور خرید، کنترل سقف بدهی و ابطال هنوز ساخته نشده‌اند.

## TASK-087

- **Title:** بک‌اند گزارش مانده اشخاص و فاکتورها
- **Description:** گزارش صفحه‌بندی‌شده گردش حساب‌های اختصاصی اشخاص در سال انتخاب‌شده و مانده فاکتورهای صادرشده همان سال تا پایان سال.
- **Files:** `app/api/reports/party-balances/`، `tests/invoice-api-isolated.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-083، TASK-085
- **Acceptance Criteria:** فقط اسناد ثبت‌شده و تخصیص‌های دریافت نهایی لحاظ شوند؛ بدهکار و بستانکار و مانده فاکتور تفکیک و در محدوده سازمان با دقت کامل ارائه شوند.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون یکپارچه در دیتابیس موقت شامل دسترسی، فیلتر، صفحه‌بندی، مانده بدهکار/بستانکار، مبالغ بزرگ، حذف پیش‌نویس و دریافت سال بعد موفق بودند.
- **Status:** DONE
- **Notes:** گزارش شخص گردش همان سال و لزوماً مانده افتتاحیه نیست؛ گزارش فاکتور دریافت‌ها را تا پایان سال انتخاب‌شده نشان می‌دهد. این دو خروجی نباید با یکدیگر جمع شوند. رابط در TASK-088 باقی است.

## TASK-088

- **Title:** رابط گزارش مانده اشخاص و فاکتورها
- **Description:** صفحه راست‌چین گزارش گردش حساب‌های اشخاص و فاکتورهای صادرشده با فیلتر، صفحه‌بندی و نمایش مانده تاریخی.
- **Files:** `app/(app)/dashboard/reports/party-balances/`، `app/(app)/dashboard/layout.tsx`، `tests/receipt-ui-browser.mjs`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-087
- **Acceptance Criteria:** فیلتر سال، نام، نقش و وضعیت؛ نمایش جداگانه دریافتنی و پرداختنی، نبود حساب، گردش و مانده؛ مشاهده فاکتورها و دریافت‌ها تا پایان سال و پیوند سند.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون یکپارچه API و مرورگر در دیتابیس موقت شامل جست‌وجو، جزئیات فاکتور و عرض موبایل موفق بودند.
- **Status:** DONE
- **Notes:** گردش حساب لزوماً شامل مانده افتتاحیه نیست و مانده فاکتور تا پایان سال انتخابی محاسبه می‌شود؛ این دو مقدار نباید جمع شوند. گزارش فقط خواندنی است.

## TASK-089

- **Title:** بک‌اند پیش‌نویس سند برگشتی
- **Description:** ایجاد پیش‌نویس برگشتی دقیق برای سند مستقل ثبت‌شده با انتخاب سال مالی باز و تاریخ مجاز، رد برگشت تکراری و کنترل ثبت نهایی.
- **Files:** `app/api/journal-entries/`، `prisma/schema.prisma`، `prisma/migrations/20261125110000_add_journal_reversals/`، `tests/invoice-api-isolated.mjs`
- **Dependencies:** TASK-037، TASK-039
- **Acceptance Criteria:** سند اصلی و برگشتی در یک سازمان باشند؛ ردیف‌ها دقیقاً معکوس شوند؛ برگشت تکراری و ویرایش ردیف برگشتی رد شود؛ حذف پیش‌نویس امکان ایجاد مجدد بدهد و ثبت نهایی با سند اصلی تطبیق داده شود.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون دیتابیس موقت شامل دسترسی، اسناد متصل به عملیات، پیش‌نویس، برگشت هم‌زمان، تغییر ردیف، ثبت نهایی، حذف، رد برگشت مجدد و برگشت میان سال‌ها موفق بود. migration روی دیتابیس پروژه اعمال شد.
- **Status:** DONE
- **Notes:** فقط اسناد مستقل پشتیبانی می‌شوند؛ برگشت مستقیم اسناد فاکتور، دریافت، پرداخت و درآمد/هزینه تا پیاده‌سازی فرایند اصلاح عملیات مربوط ممنوع است. پیش‌نویس اثری در گزارش ندارد؛ رابط در TASK-090 تکمیل شده است.

### TASK-090 — رابط سند برگشتی

- **Dependencies:** TASK-089
- **Acceptance Criteria:** پیش‌نمایش ردیف‌های معکوس، انتخاب سال مالی باز و تاریخ شمسی، ایجاد پیش‌نویس و نمایش ارتباط دو سند و وضعیت ثبت؛ جلوگیری از ویرایش پیش‌نویس برگشتی و توضیح محدودیت اسناد عملیات مرتبط.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون مرورگر در دیتابیس ایزوله شامل پیش‌نمایش، اعتبارسنجی تاریخ، ایجاد پیش‌نویس و عدم نمایش ویرایش موفق بود.
- **Status:** DONE

### TASK-107 — بک‌اند ابطال فاکتور

- **Dependencies:** TASK-080، TASK-089
- **Acceptance Criteria:** ابطال فاکتور صادرشده بدون تخصیص دریافت با دلیل، کنترل نسخه و تاریخ در همان سال مالی باز، ساخت و ثبت اتمی سند دقیقاً معکوس و محافظت از تاریخچه؛ رد دسترسی غیرمجاز، ابطال تکراری و دریافت هم‌زمان.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس ایزوله شامل نقش، سازمان، تاریخ، سال بسته، سند معکوس، تخصیص، ابطال هم‌زمان، رقابت دریافت و ابطال، گزارش و محافظت دیتابیس موفق بودند. migration روی دیتابیس پروژه اعمال شد.
- **Status:** DONE
- **Notes:** ابطال فاکتور تخصیص‌دار و ابطال در سال مالی دیگر پشتیبانی نمی‌شوند؛ رابط در TASK-108 تکمیل شده است.

### TASK-108 — رابط ابطال فاکتور

- **Dependencies:** TASK-107
- **Acceptance Criteria:** انتخاب تاریخ شمسی و دلیل ابطال، تأیید صریح آثار سند، نمایش محدودیت دریافت و سال بسته، فهرست فاکتورهای باطل‌شده و پیوند سند برگشتی.
- **Testing:** ساخت پروژه و ESLint؛ آزمون مرورگر موبایل با دیتابیس ایزوله شامل فاکتور تخصیص‌دار، اعتبارسنجی تاریخ و دلیل، ثبت ابطال و مشاهده نتیجه پس از بارگذاری مجدد موفق بود.
- **Status:** DONE

### TASK-091 — طراحی اختتامیه و انتقال مانده

- **Dependencies:** TASK-025، TASK-089
- **Acceptance Criteria:** قواعد حساب‌های موقت و دائمی و مسیر بازبینی و کنترل گزارش مشخص شود.
- **Testing:** طرح و مثال محاسبه در [سند اختتامیه](./FISCAL_YEAR_CLOSING_DESIGN.md) ثبت شد؛ کاربر تأیید کرد که مسئول حسابداری طرح را بررسی و تأیید کرده است.
- **Status:** DONE

### TASK-105 — بک‌اند اختتامیه و انتقال مانده

- **Dependencies:** TASK-091
- **Acceptance Criteria:** پیش‌نمایش و ثبت اتمی، بررسی داده‌های جدید، محافظت سندهای سیستمی، انتقال مانده، کنترل تکرار و حفظ گزارش عملکرد.
- **Testing:** تست محاسبه، ساخت پروژه، TypeScript و ESLint؛ آزمون دیتابیس مجزا شامل دسترسی، پیش‌نمایش کهنه، بستن و افتتاحیه متوازن، ثبت تکراری، هم‌زمانی با سند جدید، سال بدون گردش، محافظت دیتابیس، سود و زیان، داشبورد و تراز پیش و پس از اختتامیه موفق بود. migration روی دیتابیس پروژه اعمال شد.
- **Status:** DONE
- **Notes:** ثبت توسط API مدیر انجام می‌شود و رابط در TASK-106 تکمیل شده است. عملیات واقعی روی داده‌های پروژه انجام نشده است؛ محدودیت ۱۰۰ ردیف، سال پیوسته و حساب‌های معتبر در طرح مشخص است.

### TASK-106 — رابط اختتامیه و انتقال مانده

- **Dependencies:** TASK-105
- **Acceptance Criteria:** انتخاب حساب نتیجه و سال جدید با تقویم شمسی، مشاهده ردیف‌ها و موانع، تأیید صریح، نتیجه و پیوند سندها و رسیدگی به پاسخ نامشخص.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون مرورگر موبایل در دیتابیس ایزوله شامل اعتبارسنجی، پیش‌نمایش، ثبت، شبیه‌سازی قطع پاسخ، بازیابی همان درخواست و مشاهده نتیجه بعد از بارگذاری دوباره موفق بود.
- **Status:** DONE
- **Notes:** اطلاعات درخواست نامشخص در sessionStorage همان زبانه است؛ پس از بسته‌شدن زبانه قابل اتکا نیست. بستن ساده سال همچنان گزینه‌ای مجزا و بدون انتقال مانده است.

### TASK-111 — بک‌اند گزارش فروش و فاکتورهای پرداخت‌نشده

- **Dependencies:** TASK-083
- **Acceptance Criteria:** گزارش فاکتورهای معتبر، فیلتر مشتری، بازه تاریخ، وضعیت دریافت و صفحه‌بندی؛ مبالغ دقیق، دریافت جزئی و ابطال بر اساس تاریخ مؤثر.
- **Testing:** TypeScript، ESLint، ساخت پروژه و آزمون دیتابیس موقت شامل نقش و سازمان، دریافت جزئی، فاکتور تسویه‌نشده، صفحه‌بندی، ابطال تاریخی و دریافت در سال بعد موفق بودند.
- **Status:** DONE
- **Notes:** API فقط خواندنی است؛ رابط در TASK-112 تکمیل شده است. گزارش بر اساس تاریخ حسابداری است نه زمان واقعی صدور و ثبت ابطال.

### TASK-112 — رابط گزارش فروش و مانده فاکتورها

- **Dependencies:** TASK-111
- **Acceptance Criteria:** فیلتر سال، مشتری، تاریخ شمسی و وضعیت دریافت؛ نمایش جمع کل، مانده، صفحه‌بندی و پیوند سند.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون مرورگر در دیتابیس ایزوله شامل نمایش، فیلتر دریافت جزئی، تاریخ شمسی و عرض موبایل موفق بود.
- **Status:** DONE

### TASK-114 — بک‌اند تعداد فاکتور و فروش داشبورد

- **Dependencies:** TASK-080، TASK-111
- **Acceptance Criteria:** تعداد فاکتور و مبلغ فروش سالانه و ماهانه شمسی از فاکتورهای معتبر سازمان با همان تعریف گزارش فروش محاسبه شوند.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس ایزوله شامل تطبیق جمع ماهانه و گزارش فروش، فاکتور ابطال‌شده، پرداخت سال بعد، داده خالی، مجوز و تفکیک سازمان موفق بود.
- **Status:** DONE
- **Notes:** API بر مبنای تاریخ حسابداری پایان سال است؛ رابط در TASK-117 تکمیل شده است.

### TASK-117 — رابط تعداد فاکتور و نمودار فروش

- **Dependencies:** TASK-114
- **Acceptance Criteria:** تعداد و مبلغ فروش فاکتورهای سال انتخاب‌شده و نمودار ماهانه شمسی با وضعیت بارگذاری، خطا و داده خالی نمایش داده شوند.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون مرورگر در دیتابیس ایزوله شامل تطبیق مبلغ، تعداد، پیوند گزارش و عرض موبایل موفق بود.
- **Status:** DONE
- **Notes:** فروش شامل مالیات و پس از تخفیف است و به معنی وصول وجه نیست؛ مبنای اعتبار فاکتور پایان سال مالی است.

### TASK-095 — بک‌اند شاخص‌های مطالبات، بدهی و حساب‌های نقدی

- **Dependencies:** TASK-122، TASK-083، TASK-085
- **Acceptance Criteria:** مانده حساب‌های اختصاصی اشخاص و حساب‌های نقدی انتخاب‌شده تنها از اسناد نهایی و بدون دوباره‌شماری محاسبه شود؛ جهت مخالف مانده و انتخاب‌نشدن حساب نقدی مشخص باشند.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس مجزا شامل مجوز و سازمان، مبلغ بزرگ، مانده خلاف جهت، سند پیش‌نویس، انتخاب تکراری و نامعتبر و مانده پیش از اختتامیه و پس از افتتاحیه موفق بود.
- **Status:** DONE
- **Notes:** حساب نقدی حدس زده یا ذخیره نمی‌شود و باید در درخواست انتخاب شود؛ مبنا گردش سال مالی با افتتاحیه ثبت‌شده و بدون سند اختتامیه دائمی است. رابط در TASK-096 تکمیل شده است.

### TASK-096 — رابط شاخص‌های مالی تکمیلی

- **Dependencies:** TASK-095
- **Acceptance Criteria:** نمایش مانده دریافتنی، پرداختنی، جهت مخالف و مانده حساب‌های نقدی انتخاب‌شده، همراه با محدودیت افتتاحیه و واحد ریال.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون مرورگر در دیتابیس ایزوله شامل حالت انتخاب‌نشده، انتخاب حساب، تطبیق مانده و عرض موبایل موفق بود.
- **Status:** DONE
- **Notes:** انتخاب حساب نقدی صریح و موقت است و پس از ترک صفحه ذخیره نمی‌شود؛ حساب غیرفعال برای گزارش تاریخی قابل انتخاب و مشخص است.

### TASK-109 — نسخه چاپی فاکتور

- **Dependencies:** TASK-080
- **Acceptance Criteria:** نمایش فارسی و راست‌چین فاکتور، اقلام و جمع‌ها با وضعیت مشخص و امکان چاپ مرورگر؛ دسترسی محدود به سازمان.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس ایزوله و مرورگر شامل پیش‌نویس، صادرشده، باطل‌شده، دسترسی سازمان دیگر، پنهان‌شدن منو در چاپ و تولید خروجی چاپ مرورگر موفق بود.
- **Status:** DONE
- **Notes:** نام کالا و مشتری از اطلاعات ذخیره‌شده فاکتور و نام فروشنده از نام فعلی سازمان است. اطلاعات مالیاتی و نشانی فروشنده در مدل فعلی وجود ندارد؛ خروجی PDF در TASK-110 تکمیل شده است.

### TASK-110 — خروجی PDF فارسی فاکتور

- **Dependencies:** TASK-109
- **Acceptance Criteria:** فایل PDF با اطلاعات، تاریخ شمسی و مبالغ فاکتور و فونت فارسی و کنترل دسترسی سازمان ساخته و از رابط قابل دانلود باشد.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون محتوای سند شامل تاریخ، مبلغ، وضعیت و متن‌های دارای کاراکتر خاص و آزمون دیتابیس ایزوله و مرورگر شامل دانلود PDF، وجود فونت جاسازی‌شده و دسترسی نامجاز موفق بود.
- **Status:** DONE
- **Notes:** Chrome یا Edge روی میزبان Next.js لازم است؛ مسیر اختیاری `HESABA_PDF_BROWSER` در README آمده است. در آزمون ایزوله مرورگر با تنظیم اختصاصی آزمون اجرا شد. نام فروشنده از نام فعلی سازمان است و نشانی و شناسه مالیاتی فروشنده در مدل فعلی موجود نیستند.

### TASK-092 — بک‌اند خروجی CSV گزارش‌ها

- **Dependencies:** TASK-045، TASK-047، TASK-049
- **Status:** DONE
- **Notes:** مسیرهای `GET /api/reports/trial-balance/csv`، `GET /api/reports/general-ledger/csv` و `GET /api/reports/profit-loss/csv` از پارامترها، محاسبات و دسترسی گزارش اصلی استفاده می‌کنند. خروجی UTF-8 با BOM، تاریخ شمسی دفتر کل، اعداد دقیق و محافظت متن در برابر فرمول صفحه‌گسترده دارد. دکمه‌های رابط در TASK-138 هستند. برنامه‌های صفحه‌گسترده ممکن است اعداد بزرگ یا کدهای دارای صفر ابتدایی را هنگام باز کردن خودکار تغییر دهند؛ برای حفظ آنها ستون‌ها را به صورت متن وارد کنید.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس ایزوله شامل کنترل دسترسی، مقادیر، BOM و محافظت فرمول موفق بود.

### TASK-138 — رابط دانلود CSV گزارش‌ها

- **Dependencies:** TASK-092
- **Status:** DONE
- **Notes:** پس از نمایش هر یک از گزارش‌های تراز آزمایشی، دفتر کل و سود و زیان، دکمه دانلود با سال مالی و حساب انتخاب‌شده در دسترس است. فایل با داده‌های لحظه دانلود ساخته می‌شود و خطای سرویس نمایش داده می‌شود. تراز آزمایشی فعلاً بر مبنای همه اسناد نهایی است.
- **Testing:** ساخت پروژه، ESLint و آزمون مرورگر با دیتابیس ایزوله شامل دانلود سه گزارش، فیلترها و نمایش خطای سرویس موفق بود.

### TASK-093 — بک‌اند بازه زمانی داشبورد

- **Dependencies:** TASK-051، TASK-053
- **Status:** DONE
- **Notes:** مسیرهای `GET /api/dashboard/summary` و `GET /api/dashboard/monthly` پارامترهای اختیاری `from` و `to` را به صورت جفت و با فرمت میلادی `YYYY-MM-DD` می‌پذیرند؛ رابط آینده تاریخ شمسی را تبدیل می‌کند. هر دو مرز در بازه لحاظ می‌شوند و باید در سال مالی انتخابی باشند؛ بدون پارامتر کل سال استفاده می‌شود. خلاصه، تعداد و آخرین اسناد و نمودار ماهانه مطابق همان بازه هستند. خروجی شامل `range` است. آمار فروش و مانده‌ها همچنان مستقل و بر مبنای سال مالی محاسبه می‌شوند؛ رابط باید این تفاوت را روشن نشان دهد.
- **Testing:** ساخت پروژه، TypeScript و ESLint؛ آزمون‌های دیتابیس ایزوله با بازه یک‌روزه، مرز نوروز، محدوده خالی، تاریخ نامعتبر و خارج از سال، پارامتر تکراری و سازگاری رفتار قبلی موفق بود.

### TASK-094 — رابط فیلتر بازه داشبورد

- **Dependencies:** TASK-093
- **Status:** DONE
- **Notes:** انتخاب بازه شمسی در محدوده سال مالی، اعمال و بازگشت به کل سال، نمایش بازه اعمال‌شده و خطای ورودی پشتیبانی می‌شود. بازه به خلاصه عملکرد، وضعیت و آخرین اسناد و نمودار ماهانه اعمال می‌شود؛ فروش و مانده‌ها بر اساس کل سال باقی می‌مانند و این موضوع در رابط توضیح داده شده است. با تغییر سال، بازه به سال جدید برمی‌گردد.
- **Testing:** ساخت پروژه، TypeScript و ESLint و آزمون مرورگر با دیتابیس ایزوله شامل انتخاب تاریخ، ارسال بازه به هر دو API، نمایش محدوده و بازنشانی موفق بود.

### TASK-113 — بک‌اند فیلتر و جزئیات اسناد

- **Dependencies:** TASK-035
- **Status:** DONE
- **Notes:** `GET /api/journal-entries` فیلتر اختیاری سال مالی، وضعیت، تاریخ‌های فراگیر `from` و `to` با فرمت `YYYY-MM-DD` و `q` برای شرح یا شماره دقیق سند دارد. صفحه‌بندی با `page` و `pageSize` اختیاری است؛ بدون آنها رفتار فهرست قبلی حفظ می‌شود. `GET /api/journal-entries/{id}` مشخصات سند، سال، ردیف‌ها و حساب‌های فعلی، ارتباطات سند و جمع دقیق بدهکار و بستانکار را با کنترل سازمان برمی‌گرداند. جزئیات در رابط طی TASK-116 اضافه می‌شود.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس ایزوله شامل فیلترها، صفحه‌بندی، مبالغ ۲۰ رقمی، داده نامعتبر و جداسازی سازمان موفق بود.

### TASK-116 — رابط فیلتر و جزئیات اسناد

- **Dependencies:** TASK-113
- **Status:** DONE
- **Notes:** صفحه اسناد فیلتر سال مالی، وضعیت، تاریخ شمسی و جست‌وجوی شرح یا شماره و صفحه‌بندی ۱۵تایی دارد. جزئیات ردیف‌ها و جمع بدهکار و بستانکار در هر سند نمایش داده می‌شود؛ عملیات پیش‌نویس و برگشت حفظ شده و پیوند مستقیم حتی برای سند خارج از صفحه یا فیلتر جاری باز می‌شود.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون مرورگر با دیتابیس ایزوله شامل تاریخ و وضعیت، جست‌وجوی بدون نتیجه، بازنشانی، پیوند مستقیم و جریان برگشت سند موفق بود.

### TASK-123 — API ویرایش پیش‌نویس درآمد و هزینه

- **Dependencies:** TASK-070
- **Status:** DONE
- **Notes:** مسیر `PATCH /api/transactions/{id}` مشخصات کامل پیش‌نویس را با همان قواعد ساخت اعتبارسنجی می‌کند. سال مالی پیش‌نویس قابل تغییر نیست؛ فقط عضو مجاز همان سازمان در سال باز می‌تواند ویرایش کند. قفل سال، رویداد و حساب‌ها و تراکنش سریال از تداخل با ثبت نهایی محافظت می‌کند؛ رویداد نهایی قابل ویرایش نیست.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس ایزوله برای نقش‌ها، سازمان، سال بسته، تاریخ و حساب نامعتبر، مبلغ، رویداد نهایی و رقابت ویرایش با ثبت نهایی موفق بود.

### TASK-124 — رابط ویرایش پیش‌نویس درآمد و هزینه

- **Dependencies:** TASK-123
- **Status:** DONE
- **Notes:** فرم ویرایش برای کاربران مجاز در پیش‌نویس سال باز نمایش داده می‌شود و مقادیر فعلی، تاریخ شمسی، اعتبارسنجی، لغو و نمایش خطای سرور را پشتیبانی می‌کند. سال مالی تغییر نمی‌کند و حساب نامعتبر قبلی باید جایگزین شود.
- **Testing:** ساخت پروژه، TypeScript و ESLint و آزمون مرورگر با دیتابیس ایزوله شامل بارگذاری فرم، ذخیره واقعی و نمایش پاسخ خطای شبیه‌سازی‌شده ثبت نهایی موفق بود؛ رقابت واقعی در TASK-123 آزموده شد.

### TASK-125 — API فهرست درآمد و هزینه ثبت‌شده

- **Dependencies:** TASK-072
- **Status:** DONE
- **Notes:** مسیر `GET /api/transactions/posted` فقط رویدادهای نهایی سازمان عضو را با فیلتر اختیاری سال مالی، نوع و شرح و صفحه‌بندی برمی‌گرداند. هر ردیف شامل اطلاعات حساب‌ها و شناسه، شماره و وضعیت سند متصل است. نقش مشاهده‌گر دسترسی خواندن دارد. سازمان فعلی تا تکمیل انتخاب سازمان فعال طبق رویه موجود اولین عضویت کاربر است؛ نام حساب‌ها اطلاعات فعلی حساب‌اند.
- **Testing:** ساخت پروژه، TypeScript، ESLint و آزمون دیتابیس ایزوله شامل نقش مشاهده‌گر، سازمان‌های جداگانه دارای رویداد نهایی، فیلتر، صفحه‌بندی، داده نامعتبر و سند مرتبط موفق بود.

### TASK-126 — رابط فهرست درآمد و هزینه ثبت‌شده

- **Dependencies:** TASK-125
- **Status:** DONE
- **Notes:** در صفحه درآمد و هزینه، فهرست مستقل رویدادهای نهایی با فیلتر سال، نوع و شرح، صفحه‌بندی و پیوند سند نمایش داده می‌شود. با تغییر پیش‌نویس‌ها فهرست به‌روزرسانی می‌شود و نقش مشاهده‌گر هم می‌تواند آن را بخواند.
- **Testing:** ساخت پروژه و ESLint و آزمون مرورگر برای حالت خالی واقعی، و نمایش ردیف، فیلتر، پیوند و خطای شبیه‌سازی‌شده موفق بود؛ فهرست واقعی، نقش‌ها و صفحه‌بندی API در TASK-125 با دیتابیس ایزوله آزموده شد.

### TASK-127 — طراحی انتخاب سازمان فعال

- **Dependencies:** TASK-019
- **Status:** DONE
- **Notes:** [طرح انتخاب سازمان فعال](./ACTIVE_ORGANIZATION_DESIGN.md) منبع انتخاب در نشست، بررسی عضویت، نقش، مراحل فعال‌سازی، محافظ تراکنشی، تب‌های هم‌زمان و بازیابی درخواست‌های مالی را مشخص می‌کند. این قابلیت هنوز پیاده یا فعال نشده است.
- **Testing:** بازبینی مسیرهای فعلی عضویت، مدل نشست، onboarding و ذخیره بازیابی دریافت و پرداخت و ثبت سناریوهای آزمون انجام شد؛ صحت پروتکل قفل در پیاده‌سازی و آزمون‌های بعدی باید اثبات شود.

### TASK-128 — زیرساخت آزمایشی انتخاب سازمان فعال

- **Dependencies:** TASK-127
- **Status:** DONE
- **Notes:** فیلد اختیاری نشست، migration، resolver و API آزمایشی `GET/POST /api/organizations/active` اضافه شد. مسیر صرفاً با تنظیم تست اختصاصی و نام دیتابیس موقت مطابق الگو قابل دسترس است؛ اجرای عادی و مسیرهای قدیمی سازمانی تغییر نکرده‌اند. migration افزایشی بر دیتابیس محلی پروژه اعمال شد. محافظ عملیات مالی، انتقال APIها و صفحات و رابط همچنان در مراحل بعدی لازم‌اند.
- **Testing:** ساخت پروژه، TypeScript، ESLint، migration در دیتابیس ایزوله و محلی، آزمون نشست‌های مستقل، عضویت تکی و چندگانه، نقش، لغو عضویت، درخواست غیرمجاز و انتخاب هم‌زمان؛ آزمون مسیر غیرفعال و رگرسیون API فاکتور موفق بود.

## کارهای آینده پیشنهادی

همه موارد زیر **TODO** هستند؛ فایل‌ها مسیرهای احتمالی‌اند و پس از بررسی پیش از اجرا نهایی می‌شوند. هر ردیف یک تسک مستقل است و پس از دستور کاربر آغاز می‌شود. موارد طراحی و آزمون ممکن است به تسک‌های کوچک‌تر تقسیم شوند.

| شناسه | عنوان و شرح | وابستگی | فایل‌های احتمالی | معیار پذیرش | آزمون |
|---|---|---|---|---|---|
| TASK-097 | پروفایل و تغییر رمز | TASK-010 | `app/(app)/dashboard/`، `lib/auth.ts` | ویرایش پروفایل و تغییر رمز با کنترل هویت | تست نشست و رمز نامعتبر |
| TASK-098 | اتصال محلی Ollama و وضعیت سرویس | TASK-010 | `lib/`، `app/api/` | مهلت و خطای سرویس محلی مدیریت شود | تست سرویس در دسترس و قطع |
| TASK-099 | ابزار خواندنی AI | TASK-098، TASK-051 | `lib/`، `app/api/` | فقط داده مجاز سازمان از سرویس معتبر خوانده شود | تست مجوز و داده نامعتبر |
| TASK-100 | ابزار پیش‌نویس AI | TASK-099، TASK-070، TASK-076 | `lib/`، `app/api/` | خروجی مدل اعتبارسنجی و تنها پیش‌نویس آماده کند | تست خروجی نامعتبر و عدم ثبت ناخواسته |
| TASK-101 | رابط گفتگو و تأیید AI | TASK-100 | `app/(app)/dashboard/` | پیش‌نمایش و تأیید کاربر پیش از اقدام نوشتنی | تست تعاملی و انصراف |
| TASK-102 | تست هم‌زمانی عملیات مالی | TASK-040، TASK-080، TASK-083 | `tests/` | تداخل بستن سال، صدور و پرداخت به نتایج معتبر برسد | تست چند درخواست هم‌زمان |
| TASK-103 | بازبینی رابط و دسترس‌پذیری | TASK-065، TASK-081، TASK-101، TASK-106، TASK-108، TASK-112، TASK-116، TASK-117، TASK-124، TASK-126، TASK-131، TASK-136 | `app/` | RTL، موبایل، صفحه‌کلید و پیام‌های خطا بازبینی شوند | مرورگر و صفحه‌کلید |
| TASK-104 | سناریوی دمو و راهنمای نهایی | TASK-088، TASK-101، TASK-102، TASK-103، TASK-110، TASK-115 | `docs/`، `README.md` | سناریوی ثبت تا گزارش و راه‌اندازی تکرارپذیر باشد | اجرای سرتاسری |
| TASK-115 | آزمون مدل محلی و انتخاب نسخه مناسب | TASK-098 | `docs/AI_DESIGN.md`، `tests/` | فارسی، سرعت و پشتیبانی ابزار مدل روی سیستم هدف بررسی شود | سناریوهای فارسی و اندازه‌گیری |
| TASK-129 | اعمال سازمان فعال در APIها — انتقال آزمایشی مسیرها انجام شده؛ ممیزی جامع و هم‌زمانی خواندن و لغو عضویت باقی است | TASK-128 | `app/api/`، `lib/` | همه مسیرهای سازمانی بررسی و به کنترل مشترک و امن سازمان فعال منتقل شوند | تست جداسازی سازمان در مسیرهای موجود |
| TASK-130 | اعمال سازمان فعال در صفحات سروری | TASK-128 | `app/(app)/`، `lib/` | همه خواندن‌های سروری سازمانی با انتخاب و مجوز معتبر سازگار شوند | تست تغییر سازمان و جلوگیری از نمایش داده دیگر سازمان‌ها |
| TASK-131 | رابط انتخاب سازمان فعال | TASK-129، TASK-130 | `app/(app)/` | کاربر چندعضوی بتواند سازمان مجاز را انتخاب کند و داده‌ها با سازمان انتخابی هماهنگ شوند | تست مرورگر، تغییر عضویت و حالت بدون سازمان |
| TASK-132 | طراحی مدیریت اعضا و نقش‌ها | TASK-127 | `docs/PRD.md`، `docs/ARCHITECTURE.md` | افزودن، تغییر نقش و حذف دسترسی، نحوه شناسایی کاربر، مجوزها و حفظ دست‌کم یک مدیر مشخص شوند | بازبینی امنیت و سناریوهای خطا |
| TASK-133 | API فهرست و افزودن اعضا | TASK-128، TASK-132 | `app/api/`، `lib/` | فقط مدیر سازمان مجاز اعضا را مشاهده و طبق طراحی اضافه کند؛ عضویت تکراری و بین‌سازمانی رد شود | تست نقش‌ها و عضویت تکراری |
| TASK-134 | API تغییر نقش اعضا | TASK-133 | `app/api/`، `lib/` | تغییر نقش مجاز و اتمی باشد و آخرین مدیر سازمان حفظ شود | تست نقش‌ها و رقابت تغییر مدیر |
| TASK-135 | API حذف دسترسی اعضا | TASK-134 | `app/api/`، `lib/` | حذف عضویت مجاز باشد، آخرین مدیر حفظ و دسترسی عضو حذف‌شده بی‌درنگ بررسی شود | تست دسترسی پس از حذف و هم‌زمانی |
| TASK-136 | رابط مدیریت اعضا و نقش‌ها | TASK-133، TASK-134، TASK-135 | `app/(app)/dashboard/` | مدیر بتواند اعضا را مشاهده و طبق مجوز اضافه، ویرایش یا حذف کند | تست مرورگر، مجوزها و خطاها |
| TASK-137 | بررسی محدوده فاکتور خرید و تخصیص پرداخت | TASK-085 | `docs/PRD.md`، `docs/ROADMAP.md` | نیاز، محدوده MVP یا آینده، قواعد مالی و تسک‌های احتمالی خرید مشخص شوند | بازبینی نیاز و قواعد حسابداری |

## TASK-015

- **Title:** استفاده از فونت‌های محلی در رابط کاربر
- **Description:** پیکربندی و اعمال خانواده‌های فونت ارسالی کاربر به‌شکل بهینه و محلی در Next.js.
- **Files:** `app/fonts.ts`، `app/layout.tsx`، `app/globals.css`، `app/(auth)/sign-up/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-013
- **Acceptance Criteria:** رابط فارسی از IRANYekanXFaNum برای متن‌ها و Modam برای عنوان‌ها استفاده کند؛ درخواست شبکه‌ای برای فونت خارجی وجود نداشته باشد.
- **Testing:** TypeScript type check، lint و production build.
- **Status:** DONE

### نتیجه

- فونت‌های محلی IRANYekanXFaNum و Modam با `next/font/local` پیکربندی شدند.
- فونت متن و عنوان به‌ترتیب در کل رابط و عنوان صفحهٔ ثبت‌نام اعمال شدند.
- وابستگی Google Fonts از Root Layout حذف شد.
- اعمال فونت با selector صریح برای متن، کنترل‌های فرم و عنوان مقاوم‌سازی شد.

## TASK-016

- **Title:** هدایت صفحهٔ نخست به ثبت‌نام
- **Description:** حذف صفحهٔ پیش‌فرض Next.js و هدایت بازدیدکنندهٔ ریشهٔ برنامه به صفحهٔ ثبت‌نام.
- **Files:** `app/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-013
- **Acceptance Criteria:** درخواست `GET /` با وضعیت redirect به `/sign-up` پاسخ داده شود.
- **Testing:** بررسی پاسخ HTTP مسیر ریشه و TypeScript type check.
- **Status:** DONE

### نتیجه

- صفحهٔ پیش‌فرض قالب حذف و مسیر `/` به `/sign-up` هدایت شد تا فرم ثبت‌نام در نخستین بازدید نمایش داده شود.
