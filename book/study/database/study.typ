#import "/lib/study.typ": *

#study-cover(
  track: "Database",
  subtitle: "الميكانيكا الكاملة: AppDbContext، الكيانات، العلاقات، الفهارس، الحذف الناعم، وستّة وعشرون ترحيلًا على قاعدة مشتركة",
  member: "عضو الفريق · قاعدة البيانات",
  date: "أغسطس 2026",
)

#show: study.with(track: "Database")

#study-toc()

= Your Responsibility, Exactly

قبل ما تفتح سطر كود واحد، لازم تعرف حدود جزءك. الحدود دي مش شكليات — هي اللي هتخليك في المناقشة تجاوب بثقة على اللي تخصّك، وتحوّل بأمانة اللي مش بتاعك للزميل اللي بيملكه. الاتنين علامة إنك فاهم، مش علامة ضعف.

== The One Sentence That Sums Up Your Role

#keypoint[
  إنت مسؤول عن *ميكانيكا* طبقة البيانات في Vestora: إيه الجداول اللي موجودة فعلًا، إزاي الكلاس بيتحوّل لجدول، إزاي العلاقات متظبطة في `AppDbContext.cs`، إيه الفهارس ولمين بتخدم، إزاي الحذف الناعم شغّال، إزاي التواريخ والأرقام العشرية متحكوم فيها، وإزاي الترحيلات (migrations) بتتولّد وتتراجَع وتتطبّق بأمان على قاعدة بيانات *مشتركة وبعيدة*.
]

يعني لو حد سألك "فين بالظبط مكتوب إن مشروع واحد ممكن يكون ليه أكتر من صورة؟" لازم تفتح `AppDbContext.cs` وتوريه السطر. ولو سألك "إيه اللي بيمنع إن نفس طلب التمويل يتدفع مرتين؟" لازم تقول اسم الفهرس بالحرف: `UX_PaymentTransactions_OneSucceededPerRequest`، وتشرح إن ده قيد على مستوى قاعدة البيانات مش شرط في كود التطبيق.

== The Safe Line Between You and the Leader

ده الجزء اللي لازم تقوله بصوت عالي في المناقشة لو اتسألت:

#warn[
  إنت *ما بتملكش* التبرير التصميمي عالي المستوى للسكيما. سؤال زي "ليه أصلًا فصلتوا `Investment.Status` عن `Investment.Stage`؟" أو "ليه `FundingRequest` كيان مستقل مش عمودين على `Investment`؟" — ده سؤال *قرار معماري*، وصاحبه هو قائد الفريق.

  اللي بتملكه إنت: إن الفصل ده *موجود فعلًا* في الكود، والعمودين اتعملوا في أي ترحيل، وكل واحد فيهم نوعه إيه وطوله كام، وإيه الفهرس اللي بيخدم كل واحد فيهم.
]

الفرق عملي جدًا. خد المثال ده:

#example("سؤال على الحد الفاصل")[
  *اللجنة:* ليه بتحتفظوا بالصف بتاع العلاقة لما المؤسس يرفض المستثمر، بدل ما تمسحوه؟

  *الإجابة الصح منك:* القرار ده قرار تصميمي بيملكه قائد الفريق، وهو اللي يشرح المنطق التجاري وراه. اللي أقدر أثبته إنا: القاعدة مكتوبة في `AGENTS.md` كقاعدة غير قابلة للكسر، والتنفيذ الفعلي بتاعها إن `Investment` مافيهاش أي `OnDelete` بيمسح الصف عند الرفض — الرفض بيغيّر `Status` و `Stage` لقيمة `"Declined"` وبس. وعشان كده الفهرس الفريد `UX_Investments_OneLivePerInvestor` مفلتَر على `[Status] IN ('Pending', 'Approved')` تحديدًا — علشان الصف المرفوض يخرج بره الفلتر ويسيب المستثمر حر يقدّم تاني.

  لاحظ: ما ادّعيتش إنك صاحب القرار، لكن أثبتّ إنك عارف مكانه في الكود بالحرف. ده أقوى بكتير من إجابة عامة.
]

== What You Own, in Detail

#filetable((
  ([`Data/AppDbContext.cs`], [قلب شغلك كله. كل `DbSet`، كل علاقة، كل فهرس، كل `HasPrecision`، الـ TPH discriminator، وفلاتر الحذف الناعم.]),
  ([`Data/Models/*.cs`], [٣٥ كلاس كيان. الأعمدة، أنواعها، الـ Data Annotations، والـ navigation properties.]),
  ([`Migrations/*.cs`], [٢٦ ترحيلًا. تاريخ السكيما من أول جدول لآخر فهرس.]),
  ([`Migrations/AppDbContextModelSnapshot.cs`], [صورة الموديل الحالية اللي EF Core بيقارن عليها لما تولّد ترحيل جديد.]),
  ([`Services/UtcDateTimeConverter.cs`], [آلية فرض إن كل تاريخ يخرج على السلك بعلامة UTC.]),
  ([`.config/dotnet-tools.json`], [تعريف أداة `dotnet-ef` كأداة محلية للمشروع بإصدار مثبَّت.]),
))

== What's *Not* Yours (Leave It to Its Owner)

#table(
  columns: (auto, 1fr),
  align: (right + top, right + top),
  table.header([الموضوع], [صاحبه]),
  [ليه السكيما شكلها كده؟ منطق المنتج ورا كل كيان], [قائد الفريق],
  [حساب أرقام التمويل: `FundingMath.cs`], [عضو الـ Backend / المنطق],
  [دورة حياة الدفع في `PaymentService.cs`], [عضو الدفع/التكامل],
  [الـ API endpoints والتحقق من الملكية], [عضو الـ Backend],
  [الواجهة، الترجمة، الـ RTL], [عضو الـ UI/UX],
)

بس خد بالك من نقطة مهمة: مجرد إن حاجة مش بتاعتك ما يعنيش إنك تجهل وجودها. لازم تعرف إن `FundingMath.cs` موجود وإنه بيقرأ من الجداول بتاعتك بأي فلاتر — لأن دي هي اللي بتفسّر *ليه* الفهارس اللي إنت عاملها على `Investment(ProjectId, Status)` و `PaymentTransaction(ProjectId, Status)` موجودة.

== Vocabulary You Must Get Right

في Vestora مفردات الفلوس محكومة بقواعد صارمة مكتوبة في `AGENTS.md`. لو نطقتها غلط في المناقشة، ده بيقرا كإنك مش فاهم المنتج:

#keypoint[
  - `Interest` ≥ `Committed` ≥ `Funded`. التلاتة أرقام مختلفة، مش مرادفات.
  - موافقة المؤسس على مستثمر = *committed* (التزام). *ما تقولش عليها "raised" ولا "تم جمعه"*.
  - `Funded` (تمويل فعلي) = صف `PaymentTransaction` حالته `Succeeded` وبس. لا أقل.
  - المنصة بتقول "reviewed" (تمت مراجعته) — *ما بتقولش* "vetted" ولا "verified" ولا "موثّق". لأن المنصة ما تقدرش تثبت ده.
]

== Why Database Mechanics Deserves Its Own Member

ممكن حد يستهون بالدور ويقول "يعني إيه؟ جداول؟". الرد العملي:

+ *سلامة الفلوس مش في كود `C#`، هي في الفهارس.* أربع قيود فريدة مفلترة في المشروع بتمنع دفعتين لنفس الطلب، وطلبين مفتوحين لنفس العلاقة، وويبهوك يتطبّق مرتين. الكود ممكن يخسر السباق (race)، الفهرس لأ.
+ *الحذف الناعم غلطة فيه بتسرّب بيانات.* لو فلتر واحد اتشال، حسابات محذوفة هتظهر في نتائج البحث.
+ *الترحيل الغلط على قاعدة مشتركة بيوقف الفريق كله.* ٦ أفراد على نفس قاعدة البيانات البعيدة.
+ *الدقة العشرية.* `decimal` من غير `HasPrecision` بيبقى `decimal(18,0)` في SQL Server — يعني كل الكسور بتتقصّ بصمت. ده مش bug ظاهر، ده فلوس بتختفي.

#recap[
  إنت بتملك *الميكانيكا*: `AppDbContext.cs`، ٣٥ كيان، ٢٦ ترحيل، الفهارس، الحذف الناعم، قاعدة UTC، وقاعدة `HasPrecision(18, 2)`. مش بتملك *التبرير التصميمي عالي المستوى* — ده للقائد. اعرف الحد، وقوله بوضوح لو اتسألت.
]

#selftest((
  ([اذكر تلات حاجات إنت مسؤول عنهم بالاسم من الكود.],
   [`AppDbContext.cs` وكل ما فيه من علاقات وفهارس، مجلد `Migrations/` بالـ ٢٦ ترحيلًا، و `UtcDateTimeConverter.cs`.]),
  ([لو اتسألت "ليه فصلتوا Status عن Stage؟" تعمل إيه؟],
   [أقول إن المنطق التصميمي بيملكه قائد الفريق، وأعرض اللي أقدر أثبته: العمودين موجودين على `Investment`، `Stage` اتضاف في ترحيل `Phase2_InvestmentPipeline` بنوع `nvarchar(20)` وقيمة افتراضية `"New"`، و `Status` اتحوّل في نفس الترحيل لـ `nvarchar(450)` علشان يتفهرس.]),
  ([ما الفرق بين `Committed` و `Funded` في مفردات المشروع؟],
   [`Committed` = المؤسس وافق على العلاقة — التزام معلن، مش فلوس. `Funded` = فيه `PaymentTransaction` حالته `Succeeded`. ما ينفعش تقول "raised" على الأولانية.]),
  ([ليه الفهرس أقوى من شرط في كود `C#` لمنع الدفع المزدوج؟],
   [شرط الكود هو قراءة بعدها كتابة؛ طلبين متزامنين ممكن الاتنين يقروا "مفيش" ويكتبوا. الفهرس الفريد بيتحقق وقت الإدخال نفسه على مستوى المحرك، فواحد بس هينجح.]),
))

= The Big Picture: EF Core, Code-First, and How a Class Becomes a Table

الفصل ده أساس كل اللي بعده. لو الجزء ده مش راسخ، باقي التفاصيل هتفضل حفظ.

== What an ORM Actually Is

في التطبيق إنت شغّال بكائنات `C#`: `Project`، `Investment`، `User`. في قاعدة البيانات فيه صفوف وأعمدة. الـ ORM (اختصار Object-Relational Mapper) هو الطبقة اللي بتترجم بين العالمين: بتاخد كائن وتحوّله لصف، وتاخد صف وترجّعه كائن، وتاخد استعلام LINQ وتحوّله SQL.

Entity Framework Core (أو `EF Core`) هو الـ ORM الرسمي لـ .NET، والمشروع مستخدم منه إصدار متوافق مع .NET 8، مع مزوّد SQL Server.

#note[
  الترجمة مش سحر. لما تكتب `context.Projects.Where(p => p.OwnerId == 5)`، EF Core بيبني شجرة تعبير (Expression Tree) ويحوّلها `SELECT ... FROM Projects WHERE OwnerId = 5`. لو كتبت حاجة EF Core مش عارف يترجمها، بيرمي استثناء أو — الأسوأ — بيجيب الصفوف كلها للذاكرة ويرشّح فيها هناك. علشان كده `FundingMath.cs` مكتوب كله بـ `Expression<Func<...>>`: علشان يفضل مترجَم لـ SQL.
]

== Code-First: The Code Is the Source, Not the Database

فيه أسلوبين للشغل مع EF Core:

#table(
  columns: (auto, 1fr),
  align: (right + top, right + top),
  table.header([الأسلوب], [يعني إيه]),
  [Database-First], [إنت بتعمل الجداول بـ SQL الأول، وبعدين تولّد كلاسات `C#` منها.],
  [Code-First], [إنت بتكتب كلاسات `C#`، و EF Core بيولّد الجداول منها عن طريق الترحيلات.],
)

#keypoint[
  Vestora شغّال *Code-First*. مصدر الحقيقة هو كلاسات `Data/Models/` + إعدادات `AppDbContext.OnModelCreating`. أي تعديل في السكيما بيبدأ من الكود، وبعدين يتولّد ترحيل. ما بنفتحش SSMS ونعمل `ALTER TABLE` بإيدينا — لأن كده الموديل في الكود والقاعدة يبقوا مختلفين، و EF Core مش هيعرف.
]

== How a Class Becomes a Table: Conventions

EF Core بيشتغل باتفاقيات ضمنية. من غير ما تكتب أي إعداد، هو بيفترض:

+ *اسم الجدول* = اسم الـ `DbSet` في الـ context. عندنا `public DbSet<Project> Projects` ⟵ الجدول اسمه `Projects` (جمع).
+ *المفتاح الأساسي* = الخاصية اللي اسمها `Id` أو `<TypeName>Id`. في `Project` عندنا `public int Id` ⟶ صار `PK_Projects`.
+ *`int Id`* بيتعمله `IDENTITY(1,1)` تلقائيًا — يعني ترقيم تلقائي.
+ *المفتاح الأجنبي* = خاصية اسمها `<Navigation>Id`. في `Project` فيه `public int OwnerId` مع `public Innovator Owner` ⟶ EF بيربطهم لوحده.
+ *القابلية للـ null*: `string?` ⟵ عمود `NULL`. `string` ⟵ عمود `NOT NULL`.
+ *`string` من غير طول* ⟵ `nvarchar(max)`.

