import pool from '../config/db';
import bcrypt from 'bcryptjs';

interface User {
  id?: number;
  username: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
}

class UserModel {
  static async create(user: User): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [user.username, user.email, hashedPassword, user.role]
    );
    return { ...user, id: (result as any).insertId };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const users = rows as User[];
    return users.length ? users[0] : null;
  }

  static async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

export default UserModel;