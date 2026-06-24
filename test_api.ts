import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

async function main() {
  try {
    // We don't need a real user in DB to generate a token that passes authorizeAdmin
    // authorizeAdmin only checks req.user.role
    const token = jwt.sign(
      { userId: 'test', role: 'SUPER_ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await fetch('http://localhost:5000/api/users/all?search=john', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data is Array?', Array.isArray(data));
    if (!res.ok) {
        console.log('Error data:', data);
    } else {
        console.log('Found users:', data.length);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
