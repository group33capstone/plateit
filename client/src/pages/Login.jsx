import React from "react";
import { FaGithub } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

function Login(props) {
  const AUTH_URL = `${props.api_url}/auth/github`;
  const [searchParams] = useSearchParams();

  const status = searchParams.get("success");

  if (status === "failed") {
    alert("Login failed, please try again.");
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
