const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");

require("dotenv").config();

// -- اضافه کردن OpenAI --
const OpenAI = require("openai");

// -- اضافه کردن ماژول دسته‌بندی صنایع --
const { detectIndustry, getIndustryOccasions, getRandomOccasions, generateOccasionIdeas, generateRandomOccasionIdeas } = require("./industryCategories");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "ابتدا وارد شوید" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "احراز هویت ناموفق بود" });
  }
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ اتصال موفق به دیتابیس"))
  .catch(err => console.error("❌ خطا در اتصال به دیتابیس:", err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);

const brandSchema = new mongoose.Schema({
  name: String,
  field: String,
  industry: String, // اضافه کردن فیلد صنعت
  employeeCount: { 
    type: String, 
    enum: ['1-9', '10-49', '50-99', '100-499', '500+'],
    required: true
  },
  mentalHealthAssessment: {
    type: String,
    enum: ['کمتر از ۶ ماه پیش', '۶–۱۲ ماه گذشته', '۱–۲ سال گذشته', 'بیش از ۲ سال گذشته', 'هرگز']
  },
  organizationalTraining: {
    type: String,
    enum: ['کمتر از ۳ ماه گذشته', '۳–۱۲ ماه گذشته', 'بیش از ۱ سال گذشته', 'هرگز']
  },
  // اضافه کردن فیلد questions به شکل آرایه‌ای از آبجکت‌ها
  questions: [
    {
      id: Number,
      question: String,
      answer: String,
    }
  ],
  priorities: [String],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});



const Brand = mongoose.model("Brand", brandSchema);

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));


// -- مسیر ثبت نام --
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ error: "ایمیل تکراری است." });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashed });
    await user.save();

    // ایجاد JWT token برای ورود خودکار
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "ثبت‌نام موفق بود. شما وارد شدید.",
      userId: user._id
    });
  } catch (err) {
    console.error("خطا در ثبت‌نام:", err);
    res.status(500).json({ error: "خطا در ثبت‌نام" });
  }
});


// -- مسیر ورود --
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "کاربر یافت نشد" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "رمز اشتباه است" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "ورود موفق", userId: user._id });
  } catch (err) {
    console.error("خطا در ورود:", err);
    res.status(500).json({ error: "خطا در ورود" });
  }
});

// -- خروج --
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "خروج موفق" });
});

// -- بررسی احراز هویت --
app.get("/api/check-auth", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ authenticated: false });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, userId: decoded.userId });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

