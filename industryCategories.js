// سیستم دسته‌بندی صنایع و مناسبت‌های مرتبط
const industryCategories = {
  "فناوری اطلاعات": {
    name: "فناوری اطلاعات",
    occasions: [
      { name: "روز فناوری اطلاعات", date: "2024-05-17", type: "international" },
      { name: "روز هوش مصنوعی", date: "2024-07-16", type: "international" },
      { name: "روز برنامه‌نویسان", date: "2024-09-13", type: "international" },
      { name: "روز امنیت سایبری", date: "2024-11-30", type: "international" },
      { name: "هفته فناوری", date: "2024-08-15", type: "national" },
      { name: "روز اینترنت", date: "2024-10-29", type: "international" }
    ]
  },
  "صنعت": {
    name: "صنعت",
    occasions: [
      { name: "روز جهانی صنعت", date: "2024-04-20", type: "international" },
      { name: "روز کارگر", date: "2024-05-01", type: "international" },
      { name: "روز مهندس", date: "2024-02-24", type: "national" },
      { name: "هفته صنعت", date: "2024-09-15", type: "national" },
      { name: "روز نوآوری صنعتی", date: "2024-06-21", type: "international" }
    ]
  },
  "بهداشت و درمان": {
    name: "بهداشت و درمان",
    occasions: [
      { name: "روز جهانی بهداشت", date: "2024-04-07", type: "international" },
      { name: "روز پزشک", date: "2024-08-23", type: "national" },
      { name: "روز پرستار", date: "2024-05-12", type: "international" },
      { name: "هفته سلامت", date: "2024-04-01", type: "national" },
      { name: "روز داروساز", date: "2024-09-25", type: "national" }
    ]
  },
  "آموزش": {
    name: "آموزش",
    occasions: [
      { name: "روز معلم", date: "2024-05-02", type: "national" },
      { name: "روز دانش‌آموز", date: "2024-10-13", type: "national" },
      { name: "روز دانشجو", date: "2024-11-16", type: "national" },
      { name: "هفته کتاب", date: "2024-11-15", type: "national" },
      { name: "روز سوادآموزی", date: "2024-09-08", type: "international" }
    ]
  },
  "کشاورزی": {
    name: "کشاورزی",
    occasions: [
      { name: "روز کشاورز", date: "2024-09-23", type: "national" },
      { name: "روز جهانی غذا", date: "2024-10-16", type: "international" },
      { name: "روز محیط زیست", date: "2024-06-05", type: "international" },
      { name: "هفته کشاورزی", date: "2024-09-20", type: "national" },
      { name: "روز آب", date: "2024-03-22", type: "international" }
    ]
  },
  "گردشگری": {
    name: "گردشگری",
    occasions: [
      { name: "روز جهانی گردشگری", date: "2024-09-27", type: "international" },
      { name: "روز میراث فرهنگی", date: "2024-04-18", type: "international" },
      { name: "هفته گردشگری", date: "2024-09-20", type: "national" },
      { name: "روز هتلداری", date: "2024-07-11", type: "national" }
    ]
  },
  "ورزش": {
    name: "ورزش",
    occasions: [
      { name: "روز ورزش", date: "2024-10-17", type: "national" },
      { name: "روز المپیک", date: "2024-07-23", type: "international" },
      { name: "روز فوتبال", date: "2024-12-10", type: "international" },
      { name: "هفته ورزش", date: "2024-10-15", type: "national" }
    ]
  },
  "فرهنگ و هنر": {
    name: "فرهنگ و هنر",
    occasions: [
      { name: "روز هنر", date: "2024-04-15", type: "international" },
      { name: "روز موسیقی", date: "2024-06-21", type: "international" },
      { name: "روز سینما", date: "2024-12-28", type: "international" },
      { name: "هفته کتاب", date: "2024-11-15", type: "national" },
      { name: "روز شعر", date: "2024-03-21", type: "national" }
    ]
  },
  "مالی و بانکداری": {
    name: "مالی و بانکداری",
    occasions: [
      { name: "روز بانک", date: "2024-07-16", type: "national" },
      { name: "روز حسابدار", date: "2024-11-15", type: "national" },
      { name: "روز بیمه", date: "2024-03-15", type: "national" },
      { name: "هفته مالی", date: "2024-09-15", type: "national" }
    ]
  },
  "خرده‌فروشی": {
    name: "خرده‌فروشی",
    occasions: [
      { name: "روز خرید", date: "2024-11-24", type: "international" },
      { name: "روز فروشنده", date: "2024-08-15", type: "national" },
      { name: "هفته خرید", date: "2024-11-20", type: "national" },
      { name: "روز مشتری", date: "2024-03-15", type: "international" }
    ]
  },
  "حمل و نقل": {
    name: "حمل و نقل",
    occasions: [
      { name: "روز حمل و نقل", date: "2024-09-17", type: "international" },
      { name: "روز راننده", date: "2024-03-18", type: "national" },
      { name: "روز راه‌آهن", date: "2024-09-15", type: "international" },
      { name: "روز هوایی", date: "2024-12-07", type: "international" },
      { name: "روز دریایی", date: "2024-09-26", type: "international" },
      { name: "هفته حمل و نقل", date: "2024-09-15", type: "national" },
      { name: "روز لوجستیک", date: "2024-06-28", type: "international" }
    ]
  },
  "خودرو": {
    name: "خودرو",
    occasions: [
      { name: "روز خودرو", date: "2024-01-29", type: "national" },
      { name: "روز مهندس خودرو", date: "2024-02-24", type: "national" },
      { name: "روز قطعات خودرو", date: "2024-03-15", type: "national" },
      { name: "هفته خودرو", date: "2024-10-15", type: "national" },
      { name: "روز تعمیرات خودرو", date: "2024-06-10", type: "national" }
    ]
  },
  "بازاریابی و تبلیغات": {
    name: "بازاریابی و تبلیغات",
    occasions: [
      { name: "روز بازاریابی", date: "2024-04-15", type: "international" },
      { name: "روز تبلیغات", date: "2024-06-01", type: "international" },
      { name: "روز برندینگ", date: "2024-05-20", type: "international" },
      { name: "هفته بازاریابی دیجیتال", date: "2024-09-15", type: "international" },
      { name: "روز خلاقیت", date: "2024-04-21", type: "international" }
    ]
  },
  "فین تک": {
    name: "فین تک",
    occasions: [
      { name: "روز فین تک", date: "2024-05-15", type: "international" },
      { name: "روز پرداخت الکترونیک", date: "2024-06-15", type: "international" },
      { name: "روز بانکداری دیجیتال", date: "2024-07-15", type: "international" },
      { name: "هفته فناوری مالی", date: "2024-09-15", type: "international" },
      { name: "روز ارز دیجیتال", date: "2024-10-31", type: "international" }
    ]
  },
  "خیریه": {
    name: "خیریه",
    occasions: [
      { name: "روز خیریه", date: "2024-09-05", type: "international" },
      { name: "روز کمک به نیازمندان", date: "2024-12-05", type: "international" },
      { name: "روز داوطلبی", date: "2024-12-05", type: "international" },
      { name: "هفته خیریه", date: "2024-09-01", type: "national" },
      { name: "روز نیکوکاری", date: "2024-03-20", type: "national" }
    ]
  },
  "منابع انسانی": {
    name: "منابع انسانی",
    occasions: [
      { name: "روز منابع انسانی", date: "2024-05-20", type: "international" },
      { name: "روز کاریابی", date: "2024-06-15", type: "national" },
      { name: "روز کارآفرینی", date: "2024-08-21", type: "international" },
      { name: "هفته اشتغال", date: "2024-04-15", type: "national" },
      { name: "روز مهارت‌آموزی", date: "2024-07-15", type: "national" }
    ]
  },
  "نشر دیجیتال": {
    name: "نشر دیجیتال",
    occasions: [
      { name: "روز کتاب", date: "2024-11-15", type: "national" },
      { name: "روز نویسنده", date: "2024-03-21", type: "international" },
      { name: "روز نشر دیجیتال", date: "2024-04-23", type: "international" },
      { name: "هفته کتاب", date: "2024-11-15", type: "national" },
      { name: "روز مطالعه", date: "2024-04-23", type: "international" }
    ]
  },
  "غذایی و FMCG": {
    name: "غذایی و FMCG",
    occasions: [
      { name: "روز غذا", date: "2024-10-16", type: "international" },
      { name: "روز آشپز", date: "2024-08-20", type: "international" },
      { name: "روز رستوران", date: "2024-05-18", type: "international" },
      { name: "هفته غذا", date: "2024-10-15", type: "national" },
      { name: "روز فودتک", date: "2024-06-15", type: "international" }
    ]
  },
  "رسانه و پادکست": {
    name: "رسانه و پادکست",
    occasions: [
      { name: "روز رسانه", date: "2024-05-03", type: "international" },
      { name: "روز پادکست", date: "2024-01-30", type: "international" },
      { name: "روز خبرنگار", date: "2024-08-08", type: "international" },
      { name: "هفته رسانه", date: "2024-05-01", type: "national" },
      { name: "روز صدا", date: "2024-02-13", type: "international" }
    ]
  },
  "مد و پوشاک": {
    name: "مد و پوشاک",
    occasions: [
      { name: "روز مد", date: "2024-04-15", type: "international" },
      { name: "روز طراح مد", date: "2024-06-15", type: "international" },
      { name: "روز پوشاک", date: "2024-08-15", type: "national" },
      { name: "هفته مد", date: "2024-09-15", type: "international" },
      { name: "روز سبک زندگی", date: "2024-03-21", type: "international" }
    ]
  },
  "سرمایه‌گذاری": {
    name: "سرمایه‌گذاری",
    occasions: [
      { name: "روز سرمایه‌گذاری", date: "2024-05-15", type: "international" },
      { name: "روز بورس", date: "2024-07-15", type: "national" },
      { name: "روز اقتصاد", date: "2024-10-15", type: "international" },
      { name: "هفته مالی", date: "2024-09-15", type: "national" },
      { name: "روز کارآفرینی", date: "2024-08-21", type: "international" }
    ]
  },
  "اپراتور و زیرساخت": {
    name: "اپراتور و زیرساخت",
    occasions: [
      { name: "روز مخابرات", date: "2024-05-17", type: "international" },
      { name: "روز اینترنت", date: "2024-10-29", type: "international" },
      { name: "روز اپراتور", date: "2024-07-15", type: "national" },
      { name: "هفته فناوری", date: "2024-08-15", type: "national" },
      { name: "روز زیرساخت", date: "2024-06-15", type: "international" }
    ]
  }
};

