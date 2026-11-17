import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth, RequireStaff } from './auth/guards';
import Layout from './components/Layout';
import Home from './pages/Home';
import Account from './pages/Account';
import Savings from './pages/Savings';
import Apply from './pages/Apply';
import Contact from './pages/Contact';
import { About, International, NotFound, Privacy, Services, Terms } from './pages/Info';
import { Forgot, Login, Signup, Verify } from './pages/auth/AuthPages';
import DashLayout from './pages/dashboard/DashLayout';
import Overview from './pages/dashboard/Overview';
import OpenAccount from './pages/dashboard/OpenAccount';
import ApplicationEditor from './pages/dashboard/ApplicationEditor';
import { Applications, Notifications, Savings as SavingsGoals, Team } from './pages/dashboard/Lists';
import { AdminLayout, Messages, Queue, Review, RulesEditor, Users } from './pages/admin/Admin';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="account" element={<Account />} />
          <Route path="savings" element={<Savings />} />
          <Route path="loan" element={<Apply key="loan" kind="loan" />} />
          <Route path="grant" element={<Apply key="grant" kind="grant" />} />
          <Route path="international" element={<International />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />

          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="verify" element={<Verify />} />
          <Route path="forgot" element={<Forgot />} />

          <Route path="dashboard" element={<RequireAuth><DashLayout /></RequireAuth>}>
            <Route index element={<Overview />} />
            <Route path="open-account" element={<OpenAccount />} />
            <Route path="applications" element={<Applications />} />
            <Route path="applications/:id" element={<ApplicationEditor />} />
            <Route path="savings" element={<SavingsGoals />} />
            <Route path="team" element={<Team />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="admin" element={<RequireAuth><RequireStaff><AdminLayout /></RequireStaff></RequireAuth>}>
            <Route index element={<Queue />} />
            <Route path="applications/:id" element={<Review />} />
            <Route path="settings" element={<RulesEditor />} />
            <Route path="users" element={<Users />} />
            <Route path="messages" element={<Messages />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
