import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const email = 'nathan.hall87@gmail.com'
  const newPassword = 'penis123' // Change this to your desired password
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { hashedPassword }
    })
    
    console.log('Successfully updated password for user:', updatedUser.email)
  } catch (error) {
    console.error('Error updating password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 