// تابع برای تشخیص صنعت بر اساس فیلد برند
function detectIndustry(field) {
  const fieldLower = field.toLowerCase();
  
  // کلمات کلیدی برای تشخیص صنعت
  const keywords = {
    "فناوری اطلاعات": ["فناوری", "تکنولوژی", "نرم‌افزار", "برنامه", "کامپیوتر", "دیتا", "سیستم", "اپلیکیشن", "وب", "موبایل", "هوش مصنوعی", "ai", "it"],
    "صنعت": ["صنعت", "تولید", "کارخانه", "ماشین", "ابزار", "فلز", "پلاستیک", "شیمیایی", "مهندسی"],
    "بهداشت و درمان": ["بهداشت", "درمان", "پزشکی", "دارو", "بیمارستان", "کلینیک", "سلامت", "پزشک", "پرستار"],
    "آموزش": ["آموزش", "مدرسه", "دانشگاه", "کتاب", "تحصیل", "معلم", "دانشجو", "دانش‌آموز"],
    "کشاورزی": ["کشاورزی", "کشاورز", "محصول", "گیاه", "دانه", "آبیاری", "مزرعه"],
    "گردشگری": ["گردشگری", "سفر", "هتل", "مسافرت", "توریست", "میراث"],
    "حمل و نقل": ["حمل", "نقل", "ترابری", "لوجستیک", "راننده", "رانندگی", "کامیون", "اتوبوس", "قطار", "هواپیما", "کشتی", "موتور", "موتورسیکلت", "تاکسی", "ون", "ماشین", "خودرو", "وسایل نقلیه"],
    "خودرو": ["خودرو", "ماشین", "اتومبیل", "وسایل نقلیه", "قطعات", "تعمیرات"],
    "بازاریابی و تبلیغات": ["بازاریابی", "تبلیغات", "برندینگ", "مارکتینگ", "advertising", "marketing", "branding"],
    "فین تک": ["فین تک", "فینتک", "فناوری مالی", "پرداخت", "الکترونیک", "بانکداری دیجیتال", "ارز دیجیتال", "fintech"],
    "خیریه": ["خیریه", "نیکوکاری", "کمک", "داوطلبی", "charity", "ngo"],
    "منابع انسانی": ["منابع انسانی", "کاریابی", "کارآفرینی", "اشتغال", "مهارت", "hr", "human resources"],
    "نشر دیجیتال": ["نشر", "دیجیتال", "کتاب", "نویسنده", "مطالعه", "publishing", "digital"],
    "غذایی و FMCG": ["غذایی", "فودتک", "fmcg", "رستوران", "آشپز", "غذا", "food", "restaurant"],
    "رسانه و پادکست": ["رسانه", "پادکست", "خبرنگار", "صدا", "media", "podcast", "journalism"],
    "مد و پوشاک": ["مد", "پوشاک", "طراح", "سبک زندگی", "fashion", "clothing", "design"],
    "سرمایه‌گذاری": ["سرمایه‌گذاری", "بورس", "اقتصاد", "کارآفرینی", "investment", "finance", "economy"],
    "اپراتور و زیرساخت": ["اپراتور", "زیرساخت", "مخابرات", "اینترنت", "operator", "infrastructure", "telecom"],
    "ورزش": ["ورزش", "فوتبال", "والیبال", "بسکتبال", "تنیس", "شنا", "دو"],
    "فرهنگ و هنر": ["فرهنگ", "هنر", "موسیقی", "سینما", "تئاتر", "نقاشی", "شعر"],
    "مالی و بانکداری": ["بانک", "مالی", "حساب", "پول", "سرمایه", "بیمه", "سرمایه‌گذاری"],
    "خرده‌فروشی": ["فروش", "خرید", "مغازه", "فروشگاه", "بازار", "تجارت", "کالا"]
  };
  
  for (const [industry, words] of Object.entries(keywords)) {
    if (words.some(word => fieldLower.includes(word))) {
      return industry;
    }
  }
  
  return "عمومی"; // اگر صنعت تشخیص داده نشد
}

