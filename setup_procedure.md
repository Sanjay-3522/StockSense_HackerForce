==================================================
SETUP PROCEDURE
==================================================

IMPORTANT:

PostgreSQL does NOT need to be installed locally.

StockSense uses a hosted PostgreSQL database. The user's laptop only needs
Node.js and the StockSense project.


--------------------------------------------------
1. PREREQUISITES
--------------------------------------------------

Install the following:

- Node.js
- Git

PostgreSQL and pgAdmin are NOT required on the user's laptop.


--------------------------------------------------
2. GET THE PROJECT
--------------------------------------------------

Clone the repository:

git clone <repository-url>

Enter the project directory:

cd StockSense


--------------------------------------------------
3. CONFIGURE THE BACKEND
--------------------------------------------------

Enter the backend directory:

cd backend

Install the backend dependencies:

npm install


--------------------------------------------------
4. CREATE THE ENVIRONMENT FILE
--------------------------------------------------

The repository contains:

backend/.env.example

Create a local .env file from it.

Windows:

copy .env.example .env

macOS/Linux:

cp .env.example .env

The backend directory should then contain:

backend/
    .env
    .env.example
    prisma/
    ...


--------------------------------------------------
5. CONFIGURE THE ENVIRONMENT VARIABLES
--------------------------------------------------

Open:

backend/.env

Add:

DATABASE_URL="your-neon-postgresql-connection-string"
JWT_SECRET="your-secure-random-secret"


DATABASE_URL:

Use the PostgreSQL connection string provided for the hosted StockSense
Neon database.

It will look similar to:

DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

Replace the placeholder with the actual Neon connection string.


JWT_SECRET:

JWT_SECRET is used by the backend for JWT authentication.

Use a strong random secret.

Example:

JWT_SECRET="your-secure-random-secret"


IMPORTANT:

Do not use simple secrets such as:

JWT_SECRET="123456"


--------------------------------------------------
6. PROTECT THE ENVIRONMENT FILE
--------------------------------------------------

Do NOT commit the actual .env file to GitHub.

The repository should contain:

backend/
    .env.example    <- Commit this
    .env             <- Do NOT commit this


Make sure .gitignore contains:

.env

A more complete option is:

.env.*
!.env.example

This keeps actual environment files private while allowing .env.example
to remain in the repository.


--------------------------------------------------
7. GENERATE PRISMA CLIENT
--------------------------------------------------

From the backend directory:

npx prisma generate


--------------------------------------------------
8. APPLY THE DATABASE MIGRATION
--------------------------------------------------

StockSense contains the existing Prisma migration.

Apply the migration to the hosted PostgreSQL database:

npx prisma migrate deploy

Then check the migration status:

npx prisma migrate status

The database should report that the migrations are up to date.

Do NOT use prisma db push for the initial StockSense setup.

The existing StockSense migration should be used to initialize the
hosted database.


--------------------------------------------------
9. START THE BACKEND
--------------------------------------------------

From the backend directory:

npm run dev

The backend runs on:

http://localhost:4000

Keep this terminal running.


--------------------------------------------------
10. START THE FRONTEND
--------------------------------------------------

Open a new terminal.

From the StockSense project directory:

cd frontend

Install the frontend dependencies:

npm install

Start the frontend:

npm run dev

The frontend will normally be available at:

http://localhost:5173

Open this address in a web browser.