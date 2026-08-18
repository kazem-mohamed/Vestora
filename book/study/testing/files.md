# دليل ملفاتك العملي — التستينج

الملف ده مش للمذاكرة النظرية — ده اللي بتفتحه وإنت قاعد على الجهاز.
بيقولك ملفاتك فين، ومحتاج تنزّل إيه، وإزاي تشغّل وتجرّب.

الملف النظري الكامل: `study.pdf` في نفس الفولدر.

---

## ١. الأدوات اللي محتاجها

| الأداة | لإيه | تتأكد إزاي |
|---|---|---|
| .NET 8 SDK | تشغيل الاختبارات | `dotnet --version` |
| VS Code أو Visual Studio | تقرا وتعدّل الاختبارات | — |
| مفيش أي حاجة تانية | مفيش حاجة برة .NET — الـInMemory database والمزوّد الوهمي جوّه الكود نفسه | — |

---

## ٢. ملفاتك

### بنية الاختبار

| الملف | إيه اللي فيه |
|---|---|
| `MyAppApi.Tests/Integration/CustomWebApplicationFactory.cs` | **أهم ملف عندك.** بيشغّل الـAPI في الذاكرة على قاعدة بيانات InMemory معزولة، وبيعطّل الـrate limiter وقت الاختبار. |
| `MyAppApi.Tests/Integration/TestHelpers.cs` | تسجيل حساب، دخول، بذر مشاريع واستثمارات مباشرة في الداتابيز. |
| `MyAppApi.Tests/Integration/TestLogCapture.cs` | أداة تصحيح — بتلقط الأخطاء اللي الـexception handler الحقيقي بيخفيها عن رد الـHTTP. |

### الاختبارات نفسها

| الملف | العدد | بيغطّي |
|---|---|---|
| `Integration/AuthEndpointsTests.cs` | 9 | تسجيل، دخول، تدوير التوكن، القفل، تأكيد الإيميل |
| `Integration/ProjectsEndpointsTests.cs` | 6 | إنشاء مشروع، العدّادات، إقفال جولة، الملكية |
| `Integration/PaymentsEndpointsTests.cs` | 6 | رحلة الدفع الكاملة |
| `Integration/SecurityBoundaryTests.cs` | 7 | محاولات اختراق مباشرة |

### التوثيق

| الملف | إيه فيه |
|---|---|
| `MyAppApi.Tests/SECURITY-FINDINGS.md` | 13 محاولة اختراق موثّقة بنتيجتها |
| `MyAppApi.Tests/FRONTEND-MANUAL-TEST-PLAN.md` | 65 سيناريو يدوي — النتيجة All Pass |

### مش بتاعتك (بس السويت بتاعتك بتبني فوقها)

| الملف | إيه فيه |
|---|---|
| `MyAppApi.Tests/FundingMathTests.cs` | 19 اختبار على حسابات الفلوس — موجودة قبلك |
| `MyAppApi.Tests/PipelineStagesTests.cs` | 8 اختبارات على مراحل العلاقة — موجودة قبلك |

---

## ٣. التشغيل

### كل الاختبارات

```bash
cd MyAppApi
dotnet test MyAppApi.Tests/MyAppApi.Tests.csproj
```

المفروض تشوف `Passed! - Failed: 0, Passed: 76, Skipped: 0, Total: 76`.

### ملف واحد بس

```bash
dotnet test MyAppApi.Tests/MyAppApi.Tests.csproj --filter "FullyQualifiedName~AuthEndpointsTests"
```

غيّر `AuthEndpointsTests` لأي اسم ملف تاني (`ProjectsEndpointsTests`،
`PaymentsEndpointsTests`، `SecurityBoundaryTests`).

### اختبار واحد بس

```bash
dotnet test MyAppApi.Tests/MyAppApi.Tests.csproj --filter "FullyQualifiedName~RefreshToken_ReuseOfRevokedToken"
```

> لاحظ: مفيش داعي تشغّل الـAPI ولا الفرونت ولا أي قاعدة بيانات حقيقية —
> `dotnet test` بيشغّل كل حاجة بنفسه في الذاكرة.

---

## ٤. إزاي تجرّب الاختبار اليدوي

الخطوات في `FRONTEND-MANUAL-TEST-PLAN.md` نفسه — محتاج تشغّل الفرونت
والباكند الحقيقيين:

```bash
cd Frontend/vestora
npm install
npm run dev
```

```bash
cd MyAppApi/MyAppApi
dotnet run
```

بعدين اتبع الجدول في `FRONTEND-MANUAL-TEST-PLAN.md` قسم قسم.

---

## ٥. لو عايز تضيف اختبار جديد

الترتيب العملي:

1. حدّد الملف الصح (`AuthEndpointsTests.cs` لو مصادقة، `ProjectsEndpointsTests.cs`
   لو مشاريع، إلخ) — أو اعمل ملف جديد في `Integration/` لو المجال جديد.
2. استخدم `IClassFixture<CustomWebApplicationFactory>` زي باقي الملفات.
3. للبيانات الأساسية (مستخدم، مشروع، استثمار)، استخدم دوال `TestHelpers`
   الموجودة بدل ما تكرّر الكود.
4. شغّل `dotnet test` وتأكد الاختبار الجديد شغّال *وباقي الـ76 لسه شغّالين*.
5. لو الاختبار بيثبت حماية أمنية، ضيف بند ليه في `SECURITY-FINDINGS.md`
   بنفس الأسلوب.
