import React, { useState } from 'react';
import axios from 'axios';

const AddExpense = () => {
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/add-expense', { name: expenseName, amount: expenseAmount });
      setExpenseName('');
      setExpenseAmount('');
    } catch (err) {
      console.error('Error adding expense:', err);
    }
  };

  return (
    <div>
      <h2>Adaugă Cheltuieli</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nume Cheltuială</label>
          <input
            type="text"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            placeholder="Introduceti numele cheltuielii"
          />
        </div>
        <div>
          <label>Sumă Cheltuială</label>
          <input
            type="number"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            placeholder="Introduceti suma cheltuielii"
          />
        </div>
        <button type="submit">Adaugă Cheltuială</button>
      </form>
    </div>
  );
};

export default AddExpense;
