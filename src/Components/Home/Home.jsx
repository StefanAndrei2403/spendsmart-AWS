import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import './Home.css';
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

const Home = () => {
  const [, setUser] = useState(null);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);

  useEffect(() => {
    // Fetching user data, income, expenses, and budget
    const fetchData = async () => {
      try {
        const response = await axios.get('/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUser(response.data.user);
        
        // Obține datele financiare
        const financialResponse = await axios.get('/get-financial-data', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const financialData = financialResponse.data;
        setIncome(financialData.income);
        setExpenses(financialData.expenses);
        setMonthlyBudget(financialData.monthly_budget);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  // Graficul de buget vs cheltuieli
  const chartData = {
    labels: ['Buget', 'Cheltuieli'],
    datasets: [
      {
        label: 'Buget vs Cheltuieli',
        data: [monthlyBudget, expenses.reduce((acc, exp) => acc + exp.amount, 0)],
        backgroundColor: ['green', 'red'],
      },
    ],
  };

  return (
    <div className="home-container">
      <div className="left-container">
        {/* Partea stângă: Venituri, Cheltuieli, Buget */}
        <div className="financial-summary">
          <div>
            <h3>Venituri: {income} RON</h3>
          </div>
          <div>
            <h3>Cheltuieli: {expenses.reduce((acc, exp) => acc + exp.amount, 0)} RON</h3>
          </div>
          <div>
            <h3>Buget Lunar: {monthlyBudget} RON</h3>
            <h3>Bani Rămași de Cheltuit: {monthlyBudget - expenses.reduce((acc, exp) => acc + exp.amount, 0)} RON</h3>
          </div>
        </div>
        <div className="expense-list">
          <h3>Cheltuieli din luna aceasta:</h3>
          <ul>
            {expenses.map((expense, index) => (
              <li key={index}>{expense.amount} RON</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="right-container">
        {/* Partea dreaptă: Statistici */}
        <h3>Statistici</h3>
        <div className="chart">
          <Bar data={chartData} />
        </div>
      </div>
    </div>
  );
};

export default Home;
