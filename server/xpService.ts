import { db } from './db';
import { REMLY_CONFIG } from '../src/config/remlyConfig';
import { NotificationItem, User } from '../src/types';

export async function awardStudentXP(
  studentUid: string,
  amount: number,
  reason: string
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean; nextLevelXp: number }> {
  const user = await db.users.findOne({ uid: studentUid });
  if (!user) throw new Error('Student not found');

  const currentXp = Number(user.xp || 0);
  const currentLevel = Number(user.level || 1);

  const updatedXp = currentXp + amount;
  const calculatedLevel = REMLY_CONFIG.calculateLevel(updatedXp);
  const leveledUp = calculatedLevel > currentLevel;

  await db.users.updateOne(
    { uid: studentUid },
    {
      xp: updatedXp,
      level: calculatedLevel,
    }
  );

  // Log to xpRecords
  await db.xpRecords.insertOne({
    studentUid,
    amount,
    reason,
    timestamp: new Date().toISOString(),
    previousLevel: currentLevel,
    newLevel: calculatedLevel,
  });

  // Create XP Earned notification
  const xpNotif: NotificationItem = {
    id: `notif_${Date.now()}_xp`,
    userUid: studentUid,
    type: 'xp_earned',
    title: `+${amount} XP Earned!`,
    message: reason,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await db.notifications.insertOne(xpNotif);

  // If leveled up, create Level Up notification!
  if (leveledUp) {
    const levelNotif: NotificationItem = {
      id: `notif_${Date.now()}_level`,
      userUid: studentUid,
      type: 'level_up',
      title: `Level Up! Reached Level ${calculatedLevel}`,
      message: `Outstanding dedication! You advanced from Level ${currentLevel} to Level ${calculatedLevel}. Keep pushing your learning boundaries!`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await db.notifications.insertOne(levelNotif);
  }

  const nextLevelXp = REMLY_CONFIG.calculateXpForNextLevel(calculatedLevel);

  return {
    newXp: updatedXp,
    newLevel: calculatedLevel,
    leveledUp,
    nextLevelXp,
  };
}