// تابع برای دریافت مناسبت‌های مرتبط با صنعت
function getIndustryOccasions(industry) {
  return industryCategories[industry]?.occasions || [];
}

// تابع برای دریافت مناسبت‌های تصادفی
function getRandomOccasions(industry, count = 3) {
  const occasions = getIndustryOccasions(industry);
  const shuffled = occasions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// تابع برای تولید ایده‌های مناسبتی رندوم
function generateRandomOccasionIdeas(myIndustry, targetIndustry) {
  const myOccasions = getRandomOccasions(myIndustry, 2);
  const targetOccasions = getRandomOccasions(targetIndustry, 2);
  
  const ideas = [];
  
  // ایده‌های بر اساس مناسبت‌های برند من
  myOccasions.forEach(occasion => {
    ideas.push({
      type: "my_occasion",
      title: `برنامه ویژه ${occasion.name}`,
      description: `برگزاری برنامه‌های ویژه در ${occasion.name} با همکاری برند ${targetIndustry}`,
      occasion: occasion.name,
      industry: myIndustry
    });
  });
  
  // ایده‌های بر اساس مناسبت‌های برند هدف
  targetOccasions.forEach(occasion => {
    ideas.push({
      type: "target_occasion", 
      title: `همکاری در ${occasion.name}`,
      description: `همکاری با برند ${targetIndustry} در مناسبت ${occasion.name}`,
      occasion: occasion.name,
      industry: targetIndustry
    });
  });
  
  // ایده‌های ترکیبی
  myOccasions.forEach(myOccasion => {
    targetOccasions.forEach(targetOccasion => {
      ideas.push({
        type: "combined",
        title: `${myOccasion.name} × ${targetOccasion.name}`,
        description: `ترکیب مناسبت ${myOccasion.name} با ${targetOccasion.name} برای ایجاد برنامه مشترک`,
        occasion1: myOccasion.name,
        occasion2: targetOccasion.name,
        industry1: myIndustry,
        industry2: targetIndustry
      });
    });
  });
  
  return ideas;
}

// تابع برای تولید ایده‌های مناسبتی
function generateOccasionIdeas(industry1, industry2, occasions1, occasions2) {
  const ideas = [];
  
  // ایده‌های گیفت و هدیه
  occasions1.forEach(occasion1 => {
    occasions2.forEach(occasion2 => {
      ideas.push({
        type: "gift",
        title: `هدیه مناسبتی ${occasion1.name}`,
        description: `ارائه هدایای مرتبط با ${occasion1.name} به مشتریان ${industry2} در ${occasion2.name}`,
        occasion1: occasion1.name,
        occasion2: occasion2.name
      });
    });
  });
  
  // ایده‌های همکاری مشترک
  occasions1.forEach(occasion1 => {
    ideas.push({
      type: "collaboration",
      title: `برنامه مشترک ${occasion1.name}`,
      description: `برگزاری برنامه‌های مشترک در ${occasion1.name} با تمرکز بر ${industry2}`,
      occasion1: occasion1.name,
      occasion2: null
    });
  });
  
  return ideas;
}

module.exports = {
  industryCategories,
  detectIndustry,
  getIndustryOccasions,
  getRandomOccasions,
  generateOccasionIdeas,
  generateRandomOccasionIdeas
};
