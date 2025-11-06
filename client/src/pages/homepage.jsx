import React from "react";

export default function HomePage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome to PlateIt</h2>
      <p>
        This CRUD app accepts text from a form. Model inference is handled by a
        server-side generative API.
      </p>
      <p>
        Use the "New" link to create a new recipe, or "All" to view saved
        recipes.
      </p>
    </div>
  );
}
