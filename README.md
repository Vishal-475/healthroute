# 🥗 HealthRoute – AI-Driven Nutrient Deficiency Detection & Meal Planning

**HealthRoute** is an AI-powered platform that analyzes medical and dietary data (via `.xlsx` upload) to **detect vitamin & mineral deficiencies**, and then generates a **customized 7-day meal plan** to address them.  
It also **tracks your nutritional progress over time** and dynamically updates recommendations based on user feedback, allergies, and preferences.

---

## 🚀 Features
- **📊 XLSX Data Analysis** – Upload your `.xlsx` file containing health, diet, or lab data, and let AI detect nutrient deficiencies.
- **🤖 AI-Powered Deficiency Detection** – Identifies vitamin & mineral gaps using smart algorithms .
- **🍽 Personalized 7-Day Meal Plan** – Creates a tailored nutrition plan considering:
  - Detected deficiencies
  - Regional food availability
  - Cultural preferences
  - Budget constraints
- **📈 Progress Tracking** – Monitors your nutrient levels over time and adjusts recommendations accordingly.
- **🌍 Indian Food Database** – Supports diverse food options for better regional adaptation.
- **📱 Multi-Device Ready** – Works on web browsers, integrates with wearables, and health tracking apps.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js (React Framework)
- **Backend**: Python (FastAPI)
- **AI Models**: NLP & ML for deficiency detection, diet recommendation algorithms
- **Database**: PostgreSQL / MongoDB (based on your setup)
- **File Handling**: Pandas & OpenPyXL for `.xlsx` parsing
- **Integration**: Wearables & health tracking APIs

---

## 🛠 Setup Instructions

### 1. Clone the Repository

- git clone https://github.com/<your-username>/healthroute.git
- cd healthroute 

### 2.Frontend Setup
## Navigate to frontend directory
cd healthroute

## Install dependencies
npm install

## Start development server
npm run dev

### 3. Backend Setup
## Navigate to backend directory
cd server

## Install dependencies
npm install  # or pip install -r requirements.txt (if Python backend)

## Start backend server
npm start    # or python app.py / uvicorn main:app --reload

### 4. Running the Application
- Start the backend server first.

- Then start the frontend with npm run dev.

- Upload an XLSX file in the UI to detect deficiencies.

- View the generated 7-day meal plan and track progress over time.