#example("قراءة كلاس بسيط وتوقّع جدوله")[
  ```csharp
  public class ProjectImage
  {
      public int Id { get; set; }
      public byte[] ImageData { get; set; }
      public string ContentType { get; set; }
      public DateTime UploadedAt { get; set; }
      public int ProjectId { get; set; }
      public Project Project { get; set; }
  }
  ```

  اللي هيطلع من ده من غير أي إعداد إضافي:

  ```sql
  CREATE TABLE [ProjectImages] (
      [Id]          int             NOT NULL IDENTITY(1,1),
      [ImageData]   varbinary(max)  NOT NULL,
      [ContentType] nvarchar(max)   NOT NULL,
      [UploadedAt]  datetime2       NOT NULL,
      [ProjectId]   int             NOT NULL,
      CONSTRAINT [PK_ProjectImages] PRIMARY KEY ([Id]),
      CONSTRAINT [FK_ProjectImages_Projects_ProjectId]
          FOREIGN KEY ([ProjectId]) REFERENCES [Projects]([Id])
  );
  CREATE INDEX [IX_ProjectImages_ProjectId] ON [ProjectImages]([ProjectId]);
  ```

  لاحظ حاجتين: `byte[]` بقى `varbinary(max)`، و EF Core عمل فهرس تلقائي على المفتاح الأجنبي. الفهرس ده مش إنت اللي كتبته — دي اتفاقية.
]

== Three Ways to Override Conventions

لما الاتفاقية ما تكفيش، عندك تلات مستويات:

=== 1. Data Annotations (Attributes on the Property)

بتتحط جوه كلاس الكيان نفسه. المشروع مستخدمها كتير:

```csharp
[Required]
[StringLength(100)]
public string UserName { get; set; }

[EmailAddress]
[StringLength(255)]
public string Email { get; set; }

[Timestamp]
public byte[]? RowVersion { get; set; }
```

`[StringLength(100)]` بيخلي العمود `nvarchar(100)` بدل `nvarchar(max)`. `[Timestamp]` بيخلي العمود من نوع `rowversion` — وده اللي بيدّي للـ `PaymentTransaction` حمايتها من التعديل المتزامن.

#warn[
  خد بالك: `[Required]` و `[EmailAddress]` ليهم دورين مختلفين. `[Required]` بيأثر على السكيما (`NOT NULL`) *وكمان* على التحقق في ASP.NET. `[EmailAddress]` تحقق بس — ما بيعملش أي حاجة في قاعدة البيانات. ما تقولش في المناقشة إن الإيميل "متحقّق منه في القاعدة" لأن ده غلط.
]

=== 2. Fluent API in `OnModelCreating`

ده المكان الأساسي بتاعك. كل حاجة ما ينفعش تتقال بـ annotation — العلاقات المركّبة، الفهارس المركّبة، الفهارس المفلترة، سلوك الحذف، الدقة العشرية، الحذف الناعم — بتتكتب هنا:

```csharp
modelBuilder.Entity<Investment>()
    .Property(i => i.Amount)
    .HasPrecision(18, 2)
    .IsRequired();
```

#keypoint[
  الـ Fluent API *أقوى* من الـ annotations. لو الاتنين اتعارضوا على نفس الحاجة، الـ Fluent API بيكسب. وعلشان كده كل القواعد اللي ما ينفعش تتكسر في Vestora مكتوبة Fluent — لأن مكانها مركزي وواضح في ملف واحد.
]

=== 3. Custom Conventions

المشروع *ما بيستخدمش* المستوى ده. لو اتسألت "ليه ما عملتوش convention تحط `HasPrecision` على كل `decimal` تلقائيًا؟" — الرد الأمين: مش معمول في المشروع، والقاعدة بتتفرض حاليًا بالمراجعة اليدوية وبالقائمة اللي في `AGENTS.md`.

== The `DbContext`: What It Actually Is

`AppDbContext` بيرث من `DbContext`، وهو بيلعب تلات أدوار في نفس الوقت:

+ *وصف الموديل* — كل `DbSet<T>` بيقول لـ EF Core "الكيان ده جزء من الموديل"، و `OnModelCreating` بيظبط تفاصيله.
+ *وحدة عمل (Unit of Work)* — بيتتبّع كل التغييرات اللي حصلت على الكائنات، وينفّذها كلها مرة واحدة في `SaveChanges()` جوه معاملة (transaction) واحدة.
+ *مصنع استعلامات* — `context.Projects` هو نقطة بداية أي LINQ query.

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Investor> Investors { get; set; }
    public DbSet<Innovator> Innovators { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<Investment> Investments { get; set; }
    // ... باقي الـ DbSets
}
```

الـ constructor بياخد `DbContextOptions<AppDbContext>` — يعني الإعدادات (سلسلة الاتصال والمزوّد) بتتحقن من بره، مش متكتوبة جوه الكلاس. الحقن ده بيحصل في `Program.cs`:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(selectedConnectionString));
```

#note[
  `AddDbContext` بيسجّل الـ context بعمر *Scoped* — يعني نسخة واحدة لكل طلب HTTP. ده مقصود: الـ `DbContext` مش thread-safe ومش المفروض يعيش طويل. المتحكّم (controller) بياخد النسخة دي في الـ constructor بتاعه ويشتغل بيها.
]

== No Repository Layer — and Why

في مشاريع كتير بتلاقي `IProjectRepository` وطبقة تانية فوق `DbContext`. Vestora *ما بيعملش كده*، والقاعدة دي مكتوبة صراحةً في `AGENTS.md`:

#keypoint[
  المتحكّمات (controllers) بتكلّم `AppDbContext` مباشرةً. مفيش repositories. الخدمات (`Services/`) موجودة للمصادقة والدفع والحسابات بس، مش كطبقة وصول بيانات.

  ده يعني إن الـ `DbContext` بتاعك مش تفصيلة داخلية — هو *الواجهة* اللي كل الـ backend بيشتغل عليها. أي فلتر عام إنت بتحطه، بيسري على كل المشروع بلا استثناء.
]

لو اتسألت "ليه؟" — ده قرار معماري بيملكه القائد. اللي إنت بتملكه: إنك *تعرف* إن ده الوضع، وتعرف نتيجته المباشرة على شغلك — إن `HasQueryFilter` عندك بيطبَّق فعلًا في كل مكان من غير ما حد يفتكر يكتبه.

== The Difference Between `DbSet` and the Table

#warn[
  فيه خمس جداول في قاعدة البيانات *مالهمش* `DbSet` مباشر في `AppDbContext`، وبرضه EF Core عارفهم. إزاي؟ لأن EF Core بيكتشف الكيانات من الـ navigation properties كمان، مش من الـ `DbSet` بس.

  مثال: `Reply` عنده `DbSet`، لكن لو ما كانش عنده، EF Core كان هيكتشفه من `Comment.Replies`. والعكس: `Admin` *مالوش* `DbSet` خالص — هو معروف من خلال `HasDiscriminator().HasValue<Admin>("Admin")` بس.
]

في نفس الوقت، فيه جدولين اتعملوا في الترحيل الأولاني واتشالوا بعدين خالص: `Payments` و `ProjectAnalyses`. اتمسحوا في ترحيل `ExpansionRelationshipWorkspace` لما نظام الدفع الحقيقي (`PaymentTransaction`) حلّ محلهم. ده تفصيلة مهمة عن تاريخ السكيما هتحتاجها في فصل Migrations.

#recap[
  - EF Core = مترجم بين كائنات `C#` وصفوف SQL.
  - Vestora شغّال *Code-First*: الكلاس هو الأصل، والجدول نتيجة.
  - EF بيشتغل باتفاقيات (اسم الجدول، `Id` كمفتاح، `<Nav>Id` كمفتاح أجنبي، فهرس تلقائي على كل FK).
  - تغيّر الاتفاقية بـ annotations أو بالـ Fluent API. Fluent أقوى وهو مكان كل قواعد المشروع الصارمة.
  - `AppDbContext` = وصف موديل + وحدة عمل + مصنع استعلامات، وعمره Scoped لكل طلب.
  - مفيش repositories: المتحكّمات بتكلّم الـ context مباشرة، فأي فلتر عام بيسري على كل المشروع.
]

#selftest((
  ([كلاس فيه `public string? Note { get; set; }` من غير أي سمة — العمود هيطلع إيه؟],
   [`Note nvarchar(max) NULL`. الـ `?` بيخلّيه nullable، وغياب `StringLength` بيخلّيه `max`.]),
  ([EF Core بيعمل فهرس تلقائي على إيه من غير ما تطلب؟],
   [على كل مفتاح أجنبي (FK). مثلًا `IX_ProjectImages_ProjectId` اتعمل لوحده.]),
  ([لو حطّيت `[StringLength(50)]` وكمان `HasMaxLength(100)` في الـ Fluent API، الناتج كام؟],
   [١٠٠. الـ Fluent API بيكسب على الـ annotations.]),
  ([ليه غياب طبقة الـ repository مهم بالذات لشغلك إنت؟],
   [لأن المتحكّمات بتستخدم الـ `DbContext` مباشرة، فالـ global query filters اللي إنت كاتبها بتسري على كل استعلام في المشروع من غير ما حد يفتكر يطبّقها.]),
  ([كيان `Admin` مالوش `DbSet` — إزاي EF Core عارفه؟],
   [من إعداد الـ TPH: `HasDiscriminator<string>("UserType").HasValue<Admin>("Admin")` في `OnModelCreating`.]),
))

= Entity and Relationship Map

ده الفصل اللي المفروض تعرفه أكتر من أي حد في الفريق. لو اللجنة فتحت الـ ERD
وقالت «اشرح»، الكلام اللي جاي هو اللي هتقوله.

== The Full Picture

#shot(
  "/assets/diagrams/out/erd-core.svg",
  [المخطط الأساسي: المستخدم، المشروع، والعلاقة بينهم. لاحظ إن `Investment` مش
   مجرد جدول ربط — عنده حالة ومرحلة وتاريخ.],
)

== Relationships and Delete Behavior

أهم حاجة في أي علاقة عندنا مش بس مين مربوط بمين، لكن *إيه اللي بيحصل لما
الطرف الأساسي يتمسح*. ده اسمه `OnDelete` أو delete behavior، وكل اختيار فيه
في المشروع اتحدد بقصد.

#figure(
  table(
    columns: (auto, auto, 1fr),
    align: (right + top, right + top, right + top),
    table.header([العلاقة], [السلوك], [ليه كده]),
    [`Project` ← `Innovator`], [`Cascade`],
      [المشروع مالوش معنى من غير صاحبه. لو المؤسّس اتشال، مشاريعه تروح معاه.],
    [`Investment` ← `Investor`], [`Restrict`],
      [الالتزام سجلّ مالي. ممنوع يختفي عشان المستثمر اتشال — لازم حد ياخد قرار صريح الأول.],
    [`Message` ← `Sender`/`Receiver`], [`Restrict`],
      [محادثة بين طرفين. لو مسحنا رسائل طرف، تاريخ الطرف التاني بيتخرم.],
    [`MessageAttachment` ← `Message`], [`Cascade`],
      [المرفق تبع الرسالة نفسها (علاقة 1:1 بنفس المفتاح). الرسالة تروح، البايتس تروح.],
    [`RefreshToken` ← `User`], [`Cascade`],
      [توكن جلسة. مالوش قيمة من غير صاحبه.],
    [`SecurityLog` ← `User`], [`SetNull`],
      [عكس اللي فوق: السجلّ الأمني لازم *يفضل* حتى لو الحساب راح — بيبقى مجهول الهوية بدل ما يتمسح.],
    [`FundingRequest` ← `Investment`], [`Cascade`], [الطلب جزء من العلاقة نفسها.],
    [`FundingRequest` ← `TermSheet`], [`NoAction`],
      [سجلّ مالي تاني. ممنوع يختفي لأن الشروط اللي وراه اتشالت.],
    [`PaymentTransaction` ← `FundingRequest`], [`Cascade`], [المحاولة تبع الطلب.],
  ),
  caption: [كل سلوك حذف في المشروع والسبب وراه.],
)

#keypoint[
  القاعدة اللي بتفسّر الجدول ده كله: *أي حاجة فيها فلوس أو أي حاجة دليل — متتمسحش
  تلقائيًا.* عشان كده `Investment` و `FundingRequest` ← `TermSheet` بـ `Restrict`
  و `NoAction`، بينما `MessageAttachment` و `RefreshToken` بـ `Cascade` عادي.
]

#warn[
  `SecurityLog` هو الاستثناء الوحيد بـ `SetNull` — ودي نقطة ممتازة لو اتسألت
  «إزاي بتوازنوا بين حق المستخدم في الحذف وبين الاحتفاظ بالأدلة؟». الإجابة:
  السجلّ بيفضل، بس بيتقطع عن صاحبه.
]

== The Full Money Trail

#tall(
  "/assets/diagrams/out/erd-funding.svg",
  [سلسلة التمويل من فوق لتحت: العلاقة تولّد طلب، الطلب يولّد محاولات دفع،
   وكل تأكيد من المزوّد بيتسجّل كحدث مستقل.],
  height: 175mm,
)

