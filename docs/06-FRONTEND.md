# 06 · دليل الواجهة (Frontend)

> `Frontend/vestora` — Next.js 16 · App Router · React 19 · TypeScript · Tailwind v4.
> **الشرح بالعربي، وأسماء الملفات والمكوّنات بالإنجليزي زي ما هي في الكود.**

---

## 1. الحزم المستخدمة

| الحزمة | الاستخدام |
|---|---|
| `next@16.2.10` · `react@19.2.4` | الأساس — **App Router فقط** |
| `@tanstack/react-query@5` | كل حالة قادمة من السيرفر |
| `zustand@5` | حالة الجلسة (auth) فقط |
| `@base-ui/react` + `shadcn@4` | مكوّنات الـ UI الأساسية (22 primitive في `components/ui`) |
| `framer-motion@12` | الحركة العامة + `MotionConfig` على الجذر |
| `gsap@3` | ScrollTrigger في صفحات الـ showpiece |
| `lenis@1` | تنعيم التمرير |
| `react-hook-form@7` + `zod@4` + `@hookform/resolvers` | كل الفورمات |
| `recharts@3` | الرسوم البيانية في اللوحات |
| `@microsoft/signalr@10` | الشات والإشعارات اللحظية |
| `sonner@2` | التوستات (بستايل مخصّص بالكامل) |
| `next-themes@0.4` | فاتح/داكن |
| `lucide-react` | الأيقونات |
| `tailwindcss@4` + `tw-animate-css` + `tailwind-merge` + `clsx` + `cva` | التنسيق |

> ⚠️ `AGENTS.md` جوّه المشروع بيحذّر: **ده مش Next.js اللي انت عارفه** — فيه breaking changes عن الإصدارات اللي في بيانات التدريب. راجع `node_modules/next/dist/docs/` قبل ما تكتب كود يعتمد على API معيّن.

---

## 2. خريطة المسارات (55 صفحة)

### عامّة (بدون تسجيل دخول)

| المسار | الملف | الوظيفة |
|---|---|---|
| `/` | `app/page.tsx` | الصفحة الرئيسية — hero سينمائي بفيديو، إحصائيات، مشاريع مختارة، شهادات |
| `/projects` | `app/projects/page.tsx` | **اكتشاف المشاريع** — بحث وفلاتر وترتيب، والحالة في الـ URL |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | تفاصيل المشروع: القصة، الفريق، الخريطة، المستندات، التقييمات، التعليقات |
| `/u/[id]` | `app/u/[id]/page.tsx` | الملف العام لأي مستخدم |
| `/about` · `/how-it-works` · `/help` | | صفحات تعريفية |
| `/legal` · `/legal/[slug]` · `/terms` | | المستندات القانونية (المحتوى في `lib/legal/documents.ts`) |
| `/login` · `/register` | | المصادقة |
| `/verify-email` · `/forgot-password` · `/reset-password` | | دورة الحساب |
| `/goodbye` | | بعد حذف الحساب |
| `/no-access` | | الدور غير مسموح |
| `/maintenance` | | صيانة |
| `/payments/return` | | العودة من بوّابة الدفع → بيشغّل `verify` على السيرفر |
| `/payments/sandbox-checkout` | | **صفحة الدفع الوهمية** لمزوّد المحاكاة |

### محمية — `app/(app)/` (كلها ورا `RequireAuth` + `SiteHeader`)

**المستثمر — `/invest`** (`invest/layout.tsx` فيه `InvestSidebar`)

| المسار | الوظيفة |
|---|---|
| `/invest` | اللوحة: KPIs، توزيع المحفظة، النشاط |
| `/invest/portfolio` | الاستثمارات المدعومة |
| `/invest/pipeline` | مراحل العلاقات |
| `/invest/watchlist` | المحفوظات |
| `/invest/payments` · `/invest/payments/[id]` | سجلّ الدفعات + إيصال معاملة |
| `/invest/activity` | النشاط |

**المؤسّس — `/dashboard`** (`dashboard/layout.tsx` فيه `DashboardSidebar`)

