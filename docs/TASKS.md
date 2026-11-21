# وضعیت تسک‌های پروژه

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
