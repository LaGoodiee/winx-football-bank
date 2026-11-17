import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Account from './pages/Account';
import Savings from './pages/Savings';
import Apply from './pages/Apply';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import { About, International, NotFound, Privacy, Services, Terms } from './pages/Info';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="account" element={<Account />} />
        <Route path="savings" element={<Savings />} />
        <Route path="loan" element={<Apply key="loan" kind="Loan" />} />
        <Route path="grant" element={<Apply key="grant" kind="Grant" />} />
        <Route path="international" element={<International />} />
        <Route path="contact" element={<Contact />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