| المسار | الوظيفة |
|---|---|
| `/dashboard` | اللوحة: KPIs، التمويل عبر الوقت، أفضل المشاريع |
| `/dashboard/ventures` | مشاريعي + إغلاق الجولة |
| `/dashboard/requests` | **طلبات الدعم** — موافقة/رفض + تحريك المراحل |
| `/dashboard/funding` | سُلَّم التمويل + إنشاء funding requests |
| `/dashboard/analytics` | تحليلات المشروع |
| `/dashboard/activity` | النشاط |
| `/my-projects` · `/my-projects/new` · `/my-projects/[id]/edit` | إنشاء وتعديل المشاريع |
| `/investors` | **دليل رأس المال** — المستثمرون المدرَجون + طلب تواصل |

**الأدمن — `/admin`** (`admin/layout.tsx` فيه `AdminSidebar`)

| المسار | الوظيفة |
|---|---|
| `/admin` | مؤشرات المنصّة |
| `/admin/review` | طابور مراجعة الإعلانات |
| `/admin/reports` | البلاغات |
| `/admin/users` | المستخدمون — تعليق/استعادة/حذف |
| `/admin/ventures` | كل المشاريع |
| `/admin/revenue` | إيرادات المنصّة + المعاملات + refund |
| `/admin/audit` | سجلّ الإجراءات الإدارية |
| `/admin/security` | الأحداث الأمنية |
| `/admin/activity` | الـ feed العام |

**مشترَك بين الأدوار**

| المسار | الوظيفة |
|---|---|
| `/deals/[id]` | **غرفة الصفقة** — الجدول الزمني، الأسئلة، طلبات المستندات، حالة التمويل |
| `/messages` | المراسلة (بريميوم — حضور، كتابة، إيصالات قراءة لحظية) |
| `/notifications` | الإشعارات في 3 مسارات (needsYou / outcome / activity) |
| `/saved` · `/searches` | المحفوظات + عمليات البحث المحفوظة |
| `/portfolio` | عرض المحفظة |
| `/settings/profile` · `/settings/account` | الإعدادات |
| `/onboarding` | مرّة واحدة بعد أول دخول (محفوظ في `localStorage`) |

### ملفات النظام

`app/layout.tsx` (الجذر) · `error.tsx` · `global-error.tsx` · `not-found.tsx` · `icon.svg` · `apple-icon.tsx` · `opengraph-image.tsx`.

---

## 3. المكوّنات (147 ملف)

```
components/
├── ui/           (22)  ← الـ primitives: button · input · dialog · select · tabs · form · …
├── landing/      (11)  ← الصفحة الرئيسية: hero · stats · about · why · how · testimonials · nav ·
│                          card-ground · section-heading · section-surface
├── browse/       (11)  ← تجربة الاكتشاف: masthead · discovery-bar · facet-menu · venture-card ·
│                          venture-spotlight · commitment-rail · signal-mark · states
├── projects/     (25)  ← تفاصيل المشروع: gallery · updates · milestones · team · documents ·
│                          reviews · comments · support-modal/panel · close-round-dialog · form ·
│                          backers-list · bookmark · share · report · video-modal · next-ventures
├── dashboard/    (10)  ← لوحة المؤسّس: kpi-cards · charts · panels · widgets · interest-funnel
├── invest/        (2)  ← لوحة المستثمر: sidebar + invest-primitives
├── deals/         (4)  ← غرفة الصفقة: room · timeline · questions · documents
├── funding/       (4)  ← التمويل: deal-funding-panel · founder-funding-ladder ·
│                          request-funds-dialog · funding-primitives
├── messages/      (7)  ← الشات: realtime · inbox · thread · composer · launcher
├── capital/       (5)  ← دليل المستثمرين: masthead · rail · register · plate · approach-dialog
├── profile/       (8)  ← الملف الشخصي: hero · menu · follow · mandate · ventures · memberships
├── admin/         (1)  · settings/ (3) · signals/ (2) · notifications/ (2) · portfolio/ (2)
├── auth/          (6)  ← الفورمات + require-auth + guilloche + password-requirements
├── motion/        (9)  ← reveal · tilt · magnetic · cursor · depth-scene · masked-lines ·
│                          animated-number · brand-loader · lazy-video
├── brand/         (3)  ← logo · channel-marks · social-icons
├── how/ · legal/ · system/                (1 لكل واحد)
└── providers.tsx · site-header.tsx · header-nav.tsx · mobile-nav.tsx · footer.tsx ·
    theme-toggle.tsx · language-toggle.tsx
```

**قواعد التقسيم:** المجلّد = المجال (domain)، مش نوع المكوّن. `ui/` وحده هو اللي فيه primitives محايدة عن المجال.

---

## 4. طبقة البيانات

### التدفّق

