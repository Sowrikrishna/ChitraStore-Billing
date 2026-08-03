// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jsonpRequest } from '../utils/jsonp';

const PRODUCT_API = import.meta.env.VITE_PRODUCT_URL;
const BILL_API = import.meta.env.VITE_BILL_URL;

// Cache keys
const CACHE_KEY = 'appContextCache';
const QUOTATION_CACHE_KEY = 'appContextQuotationCache';
const QUOTATION_STORAGE_KEY = 'last_quotation_no';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // ---- Products & Bills ----
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const fetchingRef = useRef(false);

  // ---- Quotation ----
  const [quotationNo, setQuotationNo] = useState(null);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [quotationError, setQuotationError] = useState(null);

  // ---- Cache helpers ----
  const loadCache = (key) => {
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
  };

  const saveCache = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  };

  // ---- Fetch Products & Bills ----
  const fetchData = async (forceRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!forceRefresh) {
      const cached = loadCache(CACHE_KEY);
      if (cached) {
        setProducts(cached.products || []);
        setBills(cached.bills || []);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
        fetchingRef.current = false;
        setTimeout(() => fetchData(true), 100);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const [productsRes, billsRes] = await Promise.all([
        jsonpRequest(`${PRODUCT_API}?action=getProducts`),
        jsonpRequest(`${BILL_API}?action=getBills`),
      ]);

      if (!productsRes.success) throw new Error(productsRes.message || 'Failed to fetch products');
      if (!billsRes.success) throw new Error(billsRes.message || 'Failed to fetch bills');

      const productList = productsRes.data || [];
      const billList = billsRes.data || [];

      const data = { products: productList, bills: billList };
      setProducts(productList);
      setBills(billList);
      setLastUpdated(new Date().toLocaleTimeString());
      saveCache(CACHE_KEY, data);
      setError(null);
    } catch (err) {
      const cached = loadCache(CACHE_KEY);
      if (cached) {
        setProducts(cached.products || []);
        setBills(cached.bills || []);
        setError(`Background refresh failed: ${err.message}. Showing cached data.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // ---- Fetch Quotation ----
  const fetchQuotation = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = loadCache(QUOTATION_CACHE_KEY);
      if (cached) {
        setQuotationNo(cached);
        setQuotationError(null);
        setTimeout(() => fetchQuotation(true), 100);
        return;
      }
    }

    setQuotationLoading(true);
    setQuotationError(null);

    try {
      const data = await jsonpRequest(BILL_API);
      let newQuotation = data?.lastQuotation || null;
      if (!newQuotation) {
        const stored = localStorage.getItem(QUOTATION_STORAGE_KEY);
        newQuotation = stored || 'Q-0';
      }
      setQuotationNo(newQuotation);
      saveCache(QUOTATION_CACHE_KEY, newQuotation);
      localStorage.setItem(QUOTATION_STORAGE_KEY, newQuotation);
    } catch (err) {
      const stored = localStorage.getItem(QUOTATION_STORAGE_KEY);
      if (stored) {
        setQuotationNo(stored);
        saveCache(QUOTATION_CACHE_KEY, stored);
      } else {
        const defaultNo = 'Q-0';
        setQuotationNo(defaultNo);
        saveCache(QUOTATION_CACHE_KEY, defaultNo);
        localStorage.setItem(QUOTATION_STORAGE_KEY, defaultNo);
      }
      setQuotationError('Could not fetch latest quotation, using cached/default.');
    } finally {
      setQuotationLoading(false);
    }
  };

  // ---- Update Quotation (after bill saved) ----
  const updateQuotation = () => {
    if (!quotationNo) return;
    const match = quotationNo.match(/Q-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      const nextNum = num + 1;
      const nextQuotation = `Q-${nextNum}`;
      setQuotationNo(nextQuotation);
      saveCache(QUOTATION_CACHE_KEY, nextQuotation);
      localStorage.setItem(QUOTATION_STORAGE_KEY, nextQuotation);
    } else {
      const fallback = 'Q-1';
      setQuotationNo(fallback);
      saveCache(QUOTATION_CACHE_KEY, fallback);
      localStorage.setItem(QUOTATION_STORAGE_KEY, fallback);
    }
  };

  // ---- Initial fetch & auto-refresh ----
  useEffect(() => {
    fetchData(false);
    fetchQuotation(false);

    const interval = setInterval(() => {
      fetchData(true);
      fetchQuotation(true);
    }, CACHE_TTL);

    return () => clearInterval(interval);
  }, []);

  // ---- Manual refresh for all data ----
  const refreshData = () => {
    fetchData(true);
    fetchQuotation(true);
  };

  // ---- Helper: get product by ID ----
  const getProductById = (id) => {
    return products.find(p => p.product_id === id);
  };

  // ---- Context value ----
  const value = {
    products,
    bills,
    loading,
    error,
    lastUpdated,
    refreshData,
    getProductById,
    quotationNo,
    quotationLoading,
    quotationError,
    fetchQuotation,
    updateQuotation,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};