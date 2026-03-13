'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PublicMenuPage() {
  const params = useParams();
  const restaurantSlug = params.restaurantSlug as string;
  const rawMenuSlug = params.menuSlug as string;
  // Strip .html extension if present to avoid double .html.html
  const menuSlug = rawMenuSlug.endsWith('.html') ? rawMenuSlug.slice(0, -5) : rawMenuSlug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verify the menu file exists
    const checkMenu = async () => {
      if (!restaurantSlug || !menuSlug) {
        setError('Invalid menu link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/menus/${restaurantSlug}/${menuSlug}.html`, {
          method: 'HEAD', // Just check if file exists
          cache: 'no-cache',
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Menu file not found. Make sure the menu is published.`);
          }
          throw new Error(`Failed to load menu: ${response.status} ${response.statusText}`);
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error checking menu:', err);
        setError(err.message || 'Failed to load menu');
        setLoading(false);
      }
    };

    checkMenu();
  }, [restaurantSlug, menuSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Menu Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            This menu may not be published yet or the link is incorrect.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Expected path: /menus/{restaurantSlug}/{menuSlug}.html
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src={`/menus/${restaurantSlug}/${menuSlug}.html`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          margin: 0,
          padding: 0,
        }}
        title="Menu"
        onError={() => {
          setError('Failed to load menu in iframe');
          setLoading(false);
        }}
        onLoad={() => {
          setLoading(false);
        }}
      />
    </div>
  );
}

