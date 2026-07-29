// ViewBills.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
// Apps Script base URL (from environment variable)
const APPS_SCRIPT_URL = import.meta.env.VITE_BILL_URL;

// JSONP helper
function jsonpRequest(url, timeout = 30000) {
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

// Format an epoch-millis timestamp -> "DD-MM-YYYY" (fixed to Asia/Kolkata so it
// doesn't depend on the browser's local timezone)
const formatDate = (ts) => {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

// Format an epoch-millis timestamp -> "hh:MM AM/PM" (fixed to Asia/Kolkata)
const formatTime = (ts) => {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '-';
  }
};

const ViewBills = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      try {
        const data = await jsonpRequest(`${APPS_SCRIPT_URL}?action=getBills`);
        if (data.success) {
          setBills(data.data);
        } else {
          setError('Failed to load bills.');
        }
      } catch (err) {
        setError(err.message || 'Network error.');
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  const handlePrint = (bill) => {
    let products = [];
    try {
      products = JSON.parse(bill.products);
    } catch (e) {
      products = [];
    }
    navigate('/print', {
      state: {
        products: products,
        quotationNo: bill.quotationNo,
        timestamp: bill.timestamp,   // pass the bill's saved time through
        autoPrint: true,
        from: 'view-bills'
      }
    });
  };

  const handleView = (bill) => {
    let products = [];
    try {
      products = JSON.parse(bill.products);
    } catch (e) {
      products = [];
    }
    navigate('/print', {
      state: {
        products: products,
        quotationNo: bill.quotationNo,
        timestamp: bill.timestamp,   // pass the bill's saved time through
        autoPrint: false,
        from: 'view-bills'
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <button
                      onClick={() => navigate('/')}
                      className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                      aria-label="Back to Dashboard">
                        <FaArrowLeft className="text-gray-600 w-4 h-4" />
                    </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">View Bills</h1>

        {bills.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No bills found.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bills.map((bill, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{bill.quotationNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{bill.customerName}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">₹{Number(bill.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(bill.timestamp)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatTime(bill.timestamp)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {/* View button */}
                          <button
                            onClick={() => handleView(bill)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition"
                            title="View Bill"
                            aria-label="View Bill"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {/* Print button */}
                          <button
                            onClick={() => handlePrint(bill)}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition"
                            title="Print Bill"
                            aria-label="Print Bill"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewBills;