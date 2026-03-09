# AI Site Optimization

An AI-powered site feasibility analysis platform that helps developers, investors, and urban planners evaluate potential development sites using intelligent scoring algorithms.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green) ![Express](https://img.shields.io/badge/Express-v5-blue) ![License](https://img.shields.io/badge/License-ISC-yellow)

---

## Features

- **User Authentication** — Secure registration & login with JWT tokens and bcrypt password hashing
- **Project Dashboard** — Overview of all sites with aggregate statistics (total sites, average score, best score, total area)
- **Site Analysis Form** — Input site details including location, size, zoning type, and estimated cost
- **AI Feasibility Scoring** — Automated scoring across 4 categories:
  - 🌿 Environmental
  - 📊 Market
  - 🏗️ Infrastructure
  - 📋 Regulatory
- **Interactive Charts** — Radar chart and bar chart visualizations powered by Chart.js
- **AI Recommendations** — Context-aware suggestions based on score breakdown
- **Responsive Design** — Modern dark-themed UI that works on desktop and mobile

## Tech Stack

| Layer      | Technology          |
|------------|---------------------|
| Backend    | Node.js, Express    |
| Database   | SQLite (better-sqlite3) |
| Auth       | JWT, bcryptjs       |
| Frontend   | HTML5, CSS3, Vanilla JS |
| Charts     | Chart.js            |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (included with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/AI-site-optimization.git
   cd AI-site-optimization
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
├── server.js            # Express API server (auth + CRUD + AI scoring)
├── db.js                # SQLite database initialization
├── package.json         # Project config & dependencies
└── public/
    ├── index.html       # Single-page application shell
    ├── css/
    │   └── style.css    # Dark-themed responsive stylesheet
    └── js/
        └── app.js       # Frontend logic (auth, dashboard, charts)
```

## API Endpoints

### Authentication
| Method | Endpoint        | Description          |
|--------|-----------------|----------------------|
| POST   | `/api/register` | Create a new account |
| POST   | `/api/login`    | Sign in              |
| POST   | `/api/logout`   | Sign out             |
| GET    | `/api/me`       | Get current user     |

### Sites
| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| GET    | `/api/sites`     | List all user sites      |
| GET    | `/api/sites/:id` | Get site details + scores|
| POST   | `/api/sites`     | Add site & run analysis  |
| DELETE | `/api/sites/:id` | Delete a site            |

## Screenshots

### Login
Modern auth screen with sign-in / sign-up tabs.

### Dashboard
Site cards with feasibility scores, stats row, and quick actions.

### Analysis Results
Animated score circle, radar chart, bar chart, and AI recommendations.

## Roadmap

- [ ] Real AI/ML model integration for scoring
- [ ] PDF report export
- [ ] Map-based site visualization
- [ ] Multi-user collaboration
- [ ] Cloud deployment (AWS / Azure)

## License

ISC