السلسلة بالترتيب: `Investment` ← `TermSheet` ← `FundingRequest` ←
`PaymentTransaction` ← `PaymentEvent`.

#example("ليه `PaymentEvent` جدول لوحده؟")[
  لأن الحدث الجاي من المزوّد (Stripe مثلًا) لازم يتسجّل *قبل* ما أي رقم يتحرّك.
  لو كان مجرد عمود في `PaymentTransaction`، مكنش فيه مكان تسجّل فيه ويبهوك
  اتكرّر أو ويبهوك وصل قبل ما المستخدم يرجع من صفحة الدفع.

  كونه جدول مستقل + الفهرس الفريد على `(Provider, ProviderEventId)` =
  نفس الحدث مستحيل يتطبّق مرتين.
]

== Ownership: Who Owns What

فحص الملكية بيعتمد على سلاسل المفاتيح الأجنبية دي. لما الكنترولر يسأل «هل
المستخدم ده يحقّ له يعدّل الحاجة دي؟»، السؤال بيترجم لتتبّع السلسلة لحد `UserId`.

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([المورد], [سلسلة الملكية]),
    [مشروع], [`Project.OwnerId` ← `Innovator.Id` — المؤسّس بيملك مشروعه.],
    [التزام], [طرفين: `Investment.InvestorId` (المستثمر) و `Investment.Project.OwnerId` (المؤسّس). *الاتنين* ليهم حق الوصول، بصلاحيات مختلفة.],
    [ورقة شروط], [`TermSheet.InvestmentId` ← نفس طرفَي العلاقة.],
    [طلب تمويل], [`FundingRequest.InvestmentId` ← نفس الطرفين، بس المؤسّس هو اللي بينشئه.],
    [معاملة دفع], [`PaymentTransaction.InvestorId` — المستثمر بيدفع، والمؤسّس بيشوف النتيجة.],
    [رسالة], [`Message.SenderId` و `Message.ReceiverId` — الطرفان بس.],
    [مستند مشروع], [`ProjectDocument.ProjectId` ← `Project.OwnerId`، مع مستوى ظهور بيحدّد مين تاني يشوفه.],
  ),
  caption: [سلاسل الملكية اللي عليها بيتبني فحص الصلاحية.],
)

#keypoint[
  لاحظ إن `Investment` ليه *مالكين*، مش مالك واحد. ودي أهم نقطة في الجدول ده:
  أي فحص صلاحية على علاقة لازم يسأل «هل ده المستثمر بتاعها *أو* صاحب المشروع
  بتاعها؟» — وبصلاحيات مختلفة لكل واحد. مثال: المؤسّس بس هو اللي يقدر يوافق،
  والمستثمر بس هو اللي يقدر يدفع.
]

#warn[
  ده بيوضّح قاعدة رقم ٤ في `AGENTS.md`: *فحص الدور مش فحص ملكية.* إن المستخدم
  دوره `Innovator` مش معناه إنه صاحب المشروع ده بالذات. لازم الاتنين: الدور
  *و* السلسلة.
]

#selftest((
  ([ليه `Investment` ← `Investor` بـ `Restrict` مش `Cascade`؟],
   [لأن الالتزام سجلّ مالي مشترك بين طرفين. لو اتمسح تلقائيًا مع المستثمر، تاريخ المؤسّس بيضيع كمان.]),
  ([إيه الفرق بين `Cascade` و `SetNull` عمليًا؟],
   [`Cascade` بيمسح الصف التابع. `SetNull` بيسيبه موجود ويفضّي المفتاح الأجنبي بس — بيستخدم لما السجلّ نفسه له قيمة من غير صاحبه.]),
  ([`MessageAttachment` مفتاحه الأساسي إيه؟],
   [`MessageId` نفسه — علاقة 1:1 بمفتاح مشترك، عشان البايتس ما تتحمّلش مع كل استعلام محادثة.]),
  ([لو مسحنا `TermSheet` هيحصل إيه للـ `FundingRequest` المربوط بيه؟],
   [مفيش حاجة — العلاقة `NoAction`. قاعدة البيانات هترفض المسح أصلًا طالما فيه طلب مربوط.]),
))

= Entities, Column by Column

الفصل ده مرجع. مش لازم تحفظه كله، بس لازم تعرف تفتحه وتلاقي أي عمود بيتسأل عنه.

== `Investment` — The Relationship Itself

ده أهم كيان في المشروع بعد `User` و `Project`، ولازم تفهم إنه *مش جدول ربط*.

#figure(
  table(
    columns: (auto, auto, 1fr),
    align: (right + top, right + top, right + top),
    table.header([العمود], [النوع], [إيه هو]),
    [`Id`], [`int`], [المفتاح الأساسي.],
    [`Amount`], [`decimal(18,2)`], [المبلغ اللي المستثمر عايز يدخل بيه.],
    [`Date`], [`datetime2`], [تاريخ الطلب.],
    [`Status`], [`string`], [بوابة التمويل: `Pending` / `Approved` / `Declined`.],
    [`Stage`], [`string`], [مرحلة العلاقة بين الطرفين. الافتراضي `New`.],
    [`StageUpdatedAt`], [`datetime2?`], [آخر مرة اتحرّكت فيها المرحلة.],
    [`ContactInfo`], [`string?`], [بيانات تواصل المستثمر، بتتشاف بعد الموافقة.],
    [`FounderNote`], [`string?`], [ملاحظة خاصة بالمؤسّس — المستثمر مبيشوفهاش.],
    [`InvestorNote`], [`string?`], [ملاحظة خاصة بالمستثمر — المؤسّس مبيشوفهاش.],
    [`DeclinedReason`], [`string?`], [سبب الرفض، لو اترفض.],
    [`InvestorId`], [`int?`], [*اختياري* — لاحظ علامة الاستفهام.],
    [`ProjectId`], [`int`], [إجباري.],
  ),
  caption: [أعمدة `Investment`.],
)

#warn[
  `InvestorId` قابل للـ `NULL` بينما `ProjectId` لأ. ودي بالظبط سبب وجود الشرط
  `[InvestorId] IS NOT NULL` جوّه فلتر القيد `UX_Investments_OneLivePerInvestor` —
  لأن الصفوف اللي مالهاش مستثمر مينفعش تتزاحم على تفرّد.
]

== `Project` — The Venture

أكبر كيان في المشروع من ناحية عدد الأعمدة، ومقسّم لخمس مجموعات.

#figure(
  table(
    columns: (auto, auto, 1fr),
    align: (right + top, right + top, right + top),
    table.header([العمود], [النوع], [إيه هو]),
    [`Name` / `Description`], [`string`], [الأساسيات، إجباريين.],
    [`VideoUrl` / `Topic`], [`string?`], [اختياريين.],
    [`Category` / `Industry` / `Location`], [`string?`], [حقول التصنيف — عليها فهارس التصفّح.],
    [`Stage`], [`string?`], [مرحلة المشروع: `Idea` / `Pre-seed` / `Seed` / `Growth`. *مش* مرحلة العلاقة.],
    [`InvestmentNeeded`], [`decimal(18,2)`], [هدف الجولة.],
    [`Valuation`], [`decimal(18,2)?`], [التقييم.],
    [`EquityOffered`], [`decimal(5,2)?`], [نسبة الحصّة المعروضة.],
    [`UseOfFunds`], [`string?`], [أوجه استخدام التمويل.],
    [`ModerationStatus`], [`string`], [بوابة النشر. الافتراضي `PendingReview` — يعني *مخفي* لحد ما أدمن يراجع.],
    [`ModerationNote` / `ModeratedAtUtc`], [`?`], [سبب القرار الإداري ووقته.],
    [`LifecycleStatus`], [`string`], [دورة الحياة: `Active` وغيرها. الافتراضي `Active`.],
    [`RoundClosedAtUtc` / `RoundOutcome` / `RoundClosingNote`], [`?`], [إغلاق الجولة ونتيجتها المعلَنة.],
    [`InvestorCount` / `TotalInteractions`], [`int`], [عدّادات محسوبة مسبقًا للعرض السريع.],
    [`IsDeleted`], [`bool`], [الحذف الناعم — عليه الفلتر العام.],
    [`OwnerId`], [`int`], [المؤسّس المالك.],
  ),
  caption: [أعمدة `Project`.],
)

#warn[
  *تلات كلمات «مرحلة» مختلفة في المشروع، متخلطش بينهم:*

  - `Project.Stage` — مرحلة *الشركة* (فكرة، بذرة، نمو).
  - `Investment.Stage` — مرحلة *العلاقة* بين مستثمر ومؤسّس.
  - `Investment.Status` — بوابة *الفلوس*.

  ودي غلطة سهلة جدًا تحصل تحت الضغط.
]

#keypoint[
  `ModerationStatus` افتراضيه `PendingReview` — يعني المشروع الجديد *مخفي*
  بشكل افتراضي. ده قرار أمان: النشر بيحتاج فعل إيجابي من أدمن، مش العكس.
]

== `User` — The User

الجدول ده بيضم التلات أنواع (TPH)، فأعمدته أكتر من أي جدول تاني.

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([المجموعة], [الأعمدة]),
    [الهوية],
      [`UserName`, `Email` (فريد), `Password` (مُجزّأ), `UserType` (الـ discriminator), `UniqueNumber`],
    [الملف الشخصي],
      [`BirthDate`, `Phone`, `BriefBio`, `WebsiteUrl`, `LinkedinUrl`, `TwitterUrl`, `ProfileImage`, `CoverImage`],
    [تأكيد الإيميل],
      [`IsEmailVerified`, `EmailVerifiedAtUtc`, `EmailVerificationTokenHash`, `EmailVerificationTokenExpiresAtUtc`, `EmailVerificationLastSentAtUtc`],
    [إعادة تعيين كلمة السر],
      [`PasswordResetTokenHash`, `PasswordResetTokenExpiresAtUtc`, `PasswordResetLastRequestedAtUtc`, `PasswordResetFailedAttempts`],
    [الحماية من التخمين],
      [`FailedLoginCount`, `LockoutEndUtc`, `LastFailedLoginAtUtc`],
    [دورة حياة الحساب],
      [`IsDeleted`, `DeletedAtUtc`, `IsSuspended`, `SuspendedAtUtc`, `SuspensionReason`, `CreatedAtUtc`, `LastSeenAt`],
    [التفضيلات],
      [`NotifyOnFollow`, `NotifyOnProjectUpdate`, `OnboardedAtUtc`],
    [خاصة بالمستثمر فقط],
      [`PreferredIndustries`, `InvestmentThesis`, `TicketMin`, `TicketMax`, `ListedInDirectory` — بتبقى `NULL` عند المؤسّس والأدمن],
  ),
  caption: [أعمدة `User` مجمّعة بالوظيفة.],
)

#keypoint[
  لاحظ نمط متكرّر: كل توكن حسّاس متخزّن *مُجزّأ* (`...TokenHash`) مش خام —
  توكن تأكيد الإيميل، وتوكن إعادة تعيين كلمة السر، وتوكن التحديث في جدول
  `RefreshTokens`. لو قاعدة البيانات اتسرّبت، التوكنات دي مش قابلة للاستخدام.
  ودي نقطة قوية لو اتسألت عن الأمان على مستوى التخزين.
]

== `Status` and `Stage`: Two Different Axes

دي قاعدة رقم ٣ في `AGENTS.md`، ومن أكتر الحاجات اللي بتتسأل.

#figure(
  table(
    columns: (auto, 1fr, 1fr),
    align: (right + top, right + top, right + top),
    table.header([], [`Status`], [`Stage`]),
    [بيجاوب على],
      [هل الالتزام ده محسوب في أرقام التمويل؟],
      [إحنا فين في العلاقة بين شخصين؟],
    [القيم],
      [`Pending` · `Approved` · `Declined`],
      [تمان مراحل — تحت],
    [بيتغيّر بـ],
      [قرار المؤسّس بالموافقة أو الرفض],
      [تقدّم المحادثة والتفاوض],
    [بيأثر على الفلوس],
      [أيوه — `Approved` معناها *ملتزَم*],
      [لأ بشكل مباشر],
  ),
  caption: [المحوران، ومنعًا للخلط بينهم.],
)

المراحل التمانية بالنص من `PipelineStages.cs`:

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([المرحلة], [معناها]),
    [`New`], [الطلب لسه واصل.],
    [`Reviewing`], [المؤسّس بيبصّ عليه.],
    [`Approved`], [المؤسّس وافق — *ودي المرحلة اللي بتتحسب في التمويل*.],
    [`Contacted`], [المؤسّس تواصل.],
    [`InDiscussion`], [أخذ وردّ شغّال.],
    [`Committed`], [الطرفان اتفقوا على الشروط.],
    [`Closed`], [العلاقة اتقفلت — *مرحلة نهائية*.],
    [`Declined`], [المؤسّس رفض — *مرحلة نهائية*، والصف بيفضل موجود للتاريخ.],
  ),
  caption: [المراحل التمانية. `Closed` و `Declined` هما المرحلتان النهائيتان (`Terminal`).],
)

