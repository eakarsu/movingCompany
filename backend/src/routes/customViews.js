const express = require('express');
const PDFDocument = require('pdfkit');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Mock data for the four custom views. The endpoints intentionally return
// self-contained data so the visualizations work even on a fresh database.
// ---------------------------------------------------------------------------

const ACTIVE_MOVES = [
  {
    id: 'MV-1042',
    customer: 'Alicia Hernandez',
    status: 'IN_TRANSIT',
    truck: 'TRK-07',
    distanceMiles: 142,
    origin: { label: '14 Beacon St, Boston, MA', lat: 42.3584, lng: -71.0598 },
    destination: { label: '88 Court St, Providence, RI', lat: 41.8240, lng: -71.4128 },
  },
  {
    id: 'MV-1043',
    customer: 'Brandon Lee',
    status: 'LOADING',
    truck: 'TRK-03',
    distanceMiles: 28,
    origin: { label: '500 Boylston St, Boston, MA', lat: 42.3499, lng: -71.0784 },
    destination: { label: '12 Elm St, Quincy, MA', lat: 42.2529, lng: -71.0023 },
  },
  {
    id: 'MV-1044',
    customer: 'Catherine Wu',
    status: 'SCHEDULED',
    truck: 'TRK-12',
    distanceMiles: 215,
    origin: { label: '1 Liberty Ave, Cambridge, MA', lat: 42.3736, lng: -71.1097 },
    destination: { label: '275 Main St, Hartford, CT', lat: 41.7658, lng: -72.6734 },
  },
  {
    id: 'MV-1045',
    customer: 'David Patel',
    status: 'COMPLETED',
    truck: 'TRK-05',
    distanceMiles: 64,
    origin: { label: '90 Tremont St, Boston, MA', lat: 42.3554, lng: -71.0640 },
    destination: { label: '210 Ocean Ave, Salem, MA', lat: 42.5195, lng: -70.8967 },
  },
  {
    id: 'MV-1046',
    customer: 'Erin O\'Connor',
    status: 'DELAYED',
    truck: 'TRK-09',
    distanceMiles: 175,
    origin: { label: '20 Park Plaza, Boston, MA', lat: 42.3514, lng: -71.0668 },
    destination: { label: '101 Bay St, Portland, ME', lat: 43.6591, lng: -70.2568 },
  },
];

const TRUCKS = [
  { id: 'TRK-03', plate: 'MA-3R8K1', capacityCuFt: 1200, usedCuFt: 480,  driver: 'James Carter' },
  { id: 'TRK-05', plate: 'MA-5L2M9', capacityCuFt: 1800, usedCuFt: 1620, driver: 'Maya Singh' },
  { id: 'TRK-07', plate: 'MA-7H6P4', capacityCuFt: 1500, usedCuFt: 1125, driver: 'Tom Reilly' },
  { id: 'TRK-09', plate: 'MA-9X1Z2', capacityCuFt: 2400, usedCuFt: 720,  driver: 'Priya Shah' },
  { id: 'TRK-12', plate: 'MA-2B4D7', capacityCuFt: 1000, usedCuFt: 950,  driver: 'Luis Romero' },
];

const CLIENTS = [
  {
    id: 'CL-2001',
    name: 'Alicia Hernandez',
    email: 'alicia.h@example.com',
    phone: '(617) 555-0142',
    moveId: 'MV-1042',
    moveDate: '2026-06-04',
    originAddress: '14 Beacon St, Boston, MA',
    destinationAddress: '88 Court St, Providence, RI',
    rooms: [
      { name: 'Living Room', items: 38, weightLbs: 1450 },
      { name: 'Master Bedroom', items: 22, weightLbs: 820 },
      { name: 'Kitchen', items: 64, weightLbs: 690 },
      { name: 'Office', items: 18, weightLbs: 540 },
    ],
    services: [
      { name: 'Full packing service', cost: 780 },
      { name: 'Furniture disassembly', cost: 240 },
      { name: 'Storage (7 days)', cost: 320 },
      { name: 'Insurance (Standard)', cost: 145 },
    ],
    baseCost: 1850,
  },
  {
    id: 'CL-2002',
    name: 'Brandon Lee',
    email: 'b.lee@example.com',
    phone: '(617) 555-0177',
    moveId: 'MV-1043',
    moveDate: '2026-05-28',
    originAddress: '500 Boylston St, Boston, MA',
    destinationAddress: '12 Elm St, Quincy, MA',
    rooms: [
      { name: 'Studio', items: 41, weightLbs: 1100 },
      { name: 'Kitchen', items: 27, weightLbs: 360 },
    ],
    services: [
      { name: 'Local moving (2 movers, 4 hrs)', cost: 520 },
      { name: 'Box supplies', cost: 95 },
    ],
    baseCost: 640,
  },
  {
    id: 'CL-2003',
    name: 'Catherine Wu',
    email: 'cwu@example.com',
    phone: '(617) 555-0218',
    moveId: 'MV-1044',
    moveDate: '2026-06-12',
    originAddress: '1 Liberty Ave, Cambridge, MA',
    destinationAddress: '275 Main St, Hartford, CT',
    rooms: [
      { name: 'Living Room', items: 52, weightLbs: 1820 },
      { name: 'Master Bedroom', items: 31, weightLbs: 980 },
      { name: 'Guest Bedroom', items: 19, weightLbs: 540 },
      { name: 'Dining Room', items: 24, weightLbs: 870 },
      { name: 'Kitchen', items: 78, weightLbs: 740 },
      { name: 'Garage', items: 46, weightLbs: 1450 },
    ],
    services: [
      { name: 'Long-distance transport (215 mi)', cost: 2480 },
      { name: 'Full packing service', cost: 1240 },
      { name: 'Specialty piano move', cost: 380 },
      { name: 'Insurance (Full value)', cost: 320 },
    ],
    baseCost: 3650,
  },
];

