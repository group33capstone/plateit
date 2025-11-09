import React from "react";
import { FaGithub } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

function Login() {
  const API_URL = import.meta.env.VITE_API_URL;
  const AUTH_URL = `${API_URL}/auth/github`;
  const [searchParams] = useSearchParams();

  const status = searchParams.get("success");

  if (status === "failed") {
    alert("Something went wrong. Please try again.");
  }

  return (
    <div className="Login">
      <h1>PlateIT</h1>
      <center>
        <a href={AUTH_URL}>
          <button className="headerBtn">
            {" "}
            <FaGithub /> Login via Github{" "}
          </button>
        </a>
      </center>
    </div>
  );
}

export default Login;
