# Mzansi Fleet Management - Angular Frontend

This is the Angular frontend application for the Mzansi Fleet Management system.

## Features

- **Dashboard**: Overview of fleet statistics and recent activity
- **Drivers Management**: Create, read, update, and delete driver profiles
- **Vehicles Management**: Manage fleet vehicles with full CRUD operations
- **Trips Management**: Handle trip requests and scheduling
- **Tenants Management**: Manage tenant organizations
- **Users Management**: User account management with roles

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (v17)

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Update the API URL in the environment files:

- Development: `src/environments/environment.ts`
- Production: `src/environments/environment.prod.ts`

Default API URL is set to `http://localhost:5000/api`

## Running the Application

### Development Server

```bash
npm start
```

or

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Production Build

```bash
ng build --configuration production
```

## Project Structure

```
src/
├── app/
│   ├── components/        # Feature components
│   │   ├── dashboard/
│   │   ├── drivers/
│   │   ├── vehicles/
│   │   ├── trips/
│   │   ├── tenants/
│   │   └── users/
│   ├── models/           # TypeScript interfaces and models
│   ├── services/         # API services
│   ├── app.component.ts  # Root component
│   ├── app.config.ts     # Application configuration
│   └── app.routes.ts     # Route definitions
├── environments/         # Environment configurations
├── index.html           # Main HTML file
├── main.ts             # Application entry point
└── styles.css          # Global styles
```

## API Integration

The application integrates with the Mzansi Fleet API with the following endpoints:

- `/api/Drivers` - Driver management
- `/api/Vehicles` - Vehicle management
- `/api/Trips` - Trip management
- `/api/Identity/tenants` - Tenant management
- `/api/Identity/users` - User management
- `/api/Identity/ownerprofiles` - Owner profile management
- `/api/MechanicalRequests` - Mechanical service requests
- `/api/Reviews` - Review and rating system
- `/api/PaymentIntents` - Payment processing

## Technologies Used

- **Angular 17** - Standalone components with signals
- **TypeScript** - Type-safe development
- **RxJS** - Reactive programming
- **HttpClient** - HTTP communication
- **Router** - Navigation and routing

## Development Guidelines

### Component Structure

All components follow Angular standalone component pattern:
- Standalone: true
- Imports declared in component metadata
- Services provided at root level

### Styling

- Global styles in `src/styles.css`
- Component-specific styles in component files
- Responsive design using CSS Grid and Flexbox

### State Management

- Component-level state management
- RxJS observables for async operations
- Services for shared state

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build the project
- `npm run watch` - Build and watch for changes
- `npm test` - Run unit tests

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Copyright © 2026 Mzansi Fleet Management
