import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

// It returns the object with the key user's id
// {id: value}
export function useUser() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/login/success`, {
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const json = await response.json();

        if (json.user) {
          setUser(json.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      }
    };

    getUser();
  }, []);

  return user;
}
