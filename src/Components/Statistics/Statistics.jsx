import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  LinearScale,
  CategoryScale,
  BarElement,
} from 'chart.js';
import moment from 'moment';
import './Statistics.css';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend, LinearScale, CategoryScale, BarElement);

const Statistics = () => {
  const { user } = useAuth();
  const [statisticsData, setStatisticsData] = useState(null);
  const [type, setType] = useState('general');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [category, setCategory] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);

  const handleClearFilters = () => {
    setYear('');
    setMonth('');
    setDay('');
  };

  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;
  }, []);

  const fetchData = async () => {
    if (!user) return;
  
    // Adjustăm tipul de statistică pentru 'budgetComparison'
    const adjustedType = type === 'budgetComparison' ? 'budgetComparison' : (day ? 'daily' : type);
  
    // Parametrii pentru query-ul de API
    const params = {
      type: adjustedType,
      year: year || undefined,  // Dacă nu selectezi anul, trimitem undefined
      month: month || undefined,
      day: day || undefined,
      category,
      user_id: user.id,
    };
  
    console.log('Request params:', params);
  
    try {
      const response = await axios.get('/api/statistics', { params });
      console.log(response.data);
      setStatisticsData(response.data);
  
      if (response.data.labels && response.data.labels.length > 0) {
        // Generăm lista de ani disponibili
        const uniqueYears = [...new Set(response.data.labels.map(label => label?.split('-')[0]))];
        setAvailableYears(uniqueYears);
  
        // Generăm lista de luni disponibile
        const uniqueMonths = [...new Set(
          response.data.labels
            .filter(label => label && label.startsWith(year))
            .map(label => label?.split('-')[1])
        )];
        setAvailableMonths(uniqueMonths);
      }
    } catch (error) {
      console.error('Eroare la obținerea datelor:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type, year, month, day, category, user]);

  useEffect(() => {
    if (month && year) {
      const daysInMonth = moment(`${year}-${month}`, 'YYYY-MM').daysInMonth();
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      setAvailableDays(days);
    } else {
      setAvailableDays([]);
    }
  }, [year, month]);

  useEffect(() => {
    if (day && type === 'general') {
      setType('daily');
    } else if (!day && type === 'daily') {
      setType('general');
    }
  }, [day, type]);

  useEffect(() => {
    if (!statisticsData?.labels?.length) return;
  
    const filtered = statisticsData.labels
      .map(label => label?.split('-')[0])
      .filter(year => year && !isNaN(year) && year.length === 4);
  
    const uniqueYears = [...new Set(filtered)];
    setAvailableYears(uniqueYears);
  
    const monthsFiltered = statisticsData.labels
      .filter(label => year && label.startsWith(year))
      .map(label => label?.split('-')[1])
      .filter(m => m && m.length === 2);
  
    const uniqueMonths = [...new Set(monthsFiltered)];
    setAvailableMonths(uniqueMonths);
  }, [statisticsData, year]);
  

  const generateChartData = () => {
    if (!statisticsData) return {};

    const filterByDate = (label) => {
      const [y, m] = label?.split('-') || [];
      if (year && y !== year) return false;
      if (month && m !== month) return false;
      return true;
    };

    const filteredIndices = (statisticsData.labels || [])
      .map((label, idx) => (filterByDate(label) ? idx : -1))
      .filter(idx => idx !== -1);

    const filteredExpenses = statisticsData.expenses ? filteredIndices.map(i => statisticsData.expenses[i]) : [0];
    const filteredIncomes = statisticsData.incomes ? filteredIndices.map(i => statisticsData.incomes[i]) : [0];
    const filteredBudget = statisticsData.budget ? filteredIndices.map(i => statisticsData.budget[i]) : [0];

    switch (type) {
      case 'general':
      case 'daily':
        return {
          labels: ['Cheltuieli', 'Venituri', 'Buget'],
          datasets: [
            {
              data: [
                filteredExpenses.reduce((a, b) => a + b, 0),
                filteredIncomes.reduce((a, b) => a + b, 0),
                filteredBudget.reduce((a, b) => a + b, 0),
              ],
              backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
            },
          ],
        };
      case 'trend':
        return {
          labels: statisticsData.labels || [],
          datasets: [
            {
              label: 'Cheltuieli',
              data: statisticsData.expenses || [],
              borderColor: '#ff6384',
              fill: false,
            },
            {
              label: 'Venituri',
              data: statisticsData.incomes || [],
              borderColor: '#36a2eb',
              fill: false,
            },
            {
              label: 'Economii',
              data: statisticsData.savings || [],
              borderColor: '#ffce56',
              fill: false,
            },
          ],
        };
      case 'category':
        return {
          labels: ['Necesar', 'Opțional'],
          datasets: [
            {
              data: [
                statisticsData.necessaryExpenses ?? 0,
                statisticsData.optionalExpenses ?? 0,
              ],
              backgroundColor: ['#ff6384', '#36a2eb'],
            },
          ],
        };
      case 'expensesByPeriod':
        return {
          labels: ['Zi', 'Săptămână', 'Lună'],
          datasets: [
            {
              data: [
                statisticsData.dailyExpense ?? 0,
                statisticsData.weeklyExpense ?? 0,
                statisticsData.monthlyExpense ?? 0,
              ],
              backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
            },
          ],
        };
      case 'remainingBudget':
        return {
          labels: ['Buget Rămas'],
          datasets: [
            {
              data: [statisticsData.remainingBudget ?? 0],
              backgroundColor: ['#36a2eb'],
            },
          ],
        };
      case 'budgetComparison':
        return {
          labels: ['Cheltuieli', 'Buget'],
          datasets: [
            {
              data: [statisticsData.expensesSum ?? 0, statisticsData.budgetSum ?? 0],
              backgroundColor: ['#ff6384', '#36a2eb'],
            },
          ],
        };
      case 'unplannedExpenses':
        return {
          labels: ['Cheltuieli Impulsive'],
          datasets: [
            {
              data: [statisticsData.unplannedExpenses ?? 0],
              backgroundColor: ['#ff6384'],
            },
          ],
        };
      default:
        return {};
    }
  };

  const generateTableData = () => {
    if (!statisticsData?.details) return null;
  
    const rows = statisticsData.details;
  
    // Pentru budgetComparison, sortăm după perioadă
    const sorted = [...rows].sort((a, b) => {
      return (a.period || '').localeCompare(b.period || '');
    });
  
    const filteredRows = sorted.filter((row) => {
      const [y, m, d] = (row.period || '').split('-');
      if (year && y !== year) return false;
      if (month && m !== month) return false;
      if (day && d !== day) return false;
      return true;
    });
  
    if (filteredRows.length === 0) {
      return (
        <div className="statistics-table">
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Nu este nici o tranzacție în ziua selectată.
          </p>
        </div>
      );
    }
  
    return (
      <div className="statistics-table">
        <table>
          <thead>
            <tr>
              <th>Perioadă</th>
              <th>Cheltuieli</th>
              <th>Venituri</th>
              <th>Buget</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={idx}>
                <td>{row.period}</td>
                <td>{parseFloat(row.expenses_sum ?? 0).toFixed(2)}</td>
                <td>{parseFloat(row.incomes_sum ?? 0).toFixed(2)}</td>
                <td>{parseFloat(row.budget_sum ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="statistics-container">
      <h1>Statistici Financiare</h1>

      <div className="filters-row">
        <div className="dropdown">
          <label>Tip Statistică:</label>
          <select onChange={(e) => setType(e.target.value)} value={type}>
            <option value="general">Statistică Generală</option>
            <option value="trend">Trenduri pe termen lung</option>
            <option value="category">Necesar vs Opțional</option>
            <option value="expensesByPeriod">Cheltuieli/Perioadă</option>
            <option value="remainingBudget">Buget Rămas</option>
            <option value="budgetComparison">Buget vs Cheltuieli</option>
            <option value="unplannedExpenses">Cheltuieli Impulsive</option>
          </select>
        </div>

        <button className="clear-btn" onClick={handleClearFilters}>
          Resetează filtrele
        </button>
      </div>

      <div className="filters">
        <div className="dropdown">
          <label>An:</label>
          <select onChange={(e) => setYear(e.target.value)} value={year}>
            <option value="">Alege anul</option>
            {availableYears.map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <div className="dropdown">
          <label>Lună:</label>
          <select onChange={(e) => setMonth(e.target.value)} value={month} disabled={!year}>
            <option value="">Alege luna</option>
            {availableMonths.map((monthOption) => (
              <option key={monthOption} value={monthOption}>
                {moment().month(monthOption - 1).format('MMMM')}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown">
          <label>Zi:</label>
          <select onChange={(e) => setDay(e.target.value)} value={day} disabled={!month}>
            <option value="">Alege ziua</option>
            {availableDays.map((d) => (
              <option key={d} value={`${d < 10 ? '0' : ''}${d}`}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {statisticsData && (
        <>
          <div className="chart-container">
            {type === 'trend' ? (
              <Line data={generateChartData()} />
            ) : type === 'category' ? (
              <Pie data={generateChartData()} />
            ) : type === 'expensesByPeriod' ? (
              <Bar data={generateChartData()} />
            ) : type === 'remainingBudget' ? (
              <Pie data={generateChartData()} />
            ) : type === 'budgetComparison' ? (
              <Bar data={generateChartData()} />
            ) : type === 'unplannedExpenses' ? (
              <Pie data={generateChartData()} />
            ) : (
              <Pie data={generateChartData()} />
            )}
          </div>

          {generateTableData()}
        </>
      )}
    </div>
  );
};

export default Statistics;
