import React, { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  } from 'chart.js';
  
  // Înregistrarea acestor componente pentru a le folosi
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  );
  

const Statistics = () => {
  const [selectedMonth, setSelectedMonth] = useState('');

  const handleFilterChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  return (
    <div>
      <h2>Statistici</h2>
      <div>
        <label>Filtrează după lună:</label>
        <select onChange={handleFilterChange} value={selectedMonth}>
          <option value="">Selectează luna</option>
          <option value="January">Ianuarie</option>
          <option value="February">Februarie</option>
          <option value="March">Martie</option>
          {/* Adăugați mai multe luni după caz */}
        </select>
      </div>
      <div>
        <h3>Statistici pentru luna {selectedMonth}</h3>
        {/* Aici veți adăuga logica de afișare a statisticilor */}
      </div>
    </div>
  );
};

export default Statistics;
