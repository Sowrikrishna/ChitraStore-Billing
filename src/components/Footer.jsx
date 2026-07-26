// components/Footer.jsx
import React from 'react';
import {
  FaStore,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaArrowRight,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 shadow-inner mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Column 1: Shop Info (with exact details) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-blue-600 bg-blue-50 p-2 rounded-full">
                <FaStore size={20} />
              </div>
              <h2 className="text-xl font-bold text-blue-800 tracking-wide">
                CHITRA STORE
              </h2>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <FaMapMarkerAlt className="text-red-400 mt-1 flex-shrink-0" />
                <span>
                  Kajah Kadai Lane, Palakkarai,<br />
                  Trichy - 620008
                </span>
              </p>
              <p className="flex items-center gap-2">
                <FaPhoneAlt className="text-emerald-500" />
                <span>+91 97866 41408</span>
              </p>
              <p className="flex items-center gap-2">
                <FaWhatsapp className="text-green-500" />
                <span>+91 80569 60135 (Orders)</span>
              </p>
              <p className="flex items-center gap-2">
                <FaEnvelope className="text-blue-500" />
                <span>sowrikrishnan2002@gmail.com</span>
              </p>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 group">
                  <FaArrowRight className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/new-bill" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 group">
                  <FaArrowRight className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform" />
                  New Bill
                </Link>
              </li>
              <li>
                <Link to="/view-bills" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 group">
                  <FaArrowRight className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform" />
                  View Bills
                </Link>
              </li>
              <li>
                <Link to="/add-product" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 group">
                  <FaArrowRight className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform" />
                  Add Product
                </Link>
              </li>
              <li>
                <Link to="/edit-product" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 group">
                  <FaArrowRight className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform" />
                  Edit Product
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Business Hours */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              Business Hours
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Mon - Sat:</span> 9:00 AM – 9:00 PM</p>
              <p><span className="font-medium">Sunday:</span> 10:00 AM – 6:00 PM</p>
              <p className="mt-3 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                <span className="font-semibold">📞 Support:</span> +91 97866 41408
              </p>
              <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <span className="font-semibold">💬 WhatsApp Orders:</span> +91 80569 60135
              </p>
            </div>
          </div>

          {/* Column 4: Social & Newsletter */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              Connect With Us
            </h3>
            <div className="flex gap-3 mb-4">
              <a href="#" className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md">
                <FaFacebook size={18} />
              </a>
              <a href="#" className="bg-sky-400 text-white p-2 rounded-full hover:bg-sky-500 transition-colors shadow-sm hover:shadow-md">
                <FaTwitter size={18} />
              </a>
              <a href="#" className="bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700 transition-colors shadow-sm hover:shadow-md">
                <FaInstagram size={18} />
              </a>
              <a href="#" className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-sm hover:shadow-md">
                <FaYoutube size={18} />
              </a>
            </div>
            <p className="text-xs text-gray-500">
              Subscribe to our newsletter for offers and updates.
            </p>
            <div className="mt-2 flex">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 text-sm border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button className="bg-blue-600 text-white px-4 py-2 rounded-r-lg text-sm hover:bg-blue-700 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright with "ChitraStore" */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
          <p>
            &copy; {currentYear} <span className="font-medium text-blue-700">ChitraStore</span> – All rights reserved.
          </p>
          <p className="mt-2 sm:mt-0">
            Designed for <span className="text-emerald-600 font-medium">Tamil Billing Software</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;