const HOUSE_SIZE_PRESETS = {
  STUDIO:     { rooms: ['Studio', 'Kitchen'], boxesPerRoom: 8,  tapeRolls: 2 },
  ONE_BR:     { rooms: ['Bedroom', 'Living Room', 'Kitchen', 'Bathroom'], boxesPerRoom: 9,  tapeRolls: 3 },
  TWO_BR:     { rooms: ['Master Bedroom', 'Second Bedroom', 'Living Room', 'Kitchen', 'Bathroom'], boxesPerRoom: 11, tapeRolls: 4 },
  THREE_BR:   { rooms: ['Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Living Room', 'Dining Room', 'Kitchen', 'Bathroom'], boxesPerRoom: 12, tapeRolls: 5 },
  FOUR_BR:    { rooms: ['Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Living Room', 'Dining Room', 'Kitchen', 'Office', 'Garage'], boxesPerRoom: 14, tapeRolls: 7 },
};

const DEFAULT_ROOM_ITEMS = {
  'Living Room':     ['TV', 'Sofa', 'Coffee table', 'Bookshelf', 'Lamps', 'Decor'],
  'Master Bedroom':  ['Mattress', 'Bed frame', 'Dresser', 'Nightstands', 'Clothing'],
  'Bedroom':         ['Mattress', 'Bed frame', 'Dresser', 'Clothing', 'Decor'],
  'Bedroom 2':       ['Mattress', 'Bed frame', 'Desk', 'Clothing'],
  'Bedroom 3':       ['Mattress', 'Bed frame', 'Toys', 'Clothing'],
  'Bedroom 4':       ['Mattress', 'Bed frame', 'Clothing'],
  'Second Bedroom':  ['Mattress', 'Bed frame', 'Desk', 'Clothing'],
  'Guest Bedroom':   ['Mattress', 'Bed frame', 'Linens'],
  'Kitchen':         ['Dishes', 'Cookware', 'Small appliances', 'Pantry items', 'Glassware'],
  'Dining Room':     ['Table', 'Chairs', 'China cabinet', 'Tableware'],
  'Bathroom':        ['Toiletries', 'Towels', 'Cleaning supplies'],
  'Office':          ['Desk', 'Chair', 'Monitors', 'Books', 'Files'],
  'Garage':          ['Tools', 'Bikes', 'Sports gear', 'Outdoor equipment'],
  'Studio':          ['Bed', 'Sofa', 'TV', 'Desk', 'Clothing'],
};

// ---------------------------------------------------------------------------
// VIZ 1: Route map data
// ---------------------------------------------------------------------------
router.get('/route-map', authenticate, (req, res) => {
  const moves = ACTIVE_MOVES.map((m) => ({
    ...m,
    polyline: [
      [m.origin.lat, m.origin.lng],
      [m.destination.lat, m.destination.lng],
    ],
  }));
  res.json({ moves, totalActive: moves.length });
});

// ---------------------------------------------------------------------------
// VIZ 2: Truck capacity gauges
// ---------------------------------------------------------------------------
router.get('/truck-capacity', authenticate, (req, res) => {
  const trucks = TRUCKS.map((t) => {
    const pct = Math.round((t.usedCuFt / t.capacityCuFt) * 100);
    let status = 'OK';
    if (pct >= 95) status = 'FULL';
    else if (pct >= 80) status = 'HIGH';
    else if (pct < 40) status = 'LOW';
    return { ...t, utilizationPct: pct, status };
  });
  res.json({ trucks });
});

// ---------------------------------------------------------------------------
// NON-VIZ 1: Estimate PDF
//   GET  /estimate-pdf/clients  -> picker list
//   POST /estimate-pdf          -> binary PDF
// ---------------------------------------------------------------------------
router.get('/estimate-pdf/clients', authenticate, (req, res) => {
  res.json({
    clients: CLIENTS.map((c) => ({
      id: c.id,
      name: c.name,
      moveId: c.moveId,
      moveDate: c.moveDate,
    })),
  });
});