// -- بررسی ثبت برند قبلی --
app.get("/api/check-brand", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "ابتدا وارد شوید" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const existing = await Brand.findOne({ userId });
    if (existing) return res.json({ hasBrand: true });
    else return res.json({ hasBrand: false });

  } catch (err) {
    console.error("خطا در بررسی ثبت برند:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// -- ثبت برند --
app.post("/api/brands", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "ابتدا وارد شوید" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const existing = await Brand.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "برند قبلا ثبت شده", alreadyExists: true });
    }

    // تشخیص صنعت بر اساس فیلد
    const industry = detectIndustry(req.body.field || "");
    
    // req.body باید شامل questions باشه
    const brandData = { 
      ...req.body, 
      industry, // اضافه کردن صنعت تشخیص داده شده
      userId 
    };
    const newBrand = new Brand(brandData);
    await newBrand.save();

    res.status(201).json({ 
      message: "✅ برند با موفقیت ذخیره شد", 
      alreadyExists: false,
      industry // ارسال صنعت تشخیص داده شده به کلاینت
    });
  } catch (err) {
    console.error("❌ خطا در ذخیره برند:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});



// -- دریافت همه برندها --
app.get("/api/brands", async (req, res) => {
  try {
    const brands = await Brand.find();
    res.json(brands);
  } catch (err) {
    console.error("خطا در دریافت برندها:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// -- دریافت دسته‌بندی‌های موجود --
app.get("/api/brand-categories", async (req, res) => {
  try {
    const brands = await Brand.find({}, 'field industry');
    console.log(`📊 تعداد برندها در دیتابیس: ${brands.length}`);
    
    const categories = new Set();
    const fields = [];
    const industries = [];
    
    brands.forEach(brand => {
      if (brand.field) {
        const field = brand.field.trim();
        categories.add(field);
        fields.push(field);
      }
      if (brand.industry) {
        const industry = brand.industry.trim();
        categories.add(industry);
        industries.push(industry);
      }
    });
    
    console.log('🏷️ فیلدهای موجود:', fields);
    console.log('🏭 صنایع موجود:', industries);
    
    const uniqueCategories = Array.from(categories).sort();
    console.log('📋 دسته‌بندی‌های نهایی:', uniqueCategories);
    
    res.json({ 
      categories: uniqueCategories,
      totalBrands: brands.length,
      fields: Array.from(new Set(fields)).sort(),
      industries: Array.from(new Set(industries)).sort()
    });
  } catch (err) {
    console.error("خطا در دریافت دسته‌بندی‌ها:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// -- دریافت پیشنهادها --
app.get("/api/recommendations", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "ابتدا وارد شوید" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const myBrand = await Brand.findOne({ userId });
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const myTop3 = myBrand.priorities.slice(0, 3);

    const allBrands = await Brand.find({ userId: { $ne: userId } });

    const similarBrands = allBrands.filter(brand => {
      const top3 = brand.priorities.slice(0, 3);
      return myTop3.some(priority => top3.includes(priority));
    });

    res.json(similarBrands.map(b => ({
      _id: b._id,
      name: b.name,
      field: b.field
    })));
  } catch (err) {
    console.error("خطا در دریافت پیشنهاد:", err);
    res.status(500).json({ error: "خطای سرور" });
  }
});

// -- دریافت برند خود کاربر --
app.get('/api/my-brand', authMiddleware, async (req, res) => {
  try {
    const brand = await Brand.findOne({ userId: req.user.userId });
    if (!brand) return res.status(404).json({ error: "برند شما یافت نشد" });
    res.json(brand);
  } catch (err) {
    console.error("خطا در دریافت برند کاربر:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// -- دریافت برند بر اساس id --
app.get('/api/brand/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ error: "برند یافت نشد" });
    res.json(brand);
  } catch (err) {
    console.error("خطا در دریافت برند هدف:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// -- دریافت مناسبت‌های صنعتی --
app.get("/api/industry-occasions/:industry", (req, res) => {
  try {
    const { industry } = req.params;
    const occasions = getIndustryOccasions(industry);
    res.json({ industry, occasions });
  } catch (error) {
    console.error("خطا در دریافت مناسبت‌ها:", error);
    res.status(500).json({ error: "خطا در دریافت مناسبت‌ها" });
  }
});

// -- تولید ایده‌های مناسبتی رندوم --
app.post("/api/generate-occasion-ideas", async (req, res) => {
  try {
    const { myBrandId, targetBrandId } = req.body;
    
    if (!myBrandId || !targetBrandId) {
      return res.status(400).json({ error: "شناسه برندها الزامی است" });
    }
    
    const myBrand = await Brand.findById(myBrandId);
    const targetBrand = await Brand.findById(targetBrandId);
    
    if (!myBrand || !targetBrand) {
      return res.status(404).json({ error: "برند یافت نشد" });
    }
    
    const myIndustry = myBrand.industry || detectIndustry(myBrand.field);
    const targetIndustry = targetBrand.industry || detectIndustry(targetBrand.field);
    
    const occasionIdeas = generateRandomOccasionIdeas(myIndustry, targetIndustry);
    
    res.json({
      myIndustry,
      targetIndustry,
      ideas: occasionIdeas
    });
  } catch (error) {
    console.error("خطا در تولید ایده‌های مناسبتی:", error);
    res.status(500).json({ error: "خطا در تولید ایده‌های مناسبتی" });
  }
});

// -- تشخیص صنعت بر اساس فیلد --
app.post("/api/detect-industry", (req, res) => {
  try {
    const { field } = req.body;
    if (!field) {
      return res.status(400).json({ error: "فیلد الزامی است" });
    }
    
    const industry = detectIndustry(field);
    const occasions = getIndustryOccasions(industry);
    
    res.json({ 
      field, 
      industry, 
      occasions: occasions // همه مناسبت‌ها
    });
  } catch (error) {
    console.error("خطا در تشخیص صنعت:", error);
    res.status(500).json({ error: "خطا در تشخیص صنعت" });
  }
});

// -- ارسال پیام به OpenAI و دریافت پاسخ --
app.post("/api/generate-ideas", async (req, res) => {
  try {
    const { prompt, myBrandId, targetBrandId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "پیشنهاد الزامی است" });
    }

    // اگر اطلاعات برندها موجود است، مناسبت‌ها را اضافه کن
    let enhancedPrompt = prompt;
    if (myBrandId && targetBrandId) {
      try {
        const myBrand = await Brand.findById(myBrandId);
        const targetBrand = await Brand.findById(targetBrandId);
        
        if (myBrand && targetBrand) {
          const myIndustry = myBrand.industry || detectIndustry(myBrand.field);
          const targetIndustry = targetBrand.industry || detectIndustry(targetBrand.field);
          
          const myOccasions = getRandomOccasions(myIndustry, 3);
          const targetOccasions = getRandomOccasions(targetIndustry, 3);
          
          // اضافه کردن اطلاعات مناسبت‌ها به پرامپت
          enhancedPrompt += `\n\n🎉 **مناسبت‌های تصادفی مرتبط با صنعت شما (${myIndustry}):**\n`;
          myOccasions.forEach(occasion => {
            enhancedPrompt += `- ${occasion.name}\n`;
          });
          
          enhancedPrompt += `\n🎉 **مناسبت‌های تصادفی مرتبط با صنعت برند هدف (${targetIndustry}):**\n`;
          targetOccasions.forEach(occasion => {
            enhancedPrompt += `- ${occasion.name}\n`;
          });
          
          enhancedPrompt += `\n\n💡 **لطفاً در ایده‌های همکاری، این مناسبت‌ها را در نظر بگیرید و ایده‌های مناسبتی خلاقانه ارائه دهید که شامل:**
          
          **از مناسبت‌های صنعت شما:**
          - برنامه‌های ویژه و کمپین‌های مرتبط با ${myOccasions.map(o => o.name).join('، ')}
          - هدایای مناسبتی و جوایز ویژه
          - رویدادهای تخصصی و کارگاه‌های آموزشی
          
          **از مناسبت‌های صنعت برند هدف:**
          - همکاری در ${targetOccasions.map(o => o.name).join('، ')}
          - مشارکت در برنامه‌های مشترک
          - حمایت از رویدادهای تخصصی آن‌ها
          
          **ایده‌های ترکیبی:**
          - ترکیب مناسبت‌های دو صنعت برای ایجاد برنامه‌های نوآورانه
          - کمپین‌های مشترک که هر دو مناسبت را پوشش دهد
          - رویدادهای تخصصی که مزایای هر دو صنعت را در نظر بگیرد`;
        }
      } catch (err) {
        console.log("خطا در دریافت اطلاعات مناسبت‌ها:", err.message);
        // اگر خطا رخ داد، پرامپت اصلی را استفاده کن
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "تو یک تحلیل‌گر حرفه‌ای و ایده‌پرداز هستی که در تولید ایده‌های مناسبتی و خلاقانه تخصص داری." },
        { role: "user", content: enhancedPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    });

    res.json({ 
      choices: completion.choices,
      usage: completion.usage 
    });
  } catch (error) {
    console.error("خطا در OpenAI:", error);
    
    // اگر خطای اتصال است، پیام مناسب برگردان
    if (error.code === 'ECONNRESET' || error.type === 'APIConnectionError' || error.constructor.name === 'APIConnectionError' || error.message.includes('Connection error')) {
      res.status(503).json({ 
        error: "سرویس تحلیل ایده‌ها موقتاً در دسترس نیست. لطفاً بعداً تلاش کنید.",
        choices: [{
          message: {
            content: "متأسفانه در حال حاضر امکان تحلیل ایده‌ها وجود ندارد. لطفاً بعداً دوباره تلاش کنید."
          }
        }]
      });
    } else {
      res.status(500).json({ 
        error: "خطا در تولید ایده‌ها", 
        details: error.message 
      });
    }
  }
});

// -- تولید مدل‌های درآمدی --
app.post("/api/generate-revenue-models", async (req, res) => {
  try {
    const { ideaDescription, myBrandId, targetBrandId } = req.body;
    if (!ideaDescription) {
      return res.status(400).json({ error: "شرح ایده الزامی است" });
    }

    // دریافت اطلاعات برندها برای بهبود پرامپت
    let enhancedPrompt = ideaDescription;
    let myBrand = null;
    let targetBrand = null;
    
    if (myBrandId && targetBrandId) {
      try {
        myBrand = await Brand.findById(myBrandId);
        targetBrand = await Brand.findById(targetBrandId);
        
        if (myBrand && targetBrand) {
          enhancedPrompt += `\n\n**اطلاعات برند من:** ${myBrand.name} - ${myBrand.field}\n`;
          enhancedPrompt += `**اطلاعات برند همکار:** ${targetBrand.name} - ${targetBrand.field}`;
        }
      } catch (err) {
        console.log("خطا در دریافت اطلاعات برندها:", err.message);
      }
    }
    const revenuePrompt = `
    تو یک نابغه کسب‌وکار و مشاور استراتژیک برند در سطح جهانی هستی، کسی که تجربه خلق مدل‌های درآمدی میلیارد دلاری و فوق‌العاده خلاقانه برای برندهای مختلف را دارد.  
    هدف تو این است که از ایده همکاری زیر، **5 مدل درآمدی حرفه‌ای و کاملاً عملی برای برند اول و 5 مدل برای برند دوم** بسازی.  
    
    ایده همکاری: ${enhancedPrompt}
    
    **نکات مهم برای تولید مدل‌ها:**  
    - مدل‌ها باید کاملاً خلاقانه، نوآورانه و منحصر به فرد باشند.  
    - مدل‌ها باید عملی و قابل اجرا باشند، بدون ارائه فیلدهای خشک یا جدول‌بندی رسمی.  
    - توضیحات هر مدل باید **جزئیات دقیق، مثال‌های کاربردی و نحوه درآمدزایی** را نشان دهد.  
    - می‌توانی از انواع مدل‌ها استفاده کنی: فروش مستقیم، اشتراک، اسپانسرشیپ، خدمات ویژه، آپ‌سل، تبلیغات، لید جن، بسته‌های B2B و هر روش دیگری که خلاقانه و سودآور باشد.  
    - سبک نوشتار باید **مثل مشاور میلیارد دلاری** باشد، طبیعی، روان و با تمام جزئیات لازم برای درک ارزش مدل.  
    
    **برای ${myBrand ? myBrand.name : 'برند اول'}:**  
    1. [مدل درآمدی اول و توضیحات کاملش با جزئیات عملی، مثال‌ها، نحوه درآمدزایی و ایده‌های ترکیبی]  
    2. [مدل درآمدی دوم...]  
    3. [مدل درآمدی سوم...]  
    4. [مدل درآمدی چهارم...]  
    5. [مدل درآمدی پنجم...]  
    
    **برای ${targetBrand ? targetBrand.name : 'برند دوم'}:**  
    1. [مدل درآمدی اول و توضیحات کاملش با جزئیات عملی، مثال‌ها، نحوه درآمدزایی و ایده‌های ترکیبی]  
    2. [مدل درآمدی دوم...]  
    3. [مدل درآمدی سوم...]  
    4. [مدل درآمدی چهارم...]  
    5. [مدل درآمدی پنجم...]  
    
    **تذکر:**  
    - هیچ مدل نباید شبیه دیگری باشد، تمام مدل‌ها باید خلاقانه، متمایز و جذاب باشند.  
    - توضیحات باید واقعی و قابل تصور برای اجرای عملی باشند، نه کلی و سطحی.  
    -مدل های درامدی ارائه شده کاملا باید برای ایده ای باشند که روی آن تمرکز میشود یعنی : ${enhancedPrompt}
    - تمرکز روی سودآوری، نوآوری و عملی بودن مدل‌ها باشد.  
    - سبک نوشتار باید **جذاب، حرفه‌ای و به گونه‌ای باشد که خواننده احساس کند یک مشاور برند حرفه‌ای و با تجربه آن را نوشته است.**
    `;
    
    
    

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: "تو یک نابغه کسب‌وکار هستی که می‌تونی از هر ایده همکاری، مدل‌های درآمدی فوق‌العاده خلق کنی. تو همیشه بر اساس ایده همکاری خاص ارائه شده مدل‌های درآمدی طراحی می‌کنی و هرگز از مدل‌های کلی کسب‌وکار استفاده نمی‌کنی. تو قادرید نقاط قوت هر ایده همکاری را شناسایی کرده و آن‌ها را به مدل‌های درآمدی خلاقانه و قابل اجرا تبدیل کنی." 
        },
        { role: "user", content: revenuePrompt }
      ],
      
      max_tokens: 2000
    });

    // چاپ خروجی خام در کنسول
    console.log("🔍 خروجی خام API مدل‌های درآمدی:");
    console.log("==================================================");
    console.log(completion.choices[0].message.content);
    console.log("==================================================");

    res.json({ 
      choices: completion.choices,
      usage: completion.usage 
    });
  } catch (error) {
    console.error("خطا در تولید مدل‌های درآمدی:", error);
    
    if (error.code === 'ECONNRESET' || error.type === 'APIConnectionError' || error.constructor.name === 'APIConnectionError' || error.message.includes('Connection error')) {
      res.status(503).json({ 
        error: "سرویس تولید مدل‌های درآمدی موقتاً در دسترس نیست. لطفاً بعداً تلاش کنید.",
        choices: [{
          message: {
            content: "متأسفانه در حال حاضر امکان تولید مدل‌های درآمدی وجود ندارد. لطفاً بعداً دوباره تلاش کنید."
          }
        }]
      });
    } else {
      res.status(500).json({ 
        error: "خطا در تولید مدل‌های درآمدی", 
        details: error.message 
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 سرور در حال اجرا روی http://localhost:${PORT}`);
});


// --- ویرایش برند ---
app.put("/api/brand/:id", authMiddleware, async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ error: "برند پیدا نشد" });
    if (brand.userId.toString() !== req.user.userId)
      return res.status(403).json({ error: "دسترسی ندارید" });

    Object.assign(brand, req.body);
    await brand.save();

    res.json({ message: "برند با موفقیت بروزرسانی شد" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در بروزرسانی برند" });
  }
});

// --- پذیرفتن همکاری ---
app.post("/api/accept-cooperation", authMiddleware, async (req, res) => {
  try {
    const { messageId, ideaTitle, ideaDescription } = req.body;
    
    if (!messageId) {
      return res.status(400).json({ error: "شناسه پیام الزامی است" });
    }

    // پیدا کردن پیام اصلی
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: "پیام پیدا نشد" });
    }

    // بررسی اینکه پیام برای کاربر فعلی است
    const currentBrand = await Brand.findOne({ userId: req.user.userId });
    if (!currentBrand) {
      return res.status(404).json({ error: "برند پیدا نشد" });
    }

    if (originalMessage.recipientBrandId.toString() !== currentBrand._id.toString()) {
      return res.status(403).json({ error: "دسترسی ندارید" });
    }

    // بروزرسانی وضعیت پیام اصلی
    originalMessage.status = 'accepted';
    await originalMessage.save();

    // بروزرسانی درخواست همکاری
    const cooperationRequest = await CooperationRequest.findOne({ messageId: messageId });
    if (cooperationRequest) {
      cooperationRequest.status = 'accepted';
      cooperationRequest.updatedAt = new Date();
      await cooperationRequest.save();
    }

    // ایجاد پیام تایید
    const acceptanceMessage = new Message({
      senderBrandId: currentBrand._id,
      recipientBrandId: originalMessage.senderBrandId,
      subject: `پذیرش همکاری: ${ideaTitle}`,
      content: `برند ${currentBrand.name} درخواست همکاری شما را پذیرفت.`,
      messageType: 'cooperation_acceptance',
      ideaTitle: ideaTitle,
      ideaDescription: ideaDescription,
      status: 'sent'
    });

    await acceptanceMessage.save();

    // بروزرسانی درخواست همکاری با پیام تایید
    if (cooperationRequest) {
      cooperationRequest.acceptanceMessageId = acceptanceMessage._id;
      await cooperationRequest.save();
    }

    res.json({ 
      message: "همکاری با موفقیت پذیرفته شد",
      acceptanceMessageId: acceptanceMessage._id
    });

  } catch (error) {
    console.error("خطا در پذیرش همکاری:", error);
    res.status(500).json({ error: "خطا در پذیرش همکاری" });
  }
});

// --- دریافت وضعیت درخواست همکاری ---
app.get("/api/cooperation-status/:ideaTitle", authMiddleware, async (req, res) => {
  try {
    const { ideaTitle } = req.params;
    
    const currentBrand = await Brand.findOne({ userId: req.user.userId });
    if (!currentBrand) {
      return res.status(404).json({ error: "برند پیدا نشد" });
    }

    // بررسی درخواست‌های ارسالی
    const sentRequests = await CooperationRequest.find({
      requesterBrandId: currentBrand._id,
      ideaTitle: ideaTitle
    }).populate('targetBrandId', 'name');

    // بررسی درخواست‌های دریافتی
    const receivedRequests = await CooperationRequest.find({
      targetBrandId: currentBrand._id,
      ideaTitle: ideaTitle
    }).populate('requesterBrandId', 'name');

    res.json({
      sentRequests: sentRequests.map(req => ({
        id: req._id,
        targetBrand: req.targetBrandId.name,
        status: req.status,
        createdAt: req.createdAt
      })),
      receivedRequests: receivedRequests.map(req => ({
        id: req._id,
        requesterBrand: req.requesterBrandId.name,
        status: req.status,
        messageId: req.messageId,
        createdAt: req.createdAt
      }))
    });

  } catch (error) {
    console.error("خطا در دریافت وضعیت همکاری:", error);
    res.status(500).json({ error: "خطا در دریافت وضعیت همکاری" });
  }
});

// --- Schema برای ایده‌ها ---
const ideaSchema = new mongoose.Schema({
  title: String,
  description: String,
  myBrandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  partnerBrandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
  // اضافه کردن فیلدهای مربوط به درخواست همکاری
  collaborationRequestSent: { type: Boolean, default: false },
  collaborationRequestAccepted: { type: Boolean, default: false },
  collaborationRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "CooperationRequest" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Idea = mongoose.model("Idea", ideaSchema);

// --- Schema برای پیام‌ها ---
const messageSchema = new mongoose.Schema({
  senderBrandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  recipientBrandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  subject: String,
  content: String,
  isRead: { type: Boolean, default: false },
  messageType: { type: String, enum: ['cooperation_request', 'cooperation_acceptance'], required: true },
  ideaTitle: String,
  ideaDescription: String,
  status: { type: String, enum: ['sent', 'accepted', 'rejected'], default: 'sent' },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// --- Schema برای درخواست‌های همکاری ---
const cooperationRequestSchema = new mongoose.Schema({
  requesterBrandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  targetBrandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  ideaTitle: { type: String, required: true },
  ideaDescription: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  acceptanceMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CooperationRequest = mongoose.model("CooperationRequest", cooperationRequestSchema);

// --- دریافت جزئیات ایده بر اساس ID ---
app.get("/api/ideas/:ideaId", authMiddleware, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const idea = await Idea.findById(ideaId)
      .populate('myBrandId partnerBrandId', 'name field');

    if (!idea) return res.status(404).json({ error: "ایده یافت نشد" });

    // بررسی دسترسی
    const isOwner = idea.myBrandId._id.toString() === myBrand._id.toString();
    const isPartner = idea.partnerBrandId._id.toString() === myBrand._id.toString();
    
    console.log("🔍 Debug - ideaId:", ideaId);
    console.log("🔍 Debug - myBrand._id:", myBrand._id);
    console.log("🔍 Debug - idea.myBrandId._id:", idea.myBrandId._id);
    console.log("🔍 Debug - idea.partnerBrandId._id:", idea.partnerBrandId._id);
    console.log("🔍 Debug - isOwner:", isOwner);
    console.log("🔍 Debug - isPartner:", isPartner);

    if (!isOwner && !isPartner) {
      return res.status(403).json({ error: "دسترسی ندارید" });
    }

    res.json(idea);
  } catch (err) {
    console.error("خطا در دریافت جزئیات ایده:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- دریافت ایده‌های همکاری ---
app.get("/api/ideas/partner/:partnerId", authMiddleware, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const ideas = await Idea.find({
      $or: [
        { myBrandId: myBrand._id, partnerBrandId: partnerId },
        { myBrandId: partnerId, partnerBrandId: myBrand._id }
      ]
    }).populate('myBrandId partnerBrandId', 'name field');

    res.json(ideas);
  } catch (err) {
    console.error("خطا در دریافت ایده‌ها:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- ذخیره ایده جدید ---
app.post("/api/ideas", authMiddleware, async (req, res) => {
  try {
    const { title, description, partnerBrandId } = req.body;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const idea = new Idea({
      title,
      description,
      myBrandId: myBrand._id,
      partnerBrandId
    });

    await idea.save();
    res.status(201).json({ message: "ایده با موفقیت ذخیره شد", idea });
  } catch (err) {
    console.error("خطا در ذخیره ایده:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- دریافت پیام‌های دریافتی ---
app.get("/api/messages/received", authMiddleware, async (req, res) => {
  try {
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const messages = await Message.find({ recipientBrandId: myBrand._id })
      .populate('senderBrandId', 'name field')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    console.error("خطا در دریافت پیام‌ها:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- دریافت پیام‌های ارسالی ---
app.get("/api/messages/sent", authMiddleware, async (req, res) => {
  try {
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const messages = await Message.find({ senderBrandId: myBrand._id })
      .populate('recipientBrandId', 'name field')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    console.error("خطا در دریافت پیام‌های ارسالی:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- ارسال درخواست همکاری ---
app.post("/api/cooperation-requests", authMiddleware, async (req, res) => {
  try {
    const { targetBrandId, ideaTitle, ideaDescription } = req.body;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    // بررسی اینکه آیا قبلاً درخواست ارسال شده یا نه
    const existingRequest = await CooperationRequest.findOne({
      requesterBrandId: myBrand._id,
      targetBrandId: targetBrandId,
      ideaTitle: ideaTitle
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: "درخواست همکاری قبلاً برای این ایده ارسال شده است",
        status: existingRequest.status 
      });
    }

    // ایجاد پیام
    const subject = `درخواست همکاری: ${ideaTitle}`;
    const content = `
سلام،

من از برند ${myBrand.name} هستم و علاقه‌مند به همکاری در زمینه زیر هستم:

**عنوان ایده:** ${ideaTitle}
**توضیحات:** ${ideaDescription}

امیدوارم بتوانیم در این زمینه همکاری کنیم.

با تشکر
${myBrand.name}
    `.trim();

    const message = new Message({
      senderBrandId: myBrand._id,
      recipientBrandId: targetBrandId,
      subject,
      content,
      messageType: 'cooperation_request',
      ideaTitle,
      ideaDescription,
      status: 'sent'
    });

    await message.save();

    // ایجاد درخواست همکاری
    const cooperationRequest = new CooperationRequest({
      requesterBrandId: myBrand._id,
      targetBrandId: targetBrandId,
      ideaTitle,
      ideaDescription,
      messageId: message._id,
      status: 'pending'
    });

    await cooperationRequest.save();

    // بروزرسانی وضعیت ایده
    const idea = await Idea.findOne({
      title: ideaTitle,
      myBrandId: myBrand._id,
      partnerBrandId: targetBrandId
    });

    if (idea) {
      idea.collaborationRequestSent = true;
      idea.collaborationRequestId = cooperationRequest._id;
      await idea.save();
    }

    res.status(201).json({ 
      message: "درخواست همکاری با موفقیت ارسال شد", 
      requestId: cooperationRequest._id,
      messageId: message._id 
    });
  } catch (err) {
    console.error("خطا در ارسال درخواست همکاری:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- پذیرش درخواست همکاری ---
app.post("/api/cooperation-requests/:requestId/accept", authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const cooperationRequest = await CooperationRequest.findById(requestId)
      .populate('requesterBrandId', 'name')
      .populate('targetBrandId', 'name');

    if (!cooperationRequest) {
      return res.status(404).json({ error: "درخواست همکاری یافت نشد" });
    }

    if (cooperationRequest.targetBrandId._id.toString() !== myBrand._id.toString()) {
      return res.status(403).json({ error: "شما مجاز به پذیرش این درخواست نیستید" });
    }

    if (cooperationRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: "این درخواست قبلاً پردازش شده است",
        status: cooperationRequest.status 
      });
    }

    // ایجاد پیام پذیرش
    const subject = `پذیرش درخواست همکاری: ${cooperationRequest.ideaTitle}`;
    const content = `
سلام،

من از برند ${myBrand.name} هستم و درخواست همکاری شما را در زمینه زیر می‌پذیرم:

**عنوان ایده:** ${cooperationRequest.ideaTitle}
**توضیحات:** ${cooperationRequest.ideaDescription}

من آماده همکاری در این زمینه هستم و منتظر تماس شما برای شروع همکاری هستم.

با تشکر
${myBrand.name}
    `.trim();

    const acceptanceMessage = new Message({
      senderBrandId: myBrand._id,
      recipientBrandId: cooperationRequest.requesterBrandId._id,
      subject,
      content,
      messageType: 'cooperation_acceptance',
      ideaTitle: cooperationRequest.ideaTitle,
      ideaDescription: cooperationRequest.ideaDescription,
      status: 'sent'
    });

    await acceptanceMessage.save();

    // به‌روزرسانی وضعیت درخواست
    cooperationRequest.status = 'accepted';
    cooperationRequest.acceptanceMessageId = acceptanceMessage._id;
    cooperationRequest.updatedAt = new Date();
    await cooperationRequest.save();

    // بروزرسانی وضعیت ایده
    const idea = await Idea.findOne({
      title: cooperationRequest.ideaTitle,
      myBrandId: cooperationRequest.requesterBrandId._id,
      partnerBrandId: myBrand._id
    });

    if (idea) {
      idea.collaborationRequestAccepted = true;
      idea.status = 'active';
      await idea.save();
    }

    res.json({ 
      message: "درخواست همکاری با موفقیت پذیرفته شد",
      acceptanceMessageId: acceptanceMessage._id 
    });
  } catch (err) {
    console.error("خطا در پذیرش درخواست همکاری:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- بررسی وضعیت درخواست همکاری ---
app.get("/api/cooperation-requests/check/:ideaTitle/:targetBrandId", authMiddleware, async (req, res) => {
  try {
    const { ideaTitle, targetBrandId } = req.params;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    // بررسی درخواست ارسالی
    const sentRequest = await CooperationRequest.findOne({
      requesterBrandId: myBrand._id,
      targetBrandId: targetBrandId,
      ideaTitle: ideaTitle
    });

    // بررسی درخواست دریافتی
    const receivedRequest = await CooperationRequest.findOne({
      requesterBrandId: targetBrandId,
      targetBrandId: myBrand._id,
      ideaTitle: ideaTitle
    });

    res.json({
      hasSentRequest: !!sentRequest,
      hasReceivedRequest: !!receivedRequest,
      sentRequestStatus: sentRequest?.status || null,
      receivedRequestStatus: receivedRequest?.status || null,
      sentRequestId: sentRequest?._id || null,
      receivedRequestId: receivedRequest?._id || null
    });
  } catch (err) {
    console.error("خطا در بررسی وضعیت درخواست همکاری:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- بررسی وضعیت درخواست همکاری برای ایده خاص ---
app.get("/api/ideas/:ideaId/collaboration-status", authMiddleware, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).json({ error: "ایده یافت نشد" });

    // بررسی اینکه آیا کاربر صاحب ایده است یا نه
    const isOwner = idea.myBrandId.toString() === myBrand._id.toString();
    const isPartner = idea.partnerBrandId.toString() === myBrand._id.toString();

    if (!isOwner && !isPartner) {
      return res.status(403).json({ error: "دسترسی ندارید" });
    }

    // بررسی درخواست‌های همکاری
    const sentRequest = await CooperationRequest.findOne({
      requesterBrandId: myBrand._id,
      targetBrandId: isOwner ? idea.partnerBrandId : idea.myBrandId,
      ideaTitle: idea.title
    });

    const receivedRequest = await CooperationRequest.findOne({
      requesterBrandId: isOwner ? idea.partnerBrandId : idea.myBrandId,
      targetBrandId: myBrand._id,
      ideaTitle: idea.title
    });

    res.json({
      isOwner,
      isPartner,
      ideaTitle: idea.title,
      ideaDescription: idea.description,
      hasSentRequest: !!sentRequest,
      hasReceivedRequest: !!receivedRequest,
      sentRequestStatus: sentRequest?.status || null,
      receivedRequestStatus: receivedRequest?.status || null,
      sentRequestId: sentRequest?._id || null,
      receivedRequestId: receivedRequest?._id || null,
      canSendRequest: isOwner && !sentRequest,
      canAcceptRequest: isPartner && receivedRequest && receivedRequest.status === 'pending'
    });
  } catch (err) {
    console.error("خطا در بررسی وضعیت همکاری ایده:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- ارسال پیام ---
app.post("/api/messages", authMiddleware, async (req, res) => {
  try {
    const { recipientBrandId, subject, content, messageType, ideaTitle, ideaDescription } = req.body;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const message = new Message({
      senderBrandId: myBrand._id,
      recipientBrandId,
      subject,
      content,
      messageType: messageType || 'cooperation_request',
      ideaTitle,
      ideaDescription,
      status: 'sent'
    });

    await message.save();
    res.status(201).json({ message: "پیام با موفقیت ارسال شد", messageId: message._id });
  } catch (err) {
    console.error("خطا در ارسال پیام:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- به‌روزرسانی وضعیت پیام ---
app.put("/api/messages/:messageId/status", authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;
    
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "پیام یافت نشد" });
    
    message.status = status;
    await message.save();
    
    res.json({ message: "وضعیت پیام به‌روزرسانی شد" });
  } catch (err) {
    console.error("خطا در به‌روزرسانی وضعیت پیام:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- بررسی وضعیت پیام برای ایده ---
app.get("/api/messages/check-status/:ideaTitle/:targetBrandId", authMiddleware, async (req, res) => {
  try {
    const { ideaTitle, targetBrandId } = req.params;
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    // بررسی پیام‌های ارسالی
    const sentMessage = await Message.findOne({
      senderBrandId: myBrand._id,
      recipientBrandId: targetBrandId,
      ideaTitle: ideaTitle,
      messageType: 'cooperation_request'
    });

    // بررسی پیام‌های دریافتی (پذیرش)
    const receivedMessage = await Message.findOne({
      senderBrandId: targetBrandId,
      recipientBrandId: myBrand._id,
      ideaTitle: ideaTitle,
      messageType: 'cooperation_acceptance'
    });

    res.json({
      hasSentRequest: !!sentMessage,
      hasReceivedAcceptance: !!receivedMessage,
      sentMessageStatus: sentMessage?.status || null,
      receivedMessageStatus: receivedMessage?.status || null
    });
  } catch (err) {
    console.error("خطا در بررسی وضعیت پیام:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- آمار داشبورد ---
app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const myBrand = await Brand.findOne({ userId: req.user.userId });
    if (!myBrand) return res.status(404).json({ error: "برند شما یافت نشد" });

    const totalPartners = await Brand.countDocuments({ _id: { $ne: myBrand._id } });
    const totalIdeas = await Idea.countDocuments({
      $or: [
        { myBrandId: myBrand._id },
        { partnerBrandId: myBrand._id }
      ]
    });
    const totalMessages = await Message.countDocuments({ recipientBrandId: myBrand._id });
    const activeCollaborations = await Idea.countDocuments({
      $or: [
        { myBrandId: myBrand._id },
        { partnerBrandId: myBrand._id }
      ],
      status: 'active'
    });

    res.json({
      totalPartners,
      totalIdeas,
      totalMessages,
      activeCollaborations
    });
  } catch (err) {
    console.error("خطا در دریافت آمار:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// --- Schema برای سوالات ---
const questionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  q: { type: String, required: true },
  type: { type: String, enum: ['text', 'dropdown', 'tag-input', 'checkbox', 'priority-select', 'priority-drag'] },
  options: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Question = mongoose.model("Question", questionSchema);







// --- تابع کمکی: بارگذاری سوالات پیش‌فرض ---
async function loadDefaultQuestions() {
  try {
    const defaultQuestions = [
      { id: 1, q: "برند خود را در یک جمله معرفی کنید.", type: "text" },
      { id: 2, q: "چه جایگاهی در بازار دارید؟", type: "text" },
      { id: 3, q: "در چه فازی از رشد هستید؟", type: "dropdown", options: ["شروع", "تثبیت", "رشد سریع", "بلوغ", "بازطراحی"] },
      { id: 4, q: "۳ اولویت اصلی برندتان در ۱۲ ماه آینده چیست؟ (به ترتیب اهمیت)", type: "text" },
      { id: 5, q: "در چه چیزهایی حاضرید سرمایه‌گذاری کنید؟ (پول، زمان، اعتبار)", type: "text" },
      { id: 6, q: "محصولات / خدمات اصلی شما چیست؟ (با توضیح کوتاه)", type: "tag-input" },
      { id: 7, q: "چطور درآمدزایی می‌کنید؟", type: "text" },
      { id: 8, q: "کدام‌یک از محصولاتتان قابلیت ترکیب با برندهای دیگر را دارد؟", type: "tag-input" },
      { id: 9, q: "کدام بخش‌های کسب‌وکارتان مقیاس‌پذیر است؟", type: "text" },
      { id: 10, q: "مشتری‌های شما بیشتر از کجا جذب می‌شوند و از چه کانال‌هایی فروش دارید؟", type: "text" },
      { id: 11, q: "محصولی دارید که بشه به‌عنوان هدیه یا پیشنهاد ترکیبی استفاده کرد؟", type: "text" },
      { id: 12, q: "چه ظرفیت‌هایی دارید که می‌توانند در همکاری مشترک استفاده شوند؟", type: "text" },
      { id: 13, q: "کدام منابع فعلاً کمتر از ظرفیت واقعی استفاده می‌شوند؟", type: "text" },
      { id: 14, q: "آیا مجاز به ارائه این منابع به بیرون هستید؟", type: "text" },
      { id: 15, q: "مشتری ایده‌آل شما کیست؟ (سن، صنعت، رفتار، دغدغه ...)", type: "text" },
      { id: 16, q: "تعداد مخاطبین فعال شما چقدر است؟", type: "text" },
      { id: 17, q: "مخاطبین شما بیشتر چه ویژگی روانی‌ای دارند؟", type: "text" },
      { id: 18, q: "سه ویژگی مهم که در رفتار و روحیه مشتریان شما وجود دارد چیست؟", type: "text" },
      { id: 19, q: "تجربه‌ای از همکاری با برندهای دیگر داشتید؟", type: "text" },
      { id: 20, q: "چه چیزی دارید که معمولاً به بیرون نمی‌دهید، ولی در همکاری خوب می‌توانید بدهید؟", type: "text" },
      { id: 21, q: "چه چیزی باعث می‌شود یک همکاری را متوقف کنید؟", type: "text" },
      { id: 22, q: "آیا در حال حاضر برند شما برنامه‌ای برای برونسپاری پروژه‌های کوچک دارد یا تمام کارها داخل مجموعه انجام می‌گردد؟", type: "text" },
      { id: 23, q: "هدف شما کدام صنعت است؟", type: "text" },
      { id: 24, q: "مهمترین مناسبت در صنعت و برای برند شما، چه روزهایی است؟", type: "text" },
      { id: 25, q: "آخرین بار چه زمانی پرسنل‌تان را از نظر سلامت روان ارزیابی کردید؟", type: "dropdown", options: ["کمتر از ۶ ماه پیش", "۶–۱۲ ماه گذشته", "۱–۲ سال گذشته", "بیش از ۲ سال گذشته", "هرگز"] },
      { id: 26, q: "آخرین باری که برند شما برای توانمندسازی کارکنان، از مدرس یا یک مشاور دعوت و یک دوره یا کارگاه سازمانی برگزار کرد، چه زمانی بوده؟", type: "dropdown", options: ["کمتر از ۳ ماه گذشته", "۳–۱۲ ماه گذشته", "بیش از ۱ سال گذشته", "هرگز"] },
      { id: 27, q: "در حال حاضر با احتمال وقوع یک شرایط ایده‌آل، کدامیک از شرایط اسپانسری را دارید؟", type: "checkbox", options: ["مالی", "رسانه‌ای", "مکان (سالن، گالری، سوله، فضای کار یا...)", "هدیه سازمانی", "ارتباطات خاص"] },
      { id: 28, q: "بر اساس تجربه، برای شکل‌گیری یک همکاری پایدار با شما، بهتر است سه اولویت برتر برند مقابل چه باید باشد؟", type: "priority-select", options: ["فرصت‌های توسعه بازار", "جذب سرمایه", "بهبود خدمات مشتری", "توسعه محصول", "افزایش فروش", "توسعه تیم", "ورود به بازار جدید", "ورود به بازار بین‌الملل", "تبلیغات و بازاریابی", "ارتقاء فناوری"] },
      { id: 29, q: "برای رشد کسب‌وکارتان در یک سال آینده، چه قابلیت‌ها یا منابعی نیاز دارید که الان ندارید؟", type: "text" },
      { id: 30, q: "در حال حاضر کدام بخش از فعالیت‌هایتان زمان یا انرژی بیشتری می‌گیرد و چرا؟", type: "text" },
      { id: 31, q: "اخیراً چه فرصت مهمی در بازار وجود داشته که حس می‌کنید به خاطر نداشتن آمادگی آن را از دست داده‌اید؟", type: "text" },
      { id: 32, q: "رقبای شما در چه زمینه‌ای عملکرد بهتری داشته‌اند یا چه کاری انجام داده‌اند که شما هنوز شروع نکرده‌اید؟", type: "text" },
      { id: 33, q: "فکر می‌کنید کدام معیار یا شاخص در کسب‌وکارتان نیازمند توجه بیشتر است؟", type: "text" },
      { id: 34, q: "در حال حاضر بزرگترین چالش‌هایی که برای توسعه کسب‌وکارتان دارید کدامند؟", type: "text" },
      { id: 35, q: "معمولاً مشتریان چه پیشنهاداتی برای بهبود محصولات یا خدمات شما دارند؟", type: "text" }
    ];

    // بررسی وجود سوالات و به‌روزرسانی
    const existingQuestions = await Question.find();

    if (existingQuestions.length === 0) {
      // اگر هیچ سوالی وجود ندارد، همه را اضافه کن
    for (const questionData of defaultQuestions) {
      const question = new Question(questionData);
      await question.save();
    }
      console.log(`${defaultQuestions.length} سوال پیش‌فرض بارگذاری شد`);
    } else {
      // اگر سوالات موجود است، فقط سوالات گمشده را اضافه کن
      let addedCount = 0;
      
      for (const questionData of defaultQuestions) {
        const existingQuestion = await Question.findOne({ id: questionData.id });
        
        if (!existingQuestion) {
          // فقط سوالات گمشده را اضافه کن
          const question = new Question(questionData);
          await question.save();
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        console.log(`${addedCount} سوال جدید اضافه شد`);
      } else {
        console.log("همه سوالات موجود است، هیچ تغییری اعمال نشد");
      }
    }
  } catch (err) {
    console.error("خطا در بارگذاری سوالات پیش‌فرض:", err);
  }
}



// --- بارگذاری سوالات پیش‌فرض در زمان راه‌اندازی سرور ---
loadDefaultQuestions();

