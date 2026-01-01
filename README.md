```bash
price-tracker-app/
├── public/                 # ไฟล์ Static
│   └── favicon.ico
├── src/
│   ├── app/                # Root Layout และ Route ต่างๆ
│   │   ├── api/            # Route Handlers (API Endpoints)
│   │   │   ├── products/
│   │   │   │   └── route.ts     # POST /api/products (เพิ่มสินค้า)
│   │   │   └── price-check/
│   │   │       └── route.ts # GET /api/price-check?url=... (ดึงราคา)
│   │   ├── (auth)/         # Grouping สำหรับ Auth Pages (login, register)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── page.tsx        # หน้า Home/Dashboard
│   │   ├── layout.tsx      # Root Layout
│   │   └── globals.css     # Global CSS
│   ├── components/         # Reusable UI Components
│   │   ├── ProductCard.tsx
│   │   ├── AddProductForm.tsx
│   │   ├── PriceChart.tsx
│   │   ├── Navbar.tsx
│   │   └── ...
│   ├── lib/                # Utility Functions, API Clients, Constants
│   │   ├── db.ts           # การเชื่อมต่อ Database (เช่น Supabase client)
│   │   ├── scraper.ts      # Logic สำหรับ Web Scraping
│   │   ├── utils.ts        # Helper functions ทั่วไป
│   │   └── providers.tsx   # TanStack Query Provider, NextAuth Provider
│   ├── types/              # TypeScript Types & Interfaces
│   │   └── index.d.ts      # Product, PriceEntry types
│   └── styles/             # Specific CSS Modules (ถ้าใช้)
│       └── ...
├── next.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.local              # Environment Variables
```