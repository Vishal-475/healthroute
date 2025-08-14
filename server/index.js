import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const app = express();
app.use(cors());
app.use(express.json());

// DB pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER || 'healthroute_app',
  password: process.env.DB_PASSWORD || 'change_me',
  database: process.env.DB_NAME || 'healthroute',
  connectionLimit: 10
});

// Root message
app.get('/', (_req, res) => {
  res.type('text/plain').send('HealthRoute API is running. Try GET /api/health');
});

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Users: get and update profile (requires extra columns in users table)
// Columns expected: phone VARCHAR(50) NULL, age INT NULL, height_cm DECIMAL(6,2) NULL, weight_kg DECIMAL(6,2) NULL
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      'SELECT id,name,email,phone,age,height_cm,weight_kg,created_at FROM users WHERE id=? LIMIT 1',
      [id]
    );
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, age, height_cm, weight_kg } = req.body;
    await pool.query(
      'UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), age=COALESCE(?,age), height_cm=COALESCE(?,height_cm), weight_kg=COALESCE(?,weight_kg) WHERE id=?',
      [name ?? null, phone ?? null, age ?? null, height_cm ?? null, weight_kg ?? null, id]
    );
    const [rows] = await pool.query(
      'SELECT id,name,email,phone,age,height_cm,weight_kg,created_at FROM users WHERE id=? LIMIT 1',
      [id]
    );
    res.json(rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Auth
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (Array.isArray(existing) && existing.length > 0) return res.status(409).json({ error: 'Email exists' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)', [name, email, hash]);
    res.json({ id: result.insertId, name, email });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT id,name,email,password_hash FROM users WHERE email=? LIMIT 1', [email]);
    if (!Array.isArray(rows) || rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Meal plans
app.post('/api/mealplans', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { userId, name, date, source, weekPlan } = req.body;
    await conn.beginTransaction();
    const [planResult] = await conn.query(
      'INSERT INTO meal_plans(user_id,name,plan_date,source) VALUES (?,?,?,?)',
      [userId, name, date, source || 'chatbot']
    );
    const mealPlanId = planResult.insertId;
    for (const day of weekPlan.days || []) {
      const [dayResult] = await conn.query(
        'INSERT INTO meal_plan_days(meal_plan_id,day_name,day_date) VALUES (?,?,?)',
        [mealPlanId, day.dayName, day.date || null]
      );
      const dayId = dayResult.insertId;
      for (const meal of day.meals || []) {
        const [mealResult] = await conn.query(
          'INSERT INTO meals(day_id,meal_type,name,prep_time_minutes,calories,protein_g,carbs_g,fat_g,sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
          [
            dayId,
            meal.type,
            meal.name,
            meal.prepTime || null,
            meal.nutrients?.calories || null,
            meal.nutrients?.protein || null,
            meal.nutrients?.carbs || null,
            meal.nutrients?.fat || null,
            0
          ]
        );
        const mealId = mealResult.insertId;
        for (const ing of meal.ingredients || []) {
          await conn.query('INSERT INTO meal_ingredients(meal_id,ingredient) VALUES (?,?)', [mealId, ing]);
        }
      }
    }
    await conn.commit();
    res.json({ id: mealPlanId });
  } catch (e) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: String(e) });
  } finally {
    conn.release();
  }
});

app.get('/api/mealplans/latest', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const [plans] = await pool.query(
      'SELECT id,name,plan_date,source FROM meal_plans WHERE user_id=? ORDER BY plan_date DESC LIMIT 1',
      [userId]
    );
    if (!Array.isArray(plans) || plans.length === 0) return res.json(null);
    const plan = plans[0];
    const [days] = await pool.query(
      'SELECT id,day_name,day_date FROM meal_plan_days WHERE meal_plan_id=? ORDER BY id',
      [plan.id]
    );
    for (const day of days) {
      const [meals] = await pool.query(
        'SELECT id,meal_type,name,prep_time_minutes,calories,protein_g,carbs_g,fat_g FROM meals WHERE day_id=? ORDER BY sort_order,id',
        [day.id]
      );
      for (const meal of meals) {
        const [ings] = await pool.query('SELECT ingredient FROM meal_ingredients WHERE meal_id=?', [meal.id]);
        meal.ingredients = ings.map((r) => r.ingredient);
        meal.nutrients = {
          calories: meal.calories,
          protein: meal.protein_g,
          carbs: meal.carbs_g,
          fat: meal.fat_g
        };
        delete meal.calories;
        delete meal.protein_g;
        delete meal.carbs_g;
        delete meal.fat_g;
      }
      day.meals = meals;
    }
    res.json({
      id: plan.id,
      name: plan.name,
      date: plan.plan_date,
      source: plan.source,
      weekPlan: { id: `plan-${plan.id}`, days }
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Nutrient levels (imported from Excel)
app.post('/api/nutrients/bulk', async (req, res) => {
  try {
    const { userId, rows } = req.body; // rows: [{ measured_at, nutrient, value, unit, status }]
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const values = rows.map(r => [userId, r.measured_at, r.nutrient, r.value, r.unit, r.status || null, r.source || 'import', r.file_name || null]);
    const sql = 'INSERT INTO nutrient_levels(user_id,measured_at,nutrient,value,unit,status,source,file_name) VALUES ?';
    const [result] = await pool.query(sql, [values]);
    res.json({ inserted: result.affectedRows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Reference ranges bulk upsert
app.post('/api/nutrients/reference/bulk', async (req, res) => {
  try {
    const { rows } = req.body; // rows: [{ nutrient, unit, optimal_min, optimal_max, sex }]
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const sql = `INSERT INTO nutrient_reference_ranges (nutrient, optimal_min, optimal_max, unit, sex)
                 VALUES (?,?,?,?,COALESCE(?, 'any'))
                 ON DUPLICATE KEY UPDATE
                   optimal_min=VALUES(optimal_min),
                   optimal_max=VALUES(optimal_max)`;
    for (const r of rows) {
      await pool.query(sql, [r.nutrient, r.optimal_min, r.optimal_max, r.unit, r.sex || 'any']);
    }
    res.json({ upserted: rows.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});


