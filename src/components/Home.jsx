// import React from 'react'
// import Navbar from './Navbar'
// import Dashboard from './Dashboard'
// import { Route, Routes } from 'react-router-dom'
// import Footer from './Footer'
// import NewBill from '../routes/NewBill'
// import AddProduct from '../routes/AddProduct'
// import DeleteProduct from '../routes/DeleteProduct'
// import EditProduct from '../routes/EditProduct'
// import PrintView from '../bills/PrintView'
// import ViewBills from '../bills/VeiwBills'
// import ViewProducts from '../routes/ViewProducts'
// const Home = () => {
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Navbar/>
//       <Routes>
//           <Route path="/dashboard" element={<Dashboard />} />
//           <Route path="/new-bill" element={<NewBill/>} />
          
//           <Route path="/add-product" element={<AddProduct />} />
//           <Route path="/delete-product" element={<DeleteProduct />} />
//           <Route path="/edit-product" element={<EditProduct />} />
//           <Route path="/view-bills" element={<ViewBills />} />
//           <Route path="/print" element={<PrintView />} />
//           <Route path='/view-products' element={<ViewProducts/>}/>

//         </Routes>
//         <Footer/>
//     </div>
//   )
// }

// export default Home


import React from 'react';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import { Route, Routes, Navigate } from 'react-router-dom';
import Footer from './Footer';
import NewBill from '../routes/NewBill';
import AddProduct from '../routes/AddProduct';
import DeleteProduct from '../routes/DeleteProduct';
import EditProduct from '../routes/EditProduct';
import PrintView from '../bills/PrintView';
import ViewBills from '../bills/VeiwBills';
import ViewProducts from '../routes/ViewProducts';

const Home = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onLogout={onLogout} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-bill" element={<NewBill />} />
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/delete-product" element={<DeleteProduct />} />
        <Route path="/edit-product" element={<EditProduct />} />
        <Route path="/view-bills" element={<ViewBills />} />
        <Route path="/print" element={<PrintView />} />
        <Route path="/view-products" element={<ViewProducts />} />
      </Routes>
      <Footer />
    </div>
  );
};

export default Home;