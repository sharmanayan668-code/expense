require('dotenv').config();

const { randomUUID } = require('node:crypto');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');
const cors = require('cors');
const express = require('express');

const app = express();
const port = process.env.PORT || 5000;
const dataDirectory = path.join(__dirname, 'data');
const dataFile = path.join(dataDirectory, 'expenses.json');
let operationQueue = Promise.resolve();

app.use(cors());
app.use(express.json());

function runStoreOperation(operation) {
  const result = operationQueue.then(operation);
  operationQueue = result.catch(() => {});
  return result;
}

async function readExpenses() {
  return JSON.parse(await readFile(dataFile, 'utf8'));
}

async function writeExpenses(expenses) {
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, 'utf8');
}

app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await runStoreOperation(readExpenses);
    expenses.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    res.json(expenses);
  } catch (error) {
    console.error('Error reading local expenses:', error);
    res.status(500).json({ message: 'Failed to fetch expenses.' });
  }
});

app.post('/api/expenses', async (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const amount = Number(body.amount);

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Enter a name and an amount greater than zero.' });
  }

  try {
    const expense = await runStoreOperation(async () => {
      const expenses = await readExpenses();
      const newExpense = {
        _id: randomUUID(),
        name,
        amount,
        createdAt: new Date().toISOString(),
      };

      expenses.push(newExpense);
      await writeExpenses(expenses);
      return newExpense;
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error saving local expense:', error);
    res.status(500).json({ message: 'Failed to add expense.' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const id = req.params.id;

  if (!/^[\da-f-]{36}$/i.test(id)) {
    return res.status(400).json({ message: 'Invalid expense ID.' });
  }

  try {
    const deleted = await runStoreOperation(async () => {
      const expenses = await readExpenses();
      const remainingExpenses = expenses.filter((expense) => expense._id !== id);

      if (remainingExpenses.length === expenses.length) {
        return false;
      }

      await writeExpenses(remainingExpenses);
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted.' });
  } catch (error) {
    console.error('Error deleting local expense:', error);
    res.status(500).json({ message: 'Failed to delete expense.' });
  }
});

async function startServer() {
  try {
    await mkdir(dataDirectory, { recursive: true });

    try {
      await readFile(dataFile);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      await writeExpenses([]);
    }

    console.log(`Local expense data: ${dataFile}`);
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Could not initialize local expense storage:', error.message);
    process.exit(1);
  }
}

startServer();
