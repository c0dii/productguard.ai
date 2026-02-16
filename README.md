# ProductGuard.ai

AI-powered piracy protection SaaS for digital product creators.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account
- (Optional) A Stripe account for billing features

### 1. Install Dependencies

Dependencies are already installed! But if you need to reinstall:

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Copy and paste the contents of `supabase/migrations/00001_initial_schema.sql`
4. Run the SQL to create all tables, policies, and triggers

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these:**
- Go to your Supabase project dashboard
- Settings → API
- Copy the Project URL and both API keys

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ✅ What's Working Now

✅ Landing page with pricing
✅ Authentication system (signup, login, OAuth callback)
✅ Auth middleware protecting dashboard routes
✅ Complete database schema with RLS
✅ Type system with all database types
✅ Validation schemas (Zod)
✅ DMCA template generators
✅ Custom design system (Tailwind + pg.* tokens)

## 🚧 What's Next (To Complete MVP)

The following need to be created:

- Dashboard layout and pages
- UI components (Button, Card, Input, etc.)
- Product CRUD functionality
- Scan API endpoint
- Scan engine with platform stubs
- Stripe webhook handler

See `IMPLEMENTATION_STATUS.md` for detailed progress.

## 🧪 Testing the App

### Test Authentication Flow

1. Go to http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Create an account with email/password
4. Check your email for confirmation link
5. Click the confirmation link
6. You'll be redirected to `/dashboard` (which will show an error until dashboard is created)
7. Try logging out and logging back in

### Current Limitations

- Dashboard pages not yet created (will show 404)
- No product CRUD yet
- No scan functionality yet
- No Stripe billing yet

## 📁 Project Structure

```
ProductGuard.ai/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Auth pages (login, signup, callback) ✅
│   │   ├── page.tsx           # Landing page ✅
│   │   └── layout.tsx         # Root layout ✅
│   ├── lib/
│   │   ├── supabase/          # Supabase clients ✅
│   │   ├── utils/             # Validation & templates ✅
│   │   └── (other helpers)
│   ├── types/                 # TypeScript types ✅
│   ├── components/            # React components
│   ├── styles/                # Global CSS ✅
│   └── middleware.ts          # Auth middleware ✅
├── supabase/
│   └── migrations/            # Database schema ✅
├── .env.example               # Environment template ✅
├── package.json               # Dependencies ✅
└── tailwind.config.ts         # Design system ✅
```

## 🎨 Design System

The app uses a custom dark theme with these design tokens:

- **Background**: `pg-bg` (#0B0F1A)
- **Surface**: `pg-surface` (#111827)
- **Accent**: `pg-accent` (#00D4AA)
- **Danger**: `pg-danger` (#FF4757)
- **Warning**: `pg-warning` (#FFB830)
- **Text**: `pg-text` (#E8ECF1)
- **Text Muted**: `pg-text-muted` (#7B8CA8)

Use these in your Tailwind classes: `bg-pg-accent`, `text-pg-text`, etc.

### Custom CSS Classes

- `.btn-glow` - Glowing button with accent color
- `.card` - Standard card container
- `.card-glow` - Card with accent glow effect
- `.badge-critical/high/medium/low` - Risk level badges
- `.input-field` - Styled form input

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🗄️ Database Schema

7 tables with Row Level Security (RLS):

1. **profiles** - User profiles (extends Supabase Auth)
2. **products** - Digital products to protect
3. **scans** - Piracy scan runs
4. **infringements** - Detected piracy instances
5. **takedowns** - DMCA notices sent
6. **subscriptions** - Stripe subscription data
7. **scan_schedules** - Automated scan schedules

All tables have RLS policies ensuring users can only see their own data.

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Payments**: Stripe
- **Email**: Resend
- **Deployment**: Vercel

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Complete project documentation
- [ProductGuard_Project_Instructions.md](./ProductGuard_Project_Instructions.md) - Business model
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Current progress
- [.env.example](./.env.example) - Environment variables

## 🐛 Troubleshooting

### Build Errors

If you get TypeScript errors:
```bash
npm run build
```

Check the error messages - they'll point to missing components or pages.

### Auth Not Working

1. Make sure you've run the Supabase migration SQL
2. Check that your `.env.local` has the correct Supabase keys
3. Verify email confirmation is enabled in Supabase Auth settings

### Middleware Errors

If you see cookie-related errors:
- Clear your browser cookies
- Restart the dev server
- Make sure you're using the correct Supabase client (browser vs server)

## 🤝 Support

This is a Phase 1 MVP scaffold. For issues:
1. Check `IMPLEMENTATION_STATUS.md` to see what's completed
2. Review the Supabase logs for auth/database errors
3. Check browser console for client-side errors

## 📄 License

Private project - All rights reserved.

---

**Built by**: Ease Web Development (Odessa, Texas)
**Domain**: productguard.ai
**Current Phase**: Phase 1 - MVP Scaffold (In Progress)
