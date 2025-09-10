import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { LoginFormData } from '../../../types';
import { ErrorModal } from '../../error_modal/ErrorModal';
import { supabase } from '../../../db_client/client';
import { Link } from 'react-router-dom';

const LoginPagePeserta: React.FC = () => {
const [formData, setFormData] = useState<LoginFormData>({
email: '',
password: '',
});
const [isLoading, setIsLoading] = useState(false);
const [isModalOpen, setIsModalOpen] = useState(false);
const [errorType, setErrorType] = useState<
'email_not_registered' | 'email_not_verified' | 'wrong_password' | 'other'
>();
const [customMessage, setCustomMessage] = useState('');
const navigate = useNavigate();

useEffect(() => {
const checkSession = async () => {
const { data: { session }, error } = await supabase.auth.getSession();

if (session && !error) {
const { data: userProfile } = await supabase
.from('user_profile')
.select('role, email_verified_at')
.eq('email', session.user.email)
.single();

if (userProfile?.role === 'peserta' && userProfile.email_verified_at) {
navigate('/'); // Redirect to homepage instead of dashboard
}
}
};
checkSession();
}, [navigate]);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const { name, value } = e.target;
setFormData({ ...formData, [name]: value });
};

const handleForgotPassword = async (e: React.MouseEvent) => {
e.preventDefault();
if (!formData.email) {
setErrorType('other');
setCustomMessage('Silakan masukkan alamat email terlebih dahulu');
setIsModalOpen(true);
return;
}
setIsLoading(true);
try {
const { data: user } = await supabase.from('user_profile').select('email').eq('email', formData.email).single();
if (!user) {
setErrorType('email_not_registered');
setIsModalOpen(true);
return;
}
const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
redirectTo: `${window.location.origin}/peserta/forgot-password`,
});
if (error) throw error;
localStorage.setItem("email", formData.email);
navigate('/peserta/verifikasi-email-forgot-password');
} catch (error) {
console.error('Error:', error);
setErrorType('other');
setCustomMessage('Gagal mengirim email reset password');
setIsModalOpen(true);
} finally {
setIsLoading(false);
}
};

const handleLogin = async (e: React.FormEvent) => {
e.preventDefault();
setIsLoading(true);
setIsModalOpen(false);
try {
const { error: authError } = await supabase.auth.signInWithPassword({
email: formData.email,
password: formData.password,
});

if (authError) {
if (authError.message.includes('Invalid login credentials')) {
const { data: user } = await supabase.from('user_profile').select('email').eq('email', formData.email).single();
setErrorType(!user ? 'email_not_registered' : 'wrong_password');
} else {
setErrorType('other');
setCustomMessage(authError.message || 'Terjadi kesalahan saat login');
}
setIsModalOpen(true);
return;
}

const { data: userProfile, error: profileError } = await supabase.from('user_profile').select('id, email, name, role, email_verified_at').eq('email', formData.email).single();
if (profileError) throw profileError;
if (!userProfile) {
setErrorType('email_not_registered');
setIsModalOpen(true);
return;
}
if (!userProfile.email_verified_at) {
localStorage.setItem("email", formData.email);
setErrorType('email_not_verified');
setIsModalOpen(true);
return;
}
if (userProfile.role !== 'peserta' && userProfile.role !== 'admin') {
setErrorType('other');
setCustomMessage('Anda tidak memiliki akses peserta');
setIsModalOpen(true);
return;
}
navigate('/'); // Redirect to homepage instead of dashboard
} catch (err) {
console.error('Login error:', err);
setErrorType('other');
setCustomMessage(err instanceof Error ? err.message : 'Terjadi kesalahan koneksi');
setIsModalOpen(true);
} finally {
setIsLoading(false);
}
};

const handleResendVerification = async () => {
try {
setIsLoading(true);
localStorage.setItem("email", formData.email);
const { error } = await supabase.auth.resend({ email: formData.email, type: 'signup' });
if (error) throw new Error(error.message);
setIsModalOpen(false);
navigate('/peserta/verifikasi-email-registrasi');
} catch (error) {
console.error('Resend verification error:', error);
setCustomMessage(error instanceof Error ? error.message : 'Gagal mengirim ulang email verifikasi.');
} finally {
setIsLoading(false);
}
};

