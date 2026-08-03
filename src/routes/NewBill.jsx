
// src/components/NewBill.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import SaveBill from '../bills/SaveBill';

const APPS_SCRIPT_URL = import.meta.env.VITE_BILL_URL;

const MAX_RESULTS = 50;
const STORAGE_KEY = 'newbill_selected_products';
const QUOTATION_STORAGE_KEY = 'last_quotation_no';
const QUOTATION_CACHE_KEY = 'newbill_quotation_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// JSONP helper (same as before)
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

// Cache helpers for quotation only
function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCached(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

// Scoring function (unchanged)
function scoreProduct(product, q) {
  const id = product._id;
  const name = product._name;
  if (id === q || name === q) return { score: 0, pos: 0 };
  if (id.startsWith(q)) return { score: 1, pos: 0 };
  if (name.startsWith(q)) return { score: 2, pos: 0 };
  if (id.split(/\s+/).some((w) => w.startsWith(q))) return { score: 3, pos: id.indexOf(q) };
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return { score: 4, pos: name.indexOf(q) };
  if (id.includes(q)) return { score: 5, pos: id.indexOf(q) };
  return { score: 6, pos: name.indexOf(q) };
}

// Main Component
const NewBill = () => {
  const navigate = useNavigate();
  const { products, error: contextError, refreshData } = useAppContext();
  

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false); // for quotation only
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState(null); // local error (for quotation or product context)
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [quotationNo, setQuotationNo] = useState(null);
  const [fetchingQuotation, setFetchingQuotation] = useState(true);

  // Refs
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const qtyRefsDesktop = useRef({});
  const rateRefsDesktop = useRef({});
  const qtyRefsMobile = useRef({});
  const rateRefsMobile = useRef({});
  const [pendingFocusIndex, setPendingFocusIndex] = useState(null);

  // Helper to check visibility
  const isVisible = (el) => !!el && el.offsetParent !== null;
  const getQtyEl = (index) => {
    if (isVisible(qtyRefsDesktop.current[index])) return qtyRefsDesktop.current[index];
    return qtyRefsMobile.current[index];
  };
  const getRateEl = (index) => {
    if (isVisible(rateRefsDesktop.current[index])) return rateRefsDesktop.current[index];
    return rateRefsMobile.current[index];
  };


  

  // ------------------------------------------------------------
  // Use products from context, add search keys
  // ------------------------------------------------------------
  const allProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      _id: (p.product_id || '').toString().toLowerCase().trim(),
      _name: (p.product_name || '').toString().toLowerCase().trim(),
    }));
  }, [products]);

  // ------------------------------------------------------------
  // Fetch quotation number with caching
  // ------------------------------------------------------------
  const fetchQuotation = useCallback(async () => {
    setFetchingQuotation(true);
    const cached = getCached(QUOTATION_CACHE_KEY);
    if (cached) {
      setQuotationNo(cached);
      setFetchingQuotation(false);
      setTimeout(() => {
        fetchQuotationFresh();
      }, 100);
      return;
    }
    await fetchQuotationFresh();
  }, []);

  const fetchQuotationFresh = async () => {
    try {
      const data = await jsonpRequest(APPS_SCRIPT_URL);
      if (data && data.lastQuotation) {
        setQuotationNo(data.lastQuotation);
        setCached(QUOTATION_CACHE_KEY, data.lastQuotation);
        localStorage.setItem(QUOTATION_STORAGE_KEY, data.lastQuotation);
      } else {
        const defaultNo = 'Q-0';
        setQuotationNo(defaultNo);
        setCached(QUOTATION_CACHE_KEY, defaultNo);
        localStorage.setItem(QUOTATION_STORAGE_KEY, defaultNo);
      }
    } catch (err) {
      const stored = localStorage.getItem(QUOTATION_STORAGE_KEY);
      if (stored) {
        setQuotationNo(stored);
        setCached(QUOTATION_CACHE_KEY, stored);
      } else {
        const defaultNo = 'Q-0';
        setQuotationNo(defaultNo);
        setCached(QUOTATION_CACHE_KEY, defaultNo);
        localStorage.setItem(QUOTATION_STORAGE_KEY, defaultNo);
      }
    } finally {
      setFetchingQuotation(false);
    }
  };

  // ------------------------------------------------------------
  // Effects
  // ------------------------------------------------------------
  useEffect(() => {
    fetchQuotation();
    const interval = setInterval(() => {
      fetchQuotationFresh();
    }, CACHE_TTL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If context error, show it as local error (but allow user to retry)
  useEffect(() => {
    if (contextError) {
      setError(`Products: ${contextError}`);
    } else {
      setError(null);
    }
  }, [contextError]);

  // Persist selected products
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  }, [selectedProducts]);

  // Focus handling after adding product
  useEffect(() => {
    if (pendingFocusIndex === null) return;
    const el = getQtyEl(pendingFocusIndex);
    if (el) {
      el.focus();
      el.select();
    }
    setPendingFocusIndex(null);
  }, [pendingFocusIndex, selectedProducts]);

  // ------------------------------------------------------------
  // Computed values
  // ------------------------------------------------------------
  const grandTotal = useMemo(() => {
    return selectedProducts.reduce((sum, item) => sum + item.amount, 0);
  }, [selectedProducts]);

  const displayProducts = useMemo(() => {
    return selectedProducts
      .map((item, originalIndex) => ({ item, originalIndex }))
      .reverse();
  }, [selectedProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const scored = [];
    for (const p of allProducts) {
      if (!p._id.includes(q) && !p._name.includes(q)) continue;
      const { score, pos } = scoreProduct(p, q);
      scored.push({ product: p, score, pos, length: p._id.length + p._name.length });
    }
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.pos !== b.pos) return a.pos - b.pos;
      if (a.length !== b.length) return a.length - b.length;
      return a.product._name.localeCompare(b.product._name);
    });
    return scored.slice(0, MAX_RESULTS).map((s) => s.product);
  }, [searchTerm, allProducts]);

  // Dropdown open/close
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDropdownOpen(false);
      setHighlightIndex(-1);
      return;
    }
    setDropdownOpen(true);
    setHighlightIndex(-1);
  }, [searchTerm, filteredProducts.length]);

  // ------------------------------------------------------------
  // Event Handlers (unchanged)
  // ------------------------------------------------------------
  const handleSelectProduct = useCallback(
    (product) => {
      const existingIndex = selectedProducts.findIndex(
        (item) => item.product_id === product.product_id
      );
      let focusIndex;
      if (existingIndex !== -1) {
        const updated = [...selectedProducts];
        updated[existingIndex].quantity += 1;
        updated[existingIndex].quantityDisplay = String(updated[existingIndex].quantity);
        updated[existingIndex].amount = updated[existingIndex].quantity * updated[existingIndex].rate;
        setSelectedProducts(updated);
        focusIndex = existingIndex;
      } else {
        const newItem = {
          product_id: product.product_id,
          product_name: product.product_name,
          quantity: 1,
          quantityDisplay: '1',
          rate: product.rate,
          rateDisplay: String(product.rate),
          amount: product.rate,
        };
        setSelectedProducts([...selectedProducts, newItem]);
        focusIndex = selectedProducts.length;
      }
      setSearchTerm('');
      setDropdownOpen(false);
      setHighlightIndex(-1);
      setPendingFocusIndex(focusIndex);
    },
    [selectedProducts]
  );

  const handleQtyKeyDown = (e, originalIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = getRateEl(originalIndex);
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  const handleRateKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (!dropdownOpen && filteredProducts.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filteredProducts.length) {
          handleSelectProduct(filteredProducts[highlightIndex]);
        } else if (filteredProducts.length === 1) {
          handleSelectProduct(filteredProducts[0]);
        }
        break;
      case 'Escape':
        setDropdownOpen(false);
        setHighlightIndex(-1);
        searchInputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  const updateRow = (index, field, displayValue) => {
    const updated = [...selectedProducts];
    const item = updated[index];
    const sanitized = displayValue.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const finalDisplay = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    const numValue = finalDisplay === '' ? 0 : parseFloat(finalDisplay);
    const validNum = isNaN(numValue) ? 0 : numValue;
    if (field === 'quantity') {
      if (validNum < 0) { alert('Quantity cannot be negative.'); return; }
      item.quantityDisplay = finalDisplay;
      item.quantity = validNum;
    } else if (field === 'rate') {
      if (validNum < 0) { alert('Rate cannot be negative.'); return; }
      item.rateDisplay = finalDisplay;
      item.rate = validNum;
    }
    item.amount = item.quantity * item.rate;
    setSelectedProducts(updated);
  };

  const removeRow = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleSaveClick = () => {
    if (selectedProducts.length === 0) {
      alert('No items to save.');
      return;
    }
    setShowSaveModal(true);
  };

  const handleSaveSuccess = () => {
    setShowSaveModal(false);
    if (quotationNo) {
      const match = quotationNo.match(/Q-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        const nextNum = num + 1;
        const nextQuotation = `Q-${nextNum}`;
        setQuotationNo(nextQuotation);
        setCached(QUOTATION_CACHE_KEY, nextQuotation);
        localStorage.setItem(QUOTATION_STORAGE_KEY, nextQuotation);
      } else {
        const fallback = 'Q-1';
        setQuotationNo(fallback);
        setCached(QUOTATION_CACHE_KEY, fallback);
        localStorage.setItem(QUOTATION_STORAGE_KEY, fallback);
      }
    } else {
      const fallback = 'Q-1';
      setQuotationNo(fallback);
      setCached(QUOTATION_CACHE_KEY, fallback);
      localStorage.setItem(QUOTATION_STORAGE_KEY, fallback);
    }
  };

  const handlePrint = () => {
    if (quotationNo) {
      navigate('/print', {
        state: {
          products: selectedProducts,
          quotationNo: quotationNo,
        },
      });
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Back to Dashboard"
        >
          <FaArrowLeft className="text-gray-600 w-4 h-4" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">New Bill</h1>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* LEFT PANEL - Search */}
          <div className="lg:w-1/3 w-full">
            <div className="bg-white rounded-xl shadow-lg p-4 lg:sticky lg:top-24">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Product
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  id="search"
                  type="text"
                  placeholder="Type product ID or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (filteredProducts.length > 0) setDropdownOpen(true);
                  }}
                  className="w-full px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  autoFocus
                />

                {/* Show global loading indicator (optional) */}
                {loading && (
                  <div className="absolute right-3 top-2.5 sm:top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}

                {dropdownOpen && filteredProducts.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-72 sm:max-h-60 overflow-y-auto"
                  >
                    <ul className="py-1">
                      {filteredProducts.map((product, index) => (
                        <li
                          key={product.product_id}
                          className={`px-3 sm:px-4 py-2.5 sm:py-2 cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2 hover:bg-gray-100 ${
                            highlightIndex === index ? 'bg-gray-200' : ''
                          }`}
                          onMouseEnter={() => setHighlightIndex(index)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectProduct(product);
                          }}
                        >
                          <span className="flex flex-col sm:flex-row sm:gap-2 min-w-0">
                            <span className="font-medium truncate">{product.product_id}</span>
                            <span className="text-gray-700 truncate">{product.product_name}</span>
                          </span>
                          <span className="text-sm text-gray-500 shrink-0">₹{product.rate}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {dropdownOpen && searchTerm.trim() && filteredProducts.length === 0 && !loading && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl p-4 text-center text-gray-500">
                    No products found.
                  </div>
                )}

                {error && (
                  <div className="mt-2 text-sm text-red-600">
                    Error: {error}
                    <button
                      onClick={() => {
                        // Retry: refresh context data
                        refreshData();
                        // Also refresh quotation
                        fetchQuotationFresh();
                      }}
                      className="ml-2 underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>{selectedProducts.length} item(s) in bill</span>
                {selectedProducts.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all items from this bill?')) {
                        setSelectedProducts([]);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Clear Bill
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Bill items (unchanged) */}
          <div className="lg:w-2/3 w-full">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedProducts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                          No items added yet.
                        </td>
                      </tr>
                    ) : (
                      displayProducts.map(({ item, originalIndex }) => (
                        <tr key={item.product_id + originalIndex} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm text-gray-700">{originalIndex + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">{item.product_name}</td>
                          <td className="px-4 py-3">
                            <input
                              ref={(el) => (qtyRefsDesktop.current[originalIndex] = el)}
                              type="text"
                              inputMode="decimal"
                              value={item.quantityDisplay}
                              onChange={(e) => updateRow(originalIndex, 'quantity', e.target.value)}
                              onKeyDown={(e) => handleQtyKeyDown(e, originalIndex)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              ref={(el) => (rateRefsDesktop.current[originalIndex] = el)}
                              type="text"
                              inputMode="decimal"
                              value={item.rateDisplay}
                              onChange={(e) => updateRow(originalIndex, 'rate', e.target.value)}
                              onKeyDown={handleRateKeyDown}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                            ₹{item.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeRow(originalIndex)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition"
                              aria-label="Remove item"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-gray-200">
                {selectedProducts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400">No items added yet.</div>
                ) : (
                  displayProducts.map(({ item, originalIndex }) => (
                    <div key={item.product_id + originalIndex} className="p-4">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400">#{originalIndex + 1}</div>
                          <div className="text-sm font-medium text-gray-800 break-words">{item.product_name}</div>
                        </div>
                        <button
                          onClick={() => removeRow(originalIndex)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition shrink-0"
                          aria-label="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">Qty</label>
                          <input
                            ref={(el) => (qtyRefsMobile.current[originalIndex] = el)}
                            type="text"
                            inputMode="decimal"
                            value={item.quantityDisplay}
                            onChange={(e) => updateRow(originalIndex, 'quantity', e.target.value)}
                            onKeyDown={(e) => handleQtyKeyDown(e, originalIndex)}
                            className="w-full px-2 py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">Rate</label>
                          <input
                            ref={(el) => (rateRefsMobile.current[originalIndex] = el)}
                            type="text"
                            inputMode="decimal"
                            value={item.rateDisplay}
                            onChange={(e) => updateRow(originalIndex, 'rate', e.target.value)}
                            onKeyDown={handleRateKeyDown}
                            className="w-full px-2 py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">Amount</label>
                          <div className="px-2 py-2 text-base font-semibold text-gray-800">₹{item.amount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {selectedProducts.length > 0 && (
                <div className="border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-end gap-3 bg-gray-50">
                  <div className="flex items-center gap-4 mr-auto">
                    <div className="text-base sm:text-lg font-semibold text-gray-800">
                      Grand Total: ₹{grandTotal.toFixed(2)}
                    </div>
                    {quotationNo && (
                      <div className="text-sm text-blue-600 font-medium">
                        Quotation: {quotationNo}
                      </div>
                    )}
                    {fetchingQuotation && (
                      <div className="text-sm text-gray-500">
                        <span className="animate-pulse">Loading quotation...</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePrint}
                    disabled={!quotationNo}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      quotationNo
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>

                  <button
                    onClick={handleSaveClick}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SaveBill
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        products={selectedProducts}
        totalAmount={grandTotal}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
};

export default NewBill;