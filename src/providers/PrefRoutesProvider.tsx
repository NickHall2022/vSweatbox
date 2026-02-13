import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PrefRoute, PrefRouteDetails } from '../types/common';
import { PrefRouteContext } from '../hooks/usePrefRoutes';
import { DEST_TO_DIRECTION_MAP, DEST_TO_NAME_MAP } from '../utils/constants/routes';

export function PrefRoutesProvider({
  loadSilently,
  children,
}: {
  loadSilently: boolean;
  children: ReactNode;
}) {
  const { data, error, isLoading } = useQuery<PrefRoute[]>({
    queryKey: ['todos'],
    queryFn: async () => {
      //https://www.aviationapi.com/
      const response = await fetch(
        'https://nxu5mmeinzsudmodet6oxkkjfq0yquip.lambda-url.us-east-2.on.aws/'
      );
      return await response.json();
    },
  });

  if (!loadSilently && (isLoading || !data)) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100vw',
          height: '100vh',
        }}
      >
        <div style={{ textAlign: 'center', width: '100vw' }}>
          <h1>Loading vSweatbox...</h1>
          <h3>This should only take a few seconds</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={{ textAlign: 'center' }}>Error loading prefroute database</div>;
  }

  const value: PrefRouteDetails = !data
    ? { tecRoutes: [], highRoutes: [] }
    : {
        tecRoutes: data.filter((route) => route.type === 'TEC'),
        highRoutes: data.filter((route) => route.type === 'H'),
      };

  const unknownDestinations = value.tecRoutes
    .concat(value.highRoutes)
    .filter((route) => {
      const destination = `K${route.destination}`;
      return !(destination in DEST_TO_DIRECTION_MAP) || !(destination in DEST_TO_NAME_MAP);
    })
    .map((route) => route.destination);

  if (unknownDestinations.length > 0) {
    console.debug('Unknown destinations:', unknownDestinations);
  }

  return <PrefRouteContext.Provider value={value}>{children}</PrefRouteContext.Provider>;
}
