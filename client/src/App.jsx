import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5055/api',
})

function App() {
  const [expenses, setExpenses] = useState([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get('/expenses')
      .then((response) => setExpenses(response.data))
      .catch(() => {
        setError('खर्च लोड नहीं हुए। जाँचें कि server और MongoDB चल रहे हैं।')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await api.post('/expenses', {
        name: name.trim(),
        amount: Number(amount),
      })
      setExpenses((currentExpenses) => [response.data, ...currentExpenses])
      setName('')
      setAmount('')
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'खर्च जोड़ा नहीं जा सका। जाँचें कि server और MongoDB चल रहे हैं।',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setError('')

    try {
      await api.delete(`/expenses/${id}`)
      setExpenses((currentExpenses) =>
        currentExpenses.filter((expense) => expense._id !== id),
      )
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'खर्च हटाया नहीं जा सका।')
    }
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const formatAmount = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)

  return (
    <main className="app">
      <header className="page-header">
        <p className="eyebrow">रोज़ के खर्च का आसान हिसाब</p>
        <h1>मेरा Expense Tracker</h1>
        <p className="subtitle">अपने खर्च जोड़ें और कुल रकम एक जगह देखें।</p>
      </header>

      <section className="total-card" aria-label="कुल खर्च">
        <span>अभी तक का कुल खर्च</span>
        <strong>{formatAmount(total)}</strong>
      </section>

      <section className="panel">
        <h2>नया खर्च जोड़ें</h2>
        <form className="expense-form" onSubmit={handleSubmit}>
          <label>
            खर्च का नाम
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="जैसे: किराने का सामान"
              required
            />
          </label>
          <label>
            रकम (₹)
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="जैसे: 500"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'जोड़ रहे हैं…' : 'खर्च जोड़ें'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="list-heading">
          <h2>आपके खर्च</h2>
          <span>{expenses.length} खर्च</span>
        </div>

        {error && (
          <p className="message error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="message">खर्च लोड हो रहे हैं…</p>
        ) : expenses.length === 0 ? (
          <p className="message">अभी कोई खर्च नहीं है। पहला खर्च जोड़कर शुरू करें।</p>
        ) : (
          <ul className="expense-list">
            {expenses.map((expense) => (
              <li className="expense-item" key={expense._id}>
                <span className="expense-name">{expense.name}</span>
                <span className="expense-amount">{formatAmount(expense.amount)}</span>
                <button
                  className="delete-button"
                  type="button"
                  onClick={() => handleDelete(expense._id)}
                  aria-label={`${expense.name} हटाएँ`}
                >
                  हटाएँ
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
