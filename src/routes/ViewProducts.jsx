import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaBoxes,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSearch,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';

// --------------------------------------------------------------
// JSONP helper – same as in NewBill.jsx
// --------------------------------------------------------------
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

// --------------------------------------------------------------
// Config – use your Apps Script deployment URL
// --------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_PRODUCT_URL; // e.g. https://script.google.com/macros/s/.../exec

const ITEMS_PER_PAGE = 25;

// --------------------------------------------------------------
// Component
// --------------------------------------------------------------
const ViewProducts = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}?action=getProducts`;
      const data = await jsonpRequest(url);
      if (data.success) {
        setProducts(data.data || []);
      } else {
        setError(data.message || 'Failed to load products.');
      }
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  // Delete product with confirmation
  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}" (ID: ${productId})?`)) {
      return;
    }

    try {
      const url = `${API_BASE_URL}?action=deleteProduct&id=${encodeURIComponent(productId)}`;
      const data = await jsonpRequest(url);
      if (data.success) {
        setToast({ type: 'success', message: data.message || 'Product deleted.' });
        fetchProducts(); // refresh list
      } else {
        setToast({ type: 'error', message: data.message || 'Delete failed.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Navigate to edit page, passing product data via state
  const handleEdit = (product) => {
    navigate('/edit-product', { state: { product } });
  };

  // ------------------------------------------------------------
  // Fast client-side search.
  // useMemo means this only recomputes when products or the
  // search term change — filtering a few thousand rows in JS is
  // sub-millisecond, so results update on every keystroke with
  // no debounce needed.
  // ------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const name = String(p.product_name || '').toLowerCase();
      const id = String(p.product_id || '').toLowerCase();
      return name.includes(term) || id.includes(term);
    });
  }, [products, searchTerm]);

  // Reset to page 1 whenever the search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  // Keep currentPage valid if filteredProducts shrinks (e.g. after delete)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const startIndex = filteredProducts.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length);

  const goToPage = (page) => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(clamped);
  };

  // Build a compact page-number list (with ellipses) for the pager
  const pageNumbers = useMemo(() => {
    const pages = [];
    const delta = 1; // pages to show on each side of current
    const range = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    let prev = null;
    for (const i of range) {
      if (prev !== null && i - prev > 1) pages.push('...');
      pages.push(i);
      prev = i;
    }
    return pages;
  }, [currentPage, totalPages]);

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
              aria-label="Back to Dashboard">
                <FaArrowLeft className="text-gray-600 w-4 h-4" />
            </button>
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
                Inventory
              </p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                View Products
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                All products currently in stock.
              </p>
            </div>
          </div>
          <div className="text-xs sm:text-sm bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-600 self-start sm:self-auto">
            {currentDate}
          </div>
        </header>

        {/* Summary card */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
              <FaBoxes className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {searchTerm ? 'Matching Products' : 'Total Products'}
              </p>
              <p className="text-xl font-bold text-gray-900">{filteredProducts.length}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/add-product')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto"
          >
            + Add New
          </button>
        </div>

        {/* Search bar */}
        <div className="mb-6 relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name or ID..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Loading / Error / Empty / Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className="animate-spin text-blue-500 w-8 h-8" />
            <span className="ml-3 text-gray-600">Loading products…</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-center gap-3">
            <FaExclamationTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={fetchProducts}
              className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm flex-shrink-0"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FaBoxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700">
              {searchTerm ? 'No matching products' : 'No products found'}
            </h3>
            <p className="text-gray-500 mt-1">
              {searchTerm ? 'Try a different search term.' : 'Start by adding your first product.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {paginatedProducts.map((product, index) => (
                <div
                  key={product.product_id || index}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-mono">
                        #{product.s_no || (currentPage - 1) * ITEMS_PER_PAGE + index + 1} · {product.product_id}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                        {product.product_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 rounded-full bg-amber-100 text-amber-600 active:bg-amber-200"
                        aria-label="Edit product"
                      >
                        <FaEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.product_id, product.product_name)}
                        className="p-2 rounded-full bg-rose-100 text-rose-600 active:bg-rose-200"
                        aria-label="Delete product"
                      >
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-500">Qty: <span className="text-gray-800 font-medium">{product.quantity}</span></span>
                    <span className="text-gray-500">Rate: <span className="text-gray-900 font-mono font-medium">₹{product.rate}</span></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.No
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product ID
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate (₹)
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedProducts.map((product, index) => (
                      <tr
                        key={product.product_id || index}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {product.s_no || (currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                          {product.product_id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {product.product_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {product.quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                          {product.rate}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                              aria-label="Edit product"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.product_id, product.product_name)}
                              className="p-1.5 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                              aria-label="Delete product"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
                Showing <span className="font-medium text-gray-700">{startIndex}</span>–
                <span className="font-medium text-gray-700">{endIndex}</span> of{' '}
                <span className="font-medium text-gray-700">{filteredProducts.length}</span>
              </p>

              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <FaChevronLeft className="w-3.5 h-3.5" />
                </button>

                {pageNumbers.map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`min-w-[2.25rem] px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        p === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <FaChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-lg z-50 flex items-center gap-2 max-w-[90vw]">
          {toast.type === 'success' ? (
            <FaCheckCircle className="text-emerald-400 w-4 h-4 flex-shrink-0" />
          ) : (
            <FaExclamationTriangle className="text-rose-400 w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default ViewProducts;