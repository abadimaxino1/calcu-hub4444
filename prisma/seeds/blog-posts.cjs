const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', '..', 'dev.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const blogPosts = [
  {
    slug: "calculate-salary-after-gosi-deductions-saudi-arabia",
    titleAr: "كيفية حساب الراتب بعد خصم التأمينات الاجتماعية في السعودية",
    titleEn: "How to Calculate Salary After GOSI Deductions in Saudi Arabia",
    excerptAr: "دليل شامل لحساب راتبك الصافي بعد خصم التأمينات الاجتماعية (GOSI) في المملكة العربية السعودية",
    excerptEn: "Complete guide to calculating your net salary after GOSI (General Organization for Social Insurance) deductions in Saudi Arabia",
    bodyMarkdownAr: "## مقدمة\n\nتعتبر التأمينات الاجتماعية جزءاً أساسياً من نظام العمل في المملكة العربية السعودية...",
    bodyMarkdownEn: "## Introduction\n\nSocial insurance (GOSI) is a fundamental part of Saudi Arabia's employment system...",
    status: "PUBLISHED",
    tags: "salary,gosi,calculator,saudi arabia,payroll"
  },
  {
    slug: "end-of-service-benefits-saudi-labor-law",
    titleAr: "حساب مكافأة نهاية الخدمة وفق نظام العمل السعودي",
    titleEn: "End of Service Benefits Under Saudi Labor Law",
    excerptAr: "شرح تفصيلي لكيفية حساب مكافأة نهاية الخدمة حسب المادة 84 والمادة 85",
    excerptEn: "Detailed explanation of EOS benefits calculation under Articles 84 and 85",
    bodyMarkdownAr: "## مكافأة نهاية الخدمة\n\nمكافأة نهاية الخدمة حق مكتسب لكل عامل...",
    bodyMarkdownEn: "## End of Service Benefits\n\nEOS benefits are an acquired right for every worker...",
    status: "PUBLISHED",
    tags: "eos,gratuity,labor law,calculator"
  },
  {
    slug: "working-hours-saudi-labor-law",
    titleAr: "ساعات العمل القانونية في السعودية 2024",
    titleEn: "Legal Working Hours in Saudi Arabia 2024",
    excerptAr: "دليل شامل لساعات العمل القانونية والعمل الإضافي في نظام العمل السعودي",
    excerptEn: "Complete guide to legal working hours and overtime in Saudi Labor Law",
    bodyMarkdownAr: "## ساعات العمل\n\nالحد الأقصى 8 ساعات يومياً...",
    bodyMarkdownEn: "## Working Hours\n\nMaximum 8 hours daily...",
    status: "PUBLISHED",
    tags: "working hours,overtime,labor law"
  },
  {
    slug: "hijri-gregorian-date-converter",
    titleAr: "تحويل التاريخ من الهجري إلى الميلادي والعكس",
    titleEn: "Convert Hijri to Gregorian Dates and Vice Versa",
    excerptAr: "أداة مجانية لتحويل التواريخ بين التقويم الهجري والميلادي",
    excerptEn: "Free tool to convert dates between Hijri and Gregorian calendars",
    bodyMarkdownAr: "## تحويل التاريخ\n\nاستخدم حاسبتنا لتحويل التواريخ بسهولة...",
    bodyMarkdownEn: "## Date Conversion\n\nUse our calculator to easily convert dates...",
    status: "PUBLISHED",
    tags: "dates,hijri,gregorian,converter"
  },
  {
    slug: "calculate-annual-leave-saudi-arabia",
    titleAr: "حساب الإجازة السنوية في السعودية",
    titleEn: "Calculate Annual Leave in Saudi Arabia",
    excerptAr: "كيفية حساب مستحقات الإجازة السنوية وفق نظام العمل السعودي",
    excerptEn: "How to calculate annual leave entitlements according to Saudi Labor Law",
    bodyMarkdownAr: "## الإجازة السنوية\n\nيستحق الموظف 21 يوم إجازة سنوية...",
    bodyMarkdownEn: "## Annual Leave\n\nEmployees are entitled to 21 days annual leave...",
    status: "PUBLISHED",
    tags: "annual leave,vacation,labor law"
  },
  {
    slug: "probation-period-saudi-labor-law",
    titleAr: "فترة التجربة في نظام العمل السعودي",
    titleEn: "Probation Period in Saudi Labor Law",
    excerptAr: "كل ما تحتاج معرفته عن فترة التجربة ومدتها وحقوقك خلالها",
    excerptEn: "Everything you need to know about probation period duration and your rights",
    bodyMarkdownAr: "## فترة التجربة\n\nالحد الأقصى 90 يوماً قابلة للتمديد 90 يوماً إضافية...",
    bodyMarkdownEn: "## Probation Period\n\nMaximum 90 days extendable by another 90 days...",
    status: "PUBLISHED",
    tags: "probation,trial period,employment"
  },
  {
    slug: "notice-period-termination-saudi",
    titleAr: "مدة الإشعار عند إنهاء العقد في السعودية",
    titleEn: "Notice Period for Contract Termination in Saudi Arabia",
    excerptAr: "الأحكام القانونية لمدة الإشعار عند إنهاء عقد العمل",
    excerptEn: "Legal provisions for notice period when terminating employment contracts",
    bodyMarkdownAr: "## مدة الإشعار\n\nلا تقل عن 30 يوماً ولا تزيد عن 90 يوماً...",
    bodyMarkdownEn: "## Notice Period\n\nNot less than 30 days and not more than 90 days...",
    status: "PUBLISHED",
    tags: "notice period,termination,resignation"
  },
  {
    slug: "sick-leave-entitlement-saudi",
    titleAr: "الإجازة المرضية المستحقة في السعودية",
    titleEn: "Sick Leave Entitlement in Saudi Arabia",
    excerptAr: "قواعد الإجازة المرضية والرواتب المستحقة خلالها",
    excerptEn: "Sick leave rules and salary entitlements during sick leave",
    bodyMarkdownAr: "## الإجازة المرضية\n\n- أول 30 يوم: راتب كامل\n- ثاني 60 يوم: 75%\n- ثالث 30 يوم: بدون راتب",
    bodyMarkdownEn: "## Sick Leave\n\n- First 30 days: Full salary\n- Next 60 days: 75%\n- Final 30 days: No salary",
    status: "PUBLISHED",
    tags: "sick leave,medical leave,benefits"
  },
  {
    slug: "maternity-leave-saudi-arabia",
    titleAr: "إجازة الأمومة في السعودية 2024",
    titleEn: "Maternity Leave in Saudi Arabia 2024",
    excerptAr: "حقوق الموظفة الحامل وإجازة الأمومة المدفوعة في السعودية",
    excerptEn: "Pregnant employee rights and paid maternity leave in Saudi Arabia",
    bodyMarkdownAr: "## إجازة الأمومة\n\nتستحق المرأة العاملة 10 أسابيع إجازة براتب كامل...",
    bodyMarkdownEn: "## Maternity Leave\n\nWorking women are entitled to 10 weeks fully paid leave...",
    status: "PUBLISHED",
    tags: "maternity leave,women rights,pregnancy"
  },
  {
    slug: "calculate-overtime-pay-saudi",
    titleAr: "حساب أجر العمل الإضافي في السعودية",
    titleEn: "Calculate Overtime Pay in Saudi Arabia",
    excerptAr: "كيفية حساب أجر العمل الإضافي والعمل في أيام الراحة والأعياد",
    excerptEn: "How to calculate overtime pay and work on rest days and holidays",
    bodyMarkdownAr: "## العمل الإضافي\n\nالأجر العادي + 50% لكل ساعة إضافية...",
    bodyMarkdownEn: "## Overtime\n\nRegular wage + 50% for each overtime hour...",
    status: "PUBLISHED",
    tags: "overtime,extra hours,compensation"
  },
  {
    slug: "contract-types-saudi-labor-law",
    titleAr: "أنواع عقود العمل في النظام السعودي",
    titleEn: "Types of Employment Contracts in Saudi Labor Law",
    excerptAr: "دليل شامل لأنواع عقود العمل: محدد المدة، غير محدد، مؤقت، جزئي",
    excerptEn: "Complete guide to employment contract types: fixed-term, indefinite, temporary, part-time",
    bodyMarkdownAr: "## أنواع عقود العمل\n\n### 1. عقد محدد المدة\nعقد عمل يحدد مدته مسبقاً ولا يتجاوز 4 سنوات قابلة للتجديد.\n\n### 2. عقد غير محدد المدة\nعقد عمل دائم بدون تحديد تاريخ انتهاء.\n\n### 3. العمل المؤقت\nعقد لإنجاز مشروع محدد أو عمل موسمي.\n\n### 4. العمل الجزئي\nعقد بساعات عمل أقل من الدوام الكامل.",
    bodyMarkdownEn: "## Employment Contract Types\n\n### 1. Fixed-Term Contract\nEmployment contract with predetermined duration, not exceeding 4 years (renewable).\n\n### 2. Indefinite Contract\nPermanent employment without specified end date.\n\n### 3. Temporary Work\nContract for specific project or seasonal work.\n\n### 4. Part-Time Work\nContract with fewer hours than full-time employment.",
    status: "PUBLISHED",
    tags: "contracts,employment,labor law,saudi arabia"
  },
  {
    slug: "termination-procedures-saudi-labor-law",
    titleAr: "إجراءات إنهاء عقد العمل والتعويضات",
    titleEn: "Employment Termination Procedures and Compensation",
    excerptAr: "كل ما تحتاج معرفته عن إنهاء عقود العمل والحقوق والتعويضات",
    excerptEn: "Everything you need to know about employment termination, rights, and compensation",
    bodyMarkdownAr: "## إنهاء عقد العمل\n\n### الإنهاء بالتراضي\nيمكن للطرفين إنهاء العقد بالاتفاق المتبادل.\n\n### الإنهاء من طرف واحد\nيتطلب إشعاراً مسبقاً حسب نوع العقد.\n\n### التعويضات\nتشمل مكافأة نهاية الخدمة، الأجور المتبقية، الإجازات غير المستخدمة.",
    bodyMarkdownEn: "## Employment Termination\n\n### Mutual Termination\nBoth parties can terminate by mutual agreement.\n\n### Unilateral Termination\nRequires advance notice based on contract type.\n\n### Compensation\nIncludes EOS benefits, remaining wages, unused vacation.",
    status: "PUBLISHED",
    tags: "termination,compensation,notice period,rights"
  },
  {
    slug: "labor-dispute-resolution-saudi",
    titleAr: "حل النزاعات العمالية في السعودية",
    titleEn: "Labor Dispute Resolution in Saudi Arabia",
    excerptAr: "دليل إجراءات حل الخلافات العمالية عبر مكاتب العمل والمحاكم",
    excerptEn: "Guide to resolving labor disputes through labor offices and courts",
    bodyMarkdownAr: "## حل النزاعات العمالية\n\n### مكتب العمل\nأول جهة لحل الخلافات ودياً.\n\n### لجنة تسوية المنازعات\nمرحلة وسطى قبل المحكمة.\n\n### المحكمة العمالية\nالحل القضائي النهائي للنزاعات.",
    bodyMarkdownEn: "## Labor Dispute Resolution\n\n### Labor Office\nFirst authority for amicable dispute resolution.\n\n### Settlement Committee\nIntermediate stage before court.\n\n### Labor Court\nFinal judicial solution for disputes.",
    status: "PUBLISHED",
    tags: "disputes,labor court,rights,procedures"
  },
  {
    slug: "foreign-worker-regulations-saudi",
    titleAr: "أنظمة العمال الأجانب في السعودية 2024",
    titleEn: "Foreign Worker Regulations in Saudi Arabia 2024",
    excerptAr: "دليل شامل لأنظمة وإجراءات تشغيل العمالة الوافدة",
    excerptEn: "Complete guide to expat worker regulations and procedures",
    bodyMarkdownAr: "## العمالة الوافدة\n\n### رخصة العمل\nمتطلبات الحصول على رخصة العمل.\n\n### الإقامة\nتجديد الإقامة وشروطها.\n\n### نقل الكفالة\nشروط وإجراءات نقل الخدمات.",
    bodyMarkdownEn: "## Expat Workers\n\n### Work Permit\nRequirements for obtaining work permit.\n\n### Residency (Iqama)\nResidency renewal and conditions.\n\n### Sponsorship Transfer\nConditions and procedures for transfer.",
    status: "PUBLISHED",
    tags: "expats,work permit,iqama,sponsorship"
  },
  {
    slug: "wage-protection-system-wps-saudi",
    titleAr: "نظام حماية الأجور (WPS) في السعودية",
    titleEn: "Wage Protection System (WPS) in Saudi Arabia",
    excerptAr: "كيف يحمي نظام WPS حقوق العمال في استلام رواتبهم",
    excerptEn: "How WPS protects workers' rights to receive salaries",
    bodyMarkdownAr: "## نظام حماية الأجور\n\n### ما هو WPS\nنظام إلكتروني لضمان صرف الرواتب في موعدها.\n\n### الفوائد\nحماية حقوق العمال، شفافية، متابعة.\n\n### العقوبات\nغرامات على المنشآت المتأخرة في الدفع.",
    bodyMarkdownEn: "## Wage Protection System\n\n### What is WPS\nElectronic system ensuring timely salary payment.\n\n### Benefits\nWorker rights protection, transparency, monitoring.\n\n### Penalties\nFines on establishments delaying payment.",
    status: "PUBLISHED",
    tags: "wps,salary,wages,rights,protection"
  },
  {
    slug: "pension-retirement-benefits-saudi",
    titleAr: "التقاعد والمعاشات التقاعدية في السعودية",
    titleEn: "Pension and Retirement Benefits in Saudi Arabia",
    excerptAr: "دليل شامل لحساب المعاش التقاعدي والاشتراك في التأمينات",
    excerptEn: "Complete guide to pension calculation and GOSI subscription",
    bodyMarkdownAr: "## المعاش التقاعدي\n\n### شروط الاستحقاق\nسن التقاعد، مدة الاشتراك، الأهلية.\n\n### حساب المعاش\nيعتمد على متوسط الراتب ومدة الخدمة.\n\n### المستحقون\nالعامل، الأرملة، الأولاد.",
    bodyMarkdownEn: "## Retirement Pension\n\n### Eligibility Conditions\nRetirement age, subscription period, eligibility.\n\n### Pension Calculation\nBased on average salary and service duration.\n\n### Beneficiaries\nWorker, widow, children.",
    status: "PUBLISHED",
    tags: "pension,retirement,gosi,benefits"
  },
  {
    slug: "female-worker-rights-saudi-labor-law",
    titleAr: "حقوق المرأة العاملة في نظام العمل السعودي",
    titleEn: "Female Worker Rights in Saudi Labor Law",
    excerptAr: "الحقوق الخاصة بالمرأة العاملة: الأمومة، الرضاعة، ساعات العمل",
    excerptEn: "Special rights for female workers: maternity, nursing, working hours",
    bodyMarkdownAr: "## حقوق المرأة العاملة\n\n### إجازة الأمومة\n10 أسابيع بأجر كامل.\n\n### فترات الرضاعة\nساعة يومياً للرضاعة لمدة سنة.\n\n### الحماية\nمنع الفصل أثناء الحمل والأمومة.",
    bodyMarkdownEn: "## Female Worker Rights\n\n### Maternity Leave\n10 weeks with full pay.\n\n### Nursing Periods\nOne hour daily for nursing for one year.\n\n### Protection\nNo dismissal during pregnancy and maternity.",
    status: "PUBLISHED",
    tags: "women,maternity,rights,labor law"
  },
  {
    slug: "hajj-leave-saudi-labor-law",
    titleAr: "إجازة الحج والإجازات الدينية",
    titleEn: "Hajj Leave and Religious Holidays",
    excerptAr: "حقوق العامل في إجازة الحج والإجازات الدينية",
    excerptEn: "Worker rights for Hajj leave and religious holidays",
    bodyMarkdownAr: "## إجازة الحج\n\n### المدة\nإجازة بدون أجر لأداء الحج مرة واحدة.\n\n### الشروط\nبعد خدمة سنتين على الأقل.\n\n### العودة\nيجب العودة للعمل بعد الإجازة.",
    bodyMarkdownEn: "## Hajj Leave\n\n### Duration\nUnpaid leave to perform Hajj once.\n\n### Conditions\nAfter at least 2 years of service.\n\n### Return\nMust return to work after leave.",
    status: "PUBLISHED",
    tags: "hajj,religious,leave,holidays"
  },
  {
    slug: "remote-work-saudi-labor-law",
    titleAr: "العمل عن بُعد في النظام السعودي",
    titleEn: "Remote Work in Saudi Labor Law",
    excerptAr: "القواعد والحقوق الخاصة بالعمل عن بُعد",
    excerptEn: "Rules and rights for remote work",
    bodyMarkdownAr: "## العمل عن بُعد\n\n### التعريف\nالعمل خارج مقر المنشأة باستخدام التقنية.\n\n### الحقوق\nنفس حقوق العامل في المقر.\n\n### الالتزامات\nالإنتاجية، السرية، الالتزام بالمواعيد.",
    bodyMarkdownEn: "## Remote Work\n\n### Definition\nWork outside establishment using technology.\n\n### Rights\nSame rights as on-site workers.\n\n### Obligations\nProductivity, confidentiality, punctuality.",
    status: "PUBLISHED",
    tags: "remote work,work from home,labor law"
  },
  {
    slug: "training-development-rights-saudi",
    titleAr: "حقوق التدريب والتطوير المهني",
    titleEn: "Training and Professional Development Rights",
    excerptAr: "حق العامل في التدريب والتطوير المهني",
    excerptEn: "Worker's right to training and professional development",
    bodyMarkdownAr: "## التدريب والتطوير\n\n### حق العامل\nالحصول على فرص تدريب مناسبة.\n\n### التزام صاحب العمل\nتوفير برامج تدريبية.\n\n### السعودة\nأولوية التدريب للسعوديين.",
    bodyMarkdownEn: "## Training and Development\n\n### Worker Right\nAccess to appropriate training opportunities.\n\n### Employer Obligation\nProvide training programs.\n\n### Saudization\nPriority training for Saudis.",
    status: "PUBLISHED",
    tags: "training,development,skills,career"
  },
  {
    slug: "weekend-public-holiday-pay-saudi",
    titleAr: "أجر أيام الراحة والعطل الرسمية",
    titleEn: "Weekend and Public Holiday Pay",
    excerptAr: "كيفية حساب أجر العمل في أيام الراحة والعطل الرسمية",
    excerptEn: "How to calculate pay for weekend and public holiday work",
    bodyMarkdownAr: "## أجر أيام الراحة\n\n### يوم الراحة الأسبوعي\nأجر إضافي 150% للعمل في يوم الراحة.\n\n### العطل الرسمية\nأجر إضافي 150% أو يوم بديل.\n\n### الاستثناءات\nالأعمال التي لا تتوقف.",
    bodyMarkdownEn: "## Rest Day Pay\n\n### Weekly Rest Day\n150% additional pay for working on rest day.\n\n### Public Holidays\n150% additional pay or substitute day.\n\n### Exceptions\nNon-stop operations.",
    status: "PUBLISHED",
    tags: "weekend,holidays,overtime,pay"
  },
  {
    slug: "employment-contract-languages-saudi",
    titleAr: "عقد العمل بعدة لغات في السعودية",
    titleEn: "Employment Contracts in Multiple Languages",
    excerptAr: "متطلبات كتابة عقد العمل بلغات متعددة وأيها يعتبر",
    excerptEn: "Requirements for multilingual employment contracts",
    bodyMarkdownAr: "## لغة العقد\n\n### اللغة الأساسية\nالعربية هي اللغة المعتمدة.\n\n### الترجمة\nيمكن إضافة ترجمة لكن العربية هي الأساس.\n\n### النزاعات\nالنص العربي هو المرجع عند الخلاف.",
    bodyMarkdownEn: "## Contract Language\n\n### Primary Language\nArabic is the official language.\n\n### Translation\nTranslation can be added but Arabic is primary.\n\n### Disputes\nArabic text is reference in disputes.",
    status: "PUBLISHED",
    tags: "contract,language,arabic,employment"
  },
  {
    slug: "saudi-vision-2030-labor-market",
    titleAr: "رؤية السعودية 2030 وسوق العمل",
    titleEn: "Saudi Vision 2030 and Labor Market Changes",
    excerptAr: "كيف تؤثر رؤية 2030 على سوق العمل والتوظيف",
    excerptEn: "How Vision 2030 affects labor market and employment",
    bodyMarkdownAr: "## رؤية 2030\n\n### السعودة\nزيادة نسبة السعوديين في القطاع الخاص.\n\n### التدريب\nبرامج تطوير مهارات وطنية.\n\n### الفرص\nقطاعات جديدة ووظائف متنوعة.",
    bodyMarkdownEn: "## Vision 2030\n\n### Saudization\nIncrease Saudi participation in private sector.\n\n### Training\nNational skills development programs.\n\n### Opportunities\nNew sectors and diverse jobs.",
    status: "PUBLISHED",
    tags: "vision 2030,saudization,employment,future"
  },
  {
    slug: "notice-period-requirements-saudi",
    titleAr: "فترة الإشعار عند إنهاء العقد",
    titleEn: "Notice Period Requirements for Termination",
    excerptAr: "متطلبات فترة الإشعار المسبق عند إنهاء عقد العمل",
    excerptEn: "Requirements for advance notice period when terminating employment",
    bodyMarkdownAr: "## فترة الإشعار\n\n### العقد محدد المدة\nلا يتطلب إشعاراً إلا بشرط.\n\n### العقد غير محدد\n30 يوماً على الأقل أو حسب العقد.\n\n### البدل النقدي\nيمكن دفع بدل الإشعار بدلاً من العمل.",
    bodyMarkdownEn: "## Notice Period\n\n### Fixed-Term Contract\nNo notice required unless specified.\n\n### Indefinite Contract\nMinimum 30 days or per contract.\n\n### Payment in Lieu\nCan pay notice period instead of working.",
    status: "PUBLISHED",
    tags: "notice period,termination,resignation"
  },
  {
    slug: "work-injury-compensation-saudi",
    titleAr: "تعويضات إصابات العمل في السعودية",
    titleEn: "Work Injury Compensation in Saudi Arabia",
    excerptAr: "حقوق العامل في حالة الإصابة أثناء العمل والتعويضات",
    excerptEn: "Worker rights for work injuries and compensation",
    bodyMarkdownAr: "## إصابات العمل\n\n### التغطية\nكل إصابة أثناء العمل أو بسببه.\n\n### العلاج\nعلاج مجاني كامل.\n\n### التعويض\nراتب كامل أثناء العلاج + تعويضات.",
    bodyMarkdownEn: "## Work Injuries\n\n### Coverage\nAll injuries during or because of work.\n\n### Treatment\nFree complete medical treatment.\n\n### Compensation\nFull salary during treatment + compensation.",
    status: "PUBLISHED",
    tags: "injury,compensation,insurance,safety"
  },
  {
    slug: "annual-leave-calculation-saudi",
    titleAr: "حساب الإجازة السنوية في السعودية",
    titleEn: "Annual Leave Calculation in Saudi Arabia",
    excerptAr: "كيفية حساب أيام الإجازة السنوية والبدل النقدي",
    excerptEn: "How to calculate annual leave days and cash allowance",
    bodyMarkdownAr: "## الإجازة السنوية\n\n### المدة\n21 يوماً لمن خدم أقل من 5 سنوات\n30 يوماً لمن خدم 5 سنوات فأكثر.\n\n### الأجر\nأجر كامل أثناء الإجازة.\n\n### البدل النقدي\nيمكن استبدال جزء منها ببدل نقدي.",
    bodyMarkdownEn: "## Annual Leave\n\n### Duration\n21 days for under 5 years service\n30 days for 5+ years service.\n\n### Pay\nFull pay during leave.\n\n### Cash Allowance\nPart can be exchanged for cash.",
    status: "PUBLISHED",
    tags: "annual leave,vacation,rights,entitlement"
  },
  {
    slug: "overtime-calculation-saudi-arabia",
    titleAr: "حساب أجر العمل الإضافي (Overtime)",
    titleEn: "Overtime Pay Calculation in Saudi Arabia",
    excerptAr: "طريقة حساب أجر ساعات العمل الإضافية حسب نظام العمل",
    excerptEn: "Method to calculate overtime hours pay per labor law",
    bodyMarkdownAr: "## العمل الإضافي\n\n### المعدل\n50% زيادة على الأجر العادي.\n\n### الحد الأقصى\nساعة واحدة يومياً أو 180 ساعة سنوياً.\n\n### الاستثناءات\nبعض الوظائف الإدارية.",
    bodyMarkdownEn: "## Overtime\n\n### Rate\n50% increase on regular pay.\n\n### Maximum\nOne hour daily or 180 hours yearly.\n\n### Exceptions\nSome managerial positions.",
    status: "PUBLISHED",
    tags: "overtime,extra hours,pay,calculation"
  },
  {
    slug: "salary-deductions-saudi-labor-law",
    titleAr: "الخصومات المسموحة من الراتب",
    titleEn: "Permitted Salary Deductions",
    excerptAr: "ما هي الخصومات القانونية المسموحة من راتب العامل",
    excerptEn: "What are the legal deductions allowed from worker salary",
    bodyMarkdownAr: "## الخصومات القانونية\n\n### الخصومات المسموحة\n- التأمينات الاجتماعية\n- السلف والقروض\n- الغياب غير المبرر\n- الغرامات النظامية\n\n### الحد الأقصى\nلا تتجاوز 50% من الراتب.",
    bodyMarkdownEn: "## Legal Deductions\n\n### Allowed Deductions\n- Social insurance\n- Advances and loans\n- Unjustified absence\n- Legal fines\n\n### Maximum\nShall not exceed 50% of salary.",
    status: "PUBLISHED",
    tags: "deductions,salary,gosi,fines"
  },
  {
    slug: "salary-payment-date-saudi",
    titleAr: "موعد صرف الرواتب في السعودية",
    titleEn: "Salary Payment Date in Saudi Arabia",
    excerptAr: "متى يجب صرف الرواتب حسب نظام العمل السعودي",
    excerptEn: "When salaries must be paid per Saudi labor law",
    bodyMarkdownAr: "## موعد صرف الراتب\n\n### الموظفون الشهريون\nمرة واحدة في الشهر.\n\n### العمال اليوميون\nأسبوعياً على الأقل.\n\n### التأخير\nغير مسموح، يعرض صاحب العمل للعقوبة.",
    bodyMarkdownEn: "## Salary Payment Date\n\n### Monthly Employees\nOnce per month.\n\n### Daily Workers\nAt least weekly.\n\n### Delay\nNot allowed, employer faces penalties.",
    status: "PUBLISHED",
    tags: "salary,payment date,wps,wages"
  }
];

function ensureAuthor() {
  const email = 'admin@calcuhub.com';
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return existing;

  const id = uuidv4();
  const now = new Date().toISOString();
  const hashedPassword = bcrypt.hashSync('ChangeThisPassword123!', 12);
  db.prepare(`
    INSERT INTO users (id, email, name, hashedPassword, role, isActive, totpSecret, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, email, 'Admin', hashedPassword, 'SUPER_ADMIN', 1, null, now, now);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function upsertBlogPost(authorId, post) {
  const now = new Date().toISOString();
  const isPublished = post.status === 'PUBLISHED';
  const publishedAt = isPublished ? now : null;

  // Backward-compat legacy fields
  const legacyTitle = post.titleAr || post.titleEn || '';
  const legacyExcerpt = post.excerptAr || post.excerptEn || '';
  const legacyBody = post.bodyMarkdownAr || post.bodyMarkdownEn || '';

  const id = uuidv4();

  db.prepare(`
    INSERT INTO blog_posts (
      id,
      slug,
      titleAr,
      titleEn,
      excerptAr,
      excerptEn,
      bodyMarkdownAr,
      bodyMarkdownEn,
      heroImageUrl,
      tags,
      authorId,
      isPublished,
      publishedAt,
      viewCount,
      createdAt,
      updatedAt,
      title,
      excerpt,
      bodyMarkdown
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      titleAr = excluded.titleAr,
      titleEn = excluded.titleEn,
      excerptAr = excluded.excerptAr,
      excerptEn = excluded.excerptEn,
      bodyMarkdownAr = excluded.bodyMarkdownAr,
      bodyMarkdownEn = excluded.bodyMarkdownEn,
      heroImageUrl = excluded.heroImageUrl,
      tags = excluded.tags,
      authorId = excluded.authorId,
      isPublished = excluded.isPublished,
      publishedAt = excluded.publishedAt,
      updatedAt = excluded.updatedAt,
      title = excluded.title,
      excerpt = excluded.excerpt,
      bodyMarkdown = excluded.bodyMarkdown
  `).run(
    id,
    post.slug,
    post.titleAr || '',
    post.titleEn || '',
    post.excerptAr || '',
    post.excerptEn || '',
    post.bodyMarkdownAr || '',
    post.bodyMarkdownEn || '',
    post.heroImageUrl || null,
    post.tags || '',
    authorId,
    isPublished ? 1 : 0,
    publishedAt,
    0,
    now,
    now,
    legacyTitle,
    legacyExcerpt,
    legacyBody
  );
}

function main() {
  const author = ensureAuthor();
  let insertedOrUpdated = 0;
  const tx = db.transaction(() => {
    for (const post of blogPosts) {
      upsertBlogPost(author.id, post);
      insertedOrUpdated += 1;
    }
  });

  tx();
  console.log(`Seeded blog posts: ${insertedOrUpdated}`);
  console.log(`Author: ${author.email}`);
}

try {
  main();
} finally {
  db.close();
}
