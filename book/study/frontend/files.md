# دليل ملفاتك العملي — الواجهة الأمامية

الملف ده مش للمذاكرة النظرية — ده اللي بتفتحه وإنت قاعد على الجهاز.
بيقولك ملفاتك فين، ومحتاج تنزّل إيه، وإزاي تشغّل وتجرّب.

الملف النظري الكامل: `study.pdf` في نفس الفولدر.

---

## ١. الأدوات اللي محتاجها

| الأداة | لإيه | تتأكد إزاي |
|---|---|---|
| Node.js + npm | تشغّل الواجهة | `node --version` |
| .NET 8 SDK | تشغّل الـ API عشان الصفحات تجيب بيانات | `dotnet --version` |
| VS Code | تقرا وتعدّل | — |
| متصفّح بأدوات مطوّر | تفحص الـ URL والشبكة والاتجاه | Chrome أو Edge |

---

## ٢. ملفاتك

### التصفّح — قلب شغلك

| الملف | إيه اللي فيه |
|---|---|
| `src/app/projects/page.tsx` | نقطة الدخول — بسيطة، بتغلّف `BrowseExperience` بـ `Suspense`. **اقرا التعليق اللي فوق، فيه سبب إن الصفحة عامة.** |
| `src/components/browse/browse-experience.tsx` | **المنسّق الرئيسي.** بيجمع الحالة والاستعلامات والعرض. ابدأ منه. |
| `src/components/browse/discovery-bar.tsx` | أكبر مكوّن (٣٧٩ سطر) — البحث والفلاتر والترتيب والشرايح. |
| `src/components/browse/venture-card.tsx` | كارت المشروع الواحد. |
| `src/components/browse/facet-menu.tsx` | قوايم الفلاتر بالعدّادات. |
| `src/components/browse/venture-spotlight.tsx` | إبراز مشروع مختار. |
| `src/components/browse/browse-states.tsx` | حالات التحميل والفراغ والخطأ. |
| `src/components/browse/commitment-rail.tsx` | شريط نسبة الالتزام. |
| `src/components/browse/signal-mark.tsx` | العلامة التحريرية على الكارت. |
| `src/components/browse/venture-image.tsx` | صورة المشروع بحالات تحميل. |
| `src/components/browse/browse-masthead.tsx` | ترويسة الصفحة. |
| `src/components/browse/guest-invite.tsx` | دعوة التسجيل للزائر. |

### منطق التصفّح

| الملف | إيه اللي فيه |
|---|---|
| `src/lib/browse/use-browse-state.ts` | **أهم ملف منطق عندك.** قراءة وكتابة الحالة في الـ URL، والبحث المؤجّل، وذاكرة التمرير. اقرا `readState` و `writeState` الأول. |
| `src/lib/browse/signals.ts` | الإشارات الستة والعتبات وحسابات النِّسَب. |
| `src/lib/browse/view-transition.ts` | الانتقال المتحرّك بين التصفّح وصفحة المشروع. |
| `src/lib/browse/motion.ts` | منحنيات الحركة والتأخير المتدرّج. |

### النماذج

| الملف | الحجم |
|---|---|
| `src/app/register/page.tsx` | ٦٧٣ سطر — الأكبر. **اقرا التعليق بتاع توقيت التحقق.** |
| `src/app/login/page.tsx` | ٢٧٢ سطر |
| `src/app/reset-password/page.tsx` | ٢٥٧ سطر |
| `src/app/verify-email/page.tsx` | ٢٠٨ سطر |
| `src/app/forgot-password/page.tsx` | ١٣٤ سطر |

### باقي صفحاتك

| الملف | إيه هي |
|---|---|
| `src/app/projects/[id]/` | صفحة المشروع الواحد |
| `src/app/(app)/settings/profile/page.tsx` | إعدادات الملف الشخصي |
| `src/app/(app)/settings/account/page.tsx` | إعدادات الأمان |
| `src/app/u/[id]/page.tsx` | الملف العام |
| `src/app/(app)/investors/` | دليل المستثمرين |
| `src/app/(app)/searches/` | البحث المحفوظ |
| `src/app/how-it-works/` · `about/` · `help/` · `legal/` · `terms/` | صفحات ثابتة |
| `src/app/maintenance/` · `no-access/` · `goodbye/` | صفحات الحالة |

### أدوات القائد اللي بتستخدمها (مش بتملكها)