router.post('/estimate-pdf', authenticate, (req, res) => {
  const { clientId } = req.body || {};
  const client = CLIENTS.find((c) => c.id === clientId) || CLIENTS[0];

  const totalWeight = client.rooms.reduce((s, r) => s + r.weightLbs, 0);
  const totalItems = client.rooms.reduce((s, r) => s + r.items, 0);
  const servicesTotal = client.services.reduce((s, x) => s + x.cost, 0);
  const subtotal = client.baseCost + servicesTotal;
  const tax = +(subtotal * 0.0625).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="estimate-${client.moveId}.pdf"`
  );
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor('#1e40af').text('MovingCo Estimate', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#475569')
    .text('Residential Moving Services');
  doc.moveDown(1);

  // Client block
  doc.fontSize(12).fillColor('#0f172a').text(`Client: ${client.name}`);
  doc.fontSize(10).fillColor('#334155')
    .text(`Email: ${client.email}`)
    .text(`Phone: ${client.phone}`)
    .text(`Move ID: ${client.moveId}`)
    .text(`Scheduled Date: ${client.moveDate}`)
    .text(`Origin: ${client.originAddress}`)
    .text(`Destination: ${client.destinationAddress}`);
  doc.moveDown();

  // Rooms table
  doc.fontSize(13).fillColor('#1e40af').text('Rooms & Weight Estimate');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#0f172a');
  client.rooms.forEach((r) => {
    doc.text(
      `  • ${r.name.padEnd(20)}  items: ${String(r.items).padStart(3)}   weight: ${r.weightLbs} lbs`
    );
  });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#1e293b')
    .text(`  Total items: ${totalItems}    Total weight: ${totalWeight} lbs`);
  doc.moveDown();

  // Services table
  doc.fontSize(13).fillColor('#1e40af').text('Services');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#0f172a');
  client.services.forEach((s) => {
    doc.text(`  • ${s.name.padEnd(38)}  $${s.cost.toFixed(2)}`);
  });
  doc.moveDown();

  // Totals
  doc.fontSize(13).fillColor('#1e40af').text('Total Cost');
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#0f172a')
    .text(`  Base transport / labor : $${client.baseCost.toFixed(2)}`)
    .text(`  Services subtotal      : $${servicesTotal.toFixed(2)}`)
    .text(`  Tax (6.25%)            : $${tax.toFixed(2)}`);
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor('#15803d').text(`  GRAND TOTAL: $${total.toFixed(2)}`);
  doc.moveDown(1.5);

  doc.fontSize(9).fillColor('#64748b').text(
    'This estimate is valid for 30 days. Final price may vary based on actual inventory, ' +
    'access conditions, and packing materials used. Thank you for choosing MovingCo.',
    { align: 'left' }
  );

  doc.end();
});

// ---------------------------------------------------------------------------
// NON-VIZ 2: Packing checklist wizard
//   GET  /packing-checklist/presets
//   POST /packing-checklist        -> { houseSize, rooms[], itemsByRoom{} }
// ---------------------------------------------------------------------------
router.get('/packing-checklist/presets', authenticate, (req, res) => {
  res.json({
    houseSizes: Object.entries(HOUSE_SIZE_PRESETS).map(([key, val]) => ({
      key,
      label: key.replace(/_/g, ' '),
      rooms: val.rooms,
      boxesPerRoom: val.boxesPerRoom,
      tapeRolls: val.tapeRolls,
    })),
    defaultItemsByRoom: DEFAULT_ROOM_ITEMS,
  });
});

router.post('/packing-checklist', authenticate, (req, res) => {
  const { houseSize = 'TWO_BR', rooms, itemsByRoom = {} } = req.body || {};
  const preset = HOUSE_SIZE_PRESETS[houseSize] || HOUSE_SIZE_PRESETS.TWO_BR;
  const effectiveRooms = Array.isArray(rooms) && rooms.length ? rooms : preset.rooms;

  const checklist = effectiveRooms.map((room) => {
    const baseItems = DEFAULT_ROOM_ITEMS[room] || ['Misc items'];
    const customItems = Array.isArray(itemsByRoom[room]) ? itemsByRoom[room] : [];
    const combined = Array.from(new Set([...baseItems, ...customItems]));
    return {
      room,
      items: combined,
      boxesNeeded: preset.boxesPerRoom,
      packingPaperLbs: Math.max(2, Math.round(combined.length * 0.5)),
    };
  });

  const totalBoxes = checklist.reduce((s, r) => s + r.boxesNeeded, 0);
  const totalTapeRolls = preset.tapeRolls + Math.max(0, Math.ceil((effectiveRooms.length - preset.rooms.length) / 2));
  const totalPaperLbs = checklist.reduce((s, r) => s + r.packingPaperLbs, 0);

  res.json({
    houseSize,
    checklist,
    summary: {
      totalBoxes,
      totalTapeRolls,
      bubbleWrapRolls: Math.max(2, Math.round(effectiveRooms.length * 1.5)),
      packingPaperLbs: totalPaperLbs,
      markers: Math.max(3, effectiveRooms.length),
    },
    printable: {
      title: 'MovingCo Packing Checklist',
      generatedAt: new Date().toISOString(),
    },
  });
});

module.exports = router;
