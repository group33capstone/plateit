import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import HomePage from "./pages/homepage";
import FormPage from "./pages/createformpage";
import ViewAllPage from "./pages/viewallpage";
import DetailPage from "./pages/detailpage";
import Login from "./pages/Login";
import { useEffect, useState } from "react";

function App() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [user, setUser] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const response = await fetch(`${API_URL}/auth/login/success`, {
        credentials: "include",
      });
      const json = await response.json();
      setUser(json.user);
    };

    getUser();
  }, []);

  const logout = async () => {
    const url = `${API_URL}/auth/logout`;
    const response = await fetch(url, { credentials: "include" });
    const json = await response.json();
    window.location.href = "/";
  };

  return (
    <>
      <nav className="top-nav">
        <Link to="/">Home</Link>
        <Link to="/form">New</Link>
        <Link to="/list">All</Link>
        {user ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <button
            onClick={() => {
              navigate("/login");
            }}
          >
            Login
          </button>
        )}
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/list" element={<ViewAllPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/login" element={<Login api_url={API_URL} />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
