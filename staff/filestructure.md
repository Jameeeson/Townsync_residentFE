# TownSync Admin - File Structure

## Overview
This is a Next.js 16 application using the App Router architecture. The project is organized into app routes, reusable components, and styles.

## Project Root Files

```
├── .gitignore                 # Git ignore rules
├── .next/                     # Next.js build output (auto-generated)
├── node_modules/              # Dependencies (auto-generated)
├── AGENTS.md                  # AI agent configuration
├── CLAUDE.md                  # Claude configuration
├── README.md                  # Project documentation
├── eslint.config.mjs          # ESLint configuration
├── next-env.d.ts              # Next.js TypeScript definitions (auto-generated)
├── next.config.ts             # Next.js configuration
├── package.json               # Project dependencies and scripts
├── package-lock.json          # Dependency lock file
├── tsconfig.json              # TypeScript configuration
├── tsconfig.tsbuildinfo       # TypeScript build info (auto-generated)
├── public/                    # Static assets
└── src/                       # Source code
```

## Source Structure (`src/`)

### Application Routes (`src/app/`)
Uses Next.js App Router for page routing.

```
src/app/
├── globals.css                # Global styles
├── layout.tsx                 # Root layout component
├── page.tsx                   # Home page
├── favicon.ico                # Favicon
├── staff/                     # Staff portal routes
│   ├── page.tsx               # Staff landing page
│   ├── login/                 # Staff login
│   │   └── page.tsx
│   ├── dashboard/             # Staff dashboard
│   │   └── page.tsx
│   ├── scanner/               # Staff scanner
│   │   └── page.tsx
│   ├── logs/                  # Staff activity logs
│   │   └── page.tsx
│   └── settings/              # Staff settings
│       └── page.tsx
└── admin/                     # Admin dashboard routes
    ├── page.tsx               # Admin main page
    ├── dashboard/             # Dashboard section
    │   ├── page.tsx
    │   ├── AddResident/       # Add resident modal/page
    │   │   └── page.tsx
    │   └── ConfigureReport/   # Configure report modal/page
    │       └── page.tsx
    ├── finance/               # Finance section
    │   └── page.tsx
    ├── maintenance/           # Maintenance section
    │   └── page.tsx
    ├── operations/            # Operations section
    │   └── page.tsx
    ├── residents/             # Residents management section
    │   └── page.tsx
    └── visitor-management/    # Visitor management section
        └── page.tsx
```

### Components (`src/components/`)
Reusable React components organized by feature.

#### Admin Components (`src/components/admin/`)
Components for the admin dashboard interface.

```
src/components/admin/
├── admin-shell.tsx            # Main admin layout wrapper
├── admin-shell.module.css      # Admin shell styling
├── add-resident-view.tsx       # Component for adding residents
├── configure-report-view.tsx   # Component for configuring reports
├── dashboard-page-client.tsx   # Client-side dashboard page logic
├── dashboard-overview.tsx      # Dashboard overview display
├── dashboard-overview.module.css
├── post-alert.tsx             # Alert notification component
├── post-alert.module.css
├── top-nav-bar.tsx            # Top navigation bar
└── top-nav-bar.module.css
```

#### Authentication Components (`src/components/auth/`)
Components related to authentication.

```
src/components/auth/
├── login-screen.tsx           # Login page component
└── login-screen.module.css     # Login styling
```

#### Shared Styles (`src/components/styles/`)
CSS modules for various features.

```
src/components/styles/
├── addresident.module.css      # Add resident feature styles
├── Communications.module.css   # Communications feature styles
├── ConfigureReport.module.css  # Report configuration styles
├── Maintenance.module.css      # Maintenance feature styles
└── VisitorManagement.module.css # Visitor management styles
```

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration settings |
| `tsconfig.json` | TypeScript compiler options |
| `eslint.config.mjs` | ESLint linting rules |
| `package.json` | Dependencies and npm scripts |

## Key Features

### Admin Dashboard Sections
- **Dashboard**: Overview and main dashboard view
- **Residents**: Resident management functionality
- **Finance**: Financial management section
- **Maintenance**: Maintenance tracking
- **Operations**: Operational tasks
- **Visitor Management**: Visitor tracking and management
- **Communications**: Communication tools

### Modular CSS
CSS modules are used throughout for component-scoped styling:
- `.module.css` files are scoped to their components
- Named modules for feature areas in `src/components/styles/`

### App Router Structure
Uses Next.js App Router conventions:
- Route segments map to directory structure
- `page.tsx` files define route endpoints
- `layout.tsx` provides layout composition

## Build & Development

- **Development**: Run with `npm run dev`
- **Linting**: Run with `npm run lint`
- **Build**: Output goes to `.next/` directory

---

*Last updated: 2026-07-24*
