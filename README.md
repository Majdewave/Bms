# SaaS Client Portal

A modern, professional SaaS client portal built with React, TypeScript, and Tailwind CSS. Features a clean component structure, mocked API services, and best practices for accessibility and responsiveness.

## Features

- **Authentication** - Login page with form validation
- **Dashboard** - Overview with stats and recent activity
- **Appointments** - Schedule and manage appointments
- **Invoices** - View and manage invoices with status tracking
- **Files** - Upload, organize, and download documents
- **Profile** - User profile management and preferences
- **Responsive Design** - Mobile-first approach
- **Accessible UI** - WCAG compliant components
- **Dark Sidebar** - Modern navigation layout

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Lucide React** - Icons

## Project Structure

```
src/
├── api/              # API service layer (mocked)
├── auth/             # Authentication logic
├── components/       # Reusable components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── StatCard.tsx
│   └── RecentActivity.tsx
├── layouts/
│   └── MainLayout.tsx
├── pages/            # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Appointments.tsx
│   ├── Invoices.tsx
│   ├── Files.tsx
│   └── Profile.tsx
├── styles/
│   └── index.css
├── App.tsx           # Root component
├── router.tsx        # Route definitions
└── main.tsx          # Entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd web-client
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Accessibility Features

- Semantic HTML structure
- ARIA labels and attributes
- Keyboard navigation support
- Focus management
- Color contrast compliance
- Form accessibility

## Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Flexible grid layouts
- Touch-friendly button sizes
- Mobile navigation menu

## Default Credentials

- **Email:** user@example.com
- **Password:** any password (mocked auth)

## API Services

All data is mocked and provided by services in the `api/` folder. Real API integration can be added by replacing mock data with actual API calls.

### Mocked Services

- Authentication service
- Dashboard service
- Appointments service
- Invoices service
- Files service
- Profile service

## Color Scheme

- **Primary:** Sky Blue (0ea5e9)
- **Secondary:** Slate Gray (64748b)
- **Success:** Green
- **Warning:** Yellow
- **Error:** Red

## Future Enhancements

- [ ] Dark mode support
- [ ] Real API integration
- [ ] Advanced filtering
- [ ] Data export functionality
- [ ] Calendar integration
- [ ] Notifications system
- [ ] User settings
- [ ] Multi-language support

## License

MIT
