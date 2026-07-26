

import React, { useState, useEffect } from 'react';
import {
  FaReceipt,
  FaFileAlt,
  FaPlusSquare,
  FaEdit,
  FaTrash,
  FaArrowRight,
  FaRupeeSign,
  FaBoxes,
  FaShoppingCart,
  FaChartLine,
  FaListUl,
  FaSpinner,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ------------------------------------------------------------
// JSONP helper (copied from NewBill)
// ------------------------------------------------------------
function jsonpRequest(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callback = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Request timed out after ' + timeout + 'ms'));
    }, timeout);

    window[callback] = function (data) {
      cleanup();
      resolve(data);
    };

    function cleanup() {
      clearTimeout(timer);
      delete window[callback];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callback;
    script.onerror = function () {
      cleanup();
      reject(new Error('Network error – check URL and CORS settings.'));
    };
    document.body.appendChild(script);
  });
}

// ------------------------------------------------------------
// Environment variables
// ------------------------------------------------------------
const PRODUCT_API = import.meta.env.VITE_PRODUCT_URL;
const BILL_API = import.meta.env.VITE_BILL_URL;

// ------------------------------------------------------------
// Dashboard component
// ------------------------------------------------------------
const Dashboard = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Summary stats
  const [totalBills, setTotalBills] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [recentBills, setRecentBills] = useState([]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch products and bills in parallel
        const [productsRes, billsRes] = await Promise.all([
          jsonpRequest(`${PRODUCT_API}?action=getProducts`),
          jsonpRequest(`${BILL_API}?action=getBills`),
        ]);

        // Process products
        if (productsRes.success) {
          const products = productsRes.data || [];
          setTotalProducts(products.length);
        } else {
          throw new Error(productsRes.message || 'Failed to fetch products.');
        }

        // Process bills
        if (billsRes.success) {
          const bills = billsRes.data || [];
          setTotalBills(bills.length);

          // Compute today's sales and monthly revenue
          const now = new Date();
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          let todayTotal = 0;
          let monthTotal = 0;

          // Convert timestamps to Date objects for comparison
          bills.forEach((bill) => {
            let billDate;
            if (bill.timestamp) {
              // If timestamp is a number (epoch ms), use it
              if (typeof bill.timestamp === 'number') {
                billDate = new Date(bill.timestamp);
              } else {
                // fallback: try to parse
                billDate = new Date(bill.timestamp);
              }
            } else {
              // If no timestamp, skip (or use current date as fallback)
              return;
            }

            // Check if date is valid
            if (isNaN(billDate.getTime())) return;

            const amount = parseFloat(bill.totalAmount) || 0;

            // Today
            if (
              billDate.getFullYear() === todayDate.getFullYear() &&
              billDate.getMonth() === todayDate.getMonth() &&
              billDate.getDate() === todayDate.getDate()
            ) {
              todayTotal += amount;
            }

            // This month
            if (
              billDate.getFullYear() === currentYear &&
              billDate.getMonth() === currentMonth
            ) {
              monthTotal += amount;
            }
          });

          setTodaySales(todayTotal);
          setMonthlyRevenue(monthTotal);

          // Get recent bills (last 4, sorted by timestamp descending)
          const sorted = [...bills]
            .filter((b) => b.timestamp) // ignore bills without timestamp
            .sort((a, b) => {
              const tA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
              const tB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
              return tB - tA; // newest first
            })
            .slice(0, 4)
            .map((bill) => ({
              id: bill.quotationNo || 'Unknown',
              customer: bill.customerName || 'Unknown',
              amount: `₹${parseFloat(bill.totalAmount || 0).toFixed(2)}`,
              status: 'Paid', // we can set default or derive from something else
            }));

          setRecentBills(sorted);
        } else {
          throw new Error(billsRes.message || 'Failed to fetch bills.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper to format currency
  const formatCurrency = (value) => {
    return `₹ ${value.toLocaleString('en-IN')}`;
  };

  // Quick action cards (unchanged)
  const actionCards = [
    {
      id: 'new-bill',
      title: 'New Bill',
      description: 'Create a new customer invoice.',
      icon: FaReceipt,
      path: '/new-bill',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      hoverBorder: 'hover:border-blue-300',
    },
    {
      id: 'view-bills',
      title: 'View Bills',
      description: 'View all generated bills.',
      icon: FaFileAlt,
      path: '/view-bills',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      hoverBorder: 'hover:border-emerald-300',
    },
    {
      id: 'add-product',
      title: 'Add Product',
      description: 'Add new products to inventory.',
      icon: FaPlusSquare,
      path: '/add-product',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      hoverBorder: 'hover:border-indigo-300',
    },
    {
      id: 'edit-product',
      title: 'Edit Product',
      description: 'Update existing product details.',
      icon: FaEdit,
      path: '/edit-product',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      hoverBorder: 'hover:border-amber-300',
    },
    {
      id: 'delete-product',
      title: 'Delete Product',
      description: 'Remove products from inventory.',
      icon: FaTrash,
      path: '/delete-product',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      hoverBorder: 'hover:border-rose-300',
    },
    {
      id: 'view-products',
      title: 'View Products',
      description: 'View all products in inventory.',
      icon: FaListUl,
      path: '/view-products',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      hoverBorder: 'hover:border-cyan-300',
    },
  ];

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Summary data (derived from real stats)
  const summaryData = [
    {
      id: 1,
      label: 'Total Bills',
      value: loading ? '...' : totalBills,
      icon: FaReceipt,
      border: 'border-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 2,
      label: 'Total Products',
      value: loading ? '...' : totalProducts,
      icon: FaBoxes,
      border: 'border-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      id: 3,
      label: "Today's Sales",
      value: loading ? '...' : formatCurrency(todaySales),
      icon: FaShoppingCart,
      border: 'border-purple-500',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      mono: true,
    },
    {
      id: 4,
      label: 'Monthly Revenue',
      value: loading ? '...' : formatCurrency(monthlyRevenue),
      icon: FaChartLine,
      border: 'border-orange-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      mono: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
              Billing Dashboard
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Welcome back, SOWRI KRISHNAN
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here&rsquo;s your overview for today.
            </p>
          </div>
          <div className="text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-600 self-start sm:self-auto">
            {currentDate}
          </div>
        </header>

        {/* Loading / Error state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-blue-500 w-8 h-8" />
            <span className="ml-3 text-gray-600">Loading dashboard data…</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-center gap-3 mb-6">
            <span>Error loading data: {error}</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Summary Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {summaryData.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl shadow-sm border-t-4 ${item.border} p-4 sm:p-5 flex items-start gap-3 sm:gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1`}
                  >
                    <div
                      className={`p-2.5 sm:p-3 rounded-full ${item.iconBg} ${item.iconColor} flex-shrink-0`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-lg sm:text-2xl font-bold text-gray-900 truncate ${
                          item.mono ? 'font-mono' : ''
                        }`}
                      >
                        {item.value}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">{item.label}</p>
                    </div>
                  </div>
                );
              })}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <section className="lg:col-span-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {actionCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.id}
                        onClick={() => navigate(card.path)}
                        className={`
                          group bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6
                          transition-all duration-200 ease-in-out
                          hover:shadow-lg hover:-translate-y-1
                          ${card.hoverBorder} hover:border-2 cursor-pointer
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 min-w-0">
                            <div
                              className={`p-3 rounded-full ${card.iconBg} ${card.iconColor} flex-shrink-0`}
                            >
                              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                {card.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {card.description}
                              </p>
                            </div>
                          </div>
                          <FaArrowRight className="text-gray-300 group-hover:text-blue-500 transition-colors duration-200 mt-1 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Recent Bills */}
              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
                  <FaRupeeSign className="text-gray-400" size={14} />
                  Recent Bills
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
                  {recentBills.length === 0 ? (
                    <p className="text-gray-400 text-sm">No bills yet.</p>
                  ) : (
                    recentBills.map((bill, idx) => (
                      <div
                        key={bill.id}
                        className={`flex items-center justify-between py-3 ${
                          idx !== recentBills.length - 1
                            ? 'border-b border-dashed border-gray-200'
                            : ''
                        } ${idx === 0 ? 'pt-0' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 font-mono">{bill.id}</p>
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {bill.customer}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm font-semibold text-gray-900 font-mono">
                            {bill.amount}
                          </p>
                          <span
                            className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded mt-0.5 ${
                              bill.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {bill.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-lg z-50">
          Opening {toast}…
        </div>
      )}
    </div>
  );
};

export default Dashboard;