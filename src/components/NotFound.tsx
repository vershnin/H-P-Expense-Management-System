// src/components/NotFound.tsx
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Oops! Page not found</p>
      <Button onClick={() => navigate('/')}>
        Return to Home
      </Button>
    </div>
  );
}
