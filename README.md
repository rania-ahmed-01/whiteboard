# WhiteBoard Studio

تطبيق ويب لصناعة فيديوهات Whiteboard Animation — معمارية Client/Server مفصولة.

## 📂 البنية

```
white board/
│
├── 🖥️  backend/             ← السيرفر (Node + Express + SQLite)
│   ├── index.js              نقطة الدخول
│   ├── db.js                 إعداد SQLite + الجداول
│   ├── package.json          dependencies
│   ├── routes/
│   │   ├── auth.js           تسجيل / دخول / JWT
│   │   ├── projects.js       CRUD للمشاريع
│   │   └── uploads.js        رفع الملفات
│   ├── middleware/
│   │   └── auth.js           JWT verify
│   ├── uploads/              ملفات المستخدمين (gitignored)
│   └── data.db               قاعدة البيانات (gitignored)
│
├── 🎨 frontend/              ← الواجهة (Vanilla JS + SVG)
│   ├── index.html            البنية الرئيسية + auth modal
│   ├── style.css             التصميم
│   ├── app.js                محرك الـ Studio
│   ├── api.js                عميل الـ API
│   └── library.js            مكتبة الأيقونات
│
├── README.md
└── .gitignore
```

## 🚀 طريقة التشغيل

### 1) تنصيب dependencies الـ Backend

```bash
cd backend
npm install
```

### 2) تشغيل السيرفر

```bash
npm start          # عادى
npm run dev        # مع auto-reload
```

السيرفر بيشغّل على **http://localhost:3001** ويقدّم الـ frontend والـ API على نفس البورت.

افتحى المتصفح على هذا الرابط وابدأى!

## 🔌 الـ API

| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| POST | `/api/auth/register` | حساب جديد `{ email, password, name? }` |
| POST | `/api/auth/login` | دخول `{ email, password }` |
| GET | `/api/auth/me` | بيانات المستخدم الحالى |
| GET | `/api/projects` | قائمة المشاريع |
| GET | `/api/projects/:id` | تفاصيل مشروع |
| POST | `/api/projects` | إنشاء `{ name, data, thumbnail? }` |
| PUT | `/api/projects/:id` | تعديل |
| DELETE | `/api/projects/:id` | حذف |
| POST | `/api/uploads` | رفع ملف (multipart) |
| GET | `/api/health` | فحص حالة السيرفر |

كل routes الـ `projects` و `uploads` تتطلب `Authorization: Bearer <token>`.

## 🔒 الأمان

- **Passwords:** مشفرة bcrypt (10 rounds)
- **Auth:** JWT صالح ٣٠ يوم، مخزّن فى `localStorage`
- **Uploads:** حد ٥٠MB، أنواع image/audio/video/svg فقط

⚠️ **قبل النشر للإنتاج:**
- غيّرى `JWT_SECRET` (متغير بيئة)
- فعّلى HTTPS
- ضيفى rate limiting
- نقلى الصور من JSON inline لـ uploads endpoint

## ⚙️ متغيرات البيئة

```bash
PORT=3001                              # المنفذ (افتراضى 3001)
JWT_SECRET=your-strong-secret-here     # غيّريها للإنتاج
```

## 🛠 التقنيات

| الجانب | المكتبات |
|--------|----------|
| Backend | Express, better-sqlite3, bcryptjs, jsonwebtoken, multer, cors |
| Frontend | Vanilla JS, SVG, Canvas API, MediaRecorder, Web Audio API |

## ✨ المميزات

- 🔐 تسجيل / دخول / حسابات منفصلة
- 🎬 مشاهد متعددة + Timeline
- 📚 مكتبة 24 أيقونة + رفع SVG + رفع صور (PNG/JPG/أى صيغة)
- ✍️ نص بالعربى مع تأثير الكتابة اليدوية RTL
- 🎯 مقابض تفاعلية للتكبير والدوران على العنصر مباشرة
- 🎙️ تسجيل صوتى + تحكم بالسرعة + قص (start/end)
- 📹 تصدير فيديو WebM HD مع الصوت
- 💾 حفظ المشاريع على السيرفر + قائمة المشاريع
"# whiteboard" 
