const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

require("dotenv").config();

// -- اضافه کردن OpenAI --
const OpenAI = require("openai");

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
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String }
});

const User = mongoose.model("User", userSchema);

const brandSchema = new mongoose.Schema({
  name: String,
  field: String,
  staff: String,
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

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = token;
  await user.save();

  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}&email=${user.email}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "لینک تایید ایمیل شما",
    html: `
      <p>برای تایید ایمیل خود روی لینک زیر کلیک کنید:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>اگر شما این درخواست را نداده‌اید این ایمیل را نادیده بگیرید.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

// -- مسیر ثبت نام --
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.isVerified) {
        return res.status(400).json({ error: "ایمیل تکراری است." });
      } else {
        await sendVerificationEmail(existing);
        return res.status(400).json({
          error: "ایمیل شما قبلاً ثبت شده ولی تایید نشده است. لطفاً ایمیل خود را بررسی کنید.",
        });
      }
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashed });
    await user.save();

    await sendVerificationEmail(user);

    res.status(201).json({
      message: "ثبت‌نام موفق بود. لطفا ایمیل خود را برای تایید چک کنید.",
    });
  } catch (err) {
    console.error("خطا در ثبت‌نام:", err);
    res.status(500).json({ error: "خطا در ثبت‌نام" });
  }
});

// -- مسیر تایید ایمیل --
app.get("/api/verify-email", async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).send("لینک تایید نامعتبر است.");

    const user = await User.findOne({ email, emailVerificationToken: token });
    if (!user) return res.status(400).send("لینک تایید نامعتبر است یا منقضی شده.");

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.send("ایمیل شما با موفقیت تایید شد. اکنون می‌توانید وارد شوید.");
  } catch (err) {
    console.error("خطا در تایید ایمیل:", err);
    res.status(500).send("خطا در سرور");
  }
});

// -- مسیر ورود --
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "کاربر یافت نشد" });

    if (!user.isVerified) return res.status(403).json({ error: "ایمیل شما تایید نشده است." });

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

    // req.body باید شامل questions باشه
    const brandData = { ...req.body, userId };
    const newBrand = new Brand(brandData);
    await newBrand.save();

    res.status(201).json({ message: "✅ برند با موفقیت ذخیره شد", alreadyExists: false });
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

// -- ارسال پیام به OpenAI و دریافت پاسخ --
app.post("/api/generate-ideas", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "پیشنهاد الزامی است" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "تو یک تحلیل‌گر حرفه‌ای و ایده‌پرداز هستی." },
        { role: "user", content: prompt }
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
    res.status(500).json({ 
      error: "خطا در تولید ایده‌ها", 
      details: error.message 
    });
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

