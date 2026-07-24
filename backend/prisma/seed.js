const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function main() {
  console.log('Seeding database with comprehensive data...');

  const hashedPassword = await bcrypt.hash(requireDemoPassword(), 10);

  // ==================== USERS (15+) ====================
  console.log('Creating users...');
  const users = [];
  const userDataList = [
    { email: 'admin@movingcompany.com', firstName: 'Admin', lastName: 'User', phone: '555-000-0001', role: 'ADMIN' },
    { email: 'manager@movingcompany.com', firstName: 'John', lastName: 'Manager', phone: '555-000-0002', role: 'MANAGER' },
    { email: 'staff@movingcompany.com', firstName: 'Jane', lastName: 'Staff', phone: '555-000-0003', role: 'STAFF' },
    { email: 'sarah.ops@movingcompany.com', firstName: 'Sarah', lastName: 'Operations', phone: '555-000-0004', role: 'MANAGER' },
    { email: 'mike.driver@movingcompany.com', firstName: 'Mike', lastName: 'Thompson', phone: '555-000-0005', role: 'DRIVER' },
    { email: 'david.lead@movingcompany.com', firstName: 'David', lastName: 'Johnson', phone: '555-000-0006', role: 'CREW_LEAD' },
    { email: 'emily.staff@movingcompany.com', firstName: 'Emily', lastName: 'Williams', phone: '555-000-0007', role: 'STAFF' },
    { email: 'robert.driver@movingcompany.com', firstName: 'Robert', lastName: 'Brown', phone: '555-000-0008', role: 'DRIVER' },
    { email: 'jessica.manager@movingcompany.com', firstName: 'Jessica', lastName: 'Davis', phone: '555-000-0009', role: 'MANAGER' },
    { email: 'chris.lead@movingcompany.com', firstName: 'Chris', lastName: 'Miller', phone: '555-000-0010', role: 'CREW_LEAD' },
    { email: 'ashley.staff@movingcompany.com', firstName: 'Ashley', lastName: 'Wilson', phone: '555-000-0011', role: 'STAFF' },
    { email: 'kevin.driver@movingcompany.com', firstName: 'Kevin', lastName: 'Moore', phone: '555-000-0012', role: 'DRIVER' },
    { email: 'amanda.staff@movingcompany.com', firstName: 'Amanda', lastName: 'Taylor', phone: '555-000-0013', role: 'STAFF' },
    { email: 'brian.lead@movingcompany.com', firstName: 'Brian', lastName: 'Anderson', phone: '555-000-0014', role: 'CREW_LEAD' },
    { email: 'nicole.staff@movingcompany.com', firstName: 'Nicole', lastName: 'Thomas', phone: '555-000-0015', role: 'STAFF' },
    { email: 'steven.driver@movingcompany.com', firstName: 'Steven', lastName: 'Jackson', phone: '555-000-0016', role: 'DRIVER' },
  ];

  for (const userData of userDataList) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: { ...userData, password: hashedPassword },
    });
    users.push(user);
  }
  console.log(`Created ${users.length} users`);

  // ==================== COMPANY SETTINGS ====================
  const settings = await prisma.companySettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      companyName: 'ABC Moving Company',
      address: '123 Main Street',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
      phone: '555-MOVE-123',
      email: 'info@abcmoving.com',
      website: 'www.abcmoving.com',
      laborRate: 50,
      travelRate: 35,
      packingRate: 40,
      minHours: 2,
      taxRate: 8.25,
    },
  });
  console.log('Created company settings');

  // ==================== CREW MEMBERS (15+) ====================
  console.log('Creating crew members...');
  const crewData = [
    { firstName: 'Mike', lastName: 'Driver', email: 'mike@crew.com', phone: '555-100-0001', role: 'DRIVER', hourlyRate: 25, licenseType: 'CDL', skills: ['driving', 'loading', 'furniture'] },
    { firstName: 'Tom', lastName: 'Lead', email: 'tom@crew.com', phone: '555-100-0002', role: 'CREW_LEAD', hourlyRate: 22, skills: ['leadership', 'packing', 'furniture', 'fragile'] },
    { firstName: 'Bob', lastName: 'Mover', email: 'bob@crew.com', phone: '555-100-0003', role: 'MOVER', hourlyRate: 18, skills: ['loading', 'furniture', 'heavy-lifting'] },
    { firstName: 'Sam', lastName: 'Mover', email: 'sam@crew.com', phone: '555-100-0004', role: 'MOVER', hourlyRate: 18, skills: ['loading', 'packing', 'boxes'] },
    { firstName: 'Lisa', lastName: 'Packer', email: 'lisa@crew.com', phone: '555-100-0005', role: 'PACKER', hourlyRate: 16, skills: ['packing', 'fragile', 'organizing'] },
    { firstName: 'James', lastName: 'Wilson', email: 'james@crew.com', phone: '555-100-0006', role: 'DRIVER', hourlyRate: 26, licenseType: 'CDL', skills: ['driving', 'heavy-lifting', 'appliances'] },
    { firstName: 'Carlos', lastName: 'Rodriguez', email: 'carlos@crew.com', phone: '555-100-0007', role: 'MOVER', hourlyRate: 19, skills: ['furniture', 'stairs', 'heavy-lifting'] },
    { firstName: 'Marcus', lastName: 'Johnson', email: 'marcus@crew.com', phone: '555-100-0008', role: 'CREW_LEAD', hourlyRate: 23, skills: ['leadership', 'piano', 'antiques'] },
    { firstName: 'Derek', lastName: 'Williams', email: 'derek@crew.com', phone: '555-100-0009', role: 'MOVER', hourlyRate: 18, skills: ['loading', 'boxes', 'furniture'] },
    { firstName: 'Antonio', lastName: 'Garcia', email: 'antonio@crew.com', phone: '555-100-0010', role: 'DRIVER', hourlyRate: 24, licenseType: 'CDL', skills: ['driving', 'navigation', 'loading'] },
    { firstName: 'Tyler', lastName: 'Brown', email: 'tyler@crew.com', phone: '555-100-0011', role: 'PACKER', hourlyRate: 17, skills: ['packing', 'boxes', 'labeling'] },
    { firstName: 'Ryan', lastName: 'Davis', email: 'ryan@crew.com', phone: '555-100-0012', role: 'MOVER', hourlyRate: 18, skills: ['heavy-lifting', 'appliances', 'gym-equipment'] },
    { firstName: 'Jennifer', lastName: 'Martinez', email: 'jennifer@crew.com', phone: '555-100-0013', role: 'PACKER', hourlyRate: 17, skills: ['packing', 'fragile', 'artwork'] },
    { firstName: 'Chris', lastName: 'Lee', email: 'chris@crew.com', phone: '555-100-0014', role: 'CREW_LEAD', hourlyRate: 22, skills: ['leadership', 'commercial', 'logistics'] },
    { firstName: 'Alex', lastName: 'Taylor', email: 'alex@crew.com', phone: '555-100-0015', role: 'MOVER', hourlyRate: 19, skills: ['loading', 'furniture', 'fragile'] },
    { firstName: 'Daniel', lastName: 'White', email: 'daniel@crew.com', phone: '555-100-0016', role: 'DRIVER', hourlyRate: 25, licenseType: 'CDL', skills: ['driving', 'long-distance', 'loading'] },
  ];

  const crewMembers = [];
  for (const crew of crewData) {
    const member = await prisma.crewMember.create({ data: crew });
    crewMembers.push(member);
  }
  console.log(`Created ${crewMembers.length} crew members`);

  // ==================== TRUCKS (15+) ====================
  console.log('Creating trucks...');
  const truckData = [
    { name: 'Truck 1', licensePlate: 'ABC-1234', vin: '1HGBH41JXMN109186', type: 'BOX_TRUCK_26', capacity: 1700, maxWeight: 10000, year: 2020, make: 'Ford', model: 'F-650', currentMileage: 45000 },
    { name: 'Truck 2', licensePlate: 'XYZ-5678', vin: '2HGBH41JXMN109187', type: 'BOX_TRUCK_20', capacity: 1200, maxWeight: 8000, year: 2021, make: 'Ford', model: 'F-550', currentMileage: 32000 },
    { name: 'Van 1', licensePlate: 'VAN-9999', vin: '3HGBH41JXMN109188', type: 'CARGO_VAN', capacity: 400, maxWeight: 3000, year: 2022, make: 'Mercedes', model: 'Sprinter', currentMileage: 18000 },
    { name: 'Truck 3', licensePlate: 'TRK-3001', vin: '4HGBH41JXMN109189', type: 'BOX_TRUCK_26', capacity: 1700, maxWeight: 10000, year: 2019, make: 'Ford', model: 'F-650', currentMileage: 67000 },
    { name: 'Truck 4', licensePlate: 'TRK-4001', vin: '5HGBH41JXMN109190', type: 'BOX_TRUCK_16', capacity: 850, maxWeight: 6000, year: 2021, make: 'Isuzu', model: 'NPR', currentMileage: 28000 },
    { name: 'Van 2', licensePlate: 'VAN-2001', vin: '6HGBH41JXMN109191', type: 'CARGO_VAN', capacity: 450, maxWeight: 3500, year: 2023, make: 'Ram', model: 'ProMaster', currentMileage: 8500 },
    { name: 'Truck 5', licensePlate: 'TRK-5001', vin: '7HGBH41JXMN109192', type: 'BOX_TRUCK_20', capacity: 1200, maxWeight: 8000, year: 2020, make: 'Hino', model: '195', currentMileage: 42000 },
    { name: 'Semi 1', licensePlate: 'SEM-1001', vin: '8HGBH41JXMN109193', type: 'SEMI', capacity: 3000, maxWeight: 30000, year: 2018, make: 'Freightliner', model: 'Cascadia', currentMileage: 125000 },
    { name: 'Truck 6', licensePlate: 'TRK-6001', vin: '9HGBH41JXMN109194', type: 'BOX_TRUCK_12', capacity: 600, maxWeight: 4500, year: 2022, make: 'Isuzu', model: 'NQR', currentMileage: 15000 },
    { name: 'Van 3', licensePlate: 'VAN-3001', vin: '10HGBH41JXMN10919', type: 'CARGO_VAN', capacity: 350, maxWeight: 2800, year: 2021, make: 'Ford', model: 'Transit', currentMileage: 22000 },
    { name: 'Truck 7', licensePlate: 'TRK-7001', vin: '11HGBH41JXMN10919', type: 'BOX_TRUCK_26', capacity: 1700, maxWeight: 10000, year: 2021, make: 'Ford', model: 'F-650', currentMileage: 38000 },
    { name: 'Pickup 1', licensePlate: 'PKP-1001', vin: '12HGBH41JXMN10919', type: 'PICKUP', capacity: 200, maxWeight: 2000, year: 2022, make: 'Ford', model: 'F-150', currentMileage: 12000 },
    { name: 'Truck 8', licensePlate: 'TRK-8001', vin: '13HGBH41JXMN10919', type: 'BOX_TRUCK_16', capacity: 850, maxWeight: 6000, year: 2020, make: 'International', model: 'CV', currentMileage: 55000 },
    { name: 'Van 4', licensePlate: 'VAN-4001', vin: '14HGBH41JXMN10919', type: 'CARGO_VAN', capacity: 400, maxWeight: 3000, year: 2023, make: 'Mercedes', model: 'Sprinter', currentMileage: 5000 },
    { name: 'Truck 9', licensePlate: 'TRK-9001', vin: '15HGBH41JXMN10919', type: 'BOX_TRUCK_20', capacity: 1200, maxWeight: 8000, year: 2022, make: 'Ford', model: 'F-550', currentMileage: 19000 },
    { name: 'Semi 2', licensePlate: 'SEM-2001', vin: '16HGBH41JXMN10919', type: 'SEMI', capacity: 3000, maxWeight: 30000, year: 2020, make: 'Peterbilt', model: '579', currentMileage: 98000 },
  ];

  const trucks = [];
  for (const truck of truckData) {
    const t = await prisma.truck.create({ data: truck });
    trucks.push(t);
  }
  console.log(`Created ${trucks.length} trucks`);

  // ==================== EQUIPMENT (15+) ====================
  console.log('Creating equipment...');
  const equipmentData = [
    { name: 'Standard Dolly', type: 'DOLLY', quantity: 20, available: 18 },
    { name: 'Appliance Dolly', type: 'APPLIANCE_DOLLY', quantity: 8, available: 7 },
    { name: 'Hand Truck', type: 'HAND_TRUCK', quantity: 15, available: 14 },
    { name: 'Furniture Pads', type: 'FURNITURE_PAD', quantity: 100, available: 85 },
    { name: 'Ratchet Straps', type: 'STRAP', quantity: 40, available: 38 },
    { name: 'Tool Kit', type: 'TOOL_KIT', quantity: 10, available: 9 },
    { name: 'Piano Board', type: 'PIANO_BOARD', quantity: 4, available: 4 },
    { name: 'Stair Climber', type: 'STAIR_CLIMBER', quantity: 6, available: 5 },
    { name: 'Lift Gate Attachment', type: 'LIFT_GATE', quantity: 3, available: 3 },
    { name: 'Large Wooden Crate', type: 'CRATE', quantity: 12, available: 10 },
    { name: 'Medium Wooden Crate', type: 'CRATE', quantity: 20, available: 18 },
    { name: 'Small Wooden Crate', type: 'CRATE', quantity: 30, available: 28 },
    { name: 'Heavy Duty Dolly', type: 'DOLLY', quantity: 10, available: 9 },
    { name: 'Extra Furniture Pads', type: 'FURNITURE_PAD', quantity: 50, available: 45 },
    { name: 'Cam Straps', type: 'STRAP', quantity: 30, available: 28 },
    { name: 'Extra Tool Kit', type: 'TOOL_KIT', quantity: 5, available: 5 },
  ];

  const equipment = [];
  for (const eq of equipmentData) {
    const e = await prisma.equipment.create({ data: eq });
    equipment.push(e);
  }
  console.log(`Created ${equipment.length} equipment items`);

  // ==================== STORAGE UNITS (15+) ====================
  console.log('Creating storage units...');
  const storageData = [
    { unitNumber: 'A-101', size: '5x5', capacity: 200, monthlyRate: 75 },
    { unitNumber: 'A-102', size: '5x10', capacity: 400, monthlyRate: 125 },
    { unitNumber: 'A-103', size: '10x10', capacity: 800, monthlyRate: 175 },
    { unitNumber: 'A-104', size: '5x5', capacity: 200, monthlyRate: 75 },
    { unitNumber: 'A-105', size: '5x10', capacity: 400, monthlyRate: 125 },
    { unitNumber: 'B-101', size: '10x15', capacity: 1200, monthlyRate: 225, climate: true },
    { unitNumber: 'B-102', size: '10x20', capacity: 1600, monthlyRate: 275, climate: true },
    { unitNumber: 'B-103', size: '10x10', capacity: 800, monthlyRate: 195, climate: true },
    { unitNumber: 'B-104', size: '10x15', capacity: 1200, monthlyRate: 225, climate: true },
    { unitNumber: 'B-105', size: '10x20', capacity: 1600, monthlyRate: 275, climate: true },
    { unitNumber: 'C-101', size: '15x20', capacity: 2400, monthlyRate: 350 },
    { unitNumber: 'C-102', size: '15x20', capacity: 2400, monthlyRate: 350 },
    { unitNumber: 'C-103', size: '20x20', capacity: 3200, monthlyRate: 425 },
    { unitNumber: 'D-101', size: '20x25', capacity: 4000, monthlyRate: 525, climate: true },
    { unitNumber: 'D-102', size: '20x30', capacity: 4800, monthlyRate: 625, climate: true },
    { unitNumber: 'D-103', size: '25x30', capacity: 6000, monthlyRate: 750, climate: true },
  ];

  const storageUnits = [];
  for (const storage of storageData) {
    const s = await prisma.storageUnit.create({ data: storage });
    storageUnits.push(s);
  }
  console.log(`Created ${storageUnits.length} storage units`);

  // ==================== COMMUNICATION TEMPLATES (15+) ====================
  console.log('Creating communication templates...');
  const templateData = [
    { name: 'Booking Confirmation', type: 'EMAIL', trigger: 'BOOKING_CONFIRMATION', subject: 'Your Move is Confirmed!', content: 'Dear {{customerName}},\n\nYour move has been confirmed for {{moveDate}}.\n\nThank you for choosing ABC Moving Company!' },
    { name: '7-Day Reminder', type: 'EMAIL', trigger: 'PRE_MOVE_REMINDER_7DAY', subject: 'Your Move is in 7 Days!', content: 'Dear {{customerName}},\n\nYour move is just 7 days away! Here\'s what you need to know...' },
    { name: '1-Day Reminder', type: 'SMS', trigger: 'PRE_MOVE_REMINDER_1DAY', content: 'Hi {{customerName}}! Your move is tomorrow. Our team will arrive at {{startTime}}. See you soon!' },
    { name: 'Post-Move Follow-up', type: 'EMAIL', trigger: 'POST_MOVE_FOLLOWUP', subject: 'How was your move?', content: 'Dear {{customerName}},\n\nWe hope you\'re settling in! Please let us know how we did.' },
    { name: 'Review Request', type: 'EMAIL', trigger: 'REVIEW_REQUEST', subject: 'Share Your Experience!', content: 'Dear {{customerName}},\n\nThank you for choosing us! We\'d love to hear about your experience.' },
    { name: 'Job Started SMS', type: 'SMS', trigger: 'JOB_STARTED', content: 'Hi {{customerName}}! Our crew has arrived and your move is underway. Questions? Call us at 555-MOVE-123.' },
    { name: 'Job Completed SMS', type: 'SMS', trigger: 'JOB_COMPLETED', content: 'Your move is complete! Thank you for choosing ABC Moving. Please check for any concerns within 24 hours.' },
    { name: 'Day Of Update', type: 'SMS', trigger: 'DAY_OF_UPDATE', content: 'Good morning {{customerName}}! Our crew is on the way and will arrive in approximately {{eta}} minutes.' },
    { name: 'Quote Follow-up', type: 'EMAIL', trigger: null, subject: 'Your Moving Quote', content: 'Dear {{customerName}},\n\nThank you for your interest! Here\'s your personalized moving quote...' },
    { name: 'Payment Reminder', type: 'EMAIL', trigger: null, subject: 'Payment Reminder', content: 'Dear {{customerName}},\n\nThis is a reminder that your invoice is due soon...' },
    { name: 'New Lead Response', type: 'EMAIL', trigger: null, subject: 'Thank You for Your Inquiry!', content: 'Dear {{customerName}},\n\nThank you for reaching out! A member of our team will contact you shortly.' },
    { name: 'Survey Confirmation', type: 'EMAIL', trigger: null, subject: 'Survey Scheduled!', content: 'Dear {{customerName}},\n\nYour survey has been scheduled for {{surveyDate}}. Our estimator will call you...' },
    { name: 'Survey Reminder', type: 'SMS', trigger: null, content: 'Reminder: Your moving survey is scheduled for today at {{surveyTime}}. See you soon!' },
    { name: 'Weather Alert', type: 'SMS', trigger: null, content: 'Important: Due to weather conditions, we may need to adjust your move time. We\'ll keep you updated.' },
    { name: 'Claim Acknowledgment', type: 'EMAIL', trigger: null, subject: 'Claim Received', content: 'Dear {{customerName}},\n\nWe have received your claim and will review it within 5 business days.' },
    { name: 'Storage Reminder', type: 'EMAIL', trigger: null, subject: 'Storage Payment Reminder', content: 'Dear {{customerName}},\n\nYour storage payment is due on {{dueDate}}. Please ensure timely payment.' },
  ];

  const templates = [];
  for (const template of templateData) {
    const t = await prisma.communicationTemplate.create({ data: template });
    templates.push(t);
  }
  console.log(`Created ${templates.length} communication templates`);

  // ==================== LEADS (20+) ====================
  console.log('Creating leads...');
  const leadData = [
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice.johnson@email.com', phone: '555-200-0001', source: 'WEBSITE', status: 'NEW', moveType: 'LOCAL', moveDate: addDays(14), originAddress: '123 Oak Street', originCity: 'Los Angeles', originState: 'CA', originZip: '90001', originPropertyType: 'APARTMENT', originBedrooms: 2, destAddress: '456 Pine Avenue', destCity: 'Los Angeles', destState: 'CA', destZip: '90002', destPropertyType: 'HOUSE', destBedrooms: 3, estimatedVolume: 500 },
    { firstName: 'Bob', lastName: 'Smith', email: 'bob.smith@email.com', phone: '555-200-0002', source: 'REFERRAL', status: 'QUALIFIED', moveType: 'LONG_DISTANCE', moveDate: addDays(30), originAddress: '789 Maple Drive', originCity: 'Los Angeles', originState: 'CA', originZip: '90003', originPropertyType: 'HOUSE', originBedrooms: 4, destAddress: '101 Ocean View', destCity: 'San Francisco', destState: 'CA', destZip: '94102', destPropertyType: 'CONDO', destBedrooms: 3, estimatedVolume: 1200, qualificationScore: 85, qualifiedAt: new Date() },
    { firstName: 'Carol', lastName: 'Davis', email: 'carol.davis@email.com', phone: '555-200-0003', source: 'GOOGLE_ADS', status: 'CONTACTED', moveType: 'LOCAL', moveDate: addDays(7), originAddress: '222 Elm Street', originCity: 'Burbank', originState: 'CA', originZip: '91501', originPropertyType: 'APARTMENT', originBedrooms: 1, destAddress: '333 Sunset Blvd', destCity: 'Hollywood', destState: 'CA', destZip: '90028', destPropertyType: 'APARTMENT', destBedrooms: 2, estimatedVolume: 300 },
    { firstName: 'David', lastName: 'Wilson', email: 'david.wilson@email.com', phone: '555-200-0004', source: 'FACEBOOK', status: 'NEW', moveType: 'LOCAL', moveDate: addDays(21), originAddress: '444 Cedar Lane', originCity: 'Pasadena', originState: 'CA', originZip: '91101', originPropertyType: 'TOWNHOUSE', originBedrooms: 3, destAddress: '555 Birch Way', destCity: 'Glendale', destState: 'CA', destZip: '91201', destPropertyType: 'HOUSE', destBedrooms: 4, estimatedVolume: 800 },
    { firstName: 'Emma', lastName: 'Brown', email: 'emma.brown@email.com', phone: '555-200-0005', source: 'YELP', status: 'SURVEY_SCHEDULED', moveType: 'LOCAL', moveDate: addDays(10), originAddress: '666 Willow Street', originCity: 'Santa Monica', originState: 'CA', originZip: '90401', originPropertyType: 'CONDO', originBedrooms: 2, destAddress: '777 Palm Drive', destCity: 'Venice', destState: 'CA', destZip: '90291', destPropertyType: 'APARTMENT', destBedrooms: 2, estimatedVolume: 450 },
    { firstName: 'Frank', lastName: 'Garcia', email: 'frank.garcia@email.com', phone: '555-200-0006', source: 'THUMBTACK', status: 'QUOTED', moveType: 'COMMERCIAL', moveDate: addDays(45), originAddress: '888 Business Park', originCity: 'Torrance', originState: 'CA', originZip: '90501', originPropertyType: 'OFFICE', originBedrooms: 0, destAddress: '999 Corporate Way', destCity: 'Long Beach', destState: 'CA', destZip: '90802', destPropertyType: 'OFFICE', destBedrooms: 0, estimatedVolume: 2500, qualificationScore: 92 },
    { firstName: 'Grace', lastName: 'Martinez', email: 'grace.martinez@email.com', phone: '555-200-0007', source: 'PHONE', status: 'NEGOTIATING', moveType: 'LONG_DISTANCE', moveDate: addDays(60), originAddress: '111 Mountain View', originCity: 'Arcadia', originState: 'CA', originZip: '91006', originPropertyType: 'HOUSE', originBedrooms: 5, destAddress: '222 Desert Road', destCity: 'Phoenix', destState: 'AZ', destZip: '85001', destPropertyType: 'HOUSE', destBedrooms: 5, estimatedVolume: 1800, qualificationScore: 78 },
    { firstName: 'Henry', lastName: 'Anderson', email: 'henry.anderson@email.com', phone: '555-200-0008', source: 'WEBSITE', status: 'NEW', moveType: 'STORAGE', moveDate: addDays(5), originAddress: '333 River Road', originCity: 'Riverside', originState: 'CA', originZip: '92501', originPropertyType: 'APARTMENT', originBedrooms: 1, destAddress: null, destCity: null, destState: null, destZip: null, destPropertyType: 'STORAGE_UNIT', destBedrooms: null, estimatedVolume: 200 },
    { firstName: 'Isabella', lastName: 'Taylor', email: 'isabella.taylor@email.com', phone: '555-200-0009', source: 'REFERRAL', status: 'CONTACTED', moveType: 'LOCAL', moveDate: addDays(18), originAddress: '444 Lake Street', originCity: 'Irvine', originState: 'CA', originZip: '92602', originPropertyType: 'APARTMENT', originBedrooms: 3, destAddress: '555 Beach Blvd', destCity: 'Huntington Beach', destState: 'CA', destZip: '92647', destPropertyType: 'CONDO', destBedrooms: 3, estimatedVolume: 650 },
    { firstName: 'Jack', lastName: 'Thomas', email: 'jack.thomas@email.com', phone: '555-200-0010', source: 'GOOGLE_ADS', status: 'WON', moveType: 'LOCAL', moveDate: addDays(-2), originAddress: '666 Hill Drive', originCity: 'Anaheim', originState: 'CA', originZip: '92801', originPropertyType: 'HOUSE', originBedrooms: 4, destAddress: '777 Valley View', destCity: 'Fullerton', destState: 'CA', destZip: '92831', destPropertyType: 'HOUSE', destBedrooms: 4, estimatedVolume: 1100, qualificationScore: 95, convertedAt: new Date() },
    { firstName: 'Karen', lastName: 'Jackson', email: 'karen.jackson@email.com', phone: '555-200-0011', source: 'FACEBOOK', status: 'LOST', moveType: 'LONG_DISTANCE', moveDate: addDays(90), originAddress: '888 Forest Lane', originCity: 'San Diego', originState: 'CA', originZip: '92101', originPropertyType: 'HOUSE', originBedrooms: 3, destAddress: '999 Mountain Pass', destCity: 'Denver', destState: 'CO', destZip: '80201', destPropertyType: 'HOUSE', destBedrooms: 3, estimatedVolume: 900, notes: 'Lost to competitor - price issue' },
    { firstName: 'Liam', lastName: 'White', email: 'liam.white@email.com', phone: '555-200-0012', source: 'WEBSITE', status: 'NEW', moveType: 'PACKING_ONLY', moveDate: addDays(12), originAddress: '100 First Street', originCity: 'Burbank', originState: 'CA', originZip: '91502', originPropertyType: 'APARTMENT', originBedrooms: 2, destAddress: '100 First Street', destCity: 'Burbank', destState: 'CA', destZip: '91502', destPropertyType: 'APARTMENT', destBedrooms: 2, estimatedVolume: 400 },
    { firstName: 'Mia', lastName: 'Harris', email: 'mia.harris@email.com', phone: '555-200-0013', source: 'YELP', status: 'QUALIFIED', moveType: 'LOCAL', moveDate: addDays(25), originAddress: '200 Second Avenue', originCity: 'Culver City', originState: 'CA', originZip: '90230', originPropertyType: 'CONDO', originBedrooms: 2, destAddress: '300 Third Street', destCity: 'Marina del Rey', destState: 'CA', destZip: '90292', destPropertyType: 'APARTMENT', destBedrooms: 2, estimatedVolume: 500, qualificationScore: 88 },
    { firstName: 'Noah', lastName: 'Martin', email: 'noah.martin@email.com', phone: '555-200-0014', source: 'PHONE', status: 'SURVEY_SCHEDULED', moveType: 'LOCAL', moveDate: addDays(16), originAddress: '400 Fourth Place', originCity: 'West Hollywood', originState: 'CA', originZip: '90046', originPropertyType: 'APARTMENT', originBedrooms: 1, destAddress: '500 Fifth Court', destCity: 'Beverly Hills', destState: 'CA', destZip: '90210', destPropertyType: 'CONDO', destBedrooms: 2, estimatedVolume: 350 },
    { firstName: 'Olivia', lastName: 'Thompson', email: 'olivia.thompson@email.com', phone: '555-200-0015', source: 'THUMBTACK', status: 'NEW', moveType: 'COMMERCIAL', moveDate: addDays(35), originAddress: '600 Sixth Street', originCity: 'El Segundo', originState: 'CA', originZip: '90245', originPropertyType: 'WAREHOUSE', originBedrooms: 0, destAddress: '700 Seventh Ave', destCity: 'Hawthorne', destState: 'CA', destZip: '90250', destPropertyType: 'WAREHOUSE', destBedrooms: 0, estimatedVolume: 5000 },
    { firstName: 'Peter', lastName: 'Garcia', email: 'peter.garcia@email.com', phone: '555-200-0016', source: 'REFERRAL', status: 'CONTACTED', moveType: 'LOCAL', moveDate: addDays(8), originAddress: '800 Eighth Road', originCity: 'Downey', originState: 'CA', originZip: '90240', originPropertyType: 'HOUSE', originBedrooms: 3, destAddress: '900 Ninth Lane', destCity: 'Norwalk', destState: 'CA', destZip: '90650', destPropertyType: 'HOUSE', destBedrooms: 4, estimatedVolume: 750 },
    { firstName: 'Quinn', lastName: 'Robinson', email: 'quinn.robinson@email.com', phone: '555-200-0017', source: 'GOOGLE_ADS', status: 'WON', moveType: 'LOCAL', moveDate: addDays(-5), originAddress: '1000 Tenth Street', originCity: 'Whittier', originState: 'CA', originZip: '90601', originPropertyType: 'TOWNHOUSE', originBedrooms: 3, destAddress: '1100 Eleventh Ave', destCity: 'La Mirada', destState: 'CA', destZip: '90638', destPropertyType: 'HOUSE', destBedrooms: 4, estimatedVolume: 950, qualificationScore: 91, convertedAt: new Date() },
    { firstName: 'Rachel', lastName: 'Clark', email: 'rachel.clark@email.com', phone: '555-200-0018', source: 'WEBSITE', status: 'QUOTED', moveType: 'LONG_DISTANCE', moveDate: addDays(50), originAddress: '1200 Twelfth Place', originCity: 'Redondo Beach', originState: 'CA', originZip: '90277', originPropertyType: 'HOUSE', originBedrooms: 4, destAddress: '1300 Thirteenth Way', destCity: 'Seattle', destState: 'WA', destZip: '98101', destPropertyType: 'HOUSE', destBedrooms: 4, estimatedVolume: 1400, qualificationScore: 82 },
    { firstName: 'Samuel', lastName: 'Lewis', email: 'samuel.lewis@email.com', phone: '555-200-0019', source: 'FACEBOOK', status: 'NEW', moveType: 'LOCAL', moveDate: addDays(20), originAddress: '1400 Fourteenth Drive', originCity: 'Manhattan Beach', originState: 'CA', originZip: '90266', originPropertyType: 'CONDO', originBedrooms: 2, destAddress: '1500 Fifteenth Blvd', destCity: 'Hermosa Beach', destState: 'CA', destZip: '90254', destPropertyType: 'APARTMENT', destBedrooms: 2, estimatedVolume: 550 },
    { firstName: 'Tina', lastName: 'Walker', email: 'tina.walker@email.com', phone: '555-200-0020', source: 'PHONE', status: 'WON', moveType: 'LOCAL', moveDate: addDays(-7), originAddress: '1600 Sixteenth Court', originCity: 'Torrance', originState: 'CA', originZip: '90503', originPropertyType: 'APARTMENT', originBedrooms: 2, destAddress: '1700 Seventeenth Street', destCity: 'Gardena', destState: 'CA', destZip: '90247', destPropertyType: 'HOUSE', destBedrooms: 3, estimatedVolume: 600, qualificationScore: 89, convertedAt: new Date() },
  ];

  const leads = [];
  for (let i = 0; i < leadData.length; i++) {
    const leadInfo = leadData[i];
    const lead = await prisma.lead.create({
      data: {
        ...leadInfo,
        assignedToId: users[i % users.length].id,
      },
    });
    leads.push(lead);
  }
  console.log(`Created ${leads.length} leads`);

  // ==================== SURVEYS (15+) ====================
  console.log('Creating surveys...');
  const surveys = [];
  for (let i = 0; i < 16; i++) {
    const survey = await prisma.survey.create({
      data: {
        leadId: leads[i % leads.length].id,
        type: i % 3 === 0 ? 'VIRTUAL' : 'ON_SITE',
        scheduledAt: addDays(i - 5),
        completedAt: i < 10 ? addDays(i - 4) : null,
        conductedBy: `Estimator ${i + 1}`,
        totalVolume: 300 + (i * 100),
        totalWeight: 1500 + (i * 500),
        estimatedHours: 3 + (i * 0.5),
        accessNotes: `Access notes for survey ${i + 1}`,
        specialItems: i % 2 === 0 ? 'Piano, Antique furniture' : 'Large TV, Gun safe',
        packingNeeded: i % 2 === 0,
        packingHours: i % 2 === 0 ? 2 + i * 0.3 : null,
      },
    });
    surveys.push(survey);
  }
  console.log(`Created ${surveys.length} surveys`);

  // ==================== QUOTES (18+) ====================
  console.log('Creating quotes...');
  const quotes = [];
  const quoteStatuses = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
  const quoteTypes = ['BINDING', 'NON_BINDING', 'NOT_TO_EXCEED'];

  for (let i = 0; i < 18; i++) {
    const laborHours = 4 + (i * 0.5);
    const crewSize = 2 + (i % 3);
    const laborRate = 50;
    const laborTotal = laborHours * crewSize * laborRate;
    const travelHours = 1 + (i * 0.2);
    const travelRate = 35;
    const travelTotal = travelHours * travelRate;
    const packingHours = i % 2 === 0 ? 2 + (i * 0.2) : 0;
    const packingRate = 40;
    const packingTotal = packingHours * packingRate * crewSize;
    const subtotal = laborTotal + travelTotal + packingTotal;
    const taxes = subtotal * 0.0825;
    const total = subtotal + taxes;

    const quote = await prisma.quote.create({
      data: {
        leadId: leads[i % leads.length].id,
        createdById: users[i % users.length].id,
        quoteNumber: `QT-${2024}${String(i + 1).padStart(4, '0')}`,
        type: quoteTypes[i % 3],
        status: quoteStatuses[i % 6],
        estimatedHours: laborHours,
        crewSize,
        laborRate,
        laborTotal,
        travelHours,
        travelRate,
        travelTotal,
        packingHours: packingHours || null,
        packingRate: packingHours ? packingRate : null,
        packingTotal: packingTotal || null,
        subtotal,
        discount: i % 4 === 0 ? 50 : 0,
        discountReason: i % 4 === 0 ? 'Referral discount' : null,
        taxes,
        total: total - (i % 4 === 0 ? 50 : 0),
        validUntil: addDays(30 + i),
        acceptedAt: quoteStatuses[i % 6] === 'ACCEPTED' ? addDays(i - 3) : null,
        notes: `Quote notes for customer ${i + 1}`,
      },
    });
    quotes.push(quote);
  }
  console.log(`Created ${quotes.length} quotes`);

  // ==================== JOBS (15+) ====================
  console.log('Creating jobs...');
  const jobs = [];
  const jobStatuses = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'LOADING', 'IN_TRANSIT', 'UNLOADING', 'COMPLETED', 'CANCELLED'];
  const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');

  // Create jobs for accepted quotes and some additional ones
  const wonLeads = leads.filter(l => l.status === 'WON');

  for (let i = 0; i < 16; i++) {
    const leadForJob = wonLeads[i % wonLeads.length] || leads[i];
    const quoteForJob = acceptedQuotes[i % acceptedQuotes.length] || quotes[i];

    // Check if this lead already has a job
    const existingJob = await prisma.job.findUnique({
      where: { leadId: leadForJob.id }
    });

    if (existingJob) continue;

    const job = await prisma.job.create({
      data: {
        jobNumber: `JOB-${2024}${String(i + 1).padStart(4, '0')}`,
        leadId: leadForJob.id,
        quoteId: quoteForJob.id,
        createdById: users[0].id,
        assignedToId: users[i % users.length].id,
        status: jobStatuses[i % 8],
        moveDate: addDays(i - 7),
        startTime: i < 8 ? addDays(i - 7) : null,
        endTime: i < 6 ? addDays(i - 7) : null,
        originAddress: leadForJob.originAddress || '123 Origin St',
        originCity: leadForJob.originCity || 'Los Angeles',
        originState: leadForJob.originState || 'CA',
        originZip: leadForJob.originZip || '90001',
        originNotes: 'Ring doorbell, customer will meet at door',
        destAddress: leadForJob.destAddress || '456 Dest Ave',
        destCity: leadForJob.destCity || 'Los Angeles',
        destState: leadForJob.destState || 'CA',
        destZip: leadForJob.destZip || '90002',
        destNotes: 'Use back entrance, elevator available',
        crewSize: 2 + (i % 3),
        trucksNeeded: 1 + (i % 2),
        equipmentNeeds: 'Dolly x2, Furniture pads x10, Straps x4',
        specialInstructions: `Special instructions for job ${i + 1}`,
        actualHours: i < 6 ? 4 + (i * 0.5) : null,
        actualCrewSize: i < 6 ? 2 + (i % 3) : null,
        actualMileage: i < 6 ? 15 + (i * 5) : null,
        completedAt: i < 6 ? addDays(i - 6) : null,
      },
    });
    jobs.push(job);
  }
  console.log(`Created ${jobs.length} jobs`);

  // ==================== CREW ASSIGNMENTS ====================
  console.log('Creating crew assignments...');
  for (const job of jobs) {
    const numCrew = job.crewSize;
    for (let c = 0; c < numCrew && c < crewMembers.length; c++) {
      await prisma.crewAssignment.create({
        data: {
          jobId: job.id,
          crewMemberId: crewMembers[c].id,
          role: c === 0 ? 'DRIVER' : (c === 1 ? 'CREW_LEAD' : 'MOVER'),
          confirmedAt: job.status !== 'SCHEDULED' ? new Date() : null,
        },
      });
    }
  }
  console.log('Created crew assignments');

  // ==================== TRUCK ASSIGNMENTS ====================
  console.log('Creating truck assignments...');
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    for (let t = 0; t < job.trucksNeeded && t < trucks.length; t++) {
      await prisma.truckAssignment.create({
        data: {
          jobId: job.id,
          truckId: trucks[(i + t) % trucks.length].id,
          startMileage: job.status !== 'SCHEDULED' ? 45000 + (i * 100) : null,
          endMileage: job.status === 'COMPLETED' ? 45000 + (i * 100) + 35 : null,
          fuelUsed: job.status === 'COMPLETED' ? 8 + (i * 0.5) : null,
        },
      });
    }
  }
  console.log('Created truck assignments');

  // ==================== INVENTORY ITEMS (20+) ====================
  console.log('Creating inventory items...');
  const itemCategories = ['FURNITURE', 'ELECTRONICS', 'APPLIANCE', 'BOXES', 'FRAGILE', 'ARTWORK', 'ANTIQUE', 'OUTDOOR', 'GARAGE', 'OTHER'];
  const inventoryItemsData = [
    { name: 'King Size Bed Frame', category: 'FURNITURE', volume: 40, weight: 150 },
    { name: 'Leather Sofa', category: 'FURNITURE', volume: 50, weight: 180 },
    { name: 'Dining Table', category: 'FURNITURE', volume: 30, weight: 100 },
    { name: 'Office Desk', category: 'FURNITURE', volume: 25, weight: 80 },
    { name: '65" Smart TV', category: 'ELECTRONICS', volume: 15, weight: 50, isFragile: true },
    { name: 'Desktop Computer', category: 'ELECTRONICS', volume: 8, weight: 30 },
    { name: 'Refrigerator', category: 'APPLIANCE', volume: 60, weight: 300 },
    { name: 'Washing Machine', category: 'APPLIANCE', volume: 35, weight: 200 },
    { name: 'Dryer', category: 'APPLIANCE', volume: 35, weight: 150 },
    { name: 'Microwave', category: 'APPLIANCE', volume: 5, weight: 30 },
    { name: 'Moving Boxes (Small)', category: 'BOXES', volume: 2, weight: 20, quantity: 10 },
    { name: 'Moving Boxes (Medium)', category: 'BOXES', volume: 3, weight: 35, quantity: 15 },
    { name: 'Moving Boxes (Large)', category: 'BOXES', volume: 5, weight: 50, quantity: 8 },
    { name: 'Crystal Vase Collection', category: 'FRAGILE', volume: 3, weight: 10, isFragile: true, requiresCrating: true },
    { name: 'China Cabinet Contents', category: 'FRAGILE', volume: 10, weight: 40, isFragile: true },
    { name: 'Oil Painting - Large', category: 'ARTWORK', volume: 8, weight: 20, isFragile: true, requiresCrating: true },
    { name: 'Framed Photos Collection', category: 'ARTWORK', volume: 5, weight: 15, isFragile: true },
    { name: 'Antique Grandfather Clock', category: 'ANTIQUE', volume: 15, weight: 200, isFragile: true, requiresCrating: true },
    { name: 'Vintage Armoire', category: 'ANTIQUE', volume: 45, weight: 250 },
    { name: 'Patio Furniture Set', category: 'OUTDOOR', volume: 40, weight: 120 },
    { name: 'BBQ Grill', category: 'OUTDOOR', volume: 25, weight: 100 },
    { name: 'Lawn Mower', category: 'GARAGE', volume: 20, weight: 80 },
    { name: 'Tool Chest', category: 'GARAGE', volume: 15, weight: 150 },
    { name: 'Bicycle', category: 'OTHER', volume: 12, weight: 25 },
    { name: 'Treadmill', category: 'GYM_EQUIPMENT', volume: 35, weight: 250 },
  ];

  for (let i = 0; i < jobs.length && i < 15; i++) {
    const job = jobs[i];
    for (let j = 0; j < 5; j++) {
      const itemData = inventoryItemsData[(i + j) % inventoryItemsData.length];
      await prisma.inventoryItem.create({
        data: {
          jobId: job.id,
          name: itemData.name,
          category: itemData.category,
          quantity: itemData.quantity || 1,
          volume: itemData.volume,
          weight: itemData.weight,
          isFragile: itemData.isFragile || false,
          requiresCrating: itemData.requiresCrating || false,
          condition: 'GOOD',
          boxNumber: `BOX-${i + 1}-${j + 1}`,
          loadedAt: job.status !== 'SCHEDULED' ? addDays(i - 7) : null,
          unloadedAt: job.status === 'COMPLETED' ? addDays(i - 6) : null,
        },
      });
    }
  }
  console.log('Created inventory items');

  // ==================== INVOICES (15+) ====================
  console.log('Creating invoices...');
  const invoices = [];
  const invoiceStatuses = ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'];

  for (let i = 0; i < jobs.length && i < 16; i++) {
    const job = jobs[i];

    // Check if invoice already exists for this job
    const existingInvoice = await prisma.invoice.findUnique({
      where: { jobId: job.id }
    });

    if (existingInvoice) continue;

    const laborHours = job.actualHours || 5;
    const laborRate = 50;
    const laborTotal = laborHours * job.crewSize * laborRate;
    const travelHours = 1.5;
    const travelRate = 35;
    const travelTotal = travelHours * travelRate;
    const subtotal = laborTotal + travelTotal;
    const taxes = subtotal * 0.0825;
    const total = subtotal + taxes;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${2024}${String(i + 1).padStart(4, '0')}`,
        jobId: job.id,
        status: invoiceStatuses[i % 7],
        laborHours,
        laborRate,
        laborTotal,
        travelHours,
        travelRate,
        travelTotal,
        subtotal,
        discount: i % 5 === 0 ? 25 : 0,
        discountReason: i % 5 === 0 ? 'Loyalty discount' : null,
        taxes,
        total: total - (i % 5 === 0 ? 25 : 0),
        dueDate: addDays(i + 14),
        paidAt: invoiceStatuses[i % 7] === 'PAID' ? addDays(i + 7) : null,
        paidAmount: invoiceStatuses[i % 7] === 'PAID' ? total - (i % 5 === 0 ? 25 : 0) : (invoiceStatuses[i % 7] === 'PARTIAL' ? total / 2 : null),
        paymentMethod: invoiceStatuses[i % 7] === 'PAID' ? 'CREDIT_CARD' : null,
        notes: `Invoice notes for job ${i + 1}`,
      },
    });
    invoices.push(invoice);
  }
  console.log(`Created ${invoices.length} invoices`);

  // ==================== CLAIMS (15+) ====================
  console.log('Creating claims...');
  const claims = [];
  const claimStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'SETTLED'];
  const claimTypes = ['DAMAGE', 'LOSS', 'DELAY', 'OTHER'];

  for (let i = 0; i < 16 && i < jobs.length; i++) {
    const job = jobs[i % jobs.length];
    const claim = await prisma.claim.create({
      data: {
        claimNumber: `CLM-${2024}${String(i + 1).padStart(4, '0')}`,
        jobId: job.id,
        status: claimStatuses[i % 5],
        type: claimTypes[i % 4],
        description: `Claim description ${i + 1}: ${claimTypes[i % 4] === 'DAMAGE' ? 'Scratched furniture during move' : claimTypes[i % 4] === 'LOSS' ? 'Missing box of kitchen items' : claimTypes[i % 4] === 'DELAY' ? 'Move started 2 hours late' : 'General complaint about service'}`,
        damagePhotos: ['photo1.jpg', 'photo2.jpg'],
        estimatedValue: 100 + (i * 50),
        approvedAmount: claimStatuses[i % 5] === 'APPROVED' || claimStatuses[i % 5] === 'SETTLED' ? 75 + (i * 25) : null,
        reviewedAt: claimStatuses[i % 5] !== 'SUBMITTED' ? addDays(i - 10) : null,
        reviewedBy: claimStatuses[i % 5] !== 'SUBMITTED' ? 'Claims Manager' : null,
        resolvedAt: claimStatuses[i % 5] === 'SETTLED' ? addDays(i - 5) : null,
        resolution: claimStatuses[i % 5] === 'SETTLED' ? 'Payment issued to customer' : null,
      },
    });
    claims.push(claim);
  }
  console.log(`Created ${claims.length} claims`);

  // ==================== FOLLOW-UPS (15+) ====================
  console.log('Creating follow-ups...');
  const followUpTypes = ['CALL', 'EMAIL', 'TEXT', 'IN_PERSON'];

  for (let i = 0; i < 20; i++) {
    await prisma.followUp.create({
      data: {
        leadId: leads[i % leads.length].id,
        type: followUpTypes[i % 4],
        scheduledAt: addDays(i - 10),
        completedAt: i < 12 ? addDays(i - 9) : null,
        notes: `Follow-up notes for lead ${i + 1}`,
        outcome: i < 12 ? (i % 3 === 0 ? 'Interested, scheduled survey' : i % 3 === 1 ? 'Left voicemail' : 'Spoke with customer, will decide next week') : null,
      },
    });
  }
  console.log('Created follow-ups');

  // ==================== COMMUNICATIONS (15+) ====================
  console.log('Creating communications...');
  const commTypes = ['EMAIL', 'SMS', 'PHONE', 'IN_APP'];
  const commDirections = ['INBOUND', 'OUTBOUND'];
  const commStatuses = ['DRAFT', 'SENT', 'DELIVERED', 'READ', 'FAILED'];

  for (let i = 0; i < 20; i++) {
    await prisma.communication.create({
      data: {
        leadId: leads[i % leads.length].id,
        userId: users[i % users.length].id,
        type: commTypes[i % 4],
        direction: commDirections[i % 2],
        subject: commTypes[i % 4] === 'EMAIL' ? `Communication ${i + 1} Subject` : null,
        content: `Communication content ${i + 1}. ${commDirections[i % 2] === 'OUTBOUND' ? 'Thank you for contacting ABC Moving!' : 'Customer inquiry about pricing.'}`,
        status: commStatuses[i % 5],
        sentAt: commStatuses[i % 5] !== 'DRAFT' ? addDays(i - 15) : null,
        deliveredAt: ['DELIVERED', 'READ'].includes(commStatuses[i % 5]) ? addDays(i - 15) : null,
        readAt: commStatuses[i % 5] === 'READ' ? addDays(i - 14) : null,
        templateId: i % 3 === 0 && templates[i % templates.length] ? templates[i % templates.length].id : null,
      },
    });
  }
  console.log('Created communications');

  // ==================== STORAGE RESERVATIONS (15+) ====================
  console.log('Creating storage reservations...');
  const storageStatuses = ['RESERVED', 'ACTIVE', 'ENDED', 'OVERDUE'];

  for (let i = 0; i < 16; i++) {
    // Mark some units as occupied
    if (i < 8) {
      await prisma.storageUnit.update({
        where: { id: storageUnits[i].id },
        data: { isOccupied: true },
      });
    }

    await prisma.storageReservation.create({
      data: {
        unitId: storageUnits[i % storageUnits.length].id,
        customerId: leads[i % leads.length].id,
        customerName: `${leadData[i % leadData.length].firstName} ${leadData[i % leadData.length].lastName}`,
        customerPhone: leadData[i % leadData.length].phone,
        customerEmail: leadData[i % leadData.length].email,
        startDate: addDays(-30 + i),
        endDate: storageStatuses[i % 4] === 'ENDED' ? addDays(i) : null,
        monthlyRate: storageUnits[i % storageUnits.length].monthlyRate,
        status: storageStatuses[i % 4],
      },
    });
  }
  console.log('Created storage reservations');

  // ==================== PAYMENTS (15+) ====================
  console.log('Creating payments...');
  const paymentMethods = ['CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'ZELLE', 'VENMO'];
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID' || inv.status === 'PARTIAL');

  for (let i = 0; i < paidInvoices.length && i < 15; i++) {
    const invoice = paidInvoices[i];
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.paidAmount || invoice.total,
        method: paymentMethods[i % paymentMethods.length],
        reference: `REF-${String(i + 1).padStart(6, '0')}`,
        notes: `Payment for invoice ${invoice.invoiceNumber}`,
        processedAt: addDays(i - 5),
        processedBy: users[i % users.length].firstName,
      },
    });
  }
  console.log('Created payments');

  // ==================== JOB NOTES (15+) ====================
  console.log('Creating job notes...');
  for (let i = 0; i < jobs.length && i < 16; i++) {
    const job = jobs[i];
    for (let n = 0; n < 2; n++) {
      await prisma.jobNote.create({
        data: {
          jobId: job.id,
          content: `Note ${n + 1} for job ${job.jobNumber}: ${n === 0 ? 'Customer confirmed move date and time.' : 'All items packed and ready for loading.'}`,
          createdBy: users[i % users.length].firstName + ' ' + users[i % users.length].lastName,
        },
      });
    }
  }
  console.log('Created job notes');

  // ==================== TIME ENTRIES (15+) ====================
  console.log('Creating time entries...');
  const timeEntryTypes = ['DRIVE_TO_ORIGIN', 'LOADING', 'DRIVE_TO_DEST', 'UNLOADING', 'BREAK'];

  for (let i = 0; i < jobs.length && i < 10; i++) {
    const job = jobs[i];
    if (job.status === 'COMPLETED' || job.status === 'IN_PROGRESS') {
      for (let t = 0; t < 4; t++) {
        await prisma.timeEntry.create({
          data: {
            jobId: job.id,
            crewMemberId: crewMembers[t % crewMembers.length].id,
            type: timeEntryTypes[t % 5],
            startTime: addHours(addDays(i - 7), 8 + t),
            endTime: addHours(addDays(i - 7), 9 + t),
            duration: 1,
            notes: `Time entry for ${timeEntryTypes[t % 5].toLowerCase().replace(/_/g, ' ')}`,
          },
        });
      }
    }
  }
  console.log('Created time entries');

  console.log('\n========================================');
  console.log('Database seeding completed successfully!');
  console.log('========================================');
  console.log(`Users: ${users.length}`);
  console.log(`Crew Members: ${crewMembers.length}`);
  console.log(`Trucks: ${trucks.length}`);
  console.log(`Equipment: ${equipment.length}`);
  console.log(`Storage Units: ${storageUnits.length}`);
  console.log(`Templates: ${templates.length}`);
  console.log(`Leads: ${leads.length}`);
  console.log(`Surveys: ${surveys.length}`);
  console.log(`Quotes: ${quotes.length}`);
  console.log(`Jobs: ${jobs.length}`);
  console.log(`Invoices: ${invoices.length}`);
  console.log(`Claims: ${claims.length}`);
  console.log('\nDemo Login:');
  console.log('Email: admin@movingcompany.com');
  console.log('Demo login users provisioned from the local environment.');
}

// Helper functions
function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function addHours(date, hours) {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
