// src/App.tsx
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/auth/LoginPage";
import Dashboard from "./pages/Dashboard";

// Define a User type — adjust as needed
type User = {
  name: string;
  email: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <NotFound />
            )
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Oops! Page not found</p>
      <a href="/" className="mt-4 text-blue-500 hover:underline">
        Return to Home
      </a>
    </div>
  );
}

export default App;
