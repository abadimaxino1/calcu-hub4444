# Calcu-Hub - Saudi Work & Salary Calculators

A comprehensive Progressive Web App (PWA) for salary calculations, end-of-service benefits, work hours, and date calculations tailored for Saudi Arabia.

## 🚀 Features

### Public Calculators
- **💰 Salary Calculator** - Calculate net salary after GOSI and deductions
- **🏆 End of Service Calculator** - EOS benefits per Articles 84 & 85
- **⏰ Work Hours Calculator** - Expected exit time and working hours
- **📅 Date Calculator** - Date differences and working days (Gregorian & Hijri)

### CMS (Content Management System)
- **Dynamic Blog** - Bilingual blog posts with Markdown support
- **FAQ Management** - Category-based FAQs (Global, Pay, EOS, Work, Dates)
- **Tools & Features** - Manage calculator cards and "Why use" features
- **SEO Management** - Per-page SEO configuration
- **Static Pages** - Manage About, Privacy, Terms pages

### Admin Panel
- **Analytics Dashboard** - Usage metrics and statistics
- **User Management** - Role-based access control (RBAC)
- **Content Editor** - CRUD for blog posts, FAQs, tools, features
- **Ad Configuration** - Manage AdSense slots
- **Monetization Panel** - Revenue tracking and reporting

### Progressive Web App (PWA)
- **Offline Support** - Service Worker with smart caching strategies
- **App Shortcuts** - Quick access to all 4 calculators
- **Installable** - Add to home screen on mobile and desktop
- **Responsive** - Works on all devices (iOS, Android, Windows, Mac)
- **Bilingual** - Full Arabic and English support with RTL

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Express + Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (production ready)
- **PWA**: Workbox Service Worker
- **i18n**: Custom bilingual system with RTL support
- **Auth**: Session-based with role-based access control

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/abadimaxino1/calcu-hub4444.git
cd calcu-hub4444

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate dev

# Start development server
npm run dev
```

## 🏗️ Build & Deploy

```bash
# Build for production
npm run build

# Run tests
npm test

# Preview production build
npm run preview
```

## 📱 Mobile Support

The app is fully optimized for mobile devices:
- Touch-friendly UI with minimum 44x44px touch targets
- Responsive design for all screen sizes
- iOS and Android PWA support
- App shortcuts for quick access
- Offline functionality

## 🔐 Security

- Content Security Policy (CSP) headers
- HSTS ready (configure at server level)
- X-Content-Type-Options: nosniff
- Session-based authentication
- Role-based access control (RBAC)

## 📖 API Endpoints

### Public APIs
- `GET /api/cms/tools` - Get calculator tools
- `GET /api/cms/features` - Get benefit features
- `GET /api/cms/faqs?category=global` - Get FAQs
- `GET /api/content/blog` - Get blog posts
- `GET /api/content/blog/:slug` - Get single post

### Admin APIs (Authenticated)
- `/api/admin/*` - Admin panel routes
- `/api/content/*` - Content management
- `/api/cms/*` - CMS operations
- `/api/seo/*` - SEO management
- `/api/ads/*` - Ad configuration

## 🎨 Customization

### Adding New Calculator
1. Add logic in `src/lib/`
2. Create UI component in `src/app/pages/`
3. Add to CMS via Admin Panel > Tools & Features
4. Configure SEO via Admin Panel > SEO

### Adding Blog Post
1. Login to Admin Panel (`/admin`)
2. Navigate to Content > Blog
3. Create new post with bilingual content
4. Publish when ready

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ for Saudi Arabia
