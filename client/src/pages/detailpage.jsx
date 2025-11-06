import React from "react";
import { useParams } from "react-router-dom";

export default function DetailPage() {
  const { id } = useParams();

  return (
    <div style={{ padding: 20 }}>
      <h2>Detail</h2>
      <p>Details for id: {id}</p>
    </div>
  );
}
