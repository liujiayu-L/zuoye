const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { students, Consumption, Canteen, Supermarket, MealCard, Student } = require('./data');

const app = express();
app.use(cors());
app.use(bodyParser.json());

function findStudentByCard(cardNumber) {
  return students.find(x => x.mealCard.cardNumber === cardNumber);
}

// GET /students
app.get('/students', (req, res) => {
  res.json(students.map(s => ({ studentId: s.studentId, name: s.name })));
});

// GET /students/:id
app.get('/students/:id', (req, res) => {
  const s = students.find(x => x.studentId === req.params.id);
  if (!s) return res.status(404).json({ message: '未找到学生' });
  res.json(s);
});

// POST /students
// body: { studentId, name, college, studentClass, cardNumber, balance, officeId, officeHours }
app.post('/students', (req, res) => {
  const { studentId, name, college, studentClass, cardNumber, balance, officeId, officeHours } = req.body;
  if (!studentId || !name || !college || !studentClass || !cardNumber || typeof balance !== 'number' || !officeId || !officeHours) {
    return res.status(400).json({ message: '参数缺失或类型错误' });
  }
  if (students.some(x => x.studentId === studentId)) {
    return res.status(400).json({ message: '学号已存在' });
  }
  if (students.some(x => x.mealCard.cardNumber === cardNumber)) {
    return res.status(400).json({ message: '卡号已存在' });
  }
  const student = Student(studentId, name, college, studentClass, MealCard(cardNumber, balance, { officeId, businessHours: officeHours }));
  students.push(student);
  res.status(201).json(student);
});

// GET /cards/:cardNumber
app.get('/cards/:cardNumber', (req, res) => {
  const cardOwner = findStudentByCard(req.params.cardNumber);
  if (!cardOwner) return res.status(404).json({ message: '未找到卡片' });
  res.json(cardOwner.mealCard);
});

// POST /cards/:cardNumber/consumptions
// body: { merchantType: 'canteen'|'supermarket', merchantId, merchantName, amount }
app.post('/cards/:cardNumber/consumptions', (req, res) => {
  const { merchantType, merchantId, merchantName, amount } = req.body;
  if (!merchantType || !merchantId || !merchantName || typeof amount !== 'number') {
    return res.status(400).json({ message: '参数缺失或类型错误' });
  }
  const cardOwner = findStudentByCard(req.params.cardNumber);
  if (!cardOwner) return res.status(404).json({ message: '未找到卡片' });
  const card = cardOwner.mealCard;
  const merchant = merchantType === 'canteen' ? Canteen(merchantId, merchantName) : Supermarket(merchantId, merchantName);
  if (amount > card.balance) return res.status(400).json({ message: '余额不足' });
  const cons = Consumption(merchant, amount, new Date().toISOString());
  card.consumptions.push(cons);
  card.balance -= amount;
  res.status(201).json(cons);
});

// POST /cards/:cardNumber/recharge
// body: { amount }
app.post('/cards/:cardNumber/recharge', (req, res) => {
  const { amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: '充值金额必须为正数' });
  }
  const cardOwner = findStudentByCard(req.params.cardNumber);
  if (!cardOwner) return res.status(404).json({ message: '未找到卡片' });
  cardOwner.mealCard.balance += amount;
  res.status(200).json({ balance: cardOwner.mealCard.balance });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
