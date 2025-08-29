import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/admin/login_page/LoginPage'
import RegisterPage from './components/admin/register/RegisterPage';
import RegistrationSuccess from './components/admin/register/RegistrationSuccess';
import Dashboard from './components/admin/dashboard/Dashboard';
import EmailVerificationSuccess from './components/admin/register/EmailVerificationSuccess';
import { MeetingDetail } from './components/admin/dashboard/MeetingDetail';
import ForgotPassword from './components/admin/forgot_password/ForgotPassword';
import VerifyForgotPassword from './components/admin/forgot_password/VerifyForgotPassword';
import LoginPagePeserta from './components/peserta/login_page/LoginPage';
import RegisterPagePeserta from './components/peserta/register/RegisterPage';
import RegistrationSuccessPeserta from './components/peserta/register/RegistrationSuccess';
import EmailVerificationSuccessPeserta from './components/peserta/register/EmailVerificationSuccess';
import VerifyForgotPasswordPeserta from './components/peserta/forgot_password/VerifyForgotPassword';
import ForgotPasswordPeserta from './components/peserta/forgot_password/ForgotPassword';
import DashboardPeserta from './components/peserta/feature/Dashboard';
import HomePage from "./components/peserta/homepage/HomePage";
import ChessClock from './components/peserta/feature/ChessClock';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        
        {/* admin */}
        {/* <Route path="/" element={<Navigate to="/admin/login" />} /> */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path='/admin/registrasi' element={<RegisterPage />} />
        <Route path='/admin/verifikasi-email-registrasi' element={<RegistrationSuccess />} />
        <Route path='/admin/verifikasi-registrasi-sukses' element={<EmailVerificationSuccess />} />
        <Route path='/admin/dashboard' element={<Dashboard />} />
        <Route path="/admin/pertemuan/:id" element={<MeetingDetail />} />
        <Route path="/admin/verifikasi-email-forgot-password" element={<VerifyForgotPassword />}/>
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />

        {/* peserta */}
        {/* <Route path='/' element={< Navigate to="/peserta/login"/>} /> */}
        <Route path='/peserta/login' element={<LoginPagePeserta/>} />
        <Route path='/peserta/registrasi' element={<RegisterPagePeserta />} />
        <Route path='/peserta/verifikasi-email-registrasi' element={<RegistrationSuccessPeserta />} /> 
        <Route path='/peserta/verifikasi-registrasi-sukses' element={<EmailVerificationSuccessPeserta />} />
        <Route path='/peserta/verifikasi-email-forgot-password' element={<VerifyForgotPasswordPeserta />} />
        <Route path='/peserta/forgot-password' element={<ForgotPasswordPeserta />} />
        <Route path='/peserta/dashboard' element={<DashboardPeserta user={{
          name: 'test',
          email: 'test'
        }} />} />
        <Route path='/peserta/chess-clock' element={<ChessClock />} />
      </Routes>
    </Router>
  );
}

export default App;