#keypoint[
  لو اتسألت «ليه مدمجتوش العمودين في واحد؟» الإجابة: لأنهم بيقيسوا حاجتين
  مختلفتين. علاقة ممكن تكون `Approved` في الـ `Status` (يعني الفلوس محسوبة)
  وفي نفس الوقت `InDiscussion` في الـ `Stage` (يعني لسه بيتكلموا). دمجهم كان
  هيخلّي مستحيل تعرف رقم التمويل من غير ما تقرا سياق المحادثة.
]

== `FundingRequest` — The Money Request

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([العمود], [إيه هو]),
    [`Reference`], [كود فريد للطلب — عليه فهرس فريد.],
    [`InvestmentId`], [العلاقة اللي الطلب طالع منها.],
    [`Amount` / `Currency`], [المبلغ المطلوب وعملته (الافتراضي `USD`).],
    [`Status`], [`Open` / `Paid` / `Cancelled` وغيرهم.],
    [`TermSheetId`], [ورقة الشروط اللي الطلب بيستدعيها (اختياري).],
    [`CounterAmount` / `CounterNote` / `CounterAtUtc` / `CounterStatus`], [العرض المضاد من المستثمر.],
    [`SupersedesRequestId`], [الطلب اللي ده جه بدله، لو فيه.],
    [`ExpiresAtUtc`], [ميعاد انتهاء الطلب.],
    [`RemindersSent`], [عدد التذكيرات اللي اتبعتت.],
    [`ClosedAtUtc` / `PaidAtUtc`], [تواريخ الإقفال والدفع.],
  ),
  caption: [أعمدة `FundingRequest`.],
)

== `PaymentTransaction` — The Payment Attempt

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([العمود], [إيه هو]),
    [`Reference`], [كود فريد للمعاملة.],
    [`AttemptNumber`], [رقم المحاولة — لأن المحاولات بتتعدّد وكل واحدة صف.],
    [`Amount`], [المبلغ.],
    [`FeeRateBps`], [نسبة العمولة بالـ basis points (جزء من عشرة آلاف) — *عدد صحيح مش كسر*.],
    [`FeeAmount` / `NetToFounder`], [العمولة المحسوبة والصافي للمؤسّس — *متجمّدين على الصف*.],
    [`Status`], [`Initiated` / `Processing` / `Succeeded` / وغيرهم.],
    [`Provider` / `ProviderSessionId` / `ProviderPaymentId`], [هوية العملية عند مزوّد الدفع.],
    [`FailureCode` / `FailureMessage` / `CancelReason`], [تفاصيل الفشل أو الإلغاء.],
    [`RefundedByAdminId` / `RefundReason` / `RefundedAtUtc`], [بيانات الاسترجاع الإداري.],
    [`RowVersion`], [`byte[]` — طابع التزامن، اقرا الفصل الجاي.],
  ),
  caption: [أعمدة `PaymentTransaction`.],
)

#keypoint[
  ليه العمولة *متجمّدة* على الصف بدل ما تتحسب كل مرة؟ لأن نسبة العمولة ممكن
  تتغيّر بعد سنة. لو حسبناها لحظة العرض، معاملة قديمة هتظهر برقم مختلف عن
  اللي اتدفع فعلًا. الرقم المتجمّد = الحقيقة التاريخية.
]

#warn[
  `FeeRateBps` عدد صحيح (`int`) مش `decimal`. الوحدة basis point = ١ من ١٠٠٠٠.
  يعني ٢٥٠ bps تساوي ٢٫٥٪. السبب: النسب دي بتتخزّن أعداد صحيحة عشان تتجنّب
  مشاكل التقريب تمامًا.
]

== `PaymentEvent` — The Provider's Confirmation

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([العمود], [إيه هو]),
    [`Provider` + `ProviderEventId`], [الاتنين مع بعض *فهرس فريد* — ده قلب منع التكرار.],
    [`EventType`], [نوع الحدث الجاي من المزوّد.],
    [`Source`], [جه منين: ويبهوك ولا رجوع المستخدم من صفحة الدفع.],
    [`Payload`], [الحمولة الخام زي ما وصلت.],
    [`ReceivedAtUtc`], [وقت الاستلام.],
    [`Applied`], [هل الحدث اتطبّق فعلًا ولا اتسجّل بس.],
    [`Outcome`], [نتيجة التطبيق.],
    [`ReviewedAtUtc` / `ReviewedByAdminId` / `ReviewNote`], [مراجعة إدارية للأحداث المشكوك فيها.],
  ),
  caption: [أعمدة `PaymentEvent`.],
)

#keypoint[
  عمود `Applied` مهم: الحدث بيتسجّل *الأول*، وبعدين بيتطبّق. لو اتسجّل واتطبّقش،
  ده بيبان. القاعدة في `AGENTS.md` بتقول بالنص: *سجّل الـ `PaymentEvent` قبل
  تطبيق أي أثر*.
]

= Concurrency: When Two Writes Happen at Once

`PaymentTransaction` عنده عمود مختلف عن كل اللي فات:

```csharp
public byte[]? RowVersion { get; set; }
```

ده اسمه *optimistic concurrency token*. SQL Server بيغيّر قيمته تلقائيًا مع كل
تعديل على الصف.

== How It Works

+ تقرا الصف، وتيجي معاه قيمة `RowVersion` الحالية.
+ تعدّل في الذاكرة.
+ تعمل `SaveChanges()` — و EF Core بيضيف في جملة الـ `UPDATE` شرط:
  «عدّل الصف ده *بشرط* إن الـ `RowVersion` لسه زي ما قريتها».
+ لو حد تاني عدّل الصف في الوقت ده، القيمة اتغيّرت، والشرط مبيتحقّقش،
  فـ صفر صفوف اتعدّلت — و EF Core بيرمي `DbUpdateConcurrencyException`.

#example("ليه ده مهم في الدفع بالذات")[
  تخيّل ويبهوك من Stripe وصل، وفي نفس الجزء من الثانية المستخدم رجع من صفحة
  الدفع فاتنفّذ تحقّق تاني. الاتنين قروا نفس الصف وحالته `Processing`،
  والاتنين عايزين يخلّوها `Succeeded`.

  من غير `RowVersion`: الاتنين بيكتبوا، وممكن أثر التمويل يتطبّق مرتين.

  مع `RowVersion`: أول واحد بيكسب، والتاني بياخد استثناء ويتعامل معاه —
  من غير ما رقم واحد في التمويل يتحرّك غلط.
]

#keypoint[
  خد بالك من الفرق: *الفهرس الفريد* بيمنع صفّين متعارضين يتولدوا.
  *`RowVersion`* بيمنع تعديلين متزامنين على نفس الصف. الاتنين حمايات مختلفة
  لمشكلتين مختلفتين، والمشروع مستخدم الاتنين في المسار المالي.
]

#selftest((
  ([`Investment.InvestorId` ليه `nullable`؟],
   [عشان يسمح بصفوف من غير مستثمر مرتبط؛ وعشان كده فلتر القيد الفريد بيشترط `IS NOT NULL`.]),
  ([علاقة حالتها `Approved` ومرحلتها `InDiscussion` — ده منطقي؟],
   [أيوه تمامًا. `Status` بيقول الفلوس محسوبة، `Stage` بيقول لسه بيتكلموا. محورين مستقلين.]),
  ([`FeeRateBps` ليه `int`؟],
   [لأنه بالـ basis points (١ من ١٠٠٠٠)، وتخزينه عدد صحيح بيمنع أخطاء التقريب.]),
  ([ليه العمولة متجمّدة على الصف بدل ما تتحسب وقت العرض؟],
   [عشان لو النسبة اتغيّرت بعدين، المعاملة القديمة تفضل بالرقم اللي اتدفع فعلًا.]),
  ([إيه الفرق بين حماية الفهرس الفريد وحماية `RowVersion`؟],
   [الفهرس بيمنع صفوف متعارضة تتولد؛ `RowVersion` بيمنع تعديلين متزامنين على نفس الصف.]),
))

= Queries: From LINQ to SQL

إنت مش بتكتب SQL في المشروع ده — بتكتب LINQ و EF Core بيترجم. وعشان كده لازم
تعرف الترجمة بتحصل إمتى وإزاي، لأن ده أكتر مكان بتحصل فيه مشاكل أداء.

== Deferred Execution

```csharp
var q = _context.Projects.Where(p => p.Stage == "Seed");   // لسه مفيش SQL
var list = await q.ToListAsync();                          // هنا بقى اتنفّذ
```

الاستعلام مبيروحش لقاعدة البيانات لحد ما تطلب النتيجة فعلًا
(`ToListAsync`, `FirstOrDefaultAsync`, `CountAsync`...). ده اسمه
*deferred execution*، وفايدته إنك تقدر تركّب شروط على بعض والـ SQL يتولّد مرة واحدة.

== Tracking and No-Tracking

بشكل افتراضي EF Core بيفضل *متتبّع* لكل كيان قراه، عشان يعرف يحفظ التعديلات.
لكن لو إنت بتقرا للعرض بس، ده شغل زيادة وذاكرة زيادة:

```csharp
await _context.Projects.AsNoTracking().ToListAsync();
```

#keypoint[
  القاعدة العملية: *بتقرا عشان تعرض؟* استخدم `AsNoTracking()`.
  *بتقرا عشان تعدّل وتحفظ؟* سيبه متتبّع.
]

== The N+1 Problem

أشهر مشكلة أداء في أي ORM:

```csharp
var projects = await _context.Projects.ToListAsync();
foreach (var p in projects)
{
    var owner = p.Owner;   // استعلام لكل مشروع!
}
```

مية مشروع = مية واحد استعلام. الحل: تجيب المطلوب في استعلام واحد بـ `Include`
أو — الأحسن — بـ *إسقاط* (projection) على الأعمدة اللي محتاجها بس:

```csharp
await _context.Projects
    .Select(p => new { p.Id, p.Title, OwnerName = p.Owner.UserName })
    .ToListAsync();
```

#warn[
  الإسقاط أحسن من `Include` في معظم شاشات العرض، لأن `Include` بيجيب *كل*
  أعمدة الكيان المرتبط — وده في مشروعنا ممكن يجيب أعمدة `varbinary` فيها صور،
  وده تحميل ثقيل بلا أي داعي.
]

== Translation Isn't Always Possible

لو كتبت في الـ `Where` دالة `C#` مبيعرفش يترجمها، EF Core إما يرمي استثناء أو
(في إصدارات قديمة) يجيب الصفوف كلها ويفلتر في الذاكرة. اعرف إن الشرط لازم
يكون قابل للترجمة لـ SQL.

#selftest((
  ([امتى الاستعلام بيروح لقاعدة البيانات فعلًا؟],
   [لما تطلب النتيجة — `ToListAsync` أو `FirstOrDefaultAsync` وخلافه. قبل كده هو مجرد وصف.]),
  ([امتى تستخدم `AsNoTracking()`؟],
   [لما تقرا للعرض بس من غير نيّة تعديل — بيوفّر ذاكرة وشغل تتبّع.]),
  ([إيه هي مشكلة N+1 وإزاي تحلّها؟],
   [استعلام لكل عنصر في حلقة. الحل: `Include` أو إسقاط بـ `Select` على الأعمدة المطلوبة بس.]),
  ([ليه الإسقاط أحسن من `Include` في شاشة عرض؟],
   [لأن `Include` بيجيب كل أعمدة الكيان، وممكن يجيب أعمدة صور ثقيلة من غير داعي.]),
))

= Inheritance: Three User Types, One Table

== What Actually Happens

في الكود عندك تلات كلاسات: `Investor` و `Innovator` و `Admin`، وكلهم بيورثوا
من `User`. في قاعدة البيانات فيه *جدول واحد* اسمه `Users`.

```csharp
modelBuilder.Entity<User>()
    .HasDiscriminator<string>("UserType")
    .HasValue<Investor>("Investor")
    .HasValue<Innovator>("Innovator")
    .HasValue<Admin>("Admin");
```

الاستراتيجية دي اسمها *TPH* اختصار Table-Per-Hierarchy: كل الهرم في جدول واحد،
وعمود إضافي اسمه `UserType` بيقول الصف ده نوعه إيه.

#codemap((
  ("Data/AppDbContext.cs", [إعداد الـ discriminator — جوّه `OnModelCreating`، دوّر على `HasDiscriminator`]),
  ("Data/Models/User.cs", [الكلاس الأب]),
  ("Data/Models/Investor.cs", [النوع الوارث — المستثمر]),
  ("Data/Models/Innovator.cs", [النوع الوارث — المؤسّس]),
))

#keypoint[
  عمود `UserType` مش عمود عادي إنت بتكتب فيه — ده *discriminator*. EF Core
  بيملاه لوحده لما تعمل `new Investor()`، وبيستخدمه لوحده لما تعمل
  `_context.Investors.ToList()` فيضيف `WHERE UserType = 'Investor'` تلقائيًا.
]

== Why TPH, Not a Table per Type