```
Component → lib/hooks/use-*.ts (TanStack Query) → lib/api/*.ts → lib/api/client.ts → Backend
```

### `lib/api/client.ts` — نقطة العبور الوحيدة

- بيقرا `NEXT_PUBLIC_API_URL` (الافتراضي `http://localhost:5078`).
- بيحطّ `Authorization: Bearer` تلقائيًا (إلا لو `auth: false`).
- بيتعامل مع `FormData` تلقائيًا (مش بيحطّ `Content-Type`).
- **عند 401:** بيعمل refresh مرّة واحدة ويعيد المحاولة. الـ refresh **single-flight** — كل الـ 401 المتزامنة بتشارك طلب واحد.
- بيوحّد الأخطاء في `ApiError { status, message, payload }` — بيقرا `message` أو أول خطأ من `errors` أو `title`.
- بيرجّع `undefined` على 204 أو body فاضي.

> **ممنوع `fetch` مباشر في أي component.** كله عبر `lib/api/*`.

### `lib/hooks/` (9 hooks)

`use-admin` · `use-bookmarks` · `use-chat` · `use-dashboard` · `use-follows` · `use-investor-dashboard` · `use-notifications` · `use-payment-config` · `use-debounced-value`.

إعدادات `QueryClient` الافتراضية: `staleTime: 30s` · `retry: 1` · `refetchOnWindowFocus: false` · الـ mutations بدون إعادة محاولة.

### `lib/types/api.ts` (1318 سطر)

عقد الأنواع الكامل — مطابق للـ DTOs في الـ backend. **أي تغيير في DTO لازم يتبعه تحديث هنا.** بيغطّي: المصادقة، المشاريع، المدفوعات، الصفقات، اللوحات، الإدارة، الإشارات، التقييمات.

---

## 5. المصادقة على العميل

```
lib/auth/store.ts    ← zustand: { accessToken, user, status }
lib/auth/tokens.ts   ← الـ refreshToken في localStorage تحت "vestora.refreshToken"
```

- **الـ accessToken في الذاكرة بس** — بيروح مع الـ refresh للصفحة، وبيترجع من الـ bootstrap.
- `status`: `idle` → `loading` → `authenticated` \| `unauthenticated`.
- **الإقلاع** (`useSessionBootstrap` في `providers.tsx`): لو فيه refresh token، بينده endpoint محمي (`authApi.me()`) والـ 401 interceptor بيعمل الباقي.
- `authStore` بيوفّر accessors من غير hooks عشان الـ client يقدر يستخدمها برّه React.

### الحماية

```tsx
<RequireAuth>                          {/* أي مستخدم مسجّل */}
<RequireAuth roles={["Innovator"]}>    {/* دور محدّد */}
```

- `idle`/`loading` → `<BrandLoader />`
- `unauthenticated` → `/login`
- دور غير مسموح → `/no-access`

> ⚠️ دي حماية **على العميل** — الصفحة بتتحمّل الأول وبعدين بتوجّه. الحماية الحقيقية في الـ backend. السبب: التوكن في الذاكرة مش في cookie، فالسيرفر مش شايفه وقت الـ SSR.

### التنقّل حسب الدور — `lib/nav/role-nav.ts`

مصدر واحد بيستخدمه الهيدر والقائمة الجوّالة وقائمة الأفاتار:

| الدور | `homeFor()` | الروابط |
|---|---|---|
| Investor | `/invest` | Browse · Dashboard · Portfolio · Watchlist |
| Innovator | `/dashboard` | Browse · Dashboard · My ventures · **Find capital** · Saved |
| Admin | `/admin` | Browse · Admin |
| بدون حساب | `/projects` | Browse |

> السبب: دور مينفعش يتعرض عليه رابط في مكان ويتمنع منه في مكان تاني، وحد ميتبعتش لصفحة هتقوله "الدور ده مش مسموح".

---

## 6. نظام التصميم

**المصدر:** `Vestora-Brand-Sheet.html` → متحوّل لـ tokens في `app/globals.css`.
**الشخصية:** quiet luxury / private banking. الذهبي = الفعل الأساسي والخط الشعري فقط؛ البرونزي = الأرقام والتفاصيل.

### الألوان

