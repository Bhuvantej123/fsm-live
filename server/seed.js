/**
 * seed.js — Run with: node seed.js
 * Populates engineers, customers and ~30 visits spread over the last 3 months.
 */
const db = require('./db');

console.log('🌱  Seeding database…');

// Clear existing data
db.exec(`
  DELETE FROM attachments;
  DELETE FROM visits;
  DELETE FROM customers;
  DELETE FROM engineers;
  DELETE FROM sqlite_sequence;
`);

// ── Engineers ─────────────────────────────────────────────────────────────────
const engineerData = [
  { name: 'Rajesh Kumar',  email: 'rajesh@fsm.com',  phone: '9876543210' },
  { name: 'Priya Sharma',  email: 'priya@fsm.com',   phone: '9876543211' },
  { name: 'Amit Patel',    email: 'amit@fsm.com',    phone: '9876543212' },
  { name: 'Neha Singh',    email: 'neha@fsm.com',    phone: '9876543213' },
];
const insEng = db.prepare('INSERT INTO engineers (name, email, phone) VALUES (?, ?, ?)');
engineerData.forEach(e => insEng.run(e.name, e.email, e.phone));

// ── Customers ─────────────────────────────────────────────────────────────────
const customerData = [
  { name: 'TechCorp Industries',    contact_person: 'Vikram Nair',   phone: '044-22345678', email: 'vikram@techcorp.in',    address: 'Andheri, Mumbai',          contract_type: 'amc' },
  { name: 'Global Pharma Ltd',      contact_person: 'Sunita Rao',    phone: '080-33456789', email: 'sunita@globalpharma.in', address: 'Whitefield, Bangalore',    contract_type: 'premium' },
  { name: 'Sunrise Hotels',         contact_person: 'Arjun Mehta',   phone: '011-44567890', email: 'arjun@sunrisehotels.in', address: 'Connaught Place, Delhi',   contract_type: 'standard' },
  { name: 'Green Energy Solutions', contact_person: 'Kavya Reddy',   phone: '040-55678901', email: 'kavya@greenenergy.in',   address: 'Gachibowli, Hyderabad',    contract_type: 'amc' },
  { name: 'AutoParts Manufacturing',contact_person: 'Suresh Iyer',   phone: '044-66789012', email: 'suresh@autoparts.in',    address: 'Sipcot, Chennai',          contract_type: 'standard' },
  { name: 'DataServe Analytics',    contact_person: 'Pooja Gupta',   phone: '022-77890123', email: 'pooja@dataserve.in',     address: 'BKC, Mumbai',              contract_type: 'premium' },
];
const insCust = db.prepare(
  'INSERT INTO customers (name, contact_person, phone, email, address, contract_type) VALUES (?, ?, ?, ?, ?, ?)'
);
customerData.forEach(c => insCust.run(c.name, c.contact_person, c.phone, c.email, c.address, c.contract_type));

// ── Visits ────────────────────────────────────────────────────────────────────
const problems = [
  'Air conditioning unit not cooling properly',
  'Electrical panel showing fault code F03',
  'Server room temperature alarm triggered',
  'Elevator maintenance due – cable inspection needed',
  'Water leak detected in machine room',
  'UPS battery backup failure during power outage',
  'Compressor noise above normal decibel levels',
  'Control panel touch screen unresponsive',
  'Hydraulic system pressure drop observed',
  'Generator startup failure – battery weak',
  'Fire suppression system sensor malfunction',
  'Network switch port failures causing downtime',
  'Chiller unit not reaching setpoint temperature',
  'Preventive maintenance visit – quarterly',
  'Routine inspection and filter replacement',
];
const actions = [
  'Cleaned and serviced the filters. Refilled refrigerant gas.',
  'Reset fault code. Replaced blown fuse in panel.',
  'Checked CRAC units. Adjusted setpoints and cleaned coils.',
  'Lubricated all moving parts. Inspected cable for wear.',
  'Identified and sealed the leak. Replaced worn gasket.',
  'Replaced UPS batteries. Tested backup duration – 45 mins.',
  'Inspected compressor mounts. Tightened loose bolts.',
  'Replaced touch screen panel. Recalibrated HMI.',
  'Topped up hydraulic fluid. Replaced seal kit.',
  'Replaced starter battery. Tested generator at full load.',
  'Replaced faulty smoke sensor module. Tested system.',
  'Replaced 3 failed SFP modules. Ran network diagnostics.',
  'Cleaned condenser coils. Recharged with R410A refrigerant.',
  'Completed quarterly PM checklist. All parameters normal.',
  'Replaced air filters, greased bearings, checked belts.',
];
const remarks = [
  'Customer satisfied. Next visit due in 3 months.',
  'Follow-up visit required to check after 1 week.',
  'Spare part ordered – will be installed on next visit.',
  'System operating within normal parameters.',
  'Customer informed about preventive maintenance schedule.',
  'Emergency call resolved within SLA. No further action needed.',
  'Part replaced under warranty. No charge to customer.',
  null, null, null,
];

const insVisit = db.prepare(
  'INSERT INTO visits (customer_id, engineer_id, visit_date, problem, actions_taken, remarks, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

let visitCount = 0;
const today = new Date();

for (let mo = 0; mo <= 2; mo++) {
  const base  = new Date(today.getFullYear(), today.getMonth() - mo, 1);
  const month = base.toISOString().slice(0, 7);
  const days  = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();

  const numVisits = 8 + Math.floor(Math.random() * 8);
  const statusPool = mo === 0
    ? ['open', 'open', 'pending', 'resolved', 'open']
    : mo === 1
    ? ['pending', 'resolved', 'resolved', 'closed', 'open']
    : ['resolved', 'resolved', 'closed', 'closed', 'pending'];

  for (let i = 0; i < numVisits; i++) {
    const day  = String(1 + Math.floor(Math.random() * (days - 1))).padStart(2, '0');
    const date = `${month}-${day}`;
    insVisit.run(
      1 + Math.floor(Math.random() * customerData.length),
      1 + Math.floor(Math.random() * engineerData.length),
      date,
      rand(problems),
      rand(actions),
      rand(remarks),
      rand(statusPool)
    );
    visitCount++;
  }
}

console.log(`✅  Seeded: ${engineerData.length} engineers, ${customerData.length} customers, ${visitCount} visits`);
