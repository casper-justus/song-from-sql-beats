import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DynamicBackground } from "@/components/DynamicBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <DynamicBackground />
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-4">Oops! Page not found</p>
        <a href="/" className="text-yellow-400 hover:text-yellow-500 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
