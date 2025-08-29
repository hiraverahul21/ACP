# Pest Control Management System

A comprehensive pest control management system built with modern web technologies, featuring complete inventory management, lead tracking, and service management capabilities.

## 🚀 Features

### Core Management
- **User Authentication & Authorization**: Role-based access control (SUPERADMIN, ADMIN, MANAGER, TECHNICIAN)
- **Lead Management**: Complete lead lifecycle from inquiry to service completion
- **Service Tracking**: Schedule, track, and manage pest control services
- **Company & Branch Management**: Multi-location support with hierarchical structure

### Inventory Management
- **Material Receipt**: Record incoming inventory with batch tracking
- **Material Issue**: Issue materials to technicians and branches
- **Material Return**: Handle returns with proper documentation
- **Material Transfer**: Inter-branch material transfers
- **Stock Ledger**: Detailed transaction history for all items
- **Batch Management**: Track expiry dates and implement FEFO (First Expiry First Out)
- **Multi-location Support**: Warehouse, branch, and technician-level inventory

### Reporting & Analytics
- **Stock Reports**: Current stock levels across all locations
- **Stock Valuation**: Financial value of inventory
- **Movement Analysis**: Track material consumption patterns
- **Expiry Reports**: Monitor items approaching expiry

## 🛠️ Technology Stack

### Frontend
- **Next.js 13+**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Beautiful SVG icons

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **Prisma ORM**: Database toolkit and ORM
- **MySQL**: Relational database
- **JWT**: JSON Web Tokens for authentication

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Git**: Version control

## 📋 Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pest-control-management
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your database credentials and other configuration.

5. **Set up the database**
   ```bash
   # Run Prisma migrations
   npx prisma migrate deploy
   
   # Seed the database (optional)
   node seed-database.js
   ```

6. **Start the development servers**
   
   **Backend (Terminal 1):**
   ```bash
   npm start
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8765
- **Database**: MySQL on configured port

## 📁 Project Structure

```
pest-control-management/
├── config/                 # Configuration files
├── middleware/            # Express middleware
├── routes/               # API routes
├── utils/                # Utility functions
├── prisma/               # Database schema and migrations
├── frontend/             # Next.js frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Next.js pages
│   │   ├── context/      # React context providers
│   │   └── utils/        # Frontend utilities
├── logs/                 # Application logs
└── README.md
```

## 🔐 Default Users

After seeding the database, you can use these default accounts:

- **Superadmin**: admin@pestcontrol.com / password123
- **Manager**: manager@pestcontrol.com / password123
- **Technician**: tech@pestcontrol.com / password123

## 📊 Database Schema

The system uses a comprehensive database schema with the following main entities:

- **Users & Authentication**: Staff, roles, permissions
- **Business Management**: Companies, branches, leads, services
- **Inventory Management**: Items, batches, transactions, stock ledger
- **Audit & Logging**: Transaction history, user activities

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Inventory Management
- `GET /api/inventory/items` - List all items
- `POST /api/inventory/receipt` - Create material receipt
- `GET /api/inventory/reports/stock-ledger` - Stock ledger report
- `GET /api/inventory/reports/stock-report` - Current stock report

### Lead Management
- `GET /api/leads` - List leads
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

## 🚀 Deployment

For production deployment:

1. Set up a production MySQL database
2. Configure environment variables for production
3. Build the frontend: `cd frontend && npm run build`
4. Start the production server: `npm run start:prod`

## 📈 Roadmap

- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Integration with accounting systems
- [ ] Automated inventory reordering
- [ ] Customer portal
- [ ] IoT device integration

---

**Built with ❤️ by the Pest Control Management Team**