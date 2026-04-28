import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PrefRoute, PrefRouteDetails } from '../types/common';
import { PrefRouteContext } from '../hooks/usePrefRoutes';
import { DEST_TO_DIRECTION_MAP, DEST_TO_NAME_MAP } from '../utils/constants/routes';

function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

function mapCsvRecordToPrefRoute(record: Record<string, string>): PrefRoute {
  return {
    origin: record.Orig,
    route: record['Route String'],
    destination: record.Dest,
    hours1: record.Hours1 || undefined,
    hours2: record.Hours2 || undefined,
    hours3: record.Hours3 || undefined,
    type: record.Type as PrefRoute['type'],
    area: record.Area || undefined,
    altitude: record.Altitude || undefined,
    aircraft: record.Aircraft || undefined,
    flow: record.Direction || undefined,
    seq: Number.parseInt(record.Seq || '0', 10) || 0,
    a_artcc: record.ACNTR || '',
    d_artcc: record.DCNTR || '',
  };
}

export function PrefRoutesProvider({
  loadSilently,
  children,
}: {
  loadSilently: boolean;
  children: ReactNode;
}) {
  const { data, error, isLoading } = useQuery<PrefRoute[]>({
    queryKey: ['prefRoutes'],
    queryFn: async () => {
      const response = await fetch('/prefroutes.csv');
      const csvText = await response.text();
      return parseCsv(csvText).map(mapCsvRecordToPrefRoute);
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
