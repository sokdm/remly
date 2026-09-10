import { db } from './db';
import { AdminStats, User } from '../src/types';

export async function getAdminPlatformStats(): Promise<AdminStats> {
  const users: User[] = await db.users.find();
  const exams = await db.exams.find();
  const attempts = await db.examAttempts.find();
  const classes = await db.classes.find();
  const generations = await db.creatorGenerations.find();
  const messages = await db.messages.find();

  const totalUsers = users.length;
  const totalStudents = users.filter((u) => u.role === 'student').length;
  const totalCreators = users.filter((u) => u.role === 'creator').length;
  const suspendedUsers = users.filter((u) => u.isSuspended).length;
  const activeUsers = totalUsers - suspendedUsers;

  const recentRegistrations = [...users]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    totalUsers,
    totalStudents,
    totalCreators,
    activeUsers,
    suspendedUsers,
    recentRegistrations,
    totalExams: exams.length,
    totalExamAttempts: attempts.length,
    totalScheduledClasses: classes.length,
    totalImageGenerations: generations.length,
    aiUsageStats: {
      tutorQueries: messages.filter((m: any) => m.sender === 'student').length,
      imageGenerations: generations.length,
      averageResponseTimeMs: 420,
    },
  };
}

export async function suspendUserAccount(
  adminUid: string,
  targetUid: string,
  reason: string,
  duration: string = '7 days'
): Promise<boolean> {
  const target = await db.users.findOne({ uid: targetUid });
  if (!target) throw new Error('Target user not found');
  if (target.role === 'admin') throw new Error('Cannot suspend another administrator');

  await db.users.updateOne(
    { uid: targetUid },
    {
      isSuspended: true,
      suspensionReason: reason,
      suspensionDuration: duration,
    }
  );

  await db.adminActions.insertOne({
    adminUid,
    targetUid,
    action: 'suspend_user',
    reason,
    duration,
    timestamp: new Date().toISOString(),
  });

  return true;
}

export async function restoreUserAccount(adminUid: string, targetUid: string): Promise<boolean> {
  await db.users.updateOne(
    { uid: targetUid },
    {
      isSuspended: false,
      suspensionReason: undefined,
      suspensionDuration: undefined,
      academicRestricted: false,
    }
  );

  await db.adminActions.insertOne({
    adminUid,
    targetUid,
    action: 'restore_user',
    timestamp: new Date().toISOString(),
  });

  return true;
}

export async function searchUsers(searchTerm: string): Promise<User[]> {
  const term = searchTerm.toLowerCase();
  const allUsers: User[] = await db.users.find();
  return allUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.uid.toLowerCase().includes(term)
  );
}