| الملف | بتستخدمها في |
|---|---|
| `src/lib/api/client.ts` | كل طلب شبكة |
| `src/lib/api/projects.ts` | استعلامات المشاريع والعدّادات |
| `src/lib/types/api.ts` | أنواع البيانات |
| `src/lib/validation/rules.ts` | دوال التحقق في النماذج |
| `src/lib/validation/server-errors.ts` | ترجمة أخطاء السيرفر |
| `src/components/ui/*` | الأزرار والحقول والكروت |
| `src/app/globals.css` | الألوان والخطوط والمسافات |
| `src/lib/i18n/dictionaries.ts` | كل نص ظاهر |

---

## ٣. التشغيل

### الواجهة

```bash
cd Frontend/vestora
npm install
npm run dev
```

بتفتح على `http://localhost:3000`.

### الـ API (عشان البيانات تظهر)

```bash
cd MyAppApi/MyAppApi
dotnet run
```

> لو رفض يشتغل وقال حاجة عن مفتاح Stripe — ده **مقصود**. لازم مفتاح تجريبي
> يبدأ بـ `sk_test_`.

### التأكّد إن كل حاجة سليمة

```bash
cd Frontend/vestora
npx tsc --noEmit
npm run build
```

---

## ٤. إزاي تجرّب الحاجات المهمة

### حالة الفلاتر في الـ URL — أهم حاجة تجرّبها

1. افتح `http://localhost:3000/projects`
2. اكتب في البحث، واختار فلتر، وغيّر الترتيب
3. **بصّ على شريط العنوان** — هيتغيّر مع كل حاجة
4. انسخ الرابط، افتحه في تبويب جديد → نفس النتيجة بالظبط
5. اضغط رجوع في المتصفّح → الفلتر السابق بيرجع

### ذاكرة التمرير

1. انزل لتحت في قائمة المشاريع
2. افتح مشروع
3. اضغط رجوع → المفروض ترجع لنفس المكان مش لأول الصفحة

### الانتقال المتحرّك

اضغط على كارت مشروع وركّز في الصورة — المفروض تتحوّل لصورة الهيرو بدل ما
الصفحة تتبدّل فجأة.

> لو مشوفتش الحركة، المتصفّح غالبًا مش بيدعم `View Transitions API` — والصفحة
> بتفضل شغّالة عادي. ده مقصود.

### العدّادات

افتح قايمة فلتر القطاع — جنب كل خيار رقم. غيّر فلتر تاني وارجع → الأرقام
اتغيّرت حسب الفلاتر الحالية.

### توقيت التحقق في التسجيل

1. افتح `/register`
2. اكتب حرف واحد في الاسم واخرج من الحقل → دلوقتي بس الخطأ بيظهر
3. صلّحه → الخطأ بيختفي **وإنت بتكتب**، من غير ما تخرج تاني

### العربي والاتجاه

بدّل اللغة من الزرار في الأعلى. اتأكد إن:
- التخطيط انقلب بالكامل
- الفلاتر والكروت اتنقلوا للناحية التانية
- مفيش نص إنجليزي فاضل (لو فيه، يبقى مفتاح ترجمة ناقص)

---

## ٥. قواعد ملزِمة

من `AGENTS.md` في جذر المشروع:

| القاعدة | يعني إيه |
|---|---|
| مفيش `fetch` بره `lib/api/` | أي طلب شبكة يعدّي على الطبقة دي |
| مفيش نص في الكود | كل نص بمفتاح عن طريق `t()` |
| مفيش اتجاه فيزيائي | `ms-` مش `ml-`، `ps-` مش `pl-`، `start-` مش `left-` |
| «reviewed» مش «vetted» | المنصّة بتراجع مش بتوثّق |

---

## ٦. لو عايز تضيف فلتر جديد للتصفّح

الترتيب العملي:

1. `src/lib/browse/use-browse-state.ts` — ضيف الحقل في `BrowseState`،
   واقراه في `readState`، واكتبه في `writeState`.
2. `src/components/browse/discovery-bar.tsx` — ضيف واجهة الاختيار.
3. `src/components/browse/browse-experience.tsx` — ضيفه في `queryParams`.
4. `src/lib/api/projects.ts` — لو الباكند محتاج معامل جديد (**دي بتاعة
   القائد — كلّمه**).

> ولو الفلتر ليه قيمة افتراضية، **متكتبهاش في الـ URL** — زي `newest` في
> الترتيب. ده بيخلّي الرابط نضيف.
