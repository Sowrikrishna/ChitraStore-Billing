// EditBill.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_PRODUCT_URL;
const APPS_SCRIPT_URL = import.meta.env.VITE_BILL_URL;

const MAX_RESULTS = 50;
const PRODUCTS_CACHE_KEY = 'editbill_products_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// JSONP helper
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

// Cache helpers
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
  } catch {
    // ignore
  }
}

// Scoring function
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

// ------------------------------------------------------------
// Main Component
// ------------------------------------------------------------
const EditBill = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products: initialProducts, quotationNo, customerName: initialCustomer, timestamp } = location.state || {};

  useEffect(() => {
    if (!quotationNo) {
      navigate('/view-bills');
    }
  }, [quotationNo, navigate]);

  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------
  const [customerName, setCustomerName] = useState(initialCustomer || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(() => {
    const initial = initialProducts || [];
    return initial.map(item => ({
      ...item,
      quantityDisplay: item.quantityDisplay !== undefined ? item.quantityDisplay : String(item.quantity || 0),
      rateDisplay: item.rateDisplay !== undefined ? item.rateDisplay : String(item.rate || 0),
      amount: (item.quantity || 0) * (item.rate || 0)
    }));
  });
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Refs
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const fetchingRef = useRef(false);
  const qtyRefsDesktop = useRef({});
  const rateRefsDesktop = useRef({});
  const qtyRefsMobile = useRef({});
  const rateRefsMobile = useRef({});
  const [pendingFocusIndex, setPendingFocusIndex] = useState(null);
  const iframeRef = useRef(null);

  const isVisible = (el) => !!el && el.offsetParent !== null;
  const getQtyEl = (index) => {
    if (isVisible(qtyRefsDesktop.current[index])) return qtyRefsDesktop.current[index];
    return qtyRefsMobile.current[index];
  };
  const getRateEl = (index) => {
    if (isVisible(rateRefsDesktop.current[index])) return rateRefsDesktop.current[index];
    return rateRefsMobile.current[index];
  };

  // Fetch products (cached)
  const fetchProducts = useCallback(async (forceRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!forceRefresh) {
      const cached = getCached(PRODUCTS_CACHE_KEY);
      if (cached) {
        setAllProducts(cached);
        setError(null);
        setLoading(false);
        fetchingRef.current = false;
        setTimeout(() => fetchProducts(true), 100);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const data = await jsonpRequest(`${BASE_URL}?action=getProducts`);
      if (data.success) {
        const withSearchKeys = data.data.map((p) => ({
          ...p,
          _id: (p.product_id || '').toString().toLowerCase().trim(),
          _name: (p.product_name || '').toString().toLowerCase().trim(),
        }));
        setAllProducts(withSearchKeys);
        setCached(PRODUCTS_CACHE_KEY, withSearchKeys);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to load products.');
      }
    } catch (err) {
      const cached = getCached(PRODUCTS_CACHE_KEY);
      if (cached) {
        setAllProducts(cached);
        setError(`Background refresh failed: ${err.message}. Showing cached products.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchProducts(false);
    const interval = setInterval(() => fetchProducts(true), CACHE_TTL);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  useEffect(() => {
    try {
      localStorage.setItem('editbill_selected_products', JSON.stringify(selectedProducts));
    } catch (e) { /* ignore */ }
  }, [selectedProducts]);

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    const el = getQtyEl(pendingFocusIndex);
    if (el) {
      el.focus();
      el.select();
    }
    setPendingFocusIndex(null);
  }, [pendingFocusIndex, selectedProducts]);

  // Computed
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
  // Event Handlers
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

  // ------------------------------------------------------------
  // UPDATE BILL – single payload field (no more + signs)
  //
  // FIX: previously the hidden form had no `enctype`, so the browser
  // defaulted to `application/x-www-form-urlencoded`. In that encoding
  // every space becomes a literal "+" character. If the Apps Script
  // backend decodes the raw POST body itself (e.g. via
  // decodeURIComponent) instead of via e.parameter, the "+" is never
  // converted back into a space (only proper form-decoders do that),
  // so product names like "சக்தி மஞ்சள் தூள் 100கி" come back as
  // "சக்தி+மஞ்சள்+தூள்+100கி".
  //
  // Submitting as `multipart/form-data` instead avoids this whole
  // class of bug: multipart sends the raw UTF-8 bytes as-is, with no
  // "+"-for-space substitution, so no backend decoding step can get
  // it wrong.
  // ------------------------------------------------------------
  const handleUpdateBill = () => {
    if (selectedProducts.length === 0) {
      alert('Cannot save an empty bill.');
      return;
    }
    if (!customerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    setUpdating(true);

    // Build payload object (all data)
    const payload = {
      action: 'updateBill',
      quotationNo: quotationNo,
      customerName: customerName.trim(),
      products: selectedProducts,
      totalAmount: grandTotal,
      timestamp: Date.now(),
    };

    // Create or reuse a hidden iframe
    if (!iframeRef.current) {
      const iframe = document.createElement('iframe');
      iframe.name = 'updateBillIframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }

    const handleLoad = () => {
      iframeRef.current.removeEventListener('load', handleLoad);
      setUpdating(false);
      alert('Bill updated successfully!');
      navigate('/view-bills');
    };
    iframeRef.current.addEventListener('load', handleLoad);

    // Create form with a single 'payload' field
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = 'updateBillIframe';
    form.enctype = 'multipart/form-data'; // <-- FIX: avoids "+"-for-space encoding
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(payload);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      if (form.parentNode) form.parentNode.removeChild(form);
    }, 100);
  };

  // Print handler
  const handlePrint = () => {
    if (quotationNo) {
      navigate('/print', {
        state: {
          products: selectedProducts,
          quotationNo: quotationNo,
          timestamp: Date.now(),
          autoPrint: true,
        }
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
          onClick={() => navigate('/view-bills')}
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Back to Bills"
        >
          <FaArrowLeft className="text-gray-600 w-4 h-4" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Edit Bill</h1>

        {/* Customer Name Input */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="Enter customer name"
          />
        </div>

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
                      onClick={() => fetchProducts(true)}
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

          {/* RIGHT PANEL - Bill items */}
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
                    <div className="text-sm text-blue-600 font-medium">
                      Quotation: {quotationNo}
                    </div>
                  </div>

                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>

                  <button
                    onClick={handleUpdateBill}
                    disabled={updating}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      updating
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {updating ? 'Updating...' : 'Update Bill'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBill;