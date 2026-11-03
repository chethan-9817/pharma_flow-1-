import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const databaseFile = join(root, 'pharmaflow.json');
const port = Number(process.env.PORT || 8787);
const roles = ['customer', 'chemist', 'rider', 'admin'];
const medicineSeed = [
  ['Dolo 650 Tablet', 'Paracetamol 650mg', 'Pacimol / Generic Paracetamol 650mg', 33, 14, 'Micro Labs', false],
  ['Augmentin 625 Duo', 'Amoxicillin 500mg + Clavulanic Acid 125mg', 'Amoxyclav 625 Generic', 201, 92, 'GSK', true],
  ['Pan-D Capsule PR', 'Pantoprazole 40mg + Domperidone 30mg', 'Pantodom Generic', 190, 68, 'Alkem', false],
  ['Azithral 500 Tablet', 'Azithromycin 500mg', 'Azee / Generic Azithromycin 500', 119, 48, 'Alembic', true],
  ['Shelcal 500 Tablet', 'Calcium 500mg + Vit D3', 'Calci-D3 Generic', 131, 54, 'Torrent', false],
  ['Cetirizine 10mg (Okacet)', 'Cetirizine Hydrochloride', 'Cetirizine 10mg Generic', 21, 8, 'Cipla', false],
  ['Becosules Capsules', 'B-Complex with Vitamin C', 'B-Complex Forte Generic', 55, 22, 'Pfizer', false],
  ['Benadryl Cough Formula', 'Diphenhydramine Syrup 150ml', 'CoughRelief Generic Syrup', 125, 58, 'J&J', false],
  ['Electral ORS Powder', 'WHO ORS Sachet', 'WHO ORS Generic', 22, 11, 'FDC Ltd', false],
  ['Volini Pain Relief Gel', 'Diclofenac Gel 30g', 'Diclofenac Topical Gel', 130, 49, 'Sun Pharma', false],
  ['Limcee Vitamin C 500mg', 'Ascorbic Acid Chewable', 'Celin / Generic Vit C', 25, 12, 'Abbott', false],
  ['Accu-Chek Active Strips', '50 Blood Glucose Strips', 'Truworth Gluco Strips', 975, 540, 'Roche', false],
  ['UV Doux Silicone Sunscreen Gel SPF 50', 'Sunscreen SPF 50 PA+++ · 50g', 'SunProtect SPF 50 Generic Gel', 699, 299, 'Brinton', false],
  ['Telma 40 Tablet', 'Telmisartan 40mg', 'Telmisartan 40mg Generic', 165, 42, 'Glenmark', true],
  ['Amlodac 5 Tablet', 'Amlodipine 5mg', 'Amlodipine 5mg Generic', 75, 18, 'Zydus', true],
  ['Glycomet GP 1 Tablet', 'Glimepiride 1mg + Metformin 500mg', 'Glimepiride-Metformin Generic', 180, 62, 'USV', true],
  ['Thyronorm 50 Tablet', 'Levothyroxine Sodium 50mcg', 'Levothyroxine 50mcg Generic', 150, 38, 'Abbott', true],
  ['Budecort 0.5 Respules', 'Budesonide 0.5mg / 2ml', 'Budesonide 0.5mg Generic', 180, 70, 'Cipla', true],
  ['Glivec 400 Tablet', 'Imatinib Mesylate 400mg', 'Imatinib 400mg Generic', 8500, 2100, 'Novartis', true],
  ['Anastral 1 Tablet', 'Anastrozole 1mg', 'Anastrozole 1mg Generic', 320, 80, 'Natco', true],
].map(([name, genericSalt, cheaperGenericName, mrp, cheaperGenericPrice, manufacturer, requiresRx], index) => ({ id: `med-${index + 1}`, storeId: 'store-rakesh', storeName: 'Rakesh Medicals', brandName: name, genericSalt, cheaperGenericName, cheaperGenericPrice, manufacturer, batchNumber: `PF-${String(index + 1).padStart(3, '0')}-2026`, barcode: `8901234567${String(index).padStart(3, '0')}`, mrp, salePrice: Math.round(mrp * .88), stockQuantity: 28 + index * 6, expiryDate: '2027-12-31', daysToExpiry: 575, requiresRx, listingStatus: 'regular_retail', imageUrl: '' }));
const seed = {
  users: [
    { id: 'u-customer', name: 'Ananya Sharma', email: 'customer@pharmaflow.local', passwordHash: hash('demo123'), role: 'customer', phone: '+91 98765 43210', address: 'Kadri, Mangaluru', bloodGroup: 'O+' },
    { id: 'u-chemist', name: 'Rakesh Kumar', email: 'chemist@pharmaflow.local', passwordHash: hash('demo123'), role: 'chemist', approvalStatus: 'approved', storeName: 'Rakesh Medicals', drugLicenseNumber: 'KA-MNG-2026-8841', recoveredDeadStockCapital: 128400, amcSavedAmount: 22000 },
    { id: 'u-rider', name: 'Arjun Mehta', email: 'rider@pharmaflow.local', passwordHash: hash('demo123'), role: 'rider' },
    { id: 'u-admin', name: 'Sarah D’Souza', email: 'admin@pharmaflow.local', passwordHash: hash('demo123'), role: 'admin' },
  ],
  store_profiles: [{ id: 'store-rakesh', userId: 'u-chemist', storeName: 'Rakesh Medicals', drugLicenseNumber: 'KA-MNG-2026-8841', gstin: '29AAECR1234F1ZP', approvalStatus: 'approved' }], medicines_inventory: medicineSeed, orders_and_logistics: [{ id: 'PF-1048', customerId: 'u-customer', customerName: 'Ananya Sharma', storeId: 'store-rakesh', riderId: 'u-rider', taskType: 'forward_order', items: [{ medicineId: 'med-1', quantity: 2 }], totalAmount: 184, totalSaved: 43, pointsEarned: 18, pickupAddress: 'Rakesh Medicals', dropAddress: 'Kadri, Mangaluru', targetOrganization: 'Customer', rxVerified: true, otpCode: '4821', status: 'out_for_delivery', createdAt: new Date().toISOString() }], blood_donations: [], user_wallets_and_rewards: [{ userId: 'u-customer', walletCashBalance: 150, ecoKarmaPoints: 450, unscratchedCards: [{ id: 'sc-1', reward: '₹50 Cashback', value: 50 }], scratchedHistory: [], certificates: ['Eco-Karma Member · 2026'] }], audit: [{ id: 'audit-1', text: 'Order PF-1048 dispatched to Arjun Mehta', type: 'forward_order', createdAt: new Date().toISOString() }], sessions: {},
};
function hash(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function verify(password, stored) { const [salt, key] = String(stored).split(':'); if (!salt || !key) return false; const actual = scryptSync(password, salt, 64); return timingSafeEqual(actual, Buffer.from(key, 'hex')); }
function load() { if (!existsSync(databaseFile)) { writeFileSync(databaseFile, JSON.stringify(seed, null, 2)); return structuredClone(seed); } return JSON.parse(readFileSync(databaseFile, 'utf8')); }
let db = load();
function save() { writeFileSync(databaseFile, JSON.stringify(db, null, 2)); }
function json(res, status, value) { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' }); res.end(JSON.stringify(value)); }
function publicUser(user) { const { passwordHash, ...safe } = user; return safe; }
function token() { return randomBytes(32).toString('hex'); }
async function body(req) { let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function auth(req) { const value = req.headers.authorization || ''; const session = db.sessions[value.replace('Bearer ', '')]; return session ? db.users.find((user) => user.id === session.userId) : null; }
function requireRole(req, res, accepted) { const user = auth(req); if (!user || (accepted && !accepted.includes(user.role))) { json(res, 403, { error: 'Role authorization required' }); return null; } return user; }
function route(req, res, pathname) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && pathname === '/api/health') return json(res, 200, { ok: true, service: 'PharmaFlow local engine', persistence: databaseFile });
  if (req.method === 'GET' && pathname === '/api/catalog') return json(res, 200, { inventory: db.medicines_inventory, eco: db.medicines_inventory.filter((item) => item.listingStatus === 'eco_clearance_sale') });
  if (req.method === 'GET' && pathname === '/api/orders') { if (!requireRole(req, res)) return; return json(res, 200, db.orders_and_logistics); }
  if (req.method === 'GET' && pathname === '/api/audit') { if (!requireRole(req, res, ['admin'])) return; return json(res, 200, db.audit); }
  if (req.method === 'GET' && pathname === '/api/auth/me') { const user = auth(req); return user ? json(res, 200, { user: publicUser(user) }) : json(res, 401, { error: 'Session expired' }); }
  if (req.method === 'POST' && pathname === '/api/auth/register') return body(req).then((input) => { if (!input.email || !input.password || !input.name || !roles.includes(input.role || 'customer')) return json(res, 400, { error: 'name, email, password and a valid role are required' }); if (db.users.some((user) => user.email === input.email)) return json(res, 409, { error: 'Email already registered' }); const user = { id: `u-${Date.now()}`, name: input.name, email: input.email, passwordHash: hash(input.password), role: input.role || 'customer', phone: input.phone || '', address: input.address || '', bloodGroup: input.bloodGroup || '', approvalStatus: input.role === 'chemist' ? 'pending' : 'approved', storeName: input.storeName || '', drugLicenseNumber: input.drugLicenseNumber || '', gstin: input.gstin || '' }; db.users.push(user); if (user.role === 'chemist') db.store_profiles.push({ userId: user.id, storeName: user.storeName, drugLicenseNumber: user.drugLicenseNumber, gstin: user.gstin, approvalStatus: 'pending' }); db.audit.unshift({ id: `audit-${Date.now()}`, text: `${user.name} registered`, type: 'auth', createdAt: new Date().toISOString() }); save(); return json(res, 201, { user: publicUser(user) }); });
  if (req.method === 'POST' && pathname === '/api/auth/login') return body(req).then((input) => { const user = db.users.find((candidate) => candidate.email === input.email); if (!user || !verify(input.password, user.passwordHash)) return json(res, 401, { error: 'Invalid email or password' }); const accessToken = token(); db.sessions[accessToken] = { userId: user.id, createdAt: Date.now() }; save(); return json(res, 200, { token: accessToken, user: publicUser(user) }); });
  if (req.method === 'POST' && pathname === '/api/auth/logout') { const accessToken = (req.headers.authorization || '').replace('Bearer ', ''); delete db.sessions[accessToken]; save(); return json(res, 200, { ok: true }); }
  if (req.method === 'POST' && pathname === '/api/orders') return body(req).then((input) => { const user = requireRole(req, res, ['customer']); if (!user) return; const order = { id: `PF-${Date.now().toString().slice(-6)}`, customerId: user.id, customerName: user.name, taskType: input.taskType || 'forward_order', items: input.items || [], totalAmount: Number(input.totalAmount || 0), totalSaved: Number(input.totalSaved || 0), pointsEarned: Number(input.pointsEarned || 0), pickupAddress: input.pickupAddress || '', dropAddress: input.dropAddress || user.address, targetOrganization: input.targetOrganization || 'Customer', rxVerified: Boolean(input.rxVerified), otpCode: String(Math.floor(1000 + Math.random() * 9000)), status: input.status || 'pending', createdAt: new Date().toISOString() }; db.orders_and_logistics.unshift(order); db.audit.unshift({ id: `audit-${Date.now()}`, text: `Order ${order.id} created`, type: order.taskType, createdAt: order.createdAt }); save(); return json(res, 201, order); });
  if (req.method === 'PATCH' && pathname.startsWith('/api/orders/')) return body(req).then((input) => { const user = requireRole(req, res, ['chemist', 'rider', 'admin']); if (!user) return; const order = db.orders_and_logistics.find((item) => item.id === pathname.split('/').pop()); if (!order) return json(res, 404, { error: 'Order not found' }); if (input.status) order.status = input.status; db.audit.unshift({ id: `audit-${Date.now()}`, text: `${user.name} moved ${order.id} to ${order.status}`, type: order.taskType, createdAt: new Date().toISOString() }); save(); return json(res, 200, order); });
  if (req.method === 'POST' && pathname === '/api/blood-donations') return body(req).then((input) => { const user = requireRole(req, res, ['customer']); if (!user) return; const donation = { id: `blood-${Date.now()}`, userId: user.id, donorName: user.name, bloodGroup: input.bloodGroup, hospitalName: input.hospitalName, campLocation: input.campLocation, appointmentDate: input.appointmentDate, timeSlot: input.timeSlot, urgencyLevel: input.urgencyLevel || 'Urgent', pointsAwarded: 500, status: 'scheduled', certificateId: `PF-BLOOD-${Date.now().toString().slice(-4)}` }; db.blood_donations.push(donation); db.audit.unshift({ id: `audit-${Date.now()}`, text: `${user.name} scheduled blood donation`, type: 'blood', createdAt: new Date().toISOString() }); save(); return json(res, 201, donation); });
  if (req.method === 'POST' && pathname === '/api/admin/stores/') return body(req).then((input) => { const user = requireRole(req, res, ['admin']); if (!user) return; const store = db.store_profiles.find((item) => item.userId === input.userId); const target = db.users.find((item) => item.id === input.userId); if (!store || !target) return json(res, 404, { error: 'Store not found' }); store.approvalStatus = input.approvalStatus; target.approvalStatus = input.approvalStatus; db.audit.unshift({ id: `audit-${Date.now()}`, text: `${target.storeName} ${input.approvalStatus}`, type: 'kyc', createdAt: new Date().toISOString() }); save(); return json(res, 200, { store, user: publicUser(target) }); });
  return json(res, 404, { error: 'Route not found' });
}
createServer((req, res) => { try { route(req, res, new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname); } catch (error) { json(res, 500, { error: error.message }); } }).listen(port, () => console.log(`PharmaFlow local engine listening at http://localhost:${port}`));
