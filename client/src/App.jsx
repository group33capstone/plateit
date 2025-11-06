import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/homepage";
import FormPage from "./pages/createformpage";
import ViewAllPage from "./pages/viewallpage";
import DetailPage from "./pages/detailpage";

function App() {
  return (
    <BrowserRouter>
      <nav className="top-nav">
        <Link to="/">Home</Link>
        <Link to="/form">New</Link>
        <Link to="/list">All</Link>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/list" element={<ViewAllPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