#figure(
  table(
    columns: (auto, 1fr, 1fr),
    align: (right + top, right + top, right + top),
    table.header([الاستراتيجية], [الميزة], [التكلفة]),
    [TPH (اللي احنا مستخدمينه)],
      [استعلام واحد من غير `JOIN`. المصادقة والرسائل والمتابعة بتشتغل على `User` من غير ما تعرف النوع.],
      [أعمدة الأنواع المختلفة لازم تكون nullable في الجدول المشترك.],
    [TPT (جدول لكل نوع)],
      [كل عمود في مكانه الصح، مفيش `NULL` زيادة.],
      [كل قراءة لمستخدم = `JOIN`. والمصادقة بتقرا مستخدم في كل طلب.],
  ),
  caption: [المقارنة اللي على أساسها اتاخد القرار.],
)

#warn[
  التكلفة الحقيقية لـ TPH إن أعمدة زي `PreferredIndustries` و `TicketMin`
  و `TicketMax` (بتاعة `Investor` بس) موجودة في نفس الجدول وبتبقى `NULL`
  عند المؤسّس والأدمن. ده *مقصود ومقبول*، مش إهمال — ولو اتسألت عنه قول كده
  بالظبط بدل ما تحاول تبرّره.
]

#selftest((
  ([`Admin` مالوش `DbSet`. إزاي تجيبه؟],
   [`_context.Users.OfType<Admin>()` — أو من خلال الـ discriminator مباشرة.]),
  ([ليه اخترنا TPH مش TPT؟],
   [لأن كل طلب مصادَق عليه بيقرا المستخدم، و TPT كان هيحوّل كل قراءة دي لـ `JOIN` بلا داعي.]),
  ([`TicketMin` بتبقى إيه في صف مؤسّس؟],
   [`NULL` — وده الثمن المقبول لـ TPH.]),
))

= Soft Delete: The Row Stays, It Just Disappears

== The Problem

قاعدة رقم ٩ في `AGENTS.md` بتقول: *ممنوع تمسح صف علاقة عند الرفض — غيّر
`Status` و `Stage` لـ `Declined`*. والسبب مش تقني، السبب إن بيانات الطرفين
مشتركة: التزام مستثمر وسجلّ مؤسّس بمين دعمه — دول حقائق مشتركة، وخروج طرف
مينفعش يمسح نسخة الطرف التاني.

== The Fix: A Column Plus a Global Filter

```csharp
modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
modelBuilder.Entity<Project>().HasQueryFilter(p => !p.IsDeleted);
```

السطرين دول من أخطر سطرين في المشروع كله. معناهم إن *أي* استعلام على `Users`
أو `Projects` في أي مكان في التطبيق بيضاف له `WHERE IsDeleted = 0` تلقائيًا،
من غير ما اللي كاتب الاستعلام يفتكر.

#codemap((
  ("Data/AppDbContext.cs", [السطرين نفسهم — جوّه `OnModelCreating`، دوّر على `HasQueryFilter`]),
  ("Data/Models/User.cs", [الخاصية `IsDeleted` و `DeletedAtUtc`]),
  ("Data/Models/Project.cs", [الخاصية `IsDeleted`]),
))

#keypoint[
  الفلتر العام + غياب طبقة repository = تركيبة قوية. لأن كل المتحكّمات بتكلّم
  `AppDbContext` مباشرة، مفيش طريق يلتفّ حوالين الفلتر بالغلط. لو كان فيه
  repositories، كان ممكن حد يكتب استعلام خام يفوّت الفلتر.
]

#warn[
  جدولين بس عندهم فلتر عام: `User` و `Project`. باقي الجداول لأ. فلو اتسألت
  «هل كل حاجة عندكم soft delete؟» الإجابة الأمينة: *لأ* — الحذف الناعم على
  المستخدم والمشروع، والباقي بيتحمي بسلوك الحذف (`Restrict`/`NoAction`) مش بفلتر.
]

== How to Bypass the Filter When You Need To

الأدمن أحيانًا محتاج يشوف المحذوف:

```csharp
_context.Users.IgnoreQueryFilters().Where(u => u.IsDeleted)
```

#selftest((
  ([كام جدول عنده global query filter؟ وإيه هما؟],
   [اتنين بس: `User` و `Project`، والاتنين على `!IsDeleted`.]),
  ([ليه مبنمسحش صف العلاقة عند الرفض؟],
   [لأن البيانات مشتركة بين طرفين — قاعدة ٩ في `AGENTS.md`. بنغيّر `Status` و `Stage` لـ `Declined`.]),
  ([إزاي الأدمن يشوف حساب متمسوح؟],
   [`IgnoreQueryFilters()` على الاستعلام.]),
))

= Indexes: Speed, and Something More Important Than Speed

الفهرس في المشروع ده بيعمل حاجتين مختلفتين تمامًا. الأولى معروفة: يسرّع
الاستعلام. التانية أهم بكتير في مشروعنا: *يمنع حالة مستحيلة من إنها تحصل أصلًا*.

== Type One: Performance Indexes

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([الفهرس], [بيخدم إيه]),
    [`Project(ModerationStatus, LifecycleStatus, CreatedDate)`],
      [استعلام التصفّح العام: هات المشاريع المعتمدة والنشطة مرتّبة بالأحدث. ده أكتر استعلام بيتنفّذ في المنتج.],
    [`Project(Stage)`], [الفلترة بالمرحلة في صفحة الاستكشاف.],
    [`Investment(ProjectId, Status)`], [حساب أرقام التمويل لمشروع.],
    [`Investment(InvestorId, Stage)`], [لوحة المستثمر: علاقاتي وأنا فين فيها.],
    [`PaymentTransaction(ProjectId, Status)`], [جمع المبالغ المموّلة فعليًا لمشروع.],
    [`SecurityLog(UserId, CreatedAtUtc)`], [السجلّ الأمني لمستخدم مرتّب زمنيًا.],
    [`Message(ProjectId, SentAt)`], [محادثات مربوطة بمشروع معيّن.],
    [`SavedSearch(UserId, Scope)`], [عمليات البحث المحفوظة للمستخدم.],
  ),
  caption: [فهارس بتخدم استعلامات حقيقية موجودة في المنتج.],
)

== Type Two: Indexes That Enforce Rules

دي اللي لازم تحفظها كويس. الفكرة اسمها *filtered unique index* — فهرس فريد
بشرط. يعني: «العمود ده لازم يكون فريد، *بس* في الصفوف اللي بتحقّق الشرط ده».

#keypoint[
  ليه ده أقوى من فحص في الكود؟ لأن الكود ممكن يخسر السباق. لو اتنين ضغطوا
  «ادفع» في نفس الجزء من الثانية، الاتنين ممكن يقروا «مفيش دفعة ناجحة» في نفس
  اللحظة وبعدين الاتنين يكتبوا. الفهرس بيتنفّذ جوه المحرّك نفسه — الصف التاني
  بيترفض، مفيش سباق.
]

الكود نفسه مرقّم القيود الأربعة في `ConfigureFunding`:

#codemap((
  ("Data/AppDbContext.cs", [الميثود `ConfigureFunding` — كل القيود الأربعة جوّاها، وكل واحد فوقه تعليق برقمه]),
  ("Data/AppDbContext.cs", [ابحث عن `HasFilter` عشان تلاقي كل الفهارس المفلترة]),
))

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([القيد], [بيمنع إيه]),
    [`UX_FundingRequests_OneOpenPerInvestment`],
      [طلبين تمويل مفتوحين لنفس العلاقة — اللي كان هيخلّي نفس الصفقة تتموّل مرتين.],
    [`UX_PaymentTransactions_OneActivePerRequest`],
      [محاولتين دفع شغّالين في نفس الوقت لنفس الطلب.],
    [`UX_PaymentTransactions_OneSucceededPerRequest`],
      [*الأهم.* دفعتين ناجحتين لنفس الطلب. حتى لو كل الحمايات التانية فشلت، قاعدة البيانات نفسها بترفض تسجّل نفس التمويل مرتين.],
    [`UX_PaymentEvents_ProviderEventId`],
      [نفس الحدث من المزوّد يتطبّق مرتين — ويبهوك متكرّر، أو ويبهوك سابق رجوع المستخدم من صفحة الدفع.],
  ),
  caption: [القيود الأربعة اللي شايلة سلامة النظام المالي.],
)

وفيه اتنين كمان بره مجموعة التمويل:

- `UX_Investments_OneLivePerInvestor` — بشرط
  `[InvestorId] IS NOT NULL AND [Status] IN ('Pending','Approved')`:
  مستثمر واحد مايقدرش يكون عنده علاقتين حيّتين مع نفس المشروع.
- `UX_TermSheets_OneLivePerInvestment` — بشرط `[Status] = 'Proposed'`:
  ورقة شروط واحدة معروضة في المرة. اتنين معروضين = اتفاقين كل واحد بيدّعي إنه الصفقة.

#example("إزاي تقرا فهرس مفلتر")[
  ```csharp
  modelBuilder.Entity<PaymentTransaction>()
      .HasIndex(t => t.FundingRequestId, "UX_PaymentTransactions_OneSucceededPerRequest")
      .IsUnique()
      .HasFilter($"[Status] = '{PaymentStatus.Succeeded}'");
  ```

  اقراها كده: «على جدول `PaymentTransactions`، خلّي `FundingRequestId` فريد —
  بس بُصّ على الصفوف اللي حالتها `Succeeded` بس.»

  يعني ممكن يبقى فيه عشر محاولات فاشلة لنفس الطلب (عادي، ومطلوب)، لكن *ناجحة
  واحدة بالظبط*.
]

#warn[
  في الكود فيه فهرسين على نفس العمود `FundingRequestId` بأسماء صريحة. الاسم
  الصريح ده *مش رفاهية*: EF Core بيميّز الفهارس بقايمة الأعمدة، فلو الاتنين
  من غير اسم كانوا هيندمجوا في واحد والتاني يضيع بالصمت — وده كان هيضيّع قيد
  الفلوس بيعتمد عليه. ده تعليق مكتوب حرفيًا في الكود، ونقطة ممتازة تقولها.
]

#selftest((
  ([إيه الفرق بين فهرس فريد عادي وفهرس فريد مفلتر؟],
   [العادي بيطبّق التفرّد على كل الصفوف. المفلتر بيطبّقه على الصفوف اللي بتحقّق شرط `HasFilter` بس.]),
  ([ليه القيد على الدفع في قاعدة البيانات مش في الكود؟],
   [لأن الكود ممكن يخسر سباق (race condition) لو طلبين وصلوا في نفس اللحظة. القيد في المحرّك نفسه مبيخسرش.]),
  ([ينفع يبقى فيه ٥ محاولات دفع فاشلة لنفس الطلب؟],
   [أيوه، وده مطلوب. القيد على الحالة `Succeeded` بس — الفاشلة مش داخلة في الفلتر.]),
  ([ليه الفهرسين على `FundingRequestId` ليهم أسماء صريحة؟],
   [لأن EF Core بيميّز الفهارس بأعمدتها؛ من غير أسماء كانوا هيندمجوا وواحد يضيع بالصمت.]),
))

= Two Rules That Never Break

في `AGENTS.md` قاعدتين اسمهم عليك إنت مباشرة. اعرفهم بالنص.

== Rule One: Every Date Is UTC

الوقت بيتخزّن UTC دايمًا، والتحويل للتوقيت المحلّي بيحصل في الواجهة بس.
السبب: المستخدمين ممكن يكونوا في مناطق زمنية مختلفة، ولو خزّنّا التوقيت
المحلّي، مقارنة تاريخين بتبقى بلا معنى.

الأسماء نفسها بتقول ده: `CreatedAtUtc`, `SucceededAtUtc`, `OnboardedAtUtc`,
`DeletedAtUtc`. اللاحقة `Utc` جزء من الاسم عشان محدش يلخبط.

== Rule Two: Every Money Column Is `HasPrecision(18, 2)`

```csharp
modelBuilder.Entity<Investment>()
    .Property(i => i.Amount)
    .HasPrecision(18, 2)
    .IsRequired();
```

#warn[
  لو نسيت السطر ده، SQL Server بيرجع لـ `decimal(18,0)` — يعني *بيقصّ الكسور
  بالصمت*. مبلغ ٢٥٠٠٫٧٥ بيتخزّن ٢٥٠٠. مفيش خطأ، مفيش تحذير، الفلوس بس بتختفي.
  ده مكتوب حرفيًا كتعليق في `AppDbContext`.
]

#codemap((
  ("Data/AppDbContext.cs", [كل استدعاءات `HasPrecision` — ابحث عن الكلمة تلاقيهم كلهم]),
  ("Data/AppDbContext.cs", [الميثود `ConfigureFunding` — دقّة أعمدة التمويل والدفع]),
  ("Services/UtcDateTimeConverter.cs", [آلية فرض الـ UTC]),
))

الأعمدة اللي عليها دقّة صريحة:

