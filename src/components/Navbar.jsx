import React, { useState, useEffect } from 'react';
import {
  FaStore,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaSignOutAlt,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onLogout }) => {
  const [now, setNow] = useState(new Date());
  const [signingOut, setSigningOut] = useState(false);

  // Update date & time every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Full time (with seconds) for larger screens
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Shorter time (no seconds) for small screens, saves space
  const timeStrShort = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // logout function
  const handleLogout = () => {
    setSigningOut(true);
    window.setTimeout(() => setSigningOut(false), 3000);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        {/* ---------- Brand ---------- */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <FaStore size={16} className="sm:hidden" />
            <FaStore size={19} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tracking-tight leading-tight truncate">
              Chitra Store
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 min-w-0">
              <FaMapMarkerAlt className="text-red-400 flex-shrink-0" size={10} />
              <span className="truncate">
                Kajah Kadai Lane, Palakarai, Trichy - 620008
              </span>
            </div>
          </div>
        </div>

        {/* ---------- Date/time + logout ---------- */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 border border-gray-200 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
              <FaCalendarAlt className="text-blue-500 flex-shrink-0" size={12} />
              <span className="text-[11px] sm:text-sm font-medium whitespace-nowrap truncate">
                {dateStr}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300 flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-gray-600">
              <FaClock className="text-blue-500 flex-shrink-0" size={12} />
              {/* Show short time on mobile, full time (with seconds) from sm up */}
              <span className="text-[11px] sm:text-sm font-mono font-semibold whitespace-nowrap sm:hidden">
                {timeStrShort}
              </span>
              <span className="hidden sm:inline text-sm font-mono font-semibold whitespace-nowrap">
                {timeStr}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            aria-label="Logout"
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-sm transition-all duration-150 flex-shrink-0"
          >
            <FaSignOutAlt size={15} />
            <span className="hidden sm:inline">
              {signingOut ? 'Signing out…' : 'Logout'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;