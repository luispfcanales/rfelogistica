// Central definition of TSB internal locations and commercial points

export const COMMERCIAL_POINTS = [
  { value: 'ALL', label: '★ CONSOLIDADO GENERAL (Todas las Ubicaciones)' },
  { value: 'APA', label: 'Punto Comercial APA (Bar + Boutique)' },
  { value: 'ARA', label: 'Punto Comercial ARA (Bar + Boutique)' },
  { value: 'TRC', label: 'Punto Comercial TRC (Bar + Boutique)' },
  { value: 'PEM', label: 'Punto Comercial PEM (Cafetín + Almacén Compartido)' }
];

export const INTERNAL_LOCATIONS = [
  { value: 'APA/BAR', label: 'APA / BAR' },
  { value: 'APA/BOUTIQUE', label: 'APA / BOUTIQUE' },
  { value: 'ARA/BAR', label: 'ARA / BAR' },
  { value: 'ARA/BOUTIQUE', label: 'ARA / BOUTIQUE' },
  { value: 'TRC/BAR', label: 'TRC / BAR' },
  { value: 'TRC/BOUTIQUE', label: 'TRC / BOUTIQUE' },
  { value: 'PEM/CAFETIN PEM', label: 'PEM / CAFETIN PEM' },
  { value: 'PEM/ALMACEN COMPARTIDO', label: 'PEM / ALMACEN COMPARTIDO' },
  { value: 'PEM/ALMACEN COMPARTIDO/Entrada', label: 'PEM / ALMACEN COMPARTIDO (Entrada)' }
];

export const LOCATION_GROUPS = [
  {
    group: 'Consolidado General',
    options: [{ value: 'ALL', label: '★ CONSOLIDADO GENERAL (Empresa completa)' }]
  },
  {
    group: 'Puntos Comerciales',
    options: [
      { value: 'APA', label: 'Posada Amazonas (APA)' },
      { value: 'ARA', label: 'Refugio Amazonas (ARA)' },
      { value: 'TRC', label: 'Tambopata Research Center (TRC)' },
      { value: 'PEM', label: 'Puerto Maldonado / Central (PEM)' }
    ]
  },
  {
    group: 'Ubicaciones Internas Físicas (9)',
    options: INTERNAL_LOCATIONS
  }
];

export function getLocationLabel(loc) {
  if (!loc || loc === 'ALL' || loc === 'CONSOLIDADO') return 'CONSOLIDADO GENERAL';
  for (const g of LOCATION_GROUPS) {
    const found = g.options.find(o => o.value === loc);
    if (found) return found.label;
  }
  return loc;
}