| Token | فاتح (parchment) | داكن (deep espresso) |
|---|---|---|
| `--background` | `#f6f2e7` | `#0a0908` |
| `--foreground` | `#241c14` | `#f0eae0` |
| `--card` | `#fcfaf3` | `#141210` |
| `--primary` (ذهبي) | `#b08a3f` | `#c7a968` |
| `--bronze` | `#8b4f2a` | `#c88254` |
| `--muted-foreground` | `#71614c` | `#a89c89` |
| `--destructive` | `#a5402c` | `#e0705e` |
| `--border` / `--input` | `#e3d9c4` | `#241f1a` |

`--chart-1..5` و `--sidebar-*` مشتقّة من نفس اللوحة. `--radius: 0.5rem` مع مقاييس مشتقّة (`sm` 0.6× … `4xl` 2.6×).

### الخطوط

| الدور | لاتيني | عربي |
|---|---|---|
| العناوين (`--font-heading`) | **Cinzel** | **Aref Ruqaa** |
| النصّ (`--font-sans`) | **Karla** | **Cairo** |
| الأرقام (`--font-numeric`) | **Spectral** + `tabular-nums` | نفسه |

التبديل تلقائي عبر `[lang="ar"]` في CSS. **كل رقم مالي لازم يلبس `.font-numeric`** عشان الأعمدة تتحاذى.

### فئات مساعدة (utility classes)

| الفئة | الوصف |
|---|---|
| `.gold-cta` | الزر الذهبي: ضوء بيمسح عبره + ارتفاع على منحنى سينمائي |
| `.link-underline` | خط ذهبي شعري بيمتدّ من الحافة الأمامية (بيقلب في RTL) |
| `.liquid-glass` | سطح شبه شفّاف بحافة ذهبية بتلقط الضوء |
| `.film-grain` · `.noise-overlay` | حبيبات فيلم / ضوضاء ناعمة |
| `.skeleton-shimmer` | هيكل تحميل بضوء ذهبي بدل النبض الرمادي |
| `.animate-marquee-left/right` | أشرطة متحرّكة سلسة |
| `.cursor-showpiece` | بيخفي المؤشّر الأصلي على سطح المكتب لصالح الحلقة الذهبية |
| `.vt-toast*` | التوستات — حافة ذهبية واحدة بدل تلوين السطح كله (`richColors` مقفول عمدًا) |

---

## 7. الحركة (Motion)

### تقليل الحركة — الطبقتين

1. **`<MotionConfig reducedMotion="user">`** في `providers.tsx` — بيخلّي Framer Motion يقرا تفضيل النظام ويسقط كل حركات الـ transform، ويسيب الـ opacity شغّالة. **متطبَّق مرّة واحدة للتطبيق كله** لأن opt-in لكل مكوّن قاعدة بتتآكل: مكوّن جديد واحد اتكتب من غير الـ hook بيرجّع المشكلة بصمت.
2. **`@media (prefers-reduced-motion: reduce)`** في `globals.css` — بيغطّي كل اللي Framer مبيشوفهوش: CSS transitions، الـ keyframes المسمّاة، الـ view transitions، والتمرير.

> المدد بتنزل لـ **1ms** مش 0، عشان `transitionend`/`animationend` يفضلوا يشتغلوا وأي حاجة مستنياهم متعلّقش. الحركات اللانهائية بتتوقف تمامًا لأن اللوب مالوش حدث نهاية.

### مكوّنات الحركة (`components/motion/`)

`reveal` (ظهور عند التمرير) · `tilt` (ميل بالمؤشّر) · `magnetic` (جذب مغناطيسي) · `cursor` (الحلقة الذهبية) · `depth-scene` (عمق بالـ parallax) · `masked-lines` (سطور بتنكشف) · `animated-number` (عدّاد) · `brand-loader`.

### View Transitions

انتقال العنصر المشترك بين لوحة المشروع في `/projects` وبطل صفحة التفاصيل، بنفس منحنى البيت: `0.42s cubic-bezier(0.22, 1, 0.36, 1)`. الكود المساعد في `lib/browse/view-transition.ts`.

---

## 8. الترجمة (i18n)

```
lib/i18n/dictionaries.ts   ← 4317 سطر — قاموس EN/AR مسطّح
lib/i18n/locale.tsx        ← LocaleProvider + useLocale() + useT()
```

**إزاي بتشتغل:**
- التفضيل في `localStorage` تحت `vestora.locale`.
- `LocaleProvider` بيزامن `document.documentElement.lang` و `dir` (`ar` → `rtl`).
- `t(key)` بيرجع العربي، وبيقع على الإنجليزي، وبعدين على الـ key نفسه.

