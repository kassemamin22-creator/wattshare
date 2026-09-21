import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

interface DecodedToken {
  id: string;
  role: string;
  exp: number;
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles) {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (!allowedRoles.includes(decoded.role)) {
        return <Navigate to="/login" />;
      }
    } catch {
      return <Navigate to="/login" />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
