import React, { useState } from 'react';
import axios from 'axios';

const AddIncome = () => {
  const [income, setIncome] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/add-income', { income, monthlyBudget });
      setIncome('');
      setMonthlyBudget('');
    } catch (err) {
      console.error('Error adding income:', err);
    }
  };

  return (
    <div>
      <h2>Adaugă Venituri și Buget Lunar</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Venituri</label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="Introduceti venitul"
          />
        </div>
        <div>
          <label>Buget Lunar</label>
          <input
            type="number"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="Introduceti bugetul lunar"
          />
        </div>
        <button type="submit">Adaugă</button>
      </form>
    </div>
  );
};

export default AddIncome;