**قواعد:**
- ✅ كل نصّ مرئي بيعدّي من `t()`.
- ✅ استخدم خصائص CSS المنطقية (`inset-inline-start` مش `left`) — الواجهة كلها بتنقلب.
- ❌ متكتبش نصّ ثابت في JSX.
- ❌ متفترضش اتجاه ثابت في الحركة أو الحواف.

**التبديل:** `components/language-toggle.tsx`.

---

## 9. اللحظي (Realtime)

```
lib/realtime/chat.ts        ← اتصال SignalR
lib/realtime/chat-store.ts  ← حالة الشات
components/messages/chat-realtime.tsx  ← مركّب في <Providers>، بيسمع طول الجلسة
```

- الاتصال بيمرّر التوكن في الـ query string (`?access_token=`).
- بيستقبل `ReceiveMessage` و `ReceiveNotification` وأحداث الحضور/الكتابة/القراءة.
- الإشعارات بتوصل **لحظيًا** بدل ما تستنّى الاستطلاع الدوري.

---

## 10. المنطق المشترك في `lib/`

| المجلّد | المحتوى |
|---|---|
| `browse/` | `use-browse-state` (الحالة في الـ URL) · `motion` · `signals` · `view-transition` |
| `deals/stages.ts` | مفردات الـ pipeline: `STAGE_ORDER` · `STAGE_LABEL_KEY` · `stageTone()` — **جدول بيانات، مش مكوّن**، عشان أي حاجة تقرا منه من غير ما تجرّ شجرة render وراها |
| `notifications/taxonomy.ts` | تصنيف الإشعارات لـ 3 مسارات + الأيقونة والوجهة لكل نوع |
| `validation/rules.ts` | **مرآة `AccountRules.cs` بالحرف** — غيّر واحد، غيّر التاني في نفس الـ commit |
| `validation/server-errors.ts` | تحويل أخطاء الـ ModelState لأخطاء حقول في react-hook-form |
| `format/money.ts` | تنسيق المبالغ |
| `config/categories.ts` | قايمة القطاعات المقترَحة (الـ backend بيقبل أي نصّ) + `mergeCategories()` |
| `config/social.ts` · `legal/documents.ts` · `metadata/public-preview.ts` | إعدادات ومحتوى |
| `chat/thread-utils.ts` | مساعدات المحادثات |
| `onboarding.ts` | علامة الإتمام في `localStorage` — **لكل متصفّح، مش لكل حساب** (مفيش حقل في الـ backend لسه) |

---

## 11. الفخاخ المعروفة (Gotchas)

| الفخّ | التفصيل |
|---|---|
| **Next 16 ≠ اللي تعرفه** | راجع `node_modules/next/dist/docs/` قبل ما تعتمد على API. |
| **الحماية على العميل** | الصفحة بتتحمّل قبل التوجيه. متعتمدش عليها كحاجز أمني. |
| **الـ accessToken بيروح مع الـ refresh** | ده مقصود. الـ bootstrap بيرجّعه. |
| **`richColors` مقفولة في Sonner** | تشغيلها بيسلّم اللوحة للمكتبة والتوست يبقى شكله "output" مش منتج. |
| **`text-foreground` جوّه نطاق داكن** | لو كتلة بتفرض `dark` على نفسها (زي الـ hero فوق فيديو)، اتأكد إن الـ token اللي بتستخدمه بيتحلّ جوّه النطاق الصح. |
| **Lenis + `useScroll`** | Lenis بيسوق التمرير من JS. في الاختبارات لازم تعطّله وإلا الـ scroll listeners مبتتشغّلش. |
| **الترتيب في RTL** | استخدم `inset-inline-*` و `margin-inline-*`. أي `left/right` صريح هيتكسر بالعربي. |
| **الصور بتيجي bytes من الـ API** | مسارات زي `/api/users/{id}/avatar` بترجّع البايتات نفسها، مش URL. |
| **`onboarding` لكل متصفّح** | متعاملهاش كأنها خاصية على الحساب. |

---

## 12. الأوامر

```bash
cd Frontend/vestora && npm run dev
```

```bash
cd Frontend/vestora && npm run build
```

```bash
cd Frontend/vestora && npm run lint
```

> فيه `.claude/launch.json` معرّف فيه `vestora-web` — أدوات الـ preview بتشغّل السيرفر منه بدل الـ terminal.