#figure(
  table(
    columns: (auto, auto, 1fr),
    align: (right + top, right + top, right + top),
    table.header([العمود], [الدقّة], [ملاحظة]),
    [`Investment.Amount`], [`18,2`], [المبلغ الملتزَم به.],
    [`Project.InvestmentNeeded`], [`18,2`], [هدف الجولة.],
    [`Project.Valuation`], [`18,2`], [التقييم.],
    [`Project.EquityOffered`], [`5,2`], [نسبة مئوية — مش محتاجة ١٨ خانة.],
    [`Investor.TicketMin` / `TicketMax`], [`18,2`], [نطاق تذكرة المستثمر.],
    [`TermSheet.Amount` / `Valuation`], [`18,2`], [شروط الصفقة.],
    [`TermSheet.EquityPct`], [`7,4`], [*انتبه:* دقّة مختلفة عن كل اللي فوق.],
    [`FundingRequest.Amount` / `CounterAmount`], [`18,2`], [الطلب والعرض المضاد.],
    [`PaymentTransaction.Amount`], [`18,2`], [المبلغ.],
    [`PaymentTransaction.FeeAmount`], [`18,2`], [العمولة.],
    [`PaymentTransaction.NetToFounder`], [`18,2`], [الصافي للمؤسّس.],
  ),
  caption: [كل عمود فلوس ودقّته.],
)

#keypoint[
  `TermSheet.EquityPct` بـ `(7,4)` مش `(18,2)` — وده سؤال ممتاز ممكن يتسألك.
  السبب مكتوب في الكود: نسبة زي ٪١٢٫٣٧٥ لو اتخزّنت بخانتين عشريتين هتتقرّب
  لـ ٪١٢٫٣٨ — يعني حصّة حد في شركة اتغيّرت بالصمت. النسبة محتاجة خانات عشرية
  أكتر من المبلغ، مش أقل.
]

#selftest((
  ([إيه اللي بيحصل لو نسيت `HasPrecision` على عمود فلوس؟],
   [SQL Server بيستخدم `decimal(18,0)` ويقصّ الكسور من غير أي خطأ — الفلوس بتضيع بالصمت.]),
  ([ليه `EquityPct` دقّتها `7,4` مش `18,2`؟],
   [عشان النِّسَب محتاجة خانات عشرية أكتر؛ التقريب لخانتين بيغيّر حصّة حقيقية.]),
  ([ليه كل أسماء التواريخ منتهية بـ `Utc`؟],
   [عشان الاسم نفسه يمنع اللبس — كل تاريخ متخزّن UTC والتحويل في الواجهة بس.]),
))

= Migrations: The Schema's History

== The Idea

الترحيل (migration) هو ملف بيوصف *التغيير* بين شكل السكيما القديم والجديد.
كل ملف فيه دالتين: `Up()` بتطبّق التغيير، و `Down()` بتلغيه.

```bash
dotnet ef migrations add AddUserOnboardedAt
```

الأمر ده بيقارن الكلاسات بآخر لقطة (snapshot) محفوظة، وبيولّد الفرق. يعني إنت
*مش* بتكتب الترحيل بإيدك — إنت بتغيّر الكلاس والأداة بتولّد الفرق، وشغلك إنك
*تراجع* اللي اتولّد قبل ما يتطبّق.

== The Mechanism Inside: Three Things You Must Know

كل ترحيل بيتعامل مع تلات حاجات مختلفة، ولو مفهمتهمش هتتلخبط أول مرة يحصل تعارض.

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([الحاجة], [إيه هي ودورها]),
    [ملفات الترحيل\ `Migrations/*.cs`],
      [الملف اللي فيه `Up()` و `Down()`. ده اللي بيتنفّذ. بيتحفظ في Git وبيتشارك مع الفريق.],
    [اللقطة\ `AppDbContextModelSnapshot.cs`],
      [صورة كاملة للشكل الحالي للموديل. EF بيقارن كلاساتك بيها عشان يعرف الفرق. ملف متولّد — *متعدّلوش بإيدك*.],
    [جدول التاريخ\ `__EFMigrationsHistory`],
      [جدول *جوّه قاعدة البيانات* نفسها، فيه أسماء الترحيلات اللي اتطبّقت. ده اللي بيخلّي EF يعرف إيه اللي ناقص.],
  ),
  caption: [تلات حاجات، كل واحدة في مكان مختلف.],
)

#keypoint[
  الفكرة المهمة: `dotnet ef database update` بيقرا جدول `__EFMigrationsHistory`
  في القاعدة، بيشوف إيه اللي اتطبّق، ويطبّق الناقص بالترتيب. عشان كده *اسم*
  الترحيل جزء من هويته — لو غيّرت اسم ترحيل اتطبّق خلاص، EF هيفتكره ترحيل جديد
  ويحاول يطبّقه تاني.
]

== Why Conflicts Happen

تخيّل السيناريو ده:

+ إنت ولّدت ترحيل `A`. اللقطة اتحدّثت عندك.
+ زميلك ولّد ترحيل `B` من نفس الأساس القديم. اللقطة اتحدّثت عنده.
+ الاتنين عملتوا `push`.

النتيجة: تعارض في `AppDbContextModelSnapshot.cs` (ملف واحد اتعدّل في مكانين)،
وكمان ترحيل `B` مبني على أساس مش شايف `A`.

#warn[
  حلّ التعارض في ملف اللقطة يدويًا *فكرة سيئة* — الملف كبير ومتولّد.
  الحل العملي الأسلم: واحد بس في الفريق هو اللي يولّد الترحيلات (وده إنت).
  أي حد عايز تغيير في السكيما، يقولك وإنت تعمله. ده مش تحكّم — ده تجنّب
  لمشكلة تكلفتها أكبر بكتير من التنسيق.
]

== The Safest Command You Have

```bash
dotnet ef migrations script
```

بيطبع الـ SQL اللي هيتنفّذ، على الشاشة، من غير ما يلمس القاعدة. استخدمه
قبل أي `database update` عشان تشوف بعينك التغيير الحقيقي على مستوى SQL —
مش على مستوى `C#`.

== All Twenty-Six Migrations

الجدول ده بالترتيب الزمني الحقيقي. مش مطلوب تحفظه — مطلوب تعرف تقرا منه لو
اتسألت «امتى دخل كذا؟».

#figure(
  table(
    columns: (auto, auto, 1fr),
    align: (right + top, right + top, right + top),
    table.header([\#], [الترحيل], [أضاف إيه]),
    [١], [`initialCraete`], [الأساس: `Users`, `Projects`, `Investments`, `Messages`, `Comments`, `Replies`, `Notifications`. *الاسم فيه غلطة إملائية مقصود إنها تتساب.*],
    [٢], [`Phase4ProductionAuthSecurity`], [`RefreshTokens`, `SecurityLogs`، وأعمدة تأكيد الإيميل والقفل بعد المحاولات الفاشلة.],
    [٣], [`Phase5SearchAndProjectImages`], [`ProjectImages`، وحقول البحث على المشروع: `Category`, `Industry`, `Location`.],
    [٤], [`AddInvestmentApprovalStatus`], [عمود `Investment.Status` — بوابة التمويل.],
    [٥], [`AddBookmarks`], [`Bookmarks` بقيد فريد `(UserId, ProjectId)`.],
    [٦], [`AddUpdatesAndMilestones`], [`ProjectUpdates`, `ProjectUpdateImages`, `Milestones`.],
    [٧], [`AddTeamAndDocuments`], [`TeamMembers`, `ProjectDocuments`.],
    [٨], [`AddFollowsAndProfileMedia`], [`Follows` بقيد فريد، وعمود `CoverImage`.],
    [٩], [`AddMessageIsRead`], [عمود `Message.IsRead` — أساس عدّاد غير المقروء.],
    [١٠], [`AddModerationAndAnalytics`], [`ModerationStatus`, `Reports`, `ProjectViews`, `Reviews`, `AdminAuditLogs`.],
    [١١], [`AddSocialLinksAndInvestorInterests`], [روابط التواصل، و `PreferredIndustries`.],
    [١٢], [`AddTeamMemberEmail`], [عمود `TeamMember.Email`.],
    [١٣], [`AddLastSeenAndMessageAttachments`], [`LastSeenAt`، وجدول `MessageAttachments`.],
    [١٤], [`FixesPass1_ModerationDecimalContactAudit`], [*مهم:* ضبط الدقّة العشرية على أعمدة الفلوس، و `ContactInfo`، وسجلّ التدقيق، والحذف الناعم.],
    [١٥], [`Phase2_InvestmentPipeline`], [عمود `Investment.Stage`، والملاحظات الخاصة، و `DocumentDownloadLogs`.],
    [١٦], [`Phase5_SuspensionAndModerationNotes`], [`IsSuspended`, `ModerationNote`.],
    [١٧], [`Phase6_VentureLifecycle`], [`LifecycleStatus` وأعمدة إغلاق الجولة.],
    [١٨], [`BrowseDiscoveryIndexes`], [فهارس التصفّح المركّبة — أداء بحت.],
    [١٩], [`InvestorProfileThesisAndTicket`], [`InvestmentThesis`, `TicketMin`, `TicketMax`, `ListedInDirectory`.],
    [٢٠], [`NotificationPrefsAndSelfDelete`], [`NotifyOn*`, `DeletedAtUtc`.],
    [٢١], [`ExpansionRelationshipWorkspace`], [`DealQuestions`, `DocumentRequests`, `SavedSearches`، والرسائل المرتبطة بمشروع. وكمان شال جدولي `Payments` و `ProjectAnalyses` القدام.],
    [٢٢], [`FundingRequestsAndSandboxPayments`], [*أهم ترحيل مالي:* `FundingRequests`, `PaymentTransactions`, `PaymentEvents` + القيود الأربعة.],
    [٢٣], [`AddUserOnboardedAt`], [عمود `User.OnboardedAtUtc` — أصغر ترحيل، وأوضح مثال على التغيير الآمن.],
    [٢٤], [`OneLiveInvestmentPerInvestor`], [القيد `UX_Investments_OneLivePerInvestor`.],
    [٢٥], [`StageHistoryRemindersAndReconciliation`], [`InvestmentStageEvents`, `FundingRequest.RemindersSent`، وأعمدة مراجعة `PaymentEvent`.],
    [٢٦], [`TermSheetsCounterOffersAndTwoWayDocs`], [`TermSheets`، والعروض المضادة والشرائح، و `DealQuestion.ParentQuestionId`.],
  ),
  caption: [الستة وعشرون ترحيلًا بالترتيب الزمني.],
)

#keypoint[
  تلات ترحيلات تستاهل تعرفهم بالاسم لو اتسألت:

  - *رقم ١٤* — لأنه بيثبت إن الدقّة العشرية اتضبطت بعد ما اتنسيت، يعني القاعدة اتطبّقت بأثر رجعي.
  - *رقم ٢٢* — لأنه اللي جاب النظام المالي كله والقيود الأربعة.
  - *رقم ٢٣* — لأنه أصغر واحد وأوضح مثال على الترحيل الآمن.
]

#warn[
  اسم الترحيل الأول `initialCraete` فيه غلطة إملائية (`Craete` بدل `Create`).
  *متصلّحهاش.* اسم الترحيل جزء من هويته في جدول `__EFMigrationsHistory`، وتغييره
  بيكسر التتبّع عند كل حد في الفريق. لو اتسألت عنها قول إنها معروفة ومتسابة عن قصد.
]

= A Shared Database: The Risk and the Discipline

== The Problem

`AGENTS.md` بيقول بالنص: *قاعدة البيانات بعيدة ومشتركة. متشغّلش
`dotnet ef database update` من غير ما تقول.* معنى ده إن الأمر اللي بتكتبه إنت
على جهازك بيغيّر القاعدة اللي الستة أعضاء شغّالين عليها في نفس اللحظة.

مفيش نسخة محلّية. مفيش «أجرّب الأول عندي».

== Checklist Before You Apply

+ *ولّد الترحيل بس، متطبّقش.* `dotnet ef migrations add <Name>`
+ *افتح الملف واقراه سطر سطر.* شوف `Up()` بيعمل إيه بالظبط.
+ *اسأل: هل ده إضافي بس؟* إضافة عمود nullable أو جدول جديد = آمن. حذف عمود
  أو تغيير نوع أو إضافة عمود `NOT NULL` من غير قيمة افتراضية = خطر على بيانات موجودة.
+ *اقرا `Down()`.* لو مفيش طريق رجوع نضيف، فكّر تاني.
+ *قول للفريق.* قبل، مش بعد.
+ *طبّق.* `dotnet ef database update`

== The Real Example: `AddUserOnboardedAt`

