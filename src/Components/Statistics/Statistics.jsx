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
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';

ChartJS.register(ArcElement, Tooltip, Legend, LinearScale, CategoryScale, BarElement);

const Statistics = () => {
  const { user } = useAuth();
  const [statisticsData, setStatisticsData] = useState(null);
  const [type, setType] = useState('general');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [category,] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleClearFilters = () => {
    setYear('');
    setMonth('');
    setDay('');
    setStartDate(null);
    setEndDate(null);
  };

  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;
  }, []);

  useEffect(() => {
    const fetchAllLabels = async () => {
      if (!user) return;

      try {
        const response = await axios.get('/api/statistics', {
          params: {
            type: 'general',
            user_id: user.id,
          },
        });

        const allLabels = response.data.labels || [];

        const uniqueYears = [...new Set(allLabels.map(label => label?.split('-')[0]))];
        const uniqueMonths = [...new Set(allLabels.map(label => label?.split('-')[1]))];

        setAvailableYears(uniqueYears);
        setAvailableMonths(uniqueMonths);
      } catch (err) {
        console.error('Eroare la încărcarea label-urilor generale:', err);
      }
    };

    fetchAllLabels();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      if (type === 'expensesByPeriod' && (!startDate || !endDate)) {
        return;
      }

      const adjustedType =
        type === 'budgetComparison' || type === 'unplannedExpenses'
          ? type
          : day
            ? 'daily'
            : type;



      const params = {
        type: adjustedType,
        category,
        user_id: user.id,
      };

      if (type === 'expensesByPeriod') {
        params.start_date = moment(startDate).format('YYYY-MM-DD');
        params.end_date = moment(endDate).format('YYYY-MM-DD');
      } else {
        params.year = year || undefined;
        params.month = month || undefined;
        params.day = day || undefined;
      }

      try {
        const response = await axios.get('/api/statistics', { params });
        setStatisticsData(response.data);
      } catch (error) {
        console.error('Eroare la obținerea datelor:', error);
      }
    };

    fetchData();
  }, [type, year, month, day, category, user, startDate, endDate]);



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
    if (type !== 'daily' && type !== 'budgetComparison') {
      setMonth('');
      setDay('');
    }
  }, [type]);

  useEffect(() => {
    if (type !== 'expensesByPeriod') {
      setStartDate(null);
      setEndDate(null);
    }
  }, [type]);


  const generateChartData = () => {
    if (!statisticsData) return {};

    const filterByDate = (label) => {
      if (type === 'unplannedExpenses') return true; // 🟢 Nu filtrăm aici
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

      case 'expensesByPeriod':
        return {
          labels: statisticsData.labels || [],
          datasets: [
            {
              label: 'Cheltuieli',
              data: statisticsData.expenses || [],
              borderColor: '#ff6384',
              backgroundColor: '#ff6384',
              fill: false,
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
          labels: ['Impulsive', 'Planificate'],
          datasets: [
            {
              data: [
                statisticsData.unplannedExpenses ?? 0,
                statisticsData.plannedExpenses ?? 0
              ],
              backgroundColor: ['#ff6384', '#36a2eb']
            }
          ]
        };
      default:
        return {};
    }
  };

  const generateTableData = () => {
    if (!statisticsData?.details) return null;

    if (type === 'unplannedExpenses') {
      const rows = statisticsData.details;

      if (!rows || rows.length === 0) {
        return (
          <div className="statistics-table">
            <p style={{ marginTop: '1rem', color: '#666' }}>
              Nu există cheltuieli impulsive în perioada selectată.
            </p>
          </div>
        );
      }

      const sorted = [...rows].sort((a, b) => (a.period || '').localeCompare(b.period || ''));

      return (
        <div className="statistics-table">
          <table>
            <thead>
              <tr>
                <th>Perioadă</th>
                <th>Cheltuieli impulsive (RON)</th>
                <th>Cheltuieli planificate (RON)</th>
                <th>Buget (RON)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.period}</td>
                  <td>{parseFloat(row.impulsive_expenses ?? 0).toFixed(2)}</td>
                  <td>{parseFloat(row.planned_expenses ?? 0).toFixed(2)}</td>
                  <td>{parseFloat(row.incomes_sum ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === 'budgetComparison') {
      const rows = [...(statisticsData.details || [])].sort((a, b) =>
        a.period.localeCompare(b.period)
      );

      if (rows.length === 0) {
        return (
          <div className="statistics-table">
            <p style={{ marginTop: '1rem', color: '#666' }}>
              Nu există date pentru perioada selectată.
            </p>
          </div>
        );
      }

      const formatLuna = (period) => {
        const [year, month] = period.split('-');
        return `${moment().month(month - 1).format('MMMM')} ${year}`;
      };

      return (
        <div className="statistics-table">
          <table>
            <thead>
              <tr>
                <th>Lună</th>
                <th>
                  {day
                    ? `Cheltuieli până la ${day} ${moment().month(month - 1).format('MMMM')} ${year}`
                    : 'Cheltuieli totale (RON)'
                  }
                </th>
                <th>Buget lunar (RON)</th>
              </tr>
            </thead>
            {type === 'budgetComparison' && (
              <caption style={{ captionSide: 'bottom', paddingTop: '0.5rem', fontSize: '0.95rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                {day
                  ? `Suma cheltuielilor până la data de ${day} ${moment().month(month - 1).format('MMMM')} ${year}`
                  : `Suma cheltuielilor lunare totale comparată cu bugetul lunar.`}
              </caption>
            )}

            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{formatLuna(row.period)}</td>
                  <td>{parseFloat(row.expenses_sum || 0).toFixed(2)}</td>
                  <td>{parseFloat(row.budget_sum || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === 'expensesByPeriod') {
      const rows = statisticsData.details;

      if (!rows || rows.length === 0) {
        return (
          <div className="statistics-table">
            <p style={{ marginTop: '1rem', color: '#666' }}>
              Nu există cheltuieli în perioada selectată.
            </p>
          </div>
        );
      }

      const sorted = [...rows].sort((a, b) => (a.period || '').localeCompare(b.period || ''));

      return (
        <div className="statistics-table">
          <table>
            <thead>
              <tr>
                <th>Perioadă</th>
                <th>Nume</th>
                <th>Categorie</th>
                <th>Valoare (RON)</th>
                <th>Impulsivă?</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.period}</td>
                  <td>{row.name}</td>
                  <td>{row.category_name}</td>
                  <td>{parseFloat(row.expenses_sum).toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{row.planned_impulsive ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const rows = statisticsData.details;

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
            <option value="expensesByPeriod">Cheltuieli/Perioadă</option>
            <option value="remainingBudget">Buget Rămas</option>
            <option value="budgetComparison">Buget vs Cheltuieli</option>
            <option value="unplannedExpenses">Cheltuieli Impulsive vs Planificate</option>
          </select>
        </div>

        <button className="clear-btn" onClick={handleClearFilters}>
          Resetează filtrele
        </button>
      </div>

      {type === 'expensesByPeriod' && (
        <div className="filters" style={{ marginTop: '1rem' }}>
          <div className="datepicker-wrapper">
            <label>Selectează o perioadă:</label>
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={([start, end]) => {
                setStartDate(start);
                setEndDate(end);
              }}
              isClearable
              dateFormat="dd MMMM yyyy"
              placeholderText="Selectează intervalul"
            />
          </div>
        </div>
      )}

      {type !== 'expensesByPeriod' && (
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
      )}

      {(type !== 'expensesByPeriod' || (startDate && endDate)) && statisticsData && (
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
