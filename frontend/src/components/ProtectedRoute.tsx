// Route guard: sends the user to the login page unless they have a valid token and, when required, an allowed role.
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

function hasAllowedRole(token: string, allowedRoles: string[]): boolean {
  try {
    return allowedRoles.includes(jwtDecode<DecodedToken>(token).role);
  } catch {
    return false;
  }
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !hasAllowedRole(token, allowedRoles)) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
