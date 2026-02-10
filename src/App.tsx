import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Admin/Login';
import SignUp from './pages/Admin/SignUp';
import Dashboard from './pages/Admin/Dashboard';
import Settings from './pages/Admin/Settings';
import Automation from './pages/Admin/Automation';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Login />} />
        <Route path="/admin/signup" element={<SignUp />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/automation" element={<Automation />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
