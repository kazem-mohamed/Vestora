# دليل ملفاتك العملي — UI/UX

الملف ده مش للمذاكرة النظرية — ده اللي بتفتحه وإنت قاعد على الجهاز.
بيقولك ملفاتك فين، ومحتاج تنزّل إيه، وإزاي توصل للويزارد أصلًا عشان تجرّبه.

الملف النظري الكامل: `study.pdf` في نفس الفولدر.

---

## ١. الأدوات اللي محتاجها

| الأداة | لإيه | تتأكد إزاي |
|---|---|---|
| Node.js + npm | تشغّل الواجهة | `node --version` |
| .NET 8 SDK | تشغّل الـ API (نصك الخلفي) | `dotnet --version` |
| VS Code | تقرا وتعدّل | — |
| متصفّح بأدوات مطوّر | تفحص الـ 3D وتجرّب تقليل الحركة | Chrome أو Edge |

---

## ٢. ملفاتك

### الواجهة

| الملف | إيه اللي فيه |
|---|---|
| `Frontend/vestora/src/app/(app)/onboarding/page.tsx` | **الويزارد كله.** الحالة، الخطوات التلاتة، الانتقالات، الحفظ، والمكوّنات الفرعية (`Guilloche`, `ProgressRail`, `WelcomeStep`, `InterestsStep`, `PathStep`, `ProfileStep`). |
| `Frontend/vestora/src/components/motion/depth-scene.tsx` | نظام الـ 3D — `DepthScene` و `DepthLayer` و `useSpecular`. **اقرا التعليق اللي فوق، فيه سبب القرار كله.** |
| `Frontend/vestora/src/app/globals.css` | توكنز التصميم: الألوان، `--chamfer`، سلّم المقاسات، أدوار الخطوط، و `[lang="ar"]`. |
| `Frontend/vestora/src/lib/i18n/dictionaries.ts` | مفاتيح `onboard.*` — إنجليزي حوالي سطر ١١٥، وعربي حوالي سطر ٢٣٢٠. |
| `Frontend/vestora/src/lib/i18n/locale.tsx` | اللي بيحطّ `lang` و `dir` على الصفحة. |
| `Frontend/vestora/src/app/login/page.tsx` | شرط `needsOnboarding` اللي بيحوّل للويزارد. |
| `Frontend/vestora/src/lib/api/users.ts` | `markOnboarded()` و `updateMe()`. |
| `Frontend/vestora/src/lib/types/api.ts` | حقل `hasOnboarded` على `LoginResponse`. |

### الباكند (نصّك الخلفي)

| الملف | إيه اللي فيه |
|---|---|
| `MyAppApi/MyAppApi/Data/Models/User.cs` | عمود `OnboardedAtUtc` والتعليق بتاعه. |
| `MyAppApi/MyAppApi/Migrations/20260809201317_AddUserOnboardedAt.cs` | الترحيل — صغير، اقراه كله. |
| `MyAppApi/MyAppApi/Controllers/UsersController.cs` | **ميثود `MarkOnboarded` بس.** باقي الملف بتاع عضو الباكند. |
| `MyAppApi/MyAppApi/Services/AuthService.cs` | سطر `HasOnboarded = user.OnboardedAtUtc != null`. |
| `MyAppApi/MyAppApi/Data/Models/DTOs/ApiResponseDtos.cs` | حقل `HasOnboarded` على `LoginResponseDto`. |

---

## ٣. التشغيل

### الواجهة

```bash
cd Frontend/vestora
npm install
npm run dev
```

بتفتح على `http://localhost:3000`.

### الـ API

```bash
cd MyAppApi/MyAppApi
dotnet run
```

> لو رفض يشتغل وقال حاجة عن مفتاح Stripe — ده **مقصود**. لازم يكون مفتاح
> تجريبي يبدأ بـ `sk_test_`.

### التأكّد إن كل حاجة سليمة قبل التسليم

```bash
cd Frontend/vestora
npx tsc --noEmit
npm run build
```

---

## ٤. إزاي توصل للويزارد أصلًا