ده ترحيل اتعمل فعلًا في المشروع، وهو أحسن مثال تشرح بيه القائمة اللي فوق.

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.AddColumn<DateTime>(
        name: "OnboardedAtUtc",
        table: "Users",
        type: "datetime2",
        nullable: true);
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropColumn(
        name: "OnboardedAtUtc",
        table: "Users");
}
```

#example("ليه اتحكم عليه إنه آمن")[
  - *عمود واحد بس*، ومفيش أي تغيير تاني اتسرّب في الترحيل (ده اتراجع فعليًا قبل التطبيق).
  - *nullable*: الصفوف الموجودة كلها بتاخد `NULL` من غير ما حد يلمسها، ومن غير قيمة افتراضية مخترعة.
  - *مبيكسرش الكود الشغّال*: أي نسخة قديمة من التطبيق شغّالة عند زميلك مش بتعرف العمود ده أصلًا، فمش هتتأثر.
  - *`Down()` نضيفة*: بيشيل العمود، خلاص. الرجوع ممكن.
]

#codemap((
  ("Migrations/20260809201317_AddUserOnboardedAt.cs", [الترحيل نفسه — `Up()` و `Down()`]),
  ("Data/Models/User.cs", [الخاصية `OnboardedAtUtc` والتعليق اللي فوقها]),
  ("Migrations/AppDbContextModelSnapshot.cs", [اللقطة اللي EF بيقارن بيها — متعدّلهاش بإيدك]),
))

#keypoint[
  الفرق بين عمود `nullable` وعمود `NOT NULL` مع قيمة افتراضية مش تفصيلة أسلوب.
  `nullable` معناه «الحقيقة دي مش معروفة لصفوف قديمة» — وده الصح هنا، لأن
  المستخدمين القدام فعلًا *مش معروف* هما خلّصوا الأونبوردنج امتى.
  `NOT NULL DEFAULT GETUTCDATE()` كان هيكذب: كان هيقول إن كل المستخدمين
  القدام خلّصوا الأونبوردنج لحظة الترحيل.
]

= File Storage: Why the Bytes Live in the Database

ده قرار في السكيما، فهو شغلك، وهو كمان *مقايضة معروفة وموثّقة* — يعني سؤال
متوقّع جدًا.

== The Current Setup

كل الصور والمستندات في المشروع متخزّنة كأعمدة `varbinary(max)` جوّه قاعدة
البيانات نفسها:

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([المكان], [إيه اللي متخزّن]),
    [`User.ProfileImage`], [صورة الحساب.],
    [`User.CoverImage`], [صورة الغلاف.],
    [`ProjectImage.ImageData`], [صور المشروع.],
    [`ProjectUpdateImage`], [صور تحديثات المشروع.],
    [`ProjectDocument`], [مستندات غرفة البيانات.],
    [`MessageAttachment.Data`], [مرفقات الرسائل.],
  ),
  caption: [كل مكان فيه بايتس ملفات في السكيما.],
)

== The Alternative That Wasn't Used

الطريقة الاحترافية في الإنتاج: تخزّن الملف في خدمة تخزين خارجية
(S3 أو Azure Blob) وتحفظ في القاعدة *الرابط* بس.

#figure(
  table(
    columns: (auto, 1fr, 1fr),
    align: (right + top, right + top, right + top),
    table.header([], [بايتس في القاعدة (وضعنا)], [تخزين خارجي]),
    [حجم القاعدة], [بيكبر بسرعة], [بيفضل صغير],
    [النسخ الاحتياطي], [بطيء وتقيل], [خفيف],
    [الذاكرة عند التنزيل], [الملف بيتحمّل في الذاكرة], [بيتسحب من الخدمة مباشرة],
    [التعقيد], [صفر — مفيش خدمة تانية], [محتاج حساب وإعداد ومفاتيح],
    [النسخ الذرّي], [الملف والصف بيتحفظوا في معاملة واحدة], [ممكن يحصل صف بلا ملف],
  ),
  caption: [المقايضة بالتفصيل.],
)

#keypoint[
  الإجابة الأمينة لو اتسألت: «إحنا عارفين إن ده مش الاختيار الصح للإنتاج.
  اخترناه لأن التخزين الخارجي بره نطاق المشروع — كان هيحتاج حساب سحابي
  ومفاتيح وإدارة، والمقابل مش مستحق في مشروع تخرّج. والمكسب إن الملف والصف
  بيتحفظوا في معاملة واحدة، فمستحيل يبقى فيه صف مستند بلا ملف.»

  ودي مقايضة *مكتوبة* في `docs/09-STATUS.md` كحدّ معروف — مش حاجة اكتشفتها اللجنة.
]

#warn[
  متحاولش تدافع عن `varbinary` كإنه الاختيار الأفضل تقنيًا — مش هو. الدفاع
  الصح إنه اختيار *مناسب للنطاق* مع معرفة كاملة بتكلفته. الفرق بين الإجابتين
  هو الفرق بين طالب فاهم وطالب بيبرّر.
]

= Known Limitations in Your Area

الفصل ده أهم من أي فصل تاني في لحظة واحدة: لما اللجنة تسأل «إيه العيوب؟».
اللي بيعرف عيوب شغله بيبان إنه فاهمه.

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([الحدّ], [الوضع والتبرير]),
    [قاعدة واحدة مشتركة],
      [مفيش نسخة محلّية لكل مطوّر. أي ترحيل بيمسّ الفريق كله فورًا. الانضباط التنظيمي هو الحماية الوحيدة.],
    [الملفات جوّه القاعدة],
      [`varbinary(max)` — مقايضة مقصودة، الفصل اللي فات.],
    [مفيش اختبارات على القاعدة],
      [الـ ٤٨ اختبار كلهم على منطق الحسابات والمراحل، ومبيلمسوش قاعدة بيانات. القيود والفهارس اللي كتبتها *مش* مغطّاة باختبار — فجوة موثّقة في `docs/09-STATUS.md`.],
    [الحذف الناعم جزئي],
      [على `User` و `Project` بس. الباقي محمي بسلوك الحذف مش بفلتر.],
    [مفيش صلاحيات دقيقة],
      [الأدوار خشنة (`Investor`/`Innovator`/`Admin`) وبس.],
  ),
  caption: [حدود حقيقية، كل واحد وسببه.],
)

#keypoint[
  لو اتسألت «إيه أهم حاجة ناقصة في شغلك؟» أقوى إجابة أمينة: *اختبارات
  integration على القيود المالية.* القيود الأربعة اللي شايلة سلامة الفلوس
  مبنية صح، لكن مفيش اختبار بيحاول يكسرها ويتأكد إنها بترفض. ده أول حاجة
  كنت هعملها لو فيه وقت إضافي.
]

= Explaining the ERD in 5 Minutes

ده سيناريو كلام تقوله بصوتك قدام الدكتور وإنت فاتح الرسمة. مقسّم بالوقت.
كل اللي فيه اتشرح في الفصول اللي فاتت — ده ترتيبه للكلام مش معلومات جديدة.

#keypoint[
  القاعدة الذهبية: *ابدأ بالمركز، مش بالتفاصيل.* أسوأ حاجة تعملها إنك تبدأ
  تعدّ الجداول واحد واحد. ابدأ بالكيانات التلاتة اللي المنتج قايم عليهم،
  وبعدين وسّع.
]

== Minute One: The Big Picture

«المخطط قايم على تلات كيانات أساسية:

*`User`* — المستخدم. وده مقسّم لتلات أنواع: مستثمر ومؤسّس وأدمن، بس كلهم في
*جدول واحد* بعمود اسمه `UserType` بيميّز بينهم. الاستراتيجية دي اسمها TPH.

*`Project`* — المشروع اللي المؤسّس بينشره.

*`Investment`* — العلاقة بين مستثمر ومشروع. ودي *مش جدول ربط عادي* — دي كيان
كامل ليه حالة ومرحلة وتاريخ وملاحظات.»

== Minute Two: Why `Investment` Isn't a Join Table

«لو كانت مجرد ربط، كانت هتبقى عمودين وخلاص. لكن عندها:

- `Status` — بوابة الفلوس: `Pending`, `Approved`, `Declined`.
- `Stage` — مرحلة العلاقة بين الطرفين، وعندنا تمان مراحل.

والاتنين دول *محورين مستقلين*: علاقة ممكن تكون `Approved` — يعني الفلوس
محسوبة — وفي نفس الوقت `InDiscussion` يعني لسه بيتكلموا.»

#warn[
  لو الدكتور قاطعك هنا وسأل «ليه مدمجتوهمش؟» — الإجابة جاهزة: «لأنهم بيقيسوا
  حاجتين مختلفتين. الدمج كان هيخلّي مستحيل تعرف رقم التمويل من غير ما تقرا
  سياق المحادثة.»
]

== Minute Three: The Money Chain

«لما الطرفين يتفقوا، بتبدأ سلسلة من أربع خطوات:

`Investment` ← `TermSheet` ← `FundingRequest` ← `PaymentTransaction` ←
`PaymentEvent`

- *`TermSheet`* — الشروط المكتوبة اللي الطرفان قبلوها.
- *`FundingRequest`* — طلب المؤسّس للفلوس المتفق عليها.
- *`PaymentTransaction`* — كل محاولة دفع، وكل محاولة صف مستقل.
- *`PaymentEvent`* — كل تأكيد جاي من مزوّد الدفع.»

== Minute Four: The Part That Matters

«أهم حاجة في المخطط ده إن سلامة الفلوس *مش في الكود* — هي في قاعدة البيانات
نفسها. فيه أربع قيود فريدة مفلترة:

+ طلب تمويل واحد مفتوح لكل علاقة.
+ محاولة دفع نشطة واحدة لكل طلب.
+ *دفعة ناجحة واحدة* لكل طلب — دي الأهم.
+ حدث واحد لكل معرّف من المزوّد — دي اللي بتمنع الويبهوك المتكرّر.

والسبب إنها في قاعدة البيانات مش في الكود: الكود ممكن يخسر سباق لو طلبين
وصلوا في نفس اللحظة. القيد في المحرّك نفسه مبيخسرش.»

== Minute Five: The Close

«وفيه قاعدتين على مستوى المخطط كله:

- كل تاريخ متخزّن UTC — والأسماء نفسها بتقول ده، كلها منتهية بـ `Utc`.
- كل عمود فلوس دقّته `18,2` — ما عدا نسبة الحصّة `EquityPct` دقّتها `7,4`
  لأن التقريب لخانتين كان هيغيّر حصّة حقيقية.

وأخيرًا: إحنا مبنمسحش صفوف العلاقات. لو اترفض طلب، الصف بيفضل والحالة بتتغيّر
لـ `Declined` — لأن البيانات مشتركة بين طرفين ومينفعش خروج طرف يمسح تاريخ
التاني.»

#keypoint[
  لو فضل وقت أو الدكتور طلب زيادة، النقطة اللي تفتحها: *الفرق بين
  `Restrict` و `Cascade` و `SetNull`* — وخصوصًا إن `SecurityLog` هو الوحيد
  بـ `SetNull` عشان السجلّ يفضل حتى لو الحساب راح.
]

#codemap((
  ("Data/AppDbContext.cs", [كل العلاقات والقيود — الميثود `OnModelCreating` و `ConfigureFunding`]),
  ("Data/Models/Investment.cs", [`Status` و `Stage` — المحورين]),
  ("Services/PipelineStages.cs", [المراحل التمانية بأسمائها]),
))

= Expected Questions and Their Answers

الإجابات دي مكتوبة بالطريقة اللي هتقولها بصوتك، مش بصياغة تقرير.

الأسئلة دي معاها *أسئلة الضغط* — يعني المتابعة اللي ممكن تيجي لو الدكتور
مقتنعش من أول إجابة. كل الإجابات من المادة اللي فاتت.

#example("«اشرحلي السكيما بتاعتكم»")[
  ابدأ بالمركز مش بالتفاصيل: «فيه `User` وبيتفرّع منه تلات أنواع في نفس الجدول.
  المؤسّس بينشر `Project`. المستثمر بيعمل `Investment` على المشروع — ودي مش
  مجرد ربط، دي علاقة ليها حالة ومرحلة. لما الاتنين يتفقوا، بيتولّد
  `FundingRequest`، وكل محاولة دفع بتتسجّل `PaymentTransaction`، وكل تأكيد من
  المزوّد بيتسجّل `PaymentEvent` مستقل.» وبعدين افتح الـ ERD وورّي.

  *لو ضغط: «طب ليه `Investment` مش مجرد جدول ربط؟»*
  «لأن عندها `Status` و `Stage` وتاريخ وملاحظات خاصة لكل طرف. جدول الربط
  عمودين وخلاص.»

  *لو ضغط أكتر: «وليه `PaymentEvent` جدول لوحده مش عمود؟»*
  «عشان الحدث لازم يتسجّل قبل ما أي رقم يتحرّك. لو كان عمود، مكنش فيه مكان
  أسجّل فيه ويبهوك اتكرّر أو ويبهوك وصل قبل رجوع المستخدم من صفحة الدفع.»
]

#example("«ليه مفيش repository layer؟»")[
  «ده قرار معماري مكتوب في قواعد المشروع: المتحكّمات بتكلّم `AppDbContext`
  مباشرة. السبب إن الـ `DbContext` نفسه أصلًا فيه نمط الـ Unit of Work
  والـ Repository جوّاه، فطبقة زيادة فوقه كانت هتبقى تغليف بلا قيمة في
  مشروع بالحجم ده. وفيه فايدة إضافية: الـ global query filters بتاعتي بتسري
  على كل استعلام من غير ما حد يقدر يلتفّ حواليها.»

  *لو ضغط: «طب ده مش بيصعّب تغيير قاعدة البيانات بعدين؟»*
  «نظريًا أيوه. عمليًا الـ `DbContext` نفسه هو طبقة التجريد — لو غيّرنا
  المحرّك، اللي بيتغيّر هو مزوّد EF Core مش كود المتحكّمات.»

  *لو ضغط أكتر: «وإزاي بتختبروا المتحكّمات وهي مربوطة بالقاعدة؟»*
  الأمانة أقوى: «مبنختبرهاش. الـ ٤٨ اختبار الموجودين على منطق الحسابات
  والمراحل بس، ومفيش اختبارات integration — ودي فجوة موثّقة عندنا.»
]

#example("«ليه الشكل ده بالذات للسكيما؟»")[
  دي مش بتاعتك — سلّمها بنضافة: «القرار المعماري ده بتاع قائد الفريق، هو صاحب
  قصة ليه اتصمّمت كده. أنا مسؤول عن إنها مبنية صح: العلاقات، الفهارس،
  القيود، والترحيلات.» ده مش تهرّب — ده توزيع أدوار واضح، واللجنة بتحترمه أكتر
  من إجابة مخترعة.

  *لو ضغط: «طب إنت عارف ليه ولا بتنقل بس؟»*
  متدّعيش ملكية القرار، بس ورّي إنك فاهمه: «فاهم المنطق — إن العلاقة كيان
  مستقل عشان تشيل حالة ومرحلة، وإن الأحداث بتتفصل عن المعاملات عشان منع
  التكرار. بس القرار نفسه واتخاذه بتاع قائد الفريق.»
]

#example("«ليه الفلوس `decimal` مش `float`؟»")[
  «لأن `float` بيمثّل الأرقام تقريبيًا في النظام الثنائي، فكسور زي ٠٫١
  مبتتخزّنش بالظبط. مع الفلوس ده معناه فروق بتتراكم. `decimal(18,2)` بيخزّن
  القيمة بالظبط.»

  *لو ضغط: «وليه `18,2` تحديدًا؟»*
  «١٨ خانة إجمالية، منها ٢ عشرية — يعني قروش بالظبط ومساحة كبيرة للمبالغ.»

  *لو ضغط أكتر: «طب ليه `EquityPct` مختلفة؟»*
  «لأنها نسبة مش مبلغ. دقّتها `7,4` عشان نسبة زي ٪١٢٫٣٧٥ لو اتقرّبت لخانتين
  كانت هتبقى ٪١٢٫٣٨ — يعني حصّة حد في شركة اتغيّرت.»
]

#example("«لو اتنين ولّدوا ترحيل في نفس الوقت؟»")[
  «هيحصل تعارض في ملف الـ snapshot، وأول واحد يطبّق بيخلّي ترحيل التاني مبني
  على أساس قديم. الحل التنظيمي: حد واحد بس بيولّد الترحيلات — وده أنا. اللي
  عايز تغيير في السكيما بيقولي.»

  *لو ضغط: «وليه محلّتوش التعارض في ملف اللقطة يدويًا؟»*
  «لأنه ملف متولّد وكبير، وتعديله بإيدك بيخلّي الموديل والقاعدة يختلفوا من غير
  ما حد يلاحظ. التنسيق أرخص من ده بكتير.»

  *لو ضغط أكتر: «وإزاي EF أصلًا عارف إيه اتطبّق وإيه لأ؟»*
  «من جدول اسمه `__EFMigrationsHistory` جوّه قاعدة البيانات نفسها، فيه أسماء
  الترحيلات اللي اتطبّقت. عشان كده اسم الترحيل جزء من هويته وممنوع يتغيّر بعد
  التطبيق.»
]

#example("«إزاي بتضمنوا إن الدفع مبيتسجّلش مرتين؟»")[
  «مش بشرط في الكود — بقيد في قاعدة البيانات. فيه فهرس فريد مفلتر اسمه
  `UX_PaymentTransactions_OneSucceededPerRequest` على `FundingRequestId` بشرط
  `Status = 'Succeeded'`. يعني ممكن محاولات فاشلة كتير، لكن ناجحة واحدة بالظبط.
  الكود ممكن يخسر سباق، الفهرس لأ.»

  *لو ضغط: «طب لو التطبيق حاول يكتب التانية، هيحصل إيه؟»*
  «قاعدة البيانات بترفض العملية ويرجع استثناء. يعني الفشل بيحصل *قبل* ما أي
  رقم تمويل يتحرّك، مش بعده.»

  *لو ضغط أكتر: «وإيه اللي بيمنع نفس الويبهوك يتطبّق مرتين أصلًا؟»*
  «قيد تاني: فهرس فريد على `(Provider, ProviderEventId)` في `PaymentEvent`.
  الحدث بيتسجّل الأول، ولو وصل تاني بنفس المعرّف بيترفض عند التسجيل.»

  *لو ضغط أكتر: «والتعديلات المتزامنة على نفس الصف؟»*
  «دي حماية تالتة مختلفة: عمود `RowVersion` على `PaymentTransaction`. لو
  اتنين قروا نفس الصف وحاولوا يعدّلوه، أول واحد بيكسب والتاني بياخد
  `DbUpdateConcurrencyException`.»
]

#example("«إيه أكتر حاجة ممكن تغلط فيها في شغلك؟»")[
  سؤال أمانة، وأحسن إجابة أمينة: «ترحيل غير قابل للرجوع على قاعدة مشتركة. عشان
  كده بقرا `Up()` و `Down()` قبل ما أطبّق، وبتأكّد إن التغيير إضافي، وبقول
  للفريق قبل ما أشغّل الأمر.»
]

#example("«ليه استخدمتوا TPH مش جدول لكل نوع؟»")[
  «لأن كل طلب مصادَق عليه بيقرا المستخدم. لو كل نوع في جدول لوحده، كل قراءة
  دي كانت هتبقى `JOIN`. والتكلفة اللي قبلناها إن أعمدة المستثمر — زي
  `TicketMin` و `PreferredIndustries` — بتبقى `NULL` عند المؤسّس والأدمن.»
]

#example("«إيه الفرق بين `Status` و `Stage`؟»")[
  سؤال شبه مضمون. «`Status` بوابة الفلوس: `Approved` معناها الالتزام بقى
  محسوب في أرقام التمويل. `Stage` بيوصف العلاقة بين شخصين: `New`,
  `Reviewing`, `Contacted`, `InDiscussion`, وهكذا. علاقة ممكن تكون
  `Approved` و `InDiscussion` في نفس الوقت — الفلوس محسوبة وهما لسه
  بيتكلموا. دمج العمودين كان هيخلّي مستحيل تعرف رقم التمويل من غير ما تقرا
  سياق المحادثة.»
]

#example("«الملفات جوّه قاعدة البيانات؟ ليه؟»")[
  ماتدافعش عنه كأفضل حل. «أيوه، `varbinary(max)`. عارفين إن الصح في الإنتاج
  تخزين خارجي والقاعدة تحفظ الرابط بس. اخترنا كده لأن الخدمة الخارجية بره
  نطاق المشروع، والمكسب إن الملف والصف بيتحفظوا في معاملة واحدة. التكلفة:
  القاعدة بتكبر والنسخ الاحتياطي بيتقل — ودي مقايضة مكتوبة عندنا في
  `docs/09-STATUS.md`.»
]

#example("«القيود دي مختبرة؟»")[
  الأمانة أقوى من التبرير. «لأ. الـ ٤٨ اختبار الموجودين على منطق الحسابات
  والمراحل ومبيلمسوش قاعدة بيانات. القيود الأربعة مبنية صح ومراجَعة، لكن
  مفيش اختبار بيحاول يكسرها. دي أول حاجة كنت هضيفها لو فيه وقت.»
]

#example("«لو عايز تضيف حقل جديد لكيان، اعمل إيه بالترتيب؟»")[
  «أضيف الـ property في الكلاس. لو محتاج إعداد خاص — دقّة أو فهرس — أضيفه في
  `OnModelCreating`. أعمل `dotnet ef migrations add` باسم وصفي. أفتح الملف
  الناتج وأقرا `Up()` و `Down()`. أشغّل `migrations script` أشوف الـ SQL.
  أتأكد إن التغيير إضافي. أقول للفريق. وبعدين `database update`.»
]

= Suggested Study Plan

الملف ده كبير، فده ترتيب عملي تمشي بيه.

#figure(
  table(
    columns: (auto, 1fr, 1fr),
    align: (right + top, right + top, right + top),
    table.header([الجلسة], [تقرا إيه], [تعمل إيه على الجهاز]),
    [الأولى],
      [الفصول ١ و ٢ — دورك وحدودك، وإزاي EF Core بيشتغل],
      [`dotnet tool restore` ثم `dotnet build`. افتح `AppDbContext.cs` وبُصّ عليه من غير ما تحاول تفهم كل حاجة.],
    [التانية],
      [الفصول ٣ و ٤ — العلاقات وتفاصيل الأعمدة],
      [افتح الـ ERD جانب الفصل. اتبع كيان واحد (`Investment`) من الكلاس للـ `OnModelCreating` للترحيل.],
    [التالتة],
      [الفصول ٥ و ٦ و ٧ — التزامن والاستعلامات والوراثة],
      [دوّر على `RowVersion` في الكود وشوف إزاي التزامن بيتفحص، وجرّب استعلام LINQ وشوف الـ SQL الناتج منه.],
    [الرابعة],
      [الفصول ٨ و ٩ — الحذف الناعم والفهارس],
      [دوّر في الكود على القيود الأربعة بأسمائها واقراهم في `ConfigureFunding`.],
    [الخامسة],
      [الفصول ١٠ و ١١ و ١٢ — القاعدتان والترحيلات والقاعدة المشتركة],
      [افتح `AddUserOnboardedAt.cs` — أصغر ترحيل وأوضح مثال.],
    [السادسة],
      [الفصول ١٣ و ١٤ و ١٥ و ١٦ — التخزين والحدود والـ ERD والأسئلة المتوقّعة],
      [جاوب على كل «اختبر نفسك» في الملف من غير ما تبصّ على الإجابة.],
    [الأخيرة],
      [الفصل الأخير — المراجعة السريعة],
      [اشرح السكيما بصوت عالي لحد تاني في ٥ دقايق.],
  ),
  caption: [سبع جلسات، كل واحدة قراءة + حاجة بإيدك.],
)

#keypoint[
  أهم نصيحة في الملف ده: *متذاكرش بالقراءة بس.* افتح الكود جانب كل فصل.
  اللجنة مش بتسأل «إيه تعريف الفهرس المفلتر» — بتسأل «ورّيني فين» و«ليه».
  والاتنين دول محتاجين إنك تكون فتحت الملف بإيدك قبل كده.
]

= Quick Review Before the Defense

#recap[
  *ملفك الأساسي:* `Data/AppDbContext.cs` — الموديل كله متعرّف فيه.

  *الاستراتيجية:* Code-First. الكلاس أصل، الجدول نتيجة، الترحيل هو الجسر.

  *الوراثة:* TPH — تلات أنواع مستخدمين في جدول `Users` بعمود `UserType`.

  *الحذف الناعم:* فلتر عام على `User` و `Project` بس. الباقي بيتحمي بسلوك الحذف.

  *أخطر أربع قيود:* طلب مفتوح واحد، محاولة نشطة واحدة، *دفعة ناجحة واحدة*،
  وحدث مزوّد واحد. كلهم فهارس فريدة مفلترة، مش شروط في الكود.

  *قاعدتان:* كل تاريخ UTC، وكل عمود فلوس `HasPrecision(18,2)` —
  ما عدا `EquityPct` بـ `(7,4)`.

  *الترحيلات:* ٢٦، وآخر واحد `AddUserOnboardedAt`. القاعدة مشتركة — راجع قبل ما تطبّق.

  *حدّك:* الميكانيكا بتاعتك. «ليه اتصمّمت كده» بتاعة القائد.
]

== The Numbers to Memorize

#figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([الرقم], [إيه هو]),
    [٢٦], [عدد الترحيلات.],
    [٤٨], [عدد الاختبارات — كلها على المنطق، *ولا واحد* على قاعدة البيانات.],
    [٤], [القيود اللي شايلة سلامة الفلوس.],
    [٢], [عدد الجداول اللي عليها فلتر حذف ناعم: `User` و `Project`.],
    [٨], [عدد مراحل `Stage`، منهم اتنين نهائيين: `Closed` و `Declined`.],
    [`18,2`], [دقّة كل عمود فلوس.],
    [`7,4`], [دقّة `EquityPct` وحدها.],
  ),
  caption: [أرقام تتقال بثقة.],
)

== Where to Find Everything

#codemap((
  ("Data/AppDbContext.cs", [الموديل كله: العلاقات، الفهارس، الفلاتر، الدقّة]),
  ("Data/AppDbContext.cs — `ConfigureFunding`", [القيود الأربعة]),
  ("Data/Models/", [كلاسات الكيانات كلها]),
  ("Migrations/", [الـ ٢٦ ترحيلًا + اللقطة]),
  ("Services/UtcDateTimeConverter.cs", [فرض الـ UTC]),
  ("Services/PipelineStages.cs", [المراحل التمانية]),
))

== The First Sentence You Say If Asked to Explain

«المخطط قايم على تلات كيانات: `User` وبيتفرّع لتلات أنواع في جدول واحد،
و `Project` اللي المؤسّس بينشره، و `Investment` اللي هي العلاقة بينهم — ودي
مش جدول ربط، دي كيان ليه حالة ومرحلة.»

ولو كمّل، امشي على سيناريو الخمس دقايق في فصل Explaining the ERD in 5 Minutes.

== One Last Thing

#keypoint[
  لو مش عارف إجابة: *قول مش عارف، وقول مين يعرف.* «دي بتاعة قائد الفريق»
  أو «دي عند عضو الباكند» إجابة محترمة. الإجابة المخترعة هي اللي بتوقّع.
]
