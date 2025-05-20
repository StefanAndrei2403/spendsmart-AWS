
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { FaMoneyBillWave, FaChartPie, FaWallet } from 'react-icons/fa';
import './Home.css';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('ro-RO', { month: 'long' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        if (!token) {
          navigate('/');
          return;
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const profileRes = await axios.get('/profile');
        if (profileRes.data?.user) {
          setUser(profileRes.data.user);
        }

        const finRes = await axios.get('/api/get-financial-data');
        const { income, expenses, monthly_budget } = finRes.data;

        setIncome(income || 0);
        setExpenses(expenses || []);
        setMonthlyBudget(monthly_budget || 0);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('auth_token');
          delete axios.defaults.headers.common['Authorization'];
          navigate('/');
          return;
        }
        setError('Eroare la încărcarea datelor.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const totalExpenses = expenses.reduce((acc, exp) => acc + (parseFloat(exp.amount) || 0), 0);
  const remainingBudget = monthlyBudget - totalExpenses;

  const chartData = {
    labels: ['Cheltuieli', 'Rămas din buget'],
    datasets: [
      {
        data: [totalExpenses, remainingBudget],
        backgroundColor: ['#e74c3c', '#2ecc71'],
        borderColor: ['#c0392b', '#27ae60'],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 16,
          font: {
            size: 14
          }
        }
      },
      title: {
        display: true,
        text: 'Comparație Buget vs Cheltuieli',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      }
    },
    layout: {
      padding: {
        bottom: 40 // spațiu extra jos
      }
    }
  };

  if (loading) return <p style={{ textAlign: 'center' }}>Se încarcă datele...</p>;
  if (error) return <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>;

  return (
    <div className="home-root-container">
      <div className="home-header">
        <h2>Bine ai revenit, {user?.username || 'Utilizator'}.</h2>
      </div>

      <div className="home-summary-boxes">
        <div className="home-summary-card green">
          <FaMoneyBillWave className="summary-icon" />
          <div className="summary-text">
            <h3>Venituri {capitalizedMonthName}</h3>
            <p>{parseFloat(income || 0).toFixed(2)} RON</p>
          </div>
        </div>
        <div className="home-summary-card red">
          <FaChartPie className="summary-icon" />
          <div className="summary-text">
            <h3>Cheltuieli {capitalizedMonthName}</h3>
            <p>{parseFloat(totalExpenses || 0).toFixed(2)} RON</p>
          </div>
        </div>
        <div className="home-summary-card blue">
          <FaWallet className="summary-icon" />
          <div className="summary-text">
            <h3>Buget luna {capitalizedMonthName}</h3>
            <p>{parseFloat(monthlyBudget || 0).toFixed(2)} RON</p>
          </div>
        </div>
      </div>

      <div className="budget-progress-wrapper">
        <div className="budget-progress-bar">
          <div
            className="budget-progress-fill"
            style={{
              width: `${Math.min((totalExpenses / monthlyBudget) * 100, 100)}%`,
              backgroundColor: totalExpenses > monthlyBudget ? '#e74c3c' : '#2ecc71',
            }}
          />
        </div>
        <p className="budget-progress-text">
          Ai cheltuit {parseFloat(totalExpenses || 0).toFixed(2)} RON din bugetul de {parseFloat(monthlyBudget || 0).toFixed(2)} RON
        </p>
      </div>

      <div className="home-sections">
        <div className="section">
          <h3>Cheltuieli Recente</h3>
          {expenses.length > 0 ? (
            <table className="home-expense-table">
              <thead>
                <tr>
                  <th>Cheltuială</th>
                  <th>Suma</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 5).map((exp, idx) => (
                  <tr key={idx}>
                    <td>{exp.name}</td>
                    <td className="amount">{parseFloat(exp.amount).toFixed(2)} RON</td>
                    <td className="date">{new Date(exp.date).toLocaleDateString('ro-RO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nu există cheltuieli recente.</p>
          )}
        </div>

        <div className="section" style={{ height: '300px' }}>
          <h3>Comparație Buget vs Cheltuieli pentru {capitalizedMonthName}</h3>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default Home;
