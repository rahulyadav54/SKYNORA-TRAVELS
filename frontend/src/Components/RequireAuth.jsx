import React from "react";
import { Navigate } from "react-router-dom";
import { getValue } from "../Utils/LocalStorage";

export const RequireAuth = ({ children }) => {
  const token = getValue("userToken");
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};