**دي أهم نقطة عملية في الملف ده.**

الويزارد بيظهر بشرط واحد: `OnboardedAtUtc` بتاع الحساب يكون `NULL`.
يعني لو دخلت بحساب خلّصه قبل كده، هتتحوّل على طول للوحة **ومش هتشوفه**.

الطرق:

1. **سجّل حساب جديد** — أنضف طريقة. الحساب الجديد عموده `NULL` تلقائيًا.
2. **افتح `/onboarding` مباشرة** — بيشتغل طالما إنت مسجّل دخول، بس ده بيتخطّى
   شرط التحويل فمش بيوري الفلو كامل.
3. **صفّر العمود لحسابك** في قاعدة البيانات:
   ```sql
   UPDATE Users SET OnboardedAtUtc = NULL WHERE Email = 'your@email.com';
   ```
   > ⚠️ القاعدة **مشتركة** مع الفريق. متعملش ده على حساب حد تاني.

---

## ٥. إزاي تجرّب الحاجات المهمة

### الـ 3D

- افتح الصفحة على شاشة كبيرة **بالماوس** (اللمس متجاهَل بقصد).
- افتح أدوات المطوّر → اختار عنصر الصفيحة → بصّ على `transform` وهي بتتغيّر
  وإنت بتحرّك الماوس.

### تقليل الحركة

في Chrome/Edge:
1. `F12` → `Ctrl+Shift+P`
2. اكتب `reduced motion`
3. اختار **Emulate CSS prefers-reduced-motion: reduce**
4. حدّث الصفحة

المفروض تلاقي: مفيش لفّة، مفيش لمعة، مفيش تمويه في الانتقال — والتصميم كامل
ومفهوم.

### العربي و RTL

اضغط زرار اللغة في أعلى الصفحة. اتأكد إن:
- الاتجاه اتقلب بالكامل
- زرار التخطّي اتنقل للناحية التانية (`ms-auto`)
- الخطوط نفسها اتغيّرت
- مفيش أي نص إنجليزي فاضل (لو فيه، يبقى فيه مفتاح ناقص)

### الوضع الداكن

بدّل الثيم من الزرار. اتأكد إن الورق المحفور واللمعة لسه باينين بشكل مظبوط.

---

## ٦. إزاي تضيف نص جديد

**ممنوع تكتب نص في الكود.** الخطوات:

1. افتح `lib/i18n/dictionaries.ts`
2. ضيف المفتاح في **القسم الإنجليزي**:
   ```ts
   "onboard.something": "Your text here",
   ```
3. ضيف **نفس المفتاح** في القسم العربي:
   ```ts
   "onboard.something": "النص بالعربي",
   ```
4. استخدمه:
   ```tsx
   {t("onboard.something")}
   ```

> لو ضفته في لغة واحدة بس، اللغة التانية هتعرض الإنجليزي كبديل — وده هيبان
> غلط في المناقشة.

---

## ٧. قواعد لازم تلتزم بيها

من `AGENTS.md` (جذر المشروع):

| القاعدة | يعني إيه |
|---|---|
| مفيش `fetch` بره `lib/api/` | أي طلب شبكة يعدّي على `lib/api/` |
| مفيش نصوص في الكود | كل نص بمفتاح عن طريق `t()` |
| مفيش اتجاهات فيزيائية | `ms-` مش `ml-`، `ps-` مش `pl-`، `start-` مش `left-` |
| «reviewed» مش «vetted» | المنصّة بتراجع، مش بتوثّق — ممنوع ادّعاء تحقّق مش بيحصل |

---

## ٨. حاجة مهمة عن الصور

سكرين شوتس الأونبوردنج الموجودة في `book/assets/screenshots/`
(`onboarding-en-light.png` و `onboarding-ar-dark.png`) اتاخدت **قبل** إعادة
بناء الصفحة — يعني بتوري النسخة القديمة (شاشة واحدة) مش الويزارد الحالي.

**متستخدمهاش في أي عرض.** لو محتاج صور جديدة، شغّل المشروع وصوّر بنفسك.
