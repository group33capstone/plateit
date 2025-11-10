import { Routes, Route, Link, NavLink, useNavigate } from "react-router-dom";
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
      await fetch(url, { credentials: "include" });
      window.location.replace("/");
    } catch (error) {
      console.error("Network or fetch error during logout:", error);
      window.location.replace("/");
    }
  };

  return (
    <>
      {/* Bootstrap Navbar */}
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand" to="/">PlateIt</Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav me-auto mb-2 mb-md-0">
              <li className="nav-item">
                <NavLink className="nav-link" to="/" end>Home</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/form">New</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/list">All</NavLink>
              </li>
            </ul>

            <div className="d-flex gap-2">
              {user ? (
                <>
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() => navigate(`/profile/${user.id}`)}
                  >
                    My Profile
                  </button>
                  <button className="btn btn-warning btn-sm" onClick={logout}>
                    Logout
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate("/login")}
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content container (optional) */}
      <main className="container my-4">
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