const handleBack = () => {
window.location.href = "/";
};

return (
<div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-t from-[#47618a] to-[#E3E1DA] text-white p-4">

<div className="absolute inset-0 z-0 hidden md:block">
<img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute bottom-[10%] left-[0%] w-[22%] opacity-100" />
<img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute bottom-[-10%] left-[-6%] w-[18%] opacity-100" />
<img src="/svg/blocks/block w m.svg" alt="Decoration" className="absolute bottom-[-5%] left-[15%] w-[14%] opacity-100" />
<img src="/svg/blocks/block w main.svg" alt="Decoration" className="absolute bottom-[-20%] left-[5%] w-[15%]" />

<img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute bottom-[10%] right-[0%] w-[22%] opacity-100" />
<img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute bottom-[-10%] right-[-6%] w-[18%] opacity-100" />
<img src="/svg/blocks/block b m.svg" alt="Decoration" className="absolute bottom-[-5%] right-[15%] w-[14%] opacity-100" />
<img src="/svg/blocks/block b main.svg" alt="Decoration" className="absolute bottom-[-20%] right-[5%] w-[15%]" />
</div>

<div className="relative z-10 max-w-md w-full space-y-6 p-8">
<Link to="/" className="flex justify-center items-center space-x-2 group z-10">
<img
src="/svg/chess logo.svg"
alt="UKM Chess Logo"
className="h-8 md:h-10 w-auto transition-transform duration-200 group-hover:scale-105"
/>
<span className="text-center text-3xl font-bold tracking-wider text-[#0f1028] uppercase">
UKM CHESS
</span>
</Link>

<form className="space-y-4" onSubmit={handleLogin}>
<div className="space-y-2">
<div className="relative">
<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
<Mail className="h-5 w-5 text-[#DADBD3]/60" />
</span>
<input
id="email"
name="email"
type="email"
autoComplete="email"
required
value={formData.email}
onChange={handleInputChange}
className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0c1015] text-[#DADBD3] placeholder-[#DADBD3]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all duration-300"
placeholder="Email Address"
/>
</div>

<div className="relative">
<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
<Lock className="h-5 w-5 text-[#DADBD3]/60" />
</span>
<input
id="password"
name="password"
type="password"
autoComplete="current-password"
required
value={formData.password}
onChange={handleInputChange}
className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0c1015] text-[#DADBD3] placeholder-[#DADBD3]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all duration-300"
placeholder="Password"
/>
</div>
</div>

<div className="flex items-center justify-end text-sm">
<a
href="#"
onClick={handleForgotPassword}
className="font-medium text-[#0f1028] hover:text-[#0f1028]/80 transition-colors"
>
Forgot Password
</a>
</div>

<div className="space-y-4">
<button
type="submit"
disabled={isLoading}
className="w-full flex justify-center items-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-[#ece7d8] bg-gradient-to-b from-[#0a0007] to-[#0f1028] focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2 focus:ring-offset-[#0c1015] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
{isLoading ? (
<>
<Loader2 size={20} className="animate-spin mr-2" />
<span>Processing...</span>
</>
) : (
'Log in'
)}
</button>

<button
type="button"
onClick={handleBack}
className="w-full flex items-center justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-[#DADBD3] bg-[#363E53]/20 hover:bg-[#363E53]/40 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2 focus:ring-offset-[#0c1015] transition-colors"
>
<div style={{
width: 0,
height: 0,
borderTop: '7px solid transparent',
borderRight: '14px solid #DADBD3',
borderBottom: '7px solid transparent',
marginRight: '8px',
}} />
BACK
</button>
</div>
</form>

<p className="text-center text-sm text-[#0a0007]/50">
Don't have an account?{' '}
<a href="/peserta/registrasi" className="font-medium text-[#0a0007] hover:text-[#0a0007]/80 transition-colors">
Register now
</a>
</p>
</div>

<ErrorModal
isOpen={isModalOpen}
onClose={() => setIsModalOpen(false)}
errorType={errorType}
onResendVerification={handleResendVerification}
customMessage={customMessage}
/>
</div>
);
};

export default LoginPagePeserta;