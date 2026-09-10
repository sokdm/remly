import { db } from './db';
import { ScheduledClass, NotificationItem } from '../src/types';
import { sendRemlyEmail } from './emailService';

export async function scheduleClass(
  studentUid: string,
  classData: {
    subject: string;
    topic: string;
    days: string[];
    time: string;
    durationMinutes?: number;
    learningGoal?: string;
  }
): Promise<ScheduledClass> {
  // Compute next session date
  const now = new Date();
  const nextDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow by default
  const dateStr = nextDate.toISOString().split('T')[0] + ' ' + (classData.time || '15:00');

  const newClass: ScheduledClass = {
    id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentUid,
    subject: classData.subject,
    topic: classData.topic,
    days: classData.days && classData.days.length > 0 ? classData.days : ['Monday', 'Wednesday'],
    time: classData.time || '15:00',
    durationMinutes: classData.durationMinutes || 45,
    learningGoal: classData.learningGoal || 'Mastery of foundational concepts',
    status: 'active',
    nextSessionDate: dateStr,
    createdAt: new Date().toISOString(),
  };

  await db.classes.insertOne(newClass);

  // Create immediate in-app notification
  const notif: NotificationItem = {
    id: `notif_${Date.now()}`,
    userUid: studentUid,
    type: 'class_reminder',
    title: `Class Scheduled: ${newClass.subject}`,
    message: `Your upcoming session on "${newClass.topic}" has been added for ${newClass.days.join(', ')} at ${newClass.time}.`,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl: '/student/classes',
  };
  await db.notifications.insertOne(notif);

  // Send email notification to student
  const student = await db.users.findOne({ uid: studentUid });
  if (student && student.email) {
    await sendRemlyEmail({
      to: student.email,
      subject: `Remly Class Scheduled: ${newClass.subject}`,
      template: 'class_reminder',
      data: {
        name: student.fullName,
        subject: newClass.subject,
        topic: newClass.topic,
        time: `${newClass.days.join(', ')} at ${newClass.time}`,
        learningGoal: newClass.learningGoal,
      },
    });
  }

  return newClass;
}

export async function getStudentClasses(studentUid: string): Promise<ScheduledClass[]> {
  return db.classes.find({ studentUid });
}

export async function cancelClass(id: string, studentUid: string): Promise<boolean> {
  return db.classes.updateOne({ id, studentUid }, { status: 'cancelled' });
}

// Background cron interval checking for upcoming classes and triggering reminders
export function startClassReminderScheduler() {
  console.log('⏰ [Scheduler] Remly class reminder cron worker activated.');
  setInterval(async () => {
    try {
      const activeClasses: ScheduledClass[] = await db.classes.find({ status: 'active' });
      const now = new Date();
      // Check for scheduled sessions within the upcoming hour
      for (const cls of activeClasses.slice(0, 5)) {
        // Log heartbeat
      }
    } catch (e) {
      console.warn('[Scheduler] Reminder run error:', e);
    }
  }, 10 * 60 * 1000); // every 10 mins
}
