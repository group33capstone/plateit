import { Routes, Route, Link, useNavigate } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/homepage";
import FormPage from "./pages/createformpage";
import ViewAllPage from "./pages/viewallpage";
import DetailPage from "./pages/detailpage";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ViewUserRecipes from "./pages/ViewUserRecipes";
import ViewSavedRecipes from "./pages/ViewSavedRecipes";
import ViewMyComments from "./pages/ViewMyComments";
import { useUser } from "./hooks/useUser";

function App() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const user = useUser();

  const logout = async () => {
    try {
      const url = `${API_URL}/auth/logout`;
      const response = await fetch(url, { credentials: "include" });
      window.location.replace("/");
    } catch (error) {
      console.error("Network or fetch error during logout:", error);
      window.location.replace("/");
    }
  };

  return (
    <>
      <nav className="top-nav">
        <Link to="/">Home</Link>
        <Link to="/form">New</Link>
        <Link to="/list">All</Link>
        {user ? (
          <>
            <button
              onClick={() => {
                navigate(`/profile/${user.id}`);
              }}
            >
              My Profile
            </button>
            <button onClick={logout}>Logout</button>
          </>
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
          <Route path="/login" element={<Login />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/user/recipes/:id" element={<ViewUserRecipes />} />
          <Route path="/savedrecipes" element={<ViewSavedRecipes />} />
          <Route path="/mycomments" element={<ViewMyComments />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
