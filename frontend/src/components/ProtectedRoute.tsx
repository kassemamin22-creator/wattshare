import { ReactNode } from "react";
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
    return <Navigate to="/" />;
  }

  if (allowedRoles) {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (!allowedRoles.includes(decoded.role)) {
        return <Navigate to="/" />;
      }
    } catch {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
